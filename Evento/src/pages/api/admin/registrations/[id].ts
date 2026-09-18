import type { APIRoute } from 'astro';

export const prerender = false;

export const POST: APIRoute = async ({ locals }) => {
  if (!locals.admin) return new Response('Não autenticado.', { status: 401 });
  return new Response('A edição administrativa de cadastros está desativada. Use o fluxo de atualização do próprio participante.', {
    status: 403,
    headers: { 'Cache-Control': 'no-store' }
  });
};
