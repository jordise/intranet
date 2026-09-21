/* Prueba de deriva: ficha-campos.js contra ficha-schema.json del Worker caspio-proxy.
   ficha-campos.js es un archivo GENERADO. Si alguien cambia el JSON (una columna nueva,
   otro paso, otro destino de TaVillas) y no lo regenera, las dos paginas de la ficha se
   separan del Worker en silencio. Esta prueba lo impide: compara columna a columna.
   node ficha-campos.test.js

   Como fotos-mismo-host.test.js: NO copia la lista. Ejecuta el archivo real en un vm y
   lee window.FICHA_CAMPOS. */
var fs = require('fs'), vm = require('vm'), path = require('path');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

var ARCHIVO = 'ficha-campos.js';
/* El Worker vive en el repo hermano 3villas. Si no esta, la prueba lo dice en vez de
   pasar en silencio: una prueba que no encuentra su fuente no prueba nada. */
var ESQUEMA = path.resolve(__dirname, '..', '..', '3villas', 'workers', 'caspio-proxy', 'ficha-schema.json');

var S = fs.readFileSync(ARCHIVO, 'utf8');

/* 1. Version y cabecera */
console.log(ARCHIVO + ': cabecera');
ok('marcador de version v01', /VERSIÓN ACTUAL: v01 \|/.test(S));
ok('dice que es un archivo generado y no se edita a mano', S.indexOf('ARCHIVO GENERADO') > 0);
ok('lleva el generador dentro para poder rehacerlo', S.indexOf('window.FICHA_CAMPOS = [\\n') > 0 || S.indexOf("var OUT = 'ficha-campos.js';") > 0);
ok('historial v01', /\/\/ HISTORIAL: v01 - /.test(S));
ok('el historial no lleva nombres de personas ajenas ni horas', !/\d{1,2}:\d{2}/.test(S.slice(S.indexOf('// HISTORIAL: v01'))));

/* 2. El archivo se ejecuta y publica la lista */
var ctx = {};
vm.createContext(ctx);
ctx.window = ctx;
vm.runInContext(S, ctx, { filename: ARCHIVO });
ok('publica window.FICHA_CAMPOS como lista', Object.prototype.toString.call(ctx.FICHA_CAMPOS) === '[object Array]');
ok('publica window.FICHA_SCHEMA_META', !!ctx.FICHA_SCHEMA_META);

/* 3. Contra el JSON, campo a campo */
console.log('ficha-schema.json: sin deriva');
if (!fs.existsSync(ESQUEMA)) {
  ok('encuentro ficha-schema.json en ' + ESQUEMA, false, 'no existe: regenere la ruta o clone el repo 3villas');
} else {
  var J = JSON.parse(fs.readFileSync(ESQUEMA, 'utf8'));
  ok('mismo numero de columnas (' + J.columns.length + ')', ctx.FICHA_CAMPOS.length === J.columns.length,
    ctx.FICHA_CAMPOS.length + ' vs ' + J.columns.length);
  ok('mismo orden de nombres', ctx.FICHA_CAMPOS.map(function (c) { return c.name; }).join(',') ===
    J.columns.map(function (c) { return c.name; }).join(','));

  var malos = [];
  J.columns.forEach(function (c, i) {
    var m = ctx.FICHA_CAMPOS[i] || {};
    ['name', 'type', 'step', 'label_es', 'maps_to', 'note'].forEach(function (k) {
      var esperado = (c[k] === undefined || c[k] === null) ? (k === 'step' ? c[k] : '') : c[k];
      if (m[k] !== esperado) malos.push(c.name + '.' + k + ': "' + m[k] + '" != "' + esperado + '"');
    });
  });
  ok('los seis datos de cada columna son identicos', malos.length === 0, malos.slice(0, 4).join(' | '));

  ok('la tabla, la version y la fecha del esquema viajan en FICHA_SCHEMA_META',
    ctx.FICHA_SCHEMA_META.table === J.table && ctx.FICHA_SCHEMA_META.version === J.version &&
    ctx.FICHA_SCHEMA_META.date === J.date,
    JSON.stringify(ctx.FICHA_SCHEMA_META));

  /* 4. Los tipos son los nombres reales de Caspio, no los guiones bajos */
  var tipos = {};
  ctx.FICHA_CAMPOS.forEach(function (c) { tipos[c.type] = (tipos[c.type] || 0) + 1; });
  ok('los tipos Si/No se llaman YES/NO', !!tipos['YES/NO'] && !tipos.YES_NO, Object.keys(tipos).join(','));
  ok('los tipos de fecha se llaman DATE/TIME', !!tipos['DATE/TIME'] && !tipos.DATE_TIME, Object.keys(tipos).join(','));
  ok('no queda ningun tipo con guion bajo', S.indexOf('YES_NO') < 0 && S.indexOf('DATE_TIME') < 0);

  /* 5. Los nueve pasos existen y el paso 0 son las columnas de sistema */
  var porPaso = {};
  ctx.FICHA_CAMPOS.forEach(function (c) { porPaso[c.step] = (porPaso[c.step] || 0) + 1; });
  ok('hay columnas de sistema en el paso 0', porPaso[0] > 0);
  ok('existen los nueve pasos del formulario', [1, 2, 3, 4, 5, 6, 7, 8, 9].every(function (p) { return porPaso[p] > 0; }),
    JSON.stringify(porPaso));
  ok('ficha_id es AUTONUMBER y del paso 0',
    ctx.FICHA_CAMPOS[0].name === 'ficha_id' && ctx.FICHA_CAMPOS[0].type === 'AUTONUMBER' && ctx.FICHA_CAMPOS[0].step === 0);
  ok('villaid solo aparece como columna de sistema (paso 0)',
    ctx.FICHA_CAMPOS.filter(function (c) { return c.name === 'villaid'; }).every(function (c) { return c.step === 0; }));
}

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
