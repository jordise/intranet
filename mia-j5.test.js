/* Pruebas de la tarjeta "que falta para las entradas" (viaje 5 de Mia).
   node mia-j5.test.js

   Como marcas-manuales.test.js: NO copia el codigo del modulo. Carga
   mia-intranet.js entero con un DOM minimo y le cambia solo fetchBookings por
   filas de mentira. Si alguien edita el modulo, estas pruebas corren el codigo
   NUEVO. Nada sale a la red y ninguna fila lleva datos reales. */
var fs = require('fs');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

/* ── DOM minimo: solo lo que toca Mia al pintar una respuesta ── */
function El(tag) {
  this.tagName = tag; this.children = []; this.attrs = {}; this._t = ''; this.className = '';
  var set = {};
  this.classList = {
    add: function (c) { set[c] = 1; },
    remove: function (c) { delete set[c]; },
    contains: function (c) { return !!set[c]; },
    toggle: function (c, v) { if (v) set[c] = 1; else delete set[c]; }
  };
}
El.prototype.appendChild = function (c) { this.children.push(c); return c; };
El.prototype.setAttribute = function (k, v) { this.attrs[k] = v; };
El.prototype.getAttribute = function (k) { return this.attrs[k]; };
El.prototype.addEventListener = function () {};
El.prototype.removeChild = function (c) {
  var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1);
};
Object.defineProperty(El.prototype, 'textContent', {
  get: function () {
    return this._t + this.children.map(function (c) { return c.textContent; }).join('');
  },
  set: function (v) { this.children = []; this._t = String(v); }
});
Object.defineProperty(El.prototype, 'innerHTML', {
  get: function () { return ''; },
  /* La marca de Mia entra por innerHTML y luego se coge firstChild. */
  set: function () { this.children = [new El('svg')]; }
});
Object.defineProperty(El.prototype, 'firstChild', {
  get: function () { return this.children[0] || null; }
});

function makeEnv() {
  var doc = {
    readyState: 'complete',
    body: new El('body'),
    head: new El('head'),
    documentElement: new El('html'),
    createElement: function (t) { return new El(t); },
    createTextNode: function (t) { var n = new El('#text'); n.textContent = t; return n; },
    getElementById: function () { return null; },
    querySelector: function () { return null; },
    querySelectorAll: function () { return []; },
    addEventListener: function () {},
    removeEventListener: function () {}
  };
  var store = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
  var src = fs.readFileSync('mia-intranet.js', 'utf8');
  var mark = '\n})();';
  var i = src.lastIndexOf(mark);
  if (i < 0) throw new Error('no encuentro el cierre del modulo');
  /* Unica linea anadida: saca al banco de pruebas lo justo para llamar a la
     tarjeta y para poner filas de mentira. */
  var hook = '\nglobalThis.__MIA_TEST={ready:doBookingsReady,bookings:doBookings,FEAT:FEAT,T:T,'
    + 'READY_MAX:READY_MAX,setFetch:function(fn){fetchBookings=fn;},'
    + 'setPanel:function(p,b){PANEL=p;BODY=b;}};';
  var code = src.slice(0, i) + hook + src.slice(i);
  var run = new Function('window', 'document', 'location', 'localStorage', 'sessionStorage', 'Auth', code);
  run({}, doc, { pathname: '/intranet/tareas.html' }, store, store,
      { token: function () { return 't'; }, role: function () { return 'admin'; }, url: function (u) { return u; } });
  var M = globalThis.__MIA_TEST;
  var panel = new El('div'), body = new El('div');
  M.setPanel(panel, body);
  M.body = body;
  return M;
}

/* ── Filas de mentira. Nombres y codigos inventados. ── */
var FLD = {
  villa: 'TaVillas_Name_villa_para_inquilinos', code: 'TaBookings2021_FS_confirmation_code',
  guest: 'TaBookings2021_Guest_Full_Name', ci: 'TaBookings2021_Checkin', co: 'TaBookings2021_Checkout',
  arr: 'TaBookings2021_Arrivalform_done', pol: 'TaBookings2021_Registro_policia_done',
  paso4: 'TaBookings2021_Paso4_terminado', dep: 'TaBookings2021_Security_deposit_terminado',
  /* v145: las marcas Ecotasa y Fianza/Waiver leen estos campos, no la formula ni el paso 3 */
  eco: 'TaBookings2021_Ecotasa_cobrada', opt: 'TaBookings2021_Security_deposit_options',
  waiverOk: 'TaBookings2021_Se_permite_waver', waiverCob: 'TaBookings2021_Deposit_waver_cobrado',
  lim: 'TaBookings2021_LimpiezaTerminada', wp: 'TaBookings2021_Welcomepackentregado'
};
function row(villa, guest, code, over) {
  var r = {};
  r[FLD.villa] = villa; r[FLD.guest] = guest; r[FLD.code] = code;
  r[FLD.ci] = '2026-09-08T00:00:00'; r[FLD.co] = '2026-09-15T00:00:00';
  r[FLD.arr] = 1; r[FLD.pol] = 1; r[FLD.paso4] = 1; r[FLD.dep] = 1; r[FLD.lim] = 1; r[FLD.wp] = 1;
  r[FLD.eco] = 1; r[FLD.opt] = 1; r[FLD.waiverOk] = 1; r[FLD.waiverCob] = 1; /* v145: ecotasa y waiver cobrados */
  for (var k in (over || {})) r[k] = over[k];
  return r;
}

