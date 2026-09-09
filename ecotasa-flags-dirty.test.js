/* Pruebas: las marcas de check-in y los cinco campos del bloque de deposito solo
   se guardan si el usuario los ha cambiado; y los cobros del deposito pagados
   fuera de Stripe (v72) se marcan bien.
   node ecotasa-flags-dirty.test.js

   Problema que cubren: las tres paginas del equipo guardan la reserva entera.
   Enviaban siempre las marcas con el valor que leyeron al abrir la ficha, asi
   que un guardado normal podia pisar con un 0 viejo lo que Caspio hubiera
   puesto a 1 mientras tanto (la ecotasa cobrada es el caso real).

   Como marcas-manuales.test.js: NO copia el codigo de las paginas. Extrae el
   texto real de cada funcion del HTML y lo ejecuta, asi que si alguien edita
   una pagina estas pruebas corren el codigo NUEVO. */
var fs = require('fs');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

function fnSource(file, name) {
  var src = fs.readFileSync(file, 'utf8');
  var i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name + ' en ' + file);
  var j = src.indexOf('{', i), depth = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) { k++; break; } }
  }
  return src.slice(i, k);
}

/* Carga funciones sueltas del HTML, sin DOM ni red. */
function cargar(file, nombres) {
  var body = nombres.map(function (n) { return fnSource(file, n); }).join('\n') +
    '\nreturn {' + nombres.map(function (n) { return n + ':' + n; }).join(',') + '};';
  return new Function(body)();
}

/* El trozo de guardar()/saveAll() que va desde su cabecera hasta el fetch que
   guarda: lo que se compruebe aqui es lo que se ejecuta antes de escribir. */
function bloqueGuardado(file, cabecera) {
  var src = fs.readFileSync(file, 'utf8');
  var a = src.indexOf(cabecera);
  if (a < 0) throw new Error('no encuentro ' + cabecera + ' en ' + file);
  var b = src.indexOf('action=save&table=', a);
  if (b < 0) throw new Error('no encuentro el fetch de guardado en ' + file);
  return src.slice(a, b);
}

/* Un record como el que arma la pagina: las cuatro marcas y campos normales. */
function record(v) {
  v = v || {};
  return {
    CleaningNotes: 'notas del equipo',
    Arrivalform_done: v.arr ? 1 : 0,
    Registro_policia_done: v.pol ? 1 : 0,
    Security_deposit_terminado: v.dep ? 1 : 0,
    Ecotasa_cobrada: v.eco === undefined ? 0 : v.eco,
    Upselling1_EUR: '25.00'
  };
}
var MARCAS = ['Arrivalform_done', 'Registro_policia_done', 'Security_deposit_terminado', 'Ecotasa_cobrada'];
function ninguna(r) { return MARCAS.every(function (k) { return !(k in r); }); }

