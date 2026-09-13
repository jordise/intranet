/* Pruebas del fichero de transferencias para el banco (Control Cobros v35), idea de
   Jordi Segui (12/09/2026 15:36, WhatsApp): las devoluciones de fianza por transferencia
   salen en un fichero Cuaderno 34 (version 14) que se sube al banco y Jose firma.
   node cobros-fichero-n34.test.js

   Como cobros-devolucion-fianza.test.js: NO copia el codigo de la pagina. Extrae el
   texto real de cada funcion del HTML y lo ejecuta. */
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
var F = 'cobros-inquilinos.html';
var NAMES = ['isTruthy','estadoDevolucion','n34Texto','n34Alfa','n34Num','n34Centimos','n34Fecha','ibanLimpio','ibanValido','bicLimpio',
  'nifLimpio','nifValido','n34NombreBeneficiario','n34Concepto','n34FilaTransferencia','n34MotivoArreglable','n34FallosOrdenante',
  'n34Fichero','n34NombreFichero','n34Resumen','n34DesdeTabla','n34Antigua','n34FechaCorta','n34Cambios','fmtCentimos',
  'n34LineaFichero','n34FicheroEnMarcas'];
/* las dos listas de paises son constantes, no funciones: se extraen tal cual */
var SRC = fs.readFileSync(F, 'utf8');
var CONSTS = SRC.slice(SRC.indexOf('var N34_PAISES_SEPA'), SRC.indexOf('\n', SRC.indexOf('var N34_PAISES_CON_BIC'))) + '\n' +
  SRC.slice(SRC.indexOf('var IBAN_LONGITUDES'), SRC.indexOf('\n', SRC.indexOf('var IBAN_LONGITUDES')));
var ALL = CONSTS + '\n' + NAMES.map(function (n) { return fnSource(F, n); }).join('\n');
function fn(name) { return new Function(ALL + '\nreturn ' + name + ';')(); }

var IBAN_OK  = 'ES91 2100 0418 4502 0005 1332';   /* IBAN de ejemplo publico, modulo 97 correcto */
var IBAN_OK2 = 'ES7921000813610123456789';        /* otro IBAN de ejemplo publico */
var IBAN_MAL = 'ES91 2100 0418 4502 0005 1333';

console.log('cobros-inquilinos.html: n34Texto / n34Alfa / n34Num / n34Centimos');
(function () {
  var t = fn('n34Texto'), a = fn('n34Alfa'), n = fn('n34Num'), c = fn('n34Centimos');
  ok('acentos fuera, enye y cedilla a n y c', t('Peña Çelik Núñez García') === 'Pena Celik Nunez Garcia');
  ok('caracteres no admitidos pasan a espacio y se juntan', t('Villa "Sa Salada" & Cía; #3') === 'Villa Sa Salada Cia 3');
  ok('los admitidos se quedan: / - ? : ( ) . , +', t("a/b-c?d:e(f).g,h+j") === "a/b-c?d:e(f).g,h+j");
  ok('el apostrofo pasa a espacio', t("Villa S'Estany") === 'Villa S Estany');
  ok('no empieza por / y no lleva //', t('/Villa//Mar / Sol') === 'Villa/Mar / Sol');
  ok('i sin punto, ligadura fi y ancho completo', t('Yılmaz ﬁnca ＡＢ') === 'Yilmaz finca AB');
  ok('nulo y vacio dan cadena vacia', t(null) === '' && t('') === '' && t(undefined) === '');
  ok('letras sin descomposicion: ß Ø Ł Æ Œ Đ', t('Straße Ørsted Łukasz Ærø Œuvre Đorđe') === 'Strasse Orsted Lukasz AEro OEuvre Dorde');
  ok('alfa rellena a la derecha', a('AB', 5) === 'AB   ');
  ok('alfa corta a la longitud', a('ABCDEFG', 3) === 'ABC');
  ok('alfa limpia antes de cortar', a('Ñu', 2) === 'Nu');
  ok('num rellena con ceros a la izquierda', n(42, 5) === '00042');
  ok('num con texto numerico', n('7', 3) === '007');
  ok('num negativo o nulo da ceros', n(-3, 3) === '000' && n(null, 3) === '000');
  var boom = false; try { n(123456, 5); } catch (e) { boom = true; }
  ok('num que no cabe falla, nunca se corta', boom);
  var boom2 = false; try { n(1e21, 11); } catch (e) { boom2 = true; }
  ok('num no seguro (1e21) falla, no escribe 1e+21', boom2);
  ok('centimos de 900', c(900) === 90000);
  ok('centimos de "900,50" y de 900.5', c('900,50') === 90050 && c(900.5) === 90050);
  ok('centimos redondea (0.1+0.2)', c(0.1 + 0.2) === 30);
  ok('centimos redondea medio arriba (1.005, 1.255)', c(1.005) === 101 && c(1.255) === 126);
  ok('centimos de texto, nulo, cero o negativo = 0', c('abc') === 0 && c(null) === 0 && c(0) === 0 && c(-5) === 0);
})();

