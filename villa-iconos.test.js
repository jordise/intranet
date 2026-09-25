/* Pruebas de los iconos de la ficha de villa (peticion de Rafa, 25/09/2026: la ficha se lee de un vistazo).
   villa.html v25 y editar-villa.html v29 (v24/v28: iconos por campo y de seccion; v25/v29: segunda ronda de Rafa:
   emoji de subgrupo a 18px, iconos de habitaciones y banos, ancho completo en escritorio).
   node villa-iconos.test.js

   Como editar-villa-utilidades.test.js: NO copia el codigo de las paginas. Extrae con vm el mapa real
   FIELD_ICONS y la funcion fieldLabel de cada HTML y comprueba el orden de los campos en el HTML. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
function src(f) { return fs.readFileSync(f, 'utf8'); }
function scriptsCompile(file) {
  var s = src(file), re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, n = 0;
  while ((m = re.exec(s))) { n++; new vm.Script(m[1], { filename: file + '#script' + n }); }
  return n;
}
function fnSource(s, name) {
  var i = s.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = s.indexOf('{', i), depth = 0, k = j;
  for (; k < s.length; k++) { if (s[k] === '{') depth++; else if (s[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return s.slice(i, k);
}
function iconsBlock(s, file) {
  var a = s.indexOf('const FIELD_ICONS = {'), b = s.indexOf('\n};', a);
  if (a < 0 || b < 0) throw new Error('sin FIELD_ICONS en ' + file);
  return s.slice(a, b + 3);
}
function section(s, id, nextId, file) {
  var a = s.indexOf("buildSection('" + id + "'"), b = s.indexOf("buildSection('" + nextId + "'", a);
  if (a < 0 || b < 0) throw new Error('sin seccion ' + id + '/' + nextId + ' en ' + file);
  return s.slice(a, b);
}

/* lo que pidio Rafa, por grupo (con la ronda del checker) */
var EXPECT = {
  '🔢': ['Keybox_code', 'Keybox_code2', 'Keybox_equipo'],
  '📝': ['Key_Coments_clients', 'Key_Coments_clients2', 'Electricidad_info_guest', 'Agua_info_guest', 'Gas_info_guest', 'Jacuzzi_info_guest', 'Caldera_info_guest', 'Alarm_description_guest'],
  '💬': ['Key_Coments', 'Key_Coments2', 'Electricidad_info_team', 'Agua_info_team', 'Gas_info_team', 'Jacuzzi_info_team'],
  '⚠️': ['Important_comments'],
  '🧑‍💼': ['KeyHolder_person'],
  '📍': ['Address', 'Googlemaps_link'],
  '📶': ['Wifi_Comany', 'Wifi_user', 'Wifi_password', 'Wifi_speed_company_type'],
  '🏊': ['Swiming_pool', 'size_of_swimingpool'],
  '☕': ['Cofe_Machine'],
  '📺': ['TV'],
  '🚨': ['Alarm_code', 'Alarm_descrition'],
  '🚗': ['Parking', 'Parking_aditionalinfo'],
  '❄️': ['Aircon', 'Explanation_aircon'],
  '🧺': ['Washing_machine'],
  '🍖': ['BBQ'],
  '🏖️': ['Beach_towels_provided', 'Beach_distance'], '🍽️': ['Dishwasher_lavaplatos', 'Restaurant_distance'], '🛒': ['Supermarket_distance'], '✈️': ['Airport_distance'], '💊': ['Pharmacy_distance'],
  '🐾': ['Pets_allowed'],
  /* v25/v29: segunda ronda de Rafa */
  '🛏️': ['Rooms_number', 'Beds_Explanation', 'Reorganizar_camas', 'Room1Beds', 'Room2Beds', 'Room3Beds', 'Room4Beds', 'Room5Beds', 'Room6Beds', 'Room7Beds', 'Room1Otherbeds', 'Room2Otherbeds', 'Room3Otherbeds', 'Room4Otherbeds', 'Room5Otherbeds', 'Room6Otherbeds', 'Room7Otherbeds'],
  '🛁': ['Ensuite_BATHROOMS', 'Shared_BATHROOMS', 'Room1Bath', 'Room2Bath', 'Room3Bath', 'Room4Bath', 'Room5Bath', 'Room6Bath', 'Room7Bath']
};
/* icono de cada seccion que se fijo a proposito */
var SEC = { vm: '🧑‍💼', kb1: '🔑', kb2: '🔑', kbeq: '🔑', villa: '🏡', hab: '🛏️', serv: '🧭', seg: '🚨', piscina: '🏊', op: '🗓️', com: '📡', admin: '🗂️' };
var KEYBOX_SECS = ['kb1', 'kb2', 'kbeq'];
/* documento minimo para ejecutar fieldLabel (devuelve nodos, no texto) */
function fakeDoc() {
  function node(t, extra) { var n = { nodeType: t, childNodes: [], textContent: '', className: '', appendChild: function (c) { this.childNodes.push(c); return c; } }; for (var k in extra) n[k] = extra[k]; return n; }
  return {
    createDocumentFragment: function () { return node(11); },
    createElement: function (tag) { return node(1, { tagName: tag.toUpperCase() }); },
    createTextNode: function (t) { return node(3, { textContent: String(t) }); }
  };
}
function flat(frag) { return frag.childNodes.map(function (n) { return n.nodeType === 1 ? '<' + n.tagName + '.' + n.className + '>' + n.textContent : n.textContent; }).join('|'); }
/* orden de cada keybox: codigo < instrucciones del cliente < fotos < comentarios internos */
var KB = {
  kb1: { next: 'kb2', order: ['Keybox_code', 'Key_Coments_clients', 'PictureKeybox1', 'Picturekeybox2', 'Picturekeybox3', 'Key_Coments'] }, // gitleaks:allow (nombre de campo, no clave)
  kb2: { next: 'kbeq', order: ['Keybox_code2', 'Key_Coments_clients2', 'PictureKeybox2_1', 'PictureKeybox2_2', 'PictureKeybox2_3', 'Key_Coments2'] } // gitleaks:allow (nombre de campo, no clave)
};

