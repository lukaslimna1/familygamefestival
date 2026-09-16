import type { APIRoute } from 'astro';
import {
  findActiveAdminById,
  updateAdminPassword
} from '../../../../lib/server/auth/admin-repository';
import { hashAdminPassword, verifyAdminPassword } from '../../../../lib/server/auth/password';
import {
  ADMIN_SESSION_COOKIE,
  getAdminSessionCookieOptions,
  resolveAdminSession,
  revokeAllAdminSessions
} from '../../../../lib/server/auth/session';

export const prerender = false;

function redirectToPasswordPage(error?: 'current' | 'weak' | 'mismatch' | 'unavailable') {
  const location = error ? `/admin/account/password?error=${error}` : '/admin/account/password';
  return new Response(null, {
    status: 303,
    headers: {
      'Cache-Control': 'no-store',
      Location: location
    }
  });
}

function formText(value: FormDataEntryValue | null) {
  return typeof value === 'string' ? value : '';
}

export const POST: APIRoute = async ({ request, cookies }) => {
  const token = cookies.get(ADMIN_SESSION_COOKIE)?.value;
  let session;
  try {
    session = await resolveAdminSession(token);
  } catch {
    return redirectToPasswordPage('unavailable');
  }
  if (!session) {
    cookies.delete(ADMIN_SESSION_COOKIE, { path: '/' });
    return new Response(null, {
      status: 303,
      headers: { 'Cache-Control': 'no-store', Location: '/admin/login' }
    });
  }

  try {
    const form = await request.formData();
    const currentPassword = formText(form.get('currentPassword'));
    const newPassword = formText(form.get('newPassword'));
    const confirmation = formText(form.get('confirmation'));
    const admin = await findActiveAdminById(session.adminId);

    if (!admin || !(await verifyAdminPassword(currentPassword, admin.passwordHash))) {
      return redirectToPasswordPage('current');
    }
    if (newPassword.length < 12 || newPassword.length > 256) {
      return redirectToPasswordPage('weak');
    }
    if (newPassword !== confirmation) {
      return redirectToPasswordPage('mismatch');
    }

    const passwordHash = await hashAdminPassword(newPassword);
    await revokeAllAdminSessions(admin.id);
    await updateAdminPassword(admin.id, passwordHash, false);
    cookies.delete(ADMIN_SESSION_COOKIE, getAdminSessionCookieOptions(request));

    return new Response(null, {
      status: 303,
      headers: {
        'Cache-Control': 'no-store',
        Location: '/admin/login?password_changed=1'
      }
    });
  } catch {
    return redirectToPasswordPage('unavailable');
  }
};