console.log('cobros-inquilinos.html: ibanLimpio / ibanValido / bicLimpio / nifLimpio / nifValido');
(function () {
  var il = fn('ibanLimpio'), iv = fn('ibanValido'), b = fn('bicLimpio'), nl = fn('nifLimpio'), nv = fn('nifValido');
  ok('iban limpio: sin espacios, mayusculas', il(' es91 2100 0418 4502 0005 1332 ') === 'ES9121000418450200051332');
  ok('iban de ejemplo valido (con espacios)', iv(IBAN_OK) === true);
  ok('segundo iban de ejemplo valido', iv(IBAN_OK2) === true);
  ok('iban con un digito cambiado no vale', iv(IBAN_MAL) === false);
  ok('iban en minusculas vale igual', iv(IBAN_OK.toLowerCase()) === true);
  ok('iban ES de 23 posiciones no vale', iv('ES912100041845020005133') === false);
  ok('iban con guiones o puntos se limpia y vale', iv('ES91-2100-0418-4502-0005-1332') === true && il('ES91.2100.0418') === 'ES9121000418');
  ok('iban aleman de 21 posiciones no vale aunque pase el modulo (longitud por pais)', iv('DE89370400440532013000') === true && iv('DE8937040044053201300') === false);
  ok('iban vacio, nulo o texto no vale', iv('') === false && iv(null) === false && iv('hola') === false);
  ok('iban aleman de ejemplo valido', iv('DE89 3704 0044 0532 0130 00') === true);
  ok('bic de 11 y de 8', b('caixesbbxxx') === 'CAIXESBBXXX' && b('CAIXESBB') === 'CAIXESBB');
  ok('bic con espacios se limpia', b(' CAIX ESBB ') === 'CAIXESBB');
  ok('bic con otra forma queda en blanco', b('12') === '' && b('CAIXES') === '' && b(null) === '' && b('CAIXESBBXX') === '');
  ok('nif limpio: sin guiones ni puntos, mayusculas', nl(' b-12.345.674 ') === 'B12345674');
  ok('CIF con su cifra de control vale; con otra no', nv('B12345674') === true && nv('B12345678') === false && nv('B1234567') === false && nv('') === false);
  ok('CIF de letra (P, Q, S) exige letra (control 4 = D)', nv('P1234567D') === true && nv('P12345674') === false && nv('P1234567E') === false);
  ok('NIF de persona con su letra', nv('12345678Z') === true && nv('12345678A') === false);
  ok('NIE con su letra', nv('X1234567L') === true && nv('X1234567A') === false && nv('Y1234567X') === true);
  ok('nueve caracteres cualesquiera NO valen', nv('123456789') === false && nv('ZZZZZZZZZ') === false);
})();

console.log('cobros-inquilinos.html: n34NombreBeneficiario / n34Concepto');
(function () {
  var nb = fn('n34NombreBeneficiario'), co = fn('n34Concepto');
  ok('nombre fiscal manda', nb({ TaBookings2021_Fiscal_guest_name: 'María', TaBookings2021_Fiscal_guest_surename: 'Peña', TaBookings2021_Guest_Full_Name: 'Otro' }) === 'Maria Pena');
  ok('sin fiscal: el nombre de la reserva', nb({ TaBookings2021_Guest_Full_Name: 'John Ó Neill' }) === 'John O Neill');
  ok('solo apellido fiscal', nb({ TaBookings2021_Fiscal_guest_surename: 'Peña' }) === 'Pena');
  ok('sin nada: vacio', nb({}) === '');
  ok('concepto con reserva, villa y salida', co('60980439', 'Villa Sa Salada', '2026-09-05T00:00:00') === 'Devolucion fianza reserva 60980439 Villa Sa Salada salida 05/09/2026');
  ok('concepto sin fecha legible', co('X1', 'Casa', 'ayer') === 'Devolucion fianza reserva X1 Casa');
  ok('concepto se corta a 140', co('X1', new Array(200).join('a'), '').length === 140);
})();

