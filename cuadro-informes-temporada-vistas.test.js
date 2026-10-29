/* Pruebas de cuadro-informes-temporada-vistas.js (Vistas: lista de nivel 2 y casa de nivel 3 del cuadro v3).
   node cuadro-informes-temporada-vistas.test.js

   NO copia el código: carga el archivo real (y Rutas real) en un vm con window, como el navegador.
   Los 26 elementos salen de informe-temporada-score.js si ya está en el repo; si no, de seccionesDef()
   del formulario (informe-temporada.html, solo lectura). Datos de mentira, sin red. */
var fs = require('fs'), vm = require('vm'), path = require('path');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c === true) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '  -> ' + String(e).slice(0, 400) : '')); } }
function J(x) { return JSON.stringify(x); }
function cuenta(h, s) { return h.split(s).length - 1; }

var DIR = __dirname;
var SRC = fs.readFileSync(path.join(DIR, 'cuadro-informes-temporada-vistas.js'), 'utf8');
var SRC_RUTAS = fs.readFileSync(path.join(DIR, 'cuadro-informes-temporada-rutas.js'), 'utf8');

/* Los 26 elementos: del archivo de puntuación (carril A) si existe; si no, del formulario */
function elementos() {
  var f = path.join(DIR, 'informe-temporada-score.js');
  if (fs.existsSync(f)) { var c = { window: {} }; vm.runInNewContext(fs.readFileSync(f, 'utf8'), c); return c.window.InformeScore.elementosDef(); }
  var html = fs.readFileSync(path.join(DIR, 'informe-temporada.html'), 'utf8');
  var i = html.indexOf('function seccionesDef(){'), j = html.indexOf('\n}', i);
  var c2 = {}; vm.runInNewContext(html.slice(i, j + 2) + '\nthis.S=seccionesDef();', c2);
  var out = [];
  c2.S.filter(function (s) { return s.tipo === 'estado'; }).forEach(function (s) { s.claves.forEach(function (k) { out.push({ seccion: s.id, clave: k[0], label: k[1] }); }); });
  return out;
}
var EL = elementos();
ok('fixture: 26 elementos en tres secciones', EL.length === 26, EL.length);

function cargar(conExtras, extra) {
  var ctx = { window: {}, console: console };
  ctx.window.InformeScore = { elementosDef: function () { return EL.map(function (e) { return { seccion: e.seccion, clave: e.clave, label: e.label }; }); } };
  if (conExtras) ctx.window.Extras = conExtras;
  Object.keys(extra || {}).forEach(function (k) { ctx.window[k] = extra[k]; });
  vm.createContext(ctx);
  vm.runInContext(SRC_RUTAS, ctx);
  vm.runInContext(SRC, ctx);
  return ctx.window;
}
var W = cargar(null), V = W.Vistas, R = W.Rutas;

