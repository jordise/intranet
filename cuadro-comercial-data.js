/* ═══════════════════════════════════════════════════════════════════════════
   cuadro-comercial-data.js — CALCULO del Cuadro de mando comercial
   VERSIÓN ACTUAL: v2 | Historial completo al final de este archivo

   Módulo puro: sin DOM, sin red, sin fecha del dispositivo. La página
   cuadro-comercial.html lee las filas (Worker caspio-proxy, action=data) y
   llama a buildDashboard(input). Las pruebas (cuadro-comercial-data.test.js)
   cargan este mismo archivo, sin copias del código.

   COMO SE USA
     <script src="cuadro-comercial-data.js"></script>
     var out = CuadroComercialData.buildDashboard({ today:'2026-10-13', weeklyRows:[...], villas:[...] });
   En node:  var C = require('./cuadro-comercial-data.js');

   ENTRADA (spec 3villas context/cuadro-comercial-gaelle-build-2026-10-13.md §4)
     today       'YYYY-MM-DD' en hora de Madrid (la página la calcula, no este módulo).
     month       opcional 'YYYY-MM'; por defecto el mes de today.
     readAt      opcional, texto de la fecha de lectura; por defecto today.
     weeklyRows  filas de Ta_raport_ventas, todas las columnas (lectura 13/10/2026):
                   registro_id RANDOM ID · PK_ID · Fecha STRING ('YYYY-MM-DD') ·
                   Agente STRING (UserID de TaUsers) · el resto NUMBER:
                   Captacion_Inmobiliaria (captaciones de venta SIN exclusiva),
                   Captacion_Inmobiliaria_Exclusiva (EN exclusiva; cuenta aparte, no es
                   un subconjunto: en 24 de 41 filas con exclusiva es mayor que la otra),
                   Visitas_Ventas, Visita_Alquiler_Vacacional, Firma_Arras, Firma_Notario,
                   Carteles, Seguros, Captacion_Alquiler_Vacacional, Captacion_Alquiler_LAU,
                   Alquiler_LAU, Fincas_Actuales (existencias del agente, no se suman semanas),
                   Facturado_Ciu, Facturado_Mao (acumulado del año por agente, no se suman semanas),
                   Prosp_Llamadas, Prosp_No_Contestan, Prosp_No_Interesado, Prosp_Otra_Agencia,
                   Prosp_Seguimiento, Prosp_Cartas_Intenciones, Prosp_Contratos.
     villas      filas de TaVillas con al menos: villaid, Name, Status, Iniciocontrato,
                   Fincontrato, ContractRenovationType, Unidades_multiunit, Deal_Type.
                   Iniciocontrato y Fincontrato son INTEGER = AÑO (etiqueta Caspio
                   "Año Inicio Contrato" / "Año Fin Contrato"); 1111 y 2999 son los valores
                   de "pendiente" de editar-villa.html, 0 = vacío.
     users       opcional, filas de TaUsers (UserID, Name, Role, User_Status): nombre del
                   agente y agentes de venta activos sin filas. Sin users el agente sale con su id.
     targets     [] en fase 1. {scope:'socios'|'agente', agent?, metric, period, value}.
     datos       [] en fase 1. Solo se leen {kind:'riesgo'|'oportunidad', text}.
     external    undefined en fase 1; no se lee.
     lang        opcional 'es' (por defecto, salida igual que en v1) o 'en': idioma de todo texto que lee
                   una persona (etiquetas, partes, frases, avisos, filas del equipo, mes, bono, referencias).
                   Las claves de estado ('sin dato', 'fase 2', 'sin objetivo', 'ok', 'sin confirmar') y
                   varianceBase ('objetivo' | 'año anterior') no cambian; varianceBaseText lleva el texto.
                   Todos los textos salen de la tabla STR { es, en } con t(clave, {param}); en 'en' el
                   decimal es un punto. Las cifras son las mismas en los dos idiomas.

   REGLAS
   - Semana = lunes a domingo; cada fila cuenta en la semana de su Fecha (la misma regla
     que reports-prospeccion-mensual.html v1). Etiqueta ISO 'YYYY-Www' (año ISO del jueves).
   - Texto para los socios (frases y avisos): sin nombres de campo, sin 1111 ni "vacío", sin
     etiquetas 'YYYY-Www'; la semana se escribe 'semana 40 (28/09/2026)'. Los nombres técnicos van
     solo en source; los campos de datos (weeks, prospeccionDesde, fincasActuales.week) siguen en ISO.
   - Mes de una fila = el mes de su Fecha (misma regla que Prospección mensual).
   - Un valor que falta es null, nunca 0. Una semana sin fila = null y "sin informe".
   - Dos filas del mismo agente en la misma semana: los contadores se suman (como en
     Prospección mensual) y sale un aviso; Fincas_Actuales y Facturado_* toman el mayor
     valor de la semana (son existencias o acumulados).
   - Viviendas en gestión = Status 1 (LA GESTIONAMOS NOSOTROS) u 11 (OUR PROPERTIES).
     Baja = Status 12–15 (LOST - …) con un año de fin válido. Fin de contrato = 31/12 del
     año de Fincontrato; inicio = 1/1 del año de Iniciocontrato.
   - Tasa de bajas 12 meses = bajas con fin en (today − 12 meses, today] / viviendas al
     inicio de ese periodo; viviendas al inicio = en gestión hoy − altas del periodo + bajas
     del periodo. Con 0 viviendas al inicio la tasa es null ("sin dato"), nunca una división.
   - % con garantía = Deal_Type 2 ("Warranty", tabla TaDealType). ContractRenovationType es
     el tipo de renovación (TaRenovationContradtType), no la garantía.
   - % leads → contrato: base = Prosp_Cartas_Intenciones de las 13 semanas.
   - Llamadas por visita = Prosp_Llamadas / (Visitas_Ventas + Visita_Alquiler_Vacacional).
   - Clasificación por visitas y luego contratos, nunca por llamadas.
   ═══════════════════════════════════════════════════════════════════════════ */
