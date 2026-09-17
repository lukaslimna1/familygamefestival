const OFFLINE_MESSAGE = `<!doctype html>
<html lang="pt-BR">
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>FGF ADM — Sem conexão</title>
  <style>
    :root { color-scheme: dark; font-family: Arial, sans-serif; background: #07111e; color: #f6f8fb; }
    body { display: grid; min-height: 100vh; margin: 0; place-items: center; }
    main { max-width: 26rem; padding: 2rem; text-align: center; }
    h1 { color: #ffc928; font-size: 1.5rem; }
    p { color: #b8c5d2; line-height: 1.6; }
  </style>
  <main>
    <h1>Sem conexão</h1>
    <p>O Painel Administrativo precisa de internet para acessar os dados do evento.</p>
  </main>
</html>`;

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => event.waitUntil(self.clients.claim()));

self.addEventListener('fetch', (event) => {
  const request = event.request;
  const url = new URL(request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAdminRoute = url.pathname === '/admin' || url.pathname.startsWith('/admin/');
  const isApiRoute = url.pathname === '/api' || url.pathname.startsWith('/api/');

  if (!isSameOrigin || request.method !== 'GET' || (!isAdminRoute && !isApiRoute)) return;

  event.respondWith(
    fetch(request, { cache: 'no-store' }).catch(() => {
      if (isAdminRoute && request.mode === 'navigate') {
        return new Response(OFFLINE_MESSAGE, {
          status: 503,
          headers: {
            'Cache-Control': 'no-store',
            'Content-Type': 'text/html; charset=utf-8'
          }
        });
      }
      return Response.error();
    })
  );
});
