import { jwtVerify, SignJWT } from 'jose';
import { getAdminConfig } from '../config/env';
import {
  PUBLIC_REGISTRATION_ACCESS_COOKIE,
  PUBLIC_REGISTRATION_ACCESS_TTL_SECONDS
} from './config';

function getAccessSecret() {
  const configured = process.env.PUBLIC_REGISTRATION_ACCESS_SECRET
    ?? (import.meta.env as Record<string, string | undefined>).PUBLIC_REGISTRATION_ACCESS_SECRET
    ?? getAdminConfig().sessionSecret;
  return new TextEncoder().encode(configured);
}

export async function createPublicRegistrationAccessToken(registrationId: string, publicCode: string) {
  return new SignJWT({
    purpose: 'public-registration-access',
    code: publicCode
  })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(registrationId)
    .setIssuedAt()
    .setExpirationTime(`${PUBLIC_REGISTRATION_ACCESS_TTL_SECONDS}s`)
    .sign(getAccessSecret());
}

export async function verifyPublicRegistrationAccessToken(token: string | undefined) {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getAccessSecret(), { algorithms: ['HS256'] });
    if (
      payload.purpose !== 'public-registration-access' ||
      typeof payload.sub !== 'string' ||
      typeof payload.code !== 'string'
    ) return null;
    return { registrationId: payload.sub, publicCode: payload.code };
  } catch {
    return null;
  }
}

export function getPublicRegistrationAccessCookieOptions(request?: Request) {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || request?.url.startsWith('https://') === true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: PUBLIC_REGISTRATION_ACCESS_TTL_SECONDS
  };
}

export { PUBLIC_REGISTRATION_ACCESS_COOKIE };

