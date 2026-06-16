// ============================================================
//  sw.js — Service Worker  3Villas  v6
//  v6: activate limpia también cachés de scopes antiguos
//      (/3villas-manuals/, 3villas-v1 a v4) para móviles
//      que tenían el SW viejo instalado antes de la migración
// ============================================================

const CACHE = '3villas-v6';

const PRECACHE = [
  '/intranet/entradas.html',
  '/intranet/tareas.html',
  '/intranet/editar-tarea.html',
  '/intranet/login.html',
  '/intranet/auth.js',
  '/intranet/manifest.json',
  '/intranet/icon-192.png',
  '/intranet/icon-512.png',
  '/intranet/logo-blanco.png',
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => Promise.allSettled(
        PRECACHE.map(url => cache.add(url).catch(() => {}))
      ))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        // Borra TODOS los cachés que no sean el actual,
        // incluyendo los de la versión antigua /3villas-manuals/
        keys.filter(k => k !== CACHE).map(k => {
          console.log('[SW] Borrando caché antiguo:', k);
          return caches.delete(k);
        })
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // No interceptar llamadas al worker de Caspio ni a Caspio directamente
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

// HISTORIAL: v6 - activate borra todos los cachés antiguos incluyendo /3villas-manuals/; CACHE bump a 3villas-v6 fuerza reinstalación en móviles con SW viejo | v5 - versión anterior
