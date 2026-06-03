// ============================================================
//  auth.js — Autenticación y protección de páginas 3Villas
//
//  USO EN CADA PÁGINA PROTEGIDA:
//    <script src="auth.js"></script>
//    <script>Auth.require('entradas');</script>
//
//  USO EN FETCH AL WORKER:
//    fetch(url, { headers: Auth.headers() })
//
//  BOTÓN DE LOGOUT (añadir donde quieras):
//    <button onclick="Auth.logout()">Cerrar sesión</button>
// ============================================================

const Auth = (function () {

  // ── Favicon automático ────────────────────────────────────────
  // Se inyecta en todas las páginas que carguen auth.js.
  // Las páginas públicas (login, reset-password) deben añadirlo manualmente.
  (function () {
    if (!document.querySelector('link[rel~="icon"]')) {
      var lnk  = document.createElement('link');
      lnk.rel  = 'icon';
      lnk.type = 'image/png';
      lnk.href = 'icon-corazon-rojo-fondo-transparente.png';
      document.head.appendChild(lnk);
    }
  })();

  const WORKER = 'https://caspio-proxy.jordi-89b.workers.dev';
  const LOGIN  = '/3villas-manuals/login.html';

  // Claves de almacenamiento
  const K = {
    TOKEN   : '3v_token',
    ROLE    : '3v_role',
    NAME    : '3v_name',
    EXPIRY  : '3v_expiry',   // timestamp ms — solo en localStorage (remember me)
  };

  // ── Mapa de permisos ──────────────────────────────────────────
  //
  //  Clave        = valor que se pasa a Auth.require('clave')
  //  Valor        = roles que pueden acceder
  //  Roles válidos: 'admin', 'manager', 'staff', 'sales', 'cleaner'
  //
  //  ⚠️  PÁGINAS CRÍTICAS: task-limpieza, task-wp, task-cierre
  //      Son subpáginas de flujo que se abren desde entradas.html.
  //      Si un cleaner o staff no tiene permiso, su flujo se rompe.
  //
  //  ℹ️  PÁGINAS PÚBLICAS (sin Auth.require, no aparecen aquí):
  //      login.html, reset-password.html, index.html
  //
  //  ℹ️  PÁGINAS TEST (ignoradas):
  //      XXedit-taskXX.html, XXnuevatareaXX.html, XXtest1XX.html
  //
  //  Última revisión: 24/05/2026
  // ─────────────────────────────────────────────────────────────

  const PERMISSIONS = {

    // ── ENTRADAS Y SALIDAS ──────────────────────────────────────
    //
    //  'entradas' = clave de la PUERTA DE ENTRADA (entradas.html o index
    //  de entradas) que detecta el rol y redirige a la sub-página correcta.
    //  Todos los roles que puedan llegar a cualquier sub-página de entradas
    //  deben figurar aquí.
    //
    'entradas'              : ['admin', 'manager', 'staff', 'cleaner', 'sales'],

    //  'entradas-equipo' = entradas-equipo.html
    //  Página avanzada con vista de equipo. Solo personal interno.
    //  ⚠️  Recuerda poner en entradas-equipo.html:
    //        Auth.require('entradas-equipo')
    //
    'entradas-equipo'       : ['admin', 'manager', 'staff'],

    // salidas — clave de reserva (no hay salidas.html propio, se gestiona en entradas)
    'salidas'               : ['admin', 'manager', 'staff', 'cleaner'],

    // ── PRIMER CONTACTO WHATSAPP ────────────────────────────────
    //
    //  entradas-primer-contacto-whatsapp.html → Auth.require('entradas-primer-contacto-whatsapp')
    //  Gestión del primer mensaje WhatsApp 2 días antes del check-in.
    //  ⚠️  Recuerda poner en entradas-primer-contacto-whatsapp.html:
    
    //
    'entradas-primer-contacto-whatsapp' : ['admin', 'manager', 'staff'],

    // ── TAREAS ─────────────────────────────────────────────────
    // tareas.html
    'tareas'                : ['admin', 'manager', 'staff', 'cleaner'],
    // nueva-tarea.html
    'nueva-tarea'           : ['admin', 'manager', 'staff'],
    // editar-tarea.html
    'editar-tarea'          : ['admin', 'manager', 'staff'],

    // ── SUBTAREAS DE FLUJO ⚠️ CRÍTICAS ────────────────────────
    // Se abren desde entradas.html — si el rol no tiene acceso rompe el flujo
    // task-limpieza.html → Auth.require('task-limpieza')
    'task-limpieza'         : ['admin', 'manager', 'staff', 'cleaner'],
    // task-wp.html → Auth.require('task-wp')
    'task-wp'               : ['admin', 'manager', 'staff', 'cleaner'],
    // task-cierre.html → Auth.require('task-cierre')
    'task-cierre'           : ['admin', 'manager', 'staff', 'cleaner'],

    // ── VILLAS ─────────────────────────────────────────────────
    // buscar-villa.html → Auth.require('villas')
    // villa.html        → Auth.require('villas')
    // sales puede ver villas pero NO entradas — clave separada para ello
    'villas'                : ['admin', 'manager', 'staff', 'sales'],

    // ── CONTACTOS ──────────────────────────────────────────────
    // contactos.html
    'contactos'             : ['admin', 'manager', 'staff', 'sales'],

    // ── OCUPACIÓN ──────────────────────────────────────────────
    // listado-ocupacion.html
    'listado-ocupacion'     : ['admin', 'manager', 'staff', 'sales'],

    // ── NOTAS ──────────────────────────────────────────────────
    // notas-equipo-reservas.html
    'notas-equipo-reservas' : ['admin', 'manager', 'staff'],
    // notas-villamanager.html
    'notas-villamanager'    : ['admin', 'manager', 'staff'],

    // ── WELCOMEPACKS ───────────────────────────────────────────
    // pedir-wellcomepacks.html
    'pedir-wellcomepacks'   : ['admin', 'manager', 'staff'],

    // ── REPORTS ────────────────────────────────────────────────
    // reports-ventas.html
    'reports-ventas'        : ['admin', 'sales'],

    // ── MANUALES ───────────────────────────────────────────────
    // generar.html + manual-*.html → Auth.require('manuales')
    'manuales'              : ['admin', 'manager'],
    'cobros-inquilinos'     : ['admin', 'manager'],
    'generar'               : ['admin', 'manager'],

    // ── Test ───────────────────────────────────────────────
    'checkin-test-reserva' : ['admin', 'manager'],
    'hostaway-comprobar-fechas-reservas' : ['admin', 'manager'],

    // ── CONFIGURACIÓN ──────────────────────────────────────────
    // permisos.html
    'permisos'              : ['admin'],

    // ── PÁGINAS FUTURAS (sin .html aún — admin por defecto) ────
    'dashboard'             : ['admin', 'manager'],
    'contabilidad'          : ['admin'],
    'usuarios'              : ['admin'],

  };

  // ── JWT decode (sin verificar firma — solo para leer payload) ──
  function decodeJWT(token) {
    try {
      const p   = token.split('.')[1];
      const pad = p.length % 4 ? p + '='.repeat(4 - p.length % 4) : p;
      return JSON.parse(atob(pad.replace(/-/g, '+').replace(/_/g, '/')));
    } catch { return null; }
  }

  // ── Obtener sesión (localStorage o sessionStorage) ─────────
  function getSession() {
    // 1. Buscar en localStorage (remember me)
    let token  = localStorage.getItem(K.TOKEN);
    let source = 'local';

    if (token) {
      const expiry = parseInt(localStorage.getItem(K.EXPIRY) || '0');
      if (expiry && Date.now() > expiry) {
        // Sesión recordada caducada
        _clearStorage(localStorage);
        token = null;
      }
    }

    // 2. Fallback a sessionStorage (sesión de pestaña)
    if (!token) {
      token  = sessionStorage.getItem(K.TOKEN);
      source = 'session';
    }

    if (!token) return null;

    // Verificar JWT expirado
    const payload = decodeJWT(token);
    if (!payload) return null;

    const storage = source === 'local' ? localStorage : sessionStorage;
    const role    = storage.getItem(K.ROLE) || payload.role || '';
    const name    = storage.getItem(K.NAME) || payload.name || '';

    return { token, role, name, payload, remembered: source === 'local' };
  }

  function _clearStorage(store) {
    store.removeItem(K.TOKEN);
    store.removeItem(K.ROLE);
    store.removeItem(K.NAME);
    store.removeItem(K.EXPIRY);
  }

  // ── Comprobar permiso ──────────────────────────────────────
  function hasAccess(role, page) {
    const allowed = PERMISSIONS[page];
    if (!allowed) return false;
    if (allowed.includes('*')) return true;
    return allowed.includes(role);
  }

  // ── Redirect a login ───────────────────────────────────────
  function redirectLogin() {
    const here = encodeURIComponent(location.pathname + location.search);
    location.replace(`${LOGIN}?redirect=${here}`);
  }

  // ── Pantalla sin acceso ────────────────────────────────────
  function showNoAccess(role, page) {
    document.body.style.cssText = 'margin:0;font-family:Open Sans,sans-serif;background:#f4f5f7';
    document.body.innerHTML = `
      <div style="min-height:100vh;display:flex;align-items:center;justify-content:center">
        <div style="text-align:center;padding:40px">
          <div style="font-size:52px;margin-bottom:16px">🔒</div>
          <h2 style="font-family:Montserrat,sans-serif;font-size:20px;color:#2d3142;margin-bottom:8px">Acceso denegado</h2>
          <p style="color:#7a8194;font-size:14px;margin-bottom:24px">
            El rol <strong>${role}</strong> no tiene permiso para <strong>${page}</strong>.
          </p>
          <button onclick="Auth.logout()"
            style="background:#C8102E;color:#fff;border:none;padding:10px 24px;border-radius:8px;
                   font-family:Montserrat,sans-serif;font-weight:700;cursor:pointer;font-size:14px">
            Cerrar sesión
          </button>
        </div>
      </div>`;
  }

  // ════════════════════════════════════════════════════════════
  //  API PÚBLICA
  // ════════════════════════════════════════════════════════════
  return {

    // Exponer getSession para que login.html pueda verificar si ya hay sesión
    getSession,

    /**
     * Guardar sesión tras login correcto.
     * Llamado desde login.html con los datos del worker.
     *   Auth.saveSession(data, remember)
     */
    saveSession(data, remember) {
      const store = remember ? localStorage : sessionStorage;
      // Limpiar ambos primero para evitar conflictos
      _clearStorage(localStorage);
      _clearStorage(sessionStorage);

      store.setItem(K.TOKEN, data.sessionToken);
      store.setItem(K.ROLE,  data.role);
      store.setItem(K.NAME,  data.name);

      if (remember) {
        // Expirar en 30 días (el JWT del worker también debe durar 30d)
        store.setItem(K.EXPIRY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
      }
    },

    /**
     * Proteger una página.
     * Detiene la ejecución (redirect o pantalla de error) si no hay permiso.
     *   Auth.require('entradas');
     */
    require(page) {
      const session = getSession();

      if (!session) {
        redirectLogin();
        throw new Error('No autenticado');
      }

      if (!hasAccess(session.role, page)) {
        showNoAccess(session.role, page);
        throw new Error('Sin permiso');
      }

      // Inyectar nombre de usuario si existe el elemento #hUserName
      requestAnimationFrame(() => {
        const el = document.getElementById('hUserName');
        if (el) el.textContent = session.name;
      });

      return session;
    },

    /**
     * Cabeceras para fetch al worker.
     *   fetch(url, { headers: Auth.headers() })
     */
    headers() {
      const s = getSession();
      return s ? { Authorization: `Bearer ${s.token}` } : {};
    },

    /** Token de sesión (busca en localStorage y sessionStorage) */
    token() {
      return localStorage.getItem('3v_token') || sessionStorage.getItem('3v_token') || '';
    },

    /** Rol del usuario */
    role() { return getSession()?.role || ''; },

    /** Nombre del usuario */
    name() { return getSession()?.name || ''; },

    /** Email del usuario (del JWT payload) */
    email() { return getSession()?.payload?.email || ''; },

    /** Logout — limpia todo y redirige al login */
    logout() {
      _clearStorage(localStorage);
      _clearStorage(sessionStorage);
      location.replace(LOGIN);
    },

    /**
     * Añadir sessionToken como query param a una URL del worker.
     * Alternativa a Auth.headers() para URLs directas.
     *   fetch(Auth.url(`${WORKER}?action=view&...`))
     */
    url(workerUrl) {
      const sep = workerUrl.includes('?') ? '&' : '?';
      return `${workerUrl}${sep}sessionToken=${this.token()}`;
    },
  };
})();
