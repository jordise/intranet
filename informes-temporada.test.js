/* Pruebas del listado de informes de fin de temporada (informes-temporada.html v1, Jordi 27/10/2026).
   node informes-temporada.test.js
   Como villa-propietario.test.js: extrae con vm las funciones reales de la pagina. Sin red. */
var fs = require('fs'), vm = require('vm');
var P = 'informes-temporada.html';
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var SRC = '';
try { SRC = fs.readFileSync(P, 'utf8'); } catch (e) { ok('existe ' + P, false, e.message); console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(1); }
function fnSource(s, name) {
  var i = s.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = s.indexOf('{', i), depth = 0, k = j;
  for (; k < s.length; k++) { if (s[k] === '{') depth++; else if (s[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return s.slice(i, k);
}
var FNS = ['puedeVerListado', 'estadoInforme', 'contarAcciones', 'nombreVM', 'construirFilas', 'ordenarFilas', 'contadores', 'contadorTexto', 'filtrarFilas', 'csvCell', 'csvTabla', 'abrirUrl'];
var ctx = {};
try { vm.runInNewContext(FNS.map(function (n) { return fnSource(SRC, n); }).join('\n'), ctx); }
catch (e) { ok('las funciones existen en la pagina', false, e.message); console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(1); }

console.log('1. Puerta');
ok('admin y manager', ctx.puedeVerListado('admin') && ctx.puedeVerListado(' Manager'));
ok('staff, cleaner, sales no', !ctx.puedeVerListado('staff') && !ctx.puedeVerListado('cleaner') && !ctx.puedeVerListado('sales'));
ok("Auth.require('informes-temporada')", SRC.indexOf("Auth.require('informes-temporada')") > 0);

console.log('2. Estado por villa');
ok('sin fila: Sin informe', ctx.estadoInforme(undefined) === 'Sin informe');
ok('borrador', ctx.estadoInforme({ estado: 'borrador' }) === 'Borrador');
ok('estado vacio: Borrador', ctx.estadoInforme({ estado: '' }) === 'Borrador');
ok('enviado', ctx.estadoInforme({ estado: 'Enviado' }) === 'Enviado');

var villas = [
  { villaid: 1, Name: 'Villa Cielos Azules', KeyHolder_person: '501' },
  { villaid: 2, Name: 'Villa Alba', KeyHolder_person: 'U7' },
  { villaid: 3, Name: 'Casa Brisa', KeyHolder_person: '' },
  { villaid: 4, Name: 'Villa Duna', KeyHolder_person: '' },
  { villaid: 5, Name: 'Ático Mar', KeyHolder_person: '' }
];
var informes = [
  { informe_id: 10, villaid: 1, temporada: 2026, estado: 'enviado', fecha_revision: '2026-10-26T00:00:00', estado_general: 'Bueno' },
  { informe_id: 11, villaid: 2, temporada: 2026, estado: 'borrador', fecha_revision: '2026-10-20T00:00:00', estado_general: '' },
  { informe_id: 12, villaid: 5, temporada: 2026, estado: 'borrador', fecha_revision: '', estado_general: 'Regular' }
];
var lineas = [
  { informe_id: 10, seccion: 'resumen', clave: 'accion_1', texto_1: 'Pérgola' },
  { informe_id: 10, seccion: 'resumen', clave: 'accion_2', texto_1: 'Pintar' },
  { informe_id: 10, seccion: 'resumen', clave: 'accion_3', texto_1: '  ' },
  { informe_id: 11, seccion: 'resumen', clave: 'accion_1', texto_1: 'Toldo' },
  { informe_id: 99, seccion: 'resumen', clave: 'accion_1', texto_1: 'De otra temporada' }
];
var contacts = [{ id: '501', name: 'Amanda Townsend' }], users = [{ id: 'U7', name: 'Pep Vm' }];
var cnt = ctx.contarAcciones(lineas);
ok('contarAcciones: cuenta acciones con texto por informe_id', cnt['10'] === 2 && cnt['11'] === 1 && !cnt['12']);
var filas = ctx.construirFilas(villas, informes, lineas, contacts, users, 2026);
var f1 = filas.filter(function (f) { return f.villaid === 1; })[0];
ok('fila enviada: estado, fecha, estado general, acciones', f1.estado === 'Enviado' && f1.fecha === '26/10/2026' && f1.estadoGeneral === 'Bueno' && f1.acciones === 2, JSON.stringify(f1));
ok('villa manager por KeyHolder_person (contacto y usuario)', f1.vm === 'Amanda Townsend' && filas.filter(function (f) { return f.villaid === 2; })[0].vm === 'Pep Vm');
var f3 = filas.filter(function (f) { return f.villaid === 3; })[0];
ok('villa sin informe: 0 acciones, sin fecha', f3.estado === 'Sin informe' && f3.acciones === 0 && f3.fecha === '' && f3.vm === '');
ok('borrador sin lineas: 0 acciones', filas.filter(function (f) { return f.villaid === 5; })[0].acciones === 0);
ok('enlace Abrir', ctx.abrirUrl(1, 2026) === 'informe-temporada.html?villaid=1&temporada=2026' && f1.url === 'informe-temporada.html?villaid=1&temporada=2026');

console.log('3. Orden');
var o = ctx.ordenarFilas(filas).map(function (f) { return f.villa; });
ok('Sin informe -> Borrador -> Enviado, cada uno por nombre', o.join('|') === 'Casa Brisa|Villa Duna|Ático Mar|Villa Alba|Villa Cielos Azules', o.join('|'));

console.log('4. Contadores');
var c = ctx.contadores(filas);
ok('contadores', c.total === 5 && c.sin === 2 && c.borrador === 2 && c.enviado === 1, JSON.stringify(c));
ok('texto del contador', ctx.contadorTexto(c) === '5 villas · 2 sin informe · 2 borrador · 1 enviado', ctx.contadorTexto(c));

console.log('5. Filtros');
ok('por estado', ctx.filtrarFilas(filas, 'Borrador', '').length === 2);
ok('por nombre (sin acentos ni mayusculas)', ctx.filtrarFilas(filas, '', 'atico').length === 1 && ctx.filtrarFilas(filas, '', 'VILLA').length === 3);
ok('todos', ctx.filtrarFilas(filas, '', '').length === 5);
ok('chips de temporada 2025 / 2026 / 2027', /\[2025,\s*2026,\s*2027\]/.test(SRC));

console.log('6. CSV');
var csv = ctx.csvTabla(ctx.ordenarFilas(filas));
var lines = csv.replace(/^﻿/, '').split('\r\n');
ok('BOM UTF-8', csv.charCodeAt(0) === 0xFEFF);
ok('cabecera', lines[0] === 'Villa;Villa manager;Estado;Fecha de revisión;Estado general;Nº actuaciones prioritarias', lines[0]);
ok('una linea por villa', lines.filter(Boolean).length === 6);
ok('fila enviada', lines.indexOf('Villa Cielos Azules;Amanda Townsend;Enviado;26/10/2026;Bueno;2') > 0, lines.join('\n'));

console.log('7. Lecturas y pagina');
var cg = fnSource(SRC, 'cargarTodo');
ok('TaVillas Status=1 limit 500', cg.indexOf("encodeURIComponent('Status=1')") > 0 && /table=TaVillas[^\n]*limit=500/.test(cg));
ok('TaInformeTemporada temporada=<y> limit 500', /table=TaInformeTemporada&where='\+encodeURIComponent\('temporada='\+/.test(SRC) && /temporada='\+[^\n]*limit=500/.test(SRC));
ok("lineas: una lectura seccion='resumen' limit 1000", SRC.indexOf("encodeURIComponent(\"seccion='resumen'\")+'&limit=1000'") > 0 && (SRC.match(/table=TaInformeTemporadaLineas/g) || []).length === 1);
ok('TaUsers y TaContacts', SRC.indexOf('table=TaUsers') > 0 && SRC.indexOf('table=TaContacts') > 0);
ok('VERSIÓN ACTUAL: v1 en las 5 primeras lineas y PAGE_VERSION = 1', /VERSIÓN ACTUAL: v1 \|/.test(SRC.split('\n').slice(0, 5).join('\n')) && /const PAGE_VERSION = 1;/.test(SRC));
ok('checkForNewerVersion', SRC.indexOf('function checkForNewerVersion(') > 0);
ok('boton ⬇️ CSV', SRC.indexOf('⬇️ CSV') > 0);
var hist = SRC.slice(SRC.indexOf('<!-- HISTORIAL: v1 - '));
ok('HISTORIAL v1 con Jordi, fecha y prueba', SRC.indexOf('<!-- HISTORIAL: v1 - ') > 0 && hist.indexOf('Jordi') >= 0 && hist.indexOf('27/10/2026') >= 0 && hist.indexOf('informes-temporada.test.js') >= 0);
ok('el comentario HISTORIAL cierra una sola vez', hist.split('-->').length === 2);
var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, n = 0, bad = '';
while ((m = re.exec(SRC))) { n++; try { new vm.Script(m[1]); } catch (e) { bad += e.message; } }
ok('los scripts compilan', n > 0 && !bad, bad);

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
