/* Pruebas del universo de villas de Ocupacion (listado-ocupacion v30). Caso: Irene, grupo Nueva
   Intranet 06/10/2026: Villa Armonia y Finca Biniatzau, libres del 6 al 12 de octubre, no aparecian.
   node ocupacion-master-villas.test.js

   Como salida-hora-orden.test.js: NO copia el codigo de la pagina. Extrae la funcion real
   loadMasterVillas de listado-ocupacion.html y la ejecuta con un fetch simulado.
   Sin red, sin datos reales. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var S = fs.readFileSync('listado-ocupacion.html', 'utf8');
function fnSource(name) {
  var i = S.indexOf('async function ' + name + '(');
  if (i < 0) i = S.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = S.indexOf('{', i), depth = 0, k = j;
  for (; k < S.length; k++) { if (S[k] === '{') depth++; else if (S[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return S.slice(i, k);
}

console.log('version coherente en las tres marcas');
var ver = (S.match(/VERSIÓN ACTUAL: (v\d+)/) || [])[1];
ok('cabecera dice ' + ver, !!ver);
ok('PAGE_VERSION coincide', S.indexOf("const PAGE_VERSION='" + ver + "'") > 0);
ok('<title> coincide', S.indexOf('<title>Ocupación ' + ver + ' — 3Villas</title>') > 0);
ok('HISTORIAL empieza por ' + ver, S.indexOf('<!-- HISTORIAL: ' + ver + ' - ') > 0);

console.log('loadMasterVillas lee TaVillas, no la vista de reservas');
var src = fnSource('loadMasterVillas');
var code = src.replace(/\/\*[\s\S]*?\*\//g, ''); /* sin los comentarios: el HISTORIAL interno cita el fallo antiguo */
ok('consulta action=data&table=TaVillas', code.indexOf('action=data&table=TaVillas') > 0);
ok('filtra Status=1', code.indexOf("'Status=1'") > 0);
ok('ya no lee Vi_villas_and_bookings2021', code.indexOf('Vi_villas_and_bookings2021') < 0);
ok('ya no corta en limit=500', code.indexOf('limit=500') < 0);

console.log('loadMasterVillas con un fetch simulado');
var calls = [];
var rows = [
  { villaid: 356, Name: 'VILLA ARMONIA', Name_villa_para_inquilinos: 'VILLA ARMONIA', KeyHolder_person: '30QKOKC6', Status: 1 },
  { villaid: 450, Name: 'FINCA BINIATZAU', Name_villa_para_inquilinos: 'FINCA BINIATZAU', KeyHolder_person: '30QKOKC6', Status: 1 },
  { villaid: 999, Name: 'VILLA SIN NOMBRE INQUILINO', Name_villa_para_inquilinos: '', KeyHolder_person: ' ABCDEFGH ', Status: 1 },
  { villaid: '', Name: 'FILA SIN VILLAID', Name_villa_para_inquilinos: 'X', KeyHolder_person: 'Z', Status: 1 },
  { villaid: 356, Name: 'DUPLICADA', Name_villa_para_inquilinos: 'DUPLICADA', KeyHolder_person: 'Q', Status: 1 }
];
var ctx = {
  console: { warn: function () { calls.push('warn'); } },
  WORKER: 'https://www.3villas.com/intranet/api',
  Auth: { url: function (u) { return u + '&sessionToken=T'; } },
  masterVillas: new Map(),
  encodeURIComponent: encodeURIComponent,
  String: String,
  fetch: function (u) { calls.push(u); return Promise.resolve({ json: function () { return Promise.resolve({ Result: rows }); } }); }
};
vm.runInNewContext(src + '\nvar done = loadMasterVillas();', ctx);
ctx.done.then(function () {
  var u = String(calls[0] || '');
  ok('una sola llamada', calls.length === 1, String(calls.length));
  ok('la URL pide TaVillas con Status=1', u.indexOf('action=data&table=TaVillas&where=Status%3D1') > 0, u);
  ok('la URL lleva el token', u.indexOf('sessionToken=T') > 0);
  ok('Armonia entra aunque no tenga reserva', ctx.masterVillas.has('356'));
  ok('Biniatzau entra aunque no tenga reserva', ctx.masterVillas.has('450'));
  ok('manager = KeyHolder_person sin espacios', ctx.masterVillas.get('356').manager === '30QKOKC6' && ctx.masterVillas.get('999').manager === 'ABCDEFGH');
  ok('nombre = Name_villa_para_inquilinos', ctx.masterVillas.get('450').name === 'FINCA BINIATZAU');
  ok('sin nombre de inquilino cae a Name', ctx.masterVillas.get('999').name === 'VILLA SIN NOMBRE INQUILINO');
  ok('fila sin villaid se ignora', ctx.masterVillas.size === 3, String(ctx.masterVillas.size));
  ok('villaid repetido no pisa la primera', ctx.masterVillas.get('356').name === 'VILLA ARMONIA');
  ok('multiId vacio', ctx.masterVillas.get('356').multiId === '');
  console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
});
