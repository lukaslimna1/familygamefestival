import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { getRegistrationWindowStatus, isOnlineRegistrationOpen, ONLINE_REGISTRATION_CLOSED_NOTICE, ONLINE_REGISTRATION_OPEN_NOTICE, ONLINE_REGISTRATION_DEADLINE_ISO, REGISTRATION_TIME_ZONE } from '../src/config/registration-deadline';
import { registrationDeadline } from '../src/lib/registration';
import { createCompetitionStatusResponse } from '../src/pages/api/inscricoes/[competition]/status';

const projectDirectory = resolve(process.cwd());
const localEnvFile = join(projectDirectory, '.env.local');
if (existsSync(localEnvFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(localEnvFile);

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const checks = [
  { label: '18/09/2026 23:58', now: new Date('2026-09-18T23:58:00-03:00'), open: true },
  { label: '18/09/2026 23:59', now: new Date('2026-09-18T23:59:00-03:00'), open: true },
  { label: '19/09/2026 00:00', now: new Date('2026-09-19T00:00:00-03:00'), open: false }
];

assertCondition(REGISTRATION_TIME_ZONE === 'America/Sao_Paulo', 'O prazo não está configurado em America/Sao_Paulo.');
assertCondition(registrationDeadline.iso === ONLINE_REGISTRATION_DEADLINE_ISO, 'O frontend não usa a fonte única do prazo online.');

const frontendResults = checks.map((check) => ({ label: check.label, open: isOnlineRegistrationOpen(check.now) }));
for (const [index, check] of checks.entries()) {
  const status = getRegistrationWindowStatus(check.now);
  assertCondition(status.open === check.open && frontendResults[index]?.open === check.open, `Frontend: resultado incorreto em ${check.label}.`);
  assertCondition(status.message === (check.open ? ONLINE_REGISTRATION_OPEN_NOTICE : ONLINE_REGISTRATION_CLOSED_NOTICE), `Mensagem incorreta em ${check.label}.`);
}

const apiResults: Array<{ label: string; status: number; open: boolean }> = [];
for (const check of checks) {
  const response = await createCompetitionStatusResponse('tekken-8', check.now);
  assertCondition(response.status === 200, `API: status HTTP inesperado em ${check.label}: ${response.status}.`);
  const body = await response.json() as { data?: { registration?: { onlineOpen?: boolean; deadlineLabel?: string; onlineMessage?: string } } };
  const registration = body.data?.registration;
  assertCondition(registration, `API: resposta sem status de inscrição em ${check.label}.`);
  assertCondition(registration.onlineOpen === check.open, `API: resultado incorreto em ${check.label}.`);
  assertCondition(registration.deadlineLabel?.includes('18/09/2026 · 23:59') === true, `API: rótulo incorreto em ${check.label}.`);
  assertCondition(registration.onlineMessage === (check.open ? ONLINE_REGISTRATION_OPEN_NOTICE : ONLINE_REGISTRATION_CLOSED_NOTICE), `API: mensagem incorreta em ${check.label}.`);
  apiResults.push({ label: check.label, status: response.status, open: registration.onlineOpen });
}

console.log(JSON.stringify({ status: 'ok', timezone: REGISTRATION_TIME_ZONE, deadline: registrationDeadline, frontend: frontendResults, api: apiResults }, null, 2));
