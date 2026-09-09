/* Pruebas del caso de Toni Segui (09/09/2026): fianza por transferencia (opcion 3).
   node dep-cobros-opcion3.test.js

   Como marcas-manuales.test.js: NO copia el codigo de las paginas. Extrae el
   texto real de cada funcion del HTML y lo ejecuta. */
var fs = require('fs');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

function fnSource(file, name) {
  var src = fs.readFileSync(file, 'utf8');
  var i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name + ' en ' + file);
  var j = src.indexOf('{', i), depth = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) { k++; break; } }
  }
  return src.slice(i, k);
}

/* ── notas-equipo-reservas: depAplica(tipo) ── */
console.log('notas-equipo-reservas.html: depAplica');
function depAplicaCon(opt, waver) {
  var els = { fDepOpt: { value: String(opt) }, fSeWaver: { value: String(waver) } };
  var body = fnSource('notas-equipo-reservas.html', 'depAplica') + '\nreturn depAplica;';
  return new Function('g', body)(function (id) { return els[id] || null; });
}
var d3 = depAplicaCon(3, 1);
ok('opcion 3 (transferencia): la fianza se puede marcar', d3('deposito') === true);
ok('opcion 3: los gastos de tarjeta NO se pueden marcar', d3('gastos') === false);
ok('opcion 3: el waiver NO se puede marcar', d3('waiver') === false);
var d2 = depAplicaCon(2, 1);
ok('opcion 2 (tarjeta): la fianza se puede marcar', d2('deposito') === true);
ok('opcion 2: los gastos de tarjeta se pueden marcar', d2('gastos') === true);
var d1 = depAplicaCon(1, 1);
ok('opcion 1 (waiver permitido): el waiver se puede marcar', d1('waiver') === true);
ok('opcion 1: la fianza NO se puede marcar', d1('deposito') === false);
ok('opcion 1 sin waiver permitido: nada', depAplicaCon(1, 20)('waiver') === false);
ok('opcion 0 (sin elegir): nada', depAplicaCon(0, 1)('deposito') === false && depAplicaCon(0, 1)('waiver') === false);
ok('opcion 4 (airbnb): nada', depAplicaCon(4, 1)('deposito') === false);

/* ── cobros-inquilinos: fmtPendientes(r) ── */
console.log('cobros-inquilinos.html: fmtPendientes');
function fmt(fields) {
  var r = {};
  for (var k in fields) r['TaBookings2021_' + k] = fields[k];
  var body = fnSource('cobros-inquilinos.html', 'fmtPendientes') + '\nreturn fmtPendientes;';
  var f = new Function('isTruthy', 'esc', body)(
    function (v) { return v === true || v === 1 || v === -1 || v === '1' || v === 'true' || v === 'True'; },
    function (s) { return String(s); });
  return f(r);
}
var h = fmt({ Security_deposit_options: 3, Security_deposit_EUR: 900, Security_deposit_cobrado: 0 });
ok('opcion 3 sin cobrar: Fianza (transferencia) 900 pendiente', h.indexOf('Fianza (transferencia)') >= 0 && h.indexOf('✗ Pendiente') >= 0 && h.indexOf('Recibido') < 0);
ok('opcion 3 sin cobrar: cabecera Importes pendientes', h.indexOf('Importes pendientes') >= 0);
ok('ya no dice Depósito', h.indexOf('Depósito') < 0);
h = fmt({ Security_deposit_options: 3, Security_deposit_EUR: 900, Security_deposit_cobrado: 1 });
ok('opcion 3 cobrada: Fianza (transferencia) 900 Recibido en verde', h.indexOf('Fianza (transferencia)') >= 0 && h.indexOf('✓ Recibido') >= 0 && h.indexOf('b-ok') >= 0 && h.indexOf('✗ Pendiente') < 0);
ok('opcion 3 cobrada: cabecera Importes recibidos + Nada pendiente', h.indexOf('Importes recibidos') >= 0 && h.indexOf('Nada pendiente') >= 0);
h = fmt({ Security_deposit_options: 3, Security_deposit_EUR: 900, Security_deposit_cobrado: -1 });
ok('opcion 3 cobrada con -1 de Caspio: Recibido', h.indexOf('✓ Recibido') >= 0);
h = fmt({ Security_deposit_options: 2, Security_deposit_EUR: 900, Security_deposit_cobrado: 1, Gasto_tarjeta_deposito_seguridad: 27.58, Gasto_tarjeta_dep_seguri_cobrado: 0 });
ok('opcion 2 fianza cobrada, gastos no: una Recibido y una Pendiente, cabecera pendientes', h.indexOf('✓ Recibido') >= 0 && h.indexOf('✗ Pendiente') >= 0 && h.indexOf('Importes pendientes') >= 0 && h.indexOf('Nada pendiente') < 0);
h = fmt({ Security_deposit_options: 1, Deposit_waver_EUR: 57.33, Deposit_waver_cobrado: 1 });
ok('opcion 1 waiver cobrado: Waiver Recibido', h.indexOf('Waiver') >= 0 && h.indexOf('✓ Recibido') >= 0);
h = fmt({ Security_deposit_options: 4, Security_deposit_EUR: 900, Security_deposit_cobrado: 0 });
ok('opcion 4 (airbnb): Nada pendiente', h.indexOf('Nada pendiente') >= 0 && h.indexOf('Fianza') < 0);
h = fmt({ Security_deposit_options: 0 });
ok('opcion 0: aviso sin opcion', h.indexOf('Todavía no se ha seleccionado') >= 0);
ok('opcion 0: cabecera pendientes, nunca Nada pendiente ni Importes recibidos', h.indexOf('Importes pendientes') >= 0 && h.indexOf('Nada pendiente') < 0 && h.indexOf('Importes recibidos') < 0);
h = fmt({});
ok('registro vacio: aviso sin opcion y sin Nada pendiente', h.indexOf('Todavía no se ha seleccionado') >= 0 && h.indexOf('Nada pendiente') < 0);
h = fmt({ Security_deposit_options: 3, Security_deposit_EUR: 900, Security_deposit_cobrado: 1, Ecotasa_final: 30.8, Ecotasa_cobrada: 0 });
ok('ecotasa pendiente + fianza recibida: cabecera pendientes, sin Nada pendiente', h.indexOf('Ecotasa') >= 0 && h.indexOf('Importes pendientes') >= 0 && h.indexOf('Nada pendiente') < 0);

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
