/* Pruebas del numero de la villa/unidad debajo de la direccion (checkin-pasos v101) y de la
   direccion propia de la unidad (v102: campos Address y Googlemaps_link de TaMultiunits).
   Marta Deza + Jordi, Feel Good 17/09/2026: en Villas Menorca Sur la direccion comun es
   "Carrer de Mestral, 2" y los huespedes de otras villas iban a la villa 2.
   node unidad-direccion.test.js

   Como lugar-villa.test.js: NO copia el codigo de la pagina. Extrae las funciones reales
   del HTML y las ejecuta. Nunca imprime datos de huespedes. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var FILE = 'checkin-pasos.html';
var s = fs.readFileSync(FILE, 'utf8');
function fnSource(name) {
  var i = s.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = s.indexOf('{', i), depth = 0, k = j;
  for (; k < s.length; k++) { if (s[k] === '{') depth++; else if (s[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return s.slice(i, k);
}

/* 1. Version coherente en los tres sitios */
var vTop = (s.match(/VERSIÓN ACTUAL:\s*v(\d+)/) || [])[1];
var vTitle = (s.match(/<title>Check-in Pasos v(\d+)/) || [])[1];
var vJs = (s.match(/PAGE_VERSION = (\d+)/) || [])[1];
ok('version igual en comentario, titulo y PAGE_VERSION (' + vTop + ')', vTop && vTop === vTitle && vTop === vJs, vTop + '/' + vTitle + '/' + vJs);
ok('version >= 102', parseInt(vTop, 10) >= 102);

