/* Pruebas de manual-villa.html v33: la clave wifi con la sesion del equipo, o con el
   check-in online del huesped en este mismo telefono, del dia de llegada al dia de salida
   (Worker caspio-proxy v64.3-sec). El enlace de 30 dias de la v31 se retira.
   v33 (Worker v64.4-sec): vuelve la barra del equipo para copiar el enlace del huesped, ahora por
   reserva (?k= de manual-link); la clave sale solo del dia de llegada al dia de salida de esa reserva.
   El enlace de siempre (?Hostawayid=) sigue abriendo el manual, sin la clave wifi.
   node manual-villa.test.js */
var fs = require('fs');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
function blockEnd(src, j) {
  var depth = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) return k + 1; }
  }
  throw new Error('bloque sin cerrar');
}
function fnSource(src, name) {
  var i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  return src.slice(i, blockEnd(src, src.indexOf('{', i)));
}

var SRC = fs.readFileSync('manual-villa.html', 'utf8');
var LIVE = SRC.split('<!-- HISTORIAL:')[0];

console.log('manual-villa.html v34');
ok('cabecera, titulo e historial v34', /VERSIÓN ACTUAL: v34 \|/.test(SRC) && /<title>Manual Villa v34 — 3Villas<\/title>/.test(SRC) &&
  /<!-- HISTORIAL: v34 - /.test(SRC) && / \| v33 - /.test(SRC) && / \| v32 - /.test(SRC));

var F = fnSource(SRC, 'fetchVilla');
ok('v33: fetchVilla manda el k del enlace por reserva (_linkKey) si la pagina lo trae', /_linkKey/.test(F) && /&k=/.test(F));
ok('v33: _linkKey sale de ?k= de la direccion, con try/catch', /var _linkKey=/.test(SRC) && /get\('k'\)/.test(SRC.split('var _linkKey=')[1].split('\n')[0]));
ok('fetchVilla manda la sesion del equipo (3v_token) si existe', /3v_token/.test(F) && /Authorization/.test(F));
ok('sin sesion del equipo, manda el token del check-in del huesped (3v_checkin_auth)', /guestCheckinToken\(\)/.test(F) && /3v_checkin_auth/.test(fnSource(SRC, 'guestCheckinToken')));
ok('con un token caducado (401) repite sin token, el manual no se cae', /status!==401/.test(F) && /fetch\(url\)/.test(F));

/* Astra 19 §5: una sesion del equipo caducada no tapa el token del huesped. fetchVilla ejecutada con fetch de mentira. */
async function runF(store, answers, linkKey) {
  var calls = [], urls = [];
  var ls = { getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; } };
  var fakeFetch = function (u, init) {
    var auth = (init && init.headers && init.headers.Authorization) || '';
    calls.push(auth); urls.push(u);
    var st = answers[auth] || 200;
    return Promise.resolve({ status: st, ok: st < 400, json: function () { return Promise.resolve({ Name_villa_para_inquilinos: 'V', who: auth }); } });
  };
  var mk = new Function('localStorage', 'sessionStorage', 'fetch', 'WORKER', '_linkKey',
    'var _authTok="";' + fnSource(SRC, 'guestCheckinToken') + ';async ' + F + ';return async function(){ var d=await fetchVilla("4242"); return {d:d, tok:_authTok}; };');
  var out = await mk(ls, ls, fakeFetch, 'https://w.test/', linkKey || '')();
  return { calls: calls, out: out, urls: urls };
}

