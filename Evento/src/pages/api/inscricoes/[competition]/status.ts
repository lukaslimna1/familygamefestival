import type { APIRoute } from 'astro';
import { getCompetitionRegistrationStatusBySlug } from '../../../../lib/server/db/repository';

export const prerender = false;

export async function createCompetitionStatusResponse(competitionSlug: string, now = new Date()) {
  const status = await getCompetitionRegistrationStatusBySlug(competitionSlug, now);
  if (!status) {
    return new Response(JSON.stringify({ error: { code: 'not_found', message: 'Competição não encontrada.' } }), {
      status: 404,
      headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }
    });
  }
  return new Response(JSON.stringify({
    data: {
      competition: {
        id: status.definition.id,
        slug: status.definition.slug,
        name: status.definition.name,
        category: status.definition.category,
        eventDay: status.competition.eventDay,
        eventDate: status.competition.eventDate,
        startTime: status.competition.startTime
      },
      registration: {
        registered: status.registered,
        capacity: status.capacity,
        remaining: status.remaining,
        full: status.full,
        onlineOpen: status.onlineOpen,
        deadline: status.deadline.toISOString(),
        deadlineLabel: status.deadlineLabel,
        onlineMessage: status.onlineMessage
      }
    }
  }), {
    headers: { 'Cache-Control': 'no-store', 'Content-Type': 'application/json; charset=utf-8' }
  });
}

export const GET: APIRoute = async ({ params }) => createCompetitionStatusResponse(params.competition ?? '');
