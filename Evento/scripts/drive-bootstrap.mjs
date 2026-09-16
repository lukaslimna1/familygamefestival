import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';
import competitionDefinitions from '../src/config/competitions.json' with { type: 'json' };

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, '..');
const localEnvFile = join(projectDirectory, '.env.local');

if (existsSync(localEnvFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(localEnvFile);
}

const clientId = process.env.GOOGLE_CLIENT_ID;
const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
const refreshToken = process.env.GOOGLE_REFRESH_TOKEN;

if (!clientId || !clientSecret || !refreshToken) {
  throw new Error('Configuração Google incompleta: Client ID, Client Secret e refresh token são obrigatórios.');
}

const auth = new google.auth.OAuth2(clientId, clientSecret, process.env.GOOGLE_REDIRECT_URI);
auth.setCredentials({ refresh_token: refreshToken });

const drive = google.drive({ version: 'v3', auth });
const parentFolder = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID?.trim();
if (!parentFolder) {
  throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID é obrigatório e deve apontar para Family Game Festival 2026.');
}
const eventFolderName = 'Family Game Festival 2026';
const eventFolderKey = 'event:family-games-festival-2026';
const championshipsFolderName = 'Campeonatos';
const championshipsFolderKey = 'area:championships';
const folderMimeType = 'application/vnd.google-apps.folder';

const championships = competitionDefinitions.map((competition) => [
  competition.id,
  competition.driveFolderName
]);

function escapeQueryValue(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

const eventFolderResponse = await drive.files.get({
  fileId: parentFolder,
  fields: 'id,name,mimeType,parents,trashed,appProperties'
});
const eventFolder = eventFolderResponse.data;
if (
  eventFolder.id !== parentFolder ||
  eventFolder.name !== eventFolderName ||
  eventFolder.mimeType !== folderMimeType ||
  eventFolder.trashed
) {
  throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID não aponta para a pasta Family Game Festival 2026.');
}

console.log(`Nome: ${eventFolder.name}`);
console.log(`ID: ${eventFolder.id}`);

async function requireFolder(name, parentId, key) {
  const result = await drive.files.list({
    q: [
      `'${escapeQueryValue(parentId)}' in parents`,
      `mimeType = '${folderMimeType}'`,
      `name = '${escapeQueryValue(name)}'`,
      `appProperties has { key = 'fgf-key' and value = '${escapeQueryValue(key)}' }`,
      'trashed = false'
    ].join(' and '),
    spaces: 'drive',
    pageSize: 10,
    fields: 'files(id,name,parents,appProperties)'
  });

  const matches = result.data.files ?? [];
  if (matches.length !== 1 || !matches[0]?.id) {
    throw new Error(`Esperada exatamente uma pasta existente para ${name}; encontradas ${matches.length}.`);
  }
  return matches[0];
}

const championshipsArea = await requireFolder(
  championshipsFolderName,
  eventFolder.id,
  championshipsFolderKey
);

for (const [id, name] of championships) {
  await requireFolder(name, championshipsArea.id, `championship:${id}`);
}

console.log(`Área de campeonatos pronta: ${championships.length} pastas verificadas.`);
console.log('Nenhuma pasta foi criada ou alterada.');