/* v33: la barra del equipo con un DOM, fetch y portapapeles de mentira */
async function runShare(opt) {
  opt = opt || {};
  var calls = [], copied = null;
  var els = {};
  function el(id) { if (!els[id]) els[id] = { id: id, style: {}, textContent: '', value: '', options: [], innerHTML: '',
    appendChild: function (o) { this.options.push(o); if (!this.value) this.value = o.value; } }; return els[id]; }
  var doc = { getElementById: el, createElement: function () { return { value: '', text: '', disabled: false }; } };
  var fakeFetch = function (u, init) {
    var body = JSON.parse((init && init.body) || '{}');
    calls.push({ u: u, method: init && init.method, auth: (init && init.headers && init.headers.Authorization) || '', body: body });
    var res;
    if (!body.bookingCode) res = opt.empty ? { bookings: [] } : { bookings: [{ code: 'B1', name: 'Ana', from: '2026-10-23', to: '2026-10-26' }, { code: 'B2', name: 'Luis', from: '2026-11-01', to: '2026-11-05' }] };
    else res = opt.fail ? { error: opt.fail } : { k: 'K.' + body.bookingCode, from: '2026-11-01', to: '2026-11-05' };
    var st = res.error ? 400 : 200;
    return Promise.resolve({ status: st, ok: st < 400, json: function () { return Promise.resolve(res); } });
  };
  var nav = { clipboard: { writeText: function (x) { copied = x; return Promise.resolve(); } } };
  var loc = { origin: 'https://www.3villas.com', pathname: '/intranet/manual-villa.html' };
  var tS = 'var _T={share_btn:"COPY",share_ok:"OK {from} {to}",share_pick:"PICK",share_none:"NONE"};function t(k){return _T[k];}';
  var run = new Function('document', 'fetch', 'navigator', 'location', 'WORKER', '_hwId', '_authTok', 'window',
    tS + 'var _shareSeq=0;' + fnSource(SRC, 'fmtDay') + ';async ' + fnSource(SRC, 'loadShareBookings') + ';async ' + fnSource(SRC, 'copyGuestLink') +
    ';return async function(){ await loadShareBookings(); el_sel = document.getElementById("shareSel"); if (el_sel.options.length > 1) el_sel.value = "B2"; await copyGuestLink(); };');
  var el_sel;
  await run(doc, fakeFetch, nav, loc, 'https://www.3villas.com/intranet/api', '4242', 'STAFF', { prompt: function () {} })();
  return { calls: calls, copied: copied, options: el('shareSel').options, msg: el('shareMsg').textContent, btnHidden: el('shareBtn').style.display === 'none' };
}
(async function () {
  var future = Date.now() + 60000;
  var a = await runF({ '3v_token': 'STAFF', '3v_checkin_auth': JSON.stringify({ token: 'GUEST', expires: future }) }, { 'Bearer STAFF': 401 });
  ok('ejecuta: sesion del equipo caducada -> prueba el token del huesped, no anonimo', a.calls.join(',') === 'Bearer STAFF,Bearer GUEST' && a.out.tok === 'GUEST', a.calls.join(','));
  var b = await runF({ '3v_token': 'STAFF', '3v_checkin_auth': JSON.stringify({ token: 'GUEST', expires: future }) }, { 'Bearer STAFF': 401, 'Bearer GUEST': 401 });
  ok('ejecuta: los dos caducados -> por ultimo sin token', b.calls.join(',') === 'Bearer STAFF,Bearer GUEST,' && b.out.tok === '', b.calls.join(','));
  var c = await runF({ '3v_token': 'STAFF' }, {});
  ok('ejecuta: sesion del equipo buena -> una sola llamada', c.calls.join(',') === 'Bearer STAFF' && c.out.tok === 'STAFF', c.calls.join(','));
  var d = await runF({}, {});
  ok('ejecuta: sin nada -> una llamada sin token', d.calls.join(',') === '' && d.calls.length === 1 && d.out.tok === '', JSON.stringify(d.calls));
  /* Astra 19 §5: translate lleva el mismo token que abrio el manual */
  var TR = fnSource(SRC, 'translateText');
  ok('translateText manda Authorization con el token que abrio el manual', /_authTok/.test(TR) && /Authorization/.test(TR));
  /* v33: el enlace por reserva */
  var e1 = await runF({}, {}, 'KEY.1');
  ok('ejecuta v33: con ?k= -> la llamada lleva &k=KEY.1 y sin token', e1.urls.length === 1 && /[?&]k=KEY\.1(&|$)/.test(e1.urls[0]) && e1.calls[0] === '', e1.urls.join(' '));
  var e2 = await runF({}, {});
  ok('ejecuta v33: sin ?k= -> la llamada no lleva k', e2.urls.length === 1 && !/[?&]k=/.test(e2.urls[0]), e2.urls.join(' '));
  ok('v33: translateText manda el mismo k (translate lo pide con GUEST_AUTH_REQUIRED=1)', /_linkKey/.test(TR) && /&k=/.test(TR));
  /* v33: la barra del equipo, ejecutada con fetch y portapapeles de mentira */
  var SH = await runShare();
  ok('ejecuta v33: la lista pide manual-link por POST con la sesion y la villa', SH.calls[0] && SH.calls[0].method === 'POST' && /action=manual-link/.test(SH.calls[0].u) && SH.calls[0].auth === 'Bearer STAFF' && SH.calls[0].body.Hostawayid === '4242' && !SH.calls[0].body.bookingCode, JSON.stringify(SH.calls[0]));
  ok('ejecuta v33: la lista sale con el nombre y las fechas dd/mm/aaaa', SH.options.length === 2 && SH.options[0].value === 'B1' && /Ana/.test(SH.options[0].text) && /23\/10\/2026/.test(SH.options[0].text) && /26\/10\/2026/.test(SH.options[0].text), JSON.stringify(SH.options));
  ok('ejecuta v33: copiar pide el k de la reserva elegida', SH.calls[1] && SH.calls[1].body.bookingCode === 'B2' && SH.calls[1].body.Hostawayid === '4242', JSON.stringify(SH.calls[1]));
  ok('ejecuta v33: el enlace copiado = esta pagina + Hostawayid + k', SH.copied === 'https://www.3villas.com/intranet/manual-villa.html?Hostawayid=4242&k=K.B2', SH.copied);
  ok('ejecuta v33: el aviso dice las fechas en que se ve la clave', /01\/11\/2026/.test(SH.msg) && /05\/11\/2026/.test(SH.msg), SH.msg);
  var SN = await runShare({ empty: true });
  ok('ejecuta v33: sin reservas -> aviso share_none y sin boton', SN.btnHidden === true && /NONE/.test(SN.msg), JSON.stringify(SN));
  var SE = await runShare({ fail: 'Esta estancia ya ha terminado.' });
  ok('ejecuta v33: error del Worker al copiar -> se ve el motivo, nada copiado', SE.copied === null && /terminado/.test(SE.msg), JSON.stringify(SE));
  /* v34 (Astra 24 §4): dos peticiones a la vez -> se copia siempre la ultima reserva elegida */
  var RC = await runRace('click');
  ok('ejecuta v34: B1 y luego B2, B2 contesta antes -> el portapapeles acaba con B2', RC.copied.length >= 1 && /k=K\.B2$/.test(RC.copied[RC.copied.length - 1]) && !RC.copied.some(function (x) { return /k=K\.B1$/.test(x); }), JSON.stringify(RC.copied));
  var RS = await runRace('select');
  ok('ejecuta v34: B1 pedido, luego se elige B2 sin pulsar -> no se copia B1', RS.copied.length === 0, JSON.stringify(RS.copied));

  /* v34 (Astra 24 §3): una pestaña abierta no se queda con la clave fuera de la estancia */
  var NOW = Date.UTC(2026, 9, 26, 10, 0, 0);   // 26/10/2026 11:00 en Madrid
  var w1 = await runWifi({ now: NOW, villa: { stayTo: '2026-10-25' }, reply: { Wifi_password: 'secret', stayTo: '2026-10-25' } });
  ok('ejecuta v34: el dia en Madrid pasa la salida -> candado sin preguntar a la red', w1.fetches === 0 && w1.villa.restricted === true && !('Wifi_password' in w1.villa) && /🔒/.test(w1.pass) && w1.copyHidden && w1.qrHidden, JSON.stringify(w1));
  var w1b = await runWifi({ now: Date.UTC(2026, 9, 25, 21, 59, 0), villa: { stayTo: '2026-10-25' }, reply: { Wifi_password: 'secret', stayTo: '2026-10-25' } });
  ok('ejecuta v34: 23:59 del dia de salida en Madrid -> la clave sigue', w1b.villa.Wifi_password === 'secret' && !w1b.villa.restricted, JSON.stringify(w1b));
  var w1c = await runWifi({ now: Date.UTC(2026, 9, 25, 23, 1, 0), villa: { stayTo: '2026-10-25' }, reply: { Wifi_password: 'secret', stayTo: '2026-10-25' } });
  ok('ejecuta v34: 00:01 del dia siguiente en Madrid (cambio de hora) -> candado', w1c.villa.restricted === true, JSON.stringify(w1c));
  var w2 = await runWifi({ now: NOW, force: true, villa: { stayTo: '2026-10-27' }, reply: { restricted: true, stay: 'cancelled' } });
  ok('ejecuta v34: al volver a la pestaña el Worker dice restringido (cancelada) -> candado', w2.fetches === 1 && w2.villa.restricted === true && !('Wifi_password' in w2.villa) && /🔒/.test(w2.pass), JSON.stringify(w2));
  var w3 = await runWifi({ now: NOW, force: true, offline: true, villa: { stayTo: '2026-10-27' } });
  ok('ejecuta v34: sin red dentro de las fechas -> la clave sigue (el huesped la necesita)', w3.fetches === 1 && w3.villa.Wifi_password === 'secret' && !w3.villa.restricted, JSON.stringify(w3));
  var w4 = await runWifi({ now: NOW, at: NOW - 60000, villa: {}, reply: { restricted: true } });
  ok('ejecuta v34: comprobacion de cada minuto con la ultima lectura reciente -> no llama', w4.fetches === 0 && w4.villa.Wifi_password === 'secret', JSON.stringify(w4));
  var w5 = await runWifi({ now: NOW, at: NOW - 16 * 60000, villa: {}, reply: { restricted: true, stay: 'after' } });
  ok('ejecuta v34: pasados 15 minutos -> pregunta y aplica la respuesta', w5.fetches === 1 && w5.villa.restricted === true, JSON.stringify(w5));
  var w6 = await runWifi({ now: NOW, force: true, qrOpen: true, villa: { stayTo: '2026-10-27' }, reply: { restricted: true, stay: 'after' } });
  ok('ejecuta v34: el QR de la wifi abierto se cierra al poner el candado', w6.closed === true, JSON.stringify(w6));
  var w7 = await runWifi({ now: NOW, force: true, villa: { stayTo: '2026-10-27' }, reply: { Wifi_password: 'nueva', stayTo: '2026-10-27' } });
  ok('ejecuta v34: la clave cambia en Caspio -> se ve la nueva', w7.villa.Wifi_password === 'nueva' && w7.pass === 'nueva', JSON.stringify(w7));
  var w7b = await runWifi({ now: NOW, force: true, at: NOW - 5000, villa: { stayTo: '2026-10-27' }, reply: { restricted: true } });
  ok('ejecuta v34: volver a la pestaña dos veces en 30 segundos -> una sola lectura', w7b.fetches === 0 && w7b.villa.Wifi_password === 'secret', JSON.stringify(w7b));
  var w9 = await runWifi({ now: NOW, at: NOW - 16 * 60000, hidden: true, villa: { stayTo: '2026-10-27' }, reply: { restricted: true } });
  ok('ejecuta v34: pestaña en segundo plano -> no llama al Worker (la fecha si se mira)', w9.fetches === 0 && w9.villa.Wifi_password === 'secret', JSON.stringify(w9));
  var w9b = await runWifi({ now: NOW, hidden: true, villa: { stayTo: '2026-10-25' } });
  ok('ejecuta v34: pestaña en segundo plano pasada la salida -> candado igual', w9b.villa.restricted === true && w9b.fetches === 0, JSON.stringify(w9b));
  var w8 = await runWifi({ now: NOW, force: true, villa: { restricted: true, stay: 'before' } });
  ok('ejecuta v34: ya restringido -> no hace nada', w8.fetches === 0, JSON.stringify(w8));

  /* v34 (Astra 24 §2): los campos de la villa nunca entran como HTML */
  var X = '<img src=x onerror=alert(1)>';
  var tp = runTextPopup(X);
  ok('ejecuta v34: showTextPopup con HTML en el campo -> se ve como texto, sin etiqueta', tp.html === '' && tp.child && tp.child.textContent === X && tp.child.tag === 'p', JSON.stringify(tp));
  console.log('\n' + pass + ' pass, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})();

/* v34: una pagina de mentira con dos peticiones de enlace que contestan en otro orden */
async function runRace(mode) {
  var copied = [], pending = {};
  var els = {};
  function el(id) { if (!els[id]) els[id] = { id: id, style: {}, textContent: '', value: '', options: [], innerHTML: '',
    appendChild: function (o) { this.options.push(o); if (!this.value) this.value = o.value; } }; return els[id]; }
  var doc = { getElementById: el, createElement: function () { return { value: '', text: '', disabled: false }; } };
  var fakeFetch = function (u, init) {
    var body = JSON.parse((init && init.body) || '{}');
    if (!body.bookingCode) return Promise.resolve({ status: 200, ok: true, json: function () { return Promise.resolve({ bookings: [{ code: 'B1', name: 'Ana', from: '2026-10-23', to: '2026-10-26' }, { code: 'B2', name: 'Luis', from: '2026-11-01', to: '2026-11-05' }] }); } });
    return new Promise(function (res) { pending[body.bookingCode] = function () { res({ status: 200, ok: true, json: function () { return Promise.resolve({ k: 'K.' + body.bookingCode, from: '2026-11-01', to: '2026-11-05' }); } }); }; });
  };
  var nav = { clipboard: { writeText: function (x) { copied.push(x); return Promise.resolve(); } } };
  var loc = { origin: 'https://www.3villas.com', pathname: '/intranet/manual-villa.html' };
  var tS = 'var _T={share_btn:"COPY",share_ok:"OK {from} {to}",share_pick:"PICK",share_none:"NONE"};function t(k){return _T[k];}';
  var pre = /var _shareSeq\b[^\n]*/.exec(SRC); pre = pre ? pre[0] : '';
  var run = new Function('document', 'fetch', 'navigator', 'location', 'WORKER', '_hwId', '_authTok', 'window', 'pending', 'mode',
    tS + pre + ';' + fnSource(SRC, 'fmtDay') + ';async ' + fnSource(SRC, 'loadShareBookings') + ';async ' + fnSource(SRC, 'copyGuestLink') +
    ';return async function(){ await loadShareBookings(); var sel=document.getElementById("shareSel"); sel.value="B1"; var p1=copyGuestLink();' +
    ' if (mode==="click") { sel.value="B2"; var p2=copyGuestLink(); pending.B2(); await p2; pending.B1(); await p1; }' +
    ' else { sel.value="B2"; pending.B1(); await p1; } };');
  await run(doc, fakeFetch, nav, loc, 'https://www.3villas.com/intranet/api', '4242', 'STAFF', { prompt: function (a, b) { copied.push(b); } }, pending, mode)();
  return { copied: copied };
}

/* v34: wifiCheck con un reloj, un DOM y un fetchVilla de mentira */
async function runWifi(opt) {
  var els = {}; function el(id) { if (!els[id]) els[id] = { id: id, style: {}, textContent: '' }; return els[id]; }
  el('popupTitle').textContent = opt.qrOpen ? '📶 Wifi QR' : '';
  el('wifiPass').textContent = (opt.villa && opt.villa.restricted) ? '🔒 x' : 'secret';
  var st = { closed: false, fetches: 0 };
  var villa = Object.assign({ Wifi_user: 'Red', Wifi_password: 'secret' }, opt.villa || {});
  if (villa.restricted) delete villa.Wifi_password;
  var fv = function () { st.fetches++; return opt.offline ? Promise.reject(new Error('sin red')) : Promise.resolve(Object.assign({}, opt.reply)); };
  var NOWv = opt.now;
  var RD = Date;
  function FD(a) { return arguments.length ? new RD(a) : new RD(NOWv); }
  FD.now = function () { return NOWv; }; FD.UTC = RD.UTC; FD.parse = RD.parse;
  var pre = /var WIFI_RECHECK_MS\b[^\n]*/.exec(SRC); pre = pre ? pre[0] : 'var WIFI_RECHECK_MS=0;';
  var src = pre + ';var _villa=V, _hwId="4242", _wifiAt=AT, _wifiBusy=false;' +
    'var _T={wifi_after:"A",wifi_locked:"L",wifi_before:"B ({date}).",wifi_checkin:"C"};function t(k){return _T[k];}' +
    fnSource(SRC, 'wifiLockText') + ';' + fnSource(SRC, 'madridToday') + ';' + fnSource(SRC, 'lockWifi') + ';async ' + fnSource(SRC, 'wifiCheck') +
    ';return async function(f){ await wifiCheck(f); return _villa; };';
  var out;
  try {
    var mk = new Function('document', 'fetchVilla', 'closePopup', 'Date', 'V', 'AT', src);
    out = await mk({ getElementById: el, visibilityState: opt.hidden ? 'hidden' : 'visible' }, fv, function () { st.closed = true; }, FD, villa, opt.at == null ? opt.now - (opt.force ? 60000 : 0) : opt.at)(!!opt.force);
  } catch (e) { return { error: String(e && e.message || e), fetches: st.fetches, villa: villa }; }
  return { villa: out, fetches: st.fetches, closed: st.closed, pass: el('wifiPass').textContent,
    copyHidden: el('copyPassBtn').style.display === 'none', qrHidden: el('wifiQrBtn').style.display === 'none' };
}

/* v34: showTextPopup con un DOM de mentira que distingue texto y HTML */
function runTextPopup(text) {
  var body = { textContent: '', children: [], appendChild: function (c) { this.children.push(c); } };
  Object.defineProperty(body, 'innerHTML', { get: function () { return this._h || ''; }, set: function (v) { this._h = v; } });
  var title = { textContent: '' };
  var doc = { getElementById: function (id) { return id === 'popupBody' ? body : title; },
    createElement: function (tag) { return { tag: tag, style: {}, textContent: '' }; } };
  try {
    new Function('document', 'openPopupCentered', fnSource(SRC, 'showTextPopup') + ';showTextPopup("T", ' + JSON.stringify(text) + ');')(doc, function () {});
  } catch (e) { return { error: String(e && e.message || e) }; }
  return { html: body.innerHTML, child: body.children[0] || null };
}

/* v34 (Astra 24 §2): ninguna asignacion a innerHTML lleva datos de la villa, del Worker o de la pagina */
(function () {
  var bad = [], re = /\.innerHTML\s*\+?=\s*([^;]*);/g, m;
  var DATA = /(?<![\w-])(v|it|d|_villa|villa)\.(?!body\b)|\b(val|text|ssid|pass|phone|phoneClean|waNum|name|label|lbl|err|msg)\b/;
  while ((m = re.exec(LIVE))) if (DATA.test(m[1])) bad.push(m[1].slice(0, 80));
  ok('v34: ninguna innerHTML con datos de la villa (campos, wifi, telefono, textos de error)', bad.length === 0, JSON.stringify(bad));
  ok('v34: showWifiQR no ensena la clave si la wifi esta restringida', /_villa\s*&&\s*_villa\.restricted/.test(fnSource(SRC, 'showWifiQR')));
  var RM = fnSource(SRC, 'renderManager');
  ok('v34: renderManager: el enlace tel: y wa.me solo llevan cifras (y +)', /replace\(\/\[\^\\d\+\]\/g/.test(RM) && /replace\(\/\\D\/g/.test(RM), RM.slice(0, 120));
  ok('v34: al volver a la pestaña, al volver con atras y cada minuto se comprueba la wifi', /addEventListener\('visibilitychange'/.test(LIVE) && /addEventListener\('pageshow'/.test(LIVE) && /setInterval\(function\(\)\{\s*wifiCheck\(/.test(LIVE));
  ok('v34: init apunta la hora de la primera lectura (_wifiAt)', /_wifiAt=Date\.now\(\)/.test(LIVE.split('(async function init(){')[1] || ''));
  ok('v34: copyGuestLink descarta respuestas viejas (_shareSeq) y si la reserva elegida cambio', /_shareSeq/.test(fnSource(SRC, 'copyGuestLink')) && /sel\.value\s*!==\s*code/.test(fnSource(SRC, 'copyGuestLink')));
})();

var G = fnSource(SRC, 'guestCheckinToken');
ok('guestCheckinToken: lee el token y no lo usa si la sesion ha caducado', /\.token/.test(G) && /expires/.test(G) && /Date\.now\(\)/.test(G));
ok('guestCheckinToken: un JSON roto o sin localStorage no rompe la pagina', /try\{/.test(G) && /catch\(e\)/.test(G));

var R = fnSource(SRC, 'renderVilla');
ok('restricted: la clave wifi no sale, texto segun la fase de la estancia', /v\.restricted/.test(R) && /wifiLockText\(v\)/.test(R));
ok('restricted: sin boton de copiar ni QR de la wifi', /copyPassBtn'\)\.style\.display='none'/.test(R) && /wifiQrBtn'\)\.style\.display='none'/.test(R));
var W = fnSource(SRC, 'wifiLockText');
ok('wifiLockText: before -> wifi_before con la fecha de llegada', /'before'/.test(W) && /wifi_before/.test(W) && /stayFrom/.test(W));
ok('wifiLockText: after -> wifi_after; checkin -> wifi_checkin; el resto -> wifi_locked', /'after'/.test(W) && /wifi_after/.test(W) && /'checkin'/.test(W) && /wifi_checkin/.test(W) && /wifi_locked/.test(W));
ok('v33: barra del equipo (shareBar, lista shareSel y boton) y sin el shareKey de la v31', /id="shareBar"/.test(LIVE) && /id="shareSel"/.test(LIVE) && /onclick="copyGuestLink\(\)"/.test(LIVE) && !/shareKey/.test(LIVE));
ok('v33: renderVilla ensena la barra solo con canShare y entonces carga la lista', /v\.canShare/.test(R) && /loadShareBookings\(\)/.test(R));
['share_btn', 'share_ok', 'share_pick', 'share_none'].forEach(function (k) {
  ok(k + ' en los cinco idiomas (ca, es, en, fr, de)', (SRC.match(new RegExp('\\b' + k + ':', 'g')) || []).length === 5);
});
ok('share_ok lleva {from} y {to} en los cinco idiomas', (SRC.match(/\bshare_ok:"[^"]*\{from\}[^"]*\{to\}/g) || []).length === 5);
ok('los textos ya no dicen 30 dias', !/30 d[ií]as|30 days|30 dies|30 jours|30 Tage/.test(SRC.split('<!-- HISTORIAL:')[0]));
['wifi_locked', 'wifi_before', 'wifi_after', 'wifi_checkin'].forEach(function (k) {
  ok(k + ' en los cinco idiomas (ca, es, en, fr, de)', (SRC.match(new RegExp('\\b' + k + ':', 'g')) || []).length === 5);
});
ok('wifi_locked ya no habla del enlace que le enviamos', !/enlace que le enviamos|link we sent you/.test(SRC));
ok('wifi_before lleva {date}', (SRC.match(/\bwifi_before:"[^"]*\{date\}/g) || []).length === 5);
ok('copyWifiPass no copia el texto de bloqueo', /_villa\s*&&\s*_villa\.restricted/.test(fnSource(SRC, 'copyWifiPass')));

/* La funcion pura del texto, ejecutada */
var tSrc = 'var _T={wifi_before:"B ({date}).",wifi_after:"A",wifi_checkin:"C",wifi_locked:"L"};function t(k){return _T[k];}';
var wlt = new Function(tSrc + W + ';return wifiLockText;')();
ok('ejecuta: before con 2026-10-25 -> "B (25/10/2026)."', wlt({ stay: 'before', stayFrom: '2026-10-25' }) === 'B (25/10/2026).', wlt({ stay: 'before', stayFrom: '2026-10-25' }));
ok('ejecuta: before sin fecha -> "B." sin {date} ni parentesis', wlt({ stay: 'before' }) === 'B.', wlt({ stay: 'before' }));
ok('ejecuta: after -> A, checkin -> C, villa -> L, sin stay -> L', wlt({ stay: 'after' }) === 'A' && wlt({ stay: 'checkin' }) === 'C' && wlt({ stay: 'villa' }) === 'L' && wlt({}) === 'L');

/* guestCheckinToken ejecutada con un localStorage de mentira */
function runG(store) {
  var ls = { getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; } };
  return new Function('localStorage', G + ';return guestCheckinToken();')(ls);
}
ok('ejecuta: sesion vigente -> el token', runG({ '3v_checkin_auth': JSON.stringify({ code: 'BK1', token: 'tok', expires: Date.now() + 60000 }) }) === 'tok');
ok('ejecuta: sesion caducada -> vacio', runG({ '3v_checkin_auth': JSON.stringify({ code: 'BK1', token: 'tok', expires: Date.now() - 1 }) }) === '');
ok('ejecuta: sin sesion o JSON roto -> vacio', runG({}) === '' && runG({ '3v_checkin_auth': '{roto' }) === '');
/* El resumen lo escribe el bloque async de fetchVilla, que termina el ultimo. */
