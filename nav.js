// ================================================================
//  nav.js — MENÚS POR ROL  3Villas  v3 — 17/05/2026
//
//  v3: NAV_MENU se asigna sincrónicamente con Auth.role()
//      (auth.js carga antes, el rol ya está en localStorage).
//      Ya no se necesita loadNavRole() ni cambios en nav-component.js.
//
//  Define un menú distinto para cada rol de usuario.
//  El rol se lee del campo "Role" en TaUsers, comparando por email
//  con Auth.email(). El resultado se guarda en window.__navRole
//  y nav-component.js lo usa al renderizar.
//
//  ┌─────────────┬──────────────────────────────────────┐
//  │ Menú        │ Valores del campo Role en TaUsers     │
//  ├─────────────┼──────────────────────────────────────┤
//  │ admin       │ "admin", "manager"                   │
//  │ staff       │ "staff", "villamanager"               │
//  │ sales       │ "sales", "comercial"                  │
//  │ cleaner     │ "cleaner", "limpieza"                 │
//  │ default     │ vacío o cualquier otro valor          │
//  └─────────────┴──────────────────────────────────────┘
//
//  Para añadir/quitar páginas: edita el array del rol correspondiente.
//  Para añadir un valor de Role nuevo: edita _normalizeRole() al final.
//  Cada item acepta: label, url, icon, children (sub-menú)
// ================================================================

// ── Worker URL (mismo que usan las páginas) ──────────────────────
var _NAV_WORKER = 'https://caspio-proxy.jordi-89b.workers.dev';

// ════════════════════════════════════════════════════════════════
//  MENÚS POR ROL
// ════════════════════════════════════════════════════════════════

var NAV_MENUS = {

  // ── ADMIN — acceso total ─────────────────────────────────────
  //    Aplica a: Role = "admin" | "manager"
  admin: [
    { label: 'Entradas y Salidas', url: 'entradas.html',           icon: '🚪' },
    { label: 'Villas',             url: 'buscar-villa.html',        icon: '🏡' },
    { label: 'Contactos',          url: 'contactos.html',           icon: '👥' },
    { label: 'Tareas',             url: 'tareas.html',              icon: '✅' },
    { label: 'Ocupación',          url: 'listado-ocupacion.html',   icon: '📅' },
    { label: 'WelcomePacks',       url: 'pedir-wellcomepacks.html', icon: '📦' },
    {
      label: 'Listados',
      icon: '📖',
      children: [
        { label: 'Reporte ventas semanal',       url: 'reports-ventas.html',                     icon: '📄' },
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
        { label: 'Lavadora Villa María', url: 'manual_lavadora_villa_maria.html', icon: '🏠' },
      ]
    },
    {
      label: 'Configuración',
      icon: '⚙️',
      children: [
        { label: 'Roles y permisos', url: 'permisos.html', icon: '🔐' },
      ]
    },
    { label: 'Login', url: 'login.html', icon: '🔑' },
  ],

  // ── STAFF — villa managers / equipo general ──────────────────
  //    Aplica a: Role = "staff" | "villamanager"
  staff: [
    { label: 'Entradas y Salidas', url: 'entradas.html',           icon: '🚪' },
    { label: 'Villas',             url: 'buscar-villa.html',        icon: '🏡' },
    { label: 'Contactos',          url: 'contactos.html',           icon: '👥' },
    { label: 'Tareas',             url: 'tareas.html',              icon: '✅' },
    { label: 'Ocupación',          url: 'listado-ocupacion.html',   icon: '📅' },
    { label: 'WelcomePacks',       url: 'pedir-wellcomepacks.html', icon: '📦' },
    { label: 'Login',              url: 'login.html',               icon: '🔑' },
  ],

  // ── SALES — equipo comercial ─────────────────────────────────
  //    Aplica a: Role = "sales" | "comercial"
  sales: [
    { label: 'Reporte Semanal ',  url: 'reports-ventas.html', icon: '📅' },
      {
      label: 'Vacacional',
      icon: '📖',
      children: [
        { label: 'Villas',     url: 'buscar-villa.html',      icon: '🏡' },
        { label: 'Contactos',  url: 'contactos.html',         icon: '👥' },
      ]
    },
   
    { label: 'Login',      url: 'login.html',             icon: '🔑' },
  ],

  // ── CLEANER — equipo de limpieza ─────────────────────────────
  //    Aplica a: Role = "cleaner" | "limpieza"
  cleaner: [
     { label: 'Entradas y Salidas', url: 'entradas.html',          icon: '🚪' },
     { label: 'Mis tareas',         url: 'tareas.html',            icon: '✅' },
     { label: 'Villas',             url: 'buscar-villa.html',      icon: '🏡' },
     { label: 'Login',              url: 'login.html',             icon: '🔑' },
  ],

  // ── DEFAULT — fallback ────────────────────────────────────────
  //    Aplica a: Role = vacío o cualquier valor no reconocido
  default: [
    { label: 'Entradas y Salidas', url: 'entradas.html',     icon: '🚪' },
    { label: 'Villas',             url: 'buscar-villa.html', icon: '🏡' },
    { label: 'Login',              url: 'login.html',        icon: '🔑' },
  ],

};

// ════════════════════════════════════════════════════════════════
//  ASIGNACIÓN SÍNCRONA DEL MENÚ
//  auth.js carga antes que nav.js, por lo que Auth.role() ya tiene
//  el rol del usuario desde localStorage/sessionStorage.
//  No se necesita fetch ni esperar a nav-component.js.
// ════════════════════════════════════════════════════════════════

/**
 * Normaliza el valor del campo Role a uno de los roles conocidos.
 * Ajusta los valores aquí si en Caspio usas nombres distintos.
 */
function _normalizeRole(raw) {
  if (!raw) return 'default';
  var r = String(raw).trim().toLowerCase();
  if (r === 'admin' || r === 'manager') return 'admin';
  if (r === 'staff' || r === 'villamanager') return 'staff';
  if (r === 'sales' || r === 'comercial') return 'sales';
  if (r === 'cleaner' || r === 'limpieza') return 'cleaner';
  return 'default';
}

// NAV_MENU — se asigna aquí directamente, sin async ni fetch
var NAV_MENU = (function () {
  try {
    var role = (typeof Auth !== 'undefined') ? _normalizeRole(Auth.role()) : 'default';
    window.__navRole = role;
    return NAV_MENUS[role] || NAV_MENUS['default'];
  } catch (e) {
    window.__navRole = 'default';
    return NAV_MENUS['default'];
  }
})();
