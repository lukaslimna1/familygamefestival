import { getDriveConfig } from '../config/env';
import { getDriveClient } from './client';
import type { drive_v3 } from 'googleapis';

const DRIVE_FOLDER_MIME = 'application/vnd.google-apps.folder';
const EVENT_FOLDER_NAME = 'Family Game Festival 2026';

function escapeDriveQueryValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function findFolder(drive: drive_v3.Drive, parentId: string, key: string) {
  const response = await drive.files.list({
    q: [
      `'${escapeDriveQueryValue(parentId)}' in parents`,
      `mimeType = '${DRIVE_FOLDER_MIME}'`,
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
  const existing = await findFolder(drive, parentId, key);
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

export function sanitizeDriveName(value: string, fallback = 'Não informado') {
  const sanitized = value
    .replace(/[\\/:*?"<>|\u0000-\u001f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^\.+|\.+$/g, '');
  return (sanitized || fallback).slice(0, 120);
}

export function getRegistrationFolderName({
  publicCode,
  participantName,
  characterName,
  includeCosplayDetails
}: {
  publicCode: string;
  participantName?: string;
  characterName?: string | null;
  includeCosplayDetails?: boolean;
}) {
  const parts = [publicCode, participantName || 'Participante'];
  if (includeCosplayDetails) parts.push(characterName || 'Personagem não informado');
  return parts.map((part) => sanitizeDriveName(part)).join(' - ');
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
  participantName,
  characterName,
  includeCosplayDetails,
  drive = getDriveClient()
}: {
  competitionFolderId: string;
  registrationId: string;
  publicCode: string;
  participantName?: string;
  characterName?: string | null;
  includeCosplayDetails?: boolean;
  drive?: drive_v3.Drive;
}) {
  if (!/^[0-9a-f-]{20,}$/i.test(registrationId)) {
    throw new Error('registrationId inválido para a estrutura do Google Drive.');
  }
  if (!/^[A-Z0-9-]{6,80}$/i.test(publicCode)) {
    throw new Error('publicCode inválido para a estrutura do Google Drive.');
  }

  const registrationFolderName = getRegistrationFolderName({
    publicCode,
    participantName,
    characterName,
    includeCosplayDetails
  });
  const registrationFolder = await ensureFolder(
    registrationFolderName,
    competitionFolderId,
    `registration:${registrationId}`,
    drive
  );

  if (!registrationFolder.created && registrationFolder.id && registrationFolder.name !== registrationFolderName) {
    const renamed = await drive.files.update({
      fileId: registrationFolder.id,
      requestBody: { name: registrationFolderName },
      fields: 'id,name,parents,appProperties'
    });
    registrationFolder.name = renamed.data.name ?? registrationFolderName;
  }

  return {
    registrationFolderId: registrationFolder.id!,
    registrationFolderName: registrationFolder.name!,
    created: registrationFolder.created
  };
}

export type CompetitionRegistrationDriveFolder = Awaited<ReturnType<typeof ensureCompetitionRegistrationFolder>>;
