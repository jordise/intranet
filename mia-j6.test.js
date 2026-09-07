/* Pruebas de las tareas con incidencia de Mia (viaje 6, 07/09/2026).
   node mia-j6.test.js  [ruta del volcado TaTasks.records.json]

   Como marcas-manuales.test.js y yacan-texto.test.js: NO copia el código del
   módulo. Extrae el texto real de cada función de mia-intranet.js y lo ejecuta,
   así que si alguien edita el módulo estas pruebas corren el código NUEVO.

   Trabaja sin red, contra el volcado del 2026-09-01. SOLO imprime cuentas y
   nombres de prueba: ni un texto de incidencia, ni un nombre de inquilino, ni
   una URL de foto salen por pantalla. */
var fs = require('fs'), vm = require('vm'), path = require('path');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c === true) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : (c !== false ? '  -> ' + c : ''))); } }

var MOD = path.join(__dirname, 'mia-intranet.js');
var DUMP = process.argv[2] ||
  '/Users/g0m/Desktop/Projects/3villas/3villas_protected/backups/caspio-2026-09-01/TaTasks.records.json';

function src(f) { return fs.readFileSync(f, 'utf8'); }
/* Extrae desde una marca hasta que se cierran las llaves que abre. Vale para
   "function x(" y para "const X = {". */
function blockFrom(s, mark) {
  var i = s.indexOf(mark);
  if (i < 0) throw new Error('no encuentro ' + mark);
  var j = s.indexOf('{', i), depth = 0, k = j;
  for (; k < s.length; k++) {
    if (s[k] === '{') depth++;
    else if (s[k] === '}') { depth--; if (depth === 0) { k++; break; } }
  }
  return s.slice(i, k) + ';';
}
function fnSource(s, name) { return blockFrom(s, 'function ' + name + '('); }
/* Una declaración de una sola línea: const INC_MAX = 30; */
function constLine(s, name) {
  var re = new RegExp('^const ' + name + '\\s*=[^\\n]*$', 'm'), m = s.match(re);
  if (!m) throw new Error('no encuentro const ' + name);
  return m[0];
}

/* ── Un DOM mínimo: solo lo que tocan E(), btn() y incidentRow(). ── */
function makeEnv() {
  function El(tag) { this.tag = tag; this.className = ''; this.children = []; this._t = ''; this.attrs = {}; }
  Object.defineProperty(El.prototype, 'textContent', {
    get: function () { return this._t; },
    set: function (v) { this._t = String(v); }
  });
  El.prototype.appendChild = function (c) { this.children.push(c); return c; };
  El.prototype.setAttribute = function (k, v) { this.attrs[k] = String(v); };
  return { document: { createElement: function (t) { return new El(t); } } };
}
/* Todo lo que el nodo llevaría a la pantalla: textos Y valores de atributos. */
function flat(el) {
  var out = [el._t];
  Object.keys(el.attrs).forEach(function (k) { out.push(el.attrs[k]); });
  el.children.forEach(function (c) { out.push(flat(c)); });
  return out.join(' | ');
}

var s = src(MOD);
var code = [
  constLine(s, 'INC_MAX'), constLine(s, 'INC_FETCH'), constLine(s, 'INC_SCAN'),
  constLine(s, 'INC_DAYS'), constLine(s, 'INC_TEXT'), constLine(s, 'EMPTY'),
  blockFrom(s, 'const PAGES = {'), blockFrom(s, 'const T = {'),
  fnSource(s, 'E'), fnSource(s, 'sq'), fnSource(s, 'isDate'), fnSource(s, 'isId'),
  fnSource(s, 'isOk'), fnSource(s, 'dOnly'), fnSource(s, 'fmtDate'), fnSource(s, 'own'),
  fnSource(s, 'link'), fnSource(s, 'btn'),
  fnSource(s, 'incText'), fnSource(s, 'incPhotos'), fnSource(s, 'incPhotoText'),
  fnSource(s, 'incidentsWhere'), fnSource(s, 'incidentsPick'), fnSource(s, 'incidentRow'),
  /* userName vive en el mapa de usuarios de la página; aquí se sustituye por
     un mapa de prueba: no hay red y no hace falta el mapa real. */
  'function userName(id){ return (USERS_TEST && USERS_TEST[String(id||"").trim()]) || ""; }',
  'var API={E:E,link:link,incText:incText,incPhotos:incPhotos,incPhotoText:incPhotoText,'
  + 'incidentsWhere:incidentsWhere,incidentsPick:incidentsPick,incidentRow:incidentRow,INC_TEXT:INC_TEXT,INC_MAX:INC_MAX,T:T};'
].join('\n');

