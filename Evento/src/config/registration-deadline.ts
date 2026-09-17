export const REGISTRATION_TIME_ZONE = 'America/Sao_Paulo';

// The last accepted instant is expressed with the official local offset. The
// exclusive cutoff is derived from it so every consumer shares one source.
export const ONLINE_REGISTRATION_DEADLINE_ISO = '2026-09-18T23:59:59.999-03:00';
export const ONLINE_REGISTRATION_DEADLINE = new Date(ONLINE_REGISTRATION_DEADLINE_ISO);
export const ONLINE_REGISTRATION_CUTOFF = new Date(ONLINE_REGISTRATION_DEADLINE.getTime() + 1);

const deadlinePartsFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: REGISTRATION_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

const dateTimeFormatter = new Intl.DateTimeFormat('pt-BR', {
  timeZone: REGISTRATION_TIME_ZONE,
  day: '2-digit',
  month: '2-digit',
  year: 'numeric',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false
});

function formattedPart(date: Date, type: Intl.DateTimeFormatPartTypes) {
  return deadlinePartsFormatter.formatToParts(date).find((part) => part.type === type)?.value ?? '';
}

export const ONLINE_REGISTRATION_DEADLINE_LABEL = `${formattedPart(ONLINE_REGISTRATION_DEADLINE, 'day')}/${formattedPart(ONLINE_REGISTRATION_DEADLINE, 'month')} às ${formattedPart(ONLINE_REGISTRATION_DEADLINE, 'hour')}:${formattedPart(ONLINE_REGISTRATION_DEADLINE, 'minute')}`;
export const ONLINE_REGISTRATION_DEADLINE_ADMIN_LABEL = `${formattedPart(ONLINE_REGISTRATION_DEADLINE, 'day')}/${formattedPart(ONLINE_REGISTRATION_DEADLINE, 'month')}/${formattedPart(ONLINE_REGISTRATION_DEADLINE, 'year')} · ${formattedPart(ONLINE_REGISTRATION_DEADLINE, 'hour')}:${formattedPart(ONLINE_REGISTRATION_DEADLINE, 'minute')}`;
export const ONLINE_REGISTRATION_ONSITE_NOTICE = 'Ainda poderá haver inscrição presencial no dia do campeonato, até 1 hora antes do início, mediante disponibilidade de vagas.';
export const ONLINE_REGISTRATION_OPEN_NOTICE = `Inscrições online até ${ONLINE_REGISTRATION_DEADLINE_LABEL}.`;
export const ONLINE_REGISTRATION_CLOSED_NOTICE = `Inscrições online encerradas. ${ONLINE_REGISTRATION_ONSITE_NOTICE}`;

export type RegistrationWindowStatus = {
  open: boolean;
  deadline: Date;
  deadlineLabel: string;
  message: string;
};

export function getRegistrationWindowStatus(now = new Date()): RegistrationWindowStatus {
  const open = now.getTime() <= ONLINE_REGISTRATION_DEADLINE.getTime();
  return {
    open,
    deadline: ONLINE_REGISTRATION_DEADLINE,
    deadlineLabel: ONLINE_REGISTRATION_DEADLINE_ADMIN_LABEL,
    message: open ? ONLINE_REGISTRATION_OPEN_NOTICE : ONLINE_REGISTRATION_CLOSED_NOTICE
  };
}

export function getOnlineRegistrationClosedNotice() {
  return ONLINE_REGISTRATION_CLOSED_NOTICE;
}

export function isOnlineRegistrationOpen(now = new Date()) {
  return getRegistrationWindowStatus(now).open;
}

export function formatRegistrationDateTime(value: string | Date) {
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : dateTimeFormatter.format(date);
}
