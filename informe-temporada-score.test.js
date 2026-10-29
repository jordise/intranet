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
  return Object.keys(marcas).map(function (k) { return marcas[k] === 'na' ? linea(k, '', { na: true, na_motivo: 'no hay' }) : linea(k, marcas[k]); });
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
ok('79.95 -> 80', S.redondear1(79.95) === 80, S.redondear1(79.95));
ok('0.15 -> 0.2 y 1.15 -> 1.2 (×10 en float da 1.4999… y 11.4999…)', S.redondear1(0.15) === 0.2 && S.redondear1(1.15) === 1.2, J([S.redondear1(0.15), S.redondear1(1.15)]));
ok('1.05 -> 1.1',S.redondear1(1.05) === 1.1, S.redondear1(1.05));
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
ok('75 es ámbar, 80 es verde (la banda usa el decimal guardado)', (function () { var a = conMarcas(3, 2, 0), b = conMarcas(3, 0, 1); return a.puntuacion === 80 && a.banda === 'verde' && b.puntuacion === 75 && b.banda === 'ambar'; })(), J([conMarcas(3, 2, 0), conMarcas(3, 0, 1)]));
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
ok('na verdadero (true, 1, "1", "true", "Sí") es N/A', [true, 1, '1', 'true', 'Sí'].every(function (v) { var c = S.condicion([linea('pintura', '', { na: v, na_motivo: 'no hay' })]); return c.na === 1 && c.aplicables === 25; }));
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
ok('6 actuaciones distintas (mayúsculas distinguen; huésped y elementos fuera; ronda 2: el resumen con solo motivo y prioridad cuenta como "Sin texto (Resumen 4)")', aA.length === 6, J(aA.map(function (a) { return a.accion; })));
ok('"Cambiar colchones": Media en resumen + Alta en estancia -> Alta, dos fuentes', por['Cambiar colchones'] && por['Cambiar colchones'].prioridad === 'Alta' && por['Cambiar colchones'].fuentes.length === 2, J(por['Cambiar colchones']));
ok('el motivo del resumen gana (texto_2); la estancia da su nombre si el resumen no tiene', por['Cambiar colchones'] && por['Cambiar colchones'].motivo === 'Hundidos', J(por['Cambiar colchones']));
ok('"Pintar fachada" y "pintar fachada" son dos (mayúsculas cuentan)', por['Pintar fachada'] && por['pintar fachada'] && por['Pintar fachada'].prioridad === 'Baja' && por['pintar fachada'].prioridad === 'Alta');
ok('estancia fija: motivo = nombre de la estancia (Baño 1), sin prioridad = ""', por['Grifo gotea'] && por['Grifo gotea'].motivo === 'Baño 1' && por['Grifo gotea'].prioridad === '', J(por['Grifo gotea']));
ok('estancia añadida (otra_N): texto = la incidencia, motivo = el nombre escrito; "Medio" guardado cuenta como Media', por['Puerta rota'] && por['Puerta rota'].motivo === 'Lavadero' && por['Puerta rota'].prioridad === 'Media', J(aA));
ok('prioridad para ver: Alto / Medio / Bajo / ""', por['Cambiar colchones'] && por['Cambiar colchones'].prioridadVer === 'Alto' && por['Puerta rota'].prioridadVer === 'Medio' && por['Pintar fachada'].prioridadVer === 'Bajo' && por['Grifo gotea'].prioridadVer === '');
ok('coste = null (sin datos: formulario v5)', aA.every(function (a) { return a.coste === null; }));
ok('orden: Alta, Media, Baja, sin prioridad; dentro, resumen antes que estancia y por orden', J(aA.map(function (a) { return a.accion; })) === J(['Cambiar colchones', 'pintar fachada', 'Sin texto (Resumen 4)', 'Puerta rota', 'Pintar fachada', 'Grifo gotea']), J(aA.map(function (a) { return a.accion; })));
ok('fuentes con orden numérico', por['Cambiar colchones'] && J(por['Cambiar colchones'].fuentes) === J([{ seccion: 'resumen', clave: 'accion_1', orden: 1 }, { seccion: 'estancia', clave: 'dormitorio_principal', orden: 3 }]));
ok('forma de cada actuación', aA[0] && J(Object.keys(aA[0]).sort()) === J(['accion', 'coste', 'fuentes', 'motivo', 'prioridad', 'prioridadVer']), J(aA[0] && Object.keys(aA[0])));
ok('otra_N sin ": " -> texto completo, motivo "Otra estancia N"', (function () { var a = S.acciones([{ seccion: 'estancia', clave: 'otra_2', orden: 9, texto_1: 'Humedad en el techo', prioridad: '' }]); return a.length === 1 && a[0].accion === 'Humedad en el techo' && a[0].motivo === 'Otra estancia 2'; })(), J(S.acciones([{ seccion: 'estancia', clave: 'otra_2', orden: 9, texto_1: 'Humedad en el techo' }])));
ok('otra_N con ": " y sin nombre -> motivo "Otra estancia N"', (function () { var a = S.acciones([{ seccion: 'estancia', clave: 'otra_1', orden: 8, texto_1: ': Grieta' }]); return a.length === 1 && a[0].accion === 'Grieta' && a[0].motivo === 'Otra estancia 1'; })());
ok('otra_N con nombre y sin incidencia -> actuación "Sin texto (Lavadero)" (ronda 2, decisión de bro)', (function () { var a = S.acciones([{ seccion: 'estancia', clave: 'otra_1', orden: 8, texto_1: 'Lavadero: ' }]); return a.length === 1 && a[0].accion === 'Sin texto (Lavadero)' && a[0].motivo === 'Lavadero'; })());
var estFijas = fctx.seccionesDef().filter(function (s) { return s.id === 'estancia'; })[0].claves;
ok('cada estancia fija del formulario da su nombre como motivo (las 7 de seccionesDef())', estFijas.length === 7 && estFijas.every(function (c, i) {
  var a = S.acciones([{ seccion: 'estancia', clave: c[0], orden: i + 1, texto_1: 'Incidencia ' + i }]); return a.length === 1 && a[0].motivo === c[1];
}), J(estFijas));
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

