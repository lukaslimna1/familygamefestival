import { createHash, randomUUID } from 'node:crypto';
import { Readable } from 'node:stream';
import { eq } from 'drizzle-orm';
import type { drive_v3 } from 'googleapis';
import competitionDefinitions from '../../../config/competitions.json';
import { getDatabase } from '../db/client';
import { minorAuthorizations, registrationFiles, registrations } from '../db/schema';
import { getRegistrationDetails } from '../db/repository';
import {
  createGuardianAuthorizationPdf,
  createRegistrationSheetPdf
} from '../pdf/registration-sheet';
import {
  ensureCompetitionRegistrationFolder,
  getRegistrationFolderName
} from './folders';
import { getDriveClient } from './client';

const registrationSheetFileType = 'registration_sheet';
const guardianAuthorizationFileType = 'guardian_authorization';
const guardianSignedFileType = 'guardian_authorization_signed';

function formatDrivePath(competitionTitle: string, participantFolderName: string, fileName: string) {
  return `Family Game Festival 2026/Campeonatos/${competitionTitle}/${participantFolderName}/${fileName}`;
}

type RegistrationFileForNaming = {
  id: string;
  fileType: string;
  originalName: string;
  createdAt?: string | Date | null;
  updatedAt?: string | Date | null;
};

function getParticipantDriveName(publicCode: string, participantName: string) {
  return getRegistrationFolderName({ publicCode, participantName });
}

function getRegistrationDriveName(
  publicCode: string,
  participantName: string,
  characterName: string | null | undefined,
  isCosplay: boolean
) {
  return getRegistrationFolderName({
    publicCode,
    participantName,
    characterName,
    includeCosplayDetails: isCosplay
  });
}

function getFileExtension(originalName: string, fallback: string) {
  const lastDot = originalName.lastIndexOf('.');
  if (lastDot <= 0 || lastDot === originalName.length - 1) return fallback;
  const extension = originalName.slice(lastDot + 1).replace(/[^a-zA-Z0-9]/g, '');
  return extension || fallback;
}

function getReferenceOrdinal(files: RegistrationFileForNaming[], fileId: string) {
  const references = files
    .filter((file) => file.fileType === 'cosplay_reference')
    .sort((left, right) => {
      const leftDate = String(left.createdAt ?? left.updatedAt ?? '');
      const rightDate = String(right.createdAt ?? right.updatedAt ?? '');
      return leftDate.localeCompare(rightDate) || left.id.localeCompare(right.id);
    });
  const index = references.findIndex((file) => file.id === fileId);
  return index >= 0 ? index + 1 : references.length + 1;
}

function getUploadFileName({
  fileType,
  originalName,
  publicCode,
  participantName,
  characterName,
  files,
  fileId
}: {
  fileType: RegistrationUploadFileType;
  originalName: string;
  publicCode: string;
  participantName: string;
  characterName?: string | null;
  files: RegistrationFileForNaming[];
  fileId: string;
}) {
  const participantNamePart = getParticipantDriveName(publicCode, participantName);
  if (fileType === guardianSignedFileType) {
    return `Autorizacao-Menor-Assinada - ${participantNamePart}.${getFileExtension(originalName, 'pdf')}`;
  }

  const registrationName = getRegistrationDriveName(publicCode, participantName, characterName, true);
  if (fileType === 'cosplay_audio') {
    return `Audio - ${registrationName}.${getFileExtension(originalName, 'mp3')}`;
  }

  const ordinal = String(getReferenceOrdinal(files, fileId)).padStart(2, '0');
  return `Referencia-${ordinal} - ${registrationName}.${getFileExtension(originalName, 'bin')}`;
}

function isUploadedFileType(value: string): value is RegistrationUploadFileType {
  return value === 'cosplay_reference' || value === 'cosplay_audio' || value === guardianSignedFileType;
}

