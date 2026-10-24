/* Pruebas de las horas en la ficha (v156, Cristian, grupo feel good 24/10/2026 09:20:
   "en la pantalla de llegada ¿sería posible que también se viera la hora de salida de
   Menorca igual que se ve la hora de llegada?" ... 09:30 "sólo si puede añadirse en ese
   hueco"). node entradas-horas-salida.test.js

   Como entradas-borrar-todo.test.js: NO copia el codigo de la pagina. Extrae horasHtml
   de entradas-equipo.html y lo ejecuta con un g() minimo. Sin red. */
var fs = require('fs');
var P = 'entradas-equipo.html';
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

var SRC = fs.readFileSync(P, 'utf8');

function bloque(marca, abre, cierra) {
  var i = SRC.indexOf(marca);
  if (i < 0) throw new Error('no encuentro ' + marca + ' en ' + P);
  var j = SRC.indexOf(abre, i), depth = 0, k = j;
  for (; k < SRC.length; k++) {
    if (SRC[k] === abre) depth++;
    else if (SRC[k] === cierra) { depth--; if (depth === 0) { k++; break; } }
  }
  return SRC.slice(i, k);
}

var g = function (r, k) { return r[k] || ''; };
var horasHtml = new Function('g', bloque('function horasHtml(', '{', '}') + '\nreturn horasHtml;')(g);

var todo = { checkinTime: '16:00', arrivalMenorca: '10:00', checkoutTime: '09:30', departureMenorca: '12:45' };

console.log('1. Ficha de ENTRADA con horas de salida: van en el hueco de la derecha');
var h = horasHtml(todo, false, 7);
ok('usa la rejilla de dos columnas', h.indexOf('class="times-grid"') >= 0, h);
ok('muestra Hora entrada 16:00', /Hora entrada<\/span><span class="ival">16:00/.test(h));
ok('muestra Llegan a Menorca 10:00', /Llegan a Menorca<\/span><span class="ival">10:00/.test(h));
ok('muestra Sale de Menorca 12:45', /Sale de Menorca<\/span><span class="ival">12:45/.test(h));
ok('muestra Hora salida villa 09:30', /Hora salida villa<\/span><span class="ival">09:30/.test(h));
var izq = h.indexOf('Llegan a Menorca'), der = h.indexOf('Sale de Menorca');
ok('llegada a la izquierda, salida a la derecha', izq >= 0 && der > izq);
ok('el hueco del medio copia la pastilla de noches, invisible', h.indexOf('npill npill-ghost') >= 0);
ok('sin boton ni popup', !/onclick|popup|<button/i.test(h));

console.log('2. Ficha de ENTRADA sin horas de salida: queda como antes');
var h2 = horasHtml({ checkinTime: '16:00', arrivalMenorca: '10:00' }, false, 7);
ok('sin rejilla', h2.indexOf('times-grid') < 0, h2);
ok('sigue mostrando Llegan a Menorca', h2.indexOf('Llegan a Menorca') >= 0);
ok('no inventa Sale de Menorca', h2.indexOf('Sale de Menorca') < 0);

console.log('3. Solo la hora de vuelo de salida');
var h3 = horasHtml({ checkinTime: '16:00', departureMenorca: '08:00' }, false, 0);
ok('rejilla con Sale de Menorca', h3.indexOf('times-grid') >= 0 && h3.indexOf('Sale de Menorca') >= 0);
ok('sin Hora salida villa vacia', h3.indexOf('Hora salida villa') < 0);
ok('sin noches el hueco sigue (vacio) para que en el movil sean 2 columnas', h3.indexOf('npill npill-ghost"></div>') >= 0, h3);

console.log('4. Ficha de SALIDA: sin cambios');
var h4 = horasHtml(todo, true, 7);
ok('sin rejilla', h4.indexOf('times-grid') < 0);
ok('Hora salida villa 09:30', /Hora salida villa<\/span><span class="ival">09:30/.test(h4));
ok('Sale de Menorca 12:45', /Sale de Menorca<\/span><span class="ival">12:45/.test(h4));
ok('no muestra Llegan a Menorca', h4.indexOf('Llegan a Menorca') < 0);
var h5 = horasHtml({ checkinTime: '11:00', arrivalMenorca: '15:00' }, true, 7);
ok('salida sin datos de salida: mismas reservas de antes (Hora salida + Sale de Menorca)', /Hora salida<\/span><span class="ival">11:00/.test(h5) && /Sale de Menorca<\/span><span class="ival">15:00/.test(h5));

console.log('5. buildCard usa horasHtml y el CSS existe');
var card = bloque('function buildCard(', '{', '}');
ok('buildCard llama a horasHtml', card.indexOf('horasHtml(r,isSalida,n)') >= 0);
ok('buildCard ya no pinta Llegan a Menorca por su cuenta', card.indexOf('Llegan a Menorca') < 0);
ok('CSS .times-grid', /\.times-grid\{[^}]*grid-template-columns:1fr auto 1fr/.test(SRC));
ok('CSS movil .times-grid 1fr 1fr', /@media\(max-width:700px\)\{[^\n]*\.times-grid\{grid-template-columns:1fr 1fr\}/.test(SRC));
ok('CSS .npill-ghost invisible', /\.npill-ghost\{visibility:hidden\}/.test(SRC));
ok('version v156', SRC.indexOf("PAGE_VERSION='v156'") >= 0 && SRC.indexOf('VERSIÓN ACTUAL: v156') >= 0);

console.log('\n' + pass + ' pasan, ' + fail + ' fallan');
process.exit(fail ? 1 : 0);
