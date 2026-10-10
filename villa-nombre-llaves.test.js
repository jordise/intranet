/* Prueba del nombre de la villa en la pestaña Llaves de checkin-pasos.html (v110).
   Cristian, Feel Good 09/10/2026: los huéspedes del Apartamento Alcor leían el 210 de la dirección
   como número de apartamento; la página no mostraba el nombre del alojamiento.
   node villa-nombre-llaves.test.js

   Como lugar-villa.test.js: NO copia el código de la página. Comprueba el marcado y las dos
   líneas de relleno del div p0KiVilla. Nunca imprime datos de huéspedes. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var f = 'checkin-pasos.html', s = fs.readFileSync(f, 'utf8');

console.log(f);
ok('v110 en PAGE_VERSION, cabecera y titulo', /var PAGE_VERSION = 110;/.test(s) && /VERSIÓN ACTUAL: v110 \|/.test(s) && /<title>Check-in Pasos v110/.test(s));
ok('historial v110 delante de v108', /<!-- HISTORIAL: v110 - .*? \| v108 - /.test(s));
ok('div p0KiVilla dentro de la fila "How to arrive?"', /data-i18n-p0="arrive_lbl">How to arrive\?<\/span>\s*<div class="villa-name" id="p0KiVilla" style="display:none/.test(s));
ok('el div queda oculto hasta tener nombre', /id="p0KiVilla" style="display:none;/.test(s));
/* v110: el color del nombre es el oscuro de la paleta (gray-5), nunca gray-1 (#f9fafb, casi blanco; Cristian 10/10/2026 no lo veia) */
var kvStyle = (s.match(/id="p0KiVilla" style="([^"]*)"/) || [])[1] || '';
ok('el nombre se pinta en gray-5 (oscuro), no en gray-1 (casi blanco)', /color:var\(--gray-5[,)]/.test(kvStyle) && kvStyle.indexOf('--gray-1') < 0, kvStyle);
ok('gray-5 es el color oscuro de la paleta de esta pagina', /--gray-5:#212529;/.test(s) && /--gray-1:#f9fafb;/.test(s));
var fills = s.match(/var _kv=\$\('p0KiVilla'\); if\(_kv\)\{ var _vn=g\('TaVillas_Name_villa_para_inquilinos'\)\|\|''; if\(_vn\)\{ _kv\.textContent=_vn; _kv\.style\.display='block'; \} \}/g) || [];
ok('relleno del nombre en los dos estados de la pestaña (llaves visibles y cuenta atras)', fills.length === 2, fills.length);
ok('el relleno usa textContent (sin HTML del dato)', fills.every(function (x) { return x.indexOf('innerHTML') < 0; }));
ok('los scripts inline compilan', (function () {
  var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, n = 0;
  try { while ((m = re.exec(s))) { n++; new vm.Script(m[1], { filename: f + '#script' + n }); } return n > 0; } catch (e) { return e.message; }
})() === true);
/* La linea de relleno funciona con el campo lleno y vacio */
(function () {
  var line = fills[0];
  function run(val) {
    var el = { textContent: '', style: { display: 'none' } };
    var ctx = { $: function () { return el; }, g: function () { return val; } };
    vm.runInNewContext(line, ctx);
    return el;
  }
  var a = run('APARTAMENTO ALCOR 113'), b = run('');
  ok('con nombre: texto y display block', a.textContent === 'APARTAMENTO ALCOR 113' && a.style.display === 'block');
  ok('sin nombre: queda oculto', b.textContent === '' && b.style.display === 'none');
})();

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
