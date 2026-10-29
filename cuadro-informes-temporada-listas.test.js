/* Pruebas de las listas del cuadro de informes de temporada v3 (cuadro-informes-temporada-listas.js, carril D de informe-cuadro-v3a, 29/10/2026).
   node cuadro-informes-temporada-listas.test.js
   Datos: cuadro-informes-temporada-fixtures.js (24 casas, 4 VM, borradores, sin informe, dos informes por villa, temporada 2025, temporada vacía).
   InformeScore: el archivo real informe-temporada-score.js (carril A) si está en la carpeta; si no, una copia de referencia
   de la definición del paquete (slice A) escrita aquí abajo. Las filas "casa" se construyen aquí con la regla del último
   enviado (la de construirCasasV3 del carril C), solo para estas pruebas. Sin red, sin DOM. */
var fs = require('fs'), path = require('path');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '  -> ' + e : '')); } }
function J(x) { return JSON.stringify(x); }
var F = require('./cuadro-informes-temporada-fixtures.js');

/* ── InformeScore de referencia (paquete, slice A) ── */
function referencia() {
  var SEG = ['instalacion_electrica', 'cerraduras', 'fontaneria_agua_caliente', 'barandillas', 'pavimentos', 'piscina'];
  var RANGO = { alta: 3, media: 2, baja: 1 };
  var lw = function (s) { return String(s == null ? '' : s).trim().toLowerCase(); };
  function elementosDef() { return F.CLAVES.map(function (c) { return { seccion: c[0], clave: c[1], label: 'Etiqueta ' + c[1] }; }); }
  function redondear1(x) { return Math.floor(x * 10 + 0.5 + 1e-9) / 10; }
  function deElementos(lineas) {
    var m = {}, err = false, sec = {};
    elementosDef().forEach(function (e) { sec[e.seccion + '|' + e.clave] = e.clave; });
    (lineas || []).forEach(function (l) {
      var k = sec[l.seccion + '|' + l.clave]; if (!k) return;
      if (m.hasOwnProperty(k)) err = true;
      var x = lw(l.estado); if (x && ['bueno', 'regular', 'malo'].indexOf(x) < 0) err = true;
      m[k] = { marca: x, na: !!l.na };
    });
    return { m: m, err: err };
  }
  function condicion(lineas) {
    var d = deElementos(lineas), b = 0, r = 0, ma = 0, na = 0;
    Object.keys(d.m).forEach(function (k) { var x = d.m[k]; if (x.na) { na++; return; } if (x.marca === 'bueno') b++; else if (x.marca === 'regular') r++; else if (x.marca === 'malo') ma++; });
    var ev = b + r + ma, ap = 26 - na, p = d.err || !ev ? null : redondear1(100 * (2 * b + r) / (2 * ev));
    var o = { bueno: b, regular: r, malo: ma, evaluados: ev, aplicables: ap, na: na, puntuacion: p, completo: !d.err && ev === ap && ap > 0,
      banda: p == null ? 'gris' : p < 50 ? 'rojo' : p < 80 ? 'ambar' : 'verde' };
    if (d.err) o.error = 'datos';
    return o;
  }
  function banderas(informe, lineas) {
    var d = deElementos(lineas), g = lw(informe && informe.estado_general), mk = Object.keys(d.m).map(function (k) { return d.m[k].marca; }).filter(Boolean);
    var coh = null;
    if (g === 'bueno' && mk.indexOf('malo') >= 0) coh = 'bueno_con_malo';
    else if (g === 'malo' && mk.length && mk.every(function (x) { return x === 'bueno'; })) coh = 'malo_todo_bueno';
    return { peligro: null, seguridad: SEG.filter(function (k) { return d.m[k] && d.m[k].marca === 'malo'; }), coherencia: coh };
  }
  function acciones(lineas) {
    var mp = {}, out = [];
    (lineas || []).filter(function (l) { return (l.seccion === 'resumen' || l.seccion === 'estancia') && String(l.texto_1 || '').trim(); })
      .sort(function (a, b) { return (a.seccion === b.seccion ? 0 : a.seccion === 'resumen' ? -1 : 1) || ((+a.orden || 0) - (+b.orden || 0)); })
      .forEach(function (l) {
        var t = String(l.texto_1).trim(), p = lw(l.prioridad), P = RANGO[p] ? p.charAt(0).toUpperCase() + p.slice(1) : '';
        var o = mp[t];
        if (!o) { o = mp[t] = { texto: t, prioridad: P, motivo: l.seccion === 'resumen' ? String(l.texto_2 || '').trim() : l.clave, fuentes: [], coste: null }; out.push(o); }
        else if ((RANGO[lw(P)] || 0) > (RANGO[lw(o.prioridad)] || 0)) o.prioridad = P;
        o.fuentes.push({ seccion: l.seccion, clave: l.clave, orden: +l.orden || 0 });
      });
    return out;
  }
  function comparar(A, B) {
    var a = deElementos(A).m, b = deElementos(B).m, ev = function (x) { return x && !x.na && ['bueno', 'regular', 'malo'].indexOf(x.marca) >= 0; };
    var com = elementosDef().map(function (e) { return e.clave; }).filter(function (k) { return ev(a[k]) && ev(b[k]); });
    var s = function (m) { var bb = 0, rr = 0; com.forEach(function (k) { if (m[k].marca === 'bueno') bb++; else if (m[k].marca === 'regular') rr++; }); return com.length ? redondear1(100 * (2 * bb + rr) / (2 * com.length)) : null; };
    var mal = function (x) { return x === 'regular' || x === 'malo'; };
    return { n: com.length, puntuacionA: s(a), puntuacionB: s(b),
      cambios: com.filter(function (k) { return a[k].marca !== b[k].marca; }).map(function (k) { return { clave: k, de: a[k].marca, a: b[k].marca }; }),
      repetidos: com.filter(function (k) { return mal(a[k].marca) && mal(b[k].marca); }) };
  }
  return { elementosDef: elementosDef, elementosSeguridad: function () { return SEG.slice(); }, condicion: condicion, banderas: banderas, acciones: acciones, comparar: comparar, redondear1: redondear1 };
}
var IS, FUENTE_SCORE = 'referencia';
if (fs.existsSync(path.join(__dirname, 'informe-temporada-score.js'))) { IS = require('./informe-temporada-score.js'); FUENTE_SCORE = 'informe-temporada-score.js'; }
else IS = referencia();
global.InformeScore = IS;
console.log('InformeScore: ' + FUENTE_SCORE);

