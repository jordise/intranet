const CACHE = '3villas-v1';

// Archivos que se guardan en caché para funcionar offline
const PRECACHE = [
  '/3villas-manuals/',
  '/3villas-manuals/entradas.html',
  '/3villas-manuals/tareas.html',
  '/3villas-manuals/login.html',
  '/3villas-manuals/auth.js',
  '/3villas-manuals/nav.js',
  '/3villas-manuals/nav-component.js',
  '/3villas-manuals/manifest.json',
  '/3villas-manuals/icons/icon-192.png',
  '/3villas-manuals/icons/icon-512.png',
];

// Instalación: guardar archivos estáticos en caché
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(cache => cache.addAll(PRECACHE))
      .then(() => self.skipWaiting())
  );
});

// Activación: limpiar cachés antiguas
self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

// Fetch: network first para datos de la API, caché first para estáticos
self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Peticiones al Worker (API) → siempre red, sin caché
  if (url.hostname.includes('workers.dev')) {
    e.respondWith(fetch(e.request));
    return;
  }

  // Google Fonts → caché first
  if (url.hostname.includes('fonts.googleapis') || url.hostname.includes('fonts.gstatic')) {
    e.respondWith(
      caches.match(e.request).then(cached =>
        cached || fetch(e.request).then(res => {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
          return res;
        })
      )
    );
    return;
  }

  // Resto (HTML, JS, CSS) → network first, fallback a caché
  e.respondWith(
    fetch(e.request)
      .then(res => {
        if (res.ok) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      })
      .catch(() => caches.match(e.request))
  );
});
