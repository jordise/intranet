/* Pruebas del cruce con Ta_payments y de la autorreparacion del flag (v143).
   node ecotasa-sync.test.js

   Como marcas-manuales.test.js: NO copia el codigo de la pagina. Extrae el texto
   real de cada funcion de entradas-equipo.html y lo ejecuta. Si alguien edita la
   pagina, estas pruebas corren el codigo NUEVO.
   Nunca se llama al proxy: fetch se pasa como parametro y es un doble local. */
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
function fnSource(name) {
  var esAsync = SRC.indexOf('async function ' + name + '(') >= 0;
  return bloque((esAsync ? 'async function ' : 'function ') + name + '(', '{', '}');
}
function constantes() {
  return [
    bloque('const F = {', '{', '}') + ';',
    bloque('var ECO_PAY_MAP=[', '[', ']') + ';',
    'var ECO_MARGEN=' + (/var ECO_MARGEN=([0-9.]+);/.exec(SRC) || [])[1] + ';',
    bloque("var ECO_ROLES_OK=['admin'", '[', ']') + ';'
  ].join('\n');
}

/* Entorno de las funciones puras. Auth se inyecta para el sello del rastro. */
function makeEnv(auth) {
  var body = [
    constantes(),
    fnSource('g'), fnSource('_lvNum'), fnSource('_lvBool1'),
    fnSource('calcPaymentItems'), fnSource('paymentsLineHTML'), fnSource('_lvBdg'),
    fnSource('isOk'),
    fnSource('_ecoCodigoValido'), fnSource('pagosPendientes'), fnSource('pagosWhere'),
    fnSource('pagosStripeMerge'), fnSource('decidirReparacion'), fnSource('aplicarCandidato'), fnSource('paso4Falta'), fnSource('paso4Label'),
    fnSource('marcaSelloStripe'), fnSource('paso4Local'), fnSource('_lvBdgEco'), fnSource('ecotasaOk'), fnSource('fianzaFalta'), fnSource('fianzaOk'), fnSource('fianzaLabel'), fnSource('_lvBdgFianza'), /* v145 */
    'return {pagosPendientes:pagosPendientes,pagosWhere:pagosWhere,pagosStripeMerge:pagosStripeMerge,' +
    'decidirReparacion:decidirReparacion,aplicarCandidato:aplicarCandidato,paso4Local:paso4Local,' +
    'calcPaymentItems:calcPaymentItems,paymentsLineHTML:paymentsLineHTML,marcaSelloStripe:marcaSelloStripe,' +
    '_lvBdgEco:_lvBdgEco,_lvBdgFianza:_lvBdgFianza,ecotasaOk:ecotasaOk,fianzaOk:fianzaOk};'
  ].join('\n');
  return new Function('Auth', body)(auth || { name: function () { return 'Toni Segui'; } });
}

/* Entorno de syncPagosStripe: fetch, renderCards, repararFlagStripe y el DOM son dobles. */
function makeSyncEnv(opts) {
  opts = opts || {};
  var log = { fetch: [], render: 0, writes: [] };
  var fakeFetch = function (url) {
    log.fetch.push(url);
    if (url.indexOf('table=Ta_payments') > 0) {
      if (opts.failPayments) return Promise.reject(new Error('boom pagos'));
      return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ Result: opts.payments || [] }); } });
    }
    if (url.indexOf('table=TaBookings2021') > 0) {
      if (opts.failBooking) return Promise.reject(new Error('boom reserva'));
      var m = /FS_confirmation_code(?:%3D|=)(?:%27|')([A-Za-z0-9_-]+)/.exec(url) || [];
      var row = (opts.live || {})[m[1]];
      return Promise.resolve({ ok: true, json: function () { return Promise.resolve({ Result: row ? [row] : [] }); } });
    }
    throw new Error('URL inesperada en la prueba: ' + url);
  };
  var body = [
    constantes(),
    fnSource('g'), fnSource('_lvNum'), fnSource('_lvBool1'),
    fnSource('_ecoCodigoValido'), fnSource('pagosPendientes'), fnSource('pagosWhere'),
    fnSource('pagosStripeMerge'), fnSource('decidirReparacion'), fnSource('aplicarCandidato'),
    fnSource('syncPagosStripe'),
    'return syncPagosStripe;'
  ].join('\n');
  var f = new Function('ECO_SYNC', 'ECO_SYNC_WRITE', '_searchId', 'Auth', 'WORKER', 'fetch', 'console', 'renderCards', 'repararFlagStripe', '$', body);
  var sync = f(
    opts.ECO_SYNC === undefined ? 1 : opts.ECO_SYNC,
    opts.ECO_SYNC_WRITE === undefined ? 1 : opts.ECO_SYNC_WRITE,
    opts.searchId === undefined ? 1 : opts.searchId,
    {
      url: function (u) { return u + '&token=X'; },
      role: function () { return opts.role === undefined ? 'staff' : opts.role; },
      name: function () { return 'Toni Segui'; }
    },
    'https://proxy.local.invalid',
    fakeFetch,
    { warn: function () { }, info: function () { }, log: function () { } },
    function () { log.render++; },
    function (change) { log.writes.push(change); return Promise.resolve(); },
    function () { return { innerHTML: '' }; }
  );
  return { sync: sync, log: log };
}

