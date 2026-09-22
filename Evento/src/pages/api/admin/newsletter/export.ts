import type { APIRoute } from 'astro';
import { getAllNewsletterLeadsForExport } from '../../../../lib/server/newsletter/repository';

export const prerender = false;

export const GET: APIRoute = async ({ request, locals }) => {
  const admin = locals.admin;
  if (!admin) {
    return new Response('Não autorizado', { status: 401 });
  }

  const url = new URL(request.url);
  const search = url.searchParams.get('q') || undefined;

  const leads = await getAllNewsletterLeadsForExport(search);

  // Formata CSV com cabeçalhos e escape seguro
  const headers = ['ID', 'Nome', 'E-mail', 'WhatsApp', 'Origem', 'Data de Cadastro'];
  const rows = leads.map((lead) => [
    lead.id,
    lead.nome,
    lead.email,
    lead.whatsapp,
    lead.origem,
    lead.createdAt
  ]);

  const escapeCell = (val: unknown) => `"${String(val ?? '').replace(/"/g, '""')}"`;
  const csvBody = [
    headers.map(escapeCell).join(';'),
    ...rows.map((r) => r.map(escapeCell).join(';'))
  ].join('\r\n');

  // Adiciona BOM UTF-8 (\uFEFF) para abrir com acentuação correta no Excel
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `leads_newsletter_fgf_${dateStr}.csv`;

  return new Response('\uFEFF' + csvBody, {
    status: 200,
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Cache-Control': 'no-store'
    }
  });
};