console.log('9. Ronda de arreglos 1: estancias con solo la acción o la prioridad, lector compartido de marcas, N/A y comentarios');
function est(clave, t1, t2, pri, orden) { return { informe_id: 7, seccion: 'estancia', clave: clave, orden: orden || 1, texto_1: t1, texto_2: t2, prioridad: pri }; }
var a9 = S.acciones([est('cocina', '', 'Cambiar campana', 'Alta', 2)]);
ok('estancia con solo "Acción recomendada" = una actuación Alta con ese texto (motivo = la estancia)', a9.length === 1 && a9[0].accion === 'Cambiar campana' && a9[0].prioridad === 'Alta' && a9[0].motivo === 'Cocina', J(a9));
var a9b = S.acciones([est('salon', '', '', 'Media', 1)]);
ok('estancia con solo la prioridad = una actuación "Sin texto (Salón / comedor)" Media', a9b.length === 1 && a9b[0].accion === 'Sin texto (Salón / comedor)' && a9b[0].prioridad === 'Media', J(a9b));
ok('estancia vacía (sin incidencia, acción ni prioridad) no es actuación', S.acciones([est('salon', '', '', '')]).length === 0);
var a9c = S.acciones([est('otra_1', 'Lavadero: ', 'Cambiar grifo', '', 8)]);
ok('otra_N con nombre y solo la acción = actuación con la acción, motivo = el nombre', a9c.length === 1 && a9c[0].accion === 'Cambiar grifo' && a9c[0].motivo === 'Lavadero', J(a9c));
var a9d = S.acciones([{ informe_id: 7, seccion: 'resumen', clave: 'accion_1', orden: 1, texto_1: 'Cambiar campana', texto_2: 'No extrae', prioridad: 'Baja' }, est('cocina', '', 'Cambiar campana', 'Alta', 2)]);
ok('la acción de una estancia se une al resumen con el mismo texto: una actuación Alta, dos fuentes', a9d.length === 1 && a9d[0].prioridad === 'Alta' && a9d[0].fuentes.length === 2 && a9d[0].motivo === 'No extrae', J(a9d));
var a9e = S.acciones([est('cocina', 'Campana no extrae', 'Cambiar campana', 'Alta', 2)]);
ok('con incidencia y acción: el texto de la actuación sigue siendo la incidencia (texto_1)', a9e.length === 1 && a9e[0].accion === 'Campana no extrae', J(a9e));
ok('expone marcas, esNa y esComentario', typeof S.marcas === 'function' && typeof S.esNa === 'function' && typeof S.esComentario === 'function');
ok('esNa estricto: true, 1, "1", "true", "sí", "yes"; nunca "no", "0", "x", ""', typeof S.esNa === 'function' && [true, 1, '1', 'true', 'sí', 'Si', 'yes'].every(function (v) { return S.esNa({ na: v }); }) && ![false, 0, '0', 'no', 'x', '', null].some(function (v) { return S.esNa({ na: v }); }));
var dupL = [linea('pintura', 'bueno', { linea_id: 9, texto_1: 'primera' }), linea('pintura', 'regular', { linea_id: 3, texto_1: 'segunda' }), linea('sofas', '', { na: 'sí', na_motivo: 'no hay' }), linea('menaje', 'x')];
var mk9 = safe(function () { return S.marcas(dupL); }) || { porClave: {} };
var pc9 = mk9.porClave || {};
ok('marcas: fila repetida = la regla de la puntuación (gana la última en orden; error "datos")', pc9.pintura && pc9.pintura.marca === 'regular' && pc9.pintura.linea.texto_1 === 'segunda' && mk9.error === 'datos', J(pc9.pintura));
ok('marcas: N/A sale como "na"; una marca no válida como ""; sin línea = "" y linea null', pc9.sofas && pc9.sofas.marca === 'na' && pc9.menaje.marca === '' && pc9.wifi_tv.marca === '' && pc9.wifi_tv.linea === null, J([pc9.sofas, pc9.menaje]));
ok('marcas y condicion cuentan lo mismo', (function () { var c = S.condicion(dupL), n = { bueno: 0, regular: 0, malo: 0, na: 0 }; Object.keys(pc9).forEach(function (k) { if (n[pc9[k].marca] !== undefined) n[pc9[k].marca]++; }); return Object.keys(pc9).length === 26 && n.bueno === c.bueno && n.regular === c.regular && n.malo === c.malo && n.na === c.na; })());
ok('esComentario: huésped con texto_1 o con solo texto_2; nunca vacío ni de otra sección', typeof S.esComentario === 'function' && S.esComentario({ seccion: 'huesped', texto_1: 'Ruido' }) && S.esComentario({ seccion: 'huesped', texto_1: ' ', texto_2: 'Poner cortinas' }) && !S.esComentario({ seccion: 'huesped', texto_1: '', texto_2: '' }) && !S.esComentario({ seccion: 'resumen', texto_1: 'x' }));

