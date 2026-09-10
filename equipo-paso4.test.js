/* Pruebas de la insignia Paso 4, la linea de PAGOS en la ficha y el filtro de
   pendientes (v144, gaps G2, G4, G7, G8, G10, G11 de la auditoria del 07/09/2026).
   node equipo-paso4.test.js

   Como ecotasa-sync.test.js: NO copia el codigo de la pagina. Extrae el texto real
   de cada funcion de entradas-equipo.html y lo ejecuta. Si alguien edita la pagina,
   estas pruebas corren el codigo NUEVO. Nunca se llama al proxy: no hay red. */
var fs = require('fs');
var P = 'entradas-equipo.html';
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

var SRC = fs.readFileSync(P, 'utf8');

/* Corta un bloque equilibrado (llaves o corchetes) a partir de un marcador. */
function bloque(marca, abre, cierra) {
  var i = SRC.indexOf(marca);
  if (i < 0) throw new Error('no encuentro ' + marca + ' en ' + P);
  var j = SRC.indexOf(abre, i), depth = 0, k = j;
  for (; k < SRC.length; k++) {
    if (SRC[k] === abre) depth++;
    else if (SRC[k] === cierra) { depth--; if (depth === 0) { k++; break; } }
  }
  return SRC.slice(i, k);
}
function fnSource(name) { return bloque('function ' + name + '(', '{', '}'); }

/* Entorno de las funciones puras: todas salen de la pagina. */
function makeEnv() {
  var body = [
    bloque('const F = {', '{', '}') + ';',
    fnSource('g'), fnSource('isOk'), fnSource('_lvNum'), fnSource('_lvBool1'),
    fnSource('calcPaymentItems'), fnSource('paymentsLineHTML'), fnSource('_lvBdg'),
    fnSource('paso4Local'), fnSource('paso4Falta'), fnSource('paso4Label'),
    fnSource('esPropietario'), "var PROPIETARIO_BADGE='Check-in online: no aplica (propietario)';", fnSource('arrivalOk'), fnSource('checkinPendiente'), fnSource('_lvBdgEco'),
    fnSource('ecotasaOk'), fnSource('fianzaFalta'), fnSource('fianzaOk'), fnSource('fianzaLabel'), fnSource('_lvBdgFianza'),
    'return {paso4Local:paso4Local,paso4Falta:paso4Falta,paso4Label:paso4Label,' +
    'ecotasaOk:ecotasaOk,fianzaFalta:fianzaFalta,fianzaOk:fianzaOk,fianzaLabel:fianzaLabel,_lvBdgFianza:_lvBdgFianza,' +
    'arrivalOk:arrivalOk,checkinPendiente:checkinPendiente,_lvBdgEco:_lvBdgEco,esPropietario:esPropietario,' +
    'paymentsLineHTML:paymentsLineHTML,calcPaymentItems:calcPaymentItems,isOk:isOk};'
  ].join('\n');
  return new Function(body)();
}
var E = makeEnv();

/* Reserva de ejemplo. Por defecto: todo cobrado, opcion 1 sin waiver permitido. */
function res(extra) {
  var r = {
    TaBookings2021_FS_confirmation_code: 'TEST0001',
    TaBookings2021_Ecotasa_final: '30',
    TaBookings2021_Ecotasa_cobrada: '1',
    TaBookings2021_Security_deposit_options: '1',
    TaBookings2021_Se_permite_waver: '20'
  };
  for (var k in (extra || {})) r[k] = extra[k];
  return r;
}
/* Opcion 1 con waiver permitido de 40 euros. */
function conWaiver(cobrado, extra) {
  return res(Object.assign({
    TaBookings2021_Security_deposit_options: '1',
    TaBookings2021_Se_permite_waver: '1',
    TaBookings2021_Deposit_waver_EUR: '40',
    TaBookings2021_Deposit_waver_cobrado: cobrado
  }, extra || {}));
}
/* Opcion 2 con deposito de 500 euros. */
function conDeposito(cobrado, extra) {
  return res(Object.assign({
    TaBookings2021_Security_deposit_options: '2',
    TaBookings2021_Security_deposit_EUR: '500',
    TaBookings2021_Security_deposit_cobrado: cobrado
  }, extra || {}));
}

console.log('\n== G2: que falta para cerrar el paso 4 (paso4Falta) ==');