function fila(extra) {
  return Object.assign({
    TaBookings2021_FS_confirmation_code: '60980439',
    TaBookings2021_Security_deposit_options: 3,
    TaBookings2021_Security_deposit_devolver_firmar: 0,
    TaBookings2021_Security_deposit_devuelto: 0,
    TaBookings2021_Security_deposit_EUR: 900,
    TaBookings2021_Security_deposit_cobrado: 0, TaBookings2021_Security_deposit_terminado: 1,
    TaBookings2021_Comentarios_devolucion_deposito: '',
    TaBookings2021_Numero_cuenta_bancaria_guest: IBAN_OK,
    TaBookings2021_Numero_swift_bic_bancario_guest: 'CAIXESBBXXX',
    TaBookings2021_Fiscal_guest_name: 'María', TaBookings2021_Fiscal_guest_surename: 'Peña',
    TaBookings2021_Property_Title: 'Villa Sa Salada', TaBookings2021_Checkout: '2026-09-05T00:00:00'
  }, extra || {});
}

console.log('cobros-inquilinos.html: n34FilaTransferencia / n34MotivoArreglable');
(function () {
  var ft = fn('n34FilaTransferencia'), ma = fn('n34MotivoArreglable');
  var x = ft(fila());
  ok('la fila buena entra', x.ok === true && x.motivo === '');
  ok('fila: codigo, iban limpio, bic EN BLANCO (EEE), centimos, nombre, villa', x.fila.code === '60980439' && x.fila.iban === 'ES9121000418450200051332' && x.fila.bic === '' && x.fila.centimos === 90000 && x.fila.nombre === 'Maria Pena' && x.fila.villa === 'Villa Sa Salada');
  ok('fila: concepto', x.fila.concepto === 'Devolucion fianza reserva 60980439 Villa Sa Salada salida 05/09/2026');
  ok('opcion 3 como texto "3" tambien entra', ft(fila({ TaBookings2021_Security_deposit_options: '3' })).ok === true);
  ok('tarjeta (opcion 2) no entra', ft(fila({ TaBookings2021_Security_deposit_options: 2 })).motivo === 'no es fianza por transferencia');
  ok('waiver (opcion 1) no entra', ft(fila({ TaBookings2021_Security_deposit_options: 1 })).ok === false);
  ok('ya enviada a firmar no entra', ft(fila({ TaBookings2021_Security_deposit_devolver_firmar: 1 })).motivo === 'ya enviada a firmar');
  ok('ya devuelta no entra', ft(fila({ TaBookings2021_Security_deposit_devuelto: 1 })).motivo === 'ya devuelta');
  ok('sin importe no entra', ft(fila({ TaBookings2021_Security_deposit_EUR: 0 })).motivo === 'sin importe de fianza');
  ok('sin IBAN no entra', ft(fila({ TaBookings2021_Numero_cuenta_bancaria_guest: '' })).motivo === 'sin IBAN');
  ok('IBAN malo no entra', ft(fila({ TaBookings2021_Numero_cuenta_bancaria_guest: IBAN_MAL })).motivo === 'IBAN no válido');
  ok('sin nombre no entra', ft(fila({ TaBookings2021_Fiscal_guest_name: '', TaBookings2021_Fiscal_guest_surename: '', TaBookings2021_Guest_Full_Name: '' })).motivo === 'sin nombre del huésped');
  ok('sin codigo no entra', ft(fila({ TaBookings2021_FS_confirmation_code: '' })).motivo === 'sin código de reserva');
  ok('el codigo puede venir del cobro', ft(fila({ TaBookings2021_FS_confirmation_code: '', Ta_payments_HS_confirmation_code: 'HA1' })).fila.code === 'HA1');
  ok('bic raro se deja en blanco y la fila entra igual', ft(fila({ TaBookings2021_Numero_swift_bic_bancario_guest: 'no se' })).fila.bic === '');
  ok('la vista sin el campo del paso 1 (undefined) NO entra: dato no disponible', ft(fila({ TaBookings2021_Security_deposit_devolver_firmar: undefined })).motivo === 'dato no disponible');
  ok('la vista sin el campo devuelto (undefined) NO entra', ft(fila({ TaBookings2021_Security_deposit_devuelto: undefined })).motivo === 'dato no disponible');
  ok('fianza no recibida (ni cobrado ni terminado) no entra', ft(fila({ TaBookings2021_Security_deposit_terminado: 0 })).motivo === 'fianza no recibida');
  ok('recibida por cobrado=1 entra', ft(fila({ TaBookings2021_Security_deposit_terminado: 0, TaBookings2021_Security_deposit_cobrado: 1 })).ok === true);
  ok('recibida por terminado=-1 (Caspio) entra', ft(fila({ TaBookings2021_Security_deposit_terminado: -1 })).ok === true);
  ok('con comentario de devolucion no entra', ft(fila({ TaBookings2021_Comentarios_devolucion_deposito: 'retener 200 por daños' })).motivo === 'revisar comentario');
  ok('comentario solo espacios = sin comentario', ft(fila({ TaBookings2021_Comentarios_devolucion_deposito: '   ' })).ok === true);
  ok('IBAN fuera de SEPA (Turquia) no entra', ft(fila({ TaBookings2021_Numero_cuenta_bancaria_guest: 'TR33 0006 1005 1978 6457 8413 26' })).motivo === 'IBAN fuera de SEPA');
  ok('IBAN britanico sin BIC no entra', ft(fila({ TaBookings2021_Numero_cuenta_bancaria_guest: 'GB29 NWBK 6016 1331 9268 19', TaBookings2021_Numero_swift_bic_bancario_guest: '' })).motivo === 'sin BIC');
  ok('IBAN britanico con BIC del mismo pais entra, y el BIC va en la fila', ft(fila({ TaBookings2021_Numero_cuenta_bancaria_guest: 'GB29 NWBK 6016 1331 9268 19', TaBookings2021_Numero_swift_bic_bancario_guest: 'NWBKGB2L' })).fila.bic === 'NWBKGB2L');
  ok('IBAN britanico con BIC de otro pais no entra', ft(fila({ TaBookings2021_Numero_cuenta_bancaria_guest: 'GB29 NWBK 6016 1331 9268 19', TaBookings2021_Numero_swift_bic_bancario_guest: 'CAIXESBBXXX' })).motivo === 'BIC no coincide con el IBAN');
  ok('IBAN suizo sin BIC no entra', ft(fila({ TaBookings2021_Numero_cuenta_bancaria_guest: 'CH93 0076 2011 6238 5295 7', TaBookings2021_Numero_swift_bic_bancario_guest: '' })).motivo === 'sin BIC');
  ok('IBAN aleman sin BIC entra (EEE)', ft(fila({ TaBookings2021_Numero_cuenta_bancaria_guest: 'DE89 3704 0044 0532 0130 00', TaBookings2021_Numero_swift_bic_bancario_guest: '' })).ok === true);
  ok('la fila lleva el checkout', ft(fila()).fila.checkout === '2026-09-05');
  ok('reserva cancelada no entra (tambien en mayusculas)', ft(fila({ TaBookings2021_BookingStatus: 'cancelled' })).motivo === 'reserva cancelada' && ft(fila({ TaBookings2021_BookingStatus: 'Cancelled' })).motivo === 'reserva cancelada');
  ok('reserva modified o new entra', ft(fila({ TaBookings2021_BookingStatus: 'modified' })).ok === true && ft(fila({ TaBookings2021_BookingStatus: 'new' })).ok === true);
  ok('BIC no coincide es motivo que mirar', ma('BIC no coincide con el IBAN'));
  ok('motivos que Toni debe mirar', ma('sin IBAN') && ma('IBAN no válido') && ma('sin importe de fianza') && ma('sin nombre del huésped') && ma('sin código de reserva') && ma('fianza no recibida') && ma('revisar comentario') && ma('IBAN fuera de SEPA') && ma('sin BIC') && ma('dato no disponible') && ma('reserva cancelada'));
  ok('estructurales: tarjeta, ya enviada, ya devuelta, vacio', !ma('no es fianza por transferencia') && !ma('ya enviada a firmar') && !ma('ya devuelta') && !ma(''));
})();

