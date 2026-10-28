/* Pruebas del cuadro de informes de temporada (cuadro-informes-temporada.html v2, Jordi y Gary 28/10/2026; v2 = ronda de arreglos 1, partes 13 y 12.5 a 12.12).
   node cuadro-informes-temporada.test.js
   Como informes-temporada.test.js: extrae con vm las funciones reales de la pagina (partes 1 a 11) y despues
   carga el script REAL de la pagina con un fetch falso (arnes-informe.js, parte 12). Sin red. */
var fs = require('fs'), vm = require('vm');
var P = 'cuadro-informes-temporada.html';
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
var FNS = ['elementosDef', 'gruposMapa', 'temporadasDe', 'trozosIds', 'whereLineasRango', 'informePorVilla', 'lineasUnicas', 'nombreVM', 'abrirUrl', 'fechaVer',
  'estadoDe', 'construirCasas', 'tiles', 'textoNombres', 'ordenarCasas', 'mapaProblemas', 'claseCalor', 'prioridadVer', 'prioridadGuardar', 'obras',
  'filtrarPorVM', 'vmsDe', 'csvCell', 'csvObras', 'esc', 'esElemento', 'vmDe'];
var ctx = {};
var faltan = FNS.filter(function (n) { try { fnSource(SRC, n); return false; } catch (e) { return true; } });
ok('las funciones existen en la pagina', !faltan.length, faltan.join(', '));
try { vm.runInNewContext(FNS.filter(function (n) { return faltan.indexOf(n) < 0; }).map(function (n) { return fnSource(SRC, n); }).join('\n'), ctx); }
catch (e) { ok('las funciones compilan', false, e.message); console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(1); }
faltan.forEach(function (n) { ctx[n] = function () { return undefined; }; });
function J(x) { return JSON.stringify(x); }
function safe(f) { try { return f(); } catch (e) { return e; } }

console.log('1. Elementos: las 26 claves del formulario');
var FORM = fs.readFileSync('informe-temporada.html', 'utf8'), fctx = {};
vm.runInNewContext(fnSource(FORM, 'seccionesDef'), fctx);
var esperado = [];
fctx.seccionesDef().filter(function (s) { return s.tipo === 'estado'; }).forEach(function (s) { s.claves.forEach(function (c) { esperado.push({ seccion: s.id, clave: c[0], label: c[1] }); }); });
var el = safe(function () { return ctx.elementosDef(); }) || [];
ok('26 elementos (interior 13, exterior 9, seguridad 4)', el.length === 26 && esperado.length === 26 &&
  el.filter(function (e) { return e.seccion === 'interior'; }).length === 13 && el.filter(function (e) { return e.seccion === 'exterior'; }).length === 9 &&
  el.filter(function (e) { return e.seccion === 'seguridad'; }).length === 4, J(el).slice(0, 200));
ok('mismas claves, mismas palabras y mismo orden que seccionesDef() del formulario', J(el) === J(esperado));
ok('claves fijadas', el.map && el.map(function (e) { return e.clave; }).join(',') === 'pintura,colchones,sofas,mobiliario_cocina,menaje,electrodomesticos,aire_acondicionado,puertas,ventanas,banos,desagues,iluminacion,humedades,' +
  'fachada,carpinteria_exterior,pavimentos,barandillas,jardin_muros,piscina,mobiliario_exterior,barbacoa,iluminacion_exterior,cerraduras,instalacion_electrica,fontaneria_agua_caliente,wifi_tv');
var gm = safe(function () { return ctx.gruposMapa(); }) || [];
ok('tres grupos del mapa: Interior, Exterior, Seguridad e instalaciones', J(gm) === J([['interior', 'Interior'], ['exterior', 'Exterior'], ['seguridad', 'Seguridad e instalaciones']]), J(gm));

console.log('2. Lectura de lineas por trozos de 15 informes');
var ids = []; for (var i = 1; i <= 33; i++) ids.push(i);
var tz = safe(function () { return ctx.trozosIds(ids.slice().reverse().concat([7, '0', 'x', -3]), 15); }) || [];
ok('33 ids -> 15 + 15 + 3, ordenados y sin repetir', tz.length === 3 && tz[0].length === 15 && tz[1].length === 15 && tz[2].length === 3 && tz[0][0] === 1 && tz[1][0] === 16 && tz[2][2] === 33, J(tz));
ok('sin ids: ningun trozo', J(ctx.trozosIds([], 15)) === '[]');
ok('ids de texto se pasan a numero', J(ctx.trozosIds(['12', '10', '11'], 15)) === '[[10,11,12]]');
ok('whereLineasRango: rango del trozo y solo las 4 secciones que usa la pagina (v2)', ctx.whereLineasRango([16, 20, 17]) === "informe_id>=16 AND informe_id<=20 AND seccion IN ('resumen','interior','exterior','seguridad')", ctx.whereLineasRango([16, 20, 17]));
ok('whereLineasRango numerico', ctx.whereLineasRango(['10 OR 1=1', 7]) === "informe_id>=7 AND informe_id<=10 AND seccion IN ('resumen','interior','exterior','seguridad')", ctx.whereLineasRango(['10 OR 1=1', 7]));

console.log('3. Un informe por villa: el informe_id mas bajo');
var pv = safe(function () { return ctx.informePorVilla([{ informe_id: 14, villaid: 1 }, { informe_id: 10, villaid: 1 }, { informe_id: '9', villaid: '2' }, { informe_id: 12, villaid: 1 }]); }) || {};
ok('villa 1 -> 10, villa 2 -> 9', pv['1'] && pv['1'].informe_id === 10 && pv['2'] && pv['2'].informe_id === '9', J(pv));
var lu = safe(function () { return ctx.lineasUnicas([{ linea_id: 1, informe_id: 10, seccion: 'interior', clave: 'pintura', estado: 'Malo' }, { linea_id: 5, informe_id: 10, seccion: 'interior', clave: 'pintura', estado: 'Bueno' }, { linea_id: 3, informe_id: 11, seccion: 'interior', clave: 'pintura', estado: 'Malo' }]); }) || [];
ok('lineasUnicas: una fila por informe, seccion y clave; gana el linea_id mas alto (como el formulario)', lu.length === 2 && lu.filter(function (l) { return l.informe_id === 10; })[0].estado === 'Bueno', J(lu));

