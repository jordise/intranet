/* Pruebas de task-cierre.html v14/v15: cuando se guarda con la incidencia encendida y hay fotos,
   la pagina escribe DOS veces: primero solo las fotos, despues todo con Incidencias=true.
   node cierre-fotos-dos-pasos.test.js

   Problema que cubren: el disparador de Caspio que avisa a Reservas lee las fotos de la fila
   de ANTES de guardar y el texto de la fila nueva; con una sola escritura el correo salia con
   los marcos de foto vacios (Marta, 28/09/2026). Como limpieza-lock.test.js: NO copia el codigo
   de la pagina. Extrae guardar() del HTML y la ejecuta con muñecos, sin DOM ni red. */
var fs = require('fs');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

var FILE = 'task-cierre.html';
var src = fs.readFileSync(FILE, 'utf8');

function fnSource(name) {
  var i = src.indexOf('async function ' + name + '(');
  if (i < 0) i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = src.indexOf('{', i), depth = 0, k = j;
  for (; k < src.length; k++) { if (src[k] === '{') depth++; else if (src[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return src.slice(i, k);
}

/* ── Version ── */
console.log('== version ==');
var vTop = (src.match(/VERSIÓN ACTUAL:\s*v(\d+)/) || [])[1], vTitle = (src.match(/<title>Tarea Cierre v(\d+)/) || [])[1];
ok('version igual en comentario y titulo (' + vTop + ')', vTop && vTop === vTitle, vTop + '/' + vTitle);
ok('version >= 15', parseInt(vTop, 10) >= 15);
ok('el historial explica la v14 y la v15', /HISTORIAL: v15 - Revision/.test(src) && /v14 - Fotos en el correo de incidencia/.test(src));

/* ── Muñecos ── */
function escenario(o) {
  var llamadas = [];
  var els = {
    btnSave: { disabled: false, style: {} }, saveLabel: { textContent: '' }, saveSpinner: { style: {} }, btnTodoOk: { disabled: false },
    txtIncidencia: { value: o.incidencia || '' }, txtNotas: { value: 'notas' },
    swVentanas: { checked: true }, swAires: { checked: true }, swBasura: { checked: true }, swDone: { checked: !!o.done },
    photoPreview: { style: { display: o.mainUrl ? 'block' : 'none' }, src: o.mainUrl || '' },
    doneHint: { textContent: '', style: {} }
  };
  [1, 2, 3, 4, 5].forEach(function (i) { els['aiPreview' + i] = { style: { display: (o.after && o.after[i]) ? 'block' : 'none' }, src: (o.after && o.after[i]) || '' }; });
  var photos = { main: { file: null }, ai1: {}, ai2: {}, ai3: {}, ai4: {}, ai5: {} };
  (o.fresh || []).forEach(function (slot) { photos[slot] = { file: 'file:' + slot, base64: 'data:' + slot }; });
  var avisos = [], abortos = 0;
  var fila = o.sinTaskid ? { Tarea_terminada: !!o.done } : { Tarea_terminada: !!o.done, taskid: 9876 };
  var creada = !!o.exists;   /* la base de datos de mentira: la fila existe, o se crea con el primer POST */
  var fetchWithTimeout = function (url, opts, ms, label) {
    var body = opts && opts.body ? JSON.parse(opts.body) : null;
    var metodo = (opts && opts.method) || 'GET';
    llamadas.push({ url: url, metodo: metodo, body: body, label: label });
    if (o.falla && o.falla(llamadas.length, metodo, body)) {
      return Promise.resolve({ ok: false, status: 500, text: function () { return Promise.resolve('caido'); } });
    }
    if (metodo === 'GET') return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ Result: creada ? [fila] : [] }); } });
    if (metodo === 'POST') creada = true;
    return Promise.resolve({ ok: true, text: function () { return Promise.resolve(''); } });
  };
  var ctx = {
    doneLocked: false, incOpen: !!o.incidenciaOn, incInicial: !!o.incInicial, idReserva: '55990582', taskType: '30', cfg: { badge: 'Cierre' },
    taskRecordId: (o.exists && !o.sinIdDeVista) ? 9876 : undefined, photos: photos, WORKER: 'https://api.test/intranet/api',
    Auth: { url: function (u) { return u; } },
    g: function (id) { return els[id] || null; }, gv: function (id) { return (els[id] || {}).value || ''; },
    sw: function (id) { return !!(els[id] || {}).checked; }, $sw: function () {}, onSwDoneChange: function () {}, saveState: function () {},
    clearState: function () {}, fotoPresente: function () { return true; }, fotoError: function () {}, abortarPorFotoFallida: function () { abortos++; avisos.push({ msg: 'Foto no subida. No se ha guardado nada', tipo: 'error' }); },
    uploadPhoto: function (file, idRes, tType, suffix, slot) { return Promise.resolve((o.uploads || {})[slot] || ''); }, fetchWithTimeout: fetchWithTimeout,
    esVerdadero: function (v) { return v === true || v === 1 || v === -1 || ['yes', 'sí', 'true', '1'].indexOf(String(v).toLowerCase()) >= 0; },
    toast: function (m, t) { avisos.push({ msg: m, tipo: t }); }, setTimeout: function () {}, window: {}, history: { back: function () {} },
    console: { warn: function () {}, error: function () {} }, document: { getElementById: function (id) { return els[id] || null; } }
  };
  var nombres = Object.keys(ctx);
  var body = fnSource('guardar') + '\nreturn guardar;';
  var guardar = new Function(nombres.join(','), body).apply(null, nombres.map(function (n) { return ctx[n]; }));
  return { correr: function () { return guardar(false); }, llamadas: llamadas, avisos: avisos, els: els, abortos: function () { return abortos; } };
}
var MAIN = 'https://www.3villas.com/intranet/fotos/cierre/2026_cierre_55990582_1.jpg?v=1';
var AFTER1 = 'https://www.3villas.com/intranet/fotos/cierre/2026_cierre_55990582_after1.jpg?v=2';
var FOTOS = ['Picture_cloudfare1', 'Picture_cloudfare_after1', 'Picture_cloudfare_after2', 'Picture_cloudfare_after3', 'Picture_cloudfare_after4', 'Picture_cloudfare_after5'];
function soloFotos(b) { return Object.keys(b).every(function (k) { return FOTOS.indexOf(k) >= 0; }); }
function escrituras(e) { return e.llamadas.filter(function (l) { return l.metodo !== 'GET'; }); }

