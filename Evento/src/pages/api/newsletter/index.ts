import type { APIRoute } from 'astro';
import { z } from 'zod';
import { subscribeNewsletter } from '../../../lib/server/newsletter/repository';
import { checkRateLimit, getClientIp } from '../../../lib/server/security/rateLimit';

export const prerender = false;

const newsletterSchema = z.object({
  nome: z.string().trim().min(2, 'Por favor, informe seu nome.').max(100, 'Nome muito longo.'),
  email: z.string().trim().email('Por favor, informe um e-mail válido.').max(150, 'E-mail muito longo.'),
  whatsapp: z.string().trim().min(8, 'Por favor, informe seu WhatsApp com DDD.').max(30, 'Número muito longo.'),
  hp_website: z.string().optional()
});

export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limit por IP para prevenir abuso automatizado (máximo 6 inscrições por minuto)
    const clientIp = getClientIp(request);
    const rateCheck = checkRateLimit(clientIp, 'newsletter_subscribe', { windowMs: 60_000, max: 6 });
    if (!rateCheck.allowed) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Muitas tentativas em pouco tempo. Por favor, aguarde alguns instantes antes de enviar novamente.'
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

    // Bloqueio de robôs via honeypot
    if (typeof payload.hp_website === 'string' && payload.hp_website.trim().length > 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'Inscrição confirmada com sucesso!'
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    const parsed = newsletterSchema.safeParse(payload);
    if (!parsed.success) {
      const firstError = parsed.error.issues[0]?.message || 'Dados inválidos para inscrição.';
      return new Response(JSON.stringify({
        success: false,
        error: firstError,
        details: parsed.error.flatten().fieldErrors
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }

    const data = parsed.data;
    const result = await subscribeNewsletter({
      nome: data.nome,
      email: data.email,
      whatsapp: data.whatsapp,
      origem: 'home_pos_evento'
    });

    const message = result.isNew
      ? 'Inscrição confirmada! Você receberá as novidades e datas exclusivas do festival em primeira mão.'
      : 'Seus dados foram atualizados com sucesso! Você já está em nossa lista prioritária.';

    return new Response(JSON.stringify({
      success: true,
      message
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  } catch (error) {
    console.error('Erro ao processar newsletter:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Não foi possível concluir o cadastro no momento. Tente novamente em instantes.'
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' }
    });
  }
};
