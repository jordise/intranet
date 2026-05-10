const CACHE = '3villas-v3';

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled([
        '/3villas-manuals/entradas.html',
        '/3villas-manuals/tareas.html',
        '/3villas-manuals/editar-tarea.html',
        '/3villas-manuals/login.html',
        '/3villas-manuals/auth.js',
        '/3villas-manuals/manifest.json',
        '/3villas-manuals/icon-192.png',
        '/3villas-manuals/icon-512.png',
        '/3villas-manuals/logo-blanco.png',
      ].map(url => cache.add(url).catch(() => {})))
    ).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
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
