/* Pruebas de informe-reservas.html v6 (v6 = ocupación sobre los días abiertos del calendario de Hostaway de cada villa, Gary: "check the occupancy against open days",
   "in the report under the occupency percentage put the open and blocked dates"; v5 = ocupación en temporada, 1/4–31/10, ya sustituida; v4 = ocupación, Gary: "occupancy needs to be on the top level"; 13/10/2026, petición de Marta, Reservas; v2 = ficha por villa, Gary;
   v3 = estancias de propietario, Gary: "owner stays need to be in the report as well").
   Neto por canal, precio por día, villa por Hostawayid, filtros de estado, villa y canal,
   CSV en español, cifras del cuadro, la clave de auth.js y las entradas de nav.js v18.
   Datos inventados.
   node informe-reservas.test.js

   Como historial-whatsapp.test.js: NO copia el código de la página. Extrae el texto
   real de cada función y constante del HTML y lo ejecuta. */
var fs = require('fs');
var path = require('path');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
function eq(n, a, b) { var A = JSON.stringify(a), B = JSON.stringify(b); ok(n, A === B, A + ' != ' + B); }

function blockEnd(src, j, open, close) {
  var depth = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === open) depth++;
    else if (src[k] === close) { depth--; if (depth === 0) return k + 1; }
  }
  throw new Error('bloque sin cerrar');
}
function fnSource(src, name) {
  var i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  return src.slice(i, blockEnd(src, src.indexOf('{', i), '{', '}'));
}
function varSource(src, name) {
  var i = src.indexOf('var ' + name + ' =');
  if (i < 0) throw new Error('no encuentro var ' + name);
  return src.slice(i, src.indexOf(';\n', i) + 1);
}

var SRC = fs.readFileSync(path.join(__dirname, 'informe-reservas.html'), 'utf8');
var FNS = ['madridYear', 'madridHHMM', 'channelLabel', 'toNum', 'round2', 'commissionOf', 'buildVillaMap', 'enrichRow', 'cmpVillaNum',
  'sortDetail', 'filterRows', 'computeStats', 'villaSummary', 'fmtDate', 'fmtMoney', 'csvNum', 'csvCell', 'detailMatrix', 'villaMatrix',
  'buildCsv', 'fileName', 'buildPageUrl', 'monthsBetween',
  'cleanText', 'guestNameOf', 'personasOf', 'pagoLabel', 'rowsOfVilla', 'villaFileValues', 'villaDetailMatrix', 'buildVillaCsv', 'villaTsv',
  'huespedCell', 'villaDetailRowHtml', 'esc', 'ownerTag', 'reservasSub', 'nochesSub',
  'madridToday', 'isoDayNum', 'computeOccupancy', 'fmtPct', 'occSub', 'resumenMatrix', 'isoFromDayNum', 'fmtDiaMes',
  'openUnitsOf', 'fmtDiaMesAno', 'rangoTexto', 'occSub2', 'aperturaOf', 'aperturaText', 'listingIdsOf', 'calendarBatches', 'calRangeOf', 'buildCalendarUrl'];
var VARS = ['WORKER', 'MAX_PAGES', 'CHANNEL_LABELS', 'DETAIL_HEADERS', 'VILLA_HEADERS', 'MESES_CORTOS',
  'FILE_HEADERS', 'VILLA_DETAIL_HEADERS', 'VILLA_FILE_HEADERS', 'PAGO_LABELS', 'RESUMEN_HEADERS', 'CAL_BATCH', 'CAL_PARALLEL'];
var code = VARS.map(function (v) { return varSource(SRC, v); }).join('\n') + '\n' +
  FNS.map(function (f) { return fnSource(SRC, f); }).join('\n') +
  '\nreturn {' + FNS.concat(VARS).map(function (n) { return n + ':' + n; }).join(',') + '};';
var P = new Function(code)();

var VILLAS = P.buildVillaMap([
  { villaid: 12, Name: 'Villa Prueba', Name_villa_para_inquilinos: 'Casa Prueba', Hostawayid: '1001' },
  { villaid: 3, Name: 'Villa Tres', Hostawayid: 1003 },
  { villaid: 40, Name: '', Name_villa_para_inquilinos: 'Solo Inquilinos', Hostawayid: ' 1040 ' },
  { villaid: 99, Name: 'Sin Hostaway', Hostawayid: null }
]);
function R(o) {
  var base = { id: 1, hostawayReservationId: 5000001, listingMapId: 1001, listingName: 'HA Villa Prueba', channelName: 'direct', channelId: 2000,
    status: 'new', arrivalDate: '2026-07-10', departureDate: '2026-07-17', nights: 7, reservationDate: '2026-02-01 10:22:00',
    totalPrice: 1400, currency: 'EUR', channelCommissionAmount: null, airbnbListingHostFee: null, cancellationDate: null };
  Object.keys(o || {}).forEach(function (k) { base[k] = o[k]; });
  return P.enrichRow(base, VILLAS);
}

console.log('Neto por canal');
var bk = R({ channelName: 'bookingcom', totalPrice: 2000, channelCommissionAmount: 300, airbnbListingHostFee: 999 });
eq('Booking.com: neto = total − channelCommissionAmount', [bk.net, bk.commission, bk.channelLabel], [1700, 300, 'Booking.com']);
var ab = R({ channelName: 'airbnbOfficial', totalPrice: 1000, channelCommissionAmount: 777, airbnbListingHostFee: 155.5 });
eq('Airbnb: neto = total − airbnbListingHostFee (no channelCommissionAmount)', [ab.net, ab.channelLabel], [844.5, 'Airbnb']);
var di = R({ channelName: 'direct', totalPrice: 1400, channelCommissionAmount: null });
eq('Directa: neto = total', [di.net, di.channelLabel, di.sinComision], [1400, 'Directa', false]);
var ha = R({ channelName: 'homeaway', totalPrice: 900, channelCommissionAmount: 0 });
eq('Vrbo con comisión 0: neto = total', [ha.net, ha.channelLabel], [900, 'Vrbo']);
var be = R({ channelName: 'bookingengine', totalPrice: 500, channelCommissionAmount: 25 });
eq('Web 3Villas con comisión: se resta', [be.net, be.channelLabel], [475, 'Web 3Villas']);
var bkNo = R({ channelName: 'bookingcom', totalPrice: 2000, channelCommissionAmount: null });
var abNo = R({ channelName: 'airbnbOfficial', totalPrice: 2000, airbnbListingHostFee: undefined, channelCommissionAmount: 50 });
eq('Booking.com sin dato: neto y neto/día vacíos y marcada', [bkNo.net, bkNo.dailyNet, bkNo.sinComision, bkNo.daily], [null, null, true, 285.71]);
eq('Airbnb sin host fee: neto vacío aunque haya channelCommissionAmount', [abNo.net, abNo.sinComision], [null, true]);
eq('canal desconocido = nombre tal cual', P.channelLabel('expedia'), 'expedia');

console.log('Precio por día');
eq('precio/día y neto/día', [bk.daily, bk.dailyNet], [285.71, 242.86]);
var n0 = R({ nights: 0 }), nU = R({ nights: undefined });
eq('0 noches = vacío', [n0.daily, n0.dailyNet], [null, null]);
eq('sin noches = vacío', [nU.daily, nU.dailyNet, nU.nights], [null, null, null]);

console.log('Villa por Hostawayid');
eq('villa con número y nombre interno', [di.num, di.villa, di.mapped], ['12', 'Villa Prueba', true]);
var v3 = R({ listingMapId: 1003 });
eq('Hostawayid numérico se compara como texto', [v3.num, v3.villa], ['3', 'Villa Tres']);
eq('sin Name usa el nombre para inquilinos; espacios fuera', R({ listingMapId: 1040 }).villa, 'Solo Inquilinos');
var un = R({ listingMapId: 7777, listingName: 'Apartamento Fuera' });
eq('sin villa: Nº vacío y nombre de Hostaway', [un.num, un.villa, un.mapped], ['', 'Apartamento Fuera', false]);
/* v2: la fila lleva solo estos datos del huésped (Worker v59), con nombres propios; nada más del objeto de Hostaway. */
eq('v2: claves de la fila', Object.keys(di).filter(function (k) { return /guest|email|phone|persons|payment|channelCode/i.test(k); }),
  ['guest', 'email', 'phone', 'persons', 'payment', 'channelCode']);
eq('v2: Worker sin v59 (campos ausentes): huésped vacío', [di.guest, di.email, di.phone, di.persons, di.payment, di.channelCode], ['', '', '', null, '', '']);