console.log('cobros-inquilinos.html: n34FallosOrdenante');
(function () {
  var fo = fn('n34FallosOrdenante');
  ok('todo bien: sin fallos', fo({ nif: 'B12345674', nombre: '3 VILLAS ALQUILER VACACIONAL SL', iban: IBAN_OK2, sufijo: '000' }).length === 0);
  ok('sufijo vacio vale', fo({ nif: 'B12345674', nombre: 'X', iban: IBAN_OK2, sufijo: '' }).length === 0);
  ok('nulo: tres fallos', fo(null).length === 3);
  ok('nif corto', fo({ nif: 'B1234', nombre: 'X', iban: IBAN_OK2 }).join() === 'NIF del ordenante');
  ok('iban malo', fo({ nif: 'B12345674', nombre: 'X', iban: IBAN_MAL }).join() === 'IBAN de cargo');
  ok('nombre solo con simbolos = sin nombre', fo({ nif: 'B12345674', nombre: '***', iban: IBAN_OK2 }).join() === 'nombre del ordenante');
  ok('sufijo de dos cifras', fo({ nif: 'B12345674', nombre: 'X', iban: IBAN_OK2, sufijo: '12' }).join() === 'sufijo (3 cifras)');
})();

console.log('cobros-inquilinos.html: n34Fichero');
(function () {
  var fi = fn('n34Fichero'), ft = fn('n34FilaTransferencia');
  var ord = { nif: 'b-12345674', nombre: '3 Villas Alquiler Vacacional, S.L.', iban: 'ES79 2100 0813 6101 2345 6789', sufijo: '000' };
  var f1 = ft(fila()).fila;
  var f2 = ft(fila({ TaBookings2021_FS_confirmation_code: '65503960', TaBookings2021_Security_deposit_EUR: '1500,25', TaBookings2021_Numero_cuenta_bancaria_guest: 'DE89 3704 0044 0532 0130 00', TaBookings2021_Numero_swift_bic_bancario_guest: '', TaBookings2021_Fiscal_guest_name: 'Jürgen', TaBookings2021_Fiscal_guest_surename: 'Müller', TaBookings2021_Property_Title: 'Ca Na Quica' })).fila;
  var d = new Date(2026, 8, 14, 10, 30);
  var txt = fi(ord, [f1, f2], d);
  var regs = txt.split('\r\n');
  ok('termina en CRLF y tiene 6 registros', regs[regs.length - 1] === '' && regs.length === 7);
  regs = regs.slice(0, 6);
  ok('todos los registros miden 600', regs.every(function (r) { return r.length === 600; }));
  var r1 = regs[0];
  ok('01 ORD: codigo, operacion, version, dato', r1.slice(0, 2) === '01' && r1.slice(2, 5) === 'ORD' && r1.slice(5, 10) === '34145' && r1.slice(10, 13) === '001');
  ok('01 ORD: NIF limpio y sufijo en 14-25', r1.slice(13, 22) === 'B12345674' && r1.slice(22, 25) === '000');
  ok('01 ORD: fecha de creacion y de ejecucion = hoy', r1.slice(25, 33) === '20260914' && r1.slice(33, 41) === '20260914');
  ok('01 ORD: A + IBAN de cargo en 42-76', r1.slice(41, 42) === 'A' && r1.slice(42, 76) === 'ES7921000813610123456789          ');
  ok('01 ORD: detalle del cargo 1 y nombre en 78-147', r1.slice(76, 77) === '1' && r1.slice(77, 147).trim() === '3 Villas Alquiler Vacacional, S.L.');
  ok('01 ORD: direccion y pais en blanco', r1.slice(147, 289).trim() === '');
  var r2 = regs[1];
  ok('02 SCT: cabecera con NIF y sufijo', r2.slice(0, 10) === '02SCT34145' && r2.slice(10, 19) === 'B12345674' && r2.slice(19, 22) === '000' && r2.slice(22).trim() === '');
  var r3 = regs[2];
  ok('03 SCT 002: referencia = codigo de reserva en 14-48', r3.slice(0, 13) === '03SCT34145002' && r3.slice(13, 48).trim() === '60980439');
  ok('03: A + IBAN del huesped en 49-83', r3.slice(48, 49) === 'A' && r3.slice(49, 83).trim() === 'ES9121000418450200051332');
  ok('03: importe 900,00 en 84-94 sin coma', r3.slice(83, 94) === '00000090000');
  ok('03: gastos 3 (SHA) y BIC en blanco en 96-106 (IBAN del EEE)', r3.slice(94, 95) === '3' && r3.slice(95, 106) === '           ');
  ok('03: nombre del beneficiario en 107-176', r3.slice(106, 176).trim() === 'Maria Pena');
  ok('03: direccion y pais en blanco', r3.slice(176, 318).trim() === '');
  ok('03: concepto en 319-458', r3.slice(318, 458).trim() === 'Devolucion fianza reserva 60980439 Villa Sa Salada salida 05/09/2026');
  ok('03: resto en blanco', r3.slice(458).trim() === '');
  var r4 = regs[3];
  ok('segundo 03: IBAN aleman, 1500,25, sin BIC, nombre sin dieresis', r4.slice(49, 83).trim() === 'DE89370400440532013000' && r4.slice(83, 94) === '00000150025' && r4.slice(95, 106).trim() === '' && r4.slice(106, 176).trim() === 'Jurgen Muller');
  var r5 = regs[4];
  ok('04 SCT: total 2400,25, 2 beneficiarios, 4 registros en el bloque', r5.slice(0, 5) === '04SCT' && r5.slice(5, 22) === '00000000000240025' && r5.slice(22, 30) === '00000002' && r5.slice(30, 40) === '0000000004');
  var r6 = regs[5];
  ok('99 ORD: mismo total, 2 beneficiarios, 6 registros en total', r6.slice(0, 5) === '99ORD' && r6.slice(5, 22) === '00000000000240025' && r6.slice(22, 30) === '00000002' && r6.slice(30, 40) === '0000000006');
  ok('solo caracteres ASCII en todo el fichero', /^[\x20-\x7E\r\n]*$/.test(txt));
  var b1 = false; try { fi(ord, [], d); } catch (e) { b1 = true; }
  ok('sin filas: falla, no hay fichero vacio', b1);
  var b2 = false; try { fi(ord, [Object.assign({}, f1, { centimos: 0 })], d); } catch (e) { b2 = true; }
  ok('importe cero: falla', b2);
  var b3 = false; try { fi(ord, [Object.assign({}, f1, { iban: '' })], d); } catch (e) { b3 = true; }
  ok('IBAN en blanco: falla', b3);
  var ej = fi(ord, [f1], d, new Date(2026, 8, 16)).split('\r\n')[0];
  ok('fecha de ejecucion propia: creacion hoy, ejecucion la elegida', ej.slice(25, 33) === '20260914' && ej.slice(33, 41) === '20260916');
  var b4 = false; try { fi(ord, [f1], d, new Date(2026, 8, 13)); } catch (e) { b4 = true; }
  ok('fecha de ejecucion anterior a hoy: falla', b4);
  var gb = Object.assign({}, f1, { iban: 'GB29NWBK60161331926819', bic: 'NWBKGB2L' });
  ok('BIC fuera del EEE se escribe', fi(ord, [gb], d).split('\r\n')[2].slice(95, 106) === 'NWBKGB2L   ');
  var sinSuf = fi({ nif: 'B12345674', nombre: 'X', iban: IBAN_OK2 }, [f1], d).split('\r\n')[0];
  ok('sin sufijo: 000', sinSuf.slice(22, 25) === '000');
  var conSuf = fi({ nif: 'B12345674', nombre: 'X', iban: IBAN_OK2, sufijo: '001' }, [f1], d).split('\r\n')[0];
  ok('sufijo 001 se respeta', conSuf.slice(22, 25) === '001');
})();

