/* Pruebas del nivel 1 del cuadro de informes de temporada v3 (lane C de informe-cuadro-v3a, 29/10/2026).
   node cuadro-informes-temporada-portada.test.js
   Carga cuadro-informes-temporada-portada.js (Portada) sin red. Las piezas de otras lanes se cargan si están en la carpeta:
   - informe-temporada-score.js (lane A, InformeScore). Si falta, se usa un SUSTITUTO de prueba de este fichero que sigue
     el contrato (Consensus v2); las cifras esperadas de abajo están calculadas a mano con la fórmula, no con el sustituto.
   - cuadro-informes-temporada-rutas.js (lane B, Rutas). Si falta, Portada usa su propio href con el formato de la maqueta.
   - cuadro-informes-temporada-listas.js + cuadro-informes-temporada-fixtures.js (lane D). Con los dos, la parte 9 comprueba
     que cada cifra del nivel 1 es igual al número de filas de su lista (puerta por puerta). Sin ellos, la parte 9 dice OMITIDA. */
var fs = require('fs'), path = require('path');
var pass = 0, fail = 0, omitidas = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '  -> ' + e : '')); } }
function J(x) { return JSON.stringify(x); }
function safe(f) { try { return f(); } catch (e) { return e; } }
function cargarSiExiste(f) { var p = path.join(__dirname, f); return fs.existsSync(p) ? require(p) : null; }

var Portada;
try { Portada = require('./cuadro-informes-temporada-portada.js'); } catch (e) { ok('existe cuadro-informes-temporada-portada.js', false, e.message); console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(1); }

/* ── Sustituto de InformeScore (solo si la lane A no está): contrato de LANES-JOB1.md y del paquete, slice A ── */
var SEG = ['instalacion_electrica', 'cerraduras', 'fontaneria_agua_caliente', 'barandillas', 'pavimentos', 'piscina'];
var DEF = (function () {
  var s = function (sec, cl) { return cl.map(function (c) { return { seccion: sec, clave: c, label: c }; }); };
  return [].concat(
    s('interior', ['pintura', 'colchones', 'sofas', 'mobiliario_cocina', 'menaje', 'electrodomesticos', 'aire_acondicionado', 'puertas', 'ventanas', 'banos', 'desagues', 'iluminacion', 'humedades']),
    s('exterior', ['fachada', 'carpinteria_exterior', 'pavimentos', 'barandillas', 'jardin_muros', 'piscina', 'mobiliario_exterior', 'barbacoa', 'iluminacion_exterior']),
    s('seguridad', ['cerraduras', 'instalacion_electrica', 'fontaneria_agua_caliente', 'wifi_tv']));
})();
var SUSTITUTO = {
  elementosDef: function () { return DEF.map(function (e) { return { seccion: e.seccion, clave: e.clave, label: e.label }; }); },
  elementosSeguridad: function () { return SEG.slice(); },
  redondear1: function (x) { return x == null ? null : Math.floor(x * 10 + 0.5 + 1e-9) / 10; },
  condicion: function (ls) {
    var m = {}, err = false, b = 0, r = 0, ma = 0, na = 0, lw = function (s) { return String(s == null ? '' : s).trim().toLowerCase(); };
    var es = {}; DEF.forEach(function (e) { es[e.seccion + '|' + e.clave] = 1; });
    (ls || []).forEach(function (l) {
      if (!l || !es[l.seccion + '|' + l.clave]) return;
      if (m[l.clave]) { err = true; return; } m[l.clave] = 1;
      var e = lw(l.estado);
      if (l.na) na++; else if (e === 'bueno') b++; else if (e === 'regular') r++; else if (e === 'malo') ma++; else if (e) err = true;
    });
    var ev = b + r + ma, ap = 26 - na, p = (!err && ev) ? SUSTITUTO.redondear1(100 * (2 * b + r) / (2 * ev)) : null;
    return { bueno: b, regular: r, malo: ma, evaluados: ev, aplicables: ap, na: na, puntuacion: p, completo: !err && ev === ap && ap > 0,
      banda: p == null ? 'gris' : p < 50 ? 'rojo' : p < 80 ? 'ambar' : 'verde', error: err ? 'datos' : undefined };
  },
  banderas: function (inf, ls) {
    var c = SUSTITUTO.condicion(ls), lw = function (s) { return String(s == null ? '' : s).trim().toLowerCase(); }, g = inf ? lw(inf.estado_general) : '';
    var seg = SEG.filter(function (k) { return (ls || []).some(function (l) { return l.clave === k && l.seccion !== 'resumen' && l.seccion !== 'estancia' && lw(l.estado) === 'malo'; }); });
    return { peligro: null, seguridad: seg, coherencia: g === 'bueno' && c.malo > 0 ? 'bueno_con_malo' : g === 'malo' && c.evaluados > 0 && c.bueno === c.evaluados ? 'malo_todo_bueno' : null };
  },
  acciones: function (ls) {
    var R = { Alta: 3, Media: 2, Baja: 1, '': 0 }, m = {}, out = [], may = function (s) { s = String(s || '').trim().toLowerCase(); return { alta: 'Alta', media: 'Media', baja: 'Baja', alto: 'Alta', medio: 'Media', bajo: 'Baja' }[s] || ''; };
    (ls || []).forEach(function (l) {
      if (!l || (l.seccion !== 'resumen' && l.seccion !== 'estancia')) return;
      var t = String(l.texto_1 || '').trim(); if (!t) return;
      var p = may(l.prioridad), mot = l.seccion === 'resumen' ? String(l.texto_2 || '').trim() : String(l.clave), a = m[t];
      if (!a) { a = m[t] = { texto: t, prioridad: p, motivo: mot, fuentes: [], coste: null }; out.push(a); }
      else { if (R[p] > R[a.prioridad]) a.prioridad = p; if (!a.motivo) a.motivo = mot; }
      a.fuentes.push({ seccion: l.seccion, clave: l.clave, orden: l.orden });
    });
    return out;
  },
  comparar: function (A, B) {
    var lw = function (s) { return String(s == null ? '' : s).trim().toLowerCase(); }, ev = function (x) { return x === 'bueno' || x === 'regular' || x === 'malo'; };
    var ma = {}, mb = {}; (A || []).forEach(function (l) { ma[l.seccion + '|' + l.clave] = lw(l.estado); }); (B || []).forEach(function (l) { mb[l.seccion + '|' + l.clave] = lw(l.estado); });
    var com = DEF.filter(function (e) { var k = e.seccion + '|' + e.clave; return ev(ma[k]) && ev(mb[k]); });
    var pu = function (m) { var b = 0, r = 0; com.forEach(function (e) { var x = m[e.seccion + '|' + e.clave]; if (x === 'bueno') b++; else if (x === 'regular') r++; }); return com.length ? SUSTITUTO.redondear1(100 * (2 * b + r) / (2 * com.length)) : null; };
    return { n: com.length, puntuacionA: pu(ma), puntuacionB: pu(mb),
      cambios: com.filter(function (e) { var k = e.seccion + '|' + e.clave; return ma[k] !== mb[k]; }).map(function (e) { var k = e.seccion + '|' + e.clave; return { clave: e.clave, de: ma[k], a: mb[k] }; }),
      repetidos: com.filter(function (e) { var k = e.seccion + '|' + e.clave; return ma[k] !== 'bueno' && mb[k] !== 'bueno'; }).map(function (e) { return e.clave; }) };
  }
};
var Score = cargarSiExiste('informe-temporada-score.js');
console.log(Score ? 'InformeScore: el de la lane A (informe-temporada-score.js)' : 'InformeScore: SUSTITUTO de prueba (falta informe-temporada-score.js de la lane A)');
var Rutas = cargarSiExiste('cuadro-informes-temporada-rutas.js');
console.log(Rutas ? 'Rutas: el de la lane B' : 'Rutas: href propio de Portada (falta cuadro-informes-temporada-rutas.js de la lane B)');
safe(function () { Portada.usar({ InformeScore: Score || SUSTITUTO, Rutas: Rutas || null }); });

