import { randomBytes, randomUUID } from 'node:crypto';
import { and, desc, eq, ne, sql } from 'drizzle-orm';
import { z } from 'zod';
import competitionDefinitions from '../../../config/competitions.json';
import {
  calculateAge,
  getCompetitionDefinition,
  getCompetitionDefinitionBySlug,
  getRegistrationCapacity,
  getRegistrationWindowStatus,
  isValidCpf,
  normalizeCpf
} from '../registration/config';
import { getDatabase } from './client';
import {
  competitions,
  consents,
  cosplayEntries,
  guardians,
  minorAuthorizations,
  participants,
  registrationFiles,
  registrationLinks,
  registrations
} from './schema';

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'dateOfBirth deve usar o formato AAAA-MM-DD.');
const consentInput = z.object({
  type: z.enum(['competition_regulation', 'image_use', 'pendrive_backup']),
  granted: z.literal(true),
  policyVersion: z.string().trim().min(1).max(80)
});
const linkInput = z.object({
  label: z.string().trim().min(1).max(80),
  url: z.string().trim().url().max(2048)
});

export const registrationDraftSchema = z.object({
  participant: z.object({
    fullName: z.string().trim().min(3).max(160),
    cpf: z.string().trim().min(11).max(18),
    phone: z.string().trim().min(8).max(30).optional(),
    email: z.string().trim().email().max(254).optional(),
    dateOfBirth: isoDate,
    city: z.string().trim().min(2).max(120),
    state: z.string().trim().min(2).max(80),
    instagram: z.string().trim().max(240).optional(),
    tiktok: z.string().trim().max(240).optional(),
    facebook: z.string().trim().max(240).optional(),
    otherSocials: z.string().trim().max(1000).optional()
  }),
  competitionId: z.string().trim().min(1).max(80),
  authorizationCompetitionIds: z.array(z.string().trim().min(1).max(80)).max(16).optional(),
  links: z.array(linkInput).max(10).optional(),
  consents: z.array(consentInput).min(2).max(3),
  guardian: z.object({
    fullName: z.string().trim().min(3).max(160),
    cpf: z.string().trim().min(11).max(18),
    phone: z.string().trim().min(8).max(30),
    email: z.string().trim().email().max(254),
    relationship: z.string().trim().min(2).max(80)
  }).optional(),
  cosplay: z.object({
    stageName: z.string().trim().max(160).optional(),
    stageCallName: z.string().trim().min(1).max(160),
    characterName: z.string().trim().min(1).max(160),
    sourceWork: z.string().trim().min(1).max(160),
    presentationType: z.string().trim().min(1).max(80).default('Apresentação individual'),
    cosplayDescription: z.string().trim().max(5000).optional(),
    presentationDescription: z.string().trim().max(5000).optional(),
    presentationNotes: z.string().trim().max(5000).optional(),
    technicalNotes: z.string().trim().max(5000).optional(),
    judgeNotes: z.string().trim().max(5000).optional(),
    musicTitle: z.string().trim().max(200).optional(),
    links: z.array(linkInput).max(10).optional()
  }).optional()
}).strict();

export type RegistrationDraft = z.infer<typeof registrationDraftSchema>;

export class RegistrationError extends Error {
  constructor(
    public readonly code: 'online_closed' | 'full' | 'invalid' | 'duplicate' | 'unavailable',
    message: string
  ) {
    super(message);
    this.name = 'RegistrationError';
  }
}

const competitionById = new Map(competitionDefinitions.map((competition) => [competition.id, competition]));
const competitionBySlug = new Map(competitionDefinitions.map((competition) => [competition.slug, competition]));

function createPublicRegistrationCode(prefix: string) {
  return `${prefix}-${randomBytes(3).toString('hex').toUpperCase()}`;
}

function isUniquePublicCodeError(error: unknown) {
  const message = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return message.includes('public_code') || message.includes('registrations_public_code_unique');
}

