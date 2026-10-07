/* Pruebas de Prospección mensual (reports-prospeccion-mensual.html v1): resumen mensual por
   agente de las columnas de prospección de Reports Ventas v24 y bono de 150 € con 50 llamadas.
   node reports-prospeccion-mensual.test.js

   Como fichas-propietarios.test.js: NO copia el código de la página. Extrae el bloque
   "CALCULO" entero del HTML y lo ejecuta en un contexto aislado. Sin red, sin datos reales:
   los agentes y las filas de este fichero son de mentira. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c === true) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '  -> ' + e : '')); } }

var S = fs.readFileSync('reports-prospeccion-mensual.html', 'utf8');
var NAV = fs.readFileSync('nav.js', 'utf8');
var AUTH = fs.readFileSync('auth.js', 'utf8');

console.log('versión coherente en las tres marcas');
var ver = (S.match(/VERSIÓN ACTUAL: (v\d+)/) || [])[1];
ok('cabecera dice ' + ver, !!ver);
ok('<title> coincide', S.indexOf('<title>Prospección mensual ' + ver + ' — 3Villas</title>') > 0);
ok('HISTORIAL empieza por ' + ver, S.indexOf('<!-- HISTORIAL: ' + ver + ' ') > 0);
ok('PAGE_VERSION coincide', S.indexOf('const PAGE_VERSION = ' + String(ver).slice(1) + ';') > 0);

console.log('permiso y menú');
ok('la página declara Auth.require(\'reports-ventas\')', S.indexOf("<script>Auth.require('reports-ventas');</script>") > 0);
ok('auth.js da reports-ventas a admin y sales', /'reports-ventas'\s*:\s*\['admin',\s*'sales'\]/.test(AUTH));
ok('carga auth.js, nav.js y nav-component.js', ['auth.js', 'nav.js', 'nav-component.js'].every(function (f) { return S.indexOf('<script src="' + f + '"></script>') > 0; }));

var ctxNav = { console: { log: function () {}, warn: function () {}, error: function () {} }, window: {},
  localStorage: { setItem: function () {} }, location: { pathname: '/intranet/x.html', protocol: 'file:' }, fetch: function () {} };
vm.runInNewContext(NAV + '\nvar __menus = { admin: _menuAdmin, sales: _menuSales, all: NAV_MENUS };', ctxNav);
function flat(menu) { var out = []; menu.forEach(function (it) { if (it.children) it.children.forEach(function (c) { out.push(c); }); else out.push(it); }); return out; }
function afterWeekly(menu) {
  var L = flat(menu), i = L.findIndex(function (x) { return x.url === 'reports-ventas.html'; });
  return i >= 0 && L[i + 1] && L[i + 1].url === 'reports-prospeccion-mensual.html' && L[i + 1].label === 'Prospección mensual';
}
ok('admin: "Prospección mensual" justo después del reporte semanal', afterWeekly(ctxNav.__menus.admin));
ok('sales: "Prospección mensual" justo después de "Reporte Semanal"', afterWeekly(ctxNav.__menus.sales));
ok('comercial usa el menú de sales', ctxNav.__menus.all.comercial === ctxNav.__menus.sales);
ok('staff y cleaner no la ven', ['staff', 'cleaner'].every(function (r) {
  return flat(ctxNav.__menus.all[r]).every(function (x) { return x.url !== 'reports-prospeccion-mensual.html'; });
}));
var navV = (NAV.match(/VERSIÓN ACTUAL: v(\d+)/) || [])[1];
ok('nav.js: cabecera, NAV_VERSION e HISTORIAL en la misma versión (v' + navV + ')',
  NAV.indexOf('3Villas  v' + navV) > 0 && NAV.indexOf('var NAV_VERSION = ' + navV + ';') > 0 && NAV.indexOf('// HISTORIAL: v' + navV + ' - ') > 0);

console.log('solo lectura');
var code = S.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
ok('no hay action=save, update, create ni upload', !/action=(save|update|create|upload)/.test(code));
ok('no hay method POST/PUT/DELETE', !/method\s*[:=]\s*['"]?(POST|PUT|DELETE)/i.test(code));

console.log('bloque CALCULO');
var a = S.indexOf('▼▼ CALCULO — inicio'), b = S.indexOf('▲▲ CALCULO — fin');
ok('marcas de inicio y fin presentes', a > 0 && b > a);
var block = S.slice(S.lastIndexOf('/*', a), S.lastIndexOf('/*', b));
/* WORKER, TABLE y LIMIT se leen de la página, no se inventan aquí: si alguien cambia la tabla
   o la URL de la API, las pruebas de la URL fallan. */
