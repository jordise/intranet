/* Pruebas de la hora de salida de la casa (checkin-pasos v104). Caso: Sam y Nazaret,
   grupo Nueva Intranet 24/09/2026: huespedes con salida a las 07:00 o con la hora del
   vuelo en la casilla de la casa.
   node salida-hora-orden.test.js

   Como early-checkin-hora.test.js: NO copia el codigo de la pagina. Extrae las funciones
   reales _p0CheckoutDefault, _p0TimeMinutes y _p0ExitTimesOk de checkin-pasos.html.
   Sin red, sin datos de huespedes. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var S = fs.readFileSync('checkin-pasos.html', 'utf8');
function fnSource(name) {
  var i = S.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = S.indexOf('{', i), depth = 0, k = j;
  for (; k < S.length; k++) { if (S[k] === '{') depth++; else if (S[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return S.slice(i, k);
}
var ctx = {};
vm.runInNewContext("var CHECKOUT_DEFAULT_ARR='10:00';\n" + fnSource('_p0CheckoutDefault') + '\n' + fnSource('_p0TimeMinutes') + '\n' + fnSource('_p0ExitTimesOk'), ctx);

console.log('_p0CheckoutDefault: 10:00 cuando la reserva no trae hora');
ok('vacio -> 10:00', ctx._p0CheckoutDefault('') === '10:00');
ok('null -> 10:00', ctx._p0CheckoutDefault(null) === '10:00');
ok('undefined -> 10:00', ctx._p0CheckoutDefault(undefined) === '10:00');
ok('espacios -> 10:00', ctx._p0CheckoutDefault('  ') === '10:00');
ok('09:00 se respeta', ctx._p0CheckoutDefault('09:00') === '09:00');
ok('07:00 guardado se respeta (no se corrige a escondidas)', ctx._p0CheckoutDefault('07:00') === '07:00');

console.log('_p0TimeMinutes');
ok('10:00 -> 600', ctx._p0TimeMinutes('10:00') === 600);
ok('00:30 -> madrugada siguiente', ctx._p0TimeMinutes('00:30') === 24 * 60 + 30);
ok('03:00 -> madrugada siguiente', ctx._p0TimeMinutes('03:00') === 27 * 60);
ok('06:00 -> 360', ctx._p0TimeMinutes('06:00') === 360);
ok('vacio -> null', ctx._p0TimeMinutes('') === null);
ok('texto -> null', ctx._p0TimeMinutes('tarde') === null);
ok('25:00 -> null', ctx._p0TimeMinutes('25:00') === null);

console.log('_p0ExitTimesOk: la salida de la isla no puede ser antes que la salida de la casa');
ok('vuelo 12:00, casa 10:00 -> ok', ctx._p0ExitTimesOk('12:00', '10:00') === true);
ok('vuelo 07:00, casa 10:00 -> bloqueado (casillas cambiadas)', ctx._p0ExitTimesOk('07:00', '10:00') === false);
ok('vuelo 10:00, casa 10:00 -> bloqueado (igual)', ctx._p0ExitTimesOk('10:00', '10:00') === false);
ok('vuelo 09:00, casa 07:00 -> ok (madrugon real)', ctx._p0ExitTimesOk('09:00', '07:00') === true);
ok('vuelo 01:00, casa 10:00 -> ok (madrugada siguiente)', ctx._p0ExitTimesOk('01:00', '10:00') === true);
ok('sin vuelo -> ok (no es obligatorio)', ctx._p0ExitTimesOk('', '10:00') === true);
ok('sin casa -> ok (lo para el requerido)', ctx._p0ExitTimesOk('12:00', '') === true);

console.log('pagina: cableado v104');
var sub = fnSource('submitForm');
ok('submitForm llama a _p0ExitTimesOk antes del payload', sub.indexOf('_p0ExitTimesOk(') > 0 && sub.indexOf('_p0ExitTimesOk(') < sub.indexOf('Checkout_time:'));
ok('submitForm avisa con err_exit_order', sub.indexOf("tArr('err_exit_order')") > 0);
var ren = fnSource('renderArr');
ok('renderArr aplica _p0CheckoutDefault a fCheckoutTime', /fCheckoutTime'\)\.value=_p0CheckoutDefault\(/.test(ren));
ok('err_exit_order en 8 idiomas', (S.match(/err_exit_order:'/g) || []).length === 8);
ok('lbl_checkout_time en 8 idiomas', (S.match(/lbl_checkout_time:/g) || []).length === 8);
ok('etiqueta ES "Hora de salida de la casa"', S.indexOf("lbl_checkout_time:'Hora de salida de la casa'") > 0);
ok('etiqueta EN "Flight or ferry departure {depFrom}"', S.indexOf("lbl_dep_time:'Flight or ferry departure {depFrom}'") > 0);
ok('version v104 en cabecera y titulo', S.indexOf('VERSIÓN ACTUAL: v104') > 0 && S.indexOf('Check-in Pasos v104') > 0);
ok('HISTORIAL v104', S.indexOf('<!-- HISTORIAL: v104 -') > 0);

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
