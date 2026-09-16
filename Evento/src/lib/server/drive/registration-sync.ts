import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { and, eq } from 'drizzle-orm';
import type { drive_v3 } from 'googleapis';
import { getDatabase } from '../db/client';
import { competitions, consents, participants, registrationFiles, registrations } from '../db/schema';
import { createRegistrationSheetPdf } from '../pdf/registration-sheet';
import { getDriveClient } from './client';
import { ensureCompetitionRegistrationFolder } from './folders';

const registrationSheetFileType = 'registration_sheet';

function formatDrivePath(competitionTitle: string, participantFolderName: string, fileName: string) {
  return `Family Game Festival 2026/Campeonatos/${competitionTitle}/${participantFolderName}/${fileName}`;
}

function sanitizedDriveError() {
  return 'Não foi possível sincronizar a inscrição com o Google Drive.';
}

async function uploadRegistrationSheet(
  drive: drive_v3.Drive,
  fileName: string,
  folderId: string,
  pdfBytes: Uint8Array,
  existingDriveFileId?: string | null
) {
  const createMedia = () => ({
    mimeType: 'application/pdf',
    body: Readable.from(Buffer.from(pdfBytes))
  });

  if (existingDriveFileId) {
    try {
      const updated = await drive.files.update({
        fileId: existingDriveFileId,
        requestBody: { name: fileName, mimeType: 'application/pdf' },
        media: createMedia(),
        fields: 'id,name,mimeType,parents,size,webViewLink'
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
      mimeType: 'application/pdf',
      parents: [folderId],
      appProperties: { 'fgf-key': 'file:registration-sheet' }
    },
    media: createMedia(),
    fields: 'id,name,mimeType,parents,size,webViewLink'
  });
  if (!created.data.id) throw new Error('O Google Drive não retornou o ID do PDF.');
  return { file: created.data, created: true };
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
  const [record] = await database
    .select({
      registrationId: registrations.id,
      publicCode: registrations.publicCode,
      competitionId: registrations.competitionId,
      eventAccessIncluded: registrations.eventAccessIncluded,
      competitionTitle: competitions.title,
      competitionCategory: competitions.category,
      competitionEventDay: competitions.eventDay,
      competitionEventDate: competitions.eventDate,
      competitionStartTime: competitions.startTime,
      competitionFolderId: competitions.driveFolderId,
      participantName: participants.fullName,
      participantCpf: participants.cpf,
      participantPhone: participants.phone,
      participantEmail: participants.email,
      participantDateOfBirth: participants.dateOfBirth
    })
    .from(registrations)
    .innerJoin(participants, eq(registrations.participantId, participants.id))
    .innerJoin(competitions, eq(registrations.competitionId, competitions.id))
    .where(eq(registrations.id, registrationId))
    .limit(1);

  if (!record) throw new Error('Inscrição não encontrada para sincronização.');
  if (!record.publicCode) throw new Error('A inscrição não possui código público.');
  if (!record.competitionFolderId) throw new Error('A competição não possui pasta vinculada no Google Drive.');

  const consentRows = await database
    .select({
      type: consents.consentType,
      granted: consents.granted,
      policyVersion: consents.policyVersion,
      grantedAt: consents.grantedAt
    })
    .from(consents)
    .where(eq(consents.registrationId, registrationId));

  const pdfBytes = await createRegistrationSheetPdf({
    publicCode: record.publicCode,
    participant: {
      fullName: record.participantName,
      cpf: record.participantCpf,
      phone: record.participantPhone,
      email: record.participantEmail,
      dateOfBirth: record.participantDateOfBirth
    },
    competition: {
      title: record.competitionTitle,
      category: record.competitionCategory,
      eventDay: record.competitionEventDay,
      eventDate: record.competitionEventDate,
      startTime: record.competitionStartTime,
      eventAccessIncluded: record.eventAccessIncluded
    },
    consents: consentRows,
    generatedAt: new Date().toISOString()
  });
  const contentHash = createHash('sha256').update(pdfBytes).digest('hex');
  const fileName = `${record.publicCode}-ficha-inscricao.pdf`;

  await database
    .update(registrations)
    .set({ driveSyncStatus: 'drive_syncing', driveLastError: null })
    .where(eq(registrations.id, registrationId));

  try {
    const drive = options.drive ?? getDriveClient();
    const registrationFolder = await ensureCompetitionRegistrationFolder({
      competitionFolderId: record.competitionFolderId,
      registrationId,
      publicCode: record.publicCode,
      drive
    });

    const existingFiles = await database
      .select({ id: registrationFiles.id, driveFileId: registrationFiles.driveFileId })
      .from(registrationFiles)
      .where(and(
        eq(registrationFiles.registrationId, registrationId),
        eq(registrationFiles.fileType, registrationSheetFileType)
      ));
    if (existingFiles.length > 1) {
      throw new Error('Foram encontrados registros duplicados para a ficha de inscrição.');
    }

    const uploaded = await uploadRegistrationSheet(
      drive,
      fileName,
      registrationFolder.registrationFolderId,
      pdfBytes,
      existingFiles[0]?.driveFileId
    );
    const driveFileId = uploaded.file.id;
    if (!driveFileId) throw new Error('O Google Drive não retornou o ID do PDF sincronizado.');

    const drivePath = formatDrivePath(
      record.competitionTitle,
      registrationFolder.registrationFolderName,
      fileName
    );
    const now = new Date().toISOString();

    if (existingFiles[0]) {
      await database
        .update(registrationFiles)
        .set({
          originalName: fileName,
          mimeType: 'application/pdf',
          sizeBytes: pdfBytes.byteLength,
          contentHash,
          driveFileId,
          drivePath,
          syncStatus: 'synced',
          lastError: null,
          updatedAt: now
        })
        .where(eq(registrationFiles.id, existingFiles[0].id));
    } else {
      await database.insert(registrationFiles).values({
        id: crypto.randomUUID(),
        registrationId,
        fileType: registrationSheetFileType,
        originalName: fileName,
        mimeType: 'application/pdf',
        sizeBytes: pdfBytes.byteLength,
        contentHash,
        driveFileId,
        drivePath,
        syncStatus: 'synced',
        lastError: null
      });
    }

    await database
      .update(registrations)
      .set({
        driveSyncStatus: 'synced',
        driveLastError: null,
        driveFolderId: registrationFolder.registrationFolderId,
        updatedAt: now
      })
      .where(eq(registrations.id, registrationId));

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
    await database
      .update(registrations)
      .set({ driveSyncStatus: 'failed', driveLastError: sanitizedDriveError() })
      .where(eq(registrations.id, registrationId));
    throw new Error(sanitizedDriveError());
  }
}
