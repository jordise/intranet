// ============================================================
//  sw.js — Service Worker  3Villas  v8
//  v8: precache de la ruta del equipo de limpieza y respuesta 504 valida
//      cuando la red falla y la pagina no esta en cache
//  v7: no intercepta /intranet/api (la API ahora se sirve en el mismo
//      dominio; sus respuestas nunca se cachean)
//  v6: activate limpia también cachés de scopes antiguos
//      (/3villas-manuals/, 3villas-v1 a v4) para móviles
//      que tenían el SW viejo instalado antes de la migración
// ============================================================

const CACHE = '3villas-v8';

const PRECACHE = [
  '/intranet/entradas.html',
  '/intranet/tareas.html',
  '/intranet/editar-tarea.html',
  '/intranet/entradas-cleaner.html',
  '/intranet/task-limpieza.html',
  '/intranet/task-wp.html',
  '/intranet/task-cierre.html',
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

  // No interceptar llamadas a la API (mismo dominio, /intranet/api), al worker de Caspio ni a Caspio directamente
  if (url.pathname.startsWith('/intranet/api') || url.hostname.includes('workers.dev') || url.hostname.includes('caspio.com')) {
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
      .catch(() =>
        caches.match(e.request).then(cached =>
          cached || new Response('', { status: 504, statusText: 'Sin conexión' })
        )
      )
  );
});

// HISTORIAL: v8 - Precache de la ruta completa del equipo de limpieza (entradas-cleaner.html, task-limpieza.html, task-wp.html, task-cierre.html): son las paginas de los 43 usuarios con rol cleaner, que trabajan en la calle con cobertura debil, y hasta hoy ninguna estaba en la lista. Ademas, cuando la red falla y la pagina no esta en cache, el manejador devuelve una Response 504 valida en vez de undefined, que rompia respondWith y salia como un error de conexion del navegador sin nada que la pagina pudiera capturar; es el mismo arreglo que ya lleva tareas-app/sw-tareas.js desde su v02. CACHE sube a 3villas-v8 para forzar la reinstalacion. | v7 - la API pasa por www.3villas.com/intranet/api (bloqueos de LaLiga a IPs de Cloudflare, 13/09/2026); el SW no la intercepta ni la cachea; CACHE bump a 3villas-v7 | v6 - activate borra todos los cachés antiguos incluyendo /3villas-manuals/; CACHE bump a 3villas-v6 fuerza reinstalación en móviles con SW viejo | v5 - versión anterior