/* ── Filas "casa" (forma del contrato; regla del último enviado: enviado_at, si no updated_at, si no el id más alto) ── */
function casasDe(d, temporada) {
  var lw = function (s) { return String(s == null ? '' : s).trim().toLowerCase(); };
  var porInf = {};
  (d.lineas || []).forEach(function (l) { (porInf[l.informe_id] = porInf[l.informe_id] || []).push(l); });
  var clave = function (i) { return [String(i.enviado_at || ''), String(i.updated_at || ''), ('0000000000' + i.informe_id).slice(-10)].join('|'); };
  var ultimo = function (lst) { return lst.slice().sort(function (a, b) { return clave(a) < clave(b) ? 1 : clave(a) > clave(b) ? -1 : 0; })[0]; };
  return F.villas.map(function (v) {
    var mios = (d.informes || []).filter(function (i) { return i.villaid === v.villaid; });
    var env = mios.filter(function (i) { return lw(i.estado) === 'enviado'; }), inf = env.length ? ultimo(env) : mios.length ? ultimo(mios) : null;
    var ls = inf ? (porInf[inf.informe_id] || []) : [], vmId = F.vmDeVilla(v.villaid), kh = String(v.KeyHolder_person);
    var vmN = (F.contacts.concat(F.users).find(function (x) { return x.id === kh; }) || {}).name || '';
    return { villaid: v.villaid, villa: v.Name, vm: vmN, vmId: vmId, informe_id: inf ? inf.informe_id : null,
      estado: inf ? (env.length ? 'enviado' : 'borrador') : '', general: inf ? lw(inf.estado_general) : '',
      fecha: inf ? inf.fecha_revision : '', updated: inf ? inf.updated_at : '', lineas: ls,
      score: IS.condicion(ls), flags: IS.banderas(inf, ls), acciones: IS.acciones(ls),
      final: inf ? inf.observaciones_finales : '',
      url: 'informe-temporada.html?villaid=' + v.villaid + '&temporada=' + temporada };
  });
}
var CASAS = casasDe(F, 2026), PREV = casasDe(F.previa, 2025), VACIA = casasDe(F.vacia, 2024);
var ENV = CASAS.filter(function (c) { return c.estado === 'enviado'; });
var porVilla = function (lst, id) { return lst.filter(function (x) { return x.villaid === id; }); };
var ids = function (f) { return f.map(function (x) { return x.villaid; }); };
var uniq = function (a) { return Array.from(new Set(a)); };
var lwT = function (s) { return String(s == null ? '' : s).trim().toLowerCase(); };

var L = null;
try { L = require('./cuadro-informes-temporada-listas.js'); } catch (e) { ok('existe cuadro-informes-temporada-listas.js', false, e.message); console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(1); }
function lista(kind, args, casas, prev) { try { return L.listas(kind, args || {}, casas || CASAS, prev === undefined ? PREV : prev); } catch (e) { return { error: e, titulo: '', columnas: [], filas: [], vacio: '' }; } }

console.log('0. Datos de prueba (los mismos que carga el carril C)');
ok('24 casas, 19 enviadas, 3 borradores, 2 sin informe', CASAS.length === 24 && ENV.length === 19 && CASAS.filter(function (c) { return c.estado === 'borrador'; }).length === 3 && CASAS.filter(function (c) { return !c.estado; }).length === 2);
ok('regla del último enviado en los datos: 103→2031, 108→2008, 112→2034, 116→2016 (el borrador más nuevo no desplaza)',
  J([103, 108, 112, 116].map(function (v) { return porVilla(CASAS, v)[0].informe_id; })) === J([2031, 2008, 2034, 2016]));

