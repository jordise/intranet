/* Pruebas de las horas de la isla obligatorias con casilla de escape (checkin-pasos v105).
   Caso: Jordi, WhatsApp 25/09/2026: la hora de llegada y la de salida del vuelo o barco
   deben ser obligatorias; el huesped que ya esta en la isla o se queda marca una casilla.
   node isla-hora-obligatoria.test.js

   Como salida-hora-orden.test.js: NO copia el codigo de la pagina. Extrae las funciones
   reales _p0IslandState, _p0IslandValue y _p0IslandOk de checkin-pasos.html.
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
var ARR = 'Ya aquí', DEP = 'Se queda';
var ctx = {};
vm.runInNewContext("var ARR_HERE_ARR='Ya aquí';\nvar DEP_STAY_ARR='Se queda';\n" + fnSource('_p0IslandState') + '\n' + fnSource('_p0IslandValue') + '\n' + fnSource('_p0IslandOk'), ctx);

console.log('constantes en la pagina');
ok("ARR_HERE_ARR = 'Ya aquí'", S.indexOf("var ARR_HERE_ARR='Ya aquí';") > 0);
ok("DEP_STAY_ARR = 'Se queda'", S.indexOf("var DEP_STAY_ARR='Se queda';") > 0);

console.log('_p0IslandState: lee el valor guardado');
var st = ctx._p0IslandState('Ya aquí', ARR);
ok("'Ya aquí' -> here true, time ''", st.here === true && st.time === '', JSON.stringify(st));
st = ctx._p0IslandState('09:00', ARR);
ok("'09:00' -> here false, time '09:00'", st.here === false && st.time === '09:00', JSON.stringify(st));
st = ctx._p0IslandState('', ARR);
ok("'' -> here false, time ''", st.here === false && st.time === '', JSON.stringify(st));
st = ctx._p0IslandState(null, ARR);
ok("null -> here false, time ''", st.here === false && st.time === '', JSON.stringify(st));
st = ctx._p0IslandState(undefined, ARR);
ok("undefined -> here false, time ''", st.here === false && st.time === '', JSON.stringify(st));
st = ctx._p0IslandState(' Se queda ', DEP);
ok("' Se queda ' -> here true", st.here === true && st.time === '', JSON.stringify(st));
st = ctx._p0IslandState('Se queda', ARR);
ok("'Se queda' con la marca de llegada -> here false (cada casilla su marca)", st.here === false, JSON.stringify(st));

console.log('_p0IslandValue: valor que se guarda');
ok("marcada -> 'Ya aquí'", ctx._p0IslandValue(true, '09:00', ARR) === 'Ya aquí');
ok("marcada, salida -> 'Se queda'", ctx._p0IslandValue(true, '', DEP) === 'Se queda');
ok("sin marcar, '09:00' -> '09:00'", ctx._p0IslandValue(false, '09:00', ARR) === '09:00');
ok("sin marcar, '' -> null", ctx._p0IslandValue(false, '', ARR) === null);
ok("sin marcar, '  ' -> null", ctx._p0IslandValue(false, '  ', ARR) === null);

console.log('_p0IslandOk: se puede guardar');
ok("marcada, sin hora -> true", ctx._p0IslandOk(true, '') === true);
ok("sin marcar, sin hora -> false", ctx._p0IslandOk(false, '') === false);
ok("sin marcar, '09:00' -> true", ctx._p0IslandOk(false, '09:00') === true);
ok("sin marcar, '  ' -> false", ctx._p0IslandOk(false, '  ') === false);

console.log('pagina: marcado');
ok('id="fArrHere" una vez', S.split('id="fArrHere"').length === 2);
ok('id="fDepStay" una vez', S.split('id="fDepStay"').length === 2);
ok('las etiquetas de los vuelos llevan el asterisco de obligatorio',
  S.indexOf('<span data-i18n="lbl_arr_time">Flight or ferry arrival to Menorca</span><span class="req">*</span>') > 0 &&
  S.indexOf('<span data-i18n="lbl_dep_time">Flight or ferry departure from Menorca</span><span class="req">*</span>') > 0);
ok('fArrHere va justo debajo de fArrivalTime', /id="fArrivalTime"[^\n]*\n\s*<label class="chk-row"><input type="checkbox" id="fArrHere">/.test(S));
ok('fDepStay va justo debajo de fDepartureTime', /id="fDepartureTime"[^\n]*\n\s*<label class="chk-row"><input type="checkbox" id="fDepStay">/.test(S));

console.log('pagina: textos en 8 idiomas');
['lbl_arr_here', 'lbl_dep_stay', 'err_arr_required', 'err_dep_required'].forEach(function (k) {
  var n = (S.match(new RegExp(k + ':', 'g')) || []).length;
  ok(k + ' en 8 idiomas', n === 8, n);
});
var a = S.indexOf('var LANG_PLACE={'), b = S.indexOf('\n};', a), LP = S.slice(a, b);
ok("LANG_PLACE at:'in Menorca'", LP.indexOf("at:'in Menorca'") > 0);
ok("LANG_PLACE at:'en Menorca'", LP.indexOf("at:'en Menorca'") > 0);
ok("LANG_PLACE at:'auf Menorca'", LP.indexOf("at:'auf Menorca'") > 0);
ok("LANG_PLACE at:'in Barcelona'", LP.indexOf("at:'in Barcelona'") > 0);
ok("LANG_PLACE 24 frases at:", (LP.match(/at:'/g) || []).length === 24, (LP.match(/at:'/g) || []).length);
/* bloque LUGAR_VILLA completo (el '{' dentro de _fillPlace confunde a fnSource) */
var lv0 = S.indexOf('/* LUGAR_VILLA begin */'), lv1 = S.indexOf('/* LUGAR_VILLA end */');
var LV = S.slice(lv0, lv1);
var fp0 = LV.indexOf('function _fillPlace('), FP = LV.slice(fp0, LV.indexOf('\nfunction ', fp0 + 1));
ok('_fillPlace rellena {atPlace} con p.at', FP.indexOf(".replace('{atPlace}',p.at)") > 0, FP);
var apl = fnSource('applyPlaceLabels');
ok('applyPlaceLabels incluye lbl_arr_here y lbl_dep_stay', apl.indexOf("'lbl_arr_here'") > 0 && apl.indexOf("'lbl_dep_stay'") > 0);