console.log('cobros-inquilinos.html: n34NombreFichero / n34Resumen');
(function () {
  var nf = fn('n34NombreFichero'), re = fn('n34Resumen');
  ok('nombre del fichero con fecha, hora y segundos', nf(new Date(2026, 8, 14, 9, 5, 7)) === '3villas-devolucion-fianzas-20260914-090507.txt');
  var r = re([{ centimos: 90000 }, { centimos: 150025 }]);
  ok('resumen: cuenta y suma', r.n === 2 && r.total === 240025);
  ok('resumen vacio', re([]).n === 0 && re(null).total === 0);
})();

console.log('cobros-inquilinos.html: n34DesdeTabla / n34Antigua / n34FechaCorta / n34Cambios');
(function () {
  var dt = fn('n34DesdeTabla'), an = fn('n34Antigua'), fc = fn('n34FechaCorta'), ca = fn('n34Cambios'), ft = fn('n34FilaTransferencia');
  var m = dt({ FS_confirmation_code: 'X', Security_deposit_EUR: 900 });
  ok('la fila de la tabla toma el prefijo de la vista', m.TaBookings2021_FS_confirmation_code === 'X' && m.TaBookings2021_Security_deposit_EUR === 900);
  ok('nulo da objeto vacio', Object.keys(dt(null)).length === 0);
  var hoy = new Date(2026, 8, 14);
  ok('checkout de hace 46 dias es antigua', an('2026-07-30T00:00:00', hoy) === true);
  ok('checkout de hace 45 dias no es antigua', an('2026-07-31', hoy) === false);
  ok('checkout de hace 3 dias no es antigua', an('2026-09-11', hoy) === false);
  ok('umbral propio (10 dias)', an('2026-09-01', hoy, 10) === true && an('2026-09-05', hoy, 10) === false);
  ok('checkout ilegible no es antigua', an('', hoy) === false && an(null, hoy) === false && an('ayer', hoy) === false);
  ok('fecha corta', fc('2026-09-05T00:00:00') === '05/09/2026' && fc('') === '' && fc('2026-09-05T10:20:30.000Z') === '05/09/2026');
  var f1 = ft(fila()).fila;
  ok('sin cambios: lista vacia', ca([f1], { '60980439': f1 }).length === 0);
  ok('reserva que ya no entra', ca([f1], { '60980439': { motivo: 'ya enviada a firmar' } }).join() === '60980439: ya enviada a firmar');
  ok('reserva que no se encuentra', ca([f1], {}).join() === '60980439: no se ha encontrado la reserva');
  var f1b = Object.assign({}, f1, { centimos: 70000 });
  ok('importe cambiado', /^60980439: el importe cambió/.test(ca([f1], { '60980439': f1b }).join()));
  var f1c = Object.assign({}, f1, { iban: 'ES7921000813610123456789' });
  ok('IBAN cambiado', ca([f1], { '60980439': f1c }).join() === '60980439: el IBAN cambió');
  ok('BIC cambiado', ca([f1], { '60980439': Object.assign({}, f1, { bic: 'BSCHESMMXXX' }) }).join() === '60980439: el BIC cambió');
  ok('nombre cambiado', ca([f1], { '60980439': Object.assign({}, f1, { nombre: 'Otro Nombre' }) }).join() === '60980439: el nombre cambió');
  ok('seleccion vacia o nula: sin cambios', ca([], {}).length === 0 && ca(null, {}).length === 0);
})();

