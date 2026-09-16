import type { APIRoute } from 'astro';
import { findRegistrationByCredentials } from '../../../lib/server/db/repository';
import {
  createPublicRegistrationAccessToken,
  getPublicRegistrationAccessCookieOptions,
  PUBLIC_REGISTRATION_ACCESS_COOKIE
} from '../../../lib/server/registration/access';
import {
  clearPublicAccessFailures,
  getPublicAccessAttemptKey,
  isPublicAccessRateLimited,
  recordPublicAccessFailure
} from '../../../lib/server/registration/rate-limit';

export const prerender = false;

function text(form: FormData, name: string) {
  const value = form.get(name);
  return typeof value === 'string' ? value.trim() : '';
}

function redirect(request: Request, error?: 'invalid' | 'rate' | 'unavailable') {
  const url = new URL('/inscricao/acessar', request.url);
  if (request.headers.get('accept')?.includes('application/json')) {
    return new Response(JSON.stringify(error
      ? { error: { code: error, message: error === 'rate' ? 'Muitas tentativas. Aguarde alguns minutos.' : 'Código público ou CPF inválido.' } }
      : { data: { authenticated: true, redirect: '/inscricao/minha' } }), {
      status: error === 'rate' ? 429 : error ? 401 : 200,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
  if (error) url.searchParams.set('error', error);
  return new Response(null, { status: 303, headers: { 'Cache-Control': 'no-store', Location: url.toString() } });
}

export const POST: APIRoute = async ({ request, cookies }) => {
  let publicCode = '';
  let cpf = '';
  try {
    const form = await request.formData();
    publicCode = text(form, 'publicCode').toUpperCase();
    cpf = text(form, 'cpf');
  } catch {
    return redirect(request, 'invalid');
  }

  const rateKey = getPublicAccessAttemptKey(request, publicCode || 'invalid');
  const rateLimit = isPublicAccessRateLimited(rateKey);
  if (rateLimit.limited) return redirect(request, 'rate');

  try {
    const registration = await findRegistrationByCredentials(publicCode, cpf);
    if (!registration?.registrationId || !registration.publicCode) {
      recordPublicAccessFailure(rateKey);
      return redirect(request, 'invalid');
    }

    clearPublicAccessFailures(rateKey);
    const token = await createPublicRegistrationAccessToken(registration.registrationId, registration.publicCode);
    cookies.set(PUBLIC_REGISTRATION_ACCESS_COOKIE, token, getPublicRegistrationAccessCookieOptions(request));
    if (request.headers.get('accept')?.includes('application/json')) {
      return new Response(JSON.stringify({ data: { authenticated: true, redirect: '/inscricao/minha' } }), {
        status: 200,
        headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }
      });
    }
    return new Response(null, { status: 303, headers: { 'Cache-Control': 'no-store', Location: '/inscricao/minha' } });
  } catch {
    return redirect(request, 'unavailable');
  }
};
