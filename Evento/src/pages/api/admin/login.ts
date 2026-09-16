import { randomBytes } from 'node:crypto';
import type { APIRoute } from 'astro';
import {
  clearLoginFailures,
  getLoginRateLimitKey,
  isLoginRateLimited,
  recordLoginFailure
} from '../../../lib/server/auth/login-rate-limit';
import {
  findAdminByUsername,
  normalizeAdminUsername,
  updateAdminLastLogin
} from '../../../lib/server/auth/admin-repository';
import { hashAdminPassword, verifyAdminPassword } from '../../../lib/server/auth/password';
import {
  ADMIN_SESSION_COOKIE,
  createAdminSession,
  getAdminSessionCookieOptions
} from '../../../lib/server/auth/session';

export const prerender = false;

const dummyPasswordHash = hashAdminPassword(randomBytes(32).toString('base64url'));

function redirectToLogin(error?: 'invalid' | 'rate' | 'unavailable') {
  const location = error ? `/admin/login?error=${error}` : '/admin/login';
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
  let username = '';
  let password = '';

  try {
    const form = await request.formData();
    username = normalizeAdminUsername(formText(form.get('username')));
    password = formText(form.get('password'));
  } catch {
    return redirectToLogin('invalid');
  }

  const rateLimitKey = getLoginRateLimitKey(username || 'invalid', request);
  const rateLimit = isLoginRateLimited(rateLimitKey);
  if (rateLimit.limited) {
    return new Response(null, {
      status: 303,
      headers: {
        'Cache-Control': 'no-store',
        'Retry-After': String(rateLimit.retryAfterSeconds),
        Location: '/admin/login?error=rate'
      }
    });
  }

  try {
    const admin = username ? await findAdminByUsername(username) : null;
    const passwordHash = admin?.passwordHash ?? await dummyPasswordHash;
    const validPassword = await verifyAdminPassword(password, passwordHash);

    if (!admin || admin.status !== 'active' || !validPassword) {
      recordLoginFailure(rateLimitKey);
      return redirectToLogin('invalid');
    }

    clearLoginFailures(rateLimitKey);
    await updateAdminLastLogin(admin.id);
    const session = await createAdminSession(admin.id);
    cookies.set(
      ADMIN_SESSION_COOKIE,
      session.token,
      getAdminSessionCookieOptions(request)
    );
    return new Response(null, {
      status: 303,
      headers: {
        'Cache-Control': 'no-store',
        Location: admin.mustChangePassword ? '/admin/account/password' : '/admin'
      }
    });
  } catch {
    return redirectToLogin('unavailable');
  }
};
