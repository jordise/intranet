/* Pruebas del viaje 7 de Mia: abrir cualquier página del menú de quien
   pregunta, por su nombre.
   node mia-j7.test.js

   Como mia-j5.test.js: NO copia el código del módulo. Carga mia-intranet.js
   entero con un DOM mínimo y un Auth de mentira, y le añade una sola línea de
   enganche para poder llamar a las funciones. Si alguien edita el módulo,
   estas pruebas corren el código NUEVO.
   Nada sale a la red: el fetch se sustituye por una función de prueba. Los
   menús de este fichero son de mentira (mismos nombres de página del intranet,
   que son públicos); aquí no hay ni un dato de nadie. */
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
  get: function () {
    return this._t + this.children.map(function (c) { return c.textContent; }).join('');
  },
  set: function (v) { this.children = []; this._t = String(v); }
});
Object.defineProperty(El.prototype, 'innerHTML', {
  get: function () { return ''; },
  set: function () { this.children = [new El('svg')]; }
});
Object.defineProperty(El.prototype, 'firstChild', {
  get: function () { return this.children[0] || null; }
});

var SRC = fs.readFileSync('mia-intranet.js', 'utf8');

/* Una copia del módulo por prueba: el rol y el menú se leen al preguntar. */
function makeEnv(role, menus) {
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
  var win = {};
  if (menus) win.NAV_MENUS = menus;
  var mark = '\n})();';
  var i = SRC.lastIndexOf(mark);
  if (i < 0) throw new Error('no encuentro el cierre del modulo');
  /* Única línea añadida: saca al banco de pruebas lo justo para llamar. */
  var hook = '\nglobalThis.__MIA_J7={menuPages:menuPages,askBody:askBody,askWorker:askWorker,'
    + 'doPage:doPage,onAsk:onAsk,FEAT:FEAT,T:T,getST:function(){return ST;},'
    + 'setPanel:function(p,b){PANEL=p;BODY=b;},setInput:function(v){INPUT=v;}};';
  var code = SRC.slice(0, i) + hook + SRC.slice(i);
  var run = new Function('window', 'document', 'location', 'localStorage', 'sessionStorage', 'Auth', code);
  run(win, doc, { pathname: '/intranet/entradas.html', search: '' }, store, store,
      { token: function () { return 'token-de-prueba'; }, role: function () { return role; }, url: function (u) { return u; } });
  var M = globalThis.__MIA_J7;
  var panel = new El('div'), body = new El('div');
  M.setPanel(panel, body);
  M.setInput({ value: '' });
  M.body = body;
  return M;
}

