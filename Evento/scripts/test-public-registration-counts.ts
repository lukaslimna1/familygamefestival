import { existsSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { createCompetitionStatusResponse } from '../src/pages/api/inscricoes/[competition]/status';

const projectDirectory = resolve(process.cwd());
const localEnvFile = join(projectDirectory, '.env.local');
if (existsSync(localEnvFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(localEnvFile);

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const forbiddenPublicFields = [
  'registered',
  'registeredCount',
  'registrationCount',
  'spotsTaken',
  'remaining',
  'remainingSlots',
  'availableSlots',
  'participantCount'
];
const checkedCompetitions: Array<Record<string, unknown>> = [];
for (const competitionSlug of ['tekken-8', 'cosplay', 'k-pop-individual']) {
  const response = await createCompetitionStatusResponse(competitionSlug);
  assertCondition(response.status === 200, `API: status HTTP inesperado para ${competitionSlug}: ${response.status}.`);

  const body = await response.json() as {
    data?: {
      registration?: Record<string, unknown>;
    };
  };
  const registration = body.data?.registration;
  assertCondition(registration, `API: resposta sem status público de inscrição para ${competitionSlug}.`);

  for (const field of forbiddenPublicFields) {
    assertCondition(!(field in registration), `API: campo de ocupação exposto publicamente em ${competitionSlug}: ${field}.`);
  }

  assertCondition(typeof registration.capacity === 'number' && registration.capacity > 0, `API: capacidade máxima pública ausente ou inválida em ${competitionSlug}.`);
  assertCondition(typeof registration.full === 'boolean', `API: status de lotação inválido em ${competitionSlug}.`);
  assertCondition(typeof registration.onlineOpen === 'boolean', `API: status de abertura inválido em ${competitionSlug}.`);
  checkedCompetitions.push({
    competition: competitionSlug,
    publicFields: Object.keys(registration).sort(),
    capacity: registration.capacity,
    full: registration.full,
    onlineOpen: registration.onlineOpen
  });
}

console.log(JSON.stringify({ status: 'ok', competitions: checkedCompetitions }, null, 2));
