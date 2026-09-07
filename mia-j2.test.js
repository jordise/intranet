/* Pruebas del viaje 2 de Mia: un fallo de lectura nunca se calla como si no
   hubiera resultados, y siempre lleva un botón Reintentar.
   node mia-j2.test.js

   Como mia-j1.test.js: NO copia el código. Extrae el texto real de las
   funciones de mia-intranet.js y lo ejecuta con un DOM de mentira. Si alguien
   edita el módulo, esta prueba corre el código NUEVO.
   No hay ningún dato de huésped, caja de llaves ni contraseña en este fichero:
   proxyGet está sustituido por una función de mentira que no toca la red. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

var FILE = 'mia-intranet.js';
var S = fs.readFileSync(FILE, 'utf8');

/* Extractores: emparejan llaves, igual que mia-j1.test.js */
function braces(from) {
  var j = S.indexOf('{', from), depth = 0, k = j;
  for (; k < S.length; k++) { if (S[k] === '{') depth++; else if (S[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return S.slice(j, k);
}
function block(i) { return S.slice(i, S.indexOf('{', i)) + braces(i); }
function fnSource(name) {
  var i = S.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro function ' + name);
  return block(i);
}
function constSource(name) {
  var re = new RegExp('^const ' + name + '\\s*=', 'm'), m = re.exec(S);
  if (!m) throw new Error('no encuentro const ' + name);
  var i = m.index, eq = S.indexOf('=', i), rest = S.slice(eq + 1);
  if (/^\s*\{/.test(rest)) return S.slice(i, eq + 1) + braces(eq) + ';';
  return S.slice(i, S.indexOf('\n', i));
}

/* Un DOM de mentira: solo lo que estas funciones tocan. Cada nodo lleva su
   propia lista de hijos, para poder buscar dentro sin pintar nada de verdad. */
function fakeDoc() {
  function fakeEl(tag) {
    return {
      tag: tag, className: '', textContent: '', children: [], attrs: {}, listeners: {},
      appendChild: function (c) { this.children.push(c); return c; },
      setAttribute: function (k, v) { this.attrs[k] = v; },
      addEventListener: function (ev, fn) { this.listeners[ev] = fn; },
      click: function () { if (this.listeners.click) this.listeners.click(); }
    };
  }
  return { createElement: fakeEl, createTextNode: function (t) { return { text: t }; } };
}
/* Busca dentro del árbol de nodos falsos un botón cuyo texto sea T.retry. */
function findRetryButton(node) {
  if (!node) return null;
  if (node.tag === 'button' && node.textContent === global.__T.retry) return node;
  var kids = node.children || [];
  for (var i = 0; i < kids.length; i++) {
    var f = findRetryButton(kids[i]);
    if (f) return f;
  }
  return null;
}
/* Busca dentro del árbol un nodo cuyo textContent sea exactamente txt. */
function findText(node, txt) {
  if (!node) return null;
  if (node.textContent === txt) return node;
  var kids = node.children || [];
  for (var i = 0; i < kids.length; i++) {
    var f = findText(kids[i], txt);
    if (f) return f;
  }
  return null;
}

var CODE = 'HM3ABCDEF'; // código inventado, formato Airbnb

/* proxyGet de mentira: cada prueba decide si falla o qué filas devuelve. */
function env(proxyBehavior) {
  var doc = fakeDoc();
  var saidNode = null;
  var calls = { doBookingsCard: 0 };
  var ctx = {
    console: console,
    document: doc,
    location: { pathname: '/intranet/entradas-equipo.html' },
    Symbol: Symbol
  };
  var code = [
    constSource('EMPTY'), constSource('PAGES'), constSource('F'), constSource('VIEW_BOOKINGS'),
    constSource('MAX_ROWS'), constSource('T'), constSource('FEAT'), constSource('CHIP_LABELS'),
    fnSource('own'), fnSource('isDate'), fnSource('fmtDate'), fnSource('fmtShort'),
    fnSource('sq'), fnSource('sqLike'), fnSource('phClean'),
    fnSource('E'), fnSource('note'), fnSource('link'),
    fnSource('chipText'), fnSource('chipsBlock'), fnSource('noApplyBlock'), fnSource('btn'),
    fnSource('bookingsWhere'),
    /* Sustitutos: el manager y el usuario no son parte de este viaje. */
    'function nameToId(){ return ""; }',
    'function findUser(){ return {id:"",many:false}; }',
    'function userName(){ return ""; }',
    fnSource('bookingsPlan'),
    /* proxyGet y fetchBookings: proxyGet es la llamada de mentira de la prueba. */
    'var __proxyCalls=0;',
    'async function proxyGet(qs){ __proxyCalls++; return await __PROXY_BEHAVIOR(qs); }',
    'async ' + fnSource('fetchBookings'),
    /* say: en vez de pintar, guarda el nodo para que la prueba lo examine. */
    'function say(node){ __SAID=node; }',
    /* J3 comparte el enlace del plan desde la tarjeta: aquí solo hace falta que exista. */
    'var ST={q:"",shareHref:"",shareChips:[]}; function chipTexts(){ return []; }',
    fnSource('retryBlock'), fnSource('readFailNote'),
    'async ' + fnSource('doBookingsCard'),
    'this.doBookingsCard=doBookingsCard; this.FEAT=FEAT; this.T=T;',
    'this.getSaid=function(){ return __SAID; };',
    'this.proxyCalls=function(){ return __proxyCalls; };'
  ].join('\n');
  ctx.__PROXY_BEHAVIOR = proxyBehavior;
  vm.createContext(ctx);
  vm.runInContext(code, ctx);
  return ctx;
}

/* ─────────── Fallo de lectura: nunca se calla como "sin resultados" ─────────── */
console.log('doBookingsCard: la reserva falla al leerse');
(function () {
  var throwing = function () { throw new Error('red'); };
  var c = env(function () { throw new Error('red'); });
  global.__T = c.T;
  c.doBookingsCard({ code: CODE }).then(function () {
    var said = c.getSaid();
    ok('con FEAT.retry=1 la respuesta lleva el texto de fallo de lectura', !!findText(said, c.T.readFail), JSON.stringify(said && said.children));
    var btn = findRetryButton(said);
    ok('con FEAT.retry=1 la respuesta lleva un botón Reintentar', !!btn);
    ok('el fallo NUNCA dice "no encuentro esa reserva"', !findText(said, c.T.noBooking));

    /* Tocar el botón vuelve a llamar al mismo renderizador (misma reserva). */
    var before = c.proxyCalls();
    return btn.click.call(btn) || Promise.resolve();
  }).then(function () {
    /* click() dispara doBookingsCard(b,extraNo) de nuevo, que es async: se
       deja un turno de microtareas para que proxyGet vuelva a ejecutarse. */
    return new Promise(function (res) { setTimeout(res, 0); });
  }).then(function () {
    ok('el botón Reintentar vuelve a llamar al mismo renderizador (proxyGet se ha llamado más de una vez)', c.proxyCalls() >= 2, 'llamadas=' + c.proxyCalls());
    runOff();
  }).catch(function (e) { fail++; console.log('  FAIL  (excepción) -> ' + e.stack); runOff(); });
})();

function runOff() {
  console.log('\ndoBookingsCard: FEAT.retry=0 deja el comportamiento de siempre');
  (function () {
    var c = env(function () { throw new Error('red'); });
    global.__T = c.T;
    c.FEAT.retry = 0;
    c.doBookingsCard({ code: CODE }).then(function () {
      var said = c.getSaid();
      ok('apagado: no hay botón Reintentar', !findRetryButton(said));
      ok('apagado: se queda el texto de siempre ("No he podido leer la reserva.")', !!findText(said, 'No he podido leer la reserva.'));
      ok('apagado: no aparece el texto nuevo de J2', !findText(said, c.T.readFail));
      runEmpty();
    }).catch(function (e) { fail++; console.log('  FAIL  (excepción) -> ' + e.stack); runEmpty(); });
  })();
}

function runEmpty() {
  console.log('\ndoBookingsCard: sin resultados de verdad (no es un fallo)');
  (function () {
    var c = env(function () { return []; }); // proxyGet responde bien, cero filas
    global.__T = c.T;
    c.doBookingsCard({ code: CODE }).then(function () {
      var said = c.getSaid();
      ok('cero filas dice T.noBooking', !!findText(said, c.T.noBooking));
      ok('cero filas NO lleva botón Reintentar (no es un fallo de lectura)', !findRetryButton(said));
      ok('cero filas NO dice el texto de fallo de lectura', !findText(said, c.T.readFail));
      finish();
    }).catch(function (e) { fail++; console.log('  FAIL  (excepción) -> ' + e.stack); finish(); });
  })();
}

function finish() {
  console.log('\n' + pass + ' pass, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
}
