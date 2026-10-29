/* informe-temporada-historial.js — Historial: el historial de envíos del informe de temporada (formulario v5).
   Job informe-form-v5-v3b, lane B, 29/10/2026 (paquete JOB2, slice E punto 6; dashboard-v3-CONSENSUS punto 17).
   Columnas de Caspio (CASPIO-COLUMNS.md, TaInformeTemporada): enviado_at (DATE/TIME), enviado_por (texto 255),
   revision (entero; vacío = 0), historial (texto 64000; una línea por envío o reapertura).
   Líneas: "<dd/mm/aaaa hh:mm> enviado por <nombre> (rev N)" y "<dd/mm/aaaa hh:mm> reabierto por <nombre> (rev N)".
   Reglas: el historial se escribe solo DESPUÉS de que el PUT del formulario (Enviar o Reabrir) devuelve OK; antes se
   vuelve a leer la cabecera; un reintento con la misma revisión no escribe dos veces ("(rev N)" del mismo tipo);
   Enviar sube revision en 1, Reabrir no la cambia; los informes enviados antes de la v5 tienen el historial vacío y
   se ven con el aviso "Historial no disponible antes de la v5" y sus fechas guardadas con su significado real.
   Funciones puras + dos funciones de cableado (registrarEnvio, registrarReapertura) que reciben las funciones del
   formulario (informeRequest, leer, enviar, ahoraCaspio): el integrador las llama desde enviarInforme y reabrirInforme.
   window.Historial en el navegador, module.exports con node. Sin módulos, sin red propia, sin Caspio directo. */