/* ── Fixture propio: 10 villas, 3 villa managers + una casa sin villa manager, dos temporadas ── */
var KEYS = DEF.map(function (e) { return e.clave; }), SEC = {}; DEF.forEach(function (e) { SEC[e.clave] = e.seccion; });
var LID = 1;
function marcas(inf, f) { return KEYS.map(function (k, i) { var e = f(k, i); return e === null ? null : { linea_id: LID++, informe_id: inf, seccion: SEC[k], clave: k, estado: e, texto_1: e === 'Malo' ? 'obs ' + k : '', texto_2: '', prioridad: '', orden: i + 1 }; }).filter(Boolean); }
function linea(inf, sec, clave, t1, t2, pri, est) { return { linea_id: LID++, informe_id: inf, seccion: sec, clave: clave, estado: est || '', texto_1: t1 || '', texto_2: t2 || '', prioridad: pri || '', orden: 1 }; }
var todo = function (m) { return function () { return m; }; };
var VILLAS = [
  { villaid: 1, Name: 'Villa Alba', KeyHolder_person: '1' }, { villaid: 2, Name: 'Son Bou', KeyHolder_person: '1' },
  { villaid: 3, Name: 'Cala Mitjana', KeyHolder_person: '2' }, { villaid: 4, Name: 'Casa <Brisa>', KeyHolder_person: '2' },
  { villaid: 5, Name: 'Villa Duna', KeyHolder_person: '7' }, { villaid: 6, Name: 'Es Castell', KeyHolder_person: '' },
  { villaid: 7, Name: 'Binibeca', KeyHolder_person: '1' }, { villaid: 8, Name: 'Torret', KeyHolder_person: '2' },
  { villaid: 9, Name: 'Alcaufar', KeyHolder_person: '1' }, { villaid: 10, Name: 'Llucalari', KeyHolder_person: '2' }];
var CONTACTS = [{ id: '1', name: 'Kike' }, { id: '2', name: 'Rafa' }], USERS = [{ id: '7', name: 'Nazaret' }];
function inf(id, villa, estado, gen, extra) { return Object.assign({ informe_id: id, villaid: villa, temporada: 2026, estado: estado, estado_general: gen || '', fecha_revision: '2026-10-1' + (id % 10) + 'T00:00:00', updated_at: '' }, extra || {}); }
var INFORMES = [
  inf(10, 1, 'enviado', 'Bueno', { updated_at: '2026-10-20T10:00:00' }),
  inf(20, 2, 'enviado', 'Bueno', { updated_at: '2026-10-20T10:00:00' }),
  inf(30, 3, 'enviado', 'Bueno', { updated_at: '2026-10-25T10:00:00' }), inf(31, 3, 'enviado', 'Regular', { updated_at: '2026-10-21T10:00:00' }),
  inf(40, 4, 'Enviado', 'Bueno', { updated_at: '2026-10-22T10:00:00' }),
  inf(50, 5, 'borrador', '', { updated_at: '2026-10-28T10:00:00' }),
  inf(70, 7, 'enviado', '', {}),
  inf(80, 8, 'enviado', 'Malo', { updated_at: '2026-10-01T10:00:00' }), inf(81, 8, 'borrador', '', { updated_at: '2026-10-28T10:00:00' }),
  inf(90, 9, 'enviado', 'Regular', {}), inf(91, 9, 'enviado', 'Regular', {}),
  inf(100, 10, 'enviado', 'Bueno', { enviado_at: '2026-10-27T10:00:00', updated_at: '2026-10-20T10:00:00' }), inf(101, 10, 'enviado', 'Malo', { updated_at: '2026-10-28T10:00:00' })];
var LINEAS = [].concat(
  marcas(10, todo('Bueno')), [linea(10, 'resumen', 'accion_1', 'Pintar fachada', 'desconchado', 'Media'), linea(10, 'huesped', 'tema_1', 'Ruido de la depuradora', '', '', 'Review'), linea(10, 'huesped', 'tema_2', '', '', '', 'Review'), linea(10, 'foto', 'foto_1', 'Fachada', '', '')],
  marcas(20, function (k) { return k === 'instalacion_electrica' ? 'Malo' : 'Bueno'; }), [linea(20, 'resumen', 'accion_1', 'Cambiar cuadro eléctrico', 'el diferencial salta', 'Alta'), linea(20, 'estancia', 'salon', 'Cambiar cuadro eléctrico', '', 'Alta'), linea(20, 'huesped', 'tema_1', 'Wifi lento', '', '', 'Parte')],
  marcas(30, function (k, i) { return i < 13 ? 'Bueno' : 'Malo'; }),
  [linea(30, 'estancia', 'cocina', 'Horno no calienta', '', '')],
  marcas(31, function (k, i) { return i < 13 ? 'Bueno' : 'Regular'; }), [linea(31, 'resumen', 'accion_1', 'Informe 31: no cuenta', 'x', 'Alta')],
  marcas(40, function (k, i) { return k === 'pintura' ? 'Malo' : i >= 20 ? null : 'Bueno'; }),
  marcas(50, todo('Malo')), [linea(50, 'resumen', 'accion_1', 'Rehacer piscina', 'grietas', 'Alta')],
  [linea(70, 'resumen', 'accion_1', '', '', '')],
  marcas(80, todo('Bueno')), marcas(81, todo('Malo')), [linea(81, 'resumen', 'accion_1', 'Borrador: no cuenta', 'x', 'Alta')],
  marcas(90, todo('Malo')), marcas(91, todo('Regular')),
  marcas(100, todo('Bueno')), marcas(101, todo('Malo')));
/* Temporada anterior (2025): Alba y Son Bou enviados (pares), Cala Mitjana solo borrador (no es par) */
var INF_PREV = [inf(1010, 1, 'enviado', 'Bueno', { temporada: 2025 }), inf(1020, 2, 'enviado', 'Bueno', { temporada: 2025 }), inf(1030, 3, 'borrador', '', { temporada: 2025 })];
var LIN_PREV = [].concat(
  marcas(1010, function (k) { return k === 'pintura' ? 'Regular' : 'Bueno'; }),
  marcas(1020, function (k) { return k === 'instalacion_electrica' ? 'Malo' : k === 'pintura' ? 'Regular' : 'Bueno'; }),
  marcas(1030, todo('Malo')));

