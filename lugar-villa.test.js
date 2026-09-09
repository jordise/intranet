/* Pruebas del lugar de la villa (Menorca / Mallorca / Barcelona) en los textos al huesped
   (Belen, Feel Good 09/09/2026: a la huesped de Casa Premia le salia "Ankunft auf Menorca").
   node lugar-villa.test.js

   Como yacan-texto.test.js: NO copia el codigo de las paginas. Extrae el bloque LUGAR_VILLA y las
   funciones reales de cada HTML y los ejecuta. Nunca imprime datos de huespedes. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
function src(f) { return fs.readFileSync(f, 'utf8'); }
function fnSource(file, name) {
  var s = src(file), i = s.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name + ' en ' + file);
  var j = s.indexOf('{', i), depth = 0, k = j;
  for (; k < s.length; k++) { if (s[k] === '{') depth++; else if (s[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return s.slice(i, k);
}
function block(s, file) {
  var a = s.indexOf('/* LUGAR_VILLA begin */'), b = s.indexOf('/* LUGAR_VILLA end */');
  if (a < 0 || b < 0) throw new Error('sin bloque LUGAR_VILLA en ' + file);
  return s.slice(a, b);
}
function scriptsCompile(file) {
  var s = src(file), re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, n = 0;
  while ((m = re.exec(s))) { n++; new vm.Script(m[1], { filename: file + '#script' + n }); }
  return n;
}
var MENORCA = /menorca|minorca|minorque/i;
var PLACES = ['menorca', 'mallorca', 'barcelona'];