ok('nada pendiente: lista vacia', E.paso4Falta(res()).length === 0, JSON.stringify(E.paso4Falta(res())));
ok('la ecotasa sin cobrar sale como ecotasa',
  E.paso4Falta(res({ TaBookings2021_Ecotasa_cobrada: '0' })).join(',') === 'ecotasa');
ok('opcion 2 con el deposito sin cobrar sale como deposito',
  E.paso4Falta(conDeposito('0')).join(',') === 'deposito');
ok('opcion 1 con waiver permitido y sin cobrar sale como waiver',
  E.paso4Falta(conWaiver('0')).join(',') === 'waiver');
ok('opcion 1 con el waiver ya cobrado no falta nada', E.paso4Falta(conWaiver('1')).length === 0);
ok('opcion 1 con waiver NO permitido (20) no pide waiver', E.paso4Falta(res()).length === 0);
ok('  ...aunque el waiver no este cobrado',
  E.paso4Falta(res({ TaBookings2021_Deposit_waver_cobrado: '0', TaBookings2021_Deposit_waver_EUR: '40' })).length === 0);
ok('opcion 2 no mira el waiver',
  E.paso4Falta(conDeposito('1', { TaBookings2021_Se_permite_waver: '1', TaBookings2021_Deposit_waver_cobrado: '0' })).length === 0);
ok('una opcion desconocida no pide ni deposito ni waiver',
  E.paso4Falta(res({ TaBookings2021_Security_deposit_options: '0', TaBookings2021_Security_deposit_cobrado: '0' })).length === 0);
ok('una ecotasa sin cobrar falta aunque el importe sea 0 (la formula mira el flag, no el importe)',
  E.paso4Falta(res({ TaBookings2021_Ecotasa_final: '0', TaBookings2021_Ecotasa_cobrada: '0' })).join() === 'ecotasa');
ok('sin registro devuelve lista vacia', E.paso4Falta(null).length === 0);

/* combinaciones: el orden es siempre ecotasa, deposito, waiver */
ok('ecotasa y waiver, en ese orden',
  E.paso4Falta(conWaiver('0', { TaBookings2021_Ecotasa_cobrada: '0' })).join(',') === 'ecotasa,waiver');
ok('ecotasa y deposito, en ese orden',
  E.paso4Falta(conDeposito('0', { TaBookings2021_Ecotasa_cobrada: '0' })).join(',') === 'ecotasa,deposito');
ok('nunca salen deposito y waiver a la vez (dependen de la opcion)',
  E.paso4Falta(conDeposito('0', { TaBookings2021_Se_permite_waver: '1', TaBookings2021_Deposit_waver_cobrado: '0' })).join(',') === 'deposito');

/* la regla de la formula no cambia: paso4Falta y paso4Local dicen lo mismo */
[res(), conWaiver('0'), conWaiver('1'), conDeposito('0'), conDeposito('1'),
 res({ TaBookings2021_Ecotasa_cobrada: '0' })].forEach(function (r, i) {
  ok('paso4Falta vacio equivale a paso4Local true (caso ' + (i + 1) + ')',
    (E.paso4Falta(r).length === 0) === (E.paso4Local(r) === true),
    JSON.stringify(E.paso4Falta(r)) + ' / ' + E.paso4Local(r));
});

console.log('\n== G2: el texto de la insignia (paso4Label; desde v145 solo referencia, no se pinta) ==');

ok('en verde la insignia solo dice Paso 4', E.paso4Label(conWaiver('0'), true) === 'Paso 4');
ok('sin dato la insignia solo dice Paso 4', E.paso4Label(conWaiver('0'), null) === 'Paso 4');
ok('en rojo con el waiver sin cobrar: Paso 4: falta waiver',
  E.paso4Label(conWaiver('0'), false) === 'Paso 4: falta waiver', E.paso4Label(conWaiver('0'), false));
ok('en rojo con el deposito sin cobrar: Paso 4: falta deposito',
  E.paso4Label(conDeposito('0'), false) === 'Paso 4: falta deposito');
ok('en rojo con la ecotasa sin cobrar: Paso 4: falta ecotasa',
  E.paso4Label(res({ TaBookings2021_Ecotasa_cobrada: '0' }), false) === 'Paso 4: falta ecotasa');
ok('dos conceptos se unen con "y": Paso 4: falta ecotasa y waiver',
  E.paso4Label(conWaiver('0', { TaBookings2021_Ecotasa_cobrada: '0' }), false) === 'Paso 4: falta ecotasa y waiver',
  E.paso4Label(conWaiver('0', { TaBookings2021_Ecotasa_cobrada: '0' }), false));