(function (root) {
  'use strict';

  var VERSION = 2;

  /* ── v2: textos para una persona, en español y en inglés. Claves estables, no el texto español.
     {n} = parámetro. Una pareja [singular, plural] es un nombre para cnt(). La salida en español es
     la misma de v1, byte a byte. ── */
  var STR = {
    es: {
      sin_dato: 'sin dato', sin_agente: '(sin agente)', equipo: 'Equipo',
      week: 'semana {n} ({d})',
      months: ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'],
      n_fila: ['fila', 'filas'], n_vivienda: ['vivienda', 'viviendas'], n_baja: ['baja', 'bajas'], n_alta: ['alta', 'altas'],
      n_perdida: ['vivienda perdida', 'viviendas perdidas'], n_arras2: ['firma de arras', 'arras firmadas'], n_arras7: ['firma de arras', 'arras'],
      n_escritura: ['escritura', 'escrituras'], n_captacion: ['captación', 'captaciones'], n_contrato: ['contrato', 'contratos'],
      n_carta: ['carta de intención', 'cartas de intención'], n_semana: ['semana', 'semanas'],
      pf_Prosp_Llamadas: 'Llamadas', pf_Prosp_No_Contestan: 'No contestan', pf_Prosp_No_Interesado: 'No interesado', pf_Prosp_Otra_Agencia: 'Otra agencia',
      pf_Prosp_Seguimiento: 'Seguimiento', pf_Visitas_Ventas: 'Visitas', pf_Prosp_Cartas_Intenciones: 'Cartas de intenciones', pf_Prosp_Contratos: 'Contratos',
      eq_contratos_gestion: 'Contratos de gestión firmados', eq_captaciones_exclusiva: 'Captaciones de venta en exclusiva',
      eq_captacion_inmobiliaria: 'Captación Inmobiliaria (campo del informe)', eq_arras: 'Arras firmadas', eq_ofertas: 'Ofertas',
      eq_cartas: 'Cartas de intención enviadas', eq_visitas: 'Visitas (ventas + vacacional)', eq_valoraciones: 'Valoraciones',
      eq_leads_fuente: 'Leads nuevos por fuente', eq_conversaciones: 'Conversaciones', eq_llamadas: 'Llamadas',
      ren_2: 'PENDIENTE', ren_10: 'Fecha fija en contrato', ren_20: 'Anualmente tácitamente',
      mot_bajasSinFin: '{n} sin año de fin', mot_sinInicio: '{n} sin año de inicio',
      nt_sinFecha_1: '1 fila del informe semanal no se cuenta: su fecha no se puede leer.',
      nt_sinFecha_n: '{n} filas del informe semanal no se cuentan: su fecha no se puede leer.',
      nt_sinAgente_1: '1 fila del informe semanal no tiene agente.', nt_sinAgente_n: '{n} filas del informe semanal no tienen agente.',
      nt_dup: 'Atención: {name} tiene {rows} en la {week}; se suman los contadores.',
      nt_prospDesde: 'En estas 13 semanas, las columnas de prospección (llamadas, cartas, contratos) tienen dato desde la {week}; antes salen "sin dato".',
      nt_prospNone: 'En estas 13 semanas, las columnas de prospección (llamadas, cartas, contratos) no tienen ningún dato.',
      nt_noUsar_1: '1 ficha de villa con "NO USAR" en el nombre no se cuenta.', nt_noUsar_n: '{n} fichas de villa con "NO USAR" en el nombre no se cuentan.',
      nt_years: 'Las fichas de villas guardan solo el año del contrato: el inicio se toma el 1 de enero y el fin el 31 de diciembre.',
      nt_sinInicio_1: '{n} de {total} en gestión no tiene año de inicio del contrato (sin año): su alta no se puede fechar.',
      nt_sinInicio_n: '{n} de {total} en gestión no tienen año de inicio del contrato (sin año): sus altas no se pueden fechar.',
      nt_sinFin_1: '{n} de {total} en gestión no tiene año de fin del contrato (sin año).',
      nt_sinFin_n: '{n} de {total} en gestión no tienen año de fin del contrato (sin año).',
      nt_vencidos_1: '{n} en gestión tiene un año de fin del contrato ya pasado: revisa la ficha de la villa.',
      nt_vencidos_n: '{n} en gestión tienen un año de fin del contrato ya pasado: revisa sus fichas.',
      nt_bajasSinFin_1: '{n} no tiene año de fin del contrato: no entra en la tasa de bajas.',
      nt_bajasSinFin_n: '{n} no tienen año de fin del contrato: no entran en la tasa de bajas.',
      nt_noVillas: 'No se han leído fichas de villas: los bloques de viviendas salen "sin dato".',
      src_w: 'Reporte semanal (Ta_raport_ventas)', src_v: 'Fichas de villas (TaVillas)', src_holded: 'Holded (fase 2)',
      src_gaelle: 'Texto de Gaëlle (Ta_comercial_datos, fase 2)',
      src_fact: ': Facturado_Ciu + Facturado_Mao, acumulado del año autodeclarado por agente',
      src_fincas: ': Fincas_Actuales, suma de agentes de la última semana con dato',
      sin_comp: 'mes en curso, sin comparación', vb_objetivo: 'objetivo', vb_ly: 'año anterior',
      tl1: 'Honorarios cobrados', tl2: 'Arras firmadas, 90 días', tl3: 'Captaciones de venta nuevas, % exclusiva',
      tl4: 'Viviendas en gestión: altas, bajas, total', tl5: 'Tasa de bajas de propietarios, 12 meses',
      tl6: 'Contratos de gestión firmados; % leads → contrato', tl7: 'Pipeline de ventas: cartera activa, ofertas, arras, escrituras',
      tl8: 'Dos riesgos, dos oportunidades',
      s1: 'Sin dato hasta la lectura de Holded (fase 2).',
      s2_none: 'Sin arras registradas en los últimos 90 días.',
      s2: '{a90} en los últimos 90 días ({a30} en 30, {a60} en 60); {e90} en 90 días.',
      s3_none: 'Sin dato de captaciones en {mes}.',
      s3: '{n} en {mes}, suma de los dos campos ({s} Captación Inmobiliaria y {e} Captación Exclusiva); % exclusiva sin confirmar; {comp}.',
      s3_ly: '{n} el año anterior',
      s4_noVillas: 'Sin fichas de villas leídas.',
      s4_nofech: '{total} en gestión hoy; altas y bajas sin dato: {motivo}.',
      s4: '{total} en gestión hoy; {altas} y {bajas} en 12 meses; {inicio} al inicio del periodo.',
      s5_nofech: 'Sin dato: {motivo}.',
      s5_zero: 'Sin viviendas al inicio del periodo: la tasa no se puede calcular.',
      s5: '{bajas} de {base} al inicio del periodo ({pct} %).',
      s6_none: 'Sin dato de contratos en {mes}', s6_head: '{n} en {mes}',
      s6_nocartas: 'sin cartas de intención en {w} para calcular el %',
      s6_pct: '{c} de {k} en {w} ({p} %)',
      s6_prosp: 'las columnas de prospección tienen dato desde la {week}',
      s6_prospNone: 'las columnas de prospección no tienen dato en estas 13 semanas',
      s7_none: 'Sin dato de arras en {mes}.', s7: '{a} y {e} en {mes}; {comp}.', s7_lm: 'el mes anterior {a} y {e}',
      s8: 'Sin texto todavía.',
      ref5_best: 'EE. UU., alquiler residencial, mejores gestoras', ref5_avg: 'EE. UU., alquiler residencial, media',
      ltc_base: 'cartas de intención enviadas, 13 semanas', ref6: 'proveedor EE. UU.',
      p7_cartera: 'Cartera activa', p7_ofertas: 'Ofertas', p7_arras: 'Arras', p7_escrituras: 'Escrituras',
      garantia_base: '{n} en gestión con el tipo de acuerdo informado',
      vencen_label: 'con año de fin {a} o {b}',
      regla: 'Bono fijo de {e} € con {n} o más llamadas en el mes.'
    },
    en: {
      sin_dato: 'no data', sin_agente: '(no agent)', equipo: 'Team',
      week: 'week {n} ({d})',
      months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
      n_fila: ['row', 'rows'], n_vivienda: ['home', 'homes'], n_baja: ['lost home', 'lost homes'], n_alta: ['new home', 'new homes'],
      n_perdida: ['lost home', 'lost homes'], n_arras2: ['deposit signed', 'deposits signed'], n_arras7: ['deposit', 'deposits'],
      n_escritura: ['deed', 'deeds'], n_captacion: ['sale listing', 'sale listings'], n_contrato: ['contract', 'contracts'],
      n_carta: ['letter of intent', 'letters of intent'], n_semana: ['week', 'weeks'],
      pf_Prosp_Llamadas: 'Calls', pf_Prosp_No_Contestan: 'No answer', pf_Prosp_No_Interesado: 'Not interested', pf_Prosp_Otra_Agencia: 'Other agency',
      pf_Prosp_Seguimiento: 'Follow-up', pf_Visitas_Ventas: 'Viewings', pf_Prosp_Cartas_Intenciones: 'Letters of intent', pf_Prosp_Contratos: 'Contracts',
      eq_contratos_gestion: 'Management contracts signed', eq_captaciones_exclusiva: 'Exclusive sale listings',
      eq_captacion_inmobiliaria: 'Captación Inmobiliaria (report field)', eq_arras: 'Deposits signed', eq_ofertas: 'Offers',
      eq_cartas: 'Letters of intent sent', eq_visitas: 'Viewings (sales + holiday rental)', eq_valoraciones: 'Valuations',
      eq_leads_fuente: 'New leads by source', eq_conversaciones: 'Conversations', eq_llamadas: 'Calls',
      ren_2: 'PENDING', ren_10: 'Fixed date in the contract', ren_20: 'Renews every year unless cancelled',
      mot_bajasSinFin: '{n} without an end year', mot_sinInicio: '{n} without a start year',
      nt_sinFecha_1: '1 weekly report row is not counted: its date cannot be read.',
      nt_sinFecha_n: '{n} weekly report rows are not counted: their date cannot be read.',
      nt_sinAgente_1: '1 weekly report row has no agent.', nt_sinAgente_n: '{n} weekly report rows have no agent.',
      nt_dup: 'Note: {name} has {rows} in {week}; the counts are added up.',
      nt_prospDesde: 'In these 13 weeks, the prospecting columns (calls, letters, contracts) have data from {week}; before that they show "no data".',
      nt_prospNone: 'In these 13 weeks, the prospecting columns (calls, letters, contracts) have no data at all.',
      nt_noUsar_1: '1 villa record with "NO USAR" (do not use) in its name is not counted.',
      nt_noUsar_n: '{n} villa records with "NO USAR" (do not use) in their name are not counted.',
      nt_years: 'Villa records keep only the contract year: the start is taken as 1 January and the end as 31 December.',
      nt_sinInicio_1: '{n} of {total} under management has no contract start year: its addition cannot be dated.',
      nt_sinInicio_n: '{n} of {total} under management have no contract start year: their additions cannot be dated.',
      nt_sinFin_1: '{n} of {total} under management has no contract end year.',
      nt_sinFin_n: '{n} of {total} under management have no contract end year.',
      nt_vencidos_1: '{n} under management has a contract end year in the past: check the villa record.',
      nt_vencidos_n: '{n} under management have a contract end year in the past: check their records.',
      nt_bajasSinFin_1: '{n} has no contract end year: it is left out of the churn rate.',
      nt_bajasSinFin_n: '{n} have no contract end year: they are left out of the churn rate.',
      nt_noVillas: 'No villa records were read: the home blocks show "no data".',
      src_w: 'Weekly report (Ta_raport_ventas)', src_v: 'Villa records (TaVillas)', src_holded: 'Holded (phase 2)',
      src_gaelle: 'Text from Gaëlle (Ta_comercial_datos, phase 2)',
      src_fact: ': Facturado_Ciu + Facturado_Mao, year-to-date total reported by each agent',
      src_fincas: ': Fincas_Actuales, sum over the agents of the latest week with data',
      sin_comp: 'month in progress, no comparison', vb_objetivo: 'target', vb_ly: 'last year',
      tl1: 'Fees collected', tl2: 'Deposits (arras) signed, 90 days', tl3: 'New sale listings, % exclusive',
      tl4: 'Homes under management: added, lost, total', tl5: 'Owner churn, 12 months',
      tl6: 'Management contracts signed; % leads → contract', tl7: 'Sales pipeline: active portfolio, offers, deposits, deeds',
      tl8: 'Two risks, two opportunities',
      s1: 'No data until Holded is read (phase 2).',
      s2_none: 'No deposits recorded in the last 90 days.',
      s2: '{a90} in the last 90 days ({a30} in 30, {a60} in 60); {e90} in 90 days.',
      s3_none: 'No sale listings data in {mes}.',
      s3: '{n} in {mes}, the sum of the two report fields ({s} Captación Inmobiliaria and {e} Captación Exclusiva); % exclusive not confirmed; {comp}.',
      s3_ly: '{n} last year',
      s4_noVillas: 'No villa records read.',
      s4_nofech: '{total} under management today; no data for added and lost: {motivo}.',
      s4: '{total} under management today; {altasN} added and {bajasN} lost in 12 months; {inicio} at the start of the period.',
      s5_nofech: 'No data: {motivo}.',
      s5_zero: 'No homes at the start of the period: the rate cannot be calculated.',
      s5: '{bajas} out of {base} at the start of the period ({pct} %).',
      s6_none: 'No contracts data in {mes}', s6_head: '{n} in {mes}',
      s6_nocartas: 'no letters of intent in {w} to calculate the %',
      s6_pct: '{c} out of {k} in {w} ({p} %)',
      s6_prosp: 'the prospecting columns have data from {week}',
      s6_prospNone: 'the prospecting columns have no data in these 13 weeks',
      s7_none: 'No deposits data in {mes}.', s7: '{a} and {e} in {mes}; {comp}.', s7_lm: 'last month {a} and {e}',
      s8: 'No text yet.',
      ref5_best: 'US, residential rental, best managers', ref5_avg: 'US, residential rental, average',
      ltc_base: 'letters of intent sent, 13 weeks', ref6: 'US vendor',
      p7_cartera: 'Active portfolio', p7_ofertas: 'Offers', p7_arras: 'Deposits', p7_escrituras: 'Deeds',
      garantia_base: '{n} under management with the deal type filled in',
      vencen_label: 'with end year {a} or {b}',
      regla: 'Fixed bonus of {e} € with {n} or more calls in the month.'
    }
  };
  /* Idioma del cálculo en curso: buildDashboard lo pone y lo devuelve a 'es' al terminar (try/finally). */
  var CUR = 'es';
  function S() { return STR[CUR] || STR.es; }
  /* Texto de la tabla con sus {param}. */
  function t(key, params) {
    var s = S()[key];
    if (s === undefined) s = STR.es[key];
    if (typeof s !== 'string' || !params) return s;
    return s.replace(/\{(\w+)\}/g, function (m, k) { return params[k] === undefined ? m : String(params[k]); });
  }
  /* Clave en singular (_1) o plural (_n) según n. */
  function t1n(key, n, params) { return t(key + (n === 1 ? '_1' : '_n'), params); }

  /* ── Nombres de campo (lectura de la definición de Caspio, 13/10/2026) ── */
  var W = {
    fecha: 'Fecha', agente: 'Agente',
    captSimple: 'Captacion_Inmobiliaria', captExcl: 'Captacion_Inmobiliaria_Exclusiva',
    visitasVentas: 'Visitas_Ventas', visitasVac: 'Visita_Alquiler_Vacacional',
    arras: 'Firma_Arras', notario: 'Firma_Notario', carteles: 'Carteles', seguros: 'Seguros',
    captVac: 'Captacion_Alquiler_Vacacional', captLAU: 'Captacion_Alquiler_LAU', alqLAU: 'Alquiler_LAU',
    fincas: 'Fincas_Actuales', factCiu: 'Facturado_Ciu', factMao: 'Facturado_Mao',
    llamadas: 'Prosp_Llamadas', cartas: 'Prosp_Cartas_Intenciones', contratos: 'Prosp_Contratos'
  };
  var V = {
    id: 'villaid', name: 'Name', status: 'Status', inicio: 'Iniciocontrato', fin: 'Fincontrato',
    renov: 'ContractRenovationType', units: 'Unidades_multiunit', deal: 'Deal_Type'
  };
  /* TaViXVillasStatus (12 filas, lectura 13/10/2026) */
  var STATUS_GESTION = { 1: 'LA GESTIONAMOS NOSOTROS', 11: 'OUR PROPERTIES' };
  var STATUS_BAJA = { 12: 'LOST - SOLD', 13: 'LOST - COMPETENCY', 14: 'LOST - THEY DO THEMSELVES', 15: 'LOST - OTHER OR CANCELLED' };
  /* TaRenovationContradtType (3 filas) */
  var RENOVACION = { 2: 'PENDIENTE', 10: 'Fecha fija en contrato', 20: 'Anualmente tácitamente' };
  /* TaDealType: 2 = Warranty */
  var DEAL_GARANTIA = 2;
  /* Valores de "pendiente" que pone editar-villa.html (PENDING_RULES) */
  var ANIO_PENDIENTE = { 1111: true, 2999: true };

  /* Columnas de Prospección mensual v1, en su orden (Visitas = Visitas_Ventas en esa página). */
  var PROSP_FIELDS = [
    { key: 'Prosp_Llamadas', label: 'Llamadas' },
    { key: 'Prosp_No_Contestan', label: 'No contestan' },
    { key: 'Prosp_No_Interesado', label: 'No interesado' },
    { key: 'Prosp_Otra_Agencia', label: 'Otra agencia' },
    { key: 'Prosp_Seguimiento', label: 'Seguimiento' },
    { key: 'Visitas_Ventas', label: 'Visitas' },
    { key: 'Prosp_Cartas_Intenciones', label: 'Cartas de intenciones' },
    { key: 'Prosp_Contratos', label: 'Contratos' }
  ];
  var BONO_LLAMADAS = 50, BONO_EUROS = 150;

  /* Filas del equipo semanal, resultados primero (spec §3b). */
  var EQUIPO_ROWS = [
    { metric: 'contratos_gestion', label: 'Contratos de gestión firmados', fields: [W.contratos] },
    { metric: 'captaciones_exclusiva', label: 'Captaciones de venta en exclusiva', fields: [W.captExcl] },
    /* El significado de Captacion_Inmobiliaria (¿sin exclusiva o total?) está sin confirmar con Gaëlle: se nombra el campo. */
    { metric: 'captacion_inmobiliaria', label: 'Captación Inmobiliaria (campo del informe)', fields: [W.captSimple] },
    { metric: 'arras', label: 'Arras firmadas', fields: [W.arras] },
    { metric: 'ofertas', label: 'Ofertas', fase2: true },
    { metric: 'cartas', label: 'Cartas de intención enviadas', fields: [W.cartas] },
    { metric: 'visitas', label: 'Visitas (ventas + vacacional)', fields: [W.visitasVentas, W.visitasVac] },
    { metric: 'valoraciones', label: 'Valoraciones', fase2: true },
    { metric: 'leads_fuente', label: 'Leads nuevos por fuente', fase2: true },
    { metric: 'conversaciones', label: 'Conversaciones', fase2: true },
    { metric: 'llamadas', label: 'Llamadas', fields: [W.llamadas], callsPerVisit: true }
  ];
  var SNAPSHOT_FIELDS = {}; SNAPSHOT_FIELDS[W.fincas] = 1; SNAPSHOT_FIELDS[W.factCiu] = 1; SNAPSHOT_FIELDS[W.factMao] = 1;

  var WEEKS = 13;

  /* ════════ Utilidades ════════ */

  /* Valor bruto de un campo: nombre exacto, sin distinguir mayúsculas, o con prefijo TaVillas_. */
  function fv(r, key) {
    if (!r) return undefined;
    if (r[key] !== undefined) return r[key];
    var lk = key.toLowerCase(), pk = 'tavillas_' + lk;
    var ks = Object.keys(r);
    for (var i = 0; i < ks.length; i++) { var k = ks[i].toLowerCase(); if (k === lk || k === pk) return r[ks[i]]; }
    return undefined;
  }
  /* Número o null: vacío, null, ausente o texto = null (nunca 0). */
  function num(r, key) {
    var v = fv(r, key);
    if (v === null || v === undefined || v === '' || typeof v === 'boolean') return null;
    var n = parseFloat(v);
    return isFinite(n) ? n : null;
  }
  function add(a, b) { return a === null ? b : (b === null ? a : a + b); }
  function pad(n) { return String(n).padStart(2, '0'); }

  /* Fecha en cualquier formato de Caspio → 'YYYY-MM-DD' o null (como parseFechaStr de reports-ventas). */
  function parseFecha(s) {
    if (s === null || s === undefined) return null;
    var raw = String(s).trim().split('T')[0].split(' ')[0], m;
    var y, mo, d;
    if ((m = raw.match(/^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/))) { y = +m[1]; mo = +m[2]; d = +m[3]; }
    else if ((m = raw.match(/^(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})$/))) { y = +m[3]; mo = +m[2]; d = +m[1]; }
    else return null;
    var dt = new Date(Date.UTC(y, mo - 1, d));
    if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
    return y + '-' + pad(mo) + '-' + pad(d);
  }
  function toDays(ymd) { return Math.round(Date.UTC(+ymd.slice(0, 4), +ymd.slice(5, 7) - 1, +ymd.slice(8, 10)) / 86400000); }
  function fromDays(n) { var d = new Date(n * 86400000); return d.getUTCFullYear() + '-' + pad(d.getUTCMonth() + 1) + '-' + pad(d.getUTCDate()); }
  /* Lunes de la semana de una fecha 'YYYY-MM-DD'. */
  function mondayOf(ymd) {
    var n = toDays(ymd), dow = (new Date(n * 86400000).getUTCDay() + 6) % 7;
    return fromDays(n - dow);
  }
  /* Etiqueta ISO 'YYYY-Www' de la semana que empieza el lunes dado: el año es el del jueves. */
  function isoWeekLabel(monday) {
    var thu = toDays(monday) + 3, tY = +fromDays(thu).slice(0, 4);
    var week = Math.floor((thu - toDays(tY + '-01-01')) / 7) + 1;
    return tY + '-W' + pad(week);
  }
  /* Semana para una frase o un aviso: 'semana 40 (28/09/2026)' ('week 40 (28/09/2026)' en inglés), número ISO y fecha del lunes. */
  function weekTxt(monday) {
    return t('week', { n: +isoWeekLabel(monday).slice(6), d: monday.slice(8, 10) + '/' + monday.slice(5, 7) + '/' + monday.slice(0, 4) });
  }
  /* Suma meses a 'YYYY-MM-DD' (día recortado al último del mes). */
  function addMonthsDay(ymd, delta) {
    var y = +ymd.slice(0, 4), m = +ymd.slice(5, 7) - 1 + delta, d = +ymd.slice(8, 10);
    var ny = y + Math.floor(m / 12), nm = ((m % 12) + 12) % 12;
    var last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
    return ny + '-' + pad(nm + 1) + '-' + pad(Math.min(d, last));
  }
  function shiftMonth(ym, delta) { return addMonthsDay(ym + '-01', delta).slice(0, 7); }
  function monthLabel(ym) { return S().months[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4); }
  function monthEnd(ym) { return fromDays(toDays(shiftMonth(ym, 1) + '-01') - 1); }
  function round1(x) { return Math.round(x * 10) / 10; }
  function round100(x) { return x === null ? null : Math.round(x / 100) * 100; }
  function pct(a, b) { return (a === null || b === null || !(b > 0)) ? null : round1(a / b * 100); }
  function variance(value, base) { return (value === null || base === null || base === undefined || base === 0) ? null : round1((value - base) / Math.abs(base) * 100); }
  /* Número para una frase: coma decimal (66,7), "sin dato" si falta; en inglés punto decimal (66.7) y "no data". */
  function fmtN(x) { return x === null || x === undefined ? t('sin_dato') : (CUR === 'en' ? String(x) : String(x).replace('.', ',')); }
  /* Concordancia: la palabra en singular con 1, en plural con otro número o sin dato. */
  function pl(n, uno, varios) { return n === 1 ? uno : varios; }
  /* Cuenta para una frase: '1 baja', '2 bajas', 'sin dato bajas'. */
  function cnt(n, uno, varios) { return fmtN(n) + ' ' + pl(n, uno, varios); }
  /* Cuenta con el nombre de la tabla STR: cntK(2, 'n_baja') = '2 bajas' / '2 lost homes'. */
  function cntK(n, key) { var w = S()[key] || STR.es[key]; return cnt(n, w[0], w[1]); }

  /* Año válido de Iniciocontrato / Fincontrato, o null (vacío, 0, 1111, 2999 o fuera de rango). */
  function anioValido(v) {
    if (v === null || v === undefined || v === '') return null;
    var n = parseInt(v, 10);
    if (!isFinite(n) || ANIO_PENDIENTE[n] || n < 1990 || n > 2100) return null;
    return n;
  }
  function isActiveSales(u) {
    var s = u.User_Status, active = s === true || s === 1 || ['yes', 'sí', 'si', 'true', '1'].indexOf(String(s).toLowerCase()) >= 0;
    var role = String(u.Role || u.role || '').toLowerCase();
    return active && (role === 'sales' || role === 'comercial');
  }

  /* ════════ Filas semanales ════════ */

  /* Prepara las filas: fecha normalizada, agente, semana. Cuenta las ilegibles. */
  function prepRows(rows) {
    var out = [], sinFecha = 0, sinAgente = 0;
    (rows || []).forEach(function (r) {
      var f = parseFecha(fv(r, W.fecha));
      if (!f) { sinFecha++; return; }
      var a = fv(r, W.agente);
      a = (a === null || a === undefined) ? '' : String(a).trim();
      if (!a) sinAgente++;
      out.push({ r: r, fecha: f, agente: a, monday: mondayOf(f), month: f.slice(0, 7) });
    });
    return { rows: out, sinFecha: sinFecha, sinAgente: sinAgente };
  }

  /* Valor de una lista de campos sobre un grupo de filas: suma de los no nulos; null si todos son null.
     Fincas_Actuales y Facturado_*: el mayor valor no nulo (existencias y acumulados). */
  function groupValue(prows, fields) {
    var total = null;
    fields.forEach(function (key) {
      var acc = null;
      prows.forEach(function (p) {
        var n = num(p.r, key);
        if (n === null) return;
        acc = SNAPSHOT_FIELDS[key] ? (acc === null ? n : Math.max(acc, n)) : add(acc, n);
      });
      total = add(total, acc);
    });
    return total;
  }

  /* ════════ Viviendas (TaVillas) ════════ */

  /* Fichas marcadas "NO USAR" en el nombre: no cuentan en nada. */
  var NO_USAR = /NO USAR/i;

  function villaInfo(villas, today) {
    var hoyD = toDays(today), desde = addMonthsDay(today, -12), desdeD = toDays(desde), anioHoy = +today.slice(0, 4);
    var gestion = [], bajas = [], altas = [], vencen = [], vencidos = 0, sinInicio = 0, bajasSinFin = 0, sinFin = 0;
    var unidades = 0, multi = 0, simples = 0, garantia = 0, dealConDato = 0, noUsar = 0;
    var renov = { fija: 0, tacita: 0, pendiente: 0, sinDato: 0 };
    (villas || []).forEach(function (v) {
      var nombre = String(fv(v, V.name) || fv(v, V.id) || '').trim();
      if (NO_USAR.test(String(fv(v, V.name) || ''))) { noUsar++; return; }
      var st = num(v, V.status);
      var ini = anioValido(fv(v, V.inicio)), fin = anioValido(fv(v, V.fin));
      var finD = fin === null ? null : toDays(fin + '-12-31');
      if (st !== null && STATUS_BAJA[st]) {
        if (finD === null) { bajasSinFin++; return; }
        if (finD > desdeD && finD <= hoyD) bajas.push({ villa: nombre, fin: fin, motivo: STATUS_BAJA[st] });
        return;
      }
      if (st === null || !STATUS_GESTION[st]) return;
      gestion.push(v);
      if (ini === null) sinInicio++;
      else { var iniD = toDays(ini + '-01-01'); if (iniD > desdeD && iniD <= hoyD) altas.push({ villa: nombre, inicio: ini }); }
      /* Con solo el año, "vencen en 12 meses" = año de fin igual a este año o al siguiente. */
      if (fin === null) sinFin++;
      else if (fin < anioHoy) vencidos++;
      else if (fin <= anioHoy + 1) {
        var rt = num(v, V.renov);
        vencen.push({ villa: nombre, fin: fin, finFecha: fin + '-12-31', renovacion: rt !== null && RENOVACION[rt] ? t('ren_' + rt) : null });
      }
      var u = num(v, V.units);
      if (u !== null && u > 1) { multi++; unidades += u; } else { simples++; unidades += 1; }
      var dl = num(v, V.deal);
      if (dl !== null) { dealConDato++; if (dl === DEAL_GARANTIA) garantia++; }
      var r = num(v, V.renov);
      if (r === 10) renov.fija++; else if (r === 20) renov.tacita++; else if (r === 2) renov.pendiente++; else renov.sinDato++;
    });
    var byEs = function (a, b) { return a.villa.localeCompare(b.villa, 'es'); };
    vencen.sort(function (a, b) { return a.fin - b.fin || byEs(a, b); });
    bajas.sort(function (a, b) { return a.fin - b.fin || byEs(a, b); });
    altas.sort(function (a, b) { return a.inicio - b.inicio || byEs(a, b); });
    var total = gestion.length;
    var alInicio = total - altas.length + bajas.length;
    /* Altas y bajas solo se pueden fechar si TODAS las bajas tienen año de fin y TODAS las viviendas en
       gestión tienen año de inicio; si no, la tasa y las altas/bajas salen "sin dato" con el motivo. */
    var motivos = [];
    if (bajasSinFin) motivos.push(t('mot_bajasSinFin', { n: cntK(bajasSinFin, 'n_baja') }));
    if (sinInicio) motivos.push(t('mot_sinInicio', { n: cntK(sinInicio, 'n_alta') }));
    var fechable = motivos.length === 0;
    return {
      total: total, altas: altas, bajas: bajas, alInicio: alInicio, desde: desde,
      fechable: fechable, motivo: motivos.join('; '),
      tasa: fechable && alInicio > 0 ? round1(bajas.length / alInicio * 100) : null,
      vencen: vencen, vencenAnios: [anioHoy, anioHoy + 1],
      vencidos: vencidos, sinInicio: sinInicio, sinFin: sinFin, bajasSinFin: bajasSinFin, noUsar: noUsar,
      unidades: unidades, multi: multi, simples: simples, garantia: garantia, dealConDato: dealConDato, renov: renov,
      leidas: (villas || []).length - noUsar
    };
  }

  /* ════════ buildDashboard ════════ */

  /* v2: input.lang 'en' = textos en inglés; cualquier otro valor = español. El idioma vuelve a 'es' al terminar. */
  function buildDashboard(input) {
    input = input || {};
    var prev = CUR;
    CUR = input.lang === 'en' ? 'en' : 'es';
    try { return buildCore(input); } finally { CUR = prev; }
  }

  function buildCore(input) {
    var today = parseFecha(input.today);
    if (!today) throw new Error('buildDashboard: today debe ser YYYY-MM-DD');
    var month = (input.month && /^\d{4}-\d{2}$/.test(input.month)) ? input.month : today.slice(0, 7);
    var readAt = input.readAt || today;
    var targets = input.targets || [], datos = input.datos || [];
    var notices = [];

    /* Usuarios */
    var userName = {}, salesIds = [];
    (input.users || []).forEach(function (u) {
      var id = String(u.UserID || u.userid || '').trim();
      if (!id) return;
      userName[id] = String(u.Name || u.name || id).trim();
      if (isActiveSales(u)) salesIds.push(id);
    });
    var nameOf = function (id) { return id ? (userName[id] || id) : t('sin_agente'); };

    var P = prepRows(input.weeklyRows);
    if (P.sinFecha) notices.push(t1n('nt_sinFecha', P.sinFecha, { n: P.sinFecha }));
    if (P.sinAgente) notices.push(t1n('nt_sinAgente', P.sinAgente, { n: P.sinAgente }));

    /* Ventana de 13 semanas, la última es la semana de today (abierta). */
    var lastMon = mondayOf(today), weekStarts = [];
    for (var i = WEEKS - 1; i >= 0; i--) weekStarts.push(fromDays(toDays(lastMon) - 7 * i));
    var weeks = weekStarts.map(isoWeekLabel), wIdx = {};
    weekStarts.forEach(function (m, k) { wIdx[m] = k; });
    var openWeek = weeks[WEEKS - 1];

    /* Filas por agente y semana dentro de la ventana */
    var cells = {}, agentIds = {};
    salesIds.forEach(function (id) { agentIds[id] = 1; });
    P.rows.forEach(function (p) {
      if (wIdx[p.monday] === undefined) return;
      agentIds[p.agente] = 1;
      var c = cells[p.agente] || (cells[p.agente] = {});
      (c[p.monday] || (c[p.monday] = [])).push(p);
    });
    /* Duplicados: más de una fila del mismo agente en una semana de la ventana */
    Object.keys(cells).forEach(function (a) {
      Object.keys(cells[a]).forEach(function (m) {
        if (cells[a][m].length > 1) notices.push(t('nt_dup', { name: nameOf(a), rows: cntK(cells[a][m].length, 'n_fila'), week: weekTxt(m) }));
      });
    });

    function weekValues(agent, fields) {
      return weekStarts.map(function (m) {
        var g = cells[agent] && cells[agent][m];
        return g ? groupValue(g, fields) : null;
      });
    }
    function goalFor(agentName, agentId, metric) {
      var hit = targets.filter(function (x) {
        return x && x.scope === 'agente' && x.metric === metric && x.period === openWeek &&
          (x.agent === agentName || x.agent === agentId);
      })[0];
      return hit && isFinite(+hit.value) ? +hit.value : null;
    }
    function cpv(calls, visits) {
      return calls.map(function (c, k) { var v = visits[k]; return (c === null || v === null || !(v > 0)) ? null : round1(c / v); });
    }
    function buildRows(valuesFor, agentName, agentId) {
      var visits = valuesFor(EQUIPO_ROWS.filter(function (d) { return d.metric === 'visitas'; })[0].fields);
      return EQUIPO_ROWS.map(function (d) {
        var values = d.fase2 ? weekStarts.map(function () { return null; }) : valuesFor(d.fields);
        var goal = d.fase2 ? null : goalFor(agentName, agentId, d.metric);
        var row = {
          metric: d.metric, label: t('eq_' + d.metric), values: values, goal: goal,
          goalState: goal === null ? 'sin objetivo' : 'ok',
          state: d.fase2 ? 'fase 2' : (values.every(function (x) { return x === null; }) ? 'sin dato' : 'ok')
        };
        if (d.callsPerVisit) row.callsPerVisit = cpv(values, visits);
        return row;
      });
    }

    var agentList = Object.keys(agentIds).map(function (id) { return { id: id, name: nameOf(id) }; })
      .sort(function (a, b) { return a.name.localeCompare(b.name, 'es'); });
    var agents = agentList.map(function (a) {
      var missing = weekStarts.filter(function (m, k) { return k < WEEKS - 1 && !(cells[a.id] && cells[a.id][m]); }).map(isoWeekLabel);
      return { id: a.id, name: a.name, rows: buildRows(function (f) { return weekValues(a.id, f); }, a.name, a.id), missingWeeks: missing };
    });
    var missingByWeek = weekStarts.map(function (m) { return agentList.filter(function (a) { return !(cells[a.id] && cells[a.id][m]); }).length; });
    var total = {
      name: t('equipo'),
      rows: buildRows(function (f) {
        return weekStarts.map(function (m, k) {
          return agentList.reduce(function (s, a) { return add(s, weekValues(a.id, f)[k]); }, null);
        });
      }, 'Equipo', ''),
      missingWeeks: weeks.filter(function (w, k) { return k < WEEKS - 1 && missingByWeek[k] > 0; }),
      missingByWeek: missingByWeek
    };
    var sumArr = function (arr) { return arr.reduce(function (s, x) { return add(s, x); }, null); };
    var leaderboard = agents.map(function (a) {
      var row = function (m) { return a.rows.filter(function (r) { return r.metric === m; })[0].values; };
      return { name: a.name, visits: sumArr(row('visitas')), contracts: sumArr(row('contratos_gestion')) };
    }).sort(function (x, y) {
      var vx = x.visits === null ? -1 : x.visits, vy = y.visits === null ? -1 : y.visits;
      var cx = x.contracts === null ? -1 : x.contracts, cy = y.contracts === null ? -1 : y.contracts;
      return vy - vx || cy - cx || x.name.localeCompare(y.name, 'es');
    });

    /* Primera semana de la ventana con dato de prospección (algún Prosp_Llamadas no nulo) */
    var prospDesde = P.rows.filter(function (p) { return wIdx[p.monday] !== undefined && num(p.r, W.llamadas) !== null; })
      .map(function (p) { return p.monday; }).sort()[0] || null;
    if (prospDesde && prospDesde !== weekStarts[0]) notices.push(t('nt_prospDesde', { week: weekTxt(prospDesde) }));
    else if (!prospDesde) notices.push(t('nt_prospNone'));

    /* ── Sumas por mes del equipo ── */
    var byMonth = {};
    P.rows.forEach(function (p) { (byMonth[p.month] || (byMonth[p.month] = [])).push(p); });
    function monthSum(ym, fields) { return byMonth[ym] ? groupMonth(byMonth[ym], fields) : null; }
    function groupMonth(prows, fields) {
      /* contadores: suma de todas las filas del mes (sin agrupar por semana) */
      return fields.reduce(function (s, key) {
        return add(s, prows.reduce(function (acc, p) { return add(acc, num(p.r, key)); }, null));
      }, null);
    }
    function trio(fields) {
      return { value: monthSum(month, fields), lastMonth: monthSum(shiftMonth(month, -1), fields), lastYear: monthSum(shiftMonth(month, -12), fields) };
    }
    function withState(o) { o.state = o.value === null ? 'sin dato' : 'ok'; return o; }
    function target(metric) {
      var hit = targets.filter(function (x) { return x && x.scope === 'socios' && x.metric === metric && x.period === month; })[0];
      return hit && isFinite(+hit.value) ? +hit.value : null;
    }
    function teamWeekly(fields) {
      return weekStarts.map(function (m) {
        return agentList.reduce(function (s, a) { var g = cells[a.id] && cells[a.id][m]; return add(s, g ? groupValue(g, fields) : null); }, null);
      });
    }
    var srcW = t('src_w'), srcV = t('src_v');
    /* Mes abierto (el de today): un mes a medias no se compara con un mes entero. Las cifras 3, 6 y 7
       no llevan año anterior, mes anterior ni variación; dicen "mes en curso, sin comparación". */
    var openMonth = month === today.slice(0, 7);
    var SIN_COMP = t('sin_comp');
    var mesTxt = monthLabel(month);

    function tile(id, label, unit, metric, value, opts) {
      opts = opts || {};
      var tg = metric ? target(metric) : null;
      var ly = opts.lastYear === undefined || opts.noCompare ? null : opts.lastYear;
      var base = tg !== null ? tg : ly;
      /* varianceBase es una clave ('objetivo' | 'año anterior'); varianceBaseText, su texto en el idioma pedido. */
      var vb = opts.fase2 || opts.noCompare || base === null ? null : (tg !== null ? 'objetivo' : 'año anterior');
      var o = {
        id: id, label: label, value: value, unit: unit, target: tg, lastYear: ly,
        variancePct: opts.fase2 || opts.noCompare ? null : variance(value, base),
        varianceBase: vb, varianceBaseText: vb === null ? null : t(vb === 'objetivo' ? 'vb_objetivo' : 'vb_ly'),
        sentence: opts.sentence || '', source: opts.source || '', readAt: readAt,
        state: opts.fase2 ? 'fase 2' : (value === null ? 'sin dato' : (tg === null ? 'sin objetivo' : 'ok'))
      };
      if (opts.noCompare) o.comparison = SIN_COMP;
      Object.keys(opts.extra || {}).forEach(function (k) { o[k] = opts.extra[k]; });
      return o;
    }
    /* Final de frase con la comparación, o "mes en curso, sin comparación" en el mes abierto. */
    function compTxt(txt) { return openMonth ? SIN_COMP : txt; }
    /* Aviso de prospección para la cifra 6, si la ventana empieza antes del primer dato. */
    var prospTxt = prospDesde && prospDesde !== weekStarts[0] ? t('s6_prosp', { week: weekTxt(prospDesde) })
      : (!prospDesde ? t('s6_prospNone') : '');

    var VI = villaInfo(input.villas, today);

    /* Tile 2: arras en ventanas de 30/60/90 días (por la semana de la fila); importe en fase 2 */
    function arrasDesde(dias, field) {
      var lim = toDays(today) - dias;
      return P.rows.filter(function (p) { var d = toDays(p.fecha); return d > lim && d <= toDays(today); })
        .reduce(function (s, p) { return add(s, num(p.r, field)); }, null);
    }
    var a30 = arrasDesde(30, W.arras), a60 = arrasDesde(60, W.arras), a90 = arrasDesde(90, W.arras), e90 = arrasDesde(90, W.notario);

    var capE = trio([W.captExcl]), capS = trio([W.captSimple]), capT = trio([W.captExcl, W.captSimple]);
    var contr = trio([W.contratos]);
    var contr13 = sumArr(teamWeekly([W.contratos])), cartas13 = sumArr(teamWeekly([W.cartas]));
    var arrasM = trio([W.arras]), notM = trio([W.notario]);
    var riesgos = datos.filter(function (d) { return d && d.kind === 'riesgo' && d.text; }).map(function (d) { return String(d.text); });
    var oport = datos.filter(function (d) { return d && d.kind === 'oportunidad' && d.text; }).map(function (d) { return String(d.text); });

    /* Frase de la cifra 6: contratos del mes, % leads → contrato en 13 semanas y desde cuándo hay prospección. */
    function sentence6() {
      var s, p6 = pct(contr13, cartas13), w13 = cntK(WEEKS, 'n_semana');
      if (contr.value === null) s = t('s6_none', { mes: mesTxt });
      else s = t('s6_head', { n: cntK(contr.value, 'n_contrato'), mes: mesTxt }) + '; ' +
        (p6 === null ? t('s6_nocartas', { w: w13 })
          : t('s6_pct', { c: cntK(contr13, 'n_contrato'), k: cntK(cartas13, 'n_carta'), w: w13, p: fmtN(p6) })) +
        (openMonth ? '; ' + SIN_COMP : '');
      return s + (prospTxt ? '; ' + prospTxt : '') + '.';
    }

    var tiles = [
      tile(1, t('tl1'), 'EUR', 'honorarios_cobrados', null, {
        fase2: true, source: t('src_holded'),
        sentence: t('s1')
      }),
      /* Cifra 2 en fase 1 = recuento de arras y escrituras; "Honorarios pendientes" vuelve en la fase 2 con importes. */
      tile(2, t('tl2'), 'n', 'arras_90d', a90, {
        source: srcW,
        sentence: a90 === null ? t('s2_none')
          : t('s2', { a90: cntK(a90, 'n_arras2'), a30: fmtN(a30), a60: fmtN(a60), e90: cntK(e90, 'n_escritura') }),
        extra: { arras30d: a30, arras60d: a60, arras90d: a90, escrituras90d: e90, importe: null, importeState: 'fase 2' }
      }),
      /* % exclusiva sin confirmar: no se sabe si Captacion_Inmobiliaria es "sin exclusiva" o el total. */
      tile(3, t('tl3'), 'n', 'captaciones_venta', capT.value, {
        lastYear: capT.lastYear, noCompare: openMonth, source: srcW,
        sentence: capT.value === null ? t('s3_none', { mes: mesTxt })
          : t('s3', { n: cntK(capT.value, 'n_captacion'), mes: mesTxt, s: fmtN(capS.value), e: fmtN(capE.value), comp: compTxt(t('s3_ly', { n: fmtN(capT.lastYear) })) }),
        extra: { exclusivas: capE.value, captacionInmobiliaria: capS.value, exclusivePct: null, exclusiveState: 'sin confirmar', series13w: teamWeekly([W.captExcl, W.captSimple]) }
      }),
      /* Cifra 4: el total de hoy es firme; altas, bajas y el año anterior solo si se pueden fechar. */
      tile(4, t('tl4'), 'n', 'viviendas_gestion', VI.leidas ? VI.total : null, {
        lastYear: VI.leidas && VI.fechable ? VI.alInicio : null, source: srcV,
        sentence: !VI.leidas ? t('s4_noVillas')
          : !VI.fechable ? t('s4_nofech', { total: cntK(VI.total, 'n_vivienda'), motivo: VI.motivo })
          : t('s4', { total: cntK(VI.total, 'n_vivienda'), altas: cntK(VI.altas.length, 'n_alta'), bajas: cntK(VI.bajas.length, 'n_baja'),
            altasN: fmtN(VI.altas.length), bajasN: fmtN(VI.bajas.length), inicio: fmtN(VI.alInicio) }),
        extra: (function () {
          var ok4 = VI.leidas && VI.fechable;
          return { altas12m: ok4 ? VI.altas.length : null, bajas12m: ok4 ? VI.bajas.length : null, alInicio: ok4 ? VI.alInicio : null,
            netas12m: ok4 ? VI.altas.length - VI.bajas.length : null, altasBajasState: ok4 ? 'ok' : 'sin dato', altasBajasMotivo: VI.leidas ? VI.motivo : '' };
        })()
      }),
      /* Cifra 5: sin bajas fechables no hay tasa ni líneas de referencia. */
      tile(5, t('tl5'), '%', 'tasa_bajas', VI.tasa, {
        source: srcV,
        sentence: !VI.leidas ? t('s4_noVillas')
          : !VI.fechable ? t('s5_nofech', { motivo: VI.motivo })
          : VI.tasa === null ? t('s5_zero')
          : t('s5', { bajas: cntK(VI.bajas.length, 'n_baja'), base: cntK(VI.alInicio, 'n_vivienda'), pct: fmtN(VI.tasa) }),
        extra: {
          bajas: VI.tasa === null ? null : VI.bajas.length, base: VI.tasa === null ? null : VI.alInicio, desde: VI.desde,
          referencias: VI.tasa === null ? [] : [{ value: 9.6, label: t('ref5_best') }, { value: 19.5, label: t('ref5_avg') }]
        }
      }),
      tile(6, t('tl6'), 'n', 'contratos_gestion', contr.value, {
        lastYear: contr.lastYear, noCompare: openMonth, source: srcW,
        sentence: sentence6(),
        extra: {
          leadToContract: { contratos: contr13, cartas: cartas13, pct: pct(contr13, cartas13), base: t('ltc_base') },
          referenceBand: { min: 10, max: 25, label: t('ref6') },
          prospeccionDesde: prospDesde ? isoWeekLabel(prospDesde) : null,
          series13w: teamWeekly([W.contratos])
        }
      }),
      tile(7, t('tl7'), 'n', 'arras', arrasM.value, {
        lastYear: arrasM.lastYear, noCompare: openMonth, source: srcW,
        sentence: arrasM.value === null ? t('s7_none', { mes: mesTxt })
          : t('s7', { a: cntK(arrasM.value, 'n_arras7'), e: cntK(notM.value, 'n_escritura'), mes: mesTxt, comp: compTxt(t('s7_lm', { a: fmtN(arrasM.lastMonth), e: fmtN(notM.lastMonth) })) }),
        extra: {
          lastMonth: openMonth ? null : arrasM.lastMonth,
          parts: [
            { key: 'cartera', label: t('p7_cartera'), value: null, state: 'fase 2' },
            { key: 'ofertas', label: t('p7_ofertas'), value: null, state: 'fase 2' },
            withState({ key: 'arras', label: t('p7_arras'), value: arrasM.value, lastMonth: openMonth ? null : arrasM.lastMonth, lastYear: openMonth ? null : arrasM.lastYear }),
            withState({ key: 'escrituras', label: t('p7_escrituras'), value: notM.value, lastMonth: openMonth ? null : notM.lastMonth, lastYear: openMonth ? null : notM.lastYear })
          ],
          series13w: teamWeekly([W.arras])
        }
      }),
      tile(8, t('tl8'), 'n', null, (riesgos.length || oport.length) ? riesgos.length + oport.length : null, {
        source: t('src_gaelle'),
        sentence: (riesgos.length || oport.length) ? '' : t('s8'),
        extra: { riesgos: riesgos.slice(0, 2), oportunidades: oport.slice(0, 2) }
      })
    ];
    /* Tile 8 no tiene objetivo numérico: con texto es 'ok'. */
    if (tiles[7].value !== null) tiles[7].state = 'ok';

    /* ── Mensual ── */
    /* Facturado (acumulado del año por agente, autodeclarado): valor al cierre de un mes = la semana
       más reciente con dato, con fecha en ese año y hasta fin de mes; dentro de la semana el mayor
       valor (una fila duplicada vacía guarda 0 y no puede bajar el acumulado). */
    function factYtd(agent, ym) {
      var fin = monthEnd(ym), y = ym.slice(0, 4), best = null, bestW = '';
      P.rows.forEach(function (p) {
        if (p.agente !== agent || p.fecha > fin || p.fecha.slice(0, 4) !== y) return;
        var v = add(num(p.r, W.factCiu), num(p.r, W.factMao));
        if (v === null) return;
        if (p.monday > bestW) { best = v; bestW = p.monday; }
        else if (p.monday === bestW && v > best) best = v;
      });
      return best;
    }
    var factAgents = agentList.map(function (a) {
      var ytd = factYtd(a.id, month), prev = month.slice(5, 7) === '01' ? null : factYtd(a.id, shiftMonth(month, -1));
      return { name: a.name, ytd: round100(ytd), mes: (ytd === null || prev === null) ? null : round100(ytd - prev) };
    }).filter(function (x) { return x.ytd !== null; });
    var factYtdTot = factAgents.length ? round100(factAgents.reduce(function (s, x) { return s + x.ytd; }, 0)) : null;
    var factMesTot = factAgents.some(function (x) { return x.mes !== null; }) ? round100(factAgents.reduce(function (s, x) { return s + (x.mes || 0); }, 0)) : null;

    /* Fincas_Actuales: la semana más reciente hasta fin de mes con dato, suma de agentes */
    var finMes = monthEnd(month);
    var fincasWeek = P.rows.filter(function (p) { return p.fecha <= finMes && num(p.r, W.fincas) !== null; })
      .map(function (p) { return p.monday; }).sort().pop() || null;
    var fincasVal = null;
    if (fincasWeek) {
      var perAg = {};
      P.rows.forEach(function (p) { if (p.monday === fincasWeek) (perAg[p.agente] || (perAg[p.agente] = [])).push(p); });
      Object.keys(perAg).forEach(function (a) { fincasVal = add(fincasVal, groupValue(perAg[a], [W.fincas])); });
    }

    /* Prospección del mes por agente (lógica de Prospección mensual v1, con null en vez de 0) */
    var prospAg = {};
    (byMonth[month] || []).forEach(function (p) {
      var a = prospAg[p.agente] || (prospAg[p.agente] = { name: nameOf(p.agente), rows: [], weeks: {} });
      a.rows.push(p); a.weeks[p.monday] = 1;
    });
    var prospAgents = Object.keys(prospAg).map(function (id) {
      var a = prospAg[id], sums = {};
      PROSP_FIELDS.forEach(function (f) { sums[f.key] = groupMonth(a.rows, [f.key]); });
      return { name: a.name, sums: sums, filas: a.rows.length, semanas: Object.keys(a.weeks).length };
    }).sort(function (x, y) { return x.name.localeCompare(y.name, 'es'); });
    var prospTot = {};
    PROSP_FIELDS.forEach(function (f) { prospTot[f.key] = prospAgents.reduce(function (s, a) { return add(s, a.sums[f.key]); }, null); });
    var bonus = prospAgents.map(function (a) {
      var n = a.sums.Prosp_Llamadas;
      return n === null ? { name: a.name, llamadas: null, ok: null, faltan: null, state: 'sin dato' }
        : { name: a.name, llamadas: n, ok: n >= BONO_LLAMADAS, faltan: n >= BONO_LLAMADAS ? 0 : BONO_LLAMADAS - n, state: 'ok' };
    });

    var mensual = {
      month: month, label: monthLabel(month),
      dinero: {
        facturado: {
          value: factMesTot, ytd: factYtdTot, porAgente: factAgents, unit: 'EUR',
          state: factYtdTot === null ? 'sin dato' : 'ok',
          source: srcW + t('src_fact')
        },
        cobrado: { value: null, state: 'fase 2' },
        diferencia: { value: null, state: 'fase 2' },
        pendientePorMes: { value: null, state: 'fase 2' }
      },
      ventas: {
        inmueblesEnVenta: { value: null, state: 'fase 2' },
        fincasActuales: { value: fincasVal, week: fincasWeek ? isoWeekLabel(fincasWeek) : null, state: fincasVal === null ? 'sin dato' : 'ok', source: srcW + t('src_fincas') },
        arras: withState(trio([W.arras])),
        escrituras: withState(trio([W.notario])),
        seguros: { count: withState(trio([W.seguros])), valor: { value: null, state: 'fase 2' } },
        alquilerLAU: withState(trio([W.alqLAU])),
        captacionLAU: withState(trio([W.captLAU])),
        carteles: withState(trio([W.carteles])),
        diasEnMercado: { value: null, state: 'fase 2' },
        caidasTrasArras: { value: null, state: 'fase 2' }
      },
      captacion: {
        viviendasBajoContrato: VI.leidas ? VI.total : null,
        unidades: VI.leidas ? VI.unidades : null,
        simples: VI.leidas ? VI.simples : null,
        multi: VI.leidas ? VI.multi : null,
        conGarantia: { n: VI.garantia, pct: pct(VI.garantia, VI.dealConDato), base: t('garantia_base', { n: cntK(VI.dealConDato, 'n_vivienda') }), source: 'TaVillas.Deal_Type = 2 (Warranty)' },
        renovacion: VI.renov,
        leads: { value: null, state: 'fase 2' },
        cartas: withState(trio([W.cartas])),
        contratos: withState(trio([W.contratos])),
        captacionAlquilerVacacional: withState(trio([W.captVac])),
        /* Sin fechas fiables (cifra 4) las listas no se enseñan: "sin dato" con el motivo. */
        altas12m: VI.fechable || !VI.leidas ? VI.altas : { value: null, state: 'sin dato', motivo: VI.motivo },
        bajas12m: VI.fechable || !VI.leidas ? VI.bajas : { value: null, state: 'sin dato', motivo: VI.motivo },
        bajasMotivoTexto: { value: null, state: 'fase 2' },
        /* Fincontrato guarda solo el año: vencen = año de fin este año o el siguiente. */
        vencen12m: VI.vencen,
        vencen12mLabel: t('vencen_label', { a: VI.vencenAnios[0], b: VI.vencenAnios[1] })
      },
      prospeccion: {
        fields: PROSP_FIELDS.map(function (f) { return { key: f.key, label: t('pf_' + f.key) }; }), agents: prospAgents, totales: prospTot, bonus: bonus,
        regla: t('regla', { e: BONO_EUROS, n: BONO_LLAMADAS }),
        fuentes: { value: null, state: 'fase 2' }
      }
    };

    /* Avisos de los datos de villas */
    if (VI.noUsar) notices.push(t1n('nt_noUsar', VI.noUsar, { n: VI.noUsar }));
    if (VI.leidas) {
      notices.push(t('nt_years'));
      if (VI.sinInicio) notices.push(t1n('nt_sinInicio', VI.sinInicio, { n: VI.sinInicio, total: cntK(VI.total, 'n_vivienda') }));
      if (VI.sinFin) notices.push(t1n('nt_sinFin', VI.sinFin, { n: VI.sinFin, total: cntK(VI.total, 'n_vivienda') }));
      if (VI.vencidos) notices.push(t1n('nt_vencidos', VI.vencidos, { n: cntK(VI.vencidos, 'n_vivienda') }));
      if (VI.bajasSinFin) notices.push(t1n('nt_bajasSinFin', VI.bajasSinFin, { n: cntK(VI.bajasSinFin, 'n_perdida') }));
    } else {
      notices.push(t('nt_noVillas'));
    }

    return {
      version: VERSION, lang: CUR, today: today, readAt: readAt,
      socios: { month: month, tiles: tiles },
      equipo: { weeks: weeks, weekStarts: weekStarts, openWeek: openWeek, agents: agents, total: total, leaderboard: leaderboard },
      mensual: mensual,
      notices: notices
    };
  }

  var API = {
    VERSION: VERSION,
    buildDashboard: buildDashboard,
    FIELDS: { weekly: W, villas: V },
    EQUIPO_ROWS: EQUIPO_ROWS, PROSP_FIELDS: PROSP_FIELDS,
    STATUS_GESTION: STATUS_GESTION, STATUS_BAJA: STATUS_BAJA, RENOVACION: RENOVACION,
    /* v2: tabla de textos { es, en } (las pruebas comprueban que los dos idiomas tienen las mismas claves) */
    STR: STR,
    /* expuesto solo para las pruebas */
    _internals: {
      parseFecha: parseFecha, mondayOf: mondayOf, isoWeekLabel: isoWeekLabel, weekTxt: weekTxt, cnt: cnt, addMonthsDay: addMonthsDay,
      shiftMonth: shiftMonth, monthEnd: monthEnd, anioValido: anioValido, num: num, villaInfo: villaInfo
    }
  };
  root.CuadroComercialData = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));

