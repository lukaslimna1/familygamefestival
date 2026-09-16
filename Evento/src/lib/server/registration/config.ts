import competitionDefinitions from '../../../config/competitions.json';

export const DEFAULT_REGISTRATION_CAPACITY = 32;
export const ONLINE_REGISTRATION_DEADLINE_ISO = '2026-09-18T18:00:00.000Z';
export const REGISTRATION_TIME_ZONE = 'America/Sao_Paulo';
export const PUBLIC_REGISTRATION_ACCESS_COOKIE = 'fgf_registration_access';
export const PUBLIC_REGISTRATION_ACCESS_TTL_SECONDS = 60 * 60;
export const COSPLAY_REFERENCE_FILE_LIMIT = 5;
export const COSPLAY_REFERENCE_MAX_BYTES = 10 * 1024 * 1024;
export const COSPLAY_AUDIO_MAX_BYTES = 25 * 1024 * 1024;

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

export const ONLINE_REGISTRATION_DEADLINE = new Date(ONLINE_REGISTRATION_DEADLINE_ISO);

export type CompetitionDefinition = (typeof competitionDefinitions)[number];

export type RegistrationWindowStatus = {
  open: boolean;
  deadline: Date;
  deadlineLabel: string;
  message: string;
};

const deadlineFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: REGISTRATION_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

export function getRegistrationWindowStatus(now = new Date()): RegistrationWindowStatus {
  const open = now.getTime() < ONLINE_REGISTRATION_DEADLINE.getTime();
  return {
    open,
    deadline: ONLINE_REGISTRATION_DEADLINE,
    deadlineLabel: deadlineFormatter.format(ONLINE_REGISTRATION_DEADLINE),
    message: open
      ? `Inscrições online abertas até ${deadlineFormatter.format(ONLINE_REGISTRATION_DEADLINE)}.`
      : 'Inscrições online encerradas.'
  };
}

export function getOnlineRegistrationClosedNotice() {
  return 'Inscrições presenciais poderão ser realizadas no evento, conforme disponibilidade de vagas, até uma hora antes do início do evento.';
}

export function calculateAge(dateOfBirth: string, now = new Date()) {
  const birthDate = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(birthDate.getTime())) return Number.NaN;
  if (birthDate.toISOString().slice(0, 10) !== dateOfBirth) return Number.NaN;

  let age = now.getUTCFullYear() - birthDate.getUTCFullYear();
  const month = now.getUTCMonth() - birthDate.getUTCMonth();
  if (month < 0 || (month === 0 && now.getUTCDate() < birthDate.getUTCDate())) age -= 1;
  return age;
}

export function normalizeCpf(value: string) {
  return value.replace(/\D/g, '');
}

export function isValidCpf(value: string) {
  return /^\d{11}$/.test(normalizeCpf(value));
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

export function getRegistrationCapacity(
  databaseMaxParticipants: number | null | undefined,
  configuredMaxParticipants: number | null | undefined
) {
  const capacity = databaseMaxParticipants ?? configuredMaxParticipants ?? DEFAULT_REGISTRATION_CAPACITY;
  return Number.isInteger(capacity) && capacity > 0 ? capacity : DEFAULT_REGISTRATION_CAPACITY;
}

export function isOnlineRegistrationOpen(now = new Date()) {
  return getRegistrationWindowStatus(now).open;
}

export function formatRegistrationDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : deadlineFormatter.format(date);
}
