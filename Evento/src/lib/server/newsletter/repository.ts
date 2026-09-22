import { randomUUID } from 'node:crypto';
import { desc, eq, ilike, or, sql } from 'drizzle-orm';
import { getDatabase } from '../db/client';
import { newsletterLeads } from '../db/schema';

export interface SubscribeNewsletterInput {
  nome: string;
  email: string;
  whatsapp: string;
  origem?: string;
}

export async function subscribeNewsletter(input: SubscribeNewsletterInput) {
  const db = getDatabase();
  const emailNormalized = input.email.trim().toLowerCase();
  const nomeTrimmed = input.nome.trim();
  const whatsappTrimmed = input.whatsapp.trim();
  const origem = input.origem?.trim() || 'home_pos_evento';
  const now = new Date().toISOString();

  // Verifica se o e-mail já existe
  const [existing] = await db
    .select()
    .from(newsletterLeads)
    .where(eq(newsletterLeads.email, emailNormalized))
    .limit(1);

  if (existing) {
    const [updated] = await db
      .update(newsletterLeads)
      .set({
        nome: nomeTrimmed,
        whatsapp: whatsappTrimmed,
        origem,
        updatedAt: now
      })
      .where(eq(newsletterLeads.id, existing.id))
      .returning();

    return { lead: updated, isNew: false };
  }

  const id = randomUUID();
  const [created] = await db
    .insert(newsletterLeads)
    .values({
      id,
      nome: nomeTrimmed,
      email: emailNormalized,
      whatsapp: whatsappTrimmed,
      origem,
      createdAt: now,
      updatedAt: now
    })
    .returning();

  return { lead: created, isNew: true };
}

export async function getNewsletterStats() {
  try {
    const db = getDatabase();
    const today = new Date().toISOString().split('T')[0];

    const [statsResult] = await db
      .select({
        total: sql<number>`count(*)`,
        comWhatsapp: sql<number>`count(case when length(trim(${newsletterLeads.whatsapp})) >= 8 then 1 end)`,
        hoje: sql<number>`count(case when ${newsletterLeads.createdAt} like ${today + '%'} then 1 end)`
      })
      .from(newsletterLeads);

    return {
      total: Number(statsResult?.total ?? 0),
      comWhatsapp: Number(statsResult?.comWhatsapp ?? 0),
      hoje: Number(statsResult?.hoje ?? 0)
    };
  } catch (error) {
    console.error('[Newsletter stats fallback]', error);
    return { total: 0, comWhatsapp: 0, hoje: 0 };
  }
}

export async function listNewsletterLeads(options: { search?: string; limit?: number; offset?: number } = {}) {
  const db = getDatabase();
  const conditions = [];

  if (options.search && options.search.trim()) {
    const term = `%${options.search.trim()}%`;
    conditions.push(
      or(
        ilike(newsletterLeads.nome, term),
        ilike(newsletterLeads.email, term),
        ilike(newsletterLeads.whatsapp, term)
      )
    );
  }

  const whereClause = conditions.length > 0 ? conditions[0] : undefined;

  const [countResult] = await db
    .select({ total: sql<number>`count(*)` })
    .from(newsletterLeads)
    .where(whereClause);

  const total = Number(countResult?.total ?? 0);

  const query = db
    .select()
    .from(newsletterLeads)
    .where(whereClause)
    .orderBy(desc(newsletterLeads.createdAt));

  if (options.limit && options.limit > 0) {
    query.limit(options.limit);
  }
  if (options.offset && options.offset > 0) {
    query.offset(options.offset);
  }

  const items = await query;
  return { items, total };
}

export async function getAllNewsletterLeadsForExport(search?: string) {
  try {
    const db = getDatabase();
    const conditions = [];

    if (search && search.trim()) {
      const term = `%${search.trim()}%`;
      conditions.push(
        or(
          ilike(newsletterLeads.nome, term),
          ilike(newsletterLeads.email, term),
          ilike(newsletterLeads.whatsapp, term)
        )
      );
    }

    const whereClause = conditions.length > 0 ? conditions[0] : undefined;

    return await db
      .select()
      .from(newsletterLeads)
      .where(whereClause)
      .orderBy(desc(newsletterLeads.createdAt));
  } catch (error) {
    console.error('[Newsletter export fallback]', error);
    return [];
  }
}
