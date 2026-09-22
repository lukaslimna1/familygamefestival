import { randomUUID } from 'node:crypto';
import { and, desc, eq, ilike, inArray, or, sql } from 'drizzle-orm';
import { getDatabase } from '../db/client';
import { feedbacks } from '../db/schema';

export type FeedbackType = 'sugestao' | 'elogio' | 'reclamacao';
export type FeedbackStatus = 'novo' | 'lido' | 'em_analise' | 'respondido' | 'resolvido' | 'arquivado';
export type PublicationConsent = 'nome' | 'anonimo' | 'nao';

export interface CreateFeedbackInput {
  tipo: FeedbackType;
  estrelas: number;
  categoria: string;
  mensagem: string;
  anonimo: boolean;
  nome?: string | null;
  email?: string | null;
  telefone?: string | null;
  instagram?: string | null;
  permiteContato: boolean;
  autorizacaoPublicacao: PublicationConsent;
}

export interface PublicTestimonial {
  id: string;
  tipo: FeedbackType;
  estrelas: number;
  categoria: string;
  texto: string;
  nomePublico: string;
  destaque: boolean;
  criadoEm: string;
}

export interface PublicMetrics {
  total: number;
  mediaEstrelas: number;
  mediaFormatada: string;
  hasQuorum: boolean;
}

export const FEEDBACK_CATEGORIES = [
  'Organização',
  'Atendimento / Staff',
  'Campeonatos',
  'Cosplay',
  'Just Dance',
  'K-pop',
  'Convidados / Painéis',
  'Lojas / Expositores',
  'Alimentação',
  'Estrutura / Local',
  'Acessibilidade e Inclusão',
  'Site / Inscrições',
  'Comunicação / Redes Sociais',
  'Outro'
] as const;

export function derivePublicName(
  autorizacao: PublicationConsent,
  anonimo: boolean,
  nome?: string | null
): string {
  if (autorizacao === 'nao') return 'Não autorizado';
  if (autorizacao === 'anonimo' || anonimo || !nome || !nome.trim()) {
    return 'Anônimo';
  }

  const parts = nome.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0];
  }
  const firstName = parts[0];
  const lastInitial = parts[parts.length - 1][0]?.toUpperCase();
  return lastInitial ? `${firstName} ${lastInitial}.` : firstName;
}

export async function createFeedback(input: CreateFeedbackInput) {
  const db = getDatabase();
  const id = randomUUID();
  const now = new Date().toISOString();

  const estrelasValidas = Math.max(1, Math.min(5, Math.round(input.estrelas)));
  const nomePublico = derivePublicName(input.autorizacaoPublicacao, input.anonimo, input.nome);

  const [created] = await db.insert(feedbacks).values({
    id,
    tipo: input.tipo,
    estrelas: estrelasValidas,
    categoria: input.categoria.trim(),
    mensagem: input.mensagem.trim(),
    anonimo: input.anonimo,
    nome: input.anonimo ? null : (input.nome?.trim() || null),
    email: input.anonimo ? null : (input.email?.trim().toLowerCase() || null),
    telefone: input.anonimo ? null : (input.telefone?.trim() || null),
    instagram: input.anonimo ? null : (input.instagram?.trim() || null),
    permiteContato: input.anonimo ? false : input.permiteContato,
    autorizacaoPublicacao: input.autorizacaoPublicacao,
    nomePublico,
    status: 'novo',
    resposta: null,
    respondidoPor: null,
    respondidoEm: null,
    notaInterna: null,
    publicadoSite: false,
    textoPublico: input.mensagem.trim(),
    destaque: false,
    createdAt: now,
    updatedAt: now
  }).returning();

  return created;
}

