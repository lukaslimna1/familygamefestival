import { existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { and, eq } from 'drizzle-orm';
import { getDatabase } from '../src/lib/server/db/client';
import { consents as consentRows, guardians, minorAuthorizations, participants, registrationFiles, registrationLinks, registrations } from '../src/lib/server/db/schema';
import { createRegistrationDraft, getRegistrationDetails } from '../src/lib/server/db/repository';

const projectDirectory = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const localEnvFile = join(projectDirectory, '.env.local');
if (existsSync(localEnvFile) && typeof process.loadEnvFile === 'function') process.loadEnvFile(localEnvFile);

const database = getDatabase();
const runId = `${Date.now()}${Math.floor(Math.random() * 1000)}`;
const participantCpf = `8${runId.slice(-10)}`;
const guardianCpf = `6${runId.slice(-10)}`;
const registrationIds: string[] = [];
let participantId = '';

function assertCondition(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

const common = {
  fullName: 'TESTE AUTORIZACAO UNIVERSAL - REMOVER',
  dateOfBirth: '2012-01-01',
  cpf: participantCpf,
  phone: '+5514999991000',
  email: `universal-${runId}@example.invalid`,
  city: 'Bauru',
  state: 'SP'
};

const guardian = {
  fullName: 'RESPONSAVEL UNIVERSAL - REMOVER',
  cpf: guardianCpf,
  phone: '+5514999991001',
  email: `universal-guardian-${runId}@example.invalid`,
  relationship: 'Responsável legal'
};

const consents = [
  { type: 'competition_regulation' as const, granted: true as const, policyVersion: 'games-general-2026-v1' },
  { type: 'image_use' as const, granted: true as const, policyVersion: 'image-use-2026-v1' }
];

async function createMinor(competitionId: string, authorizationCompetitionIds?: string[]) {
  const created = await createRegistrationDraft({
    participant: common,
    competitionId,
    authorizationCompetitionIds,
    guardian,
    consents
  });
  registrationIds.push(created.registrationId);
  participantId = created.participantId;
  return created;
}

async function cleanup() {
  if (participantId) {
    const authorizationIds = await database
      .select({ id: minorAuthorizations.id })
      .from(minorAuthorizations)
      .where(eq(minorAuthorizations.participantId, participantId));
    for (const authorization of authorizationIds) {
      await database.delete(minorAuthorizations).where(eq(minorAuthorizations.id, authorization.id));
    }
  }
  for (const registrationId of registrationIds) {
    await database.delete(registrationFiles).where(eq(registrationFiles.registrationId, registrationId));
    await database.delete(registrationLinks).where(eq(registrationLinks.registrationId, registrationId));
    await database.delete(consentRows).where(eq(consentRows.registrationId, registrationId));
    await database.delete(registrations).where(eq(registrations.id, registrationId));
  }
  if (participantId) {
    await database.delete(guardians).where(eq(guardians.participantId, participantId));
    await database.delete(participants).where(eq(participants.id, participantId));
  }
}

let result: Record<string, unknown> | undefined;
try {
  const first = await createMinor('street-fighter-6', ['street-fighter-6', 'fc-2026']);
  const firstDetails = await getRegistrationDetails(first.registrationId);
  assertCondition(firstDetails?.minorAuthorization?.version === 1, 'A primeira autorização não iniciou na versão 1.');
  assertCondition(firstDetails.minorAuthorization.competitionIds.includes('fc-2026'), 'A primeira autorização não preservou a competição adicional escolhida.');

  const second = await createMinor('fc-2026');
  const secondDetails = await getRegistrationDetails(second.registrationId);
  assertCondition(secondDetails?.minorAuthorizationHistory.length === 1, 'Uma competição já coberta criou autorização duplicada.');

  await database.update(minorAuthorizations).set({
    status: 'uploaded',
    signedDriveFileId: 'drive-signed-test',
    uploadedAt: new Date().toISOString()
  }).where(and(eq(minorAuthorizations.participantId, participantId), eq(minorAuthorizations.version, 1)));

  const third = await createMinor('tekken-8');
  const thirdDetails = await getRegistrationDetails(third.registrationId);
  assertCondition(thirdDetails?.minorAuthorization?.version === 2, 'Uma nova competição fora da cobertura não criou nova versão.');
  assertCondition(thirdDetails.minorAuthorization.status === 'pending', 'A nova versão não voltou para pendente.');
  assertCondition(thirdDetails.minorAuthorization.competitionIds.includes('street-fighter-6') && thirdDetails.minorAuthorization.competitionIds.includes('fc-2026') && thirdDetails.minorAuthorization.competitionIds.includes('tekken-8'), 'A nova versão não preservou o histórico de competições autorizadas.');
  assertCondition(thirdDetails.minorAuthorizationHistory.some((version) => version.version === 1 && version.status === 'uploaded'), 'A versão assinada anterior não foi preservada.');

  result = {
    status: 'ok',
    reusedSignedCoverage: true,
    expandedPendingAuthorization: true,
    createdNewVersion: true,
    historyPreserved: true
  };
} finally {
  await cleanup();
}

console.log(JSON.stringify(result, null, 2));
