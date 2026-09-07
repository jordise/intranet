/* Pruebas de la unidad (apartamento) dentro de una villa — Mia, viaje 4.
   node mia-j4.test.js  [ruta del volcado TaMultiunits.records.json]

   Como marcas-manuales.test.js: NO copia el codigo del modulo. Saca el texto
   real de las funciones de mia-intranet.js y lo ejecuta. Si alguien cambia el
   emparejador, estas pruebas corren el codigo NUEVO.

   El volcado del 2026-09-01 vive fuera del repo (3villas_protected) porque
   lleva datos de la empresa. Si no esta, las pruebas de datos se omiten y el
   resto sigue corriendo. Aqui NO se imprime ningun dato: solo etiquetas de
   unidad y cuentas. Keybox no se lee nunca. */
var fs = require('fs');
var pass = 0, fail = 0, skip = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
function omit(n) { skip++; console.log('  SKIP  ' + n); }

var FILE = 'mia-intranet.js';
var DUMP = process.argv[2] || '/Users/g0m/Desktop/Projects/3villas/3villas_protected/backups/caspio-2026-09-01/TaMultiunits.records.json';
var src = fs.readFileSync(FILE, 'utf8');

function fnSource(name) {
  var i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name + ' en ' + FILE);
  var j = src.indexOf('{', i), depth = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) { k++; break; } }
  }
  return src.slice(i, k);
}
function grab(re) { var m = src.match(re); if (!m) throw new Error('no encuentro ' + re); return m[0]; }

/* El codigo real, tal cual esta en el modulo. */
eval([
  fnSource('fold'), fnSource('unitRow'), fnSource('unitKey'), fnSource('unitLabel'),
  fnSource('unitKeys'), fnSource('matchUnits'),
  grab(/const SENSITIVE=\/[^\n]*\/i;/), fnSource('stripSensitive')
].join('\n'));

/* ── 1. El interruptor y los textos estan puestos ── */
ok('mu solo se emite con FEAT.unit y con unidad', src.indexOf('if(FEAT.unit && t.unit){') > 0);
ok('mu va atado al id de la villa', /p\.mu=String\(t\.unitId\);/.test(src) && /t\.unitId && t\.villa && isId\(t\.villaId\)/.test(src));
ok('el chip de la villa dice Villa — Unidad', /chips\.villa=t\.villa\+' — '\+uLbl;/.test(src));
ok('CHIP_LABELS tiene unit', /unit:'Unidad'/.test(src));
ok('la unidad sin aplicar se dice', /no\.push\('unidad "'\+t\.unit\+'"'\)/.test(src));
ok('loadUnits pide TaMultiunits con el mismo proxy', src.indexOf("proxyGet('action=data&table=TaMultiunits&limit=500')") > 0);

/* ── 2. Nada sensible se guarda ── */
ok('stripSensitive borra Keybox', Object.keys(stripSensitive([{ Keybox: 'x', nombre_completo: 'y' }])[0]).indexOf('Keybox') < 0);
ok('stripSensitive borra Keybox!', Object.keys(stripSensitive([{ 'Keybox!': 'x' }])[0]).length === 0);
ok('loadUnits no nombra Keybox', fnSource('loadUnits').indexOf('Keybox') < 0 && fnSource('unitRow').indexOf('Keybox') < 0);

/* ── 3. El emparejador contra el volcado real ── */
/* Dos etiquetas por cada una de las nueve villas de varias unidades. */
var CASOS = [
  ['299', ['11', '13']],
  ['358', ['4', '10']],
  ['359', ['1', '6']],
  ['381', ['13', '13A']],
  ['396', ['Apto 4', 'Apto B']],
  ['420', ['1 A', '9 A']],
  ['421', ['10 B', '19 B']],
  ['422', ['20', '29']],
  ['423', ['3', '10']]
];
/* Variantes escritas a mano: espacios de mas, mayusculas, sin espacio. */
var VARIANTES = [
  ['381', '13 a', '13A'],
  ['381', '13  A', '13A'],
  ['420', '1a', '1 A'],
  ['421', '10b', '10 B'],
  ['396', 'apto4', 'Apto 4'],
  ['396', 'APTO B', 'Apto B']
];

if (!fs.existsSync(DUMP)) {
  omit('volcado TaMultiunits no disponible: pruebas de datos omitidas');
} else {
  var raw = JSON.parse(fs.readFileSync(DUMP, 'utf8'));
  var filas = Array.isArray(raw) ? raw : (raw.Result || raw.result || raw.records || []);
  var unidades = stripSensitive(filas).map(unitRow).filter(function (u) { return u.id && u.villaId && (u.name || u.short); });
  var porVilla = {};
  unidades.forEach(function (u) { (porVilla[u.villaId] = porVilla[u.villaId] || []).push(u); });

  ok('el volcado trae 67 unidades en 9 villas', unidades.length === 67 && Object.keys(porVilla).length === 9,
    unidades.length + ' unidades / ' + Object.keys(porVilla).length + ' villas');

  /* Los objetos que quedan en memoria: cinco claves y ninguna sensible. */
  var claves = {};
  unidades.forEach(function (u) { Object.keys(u).forEach(function (k) { claves[k] = 1; }); });
  ok('la unidad en memoria solo tiene id, villaId, name, short, alt',
    Object.keys(claves).sort().join(',') === 'alt,id,name,short,villaId', Object.keys(claves).sort().join(','));
  ok('ninguna unidad en memoria tiene Keybox', unidades.filter(function (u) { return ('Keybox' in u) || ('Keybox!' in u); }).length === 0);

  CASOS.forEach(function (c) {
    var lista = porVilla[c[0]] || [];
    ok('villa con ' + lista.length + ' unidades: hay unidades que probar', lista.length > 1);
    c[1].forEach(function (et) {
      var h = matchUnits(lista, et);
      ok('"' + et + '" encuentra una sola unidad: ' + (h.length === 1 ? unitLabel(h[0]) : '(' + h.length + ')'),
        h.length === 1 && !!h[0].id);
    });
  });

  VARIANTES.forEach(function (v) {
    var lista = porVilla[v[0]] || [];
    var h = matchUnits(lista, v[1]);
    ok('"' + v[1] + '" es la unidad ' + v[2],
      h.length === 1 && unitLabel(h[0]) === v[2], h.length + ' resultados');
  });

  /* Lo exacto manda: "13" no puede traer tambien el 13A. */
  var l381 = porVilla['381'] || [];
  var h13 = matchUnits(l381, '13'), h13a = matchUnits(l381, '13A');
  ok('"13" y "13A" son unidades distintas',
    h13.length === 1 && h13a.length === 1 && h13[0].id !== h13a[0].id);

  /* Cero unidades: quien llama lo manda a "No pude aplicar". */
  ok('una etiqueta inventada no encuentra nada', matchUnits(l381, 'apto 99').length === 0);
  /* Sin palabras no hay unidad. */
  ok('sin palabras no hay unidad', matchUnits(l381, '   ').length === 0);
  /* Varias: el nombre de listing lo llevan todas las unidades de la villa. */
  var l396 = porVilla['396'] || [];
  ok('el nombre del listing trae varias unidades: ' + matchUnits(l396, 'Voramar').length + ' de ' + l396.length,
    matchUnits(l396, 'Voramar').length > 1);
}

console.log('\n' + pass + ' pass, ' + fail + ' fail' + (skip ? ', ' + skip + ' skip' : '') + '\n');
process.exit(fail ? 1 : 0);
