import { postRegistrationAction, registrationApiUrl, RegistrationApiError } from './registration-api';

export type RegistrationAuthorizationViewData = {
  guardian?: unknown | null;
  minorAuthorization?: {
    version: number;
    competitionIds: string[];
    status: string;
    coversCurrentCompetition: boolean;
  } | null;
};

function statusCopy(status: string, covered: boolean) {
  if (covered) return {
    badge: 'Válida',
    title: 'Autorização válida.',
    description: 'A autorização recebida já cobre esta competição. Não é necessário enviar outro documento.'
  };
  const copy: Record<string, { badge: string; title: string; description: string }> = {
    pending: {
      badge: 'Pendente',
      title: 'Autorização pendente.',
      description: 'Baixe a autorização preenchida, colha a assinatura do responsável e envie o documento assinado ou registre a entrega presencial.'
    },
    uploaded: {
      badge: 'Em conferência',
      title: 'Autorização enviada.',
      description: 'O documento foi enviado e aguarda a conferência da organização.'
    },
    received: {
      badge: 'Recebida',
      title: 'Autorização recebida.',
      description: 'A organização recebeu o documento e está conferindo as informações.'
    },
    physical_pending: {
      badge: 'Presencial',
      title: 'Entrega presencial registrada.',
      description: 'A organização aguardará a entrega da autorização assinada no evento.'
    },
    rejected: {
      badge: 'Ajuste necessário',
      title: 'Autorização precisa de correção.',
      description: 'A organização solicitou uma nova conferência. Envie uma versão corrigida do documento.'
    }
  };
  return copy[status] || {
    badge: 'Pendente',
    title: 'Autorização pendente.',
    description: 'Baixe a autorização, assine com o responsável e envie o documento ou registre a entrega presencial.'
  };
}

export function renderRegistrationAuthorization(
  root: HTMLElement,
  data: RegistrationAuthorizationViewData,
  onReload?: () => Promise<void> | void
) {
  const variant = root.dataset.authorizationVariant || 'management';
  const auth = data.guardian && data.minorAuthorization ? data.minorAuthorization : null;
  if (!auth) {
    root.hidden = variant === 'success';
    if (variant === 'management') {
      const status = root.querySelector<HTMLElement>('[data-authorization-status]');
      const badge = root.querySelector<HTMLElement>('[data-authorization-badge]');
      const actions = root.querySelector<HTMLElement>('[data-authorization-actions]');
      if (status) status.innerHTML = '<strong>Participante maior de idade.</strong><span>Autorização de responsável não se aplica a esta inscrição.</span>';
      if (badge) badge.textContent = 'Não se aplica';
      if (actions) actions.hidden = true;
    }
    return;
  }

  root.hidden = false;
  const covered = auth.coversCurrentCompetition && (auth.status === 'uploaded' || auth.status === 'received');
  const copy = statusCopy(auth.status, covered);
  const status = root.querySelector<HTMLElement>('[data-authorization-status]');
  const badge = root.querySelector<HTMLElement>('[data-authorization-badge]');
  const actions = root.querySelector<HTMLElement>('[data-authorization-actions]');
  const filled = root.querySelector<HTMLAnchorElement>('[data-authorization-filled]');
  const blank = root.querySelector<HTMLAnchorElement>('[data-authorization-blank]');
  if (status) {
    status.replaceChildren();
    const title = document.createElement('strong');
    title.textContent = copy.title;
    const description = document.createElement('span');
    description.textContent = `${copy.description} Versão ${auth.version}.`;
    status.append(title, description);
    status.dataset.authorizationState = auth.status;
  }
  if (badge) {
    badge.textContent = copy.badge;
    badge.dataset.authorizationState = auth.status;
  }
  if (actions) actions.hidden = covered;
  const base = registrationApiUrl('inscricao/autorizacao');
  if (filled) filled.href = `${base}?format=filled`;
  if (blank) blank.href = `${base}?format=blank`;

  if (root.dataset.authorizationBound === 'true') return;
  root.dataset.authorizationBound = 'true';
  const uploadInput = root.querySelector<HTMLInputElement>('[data-authorization-upload-input]');
  const uploadButton = root.querySelector<HTMLButtonElement>('[data-upload-authorization]');
  const physicalButton = root.querySelector<HTMLButtonElement>('[data-physical-authorization]');
  const feedback = root.querySelector<HTMLElement>('[data-authorization-feedback]');
  uploadButton?.addEventListener('click', () => uploadInput?.click());
  uploadInput?.addEventListener('change', async () => {
    const file = uploadInput.files?.[0];
    if (!file) return;
    const form = new FormData();
    form.append('fileType', 'guardian_authorization_signed');
    form.append('file', file, file.name);
    if (feedback) feedback.textContent = 'Enviando autorização assinada…';
    try {
      await postRegistrationAction('inscricao/arquivo', form);
      if (feedback) feedback.textContent = 'Autorização enviada. A situação será atualizada após a sincronização.';
      await onReload?.();
    } catch (error) {
      if (feedback) feedback.textContent = error instanceof RegistrationApiError ? error.message : 'Não foi possível enviar a autorização assinada.';
    } finally {
      uploadInput.value = '';
    }
  });
  physicalButton?.addEventListener('click', async () => {
    const form = new FormData();
    form.append('action', 'physical_pending');
    if (feedback) feedback.textContent = 'Registrando entrega presencial…';
    try {
      await postRegistrationAction('inscricao/autorizacao', form);
      if (feedback) feedback.textContent = 'Entrega presencial registrada.';
      await onReload?.();
    } catch (error) {
      if (feedback) feedback.textContent = error instanceof RegistrationApiError ? error.message : 'Não foi possível registrar a entrega presencial.';
    }
  });
}
