/* cuadro-informes-temporada-portada.js — Portada: el nivel 1 del cuadro de informes de temporada v3
   (job informe-cuadro-v3a, lane C, 29/10/2026; diseño dashboard-v3-CONSENSUS-2026-10-29.md puntos 1, 2, 5, 6, 7, 10, 11, 13).
   Datos puros + su HTML: las casas (regla del último enviado), los seis cuadros, la fila "Listas", la tabla por villa manager,
   el mapa de problemas de cinco columnas y las tarjetas de las casas. Cada cifra es una puerta (href con la temporada y el VM).
   Usa InformeScore (informe-temporada-score.js, lane A) y Rutas.href (cuadro-informes-temporada-rutas.js, lane B) del navegador,
   o los que pase Portada.usar({InformeScore, Rutas}) (pruebas con node). Sin módulos, sin red, sin Caspio.
   Regla de recuento: cuadros, listas, mapa, tabla y obras cuentan solo informes ENVIADOS; los borradores salen en las tarjetas
   con la píldora "borrador" (su puntuación es una vista previa gris) y en la lista estado:borrador. */
(function (raiz) {
  'use strict';

  /* ── Dependencias de otras lanes ── */
  var DEP = {};
  function usar(d) { Object.keys(d || {}).forEach(function (k) { DEP[k] = d[k]; }); return Portada; }
  function dep(n) { if (DEP[n]) return DEP[n]; if (raiz && raiz[n]) return raiz[n]; return null; }
  function sc() { var s = dep('InformeScore'); if (!s) throw new Error('Portada: falta InformeScore (informe-temporada-score.js)'); return s; }

  /* ── Utilidades ── */
  var SIN_VM = 'sin';                       /* id de ruta para las casas sin villa manager (vm=sin) */
  var GRUPOS = [['interior', 'Interior'], ['exterior', 'Exterior'], ['seguridad', 'Seguridad e instalaciones']];
  function lw(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
  function tr(s) { return String(s == null ? '' : s).trim(); }
  function idNum(x) { var n = parseInt(x, 10); return isNaN(n) ? null : n; }
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function fmt1(n) { return n == null ? '—' : Number(n).toFixed(1).replace('.', ','); }
  function fechaISO(v) { var m = tr(v).match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? m[1] + '-' + m[2] + '-' + m[3] : ''; }
  function fechaVer(v) { var m = tr(v).match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? m[3] + '/' + m[2] + '/' + m[1] : ''; }
  function banda(x) { return x == null ? 'gris' : x < 50 ? 'rojo' : x < 80 ? 'ambar' : 'verde'; }
  function plural(n, u) { var P = { casas: ['casa', 'casas'], actuaciones: ['actuación', 'actuaciones'], provisionales: ['provisional', 'provisionales'], revisiones: ['revisión', 'revisiones'] }[u] || [u, u]; return n + ' ' + (n === 1 ? P[0] : P[1]); }
  function porNombre(a, b) { return String(a).localeCompare(String(b), 'es', { sensitivity: 'base' }); }
  function abrirUrl(villaid, temporada) { return 'informe-temporada.html?villaid=' + encodeURIComponent(villaid) + '&temporada=' + encodeURIComponent(temporada); }
  /* Media de puntuaciones de un decimal, redondeada hacia arriba a un decimal (en décimas enteras: sin errores de coma flotante) */
  function media(vals) {
    var v = (vals || []).filter(function (x) { return x != null && !isNaN(x); });
    if (!v.length) return null;
    var t = v.reduce(function (s, x) { return s + Math.round(x * 10); }, 0);
    return Math.floor(t / v.length + 0.5 + 1e-9) / 10;
  }
  /* Prioridad guardada Alta / Media / Baja (Alto / Medio / Bajo cuentan igual, como prioridadGuardar del formulario); '' = sin prioridad */
  function pri(a) { var s = lw(a && a.prioridad); return { alta: 'Alta', media: 'Media', baja: 'Baja', alto: 'Alta', medio: 'Media', bajo: 'Baja' }[s] || ''; }
  function sinDetalle(a) { return !tr(a && a.motivo) || !pri(a); }
  /* Comentario de huésped con origen Review (columna estado) y algún texto: la regla de InformeScore.esComentario (cuadro, lista y casa) */
  function esComentario(l) { var S = sc(); return typeof S.esComentario === 'function' ? S.esComentario(l) : !!l && l.seccion === 'huesped' && !!(tr(l.texto_1) || tr(l.texto_2)); }
  function esReview(l) { return esComentario(l) && lw(l.estado) === 'review'; }
  function esFinal(c) { return !!(c && c.score && c.score.completo === true && c.score.puntuacion != null); }
  function enviadas(casas) { return (casas || []).filter(function (c) { return c.estado === 'enviado'; }); }
  function flat(casas, campo) { return [].concat.apply([], (casas || []).map(function (c) { return c[campo] || []; })); }
  function seguridadDe(c) { return (c.flags && c.flags.seguridad) || []; }
  function peligroDe(c) { return !!(c.flags && c.flags.peligro === true); }
  function altaDe(c) { return (c.acciones || []).filter(function (a) { return pri(a) === 'Alta'; }).length; }
  /* Formulario v5: banda de coste de una actuación ('' = en blanco) y su clave de ruta (lista:coste:<clave>, solo [a-z0-9_]) */
  var BANDAS = [['<500', 'menos500', 'menos de 500 €'], ['500-2000', '500a2000', '500 a 2.000 €'], ['2000-10000', '2000a10000', '2.000 a 10.000 €'],
    ['10000+', 'mas10000', 'más de 10.000 €'], ['desconocido', 'desconocido', 'desconocido']];
  function costeDe(a) { var S = sc(); return typeof S.costeNorm === 'function' ? S.costeNorm(a && a.coste) : ''; }
  function costeDistintoDe(a) { var S = sc(); return typeof S.costeDistinto === 'function' && S.costeDistinto(a); }
  function v5De(c) { return c.v5 === true; }
  function revisionDe(v) { var n = parseInt(v, 10); return isNaN(n) ? null : n; }

  /* ── Las casas ── */
  /* Villa manager: KeyHolder_person es un contacto (ContactID) o un usuario (UserID); id con su origen (copia de vmDe de v2) */
  function vmDe(kh, contacts, users) {
    var id = tr(kh); if (!id) return { id: '', name: '' };
    var c = (contacts || []).filter(function (x) { return x.id === id; })[0]; if (c) return { id: 'c:' + id, name: c.name };
    var u = (users || []).filter(function (x) { return x.id === id; })[0]; return u ? { id: 'u:' + id, name: u.name } : { id: '', name: '' };
  }
  function sello(v) { var s = tr(v); if (!s) return null; var t = Date.parse(s); return isNaN(t) ? null : t; }
  function cmpSello(a, b) { if (a === null && b === null) return 0; if (a === null) return -1; if (b === null) return 1; return a - b; }
  /* > 0 si a es más reciente: enviado_at (con fecha gana a sin fecha), después updated_at, después el informe_id más alto */
  function masReciente(a, b) {
    return cmpSello(sello(a.enviado_at), sello(b.enviado_at)) || cmpSello(sello(a.updated_at), sello(b.updated_at)) || ((idNum(a.informe_id) || 0) - (idNum(b.informe_id) || 0));
  }
  /* El informe que vale para la villa: el último ENVIADO; sin enviados, el último borrador. Un borrador nunca desplaza a un enviado.
     (v2 tomaba el informe_id más bajo.) */
  function elegirInforme(lista) {
    var env = (lista || []).filter(function (i) { return lw(i.estado) === 'enviado'; }), pool = env.length ? env : (lista || []), m = null;
    pool.forEach(function (i) { if (!m || masReciente(i, m) > 0) m = i; });
    return m;
  }
  /* Una fila por villa activa (contrato de LANES-JOB1.md + enviado_at, la fecha de envío solo si está registrada) */
  function construirCasasV3(villas, informes, lineas, contacts, users, temporada) {
    var S = sc(), porVilla = {}, porInf = {};
    (informes || []).forEach(function (i) { if (!i || idNum(i.informe_id) === null) return; var k = String(i.villaid); (porVilla[k] = porVilla[k] || []).push(i); });
    (lineas || []).forEach(function (l) { if (!l) return; var k = String(idNum(l.informe_id)); (porInf[k] = porInf[k] || []).push(l); });
    return (villas || []).map(function (v) {
      var inf = elegirInforme(porVilla[String(v.villaid)]), id = inf ? idNum(inf.informe_id) : null, ls = inf ? (porInf[String(id)] || []) : [];
      var g = inf ? lw(inf.estado_general) : '', vm = vmDe(v.KeyHolder_person, contacts, users);
      return {
        villaid: v.villaid, villa: String(v.Name || ('Villa ' + v.villaid)), vm: vm.name, vmId: vm.id, informe_id: id,
        estado: inf ? (lw(inf.estado) === 'enviado' ? 'enviado' : 'borrador') : '',
        general: ['bueno', 'regular', 'malo'].indexOf(g) >= 0 ? g : '',
        fecha: inf ? fechaISO(inf.fecha_revision) : '', updated: inf ? tr(inf.updated_at) : '', enviado_at: inf ? tr(inf.enviado_at) : '',
        /* Formulario v5 (cuadro v4): cabecera de historial; v5 = el informe trae datos del formulario v5 (InformeScore.datosV5) */
        revision: inf ? revisionDe(inf.revision) : null, historial: inf ? String(inf.historial == null ? '' : inf.historial).trim() : '', enviado_por: inf ? tr(inf.enviado_por) : '',
        v5: !!(inf && typeof S.datosV5 === 'function' && S.datosV5(inf, ls)),
        observaciones_finales: inf ? tr(inf.observaciones_finales) : '',   /* integración: el texto final que pinta Vistas.casaHtml */
        /* Ronda de arreglos 1: informes de la villa en la temporada y el que abre el formulario (informe_id más bajo, primerInforme del formulario) */
        informes: (porVilla[String(v.villaid)] || []).length,
        informeFormulario: (porVilla[String(v.villaid)] || []).reduce(function (m, i) { var n = idNum(i.informe_id); return m === null || n < m ? n : m; }, null),
        lineas: ls, score: S.condicion(ls),
        flags: inf ? S.banderas(inf, ls) : { peligro: null, seguridad: [], coherencia: null },
        acciones: inf ? (S.acciones(ls) || []) : [],
        url: abrirUrl(v.villaid, temporada)
      };
    });
  }
  /* Filtro de villa manager de la ruta: '' = todas, SIN_VM = las casas sin villa manager, si no el vmId exacto */
  function filtrarVM(casas, vm) {
    if (!vm) return casas || [];
    return (casas || []).filter(function (c) { return vm === SIN_VM ? !c.vmId : c.vmId === vm; });
  }
  /* Marca de cada uno de los 26 elementos: bueno | regular | malo | na | '' (sin marcar). Con InformeScore.marcas (ronda de arreglos 1):
     la misma regla que la puntuación (fila repetida = la última en orden, N/A estricto); sin él, la regla antigua (linea_id más alto) */
  function marcasDe(casa) {
    var S = sc();
    if (typeof S.marcas === 'function') {
      var pc = S.marcas((casa && casa.lineas) || []).porClave, r = {};
      Object.keys(pc).forEach(function (k) { r[k] = pc[k].marca; });
      return r;
    }
    var def = S.elementosDef(), es = {}, mejor = {}, out = {};
    def.forEach(function (e) { es[e.seccion + '|' + e.clave] = e.clave; });
    ((casa && casa.lineas) || []).forEach(function (l) {
      var k = l && es[l.seccion + '|' + l.clave]; if (!k) return;
      var p = mejor[k]; if (p && (idNum(p.linea_id) || 0) >= (idNum(l.linea_id) || 0)) return; mejor[k] = l;
    });
    def.forEach(function (e) { var l = mejor[e.clave], m = l ? (l.na === true || l.na === 1 ? 'na' : lw(l.estado)) : ''; out[e.clave] = ['bueno', 'regular', 'malo', 'na'].indexOf(m) >= 0 ? m : ''; });
    return out;
  }
  function malosDe(c) { var m = marcasDe(c); return Object.keys(m).filter(function (k) { return m[k] === 'malo'; }).length; }
  /* Casas con informe enviado en las dos temporadas y algún elemento evaluado en ambas (InformeScore.comparar(anterior, actual)) */
  function pares(env, prev) {
    var S = sc(), pp = {}, out = [];
    enviadas(prev).forEach(function (p) { pp[String(p.villaid)] = p; });
    env.forEach(function (c) { var p = pp[String(c.villaid)]; if (!p) return; var r = S.comparar(p.lineas, c.lineas); if (r && r.n > 0) out.push({ casa: c, prev: p, r: r }); });
    return out;
  }

  /* ── Los seis cuadros ── */
  function tilesV3(casas, prev) {
    casas = casas || [];
    var env = enviadas(casas), bor = casas.filter(function (c) { return c.estado === 'borrador'; }), sin = casas.filter(function (c) { return !c.estado; });
    var fin = env.filter(esFinal), med = media(fin.map(function (c) { return c.score.puntuacion; }));
    var peor = fin.slice().sort(function (a, b) { return (a.score.puntuacion - b.score.puntuacion) || porNombre(a.villa, b.villa); })[0] || null;
    var comp = null;
    if (prev != null) { var ps = pares(env, prev); comp = { casas: ps.length, mediaPrev: media(ps.map(function (x) { return x.r.puntuacionA; })), mediaAct: media(ps.map(function (x) { return x.r.puntuacionB; })) }; }
    var seg = env.filter(function (c) { return seguridadDe(c).length > 0; }).length, pel = env.filter(peligroDe).length;
    var pelDato = env.some(function (c) { return c.flags && c.flags.peligro !== null && c.flags.peligro !== undefined; });
    var sinDato = env.filter(function (c) { return !c.flags || c.flags.peligro === null || c.flags.peligro === undefined; }).length;
    var acc = flat(env, 'acciones'), cp = function (p) { return acc.filter(function (a) { return pri(a) === p; }).length; };
    var rev = []; env.forEach(function (c) { (c.lineas || []).forEach(function (l) { if (esReview(l)) rev.push(String(c.villaid)); }); });
    var casasRev = rev.filter(function (x, i) { return rev.indexOf(x) === i; }).length;
    return {
      entregados: { n: env.length, de: casas.length, borrador: bor.length, sin: sin.length, pct: casas.length ? Math.round(env.length * 100 / casas.length) : 0,
        puertas: [{ v: 'lista:estado:enviado', n: env.length }, { v: 'lista:estado:borrador', n: bor.length }, { v: 'lista:estado:sin', n: sin.length }] },
      condicion: { media: med, banda: banda(med), n: fin.length, N: env.length, provisionales: env.length - fin.length,
        peor: peor ? { villaid: peor.villaid, villa: peor.villa, puntuacion: peor.score.puntuacion } : null, comparacion: comp,
        puertas: [{ v: 'lista:condicion', n: env.length }, { v: 'lista:condicion:final', n: fin.length }, { v: 'lista:provisionales', n: env.length - fin.length }].concat(comp ? [{ v: 'lista:comparacion', n: comp.casas }] : []) },
      alertas: { n: pel + seg, peligro: pel, seguridad: seg, peligroDato: pelDato, sinDato: sinDato,
        puertas: [{ v: 'lista:alertas', n: pel + seg }, { v: 'lista:alertas:seguridad', n: seg }].concat(pelDato ? [{ v: 'lista:alertas:peligro', n: pel }] : []) },
      obras: { n: acc.length, alta: cp('Alta'), media: cp('Media'), baja: cp('Baja'), sin: cp(''), borradores: flat(bor, 'acciones').length,
        puertas: [{ v: 'lista:obras:todas', n: acc.length }, { v: 'lista:obras:alta', n: cp('Alta') }, { v: 'lista:obras:media', n: cp('Media') }, { v: 'lista:obras:baja', n: cp('Baja') }, { v: 'lista:obras:sin', n: cp('') }] },
      coste: costeTile(env, acc),
      review: { n: rev.length, casas: casasRev, puertas: [{ v: 'lista:review', n: rev.length }] }
    };
  }

  /* Cuadro "Actuaciones por banda de coste": sin ningún informe enviado con datos v5 ni banda, "sin datos: formulario v5" (n null);
     si no, n = actuaciones con banda ("desconocido" incluido), una cifra por banda, en blanco y coste distinto, cada una con su puerta */
  function costeTile(env, acc) {
    var hay = env.some(v5De) || acc.some(function (a) { return !!costeDe(a); });
    if (!hay) return { n: null, texto: 'sin datos: formulario v5' };
    var bandas = {}, blanco = 0, distintos = 0, n = 0;
    BANDAS.forEach(function (b) { bandas[b[0]] = 0; });
    acc.forEach(function (a) { var c = costeDe(a); if (c) { bandas[c]++; n++; } else blanco++; if (costeDistintoDe(a)) distintos++; });
    var puertas = [{ v: 'lista:coste', n: n }].concat(BANDAS.map(function (b) { return { v: 'lista:coste:' + b[1], n: bandas[b[0]] }; }),
      [{ v: 'lista:coste:sincoste', n: blanco }, { v: 'lista:coste:distinto', n: distintos }]);
    return { n: n, bandas: bandas, blanco: blanco, distintos: distintos, texto: '', puertas: puertas };
  }

  /* ── La fila "Listas" (n = filas de la lista; Repetido sin cifra hasta leer la temporada anterior) ── */
  function listasRapidas(casas, prev) {
    var env = enviadas(casas), acc = flat(env, 'acciones');
    var aten = env.filter(function (c) { return peligroDe(c) || seguridadDe(c).length > 0 || altaDe(c) > 0 || !esFinal(c); }).length;
    var msa = env.filter(function (c) { return malosDe(c) > 0 && !(c.acciones || []).length; }).length;
    var rep = prev == null ? null : pares(env, prev).reduce(function (s, x) { return s + ((x.r.repetidos || []).length); }, 0);
    return [
      { v: 'lista:atencion', label: 'Requiere atención', n: aten },
      { v: 'lista:malosinact', label: 'Malo sin actuación', n: msa },
      { v: 'lista:repetido', label: 'Repetido', n: rep },
      { v: 'lista:marcas:malo', label: 'Todas las marcas Malo', n: env.reduce(function (s, c) { return s + malosDe(c); }, 0) },
      { v: 'lista:obras:sindetalle', label: 'Obras sin detalle', n: acc.filter(sinDetalle).length }
    ];
  }

  /* ── Tabla por villa manager ── */
  var VM_COLS = [['nombre', 'Villa manager'], ['casas', 'Casas', 1], ['enviados', 'Enviados', 1], ['borradores', 'Borrador', 1], ['sin', 'Sin informe', 1],
    ['media', 'Condición media', 1], ['malo', 'Malo', 1], ['alta', 'Alto', 1], ['alertas', 'Alertas', 1], ['ultimo', 'Último envío']];
  function statsVM(cs) {
    var env = enviadas(cs), fin = env.filter(esFinal);
    var ult = env.map(function (c) { return c.enviado_at; }).filter(function (x) { return sello(x) !== null; }).sort(function (a, b) { return sello(a) - sello(b); }).pop() || '';
    return { casas: cs.length, enviados: env.length, borradores: cs.filter(function (c) { return c.estado === 'borrador'; }).length, sin: cs.filter(function (c) { return !c.estado; }).length,
      media: media(fin.map(function (c) { return c.score.puntuacion; })), n: fin.length, N: env.length,
      malo: env.reduce(function (s, c) { return s + malosDe(c); }, 0), alta: env.reduce(function (s, c) { return s + altaDe(c); }, 0),
      alertas: env.filter(peligroDe).length + env.filter(function (c) { return seguridadDe(c).length > 0; }).length, ultimo: ult };
  }
  /* s = 'clave:asc' | 'clave:desc' (la s de la ruta en el nivel 1). Vacíos al final en los dos sentidos; empate por nombre */
  function ordenarFilas(filas, s) {
    var p = String(s || '').split(':'), k = p[0], dir = p[1] === 'desc' ? -1 : 1;
    if (!VM_COLS.some(function (c) { return c[0] === k; })) return filas;
    var val = function (f) { var x = f[k]; if (k === 'ultimo') return sello(x); return x === '' || x === undefined ? null : x; };
    return filas.slice().sort(function (a, b) {
      var x = val(a), y = val(b);
      if (x === null && y === null) return porNombre(a.nombre, b.nombre); if (x === null) return 1; if (y === null) return -1;
      var d = typeof x === 'number' && typeof y === 'number' ? x - y : porNombre(x, y);
      return (d * dir) || porNombre(a.nombre, b.nombre);
    });
  }
  function tablaVM(casas, s) {
    casas = casas || [];
    var nombres = {}, ids = [];
    casas.forEach(function (c) { var id = c.vmId || SIN_VM; if (!(id in nombres)) { nombres[id] = c.vmId ? (c.vm || c.vmId) : 'Sin villa manager'; ids.push(id); } });
    /* Dos ids con el mismo nombre son dos filas ("Kike", "Kike (2)"), como los chips de v2 */
    ids.sort(function (a, b) { if (a === SIN_VM) return 1; if (b === SIN_VM) return -1; return porNombre(nombres[a], nombres[b]) || (a < b ? -1 : a > b ? 1 : 0); });
    var vistos = {};
    var filas = ids.map(function (id) {
      var nom = nombres[id], k = lw(nom); vistos[k] = (vistos[k] || 0) + 1;
      return Object.assign({ vmId: id, nombre: nom + (id !== SIN_VM && vistos[k] > 1 ? ' (' + vistos[k] + ')' : '') }, statsVM(filtrarVM(casas, id)));
    });
    return { filas: s ? ordenarFilas(filas, s) : filas, total: Object.assign({ vmId: '', nombre: 'Todos' }, statsVM(casas)), s: s || '' };
  }

  /* ── Mapa de problemas: cinco columnas por elemento, una casa enviada cuenta una vez por elemento ── */
  function mapaV3(casas) {
    var def = sc().elementosDef(), env = enviadas(casas), cnt = {}, naDato = env.some(v5De);
    def.forEach(function (e) { cnt[e.clave] = { bueno: 0, regular: 0, malo: 0, sin: 0, na: 0 }; });
    env.forEach(function (c) { var m = marcasDe(c); def.forEach(function (e) { cnt[e.clave][m[e.clave] || 'sin']++; }); });
    var out = [];
    GRUPOS.forEach(function (g) {
      def.map(function (e, i) { return [e, i]; }).filter(function (x) { return x[0].seccion === g[0]; })
        .sort(function (x, y) { var a = cnt[x[0].clave], b = cnt[y[0].clave]; return (b.malo - a.malo) || (b.regular - a.regular) || (x[1] - y[1]); })
        .forEach(function (x) { var e = x[0], m = cnt[e.clave]; out.push({ clave: e.clave, label: e.label, seccion: e.seccion, bueno: m.bueno, regular: m.regular, malo: m.malo, sin: m.sin, na: m.na, naDato: naDato || m.na > 0 }); });
    });
    return out;
  }

  /* ── Tarjetas: enviados (peligro, revisión de seguridad, peor condición, incompletas, nombre), después borradores, después sin informe ── */
  function largoDe(clave) { var e = sc().elementosDef().filter(function (x) { return x.clave === clave; })[0]; return e ? String(e.label) : clave; }
  function corto(clave) { var e = sc().elementosDef().filter(function (x) { return x.clave === clave; })[0]; return e ? String(e.label).replace(/\s*\(.*\)\s*/, '').trim() : clave; }
  function banderasDe(c) {
    var b = [], seg = seguridadDe(c), co = c.flags && c.flags.coherencia;
    if (peligroDe(c)) {
      var ps = (c.flags && c.flags.peligros) || [], t0 = ps.length ? tr(ps[0].texto) : '';
      var corte = t0.length > 40 ? t0.slice(0, 40).trim() + '…' : t0;
      b.push({ tipo: 'peligro', icono: '⚠', texto: corte ? 'peligro: ' + corte + (ps.length > 1 ? ' (+' + (ps.length - 1) + ')' : '') : 'peligro',
        largo: ps.length ? 'Peligro: ' + ps.map(function (p) { return largoDe(p.clave) + ': ' + (tr(p.texto) || 'sin texto'); }).join(' · ') : 'Peligro señalado en el formulario' });
    }
    if (seg.length) b.push({ tipo: 'seguridad', icono: '🔒', texto: 'revisión seguridad', largo: 'Revisión de seguridad: Malo en ' + seg.map(corto).join(', '), claves: seg.slice() });
    if (co) b.push({ tipo: 'coherencia', icono: '❓', texto: 'estado general incoherente', largo: co === 'bueno_con_malo' ? 'Estado general «Bueno» con marcas Malo' : 'Estado general «Malo» con todo en Bueno' });
    if (c.score && c.score.error) b.push({ tipo: 'datos', icono: '⚠', texto: 'datos con error', largo: 'Elemento repetido o marca no válida: sin puntuación' });
    return b;
  }
  function tarjetas(casas) {
    var rango = { enviado: 0, borrador: 1 };
    var punt = function (c) { return c.score ? c.score.puntuacion : null; };
    var ord = (casas || []).slice().sort(function (a, b) {
      var ra = a.estado in rango ? rango[a.estado] : 2, rb = b.estado in rango ? rango[b.estado] : 2;
      if (ra !== rb) return ra - rb;
      if (ra < 2) {
        if (peligroDe(a) !== peligroDe(b)) return peligroDe(a) ? -1 : 1;
        var ga = seguridadDe(a).length > 0, gb = seguridadDe(b).length > 0; if (ga !== gb) return ga ? -1 : 1;
        var x = punt(a), y = punt(b);
        if (x !== y) { if (x == null) return 1; if (y == null) return -1; if (x !== y) return x - y; }
        var ca = !!(a.score && a.score.completo), cb = !!(b.score && b.score.completo); if (ca !== cb) return ca ? 1 : -1;
      }
      return porNombre(a.villa, b.villa);
    });
    return ord.map(function (c) {
      var s = c.score || {}, p = s.puntuacion == null ? null : s.puntuacion;
      return { villaid: c.villaid, villa: c.villa, vm: c.vm, vmId: c.vmId, estado: c.estado, borrador: c.estado === 'borrador', previa: c.estado === 'borrador',
        trasEnvio: c.estado === 'borrador' && c.revision != null && c.revision >= 1,
        puntuacion: p, banda: c.estado === 'enviado' ? (s.banda || banda(p)) : 'gris', completo: !!s.completo,
        evaluados: s.evaluados || 0, aplicables: s.aplicables == null ? 26 : s.aplicables, error: s.error || null,
        banderas: c.estado ? banderasDe(c) : [], alta: altaDe(c), fecha: c.fecha, enviado_at: c.enviado_at || '', updated: c.updated, v: 'casa:' + c.villaid,
        otroInforme: c.informes > 1 && c.informeFormulario != null && c.informeFormulario !== c.informe_id ? { n: c.informes, formulario: c.informeFormulario } : null };
    });
  }

  /* ── HTML (clases y palabras de la maqueta dashboard-v3-maqueta-2026-10-29.html) ── */
  var ORDEN_RUTA = ['t', 'vm', 'v', 's', 'q', 'g', 'from', 'vs'];
  /* Mismo formato que la maqueta: #t=2026&vm=c:12&v=lista:obras:alta&s=villa:asc ... (Rutas.href de la lane B cuando está cargado) */
  function hrefPropio(r) {
    return '#' + ORDEN_RUTA.filter(function (k) { return r[k] !== undefined && r[k] !== null && r[k] !== ''; })
      .map(function (k) { return k + '=' + encodeURIComponent(String(r[k])).replace(/%3A/gi, ':'); }).join('&');
  }
  function href(r) { var R = dep('Rutas'); return R && typeof R.href === 'function' ? R.href(r) : hrefPropio(r); }
  function base(route) { return { t: route && route.t != null ? String(route.t) : '', vm: (route && route.vm) || '' }; }
  /* vs: el orden de la tabla de villa managers (la s del cuadro) viaja a la lista o a la casa y vuelve con «‹ Cuadro» (Rutas.back) */
  function vsDe(route) { return route ? (route.v ? route.vs || '' : route.s || '') : ''; }
  function puerta(route, v, extra) { return href(Object.assign(base(route), { v: v, vs: vsDe(route) }, extra || {})); }
  function a(route, v, txt, extra) { return '<a href="' + esc(puerta(route, v, extra)) + '">' + txt + '</a>'; }
  var CLASE_TILE = { verde: 'verde', ambar: 'naranja', rojo: 'rojo', gris: 'gris' };

  function tile(route, cls, k, vHtml, v, sHtml, extra) {
    var h = v ? esc(puerta(route, v)) : '';
    return '<div class="tile ' + cls + '"' + (v ? ' data-href="' + h + '"' : '') + '><div class="k">' + k + '</div><div class="v">' + (v ? '<a href="' + h + '">' + vHtml + '</a>' : vHtml) + '</div>'
      + '<div class="s">' + sHtml + '</div>' + (extra || '') + '</div>';
  }
  function tilesHtml(T, route) {
    var t = parseInt(route && route.t, 10), E = T.entregados, C = T.condicion, A = T.alertas, O = T.obras, R = T.review, ant = isNaN(t) ? 'la temporada anterior' : String(t - 1);
    var comp = C.comparacion === null ? a(route, 'lista:comparacion', 'vs ' + ant + ': comparar (se lee al abrir)')
      : C.comparacion.casas ? a(route, 'lista:comparacion', 'vs ' + ant + ': ' + fmt1(C.comparacion.mediaPrev) + ' → ' + fmt1(C.comparacion.mediaAct) + ' en ' + plural(C.comparacion.casas, 'casas'))
        : a(route, 'lista:comparacion', 'vs ' + ant + ': ninguna casa con informe enviado en las dos temporadas');
    return '<div class="tiles">'
      + tile(route, 'verde', 'Entregados', E.n + ' <span class="de">de ' + E.de + '</span>', 'lista:estado:enviado',
        a(route, 'lista:estado:borrador', E.borrador + ' en borrador') + ' · ' + a(route, 'lista:estado:sin', E.sin + ' sin informe'),
        '<div class="bar"><i style="width:' + E.pct + '%"></i></div>')
      + tile(route, CLASE_TILE[C.banda] || 'gris', 'Condición media', fmt1(C.media), 'lista:condicion:final',   /* antes del push: la cifra es la media de las n finales y abre esas n */
        a(route, 'lista:condicion:final', C.n + ' de ' + C.N + ' casas con puntuación final')   /* ronda de arreglos 2: el enlace abre las n finales */
        + ' · ' + a(route, 'lista:condicion', 'los ' + C.N + ' enviados')
        + (C.provisionales ? ' · ' + a(route, 'lista:provisionales', plural(C.provisionales, 'provisionales')) : '')
        + (C.peor ? ' · la más baja: ' + a(route, 'casa:' + C.peor.villaid, esc(C.peor.villa) + ' ' + fmt1(C.peor.puntuacion), { from: 'lista:condicion' }) : ''),
        '<div class="s">' + comp + '</div>')
      + tile(route, A.n ? 'rojo' : 'verde', 'Alertas', String(A.n), 'lista:alertas',
        a(route, 'lista:alertas:seguridad', plural(A.seguridad, 'revisiones') + ' de seguridad') + ' · '
        + (A.peligroDato ? a(route, 'lista:alertas:peligro', A.peligro + ' peligro' + (A.peligro === 1 ? '' : 's'))
          + (A.sinDato ? ' · ' + A.sinDato + ' sin dato de peligro (antes de la v5)' : '') : 'peligro: dato del formulario v5'))
      + tile(route, 'naranja', 'Obras por prioridad', O.n + ' <span class="de">actuaciones</span>', 'lista:obras:todas',
        a(route, 'lista:obras:alta', 'Alto ' + O.alta) + ' · ' + a(route, 'lista:obras:media', 'Medio ' + O.media) + ' · ' + a(route, 'lista:obras:baja', 'Bajo ' + O.baja)
        + (O.sin ? ' · ' + a(route, 'lista:obras:sin', 'sin prioridad ' + O.sin) : ''),
        O.borradores ? '<div class="s">' + O.borradores + ' más en borradores (no cuentan)</div>' : '')
      + costeTileHtml(T.coste, route)
      + tile(route, '', 'Comentarios Review', String(R.n), 'lista:review', 'en ' + plural(R.casas, 'casas') + ' · origen Review')
      + '</div>';
  }
  function costeTileHtml(K, route) {
    if (!K || K.n === null || K.n === undefined) return tile(route, 'gris', 'Actuaciones por banda de coste', '—', 'lista:coste', '<span class="sin-datos">' + esc((K && K.texto) || 'sin datos: formulario v5') + '</span>');
    return tile(route, '', 'Actuaciones por banda de coste', K.n + ' <span class="de">con banda</span>', 'lista:coste',
      BANDAS.map(function (b) { return a(route, 'lista:coste:' + b[1], esc(b[2]) + ' ' + K.bandas[b[0]]); }).join(' · ')
      + ' · ' + a(route, 'lista:coste:sincoste', 'en blanco ' + K.blanco)
      + (K.distintos ? ' · ' + a(route, 'lista:coste:distinto', K.distintos + ' coste distinto') : ''));
  }
  function listasRapidasHtml(LR, route) {
    var t = parseInt(route && route.t, 10);
    return '<div class="rapidas no-print"><span>Listas:</span>' + (LR || []).map(function (x) {
      var lab = x.v === 'lista:repetido' && !isNaN(t) ? 'Repetido ' + (t - 1) + '–' + t : x.label;
      return '<a href="' + esc(puerta(route, x.v)) + '">' + esc(lab) + (x.n === null ? '' : ' · ' + x.n) + '</a>';
    }).join('') + '</div>';
  }
  function tablaVMHtml(V, route) {
    var b = base(route), s = String((route && route.s) || V.s || ''), sp = s.split(':');
    var th = VM_COLS.map(function (c) {
      var activa = sp[0] === c[0], dir = activa ? (sp[1] === 'desc' ? 'asc' : 'desc') : (c[2] ? 'desc' : 'asc');
      var flecha = activa ? (sp[1] === 'desc' ? ' ▼' : ' ▲') : '';
      return '<th' + (c[2] ? ' class="num"' : '') + (activa ? ' aria-sort="' + (sp[1] === 'desc' ? 'descending' : 'ascending') + '"' : '') + '><a href="'
        + esc(href(Object.assign({}, b, { s: c[0] + ':' + dir }))) + '">' + esc(c[1]) + flecha + '</a></th>';
    }).join('');
    var cel = function (f, v, txt, lab) { return '<td class="num" data-l="' + esc(lab) + '"><a class="cel" href="' + esc(href({ t: b.t, vm: f.vmId, v: 'lista:' + v, vs: vsDe(route) })) + '">' + txt + '</a></td>'; };
    var fila = function (f, tot) {
      return '<tr' + (tot ? ' class="total"' : '') + '><td data-l="Villa manager"><a class="cel" href="' + esc(href({ t: b.t, vm: f.vmId, v: 'lista:estado:todas', vs: vsDe(route) })) + '"><b>' + esc(f.nombre) + '</b></a></td>'
        + cel(f, 'estado:todas', f.casas, 'Casas') + cel(f, 'estado:enviado', f.enviados, 'Enviados') + cel(f, 'estado:borrador', f.borradores, 'Borrador') + cel(f, 'estado:sin', f.sin, 'Sin informe')
        + cel(f, 'condicion:final', '<span class="sc ' + banda(f.media) + '">' + fmt1(f.media) + '</span> <span class="cmp">' + f.n + ' de ' + f.N + '</span>', 'Condición media')
        + cel(f, 'marcas:malo', f.malo, 'Malo') + cel(f, 'obras:alta', f.alta, 'Alto') + cel(f, 'alertas', f.alertas, 'Alertas')
        + cel(f, 'estado:enviado', f.ultimo ? fechaVer(f.ultimo) : '—', 'Último envío') + '</tr>';
    };
    return '<div class="card"><h3>Por villa manager <small>· clic en una cifra: las filas que la forman · clic en una cabecera: ordenar</small></h3><div class="vmwrap"><table class="vmt">'
      + '<thead><tr>' + th + '</tr></thead><tbody>' + V.filas.map(function (f) { return fila(f); }).join('') + (b.vm ? '' : fila(V.total, true)) + '</tbody></table></div>'
      + '<p class="small-print">Condición media: solo informes enviados y completos (n de N = puntuación final de N enviados). Último envío: solo cuando la fecha de envío está registrada.</p></div>';
  }
  function claseCalor(n) { return n <= 0 ? 'h0' : n <= 1 ? 'h1' : n <= 3 ? 'h2' : n <= 6 ? 'h3' : 'h4'; }
  function mapaHtml(MP, route) {
    var celda = function (e, m, n, cls, txt) { return '<a class="heat ' + cls + '" href="' + esc(puerta(route, 'lista:mapa:' + e.clave + ':' + m)) + '" title="Ver las casas">' + (txt == null ? n : txt) + '</a>'; };
    return '<div class="card"><h3>Mapa de problemas <small>· nº de casas por marca (informes enviados) · clic en la cifra: las casas y sus observaciones · clic en el elemento: todos sus registros</small></h3>'
      + '<table class="stack mapa"><thead><tr><th>Elemento</th><th class="num">Bueno</th><th class="num">Regular</th><th class="num">Malo</th><th class="num">Sin marcar</th><th class="num">N/A</th></tr></thead><tbody>'
      + GRUPOS.map(function (g) {
        var filas = (MP || []).filter(function (e) { return e.seccion === g[0]; });
        if (!filas.length) return '';
        return '<tr class="sec-row"><td class="sec" colspan="6">' + esc(g[1]) + '</td></tr>' + filas.map(function (e) {
          return '<tr><td class="casa-n" data-l="Elemento"><a href="' + esc(puerta(route, 'lista:elemento:' + e.clave)) + '" title="Todos sus registros">' + esc(e.label) + '</a></td>'
            + '<td class="num" data-l="Bueno">' + celda(e, 'bueno', e.bueno, e.bueno ? 'hb' : 'h0') + '</td>'
            + '<td class="num" data-l="Regular">' + celda(e, 'regular', e.regular, e.regular ? 'hr' : 'h0') + '</td>'
            + '<td class="num" data-l="Malo">' + celda(e, 'malo', e.malo, claseCalor(e.malo)) + '</td>'
            + '<td class="num" data-l="Sin marcar">' + celda(e, 'sin', e.sin, e.sin ? 'hs' : 'h0') + '</td>'
            + '<td class="num" data-l="N/A">' + celda(e, 'na', e.na, 'h0', e.na || e.naDato ? null : '—') + '</td></tr>';
        }).join('');
      }).join('') + '</tbody></table>'
      + '<p class="small-print">' + ((MP || []).some(function (e) { return e.naDato; }) ? 'N/A = el elemento no existe en la casa (el motivo está en el informe); los informes anteriores a la v5 no tienen N/A.'
        : 'N/A llega con el formulario v5.') + ' Un elemento con muchas casas en Malo es una compra o una obra que se planifica una sola vez.</p></div>';
  }
  function tarjetaHtml(k, route) {
    var h = esc(puerta(route, k.v)), vm = esc(k.vm || 'sin villa manager');
    if (!k.estado) return '<a class="casa s" href="' + h + '"><div class="n">' + esc(k.villa) + '</div><div class="fila"><span class="pill sin">SIN INFORME</span></div><div class="vm">' + vm + ' · no entregado</div></a>';
    var fl = k.banderas.map(function (b) { return '<span class="fl ' + ({ peligro: 'peligro', seguridad: 'seg', coherencia: 'san', datos: 'peligro' }[b.tipo]) + '" title="' + esc(b.largo) + '">' + b.icono + ' ' + esc(b.texto) + '</span>'; }).join(' ');
    var fechas = k.borrador ? (k.updated ? 'guardado ' + fechaVer(k.updated) : 'borrador')
      : [k.enviado_at ? 'enviado ' + fechaVer(k.enviado_at) : '', k.fecha ? 'revisión ' + fechaVer(k.fecha) : ''].filter(Boolean).join(' · ');
    return '<a class="casa ' + k.banda + '" href="' + h + '"><div class="n">' + esc(k.villa) + '</div>'
      + '<div class="fila"><span class="sc ' + k.banda + '">' + fmt1(k.puntuacion) + '</span>'
      + (k.previa ? ' <small class="prov">vista previa</small>' : k.puntuacion != null && !k.completo ? ' <small class="prov">provisional</small>' : '')
      + '<span class="cmp">' + k.evaluados + '/' + k.aplicables + '</span>' + (k.borrador ? '<span class="pill borrador">' + (k.trasEnvio ? 'borrador tras envío' : 'borrador') + '</span>' : '') + '</div>'
      + '<div class="flags">' + fl + (k.alta ? ' <span class="pill a">Alto ' + k.alta + '</span>' : '')
      + (k.otroInforme ? ' <span class="fl san" title="El formulario abre el informe nº ' + esc(k.otroInforme.formulario) + '">⚠ ' + k.otroInforme.n + ' informes</span>' : '') + '</div>'
      + '<div class="vm">' + vm + (fechas ? ' · ' + fechas : '') + '</div></a>';
  }
  function tarjetasHtml(K, route) {
    return '<div class="card"><h3>Casas <small>· peligros, revisiones de seguridad, peor condición, incompletas, nombre · un clic abre el informe</small></h3><div class="casas">'
      + (K || []).map(function (k) { return tarjetaHtml(k, route); }).join('') + '</div>'
      + '<div class="leyenda"><span><i style="background:var(--green)"></i>≥ 80</span><span><i style="background:var(--orange)"></i>50 a 79,9</span><span><i style="background:var(--red)"></i>&lt; 50</span>'
      + '<span><i style="background:var(--gray-3)"></i>sin puntuación o borrador</span><span>19/26 = elementos marcados de los aplicables (26 menos N/A) · provisional hasta marcarlos todos</span></div></div>';
  }

  var Portada = {
    usar: usar, SIN_VM: SIN_VM, VM_COLS: VM_COLS,
    construirCasasV3: construirCasasV3, elegirInforme: elegirInforme, filtrarVM: filtrarVM, marcasDe: marcasDe,
    tilesV3: tilesV3, listasRapidas: listasRapidas, tablaVM: tablaVM, mapaV3: mapaV3, tarjetas: tarjetas,
    tilesHtml: tilesHtml, listasRapidasHtml: listasRapidasHtml, tablaVMHtml: tablaVMHtml, mapaHtml: mapaHtml, tarjetasHtml: tarjetasHtml,
    href: href, media: media, banda: banda, fmt1: fmt1, fechaVer: fechaVer, esReview: esReview, sinDetalle: sinDetalle, esFinal: esFinal, prioridad: pri,
    BANDAS: BANDAS, costeTile: costeTile
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Portada;
  if (raiz && typeof raiz === 'object') raiz.Portada = Portada;
})(typeof window !== 'undefined' ? window : this);
