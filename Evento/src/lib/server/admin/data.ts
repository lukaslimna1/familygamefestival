import { and, desc, eq, inArray, like, ne, or, sql } from 'drizzle-orm';
import competitionDefinitions from '../../../config/competitions.json';
import {
  calculateAge,
  formatRegistrationDateTime,
  getCompetitionRegulationVersion,
  getRegistrationCapacity,
  getRegistrationWindowStatus
} from '../registration/config';
import { getDriveConfig, getTursoConfig } from '../config/env';
import { getRegistrationDetails } from '../db/repository';
import { getDatabase } from '../db/client';
import {
  competitions,
  cosplayEntries,
  kpopEntries,
  minorAuthorizations,
  participants,
  registrationFiles,
  registrations
} from '../db/schema';

type AdminListFilters = {
  competitionId?: string;
  search?: string;
  status?: string;
  reviewStatus?: AdminReviewStatus;
  age?: 'minor' | 'adult';
  limit?: number;
};

export const ADMIN_REVIEW_STATUSES = ['pending', 'approved', 'rejected', 'correction'] as const;
export type AdminReviewStatus = typeof ADMIN_REVIEW_STATUSES[number];

export const adminReviewStatusLabel = (status: string) => ({
  pending: 'Pendente',
  approved: 'Aprovado',
  rejected: 'Recusado',
  correction: 'Solicitar correção'
}[status] ?? status);

export type AdminRegistrationRow = {
  registrationId: string;
  publicCode: string | null;
  status: string;
  reviewStatus: AdminReviewStatus;
  source: string;
  driveSyncStatus: string;
  driveLastError: string | null;
  submittedAt: string | null;
  registrationCreatedAt: string;
  registrationUpdatedAt: string;
  participantId: string;
  fullName: string;
  cpf: string;
  phone: string;
  email: string;
  dateOfBirth: string;
  city: string;
  state: string;
  instagram: string | null;
  competitionId: string;
  competitionTitle: string;
  competitionCategory: string;
  competitionEventDay: string;
  competitionEventDate: string;
  competitionStartTime: string;
  competitionMaxParticipants: number | null;
  stageName: string | null;
  characterName: string | null;
  sourceWork: string | null;
  originalArtist: string | null;
  songTitle: string | null;
  referenceUrl: string | null;
  age: number;
  isMinor: boolean;
  authorization: AdminAuthorizationSummary | null;
  referenceCount: number;
  hasReference: boolean;
  hasAudio: boolean;
  fileCount: number;
  hasDriveIssue: boolean;
  needsAttention: boolean;
};

export type AdminAuthorizationSummary = {
  id: string;
  version: number;
  status: string;
  deliveryType: string | null;
  driveFileId: string | null;
  signedDriveFileId: string | null;
  receivedAt: string | null;
  rejectionReason: string | null;
};

const baseSelection = {
  registrationId: registrations.id,
  publicCode: registrations.publicCode,
  status: registrations.status,
  reviewStatus: registrations.reviewStatus,
  source: registrations.source,
  driveSyncStatus: registrations.driveSyncStatus,
  driveLastError: registrations.driveLastError,
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
  competitionId: competitions.id,
  competitionTitle: competitions.title,
  competitionCategory: competitions.category,
  competitionEventDay: competitions.eventDay,
  competitionEventDate: competitions.eventDate,
  competitionStartTime: competitions.startTime,
  competitionMaxParticipants: competitions.maxParticipants,
  cosplayStageName: cosplayEntries.stageName,
  cosplayCharacterName: cosplayEntries.characterName,
  cosplaySourceWork: cosplayEntries.sourceWork,
  kpopStageName: kpopEntries.stageName,
  kpopOriginalArtist: kpopEntries.originalArtist,
  kpopSongTitle: kpopEntries.songTitle,
  kpopReferenceUrl: kpopEntries.referenceUrl
};

function isSignedAuthorization(status: string) {
  return status === 'uploaded' || status === 'received';
}

function localDate(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo' }).format(date);
}

