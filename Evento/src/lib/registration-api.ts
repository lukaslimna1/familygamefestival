export type RegistrationApiErrorCode =
  | 'invalid'
  | 'not_found'
  | 'full'
  | 'duplicate'
  | 'online_closed'
  | 'unavailable'
  | 'unauthorized'
  | 'rate'
  | 'file'
  | string;

export { formatCpf, formatPhone, isValidCpf, isValidPhone, normalizeCpf, normalizePhone } from './registration-validation';

export class RegistrationApiError extends Error {
  code: RegistrationApiErrorCode;
  status: number;

  constructor(code: RegistrationApiErrorCode, message: string, status: number) {
    super(message);
    this.name = 'RegistrationApiError';
    this.code = code;
    this.status = status;
  }
}

type ApiEnvelope<T> = {
  data?: T;
  error?: { code?: string; message?: string };
};

const configuredApiBase = (import.meta.env.PUBLIC_REGISTRATION_API_BASE_URL || '/api').trim();
const apiBase = configuredApiBase.replace(/\/+$/, '') || '/api';

export function registrationApiUrl(path: string) {
  return `${apiBase}/${path.replace(/^\/+/, '')}`;
}

async function readApiResponse<T>(response: Response): Promise<T> {
  const body = await response.text();
  let payload: ApiEnvelope<T> | undefined;
  if (body) {
    try {
      payload = JSON.parse(body) as ApiEnvelope<T>;
    } catch {
      payload = undefined;
    }
  }

  if (!response.ok) {
    const code = payload?.error?.code || (response.status === 401 ? 'unauthorized' : 'unavailable');
    const message = payload?.error?.message || 'Não foi possível concluir esta operação agora.';
    throw new RegistrationApiError(code, message, response.status);
  }

  return (payload?.data ?? payload) as T;
}

