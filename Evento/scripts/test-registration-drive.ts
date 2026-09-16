import { execFile as execFileCallback } from 'node:child_process';
import { existsSync } from 'node:fs';
import { mkdir, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { and, eq } from 'drizzle-orm';
import { PDFDocument } from 'pdf-lib';
import type { drive_v3 } from 'googleapis';
import competitionDefinitions from '../src/config/competitions.json';
import { getDatabase } from '../src/lib/server/db/client';
import { competitions, consents, participants, registrationFiles, registrationLinks, registrations } from '../src/lib/server/db/schema';
import { createRegistrationDraft } from '../src/lib/server/db/repository';
import { getDriveClient } from '../src/lib/server/drive/client';
import { syncRegistrationToDrive } from '../src/lib/server/drive/registration-sync';
import { createRegistrationSheetPdf } from '../src/lib/server/pdf/registration-sheet';

const execFile = promisify(execFileCallback);
const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, '..');
const localEnvFile = join(projectDirectory, '.env.local');
const tempPdfDirectory = join(projectDirectory, 'tmp', 'pdfs');

if (existsSync(localEnvFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(localEnvFile);
}

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function createFailingDrive() {
  return {
    files: {
      list: async () => {
        throw new Error('Falha controlada do teste de retry.');
      }
    }
  } as unknown as drive_v3.Drive;
}

async function assertDriveFileDeleted(drive: drive_v3.Drive, fileId: string) {
  try {
    await drive.files.get({ fileId, fields: 'id' });
  } catch (error) {
    const status = (error as { response?: { status?: number } }).response?.status;
    if (status === 404) return;
    throw error;
  }
  throw new Error(`O arquivo de teste ${fileId} ainda existe no Google Drive.`);
}

async function listTestRegistrationFolders(drive: drive_v3.Drive, competitionFolderId: string, registrationId: string) {
  const response = await drive.files.list({
    q: [
      `'${escapeDriveQueryValue(competitionFolderId)}' in parents`,
      "mimeType = 'application/vnd.google-apps.folder'",
      `appProperties has { key = 'fgf-key' and value = '${escapeDriveQueryValue(`registration:${registrationId}`)}' }`,
      'trashed = false'
    ].join(' and '),
    spaces: 'drive',
    pageSize: 100,
    fields: 'files(id,name,parents,appProperties,mimeType,trashed)'
  });
  return response.data.files ?? [];
}

const runId = `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
const fakeCpf = `9${Date.now().toString().slice(-10)}`;
const fakeEmail = `integration-${runId}@example.invalid`;
const fakeName = 'TESTE INTEGRACAO TEKKEN 8 - REMOVER';
const competitionId = 'tekken-8';
const definition = competitionDefinitions.find((item) => item.id === competitionId);
assertCondition(definition, 'A definição canônica de Tekken 8 não foi encontrada.');

const database = getDatabase();
let registrationId: string | undefined;
let participantId: string | undefined;
let publicCode: string | undefined;
let competitionFolderId: string | undefined;
let registrationFolderId: string | undefined;
let driveFileId: string | undefined;
let fileName: string | undefined;
let temporaryPdfPath: string | undefined;
let temporaryRenderPath: string | undefined;
const cleanupErrors: string[] = [];

try {
  const created = await createRegistrationDraft({
    participant: {
      fullName: fakeName,
      cpf: fakeCpf,
      phone: '+5500000000000',
      email: fakeEmail,
      dateOfBirth: '2000-01-01',
      city: 'Bauru',
      state: 'SP'
    },
    competitionId,
    consents: [
      { type: 'competition_regulation', granted: true, policyVersion: 'integration-test-v1' },
      { type: 'image_use', granted: true, policyVersion: 'integration-test-v1' }
    ]
  });
  registrationId = created.registrationId;
  participantId = created.participantId;
  publicCode = created.publicCode;

  const [initialRegistration] = await database
    .select({
      publicCode: registrations.publicCode,
      driveSyncStatus: registrations.driveSyncStatus,
      eventAccessIncluded: registrations.eventAccessIncluded,
      participantId: registrations.participantId,
      competitionId: registrations.competitionId
    })
    .from(registrations)
    .where(eq(registrations.id, registrationId))
    .limit(1);
  assertCondition(initialRegistration, 'A inscrição fictícia não foi persistida.');
  assertCondition(initialRegistration.publicCode === publicCode, 'O código público da inscrição não é estável.');
  assertCondition(initialRegistration.driveSyncStatus === 'drive_pending', 'A inscrição não iniciou em drive_pending.');
  assertCondition(initialRegistration.eventAccessIncluded === true, 'Tekken 8 deveria incluir a entrada no dia do evento.');
  assertCondition(initialRegistration.participantId === participantId, 'O participante não foi relacionado à inscrição.');
  assertCondition(initialRegistration.competitionId === competitionId, 'A competição não foi relacionada à inscrição.');

  const [tekken] = await database
    .select({ id: competitions.id, driveFolderId: competitions.driveFolderId })
    .from(competitions)
    .where(eq(competitions.id, competitionId))
    .limit(1);
  assertCondition(tekken?.driveFolderId, 'Tekken 8 não possui pasta Drive sincronizada.');
  competitionFolderId = tekken.driveFolderId;

  await mkdir(tempPdfDirectory, { recursive: true });
  const previewPdf = await createRegistrationSheetPdf({
    publicCode,
    participant: {
      fullName: fakeName,
      cpf: fakeCpf,
      phone: '+5500000000000',
      email: fakeEmail,
      dateOfBirth: '2000-01-01'
    },
    competition: {
      title: definition.name,
      category: definition.category,
      eventDay: definition.eventDay,
      eventDate: definition.eventDate,
      startTime: definition.startTime,
      eventAccessIncluded: true
    },
    consents: [
      { type: 'competition_regulation', granted: true, policyVersion: 'integration-test-v1', grantedAt: new Date().toISOString() },
      { type: 'image_use', granted: true, policyVersion: 'integration-test-v1', grantedAt: new Date().toISOString() }
    ],
    generatedAt: new Date().toISOString()
  });
  temporaryPdfPath = join(tempPdfDirectory, `${publicCode}-test.pdf`);
  await writeFile(temporaryPdfPath, previewPdf);
  const loadedPdf = await PDFDocument.load(previewPdf);
  assertCondition(loadedPdf.getPageCount() === 1, 'O PDF de teste não pôde ser validado.');

  temporaryRenderPath = join(tempPdfDirectory, `${publicCode}-render`);
  let rendered = false;
  try {
    await execFile('pdftoppm', ['-f', '1', '-singlefile', '-png', temporaryPdfPath, temporaryRenderPath]);
    rendered = true;
  } catch {
    // A validação estrutural do PDF continua sendo suficiente quando o utilitário de renderização não está instalado.
  }

  let failureWasHandled = false;
  try {
    await syncRegistrationToDrive(registrationId, { drive: createFailingDrive() });
  } catch {
    failureWasHandled = true;
  }
  assertCondition(failureWasHandled, 'A falha controlada do Drive não foi propagada.');

  const [failedRegistration] = await database
    .select({ driveSyncStatus: registrations.driveSyncStatus, driveLastError: registrations.driveLastError, driveFolderId: registrations.driveFolderId })
    .from(registrations)
    .where(eq(registrations.id, registrationId))
    .limit(1);
  assertCondition(failedRegistration?.driveSyncStatus === 'failed', 'A inscrição não foi marcada como failed após a falha controlada.');
  assertCondition(Boolean(failedRegistration.driveLastError), 'A falha controlada não deixou uma mensagem sanitizada.');
  assertCondition(!failedRegistration.driveFolderId, 'A falha controlada não deveria ter criado pasta no Drive.');

  const firstSync = await syncRegistrationToDrive(registrationId);
  registrationFolderId = firstSync.registrationFolderId;
  driveFileId = firstSync.driveFileId;
  fileName = firstSync.fileName;
  assertCondition(firstSync.createdDriveFolder, 'A primeira sincronização deveria criar a pasta do participante.');
  assertCondition(firstSync.createdDriveFile, 'A primeira sincronização deveria criar o PDF no Drive.');

  const drive = getDriveClient();
  const folderMetadata = (await drive.files.get({
    fileId: registrationFolderId,
    fields: 'id,name,parents,appProperties,mimeType,trashed'
  })).data;
  const expectedFolderName = `${publicCode} - ${fakeName}`;
  const expectedSheetName = `Ficha-Inscricao - ${expectedFolderName}.pdf`;
  assertCondition(folderMetadata.parents?.includes(competitionFolderId), 'A pasta do participante não está dentro da pasta de Tekken 8.');
  assertCondition(folderMetadata.appProperties?.['fgf-key'] === `registration:${registrationId}`, 'A chave idempotente da pasta não confere.');
  assertCondition(folderMetadata.name === expectedFolderName, 'A pasta de competição não segue o padrão código + nome completo.');
  assertCondition(fileName === expectedSheetName, 'A ficha PDF não segue o padrão oficial de nomenclatura.');

  const sheetMetadata = (await drive.files.get({
    fileId: driveFileId,
    fields: 'id,name,parents,mimeType'
  })).data;
  assertCondition(sheetMetadata.name === expectedSheetName, 'O nome da ficha PDF no Drive não segue o padrão oficial.');
  assertCondition(sheetMetadata.parents?.includes(registrationFolderId), 'A ficha PDF não está diretamente na pasta da inscrição.');

  const downloaded = await drive.files.get({
    fileId: driveFileId,
    alt: 'media'
  }, { responseType: 'arraybuffer' });
  const downloadedPdf = Buffer.isBuffer(downloaded.data)
    ? downloaded.data
    : Buffer.from(downloaded.data as ArrayBuffer);
  assertCondition(downloadedPdf.subarray(0, 5).toString() === '%PDF-', 'O arquivo enviado ao Drive não é um PDF válido.');
  const downloadedDocument = await PDFDocument.load(downloadedPdf);
  assertCondition(downloadedDocument.getPageCount() === 1, 'O PDF recuperado do Drive não pôde ser aberto.');

  const secondSync = await syncRegistrationToDrive(registrationId);
  assertCondition(secondSync.registrationFolderId === registrationFolderId, 'A segunda sincronização criou outra pasta de participante.');
  assertCondition(secondSync.driveFileId === driveFileId, 'A segunda sincronização criou outro PDF.');
  assertCondition(!secondSync.createdDriveFolder, 'A segunda sincronização não foi idempotente para a pasta.');
  assertCondition(!secondSync.createdDriveFile, 'A segunda sincronização não foi idempotente para o PDF.');

  const persistedFiles = await database
    .select({ driveFileId: registrationFiles.driveFileId, syncStatus: registrationFiles.syncStatus })
    .from(registrationFiles)
    .where(and(
      eq(registrationFiles.registrationId, registrationId),
      eq(registrationFiles.fileType, 'registration_sheet')
    ));
  assertCondition(persistedFiles.length === 1, 'A idempotência criou registros duplicados em registration_files.');
  assertCondition(persistedFiles[0]?.driveFileId === driveFileId, 'O ID do PDF não foi persistido no Turso.');
  assertCondition(persistedFiles[0]?.syncStatus === 'synced', 'O arquivo não ficou com status synced.');

  const [syncedRegistration] = await database
    .select({ driveSyncStatus: registrations.driveSyncStatus, driveFolderId: registrations.driveFolderId })
    .from(registrations)
    .where(eq(registrations.id, registrationId))
    .limit(1);
  assertCondition(syncedRegistration?.driveSyncStatus === 'synced', 'A inscrição não ficou com status synced.');
  assertCondition(syncedRegistration.driveFolderId === registrationFolderId, 'O ID da pasta do participante não foi persistido no Turso.');

  const directFolders = await listTestRegistrationFolders(drive, competitionFolderId, registrationId);
  assertCondition(directFolders.length === 1, 'Foi encontrada mais de uma pasta do participante no Drive.');

  console.log(JSON.stringify({
    status: 'ok',
    competitionId,
    failureStateValidated: failedRegistration.driveSyncStatus === 'failed',
    retryStateValidated: syncedRegistration.driveSyncStatus === 'synced',
    idempotencyValidated: secondSync.registrationFolderId === registrationFolderId && secondSync.driveFileId === driveFileId && directFolders.length === 1,
    pdfValidated: downloadedDocument.getPageCount() === 1,
    localPdfRendered: rendered,
    registrationFolderId,
    driveFileId,
    persistedFileRows: persistedFiles.length
  }, null, 2));
} finally {
  if (temporaryPdfPath) {
    await rm(temporaryPdfPath, { force: true }).catch(() => cleanupErrors.push('PDF temporário local não pôde ser removido.'));
  }
  if (temporaryRenderPath) {
    await rm(`${temporaryRenderPath}.png`, { force: true }).catch(() => cleanupErrors.push('Render temporário local não pôde ser removido.'));
  }

  if (registrationId && competitionFolderId) {
    try {
      const drive = getDriveClient();
      const folders = await listTestRegistrationFolders(drive, competitionFolderId, registrationId);
      for (const folder of folders) {
        if (!folder.id || folder.parents?.includes(competitionFolderId) !== true || folder.appProperties?.['fgf-key'] !== `registration:${registrationId}`) {
          throw new Error('Alvo de limpeza do Drive não passou pela validação de parent/chave.');
        }
        const childFiles = await drive.files.list({
          q: `'${escapeDriveQueryValue(folder.id)}' in parents and trashed = false`,
          spaces: 'drive',
          pageSize: 100,
          fields: 'files(id,name,parents,appProperties)'
        });
        for (const child of childFiles.data.files ?? []) {
          if (
            child.id &&
            child.name === fileName &&
            child.parents?.includes(folder.id) === true &&
            child.appProperties?.['fgf-key'] === 'file:registration-sheet'
          ) {
            await drive.files.delete({ fileId: child.id });
            await assertDriveFileDeleted(drive, child.id);
          }
        }
        await drive.files.delete({ fileId: folder.id });
        await assertDriveFileDeleted(drive, folder.id);
      }
    } catch {
      cleanupErrors.push('Pasta ou PDF fictício não pôde ser removido do Google Drive.');
    }
  }

  if (registrationId) {
    try {
      await database.delete(registrationFiles).where(eq(registrationFiles.registrationId, registrationId));
      await database.delete(consents).where(eq(consents.registrationId, registrationId));
      await database.delete(registrationLinks).where(eq(registrationLinks.registrationId, registrationId));
      await database.delete(registrations).where(eq(registrations.id, registrationId));
    } catch {
      cleanupErrors.push('Inscrição ou consentimentos fictícios não puderam ser removidos do Turso.');
    }
  }
  if (participantId) {
    try {
      await database.delete(participants).where(eq(participants.id, participantId));
    } catch {
      cleanupErrors.push('Participante fictício não pôde ser removido do Turso.');
    }
  }

  if (cleanupErrors.length > 0) {
    throw new Error(cleanupErrors.join(' '));
  }
}
