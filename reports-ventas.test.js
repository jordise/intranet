/* Pruebas de Reports Ventas (reports-ventas.html v25): tabla del listado legible.
   node reports-ventas.test.js

   Como reports-prospeccion-mensual.test.js: NO copia el código de la página. Extrae el bloque
   "TABLA v25" entero del HTML y lo ejecuta en un contexto aislado. Sin red, sin datos reales:
   los agentes y las filas de este fichero son de mentira. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c === true) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '  -> ' + e : '')); } }

var S = fs.readFileSync('reports-ventas.html', 'utf8');

console.log('versión coherente en las tres marcas');
var ver = (S.match(/VERSIÓN ACTUAL: (v\d+)/) || [])[1];
ok('cabecera dice v25', ver === 'v25', ver);
ok('<title> coincide', S.indexOf('<title>Reports Ventas ' + ver + ' — 3Villas</title>') > 0);
ok('HISTORIAL empieza por ' + ver, S.indexOf('<!-- HISTORIAL: ' + ver + ' ') > 0);

console.log('bloque TABLA v25');
var a = S.indexOf('/* ══ TABLA v25 ══'), b = S.indexOf('/* ══ FIN TABLA v25 ══ */');
ok('el bloque existe', a > 0 && b > a);
var FA = S.indexOf('const FIELDS = ['), FB = S.indexOf('];', FA);
var ctx = {};
vm.runInNewContext((S.slice(FA, FB + 2) + '\n' + S.slice(a, b)).replace(/^const /gm, 'var '), ctx);
var F = ctx.FIELDS;

ok('cada campo tiene grupo y nombre corto', F.every(function (f) { return ctx.LIST_COLS[f.key] && ctx.LIST_COLS[f.key].grp && ctx.LIST_COLS[f.key].short; }));
ok('los nombres cortos no repiten "Prospección:"', F.every(function (f) { return ctx.LIST_COLS[f.key].short.indexOf('Prospección') < 0; }));
ok('los grupos van seguidos (cada grupo es un solo bloque)', (function () {
  var seen = {}, prev = null;
  return F.every(function (f) { var g = ctx.LIST_COLS[f.key].grp; if (g !== prev) { if (seen[g]) return false; seen[g] = 1; prev = g; } return true; });
})());

console.log('cifras');
ok('cero se ve como un guion claro', ctx.rvFmt(0, false).txt === '–' && ctx.rvFmt(0, false).cls === 'num-zero');
ok('número normal sin decimales', ctx.rvFmt(3, false).txt === '3');
ok('importe con punto de miles y €', ctx.rvFmt(28450, true).txt === '28.450 €', ctx.rvFmt(28450, true).txt);
ok('importe de 4 cifras también con punto', ctx.rvFmt(4579, true).txt === '4.579 €', ctx.rvFmt(4579, true).txt);
ok('importe de 6 cifras', ctx.rvFmt(100982, true).txt === '100.982 €', ctx.rvFmt(100982, true).txt);
ok('decimales con coma', ctx.rvFmt(1250.5, true).txt === '1.250,50 €', ctx.rvFmt(1250.5, true).txt);

console.log('cabecera');
var H = ctx.listHeadHtml(F);
ok('dos filas: grupos y columnas', (H.match(/<tr/g) || []).length === 2 && H.indexOf('class="grp"') > 0 && H.indexOf('class="col"') > 0);
ok('los colspan de los grupos suman todas las columnas', (function () {
  var s = 0; (H.match(/colspan="(\d+)"/g) || []).forEach(function (m) { s += +m.match(/\d+/)[0]; }); return s === F.length;
})());
ok('Agente ocupa las dos filas', /<th rowspan="2" class="c-agent">Agente<\/th>/.test(H));
ok('sin columna Fecha (la fecha va en la banda de la semana)', H.indexOf('>Fecha<') < 0);
ok('sin la columna vacía del final', H.indexOf('<th></th>') < 0);

console.log('cuerpo');
var rows = [
  { Fecha: '2026-10-12', _agente: 'Tino', Visitas_Ventas: 0, Facturado_Mao: 28450 },
  { Fecha: '2026-10-12', _agente: 'Gaelle', Visitas_Ventas: 3, Facturado_Mao: 46531 },
  { Fecha: '2026-10-05', _agente: 'Mari', Visitas_Ventas: 2, Facturado_Ciu: 100982 },
];
var get = { date: function (r) { return r.Fecha; }, val: function (r, f) { return r[f.key] || 0; } };
var fmtD = function (s) { return s.split('-').reverse().join('/'); };
var B = ctx.listBodyHtml(rows, F, get, fmtD);
ok('una banda por semana', (B.match(/class="wk"/g) || []).length === 2);
ok('la semana más nueva va primero', B.indexOf('12/10/2026') < B.indexOf('05/10/2026'));
ok('la banda dice "Semana del"', B.indexOf('Semana del 12/10/2026') > 0);
ok('agentes en orden alfabético dentro de la semana', B.indexOf('Gaelle') < B.indexOf('Tino'));
ok('la banda cuenta los agentes', B.indexOf('2 agentes') > 0 && B.indexOf('1 agente<') > 0);
ok('importe formateado en la fila', B.indexOf('100.982 €') > 0);
ok('el nombre del agente se escapa', ctx.listBodyHtml([{ Fecha: '2026-10-12', _agente: '<b>x</b>' }], F, get, fmtD).indexOf('<b>x</b>') < 0);

console.log('estilo y captura');
ok('la tabla lleva la clase rv', S.indexOf('<table class="rv">') > 0);
ok('la cabecera ya no corta palabras', /table\.rv th\{[^}]*word-break:normal/.test(S) && /table\.rv th\{[^}]*hyphens:none/.test(S));
ok('la captura abre la tabla entera (clase shot) y la quita al final', S.indexOf("target.classList.add('shot')") > 0 && S.indexOf("target.classList.remove('shot')") > 0);

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
