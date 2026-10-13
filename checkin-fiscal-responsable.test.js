/* Pruebas de la persona responsable de una reserva de EMPRESA (checkin-pasos v113, police-url v3).
   Caso: Jordi, WhatsApp 13/10/2026 19:00, reserva 51605085: con 'Empresa' en los datos fiscales
   el link de policia caia al nombre de la reserva ('Hugo & Jaime', sin apellido) y el registro
   de policia fallo. Desde v113 el formulario pide nombre y apellido del responsable y
   police-url.js v3 los usa.
   node checkin-fiscal-responsable.test.js

   Como checkin-fiscal-empresa.test.js: NO copia el codigo de la pagina. Extrae las funciones
   reales de checkin-pasos.html y las ejecuta. Sin red, sin datos de huespedes. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var S = fs.readFileSync('checkin-pasos.html', 'utf8');
function fnSource(name) {
  var i = S.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = S.indexOf('{', i), depth = 0, k = j;
  for (; k < S.length; k++) { if (S[k] === '{') depth++; else if (S[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return S.slice(i, k);
}

console.log('marcado: la fila del responsable');
var iRow = S.indexOf('id="fRespRow"'), iName = S.indexOf('id="fNameRow"'), iCountry = S.indexOf('id="fCountry"');
ok('#fRespRow existe y va justo despues de #fNameRow, antes de la nacionalidad', iRow > iName && iRow < iCountry && iName > 0);
ok('#fRespRow oculta por defecto', /<div class="field" id="fRespRow" style="display:none">/.test(S));
ok('#fRespFname con autocomplete given-name', /<input class="inp" id="fRespFname" type="text" autocomplete="given-name">/.test(S));
ok('#fRespLname con autocomplete family-name', /<input class="inp" id="fRespLname" type="text" autocomplete="family-name">/.test(S));
ok('las etiquetas usan lbl_resp_fname y lbl_resp_lname, con asterisco',
   /data-i18n="lbl_resp_fname">[^<]*<\/span><span class="req">\*<\/span>/.test(S) && /data-i18n="lbl_resp_lname">[^<]*<\/span><span class="req">\*<\/span>/.test(S));
ok('la pista resp_hint esta dentro de la fila', S.indexOf('data-i18n="resp_hint"') > iRow && S.indexOf('data-i18n="resp_hint"') < iCountry);

console.log('_applyFiscalType: mostrar, exigir y vaciar');
function el(id) { return { id: id, style: {}, required: false, value: '', checked: false, attrs: {}, setAttribute: function (k, v) { this.attrs[k] = v; }, textContent: '' }; }
var ids = ['fTypePerson', 'fTypeCompany', 'lblFname', 'lblCountry', 'lblDni', 'fLnameField', 'fNameRow', 'fLname', 'fFname', 'hintDni', 'hintDniVerify', 'fCountry', 'fRespRow', 'fRespFname', 'fRespLname'];
var E = {}; ids.forEach(function (id) { E[id] = el(id); });
var ctx = { $: function (id) { return E[id] || null; }, tArr: function (k) { return k; }, _setDniEnabled: function () {} };
vm.runInNewContext(fnSource('_fiscalCompany') + '\n' + fnSource('_fiscalI18n') + '\n' + fnSource('_applyFiscalType'), ctx);
E.fTypeCompany.checked = true; E.fTypePerson.checked = false;
ctx._applyFiscalType();
ok('empresa: la fila se ve', E.fRespRow.style.display === '');
ok('empresa: los dos campos son obligatorios', E.fRespFname.required === true && E.fRespLname.required === true);
E.fRespFname.value = 'Hugo'; E.fRespLname.value = 'Garcia';
ctx._applyFiscalType();
ok('empresa: un segundo repaso no borra lo escrito', E.fRespFname.value === 'Hugo' && E.fRespLname.value === 'Garcia');
E.fTypeCompany.checked = false; E.fTypePerson.checked = true;
ctx._applyFiscalType();
ok('persona: la fila se oculta', E.fRespRow.style.display === 'none');
ok('persona: los campos dejan de ser obligatorios', E.fRespFname.required === false && E.fRespLname.required === false);
ok('persona: los campos se vacian', E.fRespFname.value === '' && E.fRespLname.value === '');
ok('persona: el apellido fiscal sigue obligatorio (sin cambio)', E.fLname.required === true);

console.log('la pagina usa los campos');
ok('version v113 en cabecera, titulo y PAGE_VERSION',
   /VERSIÓN ACTUAL: v113 \|/.test(S.slice(0, 400)) && /<title>Check-in Pasos v113 — 3Villas<\/title>/.test(S) && S.indexOf('var PAGE_VERSION = 113;') > 0);
ok('historial v113 delante de la v112', /<!-- HISTORIAL: v113 - .*? \| v112 - /.test(S));
ok('police-url.js con cache nueva (?v=4)', S.indexOf('<script src="police-url.js?v=4">') > 0);
ok('prerelleno desde la vista (prefijo TaBookings2021_)',
   S.indexOf("fRespFname:'TaBookings2021_Fiscal_responsable_nombre'") > 0 && S.indexOf("fRespLname:'TaBookings2021_Fiscal_responsable_apellido'") > 0);
var sub = fnSource('submitForm');
ok('el envio exige el responsable solo con Empresa', /if\(_isCo\)\{\s*var _respMiss=\['fRespFname','fRespLname'\]/.test(sub) && sub.indexOf("showToast(tArr('resp_required'))") > 0);
ok('la comprobacion va antes de guardar', sub.indexOf('_respMiss') < sub.indexOf('const record={'));
ok('se guarda Fiscal_responsable_nombre (null para una persona)', sub.indexOf("Fiscal_responsable_nombre:         _isCo?($('fRespFname').value.trim()||null):null") > 0);
ok('se guarda Fiscal_responsable_apellido (null para una persona)', sub.indexOf("Fiscal_responsable_apellido:       _isCo?($('fRespLname').value.trim()||null):null") > 0);
ok('el bloque de la empresa no cambia (razon social sin apellido)', sub.indexOf('Fiscal_guest_surename:             _isCo?null:') > 0);

var langs = ['en', 'es', 'fr', 'de', 'it', 'nl', 'pt', 'ca'];
var keys = ['lbl_resp_fname', 'lbl_resp_lname', 'resp_hint', 'resp_required'];
langs.forEach(function (l) {
  var a = S.indexOf('LANG_ARR.' + l + '={'), b = S.indexOf('\n};', a);
  var blk = S.slice(a, b);
  ok('tabla ' + l + ': las 4 claves nuevas', a > 0 && keys.every(function (k) { return blk.indexOf(k + ":'") > 0; }));
});
keys.forEach(function (k) {
  var n = S.split(k + ":'").length - 1;
  ok('texto ' + k + ' exactamente en los 8 idiomas', n === langs.length, 'veces: ' + n);
});
ok('ES: textos de Jordi', S.indexOf("lbl_resp_lname:'Apellido de la persona responsable'") > 0 &&
   S.indexOf("resp_required:'Indica el nombre y el apellido de la persona responsable de la reserva.'") > 0);

console.log('police-url v3: la policia a nombre del responsable');
global.window = global;
require('./police-url.js');
var P = window.PoliceUrl;
var PU = fs.readFileSync('police-url.js', 'utf8');
ok('cabecera VERSION ACTUAL: v3', /VERSION ACTUAL: v3\n/.test(PU));
function mk(f) { return function (k) { return f[k] !== undefined ? f[k] : ''; }; }
function param(url, name) { var m = url.match(new RegExp('[?&]' + name + '=([^&]*)')); return m ? decodeURIComponent(m[1]) : null; }
var base = { Link_Registrodepolicia: 'org-abc', Checkin: '2026-10-13', Checkout: '2026-10-20', Adults: '2', Children: '0', Guest_Full_Name: 'Hugo & Jaime', Guest_Surename: '' };
var empresa = { Fiscal_guest_name: 'ACME VIAJES, SL', Fiscal_guest_surename: '', Fiscal_guest_DNI_passport: 'B70807052' };
var r = P.build(mk(Object.assign({}, base, empresa, { Fiscal_responsable_nombre: 'Hugo', Fiscal_responsable_apellido: 'Garcia Pons' })), { code: '51605085' });
ok('empresa + responsable -> nombre y apellido del responsable', r.firstName === 'Hugo' && r.lastName === 'Garcia Pons', r.firstName + ' / ' + r.lastName);
ok('  ...en el link (firstName, lastName1)', param(r.url, 'firstName') === 'Hugo' && param(r.url, 'lastName1') === 'Garcia Pons', r.url);
ok('  ...y la razon social no va en el link', r.url.indexOf('ACME') < 0);
r = P.build(mk(Object.assign({}, base, empresa, { Fiscal_responsable_nombre: '  Hugo ', Fiscal_responsable_apellido: ' Garcia ' })), { code: 'X1' });
ok('espacios alrededor se quitan', r.firstName === 'Hugo' && r.lastName === 'Garcia', JSON.stringify([r.firstName, r.lastName]));
r = P.build(mk(Object.assign({}, base, empresa)), { code: 'X1' });
ok('empresa sin responsable -> nombre de la reserva (regla v2)', r.firstName === 'Hugo & Jaime' && r.lastName === '', r.firstName + ' / ' + r.lastName);
r = P.build(mk(Object.assign({}, base, empresa, { Fiscal_responsable_nombre: 'Hugo', Fiscal_responsable_apellido: '  ' })), { code: 'X1' });
ok('empresa con solo el nombre del responsable -> nombre de la reserva', r.firstName === 'Hugo & Jaime', r.firstName + ' / ' + r.lastName);
r = P.build(mk(Object.assign({}, base, { Fiscal_guest_name: 'Joan', Fiscal_guest_surename: 'Marti', Fiscal_guest_DNI_passport: '12345678Z', Fiscal_responsable_nombre: 'Otro', Fiscal_responsable_apellido: 'Antiguo' })), { code: 'X1' });
ok('persona: manda el nombre fiscal, un responsable antiguo no cuenta', r.firstName === 'Joan' && r.lastName === 'Marti', r.firstName + ' / ' + r.lastName);
/* El accesor real de checkin-pasos (_polGet) resuelve el prefijo TaBookings2021_ de la vista. */
var row = { TaVillas_Link_Registrodepolicia: 'org-abc', TaBookings2021_Checkin: '2026-10-13', TaBookings2021_Checkout: '2026-10-20', TaBookings2021_Adults: '2',
            TaBookings2021_Guest_Full_Name: 'Hugo & Jaime', TaBookings2021_Fiscal_guest_name: 'ACME VIAJES, SL', TaBookings2021_Fiscal_guest_surename: '',
            TaBookings2021_Fiscal_guest_DNI_passport: 'B70807052', TaBookings2021_Fiscal_responsable_nombre: 'Hugo', TaBookings2021_Fiscal_responsable_apellido: 'Garcia' };
var ctx2 = { r: row };
vm.runInNewContext("var _polVillaFlds={Link_Registrodepolicia:1,Lint_Policia_castellsol:1};\n" + fnSource('_polGet'), ctx2);
r = P.build(ctx2._polGet, { code: '51605085' });
ok('con el accesor de la pagina (claves TaBookings2021_) -> responsable', r.firstName === 'Hugo' && r.lastName === 'Garcia', r.firstName + ' / ' + r.lastName);

console.log('\n' + pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
