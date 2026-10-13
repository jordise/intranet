/* ═══════════════════════════════════════════════════════════════════════════
   cuadro-comercial-data.js — CALCULO del Cuadro de mando comercial
   VERSIÓN ACTUAL: v1 | Historial completo al final de este archivo

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

  var VERSION = 1;

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

  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
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
  /* Semana para una frase o un aviso: 'semana 40 (28/09/2026)', número ISO y fecha del lunes. */
  function weekTxt(monday) {
    return 'semana ' + (+isoWeekLabel(monday).slice(6)) + ' (' + monday.slice(8, 10) + '/' + monday.slice(5, 7) + '/' + monday.slice(0, 4) + ')';
  }
  /* Suma meses a 'YYYY-MM-DD' (día recortado al último del mes). */
  function addMonthsDay(ymd, delta) {
    var y = +ymd.slice(0, 4), m = +ymd.slice(5, 7) - 1 + delta, d = +ymd.slice(8, 10);
    var ny = y + Math.floor(m / 12), nm = ((m % 12) + 12) % 12;
    var last = new Date(Date.UTC(ny, nm + 1, 0)).getUTCDate();
    return ny + '-' + pad(nm + 1) + '-' + pad(Math.min(d, last));
  }
  function shiftMonth(ym, delta) { return addMonthsDay(ym + '-01', delta).slice(0, 7); }
  function monthLabel(ym) { return MESES[+ym.slice(5, 7) - 1] + ' ' + ym.slice(0, 4); }
  function monthEnd(ym) { return fromDays(toDays(shiftMonth(ym, 1) + '-01') - 1); }
  function round1(x) { return Math.round(x * 10) / 10; }
  function round100(x) { return x === null ? null : Math.round(x / 100) * 100; }
  function pct(a, b) { return (a === null || b === null || !(b > 0)) ? null : round1(a / b * 100); }
  function variance(value, base) { return (value === null || base === null || base === undefined || base === 0) ? null : round1((value - base) / Math.abs(base) * 100); }
  /* Número para una frase: coma decimal (66,7), "sin dato" si falta. */
  function fmtN(x) { return x === null || x === undefined ? 'sin dato' : String(x).replace('.', ','); }
  /* Concordancia: la palabra en singular con 1, en plural con otro número o sin dato. */
  function pl(n, uno, varios) { return n === 1 ? uno : varios; }
  /* Cuenta para una frase: '1 baja', '2 bajas', 'sin dato bajas'. */
  function cnt(n, uno, varios) { return fmtN(n) + ' ' + pl(n, uno, varios); }

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
        vencen.push({ villa: nombre, fin: fin, finFecha: fin + '-12-31', renovacion: rt !== null && RENOVACION[rt] ? RENOVACION[rt] : null });
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
    if (bajasSinFin) motivos.push(cnt(bajasSinFin, 'baja', 'bajas') + ' sin año de fin');
    if (sinInicio) motivos.push(cnt(sinInicio, 'alta', 'altas') + ' sin año de inicio');
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

  function buildDashboard(input) {
    input = input || {};
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
    var nameOf = function (id) { return id ? (userName[id] || id) : '(sin agente)'; };

    var P = prepRows(input.weeklyRows);
    if (P.sinFecha) notices.push(P.sinFecha === 1 ? '1 fila del informe semanal no se cuenta: su fecha no se puede leer.'
      : P.sinFecha + ' filas del informe semanal no se cuentan: su fecha no se puede leer.');
    if (P.sinAgente) notices.push(P.sinAgente === 1 ? '1 fila del informe semanal no tiene agente.' : P.sinAgente + ' filas del informe semanal no tienen agente.');

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
        if (cells[a][m].length > 1) notices.push('Atención: ' + nameOf(a) + ' tiene ' + cnt(cells[a][m].length, 'fila', 'filas') + ' en la ' + weekTxt(m) + '; se suman los contadores.');
      });
    });

    function weekValues(agent, fields) {
      return weekStarts.map(function (m) {
        var g = cells[agent] && cells[agent][m];
        return g ? groupValue(g, fields) : null;
      });
    }
    function goalFor(agentName, agentId, metric) {
      var t = targets.filter(function (x) {
        return x && x.scope === 'agente' && x.metric === metric && x.period === openWeek &&
          (x.agent === agentName || x.agent === agentId);
      })[0];
      return t && isFinite(+t.value) ? +t.value : null;
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
          metric: d.metric, label: d.label, values: values, goal: goal,
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
      name: 'Equipo',
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
    if (prospDesde && prospDesde !== weekStarts[0]) notices.push('En estas 13 semanas, las columnas de prospección (llamadas, cartas, contratos) tienen dato desde la ' + weekTxt(prospDesde) + '; antes salen "sin dato".');
    else if (!prospDesde) notices.push('En estas 13 semanas, las columnas de prospección (llamadas, cartas, contratos) no tienen ningún dato.');

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
      var t = targets.filter(function (x) { return x && x.scope === 'socios' && x.metric === metric && x.period === month; })[0];
      return t && isFinite(+t.value) ? +t.value : null;
    }
    function teamWeekly(fields) {
      return weekStarts.map(function (m) {
        return agentList.reduce(function (s, a) { var g = cells[a.id] && cells[a.id][m]; return add(s, g ? groupValue(g, fields) : null); }, null);
      });
    }
    var srcW = 'Reporte semanal (Ta_raport_ventas)', srcV = 'Fichas de villas (TaVillas)';
    /* Mes abierto (el de today): un mes a medias no se compara con un mes entero. Las cifras 3, 6 y 7
       no llevan año anterior, mes anterior ni variación; dicen "mes en curso, sin comparación". */
    var openMonth = month === today.slice(0, 7);
    var SIN_COMP = 'mes en curso, sin comparación';
    var mesTxt = monthLabel(month);

    function tile(id, label, unit, metric, value, opts) {
      opts = opts || {};
      var tg = metric ? target(metric) : null;
      var ly = opts.lastYear === undefined || opts.noCompare ? null : opts.lastYear;
      var base = tg !== null ? tg : ly;
      var t = {
        id: id, label: label, value: value, unit: unit, target: tg, lastYear: ly,
        variancePct: opts.fase2 || opts.noCompare ? null : variance(value, base),
        varianceBase: opts.fase2 || opts.noCompare || base === null ? null : (tg !== null ? 'objetivo' : 'año anterior'),
        sentence: opts.sentence || '', source: opts.source || '', readAt: readAt,
        state: opts.fase2 ? 'fase 2' : (value === null ? 'sin dato' : (tg === null ? 'sin objetivo' : 'ok'))
      };
      if (opts.noCompare) t.comparison = SIN_COMP;
      Object.keys(opts.extra || {}).forEach(function (k) { t[k] = opts.extra[k]; });
      return t;
    }
    /* Final de frase con la comparación, o "mes en curso, sin comparación" en el mes abierto. */
    function compTxt(txt) { return openMonth ? SIN_COMP : txt; }
    /* Aviso de prospección para la cifra 6, si la ventana empieza antes del primer dato. */
    var prospTxt = prospDesde && prospDesde !== weekStarts[0] ? 'las columnas de prospección tienen dato desde la ' + weekTxt(prospDesde)
      : (!prospDesde ? 'las columnas de prospección no tienen dato en estas 13 semanas' : '');

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

    var tiles = [
      tile(1, 'Honorarios cobrados', 'EUR', 'honorarios_cobrados', null, {
        fase2: true, source: 'Holded (fase 2)',
        sentence: 'Sin dato hasta la lectura de Holded (fase 2).'
      }),
      /* Cifra 2 en fase 1 = recuento de arras y escrituras; "Honorarios pendientes" vuelve en la fase 2 con importes. */
      tile(2, 'Arras firmadas, 90 días', 'n', 'arras_90d', a90, {
        source: srcW,
        sentence: a90 === null ? 'Sin arras registradas en los últimos 90 días.'
          : cnt(a90, 'firma de arras', 'arras firmadas') + ' en los últimos 90 días (' + fmtN(a30) + ' en 30, ' + fmtN(a60) + ' en 60); ' + cnt(e90, 'escritura', 'escrituras') + ' en 90 días.',
        extra: { arras30d: a30, arras60d: a60, arras90d: a90, escrituras90d: e90, importe: null, importeState: 'fase 2' }
      }),
      /* % exclusiva sin confirmar: no se sabe si Captacion_Inmobiliaria es "sin exclusiva" o el total. */
      tile(3, 'Captaciones de venta nuevas, % exclusiva', 'n', 'captaciones_venta', capT.value, {
        lastYear: capT.lastYear, noCompare: openMonth, source: srcW,
        sentence: capT.value === null ? 'Sin dato de captaciones en ' + mesTxt + '.'
          : cnt(capT.value, 'captación', 'captaciones') + ' en ' + mesTxt + ', suma de los dos campos (' + fmtN(capS.value) + ' Captación Inmobiliaria y ' +
            fmtN(capE.value) + ' Captación Exclusiva); % exclusiva sin confirmar; ' + compTxt(fmtN(capT.lastYear) + ' el año anterior') + '.',
        extra: { exclusivas: capE.value, captacionInmobiliaria: capS.value, exclusivePct: null, exclusiveState: 'sin confirmar', series13w: teamWeekly([W.captExcl, W.captSimple]) }
      }),
      /* Cifra 4: el total de hoy es firme; altas, bajas y el año anterior solo si se pueden fechar. */
      tile(4, 'Viviendas en gestión: altas, bajas, total', 'n', 'viviendas_gestion', VI.leidas ? VI.total : null, {
        lastYear: VI.leidas && VI.fechable ? VI.alInicio : null, source: srcV,
        sentence: !VI.leidas ? 'Sin fichas de villas leídas.'
          : !VI.fechable ? cnt(VI.total, 'vivienda', 'viviendas') + ' en gestión hoy; altas y bajas sin dato: ' + VI.motivo + '.'
          : cnt(VI.total, 'vivienda', 'viviendas') + ' en gestión hoy; ' + cnt(VI.altas.length, 'alta', 'altas') + ' y ' + cnt(VI.bajas.length, 'baja', 'bajas') + ' en 12 meses; ' + fmtN(VI.alInicio) + ' al inicio del periodo.',
        extra: (function () {
          var ok4 = VI.leidas && VI.fechable;
          return { altas12m: ok4 ? VI.altas.length : null, bajas12m: ok4 ? VI.bajas.length : null, alInicio: ok4 ? VI.alInicio : null,
            netas12m: ok4 ? VI.altas.length - VI.bajas.length : null, altasBajasState: ok4 ? 'ok' : 'sin dato', altasBajasMotivo: VI.leidas ? VI.motivo : '' };
        })()
      }),
      /* Cifra 5: sin bajas fechables no hay tasa ni líneas de referencia. */
      tile(5, 'Tasa de bajas de propietarios, 12 meses', '%', 'tasa_bajas', VI.tasa, {
        source: srcV,
        sentence: !VI.leidas ? 'Sin fichas de villas leídas.'
          : !VI.fechable ? 'Sin dato: ' + VI.motivo + '.'
          : VI.tasa === null ? 'Sin viviendas al inicio del periodo: la tasa no se puede calcular.'
          : cnt(VI.bajas.length, 'baja', 'bajas') + ' de ' + cnt(VI.alInicio, 'vivienda', 'viviendas') + ' al inicio del periodo (' + fmtN(VI.tasa) + ' %).',
        extra: {
          bajas: VI.tasa === null ? null : VI.bajas.length, base: VI.tasa === null ? null : VI.alInicio, desde: VI.desde,
          referencias: VI.tasa === null ? [] : [{ value: 9.6, label: 'EE. UU., alquiler residencial, mejores gestoras' }, { value: 19.5, label: 'EE. UU., alquiler residencial, media' }]
        }
      }),
      tile(6, 'Contratos de gestión firmados; % leads → contrato', 'n', 'contratos_gestion', contr.value, {
        lastYear: contr.lastYear, noCompare: openMonth, source: srcW,
        sentence: (contr.value === null ? 'Sin dato de contratos en ' + mesTxt
          : cnt(contr.value, 'contrato', 'contratos') + ' en ' + mesTxt + '; ' + (pct(contr13, cartas13) === null ? 'sin cartas de intención en ' + cnt(WEEKS, 'semana', 'semanas') + ' para calcular el %'
            : cnt(contr13, 'contrato', 'contratos') + ' de ' + cnt(cartas13, 'carta de intención', 'cartas de intención') + ' en ' + cnt(WEEKS, 'semana', 'semanas') + ' (' + fmtN(pct(contr13, cartas13)) + ' %)') +
            (openMonth ? '; ' + SIN_COMP : '')) + (prospTxt ? '; ' + prospTxt : '') + '.',
        extra: {
          leadToContract: { contratos: contr13, cartas: cartas13, pct: pct(contr13, cartas13), base: 'cartas de intención enviadas, 13 semanas' },
          referenceBand: { min: 10, max: 25, label: 'proveedor EE. UU.' },
          prospeccionDesde: prospDesde ? isoWeekLabel(prospDesde) : null,
          series13w: teamWeekly([W.contratos])
        }
      }),
      tile(7, 'Pipeline de ventas: cartera activa, ofertas, arras, escrituras', 'n', 'arras', arrasM.value, {
        lastYear: arrasM.lastYear, noCompare: openMonth, source: srcW,
        sentence: arrasM.value === null ? 'Sin dato de arras en ' + mesTxt + '.'
          : cnt(arrasM.value, 'firma de arras', 'arras') + ' y ' + cnt(notM.value, 'escritura', 'escrituras') + ' en ' + mesTxt + '; ' + compTxt('el mes anterior ' + fmtN(arrasM.lastMonth) + ' y ' + fmtN(notM.lastMonth)) + '.',
        extra: {
          lastMonth: openMonth ? null : arrasM.lastMonth,
          parts: [
            { key: 'cartera', label: 'Cartera activa', value: null, state: 'fase 2' },
            { key: 'ofertas', label: 'Ofertas', value: null, state: 'fase 2' },
            withState({ key: 'arras', label: 'Arras', value: arrasM.value, lastMonth: openMonth ? null : arrasM.lastMonth, lastYear: openMonth ? null : arrasM.lastYear }),
            withState({ key: 'escrituras', label: 'Escrituras', value: notM.value, lastMonth: openMonth ? null : notM.lastMonth, lastYear: openMonth ? null : notM.lastYear })
          ],
          series13w: teamWeekly([W.arras])
        }
      }),
      tile(8, 'Dos riesgos, dos oportunidades', 'n', null, (riesgos.length || oport.length) ? riesgos.length + oport.length : null, {
        source: 'Texto de Gaëlle (Ta_comercial_datos, fase 2)',
        sentence: (riesgos.length || oport.length) ? '' : 'Sin texto todavía.',
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
          source: srcW + ': Facturado_Ciu + Facturado_Mao, acumulado del año autodeclarado por agente'
        },
        cobrado: { value: null, state: 'fase 2' },
        diferencia: { value: null, state: 'fase 2' },
        pendientePorMes: { value: null, state: 'fase 2' }
      },
      ventas: {
        inmueblesEnVenta: { value: null, state: 'fase 2' },
        fincasActuales: { value: fincasVal, week: fincasWeek ? isoWeekLabel(fincasWeek) : null, state: fincasVal === null ? 'sin dato' : 'ok', source: srcW + ': Fincas_Actuales, suma de agentes de la última semana con dato' },
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
        conGarantia: { n: VI.garantia, pct: pct(VI.garantia, VI.dealConDato), base: cnt(VI.dealConDato, 'vivienda', 'viviendas') + ' en gestión con el tipo de acuerdo informado', source: 'TaVillas.Deal_Type = 2 (Warranty)' },
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
        vencen12mLabel: 'con año de fin ' + VI.vencenAnios[0] + ' o ' + VI.vencenAnios[1]
      },
      prospeccion: {
        fields: PROSP_FIELDS, agents: prospAgents, totales: prospTot, bonus: bonus,
        regla: 'Bono fijo de ' + BONO_EUROS + ' € con ' + BONO_LLAMADAS + ' o más llamadas en el mes.',
        fuentes: { value: null, state: 'fase 2' }
      }
    };

    /* Avisos de los datos de villas */
    if (VI.noUsar) notices.push(VI.noUsar === 1 ? '1 ficha de villa con "NO USAR" en el nombre no se cuenta.'
      : VI.noUsar + ' fichas de villa con "NO USAR" en el nombre no se cuentan.');
    if (VI.leidas) {
      notices.push('Las fichas de villas guardan solo el año del contrato: el inicio se toma el 1 de enero y el fin el 31 de diciembre.');
      if (VI.sinInicio) notices.push(VI.sinInicio + ' de ' + cnt(VI.total, 'vivienda', 'viviendas') + ' en gestión ' + pl(VI.sinInicio, 'no tiene', 'no tienen') + ' año de inicio del contrato (sin año): ' + pl(VI.sinInicio, 'su alta no se puede fechar.', 'sus altas no se pueden fechar.'));
      if (VI.sinFin) notices.push(VI.sinFin + ' de ' + cnt(VI.total, 'vivienda', 'viviendas') + ' en gestión ' + pl(VI.sinFin, 'no tiene', 'no tienen') + ' año de fin del contrato (sin año).');
      if (VI.vencidos) notices.push(cnt(VI.vencidos, 'vivienda', 'viviendas') + ' en gestión ' + pl(VI.vencidos, 'tiene', 'tienen') + ' un año de fin del contrato ya pasado: ' + pl(VI.vencidos, 'revisa la ficha de la villa.', 'revisa sus fichas.'));
      if (VI.bajasSinFin) notices.push(cnt(VI.bajasSinFin, 'vivienda perdida', 'viviendas perdidas') + ' ' + pl(VI.bajasSinFin, 'no tiene', 'no tienen') + ' año de fin del contrato: ' + pl(VI.bajasSinFin, 'no entra', 'no entran') + ' en la tasa de bajas.');
    } else {
      notices.push('No se han leído fichas de villas: los bloques de viviendas salen "sin dato".');
    }

    return {
      version: VERSION, today: today, readAt: readAt,
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
    /* expuesto solo para las pruebas */
    _internals: {
      parseFecha: parseFecha, mondayOf: mondayOf, isoWeekLabel: isoWeekLabel, weekTxt: weekTxt, cnt: cnt, addMonthsDay: addMonthsDay,
      shiftMonth: shiftMonth, monthEnd: monthEnd, anioValido: anioValido, num: num, villaInfo: villaInfo
    }
  };
  root.CuadroComercialData = API;
  if (typeof module !== 'undefined' && module.exports) module.exports = API;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));

/* HISTORIAL: v1 2026-10-13 — primera versión: cálculo puro del Cuadro de mando comercial (spec
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
