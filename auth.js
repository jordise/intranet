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

  // ── SW: desregistrar /3villas-manuals/ si existe ─────────────
  // El SW antiguo interceptaba auth.js devolviéndolo desde la ruta
  // incorrecta. Esta llamada lo elimina automáticamente en todos
  // los navegadores sin que los usuarios tengan que hacer nada.
  (function () {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then(function (regs) {
        regs.forEach(function (reg) {
          if (reg.scope.indexOf('/3villas-manuals/') >= 0) reg.unregister();
        });
      });
    }
  })();

  const WORKER = 'https://www.3villas.com/intranet/api';
  const LOGIN  = '/intranet/login.html';

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
  //  Última revisión: 28/10/2026
  // ─────────────────────────────────────────────────────────────

  const PERMISSIONS = {

    // ── MANUAL EQUIPO ──────────────────────────────────────
   'manual-equipo-3villas' : ['admin', 'manager', 'staff'],
    
    // ── ENTRADAS Y SALIDAS ──────────────────────────────────────
    'entradas'              : ['admin', 'manager', 'staff', 'cleaner', 'sales'],
    'entradas-equipo'       : ['admin', 'manager', 'staff'],
    'salidas'               : ['admin', 'manager', 'staff', 'cleaner'],
    'entradas-primer-contacto-whatsapp' : ['admin', 'manager', 'staff'],

    // ── TAREAS ─────────────────────────────────────────────────
    'tareas'                                  : ['admin', 'manager', 'staff', 'cleaner'],
    'app-tareas'                              : ['admin', 'manager', 'staff'],
    'nueva-tarea'                             : ['admin', 'manager', 'staff'],
    'editar-tarea'                            : ['admin', 'manager', 'staff'],
    'guardias-e-intervenciones'               : ['admin', 'manager', 'staff'],
    'listado-guardias-e-intervenciones'       : ['admin', 'manager'],    

    // ── SUBTAREAS DE FLUJO ⚠️ CRÍTICAS ────────────────────────
    'task-limpieza'         : ['admin', 'manager', 'staff', 'cleaner'],
    'task-wp'               : ['admin', 'manager', 'staff', 'cleaner'],
    'task-cierre'           : ['admin', 'manager', 'staff', 'cleaner'],

    // ── VILLAS ─────────────────────────────────────────────────
    'villas'                     : ['admin', 'manager', 'staff', 'sales'],
    'editar-villas'              : ['admin', 'manager', 'staff', 'sales'],
    'editar-villas-para-manual'  : ['admin', 'manager', 'staff'],
    'informe-temporada'          : ['admin', 'manager', 'staff'],  // 27/10/2026: informe de fin de temporada (Jordi); la pagina deja pasar a staff solo si es villa manager (Keyholder_por_defecto)
    'informes-temporada'         : ['admin', 'manager'],  // 27/10/2026: listado de informes de fin de temporada, solo direccion
    'cuadro-informes-temporada'  : ['admin', 'manager'],  // 28/10/2026: cuadro de informes de temporada (Gary: "build it"), solo direccion, solo lectura

    // ── CONTACTOS ──────────────────────────────────────────────
    'contactos'             : ['admin', 'manager', 'staff', 'sales'],

    // ── OCUPACIÓN ──────────────────────────────────────────────
    'listado-ocupacion'     : ['admin', 'manager', 'staff', 'sales'],

    // ── NOTAS ──────────────────────────────────────────────────
    'notas-equipo-reservas' : ['admin', 'manager', 'staff'],
    'notas-villamanager'    : ['admin', 'manager', 'staff'],
    'historial-whatsapp'    : ['admin', 'staff'],  // 12/10/2026: archivo de solo lectura de WhatsApp (Chat2Desk); mismos roles que el Worker whatsapp-history (HISTORY_ROLES). Reservas = staff
    'informe-reservas' : ['admin'],  // 13/10/2026: Informe de reservas, solo admin + Marta (USER_PERMISSIONS), solo lectura
    'cuadro-comercial' : ['admin'],  // 13/10/2026: Cuadro de mando comercial, solo admin + Gaëlle, Rafa, Jose y Johannes (USER_PERMISSIONS), solo lectura; misma lista que COMERCIAL_USERS en el Worker caspio-proxy v61

    // ── WELCOMEPACKS ───────────────────────────────────────────
    'pedir-wellcomepacks'   : ['admin', 'manager', 'staff'],

    // ── REPORTS ────────────────────────────────────────────────
    'reports-ventas'        : ['admin', 'sales'],

    // ── MANUALES ───────────────────────────────────────────────
    'manuales'              : ['admin', 'manager'],
    'cobros-inquilinos'     : ['admin', 'manager'],
    'generar'               : ['admin', 'manager'],

    // ── TEST ───────────────────────────────────────────────────
    'checkin-test-reserva'                  : ['admin'],  // 10/09/2026: solo admin; la pagina escribe las marcas de fianza, ecotasa y policia sin nombre ni aviso (Toni: solo desde la intranet nueva, con nombre)
    'hostaway-comprobar-fechas-reservas'    : ['admin', 'manager'],
    'hostaway-comprobar-multiunits'         : ['admin', 'manager'],
    
    // ── ADMIN ───────────────────────────────────────────────────
    'control-waiver'                  : ['admin', 'manager'],
    'crear-villa'                     : ['admin', 'manager'],   

    // ── REUNIONES ────────────────────────────────────────────────
    'reuniones'        : ['admin', 'manager','sales'],

    // ── CONFIGURACIÓN ──────────────────────────────────────────
    'permisos'              : ['admin'],

    // ── PÁGINAS FUTURAS ────────────────────────────────────────
    'dashboard'             : ['admin', 'manager'],
    'contabilidad'          : ['admin'],
    'usuarios'              : ['admin'],

  };

  // Permisos por usuario (correo de la sesión, en minúsculas), además de los permisos por rol.
  // 13/10/2026 (Gary: "this is for marta only"): el Informe de reservas lo abren los admin y Marta (Reservas).
  // La misma lista vive en el Worker caspio-proxy (REPORT_USERS, accion hostaway-report-page).
  const USER_PERMISSIONS = {
    // 13/10/2026 (Gary: "she, rafa and the partners should have access to this info"): Marta, Rafa, Jose y Johannes.
    // Jordi, Toni, Carlos y Gary son admin y entran por rol. La misma lista vive en el Worker caspio-proxy (REPORT_USERS, v60).
    // 13/10/2026 (Gary: "she says yes build it - also rafa and the partners need access as well"): Cuadro de mando comercial para Gaëlle, Rafa, Jose y Johannes (COMERCIAL_USERS en el Worker caspio-proxy v61).
    'gaelle@3villas.com': ['cuadro-comercial'],
    'marta@3villas.com': ['informe-reservas'],
    'rafa@3villas.com': ['informe-reservas', 'cuadro-comercial'],
    'jose@3villas.com': ['informe-reservas', 'cuadro-comercial'],
    'johannes@3villas.com': ['informe-reservas', 'cuadro-comercial'],
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
  function hasAccess(role, page, email) {
    const allowed = PERMISSIONS[page];
    if (!allowed) return false;
    if (allowed.includes('*')) return true;
    if (allowed.includes(role)) return true;
    const u = USER_PERMISSIONS[String(email || '').toLowerCase().trim()];
    return !!(u && u.includes(page));
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
     *   Auth.saveSession(data, remember)
     */
    saveSession(data, remember) {
      const store = remember ? localStorage : sessionStorage;
      _clearStorage(localStorage);
      _clearStorage(sessionStorage);

      store.setItem(K.TOKEN, data.sessionToken);
      store.setItem(K.ROLE,  data.role);
      store.setItem(K.NAME,  data.name);

      if (remember) {
        store.setItem(K.EXPIRY, String(Date.now() + 30 * 24 * 60 * 60 * 1000));
      }
    },

    /**
     * Proteger una página.
     *   Auth.require('entradas');
     */
    require(page) {
      const session = getSession();

      if (!session) {
        redirectLogin();
        throw new Error('No autenticado');
      }

      if (!hasAccess(session.role, page, session.payload && session.payload.email)) {
        showNoAccess(session.role, page);
        throw new Error('Sin permiso');
      }

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

    /** Token de sesión */
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
     *   fetch(Auth.url(`${WORKER}?action=view&...`))
     */
    url(workerUrl) {
      const sep = workerUrl.includes('?') ? '&' : '?';
      return `${workerUrl}${sep}sessionToken=${this.token()}`;
    },
  };
})();