function validateCpf(value: string, label: string) {
  const normalized = normalizeCpf(value);
  if (!isValidCpf(normalized)) throw new RegistrationError('invalid', `${label} deve conter 11 dígitos.`);
  return normalized;
}

function normalizeOptional(value: string | undefined) {
  const normalized = value?.trim();
  return normalized || undefined;
}

function parseAuthorizationCompetitionIds(value: string | null | undefined) {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === 'string' && competitionById.has(id));
  } catch {
    return [];
  }
}

function serializeAuthorizationCompetitionIds(ids: string[]) {
  return JSON.stringify([...new Set(ids)].filter((id) => competitionById.has(id)));
}

function isSignedAuthorizationStatus(status: string) {
  return status === 'uploaded' || status === 'received';
}

function ensureValidReferenceLinks(links: Array<{ label: string; url: string }> | undefined) {
  if (!links) return [];
  return links.map((link) => {
    const url = new URL(link.url);
    if (!['http:', 'https:'].includes(url.protocol)) {
      throw new RegistrationError('invalid', 'Os links de referência devem usar http ou https.');
    }
    return { label: link.label.trim(), url: url.toString() };
  });
}

function validateDraftBusinessRules(draft: RegistrationDraft, competitionDefinition: NonNullable<ReturnType<typeof getCompetitionDefinition>>) {
  const age = calculateAge(draft.participant.dateOfBirth);
  if (!Number.isInteger(age) || age < 0 || age > 120) {
    throw new RegistrationError('invalid', 'Informe uma data de nascimento válida.');
  }

  if (age < 18 && !draft.guardian) {
    throw new RegistrationError('invalid', 'Os dados do responsável são obrigatórios para menores de 18 anos.');
  }
  if (age >= 18 && draft.guardian) {
    throw new RegistrationError('invalid', 'Os dados do responsável só devem ser informados para menores de 18 anos.');
  }

  const authorizationCompetitionIds = draft.authorizationCompetitionIds ?? [draft.competitionId];
  if (draft.guardian && (!authorizationCompetitionIds.includes(draft.competitionId) || authorizationCompetitionIds.some((id) => !competitionById.has(id)))) {
    throw new RegistrationError('invalid', 'A autorização do responsável contém uma competição inválida ou não inclui a inscrição atual.');
  }
  if (!draft.guardian && draft.authorizationCompetitionIds?.length) {
    throw new RegistrationError('invalid', 'Competições de autorização só podem ser informadas para participantes menores de idade.');
  }

  const consentTypes = new Set(draft.consents.filter((consent) => consent.granted).map((consent) => consent.type));
  if (!consentTypes.has('competition_regulation') || !consentTypes.has('image_use')) {
    throw new RegistrationError('invalid', 'É necessário aceitar o regulamento e autorizar o uso de imagem.');
  }
  if (competitionDefinition.type === 'cosplay') {
    if (!draft.cosplay) throw new RegistrationError('invalid', 'Os dados do Cosplay são obrigatórios.');
    if (!consentTypes.has('pendrive_backup')) {
      throw new RegistrationError('invalid', 'É necessário confirmar a ciência sobre o backup em pendrive.');
    }
  } else if (draft.cosplay) {
    throw new RegistrationError('invalid', 'Dados de Cosplay não pertencem a esta competição.');
  } else if (consentTypes.has('pendrive_backup')) {
    throw new RegistrationError('invalid', 'O aceite de backup em pendrive é exclusivo do Cosplay.');
  }
}

async function getCompetitionRow(competitionId: string) {
  const [competition] = await getDatabase()
    .select({
      id: competitions.id,
      title: competitions.title,
      category: competitions.category,
      eventDay: competitions.eventDay,
      eventDate: competitions.eventDate,
      startTime: competitions.startTime,
      maxParticipants: competitions.maxParticipants
    })
    .from(competitions)
    .where(eq(competitions.id, competitionId))
    .limit(1);
  return competition;
}

