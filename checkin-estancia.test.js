/* Prueba de checkin-pasos v114: la clave del wifi y el código de la keybox siguen a la estancia
   (Worker caspio-proxy v64.3-sec). Gary 23/10/2026: "shouldnt the guest be able to see the information
   once they checkin and then not after they check out?". El Worker ya no manda esas claves antes del día
   de llegada ni después del día de salida; la página dice por qué en vez de un guion, y lleva un botón al
   manual de la casa (manual-villa.html?Hostawayid=), que abre la clave con el check-in de este teléfono.
   node checkin-estancia.test.js

   Como unidad-oculta-antes.test.js: extrae las funciones reales del HTML y ejecuta P0render con un DOM
   falso. Los datos son inventados; nunca imprime datos de huéspedes. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var FILE = 'checkin-pasos.html', s = fs.readFileSync(FILE, 'utf8');
function fnSource(name) {
  var i = s.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = s.indexOf('{', i), depth = 0, k = j;
  for (; k < s.length; k++) { if (s[k] === '{') depth++; else if (s[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return s.slice(i, k);
}
console.log(FILE);

/* 1. Versión e historial */
ok('v114 en cabecera, título y PAGE_VERSION', /VERSIÓN ACTUAL: v114 \|/.test(s) && /<title>Check-in Pasos v114 — 3Villas<\/title>/.test(s) && s.indexOf('var PAGE_VERSION = 114;') > 0);
ok('historial v114 delante de la v113', /<!-- HISTORIAL: v114 - .*? \| v113 - /.test(s));

/* 2. Marcado y textos */
ok('botón del manual en la tarjeta del wifi, nace oculto', /id="p0KiWifiPw"[\s\S]{0,400}?<a class="kc-btn" id="p0KiManual" href="#" target="_blank" style="display:none" data-i18n-p0="kc_manual_btn">/.test(s));
['kc_manual_btn', 'kc_pw_arrival', 'kc_stay_over'].forEach(function (k) {
  ok(k + ' en los 8 idiomas', (s.match(new RegExp('\\b' + k + ':', 'g')) || []).length === 8);
});

/* 3. P0render con un DOM falso */
function El() { return { style: {}, textContent: '', innerHTML: '', href: '', className: '', classList: { toggle: function () {}, add: function () {}, remove: function () {}, contains: function () { return false; } } }; }
var TEXTS = { kc_unit_later: 'Numero el {date} a las {time}', kc_wifi_xx: 'Cambia XX', kc_apt: 'Apto', kc_addr_note: '{n}/{a}', step: 'Paso',
  done: 'ok', pending: 'no', greeting: 'Hola', thanks1: 'a', thanks2: 'b', units_lbl: 'u', keybox_countdown: 'El codigo el {date} a las {time}',
  kc_pw_arrival: 'LLEGADA', kc_stay_over: 'TERMINADA' };
function run(booking, nowIso) {
  var els = {}, copyShown = [];
  var c2 = {
    $: function (id) { return els[id] || (els[id] = El()); },
    document: { getElementById: function (id) { return c2.$(id); }, querySelector: function () { return null; } },
    window: {}, _code: 'TEST', _currentLang: 'es', _p0AllDone: false, _p0TabInit: true,
    tP0: function (k) { return TEXTS[k] || k; },
    _p0Key: function (k) { return k; }, isStep1Done: function () { return true; }, isStep4Done: function () { return true; },
    isTruthy: function () { return true; }, p0Step4PendingText: function () { return ''; }, _p0EarlyPaidMinutes: function () { return null; },
    _p0RenderKbPhotos: function () {}, _p0WifiCopyShow: function (pw) { copyShown.push(String(pw || '')); }, applyLangP0: function () {}, p0ShowTab: function () {},
    _p0CleanPh: function (x) { return x; }, _p0IsYacan: function () { return false; }
  };
  var RealDate = Date, fixed = new RealDate(nowIso).getTime();
  c2.Date = function () { return arguments.length ? new (Function.prototype.bind.apply(RealDate, [null].concat([].slice.call(arguments))))() : new RealDate(fixed); };
  c2.Date.now = function () { return fixed; };
  c2.Date.UTC = RealDate.UTC;
  vm.createContext(c2);
  ['_p0ParseCutoff', '_p0KeyboxVisible', '_p0KeyboxCountdown', '_p0MuIds', '_p0MuData', '_p0UnitLabel', '_p0UnitAddress', '_p0RenderUnit',
   'p0SplitVillaName', 'p0StreetNumber', '_p0RenderPlace', 'p0HasUnit', 'p0WifiGuest', '_p0RenderLater', 'p0StayText', '_p0RenderManual', 'P0render'].forEach(function (f) {
    vm.runInContext(fnSource(f), c2);
  });
  vm.runInContext('window._bookingData=null; P0render(' + JSON.stringify(booking) + ')', c2);
  els._copy = copyShown;
  return els;
}
var BASE = { TaVillas_Name_villa_para_inquilinos: 'VILLA PRUEBA', TaBookings2021_Guest_Full_Name: 'Prueba',
  TaBookings2021_Checkin: '2026-10-18', TaBookings2021_Checkin_time: '16:00', TaBookings2021_Checkout: '2026-10-21',
  TaVillas_Address: 'Cami Inventado 1', TaVillas_Wifi_user: 'RedPrueba', TaVillas_Hostawayid: 4242 };
