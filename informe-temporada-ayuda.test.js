/* Pruebas de informe-temporada-ayuda.js (los ejemplos de Bueno / Regular / Malo del formulario v5, 29/10/2026).
   node informe-temporada-ayuda.test.js
   Las 26 claves de InformeScore.elementosDef() y ni una más, tres líneas no vacías por elemento, ninguna de más de
   120 caracteres, sin repetidas, y la caja "?" de Ayuda.html(clave). Sin red. */
var fs = require('fs'), vm = require('vm');
var P = 'informe-temporada-ayuda.js';
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
function J(x) { return JSON.stringify(x); }
function fin() { console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exitCode = fail ? 1 : 0; }

var A = null;
try { A = require('./' + P); } catch (e) { ok('se carga ' + P, false, e.message); fin(); return; }
ok('se carga ' + P + ' con require', !!A && typeof A === 'object');
ok('expone ejemplos (objeto)', !!A && !!A.ejemplos && typeof A.ejemplos === 'object');
['html', 'lineas', 'claves'].forEach(function (n) { ok('expone ' + n, !!A && typeof A[n] === 'function'); });
if (fail) { fin(); return; }

var S = require('./informe-temporada-score.js');
var CLAVES = S.elementosDef().map(function (e) { return e.clave; });
var MARCAS = ['bueno', 'regular', 'malo'];

console.log('1. Las 26 claves del formulario, en el mismo orden');
var K = Object.keys(A.ejemplos);
ok('hay 26 elementos en elementosDef (base de la prueba)', CLAVES.length === 26, CLAVES.length);
ok('ejemplos tiene 26 claves', K.length === 26, K.length);
ok('las claves de ejemplos = las de InformeScore.elementosDef(), mismo orden', J(K) === J(CLAVES), J(K.filter(function (k) { return CLAVES.indexOf(k) < 0; })) + ' / faltan ' + J(CLAVES.filter(function (k) { return K.indexOf(k) < 0; })));
ok('claves() devuelve las mismas 26 claves', J(A.claves()) === J(CLAVES));