export async function getCompetitionRegistrationStatus(competitionId: string, now = new Date()) {
  const definition = competitionById.get(competitionId);
  const competition = await getCompetitionRow(competitionId);
  if (!definition || !competition) return null;

  const [countRow] = await getDatabase()
    .select({ count: sql<number>`count(*)` })
    .from(registrations)
    .where(and(
      eq(registrations.competitionId, competitionId),
      ne(registrations.status, 'cancelled')
    ));
  const registered = Number(countRow?.count ?? 0);
  const capacity = getRegistrationCapacity(competition.maxParticipants, definition.maxParticipants);
  const window = getRegistrationWindowStatus(now);

  return {
    competition,
    definition,
    registered,
    capacity,
    remaining: Math.max(0, capacity - registered),
    full: registered >= capacity,
    onlineOpen: window.open,
    deadlineLabel: window.deadlineLabel,
    deadline: window.deadline,
    onlineMessage: window.message
  };
}

/**
 * Persiste os dados comuns e os dados específicos da modalidade em uma
 * transação. O INSERT condicional da inscrição também protege a capacidade
 * no backend: a linha só é criada enquanto a contagem ativa estiver abaixo
 * do limite configurado.
 */
export async function createRegistrationDraft(input: RegistrationDraft) {
  let draft: RegistrationDraft;
  try {
    draft = registrationDraftSchema.parse(input);
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : undefined;
    throw new RegistrationError('invalid', message || 'Os dados da inscrição são inválidos.');
  }
  const participantCpf = validateCpf(draft.participant.cpf, 'O CPF do participante');
  const guardianCpf = draft.guardian ? validateCpf(draft.guardian.cpf, 'O CPF do responsável') : undefined;
  const competitionDefinition = competitionById.get(draft.competitionId);
  const competition = await getCompetitionRow(draft.competitionId);

  if (!competitionDefinition || !competition) {
    throw new RegistrationError('invalid', 'Competição não cadastrada na configuração oficial do evento.');
  }
  validateDraftBusinessRules(draft, competitionDefinition);

  const registrationStatus = await getCompetitionRegistrationStatus(draft.competitionId);
  if (!registrationStatus) throw new RegistrationError('unavailable', 'Não foi possível consultar a competição.');
  if (!registrationStatus.onlineOpen) {
    throw new RegistrationError('online_closed', 'Inscrições online encerradas.');
  }
  if (registrationStatus.full) {
    throw new RegistrationError('full', 'Vagas preenchidas.');
  }

  const database = getDatabase();
  const [existingParticipant] = await database
    .select({
      id: participants.id,
      fullName: participants.fullName,
      phone: participants.phone,
      email: participants.email,
      dateOfBirth: participants.dateOfBirth,
      city: participants.city,
      state: participants.state
    })
    .from(participants)
    .where(eq(participants.cpf, participantCpf))
    .limit(1);
  const [existingGuardian] = existingParticipant
    ? await database
      .select({ id: guardians.id, fullName: guardians.fullName, cpf: guardians.cpf, phone: guardians.phone, email: guardians.email, relationship: guardians.relationship })
      .from(guardians)
      .where(eq(guardians.participantId, existingParticipant.id))
      .limit(1)
    : [];
  const authorizationVersions = existingParticipant
    ? await database
      .select({
        id: minorAuthorizations.id,
        registrationId: minorAuthorizations.registrationId,
        participantId: minorAuthorizations.participantId,
        guardianId: minorAuthorizations.guardianId,
        version: minorAuthorizations.version,
        competitionIds: minorAuthorizations.competitionIds,
        status: minorAuthorizations.status,
        deliveryType: minorAuthorizations.deliveryType
      })
      .from(minorAuthorizations)
      .where(eq(minorAuthorizations.participantId, existingParticipant.id))
      .orderBy(desc(minorAuthorizations.version))
    : [];
  const latestAuthorization = authorizationVersions[0];
  const latestAuthorizationCompetitionIds = parseAuthorizationCompetitionIds(latestAuthorization?.competitionIds);
  const requestedAuthorizationCompetitionIds = draft.authorizationCompetitionIds ?? [draft.competitionId];
  const authorizationAlreadyCoversCompetition = Boolean(
    latestAuthorization && latestAuthorizationCompetitionIds.includes(draft.competitionId)
  );
  const shouldCreateAuthorizationVersion = Boolean(
    draft.guardian && (!latestAuthorization || (isSignedAuthorizationStatus(latestAuthorization.status) && !authorizationAlreadyCoversCompetition))
  );
  if (existingParticipant && (
    existingParticipant.fullName !== draft.participant.fullName ||
    existingParticipant.phone !== draft.participant.phone ||
    existingParticipant.email !== draft.participant.email ||
    existingParticipant.dateOfBirth !== draft.participant.dateOfBirth ||
    existingParticipant.city !== draft.participant.city ||
    existingParticipant.state !== draft.participant.state
  )) {
    throw new RegistrationError('duplicate', 'O CPF já está cadastrado com dados diferentes. Procure a organização para corrigir a inscrição.');
  }
  if (existingGuardian && draft.guardian && (
    existingGuardian.cpf !== guardianCpf ||
    existingGuardian.fullName !== draft.guardian.fullName ||
    existingGuardian.phone !== draft.guardian.phone ||
    existingGuardian.email !== draft.guardian.email ||
    existingGuardian.relationship !== draft.guardian.relationship
  )) {
    throw new RegistrationError('duplicate', 'O responsável deste CPF já está cadastrado com dados diferentes.');
  }

  const participantId = existingParticipant?.id ?? randomUUID();
  const registrationId = randomUUID();
  const capacity = registrationStatus.capacity;
  const now = new Date().toISOString();
  const links = ensureValidReferenceLinks(draft.links ?? draft.cosplay?.links);

  for (let codeAttempt = 0; codeAttempt < 5; codeAttempt += 1) {
    const publicCode = createPublicRegistrationCode(competitionDefinition.registrationPrefix);
    try {
      await database.transaction(async (transaction) => {
        if (!existingParticipant) {
          await transaction.insert(participants).values({
            id: participantId,
            fullName: draft.participant.fullName,
            cpf: participantCpf,
            phone: draft.participant.phone || '',
            email: draft.participant.email || '',
            dateOfBirth: draft.participant.dateOfBirth,
            city: draft.participant.city,
            state: draft.participant.state,
            instagram: normalizeOptional(draft.participant.instagram),
            tiktok: normalizeOptional(draft.participant.tiktok),
            facebook: normalizeOptional(draft.participant.facebook),
            otherSocials: normalizeOptional(draft.participant.otherSocials)
          });
        }

        await transaction.run(sql`
          INSERT INTO registrations (
            id, participant_id, competition_id, status, source,
            drive_sync_status, public_code, event_access_included, submitted_at
          )
          SELECT
            ${registrationId}, ${participantId}, ${draft.competitionId}, 'pending', 'online',
            'drive_pending', ${publicCode}, ${competitionDefinition.competitorTicketIncludesEventAccess ? 1 : 0}, ${now}
          WHERE (
            SELECT COUNT(*)
            FROM registrations
            WHERE competition_id = ${draft.competitionId}
              AND status <> 'cancelled'
          ) < ${capacity}
        `);

        const [createdRegistration] = await transaction
          .select({ id: registrations.id })
          .from(registrations)
          .where(eq(registrations.id, registrationId))
          .limit(1);
        if (!createdRegistration) throw new RegistrationError('full', 'Vagas preenchidas.');

        await transaction.insert(consents).values(draft.consents.map((consent) => ({
          id: randomUUID(),
          registrationId,
          consentType: consent.type,
          granted: consent.granted,
          policyVersion: consent.policyVersion,
          grantedAt: now
        })));

        if (draft.guardian && guardianCpf) {
          const guardianId = existingGuardian?.id ?? randomUUID();
          if (!existingGuardian) {
          await transaction.insert(guardians).values({
              id: guardianId,
              participantId,
              fullName: draft.guardian.fullName,
              cpf: guardianCpf,
              phone: draft.guardian.phone,
              email: draft.guardian.email,
              relationship: draft.guardian.relationship
            });
          }
          if (shouldCreateAuthorizationVersion) {
            const nextVersion = (latestAuthorization?.version ?? 0) + 1;
            const competitionIds = latestAuthorization
              ? [...latestAuthorizationCompetitionIds, ...requestedAuthorizationCompetitionIds, draft.competitionId]
              : [...requestedAuthorizationCompetitionIds, draft.competitionId];
            await transaction.insert(minorAuthorizations).values({
              id: randomUUID(),
              registrationId,
              participantId,
              guardianId,
              version: nextVersion,
              competitionIds: serializeAuthorizationCompetitionIds(competitionIds),
              status: 'pending',
              deliveryType: null
            });
          } else if (latestAuthorization && !authorizationAlreadyCoversCompetition) {
            await transaction.update(minorAuthorizations).set({
              competitionIds: serializeAuthorizationCompetitionIds([...latestAuthorizationCompetitionIds, ...requestedAuthorizationCompetitionIds, draft.competitionId]),
              status: 'pending',
              deliveryType: null,
              updatedAt: now
            }).where(eq(minorAuthorizations.id, latestAuthorization.id));
          }
        }

        if (draft.cosplay) {
          await transaction.insert(cosplayEntries).values({
            id: randomUUID(),
            registrationId,
            stageName: normalizeOptional(draft.cosplay.stageName),
            stageCallName: draft.cosplay.stageCallName,
            characterName: draft.cosplay.characterName,
            sourceWork: draft.cosplay.sourceWork,
            presentationType: draft.cosplay.presentationType,
            cosplayDescription: draft.cosplay.cosplayDescription,
            presentationDescription: normalizeOptional(draft.cosplay.presentationDescription),
            presentationNotes: normalizeOptional(draft.cosplay.presentationNotes),
            technicalNotes: normalizeOptional(draft.cosplay.technicalNotes),
            judgeNotes: normalizeOptional(draft.cosplay.judgeNotes),
            musicTitle: normalizeOptional(draft.cosplay.musicTitle)
          });

          if (links.length > 0) {
            await transaction.insert(registrationLinks).values(links.map((link) => ({
              id: randomUUID(),
              registrationId,
              label: link.label,
              url: link.url
            })));
          }
        }
      });

      return {
        participantId,
        registrationId,
        publicCode,
        eventAccessIncluded: competitionDefinition.competitorTicketIncludesEventAccess,
        driveSyncStatus: 'drive_pending' as const
      };
    } catch (error) {
      if (isUniquePublicCodeError(error) && codeAttempt < 4) continue;
      if (error instanceof RegistrationError) throw error;
      const message = error instanceof Error ? error.message.toLowerCase() : '';
      if (message.includes('participants_cpf_unique') || message.includes('participants.cpf') || message.includes('registrations_participant_competition_unique')) {
        throw new RegistrationError('duplicate', 'Já existe uma inscrição associada a este CPF.');
      }
      throw new RegistrationError('unavailable', 'Não foi possível salvar a inscrição agora.');
    }
  }

  throw new RegistrationError('unavailable', 'Não foi possível gerar um código público único.');
}

