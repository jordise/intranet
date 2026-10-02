/* Pruebas de los datos fiscales de persona o de empresa (checkin-pasos v108, police-url v2).
   Caso: Toni, WhatsApp 02/10/2026: el CIF B70807052 de un proveedor nuevo (empresa) salia
   como 'no valido' en el formulario de llegada, que para Espana solo admitia DNI o NIE.
   node checkin-fiscal-empresa.test.js

   Como early-checkin-hora.test.js: NO copia el codigo de la pagina. Extrae las funciones
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
var ctx = {};
vm.runInNewContext(fnSource('validateCompanyId') + '\n' + fnSource('validateDni') + '\n' + fnSource('_fiscalIsCompanyRow'), ctx);
var vc = ctx.validateCompanyId, vd = ctx.validateDni, isCo = ctx._fiscalIsCompanyRow;

console.log('validateCompanyId: Espana');
ok('B70807052 (el CIF de Toni) es valido', vc('Spain', 'B70807052') === true);
ok('con espacios, guiones, puntos y minusculas', vc('Spain', ' b-7080.7052 ') === true);
ok('con el prefijo ES del NIF-IVA', vc('Spain', 'ESB70807052') === true);
ok('digito de control equivocado -> no valido', vc('Spain', 'B70807053') === false);
ok('letra inicial que no es de empresa -> no valido', vc('Spain', 'I70807052') === false);
ok('P exige letra de control (P1234567D si, P12345674 no)', vc('Spain', 'P1234567D') === true && vc('Spain', 'P12345674') === false);
ok('A exige cifra de control (A58818501 si, A5881850A no)', vc('Spain', 'A58818501') === true && vc('Spain', 'A5881850A') === false);
ok('un DNI de persona no pasa como empresa', vc('Spain', '12345678Z') === false);
ok('vacio -> no valido', vc('Spain', '') === false && vc('Spain', null) === false);

console.log('validateCompanyId: resto del mundo');
ok('Alemania DE123456789', vc('Germany', 'DE123456789') === true);
ok('Francia con espacios', vc('France', 'FR 12 345678901') === true);
ok('demasiado corto -> no valido', vc('Germany', 'DE12') === false);
ok('con simbolos -> no valido', vc('Italy', 'IT/123*456') === false);

console.log('validateDni: el modo persona no cambia');
ok('el CIF sigue sin pasar como documento de persona', vd('Spain', 'B70807052') === false);
ok('DNI valido', vd('Spain', '12345678Z') === true);
ok('NIE valido', vd('Spain', 'X1234567L') === true);
ok('DNI con letra equivocada', vd('Spain', '12345678A') === false);

console.log('_fiscalIsCompanyRow: que fila guardada es una empresa');
ok('nombre + documento, sin apellido -> empresa', isCo('MENORCA CLEANING SERVIS, SL', '', 'B70807052') === true);
ok('apellido null -> empresa', isCo('ACME GmbH', null, 'DE123456789') === true);
ok('con apellido -> persona', isCo('Ana', 'Pons', '12345678Z') === false);
ok('solo nombre, sin documento (dato importado) -> persona', isCo('Ana Pons', '', '') === false);
ok('fila vacia -> persona', isCo('', '', '') === false && isCo(null, undefined, null) === false);
ok('apellido de solo espacios cuenta como vacio', isCo('ACME SL', '   ', 'B70807052') === true);

console.log('la pagina usa las funciones');
ok('version v108 en la cabecera', /VERSIÓN ACTUAL: v108/.test(S.slice(0, 400)));
ok('el envio valida empresa o persona', S.indexOf("_isCo ? !validateCompanyId($('fCountry').value, $('fDni').value) : !validateDni(") > 0);
ok('una empresa se guarda sin apellido', S.indexOf('Fiscal_guest_surename:             _isCo?null:') > 0);
ok('el apellido no es obligatorio para una empresa', S.indexOf("required.filter(id=>!(_isCo&&id==='fLname')).filter(") > 0);
var langs = ['en', 'es', 'fr', 'de', 'it', 'nl', 'pt', 'ca'];
var keys = ['fiscal_type_lbl', 'fiscal_person', 'fiscal_company', 'fiscal_company_hint', 'lbl_company', 'lbl_company_country', 'lbl_company_id', 'ph_company_id', 'ph_company_locked', 'company_id_invalid'];
keys.forEach(function (k) {
  var n = S.split(k + ":'").length - 1;
  ok('texto ' + k + ' en los 8 idiomas', n === langs.length, 'veces: ' + n);
});

console.log('police-url v2: la policia sigue a nombre de una persona');
global.window = global;
require('./police-url.js');
var P = window.PoliceUrl;
function mk(f) { return function (k) { return f[k] !== undefined ? f[k] : ''; }; }
function param(url, name) { var m = url.match(new RegExp('[?&]' + name + '=([^&]*)')); return m ? decodeURIComponent(m[1]) : null; }
var base = { Link_Registrodepolicia: 'org-abc', Checkin: '2026-09-10', Checkout: '2026-09-17', Adults: '2', Children: '0', Guest_Full_Name: 'Ana', Guest_Surename: 'Pons' };
var r = P.build(mk(Object.assign({}, base, { Fiscal_guest_name: 'MENORCA CLEANING SERVIS, SL', Fiscal_guest_surename: '', Fiscal_guest_DNI_passport: 'B70807052' })), { code: 'X1' });
ok('empresa en los datos fiscales -> nombre de la reserva', r.firstName === 'Ana' && r.lastName === 'Pons', r.firstName + ' / ' + r.lastName);
ok('  ...y la razon social no va en el link', r.url.indexOf('CLEANING') < 0, r.url);
r = P.build(mk(Object.assign({}, base, { Fiscal_guest_name: 'Joan', Fiscal_guest_surename: 'Marti', Fiscal_guest_DNI_passport: '12345678Z' })), { code: 'X1' });
ok('persona en los datos fiscales -> sigue mandando el nombre fiscal', r.firstName === 'Joan' && r.lastName === 'Marti', r.firstName + ' / ' + r.lastName);
r = P.build(mk(base), { code: 'X1' });
ok('sin datos fiscales -> nombre de la reserva', r.firstName === 'Ana' && r.lastName === 'Pons');

console.log('\n' + pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
