/* Pruebas de cuadro-comercial-data.js (Cuadro de mando comercial, cálculo puro).
   node cuadro-comercial-data.test.js   ·   también corre con node --test

   Como police-url.test.js: NO copia el código. Carga el archivo real con require y,
   además, en un vm con window (como lo carga el navegador). Sin red y sin datos reales:
   las filas y las villas son de mentira; los agentes llevan solo los seis nombres de pila
   del equipo comercial. */
var fs = require('fs'), vm = require('vm'), path = require('path');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c === true) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '  -> ' + e : '')); } }
function J(x) { return JSON.stringify(x); }

var FILE = path.join(__dirname, 'cuadro-comercial-data.js');
var S = fs.readFileSync(FILE, 'utf8');
var C = require(FILE);
var I = C._internals;

console.log('archivo y carga');
var ver = (S.match(/VERSIÓN ACTUAL: (v\d+)/) || [])[1];
ok('cabecera con versión (' + ver + ')', !!ver);
ok('HISTORIAL empieza por la misma versión', S.indexOf('/* HISTORIAL: ' + ver + ' ') > 0);
ok('VERSION del módulo coincide', 'v' + C.VERSION === ver);
var ctx = { window: {} };
vm.runInNewContext(S, ctx);
ok('en el navegador se publica en window.CuadroComercialData', !!(ctx.window.CuadroComercialData && typeof ctx.window.CuadroComercialData.buildDashboard === 'function'));
var code = S.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
ok('sin DOM ni red (document, fetch, XMLHttpRequest, localStorage)', !/\bdocument\.|\bfetch\(|XMLHttpRequest|localStorage|sessionStorage/.test(code));
ok('sin fecha del dispositivo (new Date() sin argumentos, Date.now)', !/new Date\(\)|Date\.now\(/.test(code));
var threw = false; try { C.buildDashboard({ today: '13/10/2026x' }); } catch (e) { threw = true; }
ok('today ilegible = error, no un cálculo con la fecha del dispositivo', threw);

console.log('fechas y semanas');
ok('parseFecha ISO con hora', I.parseFecha('2026-10-05T00:00:00') === '2026-10-05');
ok('parseFecha dd/mm/aaaa', I.parseFecha('5/10/2026') === '2026-10-05');
ok('parseFecha fecha imposible = null', I.parseFecha('2026-02-30') === null && I.parseFecha('xx') === null && I.parseFecha('') === null);
ok('lunes de un domingo = el lunes anterior', I.mondayOf('2026-10-11') === '2026-10-05');
ok('lunes de un lunes = el mismo día', I.mondayOf('2026-10-12') === '2026-10-12');
ok('ISO: lunes 30 dic 2024 = 2025-W01', I.isoWeekLabel('2024-12-30') === '2025-W01', I.isoWeekLabel('2024-12-30'));
ok('ISO: lunes 28 dic 2026 = 2026-W53 (2026 tiene 53 semanas)', I.isoWeekLabel('2026-12-28') === '2026-W53', I.isoWeekLabel('2026-12-28'));
ok('ISO: lunes 4 ene 2027 = 2027-W01', I.isoWeekLabel('2027-01-04') === '2027-W01');
ok('ISO: lunes 5 oct 2026 = 2026-W41', I.isoWeekLabel('2026-10-05') === '2026-W41');
ok('12 meses antes del 29 feb 2028 = 28 feb 2027', I.addMonthsDay('2028-02-29', -12) === '2027-02-28');
ok('fin de mes febrero 2028 = 29', I.monthEnd('2028-02') === '2028-02-29');
ok('años de "pendiente" 1111, 2999 y 0 = sin dato', I.anioValido(1111) === null && I.anioValido(2999) === null && I.anioValido(0) === null && I.anioValido('') === null && I.anioValido(2026) === 2026);
ok('num: vacío, null y texto = null, nunca 0', I.num({ a: '' }, 'a') === null && I.num({ a: null }, 'a') === null && I.num({}, 'a') === null && I.num({ a: 'x' }, 'a') === null && I.num({ a: '0' }, 'a') === 0);
ok('num: nombre de campo sin distinguir mayúsculas', I.num({ prosp_llamadas: 7 }, 'Prosp_Llamadas') === 7);

console.log('ventana de 13 semanas en el cambio de año');
var Y = C.buildDashboard({ today: '2027-01-06', weeklyRows: [], villas: [] });
ok('13 semanas', Y.equipo.weeks.length === 13, Y.equipo.weeks.length);
ok('primera = 2026-W42 (lunes 12 oct 2026)', Y.equipo.weeks[0] === '2026-W42' && Y.equipo.weekStarts[0] === '2026-10-12', Y.equipo.weeks[0] + ' ' + Y.equipo.weekStarts[0]);
ok('incluye 2026-W53 y acaba en 2027-W01', Y.equipo.weeks[11] === '2026-W53' && Y.equipo.weeks[12] === '2027-W01', J(Y.equipo.weeks.slice(10)));
ok('semana abierta = la de today', Y.equipo.openWeek === '2027-W01');
ok('semanas consecutivas de 7 días', Y.equipo.weekStarts.every(function (m, k, a) { return k === 0 || (Date.parse(m) - Date.parse(a[k - 1])) === 7 * 86400000; }));

/* ── Fixture semanal ── */
var USERS = [
  { UserID: 'GA1', Name: 'Gaelle', Role: 'sales', User_Status: true },
  { UserID: 'LU1', Name: 'Luciano', Role: 'sales', User_Status: true },
  { UserID: 'MA1', Name: 'Mari', Role: 'sales', User_Status: true },
  { UserID: 'SO1', Name: 'Soledad', Role: 'sales', User_Status: true },
  { UserID: 'TI1', Name: 'Tino', Role: 'sales', User_Status: true },
  { UserID: 'TM1', Name: 'Toni Moll', Role: 'sales', User_Status: 'false' }
];
function row(fecha, ag, extra) {
  var r = { Fecha: fecha, Agente: ag, Captacion_Inmobiliaria: 0, Captacion_Inmobiliaria_Exclusiva: 0, Visitas_Ventas: 0, Firma_Arras: 0, Firma_Notario: 0,
    Carteles: 0, Seguros: 0, Visita_Alquiler_Vacacional: 0, Captacion_Alquiler_Vacacional: 0, Captacion_Alquiler_LAU: 0, Alquiler_LAU: 0,
    Fincas_Actuales: null, Facturado_Ciu: null, Facturado_Mao: null, Prosp_Llamadas: null, Prosp_No_Contestan: null, Prosp_No_Interesado: null,
    Prosp_Otra_Agencia: null, Prosp_Seguimiento: null, Prosp_Cartas_Intenciones: null, Prosp_Contratos: null };
  Object.keys(extra || {}).forEach(function (k) { r[k] = extra[k]; });
  return r;
}
/* today = martes 13 oct 2026; ventana 2026-W30 (20 jul) … 2026-W42 (12 oct, abierta) */
var ROWS = [
  /* Gaelle: todas las semanas cerradas menos 2026-W40 (28 sep) = semana sin informe */
  row('2026-07-20', 'GA1', { Visitas_Ventas: 1 }),
  row('2026-07-27', 'GA1', { Visitas_Ventas: 1 }), row('2026-08-03', 'GA1', { Visitas_Ventas: 1 }), row('2026-08-10', 'GA1', { Visitas_Ventas: 1, Firma_Arras: 1 }),
  row('2026-08-17', 'GA1', { Visitas_Ventas: 1 }), row('2026-08-24', 'GA1', { Visitas_Ventas: 1 }), row('2026-08-31', 'GA1', { Visitas_Ventas: 1 }),
  row('2026-09-07', 'GA1', { Visitas_Ventas: 1, Firma_Notario: 1 }), row('2026-09-14', 'GA1', { Visitas_Ventas: 1 }), row('2026-09-21', 'GA1', { Visitas_Ventas: 1, Facturado_Mao: 20000, Fincas_Actuales: 28 }),
  row('2026-10-05', 'GA1', { Visitas_Ventas: 2, Visita_Alquiler_Vacacional: 1, Prosp_Llamadas: 30, Prosp_Cartas_Intenciones: 4, Prosp_Contratos: 1,
    Captacion_Inmobiliaria: 1, Captacion_Inmobiliaria_Exclusiva: 2, Facturado_Mao: 21234, Fincas_Actuales: 27 }),
  /* Mari: fila DUPLICADA en 2026-W41 (lunes 5 y viernes 9 oct): se suman; Fincas toma el mayor */
  row('2026-10-05', 'MA1', { Visitas_Ventas: 0, Prosp_Llamadas: 20, Fincas_Actuales: 70, Facturado_Ciu: 50000 }),
  row('2026-10-09', 'MA1', { Visitas_Ventas: 5, Prosp_Llamadas: 30, Prosp_Contratos: 0, Fincas_Actuales: 0, Facturado_Ciu: 0 }),
  row('2026-09-28', 'MA1', { Visitas_Ventas: 3, Facturado_Ciu: 48000 }),
  /* Soledad: muchas llamadas, pocas visitas: la clasificación no la sube */
  row('2026-10-05', 'SO1', { Visitas_Ventas: 1, Prosp_Llamadas: 200, Prosp_Contratos: 0 }),
  /* Tino: visitas 0 con llamadas → llamadas por visita null, nunca infinito */
  row('2026-10-05', 'TI1', { Visitas_Ventas: 0, Prosp_Llamadas: 12 }),
  /* Luciano: dos visitas, dos contratos */
  row('2026-10-05', 'LU1', { Visitas_Ventas: 2, Prosp_Llamadas: 10, Prosp_Contratos: 2, Prosp_Cartas_Intenciones: 0 }),
  /* el año anterior, el mismo mes: 3 captaciones */
  row('2025-10-06', 'GA1', { Captacion_Inmobiliaria: 3 }),
  /* fecha ilegible y fuera de la ventana */
  row('no-es-fecha', 'GA1', { Visitas_Ventas: 99 }),
  row('2026-07-13', 'GA1', { Visitas_Ventas: 99 })
];
var D = C.buildDashboard({ today: '2026-10-13', weeklyRows: ROWS, villas: [], users: USERS, targets: [], datos: [] });
function agent(n) { return D.equipo.agents.filter(function (a) { return a.name === n; })[0]; }
function metric(a, m) { return a.rows.filter(function (r) { return r.metric === m; })[0]; }
var wk = D.equipo.weeks;

console.log('equipo semanal');
ok('ventana 2026-W30 … 2026-W42', wk[0] === '2026-W30' && wk[12] === '2026-W42', J([wk[0], wk[12]]));
ok('filas en orden, resultados primero y llamadas al final', agent('Gaelle').rows.map(function (r) { return r.metric; }).join(',') ===
  'contratos_gestion,captaciones_exclusiva,captacion_inmobiliaria,arras,ofertas,cartas,visitas,valoraciones,leads_fuente,conversaciones,llamadas');
/* Arreglo 5: la segunda fila nombra el campo, no un significado sin confirmar. */
ok('arreglo 5: fila "Captación Inmobiliaria (campo del informe)", sin "sin exclusiva"', metric(agent('Gaelle'), 'captacion_inmobiliaria').label === 'Captación Inmobiliaria (campo del informe)' &&
  !agent('Gaelle').rows.some(function (r) { return /sin exclusiva/i.test(r.label); }));
ok('agentes por nombre; Toni Moll inactivo y sin filas no sale', D.equipo.agents.map(function (a) { return a.name; }).join('|') === 'Gaelle|Luciano|Mari|Soledad|Tino', D.equipo.agents.map(function (a) { return a.name; }).join('|'));
var g = agent('Gaelle');
var iW40 = wk.indexOf('2026-W40');
ok('semana sin fila = null, no 0 (Gaelle 2026-W40)', metric(g, 'visitas').values[iW40] === null, J(metric(g, 'visitas').values));
ok('semana sin fila en missingWeeks', g.missingWeeks.length === 1 && g.missingWeeks[0] === '2026-W40', J(g.missingWeeks));
ok('la semana abierta (2026-W42) no cuenta como sin informe', g.missingWeeks.indexOf('2026-W42') < 0 && metric(g, 'visitas').values[12] === null);
ok('fila del 13 jul (fuera de la ventana) no entra', metric(g, 'visitas').values[0] === 1);
ok('visitas = ventas + vacacional (2 + 1 = 3 en 2026-W41)', metric(g, 'visitas').values[11] === 3);
ok('prospección antes de existir = null, no 0', metric(g, 'llamadas').values[10] === null && metric(g, 'llamadas').values[11] === 30, J(metric(g, 'llamadas').values));
ok('llamadas por visita = 30 / 3 = 10', metric(g, 'llamadas').callsPerVisit[11] === 10, J(metric(g, 'llamadas').callsPerVisit));
ok('llamadas por visita con llamadas null = null', metric(g, 'llamadas').callsPerVisit[10] === null);
var t = agent('Tino');
ok('llamadas por visita con 0 visitas = null (sin división por cero)', metric(t, 'llamadas').callsPerVisit[11] === null && metric(t, 'llamadas').values[11] === 12);
ok('fase 2: ofertas, valoraciones, leads, conversaciones', ['ofertas', 'valoraciones', 'leads_fuente', 'conversaciones'].every(function (m) {
  var r = metric(g, m); return r.state === 'fase 2' && r.values.every(function (x) { return x === null; });
}));
ok('fila sin ningún dato = "sin dato" (cartas de Tino)', metric(t, 'cartas').state === 'sin dato');
ok('sin objetivo en fase 1', metric(g, 'visitas').goal === null && metric(g, 'visitas').goalState === 'sin objetivo');
ok('agente activo sin filas sale con 12 semanas sin informe', agent('Tino').missingWeeks.length === 11 && agent('Luciano').missingWeeks.length === 11);

console.log('fila semanal duplicada');
var m = agent('Mari');
ok('contadores sumados: llamadas 20 + 30 = 50', metric(m, 'llamadas').values[11] === 50, metric(m, 'llamadas').values[11]);
ok('visitas 0 + 5 = 5', metric(m, 'visitas').values[11] === 5);
ok('aviso de duplicado con el nombre y la semana', D.notices.some(function (n) { return n === 'Atención: Mari tiene 2 filas en la semana 41 (05/10/2026); se suman los contadores.'; }), J(D.notices));
ok('sin duplicados, sin ese aviso para otro agente', D.notices.filter(function (n) { return /filas en la semana/.test(n); }).length === 1);
ok('fila con fecha ilegible: aviso', D.notices.indexOf('1 fila del informe semanal no se cuenta: su fecha no se puede leer.') >= 0);

console.log('total del equipo y clasificación');
var T = D.equipo.total;
ok('total llamadas 2026-W41 = 30 + 50 + 200 + 12 + 10', metric(T, 'llamadas').values[11] === 302, metric(T, 'llamadas').values[11]);
ok('total con todos null = null (2026-W30 llamadas)', metric(T, 'llamadas').values[0] === null);
ok('agentes sin informe por semana: 2026-W40 = 4 (solo Mari)', T.missingByWeek[iW40] === 4, J(T.missingByWeek));
ok('clasificación por visitas y luego contratos, nunca por llamadas', D.equipo.leaderboard.map(function (x) { return x.name; }).join('|') === 'Gaelle|Mari|Luciano|Soledad|Tino', J(D.equipo.leaderboard));
ok('empate de visitas: decide contratos', (function () {
  var L = C.buildDashboard({ today: '2026-10-13', users: USERS, weeklyRows: [
    row('2026-10-05', 'SO1', { Visitas_Ventas: 2, Prosp_Contratos: 0, Prosp_Llamadas: 900 }),
    row('2026-10-05', 'LU1', { Visitas_Ventas: 2, Prosp_Contratos: 1, Prosp_Llamadas: 1 })] }).equipo.leaderboard;
  return L[0].name === 'Luciano' && L[1].name === 'Soledad';
})());
ok('contratos sin ningún dato = null en la clasificación', D.equipo.leaderboard.filter(function (x) { return x.name === 'Tino'; })[0].contracts === null);

console.log('tiles de socios');
function tile(d, id) { return d.socios.tiles.filter(function (x) { return x.id === id; })[0]; }
ok('ocho tiles, ids 1 a 8', D.socios.tiles.map(function (x) { return x.id; }).join(',') === '1,2,3,4,5,6,7,8');
ok('cada tile lleva fuente, fecha de lectura y una frase', D.socios.tiles.every(function (x) { return x.source && x.readAt === '2026-10-13' && typeof x.sentence === 'string' && x.sentence.length > 0; }));
ok('tile 1 honorarios cobrados = fase 2, valor null', tile(D, 1).state === 'fase 2' && tile(D, 1).value === null);
ok('tile 2 = arras en 90 días (filas con 0 en 30 días = 0) con importe en fase 2', tile(D, 2).value === 1 && tile(D, 2).arras30d === 0 &&tile(D, 2).importeState === 'fase 2' && tile(D, 2).escrituras90d === 1, J(tile(D, 2)));
/* Arreglo 2: en fase 1 la cifra 2 es un recuento de arras, con las escrituras al lado. */
ok('arreglo 2: tile 2 se llama "Arras firmadas, 90 días", no "Honorarios pendientes"', tile(D, 2).label === 'Arras firmadas, 90 días' && !/Honorarios/.test(tile(D, 2).label));
ok('arreglo 2: la frase lleva las escrituras al lado (solo recuento)', tile(D, 2).sentence === '1 firma de arras en los últimos 90 días (0 en 30, 0 en 60); 1 escritura en 90 días.', tile(D, 2).sentence);
var t3 = tile(D, 3);
ok('tile 3 = 3 captaciones en octubre, suma de los dos campos (1 + 2)', t3.value === 3 && t3.exclusivas === 2 && t3.captacionInmobiliaria === 1, J(t3));
/* Arreglo 5: % exclusiva sin confirmar, sin porcentaje. */
ok('arreglo 5: % exclusiva = null con estado "sin confirmar"', t3.exclusivePct === null && t3.exclusiveState === 'sin confirmar' && t3.sinExclusiva === undefined, J(t3));
ok('arreglo 5: la frase dice "suma de los dos campos" y no da un %', /suma de los dos campos/.test(t3.sentence) && /% exclusiva sin confirmar/.test(t3.sentence) && !/\d+([,.]\d+)? %/.test(t3.sentence), t3.sentence);
ok('tile 3 serie de 13 semanas', t3.series13w.length === 13 && t3.series13w[11] === 3 && t3.series13w[12] === null);
/* Arreglo 7: el mes abierto no se compara. */
ok('arreglo 7: mes abierto, cifras 3, 6 y 7 sin varianza ni año anterior, con "mes en curso, sin comparación"', [3, 6, 7].every(function (id) {
  var x = tile(D, id); return x.variancePct === null && x.varianceBase === null && x.lastYear === null && x.comparison === 'mes en curso, sin comparación' && /mes en curso, sin comparación/.test(x.sentence) && !/año anterior|mes anterior/.test(x.sentence);
}), J([3, 6, 7].map(function (id) { return tile(D, id).sentence; })));
ok('arreglo 7: mes abierto, cifra 7 sin mes anterior en la cifra ni en las partes', tile(D, 7).lastMonth === null && tile(D, 7).parts[2].lastMonth === null && tile(D, 7).parts[3].lastYear === null);
var DK = C.buildDashboard({ today: '2026-11-03', month: '2026-10', weeklyRows: ROWS, users: USERS });
ok('arreglo 7: mes cerrado, cifra 3 con varianza contra el año anterior (3 vs 3 = 0 %)', tile(DK, 3).state === 'sin objetivo' && tile(DK, 3).lastYear === 3 && tile(DK, 3).variancePct === 0 &&
  tile(DK, 3).varianceBase === 'año anterior' && tile(DK, 3).comparison === undefined && /3 el año anterior/.test(tile(DK, 3).sentence), J(tile(DK, 3)));
ok('arreglo 7: mes cerrado, cifra 7 con el mes anterior (0 arras, 1 escritura en septiembre)', tile(DK, 7).lastMonth === 0 && tile(DK, 7).parts[3].lastMonth === 1 && /el mes anterior 0 y 1/.test(tile(DK, 7).sentence), tile(DK, 7).sentence);
var DT = C.buildDashboard({ today: '2026-11-03', month: '2026-10', weeklyRows: ROWS, users: USERS, targets: [{ scope: 'socios', metric: 'captaciones_venta', period: '2026-10', value: 4 }] });
ok('tile 3 con objetivo = ok y varianza contra el objetivo (3 vs 4 = −25 %)', tile(DT, 3).state === 'ok' && tile(DT, 3).target === 4 && tile(DT, 3).variancePct === -25 && tile(DT, 3).varianceBase === 'objetivo', J(tile(DT, 3)));
var DTo = C.buildDashboard({ today: '2026-10-13', weeklyRows: ROWS, users: USERS, targets: [{ scope: 'socios', metric: 'captaciones_venta', period: '2026-10', value: 4 }] });
ok('arreglo 7: con objetivo y mes abierto, tampoco hay varianza', tile(DTo, 3).state === 'ok' && tile(DTo, 3).target === 4 && tile(DTo, 3).variancePct === null);
var DN = C.buildDashboard({ today: '2026-10-13', weeklyRows: [], villas: [] });
ok('tile 3 sin filas = sin dato con valor null, nunca 0', tile(DN, 3).state === 'sin dato' && tile(DN, 3).value === null);
ok('tiles 4 y 5 sin villas = sin dato', tile(DN, 4).state === 'sin dato' && tile(DN, 4).value === null && tile(DN, 5).state === 'sin dato' && tile(DN, 5).value === null);
var t6 = tile(D, 6);
ok('tile 6 = 3 contratos en octubre (Gaelle 1, Luciano 2, Mari 0, Soledad 0)', t6.value === 3, t6.value);
ok('tile 6 % leads → contrato con su base: 3 de 4 cartas = 75 %', t6.leadToContract.contratos === 3 && t6.leadToContract.cartas === 4 && t6.leadToContract.pct === 75 && /cartas de intención/.test(t6.leadToContract.base), J(t6.leadToContract));
ok('tile 6 banda de referencia 10–25 % etiquetada', t6.referenceBand.min === 10 && t6.referenceBand.max === 25 && /EE\. UU\./.test(t6.referenceBand.label));
var DC = C.buildDashboard({ today: '2026-10-13', weeklyRows: [row('2026-10-05', 'GA1', { Prosp_Contratos: 1, Prosp_Cartas_Intenciones: 0 })] });
ok('tile 6 con 0 cartas: % = null, sin división por cero', tile(DC, 6).leadToContract.pct === null && tile(DC, 6).value === 1);
/* Arreglo 8: la cifra 6 dice desde qué semana hay datos de prospección. */
ok('arreglo 8: la ventana empieza antes de 2026-W41 → la frase lo dice', /las columnas de prospección tienen dato desde la semana 41 \(05\/10\/2026\)/.test(t6.sentence) && t6.prospeccionDesde === '2026-W41', t6.sentence);
var DP = C.buildDashboard({ today: '2026-10-13', weeklyRows: [row('2026-07-20', 'GA1', { Prosp_Llamadas: 5, Prosp_Contratos: 0 }), row('2026-10-05', 'GA1', { Prosp_Contratos: 1 })] });
ok('arreglo 8: prospección desde la primera semana de la ventana → sin esa frase', !/columnas de prospección/.test(tile(DP, 6).sentence), tile(DP, 6).sentence);
var DP0 = C.buildDashboard({ today: '2026-10-13', weeklyRows: [row('2026-10-05', 'GA1', {})] });
ok('arreglo 8: sin prospección en la ventana → "no tienen dato en estas 13 semanas"', /las columnas de prospección no tienen dato en estas 13 semanas/.test(tile(DP0, 6).sentence) && tile(DP0, 6).state === 'sin dato', tile(DP0, 6).sentence);
/* Arreglo 6: coma decimal en las frases. */
var DC3 = C.buildDashboard({ today: '2026-11-03', month: '2026-10', weeklyRows: [row('2026-10-05', 'GA1', { Prosp_Contratos: 1, Prosp_Cartas_Intenciones: 3 })] });
ok('arreglo 6: 1 de 3 cartas = "33,3 %" en la frase (coma decimal)', tile(DC3, 6).leadToContract.pct === 33.3 && tile(DC3, 6).sentence.indexOf('(33,3 %)') > 0, tile(DC3, 6).sentence);
var t7 = tile(D, 7);
ok('tile 7 cartera y ofertas en fase 2; arras y escrituras con su dato', t7.parts[0].state === 'fase 2' && t7.parts[1].state === 'fase 2' && t7.parts[2].key === 'arras' && t7.parts[3].key === 'escrituras', J(t7.parts));
ok('tile 7 arras octubre = 0 (filas con 0)', t7.value === 0);
ok('tile 8 sin texto = sin dato', tile(D, 8).state === 'sin dato' && tile(D, 8).sentence === 'Sin texto todavía.');
var D8 = C.buildDashboard({ today: '2026-10-13', datos: [{ kind: 'riesgo', text: 'Riesgo de prueba' }, { kind: 'oportunidad', text: 'Oportunidad de prueba' }] });
ok('tile 8 con texto = ok y los textos', tile(D8, 8).state === 'ok' && tile(D8, 8).riesgos[0] === 'Riesgo de prueba' && tile(D8, 8).oportunidades.length === 1);

/* ── Fixture de villas (nombres inventados) ── */
function villa(id, name, st, ini, fin, extra) {
  var v = { villaid: id, Name: name, Status: st, Iniciocontrato: ini, Fincontrato: fin, ContractRenovationType: 20, Unidades_multiunit: 1, Deal_Type: 1 };
  Object.keys(extra || {}).forEach(function (k) { v[k] = extra[k]; });
  return v;
}
var VILLAS = [
  villa(1, 'Villa Prueba Zeta', 1, 1111, 2026, { Deal_Type: 2 }),
  villa(2, 'Villa Prueba Alfa', 1, null, 2026, { ContractRenovationType: 10 }),
  villa(3, 'Villa Prueba Beta', 11, 2026, 2027, { Unidades_multiunit: 6, Deal_Type: 2 }),  /* alta en 12 meses */
  villa(4, 'Villa Prueba Gamma', 1, 1111, 2999),                                           /* fin pendiente */
  villa(5, 'Villa Prueba Delta', 1, null, 2024),                                           /* fin ya pasado */
  villa(6, 'Villa Prueba Epsilon', 1, 1111, 2028),                                         /* más allá de 12 meses */
  villa(7, 'Villa Prueba Eta', 12, 1111, 2025),                                            /* baja en 12 meses */
  villa(8, 'Villa Prueba Theta', 13, null, 2024),                                          /* baja de hace más de 12 meses */
  villa(9, 'Villa Prueba Iota', 15, null, null),                                           /* perdida sin año */
  villa(10, 'Villa Prueba Kappa', 3, null, 2026),                                          /* lead: no cuenta */
  villa(11, 'Villa Prueba Lambda', 14, null, 2026),                                        /* perdida con fin futuro: no es baja todavía */
  villa(12, 'Villa Prueba Aaa', '1', '', '2026', { ContractRenovationType: null })         /* números como texto */
];
var DV = C.buildDashboard({ today: '2026-10-13', weeklyRows: [], villas: VILLAS });
var cap = DV.mensual.captacion;
console.log('viviendas, altas, bajas y tasa');
ok('en gestión = Status 1 u 11 (7)', cap.viviendasBajoContrato === 7 && tile(DV, 4).value === 7, cap.viviendasBajoContrato);
/* Arreglo 1: VILLAS tiene 1 baja sin año de fin y 6 viviendas en gestión sin año de inicio → altas, bajas y tasa sin dato. */
var t4 = tile(DV, 4), t5 = tile(DV, 5);
ok('arreglo 1: cifra 4 conserva el total (7) como cifra firme', t4.value === 7 && t4.state === 'sin objetivo');
ok('arreglo 1: cifra 4 sin altas, bajas, netas, año anterior ni varianza', t4.altas12m === null && t4.bajas12m === null && t4.netas12m === null && t4.alInicio === null &&
  t4.lastYear === null && t4.variancePct === null && t4.altasBajasState === 'sin dato', J(t4));
ok('arreglo 1: cifra 4 dice el motivo', t4.sentence === '7 viviendas en gestión hoy; altas y bajas sin dato: 1 baja sin año de fin; 6 altas sin año de inicio.', t4.sentence);
ok('arreglo 1: cifra 5 entera sin dato, con el motivo, sin tasa ni líneas de referencia', t5.value === null && t5.state === 'sin dato' && t5.bajas === null && t5.base === null &&
  t5.referencias.length === 0 && t5.sentence === 'Sin dato: 1 baja sin año de fin; 6 altas sin año de inicio.', J(t5));
ok('arreglo 1: las listas mensuales de altas y bajas salen sin dato con el motivo', cap.altas12m.state === 'sin dato' && cap.bajas12m.state === 'sin dato' && cap.bajas12m.value === null && /1 baja sin año de fin/.test(cap.bajas12m.motivo), J(cap.bajas12m));
var DS = C.buildDashboard({ today: '2026-10-13', villas: [villa(1, 'Villa Prueba Uno', 1, 1111, 2027), villa(2, 'Villa Prueba Dos', 12, 2015, 2025)] });
ok('arreglo 1: basta una vivienda sin año de inicio para dejar la tasa sin dato', tile(DS, 5).value === null && tile(DS, 5).sentence === 'Sin dato: 1 alta sin año de inicio.', tile(DS, 5).sentence);

/* Con todas las fechas: la tasa se calcula y lleva coma decimal (arreglo 6). */
var VILLAS_OK = [
  villa(1, 'Villa Prueba Uno', 1, 2019, 2026), villa(2, 'Villa Prueba Dos', 1, 2020, 2027), villa(3, 'Villa Prueba Tres', 11, 2026, 2028),
  villa(4, 'Villa Prueba Cuatro', 1, 2018, 2030), villa(5, 'Villa Prueba Cinco', 1, 2018, 2030), villa(6, 'Villa Prueba Seis', 1, 2018, 2030),
  villa(7, 'Villa Prueba Siete', 12, 2015, 2025)
];
var DVok = C.buildDashboard({ today: '2026-10-13', villas: VILLAS_OK });
ok('fechable: altas 1 (inicio 2026) y bajas 1 (fin 31/12/2025, con motivo)', DVok.mensual.captacion.altas12m.length === 1 && DVok.mensual.captacion.altas12m[0].villa === 'Villa Prueba Tres' &&
  DVok.mensual.captacion.bajas12m.length === 1 && DVok.mensual.captacion.bajas12m[0].motivo === 'LOST - SOLD', J(DVok.mensual.captacion.bajas12m));
ok('fechable: al inicio del periodo = 6 − 1 + 1 = 6', tile(DVok, 4).alInicio === 6 && tile(DVok, 4).lastYear === 6 && tile(DVok, 4).altasBajasState === 'ok');
ok('fechable: tasa = 1 / 6 = 16.7 % con frase "16,7 %"', tile(DVok, 5).value === 16.7 && tile(DVok, 5).state === 'sin objetivo' && tile(DVok, 5).sentence === '1 baja de 6 viviendas al inicio del periodo (16,7 %).', J(tile(DVok, 5)));
ok('fechable: líneas de referencia 9.6 y 19.5 etiquetadas', tile(DVok, 5).referencias.map(function (r) { return r.value; }).join(',') === '9.6,19.5' && /EE\. UU\./.test(tile(DVok, 5).referencias[0].label));

/* Arreglo 4: fichas "NO USAR" fuera de todo, con aviso. */
var DU = C.buildDashboard({ today: '2026-10-13', villas: VILLAS_OK.concat([villa(8, 'Villa Prueba Ocho - NO USAR', 1, 2019, 2026, { Deal_Type: 2, Unidades_multiunit: 9 }), villa(9, 'Villa Prueba Nueve (no usar)', 12, null, null)]) });
ok('arreglo 4: "NO USAR" no cuenta en gestión, unidades, garantía ni vencen', DU.mensual.captacion.viviendasBajoContrato === 6 && DU.mensual.captacion.unidades === 6 && DU.mensual.captacion.conGarantia.n === 0 &&
  DU.mensual.captacion.vencen12m.every(function (x) { return !/NO USAR/i.test(x.villa); }), J(DU.mensual.captacion));
ok('arreglo 4: una perdida "no usar" sin año no deja la tasa sin dato (no cuenta)', tile(DU, 5).value === 16.7);
ok('arreglo 4: aviso con el número de fichas quitadas', DU.notices.indexOf('2 fichas de villa con "NO USAR" en el nombre no se cuentan.') >= 0, J(DU.notices));
ok('arreglo 4: sin fichas "NO USAR", sin ese aviso', !DVok.notices.some(function (n) { return /NO USAR/.test(n); }));
ok('unidades: 6 simples + 1 multi de 6 = 12', cap.simples === 6 && cap.multi === 1 && cap.unidades === 12, J([cap.simples, cap.multi, cap.unidades]));
ok('% con garantía (Deal_Type 2) = 2 de 7 = 28.6', cap.conGarantia.n === 2 && cap.conGarantia.pct === 28.6, J(cap.conGarantia));
ok('avisos: sin año de inicio, fin pendiente, fin pasado, perdidas sin año', ['6 de 7 viviendas en gestión no tienen año de inicio', '1 de 7 viviendas en gestión no tiene año de fin del contrato (sin año).', '1 vivienda en gestión tiene un año de fin del contrato ya pasado: revisa la ficha de la villa.', '1 vivienda perdida no tiene año de fin del contrato: no entra en la tasa de bajas.']
  .every(function (s) { return DV.notices.some(function (n) { return n.indexOf(s) === 0; }); }), J(DV.notices));

console.log('tasa de bajas con 0 viviendas al inicio');
var D0 = C.buildDashboard({ today: '2026-10-13', villas: [villa(1, 'Villa Prueba Nueva', 1, 2026, 2030)] });
ok('solo una alta: 0 al inicio → tasa null, sin dato, sin NaN ni infinito', tile(D0, 5).value === null && tile(D0, 5).state === 'sin dato' && tile(D0, 4).alInicio === 0, J(tile(D0, 5)));
var D00 = C.buildDashboard({ today: '2026-10-13', villas: [villa(1, 'Villa Prueba Lead', 3, null, null)] });
ok('ninguna vivienda en gestión: tasa null', tile(D00, 5).value === null && tile(D00, 4).value === 0 && tile(D00, 4).state === 'sin objetivo');
ok('ningún número de la salida es NaN o infinito', !/NaN|Infinity/.test(J(D0) + J(D00) + J(D) + J(DV)));

console.log('contratos que vencen en 12 meses');
var V12 = cap.vencen12m;
/* Arreglo 3: con solo el año, vencen = año de fin este año o el siguiente. */
ok('arreglo 3: vencen 4, los de fin 2026 y 2027 en gestión', V12.length === 4, J(V12));
ok('arreglo 3: etiqueta "con año de fin 2026 o 2027" calculada desde today', cap.vencen12mLabel === 'con año de fin 2026 o 2027', cap.vencen12mLabel);
ok('arreglo 3: orden por año de fin y luego por nombre (Beta 2027 detrás de Zeta 2026)', V12.map(function (x) { return x.villa; }).join('|') === 'Villa Prueba Aaa|Villa Prueba Alfa|Villa Prueba Zeta|Villa Prueba Beta', J(V12.map(function (x) { return x.villa; })));
ok('fin como año y como 31/12', V12[0].fin === 2026 && V12[0].finFecha === '2026-12-31' && !!V12[3] && V12[3].fin === 2027);
ok('con el tipo de renovación', V12[1].renovacion === 'Fecha fija en contrato' && V12[2].renovacion === 'Anualmente tácitamente' && V12[0].renovacion === null);
ok('no entran: 2999, fin pasado, 2028, leads, perdidas', V12.every(function (x) { return ['Villa Prueba Gamma', 'Villa Prueba Delta', 'Villa Prueba Epsilon', 'Villa Prueba Kappa', 'Villa Prueba Lambda'].indexOf(x.villa) < 0; }));
var DJ = C.buildDashboard({ today: '2027-01-10', villas: VILLAS }), VJ = DJ.mensual.captacion.vencen12m;
ok('arreglo 3: desde el 10 ene 2027, los de fin 2027 y 2028; los de 2026 ya vencieron', VJ.map(function (x) { return x.villa + ' ' + x.fin; }).join('|') === 'Villa Prueba Beta 2027|Villa Prueba Epsilon 2028' &&
  DJ.mensual.captacion.vencen12mLabel === 'con año de fin 2027 o 2028', J(VJ));

console.log('mensual');
var M = D.mensual;
ok('mes = octubre 2026', M.month === '2026-10' && M.label === 'octubre 2026');
ok('dinero: cobrado, diferencia y pendiente en fase 2', M.dinero.cobrado.state === 'fase 2' && M.dinero.diferencia.state === 'fase 2' && M.dinero.pendientePorMes.state === 'fase 2');
ok('facturado del año redondeado a 100: Gaelle 21.200 + Mari 50.000', M.dinero.facturado.ytd === 71200 && M.dinero.facturado.porAgente.length === 2, J(M.dinero.facturado));
ok('facturado del mes = cierre oct − cierre sep (Gaelle 1.200, Mari 2.000)', M.dinero.facturado.value === 3200 &&
  M.dinero.facturado.porAgente.filter(function (x) { return x.name === 'Mari'; })[0].mes === 2000, J(M.dinero.facturado.porAgente));
ok('Fincas_Actuales: última semana, mayor valor por agente, suma de agentes (27 + 70)', M.ventas.fincasActuales.value === 97 && M.ventas.fincasActuales.week === '2026-W41', J(M.ventas.fincasActuales));
ok('ventas: inmuebles en venta, días en mercado y caídas en fase 2', M.ventas.inmueblesEnVenta.state === 'fase 2' && M.ventas.diasEnMercado.state === 'fase 2' && M.ventas.caidasTrasArras.state === 'fase 2');
ok('ventas: escrituras sep (mes anterior) = 1', M.ventas.escrituras.lastMonth === 1, J(M.ventas.escrituras));
ok('captación: leads en fase 2; cartas del mes = 4', M.captacion.leads.state === 'fase 2' && M.captacion.cartas.value === 4);
var pg = M.prospeccion.bonus.filter(function (x) { return x.name === 'Mari'; })[0];
ok('bono: Mari 50 llamadas (fila duplicada sumada) = Sí', pg.llamadas === 50 && pg.ok === true && pg.faltan === 0, J(pg));
var pt = M.prospeccion.bonus.filter(function (x) { return x.name === 'Tino'; })[0];
ok('bono: Tino 12 llamadas = No, faltan 38', pt.ok === false && pt.faltan === 38);
var DB = C.buildDashboard({ today: '2026-10-13', users: USERS, weeklyRows: [row('2026-10-05', 'GA1', { Prosp_Llamadas: 49 }), row('2026-10-05', 'SO1', {})] });
ok('bono: 49 = faltan 1; sin llamadas = sin dato, no "faltan 50"', DB.mensual.prospeccion.bonus[0].faltan === 1 &&
  DB.mensual.prospeccion.bonus[1].state === 'sin dato' && DB.mensual.prospeccion.bonus[1].llamadas === null, J(DB.mensual.prospeccion.bonus));
ok('regla del bono como en Prospección mensual', M.prospeccion.regla === 'Bono fijo de 150 € con 50 o más llamadas en el mes.');
var DD = C.buildDashboard({ today: '2027-01-06', month: '2026-12', weeklyRows: [row('2026-12-31', 'GA1', { Firma_Arras: 1 }), row('2027-01-01', 'GA1', { Firma_Arras: 5 })] });
ok('mes por la Fecha de la fila: el 31 dic cuenta en diciembre, el 1 ene no', DD.mensual.ventas.arras.value === 1 && tile(DD, 7).value === 1, J(DD.mensual.ventas.arras));
var DF = C.buildDashboard({ today: '2026-10-13', weeklyRows: [row('2026-10-09', 'MA1', { Facturado_Ciu: 0 }), row('2026-10-05', 'MA1', { Facturado_Ciu: 50000 })] });
ok('facturado: la fila duplicada vacía (0) llega primero y no baja el acumulado', DF.mensual.dinero.facturado.ytd === 50000, J(DF.mensual.dinero.facturado));
var DE = C.buildDashboard({ today: '2027-01-20', weeklyRows: [row('2026-12-28', 'GA1', { Facturado_Ciu: 90000 }), row('2027-01-11', 'GA1', { Facturado_Ciu: 1000 })] });
ok('facturado de enero: el del año nuevo, sin restar diciembre', DE.mensual.dinero.facturado.ytd === 1000 && DE.mensual.dinero.facturado.value === null, J(DE.mensual.dinero.facturado));
ok('agente sin users: sale con su id', C.buildDashboard({ today: '2026-10-13', weeklyRows: [row('2026-10-05', 'ZZ9', {})] }).equipo.agents[0].name === 'ZZ9');

console.log('arreglo 6: coma decimal en todas las frases y avisos');
var TODAS = [D, DK, DT, DV, DVok, DU, DC3, D0, DS, DJ];
var frases = [];
TODAS.forEach(function (d) { d.socios.tiles.forEach(function (x) { frases.push(x.sentence); }); d.notices.forEach(function (n) { frases.push(n); }); });
var conPunto = frases.filter(function (s) { return /\d\.\d/.test(s); });
ok('ninguna frase ni aviso lleva un número con punto decimal (' + frases.length + ' textos)', conPunto.length === 0, J(conPunto));

console.log('texto para socios: sin nombres de campo, sin 1111, sin semanas ISO');
ok('weekTxt: lunes 28 sep 2026 = "semana 40 (28/09/2026)"', I.weekTxt('2026-09-28') === 'semana 40 (28/09/2026)', I.weekTxt('2026-09-28'));
ok('weekTxt: lunes 4 ene 2027 = "semana 1 (04/01/2027)", sin cero delante', I.weekTxt('2027-01-04') === 'semana 1 (04/01/2027)', I.weekTxt('2027-01-04'));
ok('cifra 6 (ROWS): "desde la semana 41 (05/10/2026)"', tile(D, 6).sentence.indexOf('desde la semana 41 (05/10/2026)') >= 0, tile(D, 6).sentence);
ok('aviso de prospección (ROWS): "desde la semana 41 (05/10/2026)"', D.notices.some(function (n) { return n.indexOf('tienen dato desde la semana 41 (05/10/2026); antes salen "sin dato".') > 0; }), J(D.notices));
ok('garantía: la base no nombra Deal_Type', cap.conGarantia.base === '7 viviendas en gestión con el tipo de acuerdo informado' && /Deal_Type/.test(cap.conGarantia.source), J(cap.conGarantia));
var SOCIOS = [D, DK, DT, DV, DVok, DU, DC3, D0, DS, DJ, DB, DD, DF, DE];
var textos = [];
SOCIOS.forEach(function (d) {
  d.socios.tiles.forEach(function (x) { textos.push(x.sentence); if (x.altasBajasMotivo) textos.push(x.altasBajasMotivo); });
  d.notices.forEach(function (n) { textos.push(n); });
  var cg = d.mensual.captacion.conGarantia; if (cg && cg.base) textos.push(cg.base);
  textos.push(d.mensual.captacion.vencen12mLabel, d.mensual.prospeccion.regla);
});
var PROHIBIDO = [/Fincontrato/, /Iniciocontrato/, /Ta_/, /TaVillas/, /TaUsers/, /Deal_Type/, /1111/, /2999/, /vacío/i, /LOST/, /Prosp_/, /20\d\d-W\d\d/];
var malos = textos.filter(function (t) { return PROHIBIDO.some(function (re) { return re.test(t); }); });
ok('ninguna frase, aviso ni base nombra un campo, un 1111 o una semana ISO (' + textos.length + ' textos)', malos.length === 0, J(malos));
ok('las fuentes siguen con los nombres técnicos', /Ta_raport_ventas/.test(tile(D, 6).source) && /TaVillas/.test(tile(DV, 4).source));

console.log('concordancia: con 1, la palabra en singular');
ok('cnt: 1 baja, 2 bajas, sin dato bajas', I.cnt(1, 'baja', 'bajas') === '1 baja' && I.cnt(2, 'baja', 'bajas') === '2 bajas' && I.cnt(null, 'baja', 'bajas') === 'sin dato bajas' && I.cnt(0, 'baja', 'bajas') === '0 bajas');
/* Todo vale 1: una fila de octubre con 1 captación, 1 contrato, 1 carta, 1 arras, 1 escritura;
   una vivienda en gestión con alta en 2026 y una baja de 2025 (fechable: 1 baja de 1 vivienda). */
var UNO_ROWS = [row('2026-10-05', 'GA1', { Captacion_Inmobiliaria: 1, Firma_Arras: 1, Firma_Notario: 1, Prosp_Llamadas: 1, Prosp_Cartas_Intenciones: 1, Prosp_Contratos: 1 })];
var D1 = C.buildDashboard({ today: '2026-10-13', users: USERS, weeklyRows: UNO_ROWS, villas: [villa(1, 'Villa Prueba Una', 1, 2026, 2030, { Deal_Type: 2 }), villa(2, 'Villa Prueba Perdida', 12, 2015, 2025)] });
/* Mes cerrado: el de octubre visto desde noviembre, con las comparaciones. */
var D1c = C.buildDashboard({ today: '2026-11-10', month: '2026-10', users: USERS, weeklyRows: UNO_ROWS, villas: [villa(1, 'Villa Prueba Una', 1, 2026, 2030)] });
/* Avisos con 1: una sin año de inicio ni de fin, una con fin pasado, una perdida sin año de fin. */
var D1v = C.buildDashboard({ today: '2026-10-13', villas: [villa(1, 'Villa Prueba Sin', 1, 1111, 2999), villa(2, 'Villa Prueba Vieja', 1, 2019, 2020), villa(3, 'Villa Prueba Ida', 13, 2015, null)] });
var D1s = C.buildDashboard({ today: '2026-10-13', villas: [villa(1, 'Villa Prueba Sola', 1, 1111, 2027)] });
ok('con 1: cifra 2 = "1 firma de arras ... 1 escritura"', tile(D1, 2).sentence === '1 firma de arras en los últimos 90 días (1 en 30, 1 en 60); 1 escritura en 90 días.', tile(D1, 2).sentence);
ok('con 1: cifra 3 = "1 captación en octubre 2026"', tile(D1, 3).sentence.indexOf('1 captación en octubre 2026') === 0, tile(D1, 3).sentence);
ok('con 1: cifra 4 = "1 vivienda en gestión hoy; 1 alta y 1 baja"', tile(D1, 4).sentence === '1 vivienda en gestión hoy; 1 alta y 1 baja en 12 meses; 1 al inicio del periodo.', tile(D1, 4).sentence);
ok('con 1: cifra 5 = "1 baja de 1 vivienda"', tile(D1, 5).sentence === '1 baja de 1 vivienda al inicio del periodo (100 %).', tile(D1, 5).sentence);
ok('con 1: cifra 6 = "1 contrato ... de 1 carta de intención en 13 semanas"', tile(D1, 6).sentence.indexOf('1 contrato en octubre 2026; 1 contrato de 1 carta de intención en 13 semanas (100 %)') === 0, tile(D1, 6).sentence);
ok('con 1: cifra 7 = "1 firma de arras y 1 escritura"', tile(D1, 7).sentence.indexOf('1 firma de arras y 1 escritura en octubre 2026') === 0, tile(D1, 7).sentence);
ok('con 1: base de garantía = "1 vivienda en gestión"', D1.mensual.captacion.conGarantia.base === '1 vivienda en gestión con el tipo de acuerdo informado', D1.mensual.captacion.conGarantia.base);
ok('con 1: avisos de villas en singular, con el verbo', D1s.notices.indexOf('1 de 1 vivienda en gestión no tiene año de inicio del contrato (sin año): su alta no se puede fechar.') >= 0 &&
  D1v.notices.indexOf('1 vivienda en gestión tiene un año de fin del contrato ya pasado: revisa la ficha de la villa.') >= 0 &&
  D1v.notices.indexOf('1 vivienda perdida no tiene año de fin del contrato: no entra en la tasa de bajas.') >= 0 &&
  D1v.notices.indexOf('1 de 2 viviendas en gestión no tiene año de fin del contrato (sin año).') >= 0, J(D1v.notices.concat(D1s.notices)));
ok('con 1: motivo "1 baja sin año de fin; 1 alta sin año de inicio"', tile(D1v, 5).sentence === 'Sin dato: 1 baja sin año de fin; 1 alta sin año de inicio.', tile(D1v, 5).sentence);
var UNO = [D1, D1c, D1v, D1s, D, DK, DT, DV, DVok, DU, DC3, D0, DS, DJ, DB, DD, DF, DE];
var textos1 = [];
UNO.forEach(function (d) {
  d.socios.tiles.forEach(function (x) { textos1.push(x.sentence); if (x.altasBajasMotivo) textos1.push(x.altasBajasMotivo); });
  d.notices.forEach(function (n) { textos1.push(n); });
  var cg = d.mensual.captacion.conGarantia; if (cg && cg.base) textos1.push(cg.base);
  var b12 = d.mensual.captacion.bajas12m; if (b12 && b12.motivo) textos1.push(b12.motivo);
});
var MAL_PLURAL = /(^|[^\d,])1 (bajas|viviendas|altas|captaciones|contratos|cartas|arras|escrituras|semanas|filas|fichas)\b/;
var malPl = textos1.filter(function (t) { return MAL_PLURAL.test(t); });
ok('ningún "1 bajas", "1 viviendas", "1 arras" ... en ' + textos1.length + ' textos', malPl.length === 0, J(malPl));

console.log('arreglo 9: tope de la lectura de TaUsers en la página');
var PAGE = fs.readFileSync(path.join(__dirname, 'cuadro-comercial.html'), 'utf8');
ok('la página declara USERS_LIMIT = 300', /\nvar USERS_LIMIT = 300;/.test(PAGE));
ok('la lectura de TaUsers sigue con limit=300', PAGE.indexOf("'?action=data&table=TaUsers&limit=300'") > 0);
ok('comprueba el tope con >= USERS_LIMIT', PAGE.indexOf('var usersCapped = users.length >= USERS_LIMIT;') > 0 && PAGE.indexOf('users: { rows: users.length, capped: usersCapped }') > 0);
ok('aviso naranja como las otras lecturas', PAGE.indexOf("if(loadInfo.users && loadInfo.users.capped) av.push('<div class=\"info-box orange\">La lectura de agentes llegó al tope de ' + USERS_LIMIT + ' filas: puede faltar el nombre de algún agente.</div>');") > 0);

console.log('v2: textos en inglés (input.lang = "en")');
function keysOf(o) { return Object.keys(o).sort().join(','); }
ok('STR: es y en tienen las mismas claves', !!C.STR && keysOf(C.STR.es) === keysOf(C.STR.en), J(Object.keys(C.STR.es).filter(function (k) { return !(k in C.STR.en); }).concat(Object.keys(C.STR.en).filter(function (k) { return !(k in C.STR.es); }))));
ok('STR: misma forma en los dos idiomas (texto o lista de igual largo)', Object.keys(C.STR.es).every(function (k) {
  var a = C.STR.es[k], b = C.STR.en[k];
  return Array.isArray(a) ? Array.isArray(b) && a.length === b.length : typeof a === 'string' && typeof b === 'string';
}));
ok('STR: los {param} de cada texto son los mismos en es y en (s4 usa altasN/bajasN en inglés)', Object.keys(C.STR.es).every(function (k) {
  if (typeof C.STR.es[k] !== 'string' || k === 's4') return true;
  var p = function (s) { return (s.match(/\{\w+\}/g) || []).sort().join(','); };
  return p(C.STR.es[k]) === p(C.STR.en[k]);
}));
var INP = { today: '2026-10-13', weeklyRows: ROWS, villas: VILLAS_OK, users: USERS, targets: [], datos: [] };
var ES = C.buildDashboard(INP), ES2 = C.buildDashboard(Object.assign({}, INP, { lang: 'es' })), EN = C.buildDashboard(Object.assign({}, INP, { lang: 'en' }));
ok('sin lang = lang "es" (misma salida); un valor raro = español', J(ES) === J(ES2) && J(C.buildDashboard(Object.assign({}, INP, { lang: 'fr' }))) === J(ES) && ES.lang === 'es' && EN.lang === 'en');
/* Todos los números de la salida, en orden: los dos idiomas dan las mismas cifras. */
function nums(o, out) { out = out || []; if (typeof o === 'number') out.push(o); else if (o && typeof o === 'object') Object.keys(o).forEach(function (k) { nums(o[k], out); }); return out; }
ok('las ocho cifras valen lo mismo en inglés', J(EN.socios.tiles.map(function (x) { return x.value; })) === J(ES.socios.tiles.map(function (x) { return x.value; })), J(EN.socios.tiles.map(function (x) { return x.value; })));
ok('todos los números de la salida son los mismos en los dos idiomas (' + nums(ES).length + ')', J(nums(EN)) === J(nums(ES)));
ok('las claves de estado y varianceBase no cambian en inglés', J(EN.socios.tiles.map(function (x) { return [x.state, x.varianceBase, x.exclusiveState || null]; })) === J(ES.socios.tiles.map(function (x) { return [x.state, x.varianceBase, x.exclusiveState || null]; })) &&
  J(EN.equipo.agents.map(function (a) { return a.rows.map(function (r) { return r.state + r.goalState; }); })) === J(ES.equipo.agents.map(function (a) { return a.rows.map(function (r) { return r.state + r.goalState; }); })));
ok('inglés: etiquetas de las ocho cifras', J(EN.socios.tiles.map(function (x) { return x.label; })) === J(['Fees collected', 'Deposits (arras) signed, 90 days', 'New sale listings, % exclusive',
  'Homes under management: added, lost, total', 'Owner churn, 12 months', 'Management contracts signed; % leads → contract',
  'Sales pipeline: active portfolio, offers, deposits, deeds', 'Two risks, two opportunities']), J(EN.socios.tiles.map(function (x) { return x.label; })));
ok('inglés: frase de la cifra 2', tile(EN, 2).sentence === '1 deposit signed in the last 90 days (0 in 30, 0 in 60); 1 deed in 90 days.', tile(EN, 2).sentence);
ok('inglés: frase de la cifra 4', tile(EN, 4).sentence === '6 homes under management today; 1 added and 1 lost in 12 months; 6 at the start of the period.', tile(EN, 4).sentence);
ok('inglés: frase de la cifra 5 con punto decimal', tile(EN, 5).sentence === '1 lost home out of 6 homes at the start of the period (16.7 %).', tile(EN, 5).sentence);
ok('inglés: cifra 6 con la semana en inglés', /^3 contracts in October 2026; 3 contracts out of 4 letters of intent in 13 weeks \(75 %\); month in progress, no comparison; the prospecting columns have data from week 41 \(05\/10\/2026\)\.$/.test(tile(EN, 6).sentence), tile(EN, 6).sentence);
ok('inglés: varianceBaseText, partes de la cifra 7, referencias y banda', tile(EN, 7).parts.map(function (p) { return p.label; }).join('|') === 'Active portfolio|Offers|Deposits|Deeds' &&
  tile(EN, 6).referenceBand.label === 'US vendor' && tile(EN, 5).referencias[0].label === 'US, residential rental, best managers' && tile(EN, 6).leadToContract.base === 'letters of intent sent, 13 weeks');
ok('inglés: avisos', EN.notices.indexOf('Note: Mari has 2 rows in week 41 (05/10/2026); the counts are added up.') >= 0 &&
  EN.notices.indexOf('1 weekly report row is not counted: its date cannot be read.') >= 0 &&
  EN.notices.indexOf('Villa records keep only the contract year: the start is taken as 1 January and the end as 31 December.') >= 0 && EN.notices.length === ES.notices.length, J(EN.notices));
ok('inglés: filas del equipo semanal y nombre del total', EN.equipo.agents[0].rows.map(function (r) { return r.label; }).join('|') ===
  'Management contracts signed|Exclusive sale listings|Captación Inmobiliaria (report field)|Deposits signed|Offers|Letters of intent sent|Viewings (sales + holiday rental)|Valuations|New leads by source|Conversations|Calls' &&
  EN.equipo.total.name === 'Team', J(EN.equipo.agents[0].rows.map(function (r) { return r.label; })));
ok('inglés: mes, columnas de prospección, bono, vencen y garantía', EN.mensual.label === 'October 2026' && EN.mensual.prospeccion.fields[0].label === 'Calls' &&
  EN.mensual.prospeccion.regla === 'Fixed bonus of 150 € with 50 or more calls in the month.' && EN.mensual.captacion.vencen12mLabel === 'with end year 2026 or 2027' &&
  EN.mensual.captacion.conGarantia.base === '6 homes under management with the deal type filled in', J([EN.mensual.label, EN.mensual.captacion.conGarantia.base]));
var DVen = C.buildDashboard({ today: '2026-10-13', villas: VILLAS, lang: 'en' });
ok('inglés: motivo sin fechas, renovación y avisos de villas', tile(DVen, 5).sentence === 'No data: 1 lost home without an end year; 6 new homes without a start year.' &&
  DVen.mensual.captacion.vencen12m[1].renovacion === 'Fixed date in the contract' &&
  DVen.notices.indexOf('1 lost home has no contract end year: it is left out of the churn rate.') >= 0, J([tile(DVen, 5).sentence, DVen.notices]));
var enTxt = [];
[EN, DVen, C.buildDashboard({ today: '2026-10-13', lang: 'en' })].forEach(function (d) { d.socios.tiles.forEach(function (x) { enTxt.push(x.sentence, x.label); }); d.notices.forEach(function (n) { enTxt.push(n); }); });
ok('inglés: ninguna frase ni aviso con coma decimal ni "sin dato" (' + enTxt.length + ' textos)', enTxt.every(function (s) { return !/\d,\d/.test(s) && !/sin dato|semana|vivienda/i.test(s); }), J(enTxt.filter(function (s) { return /\d,\d/.test(s) || /sin dato|semana|vivienda/i.test(s); })));
ok('tras un cálculo en inglés el idioma vuelve a español', I.weekTxt('2026-09-28') === 'semana 40 (28/09/2026)' && I.cnt(null, 'baja', 'bajas') === 'sin dato bajas');
ok('las tablas publicadas no cambian (PROSP_FIELDS, EQUIPO_ROWS, RENOVACION en español)', C.PROSP_FIELDS[0].label === 'Llamadas' && C.EQUIPO_ROWS[0].label === 'Contratos de gestión firmados' && C.RENOVACION[10] === 'Fecha fija en contrato');

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