var env = makeEnv();
env.USERS_TEST = { V25EJV4G: 'Nombre De Prueba' };
vm.createContext(env);
new vm.Script(code, { filename: 'mia-intranet.js#j6' }).runInContext(env);
var M = env.API;

console.log('mia-intranet.js — viaje 6 (tareas con incidencia)');

/* ── 1. El WHERE de una entrada fija ── */
(function () {
  var t = { villa: 'VILLA DE PRUEBA', villaId: '123', from: '2026-08-18', to: '2026-09-01' };
  var esperado = "Incidencias=1 AND villaid=123"
    + " AND Data_to_be_done_fixed>='2026-08-18T00:00:00'"
    + " AND Data_to_be_done_fixed<='2026-09-01T23:59:59'"
    + " AND (UserID_responsible_alfanum='V25EJV4G' OR UserID_asigned_alfanum='V25EJV4G')";
  var got = M.incidentsWhere(t, 'V25EJV4G', true);
  ok('WHERE con marca, villa, fechas y usuario', got === esperado, got);

  var sinMarca = "villaid=123 AND Data_to_be_done_fixed>='2026-08-18T00:00:00'"
    + " AND Data_to_be_done_fixed<='2026-09-01T23:59:59'";
  ok('WHERE del plan B: sin la marca Sí/No', M.incidentsWhere(t, '', false) === sinMarca,
    M.incidentsWhere(t, '', false));

  ok('sin villa, sin fechas y sin usuario solo queda la marca',
    M.incidentsWhere({}, '', true) === 'Incidencias=1', M.incidentsWhere({}, '', true));
  ok('un villaId que no es un número no entra en el WHERE',
    M.incidentsWhere({ villa: 'x', villaId: "1 OR 1=1" }, '', true) === 'Incidencias=1');
  ok('sin nombre de villa el id no filtra (chip quitado)',
    M.incidentsWhere({ villaId: '123' }, '', true) === 'Incidencias=1');
  ok('una fecha que no es una fecha no entra en el WHERE',
    M.incidentsWhere({ from: "2026-08-18' OR '1'='1" }, '', true) === 'Incidencias=1');
  ok('la comilla de un id de usuario se dobla',
    M.incidentsWhere({}, "O'HARA", true).indexOf("''") > 0);
})();

