import { event, gameArt, schedulePanels, tournamentCategories, tournamentSchedule, tournaments } from './event';
import { regulations } from './regulations';
import { ONLINE_REGISTRATION_DEADLINE_LABEL, ONLINE_REGISTRATION_ONSITE_NOTICE } from '../config/registration-deadline';

const videogameCategories = ['Fight Games', 'Esport Games', 'Retrô Games'];

export const championshipEntries = tournaments.map((tournament) => {
  const schedule = tournamentSchedule.find((slot) => slot.tournamentId === tournament.id)!;
  const art = gameArt.find((game) => tournament.title.includes(game.title)) ?? { image: '', alt: '', fit: 'contain' };
  const regulationId = 'regulationId' in tournament && typeof tournament.regulationId === 'string'
    ? tournament.regulationId
    : undefined;
  const regulation = regulationId
    ? regulations[regulationId as keyof typeof regulations]
    : undefined;
  const generalRegulation = videogameCategories.includes(tournament.category) ? regulations.gamesGeneral : undefined;
  const registrationUrl = tournament.registrationUrl;
  const registrationPrice = tournament.registrationPrice;
  const registrationNote = 'registrationNote' in tournament ? tournament.registrationNote : 'Compra do ingresso competidor via Eventiza.';
  const registrationFree = 'registrationFree' in tournament ? tournament.registrationFree : false;
  const format = 'format' in tournament ? tournament.format : 'Formato a confirmar';
  const participants = 'participants' in tournament ? tournament.participants : 'Vagas a confirmar';
  const prizeNote = 'prizeNote' in tournament ? tournament.prizeNote : undefined;
  const onlineRegistrationCopy = `Inscrições online até ${ONLINE_REGISTRATION_DEADLINE_LABEL}. ${ONLINE_REGISTRATION_ONSITE_NOTICE}`;
  const eventAccessNote = registrationFree
    ? `A inscrição é gratuita. ${onlineRegistrationCopy} É necessário comprar o ingresso do evento.`
    : `O ingresso competidor dá direito à entrada no evento em ${schedule.date} (${schedule.day.toLowerCase()}) e à participação na competição. ${onlineRegistrationCopy}`;

  return {
    tournament,
    art,
    schedule,
    regulation,
    generalRegulation,
    registrationUrl,
    registrationPrice,
    registrationNote,
    registrationFree,
    format,
    participants,
    prizeNote,
    eventAccessNote,
    pageUrl: `/campeonatos/${tournament.id}`
  };
});

export const getChampionshipEntry = (id: string) => championshipEntries.find((entry) => entry.tournament.id === id);

export const competitionDays = [
  { day: 'SÁBADO', slug: 'sabado', date: '19/09/2026', accent: 'cyan' },
  { day: 'DOMINGO', slug: 'domingo', date: '20/09/2026', accent: 'red' }
].map((day) => ({
  ...day,
  groups: tournamentCategories.map((category) => ({
    ...category,
    entries: championshipEntries
      .filter((entry) => entry.tournament.category === category.category && entry.schedule.day === day.day)
      .sort((a, b) => a.schedule.time.localeCompare(b.schedule.time))
  })).filter((group) => group.entries.length > 0),
  panels: schedulePanels.filter((panel) => panel.day === day.day)
}));

export const getCompetitionDay = (slug: string) => competitionDays.find((day) => day.slug === slug);

export const getChampionshipCount = (day: (typeof competitionDays)[number]) => day.groups.reduce((count, group) => count + group.entries.length, 0);