/* ── 1 y 2. Las dos paginas de notas ── */
[['notas-equipo-reservas.html', 'v71'], ['notas-villamanager.html', 'v34']].forEach(function (par) {
  var P = par[0];
  console.log('\n== ' + P + ' (flagsCambiados) ==');
  var api = cargar(P, ['flagsCambiados']);
  var f = api.flagsCambiados;
  var TODO_FALSE = { arr: false, pol: false, dep: false, eco: false };

  /* nada cambia -> ninguna marca viaja */
  var r = f(record(), TODO_FALSE, { arr: false, pol: false, dep: false, eco: false });
  ok('abrir y guardar sin tocar nada no envia ninguna marca', ninguna(r), JSON.stringify(r));
  ok('  ...y los campos que no son marcas se quedan', r.CleaningNotes === 'notas del equipo' && r.Upselling1_EUR === '25.00');

  /* la ecotasa pasa de pendiente a cobrada -> viaja sola */
  r = f(record({ eco: 1 }), TODO_FALSE, { arr: false, pol: false, dep: false, eco: true });
  ok('marcar la ecotasa envia Ecotasa_cobrada', r.Ecotasa_cobrada === 1);
  ok('  ...y ninguna otra marca viaja', !('Arrivalform_done' in r) && !('Registro_policia_done' in r) && !('Security_deposit_terminado' in r), JSON.stringify(r));

  /* EL CASO IMPORTANTE: la ecotasa no se toca -> nunca se reescribe */
  r = f(record({ eco: 0 }), { arr: false, pol: false, dep: false, eco: true }, { arr: false, pol: false, dep: false, eco: true });
  ok('una ecotasa ya cobrada que nadie toca no se reescribe', !('Ecotasa_cobrada' in r));

  /* valor anterior desconocido -> no se decide nada */
  r = f(record({ eco: 1 }), { arr: null, pol: null, dep: null, eco: null }, { arr: true, pol: true, dep: true, eco: true });
  ok('si el valor anterior no se cargo, la ecotasa no viaja', !('Ecotasa_cobrada' in r));
  ok('  ...ni ninguna de las otras tres', ninguna(r), JSON.stringify(r));

  /* la ecotasa del select vacio llega como null -> no viaja */
  r = f(record({ eco: null }), TODO_FALSE, { arr: false, pol: false, dep: false, eco: null });
  ok('el select de ecotasa sin valor (null) no envia la ecotasa', !('Ecotasa_cobrada' in r));

  /* desmarcar tambien es un cambio: el 0 SI viaja */
  r = f(record({ pol: false }), { arr: false, pol: true, dep: false, eco: false }, { arr: false, pol: false, dep: false, eco: false });
  ok('desmarcar policia envia Registro_policia_done a 0', r.Registro_policia_done === 0);
  ok('  ...y las otras tres marcas no viajan', !('Arrivalform_done' in r) && !('Security_deposit_terminado' in r) && !('Ecotasa_cobrada' in r), JSON.stringify(r));

  /* dos marcas cambiadas a la vez */
  r = f(record({ arr: true, dep: true }), TODO_FALSE, { arr: true, pol: false, dep: true, eco: false });
  ok('dos marcas cambiadas viajan las dos', r.Arrivalform_done === 1 && r.Security_deposit_terminado === 1 && !('Registro_policia_done' in r));

  /* la funcion devuelve el mismo record */
  var base = record();
  ok('devuelve el mismo record que recibe', f(base, TODO_FALSE, TODO_FALSE) === base);
});

/* ── 3. La pagina de pruebas de reserva ── */
console.log('\n== checkin-testear-reserva.html (soloCambiados) ==');
(function () {
  var api = cargar('checkin-testear-reserva.html', ['normMarca', 'soloCambiados']);
  var f = api.soloCambiados;
  var K = ['Arrivalform_done', 'Registro_policia_done', 'Security_deposit_terminado', 'Ecotasa_cobrada',
    'Security_deposit_cobrado', 'Security_deposit_devuelto', 'Deposit_waver_cobrado', 'Gasto_tarjeta_dep_seguri_cobrado'];

  var r = f({ Ecotasa_cobrada: 1, Guest_info: 'texto' }, { Ecotasa_cobrada: 1 }, K);
  ok('ecotasa cargada a 1 y sin tocar: no viaja', !('Ecotasa_cobrada' in r));
  ok('  ...y los campos que no son marcas se quedan', r.Guest_info === 'texto');

  r = f({ Ecotasa_cobrada: 1 }, { Ecotasa_cobrada: 0 }, K);
  ok('ecotasa de 0 a 1: viaja', r.Ecotasa_cobrada === 1);

  r = f({ Ecotasa_cobrada: 0 }, { Ecotasa_cobrada: 1 }, K);
  ok('ecotasa de 1 a 0: viaja', r.Ecotasa_cobrada === 0);

  r = f({ Ecotasa_cobrada: 1 }, { Ecotasa_cobrada: null }, K);
  ok('cargado null cuenta como 0: marcar por primera vez viaja', r.Ecotasa_cobrada === 1);
  r = f({ Ecotasa_cobrada: 0 }, { Ecotasa_cobrada: null }, K);
  ok('cargado null y formulario 0: no viaja', !('Ecotasa_cobrada' in r));
  r = f({ Ecotasa_cobrada: 1 }, { Ecotasa_cobrada: '' }, K);
  ok('cargado vacio cuenta como 0: marcar viaja', r.Ecotasa_cobrada === 1);
  r = f({ Ecotasa_cobrada: 0 }, {}, K);
  ok('la columna no viene y el formulario dice 0: no viaja', !('Ecotasa_cobrada' in r));

  r = f({ Ecotasa_cobrada: 1 }, { Ecotasa_cobrada: '1' }, K);
  ok("el texto '1' y el numero 1 son el mismo valor: no viaja", !('Ecotasa_cobrada' in r));
  r = f({ Registro_policia_done: 1 }, { Registro_policia_done: -1 }, K);
  ok('el -1 de Caspio cuenta como marcado: no viaja', !('Registro_policia_done' in r));
  r = f({ Security_deposit_devuelto: 0 }, { Security_deposit_devuelto: false }, K);
  ok('false y 0 son el mismo valor: no viaja', !('Security_deposit_devuelto' in r));

  r = f({ Security_deposit_cobrado: 2 }, { Security_deposit_cobrado: 2 }, K);
  ok('un valor raro igual en los dos lados (2 y 2): no viaja', !('Security_deposit_cobrado' in r));
  r = f({ Security_deposit_cobrado: 2 }, { Security_deposit_cobrado: 1 }, K);
  ok('  ...y si es distinto, viaja', r.Security_deposit_cobrado === 2);

  /* la reserva llega de una vista: las columnas traen el prefijo de la tabla */
  r = f({ Ecotasa_cobrada: 0 }, { TaBookings2021_Ecotasa_cobrada: 1 }, K);
  ok('lee la columna con prefijo de la vista (TaBookings2021_)', r.Ecotasa_cobrada === 0);
  r = f({ Ecotasa_cobrada: 1 }, { TaBookings2021_Ecotasa_cobrada: 1 }, K);
  ok('  ...y con prefijo tampoco reescribe lo que no cambia', !('Ecotasa_cobrada' in r));

  /* las ocho marcas de la lista, todas iguales -> ninguna viaja */
  var fields = {}, loaded = {};
  K.forEach(function (k) { fields[k] = 1; loaded['TaBookings2021_' + k] = 1; });
  fields.Guest_Name = 'Ana';
  r = f(fields, loaded, K);
  ok('las ocho marcas sin cambios no viajan', K.every(function (k) { return !(k in r); }), JSON.stringify(r));
  ok('  ...y el resto del formulario si', r.Guest_Name === 'Ana');
})();

