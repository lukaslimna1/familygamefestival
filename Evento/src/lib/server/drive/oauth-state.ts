import { randomUUID } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { getGoogleOAuthStateSecret } from '../config/env';

export const GOOGLE_OAUTH_STATE_COOKIE = 'fgf_google_oauth_state';
export const GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS = 600;

const GOOGLE_OAUTH_STATE_PURPOSE = 'google-drive-oauth';

function getStateKey() {
  return new TextEncoder().encode(getGoogleOAuthStateSecret());
}

export async function createGoogleOAuthState() {
  return new SignJWT({
    purpose: GOOGLE_OAUTH_STATE_PURPOSE,
    nonce: randomUUID()
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS}s`)
    .sign(getStateKey());
}

export async function isValidGoogleOAuthState(state: string | undefined, cookieState: string | undefined) {
  if (!state || !cookieState || state !== cookieState || state.length > 4096) {
    return false;
  }

  try {
    const { payload } = await jwtVerify(state, getStateKey(), {
      algorithms: ['HS256']
    });

    return payload.purpose === GOOGLE_OAUTH_STATE_PURPOSE && typeof payload.nonce === 'string';
  } catch {
    return false;
  }
}

export const googleOAuthStateCookieOptions = {
  httpOnly: true,
  maxAge: GOOGLE_OAUTH_STATE_MAX_AGE_SECONDS,
  path: '/api/admin/google-drive',
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production'
};