console.log('Filtros');
var rows = [
  R({ hostawayReservationId: 1, listingMapId: 1001, channelName: 'bookingcom', channelCommissionAmount: 100, arrivalDate: '2026-08-01' }),
  R({ hostawayReservationId: 2, listingMapId: 1001, channelName: 'airbnbOfficial', airbnbListingHostFee: 50, arrivalDate: '2026-06-01' }),
  R({ hostawayReservationId: 3, listingMapId: 1003, channelName: 'direct' }),
  R({ hostawayReservationId: 4, listingMapId: 1040, channelName: 'homeaway', channelCommissionAmount: 0, status: 'modified' }),
  R({ hostawayReservationId: 5, listingMapId: 1003, channelName: 'direct', status: 'cancelled' }),
  R({ hostawayReservationId: 6, listingMapId: 7777, channelName: 'direct', status: 'inquiry' })
];
function codes(a) { return a.map(function (r) { return r.code; }).sort(); }
eq('sin canceladas: new y modified, nada más', codes(P.filterRows(rows, {})), ['1', '2', '3', '4']);
eq('con canceladas', codes(P.filterRows(rows, { includeCancelled: true })), ['1', '2', '3', '4', '5']);
eq('una villa', codes(P.filterRows(rows, { villas: ['V12'] })), ['1', '2']);
eq('varias villas', codes(P.filterRows(rows, { villas: ['V12', 'V40'] })), ['1', '2', '4']);
eq('todas (null)', codes(P.filterRows(rows, { villas: null })).length, 4);
eq('canal', codes(P.filterRows(rows, { channels: ['direct', 'homeaway'] })), ['3', '4']);
eq('villa y canal juntos', codes(P.filterRows(rows, { villas: ['V12'], channels: ['bookingcom'] })), ['1']);
eq('orden: villa y luego check-in', P.sortDetail(P.filterRows(rows, {})).map(function (r) { return r.code; }), ['3', '2', '1', '4']);
eq('sin villa al final', P.sortDetail([un, v3]).map(function (r) { return r.mapped; }), [true, false]);

console.log('Cifras del cuadro');
var sel = P.filterRows(rows.concat([bkNo, un]), { includeCancelled: true });
var st = P.computeStats(sel);
eq('reservas sin canceladas, canceladas aparte', [st.reservas, st.canceladas], [6, 1]);
eq('noches', st.noches, 42);
eq('total', st.total, 9000);
eq('neto (sin la de Booking.com sin dato)', st.neto, 6850);
eq('comisión y % sobre el total con dato', [st.comision, st.comisionPct], [150, 2.14]);
eq('precio medio/noche y neto medio/noche', [st.medioNoche, st.netoMedioNoche], [214.29, 195.71]);
eq('avisos: sin comisión y sin villa', [st.sinComision, st.sinVilla], [1, 1]);
eq('por canal ordenado por total', st.canales.map(function (c) { return [c.label, c.reservas, c.total, c.neto]; }),
  [['Booking.com', 2, 3400, 1300], ['Directa', 2, 2800, 2800], ['Airbnb', 1, 1400, 1350], ['Vrbo', 1, 1400, 1400]]);
eq('por mes de llegada', st.porMes, { '2026-08': 1400, '2026-06': 1400, '2026-07': 6200 });
var vs = P.villaSummary(sel);
eq('resumen por villa', vs.map(function (v) { return [v.num, v.reservas, v.noches, v.total, v.neto, v.porNoche, v.netoPorNoche]; }),
  [['3', 1, 7, 1400, 1400, 200, 200], ['12', 3, 21, 4800, 2650, 228.57, 189.29], ['40', 1, 7, 1400, 1400, 200, 200], ['', 1, 7, 1400, 1400, 200, 200]]);
eq('meses de la ventana', P.monthsBetween('2026-01-01', '2026-12-31').length, 12);

console.log('Formato y CSV');
eq('fecha dd/mm/yyyy', [P.fmtDate('2026-02-01 10:22:00'), P.fmtDate(''), P.fmtDate('2026-07-10T00:00:00Z')], ['01/02/2026', '', '10/07/2026']);
eq('dinero: miles con punto, decimales con coma', [P.fmtMoney(1234567.891), P.fmtMoney(0), P.fmtMoney(null), P.fmtMoney(-5)], ['1.234.567,89', '0,00', '', '-5,00']);
var csv = P.buildCsv(P.sortDetail([bk, bkNo, n0]));
ok('CSV empieza con BOM', csv.charCodeAt(0) === 0xFEFF);
var lines = csv.slice(1).split('\r\n');
eq('cabecera exacta (v2: Huésped al final)', lines[0], 'Nº villa;Villa;Check-in;Check-out;Noches;Fecha reserva;Canal;Precio total;Precio neto;Precio/día;Precio neto/día;Código;Huésped');
eq('fila Booking.com', lines[1], '12;Villa Prueba;10/07/2026;17/07/2026;7;01/02/2026;Booking.com;2000,00;1700,00;285,71;242,86;5000001;');
eq('fila sin comisión: neto vacío', lines[2], '12;Villa Prueba;10/07/2026;17/07/2026;7;01/02/2026;Booking.com;2000,00;;285,71;;5000001;');
eq('fila 0 noches: por día vacío', lines[3], '12;Villa Prueba;10/07/2026;17/07/2026;0;01/02/2026;Directa;1400,00;1400,00;;;5000001;');
eq('un ; en el nombre va entre comillas', P.csvCell('Villa; "A"'), '"Villa; ""A"""');
eq('un texto que empieza por = no se ejecuta en Excel (apostrofo delante)', P.csvCell('=1+1'), "'=1+1");
eq('un telefono con + delante se queda como esta (solo digitos y espacios)', P.csvCell('+34 600 000 000'), '+34 600 000 000');
var VILLA_FILE_HEADERS_LEN = (function(){ var m = SRC.match(/var VILLA_FILE_HEADERS = \[([^\]]*)\]/); return m ? m[1].split(',').length : 0; })();
eq('un texto que empieza por - o + seguido de letras lleva apostrofo', P.csvCell('-cmd|calc'), "'-cmd|calc");
(function(){
  var src = fnSource(SRC, 'renderVillaPanel');
  ok('la ficha lleva el boton Volver al resumen arriba y abajo', (src.match(/Volver al resumen/g) || []).length === 2);
  ok('los dos botones de volver llaman a closeVilla', (src.match(/onclick="closeVilla\(\)"/g) || []).length === 2);
  ok('la tecla Esc cierra la ficha', /keydown[\s\S]{0,120}Escape[\s\S]{0,60}closeVilla\(\)/.test(SRC));
})();
(function(){
  var r = P.enrichRow ? null : null;
  var rows = [{ guest:'Ana López', email:'ana@example.com', phone:'+34 600 000 000', checkin:'2026-07-10', checkout:'2026-07-17', nights:7, reservationDate:'2026-02-01', channelLabel:'Airbnb', total:1400, net:1260, daily:200, dailyNet:180, persons:4, payment:'paid', code:'7001', channelCode:'' }];
  var tsv = P.villaTsv(rows.map(function(x){ return Object.assign({}, x); }));
  var lines = tsv.split('\n');
  ok('Copiar tabla: la cabecera va separada por tabuladores y empieza por Huésped', lines[0].split('\t')[0] === 'Huésped' && lines[0].split('\t').length === VILLA_FILE_HEADERS_LEN);
  ok('Copiar tabla: una fila por reserva', lines.length === 2);
  ok('Copiar tabla: sin tabuladores dentro de una celda', lines[1].split('\t').length === VILLA_FILE_HEADERS_LEN);
})();
eq('un numero normal no cambia', P.csvCell('1.234,50'), '1.234,50');
eq('Excel: números como números, fechas como texto', P.detailMatrix([bk])[0], ['12', 'Villa Prueba', '10/07/2026', '17/07/2026', 7, '01/02/2026', 'Booking.com', 2000, 1700, 285.71, 242.86, '5000001', '']);
eq('nombres de archivo', [P.fileName('2026-01-01', '2026-12-31', '', 'xlsx'), P.fileName('2026-01-01', '2026-12-31', '12', 'csv')],
  ['informe-reservas-2026-01-01-2026-12-31.xlsx', 'informe-reservas-villa-12-2026-01-01-2026-12-31.csv']);

console.log('v2: ficha por villa');
var G = { guestName: ' Ana López ', guestEmail: 'ana@example.com', phone: '+34 600 000 000', numberOfGuests: 4, adults: 2, children: 1,
  paymentStatus: 'paid', channelReservationId: 'HM123' };
var gr = R(Object.assign({ hostawayReservationId: 7001, channelName: 'airbnbOfficial', airbnbListingHostFee: 140 }, G));
eq('huésped, correo, teléfono, personas, pago y código del canal', [gr.guest, gr.email, gr.phone, gr.persons, gr.payment, gr.channelCode],
  ['Ana López', 'ana@example.com', '+34 600 000 000', 4, 'paid', 'HM123']);
eq('guestName vacío: nombre + apellidos', P.guestNameOf({ guestName: null, guestFirstName: 'Ana', guestLastName: 'López' }), 'Ana López');
eq('solo nombre o nada', [P.guestNameOf({ guestFirstName: 'Ana' }), P.guestNameOf({}), P.guestNameOf(null)], ['Ana', '', '']);
eq('personas: numberOfGuests, si no adultos + niños, si no null',
  [P.personasOf({ numberOfGuests: 5, adults: 2 }), P.personasOf({ adults: 2, children: 1 }), P.personasOf({ adults: 3 }), P.personasOf({ children: 2 }), P.personasOf({}), P.personasOf({ numberOfGuests: null, adults: null })],
  [5, 3, 3, 2, null, null]);
eq('pago en español', [P.pagoLabel('paid'), P.pagoLabel('Paid'), P.pagoLabel('partially_paid'), P.pagoLabel('partial'), P.pagoLabel('Partially paid'),
  P.pagoLabel('unpaid'), P.pagoLabel('refunded'), P.pagoLabel(''), P.pagoLabel(null), P.pagoLabel(undefined)],
  ['Pagado', 'Pagado', 'Parcial', 'Parcial', 'Parcial', 'Pendiente', 'refunded', '—', '—', '—']);