console.log('checkin-pasos.html');
(function () {
  var f = 'checkin-pasos.html', s = src(f);
  ok('los scripts inline compilan', (function () { try { return scriptsCompile(f) > 0; } catch (e) { return e.message; } })() === true);
  var pv = s.match(/var PAGE_VERSION = (\d+);/), hv = s.match(/VERSIÓN ACTUAL: v(\d+) \|/), tv = s.match(/<title>Check-in Pasos v(\d+)/);
  ok('v96 en PAGE_VERSION, cabecera y titulo', pv && hv && tv && pv[1] === '96' && hv[1] === '96' && tv[1] === '96', [pv && pv[1], hv && hv[1], tv && tv[1]].join('/'));
  ok('historial v96', /<!-- HISTORIAL: v96 - /.test(s));
  /* LANG_ARR real de la pagina */
  var la = s.indexOf('var LANG_ARR={};'), ca = s.indexOf('LANG_ARR.ca={', la), caEnd = s.indexOf('\n};', ca) + 3;
  var ctx = {}; vm.runInNewContext(s.slice(la, caEnd), ctx);
  var langs = ['en', 'es', 'fr', 'de', 'it', 'nl', 'pt', 'ca'];
  langs.forEach(function (l) {
    var L = ctx.LANG_ARR[l] || {};
    ok(l + ': lbl_arr_time lleva {arrTo} y no Menorca', /\{arrTo\}/.test(L.lbl_arr_time || '') && !MENORCA.test(L.lbl_arr_time || ''), L.lbl_arr_time);
    ok(l + ': lbl_dep_time lleva {depFrom} y no Menorca', /\{depFrom\}/.test(L.lbl_dep_time || '') && !MENORCA.test(L.lbl_dep_time || ''), L.lbl_dep_time);
  });
  var c2 = { LANG_ARR: ctx.LANG_ARR, _currentLang: 'en', document: { querySelector: function () { return null; } } };
  vm.runInNewContext(block(s, f) + '\n' + fnSource(f, 'tArr') + '\nthis.t=tArr;this.place=villaPlaceOf;this.set=function(l,p){_currentLang=l;_villaPlace=p;};', c2);
  ok('las dos definiciones de tArr pasan por _fillPlace', (s.match(/function tArr\(k\)\{[^\n]*_fillPlace\(/g) || []).length === 2);
  ok('villaid 169 (Casa Premia) -> barcelona', c2.place({ TaVillas_villaid: 169 }) === 'barcelona');
  ok('villaid "407" en texto (Finca Sa Canova) -> mallorca', c2.place({ TaVillas_villaid: '407' }) === 'mallorca');
  ok('Hostaway 92818 sin villaid -> barcelona', c2.place({ TaBookings2021_VillaID_FSnumber: '92818' }) === 'barcelona');
  ok('Hostaway 150613 -> mallorca', c2.place({ TaBookings2021_VillaID_FSnumber: 150613 }) === 'mallorca');
  ok('villaid manda sobre Hostaway', c2.place({ TaVillas_villaid: 169, TaBookings2021_VillaID_FSnumber: 150613 }) === 'barcelona');
  ok('villaid 5 -> menorca', c2.place({ TaVillas_villaid: 5 }) === 'menorca');
  ok('fila vacia -> menorca', c2.place({}) === 'menorca');
  ok('sin fila -> menorca', c2.place(null) === 'menorca');
  var EXP = {
    en: { menorca: ['Arrival time to Menorca', 'Departure time from Menorca'], mallorca: ['Arrival time to Mallorca', 'Departure time from Mallorca'], barcelona: ['Arrival time to Barcelona', 'Departure time from Barcelona'] },
    es: { menorca: ['Llegada a Menorca', 'Salida de Menorca'], mallorca: ['Llegada a Mallorca', 'Salida de Mallorca'], barcelona: ['Llegada a Barcelona', 'Salida de Barcelona'] },
    fr: { menorca: ['Arrivée à Minorque', 'Départ de Minorque'], mallorca: ['Arrivée à Majorque', 'Départ de Majorque'], barcelona: ['Arrivée à Barcelone', 'Départ de Barcelone'] },
    de: { menorca: ['Ankunft auf Menorca', 'Abreise von Menorca'], mallorca: ['Ankunft auf Mallorca', 'Abreise von Mallorca'], barcelona: ['Ankunft in Barcelona', 'Abreise von Barcelona'] },
    it: { menorca: ['Arrivo a Minorca', 'Partenza da Minorca'], mallorca: ['Arrivo a Maiorca', 'Partenza da Maiorca'], barcelona: ['Arrivo a Barcellona', 'Partenza da Barcellona'] },
    nl: { menorca: ['Aankomst op Menorca', 'Vertrek van Menorca'], mallorca: ['Aankomst op Mallorca', 'Vertrek van Mallorca'], barcelona: ['Aankomst in Barcelona', 'Vertrek uit Barcelona'] },
    pt: { menorca: ['Chegada a Menorca', 'Partida de Menorca'], mallorca: ['Chegada a Maiorca', 'Partida de Maiorca'], barcelona: ['Chegada a Barcelona', 'Partida de Barcelona'] },
    ca: { menorca: ['Arribada a Menorca', 'Sortida de Menorca'], mallorca: ['Arribada a Mallorca', 'Sortida de Mallorca'], barcelona: ['Arribada a Barcelona', 'Sortida de Barcelona'] }
  };
  langs.forEach(function (l) {
    PLACES.forEach(function (p) {
      c2.set(l, p);
      var a = c2.t('lbl_arr_time'), d = c2.t('lbl_dep_time');
      ok(l + '/' + p + ': "' + a + '" / "' + d + '"', a === EXP[l][p][0] && d === EXP[l][p][1]);
    });
  });
  c2.set('en', 'menorca'); ok('una clave sin {…} no cambia', c2.t('lbl_checkin_time') === ctx.LANG_ARR.en.lbl_checkin_time);
  c2.set('xx', 'barcelona'); ok('idioma desconocido -> EN con el lugar', c2.t('lbl_arr_time') === 'Arrival time to Barcelona');
  c2.set('de', 'zz'); ok('lugar desconocido -> Menorca', c2.t('lbl_arr_time') === 'Ankunft auf Menorca');
  var rp = fnSource(f, 'renderPol');
  ok('renderPol fija _villaPlace = villaPlaceOf(r)', /_villaPlace\s*=\s*villaPlaceOf\(r\)/.test(rp));
  ok('renderPol llama applyPlaceLabels() despues de initLangPol (tambien con keepLang)', rp.indexOf('applyPlaceLabels()') > rp.indexOf('initLangPol()') && rp.indexOf('initLangPol()') > 0);
  ok('los nombres de campo Caspio *_to_Menorca NO cambian', /TaBookings2021_Arrival_Time_to_Menorca/.test(s) && /TaBookings2021_Departure_Time_to_Menorca/.test(s));
})();

console.log('\nentradas-primer-contacto-whatsapp.html');
(function () {
  var f = 'entradas-primer-contacto-whatsapp.html', s = src(f);
  ok('los scripts inline compilan', (function () { try { return scriptsCompile(f) > 0; } catch (e) { return e.message; } })() === true);
  ok('v17 en cabecera, titulo e historial', /VERSIÓN ACTUAL: v17 \|/.test(s) && /<title>Primer Contacto v17/.test(s) && /<!-- HISTORIAL: v17 - /.test(s));
  var fi = s.indexOf('const F = {'), Fsrc = s.slice(fi, s.indexOf('};', fi) + 2).replace('const F', 'var F');
  var c = { cleanPh: function (p) { return String(p || '').replace(/[\s\-()]/g, '').replace(/^\+/, ''); } };
  vm.runInNewContext(Fsrc + '\n' + block(s, f) + '\n' + fnSource(f, 'isEs') + '\n' + fnSource(f, 'buildMsg') + '\nthis.F=F;this.place=villaPlaceOf;this.msg=buildMsg;', c);
  ok('F.villaId = TaVillas_villaid', c.F.villaId === 'TaVillas_villaid');
  ok('F.villaFs = TaBookings2021_VillaID_FSnumber', c.F.villaFs === 'TaBookings2021_VillaID_FSnumber');
  ok('el objeto d lleva place:villaPlaceOf(r)', /var place=villaPlaceOf\(r\)/.test(s) && /yacan:yacan,place:place\}/.test(s));
  ok('villaid 169 -> barcelona', c.place({ TaVillas_villaid: 169 }) === 'barcelona');
  ok('Hostaway 150613 -> mallorca', c.place({ TaBookings2021_VillaID_FSnumber: '150613' }) === 'mallorca');
  ok('fila vacia -> menorca', c.place({}) === 'menorca');
  function d(place, ph) { return { place: place, name: 'Huesped', phHost: ph, phArr: '', ciTime: '16:00', code: 'X', yacan: false }; }
  var es = c.msg(d('barcelona', '+34600000000'), 'VM', false), en = c.msg(d('barcelona', '+44700000000'), 'VM', false);
  ok('ES Casa Premia: "durante su estancia en Barcelona."', /durante su estancia en Barcelona\./.test(es) && !MENORCA.test(es));
  ok('EN Casa Premia: "during your stay in Barcelona."', /during your stay in Barcelona\./.test(en) && !MENORCA.test(en));
  es = c.msg(d('mallorca', '+34600000000'), 'VM', false); en = c.msg(d('mallorca', '+44700000000'), 'VM', false);
  ok('ES Sa Canova: "estancia en Mallorca."', /estancia en Mallorca\./.test(es) && !MENORCA.test(es));
  ok('EN Sa Canova: "stay in Mallorca."', /stay in Mallorca\./.test(en) && !MENORCA.test(en));
  es = c.msg(d(undefined, '+34600000000'), 'VM', false); en = c.msg(d('menorca', '+44700000000'), 'VM', false);
  ok('ES sin lugar: "estancia en Menorca."', /estancia en Menorca\./.test(es));
  ok('EN Menorca: "stay in Menorca." (ya no Minorca)', /stay in Menorca\./.test(en) && !/Minorca/.test(en));
})();

console.log('\nnotas-equipo-reservas.html');
(function () {
  var f = 'notas-equipo-reservas.html', s = src(f);
  ok('los scripts inline compilan', (function () { try { return scriptsCompile(f) > 0; } catch (e) { return e.message; } })() === true);
  var pv = s.match(/var PAGE_VERSION = (\d+);/), hv = s.match(/VERSIÓN ACTUAL: v(\d+) \|/), tv = s.match(/<title>Notas Equipo Reservas v(\d+)/);
  ok('v75 en PAGE_VERSION, cabecera y titulo', pv && hv && tv && pv[1] === '75' && hv[1] === '75' && tv[1] === '75', [pv && pv[1], hv && hv[1], tv && tv[1]].join('/'));
  ok('historial v75', /<!-- HISTORIAL: v75 - /.test(s));
  var c = { bookingData: null, villaData: null, confCode: 'ABC', Auth: { name: function () { return 'VM'; } } };
  vm.runInNewContext(fnSource(f, 'fB') + '\n' + fnSource(f, 'fV') + '\n' + block(s, f) + '\n' + fnSource(f, 'buildC2DMsg') +
    '\nthis.place=villaPlace;this.msg=buildC2DMsg;this.setRow=function(r){bookingData=r;villaData=r;};', c);
  function row(extra, ph) { var r = { TaBookings2021_Guest_phonenumber: ph, TaBookings2021_Fiscal_guest_name: 'Huesped' }; Object.keys(extra).forEach(function (k) { r[k] = extra[k]; }); return r; }
  var CASES = [
    ['Casa Premia (villaid 169)', { TaVillas_villaid: 169 }, 'barcelona', { es: ['reservado en Barcelona.', '3VILLAS Barcelona'], fr: ['réservée à Barcelone.', '3VILLAS Barcelone'], it: ['prenotato a Barcellona.', '3VILLAS Barcellona'], en: ['booked in Barcelona.', '3VILLAS Barcelona'] }],
    ['Finca Sa Canova (Hostaway 150613, sin villaid)', { TaBookings2021_VillaID_FSnumber: '150613' }, 'mallorca', { es: ['reservado en Mallorca.', '3VILLAS Mallorca'], fr: ['réservée à Majorque.', '3VILLAS Majorque'], it: ['prenotato a Maiorca.', '3VILLAS Maiorca'], en: ['booked in Mallorca.', '3VILLAS Mallorca'] }],
    ['villa de Menorca (villaid 12)', { TaVillas_villaid: 12 }, 'menorca', { es: ['reservado en Menorca.', '3VILLAS Menorca'], fr: ['réservée à Minorque.', '3VILLAS Minorque'], it: ['prenotato a Minorca.', '3VILLAS Minorca'], en: ['booked in Menorca.', '3VILLAS Menorca'] }],
    ['fila sin ids', {}, 'menorca', { es: ['reservado en Menorca.', '3VILLAS Menorca'], fr: ['réservée à Minorque.', '3VILLAS Minorque'], it: ['prenotato a Minorca.', '3VILLAS Minorca'], en: ['booked in Menorca.', '3VILLAS Menorca'] }]
  ];
  var PH = { es: '+34600000000', fr: '+33600000000', it: '+39300000000', en: '+44700000000' };
  CASES.forEach(function (cs) {
    c.setRow(row(cs[1], PH.es));
    ok(cs[0] + ': villaPlace() = ' + cs[2], c.place() === cs[2], c.place());
    Object.keys(PH).forEach(function (l) {
      c.setRow(row(cs[1], PH[l]));
      var m = c.msg(false), want = cs[3][l];
      var other = cs[2] === 'menorca' ? false : MENORCA.test(m);
      ok(cs[0] + ' ' + l.toUpperCase() + ': "' + want[0] + '" + firma "' + want[1] + '"', m.indexOf(want[0]) >= 0 && m.indexOf(want[1]) >= 0 && !other, other ? 'todavia dice Menorca' : '');
    });
  });
})();

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
