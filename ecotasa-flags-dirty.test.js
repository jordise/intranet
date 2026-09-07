/* Pruebas: las marcas de check-in solo se guardan si el usuario las ha cambiado.
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
  ['notas-equipo-reservas.html', 71, 'window.guardar=function(){', 'flagsCambiados(record,marcaPrev,'],
  ['notas-villamanager.html', 34, 'window.guardar=function(){', 'flagsCambiados(record,marcaPrev,'],
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

console.log('\n' + pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
