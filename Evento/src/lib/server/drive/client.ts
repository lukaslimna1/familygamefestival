import { google, type drive_v3 } from 'googleapis';
import { getDriveConfig } from '../config/env';
import { getGoogleOAuthClient } from './oauth';

let driveClient: drive_v3.Drive | undefined;

export function getDriveClient() {
  if (driveClient) return driveClient;

  const config = getDriveConfig();
  const auth = getGoogleOAuthClient();
  auth.setCredentials({ refresh_token: config.refreshToken });
  driveClient = google.drive({ version: 'v3', auth });
  return driveClient;
}