ok('  ...y ecotasa y deposito igual',
  E.paso4Label(conDeposito('0', { TaBookings2021_Ecotasa_cobrada: '0' }), false) === 'Paso 4: falta ecotasa y deposito');
ok('en rojo siempre hay motivo: lista vacia solo cuando la regla local da verde', E.paso4Label(res({ TaBookings2021_Ecotasa_cobrada: '1' }), false) === 'Paso 4' && E.paso4Falta(res({ TaBookings2021_Ecotasa_cobrada: '1' })).length === 0);
ok('el texto nunca lleva la palabra Ecotasa con mayuscula (esa es la linea de PAGOS)',
  E.paso4Label(res({ TaBookings2021_Ecotasa_cobrada: '0' }), false).indexOf('Ecotasa') === -1);

console.log('\n== la insignia Ecotasa del listado (_lvBdgEco) ==');

/* v145: la insignia del listado vuelve a decir Ecotasa y mira solo Ecotasa_cobrada */
var bdgVerde = E._lvBdgEco(res({ TaBookings2021_Paso4_terminado: '0' }), 'u');
ok('la insignia verde dice Ecotasa (v145)', bdgVerde.indexOf('> Ecotasa') > 0 || bdgVerde.indexOf(' Ecotasa<') > 0, bdgVerde);
ok('  ...y ya no dice Paso 4', bdgVerde.indexOf('Paso 4') === -1, bdgVerde);
ok('  ...y esta en verde aunque la formula Paso4_terminado diga 0 (lv-ok)', bdgVerde.indexOf('lv-ok') > 0, bdgVerde);
var bdgRojo = E._lvBdgEco(res({ TaBookings2021_Ecotasa_cobrada: '0', TaBookings2021_Paso4_terminado: '1' }), 'u');
ok('la ecotasa sin cobrar sale en rojo aunque la formula diga 1', bdgRojo.indexOf('lv-no') > 0, bdgRojo);
ok('  ...y el waiver sin cobrar NO pone la ecotasa en rojo',
  E._lvBdgEco(conWaiver('0'), 'u').indexOf('lv-ok') > 0, E._lvBdgEco(conWaiver('0'), 'u'));
ok('sin dato de ecotasa la insignia es gris (lv-na)',
  E._lvBdgEco(res({ TaBookings2021_Ecotasa_cobrada: '' }), 'u').indexOf('lv-na') > 0);
ok('la sincronizacion de Stripe pone la etiqueta (Stripe) solo en verde',
  E._lvBdgEco(res({ TaBookings2021_Ecotasa_cobrada: 1, __pagoOk: true, __stripe: { Ecotasa: true } }), 'u').indexOf('Ecotasa (Stripe)') > 0);

console.log('\n== v145: la insignia Fianza/Waiver (fianzaFalta, fianzaOk, fianzaLabel) ==');

ok('opcion 2 con la fianza cobrada: verde', E.fianzaOk(conDeposito('1')) === true);
ok('opcion 2 con la fianza sin cobrar: rojo, falta fianza',
  E.fianzaOk(conDeposito('0')) === false && E.fianzaFalta(conDeposito('0')) === 'fianza');
ok('opcion 1 con el waiver cobrado: verde', E.fianzaOk(conWaiver('1')) === true);
ok('opcion 1 con el waiver sin cobrar: rojo, falta waiver',
  E.fianzaOk(conWaiver('0')) === false && E.fianzaFalta(conWaiver('0')) === 'waiver');
ok('opcion 1 con waiver NO permitido (20): verde, no hay nada que cobrar', E.fianzaOk(res()) === true);
ok('sin opcion y paso 3 cerrado: verde',
  E.fianzaOk(res({ TaBookings2021_Security_deposit_options: '0', TaBookings2021_Security_deposit_terminado: '1' })) === true);
ok('sin opcion y paso 3 sin cerrar: rojo, sin elegir',
  E.fianzaOk(res({ TaBookings2021_Security_deposit_options: '0', TaBookings2021_Security_deposit_terminado: '0' })) === false &&
  E.fianzaFalta(res({ TaBookings2021_Security_deposit_options: '0', TaBookings2021_Security_deposit_terminado: '0' })) === 'elegir');
ok('sin opcion y sin dato del paso 3: gris (null)',
  E.fianzaOk(res({ TaBookings2021_Security_deposit_options: '' })) === null);
