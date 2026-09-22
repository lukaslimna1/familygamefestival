import type { APIRoute } from 'astro';
import { z } from 'zod';
import {
  getAdminFeedbackById,
  updateFeedbackStatus,
  updateFeedbackInternalNote,
  updateFeedbackReply,
  updateFeedbackPublication,
  type FeedbackStatus
} from '../../../../lib/server/feedback/repository';

export const prerender = false;

const actionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('status'),
    status: z.enum(['novo', 'lido', 'em_analise', 'respondido', 'resolvido', 'arquivado'])
  }),
  z.object({
    action: z.literal('note'),
    notaInterna: z.string().max(3000)
  }),
  z.object({
    action: z.literal('reply'),
    resposta: z.string().trim().min(2, 'A resposta não pode estar em branco.').max(4000)
  }),
  z.object({
    action: z.literal('publish'),
    publicadoSite: z.boolean(),
    textoPublico: z.string().trim().max(2500).optional().nullable(),
    destaque: z.boolean().default(false)
  })
]);

export const POST: APIRoute = async ({ params, request, locals }) => {
  const admin = locals.admin;
  if (!admin) {
    return new Response(JSON.stringify({ error: 'Não autenticado.' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }

  const id = params.id;
  if (!id) {
    return new Response(JSON.stringify({ error: 'ID do feedback não informado.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }

  const feedback = await getAdminFeedbackById(id);
  if (!feedback) {
    return new Response(JSON.stringify({ error: 'Feedback não encontrado.' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }

  try {
    let payload: Record<string, unknown> = {};
    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        if (value === 'true' || value === 'false') {
          payload[key] = value === 'true';
        } else {
          payload[key] = value;
        }
      });
    }

    const parsed = actionSchema.safeParse(payload);
    if (!parsed.success) {
      return new Response(JSON.stringify({
        error: parsed.error.issues[0]?.message || 'Ação inválida.',
        details: parsed.error.flatten()
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    const data = parsed.data;

    if (data.action === 'status') {
      const updated = await updateFeedbackStatus(id, data.status as FeedbackStatus);
      return new Response(JSON.stringify({ success: true, updated }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    if (data.action === 'note') {
      const updated = await updateFeedbackInternalNote(id, data.notaInterna);
      return new Response(JSON.stringify({ success: true, updated }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    if (data.action === 'reply') {
      const responder = admin.displayName || `@${admin.username}`;
      const updated = await updateFeedbackReply(id, {
        resposta: data.resposta,
        respondidoPor: responder
      });
      return new Response(JSON.stringify({ success: true, updated }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    if (data.action === 'publish') {
      if (feedback.autorizacaoPublicacao === 'nao' && data.publicadoSite) {
        return new Response(JSON.stringify({
          error: 'Este feedback não foi autorizado pelo autor para publicação pública.'
        }), {
          status: 403,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
        });
      }

      const updated = await updateFeedbackPublication(id, {
        publicadoSite: data.publicadoSite,
        textoPublico: feedback.mensagem,
        destaque: data.destaque
      });
      return new Response(JSON.stringify({ success: true, updated }), {
        status: 200,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    return new Response(JSON.stringify({ error: 'Ação não suportada.' }), {
      status: 400,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  } catch (error: any) {
    return new Response(JSON.stringify({
      error: error?.message || 'Erro ao processar solicitação.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
};
