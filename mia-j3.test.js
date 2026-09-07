/* Pruebas del viaje 3 de Mia: "Avisar de un fallo" (mia-intranet.js).
   node mia-j3.test.js

   Como yacan-texto.test.js: NO copia el codigo del modulo. Saca el texto real de
   cada funcion y lo ejecuta. Si alguien edita mia-intranet.js, estas pruebas
   corren el codigo NUEVO.

   Lo que se comprueba:
     1. El texto del aviso sale de CUATRO cosas y de ninguna mas: la pagina, la
        pregunta escrita, los chips de la respuesta y el enlace de filtros.
     2. El enlace de WhatsApp no lleva ningun numero de telefono y lleva el
        texto codificado.
     3. Una respuesta cuyo boton principal sale de una fila leida comparte el
        enlace del plan, no el de la fila (el de la fila lleva el nombre del
        inquilino en inq=).
   No imprime ningun dato real: los nombres de estas pruebas son inventados. */
var fs = require('fs'), vm = require('vm');
var FILE = 'mia-intranet.js';
var pass = 0, fail = 0;
function ok(n, c, e) { if (c === true) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var S = fs.readFileSync(FILE, 'utf8');
/* Texto de una funcion, contando llaves */
function fn(name) {
  var i = S.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = S.indexOf('{', i), depth = 0, k = j;
  for (; k < S.length; k++) { if (S[k] === '{') depth++; else if (S[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return S.slice(i, k);
}
/* Texto de un const que abre llave */
function obj(name) {
  var i = S.indexOf('const ' + name + ' =');
  if (i < 0) i = S.indexOf('const ' + name + '=');
  if (i < 0) throw new Error('no encuentro const ' + name);
  var j = S.indexOf('{', i), depth = 0, k = j;
  for (; k < S.length; k++) { if (S[k] === '{') depth++; else if (S[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return S.slice(i, k) + ';';
}
function grab(re) { var m = S.match(re); if (!m) throw new Error('no encuentro ' + re); return m[0]; }

/* ── Contexto con el codigo real del modulo ── */
var code = [
  obj('T'), obj('PAGES'), obj('CHIP_LABELS'), obj('F'),
  grab(/const EMPTY=[^\n]+/),
  fn('own'), fn('link'), fn('curPage'), fn('isDate'), fn('addDays'), fn('dOnly'),
  fn('fmtDate'), fn('fmtShort'), fn('chipText'), fn('chipTexts'), fn('g'),
  fn('entradasParamsFor'), fn('bookingsPlan'), fn('reportText'), fn('waHref')
].join('\n');
var ctx = { location: { pathname: '/entradas-equipo.html' }, ST: { q: '', shareHref: '', shareChips: [] } };
vm.runInNewContext(code + '\nthis.reportText=reportText;this.waHref=waHref;this.link=link;this.bookingsPlan=bookingsPlan;this.entradasParamsFor=entradasParamsFor;this.chipTexts=chipTexts;this.T=T;', ctx);

console.log('1. El texto sale de las cuatro entradas y de ninguna mas');
(function () {
  ctx.location.pathname = '/tareas.html';
  ctx.ST.q = 'tareas pendientes de la villa Delfin';
  ctx.ST.shareChips = ctx.chipTexts({ villa: 'Delfin', status: 'pendiente' });
  ctx.ST.shareHref = 'tareas.html?vid=123&vi=Delfin&est=1&u=';
  var txt = ctx.reportText();
  var esperado = [
    'Posible fallo de Mia',
    'Página: tareas.html',
    'Pregunta: tareas pendientes de la villa Delfin',
    'Filtros: Villa: Delfin, Estado: pendiente',
    'Enlace: tareas.html?vid=123&vi=Delfin&est=1&u=',
    'Esperaba:',
    'Salió:'
  ].join('\n');
  ok('la plantilla es exactamente la acordada', txt === esperado, JSON.stringify(txt));
  ok('siete lineas, ni una mas', txt.split('\n').length === 7);

  ctx.ST.shareChips = []; ctx.ST.shareHref = '';
  var vacio = ctx.reportText();
  ok('sin chips pone "ninguno"', /^Filtros: ninguno$/m.test(vacio));
  ok('sin enlace pone "-"', /^Enlace: -$/m.test(vacio));

  /* La pagina y la pregunta son las de verdad, no una copia guardada */
  ctx.location.pathname = '/some/path/villa.html';
  ctx.ST.q = 'villa Santa Helena';
  ok('la pagina es el ultimo trozo de la ruta', /^Página: villa\.html$/m.test(ctx.reportText()));
  ok('la pregunta es la que se escribio', /^Pregunta: villa Santa Helena$/m.test(ctx.reportText()));

  /* Nada mas puede entrar: el cuerpo de reportText solo mira esas cuatro cosas */
  var body = fn('reportText');
  ok('reportText solo lee ST.q, ST.shareChips, ST.shareHref y curPage()',
    /ST\.q/.test(body) && /ST\.shareChips/.test(body) && /ST\.shareHref/.test(body) && /curPage\(\)/.test(body));
  var prohibido = /rows|entradasParamsFor|guestName|proxyGet|Auth|fetch|localStorage|sessionStorage|\bF\.|USERS|keybox|wifi|alarma/i;
  ok('reportText no toca filas leidas, sesion ni campos sensibles', !prohibido.test(body), body);
  ok('ST.q es lo unico del estado ademas de los dos share*',
    (body.match(/ST\.[a-zA-Z]+/g) || []).every(function (r) { return ['ST.q', 'ST.shareChips', 'ST.shareHref'].indexOf(r) >= 0; }));
})();

console.log('\n2. WhatsApp: sin numero y con el texto codificado');
(function () {
  var txt = 'Posible fallo de Mia\nPágina: tareas.html\nEnlace: tareas.html?vid=123&u=';
  var href = ctx.waHref(txt);
  ok('empieza por wa.me sin numero', href.indexOf('https://wa.me/?text=') === 0, href.slice(0, 40));
  var host = href.slice(0, href.indexOf('?'));
  ok('no hay ni una cifra antes del texto', !/\d/.test(host), host);
  ok('el texto viaja codificado y vuelve igual', decodeURIComponent(href.slice('https://wa.me/?text='.length)) === txt);
  ok('los saltos de linea van como %0A', href.indexOf('%0A') > 0);
  ok('los & del enlace no parten la url', href.indexOf('&') < 0);
  ok('waHref no inventa ningun destinatario', !/wa\.me\/\d/.test(href) && !/phone=/.test(href));
  ok('el fichero no guarda ningun numero de telefono para WhatsApp', !/wa\.me\/\d/.test(S));
})();

console.log('\n3. Con lista de filas se comparte el enlace del plan, no el de la fila');
(function () {
  /* Fila inventada: nombre que NUNCA debe salir en el aviso */
  var fila = {};
  fila[ctx.T ? 'x' : 'x'] = 1;
  var F = vm.runInNewContext(obj('F') + ';F', {});
  fila[F.guestName] = 'Nombre Inventado De Prueba';
  fila[F.checkIn] = '2026-09-10';
  fila[F.checkOut] = '2026-09-17';
  var enlaceFila = ctx.link('entradas', ctx.entradasParamsFor(fila));
  var enlacePlan = ctx.link('entradas', ctx.bookingsPlan({ guest: 'nombre' }).params);
  ok('el enlace de la fila lleva el nombre completo del inquilino', enlaceFila.indexOf('inq=Nombre') > 0, enlaceFila);
  ok('el enlace del plan es otro', enlacePlan !== enlaceFila, enlacePlan);

  ctx.location.pathname = '/entradas-equipo.html';
  ctx.ST.q = 'reservas de nombre';
  ctx.ST.shareChips = ctx.chipTexts(ctx.bookingsPlan({ guest: 'nombre' }).chips);
  ctx.ST.shareHref = enlacePlan;
  var txt = ctx.reportText();
  ok('el aviso lleva el enlace del plan', txt.indexOf('Enlace: ' + enlacePlan) > 0);
  ok('el aviso no lleva el nombre de la fila', txt.indexOf('Nombre Inventado De Prueba') < 0, txt);

  /* Y el codigo lo pone asi: del plan, nunca de entradasParamsFor */
  var card = fn('doBookingsCard'), stay = fn('doBookingsStay'), notas = fn('doNotes');
  ok('doBookingsCard comparte link(entradas, plan.params)', /ST\.shareHref=link\('entradas',plan\.params\)/.test(card));
  ok('doBookingsStay comparte link(entradas, plan.params)', /ST\.shareHref=link\('entradas',plan\.params\)/.test(stay));
  ok('ninguna respuesta comparte el enlace de una fila',
    !/ST\.shareHref\s*=\s*[^;\n]*entradasParamsFor/.test(card + stay + notas + fn('doBookingsLink') + fn('doTasks') + fn('doVilla')));
  ok('doNotes comparte el enlace de notas o el del plan',
    /ST\.shareHref=code\?link\('notas'/.test(notas) && /link\('entradas',bookingsPlan\(\{guest:guest\}\)\.params\)/.test(notas));
})();

console.log('\n4. Los siete tipos de respuesta dejan puesto el enlace');
(function () {
  ['doBookingsLink', 'doBookingsCard', 'doBookingsStay', 'doNotes', 'doTasks', 'doVilla', 'doAvailability'].forEach(function (n) {
    ok(n + ' pone ST.shareHref', /ST\.shareHref\s*=/.test(fn(n)));
  });
  ok('onAsk limpia el enlace y los chips en cada pregunta', /ST\.shareHref='';\s*ST\.shareChips=\[\];/.test(fn('onAsk')));
})();

console.log('\n5. Interruptor, Escape y "no se envia nada"');
(function () {
  ok('say() solo pinta el aviso con FEAT.report', /if\(FEAT\.report\)BODY\.appendChild\(reportBlock\(\)\);/.test(fn('say')));
  ok('el primer Escape cierra solo el aviso', /if\(FEAT\.report&&closeReport\(\)\)return;/.test(fn('bindEsc')));
  ok('FEAT.report existe y esta a 1', /report:1/.test(S));
  var caja = fn('reportBox') + fn('reportBlock');
  ok('WhatsApp es un enlace de verdad, no window.open', !/window\.open/.test(caja) && /setAttribute\('target','_blank'\)/.test(caja) && /rel','noopener'/.test(caja));
  ok('el href se recalcula con cada tecla', /addEventListener\('input',function\(\)\{ wa\.setAttribute\('href',waHref\(ta\.value\)\); \}\)/.test(caja));
  ok('Copiar usa el portapapeles y tiene plan B', /navigator\.clipboard\.writeText\(txt\)/.test(caja) && /document\.execCommand\('copy'\)/.test(caja));
  ok('la etiqueta vuelve a Copiar a los 2 s', /setTimeout\(function\(\)\{ cp\.textContent=T\.rptCopy; \},2000\)/.test(caja));
  ok('el cuadro es de telefono: seis lineas y ancho completo', /ta\.rows=6/.test(caja) && /\.mia-rta\{width:100%/.test(S) && /\.mia-rta\{[^}]*font-size:16px/.test(S));
  ok('el aviso no manda ni guarda nada', !/fetch\(|XMLHttpRequest|navigator\.sendBeacon|localStorage|sessionStorage/.test(caja));
  ok('el aviso no escribe en el DOM sin escapar', !/innerHTML/.test(caja));
})();

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
