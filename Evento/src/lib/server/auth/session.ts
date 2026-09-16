import { createHash } from 'node:crypto';
import { jwtVerify, SignJWT } from 'jose';
import { getAdminConfig } from '../config/env';

export const ADMIN_SESSION_COOKIE = 'fgf_admin_session';

export type AdminSession = {
  adminId: string;
  role: 'admin';
};

function getSessionSecret() {
  return new TextEncoder().encode(getAdminConfig().sessionSecret);
}

export async function createAdminSessionToken(adminId: string) {
  const { sessionTtlSeconds } = getAdminConfig();
  return new SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime(`${sessionTtlSeconds}s`)
    .sign(getSessionSecret());
}

export async function verifyAdminSessionToken(token: string | undefined): Promise<AdminSession | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), { algorithms: ['HS256'] });
    if (payload.role !== 'admin' || typeof payload.sub !== 'string') return null;
    return { adminId: payload.sub, role: 'admin' };
  } catch {
    return null;
  }
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function getAdminSessionCookieOptions() {
  const { sessionTtlSeconds } = getAdminConfig();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax' as const,
    path: '/',
    maxAge: sessionTtlSeconds
  };
}
