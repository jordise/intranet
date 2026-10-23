/* Pruebas de manual-villa.html v31: la clave wifi solo con sesion del equipo o con el
   enlace firmado (Worker caspio-proxy v64.2-sec, revision de seguridad del 23/10/2026).
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

console.log('manual-villa.html v31');
ok('cabecera, titulo e historial v31', /VERSIÓN ACTUAL: v31 \|/.test(SRC) && /<title>Manual Villa v31 — 3Villas<\/title>/.test(SRC) &&
  /<!-- HISTORIAL: v31 - /.test(SRC) && / \| v30 - /.test(SRC));

var F = fnSource(SRC, 'fetchVilla');
ok('fetchVilla manda el enlace firmado (?k=) cuando viene en la URL', /params?\.get\('k'\)|_manualKey/.test(F) && /&k='\+encodeURIComponent/.test(F));
ok('fetchVilla manda la sesion del equipo (3v_token) en Authorization si existe', /3v_token/.test(F) && /Authorization/.test(F));
ok('con una sesion caducada (401) repite sin la sesion, el manual no se cae', /status===401/.test(F) && /fetch\(url\)/.test(F));

var R = fnSource(SRC, 'renderVilla');
ok('restricted: la clave wifi no sale y se dice que la pida al gestor', /v\.restricted/.test(R) && /t\('wifi_locked'\)/.test(R));
ok('restricted: sin boton de copiar ni QR de la wifi', /copyPassBtn'\)\.style\.display='none'/.test(R) && /wifiQrBtn'\)\.style\.display='none'/.test(R));
ok('shareKey (solo equipo): barra para copiar el enlace del huesped', /v\.shareKey/.test(R) && /shareBar/.test(LIVE));
ok('el enlace del huesped lleva Hostawayid y k', /Hostawayid='\+encodeURIComponent\(_hwId\)\+'&k='\+encodeURIComponent\(_villa\.shareKey\)/.test(SRC));
ok('wifi_locked en los cinco idiomas (ca, es, en, fr, de)', (SRC.match(/\bwifi_locked:/g) || []).length === 5);
ok('share_btn en los cinco idiomas', (SRC.match(/\bshare_btn:/g) || []).length === 5);
ok('copyWifiPass no copia el texto de bloqueo', /_villa\s*&&\s*_villa\.restricted/.test(fnSource(SRC, 'copyWifiPass')));

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