console.log('archivo y carga');
var ver = (SRC.match(/VERSIÓN ACTUAL: (v\d+)/) || [])[1];
ok('cabecera con versión (' + ver + ')', !!ver);
ok('HISTORIAL empieza por la misma versión', SRC.indexOf('/* HISTORIAL: ' + ver + ' ') > 0);
ok('en el navegador se publica en window.Vistas', !!(V && typeof V.listaHtml === 'function' && typeof V.casaHtml === 'function'));
var nodeV = require(path.join(DIR, 'cuadro-informes-temporada-vistas.js'));
ok('con require también (module.exports)', typeof nodeV.listaHtml === 'function');
var code = SRC.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '');
ok('sin red (fetch, XMLHttpRequest) ni Caspio', !/\bfetch\(|XMLHttpRequest|caspio/i.test(code));
ok('sin módulos (import / export)', !/^\s*(import|export)\s/m.test(code));
ok('no lleva su propia copia de los 26 elementos (vienen de InformeScore)', !/instalacion_electrica|mobiliario_cocina/.test(code));

/* ── Lista de prueba (forma del contrato: lane D la construye) ── */
function listaCasas() {
  return {
    titulo: 'Casas por condición (peor primero, informes enviados)', unidad: 'casas',
    columnas: [{ clave: 'villa', label: 'Casa' }, { clave: 'vm', label: 'VM' }, { clave: 'puntuacion', label: 'Condición', num: true }, { clave: 'evaluados', label: 'Completitud', num: true }, { clave: 'fecha', label: 'Fecha de revisión' }],
    filas: [
      { villaid: 3, villa: 'Villa Ñandú', vm: 'Kike', puntuacion: 42.3, banda: 'rojo', evaluados: 20, completo: false, fecha: '2026-10-02' },
      { villaid: 1, villa: 'Casa Azul', vm: 'Rafa', puntuacion: 96.2, banda: 'verde', evaluados: 26, completo: true, fecha: '2026-10-20' },
      { villaid: 2, villa: 'Buganvilla', vm: 'Kike', puntuacion: null, banda: 'gris', evaluados: 0, completo: false, fecha: '' },
      { villaid: 4, villa: 'Ático <b>', vm: 'Rafa', puntuacion: 75, banda: 'ambar', evaluados: 26, completo: true, fecha: '2026-09-11', estado: 'borrador' }
    ],
    vacio: 'Ningún informe enviado con este filtro: no hay condición que calcular.'
  };
}
function listaObras() {
  return {
    titulo: 'Actuaciones de prioridad Alta', unidad: 'actuaciones',
    columnas: [{ clave: 'villa', label: 'Casa' }, { clave: 'accion', label: 'Actuación' }, { clave: 'fuentes', label: 'Origen' }, { clave: 'prioridad', label: 'Prioridad' }, { clave: 'coste', label: 'Coste' }],
    filas: [
      { villaid: 2, villa: 'Buganvilla', accion: 'Cambiar termo', fuentes: ['Resumen 1', 'Baño 1'], prioridad: 'Alta', coste: null },
      { villaid: 1, villa: 'Casa Azul', accion: 'Pintar fachada', fuentes: ['Resumen 2'], prioridad: 'Media', coste: null },
      { villaid: 2, villa: 'Buganvilla', accion: 'Arreglar persiana', fuentes: ['Dormitorio 2'], prioridad: '', coste: null },
      { villaid: 1, villa: 'Casa Azul', accion: '=HYPERLINK("x")', fuentes: ['Resumen 3'], prioridad: 'Baja', coste: null }
    ],
    vacio: 'Ninguna actuación con esta prioridad en los informes enviados.'
  };
}

console.log('filtrarOrdenar (las filas visibles = las del CSV)');
var r0 = R.parse('#t=2026&v=lista:condicion');
var fo = V.filtrarOrdenar(listaCasas(), r0);
ok('sin orden ni búsqueda: el orden de la lista', J(fo.filas.map(function (f) { return f.villaid; })) === '[3,1,2,4]', J(fo.filas.map(function (f) { return f.villaid; })));
ok('total = filas de la lista', fo.total === 4);
var asc = V.filtrarOrdenar(listaCasas(), R.parse('#v=lista:condicion&s=puntuacion:asc'));
ok('orden numérico ascendente, vacíos al final', J(asc.filas.map(function (f) { return f.villaid; })) === '[3,4,1,2]', J(asc.filas.map(function (f) { return f.villaid; })));
var desc = V.filtrarOrdenar(listaCasas(), R.parse('#v=lista:condicion&s=puntuacion:desc'));
ok('orden numérico descendente, vacíos al final también', J(desc.filas.map(function (f) { return f.villaid; })) === '[1,4,3,2]', J(desc.filas.map(function (f) { return f.villaid; })));
/* Integración: una columna de Listas con clave de orden (orden: 'fechaIso') ordena por esa clave, no por el texto dd/mm/aaaa */
var listaFechas = { titulo: 'f', columnas: [{ clave: 'villa', label: 'Casa' }, { clave: 'fecha', label: 'Fecha de revisión', orden: 'fechaIso' }],
  filas: [{ villaid: 1, villa: 'A', fecha: '20/10/2026', fechaIso: '2026-10-20' }, { villaid: 2, villa: 'B', fecha: '05/11/2026', fechaIso: '2026-11-05' }, { villaid: 3, villa: 'C', fecha: '28/09/2025', fechaIso: '2025-09-28' }] };
var fOrd = V.filtrarOrdenar(listaFechas, R.parse('#s=fecha:asc'));
ok('integración: s=fecha:asc ordena por la clave de orden fechaIso (C 2025, A 20/10, B 05/11)', J(fOrd.filas.map(function (f) { return f.villa; })) === '["C","A","B"]', J(fOrd.filas.map(function (f) { return f.villa; })));
var porNombre = V.filtrarOrdenar(listaCasas(), R.parse('#s=villa:asc'));
ok('orden de texto en español (Á con la A, Ñ tras la N)', J(porNombre.filas.map(function (f) { return f.villa; })) === J(['Ático <b>', 'Buganvilla', 'Casa Azul', 'Villa Ñandú']), J(porNombre.filas.map(function (f) { return f.villa; })));
var porFecha = V.filtrarOrdenar(listaCasas(), R.parse('#s=fecha:desc'));
ok('orden de fechas (ISO), vacías al final', J(porFecha.filas.map(function (f) { return f.villaid; })) === '[1,3,4,2]', J(porFecha.filas.map(function (f) { return f.villaid; })));
var pri = V.filtrarOrdenar(listaObras(), R.parse('#s=prioridad:desc'));
ok('prioridad ordena Alta > Media > Baja > sin prioridad', J(pri.filas.map(function (f) { return f.accion; })) === J(['Cambiar termo', 'Pintar fachada', '=HYPERLINK("x")', 'Arreglar persiana']), J(pri.filas.map(function (f) { return f.accion; })));
ok('orden por una clave que no es columna = sin orden', J(V.filtrarOrdenar(listaCasas(), R.parse('#s=zzz:asc')).filas.map(function (f) { return f.villaid; })) === '[3,1,2,4]');
ok('orden estable con empates (dos Kike, dos Rafa)', J(V.filtrarOrdenar(listaCasas(), R.parse('#s=vm:asc')).filas.map(function (f) { return f.villaid; })) === '[3,2,1,4]');
var bq = V.filtrarOrdenar(listaCasas(), R.parse('#q=nandu'));
ok('búsqueda sin acentos ni mayúsculas', bq.filas.length === 1 && bq.filas[0].villaid === 3 && bq.total === 4);
ok('búsqueda en cualquier columna (VM)', V.filtrarOrdenar(listaCasas(), R.parse('#q=rafa')).filas.length === 2);
ok('búsqueda en el texto que se ve (fecha 20/10/2026)', V.filtrarOrdenar(listaCasas(), R.parse('#q=20%2F10')).filas.length === 1);
ok('búsqueda en la coma decimal que se ve (96,2)', V.filtrarOrdenar(listaCasas(), R.parse('#q=96%2C2')).filas.length === 1);
ok('búsqueda en una lista de orígenes', V.filtrarOrdenar(listaObras(), R.parse('#q=ba%C3%B1o')).filas.length === 1);
ok('búsqueda sin resultado = 0 filas, total intacto', V.filtrarOrdenar(listaCasas(), R.parse('#q=zzzz')).filas.length === 0 && V.filtrarOrdenar(listaCasas(), R.parse('#q=zzzz')).total === 4);
var grp = V.filtrarOrdenar(listaObras(), R.parse('#g=1&s=prioridad:desc'));
ok('agrupar por casa: las filas de cada casa juntas, el orden dentro se queda', J(grp.filas.map(function (f) { return f.accion; })) === J(['Cambiar termo', 'Arreglar persiana', 'Pintar fachada', '=HYPERLINK("x")']), J(grp.filas.map(function (f) { return f.accion; })));
var orig = listaCasas(); V.filtrarOrdenar(orig, R.parse('#s=villa:desc&q=a'));
ok('no cambia la lista de entrada', J(orig.filas.map(function (f) { return f.villaid; })) === '[3,1,2,4]');

console.log('listaHtml');
var rt = R.parse('#t=2026&vm=c:12&v=lista:condicion&s=puntuacion:asc&q=');
var h = V.listaHtml(listaCasas(), rt, { vmNombre: 'Kike' });
ok('título con la cuenta, temporada y VM', h.indexOf('Casas por condición (peor primero, informes enviados)') >= 0 && h.indexOf('4 casas') >= 0 && h.indexOf('temporada 2026') >= 0 && h.indexOf('VM: Kike') >= 0, h.slice(0, 600));
ok('«‹ Cuadro» vuelve al cuadro con temporada y VM', h.indexOf('href="#t=2026&amp;vm=c:12">‹ Cuadro</a>') >= 0 || h.indexOf('href="#t=2026&vm=c:12">‹ Cuadro</a>') >= 0, h.slice(0, 400));
ok('cuenta «4 de 4 filas»', h.indexOf('4 de 4 filas') >= 0);
ok('caja de búsqueda con id q', /<input[^>]+type="search"[^>]+id="q"/.test(h));
ok('botón CSV de estas filas', h.indexOf('CSV de estas filas') >= 0 && h.indexOf('Vistas.bajarCsv(') >= 0);
ok('una fila por fila + cabecera', cuenta(h, '<tr data-href=') === 4);
ok('cada fila abre su casa con la lista de origen, orden y búsqueda',
  h.indexOf('href="' + R.href(rt, { v: 'casa:3', from: 'lista:condicion' }, ['s', 'q', 'g']).replace(/&/g, '&amp;') + '"') >= 0, R.href(rt, { v: 'casa:3', from: 'lista:condicion' }, ['s', 'q', 'g']));
ok('«Abrir ›» en cada fila', cuenta(h, 'Abrir ›') === 4);
ok('cabecera: la columna ordenada lleva ▲ y su enlace pasa a desc', h.indexOf('Condición ▲') >= 0 && h.indexOf('s=puntuacion:desc') >= 0, h);
ok('cabecera: otra columna enlaza a asc', h.indexOf('s=villa:asc') >= 0 && h.indexOf('s=fecha:asc') >= 0);
ok('enlaces de orden: guardan vista y temporada', /href="#t=2026&amp;vm=c:12&amp;v=lista:condicion&amp;s=villa:asc"/.test(h), (h.match(/href="[^"]*s=villa:asc[^"]*"/) || [])[0]);
ok('puntuación con coma decimal y su banda', h.indexOf('class="sc rojo">42,3<') >= 0 && h.indexOf('class="sc verde">96,2<') >= 0 && h.indexOf('class="sc ambar">75,0<') >= 0, h);
ok('sin puntuación = «—» gris', h.indexOf('class="sc gris">—<') >= 0);
ok('provisional marcado', h.indexOf('provisional') >= 0);
ok('fecha ISO se ve dd/mm/aaaa', h.indexOf('02/10/2026') >= 0 && h.indexOf('2026-10-02<') < 0);
ok('borrador lleva su etiqueta', h.indexOf('pill borrador') >= 0);
ok('texto escapado (Ático <b>)', h.indexOf('Ático &lt;b&gt;') >= 0 && h.indexOf('Ático <b>') < 0);
ok('celdas con su etiqueta para el móvil (data-l)', h.indexOf('data-l="Condición"') >= 0);
var hq = V.listaHtml(listaCasas(), R.parse('#t=2026&v=lista:condicion&q=rafa'));
ok('búsqueda: «2 de 4 filas» y su valor en la caja', hq.indexOf('2 de 4 filas') >= 0 && hq.indexOf('value="rafa"') >= 0 && cuenta(hq, '<tr data-href=') === 2);
ok('sin VM = «VM: todos»', hq.indexOf('VM: todos') >= 0);
var hv = V.listaHtml(listaCasas(), R.parse('#t=2026&v=lista:condicion&q=zzz'));
ok('búsqueda sin resultado: lista vacía que lo explica', hv.indexOf('Lista vacía') >= 0 && hv.indexOf('La búsqueda no encuentra ninguna fila') >= 0 && hv.indexOf('4 filas') >= 0 && hv.indexOf('búsqueda «zzz»') >= 0);
var le = listaCasas(); le.filas = [];
var he = V.listaHtml(le, R.parse('#t=2025&v=lista:condicion'));
ok('lista vacía: dice por qué (vacio de la lista)', he.indexOf('Lista vacía') >= 0 && he.indexOf('Ningún informe enviado con este filtro') >= 0 && he.indexOf('Temporada 2025') >= 0 && he.indexOf('<table') < 0);
ok('lista vacía: «0 casas»', he.indexOf('0 casas') >= 0);
var hu = V.listaHtml(null, R.parse('#t=2026&v=lista:raro'));
ok('lista desconocida: caja que lo dice y vuelta al cuadro', hu.indexOf('Lista desconocida') >= 0 && hu.indexOf('‹ Cuadro') >= 0);
var ho = V.listaHtml(listaObras(), R.parse('#t=2026&v=lista:obras:alta'));
ok('obras: cuenta en actuaciones', ho.indexOf('4 actuaciones') >= 0);
ok('obras: orígenes unidos con +', ho.indexOf('Resumen 1 + Baño 1') >= 0);
ok('obras: prioridad como en el formulario (Alto) y «sin prioridad»', ho.indexOf('class="pri alto">Alto<') >= 0 && ho.indexOf('class="pri sin">sin prioridad<') >= 0, ho);
ok('obras: coste «—» hasta la v5', ho.indexOf('>—<') >= 0);
ok('obras: chips de prioridad y «Agrupar por casa»', ho.indexOf('v=lista:obras:media') >= 0 && ho.indexOf('v=lista:obras:sindetalle') >= 0 && ho.indexOf('Agrupar por casa') >= 0);
ok('obras: la chip activa marcada', /class="chip on"[^>]*aria-pressed="true"[^>]*>Alto</.test(ho), (ho.match(/<a class="chip[^>]*>Alto<\/a>/) || [])[0]);
var hg = V.listaHtml(listaObras(), R.parse('#t=2026&v=lista:obras:todas&g=1'));
ok('agrupar: una fila de grupo por casa con su cuenta', cuenta(hg, 'class="grp"') === 2 && hg.indexOf('Buganvilla · 2 actuaciones') >= 0, hg);
ok('agrupar: la chip enlaza a quitarlo', hg.indexOf('✓ Agrupar por casa') >= 0);
var hc = V.listaHtml(listaCasas(), R.parse('#t=2026&v=lista:estado:borrador'));
ok('lista de estado: sin «informes enviados» en el título', hc.indexOf('informes enviados</small>') < 0 && hc.indexOf('· informes enviados') < 0);
var sinId = { titulo: 'Marcas', unidad: 'marcas', columnas: [{ clave: 'elemento', label: 'Elemento' }], filas: [{ elemento: 'Pintura' }], vacio: '' };
ok('fila sin villaid: sin enlace «Abrir»', V.listaHtml(sinId, R.parse('#t=2026&v=lista:marcas:malo')).indexOf('Abrir ›') < 0);
ok('una fila: «1 marca», singular', V.listaHtml(sinId, R.parse('#t=2026&v=lista:marcas:malo')).indexOf('1 marca ') >= 0);
ok('listaHtml guarda la lista visible para el CSV', V.ultimaLista && V.ultimaLista.filas.length === 1);

console.log('CSV de exactamente las filas visibles');
var recibido = null, descargas = [];
var docFalso = { body: { appendChild: function () {} }, createElement: function () { return { click: function () { descargas.push(this.download); }, remove: function () {} }; } };
var W2 = cargar(null, { Listas: { csv: function (l) { recibido = l; return '﻿a;b\r\n'; } }, document: docFalso, URL: { createObjectURL: function () { return 'blob:x'; }, revokeObjectURL: function () {} }, Blob: function () {}, setTimeout: function (f) { f(); } });
W2.Vistas.listaHtml(listaCasas(), W2.Rutas.parse('#t=2026&v=lista:condicion&q=rafa&s=villa:desc'));
var okCsv = W2.Vistas.bajarCsv();
ok('bajarCsv llama a Listas.csv con las 2 filas filtradas, en el orden visible', okCsv === true && recibido && J(recibido.filas.map(function (f) { return f.villaid; })) === '[1,4]', recibido && J(recibido.filas.map(function (f) { return f.villaid; })));
ok('bajarCsv conserva columnas y título', recibido.columnas.length === 5 && recibido.titulo === listaCasas().titulo);
ok('el archivo se llama por la lista y la temporada', descargas[0] === 'lista-condicion-2026.csv', descargas[0]);
var W3 = cargar(null, {});
ok('sin Listas cargado, bajarCsv no rompe (false)', W3.Vistas.bajarCsv() === false);

/* ── Casas de prueba (forma del contrato: lane C las construye) ── */
function L(seccion, clave, o) { var x = { informe_id: 50, seccion: seccion, clave: clave, estado: '', texto_1: '', texto_2: '', prioridad: '', foto_url: '' }; Object.keys(o || {}).forEach(function (k) { x[k] = o[k]; }); return x; }
function casaBase() {
  var lineas = EL.map(function (e, i) { return L(e.seccion, e.clave, { estado: 'Bueno', linea_id: 100 + i }); });
  lineas.forEach(function (l) { if (l.clave === 'instalacion_electrica') { l.estado = 'Malo'; l.texto_1 = 'Diferencial salta <siempre>'; } });
  lineas.push(L('interior', 'pintura', { estado: 'Regular', texto_1: 'Repintar salón', linea_id: 999 }));          /* repetida: gana la de linea_id más alto */
  lineas.push(L('resumen', 'accion_1', { texto_1: 'Cambiar termo', texto_2: 'Pierde agua', prioridad: 'Alta', orden: 1, linea_id: 300 }));
  lineas.push(L('estancia', 'bano_1', { texto_1: 'Cambiar termo', texto_2: 'Sustituir', prioridad: 'Media', orden: 5, linea_id: 301 }));
  lineas.push(L('estancia', 'otra_1', { texto_1: 'Lavadero: grifo gotea', prioridad: '', orden: 8, linea_id: 302 }));
  lineas.push(L('huesped', 'comentario_1', { texto_1: 'Falta un espejo', texto_2: 'Poner espejo en el baño', estado: 'Review', linea_id: 303 }));
  lineas.push(L('huesped', 'comentario_2', { texto_1: 'Ruido de la depuradora', estado: '', linea_id: 304 }));
  lineas.push(L('huesped', 'comentario_3', { texto_1: 'Pedir más toallas', estado: 'Propuesta', linea_id: 305 }));
  lineas.push(L('foto', 'foto_1', { foto_url: 'https://pub.example/x.jpg', texto_1: 'Cuadro eléctrico', linea_id: 306 }));
  return {
    villaid: 7, villa: 'Villa Galerna', vm: 'Kike', vmId: 'c:12', informe_id: 50, estado: 'enviado', general: 'bueno',
    fecha: '2026-10-20', updated: '2026-10-21T09:15:00', lineas: lineas,
    score: { bueno: 24, regular: 1, malo: 1, evaluados: 26, aplicables: 26, na: 0, puntuacion: 94.2, completo: true, banda: 'verde' },
    flags: { peligro: null, seguridad: ['instalacion_electrica'], coherencia: 'bueno_con_malo' },
    acciones: [{ texto: 'Cambiar termo', prioridad: 'Alta', motivo: 'Pierde agua', coste: null, fuentes: [{ seccion: 'resumen', clave: 'accion_1', orden: 1 }, { seccion: 'estancia', clave: 'bano_1', orden: 5 }] },
      { texto: 'grifo gotea', prioridad: '', motivo: 'Lavadero', coste: null, fuentes: [{ seccion: 'estancia', clave: 'otra_1', orden: 8 }] }],
    url: 'informe-temporada.html?villaid=7&temporada=2026', observaciones_finales: 'Casa en buen estado <general>.'
  };
}
function casaPrevia() { var c = casaBase(); c.informe_id = 20; c.fecha = '2025-10-10'; c.score = { bueno: 25, regular: 1, malo: 0, evaluados: 26, aplicables: 26, na: 0, puntuacion: 98.1, completo: true, banda: 'verde' }; return c; }
function listaNav() { return { titulo: 'Requiere atención', unidad: 'casas', columnas: [{ clave: 'villa', label: 'Casa' }], filas: [{ villaid: 5, villa: 'A' }, { villaid: 7, villa: 'Villa Galerna' }, { villaid: 7, villa: 'Villa Galerna' }, { villaid: 9, villa: 'C' }], vacio: '' }; }

console.log('navCasa: anterior y siguiente por la lista actual');
var rc = R.parse('#t=2026&vm=c:12&v=casa:7&from=lista:atencion');
var nv = V.navCasa(casaBase(), rc, listaNav());
ok('posición 2 de 3 (casas sin repetir)', nv.pos === 1 && nv.total === 3, J(nv));
ok('anterior y siguiente con from, orden y búsqueda', nv.prev === '#t=2026&vm=c:12&v=casa:5&from=lista:atencion' && nv.next === '#t=2026&vm=c:12&v=casa:9&from=lista:atencion', J(nv));
ok('título de la lista', nv.titulo === 'Requiere atención');
var nOrd = V.navCasa(casaBase(), R.parse('#t=2026&v=casa:7&s=villa:desc&from=lista:atencion'), listaNav());
ok('con orden: la lista en ese orden (Villa Galerna, C, A)', nOrd.pos === 0 && nOrd.prev === null && nOrd.next === '#t=2026&v=casa:9&s=villa:desc&from=lista:atencion', J(nOrd));
var nArr = V.navCasa(casaBase(), R.parse('#t=2026&v=casa:7'), [{ villaid: 7 }, { villaid: 8 }]);
ok('sin lista de origen: las casas del cuadro (array)', nArr.pos === 0 && nArr.total === 2 && nArr.next === '#t=2026&v=casa:8' && nArr.titulo === 'Casas del cuadro', J(nArr));
var nFuera = V.navCasa(casaBase(), rc, { titulo: 'X', columnas: [], filas: [{ villaid: 1 }] });
ok('casa fuera de la lista: sin anterior ni siguiente', nFuera.pos === -1 && nFuera.prev === null && nFuera.next === null);
ok('sin lista: sin navegación', V.navCasa(casaBase(), rc, null).total === 0);

console.log('casaHtml: casa con informe enviado, sin temporada anterior, sin Extras');
var hc1 = V.casaHtml(casaBase(), null, rc, listaNav());
ok('nombre, VM y temporada', hc1.indexOf('<h2>Villa Galerna</h2>') >= 0 && hc1.indexOf('Kike') >= 0 && hc1.indexOf('Temporada 2026') >= 0);
ok('volver a la lista («‹ Lista»)', hc1.indexOf('href="#t=2026&amp;vm=c:12&amp;v=lista:atencion">‹ Lista</a>') >= 0, (hc1.match(/<a class="atras"[^>]*>[^<]*<\/a>/) || [])[0]);
ok('«casa 2 de 3 en «Requiere atención»»', hc1.indexOf('casa 2 de 3') >= 0 && hc1.indexOf('Requiere atención') >= 0);
ok('anterior y siguiente como enlaces', hc1.indexOf('href="#t=2026&amp;vm=c:12&amp;v=casa:5&amp;from=lista:atencion"') >= 0 && hc1.indexOf('Siguiente ›') >= 0);
ok('navActual para las teclas ← →', V.navActual && V.navActual.next === '#t=2026&vm=c:12&v=casa:9&from=lista:atencion');
ok('puntuación con banda y coma', hc1.indexOf('class="sc verde">94,2<') >= 0);
ok('completitud 26/26 y «final»', hc1.indexOf('26/26') >= 0 && hc1.indexOf('final') >= 0);
ok('fechas guardadas: revisión y último guardado', hc1.indexOf('20/10/2026') >= 0 && hc1.indexOf('21/10/2026') >= 0);
ok('estado Enviado e historial no disponible antes de la v5', hc1.indexOf('pill enviado') >= 0 && hc1.indexOf('historial no disponible antes de la v5') >= 0);
ok('sin fecha de envío inventada', hc1.indexOf('Envío:') < 0);
ok('estado general', hc1.indexOf('Estado general: Bueno') >= 0);
ok('bandera de seguridad con el elemento', hc1.indexOf('Revisión de seguridad') >= 0 && hc1.indexOf('Instalación eléctrica') >= 0);
ok('bandera de coherencia (Bueno con Malo)', hc1.indexOf('Estado general «Bueno» con 1 marca Malo') >= 0, (hc1.match(/❓[^<]*/) || [])[0]);
ok('peligro sin dato hasta la v5', hc1.indexOf('dato del formulario v5') >= 0);
ok('«Abrir formulario» = el enlace real del formulario', hc1.indexOf('href="informe-temporada.html?villaid=7&amp;temporada=2026"') >= 0 && hc1.indexOf('Abrir formulario') >= 0);
ok('«Imprimir casa»', hc1.indexOf('Imprimir casa') >= 0 && hc1.indexOf('window.print()') >= 0);
ok('las 26 comprobaciones en tres grupos', cuenta(hc1, 'data-l="Elemento"') === 26 && hc1.indexOf('Interior') >= 0 && hc1.indexOf('Exterior') >= 0 && hc1.indexOf('Seguridad e instalaciones') >= 0);
ok('fila repetida: gana la de linea_id más alto (Pintura en Regular)', /Pintura interior[^]*?class="mk r">Regular</.test(hc1) && hc1.indexOf('Repintar salón') >= 0);
ok('observación escapada', hc1.indexOf('Diferencial salta &lt;siempre&gt;') >= 0);
ok('incidencias por estancia con su nombre', hc1.indexOf('Baño 1') >= 0 && hc1.indexOf('Lavadero') >= 0 && hc1.indexOf('grifo gotea') >= 0);
ok('actuaciones por prioridad con origen y unidas', hc1.indexOf('Cambiar termo') >= 0 && hc1.indexOf('Origen: Resumen 1 + Baño 1') >= 0 && hc1.indexOf('unidas: mismo texto') >= 0, (hc1.match(/Origen:[^<]*/g) || []).join(' | '));
ok('actuación sin prioridad: grupo propio y «sin detalle»', hc1.indexOf('Sin prioridad') >= 0 && hc1.indexOf('sin detalle') >= 0);
ok('coste «—» hasta la v5', hc1.indexOf('Coste: —') >= 0);
ok('comentarios por origen, con «Sin origen»', hc1.indexOf('>Review<') >= 0 && hc1.indexOf('>Propuesta<') >= 0 && hc1.indexOf('>Sin origen<') >= 0 && hc1.indexOf('Ruido de la depuradora') >= 0);
ok('orden de los orígenes: Review, Parte, Propuesta, Sin origen', hc1.indexOf('>Review<') < hc1.indexOf('>Propuesta<') && hc1.indexOf('>Propuesta<') < hc1.indexOf('>Sin origen<'));
ok('observaciones finales escapadas', hc1.indexOf('Casa en buen estado &lt;general&gt;.') >= 0);
ok('Malo sin actuación: 0 (hay actuaciones)', hc1.indexOf('Malo sin actuación: 0') >= 0);
ok('comparación sin Extras: aviso, sin romper', hc1.indexOf('Comparación con 2025') >= 0 && hc1.indexOf('class="mot"') >= 0);
ok('galería sin Extras: aviso con el número de fotos', hc1.indexOf('1 foto') >= 0);

console.log('casaHtml: con Extras (carril E) y temporada anterior');
var llamadas = [];
var WE = cargar({ comparacionHtml: function (a, b) { llamadas.push(['cmp', a.villaid, b && b.informe_id]); return '<div class="cmp-x">COMPARA</div>'; }, galeriaHtml: function (a) { llamadas.push(['gal', a.villaid]); return '<div class="gal-x">GALERIA</div>'; } });
var he1 = WE.Vistas.casaHtml(casaBase(), casaPrevia(), WE.Rutas.parse('#t=2026&v=casa:7'), [{ villaid: 7 }]);
ok('llama a Extras.comparacionHtml(casa, casaPrev)', J(llamadas[0]) === J(['cmp', 7, 20]) && he1.indexOf('COMPARA') >= 0, J(llamadas));
ok('llama a Extras.galeriaHtml(casa)', llamadas.some(function (x) { return x[0] === 'gal' && x[1] === 7; }) && he1.indexOf('GALERIA') >= 0);
ok('sin lista de origen: «‹ Cuadro»', he1.indexOf('>‹ Cuadro</a>') >= 0);
llamadas = [];
var he2 = WE.Vistas.casaHtml(casaBase(), null, WE.Rutas.parse('#t=2026&v=casa:7'), [{ villaid: 7 }]);
ok('sin temporada anterior: Extras recibe null y decide el texto', llamadas[0] && llamadas[0][0] === 'cmp' && llamadas[0][2] == null && he2.indexOf('COMPARA') >= 0, J(llamadas));

console.log('casaHtml: casos límite');
var sinInf = { villaid: 8, villa: 'Casa Vacía', vm: '', vmId: '', informe_id: null, estado: '', general: '', fecha: '', updated: '', lineas: [], score: null, flags: null, acciones: [], url: 'informe-temporada.html?villaid=8&temporada=2026' };
var hs = V.casaHtml(sinInf, null, R.parse('#t=2026&v=casa:8'), [{ villaid: 8 }]);
ok('sin informe: caja que lo dice, sin las 26', hs.indexOf('no tiene informe en la temporada 2026') >= 0 && hs.indexOf('data-l="Elemento"') < 0 && hs.indexOf('pill sin') >= 0);
ok('sin informe: «—» gris y «sin informe»', hs.indexOf('class="sc gris">—<') >= 0 && hs.indexOf('sin informe') >= 0);
ok('sin informe: «Abrir formulario» sigue', hs.indexOf('Abrir formulario') >= 0);
var bor = casaBase(); bor.estado = 'borrador'; bor.score = { bueno: 10, regular: 0, malo: 0, evaluados: 10, aplicables: 26, na: 0, puntuacion: 100, completo: false, banda: 'verde' };
var hb = V.casaHtml(bor, null, R.parse('#t=2026&v=casa:7'), null);
ok('borrador: puntuación gris de vista previa, 10/26', hb.indexOf('class="sc gris">100,0<') >= 0 && hb.indexOf('10/26') >= 0 && hb.indexOf('vista previa') >= 0 && hb.indexOf('pill borrador') >= 0);
var msa = casaBase(); msa.acciones = []; msa.score.malo = 2;
ok('Malo sin actuación: 2 marcas Malo y ninguna actuación', V.casaHtml(msa, null, rc, null).indexOf('Malo sin actuación: 2 marcas Malo y ninguna actuación') >= 0);
var err = casaBase(); err.score = { puntuacion: null, error: 'datos', banda: 'gris', evaluados: 0, aplicables: 26 };
ok('datos con error: lo dice', V.casaHtml(err, null, rc, null).indexOf('datos con error') >= 0);
var sinUrl = casaBase(); delete sinUrl.url;
ok('sin url: el enlace del formulario se construye', V.casaHtml(sinUrl, null, R.parse('#t=2026&v=casa:7'), null).indexOf('href="informe-temporada.html?villaid=7&amp;temporada=2026"') >= 0);
var hNoScore = cargar(null); delete hNoScore.InformeScore;
ok('sin InformeScore: aviso en lugar de las 26, sin romper', hNoScore.Vistas.casaHtml(casaBase(), null, rc, null).indexOf('informe-temporada-score.js') >= 0);
var vac = casaBase(); vac.lineas = vac.lineas.filter(function (l) { return ['interior', 'exterior', 'seguridad'].indexOf(l.seccion) >= 0; }); vac.acciones = []; vac.observaciones_finales = '';
var hvac = V.casaHtml(vac, null, rc, null);
ok('sin incidencias, actuaciones, comentarios ni fotos: frases vacías', hvac.indexOf('Ninguna incidencia por estancia') >= 0 && hvac.indexOf('Ninguna actuación registrada') >= 0 && hvac.indexOf('Ningún comentario de huéspedes') >= 0 && hvac.indexOf('Este informe no tiene fotos') >= 0);
ok('casa nula: caja «Casa no encontrada»', V.casaHtml(null, null, rc, null).indexOf('Casa no encontrada') >= 0);

console.log('ronda de arreglos 1: hoja de Rafa al imprimir, origen en las obras, marcas de la puntuación, acción recomendada, informe repetido');
var hoja = (hc1.match(/<div class="hoja-print">[^]*?<\/div><!--hoja-->/) || [''])[0];
ok('impresión: una hoja como la de Rafa (Elemento | Bueno | Regular | Malo | Observaciones / acción recomendada), solo en papel', hoja.length > 0
  && hoja.indexOf('<th class="c-el">Elemento</th><th class="c-st">Bueno</th><th class="c-st">Regular</th><th class="c-st">Malo</th><th class="c-obs-h">Observaciones / acción recomendada</th>') >= 0, hoja.slice(0, 300));
ok('impresión: las tres secciones con el título del formulario', hoja.indexOf('2. Interior') >= 0 && hoja.indexOf('3. Exterior') >= 0 && hoja.indexOf('4. Seguridad e instalaciones') >= 0);
ok('impresión: X en la columna de la marca y ☐ en las otras (Instalación eléctrica en Malo, con su observación escapada)',
  /<td class="c-el">Instalación eléctrica[^<]*<\/td><td class="c-st">☐<\/td><td class="c-st">☐<\/td><td class="c-st">X<\/td><td class="c-obs">Diferencial salta &lt;siempre&gt;<\/td>/.test(hoja), (hoja.match(/<tr><td class="c-el">Instalación[^]*?<\/tr>/) || [])[0]);
ok('impresión: 26 filas, una por elemento', (hoja.match(/<td class="c-el">/g) || []).length === 26);
ok('pantalla: la tabla de las 26 lleva solo-pantalla y su bloque se puede partir entre hojas (checks)', /<div class="card blk checks">/.test(hc1) && /<table class="stack solo-pantalla">/.test(hc1));
var hoE = V.listaHtml(listaObras(), R.parse('#t=2026&v=lista:obras:alta'));
ok('obras (nivel 2): grupo Origen con Todos / Resumen / Estancia que guarda la prioridad', hoE.indexOf('<span>Origen</span>') >= 0 && hoE.indexOf('v=lista:obras:alta:resumen') >= 0 && hoE.indexOf('v=lista:obras:alta:estancia') >= 0);
var hoE2 = V.listaHtml(listaObras(), R.parse('#t=2026&v=lista:obras:alta:estancia'));
ok('obras con origen Estancia: chip encendida y la prioridad guarda el origen', /class="chip on"[^>]*aria-pressed="true"[^>]*>Estancia</.test(hoE2) && hoE2.indexOf('v=lista:obras:media:estancia') >= 0 && /class="chip on"[^>]*>Alto</.test(hoE2));
var SC = (function () { var c = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(DIR, 'informe-temporada-score.js'), 'utf8'), c); return c.window.InformeScore; })();
var WS = cargar(null, { InformeScore: SC });
var cDup = casaBase(); cDup.lineas = cDup.lineas.filter(function (l) { return l.clave !== 'pintura'; });
cDup.lineas.unshift(L('interior', 'pintura', { estado: 'Bueno', texto_1: 'id alto', linea_id: 5000 })); cDup.lineas.push(L('interior', 'pintura', { estado: 'Malo', texto_1: 'la última', linea_id: 7 }));
var hDup = WS.Vistas.casaHtml(cDup, null, rc, null);
ok('fila repetida con la puntuación cargada: la casa da la marca de la puntuación (la última en orden: Malo)', /Pintura interior[^]*?class="mk m">Malo</.test(hDup) && hDup.indexOf('la última') >= 0 && hDup.indexOf('id alto') < 0);
var acc1 = (hc1.split('<h3>Actuaciones')[1] || '').split('<h3>')[0];
ok('actuaciones: la acción recomendada de la estancia sale con la actuación', acc1.indexOf('Acción recomendada: Sustituir') >= 0, acc1.slice(0, 300));
var cDos = casaBase(); cDos.informes = 2; cDos.informeFormulario = 31;
var hDos = V.casaHtml(cDos, null, rc, null);
ok('dos informes de la casa en la temporada: aviso junto a «Abrir formulario» con el que abre el formulario y el que puntúa el cuadro', /2 informes de esta casa en 2026: el formulario abre el nº 31; el cuadro puntúa el nº 50/.test(hDos) && hc1.indexOf('informes de esta casa') < 0);
var hNa = V.listaHtml({ titulo: 'N/A', unidad: 'casas', columnas: [{ clave: 'villa', label: 'Casa' }, { clave: 'marca', label: 'Marca' }], filas: [{ villaid: 1, villa: 'A', marca: 'N/A' }], vacio: '' }, R.parse('#t=2026&v=lista:mapa:sofas:na'));
ok('marca N/A en una lista se ve «N/A» (no «Sin marcar»)', hNa.indexOf('class="mk na">N/A<') >= 0);

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