console.log('10. Ronda de arreglos 2: el resumen con la regla de las estancias (texto_1, texto_2 o prioridad); estancia añadida con solo el nombre; fila repetida = la última en orden');
function res(t1, t2, pri, orden, clave) { return { informe_id: 7, seccion: 'resumen', clave: clave || 'accion_' + (orden || 1), orden: orden || 1, texto_1: t1, texto_2: t2, prioridad: pri }; }
var a10 = S.acciones([res('', 'Riesgo de caída en la escalera', 'Alta', 2)]);
ok('resumen con motivo y prioridad, sin actuación = una actuación Alta "Sin texto (Resumen 2)", motivo = el motivo', a10.length === 1 && a10[0].accion === 'Sin texto (Resumen 2)' && a10[0].prioridad === 'Alta' && a10[0].motivo === 'Riesgo de caída en la escalera', J(a10));
var a10b = S.acciones([res('  ', '', 'Media', 3)]);
ok('resumen con solo la prioridad = "Sin texto (Resumen 3)" Media, sin motivo', a10b.length === 1 && a10b[0].accion === 'Sin texto (Resumen 3)' && a10b[0].prioridad === 'Media' && a10b[0].motivo === '', J(a10b));
var a10c = S.acciones([res('', 'Pared con grietas', '', 4)]);
ok('resumen con solo el motivo = "Sin texto (Resumen 4)" sin prioridad', a10c.length === 1 && a10c[0].accion === 'Sin texto (Resumen 4)' && a10c[0].prioridad === '', J(a10c));
ok('resumen vacío (sin actuación, motivo ni prioridad) no es actuación', S.acciones([res('', '  ', '', 5)]).length === 0);
var a10d = S.acciones([{ informe_id: 7, seccion: 'resumen', clave: 'accion_6', texto_1: '', texto_2: 'Sin orden', prioridad: 'Baja' }]);
ok('resumen sin orden: el número sale de la clave (accion_6 -> "Sin texto (Resumen 6)")', a10d.length === 1 && a10d[0].accion === 'Sin texto (Resumen 6)', J(a10d));
ok('resumen con actuación: el texto sigue siendo texto_1 y el motivo texto_2', (function () { var a = S.acciones([res('Cambiar barandilla', 'Floja', 'Alta', 1)]); return a.length === 1 && a[0].accion === 'Cambiar barandilla' && a[0].motivo === 'Floja'; })());
var a10e = S.acciones([est('otra_1', 'Garaje:', '', '', 8)]);
ok('estancia añadida con solo el nombre ("Garaje:") = "Sin texto (Garaje)" sin prioridad', a10e.length === 1 && a10e[0].accion === 'Sin texto (Garaje)' && a10e[0].motivo === 'Garaje' && a10e[0].prioridad === '', J(a10e));
ok('estancia añadida vacía (texto_1 en blanco, sin acción ni prioridad) no es actuación', S.acciones([est('otra_2', '  ', '', '', 9)]).length === 0);
var mk10 = S.marcas([linea('pintura', 'malo', { texto_1: 'primera' }), linea('pintura', '', { texto_1: 'segunda, en blanco' })]);
ok('marcas: fila repetida con la última en blanco = la última gana (marca "", su línea) y error "datos"', mk10.porClave.pintura.marca === '' && mk10.porClave.pintura.linea.texto_1 === 'segunda, en blanco' && mk10.error === 'datos', J(mk10.porClave.pintura));
var c10 = S.condicion([linea('pintura', 'malo'), linea('pintura', ''), linea('colchones', 'bueno')]);
ok('condicion cuenta lo mismo que marcas con la última en blanco (pintura no cuenta; sin puntuación)', c10.malo === 0 && c10.bueno === 1 && c10.evaluados === 1 && c10.puntuacion === null && c10.error === 'datos', J(c10));
ok('fila repetida con la última N/A = N/A', S.marcas([linea('sofas', 'regular'), linea('sofas', '', { na: true, na_motivo: 'no hay' })]).porClave.sofas.marca === 'na');


