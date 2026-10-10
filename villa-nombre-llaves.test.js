/* Prueba del nombre de la villa en la pestaña Llaves de checkin-pasos.html (v109, v110, v111).
   Cristian, Feel Good 09/10/2026 y 10/10/2026: los huéspedes del Apartamento Alcor leían el 210 de la
   dirección como número de apartamento; la página no mostraba el nombre del alojamiento (v109), luego lo
   pintaba casi blanco (v110), y en la v111 la pestaña pasa a tres tarjetas (Dónde estás, llaves, wifi) con
   el número del apartamento en una píldora roja y la nota "El 210 es el número de la calle".
   node villa-nombre-llaves.test.js

   Como lugar-villa.test.js: NO copia el código de la página. Lee el HTML, extrae las funciones puras y las
   ejecuta con vm. Nunca imprime datos de huéspedes. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var f = 'checkin-pasos.html', s = fs.readFileSync(f, 'utf8');
function fnSource(name) {
  var i = s.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name + ' en ' + f);
  var j = s.indexOf('{', i), depth = 0, k = j;
  for (; k < s.length; k++) { if (s[k] === '{') depth++; else if (s[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return s.slice(i, k);
}

console.log(f);
ok('v111 en PAGE_VERSION, cabecera y titulo', /var PAGE_VERSION = 111;/.test(s) && /VERSIÓN ACTUAL: v111 \|/.test(s) && /<title>Check-in Pasos v111/.test(s));
ok('historial v111 delante de v110 y conserva la v109', /<!-- HISTORIAL: v111 - .*? \| v110 - .*? \| v109 - /.test(s));

/* 1. Marcado: tres tarjetas en orden Dónde estás, llaves, wifi; el bloque del villa manager despues */
var iReady = s.indexOf('id="p0KeysReady"'), iPlace = s.indexOf('id="p0KcPlace"'), iKey = s.indexOf('id="p0KiKeyboxRow"'),
    iWifi = s.indexOf('id="p0KcWifi"'), iDuring = s.indexOf('id="p0DuringKeys"'), iPend = s.indexOf('id="p0KeysPending"');
ok('orden de tarjetas: Dónde estás, llaves, wifi, y despues el villa manager', iReady > 0 && iReady < iPlace && iPlace < iKey && iKey < iWifi && iWifi < iDuring && iDuring < iPend, [iPlace, iKey, iWifi, iDuring].join('/'));
function between(id, a, b) { var i = s.indexOf('id="' + id + '"'); return i > a && i < b; }
ok('nombre, píldora, dirección, nota, unidad y Maps en la tarjeta Dónde estás',
  ['p0KiVilla', 'p0KiVillaPill', 'p0KiAddr', 'p0KiAddrNote', 'p0KiUnit', 'p0KiMaps'].every(function (id) { return between(id, iPlace, iKey); }));
ok('código, cuenta atrás y fotos en la tarjeta de llaves',
  ['p0KiKeybox', 'p0KiKeyboxCountdown', 'p0KbPhotosRow', 'p0KbPhotosGrid'].every(function (id) { return between(id, iKey, iWifi); }));
ok('red, contraseña y Copiar en la tarjeta wifi',
  ['p0KiWifi', 'p0KiWifiPw', 'p0KiWifiCopy'].every(function (id) { return between(id, iWifi, iDuring); }));
