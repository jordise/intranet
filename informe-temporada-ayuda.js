/* Ejemplos de Bueno / Regular / Malo de cada elemento del informe de temporada (formulario v5, 29/10/2026).
   El "?" de la etiqueta de cada fila de estado abre una línea por marca con un ejemplo concreto, en palabras del villa manager.
   Las 26 claves = InformeScore.elementosDef() de informe-temporada-score.js (mismo orden); una línea de 120 caracteres o menos.
   Sin red ni pantalla: window.Ayuda en el navegador, module.exports con node (node informe-temporada-ayuda.test.js).
   Ayuda.ejemplos[clave] = {bueno, regular, malo}; Ayuda.lineas(clave) = [{marca, texto}]; Ayuda.html(clave) = la caja "?"
   (un <details> que se abre sin JavaScript; "" si la clave no existe). Solo ayuda: no guarda nada ni puntúa. */
(function (raiz) {
  'use strict';

  function e(bueno, regular, malo) { return Object.freeze({ bueno: bueno, regular: regular, malo: malo }); }

  var EJEMPLOS = Object.freeze({
    /* Interior */
    pintura: e('Paredes y techos limpios, color uniforme; puertas y marcos sin golpes',
      'Marcas, roces o pequeños desconchones; retocar con pintura antes de la temporada',
      'Manchas de humedad o moho, pintura levantada o grietas: pintar la estancia entera'),
    colchones: e('Firmes, sin manchas, funda limpia; almohadas con forma y sin olor',
      'Hundido en el centro o manchas que salen con lavado; almohadas aplastadas',
      'Muelles marcados, manchas fijas, mal olor o roto: cambiar colchón o almohada'),
    sofas: e('Tapicería limpia y entera, cojines con forma, alfombras sin manchas',
      'Manchas que salen al limpiar, cojines hundidos o alfombra gastada en el paso',
      'Roto, quemado, manchas fijas o estructura floja: tapizar o cambiar'),
    mobiliario_cocina: e('Puertas y cajones cierran bien, bisagras firmes, encimera sin daños',
      'Bisagra floja, cajón que roza o canto despegado; se arregla con un ajuste',
      'Módulo hinchado por el agua, puerta caída o encimera rota: reparar o cambiar'),
    menaje: e('Completo para el número de huéspedes; sartenes y ollas sin rayar ni abollar',
      'Faltan algunas piezas o hay sartenes rayadas; reponer antes de la próxima temporada',
      'Faltan muchas piezas, vajilla desportillada o sartenes peladas: reponer ya'),
    electrodomesticos: e('Todos funcionan: la nevera enfría, el horno calienta, lavadora y lavavajillas sin fugas',
      'Funcionan con fallos: ruido, junta gastada o un fuego que no va bien',
      'No funciona, pierde agua o hace saltar el diferencial: reparar o cambiar ya'),
    aire_acondicionado: e('Enfrían y calientan bien, filtros limpios, mandos completos y con pilas',
      'Enfría poco, hace ruido, gotea un poco o falta un mando',
      'No enfría, no arranca o cae agua por la pared: avisar al técnico'),
    puertas: e('Abre y cierra suave, la llave cierra a la primera, no entra agua ni aire',
      'Roza o hay que empujar para cerrar; burlete gastado, entra algo de aire',
      'No cierra bien, entra agua con la lluvia o la madera está podrida: reparar ya'),
    ventanas: e('Abren y cierran bien, manecillas firmes, contraventanas bien sujetas',
      'Manecilla floja, ventana que roza o contraventana que cuesta mover',
      'No cierra, cristal roto o contraventana suelta que puede caer: reparar ya'),
    banos: e('Grifos sin goteo, buena presión, la mampara cierra y las juntas están limpias',
      'Grifo que gotea, cal en la ducha o juntas negras que salen al limpiar',
      'Fuga, mampara rota o suelta, moho fijo en las juntas: reparar o cambiar'),
    desagues: e('El agua se va rápido en lavabos, ducha y fregadero; sin olores',
      'Se va despacio o huele a veces; limpiar el sifón o usar desatascador',
      'Atascado, el agua sube o hay mal olor fuerte y constante: llamar al fontanero'),
    iluminacion: e('Todas las luces encienden, bombillas del mismo tono, interruptores bien',
      'Alguna bombilla fundida o lámpara floja; cambiar en la próxima visita',
      'Interruptor o enchufe roto, cables a la vista o chispas: avisar al electricista'),
    humedades: e('Sin manchas ni olor a humedad; ventanas y extractores ventilan bien',
      'Pequeña mancha en una esquina u olor a cerrado que se va al ventilar',
      'Moho extendido, pared mojada o pintura hinchada: buscar la causa y tratar'),
    /* Exterior */
    fachada: e('Pintura entera y limpia, sin grietas ni manchas',
      'Pintura descolorida o grietas finas; retocar',
      'Grietas abiertas, trozos que caen o humedad que pasa dentro: obra'),
    carpinteria_exterior: e('Madera barnizada o PVC limpio; puertas y porticones cierran bien',
      'Barniz gastado o madera seca; lijar y barnizar antes de la temporada',
      'Madera podrida, hinchada o rota, o no cierra: reparar o cambiar'),
    pavimentos: e('Suelo plano, baldosas firmes, escalones enteros y que no resbalan',
      'Baldosa suelta o rota sin peligro, junta abierta o mancha que no sale',
      'Escalón roto, baldosa levantada o suelo que resbala: peligro de caída, arreglar ya'),
    barandillas: e('Firmes al empujar, bien sujetas, sin óxido ni huecos',
      'Algo de óxido o pintura gastada; tornillos que hay que apretar',
      'Se mueve al empujar, anclaje suelto o hueco por donde cabe un niño: arreglar ya'),
    jardin_muros: e('Jardín cuidado, muros y vallas enteros, la puerta del jardín cierra',
      'Plantas secas, piedra suelta en el muro o valla doblada',
      'Muro que se cae, valla rota o puerta del jardín que no cierra: reparar'),
    piscina: e('Agua clara, gresite entero, depuradora y skimmer funcionan, la ducha va bien',
      'Agua turbia a veces, gresites sueltos, filtro sucio o ducha que gotea',
      'Agua verde, pierde agua, depuradora parada o gresite que corta: avisar ya'),
    mobiliario_exterior: e('Mesas, sillas y tumbonas completas, firmes y limpias; cojines en buen estado',
      'Tumbona floja, cojines descoloridos o falta alguna silla',
      'Muebles rotos, oxidados o que ceden al sentarse: retirar y cambiar'),
    barbacoa: e('Limpia, parrilla entera, enciende bien; sin fugas si es de gas',
      'Parrilla oxidada o sucia, ladrillo suelto; limpiar o cambiar la parrilla',
      'Rota, huele a gas o no es segura de usar: no usar y avisar'),
    iluminacion_exterior: e('Encienden todas las luces del jardín, la piscina y la entrada',
      'Algún punto de luz fundido o foco mal orientado',
      'Escaleras o caminos a oscuras, o cables sueltos: arreglar ya'),
    /* Seguridad */
    cerraduras: e('Todas las llaves abren a la primera; caja de llaves y portal funcionan',
      'Cerradura dura, hay que forzar la llave o falta una copia',
      'No cierra o no abre, o la llave se queda dentro: cambiar el bombín ya'),
    instalacion_electrica: e('Cuadro rotulado; el diferencial salta con el botón de prueba y no salta solo',
      'Salta a veces con muchos aparatos o el cuadro no está rotulado',
      'Salta seguido, enchufes quemados, cables a la vista u olor a quemado: electricista ya'),
    fontaneria_agua_caliente: e('Sin fugas, el termo da agua caliente, las llaves de paso abren y cierran',
      'El agua caliente tarda o se acaba pronto, o la llave de paso está dura',
      'Fuga, termo que pierde, sin agua caliente o contador que gira con todo cerrado: fontanero ya'),
    wifi_tv: e('El wifi llega a todas las habitaciones; la TV tiene canales y mando',
      'Wifi lento en alguna zona, falta un canal o el mando falla',
      'Sin wifi o sin TV: llamar al proveedor antes de la próxima entrada')
  });

  var MARCAS = [['bueno', 'Bueno'], ['regular', 'Regular'], ['malo', 'Malo']];

  function esc(s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); }
  function tiene(clave) { return typeof clave === 'string' && Object.prototype.hasOwnProperty.call(EJEMPLOS, clave); }

  function claves() { return Object.keys(EJEMPLOS); }

  /* [{marca: 'Bueno'|'Regular'|'Malo', texto}] en ese orden; [] si la clave no es uno de los 26 elementos */
  function lineas(clave) {
    if (!tiene(clave)) return [];
    return MARCAS.map(function (m) { return { marca: m[1], texto: EJEMPLOS[clave][m[0]] }; });
  }

  /* La caja "?": <details class="ayuda" data-clave> con <summary class="ayuda-q">?</summary> y una lista de tres líneas
     (clases ayuda-box, ayuda-bueno, ayuda-regular, ayuda-malo; el estilo lo pone el formulario). "" si la clave no existe */
  function html(clave) {
    if (!tiene(clave)) return '';
    return '<details class="ayuda" data-clave="' + esc(clave) + '">'
      + '<summary class="ayuda-q" title="Ejemplos de Bueno, Regular y Malo" aria-label="Ejemplos de Bueno, Regular y Malo">?</summary>'
      + '<ul class="ayuda-box">' + MARCAS.map(function (m) {
        return '<li class="ayuda-' + m[0] + '"><b>' + m[1] + ':</b> ' + esc(EJEMPLOS[clave][m[0]]) + '</li>';
      }).join('') + '</ul></details>';
  }

  var Ayuda = { ejemplos: EJEMPLOS, claves: claves, lineas: lineas, html: html };
  if (typeof module === 'object' && module && module.exports) module.exports = Ayuda;
  if (raiz) raiz.Ayuda = Ayuda;
})(typeof window !== 'undefined' ? window : this);