export async function getPublicTestimonials(limit = 12): Promise<PublicTestimonial[]> {
  const db = getDatabase();

  const rows = await db
    .select({
      id: feedbacks.id,
      tipo: feedbacks.tipo,
      estrelas: feedbacks.estrelas,
      categoria: feedbacks.categoria,
      mensagem: feedbacks.mensagem,
      textoPublico: feedbacks.textoPublico,
      nomePublico: feedbacks.nomePublico,
      destaque: feedbacks.destaque,
      createdAt: feedbacks.createdAt
    })
    .from(feedbacks)
    .where(eq(feedbacks.publicadoSite, true))
    .orderBy(desc(feedbacks.destaque), desc(feedbacks.createdAt))
    .limit(limit);

  return rows.map((row) => ({
    id: row.id,
    tipo: row.tipo as FeedbackType,
    estrelas: row.estrelas,
    categoria: row.categoria,
    texto: row.textoPublico?.trim() || row.mensagem,
    nomePublico: row.nomePublico || 'Anônimo',
    destaque: Boolean(row.destaque),
    criadoEm: row.createdAt
  }));
}

export async function getPublicMetrics(): Promise<PublicMetrics> {
  const db = getDatabase();

  const [result] = await db
    .select({
      total: sql<number>`count(*)`,
      somaEstrelas: sql<number>`coalesce(sum(${feedbacks.estrelas}), 0)`
    })
    .from(feedbacks);

  const total = Number(result?.total ?? 0);
  const soma = Number(result?.somaEstrelas ?? 0);
  const mediaEstrelas = total > 0 ? Number((soma / total).toFixed(1)) : 0;
  const mediaFormatada = mediaEstrelas.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  return {
    total,
    mediaEstrelas,
    mediaFormatada,
    hasQuorum: total >= 5
  };
}

export interface FeedbackFilterOptions {
  tipo?: string;
  status?: string;
  publicado?: string;
  categoria?: string;
  search?: string;
  limit?: number;
  offset?: number;
}

export async function getAdminFeedbacks(options: FeedbackFilterOptions = {}) {
  const db = getDatabase();
  const conditions = [];

  if (options.tipo && ['sugestao', 'elogio', 'reclamacao'].includes(options.tipo)) {
    conditions.push(eq(feedbacks.tipo, options.tipo));
  }

  if (options.status && ['novo', 'lido', 'em_analise', 'respondido', 'resolvido', 'arquivado'].includes(options.status)) {
    conditions.push(eq(feedbacks.status, options.status));
  }

  if (options.publicado === '1' || options.publicado === 'true') {
    conditions.push(eq(feedbacks.publicadoSite, true));
  } else if (options.publicado === '0' || options.publicado === 'false') {
    conditions.push(eq(feedbacks.publicadoSite, false));
  }

  if (options.categoria && options.categoria.trim()) {
    conditions.push(eq(feedbacks.categoria, options.categoria.trim()));
  }

  if (options.search && options.search.trim()) {
    const term = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(feedbacks.mensagem, term),
        ilike(feedbacks.nome, term),
        ilike(feedbacks.email, term),
        ilike(feedbacks.instagram, term),
        ilike(feedbacks.categoria, term),
        ilike(feedbacks.textoPublico, term)
      )
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ total: sql<number>`count(*)` })
    .from(feedbacks)
    .where(whereClause);

  const total = Number(countResult?.total ?? 0);

  const query = db
    .select()
    .from(feedbacks)
    .where(whereClause)
    .orderBy(desc(feedbacks.createdAt));

  if (options.limit && options.limit > 0) {
    query.limit(options.limit);
  }
  if (options.offset && options.offset > 0) {
    query.offset(options.offset);
  }

  const items = await query;
  return { items, total };
}

export async function getAdminFeedbackById(id: string) {
  const db = getDatabase();
  const [item] = await db.select().from(feedbacks).where(eq(feedbacks.id, id)).limit(1);
  return item ?? null;
}

