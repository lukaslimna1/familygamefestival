import { getChampionshipEntry } from '../data/championships';

export const registrationRoutes = {
  new: (competitionId: string) => `/inscricao/${encodeURIComponent(competitionId)}`,
  access: '/inscricao/acessar',
  mine: '/inscricao/minha'
} as const;

export const registrationDeadline = {
  iso: '2026-09-18T15:00:00-03:00',
  label: '18/09/2026 · 15h (horário de Brasília)'
} as const;

export const imageUseConsentText = 'Li e autorizo o uso da minha imagem nos termos apresentados pelo Family Game Festival.';

export const getRegistrationEntry = getChampionshipEntry;
