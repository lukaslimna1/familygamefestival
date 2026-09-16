import { getDriveConfig } from '../config/env';
import { getDriveClient } from './client';
import type { drive_v3 } from 'googleapis';

const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';
const EVENT_FOLDER_NAME = 'Family Game Festival 2026';

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function findFolder(drive: drive_v3.Drive, name: string, parentId: string, key: string) {
  const response = await drive.files.list({
    q: [
      `'${escapeDriveQueryValue(parentId)}' in parents`,
      `mimeType = '${DRIVE_FOLDER_MIME}'`,
      `name = '${escapeDriveQueryValue(name)}'`,
      `appProperties has { key = 'fgf-key' and value = '${escapeDriveQueryValue(key)}' }`,
      'trashed = false'
    ].join(' and '),
    spaces: 'drive',
    pageSize: 10,
    fields: 'files(id,name,parents,appProperties)'
  });
  const matches = response.data.files ?? [];
  if (matches.length > 1) {
    throw new Error(`Foram encontradas pastas duplicadas para a chave ${key}.`);
  }
  return matches[0] ?? null;
}

async function ensureFolder(name: string, parentId: string, key: string, drive = getDriveClient()) {
  const existing = await findFolder(drive, name, parentId, key);
  if (existing?.id) return { ...existing, created: false };

  const created = await drive.files.create({
    requestBody: {
      name,
      mimeType: DRIVE_FOLDER_MIME,
      parents: [parentId],
      appProperties: { 'fgf-key': key }
    },
    fields: 'id,name,parents,appProperties'
  });

  if (!created.data.id) throw new Error('O Google Drive não retornou o ID da pasta criada.');
  return { ...created.data, created: true };
}

export async function ensureEventDriveFolder() {
  const { rootFolderId } = getDriveConfig();
  const drive = getDriveClient();
  const response = await drive.files.get({
    fileId: rootFolderId,
    fields: 'id,name,mimeType,parents,trashed,appProperties'
  });
  const folder = response.data;
  if (
    folder.id !== rootFolderId ||
    folder.name !== EVENT_FOLDER_NAME ||
    folder.mimeType !== DRIVE_FOLDER_MIME ||
    folder.trashed
  ) {
    throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID não aponta para Family Game Festival 2026.');
  }
  return folder;
}

export async function ensureCompetitionRegistrationFolder({
  competitionFolderId,
  registrationId,
  publicCode,
  drive = getDriveClient()
}: {
  competitionFolderId: string;
  registrationId: string;
  publicCode: string;
  drive?: drive_v3.Drive;
}) {
  if (!/^[0-9a-f-]{20,}$/i.test(registrationId)) {
    throw new Error('registrationId inválido para a estrutura do Google Drive.');
  }
  if (!/^[A-Z0-9-]{6,80}$/i.test(publicCode)) {
    throw new Error('publicCode inválido para a estrutura do Google Drive.');
  }

  const registrationFolder = await ensureFolder(
    `${publicCode} - Participante`,
    competitionFolderId,
    `registration:${registrationId}`,
    drive
  );

  return {
    registrationFolderId: registrationFolder.id!,
    registrationFolderName: registrationFolder.name!,
    created: registrationFolder.created
  };
}

export type CompetitionRegistrationDriveFolder = Awaited<ReturnType<typeof ensureCompetitionRegistrationFolder>>;