/* ── 4. Version de cada pagina y llamada dentro del guardado ── */
console.log('\n== las tres paginas (HTML) ==');
[
  ['notas-equipo-reservas.html', 74, 'window.guardar=function(){', 'flagsCambiados(record,marcaPrev,'],
  ['notas-villamanager.html', 37, 'window.guardar=function(){', 'flagsCambiados(record,marcaPrev,'],
  ['checkin-testear-reserva.html', 10, 'async function saveAll(){', 'soloCambiados(fields,_booking,']
].forEach(function (t) {
  var file = t[0], ver = t[1], cabecera = t[2], llamada = t[3];
  var src = fs.readFileSync(file, 'utf8');
  var linea3 = src.split('\n')[2];
  ok(file + ': marcador de version v' + ver, new RegExp('VERSIÓN ACTUAL: v' + ver + ' \\|').test(linea3), linea3);
  var pv = src.match(/var PAGE_VERSION = (\d+);/);
  ok(file + ': PAGE_VERSION coincide (o la pagina no lo usa)', !pv || Number(pv[1]) === ver, pv && pv[1]);
  ok(file + ': el historial tiene la entrada v' + ver, src.indexOf('<!-- HISTORIAL: v' + ver + ' - ') > 0);
  var bloque = bloqueGuardado(file, cabecera);
  ok(file + ': el guardado filtra las marcas antes de escribir', bloque.indexOf(llamada) > 0);
});

/* ── 5. No se rompen los anclajes de marcas-manuales.test.js ── */
console.log('\n== rastro de marcas manuales (v70/v33) intacto ==');
['notas-equipo-reservas.html', 'notas-villamanager.html'].forEach(function (P) {
  var src = fs.readFileSync(P, 'utf8');
  ok(P + ': sigue el bloque var _mn=marcasNuevas();', src.indexOf('var _mn=marcasNuevas();') > 0);
  ok(P + ": sigue la escritura record.Marcas_manuales=_ls.join('\\n');", src.indexOf("record.Marcas_manuales=_ls.join('\\n');") > 0);
});