ok('la ecotasa no entra en la insignia Fianza/Waiver',
  E.fianzaOk(conDeposito('1', { TaBookings2021_Ecotasa_cobrada: '0' })) === true);
ok('sin registro: null', E.fianzaOk(null) === null && E.fianzaFalta(null) === '');
/* opcion 3 (fianza por transferencia) y opcion 4 (Airbnb sin waiver), hallazgo del checker */
function conTransferencia(cobrado, extra) {
  return res(Object.assign({ TaBookings2021_Security_deposit_options: '3', TaBookings2021_Security_deposit_EUR: '500',
    TaBookings2021_Security_deposit_cobrado: cobrado, TaBookings2021_Security_deposit_terminado: '1' }, extra || {}));
}
ok('opcion 3 con la transferencia marcada cobrada: verde', E.fianzaOk(conTransferencia('1')) === true);
ok('v146: opcion 3 sin flag de cobro pero con el paso 3 cerrado (Terminado): verde, la marca de siempre de administracion',
  E.fianzaOk(conTransferencia('0')) === true && E.fianzaFalta(conTransferencia('0')) === '');
ok('v146: opcion 3 sin flag de cobro y sin Terminado: rojo, falta fianza',
  E.fianzaOk(conTransferencia('0', { TaBookings2021_Security_deposit_terminado: '0' })) === false && E.fianzaLabel(conTransferencia('0', { TaBookings2021_Security_deposit_terminado: '0' }), false) === 'Fianza/Waiver: falta fianza');
ok('v146: opcion 2 (tarjeta) con Terminado pero sin cobro sigue en rojo',
  E.fianzaOk(conDeposito('0', { TaBookings2021_Security_deposit_terminado: '1' })) === false);
ok('opcion 3 con importe 0: nada que cobrar, verde',
  E.fianzaOk(conTransferencia('0', { TaBookings2021_Security_deposit_EUR: '0' })) === true);
ok('opcion 4 (Airbnb sin waiver): verde sin mirar nada mas',
  E.fianzaOk(res({ TaBookings2021_Security_deposit_options: '4', TaBookings2021_Security_deposit_terminado: '0' })) === true);
ok('opcion 2 con importe 0: nada que cobrar, verde',
  E.fianzaOk(conDeposito('0', { TaBookings2021_Security_deposit_EUR: '0' })) === true);
ok('opcion 1 con waiver permitido pero importe 0: nada que cobrar, verde',
  E.fianzaOk(conWaiver('0', { TaBookings2021_Deposit_waver_EUR: '0' })) === true);
ok('opcion 2 como numero (2) y no texto: misma regla', E.fianzaOk(conDeposito('0', { TaBookings2021_Security_deposit_options: 2 })) === false);
ok('opcion 3 pendiente (sin cobro ni Terminado) deja la reserva en el filtro de pendientes',
  E.checkinPendiente(Object.assign(conTransferencia('0', { TaBookings2021_Security_deposit_terminado: '0' }), { TaBookings2021_Arrivalform_done: '1', TaBookings2021_Guest_adults_nr_form: '2', TaBookings2021_Registro_policia_done: '1' })) === true);
ok('en verde el texto es Fianza/Waiver', E.fianzaLabel(conWaiver('0'), true) === 'Fianza/Waiver');
ok('sin dato el texto es Fianza/Waiver', E.fianzaLabel(conWaiver('0'), null) === 'Fianza/Waiver');
ok('en rojo: Fianza/Waiver: falta waiver', E.fianzaLabel(conWaiver('0'), false) === 'Fianza/Waiver: falta waiver');
ok('en rojo: Fianza/Waiver: falta fianza', E.fianzaLabel(conDeposito('0'), false) === 'Fianza/Waiver: falta fianza');
ok('en rojo: Fianza/Waiver: sin elegir',
  E.fianzaLabel(res({ TaBookings2021_Security_deposit_options: '0', TaBookings2021_Security_deposit_terminado: '0' }), false) === 'Fianza/Waiver: sin elegir');
ok('el texto nunca dice Deposito ni decidido',
  ['fianza', 'waiver', 'elegir'].every(function (k) {
    var r = k === 'fianza' ? conDeposito('0') : k === 'waiver' ? conWaiver('0') : res({ TaBookings2021_Security_deposit_options: '0', TaBookings2021_Security_deposit_terminado: '0' });
    return !/dep[oó]sito|decidido/i.test(E.fianzaLabel(r, false));
  }));
