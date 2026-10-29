/* ═══════════════════════════════════════════════════════════════════════════
   cuadro-informes-temporada-rutas.js — RUTAS del cuadro de informes de temporada v3
   VERSIÓN ACTUAL: v1 | Historial completo al final de este archivo

   El estado de la página vive en el hash, como en la maqueta del 29/10/2026:
     #t=2026&vm=c:12&v=lista:obras:alta&s=villa:asc&q=texto&g=1&from=lista:atencion
   t = temporada · vm = villa manager (c:<ContactID> o u:<UserID>) · v = vista ('' cuadro,
   lista:<tipo>[:...] o casa:<villaid>) · s = orden <clave>:asc|desc · q = búsqueda ·
   g = 1 agrupa por casa · from = la lista desde la que se abrió la casa.
   Además, los filtros de obras del cuadro de la maqueta: op (alta|media|baja|sin),
   of (resumen|estancia), od = 1 sin detalle, oq = búsqueda de obras, og = 1 agrupar.

   Sin DOM salvo lo que se le pasa, sin red. Un objeto global: window.Rutas (navegador)
   o module.exports (node), como cuadro-comercial-data.js.

   COMO SE USA
     <script src="cuadro-informes-temporada-rutas.js?v=3"></script>
     var r = Rutas.parse(location.hash, { t: '2026' });
     location.hash = Rutas.href(r, { v: 'casa:12', from: r.v }, ['s', 'q', 'g']);
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  /* Claves del contrato, en el orden en que se escriben */
  var CLAVES = ['t', 'vm', 'v', 's', 'q', 'g', 'from'];
  /* Filtros de obras del cuadro (nivel 1) de la maqueta */
  var CLAVES_OBRAS = ['op', 'of', 'od', 'oq', 'og'];
  /* vs (ronda de arreglos 1): el orden de la tabla de villa managers (la s del cuadro) mientras se está en una lista o una casa */
  var TODAS = CLAVES.concat(CLAVES_OBRAS, ['vs']);
  var Q_MAX = 200;
  var PREFIJO_SCROLL = 'cuadro-v3-scroll:';

  var VALIDA = {
    t: function (x) { return /^\d{4}$/.test(x); },
    vm: function (x) { return /^[cu]:[A-Za-z0-9_-]+$/.test(x) || x === 'sin'; },
    v: function (x) { return /^lista:[a-z0-9_]+(:[a-z0-9_]+)*$/i.test(x) || /^casa:\d+$/.test(x); },
    s: function (x) { return /^[a-z0-9_]+:(asc|desc)$/i.test(x); },
    q: function () { return true; },
    g: function (x) { return x === '1'; },
    from: function (x) { return /^lista:[a-z0-9_]+(:[a-z0-9_]+)*$/i.test(x); },
    op: function (x) { return /^(alta|media|baja|sin)$/.test(x); },
    of: function (x) { return /^(resumen|estancia)$/.test(x); },
    od: function (x) { return x === '1'; },
    oq: function () { return true; },
    og: function (x) { return x === '1'; },
    vs: function (x) { return /^[a-z0-9_]+:(asc|desc)$/i.test(x); }
  };

  function limpia(k, x) {
    var s = x == null ? '' : String(x);
    if (k === 'q' || k === 'oq') s = s.slice(0, Q_MAX);
    return s !== '' && VALIDA[k](s) ? s : '';
  }

  function decodifica(s) {
    try { return decodeURIComponent(String(s).replace(/\+/g, ' ')); } catch (e) { return null; }
  }

  /* hash → ruta con las siete claves (y las de obras), todas texto; lo ilegible queda vacío */
  function parse(hash, defecto) {
    var d = defecto || {}, crudo = {}, out = {};
    String(hash == null ? '' : hash).replace(/^#/, '').split('&').forEach(function (par) {
      if (!par) return;
      var i = par.indexOf('='), k = i < 0 ? par : par.slice(0, i), v = i < 0 ? '' : par.slice(i + 1);
      k = decodifica(k);
      if (k === null || TODAS.indexOf(k) < 0) return;
      var val = decodifica(v);
      if (val === null) return;
      crudo[k] = val;                       /* clave repetida: vale la última */
    });
    TODAS.forEach(function (k) {
      var x = limpia(k, crudo[k]);
      if (!x && d[k] != null) x = limpia(k, d[k]);
      out[k] = x;
    });
    return out;
  }

  function codifica(x) { return encodeURIComponent(x).replace(/%3A/gi, ':'); }

  /* ruta → '#t=..&vm=..' en orden fijo; vacíos y valores no válidos fuera */
  function serialize(route) {
    var r = route || {}, partes = [];
    TODAS.forEach(function (k) {
      var x = limpia(k, r[k]);
      if (x) partes.push(k + '=' + codifica(x));
    });
    return '#' + partes.join('&');
  }

  /* Enlace. href(route) = serialize(route). Con cambio (patch): parte de temporada, VM y vs,
     añade las claves de keep (true = todas) y aplica el cambio; '' en el cambio quita la clave. */
  function href(route, patch, keep) {
    var r = route || {};
    if (patch === undefined && keep === undefined) return serialize(r);
    var o = { t: r.t, vm: r.vm, vs: r.vs };
    if (keep === true) TODAS.forEach(function (k) { o[k] = r[k]; });
    else (keep || []).forEach(function (k) { o[k] = r[k]; });
    Object.keys(patch || {}).forEach(function (k) { o[k] = patch[k]; });
    return serialize(o);
  }

  /* Volver: casa abierta desde una lista → esa lista (orden, búsqueda, grupo);
     casa sin lista, lista o cuadro → el cuadro con temporada, VM, los filtros de obras y el orden de la tabla (s = vs) */
  function back(route) {
    var r = route || {};
    if (/^casa:/.test(r.v || '') && r.from) return href(r, { v: r.from }, ['s', 'q', 'g']);
    return href(r, { s: r.vs || '', vs: '' }, CLAVES_OBRAS);
  }

  /* Posición de cada vista en sessionStorage (la vista = el hash normalizado) */
  function almacen(store) {
    if (store !== undefined) return store;
    try { return root.sessionStorage || null; } catch (e) { return null; }
  }
  function claveScroll(hash) { return PREFIJO_SCROLL + serialize(parse(hash)); }
  function scrollRecordar(hash, y, store) {
    var s = almacen(store);
    if (!s) return;
    try { s.setItem(claveScroll(hash), String(Math.round(+y || 0))); } catch (e) { /* modo privado o lleno: sin posición */ }
  }
  function scrollVolver(hash, store) {
    var s = almacen(store);
    if (!s) return null;
    try {
      var v = s.getItem(claveScroll(hash));
      if (v === null || v === undefined || !/^\d+$/.test(String(v))) return null;
      return parseInt(v, 10);
    } catch (e) { return null; }
  }

  /* ← → en la vista de casa: devuelve el enlace de la casa anterior o siguiente, o null.
     Nada dentro de un campo (input, textarea, select, contenteditable), con el visor de
     fotos abierto (overlayAbierto) ni con Alt, Cmd o Ctrl. nav = { prev, next } */
  function enCampo(t) {
    if (!t) return false;
    if (t.isContentEditable) return true;
    if (/^(INPUT|TEXTAREA|SELECT)$/i.test(t.tagName || '')) return true;
    if (typeof t.closest === 'function' && t.closest('input,textarea,select,[contenteditable]')) return true;
    return false;
  }
  function teclas(e, nav, overlayAbierto) {
    if (!e || !nav || overlayAbierto) return null;
    if (e.altKey || e.metaKey || e.ctrlKey) return null;
    if (enCampo(e.target)) return null;
    if (e.key === 'ArrowLeft') return nav.prev || null;
    if (e.key === 'ArrowRight') return nav.next || null;
    return null;
  }

  var API = {
    VERSION: 1,
    CLAVES: CLAVES.slice(), CLAVES_OBRAS: CLAVES_OBRAS.slice(),
    parse: parse, serialize: serialize, href: href, back: back,
    scrollRecordar: scrollRecordar, scrollVolver: scrollVolver, teclas: teclas
  };
  root.Rutas = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));

/* HISTORIAL: v1 2026-10-29 — primera versión (cuadro de informes de temporada v3, carril B). Lo pidió Gary el 29/10/2026 ("click into everything with metrics"): cada número del cuadro es una puerta y el estado vive en el hash como en la maqueta aprobada (#t, vm, v, s, q, g, from y los filtros de obras op, of, od, oq, og). parse/serialize con valores validados (lo ilegible queda vacío), href estable con cambio y claves que se quedan, back (casa → su lista, lista → cuadro), posición de cada vista en sessionStorage y las teclas ← → fuera de campos y del visor de fotos. Sin red, sin DOM propio. */