async function getSupportingRows(registrationIds: string[] = [], participantIds: string[] = []) {
  const database = getDatabase();
  const [authorizations, files] = await Promise.all([
    participantIds.length
      ? database.select({
        participantId: minorAuthorizations.participantId,
        id: minorAuthorizations.id,
        version: minorAuthorizations.version,
        status: minorAuthorizations.status,
        deliveryType: minorAuthorizations.deliveryType,
        driveFileId: minorAuthorizations.driveFileId,
        signedDriveFileId: minorAuthorizations.signedDriveFileId,
        receivedAt: minorAuthorizations.receivedAt,
        rejectionReason: minorAuthorizations.rejectionReason
      }).from(minorAuthorizations).where(inArray(minorAuthorizations.participantId, participantIds)).orderBy(desc(minorAuthorizations.version))
      : Promise.resolve([]),
    registrationIds.length
      ? database.select({
        registrationId: registrationFiles.registrationId,
        fileType: registrationFiles.fileType,
        syncStatus: registrationFiles.syncStatus
      }).from(registrationFiles).where(inArray(registrationFiles.registrationId, registrationIds))
      : Promise.resolve([])
  ]);

  const authorizationByParticipant = new Map<string, AdminAuthorizationSummary>();
  for (const authorization of authorizations) {
    if (!authorizationByParticipant.has(authorization.participantId)) {
      authorizationByParticipant.set(authorization.participantId, authorization);
    }
  }

  const filesByRegistration = new Map<string, typeof files>();
  for (const file of files) {
    const current = filesByRegistration.get(file.registrationId) ?? [];
    current.push(file);
    filesByRegistration.set(file.registrationId, current);
  }

  return { authorizationByParticipant, filesByRegistration };
}

export async function listAdminRegistrations(filters: AdminListFilters = {}) {
  const database = getDatabase();
  const predicates = [ne(registrations.status, 'cancelled')];
  if (filters.competitionId) predicates.push(eq(registrations.competitionId, filters.competitionId));
  if (filters.status) {
    const driveStatus = filters.status === 'pending' ? 'drive_pending' : filters.status;
    predicates.push(['drive_pending', 'synced', 'failed'].includes(driveStatus)
      ? eq(registrations.driveSyncStatus, driveStatus)
      : eq(registrations.status, filters.status));
  }
  if (filters.reviewStatus) predicates.push(eq(registrations.reviewStatus, filters.reviewStatus));

  const search = filters.search?.trim();
  if (search) {
    const normalizedSearch = search.toUpperCase();
    const cpfSearch = search.replace(/\D/g, '');
    predicates.push(or(
      like(participants.fullName, `%${search}%`),
      like(registrations.publicCode, `%${normalizedSearch}%`),
      like(cosplayEntries.stageName, `%${search}%`),
      like(cosplayEntries.characterName, `%${search}%`),
      like(cosplayEntries.sourceWork, `%${search}%`),
      like(kpopEntries.stageName, `%${search}%`),
      like(kpopEntries.originalArtist, `%${search}%`),
      like(kpopEntries.songTitle, `%${search}%`),
      ...(cpfSearch ? [like(participants.cpf, `%${cpfSearch}%`)] : [])
    )!);
  }

  const rows = await database
    .select(baseSelection)
    .from(registrations)
    .innerJoin(participants, eq(registrations.participantId, participants.id))
    .innerJoin(competitions, eq(registrations.competitionId, competitions.id))
    .leftJoin(cosplayEntries, eq(registrations.id, cosplayEntries.registrationId))
    .leftJoin(kpopEntries, eq(registrations.id, kpopEntries.registrationId))
    .where(and(...predicates))
    .orderBy(desc(registrations.updatedAt), desc(registrations.createdAt))
    .limit(Math.min(Math.max(filters.limit ?? 500, 1), 1000));

  const { authorizationByParticipant, filesByRegistration } = await getSupportingRows(
    rows.map((row) => row.registrationId),
    rows.map((row) => row.participantId)
  );
  const mapped = rows.map((row) => {
    const age = calculateAge(row.dateOfBirth);
    const files = filesByRegistration.get(row.registrationId) ?? [];
    const authorization = authorizationByParticipant.get(row.participantId) ?? null;
    const isMinor = Number.isInteger(age) && age < 18;
    const hasDriveIssue = row.driveSyncStatus === 'failed' || files.some((file) => file.syncStatus === 'failed');
    const hasAudio = files.some((file) => file.fileType === 'cosplay_audio' || file.fileType === 'kpop_audio');
    const hasReference = row.competitionId === 'k-pop-individual'
      ? Boolean(row.kpopReferenceUrl)
      : files.some((file) => file.fileType === 'cosplay_reference');
    const needsAttention = hasDriveIssue
      || (isMinor && (!authorization || !isSignedAuthorization(authorization.status)))
      || ((row.competitionId === 'cosplay' || row.competitionId === 'k-pop-individual') && !hasAudio)
      || (row.competitionId === 'k-pop-individual' && !hasReference);

    return {
      ...row,
      reviewStatus: ADMIN_REVIEW_STATUSES.includes(row.reviewStatus as AdminReviewStatus)
        ? row.reviewStatus as AdminReviewStatus
        : 'pending',
      stageName: row.competitionId === 'k-pop-individual' ? row.kpopStageName : row.cosplayStageName,
      characterName: row.cosplayCharacterName,
      sourceWork: row.cosplaySourceWork,
      originalArtist: row.kpopOriginalArtist,
      songTitle: row.kpopSongTitle,
      referenceUrl: row.kpopReferenceUrl,
      age,
      isMinor,
      authorization,
      referenceCount: files.filter((file) => file.fileType === 'cosplay_reference').length,
      hasReference,
      hasAudio,
      fileCount: files.length,
      hasDriveIssue,
      needsAttention
    } satisfies AdminRegistrationRow;
  });

  return mapped.filter((row) => !filters.age || (filters.age === 'minor' ? row.isMinor : !row.isMinor));
}