/* 2. El HTML tiene el hueco y el estilo */
ok('existe #p0KiUnit debajo de la direccion', /id="p0KiAddr"[\s\S]{0,200}id="p0KiUnit"/.test(s));
ok('#p0KiUnit nace oculto', /id="p0KiUnit" style="display:none"/.test(s));
ok('estilo .unit-badge en rojo', /#paso0 \.unit-badge\{[^}]*color:var\(--red\)/.test(s));

/* 3. Las dos ramas de la pestana Keys llaman a _p0RenderUnit */
var calls = (s.match(/_p0RenderUnit\(r\);/g) || []).length;
ok('_p0RenderUnit(r) se llama en las dos ramas (codigo visible y cuenta atras)', calls === 2, 'llamadas: ' + calls);

/* 4. Las funciones reales */
var ctx = {};
vm.createContext(ctx);
vm.runInContext(fnSource('_p0MuIds') + '\n' + fnSource('_p0MuData') + '\n' + fnSource('_p0UnitLabel') + '\n' + fnSource('_p0UnitAddress'), ctx);
function label(r) { return vm.runInContext('_p0UnitLabel(' + JSON.stringify(r) + ')', ctx); }
function unitAddr(r) { return vm.runInContext('_p0UnitAddress(' + JSON.stringify(r) + ')', ctx); }
function muData(r, i) { return vm.runInContext('_p0MuData(' + JSON.stringify(r) + ',' + i + ')', ctx); }

ok('una unidad con descripcion -> su nombre',
  label({ TaBookings2021_PMSmultiunitID: '18495', TaMultiunits_descripcion: 'Villa 5 A', TaMultiunits_Keybox: '1234' }) === 'Villa 5 A');
ok('dos unidades -> nombres separados por punto medio',
  label({ TaBookings2021_PMSmultiunitID: '18495', TaMultiunits_descripcion: 'Villa 5 A',
          TaBookings2021_PMSmultiunitID2: '18496', TaMultiunits_2_descripcion: 'Villa 5 B' }) === 'Villa 5 A · Villa 5 B');
ok('sin unidades -> vacio (villas normales no cambian)',
  label({ TaVillas_Address: 'Carrer de Mestral, 2' }) === '');
ok('unidad sin descripcion -> vacio, nunca el id numerico',
  label({ TaBookings2021_PMSmultiunitID: '18495' }) === '');
ok('descripcion en blanco cuenta como sin descripcion',
  label({ TaBookings2021_PMSmultiunitID: '18495', TaMultiunits_descripcion: '   ' }) === '');
ok('alias mu0_ tambien sirve',
  label({ PMSmultiunitID: '18495', mu0_descripcion: 'Villa 5 A' }) === 'Villa 5 A');

/* 4bis. v102: direccion propia de la unidad */
var VILLA_ADDR = 'Carrer de Mestral, 2', VILLA_MAPS = 'https://maps.example.test/villa';

ok('_p0MuData devuelve address y maps de la unidad (prefijo TaMultiunits_)',
  (function () { var d = muData({ TaMultiunits_Address: 'Carrer de Mestral, 5', TaMultiunits_Googlemaps_link: 'https://maps.example.test/u5' }, 0);
    return d.address === 'Carrer de Mestral, 5' && d.maps === 'https://maps.example.test/u5'; })());
ok('_p0MuData sin los campos nuevos -> cadenas vacias (Caspio todavia sin columnas)',
  (function () { var d = muData({ TaMultiunits_Keybox: '1234' }, 0); return d.address === '' && d.maps === ''; })());

ok('unidad con direccion (TaMultiunits_Address) -> se usa la de la unidad',
  (function () { var u = unitAddr({ TaBookings2021_PMSmultiunitID: '18495', TaMultiunits_Address: 'Carrer de Mestral, 5',
      TaMultiunits_Googlemaps_link: 'https://maps.example.test/u5', TaVillas_Address: VILLA_ADDR });
    return u.address === 'Carrer de Mestral, 5' && u.maps === 'https://maps.example.test/u5'; })());

ok('el alias mu0_Address tambien sirve (lo rellena el Worker)',
  (function () { var u = unitAddr({ PMSmultiunitID: '18495', mu0_Address: 'Carrer de Mestral, 5',
      mu0_Googlemaps_link: 'https://maps.example.test/u5' });
    return u.address === 'Carrer de Mestral, 5' && u.maps === 'https://maps.example.test/u5'; })());

ok('unidad sin direccion -> vacio (el huesped ve la direccion de la villa)',
  (function () { var u = unitAddr({ TaBookings2021_PMSmultiunitID: '18495', TaMultiunits_descripcion: 'Villa 5 A',
      TaVillas_Address: VILLA_ADDR }); return u.address === '' && u.maps === ''; })());

ok('direccion en blanco cuenta como sin direccion',
  unitAddr({ TaBookings2021_PMSmultiunitID: '18495', TaMultiunits_Address: '   ' }).address === '');

ok('sin unidades -> vacio (villas normales no cambian)',
  unitAddr({ TaVillas_Address: VILLA_ADDR }).address === '');

ok('unidad con direccion y sin enlace -> maps vacio, y la pagina deja el de la villa',
  (function () { var u = unitAddr({ TaBookings2021_PMSmultiunitID: '18495', TaMultiunits_Address: 'Carrer de Mestral, 5',
      TaVillas_Address: VILLA_ADDR, TaVillas_Googlemaps_link: VILLA_MAPS });
    return u.address === 'Carrer de Mestral, 5' && u.maps === ''; })());

ok('manda la primera unidad con direccion rellena',
  (function () { var u = unitAddr({ TaBookings2021_PMSmultiunitID: '18495', TaBookings2021_PMSmultiunitID2: '18496',
      TaMultiunits_2_Address: 'Carrer de Mestral, 6', TaMultiunits_2_Googlemaps_link: 'https://maps.example.test/u6' });
    return u.address === 'Carrer de Mestral, 6' && u.maps === 'https://maps.example.test/u6'; })());

ok('P0render aplica la direccion de la unidad una sola vez, antes de las dos ramas',
  (s.match(/var ua=_p0UnitAddress\(r\);/g) || []).length === 1 &&
  /if\(ua\.address\)\{ address=ua\.address; maps=ua\.maps\|\|maps; \}/.test(s));

/* 5. Todos los <script> inline compilan */
var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, n = 0, compileErr = null;
try { while ((m = re.exec(s))) { n++; new vm.Script(m[1], { filename: FILE + '#script' + n }); } } catch (e) { compileErr = String(e); }
ok('los ' + n + ' scripts inline compilan', !compileErr, compileErr);

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