/* ── 6. v72: los cinco campos del bloque de deposito ── */
/* Un record como el que arma la pagina para el bloque de deposito. */
function recordDep(v) {
  v = v || {};
  return {
    CleaningNotes: 'notas del equipo',
    Security_deposit_options: v.opt === undefined ? 1 : v.opt,
    Se_permite_waver: v.waver === undefined ? 1 : v.waver,
    Security_deposit_EUR: v.dep === undefined ? null : v.dep,
    Deposit_waver_EUR: v.wav === undefined ? null : v.wav,
    Gasto_tarjeta_deposito_seguridad: v.gasto === undefined ? null : v.gasto
  };
}
var DEPC = ['Security_deposit_options', 'Se_permite_waver', 'Security_deposit_EUR', 'Deposit_waver_EUR', 'Gasto_tarjeta_deposito_seguridad'];
function ningunaDep(r) { return DEPC.every(function (k) { return !(k in r); }); }

[['notas-equipo-reservas.html', 'v74'], ['notas-villamanager.html', 'v37']].forEach(function (par) {
  var P = par[0];
  console.log('\n== ' + P + ' (depCambiados) ==');
  var api = cargar(P, ['depNum', 'depCambiados', 'waverCargado']);
  var f = api.depCambiados;
  /* la ficha se abre con: opcion 1, waiver permitido, 500 de deposito, 50 de
     waiver y 12.50 de gastos de tarjeta */
  var CARGADO = { opt: '1', waver: '1', dep: '500', wav: '50', gasto: '12.50' };
  function ahora(cambio) {
    var o = {}; for (var k in CARGADO) o[k] = CARGADO[k];
    for (var k2 in (cambio || {})) o[k2] = cambio[k2];
    return o;
  }

  var r = f(recordDep(), CARGADO, ahora());
  ok('abrir y guardar sin tocar el deposito no envia ninguno de los cinco campos', ningunaDep(r), JSON.stringify(r));
  ok('  ...y los campos que no son del deposito se quedan', r.CleaningNotes === 'notas del equipo');

  r = f(recordDep({ wav: '75' }), CARGADO, ahora({ wav: '75' }));
  ok('cambiar el importe del waiver envia solo Deposit_waver_EUR', r.Deposit_waver_EUR === '75');
  ok('  ...y los otros cuatro no viajan', DEPC.filter(function (k) { return k !== 'Deposit_waver_EUR'; }).every(function (k) { return !(k in r); }), JSON.stringify(r));

  r = f(recordDep(), CARGADO, ahora({ dep: '500.00' }));
  ok('500 y 500.00 son el mismo importe: no viaja', !('Security_deposit_EUR' in r));
  r = f(recordDep(), CARGADO, ahora({ dep: '500.001' }));
  ok('una diferencia menor de medio centimo no viaja', !('Security_deposit_EUR' in r));
  r = f(recordDep({ dep: '500.01' }), CARGADO, ahora({ dep: '500.01' }));
  ok('  ...y un centimo de mas si viaja', r.Security_deposit_EUR === '500.01');

  r = f(recordDep(), { opt: '1', waver: '1', dep: '', wav: '50', gasto: '12.50' }, ahora({ dep: '0' }));
  ok('importe vacio y 0 son el mismo valor: no viaja', !('Security_deposit_EUR' in r));
  r = f(recordDep(), { opt: '1', waver: '1', dep: '0', wav: '50', gasto: '12.50' }, ahora({ dep: '' }));
  ok('  ...y al reves tampoco', !('Security_deposit_EUR' in r));

  r = f(recordDep({ opt: 2 }), CARGADO, ahora({ opt: '2' }));
  ok('cambiar la opcion del deposito envia Security_deposit_options', r.Security_deposit_options === 2);
  ok('  ...y solo esa', DEPC.filter(function (k) { return k !== 'Security_deposit_options'; }).every(function (k) { return !(k in r); }), JSON.stringify(r));

  r = f(recordDep({ waver: 20 }), CARGADO, ahora({ waver: '20' }));
  ok('pasar el waiver a No (20) envia Se_permite_waver', r.Se_permite_waver === 20);
  r = f(recordDep(), { opt: '1', waver: '', dep: '500', wav: '50', gasto: '12.50' }, ahora());
  ok('un Se_permite_waver vacio cuenta como Si (1): no viaja', !('Se_permite_waver' in r));

  r = f(recordDep(), null, ahora());
  ok('si no se cargo el bloque, ninguno de los cinco viaja', ningunaDep(r), JSON.stringify(r));
  r = f(recordDep(), CARGADO, ahora({ dep: 'no es un numero' }));
  ok('un valor que no es un numero no viaja', !('Security_deposit_EUR' in r));

  var base = recordDep();
  ok('devuelve el mismo record que recibe', f(base, CARGADO, ahora()) === base);

  /* waverCargado: la lectura de Se_permite_waver (1 = Si, 20 = No, el 0 no existe) */
  var w = api.waverCargado;
  ok('un 20 guardado se lee como 20, no como Si', w(20) === '20' && w('20') === '20');
  ok('un 0 guardado NO se lee como Si', w(0) === '0' && w('0') === '0');
  ok('el campo vacio se queda vacio (elegir Si es un cambio real)', w('') === '' && w(null) === '' && w(undefined) === '');
  ok('  ...y un 1 sigue siendo 1', w(1) === '1');
});