/* Entorno aparte para repararFlagStripe: solo se mira lo que se manda al PUT. */
function makeWriteEnv() {
  var log = { puts: [] };
  var fakeFetch = function (url, opts) {
    log.puts.push({ url: url, body: JSON.parse(opts.body) });
    return Promise.resolve({ ok: true });
  };
  var body = [
    fnSource('_lvBool1'), fnSource('_ecoCodigoValido'),
    fnSource('marcaSelloStripe'), fnSource('repararFlagStripe'),
    'return repararFlagStripe;'
  ].join('\n');
  var f = new Function('ECO_SYNC', 'ECO_SYNC_WRITE', 'ECO_MARCAS_MAX', '_ecoRepaired', 'Auth', 'WORKER', 'fetch', 'console', body);
  return {
    reparar: f(1, 1, 3800, new Set(),
      { url: function (u) { return u + '&token=X'; }, name: function () { return 'Toni Segui'; } },
      'https://proxy.local.invalid', fakeFetch, { warn: function () { }, info: function () { } }),
    log: log
  };
}

/* Reserva de ejemplo: ecotasa de 30 euros sin cobrar. */
function resEco(code, cobrada, extra) {
  var r = {
    TaBookings2021_FS_confirmation_code: code,
    TaBookings2021_Ecotasa_final: '30',
    TaBookings2021_Ecotasa_cobrada: cobrada === undefined ? '0' : cobrada
  };
  for (var k in (extra || {})) r[k] = extra[k];
  return r;
}
/* Fila de Ta_payments: por defecto cobro completo de la ecotasa de 30 euros. */
function fila(code, campos) {
  var row = { HS_confirmation_code: code, Status: 'COBRADO', Pago_ecotasa: 1, importe_ecotasa: 30 };
  for (var k in (campos || {})) row[k] = campos[k];
  return row;
}
var CAMPO_ECO = [{ field: 'Ecotasa_cobrada', label: 'Ecotasa', key: 'Ecotasa' }];

/* Segunda pasada de la revision: el importe de una fila solo cuenta si esa fila dice Pago_ecotasa=1. */
(function () {
  var E0 = makeEnv();
  var r = resEco('TEST0002', '0', { TaBookings2021_Ecotasa_final: '61.60' });
  var rows = [
    { HS_confirmation_code: 'TEST0002', Status: 'COBRADO', Pago_ecotasa: 0, importe_ecotasa: 61.6, Pago_deposito_seguridad: 1 },
    { HS_confirmation_code: 'TEST0002', Status: 'COBRADO', Pago_ecotasa: 1, importe_ecotasa: 3 }
  ];
  ok('importe de una fila con Pago_ecotasa=0 no cuenta: 3 de 61.60 no es candidato', E0.pagosStripeMerge([r], rows).length === 0);
  var rows2 = [
    { HS_confirmation_code: 'TEST0002', Status: 'COBRADO', Pago_ecotasa: 1, importe_ecotasa: 30.8 },
    { HS_confirmation_code: 'TEST0002', Status: 'COBRADO', Pago_ecotasa: 1, importe_ecotasa: 30.8 }
  ];
  ok('dos filas con Pago_ecotasa=1 que suman el importe: candidato', E0.pagosStripeMerge([r], rows2).length === 1);
})();

var E = makeEnv();

console.log('\n== cruce con Ta_payments (pagosStripeMerge) ==');

/* 1. cobro real de la ecotasa con el flag a 0 */
var r1 = resEco('64988127');
var c1 = E.pagosStripeMerge([r1], [fila('64988127')]);
ok('un cobro COBRADO de ecotasa con el flag a 0 sale como candidato', c1.length === 1, JSON.stringify(c1));
ok('  ...sobre el campo Ecotasa_cobrada', c1[0].fields[0].field === 'Ecotasa_cobrada', JSON.stringify(c1[0].fields));
ok('  ...y pagosStripeMerge NO toca el registro (decide despues)', r1.TaBookings2021_Ecotasa_cobrada === '0' && !r1.__stripe && !r1.__pagoOk);
E.aplicarCandidato(r1, c1[0].fields, true);
ok('aplicarCandidato pone el flag a 1 en memoria', r1.TaBookings2021_Ecotasa_cobrada === 1);
ok('  ...marca la reserva como tocada por la sincronizacion', r1.__pagoOk === true);
ok('  ...y la apunta como pago leido de Stripe', r1.__stripe && r1.__stripe.Ecotasa === true);
ok('  ...con lo que el concepto pasa a cobrado', E.calcPaymentItems(r1)[0].paid === true);

