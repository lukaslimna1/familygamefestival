import type { APIRoute } from 'astro';
import { ADMIN_REVIEW_STATUSES, updateAdminReviewStatus, type AdminReviewStatus } from '../../../../../lib/server/admin/data';

export const prerender = false;

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

function safeReturnTo(value: FormDataEntryValue | null, id: string) {
  return typeof value === 'string' && value.startsWith('/admin/') && !value.startsWith('//')
    ? value
    : '/admin/inscricoes/' + id;
}

export const POST: APIRoute = async ({ request, params, locals }) => {
  const id = params.id;
  if (!locals.admin) return new Response('Não autenticado.', { status: 401 });
  if (locals.admin.mustChangePassword) return new Response('Troca de senha obrigatória.', { status: 403 });
  if (!id || !sameOrigin(request)) return new Response('Requisição inválida.', { status: 403 });

  const form = await request.formData();
  const status = form.get('status');
  if (typeof status !== 'string' || !ADMIN_REVIEW_STATUSES.includes(status as AdminReviewStatus)) {
    return new Response('Status de conferência inválido.', { status: 400 });
  }

  try {
    await updateAdminReviewStatus(id, status as AdminReviewStatus);
    return new Response(null, { status: 303, headers: { 'Cache-Control': 'no-store', Location: safeReturnTo(form.get('returnTo'), id) + '?review=1' } });
  } catch {
    return new Response(null, { status: 303, headers: { 'Cache-Control': 'no-store', Location: safeReturnTo(form.get('returnTo'), id) + '?review=error' } });
  }
};