var consts = ['WORKER', 'TABLE', 'LIMIT'].map(function (n) {
  var m = S.match(new RegExp('\\nconst ' + n + '\\s*=\\s*([^;]+);'));
  return m ? 'const ' + n + ' = ' + m[1] + ';' : '';
});
ok('la página declara WORKER, TABLE y LIMIT', consts.every(function (c) { return c !== ''; }), consts.join(' '));
var ctx = {};
vm.runInNewContext(consts.join('\n') + '\n' + block + '\nvar __api = { madridYearMonth: madridYearMonth, monthRange: monthRange, shiftMonth: shiftMonth, ' +
  'bonoInfo: bonoInfo, resumenMensual: resumenMensual, buildMonthUrl: buildMonthUrl, numVal: numVal, ' +
  'avisosDuplicados: avisosDuplicados, weeksInMonth: weeksInMonth, lineaSemanas: lineaSemanas, avisoFueraDeMes: avisoFueraDeMes, ' +
  'PROSP_FIELDS: PROSP_FIELDS, BONO_LLAMADAS: BONO_LLAMADAS, WORKER: WORKER, TABLE: TABLE, LIMIT: LIMIT };', ctx);
var A = ctx.__api;

console.log('rango del mes');
var r = A.monthRange('2026-10');
ok('octubre 2026: 01 a 31', r.desde === '2026-10-01' && r.hasta === '2026-10-31', JSON.stringify(r));
r = A.monthRange('2026-12');
ok('diciembre 2026: 01 a 31, mismo año', r.desde === '2026-12-01' && r.hasta === '2026-12-31', JSON.stringify(r));
r = A.monthRange('2026-02');
ok('febrero 2026: 28 días', r.hasta === '2026-02-28', JSON.stringify(r));
r = A.monthRange('2028-02');
ok('febrero 2028 (bisiesto): 29 días', r.hasta === '2028-02-29', JSON.stringify(r));
ok('abril: 30 días', A.monthRange('2026-04').hasta === '2026-04-30');
ok('mes inválido → null', A.monthRange('2026-13') === null && A.monthRange('') === null);
ok('diciembre + 1 = enero del año siguiente', A.shiftMonth('2026-12', 1) === '2027-01');
ok('enero − 1 = diciembre del año anterior', A.shiftMonth('2027-01', -1) === '2026-12');
ok('mes actual en hora de Madrid (31 oct 23:30 UTC = 1 nov en Madrid)', A.madridYearMonth(Date.UTC(2026, 9, 31, 23, 30)) === '2026-11');
ok('mes actual en hora de Madrid (31 dic 23:30 UTC = enero siguiente)', A.madridYearMonth(Date.UTC(2026, 11, 31, 23, 30)) === '2027-01');
ok('mes actual en hora de Madrid (15 oct)', A.madridYearMonth(Date.UTC(2026, 9, 15, 10, 0)) === '2026-10');