console.log('11. Formulario v5 (job informe-form-v5-v3b, lane D): peligro, banda de coste, fotos con referencia y dato v5');
['costeNorm', 'costeDistinto', 'datosV5', 'refsFotos', 'etiquetaRef'].forEach(function (n) { ok('expone ' + n, typeof S[n] === 'function'); });
ok('costeNorm: las cinco bandas de CASPIO-COLUMNS.md tal cual; blanco o texto desconocido = ""', S.costeNorm && J(['desconocido', '<500', '500-2000', '2000-10000', '10000+', ' 500-2000 ', 'DESCONOCIDO', '', null, '0', 'barato'].map(S.costeNorm)) === J(['desconocido', '<500', '500-2000', '2000-10000', '10000+', '500-2000', 'desconocido', '', '', '', '']));
function acc(t1, pri, coste, orden, sec, clave) { var l = { informe_id: 7, seccion: sec || 'resumen', clave: clave || 'accion_' + orden, orden: orden, texto_1: t1, texto_2: '', prioridad: pri }; if (coste !== undefined) l.coste = coste; return l; }
var a11 = S.acciones([acc('Pintar fachada', 'Media', '2000-10000', 1), acc('Cambiar termo', 'Alta', '', 2), acc('Cambiar termo', 'Media', '<500', 5, 'estancia', 'bano_1'), acc('Revisar persiana', 'Baja', 'desconocido', 3)]);
var p11 = {}; a11.forEach(function (a) { p11[a.accion] = a; });
ok('coste de una actuación = su banda ("2000-10000"); "desconocido" se guarda; sin banda = null', p11['Pintar fachada'].coste === '2000-10000' && p11['Revisar persiana'].coste === 'desconocido', J(a11));
ok('unidas por el texto: la banda de la fuente que la tiene ("<500"), la otra en blanco no la borra', p11['Cambiar termo'].coste === '<500' && p11['Cambiar termo'].fuentes.length === 2, J(p11['Cambiar termo']));
ok('cada fuente con banda lleva su coste; la fuente en blanco no lleva la clave (forma de job uno intacta)', J(p11['Cambiar termo'].fuentes) === J([{ seccion: 'resumen', clave: 'accion_2', orden: 2 }, { seccion: 'estancia', clave: 'bano_1', orden: 5, coste: '<500' }]), J(p11['Cambiar termo'].fuentes));
ok('la forma de cada actuación no cambia (seis claves)', J(Object.keys(a11[0]).sort()) === J(['accion', 'coste', 'fuentes', 'motivo', 'prioridad', 'prioridadVer']));
var a11b = S.acciones([acc('Cambiar toldo', 'Media', '500-2000', 1), acc('Cambiar toldo', 'Alta', '2000-10000', 4, 'estancia', 'exterior_piscina')]);
ok('dos bandas distintas al unir: gana la más alta y costeDistinto = true', a11b.length === 1 && a11b[0].coste === '2000-10000' && S.costeDistinto(a11b[0]) === true, J(a11b));
var a11c = S.acciones([acc('Cambiar toldo', 'Media', '500-2000', 1), acc('Cambiar toldo', 'Alta', '500-2000', 4, 'estancia', 'exterior_piscina')]);
ok('la misma banda en las dos fuentes: no es coste distinto', S.costeDistinto(a11c[0]) === false && a11c[0].coste === '500-2000');
var a11d = S.acciones([acc('Cambiar toldo', 'Media', 'desconocido', 1), acc('Cambiar toldo', 'Alta', '10000+', 4, 'estancia', 'exterior_piscina')]);
ok('"desconocido" y una banda: gana la banda y no es coste distinto (desconocido no contradice)', a11d[0].coste === '10000+' && S.costeDistinto(a11d[0]) === false, J(a11d));
ok('costeDistinto de una actuación sin fuentes o null = false', S.costeDistinto(null) === false && S.costeDistinto({ fuentes: [] }) === false);

