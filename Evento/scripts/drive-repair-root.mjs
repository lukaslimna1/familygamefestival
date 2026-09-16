import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { google } from 'googleapis';

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
const eventFolderId = '1vSODWIDTSc8fFKIoxeZFvjuVGfIyVv56';
const folderMimeType = 'application/vnd.google-apps.folder';
const eventFolderKey = 'event:family-games-festival-2026';
const championshipsFolderKey = 'area:championships';
const oldEventFolderName = 'Family Games Festival 2026';
const eventFolderName = 'Family Game Festival 2026';

const championships = [
  ['cosplay', 'Concurso Cosplay'],
  ['just-dance-2026', 'Just Dance 2026'],
  ['efootball', 'eFootball'],
  ['street-fighter-zero-2', 'Street Fighter Zero 2'],
  ['sonic-2', 'Sonic 2'],
  ['top-gear-1', 'Top Gear 1'],
  ['budokai-tenkaichi-3', 'Budokai Tenkaichi 3'],
  ['super-bomberman-4', 'Super Bomberman 4'],
  ['mortal-kombat-1', 'Mortal Kombat 1'],
  ['naruto-storm-4', 'Naruto Storm 4'],
  ['guitar-hero-3', 'Guitar Hero 3'],
  ['tekken-8', 'Tekken 8'],
  ['fc-2026', 'FC 2026'],
  ['top-gear-2', 'Top Gear 2'],
  ['street-fighter-6', 'Street Fighter 6'],
  ['kof-2002', 'The King of Fighters 2002']
];

function escapeQueryValue(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function listChildFolders(parentId) {
  const response = await drive.files.list({
    q: [
      `'${escapeQueryValue(parentId)}' in parents`,
      `mimeType = '${folderMimeType}'`,
      'trashed = false'
    ].join(' and '),
    spaces: 'drive',
    pageSize: 100,
    fields: 'files(id,name,parents,appProperties,mimeType,trashed)'
  });
  return response.data.files ?? [];
}

const rootBefore = await drive.files.get({
  fileId: eventFolderId,
  fields: 'id,name,parents,mimeType,trashed,appProperties'
});

if (
  rootBefore.data.id !== eventFolderId ||
  rootBefore.data.mimeType !== folderMimeType ||
  rootBefore.data.trashed
) {
  throw new Error('A pasta raiz encontrada não corresponde à pasta de evento esperada.');
}

if (rootBefore.data.name !== oldEventFolderName && rootBefore.data.name !== eventFolderName) {
  throw new Error('A pasta raiz tem um nome inesperado; nenhuma alteração foi feita.');
}

const rootChildrenBefore = await listChildFolders(eventFolderId);
const championshipsAreas = rootChildrenBefore.filter(
  (folder) => folder.name === 'Campeonatos' && folder.appProperties?.['fgf-key'] === championshipsFolderKey
);

if (championshipsAreas.length !== 1) {
  throw new Error('A estrutura existente não contém exatamente uma pasta Campeonatos; nenhuma renomeação foi feita.');
}

const championshipFolders = await listChildFolders(championshipsAreas[0].id);
const expectedKeys = new Set(championships.map(([id]) => `championship:${id}`));
const matchingFolders = championshipFolders.filter((folder) => expectedKeys.has(folder.appProperties?.['fgf-key']));

if (matchingFolders.length !== championships.length) {
  throw new Error('A estrutura existente não contém as 16 pastas de campeonatos esperadas; nenhuma renomeação foi feita.');
}

for (const [id, name] of championships) {
  const matches = matchingFolders.filter((folder) => folder.appProperties?.['fgf-key'] === `championship:${id}`);
  if (matches.length !== 1 || matches[0].name !== name) {
    throw new Error(`A pasta do campeonato ${name} não está íntegra; nenhuma renomeação foi feita.`);
  }
}

if (rootBefore.data.name === oldEventFolderName) {
  await drive.files.update({
    fileId: eventFolderId,
    requestBody: { name: eventFolderName },
    fields: 'id,name,parents,mimeType,trashed,appProperties'
  });
  console.log('Pasta raiz renomeada sem recriar a estrutura.');
} else {
  console.log('Pasta raiz já estava com o nome correto.');
}

const rootAfter = await drive.files.get({
  fileId: eventFolderId,
  fields: 'id,name,parents,mimeType,trashed,appProperties'
});

const rootChildrenAfter = await listChildFolders(eventFolderId);
const championshipsAreaAfter = rootChildrenAfter.filter(
  (folder) => folder.id === championshipsAreas[0].id && folder.name === 'Campeonatos'
);
const championshipFoldersAfter = await listChildFolders(championshipsAreas[0].id);
const intactChampionships = championships.filter(([id, name]) =>
  championshipFoldersAfter.filter((folder) => folder.appProperties?.['fgf-key'] === `championship:${id}` && folder.name === name).length === 1
).length;

if (
  rootAfter.data.name !== eventFolderName ||
  championshipsAreaAfter.length !== 1 ||
  intactChampionships !== championships.length
) {
  throw new Error('A validação pós-renomeação não confirmou a estrutura completa.');
}

console.log(`Nome da raiz confirmado: ${rootAfter.data.name}`);
console.log('Pasta Campeonatos confirmada dentro da raiz.');
console.log(`Pastas de campeonatos intactas: ${intactChampionships}/${championships.length}.`);