console.log('1. La API del carril D');
ok('Listas.listas, Listas.csv, Listas.ordenar, Listas.buscar y Listas.lineaTitulo existen', ['listas', 'csv', 'ordenar', 'buscar', 'lineaTitulo', 'obras', 'atencion', 'malosinact', 'repetido', 'marcas', 'mapa', 'elemento', 'review'].every(function (n) { return typeof L[n] === 'function'; }));
ok('KINDS = las 13 listas de la maqueta + coste', ['estado', 'condicion', 'provisionales', 'alertas', 'obras', 'review', 'atencion', 'malosinact', 'repetido', 'marcas', 'mapa', 'elemento', 'comparacion', 'coste'].every(function (k) { return (L.KINDS || []).indexOf(k) >= 0; }), J(L.KINDS));
var formaOk = (L.KINDS || []).every(function (k) {
  var x = lista(k, { partes: k === 'mapa' ? ['piscina', 'malo'] : k === 'elemento' ? ['piscina'] : [] });
  return !x.error && typeof x.titulo === 'string' && x.titulo && Array.isArray(x.columnas) && Array.isArray(x.filas) && typeof x.vacio === 'string' && x.vacio
    && x.columnas.every(function (c) { return c.clave && c.label; }) && x.columnas[0].clave === 'villa' && x.columnas[1].clave === 'vm'
    && x.filas.every(function (f) { return f.villaid != null && 'informe_id' in f; });
});
ok('cada lista devuelve {titulo, columnas [{clave,label,num}], filas con villaid e informe_id, vacio}; Casa y VM primero', formaOk);
var antes = J(CASAS);
(L.KINDS || []).forEach(function (k) { lista(k, { partes: k === 'mapa' ? ['piscina', 'malo'] : k === 'elemento' ? ['piscina'] : [], q: 'a', s: 'villa:desc', g: '1' }); });
ok('las listas no cambian las filas casa que reciben', J(CASAS) === antes);
ok('el kind con ":" vale lo mismo que kind + partes ("obras:alta")', J(lista('obras:alta').filas) === J(lista('obras', { partes: ['alta'] }).filas));
ok('args como array de partes o como texto "alta" también valen', J(lista('obras', ['alta']).filas) === J(lista('obras', 'alta').filas) && lista('obras', 'alta').filas.length === lista('obras:alta').filas.length);

console.log('2. estado (enviado | borrador | sin | todas)');
var eT = lista('estado'), eE = lista('estado:enviado'), eB = lista('estado:borrador'), eS = lista('estado:sin');
ok('todas = 24 filas (por defecto)', eT.filas.length === 24 && lista('estado:todas').filas.length === 24, eT.filas.length);
ok('enviado = 19, borrador = 3 (105, 114, 121), sin = 2 (110, 118)', eE.filas.length === 19 && J(ids(eB.filas).sort()) === J([105, 114, 121]) && J(ids(eS.filas).sort()) === J([110, 118]));
ok('sin informe: informe_id null, estado "Sin informe", al final de "todas"', eS.filas.every(function (f) { return f.informe_id === null && f.estado === 'Sin informe'; }) && J(ids(eT.filas.slice(-2)).sort()) === J([110, 118]));
ok('un borrador lleva banda gris aunque tenga puntuación (vista previa)', eB.filas.every(function (f) { return f.banda === 'gris'; }));
ok('las casas con revisión de seguridad van primero en "todas"', J(ids(eT.filas.slice(0, 3)).sort()) === J([102, 106, 115]), J(ids(eT.filas.slice(0, 5))));
ok('columnas: Casa, VM, Estado, Fecha de revisión, Último guardado, Condición, Completitud', J(eT.columnas.map(function (c) { return c.label; })) === J(['Casa', 'VM', 'Estado', 'Fecha de revisión', 'Último guardado', 'Condición', 'Completitud']), J(eT.columnas.map(function (c) { return c.label; })));
ok('fechas en dd/mm/aaaa', /^\d\d\/\d\d\/\d{4}$/.test(eE.filas[0].fecha) && /^\d\d\/\d\d\/\d{4}$/.test(eE.filas[0].guardado), eE.filas[0].fecha + ' ' + eE.filas[0].guardado);
ok('un estado desconocido explica la lista vacía', lista('estado:nada').filas.length === 0 && lista('estado:nada').vacio.length > 0);

