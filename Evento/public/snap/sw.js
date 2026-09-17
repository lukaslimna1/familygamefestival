const SNAP_CACHE = 'fgf-snap-v2';
const SNAP_ROUTES = ['/snap', '/snap/foto', '/snap/ar', '/snap/figurinhas'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(SNAP_CACHE).then((cache) => cache.addAll(SNAP_ROUTES)));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(
      keys.filter((key) => key.startsWith('fgf-snap-') && key !== SNAP_CACHE).map((key) => caches.delete(key)),
    )),
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || url.pathname.startsWith('/admin/') || url.pathname.startsWith('/api/')) return;
  const isSnapRequest = url.pathname.startsWith('/snap') || url.pathname.startsWith('/_astro/') || url.pathname.startsWith('/assets/snap/');
  if (!isSnapRequest) return;

  event.respondWith(
    fetch(request).then((response) => {
      if (response.ok) {
        const copy = response.clone();
        caches.open(SNAP_CACHE).then((cache) => cache.put(request, copy));
      }
      return response;
    }).catch(() => caches.match(request).then((cached) => cached ?? caches.match('/snap'))),
  );
});