/* 2 y 3. estados que no son dinero recibido */
ok('una fila NOT PAID no genera nada',
  E.pagosStripeMerge([resEco('A1')], [fila('A1', { Status: 'NOT PAID' })]).length === 0);
ok('una fila ALREADY PAID no genera nada',
  E.pagosStripeMerge([resEco('A1')], [fila('A1', { Status: 'ALREADY PAID' })]).length === 0);

/* 4. el flag ya esta bien */
ok('si el flag ya esta a 1 no hay nada que reparar',
  E.pagosStripeMerge([resEco('A1', '1')], [fila('A1')]).length === 0);

/* 5. extras */
var r5 = resEco('B2', '1', { TaBookings2021_Upselling2_EUR: '45', TaBookings2021_Upselling2_cobrado: '0', TaBookings2021_Upselling2_text: 'Cuna' });
var c5 = E.pagosStripeMerge([r5], [{ HS_confirmation_code: 'B2', Status: 'COBRADO', Pago_Linea2: 1, importe_upselling2: 45 }]);
ok('Pago_Linea2 mapea a Upselling2_cobrado', c5.length === 1 && c5[0].fields[0].field === 'Upselling2_cobrado', JSON.stringify(c5));
ok('  ...con la clave Upselling2 para la etiqueta (Stripe)', c5[0].fields[0].key === 'Upselling2');
ok('  ...y la etiqueta del rastro es Extra 2', c5[0].fields[0].label === 'Extra 2');

/* 6. fila de una reserva que no esta en pantalla */
ok('una fila de otra reserva se ignora',
  E.pagosStripeMerge([resEco('A1')], [fila('ZZZ9')]).length === 0);

/* nunca se tocan deposito, gastos de tarjeta ni waiver */
var mapa = bloque('var ECO_PAY_MAP=[', '[', ']');
ok('el mapa solo cubre los 4 flags del disparador de Caspio',
  /Ecotasa_cobrada/.test(mapa) && /Upselling3_cobrado/.test(mapa) &&
  !/deposit/i.test(mapa) && !/waver|waiver/i.test(mapa) && !/tarjeta/i.test(mapa));

console.log('\n== el dinero tiene que cuadrar ==');

/* pago parcial */
var rPar = resEco('M1', '0', { TaBookings2021_Ecotasa_final: '46.20' });
ok('un pago parcial (3 de 46,20) no genera candidato',
  E.pagosStripeMerge([rPar], [fila('M1', { importe_ecotasa: 3 })]).length === 0);
ok('  ...y no toca el registro', rPar.TaBookings2021_Ecotasa_cobrada === '0' && !rPar.__pagoOk);

/* varias filas que juntas cubren el importe */
var c2rows = E.pagosStripeMerge([resEco('M2', '0', { TaBookings2021_Ecotasa_final: '46.20' })],
  [fila('M2', { importe_ecotasa: 20 }), fila('M2', { importe_ecotasa: 26.20 })]);
ok('dos cobros COBRADO que juntos cubren el importe si generan candidato', c2rows.length === 1, JSON.stringify(c2rows));

/* importe exacto y margen de redondeo */
ok('el importe exacto genera candidato',
  E.pagosStripeMerge([resEco('M3', '0', { TaBookings2021_Ecotasa_final: '46.20' })], [fila('M3', { importe_ecotasa: 46.20 })]).length === 1);
ok('un centimo de menos (dentro del margen de 0,05) genera candidato',
  E.pagosStripeMerge([resEco('M4', '0', { TaBookings2021_Ecotasa_final: '30' })], [fila('M4', { importe_ecotasa: 29.96 })]).length === 1);
ok('diez centimos de menos ya no genera candidato',
  E.pagosStripeMerge([resEco('M5', '0', { TaBookings2021_Ecotasa_final: '30' })], [fila('M5', { importe_ecotasa: 29.90 })]).length === 0);
ok('pagar de mas tambien vale',
  E.pagosStripeMerge([resEco('M6', '0', { TaBookings2021_Ecotasa_final: '30' })], [fila('M6', { importe_ecotasa: 35 })]).length === 1);

/* la reserva no dice cuanto debe */
ok('sin importe en la reserva no se decide nada',
  E.pagosStripeMerge([resEco('M7', '0', { TaBookings2021_Ecotasa_final: '' })], [fila('M7')]).length === 0);
ok('con importe 0 en la reserva tampoco',
  E.pagosStripeMerge([resEco('M8', '0', { TaBookings2021_Ecotasa_final: '0' })], [fila('M8', { importe_ecotasa: 0 })]).length === 0);

/* el importe de un extra no cuenta para la ecotasa */
ok('el importe de un extra no cubre la ecotasa',
  E.pagosStripeMerge([resEco('M9')], [{ HS_confirmation_code: 'M9', Status: 'COBRADO', Pago_ecotasa: 1, importe_upselling1: 100 }]).length === 0);