console.log('3. condicion y provisionales');
var co = lista('condicion');
ok('condicion = las 19 enviadas, peor primero', co.filas.length === 19 && co.filas.every(function (f, i, a) { return i === 0 || a[i - 1].puntuacion == null || f.puntuacion == null || a[i - 1].puntuacion <= f.puntuacion; }));
ok('la puntuación es la del informe que vale (103 = informe 2031, no el viejo todo Bueno)', porVilla(co.filas, 103)[0].informe_id === 2031 && porVilla(co.filas, 103)[0].puntuacion === porVilla(CASAS, 103)[0].score.puntuacion && porVilla(co.filas, 103)[0].puntuacion !== 100);
ok('completitud "20/26" y "provisional" en la 107', porVilla(co.filas, 107)[0].completitud === '20/26' && porVilla(co.filas, 107)[0].final === 'provisional');
ok('las completas dicen "final"', porVilla(co.filas, 120)[0].final === 'final' && porVilla(co.filas, 120)[0].puntuacion === 100);
var pr = lista('provisionales');
ok('provisionales = solo la 107', J(ids(pr.filas)) === J([107]), J(ids(pr.filas)));
ok('provisionales vacía en la temporada vacía, con la razón', lista('provisionales', {}, VACIA, null).filas.length === 0 && lista('provisionales', {}, VACIA, null).vacio.length > 0);

console.log('4. alertas (y :seguridad, :peligro)');
var al = lista('alertas'), alS = lista('alertas:seguridad'), alP = lista('alertas:peligro');
ok('alertas = 3 revisiones de seguridad (102, 106, 115)', J(ids(al.filas).sort()) === J([102, 106, 115]) && al.filas.every(function (f) { return /seguridad/i.test(f.alerta); }));
ok(':seguridad = las mismas 3', J(ids(alS.filas).sort()) === J([102, 106, 115]));
ok('el detalle de la 106 nombra los dos elementos (eléctrica y piscina)', /instalacion_electrica|Instalación eléctrica|Etiqueta instalacion_electrica/.test(porVilla(al.filas, 106)[0].detalle) && /piscina|Piscina/.test(porVilla(al.filas, 106)[0].detalle), porVilla(al.filas, 106)[0].detalle);
ok(':peligro vacía y explica "formulario v5"', alP.filas.length === 0 && /formulario v5/.test(alP.vacio));
ok('un borrador con Malo en seguridad no cuenta (solo enviados)', !al.filas.some(function (f) { return F.casos.borradores.indexOf(f.villaid) >= 0; }));

console.log('5. obras (actuaciones: resumen + estancia, unidas por texto)');
var refObras = []; ENV.forEach(function (c) { c.acciones.forEach(function (a) { refObras.push({ v: c.villaid, a: a }); }); });
var ob = lista('obras');
ok('todas = las actuaciones distintas de los informes enviados (' + refObras.length + ')', ob.filas.length === refObras.length, ob.filas.length);
var gr = ob.filas.filter(function (f) { return f.villaid === 104 && /grifo/.test(f.accion); });
ok('104: el mismo texto en el resumen (Media) y en Baño 1 (Alta) = UNA fila, Alto, dos orígenes, "unidas"', gr.length === 1 && gr[0].prioridad === 'Alto' && gr[0].fuentes.length === 2 && gr[0].unidas === true && /\+/.test(gr[0].origen), J(gr));
ok('orden: Alto, Medio, Bajo, sin prioridad', ob.filas.every(function (f, i, a) { return i === 0 || a[i - 1].rango >= f.rango; }));
ok('prioridad se ve Alto/Medio/Bajo (como la v2)', ob.filas.every(function (f) { return ['Alto', 'Medio', 'Bajo', ''].indexOf(f.prioridad) >= 0; }));
var cuenta = function (p) { return refObras.filter(function (x) { return lwT(x.a.prioridad) === p; }).length; };
ok('obras:alta / :media / :baja = las cuentas de cada prioridad', lista('obras:alta').filas.length === cuenta('alta') && lista('obras:media').filas.length === cuenta('media') && lista('obras:baja').filas.length === cuenta('baja') && cuenta('alta') > 0);
ok('obras:sin = sin prioridad (2 en la 113)', lista('obras:sin').filas.length === refObras.filter(function (x) { return !x.a.prioridad; }).length && porVilla(lista('obras:sin').filas, 113).length === 2);
var sd = refObras.filter(function (x) { return !String(x.a.motivo || '').trim() || !x.a.prioridad; }).length;
ok('obras:sindetalle = sin motivo o sin prioridad (' + sd + ')', lista('obras:sindetalle').filas.length === sd && porVilla(lista('obras:sindetalle').filas, 113).length === 3 && lista('obras:sindetalle').filas.every(function (f) { return f.detalle === 'sin detalle'; }));
ok('filtro sindetalle también como args.sindetalle (od=1 de la maqueta)', lista('obras', { sindetalle: '1' }).filas.length === sd && lista('obras', { od: '1' }).filas.length === sd);
var fE = lista('obras', { fuente: 'estancia' }), fR = lista('obras', { fuente: 'resumen' });
ok('fuente estancia / resumen; la fila unida está en las dos', fE.filas.length > 0 && fR.filas.length > 0 && fE.filas.length + fR.filas.length === ob.filas.length + 1 && porVilla(fE.filas, 104).some(function (f) { return /grifo/.test(f.accion); }) && porVilla(fR.filas, 104).some(function (f) { return /grifo/.test(f.accion); }), fE.filas.length + '+' + fR.filas.length);
ok('prioridad por args.prioridad (op de la maqueta) = la parte de la ruta', lista('obras', { prioridad: 'alta' }).filas.length === cuenta('alta') && lista('obras', { op: 'alta' }).filas.length === cuenta('alta'));
ok('ningún borrador entra (105, 114, 121); su número va en enBorradores', !ob.filas.some(function (f) { return F.casos.borradores.indexOf(f.villaid) >= 0; })
  && ob.enBorradores === CASAS.filter(function (c) { return c.estado === 'borrador'; }).reduce(function (s, c) { return s + c.acciones.length; }, 0) && ob.enBorradores > 0, ob.enBorradores);