console.log('URL de lectura (mismo WHERE y límite que reports-ventas v24)');
ok('TABLE de la página = Ta_raport_ventas', A.TABLE === 'Ta_raport_ventas', A.TABLE);
ok('WORKER de la página = la API del intranet', A.WORKER === 'https://www.3villas.com/intranet/api', A.WORKER);
ok('LIMIT de la página = 2000', A.LIMIT === 2000, A.LIMIT);
var u = A.buildMonthUrl('2026-12');
ok('lee Ta_raport_ventas con action=data', u.indexOf('https://www.3villas.com/intranet/api?action=data&table=Ta_raport_ventas&where=') === 0, u);
ok('WHERE Fecha del 1 al 31 de diciembre', decodeURIComponent(u).indexOf("Fecha>='2026-12-01' AND Fecha<='2026-12-31T23:59:59'") > 0, decodeURIComponent(u));
ok('sin orderBy (el proxy no lo aplica) y con limit 2000', u.indexOf('orderBy') < 0 && /&limit=2000$/.test(u), u);
ok('ni la página ni el HISTORIAL dicen "orderBy Fecha DESC"', S.indexOf('orderBy Fecha DESC') < 0 && S.indexOf("'Fecha DESC'") < 0);

console.log('regla del bono');
ok('49 llamadas: No, faltan 1', A.bonoInfo(49).ok === false && A.bonoInfo(49).faltan === 1);
ok('50 llamadas: Sí', A.bonoInfo(50).ok === true && A.bonoInfo(50).faltan === 0);
ok('51 llamadas: Sí', A.bonoInfo(51).ok === true);
ok('0 llamadas: faltan 50', A.bonoInfo(0).faltan === 50);
ok('umbral = 50', A.BONO_LLAMADAS === 50);

console.log('sumas por agente');
var users = { U1: 'Ana Prueba', U2: 'Beto Prueba', U3: 'Ciro Prueba' };
var rows = [
  /* Ana: tres semanas de octubre, 49 llamadas en total, campos vacíos o nulos */
  { Fecha: '2026-10-02', Agente: 'U1', Prosp_Llamadas: 20, Prosp_No_Contestan: 5, Prosp_No_Interesado: '', Prosp_Otra_Agencia: null, Prosp_Seguimiento: 2, Visitas_Ventas: 1, Prosp_Cartas_Intenciones: 0, Prosp_Contratos: 0 },
  { Fecha: '2026-10-09T00:00:00', Agente: 'U1', Prosp_Llamadas: '19', Prosp_No_Contestan: 3, Visitas_Ventas: 2 },
  { Fecha: '2026-10-16', Agente: 'U1', Prosp_Llamadas: 10, Prosp_Contratos: 1 },
  /* Beto: 50 llamadas en dos filas de la MISMA semana → una sola semana con datos */
  { Fecha: '2026-10-05', Agente: 'U2', Prosp_Llamadas: 25, Prosp_Cartas_Intenciones: 1 },
  { Fecha: '2026-10-09', Agente: 'U2', Prosp_Llamadas: 25 },
  /* Ciro: 51 llamadas, nombre de campo en minúsculas como puede devolverlo Caspio */
  { fecha: '2026-10-30', agente: 'U3', prosp_llamadas: 51, visitas_ventas: 3 },
  /* Fuera del mes y fecha ilegible: no cuentan */
  { Fecha: '2026-11-01', Agente: 'U1', Prosp_Llamadas: 999 },
  { Fecha: 'xx', Agente: 'U1', Prosp_Llamadas: 999 }
];
var R = A.resumenMensual(rows, '2026-10', users);
function ag(id) { return R.agentes.filter(function (x) { return x.id === id; })[0]; }
ok('tres agentes con filas en el mes', R.agentes.length === 3, R.agentes.length);
ok('ordenados por nombre', R.agentes.map(function (x) { return x.nombre; }).join('|') === 'Ana Prueba|Beto Prueba|Ciro Prueba');
ok('Ana: 49 llamadas (20 + "19" + 10)', ag('U1').sums.Prosp_Llamadas === 49, ag('U1').sums.Prosp_Llamadas);
ok('Ana: vacío y null = 0', ag('U1').sums.Prosp_No_Interesado === 0 && ag('U1').sums.Prosp_Otra_Agencia === 0);
ok('Ana: campo ausente = 0 (Otra agencia, Cartas)', ag('U1').sums.Prosp_Cartas_Intenciones === 0);
ok('Ana: No contestan 8, Visitas 3, Contratos 1', ag('U1').sums.Prosp_No_Contestan === 8 && ag('U1').sums.Visitas_Ventas === 3 && ag('U1').sums.Prosp_Contratos === 1);
ok('Ana: bono No, faltan 1', ag('U1').bono.ok === false && ag('U1').bono.faltan === 1);
ok('Beto: 50 llamadas, bono Sí', ag('U2').sums.Prosp_Llamadas === 50 && ag('U2').bono.ok === true);
ok('Ciro: campos en minúsculas se leen, 51 llamadas, 3 visitas', ag('U3').sums.Prosp_Llamadas === 51 && ag('U3').sums.Visitas_Ventas === 3);
ok('nombre del agente desde TaUsers', ag('U3').nombre === 'Ciro Prueba');
ok('totales: 150 llamadas, 6 visitas', R.totales.Prosp_Llamadas === 150 && R.totales.Visitas_Ventas === 6, JSON.stringify(R.totales));
ok('con bono: 2 de 3', R.conBono === 2);
ok('filas contadas: 6', R.filas === 6, R.filas);
ok('fuera del mes o ilegibles: 2', R.fueraDeMes === 2, R.fueraDeMes);
ok('ocho columnas en el orden pedido', A.PROSP_FIELDS.map(function (f) { return f.key; }).join(',') ===
  'Prosp_Llamadas,Prosp_No_Contestan,Prosp_No_Interesado,Prosp_Otra_Agencia,Prosp_Seguimiento,Visitas_Ventas,Prosp_Cartas_Intenciones,Prosp_Contratos');

