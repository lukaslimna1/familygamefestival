import type { APIRoute } from 'astro';
import { updateAdminRegistrationParticipant } from '../../../../lib/server/admin/data';

export const prerender = false;

function sameOrigin(request: Request) {
  const origin = request.headers.get('origin');
  return !origin || origin === new URL(request.url).origin;
}

function redirectTo(id: string, state: '1' | 'error') {
  return new Response(null, {
    status: 303,
    headers: {
      'Cache-Control': 'no-store',
      Location: '/admin/inscricoes/' + id + '?saved=' + state
    }
  });
}

export const POST: APIRoute = async ({ request, params }) => {
  const id = params.id;
  if (!id || !sameOrigin(request)) return new Response('Requisição inválida.', { status: 403, headers: { 'Cache-Control': 'no-store' } });
  try {
    const form = await request.formData();
    const value = (name: string) => {
      const entry = form.get(name);
      return typeof entry === 'string' ? entry : '';
    };
    await updateAdminRegistrationParticipant(id, {
      fullName: value('fullName'),
      cpf: value('cpf'),
      phone: value('phone'),
      email: value('email'),
      dateOfBirth: value('dateOfBirth'),
      city: value('city'),
      state: value('state'),
      instagram: value('instagram'),
      tiktok: value('tiktok'),
      facebook: value('facebook'),
      otherSocials: value('otherSocials')
    });
    return redirectTo(id, '1');
  } catch {
    return redirectTo(id, 'error');
  }
};