ok('buscar "grifo" = 1 fila (104)', J(ids(lista('obras', { q: 'grifo' }).filas)) === J([104]));
ok('buscar sin acentos ni mayúsculas: "BANO 1" encuentra "baño 1"', lista('obras', { q: 'BANO 1' }).filas.length >= 1 && lista('obras', { q: 'BANO 1' }).filas.length === lista('obras', { q: 'baño 1' }).filas.length);
ok('total = filas antes de buscar; filas = después', lista('obras', { q: 'grifo' }).total === ob.filas.length);
var g1 = lista('obras', { g: '1' });
ok('agrupar por casa: filas por nombre de casa, grupos con su cuenta', g1.filas.length === ob.filas.length && g1.grupos.reduce(function (s, x) { return s + x.n; }, 0) === g1.filas.length
  && g1.filas.every(function (f, i, a) { return i === 0 || a[i - 1].villa.localeCompare(f.villa, 'es') <= 0; }) && g1.grupos.length === uniq(ids(ob.filas)).length);
ok('coste "—" (null) hasta el formulario v5, con la nota', ob.filas.every(function (f) { return f.coste === null; }) && /v5/.test(ob.nota || ''));
ok('filtro de VM: args.vm "c:12" deja solo las casas de Kike', lista('obras', { vm: 'c:12' }).filas.length > 0 && lista('obras', { vm: 'c:12' }).filas.every(function (f) { return F.vmDeVilla(f.villaid) === 'c:12'; }));

console.log('6. review y comentarios');
var revRef = 0; ENV.forEach(function (c) { revRef += c.lineas.filter(function (l) { return l.seccion === 'huesped' && l.estado === 'Review' && String(l.texto_1).trim(); }).length; });
var rv = lista('review');
ok('review = las filas de comentarios con origen Review de los enviados (' + revRef + ')', rv.filas.length === revRef && revRef > 0 && rv.filas.every(function (f) { return f.origen === 'Review'; }));
var cm = lista('comentarios');
ok('comentarios (todos): el origen vacío sale como "Sin origen"', cm.filas.some(function (f) { return f.origen === 'Sin origen'; }) && cm.filas.length > rv.filas.length);

console.log('7. atencion (Requiere atención)');
var at = lista('atencion');
var refAt = ENV.filter(function (c) { return c.flags.seguridad.length || c.acciones.some(function (a) { return lwT(a.prioridad) === 'alta'; }) || !c.score.completo || c.flags.peligro; });
ok('atencion = seguridad + Alta + incompletos (' + refAt.length + ')', J(ids(at.filas).sort()) === J(ids(refAt).sort()), J(ids(at.filas)));
ok('orden de riesgo: las 3 de seguridad primero', J(ids(at.filas.slice(0, 3)).sort()) === J([102, 106, 115]));
ok('la 107 (incompleta) está y su motivo dice "incompleto 20/26"', /incompleto 20\/26/.test(porVilla(at.filas, 107)[0].motivo), porVilla(at.filas, 107)[0] && porVilla(at.filas, 107)[0].motivo);
ok('una casa sin motivo no entra (120, todo Bueno y sin actuaciones)', porVilla(at.filas, 120).length === 0);

console.log('8. malosinact (Malo sin actuación)');
var ms = lista('malosinact');
ok('malosinact = solo la 111', J(ids(ms.filas)) === J([111]), J(ids(ms.filas)));
ok('la 111: 3 marcas Malo y sus elementos', ms.filas[0] && ms.filas[0].malo === 3 && ms.filas[0].elementos.split(' · ').length === 3);
var IS0 = global.InformeScore;
global.InformeScore = Object.assign({}, IS0, { elementosDef: function () { return IS0.elementosDef().map(function (e) {
  var r = { seccion: e.seccion, clave: e.clave, label: e.label };
  if (e.clave === 'sofas') r.label = 'Sofás, tapicerías y alfombras';
  if (e.clave === 'mobiliario_cocina') r.label = 'Mobiliario y módulos de cocina';
  if (e.clave === 'fachada') r.label = 'Fachada y pintura exterior';
  if (e.clave === 'pintura') r.label = 'Pintura interior (paredes, techos, carpintería)';
  return r; }); } });
