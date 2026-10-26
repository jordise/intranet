/* Pruebas de la fila Propietario en "Ver detalles" de la ficha (v157, Rafa 26/10/2026: el villa manager
   que tiene que llamar al propietario debe tener sus datos en la ficha; Gary 26/10/2026: variante 1,
   "villa manager and management only", "not cleaners"). node entradas-propietario.test.js

   Como entradas-horas-salida.test.js: NO copia el codigo de la pagina. Extrae de entradas-equipo.html
   puedeVerPropietario, escP, cleanPhone y propietarioHtml y los ejecuta con mapas de prueba. Sin red. */
var fs = require('fs'), vm = require('vm');
var P = 'entradas-equipo.html';
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

var SRC = fs.readFileSync(P, 'utf8');

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
function bloqueOpc(marca) { try { return bloque(marca, '{', '}'); } catch (e) { return ''; } }
function linea(marca) {
  var i = SRC.indexOf(marca);
  if (i < 0) throw new Error('no encuentro ' + marca + ' en ' + P);
  return SRC.slice(i, SRC.indexOf('\n', i));
}

/* datos de prueba: villa 101 con propietario e incidencias distintos, 102 propietario = incidencias,
   103 sin propietario, 104 propietario que no existe en TaContacts, 105 propietario sin telefono */
var ctx = { contactsInfo: new Map(), villaOwnersMap: new Map() };
ctx.contactsInfo.set('501', { name: 'Joan Pons', phone: '+34 600 000 001', email: 'owner@example.com' });
ctx.contactsInfo.set('502', { name: 'Marta Mercadal', phone: '+34 611 222 333', email: '' });
ctx.contactsInfo.set('503', { name: 'Pep <b>Sin tel</b>', phone: '', email: '' });
ctx.villaOwnersMap.set('101', { owner: '501', issues: '502' });
ctx.villaOwnersMap.set('102', { owner: '501', issues: '501' });
ctx.villaOwnersMap.set('103', { owner: '', issues: '502' });
ctx.villaOwnersMap.set('104', { owner: '999', issues: '' });
ctx.villaOwnersMap.set('105', { owner: '503', issues: '' });
/* fix1 (26/10/2026): 106 telefono sin digitos, 107 incidencias = "Propietario" (marcador), 108 incidencias "3Villas" */
ctx.contactsInfo.set('504', { name: 'Tel Raro', phone: 'abc', email: '' });
ctx.contactsInfo.set('505', { name: ' Propietario ', phone: '+34 622 000 000', email: '' });
ctx.contactsInfo.set('506', { name: '3Villas', phone: '971 36 12 34', email: '' });
ctx.villaOwnersMap.set('106', { owner: '504', issues: '' });
ctx.villaOwnersMap.set('107', { owner: '501', issues: '505' });
ctx.villaOwnersMap.set('108', { owner: '501', issues: '506' });
var codigo;
try {
  codigo = [linea('function cleanPhone('), bloque('function escP(', '{', '}'), bloque('function puedeVerPropietario(', '{', '}'),
    bloque('function propietarioHtml(', '{', '}')].join('\n');
  vm.runInNewContext(codigo, ctx);
} catch (e) { ok('las funciones nuevas existen en la pagina', false, e.message); console.log('\n' + pass + ' pasan, ' + fail + ' fallan'); process.exit(1); }
try { vm.runInNewContext(bloque('function waDigitsPropietario(', '{', '}'), ctx); }
catch (e) { ok('waDigitsPropietario existe en la pagina', false, e.message); ctx.waDigitsPropietario = function () { return undefined; }; }

