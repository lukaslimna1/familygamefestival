import { createHash, randomUUID } from 'node:crypto';
import { and, eq, isNull } from 'drizzle-orm';
import { jwtVerify, SignJWT } from 'jose';
import { getAdminConfig } from '../config/env';
import { getDatabase } from '../db/client';
import { admins, adminSessions } from '../db/schema';

export const ADMIN_SESSION_COOKIE = 'fgf_admin_session';

export type AdminSession = {
  adminId: string;
  sessionId: string;
  displayName: string;
  username: string;
  mustChangePassword: boolean;
  role: 'admin';
};

type VerifiedAdminToken = Pick<AdminSession, 'adminId' | 'sessionId' | 'role'>;

function getSessionSecret() {
  return new TextEncoder().encode(getAdminConfig().sessionSecret);
}

export async function createAdminSessionToken(adminId: string, sessionId: string) {
  const { sessionTtlSeconds } = getAdminConfig();
  return new SignJWT({ role: 'admin', sid: sessionId })
    .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
    .setSubject(adminId)
    .setIssuedAt()
    .setExpirationTime(`${sessionTtlSeconds}s`)
    .sign(getSessionSecret());
}

export async function verifyAdminSessionToken(token: string | undefined): Promise<VerifiedAdminToken | null> {
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSessionSecret(), { algorithms: ['HS256'] });
    if (
      payload.role !== 'admin' ||
      typeof payload.sub !== 'string' ||
      typeof payload.sid !== 'string'
    ) return null;
    return { adminId: payload.sub, sessionId: payload.sid, role: 'admin' };
  } catch {
    return null;
  }
}

export async function createAdminSession(adminId: string) {
  const { sessionTtlSeconds } = getAdminConfig();
  const sessionId = randomUUID();
  const token = await createAdminSessionToken(adminId, sessionId);
  const expiresAt = new Date(Date.now() + sessionTtlSeconds * 1000).toISOString();

  await getDatabase().insert(adminSessions).values({
    id: sessionId,
    adminId,
    tokenHash: hashSessionToken(token),
    expiresAt
  });

  return { token, sessionId, expiresAt };
}

export async function resolveAdminSession(token: string | undefined): Promise<AdminSession | null> {
  const verified = await verifyAdminSessionToken(token);
  if (!verified) return null;

  const [session] = await getDatabase()
    .select({
      sessionId: adminSessions.id,
      adminId: admins.id,
      displayName: admins.displayName,
      username: admins.username,
      mustChangePassword: admins.mustChangePassword,
      status: admins.status,
      expiresAt: adminSessions.expiresAt
    })
    .from(adminSessions)
    .innerJoin(admins, eq(adminSessions.adminId, admins.id))
    .where(and(
      eq(adminSessions.id, verified.sessionId),
      eq(adminSessions.adminId, verified.adminId),
      eq(adminSessions.tokenHash, hashSessionToken(token!)),
      isNull(adminSessions.revokedAt),
      eq(admins.status, 'active')
    ))
    .limit(1);

  const expiresAt = session ? new Date(session.expiresAt).getTime() : Number.NaN;
  if (!session || !session.username || !Number.isFinite(expiresAt) || expiresAt <= Date.now()) return null;

  return {
    adminId: session.adminId,
    sessionId: session.sessionId,
    displayName: session.displayName,
    username: session.username,
    mustChangePassword: session.mustChangePassword,
    role: 'admin'
  };
}

export async function revokeAdminSession(token: string | undefined) {
  const verified = await verifyAdminSessionToken(token);
  if (!verified) return;

  await getDatabase()
    .update(adminSessions)
    .set({ revokedAt: new Date().toISOString() })
    .where(and(
      eq(adminSessions.id, verified.sessionId),
      eq(adminSessions.adminId, verified.adminId),
      eq(adminSessions.tokenHash, hashSessionToken(token!))
    ));
}

export async function revokeAllAdminSessions(adminId: string) {
  await getDatabase()
    .update(adminSessions)
    .set({ revokedAt: new Date().toISOString() })
    .where(eq(adminSessions.adminId, adminId));
}

export function hashSessionToken(token: string) {
  return createHash('sha256').update(token).digest('hex');
}

export function getAdminSessionCookieOptions(request?: Request) {
  const { sessionTtlSeconds } = getAdminConfig();
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production' || request?.url.startsWith('https://') === true,
    sameSite: 'lax' as const,
    path: '/',
    maxAge: sessionTtlSeconds
  };
}
