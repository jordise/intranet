/* Pruebas: en editar-tarea.html solo un admin o un manager puede desmarcar una
   tarea de reserva que ya se cargo terminada (v65).
   node editar-tarea-lock.test.js

   Problema que cubren: el disparador de Caspio en TaTasks marca la tarea como
   terminada en cualquier actualizacion, asi que un desmarcado desde la intranet
   no se sostiene. La pagina bloquea el interruptor para los demas roles y el
   guardado envia Tarea_terminada en true aunque el control diga lo contrario.

   Como ecotasa-flags-dirty.test.js: NO copia el codigo de la pagina. Extrae el
   texto real del HTML y lo ejecuta con muñecos, sin DOM ni red, asi que si
   alguien edita la pagina estas pruebas corren el codigo NUEVO. */
var fs = require('fs');
var P = 'editar-tarea.html';
var SRC = fs.readFileSync(P, 'utf8');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

/* Un bloque que empieza por un marcador y acaba en su llave de cierre. */
function bloque(inicio) {
  var i = SRC.indexOf(inicio);
  if (i < 0) throw new Error('no encuentro ' + inicio + ' en ' + P);
  var j = SRC.indexOf('{', i), depth = 0, k = j;
  for (; k < SRC.length; k++) {
    if (SRC[k] === '{') depth++;
    else if (SRC[k] === '}') { depth--; if (depth === 0) { k++; break; } }
  }
  return SRC.slice(i, k);
}
function fnSource(name) { return bloque('function ' + name + '('); }

/* Carga funciones sueltas del HTML pasandoles el entorno que necesitan. */
function cargar(nombres, params, valores) {
  var body = nombres.map(fnSource).join('\n') +
    '\nreturn {' + nombres.map(function (n) { return n + ':' + n; }).join(',') + '};';
  return Function.apply(null, (params || []).concat([body])).apply(null, valores || []);
}

/* Un elemento de mentira: solo textContent, className y classList. */
function elem() {
  var cls = {};
  return {
    textContent: '', className: '',
    tiene: function (c) { return !!cls[c]; },
    classList: {
      add: function (c) { cls[c] = true; },
      remove: function (c) { delete cls[c]; },
      toggle: function (c, v) { if (v) cls[c] = true; else delete cls[c]; },
      contains: function (c) { return !!cls[c]; }
    }
  };
}
function authRol(rol) { return rol === undefined ? undefined : { role: function () { return rol; } }; }

var F = { nombre: 'Taskname', descripcion: 'Taskdescription', fecha: 'Data_to_be_done_fixed', asignado: 'UserID_asigned_alfanum', terminada: 'Tarea_terminada', notas: 'Internal_notes', solucion: 'Solutiondescription' };

/* ── 1. puedeDesmarcar: quien puede y quien no ── */
console.log('\n== puedeDesmarcar (el rol manda) ==');
[['admin', true], ['manager', true], ['ADMIN', true], ['Manager', true],
['staff', false], ['cleaner', false], ['', false], ['villamanager', false]].forEach(function (c) {
  var api = cargar(['puedeDesmarcar'], ['Auth'], [authRol(c[0])]);
  ok('rol "' + c[0] + '" ' + (c[1] ? 'puede' : 'no puede') + ' desmarcar', api.puedeDesmarcar() === c[1]);
});
ok('sin Auth cargado no se puede desmarcar', cargar(['puedeDesmarcar'], ['Auth'], [undefined]).puedeDesmarcar() === false);
ok('con un Auth sin role tampoco', cargar(['puedeDesmarcar'], ['Auth'], [{}]).puedeDesmarcar() === false);

/* ── 2. calcBloqueoDesmarcado: solo las tareas de reserva se bloquean ── */
console.log('\n== calcBloqueoDesmarcado (10/20/30 y ya terminada) ==');
function calc(rol) { return cargar(['isTruthy', 'puedeDesmarcar', 'calcBloqueoDesmarcado'], ['F', 'Auth'], [F, authRol(rol)]).calcBloqueoDesmarcado; }
function tarea(tipo, term) { return { Tasktype_booking: tipo, Tarea_terminada: term }; }

var cCleaner = calc('cleaner');
['10', '20', '30'].forEach(function (t) {
  ok('tarea de reserva ' + t + ' terminada: bloqueada para el equipo', cCleaner(tarea(t, true)) === true);
});
ok('el tipo puede llegar como numero (20)', cCleaner(tarea(20, true)) === true);
ok('el tipo puede llegar con espacios (" 20 ")', cCleaner(tarea(' 20 ', true)) === true);
ok('el -1 de Caspio cuenta como terminada: bloquea', cCleaner(tarea('20', -1)) === true);
ok("el texto 'Yes' cuenta como terminada: bloquea", cCleaner(tarea('20', 'Yes')) === true);
ok('una tarea de reserva pendiente no se bloquea', cCleaner(tarea('20', false)) === false);
ok('  ...ni con la columna vacia', cCleaner(tarea('20', '')) === false && cCleaner(tarea('20', 0)) === false);

