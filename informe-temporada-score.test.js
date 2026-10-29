/* Pruebas de informe-temporada-score.js (la puntuación de condición del informe de temporada, Consenso v2 del 29/10/2026).
   node informe-temporada-score.test.js
   Los ocho casos de aceptación del consenso, el redondeo a un decimal hacia arriba en el medio, los duplicados,
   las marcas no válidas, las banderas, las actuaciones sin duplicados y la comparación de dos temporadas. Sin red. */
var fs = require('fs'), vm = require('vm');
var P = 'informe-temporada-score.js';
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
function J(x) { return JSON.stringify(x); }
function safe(f) { try { return f(); } catch (e) { return e; } }
function fin() { console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exitCode = fail ? 1 : 0; }

var S = null;
try { S = require('./' + P); } catch (e) { ok('se carga ' + P, false, e.message); fin(); return; }
ok('se carga ' + P + ' con require', !!S && typeof S === 'object');
['elementosDef', 'elementosSeguridad', 'condicion', 'banderas', 'acciones', 'comparar', 'redondear1'].forEach(function (n) {
  ok('expone ' + n, S && typeof S[n] === 'function');
});
if (fail) { fin(); return; }

/* Ayudas de las pruebas: líneas como las guarda el formulario (estado 'Bueno' / 'Regular' / 'Malo') */
var EL = S.elementosDef(), CLAVES = EL.map(function (e) { return e.clave; });
var SEC = {}; EL.forEach(function (e) { SEC[e.clave] = e.seccion; });
var MAY = { bueno: 'Bueno', regular: 'Regular', malo: 'Malo' };
function linea(clave, estado, extra) {
  var l = { informe_id: 7, seccion: SEC[clave], clave: clave, estado: estado ? (MAY[estado] || estado) : '', texto_1: '', texto_2: '', prioridad: '' };
  Object.keys(extra || {}).forEach(function (k) { l[k] = extra[k]; });
  return l;
}
/* marcas: {clave: 'bueno'|'regular'|'malo'|'na'|''}; las que no estén no tienen línea */
function lineas(marcas) {
  return Object.keys(marcas).map(function (k) { return marcas[k] === 'na' ? linea(k, '', { na: true }) : linea(k, marcas[k]); });
}
function todas(estado) { var m = {}; CLAVES.forEach(function (k) { m[k] = estado; }); return m; }