var vRows = [
  R({ hostawayReservationId: 11, listingMapId: 1001, arrivalDate: '2026-08-20' }),
  R({ hostawayReservationId: 12, listingMapId: 1003, arrivalDate: '2026-05-01' }),
  R({ hostawayReservationId: 13, listingMapId: 1001, arrivalDate: '2026-06-02' }),
  R({ hostawayReservationId: 14, listingMapId: 7777, arrivalDate: '2026-07-01' }),
  R({ hostawayReservationId: 15, listingMapId: 1001, arrivalDate: '2026-07-15', status: 'cancelled' })
];
eq('rowsOfVilla: solo esa villa, por check-in, canceladas incluidas si vienen', P.rowsOfVilla(vRows, 'V12').map(function (r) { return r.code; }), ['13', '15', '11']);
eq('rowsOfVilla: alojamiento sin villa (L…)', P.rowsOfVilla(vRows, 'L7777').map(function (r) { return r.code; }), ['14']);
eq('rowsOfVilla: villa sin reservas', P.rowsOfVilla(vRows, 'V99'), []);
eq('cada villa del resumen tiene sus filas', P.villaSummary(vRows).map(function (v) { return [v.villaKey, v.reservas, P.rowsOfVilla(vRows, v.villaKey).filter(function (r) { return !r.cancelled; }).length]; }),
  [['V3', 1, 1], ['V12', 2, 2], ['L7777', 1, 1]]);
var evil = R({ guestName: '<img src=x onerror=alert(1)>', guestEmail: 'a"b@x.com', phone: '<b>1</b>', paymentStatus: '<i>x</i>', channelReservationId: '<s>c</s>' });
var hc = P.huespedCell(gr);
eq('celda Huésped: nombre, mailto y teléfono debajo', hc, 'Ana López<div class="sub"><a href="mailto:ana@example.com">ana@example.com</a> · +34 600 000 000</div>');
eq('celda Huésped vacía = —', P.huespedCell(di), '—');
var evilHtml = P.villaDetailRowHtml(evil);
ok('datos del huésped escapados (esc)', evilHtml.indexOf('<img') < 0 && evilHtml.indexOf('<b>') < 0 && evilHtml.indexOf('<i>') < 0 && evilHtml.indexOf('<s>') < 0 &&
  evilHtml.indexOf('&lt;img src=x onerror=alert(1)&gt;') > 0 && evilHtml.indexOf('mailto:a&quot;b@x.com') > 0, evilHtml);
function cells(html) { var out = [], re = /<td[^>]*>([\s\S]*?)<\/td>/g, m; while ((m = re.exec(html))) out.push(m[1]); return out; }
var rowCells = cells(P.villaDetailRowHtml(gr));
eq('fila de la ficha: 13 celdas en el orden de las cabeceras', rowCells.length, P.VILLA_DETAIL_HEADERS.length);
eq('fila de la ficha: valores', rowCells.slice(1),
  ['10/07/2026', '17/07/2026', '7', '01/02/2026', 'Airbnb', '1.400,00', '1.260,00', '200,00', '180,00', '4', 'Pagado', '7001<div class="sub">HM123</div>']);
var emptyCells = cells(P.villaDetailRowHtml(di));
eq('fila de la ficha sin datos del huésped: —', [emptyCells[0], emptyCells[10], emptyCells[11], emptyCells[12]], ['—', '—', '—', '5000001']);
var cRow = P.villaDetailRowHtml(R({ status: 'cancelled' }));
ok('cancelada: tachada y con la etiqueta', /^<tr class="cancel">/.test(cRow) && cRow.indexOf('<span class="tag">cancelada</span>') > 0);
eq('cabeceras de la ficha (huésped primero, luego Marta)', P.VILLA_DETAIL_HEADERS,
  ['Huésped', 'Check-in', 'Check-out', 'Noches', 'Fecha reserva', 'Canal', 'Precio total', 'Precio neto', 'Precio/día', 'Precio neto/día', 'Personas', 'Pago', 'Código']);
eq('detalle global en pantalla: Huésped justo detrás de Canal', P.DETAIL_HEADERS,
  ['Nº villa', 'Villa', 'Check-in', 'Check-out', 'Noches', 'Fecha reserva', 'Canal', 'Huésped', 'Precio total', 'Precio neto', 'Precio/día', 'Precio neto/día', 'Código']);
eq('fichero global: columnas de Marta, Villa, Código y Huésped al final', P.FILE_HEADERS,
  ['Nº villa', 'Villa', 'Check-in', 'Check-out', 'Noches', 'Fecha reserva', 'Canal', 'Precio total', 'Precio neto', 'Precio/día', 'Precio neto/día', 'Código', 'Huésped']);
var vcsv = P.buildVillaCsv([gr, di]);
ok('CSV de la villa empieza con BOM', vcsv.charCodeAt(0) === 0xFEFF);
var vl = vcsv.slice(1).split('\r\n');
eq('CSV de la villa: cabecera exacta', vl[0], 'Huésped;Check-in;Check-out;Noches;Fecha reserva;Canal;Precio total;Precio neto;Precio/día;Precio neto/día;Personas;Pago;Código;Correo;Teléfono');
eq('CSV de la villa: fila con huésped', vl[1], 'Ana López;10/07/2026;17/07/2026;7;01/02/2026;Airbnb;1400,00;1260,00;200,00;180,00;4;Pagado;7001;ana@example.com;+34 600 000 000');
eq('CSV de la villa: fila sin huésped', vl[2], ';10/07/2026;17/07/2026;7;01/02/2026;Directa;1400,00;1400,00;200,00;200,00;;;5000001;;');
eq('Excel de la villa: números como números', P.villaDetailMatrix([gr])[0],
  ['Ana López', '10/07/2026', '17/07/2026', 7, '01/02/2026', 'Airbnb', 1400, 1260, 200, 180, 4, 'Pagado', '7001', 'ana@example.com', '+34 600 000 000']);
ok('Excel de la villa usa VILLA_FILE_HEADERS y el nombre por villa', /aoa_to_sheet\(\[VILLA_FILE_HEADERS\]\.concat\(villaDetailMatrix\(x\.rows\)\)\)/.test(SRC) &&
  /fileName\(loadInfo\.desde, loadInfo\.hasta, vr\.length \? \(vr\[0\]\.num \|\| 'sin-numero'\) : 'sin-numero', ext\)/.test(SRC));
ok('Excel global usa FILE_HEADERS', /aoa_to_sheet\(\[FILE_HEADERS\]\.concat\(detailMatrix\(rows\)\)\)/.test(SRC));
ok('filas del resumen pulsables con Intro y "Ver reservas ›"', SRC.indexOf('<tr class="vrow" tabindex="0" role="button" data-vk="\' + esc(v.villaKey)') > 0 &&
  SRC.indexOf('Ver reservas ›') > 0 && /e\.key !== 'Enter'/.test(SRC));
ok('ficha: volver, descargas y título', ['← Volver al resumen', 'Descargar Excel de esta villa', 'Descargar CSV de esta villa', 'downloadVillaXlsx: downloadVillaXlsx', 'closeVilla: closeVilla'].every(function (t) { return SRC.indexOf(t) >= 0; }));

console.log('v3: estancias de propietario');
var own = R({ hostawayReservationId: 8001, listingMapId: 1001, status: 'ownerStay', channelName: 'direct', totalPrice: null, nights: 5,
  arrivalDate: '2026-09-01', departureDate: '2026-09-06', guestName: 'PROPIETARIA', paymentStatus: 'unpaid' });
eq('fila de propietario: owner, canal Propietario, total 0, neto 0, por día vacío, sin aviso de comisión',
  [own.owner, own.channel, own.channelLabel, own.total, own.net, own.commission, own.daily, own.dailyNet, own.sinComision, own.guest, own.nights],
  [true, 'ownerStay', 'Propietario', 0, 0, 0, null, null, false, 'PROPIETARIA', 5]);
var ownPrice = R({ status: 'ownerStay', totalPrice: 500, channelName: '', channelCommissionAmount: 20 });
eq('propietario con precio en Hostaway: total y neto siguen a 0', [ownPrice.total, ownPrice.net, ownPrice.daily, ownPrice.channelLabel], [0, 0, null, 'Propietario']);
eq('reserva normal: owner = false', [di.owner, bk.owner, R({ status: 'cancelled' }).owner], [false, false, false]);
eq('etiqueta del canal ownerStay', P.channelLabel('ownerStay'), 'Propietario');
var rowsO = rows.concat([own]);
eq('filtro de estado: ownerStay pasa con new y modified', codes(P.filterRows(rowsO, {})), ['1', '2', '3', '4', '8001']);
eq('casilla marcada (includeOwner true): incluidas', codes(P.filterRows(rowsO, { includeOwner: true })), ['1', '2', '3', '4', '8001']);
eq('casilla desmarcada (includeOwner false): fuera; el resto igual', [codes(P.filterRows(rowsO, { includeOwner: false })), codes(P.filterRows(rowsO, { includeOwner: false, includeCancelled: true }))],
  [['1', '2', '3', '4'], ['1', '2', '3', '4', '5']]);
