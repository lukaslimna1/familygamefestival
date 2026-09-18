import competitionDefinitions from '../../../config/competitions.json';

export {
  REGISTRATION_TIME_ZONE,
  ONLINE_REGISTRATION_DEADLINE_ISO,
  ONLINE_REGISTRATION_DEADLINE,
  ONLINE_REGISTRATION_CUTOFF,
  ONLINE_REGISTRATION_DEADLINE_LABEL,
  ONLINE_REGISTRATION_DEADLINE_ADMIN_LABEL,
  ONLINE_REGISTRATION_ONSITE_NOTICE,
  ONLINE_REGISTRATION_OPEN_NOTICE,
  ONLINE_REGISTRATION_CLOSED_NOTICE,
  getRegistrationWindowStatus,
  getOnlineRegistrationClosedNotice,
  isOnlineRegistrationOpen,
  formatRegistrationDateTime
} from '../../../config/registration-deadline';

export type { RegistrationWindowStatus } from '../../../config/registration-deadline';

export {
  formatCpf,
  formatPhone,
  isValidCpf,
  isValidPhone,
  normalizeCpf,
  normalizePhone
} from '../../registration-validation';

export const DEFAULT_REGISTRATION_CAPACITY = 32;
export const PUBLIC_REGISTRATION_ACCESS_COOKIE = 'fgf_registration_access';
export const PUBLIC_REGISTRATION_ACCESS_TTL_SECONDS = 60 * 60;
export const COSPLAY_REFERENCE_FILE_LIMIT = 5;
export const COSPLAY_REFERENCE_MAX_BYTES = 10 * 1024 * 1024;
export const COSPLAY_AUDIO_MAX_BYTES = 25 * 1024 * 1024;
export const KPOP_AUDIO_MAX_BYTES = COSPLAY_AUDIO_MAX_BYTES;

export const REGISTRATION_POLICY_VERSIONS = {
  competitionRegulation: 'cosplay-2026-v1',
  imageUse: 'image-use-2026-v1',
  pendriveBackup: 'pendrive-backup-2026-v1'
} as const;

export const PENDRIVE_CONSENT_TEXT =
  'Estou ciente de que devo levar no dia do evento um pendrive contendo uma cópia do áudio da minha apresentação, devidamente identificado, para utilização em caso de falha técnica ou indisponibilidade do arquivo enviado anteriormente.';

export const MINOR_AUTHORIZATION_NOTICE =
  'A participação está condicionada à apresentação da autorização do responsável legal. Caso o documento não seja enviado antecipadamente, deverá ser entregue impresso e assinado no dia do evento. A ausência da autorização poderá impedir a participação.';

export const SOCIALS_HELP_TEXT =
  'Informe suas redes sociais caso queira ser marcado nas fotos e publicações oficiais do Family Game Festival.';

export type CompetitionDefinition = (typeof competitionDefinitions)[number];

export function calculateAge(dateOfBirth: string, now = new Date()) {
  const birthDate = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(birthDate.getTime())) return Number.NaN;
  if (birthDate.toISOString().slice(0, 10) !== dateOfBirth) return Number.NaN;

  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const month = now.getUTCMonth() - birthDate.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return age;
}

export function normalizeOptionalText(value: string | null | undefined, maxLength = 500) {
  const normalized = value?.trim() ?? '';
  return normalized ? normalized.slice(0, maxLength) : undefined;
}

export function getCompetitionDefinition(competitionId: string) {
  return competitionDefinitions.find((competition) => competition.id === competitionId);
}

export function getCompetitionDefinitionBySlug(slug: string) {
  return competitionDefinitions.find((competition) => competition.slug === slug || competition.id === slug);
}

export function getCompetitionRegulationVersion(definition: CompetitionDefinition) {
  return definition.id === 'cosplay' ? REGISTRATION_POLICY_VERSIONS.competitionRegulation : `${definition.id}-2026-v1`;
}

export function isCosplayCompetition(definition: CompetitionDefinition) {
  return definition.type === 'cosplay';
}

export function isKpopCompetition(definition: CompetitionDefinition) {
  return definition.type === 'kpop';
}

export function getRegistrationCapacity(
  databaseMaxParticipants: number | null | undefined,
  configuredMaxParticipants: number | null | undefined
) {
  const capacity = databaseMaxParticipants ?? configuredMaxParticipants ?? DEFAULT_REGISTRATION_CAPACITY;
  return Number.isInteger(capacity) && capacity > 0 ? capacity : DEFAULT_REGISTRATION_CAPACITY;
}
