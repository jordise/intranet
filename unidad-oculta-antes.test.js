/* Prueba de checkin-pasos v112: antes de la hora del código el huésped no ve el número de su unidad ni su
   dirección propia; la red wifi sale sin la nota interna "(cambiar XX por número de villa)".
   Marta, feel good 12/10/2026 14:00: un huésped de Menorca Sur Special que llega el 18 ya veía "Villa Nr. 20".
   node unidad-oculta-antes.test.js

   Como unidad-direccion.test.js: NO copia el código de la página. Extrae las funciones reales del HTML y
   ejecuta P0render con un DOM falso. Los datos son inventados; nunca imprime datos de huéspedes. */
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
ok('v112 en cabecera, título y PAGE_VERSION', /VERSIÓN ACTUAL: v112 \|/.test(s) && /<title>Check-in Pasos v112/.test(s) && s.indexOf('var PAGE_VERSION = 112;') > 0);
ok('historial v112 delante de la v111', /<!-- HISTORIAL: v112 - .*? \| v111 - /.test(s));

/* 2. Marcado y textos */
ok('#p0KiUnitLater debajo de #p0KiUnit y nace oculto', /id="p0KiUnit"[^\n]*\n\s*<div class="kc-addr-note" id="p0KiUnitLater" style="display:none">/.test(s));
ok('#p0KiWifiNote debajo de la red wifi y nace oculto', /id="p0KiWifi">—<\/span><\/div>\s*<div class="kc-addr-note" id="p0KiWifiNote" style="display:none">/.test(s));
ok('kc_unit_later con {date} y {time} en los 8 idiomas', (s.match(/kc_unit_later:'[^\n]*?\{date\}[^\n]*?\{time\}[^\n]*?', kc_wifi_xx:/g) || []).length === 8);
ok('kc_wifi_xx con XX en los 8 idiomas', (s.match(/kc_wifi_xx:['"][^'"]*XX/g) || []).length === 8);
ok('applyLangP0 vuelve a pintar las notas', /_p0RenderLater\(window\._bookingData\)/.test(fnSource('applyLangP0')));

/* 3. p0WifiGuest */
var ctx = {};
vm.createContext(ctx);
vm.runInContext(fnSource('p0WifiGuest'), ctx);
function wg(x) { return vm.runInContext('p0WifiGuest(' + JSON.stringify(x) + ')', ctx); }
var a = wg('VillaMenorcaSurXX (cambiar XX por número de villa)');
ok('Menorca Sur: quita la nota interna y marca XX', a.net === 'VillaMenorcaSurXX' && a.xx === true, JSON.stringify(a));
var b = wg('SunsetXX');
ok('Sunsets: sin paréntesis, marca XX', b.net === 'SunsetXX' && b.xx === true);
var c = wg('Casa Pepe (5G)');
ok('un paréntesis normal se queda', c.net === 'Casa Pepe (5G)' && c.xx === false);
ok('vacío y nulo -> vacío', wg('').net === '' && wg(null).net === '');

/* 4. P0render con un DOM falso */
function El() { return { style: {}, textContent: '', innerHTML: '', href: '', className: '', classList: { toggle: function () {}, add: function () {}, remove: function () {}, contains: function () { return false; } } }; }
function run(booking, nowIso) {
  var els = {};
  var c2 = {
    $: function (id) { return els[id] || (els[id] = El()); },
    document: { getElementById: function (id) { return c2.$(id); }, querySelector: function () { return null; } },
    window: {}, _code: 'TEST', _currentLang: 'es', _p0AllDone: false, _p0TabInit: true,
    tP0: function (k) { return { kc_unit_later: 'Numero el {date} a las {time}', kc_wifi_xx: 'Cambia XX', kc_apt: 'Apto', kc_addr_note: '{n}/{a}', step: 'Paso', done: 'ok', pending: 'no', greeting: 'Hola', thanks1: 'a', thanks2: 'b', units_lbl: 'u', keybox_countdown: 'El codigo el {date} a las {time}' }[k] || k; },
    _p0Key: function (k) { return k; }, isStep1Done: function () { return true; }, isStep4Done: function () { return true; },
    isTruthy: function () { return true; }, p0Step4PendingText: function () { return ''; }, _p0EarlyPaidMinutes: function () { return null; },
    _p0RenderKbPhotos: function () {}, _p0WifiCopyShow: function () {}, applyLangP0: function () {}, p0ShowTab: function () {},
    _p0CleanPh: function (x) { return x; }, _p0IsYacan: function () { return false; }
  };
  var RealDate = Date, fixed = new RealDate(nowIso).getTime();
  c2.Date = function () { return arguments.length ? new (Function.prototype.bind.apply(RealDate, [null].concat([].slice.call(arguments))))() : new RealDate(fixed); };
  c2.Date.now = function () { return fixed; };
  c2.Date.UTC = RealDate.UTC;
  vm.createContext(c2);
  ['_p0ParseCutoff', '_p0KeyboxVisible', '_p0KeyboxCountdown', '_p0MuIds', '_p0MuData', '_p0UnitLabel', '_p0UnitAddress', '_p0RenderUnit',
   'p0SplitVillaName', 'p0StreetNumber', '_p0RenderPlace', 'p0HasUnit', 'p0WifiGuest', '_p0RenderLater', 'P0render'].forEach(function (f) {
    vm.runInContext(fnSource(f), c2);
  });
  c2.window._bookingData = null;
  vm.runInContext('window._bookingData=null; P0render(' + JSON.stringify(booking) + ')', c2);
  return els;
}
var SPECIAL = {
  TaVillas_Name_villa_para_inquilinos: 'VILLA SPECIAL', TaBookings2021_Guest_Full_Name: 'Prueba',
  TaBookings2021_Checkin: '2026-10-18', TaBookings2021_Checkin_time: '16:00',
  TaVillas_Address: 'Urbanizacion Torre Soli Nou, 07730', TaVillas_Googlemaps_link: 'https://maps.example.test/villa',
  TaVillas_Wifi_user: 'VillaMenorcaSurXX (cambiar XX por número de villa)', TaVillas_Wifi_password: 'pw',
  TaBookings2021_PMSmultiunitID: '18483', TaMultiunits_descripcion: 'Villa Nr. 20',
  TaMultiunits_Address: 'Carrer de Xaloc, 20, 07730 Alaior', TaMultiunits_Googlemaps_link: 'https://maps.example.test/v20',
  TaMultiunits_Keybox: '1234'
};
var before = run(SPECIAL, '2026-10-12T12:00:00Z');
var allText = Object.keys(before).map(function (k) { return before[k].textContent + ' ' + before[k].innerHTML + ' ' + before[k].href; }).join(' | ');
ok('antes de la hora: no sale "Villa Nr. 20" en ningún sitio', allText.indexOf('Villa Nr. 20') < 0);
ok('antes de la hora: no sale la dirección de la unidad', allText.indexOf('Xaloc, 20') < 0 && allText.indexOf('maps.example.test/v20') < 0);
ok('antes de la hora: dirección y mapa de la villa', before.p0KiAddr.textContent === 'Urbanizacion Torre Soli Nou, 07730' && before.p0KiMaps.href === 'https://maps.example.test/villa');
ok('antes de la hora: el número de la unidad oculto', before.p0KiUnit.style.display === 'none');
ok('antes de la hora: la línea "aparece el ... a las ..." visible', before.p0KiUnitLater.style.display === 'block' && before.p0KiUnitLater.textContent === 'Numero el 18/10/2026 a las 15:55', before.p0KiUnitLater.textContent);
ok('antes de la hora: el código no sale', allText.indexOf('1234') < 0);
ok('la red wifi sin la nota interna, con la línea del XX', before.p0KiWifi.textContent === 'VillaMenorcaSurXX' && before.p0KiWifiNote.style.display === 'block' && allText.indexOf('cambiar XX') < 0);

var after = run(SPECIAL, '2026-10-18T14:00:00Z');
ok('a la hora del código: sale el número de la unidad', after.p0KiUnit.textContent === 'Villa Nr. 20' && after.p0KiUnit.style.display === 'inline-block');
ok('a la hora del código: dirección y mapa de la unidad', after.p0KiAddr.textContent === 'Carrer de Xaloc, 20, 07730 Alaior' && after.p0KiMaps.href === 'https://maps.example.test/v20');
ok('a la hora del código: la línea de espera oculta', after.p0KiUnitLater.style.display === 'none');
ok('a la hora del código: la red wifi sigue sin la nota interna', after.p0KiWifi.textContent === 'VillaMenorcaSurXX');

var PLAIN = { TaVillas_Name_villa_para_inquilinos: 'APARTAMENTO ALCOR 113', TaBookings2021_Checkin: '2026-10-18', TaBookings2021_Checkin_time: '16:00',
  TaVillas_Address: 'Tramontana 210', TaVillas_Googlemaps_link: 'https://maps.example.test/alcor', TaVillas_Wifi_user: 'Alcor', TaVillas_Keybox_code: '9' };
var p = run(PLAIN, '2026-10-12T12:00:00Z');
ok('villa sin unidades: nada cambia (dirección, mapa, sin línea de espera, sin línea XX)',
  p.p0KiAddr.textContent === 'Tramontana 210' && p.p0KiMaps.href === 'https://maps.example.test/alcor' && p.p0KiUnitLater.style.display === 'none' && p.p0KiWifiNote.style.display === 'none' && p.p0KiWifi.textContent === 'Alcor');
ok('villa sin unidades: la píldora del nombre sigue (nombre fijo del anuncio)', p.p0KiVillaPill.textContent === 'Apto 113');

console.log('\n' + pass + ' passed, ' + fail + ' failed');
process.exit(fail ? 1 : 0);
