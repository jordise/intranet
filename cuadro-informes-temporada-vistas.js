/* ═══════════════════════════════════════════════════════════════════════════
   cuadro-informes-temporada-vistas.js — VISTAS del cuadro de informes de temporada v3
   VERSIÓN ACTUAL: v1 | Historial completo al final de este archivo

   Nivel 2 (la lista detrás de un número) y nivel 3 (el informe de una casa, solo lectura),
   como la maqueta del 29/10/2026. Devuelve HTML en texto; la página lo pone en #cuerpo.
   Usa, si están cargados: Rutas (enlaces), InformeScore.elementosDef() (los 26 elementos),
   Extras.comparacionHtml / Extras.galeriaHtml (comparación y fotos) y Listas.csv (CSV).
   Sin red. Un objeto global: window.Vistas (navegador) o module.exports (node).

   COMO SE USA
     cuerpo.innerHTML = Vistas.listaHtml(Listas.listas(kind, args, casas, prev), ruta, { vmNombre: 'Kike' });
     cuerpo.innerHTML = Vistas.casaHtml(casa, casaPrev, ruta, listaDeOrigen);
     teclado: var h = Rutas.teclas(e, Vistas.navActual, visorAbierto); if (h) location.hash = h;
     búsqueda: <input id="q" oninput="Vistas.teclear(this.value)"> (replaceState + pintar())
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var ESTADO = { enviado: 'Enviado', borrador: 'Borrador', '': 'Sin informe' };
  var MARCA = { bueno: ['Bueno', 'b'], regular: ['Regular', 'r'], malo: ['Malo', 'm'], '': ['Sin marcar', 's'] };
  var PRI_RANGO = { alta: 3, media: 2, baja: 1 };
  var PRI_VER = { alta: ['Alto', 'alto'], media: ['Medio', 'medio'], baja: ['Bajo', 'bajo'] };
  var GRUPOS = [['interior', 'Interior'], ['exterior', 'Exterior'], ['seguridad', 'Seguridad e instalaciones']];
  /* Estancias fijas del formulario (seccionesDef, sección 5); las otra_N llevan el nombre en texto_1 */
  var ESTANCIAS = { salon: 'Salón / comedor', cocina: 'Cocina', dormitorio_principal: 'Dormitorio principal', dormitorio_2: 'Dormitorio 2',
    bano_1: 'Baño 1', bano_2: 'Baño 2', exterior_piscina: 'Exterior / zona piscina' };
  var ORIGENES = ['Review', 'Parte', 'Propuesta'];
  var PLURAL = { casas: ['casa', 'casas'], filas: ['fila', 'filas'], actuaciones: ['actuación', 'actuaciones'], comentarios: ['comentario', 'comentarios'],
    marcas: ['marca', 'marcas'], alertas: ['alerta', 'alertas'], fotos: ['foto', 'fotos'] };

  /* ── utilidades ── */
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function txt(s) { return String(s == null ? '' : s).trim(); }
  function lw(s) { return txt(s).toLowerCase(); }
  function plural(n, u) { var p = PLURAL[u] || [u, u]; return n + ' ' + (n === 1 ? p[0] : p[1]); }
  function fmt1(n) { return n == null || n === '' || isNaN(+n) ? '—' : (+n).toFixed(1).replace('.', ','); }
  function fmtNum(n) { return Math.round(n) === n ? String(n) : String(n).replace('.', ','); }
  function fecha(v) { var m = String(v || '').match(/^(\d{4})-(\d\d)-(\d\d)/); return m ? m[3] + '/' + m[2] + '/' + m[1] : txt(v); }
  function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  /* Banda de una puntuación (Consensus v2: rojo < 50, ámbar < 80, verde ≥ 80, gris sin dato); la fila puede traer la suya */
  function banda(s) { return s == null || s === '' || isNaN(+s) ? 'gris' : +s < 50 ? 'rojo' : +s < 80 ? 'ambar' : 'verde'; }
  function corto(label) { return String(label || '').replace(/\s*\(.*\)\s*/, '').trim(); }
  function rutas() { return root.Rutas; }
  function href(route, patch, keep) { return rutas().href(route, patch, keep); }
  function priVer(p) { var x = PRI_VER[lw(p)] || PRI_VER[{ alto: 'alta', medio: 'media', bajo: 'baja' }[lw(p)]]; return x || null; }
  function priRango(p) { var x = priVer(p); return x ? PRI_RANGO[{ alto: 'alta', medio: 'media', bajo: 'baja' }[x[1]]] : 0; }
  function priHtml(p) { var x = priVer(p); return x ? '<span class="pri ' + x[1] + '">' + x[0] + '</span>' : '<span class="pri sin">sin prioridad</span>'; }
  function marcaHtml(m) { var x = MARCA[lw(m)] || MARCA['']; return '<span class="mk ' + x[1] + '">' + x[0] + '</span>'; }
  function vacioHtml(titulo, texto, pie) {
    return '<div class="vacio-box"><b>' + esc(titulo) + '</b>' + esc(texto) + (pie ? '<div class="small-print">' + esc(pie) + '</div>' : '') + '</div>';
  }
  function tipoDe(route) { var v = (route && route.v) || ''; return v.indexOf('lista:') === 0 ? v.slice(6) : ''; }

  /* ── valores de una celda: para ordenar, para ver y para buscar ── */
  function valorOrden(fila, clave) {
    var v = fila[clave];
    if (clave === 'prioridad') return priRango(v);
    if (Array.isArray(v)) return v.join(' + ') || null;
    if (v === '' || v === undefined) return null;
    return v;
  }
  function textoCelda(fila, col) {
    var v = fila[col.clave];
    if (Array.isArray(v)) return v.join(' + ');
    if (v == null || v === '') return '—';
    if (col.clave === 'prioridad') { var p = priVer(v); return p ? p[0] : 'sin prioridad'; }
    if (/^marca/.test(col.clave)) return (MARCA[lw(v)] || MARCA[''])[0];
    if (col.clave === 'estado' && ESTADO[lw(v)] !== undefined) return ESTADO[lw(v)];
    if (/^puntuacion/.test(col.clave)) return fmt1(v);
    if (typeof v === 'number') return fmtNum(v);
    if (/^\d{4}-\d\d-\d\d/.test(String(v))) return fecha(v);
    return String(v);
  }
  function celdaHtml(fila, col) {
    var v = fila[col.clave];
    if (/^puntuacion/.test(col.clave)) {
      var b = col.clave === 'puntuacion' && fila.banda ? fila.banda : banda(v);
      return '<span class="sc ' + esc(b) + '">' + fmt1(v) + '</span>' + (col.clave === 'puntuacion' && v != null && v !== '' && fila.completo === false ? ' <small class="prov">provisional</small>' : '');
    }
    if (col.clave === 'prioridad') return priHtml(v);
    if (/^marca/.test(col.clave)) return marcaHtml(v);
    var h = esc(textoCelda(fila, col));
    if (col.clave === 'villa') h = '<b>' + h + '</b>' + (fila.estado === 'borrador' ? ' <span class="pill borrador">borrador</span>' : '');
    if (col.clave === 'fuentes' && Array.isArray(v) && v.length > 1) h += '<div class="mot">unidas: mismo texto</div>';
    return h;
  }
  function cmp(a, b) {
    if (a == null && b == null) return 0;
    if (a == null) return 1;
    if (b == null) return -1;
    if (typeof a === 'number' && typeof b === 'number') return a - b;
    return String(a).localeCompare(String(b), 'es', { sensitivity: 'base' });
  }

  /* ── nivel 2: la lista con la búsqueda, el orden y el grupo de la ruta ── */
  function filtrarOrdenar(lista, route) {
    var L = lista || { columnas: [], filas: [] }, r = route || {}, cols = L.columnas || [], filas = (L.filas || []).slice();
    var q = norm(r.q || '');
    if (q) filas = filas.filter(function (f) { return cols.some(function (c) { return norm(textoCelda(f, c)).indexOf(q) >= 0 || norm(f[c.clave]).indexOf(q) >= 0; }); });
    var s = String(r.s || '').split(':'), col = null;
    cols.forEach(function (c) { if (c.clave === s[0]) col = c; });
    if (col) {
      var m = s[1] === 'desc' ? -1 : 1;
      filas = filas.map(function (f, i) { return [f, i]; }).sort(function (x, y) {
        var k = col.orden || col.clave, a = valorOrden(x[0], k), b = valorOrden(y[0], k);   /* integración: col.orden (fechaIso, rango…) de Listas */
        if (a == null || b == null) { var z = cmp(a, b); if (z) return z; }
        return (m * cmp(a, b)) || (x[1] - y[1]);
      }).map(function (x) { return x[0]; });
    }
    if (r.g === '1') {
      var orden = [], grupos = {};
      filas.forEach(function (f) { var k = txt(f.villa); if (!grupos[k]) { grupos[k] = []; orden.push(k); } grupos[k].push(f); });
      filas = [].concat.apply([], orden.map(function (k) { return grupos[k]; }));
    }
    var out = {};
    Object.keys(L).forEach(function (k) { out[k] = L[k]; });
    out.filas = filas;
    out.total = (L.filas || []).length;
    return out;
  }

  function cabeceraHtml(cols, route) {
    var s = String(route.s || '').split(':');
    return '<thead><tr>' + cols.map(function (c) {
      var on = s[0] === c.clave, nd = on && s[1] === 'asc' ? 'desc' : 'asc';
      return '<th class="' + (c.num ? 'num' : '') + '"><a href="' + esc(href(route, { s: c.clave + ':' + nd }, ['v', 'q', 'g'])) + '" title="Ordenar">'
        + esc(c.label) + (on ? (s[1] === 'asc' ? ' ▲' : ' ▼') : '') + '</a></th>';
    }).join('') + '<th class="abr"></th></tr></thead>';
  }

  function chipsObrasHtml(route) {
    var tipo = tipoDe(route), act = tipo.split(':')[1] || 'todas';
    var ch = function (val, t) {
      var on = act === val;
      return '<a class="chip' + (on ? ' on' : '') + '" href="' + esc(href(route, { v: 'lista:obras:' + val }, ['q', 'g', 's'])) + '" aria-pressed="' + on + '">' + t + '</a>';
    };
    return '<div class="herr"><div class="grupo"><span>Prioridad</span>' + ch('todas', 'Todas') + ch('alta', 'Alto') + ch('media', 'Medio') + ch('baja', 'Bajo') + ch('sin', 'Sin prioridad') + '</div>'
      + '<div class="grupo">' + ch('sindetalle', 'Sin detalle') + '</div>'
      + '<a class="toggle chip' + (route.g ? ' on' : '') + '" href="' + esc(href(route, { g: route.g ? '' : '1' }, ['v', 's', 'q'])) + '" aria-pressed="' + !!route.g + '">' + (route.g ? '✓ ' : '') + 'Agrupar por casa</a></div>';
  }

  function listaHtml(lista, route, opts) {
    var r = route || rutas().parse(''), o = opts || {}, vmN = o.vmNombre || (r.vm ? r.vm : 'todos'), tipo = tipoDe(r);
    var volver = '<div class="volver"><a class="atras" href="' + esc(rutas().back(r)) + '">‹ Cuadro</a></div>';
    if (!lista || !Array.isArray(lista.filas)) {
      API.ultimaLista = null;
      return volver + '<div class="card">' + vacioHtml('Lista desconocida', 'Este enlace no corresponde a ninguna lista del cuadro.', 'Temporada ' + r.t + ' · VM: ' + vmN) + '</div>';
    }
    var V = filtrarOrdenar(lista, r), filas = V.filas, cols = lista.columnas || [], unidad = lista.unidad || 'filas';
    API.ultimaLista = V; API.ultimaRuta = r;
    var n = unidad === 'casas' ? unicos(filas).length + filas.filter(function (f) { return f.villaid == null; }).length : filas.length;
    var alcance = lista.alcance !== undefined ? lista.alcance : (/^estado(:|$)/.test(tipo) ? '' : 'informes enviados');
    var obras = /^obras(:|$)/.test(tipo);
    var h = volver + '<div class="card"><div class="lt">' + esc(lista.titulo) + ' <small>· ' + plural(n, unidad) + ' · temporada ' + esc(r.t) + ' · VM: ' + esc(vmN) + (alcance ? ' · ' + esc(alcance) : '') + '</small></div>'
      + (obras ? chipsObrasHtml(r) : '')
      + '<div class="herr"><input type="search" id="q" placeholder="Buscar en la lista…" value="' + esc(r.q) + '" oninput="Vistas.teclear(this.value)" aria-label="Buscar">'
      + '<span class="cuenta">' + filas.length + ' de ' + plural(V.total, 'filas') + '</span>'
      + '<button type="button" class="btn" onclick="Vistas.bajarCsv()">⬇️ CSV de estas filas</button></div>';
    var pie = 'Temporada ' + r.t + ' · VM: ' + vmN + (r.q ? ' · búsqueda «' + r.q + '»' : '');
    if (!filas.length) {
      h += V.total ? vacioHtml('Lista vacía', 'La búsqueda no encuentra ninguna fila. Borra el texto para ver las ' + plural(V.total, 'filas') + '.', pie)
        : vacioHtml('Lista vacía', lista.vacio || 'No hay filas con este filtro.', pie);
    } else {
      var ult = null, ncols = cols.length + 1;
      h += '<table class="stack">' + cabeceraHtml(cols, r) + '<tbody>' + filas.map(function (f) {
        var gr = '';
        if (r.g === '1' && txt(f.villa) !== ult) {
          ult = txt(f.villa);
          gr = '<tr class="grp"><td colspan="' + ncols + '">' + esc(ult) + ' · ' + plural(filas.filter(function (x) { return txt(x.villa) === ult; }).length, unidad === 'casas' ? 'filas' : unidad) + '</td></tr>';
        }
        var dest = f.villaid != null ? href(r, { v: 'casa:' + f.villaid, from: r.v }, ['s', 'q', 'g']) : '';
        return gr + '<tr' + (dest ? ' data-href="' + esc(dest) + '"' : '') + '>' + cols.map(function (c) {
          return '<td data-l="' + esc(c.label) + '" class="' + (c.num ? 'num ' : '') + (c.clave === 'villa' ? 'casa-n' : '') + '">' + celdaHtml(f, c) + '</td>';
        }).join('') + '<td class="abr" data-l="">' + (dest ? '<a class="abrir" href="' + esc(dest) + '">Abrir ›</a>' : '') + '</td></tr>';
      }).join('') + '</tbody></table>';
    }
    if (obras) h += '<p class="small-print">Actuaciones = resumen + incidencias por estancia, unidas cuando el texto es idéntico dentro del mismo informe; gana la prioridad más alta y se guardan todos los orígenes. Coste «—» hasta el formulario v5.</p>';
    return h + '</div>';
  }

  function unicos(filas) {
    var vistos = {}, out = [];
    (filas || []).forEach(function (f) { if (f && f.villaid != null && !vistos[String(f.villaid)]) { vistos[String(f.villaid)] = 1; out.push(f.villaid); } });
    return out;
  }

  /* CSV de exactamente las filas visibles (búsqueda, orden y grupo), con Listas.csv del carril D */
  function bajarCsv() {
    var L = API.ultimaLista, Ls = root.Listas;
    if (!L || !Ls || typeof Ls.csv !== 'function') return false;
    var texto = Ls.csv(L), r = API.ultimaRuta || {}, doc = root.document;
    var nombre = 'lista-' + (tipoDe(r) || 'cuadro').replace(/[^a-z0-9]+/gi, '-') + '-' + (r.t || '');
    if (!doc || !root.URL || !root.Blob) return false;
    var a = doc.createElement('a');
    a.href = root.URL.createObjectURL(new root.Blob([texto], { type: 'text/csv;charset=utf-8' }));
    a.download = nombre + '.csv';
    doc.body.appendChild(a); a.click();
    (root.setTimeout || setTimeout)(function () { root.URL.revokeObjectURL(a.href); a.remove(); }, 500);
    return true;
  }

  /* La búsqueda escribe q en el hash sin crear historial y vuelve a pintar con el foco en la caja */
  function teclear(valor) {
    var loc = root.location, R = rutas();
    if (!loc || !R) return;
    var h = R.href(R.parse(loc.hash), { q: valor }, true);
    if (root.history && root.history.replaceState) root.history.replaceState(null, '', h); else loc.hash = h;
    if (typeof root.pintar === 'function') root.pintar();
    var el = root.document && root.document.getElementById('q');
    if (el) { el.focus(); try { el.setSelectionRange(el.value.length, el.value.length); } catch (e) { /* type=search sin selección */ } }
  }

  /* ── nivel 3: anterior / siguiente por la lista de origen (o las casas del cuadro) ── */
  function navCasa(casa, route, lista) {
    var r = route || {}, ids, titulo;
    if (Array.isArray(lista)) { ids = unicos(lista); titulo = 'Casas del cuadro'; }
    else if (lista && Array.isArray(lista.filas)) { ids = unicos(filtrarOrdenar(lista, r).filas); titulo = lista.titulo || ''; }
    else return { pos: -1, total: 0, titulo: '', prev: null, next: null };
    var id = casa ? String(casa.villaid) : '', pos = -1;
    ids.forEach(function (x, i) { if (String(x) === id) pos = i; });
    var ir = function (x) { return href(r, { v: 'casa:' + x }, ['from', 's', 'q', 'g']); };
    return { pos: pos, total: ids.length, titulo: titulo,
      prev: pos > 0 ? ir(ids[pos - 1]) : null, next: pos >= 0 && pos < ids.length - 1 ? ir(ids[pos + 1]) : null };
  }

  /* Una fila por sección y clave: gana la de linea_id más alto (como lineasUnicas de v2) */
  function porClave(lineas) {
    var m = {};
    (lineas || []).forEach(function (l) {
      if (!l) return;
      var k = l.seccion + '|' + l.clave, p = m[k];
      if (p && (parseInt(p.linea_id, 10) || 0) > (parseInt(l.linea_id, 10) || 0)) return;
      m[k] = l;
    });
    return m;
  }
  function partirEstancia(t) { var s = String(t || ''), p = s.indexOf(':'); return p < 0 ? { nombre: '', incidencia: s } : { nombre: s.slice(0, p).trim(), incidencia: s.slice(p + 1).trim() }; }
  function esOtra(clave) { return /^otra_\d+$/.test(clave || ''); }
  function nombreEstancia(clave, lp) {
    if (ESTANCIAS[clave]) return ESTANCIAS[clave];
    var l = lp['estancia|' + clave];
    return (esOtra(clave) && l && partirEstancia(l.texto_1).nombre) || 'Otra estancia';
  }
  function origenTexto(f, lp) {
    if (!f) return '';
    if (f.seccion === 'resumen') return 'Resumen ' + (f.orden || String(f.clave || '').replace(/\D/g, '') || '');
    if (f.seccion === 'estancia') return nombreEstancia(f.clave, lp);
    return f.seccion || '';
  }

  function flagsLargoHtml(casa) {
    var fl = casa.flags || {}, sc = casa.score || {}, out = [], defs = elementosDefSeguro();
    if (fl.peligro === true) out.push('<span class="fl peligro">⚠ Peligro señalado</span>');
    else out.push('<span class="fl nd small-print">⚠ Peligro: dato del formulario v5</span>');
    if (fl.seguridad && fl.seguridad.length) {
      out.push('<span class="fl seg">🔒 Revisión de seguridad: Malo en ' + esc(fl.seguridad.map(function (k) { var e = (defs || []).filter(function (x) { return x.clave === k; })[0]; return e ? corto(e.label) : k; }).join(', ')) + '</span>');
    }
    if (fl.coherencia === 'bueno_con_malo') out.push('<span class="fl san">❓ Estado general «Bueno» con ' + plural(sc.malo || 0, 'marcas') + ' Malo</span>');
    if (fl.coherencia === 'malo_todo_bueno') out.push('<span class="fl san">❓ Estado general «Malo» con todo en Bueno</span>');
    return out.join(' ');
  }
  function elementosDefSeguro() {
    var S = root.InformeScore;
    try { return S && typeof S.elementosDef === 'function' ? S.elementosDef() : null; } catch (e) { return null; }
  }

  function checksHtml(lp) {
    var defs = elementosDefSeguro();
    if (!defs) return '<p class="mot">Faltan las definiciones de los 26 elementos (informe-temporada-score.js no está cargado).</p>';
    return '<table class="stack"><thead><tr><th>Elemento</th><th>Marca</th><th>Observación</th></tr></thead><tbody>' + GRUPOS.map(function (g) {
      return '<tr class="sec-row"><td class="sec" colspan="3">' + g[1] + '</td></tr>' + defs.filter(function (e) { return e.seccion === g[0]; }).map(function (e) {
        var l = lp[e.seccion + '|' + e.clave] || {};
        return '<tr><td class="casa-n" data-l="Elemento">' + esc(e.label) + '</td><td data-l="Marca">' + marcaHtml(l.estado) + '</td><td data-l="Observación">'
          + (txt(l.texto_1) ? esc(txt(l.texto_1)) : '<span class="mot">—</span>') + '</td></tr>';
      }).join('');
    }).join('') + '</tbody></table>';
  }

  function estanciasHtml(casa, lp) {
    var filas = (casa.lineas || []).filter(function (l) { return l && l.seccion === 'estancia'; }).map(function (l) { return lp['estancia|' + l.clave]; })
      .filter(function (l, i, a) { return a.indexOf(l) === i && (txt(l.texto_1) || txt(l.texto_2) || txt(l.prioridad)); })
      .sort(function (a, b) { return (parseInt(a.orden, 10) || 0) - (parseInt(b.orden, 10) || 0); });
    if (!filas.length) return '<p class="mot">Ninguna incidencia por estancia.</p>';
    var grupos = {}, orden = [];
    filas.forEach(function (l) { var n = nombreEstancia(l.clave, lp); if (!grupos[n]) { grupos[n] = []; orden.push(n); } grupos[n].push(l); });
    return orden.map(function (n) {
      return '<div class="grupo-t">' + esc(n) + '</div><ul>' + grupos[n].map(function (l) {
        var inc = esOtra(l.clave) ? partirEstancia(l.texto_1).incidencia : txt(l.texto_1);
        return '<li>' + (inc ? esc(inc) : '<span class="mot">sin incidencia escrita</span>') + (txt(l.texto_2) ? ' <span class="mot">— Acción: ' + esc(txt(l.texto_2)) + '</span>' : '') + ' ' + priHtml(l.prioridad) + '</li>';
      }).join('') + '</ul>';
    }).join('');
  }

  function accionesHtml(casa, lp) {
    var acc = casa.acciones || [];
    if (!acc.length) return '<p class="mot">Ninguna actuación registrada.</p>';
    return [['alta', 'Alto'], ['media', 'Medio'], ['baja', 'Bajo'], ['', 'Sin prioridad']].map(function (g) {
      var xs = acc.filter(function (a) { var p = priVer(a.prioridad); return g[0] ? (p && p[1] === PRI_VER[g[0]][1]) : !p; });
      if (!xs.length) return '';
      return '<div class="grupo-t">' + g[1] + '</div><ul>' + xs.map(function (a) {
        var texto = a.texto != null ? a.texto : a.accion, fs = (a.fuentes || []).map(function (f) { return origenTexto(f, lp); }), sinDet = !txt(a.motivo) || !priVer(a.prioridad);
        return '<li>' + esc(texto) + (txt(a.motivo) ? ' <span class="mot">— ' + esc(a.motivo) + '</span>' : '')
          + '<div class="mot">Origen: ' + esc(fs.join(' + ')) + (fs.length > 1 ? ' (unidas: mismo texto)' : '') + ' · Coste: —'
          + (sinDet ? ' · <span class="falta">⚠ sin detalle</span>' : '') + '</div></li>';
      }).join('') + '</ul>';
    }).join('');
  }

  function comentariosHtml(casa, lp) {
    var grupos = {};
    Object.keys(lp).forEach(function (k) {
      var l = lp[k];
      if (l.seccion !== 'huesped' || !(txt(l.texto_1) || txt(l.texto_2))) return;
      var o = ORIGENES.filter(function (x) { return lw(x) === lw(l.estado); })[0] || 'Sin origen';
      (grupos[o] = grupos[o] || []).push(l);
    });
    var h = ORIGENES.concat(['Sin origen']).filter(function (o) { return grupos[o]; }).map(function (o) {
      return '<div class="grupo-t">' + o + '</div><ul>' + grupos[o].sort(function (a, b) { return String(a.clave).localeCompare(String(b.clave), 'es', { numeric: true }); }).map(function (l) {
        return '<li>' + esc(txt(l.texto_1) || '—') + (txt(l.texto_2) ? ' <span class="mot">— ' + esc(txt(l.texto_2)) + '</span>' : '') + '</li>';
      }).join('') + '</ul>';
    }).join('');
    return h || '<p class="mot">Ningún comentario de huéspedes.</p>';
  }

  function fotosHtml(casa, lp) {
    var E = root.Extras;
    if (E && typeof E.galeriaHtml === 'function') return E.galeriaHtml(casa);
    var n = Object.keys(lp).filter(function (k) { return lp[k].seccion === 'foto' && txt(lp[k].foto_url); }).length;
    return n ? '<p class="mot">' + plural(n, 'fotos') + ' en el informe (el visor de fotos no está cargado).</p>' : '<p class="mot">Este informe no tiene fotos.</p>';
  }

  function casaHtml(casa, casaPrev, route, lista) {
    var r = route || rutas().parse('');
    API.navActual = null;
    if (!casa) return '<div class="volver"><a class="atras" href="' + esc(rutas().back(r)) + '">‹ ' + (r.from ? 'Lista' : 'Cuadro') + '</a></div>'
      + vacioHtml('Casa no encontrada', 'Este enlace no corresponde a ninguna casa de la temporada ' + r.t + '.');
    var nav = navCasa(casa, r, lista), est = casa.estado || '', sc = casa.score || {}, lp = porClave(casa.lineas);
    API.navActual = { prev: nav.prev, next: nav.next };
    var url = casa.url || ('informe-temporada.html?villaid=' + encodeURIComponent(casa.villaid) + '&temporada=' + encodeURIComponent(r.t));
    var chip = function (h, t) { return h ? '<a class="chip" href="' + esc(h) + '">' + t + '</a>' : '<span class="chip" style="opacity:.4">' + t + '</span>'; };
    var h = '<div class="volver no-print"><a class="atras" href="' + esc(rutas().back(r)) + '">‹ ' + (r.from ? 'Lista' : 'Cuadro') + '</a>'
      + (nav.pos >= 0 ? '<span>casa ' + (nav.pos + 1) + ' de ' + nav.total + ' en «' + esc(nav.titulo) + '»</span>' + chip(nav.prev, '‹ Anterior') + chip(nav.next, 'Siguiente ›') + '<span class="small-print">teclas ← →</span>' : '')
      + '</div>';
    /* puntuación: enviado = su banda; borrador = vista previa gris; sin informe = — */
    var punt = sc.puntuacion, bandaV = est === 'enviado' ? (sc.banda || banda(punt)) : 'gris';
    var estadoP = est === '' ? 'sin informe' : sc.error === 'datos' ? 'datos con error' : punt == null ? 'sin puntuación' : est === 'borrador' ? 'borrador · vista previa' : sc.completo ? 'final' : 'provisional';
    var comp = est === '' ? '' : (sc.evaluados != null ? sc.evaluados : 0) + '/' + (sc.aplicables != null ? sc.aplicables : 26) + ' elementos · ';
    h += '<div class="card hv-head"><div><h2>' + esc(casa.villa) + '</h2><div class="hv-meta">Villa manager: <b>' + esc(casa.vm || '—') + '</b> · Temporada ' + esc(r.t)
      + (est !== '' ? '<br>Fecha de revisión: ' + esc(fecha(casa.fecha) || '—') + ' · Último guardado: ' + esc(fecha(casa.updated) || '—')
        + (casa.enviado_at ? ' · Envío: ' + esc(fecha(casa.enviado_at)) : '') : '')
      + (casa.general ? '<br>Estado general: ' + esc((MARCA[lw(casa.general)] || [casa.general])[0]) : '')
      + '<br><span class="pill ' + (est || 'sin') + '">' + ESTADO[est] + '</span> <span class="small-print">historial no disponible antes de la v5</span></div>'
      + (est !== '' ? '<div class="hv-flags">' + flagsLargoHtml(casa) + '</div>' : '') + '</div>'
      + '<div class="hv-score"><span class="sc ' + esc(bandaV) + '">' + (est === '' ? '—' : fmt1(punt)) + '</span><div class="cmp">Condición · ' + comp + estadoP + '</div></div>'
      + '<div class="hv-btns no-print"><a class="btn" href="' + esc(url) + '">Abrir formulario</a>'
      + '<button type="button" class="btn rojo" onclick="window.print()">🖨️ Imprimir casa</button></div></div>';
    if (est === '') return h + '<div class="card">' + vacioHtml('Sin informe', 'Esta casa no tiene informe en la temporada ' + r.t + '. Cambia la temporada arriba para ver otro año.') + '</div>';
    var malo = sc.malo || 0, nAcc = (casa.acciones || []).length;
    var msa = malo > 0 && nAcc === 0 ? '<div class="aviso-linea m">Malo sin actuación: ' + plural(malo, 'marcas') + ' Malo y ninguna actuación registrada</div>'
      : '<div class="aviso-linea">Malo sin actuación: 0 · ' + plural(malo, 'marcas') + ' Malo · ' + plural(nAcc, 'actuaciones') + '</div>';
    var E = root.Extras, cmpH = E && typeof E.comparacionHtml === 'function' ? E.comparacionHtml(casa, casaPrev || null)
      : '<p class="mot">La comparación con la temporada anterior no está cargada.</p>';
    return h + msa + '<div style="height:12px"></div><div class="hv-grid"><div class="card blk"><h3>Las 26 comprobaciones</h3>' + checksHtml(lp) + '</div><div>'
      + '<div class="card blk"><h3>Comparación con ' + (parseInt(r.t, 10) - 1) + '</h3>' + cmpH + '</div>'
      + '<div class="card blk"><h3>Incidencias por estancia</h3>' + estanciasHtml(casa, lp) + '</div>'
      + '<div class="card blk"><h3>Actuaciones <small>· por prioridad · coste «—» hasta la v5</small></h3>' + accionesHtml(casa, lp) + '</div>'
      + '<div class="card blk"><h3>Comentarios de huéspedes</h3>' + comentariosHtml(casa, lp) + '</div></div></div>'
      + '<div class="card blk"><h3>Observaciones finales</h3><p>' + esc(txt(casa.observaciones_finales != null ? casa.observaciones_finales : casa.finales) || '—') + '</p></div>'
      + '<div class="card blk"><h3>Fotos <small>· clic para ampliar · Esc cierra</small></h3>' + fotosHtml(casa, lp) + '</div>';
  }

  var API = {
    VERSION: 1,
    listaHtml: listaHtml, casaHtml: casaHtml, filtrarOrdenar: filtrarOrdenar, navCasa: navCasa,
    bajarCsv: bajarCsv, teclear: teclear,
    ultimaLista: null, ultimaRuta: null, navActual: null,
    _internals: { esc: esc, fmt1: fmt1, fecha: fecha, banda: banda, priVer: priVer, porClave: porClave, partirEstancia: partirEstancia }
  };
  root.Vistas = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));

/* HISTORIAL: v1 2026-10-29 — primera versión (cuadro de informes de temporada v3, carril B). Lo pidió Gary el 29/10/2026 ("click into everything with metrics"). Nivel 2: listaHtml con título y cuenta, «‹ Cuadro», cabeceras que ordenan por enlace del hash, caja de búsqueda (sin acentos ni mayúsculas, sobre el texto que se ve), «N de M filas», CSV de exactamente las filas visibles (Listas.csv), «Abrir ›» a la casa con la lista de origen, agrupar por casa, chips de prioridad en obras, lista vacía que explica por qué. Nivel 3: casaHtml con cabecera (puntuación, banda, completitud, banderas, fechas guardadas sin inventar el envío, estado), anterior/siguiente por la lista actual (navActual para ← →), «Abrir formulario» y «Imprimir casa», las 26 comprobaciones en tres grupos, incidencias por estancia, actuaciones por prioridad con su origen, comentarios por origen con «Sin origen», observaciones finales, comparación y fotos del carril E (Extras) o un aviso si no está cargado, y «Malo sin actuación». Sin red. */