/* Fixture: 5 villas. Son Bou malo (3 marcas Malo), Cala Mitjana regular, Villa Alba bueno enviado, Casa Brisa sin informe, Villa Duna borrador sin estado general */
var villas = [
  { villaid: 1, Name: 'Son Bou', KeyHolder_person: '501' },
  { villaid: 2, Name: 'Cala Mitjana', KeyHolder_person: 'U7' },
  { villaid: 3, Name: 'Villa Alba', KeyHolder_person: '501' },
  { villaid: 4, Name: 'Casa Brisa', KeyHolder_person: 'U7' },
  { villaid: 5, Name: 'Villa Duna', KeyHolder_person: '502' }
];
var contacts = [{ id: '501', name: 'Kike' }, { id: '502', name: 'Pau' }], users = [{ id: 'U7', name: 'Rafa' }];
var informes = [
  { informe_id: 10, villaid: 1, estado: 'enviado', estado_general: 'Malo', fecha_revision: '2026-10-27T00:00:00' },
  { informe_id: 11, villaid: 2, estado: 'enviado', estado_general: 'Regular', fecha_revision: '2026-10-23T00:00:00' },
  { informe_id: 12, villaid: 3, estado: 'Enviado', estado_general: 'bueno', fecha_revision: '2026-10-24T00:00:00' },
  { informe_id: 13, villaid: 5, estado: 'borrador', estado_general: '', fecha_revision: '' },
  { informe_id: 14, villaid: 1, estado: 'borrador', estado_general: 'Bueno', fecha_revision: '' }
];
var lineas = [
  { informe_id: 10, seccion: 'interior', clave: 'pintura', estado: 'Malo' },
  { informe_id: 10, seccion: 'interior', clave: 'colchones', estado: 'malo' },
  { informe_id: 10, seccion: 'exterior', clave: 'piscina', estado: 'Malo' },
  { informe_id: 10, seccion: 'exterior', clave: 'fachada', estado: 'Regular' },
  { informe_id: 10, seccion: 'interior', clave: 'sofas', estado: 'Bueno' },
  { informe_id: 10, seccion: 'estancia', clave: 'salon', estado: 'Malo', texto_1: 'No cuenta: no es un elemento' },
  { informe_id: 10, seccion: 'resumen', clave: 'accion_1', orden: 1, texto_1: 'Cambiar la depuradora', texto_2: 'Pierde agua', prioridad: 'Alta' },
  { informe_id: 10, seccion: 'resumen', clave: 'accion_2', orden: 2, texto_1: 'Pintar el salón', texto_2: '', prioridad: 'Media' },
  { informe_id: 10, seccion: 'resumen', clave: 'accion_3', orden: 3, texto_1: '  ', prioridad: 'Alta' },
  { informe_id: 11, seccion: 'exterior', clave: 'piscina', estado: 'Regular' },
  { informe_id: 11, seccion: 'interior', clave: 'pintura', estado: 'Regular' },
  { informe_id: 11, seccion: 'resumen', clave: 'accion_1', orden: 1, texto_1: 'Toldo nuevo', prioridad: 'alta' },
  { informe_id: 11, seccion: 'resumen', clave: 'accion_2', orden: 2, texto_1: 'Revisar el termo', prioridad: 'Baja' },
  { informe_id: 12, seccion: 'resumen', clave: 'accion_1', orden: 1, texto_1: 'Repintar la fachada', prioridad: 'Media' },
  { informe_id: 13, seccion: 'interior', clave: 'pintura', estado: 'Regular' },
  { informe_id: 14, seccion: 'interior', clave: 'menaje', estado: 'Malo' },
  { informe_id: 14, seccion: 'resumen', clave: 'accion_1', texto_1: 'Del informe duplicado', prioridad: 'Alta' },
  { informe_id: 99, seccion: 'interior', clave: 'menaje', estado: 'Malo' }
];
var filas = safe(function () { return ctx.construirCasas(villas, informes, lineas, contacts, users, 2026); }) || [];
function fila(n) { return (filas.filter ? filas : []).filter(function (f) { return f.villa === n; })[0] || {}; }

