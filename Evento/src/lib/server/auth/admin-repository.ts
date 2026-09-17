import { randomUUID } from 'node:crypto';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/client';
import { admins } from '../db/schema';

export type ActiveAdmin = {
  id: string;
  displayName: string;
  username: string;
  status: string;
  passwordHash: string;
  mustChangePassword: boolean;
};

export function normalizeAdminUsername(value: string) {
  return value.trim().toLowerCase();
}

export function isValidAdminUsername(value: string) {
  return /^[a-z0-9][a-z0-9._-]{2,59}$/.test(value);
}

export async function findAdminByUsername(username: string): Promise<ActiveAdmin | null> {
  const database = getDatabase();
  const [admin] = await database
    .select({
      id: admins.id,
      displayName: admins.displayName,
      username: admins.username,
      status: admins.status,
      passwordHash: admins.passwordHash,
      mustChangePassword: admins.mustChangePassword
    })
    .from(admins)
    .where(eq(admins.username, username))
    .limit(1);

  if (!admin?.username) return null;
  return admin as ActiveAdmin;
}

export async function findActiveAdminById(adminId: string) {
  const database = getDatabase();
  const [admin] = await database
    .select({
      id: admins.id,
      displayName: admins.displayName,
      username: admins.username,
      status: admins.status,
      passwordHash: admins.passwordHash,
      mustChangePassword: admins.mustChangePassword
    })
    .from(admins)
    .where(eq(admins.id, adminId))
    .limit(1);

  if (!admin?.username || admin.status !== 'active') return null;
  return admin as ActiveAdmin;
}

export async function createAdminAccount({
  displayName,
  username,
  passwordHash,
  mustChangePassword = false
}: {
  displayName: string;
  username: string;
  passwordHash: string;
  mustChangePassword?: boolean;
}) {
  const database = getDatabase();
  const normalizedUsername = normalizeAdminUsername(username);
  if (!displayName.trim() || !isValidAdminUsername(normalizedUsername)) {
    throw new Error('Dados do administrador inválidos.');
  }

  const existing = await findAdminByUsername(normalizedUsername);
  if (existing) throw new Error('Esse username já está em uso.');

  const id = randomUUID();
  await database.insert(admins).values({
    id,
    displayName: displayName.trim(),
    username: normalizedUsername,
    // A coluna email é legada e permanece preenchida com um identificador interno.
    email: `${normalizedUsername}@admin.local`,
    passwordHash,
    status: 'active',
    mustChangePassword
  });

  return { id, displayName: displayName.trim(), username: normalizedUsername };
}

export async function updateAdminLastLogin(adminId: string, at = new Date().toISOString()) {
  await getDatabase()
    .update(admins)
    .set({ lastLoginAt: at, updatedAt: at })
    .where(eq(admins.id, adminId));
}

export async function updateAdminPassword(
  adminId: string,
  passwordHash: string,
  mustChangePassword = false,
  at = new Date().toISOString()
) {
  await getDatabase()
    .update(admins)
    .set({ passwordHash, mustChangePassword, updatedAt: at })
    .where(eq(admins.id, adminId));
}

export async function updateAdminDisplayName(adminId: string, displayName: string, at = new Date().toISOString()) {
  const normalized = displayName.trim();
  if (normalized.length < 3 || normalized.length > 160) {
    throw new Error('O nome de exibição deve ter entre 3 e 160 caracteres.');
  }

  await getDatabase()
    .update(admins)
    .set({ displayName: normalized, updatedAt: at })
    .where(eq(admins.id, adminId));
}
