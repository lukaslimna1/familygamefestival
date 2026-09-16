import { createClient } from '@libsql/client';
import { drizzle, type LibSQLDatabase } from 'drizzle-orm/libsql';
import { getTursoConfig } from '../config/env';
import { databaseSchema } from './schema';

type FgfDatabase = LibSQLDatabase<typeof databaseSchema>;

let database: FgfDatabase | undefined;

export function getDatabase(): FgfDatabase {
  if (database) return database;

  const config = getTursoConfig();
  const client = createClient({ url: config.url, authToken: config.authToken });
  database = drizzle(client, { schema: databaseSchema });
  return database;
}
