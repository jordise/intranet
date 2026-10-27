/* Arnés de las pruebas del informe de temporada (ronda de arreglos 1, 27/10/2026; idea del revisor):
   carga con vm el script REAL de la página (informe-temporada.html o informes-temporada.html) con un DOM
   mínimo y un fetch falso que hace de Worker (action=data / action=save PUT o POST / action=upload) sobre
   unas tablas en memoria, apunta todas las llamadas y puede fallar o colgarse a petición. Sin red.
   Lo usan informe-temporada.test.js e informes-temporada.test.js. */
var fs = require('fs'), vm = require('vm');

function scriptPrincipal(src) {
  var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m;
  while ((m = re.exec(src))) if (m[1].indexOf("const WORKER") >= 0) return m[1];
  throw new Error('no encuentro el script principal');
}

function resp(status, text) {
  return { ok: status >= 200 && status < 300, status: status, text: function () { return Promise.resolve(text); }, json: function () { return Promise.resolve(JSON.parse(text)); } };
}

/* WHERE sencillo de Caspio: a=1 AND b='x' AND c>=3 AND c<=9 */
function filtra(rows, where) {
  if (!where) return rows.slice();
  var conds = where.split(' AND ').map(function (c) {
    var m = c.match(/^(\w+)(>=|<=|=)(.*)$/); if (!m) throw new Error('WHERE raro: ' + where);
    var v = m[3]; if (/^'.*'$/.test(v)) v = v.slice(1, -1).replace(/''/g, "'");
    return [m[1], m[2], v];
  });
  return rows.filter(function (r) {
    return conds.every(function (c) { var x = r[c[0]]; if (c[1] === '=') return String(x) === String(c[2]); if (c[1] === '>=') return +x >= +c[2]; return +x <= +c[2]; });
  });
}

function servidor(db) {
  var S = { db: db, calls: [], fallos: [], cuelgues: [], retrasos: [], ids: { TaInformeTemporada: 100, TaInformeTemporadaLineas: 500 }, subida: 'https://pub-48c1cfd5de614ff0a0cebfec482a7b32.r2.dev/informe/x.jpg' };
  S.falla = function (pred) { S.fallos.push(pred); };           /* una vez: 500 */
  S.cuelga = function (pred) { S.cuelgues.push(pred); };        /* una vez: no contesta hasta el abort */
  S.retrasa = function (pred, ms) { S.retrasos.push([pred, ms]); };
  S.marca = function () { return S.calls.length; };
  S.desde = function (i) { return S.calls.slice(i); };
  S.fetch = function (url, opt) {
    opt = opt || {};
    var u = new URL(url), p = u.searchParams;
    var call = { method: opt.method || 'GET', url: url, action: p.get('action'), table: p.get('table'), where: p.get('where'), limit: p.get('limit'), relay: p.get('method'),
      body: typeof opt.body === 'string' ? JSON.parse(opt.body) : opt.body, headers: opt.headers };
    S.calls.push(call);
    for (var i = 0; i < S.cuelgues.length; i++) if (S.cuelgues[i](call)) {
      S.cuelgues.splice(i, 1);
      return new Promise(function (res, rej) {
        if (opt.signal) opt.signal.addEventListener('abort', function () { var e = new Error('The operation was aborted'); e.name = 'AbortError'; rej(e); });
      });
    }
    var ms = 1;
    S.retrasos.forEach(function (r) { if (r[0](call)) ms = r[1]; });
    return new Promise(function (res) { setTimeout(res, ms); }).then(function () {
      for (var i = 0; i < S.fallos.length; i++) if (S.fallos[i](call)) { S.fallos.splice(i, 1); call.fallo = true; return resp(500, 'fallo de prueba'); }
      if (call.action === 'data') {
        var rows = filtra(db[call.table] || [], call.where);
        return resp(200, JSON.stringify({ Result: rows.slice(0, +call.limit || 1000) }));
      }
      if (call.action === 'save') {
        if (!call.body) return resp(400, 'JSON inválido');
        if (call.relay === 'POST') {
          var row = Object.assign({}, call.body), idf = call.table === 'TaInformeTemporada' ? 'informe_id' : 'linea_id';
          row[idf] = S.ids[call.table]++; (db[call.table] = db[call.table] || []).push(row);
          return resp(201, '');
        }
        if (call.relay === 'PUT' && call.where) { filtra(db[call.table] || [], call.where).forEach(function (r) { Object.assign(r, call.body); }); return resp(200, '{"RecordsAffected":1}'); }
        return resp(400, 'método no soportado');
      }
      if (call.action === 'upload') return resp(200, JSON.stringify({ url: S.subida }));
      return resp(404, 'acción desconocida');
    });
  };
  /* "GET TaInformeTemporadaLineas where ...", para el registro de las pruebas */
  S.texto = function (c) {
    if (c.action === 'data') return 'GET  ' + c.table + ' where ' + (c.where || '-') + ' limit ' + c.limit + (c.fallo ? '  -> 500' : '');
    if (c.action === 'save') return c.relay + ' ' + c.table + (c.where ? ' where ' + c.where : '') + ' ' + JSON.stringify(c.body) + (c.fallo ? '  -> 500' : '');
    return c.method + ' ' + c.action + (c.fallo ? '  -> 500' : '');
  };
  return S;
}