eq('canal Propietario en el filtro de canal', codes(P.filterRows(rowsO, { channels: ['ownerStay'] })), ['8001']);
var stO = P.computeStats(sel.concat([own]));
eq('cifras: propietario suma en reservas, noches, propietario y nochesPropietario',
  [stO.reservas, stO.noches, stO.propietario, stO.nochesPropietario, stO.nochesPagadas, stO.canceladas], [7, 47, 1, 5, 42, 1]);
eq('cifras: importes, comisión y medias sin el propietario (iguales que sin él)',
  [stO.total, stO.neto, stO.comision, stO.comisionPct, stO.totalConDato, stO.nochesConDato, stO.medioNoche, stO.netoMedioNoche, stO.sinComision],
  [st.total, st.neto, st.comision, st.comisionPct, st.totalConDato, st.nochesConDato, st.medioNoche, st.netoMedioNoche, st.sinComision]);
eq('nochesPagadas sin propietario = noches', [st.nochesPagadas, st.noches, st.propietario], [42, 42, 0]);
eq('medio/noche sobre noches de pago (no sobre todas)', [stO.medioNoche, P.round2(stO.total / stO.noches) !== stO.medioNoche], [214.29, true]);
eq('canal Propietario en las barras: total 0, neto 0, con su número, al final',
  stO.canales[stO.canales.length - 1], { channel: 'ownerStay', label: 'Propietario', reservas: 1, total: 0, neto: 0, conDato: 1, sinDato: 0, share: 0 });
eq('mes de llegada: el propietario no suma €', stO.porMes, st.porMes);
eq('solo propietario: medias vacías', (function () { var s = P.computeStats([own]); return [s.reservas, s.total, s.medioNoche, s.netoMedioNoche, s.comisionPct]; })(), [1, 0, null, null, null]);
eq('tarjeta Reservas: "incl. N de propietario" y canceladas', [P.reservasSub(stO), P.reservasSub(st), P.reservasSub(P.computeStats([own]))],
  ['1 canceladas, fuera de los totales · incl. 1 de propietario', '1 canceladas, fuera de los totales', 'incl. 1 de propietario']);
eq('tarjeta Estancias propietario: N noches', [P.nochesSub(5), P.nochesSub(1), P.nochesSub(0)], ['5 noches', '1 noche', '0 noches']);
var vsO = P.villaSummary(sel.concat([own]));
var v12 = vsO.filter(function (v) { return v.villaKey === 'V12'; })[0];
eq('resumen por villa: propietario en reservas, noches y Prop.; medias con noches de pago',
  [v12.reservas, v12.noches, v12.propietario, v12.nochesPagadas, v12.total, v12.neto, v12.porNoche, v12.netoPorNoche], [4, 26, 1, 21, 4800, 2650, 228.57, 189.29]);
eq('resumen por villa: villa sin propietario = Prop. 0', vsO.filter(function (v) { return v.villaKey === 'V3'; })[0].propietario, 0);
eq('cabecera del resumen: Prop. detrás de Noches (v4: Ocup. detrás de Prop.; v6: Apertura detrás de Ocup.)', P.VILLA_HEADERS, ['Nº villa', 'Villa', 'Reservas', 'Noches', 'Prop.', 'Ocup.', 'Apertura', 'Total €', 'Neto €', '€/noche', 'Neto €/noche']);
eq('hoja "Por villa": Prop. en su columna (v4: Ocup. vacía sin ventana; v6: Apertura vacía sin ventana)', P.villaMatrix([v12])[0], ['12', 'Villa Prueba', 4, 26, 1, '', '', 4800, 2650, 228.57, 189.29]);
eq('fichero global: fila de propietario', P.buildCsv([own]).slice(1).split('\r\n')[1], '12;Villa Prueba;01/09/2026;06/09/2026;5;01/02/2026;Propietario;0,00;0,00;;;8001;PROPIETARIA');
eq('Excel global: fila de propietario', P.detailMatrix([own])[0], ['12', 'Villa Prueba', '01/09/2026', '06/09/2026', 5, '01/02/2026', 'Propietario', 0, 0, '', '', '8001', 'PROPIETARIA']);
eq('fichero de la villa: fila de propietario, Pago vacío', P.buildVillaCsv([own]).slice(1).split('\r\n')[1], 'PROPIETARIA;01/09/2026;06/09/2026;5;01/02/2026;Propietario;0,00;0,00;;;;;8001;;');
var ownHtml = P.villaDetailRowHtml(own), ownCells = cells(ownHtml);
ok('ficha: propietario sin tachar', /^<tr>/.test(ownHtml), ownHtml.slice(0, 40));
eq('ficha: etiqueta propietario en Canal, 0,00, por día —, Pago —',
  [ownCells[0], ownCells[5], ownCells[6], ownCells[7], ownCells[8], ownCells[9], ownCells[11]],
  ['PROPIETARIA', 'Propietario<span class="tag">propietario</span>', '0,00', '0,00', '—', '—', '—']);
eq('etiqueta solo en propietario', [P.ownerTag(own), P.ownerTag(di)], ['<span class="tag">propietario</span>', '']);
(function () {
  var rsrc = fnSource(SRC, 'render'), psrc = fnSource(SRC, 'renderVillaPanel');
  ok('detalle global: etiqueta en la celda Canal', rsrc.indexOf("esc(r.channelLabel) + ownerTag(r) + '</td>'") > 0);
  ok('casilla "Incluir estancias de propietario" marcada por defecto', SRC.indexOf('<input type="checkbox" id="fOwner" checked> Incluir estancias de propietario</label>') > 0);
  ok('la casilla filtra en el navegador (render, sin loadReservas ni la clave de carga)',
    SRC.indexOf("g('fOwner').addEventListener('change', function(){ renderChannelChips(); render(); });") > 0 &&
    /includeOwner: includeOwner\(\)/.test(fnSource(SRC, 'currentRows')) && fnSource(SRC, 'loadReservas').indexOf('fOwner') < 0);
  ok('chips de canal sin Propietario con la casilla desmarcada', /if\(r\.owner && !withOwner\) return;/.test(fnSource(SRC, 'channelOptions')));
  ok('tarjetas: Estancias propietario, "sobre noches de pago" y "incl." en el cuadro y en la ficha', [rsrc, psrc].every(function (s) {
    return s.indexOf("'Estancias propietario', '', nochesSub(s.nochesPropietario)") > 0 && s.indexOf("'sobre noches de pago'") > 0 && s.indexOf('reservasSub(s)') > 0; }));
  ok('resumen por villa en pantalla: columna propietario ordenable y en el total (v4: con Ocup. detrás; v6: apertura debajo del %)', rsrc.indexOf("'noches', 'propietario', 'ocupacion', 'total'") > 0 && rsrc.indexOf("'</td><td>' + v.propietario + '</td><td>' + fmtPct(v.ocupacion) + '<div class=\"occ-note\">' + esc(v.apertura) + '</div></td>'") > 0 && rsrc.indexOf("s.noches + '</td><td>' + s.propietario + '</td><td>' + fmtPct(o.ocupacion) + '</td><td>' + fmtMoney(s.total)") > 0);
})();

console.log('v4: ocupación');
/* Dos villas, ventana de 10 días (1-10/4/2026), hoy fuera de la ventana: pago 4 + 3 noches, propietario 2 noches. Sin calendarios (regla v4). */
var W0 = '2026-04-01', W1 = '2026-04-10', HOY = '2026-10-13';
var occRows = [
  R({ hostawayReservationId: 9001, listingMapId: 1001, arrivalDate: '2026-04-02', departureDate: '2026-04-06', nights: 4 }),
  R({ hostawayReservationId: 9002, listingMapId: 1003, arrivalDate: '2026-04-05', departureDate: '2026-04-08', nights: 3 }),
  R({ hostawayReservationId: 9003, listingMapId: 1001, arrivalDate: '2026-04-08', departureDate: '2026-04-10', nights: 2, status: 'ownerStay' })
];
var oc = P.computeOccupancy(occRows, W0, W1, HOY);
eq('ocupación sin calendarios: 2 villas × 10 días − 2 de propietario = 18 disponibles, 7 ocupadas, 38,9 % (v6: 20 abiertas, 2 sin calendario)', oc,
  { ocupacion: 38.9, nochesOcupadas: 7, nochesPropietario: 2, disponibles: 18, abiertas: 20, sinCalendario: 2, dias: 10, villas: 2, hastaHoy: false, desde: '2026-04-01', hasta: '2026-04-10' });
eq('formato del %: coma decimal y — sin dato', [P.fmtPct(oc.ocupacion), P.fmtPct(40), P.fmtPct(null)], ['38,9 %', '40,0 %', '—']);
eq('subtítulo de la tarjeta Ocupación (v6: "N noches de M abiertas · desde–hasta · hasta hoy · sin propietario")', [P.occSub(oc), P.occSub({ nochesOcupadas: 3, disponibles: 10, hastaHoy: true, desde: '2026-01-01', hasta: '2026-10-12' }),
  P.occSub({ nochesOcupadas: 0, disponibles: 0, hastaHoy: false, desde: null, hasta: null }), P.occSub({ nochesOcupadas: 1, disponibles: 2, hastaHoy: false, desde: '2025-12-30', hasta: '2026-01-02' })],
  ['7 noches de 18 abiertas · 1 abr–10 abr · sin propietario', '3 noches de 10 abiertas · 1 ene–12 oct · hasta hoy · sin propietario', '0 noches de 0 abiertas · sin propietario',
   '1 noches de 2 abiertas · 30 dic 2025–2 ene 2026 · sin propietario']);
