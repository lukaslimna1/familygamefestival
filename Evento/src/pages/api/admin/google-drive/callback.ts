import type { APIRoute } from 'astro';
import { exchangeGoogleAuthorizationCode } from '../../../../lib/server/drive/oauth';
import { persistGoogleRefreshTokenLocally } from '../../../../lib/server/drive/oauth-token-store';
import {
  googleOAuthStateCookieOptions,
  GOOGLE_OAUTH_STATE_COOKIE,
  isValidGoogleOAuthState
} from '../../../../lib/server/drive/oauth-state';

export const prerender = false;

function response(message: string, status: number) {
  return new Response(message, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'Content-Type': 'text/plain; charset=utf-8'
    }
  });
}

export const GET: APIRoute = async ({ cookies, url }) => {
  const state = url.searchParams.get('state') ?? undefined;
  const cookieState = cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  const code = url.searchParams.get('code') ?? undefined;
  const hasGoogleError = Boolean(url.searchParams.get('error'));

  cookies.delete(GOOGLE_OAUTH_STATE_COOKIE, googleOAuthStateCookieOptions);

  if (!(await isValidGoogleOAuthState(state, cookieState))) {
    return response('Não foi possível validar a autorização do Google.', 400);
  }

  if (hasGoogleError) {
    return response('A autorização do Google foi cancelada ou recusada.', 400);
  }

  if (!code) {
    return response('O Google não retornou um código de autorização.', 400);
  }

  try {
    const tokens = await exchangeGoogleAuthorizationCode(code);

    if (!tokens.refresh_token) {
      return response('O Google não retornou um refresh token. Tente autorizar novamente.', 502);
    }

    await persistGoogleRefreshTokenLocally(tokens.refresh_token);

    return response(
      'Autorização do Google Drive concluída. O refresh token foi salvo somente no .env.local do servidor local e não foi exibido.',
      200
    );
  } catch {
    return response('Não foi possível concluir a autorização do Google Drive.', 502);
  }
};
