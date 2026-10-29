/* Cuadro de informes de temporada v3a, carril E (29/10/2026): comparación con la temporada anterior,
   lectura de la temporada anterior con caché por año, galería de fotos con su capa (Esc cierra) y cabecera de impresión.
   Script plano, sin módulos: define window.Extras en el navegador y module.exports bajo node (como arnes-informe.js).
   No lee nada por sí mismo: la lectura la hace el cargador que le pasa la página (leerTemporada de la v2).
   Usa InformeScore (informe-temporada-score.js, carril A) para comparar y para los nombres de los 26 elementos.
   Pruebas: node cuadro-informes-temporada-extras.test.js */
(function (raiz) {
  'use strict';

  /* ── Utilidades ── */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function fmt1(n) { return typeof n === 'number' && isFinite(n) ? n.toFixed(1).replace('.', ',') : '—'; }
  /* Bandas publicadas (Consensus v2): rojo < 50, ámbar < 80, verde >= 80, gris sin dato; sobre el decimal guardado */
  function banda(n) { return typeof n !== 'number' || !isFinite(n) ? 'gris' : n < 50 ? 'rojo' : n < 80 ? 'ambar' : 'verde'; }
  function score() {
    if (raiz && raiz.InformeScore) return raiz.InformeScore;
    return typeof InformeScore !== 'undefined' ? InformeScore : null; // eslint-disable-line no-undef
  }
  var MARCAS = { bueno: ['Bueno', 2], regular: ['Regular', 1], malo: ['Malo', 0] };
  function marcaNorm(m) { var s = String(m == null ? '' : m).trim().toLowerCase(); return MARCAS[s] ? s : ''; }
  function marcaVer(m) { var s = marcaNorm(m); return s ? MARCAS[s][0] : 'Sin marcar'; }
  /* Nombre corto del elemento: la etiqueta del formulario sin el paréntesis ("Piscina (vaso, …)" -> "Piscina") */
  function corto(clave) {
    var S = score(), el = S && typeof S.elementosDef === 'function' ? S.elementosDef() : [];
    for (var i = 0; i < el.length; i++) if (el[i].clave === clave) return String(el[i].label).replace(/\s*\(.*\)\s*/, '').trim();
    return String(clave);
  }
  /* Marca de un elemento en las líneas de un informe (secciones de los 26 elementos) */
  function marcaEn(lineas, clave) {
    var m = '';
    (lineas || []).forEach(function (l) { if (l && l.clave === clave && /^(interior|exterior|seguridad)$/.test(l.seccion)) m = marcaNorm(l.estado) || m; });
    return m;
  }
  /* Temporada de una casa: el tercer argumento, casa.temporada o el parámetro temporada= de su enlace al formulario */
  function temporadaDe(casa, t) {
    var n = parseInt(t, 10);
    if (n > 0) return n;
    if (casa && parseInt(casa.temporada, 10) > 0) return parseInt(casa.temporada, 10);
    var m = casa && String(casa.url || '').match(/[?&]temporada=(\d{4})/);
    return m ? parseInt(m[1], 10) : null;
  }

  /* ── Temporada anterior: una lectura por año, guardada; un fallo no se guarda ── */
  var CACHE = {}, LEIDO = {};
  /* t = la temporada que se mira; lee t - 1 con cargar(año) -> Promise<{informes, lineas}> (leerTemporada de la v2).
     cargarInformes de la v2 NO sirve: devuelve true/false, pisa INFORMES/LINEAS y sube el contador PETICION. */
  function cargarTemporadaPrevia(t, cargar) {
    var y = parseInt(t, 10);
    if (!(y > 0)) return Promise.reject(new Error('Temporada no válida: ' + t));
    var p = y - 1;
    if (CACHE[p]) return CACHE[p];
    var leyendo;
    try { leyendo = Promise.resolve(cargar(p)); } catch (e) { leyendo = Promise.reject(e); }
    CACHE[p] = leyendo.then(function (r) {
      if (!r || !Array.isArray(r.informes) || !Array.isArray(r.lineas)) throw new Error('El cargador de la temporada ' + p + ' debe devolver {informes, lineas}');
      var d = { temporada: p, informes: r.informes, lineas: r.lineas };
      LEIDO[p] = d;
      return d;
    });
    CACHE[p].catch(function () { delete CACHE[p]; });
    return CACHE[p];
  }
  /* Lo ya leído de la temporada anterior a t, sin esperar (undefined si aún no está) */
  function temporadaPrevia(t) { var y = parseInt(t, 10); return y > 0 ? LEIDO[y - 1] : undefined; }
  /* La misma villa entre las casas de la temporada anterior (construirCasasV3 sobre lo leído) */
  function casaPreviaDe(casa, casasPrev) {
    if (!casa || !casasPrev) return null;
    var id = String(casa.villaid);
    for (var i = 0; i < casasPrev.length; i++) if (casasPrev[i] && String(casasPrev[i].villaid) === id) return casasPrev[i];
    return null;
  }

  /* ── Comparación: mismo informe enviado de las dos temporadas, solo los elementos evaluados en las dos ── */
  function comparacionHtml(casa, casaPrev, t) {
    var y = temporadaDe(casa, t), y0 = y ? y - 1 : null, a0 = y0 == null ? 'la temporada anterior' : String(y0);
    var mot = function (s) { return '<p class="mot">' + s + '</p>'; };
    if (!casa || !casa.estado) return mot('Esta casa no tiene informe' + (y ? ' en ' + y : '') + ': no hay nada que comparar.');
    if (casa.estado !== 'enviado') return mot('La comparación usa dos informes enviados; este informe está en borrador.');
    if (!casaPrev || !casaPrev.estado) return mot('Sin informe enviado en ' + esc(a0) + ' para esta casa.');
    if (casaPrev.estado !== 'enviado') return mot('El informe de ' + esc(a0) + ' de esta casa está en borrador: no se compara.');
    var S = score();
    if (!S || typeof S.comparar !== 'function') return mot('Comparación no disponible: falta informe-temporada-score.js.');
    var c = S.comparar(casaPrev.lineas || [], casa.lineas || []);
    if (!c || !(c.n > 0)) return mot('Ningún elemento evaluado en las dos temporadas: no hay nada que comparar.');
    var flecha = function (de, a) {
      var r0 = MARCAS[marcaNorm(de)], r1 = MARCAS[marcaNorm(a)];
      if (!r0 || !r1 || r0[1] === r1[1]) return '';
      return r1[1] > r0[1] ? '<span class="sube">▲</span> ' : '<span class="baja">▼</span> ';
    };
    var cambios = c.cambios || [], rep = c.repetidos || [];
    var li = function (txt) { return '<li>' + txt + '</li>'; };
    return '<div class="dos-sc"><div>' + esc(a0) + '<br><span class="sc ' + banda(c.puntuacionA) + '">' + fmt1(c.puntuacionA) + '</span></div><div>→</div>'
      + '<div>' + esc(y) + '<br><span class="sc ' + banda(c.puntuacionB) + '">' + fmt1(c.puntuacionB) + '</span></div></div>'
      + mot('sobre ' + c.n + ' elementos evaluados en ambas temporadas')
      + '<div class="grupo-t">Cambios (' + cambios.length + ')</div>'
      + (cambios.length ? '<ul>' + cambios.map(function (x) { return li(flecha(x.de, x.a) + esc(corto(x.clave)) + ': ' + marcaVer(x.de) + ' → ' + marcaVer(x.a)); }).join('') + '</ul>' : mot('Ninguna marca cambia.'))
      + '<div class="grupo-t">Repetido: Regular o Malo los dos años (' + rep.length + ')</div>'
      + (rep.length ? '<ul>' + rep.map(function (k) { return li(esc(corto(k)) + ': ' + marcaVer(marcaEn(casaPrev.lineas, k)) + ' → ' + marcaVer(marcaEn(casa.lineas, k))); }).join('') + '</ul>' : mot('Nada repetido.'));
  }

  /* ── Fotos: las líneas 'foto' (foto_1 .. foto_6) con foto_url http(s); pie = texto_1 ── */
  var R2_PUBLIC = 'https://pub-48c1cfd5de614ff0a0cebfec482a7b32.r2.dev/', FOTOS_HOST = 'https://www.3villas.com/intranet/fotos/';
  /* Mismo host que el formulario (fotoUrl de informe-temporada.html v4) */
  function fotoUrl(u) { u = String(u || '').trim(); return u.indexOf(R2_PUBLIC) === 0 ? FOTOS_HOST + u.slice(R2_PUBLIC.length) : u; }
  function fotosDe(casa) {
    var n = function (k) { var m = String(k || '').match(/(\d+)$/); return m ? parseInt(m[1], 10) : 99; };
    return ((casa && casa.lineas) || []).filter(function (l) { return l && l.seccion === 'foto' && /^https?:\/\//i.test(String(l.foto_url || '').trim()); })
      .sort(function (a, b) { return n(a.clave) - n(b.clave); })
      .map(function (l) { var p = String(l.texto_1 || '').trim(); return { clave: l.clave, url: fotoUrl(l.foto_url), pie: p || ('Foto ' + n(l.clave)) }; });
  }
  var FOTOS = [];
  /* La galería de la casa que se pinta; guarda sus fotos para la capa */
  function galeriaHtml(casa) {
    FOTOS = fotosDe(casa);
    if (!FOTOS.length) return '<p class="mot">Este informe no tiene fotos.</p>';
    return '<div class="gal">' + FOTOS.map(function (f, j) {
      return '<button type="button" class="foto" onclick="Extras.overlayAbrir(' + j + ')" aria-label="Ampliar: ' + esc(f.pie) + '">'
        + '<img class="ph" src="' + esc(f.url) + '" alt="' + esc(f.pie) + '" loading="lazy"><div class="cap">' + esc(f.pie) + '</div></button>';
    }).join('') + '</div><p class="small-print">Fotos del informe, sin vínculo a un elemento hasta el formulario v5.</p>';
  }

  /* ── Capa de la foto: una sola en la página, Esc o el fondo la cierran, el foco vuelve al botón ── */
  var OV = null, PREVIO = null;
  function doc() { return typeof document !== 'undefined' ? document : (raiz && raiz.document) || null; }
  function crearCapa(d) {
    var ov = d.createElement('div');
    ov.className = 'ov'; ov.hidden = true;
    ov.setAttribute('role', 'dialog'); ov.setAttribute('aria-modal', 'true'); ov.setAttribute('aria-label', 'Foto');
    var box = d.createElement('div'); box.className = 'ov-box';
    var img = d.createElement('img'); img.className = 'ov-img';
    var cap = d.createElement('div'); cap.className = 'ov-cap';
    var btn = d.createElement('button'); btn.type = 'button'; btn.className = 'btn'; btn.textContent = 'Cerrar (Esc)';
    box.appendChild(img); box.appendChild(cap); box.appendChild(btn); ov.appendChild(box);
    ov.addEventListener('click', function (e) { if (e && e.target === ov) overlayCerrar(); });
    btn.addEventListener('click', function () { overlayCerrar(); });
    d.addEventListener('keydown', function (e) {
      if (!overlayAbierto() || !e || e.key !== 'Escape') return;
      overlayCerrar();
      if (e.preventDefault) e.preventDefault();
      if (e.stopPropagation) e.stopPropagation();
    });
    d.body.appendChild(ov);
    OV = { ov: ov, img: img, cap: cap, btn: btn };
    return OV;
  }
  function overlayAbrir(j) {
    var f = FOTOS[j], d = doc();
    if (!f || !d || !d.body) return false;
    var o = OV || crearCapa(d);
    if (o.ov.hidden) PREVIO = d.activeElement || null;
    o.img.src = f.url; o.img.alt = f.pie;
    o.cap.textContent = f.pie + ' · foto ' + (j + 1) + ' de ' + FOTOS.length;
    o.ov.hidden = false;
    o.btn.focus();
    return true;
  }
  function overlayCerrar() {
    if (!OV || OV.ov.hidden) return;
    OV.ov.hidden = true;
    var p = PREVIO; PREVIO = null;
    if (p && typeof p.focus === 'function') p.focus();
  }
  /* Para las teclas ← → del carril B: con la capa abierta no se cambia de casa */
  function overlayAbierto() { return !!(OV && !OV.ov.hidden); }

  /* ── Cabecera de impresión: temporada, VM, "Informes enviados" y la vista; la casa lleva "Uso interno · dirección" ──
     route = {t, vm, v, s, q, g, from} (carril B); info opcional = {vmNombre, titulo, casa} */
  function printHeader(route, info) {
    route = route || {}; info = info || {};
    var t = String(route.t == null ? '' : route.t);
    if (/^casa:/.test(String(route.v || ''))) {
      var c = info.casa || null;
      var estado = !c || !c.estado ? 'Sin informe' : c.estado === 'enviado' ? 'Informe enviado' : 'Informe en borrador';
      return '<div class="uso">Uso interno · dirección</div>Temporada ' + esc(t) + ' · ' + esc((c && c.villa) || info.titulo || 'Casa')
        + ' · VM ' + esc((c && c.vm) || '—') + ' · ' + estado;
    }
    var v = String(route.v || ''), partes = ['Temporada ' + t, 'VM: ' + (route.vm ? (info.vmNombre || route.vm) : 'todos')];
    if (!/^lista:estado(:|$)/.test(v)) partes.push('Informes enviados');   /* las listas de estado cuentan también borradores y casas sin informe */
    if (!v) {   /* ronda de arreglos 1: los filtros de las obras del cuadro (diseño punto 15) */
      var OP = { alta: 'prioridad Alto', media: 'prioridad Medio', baja: 'prioridad Bajo', sin: 'sin prioridad' }, OF = { resumen: 'origen Resumen', estancia: 'origen Estancia' };
      if (OP[route.op]) partes.push('obras: ' + OP[route.op]);
      if (OF[route.of]) partes.push(OF[route.of]);
      if (String(route.od) === '1') partes.push('sin detalle');
      if (route.oq) partes.push('búsqueda de obras «' + route.oq + '»');
      if (String(route.og) === '1') partes.push('obras agrupadas por casa');
    }
    if (/^lista:/.test(v) && info.titulo) partes.push(info.titulo);
    if (route.q) partes.push('búsqueda «' + route.q + '»');
    if (String(route.g) === '1') partes.push('agrupado por casa');
    return esc(partes.join(' · '));
  }

  var Extras = {
    cargarTemporadaPrevia: cargarTemporadaPrevia, temporadaPrevia: temporadaPrevia, casaPreviaDe: casaPreviaDe,
    comparacionHtml: comparacionHtml, fotosDe: fotosDe, galeriaHtml: galeriaHtml,
    overlayAbrir: overlayAbrir, overlayCerrar: overlayCerrar, overlayAbierto: overlayAbierto,
    printHeader: printHeader, banda: banda, fmt1: fmt1
  };
  if (raiz) raiz.Extras = Extras;
  if (typeof module !== 'undefined' && module.exports) module.exports = Extras;
})(typeof window !== 'undefined' ? window : null);
