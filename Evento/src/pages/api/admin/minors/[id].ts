import type { APIRoute } from 'astro';
import { updateAdminMinorAuthorization } from '../../../../lib/server/admin/data';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return new Response('Requisição inválida.', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  try {
    const form = await request.formData();
    const action = form.get('action');
    const id = new URL(request.url).pathname.split('/').filter(Boolean).at(-1);
    if (!id || (action !== 'received' && action !== 'rejected')) throw new Error('Ação inválida.');
    const reason = form.get('rejectionReason');
    await updateAdminMinorAuthorization(id, action, typeof reason === 'string' ? reason : undefined);
    return new Response(null, { status: 303, headers: { 'Cache-Control': 'no-store', Location: '/admin/menores?saved=1' } });
  } catch {
    return new Response(null, { status: 303, headers: { 'Cache-Control': 'no-store', Location: '/admin/menores?saved=error' } });
  }
};
