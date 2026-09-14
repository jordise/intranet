/* Pruebas de la respuesta de guardias e intervenciones (viaje 9 de Mia).
   Caso: Nazaret, grupo TIC 14/09/2026 — ver las guardias de una persona y un
   mes con enlace a cada registro, y "qué tengo pendiente".
   node mia-j9.test.js

   Como mia-j5.test.js: NO copia el código del módulo. Carga mia-intranet.js
   entero con un DOM mínimo y le cambia solo proxyGet por filas de mentira.
   Nada sale a la red y ninguna fila lleva datos reales. */
var fs = require('fs');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

function El(tag) {
  this.tagName = tag; this.children = []; this.attrs = {}; this._t = ''; this.className = '';
  var set = {};
  this.classList = { add: function (c) { set[c] = 1; }, remove: function (c) { delete set[c]; }, contains: function (c) { return !!set[c]; }, toggle: function (c, v) { if (v) set[c] = 1; else delete set[c]; } };
}
El.prototype.appendChild = function (c) { this.children.push(c); return c; };
El.prototype.setAttribute = function (k, v) { this.attrs[k] = v; };
El.prototype.getAttribute = function (k) { return this.attrs[k]; };
El.prototype.addEventListener = function () {};
El.prototype.removeChild = function (c) { var i = this.children.indexOf(c); if (i >= 0) this.children.splice(i, 1); };
Object.defineProperty(El.prototype, 'textContent', {
  get: function () { return this._t + this.children.map(function (c) { return c.textContent; }).join(''); },
  set: function (v) { this.children = []; this._t = String(v); }
});
Object.defineProperty(El.prototype, 'innerHTML', { get: function () { return ''; }, set: function () { this.children = [new El('svg')]; } });
Object.defineProperty(El.prototype, 'firstChild', { get: function () { return this.children[0] || null; } });

function makeEnv(page, auth) {
  var doc = {
    readyState: 'complete', body: new El('body'), head: new El('head'), documentElement: new El('html'),
    createElement: function (t) { return new El(t); },
    createTextNode: function (t) { var n = new El('#text'); n.textContent = t; return n; },
    getElementById: function () { return null; }, querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    addEventListener: function () {}, removeEventListener: function () {}
  };
  var store = { getItem: function () { return null; }, setItem: function () {}, removeItem: function () {} };
  var src = fs.readFileSync('mia-intranet.js', 'utf8');
  var mark = '\n})();';
  var i = src.lastIndexOf(mark);
  if (i < 0) throw new Error('no encuentro el cierre del modulo');
  var hook = '\nglobalThis.__MIA_TEST={guardias:doTasksGuardias,tasks:doTasks,FEAT:FEAT,T:T,PAGES:PAGES,'
    + 'setProxy:function(fn){proxyGet=fn;},setPanel:function(p,b){PANEL=p;BODY=b;},ph:function(){return (FEAT.guard&&GUARD_PAGES.indexOf(curPage())>=0)?T.phGuard:T.ph;}};';
  var code = src.slice(0, i) + hook + src.slice(i);
  var run = new Function('window', 'document', 'location', 'localStorage', 'sessionStorage', 'Auth', code);
  run({}, doc, { pathname: '/intranet/' + page }, store, store, auth);
  var M = globalThis.__MIA_TEST;
  var panel = new El('div'), body = new El('div');
  M.setPanel(panel, body); M.body = body;
  return M;
}
function all(node, cls, out) {
  out = out || [];
  (node.children || []).forEach(function (c) { if (String(c.className || '').split(' ').indexOf(cls) >= 0) out.push(c); all(c, cls, out); });
  return out;
}
function notes(M) { return all(M.body, 'mia-note').map(function (n) { return n.textContent; }); }
function hasNote(M, txt) { return notes(M).some(function (n) { return n.indexOf(txt) >= 0; }); }
function rows(M) { return all(M.body, 'mia-inc'); }
function hrefs(node) { var out = []; (function w(n) { if (n.attrs && n.attrs.href) out.push(n.attrs.href); (n.children || []).forEach(w); })(node); return out; }
function chips(M) { return all(M.body, 'mchip').map(function (c) { return c.textContent; }); }

