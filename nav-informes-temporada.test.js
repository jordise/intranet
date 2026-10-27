/* Pruebas de la entrada 'Informes de temporada' de nav.js v21 y de las dos claves de auth.js (Jordi 27/10/2026).
   node nav-informes-temporada.test.js
   Carga el nav.js real y el mapa real de auth.js con vm. Sin red. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var NAV = fs.readFileSync('nav.js', 'utf8');
function cargarNav(role) {
  var ctx = { Auth: { role: function () { return role; } }, console: { log: function () {}, warn: function () {}, error: function () {} },
    localStorage: { setItem: function () {} }, location: { pathname: '/x.html', href: 'x', protocol: 'file:' }, fetch: function () {} };
  ctx.window = ctx;
  vm.runInNewContext(NAV, ctx);
  return ctx;
}
var c = cargarNav('admin');
var listados = c._menuAdmin.filter(function (i) { return i.label === 'Listados'; })[0];
var e = listados && listados.children.filter(function (i) { return i.url === 'informes-temporada.html'; })[0];
console.log('1. nav.js');
ok('entrada en Listados de _menuAdmin', !!e);
ok('label, icono y url', e && e.label === 'Informes de temporada' && e.icon === '📋');
ok("roles ['admin','manager']", e && JSON.stringify(e.roles) === '["admin","manager"]');
ok('ultima del bloque Listados', e && listados.children[listados.children.length - 1] === e);
ok('no esta en staff, sales ni cleaner', [c._menuStaff, c._menuSales, c._menuCleaner].every(function (m) { return JSON.stringify(m).indexOf('informes-temporada') < 0; }));
ok('una sola vez en nav.js', NAV.split('informes-temporada.html').length === 2);
/* hasAccess real de nav-component.js */
var NC = fs.readFileSync('nav-component.js', 'utf8');
var i = NC.indexOf('function hasAccess('), j = NC.indexOf('\n  }', i);
var hctx = {}; vm.runInNewContext('var _r;function userRole(){return _r;}' + NC.slice(i, j + 4) + ';this.h=function(item,r){_r=r;return hasAccess(item);};', hctx);
ok('nav-component hasAccess: manager si, staff no', e && hctx.h(e, 'manager') === true && hctx.h(e, 'admin') === true && hctx.h(e, 'staff') === false);
ok('v21 en cabecera y NAV_VERSION', /nav\.js — MENÚS POR ROL  3Villas  v21/.test(NAV) && /VERSIÓN ACTUAL: v21 \|/.test(NAV) && /var NAV_VERSION = 21;/.test(NAV));
ok('HISTORIAL v21 con Jordi y la prueba, v20 detras', /\/\/ HISTORIAL: v21 - [^\n]*Jordi[^\n]*27\/10\/2026[^\n]*nav-informes-temporada\.test\.js[^\n]*\| v20 - /.test(NAV));

console.log('2. auth.js');
var A = fs.readFileSync('auth.js', 'utf8');
ok("'informe-temporada': ['admin', 'manager', 'staff']", /'informe-temporada'\s*:\s*\['admin',\s*'manager',\s*'staff'\]/.test(A));
ok("'informes-temporada': ['admin', 'manager']", /'informes-temporada'\s*:\s*\['admin',\s*'manager'\]/.test(A));
ok('las dos claves junto a villas', A.indexOf("'informe-temporada'") > A.indexOf("'villas'") && A.indexOf("'informes-temporada'") < A.indexOf('// ── CONTACTOS'));
try { new vm.Script(A); ok('auth.js compila', true); } catch (er) { ok('auth.js compila', false, er.message); }

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