(async function () {
  /* 1. tarea existente, incidencia encendida, con fotos: fotos primero, luego todo */
  console.log('\n== tarea existente + incidencia + fotos ==');
  var e = escenario({ exists: true, incidenciaOn: true, incidencia: 'Cristal roto', mainUrl: MAIN, after: { 1: AFTER1 }, done: true });
  await e.correr();
  var w = escrituras(e);
  ok('dos escrituras', w.length === 2, w.length);
  ok('las dos van a la misma fila (action=update&id=9876)', w.every(function (l) { return /action=update&table=TaTasks&id=9876/.test(l.url) && l.metodo === 'PUT'; }), JSON.stringify(w.map(function (l) { return l.url; })));
  ok('la primera lleva SOLO fotos', w[0] && soloFotos(w[0].body), JSON.stringify(w[0] && w[0].body));
  ok('  ...las dos fotos de la pantalla', w[0] && w[0].body.Picture_cloudfare1 === MAIN && w[0].body.Picture_cloudfare_after1 === AFTER1);
  ok('  ...y no lleva la marca de incidencia ni el texto', w[0] && !('Incidencias' in w[0].body) && !('Taskdescription' in w[0].body));
  ok('la segunda lleva todo con Incidencias=true', w[1] && w[1].body.Incidencias === true && w[1].body.Taskdescription === 'Cristal roto' && w[1].body.Tarea_terminada === true);
  ok('  ...y repite las fotos', w[1] && w[1].body.Picture_cloudfare1 === MAIN && w[1].body.Picture_cloudfare_after1 === AFTER1);
  ok('la lectura posterior sigue existiendo (GET al final)', e.llamadas[e.llamadas.length - 1].metodo === 'GET');
  ok('termina en "✓ Guardado correctamente"', e.avisos.some(function (a) { return a.msg === '✓ Guardado correctamente'; }), JSON.stringify(e.avisos));

  /* 2. tarea existente, SIN incidencia: una sola escritura, como siempre */
  console.log('\n== tarea existente sin incidencia ==');
  e = escenario({ exists: true, incidenciaOn: false, mainUrl: MAIN, done: true });
  await e.correr();
  w = escrituras(e);
  ok('una sola escritura', w.length === 1, w.length);
  ok('  ...con todo, Incidencias=false', w[0] && w[0].body.Incidencias === false && w[0].body.Picture_cloudfare1 === MAIN);

  /* 3. incidencia encendida pero sin ninguna foto: una sola escritura */
  console.log('\n== incidencia sin fotos ==');
  e = escenario({ exists: true, incidenciaOn: true, incidencia: 'Sin foto', done: false });
  await e.correr();
  w = escrituras(e);
  ok('una sola escritura (no hay fotos que adelantar)', w.length === 1 && w[0].body.Incidencias === true, w.length);

  /* 4. tarea NUEVA con incidencia (v15): un solo POST con todo, como en la v13 */
  console.log('\n== tarea nueva + incidencia ==');
  e = escenario({ exists: false, incidenciaOn: true, incidencia: 'Puerta', mainUrl: MAIN, done: true });
  await e.correr();
  w = escrituras(e);
  ok('una sola escritura, un POST', w.length === 1 && w[0].metodo === 'POST' && /method=POST/.test(w[0].url), w.length);
  ok('  ...con la marca de incidencia, el texto y la foto', w[0] && w[0].body.Incidencias === true && w[0].body.Taskdescription === 'Puerta' && w[0].body.Picture_cloudfare1 === MAIN, JSON.stringify(w[0] && w[0].body));

  /* 4b. la incidencia ya estaba abierta al cargar (v15): el aviso ya salio, una sola escritura */
  console.log('\n== incidencia ya abierta al cargar ==');
  e = escenario({ exists: true, incidenciaOn: true, incInicial: true, incidencia: 'Mas fotos', mainUrl: MAIN, after: { 1: AFTER1 }, done: true });
  await e.correr();
  w = escrituras(e);
  ok('una sola escritura con todo', w.length === 1 && w[0].body.Incidencias === true && w[0].body.Picture_cloudfare_after1 === AFTER1, w.length);

  /* 4c. fotos de incidencia recien subidas (ai2..ai5): la primera escritura las lleva todas */
  console.log('\n== fotos nuevas en los cinco huecos ==');
  var U = function (i) { return 'https://www.3villas.com/intranet/fotos/cierre/2026_cierre_55990582_after' + i + '.jpg?v=9'; };
  e = escenario({ exists: true, incidenciaOn: true, incidencia: 'Cinco', mainUrl: MAIN, done: true, fresh: ['ai1', 'ai2', 'ai3', 'ai4', 'ai5'], uploads: { ai1: U(1), ai2: U(2), ai3: U(3), ai4: U(4), ai5: U(5) } });
  await e.correr();
  w = escrituras(e);
  ok('dos escrituras', w.length === 2, w.length);
  ok('la primera lleva las cinco fotos de incidencia recien subidas y la principal', w[0] && soloFotos(w[0].body) && [1, 2, 3, 4, 5].every(function (i) { return w[0].body['Picture_cloudfare_after' + i] === U(i); }) && w[0].body.Picture_cloudfare1 === MAIN, JSON.stringify(w[0] && w[0].body));

  /* 4d. la vista no dio el id pero la fila existe y la comprobacion no trae taskid: PUT por WHERE */
  console.log('\n== fila existente sin id conocido ==');
  e = escenario({ exists: true, sinIdDeVista: true, sinTaskid: true, incidenciaOn: true, incidencia: 'Sin id', mainUrl: MAIN, done: true });
  await e.correr();
  w = escrituras(e);
  ok('primero se comprueba la fila (GET) y luego dos PUT por WHERE', e.llamadas[0].metodo === 'GET' && /action=data&table=TaTasks/.test(e.llamadas[0].url) && w.length === 2 && w.every(function (l) { return l.metodo === 'PUT' && /action=save&table=TaTasks&where=.*&method=PUT/.test(l.url); }), JSON.stringify(e.llamadas.map(function (l) { return l.metodo + ' ' + l.url; })));
  ok('  ...y el WHERE lleva la reserva y el tipo', w[0] && /Idreserva%3D'55990582'%20AND%20Tasktype_booking%3D30/.test(w[0].url), w[0] && w[0].url);

  /* 4e. una foto de incidencia no sube con la incidencia abierta (v15): no se guarda nada */
  console.log('\n== foto de incidencia que no sube ==');
  e = escenario({ exists: true, incidenciaOn: true, incidencia: 'Falla', mainUrl: MAIN, done: true, fresh: ['ai1', 'ai2'], uploads: { ai1: U(1) } });
  await e.correr();
  w = escrituras(e);
  ok('ninguna escritura', w.length === 0, w.length);
  ok('se aborta con el aviso de foto no subida', e.abortos() === 1 && e.avisos.some(function (a) { return /No se ha guardado nada/.test(a.msg); }), JSON.stringify(e.avisos));
  ok('el boton vuelve a estar activo', e.els.btnSave.disabled === false && e.els.saveLabel.textContent === '💾 Guardar');
  /* ...y con la incidencia cerrada la regla de la v13 se mantiene: avisa y guarda */
  e = escenario({ exists: true, incidenciaOn: false, mainUrl: MAIN, done: true, fresh: ['ai1'], uploads: {} });
  await e.correr();
  w = escrituras(e);
  ok('con la incidencia cerrada, una foto que no sube solo avisa y se guarda igual', w.length === 1 && e.abortos() === 0 && e.avisos.some(function (a) { return /no se pudieron subir/.test(a.msg); }), JSON.stringify(e.avisos));

  /* 5. tarea nueva sin incidencia: un POST, como siempre */
  console.log('\n== tarea nueva sin incidencia ==');
  e = escenario({ exists: false, incidenciaOn: false, mainUrl: MAIN, done: true });
  await e.correr();
  w = escrituras(e);
  ok('un solo POST', w.length === 1 && w[0].metodo === 'POST', w.length);

  /* 6. si la escritura de las fotos falla, no se hace la segunda y se avisa */
  console.log('\n== la primera escritura falla ==');
  e = escenario({ exists: true, incidenciaOn: true, incidencia: 'X', mainUrl: MAIN, done: true, falla: function (n, metodo, body) { return metodo === 'PUT' && soloFotos(body); } });
  await e.correr();
  w = escrituras(e);
  ok('solo se intento la escritura de fotos', w.length === 1 && soloFotos(w[0].body), w.length);
  ok('se avisa del error', e.avisos.some(function (a) { return a.tipo === 'error' && /HTTP 500/.test(a.msg); }), JSON.stringify(e.avisos));
  ok('el boton vuelve a estar activo', e.els.btnSave.disabled === false && e.els.saveLabel.textContent === '💾 Guardar');

  /* 7. si la segunda escritura falla, se avisa (la fila ya tiene las fotos; repetir es seguro) */
  console.log('\n== la segunda escritura falla ==');
  e = escenario({ exists: true, incidenciaOn: true, incidencia: 'X', mainUrl: MAIN, done: true, falla: function (n, metodo, body) { return metodo === 'PUT' && !soloFotos(body); } });
  await e.correr();
  w = escrituras(e);
  ok('se hicieron las dos escrituras', w.length === 2, w.length);
  ok('se avisa del error y no se declara guardado', e.avisos.some(function (a) { return a.tipo === 'error'; }) && !e.avisos.some(function (a) { return /Guardado correctamente/.test(a.msg); }), JSON.stringify(e.avisos));

  console.log('\n' + pass + ' pass, ' + fail + ' fail');
  if (fail) process.exit(1);
})();