export async function getRegistrationApi<T>(path: string) {
  const response = await fetch(registrationApiUrl(path), {
    method: 'GET',
    credentials: 'include',
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  return readApiResponse<T>(response);
}

export async function postRegistrationForm<T>(path: string, form: FormData) {
  const response = await fetch(registrationApiUrl(path), {
    method: 'POST',
    body: form,
    credentials: 'include',
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
  return readApiResponse<T>(response);
}

export async function postRegistrationAction(path: string, form: FormData) {
  const response = await fetch(registrationApiUrl(path), {
    method: 'POST',
    body: form,
    credentials: 'include',
    cache: 'no-store'
  });
  if (!response.ok && response.status !== 303) await readApiResponse<unknown>(response);
  return response;
}

export function isMinorDate(value: string | undefined) {
  if (!value) return false;
  const birth = new Date(`${value}T12:00:00`);
  if (Number.isNaN(birth.valueOf())) return false;
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const birthdayNotReached = today.getMonth() < birth.getMonth()
    || (today.getMonth() === birth.getMonth() && today.getDate() < birth.getDate());
  if (birthdayNotReached) age -= 1;
  return age < 18;
}

function valueOf(form: HTMLFormElement, name: string) {
  const fields = [...form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(`[name="${name}"]`)]
    .filter((candidate) => !candidate.closest('[hidden]'));
  const field = fields[0] || form.elements.namedItem(name);
  return field instanceof HTMLInputElement || field instanceof HTMLTextAreaElement || field instanceof HTMLSelectElement
    ? field.value.trim()
    : '';
}

function appendValue(form: FormData, name: string, value: string | undefined) {
  const normalized = value?.trim();
  if (normalized) form.append(name, normalized);
}

function checked(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);
  return field instanceof HTMLInputElement && field.type === 'checkbox' && field.checked;
}

function additionalSocialLinks(source: HTMLFormElement) {
  const structured = source.elements.namedItem('additionalSocialLinksJson');
  if (structured instanceof HTMLInputElement && structured.value) {
    try {
      const parsed = JSON.parse(structured.value) as Array<{ name?: string; url?: string }>;
      return parsed
        .map((link) => ({ label: link.name?.trim() || '', url: link.url?.trim() || '' }))
        .filter((link) => link.label || link.url);
    } catch {
      // Fall through to the visible repeated fields.
    }
  }

  const names = [...source.querySelectorAll<HTMLInputElement>('input[name="additionalSocialName[]"]')];
  const urls = [...source.querySelectorAll<HTMLInputElement>('input[name="additionalSocialUrl[]"]')];
  return names
    .map((input, index) => ({ label: input.value.trim(), url: urls[index]?.value.trim() || '' }))
    .filter((link) => link.label || link.url);
}

function referenceLinks(source: HTMLFormElement) {
  const labels = [...source.querySelectorAll<HTMLInputElement>('input[name="referenceLinkName[]"]')];
  const urls = [...source.querySelectorAll<HTMLInputElement>('input[name="referenceLink[]"]')];
  return labels
    .map((input, index) => ({ label: input.value.trim(), url: urls[index]?.value.trim() || '' }))
    .filter((link) => link.label || link.url);
}

/** Maps the approved public UI field names to the backend contract in one place. */
export function buildRegistrationPayload(source: HTMLFormElement, competitionId: string, isCosplay: boolean, isKpop = competitionId === 'k-pop-individual') {
  const payload = new FormData();
  appendValue(payload, 'fullName', valueOf(source, 'fullName'));
  appendValue(payload, 'dateOfBirth', valueOf(source, 'birthDate'));
  appendValue(payload, 'cpf', valueOf(source, 'cpf'));
  appendValue(payload, 'phone', valueOf(source, 'phone'));
  appendValue(payload, 'email', valueOf(source, 'email'));
  appendValue(payload, 'city', valueOf(source, 'city'));
  appendValue(payload, 'state', valueOf(source, 'stateUf') || valueOf(source, 'state'));
  appendValue(payload, 'instagram', valueOf(source, 'instagram'));
  appendValue(payload, 'tiktok', valueOf(source, 'tiktok'));
  appendValue(payload, 'facebook', valueOf(source, 'facebook'));

  const socials = additionalSocialLinks(source);
  if (socials.length) payload.append('otherSocials', JSON.stringify(socials));
  for (const link of referenceLinks(source)) {
    payload.append('referenceLinkLabel', link.label);
    payload.append('referenceLinkUrl', link.url);
  }

  const fieldMap: Record<string, string> = {
    responsibleName: 'guardianFullName',
    responsibleCpf: 'guardianCpf',
    responsiblePhone: 'guardianPhone',
    responsibleEmail: 'guardianEmail',
    responsibleRelationship: 'guardianRelationship'
  };
  for (const [uiName, apiName] of Object.entries(fieldMap)) appendValue(payload, apiName, valueOf(source, uiName));

  if (checked(source, 'acceptRules')) payload.append('consentRegulation', 'yes');
  if (checked(source, 'acceptImageUse')) payload.append('consentImage', 'yes');

  if (isCosplay) {
    const cosplayMap: Record<string, string> = {
      stageName: 'stageName',
      stageCallName: 'stageCallName',
      character: 'characterName',
      franchise: 'sourceWork',
      cosplayDescription: 'cosplayDescription',
      presentationDescription: 'presentationDescription',
      presentationNotes: 'presentationNotes',
      technicalNotes: 'technicalNotes',
      judgeNotes: 'judgeNotes',
      audioTitle: 'musicTitle'
    };
    for (const [uiName, apiName] of Object.entries(cosplayMap)) appendValue(payload, apiName, valueOf(source, uiName));
    if (checked(source, 'audioBackupAcknowledgement')) payload.append('consentPendrive', 'yes');
    const references = source.querySelector<HTMLInputElement>('[name="referenceFiles"]')?.files;
    if (references) for (const file of references) payload.append('referenceFiles', file, file.name);
    const audio = source.querySelector<HTMLInputElement>('[name="audioFile"]')?.files?.[0];
    if (audio) payload.append('audioFile', audio, audio.name);

    if (isMinorDate(valueOf(source, 'birthDate'))) {
      const authorizationIds = [...source.querySelectorAll<HTMLInputElement>('input[name="authorizationCompetitionId"]:checked')]
        .map((input) => input.value.trim())
        .filter(Boolean);
      if (!authorizationIds.includes(competitionId)) authorizationIds.push(competitionId);
      for (const id of authorizationIds) payload.append('authorizationCompetitionId', id);
    }
  }

  if (isKpop) {
    const kpopMap: Record<string, string> = {
      stageName: 'stageName',
      originalArtist: 'originalArtist',
      songTitle: 'songTitle',
      songVersion: 'songVersion',
      editedCut: 'editedCut',
      referenceUrl: 'referenceUrl',
      audioNotes: 'audioNotes',
      judgeNotes: 'judgeNotes'
    };
    for (const [uiName, apiName] of Object.entries(kpopMap)) {
      const field = source.querySelector<HTMLInputElement>(`[data-registration-select-trigger][name="${uiName}"]`);
      appendValue(payload, apiName, field?.dataset.selectedValue || valueOf(source, uiName));
    }
    if (checked(source, 'audioBackupAcknowledgement')) payload.append('consentPendrive', 'yes');
    const audio = source.querySelector<HTMLInputElement>('[name="audioFile"]')?.files?.[0];
    if (audio) payload.append('audioFile', audio, audio.name);

    if (isMinorDate(valueOf(source, 'birthDate'))) {
      const authorizationIds = [...source.querySelectorAll<HTMLInputElement>('input[name="authorizationCompetitionId"]:checked')]
        .map((input) => input.value.trim())
        .filter(Boolean);
      if (!authorizationIds.includes(competitionId)) authorizationIds.push(competitionId);
      for (const id of authorizationIds) payload.append('authorizationCompetitionId', id);
    }
  }

  return payload;
}

export function buildManagementPayload(source: HTMLFormElement) {
  const payload = new FormData();
  payload.append('phone', valueOf(source, 'phone'));
  payload.append('email', valueOf(source, 'email'));
  for (const name of ['instagram', 'tiktok', 'facebook', 'otherSocials', 'stageName', 'stageCallName', 'characterName', 'sourceWork', 'cosplayDescription', 'presentationDescription', 'presentationNotes', 'technicalNotes', 'judgeNotes', 'musicTitle', 'originalArtist', 'songTitle', 'songVersion', 'editedCut', 'referenceUrl', 'audioNotes']) {
    appendValue(payload, name, valueOf(source, name));
  }
  const socialRows = [...source.querySelectorAll<HTMLElement>('[data-management-social-row]')].map((row) => ({
    label: row.querySelector<HTMLInputElement>('[data-social-label]')?.value.trim() || '',
    url: row.querySelector<HTMLInputElement>('[data-social-url]')?.value.trim() || ''
  })).filter((link) => link.label || link.url);
  payload.delete('otherSocials');
  if (socialRows.length) payload.append('otherSocials', JSON.stringify(socialRows));
  const labels = [...source.querySelectorAll<HTMLInputElement>('input[name="referenceLinkLabel"]')];
  const urls = [...source.querySelectorAll<HTMLInputElement>('input[name="referenceLinkUrl"]')];
  labels.forEach((label, index) => {
    payload.append('referenceLinkLabel', label.value.trim());
    payload.append('referenceLinkUrl', urls[index]?.value.trim() || '');
  });
  return payload;
}

export function parseOtherSocials(value: string | null | undefined) {
  if (!value) return [] as Array<{ label: string; url: string }>;
  try {
    const parsed = JSON.parse(value) as Array<{ label?: string; name?: string; url?: string }>;
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map((link) => ({ label: link.label?.trim() || link.name?.trim() || '', url: link.url?.trim() || '' }))
      .filter((link) => link.label || link.url);
  } catch {
    return value.trim() ? [{ label: 'Outro', url: value.trim() }] : [];
  }
}