var EV5 = lineas(todas('bueno'));
EV5.forEach(function (l) { l.peligro = false; l.na_motivo = ''; l.peligro_texto = ''; });
ok('datosV5: líneas de antes de la v5 (peligro false, campos en blanco) y cabecera sin revisión = false', S.datosV5({ estado_general: 'Bueno', revision: null, historial: '' }, EV5) === false);
ok('datosV5: revisión ≥ 1, historial o enviado_por en la cabecera = true', S.datosV5({ revision: 1 }, []) === true && S.datosV5({ revision: '2' }, []) === true && S.datosV5({ historial: '29/10/2026 10:00 enviado por Kike (rev 1)' }, []) === true && S.datosV5({ enviado_por: 'Kike' }, []) === true && S.datosV5({ revision: 0 }, []) === false);
ok('datosV5: una línea con N/A, peligro, coste o foto con referencia = true', ['na', 'peligro', 'coste', 'clave_ref', 'na_motivo', 'peligro_texto'].every(function (k) { var l = linea('pintura', ''); l[k] = k === 'na' || k === 'peligro' ? true : k === 'coste' ? '<500' : 'x'; return S.datosV5(null, [l]) === true; }));
var bP = S.banderas({ estado_general: 'Bueno', revision: 1 }, [linea('pintura', 'bueno', { peligro: true, peligro_texto: 'Cable pelado junto a la ducha' }), linea('pavimentos', 'regular', { peligro: 'true', peligro_texto: ' Escalón hundido ' }), linea('colchones', 'bueno', { peligro: false, peligro_texto: 'texto viejo' })]);
ok('banderas: peligro = true y la lista de peligros en el orden de los 26 (clave, texto)', bP.peligro === true && J(bP.peligros) === J([{ clave: 'pintura', texto: 'Cable pelado junto a la ducha' }, { clave: 'pavimentos', texto: 'Escalón hundido' }]), J(bP));
ok('banderas: un peligro también en una fila Bueno (el tick vale con cualquier marca)', bP.peligros[0].clave === 'pintura');
var bP0 = S.banderas({ estado_general: 'Bueno', revision: 1 }, EV5);
ok('banderas: informe v5 sin peligros = false (no desconocido), lista vacía', bP0.peligro === false && J(bP0.peligros) === '[]', J(bP0));
var bPn = S.banderas({ estado_general: 'Bueno' }, EV5);
ok('banderas: informe de antes de la v5 = null (dato desconocido), lista vacía', bPn.peligro === null && J(bPn.peligros) === '[]', J(bPn));
ok('banderas: peligro estricto: "x", "no", 0 no son peligro', S.banderas({ revision: 1 }, [linea('pintura', 'bueno', { peligro: 'x' }), linea('sofas', 'bueno', { peligro: 'no' }), linea('menaje', 'bueno', { peligro: 0 })]).peligro === false);
ok('banderas: fila repetida = la última en orden decide el peligro', S.banderas({ revision: 1 }, [linea('pintura', 'bueno', { peligro: true, peligro_texto: 'a' }), linea('pintura', 'bueno', { peligro: false })]).peligro === false
  && S.banderas({ revision: 1 }, [linea('pintura', 'bueno', { peligro: false }), linea('pintura', 'bueno', { peligro: true, peligro_texto: 'b' })]).peligros[0].texto === 'b');