var fzL = E._lvBdgFianza(conDeposito('0'), 'u');
ok('la insignia del listado pinta el motivo en rojo', fzL.indexOf('lv-no') > 0 && fzL.indexOf('Fianza/Waiver: falta fianza') > 0, fzL);
ok('  ...y en verde solo el nombre', E._lvBdgFianza(conDeposito('1'), 'u').indexOf('✓ Fianza/Waiver<') > 0, E._lvBdgFianza(conDeposito('1'), 'u'));
/* la regla de la formula de Caspio: ecotasa Y fianza/waiver equivale a paso4Local en las opciones 1 y 2
   (la opcion 3 se aparta a proposito, probado arriba) */
[res(), conWaiver('0'), conWaiver('1'), conDeposito('0'), conDeposito('1'),
 res({ TaBookings2021_Ecotasa_cobrada: '0' })].forEach(function (r, i) {
  ok('ecotasaOk Y fianzaOk equivale a paso4Local (caso ' + (i + 1) + ')',
    (E.ecotasaOk(r) === true && E.fianzaOk(r) === true) === (E.paso4Local(r) === true));
});
ok('la linea de PAGOS si conserva la etiqueta Ecotasa',
  E.paymentsLineHTML(res({ TaBookings2021_Ecotasa_cobrada: '0' })).indexOf('Ecotasa 30.00') > 0,
  E.paymentsLineHTML(res({ TaBookings2021_Ecotasa_cobrada: '0' })));

console.log('\n== G11: el arrival form necesita adultos (arrivalOk) ==');

function arr(done, form, resv) {
  var r = { TaBookings2021_Arrivalform_done: done };
  if (form !== undefined) r.TaBookings2021_Guest_adults_nr_form = form;
  if (resv !== undefined) r.TaBookings2021_Adults = resv;
  return r;
}
ok('formulario hecho con 2 adultos del formulario: verde', E.arrivalOk(arr('1', '2')) === true);
ok('formulario hecho, sin adultos en el formulario, 3 en la reserva: verde', E.arrivalOk(arr('1', '', '3')) === true);
ok('formulario hecho con 0 adultos: NO verde (el fallo de v143)', E.arrivalOk(arr('1', '0')) === false);
ok('el formulario manda sobre la reserva: 0 en el formulario y 2 en la reserva es NO verde',
  E.arrivalOk(arr('1', '0', '2')) === false);
ok('formulario hecho sin ningun dato de adultos: NO verde', E.arrivalOk(arr('1')) === false);
ok('formulario sin marcar: NO verde', E.arrivalOk(arr('0', '2')) === false);
ok('formulario vacio: NO verde', E.arrivalOk(arr('', '2')) === false);
ok('sin registro: NO verde', E.arrivalOk(null) === false);
ok('un -1 de Caspio tambien cuenta como marcado', E.arrivalOk(arr('-1', '2')) === true);

console.log('\n== G8: el filtro de pendientes (checkinPendiente) ==');

/* La formula vieja de Caspio: checkinonline_todo_terminado = Arrival Y Policia Y
   Deposito Y Ecotasa_cobrada. Aqui se escribe tal cual para comparar. */
function viejaFormulaPendiente(r) {
  var t = function (v) { return E.isOk(v) === true; };
  return !(t(r.TaBookings2021_Arrivalform_done) && t(r.TaBookings2021_Registro_policia_done) &&
    t(r.TaBookings2021_Security_deposit_terminado) && t(r.TaBookings2021_Ecotasa_cobrada));
}
/* Filas con los cuatro datos conocidos, adultos correctos y sin deuda de waiver ni
   deposito: la formula vieja y la nueva tienen que decir lo mismo. */
var tabla = [
  { n: 'todo hecho', af: '1', pol: '1', dep: '1', eco: '1', p4: '1' },
  { n: 'falta el arrival form', af: '0', pol: '1', dep: '1', eco: '1', p4: '1' },
  { n: 'falta la policia', af: '1', pol: '0', dep: '1', eco: '1', p4: '1' },
  { n: 'falta el deposito decidido', af: '1', pol: '1', dep: '0', eco: '1', p4: '1' },
  { n: 'falta la ecotasa', af: '1', pol: '1', dep: '1', eco: '0', p4: '0' },
  { n: 'no falta nada mas que la policia y la ecotasa', af: '1', pol: '0', dep: '1', eco: '0', p4: '0' },
  { n: 'nada hecho', af: '0', pol: '0', dep: '0', eco: '0', p4: '0' }
];
tabla.forEach(function (c) {
  var r = {
    TaBookings2021_Arrivalform_done: c.af,
    TaBookings2021_Guest_adults_nr_form: '2',
    TaBookings2021_Registro_policia_done: c.pol,
    TaBookings2021_Security_deposit_terminado: c.dep,
    TaBookings2021_Ecotasa_cobrada: c.eco,
    TaBookings2021_Paso4_terminado: c.p4
  };
  ok('coincide con la formula vieja: ' + c.n,
    E.checkinPendiente(r) === viejaFormulaPendiente(r),
    'nueva=' + E.checkinPendiente(r) + ' vieja=' + viejaFormulaPendiente(r));
});

