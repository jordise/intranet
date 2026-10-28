/* Pruebas del cuadro de informes de temporada (cuadro-informes-temporada.html v1, Jordi y Gary 28/10/2026).
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
  'filtrarPorVM', 'vmsDe', 'csvCell', 'csvObras', 'esc'];
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
ok('whereLineasRango: rango del trozo, todas las secciones', ctx.whereLineasRango([16, 20, 17]) === 'informe_id>=16 AND informe_id<=20', ctx.whereLineasRango([16, 20, 17]));
ok('whereLineasRango numerico', ctx.whereLineasRango(['10 OR 1=1', 7]) === 'informe_id>=7 AND informe_id<=10', ctx.whereLineasRango(['10 OR 1=1', 7]));

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
var fk = safe(function () { return ctx.filtrarPorVM(filas, lineas, 'Kike'); }) || {};
ok('Kike: Son Bou y Villa Alba y solo sus lineas', fk.filas && J(fk.filas.map(function (f) { return f.villa; }).sort()) === '["Son Bou","Villa Alba"]' && fk.lineas.every(function (l) { return l.informe_id === 10 || l.informe_id === 12; }) && fk.lineas.length === 10, fk.lineas && fk.lineas.length);
var fa = ctx.filtrarPorVM(filas, lineas, '') || {};
ok('"" = todas', fa.filas && fa.filas.length === 5 && fa.lineas.length === lineas.length);
ok('tiles con el filtro Kike: 2 de 2', ctx.tiles(fk.filas, fk.lineas).total === 2 && ctx.tiles(fk.filas, fk.lineas).accionesAlta.n === 1);
ok('vmsDe: Kike, Pau, Rafa (ordenados, sin repetir)', J(ctx.vmsDe(filas)) === '["Kike","Pau","Rafa"]', J(ctx.vmsDe(filas)));

console.log('9. CSV de obras');
var csv = safe(function () { return ctx.csvObras([{ villa: 'Son Bou', vm: 'Kike', accion: 'Cambiar "la" depuradora; ya', motivo: '=SUMA(A1)', prioridad: 'Alto', general: 'Malo', fecha: '27/10/2026' }]); }) || '';
var cl = String(csv).split('\r\n');
ok('BOM al principio', csv.charCodeAt && csv.charCodeAt(0) === 0xFEFF);
ok('cabecera', cl[0] === '﻿Casa;Villa manager;Actuación;Motivo / impacto;Prioridad;Estado general de la casa;Fecha de revisión', cl[0]);
ok('separador ; , comillas escapadas y formula neutralizada', cl[1] === 'Son Bou;Kike;"Cambiar ""la"" depuradora; ya";\'=SUMA(A1);Alto;Malo;27/10/2026', cl[1]);
ok('csvCell es la del listado', fnSource(SRC, 'csvCell') === fnSource(fs.readFileSync('informes-temporada.html', 'utf8'), 'csvCell'));

console.log('10. Pagina');
['Informes entregados', 'Casas en estado Malo', 'Actuaciones prioridad Alta', 'Marcas Malo en elementos'].forEach(function (s) { ok('cuadro "' + s + '"', SRC.indexOf(s) > 0); });
ok('grupos Interior / Exterior / Seguridad e instalaciones', SRC.indexOf("'Interior'") > 0 && SRC.indexOf("'Exterior'") > 0 && SRC.indexOf("'Seguridad e instalaciones'") > 0);
ok('titulo de las casas', /Casas\s*<small>· peor primero · un clic abre el informe<\/small>/.test(SRC));
ok('titulos del mapa y de las obras', /Mapa de problemas\s*<small>· nº de casas por elemento<\/small>/.test(SRC) && /Obras pendientes\s*<small>· actuaciones prioritarias de todas las casas<\/small>/.test(SRC));
ok('cabecera y proposito', SRC.indexOf('Informes de fin de temporada') > 0 && SRC.indexOf('Qué casas necesitan obra, qué obra, y quién no ha entregado el informe.') > 0 && SRC.indexOf('Dirección · estado de las casas al cierre de la temporada') > 0);
ok('botones ⬇ CSV obras y 🖨 Imprimir con window.print()', SRC.indexOf('⬇ CSV obras') > 0 && SRC.indexOf('🖨 Imprimir') > 0 && SRC.indexOf('window.print()') > 0);
ok('vacio y error', SRC.indexOf('Ninguna actuación todavía') > 0 && SRC.indexOf('No se pudieron leer los informes') > 0);
ok('@media (max-width: 640px)', /@media\s*\(max-width:\s*640px\)/.test(SRC));
ok('@media print con A4 vertical y 12 mm', /@media print/.test(SRC) && /@page\s*\{[^}]*A4 portrait[^}]*12mm/.test(SRC));
ok("Auth.require('cuadro-informes-temporada')", SRC.indexOf("Auth.require('cuadro-informes-temporada')") > 0);
ok('auth.js, nav.js y nav-component.js', /<script src="auth.js"><\/script>\s*<script src="nav.js"><\/script>\s*<script src="nav-component.js"><\/script>/.test(SRC));
ok('VERSIÓN ACTUAL: v1 en las 5 primeras lineas, PAGE_VERSION = 1, titulo v1', /VERSIÓN ACTUAL: v1 \|/.test(SRC.split('\n').slice(0, 5).join('\n')) && /const PAGE_VERSION = 1;/.test(SRC) && SRC.indexOf('<title>Cuadro de informes de temporada v1 — 3Villas</title>') > 0);
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

/* 12. El script REAL de la pagina con el Worker falso de arnes-informe.js */
var A = require('./arnes-informe.js'), fin = false;
process.on('exit', function () { if (!fin) { console.log('\n' + pass + ' PASS, ' + (fail + 1) + ' FAIL (las pruebas con fetch falso no terminaron)'); process.exitCode = 1; } });
async function parte(f) { try { await f(); } catch (e) { ok('la parte termina sin excepcion', false, e && e.stack); } }
function fechaFija(iso) { var D = Date; function F() { return arguments.length ? new (Function.prototype.bind.apply(D, [null].concat([].slice.call(arguments))))() : new D(iso); } F.now = function () { return new D(iso).getTime(); }; F.prototype = D.prototype; return F; }
/* 20 informes de 2026 (ids 1..20) con 52 lineas cada uno = 1040 lineas: no caben en una lectura de 1000 */
function dbGrande() {
  var db = { TaVillas: [], TaUsers: [{ UserID: 'U7', Name: 'Rafa' }], TaContacts: [{ ContactID: '501', Name: 'Kike' }], TaInformeTemporada: [], TaInformeTemporadaLineas: [] };
  var lid = 1;
  for (var v = 1; v <= 22; v++) {
    db.TaVillas.push({ villaid: v, Name: 'Villa ' + (v < 10 ? '0' : '') + v, KeyHolder_person: v % 2 ? '501' : 'U7', Status: 1 });
    if (v > 20) continue;
    db.TaInformeTemporada.push({ informe_id: v, villaid: v, temporada: 2026, estado: v === 20 ? 'borrador' : 'enviado', estado_general: v <= 3 ? 'Malo' : 'Bueno', fecha_revision: '2026-10-20T00:00:00' });
    for (var k = 0; k < 52; k++) db.TaInformeTemporadaLineas.push({ linea_id: lid++, informe_id: v, seccion: k < 5 ? 'resumen' : k < 18 ? 'interior' : 'huesped', clave: 'c' + k, estado: k === 6 ? 'Malo' : '', texto_1: k === 0 ? 'Obra ' + v : '', prioridad: k === 0 ? 'Alta' : '' });
  }
  db.TaInformeTemporada.push({ informe_id: 30, villaid: 21, temporada: 2025, estado: 'enviado', estado_general: 'Malo' });
  db.TaInformeTemporadaLineas.push({ linea_id: lid++, informe_id: 30, seccion: 'resumen', clave: 'accion_1', texto_1: 'De 2025', prioridad: 'Alta' });
  return db;
}
function cuadro(o) { o = o || {}; return A.cargar({ archivo: P, db: o.db || dbGrande(), rol: 'admin', Date: fechaFija(o.hoy || '2026-10-28T12:00:00') }); }
(async function () {
  await parte(async function () {
    console.log('12.1 Carga: lineas de todas las secciones por trozos de 15 informes');
    var H = cuadro(); await H.ev('iniciar()');
    var lin = H.S.calls.filter(function (x) { return x.table === 'TaInformeTemporadaLineas'; });
    H.S.calls.forEach(function (x) { console.log('        ' + H.S.texto(x)); });
    ok('dos lecturas de lineas: 1..15 y 16..20, limit 1000', lin.length === 2 && lin[0].where === 'informe_id>=1 AND informe_id<=15' && lin[1].where === 'informe_id>=16 AND informe_id<=20' && lin.every(function (x) { return x.limit === '1000'; }), lin.map(function (x) { return x.where; }).join(' | '));
    ok('las 1040 lineas de la temporada, ninguna de otra', H.ev('LINEAS.length') === 1040, H.ev('LINEAS.length'));
    ok('TaVillas Status=1 limit 500, TaUsers 200, TaContacts 500, TaInformeTemporada temporada=2026 limit 500', H.S.calls.some(function (x) { return x.table === 'TaVillas' && x.where === 'Status=1' && x.limit === '500'; }) && H.S.calls.some(function (x) { return x.table === 'TaUsers' && x.limit === '200'; }) && H.S.calls.some(function (x) { return x.table === 'TaContacts' && x.limit === '500'; }) && H.S.calls.some(function (x) { return x.table === 'TaInformeTemporada' && x.where === 'temporada=2026' && x.limit === '500'; }));
    ok('chips 2025, 2026, 2027; por defecto 2026', /data-temp="2025"[\s\S]*data-temp="2026"[\s\S]*data-temp="2027"/.test(H.g('filtros').innerHTML) && H.ev('TEMP') === 2026);
    ok('chips de villa manager: Todos, Kike, Rafa', /data-vm=""[^>]*>Todos[\s\S]*data-vm="Kike"[\s\S]*data-vm="Rafa"/.test(H.g('filtros').innerHTML), H.g('filtros').innerHTML.slice(0, 300));
    ok('cuadros: 19 de 22, 1 borrador, 2 sin informe', /19[\s\S]*de 22/.test(H.g('tiles').innerHTML) && /1 en borrador · 2 sin informe/.test(H.g('tiles').innerHTML), H.g('tiles').innerHTML.slice(0, 400));
    ok('20 actuaciones Alta (la de 2025 no cuenta)', /<div class="v">20<\/div>/.test(H.g('tiles').innerHTML));
    ok('22 tarjetas de casa', (H.g('casas').innerHTML.match(/class="casa /g) || []).length === 22);
    ok('obras: 10 filas y "… 10 actuaciones más"', (H.g('obras').innerHTML.match(/a class="abrir"/g) || []).length === 20 && /… 10 actuaciones más/.test(H.g('obras').innerHTML), (H.g('obras').innerHTML.match(/a class="abrir"/g) || []).length);
    var vill = H.S.calls.filter(function (x) { return x.table === 'TaVillas'; }).length;
    H.ev("VM='Kike';pintar()");
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
    ok('se leen las 1040 lineas de 2026 aunque el rango tenga 1000 de 2024', H.ev('LINEAS.length') === 1040, H.ev('LINEAS.length'));
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
})().then(function () {
  fin = true;
  console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
  process.exitCode = fail ? 1 : 0;
});
