/* Pruebas del viaje 1 de Mia: usar la reserva que ya está abierta en la página
   cuando la pregunta no nombra ninguna.
   node mia-j1.test.js

   Como yacan-texto.test.js y marcas-manuales.test.js: NO copia el código. Extrae el
   texto real de las funciones de mia-intranet.js y lo ejecuta con un DOM de mentira.
   Si alguien edita el módulo, estas pruebas corren el código NUEVO.
   Todos los códigos de reserva de este fichero son inventados. Aquí no se lee ni se
   imprime ningún dato de un huésped, ninguna caja de llaves y ninguna contraseña. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

var FILE = 'mia-intranet.js';
var S = fs.readFileSync(FILE, 'utf8');

/* Extractores: emparejan llaves, igual que fnSource() de yacan-texto.test.js */
function braces(from) {   /* el { ... } que empieza después de from */
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
/* const NAME = {...};  o  const NAME = ...;  (una línea) */
function constSource(name) {
  var re = new RegExp('^const ' + name + '\\s*=', 'm'), m = re.exec(S);
  if (!m) throw new Error('no encuentro const ' + name);
  var i = m.index, eq = S.indexOf('=', i), rest = S.slice(eq + 1);
  if (/^\s*\{/.test(rest)) return S.slice(i, eq + 1) + braces(eq) + ';';
  return S.slice(i, S.indexOf('\n', i));
}

var CODE = 'HM3ABCDEF';        // código inventado, formato Airbnb
var CODE2 = '56120018';        // código inventado, formato Hostaway (ocho cifras)

/* Un DOM de mentira: solo lo que el módulo toca. */
function env(o) {
  o = o || {};
  var byId = o.byId || {};
  var resIds = o.resIds || [];
  var ctx = {
    URLSearchParams: URLSearchParams,
    Symbol: Symbol,
    console: console,
    location: { pathname: '/intranet/' + (o.page || 'index.html'), search: o.search || '' },
    window: { mData: o.mData },
    document: {
      getElementById: function (id) { return byId[id] || null; },
      querySelectorAll: function (sel) {
        if (sel !== '.res-id') return [];
        return resIds.map(function (t) { return { textContent: t }; });
      }
    }
  };
  var code = [
    constSource('FEAT'), constSource('PAGES'), constSource('EMPTY'),
    fnSource('curPage'), fnSource('own'), fnSource('isDate'), fnSource('addDays'),
    fnSource('fmtDate'), fnSource('fmtShort'),
    constSource('T'), constSource('CHIP_LABELS'), fnSource('chipText'), fnSource('dropFilter'),
    constSource('CTX_COBROS'), constSource('CTX_WA'), constSource('CTX_CODE_RE'),
    fnSource('ctxCode'), fnSource('ctxParam'), fnSource('pageBookingCode'),
    constSource('CTX_OWN_KEYS'), fnSource('injectPageBooking'),
    /* bookingsPlan con lo justo alrededor: aquí solo se mira el chip del código */
    'function findUser(){return{id:"",many:false};}',
    'function userName(){return "";}',
    fnSource('bookingsPlan'),
    'this.pageBookingCode=pageBookingCode;this.injectPageBooking=injectPageBooking;',
    'this.ctxCode=ctxCode;this.dropFilter=dropFilter;this.chipText=chipText;',
    'this.bookingsPlan=bookingsPlan;this.FEAT=FEAT;'
  ].join('\n');
  vm.runInNewContext(code, ctx);
  return ctx;
}

/* ─────────── El código de confirmación ─────────── */
console.log('regla del código de confirmación');
(function () {
  var c = env();
  ok('ocho cifras vale (Hostaway)', c.ctxCode('56120018') === '56120018');
  ok('letras y cifras vale (Airbnb)', c.ctxCode('HM3ABCDEF') === 'HM3ABCDEF');
  ok('quita la almohadilla de la tarjeta de Entradas', c.ctxCode('#56120018') === '56120018');
  ok('quita los espacios de alrededor', c.ctxCode('  56120018 ') === '56120018');
  ok('siete caracteres no vale', c.ctxCode('5612001') === '');
  ok('más de treinta no vale', c.ctxCode(new Array(40).join('A')) === '');
  ok('un nombre no vale', c.ctxCode('Ana Perez Lopez') === '');
  ok('una fecha no vale', c.ctxCode('2026-09-07') === '');
  ok('con guion no vale', c.ctxCode('5612-0018') === '');
  ok('vacío, nulo e indefinido no valen', c.ctxCode('') === '' && c.ctxCode(null) === '' && c.ctxCode(undefined) === '');
})();

/* ─────────── De dónde sale la reserva en cada página ─────────── */
console.log('\nla reserva abierta, página por página');
(function () {
  var p = 'notas-equipo-reservas.html';
  ok('notas: la reserva es el parámetro de la URL',
    env({ page: p, search: '?TaBookings2021_FS_confirmation_code=' + CODE }).pageBookingCode() === CODE);
  ok('notas: sin parámetro no hay reserva', env({ page: p, search: '' }).pageBookingCode() === '');
  ok('notas: un parámetro que no es un código se descarta',
    env({ page: p, search: '?TaBookings2021_FS_confirmation_code=abc' }).pageBookingCode() === '');
})();
(function () {
  var p = 'cobros-inquilinos.html';
  ok('cobros: ?code= manda',
    env({ page: p, search: '?code=' + CODE, byId: { fCode: { value: CODE2 } } }).pageBookingCode() === CODE);
  ok('cobros: sin parámetro se lee el campo de búsqueda',
    env({ page: p, byId: { fCode: { value: CODE2 } } }).pageBookingCode() === CODE2);
  ok('cobros: campo vacío, sin reserva', env({ page: p, byId: { fCode: { value: '' } } }).pageBookingCode() === '');
  ok('cobros: campo a medio escribir, sin reserva', env({ page: p, byId: { fCode: { value: 'HM3' } } }).pageBookingCode() === '');
  ok('cobros: sin campo en la página, sin reserva', env({ page: p }).pageBookingCode() === '');
})();
(function () {
  var p = 'entradas-primer-contacto-whatsapp.html';
  var open = { classList: { contains: function (c) { return c === 'open'; } } };
  var shut = { classList: { contains: function () { return false; } } };
  ok('primer contacto: con la ventana abierta, la reserva de la ventana',
    env({ page: p, byId: { waModal: open }, mData: { code: CODE } }).pageBookingCode() === CODE);
  ok('primer contacto: ventana cerrada, sin reserva (mData se queda con la última)',
    env({ page: p, byId: { waModal: shut }, mData: { code: CODE } }).pageBookingCode() === '');
  ok('primer contacto: sin ventana en la página, sin reserva',
    env({ page: p, mData: { code: CODE } }).pageBookingCode() === '');
  ok('primer contacto: ventana abierta sin datos, sin reserva',
    env({ page: p, byId: { waModal: open } }).pageBookingCode() === '');
})();
(function () {
  var p = 'entradas-equipo.html';
  ok('entradas: una sola reserva en la tabla, esa',
    env({ page: p, resIds: ['#' + CODE] }).pageBookingCode() === CODE);
  ok('entradas: la misma reserva repetida sigue siendo una',
    env({ page: p, resIds: ['#' + CODE, '#' + CODE] }).pageBookingCode() === CODE);
  ok('entradas: dos reservas distintas, ninguna',
    env({ page: p, resIds: ['#' + CODE, '#' + CODE2] }).pageBookingCode() === '');
  ok('entradas: tabla vacía, ninguna', env({ page: p, resIds: [] }).pageBookingCode() === '');
})();
ok('una página cualquiera no aporta reserva', env({ page: 'tareas.html', search: '?code=' + CODE }).pageBookingCode() === '');
(function () {
  var fn = fnSource('pageBookingCode') + fnSource('ctxCode') + fnSource('ctxParam');
  ok('la única lectura del DOM de Entradas es .res-id (la caja de llaves va al lado, en la misma tarjeta, y no se toca)',
    (fn.match(/querySelectorAll\(/g) || []).length === 1 && /querySelectorAll\('\.res-id'\)/.test(fn));
  ok('ninguna de las tres funciones toca un campo de secreto ni un dato del huésped',
    !/keybox|wifi|alarm|password|contrase|guest|phone|email|dni|pasaporte/i.test(fn));
  ok('nada se guarda ni se registra', !/localStorage|sessionStorage|console\.|fetch\(/.test(fn));
})();

/* ─────────── Cuándo se mete y cuándo no ─────────── */
console.log('\nregla de inyección');
(function () {
  var page = { page: 'notas-equipo-reservas.html', search: '?TaBookings2021_FS_confirmation_code=' + CODE };
  function withFilters(f) { var c = env(page); return { c: c, r: c.injectPageBooking(f), f: f }; }
  var a = withFilters({});
  ok('pregunta sin nada: se mete la reserva de la página', a.r === true && a.f.code === CODE && a.f.ctxOn === true);
  ['guest', 'villa', 'manager', 'source', 'cleaner'].forEach(function (k) {
    var o = {}; o[k] = 'algo';
    var x = withFilters(o);
    ok('la pregunta trae ' + k + ': no se mete nada', x.r === false && x.f.code === undefined);
  });
  ['check_in_from', 'check_in_to', 'stay_on'].forEach(function (k) {
    var o = {}; o[k] = '2026-09-14';
    var x = withFilters(o);
    ok('la pregunta trae ' + k + ': no se mete nada', x.r === false && x.f.code === undefined);
  });
  var y = withFilters({ code: CODE2 });
  ok('la pregunta trae su propio código: manda el suyo', y.r === false && y.f.code === CODE2 && y.f.ctxOn === undefined);
  var z = withFilters({ guest: '', villa: null, stay_on: undefined, tipo: 'entrada' });
  ok('campos vacíos no cuentan; el tipo tampoco identifica una reserva', z.r === true && z.f.code === CODE);
  var sinCodigo = env({ page: 'notas-equipo-reservas.html', search: '' });
  var f0 = {};
  ok('la página no tiene reserva: no se inventa nada', sinCodigo.injectPageBooking(f0) === false && f0.code === undefined);
  ok('sin objeto de filtros no revienta', a.c.injectPageBooking(null) === false && a.c.injectPageBooking(undefined) === false);
})();
(function () {
  var i = S.indexOf('/* J1: la pregunta no dice de qué reserva habla');
  var linea = S.slice(i, S.indexOf('try{', i));
  ok('en onAsk solo se inyecta en reservas y en notas', /target==='bookings'/.test(linea) && /target==='notes'/.test(linea));
  ok('en onAsk no se inyecta en tareas, disponibilidad ni villa',
    !/'tasks'|'availability'|'villa'/.test(linea));
  ok('la inyección va después de la respuesta del Worker y antes de repartirla',
    i > S.indexOf('data=await askWorker(q)') && i < S.indexOf("if(target==='bookings'){"));
  ok('al Worker no se le manda nada nuevo', /body:JSON\.stringify\(\{ q:q, page:curPage\(\), today:todayISO\(\) \}\)/.test(S));
})();

/* ─────────── El chip y su cruz ─────────── */
console.log('\nel chip "Usando esta reserva"');
(function () {
  var c = env();
  ok('el chip dice "Usando esta reserva: <código>"', c.chipText('ctx', CODE) === 'Usando esta reserva: ' + CODE);
  ok('el chip de un código escrito por el usuario no cambia', c.chipText('code', CODE) === 'Reserva: ' + CODE);
  var conCtx = c.bookingsPlan({ code: CODE, ctxOn: true });
  ok('reservas: con reserva de la página el chip es ctx y el enlace lleva el mismo código',
    conCtx.chips.ctx === CODE && conCtx.chips.code === undefined && conCtx.params.cod === CODE);
  var sinCtx = c.bookingsPlan({ code: CODE });
  ok('reservas: con código escrito, el chip de siempre', sinCtx.chips.code === CODE && sinCtx.chips.ctx === undefined);
  ok('notas usa el mismo chip', /chips\[\(n&&n\.ctxOn\)\?'ctx':'code'\]=code;/.test(S));
})();
(function () {
  var c = env({ page: 'notas-equipo-reservas.html', search: '?TaBookings2021_FS_confirmation_code=' + CODE });
  var f = {};
  c.injectPageBooking(f);
  c.dropFilter(f, 'ctx');
  ok('quitar el chip borra el código', f.code === undefined && f.ctxOn === false);
  ok('quitado el chip, al repintar NO se vuelve a meter la reserva de la página',
    c.injectPageBooking(f) === false && f.code === undefined);
  var g = { guest: 'Ana', villa: 'Delfin' };
  c.dropFilter(g, 'villa');
  ok('quitar cualquier otro chip hace lo de siempre', g.villa === undefined && g.guest === 'Ana' && g.ctxOff === undefined);
  ok('la cruz de los chips llama a dropFilter', /dropFilter\(filters,k\); onChange\(\);/.test(S));
})();

/* ─────────── El interruptor ─────────── */
console.log('\nFEAT.ctx = 0 deja la Mia de siempre');
(function () {
  var c = env({ page: 'notas-equipo-reservas.html', search: '?TaBookings2021_FS_confirmation_code=' + CODE });
  c.FEAT.ctx = 0;
  var f = {};
  ok('apagado: no se mete ninguna reserva', c.injectPageBooking(f) === false && f.code === undefined && f.ctxOn === undefined);
  ok('apagado: en onAsk el bloque entero se salta', /if\(FEAT\.ctx&&target==='bookings'\)/.test(S) && /else if\(FEAT\.ctx&&target==='notes'\)/.test(S));
  c.FEAT.ctx = 1;
  ok('encendido otra vez: vuelve a meterla', c.injectPageBooking({}) === true);
})();

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
