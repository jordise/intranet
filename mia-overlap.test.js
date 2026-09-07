/* Pruebas del barrido del panel de Mia (2026-09-07): una respuesta por
   pregunta y ni una respuesta tardía en la pantalla de otra.
   node mia-overlap.test.js

   Como mia-j5.test.js y mia-j7.test.js: NO copia el código del módulo. Carga
   mia-intranet.js entero con un DOM mínimo y un Auth de mentira, y le añade una
   sola línea de enganche para poder llamar a las funciones. Si alguien edita el
   módulo, estas pruebas corren el código NUEVO.
   Nada sale a la red: fetch está sustituido por una función de prueba que
   guarda cada llamada y la resuelve cuando la prueba lo dice. Aquí no hay
   ningún dato de nadie: los nombres, los códigos y las villas son inventados. */
var fs = require('fs');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c === true) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

/* ── DOM mínimo: solo lo que toca Mia al montarse y al pintar ── */
function El(tag) {
  this.tagName = tag; this.children = []; this.attrs = {}; this._t = ''; this.className = '';
  this.parentNode = null; this.listeners = {};
  var set = {};
  this.classList = {
    add: function (c) { set[c] = 1; },
    remove: function (c) { delete set[c]; },
    contains: function (c) { return !!set[c]; },
    toggle: function (c, v) { if (v) set[c] = 1; else delete set[c]; }
  };
}
El.prototype.appendChild = function (c) { c.parentNode = this; this.children.push(c); return c; };
El.prototype.insertBefore = function (c, ref) {
  c.parentNode = this;
  var i = ref ? this.children.indexOf(ref) : -1;
  if (i < 0) this.children.push(c); else this.children.splice(i, 0, c);
  return c;
};
El.prototype.removeChild = function (c) {
  var i = this.children.indexOf(c);
  if (i >= 0) { this.children.splice(i, 1); c.parentNode = null; }
  return c;
};
El.prototype.contains = function (n) {
  if (n === this) return true;
  for (var i = 0; i < this.children.length; i++) if (this.children[i].contains && this.children[i].contains(n)) return true;
  return false;
};
El.prototype.setAttribute = function (k, v) { this.attrs[k] = v; };
El.prototype.getAttribute = function (k) { return this.attrs[k]; };
El.prototype.addEventListener = function (ev, fn) { (this.listeners[ev] = this.listeners[ev] || []).push(fn); };
El.prototype.removeEventListener = function () {};
El.prototype.querySelector = function (sel) {
  var cls = String(sel).replace(/^\./, '');
  for (var i = 0; i < this.children.length; i++) {
    var c = this.children[i];
    if (String(c.className || '').split(' ').indexOf(cls) >= 0) return c;
    var f = c.querySelector ? c.querySelector(sel) : null;
    if (f) return f;
  }
  return null;
};
Object.defineProperty(El.prototype, 'childNodes', { get: function () { return this.children; } });
Object.defineProperty(El.prototype, 'nextSibling', {
  get: function () {
    if (!this.parentNode) return null;
    var i = this.parentNode.children.indexOf(this);
    return (i >= 0 && this.parentNode.children[i + 1]) || null;
  }
});
Object.defineProperty(El.prototype, 'firstChild', { get: function () { return this.children[0] || null; } });
Object.defineProperty(El.prototype, 'textContent', {
  get: function () { return this._t + this.children.map(function (c) { return c.textContent; }).join(''); },
  set: function (v) { this.children = []; this._t = String(v); }
});
Object.defineProperty(El.prototype, 'innerHTML', {
  get: function () { return ''; },
  set: function () { this.children = [new El('svg')]; }
});
function fire(el, ev) {
  var l = (el && el.listeners && el.listeners[ev]) || [];
  var out = null;
  l.forEach(function (fn) { out = fn({ key: 'x', target: el, preventDefault: function () {}, stopPropagation: function () {} }); });
  return out;
}
/* Todos los nodos con una clase, en profundidad */
function all(node, cls, out) {
  out = out || [];
  ((node && node.children) || []).forEach(function (c) {
    if (String(c.className || '').split(' ').indexOf(cls) >= 0) out.push(c);
    all(c, cls, out);
  });
  return out;
}