console.log('4. Casas y cuadros');
ok('una fila por villa activa', filas.length === 5, J(filas).slice(0, 300));
var sb = fila('Son Bou');
ok('Son Bou: informe 10 (el mas bajo), malo, Kike, 27/10/2026, M 3 R 1 A 1', sb.informe_id === 10 && sb.general === 'malo' && sb.vm === 'Kike' && sb.fecha === '27/10/2026' && sb.malo === 3 && sb.regular === 1 && sb.alta === 1, J(sb));
ok('Son Bou: abre informe-temporada.html?villaid=1&temporada=2026', sb.url === 'informe-temporada.html?villaid=1&temporada=2026');
ok('Villa Alba: estado Enviado y bueno en minusculas', fila('Villa Alba').estado === 'enviado' && fila('Villa Alba').general === 'bueno', J(fila('Villa Alba')));
ok('Villa Duna: borrador sin estado general', fila('Villa Duna').estado === 'borrador' && fila('Villa Duna').general === '' && fila('Villa Duna').regular === 1);
ok('Casa Brisa: sin informe', fila('Casa Brisa').estado === '' && fila('Casa Brisa').informe_id === null && fila('Casa Brisa').malo === 0, J(fila('Casa Brisa')));
ok('estadoDe: MALO / REGULAR / BUENO / BORRADOR / SIN INFORME', [sb, fila('Cala Mitjana'), fila('Villa Alba'), fila('Villa Duna'), fila('Casa Brisa')].map(function (f) { return ctx.estadoDe(f); }).join(',') === 'malo,regular,bueno,borrador,sin');
var t = safe(function () { return ctx.tiles(filas, lineas); }) || {};
ok('Informes entregados: 3 de 5, 1 en borrador, 1 sin informe', t.entregados === 3 && t.total === 5 && t.borrador === 1 && t.sin === 1, J(t));
ok('Casas en estado Malo: 1 (Son Bou)', t.casasMalo && t.casasMalo.n === 1 && J(t.casasMalo.nombres) === '["Son Bou"]', J(t.casasMalo));
ok('Actuaciones prioridad Alta: 2, en 2 casas, 5 en total (la vacia y la del informe duplicado no cuentan)', t.accionesAlta && t.accionesAlta.n === 2 && t.accionesAlta.casas === 2 && t.accionesAlta.total === 5, J(t.accionesAlta));
ok('Marcas Malo: 3 de 104 comprobaciones (4 informes x 26), 4 Regular', t.marcasMalo && t.marcasMalo.n === 3 && t.marcasMalo.comprobaciones === 104 && t.marcasMalo.regular === 4, J(t.marcasMalo));
var t0 = safe(function () { return ctx.tiles(ctx.construirCasas(villas, [], [], contacts, users, 2026), []); }) || {};
ok('temporada vacia: 0 de 5, todo a 0', t0.entregados === 0 && t0.total === 5 && t0.sin === 5 && t0.casasMalo.n === 0 && t0.accionesAlta.n === 0 && t0.marcasMalo.comprobaciones === 0, J(t0));
ok('textoNombres: hasta 6 nombres y luego "+n"', ctx.textoNombres(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h'], 6) === 'a, b, c, d, e, f +2' && ctx.textoNombres(['a', 'b'], 6) === 'a, b' && ctx.textoNombres([], 6) === '');

console.log('5. Orden de las casas: peor primero');
var o = safe(function () { return ctx.ordenarCasas(filas).map(function (f) { return f.villa; }); }) || [];
ok('Malo, Regular, Bueno, Borrador, Sin informe', J(o) === J(['Son Bou', 'Cala Mitjana', 'Villa Alba', 'Villa Duna', 'Casa Brisa']), J(o));
var o2 = ctx.ordenarCasas([{ villa: 'B', general: 'malo', estado: 'enviado', malo: 1 }, { villa: 'C', general: 'malo', estado: 'enviado', malo: 4 }, { villa: 'A', general: 'malo', estado: 'enviado', malo: 1 }, { villa: 'Z', general: 'regular', estado: 'borrador', malo: 9 }]).map(function (f) { return f.villa; });
ok('dentro del grupo: marcas Malo de mas a menos y luego nombre', J(o2) === '["C","A","B","Z"]', J(o2));

console.log('6. Mapa de problemas');
var mp = safe(function () { return ctx.mapaProblemas(lineas, filas); }) || {};
ok('26 claves en el mapa', Object.keys(mp).length === 26, Object.keys(mp).length);
ok('pintura: 1 Malo, 2 Regular; piscina 1 y 1; colchones 1 y 0; fachada 0 y 1', J(mp.pintura) === '{"malo":1,"regular":2}' && J(mp.piscina) === '{"malo":1,"regular":1}' && J(mp.colchones) === '{"malo":1,"regular":0}' && J(mp.fachada) === '{"malo":0,"regular":1}', J(mp));
ok('menaje: 0 (solo en el informe duplicado y en otra temporada)', mp.menaje && mp.menaje.malo === 0);
ok('claseCalor 0,1,2,3,4,6,7,20 -> h0,h1,h2,h2,h3,h3,h4,h4', [0, 1, 2, 3, 4, 6, 7, 20].map(function (n) { return ctx.claseCalor(n); }).join(',') === 'h0,h1,h2,h2,h3,h3,h4,h4');

console.log('7. Obras pendientes');
var ob = safe(function () { return ctx.obras(lineas, filas); }) || [];
ok('5 actuaciones: Alta, Media, Baja y por casa', J(ob.map && ob.map(function (r) { return r.villa + '|' + r.accion + '|' + r.prioridad; })) === J(['Cala Mitjana|Toldo nuevo|Alto', 'Son Bou|Cambiar la depuradora|Alto', 'Son Bou|Pintar el salón|Medio', 'Villa Alba|Repintar la fachada|Medio', 'Cala Mitjana|Revisar el termo|Bajo']), J(ob));
var r0 = ob[1] || {};
ok('fila con VM, motivo, estado general, fecha y enlace', r0.vm === 'Kike' && r0.motivo === 'Pierde agua' && r0.general === 'Malo' && r0.fecha === '27/10/2026' && r0.url === 'informe-temporada.html?villaid=1&temporada=2026' && r0.clase === 'alto', J(r0));
ok('prioridadVer: alta/media/baja -> Alto/Medio/Bajo', ctx.prioridadVer('alta') === 'Alto' && ctx.prioridadVer('Media') === 'Medio' && ctx.prioridadVer('baja') === 'Bajo' && ctx.prioridadVer('') === '');
ok('prioridadGuardar: Alto/Medio/Bajo -> Alta/Media/Baja (como el formulario)', ctx.prioridadGuardar('Alto') === 'Alta' && ctx.prioridadGuardar('medio') === 'Media' && ctx.prioridadGuardar('Bajo') === 'Baja');
ok('prioridadVer y prioridadGuardar son las del formulario', fnSource(SRC, 'prioridadVer') === fnSource(FORM, 'prioridadVer') && fnSource(SRC, 'prioridadGuardar') === fnSource(FORM, 'prioridadGuardar'));

console.log('8. Filtro por villa manager');
var fk = safe(function () { return ctx.filtrarPorVM(filas, lineas, 'c:501'); }) || {};
ok('Kike (c:501): Son Bou y Villa Alba y solo sus lineas', fk.filas && J(fk.filas.map(function (f) { return f.villa; }).sort()) === '["Son Bou","Villa Alba"]' && fk.lineas.every(function (l) { return l.informe_id === 10 || l.informe_id === 12; }) && fk.lineas.length === 10, fk.lineas && fk.lineas.length);
var fa = ctx.filtrarPorVM(filas, lineas, '') || {};
ok('"" = todas', fa.filas && fa.filas.length === 5 && fa.lineas.length === lineas.length);
ok('tiles con el filtro Kike: 2 de 2', ctx.tiles(fk.filas, fk.lineas).total === 2 && ctx.tiles(fk.filas, fk.lineas).accionesAlta.n === 1);
ok('vmsDe: [id, nombre] de Kike, Pau, Rafa (ordenados por nombre, sin repetir)', J(ctx.vmsDe(filas)) === '[["c:501","Kike"],["c:502","Pau"],["u:U7","Rafa"]]', J(ctx.vmsDe(filas)));

console.log('9. CSV de obras');
var csv = safe(function () { return ctx.csvObras([{ villa: 'Son Bou', vm: 'Kike', accion: 'Cambiar "la" depuradora; ya', motivo: '=SUMA(A1)', prioridad: 'Alto', general: 'Malo', fecha: '27/10/2026', informe: 'Enviado' }]); }) || '';
var cl = String(csv).split('\r\n');
ok('BOM al principio', csv.charCodeAt && csv.charCodeAt(0) === 0xFEFF);
ok('cabecera', cl[0] === '﻿Casa;Villa manager;Actuación;Motivo / impacto;Prioridad;Estado general de la casa;Fecha de revisión;Informe', cl[0]);
ok('separador ; , comillas escapadas y formula neutralizada', cl[1] === 'Son Bou;Kike;"Cambiar ""la"" depuradora; ya";\'=SUMA(A1);Alto;Malo;27/10/2026;Enviado', cl[1]);
ok('csvCell es la del listado', fnSource(SRC, 'csvCell') === fnSource(fs.readFileSync('informes-temporada.html', 'utf8'), 'csvCell'));

console.log('10. Pagina');
['Informes entregados', 'Casas en estado Malo', 'Actuaciones prioridad Alta', 'Marcas Malo en elementos'].forEach(function (s) { ok('cuadro "' + s + '"', SRC.indexOf(s) > 0); });
ok('grupos Interior / Exterior / Seguridad e instalaciones', SRC.indexOf("'Interior'") > 0 && SRC.indexOf("'Exterior'") > 0 && SRC.indexOf("'Seguridad e instalaciones'") > 0);
ok('titulo de las casas', /Casas\s*<small>· peor primero · un clic abre el informe<\/small>/.test(SRC));
ok('titulos del mapa y de las obras', /Mapa de problemas\s*<small>· nº de casas por elemento<\/small>/.test(SRC) && /Obras pendientes\s*<small>· actuaciones prioritarias de todas las casas<\/small>/.test(SRC));
ok('cabecera y proposito', SRC.indexOf('Informes de fin de temporada') > 0 && SRC.indexOf('Qué casas necesitan obra, qué obra, y quién no ha entregado el informe.') > 0 && SRC.indexOf('Dirección · estado de las casas al cierre de la temporada') > 0);
ok('botones ⬇️ CSV obras y 🖨️ Imprimir (con U+FE0F, v2) e imprimir() con window.print()', SRC.indexOf('\u2B07\uFE0F CSV obras') > 0 && SRC.indexOf('\uD83D\uDDA8\uFE0F Imprimir') > 0 && SRC.indexOf('\u2B07 CSV') < 0 && SRC.indexOf('\uD83D\uDDA8 Imprimir') < 0 && SRC.indexOf('window.print()') > 0);
ok('vacio y error', SRC.indexOf('Ninguna actuación todavía') > 0 && SRC.indexOf('No se pudieron leer los informes') > 0);
ok('@media (max-width: 640px)', /@media\s*\(max-width:\s*640px\)/.test(SRC));
ok('@media print con A4 vertical y 12 mm', /@media print/.test(SRC) && /@page\s*\{[^}]*A4 portrait[^}]*12mm/.test(SRC));
ok("Auth.require('cuadro-informes-temporada')", SRC.indexOf("Auth.require('cuadro-informes-temporada')") > 0);
ok('auth.js?v=20261028 (v2: salta el auth.js viejo de la cache), nav.js y nav-component.js', /<script src="auth.js\?v=20261028"><\/script>\s*<script src="nav.js"><\/script>\s*<script src="nav-component.js"><\/script>/.test(SRC));
ok('VERSIÓN ACTUAL: v2 en las 5 primeras lineas, PAGE_VERSION = 2, titulo v2', /VERSIÓN ACTUAL: v2 \|/.test(SRC.split('\n').slice(0, 5).join('\n')) && /const PAGE_VERSION = 2;/.test(SRC) && SRC.indexOf('<title>Cuadro de informes de temporada v2 — 3Villas</title>') > 0);
ok("WORKER y Auth.url", SRC.indexOf("const WORKER = 'https://www.3villas.com/intranet/api';") > 0 && SRC.indexOf('Auth.url(') > 0);
ok('checkForNewerVersion', SRC.indexOf('function checkForNewerVersion(') > 0);
ok('solo lecturas: ninguna escritura al Worker', !/action=save|method:\s*'(POST|PUT|DELETE)'|action=upload/.test(SRC));
var hi = SRC.indexOf('<!-- HISTORIAL: v1 - '), hist = hi > 0 ? SRC.slice(hi) : '';
ok('HISTORIAL v1 en español con la fecha y la prueba, cierra una sola vez', hi > 0 && hist.indexOf('28/10/2026') > 0 && hist.indexOf('cuadro-informes-temporada.test.js') > 0 && hist.split('-->').length === 2);
var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, n = 0, bad = '';
while ((m = re.exec(SRC))) { n++; try { new vm.Script(m[1]); } catch (e) { bad += e.message; } }
ok('los scripts compilan', n > 0 && !bad, bad);

console.log('11. Menu y permisos');
var NAV = fs.readFileSync('nav.js', 'utf8'), AUTH = fs.readFileSync('auth.js', 'utf8');
ok("nav.js: entrada 'Cuadro de informes de temporada' para admin y manager despues de 'Informes de temporada'", /\{ label: 'Informes de temporada', url: 'informes-temporada.html'[^\n]*\n\s*\{ label: 'Cuadro de informes de temporada', url: 'cuadro-informes-temporada.html', icon: '📊', roles: \['admin','manager'\] \}/.test(NAV));
ok('nav.js v22 (cabecera, VERSIÓN ACTUAL, NAV_VERSION y HISTORIAL)', /3Villas  v22/.test(NAV) && /VERSIÓN ACTUAL: v22/.test(NAV) && /NAV_VERSION = 22;/.test(NAV) && /\/\/ HISTORIAL: v22 - [^\n]*cuadro-informes-temporada\.html/.test(NAV));
ok("auth.js: 'cuadro-informes-temporada': ['admin', 'manager'] con comentario fechado", /'cuadro-informes-temporada'\s*: \['admin', 'manager'\],\s*\/\/ 28\/10\/2026/.test(AUTH));
ok('auth.js: Última revisión 28/10/2026', /Última revisión: 28\/10\/2026/.test(AUTH));

console.log('13. Ronda de arreglos 1 (v2): funciones puras y reglas de la pagina');
/* 3. Una sola regla para las marcas: la seccion y la clave son una de las 26 de elementosDef() */
var lin3 = lineas.concat([{ informe_id: 12, seccion: 'interior', clave: 'piscina_vieja', estado: 'Malo' }, { informe_id: 12, seccion: 'interior', clave: 'piscina', estado: 'Malo' }, { informe_id: 12, seccion: 'resumen', clave: 'pintura', estado: 'Regular' }]);
var f3 = safe(function () { return ctx.construirCasas(villas, informes, lin3, contacts, users, 2026); }) || [];
var va3 = (f3.filter ? f3 : []).filter(function (f) { return f.villa === 'Villa Alba'; })[0] || {};
ok('3. esElemento: interior/pintura si; interior/piscina_vieja, interior/piscina y estancia/salon no', ctx.esElemento({ seccion: 'interior', clave: 'pintura' }) === true && ctx.esElemento({ seccion: 'interior', clave: 'piscina_vieja' }) === false && ctx.esElemento({ seccion: 'interior', clave: 'piscina' }) === false && ctx.esElemento({ seccion: 'estancia', clave: 'salon' }) === false && ctx.esElemento(null) === false);
ok('3. interior/piscina_vieja Malo no cuenta en la casa (Villa Alba M 0 R 0)', va3.malo === 0 && va3.regular === 0, J(va3));
var t3 = safe(function () { return ctx.tiles(f3, lin3); }) || {};
ok('3. ni en el cuadro "Marcas Malo" (3 Malo, 4 Regular como sin ellas)', t3.marcasMalo && t3.marcasMalo.n === 3 && t3.marcasMalo.regular === 4, J(t3.marcasMalo));
var m3 = safe(function () { return ctx.mapaProblemas(lin3, f3); }) || {};
ok('3. ni en el mapa (piscina 1 Malo, pintura 2 Regular, ninguna clave nueva)', m3.piscina && m3.piscina.malo === 1 && m3.pintura.regular === 2 && Object.keys(m3).length === 26, J(m3.piscina) + J(m3.pintura));

/* 4. Borradores: se quedan y se marcan */
var lin4 = lineas.concat([{ informe_id: 13, seccion: 'resumen', clave: 'accion_1', orden: 1, texto_1: 'Cambiar el colchón', prioridad: 'Baja' }]);
var ob4 = safe(function () { return ctx.obras(lin4, filas); }) || [];
var duna = (ob4.filter ? ob4 : []).filter(function (r) { return r.villa === 'Villa Duna'; })[0] || {};
ok('4. la actuacion del borrador sigue en la lista con informe "Borrador"; las demas "Enviado"', duna.accion === 'Cambiar el colchón' && duna.informe === 'Borrador' && ob4.filter(function (r) { return r.villa !== 'Villa Duna'; }).every(function (r) { return r.informe === 'Enviado'; }) && ob4.length === 6, J(duna));
var csv4 = String(safe(function () { return ctx.csvObras(ob4); }) || '').split('\r\n');
ok('4. CSV: ultima columna "Informe" con Enviado / Borrador', /;Informe$/.test(csv4[0]) && csv4.slice(1).filter(Boolean).every(function (l) { return /;(Enviado|Borrador)$/.test(l); }) && csv4.filter(function (l) { return /^Villa Duna;.*;Borrador$/.test(l); }).length === 1, csv4.join(' / '));

/* 6. Villa manager: la clave del chip es el id resuelto con su origen; el nombre solo se ve */
var vill6 = [{ villaid: 1, Name: 'A', KeyHolder_person: '501' }, { villaid: 2, Name: 'B', KeyHolder_person: 'U9' }, { villaid: 3, Name: 'C', KeyHolder_person: ' 501 ' }, { villaid: 4, Name: 'D', KeyHolder_person: 'X1' }, { villaid: 5, Name: 'E', KeyHolder_person: 'U7' }];
var cont6 = [{ id: '501', name: 'Kike' }], us6 = [{ id: 'U9', name: 'Kike' }, { id: 'U7', name: 'Ana' }];
var inf6 = [{ informe_id: 1, villaid: 1, estado: 'enviado' }, { informe_id: 2, villaid: 2, estado: 'enviado' }];
var lin6 = [{ informe_id: 1, seccion: 'interior', clave: 'pintura', estado: 'Malo' }, { informe_id: 2, seccion: 'interior', clave: 'colchones', estado: 'Malo' }];
var f6 = safe(function () { return ctx.construirCasas(vill6, inf6, lin6, cont6, us6, 2026); }) || [];
ok('6. vmDe: contacto -> c:<ContactID>, usuario -> u:<UserID>, desconocido -> vacio', J(ctx.vmDe('501', cont6, us6)) === '{"id":"c:501","name":"Kike"}' && J(ctx.vmDe('U9', cont6, us6)) === '{"id":"u:U9","name":"Kike"}' && J(ctx.vmDe('X1', cont6, us6)) === '{"id":"","name":""}' && J(ctx.vmDe('', cont6, us6)) === '{"id":"","name":""}');
ok('6. cada casa lleva vmId y vm (nombre)', f6.map && f6.map(function (f) { return f.vmId + '=' + f.vm; }).join(',') === 'c:501=Kike,u:U9=Kike,c:501=Kike,=,u:U7=Ana', f6.map && f6.map(function (f) { return f.vmId + '=' + f.vm; }).join(','));
ok('6. dos ids con el mismo nombre son dos chips: Ana, Kike, Kike (2)', J(ctx.vmsDe(f6)) === '[["u:U7","Ana"],["c:501","Kike"],["u:U9","Kike (2)"]]', J(ctx.vmsDe(f6)));
var fu9 = safe(function () { return ctx.filtrarPorVM(f6, lin6, 'u:U9'); }) || {};
ok('6. filtrar por u:U9 da solo la casa B y su linea (no las de c:501 con el mismo nombre)', fu9.filas && J(fu9.filas.map(function (f) { return f.villa; })) === '["B"]' && fu9.lineas.length === 1 && fu9.lineas[0].informe_id === 2, J(fu9.filas && fu9.filas.map(function (f) { return f.villa; })));
var fc5 = safe(function () { return ctx.filtrarPorVM(f6, lin6, 'c:501'); }) || {};
ok('6. filtrar por c:501 da A y C', fc5.filas && J(fc5.filas.map(function (f) { return f.villa; })) === '["A","C"]');
ok('6. filtrar por el nombre "Kike" ya no filtra por nombre (ninguna casa)', (ctx.filtrarPorVM(f6, lin6, 'Kike') || {}).filas.length === 0);

/* 7. Prioridad guardada como Alto/Medio/Bajo cuenta igual que Alta/Media/Baja */
var inf7 = [{ informe_id: 1, villaid: 1, estado: 'enviado', estado_general: 'Malo' }];
var lin7 = [{ informe_id: 1, seccion: 'resumen', clave: 'accion_1', orden: 1, texto_1: 'Uno', prioridad: 'Alto' }, { informe_id: 1, seccion: 'resumen', clave: 'accion_2', orden: 2, texto_1: 'Dos', prioridad: 'Medio' },
  { informe_id: 1, seccion: 'resumen', clave: 'accion_3', orden: 3, texto_1: 'Tres', prioridad: 'bajo' }, { informe_id: 1, seccion: 'resumen', clave: 'accion_4', orden: 4, texto_1: 'Cuatro', prioridad: 'Alta' }, { informe_id: 1, seccion: 'resumen', clave: 'accion_5', orden: 5, texto_1: 'Cinco', prioridad: '' }];
var f7 = safe(function () { return ctx.construirCasas([{ villaid: 1, Name: 'Son Bou', KeyHolder_person: '501' }], inf7, lin7, contacts, users, 2026); }) || [];
var ob7 = safe(function () { return ctx.obras(lin7, f7); }) || [];
ok('7. obras: Alto y Alta -> Alto (alto), Medio -> Medio, bajo -> Bajo, vacia -> sin prioridad, en ese orden', J(ob7.map && ob7.map(function (r) { return r.accion + '|' + r.prioridad + '|' + r.clase + '|' + r.rango; })) === J(['Uno|Alto|alto|0', 'Cuatro|Alto|alto|0', 'Dos|Medio|medio|1', 'Tres|Bajo|bajo|2', 'Cinco|||3']), J(ob7.map && ob7.map(function (r) { return r.accion + '|' + r.prioridad + '|' + r.clase + '|' + r.rango; })));
var t7 = safe(function () { return ctx.tiles(f7, lin7); }) || {};
ok('7. cuadro "Actuaciones prioridad Alta": 2 (Alto y Alta) y la casa A 2', t7.accionesAlta && t7.accionesAlta.n === 2 && f7[0] && f7[0].alta === 2, J(t7.accionesAlta) + ' A ' + (f7[0] && f7[0].alta));
ok('7. obras() llama a prioridadGuardar', /prioridadGuardar\(/.test(fnSource(SRC, 'obras')));

/* 10, 11, 12, 16. Impresion y movil: el texto de las reglas */
function bloque(s, cab) { var i = s.indexOf(cab); if (i < 0) return ''; var j = s.indexOf('{', i), d = 0, k = j; for (; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (d === 0) break; } } return s.slice(j + 1, k); }
var PR = bloque(SRC, '@media print');
ok('10. print: body>*:not(main){display:none!important} (como informe-temporada.html)', PR.indexOf('body>*:not(main){display:none!important}') >= 0 && FORM.indexOf('body>*:not(main){display:none!important}') > 0, PR.slice(0, 200));
ok('11. print: break-inside:avoid solo en .tile,.casa,tr (no en .card)', PR.indexOf('.tile,.casa,tr{break-inside:avoid}') >= 0 && !/\.card[^{}]*\{[^}]*break-inside/.test(PR));
ok('11. print: .card h3{break-after:avoid}', PR.indexOf('.card h3{break-after:avoid}') >= 0);
ok('12. print: se oculta la columna "Abrir ›" (th y td de la ultima columna de las obras; no la fila vacia)', PR.indexOf('.t-obras th:last-child,.t-obras tr.obra td:last-child{display:none!important}') >= 0);
ok('16. .t-obras td{overflow-wrap:anywhere} fuera de print (pantalla y movil)', SRC.indexOf('.t-obras td{overflow-wrap:anywhere}') > 0 && PR.indexOf('overflow-wrap') < 0);
/* 13. auth.js con ?v= solo en esta pagina */
var LISTA = fs.readFileSync('informes-temporada.html', 'utf8');
ok('13. esta pagina carga auth.js?v=20261028 una vez; el listado sigue con auth.js', (SRC.match(/<script src="auth\.js\?v=20261028"><\/script>/g) || []).length === 1 && !/<script src="auth\.js"><\/script>/.test(SRC) && /<script src="auth\.js"><\/script>/.test(LISTA));
/* 14. Accesibilidad */
ok('14. "… n actuaciones más" es <button type="button" class="mas-btn">, ningun <a onclick>', /<button type="button" class="mas-btn" onclick="verMas\(\)">/.test(SRC) && !/<a onclick/.test(SRC) && /\.mas-btn\{[^}]*background:none[^}]*\}/.test(SRC));
ok('14. chips con aria-pressed', (SRC.match(/aria-pressed="'\+\(/g) || []).length === 2);
/* 18. Leyenda: Borrador gris 3, Sin informe gris 2 */
ok('18. leyenda: Borrador (--gray-3) y Sin informe (--gray-2)', SRC.indexOf('<span><i style="background:var(--gray-3)"></i>Borrador</span><span><i style="background:var(--gray-2)"></i>Sin informe</span>') > 0);
ok('18. barra de la casa sin informe --gray-2; la del borrador sigue --gray-3', /\.casa\.s::before\{background:var\(--gray-2\)\}/.test(SRC) && /\.casa::before\{[^}]*background:var\(--gray-3\)\}/.test(SRC));
/* Version y HISTORIAL v2 */
var h2 = SRC.indexOf('<!-- HISTORIAL: v2 - 28/10/2026'), h1 = SRC.indexOf('<!-- HISTORIAL: v1 - '), l2 = h2 > 0 ? SRC.slice(h2, SRC.indexOf('\n', h2) < 0 ? SRC.length : SRC.indexOf('\n', h2)) : '';
ok('HISTORIAL v2 en español encima de la linea v1, una linea, cierra una sola vez', h2 > 0 && h1 > h2 && /ronda de arreglos 1/.test(l2) && l2.split('-->').length === 2 && /-->$/.test(l2) && l2.indexOf('cuadro-informes-temporada.test.js') > 0, l2.slice(0, 120));

/* 12. El script REAL de la pagina con el Worker falso de arnes-informe.js */
var A = require('./arnes-informe.js'), fin = false;
process.on('exit', function () { if (!fin) { console.log('\n' + pass + ' PASS, ' + (fail + 1) + ' FAIL (las pruebas con fetch falso no terminaron)'); process.exitCode = 1; } });
async function parte(f) { try { await f(); } catch (e) { ok('la parte termina sin excepcion', false, e && e.stack); } }
function fechaFija(iso) { var D = Date; function F() { return arguments.length ? new (Function.prototype.bind.apply(D, [null].concat([].slice.call(arguments))))() : new D(iso); } F.now = function () { return new D(iso).getTime(); }; F.prototype = D.prototype; return F; }
/* 20 informes de 2026 (ids 1..20) con 52 lineas cada uno con las claves REALES del formulario (v2): 31 de las 4 secciones que lee la pagina
   (resumen 5, interior 13, exterior 9, seguridad 4) y 21 de estancia, huesped y foto que ya no se leen. Colchones Malo en 1..12, piscina Regular en 1..5 */
var CLAVES = (function () {
  var c = [['resumen', 'accion_1'], ['resumen', 'accion_2'], ['resumen', 'accion_3'], ['resumen', 'accion_4'], ['resumen', 'accion_5']];
  ctx.elementosDef().forEach(function (e) { c.push([e.seccion, e.clave]); });
  ['salon', 'cocina', 'dormitorio_principal', 'dormitorio_2', 'bano_1', 'bano_2', 'exterior_piscina'].forEach(function (k) { c.push(['estancia', k]); });
  for (var i = 1; i <= 8; i++) c.push(['huesped', 'comentario_' + i]);
  for (i = 1; i <= 6; i++) c.push(['foto', 'foto_' + i]);
  return c;
})();
function dbGrande() {
  var db = { TaVillas: [], TaUsers: [{ UserID: 'U7', Name: 'Rafa' }], TaContacts: [{ ContactID: '501', Name: 'Kike' }], TaInformeTemporada: [], TaInformeTemporadaLineas: [] };
  var lid = 1;
  for (var v = 1; v <= 22; v++) {
    db.TaVillas.push({ villaid: v, Name: 'Villa ' + (v < 10 ? '0' : '') + v, KeyHolder_person: v % 2 ? '501' : 'U7', Status: 1 });
    if (v > 20) continue;
    db.TaInformeTemporada.push({ informe_id: v, villaid: v, temporada: 2026, estado: v === 20 ? 'borrador' : 'enviado', estado_general: v <= 3 ? 'Malo' : 'Bueno', fecha_revision: '2026-10-20T00:00:00' });
    CLAVES.forEach(function (c, k) {
      var e = c[1] === 'colchones' && v <= 12 ? 'Malo' : c[1] === 'piscina' && v <= 5 ? 'Regular' : c[0] === 'estancia' ? 'Malo' : '';
      db.TaInformeTemporadaLineas.push({ linea_id: lid++, informe_id: v, seccion: c[0], clave: c[1], estado: e, texto_1: k === 0 ? 'Obra ' + v : '', prioridad: k === 0 ? 'Alta' : '' });
    });
  }
  db.TaInformeTemporada.push({ informe_id: 30, villaid: 21, temporada: 2025, estado: 'enviado', estado_general: 'Malo' });
  db.TaInformeTemporadaLineas.push({ linea_id: lid++, informe_id: 30, seccion: 'resumen', clave: 'accion_1', texto_1: 'De 2025', prioridad: 'Alta' });
  return db;
}
/* El Worker falso de arnes-informe.js no entiende IN (y arnes-informe.js no cambia en esta ronda): la prueba quita "AND seccion IN (...)" del WHERE,
   lee sin limite, se queda con esas secciones y corta en el limite pedido, como haria Caspio. El registro guarda el WHERE y el limit que mando la pagina */
function conIn(H) {
  var orig = H.S.fetch;
  H.S.fetch = function (url, opt) {
    var u = new URL(url), w = u.searchParams.get('where') || '', m = w.match(/^(.*) AND seccion IN \(([^)]*)\)$/);
    if (!m) return orig(url, opt);
    var secs = m[2].split(',').map(function (x) { return x.trim().replace(/^'|'$/g, ''); }), lim = +u.searchParams.get('limit') || 1000;
    u.searchParams.set('where', m[1]); u.searchParams.set('limit', '1000000');
    var i = H.S.calls.length, p = orig(u.toString(), opt), c = H.S.calls[i]; c.where = w; c.limit = String(lim); c.url = url;
    return p.then(function (r) {
      if (!r.ok) return r;
      return r.json().then(function (j) {
        var t = JSON.stringify({ Result: (j.Result || []).filter(function (x) { return secs.indexOf(x.seccion) >= 0; }).slice(0, lim) });
        return { ok: true, status: 200, text: function () { return Promise.resolve(t); }, json: function () { return Promise.resolve(JSON.parse(t)); } };
      });
    });
  };
  return H;
}
function cuadro(o) { o = o || {}; return conIn(A.cargar({ archivo: P, db: o.db || dbGrande(), rol: 'admin', Date: fechaFija(o.hoy || '2026-10-28T12:00:00') })); }
/* Descargas: el ancla y URL.createObjectURL de la pagina, falsos; cada clic apunta nombre y Blob */
function descargas(H) {
  var d = [], ultimo = null;
  H.ctx.URL = { createObjectURL: function (b) { ultimo = b; return 'blob:prueba-' + (d.length + 1); }, revokeObjectURL: function () {} };
  H.doc.createElement = function (tag) { var a = { tag: tag, click: function () { d.push({ nombre: a.download, href: a.href, blob: ultimo }); }, remove: function () {} }; return a; };
  return d;
}
/* Historial de todo lo que la pagina escribe en un elemento (para ver un destello) */
function historial(H, id) {
  var e = H.g(id), h = [], v = e.innerHTML;
  Object.defineProperty(e, 'innerHTML', { get: function () { return v; }, set: function (x) { v = String(x); h.push(v); }, configurable: true });
  return h;
}
async function hasta(f, ms) { for (var t = 0; t < (ms || 2000) && !f(); t += 2) await new Promise(function (r) { setTimeout(r, 2); }); return f(); }
(async function () {
  await parte(async function () {
    console.log('12.1 Carga: lineas de las 4 secciones por trozos de 15 informes');
    var H = cuadro(); await H.ev('iniciar()');
    var lin = H.S.calls.filter(function (x) { return x.table === 'TaInformeTemporadaLineas'; });
    H.S.calls.forEach(function (x) { console.log('        ' + H.S.texto(x)); });
    ok('dos lecturas de lineas: 1..15 y 16..20, limit 1000', lin.length === 2 && lin[0].where === "informe_id>=1 AND informe_id<=15 AND seccion IN ('resumen','interior','exterior','seguridad')" && lin[1].where === "informe_id>=16 AND informe_id<=20 AND seccion IN ('resumen','interior','exterior','seguridad')" && lin.every(function (x) { return x.limit === '1000'; }), lin.map(function (x) { return x.where; }).join(' | '));
    ok('las 620 lineas de la temporada en las 4 secciones (20 x 31), ninguna de otra temporada ni de estancia/huesped/foto', H.ev('LINEAS.length') === 620 && H.ev('LINEAS.every(function(l){return ["resumen","interior","exterior","seguridad"].indexOf(l.seccion)>=0;})'), H.ev('LINEAS.length'));
    ok('TaVillas Status=1 limit 500, TaUsers 200, TaContacts 500, TaInformeTemporada temporada=2026 limit 500', H.S.calls.some(function (x) { return x.table === 'TaVillas' && x.where === 'Status=1' && x.limit === '500'; }) && H.S.calls.some(function (x) { return x.table === 'TaUsers' && x.limit === '200'; }) && H.S.calls.some(function (x) { return x.table === 'TaContacts' && x.limit === '500'; }) && H.S.calls.some(function (x) { return x.table === 'TaInformeTemporada' && x.where === 'temporada=2026' && x.limit === '500'; }));
    ok('chips 2025, 2026, 2027; por defecto 2026', /data-temp="2025"[\s\S]*data-temp="2026"[\s\S]*data-temp="2027"/.test(H.g('filtros').innerHTML) && H.ev('TEMP') === 2026);
    ok('chips de villa manager: Todos, Kike, Rafa', /data-vm=""[^>]*>Todos[\s\S]*data-vm="c:501"[^>]*>Kike<[\s\S]*data-vm="u:U7"[^>]*>Rafa</.test(H.g('filtros').innerHTML), H.g('filtros').innerHTML.slice(0, 300));
    ok('cuadros: 19 de 22, 1 borrador, 2 sin informe', /19[\s\S]*de 22/.test(H.g('tiles').innerHTML) && /1 en borrador · 2 sin informe/.test(H.g('tiles').innerHTML), H.g('tiles').innerHTML.slice(0, 400));
    ok('20 actuaciones Alta (la de 2025 no cuenta)', /<div class="v">20<\/div>/.test(H.g('tiles').innerHTML));
    ok('22 tarjetas de casa', (H.g('casas').innerHTML.match(/class="casa /g) || []).length === 22);
    ok('obras: 10 filas y "… 10 actuaciones más"', (H.g('obras').innerHTML.match(/a class="abrir"/g) || []).length === 20 && /… 10 actuaciones más/.test(H.g('obras').innerHTML), (H.g('obras').innerHTML.match(/a class="abrir"/g) || []).length);
    ok('3. de extremo a extremo: cuadro "Marcas Malo" 12 de 520 comprobaciones · 5 Regular (estancia/salon Malo no cuenta)', /<div class="v">12<\/div><div class="s">de 520 comprobaciones · 5 Regular<\/div>/.test(H.g('tiles').innerHTML), H.g('tiles').innerHTML.slice(-260));
    ok('3. de extremo a extremo: en el mapa Colchones 12 Malo (h4) y Piscina 5 Regular, el resto a 0', /Colchones y almohadas<\/td><td class="num"><span class="heat h4">12<\/span><\/td><td class="num"><span class="heat h0">0<\/span>/.test(H.g('mapa').innerHTML) && /Piscina \(vaso[^<]*<\/td><td class="num"><span class="heat h0">0<\/span><\/td><td class="num"><span class="heat hr">5<\/span>/.test(H.g('mapa').innerHTML) && (H.g('mapa').innerHTML.match(/heat h0">0</g) || []).length === 50);
    ok('4. obras: pastilla gris "borrador" detras del nombre solo en Villa 20', /<td class="casa-n" data-l="Casa">Villa 20 <span class="pill gris">borrador<\/span><\/td>/.test(H.g('obras').innerHTML) && (H.g('obras').innerHTML.match(/pill gris/g) || []).length === 1);
    ok('14. "… 10 actuaciones más" es un boton; chips con aria-pressed', /<tr class="mas"><td colspan="5"><button type="button" class="mas-btn" onclick="verMas\(\)">… 10 actuaciones más<\/button>/.test(H.g('obras').innerHTML) && /class="chip on" aria-pressed="true" data-temp="2026"/.test(H.g('filtros').innerHTML) && /class="chip" aria-pressed="false" data-temp="2025"/.test(H.g('filtros').innerHTML) && /class="chip on" aria-pressed="true" data-vm=""/.test(H.g('filtros').innerHTML) && /class="chip" aria-pressed="false" data-vm="c:501"/.test(H.g('filtros').innerHTML), H.g('filtros').innerHTML.slice(0, 400));
    var vill = H.S.calls.filter(function (x) { return x.table === 'TaVillas'; }).length;
    H.ev("VM='c:501';pintar()");
    ok('filtro Kike: sin leer otra vez, 11 casas', H.S.calls.filter(function (x) { return x.table === 'TaVillas'; }).length === vill && (H.g('casas').innerHTML.match(/class="casa /g) || []).length === 11);
    H.ev('MAS=true;pintar()');
    ok('"más" despliega todas las obras de Kike (10)', (H.g('obras').innerHTML.match(/class="obra"/g) || []).length === 10 && !/actuaciones más/.test(H.g('obras').innerHTML));
  });
  await parte(async function () {
    console.log('12.2 Un trozo que llega a 1000 filas se parte en dos (informes de otra temporada en medio del rango)');
    var db = dbGrande();
    db.TaInformeTemporada.forEach(function (i) { if (i.informe_id === 5) i.informe_id = 50; });
    db.TaInformeTemporadaLineas.forEach(function (l) { if (l.informe_id === 5) l.informe_id = 50; });
    db.TaInformeTemporada.push({ informe_id: 40, villaid: 22, temporada: 2024, estado: 'enviado' });
    for (var k = 0; k < 1000; k++) db.TaInformeTemporadaLineas.push({ linea_id: 9000 + k, informe_id: 40, seccion: 'interior', clave: 'x' + k, estado: 'Malo' });
    var H = cuadro({ db: db }); await H.ev('iniciar()');
    H.S.calls.filter(function (x) { return x.table === 'TaInformeTemporadaLineas'; }).forEach(function (x) { console.log('        ' + H.S.texto(x)); });
    ok('se leen las 620 lineas de 2026 aunque el rango tenga 1000 de 2024', H.ev('LINEAS.length') === 620, H.ev('LINEAS.length'));
  });
  await parte(async function () {
    console.log('12.3 Una respuesta tardia de otra temporada se ignora');
    var H = cuadro(); await H.ev('iniciar()');
    H.S.retrasa(function (x) { return x.table === 'TaInformeTemporada' && /temporada=2025/.test(x.where || ''); }, 120);
    var vill = H.S.calls.filter(function (x) { return x.table === 'TaVillas'; }).length;
    var p1 = H.ctx.cambiarTemporada(2025);
    await H.ctx.cambiarTemporada(2027);
    await p1; await H.espera(20);
    ok('se queda 2027: ningun informe, 0 de 22', H.ev('TEMP') === 2027 && H.ev('INFORMES.length') === 0 && /0[\s\S]*de 22/.test(H.g('tiles').innerHTML), H.ev('INFORMES.length'));
    ok('cambiar de temporada no lee las villas otra vez', H.S.calls.filter(function (x) { return x.table === 'TaVillas'; }).length === vill);
    ok('vacio: "Ninguna actuación todavía" y todo SIN INFORME', /Ninguna actuación todavía/.test(H.g('obras').innerHTML) && (H.g('casas').innerHTML.match(/SIN INFORME/g) || []).length === 22);
    ok('vacio: el mapa todo h0 (26 Malo + 26 Regular)', !/heat h[1-4]/.test(H.g('mapa').innerHTML) && !/heat hr/.test(H.g('mapa').innerHTML) && (H.g('mapa').innerHTML.match(/heat h0/g) || []).length === 52);
  });
  await parte(async function () {
    console.log('12.4 Errores');
    var H = cuadro(); H.S.falla(function (x) { return x.table === 'TaInformeTemporadaLineas'; }); await H.ev('iniciar()');
    ok('lineas fallan: una linea roja y el boton de reintentar, nada mas', /No se pudieron leer los informes/.test(H.g('main').innerHTML) && /Reintentar/.test(H.g('main').innerHTML) && !/class="tiles"/.test(H.g('main').innerHTML), H.g('main').innerHTML.slice(0, 300));
    await H.ev('iniciar()');
    ok('reintentar vuelve a pintar el cuadro', /class="tiles"/.test(H.g('main').innerHTML) && /19[\s\S]*de 22/.test(H.g('tiles').innerHTML));
    var H2 = cuadro(); await H2.ev('iniciar()');
    H2.S.falla(function (x) { return x.table === 'TaInformeTemporada'; });
    await H2.ctx.cambiarTemporada(2025);
    ok('al cambiar de temporada y fallar: la linea roja', /No se pudieron leer los informes/.test(H2.g('main').innerHTML));
    var H3 = A.cargar({ archivo: P, db: dbGrande(), rol: 'staff' }); await H3.ev('iniciar()');
    ok('staff: Sin acceso y ninguna lectura', /Sin acceso/.test(H3.g('main').innerHTML) && H3.S.calls.length === 0);
  });
  await parte(async function () {
    console.log('12.5 (1) Un clic mientras carga otra temporada no pinta ni descarga ni imprime lo de la anterior');
    var H = cuadro(), d = descargas(H); await H.ev('iniciar()');
    H.S.retrasa(function (x) { return x.table === 'TaInformeTemporada' && /temporada=2025/.test(x.where || ''); }, 150);
    var p = H.ctx.cambiarTemporada(2025);
    await H.espera(20);
    safe(function () { H.ev("elegirVM('')"); }); safe(function () { H.ev('verMas()'); }); safe(function () { H.ev('descargarCsv()'); }); safe(function () { H.ev('imprimir()'); });
    var hueco = H.g('casas').innerHTML + H.g('obras').innerHTML + H.g('mapa').innerHTML + H.g('tiles').innerHTML;
    ok('1. en el hueco el chip 2025 esta elegido (cargando)', /class="chip on" aria-pressed="true" data-temp="2025"/.test(H.g('filtros').innerHTML), H.g('filtros').innerHTML.slice(0, 200));
    ok('1. en el hueco nada de 2026 bajo 2025: ni casas, ni obras, ni mapa, ni cuadros', !/temporada=2026|Obra \d|Villa \d\d|heat h4|de 22/.test(hueco), hueco.slice(0, 300));
    ok('1. en el hueco ni CSV ni impresion', d.length === 0 && H.log.indexOf('print') < 0, J(d.map(function (x) { return x.nombre; })) + ' ' + J(H.log));
    await p; await H.espera(10);
    ok('1. al llegar 2025: 1 de 22 y solo la obra "De 2025"', /1 <span class="de">de 22/.test(H.g('tiles').innerHTML) && /De 2025/.test(H.g('obras').innerHTML) && !/Obra \d/.test(H.g('obras').innerHTML) && !/actuaciones más/.test(H.g('obras').innerHTML));
    H.ev('descargarCsv()'); safe(function () { H.ev('imprimir()'); });
    var txt = d.length ? await d[0].blob.text() : '';
    ok('1. despues: CSV obras-temporada-2025.csv con la obra de 2025 y nada de 2026; imprimir ya imprime', d.length === 1 && d[0].nombre === 'obras-temporada-2025.csv' && /De 2025/.test(txt) && !/Obra \d/.test(txt) && H.log.indexOf('print') >= 0, J(d.map(function (x) { return x.nombre; })));
  });
  await parte(async function () {
    console.log('12.6 (2a) Clic en 2025 durante la primera carga: ningun "0 de 22" de paso');
    var H = cuadro(), h = historial(H, 'tiles');
    H.S.retrasa(function (x) { return x.table === 'TaInformeTemporada' && /temporada=2025/.test(x.where || ''); }, 150);
    var p = H.ev('iniciar()');
    var q = H.ctx.cambiarTemporada(2025);
    await p; await q; await H.espera(20);
    ok('2a. nunca se pinta "0 de 22" (2026 sin datos bajo el chip 2025)', h.length > 0 && !h.some(function (x) { return /<div class="v">0 <span class="de">de 22/.test(x); }), h.map(function (x) { return x.slice(0, 90); }).join(' | '));
    ok('2a. termina en 2025: 1 de 22', H.ev('TEMP') === 2025 && /1 <span class="de">de 22/.test(H.g('tiles').innerHTML));
  });
  await parte(async function () {
    console.log('12.7 (2b) Falla tarde la primera lectura de lineas de 2026 cuando 2025 ya se pinto');
    var H = cuadro();
    var p26 = function (x) { return x.table === 'TaInformeTemporadaLineas' && /^informe_id>=1 AND/.test(x.where || ''); };
    H.S.retrasa(p26, 200); H.S.falla(p26);
    var p = H.ev('iniciar()');
    await hasta(function () { return H.S.calls.some(p26); });
    await H.ctx.cambiarTemporada(2025);
    ok('2b. 2025 pintado', H.ev('TEMP') === 2025 && /1 <span class="de">de 22/.test(H.g('tiles').innerHTML));
    await p; await H.espera(30);
    ok('2b. la vista 2025 sigue y no sale la linea roja', /class="tiles"/.test(H.g('main').innerHTML) && !/No se pudieron leer/.test(H.g('main').innerHTML) && /1 <span class="de">de 22/.test(H.g('tiles').innerHTML) && H.S.calls.some(function (x) { return x.fallo; }), H.g('main').innerHTML.slice(0, 200));
  });
  await parte(async function () {
    console.log('12.8 (5) Lecturas que llegan al limite: linea roja en vez de datos cortados');
    function db1(nl, ni) {
      var db = { TaVillas: [{ villaid: 1, Name: 'Son Bou', KeyHolder_person: '501', Status: 1 }], TaUsers: [], TaContacts: [{ ContactID: '501', Name: 'Kike' }], TaInformeTemporada: [], TaInformeTemporadaLineas: [] };
      for (var i = 1; i <= ni; i++) db.TaInformeTemporada.push({ informe_id: i, villaid: i, temporada: 2026, estado: 'enviado' });
      for (var k = 0; k < nl; k++) db.TaInformeTemporadaLineas.push({ linea_id: k + 1, informe_id: 1, seccion: 'interior', clave: 'x' + k, estado: 'Malo' });
      return db;
    }
    var H = cuadro({ db: db1(1000, 1) }); await H.ev('iniciar()');
    ok('5. un trozo de un solo informe devuelve 1000 lineas: linea roja y Reintentar', /No se pudieron leer los informes/.test(H.g('main').innerHTML) && /Reintentar/.test(H.g('main').innerHTML) && !/class="tiles"/.test(H.g('main').innerHTML), H.g('main').innerHTML.slice(0, 200));
    ok('5. y una sola lectura de lineas (no se parte mas)', H.S.calls.filter(function (x) { return x.table === 'TaInformeTemporadaLineas'; }).length === 1);
    var H2 = cuadro({ db: db1(999, 1) }); await H2.ev('iniciar()');
    ok('5. con 999 lineas se pinta el cuadro', /class="tiles"/.test(H2.g('main').innerHTML) && /1 <span class="de">de 1/.test(H2.g('tiles').innerHTML));
    var H3 = cuadro({ db: db1(0, 500) }); await H3.ev('iniciar()');
    ok('5. la lectura de informes devuelve 500 (el limit): linea roja y ninguna lectura de lineas', /No se pudieron leer los informes/.test(H3.g('main').innerHTML) && !/class="tiles"/.test(H3.g('main').innerHTML) && !H3.S.calls.some(function (x) { return x.table === 'TaInformeTemporadaLineas'; }), H3.g('main').innerHTML.slice(0, 200));
    var H4 = cuadro({ db: db1(0, 499) }); await H4.ev('iniciar()');
    ok('5. con 499 informes se pinta el cuadro', /class="tiles"/.test(H4.g('main').innerHTML) && /1 <span class="de">de 1/.test(H4.g('tiles').innerHTML));
  });
  await parte(async function () {
    console.log('12.9 (9) Texto con HTML: sale escapado en todo lo pintado');
    var db = { TaVillas: [{ villaid: 1, Name: 'Casa <img src=x onerror=alert(1)> & Co', KeyHolder_person: '501', Status: 1 }], TaUsers: [], TaContacts: [{ ContactID: '501', Name: 'Ana <b>&</b>' }],
      TaInformeTemporada: [{ informe_id: 1, villaid: 1, temporada: 2026, estado: 'enviado', estado_general: 'Malo', fecha_revision: '2026-10-20T00:00:00' }],
      TaInformeTemporadaLineas: [{ linea_id: 1, informe_id: 1, seccion: 'resumen', clave: 'accion_1', orden: 1, texto_1: 'Quitar <img src=x onerror=alert(2)> & pintar', texto_2: 'Motivo <script>x</script> & más', prioridad: 'Alta' }] };
    var H = cuadro({ db: db }); await H.ev('iniciar()');
    var todo = H.g('tiles').innerHTML + H.g('casas').innerHTML + H.g('obras').innerHTML + H.g('filtros').innerHTML + H.g('mapa').innerHTML;
    ok('9. ninguna etiqueta inyectada (<img, <script, <b>)', /class="tiles"/.test(H.g('main').innerHTML) && !/<img|<script|<b>/i.test(todo), todo.slice(0, 200));
    var nv = 'Casa &lt;img src=x onerror=alert(1)&gt; &amp; Co';
    ok('9. el nombre de la villa escapado en la casa, la obra y el cuadro "Casas en estado Malo"', H.g('casas').innerHTML.indexOf(nv) > 0 && H.g('obras').innerHTML.indexOf(nv) > 0 && H.g('tiles').innerHTML.indexOf(nv) > 0);
    ok('9. texto_1 y texto_2 escapados en las obras', H.g('obras').innerHTML.indexOf('Quitar &lt;img src=x onerror=alert(2)&gt; &amp; pintar') > 0 && H.g('obras').innerHTML.indexOf('Motivo &lt;script&gt;x&lt;/script&gt; &amp; más') > 0);
    ok('9. el villa manager escapado en el chip, la casa y la obra', H.g('filtros').innerHTML.indexOf('>Ana &lt;b&gt;&amp;&lt;/b&gt;</button>') > 0 && H.g('casas').innerHTML.indexOf('Ana &lt;b&gt;&amp;&lt;/b&gt;') > 0 && H.g('obras').innerHTML.indexOf('Ana &lt;b&gt;&amp;&lt;/b&gt;') > 0);
  });
  await parte(async function () {
    console.log('12.10 (9) descargarCsv de extremo a extremo (ancla y Blob falsos)');
    var H = cuadro(), d = descargas(H); await H.ev('iniciar()');
    H.ev('descargarCsv()');
    var txt = d.length ? await d[0].blob.text() : '', L = txt.split('\r\n');
    ok('9. un clic: obras-temporada-2026.csv, text/csv;charset=utf-8', d.length === 1 && d[0].nombre === 'obras-temporada-2026.csv' && d[0].blob.type === 'text/csv;charset=utf-8' && d[0].href === 'blob:prueba-1', J(d.map(function (x) { return [x.nombre, x.blob && x.blob.type]; })));
    ok('9. BOM, cabecera con "Informe", 20 obras Alto y Villa 20 como Borrador', txt.charCodeAt(0) === 0xFEFF && L[0] === '﻿Casa;Villa manager;Actuación;Motivo / impacto;Prioridad;Estado general de la casa;Fecha de revisión;Informe' && L.length === 22 && L[21] === '' &&
      L.filter(function (l) { return /;Alto;/.test(l); }).length === 20 && L.indexOf('Villa 20;Rafa;Obra 20;;Alto;Bueno;20/10/2026;Borrador') > 0 && L.indexOf('Villa 01;Kike;Obra 1;;Alto;Malo;20/10/2026;Enviado') > 0, L.slice(0, 3).join(' / '));
    H.ev("elegirVM('c:501')"); H.ev('descargarCsv()');
    var t2 = d.length > 1 ? await d[1].blob.text() : '', L2 = t2.split('\r\n');
    ok('9. con el filtro Kike: 10 obras, todas de Kike', L2.length === 12 && L2.slice(1, 11).every(function (l) { return /^Villa \d\d;Kike;/.test(l); }), L2.length);
  });
  await parte(async function () {
    console.log('12.11 (6) Dos villa managers con el mismo nombre: dos chips');
    var db = dbGrande(); db.TaUsers[0].Name = 'Kike';
    var H = cuadro({ db: db }); await H.ev('iniciar()');
    ok('6. chips "Kike" (c:501) y "Kike (2)" (u:U7)', /data-vm="c:501"[^>]*>Kike<\/button>[\s\S]*data-vm="u:U7"[^>]*>Kike \(2\)<\/button>/.test(H.g('filtros').innerHTML), H.g('filtros').innerHTML.slice(0, 500));
    H.ev("elegirVM('u:U7')");
    ok('6. elegir u:U7: 11 casas (las pares), chip u:U7 encendido', (H.g('casas').innerHTML.match(/class="casa /g) || []).length === 11 && !/Villa 01/.test(H.g('casas').innerHTML) && /class="chip on" aria-pressed="true" data-vm="u:U7"/.test(H.g('filtros').innerHTML));
  });
})().then(function () {
  fin = true;
  console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
  process.exitCode = fail ? 1 : 0;
});