['40', '1', '', null, undefined, '0'].forEach(function (t) {
  ok('tarea que no es de reserva (' + JSON.stringify(t) + ') terminada: NUNCA se bloquea', cCleaner(tarea(t, true)) === false);
});
ok('sin la columna Tasktype_booking tampoco se bloquea', cCleaner({ Tarea_terminada: true }) === false);
ok('sin tarea no se bloquea', cCleaner(null) === false && cCleaner(undefined) === false);

['admin', 'manager'].forEach(function (rol) {
  ok('un ' + rol + ' nunca queda bloqueado', calc(rol)(tarea('20', true)) === false);
});
ok('un staff si queda bloqueado', calc('staff')(tarea('20', true)) === true);
ok('un rol vacio queda bloqueado', calc('')(tarea('20', true)) === true);

/* ── 3. El interruptor bloqueado no se puede apagar ── */
console.log('\n== toggleTerminada (bloqueado) ==');
function entornoToggle(locked, terminada) {
  var els = { ttRow: elem(), ttCircle: elem(), ttText: elem(), hStatus: elem(), ttLock: elem() };
  var avisos = [];
  var body = [
    'var isTerminada=' + (!!terminada) + ', doneLocked=' + (!!locked) + ';',
    fnSource('setTerminada'),
    fnSource('aplicarBloqueoTerminada'),
    bloque('window.toggleTerminada=function()') + ';',
    'return {toggle:window.toggleTerminada,estado:function(){return isTerminada;}};'
  ].join('\n');
  var api = new Function('window', 'g', 'toast', body)(
    {},
    function (id) { return els[id] || null; },
    function (m, t) { avisos.push({ msg: m, tipo: t }); }
  );
  api.els = els; api.avisos = avisos;
  /* pinta el estado inicial como hace la pagina al cargar */
  return api;
}

var e = entornoToggle(true, true);
e.toggle();
ok('bloqueada y terminada: al tocar sigue terminada', e.estado() === true);
ok('  ...y avisa con el texto exacto', e.avisos.length === 1 && e.avisos[0].msg === 'Solo un manager puede desmarcar', JSON.stringify(e.avisos));
ok('  ...con estilo de error', e.avisos.length === 1 && e.avisos[0].tipo === 'err');
ok('  ...la fila se queda marcada como terminada', e.els.ttRow.tiene('on') === true);
ok('  ...la fila se ve bloqueada', e.els.ttRow.tiene('locked') === true);
ok('  ...y se ve la linea de aviso', e.els.ttLock.tiene('on') === true);
e.toggle(); e.toggle();
ok('insistir tres veces tampoco la desmarca', e.estado() === true && e.avisos.length === 3);

e = entornoToggle(false, true);
e.toggle();
ok('sin bloqueo, un manager si la desmarca', e.estado() === false);
ok('  ...sin ningun aviso', e.avisos.length === 0, JSON.stringify(e.avisos));
ok('  ...y la fila no queda bloqueada', e.els.ttRow.tiene('locked') === false && e.els.ttLock.tiene('on') === false);
e.toggle();
ok('  ...y la puede volver a marcar', e.estado() === true);

e = entornoToggle(false, false);
e.toggle();
ok('una tarea pendiente se marca como siempre', e.estado() === true && e.avisos.length === 0);

/* ── 4. El guardado nunca envia un desmarcado bloqueado ── */
console.log('\n== record[Tarea_terminada] al guardar ==');
function recordGuardado(locked, terminada) {
  var a = SRC.indexOf('var record={};');
  var b = SRC.indexOf('return fetch(Auth.url(WORKER+', a);
  if (a < 0 || b < 0) throw new Error('no encuentro el armado del record en ' + P);
  var els = { fDesc: { value: 'detalle' }, fFecha: { value: '2026-09-07' }, fAsignado: { value: '' }, fNotas: { value: 'notas' }, fSolucion: { value: 'solucion' } };
  var body = [
    'var doneLocked=' + (!!locked) + ', isTerminada=' + (!!terminada) + ';',
    'var nombre="Revisar la piscina";',
    'var beforeUrls=["","","","",""], afterUrls=["","","","",""];',
    SRC.slice(a, b),
    'return record;'
  ].join('\n');
  return new Function('F', 'window', 'g', 'today', 'selectedUserId', 'selectedVillaId', 'selectedMultiunitId',
    'isUrgente', 'isImportante', 'BEFORE_FIELDS', 'AFTER_FIELDS', body)(
      F, {}, function (id) { return els[id] || null; }, function () { return '2026-09-07'; }, 'U1', '12', '',
      false, false,
      ['Picture_cloudfare1', 'Picture_cloudfare2', 'Picture_cloudfare3', 'Picture_cloudfare4', 'Picture_cloudfare5'],
      ['Picture_cloudfare_after1', 'Picture_cloudfare_after2', 'Picture_cloudfare_after3', 'Picture_cloudfare_after4', 'Picture_cloudfare_after5']);
}