var clip = P.computeOccupancy([
  R({ listingMapId: 1001, arrivalDate: '2026-03-28', departureDate: '2026-04-03', nights: 6 }),
  R({ listingMapId: 1001, arrivalDate: '2026-04-09', departureDate: '2026-04-14', nights: 5 })
], W0, W1, HOY);
eq('recorte: estancia que empieza antes (2 noches dentro) y que acaba después (2 noches dentro)', [clip.nochesOcupadas, clip.disponibles, clip.ocupacion], [4, 10, 40]);
var ocC = P.computeOccupancy(occRows.concat([
  R({ listingMapId: 1003, arrivalDate: '2026-04-01', departureDate: '2026-04-10', nights: 9, status: 'cancelled' }),
  R({ listingMapId: 1040, arrivalDate: '2026-04-01', departureDate: '2026-04-10', nights: 9, status: 'cancelled' })
]), W0, W1, HOY);
eq('canceladas: no cuentan noches ni villas', [ocC.nochesOcupadas, ocC.villas, ocC.disponibles, ocC.ocupacion], [7, 2, 18, 38.9]);
var ocY = P.computeOccupancy([R({ listingMapId: 1001, arrivalDate: '2026-04-08', departureDate: '2026-04-15', nights: 7 })], '2026-01-01', '2026-12-31', '2026-04-11');
eq('año en curso sin calendario: del 1/1 hasta ayer (100 días), 3 noches dentro, hasta hoy', [ocY.dias, ocY.nochesOcupadas, ocY.disponibles, ocY.ocupacion, ocY.hastaHoy, ocY.desde, ocY.hasta], [100, 3, 100, 3, true, '2026-01-01', '2026-04-10']);
var ocF = P.computeOccupancy([R({ listingMapId: 1001, arrivalDate: '2027-07-10', departureDate: '2027-07-17', nights: 7 })], '2027-01-01', '2027-12-31', HOY);
eq('ventana futura o pasada: sin recorte por hoy (v6: el año entero, 365 días)', [ocF.dias, ocF.hastaHoy, P.computeOccupancy([], '2025-01-01', '2025-12-31', HOY).dias], [365, false, 365]);
eq('hoy = primer día de la ventana: 0 días, ocupación —', (function () { var o = P.computeOccupancy(occRows, W0, W1, W0); return [o.dias, o.disponibles, o.ocupacion]; })(), [0, 0, null]);
eq('madridToday en hora de Madrid', [P.madridToday('2026-12-31T23:30:00Z'), P.madridToday('2026-10-13T10:00:00Z')], ['2027-01-01', '2026-10-13']);
var vsOcc = P.villaSummary(occRows, W0, W1, HOY);
eq('villaSummary: ocupacion por villa (V3 3/10, V12 4/(10−2))', vsOcc.map(function (v) { return [v.villaKey, v.ocupacion]; }), [['V3', 30], ['V12', 50]]);
eq('villaSummary sin ventana: ocupacion null', P.villaSummary(occRows).map(function (v) { return v.ocupacion; }), [null, null]);
eq('hoja "Por villa": Ocup. como número', P.villaMatrix(vsOcc)[1].slice(4, 6), [1, 50]);
var resRows = P.resumenMatrix(P.computeStats(occRows), oc, W0, W1);
eq('hoja "Resumen": fila Ocupación con el %, las dos cifras de noches y el tramo desde–hasta (v6: noches abiertas según el calendario)', resRows.filter(function (r) { return r[0] === 'Ocupación'; })[0],
  ['Ocupación', '38,9 %', 7, 18, 'noches abiertas según el calendario de Hostaway · 01/04/2026–10/04/2026 · sin propietario']);