/* tArr real con el lugar: la etiqueta y el aviso salen con la frase 'at' */
var la = S.indexOf('var LANG_ARR={};'), ca = S.indexOf('LANG_ARR.ca={', la), caEnd = S.indexOf('\n};', ca) + 3;
var c2 = { _currentLang: 'en', document: { querySelector: function () { return null; } } };
vm.runInNewContext(S.slice(la, caEnd) + '\n' + LV + '\n' + fnSource('tArr') + '\nthis.t=tArr;this.set=function(l,p){_currentLang=l;_villaPlace=p;};', c2);
c2.set('en', 'menorca');
ok('EN Menorca: casilla de llegada', c2.t('lbl_arr_here') === 'We are already in Menorca, no arrival flight or ferry', c2.t('lbl_arr_here'));
ok('EN Menorca: aviso de llegada', c2.t('err_arr_required') === 'Please select the arrival time of your flight or ferry to Menorca, or tick the box if you are already in Menorca.', c2.t('err_arr_required'));
c2.set('es', 'barcelona');
ok('ES Barcelona: casilla de salida', c2.t('lbl_dep_stay') === 'Nos quedamos en Barcelona después de salir de la casa, sin vuelo ni barco ese día', c2.t('lbl_dep_stay'));
c2.set('de', 'mallorca');
ok('DE Mallorca: aviso de salida', c2.t('err_dep_required') === 'Bitte wählen Sie die Abfahrtszeit Ihres Fluges oder Ihrer Fähre von Mallorca, oder kreuzen Sie das Kästchen an, wenn Sie an dem Tag auf Mallorca bleiben.', c2.t('err_dep_required'));
var sinLlave = true;
['en', 'es', 'fr', 'de', 'it', 'nl', 'pt', 'ca'].forEach(function (l) {
  ['menorca', 'mallorca', 'barcelona'].forEach(function (p) {
    c2.set(l, p);
    ['lbl_arr_here', 'lbl_dep_stay', 'err_arr_required', 'err_dep_required'].forEach(function (k) { if (/\{|\}/.test(c2.t(k))) sinLlave = false; });
  });
});
ok('ningun texto nuevo deja {…} sin rellenar (8 idiomas x 3 lugares)', sinLlave);

