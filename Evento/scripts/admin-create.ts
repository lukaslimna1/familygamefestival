import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createAdminAccount, isValidAdminUsername, normalizeAdminUsername } from '../src/lib/server/auth/admin-repository';
import { hashAdminPassword } from '../src/lib/server/auth/password';

const scriptDirectory = fileURLToPath(new URL('.', import.meta.url));
const projectDirectory = join(scriptDirectory, '..');
const localEnvFile = join(projectDirectory, '.env.local');

if (existsSync(localEnvFile) && typeof process.loadEnvFile === 'function') {
  process.loadEnvFile(localEnvFile);
}

async function readHidden(prompt: string) {
  if (!stdin.isTTY || !stdout.isTTY || typeof stdin.setRawMode !== 'function') {
    throw new Error('A criação do administrador precisa ser executada em um terminal interativo que permita ocultar a senha.');
  }

  stdout.write(prompt);
  return new Promise<string>((resolve, reject) => {
    let value = '';
    let finished = false;

    const cleanup = () => {
      if (finished) return;
      finished = true;
      stdin.setRawMode?.(false);
      stdin.pause();
      stdin.removeListener('data', onData);
      stdout.write('\n');
    };

    const onData = (chunk: Buffer | string) => {
      for (const character of String(chunk)) {
        if (character === '\u0003') {
          cleanup();
          reject(new Error('Operação cancelada.'));
          return;
        }
        if (character === '\r' || character === '\n') {
          cleanup();
          resolve(value);
          return;
        }
        if (character === '\u0008' || character === '\u007f') {
          value = value.slice(0, -1);
          continue;
        }
        value += character;
      }
    };

    stdin.setRawMode!(true);
    stdin.resume();
    stdin.on('data', onData);
  });
}

const readline = createInterface({ input: stdin, output: stdout });

try {
  const displayName = (await readline.question('Nome de exibição: ')).trim();
  const usernameInput = (await readline.question('Usuário/login: ')).trim();

  const username = normalizeAdminUsername(usernameInput);
  if (!displayName || !isValidAdminUsername(username)) {
    throw new Error('Nome ou usuário inválido. O usuário deve ter de 3 a 60 caracteres minúsculos, números, ponto, hífen ou sublinhado.');
  }

  const forcePasswordChangeInput = (await readline.question('Forçar troca de senha no primeiro acesso? (s/N): ')).trim().toLowerCase();
  const acceptedAnswers = ['s', 'sim', 'y', 'yes', 'n', 'nao', 'não', 'no'];
  if (forcePasswordChangeInput && !acceptedAnswers.includes(forcePasswordChangeInput)) {
    throw new Error('Responda com s ou n para a troca obrigatória no primeiro acesso.');
  }
  const mustChangePassword = ['s', 'sim', 'y', 'yes'].includes(forcePasswordChangeInput);
  readline.close();

  const password = await readHidden('Senha (mínimo de 12 caracteres): ');
  const confirmation = await readHidden('Confirme a senha: ');
  if (password !== confirmation) throw new Error('As senhas não coincidem.');

  const passwordHash = await hashAdminPassword(password);
  const admin = await createAdminAccount({ displayName, username, passwordHash, mustChangePassword });
  console.log(`Administrador criado com sucesso para o usuário ${admin.username}.`);
} catch (error) {
  readline.close();
  const message = error instanceof Error ? error.message : 'Não foi possível criar o administrador.';
  console.error(message);
  process.exitCode = 1;
}