eq('hoja "Resumen" (v6): fila "Villas sin calendario" al final cuando hay alguna', resRows[resRows.length - 1], ['Villas sin calendario', 2, '', '', 'cuentan todos los días como abiertos']);
eq('hoja "Resumen": cabecera', P.RESUMEN_HEADERS, ['Concepto', 'Valor', 'Noches ocupadas', 'Noches disponibles', 'Nota']);
(function () {
  var rsrc = fnSource(SRC, 'render'), psrc = fnSource(SRC, 'renderVillaPanel');
  ok('tarjeta Ocupación primera en el cuadro y en la ficha (v6: segunda línea en el cuadro, apertura de la villa en la ficha)',
    rsrc.indexOf("kpi(fmtPct(o.ocupacion), 'Ocupación', 'green', occSub(o), occSub2(o))") > 0 &&
    psrc.indexOf("kpiBox(fmtPct(o.ocupacion), 'Ocupación', 'green', o.nochesOcupadas.toLocaleString('es-ES') + ' noches de ' + o.disponibles.toLocaleString('es-ES') + ' abiertas · ' + esc(aperturaText(apOf(f.listingMapId))) + ' · sin propietario')") > 0 &&
    rsrc.indexOf("kpi(fmtPct(o.ocupacion)") < rsrc.indexOf("'Reservas', '', reservasSub(s)") && psrc.indexOf("kpiBox(fmtPct(o.ocupacion)") < psrc.indexOf("'Reservas', '', reservasSub(s)"));
  ok('aviso gris de la ocupación (v6: días abiertos del calendario; sin el texto de temporada de la v5)', rsrc.indexOf('La ocupación se mide sobre los días abiertos en el calendario de Hostaway de cada villa: los días bloqueados y las noches de propietario no cuentan como disponibles; en el año en curso se mide hasta ayer. Debajo del porcentaje de cada villa se indican sus fechas de apertura y sus bloqueos. Cuenta solo las villas con alguna reserva en el periodo. Para edificios de varios apartamentos cuenta las unidades abiertas cada día.') > 0 &&
    rsrc.indexOf('se mide en temporada') < 0 && rsrc.indexOf('La ocupación cuenta solo las villas') < 0);
  ok('Excel: hoja "Resumen" con resumenMatrix y "Por villa" con la ventana y los calendarios (v6)', /book_append_sheet\(wb, ws0, 'Resumen'\)/.test(SRC) && /resumenMatrix\(computeStats\(rows\), occOf\(rows\)/.test(SRC) &&
    /villaMatrix\(villaSummary\(rows, loadInfo\.desde, loadInfo\.hasta, madridToday\(\), calsOf\(\), loadInfo\.calRange\)\)/.test(SRC));
  ok('HISTORIAL v4: pedido de Gary y regla de propietario', SRC.trim().split('\n').pop().indexOf('but owner stay does not count against occupancy') > 0);
})();

console.log('v6: ocupación sobre los días abiertos del calendario de Hostaway');
/* Calendario de prueba como lo da el Worker v63: [fecha, estado, unidades, bloqueadas]. st(iso) da el estado; units y blk opcionales. */
function CAL(from, to, st, units, blk) {
  var out = [], a = P.isoDayNum(from), b = P.isoDayNum(to);
  for (var x = a; x <= b; x++) { var d = P.isoFromDayNum(x), s0 = st ? st(d) : 'available'; out.push([d, s0, units || 1, blk ? blk(d, s0) : (s0 === 'blocked' ? 1 : 0)]); }
  return out;
}
function between(d, x, y) { return d >= x && d <= y; }
ok('sin constantes de temporada en el código (SEASON_START_MMDD y SEASON_END_MMDD solo quedan en el historial)', (function () { var c = SRC.replace(/<!--[\s\S]*?-->/g, ''); return c.indexOf('SEASON_START_MMDD') < 0 && c.indexOf('SEASON_END_MMDD') < 0; })());
var calA = CAL(W0, W1), calB = CAL(W0, W1, function (d) { return between(d, '2026-04-01', '2026-04-04') ? 'blocked' : 'available'; });
var o2 = P.computeOccupancy(occRows, W0, W1, HOY, { '1001': calA, '1003': calB });
eq('dos villas, 10 días: A abierta 10, B con 4 bloqueados = 16 abiertas − 2 de propietario = 14 disponibles, 7 ocupadas, 50 %',
  [o2.abiertas, o2.nochesPropietario, o2.disponibles, o2.nochesOcupadas, o2.ocupacion, o2.sinCalendario, o2.villas, o2.dias], [16, 2, 14, 7, 50, 0, 2, 10]);
eq('por villa con calendario: V3 3 de 6, V12 4 de 10 − 2', P.villaSummary(occRows, W0, W1, HOY, { '1001': calA, '1003': calB }).map(function (v) { return [v.villaKey, v.ocupacion]; }), [['V3', 50], ['V12', 50]]);
var o3 = P.computeOccupancy(occRows, W0, W1, HOY, { '1001': calA });
eq('villa sin calendario: sus 10 días cuentan abiertos y sinCalendario = 1', [o3.abiertas, o3.disponibles, o3.sinCalendario, o3.ocupacion], [20, 18, 1, 38.9]);
eq('calendars null (no se pudo leer ninguno): como la v4, todas sin calendario', [P.computeOccupancy(occRows, W0, W1, HOY, null).disponibles, P.computeOccupancy(occRows, W0, W1, HOY, null).sinCalendario], [18, 2]);
var calHalf = CAL('2026-04-01', '2026-04-05', function (d) { return d === '2026-04-02' ? 'blocked' : 'reserved'; });
eq('día del tramo que el calendario no trae: cuenta abierto (4 de 5 + 5)', P.computeOccupancy([R({ listingMapId: 1001, arrivalDate: '2026-04-02', departureDate: '2026-04-04', nights: 2 })], W0, W1, HOY, { '1001': calHalf }).abiertas, 9);
/* Varias unidades: 3 unidades, 1 bloqueada los días 3 y 4; una reserva de 2 unidades y 3 noches = 6 noches-unidad. */
var calMU = CAL(W0, W1, null, 3, function (d) { return d === '2026-04-03' || d === '2026-04-04' ? 1 : 0; });
var muRow = R({ listingMapId: 1040, arrivalDate: '2026-04-05', departureDate: '2026-04-08', nights: 3, units: 2 });
eq('enrichRow: units de la reserva (Worker v63), 1 si falta o no vale; listingMapId como texto', [muRow.units, R({}).units, R({ units: 0 }).units, R({ units: 'x' }).units, muRow.listingMapId, R({ listingMapId: null }).listingMapId], [2, 1, 1, 1, '1040', null]);
var oMU = P.computeOccupancy([muRow], W0, W1, HOY, { '1040': calMU });
eq('varias unidades: 3 × 10 − 2 = 28 abiertas; reserva de 2 unidades × 3 noches = 6; 21,4 %', [oMU.abiertas, oMU.nochesOcupadas, oMU.disponibles, oMU.ocupacion], [28, 6, 28, 21.4]);
eq('una unidad: manda el estado, no unidades − bloqueadas', [P.openUnitsOf(['2026-04-01', 'blocked', 1, 0]), P.openUnitsOf(['2026-04-01', 'reserved', 1, 1]), P.openUnitsOf(['2026-04-01', 'available', 1, 0]),
  P.openUnitsOf(['2026-04-01', 'blocked', 3, 3]), P.openUnitsOf(['2026-04-01', 'available', 3, 1]), P.openUnitsOf(['2026-04-01', 'available', 2, 5])], [0, 1, 1, 0, 2, 0]);
/* Villa Torre Vea (ejemplo del 13/10/2026): bloqueada 1/1–30/3, abierta 31/3–31/10, bloqueada 1/11–31/12. */
function torreVea(st) { return CAL('2026-01-01', '2026-12-31', function (d) { return between(d, '2026-03-31', '2026-10-31') ? (st ? st(d) : 'available') : 'blocked'; }); }
var o26 = P.computeOccupancy([R({ listingMapId: 1001, arrivalDate: '2026-07-01', departureDate: '2026-07-11', nights: 10 })], '2026-01-01', '2026-12-31', '2026-10-13', { '1001': torreVea() });
eq('2026 completo con hoy 13/10: del 1/1 al 12/10 (285 días), sin recorte de temporada; enero a marzo bloqueados cuentan 0 (196 abiertas)',
  [o26.desde, o26.hasta, o26.dias, o26.hastaHoy, o26.abiertas, o26.nochesOcupadas, o26.ocupacion], ['2026-01-01', '2026-10-12', 285, true, 196, 10, 5.1]);
var o25 = P.computeOccupancy([], '2025-01-01', '2025-12-31', '2026-10-13');
eq('2025 completo: del 1/1 al 31/12, 365 días, sin "hasta hoy"', [o25.desde, o25.hasta, o25.dias, o25.hastaHoy], ['2025-01-01', '2025-12-31', 365, false]);
eq('periodo 1/1–31/3 ya no queda vacío: cuenta lo que esté abierto (Torre Vea abre el 31/3: 1 día por villa)', P.computeOccupancy(occRows, '2026-01-01', '2026-03-31', '2026-10-13', { '1001': torreVea(), '1003': torreVea() }).abiertas, 2);
eq('hoy = primer día de la ventana: 0 días, ocupación — (también con calendario)', (function () { var o = P.computeOccupancy(occRows, W0, W1, W0, { '1001': calA }); return [o.dias, o.disponibles, o.ocupacion, o.desde]; })(), [0, 0, null, null]);
eq('segunda línea de la tarjeta', [P.occSub2({ sinCalendario: 0 }), P.occSub2({ sinCalendario: 1 }), P.occSub2({ sinCalendario: 3 })],
  ['según el calendario de Hostaway de cada villa; los días bloqueados no cuentan', 'según el calendario de Hostaway de cada villa; los días bloqueados no cuentan · 1 villa sin calendario',
   'según el calendario de Hostaway de cada villa; los días bloqueados no cuentan · 3 villas sin calendario']);

console.log('v6: apertura de cada villa (aperturaOf, aperturaText)');
var Y0 = '2026-01-01', Y1 = '2026-12-31';
function apt(days, y0, y1) { return P.aperturaText(P.aperturaOf(days, y0 || Y0, y1 || Y1)); }
eq('sin calendario', [apt(null), apt([]), P.aperturaText(null), P.aperturaOf(undefined, Y0, Y1).sinCalendario], ['Sin calendario en Hostaway: todos los días cuentan', 'Sin calendario en Hostaway: todos los días cuentan', 'Sin calendario en Hostaway: todos los días cuentan', true]);
eq('cerrada todo el periodo', [apt(CAL(Y0, Y1, function () { return 'blocked'; })), P.aperturaOf(CAL(Y0, Y1, function () { return 'blocked'; }), Y0, Y1).cerrada], ['Cerrada todo el periodo en el calendario', true]);
eq('abierta todo el año (reservada o libre)', [apt(CAL(Y0, Y1, function (d) { return d < '2026-06-01' ? 'available' : 'reserved'; })), P.aperturaOf(CAL(Y0, Y1), Y0, Y1).todoElAno], ['Abierta todo el año', true]);
var apTV = P.aperturaOf(torreVea(), Y0, Y1);
eq('Villa Torre Vea: abre el 31/3 y cierra el 31/10, sin bloqueos dentro', [apTV.abre, apTV.cierra, apTV.bloqueos.length, apTV.todoElAno, P.aperturaText(apTV)], ['2026-03-31', '2026-10-31', 0, false, 'Abierta del 31 mar al 31 oct']);
var tvBlk = torreVea(function (d) { return between(d, '2026-05-12', '2026-05-14') || d === '2026-06-02' ? 'blocked' : 'available'; });
var apBlk = P.aperturaOf(tvBlk, Y0, Y1);
eq('bloqueos dentro: 12–14 may (3 noches) y un día, 2 jun', [apBlk.bloqueos, P.aperturaText(apBlk)],
  [[{ desde: '2026-05-12', hasta: '2026-05-14', noches: 3, unidades: 1 }, { desde: '2026-06-02', hasta: '2026-06-02', noches: 1, unidades: 1 }], 'Abierta del 31 mar al 31 oct · bloqueada 12–14 may, 2 jun']);
eq('bloqueo que cambia de mes: 30 abr–2 may', apt(torreVea(function (d) { return between(d, '2026-04-30', '2026-05-02') ? 'blocked' : 'reserved'; })), 'Abierta del 31 mar al 31 oct · bloqueada 30 abr–2 may');
var five = torreVea(function (d) { return ['2026-04-10', '2026-05-10', '2026-06-10', '2026-07-10', '2026-08-10'].indexOf(d) >= 0 ? 'blocked' : 'available'; });
eq('como mucho 3 tramos y luego " y N más"', apt(five), 'Abierta del 31 mar al 31 oct · bloqueada 10 abr, 10 may, 10 jun y 2 más');
var muCal = CAL(Y0, Y1, null, 3, function (d) { return between(d, '2026-05-12', '2026-05-14') ? 1 : 0; });
var apMU = P.aperturaOf(muCal, Y0, Y1);
eq('varias unidades: "1 de 3 unidades bloqueadas 12–14 may"', [apMU.unidades, apMU.bloqueos, P.aperturaText(apMU)],
  [3, [{ desde: '2026-05-12', hasta: '2026-05-14', noches: 3, unidades: 1 }], 'Abierta del 1 ene al 31 dic · 1 de 3 unidades bloqueadas 12–14 may']);
var muCal2 = CAL(Y0, Y1, null, 3, function (d) { return d === '2026-07-01' ? 1 : d === '2026-07-02' ? 2 : 0; });
eq('varias unidades: un tramo nuevo cuando cambia el número de bloqueadas', apt(muCal2), 'Abierta del 1 ene al 31 dic · 1 de 3 unidades bloqueadas 1 jul, 2 de 3 unidades bloqueadas 2 jul');
var twoYears = CAL('2025-01-01', '2026-12-31', function (d) { return between(d, '2025-03-27', '2026-11-07') ? 'available' : 'blocked'; });
eq('abre y cierra en años distintos: con el año', apt(twoYears, '2025-01-01', '2026-12-31'), 'Abierta del 27 mar 2025 al 7 nov 2026');
eq('solo cuenta los días entre yearStart y yearEnd', P.aperturaOf(twoYears, '2026-01-01', '2026-12-31').abre, '2026-01-01');
eq('rangoTexto: un día, mismo mes, otro mes', [P.rangoTexto('2026-05-12', '2026-05-12'), P.rangoTexto('2026-05-12', '2026-05-14'), P.rangoTexto('2026-04-30', '2026-05-02'), P.rangoTexto('2025-12-30', '2026-01-02', true)],
  ['12 may', '12–14 may', '30 abr–2 may', '30 dic 2025–2 ene 2026']);
var vsAp = P.villaSummary(occRows, W0, W1, HOY, { '1001': torreVea() }, { desde: Y0, hasta: Y1 });
eq('villaSummary: apertura de cada villa (V3 sin calendario, V12 Torre Vea)', vsAp.map(function (v) { return [v.villaKey, v.apertura]; }),
  [['V3', 'Sin calendario en Hostaway: todos los días cuentan'], ['V12', 'Abierta del 31 mar al 31 oct']]);
eq('hoja "Por villa": Apertura justo detrás de Ocup.', [P.VILLA_HEADERS.indexOf('Apertura') - P.VILLA_HEADERS.indexOf('Ocup.'), P.villaMatrix(vsAp)[1].slice(5, 8)], [1, [50, 'Abierta del 31 mar al 31 oct', 1400]]);
eq('hoja "Por villa": tantas columnas como cabeceras', P.villaMatrix(vsAp)[0].length, P.VILLA_HEADERS.length);
var oRes = P.computeOccupancy(occRows, W0, W1, '2026-04-05', { '1001': calA });
var resV6 = P.resumenMatrix(P.computeStats(occRows), oRes, W0, W1);
eq('hoja "Resumen": nota v6 con "hasta hoy" y fila "Villas sin calendario"', resV6.slice(-2),
  [['Ocupación', P.fmtPct(oRes.ocupacion), oRes.nochesOcupadas, oRes.disponibles, 'noches abiertas según el calendario de Hostaway · 01/04/2026–04/04/2026 · sin propietario · hasta hoy'],
   ['Villas sin calendario', 1, '', '', 'cuentan todos los días como abiertos']]);
eq('hoja "Resumen": sin fila "Villas sin calendario" si todas tienen', P.resumenMatrix(P.computeStats(occRows), o2, W0, W1).map(function (r) { return r[0]; }).indexOf('Villas sin calendario'), -1);

console.log('v6: lectura de los calendarios');
var cu = P.buildCalendarUrl(['92782', '92783'], '2026-01-01', '2026-12-31', 'tok');
ok('buildCalendarUrl: action=hostaway-calendar, listingIds, startDate, endDate y hwToken', /\?action=hostaway-calendar&listingIds=92782%2C92783&startDate=2026-01-01&endDate=2026-12-31&hwToken=tok$/.test(cu), cu);
ok('buildCalendarUrl sin hwToken no lo manda', P.buildCalendarUrl(['1'], '2026-01-01', '2026-12-31', null).indexOf('hwToken') < 0);
var ids23 = Array.from({ length: 23 }, function (_, i) { return String(100 + i); });
eq('lotes: 23 ids → 10, 10 y 3 (CAL_BATCH 10, CAL_PARALLEL 3)', [P.calendarBatches(ids23, P.CAL_BATCH).map(function (b) { return b.length; }), P.calendarBatches(ids23, P.CAL_BATCH)[2][0], P.calendarBatches([], 10).length, P.CAL_BATCH, P.CAL_PARALLEL], [[10, 10, 3], '120', 0, 10, 3]);
eq('años leídos: el año de desde al de hasta, como mucho dos', [P.calRangeOf('2026-01-01', '2026-12-31'), P.calRangeOf('2026-05-15', '2026-09-15'), P.calRangeOf('2025-05-01', '2028-02-01')],
  [{ desde: '2026-01-01', hasta: '2026-12-31' }, { desde: '2026-01-01', hasta: '2026-12-31' }, { desde: '2025-01-01', hasta: '2026-12-31' }]);
eq('listingIdsOf: distintos, sin vacíos, canceladas también, en orden numérico', P.listingIdsOf(rows.concat([R({ listingMapId: 99 }), R({ listingMapId: null }), R({ listingMapId: 1001, status: 'cancelled' })])), ['99', '1001', '1003', '1040', '7777']);
(function () {
  var lsrc = fnSource(SRC, 'loadReservas'), csrc = fnSource(SRC, 'loadCalendars'), rsrc = fnSource(SRC, 'render');
  ok('texto de carga "Leyendo el calendario de las villas… N de M"', csrc.indexOf("'Leyendo el calendario de las villas… ' + done + ' de ' + ids.length") > 0);
  ok('lotes en paralelo: CAL_PARALLEL carriles con Promise.all; un lote que falla no para', /Math\.min\(CAL_PARALLEL, batches\.length\)/.test(csrc) && /await Promise\.all\(lanes\)/.test(csrc) && /catch\(e\)\{ console\.warn/.test(csrc));
  ok('loadReservas lee los calendarios con el hwToken de las reservas y guarda calendars, calRange, calFailed y sinCalendario',
    /loadCalendars\(calIds, calRange, res\.hwToken, myId\)/.test(lsrc) && /calendars: cal\.calendars, calRange: calRange, calFailed: cal\.failed/.test(lsrc) && /sinCalendario: calIds\.filter/.test(lsrc) &&
    /hwToken: hwToken \}/.test(fnSource(SRC, 'loadHostawayReport')));
  ok('aviso naranja si no se pudo leer ningún calendario', rsrc.indexOf("if(loadInfo.calFailed) av.push('<div class=\"info-box orange\">No se pudo leer el calendario de Hostaway: la ocupación cuenta todos los días como abiertos.</div>');") > 0);
  ok('pantalla: sin columna Apertura en la cabecera (va debajo del %)', rsrc.indexOf("VILLA_HEADERS.filter(function(h){ return h !== 'Apertura'; })") > 0 && /\.occ-note\{[^}]*font-size:11px[^}]*white-space:normal/.test(SRC));
  ok('ocupación con los calendarios (null si fallaron todos)', /function calsOf\(\)\{ return loadInfo && !loadInfo\.calFailed \? loadInfo\.calendars : null; \}/.test(SRC) &&
    /computeOccupancy\(rows, loadInfo\.desde, loadInfo\.hasta, madridToday\(\), calsOf\(\)\)/.test(fnSource(SRC, 'occOf')));
})();
ok('HISTORIAL v6: los dos pedidos de Gary, la regla, la alternativa y las varias unidades', (function () { var h = SRC.trim().split('\n').pop(); return h.indexOf('check the occupancy against open days') > 0 &&
  h.indexOf('in the report under the occupency percentage put the open and blocked dates so that the user understands whats being measured') > 0 && h.indexOf('hostaway-calendar') > 0 &&
  h.indexOf('No se pudo leer el calendario de Hostaway') > 0 && h.indexOf('Edificios de varios apartamentos') > 0 && h.indexOf('Abierta del 31 mar al 31 oct') > 0; })());