['p0KiVillaPill', 'p0KiAddrNote', 'p0KiWifiCopy'].forEach(function (id) {
  ok('existe #' + id + ' y nace oculto', new RegExp('id="' + id + '"[^>]*style="display:none"').test(s));
});
ok('el botón de Maps conserva el id, nace oculto y lleva texto i18n', /<a class="kc-btn" id="p0KiMaps" href="#" target="_blank" style="display:none" data-i18n-p0="kc_maps_btn">/.test(s));
ok('Copiar es un botón que llama a p0CopyWifi', /<button type="button" class="kc-copy" id="p0KiWifiCopy" style="display:none" onclick="p0CopyWifi\(\)">/.test(s));
ok('el span del nombre queda oculto hasta tener nombre', /id="p0KiVilla" style="display:none;/.test(s));
/* v110: el color del nombre es el oscuro de la paleta (gray-5), nunca gray-1 (#f9fafb, casi blanco; Cristian 10/10/2026 no lo veia) */
var kvStyle = (s.match(/id="p0KiVilla" style="([^"]*)"/) || [])[1] || '';
ok('el nombre se pinta en gray-5 (oscuro), no en gray-1 (casi blanco)', /color:var\(--gray-5[,)]/.test(kvStyle) && kvStyle.indexOf('--gray-1') < 0, kvStyle);
ok('gray-5 es el color oscuro de la paleta de esta pagina', /--gray-5:#212529;/.test(s) && /--gray-1:#f9fafb;/.test(s));
var kcName = (s.match(/#paso0 \.kc-name\{([^}]*)\}/) || [])[1] || '';
ok('la clase del nombre: Montserrat 20px, 900, gray-5', /font-size:20px/.test(kcName) && /font-weight:900/.test(kcName) && /color:var\(--gray-5\)/.test(kcName) && kcName.indexOf('--gray-1') < 0, kcName);
var kcPill = (s.match(/#paso0 \.kc-pill\{([^}]*)\}/) || [])[1] || '';
ok('la píldora: fondo rojo, texto blanco, forma de píldora', /background:var\(--red\)/.test(kcPill) && /color:#fff/.test(kcPill) && /border-radius:999px/.test(kcPill), kcPill);
var kcBtn = (s.match(/#paso0 \.kc-btn\{([^}]*)\}/) || [])[1] || '', kcCopy = (s.match(/#paso0 \.kc-copy\{([^}]*)\}/) || [])[1] || '';
ok('zonas de toque de 44 px o mas (Maps y Copiar)', /min-height:4[4-9]px/.test(kcBtn) && /min-height:44px/.test(kcCopy));
ok('el código en móvil (420 px) sigue con su regla propia', /@media\(max-width:420px\)\{[^@]*#paso0 \.kc-code\{font-size:28px;letter-spacing:5px/.test(s));

/* 2. Relleno: las dos líneas v109 se sustituyen por _p0RenderPlace en los dos estados */
var p0 = fnSource('P0render');
ok('relleno con _p0RenderPlace en los dos estados de la pestaña (llaves visibles y cuenta atras)', (p0.match(/_p0RenderPlace\(r\);/g) || []).length === 2);
ok('la línea de relleno de la v109 ya no está', p0.indexOf("var _kv=$('p0KiVilla')") < 0);
ok('el botón Copiar se muestra u oculta en los dos estados', (p0.match(/_p0WifiCopyShow\(wifiP\);/g) || []).length === 2);
ok('applyLangP0 vuelve a pintar la píldora y la nota', /_p0RenderPlace\(window\._bookingData\)/.test(fnSource('applyLangP0')));
ok('_p0RenderPlace usa textContent (sin HTML del dato)', fnSource('_p0RenderPlace').indexOf('innerHTML') < 0);
ok('Yacan: el título y la etiqueta de la tarjeta pasan a la puerta', /keybox_ttl:'door_ttl'/.test(s) && /kc_keys_lbl:'kc_access_lbl'/.test(s));

/* 3. Diccionario: los 8 idiomas */
var L = (function () {
  var a = s.indexOf('var LANG_P0 = {};'), b = s.indexOf('function tP0(');
  var ctx = {}; vm.runInNewContext(s.slice(a, b) + '\nthis.LANG_P0 = LANG_P0;', ctx); return ctx.LANG_P0;
})();
var langs = ['es', 'en', 'de', 'fr', 'it', 'nl', 'pt', 'ca'];
ok('el diccionario tiene los 8 idiomas', langs.every(function (l) { return L[l]; }) && Object.keys(L).length === 8, Object.keys(L).join(','));
ok('la nota del número de la calle existe en los 8 idiomas con {n} y {a}', langs.every(function (l) { var t = L[l].kc_addr_note; return typeof t === 'string' && t.indexOf('{n}') >= 0 && t.indexOf('{a}') >= 0; }));
ok('nota en español: "El {n} es el número de la calle. Tu apartamento es el {a}."', L.es.kc_addr_note === 'El {n} es el número de la calle. Tu apartamento es el {a}.');
var apt = { es: 'Apto', pt: 'Apto', en: 'Apt', ca: 'Apt', de: 'Whg.', fr: 'Appt', it: 'Int.', nl: 'App.' };
ok('etiqueta de la píldora en los 8 idiomas', langs.every(function (l) { return L[l].kc_apt === apt[l]; }));
var keys = ['kc_prop_lbl', 'kc_prop_ttl', 'kc_maps_btn', 'kc_keys_lbl', 'kc_access_lbl', 'keybox_ttl', 'door_ttl', 'kc_wifi_lbl', 'kc_wifi_ttl', 'kc_wifi_net', 'kc_copy', 'kc_copied'];
ok('textos nuevos de las tarjetas en los 8 idiomas', langs.every(function (l) { return keys.every(function (k) { return typeof L[l][k] === 'string' && L[l][k]; }); }));
ok('español: Dónde estás, Código del keybox, Wifi de la casa, Red, Copiar, Abrir en Google Maps',
  L.es.kc_prop_ttl === 'Dónde estás' && L.es.keybox_ttl === 'Código del keybox' && L.es.kc_wifi_ttl === 'Wifi de la casa' && L.es.kc_wifi_net === 'Red' && L.es.kc_copy === 'Copiar' && L.es.kc_maps_btn === '📍 Abrir en Google Maps');
ok('todo data-i18n-p0 de las tarjetas tiene texto en ingles', (s.slice(iPlace, iDuring).match(/data-i18n-p0="([^"]+)"/g) || []).every(function (m) { return typeof L.en[m.slice(14, -1)] === 'string'; }));

/* 4. Funciones puras con vm */
var c = {}; vm.runInNewContext(fnSource('p0SplitVillaName') + '\n' + fnSource('p0StreetNumber'), c);
function sp(raw) { var r = c.p0SplitVillaName(raw); return r.name + '|' + r.num; }
ok('APARTAMENTO ALCOR 113 -> Apartamento Alcor | 113', sp('APARTAMENTO ALCOR 113') === 'Apartamento Alcor|113', sp('APARTAMENTO ALCOR 113'));
ok('APARTAMENTO SUNSET TIRANT 209 -> Apartamento Sunset Tirant | 209', sp('APARTAMENTO SUNSET TIRANT 209') === 'Apartamento Sunset Tirant|209', sp('APARTAMENTO SUNSET TIRANT 209'));
ok('VILLA SUNSET (M2R) -> sin número, (M2R) intacto', sp('VILLA SUNSET (M2R)') === 'Villa Sunset (M2R)|', sp('VILLA SUNSET (M2R)'));
ok('Villa Bella -> igual, sin número', sp('Villa Bella') === 'Villa Bella|', sp('Villa Bella'));
ok('vacío -> nombre y número vacíos', sp('') === '|' && sp(null) === '|' && sp(undefined) === '|');
ok('número con letra y guion: CASA MAR-4B -> Casa Mar | 4B', sp('CASA MAR-4B') === 'Casa Mar|4B', sp('CASA MAR-4B'));
ok('punto medio: Apartamento Sol · 12 -> Apartamento Sol | 12', sp('Apartamento Sol · 12') === 'Apartamento Sol|12', sp('Apartamento Sol · 12'));
ok("apóstrofo: S'OLIVERA -> S'olivera", sp("S'OLIVERA") === "S'olivera|", sp("S'OLIVERA"));
ok('el número solo, sin nombre, no se separa', sp('113') === '113|', sp('113'));
var A = "Carrer de s'Alcor, 210, 07748 Fornells, Illes Balears";
ok('número de la calle 210 (no el código postal)', c.p0StreetNumber(A, '113') === '210');
ok('si el único número es el del apartamento, no hay nota', c.p0StreetNumber('Calle Mar, 113, 07748 Fornells', '113') === '');
ok('solo código postal: no hay número', c.p0StreetNumber('Urbanización Son Parc, 07740 Es Mercadal', '5') === '');

/* 5. _p0RenderPlace con un DOM de mentira */
function render(name, addr, lang, yacan) {
  var els = {};
  ['p0KiVilla', 'p0KiVillaPill', 'p0KiVillaRow', 'p0KiAddrNote', 'p0KiAddr', 'p0KcKeysIco'].forEach(function (id) { els[id] = { textContent: '', style: { display: 'none' } }; });
  els.p0KiAddr.textContent = addr;
  var ctx = { LANG_P0: L, _currentLang: lang || 'es', window: {}, R: { TaVillas_Name_villa_para_inquilinos: name, TaVillas_Yacan: yacan ? 'Yes' : '' },
    $: function (id) { return els[id] || null; } };
  vm.runInNewContext(fnSource('tP0') + '\n' + fnSource('_p0IsYes') + '\n' + fnSource('_p0IsYacan') + '\n' + fnSource('p0SplitVillaName') + '\n' +
    fnSource('p0StreetNumber') + '\n' + fnSource('_p0RenderPlace') + '\n_p0RenderPlace(R);', ctx);
  return els;
}
var e1 = render('APARTAMENTO ALCOR 113', A, 'es');
ok('Alcor: nombre visible', e1.p0KiVilla.textContent === 'Apartamento Alcor' && e1.p0KiVilla.style.display === 'block' && e1.p0KiVillaRow.style.display === 'flex');
ok('Alcor: píldora "Apto 113"', e1.p0KiVillaPill.textContent === 'Apto 113' && e1.p0KiVillaPill.style.display !== 'none');
ok('Alcor: nota "El 210 es el número de la calle. Tu apartamento es el 113."', e1.p0KiAddrNote.textContent === 'El 210 es el número de la calle. Tu apartamento es el 113.' && e1.p0KiAddrNote.style.display === 'block', e1.p0KiAddrNote.textContent);
ok('Alcor: icono de llave', e1.p0KcKeysIco.textContent === '🔑');
var e2 = render('APARTAMENTO ALCOR 113', A, 'de');
ok('Alcor en alemán: "Whg. 113" y la nota en alemán', e2.p0KiVillaPill.textContent === 'Whg. 113' && e2.p0KiAddrNote.textContent.indexOf('Die 210 ist die Hausnummer') === 0, e2.p0KiAddrNote.textContent);
var e3 = render('Villa Bella', A, 'es');
ok('Villa Bella: nombre sin píldora ni nota', e3.p0KiVilla.textContent === 'Villa Bella' && e3.p0KiVillaPill.style.display === 'none' && e3.p0KiAddrNote.style.display === 'none');
var e4 = render('', A, 'es');
ok('sin nombre: la fila del nombre queda oculta y no hay nota', e4.p0KiVillaRow.style.display === 'none' && e4.p0KiVilla.style.display === 'none' && e4.p0KiAddrNote.style.display === 'none');
var e5 = render('APARTAMENTO ALCOR 113', '—', 'es');
ok('sin dirección: píldora sí, nota no', e5.p0KiVillaPill.style.display !== 'none' && e5.p0KiAddrNote.style.display === 'none');
var e6 = render('VILLA PUERTA 3', A, 'es', true);
ok('cerradura Yacan: icono de puerta', e6.p0KcKeysIco.textContent === '🚪');

/* 6. Botón Copiar: oculto sin contraseña */
(function () {
  var b = { style: { display: 'none' } };
  var ctx = { $: function () { return b; } };
  vm.runInNewContext(fnSource('_p0WifiCopyShow'), ctx);
  ctx._p0WifiCopyShow('kUWN5'); var a1 = b.style.display;
  ctx._p0WifiCopyShow(''); var a2 = b.style.display;
  ctx._p0WifiCopyShow('—'); var a3 = b.style.display;
  ok('Copiar visible con contraseña, oculto si vacía o "—"', a1 === '' && a2 === 'none' && a3 === 'none', [a1, a2, a3].join('/'));
  var cp = fnSource('p0CopyWifi');
  ok('Copiar usa navigator.clipboard.writeText, selecciona el texto si falla y vuelve a "Copiar" a los 1,5 s',
    /navigator\.clipboard\.writeText\(t\)\.then\(done,selectText\)/.test(cp) && /selectNodeContents\(v\)/.test(cp) && /,1500\)/.test(cp) && /tP0\('kc_copied'\)/.test(cp));
})();

ok('los scripts inline compilan', (function () {
  var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, n = 0;
  try { while ((m = re.exec(s))) { n++; new vm.Script(m[1], { filename: f + '#script' + n }); } return n > 0; } catch (e) { return e.message; }
})() === true);

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