ok('banderas: un peligro sin texto (no debería pasar el Enviar) sale con texto ""', S.banderas(null, [linea('pintura', 'malo', { peligro: 1 })]).peligro === true && S.banderas(null, [linea('pintura', 'malo', { peligro: 1 })]).peligros[0].texto === '');
ok('banderas: el tick fuera de los 26 (resumen) no es peligro', S.banderas({ revision: 1 }, [{ informe_id: 7, seccion: 'resumen', clave: 'accion_1', peligro: true, peligro_texto: 'x' }]).peligro === false);

function foto(n, ref, url, pie) { return { informe_id: 7, seccion: 'foto', clave: 'foto_' + n, orden: n, foto_url: url === undefined ? 'https://x.invalid/' + n + '.jpg' : url, texto_1: pie || '', clave_ref: ref }; }
var rf = S.refsFotos([foto(1, 'piscina', undefined, 'Gresite roto'), foto(2, ''), foto(3, 'cocina'), foto(4, 'piscina'), foto(5, 'otra'), foto(6, 'piscina', '')]);
ok('refsFotos: clave_ref -> fotos (clave, foto_url, pie) en orden; sin url o sin referencia fuera', J(Object.keys(rf).sort()) === J(['cocina', 'otra', 'piscina']) && J(rf.piscina.map(function (f) { return f.clave; })) === J(['foto_1', 'foto_4']) && rf.piscina[0].pie === 'Gresite roto' && rf.piscina[0].foto_url === 'https://x.invalid/1.jpg', J(rf));
ok('refsFotos: sin líneas = {}', J(S.refsFotos(null)) === '{}');
ok('etiquetaRef: elemento = su etiqueta, estancia = su nombre, otra = "Otra", desconocida = la clave', S.etiquetaRef('piscina') === EL.filter(function (e) { return e.clave === 'piscina'; })[0].label && S.etiquetaRef('cocina') === 'Cocina' && S.etiquetaRef('otra') === 'Otra' && S.etiquetaRef('garaje') === 'garaje' && S.etiquetaRef('') === '');
ok('esNa y peligro usan la misma regla estricta (esSi)', typeof S.esSi === 'function' && S.esSi(true) && S.esSi('Sí') && !S.esSi('x') && !S.esSi(false));