ok('HISTORIAL v5: los dos pedidos de Gary y las constantes (siguen en el historial)', (function () { var h = SRC.trim().split('\n').pop(); return h.indexOf('change occupancy to begin on April 1st') > 0 &&
  h.indexOf('occupancy ends on October 31st') > 0 && h.indexOf("SEASON_START_MMDD = '04-01'") > 0 && h.indexOf("SEASON_END_MMDD = '10-31'") > 0; })());
eq('fmtDiaMes: "1 abr", "15 may", vacío sin fecha', [P.fmtDiaMes('2026-04-01'), P.fmtDiaMes('2026-05-15'), P.fmtDiaMes('')], ['1 abr', '15 may', '']);
eq('isoFromDayNum ida y vuelta con isoDayNum', P.isoFromDayNum(P.isoDayNum('2026-10-31')), '2026-10-31');

console.log('Lectura del Worker');
var u = P.buildPageUrl('2026-01-01', '2026-12-31', '123', 'tok', true);
ok('action=hostaway-report-page con afterId, hwToken e includeCancelled', /\?action=hostaway-report-page&arrivalStartDate=2026-01-01&arrivalEndDate=2026-12-31&afterId=123&hwToken=tok&includeCancelled=1$/.test(u), u);
ok('sin canceladas no manda includeCancelled', P.buildPageUrl('2026-01-01', '2026-12-31', null, null, false).indexOf('includeCancelled') < 0);
eq('tope de 100 páginas', P.MAX_PAGES, 100);
ok('progreso "Descargando reservas… N"', SRC.indexOf("'Descargando reservas… ' + all.length") > 0);
ok('cabeceras con Content-Type y Auth.headers()', /Object\.assign\(\{ 'Content-Type': 'application\/json' \}, Auth\.headers\(\)\)/.test(SRC));
ok('TaVillas con limit=1000', SRC.indexOf("'?action=data&table=TaVillas&limit=1000'") > 0);
eq('año de Madrid: 31/12 23:30 UTC ya es año nuevo', P.madridYear('2026-12-31T23:30:00Z'), '2027');

console.log('Página');
var VIVO = SRC.replace(/<!--[\s\S]*?-->/g, '');
ok('gate Auth.require(informe-reservas)', /<script>Auth\.require\('informe-reservas'\);<\/script>/.test(SRC));
ok('versión v6 en cabecera (línea 3), PAGE_VERSION, título y etiqueta de consola', SRC.split('\n')[2] === '<!-- VERSIÓN ACTUAL: v6 | Historial completo al final -->' && /PAGE_VERSION = 6;/.test(SRC) && /<title>Informe de reservas v6/.test(SRC) &&
  SRC.indexOf("'[Informe reservas v6]'") > 0 && SRC.indexOf('PAGE_VERSION = 5;') < 0 && SRC.indexOf("'[Informe reservas v5]'") < 0);
