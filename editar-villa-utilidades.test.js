/* Pruebas de los campos de instrucciones por suministro (electricidad, agua, gas) en la seccion
   Emergencias de editar-villa.html v25 y villa.html v22 (peticion de Nazaret, TIC, 13/09/2026).
   node editar-villa-utilidades.test.js

   Como lugar-villa.test.js: NO copia el codigo de las paginas. Extrae con vm las listas reales
   (TEXT_FIELDS, PENDING_RULES) y comprueba las llamadas buildTA y su orden en el HTML. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
function src(f) { return fs.readFileSync(f, 'utf8'); }
function scriptsCompile(file) {
  var s = src(file), re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, n = 0;
  while ((m = re.exec(s))) { n++; new vm.Script(m[1], { filename: file + '#script' + n }); }
  return n;
}
function constBlock(s, name) {
  var a = s.indexOf('const ' + name + '='), b;
  if (a < 0) throw new Error('no encuentro ' + name);
  b = s.indexOf('];', a); if (b < 0) throw new Error('sin cierre ' + name);
  return s.slice(a, b + 2).replace(/^const /, 'var ');
}
var NEW = ['Electricidad_info_team', 'Electricidad_info_guest', 'Agua_info_team', 'Agua_info_guest', 'Gas_info_team', 'Gas_info_guest'];
var LABEL = { team: 'Instrucciones para el equipo', guest: 'Instrucciones para el inquilino' };

function emergBlock(s, file) {
  var a = s.indexOf("buildSection('emerg'"), b = s.indexOf("buildSection('piscina'", a);
  if (a < 0 || b < 0) throw new Error('sin seccion emerg/piscina en ' + file);
  return s.slice(a, b);
}
function checkPage(file, ver, titleRe) {
  console.log(file);
  var s = src(file);
  ok('los scripts inline compilan', (function () { try { return scriptsCompile(file) > 0; } catch (e) { return e.message; } })() === true);
  var pv = s.match(/const PAGE_VERSION = (\d+);/), hv = s.match(/VERSIÓN ACTUAL: v(\d+) \|/), tv = s.match(titleRe);
  ok('v' + ver + ' en PAGE_VERSION, cabecera y titulo', pv && hv && tv && pv[1] === String(ver) && hv[1] === String(ver) && tv[1] === String(ver), [pv && pv[1], hv && hv[1], tv && tv[1]].join('/'));
  ok('historial v' + ver, new RegExp('<!-- HISTORIAL: v' + ver + ' - ').test(s));
  ok('el comentario HISTORIAL cierra una sola vez (sin cierre prematuro)', s.slice(s.indexOf('<!-- HISTORIAL: v' + ver)).split('-->').length === 2);
  var e = emergBlock(s, file);
  NEW.forEach(function (f) {
    var kind = /_team$/.test(f) ? 'team' : 'guest', vis = kind === 'team' ? 2 : 1;
    var re = new RegExp("buildTA\\('" + f + "','" + LABEL[kind] + "',d,2," + vis + "[,)]");
    ok(f + ' en Emergencias con etiqueta y vis=' + vis, re.test(e));
    ok(f + ' tiene una sola caja en la pagina', s.split("buildTA('" + f + "'").length === 2, String(s.split("buildTA('" + f + "'").length - 1));
  });
  ok('subgrupo cliente = sg-guest, equipo = sg-internal (los seis)',
    /Electricidad — equipo','sg-internal'/.test(e) && /Electricidad — visible por el cliente','sg-guest'/.test(e) &&
    /Agua — equipo','sg-internal'/.test(e) && /Agua — visible por el cliente','sg-guest'/.test(e) &&
    /Gas — equipo','sg-internal'/.test(e) && /Gas — visible por el cliente','sg-guest'/.test(e));
  /* orden: cuadro electrico -> fotos -> Electricidad -> llave agua -> ... -> llave calle -> Agua -> Gas -> botiquin */
  var p = ['cloudflare_fotocuadroelectrico6', 'Electricidad_info_team', 'Electricidad_info_guest', 'wher_is_water_stopcock', 'where_is_water_stopcock_street', 'Agua_info_team', 'Agua_info_guest', 'Gas_info_team', 'Gas_info_guest', 'first_aid_kit'].map(function (k) { return e.indexOf("'" + k + "'"); });
  ok('orden dentro de Emergencias', p.every(function (x, i) { return x >= 0 && (i === 0 || x > p[i - 1]); }), p.join(','));
  ok('Caldera y Jacuzzi intactos', /buildTA\('Caldera_info_team'/.test(s) && /buildTA\('Caldera_info_guest'/.test(s) && /buildTA\('Jacuzzi_info_team'/.test(s) && /buildTA\('Jacuzzi_info_guest'/.test(s));
  return s;
}

var sEdit = checkPage('editar-villa.html', 25, /<title>Editar Villa v(\d+)/);
(function () {
  var ctx = {};
  vm.runInNewContext(constBlock(sEdit, 'TEXT_FIELDS'), ctx);
  ok('TEXT_FIELDS es una lista', Array.isArray(ctx.TEXT_FIELDS), typeof ctx.TEXT_FIELDS);
  NEW.forEach(function (f) { ok('TEXT_FIELDS incluye ' + f, ctx.TEXT_FIELDS.indexOf(f) >= 0); });
  /* v24 ya traia cinco nombres repetidos (Status_Homestaging, Homestaging_Comments, Status_Photos, Photos_Comments, Deadlinedataphotos); inocuo (misma clave dos veces en el objeto) y fuera del alcance de v25 */
  NEW.forEach(function (f) { ok('TEXT_FIELDS tiene ' + f + ' una sola vez', ctx.TEXT_FIELDS.filter(function (x) { return x === f; }).length === 1); });
  ok('Notas_keyholder sigue en TEXT_FIELDS', ctx.TEXT_FIELDS.indexOf('Notas_keyholder') >= 0);
  var pa = sEdit.indexOf('const PENDING_RULES = {'), pb = sEdit.indexOf('\n};', pa) + 3;
  var c2 = {}; vm.runInNewContext(sEdit.slice(pa, pb).replace(/^const /, 'var '), c2);
  NEW.forEach(function (f) { ok('PENDING_RULES NO tiene ' + f + ' (sin aviso rojo en 200 villas)', !(f in c2.PENDING_RULES)); });
  /* tipos: los seis son texto libre, nunca INT/BOOL/NUM/DATE */
  ['INT_FIELDS', 'BOOL_FIELDS', 'NUM_FIELDS', 'DATE_FIELDS'].forEach(function (n) {
    var i = sEdit.indexOf('const ' + n + '='), j = sEdit.indexOf(']);', i) + 3;
    if (i < 0) { ok(n + ' existe', false); return; }
    var c3 = {}; vm.runInNewContext(sEdit.slice(i, j).replace(/^const /, 'var '), c3);
    ok(n + ' no contiene los seis', NEW.every(function (f) { return !c3[n].has(f); }));
  });
  ok('el historial v25 no lleva nombres de personas ajenas ni horas', !/Amanda|\d{1,2}:\d{2}/.test(sEdit.slice(sEdit.indexOf('<!-- HISTORIAL: v25'), sEdit.indexOf('| v24 - '))));
})();

checkPage('villa.html', 22, /<title>Villa Info v(\d+)/);

/* los pines de version de otras pruebas no apuntan a estas dos paginas */
(function () {
  var others = fs.readdirSync('.').filter(function (f) { return /\.test\.js$/.test(f) && f !== 'editar-villa-utilidades.test.js'; });
  var hits = others.filter(function (f) { var t = src(f); return /Editar Villa v\d+|Villa Info v\d+/.test(t); });
  ok('ninguna otra prueba fija la version de editar-villa/villa.html', hits.length === 0, hits.join(','));
})();

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
