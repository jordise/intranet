/* Pruebas de cuadro-informes-temporada-rutas.js (Rutas: el estado del cuadro v3 en el hash).
   node cuadro-informes-temporada-rutas.test.js

   Como cuadro-comercial-data.test.js: NO copia el código. Carga el archivo real con require y,
   además, en un vm con window (como lo carga el navegador). Sin red, sin DOM real. */
var fs = require('fs'), vm = require('vm'), path = require('path');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c === true) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '  -> ' + e : '')); } }
function J(x) { return JSON.stringify(x); }

var FILE = path.join(__dirname, 'cuadro-informes-temporada-rutas.js');
var SRC = fs.readFileSync(FILE, 'utf8');
var R = require(FILE);

console.log('archivo y carga');
var ver = (SRC.match(/VERSIÓN ACTUAL: (v\d+)/) || [])[1];
ok('cabecera con versión (' + ver + ')', !!ver);
ok('HISTORIAL empieza por la misma versión', SRC.indexOf('/* HISTORIAL: ' + ver + ' ') > 0);
var ctx = { window: {} };
vm.runInNewContext(SRC, ctx);
ok('en el navegador se publica en window.Rutas', !!(ctx.window.Rutas && typeof ctx.window.Rutas.parse === 'function'));
['parse', 'serialize', 'href', 'back', 'scrollRecordar', 'scrollVolver', 'teclas'].forEach(function (f) {
  ok('Rutas.' + f + ' es una función', typeof R[f] === 'function');
});
var code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
ok('sin red (fetch, XMLHttpRequest) ni Caspio', !/\bfetch\(|XMLHttpRequest|caspio/i.test(code));
ok('sin módulos (import / export)', !/^\s*(import|export)\s/m.test(code));

console.log('parse');
var r = R.parse('#t=2026&vm=c:12&v=lista:obras:alta&s=villa:asc&q=texto&g=1&from=lista:atencion');
ok('el ejemplo del contrato', r.t === '2026' && r.vm === 'c:12' && r.v === 'lista:obras:alta' && r.s === 'villa:asc' && r.q === 'texto' && r.g === '1' && r.from === 'lista:atencion', J(r));
ok('siete claves del contrato siempre presentes', ['t', 'vm', 'v', 's', 'q', 'g', 'from'].every(function (k) { return typeof r[k] === 'string'; }), J(r));
var vacio = R.parse('');
ok('hash vacío = cuadro sin filtros', vacio.t === '' && vacio.vm === '' && vacio.v === '' && vacio.s === '' && vacio.q === '' && vacio.g === '' && vacio.from === '', J(vacio));
ok('sin # también vale', R.parse('t=2025&v=casa:7').v === 'casa:7' && R.parse('t=2025&v=casa:7').t === '2025');
ok('temporada por defecto si falta', R.parse('#v=lista:condicion', { t: '2026' }).t === '2026');
ok('temporada ilegible = la de por defecto', R.parse('#t=20x6', { t: '2026' }).t === '2026' && R.parse('#t=1', { t: '2026' }).t === '2026');
ok('vm u:<UserID> vale', R.parse('#vm=u:5').vm === 'u:5');
/* Integración: "Sin villa manager" de la portada (Portada.SIN_VM) viaja como vm=sin y vuelve igual */
ok('integración: vm=sin (casas sin villa manager) vale y vuelve igual', R.parse('#t=2026&vm=sin&v=lista:estado:todas').vm === 'sin' && R.serialize(R.parse('#t=2026&vm=sin&v=lista:estado:todas')) === '#t=2026&vm=sin&v=lista:estado:todas' && R.parse('#vm=sinx').vm === '');
ok('vm sin origen c:/u: = todos', R.parse('#vm=12').vm === '' && R.parse('#vm=x:3').vm === '');
ok('vm con caracteres raros = todos', R.parse('#vm=c:1%3Cb%3E').vm === '');
ok('vista de casa', R.parse('#v=casa:123').v === 'casa:123');
ok('vista de casa sin número = cuadro', R.parse('#v=casa:abc').v === '');
ok('vista lista:mapa:<clave>:<marca>', R.parse('#v=lista:mapa:instalacion_electrica:malo').v === 'lista:mapa:instalacion_electrica:malo');
ok('vista con HTML = cuadro', R.parse('#v=lista:%3Cscript%3E').v === '');
ok('vista desconocida (no lista ni casa) = cuadro', R.parse('#v=borrar:todo').v === '');
ok('orden clave:asc|desc', R.parse('#s=puntuacion:desc').s === 'puntuacion:desc');
ok('orden ilegible = sin orden', R.parse('#s=villa').s === '' && R.parse('#s=villa:up').s === '' && R.parse('#s=a%20b:asc').s === '');
ok('búsqueda con espacios y acentos', R.parse('#q=pintura%20ba%C3%B1o').q === 'pintura baño');
ok('búsqueda con + como espacio (formulario)', R.parse('#q=dos+palabras').q === 'dos palabras');
ok('búsqueda con %2B = un +', R.parse('#q=a%2Bb').q === 'a+b');
ok('búsqueda larga se corta a 200', R.parse('#q=' + new Array(300).join('x')).q.length === 200);
ok('codificación rota no rompe', R.parse('#q=%E0%A4%A&t=2026').t === '2026');
ok('g solo vale 1', R.parse('#g=1').g === '1' && R.parse('#g=si').g === '' && R.parse('#g=0').g === '');
ok('from solo una lista', R.parse('#from=lista:obras:todas').from === 'lista:obras:todas' && R.parse('#from=casa:3').from === '');
ok('clave repetida: vale la última', R.parse('#t=2025&t=2026').t === '2026');
ok('claves desconocidas se ignoran', !('zz' in R.parse('#zz=1&t=2026')));
var obr = R.parse('#op=alta&of=estancia&od=1&oq=grifo&og=1');
ok('filtros de obras del cuadro (maqueta: op, of, od, oq, og)', obr.op === 'alta' && obr.of === 'estancia' && obr.od === '1' && obr.oq === 'grifo' && obr.og === '1', J(obr));
ok('filtros de obras ilegibles se vacían', R.parse('#op=urgente&of=x&od=2&og=x').op === '' && R.parse('#of=x').of === '' && R.parse('#od=2').od === '' && R.parse('#og=x').og === '');

console.log('serialize');
ok('el ejemplo del contrato, en este orden', R.serialize({ t: '2026', vm: 'c:12', v: 'lista:obras:alta', s: 'villa:asc', q: 'texto', g: '1', from: 'lista:atencion' })
  === '#t=2026&vm=c:12&v=lista:obras:alta&s=villa:asc&q=texto&g=1&from=lista:atencion', R.serialize({ t: '2026', vm: 'c:12', v: 'lista:obras:alta', s: 'villa:asc', q: 'texto', g: '1', from: 'lista:atencion' }));
ok('vacíos fuera', R.serialize({ t: '2026', vm: '', v: '', s: '', q: '', g: '', from: '' }) === '#t=2026');
ok('nada = #', R.serialize({}) === '#');
ok('los dos puntos se quedan legibles', R.serialize({ v: 'lista:mapa:piscina:malo' }) === '#v=lista:mapa:piscina:malo');
ok('espacios y & de la búsqueda codificados', R.serialize({ q: 'a b&c=d' }) === '#q=a%20b%26c%3Dd');
ok('valores no válidos no salen', R.serialize({ t: 'x', vm: 'zz', v: 'borrar:todo', s: 'x', g: '2' }) === '#');
ok('número de temporada vale como texto', R.serialize({ t: 2026 }) === '#t=2026');

console.log('ida y vuelta');
[
  '#t=2026',
  '#t=2026&vm=c:12&v=lista:obras:alta&s=villa:asc&q=texto&g=1&from=lista:atencion',
  '#t=2025&v=casa:42&s=puntuacion:desc&q=ba%C3%B1o%20roto&from=lista:mapa:banos:malo',
  '#t=2026&vm=u:7&v=lista:estado:borrador',
  '#t=2026&op=media&of=resumen&od=1&oq=grifo&og=1'
].forEach(function (h) {
  ok('serialize(parse(h)) === h  ' + h, R.serialize(R.parse(h)) === h, R.serialize(R.parse(h)));
});
var obj = { t: '2026', vm: 'c:3', v: 'casa:9', s: 'villa:desc', q: 'Cañón & "x"', g: '1', from: 'lista:condicion' };
ok('parse(serialize(r)) devuelve r', J(R.parse(R.serialize(obj))) === J(R.parse(R.serialize(R.parse(R.serialize(obj))))) && R.parse(R.serialize(obj)).q === obj.q && R.parse(R.serialize(obj)).from === obj.from);

console.log('href');
var base = R.parse('#t=2026&vm=c:12&v=lista:obras:alta&s=villa:asc&q=texto&g=1');
ok('href(route) = serialize(route)', R.href(base) === R.serialize(base));
ok('href estable: el orden de las claves del objeto no cambia el enlace',
  R.href({ from: 'lista:x', q: 'a', t: '2026', v: 'casa:1' }) === R.href({ t: '2026', v: 'casa:1', q: 'a', from: 'lista:x' }));
ok('href estable: dos llamadas, mismo texto', R.href(base, { v: 'casa:5' }) === R.href(base, { v: 'casa:5' }));
ok('href con cambio: guarda temporada y VM, nada más', R.href(base, { v: 'lista:condicion' }) === '#t=2026&vm=c:12&v=lista:condicion', R.href(base, { v: 'lista:condicion' }));
ok('href con cambio y claves que se quedan', R.href(base, { v: 'casa:5', from: 'lista:obras:alta' }, ['s', 'q', 'g']) === '#t=2026&vm=c:12&v=casa:5&s=villa:asc&q=texto&g=1&from=lista:obras:alta',
  R.href(base, { v: 'casa:5', from: 'lista:obras:alta' }, ['s', 'q', 'g']));
ok('href con keep=true guarda todo', R.href(base, { q: 'otro' }, true) === '#t=2026&vm=c:12&v=lista:obras:alta&s=villa:asc&q=otro&g=1');
ok('href: cambio a vacío quita la clave', R.href(base, { vm: '' }, true) === '#t=2026&v=lista:obras:alta&s=villa:asc&q=texto&g=1');
ok('href: el cambio de temporada', R.href(base, { t: '2025' }) === '#t=2025&vm=c:12');
ok('href no cambia el objeto de entrada', base.v === 'lista:obras:alta' && base.q === 'texto');

console.log('back');
ok('casa desde una lista vuelve a la lista con orden, búsqueda y grupo',
  R.back(R.parse('#t=2026&vm=c:12&v=casa:5&s=villa:asc&q=texto&g=1&from=lista:obras:alta')) === '#t=2026&vm=c:12&v=lista:obras:alta&s=villa:asc&q=texto&g=1',
  R.back(R.parse('#t=2026&vm=c:12&v=casa:5&s=villa:asc&q=texto&g=1&from=lista:obras:alta')));
ok('casa sin lista vuelve al cuadro (temporada y VM)', R.back(R.parse('#t=2026&vm=c:12&v=casa:5')) === '#t=2026&vm=c:12');
ok('una lista vuelve al cuadro', R.back(R.parse('#t=2026&v=lista:condicion&s=villa:asc&q=x')) === '#t=2026');
ok('el cuadro se queda en el cuadro', R.back(R.parse('#t=2026&vm=u:4')) === '#t=2026&vm=u:4');
ok('el cuadro conserva los filtros de obras al volver', R.back(R.parse('#t=2026&v=casa:3&op=alta&og=1')) === '#t=2026&op=alta&og=1', R.back(R.parse('#t=2026&v=casa:3&op=alta&og=1')));

console.log('posición de la lista (sessionStorage)');
function almacen() { var m = {}; return { getItem: function (k) { return Object.prototype.hasOwnProperty.call(m, k) ? m[k] : null; }, setItem: function (k, v) { m[k] = String(v); }, m: m }; }
var st = almacen();
R.scrollRecordar('#t=2026&v=lista:obras:alta&s=villa:asc', 840, st);
ok('se guarda y se recupera por vista', R.scrollVolver('#t=2026&v=lista:obras:alta&s=villa:asc', st) === 840);
ok('el mismo estado escrito en otro orden = la misma vista', R.scrollVolver('#s=villa:asc&v=lista:obras:alta&t=2026', st) === 840);
ok('otra vista no tiene posición', R.scrollVolver('#t=2026&v=lista:condicion', st) === null);
R.scrollRecordar('#t=2026&v=lista:condicion', 120.6, st);
ok('cada vista con la suya (redondeo a píxel)', R.scrollVolver('#t=2026&v=lista:condicion', st) === 121 && R.scrollVolver('#t=2026&v=lista:obras:alta&s=villa:asc', st) === 840);
ok('las claves llevan prefijo propio', Object.keys(st.m).every(function (k) { return k.indexOf('cuadro-v3-scroll:') === 0; }), J(Object.keys(st.m)));
var roto = { getItem: function () { throw new Error('SecurityError'); }, setItem: function () { throw new Error('QuotaExceeded'); } };
var lanza = false; try { R.scrollRecordar('#t=2026', 5, roto); ok('sessionStorage bloqueado: volver = null', R.scrollVolver('#t=2026', roto) === null); } catch (e) { lanza = true; }
ok('sessionStorage bloqueado no rompe la página', !lanza);
ok('sin almacenamiento disponible = null', R.scrollVolver('#t=2026', null) === null);
ok('valor guardado ilegible = null', (function () { var s = almacen(); s.setItem('cuadro-v3-scroll:#t=2026', 'abc'); return R.scrollVolver('#t=2026', s) === null; })());

console.log('teclas ← →');
var nav = { prev: '#t=2026&v=casa:1', next: '#t=2026&v=casa:3' };
function ev(key, extra) { var e = { key: key, target: { tagName: 'BODY' } }; Object.keys(extra || {}).forEach(function (k) { e[k] = extra[k]; }); return e; }
ok('← = la casa anterior', R.teclas(ev('ArrowLeft'), nav) === nav.prev);
ok('→ = la casa siguiente', R.teclas(ev('ArrowRight'), nav) === nav.next);
ok('otra tecla = nada', R.teclas(ev('a'), nav) === null && R.teclas(ev('Enter'), nav) === null);
ok('dentro de un input = nada', R.teclas(ev('ArrowLeft', { target: { tagName: 'INPUT' } }), nav) === null);
ok('dentro de un textarea o select = nada', R.teclas(ev('ArrowRight', { target: { tagName: 'TEXTAREA' } }), nav) === null && R.teclas(ev('ArrowRight', { target: { tagName: 'SELECT' } }), nav) === null);
ok('en un contenteditable = nada', R.teclas(ev('ArrowRight', { target: { tagName: 'DIV', isContentEditable: true } }), nav) === null);
ok('dentro de un input (closest) = nada', R.teclas(ev('ArrowRight', { target: { tagName: 'SPAN', closest: function (s) { return /input/.test(s) ? {} : null; } } }), nav) === null);
ok('con el visor de fotos abierto = nada', R.teclas(ev('ArrowRight'), nav, true) === null);
ok('con Alt, Cmd o Ctrl = nada (atajos del navegador)', R.teclas(ev('ArrowLeft', { altKey: true }), nav) === null && R.teclas(ev('ArrowLeft', { metaKey: true }), nav) === null && R.teclas(ev('ArrowLeft', { ctrlKey: true }), nav) === null);
ok('primera casa: ← = nada', R.teclas(ev('ArrowLeft'), { prev: null, next: nav.next }) === null);
ok('sin navegación (cuadro o lista) = nada', R.teclas(ev('ArrowLeft'), null) === null && R.teclas(ev('ArrowLeft'), {}) === null);
ok('sin evento = nada', R.teclas(null, nav) === null);

console.log('ronda de arreglos 1: vs = el orden de la tabla de villa managers mientras se está fuera del cuadro');
ok('vs se lee como un orden (clave:asc|desc) y lo ilegible se vacía', R.parse('#vs=media:desc').vs === 'media:desc' && R.parse('#vs=media').vs === '');
ok('vs se escribe al final', R.serialize({ t: '2026', v: 'lista:condicion', vs: 'media:desc' }) === '#t=2026&v=lista:condicion&vs=media:desc');
var rvs = R.parse('#t=2026&v=lista:condicion&s=villa:asc&vs=media:desc');
ok('href con cambio guarda vs como la temporada y el VM', R.href(rvs, { v: 'casa:3', from: 'lista:condicion' }, ['s']) === '#t=2026&v=casa:3&s=villa:asc&from=lista:condicion&vs=media:desc', R.href(rvs, { v: 'casa:3', from: 'lista:condicion' }, ['s']));
ok('una lista vuelve al cuadro con su orden de la tabla (s = vs) y sin vs', R.back(rvs) === '#t=2026&s=media:desc', R.back(rvs));
ok('casa sin lista: vuelve al cuadro con s = vs', R.back(R.parse('#t=2026&v=casa:3&vs=nombre:asc')) === '#t=2026&s=nombre:asc');
ok('casa desde una lista: la lista guarda vs; desde ella, el cuadro recupera el orden', R.back(R.parse(R.back(R.parse('#t=2026&v=casa:3&s=villa:asc&from=lista:condicion&vs=media:desc')))) === '#t=2026&s=media:desc');

console.log('ronda de arreglos 2: los filtros de obras del nivel 1 viajan casa -> lista -> cuadro');
var c2 = '#t=2026&v=casa:3&q=grifo&g=1&from=lista:obras:todas:resumen&of=resumen&oq=grifo&og=1&vs=media:desc';
ok('casa abierta desde una obra del nivel 1: «‹ Lista» guarda op/of/od/oq/og', R.back(R.parse(c2)) === '#t=2026&v=lista:obras:todas:resumen&q=grifo&g=1&of=resumen&oq=grifo&og=1&vs=media:desc', R.back(R.parse(c2)));
ok('y desde la lista, «‹ Cuadro» vuelve al nivel 1 con el orden y los filtros de obras', R.back(R.parse(R.back(R.parse(c2)))) === '#t=2026&s=media:desc&of=resumen&oq=grifo&og=1', R.back(R.parse(R.back(R.parse(c2)))));

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