var CASAS = safe(function () { return Portada.construirCasasV3(VILLAS, INFORMES, LINEAS, CONTACTS, USERS, 2026); });
var PREV = safe(function () { return Portada.construirCasasV3(VILLAS, INF_PREV, LIN_PREV, CONTACTS, USERS, 2025); });
if (!Array.isArray(CASAS)) CASAS = [];
if (!Array.isArray(PREV)) PREV = [];
function casa(id) { return CASAS.filter(function (c) { return c.villaid === id; })[0] || {}; }

console.log('1. construirCasasV3: una fila por villa activa con la forma del contrato');
ok('10 casas, en el orden de las villas', CASAS.length === 10 && CASAS.map(function (c) { return c.villaid; }).join(',') === '1,2,3,4,5,6,7,8,9,10', J(CASAS.map(function (c) { return c.villaid; })));
var c1 = casa(1);
ok('campos del contrato presentes', ['villaid', 'villa', 'vm', 'vmId', 'informe_id', 'estado', 'general', 'fecha', 'updated', 'lineas', 'score', 'flags', 'acciones', 'url'].every(function (k) { return k in c1; }), J(Object.keys(c1)));
/* Integración: la casa lleva el texto final de la cabecera (observaciones_finales) para Vistas.casaHtml; sin informe = '' */
var cOF = safe(function () { return Portada.construirCasasV3([{ villaid: 1, Name: 'A' }, { villaid: 2, Name: 'B' }], [{ informe_id: 9, villaid: 1, estado: 'enviado', observaciones_finales: '  Todo listo <b>  ' }], [], [], [], 2026); }) || [];
ok('integración: observaciones_finales de la cabecera en la casa (recortado); sin informe vacío', cOF[0] && cOF[0].observaciones_finales === 'Todo listo <b>' && cOF[1] && cOF[1].observaciones_finales === '', J(cOF.map && cOF.map(function (c) { return c.observaciones_finales; })));
ok('villa manager: contacto c:1 Kike, usuario u:7 Nazaret, sin villa manager vacío', c1.vm === 'Kike' && c1.vmId === 'c:1' && casa(5).vmId === 'u:7' && casa(5).vm === 'Nazaret' && casa(6).vmId === '' && casa(6).vm === '');
ok('estado: enviado (también "Enviado"), borrador, "" sin informe', c1.estado === 'enviado' && casa(4).estado === 'enviado' && casa(5).estado === 'borrador' && casa(6).estado === '' && casa(6).informe_id === null);
ok('general en minúsculas; fecha = fecha_revision AAAA-MM-DD', c1.general === 'bueno' && c1.fecha === '2026-10-10' && casa(7).general === '', c1.general + ' ' + c1.fecha);
ok('url = el formulario real de esa villa y temporada', c1.url === 'informe-temporada.html?villaid=1&temporada=2026', c1.url);
ok('lineas = solo las del informe elegido', c1.lineas.length === 26 + 4 && c1.lineas.every(function (l) { return l.informe_id === 10; }), c1.lineas.length);
ok('score, flags y acciones vienen de InformeScore', c1.score && c1.score.puntuacion === 100 && c1.score.completo === true && J(c1.flags.seguridad) === '[]' && c1.acciones.length === 1, J(c1.score));
ok('sin informe: score gris sin puntuación, sin banderas ni acciones', casa(6).score.puntuacion === null && casa(6).score.banda === 'gris' && J(casa(6).flags.seguridad) === '[]' && casa(6).flags.peligro === null && casa(6).acciones.length === 0, J(casa(6).score));
ok('acciones con el mismo texto en resumen y estancia = una (Son Bou)', casa(2).acciones.length === 1 && casa(2).acciones[0].prioridad === 'Alta' && casa(2).acciones[0].fuentes.length === 2, J(casa(2).acciones));

console.log('2. Regla del último enviado (v2 tomaba el informe_id más bajo)');
ok('dos enviados: gana el updated_at más reciente aunque tenga el id más bajo (Cala Mitjana -> 30)', casa(3).informe_id === 30, casa(3).informe_id);
ok('enviados sin fechas: gana el informe_id más alto (Alcaufar -> 91, no 90 como en v2)', casa(9).informe_id === 91, casa(9).informe_id);
ok('enviado_at manda sobre updated_at (Llucalari -> 100)', casa(10).informe_id === 100 && casa(10).enviado_at === '2026-10-27T10:00:00', casa(10).informe_id);
ok('un borrador más nuevo nunca desplaza a un enviado (Torret -> 80, enviado)', casa(8).informe_id === 80 && casa(8).estado === 'enviado', casa(8).informe_id);
ok('solo borradores: el borrador más reciente, estado borrador (Villa Duna)', casa(5).informe_id === 50 && casa(5).estado === 'borrador');
var masNuevo = safe(function () { return Portada.construirCasasV3([{ villaid: 1, Name: 'X' }], [inf(5, 1, 'borrador', '', { updated_at: '2026-10-01T00:00:00' }), inf(6, 1, 'borrador', '', { updated_at: '2026-10-02T00:00:00' })], [], [], [], 2026); });
ok('dos borradores: el de updated_at más reciente', masNuevo[0] && masNuevo[0].informe_id === 6, J(masNuevo));
ok('Cala Mitjana puntúa su informe 30 (13 Bueno + 13 Malo = 50,0) y no el 31', casa(3).score.puntuacion === 50, casa(3).score.puntuacion);
ok('Alcaufar puntúa el 91 (26 Regular = 50,0)', casa(9).score.puntuacion === 50 && casa(9).score.completo === true, J(casa(9).score));