console.log('pagina: cableado v105');
var sub = fnSource('submitForm');
var iReq = sub.indexOf("tArr('err_required')"), iArr = sub.indexOf("_p0IslandOk($('fArrHere').checked, $('fArrivalTime').value)"),
  iDep = sub.indexOf("_p0IslandOk($('fDepStay').checked, $('fDepartureTime').value)"), iExit = sub.indexOf('_p0ExitTimesOk(');
ok('las dos comprobaciones de la isla estan en submitForm', iArr > 0 && iDep > 0);
ok('van DESPUES de err_required', iReq > 0 && iArr > iReq && iDep > iReq);
ok('van ANTES de _p0ExitTimesOk', iExit > 0 && iArr < iExit && iDep < iExit);
ok('avisos err_arr_required y err_dep_required', sub.indexOf("tArr('err_arr_required')") > 0 && sub.indexOf("tArr('err_dep_required')") > 0);
ok('el array required no cambia',
  sub.indexOf("const required=['fAdults','fCheckinTime','fCheckoutTime','fFname','fLname','fDni','fAddress','fCity','fCountry'];") > 0);
ok('payload Arrival_Time_to_Menorca con _p0IslandValue',
  /Arrival_Time_to_Menorca:\s*_p0IslandValue\(\$\('fArrHere'\)\.checked, \$\('fArrivalTime'\)\.value, ARR_HERE_ARR\)/.test(sub));
ok('payload Departure_Time_to_Menorca con _p0IslandValue',
  /Departure_Time_to_Menorca:\s*_p0IslandValue\(\$\('fDepStay'\)\.checked, \$\('fDepartureTime'\)\.value, DEP_STAY_ARR\)/.test(sub));
var ren = fnSource('renderArr');
ok('renderArr lee la marca guardada con _p0IslandState',
  ren.indexOf("_p0IslandState(g('TaBookings2021_Arrival_Time_to_Menorca'), ARR_HERE_ARR)") > 0 &&
  ren.indexOf("_p0IslandState(g('TaBookings2021_Departure_Time_to_Menorca'), DEP_STAY_ARR)") > 0);
ok('renderArr aplica las casillas despues de fillHoursArr y del bucle de pre-relleno',
  ren.indexOf('_p0IslandState(') > ren.indexOf("fillHoursArr('fDepartureTime'") && ren.indexOf('_p0IslandState(') > ren.indexOf('_p0CheckoutDefault('));
ok('las dos casillas llaman a _p0IslandToggle al cambiar',
  ren.indexOf("$('fArrHere').onchange=function(){ _p0IslandToggle('fArrHere','fArrivalTime'); }") > 0 &&
  ren.indexOf("$('fDepStay').onchange=function(){ _p0IslandToggle('fDepStay','fDepartureTime'); }") > 0);
var tg = fnSource('_p0IslandToggle');
ok('_p0IslandToggle vacia, apaga y gris; y vuelve a encender', /s\.value='';\s*s\.disabled=true;\s*s\.classList\.add\('sel-off'\)/.test(tg) && /s\.disabled=false;\s*s\.classList\.remove\('sel-off'\)/.test(tg));
ok('estilo .sel.sel-off y .chk-row en la pagina', S.indexOf('.sel.sel-off{') > 0 && S.indexOf('.chk-row{') > 0);

console.log('pagina: version');
ok('v105 en cabecera', /VERSIÓN ACTUAL: v105 \|/.test(S));
ok('v105 en titulo', S.indexOf('<title>Check-in Pasos v105 — 3Villas</title>') > 0);
ok('PAGE_VERSION 105', S.indexOf('var PAGE_VERSION = 105;') > 0);
ok('HISTORIAL empieza en v105 y conserva la v104', S.indexOf('<!-- HISTORIAL: v105 - ') > 0 && S.indexOf(' | v104 - ') > 0);

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