function elemento(id) {
  var e = { id: id, innerHTML: '', textContent: '', hidden: false, value: '', className: '', style: { setProperty: function () {} }, offsetHeight: 48,
    _clases: {}, querySelector: function () { return null; }, querySelectorAll: function () { return []; }, addEventListener: function () {} };
  e.classList = { toggle: function (c, on) { e._clases[c] = on === undefined ? !e._clases[c] : !!on; }, add: function (c) { e._clases[c] = true; }, remove: function (c) { delete e._clases[c]; }, contains: function (c) { return !!e._clases[c]; } };
  return e;
}

/* opts: archivo, db, rol, email, nombre, search, ahora (Date), almacen (objeto de localStorage) */
function cargar(opts) {
  var src = fs.readFileSync(opts.archivo, 'utf8');
  var S = servidor(opts.db || {});
  var els = {}, docEv = {}, winEv = {}, timers = [], log = [];
  var almacen = opts.almacen || {};
  var document = {
    getElementById: function (id) { return els[id] || (els[id] = elemento(id)); },
    querySelector: function () { return null; }, querySelectorAll: function () { return []; },
    addEventListener: function (t, f) { (docEv[t] = docEv[t] || []).push(f); },
    createElement: function () { return elemento(''); },
    documentElement: { style: { setProperty: function () {} } }, body: { appendChild: function () {} },
    visibilityState: 'visible'
  };
  var ctx = {
    console: console, URL: URL, URLSearchParams: URLSearchParams, AbortController: AbortController, FormData: FormData, Blob: Blob, File: File,
    crypto: require('crypto').webcrypto, Promise: Promise, JSON: JSON, Date: opts.Date || Date,
    document: document, fetch: function (u, o) { return S.fetch(u, o); },
    location: { protocol: 'file:', pathname: '/intranet/' + opts.archivo, search: opts.search || '' },
    history: { back: function () { log.push('history.back'); } },
    sessionStorage: { getItem: function () { return null; }, setItem: function () {} },
    localStorage: {
      getItem: function (k) { return Object.prototype.hasOwnProperty.call(almacen, k) ? almacen[k] : null; },
      setItem: function (k, v) { almacen[k] = String(v); }, removeItem: function (k) { delete almacen[k]; }
    },
    confirm: function (m) { log.push('confirm: ' + m); return opts.confirmar !== false; },
    alert: function (m) { log.push('alert: ' + m); },
    print: function () { log.push('print'); },
    close: function () { log.push('window.close'); },
    addEventListener: function (t, f) { (winEv[t] = winEv[t] || []).push(f); },
    /* Temporizadores: los cortos (< 1 s) van de verdad; los largos (debounce, toast, 60 s de la foto) se apuntan y la prueba los dispara */
    setTimeout: function (f, ms) { ms = ms || 0; if (ms < 1000) return setTimeout(f, ms); var t = { f: f, ms: ms, vivo: true }; timers.push(t); return t; },
    clearTimeout: function (t) { if (t && t.vivo !== undefined) t.vivo = false; else clearTimeout(t); },
    setInterval: function () { return 0; }, clearInterval: function () {},
    Auth: { url: function (u) { return u; }, role: function () { return opts.rol || 'admin'; }, email: function () { return opts.email || 'admin@3villas.com'; },
      name: function () { return opts.nombre || 'Usuario de la sesión'; }, require: function () {} },
    NavComponent: { open: function () {} }
  };
  vm.createContext(ctx);
  ctx.window = vm.runInContext('this', ctx);
  vm.runInContext(scriptPrincipal(src), ctx, { filename: opts.archivo });
  var H = {
    ctx: ctx, S: S, els: els, timers: timers, log: log, almacen: almacen, src: src,
    ev: function (code) { return vm.runInContext(code, ctx); },
    g: function (id) { return document.getElementById(id); },
    doc: document,
    /* dispara los temporizadores largos vivos de ms milisegundos (o todos) */
    dispara: function (ms) { timers.filter(function (t) { return t.vivo && (ms === undefined || t.ms === ms); }).forEach(function (t) { t.vivo = false; t.f(); }); },
    pendientes: function (ms) { return timers.filter(function (t) { return t.vivo && t.ms === ms; }).length; },
    evento: function (dondeWin, tipo, e) { var l = (dondeWin ? winEv : docEv)[tipo] || []; return Promise.all(l.map(function (f) { return f(e || {}); })); },
    escucha: function (dondeWin, tipo) { return ((dondeWin ? winEv : docEv)[tipo] || []).length; },
    espera: function (ms) { return new Promise(function (r) { setTimeout(r, ms || 30); }); }
  };
  return H;
}

module.exports = { cargar: cargar, servidor: servidor, filtra: filtra, scriptPrincipal: scriptPrincipal };
