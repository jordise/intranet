/* Pruebas del boton "📋 Informe de temporada" de la ficha de villa (v28, Jordi 27/10/2026: los villa managers
   rellenan el informe de fin de temporada de cada casa en la app; ejemplo en papel de Rafa).
   node villa-informe-boton.test.js

   Como villa-propietario.test.js: NO copia el codigo de la pagina. Extrae con vm las funciones reales de
   villa.html (esc, escQ, puedeVerPropietario, esVillaManager, informeBotonHtml) y comprueba la barra de
   botones en loadVilla. Sin red. */
var fs = require('fs'), vm = require('vm');
var P = 'villa.html';
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var SRC = fs.readFileSync(P, 'utf8');
function fnSource(s, name) {
  var i = s.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = s.indexOf('{', i), depth = 0, k = j;
  for (; k < s.length; k++) { if (s[k] === '{') depth++; else if (s[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return s.slice(i, k);
}
var ctx = {};
try {
  vm.runInNewContext(['esc', 'escQ', 'puedeVerPropietario', 'esVillaManager', 'informeBotonHtml']
    .map(function (n) { return fnSource(SRC, n); }).join('\n'), ctx);
} catch (e) { ok('informeBotonHtml existe en la pagina', false, e.message); console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(1); }

var BTN = '<a class="h-btn" href="informe-temporada.html?villaid=123">📋 Informe de temporada</a>';
console.log('1. Quien ve el boton');
ok('admin', ctx.informeBotonHtml('123', 'admin', false) === BTN, ctx.informeBotonHtml('123', 'admin', false));
ok('manager', ctx.informeBotonHtml('123', 'manager', false) === BTN);
ok('villa manager (staff con Keyholder_por_defecto)', ctx.informeBotonHtml('123', 'staff', true) === BTN);
ok('cleaner no', ctx.informeBotonHtml('123', 'cleaner', false) === '');
ok('cleaner con keyholder no', ctx.informeBotonHtml('123', 'cleaner', true) === '');
ok('sales no', ctx.informeBotonHtml('123', 'sales', false) === '');
ok('sales con keyholder no', ctx.informeBotonHtml('123', 'sales', true) === '');
ok('staff sin keyholder no', ctx.informeBotonHtml('123', 'staff', false) === '');
ok('villaid se codifica en la URL', ctx.informeBotonHtml('1 2', 'admin', false).indexOf('villaid=1%202"') > 0);

console.log('2. Con esVillaManager y las filas de TaUsers');
var uRows = [{ UserID: 'U1', Email: 'vm@3villas.com', Keyholder_por_defecto: 'U1' }, { UserID: 'U2', Email: 'st@3villas.com', Keyholder_por_defecto: '' }];
ok('staff con su fila keyholder: boton', ctx.informeBotonHtml('9', 'staff', ctx.esVillaManager(uRows, 'VM@3villas.com')) !== '');
ok('staff sin keyholder: nada', ctx.informeBotonHtml('9', 'staff', ctx.esVillaManager(uRows, 'st@3villas.com')) === '');

console.log('3. En la barra de botones de loadVilla');
var lv = fnSource(SRC, 'loadVilla');
var iBtn = lv.indexOf('linksHtml+=informeBotonHtml(villaid,Auth.role(),esVillaManager(uRows,Auth.email()));');
var iEdit = lv.indexOf('✏️ Editar Villa');
var iUrows = lv.indexOf('const uRows=');
ok('loadVilla añade informeBotonHtml(villaid,Auth.role(),esVillaManager(uRows,Auth.email()))', iBtn > 0);
ok('antes de ✏️ Editar Villa', iBtn > 0 && iEdit > iBtn);
ok('despues de leer uRows', iUrows > 0 && iBtn > iUrows);
ok('una sola vez', lv.split('informeBotonHtml(').length === 2);
ok('sin llamadas nuevas: una TaUsers', (SRC.match(/table=TaUsers/g) || []).length === 1);

console.log('4. Version');
ok('v28 en PAGE_VERSION', /const PAGE_VERSION = 28;/.test(SRC));
ok('v28 en la cabecera', /VERSIÓN ACTUAL: v28 \|/.test(SRC.split('\n').slice(0, 5).join('\n')));
var hist = SRC.slice(SRC.indexOf('<!-- HISTORIAL: v28 - '));
ok('HISTORIAL v28 con Jordi, fecha y prueba, y v27 detras', SRC.indexOf('<!-- HISTORIAL: v28 - ') > 0 && hist.indexOf('Jordi') >= 0 && hist.indexOf('27/10/2026') >= 0 && hist.indexOf('villa-informe-boton.test.js') >= 0 && hist.indexOf('| v27 - ') > 0);
ok('el comentario HISTORIAL cierra una sola vez', hist.split('-->').length === 2);

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