console.log('3. tilesV3: los seis cuadros (solo cuentan los informes ENVIADOS)');
var T = safe(function () { return Portada.tilesV3(CASAS, PREV); }) || {};
var E = T.entregados || {}, C = T.condicion || {}, A = T.alertas || {}, O = T.obras || {}, K = T.coste || {}, R = T.review || {};
ok('Entregados 8 de 10, 1 borrador, 1 sin informe', E.n === 8 && E.de === 10 && E.borrador === 1 && E.sin === 1, J(E));
/* Completos y enviados: Alba 100, Son Bou 96,2, Cala 50, Torret 100, Alcaufar 50, Llucalari 100 -> media 82,7; Brisa provisional, Binibeca sin puntuación */
ok('Condición media 82,7 sobre 6 de 8 (finales de enviados)', C.media === 82.7 && C.n === 6 && C.N === 8 && C.provisionales === 2, J(C));
ok('Condición: banda de la media (verde >= 80)', C.banda === 'verde', C.banda);
ok('Condición: la más baja = Alcaufar 50,0 (empate con Cala Mitjana: por nombre)', C.peor && C.peor.villaid === 9 && C.peor.puntuacion === 50, J(C.peor));
/* Pares 2025-2026: Alba 98,1 -> 100,0, Son Bou 94,2 -> 96,2: medias 96,2 -> 98,1 en 2 casas */
ok('Condición vs temporada anterior: 2 casas, 96,2 -> 98,1', C.comparacion && C.comparacion.casas === 2 && C.comparacion.mediaPrev === 96.2 && C.comparacion.mediaAct === 98.1, J(C.comparacion));
var Tsin = safe(function () { return Portada.tilesV3(CASAS, null); }) || {};
ok('sin la temporada anterior leída: comparacion null (se lee al abrir)', Tsin.condicion && Tsin.condicion.comparacion === null, J(Tsin.condicion && Tsin.condicion.comparacion));
ok('Alertas: 2 (Son Bou y Cala Mitjana, Malo en elementos de seguridad); peligro = dato del formulario v5', A.n === 2 && A.seguridad === 2 && A.peligro === 0 && A.peligroDato === false, J(A));
ok('Obras: 3 actuaciones (Alta 1, Media 1, Baja 0, sin prioridad 1); 2 más en borradores', O.n === 3 && O.alta === 1 && O.media === 1 && O.baja === 0 && O.sin === 1 && O.borradores === 1, J(O));
ok('Actuaciones por banda de coste: sin datos (null)', K.n === null && /formulario v5/.test(K.texto || ''), J(K));
ok('Comentarios Review: 1 fila con texto en 1 casa (fila Review vacía y Parte no cuentan)', R.n === 1 && R.casas === 1, J(R));
ok('cada cuadro trae sus puertas (lista + cifra)', ['entregados', 'condicion', 'alertas', 'obras', 'review'].every(function (k) { return T[k] && Array.isArray(T[k].puertas) && T[k].puertas.length; }));
ok('media redondea hacia arriba en décimas exactas: 50,3 y 50,4 -> 50,4 (en coma flotante saldría 50,3); 50,3 y 78,6 -> 64,5', Portada.media([50.3, 50.4]) === 50.4 && Portada.media([50.3, 78.6]) === 64.5 && Portada.media([]) === null && Portada.media([null, 80]) === 80, Portada.media([50.3, 50.4]));
var vacio = safe(function () { return Portada.tilesV3([], []); }) || {};
ok('temporada vacía: ceros y media null (nunca 0)', vacio.entregados && vacio.entregados.n === 0 && vacio.condicion.media === null && vacio.condicion.peor === null && vacio.obras.n === 0, J(vacio.condicion));

console.log('4. Regla de los borradores');
var soloBorr = CASAS.filter(function (c) { return c.villaid === 5; });
var Tb = safe(function () { return Portada.tilesV3(soloBorr, null); }) || {};
ok('un borrador con 26 Malo y una Alta no suma a obras, alertas ni condición', Tb.obras.n === 0 && Tb.obras.borradores === 1 && Tb.alertas.n === 0 && Tb.condicion.media === null && Tb.entregados.borrador === 1);
var M0 = safe(function () { return Portada.mapaV3(soloBorr); }) || [];
ok('ni al mapa', M0.length === 26 && M0.every(function (e) { return e.bueno + e.regular + e.malo + e.sin + e.na === 0; }));
var tarj = safe(function () { return Portada.tarjetas(CASAS); }) || [];
var duna = tarj.filter(function (t) { return t.villaid === 5; })[0] || {};
ok('la tarjeta del borrador lleva la píldora y su puntuación es una vista previa gris', duna.borrador === true && duna.banda === 'gris' && duna.previa === true, J(duna));

console.log('5. tablaVM: una fila por villa manager; totales = suma de filas');
var V = safe(function () { return Portada.tablaVM(CASAS); }) || {};
var filas = V.filas || [], tot = V.total || {};
function fila(id) { return filas.filter(function (f) { return f.vmId === id; })[0] || {}; }
ok('filas: Kike, Rafa, Nazaret y "Sin villa manager"', filas.length === 4 && fila('c:1').nombre === 'Kike' && fila('u:7').nombre === 'Nazaret' && fila(Portada.SIN_VM).nombre === 'Sin villa manager', J(filas.map(function (f) { return f.vmId + ' ' + f.nombre; })));
var kk = fila('c:1');
ok('Kike: 4 casas, 4 enviados, media 82,1 (3 de 4), Malo 1, Alta 1, alertas 1, último envío sin fecha', kk.casas === 4 && kk.enviados === 4 && kk.borradores === 0 && kk.sin === 0 && kk.media === 82.1 && kk.n === 3 && kk.N === 4 && kk.malo === 1 && kk.alta === 1 && kk.alertas === 1 && kk.ultimo === '', J(kk));
var rf = fila('c:2');
ok('Rafa: 4 casas, media 83,3 (3 de 4), Malo 14, alertas 1, último envío = el enviado_at registrado', rf.casas === 4 && rf.media === 83.3 && rf.n === 3 && rf.N === 4 && rf.malo === 14 && rf.alertas === 1 && rf.ultimo === '2026-10-27T10:00:00', J(rf));
ok('Sin villa manager: 1 casa sin informe', fila(Portada.SIN_VM).casas === 1 && fila(Portada.SIN_VM).sin === 1);
['casas', 'enviados', 'borradores', 'sin', 'malo', 'alta', 'alertas', 'N', 'n'].forEach(function (k) {
  var suma = filas.reduce(function (s, f) { return s + (f[k] || 0); }, 0);
  ok('Todos.' + k + ' = suma de las filas (' + suma + ')', tot[k] === suma, tot[k]);
});
ok('Todos: media 82,7 = la del cuadro Condición', tot.media === 82.7 && tot.nombre === 'Todos', J(tot));
var ord = safe(function () { return Portada.tablaVM(CASAS, 'media:desc').filas.map(function (f) { return f.nombre; }); });
ok('ordenar por media descendente (sin media al final)', J(ord) === J(['Rafa', 'Kike', 'Nazaret', 'Sin villa manager']), J(ord));
var ord2 = safe(function () { return Portada.tablaVM(CASAS, 'nombre:asc').filas.map(function (f) { return f.nombre; }); });
ok('ordenar por nombre ascendente', J(ord2) === J(['Kike', 'Nazaret', 'Rafa', 'Sin villa manager']), J(ord2));
var fK = safe(function () { return Portada.filtrarVM(CASAS, 'c:1').map(function (c) { return c.villaid; }); });
ok('filtrarVM c:1 -> sus 4 casas; SIN_VM -> la casa sin villa manager; "" -> todas', J(fK) === '[1,2,7,9]' && Portada.filtrarVM(CASAS, Portada.SIN_VM).length === 1 && Portada.filtrarVM(CASAS, '').length === 10, J(fK));

