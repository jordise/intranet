/* Pruebas de las reservas canceladas en la busqueda por codigo o inquilino (v154,
   pedido de Toni Segui, WhatsApp grupo 07/10/2026 16:41 y 16:44).
   node entradas-canceladas-busqueda.test.js

   Como equipo-paso4.test.js: NO copia el codigo de la pagina. Extrae el texto real
   de cada funcion de entradas-equipo.html y lo ejecuta con un DOM minimo. Nunca se
   llama al proxy: no hay red. */
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

var FMAP = bloque('const F = {', '{', '}') + ';';

/* Entorno de buildWhere: los cinco campos de texto y fecha, los tres filtros de
   seleccion vacios y el modo de vista. */
function makeWhere(vals, calMode) {
  var els = {};
  ['fCodigo', 'fVilla', 'fInquilino', 'fDesde', 'fHasta'].forEach(function (id) {
    els[id] = { value: (vals && vals[id]) || '' };
  });
  var body = [
    FMAP,
    'var $=function(id){return els[id]||null;};',
    'var _calMode=' + (calMode ? 'true' : 'false') + ';',
    'var selectedManagers=new Set(),selectedSources=new Set(),selectedCleaners=new Set();',
    fnSource('buildWhere'),
    'return buildWhere();'
  ].join('\n');
  return new Function('els', body)(els);
}
var FECHAS = { fDesde: '2026-10-01', fHasta: '2026-10-07' };
function conFechas(extra) { return Object.assign({}, FECHAS, extra || {}); }
var CANC = "TaBookings2021_BookingStatus<>'cancelled'";
var FECHA = 'TaBookings2021_Checkin>=';

console.log('\n== 1. buildWhere: cuando salen las canceladas ==');

