import type { APIRoute } from 'astro';
import { updateAdminDisplayName } from '../../../../lib/server/auth/admin-repository';

export const prerender = false;

export const POST: APIRoute = async ({ request, locals }) => {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return new Response('Requisição inválida.', { status: 403 });
  if (!locals.admin) return new Response('Não autenticado.', { status: 401 });
  try {
    const form = await request.formData();
    const displayName = form.get('displayName');
    if (typeof displayName !== 'string') throw new Error('Nome inválido.');
    await updateAdminDisplayName(locals.admin.adminId, displayName);
    return new Response(null, { status: 303, headers: { 'Cache-Control': 'no-store', Location: '/admin/configuracoes?saved=1' } });
  } catch {
    return new Response(null, { status: 303, headers: { 'Cache-Control': 'no-store', Location: '/admin/configuracoes?saved=error' } });
  }
};