/* ── 7. v72: cobros del deposito fuera de Stripe (solo notas-equipo-reservas) ── */
console.log('\n== notas-equipo-reservas.html (cobros fuera de Stripe) ==');

/* Saca un bloque que empieza por un marcador y acaba en su llave de cierre. */
function bloqueLlaves(file, inicio) {
  var src = fs.readFileSync(file, 'utf8');
  var i = src.indexOf(inicio);
  if (i < 0) throw new Error('no encuentro ' + inicio + ' en ' + file);
  var j = src.indexOf('{', i), depth = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) { k++; break; } }
  }
  return src.slice(i, k);
}

(function () {
  var P = 'notas-equipo-reservas.html';
  var api = cargar(P, ['depCobrosPend']);
  var f = api.depCobrosPend;

  var r = f({ CleaningNotes: 'x' }, {});
  ok('sin nada marcado no viaja ningun cobro del deposito',
    !('Deposit_waver_cobrado' in r) && !('Security_deposit_cobrado' in r) && !('Gasto_tarjeta_dep_seguri_cobrado' in r));
  r = f({}, { waiver: 'transferencia' });
  ok('marcar el waiver escribe Deposit_waver_cobrado a 1', r.Deposit_waver_cobrado === 1);
  ok('  ...y no toca el deposito ni los gastos', !('Security_deposit_cobrado' in r) && !('Gasto_tarjeta_dep_seguri_cobrado' in r), JSON.stringify(r));
  r = f({}, { deposito: 'efectivo', gastos: 'transferencia' });
  ok('deposito y gastos marcados escriben sus dos flags a 1', r.Security_deposit_cobrado === 1 && r.Gasto_tarjeta_dep_seguri_cobrado === 1);
  r = f({}, { waiver: '', deposito: null });
  ok('lo no marcado nunca escribe un 0', Object.keys(r).length === 0, JSON.stringify(r));
  r = f({}, null);
  ok('sin objeto de marcas tampoco escribe nada', Object.keys(r).length === 0);

  /* el boton: confirm, importe obligatorio y la marca con su metodo */
  function botonEnv(valor, respuesta) {
    var win = { __depPendCobrado: {}, __depCobrado: {} };
    var avisos = [];
    var els = { fWavEUR: { value: valor }, fDepEUR: { value: '' }, fGastoT: { value: '' } };
    var body = [
      bloqueLlaves(P, 'var DEP_COBROS={') + ';',
      bloqueLlaves(P, 'window.marcarDepCobradoFuera=function') + ';',
      'return window;'
    ].join('\n');
    var g = function (id) { return els[id] || null; };
    var toast = function (m, t) { avisos.push(t + ': ' + m); };
    var confirm = function () { return respuesta; };
    var updateDepCobros = function () { };
    var w = new Function('window', 'g', 'toast', 'confirm', 'updateDepCobros', body)(win, g, toast, confirm, updateDepCobros);
    return { win: w, avisos: avisos };
  }

  var e = botonEnv('', true);
  e.win.marcarDepCobradoFuera('waiver', 'transferencia');
  ok('sin importe no se marca nada', !e.win.__depPendCobrado.waiver);
  ok('  ...y se avisa al usuario', e.avisos.length === 1 && e.avisos[0].indexOf('err:') === 0, JSON.stringify(e.avisos));

  e = botonEnv('50', false);
  e.win.marcarDepCobradoFuera('waiver', 'transferencia');
  ok('si el usuario cancela el confirm no se marca nada', !e.win.__depPendCobrado.waiver);

  e = botonEnv('50', true);
  e.win.marcarDepCobradoFuera('waiver', 'transferencia');
  ok('confirmando queda marcado el waiver con su metodo', e.win.__depPendCobrado.waiver === 'transferencia');
  ok('  ...y se recuerda pulsar Guardar', e.avisos.join(' ').indexOf('Guardar') > 0, JSON.stringify(e.avisos));

  e = botonEnv('50', true);
  e.win.marcarDepCobradoFuera('inventado', 'transferencia');
  ok('un tipo que no existe no marca nada', Object.keys(e.win.__depPendCobrado).length === 0);

  /* el sello que se anade al rastro de marcas manuales */
  function selloEnv(pend) {
    var els = {
      cbArrDone: { checked: false }, cbPolDone: { checked: false },
      cbDepTerm: { checked: false }, fEcotasaCobrada: { value: '0' }
    };
    var body = [
      bloqueLlaves(P, 'function marcaSello('),
      bloqueLlaves(P, 'function marcasNuevas('),
      'return marcasNuevas();'
    ].join('\n');
    return new Function('window', 'g', 'MARCA_DEFS', 'marcaPrev', 'Auth', body)(
      { __depPendCobrado: pend },
      function (id) { return els[id] || null; },
      [['arr', 'Arrival form', 'mkArrDone'], ['pol', 'Policia', 'mkPolDone'], ['dep', 'Deposito', 'mkDepTerm'], ['eco', 'Ecotasa', 'mkEco']],
      { arr: false, pol: false, dep: false, eco: false },
      { name: function () { return 'Toni Segui'; } }
    );
  }

  var m = selloEnv({});
  ok('sin cobros marcados no hay ningun sello', m.length === 0, JSON.stringify(m));
  m = selloEnv({ waiver: 'transferencia' });
  ok('marcar el waiver deja exactamente un sello', m.length === 1, JSON.stringify(m));
  ok('  ...con el formato [Waiver cobrado por transferencia DD/MM/AAAA HH:MM - Nombre]',
    /^\[Waiver cobrado por transferencia \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} - Toni Segui\]$/.test(m[0]), m[0]);
  m = selloEnv({ deposito: 'efectivo', gastos: 'transferencia' });
  ok('deposito y gastos dejan sus dos sellos, con sus etiquetas', m.length === 2 &&
    m[0].indexOf('[Deposito cobrado en efectivo ') === 0 &&
    m[1].indexOf('[Gastos tarjeta cobrados por transferencia ') === 0, JSON.stringify(m));

  /* la linea de cobro NO se pinta bajo la casilla del deposito: son dos cosas
     distintas (decision del paso 3 contra dinero recibido) */
  (function () {
    var els = {};
    ['mkArrDone', 'mkPolDone', 'mkDepTerm', 'mkEco'].forEach(function (id) { els[id] = { style: {}, innerHTML: '' }; });
    var body = [
      bloqueLlaves(P, 'function marcaEsc('),
      bloqueLlaves(P, 'function renderMarcas('),
      'renderMarcas();'
    ].join('\n');
    new Function('g', 'MARCA_DEFS', 'marcasTexto', body)(
      function (id) { return els[id] || null; },
      [['arr', 'Arrival form', 'mkArrDone'], ['pol', 'Policia', 'mkPolDone'], ['dep', 'Deposito', 'mkDepTerm'], ['eco', 'Ecotasa', 'mkEco']],
      '[Deposito marcado 01/09/2026 10:00 - Marta]\n[Deposito cobrado por transferencia 07/09/2026 12:30 - Toni Segui]'
    );
    ok('la casilla del deposito sigue mostrando su sello de siempre', els.mkDepTerm.innerHTML.indexOf('- Marta') > 0);
    ok('  ...y no muestra la linea del cobro por transferencia', els.mkDepTerm.innerHTML.indexOf('cobrado por transferencia') === -1, els.mkDepTerm.innerHTML);
  })();

  /* el guardado llama a las dos piezas nuevas */
  var bloque = bloqueGuardado(P, 'window.guardar=function(){');
  ok('el guardado filtra los cinco campos del deposito', bloque.indexOf('depCambiados(record,depPrev,') > 0);
  ok('el guardado escribe los cobros marcados en esta sesion', bloque.indexOf('depCobrosPend(record,window.__depPendCobrado);') > 0);
  var srcE = fs.readFileSync(P, 'utf8');
  ok('los botones estan en la pagina, uno por linea y con los dos metodos',
    ["marcarDepCobradoFuera('waiver','transferencia')", "marcarDepCobradoFuera('waiver','efectivo')",
      "marcarDepCobradoFuera('deposito','transferencia')", "marcarDepCobradoFuera('deposito','efectivo')",
      "marcarDepCobradoFuera('gastos','transferencia')", "marcarDepCobradoFuera('gastos','efectivo')"]
      .every(function (t) { return srcE.indexOf(t) > 0; }));
  ok('la pagina nunca escribe un 0 en los tres campos de cobro',
    !/(Deposit_waver_cobrado|Security_deposit_cobrado|Gasto_tarjeta_dep_seguri_cobrado)\s*[:=]\s*0/.test(srcE));
})();

