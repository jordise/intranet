/* Pruebas del early check-in por hora (checkin-pasos v100, notas-equipo-reservas v80,
   notas-villamanager v40). 15/09/2026: opcion 15:00 (Marta Deza, WhatsApp 15/09/2026). Caso: Marta Deza, WhatsApp 14/09/2026, reserva 66167362:
   early check-in a las 13:00 sin linea de cobro y el codigo no salio hasta las 15:55.
   node early-checkin-hora.test.js

   Como paso4-tasa-pagada.test.js: NO copia el codigo de la pagina. Extrae las funciones
   reales _p0EarlyPaidMinutes y _p0ParseCutoff de checkin-pasos.html y las ejecuta.
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
var ctx = { window: {} };
vm.runInNewContext(fnSource('_p0EarlyPaidMinutes') + '\n' + fnSource('_p0ParseCutoff'), ctx);
function early(row) { ctx.window._bookingData = row; return ctx._p0EarlyPaidMinutes(); }

console.log('_p0EarlyPaidMinutes: basta con la hora');
ok('sin datos de reserva -> null', early(null) === null);
ok('sin hora de early check-in -> null', early({ 'TaBookings2021_Checkin_earlycheckin': '' }) === null);
ok('hora sin formato -> null', early({ 'TaBookings2021_Checkin_earlycheckin': 'tarde' }) === null);
ok('13:00 SIN linea de cobro -> 12:55 (reserva 66167362)',
  early({ 'TaBookings2021_Checkin_earlycheckin': '13:00', 'TaBookings2021_Upselling1_cobrado': '0', 'TaBookings2021_Upselling1_text': '' }) === 12 * 60 + 55);
ok('13:00 con cobro de otra cosa -> 12:55',
  early({ 'TaBookings2021_Checkin_earlycheckin': '13:00', 'TaBookings2021_Upselling1_cobrado': '1', 'TaBookings2021_Upselling1_text': 'Cuna' }) === 12 * 60 + 55);
ok('13:00 con early check-in cobrado -> 12:55 (igual que antes)',
  early({ 'TaBookings2021_Checkin_earlycheckin': '13:00', 'TaBookings2021_Upselling2_cobrado': '1', 'TaBookings2021_Upselling2_text': 'Early check-in 13:00' }) === 12 * 60 + 55);
ok('14:00 (opcion nueva) -> 13:55', early({ 'Checkin_earlycheckin': '14:00' }) === 13 * 60 + 55);
ok('15:00 (opcion nueva 15/09) -> 14:55', early({ 'TaBookings2021_Checkin_earlycheckin': '15:00' }) === 14 * 60 + 55);
ok('08:00 -> 07:55', early({ 'TaBookings2021_Checkin_earlycheckin': '08:00' }) === 7 * 60 + 55);
ok('00:02 no baja de 0', early({ 'TaBookings2021_Checkin_earlycheckin': '00:02' }) === 0);
ok('la funcion ya no mira las lineas de cobro', fnSource('_p0EarlyPaidMinutes').indexOf('cobrado') < 0);

console.log('_p0ParseCutoff: regla "solo adelantar"');
var cut = fnSource('_p0ParseCutoff');
ok('sigue aplicando el early solo si es MAS TEMPRANO que la regla estandar', /early!==null&&early</.test(cut) || /early !== null && early </.test(cut));

console.log('desplegables: opciones 14:00 y 15:00');
['notas-equipo-reservas.html', 'notas-villamanager.html'].forEach(function (f) {
  var s = fs.readFileSync(f, 'utf8');
  var i = s.indexOf('<select id="fEarlyCheckin">'), j = s.indexOf('</select>', i);
  var sel = s.slice(i, j);
  ok(f + ': tiene la opcion 14:00', sel.indexOf('<option value="14:00">14:00</option>') > 0);
  ok(f + ': tiene la opcion 15:00', sel.indexOf('<option value="15:00">15:00</option>') > 0);
  ok(f + ': 15:00 es la ultima opcion', /<option value="15:00">15:00<\/option>\s*$/.test(sel));
  ok(f + ': conserva 08:00 a 13:00', ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00'].every(function (h) { return sel.indexOf('<option value="' + h + '">' + h + '</option>') > 0; }));
  ok(f + ': un solo desplegable fEarlyCheckin', s.split('id="fEarlyCheckin"').length === 2);
});
var R = fs.readFileSync('notas-equipo-reservas.html', 'utf8');
ok('notas-equipo-reservas: el texto de ayuda ya no exige una linea COBRADA', R.split('<!-- HISTORIAL:')[0].indexOf('SOLO si además hay una línea de cobro extra COBRADA') < 0);
ok('notas-equipo-reservas: el texto de ayuda dice 5 minutos antes', R.indexOf('se muestra al huésped 5 minutos antes de esa hora') > 0);

console.log('versiones');
ok('checkin-pasos v100', /VERSIÓN ACTUAL: v100 \|/.test(S) && S.indexOf('var PAGE_VERSION = 100;') > 0 && /<!-- HISTORIAL: v100 - /.test(S));
ok('notas-equipo-reservas v81', /VERSIÓN ACTUAL: v81 \|/.test(R) && R.indexOf('var PAGE_VERSION = 81;') > 0 && /<!-- HISTORIAL: v81 - /.test(R) && / \| v80 - /.test(R) && R.indexOf('<title>Notas Equipo Reservas v81') > 0);
var V = fs.readFileSync('notas-villamanager.html', 'utf8');
ok('notas-villamanager v41', /VERSIÓN ACTUAL: v41 \|/.test(V) && /<!-- HISTORIAL: v41 - /.test(V) && / \| v40 - /.test(V));

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
if (fail) process.exit(1);