console.log('1. Quien la ve (la puerta)');
ok('admin la ve', ctx.puedeVerPropietario('admin', false) === true);
ok('manager la ve', ctx.puedeVerPropietario('manager', false) === true);
ok('villa manager (staff con Keyholder_por_defecto) la ve', ctx.puedeVerPropietario('staff', true) === true);
ok('cleaner NO la ve', ctx.puedeVerPropietario('cleaner', false) === false);
ok('sales NO la ve', ctx.puedeVerPropietario('sales', false) === false);
ok('staff sin Keyholder_por_defecto NO la ve', ctx.puedeVerPropietario('staff', false) === false);
ok('sin rol NO la ve', ctx.puedeVerPropietario('', false) === false);
ok('isVillaManager tiene que ser true de verdad (no "x")', ctx.puedeVerPropietario('cleaner', 'x') === false);
/* fix1: solo villa managers de rol staff y direccion (Gary), nunca limpieza ni ventas aunque tengan Keyholder_por_defecto */
ok('cleaner con Keyholder_por_defecto NO la ve', ctx.puedeVerPropietario('cleaner', true) === false);
ok('sales con Keyholder_por_defecto NO la ve', ctx.puedeVerPropietario('sales', true) === false);
ok('staff con Keyholder_por_defecto la ve', ctx.puedeVerPropietario('staff', true) === true);
ok('staff sin Keyholder_por_defecto NO la ve (otra vez)', ctx.puedeVerPropietario('staff', false) === false);
ok('rol con mayusculas y espacios ("ADMIN ") la ve', ctx.puedeVerPropietario('ADMIN ', false) === true);
ok('isVillaManager "true" (texto) no basta', ctx.puedeVerPropietario('staff', 'true') === false);