function merge(a, b) { var o = {}, k; for (k in a) o[k] = a[k]; for (k in b) o[k] = b[k]; return o; }

/* Antes de llegar: el Worker no manda clave ni código */
var b = run(merge(BASE, { _stay: { phase: 'before', from: '2026-10-18', to: '2026-10-21' } }), '2026-10-12T12:00:00Z');
ok('antes de llegar: la clave del wifi dice que aparece el día de llegada', b.p0KiWifiPw.textContent === 'LLEGADA', b.p0KiWifiPw.textContent);
ok('antes de llegar: sin botón de copiar (nada que copiar)', b._copy.every(function (x) { return x === '' || x === '—'; }), JSON.stringify(b._copy));
ok('antes de llegar: el botón del manual ya sale, con el Hostawayid', b.p0KiManual.href === 'manual-villa.html?Hostawayid=4242' && b.p0KiManual.style.display === 'flex', b.p0KiManual.href + ' ' + b.p0KiManual.style.display);

/* Día de llegada, antes de la hora: la clave del wifi sale, el código todavía no (igual que hoy) */
var d0 = run(merge(BASE, { TaVillas_Wifi_password: 'wifi-de-prueba', TaVillas_Keybox_code: '1234', _stay: { phase: 'during' } }), '2026-10-18T08:00:00Z');
ok('día de llegada antes de la hora: clave del wifi', d0.p0KiWifiPw.textContent === 'wifi-de-prueba', d0.p0KiWifiPw.textContent);
ok('día de llegada antes de la hora: el código no sale', JSON.stringify(Object.keys(d0).map(function (k) { return d0[k].textContent; })).indexOf('1234') < 0);

/* Durante la estancia: todo como hoy */
var d1 = run(merge(BASE, { TaVillas_Wifi_password: 'wifi-de-prueba', TaVillas_Keybox_code: '1234', _stay: { phase: 'during' } }), '2026-10-19T12:00:00Z');
ok('durante: código de la keybox y clave del wifi', d1.p0KiKeybox.textContent === '1234' && d1.p0KiWifiPw.textContent === 'wifi-de-prueba', d1.p0KiKeybox.textContent + ' ' + d1.p0KiWifiPw.textContent);
ok('durante: botón del manual', d1.p0KiManual.href === 'manual-villa.html?Hostawayid=4242' && d1.p0KiManual.style.display === 'flex');

/* Después de la salida (hasta salida + 3 días la página sigue abierta) */
var a = run(merge(BASE, { _stay: { phase: 'after', from: '2026-10-18', to: '2026-10-21' } }), '2026-10-22T12:00:00Z');
ok('después: el código dice que la estancia ha terminado', a.p0KiKeybox.textContent === 'TERMINADA', a.p0KiKeybox.textContent);
ok('después: la clave del wifi dice que la estancia ha terminado', a.p0KiWifiPw.textContent === 'TERMINADA', a.p0KiWifiPw.textContent);

/* Sin _stay (Worker viejo) o sin Hostawayid: como antes */
var o = run(merge(BASE, { TaVillas_Wifi_password: 'wifi-de-prueba', TaVillas_Keybox_code: '1234', TaVillas_Hostawayid: '' }), '2026-10-19T12:00:00Z');
ok('sin _stay: claves como hoy', o.p0KiKeybox.textContent === '1234' && o.p0KiWifiPw.textContent === 'wifi-de-prueba');
ok('sin Hostawayid: el botón del manual no sale', o.p0KiManual.style.display === 'none', o.p0KiManual.style.display);
var o2 = run(merge(BASE, { _stay: { phase: 'unknown' } }), '2026-10-19T12:00:00Z');
ok('fase unknown: guion, como hoy', o2.p0KiWifiPw.textContent === '—' && o2.p0KiKeybox.textContent === '—', o2.p0KiWifiPw.textContent + ' ' + o2.p0KiKeybox.textContent);

/* El Hostawayid va como número, nunca como texto libre en el enlace */
var x = run(merge(BASE, { TaVillas_Hostawayid: '42"><b>' }), '2026-10-19T12:00:00Z');
ok('Hostawayid que no es número: sin botón', x.p0KiManual.style.display === 'none' && x.p0KiManual.href.indexOf('<') < 0);

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
