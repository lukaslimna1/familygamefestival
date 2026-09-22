import type { APIRoute } from 'astro';
import { z } from 'zod';
import { createFeedback, FEEDBACK_CATEGORIES, type PublicationConsent } from '../../../lib/server/feedback/repository';
import { checkRateLimit, getClientIp } from '../../../lib/server/security/rateLimit';

export const prerender = false;

const feedbackSchema = z.object({
  tipo: z.enum(['sugestao', 'elogio', 'reclamacao'], {
    message: 'Selecione se é uma sugestão, elogio ou reclamação.'
  }),
  estrelas: z.coerce.number().int().min(1, 'Avalie de 1 a 5 estrelas.').max(5, 'Avalie de 1 a 5 estrelas.'),
  categoria: z.string().trim().min(1, 'Selecione uma categoria sobre o que deseja falar.'),
  mensagem: z.string().trim().min(10, 'A mensagem deve conter pelo menos 10 caracteres.').max(2500, 'A mensagem não pode ultrapassar 2.500 caracteres.'),
  anonimo: z.union([z.boolean(), z.string().transform((v) => v === 'true' || v === '1' || v === 'on')]).default(false),
  nome: z.string().trim().max(100).optional().nullable(),
  email: z.string().trim().email('E-mail informado é inválido.').max(150).optional().nullable().or(z.literal('')),
  telefone: z.string().trim().max(30).optional().nullable().or(z.literal('')),
  instagram: z.string().trim().max(120).optional().nullable().or(z.literal('')),
  permiteContato: z.union([z.boolean(), z.string().transform((v) => v === 'true' || v === '1' || v === 'on')]).default(false),
  autorizacaoPublicacao: z.enum(['nome', 'anonimo', 'nao'], {
    message: 'Selecione uma opção de autorização de publicação.'
  }),
  // Honeypot field para bloqueio de spambots
  hp_website: z.string().optional()
});

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limit por IP para prevenir abuso automatizado (máximo 6 tentativas por minuto)
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(clientIp, 'feedback_submit', { windowMs: 60_000, max: 6 });
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Muitas mensagens enviadas em pouco tempo. Por favor, aguarde alguns instantes antes de enviar novamente.'
      }), {
        status: 429,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store',
          'Retry-After': String(rateCheck.retryAfterSeconds)
        }
      });
    }

    let payload: Record<string, unknown> = {};

    const contentType = request.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      payload = await request.json();
    } else {
      const formData = await request.formData();
      formData.forEach((value, key) => {
        payload[key] = value;
      });
    }

    // Se o campo honeypot foi preenchido por um bot, finge sucesso sem salvar nada
    if (typeof payload.hp_website === 'string' && payload.hp_website.trim().length > 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Recebemos sua mensagem.'
      }), {
        status: 201,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store'
        }
      });
    }

    const parsed = feedbackSchema.safeParse(payload);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Dados de feedback inválidos.';
      return new Response(JSON.stringify({
        success: false,
        error: firstError,
        details: parsed.error.flatten().fieldErrors
      }), {
        status: 400,
        headers: {
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-store'
        }
      });
    }

    const data = parsed.data;

    // Se o usuário não for anônimo, nome e e-mail são obrigatórios para permitir identificação
    if (!data.anonimo) {
      if (!data.nome || data.nome.trim().length < 2) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Por favor, informe seu nome ou opte por enviar anonimamente.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
        });
      }
      if (!data.email || data.email.trim().length < 5) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Por favor, informe um e-mail válido para identificação.'
        }), {
          status: 400,
          headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
        });
      }
    }

    const autorizacaoFinal: PublicationConsent =
      data.anonimo && data.autorizacaoPublicacao === 'nome'
        ? 'anonimo'
        : (data.autorizacaoPublicacao as PublicationConsent);

    await createFeedback({
      tipo: data.tipo,
      estrelas: data.estrelas,
      categoria: data.categoria,
      mensagem: data.mensagem,
      anonimo: data.anonimo,
      nome: data.anonimo ? null : data.nome,
      email: data.anonimo ? null : data.email,
      telefone: data.anonimo ? null : (data.telefone || null),
      instagram: data.anonimo ? null : (data.instagram || null),
      permiteContato: data.anonimo ? false : data.permiteContato,
      autorizacaoPublicacao: autorizacaoFinal
    });

    return new Response(JSON.stringify({
      success: true,
      message: 'Recebemos sua mensagem. Obrigado por jogar com a gente!'
    }), {
      status: 201,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  } catch (error) {
    console.error('Erro ao processar feedback:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Ocorreu um erro ao registrar sua manifestação. Tente novamente em instantes.'
    }), {
      status: 500,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Cache-Control': 'no-store'
      }
    });
  }
};