/* Filas de mentira: nombres inventados. */
var USERS = [{ UserID: 'AB12CD34', Name: 'Nazaret P.', Email: 'Naz.Prueba@example.com' }, { UserID: 'ZX98YW76', Name: 'Kike P.', Email: 'kike.prueba@example.com' }];
var VILLAS = [{ villaid: 7, Name_villa_para_inquilinos: 'Casa Prueba', Name: 'Casa Prueba' }];
var TIPOS = [{ Intervencion_guardia_tipo_ID: 'corte', Nombre: 'Corte de electricidad' }, { Intervencion_guardia_tipo_ID: 'guardia sin intervencion', Nombre: 'Guardia sin intervención' }];
function task(over) {
  return Object.assign({ taskid: 1, villaid: 7, Intervencion_guardia_tipo_ID: 'corte', Tarea_terminada: false, Intervencion_guardia: true,
    Data_to_be_done_fixed: '2026-08-24T00:00:00', UserID_responsible_alfanum: 'AB12CD34', Taskdescription: 'corte electrico',
    Intervencion_guardia_hora_inicio: '1899-12-30T12:50:00', Intervencion_guardia_hora_fin: '1899-12-30T14:50:00', Idreserva: '55601223' }, over || {});
}
/* El token real lleva email, nombre y rol; NO lleva UserID (caspio-proxy claims). */
var AUTH_NAZ = { token: function () { return 't'; }, role: function () { return 'manager'; }, url: function (u) { return u; }, name: function () { return 'Nazaret' ; },
  email: function () { return 'naz.prueba@example.com'; } };

var M = makeEnv('listado-guardias-e-intervenciones.html', AUTH_NAZ);
var CALLS = [];
function withTasks(list) {
  M.setProxy(function (qs) {
    CALLS.push(qs);
    if (qs.indexOf('table=TaUsers') >= 0) return Promise.resolve(USERS);
    if (qs.indexOf('table=TaVillas') >= 0) return Promise.resolve(VILLAS);
    if (qs.indexOf('table=Ta_tipo_intervencion_guardia') >= 0) return Promise.resolve(TIPOS);
    if (qs.indexOf('table=TaTasks') >= 0) return Promise.resolve(list);
    return Promise.reject(new Error('consulta inesperada ' + qs));
  });
}
function lastWhere() {
  var q = CALLS.filter(function (c) { return c.indexOf('table=TaTasks') >= 0; }).pop() || '';
  var m = q.match(/where=([^&]*)/); return m ? decodeURIComponent(m[1]) : '';
}