/* una fila NOT PAID no suma importe */
ok('el importe de una fila NOT PAID no suma',
  E.pagosStripeMerge([resEco('M10')], [fila('M10', { Status: 'NOT PAID' }), fila('M10', { importe_ecotasa: 10 })]).length === 0);

console.log('\n== que reservas se consultan (pagosPendientes) ==');

var pagada = resEco('P1', '1');
var pendiente = resEco('P2', '0');
var sinCodigo = resEco('', '0');
var sinImporte = { TaBookings2021_FS_confirmation_code: 'P4' };
var soloDeposito = resEco('P5', '1', {
  TaBookings2021_Security_deposit_options: 2, TaBookings2021_Security_deposit_EUR: '500',
  TaBookings2021_Security_deposit_cobrado: '0', TaBookings2021_Gasto_tarjeta_deposito_seguridad: '15',
  TaBookings2021_Gasto_tarjeta_dep_seguri_cobrado: '0'
});
var soloWaiver = resEco('P6', '1', {
  TaBookings2021_Security_deposit_options: 1, TaBookings2021_Deposit_waver_EUR: '60',
  TaBookings2021_Deposit_waver_cobrado: '0', TaBookings2021_Se_permite_waver: 1
});
var extraPend = resEco('P7', '1', { TaBookings2021_Upselling1_EUR: '20', TaBookings2021_Upselling1_cobrado: '0' });
var sinEuros = resEco('P8', '0', { TaBookings2021_Ecotasa_final: '' });
var pend = E.pagosPendientes([pagada, pendiente, sinCodigo, sinImporte, soloDeposito, soloWaiver, extraPend, sinEuros]);
ok('entra la reserva con la ecotasa sin cobrar', pend.indexOf(pendiente) >= 0);
ok('entra la reserva con un extra sin cobrar', pend.indexOf(extraPend) >= 0);
ok('un deposito pendiente NO hace consultar pagos', pend.indexOf(soloDeposito) === -1);
ok('un waiver pendiente NO hace consultar pagos', pend.indexOf(soloWaiver) === -1);
ok('una reserva con todo cobrado no entra', pend.indexOf(pagada) === -1);
ok('una reserva sin conceptos con importe no entra', pend.indexOf(sinImporte) === -1);
ok('una ecotasa pendiente sin importe no entra', pend.indexOf(sinEuros) === -1);
ok('una reserva sin codigo no entra', pend.indexOf(sinCodigo) === -1);
ok('en total solo dos reservas', pend.length === 2, String(pend.length));

console.log('\n== WHERE de Ta_payments (pagosWhere) ==');