console.log('6. mapaV3: cinco columnas por elemento; suman las casas con informe enviado');
var MP = safe(function () { return Portada.mapaV3(CASAS); }) || [];
ok('26 elementos con sección y nombre', MP.length === 26 && MP.every(function (e) { return e.clave && e.label && e.seccion; }));
ok('Bueno + Regular + Malo + Sin marcar + N/A = 8 casas enviadas en cada elemento', MP.every(function (e) { return e.bueno + e.regular + e.malo + e.sin + e.na === 8; }), J(MP.filter(function (e) { return e.bueno + e.regular + e.malo + e.sin + e.na !== 8; })));
var pin = MP.filter(function (e) { return e.clave === 'pintura'; })[0] || {};
/* pintura: Alba B, Son Bou B, Cala(30) B, Brisa M, Binibeca sin, Torret B, Alcaufar(91) R, Llucalari(100) B */
ok('pintura: Bueno 5, Regular 1, Malo 1, Sin marcar 1, N/A 0', pin.bueno === 5 && pin.regular === 1 && pin.malo === 1 && pin.sin === 1 && pin.na === 0, J(pin));
var iel = MP.filter(function (e) { return e.clave === 'instalacion_electrica'; })[0] || {};
ok('instalación eléctrica: Malo 2 (Son Bou, Cala Mitjana), Sin marcar 2 (Binibeca, Brisa)', iel.malo === 2 && iel.sin === 2, J(iel));
var grupos = MP.map(function (e) { return e.seccion; }).filter(function (s, i, a) { return a.indexOf(s) === i; });
ok('orden: por grupo (interior, exterior, seguridad); dentro, más Malo primero', J(grupos) === J(['interior', 'exterior', 'seguridad']) && MP.filter(function (e) { return e.seccion === 'interior'; })[0].malo >= MP.filter(function (e) { return e.seccion === 'interior'; })[1].malo, J(grupos));

console.log('7. tarjetas: peligro, seguridad, peor condición, incompletas, nombre; borradores y sin informe al final');
/* Revisión de seguridad: Cala Mitjana 50,0 y Son Bou 96,2; luego Alcaufar 50,0, Brisa 95,0 provisional, las de 100,0 por nombre, Binibeca sin puntuación */
var orden = tarj.map(function (t) { return t.villa; });
ok('orden de las tarjetas', J(orden) === J(['Cala Mitjana', 'Son Bou', 'Alcaufar', 'Casa <Brisa>', 'Llucalari', 'Torret', 'Villa Alba', 'Binibeca', 'Villa Duna', 'Es Castell']), J(orden));
var sb = tarj[1] || {};
ok('Son Bou: 96,2 verde, completa 26/26, bandera revisión de seguridad + incoherencia, Alta 1', sb.puntuacion === 96.2 && sb.banda === 'verde' && sb.evaluados === 26 && sb.aplicables === 26 && sb.alta === 1 &&
  sb.banderas.map(function (b) { return b.tipo; }).join(',') === 'seguridad,coherencia', J(sb));
var br = tarj.filter(function (t) { return t.villaid === 4; })[0] || {};
ok('Brisa: provisional 20/26', br.completo === false && br.evaluados === 20 && br.puntuacion === 95, J(br));
ok('cada tarjeta abre la casa (v = casa:<villaid>)', tarj.every(function (t) { return t.v === 'casa:' + t.villaid; }));
var empate = safe(function () {
  var a = { villaid: 1, villa: 'B', estado: 'enviado', score: { puntuacion: 80, completo: false, evaluados: 20, aplicables: 26, banda: 'verde' }, flags: { peligro: null, seguridad: [], coherencia: null }, acciones: [] };
  var b = { villaid: 2, villa: 'A', estado: 'enviado', score: { puntuacion: 80, completo: true, evaluados: 26, aplicables: 26, banda: 'verde' }, flags: { peligro: null, seguridad: [], coherencia: null }, acciones: [] };
  var p = { villaid: 3, villa: 'Z', estado: 'enviado', score: { puntuacion: 99, completo: true, evaluados: 26, aplicables: 26, banda: 'verde' }, flags: { peligro: true, seguridad: [], coherencia: null }, acciones: [] };
  return Portada.tarjetas([a, b, p]).map(function (t) { return t.villa; });
});
ok('peligro primero; con la misma condición, la incompleta antes; luego el nombre', J(empate) === J(['Z', 'B', 'A']), J(empate));

console.log('8. La fila "Listas"');
var LR = safe(function () { return Portada.listasRapidas(CASAS, PREV); }) || [];
function lr(v) { return LR.filter(function (x) { return x.v === v; })[0] || {}; }
ok('Requiere atención 4 (Son Bou, Cala Mitjana, Brisa, Binibeca)', lr('lista:atencion').n === 4, J(lr('lista:atencion')));
ok('Malo sin actuación 1 (Brisa; Cala Mitjana tiene el horno)', lr('lista:malosinact').n === 1, J(lr('lista:malosinact')));
ok('Repetido 1 (Son Bou, instalación eléctrica Malo en 2025 y 2026)', lr('lista:repetido').n === 1, J(lr('lista:repetido')));
/* Malo en enviados: Son Bou 1, Cala(30) 13, Brisa 1 -> 15 */
ok('Todas las marcas Malo 15 (Son Bou 1 + Cala Mitjana 13 + Brisa 1)', lr('lista:marcas:malo').n === 15, J(lr('lista:marcas:malo')));
ok('Obras sin detalle 1 (Cala Mitjana: horno sin prioridad)', lr('lista:obras:sindetalle').n === 1, J(lr('lista:obras:sindetalle')));
var LRsin = safe(function () { return Portada.listasRapidas(CASAS, null); }) || [];
ok('sin temporada anterior leída: Repetido sin cifra (n null)', (LRsin.filter(function (x) { return x.v === 'lista:repetido'; })[0] || {}).n === null);


