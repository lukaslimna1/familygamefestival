import type { APIRoute } from 'astro';
import { createPublicRegistration } from '../../../lib/server/registration/public-api';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  return createPublicRegistration(request, 'cosplay');
};