var w = E.pagosWhere(['64988127', 'AB-12_x']);
ok('el WHERE exige Status COBRADO', w.indexOf("Status='COBRADO' AND (") === 0, w);
ok('  ...y encadena los codigos con OR', w.indexOf("HS_confirmation_code='64988127' OR HS_confirmation_code='AB-12_x'") > 0, w);
var w2 = E.pagosWhere(["A1' OR 1=1--", 'con espacio', '%', '', null, 'BUENO1']);
ok('los codigos con caracteres raros se descartan', w2 === "Status='COBRADO' AND (HS_confirmation_code='BUENO1')", w2);
ok('  ...incluida la comilla simple', w2.indexOf("1=1") === -1, w2);
ok('sin codigos validos no se construye ningun WHERE', E.pagosWhere(['%%%']) === '' && E.pagosWhere([]) === '');
ok('el doblado de comillas sigue en el codigo como segunda barrera',
  /replace\(\/'\/g,"''"\)/.test(fnSource('pagosWhere')), fnSource('pagosWhere'));

console.log('\n== decision antes de escribir (decidirReparacion) ==');

var cand = { code: 'C1', fields: CAMPO_ECO };
ok('si la tabla ya tiene el flag a 1 la decision es "ya"',
  E.decidirReparacion(cand, { Ecotasa_cobrada: '1' })[0].accion === 'ya');
ok('una linea "[Ecotasa desmarcado ...]" en Marcas_manuales da "no"',
  E.decidirReparacion(cand, { Ecotasa_cobrada: '0', Marcas_manuales: '[Ecotasa marcado 01/09/2026 10:00 - Toni Segui]\n[Ecotasa desmarcado 02/09/2026 09:10 - Toni Segui]' })[0].accion === 'no');
ok('el comentario "Anulada ecotasa porque no vinieron" da "no"',
  E.decidirReparacion(cand, { Ecotasa_cobrada: '0', Ecotasa_comentarios: 'Anulada ecotasa porque no vinieron' })[0].accion === 'no');
ok('el comentario "pago de la ecotasa devuelto" da "no"',
  E.decidirReparacion(cand, { Ecotasa_cobrada: '0', Ecotasa_comentarios: 'pago de la ecotasa devuelto' })[0].accion === 'no');
ok('un comentario normal no bloquea la reparacion',
  E.decidirReparacion(cand, { Ecotasa_cobrada: '0', Ecotasa_comentarios: 'Pagan en efectivo a la llegada' })[0].accion === 'reparar');
ok('sin marcas ni comentario la decision es "reparar"',
  E.decidirReparacion(cand, { Ecotasa_cobrada: '0' })[0].accion === 'reparar');
ok('el comentario de ecotasa no bloquea un extra',
  E.decidirReparacion({ code: 'C1', fields: [{ field: 'Upselling1_cobrado', label: 'Extra 1', key: 'Upselling1' }] },
    { Upselling1_cobrado: '0', Ecotasa_comentarios: 'ecotasa devuelta' })[0].accion === 'reparar');
ok('un extra desmarcado a mano tambien da "no"',
  E.decidirReparacion({ code: 'C1', fields: [{ field: 'Upselling1_cobrado', label: 'Extra 1', key: 'Upselling1' }] },
    { Upselling1_cobrado: '0', Marcas_manuales: '[Extra 1 desmarcado 02/09/2026 09:10 - Toni Segui]' })[0].accion === 'no');

console.log('\n== la insignia repite la formula de Caspio (paso4Local) ==');

ok('sin ecotasa cobrada, nunca',
  E.paso4Local({ TaBookings2021_Ecotasa_cobrada: '0', TaBookings2021_Security_deposit_options: 3 }) === false);
ok('opcion 2 (deposito): hace falta el deposito cobrado',
  E.paso4Local({ TaBookings2021_Ecotasa_cobrada: '1', TaBookings2021_Security_deposit_options: 2, TaBookings2021_Security_deposit_cobrado: '0' }) === false);
ok('opcion 2 con el deposito cobrado: si',
  E.paso4Local({ TaBookings2021_Ecotasa_cobrada: '1', TaBookings2021_Security_deposit_options: 2, TaBookings2021_Security_deposit_cobrado: '1' }) === true);
ok('opcion 1 (waiver) permitido y sin cobrar: no',
  E.paso4Local({ TaBookings2021_Ecotasa_cobrada: '1', TaBookings2021_Security_deposit_options: 1, TaBookings2021_Se_permite_waver: 1, TaBookings2021_Deposit_waver_cobrado: '0' }) === false);
ok('opcion 1 con el waiver cobrado: si',
  E.paso4Local({ TaBookings2021_Ecotasa_cobrada: '1', TaBookings2021_Security_deposit_options: 1, TaBookings2021_Se_permite_waver: 1, TaBookings2021_Deposit_waver_cobrado: '1' }) === true);
ok('opcion 1 con el waiver no permitido: si',
  E.paso4Local({ TaBookings2021_Ecotasa_cobrada: '1', TaBookings2021_Security_deposit_options: 1, TaBookings2021_Se_permite_waver: 0, TaBookings2021_Deposit_waver_cobrado: '0' }) === true);
ok('cualquier otra opcion: basta la ecotasa',
  E.paso4Local({ TaBookings2021_Ecotasa_cobrada: '1', TaBookings2021_Security_deposit_options: 3 }) === true &&
  E.paso4Local({ TaBookings2021_Ecotasa_cobrada: '1' }) === true);
ok('los extras no entran en la formula',
  E.paso4Local({ TaBookings2021_Ecotasa_cobrada: '1', TaBookings2021_Upselling1_EUR: '20', TaBookings2021_Upselling1_cobrado: '0' }) === true);

console.log('\n== orden de trabajo (syncPagosStripe con dobles) ==');

/* Casos encadenados: cada uno con su entorno limpio. */
(async function () {
  /* caso "reparar": lee pagos, lee la reserva, repinta una vez y escribe una vez */
  var A = makeSyncEnv({ payments: [fila('64988127')], live: { '64988127': { Ecotasa_cobrada: '0', Marcas_manuales: '' } } });
  var recsA = [resEco('64988127')];
  await A.sync(recsA, [], {}, 1);
  ok('se consulta Ta_payments y despues la fila viva de TaBookings2021',
    A.log.fetch.length === 2 && A.log.fetch[0].indexOf('table=Ta_payments') > 0 && A.log.fetch[1].indexOf('table=TaBookings2021') > 0,
    JSON.stringify(A.log.fetch));
  ok('  ...se repinta una sola vez', A.log.render === 1, String(A.log.render));
  ok('  ...se escribe el flag una sola vez', A.log.writes.length === 1, String(A.log.writes.length));
  ok('  ...la linea de pagos muestra el cobro con etiqueta (Stripe)',
    /\(Stripe\)/.test(E.paymentsLineHTML(recsA[0])), E.paymentsLineHTML(recsA[0]));
  ok('  ...y la insignia del listado sale verde con etiqueta (Stripe)',
    E._lvBdgEco(recsA[0], 'u').indexOf('lv-ok') > 0 && E._lvBdgEco(recsA[0], 'u').indexOf('Ecotasa (Stripe)') > 0, E._lvBdgEco(recsA[0], 'u'));

  /* caso "no": ecotasa anulada a proposito */
  var B = makeSyncEnv({ payments: [fila('X2')], live: { 'X2': { Ecotasa_cobrada: '0', Ecotasa_comentarios: 'Anulada ecotasa porque no vinieron' } } });
  var recsB = [resEco('X2')];
  await B.sync(recsB, [], {}, 1);
  ok('una ecotasa anulada a proposito no se escribe', B.log.writes.length === 0);
  ok('  ...ni se repinta', B.log.render === 0);
  ok('  ...ni cambia en pantalla', recsB[0].TaBookings2021_Ecotasa_cobrada === '0' && !recsB[0].__stripe && !recsB[0].__pagoOk);

  /* caso "ya": la tabla ya estaba bien, solo la vista venia vieja */
  var C = makeSyncEnv({ payments: [fila('X3')], live: { 'X3': { Ecotasa_cobrada: '1' } } });
  var recsC = [resEco('X3')];
  await C.sync(recsC, [], {}, 1);
  ok('si la tabla ya estaba bien se repinta pero no se escribe', C.log.render === 1 && C.log.writes.length === 0);
  ok('  ...el concepto sale cobrado SIN la etiqueta (Stripe)',
    recsC[0].TaBookings2021_Ecotasa_cobrada === 1 && !recsC[0].__stripe && !/\(Stripe\)/.test(E.paymentsLineHTML(recsC[0])));
  ok('  ...y la insignia se pone verde SIN la etiqueta (Stripe)',
    recsC[0].__pagoOk === true && E._lvBdgEco(recsC[0], 'u').indexOf('lv-ok') > 0 && E._lvBdgEco(recsC[0], 'u').indexOf('(Stripe)') === -1,
    E._lvBdgEco(recsC[0], 'u'));

  /* la insignia respeta el deposito pendiente aunque la ecotasa se haya reparado */
  var D2 = makeSyncEnv({ payments: [fila('X10')], live: { 'X10': { Ecotasa_cobrada: '0' } } });
  var recsD2 = [resEco('X10', '0', { TaBookings2021_Security_deposit_options: 2, TaBookings2021_Security_deposit_EUR: '500', TaBookings2021_Security_deposit_cobrado: '0' })]; /* v145: con importe, si no no hay nada que cobrar */
  await D2.sync(recsD2, [], {}, 1);
  /* v145: la insignia Ecotasa mide solo la ecotasa; el deposito pendiente vive en Fianza/Waiver */
  ok('v145: con el deposito pendiente la insignia Ecotasa SI se pone verde (la ecotasa esta cobrada)', E._lvBdgEco(recsD2[0], 'u').indexOf('lv-ok') > 0, E._lvBdgEco(recsD2[0], 'u'));
  ok('  ...y la insignia Fianza/Waiver queda en rojo diciendo que falta la fianza',
    E._lvBdgFianza(recsD2[0], 'u').indexOf('lv-no') > 0 && E._lvBdgFianza(recsD2[0], 'u').indexOf('falta fianza') > 0, E._lvBdgFianza(recsD2[0], 'u'));
  recsD2[0].TaBookings2021_Paso4_terminado = '1';
  ok('la formula Paso4_terminado ya no pinta la insignia Ecotasa', E._lvBdgEco(recsD2[0], 'u').indexOf('lv-ok') > 0, E._lvBdgEco(recsD2[0], 'u'));

  /* si falla la lectura de la reserva no se toca nada */
  var D = makeSyncEnv({ payments: [fila('X4')], failBooking: true });
  var recsD = [resEco('X4')];
  await D.sync(recsD, [], {}, 1);
  ok('si no se puede leer la fila viva no se cambia ni se escribe nada',
    D.log.render === 0 && D.log.writes.length === 0 && !recsD[0].__pagoOk);

  /* si falla Ta_payments la pagina se queda como en v142 */
  var G = makeSyncEnv({ failPayments: true });
  await G.sync([resEco('X5')], [], {}, 1);
  ok('si falla Ta_payments no hay repintado ni escritura', G.log.render === 0 && G.log.writes.length === 0);

  /* interruptores */
  var H = makeSyncEnv({ ECO_SYNC: 0, payments: [fila('X6')], live: { 'X6': { Ecotasa_cobrada: '0' } } });
  await H.sync([resEco('X6')], [], {}, 1);
  ok('con ECO_SYNC=0 no se consulta nada', H.log.fetch.length === 0);

  var I = makeSyncEnv({ ECO_SYNC_WRITE: 0, payments: [fila('X7')], live: { 'X7': { Ecotasa_cobrada: '0' } } });
  var recsI = [resEco('X7')];
  await I.sync(recsI, [], {}, 1);
  ok('con ECO_SYNC_WRITE=0 se muestra el pago pero no se escribe',
    I.log.render === 1 && I.log.writes.length === 0 && recsI[0].__stripe.Ecotasa === true);

  /* busqueda ya sustituida */
  var J = makeSyncEnv({ searchId: 2, payments: [fila('X8')], live: { 'X8': { Ecotasa_cobrada: '0' } } });
  await J.sync([resEco('X8')], [], {}, 1);
  ok('una respuesta de una busqueda ya sustituida no repinta', J.log.render === 0);
  ok('  ...y no llega a leer la reserva', J.log.fetch.length === 1, JSON.stringify(J.log.fetch));

  /* sin nada pendiente */
  var K = makeSyncEnv({});
  await K.sync([resEco('X9', '1')], [], {}, 1);
  ok('sin conceptos pendientes no se llama a Ta_payments', K.log.fetch.length === 0);

  /* roles */
  var L = makeSyncEnv({ role: 'cleaner', payments: [fila('X11')], live: { 'X11': { Ecotasa_cobrada: '0' } } });
  var recsL = [resEco('X11')];
  await L.sync(recsL, [], {}, 1);
  ok('el rol cleaner no consulta pagos', L.log.fetch.length === 0);
  ok('  ...ni escribe ni cambia la pantalla', L.log.writes.length === 0 && L.log.render === 0 && !recsL[0].__pagoOk);

  var M = makeSyncEnv({ role: 'sales', payments: [fila('X12')], live: { 'X12': { Ecotasa_cobrada: '0' } } });
  await M.sync([resEco('X12')], [], {}, 1);
  ok('el rol sales tampoco consulta pagos', M.log.fetch.length === 0);

  var N = makeSyncEnv({ role: '', payments: [fila('X13')], live: { 'X13': { Ecotasa_cobrada: '0' } } });
  await N.sync([resEco('X13')], [], {}, 1);
  ok('sin rol conocido no se consulta nada', N.log.fetch.length === 0);

  for (var idx = 0; idx < 3; idx++) {
    var rolOk = ['admin', 'manager', 'staff'][idx];
    var O = makeSyncEnv({ role: rolOk, payments: [fila('X14')], live: { 'X14': { Ecotasa_cobrada: '0' } } });
    await O.sync([resEco('X14')], [], {}, 1);
    ok('el rol ' + rolOk + ' si consulta y repara', O.log.fetch.length === 2 && O.log.writes.length === 1);
  }

  console.log('\n== lo que se escribe (repararFlagStripe) ==');

  var W = makeWriteEnv();
  await W.reparar({ code: 'E1', fields: CAMPO_ECO, r: {} }, { Ecotasa_cobrada: '0', Marcas_manuales: '[Deposito marcado 01/09/2026 10:00 - Marta]' });
  ok('el PUT va sobre la reserva por FS_confirmation_code', W.log.puts.length === 1 && W.log.puts[0].url.indexOf('action=save&table=TaBookings2021') > 0, JSON.stringify(W.log.puts));
  ok('  ...pone el flag a 1', W.log.puts[0].body.Ecotasa_cobrada === 1);
  ok('  ...no toca ningun otro flag', Object.keys(W.log.puts[0].body).sort().join(',') === 'Ecotasa_cobrada,Marcas_manuales');
  ok('  ...conserva el historial anterior', W.log.puts[0].body.Marcas_manuales.split('\n')[0] === '[Deposito marcado 01/09/2026 10:00 - Marta]');
  ok('  ...anade el sello de Stripe al final', /\[Ecotasa marcado .* - intranet \(pago en Stripe, visto por Toni Segui\)\]$/.test(W.log.puts[0].body.Marcas_manuales), W.log.puts[0].body.Marcas_manuales);

  await W.reparar({ code: 'E1', fields: CAMPO_ECO, r: {} }, { Ecotasa_cobrada: '0', Marcas_manuales: '' });
  ok('el mismo campo no se escribe dos veces en la misma carga', W.log.puts.length === 1, String(W.log.puts.length));

  var W2 = makeWriteEnv();
  await W2.reparar({ code: 'E2', fields: CAMPO_ECO, r: {} }, { Ecotasa_cobrada: '1' });
  ok('si la tabla ya tiene el flag a 1 no se escribe nada', W2.log.puts.length === 0);

  var W3 = makeWriteEnv();
  await W3.reparar({ code: 'E3', fields: CAMPO_ECO, r: {} }, { Ecotasa_cobrada: '0' });
  ok('si no se pudo leer Marcas_manuales, el campo no viaja en el PUT', !('Marcas_manuales' in W3.log.puts[0].body));

  var largo = [];
  for (var i = 0; i < 200; i++) largo.push('[Deposito marcado 01/09/2026 10:00 - Usuario numero ' + i + ']');
  var W4 = makeWriteEnv();
  await W4.reparar({ code: 'E4', fields: CAMPO_ECO, r: {} }, { Ecotasa_cobrada: '0', Marcas_manuales: largo.join('\n') });
  var txt = W4.log.puts[0].body.Marcas_manuales;
  ok('el tope de 3800 caracteres se respeta', txt.length <= 3800, String(txt.length));
  ok('  ...cortando lineas enteras y dejando el sello nuevo el ultimo',
    txt.split('\n').every(function (l) { return l.charAt(0) === '[' && l.charAt(l.length - 1) === ']'; }) &&
    txt.split('\n').pop().indexOf('[Ecotasa marcado ') === 0);
})().then(finalizar, function (e) { fail++; console.log('  FAIL  error inesperado -> ' + (e && e.stack)); finalizar(); });

function finalizar() {
  console.log('\n== rastro y etiquetas ==');

  var sello = E.marcaSelloStripe('Ecotasa');
  ok('el rastro usa la etiqueta Ecotasa que leen las paginas de notas', sello.indexOf('[Ecotasa marcado ') === 0, sello);
  ok('  ...con fecha DD/MM/AAAA y hora HH:MM', /^\[Ecotasa marcado \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} - /.test(sello), sello);
  ok('  ...dice de donde viene el cobro y quien lo vio', sello.indexOf('- intranet (pago en Stripe, visto por Toni Segui)]') > 0, sello);
  ok('sin nombre de sesion el sello dice equipo', makeEnv({}).marcaSelloStripe('Ecotasa').indexOf('visto por equipo)]') > 0);

  /* la etiqueta (Stripe) solo va en los conceptos que hemos dado por pagados */
  var rMix = resEco('T1', '0', { TaBookings2021_Upselling1_EUR: '20', TaBookings2021_Upselling1_cobrado: '1', TaBookings2021_Upselling1_text: 'Cuna' });
  E.aplicarCandidato(rMix, CAMPO_ECO, true);
  var linea = E.paymentsLineHTML(rMix);
  ok('la etiqueta (Stripe) va solo en el concepto leido de Stripe',
    linea.indexOf('Ecotasa 30.00€ (Stripe)') > 0 && linea.indexOf('Cuna 20.00€ (Stripe)') === -1, linea);
  ok('una reserva sin sincronizar mantiene la insignia de la vista',
    E._lvBdgEco(resEco('T2', '0'), 'u').indexOf('(Stripe)') === -1);

  console.log('\n== la pagina (HTML) ==');

  var linea3 = SRC.split('\n')[2];
  ok('la cabecera dice VERSION ACTUAL v147', /VERSIÓN ACTUAL: v147/.test(linea3), linea3);
  ok('PAGE_VERSION dice v147', /const PAGE_VERSION='v147';/.test(SRC));
  ok('el titulo dice v147', /<title>Entradas Equipo v147/.test(SRC));

  ok('existe el interruptor ECO_SYNC', /var ECO_SYNC=1;/.test(SRC));
  ok('existe el interruptor ECO_SYNC_WRITE', /var ECO_SYNC_WRITE=1;/.test(SRC));
  ok('los roles permitidos son admin, manager y staff', /var ECO_ROLES_OK=\['admin','manager','staff'\];/.test(SRC));
  ok('syncPagosStripe comprueba el rol antes de nada',
    /if\(!ECO_SYNC\)return;[\s\S]{0,400}Auth\.role\(\)[\s\S]{0,120}ECO_ROLES_OK\.indexOf\(rol\)<0\)return;/.test(fnSource('syncPagosStripe')));

  ok('doSearch lanza syncPagosStripe justo despues de pintar',
    /renderCards\(records,_allVillaIds,_muVillaMap\);\s*\n\s*syncPagosStripe\(records,_allVillaIds,_muVillaMap,mySearchId\)/.test(SRC));
  ok('la vista listado usa la insignia con regla de Stripe', SRC.indexOf('_lvBdgEco(r,urlEc)') > 0);
  ok('v145: la ficha pinta la insignia Ecotasa con ecotasaOk (el flag que la sincronizacion repara)',
    SRC.indexOf('const ecOk=ecotasaOk(r);') > 0);
  ok('ya no queda rastro de la regla vieja ecotasaStripeOk', SRC.indexOf('ecotasaStripeOk') === -1);
  ok('la escritura va por action=save con method=PUT sobre TaBookings2021',
    /action=save&table=TaBookings2021&where=/.test(SRC));
  ok('el historial recoge v147 y conserva v146, v145, v144 y v143', /<!-- HISTORIAL: v147 - /.test(SRC) && /\| v146 - /.test(SRC) && /\| v145 - /.test(SRC) && /\| v144 - /.test(SRC) && /\| v143 - /.test(SRC));
  ok('el historial explica la regla del importe y la puerta de rol',
    /margen de 0,05 euros/.test(SRC) && /admin, manager o staff/.test(SRC));

  console.log('\n' + pass + ' pass, ' + fail + ' fail\n');
  process.exit(fail ? 1 : 0);
}