console.log('9. HTML del nivel 1: cada cifra es una puerta con la temporada y el villa manager');
var ROUTE = { t: '2026', vm: '' };
function hrefs(h) { var out = [], re = /href="([^"]*)"/g, m; while ((m = re.exec(h))) out.push(m[1].replace(/&amp;/g, '&')); return out; }
function params(hh) { var p = {}; hh.replace(/^#/, '').split('&').forEach(function (kv) { var i = kv.indexOf('='); if (i > 0) p[kv.slice(0, i)] = decodeURIComponent(kv.slice(i + 1)); }); return p; }
var th = safe(function () { return Portada.tilesHtml(T, ROUTE); });
ok('tilesHtml: seis cuadros', typeof th === 'string' && (th.match(/class="tile[ "]/g) || []).length === 6, typeof th === 'string' ? (th.match(/class="tile[ "]/g) || []).length : th);
ok('tilesHtml: palabras de la maqueta', typeof th === 'string' && ['Entregados', 'Condición media', 'Alertas', 'Obras por prioridad', 'Actuaciones por banda de coste', 'Comentarios Review', 'sin datos: formulario v5', 'dato del formulario v5', 'más en borradores (no cuentan)'].every(function (w) { return th.indexOf(w) >= 0; }));
ok('tilesHtml: media con coma decimal (82,7) y 6 de 8', typeof th === 'string' && th.indexOf('82,7') >= 0 && th.indexOf('6 de 8') >= 0);
var hT = typeof th === 'string' ? hrefs(th) : [];
ok('tilesHtml: todos los enlaces llevan t=2026 y una vista', hT.length >= 10 && hT.every(function (x) { var p = params(x); return p.t === '2026' && p.v; }), J(hT));
ok('tilesHtml: puertas de la maqueta', ['lista:estado:enviado', 'lista:estado:borrador', 'lista:estado:sin', 'lista:condicion', 'lista:provisionales', 'lista:alertas', 'lista:alertas:seguridad', 'lista:obras:todas', 'lista:obras:alta', 'lista:obras:media', 'lista:obras:baja', 'lista:review', 'lista:comparacion'].every(function (v) { return hT.some(function (x) { return params(x).v === v; }); }), J(hT.map(function (x) { return params(x).v; })));
ok('tilesHtml: la casa más baja abre su vista de casa', hT.some(function (x) { return params(x).v === 'casa:9'; }));
/* Integración (decisión 8): el cuadro de coste "—" abre la lista explicada lista:coste (vacía hasta el formulario v5) */
ok('integración: "Actuaciones por banda de coste" — abre lista:coste', hT.some(function (x) { return params(x).v === 'lista:coste'; }) && /banda de coste<\/div><div class="v"><a href="[^"]*v=lista:coste[^"]*">—<\/a>/.test(th));
var thVM = safe(function () { return Portada.tilesHtml(Portada.tilesV3(Portada.filtrarVM(CASAS, 'c:1'), PREV), { t: '2026', vm: 'c:1' }); });
ok('con filtro de villa manager, los enlaces lo conservan (vm=c:1)', typeof thVM === 'string' && hrefs(thVM).every(function (x) { return params(x).vm === 'c:1'; }));
var vh = safe(function () { return Portada.tablaVMHtml(V, ROUTE); });
var hV = typeof vh === 'string' ? hrefs(vh) : [];
ok('tablaVMHtml: cada celda de Kike abre su lista con vm=c:1', hV.filter(function (x) { return params(x).vm === 'c:1'; }).length >= 10, J(hV.filter(function (x) { return params(x).vm === 'c:1'; })));
ok('tablaVMHtml: fila Todos (sin vm) y cabeceras ordenables (s=...)', typeof vh === 'string' && vh.indexOf('Todos') >= 0 && hV.some(function (x) { var p = params(x); return p.s === 'media:asc' || p.s === 'media:desc'; }));
ok('tablaVMHtml con filtro: sin fila Todos', /Todos/.test(safe(function () { return Portada.tablaVMHtml(Portada.tablaVM(Portada.filtrarVM(CASAS, 'c:1')), { t: '2026', vm: 'c:1' }); }) || 'Todos') === false);
var mh = safe(function () { return Portada.mapaHtml(MP, ROUTE); });
var hM = typeof mh === 'string' ? hrefs(mh) : [];
ok('mapaHtml: 26 nombres (elemento:<clave>) + 26 × 5 cifras (mapa:<clave>:<marca>)', hM.filter(function (x) { return /^elemento:/.test(params(x).v.replace(/^lista:/, '')); }).length === 26 &&
  hM.filter(function (x) { return /^lista:mapa:[a-z_]+:(bueno|regular|malo|sin|na)$/.test(params(x).v); }).length === 130, hM.length);
ok('mapaHtml: columnas Bueno, Regular, Malo, Sin marcar, N/A ("—" con 0)', typeof mh === 'string' && ['Bueno', 'Regular', 'Malo', 'Sin marcar', 'N/A', '—'].every(function (w) { return mh.indexOf(w) >= 0; }));
var kh = safe(function () { return Portada.tarjetasHtml(tarj, ROUTE); });
ok('tarjetasHtml: el nombre completo en su propia línea, escapado', typeof kh === 'string' && kh.indexOf('<div class="n">Casa &lt;Brisa&gt;</div>') >= 0 && kh.indexOf('<Brisa>') < 0);
ok('tarjetasHtml: píldora borrador fuera de la línea del nombre', typeof kh === 'string' && /<div class="n">Villa Duna<\/div><div class="fila">[^]*pill borrador/.test(kh));
ok('tarjetasHtml: 10 tarjetas, cada una abre casa:<villaid>', typeof kh === 'string' && hrefs(kh).filter(function (x) { return /^casa:\d+$/.test(params(x).v); }).length === 10);
ok('tarjetasHtml: provisional y 20/26 en Brisa; "sin informe" en Es Castell', typeof kh === 'string' && kh.indexOf('20/26') >= 0 && kh.indexOf('provisional') >= 0 && /SIN INFORME/.test(kh));
var lh = safe(function () { return Portada.listasRapidasHtml(LR, ROUTE); });
ok('listasRapidasHtml: Listas: con sus cifras y puertas', typeof lh === 'string' && lh.indexOf('Listas:') >= 0 && lh.indexOf('Requiere atención · 4') >= 0 && hrefs(lh).length === 5);

console.log('10. Acuerdo cifra = filas de su lista (lane D)');
var Listas = cargarSiExiste('cuadro-informes-temporada-listas.js'), FIX = cargarSiExiste('cuadro-informes-temporada-fixtures.js');
/* Integración: Listas lee InformeScore como global (en la página lo carga el <script> anterior); aquí se le da el mismo que usa Portada */
if (Listas && typeof global.InformeScore === 'undefined') global.InformeScore = Score || SUSTITUTO;
function puertas(casas, prev, vm) {
  var out = [], t = Portada.tilesV3(casas, prev);
  ['entregados', 'condicion', 'alertas', 'obras', 'review'].forEach(function (k) { (t[k].puertas || []).forEach(function (p) { out.push({ de: 'cuadro ' + k, v: p.v, n: p.n, vm: vm }); }); });
  Portada.listasRapidas(casas, prev).forEach(function (x) { if (x.n !== null) out.push({ de: 'Listas', v: x.v, n: x.n, vm: vm }); });
  Portada.mapaV3(casas).forEach(function (e) { ['bueno', 'regular', 'malo', 'sin'].forEach(function (m) { out.push({ de: 'mapa', v: 'lista:mapa:' + e.clave + ':' + m, n: e[m], vm: vm }); }); });
  return out;
}
function filasDe(v, casas, prev) { var p = v.replace(/^lista:/, '').split(':'), r = Listas.listas(p[0], p.slice(1), casas, prev); return r && r.filas ? r.filas.length : NaN; }
if (Listas && FIX && typeof Listas.listas === 'function') {
  var fc = FIX.casas || (FIX.villas ? Portada.construirCasasV3(FIX.villas, FIX.informes, FIX.lineas, FIX.contacts, FIX.users, FIX.temporada) : null);
  var fp = FIX.prev || FIX.casasPrev || (FIX.prevVillas || FIX.informesPrev ? Portada.construirCasasV3(FIX.prevVillas || FIX.villas, FIX.informesPrev, FIX.lineasPrev, FIX.contacts, FIX.users, (FIX.temporada || 2026) - 1) : null);
  ok('fixtures de la lane D: casas construidas', Array.isArray(fc) && fc.length > 0, fc && fc.length);
  if (Array.isArray(fc)) {
    var ps = puertas(fc, fp, '');
    Portada.tablaVM(fc).filas.forEach(function (f) { var cs = Portada.filtrarVM(fc, f.vmId); puertas(cs, fp, f.vmId).forEach(function (x) { ps.push(x); }); });
    var malas = ps.filter(function (x) { var cs = x.vm ? Portada.filtrarVM(fc, x.vm) : fc, n = safe(function () { return filasDe(x.v, cs, fp); }); x.lista = n; return n !== x.n; });
    ok('cada cifra del nivel 1 = filas de su lista (' + ps.length + ' puertas, todas las VM)', !malas.length, J(malas.slice(0, 8)));
  }
  var mine = puertas(CASAS, PREV, ''), malas2 = mine.filter(function (x) { var n = safe(function () { return filasDe(x.v, CASAS, PREV); }); x.lista = n; return n !== x.n; });
  ok('lo mismo en el fixture de esta prueba (' + mine.length + ' puertas)', !malas2.length, J(malas2.slice(0, 8)));
} else {
  omitidas++;
  console.log('  OMITIDA  acuerdo cifra = filas: falta ' + (!Listas ? 'cuadro-informes-temporada-listas.js' : '') + (!Listas && !FIX ? ' y ' : '') + (!FIX ? 'cuadro-informes-temporada-fixtures.js' : '') + ' (lane D); corre sola cuando el integrador une las lanes');
}

