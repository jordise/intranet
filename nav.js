// ================================================================
//  nav.js — ESTRUCTURA DEL MENÚ  3Villas
//
//  Edita este array para cambiar orden, nombres o anidar páginas.
//  El cambio se refleja automáticamente en TODAS las páginas.
//
//  Cada item puede tener:
//    label    : texto que aparece en el menú
//    url      : archivo html (relativo al repo)
//    icon     : emoji o texto corto
//    roles    : ['admin','manager',...] — si se omite, visible para todos
//    children : array de items anidados (sub-menú)
// ================================================================

var NAV_MENU = [

  { label: 'Entradas',   url: 'entradas.html',  icon: '🚪' },
  { label: 'Contactos',   url: 'contacto.html',  icon: '🚪' },
  { label: 'Tareas',   url: 'tareas.html',  icon: '🚪' },
  { label: 'Listado ocupacion (en pruebas)',   url: 'listado-ocupacion.html',  icon: '🚪' },
 

  {
    label: 'Manuales BETA no usar',
    icon : '📖',
    children: [
      { label: 'Generar manual',           url: 'generar.html',                  icon: '📄' },
      { label: 'Manual lavadora',          url: 'manual-lavadora.html',          icon: '🫧' },
      { label: 'Manual técnico',           url: 'manual-tecnico.html',           icon: '🔧' },
      { label: 'Manual usuario',           url: 'manual-usuario.html',           icon: '👤' },
      { label: 'Lavadora Villa María',     url: 'manual_lavadora_villa_maria.html', icon: '🏠' },
    ]
  },

    {
    label: 'Configuracion',
    icon : '📖',
    children: [
        { label: 'Roles',           url: 'permisos.html',                  icon: '📄' },
        { label: 'Test',   url: 'XXtestXX',  icon: '🚪' },
        { label: 'Test_menu',   url: 'XXmenuXX',  icon: '🚪' },
      { label: 'Test_villa',   url: 'villa.html?villa_id=22',  icon: '🚪' }, 
    ]
  },
 { label: 'Login',   url: 'login.html',  icon: '' },
  // Ejemplo de item con acceso restringido:
  // { label: 'Contabilidad', url: 'contabilidad.html', icon: '💰', roles: ['admin'] },

];
