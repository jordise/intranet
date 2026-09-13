/* Pruebas del texto de la tarjeta del paso 4 cuando la ecotasa ya esta pagada (v99).
   Caso: Lluis, Nueva Intranet 13/09/2026: tasa pagada por Stripe, tarjeta
   "Tasa turistica · Pendiente" por el waiver sin cobrar.
   node paso4-tasa-pagada.test.js

   Como lugar-villa.test.js: NO copia el codigo de la pagina. Extrae las funciones reales
   p0Step4PendingText e isStep4Done y el bloque LANG_P0 de checkin-pasos.html y los ejecuta.
   Sin red, sin datos de huespedes. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var F = 'checkin-pasos.html', S = fs.readFileSync(F, 'utf8');
function fnSource(name) {
  var i = S.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = S.indexOf('{', i), depth = 0, k = j;
  for (; k < S.length; k++) { if (S[k] === '{') depth++; else if (S[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return S.slice(i, k);
}
var ctx = {};
var la = S.indexOf('var LANG_P0 = {};'), ca = S.indexOf('LANG_P0.ca = {', la), caEnd = S.indexOf('\n};', ca) + 3;
vm.runInNewContext(S.slice(la, caEnd) + '\n' + fnSource('isStep4Done') + '\n' + fnSource('p0Step4PendingText'), ctx);
var LANGS = ['en', 'es', 'fr', 'de', 'it', 'nl', 'pt', 'ca'];
function tx(lang) { return function (k) { return (ctx.LANG_P0[lang] && ctx.LANG_P0[lang][k]) || ctx.LANG_P0.en[k] || k; }; }

console.log('claves nuevas en los ocho idiomas');
LANGS.forEach(function (l) {
  var d = ctx.LANG_P0[l];
  ok(l + ': s4_desc_taxpaid_waiver con {amt}', typeof d.s4_desc_taxpaid_waiver === 'string' && d.s4_desc_taxpaid_waiver.indexOf('{amt}') > 0);
  ok(l + ': s4_desc_taxpaid_deposit con {amt}', typeof d.s4_desc_taxpaid_deposit === 'string' && d.s4_desc_taxpaid_deposit.indexOf('{amt}') > 0);
  ok(l + ': s4_desc_taxpaid_cardfee con {amt}', typeof d.s4_desc_taxpaid_cardfee === 'string' && d.s4_desc_taxpaid_cardfee.indexOf('{amt}') > 0);
});
ok('nl: el deposito se llama borg, como en el paso 3', ctx.LANG_P0.nl.s4_desc_taxpaid_deposit.indexOf('de borg,') > 0);
ok('pt: o depósito de segurança, como en el paso 3', ctx.LANG_P0.pt.s4_desc_taxpaid_deposit.indexOf('o depósito de segurança') > 0);

console.log('reserva con tasa pagada y waiver 57,33 sin cobrar');
var r1 = { TaBookings2021_Ecotasa_cobrada: 1, TaBookings2021_Security_deposit_options: 1, TaBookings2021_Se_permite_waver: 1,
  TaBookings2021_Deposit_waver_EUR: 57.33, TaBookings2021_Deposit_waver_cobrado: 0, TaBookings2021_Security_deposit_EUR: 900 };
ok('el paso 4 sigue pendiente (regla v79 intacta)', ctx.isStep4Done(r1) === false);
var es = ctx.p0Step4PendingText(r1, tx('es'), 'es');
ok('ES: dice que la tasa esta pagada y queda el waiver de 57,33 €', /^Tasa turística pagada\./.test(es) && es.indexOf('57,33 €') > 0 && es.indexOf('{amt}') < 0, es);
var en = ctx.p0Step4PendingText(r1, tx('en'), 'en');
ok('EN: punto decimal 57.33 €', /^Tourist tax paid\./.test(en) && en.indexOf('57.33 €') > 0, en);
LANGS.forEach(function (l) { var t = ctx.p0Step4PendingText(r1, tx(l), l); ok(l + ': texto no vacio y sin {amt}', t && t.indexOf('{amt}') < 0 && t.indexOf(l === 'en' ? '57.33' : '57,33') > 0, t); });

console.log('sin claves prefijadas (registro plano) funciona igual');
ok('claves planas', ctx.p0Step4PendingText({ Ecotasa_cobrada: '1', Security_deposit_options: '1', Se_permite_waver: '1', Deposit_waver_EUR: '57.33', Deposit_waver_cobrado: '' }, tx('es'), 'es').indexOf('57,33') > 0);

console.log('casos en los que NO cambia el texto');
ok('tasa sin pagar -> vacio', ctx.p0Step4PendingText({ TaBookings2021_Ecotasa_cobrada: 0, TaBookings2021_Security_deposit_options: 1, TaBookings2021_Se_permite_waver: 1, TaBookings2021_Deposit_waver_EUR: 57.33 }, tx('es'), 'es') === '');
ok('tasa pagada y waiver cobrado -> paso hecho, vacio', ctx.p0Step4PendingText({ TaBookings2021_Ecotasa_cobrada: 1, TaBookings2021_Security_deposit_options: 1, TaBookings2021_Se_permite_waver: 1, TaBookings2021_Deposit_waver_EUR: 57.33, TaBookings2021_Deposit_waver_cobrado: 1 }, tx('es'), 'es') === '');
ok('opcion 3 transferencia -> vacio', ctx.p0Step4PendingText({ TaBookings2021_Ecotasa_cobrada: 1, TaBookings2021_Security_deposit_options: 3 }, tx('es'), 'es') === '');
ok('registro nulo -> vacio', ctx.p0Step4PendingText(null, tx('es'), 'es') === '');
ok('idioma sin variante -> vacio (se queda el texto de siempre)', ctx.p0Step4PendingText(r1, function (k) { return k; }, 'es') === '');

console.log('opcion 2: deposito con tarjeta pendiente');
var r2 = { TaBookings2021_Ecotasa_cobrada: 1, TaBookings2021_Security_deposit_options: 2, TaBookings2021_Security_deposit_EUR: 900, TaBookings2021_Security_deposit_cobrado: 0,
  TaBookings2021_Gasto_tarjeta_deposito_seguridad: 27.58, TaBookings2021_Gasto_tarjeta_dep_seguri_cobrado: 0 };
var d2 = ctx.p0Step4PendingText(r2, tx('es'), 'es');
ok('ES: deposito + gastos de tarjeta = 927,58 €', d2.indexOf('depósito de seguridad') > 0 && d2.indexOf('927,58 €') > 0, d2);
var r3 = Object.assign({}, r2, { TaBookings2021_Security_deposit_cobrado: 1 });
var d3 = ctx.p0Step4PendingText(r3, tx('es'), 'es');
ok('solo los gastos de tarjeta pendientes: texto propio con 27,58 €', d3.indexOf('gastos de tarjeta') > 0 && d3.indexOf('27,58 €') > 0 && d3.indexOf('depósito de seguridad:') < 0, d3);
ok('solo el deposito pendiente (gastos ya cobrados) = 900,00 €', ctx.p0Step4PendingText(Object.assign({}, r2, { TaBookings2021_Gasto_tarjeta_dep_seguri_cobrado: 1 }), tx('es'), 'es').indexOf('900,00 €') > 0);
ok('paso 4 coherente: pendiente con deposito sin cobrar', ctx.isStep4Done(r2) === false);

console.log('cableado en la pagina');
ok('la tarjeta del paso 4 usa p0Step4PendingText al pintar', /if\(n===4\)\{[\s\S]{0,400}p0Step4PendingText\(r,tP0,_currentLang\)/.test(S));
ok('applyLangP0 vuelve a aplicar el texto al cambiar de idioma', /function applyLangP0\(lang\)\{[\s\S]*?p0Step4PendingText\(bd4,tP0,lang\)/.test(S));
ok('la funcion se expone en window', S.indexOf('window.p0Step4PendingText=p0Step4PendingText;') > 0);
ok('versión v99 en cabecera, título, PAGE_VERSION e historial', /VERSIÓN ACTUAL: v99 \|/.test(S) && /<title>Check-in Pasos v99/.test(S) && S.indexOf('var PAGE_VERSION = 99;') > 0 && /<!-- HISTORIAL: v99 - /.test(S));

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
