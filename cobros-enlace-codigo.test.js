/* Prueba del ramal ?code= de cobros-inquilinos.html (v37, aviso de Toni Segui
   07/10/2026): con un codigo en la URL, el estado de la reserva pasa a 'Todos' y las
   fechas de check-in quedan vacias, para que una reserva cancelada o de otro ano abra.
   node cobros-enlace-codigo.test.js   (sin red) */
var fs = require('fs');
var P = 'cobros-inquilinos.html';
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var SRC = fs.readFileSync(P, 'utf8');

var i = SRC.indexOf("} else if(_urlCode){");
ok('ramal ?code= existe', i > 0);
var j = SRC.indexOf('} else {', i);
var ramal = SRC.slice(i, j);

ok("estado de la reserva a 'Todos'", /\$\('fStatus'\);\s*if\(fSt\)\s*fSt\.value\s*=\s*''/.test(ramal));
ok('check-in desde vacio', /\$\('fCheckinFrom'\);\s*if\(fCiF\)\s*fCiF\.value\s*=\s*''/.test(ramal));
ok('check-in hasta vacio', /\$\('fCheckinTo'\);\s*if\(fCiT\)\s*fCiT\.value\s*=\s*''/.test(ramal));
ok('sigue vaciando las fechas de cobro', ramal.indexOf("fDateFrom.value = ''") >= 0 && ramal.indexOf("fDateTo.value   = ''") >= 0);
ok('sigue quitando la pastilla de cobros', ramal.indexOf("_cobrosFilter = ''") >= 0);
ok("por defecto la pagina sigue en 'No canceladas'", /<option value="no-cancelled" selected>/.test(SRC));
ok('version v37 en las dos marcas', SRC.indexOf('VERSIÓN ACTUAL: v37') >= 0 && SRC.indexOf('Control Cobros Inquilinos v37') >= 0);
ok('HISTORIAL v37 delante', SRC.indexOf('<!-- HISTORIAL: v37 -') >= 0);

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
