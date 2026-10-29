/* Puntuación de condición del informe de temporada (Consenso v2 de bro y Astra, 29/10/2026; cuadro v3a).
   Un solo script compartido: lo cargan el cuadro de informes de temporada (y más tarde el formulario v5).
   Funciones puras, sin red ni pantalla: window.InformeScore en el navegador, module.exports con node
   (las pruebas: node informe-temporada-score.test.js).
   Condición = 100 × (2×Bueno + Regular) / (2 × evaluados), redondeada a un decimal hacia arriba en el medio;
   0 evaluados = null (nunca 0); completo = evaluados = aplicables (26 menos N/A); bandas rojo < 50, ámbar < 80,
   verde ≥ 80, gris sin dato. Coste, comentarios, fotos y estado general no puntúan. */
(function (raiz) {
  'use strict';

  /* Los 26 elementos comprobados: secciones 'estado' de seccionesDef() de informe-temporada.html v4 (mismas claves, palabras y orden; copia de elementosDef() del cuadro v2) */
  function elementosDef() {
    function s(seccion, claves) { return claves.map(function (c) { return { seccion: seccion, clave: c[0], label: c[1] }; }); }
    return [].concat(
      s('interior', [
        ['pintura', 'Pintura interior (paredes, techos, carpintería)'], ['colchones', 'Colchones y almohadas'], ['sofas', 'Sofás, tapicerías y alfombras'],
        ['mobiliario_cocina', 'Mobiliario y módulos de cocina'], ['menaje', 'Menaje de cocina'], ['electrodomesticos', 'Electrodomésticos'],
        ['aire_acondicionado', 'Aire acondicionado/ventiladores (equipos y mandos)'], ['puertas', 'Puertas de entrada (cierre y entrada de agua)'],
        ['ventanas', 'Ventanas y contraventanas (manecillas, mecanismos)'], ['banos', 'Baños: grifería, duchas y mamparas'],
        ['desagues', 'Desagües (atascos y olores)'], ['iluminacion', 'Iluminación interior'], ['humedades', 'Humedades y ventilación']]),
      s('exterior', [
        ['fachada', 'Fachada y pintura exterior'], ['carpinteria_exterior', 'Carpintería exterior (madera / PVC)'], ['pavimentos', 'Pavimentos, escalones y rampas'],
        ['barandillas', 'Barreras y barandillas'], ['jardin_muros', 'Jardín, muros y vallas'],
        ['piscina', 'Piscina (vaso, gresites, filtro / skimmer, ducha, depuradora, etc)'], ['mobiliario_exterior', 'Mobiliario exterior'],
        ['barbacoa', 'Barbacoa'], ['iluminacion_exterior', 'Iluminación exterior']]),
      s('seguridad', [
        ['cerraduras', 'Cerraduras y accesos'], ['instalacion_electrica', 'Instalación eléctrica (cuadro, diferencial, potencia)'],
        ['fontaneria_agua_caliente', 'Fontanería y agua caliente (fugas, termo, llaves de paso, contador)'], ['wifi_tv', 'Wifi y TV']]));
  }

  /* Malo en uno de estos seis = revisión urgente de seguridad (se ve siempre, con cualquier puntuación o completitud) */
  function elementosSeguridad() {
    return ['instalacion_electrica', 'cerraduras', 'fontaneria_agua_caliente', 'barandillas', 'pavimentos', 'piscina'];
  }

  /* Estancias fijas de la sección 5 del formulario (seccionesDef(), id 'estancia'); las añadidas otra_1..5 llevan "<estancia>: <incidencia>" en texto_1 */
  var ESTANCIAS = { salon: 'Salón / comedor', cocina: 'Cocina', dormitorio_principal: 'Dormitorio principal', dormitorio_2: 'Dormitorio 2',
    bano_1: 'Baño 1', bano_2: 'Baño 2', exterior_piscina: 'Exterior / zona piscina' };

  var MARCAS = { bueno: 1, regular: 1, malo: 1 };
  var RANGO = { Alta: 0, Media: 1, Baja: 2, '': 3 };
  var SECCION_ORDEN = { resumen: 0, estancia: 1 };

  function txt(v) { return v == null ? '' : String(v); }
  function lw(v) { return txt(v).trim().toLowerCase(); }
  function entero(v) { var n = parseInt(v, 10); return isNaN(n) ? 0 : n; }

  /* Un decimal, hacia arriba en el medio (96.25 -> 96.3, 6.25 -> 6.3, 0.15 -> 0.2), simétrico en negativos.
     La puntuación no pasa por aquí: puntuar() redondea con enteros, sin error de float */
  function redondear1(x) {
    if (x === null || x === undefined || x === '' || typeof x === 'boolean') return null;
    var n = Number(x);
    if (!isFinite(n)) return null;
    var s = n < 0 ? -1 : 1, r = Math.floor(Math.abs(n) * 10 + 0.5) / 10;
    return r === 0 ? 0 : s * r;
  }

  /* 100 × (2b + r) / (2a) con enteros, redondeado a un decimal hacia arriba en el medio; a = 0 -> null */
  function puntuar(b, r, a) {
    if (!a) return null;
    var num = 1000 * (2 * b + r), den = 2 * a;
    return Math.floor((2 * num + den) / (2 * den)) / 10;
  }

  function banda(p) { return p === null ? 'gris' : p < 50 ? 'rojo' : p < 80 ? 'ambar' : 'verde'; }

  /* N/A: el campo na de la línea (llega con el formulario v5); verdadero = true, 1, '1', 'true', 'sí', 'si', 'yes' */
  function esNa(l) {
    var v = l && l.na;
    if (v === true || v === 1) return true;
    return typeof v === 'string' && /^(1|true|s[ií]|yes)$/.test(v.trim().toLowerCase());
  }

  var MAPA_EL = null;
  function claveElemento(l) {
    if (!MAPA_EL) { MAPA_EL = {}; elementosDef().forEach(function (e) { MAPA_EL[e.seccion + '|' + e.clave] = e.clave; }); }
    return l ? (MAPA_EL[l.seccion + '|' + l.clave] || null) : null;
  }

  /* Lectura de las líneas de UN informe: marca por clave ('bueno'|'regular'|'malo'|'' ), N/A por clave, y error 'datos'
     si una clave de los 26 tiene dos líneas, una marca no es Bueno/Regular/Malo o una línea es N/A y tiene marca */
  function leerElementos(lineas) {
    var marca = {}, na = {}, visto = {}, linea = {}, ultima = {}, error = null;
    (lineas || []).forEach(function (l) {
      var k = claveElemento(l);
      if (!k) return;
      if (visto[k]) error = 'datos';
      visto[k] = 1; ultima[k] = l;
      var m = lw(l.estado);
      if (m && !MARCAS[m]) { error = 'datos'; return; }
      if (esNa(l)) { if (m) error = 'datos'; else { na[k] = 1; linea[k] = l; } return; }
      if (m) { marca[k] = m; linea[k] = l; }
    });
    return { marca: marca, na: na, error: error, linea: linea, ultima: ultima };
  }

  /* Lector compartido de los 26 (cuadro: mapa, listas y casa; la misma regla que la puntuación): por clave {marca: 'bueno'|'regular'|'malo'|'na'|'',
     linea: la línea que da la marca, o la última de la clave, o null}; fila repetida = gana la última en orden y error 'datos' */
  function marcas(lineas) {
    var e = leerElementos(lineas), out = {};
    elementosDef().forEach(function (d) {
      var k = d.clave;
      out[k] = { marca: e.na[k] ? 'na' : (e.marca[k] || ''), linea: e.linea[k] || e.ultima[k] || null };
    });
    return { porClave: out, error: e.error };
  }

  /* Comentario de huésped con algún texto (texto_1, o solo "Detalle / mejora" en texto_2): la misma regla en el cuadro, las listas y la casa */
  function esComentario(l) { return !!l && l.seccion === 'huesped' && !!(txt(l.texto_1).trim() || txt(l.texto_2).trim()); }

  /* Condición de un informe (sus líneas): {bueno, regular, malo, evaluados, aplicables, na, puntuacion, completo, banda, error} */
  function condicion(lineas) {
    var e = leerElementos(lineas), n = { bueno: 0, regular: 0, malo: 0 }, nNa = 0;
    elementosDef().forEach(function (d) {
      if (e.na[d.clave]) nNa++;
      else if (e.marca[d.clave]) n[e.marca[d.clave]]++;
    });
    var evaluados = n.bueno + n.regular + n.malo, aplicables = 26 - nNa;
    var p = e.error ? null : puntuar(n.bueno, n.regular, evaluados);
    return { bueno: n.bueno, regular: n.regular, malo: n.malo, evaluados: evaluados, aplicables: aplicables, na: nNa, puntuacion: p,
      completo: !e.error && aplicables > 0 && evaluados === aplicables, banda: banda(p), error: e.error };
  }

  /* Banderas de un informe: peligro (null en v3a: dato del formulario v5), seguridad (claves de seguridad en Malo, en el orden de
     elementosSeguridad()) y coherencia con el estado general (Bueno con algún Malo; Malo con todo lo evaluado en Bueno) */
  function banderas(informe, lineas) {
    var malo = {}, evaluados = 0, buenos = 0;
    (lineas || []).forEach(function (l) {
      var k = claveElemento(l), m = k ? lw(l.estado) : '';
      if (m === 'malo') malo[k] = 1;
    });
    var e = leerElementos(lineas);
    Object.keys(e.marca).forEach(function (k) { evaluados++; if (e.marca[k] === 'bueno') buenos++; });
    var g = informe ? lw(informe.estado_general != null && txt(informe.estado_general).trim() !== '' ? informe.estado_general : informe.general) : '';
    var coherencia = null;
    if (g === 'bueno' && Object.keys(malo).length) coherencia = 'bueno_con_malo';
    else if (g === 'malo' && !e.error && evaluados > 0 && buenos === evaluados) coherencia = 'malo_todo_bueno';
    return { peligro: null, seguridad: elementosSeguridad().filter(function (k) { return malo[k]; }), coherencia: coherencia };
  }

  /* Palabras de prioridad al leer: Alta/Media/Baja (también Alto/Medio/Bajo guardados, como el cuadro v2); se ven Alto/Medio/Bajo; otra palabra = sin prioridad */
  function prioridadNorm(t) {
    var s = lw(t), m = { alto: 'Alta', medio: 'Media', bajo: 'Baja', alta: 'Alta', media: 'Media', baja: 'Baja' };
    return m[s] || '';
  }
  function prioridadVer(v) { var m = { Alta: 'Alto', Media: 'Medio', Baja: 'Bajo' }; return m[prioridadNorm(v)] || ''; }

  /* Texto de la actuación y motivo de una línea de resumen o de estancia ('' = no es actuación).
     Estancia (ronda de arreglos 1, decisión de bro): cuenta si tiene incidencia (texto_1), "Acción recomendada" (texto_2) o prioridad;
     el texto es la incidencia; sin incidencia, la acción recomendada; sin las dos, "Sin texto (<estancia>)"; motivo = la estancia */
  function leerAccion(l) {
    if (l.seccion === 'resumen') return { accion: txt(l.texto_1).trim(), motivo: txt(l.texto_2).trim() };
    var t = txt(l.texto_1), m = /^otra_(\d+)$/.exec(txt(l.clave)), inc = t, motivo = ESTANCIAS[l.clave] || txt(l.clave);
    if (m) {
      var p = t.indexOf(':'), nombre = p < 0 ? '' : t.slice(0, p).trim();
      inc = p < 0 ? t : t.slice(p + 1);
      motivo = nombre || 'Otra estancia ' + m[1];
    }
    var accion = inc.trim() || txt(l.texto_2).trim() || (prioridadNorm(l.prioridad) ? 'Sin texto (' + motivo + ')' : '');
    return { accion: accion, motivo: motivo };
  }

  /* Actuaciones distintas de un informe: resumen (texto_1) + estancias (leerAccion), unidas por el texto exacto (sin espacios al
     principio y al final, mayúsculas cuentan); gana la prioridad más alta; se guardan todas las fuentes; motivo = el primero
     que no esté vacío (texto_2 del resumen, o el nombre de la estancia); coste = null hasta el formulario v5.
     Orden: Alta, Media, Baja, sin prioridad; dentro, resumen antes que estancia y por orden */
  function acciones(lineas) {
    var filas = (lineas || []).filter(function (l) { return l && (l.seccion === 'resumen' || l.seccion === 'estancia'); })
      .map(function (l, i) { return { l: l, i: i }; })
      .sort(function (a, b) {
        return (SECCION_ORDEN[a.l.seccion] - SECCION_ORDEN[b.l.seccion]) || (entero(a.l.orden) - entero(b.l.orden)) || (a.i - b.i);
      });
    var porTexto = {}, out = [];
    filas.forEach(function (f) {
      var l = f.l, x = leerAccion(l);
      if (!x.accion) return;
      var pri = prioridadNorm(l.prioridad), o = Object.prototype.hasOwnProperty.call(porTexto, x.accion) ? porTexto[x.accion] : null;
      if (!o) {
        o = { accion: x.accion, prioridad: pri, motivo: x.motivo, fuentes: [], pos: out.length };
        porTexto[x.accion] = o; out.push(o);
      } else {
        if (RANGO[pri] < RANGO[o.prioridad]) o.prioridad = pri;
        if (!o.motivo && x.motivo) o.motivo = x.motivo;
      }
      o.fuentes.push({ seccion: l.seccion, clave: txt(l.clave), orden: entero(l.orden) });
    });
    out.sort(function (a, b) { return (RANGO[a.prioridad] - RANGO[b.prioridad]) || (a.pos - b.pos); });
    return out.map(function (o) {
      return { accion: o.accion, prioridad: o.prioridad, prioridadVer: prioridadVer(o.prioridad), motivo: o.motivo, fuentes: o.fuentes, coste: null };
    });
  }

  /* Dos temporadas de la misma casa (A = la anterior, B = la actual): solo las claves evaluadas en las dos.
     {n, puntuacionA, puntuacionB, cambios: [{clave, de, a}], repetidos: [clave Regular o Malo en las dos], error} */
  function comparar(lineasA, lineasB) {
    var a = leerElementos(lineasA), b = leerElementos(lineasB);
    if (a.error || b.error) return { n: 0, puntuacionA: null, puntuacionB: null, cambios: [], repetidos: [], error: 'datos' };
    var n = 0, cA = { bueno: 0, regular: 0, malo: 0 }, cB = { bueno: 0, regular: 0, malo: 0 }, cambios = [], repetidos = [];
    elementosDef().forEach(function (d) {
      var x = a.marca[d.clave], y = b.marca[d.clave];
      if (!x || !y) return;
      n++; cA[x]++; cB[y]++;
      if (x !== y) cambios.push({ clave: d.clave, de: x, a: y });
      if (x !== 'bueno' && y !== 'bueno') repetidos.push(d.clave);
    });
    return { n: n, puntuacionA: puntuar(cA.bueno, cA.regular, n), puntuacionB: puntuar(cB.bueno, cB.regular, n), cambios: cambios, repetidos: repetidos, error: null };
  }

  var InformeScore = {
    elementosDef: elementosDef, elementosSeguridad: elementosSeguridad, condicion: condicion, banderas: banderas,
    acciones: acciones, comparar: comparar, redondear1: redondear1, marcas: marcas, esNa: esNa, esComentario: esComentario
  };
  if (typeof module === 'object' && module && module.exports) module.exports = InformeScore;
  if (raiz) raiz.InformeScore = InformeScore;
})(typeof window !== 'undefined' ? window : this);