/* ── Menús de mentira, con la misma forma que los de nav.js ── */
var EQUIPO = {
  label: 'Equipo', icon: '👥',
  children: [{ label: 'Horarios', icon: '📄', url: 'https://docs.google.com/document/d/EJEMPLO/edit' }]
};
var ADMIN = [
  { label: 'Entradas y Salidas', url: 'entradas.html', icon: '🚪' },
  { label: 'Villas', url: 'buscar-villa.html', icon: '🏡' },
  { label: 'Contactos', url: 'contactos.html', icon: '👥' },
  { label: 'Tareas', url: 'tareas.html', icon: '✅' },
  { label: 'Ocupación', url: 'listado-ocupacion.html', icon: '📅' },
  { label: 'WelcomePacks', url: 'pedir-wellcomepacks.html', icon: '📦' },
  { label: 'Guardias', url: 'guardias-e-intervenciones.html', icon: '🚨' },
  EQUIPO,
  { label: 'Listados', icon: '📖', children: [{ label: 'Reporte ventas semanal', url: 'reports-ventas.html' }] },
  {
    label: 'Administración', icon: '📖',
    children: [
      { label: 'Nueva Villa', url: 'crear-villa.html' },
      { label: 'Control Waiver', url: 'control-waiver.html' },
      { label: 'Listado Guardias', url: 'listado-guardias-e-intervenciones.html' },
      { label: 'Reuniones', url: 'reuniones.html' }
    ]
  },
  {
    label: 'Configuración', icon: '⚙️',
    children: [
      { label: 'Roles y permisos', url: 'permisos.html' },
      { label: 'Villas', url: 'buscar-villa.html' },   /* repetida a propósito */
      { label: 'Test1', url: 'XXtest1XX.html' },
      { label: 'Test2', url: 'XXtest2XX.html' }
    ]
  },
  { label: 'Login', url: 'login.html', icon: '🔑' }
];
var STAFF = [
  { label: 'Entradas y Salidas', url: 'entradas.html' },
  { label: 'Villas', url: 'buscar-villa.html' },
  { label: 'Contactos', url: 'contactos.html' },
  { label: 'Tareas', url: 'tareas.html' },
  { label: 'Ocupación', url: 'listado-ocupacion.html' },
  { label: 'WelcomePacks', url: 'pedir-wellcomepacks.html' },
  { label: 'Guardias', url: 'guardias-e-intervenciones.html' },
  EQUIPO,
  { label: 'Login', url: 'login.html' }
];
var SALES = [
  { label: 'Reporte Semanal', url: 'reports-ventas.html' },
  { label: 'Vacacional', children: [{ label: 'Villas', url: 'buscar-villa.html' }, { label: 'Contactos', url: 'contactos.html' }] },
  {
    label: 'Administración',
    children: [
      { label: 'Nueva Villa', url: 'crear-villa.html' },
      { label: 'Control Waiver', url: 'control-waiver.html' },
      { label: 'Reuniones', url: 'reuniones.html' }
    ]
  },
  { label: 'Login', url: 'login.html' }
];
var MENUS = { admin: ADMIN, manager: ADMIN, staff: STAFF, villamanager: STAFF, sales: SALES, comercial: SALES };

function keys(list) { return list.map(function (p) { return p.key; }); }
function has(list, k) { return keys(list).indexOf(k) >= 0; }
function findBy(list, k) { return list.filter(function (p) { return p.key === k; })[0] || null; }
/* Todo lo que un nodo llevaría a la pantalla: textos y atributos */
function all(node, cls, out) {
  out = out || [];
  (node.children || []).forEach(function (c) {
    if (String(c.className || '').split(' ').indexOf(cls) >= 0) out.push(c);
    all(c, cls, out);
  });
  return out;
}
function notes(M) { return all(M.body, 'mia-note').map(function (n) { return n.textContent; }); }
function links(M) {
  return all(M.body, 'mia-btn').map(function (a) { return { txt: a.textContent, href: a.getAttribute('href') }; });
}

console.log('mia-intranet.js — viaje 7 (abrir una página del menú por su nombre)');

/* ─────────── 1. menuPages(): aplanado del menú ─────────── */
(function () {
  var M = makeEnv('admin', MENUS);
  var L = M.menuPages();
  ok('admin: la página de primer nivel entra (entradas)', has(L, 'entradas'));
  ok('admin: una página de un submenú entra (control-waiver)', has(L, 'control-waiver'));
  ok('admin: el submenú Listados también se aplana (reports-ventas)', has(L, 'reports-ventas'));
  ok('el enlace externo de Google Docs no entra',
    L.every(function (p) { return p.url.indexOf('://') < 0; }) && !has(L, 'edit'));
  ok('la carpeta sin url (Equipo, Listados) no entra como página',
    !has(L, 'equipo') && !has(L, 'listados'));
  ok('las páginas de prueba XX...XX no entran',
    L.every(function (p) { return !/xx/i.test(p.key); }), keys(L).join(','));
  ok('login no entra', !has(L, 'login'));
  ok('la villa repetida sale una sola vez',
    keys(L).filter(function (k) { return k === 'buscar-villa'; }).length === 1);
  ok('toda clave es minúsculas, cifras y guiones',
    L.every(function (p) { return /^[a-z0-9-]{1,40}$/.test(p.key); }), keys(L).join(','));
  ok('toda url acaba en .html', L.every(function (p) { return /\.html$/.test(p.url); }));
  ok('la clave es el nombre del archivo sin .html',
    L.every(function (p) { return p.url === p.key + '.html'; }));
  ok('admin: trece páginas en el menú de prueba', L.length === 13, String(L.length));
  var cw = findBy(L, 'control-waiver');
  ok('Control Waiver conserva el nombre del menú', !!cw && cw.label === 'Control Waiver');
  ok('Control Waiver enlaza a control-waiver.html', !!cw && cw.url === 'control-waiver.html');
})();

