import { getChampionshipEntry } from '../data/championships';
import { ONLINE_REGISTRATION_DEADLINE_ISO, ONLINE_REGISTRATION_DEADLINE_LABEL } from '../config/registration-deadline';

export const registrationRoutes = {
  new: (competitionId: string) => `/inscricao/${encodeURIComponent(competitionId)}`,
  access: '/inscricao/acessar',
  mine: '/inscricao/minha'
} as const;

export const registrationDeadline = {
  iso: ONLINE_REGISTRATION_DEADLINE_ISO,
  label: `${ONLINE_REGISTRATION_DEADLINE_LABEL} (horário de Brasília)`
} as const;

export const imageUseConsentText = 'Li e autorizo o uso da minha imagem nos termos apresentados pelo Family Game Festival.';

export const getRegistrationEntry = getChampionshipEntry;
