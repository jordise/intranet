// ================================================================
//  nav.js — MENÚS POR ROL  3Villas  v4
//
//  Cada clave de NAV_MENUS coincide EXACTAMENTE con el valor del
//  campo Role en TaUsers (en minúsculas).
//  No hay aliases ni renombrados: 'manager' es 'manager', no 'admin'.
//
//  Roles soportados:
//    admin | manager | staff | villamanager | sales | cleaner
// ================================================================

var _NAV_WORKER = 'https://caspio-proxy.jordi-89b.workers.dev';

// ── Menú base admin (acceso total) ──────────────────────────────
var _menuAdmin = [
  { label: 'Entradas y Salidas', url: 'entradas.html',           icon: '🚪' },
  { label: 'Villas',             url: 'buscar-villa.html',        icon: '🏡' },
  { label: 'Contactos',          url: 'contactos.html',           icon: '👥' },
  { label: 'Tareas',             url: 'tareas.html',              icon: '✅' },
  { label: 'Ocupación',          url: 'listado-ocupacion.html',   icon: '📅' },
  { label: 'WelcomePacks',       url: 'pedir-wellcomepacks.html', icon: '📦' },
  {
    label: 'Equipo',
    icon: '👥',
    children: [
      { label: 'Horarios', url: 'https://docs.google.com/document/d/1cStA_oxwK__WiJSn-5Ut1J5nUkJVZIlDDy2jYFtn_k4/edit?tab=t.0', icon: '📄' }
    ]
  },
  {
    label: 'Listados',
    icon: '📖',
    children: [
      { label: 'Reporte ventas semanal', url: 'reports-ventas.html', icon: '📄' }
    ]
  },
  {
    label: 'Manuales',
    icon: '📖',
    children: [
      { label: 'Generar manual',       url: 'generar.html',                     icon: '📄' },
      { label: 'Manual lavadora',      url: 'manual-lavadora.html',             icon: '🫧' },
      { label: 'Manual técnico',       url: 'manual-tecnico.html',              icon: '🔧' },
      { label: 'Manual usuario',       url: 'manual-usuario.html',              icon: '👤' },
      { label: 'Lavadora Villa María', url: 'manual_lavadora_villa_maria.html', icon: '🏠' }
    ]
  },
  {
    label: 'Configuración',
    icon: '⚙️',
    children: [
      { label: 'Roles y permisos', url: 'permisos.html', icon: '🔐' }
    ]
  },
  { label: 'Login', url: 'login.html', icon: '🔑' }
];

// ── Menú base staff / villamanager ──────────────────────────────
var _menuStaff = [
  { label: 'Entradas y Salidas', url: 'entradas.html',           icon: '🚪' },
  { label: 'Villas',             url: 'buscar-villa.html',        icon: '🏡' },
  { label: 'Contactos',          url: 'contactos.html',           icon: '👥' },
  { label: 'Tareas',             url: 'tareas.html',              icon: '✅' },
  { label: 'Ocupación',          url: 'listado-ocupacion.html',   icon: '📅' },
  { label: 'WelcomePacks',       url: 'pedir-wellcomepacks.html', icon: '📦' },
  {
    label: 'Equipo',
    icon: '👥',
    children: [
      { label: 'Horarios', url: 'https://docs.google.com/document/d/1cStA_oxwK__WiJSn-5Ut1J5nUkJVZIlDDy2jYFtn_k4/edit?tab=t.0', icon: '📄' }
    ]
  },
  { label: 'Login', url: 'login.html', icon: '🔑' }
];

// ════════════════════════════════════════════════════════════════
//  MENÚS — claves exactas = valor de TaUsers.Role
// ════════════════════════════════════════════════════════════════
var NAV_MENUS = {

  // Role = "admin"
  admin: _menuAdmin,

  // Role = "manager"
  manager: _menuAdmin,

  // Role = "staff"
  staff: _menuStaff,

  // Role = "villamanager"
  villamanager: _menuStaff,

  // Role = "sales" | "comercial"
  sales: [
    { label: 'Reporte Semanal', url: 'reports-ventas.html', icon: '📅' },
    {
      label: 'Vacacional',
      icon: '📖',
      children: [
        { label: 'Villas',    url: 'buscar-villa.html', icon: '🏡' },
        { label: 'Contactos', url: 'contactos.html',    icon: '👥' }
      ]
    },
    { label: 'Login', url: 'login.html', icon: '🔑' }
  ],

  comercial: [], // se rellena abajo

  // Role = "cleaner" | "limpieza"
  cleaner: [
    { label: 'Entradas y Salidas', url: 'entradas.html',    icon: '🚪' },
    { label: 'Mis tareas',         url: 'tareas.html',       icon: '✅' },
    { label: 'Villas',             url: 'buscar-villa.html', icon: '🏡' },
    { label: 'Login',              url: 'login.html',        icon: '🔑' }
  ],

  limpieza: [], // se rellena abajo

  // Fallback
  default: [
    { label: 'Entradas y Salidas', url: 'entradas.html',     icon: '🚪' },
    { label: 'Villas',             url: 'buscar-villa.html',  icon: '🏡' },
    { label: 'Login',              url: 'login.html',         icon: '🔑' }
  ]
};

// Aliases que comparten el mismo menú (sin duplicar el array)
NAV_MENUS.comercial = NAV_MENUS.sales;
NAV_MENUS.limpieza  = NAV_MENUS.cleaner;

// ════════════════════════════════════════════════════════════════
//  ASIGNACIÓN DEL MENÚ — usa el rol exacto, sin renombrar
// ════════════════════════════════════════════════════════════════
var NAV_MENU = (function () {
  try {
    var rawRole = (typeof Auth !== 'undefined' && Auth.role) ? Auth.role() : '';
    var role    = String(rawRole || '').trim().toLowerCase();
    window.__navRole = role;
    return NAV_MENUS[role] || NAV_MENUS['default'];
  } catch (e) {
    window.__navRole = 'default';
    return NAV_MENUS['default'];
  }
})();

// ════════════════════════════════════════════════════════════════
//  TRACKER DE PÁGINA ANTERIOR
// ════════════════════════════════════════════════════════════════
(function () {
  try {
    if (location.pathname.indexOf('usuario-valores-por-defecto') === -1) {
      localStorage.setItem('3v_prev_page', location.href);
    }
  } catch (e) { /* localStorage no disponible */ }
})();