var SRC = fs.readFileSync('mia-intranet.js', 'utf8');
var WORKER = 'mia-intranet-search';

/* ── El doble de fetch: guarda cada llamada y la resuelve cuando se le dice ── */
function mkFetch() {
  var st = { worker: [], proxy: [] };
  globalThis.fetch = function (url, opt) {
    var u = String(url);
    var box = { url: u, q: '' };
    try { if (opt && opt.body) box.q = JSON.parse(opt.body).q; } catch (e) {}
    var p = new Promise(function (res, rej) {
      box.reply = function (json, status) {
        res({ ok: (status || 200) < 400, status: status || 200, json: function () { return Promise.resolve(json || {}); } });
      };
      box.ko = rej;
    });
    (u.indexOf(WORKER) >= 0 ? st.worker : st.proxy).push(box);
    return p;
  };
  return st;
}
/* Deja correr las microtareas pendientes */
function flush() {
  return new Promise(function (r) { setTimeout(r, 0); }).then(function () {
    return new Promise(function (r) { setTimeout(r, 0); });
  });
}

/* Una copia del módulo por prueba: el estado es de módulo. */
function makeEnv(menus) {
  var doc = {
    readyState: 'complete',
    body: new El('body'),
    head: new El('head'),
    documentElement: new El('html'),
    createElement: function (t) { return new El(t); },
    createTextNode: function (t) { var n = new El('#text'); n.textContent = t; return n; },
    getElementById: function () { return null; },
    querySelector: function (sel) { return sel === 'nav.top-nav' ? doc._nav : null; },
    querySelectorAll: function () { return []; },
    addEventListener: function (ev, fn) { (doc._ls[ev] = doc._ls[ev] || []).push(fn); },
    removeEventListener: function () {}
  };
  doc._ls = {};
  doc._nav = new El('nav');
  doc.body.appendChild(doc._nav);
  var store = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
  var win = {};
  if (menus) win.NAV_MENUS = menus;
  var mark = '\n})();';
  var i = SRC.lastIndexOf(mark);
  if (i < 0) throw new Error('no encuentro el cierre del modulo');
  /* Única línea añadida: saca al banco de pruebas lo justo para llamar. */
  var hook = '\nglobalThis.__MIA_OV={onAsk:onAsk,closePanel:closePanel,hideRow:hideRow,setEasy:setEasy,'
    + 'menuPages:menuPages,bookingsWhere:bookingsWhere,proxyGet:proxyGet,doBookingsCard:doBookingsCard,'
    + 'FEAT:FEAT,T:T,MAX_ROWS:MAX_ROWS,getREQ:function(){return REQ;},'
    + 'doUnknown:doUnknown,getST:function(){return ST;},'
    + 'setFetchBookings:function(fn){fetchBookings=fn;},'
    + 'els:function(){return {row:ROW,panel:PANEL,body:BODY,input:INPUT,go:GOBTN,aa:AABTN};}};';
  var code = SRC.slice(0, i) + hook + SRC.slice(i);
  var run = new Function('window', 'document', 'location', 'localStorage', 'sessionStorage', 'Auth', code);
  run(win, doc, { pathname: '/intranet/tareas.html', search: '' }, store, store,
      { token: function () { return 'token-de-prueba'; }, role: function () { return 'admin'; }, url: function (u) { return u; } });
  var M = globalThis.__MIA_OV;
  M.doc = doc;
  M.body = M.els().body;
  return M;
}
function notes(M) { return all(M.body, 'mia-note').map(function (n) { return n.textContent; }); }
function texto(M) { return notes(M).join(' | '); }
function pregunta(M, q) { M.els().input.value = q; return M.onAsk(); }

/* Filas de reserva de mentira (nombres y códigos inventados) */
var FLD = {
  villa: 'TaVillas_Name_villa_para_inquilinos', code: 'TaBookings2021_FS_confirmation_code',
  guest: 'TaBookings2021_Guest_Full_Name', ci: 'TaBookings2021_Checkin', co: 'TaBookings2021_Checkout'
};
function fila(villa, guest, code) {
  var r = {};
  r[FLD.villa] = villa; r[FLD.guest] = guest; r[FLD.code] = code;
  r[FLD.ci] = '2026-09-08T00:00:00'; r[FLD.co] = '2026-09-15T00:00:00';
  return r;
}
var OCU_A = { target: 'availability', availability: { pax: 11 } };
var OCU_B = { target: 'availability', availability: { pax: 22 } };

