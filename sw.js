const CACHE = '3villas-v4'; // bumped: añadidos todos los archivos del repo

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(cache =>
      Promise.allSettled([
        // ── Core JS ──
        '/3villas-manuals/auth.js',
        '/3villas-manuals/nav.js',
        '/3villas-manuals/nav-component.js',
        // ── Páginas principales de la intranet ──
        '/3villas-manuals/index.html',
        '/3villas-manuals/login.html',
        '/3villas-manuals/entradas.html',
        '/3villas-manuals/entradasysalidas.html',
        '/3villas-manuals/tareas.html',
        '/3villas-manuals/editar-tarea.html',
        '/3villas-manuals/nueva-tarea.html',
        '/3villas-manuals/generar.html',
        '/3villas-manuals/permisos.html',
        '/3villas-manuals/reset-password.html',
        '/3villas-manuals/task-wp.html',
        // ── Manuales ──
        '/3villas-manuals/manual-tecnico.html',
        '/3villas-manuals/manual-usuario.html',
        '/3villas-manuals/manual-lavadora.html',
        '/3villas-manuals/manual_lavadora_villa_maria.html',
        // ── Assets ──
        '/3villas-manuals/manifest.json',
        '/3villas-manuals/icon-192.png',
        '/3villas-manuals/icon-512.png',
        '/3villas-manuals/logo-blanco.png',
        '/3villas-manuals/logo-negro.png',
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
  // Peticiones al Worker de Caspio → siempre red directa
  if (url.hostname.includes('workers.dev') || url.hostname.includes('caspio.com')) {
    return;
  }
  // Todo lo demás → network first, caché como fallback
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
