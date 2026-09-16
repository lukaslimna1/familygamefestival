import type { APIRoute } from 'astro';
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionCookieOptions,
  revokeAdminSession
} from '../../../lib/server/auth/session';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get(ADMIN_SESSION_COOKIE)?.value;
  try {
    await revokeAdminSession(token);
  } catch {
    // A logout must still clear the browser cookie if the database is unavailable.
  }

  cookies.delete(ADMIN_SESSION_COOKIE, getAdminSessionCookieOptions(request));
  return new Response(null, {
    status: 303,
    headers: {
      'Cache-Control': 'no-store',
      Location: '/admin/login'
    }
  });
};