console.log('cobros-inquilinos.html: n34LineaFichero / n34FicheroEnMarcas (el rastro dice en que fichero salio)');
(function () {
  var lf = fn('n34LineaFichero'), em = fn('n34FicheroEnMarcas');
  var d = new Date(2026, 8, 14, 10, 30);
  var L = lf('3villas-devolucion-fianzas-20260914-103000.txt', false, 'Toni Seguí', d);
  ok('linea de fichero', L === '[Fichero para el banco 3villas-devolucion-fianzas-20260914-103000.txt 14/09/2026 10:30 - Toni Seguí]');
  ok('linea OLVIDADO', lf('f.txt', true, 'Toni', d) === '[Fichero para el banco f.txt OLVIDADO 14/09/2026 10:30 - Toni]');
  ok('sin nombre: equipo', lf('f.txt', false, '', d) === '[Fichero para el banco f.txt 14/09/2026 10:30 - equipo]');
  ok('rastro vacio o nulo: null', em('') === null && em(null) === null);
  ok('rastro solo con marcas de fianza: null', em('[Fianza marcado 04/09/2026 12:48 - Toni]\n[Fianza enviada a firmar 10/09/2026 17:40 - Toni]') === null);
  var r1 = em('[Fianza marcado 04/09/2026 12:48 - Toni]\n' + L);
  ok('una linea de fichero: la devuelve', r1 && r1.fichero === '3villas-devolucion-fianzas-20260914-103000.txt' && r1.fecha === '14/09/2026 10:30' && r1.nombre === 'Toni Seguí');
  ok('fichero + OLVIDADO del mismo: null', em(L + '\n' + lf('3villas-devolucion-fianzas-20260914-103000.txt', true, 'Toni', new Date(2026, 8, 14, 11, 0))) === null);
  ok('OLVIDADO de OTRO fichero no anula', em(L + '\n' + lf('otro.txt', true, 'Toni', d)).fichero === '3villas-devolucion-fianzas-20260914-103000.txt');
  var r2 = em(L + '\n' + lf('3villas-devolucion-fianzas-20260914-103000.txt', true, 'Toni', d) + '\n' + lf('segundo.txt', false, 'Gary', d));
  ok('olvidado y luego otro fichero: el ultimo', r2 && r2.fichero === 'segundo.txt' && r2.nombre === 'Gary');
  ok('dos ficheros seguidos sin olvidar: el ultimo', em(lf('a.txt', false, 'T', d) + '\n' + lf('b.txt', false, 'T', d)).fichero === 'b.txt');
  ok('lineas con espacios alrededor', em('  ' + L + '  ').fichero === '3villas-devolucion-fianzas-20260914-103000.txt');
})();