console.log('2. La fila para admin, villa 101');
var h = ctx.propietarioHtml('101', 'admin', false);
ok('usa .staff-row', /class="staff-row staff-owner"/.test(h), h);
ok('💼 nombre — Propietario', /💼 <strong>.*Joan Pons.*<\/strong> — Propietario/.test(h), h);
ok('el nombre enlaza a contactos.html?contactid=501', h.indexOf('href="contactos.html?contactid=501"') >= 0);
ok('muestra el telefono', h.indexOf('+34 600 000 001') >= 0);
ok('📞 Llamar con tel: sin espacios', h.indexOf('href="tel:+34600000001"') >= 0 && h.indexOf('📞 Llamar') >= 0, h);
ok('📞 Llamar con el aspecto .lnk azul', /class="lnk lnk-m"[^>]*href="tel:/.test(h));
ok('💬 WhatsApp a wa.me con los digitos de waDigitsPropietario', h.indexOf('href="https://wa.me/34600000001"') >= 0, h);
ok('💬 WhatsApp con el aspecto .lnk verde', /class="lnk lnk-wa"[^>]*href="https:\/\/wa\.me\//.test(h));
ok('✉️ email con mailto:', h.indexOf('✉️') >= 0 && h.indexOf('href="mailto:owner@example.com"') >= 0, h);
ok('✉️ va DENTRO del enlace mailto (>✉️ email)', /<a [^>]*href="mailto:owner@example\.com"[^>]*>✉️ owner@example\.com<\/a>/.test(h), h);
ok('🛠️ Responsable incidencias: Marta Mercadal · telefono', /🛠️ Responsable incidencias: .*Marta Mercadal.* <span[^>]*>· .*\+34 611 222 333/.test(h), h);
ok('"· telefono" de incidencias en un span nowrap', /<span style="white-space:nowrap">· <a href="tel:\+34611222333"[^>]*>\+34 611 222 333<\/a><\/span>/.test(h), h);

console.log('3. La fila para un villa manager, y nada para los demas');
ok('villa manager (staff) ve la misma fila', ctx.propietarioHtml('101', 'staff', true) === h);
ok('manager ve la misma fila', ctx.propietarioHtml('101', 'manager', false) === h);
ok('cleaner: cadena vacia', ctx.propietarioHtml('101', 'cleaner', false) === '');
ok('sales: cadena vacia', ctx.propietarioHtml('101', 'sales', false) === '');
ok('staff sin keyholder: cadena vacia', ctx.propietarioHtml('101', 'staff', false) === '');
ok('cleaner con Keyholder_por_defecto: cadena vacia', ctx.propietarioHtml('101', 'cleaner', true) === '');
ok('sales con Keyholder_por_defecto: cadena vacia', ctx.propietarioHtml('101', 'sales', true) === '');

console.log('4. Sin propietario no hay fila (ni linea vacia)');
ok('villa sin Owner: vacio', ctx.propietarioHtml('103', 'admin', false) === '');
ok('Owner que no esta en TaContacts: vacio', ctx.propietarioHtml('104', 'admin', false) === '');
ok('villa que no esta en TaVillas: vacio', ctx.propietarioHtml('999', 'admin', false) === '');
ok('sin villaId: vacio', ctx.propietarioHtml('', 'admin', false) === '');
var h5 = ctx.propietarioHtml('105', 'admin', false);
ok('propietario sin telefono ni email: solo la primera linea, sin botones', h5.indexOf('Propietario') >= 0 && h5.indexOf('tel:') < 0 && h5.indexOf('wa.me') < 0 && h5.indexOf('mailto:') < 0, h5);
ok('el nombre se escapa (sin HTML inyectado)', h5.indexOf('<b>') < 0 && h5.indexOf('&lt;b&gt;') >= 0, h5);

console.log('5. Responsable incidencias solo si existe y es otra persona');
var h2 = ctx.propietarioHtml('102', 'admin', false);
ok('mismo contacto que el propietario: sin linea de incidencias', h2.indexOf('Responsable incidencias') < 0 && h2.indexOf('Propietario') >= 0, h2);
ok('sin Issues_responsible: sin linea', h5.indexOf('Responsable incidencias') < 0);
var h7 = ctx.propietarioHtml('107', 'admin', false);
ok('incidencias = contacto "Propietario" (marcador): sin linea', h7.indexOf('Responsable incidencias') < 0 && h7.indexOf('Joan Pons') >= 0, h7);
var h8 = ctx.propietarioHtml('108', 'admin', false);
ok('incidencias = "3Villas": se muestra tal cual', /🛠️ Responsable incidencias: .*3Villas/.test(h8) && h8.indexOf('href="tel:971361234"') >= 0, h8);

console.log('5b. WhatsApp y tel: de los numeros del propietario (waDigitsPropietario; cleanPhone no cambia)');
var W = ctx.waDigitsPropietario;
[['+34 600 000 001', '34600000001'], ['600000001', '34600000001'], ['0034 600-000-001', '34600000001'],
 ['+44 7700 900123', '447700900123'], ['971 36 12 34', '34971361234'], ['abc', ''], ['600 000 001 / 611 222 333', '34600000001']
].forEach(function (c) { ok('waDigitsPropietario("' + c[0] + '") = "' + c[1] + '"', W(c[0]) === c[1], W(c[0])); });
ok('cleanPhone sigue igual (lo usa el WhatsApp del inquilino)', linea('function cleanPhone(') === "function cleanPhone(ph){return(ph||'').replace(/\\s/g,'').replace(/^\\+/,'');}", linea('function cleanPhone('));
var h6 = ctx.propietarioHtml('106', 'admin', false);
ok('telefono "abc": texto y Llamar si, boton WhatsApp no', h6.indexOf('<span>abc</span>') >= 0 && h6.indexOf('📞 Llamar') >= 0 && h6.indexOf('wa.me') < 0 && h6.indexOf('WhatsApp') < 0, h6);
var pf = bloque('function propietarioHtml(', '{', '}');
ok('propietarioHtml no usa cleanPhone', pf.indexOf('cleanPhone(') < 0);
ok('tel: con String(ph).replace(/[^\\d+]/g,\'\')', pf.indexOf(".replace(/[^\\d+]/g,'')") >= 0);

console.log('6. buildCard, carga y CSS');
var card = bloque('function buildCard(', '{', '}');
ok('buildCard llama a propietarioHtml con Auth.role() y __isVillaManager', /propietarioHtml\(villaId,\s*Auth\.role\(\),\s*window\.__isVillaManager===true\)/.test(card));
ok('el bloque .c-staff se abre tambien si solo hay propietario', /if\(cleanerName\|\|vmName\|\|ownerHtml\)/.test(card));
var iVm = card.indexOf('— Villa Manager'), iOw = card.indexOf('html+=ownerHtml'), iClose = card.indexOf("html+='</div>'", iVm);
ok('la fila va despues de Villa Manager y dentro de .c-staff', iVm > 0 && iOw > iVm && iClose > iOw);
var lc = bloque('async function loadContacts(', '{', '}');
ok('loadContacts guarda telefono y email en contactsInfo (misma llamada)', /contactsInfo\.set\(/.test(lc) && /CONTACT_F\.phone/.test(lc) && /CONTACT_F\.email/.test(lc));
ok('una sola llamada a TaContacts en la pagina', (SRC.match(/table=\$\{CFG\.contactsTable\}/g) || []).length === 1);
var lv = bloque('async function loadVillaOwners(', '{', '}');
ok('loadVillaOwners lee TaVillas una vez, limit 500', /table=TaVillas/.test(lv) && /limit=500/.test(lv) && (lv.match(/fetch\(/g) || []).length === 1);
ok('guarda Owner e Issues_responsible por villaid', /villaOwnersMap\.set\(/.test(lv) && /Owner/.test(lv) && /Issues_responsible/.test(lv) && /villaid/.test(lv));
ok('TaVillas ya no va en el Promise.allSettled del arranque', /Promise\.allSettled\(\[[^\]]*loadContacts\(\),loadMultiunits\(\)/.test(SRC) && !/Promise\.allSettled\(\[[^\]]*loadVillaOwners/.test(SRC));
var ci = bloqueOpc('function cargaInicial(');
ok('cargaInicial: loadVillaOwners solo despues de loadManagers y con puedeVerPropietario', /loadManagers\(\)/.test(ci) && /\.then\(/.test(ci) && ci.indexOf('loadVillaOwners()') > ci.indexOf('.then(') && /puedeVerPropietario\(Auth\.role\(\),\s*window\.__isVillaManager===true\)/.test(ci), ci);
ok('el arranque usa cargaInicial y la primera busqueda no espera a TaVillas', /cargaInicial\(\)/.test(bloque("window.addEventListener('DOMContentLoaded'", '{', '}')) && (SRC.match(/(?<!function )loadVillaOwners\(\)/g) || []).length === 1);
ok('buildCard no hace fetch', card.indexOf('fetch(') < 0);
ok('CSS .lnk-wa verde WhatsApp solido (#25D366, texto blanco)', /\.lnk-wa\{background:#25D366;color:#fff\}/.test(SRC) && /body\.dark \.lnk-wa\{background:#25D366!important;color:#fff!important\}/.test(SRC));
ok('CSS movil: la fila envuelve y no ensancha la ficha', /\.own-line\{[^}]*flex-wrap:wrap[^}]*min-width:0/.test(SRC) && /\.own-mail\{[^}]*overflow-wrap:anywhere/.test(SRC));
ok('la ficha del limpiador no se toca (entradas-cleaner.html no esta en el payload)', !fs.existsSync('entradas-cleaner.html') || fs.readFileSync('entradas-cleaner.html', 'utf8').indexOf('propietarioHtml') < 0);

console.log('6b. Arranque: quien descarga TaVillas (fetch de prueba, se cuentan las llamadas por URL)');
/* Codigo real de la pagina: CFG, U, isActiveUser, loadManagers, loadVillaOwners, puedeVerPropietario y cargaInicial.
   loadContacts, loadMultiunits y loadSources son de prueba (solo registran su llamada); el DOM es minimo. */
function arranque(role, email) {
  var calls = [];
  var users = [
    { UserID: 'U1', Name: 'Limpia', Email: 'limpia@3villas.com', User_Status: 'Active', Keyholder_por_defecto: '' },
    { UserID: 'U2', Name: 'Limpia VM', Email: 'limpiavm@3villas.com', User_Status: 'Active', Keyholder_por_defecto: 'U2' },
    { UserID: 'U3', Name: 'Villa Manager', Email: 'vm@3villas.com', User_Status: 'Active', Keyholder_por_defecto: 'U3' },
    { UserID: 'U4', Name: 'Jefa', Email: 'admin@3villas.com', User_Status: 'Active', Keyholder_por_defecto: '' }
  ];
  function fetchStub(url) {
    calls.push(String(url));
    var rows = /table=TaVillas/.test(url) ? [{ villaid: 101, Owner: '501', Issues_responsible: '502' }] : /table=TaUsers/.test(url) ? users : [];
    return Promise.resolve({ json: function () { return Promise.resolve({ Result: rows }); } });
  }
  var body = [
    bloque('const CFG = {', '{', '}') + ';', bloque('const U = {', '{', '}') + ';',
    "var managersMap=new Map(),allUsersMap=new Map(),currentUserId='',selectedManagers=new Set(),allManagersList=[],villaOwnersMap=new Map();",
    'var els={};var $=function(id){return els[id]||(els[id]={textContent:"",value:"",disabled:false});};',
    'function renderManagerList(){} function updateManagerBtn(){}',
    "function loadContacts(){calls.push('stub:TaContacts');return Promise.resolve();}",
    "function loadMultiunits(){calls.push('stub:multiunits');return Promise.resolve();}",
    "function loadSources(){calls.push('stub:sources');return Promise.resolve();}",
    bloqueOpc('function isActiveUser('), bloqueOpc('async function loadManagers('), bloqueOpc('async function loadVillaOwners('),
    bloqueOpc('function puedeVerPropietario('), bloqueOpc('function cargaInicial('),
    'if(typeof cargaInicial!=="function")return Promise.resolve(null);',
    'var c=cargaInicial();',
    'return Promise.all([c.base,c.owners]).then(function(){return {villaOwnersMap:villaOwnersMap,isVM:window.__isVillaManager};});'
  ].join('\n');
  var Auth = { url: function (u) { return u + '&token=x'; }, role: function () { return role; }, email: function () { return email; }, name: function () { return ''; } };
  return new Function('fetch', 'Auth', 'window', 'calls', 'console', body)(fetchStub, Auth, {}, calls, { log: function () {}, warn: function () {} })
    .then(function (r) { return { r: r, calls: calls, villas: calls.filter(function (u) { return /table=TaVillas/.test(u); }).length }; });
}
var arranques = Promise.all([arranque('cleaner', 'limpia@3villas.com'), arranque('cleaner', 'limpiavm@3villas.com'),
  arranque('sales', 'limpiavm@3villas.com'), arranque('staff', 'vm@3villas.com'), arranque('admin', 'admin@3villas.com'),
  arranque('staff', 'limpia@3villas.com')]).then(function (a) {
  var cl = a[0], clvm = a[1], sa = a[2], st = a[3], ad = a[4], stno = a[5];
  ok('cargaInicial existe y termina', cl.r !== null);
  ok('cleaner: TaUsers si, TaVillas NUNCA', cl.calls.some(function (u) { return /table=TaUsers/.test(u); }) && cl.villas === 0, cl.calls.join(' | '));
  ok('cleaner con Keyholder_por_defecto: TaVillas NUNCA y mapa vacio', clvm.villas === 0 && clvm.r && clvm.r.villaOwnersMap.size === 0 && clvm.r.isVM === true, clvm.calls.join(' | '));
  ok('sales con Keyholder_por_defecto: TaVillas NUNCA', sa.villas === 0, sa.calls.join(' | '));
  ok('staff sin Keyholder_por_defecto: TaVillas NUNCA', stno.villas === 0, stno.calls.join(' | '));
  ok('villa manager (staff + Keyholder_por_defecto): TaVillas una vez y mapa lleno', st.villas === 1 && st.r && st.r.villaOwnersMap.get('101') && st.r.villaOwnersMap.get('101').owner === '501', st.calls.join(' | '));
  ok('admin: TaVillas una vez', ad.villas === 1, ad.calls.join(' | '));
  ok('TaVillas va despues de TaUsers', st.calls.findIndex(function (u) { return /table=TaVillas/.test(u); }) > st.calls.findIndex(function (u) { return /table=TaUsers/.test(u); }));
});

console.log('6c. buildCard real (como entradas-canceladas-busqueda.test.js)');
var FMAP = bloque('const F = {', '{', '}') + ';';
function fnS(name) { return bloqueOpc('function ' + name + '('); }
function makeCard(role) {
  var body = [
    FMAP,
    'var document={createElement:function(){return {className:"",attrs:{},setAttribute:function(k,v){this.attrs[k]=v;},innerHTML:""};}};',
    'var allUsersMap=new Map(),managersMap=new Map(),multiunitsMap=new Map(),contactsMap=new Map();',
    'var SVG_WA="<svg height=\\"40\\" width=\\"40\\"></svg>";',
    'var PROPIETARIO_BADGE="Check-in online: no aplica (propietario)";',
    'function getCleanerName(){return "";}', 'function getManagerName(){return "";}',
    'function starBadgeHTML(){return "";}', 'function canNotas(){return true;}',
    'function buildWACheckoutMsg(){return "hola";}',
    'var contactsInfo=new Map([["501",{name:"Joan Pons",phone:"+34 600 000 001",email:"owner@example.com"}]]);',
    'var villaOwnersMap=new Map([["7",{owner:"501",issues:""}]]);',
    'var Auth={role:function(){return ' + JSON.stringify(role) + ';}},window={};',
    fnS('g'), fnS('isOk'), fnS('_lvNum'), fnS('_lvBool1'), fnS('nightsN'), fnS('fmtDate'),
    fnS('stClass'), fnS('cleanPhone'), fnS('useArrival'), fnS('getMuNames'),
    fnS('esCancelada'), fnS('esPropietario'), fnS('arrivalOk'), fnS('ecotasaOk'),
    fnS('fianzaFalta'), fnS('fianzaOk'), fnS('fianzaLabel'),
    fnS('calcPaymentItems'), fnS('paymentsLineHTML'),
    fnS('nerUrl'), fnS('mkBadge'), fnS('horasHtml'), fnS('puedeVerPropietario'), fnS('escP'), fnS('waDigitsPropietario'), fnS('propietarioHtml'), fnS('buildCard'),
    'return function(r,t){var el=buildCard(r,t);return {html:el.innerHTML,cls:el.className};};'
  ].join('\n');
  return new Function(body)();
}
var reserva = {
  TaBookings2021_FS_confirmation_code: 'TEST0001', TaBookings2021_BookingStatus: 'new',
  TaBookings2021_Arrivalform_done: '0', TaBookings2021_Ecotasa_final: '30', TaBookings2021_Ecotasa_cobrada: '0',
  TaVillas_villaid: '7', TaVillas_Name_villa_para_inquilinos: 'Villa Prueba',
  TaBookings2021_Checkin: '2026-10-08T00:00:00', TaBookings2021_Checkout: '2026-10-15T00:00:00',
  TaBookings2021_Guest_phonenumber: '+34 600 000 000', TaBookings2021_Guest_email: 'prueba@example.com',
  TaBookings2021_LimpiezaTerminada: '1', TaBookings2021_Welcomepackentregado: '0', TaBookings2021_Checkoutcontrolado: '0'
};
var cardAdmin = null, cardCleaner = null;
try { cardAdmin = makeCard('admin')(reserva, 'entrada').html; cardCleaner = makeCard('cleaner')(reserva, 'entrada').html; }
catch (e) { ok('buildCard se ejecuta', false, e.message); }
if (cardAdmin !== null) {
  var iS = cardAdmin.indexOf('<div class="c-staff">'), staff = iS >= 0 ? cardAdmin.slice(iS) : '';
  ok('admin: hay bloque .c-staff solo con el propietario (sin limpiador ni VM)', iS >= 0 && cardAdmin.indexOf('— Villa Manager') < 0, cardAdmin.slice(0, 200));
  ok('admin: .c-staff tiene "— Propietario"', staff.indexOf('— Propietario') >= 0);
  ok('admin: .c-staff tiene tel:+34600000001', staff.indexOf('href="tel:+34600000001"') >= 0);
  ok('admin: .c-staff tiene wa.me/34600000001', staff.indexOf('href="https://wa.me/34600000001"') >= 0);
  ok('admin: .c-staff tiene mailto:owner@example.com', staff.indexOf('href="mailto:owner@example.com"') >= 0);
  ok('cleaner: ni "Propietario" (fila) ni bloque .c-staff', cardCleaner.indexOf('— Propietario') < 0 && cardCleaner.indexOf('staff-owner') < 0 && cardCleaner.indexOf('c-staff') < 0 && cardCleaner.indexOf('owner@example.com') < 0, cardCleaner.indexOf('c-staff'));
}

console.log('7. Version');
ok('version v157 en las tres marcas', SRC.indexOf('VERSIÓN ACTUAL: v157') >= 0 && SRC.indexOf('Entradas Equipo v157') >= 0 && SRC.indexOf("PAGE_VERSION='v157'") >= 0);
var hist = SRC.slice(SRC.indexOf('<!-- HISTORIAL: v157'));
ok('HISTORIAL v157 con Rafa, fecha y prueba, y v156 detras', /<!-- HISTORIAL: v157 - /.test(SRC) && hist.indexOf('Rafa') >= 0 && hist.indexOf('26/10/2026') >= 0 && hist.indexOf('entradas-propietario.test.js') >= 0 && hist.indexOf('| v156 - ') > 0);
ok('el comentario HISTORIAL cierra una sola vez', hist.split('-->').length === 2);
var scripts = 0, re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, compila = true;
while ((m = re.exec(SRC))) { scripts++; try { new vm.Script(m[1]); } catch (e) { compila = e.message; } }
ok('los scripts inline compilan', scripts > 0 && compila === true, compila);

arranques.catch(function (e) { ok('el arranque de prueba no lanza', false, e && e.message); }).then(function () {
  console.log('\n' + pass + ' pasan, ' + fail + ' fallan');
  process.exit(fail ? 1 : 0);
});