console.log('10. Ronda de arreglos 1: estancia con solo la acción, comentario con solo el detalle, filas repetidas y N/A con la regla de la puntuación');
if (Score && typeof Score.marcas === 'function') {
  var V10 = [{ villaid: 201, Name: 'Ca na Campana', KeyHolder_person: '1' }, { villaid: 202, Name: 'Sa Repetida', KeyHolder_person: '1' }, { villaid: 203, Name: 'Es Na', KeyHolder_person: '2' }];
  var I10 = [inf(2010, 201, 'enviado', 'Regular'), inf(2020, 202, 'enviado', 'Bueno'), inf(2030, 203, 'enviado', 'Bueno')];
  var L10 = [].concat(
    marcas(2010, function (k) { return k === 'pintura' ? 'Malo' : 'Bueno'; }),
    [linea(2010, 'estancia', 'cocina', '', 'Cambiar campana', 'Alta'), linea(2010, 'huesped', 'tema_1', '', 'Poner cortinas opacas', '', 'Review')],
    [{ linea_id: 9000, informe_id: 2020, seccion: 'interior', clave: 'pintura', estado: 'Bueno', texto_1: '', texto_2: '', prioridad: '', orden: 1 }],
    [{ linea_id: 10, informe_id: 2020, seccion: 'interior', clave: 'pintura', estado: 'Malo', texto_1: 'paredes', texto_2: '', prioridad: '', orden: 1 }],
    marcas(2030, function (k) { return k === 'sofas' ? 'Bueno' : null; }).filter(Boolean).map(function (l) { l.na = 'x'; return l; }));
  var C10 = Portada.construirCasasV3(V10, I10, L10, CONTACTS, USERS, 2026);
  var T10 = Portada.tilesV3(C10, null), LR10 = {}; Portada.listasRapidas(C10, null).forEach(function (x) { LR10[x.v] = x.n; });
  ok('estancia con solo "Acción recomendada" (Alta): Obras 1, Alto 1', T10.obras.n === 1 && T10.obras.alta === 1, J(T10.obras));
  ok('esa casa no sale en "Malo sin actuación" (solo Sa Repetida: Malo y ninguna actuación) y sí en "Requiere atención"', LR10['lista:malosinact'] === 1 && LR10['lista:atencion'] >= 1
    && (!Listas || Listas.malosinact(C10).filas.map(function (f) { return f.villaid; }).join() === '202') && (!Listas || Listas.atencion(C10).filas.some(function (f) { return f.villaid === 201; })), J(LR10));
  ok('comentario Review con solo "Detalle / mejora": el cuadro cuenta 1', T10.review.n === 1, J(T10.review));
  var M10 = {}; Portada.mapaV3(C10).forEach(function (e) { M10[e.clave] = e; });
  var c202 = C10.filter(function (c) { return c.villaid === 202; })[0];
  ok('fila repetida: el mapa da la marca que da la puntuación (la última en orden: Malo), no la de linea_id más alto', Portada.marcasDe(c202).pintura === 'malo' && c202.score.error === 'datos', J([Portada.marcasDe(c202).pintura, c202.score]));
  ok('na = "x" no es N/A (regla estricta de la puntuación): Es Na cuenta sofás en Bueno', Portada.marcasDe(C10.filter(function (c) { return c.villaid === 203; })[0]).sofas === 'bueno' && M10.sofas.na === 0, J(M10.sofas));
  if (Listas) {
    var mal10 = puertas(C10, null, '').filter(function (x) { var n = safe(function () { return filasDe(x.v, C10, null); }); x.lista = n; return n !== x.n; });
    ok('cada cifra = filas de su lista en este caso (obras, alto, review, malo sin actuación, mapa)', !mal10.length, J(mal10.slice(0, 8)));
    ok('Listas da la misma marca que el mapa en la fila repetida', Listas.marcasDe(c202).pintura.marca === 'malo' && Listas.marcasDe(c202).pintura.obs === 'paredes', J(Listas.marcasDe(c202).pintura));
  }
} else ok('InformeScore.marcas (lector compartido) existe', false);
ok('dos informes en Alcaufar (90 y 91): el cuadro puntúa el 91, el formulario abre el 90 (informe_id más bajo)', casa(9).informes === 2 && casa(9).informeFormulario === 90 && casa(9).informe_id === 91, J([casa(9).informes, casa(9).informeFormulario]));
ok('Cala Mitjana (30 y 31): los dos abren el 30; una casa con un informe: 1', casa(3).informes === 2 && casa(3).informeFormulario === 30 && casa(1).informes === 1 && casa(6).informes === 0);
var kh9 = Portada.tarjetasHtml(Portada.tarjetas(CASAS), ROUTE), tA = kh9.split('<a class="casa').filter(function (x) { return x.indexOf('Alcaufar') >= 0; })[0] || '', tC = kh9.split('<a class="casa').filter(function (x) { return x.indexOf('Cala Mitjana') >= 0; })[0] || '';
ok('tarjeta: aviso "2 informes" solo cuando el formulario abre otro informe (Alcaufar sí, Cala Mitjana no)', /2 informes/.test(tA) && !/informes/.test(tC.replace(/<div class="vm">[^]*$/, '')), tA.slice(0, 400));
var R10 = { t: '2026', vm: '', v: '', s: 'media:desc' };
var h10 = [Portada.tilesHtml(Portada.tilesV3(CASAS, null), R10), Portada.listasRapidasHtml(Portada.listasRapidas(CASAS, null), R10), Portada.tablaVMHtml(Portada.tablaVM(CASAS, 'media:desc'), R10),
  Portada.tarjetasHtml(Portada.tarjetas(CASAS), R10), Portada.mapaHtml(Portada.mapaV3(CASAS), R10)].join('');
