/* Pruebas del listado de informes de fin de temporada (informes-temporada.html v3, Jordi 27/10/2026; v3 28/10/2026: enlace al cuadro).
   node informes-temporada.test.js
   v2 (ronda de arreglos 1 tras las dos revisiones del 27/10/2026): lineas solo de la temporada (rango de informe_id),
   una respuesta tardia de otra temporada se ignora, chips calculados con el año actual, informe_id mas bajo por villa.
   La parte 8 carga el script REAL de la pagina con vm y un fetch falso (arnes-informe.js).
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
var FNS = ['temporadasDe', 'whereLineasTemporada', 'puedeVerListado', 'estadoInforme', 'contarAcciones', 'nombreVM', 'construirFilas', 'ordenarFilas', 'contadores', 'contadorTexto', 'filtrarFilas', 'csvCell', 'csvTabla', 'abrirUrl'];
var ctx = {};
var faltan = FNS.filter(function (n) { try { fnSource(SRC, n); return false; } catch (e) { return true; } });
ok('las funciones existen en la pagina', !faltan.length, faltan.join(', '));
try { vm.runInNewContext(FNS.filter(function (n) { return faltan.indexOf(n) < 0; }).map(function (n) { return fnSource(SRC, n); }).join('\n'), ctx); }
catch (e) { ok('las funciones compilan', false, e.message); console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(1); }
faltan.forEach(function (n) { ctx[n] = function () { return undefined; }; });

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
var dup = ctx.construirFilas(villas, [{ informe_id: 15, villaid: 1, temporada: 2026, estado: 'borrador', estado_general: 'Malo' }].concat(informes), lineas, contacts, users, 2026);
ok('dos informes para una villa: cuenta el de informe_id mas bajo', dup.filter(function (f) { return f.villaid === 1; })[0].estado === 'Enviado' && dup.filter(function (f) { return f.villaid === 1; })[0].estadoGeneral === 'Bueno');
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
ok('chips de temporada: año actual -1, actual, +1', JSON.stringify(ctx.temporadasDe(2026)) === '[2025,2026,2027]' && JSON.stringify(ctx.temporadasDe(2031)) === '[2030,2031,2032]');
ok('sin años fijos en la pagina', !/\[2025,\s*2026,\s*2027\]/.test(SRC));

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
ok("WHERE de lineas: seccion='resumen' y el rango de informe_id de la temporada", ctx.whereLineasTemporada([12, 10, 11]) === "seccion='resumen' AND informe_id>=10 AND informe_id<=12", ctx.whereLineasTemporada([12, 10, 11]));
ok('WHERE de lineas numerico', ctx.whereLineasTemporada(['10 OR 1=1', 7]) === "seccion='resumen' AND informe_id>=7 AND informe_id<=10");
ok("lineas: una sola lectura en la pagina, limit 1000", (SRC.match(/table=TaInformeTemporadaLineas/g) || []).length === 1 && /table=TaInformeTemporadaLineas[^\n]*limit=1000/.test(SRC));
ok('TaUsers y TaContacts', SRC.indexOf('table=TaUsers') > 0 && SRC.indexOf('table=TaContacts') > 0);
ok('VERSIÓN ACTUAL: v3 en las 5 primeras lineas y PAGE_VERSION = 3', /VERSIÓN ACTUAL: v3 \|/.test(SRC.split('\n').slice(0, 5).join('\n')) && /const PAGE_VERSION = 3;/.test(SRC));
ok('titulo v3', SRC.indexOf('<title>Informes de temporada v3 — 3Villas</title>') > 0);
ok('v3: enlace "Cuadro ›" al cuadro en la barra de titulo', /<nav class="top-nav">[\s\S]*<a [^>]*href="cuadro-informes-temporada.html"[^>]*>Cuadro ›<\/a>[\s\S]*<\/nav>/.test(SRC));
var h3i = SRC.indexOf('<!-- HISTORIAL: v3 - '), hist3 = h3i > 0 ? SRC.slice(h3i, SRC.indexOf('-->', h3i)) : '';
ok('HISTORIAL v3 en español, antes de v2, con la fecha y el cuadro', h3i > 0 && h3i < SRC.indexOf('<!-- HISTORIAL: v2 - ') && hist3.indexOf('28/10/2026') >= 0 && hist3.indexOf('cuadro-informes-temporada.html') >= 0);
ok('checkForNewerVersion', SRC.indexOf('function checkForNewerVersion(') > 0);
ok('boton ⬇️ CSV', SRC.indexOf('⬇️ CSV') > 0);
var hist = SRC.slice(SRC.indexOf('<!-- HISTORIAL: v1 - '));
ok('HISTORIAL v1 con Jordi, fecha y prueba', SRC.indexOf('<!-- HISTORIAL: v1 - ') > 0 && hist.indexOf('Jordi') >= 0 && hist.indexOf('27/10/2026') >= 0 && hist.indexOf('informes-temporada.test.js') >= 0);
ok('el comentario HISTORIAL v1 cierra una sola vez', hist.split('-->').length === 2);
var h2i = SRC.indexOf('<!-- HISTORIAL: v2 - '), hist2 = h2i > 0 ? SRC.slice(h2i, SRC.indexOf('-->', h2i)) : '';
ok('HISTORIAL v2 en español: las dos revisiones del 27/10/2026 y la prueba', h2i > 0 && h2i < SRC.indexOf('<!-- HISTORIAL: v1 - ') && /revisiones/.test(hist2) && hist2.indexOf('27/10/2026') >= 0 && hist2.indexOf('informes-temporada.test.js') >= 0);
var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, n = 0, bad = '';
while ((m = re.exec(SRC))) { n++; try { new vm.Script(m[1]); } catch (e) { bad += e.message; } }
ok('los scripts compilan', n > 0 && !bad, bad);


var A = require('./arnes-informe.js'), fin = false;
process.on('exit', function () { if (!fin) { console.log('\n' + pass + ' PASS, ' + (fail + 1) + ' FAIL (las pruebas con fetch falso no terminaron)'); process.exitCode = 1; } });
async function parte(f) { try { await f(); } catch (e) { ok('la parte termina sin excepcion', false, e && e.message); } }
/* Fecha fija: hoy es 27/10/2026 (o el año que se pida) */
function fechaFija(iso) { var D = Date; function F() { return arguments.length ? new (Function.prototype.bind.apply(D, [null].concat([].slice.call(arguments))))() : new D(iso); } F.now = function () { return new D(iso).getTime(); }; F.prototype = D.prototype; return F; }
function dbListado() {
  return {
    TaVillas: [{ villaid: 1, Name: 'Villa Cielos Azules', KeyHolder_person: '501', Status: 1 }, { villaid: 2, Name: 'Villa Alba', KeyHolder_person: 'U7', Status: 1 }, { villaid: 3, Name: 'Casa Brisa', KeyHolder_person: '', Status: 1 }],
    TaUsers: [{ UserID: 'U7', Name: 'Pep Vm' }], TaContacts: [{ ContactID: '501', Name: 'Amanda Townsend' }],
    TaInformeTemporada: [
      { informe_id: 10, villaid: 1, temporada: 2026, estado: 'enviado', estado_general: 'Bueno', fecha_revision: '2026-10-26T00:00:00' },
      { informe_id: 11, villaid: 2, temporada: 2025, estado: 'enviado', estado_general: 'Malo', fecha_revision: '2025-10-20T00:00:00' },
      { informe_id: 12, villaid: 2, temporada: 2026, estado: 'borrador', estado_general: '', fecha_revision: '' },
      { informe_id: 13, villaid: 3, temporada: 2027, estado: 'borrador', estado_general: 'Regular', fecha_revision: '' }],
    TaInformeTemporadaLineas: [
      { linea_id: 1, informe_id: 10, seccion: 'resumen', clave: 'accion_1', texto_1: 'Pérgola' },
      { linea_id: 2, informe_id: 10, seccion: 'resumen', clave: 'accion_2', texto_1: 'Pintar' },
      { linea_id: 3, informe_id: 11, seccion: 'resumen', clave: 'accion_1', texto_1: 'De 2025' },
      { linea_id: 4, informe_id: 12, seccion: 'resumen', clave: 'accion_1', texto_1: 'Toldo' }]
  };
}
function lista(o) { o = o || {}; return A.cargar({ archivo: P, db: dbListado(), rol: 'admin', Date: fechaFija(o.hoy || '2026-10-27T12:00:00') }); }
(async function () {
  await parte(async function () {
    console.log('8.1 Carga: lineas solo de la temporada');
    var H = lista(); await H.ev('iniciar()');
    var lin = H.S.calls.filter(function (x) { return x.table === 'TaInformeTemporadaLineas'; });
    H.S.calls.forEach(function (x) { console.log('        ' + H.S.texto(x)); });
    ok('una lectura de lineas con el rango de informe_id de 2026', lin.length === 1 && lin[0].where === "seccion='resumen' AND informe_id>=10 AND informe_id<=12" && lin[0].limit === '1000', lin.map(function (x) { return x.where; }).join(' | '));
    ok('la lectura de lineas va despues de la de informes', H.S.calls.indexOf(lin[0]) > H.S.calls.findIndex(function (x) { return x.table === 'TaInformeTemporada'; }));
    var f = H.ev('FILAS');
    var alba = f.filter(function (x) { return x.villaid === 2; })[0], cielos = f.filter(function (x) { return x.villaid === 1; })[0];
    ok('cuenta por informe_id del conjunto de la temporada (la linea del informe 11, de 2025, no cuenta)', cielos.acciones === 2 && alba.acciones === 1 && alba.estado === 'Borrador', JSON.stringify(f));
    ok('villa manager por KeyHolder_person', cielos.vm === 'Amanda Townsend' && alba.vm === 'Pep Vm');
    ok('TaContacts limit 500', H.S.calls.some(function (x) { return x.table === 'TaContacts' && x.limit === '500'; }));
    ok('chips calculados: 2025, 2026, 2027; por defecto 2026', /data-temp="2025"[\s\S]*data-temp="2026"[\s\S]*data-temp="2027"/.test(H.g('main').innerHTML) && H.ev('TEMP') === 2026);
    var H2 = lista({ hoy: '2031-03-01T12:00:00' }); await H2.ev('iniciar()');
    ok('en 2031: chips 2030, 2031, 2032 y por defecto 2031', /data-temp="2030"[\s\S]*data-temp="2031"[\s\S]*data-temp="2032"/.test(H2.g('main').innerHTML) && H2.ev('TEMP') === 2031);
    ok('temporada sin informes: ninguna lectura de lineas', H2.S.calls.every(function (x) { return x.table !== 'TaInformeTemporadaLineas'; }));
  });
  await parte(async function () {
    console.log('8.2 Una respuesta tardia de otra temporada se ignora');
    var H = lista(); await H.ev('iniciar()');
    H.S.retrasa(function (x) { return x.table === 'TaInformeTemporada' && /temporada=2025/.test(x.where || ''); }, 120);
    var i = H.S.marca();
    var p1 = H.ctx.cambiarTemporada(2025);
    await H.ctx.cambiarTemporada(2027);
    await p1; await H.espera(20);
    H.S.desde(i).forEach(function (x) { console.log('        ' + H.S.texto(x)); });
    var inf = H.ev('INFORMES');
    ok('se queda la temporada del ultimo toque (2027)', H.ev('TEMP') === 2027 && inf.length === 1 && inf[0].temporada === 2027, JSON.stringify(inf));
    var casa = H.ev('FILAS').filter(function (x) { return x.villaid === 3; })[0];
    ok('la tabla es la de 2027', casa.estado === 'Borrador' && casa.estadoGeneral === 'Regular' && H.ev('FILAS').filter(function (x) { return x.villaid === 2; })[0].estado === 'Sin informe');
    ok('el contador no se queda en "Cargando…"', /villas/.test(H.g('contador').textContent), H.g('contador').textContent);
  });
  await parte(async function () {
    console.log('8.3 Errores');
    var H = lista(); H.S.falla(function (x) { return x.table === 'TaInformeTemporadaLineas'; }); await H.ev('iniciar()');
    ok('lineas fallan: "Error al cargar" en el contador', /Error/.test(H.g('contador').textContent));
  });
})().then(function () {
  fin = true;
  console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
});