async function normalizeUploadedDriveFiles({
  drive,
  database,
  record,
  registrationFolderId,
  registrationFolderName
}: {
  drive: drive_v3.Drive;
  database: ReturnType<typeof getDatabase>;
  record: Awaited<ReturnType<typeof getRegistrationDetails>>;
  registrationFolderId: string;
  registrationFolderName: string;
}) {
  if (!record?.publicCode) return;
  for (const file of record.files) {
    if (!file.driveFileId || !isUploadedFileType(file.fileType)) continue;
    const expectedName = getUploadFileName({
      fileType: file.fileType,
      originalName: file.originalName,
      publicCode: record.publicCode,
      participantName: record.fullName,
      characterName: record.cosplay?.characterName,
      files: record.files,
      fileId: file.id
    });

    try {
      const metadata = (await drive.files.get({
        fileId: file.driveFileId,
        fields: 'id,name,parents'
      })).data;
      const currentParents = metadata.parents ?? [];
      const removeParents = currentParents.filter((parent) => parent !== registrationFolderId).join(',');
      if (metadata.name !== expectedName || removeParents || !currentParents.includes(registrationFolderId)) {
        await drive.files.update({
          fileId: file.driveFileId,
          addParents: currentParents.includes(registrationFolderId) ? undefined : registrationFolderId,
          removeParents: removeParents || undefined,
          requestBody: { name: expectedName },
          fields: 'id,name,parents'
        });
      }
      const drivePath = formatDrivePath(record.competitionTitle, registrationFolderName, expectedName);
      if (file.drivePath !== drivePath) {
        await database.update(registrationFiles).set({ drivePath, updatedAt: new Date().toISOString() }).where(eq(registrationFiles.id, file.id));
      }
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status !== 404) throw error;
    }
  }
}

async function removeEmptyLegacyReferenceFolders(drive: drive_v3.Drive, registrationFolderId: string, registrationId: string) {
  const response = await drive.files.list({
    q: [
      `'${escapeDriveQueryValue(registrationFolderId)}' in parents`,
      "mimeType = 'application/vnd.google-apps.folder'",
      `appProperties has { key = 'fgf-key' and value = '${escapeDriveQueryValue(`registration:${registrationId}:references`)}' }`,
      'trashed = false'
    ].join(' and '),
    spaces: 'drive',
    pageSize: 10,
    fields: 'files(id,parents)'
  });
  for (const folder of response.data.files ?? []) {
    if (!folder.id || !folder.parents?.includes(registrationFolderId)) continue;
    const children = await drive.files.list({
      q: `'${escapeDriveQueryValue(folder.id)}' in parents and trashed = false`,
      spaces: 'drive',
      pageSize: 10,
      fields: 'files(id)'
    });
    if (!(children.data.files ?? []).length) await drive.files.delete({ fileId: folder.id });
  }
}

function sanitizedDriveError() {
  return 'Não foi possível sincronizar a inscrição com o Google Drive.';
}

function asBuffer(bytes: Uint8Array) {
  return Buffer.from(bytes);
}

