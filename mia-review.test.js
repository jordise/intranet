/* Pruebas de las correcciones de la revisión funcional del 2026-09-07
   (R3, R4, R6, R7, R11, R12, R13).
   node mia-review.test.js

   Como mia-j5.test.js y mia-overlap.test.js: NO copia el código del módulo.
   Carga mia-intranet.js entero con un DOM mínimo y un Auth de mentira, y le
   añade una sola línea de enganche para poder llamar a sus funciones. Si
   alguien edita el módulo, estas pruebas corren el código NUEVO.
   Nada sale a la red: la lista de villas se pone a mano y proxyGet está
   sustituido. Aquí no hay ni un dato de nadie: las tareas, los códigos y los
   nombres son inventados, y de las villas solo se usa el par del ejemplo de
   la revisión (VILLA VORAMAR / APARTAMENTOS VORAMAR, nombres públicos de
   alquiler); el resto también son inventadas. */
var fs = require('fs');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c === true) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

/* ── DOM mínimo: solo lo que toca Mia al pintar una respuesta ── */
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
  get: function () { return this._t + this.children.map(function (c) { return c.textContent; }).join(''); },
  set: function (v) { this.children = []; this._t = String(v); }
});
Object.defineProperty(El.prototype, 'innerHTML', {
  get: function () { return ''; },
  set: function () { this.children = [new El('svg')]; }
});
Object.defineProperty(El.prototype, 'firstChild', { get: function () { return this.children[0] || null; } });

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
  /* Única línea añadida: saca al banco de pruebas lo justo para llamar. */
  var hook = '\nglobalThis.__MIA_REV={T:T,FEAT:FEAT,resolveVilla:resolveVilla,villa:doVilla,'
    + 'link:doBookingsLink,tasks:doTasks,incidents:doTasksIncidents,state:renderState,'
    + 'isAutoTask:isAutoTask,tasksPlan:tasksPlan,'
    + 'setVillas:function(l){VILLASP=Promise.resolve(l);},'
    + 'setProxy:function(fn){proxyGet=fn;},'
    + 'setPanel:function(p,b){PANEL=p;BODY=b;}};';
  var code = src.slice(0, i) + hook + src.slice(i);
  var run = new Function('window', 'document', 'location', 'localStorage', 'sessionStorage', 'Auth', code);
  run({}, doc, { pathname: '/intranet/tareas.html', search: '' }, store, store,
      { token: function () { return 't'; }, role: function () { return 'admin'; }, url: function (u) { return u; } });
  var M = globalThis.__MIA_REV;
  var panel = new El('div'), body = new El('div');
  M.setPanel(panel, body);
  M.body = body;
  M.setProxy(function () { return Promise.resolve([]); });
  return M;
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
function texto(M) { return notes(M).join(' | '); }
function botones(M) { return all(M.body, 'mia-btn').map(function (b) { return b.textContent; }); }
function hrefs(M) { return all(M.body, 'mia-btn').map(function (b) { return b.getAttribute('href') || ''; }); }

/* ── Villas de mentira. Ni un nombre real. ── */
var VILLAS = [
  { id: '92',  name: 'VILLA VORAMAR',          alt: 'VORAMAR' },
  { id: '400', name: 'APARTAMENTOS DEL PUERTO', alt: 'PUERTO' },
  { id: '396', name: 'VORAMAR APARTAMENTOS',   alt: 'VORAMAR APTOS' },
  { id: '10',  name: 'VILLA ALBA',              alt: 'SON ALBA' },
  { id: '11',  name: 'VILLA SON PRUEBA',        alt: 'SON PRUEBA' }
];

/* ── Filas de reserva de mentira ── */
var FLD = {
  villa: 'TaVillas_Name_villa_para_inquilinos', code: 'TaBookings2021_FS_confirmation_code',
  guest: 'TaBookings2021_Guest_Full_Name', ci: 'TaBookings2021_Checkin', co: 'TaBookings2021_Checkout',
  arr: 'TaBookings2021_Arrivalform_done', chk: 'TaBookings2021_checkinonline_todo_terminado',
  adultos: 'TaBookings2021_Adults', adultosForm: 'TaBookings2021_Guest_adults_nr_form'
};
function reserva(over) {
  var r = {};
  r[FLD.villa] = 'CASA DE PRUEBA'; r[FLD.guest] = 'A. Prueba'; r[FLD.code] = 'PRUEBA01';
  r[FLD.ci] = '2026-09-08T00:00:00'; r[FLD.co] = '2026-09-15T00:00:00';
  r[FLD.adultos] = 2;
  for (var k in (over || {})) r[k] = over[k];
  return r;
}
/* ── Filas de tarea de mentira ── */
function tarea(id, tipo, nombre) {
  return {
    taskid: id, Tasktype: tipo, Taskname: nombre, villaid: '92',
    Incidencias: 1, Taskdescription: 'Texto de prueba', Data_to_be_done_fixed: '2026-09-05T00:00:00',
    Tarea_terminada: 0
  };
}