var r = recordGuardado(true, false);
ok('bloqueada: se guarda Tarea_terminada en true aunque el control diga que no', r.Tarea_terminada === true, JSON.stringify(r.Tarea_terminada));
ok('  ...y el resto del formulario viaja igual que siempre',
  r.Taskname === 'Revisar la piscina' && r.Internal_notes === 'notas' && r.Solutiondescription === 'solucion' && r.Taskdescription === 'detalle');
r = recordGuardado(true, true);
ok('bloqueada y marcada: sigue en true', r.Tarea_terminada === true);
r = recordGuardado(false, false);
ok('sin bloqueo: se guarda lo que dice el control (false)', r.Tarea_terminada === false);
r = recordGuardado(false, true);
ok('sin bloqueo: se guarda lo que dice el control (true)', r.Tarea_terminada === true);

/* ── 5. La sesion restaurada tampoco desmarca ── */
console.log('\n== restoreStateIfRecent (sesion guardada) ==');
ok('la restauracion fuerza terminada cuando hay bloqueo',
  SRC.indexOf("setTerminada(doneLocked?true:!!s.terminada);") > 0);
ok('  ...y vuelve a pintar el bloqueo', /setTerminada\(doneLocked\?true:!!s\.terminada\);\s*\n\s*if\(typeof aplicarBloqueoTerminada==='function'\)aplicarBloqueoTerminada\(\);/.test(SRC));

/* ── 6. La vista trae el tipo de tarea de reserva ── */
console.log('\n== loadTask (Tasktype_booking en taskData) ==');
function cargarTarea(row) {
  var body = [
    "var WORKER='https://ejemplo.invalido', taskId='7', allMultiunits=[], taskData=null;",
    fnSource('loadTask'),
    'return loadTask().then(function(){ return taskData; });'
  ].join('\n');
  return new Function('Auth', 'fetch', body)(
    { url: function (u) { return u; } },
    function () { return Promise.resolve({ json: function () { return Promise.resolve({ Result: [row] }); } }); }
  );
}

function finalizar() {
  console.log('\n' + pass + ' pass, ' + fail + ' fail\n');
  process.exit(fail ? 1 : 0);
}

cargarTarea({
  'TaTasks_taskid': 7, 'TaTasks_VillaID': 12, 'TaTasks_Taskname': 'Limpieza de salida',
  'TaTasks_Tarea_terminada': true, 'TaTasks_Tasktype_booking': '20'
}).then(function (t) {
  ok('taskData guarda Tasktype_booking de la vista', t.Tasktype_booking === '20', JSON.stringify(t.Tasktype_booking));
  ok('  ...y sigue guardando Tarea_terminada', t.Tarea_terminada === true);
  ok('  ...y el resto de campos de siempre', t.Taskname === 'Limpieza de salida' && String(t.taskid) === '7');

  return cargarTarea({ 'TaTasks_taskid': 8, 'TaTasks_Tarea_terminada': false });
}).then(function (t) {
  ok('si la vista no trae el tipo, el campo queda vacio y no bloquea nada', !t.Tasktype_booking);

  /* ── 7. La pagina: elemento, estilos, textos y version ── */
  console.log('\n== editar-tarea.html (pagina) ==');
  ok('existe la linea de aviso bajo el interruptor',
    SRC.indexOf('<div class="tt-lock" id="ttLock">Solo un manager puede desmarcar</div>') > 0);
  ok('la linea de aviso es pequeña y gris', /\.tt-lock\{font-size:1[12]px;color:var\(--gray-4\)/.test(SRC));
  ok('la fila bloqueada se ve apagada y sin cursor de pulsar',
    SRC.indexOf('.terminada-toggle.locked{opacity:.6;cursor:not-allowed}') > 0);
  var textos = SRC.split('Solo un manager puede desmarcar').length - 1;
  ok('el texto "Solo un manager puede desmarcar" aparece en la linea, en el aviso y en el historial', textos === 3, 'veces: ' + textos);

  var linea3 = SRC.split('\n')[2];
  ok('marcador de version v65', /VERSIÓN ACTUAL: v65 \|/.test(linea3), linea3);
  ok('PAGE_VERSION coincide', SRC.indexOf("const PAGE_VERSION='v65';") > 0);
  ok('el title coincide', SRC.indexOf('<title>Editar Tarea v65 — 3Villas</title>') > 0);
  ok('el historial empieza por la entrada v65', SRC.indexOf('<!-- HISTORIAL: v65 - ') > 0);
  ok('  ...y conserva la entrada v64', SRC.indexOf(' | v64 - ') > 0);
  finalizar();
}, function (err) {
  fail++; console.log('  FAIL  error inesperado -> ' + (err && err.stack));
  finalizar();
});