/* ── 8. notas-villamanager: mismo desplegable de waiver, sin ceros ── */
console.log('\n== notas-villamanager.html (Se_permite_waver) ==');
(function () {
  var src = fs.readFileSync('notas-villamanager.html', 'utf8');
  ok('el desplegable tiene los valores reales del lookup (1 = Si, 20 = No)',
    src.indexOf('<option value="1">Sí</option><option value="20">No</option>') > 0);
  ok('ya no queda ningun option con valor 0', src.indexOf('<option value="0">No</option>') === -1);
  ok('el guardado nunca escribe 0: vacio va como null y lo demas como numero', src.indexOf("Se_permite_waver:g('fSeWaver').value===''?null:parseInt(g('fSeWaver').value)") > 0 && src.indexOf("Se_permite_waver:parseInt(g('fSeWaver').value||0)") < 0);
  ok('una marca pendiente se descarta cuando la linea deja de aplicar', fs.readFileSync('notas-equipo-reservas.html', 'utf8').indexOf('if(pend)delete window.__depPendCobrado[tipo];') > 0 && fs.readFileSync('notas-equipo-reservas.html', 'utf8').indexOf('updateDepCobros(); /* descarta marcas pendientes') > 0);
  ok('el texto de un extra se escapa en la linea de pagos de Equipo', /var lbl=String\(it\.label\|\|''\)\.replace\(\/&\/g,'&amp;'\)/.test(fs.readFileSync('entradas-equipo.html', 'utf8')));
  ok('el guardado filtra los cinco campos del deposito',
    bloqueGuardado('notas-villamanager.html', 'window.guardar=function(){').indexOf('depCambiados(record,depPrev,') > 0);
})();

