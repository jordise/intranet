/* Datos de prueba del cuadro de informes de temporada v3 (informe-cuadro-v3a, carril D, 29/10/2026).
   Los cargan las pruebas de las listas (carril D) y de la portada (carril C) con require(), y la página con
   window.__FIXTURE__ para las capturas. Datos INVENTADOS con reglas fijas (sin azar): 24 casas, 4 villa managers
   (3 contactos y 1 usuario), 2 sin informe, 3 en borrador, casas con dos informes (regla del último enviado),
   una con el mismo texto en el resumen y en una estancia, una con Malo y ninguna actuación, temporada previa
   (2025) para la comparación y una temporada vacía (2024).
   Formas = las lecturas del Worker de la v2: villas (villaid, Name, KeyHolder_person, Status), contactos y
   usuarios ya pasados a {id, name}, informes de TaInformeTemporada y líneas de TaInformeTemporadaLineas
   (linea_id, informe_id, seccion, clave, orden, estado, texto_1, texto_2, prioridad, foto_url). */
(function (root) {
  'use strict';
  /* Las 26 claves de los elementos con su sección (las de seccionesDef() del formulario v4) */
  var CLAVES = [
    ['interior', 'pintura'], ['interior', 'colchones'], ['interior', 'sofas'], ['interior', 'mobiliario_cocina'], ['interior', 'menaje'],
    ['interior', 'electrodomesticos'], ['interior', 'aire_acondicionado'], ['interior', 'puertas'], ['interior', 'ventanas'], ['interior', 'banos'],
    ['interior', 'desagues'], ['interior', 'iluminacion'], ['interior', 'humedades'],
    ['exterior', 'fachada'], ['exterior', 'carpinteria_exterior'], ['exterior', 'pavimentos'], ['exterior', 'barandillas'], ['exterior', 'jardin_muros'],
    ['exterior', 'piscina'], ['exterior', 'mobiliario_exterior'], ['exterior', 'barbacoa'], ['exterior', 'iluminacion_exterior'],
    ['seguridad', 'cerraduras'], ['seguridad', 'instalacion_electrica'], ['seguridad', 'fontaneria_agua_caliente'], ['seguridad', 'wifi_tv']
  ];
  var SEGURIDAD = ['instalacion_electrica', 'cerraduras', 'fontaneria_agua_caliente', 'barandillas', 'pavimentos', 'piscina'];
  var NOMBRES = ['Villa Galerna', 'Casa Premia', 'Apartamento 102 Castell Sol', 'Villa Buganvilla', 'Villa Orquídea', 'Villa Atalis', 'Villa Armonia', 'Casa Es Grau',
    'Villa Binibeca Vell', 'Casa Cala Morell', 'Villa Son Bou', 'Apartamento 4B Port de Maó', 'Villa Punta Prima', 'Casa Sant Lluís', 'Villa Cala en Porter', 'Villa Ses Salines',
    'Casa Fornells Mar', 'Villa Cala Galdana', 'Apartamento 7 Cala Blanca', 'Villa Es Castell', 'Casa Alaior Vella', 'Villa Binisafúa', 'Casa Torret', 'Villa Na Macaret'];
  /* Villa managers: tres contactos (c:12, c:13, c:14) y un usuario (u:U7); la casa i va con el VM i % 4 */
  var contacts = [{ id: '12', name: 'Kike' }, { id: '13', name: 'Amanda' }, { id: '14', name: 'Carmen' }];
  var users = [{ id: 'U7', name: 'Julia' }];
  var KH = ['12', '13', '14', 'U7'];
  var pad = function (n) { return String(n).padStart(2, '0'); };
  var cap = function (s) { return s.charAt(0).toUpperCase() + s.slice(1); };

  var villas = NOMBRES.map(function (n, i) { return { villaid: 101 + i, Name: n, KeyHolder_person: KH[i % 4], Status: 1 }; });

  /* Casos especiales (villaid) para las pruebas */
  var casos = {
    sin: [110, 118],                       // sin informe en 2026
    borradores: [105, 114, 121],           // solo borrador en 2026
    duplicada: 104,                        // mismo texto en el resumen (Media) y en Baño 1 (Alta)
    malosinact: 111,                       // marcas Malo y ninguna actuación
    todoBueno: 120,                        // 26 Bueno con estado general Malo (malo_todo_bueno)
    buenoConMalo: 108,                     // estado general Bueno con algún Malo
    incompleta: 107,                       // 6 elementos sin marcar: provisional 20/26
    seguridad: [102, 106, 115],            // Malo en un elemento de seguridad
    sinDetalle: 113,                       // actuaciones sin prioridad o sin motivo
    dosEnviados: { 103: 2031, 108: 2008, 112: 2034 }, // villa -> informe que vale (último enviado)
    borradorTrasEnvio: { 116: 2016 },      // un borrador más nuevo no desplaza al enviado
    sinPrevia: [110, 118, 122],            // sin informe enviado en 2025
    previaBorrador: [109]                  // en 2025 solo un borrador
  };

  var lid = 1;
  function linea(inf, seccion, clave, orden, campos) {
    var l = { linea_id: lid++, informe_id: inf, seccion: seccion, clave: clave, orden: orden, estado: '', texto_1: '', texto_2: '', prioridad: '', foto_url: '' };
    Object.keys(campos || {}).forEach(function (k) { l[k] = campos[k]; });
    return l;
  }
  /* Marca fija de la casa i y el elemento j: 0-6 Bueno, 7-8 Regular, 9 Malo; en seguridad un Malo pasa a Regular */
  function marcaBase(i, j, desplaza) {
    var v = (i * 7 + j * 3 + (desplaza || 0)) % 10, m = v < 7 ? 'bueno' : v < 9 ? 'regular' : 'malo';
    if (m === 'malo' && SEGURIDAD.indexOf(CLAVES[j][1]) >= 0) m = 'regular';
    return m;
  }
  function marcas2026(i) {
    var m = {}, v = 101 + i;
    CLAVES.forEach(function (c, j) { m[c[1]] = marcaBase(i, j); });
    if (v === 102) m.instalacion_electrica = 'malo';
    if (v === 106) { m.instalacion_electrica = 'malo'; m.piscina = 'malo'; }
    if (v === 115) m.cerraduras = 'malo';
    if (v === 120) CLAVES.forEach(function (c) { m[c[1]] = 'bueno'; });
    if (v === 107) ['barbacoa', 'wifi_tv', 'humedades', 'fachada', 'jardin_muros', 'menaje'].forEach(function (k) { m[k] = ''; });
    if (v === 111) { m.sofas = 'malo'; m.fachada = 'malo'; }
    if (v === 108) m.colchones = 'malo';
    return m;
  }
  function marcas2025(i) {
    var m = {}, v = 101 + i;
    CLAVES.forEach(function (c, j) { m[c[1]] = marcaBase(i, j, j % 5 === 0 ? 1 : 0); });
    if (v === 106) m.instalacion_electrica = 'malo';
    if (v === 102) m.instalacion_electrica = 'bueno';
    return m;
  }
  /* Líneas de los 26 elementos: Malo lleva observación; Regular, una de cada dos; '' = sin línea o línea vacía */
  function lineasElementos(inf, m, out) {
    CLAVES.forEach(function (c, j) {
      var x = m[c[1]];
      if (!x) { if (j % 2) out.push(linea(inf, c[0], c[1], j + 1, {})); return; }
      var obs = x === 'malo' ? 'Observación Malo de ' + c[1] : (x === 'regular' && j % 2 ? 'Desgaste en ' + c[1] : '');
      out.push(linea(inf, c[0], c[1], j + 1, { estado: cap(x), texto_1: obs }));
    });
  }
  /* Actuaciones: los dos primeros Malo (Alta, Media) y el primer Regular (Baja); un Malo de seguridad lleva su actuación Alta */
  function lineasAcciones(inf, i, m, out) {
    var v = 101 + i, n = 0;
    if (v === 111 || v === 120) return;
    var acc = function (texto, motivo, pri) { n++; out.push(linea(inf, 'resumen', 'accion_' + n, n, { texto_1: texto, texto_2: motivo, prioridad: pri })); };
    if (v === 104) acc('Cambiar el grifo de la ducha del baño 1', 'Gotea y pierde presión', 'Media');
    if (v === 113) { acc('Revisar la persiana del salón', '', ''); acc('Pintar la valla', '', 'Baja'); acc('Cambiar bombillas del porche', 'Dos fundidas', ''); return; }
    SEGURIDAD.forEach(function (k) { if (m[k] === 'malo') acc('Arreglar ' + k + ' (seguridad)', 'Malo en ' + k, 'Alta'); });
    var malos = CLAVES.filter(function (c) { return m[c[1]] === 'malo' && SEGURIDAD.indexOf(c[1]) < 0; }).slice(0, 2);
    malos.forEach(function (c, k) { acc('Reparar ' + c[1], 'Malo en ' + c[1], k === 0 ? 'Alta' : 'Media'); });
    var reg = CLAVES.filter(function (c) { return m[c[1]] === 'regular'; })[0];
    if (reg) acc('Repasar ' + reg[1], 'Regular en ' + reg[1], 'Baja');
  }
  /* Estancias: la 104 repite el texto de su resumen con prioridad Alta; las casas i % 3 === 0 tienen una incidencia propia */
  function lineasEstancias(inf, i, out) {
    var v = 101 + i;
    if (v === 111 || v === 120) return;
    if (v === 104) out.push(linea(inf, 'estancia', 'bano_1', 5, { texto_1: 'Cambiar el grifo de la ducha del baño 1', texto_2: 'Cambiar grifo', prioridad: 'Alta' }));
    if (i % 3 === 0) out.push(linea(inf, 'estancia', 'cocina', 2, { texto_1: 'Campana extractora con ruido en ' + NOMBRES[i], texto_2: 'Revisar motor', prioridad: i % 2 ? 'Media' : 'Baja' }));
  }
  /* Comentarios de huéspedes: i % 4 filas; origen Review, Parte, Propuesta o vacío, en ese orden */
  function lineasHuesped(inf, i, out) {
    var o = ['Review', 'Parte', 'Propuesta', ''];
    for (var k = 0; k < i % 4; k++) out.push(linea(inf, 'huesped', 'comentario_' + (k + 1), k + 1, { estado: o[k], texto_1: 'Comentario ' + (k + 1) + ' de ' + NOMBRES[i], texto_2: k === 2 ? 'Mejora propuesta' : '' }));
  }
  /* Fotos: i % 7 fotos con pie */
  function lineasFotos(inf, i, out) {
    for (var k = 0; k < i % 7; k++) out.push(linea(inf, 'foto', 'foto_' + (k + 1), k + 1, { foto_url: 'https://fotos.invalid/' + inf + '/' + (k + 1) + '.jpg', texto_1: 'Foto ' + (k + 1) + ' de ' + NOMBRES[i] }));
  }
  function informe(id, villaid, t, estado, i, extra) {
    var d = 5 + (i % 20), x = { informe_id: id, villaid: villaid, temporada: t, estado: estado, estado_general: '', fecha_revision: t + '-10-' + pad(d),
      updated_at: t + '-10-' + pad(d) + 'T10:00:00', observaciones_finales: 'Observaciones finales de ' + NOMBRES[i] + ' ' + t };
    Object.keys(extra || {}).forEach(function (k) { x[k] = extra[k]; });
    return x;
  }
  function general(m) {
    var b = 0, r = 0, a = 0;
    Object.keys(m).forEach(function (k) { if (m[k] === 'bueno') { b++; a++; } else if (m[k] === 'regular') { r++; a++; } else if (m[k] === 'malo') a++; });
    if (!a) return '';
    var s = (2 * b + r) / (2 * a);
    return s >= 0.8 ? 'Bueno' : s >= 0.55 ? 'Regular' : 'Malo';
  }
  function completo(inf, i, m, out) { lineasElementos(inf, m, out); lineasAcciones(inf, i, m, out); lineasEstancias(inf, i, out); lineasHuesped(inf, i, out); lineasFotos(inf, i, out); }

  /* Temporada 2026 */
  var informes = [], lineas = [];
  villas.forEach(function (v, i) {
    if (casos.sin.indexOf(v.villaid) >= 0) return;
    var m = marcas2026(i), id = 2000 + i + 1, est = casos.borradores.indexOf(v.villaid) >= 0 ? 'borrador' : 'enviado';
    var g = general(m);
    if (v.villaid === 120) g = 'Malo';
    if (v.villaid === 108) g = 'Bueno';
    var extra = { estado_general: g };
    if (v.villaid === 103) extra.updated_at = '2026-10-12T10:00:00';
    if (v.villaid === 108) extra.updated_at = '2026-10-25T10:00:00';
    if (v.villaid === 112) { extra.enviado_at = '2026-10-01T09:00:00'; extra.updated_at = '2026-10-28T10:00:00'; }
    informes.push(informe(id, v.villaid, 2026, est, i, extra));
    completo(id, i, m, lineas);
  });
  /* Segundos informes: 103 (vale 2031, guardado después), 108 (vale 2008: 2032 es más alto pero más viejo), 112 (vale 2034 por enviado_at), 116 (borrador 2033 no desplaza) */
  function todo(m, x) { var o = {}; CLAVES.forEach(function (c) { o[c[1]] = x; }); return o; }
  var i103 = 2, m103 = marcas2026(i103);
  informes.push(informe(2031, 103, 2026, 'enviado', i103, { estado_general: general(m103), updated_at: '2026-10-20T10:00:00' }));
  completo(2031, i103, m103, lineas);
  /* el 2003 de la 103 pasa a ser el viejo: todo Bueno (si se eligiera, la puntuación sería 100,0) */
  lineas = lineas.filter(function (l) { return l.informe_id !== 2003; });
  lineasElementos(2003, todo(m103, 'bueno'), lineas);
  informes.push(informe(2032, 108, 2026, 'enviado', 7, { estado_general: 'Malo', updated_at: '2026-10-05T10:00:00' }));
  lineasElementos(2032, todo({}, 'malo'), lineas);
  informes.push(informe(2034, 112, 2026, 'enviado', 11, { estado_general: general(marcas2026(11)), enviado_at: '2026-10-15T09:00:00', updated_at: '2026-10-16T10:00:00' }));
  completo(2034, 11, marcas2026(11), lineas);
  lineas = lineas.filter(function (l) { return l.informe_id !== 2012; });
  lineasElementos(2012, todo({}, 'regular'), lineas);
  informes.push(informe(2033, 116, 2026, 'borrador', 15, { estado_general: '', updated_at: '2026-10-29T10:00:00' }));
  lineasElementos(2033, todo({}, 'malo'), lineas);

  /* Temporada 2025 */
  var informes25 = [], lineas25 = [];
  villas.forEach(function (v, i) {
    if (casos.sinPrevia.indexOf(v.villaid) >= 0) return;
    var m = marcas2025(i), id = 1000 + i + 1;
    informes25.push(informe(id, v.villaid, 2025, casos.previaBorrador.indexOf(v.villaid) >= 0 ? 'borrador' : 'enviado', i, { estado_general: general(m) }));
    lineasElementos(id, m, lineas25);
    lineasAcciones(id, i, m, lineas25);
  });

  var F = {
    temporada: 2026, villas: villas, contacts: contacts, users: users, informes: informes, lineas: lineas,
    previa: { temporada: 2025, informes: informes25, lineas: lineas25 },
    vacia: { temporada: 2024, informes: [], lineas: [] },
    CLAVES: CLAVES, SEGURIDAD: SEGURIDAD, casos: casos,
    vmDeVilla: function (villaid) { var k = KH[(villaid - 101) % 4]; return k === 'U7' ? 'u:U7' : 'c:' + k; }
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = F;
  else root.CuadroFixtures = F;
})(this);