(function () {
  var M = makeEnv('staff', MENUS);
  var L = M.menuPages();
  ok('staff: no tiene control-waiver en su menú', !has(L, 'control-waiver'));
  ok('staff: sí tiene entradas', has(L, 'entradas'));
  ok('staff: siete páginas', L.length === 7, String(L.length));
  var S = makeEnv('sales', MENUS).menuPages();
  ok('sales: tiene control-waiver y el reporte', has(S, 'control-waiver') && has(S, 'reports-ventas'));
  ok('sales: no tiene tareas', !has(S, 'tareas'));
  ok('manager comparte el menú de admin',
    makeEnv('manager', MENUS).menuPages().length === 13);
})();

(function () {
  /* Casos raros: nunca revientan y nunca inventan una página. */
  ok('sin NAV_MENUS la lista está vacía', makeEnv('admin', null).menuPages().length === 0);
  ok('un rol sin menú da la lista vacía', makeEnv('cleaner', MENUS).menuPages().length === 0);
  ok('un rol vacío da la lista vacía', makeEnv('', MENUS).menuPages().length === 0);
  ok('un menú que no es una lista da la lista vacía',
    makeEnv('admin', { admin: { label: 'x' } }).menuPages().length === 0);
  ok('un menú con huecos y basura no rompe el aplanado',
    makeEnv('admin', { admin: [null, 'texto', { label: 'Tareas', url: 'tareas.html' }, { url: 'sin-nombre.html' }, { label: 'Sin url' }] })
      .menuPages().length === 1);
  ok('el rol llega con mayúsculas y espacios y aun así encuentra su menú',
    makeEnv('  Admin  ', MENUS).menuPages().length === 13);

  /* Hijos de los hijos: el aplanado baja más de un nivel. */
  var hondo = { admin: [{ label: 'A', children: [{ label: 'B', children: [{ label: 'Reuniones', url: 'reuniones.html' }] }] }] };
  ok('un submenú dentro de otro submenú también se aplana',
    has(makeEnv('admin', hondo).menuPages(), 'reuniones'));

  /* Tope de 40. */
  var muchas = [];
  for (var i = 1; i <= 60; i++) muchas.push({ label: 'Pagina ' + i, url: 'pagina-' + i + '.html' });
  var L = makeEnv('admin', { admin: muchas }).menuPages();
  ok('el tope de páginas es 40', L.length === 40, String(L.length));
  ok('el tope se aplica a las primeras del menú', L[0].key === 'pagina-1' && L[39].key === 'pagina-40');

  /* Bandera apagada. */
  var M = makeEnv('admin', MENUS);
  M.FEAT.page = 0;
  ok('con FEAT.page=0 no hay páginas', M.menuPages().length === 0);
  M.FEAT.page = 1;
  ok('al volver a encender la bandera vuelven las páginas', M.menuPages().length === 13);
})();