var msR = lista('malosinact'), mpR = lista('mapa:pintura:todas');
global.InformeScore = IS0;
ok('etiquetas reales con comas: "Sofás, tapicerías y alfombras" entera, separador " · "', msR.filas[0] && msR.filas[0].elementos === 'Sofás, tapicerías y alfombras · Mobiliario y módulos de cocina · Fachada y pintura exterior', msR.filas[0] && msR.filas[0].elementos);
ok('etiqueta corta sin el paréntesis: "Pintura interior"', /: Pintura interior$/.test(mpR.titulo) && mpR.filas[0].elemento === 'Pintura interior', mpR.titulo);
ok('temporada vacía: lista vacía con razón', lista('malosinact', {}, VACIA, null).filas.length === 0 && lista('malosinact', {}, VACIA, null).vacio.length > 0);

console.log('9. repetido y comparacion (temporada 2025)');
var rp = lista('repetido');
var refRp = 0; ENV.forEach(function (c) { var p = porVilla(PREV, c.villaid)[0]; if (p && p.estado === 'enviado') refRp += IS.comparar(p.lineas, c.lineas).repetidos.length; });
ok('repetido = Regular o Malo en las dos temporadas (' + refRp + ')', rp.filas.length === refRp && refRp > 0);
ok('106: instalación eléctrica Malo en 2025 y 2026 = repetido', porVilla(rp.filas, 106).some(function (f) { return f.clave === 'instalacion_electrica' && f.marcaAntes === 'Malo' && f.marcaAhora === 'Malo'; }));
ok('102: eléctrica Bueno en 2025 = no repetida', !porVilla(rp.filas, 102).some(function (f) { return f.clave === 'instalacion_electrica'; }));
ok('repetido sin temporada previa cargada: vacía y lo dice', lista('repetido', {}, CASAS, null).filas.length === 0 && /anterior|previa/.test(lista('repetido', {}, CASAS, null).vacio));
var cp = lista('comparacion');
ok('comparacion = 17 casas con informe enviado en las dos (sin 109 borrador 2025, 122 sin 2025)', cp.filas.length === 17 && porVilla(cp.filas, 109).length === 0 && porVilla(cp.filas, 122).length === 0, cp.filas.length);
var c107 = porVilla(cp.filas, 107)[0];
ok('107: 20 elementos comunes; diferencia = ahora − antes con un decimal', c107 && c107.comunes === 20 && c107.diferencia === Math.round(10 * (c107.ahora - c107.antes)) / 10, J(c107));
ok('comparacion sin previa: vacía y lo dice', lista('comparacion', {}, CASAS, null).filas.length === 0 && /anterior|previa/.test(lista('comparacion', {}, CASAS, null).vacio));

console.log('10. marcas, mapa y elemento');
var cMarca = function (m) { var n = 0; ENV.forEach(function (c) { n += c.lineas.filter(function (l) { return ['interior', 'exterior', 'seguridad'].indexOf(l.seccion) >= 0 && lwT(l.estado) === m; }).length; }); return n; };
ok('marcas:malo / :regular / :bueno = las marcas de los enviados', lista('marcas:malo').filas.length === cMarca('malo') && lista('marcas:regular').filas.length === cMarca('regular') && lista('marcas:bueno').filas.length === cMarca('bueno') && cMarca('malo') > 0);
ok('marcas sin parte = Malo (como la maqueta)', lista('marcas').filas.length === cMarca('malo'));
ok('marcas:malo lleva la observación del elemento', lista('marcas:malo').filas.every(function (f) { return /Observación Malo/.test(f.observacion); }));
var cincoOk = F.CLAVES.every(function (c) {
  var k = c[1], n = ['bueno', 'regular', 'malo', 'sin'].reduce(function (s, m) { return s + lista('mapa', { partes: [k, m] }).filas.length; }, 0);
  return n === 19 && lista('mapa', { partes: [k, 'todas'] }).filas.length === 19;
});
ok('mapa: Bueno + Regular + Malo + Sin marcar = 19 casas enviadas en cada uno de los 26 elementos', cincoOk);
ok('mapa:humedades:sin = la 107', J(ids(lista('mapa:humedades:sin').filas)) === J([107]));
var na = lista('mapa:piscina:na');
ok('mapa N/A: vacía y explica "formulario v5"', na.filas.length === 0 && /formulario v5/.test(na.vacio));
ok('mapa con fotos: la columna Fotos cuenta las fotos del informe', lista('mapa:piscina:todas').filas.every(function (f) { return typeof f.fotos === 'number'; }) && lista('mapa:piscina:todas').filas.some(function (f) { return f.fotos === 6; }));
ok('elemento:piscina = mapa:piscina:todas (19 filas)', J(lista('elemento:piscina').filas) === J(lista('mapa:piscina:todas').filas) && lista('elemento:piscina').filas.length === 19);
ok('elemento sin clave conocida: vacía con razón', lista('elemento:nada').filas.length === 0 && lista('elemento:nada').vacio.length > 0);