/* Y donde tiene que separarse de la formula vieja (el motivo del cambio). */
var casoToni = {
  TaBookings2021_Arrivalform_done: '1', TaBookings2021_Guest_adults_nr_form: '2',
  TaBookings2021_Registro_policia_done: '1', TaBookings2021_Security_deposit_terminado: '1',
  TaBookings2021_Ecotasa_cobrada: '1', TaBookings2021_Paso4_terminado: '0',
  /* v145: el filtro lee los campos del waiver, no la formula */
  TaBookings2021_Security_deposit_options: '1', TaBookings2021_Se_permite_waver: '1',
  TaBookings2021_Deposit_waver_EUR: '40', TaBookings2021_Deposit_waver_cobrado: '0'
};
ok('con la ecotasa cobrada y el waiver sin cobrar la formula vieja decia "completa"',
  viejaFormulaPendiente(casoToni) === false);
ok('  ...y ahora sigue pendiente, como la insignia roja', E.checkinPendiente(casoToni) === true);

var casoAdultos = {
  TaBookings2021_Arrivalform_done: '1', TaBookings2021_Guest_adults_nr_form: '0',
  TaBookings2021_Registro_policia_done: '1', TaBookings2021_Security_deposit_terminado: '1',
  TaBookings2021_Ecotasa_cobrada: '1', TaBookings2021_Paso4_terminado: '1'
};
ok('el arrival form marcado con 0 adultos deja la reserva pendiente', E.checkinPendiente(casoAdultos) === true);

var casoSync = {
  TaBookings2021_Arrivalform_done: '1', TaBookings2021_Guest_adults_nr_form: '2',
  TaBookings2021_Registro_policia_done: '1', TaBookings2021_Security_deposit_terminado: '1',
  TaBookings2021_Ecotasa_cobrada: 1, TaBookings2021_Paso4_terminado: '0',
  TaBookings2021_Security_deposit_options: '1', TaBookings2021_Se_permite_waver: '20',
  __pagoOk: true
};
ok('si la sincronizacion de Stripe ha cerrado el paso 4, ya no esta pendiente',
  E.checkinPendiente(casoSync) === false);
ok('sin registro se considera pendiente', E.checkinPendiente(null) === true);
/* v145: una fianza cobrada cuenta aunque el paso 3 no este marcado (el dinero manda) */
var casoFianzaCobrada = {
  TaBookings2021_Arrivalform_done: '1', TaBookings2021_Guest_adults_nr_form: '2',
  TaBookings2021_Registro_policia_done: '1', TaBookings2021_Security_deposit_terminado: '0',
  TaBookings2021_Ecotasa_cobrada: '1', TaBookings2021_Security_deposit_options: '2',
  TaBookings2021_Security_deposit_EUR: '500', TaBookings2021_Security_deposit_cobrado: '1'
};
ok('v145: fianza cobrada con el paso 3 sin marcar no esta pendiente', E.checkinPendiente(casoFianzaCobrada) === false);
/* v147: estancia del propietario */
ok('v147: ownerStay no esta pendiente aunque todo este a 0', E.checkinPendiente(res({ TaBookings2021_BookingStatus: 'ownerStay', TaBookings2021_Arrivalform_done: '0', TaBookings2021_Registro_policia_done: '0', TaBookings2021_Ecotasa_cobrada: '0', TaBookings2021_Security_deposit_options: '0' })) === false);
ok('v147: huesped "Propietario" tampoco esta pendiente', E.checkinPendiente(res({ TaBookings2021_Guest_Full_Name: 'Propietario', TaBookings2021_Arrivalform_done: '0' })) === false);
ok('v147: una reserva normal con todo a 0 sigue pendiente', E.checkinPendiente(res({ TaBookings2021_BookingStatus: 'new', TaBookings2021_Arrivalform_done: '0' })) === true);
ok('v147: esPropietario reconoce ownerStay en cualquier mayuscula', E.esPropietario(res({ TaBookings2021_BookingStatus: 'OwnerStay' })) === true && E.esPropietario(res({ TaBookings2021_BookingStatus: 'modified' })) === false);