console.log('mia-intranet.js — barrido del panel (una respuesta por pregunta)');

(async function () {

  /* ── 1. La respuesta tardía de A no pisa la respuesta de B ── */
  console.log('\n1. Dos preguntas a la vez');
  (function () {})();
  var st = mkFetch();
  var M = makeEnv();
  pregunta(M, 'ocupacion A');
  pregunta(M, 'ocupacion B');
  ok('las dos preguntas han salido', st.worker.length === 2, String(st.worker.length));
  st.worker[1].reply(OCU_B);
  await flush();
  ok('B contesta y se ve B', texto(M).indexOf('22 plazas') >= 0, texto(M));
  st.worker[0].reply(OCU_A);
  await flush();
  ok('la respuesta tardía de A NO se pinta', texto(M).indexOf('11 plazas') < 0, texto(M));
  ok('en la pantalla sigue la respuesta de B', texto(M).indexOf('22 plazas') >= 0, texto(M));

  /* ── 2. Con FEAT.seq=0 vuelve el comportamiento de antes ── */
  console.log('\n2. FEAT.seq=0: el comportamiento de siempre');
  st = mkFetch();
  M = makeEnv();
  M.FEAT.seq = 0;
  pregunta(M, 'ocupacion A');
  pregunta(M, 'ocupacion B');
  ok('sin la bandera el campo no se bloquea', !M.els().input.disabled);
  st.worker[1].reply(OCU_B);
  await flush();
  st.worker[0].reply(OCU_A);
  await flush();
  ok('apagado: la tardía de A vuelve a pisar a B', texto(M).indexOf('11 plazas') >= 0, texto(M));

  /* ── 3. El campo y el botón se bloquean mientras se responde ── */
  console.log('\n3. El bloqueo del campo');
  st = mkFetch();
  M = makeEnv();
  pregunta(M, 'ocupacion A');
  ok('con la pregunta en marcha el campo está bloqueado', M.els().input.disabled === true);
  ok('y el botón también', M.els().go.disabled === true);
  fire(M.els().go, 'click');
  ok('el clic bloqueado no manda otra pregunta', st.worker.length === 1, String(st.worker.length));
  fire(M.els().input, 'keydown');
  ok('el Enter bloqueado tampoco', st.worker.length === 1, String(st.worker.length));
  st.worker[0].reply(OCU_A);
  await flush();
  ok('con la respuesta el campo se desbloquea', M.els().input.disabled === false && M.els().go.disabled === false);

  /* ── 4. Cerrar el panel con la pregunta en marcha ── */
  console.log('\n4. El panel cerrado se queda cerrado');
  st = mkFetch();
  M = makeEnv();
  pregunta(M, 'ocupacion A');
  ok('el panel se abre con "Un momento…"', M.els().panel.classList.contains('show') === true);
  M.closePanel();
  ok('cerrado', M.els().panel.classList.contains('show') === false);
  st.worker[0].reply(OCU_A);
  await flush();
  ok('la respuesta tardía no reabre el panel', M.els().panel.classList.contains('show') === false);
  ok('y no ha escrito nada dentro', M.els().body.children.length === 0, String(M.els().body.children.length));
  ok('cerrar el panel desbloquea el campo', M.els().input.disabled === false);

  /* ── 5. Fila, chip y Reintentar de una pregunta vieja ── */
  console.log('\n5. Fila, chip y Reintentar de una respuesta que ya no está');
  async function lista(rows) {
    var s = mkFetch();
    var m = makeEnv();
    m.setFetchBookings(function () { return Promise.resolve(rows.slice()); });
    pregunta(m, 'reservas de prueba');
    s.worker[0].reply({ target: 'bookings', bookings: { guest: 'prueba' } });
    await flush();
    return { st: s, M: m };
  }
  var dos = [fila('Casa Uno', 'A. Prueba', 'HA-0001'), fila('Casa Dos', 'B. Prueba', 'HA-0002')];
  var e5 = await lista(dos);
  ok('la lista se ha pintado', all(e5.M.body, 'mia-vrow').length === 2, String(all(e5.M.body, 'mia-vrow').length));
  var filaBtn = all(e5.M.body, 'mia-vmain')[0];
  pregunta(e5.M, 'ocupacion B');
  e5.st.worker[1].reply(OCU_B);
  await flush();
  fire(filaBtn, 'click');
  await flush();
  ok('el clic en una fila vieja no pinta su ficha', all(e5.M.body, 'mcard').length === 0);
  ok('en la pantalla sigue la respuesta nueva', texto(e5.M).indexOf('22 plazas') >= 0, texto(e5.M));

  var e5b = await lista(dos);
  var equis = all(e5b.M.body, 'mia-x')[0];
  ok('la respuesta lleva chips que se pueden quitar', !!equis);
  pregunta(e5b.M, 'ocupacion B');
  e5b.st.worker[1].reply(OCU_B);
  await flush();
  fire(equis, 'click');
  await flush();
  ok('quitar un chip de una respuesta vieja no repinta nada', all(e5b.M.body, 'mia-vrow').length === 0);
  ok('y la respuesta nueva se queda', texto(e5b.M).indexOf('22 plazas') >= 0, texto(e5b.M));

  var s6 = mkFetch();
  var M6 = makeEnv();
  M6.setFetchBookings(function () { return Promise.reject(new Error('red')); });
  pregunta(M6, 'reservas de prueba');
  s6.worker[0].reply({ target: 'bookings', bookings: { guest: 'prueba' } });
  await flush();
  var rebtn = all(M6.body, 'mia-btn').filter(function (b) { return b.textContent === M6.T.retry; })[0];
  ok('un fallo de lectura ofrece Reintentar', !!rebtn, texto(M6));
  M6.setFetchBookings(function () { return Promise.resolve(dos.slice()); });
  pregunta(M6, 'ocupacion B');
  s6.worker[1].reply(OCU_B);
  await flush();
  fire(rebtn, 'click');
  await flush();
  ok('Reintentar de una respuesta vieja no pinta su lista', all(M6.body, 'mia-vrow').length === 0);
  ok('y la respuesta nueva se queda', texto(M6).indexOf('22 plazas') >= 0, texto(M6));

  /* ── 6. Los pagos que llegan tarde ── */
  console.log('\n6. Los pagos de una ficha que ya no está');
  var s7 = mkFetch();
  var M7 = makeEnv();
  M7.setFetchBookings(function () { return Promise.resolve([fila('Casa Uno', 'A. Prueba', 'HA-0001')]); });
  pregunta(M7, 'estado de la reserva');
  s7.worker[0].reply({ target: 'bookings', answer_card: 'state', bookings: { code: 'HA-0001' } });
  await flush();
  ok('la ficha se ha pintado', all(M7.body, 'mcard').length === 1);
  ok('los pagos se están leyendo', s7.proxy.length === 1, String(s7.proxy.length));
  ok('la consulta de pagos pide solo lo COBRADO',
    s7.proxy[0].url.indexOf(encodeURIComponent("Ta_payments_Status='COBRADO'")) > 0, s7.proxy[0].url);
  pregunta(M7, 'ocupacion B');
  s7.worker[1].reply(OCU_B);
  await flush();
  var pago = {};
  pago['Ta_payments_Importe'] = '100';
  s7.proxy[0].reply({ Result: [pago] });
  await flush();
  ok('los pagos tardíos no se pintan', all(M7.body, 'mia-pay').length === 0);
  ok('en la pantalla sigue la respuesta nueva', texto(M7).indexOf('22 plazas') >= 0, texto(M7));

  /* ── 7. Sin filtro no se listan reservas (G2) ── */
  console.log('\n7. Sin filtro no hay lista');
  ok('un WHERE que solo lleva la condición de canceladas es "sin filtro"',
    makeEnv().bookingsWhere({}) === '', JSON.stringify(makeEnv().bookingsWhere({})));
  ok('con código sí hay WHERE, y la condición de canceladas sigue estando',
    makeEnv().bookingsWhere({ code: 'HA-0001' }).indexOf("<>'cancelled'") >= 0);
  ok('un código numérico no revienta (G11)',
    makeEnv().bookingsWhere({ code: 10000001 }).indexOf('10000001') > 0);
  var s8 = mkFetch();
  var M8 = makeEnv();
  pregunta(M8, 'la reserva HA-0001');
  s8.worker[0].reply({ target: 'bookings', bookings: { code: 'HA-0001' } });
  await flush();
  s8.proxy[0].reply({ Result: [fila('Casa Uno', 'A. Prueba', 'HA-0001'), fila('Casa Dos', 'B. Prueba', 'HA-0002')] });
  await flush();
  ok('la lista de la reserva se pinta', all(M8.body, 'mia-vrow').length === 2, String(all(M8.body, 'mia-vrow').length));
  var x8 = all(M8.body, 'mia-x')[0];
  fire(x8, 'click');
  await flush();
  ok('al quitar el último chip no se listan las reservas de la empresa',
    all(M8.body, 'mia-vrow').length === 0, String(all(M8.body, 'mia-vrow').length));
  ok('se pide un dato en su lugar', texto(M8).indexOf(M8.T.noFilter) >= 0, texto(M8));

  /* ── 8. Aa y texto grande sobreviven a un fallo (G3) ── */
  console.log('\n8. El botón Aa sobrevive al aviso de caída');
  var M9 = makeEnv();
  M9.setEasy(true);
  ok('el texto grande está encendido', M9.doc.body.classList.contains('easy') === true);
  ok('el botón Aa está puesto', !!M9.els().aa);
  var s9 = mkFetch();
  pregunta(M9, 'algo');
  s9.worker[0].reply({ target: 'availability', availability: { pax: 33 } });
  await flush();
  M9.hideRow(true);
  ok('la fila se va', !M9.els().row);
  ok('el panel se queda', M9.els().panel.classList.contains('show') === true);
  ok('el texto grande se queda encendido', M9.doc.body.classList.contains('easy') === true);
  ok('el botón Aa sigue vivo, dentro del panel', !!M9.els().aa && M9.els().panel.contains(M9.els().aa) === true);
  M9.closePanel();
  ok('al cerrar el panel el texto grande se apaga', M9.doc.body.classList.contains('easy') === false);

  /* ── 9. La sesión caducada no es un fallo de lectura (G4) ── */
  console.log('\n9. La sesión caducada');
  var s10 = mkFetch();
  var M10 = makeEnv();
  var marca = null;
  M10.proxyGet('action=data&table=TaUsers&limit=200').catch(function (e) { marca = e && e.miaKind; });
  s10.proxy[0].reply({}, 401);
  await flush();
  ok('proxyGet convierte un 401 en la marca de sesión caducada', marca === '401', String(marca));
  var s11 = mkFetch();
  var M11 = makeEnv();
  M11.proxyGet('x').catch(function (e) { marca = e && e.miaKind; });
  s11.proxy[0].reply({}, 403);
  await flush();
  ok('un 403 también', marca === '401', String(marca));
  var s12 = mkFetch();
  var M12 = makeEnv();
  pregunta(M12, 'la reserva HA-0001');
  s12.worker[0].reply({ target: 'bookings', bookings: { code: 'HA-0001' } });
  await flush();
  s12.proxy[0].reply({}, 401);
  await flush();
  ok('la respuesta dice que hay que volver a entrar', texto(M12).indexOf(M12.T.expired) >= 0, texto(M12));
  ok('y no ofrece un Reintentar que no puede funcionar',
    all(M12.body, 'mia-btn').filter(function (b) { return b.textContent === M12.T.retry; }).length === 0);
  ok('no dice "no he podido leer los datos"', texto(M12).indexOf(M12.T.readFail) < 0, texto(M12));

  /* ── 10. Las páginas del menú, solo nombres de archivo (G14) ── */
  console.log('\n10. La lista blanca de páginas');
  var MENUS = {
    admin: [
      { label: 'Raro', url: 'javascript:x.html' },
      { label: 'Arriba', url: '../a.html' },
      { label: 'Absoluta', url: '/a.html' },
      { label: 'Con espacio', url: 'a b.html' },
      { label: 'Tareas', url: 'tareas.html' }
    ]
  };
  var L = makeEnv(MENUS).menuPages();
  ok('solo entra la página de verdad', L.length === 1 && L[0].key === 'tareas', JSON.stringify(L));
  ok("'javascript:x.html' no entra", !L.some(function (p) { return /javascript/.test(p.key + p.url); }));
  ok("'../a.html' y '/a.html' no entran", !L.some(function (p) { return p.key === 'a'; }));
  ok('la url guardada se arma con la clave', L[0].url === 'tareas.html');

  /* ── 11. "Hay más" solo cuando de verdad hay más (G17) ── */
  console.log('\n11. El aviso de "hay más resultados"');
  async function lista2(n) {
    var s = mkFetch();
    var m = makeEnv();
    var pool = [];
    for (var i = 0; i < n; i++) pool.push(fila('Casa ' + i, 'X. Prueba', 'HA-' + i));
    m.setFetchBookings(function (b, limit) { return Promise.resolve(pool.slice(0, limit)); });
    pregunta(m, 'reservas de prueba');
    s.worker[0].reply({ target: 'bookings', bookings: { guest: 'prueba' } });
    await flush();
    return m;
  }
  var m5 = await lista2(5);
  ok('con cinco resultados se pintan cinco filas', all(m5.body, 'mia-vrow').length === 5, String(all(m5.body, 'mia-vrow').length));
  ok('con exactamente cinco NO se dice que hay más', texto(m5).indexOf(m5.T.more) < 0, texto(m5));
  var m6 = await lista2(6);
  ok('con seis se siguen pintando cinco filas', all(m6.body, 'mia-vrow').length === 5, String(all(m6.body, 'mia-vrow').length));
  ok('con seis sí se dice que hay más', texto(m6).indexOf(m6.T.more) >= 0, texto(m6));

  /* -- 12. El enlace de una fila con comillas en el nombre (G10) -- */
  console.log('\n12. El nombre con comillas no viaja en el enlace de la fila');
  var conComilla = fila('Casa Uno', "A. O'Prueba", '');
  var sinComilla = fila('Casa Dos', 'B. Prueba', '');
  var s13 = mkFetch();
  var M13 = makeEnv();
  M13.setFetchBookings(function () { return Promise.resolve([conComilla, sinComilla]); });
  pregunta(M13, 'reservas de prueba');
  s13.worker[0].reply({ target: 'bookings', bookings: { guest: 'prueba' } });
  await flush();
  var hrefs = all(M13.body, 'mia-vrow').map(function (r) {
    return (all(r, 'mia-btn')[0] || { getAttribute: function () { return ''; } }).getAttribute('href');
  });
  ok('la fila con comilla abre Entradas solo por fechas',
    hrefs.length === 2 && hrefs[0].indexOf('inq=') < 0 && hrefs[0].indexOf('desde=') >= 0, hrefs[0]);
  ok('el nombre con comilla no viaja en ningun enlace',
    hrefs.join(' ').indexOf('Prueba') < 0 || hrefs[0].indexOf('O%27') < 0, hrefs.join(' '));
  ok('la fila sin comilla sigue llevando el nombre', hrefs[1].indexOf('inq=B.') >= 0, hrefs[1]);

  /* -- 13. "No he entendido" no comparte filtros de la respuesta anterior -- */
  console.log('\n13. "No he entendido" va sin filtros y sin enlace');
  var s14 = mkFetch();
  var M14 = makeEnv();
  M14.setFetchBookings(function () { return Promise.resolve([fila('Casa Uno', 'A. Prueba', 'HA-0001'), fila('Casa Dos', 'B. Prueba', 'HA-0002')]); });
  pregunta(M14, 'reservas de prueba');
  s14.worker[0].reply({ target: 'bookings', bookings: { guest: 'prueba' } });
  await flush();
  ok('la lista deja puesto un enlace para el aviso', M14.getST().shareHref.length > 0);
  M14.doUnknown({}, M14.getREQ());
  ok('doUnknown borra el enlace del aviso', M14.getST().shareHref === '', M14.getST().shareHref);
  ok('doUnknown borra los chips del aviso', M14.getST().shareChips.length === 0);
  ok('y la respuesta dice "No he entendido"', texto(M14).indexOf(M14.T.unknown) >= 0, texto(M14));

  console.log('');
  console.log('PASS ' + pass + '  FAIL ' + fail);
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.log('  FAIL  (excepción) -> ' + e.stack); process.exit(1); });