var hr10 = (h10.match(/href="[^"]*"/g) || []).map(function (x) { return x.slice(6, -1).replace(/&amp;/g, '&'); });
ok('cada puerta del cuadro (cuadros, Listas, tabla VM, casas, mapa) lleva el orden de la tabla en vs; las cabeceras de la tabla no', hr10.length > 50
  && hr10.filter(function (x) { return /[#&]v=/.test(x); }).every(function (x) { return /&vs=media:desc$/.test(x); }) && hr10.filter(function (x) { return !/[#&]v=/.test(x); }).every(function (x) { return !/vs=/.test(x); }),
  J(hr10.filter(function (x) { return /[#&]v=/.test(x) && !/&vs=media:desc$/.test(x); }).slice(0, 3)));

console.log('11. Ronda de arreglos 2: un resumen sin texto de actuación (motivo y prioridad) cuenta; estancia añadida con solo el nombre');
if (Score && typeof Score.marcas === 'function') {
  var V11 = [{ villaid: 211, Name: 'Sa Escala', KeyHolder_person: '1' }, { villaid: 212, Name: 'Sa Paret', KeyHolder_person: '2' }, { villaid: 213, Name: 'Es Garatge', KeyHolder_person: '2' }];
  var I11 = [inf(2110, 211, 'enviado', 'Regular'), inf(2120, 212, 'enviado', 'Regular'), inf(2130, 213, 'enviado', 'Regular')];
  var L11 = [].concat(
    marcas(2110, function (k) { return k === 'pavimentos' ? 'Malo' : 'Bueno'; }), [linea(2110, 'resumen', 'accion_1', '', 'Riesgo de caída en la escalera', 'Alta')],
    marcas(2120, function (k) { return k === 'fachada' ? 'Malo' : 'Bueno'; }), [linea(2120, 'resumen', 'accion_1', '', 'Pared con grietas', 'Media')],
    marcas(2130, function (k) { return k === 'pintura' ? 'Malo' : 'Bueno'; }), [linea(2130, 'estancia', 'otra_1', 'Garaje:', '', '')]);
  var C11 = Portada.construirCasasV3(V11, I11, L11, CONTACTS, USERS, 2026);
  var T11 = Portada.tilesV3(C11, null), LR11 = {}; Portada.listasRapidas(C11, null).forEach(function (x) { LR11[x.v] = x.n; });
  ok('resumen con motivo + Alta y sin actuación: Obras 3, Alto 1, Medio 1, sin prioridad 1', T11.obras.n === 3 && T11.obras.alta === 1 && T11.obras.media === 1 && T11.obras.sin === 1, J(T11.obras));
  ok('ninguna de las tres casas sale en "Malo sin actuación"', LR11['lista:malosinact'] === 0, J(LR11));
  var c211 = C11.filter(function (c) { return c.villaid === 211; })[0] || {};
  ok('la casa lleva la actuación "Sin texto (Resumen 1)" Alta con su motivo', (c211.acciones || []).length === 1 && c211.acciones[0].accion === 'Sin texto (Resumen 1)' && c211.acciones[0].prioridad === 'Alta' && c211.acciones[0].motivo === 'Riesgo de caída en la escalera', J(c211.acciones));
  var VMr11 = Portada.tablaVM(C11).total;
  ok('tabla de villa managers: Alto 1 en el total', VMr11.alta === 1, J(VMr11));
  if (Listas) {
    ok('"Requiere atención" incluye la casa con la Alta del resumen', Listas.atencion(C11).filas.some(function (f) { return f.villaid === 211; }));
    var mal11 = puertas(C11, null, '').filter(function (x) { var n = safe(function () { return filasDe(x.v, C11, null); }); x.lista = n; return n !== x.n; });
    ok('cada cifra = filas de su lista en este caso', !mal11.length, J(mal11.slice(0, 8)));
  }
} else ok('InformeScore.marcas (lector compartido) existe', false);

console.log('12. Ronda de arreglos 2: «n de N» abre las n casas con puntuación final (cuadro Condición media y tabla de villa managers)');
var R12 = { t: '2026', vm: '', v: '', s: '' }, T12 = Portada.tilesV3(CASAS, null), th12 = Portada.tilesHtml(T12, R12).replace(/&amp;/g, '&');
var ln12 = (th12.match(/<a [^>]*href="([^"]*)"[^>]*>\d+ de \d+ casas con puntuación final<\/a>/) || [])[1] || '';
ok('cuadro: el enlace «n de N casas con puntuación final» abre lista:condicion:final', /v=lista:condicion:final(&|$)/.test(ln12), ln12);
ok('cuadro: la puerta lista:condicion:final cuenta n (' + T12.condicion.n + ')', (T12.condicion.puertas || []).some(function (p) { return p.v === 'lista:condicion:final' && p.n === T12.condicion.n; }), J(T12.condicion.puertas));
var vh12 = Portada.tablaVMHtml(Portada.tablaVM(CASAS), R12).replace(/&amp;/g, '&');
var cel12 = vh12.match(/<td class="num" data-l="Condición media"><a class="cel" href="[^"]*"/g) || [];
ok('tabla de villa managers: cada celda «Condición media · n de N» abre lista:condicion:final', cel12.length > 1 && cel12.every(function (x) { return /v=lista:condicion:final(&|")/.test(x); }), J(cel12.slice(0, 2)));
if (Listas) {
  var V12 = Portada.tablaVM(CASAS), mal12 = V12.filas.concat([V12.total]).filter(function (f) { var cs = f.vmId ? Portada.filtrarVM(CASAS, f.vmId) : CASAS; return filasDe('lista:condicion:final', cs, null) !== f.n; });
  ok('tabla de villa managers: n = filas de lista:condicion:final en cada fila y en el total', !mal12.length, J(mal12.map(function (f) { return [f.nombre, f.n]; })));
}

console.log('13. Antes del push: la cifra del cuadro «Condición media» (la media de las n finales) abre lista:condicion:final');
var t13 = (th12.split('<div class="tile').filter(function (x) { return x.indexOf('Condición media') >= 0; })[0]) || '';
var v13 = (t13.match(/<div class="v"><a href="([^"]*)"/) || [])[1] || '', d13 = (t13.match(/data-href="([^"]*)"/) || [])[1] || '';
ok('la cifra y la tarjeta entera abren lista:condicion:final', /v=lista:condicion:final(&|$)/.test(v13) && /v=lista:condicion:final(&|$)/.test(d13), J([v13, d13]));
var e13 = (t13.match(/<a [^>]*href="([^"]*)"[^>]*>los (\d+) enviados<\/a>/) || []);
ok('las N enviadas siguen a un clic (lista:condicion, «los N enviados»)', /v=lista:condicion(&|$)/.test(e13[1] || '') && +e13[2] === T12.condicion.N, J(e13.slice(1)));

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL' + (omitidas ? ', ' + omitidas + ' OMITIDA' : ''));
process.exit(fail ? 1 : 0);