console.log('12. Ronda de arreglos 1 del job informe-form-v5-v3b (revisor B, punto 4): refsFotos solo da fotos con dirección http(s)');
var rfJs = S.refsFotos([foto(1, 'piscina', 'javascript:alert(1)'), foto(2, 'piscina', ' JavaScript:alert(2)'), foto(3, 'piscina', 'data:text/html,x'), foto(4, 'piscina', '//x.invalid/4.jpg'),
  foto(5, 'piscina', 'http://x.invalid/5.jpg'), foto(6, 'cocina', ' HTTPS://x.invalid/6.jpg ')]);
ok('refsFotos: javascript:, data: y sin esquema fuera; http y https (mayúsculas también) dentro', J(Object.keys(rfJs).sort()) === J(['cocina', 'piscina']) && J(rfJs.piscina.map(function (f) { return f.clave; })) === J(['foto_5'])
  && rfJs.cocina[0].foto_url === 'HTTPS://x.invalid/6.jpg', J(rfJs));
ok('refsFotos: una casa con solo una foto javascript: no tiene referencias', J(S.refsFotos([foto(1, 'pintura', 'javascript:alert(1)')])) === '{}');

console.log('13. A1 (revisor A, punto 1): N/A sin motivo = sin dato (Consenso v2), no N/A');
var c25 = {}; CLAVES.forEach(function (k, i) { if (i < 25) c25[k] = 'bueno'; });
var l25 = lineas(c25).concat([linea(CLAVES[25], '', { na: true, na_motivo: '' })]);
var r25 = S.condicion(l25);
ok('25 Bueno + 1 N/A con motivo vacío -> provisional 25 de 26, 100.0, no completo', r25.evaluados === 25 && r25.aplicables === 26 && r25.na === 0 && r25.puntuacion === 100 && r25.completo === false, J(r25));
ok('N/A con motivo de solo espacios = sin dato', S.condicion([linea('pintura', '', { na: true, na_motivo: '   ' })]).na === 0);
ok('N/A sin motivo y con marca sigue siendo error "datos"', S.condicion([linea('pintura', 'bueno', { na: true })]).error === 'datos');
ok('marcas: N/A sin motivo sale como "" (sin dato), con su línea', S.marcas([linea('sofas', '', { na: true })]).porClave.sofas.marca === '' && !!S.marcas([linea('sofas', '', { na: true })]).porClave.sofas.linea);
ok('naValido: N/A + motivo = true; sin motivo = false; esNa sigue leyendo solo la casilla', S.naValido({ na: true, na_motivo: 'x' }) && !S.naValido({ na: true, na_motivo: '' }) && S.esNa({ na: true }));
ok('datosV5: un N/A sin motivo sigue siendo dato del formulario v5', S.datosV5({}, [linea('pintura', '', { na: true })]) === true);

fin();
