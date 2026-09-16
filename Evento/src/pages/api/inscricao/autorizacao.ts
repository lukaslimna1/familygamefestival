import type { APIRoute } from 'astro';
import { eq } from 'drizzle-orm';
import competitionDefinitions from '../../../config/competitions.json';
import { getRegistrationByAccess } from '../../../lib/server/db/repository';
import { minorAuthorizations } from '../../../lib/server/db/schema';
import { getDatabase } from '../../../lib/server/db/client';
import { createGuardianAuthorizationPdf } from '../../../lib/server/pdf/registration-sheet';
import { PUBLIC_REGISTRATION_ACCESS_COOKIE, verifyPublicRegistrationAccessToken } from '../../../lib/server/registration/access';
import { getRegistrationWindowStatus } from '../../../lib/server/registration/config';

export const prerender = false;

const authorizationCompetitions = competitionDefinitions.map((competition) => ({
  id: competition.id,
  title: competition.name,
  category: competition.category,
  eventDay: competition.eventDay,
  eventDate: competition.eventDate,
  displayDate: competition.displayDate,
  startTime: competition.startTime
}));

function pdfResponse(bytes: Uint8Array, fileName: string, disposition: 'inline' | 'attachment' = 'attachment') {
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  return new Response(body, {
    status: 200,
    headers: {
      'Cache-Control': 'private, no-store',
      'Content-Type': 'application/pdf',
      'Content-Disposition': `${disposition}; filename="${fileName.replace(/["\r\n]/g, '')}"`
    }
  });
}

export const GET: APIRoute = async ({ request, cookies }) => {
  const format = new URL(request.url).searchParams.get('format') ?? 'filled';
  if (!['blank', 'filled'].includes(format)) {
    return new Response(JSON.stringify({ error: { code: 'invalid', message: 'Formato de autorização inválido.' } }), {
      status: 400,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }
    });
  }

  if (format === 'blank') {
    const bytes = await createGuardianAuthorizationPdf({
      mode: format,
      competitions: authorizationCompetitions,
      generatedAt: new Date().toISOString()
    });
    return pdfResponse(bytes, 'Autorizacao em Branco - Family Game Festival 2026.pdf');
  }

  const access = await verifyPublicRegistrationAccessToken(cookies.get(PUBLIC_REGISTRATION_ACCESS_COOKIE)?.value);
  if (!access) return new Response('Não autorizado.', { status: 401, headers: { 'Cache-Control': 'no-store' } });
  const registration = await getRegistrationByAccess(access.registrationId, access.publicCode);
  if (!registration?.guardian || !registration.minorAuthorization) return new Response('Autorização não encontrada.', { status: 404, headers: { 'Cache-Control': 'no-store' } });

  const bytes = await createGuardianAuthorizationPdf({
    mode: 'filled',
    publicCode: registration.publicCode,
    version: registration.minorAuthorization.version,
    participant: {
      fullName: registration.fullName,
      cpf: registration.cpf,
      dateOfBirth: registration.dateOfBirth
    },
    guardian: registration.guardian,
    competitions: authorizationCompetitions,
    selectedCompetitionIds: registration.minorAuthorization.competitionIds,
    location: 'Arena Tauste - SORRI Bauru',
    eventDates: '19 e 20 de setembro de 2026',
    generatedAt: new Date().toISOString()
  });
  return pdfResponse(bytes, `${registration.publicCode}-Autorizacao-V${registration.minorAuthorization.version}.pdf`, 'inline');
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const access = await verifyPublicRegistrationAccessToken(cookies.get(PUBLIC_REGISTRATION_ACCESS_COOKIE)?.value);
  if (!access || !getRegistrationWindowStatus().open) return new Response(null, { status: 303, headers: { Location: `/inscricao/minha?error=${access ? 'closed' : 'invalid'}` } });
  try {
    const form = await request.formData();
    if (form.get('action') !== 'physical_pending') return new Response(null, { status: 303, headers: { Location: '/inscricao/minha?error=file' } });
    const registration = await getRegistrationByAccess(access.registrationId, access.publicCode);
    if (!registration?.minorAuthorization) return new Response(null, { status: 303, headers: { Location: '/inscricao/minha?error=invalid' } });
    await getDatabase().update(minorAuthorizations).set({
      status: 'physical_pending',
      deliveryType: 'physical',
      updatedAt: new Date().toISOString()
    }).where(eq(minorAuthorizations.id, registration.minorAuthorization.id));
    return new Response(null, { status: 303, headers: { 'Cache-Control': 'no-store', Location: '/inscricao/minha?file=1' } });
  } catch {
    return new Response(null, { status: 303, headers: { 'Cache-Control': 'no-store', Location: '/inscricao/minha?error=file' } });
  }
};
