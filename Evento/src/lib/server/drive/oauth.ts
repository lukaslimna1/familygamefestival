import { google, type Auth } from 'googleapis';
import { getGoogleOAuthConfig } from '../config/env';

export const GOOGLE_DRIVE_FILE_SCOPE = 'https://www.googleapis.com/auth/drive.file' as const;

export function getGoogleOAuthClient(): Auth.OAuth2Client {
  const config = getGoogleOAuthConfig();
  return new google.auth.OAuth2(config.clientId, config.clientSecret, config.redirectUri);
}

export function createGoogleAuthorizationUrl(state: string) {
  return getGoogleOAuthClient().generateAuthUrl({
    access_type: 'offline',
    prompt: 'consent',
    scope: [GOOGLE_DRIVE_FILE_SCOPE],
    state
  });
}

export async function exchangeGoogleAuthorizationCode(code: string) {
  if (!code || code.length > 4096) {
    throw new Error('Código OAuth inválido.');
  }

  const { tokens } = await getGoogleOAuthClient().getToken(code);
  return tokens;
}
