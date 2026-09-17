/* Pruebas del numero de la villa/unidad debajo de la direccion (checkin-pasos v101).
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
ok('version >= 101', parseInt(vTop, 10) >= 101);

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
vm.runInContext(fnSource('_p0MuIds') + '\n' + fnSource('_p0MuData') + '\n' + fnSource('_p0UnitLabel'), ctx);
function label(r) { return vm.runInContext('_p0UnitLabel(' + JSON.stringify(r) + ')', ctx); }

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

/* 5. Todos los <script> inline compilan */
var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, n = 0, compileErr = null;
try { while ((m = re.exec(s))) { n++; new vm.Script(m[1], { filename: FILE + '#script' + n }); } } catch (e) { compileErr = String(e); }
ok('los ' + n + ' scripts inline compilan', !compileErr, compileErr);

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
