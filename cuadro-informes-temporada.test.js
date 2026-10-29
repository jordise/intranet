/* Pruebas del cuadro de informes de temporada (cuadro-informes-temporada.html v2, Jordi y Gary 28/10/2026; v2 = ronda de arreglos 1, partes 13 y 12.5 a 12.12;
   v3 = cuadro v3a del 29/10/2026: pines de versión y de secciones, los scripts del cuadro cargados como en el navegador, parte 14).
   node cuadro-informes-temporada.test.js
   Como informes-temporada.test.js: extrae con vm las funciones reales de la pagina (partes 1 a 11) y despues
   carga el script REAL de la pagina con un fetch falso (arnes-informe.js, parte 12). Sin red. */
var fs = require('fs'), vm = require('vm');
var P = 'cuadro-informes-temporada.html';
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var SRC = '';
var PORTADA = (function () { try { return fs.readFileSync('cuadro-informes-temporada-portada.js', 'utf8'); } catch (e) { return ''; } })();
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
ok('whereLineasRango: rango del trozo y las 8 secciones del formulario (v3: tambien estancia, huesped, final y foto)', ctx.whereLineasRango([16, 20, 17]) === "informe_id>=16 AND informe_id<=20 AND seccion IN ('resumen','interior','exterior','seguridad','estancia','huesped','final','foto')", ctx.whereLineasRango([16, 20, 17]));
ok('whereLineasRango numerico', ctx.whereLineasRango(['10 OR 1=1', 7]) === "informe_id>=7 AND informe_id<=10 AND seccion IN ('resumen','interior','exterior','seguridad','estancia','huesped','final','foto')", ctx.whereLineasRango(['10 OR 1=1', 7]));

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
[['Informes entregados', 'Entregados'], ['Casas en estado Malo', 'Condición media'], ['Actuaciones prioridad Alta', 'Obras por prioridad'], ['Marcas Malo en elementos', 'Alertas']].forEach(function (p) { ok('cuadro "' + p[0] + '" (v3: "' + p[1] + '")', PORTADA.indexOf("tile(route, ") > 0 && new RegExp("tile\\(route, [^,]+, '" + p[1] + "', ").test(PORTADA)); });
ok('grupos Interior / Exterior / Seguridad e instalaciones', SRC.indexOf("'Interior'") > 0 && SRC.indexOf("'Exterior'") > 0 && SRC.indexOf("'Seguridad e instalaciones'") > 0);
ok('titulo de las casas (v3)', PORTADA.indexOf('Casas <small>· peligros, revisiones de seguridad, peor condición, incompletas, nombre · un clic abre el informe</small>') > 0);
ok('titulos del mapa y de las obras (v3)', PORTADA.indexOf('Mapa de problemas <small>· nº de casas por marca (informes enviados) · clic en la cifra: las casas y sus observaciones · clic en el elemento: todos sus registros</small>') > 0 && SRC.indexOf('Obras pendientes <small>· resumen + incidencias por estancia, sin duplicados · solo informes enviados</small>') > 0);
ok('cabecera y proposito (v3)', SRC.indexOf('<h1>Informes de fin de temporada</h1><p>Cada número abre las filas que hay detrás. Clic en una fila: el informe de la casa.</p>') > 0 && SRC.indexOf('Dirección · estado de las casas al cierre de la temporada') > 0 && SRC.indexOf('Qué casas necesitan obra, qué obra, y quién no ha entregado el informe.') < 0);
ok('botones ⬇️ CSV obras y 🖨️ Imprimir (con U+FE0F, v2) e imprimir() con window.print()', SRC.indexOf('\u2B07\uFE0F CSV obras') > 0 && SRC.indexOf('\uD83D\uDDA8\uFE0F Imprimir') > 0 && SRC.indexOf('\u2B07 CSV') < 0 && SRC.indexOf('\uD83D\uDDA8 Imprimir') < 0 && SRC.indexOf('window.print()') > 0);
ok('vacio y error', SRC.indexOf('Ninguna actuación todavía') > 0 && SRC.indexOf('No se pudieron leer los informes') > 0);
ok('@media (max-width: 640px)', /@media\s*\(max-width:\s*640px\)/.test(SRC));
ok('@media print con A4 vertical y 12 mm', /@media print/.test(SRC) && /@page\s*\{[^}]*A4 portrait[^}]*12mm/.test(SRC));
ok("Auth.require('cuadro-informes-temporada')", SRC.indexOf("Auth.require('cuadro-informes-temporada')") > 0);
ok('auth.js?v=20261028 (v2: salta el auth.js viejo de la cache), nav.js y nav-component.js', /<script src="auth.js\?v=20261028"><\/script>\s*<script src="nav.js"><\/script>\s*<script src="nav-component.js"><\/script>/.test(SRC));
ok('VERSIÓN ACTUAL: v3 en las 5 primeras lineas, PAGE_VERSION = 3, titulo v3', /VERSIÓN ACTUAL: v3 \|/.test(SRC.split('\n').slice(0, 5).join('\n')) && /const PAGE_VERSION = 3;/.test(SRC) && SRC.indexOf('<title>Cuadro de informes de temporada v3 — 3Villas</title>') > 0);
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
ok('16. VM y Prioridad no se parten letra a letra en la tabla de escritorio (render: "Kik/e")', SRC.indexOf('.t-obras td[data-l="VM"],.t-obras td[data-l="Prioridad"]{overflow-wrap:normal}') > SRC.indexOf('.t-obras td{overflow-wrap:anywhere}'));
ok('16. .t-obras td{overflow-wrap:anywhere} fuera de print (pantalla y movil)', SRC.indexOf('.t-obras td{overflow-wrap:anywhere}') > 0 && PR.indexOf('overflow-wrap') < 0);
/* 13. auth.js con ?v= solo en esta pagina */
var LISTA = fs.readFileSync('informes-temporada.html', 'utf8');
ok('13. esta pagina carga auth.js?v=20261028 una vez; el listado sigue con auth.js', (SRC.match(/<script src="auth\.js\?v=20261028"><\/script>/g) || []).length === 1 && !/<script src="auth\.js"><\/script>/.test(SRC) && /<script src="auth\.js"><\/script>/.test(LISTA));
/* 14. Accesibilidad */
ok('14. "… n actuaciones más" es <button type="button" class="mas-btn">, ningun <a onclick>', /<button type="button" class="mas-btn" onclick="verMas\(\)">/.test(SRC) && !/<a onclick/.test(SRC) && /\.mas-btn\{[^}]*background:none[^}]*\}/.test(SRC));
ok('14. chips con aria-pressed', (SRC.match(/aria-pressed="'\+\(/g) || []).length === 2);
/* 18. Leyenda: Borrador gris 3, Sin informe gris 2 */
ok('18. leyenda v3: bandas ≥ 80 / 50 a 79,9 / < 50 y "sin puntuación o borrador" (--gray-3); la v2 ya no', PORTADA.indexOf('<div class="leyenda"><span><i style="background:var(--green)"></i>≥ 80</span><span><i style="background:var(--orange)"></i>50 a 79,9</span><span><i style="background:var(--red)"></i>&lt; 50</span>') > 0 && PORTADA.indexOf('<span><i style="background:var(--gray-3)"></i>sin puntuación o borrador</span>') > 0 && SRC.indexOf('<span><i style="background:var(--gray-3)"></i>Borrador</span><span><i style="background:var(--gray-2)"></i>Sin informe</span>') < 0);
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
   lee sin limite, se queda con esas secciones y corta en el limite pedido, como haria Caspio. El registro guarda (al contestar) el WHERE y el limit que mando la pagina */
function conIn(H) {
  var orig = H.S.fetch;
  H.S.fetch = function (url, opt) {
    var u = new URL(url), w = u.searchParams.get('where') || '', m = w.match(/^(.*) AND seccion IN \(([^)]*)\)$/);
    if (!m) return orig(url, opt);
    var secs = m[2].split(',').map(function (x) { return x.trim().replace(/^'|'$/g, ''); }), lim = +u.searchParams.get('limit') || 1000;
    u.searchParams.set('where', m[1]); u.searchParams.set('limit', '1000000');
    var i = H.S.calls.length, p = orig(u.toString(), opt), c = H.S.calls[i];
    return p.then(function (r) {
      c.where = w; c.limit = String(lim); c.url = url;
      if (!r.ok) return r;
      return r.json().then(function (j) {
        var t = JSON.stringify({ Result: (j.Result || []).filter(function (x) { return secs.indexOf(x.seccion) >= 0; }).slice(0, lim) });
        return { ok: true, status: 200, text: function () { return Promise.resolve(t); }, json: function () { return Promise.resolve(JSON.parse(t)); } };
      });
    });
  };
  return H;
}
/* v3: los <script src> del cuadro (informe-temporada-score.js y cuadro-informes-temporada-*.js), en el orden de la pagina, dentro del contexto del arnes */
var SCRIPTS_V3 = (SRC.match(/<script src="((?:informe-temporada-score|cuadro-informes-temporada-[a-z]+)\.js)\?v=3"><\/script>/g) || []).map(function (t) { return t.match(/src="([^"?]+)/)[1]; });
function conScripts(H) { SCRIPTS_V3.forEach(function (f) { vm.runInContext(fs.readFileSync(f, 'utf8'), H.ctx, { filename: f }); }); return H; }
function cuadro(o) { o = o || {}; return conIn(conScripts(A.cargar({ archivo: P, db: o.db || dbGrande(), rol: 'admin', Date: fechaFija(o.hoy || '2026-10-28T12:00:00'), search: o.search }))); }
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
    ok('dos lecturas de lineas: 1..15 y 16..20, limit 1000', lin.length === 2 && lin[0].where === "informe_id>=1 AND informe_id<=15 AND seccion IN ('resumen','interior','exterior','seguridad','estancia','huesped','final','foto')" && lin[1].where === "informe_id>=16 AND informe_id<=20 AND seccion IN ('resumen','interior','exterior','seguridad','estancia','huesped','final','foto')" && lin.every(function (x) { return x.limit === '1000'; }), lin.map(function (x) { return x.where; }).join(' | '));
    ok('v3: las 1040 lineas de la temporada en las 8 secciones del formulario (20 x 52), ninguna de otra temporada', H.ev('LINEAS.length') === 1040 && H.ev('LINEAS.every(function(l){return ["resumen","interior","exterior","seguridad","estancia","huesped","final","foto"].indexOf(l.seccion)>=0;})') && H.ev('LINEAS.every(function(l){return l.informe_id>=1&&l.informe_id<=20;})'), H.ev('LINEAS.length'));
    ok('TaVillas Status=1 limit 500, TaUsers 200, TaContacts 500, TaInformeTemporada temporada=2026 limit 500', H.S.calls.some(function (x) { return x.table === 'TaVillas' && x.where === 'Status=1' && x.limit === '500'; }) && H.S.calls.some(function (x) { return x.table === 'TaUsers' && x.limit === '200'; }) && H.S.calls.some(function (x) { return x.table === 'TaContacts' && x.limit === '500'; }) && H.S.calls.some(function (x) { return x.table === 'TaInformeTemporada' && x.where === 'temporada=2026' && x.limit === '500'; }));
    ok('chips 2025, 2026, 2027; por defecto 2026', /data-temp="2025"[\s\S]*data-temp="2026"[\s\S]*data-temp="2027"/.test(H.g('filtros').innerHTML) && H.ev('TEMP') === 2026);
    ok('chips de villa manager: Todos, Kike, Rafa', /data-vm=""[^>]*>Todos[\s\S]*data-vm="c:501"[^>]*>Kike<[\s\S]*data-vm="u:U7"[^>]*>Rafa</.test(H.g('filtros').innerHTML), H.g('filtros').innerHTML.slice(0, 300));
    ok('cuadros: 19 de 22, 1 borrador, 2 sin informe (v3: puertas)', /<a href="#t=2026&amp;v=lista:estado:enviado">19 <span class="de">de 22<\/span><\/a>/.test(H.g('tiles').innerHTML) && /v=lista:estado:borrador">1 en borrador<\/a>/.test(H.g('tiles').innerHTML) && /v=lista:estado:sin">2 sin informe<\/a>/.test(H.g('tiles').innerHTML), H.g('tiles').innerHTML.slice(0, 400));
    ok('v3: 19 actuaciones Alto de informes enviados + "1 más en borradores (no cuentan)" (la de 2025 no cuenta)', />Alto 19<\/a>/.test(H.g('tiles').innerHTML) && />19 <span class="de">actuaciones<\/span>/.test(H.g('tiles').innerHTML) && /1 más en borradores \(no cuentan\)/.test(H.g('tiles').innerHTML) && !/De 2025/.test(H.g('obras').innerHTML));
    ok('22 tarjetas de casa', (H.g('casas').innerHTML.match(/class="casa /g) || []).length === 22);
    ok('obras: 10 filas a la vista y "… 9 actuaciones más" (v3: 19 de informes enviados)', (H.g('obras').innerHTML.match(/a class="abrir"/g) || []).length === 19 && (H.g('obras').innerHTML.match(/<tr class="obra extra"/g) || []).length === 9 && /… 9 actuaciones más/.test(H.g('obras').innerHTML), (H.g('obras').innerHTML.match(/a class="abrir"/g) || []).length);
    ok('3. de extremo a extremo (v3): "Todas las marcas Malo · 12" en Listas y 5 Regular en el mapa (estancia/salon Malo no cuenta)', /v=lista:marcas:malo">Todas las marcas Malo · 12<\/a>/.test(H.g('rapidas').innerHTML) && (H.g('mapa').innerHTML.match(/v=lista:mapa:[a-z_]+:regular" title="Ver las casas">[1-9]\d*<\/a>/g) || []).join('') === H.g('mapa').innerHTML.match(/v=lista:mapa:piscina:regular" title="Ver las casas">5<\/a>/)[0], H.g('rapidas').innerHTML.slice(0, 400));
    ok('3. de extremo a extremo (v3, cinco columnas): Colchones 12 Malo y 7 sin marcar, Piscina 5 Regular y 14 sin marcar, los demás 19 sin marcar, Bueno a 0 y N/A "—" (dato del formulario v5)', /v=lista:mapa:colchones:malo" title="Ver las casas">12<\/a>/.test(H.g('mapa').innerHTML) && /v=lista:mapa:colchones:sin" title="Ver las casas">7<\/a>/.test(H.g('mapa').innerHTML) && /v=lista:mapa:piscina:regular" title="Ver las casas">5<\/a>/.test(H.g('mapa').innerHTML) && /v=lista:mapa:piscina:sin" title="Ver las casas">14<\/a>/.test(H.g('mapa').innerHTML) && (H.g('mapa').innerHTML.match(/:sin" title="Ver las casas">19<\/a>/g) || []).length === 24 && (H.g('mapa').innerHTML.match(/:bueno" title="Ver las casas">0<\/a>/g) || []).length === 26 && (H.g('mapa').innerHTML.match(/:na" title="Ver las casas">—<\/a>/g) || []).length === 26 && (H.g('mapa').innerHTML.match(/:(malo|regular)" title="Ver las casas">0<\/a>/g) || []).length === 50, (H.g('mapa').innerHTML.match(/colchones:[a-z]+" title="Ver las casas">\d+/g) || []).join(' '));
    ok('4. obras (v3): el borrador de Villa 20 no entra en la lista; se avisa "1 más en borradores (no cuentan)"', !/Villa 20/.test(H.g('obras').innerHTML) && /1 más en borradores \(no cuentan\)/.test(H.g('obras').innerHTML) && !/pill gris/.test(H.g('obras').innerHTML), H.g('obras').innerHTML.slice(0, 300));
    ok('14. "… 9 actuaciones más" es un boton (v3); chips con aria-pressed (ronda 1: colspan 10 con la columna "Acción recomendada")', /<tr class="mas"><td colspan="10"><button type="button" class="mas-btn" onclick="verMas\(\)">… 9 actuaciones más<\/button>/.test(H.g('obras').innerHTML) && /class="chip on" aria-pressed="true" data-temp="2026"/.test(H.g('filtros').innerHTML) && /class="chip" aria-pressed="false" data-temp="2025"/.test(H.g('filtros').innerHTML) && /class="chip on" aria-pressed="true" data-vm=""/.test(H.g('filtros').innerHTML) && /class="chip" aria-pressed="false" data-vm="c:501"/.test(H.g('filtros').innerHTML), H.g('filtros').innerHTML.slice(0, 400));
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
    ok('v3: se leen las 1040 lineas de 2026 (20 x 52) aunque el rango tenga 1000 de 2024', H.ev('LINEAS.length') === 1040, H.ev('LINEAS.length'));
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
    ok('vacio: el mapa todo h0 (v3: 26 elementos × 5 columnas = 130)', !/heat h[1-4]"/.test(H.g('mapa').innerHTML) && !/heat (hr|hb|hs)"/.test(H.g('mapa').innerHTML) && (H.g('mapa').innerHTML.match(/heat h0"/g) || []).length === 130);
  });
  await parte(async function () {
    console.log('12.4 Errores');
    var H = cuadro(); H.S.falla(function (x) { return x.table === 'TaInformeTemporadaLineas'; }); await H.ev('iniciar()');
    ok('lineas fallan: una linea roja y el boton de reintentar, nada mas', /No se pudieron leer los informes/.test(H.g('main').innerHTML) && /Reintentar/.test(H.g('main').innerHTML) && !/id="cuerpo"/.test(H.g('main').innerHTML), H.g('main').innerHTML.slice(0, 300));
    await H.ev('iniciar()');
    ok('reintentar vuelve a pintar el cuadro (v3: #cuerpo en main)', /id="cuerpo"/.test(H.g('main').innerHTML) && !/No se pudieron leer/.test(H.g('main').innerHTML) && /19 <span class="de">de 22/.test(H.g('tiles').innerHTML));
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
    /* v3: en el hueco la página pinta #cuerpo (los contenedores del nivel 1 salen del documento); se mira lo que hay en pantalla */
    var hueco = H.g('cuerpo').innerHTML + H.g('printHead').innerHTML;
    ok('1. en el hueco el chip 2025 esta elegido (cargando)', /class="chip on" aria-pressed="true" data-temp="2025"/.test(H.g('filtros').innerHTML), H.g('filtros').innerHTML.slice(0, 200));
    ok('1. en el hueco nada de 2026 bajo 2025: ni casas, ni obras, ni mapa, ni cuadros (v3: solo "Cargando la temporada 2025…")', H.g('cuerpo').innerHTML === '<div class="msg">Cargando la temporada 2025…</div>' && !/t=2026|temporada=2026|Obra \d|Villa \d\d|heat h|de 22/.test(hueco), hueco.slice(0, 300));
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
    ok('2b. la vista 2025 sigue y no sale la linea roja (v3: #cuerpo en main)', /id="cuerpo"/.test(H.g('main').innerHTML) && !/No se pudieron leer/.test(H.g('main').innerHTML) && /1 <span class="de">de 22/.test(H.g('tiles').innerHTML) && H.S.calls.some(function (x) { return x.fallo; }), H.g('main').innerHTML.slice(0, 200));
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
    ok('5. un trozo de un solo informe devuelve 1000 lineas: linea roja y Reintentar', /No se pudieron leer los informes/.test(H.g('main').innerHTML) && /Reintentar/.test(H.g('main').innerHTML) && !/id="cuerpo"/.test(H.g('main').innerHTML), H.g('main').innerHTML.slice(0, 200));
    ok('5. y una sola lectura de lineas (no se parte mas)', H.S.calls.filter(function (x) { return x.table === 'TaInformeTemporadaLineas'; }).length === 1);
    var H2 = cuadro({ db: db1(999, 1) }); await H2.ev('iniciar()');
    ok('5. con 999 lineas se pinta el cuadro (v3: #cuerpo en main)', /id="cuerpo"/.test(H2.g('main').innerHTML) && !/No se pudieron leer/.test(H2.g('main').innerHTML) && /1 <span class="de">de 1/.test(H2.g('tiles').innerHTML));
    var H3 = cuadro({ db: db1(0, 500) }); await H3.ev('iniciar()');
    ok('5. la lectura de informes devuelve 500 (el limit): linea roja y ninguna lectura de lineas', /No se pudieron leer los informes/.test(H3.g('main').innerHTML) && !/id="cuerpo"/.test(H3.g('main').innerHTML) && !H3.S.calls.some(function (x) { return x.table === 'TaInformeTemporadaLineas'; }), H3.g('main').innerHTML.slice(0, 200));
    var H4 = cuadro({ db: db1(0, 499) }); await H4.ev('iniciar()');
    ok('5. con 499 informes se pinta el cuadro (v3: #cuerpo en main)', /id="cuerpo"/.test(H4.g('main').innerHTML) && !/No se pudieron leer/.test(H4.g('main').innerHTML) && /1 <span class="de">de 1/.test(H4.g('tiles').innerHTML));
  });
  await parte(async function () {
    console.log('12.9 (9) Texto con HTML: sale escapado en todo lo pintado');
    var db = { TaVillas: [{ villaid: 1, Name: 'Casa <img src=x onerror=alert(1)> & Co', KeyHolder_person: '501', Status: 1 }], TaUsers: [], TaContacts: [{ ContactID: '501', Name: 'Ana <b>&</b>' }],
      TaInformeTemporada: [{ informe_id: 1, villaid: 1, temporada: 2026, estado: 'enviado', estado_general: 'Malo', fecha_revision: '2026-10-20T00:00:00' }],
      TaInformeTemporadaLineas: [{ linea_id: 1, informe_id: 1, seccion: 'resumen', clave: 'accion_1', orden: 1, texto_1: 'Quitar <img src=x onerror=alert(2)> & pintar', texto_2: 'Motivo <script>x</script> & más', prioridad: 'Alta' }] };
    var H = cuadro({ db: db }); await H.ev('iniciar()');
    var todo = H.g('tiles').innerHTML + H.g('rapidas').innerHTML + H.g('casas').innerHTML + H.g('obras').innerHTML + H.g('filtros').innerHTML + H.g('mapa').innerHTML;
    ok('9. ninguna etiqueta inyectada (<img, <script, <b>) (v3: #cuerpo en main; también en la fila Listas)', /id="cuerpo"/.test(H.g('main').innerHTML) && !/<img|<script|<b>/i.test(todo), todo.slice(0, 200));
    var nv = 'Casa &lt;img src=x onerror=alert(1)&gt; &amp; Co';
    H.ctx.location.hash = '#t=2026&v=lista:atencion'; H.ev('alCambiarHash()'); var atencion9 = H.g('cuerpo').innerHTML; H.ctx.location.hash = '#t=2026'; H.ev('alCambiarHash()');
    ok('9. el nombre de la villa escapado en la casa, la obra y la lista "Requiere atención" (v3: el cuadro "Casas en estado Malo" ya no existe)', H.g('casas').innerHTML.indexOf(nv) > 0 && H.g('obras').innerHTML.indexOf(nv) > 0 && atencion9.indexOf(nv) > 0 && !/<img|<script/i.test(atencion9), atencion9.slice(0, 300));
    ok('9. texto_1 y texto_2 escapados en las obras', H.g('obras').innerHTML.indexOf('Quitar &lt;img src=x onerror=alert(2)&gt; &amp; pintar') > 0 && H.g('obras').innerHTML.indexOf('Motivo &lt;script&gt;x&lt;/script&gt; &amp; más') > 0);
    ok('9. el villa manager escapado en el chip, la casa y la obra', H.g('filtros').innerHTML.indexOf('>Ana &lt;b&gt;&amp;&lt;/b&gt;</button>') > 0 && H.g('casas').innerHTML.indexOf('Ana &lt;b&gt;&amp;&lt;/b&gt;') > 0 && H.g('obras').innerHTML.indexOf('Ana &lt;b&gt;&amp;&lt;/b&gt;') > 0);
  });
  await parte(async function () {
    console.log('12.10 (9) descargarCsv de extremo a extremo (ancla y Blob falsos)');
    var H = cuadro(), d = descargas(H); await H.ev('iniciar()');
    H.ev('descargarCsv()');
    /* blob.text() quita el BOM al decodificar: se miran los bytes */
    var by = d.length ? Buffer.from(await d[0].blob.arrayBuffer()) : Buffer.alloc(0), txt = by.toString('utf8'), L = txt.split('\r\n');
    ok('9. un clic: obras-temporada-2026.csv, text/csv;charset=utf-8', d.length === 1 && d[0].nombre === 'obras-temporada-2026.csv' && d[0].blob.type === 'text/csv;charset=utf-8' && d[0].href === 'blob:prueba-1', J(d.map(function (x) { return [x.nombre, x.blob && x.blob.type]; })));
    ok('9. BOM (EF BB BF), cabecera v3 de Listas (ronda 1: con "Acción recomendada"), 19 obras Alto de informes enviados y ninguna de Villa 20 (borrador)', by[0] === 0xEF && by[1] === 0xBB && by[2] === 0xBF && L[0] === '\uFEFFCasa;VM;Actuación;Acción recomendada;Motivo / impacto;Origen;Prioridad;Coste;Detalle' && L.length === 21 && L[20] === '' &&
      L.filter(function (l) { return /;Alto;/.test(l); }).length === 19 && !L.some(function (l) { return /^Villa 20;/.test(l); }) && L.indexOf('Villa 01;Kike;Obra 1;;;Resumen 1;Alto;;sin detalle') > 0, L.slice(0, 3).join(' / '));
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
  /* ── 14. v3 (cuadro v3a, 29/10/2026): el armazón de la página con los seis scripts del cuadro, de extremo a extremo con el Worker falso ── */
  function hrefsDe(h) { var out = [], re = /href="([^"]*)"/g, m; while ((m = re.exec(h))) out.push(m[1].replace(/&amp;/g, '&')); return out; }
  function paramsDe(hh) { var p = {}; String(hh).replace(/^#/, '').split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) p[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); }); return p; }
  function ir(H, h) { H.ctx.location.hash = h; H.ev('alCambiarHash()'); }
  function nivel1(H) { return ['tiles', 'rapidas', 'vmt', 'casas', 'mapa', 'obras'].map(function (id) { return H.g(id).innerHTML; }).join(''); }
  function abrirDe(h) { return (h.match(/<a class="abrir"/g) || []).length; }
  await parte(async function () {
    console.log('14.1 v3: carga y nivel 1 (seis cuadros, Listas, tabla por villa manager, casas, mapa, obras)');
    ok('14.1 los seis scripts del cuadro en <head>, en orden, con ?v=3, despues de nav-component.js', J(SCRIPTS_V3) === J(['informe-temporada-score.js', 'cuadro-informes-temporada-rutas.js', 'cuadro-informes-temporada-listas.js', 'cuadro-informes-temporada-portada.js', 'cuadro-informes-temporada-vistas.js', 'cuadro-informes-temporada-extras.js'])
      && SRC.indexOf('<script src="nav-component.js"></script>') < SRC.indexOf('<script src="informe-temporada-score.js?v=3"></script>') && SRC.indexOf('<script src="cuadro-informes-temporada-extras.js?v=3"></script>') < SRC.indexOf('</head>'), J(SCRIPTS_V3));
    ok('14.1 la hoja cuadro-informes-temporada-extras.css?v=3 despues del <style> de la pagina', SRC.indexOf('<link rel="stylesheet" href="cuadro-informes-temporada-extras.css?v=3">') > SRC.indexOf('</style>') && SRC.indexOf('</style>') > 0);
    var H = cuadro(); await H.ev('iniciar()');
    var T = H.g('tiles').innerHTML;
    ok('14.1 seis cuadros con las palabras de la maqueta', (T.match(/class="tile[ "]/g) || []).length === 6 && ['Entregados', 'Condición media', 'Alertas', 'Obras por prioridad', 'Actuaciones por banda de coste', 'Comentarios Review'].every(function (w) { return T.indexOf(w) >= 0; }), T.slice(0, 200));
    ok('14.1 Entregados 19 de 22; 1 en borrador y 2 sin informe son puertas', /19 <span class="de">de 22<\/span>/.test(T) && />1 en borrador<\/a>/.test(T) && />2 sin informe<\/a>/.test(T));
    ok('14.1 obras: 19 actuaciones (solo enviados) y "1 más en borradores (no cuentan)"', />19 <span class="de">actuaciones<\/span>/.test(T) && /1 más en borradores \(no cuentan\)/.test(T), T.slice(T.indexOf('Obras por'), T.indexOf('Obras por') + 400));
    ok('14.1 etiquetas de prioridad Alto / Medio / Bajo (las del formulario)', />Alto 19<\/a>/.test(T) && />Medio 0<\/a>/.test(T) && />Bajo 0<\/a>/.test(T) && !/>Alta \d/.test(T));
    ok('14.1 fórmula y versión de la puntuación a la vista', /Condición = 100 × \(2 × Bueno \+ Regular\) ÷ \(2 × elementos evaluados\)/.test(T) && /puntuación v1/.test(T));
    ok('14.1 22 tarjetas, cada una abre casa:<villaid> con t=2026', (H.g('casas').innerHTML.match(/<a class="casa /g) || []).length === 22 && hrefsDe(H.g('casas').innerHTML).filter(function (x) { return /^casa:\d+$/.test(paramsDe(x).v) && paramsDe(x).t === '2026'; }).length === 22);
    ok('14.1 tabla por villa manager: Kike, Rafa y Todos', /<b>Kike<\/b>/.test(H.g('vmt').innerHTML) && /<b>Rafa<\/b>/.test(H.g('vmt').innerHTML) && /Todos/.test(H.g('vmt').innerHTML));
    ok('14.1 mapa: 26 elementos y 130 cifras (cinco columnas), cada una una puerta', hrefsDe(H.g('mapa').innerHTML).filter(function (x) { return /^lista:mapa:[a-z_]+:(bueno|regular|malo|sin|na)$/.test(paramsDe(x).v); }).length === 130 && hrefsDe(H.g('mapa').innerHTML).filter(function (x) { return /^lista:elemento:/.test(paramsDe(x).v); }).length === 26);
    ok('14.1 Colchones: 12 Malo (Villas 01 a 12, todas enviadas)', /lista:mapa:colchones:malo" title="Ver las casas">12<\/a>/.test(H.g('mapa').innerHTML), (H.g('mapa').innerHTML.match(/colchones:malo"[^>]*>\d+/) || [''])[0]);
    ok('14.1 todos los enlaces del nivel 1 llevan t=2026', hrefsDe(nivel1(H)).length > 200 && hrefsDe(nivel1(H)).every(function (x) { return paramsDe(x).t === '2026'; }), J(hrefsDe(nivel1(H)).filter(function (x) { return paramsDe(x).t !== '2026'; }).slice(0, 3)));
    ok('14.1 obras del nivel 1: 10 filas a la vista y "… 9 actuaciones más" (19 de 19)', abrirDe(H.g('obras').innerHTML) === 19 && (H.g('obras').innerHTML.match(/<tr class="obra extra"/g) || []).length === 9 && /… 9 actuaciones más/.test(H.g('obras').innerHTML) && /19 de 19 actuaciones/.test(H.g('obras').innerHTML));
    ok('14.1 cabecera de impresión del cuadro', H.g('printHead').innerHTML === 'Temporada 2026 · VM: todos · Informes enviados', H.g('printHead').innerHTML);
    ok('14.1 filtros: temporada, villa manager, "⚑ Requiere atención" (lista:atencion) e Imprimir', /data-temp="2026"/.test(H.g('filtros').innerHTML) && /data-vm="c:501"/.test(H.g('filtros').innerHTML) && hrefsDe(H.g('filtros').innerHTML).some(function (x) { return paramsDe(x).v === 'lista:atencion'; }) && /🖨️ Imprimir/.test(H.g('filtros').innerHTML));
    H.ev('verMas()');
    ok('14.1 "más" despliega las 19', !/<tr class="obra extra"/.test(H.g('obras').innerHTML) && !/actuaciones más/.test(H.g('obras').innerHTML));
    H.ev("elegirVM('c:501')");
    ok('14.1 elegir Kike: el hash lleva vm=c:501, 11 tarjetas y cada puerta conserva vm=c:501', H.ctx.location.hash === '#t=2026&vm=c:501' && (H.g('casas').innerHTML.match(/<a class="casa /g) || []).length === 11 && hrefsDe(nivel1(H)).every(function (x) { return paramsDe(x).vm === 'c:501'; }), H.ctx.location.hash);
    ok('14.1 hashchange, keydown y click escuchados', H.escucha(true, 'hashchange') === 1 && H.escucha(false, 'keydown') >= 1 && H.escucha(false, 'click') >= 1);
  });
  await parte(async function () {
    console.log('14.2 v3: nivel 2 por el hash (lista, cifra = filas, CSV, volver)');
    var H = cuadro(); await H.ev('iniciar()');
    var puerta = hrefsDe(H.g('tiles').innerHTML).filter(function (x) { return paramsDe(x).v === 'lista:obras:alta'; })[0];
    var nT = +((H.g('tiles').innerHTML.match(/v=lista:obras:alta">Alto (\d+)</) || [])[1]);
    var lecturas = H.S.calls.length;
    ir(H, puerta);
    var C = H.g('cuerpo').innerHTML;
    ok('14.2 la puerta "Alto 19" abre su lista con 19 filas (cifra = filas) y sin leer nada', nT === 19 && abrirDe(C) === 19 && /Actuaciones de prioridad Alto/.test(C) && H.S.calls.length === lecturas, nT + ' / ' + abrirDe(C));
    ok('14.2 título, "‹ Cuadro" al cuadro con t=2026, buscador y CSV de estas filas', /class="lt">Actuaciones de prioridad Alto <small>· 19 actuaciones · temporada 2026 · VM: todos · informes enviados<\/small>/.test(C) && /<a class="atras" href="#t=2026">‹ Cuadro<\/a>/.test(C) && /id="q"/.test(C) && /CSV de estas filas/.test(C), C.slice(0, 300));
    ok('14.2 cada fila abre la casa con from=lista:obras:alta', hrefsDe(C).filter(function (x) { var p = paramsDe(x); return /^casa:\d+$/.test(p.v) && p.from === 'lista:obras:alta'; }).length >= 19);
    ok('14.2 cabecera de impresión de la lista', H.g('printHead').innerHTML === 'Temporada 2026 · VM: todos · Informes enviados · Actuaciones de prioridad Alto', H.g('printHead').innerHTML);
    ir(H, '#t=2026&v=lista:obras:alta&q=Obra%201');
    C = H.g('cuerpo').innerHTML;
    ok('14.2 búsqueda en el hash: "Obra 1" = 11 filas (Obra 1, 10 a 19)', abrirDe(C) === 11 && /11 de 19 filas/.test(C), abrirDe(C));
    var d = descargas(H); H.ev('Vistas.bajarCsv()');
    var by = d.length ? Buffer.from(await d[0].blob.arrayBuffer()) : Buffer.alloc(0), L = by.toString('utf8').split('\r\n');
    ok('14.2 CSV de estas filas: BOM, cabecera y las 11 filas buscadas', by[0] === 0xEF && L.length === 13 && L[12] === '' && L.slice(1, 12).every(function (l) { return /;Obra 1\d?;/.test(l); }) && d[0].nombre === 'lista-obras-alta-2026.csv', d.length + ' ' + (d[0] && d[0].nombre) + ' ' + L.length);
    ir(H, '#t=2026&v=lista:alertas');
    ok('14.2 lista vacía con su porqué (ninguna alerta en estos datos)', /Lista vacía/.test(H.g('cuerpo').innerHTML) && /Ningún informe enviado tiene un peligro/.test(H.g('cuerpo').innerHTML), H.g('cuerpo').innerHTML.slice(0, 300));
    ir(H, '#t=2026&v=lista:coste');
    ok('14.2 cuadro de coste: lista explicada "formulario v5"', /formulario v5/.test(H.g('cuerpo').innerHTML) && /Lista vacía/.test(H.g('cuerpo').innerHTML));
    ir(H, '#t=2026&v=lista:noexiste');
    ok('14.2 lista desconocida: lo dice y vuelve al cuadro', /Lista desconocida|no corresponde a ninguna lista/.test(H.g('cuerpo').innerHTML) && /‹ Cuadro/.test(H.g('cuerpo').innerHTML));
    ir(H, '#t=2026');
    ok('14.2 volver al cuadro: nivel 1 otra vez', /<a class="casa /.test(H.g('casas').innerHTML) && /id="tiles"/.test(H.g('cuerpo').innerHTML));
  });
  await parte(async function () {
    console.log('14.3 v3: nivel 3 (casa), temporada anterior al usarla y una sola vez, anterior / siguiente, flechas');
    var H = cuadro(); await H.ev('iniciar()');
    var antes = H.S.calls.filter(function (x) { return x.table === 'TaInformeTemporada' && /temporada=2025/.test(x.where || ''); }).length;
    ok('14.3 el cuadro no lee 2025 hasta que una vista la usa', antes === 0);
    ir(H, '#t=2026&v=casa:1&from=lista:obras:alta');
    ok('14.3 una casa enviada pide 2025 y mientras dice "Cargando la temporada 2025 para comparar…"', /Cargando la temporada 2025 para comparar…/.test(H.g('cuerpo').innerHTML), H.g('cuerpo').innerHTML.slice(0, 120));
    await H.espera(40);
    var C = H.g('cuerpo').innerHTML;
    ok('14.3 la casa: nombre, "Abrir formulario" al formulario real, "Imprimir casa", comparación con 2025', /<h2>Villa 01<\/h2>/.test(C) && C.indexOf('href="informe-temporada.html?villaid=1&amp;temporada=2026">Abrir formulario</a>') > 0 && /Imprimir casa/.test(C) && /Comparación con 2025/.test(C) && /Sin informe enviado en 2025 para esta casa/.test(C), C.slice(0, 300));
    ok('14.3 posición en la lista de origen y Siguiente (Villa 02); sin Anterior en la primera', /casa 1 de 19 en «Actuaciones de prioridad Alto»/.test(C) && H.ev('Vistas.navActual.next') === '#t=2026&v=casa:2&from=lista:obras:alta' && H.ev('Vistas.navActual.prev') === null, H.ev('JSON.stringify(Vistas.navActual)'));
    ok('14.3 "‹ Lista" vuelve a la lista de origen', /<a class="atras" href="#t=2026&amp;v=lista:obras:alta">‹ Lista<\/a>/.test(C));
    ok('14.3 impresión de la casa: "Uso interno · dirección" y el estado', /<div class="uso">Uso interno · dirección<\/div>Temporada 2026 · Villa 01 · VM Kike · Informe enviado/.test(H.g('printHead').innerHTML), H.g('printHead').innerHTML);
    await H.evento(false, 'keydown', { key: 'ArrowRight', target: { tagName: 'DIV' }, preventDefault: function () {} });
    ok('14.3 → fuera de un campo: la casa siguiente', H.ctx.location.hash === '#t=2026&v=casa:2&from=lista:obras:alta', H.ctx.location.hash);
    H.ev('alCambiarHash()');
    ok('14.3 la segunda casa no vuelve a leer 2025 (guardada)', H.S.calls.filter(function (x) { return x.table === 'TaInformeTemporada' && /temporada=2025/.test(x.where || ''); }).length === 1 && /<h2>Villa 02<\/h2>/.test(H.g('cuerpo').innerHTML));
    await H.evento(false, 'keydown', { key: 'ArrowRight', target: { tagName: 'INPUT' } });
    ok('14.3 → dentro de un campo: no cambia de casa', H.ctx.location.hash === '#t=2026&v=casa:2&from=lista:obras:alta');
    var abierto = H.ctx.Extras.overlayAbierto; H.ctx.Extras.overlayAbierto = function () { return true; };
    await H.evento(false, 'keydown', { key: 'ArrowLeft', target: { tagName: 'DIV' } });
    H.ctx.Extras.overlayAbierto = abierto;
    ok('14.3 ← con la foto abierta (Extras.overlayAbierto): no cambia de casa', H.ctx.location.hash === '#t=2026&v=casa:2&from=lista:obras:alta');
    await H.evento(false, 'click', { target: { closest: function (s) { return s === 'a,button,input' ? null : { getAttribute: function () { return '#t=2026&v=casa:5'; } }; } } });
    ok('14.3 clic en una fila con data-href: va a su casa', H.ctx.location.hash === '#t=2026&v=casa:5');
    ir(H, '#t=2026&v=casa:21');
    ok('14.3 casa sin informe: lo dice, sin pedir nada', /Sin informe/.test(H.g('cuerpo').innerHTML) && /<h2>Villa 21<\/h2>/.test(H.g('cuerpo').innerHTML));
    ir(H, '#t=2026&v=casa:999');
    ok('14.3 casa que no existe: "Casa no encontrada"', /Casa no encontrada/.test(H.g('cuerpo').innerHTML));
  });
  await parte(async function () {
    console.log('14.4 v3: la temporada anterior falla: línea roja y Reintentar; repetido y comparación esperan a 2025');
    var H = cuadro(); await H.ev('iniciar()');
    H.S.falla(function (x) { return x.table === 'TaInformeTemporada' && /temporada=2025/.test(x.where || ''); });
    ir(H, '#t=2026&v=lista:repetido'); await H.espera(40);
    ok('14.4 fallo: "No se pudo leer la temporada 2025" con Reintentar, y la lista dice por qué está vacía', /No se pudo leer la temporada 2025/.test(H.g('cuerpo').innerHTML) && /reintentarPrevia\(\)/.test(H.g('cuerpo').innerHTML), H.g('cuerpo').innerHTML.slice(0, 200));
    H.ev('reintentarPrevia()'); await H.espera(40);
    ok('14.4 Reintentar lee otra vez y pinta la lista sin la línea roja', !/No se pudo leer/.test(H.g('cuerpo').innerHTML) && /‹ Cuadro/.test(H.g('cuerpo').innerHTML) && H.S.calls.filter(function (x) { return x.table === 'TaInformeTemporada' && /temporada=2025/.test(x.where || ''); }).length === 2);
    ir(H, '#t=2026&v=lista:comparacion');
    ok('14.4 comparación con 2025 ya leída: sin "Cargando"', !/Cargando/.test(H.g('cuerpo').innerHTML) && /‹ Cuadro/.test(H.g('cuerpo').innerHTML));
    ir(H, '#t=2026');
    ok('14.4 con 2025 leída, el cuadro de condición compara (vs 2025) y la fila Listas da Repetido con cifra', /vs 2025: /.test(H.g('tiles').innerHTML) && !/se lee al abrir/.test(H.g('tiles').innerHTML) && /Repetido 2025–2026 · \d+/.test(H.g('rapidas').innerHTML), H.g('rapidas').innerHTML.slice(0, 300));
  });
  await parte(async function () {
    console.log('14.5 v3: un enlace pegado abre la misma vista; cambiar de temporada conserva la vista');
    var H = cuadro(); H.ctx.location.hash = '#t=2025&vm=c:501&v=lista:estado:enviado'; await H.ev('iniciar()');
    ok('14.5 enlace pegado: temporada 2025 leída, VM Kike conservado, la lista de enviados', H.ev('TEMP') === 2025 && H.ev('VM') === 'c:501' && /Casas con informe enviado/.test(H.g('cuerpo').innerHTML) && /‹ Cuadro/.test(H.g('cuerpo').innerHTML) && H.S.calls.some(function (x) { return x.table === 'TaInformeTemporada' && x.where === 'temporada=2025'; }), H.ev('TEMP') + ' ' + H.ev('VM'));
    ok('14.5 VM: Kike en el título de la lista', /VM: Kike/.test(H.g('cuerpo').innerHTML));
    await H.ctx.cambiarTemporada(2026);
    ok('14.5 cambiar a 2026 conserva la lista y el VM en el hash', H.ctx.location.hash === '#t=2026&vm=c:501&v=lista:estado:enviado' && /‹ Cuadro/.test(H.g('cuerpo').innerHTML), H.ctx.location.hash);
    ir(H, '#t=2025&vm=c:501');
    await H.espera(40);
    ok('14.5 Atrás a otra temporada (hash): la lee y pinta el cuadro', H.ev('TEMP') === 2025 && /1 <span class="de">de 11/.test(H.g('tiles').innerHTML), H.g('tiles').innerHTML.slice(0, 300));
  });
  await parte(async function () {
    console.log('14.6 v3: obras del nivel 1 con sus filtros en el hash y su CSV');
    var H = cuadro({ db: (function () { var db = dbGrande(); db.TaInformeTemporadaLineas.forEach(function (l) { if (l.seccion === 'resumen' && l.clave === 'accion_1' && l.informe_id % 2 === 0) l.prioridad = 'Baja'; }); return db; })() });
    H.ctx.location.hash = '#t=2026&op=baja'; await H.ev('iniciar()');
    var O = H.g('obras').innerHTML;
    ok('14.6 op=baja: solo las 9 de prioridad Bajo (pares enviadas), chip Bajo encendido', abrirDe(O) === 9 && /class="chip on" href="[^"]*op=baja[^"]*" aria-pressed="true">Bajo<\/a>/.test(O) && /9 de 19 actuaciones/.test(O), abrirDe(O));
    var d = descargas(H); H.ev('descargarCsv()');
    var by = d.length ? Buffer.from(await d[0].blob.arrayBuffer()) : Buffer.alloc(0), L = by.toString('utf8').split('\r\n');
    ok('14.6 CSV obras: obras-temporada-2026.csv, BOM, cabecera de Listas (ronda 1: con "Acción recomendada") y las 9 filas filtradas', d.length === 1 && d[0].nombre === 'obras-temporada-2026.csv' && by[0] === 0xEF && L[0] === '﻿Casa;VM;Actuación;Acción recomendada;Motivo / impacto;Origen;Prioridad;Coste;Detalle' && L.length === 11 && L.slice(1, 10).every(function (l) { return /;Bajo;/.test(l); }), L.slice(0, 2).join(' / '));
    ir(H, '#t=2026&op=baja&og=1');
    ok('14.6 og=1: agrupadas por casa (una fila de grupo por casa)', (H.g('obras').innerHTML.match(/<tr class="grp/g) || []).length === 9);
    ir(H, '#t=2026&of=estancia');
    ok('14.6 of=estancia sin ninguna: vacía con su porqué', /Ningún resultado con estos filtros/.test(H.g('obras').innerHTML));
    ir(H, '#t=2027');
    await H.espera(40);
    ok('14.6 temporada sin informes: "Ninguna actuación todavía en los informes enviados."', /Ninguna actuación todavía en los informes enviados\./.test(H.g('obras').innerHTML) && /0 <span class="de">de 22/.test(H.g('tiles').innerHTML));
  });
  await parte(async function () {
    console.log('14.7 v3: "Sin villa manager" (vm=sin) y texto con HTML escapado en las tres vistas');
    var db = { TaVillas: [{ villaid: 1, Name: 'Casa <img src=x onerror=alert(1)> & Co', KeyHolder_person: '501', Status: 1 }, { villaid: 2, Name: 'Sola', KeyHolder_person: '', Status: 1 }], TaUsers: [], TaContacts: [{ ContactID: '501', Name: 'Ana <b>&</b>' }],
      TaInformeTemporada: [{ informe_id: 1, villaid: 1, temporada: 2026, estado: 'enviado', estado_general: 'Malo', fecha_revision: '2026-10-20T00:00:00', observaciones_finales: 'Fin <script>x</script>' }],
      TaInformeTemporadaLineas: [{ linea_id: 1, informe_id: 1, seccion: 'resumen', clave: 'accion_1', orden: 1, texto_1: 'Quitar <img src=x onerror=alert(2)> & pintar', texto_2: 'Motivo <script>x</script> & más', prioridad: 'Alta' },
        { linea_id: 2, informe_id: 1, seccion: 'huesped', clave: 'comentario_1', orden: 1, estado: 'Review', texto_1: 'Huésped <img src=y>' }, { linea_id: 3, informe_id: 1, seccion: 'foto', clave: 'foto_1', orden: 1, foto_url: 'https://fotos.invalid/a.jpg', texto_1: 'Pie <img src=z>' }] };
    var H = cuadro({ db: db }); await H.ev('iniciar()');
    var todo = nivel1(H) + H.g('filtros').innerHTML;
    ok('14.7 nivel 1: ninguna etiqueta inyectada y los nombres escapados', !/<img|<script/i.test(todo) && todo.indexOf('Casa &lt;img src=x onerror=alert(1)&gt; &amp; Co') > 0 && H.g('filtros').innerHTML.indexOf('>Ana &lt;b&gt;&amp;&lt;/b&gt;</button>') > 0, todo.slice(0, 200));
    ok('14.7 chip "Sin villa manager" cuando una casa no tiene', /data-vm="sin"[^>]*>Sin villa manager<\/button>/.test(H.g('filtros').innerHTML));
    H.ev("elegirVM('sin')");
    ok('14.7 vm=sin: el hash lo lleva y solo sale "Sola"', H.ctx.location.hash === '#t=2026&vm=sin' && (H.g('casas').innerHTML.match(/<a class="casa /g) || []).length === 1 && /Sola/.test(H.g('casas').innerHTML), H.ctx.location.hash);
    ir(H, '#t=2026&v=casa:1'); await H.espera(40);
    var C = H.g('cuerpo').innerHTML;
    ok('14.7 la casa: actuación, motivo, comentario, pie de foto y texto final escapados (el único <img es la miniatura de la galería)', !/<img src=[xyz]|<script/i.test(C) && (C.match(/<img /g) || []).length === 1 && C.indexOf('Quitar &lt;img') > 0 && C.indexOf('Motivo &lt;script&gt;') > 0 && C.indexOf('Huésped &lt;img') > 0 && C.indexOf('Pie &lt;img') > 0 && C.indexOf('Fin &lt;script&gt;x&lt;/script&gt;') > 0, C.slice(0, 200));
    ok('14.7 la casa lee las secciones nuevas: comentario Review y una foto en la galería', /class="gal"/.test(C) && /Review/.test(C));
    ir(H, '#t=2026&v=lista:obras:todas');
    ok('14.7 la lista: escapada', !/<img|<script/i.test(H.g('cuerpo').innerHTML) && H.g('cuerpo').innerHTML.indexOf('Quitar &lt;img') > 0);
  });
  await parte(async function () {
    console.log('14.8 v3: semilla window.__FIXTURE__ (pruebas y capturas) y scripts que faltan');
    var FX = require('./cuadro-informes-temporada-fixtures.js');
    var H = conScripts(A.cargar({ archivo: P, db: {}, rol: 'admin' }));
    H.ctx.window.__FIXTURE__ = FX; await H.ev('iniciar()');
    ok('14.8 con la semilla: ninguna lectura al Worker y 24 tarjetas', H.S.calls.length === 0 && (H.g('casas').innerHTML.match(/<a class="casa /g) || []).length === 24, H.S.calls.length);
    ir(H, '#t=2026&v=casa:' + FX.villas[0].villaid); await H.espera(40);
    ok('14.8 la casa con la semilla: comparación con la temporada previa de la semilla, sin Worker', H.S.calls.length === 0 && /Comparación con 2025/.test(H.g('cuerpo').innerHTML) && !/Cargando/.test(H.g('cuerpo').innerHTML));
    var H2 = A.cargar({ archivo: P, db: dbGrande(), rol: 'admin' }); await H2.ev('iniciar()');
    ok('14.8 sin los scripts del cuadro: "Faltan archivos del cuadro" y ninguna lectura', /Faltan archivos del cuadro \(InformeScore, Rutas, Listas, Portada, Vistas, Extras\)/.test(H2.g('main').innerHTML) && H2.S.calls.length === 0, H2.g('main').innerHTML);
    ok('14.8 la semilla solo existe si alguien la pone (window.__FIXTURE__), la página no la crea', /window\.__FIXTURE__\)\|\|null/.test(SRC) && !/window\.__FIXTURE__\s*=/.test(SRC));
  });
  await parte(async function () {
    console.log('14.9 v3: los propósitos de las comprobaciones de la v2 sobre la pantalla, con la pantalla v3 (carga, errores, huecos, marcas)');
    var H = cuadro(); H.S.falla(function (x) { return x.table === 'TaInformeTemporadaLineas'; }); await H.ev('iniciar()');
    ok('14.9 líneas fallan: solo la línea roja con Reintentar', /No se pudieron leer los informes/.test(H.g('main').innerHTML) && /Reintentar/.test(H.g('main').innerHTML) && !/id="cuerpo"/.test(H.g('main').innerHTML));
    await H.ev('iniciar()');
    ok('14.9 Reintentar vuelve a pintar el cuadro (19 de 22)', /id="cuerpo"/.test(H.g('main').innerHTML) && /19 <span class="de">de 22/.test(H.g('tiles').innerHTML));
    H.S.retrasa(function (x) { return x.table === 'TaInformeTemporada' && /temporada=2025/.test(x.where || ''); }, 150);
    var p = H.ctx.cambiarTemporada(2025); await H.espera(20);
    ok('14.9 en el hueco de 2025 solo "Cargando la temporada 2025…" (nada de 2026) y el chip 2025 elegido', H.g('cuerpo').innerHTML === '<div class="msg">Cargando la temporada 2025…</div>' && /class="chip on" aria-pressed="true" data-temp="2025"/.test(H.g('filtros').innerHTML), H.g('cuerpo').innerHTML.slice(0, 120));
    await p; await H.espera(10);
    ok('14.9 al llegar 2025: 1 de 22', /1 <span class="de">de 22/.test(H.g('tiles').innerHTML));
    var H2 = cuadro();
    var p26 = function (x) { return x.table === 'TaInformeTemporadaLineas' && /^informe_id>=1 AND/.test(x.where || ''); };
    H2.S.retrasa(p26, 200); H2.S.falla(p26);
    var q = H2.ev('iniciar()');
    await hasta(function () { return H2.S.calls.some(p26); });
    await H2.ctx.cambiarTemporada(2025); await q; await H2.espera(30);
    ok('14.9 2b: el fallo tardío de 2026 no tapa 2025 pintado', /id="cuerpo"/.test(H2.g('main').innerHTML) && !/No se pudieron leer/.test(H2.g('main').innerHTML) && /1 <span class="de">de 22/.test(H2.g('tiles').innerHTML));
    function db1(nl, ni) {
      var db = { TaVillas: [{ villaid: 1, Name: 'Son Bou', KeyHolder_person: '501', Status: 1 }], TaUsers: [], TaContacts: [{ ContactID: '501', Name: 'Kike' }], TaInformeTemporada: [], TaInformeTemporadaLineas: [] };
      for (var i = 1; i <= ni; i++) db.TaInformeTemporada.push({ informe_id: i, villaid: i, temporada: 2026, estado: 'enviado' });
      for (var k = 0; k < nl; k++) db.TaInformeTemporadaLineas.push({ linea_id: k + 1, informe_id: 1, seccion: 'interior', clave: 'x' + k, estado: 'Malo' });
      return db;
    }
    var H3 = cuadro({ db: db1(999, 1) }); await H3.ev('iniciar()');
    var H4 = cuadro({ db: db1(0, 499) }); await H4.ev('iniciar()');
    ok('14.9 con 999 líneas y con 499 informes se pinta el cuadro (1 de 1)', /1 <span class="de">de 1</.test(H3.g('tiles').innerHTML) && /1 <span class="de">de 1</.test(H4.g('tiles').innerHTML) && !/No se pudieron leer/.test(H3.g('main').innerHTML + H4.g('main').innerHTML));
    var H5 = cuadro(); await H5.ev('iniciar()');
    ok('14.9 marcas: "Todas las marcas Malo · 12" (colchones de las 12 primeras; estancia/salón Malo no cuenta)', /Todas las marcas Malo · 12</.test(H5.g('rapidas').innerHTML) || /marcas:malo">[^<]*12</.test(H5.g('rapidas').innerHTML), H5.g('rapidas').innerHTML.slice(0, 400));
    ok('14.9 mapa: Piscina 5 Regular y ninguna clave de estancia', /lista:mapa:piscina:regular" title="Ver las casas">5<\/a>/.test(H5.g('mapa').innerHTML) && !/lista:mapa:(salon|cocina|dormitorio|bano)[_:]/.test(H5.g('mapa').innerHTML) && /lista:elemento:mobiliario_cocina/.test(H5.g('mapa').innerHTML));
    await H5.ctx.cambiarTemporada(2027);
    ok('14.9 temporada vacía: el mapa todo h0 (130 cifras) y 22 tarjetas SIN INFORME', !/heat (h[1-4]|hr|hb|hs)"/.test(H5.g('mapa').innerHTML) && (H5.g('mapa').innerHTML.match(/heat h0"/g) || []).length === 130 && (H5.g('casas').innerHTML.match(/SIN INFORME/g) || []).length === 22);
  });
  await parte(async function () {
    console.log('14.10 ronda de arreglos 1: una obra del nivel 1 abre la casa con sus filtros; «‹ Cuadro» vuelve con el orden de la tabla de villa managers');
    var H = cuadro({ db: (function () { var db = dbGrande(); db.TaInformeTemporadaLineas.forEach(function (l) { if (l.seccion === 'resumen' && l.clave === 'accion_1' && l.informe_id % 2 === 0) l.prioridad = 'Baja'; }); return db; })() });
    H.ctx.location.hash = '#t=2026&s=media:desc&op=baja&of=resumen'; await H.ev('iniciar()');
    var m = H.g('obras').innerHTML.match(/<tr class="obra[^"]*" data-href="([^"]+)"/), dest = m ? m[1].replace(/&amp;/g, '&') : '';
    ok('14.10 la fila de obra lleva los filtros en from (lista:obras:baja:resumen) y el orden de la tabla en vs', /from=lista:obras:baja:resumen/.test(dest) && /vs=media:desc/.test(dest), dest);
    ir(H, dest); await H.espera(40);
    var C = H.g('cuerpo').innerHTML;
    ok('14.10 anterior / siguiente por las 9 obras Bajo filtradas, no por todas', / de 9 en «Actuaciones de prioridad Bajo»/.test(C), (C.match(/casa \d+ de \d+ en «[^»]*»/) || [])[0]);
    var at = C.match(/<a class="atras" href="([^"]+)"/), lista = at ? at[1].replace(/&amp;/g, '&') : '';
    ir(H, lista);
    var vuelta = (H.g('cuerpo').innerHTML.match(/<a class="atras" href="([^"]+)"/) || [])[1] || '';
    ok('14.10 «‹ Cuadro» de la lista vuelve con s=media:desc (orden de la tabla de villa managers)', /s=media:desc/.test(vuelta.replace(/&amp;/g, '&')) && !/vs=/.test(vuelta), vuelta);
    ir(H, '#t=2026&s=media:desc');
    ok('14.10 el chip «⚑ Requiere atención» del cuadro lleva el orden de la tabla (vs)', /href="[^"]*v=lista:atencion[^"]*vs=media:desc[^"]*">⚑ Requiere atención/.test(H.g('filtros').innerHTML), (H.g('filtros').innerHTML.match(/<a class="chip aviso[^>]*>/) || [])[0]);
  });
})().then(function () {
  fin = true;
  console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
  process.exitCode = fail ? 1 : 0;
});