export async function getAdminFeedbackStats() {
  const db = getDatabase();

  const all = await db.select().from(feedbacks);

  const total = all.length;
  let sugestoes = 0;
  let elogios = 0;
  let reclamacoes = 0;
  let pendentes = 0;
  let respondidos = 0;
  let resolvidos = 0;
  let arquivados = 0;
  let publicados = 0;
  let somaEstrelas = 0;

  const estrelasDist: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const categoriasDist: Record<string, number> = {};
  const statusDist: Record<string, number> = { novo: 0, lido: 0, em_analise: 0, respondido: 0, resolvido: 0, arquivado: 0 };
  const topElogiosCat: Record<string, number> = {};
  const topReclamacoesCat: Record<string, number> = {};
  const topSugestoesCat: Record<string, number> = {};

  for (const item of all) {
    if (item.tipo === 'sugestao') {
      sugestoes++;
      topSugestoesCat[item.categoria] = (topSugestoesCat[item.categoria] ?? 0) + 1;
    } else if (item.tipo === 'elogio') {
      elogios++;
      topElogiosCat[item.categoria] = (topElogiosCat[item.categoria] ?? 0) + 1;
    } else if (item.tipo === 'reclamacao') {
      reclamacoes++;
      topReclamacoesCat[item.categoria] = (topReclamacoesCat[item.categoria] ?? 0) + 1;
    }

    if (['novo', 'lido', 'em_analise'].includes(item.status)) {
      pendentes++;
    } else if (item.status === 'respondido') {
      respondidos++;
    } else if (item.status === 'resolvido') {
      resolvidos++;
    } else if (item.status === 'arquivado') {
      arquivados++;
    }

    if (item.publicadoSite) {
      publicados++;
    }

    somaEstrelas += item.estrelas;
    estrelasDist[item.estrelas] = (estrelasDist[item.estrelas] ?? 0) + 1;
    categoriasDist[item.categoria] = (categoriasDist[item.categoria] ?? 0) + 1;
    statusDist[item.status] = (statusDist[item.status] ?? 0) + 1;
  }

  const mediaEstrelas = total > 0 ? Number((somaEstrelas / total).toFixed(1)) : 0;
  const mediaFormatada = mediaEstrelas.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

  const sortDist = (record: Record<string, number>) =>
    Object.entries(record)
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count);

  return {
    total,
    sugestoes,
    elogios,
    reclamacoes,
    pendentes,
    respondidos,
    resolvidos,
    arquivados,
    publicados,
    mediaEstrelas,
    mediaFormatada,
    estrelasDist,
    categoriasDist: sortDist(categoriasDist),
    statusDist,
    topElogiosCat: sortDist(topElogiosCat),
    topReclamacoesCat: sortDist(topReclamacoesCat),
    topSugestoesCat: sortDist(topSugestoesCat)
  };
}

export async function updateFeedbackStatus(id: string, status: FeedbackStatus) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const [updated] = await db
    .update(feedbacks)
    .set({ status, updatedAt: now })
    .where(eq(feedbacks.id, id))
    .returning();
  return updated;
}

export async function updateFeedbackInternalNote(id: string, notaInterna: string) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const [updated] = await db
    .update(feedbacks)
    .set({ notaInterna: notaInterna.trim() || null, updatedAt: now })
    .where(eq(feedbacks.id, id))
    .returning();
  return updated;
}

export async function updateFeedbackReply(
  id: string,
  data: { resposta: string; respondidoPor: string }
) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const existing = await getAdminFeedbackById(id);
  if (!existing) throw new Error('Feedback não encontrado.');

  const nextStatus = ['novo', 'lido', 'em_analise'].includes(existing.status) ? 'respondido' : existing.status;

  const [updated] = await db
    .update(feedbacks)
    .set({
      resposta: data.resposta.trim(),
      respondidoPor: data.respondidoPor.trim(),
      respondidoEm: now,
      status: nextStatus,
      updatedAt: now
    })
    .where(eq(feedbacks.id, id))
    .returning();

  return updated;
}

export async function updateFeedbackPublication(
  id: string,
  data: { publicadoSite: boolean; textoPublico?: string | null; destaque?: boolean }
) {
  const db = getDatabase();
  const now = new Date().toISOString();
  const existing = await getAdminFeedbackById(id);
  if (!existing) throw new Error('Feedback não encontrado.');

  if (existing.autorizacaoPublicacao === 'nao' && data.publicadoSite) {
    throw new Error('Este feedback não possui autorização do autor para publicação pública no site.');
  }

  const [updated] = await db
    .update(feedbacks)
    .set({
      publicadoSite: data.publicadoSite,
      textoPublico: data.textoPublico?.trim() || existing.mensagem,
      destaque: data.destaque ?? existing.destaque,
      updatedAt: now
    })
    .where(eq(feedbacks.id, id))
    .returning();

  return updated;
}