console.log('textos que ven los comerciales');
ok('regla del bono, exacta y sin nombres ni fechas', S.indexOf('<p class="regla">Bono fijo de 150 € con 50 o más llamadas en el mes.</p>') > 0);
ok('encabezados sin word-break (LLAMADAS no se parte)', S.indexOf('word-break') < 0);
ok('error con "No se pudieron cargar los datos. "', S.indexOf("'No se pudieron cargar los datos. ' + err.message") > 0);
ok('título de la lista: Semanas con reporte entregado', S.indexOf('<h4>Semanas con reporte entregado</h4>') > 0);
ok('aviso fuera de mes, singular', A.avisoFueraDeMes(1, '2026-10') === '1 registro no se cuenta: su fecha no se puede leer o está fuera de octubre 2026.', A.avisoFueraDeMes(1, '2026-10'));
ok('aviso fuera de mes, plural', A.avisoFueraDeMes(3, '2026-10') === '3 registros no se cuentan: su fecha no se puede leer o está fuera de octubre 2026.', A.avisoFueraDeMes(3, '2026-10'));
ok('aviso fuera de mes, cero = sin aviso', A.avisoFueraDeMes(0, '2026-10') === '');

console.log('semanas (lunes a domingo) que tocan el mes');
ok('octubre 2026: 5 (del 28 sep al 1 nov)', A.weeksInMonth('2026-10') === 5, A.weeksInMonth('2026-10'));
ok('noviembre 2026: 6 (el 1 es domingo y el 30 es lunes)', A.weeksInMonth('2026-11') === 6, A.weeksInMonth('2026-11'));
ok('febrero 2027: 4 (del lunes 1 al domingo 28)', A.weeksInMonth('2027-02') === 4, A.weeksInMonth('2027-02'));
ok('diciembre 2026: 5', A.weeksInMonth('2026-12') === 5, A.weeksInMonth('2026-12'));
var R5 = A.resumenMensual(['2026-10-02', '2026-10-09', '2026-10-16', '2026-10-23', '2026-10-30'].map(function (f) { return { Fecha: f, Agente: 'U1', Prosp_Llamadas: 10 }; }), '2026-10', users);
ok('cinco viernes de octubre 2026: "5 de 5", nunca "5 de 4"',
  A.lineaSemanas(R5.agentes[0], A.weeksInMonth('2026-10')) === 'Ana Prueba: 5 de 5 semanas con reporte (5 filas)', A.lineaSemanas(R5.agentes[0], A.weeksInMonth('2026-10')));