(function (raiz) {
  'use strict';

  var MAX = 64000;   /* tamaño de la columna historial en Caspio */
  var VERBO = { envio: 'enviado', reapertura: 'reabierto' };

  function txt(v) { return v == null ? '' : String(v); }
  function dos(n) { return (n < 10 ? '0' : '') + n; }
  function entero(v) { var n = parseInt(v, 10); return isNaN(n) || n < 0 ? 0 : n; }
  function esc(s) { return txt(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }

  /* Fecha guardada -> "dd/mm/aaaa hh:mm" (o "dd/mm/aaaa" si no trae hora); un Date en hora local; otra cosa = "" */
  function fechaVer(v) {
    if (v instanceof Date) return isNaN(v.getTime()) ? '' : dos(v.getDate()) + '/' + dos(v.getMonth() + 1) + '/' + v.getFullYear() + ' ' + dos(v.getHours()) + ':' + dos(v.getMinutes());
    var m = txt(v).trim().match(/^(\d{4})-(\d\d)-(\d\d)(?:[T ](\d\d):(\d\d))?/);
    if (!m) return '';
    return m[3] + '/' + m[2] + '/' + m[1] + (m[4] ? ' ' + m[4] + ':' + m[5] : '');
  }
  /* Solo el día (fecha_revision es un día que elige el villa manager, no una hora) */
  function diaVer(v) { return fechaVer(v).slice(0, 10); }

  /* Hora local con el formato de ahoraCaspio() del formulario (si el formulario no pasa la suya) */
  function ahoraLocal() {
    var d = new Date();
    return d.getFullYear() + '-' + dos(d.getMonth() + 1) + '-' + dos(d.getDate()) + 'T' + dos(d.getHours()) + ':' + dos(d.getMinutes()) + ':' + dos(d.getSeconds());
  }

  function nombreLimpio(nombre) { var n = txt(nombre).replace(/\s+/g, ' ').trim(); return n || 'usuario desconocido'; }
  function linea(tipo, nombre, rev, fecha) { return fechaVer(fecha) + ' ' + VERBO[tipo] + ' por ' + nombreLimpio(nombre) + ' (rev ' + entero(rev) + ')'; }
  function lineaEnvio(nombre, rev, fecha) { return linea('envio', nombre, rev, fecha); }
  function lineaReapertura(nombre, rev, fecha) { return linea('reapertura', nombre, rev, fecha); }

  /* Nombre de quien envía: Name del usuario (TaUsers), si no su UserID, si no el email de la sesión */
  function nombreDe(me, email) {
    var n = me ? txt(me.Name).trim() || txt(me.UserID).trim() : '';
    return n || txt(email).trim();
  }

  function lineas(historial) { return txt(historial).split(/\r?\n/).filter(function (l) { return l.trim() !== ''; }); }
  /* Tipo y rev de una línea del historial: {tipo: 'envio'|'reapertura', rev} o null */
  function leerLinea(l) {
    var m = / (enviado|reabierto) por .* \(rev (\d+)\)\s*$/.exec(l);
    return m ? { tipo: m[1] === 'enviado' ? 'envio' : 'reapertura', rev: +m[2] } : null;
  }
  function contiene(historial, rev, tipo) {
    var r = entero(rev);
    return lineas(historial).some(function (l) { var x = leerLinea(l); return !!x && x.tipo === tipo && x.rev === r; });
  }

  /* Añade una línea al historial; si ya hay una línea del mismo tipo con "(rev N)", lo devuelve igual (reintento).
     Cabe siempre en la columna: si pasa de 64000 caracteres se quitan las líneas más antiguas. */
  function append(historial, lineaNueva, rev, tipo) {
    if (!VERBO[tipo]) throw new Error('Historial.append: tipo "' + tipo + '" no es envio ni reapertura');
    var x = leerLinea(txt(lineaNueva));
    if (!x || x.tipo !== tipo || x.rev !== entero(rev)) throw new Error('Historial.append: la línea no es de tipo ' + tipo + ' con (rev ' + entero(rev) + ')');
    var ls = lineas(historial);
    if (contiene(historial, rev, tipo)) return txt(historial);   /* reintento: sin cambios */
    ls.push(txt(lineaNueva).trim());
    var out = ls.join('\n');
    while (out.length > MAX && ls.length > 1) { ls.shift(); out = ls.join('\n'); }
    return out;
  }

  /* HTML del bloque "Historial de envíos" del formulario. Con historial: una entrada por línea y la revisión actual.
     Sin historial: enviado = "Historial no disponible antes de la v5"; borrador o nuevo = "Sin envíos registrados".
     Las fechas guardadas con su significado real: fecha_revision = el día de la revisión que pone el villa manager,
     updated_at = el último guardado, enviado_at = el envío guardado (si existe). Nunca se deduce una fecha de otra. */
  function mostrar(historial, informe) {
    var ls = lineas(historial), inf = informe || null, h = '<div class="historial"><h4>Historial de envíos</h4>';
    if (ls.length) {
      h += '<ol>' + ls.map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ol>';
      if (inf && entero(inf.revision) > 0) h += '<p class="hist-rev">Revisión actual: ' + entero(inf.revision) + '</p>';
      return h + '</div>';
    }
    var enviado = !!inf && txt(inf.estado).trim().toLowerCase() === 'enviado';
    h += '<p class="hist-aviso">' + (enviado ? 'Historial no disponible antes de la v5' : 'Sin envíos registrados (el historial empieza con la v5)') + '</p>';
    if (inf && inf.informe_id) {
      var f = [];
      f.push('Fecha de revisión (la que puso el villa manager): ' + (diaVer(inf.fecha_revision) || '—'));
      f.push('Último guardado: ' + (fechaVer(inf.updated_at) || '—'));
      if (fechaVer(inf.enviado_at)) f.push('Envío guardado: ' + fechaVer(inf.enviado_at));
      h += '<p class="hist-fechas">' + f.map(esc).join(' · ') + '</p>';
    }
    return h + '</div>';
  }

  /* ── Cableado (lo llama el formulario después de que su PUT de Enviar o Reabrir devuelve OK) ──
     dep = {informeRequest(inf, cambios), leer(tabla, where, limit), enviar(req), ahora()} del formulario.
     Devuelve {escrito, rev, cambios}: cambios = los valores de la cabecera tras la llamada (para copiarlos en INFORME).
     Un fallo de lectura o de escritura llega como error (el formulario lo enseña en su aviso). */
  function comprobar(informe, dep) {
    if (!informe || !informe.informe_id) return Promise.reject(new Error('Historial: el informe no tiene informe_id'));
    if (!dep || typeof dep.informeRequest !== 'function' || typeof dep.leer !== 'function' || typeof dep.enviar !== 'function')
      return Promise.reject(new Error('Historial: faltan las funciones del formulario (informeRequest, leer, enviar)'));
    return null;
  }
  function leerCabecera(informe, dep) {
    var id = parseInt(informe.informe_id, 10);
    return Promise.resolve(dep.leer('TaInformeTemporada', 'informe_id=' + id, 1)).then(function (rows) {
      var f = (rows || []).filter(function (r) { return r && parseInt(r.informe_id, 10) === id; })[0];
      if (!f) throw new Error('Historial: la cabecera del informe ' + id + ' no aparece al leerla');
      return f;
    });
  }
  function ahoraDe(dep) { return typeof dep.ahora === 'function' ? dep.ahora() : ahoraLocal(); }

  function registrarEnvio(informe, nombre, dep) {
    var mal = comprobar(informe, dep); if (mal) return mal;
    return leerCabecera(informe, dep).then(function (f) {
      var prev = entero(f.revision), hist = txt(f.historial), ls = lineas(hist), ult = ls.length ? leerLinea(ls[ls.length - 1]) : null;
      /* reintento: la última línea ya es el envío de la revisión guardada (entre dos envíos siempre hay una reapertura) */
      if (prev > 0 && ult && ult.tipo === 'envio' && ult.rev === prev)
        return { escrito: false, rev: prev, cambios: { enviado_at: f.enviado_at == null ? null : f.enviado_at, enviado_por: txt(f.enviado_por), revision: prev, historial: hist } };
      var rev = prev + 1, ahora = ahoraDe(dep), quien = nombreLimpio(nombre);
      var cambios = { enviado_at: ahora, enviado_por: quien, revision: rev, historial: append(hist, lineaEnvio(quien, rev, ahora), rev, 'envio') };
      return Promise.resolve(dep.enviar(dep.informeRequest(informe, cambios))).then(function () { return { escrito: true, rev: rev, cambios: cambios }; });
    });
  }

  function registrarReapertura(informe, nombre, dep) {
    var mal = comprobar(informe, dep); if (mal) return mal;
    return leerCabecera(informe, dep).then(function (f) {
      var rev = entero(f.revision), hist = txt(f.historial);
      if (contiene(hist, rev, 'reapertura')) return { escrito: false, rev: rev, cambios: { historial: hist } };
      var cambios = { historial: append(hist, lineaReapertura(nombre, rev, ahoraDe(dep)), rev, 'reapertura') };
      return Promise.resolve(dep.enviar(dep.informeRequest(informe, cambios))).then(function () { return { escrito: true, rev: rev, cambios: cambios }; });
    });
  }

  var Historial = {
    fechaVer: fechaVer, lineaEnvio: lineaEnvio, lineaReapertura: lineaReapertura, nombreDe: nombreDe,
    contiene: contiene, append: append, mostrar: mostrar, registrarEnvio: registrarEnvio, registrarReapertura: registrarReapertura
  };
  if (typeof module === 'object' && module && module.exports) module.exports = Historial;
  if (raiz) raiz.Historial = Historial;
})(typeof window !== 'undefined' ? window : this);
