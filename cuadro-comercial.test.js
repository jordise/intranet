/* Pruebas de cuadro-comercial.html v1 (13/10/2026, Cuadro de mando comercial para Gaëlle, Rafa y los socios).
   Estado de las cifras, geometría de la barra con objetivo, año anterior y referencias, variación en %, cabeceras
   de semana, bloques del equipo, "Copiar tabla" (TSV), CSV del mes con la protección contra fórmulas, bloques
   mensuales y lecturas por ventanas.
   node --test cuadro-comercial.test.js

   Como reports-prospeccion-mensual.test.js: NO copia el código de la página. Extrae el bloque "CALCULO" entero
   del HTML y lo ejecuta. OUT (abajo) es una salida de buildDashboard de mentira, con la forma de
   cuadro-comercial-data.js v1: la página solo consume esa salida. La última prueba pasa filas inventadas por el
   módulo real, si está en la carpeta, y pinta todo lo que devuelve. Sin red, sin datos reales. */
var test = require('node:test');
var assert = require('node:assert/strict');
var fs = require('fs');
var path = require('path');

var SRC = fs.readFileSync(path.join(__dirname, 'cuadro-comercial.html'), 'utf8');
var a = SRC.indexOf('▼▼ CALCULO — inicio'), b = SRC.indexOf('▲▲ CALCULO — fin');
var BLOCK = SRC.slice(SRC.indexOf('*/', a) + 2, SRC.lastIndexOf('/*', b));
var NAMES = [];
BLOCK.replace(/^function (\w+)\(/gm, function (m, n) { NAMES.push(n); return m; });
BLOCK.replace(/^var (\w+) =/gm, function (m, n) { NAMES.push(n); return m; });
var P = new Function(BLOCK + '\nreturn {' + NAMES.map(function (n) { return n + ':' + n; }).join(',') + '};')();

/* ── Salida de mentira (forma de cuadro-comercial-data.js v1) ── */
var WEEKS = [];
for (var w = 30; w <= 42; w++) WEEKS.push('2026-W' + w);
var OPEN = '2026-W42';
function arr(f) { var o = []; for (var i = 0; i < 13; i++) o.push(f(i)); return o; }
function nul() { return arr(function () { return null; }); }
var AG = {
  id: 'U1', name: 'Agente Prueba',
  rows: [
    { metric: 'contratos_gestion', label: 'Contratos de gestión firmados', values: arr(function (i) { return i % 4 === 0 ? 1 : 0; }), goal: null, goalState: 'sin objetivo', state: 'ok' },
    { metric: 'ofertas', label: 'Ofertas', values: nul(), goal: null, goalState: 'sin objetivo', state: 'fase 2' },
    { metric: 'cartas', label: 'Cartas de intención enviadas', values: nul(), goal: null, goalState: 'sin objetivo', state: 'sin dato' },
    { metric: 'visitas', label: 'Visitas (ventas + vacacional)', values: arr(function (i) { return i + 1; }), goal: 5, goalState: 'ok', state: 'ok' },
    { metric: 'llamadas', label: 'Llamadas', values: arr(function (i) { return (i + 1) * 10; }), goal: null, goalState: 'sin objetivo', state: 'ok', callsPerVisit: arr(function (i) { return i === 2 ? null : 10; }) }
  ],
  missingWeeks: ['2026-W31', '2026-W41']
};
var TOTAL = { name: 'Equipo', rows: AG.rows, missingWeeks: ['2026-W31', '2026-W41'], missingByWeek: arr(function (i) { return i === 1 ? 2 : i === 11 ? 1 : i === 12 ? 3 : 0; }) };
var OUT = {
  version: 1, today: '2026-10-13', readAt: '2026-10-13',
  socios: { month: '2026-10', tiles: [
    { id: 1, label: 'Honorarios cobrados', value: null, unit: 'EUR', target: null, lastYear: null, variancePct: null, varianceBase: null, sentence: 'Sin dato hasta la lectura de Holded (fase 2).', source: 'Holded (fase 2)', readAt: '2026-10-13', state: 'fase 2' },
    { id: 2, label: 'Honorarios pendientes (arras sin escritura)', value: 0, unit: 'n', target: null, lastYear: null, variancePct: null, sentence: '', source: 'Reporte semanal', readAt: '2026-10-13', state: 'sin dato',
      arras30d: 0, arras60d: 0, arras90d: 0, escrituras90d: 0, importe: null, importeState: 'fase 2' },
    { id: 3, label: 'Captaciones <b>nuevas</b>', value: 5, unit: 'n', target: null, lastYear: 4, variancePct: 25, varianceBase: 'año anterior', sentence: 'Cinco captaciones.', source: 'Reporte semanal (Ta_raport_ventas)',
      readAt: '2026-10-13T11:05:00Z', state: 'sin objetivo', exclusivas: 2, captacionInmobiliaria: 3, exclusivePct: null, exclusiveState: 'sin confirmar', series13w: arr(function (i) { return i % 3; }) },
    { id: 4, label: 'Viviendas en gestión: altas, bajas, total', value: 219, unit: 'n', target: 225, lastYear: 210, variancePct: -2.67, varianceBase: 'objetivo', sentence: 'Tres altas.', source: 'Fichas de villas (TaVillas)', readAt: '2026-10-13', state: 'ok',
      altas12m: 3, bajas12m: 1, alInicio: 217, netas12m: 2 },
    { id: 5, label: 'Tasa de bajas de propietarios, 12 meses', value: 12.4, unit: '%', target: null, lastYear: 14, variancePct: null, sentence: 'Doce de cada cien.', source: 'TaVillas', readAt: '2026-10-13', state: 'sin objetivo',
      bajas: 27, base: 217, referencias: [{ value: 9.6, label: 'EE. UU., alquiler residencial, mejores gestoras' }, { value: 19.5, label: 'EE. UU., alquiler residencial, media' }] },
    { id: 6, label: 'Contratos de gestión firmados; % leads → contrato', value: 3, unit: 'n', target: null, lastYear: 2, variancePct: 50, varianceBase: 'año anterior', sentence: '', source: 'Reporte semanal', readAt: '2026-10-13', state: 'sin objetivo',
      leadToContract: { contratos: 2, cartas: 16, pct: 12.5, base: 'cartas de intención enviadas, 13 semanas' }, referenceBand: { min: 10, max: 25, label: 'proveedor EE. UU.' } },
    { id: 7, label: 'Pipeline de ventas', value: 12345, unit: 'EUR', target: 10000, lastYear: 9000, variancePct: 23.45, varianceBase: 'objetivo', sentence: '', source: 'Reporte semanal', readAt: '2026-10-13', state: 'ok',
      parts: [{ key: 'cartera', label: 'Cartera activa', value: null, state: 'fase 2' }, { key: 'arras', label: 'Arras', value: 2, state: 'ok' }] },
    { id: 8, label: 'Dos riesgos, dos oportunidades', value: null, unit: 'n', target: null, lastYear: null, variancePct: null, sentence: 'Sin texto todavía.', source: 'Texto de Gaëlle', readAt: '2026-10-13', state: 'sin dato', riesgos: [], oportunidades: [] }
  ] },
  equipo: { weeks: WEEKS, openWeek: OPEN, agents: [AG], total: TOTAL, leaderboard: [{ name: 'Agente Prueba', visits: 91, contracts: 4 }, { name: 'Sin Filas', visits: null, contracts: null }] },
  mensual: {
    month: '2026-09', label: 'septiembre 2026',
    dinero: {
      facturado: { value: null, ytd: 12340, porAgente: [{ name: 'A', ytd: 12300, mes: null }], unit: 'EUR', state: 'ok', source: 'Reporte semanal' },
      cobrado: { value: null, state: 'fase 2' }, diferencia: { value: null, state: 'fase 2' }, pendientePorMes: { value: null, state: 'fase 2' }
    },
    ventas: {
      inmueblesEnVenta: { value: null, state: 'fase 2' },
      arras: { value: 2, lastMonth: 1, lastYear: null, state: 'ok' },
      escrituras: { value: null, lastMonth: null, lastYear: null, state: 'sin dato' },
      seguros: { count: { value: 3, lastMonth: 2, lastYear: 1, state: 'ok' }, valor: { value: null, state: 'fase 2' } },
      diasEnMercado: { value: null, state: 'fase 2' }
    },
    captacion: {
      viviendasBajoContrato: 219, unidades: 240, simples: 205, multi: 14,
      conGarantia: { n: 40, pct: 41.5, base: '97 viviendas en gestión con Deal_Type', source: 'TaVillas.Deal_Type = 2' },
      renovacion: { fija: 10, tacita: 150, pendiente: 3, sinDato: 56 },
      leads: { value: null, state: 'fase 2' },
      altas12m: [{ villa: 'Villa Nueva', inicio: 2026 }],
      bajas12m: [{ villa: 'Villa <i>Ida</i>', fin: 2025, motivo: 'LOST - SOLD' }],
      vencen12m: [{ villa: 'Villa B', fin: 2027, finFecha: '2027-12-31', renovacion: 'Anualmente tácitamente' }, { villa: 'Villa A', fin: 2026, finFecha: '2026-12-31', renovacion: null }],
      vencen12mLabel: 'con año de fin 2026 o 2027'
    },
    prospeccion: {
      fields: [{ key: 'Prosp_Llamadas', label: 'Llamadas' }, { key: 'Visitas_Ventas', label: 'Visitas' }, { key: 'Prosp_Contratos', label: 'Contratos' }],
      agents: [{ name: 'Agente Prueba', sums: { Prosp_Llamadas: 48, Visitas_Ventas: 6, Prosp_Contratos: 1 }, filas: 4, semanas: 4 },
        { name: '=Malo', sums: { Prosp_Llamadas: 55, Visitas_Ventas: null, Prosp_Contratos: null }, filas: 4, semanas: 4 },
        { name: 'Sin Llamadas', sums: { Prosp_Llamadas: null, Visitas_Ventas: 2, Prosp_Contratos: null }, filas: 1, semanas: 1 }],
      totales: { Prosp_Llamadas: 103, Visitas_Ventas: 8, Prosp_Contratos: 1 },
      bonus: [{ name: 'Agente Prueba', llamadas: 48, ok: false, faltan: 2, state: 'ok' }, { name: '=Malo', llamadas: 55, ok: true, faltan: 0, state: 'ok' },
        { name: 'Sin Llamadas', llamadas: null, ok: null, faltan: null, state: 'sin dato' }],
      regla: 'Bono fijo de 150 € con 50 o más llamadas en el mes.',
      fuentes: { value: null, state: 'fase 2' }
    }
  },
  notices: ['Aviso de prueba']
};
function row(html, label) { var i = html.indexOf('>' + label + '<'); return i < 0 ? '' : html.slice(i, html.indexOf('</tr>', i)); }

test('página: versión, título, historial, permiso y módulo', function () {
  var first5 = SRC.split('\n').slice(0, 5).join('\n');
  assert.ok(/VERSIÓN ACTUAL: v3/.test(first5), 'versión en las cinco primeras líneas');
  assert.ok(SRC.indexOf('<title>Cuadro de mando comercial v3 — 3Villas</title>') > 0);
  assert.ok(/var PAGE_VERSION = 3;/.test(SRC));
  assert.ok(/^<!-- HISTORIAL: v1 - 13\/10\/2026 [\s\S]* v2 - 13\/10\/2026 — [\s\S]* v3 - 13\/10\/2026 — [\s\S]* -->$/.test(SRC.trim().split('\n').pop()), 'historial v1, v2 y v3');
  assert.ok(SRC.indexOf("<script>window.__ccSession = null; window.__ccSession = Auth.require('cuadro-comercial');</script>") > 0);
  assert.ok(/\(function\(\)\{\n'use strict';\n[^\n]*\nif \(!window\.__ccSession\) return;/.test(SRC), 'el script principal sale sin sesión');
  ['auth.js', 'nav.js', 'nav-component.js', 'cuadro-comercial-data.js'].forEach(function (f) {
    assert.ok(SRC.indexOf('<script src="' + f + '"></script>') > 0, f);
  });
  assert.ok(/<script defer src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/xlsx\/0\.18\.5\/xlsx\.full\.min\.js"><\/script>/.test(SRC));
  assert.ok(/if\(!window\.XLSX\)\{[^}]*downloadCsv\(\)/.test(SRC), 'respaldo CSV si SheetJS no carga');
});

test('página: tres pestañas, botones, solo lectura y scripts que compilan', function () {
  var VIVO = SRC.replace(/<!--[\s\S]*?-->/g, '');
  ['>Socios<', '>Equipo semanal<', '>Mensual<', 'Copiar tabla', 'Descargar Excel', 'Descargar CSV'].forEach(function (t) { assert.ok(VIVO.indexOf(t) >= 0, t); });
  assert.ok(!/method\s*:\s*['"](POST|PUT|DELETE)/i.test(VIVO), 'sin escrituras');
  assert.ok(/buildDashboard\(inp\)/.test(SRC) && /targets: \[\],/.test(SRC) && /datos: \[\],/.test(SRC) && /external: undefined/.test(SRC), 'entrada del módulo');
  assert.ok(/fetch\(Auth\.url\(url\), \{ headers: headers\(\) \}\)/.test(SRC), 'lectura con Auth.url y Auth.headers');
  var re = /<script>([\s\S]*?)<\/script>/g, m, n = 0;
  while ((m = re.exec(SRC))) { new Function(m[1]); n++; }
  assert.ok(n >= 3);
  assert.equal(P.REF_NOTE, 'Los valores de referencia extranjeros son orientación, no objetivos');
});

test('cifras: estados grises, nunca un 0 sin dato', function () {
  var t = P.socioTiles(OUT.socios);
  assert.deepEqual(t.map(function (x) { return x.id; }), [1, 2, 3, 4, 5, 6, 7, 8]);
  var h = t.map(P.tileHtml);
  assert.ok(/class="tile grey"/.test(h[0]) && /<div class="t-state">pendiente \(fase 2\)<\/div>/.test(h[0]) && h[0].indexOf('t-value') < 0 && h[0].indexOf('bullet') < 0);
  assert.ok(/class="tile grey"/.test(h[1]) && /<div class="t-state">sin dato<\/div>/.test(h[1]), 'sin dato con value 0');
  assert.ok(h[1].indexOf('t-value') < 0 && h[1].indexOf('bullet') < 0, 'el 0 de una cifra sin dato no se pinta');
  /* v2: la ficha "sin objetivo" va debajo de la cifra, no pegada a ella. */
  assert.ok(/class="tile grey"/.test(h[2]) && h[2].indexOf('<div class="t-value">5</div><span class="t-pill">sin objetivo</span>') > 0, 'sin objetivo: gris, con la cifra real');
  assert.ok(h[2].indexOf('Captaciones &lt;b&gt;nuevas&lt;/b&gt;') > 0, 'etiqueta escapada');
  /* v2: el desglose sale en fichas, una por parte, con el mismo texto. */
  assert.ok(h[2].indexOf('<span class="chip">En exclusiva 2</span><span class="chip">Captación Inmobiliaria (campo del informe) 3</span><span class="chip">% exclusiva: sin confirmar</span>') > 0, 'desglose de la cifra 3');
  assert.ok(h[2].indexOf('<div class="t-var up">+25,0 % vs año anterior</div>') > 0);
  assert.ok(h[2].indexOf('Fuente: Reporte semanal (Ta_raport_ventas) · leído 13/10/2026 13:05') > 0, 'fuente y lectura en hora de Madrid');
  assert.ok(/class="spark"/.test(h[2]));
  assert.ok(/class="tile"/.test(h[3]) && h[3].indexOf('<div class="t-value">219</div>') > 0 && h[3].indexOf('<span class="chip">Altas 12 meses 3</span><span class="chip">Bajas 12 meses 1</span><span class="chip">Netas 12 meses 2</span>') > 0);
  assert.ok(h[3].indexOf('<div class="t-var down">-2,7 % vs objetivo</div>') > 0);
  assert.ok(h[6].indexOf('<span class="chip">Cartera activa pendiente (fase 2)</span><span class="chip">Arras 2</span>') > 0, 'partes de la cifra 7');
  assert.equal(P.valueParts(OUT.socios.tiles[6]), 'Cartera activa pendiente (fase 2) · Arras 2', 'el texto del desglose no cambia');
  /* v2: sin objetivo, sin año anterior, sin referencias y con valor 0, no hay barra. */
  var flat0 = P.tileHtml({ id: 3, label: 'X', value: 0, unit: 'n', target: null, lastYear: null, state: 'sin objetivo', series13w: arr(function () { return 0; }) });
  assert.ok(flat0.indexOf('<div class="t-value">0</div>') > 0 && flat0.indexOf('class="bullet"') < 0, 'valor 0 sin marcas: sin barra');
  assert.ok(P.tileHtml({ id: 3, value: 4, unit: 'n', state: 'sin objetivo' }).indexOf('class="bullet"') < 0, 'valor sin comparación: sin barra');
  assert.ok(P.tileHtml({ id: 3, value: 4, unit: 'n', target: 10 }).indexOf('class="bullet"') > 0, 'valor con objetivo: con barra');
  assert.ok(/class="spark-cap">13 semanas</.test(h[2]), 'rótulo de las mini barras');
  assert.ok(/data-id="8" data-state="sin dato"/.test(h[7]) && h[7].indexOf('Sin texto todavía.') > 0);
  var h8 = P.tileHtml({ id: 8, value: 2, state: 'ok', riesgos: ['Uno'], oportunidades: ['Dos'] });
  assert.ok(h8.indexOf('<li>Riesgo: Uno</li><li>Oportunidad: Dos</li>') > 0 && h8.indexOf('bullet') < 0, 'cifra 8: texto, sin barra');
  var missing = P.socioTiles({ tiles: [OUT.socios.tiles[0]] });
  assert.ok(/data-id="6" data-state="sin dato"/.test(P.tileHtml(missing[5])) && /tile grey/.test(P.tileHtml(missing[5])), 'cifra que falta = gris sin dato');
  assert.equal(P.tileState({ state: 'ok', value: null }), 'sin dato');
  assert.equal(P.tileState({ state: 'FASE 2', value: 5 }), 'fase 2');
  assert.ok(P.tileHtml({ id: 2, value: 0, unit: 'n', state: 'sin dato', importe: null, importeState: 'fase 2' }).indexOf('>0<') < 0);
});

test('cifras: dinero a 100 €, %, recuento', function () {
  assert.equal(P.fmtValue(12345, 'EUR'), '12.300 €');
  assert.equal(P.fmtValue(12350, 'EUR'), '12.400 €');
  assert.equal(P.fmtValue(40, 'EUR'), '0 €');
  assert.equal(P.fmtValue(9.6, '%'), '9,6 %');
  assert.equal(P.fmtValue(1234, 'n'), '1.234');
  assert.equal(P.fmtValue(2.25, 'n'), '2,3');
  assert.equal(P.fmtValue(null, 'EUR'), '');
  assert.equal(P.fmtNum(-0.04, 1), '0,0');
  assert.ok(P.tileHtml(OUT.socios.tiles[6]).indexOf('<div class="t-value">12.300 €</div>') > 0);
});

test('barra: real, objetivo, año anterior y referencias', function () {
  var g = P.bulletGeometry({ value: 80, target: 100, lastYear: 60 });
  assert.equal(Math.round(g.max * 100) / 100, 115);
  assert.deepEqual([g.fillPct, g.targetPct, g.lastYearPct], [69.6, 87, 52.2]);
  var g2 = P.bulletGeometry({ value: 50, target: null, lastYear: null });
  assert.deepEqual([g2.fillPct, g2.targetPct, g2.lastYearPct], [87, null, null]);
  assert.equal(P.bulletGeometry({ value: -5, target: 10 }).fillPct, 0, 'un negativo no sale de la barra');
  var g4 = P.bulletGeometry({ value: 0, target: 0, lastYear: 0 });
  assert.deepEqual([g4.max, g4.fillPct, g4.targetPct], [1, 0, 0]);
  /* Cifra 5: las referencias del módulo (referencias) */
  var t5 = OUT.socios.tiles[4], g5 = P.bulletGeometry(t5);
  assert.deepEqual(g5.refs.map(function (r) { return r.pct; }), [42.8, 87], 'líneas 9,6 y 19,5 %: escala 19,5 × 1,15');
  var h5 = P.tileHtml(t5);
  assert.ok(h5.indexOf('<div class="b-target"') < 0 && h5.indexOf('sin objetivo') > 0, 'sin objetivo: sin marca de objetivo');
  assert.ok(h5.indexOf('<div class="b-ly" style="left:62.4%"') > 0 && (h5.match(/class="b-ref"/g) || []).length === 2);
  assert.ok(h5.indexOf('9,6 % EE. UU., alquiler residencial, mejores gestoras') > 0);
  /* Sin referencias del módulo: las de la spec */
  var d5 = P.bulletGeometry({ id: 5, unit: '%', value: 12, state: 'ok' });
  assert.deepEqual(d5.refs.map(function (r) { return r.pct; }), [42.8, 87]);
  /* Cifra 6: la franja 10–25 % va en la barra secundaria del %, no en la de contratos */
  var t6 = OUT.socios.tiles[5];
  assert.deepEqual(P.bulletGeometry(t6).refs, [], 'la franja en % no se dibuja sobre el número de contratos');
  var sb = P.subBar(t6);
  assert.deepEqual([sb.value, sb.detail], [12.5, '2 de 16; base: cartas de intención enviadas, 13 semanas']);
  assert.deepEqual(P.bulletGeometry(sb).refs, [{ fromPct: 34.8, toPct: 87, label: 'proveedor EE. UU.' }]);
  var h6 = P.tileHtml(t6);
  assert.ok(h6.indexOf('<b>% leads → contrato: 12,5 %</b>') > 0 && h6.indexOf('class="b-band" style="left:34.8%;width:52.2%"') > 0);
  assert.ok(P.tileHtml(Object.assign({}, t6, { leadToContract: { contratos: 0, cartas: 0, pct: null, base: 'x' } })).indexOf('% leads → contrato: sin dato') > 0);
  assert.ok(P.hasRefs(P.socioTiles(OUT.socios)), 'hay referencias: va la letra pequeña');
  assert.ok(!P.hasRefs([{ id: 5, unit: '%', state: 'fase 2', value: null }]), 'fase 2: sin letra pequeña');
  assert.ok(P.hasRefs([t6]), 'la franja de la barra secundaria también lleva la letra pequeña');
  assert.ok(P.tileHtml({ id: 7, unit: 'n', value: 10, target: 20, lastYear: 5 }).indexOf('<div class="b-target" style="left:87%"') > 0);
});

test('variación en %', function () {
  assert.equal(P.fmtVariance(12.46), '+12,5 %');
  assert.equal(P.fmtVariance(-3), '-3,0 %');
  assert.equal(P.fmtVariance(0), '0,0 %');
  assert.equal(P.fmtVariance(-0.04), '0,0 %');
  assert.equal(P.fmtVariance(null), '');
  assert.equal(P.fmtVariance(undefined), '');
  assert.deepEqual([P.varianceClass(5), P.varianceClass(-5), P.varianceClass(0.01), P.varianceClass(null)], ['up', 'down', 'flat', '']);
  assert.deepEqual([P.varianceBase({ varianceBase: 'año anterior', target: 3 }), P.varianceBase({ target: 3 }), P.varianceBase({ lastYear: 3 }), P.varianceBase({})],
    ['vs año anterior', 'vs objetivo', 'vs año anterior', '']);
});

test('cabeceras de semana', function () {
  assert.deepEqual(P.weekParts('2026-W42'), { num: 'S42', date: '12/10', monday: '2026-10-12' });
  assert.deepEqual(P.weekParts('2026-W30'), { num: 'S30', date: '20/07', monday: '2026-07-20' });
  assert.deepEqual(P.weekParts('2026-W01'), { num: 'S1', date: '29/12', monday: '2025-12-29' });
  assert.deepEqual(P.weekParts('2026-W53'), { num: 'S53', date: '28/12', monday: '2026-12-28' });
  assert.deepEqual(P.weekParts('2026-10-14'), { num: 'S42', date: '12/10', monday: '2026-10-12' }, 'un miércoles da su lunes');
  assert.deepEqual(P.weekParts('2021-01-03'), { num: 'S53', date: '28/12', monday: '2020-12-28' }, 'un domingo es de la semana anterior');
  assert.equal(P.weekHeaderHtml('2026-W41'), '<th title="Semana del 05/10/2026">S41<span class="wd">05/10</span></th>');
  assert.equal(P.weekHeaderHtml('2026-W42', true), '<th title="Semana del 12/10/2026, en curso">S42<span class="wd">12/10 · en curso</span></th>');
});

test('bloque del agente: sin informe, fase 2, sin dato, llamadas por visita, objetivo', function () {
  var h = P.agentBlockHtml(AG, WEEKS, false, OPEN);
  assert.ok(h.indexOf('<b>Agente Prueba</b><span class="warn">10 de 12 semanas cerradas con informe</span>') > 0);
  assert.equal((h.match(/<th title="Semana del/g) || []).length, 13);
  var inf = row(h, 'Informe semanal');
  assert.equal((inf.match(/class="miss">sin informe/g) || []).length, 2, 'semanas W31 y W41');
  assert.ok(/<td class="grey">en curso<\/td><td class="goal"><\/td>$/.test(inf), 'la semana en curso no es "sin informe"');
  assert.ok(/<td class="grey" colspan="13"[^>]*>pendiente \(fase 2\)<\/td><td class="goal grey">pendiente \(fase 2\)<\/td>/.test(row(h, 'Ofertas')));
  var car = row(h, 'Cartas de intención enviadas');
  assert.ok(car.indexOf('fase 2') < 0 && (car.match(/class="empty">—/g) || []).length === 11, 'sin dato = guiones, no fase 2');
  var iL = h.indexOf('>Llamadas<'), nextRow = h.indexOf('<tr>', iL), iP = h.indexOf('Llamadas por visita');
  assert.ok(iL > 0 && nextRow > iL && iP > nextRow && iP < h.indexOf('</tr>', nextRow), 'llamadas por visita en la fila justo debajo de llamadas');
  var cpv = row(h, 'Llamadas por visita');
  assert.ok(cpv.indexOf('<td class="empty sub-row">—</td>') > 0, 'semana sin visitas: guion');
  var vis = row(h, 'Visitas (ventas + vacacional)');
  assert.ok(/<td class="goal">5<\/td>$/.test(vis), 'objetivo semanal');
  assert.equal((vis.match(/<td class="miss">—<\/td>/g) || []).length, 2, 'semana sin informe: sin cifra');
  assert.ok(/<td class="goal grey">sin objetivo<\/td>$/.test(row(h, 'Contratos de gestión firmados')));
  var tot = P.agentBlockHtml(TOTAL, WEEKS, true, OPEN);
  assert.ok(tot.indexOf('<b>Total equipo</b><span class="warn">10 de 12 semanas cerradas con todos los informes</span>') > 0);
  var tinf = row(tot, 'Informe semanal');
  assert.ok(tinf.indexOf('<td class="miss">faltan 2</td>') > 0 && tinf.indexOf('<td class="miss">faltan 1</td>') > 0 && tinf.indexOf('faltan 3') < 0, 'la semana en curso no cuenta');
  assert.equal((row(tot, 'Visitas (ventas + vacacional)').match(/class="miss"/g) || []).length, 0, 'el total no borra cifras');
  assert.ok(P.agentBlockHtml({ name: 'X', rows: [] }, WEEKS, false, OPEN).indexOf('Informe semanal') < 0, 'sin missingWeeks no hay fila de informe');
  assert.ok(P.agentBlockHtml(AG, WEEKS, false).indexOf('11 de 13 semanas con informe') > 0, 'sin semana en curso, sobre 13');
  var once = P.expandRows({ rows: [{ metric: 'llamadas', values: [], callsPerVisit: 4.5 }, { metric: 'llamadas_por_visita', values: [] }] });
  assert.equal(once.length, 2, 'si el módulo ya trae la fila, no se repite');
  var lb = P.leaderboardHtml(OUT.equipo.leaderboard);
  assert.ok(lb.indexOf('<tr><td class="l">1</td><td class="l">Agente Prueba</td><td>91</td><td>4</td></tr>') === 0);
  assert.ok(lb.indexOf('<td class="l">Sin Filas</td><td class="empty">—</td><td class="empty">—</td>') > 0);
  assert.ok(P.leaderboardHtml([]).indexOf('>sin dato<') > 0 && P.leaderboardHtml([]).indexOf('Sin datos') < 0);
});

test('Copiar tabla: TSV del equipo', function () {
  var eq = JSON.parse(JSON.stringify(OUT.equipo));
  eq.agents[0].name = 'Con\ttab';
  var lines = P.equipoTsv(eq).split('\n');
  var head = lines[0].split('\t');
  assert.equal(head.length, 16);
  assert.deepEqual([head[0], head[1], head[2], head[14], head[15]], ['Agente', 'Indicador', 'S30 20/07', 'S42 12/10 (en curso)', 'Objetivo semanal']);
  lines.forEach(function (l) { assert.equal(l.split('\t').length, 16, l); });
  var inf = lines[1].split('\t');
  assert.deepEqual([inf[0], inf[1], inf[2], inf[3], inf[13], inf[14]], ['Con tab', 'Informe semanal', 'sí', 'sin informe', 'sin informe', 'en curso']);
  var ofe = lines.find(function (l) { return /\tOfertas\t/.test(l); }).split('\t');
  assert.deepEqual([ofe[2], ofe[15]], ['pendiente (fase 2)', 'pendiente (fase 2)']);
  var cpv = lines.find(function (l) { return /\tLlamadas por visita\t/.test(l); }).split('\t');
  assert.deepEqual([cpv[2], cpv[3], cpv[4], cpv[15]], ['10', 'sin informe', '', '']);
  var vis = lines.find(function (l) { return /^Con tab\tVisitas/.test(l); }).split('\t');
  assert.deepEqual([vis[2], vis[4], vis[14], vis[15]], ['1', '3', '13', '5']);
  var tinf = lines.find(function (l) { return /^Total equipo\tInforme semanal/.test(l); }).split('\t');
  assert.deepEqual([tinf[3], tinf[13], tinf[14]], ['faltan 2', 'faltan 1', 'en curso']);
  var tvis = lines.find(function (l) { return /^Total equipo\tVisitas/.test(l); }).split('\t');
  assert.equal(tvis[3], '2', 'el total lleva su cifra en una semana con algún informe que falta');
  assert.equal(P.csvNum(2.25), '2,3');
  assert.equal(P.csvNum(7), '7');
});

test('CSV: protección contra fórmulas y formato', function () {
  assert.equal(P.csvCell('=1+1'), "'=1+1");
  assert.equal(P.csvCell('@SUM(A1)'), "'@SUM(A1)");
  assert.equal(P.csvCell('-cmd|calc'), "'-cmd|calc");
  assert.equal(P.csvCell('+34 600 000 000'), '+34 600 000 000');
  assert.equal(P.csvCell('-12,5'), '-12,5', 'un negativo con coma decimal sigue siendo número');
  assert.equal(P.csvCell('-1,5+A1'), "'-1,5+A1", 'con letras detrás, apóstrofo');
  assert.equal(P.csvCell('Villa; "A"'), '"Villa; ""A"""');
  var csv = P.buildMensualCsv(OUT.mensual);
  assert.equal(csv.charCodeAt(0), 0xFEFF);
  var L = csv.slice(1).split('\r\n');
  assert.equal(L[0], 'Bloque;Indicador;Valor;Mes anterior;Año anterior');
  assert.equal(L[1], 'Dinero;Facturado;sin dato;;');
  assert.ok(L.indexOf('Dinero;Cobrado;pendiente (fase 2);;') > 0);
  assert.ok(L.indexOf('Ventas;Arras firmadas;2;1;') > 0);
  assert.ok(L.indexOf('Ventas;Escrituras;sin dato;;') > 0);
  assert.ok(L.indexOf('Ventas;Seguros, número;3;2;1') > 0);
  assert.ok(L.indexOf('Ventas;Seguros, valor;pendiente (fase 2);;') > 0);
  assert.ok(L.indexOf('Captación;Con garantía;41,5;;') > 0);
  assert.ok(L.indexOf('Captación;Contratos que vencen: con año de fin 2026 o 2027;2;;') > 0);
  assert.ok(L.indexOf('Contratos que vencen: con año de fin 2026 o 2027;Fin de contrato;Renovación') > 0);
  assert.ok(L.indexOf('Villa A;31/12/2026;') < L.indexOf('Villa B;31/12/2027;Anualmente tácitamente'), 'por fecha de fin');
  assert.ok(L.indexOf('Agente;Llamadas;Visitas;Contratos;Bono') > 0);
  assert.ok(L.indexOf('Agente Prueba;48;6;1;No, faltan 2') > 0);
  assert.ok(L.indexOf("'=Malo;55;;;Sí") > 0, 'un nombre que empieza por = lleva apóstrofo');
  assert.ok(L.indexOf('Sin Llamadas;;2;;sin dato') > 0);
  assert.ok(L.indexOf('Total;103;8;1;') > 0);
  assert.deepEqual(P.mensualMatrix(OUT.mensual).find(function (r) { return r[1] === 'Viviendas bajo contrato'; }), ['Captación', 'Viviendas bajo contrato', 219, '', '']);
  assert.equal(P.fileName('2026-09', 'xlsx'), 'cuadro-comercial-2026-09.xlsx');
});

test('bloques mensuales: celdas, listas, prospección y bono', function () {
  function txt(v, k) { var c = P.normCell(v, k); return [c.text, c.grey]; }
  assert.deepEqual(txt(null, 'arras'), ['sin dato', true]);
  assert.deepEqual(txt('Fase 2', 'x'), ['pendiente (fase 2)', true]);
  assert.deepEqual(txt(1234.4, 'facturado'), ['1.200 €', false]);
  assert.deepEqual(txt({ value: 3, state: 'ok' }, 'x'), ['3', false]);
  assert.deepEqual(txt({ state: 'fase 2' }, 'x'), ['pendiente (fase 2)', true]);
  assert.deepEqual(txt({ value: null, state: 'sin dato', lastMonth: 2 }, 'x'), ['sin dato', true]);
  assert.equal(P.normCell({ value: 2, lastMonth: 1, lastYear: null }, 'arras').sub, 'mes anterior 1 · año anterior sin dato');
  var f = P.normCell(OUT.mensual.dinero.facturado, 'facturado');
  assert.deepEqual([f.text, f.grey, f.sub], ['sin dato', true, 'acumulado del año 12.300 €'], 'facturado: el mes sin dato, el año sí');
  assert.equal(P.normCell({ value: 2500, ytd: 12340, unit: 'EUR' }, 'facturado').text, '2.500 €');
  var gar = P.normCell(OUT.mensual.captacion.conGarantia, 'conGarantia');
  assert.deepEqual([gar.text, gar.sub], ['41,5 % (40)', 'base: 97 viviendas en gestión con Deal_Type']);
  assert.equal(P.normCell({ n: 0, pct: null, base: 'x' }, 'conGarantia').text, 'sin dato');
  assert.equal(P.normCell(OUT.mensual.captacion.renovacion, 'renovacion').text, 'Fecha fija 10 · Tácita anual 150 · Pendiente 3 · Sin dato 56');
  assert.equal(P.normCell({ '2026-11': 2 }, 'pendientePorMes').text, 'noviembre 2026 0 €');
  assert.equal(P.blockState({ state: 'fase 2' }), 'fase 2');
  assert.equal(P.blockState(undefined), 'sin dato');
  var rows = P.blockRows(OUT.mensual.ventas);
  assert.deepEqual(rows.map(function (r) { return r.label; }), ['Inmuebles en venta', 'Arras firmadas', 'Escrituras', 'Seguros, número', 'Seguros, valor', 'Días en mercado']);
  var cap = P.blockRows(OUT.mensual.captacion);
  var bajas = cap.find(function (r) { return r.key === 'bajas12m'; });
  assert.deepEqual([bajas.label, bajas.text, bajas.list.length], ['Bajas en 12 meses', '1', 1]);
  assert.deepEqual(P.listTable(bajas.list), { headers: ['Villa', 'Año de fin', 'Motivo'], keys: ['villa', 'fin', 'motivo'], rows: [['Villa <i>Ida</i>', '2025', 'LOST - SOLD']] });
  var pt = P.prospTable(OUT.mensual.prospeccion);
  assert.deepEqual(pt.headers, ['Llamadas', 'Visitas', 'Contratos']);
  assert.deepEqual(pt.rows[1].values, [55, null, null]);
  assert.deepEqual(pt.totals, [103, 8, 1]);
  assert.deepEqual(pt.rows.map(function (r) { return r.bono.text; }), ['No, faltan 2', 'Sí', 'sin dato']);
  assert.deepEqual([P.bonoText({ ok: true }).text, P.bonoText({ eligible: false, missing: 3 }).text, P.bonoText(null).text, P.bonoText(true).text], ['Sí', 'No, faltan 3', '—', 'Sí']);
  var flat = P.prospTable({ agents: [{ nombre: 'Plano', llamadas: 50, visitas: 2, bono: { ok: true } }] });
  assert.deepEqual([flat.headers, flat.rows[0].name, flat.rows[0].bono.text], [['Llamadas', 'Visitas'], 'Plano', 'Sí']);
  assert.deepEqual(P.vencenRows(OUT.mensual.captacion).map(function (v) { return [v.villa, v.finText]; }), [['Villa A', '31/12/2026'], ['Villa B', '31/12/2027']]);
  assert.deepEqual(P.vencenRows({ vencen12m: [{ villa: 12, fin: 2027 }] }).map(function (v) { return [v.villa, v.fin, v.finText]; }), [['12', '2027-12-31', '2027']], 'solo el año');
  assert.deepEqual(P.monthOptions('2026-10-13', 3), ['2026-10', '2026-09', '2026-08']);
  assert.deepEqual(P.monthOptions('2026-01-02', 2), ['2026-01', '2025-12']);
  assert.equal(P.monthLabel('2026-09'), 'septiembre 2026');
});

test('lecturas por ventanas (el proxy no aplica orderBy y corta en 1000 filas)', function () {
  var w = P.ventasWindows('2026-10-13');
  assert.equal(w.length, 2027 - 2019 + 1 + 1);
  assert.equal(P.windowWhere(w[0]), "Fecha>='2019-01-01' AND Fecha<'2020-01-01'");
  assert.equal(P.windowWhere(w[w.length - 2]), "Fecha>='2027-01-01' AND Fecha<'2028-01-01'");
  assert.equal(P.windowWhere(w[w.length - 1]), "Fecha<'2019-01-01' OR Fecha>='2028-01-01'");
  assert.equal(P.splitWindow(w[w.length - 1]), null, 'la ventana del resto no se parte');
  var s = P.splitWindow({ type: 'date', field: 'Fecha', lo: '2026-01-01', hi: '2027-01-01' });
  assert.deepEqual(s.map(function (x) { return [x.lo, x.hi]; }), [['2026-01-01', '2026-07-02'], ['2026-07-02', '2027-01-01']]);
  assert.equal(P.splitWindow({ type: 'date', field: 'Fecha', lo: '2026-01-01', hi: '2026-01-02' }), null);
  var v = P.villasWindows();
  assert.equal(P.windowWhere(v[0]), 'villaid>=0 AND villaid<100000');
  assert.deepEqual(P.splitWindow(v[0]).map(function (x) { return [x.lo, x.hi]; }), [[0, 50000], [50000, 100000]]);
  assert.equal(P.splitWindow({ type: 'int', field: 'villaid', lo: 4, hi: 5 }), null);
  assert.equal(P.dataUrl('Ta_raport_ventas', "Fecha>='2026-01-01'", 1000),
    'https://www.3villas.com/intranet/api?action=data&table=Ta_raport_ventas&where=Fecha%3E%3D\'2026-01-01\'&limit=1000');
  assert.equal(P.READ_LIMIT, 1000);
  assert.ok(/'\?action=data&table=TaUsers&limit=300'/.test(SRC), 'TaUsers como reports-ventas.html');
  assert.equal(P.madridToday('2026-12-31T23:30:00Z'), '2027-01-01');
});

test('de punta a punta con el módulo real y filas inventadas (si cuadro-comercial-data.js está)', function (t) {
  var modPath = path.join(__dirname, 'cuadro-comercial-data.js');
  if (!fs.existsSync(modPath)) { t.skip('cuadro-comercial-data.js todavía no existe'); return; }
  var C = require(modPath);
  var rows = [];
  ['2026-08-03', '2026-08-10', '2026-09-07', '2026-09-14', '2026-09-21', '2026-10-05', '2025-09-08'].forEach(function (d, i) {
    rows.push({ registro_id: 'R' + i, Fecha: d, Agente: 'U1', Captacion_Inmobiliaria: i % 2, Captacion_Inmobiliaria_Exclusiva: 1, Visitas_Ventas: 3, Visita_Alquiler_Vacacional: 1,
      Firma_Arras: i % 3 === 0 ? 1 : 0, Firma_Notario: 0, Seguros: 1, Prosp_Llamadas: 15, Prosp_Cartas_Intenciones: 2, Prosp_Contratos: i % 2, Fincas_Actuales: 20, Facturado_Ciu: 1000 * i, Facturado_Mao: 0 });
  });
  rows.push({ registro_id: 'R9', Fecha: '2026-09-15', Agente: 'U2', Visitas_Ventas: 1, Prosp_Llamadas: 60 });
  var villas = [
    { villaid: 1, Name: 'Villa Uno', Status: 1, Iniciocontrato: 2020, Fincontrato: 2026, ContractRenovationType: 10, Unidades_multiunit: 1, Deal_Type: 2 },
    { villaid: 2, Name: 'Villa Dos', Status: 1, Iniciocontrato: 2026, Fincontrato: 2030, ContractRenovationType: 20, Unidades_multiunit: 3, Deal_Type: 1 },
    { villaid: 3, Name: 'Villa Tres', Status: 12, Iniciocontrato: 2018, Fincontrato: 2026 }
  ];
  var users = [{ UserID: 'U1', Name: 'Agente Uno', Role: 'sales', User_Status: true }, { UserID: 'U2', Name: 'Agente Dos', Role: 'sales', User_Status: true }];
  var out = C.buildDashboard({ today: '2026-10-13', weeklyRows: rows, villas: villas, users: users, targets: [], datos: [], external: undefined });
  var tiles = P.socioTiles(out.socios);
  var html = tiles.map(P.tileHtml).join('');
  assert.equal((html.match(/class="tile/g) || []).length, 8);
  assert.ok(html.indexOf('undefined') < 0 && html.indexOf('NaN') < 0 && html.indexOf('[object Object]') < 0, 'cifras sin restos');
  assert.ok(/data-id="1" data-state="fase 2"/.test(html), 'cifra 1 en fase 2');
  var eq = out.equipo;
  var blocks = eq.agents.map(function (ag) { return P.agentBlockHtml(ag, eq.weeks, false, eq.openWeek); }).join('') + P.agentBlockHtml(eq.total, eq.weeks, true, eq.openWeek);
  assert.ok(blocks.indexOf('undefined') < 0 && blocks.indexOf('NaN') < 0 && blocks.indexOf('[object Object]') < 0);
  assert.ok(blocks.indexOf('Llamadas por visita') > 0 && blocks.indexOf('sin informe') > 0 && blocks.indexOf('en curso') > 0);
  var tsv = P.equipoTsv(eq).split('\n');
  tsv.forEach(function (l) { assert.equal(l.split('\t').length, 2 + eq.weeks.length + 1); });
  var lb = P.leaderboardHtml(eq.leaderboard);
  assert.ok(lb.indexOf('Agente Uno') > 0);
  var out9 = C.buildDashboard({ today: '2026-10-13', month: '2026-09', weeklyRows: rows, villas: villas, users: users, targets: [], datos: [], external: undefined });
  assert.equal(out9.mensual.month, '2026-09', 'el módulo acepta el mes elegido');
  var csv = P.buildMensualCsv(out9.mensual);
  assert.ok(csv.indexOf('undefined') < 0 && csv.indexOf('NaN') < 0 && csv.indexOf('[object Object]') < 0, csv);
  var pt = P.prospTable(out9.mensual.prospeccion);
  assert.deepEqual(pt.rows.map(function (r) { return [r.name, r.bono.text]; }), [['Agente Dos', 'Sí'], ['Agente Uno', 'No, faltan 5']]);
  var m = P.mensualMatrix(out9.mensual);
  m.forEach(function (r) { r.forEach(function (c) { assert.ok(c === '' || typeof c === 'number' || (typeof c === 'string' && c.indexOf('[object') < 0), JSON.stringify(r)); }); });
});

/* ── Correcciones de la revisión (13/10/2026) ── */

/* Corre los dos bloques <script> en línea de la página (permiso y script principal) con un DOM y un Auth de mentira.
   En el navegador, un error en un bloque no para el siguiente: aquí igual. Sin red: fetch es de mentira. */
function runPage(opts) {
  var vm = require('vm');
  var els = {}, listeners = {}, calls = [];
  function el(id) {
    return els[id] || (els[id] = { id: id, style: { display: id === 'report' || id === 'stErr' ? 'none' : '' }, textContent: '', innerHTML: '', value: '', options: [],
      classList: { toggle: function () {}, add: function () {}, remove: function () {} }, addEventListener: function () {}, setAttribute: function () {},
      getAttribute: function () { return null; }, insertAdjacentHTML: function () {} });
  }
  var ctx = {
    console: { error: function () {}, log: function () {} },
    document: { getElementById: el, addEventListener: function (t, f) { (listeners[t] = listeners[t] || []).push(f); }, querySelectorAll: function () { return []; } },
    location: { protocol: 'https:', pathname: '/intranet/cuadro-comercial.html', hash: '', search: opts.search || '' },
    localStorage: opts.localStorage,
    history: { replaceState: function () {} },
    sessionStorage: { getItem: function () { return '1'; }, setItem: function () {} },
    navigator: {},
    Auth: { require: opts.require, url: function (u) { return u; }, headers: function () { return {}; }, name: function () { return 'Prueba Uno'; } },
    CuadroComercialData: { buildDashboard: opts.build || function () { return {}; } },
    fetch: function (url) {
      calls.push(String(url));
      if (String(url).indexOf('action=data') < 0) return Promise.resolve({ status: 200, text: function () { return Promise.resolve('<!-- VERSIÓN ACTUAL: v1 -->'); } });
      var rows = /table=TaUsers/.test(url) ? (opts.users || []) : [];
      return Promise.resolve({ status: 200, json: function () { return Promise.resolve({ Result: rows }); } });
    }
  };
  ctx.window = ctx;
  vm.createContext(ctx);
  var re = /<script>([\s\S]*?)<\/script>/g, m, inl = [];
  while ((m = re.exec(SRC))) inl.push(m[1]);
  var gate = inl.filter(function (s) { return s.indexOf("Auth.require('cuadro-comercial')") >= 0; });
  var main = inl.filter(function (s) { return s.indexOf('▼▼ CALCULO — inicio') >= 0; });
  assert.equal(gate.length, 1); assert.equal(main.length, 1);
  [gate[0], main[0]].forEach(function (code) { try { vm.runInContext(code, ctx); } catch (e) { /* como el navegador: el error se queda en su bloque */ } });
  (listeners.DOMContentLoaded || []).forEach(function (f) { f(); });
  return { el: el, calls: calls, listeners: listeners, ctx: ctx };
}
async function settle(page, done) {
  for (var i = 0; i < 200 && !done(); i++) await new Promise(function (r) { setImmediate(r); });
}

test('revisión 1: sin permiso no se lee ni se pinta nada', function () {
  var page = runPage({ require: function () { throw new Error('Sin permiso'); } });
  assert.equal(page.el('report').style.display, 'none', '#report sigue oculto');
  assert.equal(page.calls.length, 0, 'ningún fetch');
  assert.equal((page.listeners.DOMContentLoaded || []).length, 0, 'loadAll no queda en espera');
  assert.equal(page.ctx.__ccSession, null);
  var anon = runPage({ require: function () { throw new Error('No autenticado'); } });
  assert.equal(anon.calls.length, 0);
});

test('revisión 1 y 5: con permiso se lee y se pinta; aviso si TaUsers llega a 300 filas', async function () {
  var users = [];
  for (var i = 0; i < 300; i++) users.push({ UserID: 'U' + i, Name: 'Agente ' + i, Role: 'sales', User_Status: true });
  var page = runPage({ require: function () { return { role: 'admin', name: 'Prueba Uno' }; }, users: users, build: function () { return OUT; } });
  await settle(page, function () { return page.el('report').style.display === 'block' || page.el('stErr').style.display === 'block'; });
  assert.equal(page.el('stErr').style.display, 'none', page.el('errMsg').textContent);
  assert.equal(page.el('report').style.display, 'block');
  assert.ok(page.calls.some(function (u) { return /table=TaUsers/.test(u); }), 'lee TaUsers');
  assert.ok(page.el('avisos').innerHTML.indexOf('La lectura de agentes llegó al tope de 300 filas') >= 0, 'aviso del tope de TaUsers');
  /* v2: las notas del módulo, plegadas en un solo <details> con su número; nunca en naranja. */
  var avH = page.el('avisos').innerHTML;
  assert.ok(avH.indexOf('<details class="notas"><summary>1 nota sobre los datos</summary><ul><li>Aviso de prueba</li></ul></details>') >= 0, 'una nota: singular');
  assert.ok(avH.indexOf('<div class="info-box orange">Aviso de prueba') < 0, 'la nota no es un aviso naranja');
  assert.ok(P.notesHtml(['a', 'b', 'c']).indexOf('<summary>3 notas sobre los datos</summary>') > 0 && P.notesHtml([]) === '' && P.notesHtml(undefined) === '', 'plural y nada sin notas');
  var few = runPage({ require: function () { return { role: 'admin' }; }, users: users.slice(0, 299), build: function () { return OUT; } });
  await settle(few, function () { return few.el('report').style.display === 'block'; });
  assert.ok(few.el('avisos').innerHTML.indexOf('tope de 300') < 0, '299 filas: sin aviso');
});

test('revisión 2: "fase 2" sale como "pendiente (fase 2)" con su leyenda', async function () {
  assert.equal(P.PHASE2_TEXT, 'pendiente (fase 2)');
  assert.equal(P.stateText('fase 2'), 'pendiente (fase 2)');
  assert.equal(P.stateText('sin dato'), 'sin dato');
  assert.ok(SRC.indexOf(".card.grey h3::after{content:' · pendiente (fase 2)'") > 0, 'título de un bloque mensual gris');
  var tiles = P.socioTiles(OUT.socios).map(P.tileHtml).join('');
  assert.ok(!/>fase 2</.test(tiles) && !/ fase 2 ·/.test(tiles), 'ninguna cifra con "fase 2" a secas');
  var page = runPage({ require: function () { return { role: 'admin' }; }, build: function () { return OUT; } });
  await settle(page, function () { return page.el('report').style.display === 'block'; });
  assert.equal(page.el('fase2Note').textContent, 'fase 2 = cifra que llega en la siguiente entrega (Holded, eGO, objetivos).');
  assert.ok(SRC.indexOf('id="sociosMes"') < SRC.indexOf('id="fase2Note"') && SRC.indexOf('id="fase2Note"') < SRC.indexOf('id="tiles"'), 'leyenda bajo la línea del mes');
  var mb = page.el('mBlocks').innerHTML;
  assert.ok(mb.indexOf('pendiente (fase 2)') > 0 && !/>fase 2</.test(mb), 'bloques mensuales');
  assert.ok(!/>fase 2</.test(page.el('weekBlocks').innerHTML), 'filas del equipo');
});

test('revisión 3: los dos avisos naranjas en español llano, semana y lunes desde el dato', async function () {
  assert.equal(P.plainNotice('Iniciocontrato y Fincontrato guardan solo el año: el inicio se toma el 1 de enero y el fin el 31 de diciembre.'),
    'El año de inicio y de fin del contrato se guardan solo como año: el inicio se toma el 1 de enero y el fin el 31 de diciembre.');
  assert.equal(P.plainNotice('En estas 13 semanas, las columnas de prospección (llamadas, cartas, contratos) tienen dato desde la semana 2026-W40; antes salen "sin dato".'),
    "Las columnas de prospección (llamadas, cartas, contratos) tienen dato desde la semana 40 (28/09/2026); antes salen 'sin dato'.");
  assert.equal(P.plainNotice('… tienen dato desde la semana 2026-W41; …'), '… tienen dato desde la semana 2026-W41; …', 'otro texto: tal cual');
  assert.equal(P.plainNotice('Aviso de prueba'), 'Aviso de prueba');
  /* La redacción nueva del módulo (13:40) llega ya en llano: sale el mismo texto, con la semana recalculada desde la fecha. */
  assert.equal(P.plainNotice('Las fichas de villas guardan solo el año del contrato: el inicio se toma el 1 de enero y el fin el 31 de diciembre.'),
    'El año de inicio y de fin del contrato se guardan solo como año: el inicio se toma el 1 de enero y el fin el 31 de diciembre.');
  assert.equal(P.plainNotice('En estas 13 semanas, las columnas de prospección (llamadas, cartas, contratos) tienen dato desde la semana 32 (03/08/2026); antes salen "sin dato".'),
    "Las columnas de prospección (llamadas, cartas, contratos) tienen dato desde la semana 32 (03/08/2026); antes salen 'sin dato'.");
  assert.equal(P.plainNotice('… las columnas de prospección (llamadas, cartas, contratos) tienen dato desde la semana 41 (28/09/2026) …'),
    "Las columnas de prospección (llamadas, cartas, contratos) tienen dato desde la semana 40 (28/09/2026); antes salen 'sin dato'.", 'el número sale de la fecha');
  var fixed = "Las columnas de prospección (llamadas, cartas, contratos) tienen dato desde la semana 40 (28/09/2026); antes salen 'sin dato'.";
  assert.equal(P.plainNotice(fixed), fixed, 'el texto final no cambia al pasar dos veces');
  var modPath = path.join(__dirname, 'cuadro-comercial-data.js');
  if (!fs.existsSync(modPath)) return;
  var C = require(modPath);
  var rows = ['2026-07-20', '2026-07-27', '2026-08-03', '2026-08-10'].map(function (d, i) { return { registro_id: 'R' + i, Fecha: d, Agente: 'U1', Visitas_Ventas: 1, Prosp_Llamadas: i >= 2 ? 12 : null }; });
  var out = C.buildDashboard({ today: '2026-10-13', weeklyRows: rows, villas: [{ villaid: 1, Name: 'Villa Uno', Status: 1, Iniciocontrato: 2020, Fincontrato: 2027 }],
    users: [{ UserID: 'U1', Name: 'Agente Uno' }], targets: [], datos: [], external: undefined });
  var page = runPage({ require: function () { return { role: 'admin' }; }, build: function () { return out; } });
  await settle(page, function () { return page.el('report').style.display === 'block'; });
  var av = page.el('avisos').innerHTML;
  assert.ok(av.indexOf("Las columnas de prospección (llamadas, cartas, contratos) tienen dato desde la semana 32 (03/08/2026); antes salen &#39;sin dato&#39;.") > 0 ||
    av.indexOf("Las columnas de prospección (llamadas, cartas, contratos) tienen dato desde la semana 32 (03/08/2026); antes salen 'sin dato'.") > 0, av);
  assert.ok(av.indexOf('El año de inicio y de fin del contrato se guardan solo como año') > 0, av);
  assert.ok(av.indexOf('Iniciocontrato y Fincontrato') < 0 && av.indexOf('2026-W') < 0, 'sin nombres de campo ni etiquetas de semana');
});

test('revisión 4: una sola forma, "sin dato"', function () {
  var VIVO = SRC.replace(/<!--[\s\S]*?-->/g, '');
  assert.ok(VIVO.indexOf('Sin datos') < 0, 'ningún "Sin datos"');
  assert.equal(P.leaderboardHtml([]), '<tr><td class="l empty" colspan="4">sin dato</td></tr>');
});

test('módulo corregido: título de la lista que vence, partes de la cifra 3 y etiqueta de la cifra 2', async function () {
  /* 1) vencen12mLabel: título de la lista, nunca una fila */
  assert.equal(P.vencenTitle(OUT.mensual.captacion), 'Contratos que vencen: con año de fin 2026 o 2027');
  assert.equal(P.vencenTitle({ vencen12m: [] }), 'Contratos que vencen en los próximos 12 meses', 'sin etiqueta: el nombre fijo');
  var rows = P.blockRows(OUT.mensual.captacion);
  assert.ok(!rows.some(function (r) { return r.key === 'vencen12mLabel'; }), 'la etiqueta no es una fila');
  assert.equal(rows.filter(function (r) { return r.key === 'vencen12m'; })[0].label, 'Contratos que vencen: con año de fin 2026 o 2027');
  var mat = JSON.stringify(P.mensualMatrix(OUT.mensual));
  assert.ok(!/vencen12m ?label/i.test(mat), 'ni en el Excel');
  var page = runPage({ require: function () { return { role: 'admin' }; }, build: function () { return OUT; } });
  await settle(page, function () { return page.el('report').style.display === 'block'; });
  var mb = page.el('mBlocks').innerHTML;
  assert.ok(mb.indexOf('Contratos que vencen: con año de fin 2026 o 2027') > 0, 'título en la pestaña Mensual');
  assert.ok(!/vencen12m ?label/i.test(mb) && mb.indexOf('con año de fin 2026 o 2027</b>') < 0, 'nunca como fila');
  /* 2) cifra 3: captacionInmobiliaria y % exclusiva sin confirmar; con un % real sale el %. */
  var t3 = P.valueParts(OUT.socios.tiles[2]);
  assert.equal(t3, 'En exclusiva 2 · Captación Inmobiliaria (campo del informe) 3 · % exclusiva: sin confirmar');
  assert.ok(P.valueParts({ id: 3, exclusivas: 2, captacionInmobiliaria: 3, exclusivePct: 40 }).indexOf('% exclusiva: 40,0 %') > 0);
  assert.ok(t3.indexOf('Sin exclusiva') < 0 && t3.indexOf('Exclusiva sin dato') < 0);
  /* 3) etiqueta de reserva de la cifra 2 */
  assert.equal(P.TILE_LABELS[2], 'Arras firmadas, 90 días');
  assert.ok(P.socioTiles({ tiles: [] }).map(P.tileHtml)[1].indexOf('Arras firmadas, 90 días') > 0);
});

/* ── auth.js y nav.js (la clave y el menú los añade el orquestador; aquí solo se comprueban) ──
   Mismo estilo que informe-reservas.test.js: se ejecuta el texto real de PERMISSIONS, USER_PERMISSIONS y hasAccess. */
function blockEnd(src, j, open, close) {
  var depth = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === open) depth++;
    else if (src[k] === close) { depth--; if (depth === 0) return k + 1; }
  }
  throw new Error('bloque sin cerrar');
}
function fnSource(src, name) {
  var i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  return src.slice(i, blockEnd(src, src.indexOf('{', i), '{', '}'));
}
function constSource(src, name) {
  var i = src.indexOf('const ' + name + ' =');
  if (i < 0) throw new Error('no encuentro const ' + name);
  return src.slice(i, blockEnd(src, src.indexOf('{', i), '{', '}')) + ';';
}

test('auth.js: una clave cuadro-comercial solo para admin, y el permiso por correo', function () {
  var AUTH = fs.readFileSync(path.join(__dirname, 'auth.js'), 'utf8');
  var keyLines = AUTH.split('\n').filter(function (l) { return /'cuadro-comercial'\s*:/.test(l); });
  assert.equal(keyLines.length, 1, 'una sola clave');
  assert.ok(/'cuadro-comercial'\s*:\s*\['admin'\]\s*,/.test(keyLines[0]), 'solo admin por rol');
  var A = new Function(constSource(AUTH, 'PERMISSIONS') + '\n' + constSource(AUTH, 'USER_PERMISSIONS') + '\n' + fnSource(AUTH, 'hasAccess') +
    '\nreturn { PERMISSIONS: PERMISSIONS, USER_PERMISSIONS: USER_PERMISSIONS, hasAccess: hasAccess };')();
  var K = 'cuadro-comercial';
  assert.deepEqual(A.PERMISSIONS[K], ['admin']);
  assert.deepEqual([A.hasAccess('admin', K, 'toni@3villas.com'), A.hasAccess('admin', K)], [true, true], 'admin, con cualquier correo o ninguno');
  assert.deepEqual([A.hasAccess('sales', K, 'gaelle@3villas.com'), A.hasAccess('sales', K, 'Gaelle@3Villas.com'), A.hasAccess('sales', K, ' gaelle@3villas.com ')], [true, true, true], 'Gaëlle (sales) por su correo');
  assert.deepEqual([A.hasAccess('manager', K, 'rafa@3villas.com'), A.hasAccess('manager', K, 'jose@3villas.com'), A.hasAccess('manager', K, 'Johannes@3villas.com')], [true, true, true], 'Rafa, Jose y Johannes (manager)');
  assert.deepEqual([A.hasAccess('sales', K, 'otro.comercial@3villas.com'), A.hasAccess('sales', K, ''), A.hasAccess('sales', K, null)], [false, false, false], 'otro sales: no');
  assert.deepEqual([A.hasAccess('manager', K, 'marta@3villas.com'), A.hasAccess('manager', K, 'toni@3villas.com')], [false, false], 'otro manager: no');
  assert.deepEqual([A.hasAccess('cleaner', K, 'limpieza@3villas.com'), A.hasAccess('staff', K, 'kike@3villas.com'), A.hasAccess('villamanager', K, 'kike@3villas.com')], [false, false, false], 'cleaner, staff y villamanager: no');
  assert.deepEqual([A.hasAccess('sales', 'permisos', 'gaelle@3villas.com'), A.hasAccess('manager', 'informe-reservas', 'rafa@3villas.com')], [false, true], 'el correo de Gaëlle no abre otras páginas; Rafa conserva el informe de reservas');
  var reqSrc = (function () { var k = AUTH.indexOf('require(page) {'); return AUTH.slice(k, blockEnd(AUTH, AUTH.indexOf('{', k), '{', '}')); })();
  assert.ok(/hasAccess\(session\.role, page, session\.payload && session\.payload\.email\)/.test(reqSrc), 'require pasa el correo de la sesión');
});

test('nav.js: dos entradas del cuadro y NAV_VERSION igual a la cabecera', function () {
  var NAV = fs.readFileSync(path.join(__dirname, 'nav.js'), 'utf8');
  var ctxNav = { console: { log: function () {}, warn: function () {}, error: function () {} }, window: {},
    localStorage: { setItem: function () {} }, location: { pathname: '/intranet/x.html', protocol: 'file:' }, fetch: function () {} };
  require('vm').runInNewContext(NAV + '\nvar __all = NAV_MENUS;', ctxNav);
  function flat(menu) { var out = []; menu.forEach(function (it) { if (it.children) it.children.forEach(function (c) { out.push(c); }); else out.push(it); }); return out; }
  function count(role) { return flat(ctxNav.__all[role]).filter(function (x) { return x.url === 'cuadro-comercial.html' && x.label === 'Cuadro de mando comercial'; }).length; }
  function after(role, url) { var L = flat(ctxNav.__all[role]), i = L.findIndex(function (x) { return x.url === url; }); return i >= 0 && L[i + 1] && L[i + 1].url === 'cuadro-comercial.html'; }
  var listados = ctxNav.__all.admin.find(function (x) { return x.label === 'Listados'; });
  assert.ok(count('admin') === 1 && after('admin', 'informe-reservas.html') && listados.children.some(function (c) { return c.url === 'cuadro-comercial.html'; }), 'admin: Listados, justo debajo de Informe de reservas');
  assert.equal(count('manager'), 1, 'manager comparte el menú de admin (Rafa, Jose, Johannes)');
  assert.ok(count('sales') === 1 && after('sales', 'reports-prospeccion-mensual.html'), 'sales: justo debajo de Prospección mensual (Gaëlle)');
  assert.equal(count('comercial'), 1);
  assert.deepEqual([count('staff'), count('cleaner')], [0, 0], 'staff y limpieza no la ven');
  var head = NAV.match(/VERSIÓN ACTUAL: v(\d+)/), nv = NAV.match(/var NAV_VERSION = (\d+);/);
  assert.ok(head && nv && head[1] === nv[1], 'NAV_VERSION = versión de la cabecera');
  /* 27/10/2026: nav.js v21 anade 'Informes de temporada'; la entrada v20 de esta pagina sigue en el historial. */
  assert.ok(/(\/\/ HISTORIAL: v20 - |\| v20 - )[^|]*cuadro-comercial/.test(NAV), 'el historial conserva la entrada v20 que nombra la página');
});

/* ── v3: español e inglés ── */

test('v3: botones ES / EN, guardado en cc_lang y ?lang=en', function () {
  var VIVO = SRC.replace(/<!--[\s\S]*?-->/g, '');
  var hr = VIVO.slice(VIVO.indexOf('<div class="head-row">'), VIVO.indexOf('<div id="stLoad"'));
  assert.ok(hr.indexOf('<div class="lang" id="langBtns" role="group"') > 0, 'el grupo de idioma está en la fila del título y las pestañas');
  assert.ok(hr.indexOf('<button type="button" class="on" data-lang="es" aria-pressed="true">ES</button>') > 0);
  assert.ok(hr.indexOf('<button type="button" data-lang="en" aria-pressed="false">EN</button>') > 0);
  assert.ok(/\.lang button\{height:28px;[^}]*font-size:11px;font-weight:800/.test(SRC) && /\.lang button\.on\{background:var\(--red\)/.test(SRC), 'pastillas de 28 px, Montserrat 800 11 px, roja la activa');
  assert.ok(SRC.indexOf("localStorage.setItem('cc_lang', LANG)") > 0 && SRC.indexOf("localStorage.getItem('cc_lang')") > 0);
  assert.ok(/\[\?&\]lang=\(es\|en\)/.test(SRC), '?lang= en la dirección');
  assert.ok(SRC.indexOf('<title>Cuadro de mando comercial v3 — 3Villas</title>') > 0, 'el título de la pestaña sigue en español');
});

test('v3: UI.es y UI.en con las mismas claves; STR del módulo también', function () {
  function same(a, b, path) {
    assert.deepEqual(Object.keys(a).sort(), Object.keys(b).sort(), path);
    Object.keys(a).forEach(function (k) {
      if (Array.isArray(a[k])) assert.ok(Array.isArray(b[k]) && a[k].length === b[k].length, path + '.' + k);
      else if (a[k] && typeof a[k] === 'object') same(a[k], b[k], path + '.' + k);
      else assert.equal(typeof b[k], 'string', path + '.' + k);
    });
  }
  same(P.UI.es, P.UI.en, 'UI');
  same(P.UI.en, P.UI.es, 'UI (al revés)');
  var C = require(path.join(__dirname, 'cuadro-comercial-data.js'));
  assert.deepEqual(Object.keys(C.STR.es).sort(), Object.keys(C.STR.en).sort(), 'STR');
  /* Cada data-i18n de la página tiene su texto en UI. */
  (SRC.match(/data-i18n="(\w+)"/g) || []).forEach(function (m) { var k = m.slice(11, -1); assert.equal(typeof P.UI.en[k], 'string', k); assert.equal(typeof P.UI.es[k], 'string', k); });
});

test('v3: en inglés, ninguna palabra española en las cifras, el equipo y el mes (salvo entre paréntesis)', function () {
  var C = require(path.join(__dirname, 'cuadro-comercial-data.js'));
  var rows = [];
  ['2026-08-03', '2026-08-10', '2026-09-07', '2026-09-14', '2026-09-21', '2026-10-05', '2025-09-08'].forEach(function (d, i) {
    rows.push({ registro_id: 'R' + i, Fecha: d, Agente: 'U1', Captacion_Inmobiliaria: i % 2, Captacion_Inmobiliaria_Exclusiva: 1, Visitas_Ventas: 3, Visita_Alquiler_Vacacional: 1,
      Firma_Arras: i % 3 === 0 ? 1 : 0, Firma_Notario: 0, Seguros: 1, Prosp_Llamadas: 15, Prosp_Cartas_Intenciones: 2, Prosp_Contratos: i % 2, Fincas_Actuales: 20, Facturado_Ciu: 1000 * i, Facturado_Mao: 0 });
  });
  var users = [{ UserID: 'U1', Name: 'Agente Uno', Role: 'sales', User_Status: true }];
  var good = [{ villaid: 1, Name: 'Villa Uno', Status: 1, Iniciocontrato: 2020, Fincontrato: 2026, ContractRenovationType: 10, Unidades_multiunit: 1, Deal_Type: 2 },
    { villaid: 2, Name: 'Villa Dos', Status: 1, Iniciocontrato: 2026, Fincontrato: 2030, ContractRenovationType: 20, Unidades_multiunit: 3, Deal_Type: 1 },
    { villaid: 3, Name: 'Villa Tres', Status: 12, Iniciocontrato: 2018, Fincontrato: 2026 }];
  var bad = [{ villaid: 1, Name: 'Villa Uno', Status: 1, Iniciocontrato: 1111, Fincontrato: 2999 }, { villaid: 2, Name: 'Villa Dos', Status: 13, Iniciocontrato: 2015, Fincontrato: null }];
  var BLACK = ['sin dato', 'semana', 'vivienda', 'arras', 'fase 2', 'objetivo', 'leído', 'fuente'];
  /* Texto visible: sin etiquetas HTML y sin lo que va entre paréntesis (nombres de tabla y de campo, "(arras)"). */
  function visible(html) { return html.replace(/<[^>]*>/g, ' ').replace(/&#39;/g, "'").replace(/\([^()]*\)/g, ' ').toLowerCase(); }
  try {
    P.setLang('en');
    [good, bad, []].forEach(function (villas, n) {
      [undefined, '2026-09'].forEach(function (month) {
        var out = C.buildDashboard({ today: '2026-10-13', month: month, weeklyRows: n === 2 ? [] : rows, villas: villas, users: users, targets: [], datos: [], lang: 'en' });
        var tiles = P.socioTiles(out.socios).map(P.tileHtml).join('');
        var eq = out.equipo, weekly = eq.agents.map(function (a) { return P.agentBlockHtml(a, eq.weeks, false, eq.openWeek); }).join('') + P.agentBlockHtml(eq.total, eq.weeks, true, eq.openWeek);
        var monthly = P.M_BLOCKS.map(function (b) { return P.blockRows(out.mensual[b.key]).map(function (r) { return r.label + ' ' + r.text + ' ' + r.sub; }).join(' | ') + P.mBlockTitle(b); }).join(' ');
        [['cifras', tiles], ['equipo', weekly], ['mensual', monthly], ['csv', P.buildMensualCsv(out.mensual)], ['tsv', P.equipoTsv(eq)]].forEach(function (pair) {
          var txt = visible(pair[1]);
          BLACK.forEach(function (w) { assert.ok(txt.indexOf(w) < 0, pair[0] + ' (villas ' + n + ', mes ' + month + '): "' + w + '" en ' + txt.slice(Math.max(0, txt.indexOf(w) - 80), txt.indexOf(w) + 40)); });
        });
        if (n === 0 && !month) {
          assert.ok(tiles.indexOf('Fees collected') > 0 && tiles.indexOf('pending (phase 2)') > 0 && tiles.indexOf('Source: Weekly report (Ta_raport_ventas) · read 13/10/2026') > 0, 'etiqueta, estado y fuente en inglés');
          assert.ok(tiles.indexOf('<span class="t-pill">no target</span>') > 0 && /class="spark-cap">13 weeks</.test(tiles));
          assert.ok(weekly.indexOf('<td class="l">Weekly report</td>') > 0 && weekly.indexOf('no report') > 0 && weekly.indexOf('in progress') > 0 && weekly.indexOf('Calls per viewing') > 0 && />W42<span/.test(weekly));
          assert.ok(P.equipoTsv(eq).split('\n')[0].indexOf('Agent\tIndicator\tW30 20/07') === 0);
        }
      });
    });
    assert.equal(P.fmtValue(12345, 'EUR'), '12,300 €');
    assert.equal(P.fmtValue(9.6, '%'), '9.6 %');
    assert.equal(P.fmtVariance(-2.67), '-2.7 %');
    assert.equal(P.csvNum(2.25), '2.3');
    assert.equal(P.monthLabel('2026-09'), 'September 2026');
    assert.equal(P.stateText('fase 2'), 'pending (phase 2)');
    assert.equal(P.varianceBase({ varianceBase: 'año anterior' }), 'vs last year');
    assert.equal(P.plainNotice('In these 13 weeks, the prospecting columns (calls, letters, contracts) have data from week 41 (28/09/2026); before that they show "no data".'),
      "The prospecting columns (calls, letters, contracts) have data from week 40 (28/09/2026); before that they show 'no data'.", 'la semana sale de la fecha, en inglés');
    assert.equal(P.buildMensualCsv(OUT.mensual).slice(1).split('\r\n')[0], 'Block;Indicator;Value;Last month;Last year');
  } finally { P.setLang('es'); }
  assert.equal(P.fmtValue(12345, 'EUR'), '12.300 €', 'de vuelta en español');
});

test('v3: ?lang=en y cc_lang abren en inglés; el cambio de idioma recalcula sin leer de nuevo', async function () {
  var langs = [];
  var page = runPage({ require: function () { return { role: 'admin' }; }, search: '?lang=en', build: function (inp) { langs.push(inp.lang); return OUT; } });
  await settle(page, function () { return page.el('report').style.display === 'block'; });
  assert.deepEqual(langs, ['en'], 'el módulo recibe lang en');
  assert.equal(page.el('fase2Note').textContent, 'phase 2 = figure that arrives in the next delivery (Holded, eGO, targets).');
  assert.ok(page.el('avisos').innerHTML.indexOf('<p class="readline">Read from Caspio at ') === 0 && page.el('avisos').innerHTML.indexOf('1 note on the data') > 0);
  assert.ok(page.el('navSub').textContent.indexOf('Read at ') === 0);
  var reads = page.calls.length;
  page.ctx.switchLang('es');
  assert.deepEqual(langs, ['en', 'es'], 'un cálculo más, en español');
  assert.equal(page.calls.length, reads, 'sin lecturas nuevas');
  assert.equal(page.el('fase2Note').textContent, 'fase 2 = cifra que llega en la siguiente entrega (Holded, eGO, objetivos).');
  var saved = {};
  var store = { getItem: function (k) { return saved[k] === undefined ? null : saved[k]; }, setItem: function (k, v) { saved[k] = v; } };
  var p2 = runPage({ require: function () { return { role: 'admin' }; }, localStorage: store, build: function () { return OUT; } });
  await settle(p2, function () { return p2.el('report').style.display === 'block'; });
  assert.ok(p2.el('avisos').innerHTML.indexOf('Lectura de Caspio a las ') > 0, 'sin elección guardada: español');
  p2.ctx.switchLang('en');
  assert.equal(saved.cc_lang, 'en', 'la elección se guarda');
  var p3 = runPage({ require: function () { return { role: 'admin' }; }, localStorage: store, build: function () { return OUT; } });
  await settle(p3, function () { return p3.el('report').style.display === 'block'; });
  assert.ok(p3.el('avisos').innerHTML.indexOf('Read from Caspio at ') > 0, 'la elección guardada manda');
  var p4 = runPage({ require: function () { return { role: 'admin' }; }, localStorage: store, search: '?lang=es', build: function () { return OUT; } });
  await settle(p4, function () { return p4.el('report').style.display === 'block'; });
  assert.ok(p4.el('avisos').innerHTML.indexOf('Lectura de Caspio a las ') > 0 && saved.cc_lang === 'en', '?lang=es manda en esa carga y no se guarda');
});
