/* informe-temporada-puntuacion.js — Puntuacion: la condición provisional que ve el villa manager en el formulario v5
   y la caja "¿Cómo se calcula?". Job informe-form-v5-v3b, lane B, 29/10/2026 (paquete JOB2, slice E punto 5;
   fórmula y casos: astra-scoring-round2-consensus-2026-10-29.md).
   La cifra sale de InformeScore.condicion (informe-temporada-score.js, compartido con el cuadro) sobre las filas del
   formulario (LINEAS: 'seccion|clave' -> fila). Línea gris bajo la cabecera, para todos los roles; nunca bloquea Enviar.
   Usa InformeScore del navegador (la página carga informe-temporada-score.js antes) o el que pase
   Puntuacion.usar({InformeScore}) (pruebas con node), como las lanes del cuadro v3. window.Puntuacion / module.exports.
   Sin módulos, sin red, sin Caspio. */
(function (raiz) {
  'use strict';

  var DEP = {};
  function usar(d) { Object.keys(d || {}).forEach(function (k) { DEP[k] = d[k]; }); return Puntuacion; }
  function sc() {
    var s = DEP.InformeScore || (raiz && raiz.InformeScore) || null;
    if (!s) throw new Error('Puntuacion: falta InformeScore (informe-temporada-score.js)');
    return s;
  }

  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;'); }
  function fmt1(n) { return n == null ? '—' : Number(n).toFixed(1).replace('.', ','); }

  /* Filas del formulario: el objeto LINEAS ('seccion|clave' -> fila) o una lista de filas */
  function lineasDe(L) {
    if (!L) return [];
    var a = Array.isArray(L) ? L : Object.keys(L).map(function (k) { return L[k]; });
    return a.filter(function (l) { return l && typeof l === 'object'; });
  }

  function condicion(L) { return sc().condicion(lineasDe(L)); }

  /* "Condición provisional: 84,6 · 19 de 26 evaluados" (incompleto), "Condición: 100,0 · 19 de 19 evaluados · 7 N/A" (completo) */
  function textoDe(c) {
    if (c.error) return 'Condición: no se puede calcular (un elemento con N/A y marca a la vez, o una marca no válida)';
    if (c.aplicables <= 0) return 'Condición: sin puntuación · los 26 elementos están en N/A';
    return (c.completo ? 'Condición: ' : 'Condición provisional: ') + fmt1(c.puntuacion) + ' · ' + c.evaluados + ' de ' + c.aplicables + ' evaluados'
      + (c.na ? ' · ' + c.na + ' N/A' : '');
  }
  function texto(L) { return textoDe(condicion(L)); }

  /* La línea gris con el botón que abre la caja (id comoSeCalcula); el formulario la repinta en cada cambio */
  function lineaHtml(L) {
    var c = condicion(L);
    return '<p class="cond-prov" data-banda="' + esc(c.banda) + '" aria-live="polite"><span class="cond-prov-t">' + esc(textoDe(c)) + '</span> '
      + '<button type="button" class="como-calc" data-accion="como-se-calcula" aria-expanded="false" aria-controls="comoSeCalcula">¿Cómo se calcula?</button></p>';
  }

  /* El texto de la caja, en español sencillo: la fórmula en palabras, un ejemplo, N/A, sin marcar, bandas, lo que no puntúa */
  function ayudaLineas() {
    var seg = 'instalación eléctrica, cerraduras, fontanería, barandillas, pavimentos o piscina';
    return [
      'Los 26 elementos valen lo mismo: Bueno = 2 puntos, Regular = 1 punto, Malo = 0 puntos.',
      'La condición es: puntos conseguidos entre puntos posibles de los elementos evaluados, por 100, con un decimal.',
      'Ejemplo: 13 Bueno y 13 Regular = 75,0.',
      'N/A (el elemento no existe en la casa, con su motivo) no cuenta: ni suma ni resta, y baja el total a evaluar.',
      'Los elementos sin marcar no cuentan en la cifra, pero la dejan provisional: es final cuando están todos los que aplican.',
      'Colores: verde desde 80; ámbar de 50 a 79,9; rojo por debajo de 50; gris si no hay ningún elemento evaluado.',
      'El estado general, los costes, los comentarios y las fotos no puntúan.',
      'Un Malo en ' + seg + ', o un peligro, se avisa a dirección aparte.',
      'Esta cifra es orientativa y no impide enviar el informe.'
    ];
  }
  function ayudaHtml() {
    return '<div class="como-calc-caja" id="comoSeCalcula" role="note" hidden><h4>¿Cómo se calcula?</h4><ul>'
      + ayudaLineas().map(function (l) { return '<li>' + esc(l) + '</li>'; }).join('') + '</ul></div>';
  }

  var Puntuacion = { usar: usar, lineasDe: lineasDe, condicion: condicion, texto: texto, lineaHtml: lineaHtml, ayudaLineas: ayudaLineas, ayudaHtml: ayudaHtml };
  if (typeof module === 'object' && module && module.exports) module.exports = Puntuacion;
  if (raiz) raiz.Puntuacion = Puntuacion;
})(typeof window !== 'undefined' ? window : this);
