/* Pruebas de historial-whatsapp.html v2 (v1 12/10/2026, bead bd_3villas-t1mv.2; v2 13/10/2026,
   bead bd_3villas-t1mv.4: estancias y villas desde el Worker).
   El Worker whatsapp-history tiene sus propias pruebas
   (3villas/workers/whatsapp-history/test/index.test.mjs). Aquí se prueba la página:
   estancias desde /stays, agrupar por estancia (14 días antes, 7 después), vista de villa,
   entrada por ?phone= / ?villa=, plegar mensajes automáticos, resaltar y contar coincidencias,
   normalizar teléfonos igual que el archivo y el Worker, y el enlace desde
   notas-equipo-reservas. Al final, de punta a punta con el Worker real sobre una base en
   memoria (node:sqlite). Datos inventados (+34 600 000 0xx).
   node historial-whatsapp.test.js

   Como whaticket-envio.test.js: NO copia el código de la página. Extrae el texto
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
/* var NOMBRE = [ ... ];  o  var NOMBRE = { ... };  o  var NOMBRE = (...).split(' '); */
function varSource(src, name) {
  var i = src.indexOf('var ' + name + ' =');
  if (i < 0) throw new Error('no encuentro var ' + name);
  return src.slice(i, src.indexOf(';\n', i) + 1);
}

var SRC = fs.readFileSync(path.join(__dirname, 'historial-whatsapp.html'), 'utf8');
var NOTAS = fs.readFileSync(path.join(__dirname, 'notas-equipo-reservas.html'), 'utf8');

var FNS = ['esc', 'countryCodeLength', 'normalizePhone', 'fmtPhone', 'foldText', 'isAutoMessage', 'collapseAuto',
  'madridDay', 'madridParts', 'dayNum', 'assignStay', 'groupByStay', 'highlightHtml', 'fmtStayRange', 'fmtStayLabel',
  'fmtDayLong', 'stayFromRow', 'fmtMonthYear', 'stayHint', 'urlEntry', 'villaRowHtml', 'villaGuestHtml', 'guestSummary', 'resultHtml'];
var VARS = ['MESES', 'MESES_LARGOS', 'AUTO_TEMPLATES', 'CC2'];
var code = VARS.map(function (v) { return varSource(SRC, v); }).join('\n') + '\n' +
  (SRC.match(/var STAY_BEFORE_DAYS = \d+, STAY_AFTER_DAYS = \d+;/) || [''])[0] + '\n' +
  FNS.map(function (f) { return fnSource(SRC, f); }).join('\n') +
  '\nreturn {' + FNS.concat(VARS, ['STAY_BEFORE_DAYS', 'STAY_AFTER_DAYS']).map(function (n) { return n + ':' + n; }).join(',') + '};';
var P = new Function(code)();

/* Casos del copiador (archive_common.py normalize_phone), los mismos que el Worker. */
var PHONE_CASES = [
  ['+34 600 000 001', '+34600000001'], ['0034600000001', '+34600000001'], ['600000001', '+34600000001'],
  ['600-000-001', '+34600000001'], ['600.000.001', '+34600000001'], ['(600) 000 001', '+34600000001'],
  ['34600000001', '+34600000001'], ['+33 6 00 00 00 01', '+33600000001'], ['0044 7700 900123', '+447700900123'],
  ['447700900123', '+447700900123'], ['+1 (813) 555-0100', '+18135550100'], ['512345678', '+512345678'],
  ['+44 (0)7700 900123', '+4407700900123'], ['600 000 001', '+34600000001'],
  ['abc', null], ['600 000 001; DROP', null], ['+', null], ['00', null], ['', null]
];