/* ── Utilidades para leer lo pintado ── */
function all(node, cls, out) {
  out = out || [];
  (node.children || []).forEach(function (c) {
    if (String(c.className || '').split(' ').indexOf(cls) >= 0) out.push(c);
    all(c, cls, out);
  });
  return out;
}
function notes(M) { return all(M.body, 'mia-note').map(function (n) { return n.textContent; }); }
function rows(M) { return all(M.body, 'mia-rdrow'); }
function pills(r) {
  return (all(r, 'mia-st')).map(function (p) { return p.textContent; });
}
function pillClasses(r) {
  return (all(r, 'mia-st')).map(function (p) { return p.className; });
}
function hasNote(M, txt) {
  return notes(M).some(function (n) { return n.indexOf(txt) >= 0; });
}

var M = makeEnv();
var LAST = null;
function withRows(list) { M.setFetch(function () { LAST = list; return Promise.resolve(list); }); }

var BASE = { check_in_from: '2026-09-08', check_in_to: '2026-09-08' };

(async function () {
  console.log('\n== todo hecho ==');
  withRows([row('Casa Uno', 'A. Prueba', 'HA-0001')]);
  await M.ready(Object.assign({}, BASE), []);
  var r0 = rows(M)[0];
  ok('una fila', rows(M).length === 1);
  ok('seis pastillas en orden',
    pills(r0).join(' | ') === '✓ Arrival form | ✓ Policía | ✓ Ecotasa | ✓ Fianza/Waiver | ✓ Limpieza | ✓ Welcome pack',
    pills(r0).join(' | '));
  /* v145: la ecotasa y la fianza se leen de sus campos, no de la formula ni del paso 3 */
  var ovr = {}; ovr[FLD.eco] = 0; ovr[FLD.paso4] = 1;
  withRows([row('Casa Dos', 'B. Prueba', 'HA-0002', ovr)]);
  await M.ready(Object.assign({}, BASE), []);
  ok('v145: ecotasa sin cobrar sale pendiente aunque la formula diga 1',
    pills(rows(M)[0]).join(' | ').indexOf('· Ecotasa pendiente') >= 0, pills(rows(M)[0]).join(' | '));
  var ovr3 = {}; ovr3[FLD.opt] = 3; ovr3['TaBookings2021_Security_deposit_EUR'] = 500; ovr3['TaBookings2021_Security_deposit_cobrado'] = 0;
  withRows([row('Casa Tres', 'C. Prueba', 'HA-0003', ovr3)]);
  await M.ready(Object.assign({}, BASE), []);
  ok('v145: fianza por transferencia sin marcar sale pendiente aunque el paso 3 este cerrado',
    pills(rows(M)[0]).join(' | ').indexOf('· Fianza/Waiver pendiente') >= 0, pills(rows(M)[0]).join(' | '));
  withRows([row('Casa Uno', 'A. Prueba', 'HA-0001')]);
  await M.ready(Object.assign({}, BASE), []);
  ok('la fila dice villa, inquilino, codigo y fecha de entrada',
    r0.textContent.indexOf('Casa Uno') >= 0 && r0.textContent.indexOf('A. Prueba') >= 0
    && r0.textContent.indexOf('#HA-0001') >= 0 && r0.textContent.indexOf('08/09/2026') >= 0,
    r0.textContent);
  ok('cuenta: 1 entradas, 0 con algo pendiente', hasNote(M, '1 entradas, 0 con algo pendiente'), notes(M).join(' // '));
  ok('nota de origen siempre', hasNote(M, 'Marcas de Entradas Equipo (tabla de reservas). Una marca no significa que Mia haya comprobado el trabajo.'));
  ok('boton Abrir en Entradas del plan, no de una fila',
    all(M.body, 'mia-btn').length === 1 && /entradas-equipo\.html\?/.test(all(M.body, 'mia-btn')[0].getAttribute('href')),
    all(M.body, 'mia-btn').map(function (b) { return b.getAttribute('href'); }).join(' '));
  ok('el enlace pide tipo=entrada', /tipo=entrada/.test(all(M.body, 'mia-btn')[0].getAttribute('href')));

  console.log('\n== sin dato y pendiente ==');
  withRows([
    row('Casa Uno', 'A. Prueba', 'HA-0001'),
    row('Casa Dos', 'B. Prueba', 'HA-0002', { 'TaBookings2021_LimpiezaTerminada': false }),
    row('Casa Tres', 'C. Prueba', 'HA-0003', { 'TaBookings2021_Registro_policia_done': '' })
  ]);
  await M.ready(Object.assign({}, BASE), []);
  var rr = rows(M);
  ok('tres filas', rr.length === 3);
  ok('la de limpieza en false va primera', rr[0].textContent.indexOf('Casa Dos') >= 0, rr[0].textContent);
  ok('limpieza false dice pendiente', pills(rr[0])[4] === '· Limpieza pendiente', pills(rr[0])[4]);
  ok('limpieza false lleva la clase pend', pillClasses(rr[0])[4] === 'mia-st pend', pillClasses(rr[0])[4]);
  ok('la de todo hecho va la ultima', rr[2].textContent.indexOf('Casa Uno') >= 0, rr[2].textContent);
  var sd = rr.filter(function (x) { return x.textContent.indexOf('Casa Tres') >= 0; })[0];
  ok("policia vacio dice 'sin dato', nunca hecho", pills(sd)[1] === '? Policía sin dato', pills(sd)[1]);
  ok('sin dato lleva la clase na, no ok', pillClasses(sd)[1] === 'mia-st na', pillClasses(sd)[1]);
  ok('sin dato cuenta como pendiente', hasNote(M, '3 entradas, 2 con algo pendiente'), notes(M).join(' // '));

  console.log('\n== tope de 60 ==');
  var many = [];
  for (var i = 0; i < 60; i++) many.push(row('Casa ' + i, 'X. Prueba', 'HA-1' + i));
  withRows(many);
  await M.ready(Object.assign({}, BASE), []);
  ok('sesenta filas', rows(M).length === 60);
  ok('sin linea de cuentas', !notes(M).some(function (n) { return / entradas, /.test(n); }), notes(M).join(' // '));
  ok('avisa de que hay mas', hasNote(M, 'Hay más de 60 entradas. Ábrelas en Entradas.'));
  ok('nota de origen tambien con el tope', hasNote(M, 'Marcas de Entradas Equipo'));

  console.log('\n== casos vacios y fallos ==');
  withRows([]);
  await M.ready(Object.assign({}, BASE), []);
  ok('sin reservas lo dice', hasNote(M, 'No hay entradas en esas fechas.'));
  ok('sin reservas no inventa cuentas', !notes(M).some(function (n) { return / entradas, /.test(n); }));
  ok('sin reservas deja el boton', all(M.body, 'mia-btn').length === 1);

  M.setFetch(function () { return Promise.reject(new Error('red')); });
  await M.ready(Object.assign({}, BASE), []);
  ok('fallo de lectura: aviso de fallo de lectura (J2) y solo el boton Reintentar',
    hasNote(M, 'No he podido leer los datos. Vuelve a intentarlo.') && all(M.body, 'mia-btn').length === 1, notes(M).join(' // '));
  ok('fallo de lectura no pinta filas', rows(M).length === 0);

  console.log('\n== el interruptor FEAT.ready ==');
  var asked = null;
  M.setFetch(function (b, limit) { asked = limit; return Promise.resolve([]); });
  M.FEAT.ready = 0;
  await M.bookings(Object.assign({}, BASE), false, [], 'ready');
  ok('con FEAT.ready=0 no se pide la tarjeta (limite de siempre, no 60)', asked !== M.READY_MAX, String(asked));
  ok('con FEAT.ready=0 no sale la nota de origen', !hasNote(M, 'Marcas de Entradas Equipo'));
  M.FEAT.ready = 1;
  await M.bookings(Object.assign({}, BASE), false, [], 'ready');
  ok('con FEAT.ready=1 la tarjeta pide hasta 60', asked === M.READY_MAX, String(asked));
  await M.bookings(Object.assign({}, BASE), false, [], 'state');
  ok('answer_card distinto de ready no abre la tarjeta', !hasNote(M, 'Marcas de Entradas Equipo'));

  console.log('\n' + pass + ' pass, ' + fail + ' fail\n');
  process.exit(fail ? 1 : 0);
})();
