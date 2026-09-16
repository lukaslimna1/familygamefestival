import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

function escapeEnvValue(value: string) {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

function upsertEnvironmentLine(contents: string, name: string, value: string) {
  const line = `${name}="${escapeEnvValue(value)}"`;
  const linePattern = new RegExp(`^\\s*${name}=.*$`, 'm');

  if (linePattern.test(contents)) {
    return contents.replace(linePattern, line);
  }

  const separator = contents.length > 0 && !contents.endsWith('\n') ? '\n' : '';
  return `${contents}${separator}${line}\n`;
}

export async function persistGoogleRefreshTokenLocally(refreshToken: string) {
  if (!import.meta.env.DEV) {
    throw new Error('A persistência automática da credencial está disponível somente no desenvolvimento local.');
  }

  const envPath = resolve(process.cwd(), '.env.local');
  let contents = '';

  try {
    contents = await readFile(envPath, 'utf8');
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
      throw error;
    }
  }

  const updatedContents = upsertEnvironmentLine(contents, 'GOOGLE_REFRESH_TOKEN', refreshToken);
  await writeFile(envPath, updatedContents, { encoding: 'utf8', mode: 0o600 });

  // Keep the current dev process usable without exposing the token to the client.
  process.env.GOOGLE_REFRESH_TOKEN = refreshToken;
}