export async function getAdminCompetitionSummaries() {
  const database = getDatabase();
  const [configured, countRows] = await Promise.all([
    database.select({ id: competitions.id, title: competitions.title, category: competitions.category, maxParticipants: competitions.maxParticipants }).from(competitions),
    database.select({
      competitionId: registrations.competitionId,
      enrolled: sql<number>`count(*)`
    }).from(registrations)
      .where(ne(registrations.status, 'cancelled'))
      .groupBy(registrations.competitionId)
  ]);
  const counts = new Map(countRows.map((row) => [row.competitionId, Number(row.enrolled)]));

  const configuredById = new Map(configured.map((competition) => [competition.id, competition]));
  return competitionDefinitions.map((definition) => {
    const databaseCompetition = configuredById.get(definition.id);
    const capacity = getRegistrationCapacity(databaseCompetition?.maxParticipants, definition.maxParticipants);
    const enrolled = counts.get(definition.id) ?? 0;
    return {
      id: definition.id,
      title: databaseCompetition?.title ?? definition.name,
      category: databaseCompetition?.category ?? definition.category,
      enrolled,
      capacity,
      remaining: Math.max(capacity - enrolled, 0),
      full: enrolled >= capacity,
      type: definition.type,
      regulationVersion: getCompetitionRegulationVersion(definition)
    };
  });
}

export async function getAdminDashboardData() {
  const [registrationsList, competitionsList] = await Promise.all([
    listAdminRegistrations({ limit: 1000 }),
    getAdminCompetitionSummaries()
  ]);
  const minorParticipants = new Set(registrationsList.filter((row) => row.isMinor).map((row) => row.participantId));
  const pendingAuthorizations = new Set(registrationsList.filter((row) => row.isMinor && row.needsAttention && (!row.authorization || !isSignedAuthorization(row.authorization.status))).map((row) => row.participantId));
  const today = localDate(new Date().toISOString());
  const todayRegistrations = registrationsList.filter((row) => localDate(row.submittedAt ?? row.registrationCreatedAt) === today).length;
  const latestSyncAt = registrationsList.find((row) => row.driveSyncStatus === 'synced')?.registrationUpdatedAt ?? null;

  return {
    stats: {
      total: registrationsList.length,
      today: todayRegistrations,
      minors: minorParticipants.size,
      pendingAuthorizations: pendingAuthorizations.size,
      fullCompetitions: competitionsList.filter((competition) => competition.full).length,
      remainingSlots: competitionsList.reduce((total, competition) => total + competition.remaining, 0)
    },
    competitions: competitionsList,
    latest: registrationsList.slice(0, 8),
    attention: {
      authorizations: pendingAuthorizations.size,
      physical: new Set(registrationsList.filter((row) => row.authorization?.status === 'physical_pending').map((row) => row.participantId)).size,
      driveErrors: registrationsList.filter((row) => row.hasDriveIssue).length,
      cosplayWithoutAudio: registrationsList.filter((row) => row.competitionId === 'cosplay' && !row.hasAudio).length,
      kpopWithoutAudio: registrationsList.filter((row) => row.competitionId === 'k-pop-individual' && !row.hasAudio).length
    },
    latestSyncAt
  };
}