function checkPage(file, ver, titleRe) {
  console.log(file);
  var s = src(file);
  ok('los scripts inline compilan', (function () { try { return scriptsCompile(file) > 0; } catch (e) { return e.message; } })() === true);
  var pv = s.match(/const PAGE_VERSION = (\d+);/), hv = s.match(/VERSIÓN ACTUAL: v(\d+) \|/), tv = s.match(titleRe);
  ok('v' + ver + ' en PAGE_VERSION, cabecera y titulo', pv && hv && tv && pv[1] === String(ver) && hv[1] === String(ver) && tv[1] === String(ver), [pv && pv[1], hv && hv[1], tv && tv[1]].join('/'));
  ok('historial v' + ver + ' y la entrada anterior intacta', new RegExp('<!-- HISTORIAL: v' + ver + ' - ').test(s) && s.indexOf('| v' + (ver - 1) + ' - ') > 0);
  ok('el comentario HISTORIAL cierra una sola vez', s.slice(s.indexOf('<!-- HISTORIAL: v' + ver)).split('-->').length === 2);

  /* FIELD_ICONS real y fieldLabel real, ejecutados con vm */
  var ctx = { document: fakeDoc() };
  vm.runInNewContext(iconsBlock(s, file).replace(/^const /, 'var ') + '\n' + fnSource(s, 'fieldLabel'), ctx);
  var FI = ctx.FIELD_ICONS;
  ok('FIELD_ICONS es un objeto con campos', FI && typeof FI === 'object' && Object.keys(FI).length > 0);
  ok('FIELD_ICONS se define una sola vez', s.split('const FIELD_ICONS = {').length === 2);
  Object.keys(EXPECT).forEach(function (ico) {
    var bad = EXPECT[ico].filter(function (f) { return FI[f] !== ico; });
    ok(ico + ' en ' + EXPECT[ico].join(', '), bad.length === 0, bad.join(','));
  });
  var ghost = Object.keys(FI).filter(function (f) {
    var m = f.match(/^Room(\d)(comments|Beds|Otherbeds|Bath)$/);
    if (m) return s.indexOf('`Room${r}' + m[2] + '`') < 0 || +m[1] < 1 || +m[1] > 7;
    return s.indexOf("('" + f + "'") < 0 && s.indexOf(", '" + f + "'") < 0;
  });
  ok('cada campo de FIELD_ICONS existe en la pagina', ghost.length === 0, ghost.join(','));
  var tv = flat(ctx.fieldLabel('TV', 'TV')), none = flat(ctx.fieldLabel('Pax_legal', 'Plazas legales'));
  ok("fieldLabel('TV','TV') = <span class=lbl-ico>📺</span> + ' ' + 'TV'", tv === '<SPAN.lbl-ico>📺| |TV', tv);
  ok('fieldLabel deja igual un campo sin icono (sin span)', none === 'Plazas legales', none);
  ok('.lbl-ico a 16px', /\.lbl-ico\{font-size:16px;/.test(s));

  /* v25/v29: emoji de subgrupo a 18px (Rafa: los iconos de las habitaciones se veian muy pequenos) */
  ok('.sg-ico a 18px', /\.sg-ico\{font-size:18px;line-height:1;/.test(s));
  ok('.subgroup-title sigue en flex con gap (el span se separa solo)', /\.subgroup-title\{[^}]*display:flex;align-items:center;gap:6px/.test(s));
  var c4 = { document: fakeDoc() };
  vm.runInNewContext(fnSource(s, 'subgroup') + '\nthis.sg=subgroup;', c4);
  var sgT = c4.sg('🛏️ Habitación 1', 'sg-internal').childNodes[0];
  ok("subgroup('🛏️ Habitación 1') = <span class=sg-ico>🛏️</span> + 'Habitación 1'", sgT && sgT.className === 'subgroup-title sg-internal' && flat(sgT) === '<SPAN.sg-ico>🛏️|Habitación 1', sgT && flat(sgT));
  var sgZ = c4.sg('🧑‍💼 Villamanager', 'sg-guest').childNodes[0];
  ok('subgroup con emoji compuesto (ZWJ) tambien lo separa', sgZ && flat(sgZ) === '<SPAN.sg-ico>🧑‍💼|Villamanager', sgZ && flat(sgZ));
  var sgN = c4.sg('Datos sin icono', 'sg-neutral').childNodes[0];
  ok('subgroup sin emoji queda como texto plano', sgN && sgN.childNodes.length === 0 && sgN.textContent === 'Datos sin icono', sgN && flat(sgN));
  ok('subgroup sin titulo no crea cabecera', c4.sg('', 'sg-neutral').childNodes.length === 0);

  /* v25/v29: en ordenador la ficha ocupa toda la pantalla (Rafa: se pierden los margenes) */
  ok('main sigue a 700px centrado en movil/tablet', /\nmain\{padding:10px 12px 14px;max-width:700px;margin:0 auto;/.test(s));
  ok('main sin max-width desde 1024px', /@media\(min-width:1024px\)\{main\{max-width:none;padding:12px 28px 20px\}\}/.test(s));
  ok('la regla de escritorio va despues de la de main (gana en cascada)', s.indexOf('@media(min-width:1024px){main{max-width:none') > s.indexOf('\nmain{padding:10px 12px 14px;max-width:700px'));

  /* las etiquetas pasan por fieldLabel */
  if (file === 'villa.html') {
    ok('fieldWrap usa fieldLabel(field,label)', /lblEl\.appendChild\(fieldLabel\(field,label\)\)/.test(fnSource(s, 'fieldWrap')));
    ok('los siete builders pasan el campo a fieldWrap', (s.match(/return fieldWrap\(field,label,/g) || []).length === 7 && !/return fieldWrap\(label,/.test(s));
  } else {
    ['buildInput', 'buildTA', 'buildSS'].forEach(function (fn) {
      ok(fn + ' usa fieldLabel(field,label)', /lblEl\.appendChild\(fieldLabel\(field,label\)\)/.test(fnSource(s, fn)));
    });
    ok('el id f_<campo> no cambia (guardado intacto)', /inp\.id='f_'\+field/.test(fnSource(s, 'buildInput')) && /ta\.id='f_'\+field/.test(fnSource(s, 'buildTA')));
  }

  /* orden de Keybox 1 y Keybox 2 */
  Object.keys(KB).forEach(function (id) {
    var b = section(s, id, KB[id].next, file);
    var p = KB[id].order.map(function (k) { return b.indexOf("'" + k + "'"); });
    ok(id + ': codigo < instrucciones cliente < fotos < comentarios internos', p.every(function (x, i) { return x >= 0 && (i === 0 || x > p[i - 1]); }), p.join(','));
    var dup = KB[id].order.filter(function (k) { return b.split("'" + k + "'").length !== 2; });
    ok(id + ': cada campo sigue ahi, una sola vez', dup.length === 0, dup.join(','));
  });
  ok('kb1: el boton Multiunit sigue primero', section(s, 'kb1', 'kb2', file).indexOf('mu-open-btn') < section(s, 'kb1', 'kb2', file).indexOf("'Keybox_code'"));

  /* iconos de seccion */
  var secs = [], re = /buildSection\('([a-z0-9]+)','([^']*)'/g, m;
  while ((m = re.exec(s))) secs.push({ id: m[1], ico: m[2] });
  Object.keys(SEC).forEach(function (id) {
    var f = secs.filter(function (x) { return x.id === id; });
    ok('seccion ' + id + ' = ' + SEC[id], f.length === 1 && f[0].ico === SEC[id], f.map(function (x) { return x.ico; }).join(','));
  });
  ok('cada seccion tiene icono', secs.length > 0 && secs.every(function (x) { return x.ico.trim() !== ''; }));
  var shared = secs.filter(function (x, i) { return secs.some(function (y, j) { return j !== i && y.ico === x.ico && !(KEYBOX_SECS.indexOf(x.id) >= 0 && KEYBOX_SECS.indexOf(y.id) >= 0); }); });
  ok('ninguna seccion comparte icono (solo las tres de keybox comparten 🔑)', shared.length === 0, shared.map(function (x) { return x.id + x.ico; }).join(' '));
  ok('🌊, 🛠 y ⚙️ ya no son iconos de seccion', s.indexOf('🌊') < 0 && !secs.some(function (x) { return /🛠|⚙/.test(x.ico); }));
  ok('🛏 siempre con FE0F', !/🛏(?!\uFE0F)/.test(s));
  ok("subgrupos: '🧾 Datos fiscales', '📶 WiFi', '🛏️ Habitación'", s.indexOf("subgroup('🧾 Datos fiscales del propietario'") > 0 && s.indexOf("subgroup('📶 WiFi'") > 0 && s.indexOf("subgroup('🛏️ Habitación '") > 0 && s.indexOf("subgroup('📡 WiFi'") < 0);
  var who = s.match(/subgroup\('👤[^']*','[a-z-]+'/g) || [];
  ok('👤 solo en subgrupos visibles por el cliente', who.length > 0 && who.every(function (x) { return /'sg-guest'$/.test(x); }), who.join(' | '));
  ok('los subgrupos internos siguen con 🔒', (s.match(/subgroup\('🔒/g) || []).length >= 5);

  /* tamano y botones de arriba */
  ok('.sh-ico a 22px', /\.sh-ico\{font-size:22px;/.test(s) && !/\.sh-ico\{font-size:17px/.test(s));
  ok('los botones de seccion llevan el icono de la seccion', /sectionMeta\.push\(\{id,ico,title\}\)/.test(fnSource(s, 'buildSection')) && /btn\.textContent=ico\+' '\+title/.test(fnSource(s, 'buildNavButtons')));
  return iconsBlock(s, file);
}

var a = checkPage('villa.html', 25, /<title>Villa Info v(\d+)/);
(function () {
  var s = src('villa.html');
  ok('villa.html: Villamanager cerrado por defecto', !/buildSection\('vm'[\s\S]*?\},true\)\);/.test(section(s, 'vm', 'kb1', 'villa.html')));
  ok('villa.html: Keybox 1 abierto por defecto', /\},true\)\);/.test(section(s, 'kb1', 'kb2', 'villa.html')));
  ok('villa.html: Keybox 2 abierto solo si Keybox_code2 tiene valor', /\},!empty\(d\.Keybox_code2\)\)\);/.test(section(s, 'kb2', 'kbeq', 'villa.html')));
  ok('villa.html: Keybox equipo sigue cerrado', !/\},(true|!empty)/.test(section(s, 'kbeq', 'villa', 'villa.html')));
  var c = {}; vm.runInNewContext(fnSource(s, 'empty') + '\nthis.e=empty;', c);
  ok("empty(): '' y '-' vacios, '4821' no", c.e('') && c.e('  ') && c.e('-') && c.e(null) && !c.e('4821'));
  ok('villa.html: botones de arriba conservan 🏠 Hostaway y 📋 Preparar Manual', s.indexOf('🏠 Hostaway</a>') > 0 && s.indexOf('📋 Preparar Manual</a>') > 0);
})();
var b = checkPage('editar-villa.html', 29, /<title>Editar Villa v(\d+)/);
console.log('las dos paginas');
ok('FIELD_ICONS identico en villa.html y editar-villa.html', a === b);

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
