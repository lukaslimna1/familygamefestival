import type { APIRoute } from 'astro';
import { createGoogleAuthorizationUrl } from '../../../../lib/server/drive/oauth';
import {
  createGoogleOAuthState,
  GOOGLE_OAUTH_STATE_COOKIE,
  googleOAuthStateCookieOptions
} from '../../../../lib/server/drive/oauth-state';

export const prerender = false;

export const GET: APIRoute = async ({ cookies }) => {
  try {
    const state = await createGoogleOAuthState();
    const authorizationUrl = createGoogleAuthorizationUrl(state);

    cookies.set(GOOGLE_OAUTH_STATE_COOKIE, state, googleOAuthStateCookieOptions);

    return new Response(null, {
      status: 302,
      headers: {
        'Cache-Control': 'no-store',
        Location: authorizationUrl
      }
    });
  } catch {
    return new Response('OAuth do Google Drive não está configurado neste ambiente.', {
      status: 503,
      headers: { 'Cache-Control': 'no-store' }
    });
  }
};
