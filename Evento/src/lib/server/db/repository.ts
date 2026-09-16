import { z } from 'zod';
import competitionDefinitions from '../../../config/competitions.json';
import { eq } from 'drizzle-orm';
import { getDatabase } from './client';
import { competitions, consents, cosplayEntries, guardians, minorAuthorizations, participants, registrations } from './schema';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth deve usar o formato AAAA-MM-DD.');
const consentInput = z.object({
  type: z.enum(['competition_regulation', 'image_use']),
  granted: z.literal(true),
  policyVersion: z.string().trim().min(1).max(40)
});

export const registrationDraftSchema = z.object({
  participant: z.object({
    fullName: z.string().trim().min(3).max(160),
    cpf: z.string().trim().min(11).max(14),
    phone: z.string().trim().min(8).max(30),
    email: z.string().trim().email().max(254),
    dateOfBirth: isoDate
  }),
  competitionId: z.string().trim().min(1).max(80),
  consents: z.array(consentInput).min(2),
  guardian: z.object({
    fullName: z.string().trim().min(3).max(160),
    cpf: z.string().trim().min(11).max(14),
    phone: z.string().trim().min(8).max(30),
    email: z.string().trim().email().max(254),
    relationship: z.string().trim().min(2).max(80)
  }).optional(),
  cosplay: z.object({
    stageName: z.string().trim().max(160).optional(),
    characterName: z.string().trim().min(1).max(160),
    sourceWork: z.string().trim().min(1).max(160),
    presentationType: z.string().trim().min(1).max(80),
    presentationDescription: z.string().trim().max(5000).optional(),
    musicTitle: z.string().trim().max(200).optional()
  }).optional()
}).strict();

export type RegistrationDraft = z.infer<typeof registrationDraftSchema>;

const competitionById = new Map(competitionDefinitions.map((competition) => [competition.id, competition]));

function createPublicRegistrationCode(prefix: string, registrationId: string) {
  return `${prefix}-${registrationId.replaceAll('-', '').slice(0, 10).toUpperCase()}`;
}

/**
 * Persiste o cadastro e os consentimentos no Turso antes de qualquer chamada
 * ao Google Drive. A sincronização de arquivos será uma etapa posterior e
 * deverá trabalhar sobre o registrationId retornado aqui.
 */
export async function createRegistrationDraft(input: RegistrationDraft) {
  const draft = registrationDraftSchema.parse(input);
  const database = getDatabase();
  const competitionDefinition = competitionById.get(draft.competitionId);
  if (!competitionDefinition) {
    throw new Error('Competição não cadastrada na configuração oficial do evento.');
  }

  const [competition] = await database
    .select({ id: competitions.id })
    .from(competitions)
    .where(eq(competitions.id, draft.competitionId))
    .limit(1);
  if (!competition) {
    throw new Error('Competição ainda não foi sincronizada com o banco do evento.');
  }

  const participantId = crypto.randomUUID();
  const registrationId = crypto.randomUUID();
  const publicCode = createPublicRegistrationCode(competitionDefinition.registrationPrefix, registrationId);
  const now = new Date().toISOString();

  await database.transaction(async (transaction) => {
    await transaction.insert(participants).values({
      id: participantId,
      fullName: draft.participant.fullName,
      cpf: draft.participant.cpf,
      phone: draft.participant.phone,
      email: draft.participant.email,
      dateOfBirth: draft.participant.dateOfBirth
    });

    await transaction.insert(registrations).values({
      id: registrationId,
      participantId,
      competitionId: draft.competitionId,
      status: 'pending',
      source: 'online',
      driveSyncStatus: 'drive_pending',
      publicCode,
      eventAccessIncluded: competitionDefinition.competitorTicketIncludesEventAccess,
      submittedAt: now
    });

    await transaction.insert(consents).values(draft.consents.map((consent) => ({
      id: crypto.randomUUID(),
      registrationId,
      consentType: consent.type,
      granted: consent.granted,
      policyVersion: consent.policyVersion,
      grantedAt: now
    })));

    if (draft.guardian) {
      const guardianId = crypto.randomUUID();
      await transaction.insert(guardians).values({
        id: guardianId,
        participantId,
        fullName: draft.guardian.fullName,
        cpf: draft.guardian.cpf,
        phone: draft.guardian.phone,
        email: draft.guardian.email,
        relationship: draft.guardian.relationship
      });
      await transaction.insert(minorAuthorizations).values({
        id: crypto.randomUUID(),
        registrationId,
        guardianId,
        status: 'pending'
      });
    }

    if (draft.cosplay) {
      await transaction.insert(cosplayEntries).values({
        id: crypto.randomUUID(),
        registrationId,
        stageName: draft.cosplay.stageName,
        characterName: draft.cosplay.characterName,
        sourceWork: draft.cosplay.sourceWork,
        presentationType: draft.cosplay.presentationType,
        presentationDescription: draft.cosplay.presentationDescription,
        musicTitle: draft.cosplay.musicTitle
      });
    }
  });

  return {
    participantId,
    registrationId,
    publicCode,
    eventAccessIncluded: competitionDefinition.competitorTicketIncludesEventAccess,
    driveSyncStatus: 'drive_pending' as const
  };
}