/* ── 2. Contra el volcado ── */
if (!fs.existsSync(DUMP)) {
  console.log('  SALTADO  no encuentro el volcado (pasa la ruta como primer argumento)');
} else {
  var rows = JSON.parse(src(DUMP));
  console.log('  filas del volcado: ' + rows.length);

  var fecha = function (r) { return String(r.Data_to_be_done_fixed || '').slice(0, 10); };
  var marcada = function (r) { return r.Incidencias === true; };
  var ventana = function (de, a) { return rows.filter(function (r) { return fecha(r) >= de && fecha(r) <= a; }); };

  /* La ventana del enunciado: los 14 días hasta el día del volcado. */
  var A = ventana('2026-08-18', '2026-09-01');
  var refA = A.filter(marcada).length;
  console.log('  tareas del 2026-08-18 al 2026-09-01: ' + A.length + ', con incidencia: ' + refA);
  ok('incidentsPick da las mismas de la ventana 2026-08-18..2026-09-01 (' + refA + ')',
    M.incidentsPick(A).length === refA, String(M.incidentsPick(A).length));

  /* Los 14 días anteriores, donde el volcado sí tiene incidencias: sin filas
     las pruebas de la fila serían palabras. */
  var B = ventana('2026-08-03', '2026-08-17');
  var refB = B.filter(marcada).length;
  console.log('  tareas del 2026-08-03 al 2026-08-17: ' + B.length + ', con incidencia: ' + refB);
  var pickB = M.incidentsPick(B);
  ok('incidentsPick da las mismas de la ventana 2026-08-03..2026-08-17 (' + refB + ')',
    pickB.length === refB, String(pickB.length));
  ok('ninguna tarea sin marca se cuela',
    pickB.every(marcada) === true);
  ok('la lista va de la más reciente a la más antigua',
    pickB.every(function (r, i) { return i === 0 || fecha(pickB[i - 1]) >= fecha(r); }) === true);

  /* Todas las tareas con incidencia del volcado, para que las pruebas de la
     fila pasen por los 599 registros y no por tres. */
  var todas = rows.filter(marcada);
  var todasPick = M.incidentsPick(rows);
  console.log('  tareas con incidencia en todo el volcado: ' + todas.length);
  ok('incidentsPick sobre el volcado entero da las ' + todas.length,
    todasPick.length === todas.length, String(todasPick.length));

  var names = { '123': 'Villa De Prueba' };
  var conFoto = 0, sinFoto = 0, conUrl = 0, sinCuenta = 0, sinEnlace = 0, largo = 0;
  var frases = [M.T.incNoPhoto, M.T.incPhoto, M.T.incPhotos];
  todasPick.forEach(function (r) {
    if (M.incText(r).length > M.INC_TEXT) largo++;
    var el = M.incidentRow(r, names);
    var txt = flat(el);
    /* Ni una URL: ni http(s), ni el valor de ningún campo de foto. */
    var urls = Object.keys(r).filter(function (k) { return /^Pictures?_/.test(k) && String(r[k] || '').trim(); })
      .map(function (k) { return String(r[k]).trim(); });
    if (/https?:/i.test(txt) || urls.some(function (u) { return txt.indexOf(u) >= 0; })) conUrl++;
    /* Toda fila dice cuántas fotos hay. */
    if (!frases.some(function (f) { return txt.indexOf(f) >= 0; })) sinCuenta++;
    if (M.incPhotos(r) > 0) conFoto++; else sinFoto++;
    if (txt.indexOf('tareas.html?tid=' + r.taskid) < 0) sinEnlace++;
  });
  console.log('  filas pintadas: ' + todasPick.length + ', con foto: ' + conFoto + ', sin fotos: ' + sinFoto);
  ok('se pinta una fila por tarea con incidencia',
    todasPick.length === todas.length);
  ok('ninguna fila lleva una URL de foto', conUrl === 0, conUrl + ' filas con URL');
  ok('todas las filas dicen la cuenta de fotos', sinCuenta === 0, sinCuenta + ' filas sin cuenta');
  ok('todas las filas enlazan a su tarea (tid)', sinEnlace === 0, sinEnlace + ' filas sin enlace');
  ok('ningún texto de incidencia pasa de ' + M.INC_TEXT + ' caracteres', largo === 0, largo + ' textos largos');

  /* La cuenta de fotos es la de los campos Picture_ y Pictures_, ni uno más. */
  var pic = function (r) {
    return Object.keys(r).filter(function (k) { return /^Pictures?_/.test(k) && String(r[k] || '').trim(); }).length;
  };
  ok('la cuenta de fotos cuadra con los campos del registro',
    todasPick.every(function (r) { return M.incPhotos(r) === pic(r); }) === true);
  ok('el texto de la cuenta usa singular y plural',
    M.incPhotoText(0) === M.T.incNoPhoto && M.incPhotoText(1) === M.T.incPhoto
    && M.incPhotoText(3) === '3 ' + M.T.incPhotos);

  /* El campo Incidencias es Sí/No: su valor no se pinta nunca. */
  ok('el valor del campo Incidencias no se pinta',
    todasPick.slice(0, 200).every(function (r) {
      var txt = flat(M.incidentRow(r, names));
      return txt.indexOf('true') < 0 && txt.indexOf('Incidencias') < 0;
    }) === true);
}

console.log('');
console.log('PASS ' + pass + '  FAIL ' + fail);
process.exit(fail ? 1 : 0);