async function getRegistrationById(registrationId: string) {
  const database = getDatabase();
  const [base] = await database
    .select({
      registrationId: registrations.id,
      publicCode: registrations.publicCode,
      status: registrations.status,
      source: registrations.source,
      driveSyncStatus: registrations.driveSyncStatus,
      driveLastError: registrations.driveLastError,
      driveFolderId: registrations.driveFolderId,
      eventAccessIncluded: registrations.eventAccessIncluded,
      submittedAt: registrations.submittedAt,
      registrationCreatedAt: registrations.createdAt,
      registrationUpdatedAt: registrations.updatedAt,
      participantId: participants.id,
      fullName: participants.fullName,
      cpf: participants.cpf,
      phone: participants.phone,
      email: participants.email,
      dateOfBirth: participants.dateOfBirth,
      city: participants.city,
      state: participants.state,
      instagram: participants.instagram,
      tiktok: participants.tiktok,
      facebook: participants.facebook,
      otherSocials: participants.otherSocials,
      competitionId: competitions.id,
      competitionTitle: competitions.title,
      competitionCategory: competitions.category,
      competitionEventDay: competitions.eventDay,
      competitionEventDate: competitions.eventDate,
      competitionStartTime: competitions.startTime,
      competitionMaxParticipants: competitions.maxParticipants,
      competitionFolderId: competitions.driveFolderId
    })
    .from(registrations)
    .innerJoin(participants, eq(registrations.participantId, participants.id))
    .innerJoin(competitions, eq(registrations.competitionId, competitions.id))
    .where(eq(registrations.id, registrationId))
    .limit(1);

  if (!base) return null;

  const [guardian] = await database
    .select({
      id: guardians.id,
      fullName: guardians.fullName,
      cpf: guardians.cpf,
      phone: guardians.phone,
      email: guardians.email,
      relationship: guardians.relationship
    })
    .from(guardians)
    .where(eq(guardians.participantId, base.participantId))
    .limit(1);

  const authorizationRows = await database
    .select({
      id: minorAuthorizations.id,
      registrationId: minorAuthorizations.registrationId,
      participantId: minorAuthorizations.participantId,
      guardianId: minorAuthorizations.guardianId,
      version: minorAuthorizations.version,
      competitionIds: minorAuthorizations.competitionIds,
      status: minorAuthorizations.status,
      driveFileId: minorAuthorizations.driveFileId,
      signedDriveFileId: minorAuthorizations.signedDriveFileId,
      deliveryType: minorAuthorizations.deliveryType,
      requestedAt: minorAuthorizations.requestedAt,
      uploadedAt: minorAuthorizations.uploadedAt,
      receivedAt: minorAuthorizations.receivedAt,
      rejectionReason: minorAuthorizations.rejectionReason
    })
    .from(minorAuthorizations)
    .where(eq(minorAuthorizations.participantId, base.participantId))
    .orderBy(desc(minorAuthorizations.version));
  const authorizationHistory = authorizationRows.map((authorization) => ({
    ...authorization,
    competitionIds: parseAuthorizationCompetitionIds(authorization.competitionIds),
    generatedFileId: authorization.driveFileId,
    coversCurrentCompetition: parseAuthorizationCompetitionIds(authorization.competitionIds).includes(base.competitionId)
  }));
  const minorAuthorization = authorizationHistory[0] ?? null;

  const [cosplay] = await database
    .select({
      id: cosplayEntries.id,
      stageName: cosplayEntries.stageName,
      stageCallName: cosplayEntries.stageCallName,
      characterName: cosplayEntries.characterName,
      sourceWork: cosplayEntries.sourceWork,
      presentationType: cosplayEntries.presentationType,
      cosplayDescription: cosplayEntries.cosplayDescription,
      presentationDescription: cosplayEntries.presentationDescription,
      presentationNotes: cosplayEntries.presentationNotes,
      technicalNotes: cosplayEntries.technicalNotes,
      judgeNotes: cosplayEntries.judgeNotes,
      musicTitle: cosplayEntries.musicTitle,
      updatedAt: cosplayEntries.updatedAt
    })
    .from(cosplayEntries)
    .where(eq(cosplayEntries.registrationId, registrationId))
    .limit(1);

  const files = await database
    .select({
      id: registrationFiles.id,
      fileType: registrationFiles.fileType,
      originalName: registrationFiles.originalName,
      mimeType: registrationFiles.mimeType,
      sizeBytes: registrationFiles.sizeBytes,
      contentHash: registrationFiles.contentHash,
      driveFileId: registrationFiles.driveFileId,
      drivePath: registrationFiles.drivePath,
      authorizationVersion: registrationFiles.authorizationVersion,
      syncStatus: registrationFiles.syncStatus,
      lastError: registrationFiles.lastError,
      createdAt: registrationFiles.createdAt,
      updatedAt: registrationFiles.updatedAt
    })
    .from(registrationFiles)
    .where(eq(registrationFiles.registrationId, registrationId))
    .orderBy(registrationFiles.fileType, desc(registrationFiles.updatedAt));

  const links = await database
    .select({
      id: registrationLinks.id,
      label: registrationLinks.label,
      url: registrationLinks.url,
      createdAt: registrationLinks.createdAt,
      updatedAt: registrationLinks.updatedAt
    })
    .from(registrationLinks)
    .where(eq(registrationLinks.registrationId, registrationId))
    .orderBy(registrationLinks.createdAt);

  const consentRows = await database
    .select({
      type: consents.consentType,
      granted: consents.granted,
      policyVersion: consents.policyVersion,
      grantedAt: consents.grantedAt
    })
    .from(consents)
    .where(eq(consents.registrationId, registrationId))
    .orderBy(consents.grantedAt);

  return {
    ...base,
    guardian: guardian ?? null,
    minorAuthorization,
    minorAuthorizationHistory: authorizationHistory,
    cosplay: cosplay ?? null,
    files,
    links,
    consents: consentRows
  };
}

