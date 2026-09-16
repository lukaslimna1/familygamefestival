import { compare, hash } from 'bcryptjs';

const PASSWORD_COST = 12;

function assertPassword(password: string) {
  if (typeof password !== 'string' || password.length < 12 || password.length > 256) {
    throw new Error('A senha administrativa deve ter entre 12 e 256 caracteres.');
  }
}

export async function hashAdminPassword(password: string) {
  assertPassword(password);
  return hash(password, PASSWORD_COST);
}

export async function verifyAdminPassword(password: string, passwordHash: string) {
  if (typeof password !== 'string' || typeof passwordHash !== 'string') return false;
  return compare(password, passwordHash);
}