console.log('11. coste, desconocida, temporada vacía');
ok('coste: vacía, "sin datos: formulario v5"', lista('coste').filas.length === 0 && /formulario v5/.test(lista('coste').vacio));
ok('kind desconocido: "Lista desconocida"', lista('nada').titulo === 'Lista desconocida' && lista('nada').filas.length === 0);
ok('temporada vacía: todas las listas sin filas y con razón, sin error', (L.KINDS || []).every(function (k) { var x = lista(k, { partes: k === 'mapa' ? ['piscina', 'malo'] : k === 'elemento' ? ['piscina'] : [] }, VACIA, null); return !x.error && (k === 'estado' ? x.filas.length === 24 && x.filas.every(function (f) { return f.estado === 'Sin informe'; }) : x.filas.length === 0) && x.vacio; }));

console.log('12. ordenar, buscar, título');
var o1 = lista('condicion', { s: 'puntuacion:desc' }).filas;
ok('s=puntuacion:desc: de mayor a menor, null al final', o1.every(function (f, i, a) { return i === 0 || f.puntuacion == null || (a[i - 1].puntuacion != null && a[i - 1].puntuacion >= f.puntuacion); }));
var o2 = lista('estado', { s: 'villa:asc' }).filas;
ok('s=villa:asc: por nombre', o2.every(function (f, i, a) { return i === 0 || a[i - 1].villa.localeCompare(f.villa, 'es') <= 0; }));
var o3 = lista('estado', { s: 'completitud:asc' }).filas.filter(function (f) { return f.evaluados != null; });
ok('s=completitud:asc ordena por el número evaluado, no por el texto', o3.every(function (f, i, a) { return i === 0 || a[i - 1].evaluados <= f.evaluados; }));
ok('s con una columna desconocida no cambia el orden', J(lista('condicion', { s: 'nada:asc' }).filas) === J(co.filas));
ok('lineaTitulo: "<qué> · N filas · temporada 2026 · VM: Kike"', L.lineaTitulo(lista('obras:alta'), 2026, 'Kike') === lista('obras:alta').titulo + ' · ' + lista('obras:alta').filas.length + ' filas · temporada 2026 · VM: Kike', L.lineaTitulo(lista('obras:alta'), 2026, 'Kike'));
ok('lineaTitulo: 1 fila en singular; VM vacío = "todos"', L.lineaTitulo({ titulo: 'X', filas: [{}] }, 2026, '') === 'X · 1 fila · temporada 2026 · VM: todos');

console.log('13. CSV de exactamente las filas filtradas');
var fl = lista('obras', { partes: ['alta'], q: 'reparar' }), csv = L.csv(fl), lin = csv.replace(/^﻿/, '').replace(/\r\n$/, '').split('\r\n');
ok('BOM UTF-8 al principio', csv.charCodeAt(0) === 0xFEFF);
ok('una línea de cabecera + una por fila filtrada, separador ";", CRLF', lin.length === fl.filas.length + 1 && fl.filas.length > 0 && lin[0] === fl.columnas.map(function (c) { return c.label; }).join(';'), lin.length + ' vs ' + fl.filas.length);
var cn = L.csv({ columnas: [{ clave: 'a', label: 'A' }, { clave: 'n', label: 'N', num: true }, { clave: 'z', label: 'Z' }], filas: [{ a: '=SUMA(1)', n: 96.2, z: 'x;y "z"' }, { a: null, n: null, z: '-3' }] });
var cl = cn.replace(/^﻿/, '').split('\r\n');
ok('números con coma decimal; null vacío', cl[1].split(';')[1] === '96,2' && cl[2] === ';;-3', J(cl));
ok('texto que empieza por = lleva apóstrofo; ";" y comillas van entre comillas', cl[1].split(';')[0] === "'=SUMA(1)" && /"x;y ""z"""/.test(cl[1]), cl[1]);
var cneg = L.csv({ columnas: [{ clave: 'd', label: 'Diferencia', num: true }], filas: [{ d: -9.6 }] }).replace(/^\uFEFF/, '').split('\r\n');
ok('un número negativo sale "-9,6" (sin apóstrofo: no es una fórmula)', cneg[1] === '-9,6', cneg[1]);
ok('CSV de una lista vacía = solo la cabecera', L.csv(lista('coste')).replace(/^﻿/, '').split('\r\n').filter(Boolean).length === 1);

console.log('14. Ronda de arreglos 1: "Acción recomendada", filtros de obras en la ruta y N/A');
var colsOb = ob.columnas.map(function (c) { return c.label; });
ok('obras: columna "Acción recomendada" justo después de "Actuación"', colsOb[2] === 'Actuación' && colsOb[3] === 'Acción recomendada', J(colsOb));
var gr104 = lista('obras').filas.filter(function (f) { return f.villaid === 104 && /grifo/.test(f.accion); })[0] || {};
ok('104: la acción recomendada de Baño 1 sale en su columna ("Cambiar grifo")', gr104.recomendada === 'Cambiar grifo', J(gr104));
ok('una actuación solo de resumen no tiene acción recomendada', lista('obras', { fuente: 'resumen' }).filas.filter(function (f) { return f.fuentes.length === 1; }).every(function (f) { return f.recomendada === ''; }));
ok('CSV de obras con la columna nueva', L.csv(lista('obras')).replace(/^﻿/, '').split('\r\n')[0] === 'Casa;VM;Actuación;Acción recomendada;Motivo / impacto;Origen;Prioridad;Coste;Detalle');
var cE1 = { villaid: 1, villa: 'Solo acción', vm: '', vmId: '', informe_id: 1, estado: 'enviado', score: {}, flags: {},
  lineas: [{ seccion: 'estancia', clave: 'cocina', texto_1: '', texto_2: 'Cambiar campana', prioridad: 'Alta' }],
  acciones: [{ accion: 'Cambiar campana', prioridad: 'Alta', motivo: 'Cocina', fuentes: [{ seccion: 'estancia', clave: 'cocina', orden: 1 }], coste: null }] };
