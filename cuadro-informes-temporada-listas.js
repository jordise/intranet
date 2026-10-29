/* Listas del cuadro de informes de temporada v3 (informe-cuadro-v3a, carril D, 29/10/2026).
   Nivel 2 de la página: las filas detrás de cada número. Funciones puras: reciben las filas "casa" (construirCasasV3 del
   carril C: {villaid, villa, vm, vmId, informe_id, estado, general, fecha, updated, lineas, score, flags, acciones, url})
   y devuelven {titulo, columnas: [{clave, label, num}], filas: [...], vacio}. El HTML lo pinta el carril B (Vistas.listaHtml).
   Cuentan solo los informes ENVIADOS (los borradores salen en estado:borrador y en "enBorradores" de obras).
   Necesita InformeScore (informe-temporada-score.js) cargado antes. Sin DOM, sin red.
   En el navegador: window.Listas. En node: module.exports. */
(function (root) {
  'use strict';

  function IS() {
    var s = typeof InformeScore !== 'undefined' ? InformeScore : (root && root.InformeScore);
    if (!s) throw new Error('Listas necesita InformeScore (informe-temporada-score.js) cargado antes');
    return s;
  }
  var KINDS = ['estado', 'condicion', 'provisionales', 'alertas', 'obras', 'review', 'comentarios', 'atencion', 'malosinact', 'repetido', 'marcas', 'mapa', 'elemento', 'comparacion', 'coste'];

  /* ───────── Utilidades ───────── */
  function lw(s) { return String(s == null ? '' : s).trim().toLowerCase(); }
  function tr(s) { return String(s == null ? '' : s).trim(); }
  function norm(s) { return String(s == null ? '' : s).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase(); }
  function vacioV(v) { return v == null || v === ''; }
  /* Fecha: ISO (2026-10-12 o 2026-10-12T10:00) o dd/mm/aaaa -> dd/mm/aaaa; y al revés para ordenar */
  function fechaVer(v) {
    var s = tr(v), m = s.match(/^(\d{4})-(\d\d)-(\d\d)/);
    if (m) return m[3] + '/' + m[2] + '/' + m[1];
    return /^\d\d\/\d\d\/\d{4}$/.test(s) ? s : '';
  }
  function fechaIso(v) {
    var s = tr(v), m = s.match(/^(\d{4})-(\d\d)-(\d\d)/);
    if (m) return m[1] + '-' + m[2] + '-' + m[3];
    m = s.match(/^(\d\d)\/(\d\d)\/(\d{4})$/);
    return m ? m[3] + '-' + m[2] + '-' + m[1] : null;
  }
  function plural(n, uno, varios) { return n + ' ' + (n === 1 ? uno : varios); }
  function bandaDe(p) { return p == null ? 'gris' : p < 50 ? 'rojo' : p < 80 ? 'ambar' : 'verde'; }

  /* Elementos (de InformeScore.elementosDef) */
  function defs() { return IS().elementosDef(); }
  function defDe(clave) { var d = defs(); for (var i = 0; i < d.length; i++) if (d[i].clave === clave) return d[i]; return null; }
  function corto(clave) { var d = defDe(clave); return d ? String(d.label).replace(/\s*\(.*\)\s*/, '').trim() || d.label : clave; }

  var MARCA = { bueno: 'Bueno', regular: 'Regular', malo: 'Malo', '': 'Sin marcar' };
  var ESTADO = { enviado: 'Enviado', borrador: 'Borrador', '': 'Sin informe' };
  var RANGO = { alta: 3, media: 2, baja: 1 };
  var VER = { alta: 'Alto', media: 'Medio', baja: 'Bajo' };
  /* Estancias del formulario v4 (seccionesDef, sección 5); otra_N = estancia añadida */
  var ESTANCIAS = { salon: 'Salón / comedor', cocina: 'Cocina', dormitorio_principal: 'Dormitorio principal', dormitorio_2: 'Dormitorio 2',
    bano_1: 'Baño 1', bano_2: 'Baño 2', exterior_piscina: 'Exterior / zona piscina' };

  /* Prioridad guardada Alta/Media/Baja (o Alto/Medio/Bajo de la v1) -> 'alta' | 'media' | 'baja' | '' */
  function prioridadClave(p) { var s = lw(p), m = { alto: 'alta', medio: 'media', bajo: 'baja' }; s = m[s] || s; return RANGO[s] ? s : ''; }

  /* Marcas de una casa: clave -> {marca, obs}; una línea por elemento (gana el linea_id más alto); caché por objeto */
  var CACHE = typeof WeakMap !== 'undefined' ? new WeakMap() : null;
  function marcasDe(casa) {
    if (!casa) return {};
    if (CACHE && CACHE.has(casa)) return CACHE.get(casa);
    var sec = {}, out = {}, id = {};
    defs().forEach(function (e) { sec[e.seccion + '|' + e.clave] = e.clave; out[e.clave] = { marca: '', obs: '' }; });
    (casa.lineas || []).forEach(function (l) {
      var k = l && sec[l.seccion + '|' + l.clave]; if (!k) return;
      var n = parseInt(l.linea_id, 10) || 0; if (id.hasOwnProperty(k) && id[k] > n) return; id[k] = n;
      var m = lw(l.estado);
      out[k] = { marca: MARCA.hasOwnProperty(m) ? m : '', obs: tr(l.texto_1) };
    });
    if (CACHE) CACHE.set(casa, out);
    return out;
  }
  function fotosDe(casa) { return (casa && casa.lineas || []).filter(function (l) { return l.seccion === 'foto' && tr(l.foto_url); }).length; }
  function sc(casa) { return (casa && casa.score) || {}; }
  function puntuacion(casa) { var p = sc(casa).puntuacion; return p == null ? null : p; }
  function completo(casa) { return !!sc(casa).completo; }
  function seguridad(casa) { var f = casa && casa.flags; return f && Array.isArray(f.seguridad) ? f.seguridad : []; }
  function peligro(casa) { return !!(casa && casa.flags && casa.flags.peligro === true); }
  function textoAccion(a) { return tr(a.texto != null ? a.texto : a.accion != null ? a.accion : a.texto_1); }
  function acciones(casa) { return (casa && casa.acciones || []).filter(function (a) { return a && textoAccion(a); }); }
  function altas(casa) { return acciones(casa).filter(function (a) { return prioridadClave(a.prioridad) === 'alta'; }).length; }
  function malos(casa) {
    var s = sc(casa); if (typeof s.malo === 'number') return s.malo;
    var m = marcasDe(casa); return Object.keys(m).filter(function (k) { return m[k].marca === 'malo'; }).length;
  }
  function enviada(c) { return c && c.estado === 'enviado'; }
  /* Texto de un origen de actuación: "Resumen 2" o el nombre de la estancia */
  function fuenteTexto(f) {
    if (typeof f === 'string') return f;
    if (!f) return '';
    if (f.seccion === 'resumen') { var n = parseInt(f.orden, 10) || parseInt(String(f.clave || '').replace(/\D/g, ''), 10); return 'Resumen' + (n ? ' ' + n : ''); }
    if (f.seccion === 'estancia') {
      if (ESTANCIAS[f.clave]) return ESTANCIAS[f.clave];
      var o = String(f.clave || '').match(/^otra_(\d+)$/);
      return o ? 'Otra estancia ' + o[1] : 'Estancia ' + (f.clave || '');
    }
    return String(f.seccion || '') + (f.clave ? ' ' + f.clave : '');
  }
  function fuenteSeccion(f) { return typeof f === 'string' ? (/^resumen/i.test(f) ? 'resumen' : 'estancia') : (f && f.seccion) || ''; }

  /* ───────── Columnas comunes ───────── */
  var COL = {
    villa: { clave: 'villa', label: 'Casa', tipo: 'casa' },
    vm: { clave: 'vm', label: 'VM' },
    estado: { clave: 'estado', label: 'Estado' },
    fecha: { clave: 'fecha', label: 'Fecha de revisión', tipo: 'fecha', orden: 'fechaIso' },
    guardado: { clave: 'guardado', label: 'Último guardado', tipo: 'fecha', orden: 'guardadoIso' },
    puntuacion: { clave: 'puntuacion', label: 'Condición', num: true, tipo: 'puntuacion' },
    completitud: { clave: 'completitud', label: 'Completitud', num: true, orden: 'evaluados' },
    final: { clave: 'final', label: 'Puntuación' },
    alta: { clave: 'alta', label: 'Alto', num: true },
    elemento: { clave: 'elemento', label: 'Elemento', tipo: 'elemento' },
    marca: { clave: 'marca', label: 'Marca', tipo: 'marca' },
    observacion: { clave: 'observacion', label: 'Observación' },
    fotos: { clave: 'fotos', label: 'Fotos', num: true }
  };
  var BASE = [COL.villa, COL.vm];
  var OBRA_COLS = [COL.villa, COL.vm, { clave: 'accion', label: 'Actuación' }, { clave: 'motivo', label: 'Motivo / impacto' },
    { clave: 'origen', label: 'Origen' }, { clave: 'prioridad', label: 'Prioridad', tipo: 'prioridad', orden: 'rango' },
    { clave: 'coste', label: 'Coste', num: true }, { clave: 'detalle', label: 'Detalle' }];
  var NOTA_OBRAS = 'Actuaciones = resumen + incidencias por estancia, unidas cuando el texto es idéntico dentro del mismo informe; gana la prioridad más alta y se guardan todos los orígenes. Coste «—» hasta el formulario v5.';

  /* Fila base de una casa (todas las listas la llevan: villaid e informe_id abren el nivel 3) */
  function base(c) {
    return { villaid: c.villaid, informe_id: c.informe_id == null ? null : c.informe_id, villa: String(c.villa || ''), vm: String(c.vm || ''),
      vmId: c.vmId || '', borrador: c.estado === 'borrador', url: c.url || '' };
  }
  function filaCasa(c) {
    var f = base(c), s = sc(c), p = puntuacion(c), hay = !!c.estado;
    f.estado = ESTADO[c.estado || ''] || 'Sin informe';
    f.fecha = fechaVer(c.fecha); f.fechaIso = fechaIso(c.fecha);
    f.guardado = fechaVer(c.updated); f.guardadoIso = fechaIso(c.updated);
    f.puntuacion = hay ? p : null;
    f.banda = !hay || c.estado === 'borrador' ? 'gris' : (s.banda || bandaDe(p));
    f.evaluados = hay ? (s.evaluados || 0) : null;
    f.completitud = hay ? f.evaluados + '/' + (s.aplicables == null ? 26 : s.aplicables) : '';
    f.final = !hay || p == null ? '' : s.completo ? 'final' : 'provisional';
    f.alta = hay ? altas(c) : 0;
    return f;
  }
  function cmp(a, b) {
    var na = vacioV(a), nb = vacioV(b);
    if (na && nb) return 0; if (na) return 1; if (nb) return -1;
    return typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b), 'es', { sensitivity: 'base' });
  }
  function porNombre(a, b) { return String(a.villa || '').localeCompare(String(b.villa || ''), 'es', { sensitivity: 'base' }) || ((+a.villaid || 0) - (+b.villaid || 0)); }
  /* Orden de riesgo de las casas: con informe primero; peligro, revisión de seguridad, condición más baja, incompleto, nombre */
  function ordenRiesgo(casas) {
    return casas.slice().sort(function (a, b) {
      var sa = !a.estado, sb = !b.estado; if (sa !== sb) return sa ? 1 : -1;
      if (peligro(a) !== peligro(b)) return peligro(a) ? -1 : 1;
      var ga = seguridad(a).length > 0, gb = seguridad(b).length > 0; if (ga !== gb) return ga ? -1 : 1;
      var x = cmp(puntuacion(a), puntuacion(b)); if (x) return x;
      if (completo(a) !== completo(b)) return completo(a) ? 1 : -1;
      return porNombre(a, b);
    });
  }
  function L(titulo, unidad, columnas, filas, vacio, extra) {
    var o = { titulo: titulo, unidad: unidad, columnas: columnas, filas: filas, vacio: vacio };
    Object.keys(extra || {}).forEach(function (k) { o[k] = extra[k]; });
    return o;
  }

  /* ───────── Las listas ───────── */
  function estado(casas, sub) {
    var x = sub || 'todas', T = { todas: 'Todas las casas', enviado: 'Casas con informe enviado', borrador: 'Casas con informe en borrador', sin: 'Casas sin informe' };
    if (!T[x]) return L('Casas', 'casas', BASE.concat([COL.estado]), [], 'El estado «' + x + '» no existe: usa enviado, borrador, sin o todas.');
    var sel = casas.filter(function (c) { return x === 'todas' || (x === 'sin' ? !c.estado : c.estado === x); });
    return L(T[x], 'casas', BASE.concat([COL.estado, COL.fecha, COL.guardado, COL.puntuacion, COL.completitud]), ordenRiesgo(sel).map(filaCasa),
      x === 'sin' ? 'Todas las casas tienen informe con el filtro elegido.' : 'Ninguna casa está en este estado con el filtro elegido.');
  }
  function condicion(casas) {
    var f = casas.filter(enviada).map(filaCasa).sort(function (a, b) { return cmp(a.puntuacion, b.puntuacion) || porNombre(a, b); });
    return L('Casas por condición (peor primero, informes enviados)', 'casas', BASE.concat([COL.puntuacion, COL.completitud, COL.final, COL.guardado]), f,
      'Ningún informe enviado con este filtro: no hay condición que calcular.');
  }
  function provisionales(casas) {
    var f = casas.filter(function (c) { return enviada(c) && !completo(c); }).map(filaCasa).sort(function (a, b) { return cmp(a.evaluados, b.evaluados) || porNombre(a, b); });
    return L('Informes enviados con puntuación provisional (no completos)', 'casas', BASE.concat([COL.puntuacion, COL.completitud, COL.guardado]), f,
      casas.some(enviada) ? 'Todos los informes enviados tienen los 26 elementos marcados.' : 'Ningún informe enviado con este filtro.');
  }
  function alertas(casas, sub) {
    var s = sub || '', filas = [];
    casas.filter(enviada).slice().sort(porNombre).forEach(function (c) {
      var p = puntuacion(c), mk = marcasDe(c);
      if (peligro(c) && s !== 'seguridad') filas.push(Object.assign(base(c), { tipoAlerta: 'peligro', alerta: '⚠ Peligro', detalle: tr(c.peligroTxt || (c.flags && c.flags.peligroTxt)), puntuacion: p, banda: bandaDe(p) }));
      if (seguridad(c).length && s !== 'peligro') filas.push(Object.assign(base(c), { tipoAlerta: 'seguridad', alerta: '🔒 Revisión de seguridad', claves: seguridad(c).slice(),
        detalle: seguridad(c).map(function (k) { return corto(k) + ': ' + ((mk[k] && mk[k].obs) || 'sin observación'); }).join(' · '), puntuacion: p, banda: bandaDe(p) }));
    });
    filas.sort(function (a, b) { return (a.tipoAlerta === b.tipoAlerta ? 0 : a.tipoAlerta === 'peligro' ? -1 : 1) || porNombre(a, b); });
    var T = { peligro: 'Peligros señalados', seguridad: 'Revisiones de seguridad (Malo en un elemento de seguridad)' };
    return L(T[s] || 'Alertas: peligros y revisiones de seguridad', 'alertas',
      BASE.concat([{ clave: 'alerta', label: 'Alerta' }, { clave: 'detalle', label: 'Detalle' }, COL.puntuacion]), filas,
      s === 'peligro' ? 'Ningún peligro señalado: el dato de peligro llega con el formulario v5; hoy el formulario no lo recoge.'
        : 'Ningún informe enviado tiene un peligro ni un Malo en electricidad, cerraduras, fontanería, barandillas, pavimentos o piscina.');
  }
  /* Obras: filas de actuación de un conjunto de casas con los filtros de prioridad, origen y "sin detalle" */
  function filasObras(casas, f) {
    var out = [];
    casas.forEach(function (c) {
      acciones(c).forEach(function (a) {
        var pc = prioridadClave(a.prioridad), fu = Array.isArray(a.fuentes) ? a.fuentes : [], mot = tr(a.motivo);
        var o = Object.assign(base(c), { accion: textoAccion(a), motivo: mot, fuentes: fu.slice(), origen: fu.map(fuenteTexto).join(' + '), unidas: fu.length > 1,
          prioridad: VER[pc] || '', prioridadClave: pc, rango: RANGO[pc] || 0, coste: null, detalle: !mot || !pc ? 'sin detalle' : '',
          orden: fu.length ? (parseInt(fu[0].orden, 10) || 0) + (fuenteSeccion(fu[0]) === 'estancia' ? 100 : 0) : 0 });
        out.push(o);
      });
    });
    var p = lw(f.prioridad);
    if (p === 'alta' || p === 'media' || p === 'baja') out = out.filter(function (o) { return o.prioridadClave === p; });
    else if (p === 'sin') out = out.filter(function (o) { return !o.prioridadClave; });
    else if (p === 'sindetalle') out = out.filter(function (o) { return o.detalle; });
    var fu = lw(f.fuente);
    if (fu === 'resumen' || fu === 'estancia') out = out.filter(function (o) { return o.fuentes.some(function (x) { return fuenteSeccion(x) === fu; }); });
    if (f.sindetalle && f.sindetalle !== '0') out = out.filter(function (o) { return o.detalle; });
    return out.sort(function (a, b) { return (b.rango - a.rango) || porNombre(a, b) || (a.orden - b.orden); });
  }
  function obras(casas, f) {
    f = f || {};
    var p = lw(f.prioridad) || 'todas';
    var T = { todas: 'Todas las actuaciones', alta: 'Actuaciones de prioridad Alto', media: 'Actuaciones de prioridad Medio', baja: 'Actuaciones de prioridad Bajo',
      sin: 'Actuaciones sin prioridad', sindetalle: 'Actuaciones sin detalle (falta motivo o prioridad)' };
    var filas = filasObras(casas.filter(enviada), f), borr = filasObras(casas.filter(function (c) { return c.estado === 'borrador'; }), f).length;
    var hay = casas.filter(enviada).some(function (c) { return acciones(c).length; });
    return L(T[p] || 'Actuaciones', 'actuaciones', OBRA_COLS, filas,
      !hay ? 'Ninguna actuación en los informes enviados.' : 'Ninguna actuación con estos filtros en los informes enviados. Quita un filtro.',
      { nota: NOTA_OBRAS, enBorradores: borr });
  }
  function comentarios(casas, sub, soloReview) {
    var o = soloReview ? 'review' : lw(sub), filas = [];
    casas.filter(enviada).slice().sort(porNombre).forEach(function (c) {
      (c.lineas || []).filter(function (l) { return l.seccion === 'huesped' && tr(l.texto_1); })
        .sort(function (a, b) { return (parseInt(a.orden, 10) || 0) - (parseInt(b.orden, 10) || 0); })
        .forEach(function (l) {
          var or = tr(l.estado);
          if (o && o !== 'todos' && (o === 'sin' ? or : lw(or) !== o)) return;
          filas.push(Object.assign(base(c), { origen: or || 'Sin origen', comentario: tr(l.texto_1), detalle: tr(l.texto_2) }));
        });
    });
    return L(soloReview ? 'Comentarios de huéspedes con origen Review' : 'Comentarios de huéspedes', 'comentarios',
      BASE.concat([{ clave: 'origen', label: 'Origen' }, { clave: 'comentario', label: 'Comentario' }, { clave: 'detalle', label: 'Detalle / mejora' }]), filas,
      soloReview ? 'Ningún comentario con origen Review en los informes enviados.' : 'Ningún comentario de huéspedes en los informes enviados.');
  }
  function review(casas) { return comentarios(casas, 'review', true); }
  function atencion(casas) {
    var sel = casas.filter(function (c) { return enviada(c) && (peligro(c) || seguridad(c).length || altas(c) || !completo(c)); });
    sel.sort(function (a, b) {
      return (peligro(b) - peligro(a)) || ((seguridad(b).length > 0) - (seguridad(a).length > 0)) || (altas(b) - altas(a))
        || (completo(a) - completo(b)) || cmp(puntuacion(a), puntuacion(b)) || ((+a.villaid || 0) - (+b.villaid || 0));
    });
    var filas = sel.map(function (c) {
      var f = filaCasa(c), m = [], s = sc(c);
      if (peligro(c)) m.push('peligro');
      if (seguridad(c).length) m.push('revisión de seguridad');
      if (f.alta) m.push(plural(f.alta, 'actuación de prioridad Alto', 'actuaciones de prioridad Alto'));
      if (!completo(c)) m.push('incompleto ' + (s.evaluados || 0) + '/' + (s.aplicables == null ? 26 : s.aplicables));
      f.motivo = m.join(' · ');
      return f;
    });
    return L('Requiere atención', 'casas', BASE.concat([{ clave: 'motivo', label: 'Motivo' }, COL.alta, COL.puntuacion, COL.completitud]), filas,
      'Ninguna casa con peligro, revisión de seguridad, actuación de prioridad Alto o informe incompleto.');
  }
  function malosinact(casas) {
    var filas = casas.filter(function (c) { return enviada(c) && malos(c) > 0 && acciones(c).length === 0; }).slice().sort(porNombre).map(function (c) {
      var mk = marcasDe(c), p = puntuacion(c);
      return Object.assign(base(c), { malo: malos(c), elementos: defs().filter(function (e) { return mk[e.clave] && mk[e.clave].marca === 'malo'; }).map(function (e) { return corto(e.clave); }).join(' · '),
        puntuacion: p, banda: bandaDe(p) });
    });
    return L('Malo sin actuación (informes con Malo y ninguna actuación)', 'casas',
      BASE.concat([{ clave: 'malo', label: 'Marcas Malo', num: true }, { clave: 'elementos', label: 'Elementos en Malo' }, COL.puntuacion]), filas,
      casas.some(enviada) ? 'Todos los informes con alguna marca Malo tienen al menos una actuación.' : 'Ningún informe enviado con este filtro.');
  }
  /* Pares de la temporada previa: misma villa, informe enviado en las dos */
  function pares(casas, prev) {
    var pv = {};
    (prev || []).forEach(function (p) { if (enviada(p)) pv[String(p.villaid)] = p; });
    return casas.filter(enviada).slice().sort(porNombre).map(function (c) {
      var p = pv[String(c.villaid)]; return p ? { casa: c, prev: p, cmp: IS().comparar(p.lineas || [], c.lineas || []) } : null;
    }).filter(Boolean);
  }
  function sinPrevia(prev, t) {
    var a = t ? 'la temporada ' + (t - 1) : 'la temporada anterior';
    if (!prev) return 'La temporada anterior no está cargada: no hay nada que comparar.';
    if (!prev.some(enviada)) return 'No hay informes enviados en ' + a + ' (temporada anterior): no hay nada que comparar.';
    return null;
  }
  function repetido(casas, prev, t) {
    var filas = [];
    pares(casas, prev).forEach(function (x) {
      var m0 = marcasDe(x.prev), m1 = marcasDe(x.casa);
      (x.cmp.repetidos || []).forEach(function (k) {
        filas.push(Object.assign(base(x.casa), { clave: k, elemento: corto(k), marcaAntes: MARCA[m0[k] ? m0[k].marca : ''], marcaAhora: MARCA[m1[k] ? m1[k].marca : ''],
          observacion: m1[k] ? m1[k].obs : '' }));
      });
    });
    var a0 = t ? String(t - 1) : 'Temporada anterior', a1 = t ? String(t) : 'Esta temporada';
    return L('Repetido: Regular o Malo en ' + (t ? (t - 1) + ' y en ' + t : 'las dos temporadas'), 'marcas',
      BASE.concat([COL.elemento, { clave: 'marcaAntes', label: a0, tipo: 'marca' }, { clave: 'marcaAhora', label: a1, tipo: 'marca' }, COL.observacion]), filas,
      sinPrevia(prev, t) || 'Ningún elemento repetido en Regular o Malo entre las dos temporadas.');
  }
  function comparacion(casas, prev, t) {
    var filas = pares(casas, prev).filter(function (x) { return x.cmp && x.cmp.n > 0; }).map(function (x) {
      var a = x.cmp.puntuacionA, b = x.cmp.puntuacionB;
      return Object.assign(base(x.casa), { antes: a, ahora: b, bandaAntes: bandaDe(a), bandaAhora: bandaDe(b),
        diferencia: a == null || b == null ? null : Math.round(10 * (b - a)) / 10, comunes: x.cmp.n, cambios: (x.cmp.cambios || []).length });
    });
    return L('Comparación con ' + (t ? t - 1 : 'la temporada anterior') + ' (mismos elementos evaluados en ambas)', 'casas',
      BASE.concat([{ clave: 'antes', label: t ? String(t - 1) : 'Antes', num: true, tipo: 'puntuacion' }, { clave: 'ahora', label: t ? String(t) : 'Ahora', num: true, tipo: 'puntuacion' },
        { clave: 'diferencia', label: 'Diferencia', num: true }, { clave: 'comunes', label: 'Elementos comunes', num: true }, { clave: 'cambios', label: 'Cambios', num: true }]), filas,
      sinPrevia(prev, t) || 'Ninguna casa tiene informe enviado en las dos temporadas.');
  }
  function marcas(casas, sub) {
    var m = lw(sub) || 'malo'; if (m === 'sin') m = '';
    if (!MARCA.hasOwnProperty(m)) return L('Marcas', 'marcas', BASE.concat([COL.elemento, COL.marca, COL.observacion]), [], 'La marca «' + sub + '» no existe: usa bueno, regular, malo o sin.');
    var filas = [];
    casas.filter(enviada).slice().sort(porNombre).forEach(function (c) {
      var mk = marcasDe(c);
      defs().forEach(function (e) { var x = mk[e.clave]; if (x && x.marca === m) filas.push(Object.assign(base(c), { clave: e.clave, elemento: corto(e.clave), marca: MARCA[m], marcaClave: m || 'sin', observacion: x.obs })); });
    });
    return L(m ? 'Todas las marcas ' + MARCA[m] + ' de los informes enviados' : 'Todos los elementos sin marcar de los informes enviados', 'marcas',
      BASE.concat([COL.elemento, COL.marca, COL.observacion]), filas, 'Ninguna marca ' + MARCA[m] + ' en los informes enviados.');
  }
  var MAPA_COLS = BASE.concat([COL.marca, COL.observacion, COL.fotos, COL.puntuacion]);
  function mapa(casas, clave, marca) {
    var d = defDe(clave);
    if (!d) return L('Elemento desconocido', 'casas', MAPA_COLS, [], 'El elemento «' + (clave || '') + '» no es uno de los 26 del formulario.');
    var lab = corto(clave), m = lw(marca) || 'todas';
    if (m === 'na') return L('Casas con ' + lab + ' en N/A', 'casas', MAPA_COLS, [],
      'La marca N/A («no aplica») llega con el formulario v5. Hoy ningún informe puede marcarla; por eso la columna muestra «—».');
    var mm = m === 'sin' ? '' : m;
    if (m !== 'todas' && !MARCA.hasOwnProperty(mm)) return L('Casas: ' + lab, 'casas', MAPA_COLS, [], 'La marca «' + marca + '» no existe: usa bueno, regular, malo, sin, na o todas.');
    var filas = casas.filter(enviada).slice().sort(porNombre).filter(function (c) { return m === 'todas' || (marcasDe(c)[clave] || {}).marca === mm; }).map(function (c) {
      var x = marcasDe(c)[clave] || { marca: '', obs: '' }, p = puntuacion(c);
      return Object.assign(base(c), { clave: clave, elemento: lab, marca: MARCA[x.marca], marcaClave: x.marca || 'sin', observacion: x.obs, fotos: fotosDe(c), puntuacion: p, banda: bandaDe(p) });
    });
    return L(m === 'todas' ? 'Todos los informes enviados: ' + lab : m === 'sin' ? 'Casas con ' + lab + ' sin marcar' : 'Casas con ' + lab + ' en ' + MARCA[mm], 'casas', MAPA_COLS, filas,
      'Ninguna casa con esta marca en ' + lab + ' (informes enviados).');
  }
  function elemento(casas, clave) {
    var x = mapa(casas, clave, 'todas');
    if (defDe(clave)) x.titulo = 'Todos los registros: ' + corto(clave);
    return x;
  }
  function coste() {
    return L('Actuaciones por banda de coste', 'actuaciones', OBRA_COLS, [], 'Sin datos: la banda de coste por actuación llega con el formulario v5. Hasta entonces el coste se muestra como «—».', { nota: NOTA_OBRAS, enBorradores: 0 });
  }

  /* ───────── Buscar, ordenar, agrupar ───────── */
  function valorTexto(v) { return Array.isArray(v) ? v.map(fuenteTexto).join(' + ') : v == null ? '' : String(v); }
  function buscar(filas, columnas, q) {
    var n = norm(tr(q)); if (!n) return filas.slice();
    return filas.filter(function (f) { return (columnas || []).some(function (c) { return norm(valorTexto(f[c.clave])).indexOf(n) >= 0; }); });
  }
  /* s = 'clave:asc' | 'clave:desc'; estable; vacíos siempre al final; ordena por c.orden si la columna lo trae */
  function ordenar(filas, columnas, s) {
    if (!s) return filas.slice();
    var p = String(s).split(':'), c = (columnas || []).filter(function (x) { return x.clave === p[0]; })[0];
    if (!c) return filas.slice();
    var k = c.orden || c.clave, m = p[1] === 'desc' ? -1 : 1;
    return filas.map(function (f, i) { return [f, i]; }).sort(function (x, y) {
      var a = x[0][k], b = y[0][k];
      if (vacioV(a) || vacioV(b)) return cmp(a, b) || (x[1] - y[1]);
      return (m * cmp(a, b)) || (x[1] - y[1]);
    }).map(function (x) { return x[0]; });
  }
  function agrupar(filas) {
    var f = filas.map(function (x, i) { return [x, i]; }).sort(function (a, b) { return porNombre(a[0], b[0]) || (a[1] - b[1]); }).map(function (x) { return x[0]; });
    var g = [], u = null;
    f.forEach(function (x) { if (!u || u.villaid !== x.villaid) { u = { villaid: x.villaid, villa: x.villa, n: 0 }; g.push(u); } u.n++; });
    return { filas: f, grupos: g };
  }

  /* ───────── Entrada única ───────── */
  function normArgs(kind, args) {
    var a = {};
    if (Array.isArray(args)) a.partes = args.slice();
    else if (typeof args === 'string') a.partes = args ? args.split(':') : [];
    else if (args && typeof args === 'object') {
      Object.keys(args).forEach(function (k) { a[k] = args[k]; });
      a.partes = Array.isArray(args.partes) ? args.partes.slice() : typeof args.partes === 'string' && args.partes ? args.partes.split(':') : [];
    } else a.partes = [];
    var p = String(kind == null ? '' : kind).split(':');
    if (p[0] === 'lista') p.shift();
    var k = p.shift() || '';
    a.partes = p.concat(a.partes).filter(function (x) { return x !== '' && x != null; });
    if (a.prioridad == null && a.op) a.prioridad = a.op;
    if (a.fuente == null && a.of) a.fuente = a.of;
    if (a.sindetalle == null && a.od) a.sindetalle = a.od;
    if (a.q == null && a.oq) a.q = a.oq;
    if (a.g == null && a.og) a.g = a.og;
    return { kind: k, a: a };
  }
  /* listas(kind, args, casas, prev): kind = 'obras' o 'obras:alta' (también 'lista:obras:alta'); args = {partes, vm, q, s, g, t,
     prioridad|op, fuente|of, sindetalle|od} o un array / texto de partes; casas = filas casa de la temporada; prev = las de la
     temporada anterior o null si no se ha leído. Devuelve la lista con: total (filas antes de buscar), casas (casas distintas),
     grupos (si g), nota y enBorradores (obras). */
  function listas(kind, args, casas, prev) {
    var n = normArgs(kind, args), a = n.a, p = a.partes, t = parseInt(a.t, 10) || null;
    var cs = (casas || []).filter(function (c) { return !a.vm || c.vmId === a.vm; });
    var x;
    switch (n.kind) {
      case 'estado': x = estado(cs, p[0]); break;
      case 'condicion': x = condicion(cs); break;
      case 'provisionales': x = provisionales(cs); break;
      case 'alertas': x = alertas(cs, p[0]); break;
      case 'obras': x = obras(cs, { prioridad: p[0] || a.prioridad, fuente: a.fuente, sindetalle: a.sindetalle }); break;
      case 'review': x = review(cs); break;
      case 'comentarios': x = comentarios(cs, p[0], false); break;
      case 'atencion': x = atencion(cs); break;
      case 'malosinact': x = malosinact(cs); break;
      case 'repetido': x = repetido(cs, prev || null, t); break;
      case 'comparacion': x = comparacion(cs, prev || null, t); break;
      case 'marcas': x = marcas(cs, p[0]); break;
      case 'mapa': x = mapa(cs, p[0], p[1]); break;
      case 'elemento': x = elemento(cs, p[0]); break;
      case 'coste': x = coste(); break;
      default: x = L('Lista desconocida', 'casas', BASE.slice(), [], 'Este enlace no corresponde a ninguna lista.');
    }
    x.kind = n.kind;
    x.total = x.filas.length;
    var f = ordenar(buscar(x.filas, x.columnas, a.q), x.columnas, a.s);
    if (a.g && a.g !== '0') { var g = agrupar(f); f = g.filas; x.grupos = g.grupos; }
    x.filas = f;
    x.casas = new Set(f.map(function (r) { return String(r.villaid); })).size;
    if (!f.length && x.total) x.vacio = 'La búsqueda no encuentra ninguna fila. Borra el texto para ver las ' + x.total + ' filas.';
    return x;
  }
  /* "<qué> · N filas · temporada 2026 · VM: Kike" */
  function lineaTitulo(lista, t, vm) {
    var n = (lista && lista.filas || []).length;
    return (lista && lista.titulo || '') + ' · ' + plural(n, 'fila', 'filas') + ' · temporada ' + t + ' · VM: ' + (tr(vm) || 'todos');
  }

  /* ───────── CSV (Excel en español: BOM UTF-8 y ';', como la v2; un número va con coma decimal y sin apóstrofo) ───────── */
  function csvCell(v) {
    var s = String(v == null ? '' : v);
    if (/^[=@\t\r]/.test(s) || /^[+\-](?![\d\s().\-]+$)/.test(s)) s = "'" + s;
    return /[;"\r\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  }
  function csvValor(v) {
    if (v == null) return '';
    if (typeof v === 'number') return String(v).replace('.', ',');
    if (typeof v === 'boolean') return v ? 'sí' : '';
    return valorTexto(v);
  }
  function csv(lista) {
    var cols = (lista && lista.columnas) || [];
    var lines = [cols.map(function (c) { return csvCell(c.label); }).join(';')];
    ((lista && lista.filas) || []).forEach(function (f) { lines.push(cols.map(function (c) { var v = f[c.clave]; return typeof v === 'number' ? csvValor(v) : csvCell(csvValor(v)); }).join(';')); });
    return '﻿' + lines.join('\r\n') + '\r\n';
  }

  var Listas = {
    KINDS: KINDS, COL: COL, OBRA_COLS: OBRA_COLS,
    listas: listas, csv: csv, csvCell: csvCell, ordenar: ordenar, buscar: buscar, lineaTitulo: lineaTitulo,
    obras: function (casas, f) { return obras(casas || [], f || {}); },
    atencion: function (casas) { return atencion(casas || []); },
    malosinact: function (casas) { return malosinact(casas || []); },
    repetido: function (casas, prev, t) { return repetido(casas || [], prev || null, t || null); },
    comparacion: function (casas, prev, t) { return comparacion(casas || [], prev || null, t || null); },
    marcas: function (casas, m) { return marcas(casas || [], m); },
    mapa: function (casas, clave, m) { return mapa(casas || [], clave, m); },
    elemento: function (casas, clave) { return elemento(casas || [], clave); },
    review: function (casas) { return review(casas || []); },
    marcasDe: marcasDe, fotosDe: fotosDe, fuenteTexto: fuenteTexto, prioridadClave: prioridadClave, fechaVer: fechaVer, bandaDe: bandaDe
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = Listas;
  else root.Listas = Listas;
})(this);