export type RegistrationDetails = NonNullable<Awaited<ReturnType<typeof getRegistrationById>>>;

export async function getRegistrationDetails(registrationId: string) {
  return getRegistrationById(registrationId);
}

export async function getCompetitionRegistrationStatusBySlug(slug: string, now = new Date()) {
  const definition = competitionBySlug.get(slug) ?? getCompetitionDefinitionBySlug(slug);
  return definition ? getCompetitionRegistrationStatus(definition.id, now) : null;
}

export async function findRegistrationByCredentials(publicCode: string, cpf: string) {
  const normalizedCode = publicCode.trim().toUpperCase();
  const normalizedCpf = normalizeCpf(cpf);
  const knownPrefix = [...competitionById.values()].some((competition) => normalizedCode.startsWith(`${competition.registrationPrefix}-`));
  if (!/^[A-Z0-9]{2,12}-[0-9A-F]{6}$/.test(normalizedCode) || !knownPrefix || !isValidCpf(normalizedCpf)) return null;

  const database = getDatabase();
  const [match] = await database
    .select({ registrationId: registrations.id, cpf: participants.cpf })
    .from(registrations)
    .innerJoin(participants, eq(registrations.participantId, participants.id))
    .where(eq(registrations.publicCode, normalizedCode))
    .limit(1);
  if (!match || match.cpf !== normalizedCpf) return null;
  return getRegistrationById(match.registrationId);
}

