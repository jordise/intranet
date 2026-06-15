const CACHE = '3villas-v5';
self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled([
        '/intranet/entradas.html',
        '/intranet/tareas.html',
        '/intranet/editar-tarea.html',
        '/intranet/login.html',
        '/intranet/auth.js',
        '/intranet/manifest.json',
        '/intranet/icon-192.png',
        '/intranet/icon-512.png',
        '/intranet/logo-blanco.png',
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