/* ─────────── 2. El cuerpo de la pregunta ─────────── */
(function () {
  var M = makeEnv('admin', MENUS);
  var b = M.askBody('resumen waiver');
  ok('el cuerpo lleva la pregunta, la página y el día de siempre',
    b.q === 'resumen waiver' && b.page === 'entradas.html' && /^\d{4}-\d{2}-\d{2}$/.test(b.today), JSON.stringify(b.page));
  ok('el cuerpo lleva la lista de páginas', Array.isArray(b.pages) && b.pages.length === 13);
  ok('cada página va solo con clave y nombre',
    b.pages.every(function (p) { return Object.keys(p).sort().join(',') === 'key,label'; }));
  ok('la lista incluye control-waiver con su nombre',
    b.pages.some(function (p) { return p.key === 'control-waiver' && p.label === 'Control Waiver'; }));
  ok('el cuerpo no manda la url de ninguna página',
    JSON.stringify(b.pages).indexOf('.html') < 0);
  ok('la pregunta del usuario no se copia dentro de la lista de páginas',
    JSON.stringify(b.pages).indexOf('resumen waiver') < 0);

  var largo = { admin: [{ label: 'Nombre larguísimo de una página del menú que se pasa del tope', url: 'reuniones.html' }] };
  var b2 = makeEnv('admin', largo).askBody('x');
  ok('el nombre se recorta a 40 caracteres', b2.pages[0].label.length === 40, String(b2.pages[0].label.length));

  M.FEAT.page = 0;
  var b3 = M.askBody('resumen waiver');
  ok('con FEAT.page=0 el cuerpo no lleva pages', !('pages' in b3));
  ok('con FEAT.page=0 el resto del cuerpo no cambia',
    b3.q === 'resumen waiver' && b3.page === 'entradas.html' && !!b3.today);
  M.FEAT.page = 1;

  ok('sin NAV_MENUS el cuerpo no lleva pages', !('pages' in makeEnv('admin', null).askBody('x')));
  ok('un rol sin menú tampoco manda pages', !('pages' in makeEnv('cleaner', MENUS).askBody('x')));
  var bs = makeEnv('staff', MENUS).askBody('resumen waiver');
  ok('staff manda su lista, sin control-waiver',
    bs.pages.length === 7 && !bs.pages.some(function (p) { return p.key === 'control-waiver'; }));
})();

/* ─────────── 3. La respuesta: un botón que abre la página ─────────── */
(function () {
  var M = makeEnv('admin', MENUS);
  var r = M.doPage({ key: 'control-waiver' }, []);
  var lk = links(M), nt = notes(M);
  ok('doPage dice que ha pintado', r === true);
  ok('un solo botón', lk.length === 1, String(lk.length));
  ok('el botón dice "Abrir Control Waiver"', lk.length === 1 && lk[0].txt === 'Abrir Control Waiver', lk.length ? lk[0].txt : '-');
  ok('el botón abre control-waiver.html', lk.length === 1 && lk[0].href === 'control-waiver.html', lk.length ? lk[0].href : '-');
  ok('el enlace es relativo, como el del menú', lk.length === 1 && lk[0].href.indexOf('://') < 0);
  ok('la línea nombra la página', nt.join(' | ').indexOf('Esta página del menú: Control Waiver') >= 0, nt.join(' | '));
  ok('no hay chips', all(M.body, 'mia-chip').length === 0);
  ok('el aviso de fallo comparte ese enlace', M.getST().shareHref === 'control-waiver.html', M.getST().shareHref);
  ok('el aviso de fallo va sin chips', M.getST().shareChips.length === 0);
  ok('el pie de "Mia solo lee" sigue estando',
    all(M.body, 'mia-foot').some(function (f) { return f.textContent === M.T.onlyRead; }));

  var M2 = makeEnv('admin', MENUS);
  ok('la clave en mayúsculas también encuentra la página',
    M2.doPage({ key: 'Control-Waiver' }, []) === true);
  ok('otra página del menú: reuniones',
    (function () { var m = makeEnv('admin', MENUS); m.doPage({ key: 'reuniones' }, []); var l = links(m); return l.length === 1 && l[0].txt === 'Abrir Reuniones' && l[0].href === 'reuniones.html'; })());

  /* Lo que no está en el menú de esta persona no se pinta. */
  var M3 = makeEnv('admin', MENUS);
  ok('una clave que no está en el menú no pinta nada', M3.doPage({ key: 'inventada' }, []) === false);
  ok('y no deja ningún botón', links(M3).length === 0);
  ok('una página de prueba tampoco', makeEnv('admin', MENUS).doPage({ key: 'XXtest1XX' }, []) === false);
  ok('login tampoco', makeEnv('admin', MENUS).doPage({ key: 'login' }, []) === false);
  ok('sin clave no se pinta', makeEnv('admin', MENUS).doPage({}, []) === false);
  ok('sin objeto no se pinta', makeEnv('admin', MENUS).doPage(null, []) === false);
  ok('staff no puede abrir control-waiver', makeEnv('staff', MENUS).doPage({ key: 'control-waiver' }, []) === false);
  ok('sales sí puede abrir control-waiver', makeEnv('sales', MENUS).doPage({ key: 'control-waiver' }, []) === true);

  var M4 = makeEnv('admin', MENUS);
  M4.FEAT.page = 0;
  ok('con FEAT.page=0 no se abre ninguna página', M4.doPage({ key: 'control-waiver' }, []) === false);
})();

