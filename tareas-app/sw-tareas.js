/* sw-tareas.js v01 — Service Worker de la app independiente "Tareas 3V"
   Scope: /intranet/tareas-app/
   Su única finalidad es hacer la app instalable (Chrome exige un SW que controle
   la página) y dar caché de respaldo offline. Estrategia network-first: siempre
   intenta red primero y solo cae a caché si no hay conexión, para no servir
   versiones viejas. No intercepta llamadas a Caspio ni al Worker. */

const CACHE = 'tareas3v-v01';
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

  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok && e.request.method === 'GET') {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});

// HISTORIAL: v01 - SW inicial de la app Tareas 3V. Scope /intranet/tareas-app/, network-first, precache de la página y assets de la app, no intercepta Caspio/Worker.
