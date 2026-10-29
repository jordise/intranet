/* Pruebas de cuadro-informes-temporada-extras.js (cuadro de informes de temporada v3a, carril E, 29/10/2026):
   comparación con la temporada anterior, lectura de la temporada anterior con caché por año, galería de fotos
   con su capa (Esc cierra), cabecera de impresión y la hoja cuadro-informes-temporada-extras.css (móvil e impresión).
   node cuadro-informes-temporada-extras.test.js
   Carga el script REAL con vm en un contexto con window y un document mínimo. InformeScore (carril A) se sustituye
   por un doble que cumple el contrato de LANES-JOB1.md; si informe-temporada-score.js ya está en la carpeta,
   la parte 9 repite la comparación con el de verdad. Sin red. */
var fs = require('fs'), vm = require('vm');
var P = 'cuadro-informes-temporada-extras.js', CSS = 'cuadro-informes-temporada-extras.css';
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
function fin() { console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(fail ? 1 : 0); }
function J(x) { return JSON.stringify(x); }
function safe(f) { try { return f(); } catch (e) { return e; } }
/* Un Error de otro contexto de vm no es instanceof Error de aquí: se mira su etiqueta */
function esError(e) { return Object.prototype.toString.call(e) === '[object Error]'; }
function cuenta(s, sub) { return String(s).split(sub).length - 1; }
function fnSource(s, name) {
  var i = s.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = s.indexOf('{', i), depth = 0, k = j;
  for (; k < s.length; k++) { if (s[k] === '{') depth++; else if (s[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return s.slice(i, k);
}

var SRC = '';
try { SRC = fs.readFileSync(P, 'utf8'); } catch (e) { ok('existe ' + P, false, e.message); fin(); }

/* Los 26 elementos de verdad: elementosDef() de la página v2 (las mismas claves y palabras que el formulario) */
var ectx = {};
vm.runInNewContext(fnSource(fs.readFileSync('cuadro-informes-temporada.html', 'utf8'), 'elementosDef'), ectx);
var ELEMENTOS = ectx.elementosDef();
var SECC = {}; ELEMENTOS.forEach(function (e) { SECC[e.clave] = e.seccion; });

/* Doble de InformeScore con la forma del contrato: comparar(lineasA, lineasB) sobre las claves evaluadas en las dos */
var LLAMADAS = [];
function marcasDe(lineas) {
  var m = {};
  (lineas || []).forEach(function (l) {
    if (!l || !SECC[l.clave] || SECC[l.clave] !== l.seccion) return;
    var e = String(l.estado || '').trim().toLowerCase();
    if (e === 'bueno' || e === 'regular' || e === 'malo') m[l.clave] = e;
  });
  return m;
}
function punt(m, claves) {
  if (!claves.length) return null;
  var p = 0; claves.forEach(function (k) { p += m[k] === 'bueno' ? 2 : m[k] === 'regular' ? 1 : 0; });
  return Math.round(1000 * p / (2 * claves.length)) / 10;
}
var DOBLE = {
  elementosDef: function () { return ELEMENTOS; },
  comparar: function (a, b) {
    LLAMADAS.push([a, b]);
    var ma = marcasDe(a), mb = marcasDe(b);
    var com = ELEMENTOS.map(function (e) { return e.clave; }).filter(function (k) { return ma[k] && mb[k]; });
    return {
      n: com.length, puntuacionA: punt(ma, com), puntuacionB: punt(mb, com),
      cambios: com.filter(function (k) { return ma[k] !== mb[k]; }).map(function (k) { return { clave: k, de: ma[k], a: mb[k] }; }),
      repetidos: com.filter(function (k) { return ma[k] !== 'bueno' && mb[k] !== 'bueno'; })
    };
  }
};

/* document mínimo: createElement, appendChild, eventos, foco */
function Nodo(tag, doc) {
  var n = { tagName: String(tag).toUpperCase(), children: [], attrs: {}, listeners: {}, hidden: false, className: '', textContent: '', src: '', alt: '', type: '', parentNode: null, _doc: doc };
  n.setAttribute = function (k, v) { n.attrs[k] = String(v); };
  n.getAttribute = function (k) { return Object.prototype.hasOwnProperty.call(n.attrs, k) ? n.attrs[k] : null; };
  n.appendChild = function (c) { c.parentNode = n; n.children.push(c); doc.anadidos.push(c); return c; };
  n.addEventListener = function (t, f) { (n.listeners[t] = n.listeners[t] || []).push(f); };
  n.focus = function () { doc.activeElement = n; doc.focos.push(n); };
  n.contains = function (x) { while (x) { if (x === n) return true; x = x.parentNode; } return false; };
  return n;
}
function Doc() {
  var d = { anadidos: [], focos: [], listeners: {}, activeElement: null };
  d.createElement = function (t) { return Nodo(t, d); };
  d.body = Nodo('body', d);
  d.activeElement = d.body;
  d.addEventListener = function (t, f) { (d.listeners[t] = d.listeners[t] || []).push(f); };
  d.tecla = function (key, target) {
    var e = { key: key, target: target || d.body, defaultPrevented: false, parado: false, preventDefault: function () { e.defaultPrevented = true; }, stopPropagation: function () { e.parado = true; } };
    (d.listeners.keydown || []).forEach(function (f) { f(e); });
    return e;
  };
  return d;
}
function cargar(conDoc) {
  var sb = { console: console, setTimeout: setTimeout, Promise: Promise };
  sb.window = sb;
  sb.InformeScore = DOBLE;
  if (conDoc) sb.document = Doc();
  vm.runInNewContext(SRC, sb, { filename: P });
  return sb;
}

/* Fixtures: líneas como las de TaInformeTemporadaLineas */
var ID = 0;
function L(inf, seccion, clave, campos) { var l = { linea_id: ++ID, informe_id: inf, seccion: seccion, clave: clave, estado: '', texto_1: '', texto_2: '', prioridad: '', foto_url: '' }; for (var k in campos) l[k] = campos[k]; return l; }
function marcas(inf, m) { return Object.keys(m).map(function (k) { return L(inf, SECC[k], k, { estado: m[k] }); }); }
function todas(inf, marca, excepto) { var m = {}; ELEMENTOS.forEach(function (e) { m[e.clave] = marca; }); for (var k in (excepto || {})) { if (excepto[k] == null) delete m[k]; else m[k] = excepto[k]; } return marcas(inf, m); }
function casa(o) {
  var c = { villaid: 7, villa: 'Villa Galerna', vm: 'Rafa', vmId: 'c:12', informe_id: 10, estado: 'enviado', general: 'bueno', fecha: '20/10/2026', updated: '', lineas: [], url: 'informe-temporada.html?villaid=7&temporada=2026' };
  for (var k in o) c[k] = o[k]; return c;
}

(async function () {
  console.log('1. El script: un objeto global, sin módulos');
  var sb = safe(function () { return cargar(true); });
  ok('compila y corre en un contexto con window', sb && !(sb instanceof Error), sb && sb.message);
  var X = sb && sb.window && sb.window.Extras;
  ok('define window.Extras', !!X);
  if (!X) fin();
  ['cargarTemporadaPrevia', 'temporadaPrevia', 'casaPreviaDe', 'comparacionHtml', 'fotosDe', 'galeriaHtml', 'overlayAbrir', 'overlayCerrar', 'overlayAbierto', 'printHeader'].forEach(function (n) {
    ok('Extras.' + n + ' es una función', typeof X[n] === 'function');
  });
  var req = safe(function () { delete require.cache[require.resolve('./' + P)]; return require('./' + P); });
  ok('bajo node, module.exports es el mismo objeto Extras (como arnes-informe.js)', req && typeof req.comparacionHtml === 'function' && typeof req.galeriaHtml === 'function', req && req.message);
  ok('no usa import, export, require ni fetch', !/\bimport\s|\bexport\s|\brequire\(|\bfetch\(/.test(SRC));

  console.log('2. Temporada anterior: se lee una vez por año y se guarda');
  var X2 = cargar(false).window.Extras;
  var lecturas = [];
  function cargador(t) { lecturas.push(t); return Promise.resolve({ informes: [{ informe_id: 1, villaid: 7, temporada: t }], lineas: [] }); }
  ok('antes de leer, temporadaPrevia(2026) no tiene nada', X2.temporadaPrevia(2026) == null);
  var p1 = X2.cargarTemporadaPrevia(2026, cargador), p2 = X2.cargarTemporadaPrevia('2026', cargador);
  ok('dos llamadas seguidas = una sola lectura (la misma promesa)', lecturas.length === 1 && p1 === p2, J(lecturas));
  ok('lee la temporada ANTERIOR a la que se le pasa (2026 -> 2025)', lecturas[0] === 2025, J(lecturas));
  var r1 = await p1;
  ok('devuelve {temporada, informes, lineas}', r1 && r1.temporada === 2025 && r1.informes.length === 1 && Array.isArray(r1.lineas), J(r1));
  ok('después de leer, temporadaPrevia(2026) da lo leído sin esperar', X2.temporadaPrevia(2026) === r1);
  await X2.cargarTemporadaPrevia(2026, cargador);
  ok('una tercera llamada ya no lee', lecturas.length === 1, J(lecturas));
  await X2.cargarTemporadaPrevia(2025, cargador);
  ok('otro año = otra lectura (2025 -> 2024)', lecturas.length === 2 && lecturas[1] === 2024, J(lecturas));
  var malas = 0;
  function cargadorQueFalla(t) { malas++; return malas === 1 ? Promise.reject(new Error('HTTP 500')) : Promise.resolve({ informes: [], lineas: [] }); }
  var e1 = await X2.cargarTemporadaPrevia(2030, cargadorQueFalla).then(function () { return null; }, function (e) { return e; });
  ok('un fallo llega al que llama', esError(e1) && /500/.test(e1.message), e1 && e1.message);
  ok('un fallo no se guarda: temporadaPrevia sigue vacía', X2.temporadaPrevia(2030) == null);
  var r2 = await X2.cargarTemporadaPrevia(2030, cargadorQueFalla);
  ok('después de un fallo, la siguiente llamada lee otra vez', malas === 2 && r2 && r2.temporada === 2029 && r2.informes.length === 0, malas + ' ' + J(r2));
  var e2 = await X2.cargarTemporadaPrevia(2040, function () { return Promise.resolve(true); }).then(function () { return null; }, function (e) { return e; });
  ok('un cargador que no devuelve {informes, lineas} (cargarInformes de la v2 devuelve true) se rechaza con un error claro', esError(e2) && /informes/.test(e2.message), e2 && e2.message);
  var e3 = await X2.cargarTemporadaPrevia('x', cargador).then(function () { return null; }, function (e) { return e; });
  ok('una temporada que no es un año se rechaza sin leer', esError(e3) && lecturas.length === 2, e3 && e3.message);
  var prevCasas = [casa({ villaid: 7, informe_id: 3 }), casa({ villaid: '9', informe_id: 4 })];
  ok('casaPreviaDe: la misma villa en las casas de la temporada anterior', X2.casaPreviaDe(casa({ villaid: '7' }), prevCasas).informe_id === 3 && X2.casaPreviaDe(casa({ villaid: 9 }), prevCasas).informe_id === 4);
  ok('casaPreviaDe: sin la villa o sin casas -> null', X2.casaPreviaDe(casa({ villaid: 8 }), prevCasas) === null && X2.casaPreviaDe(casa({}), null) === null);

  console.log('3. Comparación con la temporada anterior');
  var ahora = casa({ informe_id: 20, lineas: todas(20, 'Bueno', { piscina: 'Malo', pintura: 'Regular', barbacoa: 'Regular', humedades: null }) });
  var antes = casa({ informe_id: 10, url: 'informe-temporada.html?villaid=7&temporada=2025', lineas: todas(10, 'Bueno', { piscina: 'Regular', pintura: 'Regular', barbacoa: 'Bueno', colchones: 'Malo', menaje: null }) });
  LLAMADAS = [];
  var h = X.comparacionHtml(ahora, antes);
  ok('llama a InformeScore.comparar(líneas de la anterior, líneas de esta)', LLAMADAS.length === 1 && LLAMADAS[0][0] === antes.lineas && LLAMADAS[0][1] === ahora.lineas);
  var cc = DOBLE.comparar(antes.lineas, ahora.lineas);
  ok('los dos años en la cabecera (de la url de la casa: 2025 y 2026)', h.indexOf('2025') >= 0 && h.indexOf('2026') >= 0);
  ok('las dos puntuaciones con coma decimal', h.indexOf('>' + String(cc.puntuacionA.toFixed(1)).replace('.', ',') + '<') >= 0 && h.indexOf('>' + String(cc.puntuacionB.toFixed(1)).replace('.', ',') + '<') >= 0, cc.puntuacionA + ' ' + cc.puntuacionB);
  ok('la banda de cada puntuación como clase (sc verde / sc ambar)', /class="sc (verde|ambar|rojo)"/.test(h));
  ok('el número de elementos comparados ("sobre 24 elementos evaluados en ambas temporadas")', cc.n === 24 && h.indexOf('sobre 24 elementos evaluados en ambas temporadas') >= 0, cc.n);
  ok('Cambios (3): piscina, barbacoa y colchones', cc.cambios.length === 3 && h.indexOf('Cambios (3)') >= 0, J(cc.cambios));
  ok('nombre corto del elemento (sin el paréntesis) y las marcas: Piscina: Regular → Malo', h.indexOf('Piscina: Regular → Malo') >= 0);
  ok('flecha abajo cuando empeora, arriba cuando mejora', /baja">▼<\/span> Piscina/.test(h) && /sube">▲<\/span> Colchones y almohadas: Malo → Bueno/.test(h));
  ok('Repetido (2): Regular o Malo los dos años, con sus marcas', h.indexOf('Repetido: Regular o Malo los dos años (2)') >= 0 && h.indexOf('Pintura interior: Regular → Regular') >= 0 && h.indexOf('Piscina: Regular → Malo') >= 0);
  ok('un elemento solo en un año no sale (humedades, menaje)', h.indexOf('Humedades') < 0 && h.indexOf('Menaje') < 0);
  var igual = casa({ informe_id: 30, lineas: todas(30, 'Bueno', { pintura: 'Malo' }) });
  var igualAntes = casa({ informe_id: 31, lineas: todas(31, 'Bueno', { pintura: 'Malo' }) });
  var hi = X.comparacionHtml(igual, igualAntes, 2026);
  ok('sin cambios: "Cambios (0)" y "Ninguna marca cambia."', hi.indexOf('Cambios (0)') >= 0 && hi.indexOf('Ninguna marca cambia.') >= 0);
  ok('sin cambios: la misma puntuación los dos años y 26 elementos', cuenta(hi, '>96,2<') === 2 && hi.indexOf('sobre 26 elementos') >= 0, hi.slice(0, 300));
  ok('el año también llega como tercer argumento (2026 -> 2025)', hi.indexOf('2025') >= 0 && hi.indexOf('2026') >= 0);
  var sinPrev = X.comparacionHtml(ahora, null);
  ok('sin informe en la temporada anterior: lo dice con el año', sinPrev.indexOf('Sin informe enviado en 2025 para esta casa.') >= 0 && sinPrev.indexOf('Cambios') < 0, sinPrev);
  var prevBorr = X.comparacionHtml(ahora, casa({ estado: 'borrador', lineas: antes.lineas }));
  ok('la anterior en borrador no se compara y lo dice', /2025.*borrador/.test(prevBorr) && prevBorr.indexOf('Cambios') < 0, prevBorr);
  var prevSin = X.comparacionHtml(ahora, casa({ estado: '', informe_id: null, lineas: [] }));
  ok('la anterior sin informe (fila sin informe) = sin informe enviado', prevSin.indexOf('Sin informe enviado en 2025') >= 0, prevSin);
  var borr = X.comparacionHtml(casa({ estado: 'borrador', lineas: ahora.lineas }), antes);
  ok('esta en borrador: "La comparación usa dos informes enviados; este informe está en borrador."', borr.indexOf('La comparación usa dos informes enviados; este informe está en borrador.') >= 0);
  var sinEsta = X.comparacionHtml(casa({ estado: '', informe_id: null, lineas: [] }), antes);
  ok('esta casa sin informe: lo dice y no compara', /no tiene informe/.test(sinEsta) && sinEsta.indexOf('Cambios') < 0, sinEsta);
  LLAMADAS = [];
  var nada = X.comparacionHtml(casa({ lineas: marcas(40, { pintura: 'Bueno' }) }), casa({ lineas: marcas(41, { piscina: 'Malo' }) }));
  ok('ningún elemento evaluado en los dos años: lo dice, sin puntuaciones', nada.indexOf('Ningún elemento evaluado en las dos temporadas') >= 0 && nada.indexOf('class="sc') < 0, nada);
  var sbSin = cargar(false); delete sbSin.InformeScore; delete sbSin.window.InformeScore;
  var sinScore = safe(function () { return sbSin.window.Extras.comparacionHtml(ahora, antes); });
  ok('sin InformeScore cargado no rompe: texto "comparación no disponible"', typeof sinScore === 'string' && /no disponible/.test(sinScore), sinScore);

  console.log('4. Galería de fotos');
  var R2 = 'https://pub-48c1cfd5de614ff0a0cebfec482a7b32.r2.dev/';
  var fotos6 = [6, 2, 4, 1, 5, 3].map(function (i) { return L(20, 'foto', 'foto_' + i, { foto_url: R2 + '2026_informe_20_foto_' + i + '_abc12' + i + '.jpg', texto_1: 'Pie ' + i }); });
  var c6 = casa({ lineas: ahora.lineas.concat(fotos6) });
  var f6 = X.fotosDe(c6);
  ok('fotosDe: 6 fotos en el orden del formulario (foto_1 .. foto_6)', f6.length === 6 && f6.map(function (f) { return f.clave; }).join(',') === 'foto_1,foto_2,foto_3,foto_4,foto_5,foto_6', J(f6.map(function (f) { return f.clave; })));
  ok('fotosDe: r2.dev pasa a www.3villas.com/intranet/fotos/ (como el formulario)', f6[0].url === 'https://www.3villas.com/intranet/fotos/2026_informe_20_foto_1_abc121.jpg', f6[0].url);
  ok('fotosDe: el pie es texto_1', f6[2].pie === 'Pie 3');
  var g6 = X.galeriaHtml(c6);
  ok('galería con 6 fotos: 6 botones con su miniatura y su pie', cuenta(g6, '<button type="button" class="foto"') === 6 && cuenta(g6, '<img ') === 6 && g6.indexOf('Pie 6') >= 0);
  ok('cada botón abre la capa con su número (Extras.overlayAbrir(0..5))', g6.indexOf('Extras.overlayAbrir(0)') >= 0 && g6.indexOf('Extras.overlayAbrir(5)') >= 0 && g6.indexOf('Extras.overlayAbrir(6)') < 0);
  ok('las miniaturas cargan perezosas y con texto alternativo', cuenta(g6, 'loading="lazy"') === 6 && g6.indexOf('alt="Pie 1"') >= 0);
  ok('dice que las fotos no van unidas a un elemento hasta la v5', /v5/.test(g6));
  var g0 = X.galeriaHtml(casa({ lineas: ahora.lineas }));
  ok('galería sin fotos: "Este informe no tiene fotos."', g0.indexOf('Este informe no tiene fotos.') >= 0 && g0.indexOf('<button') < 0, g0);
  ok('galería de una casa sin informe: sin fotos, sin error', X.galeriaHtml(casa({ estado: '', lineas: [] })).indexOf('Este informe no tiene fotos.') >= 0 && X.galeriaHtml(null).indexOf('no tiene fotos') >= 0);
  var raras = [L(20, 'foto', 'foto_1', { foto_url: '', texto_1: 'sin foto' }), L(20, 'foto', 'foto_2', { foto_url: 'javascript:alert(1)', texto_1: 'x' }),
    L(20, 'foto', 'foto_3', { foto_url: 'https://x.test/a.jpg?a=1&b="2"', texto_1: '<b>pie</b> "comillas"' }), L(20, 'foto', 'foto_4', { foto_url: '  ', texto_1: '' }),
    L(20, 'resumen', 'accion_1', { foto_url: 'https://x.test/no.jpg', texto_1: 'no es foto' }), L(20, 'foto', 'foto_5', { foto_url: 'https://x.test/c.jpg', texto_1: '' })];
  var fr = X.fotosDe(casa({ lineas: raras }));
  ok('fotosDe: sin foto_url, con una dirección que no es http(s) o de otra sección = fuera', fr.length === 2 && fr[0].clave === 'foto_3' && fr[1].clave === 'foto_5', J(fr));
  var gr = X.galeriaHtml(casa({ lineas: raras }));
  ok('galería: el pie y la dirección van escapados', gr.indexOf('<b>pie</b>') < 0 && gr.indexOf('&lt;b&gt;pie&lt;/b&gt; &quot;comillas&quot;') >= 0 && gr.indexOf('b=&quot;2&quot;') >= 0 && gr.indexOf('javascript:') < 0, gr);
  ok('galería: una foto sin pie se llama "Foto 5"', gr.indexOf('Foto 5') >= 0);

  console.log('5. La capa de la foto: abrir, Esc, fondo, foco');
  var D = sb.document;
  X.galeriaHtml(c6);
  D.activeElement = { nombre: 'boton de la foto', focus: function () { D.activeElement = this; D.focos.push(this); } };
  var abre = X.overlayAbrir(2);
  var ov = D.anadidos.filter(function (n) { return n.getAttribute('role') === 'dialog'; })[0];
  ok('overlayAbrir(2) devuelve true y añade una capa role=dialog aria-modal al body', abre === true && !!ov && ov.parentNode === D.body && ov.getAttribute('aria-modal') === 'true');
  ok('la capa se ve (hidden = false) y overlayAbierto() = true', ov && ov.hidden === false && X.overlayAbierto() === true);
  var img = D.anadidos.filter(function (n) { return n.tagName === 'IMG'; })[0];
  ok('muestra la tercera foto en grande', img && img.src === f6[2].url && img.alt === 'Pie 3', img && img.src);
  var cap = D.anadidos.filter(function (n) { return /ov-cap/.test(n.className); })[0];
  ok('pie: "Pie 3 · foto 3 de 6"', cap && cap.textContent === 'Pie 3 · foto 3 de 6', cap && cap.textContent);
  var cerrar = D.anadidos.filter(function (n) { return n.tagName === 'BUTTON'; })[0];
  ok('el foco va al botón "Cerrar (Esc)"', cerrar && cerrar.textContent === 'Cerrar (Esc)' && D.activeElement === cerrar);
  var otra = D.tecla('ArrowRight');
  ok('otra tecla con la capa abierta no la cierra', X.overlayAbierto() === true && ov.hidden === false);
  var esc = D.tecla('Escape');
  ok('Esc cierra la capa y se come la tecla', ov.hidden === true && X.overlayAbierto() === false && esc.defaultPrevented === true);
  ok('al cerrar, el foco vuelve al botón de la foto', D.activeElement && D.activeElement.nombre === 'boton de la foto');
  var esc2 = D.tecla('Escape');
  ok('Esc con la capa cerrada no hace nada (no se come la tecla)', esc2.defaultPrevented === false);
  X.overlayAbrir(0);
  var nCapas = D.anadidos.filter(function (n) { return n.getAttribute('role') === 'dialog'; }).length;
  ok('abrir otra vez usa la misma capa (una sola en la página)', nCapas === 1 && ov.hidden === false && img.src === f6[0].url && cap.textContent === 'Pie 1 · foto 1 de 6');
  (ov.listeners.click || []).forEach(function (f) { f({ target: img }); });
  ok('un clic dentro de la foto no cierra', ov.hidden === false);
  (ov.listeners.click || []).forEach(function (f) { f({ target: ov }); });
  ok('un clic en el fondo oscuro cierra', ov.hidden === true);
  X.overlayAbrir(1);
  (cerrar.listeners.click || []).forEach(function (f) { f({ target: cerrar }); });
  ok('el botón Cerrar cierra', ov.hidden === true);
  ok('overlayCerrar con la capa cerrada no rompe', safe(function () { X.overlayCerrar(); return true; }) === true);
  ok('overlayAbrir fuera de rango (9) no abre', X.overlayAbrir(9) === false && ov.hidden === true);
  X.galeriaHtml(casa({ lineas: [] }));
  ok('después de pintar una casa sin fotos, overlayAbrir(0) no abre la foto de otra casa', X.overlayAbrir(0) === false && ov.hidden === true);
  ok('un solo escuchador de teclado en el documento', (D.listeners.keydown || []).length === 1);
  var sbNoDoc = cargar(false);
  sbNoDoc.window.Extras.galeriaHtml(c6);
  ok('sin document (node), overlayAbrir devuelve false y no rompe', safe(function () { return sbNoDoc.window.Extras.overlayAbrir(0); }) === false);

  console.log('6. Cabecera de impresión');
  var p0 = X.printHeader({ t: '2026', vm: '', v: '' });
  ok('cuadro: "Temporada 2026 · VM: todos · Informes enviados"', p0 === 'Temporada 2026 · VM: todos · Informes enviados', p0);
  var pv = X.printHeader({ t: '2026', vm: 'c:12', v: '' }, { vmNombre: 'Rafa' });
  ok('cuadro con villa manager: su nombre', pv === 'Temporada 2026 · VM: Rafa · Informes enviados', pv);
  ok('villa manager sin nombre: se ve el id antes que nada', X.printHeader({ t: '2026', vm: 'c:12', v: '' }).indexOf('VM: c:12') >= 0);
  var pl = X.printHeader({ t: '2026', vm: '', v: 'lista:obras:alta', q: 'piscina', g: '1' }, { titulo: 'Obras · prioridad Alta' });
  ok('lista: título, búsqueda y "agrupado por casa"', pl === 'Temporada 2026 · VM: todos · Informes enviados · Obras · prioridad Alta · búsqueda «piscina» · agrupado por casa', pl);
  ok('lista: nunca "Uso interno"', pl.indexOf('Uso interno') < 0);
  var ph = X.printHeader({ t: '2026', vm: '', v: 'casa:7', from: 'lista:obras:alta' }, { casa: casa({ villa: 'Villa <Galerna>' }), titulo: 'Villa <Galerna>' });
  ok('casa: "Uso interno · dirección" arriba, en su propia línea', ph.indexOf('<div class="uso">Uso interno · dirección</div>') === 0, ph);
  ok('casa: temporada, casa (escapada), VM de la casa y estado del informe', ph.indexOf('Temporada 2026 · Villa &lt;Galerna&gt; · VM Rafa · Informe enviado') >= 0, ph);
  var phb = X.printHeader({ t: '2026', v: 'casa:7' }, { casa: casa({ estado: 'borrador', vm: '' }) });
  ok('casa en borrador y sin VM: "VM — · Informe en borrador"', phb.indexOf('VM — · Informe en borrador') >= 0, phb);
  var phs = X.printHeader({ t: '2026', v: 'casa:7' }, {});
  ok('casa sin datos: "Uso interno" y "Sin informe", sin error', phs.indexOf('Uso interno · dirección') >= 0 && phs.indexOf('Sin informe') >= 0, phs);
  ok('una búsqueda con < > va escapada', X.printHeader({ t: '2026', v: 'lista:obras', q: '<img>' }).indexOf('&lt;img&gt;') >= 0);
  ok('sin ruta no rompe', typeof safe(function () { return X.printHeader(null); }) === 'string');
  /* Ronda de arreglos 1: los filtros de obras del cuadro en la cabecera; "Informes enviados" solo donde la vista cuenta enviados */
  var pf = X.printHeader({ t: '2026', vm: '', v: '', op: 'alta', of: 'estancia', od: '1', oq: 'grifo', og: '1' });
  ok('cuadro con filtros de obras: los nombra', pf === 'Temporada 2026 · VM: todos · Informes enviados · obras: prioridad Alto · origen Estancia · sin detalle · búsqueda de obras «grifo» · obras agrupadas por casa', pf);
  ok('obras sin prioridad: "obras: sin prioridad"', X.printHeader({ t: '2026', v: '', op: 'sin' }).indexOf('obras: sin prioridad') >= 0);
  var pb = X.printHeader({ t: '2026', vm: '', v: 'lista:estado:borrador' }, { titulo: 'Casas con informe en borrador' });
  ok('lista de borradores o de todas las casas: sin "Informes enviados"', pb === 'Temporada 2026 · VM: todos · Casas con informe en borrador' && X.printHeader({ t: '2026', v: 'lista:estado:todas' }, { titulo: 'Todas las casas' }).indexOf('Informes enviados') < 0, pb);

  console.log('7. Hoja de estilos: móvil, impresión, foco');
  var css = '';
  try { css = fs.readFileSync(CSS, 'utf8'); } catch (e) { ok('existe ' + CSS, false, e.message); }
  var plano = css.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\s+/g, '');
  function bloque(cab) {
    var i = plano.indexOf(cab); if (i < 0) return '';
    var j = plano.indexOf('{', i), d = 0, k = j;
    for (; k < plano.length; k++) { if (plano[k] === '{') d++; else if (plano[k] === '}') { d--; if (d === 0) break; } }
    return plano.slice(j + 1, k);
  }
  ok('llaves equilibradas', cuenta(plano, '{') === cuenta(plano, '}') && plano.length > 0);
  var fuera = plano.replace(/@media[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, '');
  ok('foco visible en pantalla (a, button, input, [tabindex] :focus-visible con outline)', /a:focus-visible/.test(fuera) && /button:focus-visible/.test(fuera) && /\[tabindex\]:focus-visible/.test(fuera) && /focus-visible[^{]*\{outline:3px/.test(fuera));
  ok('la cabecera de impresión no se ve en pantalla', /\.print-head\{display:none\}/.test(fuera));
  ok('la capa oculta de verdad cuando hidden', /\.ov\[hidden\]\{display:none/.test(fuera));
  ok('la capa cubre la pantalla (position:fixed;inset:0)', /\.ov\{[^}]*position:fixed;inset:0/.test(fuera));
  ok('galería en rejilla', /\.gal\{display:grid/.test(fuera));
  ok('la tabla de VM se desplaza y su primera columna queda fija', /\.vmwrap\{overflow-x:auto/.test(fuera) && /\.vmttd:first-child,\.vmtth:first-child\{position:sticky;left:0/.test(fuera));
  var movil = bloque('@media(max-width:700px)');
  ok('hay un bloque @media (max-width:700px)', movil.length > 0);
  ok('móvil: una tarjeta por fila (.casas y .tiles en una columna)', /\.casas\{grid-template-columns:1fr/.test(movil) && /\.tiles\{grid-template-columns:1fr/.test(movil));
  ok('móvil: tablas como tarjetas apiladas (table.stack, data-l)', /table\.stack,table\.stackthead,table\.stacktbody,table\.stacktr,table\.stacktd\{display:block/.test(movil) && /content:attr\(data-l\)/.test(movil));
  ok('móvil: la tabla de VM más ancha que la pantalla (se desplaza)', /\.vmt\{min-width:/.test(movil));
  ok('móvil: la casa apilada (.hv-grid y .hv-head en una columna)', /\.hv-grid\{grid-template-columns:1fr/.test(movil) && /\.hv-head\{grid-template-columns:1fr/.test(movil));
  ok('móvil: botones y chips grandes (min-height 44px)', /min-height:44px/.test(movil));
  var imp = bloque('@mediaprint');
  ok('hay un bloque @media print con @page A4', imp.length > 0 && /@page\{size:A4/.test(imp));
  ok('impresión: la cabecera se ve, "Uso interno" en rojo', /\.print-head\{display:block/.test(imp) && /\.print-head\.uso\{[^}]*color:var\(--red\)/.test(imp));
  ok('impresión: sin menú, filtros, botones, capa ni volver', /\.top-nav/.test(imp) && /\.filtros/.test(imp) && /\.no-print/.test(imp) && /\.btn/.test(imp) && /\.ov/.test(imp) && /\.volver/.test(imp) && /display:none!important/.test(imp));
  ok('impresión: nada partido entre hojas (tarjetas, filas, bloques, fotos)', /break-inside:avoid/.test(imp) && /\.foto/.test(imp));
  ok('impresión: la casa en una columna y las tablas apiladas vuelven a ser tablas', /\.hv-grid\{grid-template-columns:1fr/.test(imp));
  ok('impresión: sin la columna "Abrir"', /a\.abrir/.test(imp));
  /* Ronda de arreglos 1: la casa se imprime en la hoja de Rafa (diseño punto 15) */
  ok('hoja de Rafa: oculta en pantalla', /\.hoja-print\{display:none\}/.test(fuera));
  ok('hoja de Rafa al imprimir: se ve la hoja, no la tabla de pantalla, ni la cabecera ni la ayuda de la página', /\.hoja-print\{display:block/.test(imp) && /\.solo-pantalla\{display:none!important/.test(imp) && /\.page-head\{display:none!important/.test(imp));
  ok('hoja de Rafa al imprimir: el bloque de las 26 se puede partir entre hojas (las filas no)', /\.blk\.checks\{break-inside:auto;page-break-inside:auto/.test(imp));
  ok('hoja de Rafa al imprimir: las medidas del formulario (bordes #cfcfcf, Elemento 29 %, marcas de 62 px centradas, cabecera #f2f2f2)', /\.hoja-print\.t\{width:100%;border-collapse:collapse;table-layout:fixed/.test(imp)
    && /\.hoja-print\.tth,\.hoja-print\.ttd\{border:1pxsolid#cfcfcf/.test(imp) && /\.hoja-print\.c-el\{width:29%/.test(imp) && /\.hoja-print\.c-st\{width:62px;text-align:center/.test(imp) && /\.hoja-print\.tth\{background:#f2f2f2/.test(imp));

  console.log('8. Bandas de la comparación (rojo < 50, ámbar < 80, verde >= 80)');
  function casaCon(inf, m) { return casa({ informe_id: inf, lineas: marcas(inf, m) }); }
  var mR = {}; ELEMENTOS.forEach(function (e, i) { mR[e.clave] = i < 13 ? 'Malo' : 'Regular'; });
  var hb = X.comparacionHtml(casaCon(50, mR), casaCon(51, (function () { var m = {}; ELEMENTOS.forEach(function (e) { m[e.clave] = 'Bueno'; }); return m; })()));
  ok('25,0 en rojo y 100,0 en verde', hb.indexOf('<span class="sc rojo">25,0</span>') >= 0 && hb.indexOf('<span class="sc verde">100,0</span>') >= 0, hb.slice(0, 300));

  console.log('9. Con el informe-temporada-score.js de verdad (carril A), si ya está');
  if (fs.existsSync('informe-temporada-score.js')) {
    var sb9 = { console: console }; sb9.window = sb9;
    vm.runInNewContext(fs.readFileSync('informe-temporada-score.js', 'utf8'), sb9);
    vm.runInNewContext(SRC, sb9);
    var h9 = safe(function () { return sb9.window.Extras.comparacionHtml(ahora, antes); });
    ok('comparación con el InformeScore real: 24 elementos, 3 cambios, 2 repetidos', typeof h9 === 'string' && h9.indexOf('sobre 24 elementos') >= 0 && h9.indexOf('Cambios (3)') >= 0 && h9.indexOf('(2)') >= 0, String(h9).slice(0, 400));
  } else {
    console.log('  (saltado: informe-temporada-score.js no está en esta carpeta; lo corre el integrador)');
  }
  fin();
})().catch(function (e) { ok('las pruebas terminan sin excepción', false, e && e.stack); fin(); });
