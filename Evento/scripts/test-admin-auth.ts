import { randomBytes, randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import { eq } from 'drizzle-orm';
import { createAdminAccount, findActiveAdminById } from '../src/lib/server/auth/admin-repository';
import { hashAdminPassword } from '../src/lib/server/auth/password';
import {
  createAdminSession,
  resolveAdminSession,
  revokeAllAdminSessions
} from '../src/lib/server/auth/session';
import { getDatabase } from '../src/lib/server/db/client';
import { admins, adminSessions } from '../src/lib/server/db/schema';

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url));
const projectDirectory = join(scriptDirectory, '..');
const localEnvFile = join(projectDirectory, '.env.local');
if (existsSync(localEnvFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(localEnvFile);
}

if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
  throw new Error('Teste bloqueado: configure a conexão Turso no .env.local.');
}

const originalSessionSecret = process.env.ADMIN_SESSION_SECRET;
const originalSessionTtl = process.env.ADMIN_SESSION_TTL_SECONDS;
process.env.ADMIN_SESSION_SECRET = originalSessionSecret || randomBytes(32).toString('base64url');
process.env.ADMIN_SESSION_TTL_SECONDS = '3600';

// Keep the administrative test isolated from the public frontend dev server,
// which uses 4322 in the local workspace.
const port = 4323;
const baseUrl = `http://127.0.0.1:${port}`;
const runId = randomUUID().slice(0, 8);
const testUsername = `test-admin-${runId}`;
const secondaryTestUsername = `test-admin-secondary-${runId}`;
const originalPassword = `TestAdminPassword-${runId}-original`;
const updatedPassword = `TestAdminPassword-${runId}-updated`;
const secondaryPassword = `TestAdminPassword-${runId}-secondary`;
const forcedUpdatedPassword = `TestAdminPassword-${runId}-forced-updated`;

type CookieJar = Map<string, string>;