export async function getRegistrationByAccess(registrationId: string, publicCode: string) {
  const details = await getRegistrationById(registrationId);
  if (!details || details.publicCode !== publicCode.trim().toUpperCase()) return null;
  return details;
}

const publicRegistrationUpdateSchema = z.object({
  instagram: z.string().trim().max(240).optional(),
  tiktok: z.string().trim().max(240).optional(),
  facebook: z.string().trim().max(240).optional(),
  otherSocials: z.string().trim().max(1000).optional(),
  links: z.array(linkInput).max(10).optional(),
  stageName: z.string().trim().max(160).optional(),
  stageCallName: z.string().trim().min(1).max(160).optional(),
  characterName: z.string().trim().min(1).max(160).optional(),
  sourceWork: z.string().trim().min(1).max(160).optional(),
  cosplayDescription: z.string().trim().max(5000).optional(),
  presentationDescription: z.string().trim().max(5000).optional(),
  presentationNotes: z.string().trim().max(5000).optional(),
  technicalNotes: z.string().trim().max(5000).optional(),
  judgeNotes: z.string().trim().max(5000).optional(),
  musicTitle: z.string().trim().max(200).optional()
});

export type PublicRegistrationUpdate = z.infer<typeof publicRegistrationUpdateSchema>;

export async function updatePublicRegistration(registrationId: string, input: PublicRegistrationUpdate) {
  if (!getRegistrationWindowStatus().open) {
    throw new RegistrationError('online_closed', 'Inscrições online encerradas.');
  }
  let update: PublicRegistrationUpdate;
  try {
    update = publicRegistrationUpdateSchema.parse(input);
  } catch (error) {
    const message = error instanceof z.ZodError ? error.issues[0]?.message : undefined;
    throw new RegistrationError('invalid', message || 'Os dados da atualização são inválidos.');
  }
  const current = await getRegistrationById(registrationId);
  if (!current) throw new RegistrationError('invalid', 'Inscrição não encontrada.');

  const now = new Date().toISOString();
  const links = update.links ? ensureValidReferenceLinks(update.links) : undefined;
  await getDatabase().transaction(async (transaction) => {
    await transaction.update(participants).set({
      instagram: normalizeOptional(update.instagram),
      tiktok: normalizeOptional(update.tiktok),
      facebook: normalizeOptional(update.facebook),
      otherSocials: normalizeOptional(update.otherSocials),
      updatedAt: now
    }).where(eq(participants.id, current.participantId));

    if (current.cosplay) {
      const cosplayUpdate = {
        stageName: normalizeOptional(update.stageName ?? current.cosplay.stageName ?? undefined),
        stageCallName: update.stageCallName ?? current.cosplay.stageCallName,
        characterName: update.characterName ?? current.cosplay.characterName,
        sourceWork: update.sourceWork ?? current.cosplay.sourceWork,
        cosplayDescription: update.cosplayDescription ?? current.cosplay.cosplayDescription,
        presentationDescription: normalizeOptional(update.presentationDescription ?? current.cosplay.presentationDescription ?? undefined),
        presentationNotes: normalizeOptional(update.presentationNotes ?? current.cosplay.presentationNotes ?? undefined),
        technicalNotes: normalizeOptional(update.technicalNotes ?? current.cosplay.technicalNotes ?? undefined),
        judgeNotes: normalizeOptional(update.judgeNotes ?? current.cosplay.judgeNotes ?? undefined),
        musicTitle: normalizeOptional(update.musicTitle ?? current.cosplay.musicTitle ?? undefined),
        updatedAt: now
      };
      await transaction.update(cosplayEntries).set(cosplayUpdate).where(eq(cosplayEntries.registrationId, registrationId));
    } else if (Object.entries(update).some(([key, value]) => ['stageName', 'stageCallName', 'characterName', 'sourceWork', 'cosplayDescription', 'presentationDescription', 'presentationNotes', 'technicalNotes', 'judgeNotes', 'musicTitle'].includes(key) && value !== undefined)) {
      throw new RegistrationError('invalid', 'Campos de Cosplay não pertencem a esta competição.');
    }

    if (links) {
      await transaction.delete(registrationLinks).where(eq(registrationLinks.registrationId, registrationId));
      if (links.length > 0) {
        await transaction.insert(registrationLinks).values(links.map((link) => ({
          id: randomUUID(),
          registrationId,
          label: link.label,
          url: link.url,
          createdAt: now,
          updatedAt: now
        })));
      }
    }

    await transaction.update(registrations).set({ updatedAt: now }).where(eq(registrations.id, registrationId));
  });

  return getRegistrationById(registrationId);
}

export type PublicCosplayUpdate = PublicRegistrationUpdate;

export async function updatePublicCosplayRegistration(registrationId: string, input: PublicCosplayUpdate) {
  return updatePublicRegistration(registrationId, input);
}
