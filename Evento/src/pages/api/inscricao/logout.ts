import type { APIRoute } from 'astro';
import { getPublicRegistrationAccessCookieOptions, PUBLIC_REGISTRATION_ACCESS_COOKIE } from '../../../lib/server/registration/access';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  cookies.delete(PUBLIC_REGISTRATION_ACCESS_COOKIE, getPublicRegistrationAccessCookieOptions(request));
  return new Response(null, { status: 303, headers: { 'Cache-Control': 'no-store', Location: '/inscricao/acessar' } });
};
