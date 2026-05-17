// ================================================================
//  nav.js — MENÚS POR ROL  3Villas  v2 — 17/05/2026
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
    { label: 'Report Semanal',  url: 'reports-ventas.html', icon: '📅' },
    { label: 'Contactos vacacional',  url: 'contactos.html',         icon: '👥' },
    { label: 'Villas vacacional',     url: 'buscar-villa.html',      icon: '🏡' },
    { label: 'Login',      url: 'login.html',             icon: '🔑' },
  ],

  // ── CLEANER — equipo de limpieza ─────────────────────────────
  //    Aplica a: Role = "cleaner" | "limpieza"
  cleaner: [
    { label: 'Mis tareas',         url: 'tareas.html',            icon: '✅' },
    { label: 'Entradas y Salidas', url: 'entradas.html',          icon: '🚪' },
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

// NAV_MENU = menú activo (nav-component.js lo lee directamente)
// Empieza con 'default' y se actualiza cuando carga el rol
var NAV_MENU = NAV_MENUS['default'];

// ════════════════════════════════════════════════════════════════
//  CARGA DEL ROL DESDE TaUsers
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

/**
 * Carga el rol del usuario actual desde TaUsers y actualiza NAV_MENU.
 * nav-component.js debe llamar a esta función antes de renderizar.
 * Devuelve una Promise que resuelve cuando NAV_MENU está listo.
 */
function loadNavRole() {
  return new Promise(function (resolve) {
    try {
      var email = (typeof Auth !== 'undefined' && Auth.email) ? Auth.email() : '';
      if (!email) { resolve('default'); return; }

      // Si ya lo tenemos en caché, no volvemos a pedir
      if (window.__navRole) {
        NAV_MENU = NAV_MENUS[window.__navRole] || NAV_MENUS['default'];
        resolve(window.__navRole);
        return;
      }

      var url = (typeof Auth !== 'undefined' && Auth.url)
        ? Auth.url(_NAV_WORKER + '?action=data&table=TaUsers&where=' + encodeURIComponent("Email='" + email + "'") + '&limit=1')
        : _NAV_WORKER + '?action=data&table=TaUsers&where=' + encodeURIComponent("Email='" + email + "'") + '&limit=1';

      fetch(url)
        .then(function (res) { return res.json(); })
        .then(function (json) {
          var users = json.Result || json.result || [];
          var rawRole = users.length ? (users[0]['Role'] || '') : '';
          var role = _normalizeRole(rawRole);
          window.__navRole = role;
          NAV_MENU = NAV_MENUS[role] || NAV_MENUS['default'];
          resolve(role);
        })
        .catch(function () {
          window.__navRole = 'default';
          NAV_MENU = NAV_MENUS['default'];
          resolve('default');
        });
    } catch (e) {
      window.__navRole = 'default';
      NAV_MENU = NAV_MENUS['default'];
      resolve('default');
    }
  });
}