console.log('\n== la pagina (HTML) ==');

var linea3 = SRC.split('\n')[2];
/* v148: la linea de PAGOS y la fianza por transferencia (Toni 09/09/2026, reserva 65513925) */
function _dep(items){ return items.filter(function(i){ return i.key==='Deposito'; })[0]; }
ok('v148: transferencia con Terminado y sin flag de cobro sale PAGADA en PAGOS', _dep(E.calcPaymentItems(res({ TaBookings2021_Security_deposit_options: '3', TaBookings2021_Security_deposit_EUR: '900', TaBookings2021_Security_deposit_cobrado: '0', TaBookings2021_Security_deposit_terminado: 'Yes' }))).paid === true);
ok('v148: transferencia sin Terminado y sin flag sigue pendiente en PAGOS', _dep(E.calcPaymentItems(res({ TaBookings2021_Security_deposit_options: '3', TaBookings2021_Security_deposit_EUR: '900', TaBookings2021_Security_deposit_cobrado: '0', TaBookings2021_Security_deposit_terminado: 'No' }))).paid === false);
ok('v148: transferencia con el flag de cobro sale pagada', _dep(E.calcPaymentItems(res({ TaBookings2021_Security_deposit_options: '3', TaBookings2021_Security_deposit_EUR: '900', TaBookings2021_Security_deposit_cobrado: '1', TaBookings2021_Security_deposit_terminado: 'No' }))).paid === true);
ok('v148: la tarjeta (opcion 2) con solo Terminado NO sale pagada', _dep(E.calcPaymentItems(res({ TaBookings2021_Security_deposit_options: '2', TaBookings2021_Security_deposit_EUR: '900', TaBookings2021_Security_deposit_cobrado: '0', TaBookings2021_Security_deposit_terminado: 'Yes' }))).paid === false);
ok('v148: PAGOS y la insignia cuentan lo mismo para la 65513925', E.fianzaFalta(res({ TaBookings2021_Security_deposit_options: '3', TaBookings2021_Security_deposit_EUR: '900', TaBookings2021_Security_deposit_cobrado: '0', TaBookings2021_Security_deposit_terminado: 'Yes' })) === '');

ok('la cabecera dice VERSION ACTUAL v149', /VERSIÓN ACTUAL: v149/.test(linea3), linea3);
ok('PAGE_VERSION dice v149', /const PAGE_VERSION='v149';/.test(SRC));
ok('el titulo dice v149', /<title>Entradas Equipo v149/.test(SRC));
ok('el historial recoge v149 y conserva v148, v147, v146, v145, v144 y v143', /<!-- HISTORIAL: v149 - /.test(SRC) && /\| v148 - /.test(SRC) && /\| v147 - /.test(SRC) && /\| v146 - /.test(SRC) && /\| v145 - /.test(SRC) && /\| v144 - /.test(SRC) && /\| v143 - /.test(SRC));
ok('el historial de v144 nombra los seis arreglos',
  ['(G2)', '(G4)', '(G7)', '(G8)', '(G10)', '(G11)'].every(function (gg) {
    return SRC.indexOf('| v144 - ') > 0 && SRC.slice(SRC.indexOf('| v144 - ')).indexOf(gg) > 0;
  }));
ok('el historial de v145 cita a Toni y los dos nombres', /\| v145 - [^|]*Toni[^|]*Fianza\/Waiver/.test(SRC));
ok('el historial de v146 explica la regla de la transferencia (Terminado)', /\| v146 - [^|]*Terminado[^|]*Security_deposit_terminado/.test(SRC));
ok('v149: el lapiz de ecotasa abre la pagina de notas, no la DataPage antigua', /urlEcFix=`notas-equipo-reservas\.html\?TaBookings2021_FS_confirmation_code=\$\{encodeURIComponent\(code\)\}&ci=ecotasa`/.test(SRC) && !/dp\/353f70000f4226a745cb49129831/.test(SRC));
ok('el historial de v149 explica el lapiz y la intranet antigua', /<!-- HISTORIAL: v149 - [^|]*intranet antigua[^|]*notas-equipo-reservas\.html/.test(SRC));
ok('el historial de v147 explica la estancia del propietario', /\| v147 - [^|]*propietario[^|]*ownerStay/.test(SRC));

