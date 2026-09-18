import type { APIRoute } from 'astro';
import { getRegistrationByAccess, RegistrationError, updatePublicRegistration } from '../../../lib/server/db/repository';
import { syncRegistrationToDrive } from '../../../lib/server/drive/registration-sync';
import { PUBLIC_REGISTRATION_ACCESS_COOKIE, verifyPublicRegistrationAccessToken } from '../../../lib/server/registration/access';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  const access = await verifyPublicRegistrationAccessToken(cookies.get(PUBLIC_REGISTRATION_ACCESS_COOKIE)?.value);
  if (!access) return new Response(JSON.stringify({ error: { code: 'unauthorized', message: 'Acesso inválido.' } }), {
    status: 401,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }
  });
  const registration = await getRegistrationByAccess(access.registrationId, access.publicCode);
  if (!registration) return new Response(JSON.stringify({ error: { code: 'not_found', message: 'Inscrição não encontrada.' } }), {
    status: 404,
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }
  });
  return new Response(JSON.stringify({ data: {
    registration: {
      registrationId: registration.registrationId,
      publicCode: registration.publicCode,
      status: registration.status,
      eventAccessIncluded: registration.eventAccessIncluded,
      submittedAt: registration.submittedAt,
      updatedAt: registration.registrationUpdatedAt
    },
    participant: {
      fullName: registration.fullName,
      cpf: registration.cpf,
      phone: registration.phone,
      email: registration.email,
      dateOfBirth: registration.dateOfBirth,
      city: registration.city,
      state: registration.state,
      instagram: registration.instagram,
      tiktok: registration.tiktok,
      facebook: registration.facebook,
      otherSocials: registration.otherSocials
    },
    competition: {
      id: registration.competitionId,
      title: registration.competitionTitle,
      category: registration.competitionCategory,
      eventDay: registration.competitionEventDay,
      eventDate: registration.competitionEventDate,
      startTime: registration.competitionStartTime
    },
    guardian: registration.guardian,
    minorAuthorization: registration.minorAuthorization ? {
      id: registration.minorAuthorization.id,
      version: registration.minorAuthorization.version,
      competitionIds: registration.minorAuthorization.competitionIds,
      status: registration.minorAuthorization.status,
      generatedFileId: registration.minorAuthorization.generatedFileId,
      signedDriveFileId: registration.minorAuthorization.signedDriveFileId,
      deliveryType: registration.minorAuthorization.deliveryType,
      requestedAt: registration.minorAuthorization.requestedAt,
      uploadedAt: registration.minorAuthorization.uploadedAt,
      receivedAt: registration.minorAuthorization.receivedAt,
      rejectionReason: registration.minorAuthorization.rejectionReason,
      coversCurrentCompetition: registration.minorAuthorization.coversCurrentCompetition
    } : null,
    minorAuthorizationHistory: registration.minorAuthorizationHistory,
    cosplay: registration.cosplay,
    kpop: registration.kpop,
    links: registration.links,
    consents: registration.consents,
    files: registration.files.map(({ id, fileType, originalName, mimeType, sizeBytes, authorizationVersion, syncStatus, createdAt, updatedAt }) => ({ id, fileType, originalName, mimeType, sizeBytes, authorizationVersion, syncStatus, createdAt, updatedAt }))
  } }), {
    headers: { 'Cache-Control': 'private, no-store', 'Content-Type': 'application/json; charset=utf-8' }
  });
};

function text(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function redirect(request: Request, query: string, message?: string) {
  if (request.headers.get('accept')?.includes('application/json')) {
    const [key, value] = query.split('=');
    return new Response(JSON.stringify({ data: value === '1' ? { saved: true } : undefined, ...(key?.startsWith('error') ? { error: { code: value, message: message || 'Não foi possível salvar as alterações.' } } : {}) }), {
      status: value === 'closed' ? 410 : value === 'invalid' ? 401 : 200,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
  return new Response(null, {
    status: 303,
    headers: { 'Cache-Control': 'no-store', Location: `/inscricao/minha?${query}` }
  });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const access = await verifyPublicRegistrationAccessToken(cookies.get(PUBLIC_REGISTRATION_ACCESS_COOKIE)?.value);
  if (!access) return redirect(request, 'error=invalid');

  try {
    const current = await getRegistrationByAccess(access.registrationId, access.publicCode);
    if (!current) return redirect(request, 'error=invalid');
    const form = await request.formData();
    const labels = form.getAll('referenceLinkLabel').filter((value): value is string => typeof value === 'string');
    const urls = form.getAll('referenceLinkUrl').filter((value): value is string => typeof value === 'string');
    const links = labels
      .map((label, index) => ({ label: label.trim(), url: (urls[index] ?? '').trim() }))
      .filter((link) => link.label || link.url);

    const update: Parameters<typeof updatePublicRegistration>[1] = {
      phone: text(form, 'phone'),
      email: text(form, 'email'),
      instagram: text(form, 'instagram'),
      tiktok: text(form, 'tiktok'),
      facebook: text(form, 'facebook'),
      otherSocials: text(form, 'otherSocials'),
      ...(labels.length > 0 || urls.length > 0 ? { links } : {})
    };
    if (current.cosplay) {
      Object.assign(update, {
        stageName: text(form, 'stageName'),
        stageCallName: text(form, 'stageCallName'),
        characterName: text(form, 'characterName'),
        sourceWork: text(form, 'sourceWork'),
        cosplayDescription: text(form, 'cosplayDescription'),
        presentationDescription: text(form, 'presentationDescription'),
        presentationNotes: text(form, 'presentationNotes'),
        technicalNotes: text(form, 'technicalNotes'),
        judgeNotes: text(form, 'judgeNotes'),
        musicTitle: text(form, 'musicTitle')
      });
    } else if (current.kpop) {
      Object.assign(update, {
        stageName: text(form, 'stageName'),
        originalArtist: text(form, 'originalArtist'),
        songTitle: text(form, 'songTitle'),
        songVersion: text(form, 'songVersion'),
        editedCut: text(form, 'editedCut'),
        referenceUrl: text(form, 'referenceUrl'),
        audioNotes: text(form, 'audioNotes'),
        judgeNotes: text(form, 'judgeNotes')
      });
    }
    const updated = await updatePublicRegistration(access.registrationId, update);
    if (!updated) return redirect(request, 'error=invalid');

    try {
      await syncRegistrationToDrive(access.registrationId);
    } catch {
      // A falha de sincronização não desfaz a alteração já gravada no Turso.
    }
    return redirect(request, 'saved=1');
  } catch (error) {
    if (error instanceof RegistrationError && error.code === 'online_closed') return redirect(request, 'error=closed', error.message);
    return redirect(request, 'error=invalid', error instanceof RegistrationError ? error.message : undefined);
  }
};