/* HISTORIAL: v2 2026-10-13 — textos en inglés (Gary, 13/10/2026: "i need an english toggle as well so i can
   read it"). Entrada nueva input.lang 'es' (por defecto) | 'en'. Todo texto que lee una persona (etiquetas de
   las ocho cifras, partes de la cifra 7, frases, avisos, motivos, filas del equipo semanal, nombre del total,
   columnas de prospección, mes, renovación, etiqueta de los que vencen, base de la garantía, regla del bono,
   referencias, fuentes) sale de la tabla STR { es, en } con t(clave, {param}); los nombres para contar son
   parejas [singular, plural] (cntK). En inglés el decimal es un punto. Las claves de estado y varianceBase no
   cambian; varianceBaseText lleva su texto. Las cifras son las mismas en los dos idiomas; la salida en español
   es la de v1, byte a byte. STR se publica en CuadroComercialData.STR para las pruebas; la salida lleva lang.
   v1 2026-10-13 — primera versión: cálculo puro del Cuadro de mando comercial (spec
   3villas context/cuadro-comercial-gaelle-build-2026-10-13.md §3 y §4). Socios: ocho tiles con
   estado 'ok' | 'sin dato' | 'sin objetivo' | 'fase 2'; tiles 1 y 8 y las partes cartera y ofertas
   del tile 7 en fase 2. Equipo: 13 semanas de lunes a domingo con etiqueta ISO, filas por agente
   resultados primero, "sin informe" por semana sin fila (la semana en curso no cuenta), llamadas
   por visita, clasificación por visitas y contratos. Mensual: dinero (facturado autodeclarado;
   cobrado en fase 2), ventas, captación (viviendas en gestión, garantía por Deal_Type, contratos
   que vencen en 12 meses), prospección con el bono de 150 € a partir de 50 llamadas. Nunca un 0
   en lugar de un dato que falta. Pruebas cuadro-comercial-data.test.js.
   Misma versión, mismo día, nueve arreglos del revisor: (1) cifras 4 y 5 sin dato cuando hay bajas sin
   año de fin o viviendas en gestión sin año de inicio, con el motivo en la frase; la cifra 4 conserva el
   total; la 5 sin tasa ni líneas de referencia. (2) La cifra 2 se llama "Arras firmadas, 90 días", con las
   escrituras al lado; "Honorarios pendientes" vuelve en la fase 2. (3) Vencen = año de fin este año o el
   siguiente (vencen12mLabel), por año y nombre. (4) Las fichas "NO USAR" no cuentan, con aviso.
   (5) Fila "Captación Inmobiliaria (campo del informe)" y % exclusiva "sin confirmar". (6) Coma decimal en
   las frases. (7) Mes abierto: cifras 3, 6 y 7 sin comparación. (8) La cifra 6 dice desde qué semana hay
   prospección.
   Misma versión, mismo día, texto para los socios: las frases y los avisos no nombran campos de Caspio
   (Fincontrato, Iniciocontrato, Ta_…, Deal_Type) ni valores de relleno (1111, vacío); dicen "año de
   inicio del contrato", "año de fin del contrato", "informe semanal", "sin año". Las semanas se escriben
   "semana 40 (28/09/2026)" (weekTxt). Los nombres técnicos quedan solo en el campo source.
   Misma versión, mismo día, concordancia: cada cuenta de una frase o un aviso concuerda en número
   ("1 baja", "2 bajas", "1 firma de arras", "1 vivienda ... no tiene"), con cnt() y pl(). Los valores de
   la columna Motivo (LOST - …) siguen como dato. */
