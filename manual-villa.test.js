/* Pruebas de manual-villa.html v32: la clave wifi con la sesion del equipo, o con el
   check-in online del huesped en este mismo telefono, del dia de llegada al dia de salida
   (Worker caspio-proxy v64.3-sec). El enlace de 30 dias de la v31 se retira.
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

console.log('manual-villa.html v32');
ok('cabecera, titulo e historial v32', /VERSIÓN ACTUAL: v32 \|/.test(SRC) && /<title>Manual Villa v32 — 3Villas<\/title>/.test(SRC) &&
  /<!-- HISTORIAL: v32 - /.test(SRC) && / \| v31 - /.test(SRC));

var F = fnSource(SRC, 'fetchVilla');
ok('fetchVilla ya no manda ?k= (enlace de 30 dias retirado)', !/get\('k'\)/.test(F) && !/&k=/.test(F));
ok('fetchVilla manda la sesion del equipo (3v_token) si existe', /3v_token/.test(F) && /Authorization/.test(F));
ok('sin sesion del equipo, manda el token del check-in del huesped (3v_checkin_auth)', /guestCheckinToken\(\)/.test(F) && /3v_checkin_auth/.test(fnSource(SRC, 'guestCheckinToken')));
ok('con un token caducado (401) repite sin token, el manual no se cae', /status!==401/.test(F) && /fetch\(url\)/.test(F));

/* Astra 19 §5: una sesion del equipo caducada no tapa el token del huesped. fetchVilla ejecutada con fetch de mentira. */
async function runF(store, answers) {
  var calls = [];
  var ls = { getItem: function (k) { return Object.prototype.hasOwnProperty.call(store, k) ? store[k] : null; } };
  var fakeFetch = function (u, init) {
    var auth = (init && init.headers && init.headers.Authorization) || '';
    calls.push(auth);
    var st = answers[auth] || 200;
    return Promise.resolve({ status: st, ok: st < 400, json: function () { return Promise.resolve({ Name_villa_para_inquilinos: 'V', who: auth }); } });
  };
  var mk = new Function('localStorage', 'sessionStorage', 'fetch', 'WORKER',
    'var _authTok="";' + fnSource(SRC, 'guestCheckinToken') + ';async ' + F + ';return async function(){ var d=await fetchVilla("4242"); return {d:d, tok:_authTok}; };');
  var out = await mk(ls, ls, fakeFetch, 'https://w.test/')();
  return { calls: calls, out: out };
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
  console.log('\n' + pass + ' pass, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
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
ok('sin barra de enlace ni copyGuestLink ni shareKey', !/shareBar/.test(LIVE) && !/copyGuestLink/.test(LIVE) && !/shareKey/.test(LIVE));
ok('sin textos share_btn ni share_ok', !/\bshare_btn:/.test(SRC) && !/\bshare_ok:/.test(SRC));
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