var w0 = makeWhere(conFechas());
ok('sin texto: la condicion <>\'cancelled\' sigue', w0.indexOf(CANC) >= 0, w0);
ok('  ...y las fechas siguen', w0.indexOf(FECHA) >= 0, w0);
var wC = makeWhere(conFechas({ fCodigo: '65513925' }));
ok('con un codigo: no hay condicion de cancelada', wC.indexOf('cancelled') < 0, wC);
ok('  ...ni condicion de fechas', wC.indexOf(FECHA) < 0 && wC.indexOf('TaBookings2021_Checkout>=') < 0 && wC.indexOf('<=') < 0, wC);
ok('  ...y busca el codigo', wC.indexOf("TaBookings2021_FS_confirmation_code LIKE '%65513925%'") >= 0, wC);
ok('  ...y no empieza ni acaba en AND', !/^ AND|AND $/.test(wC) && wC.indexOf(' AND  AND ') < 0, wC);
var wI = makeWhere(conFechas({ fInquilino: 'Garcia' }));
ok('con un inquilino: no hay condicion de cancelada', wI.indexOf('cancelled') < 0, wI);
ok('  ...pero las fechas siguen', wI.indexOf(FECHA) >= 0, wI);
ok('  ...y busca el inquilino', wI.indexOf("TaBookings2021_Guest_Full_Name LIKE '%Garcia%'") >= 0, wI);
var wV = makeWhere(conFechas({ fVilla: 'Alba' }));
ok('solo la villa: la condicion de cancelada sigue', wV.indexOf(CANC) >= 0, wV);
ok('  ...y las fechas siguen', wV.indexOf(FECHA) >= 0, wV);
var wE = makeWhere(conFechas({ fCodigo: '   ', fInquilino: '  ' }));
ok('solo espacios no cuenta como texto: la condicion sigue', wE.indexOf(CANC) >= 0 && wE.indexOf(FECHA) >= 0, wE);
var wVI = makeWhere(conFechas({ fVilla: 'Alba', fInquilino: 'Garcia' }));
ok('villa e inquilino: canceladas abiertas por el inquilino', wVI.indexOf('cancelled') < 0 && wVI.indexOf(FECHA) >= 0, wVI);
var wCal = makeWhere(conFechas({ fInquilino: 'Garcia' }), true);
ok('vista semanal con inquilino: sin fechas como antes (v153) y sin cancelada', wCal.indexOf(FECHA) < 0 && wCal.indexOf('cancelled') < 0, wCal);
var w3 = makeWhere(conFechas({ fCodigo: '655' }));
ok('codigo de 3 letras: la condicion de cancelada sigue y las fechas siguen (repaso 2)', w3.indexOf(CANC) >= 0 && w3.indexOf(FECHA) >= 0, w3);
var w4 = makeWhere(conFechas({ fCodigo: '6551' }));
ok('codigo de 4 letras: canceladas abiertas y sin fechas', w4.indexOf('cancelled') < 0 && w4.indexOf(FECHA) < 0, w4);
var wI2 = makeWhere(conFechas({ fInquilino: 'Ga' }));
ok('inquilino de 2 letras: la condicion de cancelada sigue', wI2.indexOf(CANC) >= 0, wI2);
var wCal0 = makeWhere(conFechas(), true);
ok('vista semanal sin texto: igual que antes', wCal0.indexOf(CANC) >= 0 && wCal0.indexOf(FECHA) >= 0, wCal0);
ok('buildWhere no guarda nada', !/localStorage|saveToURL|history\.|fetch\(|action=update/.test(fnSource('buildWhere')));

console.log('\n== 2. esCancelada, checkinPendiente y pagosPendientes ==');

function makeEnv() {
  var body = [
    FMAP,
    fnSource('g'), fnSource('isOk'), fnSource('_lvNum'), fnSource('_lvBool1'),
    fnSource('esCancelada'), fnSource('esPropietario'), fnSource('arrivalOk'),
    fnSource('ecotasaOk'), fnSource('fianzaFalta'), fnSource('fianzaOk'), fnSource('checkinPendiente'),
    bloque('var ECO_PAY_MAP=[', '[', ']') + ';',
    fnSource('pagosPendientes'),
    'return {esCancelada:esCancelada,checkinPendiente:checkinPendiente,pagosPendientes:pagosPendientes};'
  ].join('\n');
  return new Function(body)();
}
var E = makeEnv();
function res(extra) {
  var r = {
    TaBookings2021_FS_confirmation_code: 'TEST0001',
    TaBookings2021_BookingStatus: 'new',
    TaBookings2021_Arrivalform_done: '0',
    TaBookings2021_Ecotasa_final: '30',
    TaBookings2021_Ecotasa_cobrada: '0'
  };
  for (var k in (extra || {})) r[k] = extra[k];
  return r;
}
var canc = res({ TaBookings2021_FS_confirmation_code: 'CANC0001', TaBookings2021_BookingStatus: 'cancelled' });
ok('esCancelada: cancelled', E.esCancelada(canc) === true);
ok('esCancelada: Cancelled en mayusculas y con espacios', E.esCancelada(res({ TaBookings2021_BookingStatus: ' Cancelled ' })) === true);
ok('esCancelada: cualquier valor con cancel (cancelledByGuest)', E.esCancelada(res({ TaBookings2021_BookingStatus: 'cancelledByGuest' })) === true);
ok('esCancelada: new, modified, confirmed, ownerStay y vacio no', ['new', 'modified', 'confirmed', 'ownerStay', ''].every(function (s) { return E.esCancelada(res({ TaBookings2021_BookingStatus: s })) === false; }));
ok('esCancelada: sin registro no', E.esCancelada(null) === false);
ok('esCancelada usa el mismo campo de estado que el resto (F.status)', /status:'TaBookings2021_BookingStatus'/.test(FMAP) && fnSource('esCancelada').indexOf("g(r,'status')") > 0);

ok('checkinPendiente: una normal con todo a 0 sigue pendiente', E.checkinPendiente(res()) === true);
ok('checkinPendiente: una cancelada con todo a 0 NO es pendiente', E.checkinPendiente(canc) === false);
ok('checkinPendiente: Cancelled en mayusculas tampoco', E.checkinPendiente(res({ TaBookings2021_BookingStatus: 'Cancelled' })) === false);
/* la regla escrita dentro de checkinPendiente y pagosPendientes dice lo mismo que esCancelada */
['cancelled', 'Cancelled', ' CANCELLED ', 'cancelledByHost', 'new', 'modified', 'confirmed', ''].forEach(function (s) {
  var r = res({ TaBookings2021_BookingStatus: s, TaBookings2021_Arrivalform_done: '0' });
  ok('checkinPendiente y pagosPendientes dicen lo mismo que esCancelada para "' + s + '"',
    E.checkinPendiente(r) === !E.esCancelada(r) && (E.pagosPendientes([r]).length === 0) === E.esCancelada(r));
});

var normal = res({ TaBookings2021_FS_confirmation_code: 'NORM0001' });
var cancUps = res({ TaBookings2021_FS_confirmation_code: 'CANC0002', TaBookings2021_BookingStatus: 'Cancelled', TaBookings2021_Ecotasa_final: '0', TaBookings2021_Upselling1_EUR: '20', TaBookings2021_Upselling1_cobrado: '0' });
var pend = E.pagosPendientes([normal, canc, cancUps]);
ok('pagosPendientes: la normal con ecotasa sin cobrar entra', pend.indexOf(normal) >= 0);
ok('pagosPendientes: la cancelada con ecotasa sin cobrar NO entra', pend.indexOf(canc) === -1);
ok('pagosPendientes: la cancelada con un extra sin cobrar NO entra', pend.indexOf(cancUps) === -1);
ok('pagosPendientes: solo una candidata', pend.length === 1, pend.length);
ok('pagosPendientes: solo canceladas, ninguna candidata', E.pagosPendientes([canc, cancUps]).length === 0);
ok('la llamada renderCards y syncPagosStripe de doSearch no cambia',
  /renderCards\(records,_allVillaIds,_muVillaMap\);\s*\n\s*syncPagosStripe\(records,_allVillaIds,_muVillaMap,mySearchId\)/.test(SRC));
ok('syncPagosStripe sigue pidiendo los candidatos a pagosPendientes', fnSource('syncPagosStripe').indexOf('var pend=pagosPendientes(records);') > 0);

console.log('\n== 3. La ficha (buildCard) de una cancelada ==');

/* buildCard real con un documento minimo: devuelve el HTML de la ficha. */
function makeCard() {
  var body = [
    FMAP,
    'var document={createElement:function(){return {className:"",attrs:{},setAttribute:function(k,v){this.attrs[k]=v;},innerHTML:""};}};',
    'var allUsersMap=new Map(),managersMap=new Map(),multiunitsMap=new Map();',
    'var SVG_WA="<svg height=\\"40\\" width=\\"40\\"></svg>";',
    'var PROPIETARIO_BADGE="Check-in online: no aplica (propietario)";',
    'function getCleanerName(){return "";}', 'function getManagerName(){return "VM";}',
    'function starBadgeHTML(){return "";}', 'function canNotas(){return true;}',
    'function buildWACheckoutMsg(){return "hola";}',
    fnSource('g'), fnSource('isOk'), fnSource('_lvNum'), fnSource('_lvBool1'), fnSource('nightsN'), fnSource('fmtDate'),
    fnSource('stClass'), fnSource('cleanPhone'), fnSource('useArrival'), fnSource('getMuNames'),
    fnSource('esCancelada'), fnSource('esPropietario'), fnSource('arrivalOk'), fnSource('ecotasaOk'),
    fnSource('fianzaFalta'), fnSource('fianzaOk'), fnSource('fianzaLabel'),
    fnSource('calcPaymentItems'), fnSource('paymentsLineHTML'),
    fnSource('nerUrl'), fnSource('mkBadge'), fnSource('buildCard'),
    'return function(r,t){var el=buildCard(r,t);return {html:el.innerHTML,cls:el.className};};'
  ].join('\n');
  return new Function(body)();
}
var buildCard = makeCard();
function ficha(extra) {
  return res(Object.assign({
    TaVillas_villaid: '7', TaVillas_Name_villa_para_inquilinos: 'Villa Prueba',
    TaBookings2021_Checkin: '2026-10-08T00:00:00', TaBookings2021_Checkout: '2026-10-15T00:00:00',
    TaBookings2021_Guest_phonenumber: '+34 600 000 000', TaBookings2021_Guest_email: 'prueba@example.com',
    TaBookings2021_LimpiezaTerminada: '1', TaBookings2021_Welcomepackentregado: '0', TaBookings2021_Checkoutcontrolado: '0'
  }, extra || {}));
}
var fN = buildCard(ficha(), 'entrada');
var fC = buildCard(ficha({ TaBookings2021_FS_confirmation_code: 'CANC0001', TaBookings2021_BookingStatus: 'cancelled' }), 'entrada');
var sC = buildCard(ficha({ TaBookings2021_FS_confirmation_code: 'CANC0001', TaBookings2021_BookingStatus: 'cancelled' }), 'salida');
var sN = buildCard(ficha(), 'salida');
function cabecera(h) { return h.slice(0, h.indexOf('<div class="c-status">')); }
ok('normal: sin etiqueta CANCELADA', fN.html.indexOf('CANCELADA') < 0 && fN.cls === 'card');
ok('cancelada: CANCELADA en la cabecera (antes del detalle plegado)', cabecera(fC.html).indexOf('<span class="lbl-cancel">CANCELADA</span>') > 0, cabecera(fC.html).slice(0, 300));
ok('  ...y la ficha lleva la clase card-cancel', fC.cls === 'card card-cancel', fC.cls);
ok('  ...tambien en la ficha de salida', cabecera(sC.html).indexOf('CANCELADA') > 0);
ok('normal: Limpieza y WelcomePack abren la tarea', fN.html.indexOf('task-limpieza.html') > 0 && fN.html.indexOf('task-wp.html') > 0);
ok('cancelada: Limpieza y WelcomePack sin enlace ni onclick', fC.html.indexOf('task-limpieza.html') < 0 && fC.html.indexOf('task-wp.html') < 0 && fC.html.indexOf('openTaskPopup') < 0);
ok('  ...y en gris (b-na)', fC.html.indexOf('<span class="bdg b-na">· Limpieza</span>') > 0 && fC.html.indexOf('<span class="bdg b-na">· WelcomePack</span>') > 0);
ok('cancelada de salida: Cierre gris y sin enlace', sC.html.indexOf('task-cierre.html') < 0 && sC.html.indexOf('<span class="bdg b-na">· Cierre</span>') > 0);
ok('normal de salida: Cierre abre la tarea', sN.html.indexOf('task-cierre.html') > 0);
ok('normal: primer contacto WhatsApp (Ver detalles) presente', fN.html.indexOf('openPrimerContacto(') > 0);
ok('cancelada: sin primer contacto WhatsApp ni WA simple', fC.html.indexOf('openPrimerContacto(') < 0 && fC.html.indexOf('wa.me') < 0);
ok('normal de salida: botones de resena presentes', sN.html.indexOf('Con reseña') > 0);
ok('cancelada de salida: sin botones de resena', sC.html.indexOf('Con reseña') < 0 && sC.html.indexOf('Sin reseña') < 0 && sC.html.indexOf('wa.me') < 0);
ok('normal: Nueva tarea e Intervencion presentes', fN.html.indexOf('Nueva tarea') > 0 && fN.html.indexOf('Intervención') > 0);
ok('cancelada: sin Nueva tarea ni Intervencion', fC.html.indexOf('Nueva tarea') < 0 && fC.html.indexOf('Intervención') < 0 && fC.html.indexOf('nueva-tarea.html') < 0);
ok('cancelada: el enlace a notas-equipo-reservas se queda', fC.html.indexOf('notas-equipo-reservas.html?TaBookings2021_FS_confirmation_code=CANC0001') > 0);
ok('cancelada: el enlace a notas-villamanager se queda', fC.html.indexOf('notas-villamanager.html?TaBookings2021_FS_confirmation_code=CANC0001') > 0);
ok('cancelada: las insignias de notas (nerUrl) se quedan', fC.html.indexOf('&ci=arrival') > 0 && fC.html.indexOf('&ci=ecotasa') > 0);
ok('cancelada: el estado sigue en rojo en el detalle (st-cancel)', fC.html.indexOf('spill st-cancel') > 0);

console.log('\n== 4. Listado (doRenderList) ==');

function makeList() {
  var body = [
    FMAP,
    'var lv={innerHTML:""};var $=function(id){return id==="listView"?lv:null;};',
    'var multiunitsMap=new Map();var PROPIETARIO_BADGE="Check-in online: no aplica (propietario)";',
    'function starBadgeHTML(){return "";}', 'function canNotas(){return true;}',
    fnSource('g'), fnSource('isOk'), fnSource('_lvNum'), fnSource('_lvBool1'), fnSource('nightsN'), fnSource('fmtDate'),
    fnSource('useArrival'), fnSource('getMuNames'), fnSource('esCancelada'), fnSource('esPropietario'),
    fnSource('arrivalOk'), fnSource('ecotasaOk'), fnSource('fianzaFalta'), fnSource('fianzaOk'), fnSource('fianzaLabel'),
    fnSource('calcPaymentItems'), fnSource('paymentsLineHTML'), fnSource('_lvBdg'), fnSource('_lvBdgEco'), fnSource('_lvBdgFianza'),
    fnSource('nerUrl'), fnSource('doRenderList'),
    'return function(rows){doRenderList(rows);return lv.innerHTML;};'
  ].join('\n');
  return new Function(body)();
}
var lista = makeList();
var lN = lista([{ r: ficha({ TaBookings2021_Guest_Full_Name: 'Ana Normal' }), type: 'entrada' }]);
var lC = lista([{ r: ficha({ TaBookings2021_FS_confirmation_code: 'CANC0001', TaBookings2021_BookingStatus: 'cancelled', TaBookings2021_Guest_Full_Name: 'Ana Cancelada' }), type: 'entrada' }]);
ok('listado normal: sin CANCELADA y con Tarea e Intervencion', lN.indexOf('CANCELADA') < 0 && lN.indexOf('＋ Tarea') > 0 && lN.indexOf('Intervención') > 0);
ok('listado cancelada: CANCELADA junto al inquilino', /Ana Cancelada<\/span><span class="lbl-cancel">CANCELADA<\/span>/.test(lC), lC.slice(0, 600));
ok('  ...la fila lleva la clase lv-cancel', lC.indexOf('<div class="lv-row lv-cancel"') === 0);
ok('  ...sin Tarea ni Intervencion', lC.indexOf('＋ Tarea') < 0 && lC.indexOf('Intervención') < 0);
ok('  ...el boton Equipo (notas) se queda', lC.indexOf('notas-equipo-reservas.html?TaBookings2021_FS_confirmation_code=CANC0001">✏️ Equipo') > 0);

console.log('\n== 5. Vista semanal y contadores (texto de la pagina) ==');

var WEEK = fnSource('renderWeekly');
ok('semanal: etiqueta CANCELADA en la tarjeta', WEEK.indexOf('<span class="lbl-cancel">CANCELADA</span>') > 0 && WEEK.indexOf('var _cancW=esCancelada(r);') > 0);
ok('semanal: la tarjeta lleva la clase wk-cancel', WEEK.indexOf("(_cancW?' wk-cancel':'')") > 0);
ok('semanal: en una cancelada las tareas usan statusLbl, no statusBtn',
  WEEK.indexOf("var btns=_cancW?(isSal?statusLbl('Cierre'):statusLbl('Limpieza')+statusLbl('WelcomePack')):") > 0);
var statusLbl = new Function(fnSource('statusLbl') + '\nreturn statusLbl;')();
var lbl = statusLbl('Cierre');
ok('statusLbl: etiqueta gris sin enlace ni onclick', lbl.indexOf('wk-status na') > 0 && !/href|onclick|<a /.test(lbl), lbl);
var RC = fnSource('renderCards');
ok('contadores: las canceladas no cuentan y se cuentan por reserva, no por fila', /if\(esCancelada\(row\.r\)\)\{_cancCodes\.add\(/.test(RC) && RC.indexOf('_nCanc=_cancCodes.size;') > 0);
ok('contadores: la cabecera resta las canceladas y dice + N canceladas',
  RC.indexOf("$('hCount').textContent=rows.filter(row=>!esCancelada(row.r)).length;") > 0 && RC.indexOf("' reservas'+_cancTxt") > 0 && RC.indexOf("'canceladas'") > 0);
ok('filtro CI Pendiente no esconde la cancelada buscada', RC.indexOf("const skipCI=toggleMode==='pend'&&!ciIsPending&&!esCancelada(r);") > 0);
var MERGE = fnSource('pagosStripeMerge');
ok('pagosStripeMerge salta las canceladas (segunda capa)', /_st==='cancelled'\|\|_st\.indexOf\('cancel'\)!==-1\)return;/.test(MERGE));
ok('contadores: reservas sin canceladas', RC.indexOf('records.filter(r=>!esCancelada(r)).length') > 0);
ok('hay un estilo .lbl-cancel rojo', /\.lbl-cancel\{[^}]*background:var\(--red-light\);color:var\(--red\)/.test(SRC));

console.log('\n== 6. Version e historial ==');

var linea3 = SRC.split('\n')[2];
ok('la cabecera dice VERSION ACTUAL v154', /VERSIÓN ACTUAL: v154/.test(linea3), linea3);
ok('PAGE_VERSION dice v154', /const PAGE_VERSION='v154';/.test(SRC));
ok('el titulo dice v154', /<title>Entradas Equipo v154/.test(SRC));
ok('el historial empieza por v154 y conserva v153', /<!-- HISTORIAL: v154 - /.test(SRC) && /\| v153 - /.test(SRC) && SRC.indexOf('<!-- HISTORIAL: v154 - ') < SRC.indexOf('| v153 - '));
ok('el historial de v154 cita a Toni y la prueba', /HISTORIAL: v154 - [^|]*Toni Segui[^|]*16:41[^|]*entradas-canceladas-busqueda\.test\.js/.test(SRC));
ok('no se guarda nada nuevo: ninguna clave nueva de canceladas en localStorage o URL', !/localStorage[^\n]{0,80}cancel|params\.set\('canc/i.test(SRC.slice(0, SRC.indexOf('<!-- HISTORIAL: '))));

console.log('\n' + pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