ok('HISTORIAL es la última línea y empieza por v6, con v5, v4, v3, v2 y v1 detrás', /^<!-- HISTORIAL: v6 - 13\/10\/2026 [\s\S]* \| v5 - 13\/10\/2026 [\s\S]* \| v4 - 13\/10\/2026 [\s\S]* \| v3 - 13\/10\/2026 [\s\S]* \| v2 - 13\/10\/2026 [\s\S]* \| v1 - 13\/10\/2026 [\s\S]* -->$/.test(SRC.trim().split('\n').pop()));
ok('HISTORIAL v3: pedido de Gary y dependencia del Worker v61', (function () { var h = SRC.trim().split('\n').pop(); return h.indexOf('owner stays need to be in the report as well') > 0 &&
  h.indexOf('Worker v61') > 0 && h.indexOf("status 'ownerStay'") > 0; })());
ok('HISTORIAL v2: pedido de Gary y aviso del Worker v59', (function () { var h = SRC.trim().split('\n').pop(); return h.indexOf('i need to be able to select and click into that villa') > 0 &&
  h.indexOf('hasta que el Worker v59 esté desplegado los campos del huésped llegan vacíos y se muestran como —') > 0; })());
ok('textos de avisos y errores', ['Lectura de Hostaway a las ', 'sin dato de comisión (neto vacío)', 'de alojamientos sin villa en la intranet',
  'Precio neto = precio total menos la comisión del portal (Booking.com y Airbnb). Reservas directas y web: neto = total.',
  'No se pudieron cargar las reservas. ', 'Tu usuario no tiene permiso para este informe.'].every(function (t) { return VIVO.indexOf(t) >= 0; }));
ok('botones y filtros', ['Descargar Excel', 'Descargar CSV', 'Cargar reservas', 'Incluir canceladas', 'Llegada desde', 'Llegada hasta', "' de ' + opts.length + ' villas'"].every(function (t) { return VIVO.indexOf(t) >= 0; }));
ok('SheetJS 0.18.5 con defer y respaldo CSV', /<script defer src="https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\/xlsx\/0\.18\.5\/xlsx\.full\.min\.js"><\/script>/.test(SRC) && /if\(!window\.XLSX\)\{[^}]*downloadCsv\(\)/.test(SRC));
ok('hojas "Reservas" y "Por villa"', /book_append_sheet\(wb, ws1, 'Reservas'\)/.test(SRC) && /book_append_sheet\(wb, ws2, 'Por villa'\)/.test(SRC));
ok('sin escrituras', !/method\s*:\s*['"](POST|PUT|DELETE)/i.test(VIVO));
ok('encabezados sin cortar palabras', /th\{[^}]*white-space:nowrap/.test(SRC));
ok('los scripts inline compilan', (function () {
  var re = /<script>([\s\S]*?)<\/script>/g, mm, n = 0;
  while ((mm = re.exec(SRC))) { try { new Function(mm[1]); n++; } catch (e) { return e.message; } }
  return n > 0;
})() === true);

console.log('auth.js y nav.js');
var AUTH = fs.readFileSync(path.join(__dirname, 'auth.js'), 'utf8');
var keyLines = AUTH.split('\n').filter(function (l) { return /'informe-reservas'\s*:/.test(l); });
ok('auth.js: una clave informe-reservas solo para admin', keyLines.length === 1 && /'informe-reservas'\s*:\s*\['admin'\]\s*,/.test(keyLines[0]));
/* 13/10/2026 (Gary: "this is for marta only"): Marta abre la página por su correo (USER_PERMISSIONS), no por su rol (manager).
   Se ejecuta el texto real de PERMISSIONS, USER_PERMISSIONS y hasAccess de auth.js. */
function constSource(src, name) {
  var i = src.indexOf('const ' + name + ' =');
  if (i < 0) throw new Error('no encuentro const ' + name);
  return src.slice(i, blockEnd(src, src.indexOf('{', i), '{', '}')) + ';';
}
var A = new Function(constSource(AUTH, 'PERMISSIONS') + '\n' + constSource(AUTH, 'USER_PERMISSIONS') + '\n' + fnSource(AUTH, 'hasAccess') +
  '\nreturn { PERMISSIONS: PERMISSIONS, USER_PERMISSIONS: USER_PERMISSIONS, hasAccess: hasAccess };')();
ok('USER_PERMISSIONS: Marta, Rafa, Jose y Johannes tienen informe-reservas (13/10/2026: "she, rafa and the partners should have access"; otras páginas pueden añadir sus propias entradas)',
  ['marta@3villas.com', 'rafa@3villas.com', 'jose@3villas.com', 'johannes@3villas.com'].every(function (u) { return Array.isArray(A.USER_PERMISSIONS[u]) && A.USER_PERMISSIONS[u].indexOf('informe-reservas') >= 0; }));
eq('Rafa, Jose y Johannes (manager) abren el informe', [A.hasAccess('manager', 'informe-reservas', 'rafa@3villas.com'), A.hasAccess('manager', 'informe-reservas', 'jose@3villas.com'), A.hasAccess('manager', 'informe-reservas', 'Johannes@3villas.com')], [true, true, true]);
eq('hasAccess admin (cualquier correo o ninguno)', [A.hasAccess('admin', 'informe-reservas', 'toni@3villas.com'), A.hasAccess('admin', 'informe-reservas')], [true, true]);
eq('hasAccess Marta (manager), también con mayúsculas y espacios',
  [A.hasAccess('manager', 'informe-reservas', 'marta@3villas.com'), A.hasAccess('manager', 'informe-reservas', 'Marta@3Villas.com'), A.hasAccess('manager', 'informe-reservas', ' marta@3villas.com ')], [true, true, true]);
eq('el correo de Marta da el permiso con cualquier rol', A.hasAccess('cleaner', 'informe-reservas', 'marta@3villas.com'), true);
eq('otro manager, staff o sin correo: no', [A.hasAccess('manager', 'informe-reservas', 'toni@3villas.com'), A.hasAccess('staff', 'informe-reservas', 'kike@3villas.com'),
  A.hasAccess('manager', 'informe-reservas', ''), A.hasAccess('manager', 'informe-reservas', null)], [false, false, false, false]);
eq('el correo de Marta no abre otras páginas', [A.hasAccess('manager', 'permisos', 'marta@3villas.com'), A.hasAccess('staff', 'manuales', 'marta@3villas.com')], [false, false]);
eq('los permisos por rol siguen igual', [A.hasAccess('manager', 'manuales'), A.hasAccess('staff', 'entradas', undefined), A.hasAccess('admin', 'no-existe', 'marta@3villas.com')], [true, true, false]);
var reqSrc = (function () { var k = AUTH.indexOf('require(page) {'); return AUTH.slice(k, blockEnd(AUTH, AUTH.indexOf('{', k), '{', '}')); })();
ok('require pasa el correo de la sesión a hasAccess', /hasAccess\(session\.role, page, session\.payload && session\.payload\.email\)/.test(reqSrc));
var NAV = fs.readFileSync(path.join(__dirname, 'nav.js'), 'utf8');
var ctxNav = { console: { log: function () {}, warn: function () {}, error: function () {} }, window: {},
  localStorage: { setItem: function () {} }, location: { pathname: '/intranet/x.html', protocol: 'file:' }, fetch: function () {} };
require('vm').runInNewContext(NAV + '\nvar __all = NAV_MENUS;', ctxNav);
function flat(menu) { var out = []; menu.forEach(function (it) { if (it.children) it.children.forEach(function (c) { out.push(c); }); else out.push(it); }); return out; }
function count(role) { return flat(ctxNav.__all[role]).filter(function (x) { return x.url === 'informe-reservas.html' && x.label === 'Informe de reservas' && x.icon === '📊'; }).length; }
function after(role, url) { var L = flat(ctxNav.__all[role]), i = L.findIndex(function (x) { return x.url === url; }); return L[i + 1] && L[i + 1].url === 'informe-reservas.html'; }
var listados = ctxNav.__all.admin.find(function (x) { return x.label === 'Listados'; });
ok('admin: en Listados, justo debajo de Prospección mensual', count('admin') === 1 && after('admin', 'reports-prospeccion-mensual.html') && listados.children.some(function (c) { return c.url === 'informe-reservas.html'; }));
ok('manager comparte el menú de admin (Marta es manager)', count('manager') === 1);
ok('staff (y villamanager) ya no la ven', count('staff') === 0 && count('villamanager') === 0);
ok('sales y cleaner no la ven', ['sales', 'cleaner'].every(function (r) { return !ctxNav.__all[r] || count(r) === 0; }));
ok('nav.js: version 18 o posterior y la entrada v18 del historial (otras páginas suben la versión)', (function () {
  var m = NAV.match(/VERSIÓN ACTUAL: v(\d+) \|/), n = m ? parseInt(m[1], 10) : 0, c = NAV.match(/var NAV_VERSION = (\d+);/);
  return n >= 18 && c && parseInt(c[1], 10) === n && /\bv18 - La entrada 'Informe de reservas' sale de _menuStaff[^|]*Unico cambio\./.test(NAV);
})());

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
