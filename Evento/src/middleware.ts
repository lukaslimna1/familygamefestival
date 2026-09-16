import { defineMiddleware } from 'astro:middleware';
import { ADMIN_SESSION_COOKIE, resolveAdminSession } from './lib/server/auth/session';

function isProtectedPath(pathname: string) {
  return pathname === '/admin' || pathname.startsWith('/admin/') || pathname === '/api/admin' || pathname.startsWith('/api/admin/');
}

function isPublicAdminPath(pathname: string) {
  return pathname === '/admin/login' || pathname === '/api/admin/login';
}

function isFirstAccessAllowedPath(pathname: string) {
  return pathname === '/admin/account/password'
    || pathname === '/api/admin/account/password'
    || pathname === '/api/admin/logout';
}

function markPrivate(response: Response) {
  response.headers.set('Cache-Control', 'private, no-store');
  return response;
}

export const onRequest = defineMiddleware(async (context, next) => {
  const pathname = new URL(context.request.url).pathname;
  if (!isProtectedPath(pathname)) return next();
  if (isPublicAdminPath(pathname)) return markPrivate(await next());

  const token = context.cookies.get(ADMIN_SESSION_COOKIE)?.value;
  let admin = null;
  try {
    admin = await resolveAdminSession(token);
  } catch {
    // Protected routes fail closed without exposing database/configuration details.
  }
  if (!admin) {
    context.cookies.delete(ADMIN_SESSION_COOKIE, { path: '/' });
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
        status: 401,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
    }
    return markPrivate(context.redirect('/admin/login', 302));
  }

  context.locals.admin = admin;
  if (admin.mustChangePassword && !isFirstAccessAllowedPath(pathname)) {
    if (pathname.startsWith('/api/')) {
      return new Response(JSON.stringify({ error: 'Troca de senha obrigatória.' }), {
        status: 403,
        headers: {
          'Cache-Control': 'no-store',
          'Content-Type': 'application/json; charset=utf-8'
        }
      });
    }
    return markPrivate(context.redirect('/admin/account/password', 302));
  }

  return markPrivate(await next());
});