function assert(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function getSetCookies(headers: Headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const header = headers.get('set-cookie');
  return header ? header.split(/,(?=\s*[^;=]+=[^;=]+)/) : [];
}

function updateCookieJar(jar: CookieJar, headers: Headers) {
  for (const setCookie of getSetCookies(headers)) {
    const [pair, ...attributes] = setCookie.split(';');
    const separator = pair.indexOf('=');
    if (separator < 1) continue;
    const name = pair.slice(0, separator).trim();
    const value = pair.slice(separator + 1).trim();
    const maxAge = attributes.find((attribute) => attribute.trim().toLowerCase().startsWith('max-age='));
    if (!value || maxAge?.trim().toLowerCase() === 'max-age=0') jar.delete(name);
    else jar.set(name, value);
  }
}

function cookieHeader(jar: CookieJar) {
  return [...jar].map(([name, value]) => `${name}=${value}`).join('; ');
}

async function request(
  path: string,
  init: RequestInit = {},
  jar: CookieJar,
  explicitCookie?: string
) {
  const headers = new Headers(init.headers);
  const cookie = explicitCookie ?? cookieHeader(jar);
  if (cookie) headers.set('cookie', cookie);
  if (init.method?.toUpperCase() === 'POST') headers.set('origin', baseUrl);
  const response = await fetch(`${baseUrl}${path}`, { ...init, headers, redirect: 'manual' });
  updateCookieJar(jar, response.headers);
  const body = await response.text();
  return { response, body };
}

function formBody(values: Record<string, string>) {
  return new URLSearchParams(values).toString();
}

function locationOf(response: Response) {
  return response.headers.get('location') || '';
}

async function waitForServer(child: ChildProcess) {
  const startedAt = Date.now();
  while (Date.now() - startedAt < 60_000) {
    if (child.exitCode !== null) throw new Error('O servidor local encerrou antes do teste.');
    try {
      const response = await fetch(`${baseUrl}/admin/login`, { redirect: 'manual' });
      if (response.status === 200) return;
    } catch {
      // O servidor ainda pode estar iniciando.
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
  throw new Error('O servidor local não respondeu dentro do tempo esperado.');
}

async function stopServer(child: ChildProcess | undefined) {
  if (!child || child.exitCode !== null) return;
  if (process.platform === 'win32' && child.pid) {
    spawnSync('taskkill', ['/PID', String(child.pid), '/T', '/F'], { stdio: 'ignore', windowsHide: true });
    return;
  }
  child.kill('SIGTERM');
}

let temporaryAdmin: { id: string } | undefined;
let secondaryTemporaryAdmin: { id: string } | undefined;
let server: ChildProcess | undefined;
const jar: CookieJar = new Map();

try {
  const passwordHash = await hashAdminPassword(originalPassword);
  temporaryAdmin = await createAdminAccount({
    displayName: `TESTE - administrador ${runId}`,
    username: testUsername,
    passwordHash
  });
  secondaryTemporaryAdmin = await createAdminAccount({
    displayName: `TESTE - administrador secundário ${runId}`,
    username: secondaryTestUsername,
    passwordHash: await hashAdminPassword(secondaryPassword),
    mustChangePassword: true
  });

  let duplicateRejected = false;
  try {
    await createAdminAccount({
      displayName: `TESTE - duplicado ${runId}`,
      username: testUsername,
      passwordHash
    });
  } catch {
    duplicateRejected = true;
  }
  assert(duplicateRejected, 'O banco aceitou username administrativo duplicado.');
  const forcedAdminBeforeLogin = await findActiveAdminById(secondaryTemporaryAdmin.id);
  assert(forcedAdminBeforeLogin?.mustChangePassword === true, 'A flag de primeiro acesso não foi persistida.');

  const astroCli = join(projectDirectory, 'node_modules', 'astro', 'bin', 'astro.mjs');
  const serverEnvironment = { ...process.env };
  // Astro detects the Codex parent process and would daemonize the test server.
  // Removing only this marker keeps the test server in the child process.
  delete serverEnvironment.CODEX_THREAD_ID;
  server = spawn(process.execPath, [astroCli, 'dev', '--ignore-lock', '--host', '127.0.0.1', '--port', String(port)], {
    cwd: projectDirectory,
    env: serverEnvironment,
    stdio: 'ignore',
    windowsHide: true
  });
  await waitForServer(server);

  const loginPage = await request('/admin/login', {}, jar);
  assert(loginPage.response.status === 200, 'A página de login não respondeu com sucesso.');
  assert(!loginPage.body.includes('passwordHash'), 'A página pública de login expôs um campo interno.');

  const unauthenticated = await request('/admin', {}, jar);
  assert(unauthenticated.response.status === 302, 'A rota /admin não redirecionou usuário não autenticado.');
  assert(locationOf(unauthenticated.response) === '/admin/login', 'O redirecionamento de /admin é inesperado.');

  const unauthenticatedApi = await request('/api/admin/google-drive/authorize', {}, jar);
  assert(unauthenticatedApi.response.status === 401, 'Uma API administrativa ficou acessível sem sessão.');

  const invalidLogin = await request('/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({ username: testUsername, password: 'senha-incorreta' })
  }, jar);
  assert(invalidLogin.response.status === 303, `Login inválido não redirecionou (status ${invalidLogin.response.status}, destino ${locationOf(invalidLogin.response)}).`);
  assert(locationOf(invalidLogin.response) === '/admin/login?error=invalid', 'Login inválido revelou informação indevida.');

  const validLogin = await request('/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({ username: testUsername, password: originalPassword })
  }, jar);
  assert(validLogin.response.status === 303, 'Login válido não redirecionou para o painel.');
  assert(locationOf(validLogin.response) === '/admin', 'Login válido apontou para uma rota inesperada.');
  const sessionCookie = getSetCookies(validLogin.response.headers).find((cookie) => cookie.startsWith('fgf_admin_session=')) || '';
  assert(sessionCookie.includes('HttpOnly'), 'O cookie de sessão não é HttpOnly.');
  assert(sessionCookie.includes('SameSite=Lax'), 'O cookie de sessão não definiu SameSite=Lax.');
  assert(sessionCookie.includes('Path=/'), 'O cookie de sessão não definiu Path=/.');
  assert(sessionCookie.includes('Max-Age=3600'), 'O cookie de sessão não definiu a expiração esperada.');
  assert(!sessionCookie.includes('Secure'), 'O cookie local não deveria exigir Secure em HTTP.');
  const oldCookie = cookieHeader(jar);
  assert(oldCookie.includes('fgf_admin_session='), 'O cookie de sessão não foi armazenado no teste.');

  const panel = await request('/admin', {}, jar);
  assert(panel.response.status === 200, 'A sessão válida não acessou o painel.');
  assert(panel.body.includes('Family Game Festival 2026'), 'O painel não apresentou o evento esperado.');
  assert(panel.body.includes(`TESTE - administrador ${runId}`), 'O painel não carregou o administrador autenticado.');
  assert(!panel.body.includes('passwordHash'), 'O painel expôs o nome do campo de senha.');

  const normalPasswordPage = await request('/admin/account/password', {}, jar);
  assert(normalPasswordPage.response.status === 200, 'A troca de senha normal não foi liberada.');
  assert(normalPasswordPage.body.includes('Cancelar'), 'A troca de senha normal não exibiu Cancelar.');
  assert(normalPasswordPage.body.includes('Voltar ao painel'), 'A troca de senha normal não exibiu Voltar ao painel.');

  const logout = await request('/api/admin/logout', { method: 'POST' }, jar);
  assert(logout.response.status === 303, 'Logout não redirecionou.');
  assert(locationOf(logout.response) === '/admin/login', 'Logout não retornou exatamente para o login.');
  const afterLogout = await request('/admin', {}, jar, oldCookie);
  assert(afterLogout.response.status === 302, 'A sessão revogada continuou válida.');

  const loginAgain = await request('/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({ username: testUsername, password: originalPassword })
  }, jar);
  assert(locationOf(loginAgain.response) === '/admin', 'Não foi possível criar uma nova sessão de teste.');

  const wrongPasswordChange = await request('/api/admin/account/password', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({ currentPassword: 'senha-incorreta', newPassword: updatedPassword, confirmation: updatedPassword })
  }, jar);
  assert(locationOf(wrongPasswordChange.response) === '/admin/account/password?error=current', 'Senha atual incorreta não foi rejeitada.');

  const passwordChange = await request('/api/admin/account/password', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({ currentPassword: originalPassword, newPassword: updatedPassword, confirmation: updatedPassword })
  }, jar);
  assert(locationOf(passwordChange.response) === '/admin/login?password_changed=1', 'A troca de senha não encerrou as sessões.');

  const oldPasswordLogin = await request('/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({ username: testUsername, password: originalPassword })
  }, jar);
  assert(locationOf(oldPasswordLogin.response) === '/admin/login?error=invalid', 'A senha antiga continuou válida.');

  const newPasswordLogin = await request('/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({ username: testUsername, password: updatedPassword })
  }, jar);
  assert(locationOf(newPasswordLogin.response) === '/admin', 'A nova senha não autenticou o administrador.');
  await request('/api/admin/logout', { method: 'POST' }, jar);

  const forcedLogin = await request('/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({ username: secondaryTestUsername, password: secondaryPassword })
  }, jar);
  assert(forcedLogin.response.status === 303, 'O login do administrador temporário com troca obrigatória não redirecionou.');
  assert(locationOf(forcedLogin.response) === '/admin/account/password', 'O primeiro acesso não redirecionou para a troca de senha.');
  const forcedOldCookie = cookieHeader(jar);
  assert(forcedOldCookie.includes('fgf_admin_session='), 'A sessão do primeiro acesso não foi criada.');

  const forcedPanel = await request('/admin', {}, jar);
  assert(forcedPanel.response.status === 302, 'O administrador com troca obrigatória acessou o painel antes de trocar a senha.');
  assert(locationOf(forcedPanel.response) === '/admin/account/password', 'O bloqueio de primeiro acesso apontou para uma rota inesperada.');

  const forcedApi = await request('/api/admin/google-drive/authorize', {}, jar);
  assert(forcedApi.response.status === 403, 'O administrador com troca obrigatória acessou uma API administrativa bloqueada.');

  const forcedPasswordPage = await request('/admin/account/password', {}, jar);
  assert(forcedPasswordPage.response.status === 200, 'A página de troca de senha não foi liberada no primeiro acesso.');
  assert(forcedPasswordPage.body.includes('defina uma nova senha'), 'A página não identificou a exigência de primeiro acesso.');
  assert(forcedPasswordPage.body.includes('Sair'), 'A tela de primeiro acesso não exibiu a ação Sair.');
  assert(!forcedPasswordPage.body.includes('Voltar ao painel'), 'A tela de primeiro acesso exibiu um retorno para painel bloqueado.');

  const forcedWrongChange = await request('/api/admin/account/password', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({ currentPassword: 'senha-incorreta', newPassword: forcedUpdatedPassword, confirmation: forcedUpdatedPassword })
  }, jar);
  assert(locationOf(forcedWrongChange.response) === '/admin/account/password?error=current', 'A troca de senha com senha atual incorreta não foi rejeitada no primeiro acesso.');

  const forcedChange = await request('/api/admin/account/password', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({ currentPassword: secondaryPassword, newPassword: forcedUpdatedPassword, confirmation: forcedUpdatedPassword })
  }, jar);
  assert(locationOf(forcedChange.response) === '/admin/login?password_changed=1', 'A troca de senha obrigatória não foi concluída.');
  const forcedAdminAfterChange = await findActiveAdminById(secondaryTemporaryAdmin.id);
  assert(forcedAdminAfterChange?.mustChangePassword === false, 'A flag de primeiro acesso não foi desativada após a troca.');

  const revokedForcedSession = await request('/admin', {}, jar, forcedOldCookie);
  assert(revokedForcedSession.response.status === 302, 'A sessão antiga do primeiro acesso continuou válida após a troca.');
  assert(locationOf(revokedForcedSession.response) === '/admin/login', 'A sessão antiga foi redirecionada para uma rota inesperada.');

  const forcedOldPasswordLogin = await request('/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({ username: secondaryTestUsername, password: secondaryPassword })
  }, jar);
  assert(locationOf(forcedOldPasswordLogin.response) === '/admin/login?error=invalid', 'A senha temporária continuou válida após a troca.');

  const forcedNewPasswordLogin = await request('/api/admin/login', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: formBody({ username: secondaryTestUsername, password: forcedUpdatedPassword })
  }, jar);
  assert(locationOf(forcedNewPasswordLogin.response) === '/admin', 'O acesso normal não foi liberado após a troca obrigatória.');
  const forcedNewCookie = cookieHeader(jar);
  const forcedLogout = await request('/api/admin/logout', { method: 'POST' }, jar);
  assert(locationOf(forcedLogout.response) === '/admin/login', 'Sair não redirecionou para o login no primeiro acesso.');
  const forcedAfterLogout = await request('/admin', {}, jar, forcedNewCookie);
  assert(forcedAfterLogout.response.status === 302, 'A sessão do primeiro acesso continuou válida após Sair.');

  const originalTtl = process.env.ADMIN_SESSION_TTL_SECONDS;
  process.env.ADMIN_SESSION_TTL_SECONDS = '1';
  const expiringSession = await createAdminSession(temporaryAdmin.id);
  await new Promise((resolve) => setTimeout(resolve, 1_200));
  assert((await resolveAdminSession(expiringSession.token)) === null, 'Uma sessão expirada continuou válida.');
  process.env.ADMIN_SESSION_TTL_SECONDS = originalTtl;

  console.log('Teste de autenticação administrativa concluído: proteção de rotas, login, sessão persistida, logout, primeiro acesso com troca obrigatória, revogação, troca de senha, HttpOnly e expiração validados.');
} catch (error) {
  const message = error instanceof Error ? error.message : 'Falha desconhecida no teste de autenticação.';
  console.error(`Teste de autenticação administrativa falhou: ${message}`);
  process.exitCode = 1;
} finally {
  await stopServer(server);
  const temporaryAdmins = [temporaryAdmin, secondaryTemporaryAdmin].filter(
    (admin): admin is { id: string } => Boolean(admin)
  );
  if (temporaryAdmins.length > 0) {
    try {
      const database = getDatabase();
      for (const admin of temporaryAdmins) {
        await revokeAllAdminSessions(admin.id);
        await database.delete(adminSessions).where(eq(adminSessions.adminId, admin.id));
        await database.delete(admins).where(eq(admins.id, admin.id));
        const leftovers = await database
          .select({ id: admins.id })
          .from(admins)
          .where(eq(admins.id, admin.id));
        assert(leftovers.length === 0, 'Um administrador temporário não foi removido.');
      }
    } catch (error) {
      console.error('Não foi possível limpar completamente os dados temporários do teste.');
      process.exitCode = 1;
    }
  }

  if (originalSessionSecret === undefined) delete process.env.ADMIN_SESSION_SECRET;
  else process.env.ADMIN_SESSION_SECRET = originalSessionSecret;
  if (originalSessionTtl === undefined) delete process.env.ADMIN_SESSION_TTL_SECONDS;
  else process.env.ADMIN_SESSION_TTL_SECONDS = originalSessionTtl;
}