(async function () {
  console.log('\n== la casilla en las páginas de guardias ==');
  ok('la ayuda nombra las preguntas de guardias', M.ph() === M.T.phGuard && /mis intervenciones pendientes/.test(M.T.phGuard));
  ok('la página de guardias está en la lista blanca de enlaces', M.PAGES.guardias === 'guardias-e-intervenciones.html');

  console.log('\n== guardias de Kike en agosto ==');
  withTasks([task({ taskid: 11, UserID_responsible_alfanum: 'ZX98YW76', Tarea_terminada: true }), task({ taskid: 12, UserID_responsible_alfanum: 'ZX98YW76', Intervencion_guardia_tipo_ID: 'guardia sin intervencion', Data_to_be_done_fixed: '2026-08-30T00:00:00' })]);
  await M.guardias({ guardia: true, user: 'Kike', from: '2026-08-01', to: '2026-08-31' }, [], null, [], undefined);
  var w = lastWhere();
  ok('la consulta filtra por tipo de guardia relleno', w.indexOf("Intervencion_guardia_tipo_ID IS NOT NULL") >= 0 && w.indexOf("Intervencion_guardia_tipo_ID<>''") >= 0);
  ok('la consulta filtra por responsable U2 y las dos fechas', w.indexOf("UserID_responsible_alfanum='ZX98YW76'") >= 0 && w.indexOf("Data_to_be_done_fixed>='2026-08-01T00:00:00'") >= 0 && w.indexOf("<='2026-08-31T23:59:59'") >= 0, w);
  ok('dos filas', rows(M).length === 2);
  var r0 = rows(M)[1];
  ok('ninguna pendiente: orden por fecha descendente (guardia del 30 antes que la intervención del 24)', /Guardia sin intervención/.test(rows(M)[0].textContent) && /30\/08\/2026/.test(rows(M)[0].textContent) && /Corte de electricidad/.test(r0.textContent), rows(M).map(function (r) { return r.textContent; }).join(' || '));
  ok('la guardia no lleva horas ni estado', !/·/.test(rows(M)[0].textContent.split('Guardia')[0]) && !/Pendiente|Terminada/.test(rows(M)[0].textContent));
  ok('la fila lleva villa, fecha y horas', /Casa Prueba/.test(r0.textContent) && /24\/08\/2026 · 12:50–14:50/.test(r0.textContent), r0.textContent);
  ok('la fila lleva Responsable: Kike P. y Terminada', /Responsable: Kike P\./.test(r0.textContent) && /Terminada/.test(r0.textContent));
  ok('la fila lleva el número de registro tras la villa', /Casa Prueba #11/.test(r0.textContent), r0.textContent);
  ok('la fila lleva la reserva', /Reserva 55601223/.test(r0.textContent));
  ok('botón Abrir registro con ?editar=11', hrefs(r0).indexOf('guardias-e-intervenciones.html?editar=11') >= 0, hrefs(r0).join());
  var pageHrefs = hrefs(M.body).filter(function (h) { return h.indexOf('?editar=') < 0; });
  ok('botón Abrir en Guardias con desde, hasta y vm', pageHrefs.some(function (h) { return h === 'guardias-e-intervenciones.html?desde=2026-08-01&hasta=2026-08-31&vm=ZX98YW76'; }), pageHrefs.join());
  ok('la cabecera explica Pendiente sin nombrar el interruptor', hasNote(M, 'Pendiente: la intervención aún no está marcada como Terminada'));
  ok('chips Guardias, Desde, Hasta, Responsable: Kike', chips(M).join(' | ').indexOf('Guardias') >= 0 && chips(M).join(' | ').indexOf('Responsable: Kike') >= 0, chips(M).join(' | '));
  ok('sin nota de ventana automática cuando la pregunta trae fechas', !hasNote(M, 'últimos 30 días'));

  console.log('\n== qué tengo pendiente (usuario yo) ==');
  CALLS = [];
  withTasks([task({ taskid: 21 }), task({ taskid: 22, Tarea_terminada: true }), task({ taskid: 23, Intervencion_guardia_tipo_ID: 'guardia sin intervencion' })]);
  await M.guardias({ guardia: true, user: 'yo', status: 'pendiente' }, [], null, [], undefined);
  w = lastWhere();
  ok('"yo" = el email del token contra TaUsers (AB12CD34), responsable O asignado', w.indexOf("(UserID_responsible_alfanum='AB12CD34' OR UserID_asigned_alfanum='AB12CD34')") >= 0, w);
  ok('pendientes sin fechas: la consulta no lleva fechas', w.indexOf('Data_to_be_done_fixed>=') < 0);
  ok('nota: todas las pendientes de cualquier fecha', hasNote(M, 'todas las pendientes'));
  ok('solo la intervención pendiente (ni la terminada ni la guardia)', rows(M).length === 1 && /Pendiente/.test(rows(M)[0].textContent) && hrefs(rows(M)[0]).indexOf('guardias-e-intervenciones.html?editar=21') >= 0);
  ok('chips Responsable: yo y Estado: Pendiente', chips(M).join(' | ').indexOf('Responsable: yo') >= 0 && chips(M).join(' | ').indexOf('Estado: Pendiente') >= 0, chips(M).join(' | '));
  ok('nota sobre las de seguimiento', hasNote(M, 'filtro «Villa Manager asignado» = Yo'));
  ok('Abrir en Guardias lleva estado=pend y vm=AB12CD34', hrefs(M.body).some(function (h) { return h === 'guardias-e-intervenciones.html?vm=AB12CD34&estado=pend'; }), hrefs(M.body).join());

  console.log('\n== sin fechas ni estado: últimos 30 días ==');
  CALLS = [];
  withTasks([task()]);
  await M.guardias({ guardia: true }, [], null, [], undefined);
  w = lastWhere();
  ok('la consulta lleva dos fechas', /Data_to_be_done_fixed>='\d{4}-\d{2}-\d{2}T00:00:00'/.test(w) && /Data_to_be_done_fixed<='\d{4}-\d{2}-\d{2}T23:59:59'/.test(w), w);
  ok('nota: son los últimos 30 días', hasNote(M, 'últimos 30 días'));

  console.log('\n== el registro con la marca válida quitada ==');
  withTasks([task({ taskid: 31 }), task({ taskid: 32, Intervencion_guardia: false })]);
  await M.guardias({ guardia: true, from: '2026-08-01', to: '2026-08-31' }, [], null, [], undefined);
  ok('se enseñan las dos filas, la no válida la última y en gris', rows(M).length === 2 && /mia-inc-off/.test(rows(M)[1].className) && !/mia-inc-off/.test(rows(M)[0].className));
  ok('la fila no válida lleva la etiqueta No válida y su enlace', /No válida/.test(rows(M)[1].textContent) && hrefs(rows(M)[1]).indexOf('guardias-e-intervenciones.html?editar=32') >= 0);
  ok('la nota dice la marca, el efecto y quién la enciende', hasNote(M, 'Hay 1 registro con la marca «Intervención/Guardia válida» apagada') && hasNote(M, 'Un admin o manager puede encenderla'), notes(M).join(' | '));
  withTasks([task({ taskid: 33, Intervencion_guardia: false }), task({ taskid: 34, Intervencion_guardia: 0 })]);
  await M.guardias({ guardia: true, from: '2026-08-01', to: '2026-08-31' }, [], null, [], undefined);
  ok('dos no válidas: plural', hasNote(M, 'Hay 2 registros con la marca'));

  console.log('\n== "yo" sin fila en TaUsers: no se consulta sin filtro ==');
  var M2 = makeEnv('tareas.html', { token: function () { return 't'; }, role: function () { return 'staff'; }, url: function (u) { return u; }, name: function () { return 'X'; }, email: function () { return 'nadie@example.com'; } });
  var CALLS2 = [];
  M2.setProxy(function (qs) { CALLS2.push(qs); if (qs.indexOf('TaUsers') >= 0) return Promise.resolve(USERS); if (qs.indexOf('TaVillas') >= 0) return Promise.resolve(VILLAS); if (qs.indexOf('Ta_tipo') >= 0) return Promise.resolve(TIPOS); return Promise.resolve([task()]); });
  await M2.guardias({ guardia: true, user: 'yo', status: 'pendiente' }, [], null, [], undefined);
  ok('ninguna consulta a TaTasks', !CALLS2.some(function (c) { return c.indexOf('table=TaTasks') >= 0; }), CALLS2.join(' | '));
  ok('nota: no he podido saber tu usuario', hasNote(M2, 'No he podido saber tu usuario'));
  ok('la ayuda en tareas.html es la de siempre', M2.ph() === M2.T.ph);

  console.log('\n== rol sales: tarjeta normal de Tareas, sin enlaces a Guardias ==');
  var M3 = makeEnv('entradas-equipo.html', { token: function () { return 't'; }, role: function () { return 'sales'; }, url: function (u) { return u; }, name: function () { return 'S'; }, email: function () { return 'kike.prueba@example.com'; } });
  var CALLS3 = [];
  M3.setProxy(function (qs) { CALLS3.push(qs); if (qs.indexOf('TaUsers') >= 0) return Promise.resolve(USERS); if (qs.indexOf('TaVillas') >= 0) return Promise.resolve(VILLAS); return Promise.resolve([]); });
  await M3.tasks({ guardia: true, user: 'Kike', from: '2026-08-01', to: '2026-08-31' }, [], undefined);
  ok('ningún enlace a guardias-e-intervenciones', !hrefs(M3.body).some(function (h) { return /guardias-e-intervenciones/.test(h); }), hrefs(M3.body).join());
  ok('el enlace es a Tareas y se dice que guardias no se aplicó', hrefs(M3.body).some(function (h) { return /^tareas\.html\?/.test(h); }) && M3.body.textContent.indexOf('guardias') >= 0);

  console.log('\n== usuario desconocido, villa, fallo de lectura ==');
  withTasks([task()]);
  await M.guardias({ guardia: true, user: 'Nadie', from: '2026-08-01', to: '2026-08-31' }, [], null, [], undefined);
  ok('usuario no encontrado va a "No pude aplicar"', M.body.textContent.indexOf('usuario: Nadie') >= 0);
  withTasks([task({ Taskdescription: '• corte electrico\n[x] luz repuesta', UserID_asigned_alfanum: 'ZX98YW76' })]);
  await M.guardias({ guardia: true, from: '2026-08-01', to: '2026-08-31' }, [], null, [], undefined);
  ok('descripción sin viñetas, unida con ·', /corte electrico · luz repuesta/.test(rows(M)[0].textContent) && rows(M)[0].textContent.indexOf('•') < 0, rows(M)[0].textContent);
  ok('Seguimiento: Kike P. en una pendiente con asignado distinto', /Seguimiento: Kike P\./.test(rows(M)[0].textContent));
  CALLS = [];
  withTasks([task()]);
  await M.guardias({ guardia: true, villa: 'Casa Prueba', villaId: '7', from: '2026-08-01', to: '2026-08-31' }, [], null, [], undefined);
  ok('la villa resuelta filtra por villaid=7 y el enlace lleva vid=7', lastWhere().indexOf('villaid=7') >= 0 && hrefs(M.body).some(function (h) { return /vid=7/.test(h); }));
  M.setProxy(function (qs) { if (qs.indexOf('table=TaTasks') >= 0) return Promise.reject(new Error('caído')); if (qs.indexOf('TaVillas') >= 0) return Promise.resolve(VILLAS); if (qs.indexOf('Ta_tipo') >= 0) return Promise.resolve(TIPOS); return Promise.resolve(USERS); });
  await M.guardias({ guardia: true, from: '2026-08-01', to: '2026-08-31' }, [], null, [], undefined);
  ok('fallo de lectura: "No he podido leer las guardias"', hasNote(M, 'No he podido leer las guardias'));

  console.log('\n== con FEAT.guard a 0 la rama no existe ==');
  M.FEAT.guard = 0;
  ok('la ayuda vuelve a ser la de siempre', M.ph() === M.T.ph);
  M.FEAT.guard = 1;

  console.log('\n' + pass + ' pass, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.log('ERROR', e && e.stack || e); process.exit(1); });
