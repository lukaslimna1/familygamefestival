import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createClient } from '@libsql/client';

const scriptDirectory = dirname(fileURLToPath(import.meta.url));
const projectDirectory = resolve(scriptDirectory, '..');
const migrationsDirectory = join(projectDirectory, 'db', 'migrations');
const isDryRun = process.argv.includes('--dry-run');

const localEnvFile = join(projectDirectory, '.env.local');
if (existsSync(localEnvFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(localEnvFile);
}

const migrationFiles = readdirSync(migrationsDirectory)
  .filter((filename) => /^\d+_[a-z0-9_-]+\.sql$/i.test(filename))
  .sort((left, right) => left.localeCompare(right, 'en'));

if (migrationFiles.length === 0) {
  throw new Error('Nenhuma migração SQL foi encontrada em db/migrations.');
}

if (isDryRun) {
  console.log('Migrações encontradas:');
  migrationFiles.forEach((filename) => console.log(`- ${filename}`));
  console.log('Dry run concluído; nenhuma conexão com o banco foi aberta.');
  process.exit(0);
}

const databaseUrl = process.env.TURSO_DATABASE_URL;
const authToken = process.env.TURSO_AUTH_TOKEN;
if (!databaseUrl || !authToken) {
  throw new Error('Migração bloqueada: TURSO_DATABASE_URL e TURSO_AUTH_TOKEN são obrigatórios.');
}

const client = createClient({ url: databaseUrl, authToken });
await client.execute(`
  CREATE TABLE IF NOT EXISTS schema_migrations (
    id TEXT PRIMARY KEY NOT NULL,
    applied_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
  )
`);

const appliedResult = await client.execute('SELECT id FROM schema_migrations');
const appliedMigrations = new Set(appliedResult.rows.map((row) => String(row.id)));

for (const filename of migrationFiles) {
  if (appliedMigrations.has(filename)) {
    console.log(`Já aplicada: ${filename}`);
    continue;
  }

  const source = readFileSync(join(migrationsDirectory, filename), 'utf8');
  const statements = source
    .split(/;\s*(?:\r?\n|$)/g)
    .map((statement) => statement.trim())
    .filter(Boolean);

  await client.batch(
    [
      ...statements.map((sql) => ({ sql, args: [] })),
      { sql: 'INSERT INTO schema_migrations (id) VALUES (?)', args: [filename] }
    ],
    'write'
  );

  console.log(`Aplicada: ${filename}`);
}

console.log('Migrações concluídas com sucesso na base Family Game Festival.');