var CARD = fnSource('buildCard');
ok('el bloque de buildCard se ha leido entero', CARD.indexOf('c-body-wrap') > 0 && CARD.length > 4000);

console.log('\n== v145: Ecotasa y Fianza/Waiver en la ficha y en el listado ==');

ok('la ficha pinta la insignia Ecotasa con su nombre', CARD.indexOf('${ecIco} Ecotasa') > 0);
ok('  ...y ya no usa paso4Label', CARD.indexOf('paso4Label(') === -1);
ok('  ...conservando el importe y el lapiz (ecExtra)', CARD.indexOf('${ecExtra}</a>') > 0);
ok('  ...y la etiqueta (Stripe) de v143', CARD.indexOf("${ecStripe?' (Stripe)':''}") > 0);
ok('el color de la insignia Ecotasa sale de ecotasaOk', CARD.indexOf('const ecOk=ecotasaOk(r);') > 0);
ok('la insignia del listado usa ecotasaOk', fnSource('_lvBdgEco').indexOf('ecotasaOk(r)') > 0 && fnSource('_lvBdgEco').indexOf('paso4') === -1);
ok('la ficha pinta Fianza/Waiver con fianzaLabel', CARD.indexOf('mkBadge(fianzaLabel(r,fzOk)') > 0 && CARD.indexOf('const fzOk=fianzaOk(r);') > 0);
ok('el listado pinta Fianza/Waiver', SRC.indexOf('html+=_lvBdgFianza(r,urlDep);') > 0);
ok('ya no queda "Depósito decidido" ni "Paso 4" pintado en la pagina (solo en el historial y en las funciones de referencia)',
  SRC.indexOf("mkBadge('Depósito decidido'") === -1 && SRC.indexOf("_lvBdg('Depósito decidido'") === -1 &&
  SRC.indexOf("mkBadge('Depósito',") === -1 && SRC.indexOf("_lvBdg('Depósito',") === -1 && CARD.indexOf('Paso 4') === -1);

console.log('\n== G4: la linea de PAGOS en la ficha ==');

ok('buildCard llama a paymentsLineHTML', CARD.indexOf('paymentsLineHTML(r)') > 0);
ok('  ...solo si devuelve algo', /const _pagosLinea=paymentsLineHTML\(r\);\s*\n\s*if\(_pagosLinea\)html\+=_pagosLinea;/.test(CARD));
ok('  ...fuera del detalle plegado (antes de c-body-wrap)',
  CARD.indexOf('paymentsLineHTML(r)') < CARD.indexOf('c-body-wrap'));
ok('  ...justo despues de la fila de insignias',
  CARD.indexOf('paymentsLineHTML(r)') > CARD.indexOf('mkBadge(fianzaLabel(r,fzOk)'));
ok('la vista listado la sigue pintando', SRC.indexOf("html+=paymentsLineHTML(r);") > 0);
ok('hay un estilo propio de la ficha para esa linea', /\.card \.lv-payments\{/.test(SRC));
ok('una reserva sin conceptos con importe no pinta nada',
  E.paymentsLineHTML({ TaBookings2021_Ecotasa_final: '0' }) === '');

console.log('\n== G8, G10 y G11 en su sitio ==');

ok('el filtro llama a checkinPendiente', /const ciIsPending=checkinPendiente\(r\);/.test(SRC));
ok('  ...y ya no lee la formula checkinonline_todo_terminado',
  SRC.indexOf("g(r,'checkinPend')") === -1 && SRC.indexOf('Number(ciRaw)===3') === -1);
ok('la insignia Cierre abre la tarea como Limpieza y WelcomePack (openTaskPopup)',
  /mkBadge\('Cierre',g\(r,'cierre'\),urlCierre,'',true\)/.test(CARD));
ok('  ...y mkBadge sigue mandando el ultimo argumento a openTaskPopup',
  /if\(url&&newTab\)return`<a class="bdg \$\{cls\}" href="\$\{url\}" onclick="openTaskPopup\('\$\{url\}'\)/.test(fnSource('mkBadge')));
ok('la insignia Arrival form pasa por arrivalOk',
  /const _afVal=\(isOk\(_afRaw\)===true&&!arrivalOk\(r\)\)\?0:_afRaw;/.test(CARD) &&
  CARD.indexOf("mkBadge('Arrival form',_afVal,") > 0);

console.log('\n' + pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