/* ── 9. task-wp: un fallo de la reserva ya no se traga ── */
console.log('\n== task-wp.html (fallo visible) ==');
(function () {
  var src = fs.readFileSync('task-wp.html', 'utf8');
  ok('ya no queda el catch que se tragaba el fallo de la reserva',
    src.indexOf('.catch(eBk=>{console.warn(') === -1);
  ok('el fallo de la reserva se guarda para mirarlo despues', src.indexOf('.catch(eBk=>{bkErr=eBk;return null;})') > 0);
  ok('tambien se mira si la respuesta no es OK (un 4xx no lanza excepcion)',
    src.indexOf('if(bkErr||!bkRes||!bkRes.ok){') > 0);
  ok('avisa con el texto acordado',
    src.indexOf("toast('Tarea guardada, pero la reserva no se ha actualizado: pulsa Guardar otra vez','error');") > 0);
  var i = src.indexOf('if(bkErr||!bkRes||!bkRes.ok){');
  var bloque = src.slice(i, src.indexOf('clearState();', i));
  ok('en ese caso NO se cierra la pagina ni se borra el estado',
    bloque.indexOf('return;') > 0 && bloque.indexOf('window.close()') === -1 && bloque.indexOf('clearState()') === -1);
  ok('marcador de version v22', /VERSIÓN ACTUAL: v22 \|/.test(src.split('\n')[2]));
})();

console.log('\n' + pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