var R1 = A.resumenMensual([{ Fecha: '2026-10-01', Agente: 'U1' }, { Fecha: '2026-10-31', Agente: 'U1' }], '2026-10', users);
ok('el 1 y el 31 de octubre cuentan en sus semanas (2 de 5)', R1.agentes[0].semanas === 2 && R1.agentes[0].semanas <= A.weeksInMonth('2026-10'));
ok('la página usa weeksInMonth como base', S.indexOf('const nSemanas = weeksInMonth(ym);') > 0 && S.indexOf('mondaysInMonth') < 0);

console.log('semanas con datos');
ok('Ana: 3 semanas', ag('U1').semanas === 3, ag('U1').semanas);
ok('Beto: 2 filas en la misma semana = 1 semana', ag('U2').semanas === 1, ag('U2').semanas);
ok('Ciro: 1 semana', ag('U3').semanas === 1);
var Rd = A.resumenMensual([
  { Fecha: '2026-12-04', Agente: 'U1', Prosp_Llamadas: 10 },
  { Fecha: '2026-12-31', Agente: 'U1', Prosp_Llamadas: 10 },
  { Fecha: '2027-01-01', Agente: 'U1', Prosp_Llamadas: 10 }
], '2026-12', users);
ok('diciembre: el 31 cuenta, el 1 de enero no', Rd.agentes[0].sums.Prosp_Llamadas === 20 && Rd.fueraDeMes === 1);
ok('diciembre: 2 semanas con datos', Rd.agentes[0].semanas === 2);
ok('línea por agente: "Toni Moll: 3 de 5 semanas con reporte (3 filas)"',
  A.lineaSemanas({ nombre: 'Toni Moll', semanas: 3, filas: 3 }, A.weeksInMonth('2026-10')) === 'Toni Moll: 3 de 5 semanas con reporte (3 filas)');
ok('línea por agente con una fila: "(1 fila)"', A.lineaSemanas({ nombre: 'X', semanas: 1, filas: 1 }, 5) === 'X: 1 de 5 semanas con reporte (1 fila)');

console.log('fila duplicada en la misma semana');
var Rdup = A.resumenMensual([
  { Fecha: '2026-10-05', Agente: 'U1', Prosp_Llamadas: 25 },
  { Fecha: '2026-10-07', Agente: 'U1', Prosp_Llamadas: 25 },
  { Fecha: '2026-10-14', Agente: 'U2', Prosp_Llamadas: 10 }
], '2026-10', users);
var dupAna = Rdup.agentes.filter(function (x) { return x.id === 'U1'; })[0];
var avDup = A.avisosDuplicados(Rdup);
ok('dos filas de 25 en la misma semana: 50 llamadas y bono Sí', dupAna.sums.Prosp_Llamadas === 50 && dupAna.bono.ok === true);
ok('dos filas, una semana', dupAna.filas === 2 && dupAna.semanas === 1);
ok('y sale el aviso de fila duplicada para ese agente', avDup.length === 1 &&
  avDup[0] === 'Atención: Ana Prueba tiene más filas que semanas en este mes; revisa el Reporte semanal, puede haber una fila duplicada.', JSON.stringify(avDup));
ok('la línea del agente enseña las filas', A.lineaSemanas(dupAna, A.weeksInMonth('2026-10')) === 'Ana Prueba: 1 de 5 semanas con reporte (2 filas)');
ok('sin duplicados, sin aviso', A.avisosDuplicados(A.resumenMensual([{ Fecha: '2026-10-05', Agente: 'U1', Prosp_Llamadas: 1 }], '2026-10', users)).length === 0);
ok('el aviso se pinta encima de la tabla (en #avisos, antes de la tabla)',
  S.indexOf('avisosDuplicados(rs).forEach') > 0 && S.indexOf('<div id="avisos"></div>') < S.indexOf('<div id="listView"'));

ok('agente desconocido sale con su id', A.resumenMensual([{ Fecha: '2026-10-01', Agente: 'ZZ', Prosp_Llamadas: 1 }], '2026-10', users).agentes[0].nombre === 'ZZ');
ok('sin filas: resumen vacío', A.resumenMensual([], '2026-10', users).agentes.length === 0);

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
