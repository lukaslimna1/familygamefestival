import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';
import { google } from 'googleapis';
import competitionDefinitions from '../src/config/competitions.json' with { type: 'json' };

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, '..');
const localEnvFile = join(projectDirectory, '.env.local');

if (existsSync(localEnvFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(localEnvFile);
}

function requiredEnvironment(name) {
  const value = process.env[name]?.trim();
  if (!value) throw new Error(`Variável obrigatória ausente: ${name}.`);
  return value;
}

const database = createClient({
  url: requiredEnvironment('TURSO_DATABASE_URL'),
  authToken: requiredEnvironment('TURSO_AUTH_TOKEN')
});

const auth = new google.auth.OAuth2(
  requiredEnvironment('GOOGLE_CLIENT_ID'),
  requiredEnvironment('GOOGLE_CLIENT_SECRET'),
  requiredEnvironment('GOOGLE_REDIRECT_URI')
);
auth.setCredentials({ refresh_token: requiredEnvironment('GOOGLE_REFRESH_TOKEN') });

const drive = google.drive({ version: 'v3', auth });
const rootFolderId = requiredEnvironment('GOOGLE_DRIVE_ROOT_FOLDER_ID');
const folderMimeType = 'application/vnd.google-apps.folder';
const eventFolderName = 'Family Game Festival 2026';
const championshipsFolderName = 'Campeonatos';

function escapeDriveQueryValue(value) {
  return value.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

async function getFolder(fileId, expectedName) {
  const response = await drive.files.get({
    fileId,
    fields: 'id,name,mimeType,parents,trashed,appProperties'
  });
  const folder = response.data;
  if (
    folder.id !== fileId ||
    folder.name !== expectedName ||
    folder.mimeType !== folderMimeType ||
    folder.trashed
  ) {
    throw new Error(`A pasta configurada não corresponde a ${expectedName}.`);
  }
  return folder;
}

async function listDirectFolders(parentId) {
  const folders = [];
  let pageToken;

  do {
    const response = await drive.files.list({
      q: [
        `'${escapeDriveQueryValue(parentId)}' in parents`,
        `mimeType = '${folderMimeType}'`,
        'trashed = false'
      ].join(' and '),
      spaces: 'drive',
      pageSize: 100,
      pageToken,
      fields: 'nextPageToken,files(id,name,mimeType,parents,trashed,appProperties)'
    });
    folders.push(...(response.data.files ?? []));
    pageToken = response.data.nextPageToken ?? undefined;
  } while (pageToken);

  return folders;
}

function findExactlyOne(folders, predicate, label) {
  const matches = folders.filter(predicate);
  if (matches.length !== 1) {
    throw new Error(`Esperada exatamente uma pasta ${label}; encontradas ${matches.length}.`);
  }
  return matches[0];
}

const eventFolder = await getFolder(rootFolderId, eventFolderName);
const eventChildren = await listDirectFolders(eventFolder.id);
const championshipsFolder = findExactlyOne(
  eventChildren,
  (folder) => folder.name === championshipsFolderName && folder.appProperties?.['fgf-key'] === 'area:championships',
  championshipsFolderName
);

const championshipFolders = await listDirectFolders(championshipsFolder.id);
const folderByCompetitionId = new Map();

for (const definition of competitionDefinitions) {
  const folder = findExactlyOne(
    championshipFolders,
    (candidate) => (
      candidate.name === definition.driveFolderName &&
      candidate.appProperties?.['fgf-key'] === definition.driveFolderKey &&
      candidate.parents?.includes(championshipsFolder.id)
    ),
    definition.driveFolderName
  );
  folderByCompetitionId.set(definition.id, folder);
}

const competitionColumns = await database.execute('PRAGMA table_info(competitions)');
const availableColumns = new Set(competitionColumns.rows.map((row) => String(row.name)));
if (!availableColumns.has('drive_folder_id')) {
  throw new Error('A coluna competitions.drive_folder_id não existe; aplique a migration incremental antes da sincronização.');
}

const upsertSql = `
  INSERT INTO competitions (
    id, slug, title, category, event_day, event_date, start_time,
    registration_price_cents, prize_cents, prize_note, max_participants,
    min_participants_for_prize, registration_mode, is_free, status,
    drive_folder_id
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  ON CONFLICT(id) DO UPDATE SET
    slug = excluded.slug,
    title = excluded.title,
    category = excluded.category,
    event_day = excluded.event_day,
    event_date = excluded.event_date,
    start_time = excluded.start_time,
    registration_price_cents = excluded.registration_price_cents,
    prize_cents = excluded.prize_cents,
    prize_note = excluded.prize_note,
    max_participants = excluded.max_participants,
    min_participants_for_prize = excluded.min_participants_for_prize,
    registration_mode = excluded.registration_mode,
    is_free = excluded.is_free,
    status = excluded.status,
    drive_folder_id = excluded.drive_folder_id,
    updated_at = CURRENT_TIMESTAMP
`;

for (const definition of competitionDefinitions) {
  const folder = folderByCompetitionId.get(definition.id);
  await database.execute({
    sql: upsertSql,
    args: [
      definition.id,
      definition.slug,
      definition.name,
      definition.category,
      definition.eventDay,
      definition.eventDate,
      definition.startTime,
      definition.registrationPriceCents,
      definition.prizeCents,
      definition.prizeNote ?? null,
      definition.maxParticipants ?? null,
      definition.minParticipantsForPrize ?? null,
      definition.registrationMode,
      definition.registrationFree === true ? 1 : 0,
      'published',
      folder.id
    ]
  });
}

const rows = await database.execute(
  `SELECT id, slug, title, drive_folder_id FROM competitions WHERE id IN (${competitionDefinitions.map(() => '?').join(', ')})`,
  competitionDefinitions.map((definition) => definition.id)
);

const rowsById = new Map(rows.rows.map((row) => [String(row.id), row]));
const missingIds = competitionDefinitions
  .filter((definition) => !rowsById.has(definition.id))
  .map((definition) => definition.id);
const persistedDriveIds = competitionDefinitions.map((definition) => String(rowsById.get(definition.id)?.drive_folder_id ?? ''));
const uniqueDriveIds = new Set(persistedDriveIds);

if (rows.rows.length !== competitionDefinitions.length || missingIds.length > 0 || uniqueDriveIds.size !== competitionDefinitions.length) {
  throw new Error('A validação pós-sincronização não encontrou exatamente um registro e uma pasta Drive por campeonato.');
}

console.log(JSON.stringify({
  status: 'ok',
  eventFolder: eventFolder.name,
  championshipsFolder: championshipsFolder.name,
  driveChampionshipFoldersFound: championshipFolders.length,
  competitionsSynchronized: rows.rows.length,
  uniqueDriveFolderLinks: uniqueDriveIds.size,
  competitionIds: competitionDefinitions.map((definition) => definition.id)
}, null, 2));