var fA = L.listas('obras', {}, [cE1], null).filas[0] || {};
ok('estancia con solo la acción: Actuación = la acción, sin repetirla en "Acción recomendada"', fA.accion === 'Cambiar campana' && fA.recomendada === '', J(fA));
ok('ruta lista:obras:<prioridad>:<origen> = filtros de prioridad y origen', lista('obras:alta:estancia').filas.length === lista('obras', { prioridad: 'alta', fuente: 'estancia' }).filas.length && lista('obras:alta:estancia').filas.length > 0
  && lista('obras:alta:estancia').filas.length < lista('obras:alta').filas.length + lista('obras', { fuente: 'estancia' }).filas.length
  && lista('obras:alta:estancia').filas.every(function (f) { return f.prioridadClave === 'alta' && f.fuentes.some(function (x) { return x.seccion === 'estancia'; }); }));
ok('ruta lista:obras:todas:resumen:sindetalle = origen resumen y sin detalle', lista('obras:todas:resumen:sindetalle').filas.length === lista('obras', { fuente: 'resumen', sindetalle: '1' }).filas.length
  && lista('obras:todas:resumen:sindetalle').filas.every(function (f) { return f.detalle && f.fuentes.some(function (x) { return x.seccion === 'resumen'; }); }) && lista('obras:todas:resumen:sindetalle').filas.length < ob.filas.length);
ok('el título nombra el origen y "sin detalle" (cabecera de impresión de la lista)', lista('obras:alta:estancia').titulo === 'Actuaciones de prioridad Alto · origen Estancia'
  && lista('obras:todas:resumen:sindetalle').titulo === 'Todas las actuaciones · origen Resumen · sin detalle' && lista('obras:sindetalle').titulo === 'Actuaciones sin detalle (falta motivo o prioridad)', lista('obras:todas:resumen:sindetalle').titulo);
var cNa = { villaid: 2, villa: 'Con N/A', vm: '', vmId: '', informe_id: 2, estado: 'enviado', score: {}, flags: {}, acciones: [],
  lineas: [{ seccion: 'interior', clave: 'sofas', estado: '', na: true, texto_1: 'No hay sofás' }, { seccion: 'interior', clave: 'menaje', estado: 'Bueno', na: 'x' }] };
var mNa = L.listas('mapa', { partes: ['sofas', 'na'] }, [cNa], null);
ok('mapa N/A (formulario v5): la casa con sofás en N/A sale en su lista, con su observación', mNa.filas.length === 1 && mNa.filas[0].marca === 'N/A' && mNa.filas[0].observacion === 'No hay sofás', J(mNa.filas));
ok('N/A estricto: na = "x" no es N/A (menaje cuenta en Bueno)', L.marcasDe(cNa).menaje.marca === 'bueno' && L.listas('mapa', { partes: ['menaje', 'na'] }, [cNa], null).filas.length === 0);

console.log('15. Ronda de arreglos 2: el resumen sin texto de actuación cuenta (regla de las estancias)');
var lR = [{ seccion: 'interior', clave: 'pavimentos', estado: 'Malo', texto_1: 'Escalón roto' }, { seccion: 'resumen', clave: 'accion_1', orden: 1, texto_1: '', texto_2: 'Riesgo de caída en la escalera', prioridad: 'Alta' }];
var cR = { villaid: 3, villa: 'Sa Escala', vm: '', vmId: '', informe_id: 3, estado: 'enviado', lineas: lR, score: IS.condicion(lR), flags: IS.banderas({}, lR), acciones: IS.acciones(lR) };
var oR = L.listas('obras', {}, [cR], null).filas;
ok('obras: la fila "Sin texto (Resumen 1)" Alto con su motivo y origen Resumen 1', oR.length === 1 && oR[0].accion === 'Sin texto (Resumen 1)' && oR[0].prioridad === 'Alto' && oR[0].motivo === 'Riesgo de caída en la escalera' && oR[0].origen === 'Resumen 1', J(oR));
ok('"Malo sin actuación" no la incluye; "Requiere atención" sí; obras:alta = 1', L.listas('malosinact', {}, [cR], null).filas.length === 0 && L.listas('atencion', {}, [cR], null).filas.length === 1 && L.listas('obras:alta', {}, [cR], null).filas.length === 1);

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exitCode = fail ? 1 : 0;