/* ─────────── 4. De la pregunta a la pantalla, con el Worker de mentira ─────────── */
function stubFetch(reply) {
  globalThis.fetch = function (url, opt) {
    stubFetch.last = { url: url, body: JSON.parse(opt.body) };
    return Promise.resolve({ ok: true, status: 200, json: function () { return Promise.resolve(reply); } });
  };
}
(function () { return (async function () {
  var real = globalThis.fetch;

  var M = makeEnv('admin', MENUS);
  M.setInput({ value: 'resumen waiver' });
  stubFetch({ target: 'page', page: { key: 'control-waiver' } });
  await M.onAsk();
  var enviado = stubFetch.last.body;
  ok('el cuerpo que sale por fetch lleva pages', Array.isArray(enviado.pages) && enviado.pages.length === 13);
  ok('el cuerpo que sale por fetch lleva la pregunta y la página', enviado.q === 'resumen waiver' && enviado.page === 'entradas.html');
  var lk = links(M);
  ok('la respuesta target:page pinta el botón de la página',
    lk.length === 1 && lk[0].txt === 'Abrir Control Waiver' && lk[0].href === 'control-waiver.html',
    JSON.stringify(lk));

  var M2 = makeEnv('admin', MENUS);
  M2.setInput({ value: 'algo raro' });
  stubFetch({ target: 'page', page: { key: 'pagina-que-no-existe' } });
  await M2.onAsk();
  ok('una clave fuera del menú acaba en "No he entendido"',
    notes(M2).join(' | ').indexOf(M2.T.unknown) >= 0, notes(M2).join(' | '));
  ok('y sin ningún botón', links(M2).length === 0);

  var M3 = makeEnv('admin', MENUS);
  M3.FEAT.page = 0;
  M3.setInput({ value: 'resumen waiver' });
  stubFetch({ target: 'page', page: { key: 'control-waiver' } });
  await M3.onAsk();
  ok('con FEAT.page=0 el cuerpo sale sin pages', !('pages' in stubFetch.last.body));
  ok('con FEAT.page=0 target:page es "No he entendido"',
    notes(M3).join(' | ').indexOf(M3.T.unknown) >= 0 && links(M3).length === 0);

  /* Regresión: los caminos de siempre siguen igual. */
  var M4 = makeEnv('admin', MENUS);
  M4.setInput({ value: 'ocupación de septiembre' });
  stubFetch({ target: 'availability', availability: { from: '2026-09-01', to: '2026-09-30' } });
  await M4.onAsk();
  ok('la ocupación sigue abriendo su página de siempre',
    links(M4).some(function (a) { return a.href === 'listado-ocupacion.html'; }), JSON.stringify(links(M4)));
  var M5 = makeEnv('admin', MENUS);
  M5.setInput({ value: 'no entiendo nada' });
  stubFetch({ target: 'unknown' });
  await M5.onAsk();
  ok('unknown sigue diciendo "No he entendido"', notes(M5).join(' | ').indexOf(M5.T.unknown) >= 0);

  globalThis.fetch = real;
  console.log('');
  console.log('PASS ' + pass + '  FAIL ' + fail);
  process.exit(fail ? 1 : 0);
})(); })();