(async function () {
  console.log('normalizePhone: la regla del archivo (archive_common.py)');
  PHONE_CASES.forEach(function (c) { eq('normalizePhone ' + JSON.stringify(c[0]), P.normalizePhone(c[0]), c[1]); });
  eq('wa_id (internacional) no recibe +34', P.normalizePhone('600000001', true), '+600000001');
  var workerSrc = path.join(__dirname, '..', '..', '3villas', 'workers', 'whatsapp-history', 'src', 'index.js');
  var W = null;
  if (fs.existsSync(workerSrc)) {
    W = await import(require('url').pathToFileURL(workerSrc).href);
    var diff = PHONE_CASES.concat([['600000001'], ['34 600 000 001'], ['+34 (600) 000-001']]).filter(function (c) {
      return W.normalizePhone(c[0]) !== P.normalizePhone(c[0]) || W.normalizePhone(c[0], true) !== P.normalizePhone(c[0], true);
    });
    eq('la página y el Worker normalizan igual', diff.map(function (c) { return c[0]; }), []);
  } else {
    console.log('  (Worker no encontrado en ' + workerSrc + ': comparación omitida)');
  }
  eq('fmtPhone España', P.fmtPhone('+34600000001'), '+34 600 000 001');
  eq('fmtPhone extranjero', P.fmtPhone('+447700900123'), '+44 7700900123');

  console.log('Estancias desde el Worker (/stays): Confirmado / Posible coincidencia / huéspedes por número');
  function srow(o) {
    return { booking_code: o.code, villa_title: o.villa || 'Villa Inventada', villa_fs_id: 901, checkin: o.ci, checkout: o.co,
      guest_name: o.name, booking_status: o.st || 'confirmed', match_kind: o.mk || 'exact' };
  }
  var sOk = P.stayFromRow(srow({ code: 'T0000001', ci: '2024-07-10', co: '2024-07-17', name: 'Ana Prueba' }));
  var sMaybe = P.stayFromRow(srow({ code: 'T0000002', ci: '2025-07-12', co: '2025-07-19', name: 'Ana Prueba', mk: 'last9' }));
  var sArr = P.stayFromRow(srow({ code: 'T0000003', ci: '2025-08-01', co: '2025-08-05', name: 'Bruno Ejemplo' }));
  var sCan = P.stayFromRow(srow({ code: 'T0000005', ci: '2026-01-01', co: '2026-01-05', name: 'Ana Prueba', st: 'Cancelled' }));
  eq('match_kind exact = confirmado', sOk.match, 'confirmado');
  eq('match_kind last9 = posible', sMaybe.match, 'posible');
  eq('campos de la fila: código, fechas, villa, huésped', [sOk.code, sOk.checkin, sOk.checkout, sOk.villa, sOk.guest],
    ['T0000001', '2024-07-10', '2024-07-17', 'Villa Inventada', 'Ana Prueba']);
  eq('una fecha con hora se corta al día', P.stayFromRow(srow({ code: 'X', ci: '2024-07-10T00:00:00', co: '2024-07-17T00:00:00' })).checkout, '2024-07-17');
  eq('cancelada se marca (sin mayúsculas)', sCan.cancelled, true);
  eq('una fila vacía no rompe', [P.stayFromRow({}).code, P.stayFromRow(null).villa], ['', '']);
  var sum = P.guestSummary([sOk, sMaybe, sArr, sCan]);
  eq('insignia confirmado si alguna reserva confirma', sum.badge, 'confirmado');
  eq('estancias repetidas sin la cancelada', sum.stayCount, 3);
  eq('Este número tiene 2 huéspedes', sum.guests, ['Ana Prueba', 'Bruno Ejemplo']);
  eq('solo posibles = posible', P.guestSummary([sMaybe]).badge, 'posible');
  eq('sin reservas = Sin identificar', P.guestSummary([]).badge, 'sin');

  console.log('Agrupar por estancia: 14 días antes de la llegada, 7 después de la salida');
  eq('la regla del contrato', [P.STAY_BEFORE_DAYS, P.STAY_AFTER_DAYS], [14, 7]);
  var stays = [sOk, sMaybe];
  function m(id, at, dir, body) { return { id: id, occurred_at: at, direction: dir || 'in', kind: 'text', body: body || 'x' }; }
  eq('14 días antes de la llegada = esa estancia', P.assignStay('2024-06-26T10:00:00Z', stays), 0);
  eq('15 días antes = sin reserva', P.assignStay('2024-06-25T10:00:00Z', stays), -1);
  eq('durante la estancia', P.assignStay('2024-07-12T10:00:00Z', stays), 0);
  eq('7 días después de la salida = esa estancia', P.assignStay('2025-07-26T10:00:00Z', stays), 1);
  eq('8 días después = sin reserva', P.assignStay('2025-07-27T10:00:00Z', stays), -1);
  eq('lejos de todo = sin reserva', P.assignStay('2025-12-01T10:00:00Z', stays), -1);
  eq('una reserva cancelada no agrupa', P.assignStay('2026-01-02T10:00:00Z', [sCan]), -1);
  var near = [{ checkin: '2025-07-01', checkout: '2025-07-08' }, { checkin: '2025-07-20', checkout: '2025-07-27' }];
  eq('entre dos estancias gana la más cercana', [P.assignStay('2025-07-10T10:00:00Z', near), P.assignStay('2025-07-17T10:00:00Z', near)], [0, 1]);
  eq('hora de Madrid: 23:30 UTC del 9 ya es día 10', P.madridDay('2025-07-09T23:30:00Z'), '2025-07-10');
  eq('hora de Madrid en el borde: 22:30 UTC del 25 jun = día 26 = dentro', P.assignStay('2024-06-25T22:30:00Z', stays), 0);
  var msgs = [m(7, '2024-06-20T09:00:00Z'), m(1, '2024-06-28T09:00:00Z'), m(2, '2024-07-11T09:00:00Z'), m(3, '2025-01-05T09:00:00Z'),
    m(4, '2025-07-01T09:00:00Z'), m(5, '2025-07-15T09:00:00Z'), m(6, '2025-12-24T09:00:00Z')];
  var groups = P.groupByStay(msgs, stays);
  eq('tramos seguidos por estancia', groups.map(function (gr) { return [gr.stayIndex, gr.messages.map(function (x) { return x.id; })]; }),
    [[-1, [7]], [0, [1, 2]], [-1, [3]], [1, [4, 5]], [-1, [6]]]);
  eq('etiqueta de la banda', P.fmtStayLabel(sMaybe), 'Estancia 12–19 jul 2025 · Villa Inventada · Reserva #T0000002');
  eq('banda sin reserva', P.fmtStayLabel(null), 'Sin reserva');

  console.log('Resultados de búsqueda con estancias');
  eq('varias estancias', P.stayHint({ stay_count: 2, last_villa: 'Villa Inventada Dos', last_checkin: '2025-07-10' }), '2 estancias · última en Villa Inventada Dos (jul 2025)');
  eq('una estancia', P.stayHint({ stay_count: 1, last_villa: 'Villa Inventada Uno', last_checkin: '2024-06-05' }), '1 estancia · última en Villa Inventada Uno (jun 2024)');
  eq('sin estancias', P.stayHint({ stay_count: 0, last_villa: null, last_checkin: null }), 'Sin reservas asociadas');
  eq('mes y año', [P.fmtMonthYear('2025-12-28'), P.fmtMonthYear(''), P.fmtMonthYear('basura')], ['dic 2025', '', '']);
  var rhs = P.resultHtml({ wa_id: '34600000001', display_name: 'Ana Prueba', phone_e164: '+34600000001', match: 'exacta', stay_count: 2, last_villa: 'Villa <b>Rara</b>', last_checkin: '2025-07-10' });
  ok('el resultado lleva las estancias, con la villa escapada', rhs.indexOf('2 estancias · última en Villa &lt;b&gt;Rara&lt;/b&gt; (jul 2025)') > 0 && rhs.indexOf('<b>Rara') < 0, rhs);

  console.log('Entrada por dirección: ?phone=, ?tel=, ?villa=');
  eq('?phone= con + escrito como %2B', P.urlEntry('?phone=%2B34600000001'), { kind: 'phone', value: '+34600000001' });
  eq('?phone= con + sin codificar (llega como espacio) da el mismo número', P.normalizePhone(P.urlEntry('?phone=+34600000001').value), '+34600000001');
  eq('?tel= (enlace de notas) sigue valiendo', P.urlEntry('?tel=600000001'), { kind: 'phone', value: '600000001' });
  eq('?villa= abre la villa', P.urlEntry('?villa=Villa%20Inventada%20Uno'), { kind: 'villa', value: 'Villa Inventada Uno' });
  eq('con los dos manda el teléfono', P.urlEntry('?villa=X&phone=600000001').kind, 'phone');
  eq('sin parámetros o vacíos = nada', [P.urlEntry(''), P.urlEntry('?villa=%20'), P.urlEntry('?otro=1')], [null, null, null]);
  eq('un valor muy largo se corta', P.urlEntry('?villa=' + 'x'.repeat(300)).value.length, 120);

  console.log('Vista de villa');
  var evilV = 'Villa "<b>" x\');alert(1);//';
  var vr = P.villaRowHtml({ title: evilV, chat_count: 1, last_checkin: '2025-08-01' });
  ok('fila de villa: nombre escapado en data-villa, sin onclick', vr.indexOf('data-act="villa" data-villa="Villa &quot;&lt;b&gt;&quot; x&#39;);alert(1);//"') > 0 && vr.indexOf('<b>"') < 0 && vr.indexOf('onclick') < 0, vr);
  ok('1 huésped / 2 huéspedes con chat y última llegada', vr.indexOf('1 huésped con chat · última llegada ago 2025') > 0 &&
    P.villaRowHtml({ title: 'V', chat_count: 2 }).indexOf('2 huéspedes con chat') > 0);
  var vg = P.villaGuestHtml({ wa_id: '34600000001', phone_e164: '+34600000001', display_name: null, last_message_at: '2025-07-20T10:00:00Z',
    stays: [{ checkin: '2025-07-03', checkout: '2025-07-10', guest_name: 'Ana <i>Prueba</i>', booking_status: 'accepted' },
      { checkin: '2024-07-03', checkout: '2024-07-10', guest_name: 'Ana Prueba', booking_status: 'new' }] });
  ok('huésped de la villa: abre su ficha por data-wa', vg.indexOf('data-act="guest" data-wa="34600000001"') > 0);
  ok('sin nombre de contacto usa el de la reserva, escapado', vg.indexOf('Ana &lt;i&gt;Prueba&lt;/i&gt;') > 0 && vg.indexOf('<i>') < 0);
  ok('fechas de sus estancias en la villa (el Worker ya quitó las canceladas)', vg.indexOf('Estancias aquí: 3–10 jul 2025 · 3–10 jul 2024') > 0 && vg.indexOf('cancelada') < 0, vg);

  console.log('Regla de cancelada: los cinco estados del archivo');
  eq('solo "cancel..." (cualquier mayúscula) es cancelada', ['new', 'modified', 'cancelled', 'accepted', 'ownerStay', 'Cancelled', 'CANCELED', ''].map(function (s) {
    return P.stayFromRow({ booking_status: s }).cancelled; }), [false, false, true, false, false, true, true, false]);

  console.log('Ficha: un fallo de /stays no es "No hay reservas"');
  var STAYS_ERR = (SRC.match(/var STAYS_ERROR_TEXT = '([^']+)';/) || [])[1];
  eq('texto del error de reservas', STAYS_ERR, 'No se pudieron cargar las reservas. Inténtalo de nuevo.');
  function guestHarness(hw) {
    var els = {}, toasts = [];
    var S = { contact: { wa_id: '34600000001', phone_e164: '+34600000001', display_name: 'Ana Prueba', first_seen_at: null }, stays: [], staysError: false, total: 3 };
    var f = new Function('S', 'g', 'hwFetch', 'toast', 'stayFromRow', 'guestSummary', 'esc', 'fmtPhone', 'fmtDayLong', 'madridDay', 'fmtStayRange',
      'STAYS_MAX_PAGES', 'STAYS_ERROR_TEXT',
      fnSource(SRC, 'loadStays') + '\n' + fnSource(SRC, 'renderGuest') + '\nreturn { loadStays: loadStays, renderGuest: renderGuest };')(
      S, function (id) { return (els[id] = els[id] || { innerHTML: '' }); }, hw, function (t) { toasts.push(t); },
      P.stayFromRow, P.guestSummary, P.esc, P.fmtPhone, P.fmtDayLong, P.madridDay, P.fmtStayRange, 5, STAYS_ERR);
    return { S: S, els: els, toasts: toasts, run: function () { return f.loadStays(S.contact).then(function () { f.renderGuest(); }); } };
  }
  var hErr = guestHarness(function () { return Promise.reject(new Error('Error del servidor (500).')); });
  await hErr.run();
  ok('/stays falla: la tarjeta de estancias muestra el error', hErr.els.staysList.innerHTML.indexOf('class="msg-err"') >= 0 && hErr.els.staysList.innerHTML.indexOf(STAYS_ERR) >= 0, hErr.els.staysList.innerHTML);
  ok('/stays falla: nunca "No hay reservas con este número."', hErr.els.staysList.innerHTML.indexOf('No hay reservas') < 0);
  ok('/stays falla: ni "Sin identificar"; insignia "Reservas sin cargar"', (hErr.els.guestBadge.innerHTML + hErr.els.guestCard.innerHTML).indexOf('Sin identificar') < 0 &&
    hErr.els.guestBadge.innerHTML.indexOf('Reservas sin cargar') >= 0);
  eq('/stays falla: aviso con el mismo texto', hErr.toasts, [STAYS_ERR]);
  var calls2 = 0;
  var hErr2 = guestHarness(function () { return ++calls2 === 1 ? Promise.resolve({ stays: [srow({ code: 'T1', ci: '2024-07-10', co: '2024-07-17', name: 'Ana' })], has_more: true }) : Promise.reject(new Error('x')); });
  await hErr2.run();
  ok('falla la página 2: error, no media lista', hErr2.S.staysError === true && hErr2.S.stays.length === 0 && hErr2.els.staysList.innerHTML.indexOf(STAYS_ERR) >= 0);
  var asked = [];
  var hOk = guestHarness(function (p) {
    asked.push(p);
    return Promise.resolve(p.indexOf('page=1') > 0
      ? { stays: [srow({ code: 'T3', ci: '2026-01-02', co: '2026-01-05', name: 'Ana Prueba', st: 'cancelled' }), srow({ code: 'T2', ci: '2025-07-10', co: '2025-07-17', name: 'Ana Prueba', mk: 'last9' })], has_more: true }
      : { stays: [srow({ code: 'T1', ci: '2024-07-03', co: '2024-07-10', name: 'Ana Prueba' })], has_more: false });
  });
  await hOk.run();
  eq('lee /stays página a página con el wa_id', asked, ['/stays?wa_id=34600000001&page=1', '/stays?wa_id=34600000001&page=2']);
  eq('estancias guardadas de la más antigua a la más reciente, sin error', [hOk.S.stays.map(function (s) { return s.code; }), hOk.S.staysError], [['T1', 'T2', 'T3'], false]);
  var lst = hOk.els.staysList.innerHTML;
  ok('la ficha lista la más reciente arriba y marca la cancelada', lst.indexOf('#T3') < lst.indexOf('#T2') && lst.indexOf('#T2') < lst.indexOf('#T1') &&
    /data-stay-i="2"[\s\S]*Cancelada[\s\S]*data-stay-i="1"/.test(lst), lst);
  ok('huésped repetido: 2 estancias (la cancelada no cuenta)', hOk.els.guestCard.innerHTML.indexOf('Huésped repetido: 2 estancias') >= 0);
  var hNone = guestHarness(function () { return Promise.resolve({ stays: [], has_more: false }); });
  await hNone.run();
  ok('/stays responde vacío: entonces sí "No hay reservas con este número."', hNone.els.staysList.innerHTML.indexOf('No hay reservas con este número.') >= 0 && hNone.S.staysError === false);
  ok('teléfono y último mensaje', vg.indexOf('+34 600 000 001') > 0 && vg.indexOf('Último mensaje 20 de julio de 2025') > 0);
  eq('rango entre meses', P.fmtStayRange('2025-06-28', '2025-07-05'), '28 jun – 5 jul 2025');
  eq('rango entre años', P.fmtStayRange('2025-12-28', '2026-01-04'), '28 dic 2025 – 4 ene 2026');
  eq('fecha larga', P.fmtDayLong('2025-07-12'), '12 de julio de 2025');

  console.log('Mensajes automáticos plegados');
  ok('la lista no tiene entradas vacías (una vacía plegaría todo)', P.AUTO_TEMPLATES.length >= 5 && P.AUTO_TEMPLATES.every(function (t) { return P.foldText(t).length > 15; }));
  var ES = 'Buenos días, Ana Prueba,\nReciba un cordial saludo de parte de 3VILLAS, la empresa encargada de la gestión de la propiedad que ha reservado en Menorca.\n Le recordamos...';
  var EN = 'Good morning, Ana,\nGreetings from 3VILLAS, the company managing the property you have booked in Menorca.';
  var IT = 'Buongiorno Ana,\n Cordiali saluti da 3VILLAS, l’azienda che gestisce la proprietà che ha prenotato a Minorca.';
  var DE = 'Guten Morgen Ana,\nherzliche Grüße von 3VILLAS, dem Unternehmen, das die von Ihnen gebuchte Unterkunft in Menorca verwaltet.';
  ok('recordatorio ES saliente = automático', P.isAutoMessage({ direction: 'out', body: ES }));
  ok('sin tildes ni mayúsculas también', P.isAutoMessage({ direction: 'out', body: ES.normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase() }));
  ok('IT con apóstrofo recto también', P.isAutoMessage({ direction: 'out', body: IT.replace('’', "'") }));
  ok('DE (Worker note.js) = automático', P.isAutoMessage({ direction: 'out', body: DE }));
  ok('el mismo texto ENTRANTE no se pliega (lo escribió el huésped)', !P.isAutoMessage({ direction: 'in', body: ES }));
  ok('un mensaje normal del equipo no se pliega', !P.isAutoMessage({ direction: 'out', body: 'Hola Ana, mañana pasa el piscinero a las 10.' }));
  /* Respuesta automática de Reservas (Chat2Desk 15/09/2026, Whaticket 11/10/2026). */
  var C2D = 'Está contactando con el equipo de reservas, Gracias por tu consulta. En breve le responderemos. Nuestro horario de atención es de 8:00 a 23:00 / Este número no recibe llamadas vía Whatsapp...';
  var WT = 'Gracias por tu mensaje. Te responderemos en breve. Nuestro horario de atención es de 8:00 a 23:00. Este número no atiende llamadas de WhatsApp...';
  var WT_EN = 'Thank you for your message. We will reply shortly. Our hours are 8:00 to 23:00. This number does not take WhatsApp calls.';
  ok('saludo de Chat2Desk saliente = automático', P.isAutoMessage({ direction: 'out', body: C2D }));
  ok('saludo de Whaticket saliente = automático', P.isAutoMessage({ direction: 'out', body: WT }));
  ok('saludo de Whaticket en inglés = automático', P.isAutoMessage({ direction: 'out', body: WT_EN }));
  ok('cada marcador solo basta', ['Nuestro horario de atención es de 9', 'Our hours are 8:00 to 23:00', 'Está contactando con el equipo de reservas',
    'Este número no recibe llamadas', 'Este número no atiende llamadas de WhatsApp'].every(function (t) { return P.isAutoMessage({ direction: 'out', body: 'x ' + t + ' y' }); }));
  ok('sin tildes ni mayúsculas', P.isAutoMessage({ direction: 'out', body: 'ESTA CONTACTANDO CON EL EQUIPO DE RESERVAS' }) &&
    P.isAutoMessage({ direction: 'out', body: 'nuestro  horario de atencion es de 8:00' }) && P.isAutoMessage({ direction: 'out', body: 'este numero no recibe llamadas' }));
  ok('el huésped que cita el saludo NO se pliega', !P.isAutoMessage({ direction: 'in', body: C2D }) && !P.isAutoMessage({ direction: 'in', body: WT_EN }));
  ok('un mensaje del equipo que habla de horarios no se pliega', !P.isAutoMessage({ direction: 'out', body: 'Nuestro horario de llegada es a partir de las 16:00.' }));
  var items = [{ type: 'day', day: '2025-07-11' }, { type: 'msg', msg: m(1, 'a', 'out', ES) }, { type: 'msg', msg: m(2, 'a', 'out', EN) },
    { type: 'msg', msg: m(3, 'a', 'in', 'Gracias!') }, { type: 'msg', msg: m(4, 'a', 'out', ES) },
    { type: 'day', day: '2025-07-12' }, { type: 'msg', msg: m(5, 'a', 'out', EN) }];
  var col = P.collapseAuto(items);
  eq('dos seguidos = un grupo de 2; una fecha corta el grupo', col.map(function (x) { return x.type === 'auto' ? 'auto' + x.msgs.length : x.type === 'msg' ? 'm' + x.msg.id : x.type; }),
    ['day', 'auto2', 'm3', 'auto1', 'day', 'auto1']);

  console.log('Resaltado y "N de M"');
  var h = P.highlightHtml('La Piscina está sucia. PISCÍNA rota. piscina!', 'piscina');
  eq('cuenta sin mayúsculas ni tildes', h.count, 3);
  ok('marca el texto original', h.html.indexOf('<mark>Piscina</mark>') >= 0 && h.html.indexOf('<mark>PISCÍNA</mark>') >= 0);
  var x = P.highlightHtml('<img src=x onerror=alert(1)> piscina', 'piscina');
  ok('escapa el HTML del mensaje', x.html.indexOf('<img') < 0 && x.html.indexOf('&lt;img') === 0 && x.count === 1);
  eq('búsqueda vacía = 0', P.highlightHtml('abc', '  ').count, 0);
  eq('busca con tilde en el texto escrito', P.highlightHtml('la piscina', 'piscína').count, 1);
  var hn = SRC.match(/\(S\.hitIdx \+ 1\) \+ ' de ' \+ S\.hits\.length/);
  ok('contador "N de M" en la página', !!hn);

  console.log('Página: solo lectura, ?tel=, textos');
  var VIVO = SRC.replace(/<!--[\s\S]*?-->/g, '');
  ok('aviso fijo de solo lectura', VIVO.indexOf('Archivo histórico de solo lectura. Para responder, usa Whaticket.') >= 0);
  ok('sin caja de respuesta ni envío', !/<textarea/i.test(VIVO) && !/method\s*:\s*['"](POST|PUT|DELETE)/i.test(VIVO) && !/action=(save|create|update)/.test(VIVO));
  ok('sin exportar ni descargar todo', !/export|descargar todo|download all/i.test(VIVO.replace(/a\.download/g, '')));
  ok('acepta ?tel=', /get\('tel'\)/.test(SRC));
  ok('roles de la página: admin y staff', /var HW_ROLES = \['admin', 'staff'\];/.test(SRC));
  ok('login con su propia clave de auth.js', /var HW_SESSION = Auth\.require\('historial-whatsapp'\);/.test(SRC));
  ok('"Este número tiene N huéspedes"', /Este número tiene ' \+ sum\.guests\.length \+ ' huéspedes/.test(SRC));
  ok('"Sin identificar" y la banda "Sin reserva"', VIVO.indexOf('Sin identificar') > 0 && VIVO.indexOf("return 'Sin reserva';") > 0);
  ok('las estancias llegan del Worker /stays, ya no de la vista de Caspio', /hwFetch\('\/stays\?wa_id=' \+ encodeURIComponent\(contact\.wa_id\) \+ '&page=' \+ n\)/.test(VIVO) &&
    VIVO.indexOf('Vi_villas_and_bookings2021') < 0 && VIVO.indexOf('Auth.url(') < 0 && !/var WORKER =/.test(VIVO));
  ok('lee como mucho STAYS_MAX_PAGES páginas de estancias', /var STAYS_MAX_PAGES = 5;/.test(VIVO) && /j\.has_more && n < STAYS_MAX_PAGES/.test(VIVO));
  ok('villas: /villas con filtro y página, /villa con el nombre exacto y página', /hwFetch\('\/villas\?q=' \+ encodeURIComponent\(V\.q\) \+ '&page=' \+ page\)/.test(VIVO) &&
    /hwFetch\('\/villa\?title=' \+ encodeURIComponent\(title\) \+ '&page=' \+ page\)/.test(VIVO));
  ok('tarjeta "Buscar por villa" con caja de filtro, "Ver más villas" y "Ver más huéspedes"', VIVO.indexOf('<h2>Buscar por villa</h2>') > 0 &&
    VIVO.indexOf('id="villaQ"') > 0 && VIVO.indexOf('Ver más villas') > 0 && VIVO.indexOf('Ver más huéspedes') > 0 && VIVO.indexOf('← Todas las villas') > 0);
  ok('arranque: urlEntry decide entre teléfono y villa', /var entry = urlEntry\(location\.search\);/.test(VIVO) &&
    /entry\.kind === 'phone'\) \{ g\('q'\)\.value = entry\.value; doSearch\(\); \}/.test(VIVO) && /entry\.kind === 'villa'\) \{[^}]*openVilla\(entry\.value, 1\); \}/.test(VIVO));
  ok('la lista de estancias de la ficha va de la más reciente a la más antigua', /S\.stays\.map\(function \(s, i\) \{ return i; \}\)\.reverse\(\)/.test(VIVO));
  ok('"Ir a fecha" y "Buscar en esta conversación"', SRC.indexOf('Ir a fecha') > 0 && SRC.indexOf('Buscar en esta conversación') > 0);
  ok('texto base 17 px', /body\{[^}]*font-size:17px/.test(SRC));
  ok('botones de al menos 24 px de alto', /\.btn\{min-height:44px/.test(SRC) && /\.auto-btn\{min-height:40px/.test(SRC) && /\.media-btn\{[^}]*min-height:44px/.test(SRC));
  ok('las bandas de estancia son fijas al desplazar', /\.stay-band\{position:sticky/.test(SRC));
  ok('los archivos se piden con la sesión, no en <img src> directo', /mediaUrl\(/.test(SRC) && !/src="'\s*\+\s*HW_API/.test(SRC));
  ok('los scripts inline compilan', (function () {
    var re = /<script>([\s\S]*?)<\/script>/g, mm, n = 0;
    while ((mm = re.exec(SRC))) { try { new Function(mm[1]); n++; } catch (e) { return e.message; } }
    return n > 0;
  })() === true);
  ok('versión v2 en cabecera, PAGE_VERSION, título e historial', /VERSIÓN ACTUAL: v2 /.test(SRC) && /PAGE_VERSION = 2;/.test(SRC) && /<title>Historial WhatsApp v2/.test(SRC) &&
    /<!-- HISTORIAL: v2 - 13\/10\/2026: /.test(SRC) && / \| v1 - 12\/10\/2026: página nueva/.test(SRC));

  console.log('Sin JavaScript con datos en los onclick');
  var scripts = (SRC.match(/<script>([\s\S]*?)<\/script>/g) || []).join('\n');
  ok('el HTML que pinta el script no lleva onclick (datos en data-*, un solo escuchador)', scripts.indexOf('onclick') < 0 && /document\.addEventListener\('click', onPageClick\)/.test(SRC));
  ok('los onclick que quedan son fijos y sin datos', (VIVO.match(/onclick="[^"]*"/g) || []).every(function (h) {
    return ['onclick="NavComponent.open()"', 'onclick="stepHit(-1)"', 'onclick="stepHit(1)"', 'onclick="clearInSearch()"',
      'onclick="if(event.target===this)closeLightbox()"', 'onclick="closeLightbox()"'].indexOf(h) >= 0;
  }));
  var evil = "x');alert(1);//\"<b>";
  var rh = P.resultHtml({ wa_id: evil, display_name: 'Hugo <i>SinTeléfono</i>', phone_e164: null, last_message_at: '2023-03-02T09:00:00Z', match: 'nombre' });
  ok('el wa_id va escapado en data-wa, sin onclick', rh.indexOf('onclick') < 0 && rh.indexOf('data-act="guest" data-wa="x&#39;);alert(1);//&quot;&lt;b&gt;"') > 0 && rh.indexOf('<i>') < 0, rh);
  var calls = [];
  var click = new Function('openGuest', 'jumpToStay', 'toggleAuto', 'loadOlderAndRender', 'openLightbox', 'playMedia', 'openDoc',
    'openVilla', 'loadVillas', 'villasBack', 'V',
    fnSource(SRC, 'onPageClick') + '\nreturn onPageClick;')(
    function (w) { calls.push(['guest', w]); }, function (i) { calls.push(['stay', i]); }, function (k) { calls.push(['auto', k]); },
    function () { calls.push(['older']); }, function (el) { calls.push(['lightbox', el.id]); }, function (el) { calls.push(['play', el.id]); },
    function (el) { calls.push(['doc', el.id]); },
    function (t, p) { calls.push(['villa', t, p]); }, function (p) { calls.push(['villas', p]); }, function () { calls.push(['back']); },
    { title: 'Villa Inventada Uno', gPage: 1, vPage: 2 });
  function fakeEl(attrs, id) { return { id: id, getAttribute: function (n) { return attrs[n] == null ? null : attrs[n]; } }; }
  function ev(el) { return { target: { closest: function () { return el; } } }; }
  click(ev(fakeEl({ 'data-act': 'guest', 'data-wa': 'c2d-client:9600000001' })));
  click(ev(fakeEl({ 'data-act': 'guest', 'data-wa': evil })));
  click(ev(fakeEl({ 'data-act': 'stay', 'data-stay-i': '2' })));
  click(ev(fakeEl({ 'data-act': 'auto', 'data-auto': '17' })));
  click(ev(fakeEl({ 'data-act': 'older' })));
  click(ev(fakeEl({ 'data-act': 'play' }, 'b1')));
  click(ev(fakeEl({ 'data-act': 'villa', 'data-villa': evilV })));
  click(ev(fakeEl({ 'data-act': 'villa-more' })));
  click(ev(fakeEl({ 'data-act': 'villas-more' })));
  click(ev(fakeEl({ 'data-act': 'villas-back' })));
  click(ev(null));
  click({ target: {} });
  eq('un clic llama a la función con el dato tal cual (c2d-client, texto raro y villas incluidos)', calls,
    [['guest', 'c2d-client:9600000001'], ['guest', evil], ['stay', 2], ['auto', '17'], ['older'], ['play', 'b1'],
      ['villa', evilV, 1], ['villa', 'Villa Inventada Uno', 2], ['villas', 3], ['back']]);

  console.log('auth.js y nav.js');
  var AUTH = fs.readFileSync(path.join(__dirname, 'auth.js'), 'utf8');
  var keyLines = AUTH.split('\n').filter(function (l) { return /'historial-whatsapp'\s*:/.test(l); });
  ok('auth.js: una clave historial-whatsapp para admin y staff (como HISTORY_ROLES del Worker)',
    keyLines.length === 1 && /'historial-whatsapp'\s*:\s*\['admin', 'staff'\]/.test(keyLines[0]));
  ok('la clave va con las de NOTAS', AUTH.indexOf("'historial-whatsapp'") > AUTH.indexOf("'notas-villamanager'") && AUTH.indexOf("'historial-whatsapp'") < AUTH.indexOf('// ── WELCOMEPACKS'));
  var NAV = fs.readFileSync(path.join(__dirname, 'nav.js'), 'utf8');
  var ctxNav = { console: { log: function () {}, warn: function () {}, error: function () {} }, window: {},
    localStorage: { setItem: function () {} }, location: { pathname: '/intranet/x.html', protocol: 'file:' }, fetch: function () {} };
  require('vm').runInNewContext(NAV + '\nvar __all = NAV_MENUS;', ctxNav);
  function flat(menu) { var out = []; menu.forEach(function (it) { if (it.children) it.children.forEach(function (c) { out.push(c); }); else out.push(it); }); return out; }
  function hasHW(role) { return flat(ctxNav.__all[role]).filter(function (x) { return x.url === 'historial-whatsapp.html' && x.label === 'Historial WhatsApp'; }).length; }
  function rightAfterEntradas(role) { var L = flat(ctxNav.__all[role]), i = L.findIndex(function (x) { return x.url === 'entradas.html'; }); return L[i + 1] && L[i + 1].url === 'historial-whatsapp.html'; }
  ok('admin y staff ven "Historial WhatsApp" una vez, justo debajo de Entradas y Salidas', ['admin', 'staff'].every(function (r) { return hasHW(r) === 1 && rightAfterEntradas(r); }));
  ok('sales y cleaner no la ven', ['sales', 'cleaner'].every(function (r) { return hasHW(r) === 0; }));
  /* 13/10/2026: nav.js v20 anade 'Cuadro de mando comercial'; la entrada de la v19 (esta página) sigue en el historial. */
  ok('nav.js v22: cabecera, NAV_VERSION e historial', /3Villas  v22/.test(NAV) && /VERSIÓN ACTUAL: v22 \|/.test(NAV) && NAV.indexOf('var NAV_VERSION = 22;') > 0 && NAV.indexOf('var NAV_VERSION = 21;') < 0 && /\/\/ HISTORIAL: v21 - /.test(NAV) && / \| v20 - /.test(NAV) && / \| v19 - Nueva entrada 'Historial WhatsApp'/.test(NAV) && / \| v18 - /.test(NAV) && / \| v17 - /.test(NAV));

  console.log('notas-equipo-reservas: un solo enlace nuevo');
  var links = NOTAS.match(/<a href="historial-whatsapp\.html"[^>]*>[^<]*<\/a>/g) || [];
  eq('un enlace "Historial WhatsApp"', links.length, 1);
  ok('abre en pestaña nueva con ?tel=', /target="_blank"/.test(links[0] || '') && /historial-whatsapp\.html\?tel='\+encodeURIComponent\(document\.getElementById\('fPhone1'\)\.value/.test(links[0] || ''));
  ok('junto al teléfono de Hostaway', /id="fPhone1" disabled><a href="historial-whatsapp\.html"/.test(NOTAS));
  ok('notas v88 (o posterior) con el enlace v86 en el historial', /VERSIÓN ACTUAL: v88 \|/.test(NOTAS) && NOTAS.indexOf('var PAGE_VERSION = 88;') > 0 && NOTAS.indexOf('<title>Notas Equipo Reservas v88') > 0 && / \| v86 - 12\/10\/2026: enlace "Historial WhatsApp"/.test(NOTAS));

  console.log('De punta a punta: el Worker real + las funciones de la página (base en memoria, datos inventados)');
  if (!W) {
    console.log('  (Worker no encontrado: prueba de punta a punta omitida)');
  } else {
    var DatabaseSync = require('node:sqlite').DatabaseSync;
    var migDir = path.join(path.dirname(workerSrc), '..', 'migrations');
    var db = new DatabaseSync(':memory:');
    ['0001_init.sql', '0002_name_fold.sql', '0003_stays.sql'].forEach(function (f) { db.exec(fs.readFileSync(path.join(migDir, f), 'utf8')); });
    var ins = function (sql, rows) { var st = db.prepare(sql); rows.forEach(function (r) { st.run.apply(st, r); }); };
    ins('INSERT INTO contacts (id, wa_id, phone_e164, display_name, first_seen_at, last_seen_at) VALUES (?, ?, ?, ?, ?, ?)', [
      [1, '34600000051', '+34600000051', 'Lucía Inventada', '2024-07-01T09:00:00Z', '2025-08-14T09:00:00Z'],
      [2, '34600000052', '+34600000052', 'Marco Ejemplo', '2023-05-20T09:00:00Z', '2023-05-20T09:00:00Z']]);
    ins('INSERT INTO contact_name_fold (contact_id, name_fold) VALUES (?, ?)', [[1, W.foldName('Lucía Inventada')], [2, W.foldName('Marco Ejemplo')]]);
    ins('INSERT INTO conversations (id, contact_id, wa_jid, is_group, message_count, first_message_at, last_message_at) VALUES (?, ?, ?, 0, ?, ?, ?)', [
      [10, 1, '34600000051@s.whatsapp.net', 5, '2024-07-01T09:00:00Z', '2025-08-14T09:00:00Z'],
      [11, 2, '34600000052@s.whatsapp.net', 1, '2023-05-20T09:00:00Z', '2023-05-20T09:00:00Z']]);
    ins("INSERT INTO messages (id, conversation_id, source, provider_message_id, direction, kind, body, occurred_at) VALUES (?, ?, 'phone', ?, ?, 'text', ?, ?)", [
      [1, 10, 'bridge:1', 'in', '¿A qué hora es la llegada?', '2024-07-01T09:00:00Z'],
      [2, 10, 'bridge:2', 'out', 'La llave está en la caja', '2024-07-12T09:00:00Z'],
      [3, 10, 'bridge:3', 'in', 'Feliz año', '2025-01-15T09:00:00Z'],
      [4, 10, 'bridge:4', 'in', '¿Hay toallas de playa?', '2025-08-03T09:00:00Z'],
      [5, 10, 'bridge:5', 'in', 'Gracias por todo', '2025-08-14T09:00:00Z'],
      [6, 11, 'bridge:6', 'in', 'Hola', '2023-05-20T09:00:00Z']]);
    ins('INSERT INTO stays (contact_id, wa_id, booking_code, villa_title, villa_fs_id, checkin, checkout, guest_name, booking_status, match_kind) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', [
      [1, '34600000051', 'V0000051', 'Villa Inventada Mar', 951, '2024-07-10', '2024-07-17', 'Lucía Inventada', 'confirmed', 'exact'],
      [1, '34600000051', 'V0000052', 'Villa Inventada Sol', 952, '2025-08-01', '2025-08-08', 'Lucía Inventada', 'confirmed', 'last9'],
      [1, '34600000051', 'V0000053', 'Villa Inventada Mar', 951, '2026-02-01', '2026-02-05', 'Lucía Inventada', 'cancelled', 'exact'],
      [2, '34600000052', 'V0000054', 'Villa Inventada Mar', 951, '2023-06-01', '2023-06-07', 'Marco Ejemplo', 'confirmed', 'exact']]);
    var stmt = function (sql, args) {
      return { bind: function () { return stmt(sql, [].slice.call(arguments)); },
        run: async function () { return db.prepare(sql).run.apply(db.prepare(sql), args || []); },
        first: async function () { var s = db.prepare(sql); return s.get.apply(s, args || []) || null; },
        all: async function () { var s = db.prepare(sql); return { results: s.all.apply(s, args || []) }; } };
    };
    var CHECK = 'https://proxy.test/?action=check&token=';
    var ENV = { HISTORY_ENABLED: '1', ALLOWED_ORIGIN: 'https://www.3villas.com', HISTORY_ROLES: 'admin,staff', SESSION_CHECK_URL: CHECK,
      RATE_PER_MIN: '1000', RATE_PER_IP_PER_MIN: '1000', DB: { prepare: function (sql) { return stmt(sql); } }, MEDIA: { get: async function () { return null; } } };
    var realFetch = globalThis.fetch, realLog = console.log, realErr = console.error;
    async function api(p) {
      globalThis.fetch = async function (u) {
        if (String(u).indexOf(CHECK) !== 0) throw new Error('fetch inesperado');
        return new Response(JSON.stringify({ valid: true, role: 'staff', email: 'reservas.prueba@example.com' }), { status: 200 });
      };
      console.log = function () {}; console.error = function () {};
      try {
        var r = await W.default.fetch(new Request('https://hist.test' + p, { headers: { Origin: 'https://www.3villas.com', Authorization: 'Bearer tok-e2e' } }), ENV);
        return { status: r.status, body: await r.json() };
      } finally { globalThis.fetch = realFetch; console.log = realLog; console.error = realErr; }
    }

    var eP = P.urlEntry('?phone=%2B34600000051');
    var byPhone = await api('/search?q=' + encodeURIComponent(eP.value));
    var byName = await api('/search?q=' + encodeURIComponent('lucia'));
    eq('?phone= busca el teléfono y encuentra a la huésped (mismo número)', [byPhone.status, byPhone.body.results[0].wa_id, byPhone.body.results[0].match], [200, '34600000051', 'exacta']);
    eq('por nombre sin tilde también', byName.body.results.map(function (r) { return r.wa_id; }), ['34600000051']);
    eq('el resultado dice sus estancias', P.stayHint(byPhone.body.results[0]), '2 estancias · última en Villa Inventada Sol (ago 2025)');
    var st = await api('/stays?wa_id=34600000051');
    var cv = await api('/conversation?wa_id=34600000051');
    var pageStays = st.body.stays.map(P.stayFromRow).sort(function (a, b) { return a.checkin < b.checkin ? -1 : a.checkin > b.checkin ? 1 : 0; });
    eq('ficha: sus 3 reservas (una cancelada), confirmada y repetida 2 veces', [pageStays.map(function (s) { return s.code; }), P.guestSummary(pageStays).badge, P.guestSummary(pageStays).stayCount],
      [['V0000051', 'V0000052', 'V0000053'], 'confirmado', 2]);
    eq('conversación agrupada por estancia, con "Sin reserva" entre las dos', P.groupByStay(cv.body.messages, pageStays).map(function (gr) {
      return [P.fmtStayLabel(pageStays[gr.stayIndex] || null), gr.messages.map(function (x) { return x.id; })];
    }), [['Estancia 10–17 jul 2024 · Villa Inventada Mar · Reserva #V0000051', [1, 2]], ['Sin reserva', [3]],
      ['Estancia 1–8 ago 2025 · Villa Inventada Sol · Reserva #V0000052', [4, 5]]]);
    var vl = await api('/villas');
    eq('lista de villas con sus huéspedes con chat', vl.body.villas.map(function (v) { return [v.title, v.chat_count]; }), [['Villa Inventada Mar', 2], ['Villa Inventada Sol', 1]]);
    ok('cada villa de la lista abre por data-villa', vl.body.villas.map(P.villaRowHtml).join('').indexOf('data-villa="Villa Inventada Mar"') > 0);
    var eV = P.urlEntry('?villa=' + encodeURIComponent('Villa Inventada Mar'));
    var vg2 = await api('/villa?title=' + encodeURIComponent(eV.value));
    eq('?villa= abre la villa: sus huéspedes, la estancia más reciente primero', vg2.body.guests.map(function (x) { return x.wa_id; }), ['34600000051', '34600000052']);
    var vhtml = vg2.body.guests.map(P.villaGuestHtml).join('');
    ok('cada huésped de la villa abre su ficha, con sus fechas en esa villa (sin la cancelada)', vhtml.indexOf('data-wa="34600000051"') > 0 && vhtml.indexOf('data-wa="34600000052"') > 0 &&
      vhtml.indexOf('Estancias aquí: 10–17 jul 2024<') > 0 && vhtml.indexOf('feb 2026') < 0 && vhtml.indexOf('Villa Inventada Sol') < 0, vhtml);
    var audit = db.prepare('SELECT endpoint, wa_id, detail FROM access_log ORDER BY id').all().map(function (r) { return r.endpoint + ' ' + r.wa_id + ' ' + r.detail; });
    eq('cada llamada de datos dejó su fila de acceso, búsquedas incluidas', audit, ['/search  search:phone', '/search  search:name', '/stays 34600000051 null',
      '/conversation 34600000051 null', '/villas  page:1', '/villa  villa:Villa Inventada Mar|page:1']);
  }

  console.log('\n' + pass + ' pass, ' + fail + ' fail');
  process.exit(fail ? 1 : 0);
})().catch(function (e) { console.log('ERROR ' + e.stack); process.exit(1); });