function createMedia(bytes: Uint8Array, mimeType: string) {
  return {
    mimeType,
    body: Readable.from(asBuffer(bytes))
  };
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function findDriveFileByKey(drive: drive_v3.Drive, folderId: string, appKey: string) {
  const response = await drive.files.list({
    q: [
      `'${escapeDriveQueryValue(folderId)}' in parents`,
      `appProperties has { key = 'fgf-key' and value = '${escapeDriveQueryValue(appKey)}' }`,
      'trashed = false'
    ].join(' and '),
    spaces: 'drive',
    pageSize: 10,
    fields: 'files(id,name,mimeType,parents,appProperties)'
  });
  const matches = response.data.files ?? [];
  if (matches.length > 1) throw new Error(`Foram encontrados arquivos duplicados para a chave ${appKey}.`);
  return matches[0] ?? null;
}

async function uploadDriveBinary(
  drive: drive_v3.Drive,
  {
    fileName,
    folderId,
    mimeType,
    bytes,
    appKey,
    existingDriveFileId
  }: {
    fileName: string;
    folderId: string;
    mimeType: string;
    bytes: Uint8Array;
    appKey: string;
    existingDriveFileId?: string | null;
  }
) {
  let targetDriveFileId = existingDriveFileId;
  if (!targetDriveFileId) {
    const existing = await findDriveFileByKey(drive, folderId, appKey);
    targetDriveFileId = existing?.id;
  }

  if (targetDriveFileId) {
    try {
      const updated = await drive.files.update({
        fileId: targetDriveFileId,
        requestBody: { name: fileName, mimeType },
        media: createMedia(bytes, mimeType),
        fields: 'id,name,mimeType,parents,size,webViewLink,appProperties'
      });
      if (updated.data.id) return { file: updated.data, created: false };
    } catch (error) {
      const status = (error as { response?: { status?: number } }).response?.status;
      if (status !== 404) throw error;
    }
  }

  const created = await drive.files.create({
    requestBody: {
      name: fileName,
      mimeType,
      parents: [folderId],
      appProperties: { 'fgf-key': appKey }
    },
    media: createMedia(bytes, mimeType),
    fields: 'id,name,mimeType,parents,size,webViewLink,appProperties'
  });
  if (!created.data.id) throw new Error('O Google Drive não retornou o ID do arquivo.');
  return { file: created.data, created: true };
}

async function upsertFileRecord({
  database,
  existing,
  registrationId,
  fileType,
  fileName,
  mimeType,
  sizeBytes,
  contentHash,
  driveFileId,
  drivePath,
  syncStatus,
  authorizationVersion
}: {
  database: ReturnType<typeof getDatabase>;
  existing?: { id: string };
  registrationId: string;
  fileType: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  contentHash?: string | null;
  driveFileId?: string | null;
  drivePath: string;
  syncStatus: string;
  authorizationVersion?: number | null;
}) {
  const now = new Date().toISOString();
  if (existing) {
    await database.update(registrationFiles).set({
      originalName: fileName,
      mimeType,
      sizeBytes,
      contentHash: contentHash ?? null,
      driveFileId: driveFileId ?? null,
      drivePath,
      syncStatus,
      lastError: null,
      ...(authorizationVersion === undefined ? {} : { authorizationVersion }),
      updatedAt: now
    }).where(eq(registrationFiles.id, existing.id));
    return existing.id;
  }

  const id = randomUUID();
  await database.insert(registrationFiles).values({
    id,
    registrationId,
    fileType,
    originalName: fileName,
    mimeType,
    sizeBytes,
    contentHash: contentHash ?? null,
    driveFileId: driveFileId ?? null,
    drivePath,
    authorizationVersion: authorizationVersion ?? null,
    syncStatus,
    lastError: null
  });
  return id;
}

export type RegistrationDriveSyncResult = {
  registrationId: string;
  publicCode: string;
  competitionId: string;
  competitionFolderId: string;
  registrationFolderId: string;
  driveFileId: string;
  fileName: string;
  contentHash: string;
  bytes: number;
  createdDriveFolder: boolean;
  createdDriveFile: boolean;
};

export async function syncRegistrationToDrive(
  registrationId: string,
  options: { drive?: drive_v3.Drive } = {}
): Promise<RegistrationDriveSyncResult> {
  const database = getDatabase();
  const record = await getRegistrationDetails(registrationId);
  if (!record) throw new Error('Inscrição não encontrada para sincronização.');
  if (!record.publicCode) throw new Error('A inscrição não possui código público.');
  if (!record.competitionFolderId) throw new Error('A competição não possui pasta vinculada no Google Drive.');

  const pdfBytes = await createRegistrationSheetPdf({
    publicCode: record.publicCode,
    participant: {
      fullName: record.fullName,
      cpf: record.cpf,
      phone: record.phone,
      email: record.email,
      dateOfBirth: record.dateOfBirth,
      city: record.city,
      state: record.state,
      instagram: record.instagram,
      tiktok: record.tiktok,
      facebook: record.facebook,
      otherSocials: record.otherSocials
    },
    competition: {
      title: record.competitionTitle,
      category: record.competitionCategory,
      eventDay: record.competitionEventDay,
      eventDate: record.competitionEventDate,
      startTime: record.competitionStartTime,
      eventAccessIncluded: record.eventAccessIncluded
    },
    guardian: record.guardian,
    cosplay: record.cosplay,
    links: record.links,
    files: record.files.filter((file) => file.fileType !== registrationSheetFileType).map((file) => ({
      fileType: file.fileType,
      originalName: file.originalName,
      mimeType: file.mimeType,
      sizeBytes: file.sizeBytes
    })),
    consents: record.consents,
    generatedAt: new Date().toISOString(),
    updatedAt: record.registrationUpdatedAt
  });
  const contentHash = createHash('sha256').update(pdfBytes).digest('hex');
  const fileName = `Ficha-Inscricao - ${getRegistrationDriveName(
    record.publicCode,
    record.fullName,
    record.cosplay?.characterName,
    Boolean(record.cosplay)
  )}.pdf`;

  await database.update(registrations).set({
    driveSyncStatus: 'drive_syncing',
    driveLastError: null
  }).where(eq(registrations.id, registrationId));

  try {
    const drive = options.drive ?? getDriveClient();
    const registrationFolder = await ensureCompetitionRegistrationFolder({
      competitionFolderId: record.competitionFolderId,
      registrationId,
      publicCode: record.publicCode,
      participantName: record.fullName,
      characterName: record.cosplay?.characterName,
      includeCosplayDetails: Boolean(record.cosplay),
      drive
    });
    await normalizeUploadedDriveFiles({
      drive,
      database,
      record,
      registrationFolderId: registrationFolder.registrationFolderId,
      registrationFolderName: registrationFolder.registrationFolderName
    });
    await removeEmptyLegacyReferenceFolders(drive, registrationFolder.registrationFolderId, registrationId);
    const existingSheet = record.files.find((file) => file.fileType === registrationSheetFileType);
    const uploaded = await uploadDriveBinary(drive, {
      fileName,
      folderId: registrationFolder.registrationFolderId,
      mimeType: 'application/pdf',
      bytes: pdfBytes,
      appKey: 'file:registration-sheet',
      existingDriveFileId: existingSheet?.driveFileId
    });
    const driveFileId = uploaded.file.id;
    if (!driveFileId) throw new Error('O Google Drive não retornou o ID do PDF sincronizado.');

    await upsertFileRecord({
      database,
      existing: existingSheet ? { id: existingSheet.id } : undefined,
      registrationId,
      fileType: registrationSheetFileType,
      fileName,
      mimeType: 'application/pdf',
      sizeBytes: pdfBytes.byteLength,
      contentHash,
      driveFileId,
      drivePath: formatDrivePath(record.competitionTitle, registrationFolder.registrationFolderName, fileName),
      syncStatus: 'synced'
    });

    if (record.guardian && record.minorAuthorization) {
      const authorizationBytes = await createGuardianAuthorizationPdf({
        mode: 'filled',
        publicCode: record.publicCode,
        version: record.minorAuthorization.version,
        participant: {
          fullName: record.fullName,
          cpf: record.cpf,
          dateOfBirth: record.dateOfBirth
        },
        guardian: record.guardian,
        competitions: competitionDefinitions.map((competition) => ({
          id: competition.id,
          title: competition.name,
          category: competition.category,
          eventDay: competition.eventDay,
          eventDate: competition.eventDate,
          displayDate: competition.displayDate,
          startTime: competition.startTime
        })),
        selectedCompetitionIds: record.minorAuthorization.competitionIds,
        location: 'Arena Tauste - SORRI Bauru',
        eventDates: '19 e 20 de setembro de 2026',
        generatedAt: new Date().toISOString()
      });
      const authorizationFile = record.files.find((file) => file.fileType === guardianAuthorizationFileType);
      const authorizationUpload = await uploadDriveBinary(drive, {
        fileName: `Autorizacao-Menor - ${getParticipantDriveName(record.publicCode, record.fullName)}.pdf`,
        folderId: registrationFolder.registrationFolderId,
        mimeType: 'application/pdf',
        bytes: authorizationBytes,
        appKey: `file:${guardianAuthorizationFileType}`,
        existingDriveFileId: authorizationFile?.driveFileId
      });
      if (!authorizationUpload.file.id) throw new Error('O Google Drive não retornou a autorização do responsável.');
      await upsertFileRecord({
        database,
        existing: authorizationFile ? { id: authorizationFile.id } : undefined,
        registrationId,
        fileType: guardianAuthorizationFileType,
        fileName: `Autorizacao-Menor - ${getParticipantDriveName(record.publicCode, record.fullName)}.pdf`,
        mimeType: 'application/pdf',
        sizeBytes: authorizationBytes.byteLength,
        contentHash: createHash('sha256').update(authorizationBytes).digest('hex'),
        driveFileId: authorizationUpload.file.id,
        drivePath: formatDrivePath(
          record.competitionTitle,
          registrationFolder.registrationFolderName,
          `Autorizacao-Menor - ${getParticipantDriveName(record.publicCode, record.fullName)}.pdf`
        ),
        syncStatus: 'synced',
        authorizationVersion: record.minorAuthorization.version
      });
      await database.update(minorAuthorizations).set({
        driveFileId: authorizationUpload.file.id,
        updatedAt: new Date().toISOString()
      }).where(eq(minorAuthorizations.id, record.minorAuthorization.id));
    }

    const now = new Date().toISOString();
    await database.update(registrations).set({
      driveSyncStatus: 'synced',
      driveLastError: null,
      driveFolderId: registrationFolder.registrationFolderId,
      updatedAt: now
    }).where(eq(registrations.id, registrationId));

    return {
      registrationId,
      publicCode: record.publicCode,
      competitionId: record.competitionId,
      competitionFolderId: record.competitionFolderId,
      registrationFolderId: registrationFolder.registrationFolderId,
      driveFileId,
      fileName,
      contentHash,
      bytes: pdfBytes.byteLength,
      createdDriveFolder: registrationFolder.created,
      createdDriveFile: uploaded.created
    };
  } catch (error) {
    await database.update(registrations).set({
      driveSyncStatus: 'failed',
      driveLastError: sanitizedDriveError()
    }).where(eq(registrations.id, registrationId));
    throw new Error(sanitizedDriveError());
  }
}

export type RegistrationUploadFileType = 'cosplay_reference' | 'cosplay_audio' | typeof guardianSignedFileType;

export async function uploadRegistrationFile({
  registrationId,
  fileType,
  originalName,
  mimeType,
  bytes,
  drive: suppliedDrive
}: {
  registrationId: string;
  fileType: RegistrationUploadFileType;
  originalName: string;
  mimeType: string;
  bytes: Uint8Array;
  drive?: drive_v3.Drive;
}) {
  const database = getDatabase();
  const record = await getRegistrationDetails(registrationId);
  if (!record || !record.publicCode || !record.competitionFolderId) {
    throw new Error('Inscrição não encontrada para envio de arquivo.');
  }
  if (fileType !== guardianSignedFileType && record.competitionId !== 'cosplay') {
    throw new Error('Arquivos específicos de Cosplay não pertencem a esta competição.');
  }
  if (fileType === guardianSignedFileType && !record.minorAuthorization) {
    throw new Error('Esta inscrição não possui autorização de menor.');
  }

  const contentHash = createHash('sha256').update(bytes).digest('hex');
  const existing = fileType === 'cosplay_reference'
    ? record.files.find((file) => file.fileType === fileType && file.contentHash === contentHash)
    : record.files.find((file) => file.fileType === fileType);
  if (fileType === 'cosplay_reference' && existing?.driveFileId && existing.syncStatus === 'synced') {
    return { fileId: existing.id, replaced: false, duplicate: true };
  }

  const now = new Date().toISOString();
  const fileId = existing?.id ?? randomUUID();

  if (!existing) {
    await database.insert(registrationFiles).values({
      id: fileId,
      registrationId,
      fileType,
      originalName,
      mimeType,
      sizeBytes: bytes.byteLength,
      contentHash,
      syncStatus: 'drive_pending'
    });
  } else {
    await database.update(registrationFiles).set({
      originalName,
      mimeType,
      sizeBytes: bytes.byteLength,
      contentHash,
      syncStatus: 'drive_pending',
      lastError: null,
      updatedAt: now
    }).where(eq(registrationFiles.id, existing.id));
  }

  let fileName = '';
  try {
    const latest = await getRegistrationDetails(registrationId);
    if (!latest || !latest.publicCode || !latest.competitionFolderId) {
      throw new Error('Inscrição não encontrada para envio de arquivo.');
    }
    fileName = getUploadFileName({
      fileType,
      originalName,
      publicCode: latest.publicCode,
      participantName: latest.fullName,
      characterName: latest.cosplay?.characterName,
      files: latest.files,
      fileId
    });

    const drive = suppliedDrive ?? getDriveClient();
    const registrationFolder = await ensureCompetitionRegistrationFolder({
      competitionFolderId: latest.competitionFolderId,
      registrationId,
      publicCode: latest.publicCode,
      participantName: latest.fullName,
      characterName: latest.cosplay?.characterName,
      includeCosplayDetails: Boolean(latest.cosplay),
      drive
    });
    const uploaded = await uploadDriveBinary(drive, {
      fileName,
      folderId: registrationFolder.registrationFolderId,
      mimeType,
      bytes,
      appKey: `file:${fileType}:${fileId}`,
      existingDriveFileId: existing?.driveFileId
    });
    if (!uploaded.file.id) throw new Error('O Google Drive não retornou o ID do arquivo enviado.');

    await database.update(registrationFiles).set({
      driveFileId: uploaded.file.id,
      drivePath: formatDrivePath(latest.competitionTitle, registrationFolder.registrationFolderName, fileName),
      syncStatus: 'synced',
      lastError: null,
      ...(fileType === guardianSignedFileType && record.minorAuthorization ? { authorizationVersion: record.minorAuthorization.version } : {}),
      updatedAt: new Date().toISOString()
    }).where(eq(registrationFiles.id, fileId));

    if (fileType === guardianSignedFileType && record.minorAuthorization) {
      await database.update(minorAuthorizations).set({
        status: 'uploaded',
        signedDriveFileId: uploaded.file.id,
        deliveryType: 'upload',
        uploadedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }).where(eq(minorAuthorizations.id, record.minorAuthorization.id));
    }
    await database.update(registrations).set({ updatedAt: new Date().toISOString() }).where(eq(registrations.id, registrationId));

    // A ficha PDF deve refletir os arquivos e os metadados mais recentes.
    await syncRegistrationToDrive(registrationId, { drive });
    return { fileId, driveFileId: uploaded.file.id, replaced: Boolean(existing), duplicate: false };
  } catch (error) {
    await database.update(registrationFiles).set({
      syncStatus: 'failed',
      lastError: sanitizedDriveError(),
      updatedAt: new Date().toISOString()
    }).where(eq(registrationFiles.id, fileId));
    throw new Error(sanitizedDriveError());
  }
}

export async function deleteRegistrationFile({
  registrationId,
  fileId,
  drive: suppliedDrive
}: {
  registrationId: string;
  fileId: string;
  drive?: drive_v3.Drive;
}) {
  const database = getDatabase();
  const record = await getRegistrationDetails(registrationId);
  const file = record?.files.find((candidate) => candidate.id === fileId);
  if (!record || !file) throw new Error('Arquivo não encontrado para esta inscrição.');
  if (file.fileType === registrationSheetFileType || file.fileType === guardianAuthorizationFileType) {
    throw new Error('Este documento é gerado pelo sistema e não pode ser removido.');
  }

  try {
    if (file.driveFileId) {
      try {
        await (suppliedDrive ?? getDriveClient()).files.delete({ fileId: file.driveFileId });
      } catch (error) {
        const status = (error as { response?: { status?: number } }).response?.status;
        if (status !== 404) throw error;
      }
    }
    await database.delete(registrationFiles).where(eq(registrationFiles.id, fileId));
    if (file.fileType === guardianSignedFileType && record.minorAuthorization) {
      const generated = record.files.find((candidate) => candidate.fileType === guardianAuthorizationFileType);
      await database.update(minorAuthorizations).set({
        status: 'physical_pending',
        signedDriveFileId: null,
        driveFileId: generated?.driveFileId ?? null,
        deliveryType: 'physical',
        updatedAt: new Date().toISOString()
      }).where(eq(minorAuthorizations.id, record.minorAuthorization.id));
    }
    await database.update(registrations).set({ updatedAt: new Date().toISOString() }).where(eq(registrations.id, registrationId));
    try {
      await syncRegistrationToDrive(registrationId, { drive: suppliedDrive });
    } catch {
      // A remoção já foi persistida; a ficha poderá ser regenerada em um retry administrativo.
    }
    return { deleted: true };
  } catch {
    throw new Error(sanitizedDriveError());
  }
}