console.log('1. Elementos: las 26 claves del formulario y las seis de seguridad');
var FORM = fs.readFileSync('informe-temporada.html', 'utf8'), fctx = {};
function fnSource(s, name) {
  var i = s.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = s.indexOf('{', i), depth = 0, k = j;
  for (; k < s.length; k++) { if (s[k] === '{') depth++; else if (s[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return s.slice(i, k);
}
vm.runInNewContext(fnSource(FORM, 'seccionesDef'), fctx);
var esperado = [];
fctx.seccionesDef().filter(function (s) { return s.tipo === 'estado'; }).forEach(function (s) { s.claves.forEach(function (c) { esperado.push({ seccion: s.id, clave: c[0], label: c[1] }); }); });
ok('26 elementos, mismas claves, palabras, secciones y orden que seccionesDef() del formulario', EL.length === 26 && J(EL) === J(esperado), J(EL).slice(0, 160));
var CUADRO = fs.readFileSync('cuadro-informes-temporada.html', 'utf8'), cctx = {};
vm.runInNewContext(fnSource(CUADRO, 'elementosDef'), cctx);
ok('igual que elementosDef() del cuadro v2', J(EL) === J(cctx.elementosDef()));
ok('elementosSeguridad = las seis claves del consenso', J(S.elementosSeguridad()) === J(['instalacion_electrica', 'cerraduras', 'fontaneria_agua_caliente', 'barandillas', 'pavimentos', 'piscina']));
ok('cada clave de seguridad es un elemento', S.elementosSeguridad().every(function (k) { return CLAVES.indexOf(k) >= 0; }));
ok('elementosDef devuelve una copia nueva cada vez', (function () { var a = S.elementosDef(); a[0].clave = 'x'; return S.elementosDef()[0].clave === 'pintura'; })());

console.log('2. Redondeo a un decimal, hacia arriba en el medio');
ok('96.25 -> 96.3', S.redondear1(96.25) === 96.3, S.redondear1(96.25));
ok('6.25 -> 6.3', S.redondear1(6.25) === 6.3, S.redondear1(6.25));
ok('96.15 -> 96.2', S.redondear1(96.15) === 96.2, S.redondear1(96.15));
ok('79.95 -> 80 (el float 799.4999… no baja)', S.redondear1(79.95) === 80, S.redondear1(79.95));
ok('1.05 -> 1.1', S.redondear1(1.05) === 1.1, S.redondear1(1.05));
ok('49.94 -> 49.9', S.redondear1(49.94) === 49.9, S.redondear1(49.94));
ok('100 -> 100, 0 -> 0', S.redondear1(100) === 100 && S.redondear1(0) === 0);
ok('-6.25 -> -6.3 (simétrico)', S.redondear1(-6.25) === -6.3, S.redondear1(-6.25));
ok('null, undefined, NaN, texto -> null', S.redondear1(null) === null && S.redondear1(undefined) === null && S.redondear1(NaN) === null && S.redondear1('abc') === null);

console.log('3. Los ocho casos de aceptación del consenso');
var c1 = S.condicion(lineas(todas('bueno')));
ok('caso 1: 26 Bueno -> 100.0 completo, verde', c1.puntuacion === 100 && c1.completo === true && c1.banda === 'verde' && c1.bueno === 26 && c1.evaluados === 26 && c1.aplicables === 26 && c1.na === 0 && c1.error === null, J(c1));
var m2 = {}; CLAVES.forEach(function (k, i) { m2[k] = i < 13 ? 'bueno' : 'regular'; });
var c2 = S.condicion(lineas(m2));
ok('caso 2: 13 Bueno / 13 Regular -> 75.0 completo, ámbar', c2.puntuacion === 75 && c2.completo === true && c2.banda === 'ambar' && c2.bueno === 13 && c2.regular === 13, J(c2));
var m3 = todas('bueno'); m3.instalacion_electrica = 'malo';
var l3 = lineas(m3), c3 = S.condicion(l3), b3 = S.banderas({ estado_general: 'Bueno' }, l3);
ok('caso 3: 25 Bueno + eléctrica Malo -> 96.2 completo', c3.puntuacion === 96.2 && c3.completo === true && c3.malo === 1 && c3.banda === 'verde', J(c3));
ok('caso 3: revisión urgente de seguridad = [instalacion_electrica]', J(b3.seguridad) === J(['instalacion_electrica']), J(b3));
var m4 = {}; CLAVES.forEach(function (k, i) { m4[k] = i < 19 ? 'bueno' : 'na'; });
var c4 = S.condicion(lineas(m4));
ok('caso 4: 19 Bueno + 7 N/A -> 100.0 completo, aplicables 19', c4.puntuacion === 100 && c4.completo === true && c4.aplicables === 19 && c4.na === 7 && c4.evaluados === 19, J(c4));
var m5 = {}; CLAVES.forEach(function (k, i) { m5[k] = i < 20 ? 'bueno' : ''; });
var c5 = S.condicion(lineas(m5));
ok('caso 5: 20 Bueno + 6 en blanco -> 100.0 provisional 20 de 26', c5.puntuacion === 100 && c5.completo === false && c5.evaluados === 20 && c5.aplicables === 26, J(c5));
var m5b = {}; CLAVES.slice(0, 20).forEach(function (k) { m5b[k] = 'bueno'; });
var c5b = S.condicion(lineas(m5b));
ok('caso 5 sin filas para las 6 (fila que falta = desconocido): igual', c5b.puntuacion === 100 && c5b.completo === false && c5b.evaluados === 20 && c5b.aplicables === 26, J(c5b));
var m6 = {}; CLAVES.forEach(function (k, i) { m6[k] = i === 0 ? 'regular' : i < 8 ? 'malo' : 'na'; });
var c6 = S.condicion(lineas(m6));
ok('caso 6: 1 Regular + 7 Malo + 18 N/A -> 6.3 completo, rojo', c6.puntuacion === 6.3 && c6.completo === true && c6.banda === 'rojo' && c6.aplicables === 8 && c6.regular === 1 && c6.malo === 7, J(c6));
var c7 = S.condicion(lineas(todas('')));
ok('caso 7: todo en blanco -> null, gris, incompleto', c7.puntuacion === null && c7.banda === 'gris' && c7.completo === false && c7.evaluados === 0 && c7.error === null, J(c7));
var c7b = S.condicion([]);
ok('caso 7 sin líneas: igual', c7b.puntuacion === null && c7b.banda === 'gris' && c7b.completo === false && c7b.aplicables === 26, J(c7b));
var l8 = [
  { informe_id: 7, seccion: 'resumen', clave: 'accion_1', orden: 1, texto_1: 'Cambiar el termo', texto_2: 'Pierde agua', prioridad: 'Alta' },
  { informe_id: 7, seccion: 'estancia', clave: 'cocina', orden: 2, texto_1: '  Cambiar el termo ', texto_2: '', prioridad: 'Alta' }
];
var a8 = S.acciones(l8);
ok('caso 8: Alta con el mismo texto en resumen y en una estancia -> una actuación Alta con dos fuentes', a8.length === 1 && a8[0].accion === 'Cambiar el termo' && a8[0].prioridad === 'Alta' && a8[0].fuentes.length === 2, J(a8));
ok('caso 8: las dos fuentes (sección, clave, orden)', J(a8[0] && a8[0].fuentes) === J([{ seccion: 'resumen', clave: 'accion_1', orden: 1 }, { seccion: 'estancia', clave: 'cocina', orden: 2 }]), J(a8[0] && a8[0].fuentes));

console.log('4. Condición: bandas, marcas, N/A y errores de datos');
function conMarcas(b, r, m) { var x = {}; CLAVES.forEach(function (k, i) { x[k] = i < b ? 'bueno' : i < b + r ? 'regular' : i < b + r + m ? 'malo' : ''; }); return S.condicion(lineas(x)); }
ok('49.x es rojo, 50 es ámbar', conMarcas(0, 1, 1).banda === 'rojo' && conMarcas(0, 2, 0).banda === 'ambar', J([conMarcas(0, 1, 1), conMarcas(0, 2, 0)]));
ok('79.x es ámbar, 80 es verde (la banda usa el decimal guardado)', (function () { var a = conMarcas(3, 2, 0), b = conMarcas(3, 0, 1); return a.puntuacion === 80 && a.banda === 'verde' && b.puntuacion === 75 && b.banda === 'ambar'; })(), J([conMarcas(3, 2, 0), conMarcas(3, 0, 1)]));
var lAmbar = conMarcas(19, 0, 5); /* 38/48 = 79.166… */
ok('19 Bueno + 5 Malo -> 79.2 ámbar, provisional 24 de 26', lAmbar.puntuacion === 79.2 && lAmbar.banda === 'ambar' && lAmbar.completo === false && lAmbar.evaluados === 24, J(lAmbar));
ok('las marcas se leen sin mayúsculas ni espacios ("  malo ", "BUENO")', (function () { var c = S.condicion([linea('pintura', '  malo '), linea('colchones', 'BUENO')]); return c.malo === 1 && c.bueno === 1 && c.puntuacion === 50 && c.error === null; })());
ok('una línea de una clave que no es de los 26 no cuenta', (function () { var c = S.condicion([linea('pintura', 'bueno'), { seccion: 'resumen', clave: 'accion_1', estado: 'Malo' }, { seccion: 'estancia', clave: 'cocina', estado: 'Malo' }]); return c.evaluados === 1 && c.malo === 0 && c.puntuacion === 100; })());
ok('la misma clave en otra sección no cuenta (seccion|clave)', (function () { var c = S.condicion([{ seccion: 'exterior', clave: 'pintura', estado: 'Malo' }]); return c.evaluados === 0 && c.puntuacion === null; })());
var dup = S.condicion([linea('pintura', 'bueno'), linea('pintura', 'malo'), linea('colchones', 'bueno')]);
ok('clave duplicada -> puntuación null, error "datos", gris', dup.puntuacion === null && dup.error === 'datos' && dup.banda === 'gris' && dup.completo === false, J(dup));
ok('clave duplicada aunque la segunda esté en blanco -> error "datos"', S.condicion([linea('pintura', 'bueno'), linea('pintura', '')]).error === 'datos');
var inv = S.condicion([linea('pintura', 'bueno'), linea('colchones', 'Excelente')]);
ok('marca no válida -> puntuación null, error "datos"', inv.puntuacion === null && inv.error === 'datos' && inv.banda === 'gris', J(inv));
ok('N/A con marca a la vez -> error "datos"', S.condicion([linea('pintura', 'bueno', { na: true })]).error === 'datos');
ok('na falso ("0", "false", false, 0, "") no es N/A', ['0', 'false', false, 0, '', null].every(function (v) { var c = S.condicion([linea('pintura', '', { na: v })]); return c.na === 0 && c.aplicables === 26; }));
ok('na verdadero (true, 1, "1", "true", "Sí") es N/A', [true, 1, '1', 'true', 'Sí'].every(function (v) { var c = S.condicion([linea('pintura', '', { na: v })]); return c.na === 1 && c.aplicables === 25; }));
var todoNa = S.condicion(lineas(todas('na')));
ok('26 N/A -> sin elementos aplicables: null, gris, no completo', todoNa.puntuacion === null && todoNa.aplicables === 0 && todoNa.completo === false && todoNa.banda === 'gris' && todoNa.error === null, J(todoNa));
ok('null o undefined como líneas -> null, gris', S.condicion(null).puntuacion === null && S.condicion(undefined).banda === 'gris');
ok('líneas null dentro del array no rompen', S.condicion([null, linea('pintura', 'bueno')]).puntuacion === 100);
ok('la forma del resultado tiene todos los campos', J(Object.keys(c1).sort()) === J(['aplicables', 'banda', 'bueno', 'completo', 'error', 'evaluados', 'malo', 'na', 'puntuacion', 'regular']), J(Object.keys(c1)));
ok('la puntuación es exacta (enteros): 1 Bueno + 2 Regular = 4/6 = 66.7', conMarcas(1, 2, 0).puntuacion === 66.7, conMarcas(1, 2, 0).puntuacion);
ok('2 Bueno + 1 Regular = 5/6 = 83.3', conMarcas(2, 1, 0).puntuacion === 83.3, conMarcas(2, 1, 0).puntuacion);

console.log('5. Banderas: peligro, seguridad y coherencia con el estado general');
var b0 = S.banderas({ estado_general: 'Bueno' }, lineas(todas('bueno')));
ok('peligro = null en v3a (dato del formulario v5)', b0.peligro === null, J(b0));
ok('sin Malo: seguridad vacía, sin coherencia', J(b0.seguridad) === '[]' && b0.coherencia === null, J(b0));
var mSeg = todas('bueno'); mSeg.piscina = 'malo'; mSeg.cerraduras = 'malo'; mSeg.pintura = 'malo'; mSeg.barandillas = 'regular';
var bSeg = S.banderas({ estado_general: 'Bueno' }, lineas(mSeg));
ok('seguridad: solo las claves de seguridad en Malo, en el orden de elementosSeguridad()', J(bSeg.seguridad) === J(['cerraduras', 'piscina']), J(bSeg));
ok('general Bueno con algún Malo -> bueno_con_malo', bSeg.coherencia === 'bueno_con_malo', J(bSeg));
ok('general Malo con todo lo evaluado en Bueno -> malo_todo_bueno', S.banderas({ estado_general: 'Malo' }, lineas(m5)).coherencia === 'malo_todo_bueno');
ok('general Malo sin nada evaluado -> sin bandera de coherencia', S.banderas({ estado_general: 'Malo' }, lineas(todas(''))).coherencia === null);
ok('general Regular con Malo -> sin bandera de coherencia', S.banderas({ estado_general: 'Regular' }, lineas(mSeg)).coherencia === null);
ok('general en minúsculas o en la fila "casa" (general) también cuenta', S.banderas({ general: 'bueno' }, lineas(mSeg)).coherencia === 'bueno_con_malo' && S.banderas({ estado_general: ' bueno ' }, lineas(mSeg)).coherencia === 'bueno_con_malo');
ok('informe null o sin estado general: seguridad sí, coherencia no', (function () { var b = S.banderas(null, lineas(mSeg)); return J(b.seguridad) === J(['cerraduras', 'piscina']) && b.coherencia === null && b.peligro === null; })());
ok('la bandera de seguridad se ve aunque haya error de datos (clave duplicada)', J(S.banderas({}, [linea('piscina', 'malo'), linea('piscina', 'bueno')]).seguridad) === J(['piscina']));

console.log('6. Actuaciones: resumen + estancias, sin duplicados por texto exacto, gana la prioridad más alta');
var lA = [
  { seccion: 'resumen', clave: 'accion_2', orden: 2, texto_1: 'Pintar fachada', texto_2: 'Desconchada', prioridad: 'Baja' },
  { seccion: 'resumen', clave: 'accion_1', orden: 1, texto_1: 'Cambiar colchones', texto_2: 'Hundidos', prioridad: 'Media' },
  { seccion: 'estancia', clave: 'dormitorio_principal', orden: 3, texto_1: 'Cambiar colchones', texto_2: 'Comprar dos', prioridad: 'Alta' },
  { seccion: 'resumen', clave: 'accion_3', orden: 3, texto_1: 'pintar fachada', texto_2: '', prioridad: 'Alta' },
  { seccion: 'resumen', clave: 'accion_4', orden: 4, texto_1: '   ', texto_2: 'Motivo sin actuación', prioridad: 'Alta' },
  { seccion: 'estancia', clave: 'bano_1', orden: 5, texto_1: 'Grifo gotea', texto_2: '', prioridad: '' },
  { seccion: 'estancia', clave: 'otra_1', orden: 8, texto_1: 'Lavadero: Puerta rota', texto_2: '', prioridad: 'Medio' },
  { seccion: 'huesped', clave: 'comentario_1', orden: 1, texto_1: 'Pintar fachada', texto_2: '', prioridad: 'Alta' },
  { seccion: 'interior', clave: 'pintura', orden: 1, estado: 'Malo', texto_1: 'Pintar fachada', prioridad: 'Alta' }
];
var aA = S.acciones(lA);
var por = {}; aA.forEach(function (a) { por[a.accion] = a; });
ok('5 actuaciones distintas (mayúsculas distinguen; filas vacías, huésped y elementos fuera)', aA.length === 5, J(aA.map(function (a) { return a.accion; })));
ok('"Cambiar colchones": Media en resumen + Alta en estancia -> Alta, dos fuentes', por['Cambiar colchones'] && por['Cambiar colchones'].prioridad === 'Alta' && por['Cambiar colchones'].fuentes.length === 2, J(por['Cambiar colchones']));
ok('el motivo del resumen gana (texto_2); la estancia da su nombre si el resumen no tiene', por['Cambiar colchones'] && por['Cambiar colchones'].motivo === 'Hundidos', J(por['Cambiar colchones']));
ok('"Pintar fachada" y "pintar fachada" son dos (mayúsculas cuentan)', por['Pintar fachada'] && por['pintar fachada'] && por['Pintar fachada'].prioridad === 'Baja' && por['pintar fachada'].prioridad === 'Alta');
ok('estancia fija: motivo = nombre de la estancia (Baño 1), sin prioridad = ""', por['Grifo gotea'] && por['Grifo gotea'].motivo === 'Baño 1' && por['Grifo gotea'].prioridad === '', J(por['Grifo gotea']));
ok('estancia añadida (otra_N): texto = la incidencia, motivo = el nombre escrito; "Medio" guardado cuenta como Media', por['Puerta rota'] && por['Puerta rota'].motivo === 'Lavadero' && por['Puerta rota'].prioridad === 'Media', J(aA));
ok('prioridad para ver: Alto / Medio / Bajo / ""', por['Cambiar colchones'] && por['Cambiar colchones'].prioridadVer === 'Alto' && por['Puerta rota'].prioridadVer === 'Medio' && por['Pintar fachada'].prioridadVer === 'Bajo' && por['Grifo gotea'].prioridadVer === '');
ok('coste = null (sin datos: formulario v5)', aA.every(function (a) { return a.coste === null; }));
ok('orden: Alta, Media, Baja, sin prioridad; dentro, resumen antes que estancia y por orden', J(aA.map(function (a) { return a.accion; })) === J(['Cambiar colchones', 'pintar fachada', 'Puerta rota', 'Pintar fachada', 'Grifo gotea']), J(aA.map(function (a) { return a.accion; })));
ok('fuentes con orden numérico', por['Cambiar colchones'] && J(por['Cambiar colchones'].fuentes) === J([{ seccion: 'resumen', clave: 'accion_1', orden: 1 }, { seccion: 'estancia', clave: 'dormitorio_principal', orden: 3 }]));
ok('forma de cada actuación', aA[0] && J(Object.keys(aA[0]).sort()) === J(['accion', 'coste', 'fuentes', 'motivo', 'prioridad', 'prioridadVer']), J(aA[0] && Object.keys(aA[0])));
ok('otra_N sin ": " -> texto completo, motivo "Otra estancia N"', (function () { var a = S.acciones([{ seccion: 'estancia', clave: 'otra_2', orden: 9, texto_1: 'Humedad en el techo', prioridad: '' }]); return a.length === 1 && a[0].accion === 'Humedad en el techo' && a[0].motivo === 'Otra estancia 2'; })(), J(S.acciones([{ seccion: 'estancia', clave: 'otra_2', orden: 9, texto_1: 'Humedad en el techo' }])));
ok('otra_N con ": " y sin nombre -> motivo "Otra estancia N"', (function () { var a = S.acciones([{ seccion: 'estancia', clave: 'otra_1', orden: 8, texto_1: ': Grieta' }]); return a.length === 1 && a[0].accion === 'Grieta' && a[0].motivo === 'Otra estancia 1'; })());
ok('otra_N con nombre y sin incidencia -> no es actuación', S.acciones([{ seccion: 'estancia', clave: 'otra_1', orden: 8, texto_1: 'Lavadero: ' }]).length === 0);
ok('sin líneas, null o líneas null -> []', J(S.acciones([])) === '[]' && J(S.acciones(null)) === '[]' && J(S.acciones([null])) === '[]');
ok('una prioridad desconocida cuenta como sin prioridad', (function () { var a = S.acciones([{ seccion: 'resumen', clave: 'accion_1', orden: 1, texto_1: 'X', prioridad: 'Urgente' }]); return a[0].prioridad === '' && a[0].prioridadVer === ''; })());

console.log('7. Comparar dos temporadas (solo elementos evaluados en las dos)');
var prev = todas('bueno'); prev.pintura = 'regular'; prev.piscina = 'malo'; prev.wifi_tv = ''; prev.barbacoa = 'na';
var act = todas('bueno'); act.pintura = 'regular'; act.piscina = 'bueno'; act.colchones = 'malo'; delete act.menaje;
var cmp = S.comparar(lineas(prev), lineas(act));
ok('n = claves evaluadas en las dos (26 - wifi_tv - barbacoa - menaje = 23)', cmp.n === 23, J(cmp));
ok('cambios: piscina malo -> bueno y colchones bueno -> malo, en el orden de los elementos', J(cmp.cambios) === J([{ clave: 'colchones', de: 'bueno', a: 'malo' }, { clave: 'piscina', de: 'malo', a: 'bueno' }]), J(cmp.cambios));
ok('una clave sin cambio no está en cambios', !cmp.cambios.some(function (c) { return c.clave === 'pintura'; }));
ok('repetidos: Regular o Malo en las dos -> [pintura]', J(cmp.repetidos) === J(['pintura']), J(cmp.repetidos));
ok('puntuaciones sobre las mismas 23 claves: A = (2*21+1)/46, B = (2*21+1)/46', cmp.puntuacionA === S.redondear1(100 * 43 / 46) && cmp.puntuacionB === S.redondear1(100 * 43 / 46) && cmp.puntuacionA === 93.5, J(cmp));
var igual = S.comparar(lineas(todas('bueno')), lineas(todas('bueno')));
ok('dos temporadas iguales: n 26, sin cambios, sin repetidos, 100 y 100', igual.n === 26 && igual.cambios.length === 0 && igual.repetidos.length === 0 && igual.puntuacionA === 100 && igual.puntuacionB === 100, J(igual));
var vacio = S.comparar([], lineas(todas('bueno')));
ok('sin temporada anterior: n 0, puntuaciones null', vacio.n === 0 && vacio.puntuacionA === null && vacio.puntuacionB === null && vacio.cambios.length === 0, J(vacio));
var cmpDup = S.comparar([linea('pintura', 'bueno'), linea('pintura', 'malo')], lineas(todas('bueno')));
ok('error de datos en una de las dos: n 0, null, error "datos"', cmpDup.n === 0 && cmpDup.puntuacionA === null && cmpDup.error === 'datos', J(cmpDup));
ok('forma del resultado', J(Object.keys(igual).sort()) === J(['cambios', 'error', 'n', 'puntuacionA', 'puntuacionB', 'repetidos']), J(Object.keys(igual)));

console.log('8. El script en el navegador: window.InformeScore, sin red ni DOM');
var SRC = fs.readFileSync(P, 'utf8');
var win = {}, wctx = { window: win };
var r8 = safe(function () { vm.runInNewContext(SRC, wctx); return true; });
ok('se ejecuta en un contexto con window y sin module', r8 === true, r8 && r8.message);
ok('define window.InformeScore con las siete funciones', win.InformeScore && ['elementosDef', 'elementosSeguridad', 'condicion', 'banderas', 'acciones', 'comparar', 'redondear1'].every(function (n) { return typeof win.InformeScore[n] === 'function'; }));
ok('window.InformeScore calcula igual (caso 3)', win.InformeScore && win.InformeScore.condicion(l3).puntuacion === 96.2);
var sctx = {};
ok('sin window (vm sin nada): define InformeScore en el global del contexto', safe(function () { vm.runInNewContext(SRC, sctx); return true; }) === true && !!sctx.InformeScore);
ok('no usa fetch, XMLHttpRequest, document ni localStorage', !/\bfetch\s*\(|XMLHttpRequest|\bdocument\.|localStorage|sessionStorage/.test(SRC));
ok('no usa import, export ni require', !/^\s*(import|export)\s/m.test(SRC) && !/\brequire\s*\(/.test(SRC));

fin();
