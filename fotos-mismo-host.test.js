/* Pruebas de fotoUrl (villa.html v23, editar-villa.html v27, checkin-pasos.html v103):
   las fotos del bucket R2 se piden por el mismo host www.3villas.com/intranet/fotos/
   porque los operadores espanoles bloquean r2.dev las tardes de partido de LaLiga
   (caso Amanda, 19/09/2026). node fotos-mismo-host.test.js

   Como unidad-direccion.test.js: NO copia el codigo de la pagina. Extrae la funcion
   real de cada HTML y la ejecuta. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

var R2 = 'https://pub-48c1cfd5de614ff0a0cebfec482a7b32.r2.dev/villa-info/23_cloudflare_foto1_keybox1_1789218874934.jpg';
var SAME = 'https://www.3villas.com/intranet/fotos/villa-info/23_cloudflare_foto1_keybox1_1789218874934.jpg';
var CASPIO = 'https://eucdn.caspio.com/353F7000/Informacion Villas/17779723064811290994975734235221.jpg';

function fnSource(s, name) {
  var i = s.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = s.indexOf('{', i), depth = 0, k = j;
  for (; k < s.length; k++) { if (s[k] === '{') depth++; else if (s[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return s.slice(i, k);
}
function constLine(s, name) {
  var m = s.match(new RegExp("(?:const|var) " + name + "='[^']+';"));
  if (!m) throw new Error('no encuentro ' + name);
  return m[0].replace(/^const /, 'var ');
}

[
  { file: 'villa.html', v: /VERSIÓN ACTUAL:\s*v(\d+)/, title: /<title>Villa Info v(\d+)/, min: 23 },
  { file: 'editar-villa.html', v: /VERSIÓN ACTUAL:\s*v(\d+)/, title: /<title>Editar Villa v(\d+)/, min: 27 },
  { file: 'checkin-pasos.html', v: /VERSIÓN ACTUAL:\s*v(\d+)/, title: /<title>Check-in Pasos v(\d+)/, min: 103 }
].forEach(function (t) {
  var s = fs.readFileSync(t.file, 'utf8');
  console.log(t.file);
  var vTop = (s.match(t.v) || [])[1], vTitle = (s.match(t.title) || [])[1];
  ok('version igual en comentario y titulo (' + vTop + ')', vTop && vTop === vTitle, vTop + '/' + vTitle);
  ok('version >= ' + t.min, parseInt(vTop, 10) >= t.min);
  var ctx = {};
  vm.createContext(ctx);
  vm.runInContext(constLine(s, 'R2_PUBLIC') + '\n' + constLine(s, 'FOTOS_HOST') + '\n' + fnSource(s, 'fotoUrl'), ctx);
  ok('fotoUrl: r2.dev -> mismo host', ctx.fotoUrl(R2) === SAME, ctx.fotoUrl(R2));
  ok('fotoUrl: con espacios alrededor', ctx.fotoUrl('  ' + R2 + ' ') === SAME);
  ok('fotoUrl: la foto de Caspio no cambia', ctx.fotoUrl(CASPIO) === CASPIO);
  ok('fotoUrl: otro host no cambia', ctx.fotoUrl('https://example.com/x.jpg') === 'https://example.com/x.jpg');
  ok('fotoUrl: vacio y null pasan tal cual', ctx.fotoUrl('') === '' && ctx.fotoUrl(null) === null);
  ok('fotoUrl: __cleared__ no cambia', ctx.fotoUrl('__cleared__') === '__cleared__');
});

/* Los tres sitios de pintado usan fotoUrl */
var villa = fs.readFileSync('villa.html', 'utf8');
ok('villa.html photoBox usa fotoUrl y onerror', /const src=fotoUrl\(url\);[\s\S]{0,400}img\.onerror=/.test(fnSource(villa, 'photoBox')));
var editar = fs.readFileSync('editar-villa.html', 'utf8');
ok('editar-villa.html buildPhotoSlot usa fotoUrl y onerror', /const src=fotoUrl\(currentUrl\);[\s\S]{0,400}img\.onerror=/.test(fnSource(editar, 'buildPhotoSlot')));
ok('editar-villa.html guarda la URL original (startUpload no toca fotoUrl)', fnSource(editar, 'startUpload').indexOf('fotoUrl') < 0 && fnSource(editar, 'getUploadUrl').indexOf('fotoUrl') < 0);
var pasos = fs.readFileSync('checkin-pasos.html', 'utf8');
ok('checkin-pasos.html _p0RenderKbPhotos aplica fotoUrl a las tres fotos', /\.filter\(function\(u\)\{ return u\.trim\(\)!==''; \}\)\.map\(fotoUrl\)/.test(fnSource(pasos, '_p0RenderKbPhotos')));

console.log('\n' + pass + ' pass, ' + fail + ' fail');
if (fail) process.exit(1);