console.log('cobros-inquilinos.html: reglas del codigo (texto de la pagina)');
(function () {
  ok('el boton del fichero y el lote solo para admin', SRC.indexOf("if(!on || !esAdmin()){ btn.style.display = 'none';") > 0 && SRC.indexOf("if(!esAdmin()){ alert('Solo administración puede marcar el lote'); return; }") > 0);
  ok('antes de generar se relee la tabla', SRC.indexOf('const fresco = await n34ReleerFilas(sel.dentro.map(f => f.code), aMano);') > 0);
  ok('el lote no manda un aviso por reserva', SRC.indexOf("if(!sinAviso) avisarMarcasDevolucion([linea], code, recs[0]['TaBookings2021_Property_Title'] || '');") > 0);
  ok('el rastro lleva la linea del fichero al descargar (anotarFicheroN34 relee y escribe solo Marcas_manuales)', SRC.indexOf('const nuevo = marcasConLinea(marcas, linea, 3800);') > 0 && SRC.indexOf('body: JSON.stringify({ Marcas_manuales: nuevo })') > 0);
  ok('guardarDevolucion en silencio devuelve true/false', SRC.indexOf('async function guardarDevolucion(code, tipo, desmarcar, campo, valor, silencioso, sinAviso)') > 0 && SRC.indexOf("if(!silencioso) alert('No se pudo guardar la marca de la fianza: ' + e.message);") > 0 && SRC.indexOf('  return true;\n}') > 0);
  ok('el registro de "ya en fichero" vive en el rastro de la tabla, no en localStorage', SRC.indexOf('localStorage.') < 0 && SRC.indexOf('getItem(') < 0 && SRC.indexOf('const ok = await anotarFicheroN34(filas[i].code, n34LineaFichero(nombre, false, quien, ahora));') > 0);
  ok('se anota ANTES de entregar el fichero y con fallo no se entrega', SRC.indexOf("alert('No se ha podido anotar el fichero en la reserva ' + fallo + '. No se entrega el fichero. Inténtalo de nuevo.'") > 0 && SRC.indexOf('const ok = await anotarFicheroN34') < SRC.indexOf('const blob = new Blob([contenido]'));
  ok('la relectura rechaza lo que ya salio en un fichero', SRC.indexOf("out[c] = { motivo: 'ya en fichero ' + ya.fichero }; return;") > 0);
  ok('el lote marca sin aviso por reserva (septimo argumento)', SRC.indexOf("await guardarDevolucion(code, 'firmar', false, 'Security_deposit_devolver_firmar', true, true, true);") > 0 && SRC.indexOf('async function guardarDevolucion(code, tipo, desmarcar, campo, valor, silencioso, sinAviso)') > 0);
  ok('sin globales del lote', SRC.indexOf('_n34AvisoExtra') < 0 && SRC.indexOf('_n34LineaFichero') < 0);
  ok('maximo 40 por fichero y el confirm con todas las lineas', SRC.indexOf('const N34_MAX_POR_FICHERO = 40;') > 0 && SRC.indexOf('const lista = filas.map(f => f.code') > 0);
  ok('el nombre del banco no va en la pagina', SRC.indexOf('Guissona') < 0);
  ok('con el preset se lee el rastro de las candidatas', SRC.indexOf("else if(_preset === 'devoluciones' && n34FilaTransferencia(r).ok) out.push(code);") > 0);
  ok('la relectura fresca toma el nombre de la vista', SRC.indexOf("fresco['TaBookings2021_Guest_Full_Name'] = enLista[0]['TaBookings2021_Guest_Full_Name'] || '';") > 0);
  ok('tras anotar se comprueba el rastro antes de entregar', SRC.indexOf('const faltan = await n34VerificarAnotaciones(anotadas, nombre);') > 0 && SRC.indexOf('const faltan = await n34VerificarAnotaciones') < SRC.indexOf('const blob = new Blob([contenido]'));
  ok('acentos con escapes \\u', SRC.indexOf('/[\\u0300-\\u036f]/g') > 0);
  ok('el rastro y las casillas a mano se reinician en cada busqueda', SRC.indexOf('_marcas = {};            /* v35') > 0 && SRC.indexOf('_n34Excluidas = {};      /* v35') > 0 && SRC.indexOf('_n34Forzadas = {};') > 0);
  ok('la relectura actualiza el rastro aunque la reserva no entre', SRC.indexOf("if('Marcas_manuales' in row) _marcas[c] = String(row['Marcas_manuales'] || '');   /* la lista aprende lo fresco, entre o no */") > 0);
  ok('una casilla forzada solo repite EL fichero que se vio', SRC.indexOf("if(ya && !(aMano && aMano[c] === ya.fichero)){ out[c] = { motivo: 'ya en fichero ' + ya.fichero }; return; }") > 0 && SRC.indexOf("_n34Forzadas[code] = ya ? ya.fichero : '';") > 0);
  ok('el confirm de descarga no ensena el IBAN de la empresa entero', SRC.indexOf("'\\nCargo en la cuenta de la empresa ···' + o.iban.slice(-4)") > 0);
  ok('la columna del fichero es la primera y la fila de grupo cuenta 21', SRC.indexOf('<th id="thN34"') > 0 && SRC.indexOf('colspan="21"') > 0);
})();

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