console.log('2. Tres líneas por elemento, no vacías, de 120 caracteres o menos');
var vacias = [], largas = [], forma = [], todas = [];
CLAVES.forEach(function (k) {
  var e = A.ejemplos[k];
  if (!e || J(Object.keys(e).sort()) !== J(MARCAS.slice().sort())) { forma.push(k); return; }
  MARCAS.forEach(function (m) {
    var t = e[m];
    if (typeof t !== 'string' || !t.trim()) vacias.push(k + '.' + m);
    else { if (t.length > 120) largas.push(k + '.' + m + ' (' + t.length + ')'); todas.push(t.trim().toLowerCase()); }
  });
});
ok('cada elemento tiene exactamente {bueno, regular, malo}', forma.length === 0, J(forma));
ok('ninguna línea vacía', vacias.length === 0, J(vacias));
ok('ninguna línea de más de 120 caracteres', largas.length === 0, J(largas));
ok('78 líneas en total', todas.length === 78, todas.length);
var rep = todas.filter(function (t, i) { return todas.indexOf(t) !== i; });
ok('ninguna línea repetida', rep.length === 0, J(rep));
var sinMayus = [], conPunto = [], espacios = [];
CLAVES.forEach(function (k) { MARCAS.forEach(function (m) {
  var t = (A.ejemplos[k] || {})[m] || '';
  if (t && t.charAt(0) !== t.charAt(0).toUpperCase()) sinMayus.push(k + '.' + m);
  if (/\.$/.test(t)) conPunto.push(k + '.' + m);
  if (t !== t.trim() || /\s{2}|[\n\r\t]/.test(t)) espacios.push(k + '.' + m);
}); });
ok('cada línea empieza en mayúscula', sinMayus.length === 0, J(sinMayus));
ok('ninguna línea acaba en punto (una línea, no un párrafo)', conPunto.length === 0, J(conPunto));
ok('sin espacios de más, saltos ni tabuladores', espacios.length === 0, J(espacios));
ok('ninguna línea lleva < > ni comillas dobles (texto llano)', todas.every(function (t) { return !/[<>"]/.test(t); }));
ok('el ejemplo de Gary: Colchones Malo habla de muelles y de cambiar', /muelles/i.test(A.ejemplos.colchones.malo) && /cambiar/i.test(A.ejemplos.colchones.malo), A.ejemplos.colchones.malo);
ok('los datos no se pueden cambiar desde fuera (congelados)', Object.isFrozen(A.ejemplos) && Object.isFrozen(A.ejemplos.pintura));

console.log('3. lineas(clave)');
var L = A.lineas('colchones');
ok('lineas(colchones) = tres líneas Bueno / Regular / Malo con su texto', J(L.map(function (x) { return x.marca; })) === J(['Bueno', 'Regular', 'Malo'])
  && L[0].texto === A.ejemplos.colchones.bueno && L[1].texto === A.ejemplos.colchones.regular && L[2].texto === A.ejemplos.colchones.malo, J(L));
ok('lineas(clave desconocida) = []', J(A.lineas('no_existe')) === '[]');
ok('lineas(null) = []', J(A.lineas(null)) === '[]');
ok('lineas("toString") = [] (sin heredados del prototipo)', J(A.lineas('toString')) === '[]');

console.log('4. html(clave): la caja "?"');
var h = A.html('piscina');
ok('html es texto', typeof h === 'string' && h.length > 0);
ok('empieza con <details class="ayuda" data-clave="piscina">', h.indexOf('<details class="ayuda" data-clave="piscina">') === 0, h.slice(0, 80));
ok('acaba con </details>', /<\/details>$/.test(h));
ok('el botón es un <summary> con "?" y una etiqueta para lectores de pantalla', /<summary class="ayuda-q"[^>]*aria-label="Ejemplos de Bueno, Regular y Malo"[^>]*>\?<\/summary>/.test(h), h.slice(0, 200));
ok('lleva las tres marcas en orden Bueno, Regular, Malo', h.indexOf('Bueno:') > 0 && h.indexOf('Bueno:') < h.indexOf('Regular:') && h.indexOf('Regular:') < h.indexOf('Malo:'));
ok('cada marca con su clase (ayuda-bueno / ayuda-regular / ayuda-malo)', /class="ayuda-bueno"/.test(h) && /class="ayuda-regular"/.test(h) && /class="ayuda-malo"/.test(h));
ok('lleva el texto de las tres líneas de piscina', MARCAS.every(function (m) { return h.indexOf(A.ejemplos.piscina[m]) >= 0; }));
ok('html(clave desconocida) = ""', A.html('no_existe') === '');
ok('html(undefined) = ""', A.html() === '');
ok('html escapa & en el texto (Bueno / Regular / Malo de cualquier elemento)', CLAVES.every(function (k) {
  var x = A.html(k); return MARCAS.every(function (m) { var t = A.ejemplos[k][m]; return x.indexOf(t.replace(/&/g, '&amp;')) >= 0; });
}));
var cuenta = CLAVES.filter(function (k) { var x = A.html(k); return (x.match(/<li /g) || []).length === 3; }).length;
ok('las 26 cajas tienen tres <li>', cuenta === 26, cuenta);
var abre = (h.match(/<(details|summary|ul|li|b)\b/g) || []).length, cierra = (h.match(/<\/(details|summary|ul|li|b)>/g) || []).length;
ok('etiquetas abiertas = cerradas', abre === cierra, abre + ' / ' + cierra);

console.log('5. En el navegador: window.Ayuda, sin require ni red');
var ctx = { window: {} }; vm.createContext(ctx);
try { vm.runInContext(fs.readFileSync(P, 'utf8'), ctx); } catch (e) { ok('se ejecuta en un contexto sin module', false, e.message); }
ok('define window.Ayuda con las 26 claves', !!ctx.window.Ayuda && Object.keys(ctx.window.Ayuda.ejemplos).length === 26);
ok('window.Ayuda.html funciona', !!ctx.window.Ayuda && ctx.window.Ayuda.html('wifi_tv').indexOf('data-clave="wifi_tv"') > 0);
var src = fs.readFileSync(P, 'utf8');
ok('sin red: ni fetch ni XMLHttpRequest ni import', !/\bfetch\s*\(|XMLHttpRequest|^\s*import\s/m.test(src));

fin();
