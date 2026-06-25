/* sw-tareas.js v02 — Service Worker de la app independiente "Tareas 3V"
   Scope: /intranet/tareas-app/
   Su única finalidad es hacer la app instalable (Chrome exige un SW que controle
   la página) y dar caché de respaldo offline. Estrategia network-first: siempre
   intenta red primero y solo cae a caché si no hay conexión, para no servir
   versiones viejas. No intercepta llamadas a Caspio ni al Worker. */

const CACHE = 'tareas3v-v02';
const PRECACHE = [
  '/intranet/tareas-app/tareas-app.html',
  '/intranet/tareas-app/manifest-tareas.json',
  '/intranet/tareas-app/icon-tareas-192.png',
  '/intranet/tareas-app/icon-tareas-512.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(PRECACHE.map(url => cache.add(url).catch(() => {}))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // No interceptar llamadas al Worker de Caspio ni a Caspio directamente
  if (url.hostname.includes('workers.dev') || url.hostname.includes('caspio.com')) {
    return;
  }

  // Solo gestionar peticiones GET del mismo origen; el resto pasa de largo
  if (e.request.method !== 'GET' || url.origin !== self.location.origin) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res && res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() =>
        caches.match(e.request).then(cached =>
          cached || new Response('', { status: 504, statusText: 'Sin conexión' })
        )
      )
  );
});

// HISTORIAL: v02 - Fix "Failed to convert value to Response": el fetch handler solo gestiona GET del mismo origen; cuando la red falla y no hay caché, devuelve una Response 504 válida en vez de undefined (que rompía respondWith y causaba network error al cargar la página). CACHE bump a tareas3v-v02 para reemplazar el SW viejo cacheado. | v01 - SW inicial de la app Tareas 3V. Scope /intranet/tareas-app/, network-first, precache de la página y assets de la app, no intercepta Caspio/Worker.