console.log('mia-intranet.js — correcciones de la revisión del 2026-09-07');

(async function () {

  /* ── R3. El calificativo del nombre de la villa no se pierde ── */
  console.log('\nR3. Varias villas: delante las que llevan todas las palabras');
  var M = makeEnv();
  M.setVillas(VILLAS);
  var r3 = await M.resolveVilla('apartamentos voramar');
  ok('con las dos palabras separadas gana la villa que las lleva las dos',
    r3.hits.length && r3.hits[0].id === '396', JSON.stringify(r3.hits.map(function (h) { return h.name; })));
  ok('VILLA VORAMAR no se cuela delante', r3.hits[0].id !== '92', JSON.stringify(r3.hits.map(function (h) { return h.name; })));
  ok('y tampoco gana una villa que solo lleva "apartamentos"',
    r3.hits[0].id !== '400', JSON.stringify(r3.hits.map(function (h) { return h.name; })));
  /* La misma pregunta con el nombre tal cual lo tiene la lista. */
  var M3 = makeEnv();
  M3.setVillas([{ id: '92', name: 'VILLA VORAMAR', alt: 'VORAMAR' },
                { id: '396', name: 'APARTAMENTOS VORAMAR', alt: 'VORAMAR APTOS' }]);
  var r3d = await M3.resolveVilla('apartamentos voramar');
  ok('"apartamentos voramar" da APARTAMENTOS VORAMAR, no VILLA VORAMAR',
    r3d.hits.length === 1 && r3d.hits[0].id === '396', JSON.stringify(r3d.hits.map(function (h) { return h.name; })));
  var r3b = await M.resolveVilla('villa voramar');
  ok('el acierto exacto de una sola villa no cambia',
    r3b.hits.length === 1 && r3b.hits[0].id === '92', JSON.stringify(r3b.hits));
  var r3c = await M.resolveVilla('voramar');
  ok('una sola palabra sigue mandando el nombre exacto (VILLA VORAMAR)',
    r3c.hits.length === 1 && r3c.hits[0].id === '92', JSON.stringify(r3c.hits.map(function (h) { return h.name; })));
  var r3e = await M.resolveVilla('villa alba');
  ok('el nombre exacto de siempre sigue saliendo solo',
    r3e.hits.length === 1 && r3e.hits[0].id === '10', JSON.stringify(r3e.hits.map(function (h) { return h.name; })));

  /* ── R4. Sin filtro y sin reserva en la página no hay lista ── */
  console.log('\nR4. "¿está pagado?" sin nada a lo que agarrarse');
  M = makeEnv();
  M.link({}, [], null, undefined);
  ok('se pide un dato', texto(M).indexOf(M.T.noFilter) >= 0, texto(M));
  ok('no hay botón a todas las reservas', botones(M).length === 0, botones(M).join(' / '));
  ok('no dice "he usado los filtros de esta página"', texto(M).indexOf(M.T.usedHere) < 0, texto(M));
  M = makeEnv();
  M.link({}, ['31 de febrero'], null, undefined);
  ok('con un filtro caído y nada más, tampoco hay botón', botones(M).length === 0, botones(M).join(' / '));
  ok('y lo que falló se sigue diciendo', texto(M).indexOf('31 de febrero') >= 0, texto(M));
  M = makeEnv();
  M.link({ code: 'PRUEBA01' }, [], null, undefined);
  ok('con la reserva de la página sí hay botón', botones(M).length === 1, botones(M).join(' / '));

  /* ── R6. Lista de reservas sin fechas: se dice que abre todo el historial ── */
  console.log('\nR6. Sin fechas se abre todo el historial');
  M = makeEnv();
  M.link({ villa: 'VILLA VORAMAR', tipo: 'entrada' }, [], null, undefined);
  ok('la ventana sigue yendo vacía a propósito',
    hrefs(M)[0].indexOf('desde=&hasta=') >= 0, hrefs(M).join(' '));
  ok('y la respuesta lo dice, nombrando la villa', texto(M).indexOf(M.T.noDates) >= 0, texto(M));
  M = makeEnv();
  M.link({ tipo: 'salida' }, [], null, undefined);
  ok('sin villa la nota no habla de "esa villa"', texto(M).indexOf(M.T.noDatesAll) >= 0, texto(M));
  ok('y no se cuela el texto con villa', texto(M).indexOf(M.T.noDates) < 0, texto(M));
  M = makeEnv();
  M.link({ villa: 'VILLA VORAMAR', check_in_from: '2026-09-08', check_in_to: '2026-09-08' }, [], null, undefined);
  ok('con fechas no se dice nada de historial', texto(M).indexOf(M.T.noDates) < 0, texto(M));

  /* ── R7. Un filtro caído no deja un botón que abre otra cosa ── */
  console.log('\nR7. El botón dice qué abre de verdad');
  M = makeEnv();
  M.link({ tipo: 'salida' }, ['31 de febrero'], null, undefined);
  ok('queda el tipo, así que hay botón', botones(M).length === 1, botones(M).join(' / '));
  ok('y el botón dice que va sin fecha y solo con salidas',
    botones(M)[0] === M.T.openEnt + ' (' + M.T.btnOnlyOut + ', ' + M.T.btnNoDate + ')', botones(M)[0]);
  M = makeEnv();
  M.link({ villa: 'VILLA VORAMAR', tipo: 'entrada' }, [], null, undefined);
  ok('sin nada caído la etiqueta es la de siempre', botones(M)[0] === M.T.openEnt, botones(M)[0]);

  M = makeEnv();
  M.setVillas(VILLAS);
  await M.tasks({ villa: 'ZZZZ QUE NO EXISTE' }, [], undefined);
  ok('la villa desconocida se dice', texto(M).indexOf(M.T.noVilla) >= 0, texto(M));
  ok('sin nada que abrir no hay botón de Tareas', botones(M).length === 0, botones(M).join(' / '));
  M = makeEnv();
  M.setVillas(VILLAS);
  await M.tasks({ villa: 'ZZZZ QUE NO EXISTE', status: 'pendiente' }, [], undefined);
  ok('con el estado sí hay botón', botones(M).length === 1, botones(M).join(' / '));
  ok('y el botón dice que va sin villa',
    botones(M)[0] === M.T.openTar + ' (' + M.T.btnNoVilla + ')', botones(M)[0]);
  M = makeEnv();
  M.setVillas(VILLAS);
  await M.tasks({ villa: 'VILLA VORAMAR', status: 'pendiente' }, [], undefined);
  ok('con la villa encontrada la etiqueta es la de siempre', botones(M)[0] === M.T.openTar, botones(M)[0]);

  /* ── R11. El nombre interno debajo de la elección ── */
  console.log('\nR11. La villa que salió por su nombre interno');
  M = makeEnv();
  M.setVillas(VILLAS);
  await M.villa({ name: 'son' }, [], undefined);
  var filas = all(M.body, 'mia-vrow');
  ok('salen las dos villas con SON', filas.length === 2, String(filas.length));
  var conHint = filas.filter(function (f) { return all(f, 'mia-n')[0].textContent.indexOf('ALBA') >= 0; })[0];
  var sinHint = filas.filter(function (f) { return all(f, 'mia-n')[0].textContent.indexOf('PRUEBA') >= 0; })[0];
  ok('la que no lleva la palabra enseña su nombre interno',
    all(conHint, 'mia-m').length === 1 && all(conHint, 'mia-m')[0].textContent === 'SON ALBA',
    all(conHint, 'mia-m').map(function (m) { return m.textContent; }).join('/'));
  ok('la que sí la lleva no repite nada', all(sinHint, 'mia-m').length === 0);

  /* La lista de villas de Tareas sigue la misma regla */
  M = makeEnv();
  M.setVillas(VILLAS);
  await M.tasks({ villa: 'son', status: 'pendiente' }, [], undefined);
  var filasT = all(M.body, 'mia-vrow');
  ok('Tareas también ofrece las dos villas', filasT.length === 2, String(filasT.length));
  var conHintT = filasT.filter(function (f) { return all(f, 'mia-n')[0].textContent.indexOf('ALBA') >= 0; })[0];
  var sinHintT = filasT.filter(function (f) { return all(f, 'mia-n')[0].textContent.indexOf('PRUEBA') >= 0; })[0];
  ok('en Tareas la villa que salió por el nombre interno lo enseña',
    all(conHintT, 'mia-m').length === 1 && all(conHintT, 'mia-m')[0].textContent === 'SON ALBA',
    all(conHintT, 'mia-m').map(function (m) { return m.textContent; }).join('/'));
  ok('y la que lleva la palabra escrita no repite nada', all(sinHintT, 'mia-m').length === 0);

  /* ── R12. "Automática" es Tasktype 20, no el nombre ── */
  console.log('\nR12. La tarea automática la dice el Tasktype');
  M = makeEnv();
  ok('Tasktype 20 es automática', M.isAutoTask({ Tasktype: '20' }) === true);
  ok('un 20 numérico también', M.isAutoTask({ Tasktype: 20 }) === true);
  ok('una tarea a mano llamada "Limpieza..." NO es automática',
    M.isAutoTask({ Tasktype: '12', Taskname: 'Limpieza extra pedida por el cliente' }) === false);
  ok('sin Tasktype no es automática', M.isAutoTask({}) === false);

  M = makeEnv();
  M.setVillas(VILLAS);
  var auto = tarea('101', '20', 'Limpieza');
  var mano = tarea('102', '12', 'Reparacion');
  M.setProxy(function (qs) {
    if (String(qs).indexOf('TaTasks') >= 0) return Promise.resolve([auto, mano]);
    return Promise.resolve([]);
  });
  await M.tasks({ villa: 'VILLA VORAMAR', incident: true, from: '2026-09-01', to: '2026-09-07' }, [], undefined);
  ok('la lista de incidencias enseña las dos tareas', all(M.body, 'mia-inc').length === 2, String(all(M.body, 'mia-inc').length));
  ok('y su enlace no esconde las automáticas (el parte lo rellena la limpieza)',
    hrefs(M).join(' ').indexOf('auto=0') < 0, hrefs(M).join(' '));

  M = makeEnv();
  M.setVillas(VILLAS);
  M.setProxy(function (qs) {
    if (String(qs).indexOf('TaTasks') >= 0) return Promise.resolve([auto, mano]);
    return Promise.resolve([]);
  });
  await M.incidents({ incident: true, noauto: true, from: '2026-09-01', to: '2026-09-07' }, [], null, [], undefined);
  var incs = all(M.body, 'mia-inc');
  ok('escondiendo las automáticas queda una sola tarea', incs.length === 1, String(incs.length));
  ok('la que queda es la que NO es Tasktype 20',
    incs.length === 1 && incs[0].textContent.indexOf('Reparacion') >= 0, incs.length ? incs[0].textContent : '');

  /* ── R13. Check-in online = Arrivalform_done ── */
  console.log('\nR13. La línea de Check-in online');
  function ciPill(M) {
    var p = all(M.body, 'mia-st').filter(function (s) { return s.textContent.indexOf('Check-in online') >= 0; })[0];
    return p ? { txt: p.textContent, cls: p.className } : null;
  }
  async function ci(over) {
    var m = makeEnv();
    await m.state(reserva(over), null, undefined);
    return ciPill(m);
  }
  var o1 = {}; o1[FLD.arr] = true; o1[FLD.chk] = 3;
  var p1 = await ci(o1);
  ok('formulario hecho y con adultos: ✓ (aunque la fórmula vieja diga 3)',
    !!p1 && p1.txt === '✓ Check-in online', p1 && p1.txt);
  ok('y en verde (ok)', !!p1 && p1.cls.indexOf('ok') >= 0, p1 && p1.cls);

  var o2 = {}; o2[FLD.arr] = 0; o2[FLD.chk] = 1;
  var p2 = await ci(o2);
  ok('formulario sin hacer: pendiente',
    !!p2 && p2.txt === '· Check-in online ' + M.T.rdPend, p2 && p2.txt);
  ok('y no en verde', !!p2 && p2.cls.indexOf('ok') < 0, p2 && p2.cls);

  var o3 = {}; o3[FLD.arr] = '';
  var p3 = await ci(o3);
  ok('casilla vacía: sin dato, nunca hecho ni pendiente',
    !!p3 && p3.txt === '? Check-in online ' + M.T.rdNa, p3 && p3.txt);
  ok('y con el borde de "sin dato" (na)', !!p3 && p3.cls.indexOf('na') >= 0, p3 && p3.cls);

  /* La regla de entradas-equipo v144 (G11): marcado con cero adultos no es hecho. */
  var o4 = {}; o4[FLD.arr] = true; o4[FLD.adultosForm] = '0';
  var p4 = await ci(o4);
  ok('formulario marcado con cero adultos: pendiente, no ✓',
    !!p4 && p4.txt === '· Check-in online ' + M.T.rdPend, p4 && p4.txt);
  var o5 = {}; o5[FLD.arr] = true; o5[FLD.adultosForm] = '3';
  var p5 = await ci(o5);
  ok('con adultos en el formulario vuelve a ser ✓',
    !!p5 && p5.txt === '✓ Check-in online', p5 && p5.txt);
  var o6 = {}; o6[FLD.arr] = true; o6[FLD.adultosForm] = ''; o6[FLD.adultos] = 0;
  var p6 = await ci(o6);
  ok('sin adultos en el formulario manda el de la reserva (0 = pendiente)',
    !!p6 && p6.txt === '· Check-in online ' + M.T.rdPend, p6 && p6.txt);

  console.log('');
  console.log('PASS ' + pass + '  FAIL ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.log('  FAIL  (excepción) -> ' + e.stack); process.exit(1); });
