/* Pruebas de informe-reservas.html v2 (13/10/2026, petición de Marta, Reservas; v2 = ficha por villa, Gary).
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
  'huespedCell', 'villaDetailRowHtml', 'esc'];
var VARS = ['WORKER', 'MAX_PAGES', 'CHANNEL_LABELS', 'DETAIL_HEADERS', 'VILLA_HEADERS', 'MESES_CORTOS',
  'FILE_HEADERS', 'VILLA_DETAIL_HEADERS', 'VILLA_FILE_HEADERS', 'PAGO_LABELS'];
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
ok('versión v2 en cabecera (línea 3), PAGE_VERSION y título', SRC.split('\n')[2] === '<!-- VERSIÓN ACTUAL: v2 | Historial completo al final -->' && /PAGE_VERSION = 2;/.test(SRC) && /<title>Informe de reservas v2/.test(SRC));
ok('HISTORIAL es la última línea y empieza por v2, con v1 detrás', /^<!-- HISTORIAL: v2 - 13\/10\/2026 [\s\S]* \| v1 - 13\/10\/2026 [\s\S]* -->$/.test(SRC.trim().split('\n').pop()));
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
ok('la clave va justo debajo de notas-villamanager', (function () { var L = AUTH.split('\n'), i = L.findIndex(function (l) { return /'notas-villamanager'\s*:/.test(l); }); return /'informe-reservas'/.test(L[i + 1] || ''); })());
/* 13/10/2026 (Gary: "this is for marta only"): Marta abre la página por su correo (USER_PERMISSIONS), no por su rol (manager).
   Se ejecuta el texto real de PERMISSIONS, USER_PERMISSIONS y hasAccess de auth.js. */
function constSource(src, name) {
  var i = src.indexOf('const ' + name + ' =');
  if (i < 0) throw new Error('no encuentro const ' + name);
  return src.slice(i, blockEnd(src, src.indexOf('{', i), '{', '}')) + ';';
}
var A = new Function(constSource(AUTH, 'PERMISSIONS') + '\n' + constSource(AUTH, 'USER_PERMISSIONS') + '\n' + fnSource(AUTH, 'hasAccess') +
  '\nreturn { PERMISSIONS: PERMISSIONS, USER_PERMISSIONS: USER_PERMISSIONS, hasAccess: hasAccess };')();
eq('USER_PERMISSIONS: Marta, Rafa, Jose y Johannes -> informe-reservas (13/10/2026: "she, rafa and the partners should have access")', A.USER_PERMISSIONS,
  { 'marta@3villas.com': ['informe-reservas'], 'rafa@3villas.com': ['informe-reservas'], 'jose@3villas.com': ['informe-reservas'], 'johannes@3villas.com': ['informe-reservas'] });
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
ok('nav.js v18: cabecera, NAV_VERSION e historial', /3Villas  v18/.test(NAV) && /VERSIÓN ACTUAL: v18 \|/.test(NAV) && NAV.indexOf('var NAV_VERSION = 18;') > 0 && NAV.indexOf('var NAV_VERSION = 17;') < 0 &&
  /\/\/ HISTORIAL: v18 - La entrada 'Informe de reservas' sale de _menuStaff[^|]*Unico cambio\. \| v17 - Nueva entrada 'Informe de reservas'[^|]*Unico cambio\. \| v16 - /.test(NAV));

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