export async function getAdminRegistrationDetails(registrationId: string) {
  const details = await getRegistrationDetails(registrationId);
  if (!details) return null;
  const [review] = await getDatabase()
    .select({ reviewStatus: registrations.reviewStatus })
    .from(registrations)
    .where(eq(registrations.id, registrationId))
    .limit(1);
  const age = calculateAge(details.dateOfBirth);
  const reviewStatus = review?.reviewStatus;
  return {
    ...details,
    reviewStatus: ADMIN_REVIEW_STATUSES.includes(reviewStatus as AdminReviewStatus)
      ? reviewStatus as AdminReviewStatus
      : 'pending',
    age,
    isMinor: Number.isInteger(age) && age < 18
  };
}

export async function getAdminMinorRows(filters: { competitionId?: string; status?: string; age?: 'minor' | 'adult' } = {}) {
  const rows = await listAdminRegistrations({ ...filters, age: 'minor', limit: 1000 });
  return rows.filter((row) => row.authorization || row.isMinor);
}

export async function updateAdminReviewStatus(registrationId: string, status: AdminReviewStatus) {
  if (!ADMIN_REVIEW_STATUSES.includes(status)) throw new Error('Status de conferência inválido.');
  const result = await getDatabase().update(registrations)
    .set({ reviewStatus: status })
    .where(eq(registrations.id, registrationId));
  if (result.rowsAffected === 0) throw new Error('Inscrição não encontrada.');
}

export async function updateAdminMinorAuthorization(authorizationId: string, action: 'received' | 'rejected', rejectionReason?: string) {
  const existing = await getDatabase().select({ id: minorAuthorizations.id }).from(minorAuthorizations).where(eq(minorAuthorizations.id, authorizationId)).limit(1);
  if (!existing[0]) throw new Error('Autorização não encontrada.');
  const now = new Date().toISOString();
  await getDatabase().update(minorAuthorizations).set(action === 'received'
    ? { status: 'received', receivedAt: now, rejectionReason: null, updatedAt: now }
    : { status: 'rejected', rejectionReason: rejectionReason?.trim().slice(0, 500) || 'Rejeitada pela administração.', updatedAt: now }
  ).where(eq(minorAuthorizations.id, authorizationId));
}

export function getAdminEventSettings() {
  const window = getRegistrationWindowStatus();
  return {
    defaultCapacity: 32,
    onlineDeadline: window.deadlineLabel,
    onlineOpen: window.open,
    timeZone: 'America/Sao_Paulo',
    competitionCount: competitionDefinitions.length,
    source: 'configuração oficial das competições'
  };
}

export function getAdminServiceStatus() {
  let turso = false;
  let drive = false;
  try { getTursoConfig(); turso = true; } catch { /* status is rendered as unavailable */ }
  try { getDriveConfig(); drive = true; } catch { /* status is rendered as unavailable */ }
  return { turso, drive };
}

export function formatAdminDate(value: string | null | undefined) {
  return value ? formatRegistrationDateTime(value) : '—';
}

export function driveFileUrl(fileId: string | null | undefined) {
  return fileId ? `https://drive.google.com/open?id=${encodeURIComponent(fileId)}` : null;
}

export function whatsappUrl(phone: string | null | undefined) {
  const digits = phone?.replace(/\D/g, '') ?? '';
  if (!digits) return null;
  const brazilianNumber = digits.startsWith('55') ? digits : `55${digits}`;
  return `https://wa.me/${brazilianNumber}`;
}

export function youtubeVideoId(value: string | null | undefined) {
  if (!value) return null;
  try {
    const url = new URL(value);
    if (url.hostname === 'youtu.be') return url.pathname.slice(1).split('/')[0] || null;
    if (['youtube.com', 'www.youtube.com', 'm.youtube.com', 'youtube-nocookie.com'].includes(url.hostname)) {
      const queryId = url.searchParams.get('v');
      if (queryId) return queryId;
      const match = url.pathname.match(/\/(?:embed|shorts|live)\/([^/?]+)/);
      return match?.[1] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}
