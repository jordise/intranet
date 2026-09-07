// ================================================================
//  mia-intranet.js — Mia en la cabecera de la intranet 3Villas
//
//  Qué hace: añade una fila con un campo de pregunta debajo de la
//  cabecera, y un botón Aa (texto más legible, opcional). La pregunta
//  va al Worker mia-intranet-search, que devuelve SOLO un JSON de
//  filtros. Todos los datos los pide el navegador a caspio-proxy con
//  el token del propio usuario, igual que cualquier otra página.
//
//  Mia solo lee. No escribe, no envía, no borra.
//
//  Reglas de este fichero:
//   · Add-only: no cambia ni una regla CSS de las páginas existentes y no
//     toca el style de ningún elemento suyo. La fila no es sticky: es un
//     bloque normal debajo de la cabecera, sin z-index, que se va con el
//     scroll. Las barras de filtros de las páginas se quedan donde estaban,
//     y al quitar la fila la página es exactamente la de antes.
//   · Toda clase de Mia lleva el prefijo mia- o vive dentro de
//     .mia-row/.mia-panel: villa.html tiene un .h-btn global.
//   · Nunca se pinta ni se registra un secreto: todo campo de caja de llaves,
//     contraseña, wifi, alarma, notas del keyholder, caja fuerte, tarjeta,
//     token o documento de identidad se borra de cada fila nada más recibir
//     la respuesta. El id del keyholder sí pasa: es una persona, no un código.
//   · Todo valor que venga del Worker o de Caspio entra en el DOM por
//     textContent o por escapeHtml(). Nunca por innerHTML sin escapar.
//   · Un chip nunca dice un filtro que no haya llegado a la URL: los
//     chips se construyen con los parámetros realmente emitidos y el
//     resto va a "No pude aplicar".
//   · Si no hay sesión, si el rol no está permitido o si el Worker
//     falla, la fila no aparece y la página queda exactamente igual.
//
//  Se carga con una sola línea al final de nav-component.js.
//  Quitar esa línea desactiva Mia en toda la intranet.
//
//  HISTORIAL · 2026-09-07 — revisión funcional contra los registros
//  (nodo mia-functional-review-2026-09-07). Son CORRECCIONES, no
//  funciones nuevas: ninguna lleva bandera en FEAT.
//   · R3 resolveVilla — con varias villas candidatas van delante las
//     que llevan TODAS las palabras escritas ("apartamentos voramar"
//     da APARTAMENTOS VORAMAR antes que VILLA VORAMAR). El acierto
//     exacto de una sola villa no cambia.
//   · R4 doBookingsLink — sin ningún filtro y sin reserva en la
//     página no hay lista ni botón: se pide un dato (T.noFilter),
//     igual que en la ficha y en la tarjeta.
//   · R6 lista de reservas sin fechas — la ventana sigue yendo vacía
//     a propósito (si no, la página pone encima la fecha guardada del
//     usuario), pero ahora se dice (T.noDates con villa, T.noDatesAll
//     sin ella).
//   · R7 filtro que no se pudo aplicar — si no queda nada que abrir,
//     no hay botón; si queda algo, el botón dice qué abre de verdad
//     ("sin villa", "sin fecha", "solo salidas").
//   · R11 listas de villas (la de elegir villa y la de Tareas) —
//     cuando el acierto vino del nombre interno y el nombre para
//     inquilinos no lleva la palabra escrita, el nombre interno se
//     enseña debajo, en gris.
//   · R12 tareas automáticas — la fila la decide Tasktype 20, la
//     misma regla que tareas.html; el nombre de la tarea no decide
//     nada. La expresión de doTasks se queda: lee la PREGUNTA.
//   · R13 ficha de estado — la línea de Check-in online lee
//     Arrivalform_done con la misma degradación que la insignia de
//     Entradas Equipo (v144 G11: marcado con cero adultos no es
//     hecho) y con los tres estados de siempre: hecho, pendiente y
//     sin dato.
//   · R10 (menú de sales) no es de este archivo: nav.js y auth.js.
// ================================================================

(function () {
'use strict';

if (window.__MIA_LOADED) return;
window.__MIA_LOADED = true;

/* ════════════════ CONFIGURACIÓN ════════════════ */
const MIA_WORKER_URL='https://mia-intranet-search.gerard-0d3.workers.dev';
const MIA_ALLOWED_ROLES=['admin','manager','staff','sales'];
/* Quién ve las líneas de pago. Copia exacta de auth.js:121
   'cobros-inquilinos': ['admin','manager'] — la página donde se ven los cobros.
   Si cambia allí, cambia aquí. Quien no está en la lista recibe la ficha sin
   pagos y sin ninguna mención a los pagos. */
const MIA_PAY_ROLES=['admin','manager'];
const MIA_DEBUG = false;               // true solo para depurar en local

const PROXY          = 'https://caspio-proxy.jordi-89b.workers.dev';
const VIEW_BOOKINGS  = 'Vi_villas_and_bookings2021';
const VIEW_PAYMENTS  = 'Vi_bookingsall_and_paymen_editb';
/* 22 s: tiene que ser mayor que el peor caso del Worker (5 s de comprobación
   de sesión + 15 s de modelo). Si no, el navegador se rinde con la respuesta
   ya de camino. */
const TIMEOUT_MS     = 22000;
const MAX_ROWS       = 5;              // filas por lista (igual que el límite de la consulta)
/* J5: tope de la tarjeta "qué falta" de las entradas de un día. El día más
   cargado de 2026 tuvo 54 entradas, así que 60 las coge todas; el proxy corta
   en 1000, muy por encima. */
const READY_MAX      = 60;
/* J6: tareas con incidencia. INC_MAX son las que se enseñan; INC_FETCH es el
   tope de la consulta que YA filtra por la marca de incidencia (en el volcado
   del 2026-09-01 hay 599 tareas con marca en cuatro años y medio, así que 200
   sobra para cualquier ventana); INC_SCAN es el tope del plan B, cuando el
   servidor no acepta filtrar por un campo Sí/No y hay que separarlas aquí:
   mismo tope de 1000 filas que usa tareas.html en su propia consulta. */
const INC_MAX        = 30;
const INC_FETCH      = 200;
const INC_SCAN       = 1000;
/* Ventana por defecto cuando la pregunta no trae fechas: los últimos 14 días. */
const INC_DAYS       = 14;
/* Texto de la incidencia recortado: una respuesta es un índice, no el parte. */
const INC_TEXT       = 160;
/* Villas por lista de elección. "bini" está en dieciocho nombres, así que un
   tope de diez escondía villas de verdad. Pasado el tope se pide más letras. */
const MAX_VILLAS     = 20;
const MAX_SUGGEST    = 5;   /* villas parecidas bajo "¿Querías decir…?" */
/* Interruptores por función (paquete 2026-09-07, viajes 1-6). Poner a 0 y
   subir el archivo apaga solo esa función; el resto de Mia sigue igual. Es la
   palanca 0 del ROLLBACK.md del Worker: más fina que quitar el módulo. */
const FEAT = {
  ctx   :1,   /* J1: usa la reserva abierta en la página como filtro */
  retry :1,   /* J2: fallo de lectura distinto de "sin resultados" + Reintentar */
  report:1,   /* J3: "Avisar de un fallo" al pie de cada respuesta */
  unit  :1,   /* J4: unidad (apartamento) dentro de una villa en Tareas */
  ready :1,   /* J5: tarjeta "qué falta" para las entradas de un día */
  incid :1,   /* J6: tareas con incidencia reportada por limpieza */
  page  :1,   /* J7: abrir una página del menú de quien pregunta, por su nombre */
  /* J8: una pregunta cada vez. Cada pregunta lleva un número y la respuesta
     que llega tarde, de una pregunta anterior, no se pinta. A 0 vuelve el
     comportamiento de antes: sin número y sin bloqueo del campo. */
  seq   :1
};
const K_EASY         = '3v_easy';      // localStorage: texto más legible
const K_OFF          = '3v_mia_off';   // sessionStorage: Mia apagada esta sesión

/* Mapa de campos de la vista de reservas — copiado de entradas-equipo v141 */
const F = {
  reservationId:'TaBookings2021_BookingID', confirmCode:'TaBookings2021_FS_confirmation_code',
  villaName:'TaVillas_Name_villa_para_inquilinos', villaId:'TaVillas_villaid',
  nights:'TaBookings2021_Nights', checkIn:'TaBookings2021_Checkin', checkOut:'TaBookings2021_Checkout',
  adults:'TaBookings2021_Adults', children:'TaBookings2021_Children',
  status:'TaBookings2021_BookingStatus', statusNameFormula:'TaBookings2021_Status_name_formula',
  guestName:'TaBookings2021_Guest_Full_Name', guestEmail:'TaBookings2021_Guest_email',
  secondEmail:'TaBookings2021_Segundo_email',
  guestPhone:'TaBookings2021_Guest_phonenumber', phoneArrival:'TaBookings2021_Segundo_Telefono',
  fiscalName:'TaBookings2021_Fiscal_guest_name', fiscalSurname:'TaBookings2021_Fiscal_guest_surename',
  portalName:'TaBookings2021_Portal_Name', villaManager:'TaVillas_KeyHolder_person',
  cleaner:'TaVillas_Cleanning_team',
  limpieza:'TaBookings2021_LimpiezaTerminada', wellcomePack:'TaBookings2021_Welcomepackentregado',
  cierre:'TaBookings2021_Checkoutcontrolado', checkinPend:'TaBookings2021_checkinonline_todo_terminado',
  ecotasaCobrada:'TaBookings2021_Paso4_terminado', policeDone:'TaBookings2021_Registro_policia_done',
  depositDone:'TaBookings2021_Security_deposit_terminado',
  /* J5: la marca del formulario de llegada, misma casilla que enseña
     entradas-equipo (línea 818 de v141). */
  arrivalFormDone:'TaBookings2021_Arrivalform_done'
};
const U = { id:'UserID', name:'Name' };

/* Vista de pagos — conceptos por línea */
const PAY = {
  code  :'Ta_payments_HS_confirmation_code',
  amount:'Ta_payments_Importe',
  date  :'Ta_payments_Transactiaon_date',
  status:'Ta_payments_Status'
};
const PAY_CONCEPTS = [
  ['Ta_payments_Pago_ecotasa','Ecotasa'],
  ['Ta_payments_Pago_Linea1','Extra 1'],
  ['Ta_payments_Pago_Linea2','Extra 2'],
  ['Ta_payments_Pago_Linea3','Extra 3'],
  ['Ta_payments_Pago_deposito_seguridad','Depósito'],
  ['Ta_payments_Pago_deposit_waiver','Waiver']
];

/* Páginas a las que Mia puede enlazar. Lista blanca: nada más. */
const PAGES = {
  entradas :'entradas-equipo.html',
  tareas   :'tareas.html',
  ocupacion:'listado-ocupacion.html',
  villa    :'villa.html',
  notas    :'notas-equipo-reservas.html'
};

/* tareas.html restoreFiltersFromURL() lee est(1583) u(1585) fd/fh(1591)
   vi(1594) tt(1606) bt(1607) urg(1609) imp(1613) — números de línea de v85.
   bt = "Tipo reserva" del <select id="fBookingType">: 10 limpieza,
   20 welcomepack, 30 cierre.
   tareas.html v86 añade tres cosas: vid=<villaid> filtra por el id exacto de
   la villa y gana sobre vi (que sigue buscando por nombre), auto=0 esconde las
   tareas automáticas, y tt vuelve a restaurarse aunque la lista de tipos de la
   página todavía no traiga esa opción. Sin esos parámetros la página se
   comporta exactamente como en v85. */
const TASK_EST = { pendiente:'pend', terminada:'done' };
/* welcomepack NO está: bt=20 no filtra las tareas de welcome pack como la
   gente espera, así que Mia no lo emite y lo dice en "No pude aplicar". El
   resto de la pregunta (estado, usuario, fechas, villa) sí se aplica. */
const TASK_BT  = { limpieza:'10', cierre:'30' };
/* Tipos del catálogo de TaTasks (Tasktype). Palabras del usuario, sin
   acentos, -> id. Limpieza/welcomepack/cierre van por TASK_BT, no por aquí. */
const TASK_TT = {
  reparacion:'12', reparaciones:'12', averia:'12', averias:'12', arreglo:'12', arreglos:'12', mantenimiento:'12',
  compra:'14', compras:'14',
  comercial:'16', comerciales:'16',
  'villa manager':'13',
  interna:'1', internas:'1'
};
/* R12 (revisión del 2026-09-07). "Tarea automática" lo decide SIEMPRE el
   Tasktype de la fila, nunca su nombre: limpieza, welcomepack y cierre
   comparten Tasktype 20, y hay tareas escritas a mano que se llaman igual.
   Es la misma comparación que hace tareas.html v86 para esconderlas
   (String(t.Tasktype||'')!=='20'), así que la lista de Mia y la de la página
   cuentan lo mismo. Las palabras se siguen leyendo, pero solo en la PREGUNTA
   (TASK_BT, TASK_TT y la expresión de doTasks): eso es lo que alguien
   escribió, no lo que la fila es. */
const TASK_AUTO_TT='20';
function isAutoTask(r){ return String((r&&r.Tasktype)||'')===TASK_AUTO_TT; }

/* Textos (producción en español) */
const T = {
  ph        :'Pregunta a Mia: reserva, villa, fechas…',
  go        :'Preguntar',
  aa        :'Texto más legible',
  asked     :'Has preguntado:',
  onlyRead  :'Mia solo lee. No cambia datos ni envía mensajes.',
  usedHere  :'Mia ha usado los filtros de esta página. Quita un chip para ampliar.',
  filters   :'Filtros',
  openEnt   :'Abrir en Entradas',
  openTar   :'Abrir en Tareas',
  openNotes :'Abrir notas',
  notes     :'Notas',
  openVilla :'Ver villa',
  openOcu   :'Abrir Ocupación',
  noApply   :'No pude aplicar:',   /* la lista se cierra con un punto */
  down      :'Mia no está disponible ahora. Los filtros de siempre funcionan igual.',
  expired   :'Tu sesión ha caducado. Vuelve a entrar.',
  busyWait  :'Mia está ocupada. Espera un momento y vuelve a preguntar.',
  busy      :'Mia está ocupada. Prueba otra vez en un momento.',
  badQ      :'No he entendido la pregunta.',
  noBooking :'No encuentro esa reserva.',
  noVilla   :'No encuentro esa villa.',
  many      :'He encontrado varias reservas. Elige una:',
  guessVilla:'Villa supuesta por el nombre parecido. Quita el chip si no es.',
  manyVillas:'He encontrado varias villas. Elige una:',
  moreVillas:'Hay más villas; escribe más letras del nombre.',
  didYouMean:'¿Querías decir…?',
  more      :'Hay más resultados. Ábrelos todos en Entradas.',
  noMgrLink :'El enlace de Entradas no filtra por manager: ese filtro solo lo aplico yo aquí.',
  unknown   :'No he entendido. Prueba con un nombre, un código de reserva, una villa o unas fechas.',
  ocuNote   :'Ocupación no admite filtros por enlace todavía. Abre la página y pon:',
  loading   :'Un momento…',
  close     :'Cerrar',
  panelLabel:'Respuesta de Mia',
  payScroll :'Arrastra la tabla para ver el resto.',
  rmFilter  :'Quitar filtro',
  guest     :'Inquilino', dates:'Fechas', vm:'Villa Manager', state:'Estado',
  payments  :'Pagos', concept:'Concepto', date:'Fecha', amount:'Importe', total:'Total',
  nights    :'noches',
  readFail  :'No he podido leer los datos. Vuelve a intentarlo.',   /* J2 */
  retry     :'Reintentar',                                          /* J2 */
  payFail   :'No he podido leer los pagos.',                         /* J2 */
  /* J1 */
  ctxChip   :'Usando esta reserva',   /* chip de la reserva abierta en la página */
  /* J3 — Avisar de un fallo. Mia no envía nada: el aviso lo copia o lo abre
     en WhatsApp la propia persona, y elige ella el chat. */
  rptOpen   :'Avisar de un fallo',
  rptTitle  :'Posible fallo de Mia',
  rptPage   :'Página:',
  rptQ      :'Pregunta:',
  rptChips  :'Filtros:',
  rptLink   :'Enlace:',
  rptNone   :'ninguno',
  rptExpect :'Esperaba:',
  rptGot    :'Salió:',
  rptCopy   :'Copiar',
  rptCopied :'Copiado',
  rptWa     :'Abrir WhatsApp',
  rptLabel  :'Texto del aviso',
  /* J4 */
  manyUnits :'He encontrado varias unidades. Elige una:',
  unitVilla :'Esa unidad está en esta villa, no en la del nombre exacto. Quita el chip si no es.',
  moreUnits :'Hay más unidades; escribe la etiqueta de la que buscas.',
  /* J5 — tarjeta "qué falta para las entradas de un día" */
  rdNone    :'No hay entradas en esas fechas.',
  rdRead    :'No he podido leer las entradas.',
  rdMore    :'Hay más de 60 entradas. Ábrelas en Entradas.',
  rdSource  :'Marcas de Entradas Equipo (tabla de reservas). Una marca no significa que Mia haya comprobado el trabajo.',
  rdEnt     :'entradas',
  rdPendN   :'con algo pendiente',
  rdPend    :'pendiente',
  rdNa      :'sin dato',
  rdArrival :'Arrival form',
  rdPolice  :'Policía',
  rdPaso4   :'Paso 4 (ecotasa/depósito)',
  rdDeposit :'Depósito',
  rdClean   :'Limpieza',
  rdWp      :'Welcome pack',
  /* J6 */
  incHead   :'Registro de la tarea tal como está. Reportado no significa aceptado ni resuelto.',
  incNone   :'No hay tareas con incidencia en esas fechas.',
  incKo     :'No he podido leer las tareas.',
  incMore   :'Hay más tareas con incidencia. Ábrelas todas en Tareas.',
  incResp   :'Responsable:',
  incCap    :'Hay más tareas en esas fechas de las que Mia puede leer de una vez. Acorta las fechas.',
  incDone   :'terminada',
  incPend   :'pendiente',
  incPhoto  :'1 foto',
  incPhotos :'fotos',
  incNoPhoto:'sin fotos',
  incOpen   :'Abrir tarea',
  incNoLink :'El enlace de Tareas no filtra por incidencia: ese filtro solo lo aplico yo aquí.',
  /* J7 */
  pageOpen  :'Abrir',
  pageLine  :'Esta página del menú:',
  /* Barrido del 2026-09-07 */
  noFilter  :'Dime un código, un nombre o una villa.',
  incAsig   :'Asignada a:',
  noApplyInq:'el inquilino en el enlace: el nombre lleva comillas',
  rdToday   :'Sin fechas en la pregunta: son las entradas de hoy. Al quitar el chip de fecha vuelve a hoy.',
  /* Revisión del 2026-09-07 */
  /* R6: la ventana vacía es a propósito —con desde= y hasta= vacíos la página
     no pone encima la ventana guardada del usuario—, pero abre todo el
     historial de esa villa, así que se dice.
     ES: Sin fechas: se abre todo el historial de esa villa. Añade "de mañana" o un mes.
     EN: No dates: this opens that villa's whole history. Add "de mañana" (tomorrow) or a month. */
  noDates   :'Sin fechas: se abre todo el historial de esa villa. Añade "de mañana" o un mes.',
  /* S4: la misma nota cuando la pregunta no nombra ninguna villa ("salidas").
     ES: Sin fechas: se abre todo el historial. Añade "de mañana" o un mes.
     EN: No dates: this opens the whole history. Add "de mañana" (tomorrow) or a month. */
  noDatesAll:'Sin fechas: se abre todo el historial. Añade "de mañana" o un mes.',
  /* R7: lo que el botón abre de verdad cuando un filtro no se pudo aplicar.
     Etiquetas cortas: el botón va en mayúsculas y en un teléfono.
     ES: sin villa / sin fecha / solo entradas / solo salidas
     EN: without villa / without date / arrivals only / departures only */
  btnNoVilla:'sin villa',
  btnNoDate :'sin fecha',
  btnOnlyIn :'solo entradas',
  btnOnlyOut:'solo salidas'
};

/* Marca de Mia (SVG en línea; no se usa <use> por el <base href> de varias páginas) */
const MARK = '<svg class="mia-mk" viewBox="0 0 100 100" aria-hidden="true" focusable="false">'
  + '<circle cx="50" cy="50" r="50" fill="#C8102E"/>'
  + '<svg x="22" y="34" width="56" height="32.6" viewBox="15.05 9.4 44.7 26">'
  + '<g transform="rotate(-90 37.4 22.35)">'
  + '<path d="M49.5978 26.9164C49.0454 25.6442 48.2754 24.506 47.3045 23.5518C46.3504 22.6145 45.1954 21.8445 43.8898 21.2586C43.7726 21.2084 43.6387 21.1582 43.5215 21.1079C47.1037 19.0156 48.9617 15.5841 48.9617 11.031C48.9617 9.40735 48.6436 7.90083 48.041 6.54497C47.4217 5.18911 46.5345 4.00063 45.413 3.02977C44.3082 2.07564 42.9691 1.32238 41.4291 0.786735C39.9226 0.267825 38.2152 0 36.3739 0C32.5742 0 29.4942 0.753257 26.7155 2.42716L24.4222 3.69933V11.868L27.9374 9.20648C30.2307 7.44888 32.6244 6.57845 35.2189 6.57845C39.6046 6.57845 41.563 8.30257 41.563 12.186C41.563 14.8308 40.6591 18.346 32.842 18.346H28.3224V24.9244H33.0261C42.015 24.9244 43.0528 28.7242 43.0528 31.5698C43.0528 32.5742 42.8687 33.4948 42.5004 34.2816C42.1322 35.0683 41.63 35.7211 40.9604 36.2903C40.2741 36.8594 39.4372 37.2946 38.4496 37.6126C37.4452 37.9307 36.2735 38.0981 35.0013 38.0981C31.7372 38.0981 28.925 37.1272 26.3974 35.152L24.439 33.5283V42.015L24.8742 42.2996C27.3683 43.9065 30.7161 44.7267 34.8339 44.7267C37.077 44.7267 39.1861 44.4087 41.0609 43.7726C42.9691 43.1365 44.643 42.2159 46.0156 41.0441C47.4217 39.8557 48.5097 38.3994 49.2797 36.7255C50.0497 35.0516 50.4347 33.1768 50.4347 31.1681C50.4347 29.6281 50.1502 28.2053 49.5978 26.9164Z" fill="#fff"/>'
  + '</g></svg></svg>';

/* ════════════════ UTILIDADES ════════════════ */
function dbg(){ if(MIA_DEBUG && typeof console!=='undefined') console.log.apply(console,['[Mia]'].concat([].slice.call(arguments))); }

function escapeHtml(v){
  return String(v==null?'':v)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
/* Crea un elemento. El texto entra SIEMPRE por textContent. */
function E(tag,cls,txt){
  const e=document.createElement(tag);
  if(cls)e.className=cls;
  if(txt!=null)e.textContent=String(txt);
  return e;
}
/* Escape para valores dentro de un WHERE de Caspio.
   El corte a 80 va ANTES de doblar las comillas: si no, un valor cuyo
   carácter 80 sea una comilla llegaría a medio escapar. */
function sq(v){
  return String(v==null?'':v).replace(/[\x00-\x1f\x7f]/g,'').slice(0,80).replace(/'/g,"''");
}
/* Valores que van dentro de un LIKE: fuera los comodines de verdad. Se quitan
   % y [ porque ensanchan la búsqueda sin límite. El _ se queda: es un comodín
   de UN carácter, así que un guion bajo literal sigue encontrándose a sí mismo,
   y quitarlo rompía los correos (ana_maria@gmail.com pasaba a anamaria...). */
function sqLike(v){
  return sq(String(v==null?'':v).replace(/[%\[]/g,''));
}
/* Sin acentos y en minúsculas, para comparar nombres */
function fold(v){
  let s=String(v==null?'':v);
  try{ s=s.normalize('NFD').replace(/[\u0300-\u036f]/g,''); }catch(e){}
  return s.toLowerCase().trim();
}
function isDate(v){ return typeof v==='string' && /^\d{4}-\d{2}-\d{2}$/.test(v); }
/* Id numérico: villaid, ContactID. NO es un id de usuario. */
function isId(v){ return /^\d{1,12}$/.test(String(v==null?'':v).trim()); }
/* Id de usuario de Caspio: ocho caracteres, letras mayúsculas y cifras, con al
   menos una de cada (V25EJV4G, 30QKOKC6, 1U8GA927). Es el UserID de TaUsers, el
   UserID_asigned_alfanum de TaTasks y el KeyHolder_person de TaVillas: en el
   volcado del 2026-09-01 los 382 KeyHolder_person y los 75.283 alfanum tienen
   esta forma y ninguno es numérico. Los ids numéricos son de otra tabla
   (Cleanning_team y ContactID son ContactID), así que no valen aquí. */
function isUserId(v){
  const s=String(v==null?'':v).trim();
  return /^[A-Za-z0-9]{8}$/.test(s) && /[0-9]/.test(s) && /[A-Za-z]/.test(s);
}
function isPhone(v){ return /^[\d\s+().-]{6,}$/.test(String(v==null?'':v).trim()); }
function todayISO(){
  const d=new Date();
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function addDays(iso,n){
  if(!isDate(iso))return '';
  const d=new Date(iso+'T00:00:00'); d.setDate(d.getDate()+n);
  return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
}
function dOnly(v){ return String(v==null?'':v).split('T')[0]; }
function fmtDate(v){
  const s=dOnly(v); if(!isDate(s))return s||'—';
  const d=new Date(s+'T00:00:00');
  return isNaN(d)?s:d.toLocaleDateString('es-ES',{day:'2-digit',month:'2-digit',year:'numeric'});
}
function fmtShort(v){
  const s=dOnly(v); if(!isDate(s))return s||'—';
  return s.slice(8,10)+'/'+s.slice(5,7);
}
function fmtEUR(v){
  const n=parseFloat(v);
  return isNaN(n)?'—':n.toLocaleString('es-ES',{minimumFractionDigits:2,maximumFractionDigits:2})+' €';
}
/* Igual criterio que entradas-equipo: null = sin dato */
function isOk(val){
  if(val===null||val===undefined)return null;
  if(typeof val==='boolean')return val;
  if(typeof val==='number'){ if(val===0)return false; if(val===-1)return true; return val>0; }
  const s=String(val).trim().toLowerCase();
  if(!s)return null;
  return ['0','x','no','false','pendiente','n/a','na','null','none','–','-'].indexOf(s)<0;
}
function g(r,key){ const v=r[F[key]]; return (v===undefined||v===null)?'':v; }
/* Todo lo que viene del Worker se busca así: sin esto, type:"constructor" o
   "__proto__" devolvían una función del prototipo y se colaban en la URL. */
function own(map,key){
  const k=String(key==null?'':key);
  return Object.prototype.hasOwnProperty.call(map,k)?map[k]:undefined;
}

/* Enlaces: solo páginas de la lista blanca y parámetros codificados */
/* Marca para "este parámetro va en la URL, pero vacío". Las páginas miran
   p.has(clave), no su valor: tareas.html borra el usuario preseleccionado con
   u= vacío, y entradas-equipo deja de aplicar su ventana de fechas guardada
   con desde= y hasta= vacíos. Sin la marca, un valor vacío se caía de la URL
   y la página volvía a poner su preferencia encima de lo que pidió Mia. */
const EMPTY=typeof Symbol==='function'?Symbol('mia-vacio'):{mia:'vacio'};
function link(page,params){
  const base=own(PAGES,page); if(!base)return null;
  const qs=Object.keys(params||{})
    .filter(function(k){ const v=params[k]; return v===EMPTY||(v!==''&&v!=null); })
    .map(function(k){
      const v=params[k];
      return encodeURIComponent(k)+'='+(v===EMPTY?'':encodeURIComponent(v));
    })
    .join('&');
  return qs?base+'?'+qs:base;
}
function curPage(){ return location.pathname.split('/').pop(); }

/* ════════════════ SESIÓN ════════════════ */
/* El rol llega con mayúsculas y espacios en algunas páginas */
function myRole(){
  try{ return Auth&&Auth.role?String(Auth.role()||'').trim().toLowerCase():''; }
  catch(e){ return ''; }
}
function canSeePayments(){ return MIA_PAY_ROLES.indexOf(myRole())>=0; }
function hasSession(){
  try{
    if(typeof Auth==='undefined'||!Auth||!Auth.token)return false;
    if(!Auth.token())return false;
    return MIA_ALLOWED_ROLES.indexOf(myRole())>=0;
  }catch(e){ return false; }
}
function miaOff(){ try{ return sessionStorage.getItem(K_OFF)==='1'; }catch(e){ return false; } }
function setMiaOff(){ try{ sessionStorage.setItem(K_OFF,'1'); }catch(e){} }

/* ════════════════ J7 · LAS PÁGINAS DEL MENÚ DE QUIEN PREGUNTA ════════════════ */
/* El menú lo define nav.js, que carga todas las páginas del intranet:
   NAV_MENUS[rol] es una lista de {label,url,icon,children}. Mia la aplana y
   manda al Worker solo el nombre y la clave de cada página INTERNA, para que
   el Worker pueda decir "esta pregunta es el nombre de esta página".
   Reglas, en este orden:
    · Solo páginas del propio intranet: la URL acaba en .html y no lleva "://"
      (fuera los enlaces a Google Docs del bloque Equipo).
    · La clave es el nombre del archivo sin .html y solo minúsculas, cifras y
      guiones: eso deja fuera las páginas de prueba (XXtest1XX y compañía).
    · Login no se manda: no es una respuesta a ninguna pregunta.
    · Sin repetidas y con tope, para que la pregunta no engorde.
   Es la lista de ESTE rol: una página que su menú no tiene nunca se envía y
   por tanto nunca se enlaza. */
const PAGE_KEY_RE = /^[a-z0-9-]{1,40}$/;
/* G14: el último trozo de la url tiene que ser un nombre de archivo y nada
   más. Deja fuera "javascript:x.html" y cualquier ruta con signos raros. */
const PAGE_FILE_RE = /^[a-z0-9._-]+\.html$/i;
const PAGE_MAX    = 40;
const PAGE_DEPTH  = 4;   /* menús anidados: tope para no caminar en círculos */
const PAGE_SKIP   = ['login'];
function navMenus(){
  try{ if(window&&window.NAV_MENUS)return window.NAV_MENUS; }catch(e){}
  try{ if(typeof NAV_MENUS!=='undefined')return NAV_MENUS; }catch(e){}
  return null;
}
function menuPages(){
  if(!FEAT.page)return [];
  try{
    const menus=navMenus();
    if(!menus||typeof menus!=='object')return [];
    const menu=menus[myRole()];
    if(!Array.isArray(menu))return [];
    const out=[],seen={};
    const walk=function(items,depth){
      if(!Array.isArray(items)||depth>PAGE_DEPTH)return;
      for(let i=0;i<items.length;i++){
        const it=items[i];
        if(!it||typeof it!=='object')continue;
        if(out.length<PAGE_MAX){
          const url=String(it.url||'').trim();
          const label=String(it.label||'').trim();
          if(label&&url&&url.indexOf('://')<0&&url.indexOf('/')!==0&&url.indexOf('..')<0&&/\.html$/.test(url)){
            /* G14: la clave sale de un nombre de archivo de la lista blanca, y
               lo que se guarda como url es esa misma clave: nunca el texto que
               venía en el menú. */
            const file=url.split('/').pop();
            const key=PAGE_FILE_RE.test(file)?file.replace(/\.html$/i,''):'';
            if(key&&PAGE_KEY_RE.test(key)&&PAGE_SKIP.indexOf(key)<0&&!own(seen,key)){
              seen[key]=1;
              out.push({key:key,label:label,url:key+'.html'});
            }
          }
        }
        walk(it.children,depth+1);
      }
    };
    walk(menu,1);
    return out.slice(0,PAGE_MAX);
  }catch(e){ return []; }
}

/* ════════════════ CSS (solo lo nuevo — add-only) ════════════════ */
/* La fila NO es sticky: es un bloque normal debajo de la cabecera y se va con
   el scroll. Sin position, sin top y sin z-index no hay nada que empujar, así
   que ninguna barra de la página cambia de sitio. */
const CSS = `
.mia-row{background:#fff;border-bottom:1px solid var(--gray-2,#e8eaed);padding:6px 12px 5px}
.mia-row .mia-in{max-width:760px;margin:0 auto;display:flex;align-items:center;gap:8px}
.mia-row .mia-mk{width:30px;height:30px;flex-shrink:0}
.mia-field{flex:1;display:flex;align-items:center;height:44px;cursor:text;border:1.5px solid var(--gray-2,#e8eaed);border-radius:22px;padding:0 14px;background:var(--gray-1,#f4f5f7);min-width:0}
/* Anillo de foco con outline, no con borde: varias páginas hacen
   body.dark *{border-color:...!important} y se comían el borde del campo. */
.mia-field:focus-within{border-color:var(--red,#C8102E);background:#fff;outline:2px solid #9e0c24;outline-offset:2px}
/* 44 px de alto propios, no el 100% del hueco: con box-sizing:border-box el
   hueco interior del campo son 41 px y la zona tactil del input se quedaba
   corta. Sobresale 1,5 px por lado, y como es transparente no se ve. */
.mia-field input{flex:1;height:44px;box-sizing:border-box;border:none;background:transparent;font-family:inherit;font-size:16px;color:var(--gray-5,#2d3142);min-width:0;outline:none}
.mia-field input::placeholder{color:#5c6273}
.mia-go{box-sizing:border-box;height:44px;padding:0 14px;border:none;border-radius:22px;background:var(--red,#C8102E);color:#fff;font-family:Montserrat,sans-serif;font-size:13px;font-weight:800;letter-spacing:.3px;cursor:pointer;flex-shrink:0;display:inline-flex;align-items:center;justify-content:center;gap:0}
.mia-go:hover{background:var(--red-dark,#9e0c24)}
.mia-go .mia-go-i{display:none;width:20px;height:20px;flex-shrink:0}
/* Debajo de 480 px el botón es solo el icono, 44x44, y la marca sale de la
   fila: el campo gana casi 90 px, que son cinco o seis palabras más de la
   pregunta a la vista. El nombre sigue ahí para el lector de pantalla
   (aria-label) y para el ratón (title). */
@media (max-width:479px){
  .mia-row{padding:6px 8px 5px}
  .mia-row .mia-mk{display:none}
  .mia-go{width:44px;padding:0}
  .mia-go .mia-go-t{display:none}
  .mia-go .mia-go-i{display:block}
}

/* Aa: entra en la cabecera con el alto del botón de al lado, para que la
   cabecera no cambie de altura. El ::after le da 44x44 de zona táctil sin
   ocupar sitio. */
/* Aa: siempre dentro de la fila, 44x44 de verdad (no una zona táctil
   simulada), a 8 px de lo de al lado como el resto de la fila. */
@media (prefers-reduced-motion:reduce){.mia-row *,.mia-panel *{transition:none!important;animation:none!important;scroll-behavior:auto!important}}
.mia-aa{box-sizing:border-box;font-family:'Atkinson Hyperlegible','Open Sans',sans-serif;background:var(--gray-1,#f4f5f7);border:1.5px solid var(--gray-2,#e8eaed);color:#5c6273;width:44px;height:44px;border-radius:12px;font-size:13px;font-weight:700;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;padding:0;transition:background .15s,color .15s}
.mia-aa.on{background:var(--gray-5,#2d3142);border-color:var(--gray-5,#2d3142);color:#fff}

.mia-panel{display:none;background:#fff;border-bottom:2px solid var(--gray-2,#e8eaed);padding:12px 16px 14px;font-family:'Open Sans',sans-serif;font-size:16px;line-height:1.5;--mia-muted:#5c6273;color:var(--gray-5,#2d3142)}
.mia-panel.show{display:block}
.mia-panel .mia-in{max-width:760px;margin:0 auto;display:flex;flex-direction:column;gap:10px}
.mia-panel .mia-top{display:flex;align-items:center;gap:8px}
.mia-panel .mia-top .mia-mk{width:30px;height:30px;flex-shrink:0}
.mia-panel .mia-top .mia-q{flex:1;min-width:0;overflow-wrap:anywhere;word-break:break-word;font-size:16px;color:var(--mia-muted)}
.mia-panel .mia-top .mia-q b{color:var(--gray-5,#2d3142);font-weight:600}
.mia-panel .mia-close{width:44px;height:44px;border:1.5px solid var(--gray-2,#e8eaed);border-radius:50%;background:#fff;color:var(--mia-muted);font-size:16px;cursor:pointer;flex-shrink:0;padding:0}
.mia-panel .mchips{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.mia-panel .mchips .mia-lb{font-size:14px;font-weight:600;color:var(--mia-muted)}
/* El chip mide 44 px de alto y la equis ocupa 44x44 dentro de el: la zona
   tactil cumple el minimo sin que la fila de chips crezca. El disco visible
   sigue siendo de 26 px. box-sizing se pone aqui: hay paginas que no lo
   declaran globalmente. */
.mia-panel .mchip{box-sizing:border-box;display:inline-flex;align-items:center;gap:2px;font-size:16px;font-weight:600;color:var(--red,#C8102E);background:var(--red-light,#fce8eb);border:1.5px solid rgba(200,16,46,.25);border-radius:22px;padding:0 0 0 12px;min-width:0;max-width:100%;height:auto;min-height:44px;overflow-wrap:anywhere;word-break:break-word}
/* El margen negativo se come el borde del chip: una linea sigue midiendo 44
   exactos y la equis mantiene sus 44x44 de zona tactil. Si el texto dobla, el
   chip crece y la equis se queda arriba, a la vista. */
.mia-panel .mchip .mia-x{box-sizing:border-box;width:44px;height:44px;border:none;background:none;padding:0;margin:-1.5px 0;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0;align-self:flex-start}
.mia-panel .mchip .mia-x i{width:26px;height:26px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;background:rgba(200,16,46,.12);color:#9e0c24;font-size:13px;font-weight:900;line-height:1;font-style:normal}
.mia-panel .mia-note{min-width:0;overflow-wrap:anywhere;word-break:break-word;font-size:16px;color:var(--mia-muted);max-width:62ch}
.mia-panel .mcard{background:#fff;border:1px solid var(--gray-2,#e8eaed);border-radius:12px;box-shadow:0 1px 3px rgba(0,0,0,.06);overflow:hidden}
.mia-panel .mcard-h{display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--red,#C8102E);color:#fff}
.mia-panel .mcard-h .mia-t{font-family:Montserrat,sans-serif;font-size:16px;font-weight:800;text-transform:uppercase;letter-spacing:.3px;flex:1;min-width:0;overflow-wrap:anywhere;word-break:break-word;line-height:1.2}
.mia-panel .mcard-h .mia-id{font-family:Montserrat,sans-serif;font-size:14px;font-weight:800;background:rgba(255,255,255,.12);padding:3px 9px;border-radius:20px;min-width:0;max-width:100%;overflow-wrap:anywhere;word-break:break-word}
.mia-panel .mcard-b{padding:14px 14px 16px;display:flex;flex-direction:column;gap:12px}
.mia-panel .mia-kv{display:grid;grid-template-columns:100px 1fr;gap:8px 12px;font-size:16px;line-height:1.5}
.mia-panel .mia-kv .mia-k{font-size:14px;font-weight:600;color:var(--mia-muted);padding-top:2px}
.mia-panel .mia-kv .mia-v{min-width:0;overflow-wrap:anywhere;word-break:break-word;color:var(--gray-5,#2d3142)}
.mia-panel .mia-sec{font-family:Montserrat,sans-serif;font-size:15px;font-weight:700;color:var(--gray-5,#2d3142);padding-bottom:6px;border-bottom:1px solid var(--gray-2,#e8eaed);margin-bottom:8px}
.mia-panel .mia-states{display:flex;flex-wrap:wrap;gap:6px}
.mia-panel .mia-st{display:inline-flex;align-items:center;gap:5px;font-size:14px;font-weight:600;border-radius:22px;padding:6px 12px;min-height:36px;border:1.5px solid var(--gray-2,#e8eaed);background:#fff;color:var(--gray-5,#2d3142)}
.mia-panel .mia-st.ok{border-color:rgba(20,101,47,.35);background:var(--green-light,#e6f7ee);color:#14652f}
.mia-panel .mia-st.pend{border-color:rgba(138,69,0,.35);background:var(--orange-light,#fff4e0);color:#8a4500}
.mia-panel .mia-st.bad{border-color:rgba(158,12,36,.35);background:var(--red-light,#fce8eb);color:#9e0c24}
/* La tabla de pagos vive en su propio carril: con Aa y a 320 px no cabe, y
   antes empujaba el panel entero a lo ancho. */
.mia-panel .mia-payw{position:relative;width:100%;max-width:100%;overflow-x:auto;-webkit-overflow-scrolling:touch}
/* Aviso de que el carril se puede arrastrar. Solo se pinta cuando de verdad
   sobra ancho: lo pone el JS con la clase mia-scrolls. */
.mia-panel .mia-payw.mia-scrolls{padding-bottom:2px}
.mia-panel .mia-payhint{display:none;font-size:14px;color:var(--mia-muted);padding-top:4px}
.mia-panel .mia-payw.mia-scrolls+.mia-payhint{display:block}
/* La fecha repetida bajo el concepto solo se ve en pantallas muy estrechas. */
.mia-panel .mia-pay td.mia-c .mia-dsub{display:none;font-size:16px;color:var(--mia-muted)}
@media (max-width:359px){
  /* Sin sitio para tres columnas: la fecha se va debajo del concepto y quedan
     Concepto e Importe, que es lo que hay que leer. */
  .mia-panel .mia-pay{min-width:0}
  .mia-panel .mia-pay th.mia-d,.mia-panel .mia-pay td.mia-d{display:none}
  .mia-panel .mia-pay td.mia-c .mia-dsub{display:block}
}
/* Con Aa el texto es mayor, así que el corte llega antes: a 360-389 px las tres
   columnas ya no caben y la fecha se va debajo del concepto igual que a 320. */
@media (max-width:389px){
  body.easy .mia-panel .mia-pay{min-width:0}
  body.easy .mia-panel .mia-pay th.mia-d,
  body.easy .mia-panel .mia-pay td.mia-d{display:none}
  body.easy .mia-panel .mia-pay td.mia-c .mia-dsub{display:block}
}
.mia-panel .mia-pay{width:100%;min-width:min(100%,260px);border-collapse:collapse;font-size:16px;font-variant-numeric:tabular-nums}
.mia-panel .mia-pay th{font-size:14px;font-weight:600;color:var(--mia-muted);text-align:left;padding:9px 10px 9px 0;border-bottom:1px solid var(--gray-2,#e8eaed)}
.mia-panel .mia-pay td{padding:9px 10px 9px 0;border-bottom:1px solid var(--gray-1,#f4f5f7);vertical-align:top}
.mia-panel .mia-pay td.mia-n,.mia-panel .mia-pay th.mia-n{text-align:right;white-space:nowrap;padding-left:12px;padding-right:0}
.mia-panel .mia-pay td.mia-c{min-width:0;overflow-wrap:anywhere;word-break:break-word}
/* Anillo de foco propio en todos los mandos de Mia: no se hereda ni se
   depende del CSS de la página, que en varias no tiene ninguno. */
.mia-row .mia-go:focus-visible,
.mia-row .mia-aa:focus-visible,
.mia-panel .mia-close:focus-visible,
.mia-panel .mia-btn:focus-visible,
.mia-panel .mchip .mia-x:focus-visible,
.mia-panel .mia-vrow .mia-vmain:focus-visible{outline:2px solid #9e0c24;outline-offset:2px}
body.dark .mia-row .mia-go:focus-visible,
body.dark .mia-row .mia-aa:focus-visible,
body.dark .mia-panel .mia-close:focus-visible,
body.dark .mia-panel .mia-btn:focus-visible,
body.dark .mia-panel .mchip .mia-x:focus-visible,
body.dark .mia-panel .mia-vrow .mia-vmain:focus-visible{outline-color:#ff9fae}
.mia-panel .mia-btns{display:flex;flex-wrap:wrap;gap:8px}
.mia-panel .mia-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;height:auto;min-height:44px;padding:8px 16px;border-radius:8px;border:1.5px solid var(--gray-2,#e8eaed);background:#fff;color:var(--gray-5,#2d3142);font-family:Montserrat,sans-serif;font-size:14px;min-width:0;overflow-wrap:anywhere;font-weight:800;letter-spacing:.2px;cursor:pointer;text-decoration:none;text-transform:uppercase}
.mia-panel .mia-btn.mia-primary{background:var(--red,#C8102E);border-color:var(--red,#C8102E);color:#fff}
.mia-panel .mia-list{display:flex;flex-direction:column;gap:8px}
.mia-panel .mia-suggest{margin-top:10px}
.mia-panel .mia-vrow{display:flex;flex-wrap:wrap;align-items:center;gap:8px 10px;padding:8px 12px;border:1px solid var(--gray-2,#e8eaed);border-radius:10px;background:#fff}
.mia-panel .mia-vrow .mia-vmain{flex:1 1 55%;min-width:0;overflow-wrap:anywhere;word-break:break-word;display:flex;flex-wrap:wrap;align-items:center;gap:2px 10px;min-height:44px;padding:0;border:none;background:none;text-align:left;font-family:inherit;font-size:15px;color:var(--gray-5,#2d3142);text-decoration:none;cursor:pointer}
.mia-panel .mia-vrow .mia-n{font-family:Montserrat,sans-serif;font-weight:800;font-size:16px;min-width:0;overflow-wrap:anywhere;word-break:break-word}
.mia-panel .mia-vrow .mia-m{font-size:16px;min-width:0;overflow-wrap:anywhere;word-break:break-word;color:var(--mia-muted)}
.mia-panel .mia-foot{font-size:13px;color:var(--mia-muted)}
@media (max-width:480px){
  .mia-panel .mia-vrow .mia-m{flex-basis:100%}
  .mia-panel .mia-vrow .mia-btn{flex:1 1 100%}
}

/* ── Modo noche. Las páginas hacen body.dark *{color:#fff!important}, así que
   todo color que no sea blanco necesita !important y más especificidad. ── */
body.dark .mia-row{background:#16161e;border-bottom-color:rgba(255,255,255,.10)}
body.dark .mia-field{background:#1e1e26;border-color:rgba(255,255,255,.16)}
body.dark .mia-field:focus-within{background:#252535;border-color:var(--red,#C8102E);outline-color:#ff9fae}
body.dark .mia-field input::placeholder{color:#a7adbb!important}
body.dark .mia-go{background:var(--red,#C8102E)}
body.dark .mia-aa{background:#1e1e26;border-color:rgba(255,255,255,.18);color:#c9cdd8!important}
body.dark .mia-aa.on{background:#f4f5f7;border-color:#f4f5f7;color:#16161e!important}
body.dark .mia-panel{background:#16161e;border-bottom-color:rgba(255,255,255,.16)}
/* Los colores claros se ponen aqui, no se heredan del body.dark *{color:#fff}
   de la pagina: hay paginas con modo noche y paginas sin el. */
body.dark .mia-field input,
body.dark .mia-panel,
body.dark .mia-panel .mia-top .mia-q b,
body.dark .mia-panel .mia-close,
body.dark .mia-panel .mia-kv .mia-v,
body.dark .mia-panel .mia-sec,
body.dark .mia-panel .mia-st,
body.dark .mia-panel .mia-pay td,
body.dark .mia-panel .mia-btn,
body.dark .mia-panel .mia-vrow .mia-vmain,
body.dark .mia-panel .mia-vrow .mia-n{color:#fff!important}
body.dark .mia-panel .mia-top .mia-q,
body.dark .mia-panel .mia-note,
body.dark .mia-panel .mia-foot,
body.dark .mia-panel .mia-kv .mia-k,
body.dark .mia-panel .mchips .mia-lb,
body.dark .mia-panel .mia-pay th,
body.dark .mia-panel .mia-vrow .mia-m{color:#c9cdd8!important}
body.dark .mia-panel .mia-close{background:#1e1e26;border-color:rgba(255,255,255,.20)}
body.dark .mia-panel .mcard{background:#1e1e26;border-color:rgba(255,255,255,.14);box-shadow:none}
body.dark .mia-panel .mia-sec{border-bottom-color:rgba(255,255,255,.18)}
body.dark .mia-panel .mia-st{background:#252535;border-color:rgba(255,255,255,.18)}
body.dark .mia-panel .mia-st.ok{background:rgba(30,158,78,.28);border-color:rgba(30,158,78,.5);color:#b6f2ce!important}
body.dark .mia-panel .mia-st.pend{background:rgba(224,123,0,.30);border-color:rgba(224,123,0,.5);color:#ffd9a3!important}
body.dark .mia-panel .mia-st.bad{background:rgba(200,16,46,.30);border-color:rgba(200,16,46,.5);color:#ffc2cb!important}
body.dark .mia-panel .mchip{background:rgba(200,16,46,.24);border-color:rgba(200,16,46,.5);color:#ffc2cb!important}
body.dark .mia-panel .mchip .mia-x i{background:rgba(255,255,255,.16);color:#fff!important}
body.dark .mia-panel .mia-btn{background:#252535;border-color:rgba(255,255,255,.20)}
body.dark .mia-panel .mia-btn.mia-primary{background:var(--red,#C8102E);border-color:var(--red,#C8102E)}
body.dark .mia-panel .mia-vrow{background:#252535;border-color:rgba(255,255,255,.14)}
body.dark .mia-panel .mia-pay td{border-bottom-color:rgba(255,255,255,.10)}
body.dark .mia-panel .mia-pay th{border-bottom-color:rgba(255,255,255,.18)}

/* ── Aa: texto más legible. Opt-in, apagado por defecto.
   SOLO afecta a lo de Mia. Ni una regla toca un elemento de la página: quien
   no usa a Mia no ve cambiar nada, y quien la usa tampoco ve moverse su
   cabecera ni sus filtros. ── */
body.easy .mia-row,
body.easy .mia-panel{font-family:'Atkinson Hyperlegible','Open Sans',sans-serif}
/* Con Aa TODO el texto de Mia sube: la pregunta, las notas, los valores de la
   ficha, la tabla de pagos, los nombres de la lista, sus datos, los botones y
   el titulo de la ficha. Ni una regla toca la pagina. */
body.easy .mia-field input{font-size:19px}
body.easy .mia-panel{font-size:18px}
body.easy .mia-panel .mia-note,
body.easy .mia-panel .mia-top .mia-q,
body.easy .mia-panel .mia-kv,
body.easy .mia-panel .mia-kv .mia-k,
body.easy .mia-panel .mia-kv .mia-v,
body.easy .mia-panel .mia-sec,
body.easy .mia-panel .mia-st,
body.easy .mia-panel .mia-pay,
body.easy .mia-panel .mia-pay td,
body.easy .mia-panel .mchip,
body.easy .mia-panel .mia-vrow,
body.easy .mia-panel .mia-vrow .mia-n,
body.easy .mia-panel .mia-vrow .mia-m,
body.easy .mia-panel .mia-btn,
body.easy .mia-panel .mia-foot{font-family:'Atkinson Hyperlegible','Open Sans',sans-serif}
body.easy .mia-panel .mia-note,
body.easy .mia-panel .mia-top .mia-q,
body.easy .mia-panel .mia-kv,
body.easy .mia-panel .mia-kv .mia-v,
body.easy .mia-panel .mia-pay,
body.easy .mia-panel .mia-pay td,
body.easy .mia-panel .mia-vrow .mia-n,
body.easy .mia-panel .mia-vrow .mia-m,
body.easy .mia-panel .mchip,
body.easy .mia-panel .mia-st{font-size:18px}
body.easy .mia-panel .mcard-h .mia-t{font-size:18px}
body.easy .mia-panel .mcard-h .mia-id{font-size:16px}
body.easy .mia-panel .mia-btn{font-size:16px}
body.easy .mia-panel .mia-sec{font-size:17px}
body.easy .mia-panel .mia-kv .mia-k,
body.easy .mia-panel .mchips .mia-lb,
body.easy .mia-panel .mia-pay th,
body.easy .mia-panel .mia-payhint{font-size:16px}
/* La fecha de debajo del concepto mide lo mismo que la columna a la que
   sustituye: 16 sin Aa, 18 con Aa. */
body.easy .mia-panel .mia-pay td.mia-c .mia-dsub{font-size:18px}
body.easy .mia-panel .mia-foot{font-size:15px}
body.easy .mia-row .mia-go{font-size:15px}
body.easy .mia-panel .mia-btn,
body.easy .mia-panel .mcard-h .mia-t,
body.easy .mia-go{text-transform:none;letter-spacing:0}
.mia-panel .mia-retry{margin-top:8px}

/* ── J3: Avisar de un fallo. Todo cuelga de .mia-panel y nada toca la página.
   El cuadro es de teléfono: ancho completo, seis líneas, letra de 16 px (por
   debajo de 16 el navegador del móvil hace zoom al escribir) y los dos
   botones van en .mia-btns, que ya se reparte en varias líneas. ── */
.mia-panel .mia-report{margin-top:6px;padding:6px 2px;min-height:44px;border:none;background:none;font-family:inherit;font-size:13px;color:var(--mia-muted);text-decoration:underline;cursor:pointer}
.mia-panel .mia-rbox{margin-top:8px;display:flex;flex-direction:column;gap:8px}
.mia-panel .mia-rta{width:100%;box-sizing:border-box;padding:10px;border:1.5px solid var(--gray-2,#e8eaed);border-radius:8px;background:#fff;color:var(--gray-5,#2d3142);font-family:inherit;font-size:16px;line-height:1.4;resize:vertical}
.mia-panel .mia-report:focus-visible,
.mia-panel .mia-rta:focus-visible{outline:2px solid #9e0c24;outline-offset:2px}
body.dark .mia-panel .mia-report{color:#c9cdd8!important}
body.dark .mia-panel .mia-rta{background:#1e1e26;border-color:rgba(255,255,255,.20);color:#fff!important}
body.dark .mia-panel .mia-report:focus-visible,
body.dark .mia-panel .mia-rta:focus-visible{outline-color:#ff9fae}
body.easy .mia-panel .mia-report,
body.easy .mia-panel .mia-rta{font-family:'Atkinson Hyperlegible','Open Sans',sans-serif}
body.easy .mia-panel .mia-report{font-size:15px}
body.easy .mia-panel .mia-rta{font-size:18px}

/* J5 — tarjeta "qué falta" de las entradas de un día. Una fila por reserva y
   sus seis marcas en pastillas que doblan de línea en el móvil. La pastilla
   dice el estado con palabras ("pendiente", "sin dato"), no solo con color:
   se lee igual en blanco y negro y con el color apagado. */
.mia-panel .mia-rdrow{display:flex;flex-direction:column;gap:8px;padding:10px 12px;border:1px solid var(--gray-2,#e8eaed);border-radius:10px;background:#fff}
.mia-panel .mia-rdrow .mia-rd-n{font-family:Montserrat,sans-serif;font-weight:800;font-size:16px;min-width:0;overflow-wrap:anywhere;word-break:break-word;color:var(--gray-5,#2d3142)}
.mia-panel .mia-rdrow .mia-rd-m{font-size:14px;min-width:0;overflow-wrap:anywhere;word-break:break-word;color:var(--mia-muted)}
.mia-panel .mia-rdrow .mia-st{font-size:13px;padding:5px 10px;min-height:32px}
/* Sin dato: borde de rayas y gris oscuro. Nunca verde: un campo vacío no es
   un trabajo hecho. */
.mia-panel .mia-st.na{border-style:dashed;border-color:#5c6273;background:#fff;color:#3d4356}
body.dark .mia-panel .mia-rdrow{background:#252535;border-color:rgba(255,255,255,.14)}
body.dark .mia-panel .mia-rdrow .mia-rd-n{color:#fff!important}
body.dark .mia-panel .mia-rdrow .mia-rd-m{color:#c9cdd8!important}
body.dark .mia-panel .mia-st.na{background:#1e1e26;border-color:#a7adbb;color:#e3e6ee!important}
body.easy .mia-panel .mia-rdrow .mia-rd-n,
body.easy .mia-panel .mia-rdrow .mia-rd-m{font-family:'Atkinson Hyperlegible','Open Sans',sans-serif;font-size:18px}

/* J6 — tareas con incidencia. Una fila por tarea, en columna: en un móvil
   estrecho nada se sale ni se corta, y en pantalla ancha ocupa el mismo carril
   que el resto del panel. Mismos colores y bordes que .mia-vrow: no hay ni un
   color nuevo. */
.mia-panel .mia-inc{display:flex;flex-direction:column;align-items:flex-start;gap:6px;min-width:0;padding:10px 12px;border:1px solid var(--gray-2,#e8eaed);border-radius:10px;background:#fff}
.mia-panel .mia-inc .mia-inc-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 10px;width:100%;min-width:0}
.mia-panel .mia-inc .mia-inc-v{font-family:Montserrat,sans-serif;font-weight:800;font-size:16px;min-width:0;overflow-wrap:anywhere;word-break:break-word;color:var(--gray-5,#2d3142)}
.mia-panel .mia-inc .mia-inc-d{font-size:14px;color:var(--mia-muted);white-space:nowrap}
.mia-panel .mia-inc .mia-inc-n{font-size:16px;font-weight:600;width:100%;min-width:0;overflow-wrap:anywhere;word-break:break-word;color:var(--gray-5,#2d3142)}
.mia-panel .mia-inc .mia-inc-t{font-size:16px;line-height:1.5;width:100%;min-width:0;overflow-wrap:anywhere;word-break:break-word;color:var(--gray-5,#2d3142)}
.mia-panel .mia-inc .mia-inc-m{display:flex;flex-wrap:wrap;gap:2px 10px;width:100%;min-width:0;overflow-wrap:anywhere;word-break:break-word;font-size:14px;color:var(--mia-muted)}
.mia-panel .mia-inc .mia-btn{align-self:stretch}
@media (min-width:481px){ .mia-panel .mia-inc .mia-btn{align-self:flex-start} }
body.dark .mia-panel .mia-inc{background:#252535;border-color:rgba(255,255,255,.14)}
body.dark .mia-panel .mia-inc .mia-inc-v,
body.dark .mia-panel .mia-inc .mia-inc-n,
body.dark .mia-panel .mia-inc .mia-inc-t{color:#fff!important}
body.dark .mia-panel .mia-inc .mia-inc-d,
body.dark .mia-panel .mia-inc .mia-inc-m{color:#c9cdd8!important}
body.easy .mia-panel .mia-inc,
body.easy .mia-panel .mia-inc .mia-inc-v,
body.easy .mia-panel .mia-inc .mia-inc-n,
body.easy .mia-panel .mia-inc .mia-inc-t,
body.easy .mia-panel .mia-inc .mia-inc-d,
body.easy .mia-panel .mia-inc .mia-inc-m{font-family:'Atkinson Hyperlegible','Open Sans',sans-serif}
body.easy .mia-panel .mia-inc .mia-inc-v,
body.easy .mia-panel .mia-inc .mia-inc-n,
body.easy .mia-panel .mia-inc .mia-inc-t{font-size:18px}
body.easy .mia-panel .mia-inc .mia-inc-d,
body.easy .mia-panel .mia-inc .mia-inc-m{font-size:16px}
`;

/* ════════════════ ESTADO DEL MÓDULO ════════════════ */
let ROW=null, PANEL=null, BODY=null, INPUT=null, AABTN=null, ANCHOR=null, GOBTN=null;
/* J8: el número de la pregunta que se está respondiendo. Sube con cada
   pregunta y al cerrar el panel. Toda respuesta que llegue con otro número se
   tira: nunca se pinta la respuesta de una pregunta que ya no está. */
let REQ=0;
let BUSY=false;         /* J8: hay una pregunta en marcha (campo y botón bloqueados) */
/* G4: el último fallo de una lectura, para saber si fue la sesión caducada.
   Se pone en cada catch de lectura y se lee en esa misma pregunta. */
let LAST_KO=null;
/* shareHref y shareChips (J3) los pone cada respuesta y solo sirven para el
   texto del aviso de fallo: el enlace de filtros y los chips que se ven. */
let ST={ q:'', shareHref:'', shareChips:[] };
let RPT=null;           // J3: aviso de fallo abierto ahora mismo, si lo hay
/* J8: foto del estado (pregunta, enlace y chips) de la respuesta que se está
   viendo. La toma say() al pintar. Una cadena vieja puede escribir en ST
   antes de que su say se caiga, así que el aviso de fallo lee la foto y no el
   estado de ahora: dice lo que hay en la pantalla. */
let SNAP=null;
let USERS=null;         // mapa UserID → Name (solo como último recurso, para la ficha)
let downShown=false;

/* J8: true cuando esta respuesta ya no es la de la pregunta que está en
   pantalla, o el panel se ha cerrado mientras venía de camino. */
function stale(req){ return !!FEAT.seq && req!==undefined && req!==REQ; }
/* J8: mientras se responde, el campo y el botón se bloquean. Enter y el clic
   no hacen nada hasta que llega la respuesta o el aviso de fallo. Con
   FEAT.seq=0 no se bloquea nada y todo queda como antes. */
function setBusy(on){
  BUSY=!!on;
  const lock=!!FEAT.seq&&BUSY;
  try{ if(INPUT)INPUT.disabled=lock; }catch(e){}
  try{ if(GOBTN)GOBTN.disabled=lock; }catch(e){}
}
function locked(){ return !!FEAT.seq&&BUSY; }

/* ════════════════ TEXTO MÁS LEGIBLE (Aa) ════════════════ */
let fontLoaded=false;
function loadEasyFont(){
  /* Una sola hoja de la fuente por página, aunque se encienda y se apague
     varias veces o el módulo se cargue dos veces. */
  if(fontLoaded||document.getElementById('miaEasyFont'))return;
  fontLoaded=true;
  const l=document.createElement('link');
  l.id='miaEasyFont';
  l.rel='stylesheet';
  l.href='https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:wght@400;700&display=swap';
  document.head.appendChild(l);
}
/* Se escribe en el almacenamiento SOLO si el valor cambia: abrir una página
   con el Aa ya encendido no escribe nada. */
function setEasy(on){
  const v=!!on;
  document.body.classList.toggle('easy',v);
  if(AABTN){ AABTN.classList.toggle('on',v); AABTN.setAttribute('aria-pressed',v?'true':'false'); }
  if(v)loadEasyFont();
  try{
    const want=v?'1':'0';
    if(localStorage.getItem(K_EASY)!==want)localStorage.setItem(K_EASY,want);
  }catch(e){}
}
function easyOn(){ try{ return localStorage.getItem(K_EASY)==='1'; }catch(e){ return false; } }

/* ════════════════ MONTAJE ════════════════ */
function anchor(){
  return document.querySelector('nav.top-nav')
      || document.querySelector('nav.wp-nav')
      || document.querySelector('header')
      || document.querySelector('nav');
}
function buildRow(){
  const row=E('div','mia-row'); row.id='miaRow';
  const inn=E('div','mia-in');
  const mk=E('span'); mk.innerHTML=MARK; inn.appendChild(mk.firstChild);
  /* <label for>: el campo entero reenvia el toque al input, asi que la zona
     tactil es el rectangulo de 44 px que se ve, no solo el texto. */
  const field=E('label','mia-field');
  field.setAttribute('for','miaInput');
  const inp=document.createElement('input');
  inp.type='text'; inp.id='miaInput'; inp.autocomplete='off';
  inp.setAttribute('placeholder',T.ph); inp.setAttribute('aria-label',T.ph);
  inp.addEventListener('keydown',function(ev){
    /* J8: con una pregunta en marcha, Enter no hace nada. */
    if(ev.key==='Enter'){ ev.preventDefault(); if(locked())return; onAsk(); }
  });
  field.appendChild(inp);
  /* El botón va FUERA del campo: los dos miden 44 px de alto y uno de 44
     dentro de otro de 44 no cabe. Lleva el texto y una flecha; el CSS enseña
     uno u otro según el ancho. La flecha es un SVG en línea, no un emoji: un
     emoji cambia de dibujo en cada sistema y no se puede colorear. */
  const go=E('button','mia-go'); go.type='button';
  go.appendChild(E('span','mia-go-t',T.go));
  const gi=E('span','mia-go-i');
  gi.innerHTML='<svg viewBox="0 0 20 20" width="20" height="20" fill="none" stroke="currentColor" '
    +'stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">'
    +'<path d="M3.5 10h12"/><path d="M10.5 5l5 5-5 5"/></svg>';
  go.appendChild(gi);
  go.setAttribute('aria-label',T.go);
  go.title=T.go;
  go.addEventListener('click',function(){ if(locked())return; onAsk(); });   /* J8 */
  inn.appendChild(field); inn.appendChild(go);
  row.appendChild(inn);
  INPUT=inp; GOBTN=go;
  return row;
}
function buildPanel(){
  const p=E('div','mia-panel'); p.id='miaPanel';
  p.setAttribute('aria-live','polite');
  p.setAttribute('role','region');
  p.setAttribute('aria-label',T.panelLabel);
  const inn=E('div','mia-in'); inn.id='miaPanelIn';
  p.appendChild(inn); BODY=inn;
  return p;
}
function buildAa(){
  const b=E('button','mia-aa','Aa');
  b.type='button'; b.id='miaAa'; b.title=T.aa; b.setAttribute('aria-label',T.aa);
  b.setAttribute('aria-pressed','false');
  b.addEventListener('click',function(){ setEasy(!document.body.classList.contains('easy')); });
  return b;
}
/* El Aa vive SOLO en la fila de Mia, a 44x44 y a 8 px de lo de al lado. En la
   cabecera de la página no entra nunca: allí robaba sitio al título, movía los
   botones y en pantallas estrechas hacía crecer la cabecera. Con el botón
   dentro de la fila, la cabecera de cualquier página queda idéntica a como
   estaba y no hay nada que medir ni que recolocar al cambiar el tamaño. */
function placeAa(){
  AABTN=buildAa();
  AABTN.classList.add('mia-aa-row');
  const inn=ROW.querySelector('.mia-in');
  (inn||ROW).appendChild(AABTN);
}
/* Al retirar la fila se va todo lo de Mia: el campo, el panel y el botón Aa,
   que vive dentro de la fila. Como el Aa desaparece, body.easy se quita
   también —si no, la página se quedaría con el texto grande y sin botón para
   apagarlo—, pero la preferencia guardada NO se toca: en la próxima página con
   Mia vuelve encendido. */
function hideRow(keepPanel){
  /* El panel solo se queda si tiene algo que enseñar (el aviso de caída).
     Un #miaPanel vacío no se deja en la página. */
  const keep=keepPanel&&PANEL&&PANEL.classList.contains('show')&&BODY&&BODY.childNodes.length>0;
  if(AABTN&&AABTN.parentNode)AABTN.parentNode.removeChild(AABTN);
  /* G3: si el panel se queda, el botón Aa y el texto grande se quedan con él.
     Un fallo de un momento no puede dejar a nadie sin el texto legible: el
     botón se muda al panel, que es lo único de Mia que sigue en la página. */
  if(keep&&AABTN){
    BODY.appendChild(AABTN);
  }else{
    AABTN=null;
    document.body.classList.remove('easy');
  }
  if(ROW&&ROW.parentNode)ROW.parentNode.removeChild(ROW);
  ROW=null; INPUT=null; GOBTN=null;
  if(!keep){
    if(PANEL&&PANEL.parentNode)PANEL.parentNode.removeChild(PANEL);
    PANEL=null; BODY=null;
    unbindEsc();
  }
}

function mount(){
  if(!hasSession())return;
  if(miaOff())return;
  const a=anchor();
  if(!a||!a.parentNode)return;
  ANCHOR=a;

  const style=E('style'); style.id='miaStyles'; style.textContent=CSS;
  document.head.appendChild(style);

  ROW=buildRow();
  PANEL=buildPanel();
  a.parentNode.insertBefore(ROW,a.nextSibling);
  ROW.parentNode.insertBefore(PANEL,ROW.nextSibling);
  bindEsc();
  placeAa();

  if(easyOn())setEasy(true);
}

/* ════════════════ PANEL ════════════════ */
/* Escape cierra el panel desde cualquier parte de la pagina: un solo
   escuchador en document, puesto una vez al montar y quitado al soltar el
   panel. Va en fase de captura para que llegue aunque la pagina pare el
   evento antes de que suba, y solo hace algo con el panel abierto: con el
   panel cerrado no se toca el Escape de la pagina. */
let ESCH=null;
/* J3: cierra el cuadro del aviso de fallo si está abierto. Devuelve true solo
   cuando ha cerrado algo, para que el Escape no siga hasta el panel. */
function closeReport(){
  if(!RPT)return false;
  const r=RPT; RPT=null;
  if(r.box&&r.box.parentNode)r.box.parentNode.removeChild(r.box);
  if(r.btn){
    r.btn.setAttribute('aria-expanded','false');
    try{ r.btn.focus(); }catch(e){}
  }
  return true;
}
function bindEsc(){
  if(ESCH)return;
  ESCH=function(ev){
    if(ev.key!=='Escape'&&ev.key!=='Esc')return;
    if(!PANEL||!PANEL.classList.contains('show'))return;
    /* G12: el Escape solo se para cuando venía de dentro de lo de Mia. Si el
       foco está en un modal de la página, el modal se queda con su Escape. */
    const tg=ev.target;
    const mio=!!(tg&&((PANEL&&PANEL.contains&&PANEL.contains(tg))||(ROW&&ROW.contains&&ROW.contains(tg))));
    if(mio)ev.stopPropagation();
    /* J3: con el aviso de fallo abierto, el primer Escape solo cierra el
       aviso. El siguiente cierra el panel, como siempre. */
    if(FEAT.report&&closeReport())return;
    closePanel();
  };
  document.addEventListener('keydown',ESCH,true);
}
function unbindEsc(){
  if(!ESCH)return;
  document.removeEventListener('keydown',ESCH,true);
  ESCH=null;
}
function openPanel(){ if(PANEL)PANEL.classList.add('show'); }
function closePanel(){
  /* J8: al cerrar sube el número de la pregunta, así una respuesta que venga
     de camino se tira y el panel se queda cerrado. El campo se desbloquea. */
  if(FEAT.seq){ REQ++; setBusy(false); }
  if(PANEL)PANEL.classList.remove('show');
  if(BODY)BODY.textContent='';
  /* Si la fila ya no está (Worker caído) el panel era lo último de Mia en la
     página: al cerrarlo se va el nodo, se va la hoja de estilos y se suelta el
     escuchador de Escape, que a partir de ahí es solo de la página. */
  if(!ROW){
    if(PANEL&&PANEL.parentNode)PANEL.parentNode.removeChild(PANEL);
    PANEL=null; BODY=null;
    const st=document.getElementById('miaStyles');
    if(st&&st.parentNode)st.parentNode.removeChild(st);
    /* La hoja de la fuente del Aa también se va: sin estilos de Mia ya no la
       usa nadie. Si Mia vuelve a montarse con el Aa encendido, loadEasyFont la
       pide otra vez, y como comprueba por id sigue habiendo una sola por
       carga de página. */
    const ff=document.getElementById('miaEasyFont');
    if(ff&&ff.parentNode)ff.parentNode.removeChild(ff);
    fontLoaded=false;
    /* G3: el botón Aa se había mudado al panel; con el panel se va, así que el
       texto grande se apaga también. La preferencia guardada no se toca. */
    AABTN=null;
    document.body.classList.remove('easy');
    unbindEsc();
  }
}
function clearPanel(){ if(BODY)BODY.textContent=''; RPT=null; /* J3 */ }

function panelHead(){
  const top=E('div','mia-top');
  const mk=E('span'); mk.innerHTML=MARK; top.appendChild(mk.firstChild);
  const q=E('div','mia-q');
  q.appendChild(document.createTextNode(T.asked+' '));
  q.appendChild(E('b',null,ST.q));
  top.appendChild(q);
  const x=E('button','mia-close','✕');
  x.type='button'; x.title=T.close; x.setAttribute('aria-label',T.close);
  x.addEventListener('click',closePanel);
  top.appendChild(x);
  return top;
}
/* ── J3: AVISAR DE UN FALLO ──
   El texto sale de CUATRO cosas y de ninguna más: la página, la pregunta que
   se escribió, los chips de esta respuesta y el enlace de filtros. Nunca de
   una fila leída de Caspio: ahí van nombres de inquilinos. Mia no manda nada
   ni guarda nada; la persona copia el texto o lo abre en WhatsApp y elige
   ella el chat, por eso el enlace de WhatsApp no lleva ningún número. */
function reportText(snap){
  /* snap = la foto de la respuesta que se ve. Sin foto, el estado de ahora. */
  const s=snap||{q:ST.q,shareHref:ST.shareHref,shareChips:ST.shareChips};
  const ch=(s.shareChips||[]).filter(Boolean).join(', ');
  return [
    T.rptTitle,
    T.rptPage+' '+curPage(),
    T.rptQ+' '+String(s.q||''),
    T.rptChips+' '+(ch||T.rptNone),
    T.rptLink+' '+(s.shareHref||'-'),
    T.rptExpect,
    T.rptGot
  ].join('\n');
}
function waHref(txt){ return 'https://wa.me/?text='+encodeURIComponent(String(txt==null?'':txt)); }
function reportBox(snap){
  const box=E('div','mia-rbox');
  const ta=document.createElement('textarea');
  ta.className='mia-rta'; ta.rows=6;
  ta.setAttribute('aria-label',T.rptLabel);
  ta.value=reportText(snap);
  box.appendChild(ta);
  const btns=E('div','mia-btns');
  const cp=E('button','mia-btn',T.rptCopy); cp.type='button';
  cp.addEventListener('click',function(){
    const txt=ta.value;
    const fb=function(){
      try{ ta.focus(); ta.select(); document.execCommand('copy'); }catch(e){}
    };
    try{
      if(navigator.clipboard&&navigator.clipboard.writeText){
        const p=navigator.clipboard.writeText(txt);
        if(p&&p.catch)p.catch(fb);
      }else fb();
    }catch(e){ fb(); }
    cp.textContent=T.rptCopied;
    setTimeout(function(){ cp.textContent=T.rptCopy; },2000);
  });
  btns.appendChild(cp);
  /* Enlace de verdad, no una ventana abierta por código: así el teléfono abre
     WhatsApp y ningún bloqueador de ventanas se mete. El destino se recalcula
     en cada tecla, para que lo que la persona añade viaje también. */
  const wa=btn(T.rptWa,waHref(ta.value),true);
  wa.setAttribute('target','_blank');
  wa.setAttribute('rel','noopener');
  ta.addEventListener('input',function(){ wa.setAttribute('href',waHref(ta.value)); });
  btns.appendChild(wa);
  box.appendChild(btns);
  return box;
}
function reportBlock(snap){
  /* Sin foto por parámetro vale la que acaba de tomar say(). */
  const snp=snap||SNAP;
  const wrap=E('div','mia-rwrap');
  const b=E('button','mia-report',T.rptOpen);
  b.type='button';
  b.setAttribute('aria-expanded','false');
  wrap.appendChild(b);
  b.addEventListener('click',function(){
    if(RPT){ closeReport(); return; }
    const box=reportBox(snp);
    wrap.appendChild(box);
    RPT={box:box,btn:b};
    b.setAttribute('aria-expanded','true');
    const ta=box.querySelector('textarea');
    if(ta)try{ ta.focus(); }catch(e){}
  });
  return wrap;
}
function say(node,req){
  /* J8: la respuesta de una pregunta anterior no pisa la de ahora, y una que
     llega con el panel ya cerrado no lo vuelve a abrir. */
  if(stale(req))return;
  /* J8: la foto de ESTA respuesta, antes de pintarla. */
  SNAP={q:ST.q,shareHref:ST.shareHref,shareChips:(ST.shareChips||[]).slice()};
  /* El panel puede haberse ido entre la pregunta y la respuesta (Worker caído
     y el usuario cierra el aviso). Entonces no hay dónde escribir: se calla. */
  if(!BODY||!PANEL)return;
  clearPanel();
  BODY.appendChild(panelHead());
  if(node)BODY.appendChild(node);
  BODY.appendChild(E('div','mia-foot',T.onlyRead));
  if(FEAT.report)BODY.appendChild(reportBlock());   /* J3 */
  openPanel();
}
function note(txt){ return E('div','mia-note',txt); }

/* ════════════════ CHIPS ════════════════ */
/* Los chips se construyen SIEMPRE con lo que ha llegado a la URL o a la
   consulta. Lo demás va a "No pude aplicar". */
const CHIP_LABELS = {
  code:'Reserva', guest:'Inquilino', villa:'Villa', check_in_from:'Desde', check_in_to:'Hasta',
  stay_on:'Está el', manager:'Manager', source:'Source', cleaner:'Limpieza', tipo:'Tipo',
  type:'Tipo', status:'Estado', user:'Usuario', from:'Desde', to:'Hasta',
  urgent:'Urgente', important:'Importante', pax:'Plazas', pool:'Piscina',
  noauto:'Sin automáticas',
  ctx:T.ctxChip,   /* J1: el código no lo dijo la pregunta, lo dice la página */
  unit:'Unidad',
  incident:'Con incidencia'   /* J6 */
};
/* Quitar un chip borra su filtro. El de la reserva de la página (J1) borra el
   código Y apunta que el usuario no la quiere: al repintar no se vuelve a
   meter sola. Para cualquier otra clave hace exactamente lo de siempre. */
function dropFilter(f,k){
  if(k==='ctx'){ delete f.code; f.ctxOn=false; f.ctxOff=true; return; }
  delete f[k];
}
function chipText(k,v){
  const lbl=own(CHIP_LABELS,k)||k;
  if(k==='stay_on')return lbl+' '+fmtShort(v);
  if(v===true)return lbl;
  if(isDate(v))return lbl+': '+fmtDate(v);
  return lbl+': '+v;
}
/* J3: los mismos textos que se ven en los chips, en una lista de cadenas,
   para el aviso de fallo. Mismo filtro que chipsBlock: lo que no se pinta
   tampoco se cuenta. */
function chipTexts(chips){
  return Object.keys(chips||{}).filter(function(k){
    const v=chips[k];
    return v!==''&&v!=null&&v!==false&&!(Array.isArray(v)&&!v.length);
  }).map(function(k){ return chipText(k,chips[k]); });
}
function chipsBlock(chips,filters,onChange){
  const keys=Object.keys(chips||{}).filter(function(k){
    const v=chips[k];
    return v!==''&&v!=null&&v!==false&&!(Array.isArray(v)&&!v.length);
  });
  if(!keys.length)return null;
  const wrap=E('div','mchips');
  wrap.appendChild(E('span','mia-lb',T.filters));
  keys.forEach(function(k){
    const c=E('span','mchip');
    c.appendChild(document.createTextNode(chipText(k,chips[k])));
    const x=E('button','mia-x'); x.type='button';
    x.appendChild(E('i',null,'✕'));
    x.title=T.rmFilter; x.setAttribute('aria-label',T.rmFilter+' '+(own(CHIP_LABELS,k)||k));
    x.addEventListener('click',function(){ dropFilter(filters,k); onChange(); });
    c.appendChild(x);
    wrap.appendChild(c);
  });
  return wrap;
}
function noApplyBlock(list){
  const l=(list||[]).filter(Boolean).map(String);
  if(!l.length)return null;
  const txt=l.join(', ');
  return note(T.noApply+' '+txt+(/[.!?]$/.test(txt)?'':'.'));
}
/* R7 · qué abre el botón cuando un filtro no se pudo aplicar. Sin fallos la
   etiqueta es la de siempre; con un fallo dice entre paréntesis lo que de
   verdad lleva ("Abrir en Tareas (sin villa)"). Dos apuntes como mucho: el
   botón va en mayúsculas y tiene que caber en un teléfono. */
function btnLabel(base,bits){
  const l=(bits||[]).filter(Boolean).slice(0,2);
  return l.length?base+' ('+l.join(', ')+')':base;
}
function btn(label,href,primary){
  const a=document.createElement('a');
  a.className='mia-btn'+(primary?' mia-primary':'');
  a.textContent=label;
  a.setAttribute('href',href);
  return a;
}

/* ════════════════ MAPAS DE LA PROPIA PÁGINA ════════════════ */
/* Nunca se descarga TaUsers para resolver un nombre: se usa el mapa que la
   página ya tiene cargado (entradas-equipo expone allUsersMap, managersMap y
   contactsMap como variables de script). Si no hay mapa, el nombre va a
   "No pude aplicar". */
function globalMap(name){
  try{ if(window[name])return window[name]; }catch(e){}
  try{ if(name==='allUsersMap'&&typeof allUsersMap!=='undefined')return allUsersMap; }catch(e){}
  try{ if(name==='managersMap'&&typeof managersMap!=='undefined')return managersMap; }catch(e){}
  try{ if(name==='contactsMap'&&typeof contactsMap!=='undefined')return contactsMap; }catch(e){}
  return null;
}
function mapPairs(m){
  const out=[];
  if(!m)return out;
  try{
    if(typeof m.forEach==='function'&&typeof m.get==='function'){
      m.forEach(function(v,k){ out.push([String(k),String(v==null?'':v)]); });
    }else if(typeof m==='object'){
      Object.keys(m).forEach(function(k){ out.push([String(k),String(m[k]==null?'':m[k])]); });
    }
  }catch(e){}
  return out;
}
/* Nombre → id de usuario. Fuentes, en este orden: los mapas que la propia
   página ya tiene cargados y, si no hay ninguno (tareas.html los guarda dentro
   de su IIFE), el mapa id→nombre que Mia carga de TaUsers con la misma llamada
   que hace la página.
   contactsMap NO entra: sus claves son ContactID numéricos de TaContacts, otra
   tabla; un contacto colándose como usuario o como manager daría un filtro
   falso con su chip.
   Se compara por PRINCIPIO DE PALABRA, sin acentos y en minúsculas: cada
   palabra de lo que ha dicho el usuario tiene que empezar alguna palabra del
   nombre del mapa. "Ana" no es "Mariana". El nombre completo exacto gana:
   "Ana Ruiz" es Ana Ruiz, no Ana Ruiz Pons. Si aun así coinciden dos personas
   no se resuelve ninguna: quien llama lo dice en "No pude aplicar". */
function nameWords(v){ return String(v==null?'':v).split(/[^a-z0-9]+/).filter(Boolean); }
function nameHit(name,qw){
  const parts=nameWords(name);
  for(let i=0;i<qw.length;i++){
    let ok=false;
    for(let j=0;j<parts.length&&!ok;j++)if(parts[j].indexOf(qw[i])===0)ok=true;
    if(!ok)return false;
  }
  return true;
}
function userPairs(){
  const out=[];
  const seen={};
  const maps=['allUsersMap','managersMap'];
  for(let i=0;i<maps.length;i++){
    const pairs=mapPairs(globalMap(maps[i]));
    for(let j=0;j<pairs.length;j++){
      const k=pairs[j][0];
      if(seen[k])continue;
      seen[k]=1; out.push(pairs[j]);
    }
  }
  if(!out.length&&USERS){
    USERS.forEach(function(v,k){ if(!seen[k]){ seen[k]=1; out.push([String(k),String(v==null?'':v)]); } });
  }
  return out;
}
function findUser(name){
  const raw=String(name==null?'':name).trim();
  if(!raw)return {id:'',many:false};
  const pairs0=userPairs();
  if(isUserId(raw)){
    /* Con el mapa cargado, un token de ocho caracteres solo es un id si el
       mapa lo conoce: "LIMPIEZ4" tiene la forma de un id pero es una palabra.
       Sin mapa no hay con qué comprobarlo y manda la forma. */
    if(!pairs0.length)return {id:raw.toUpperCase(),many:false};
    const up=raw.toUpperCase();
    for(let i=0;i<pairs0.length;i++){
      if(String(pairs0[i][0]).toUpperCase()===up)return {id:pairs0[i][0],many:false};
    }
    /* No está en el mapa: se sigue buscando como si fuera un nombre. */
  }
  const q=fold(raw);
  const qw=nameWords(q);
  if(!qw.length)return {id:'',many:false};
  const pairs=pairs0;
  const ids=[], exact=[];
  for(let j=0;j<pairs.length;j++){
    const k=pairs[j][0], v=fold(pairs[j][1]);
    if(!isUserId(k)||!v)continue;
    if(v===q){ if(exact.indexOf(k)<0)exact.push(k); }
    if(!nameHit(v,qw))continue;
    if(ids.indexOf(k)<0)ids.push(k);
  }
  if(exact.length===1)return {id:exact[0],many:false};
  if(!exact.length&&ids.length===1)return {id:ids[0],many:false};
  return {id:'',many:(exact.length||ids.length)>1};
}
function nameToId(name){ return findUser(name).id; }
/* id → nombre, del mismo mapa que ya tiene la página. */
function userName(id){
  const k=String(id==null?'':id).trim();
  if(!k)return '';
  const pairs=userPairs();
  for(let i=0;i<pairs.length;i++)if(String(pairs[i][0])===k)return pairs[i][1];
  return '';
}

/* ════════════════ CASPIO (lectura con el token del usuario) ════════════════ */
/* Toda respuesta pasa por aquí: los campos sensibles se borran nada más
   parsear, antes de que nada los pueda pintar o registrar.
   La lista sale de los nombres de campo del volcado del 2026-09-01: cajas de
   llaves y sus fotos, contraseñas y datos de wifi, códigos de alarma, notas y
   comentarios del keyholder, la caja fuerte, los datos de tarjeta, el token y
   los documentos de identidad. KeyHolder_person, KeyHolder_zone y Key_Holder
   NO entran: son el id de ocho caracteres de la persona, no un código. Las
   fotos de la llave del agua y los importes de tarjeta tampoco: no son
   secretos y la ficha los necesita. */
const SENSITIVE=/keybox|password|wifi|alarm|key_com|notas_keyholder|keyholdernotes|safe_box|card_|token_id|dni|passport|registrodepolicia|cuenta_bancaria|swift_bic|nif/i;
function stripSensitive(rows){
  for(let i=0;i<rows.length;i++){
    const r=rows[i]; if(!r||typeof r!=='object')continue;
    const ks=Object.keys(r);
    for(let j=0;j<ks.length;j++){ if(SENSITIVE.test(ks[j]))delete r[ks[j]]; }
  }
  return rows;
}
async function proxyGet(qs){
  const res=await fetch(Auth.url(PROXY+'?'+qs));
  /* G4: la sesión caducada no es un fallo de lectura. Con 401 o 403 no hay
     nada que reintentar: hay que volver a entrar, y así se dice. */
  if(res&&(res.status===401||res.status===403))throw kind('401');
  const json=await res.json();
  const rows=stripSensitive(json.Result||json.result||[]);
  if(json.error)throw new Error(String(json.error));
  return rows;
}
/* Misma llamada que hace tareas.html en loadUsers() (línea 840) y otras
   dieciséis páginas de la intranet: action=data&table=TaUsers&limit=200, con el
   token del propio usuario. El proxy no admite elegir columnas —ninguna página
   le pasa nunca una lista de campos—, así que llegan las filas enteras: se les
   quitan los campos sensibles al recibirlas, se guarda solo id→nombre y las
   filas se sueltan. Una vez por carga de página, ni una petición más. */
let USERSP=null;
/* G5: el resultado de cada intento se DEVUELVE ({map,ok}) y no se guarda en
   una variable del módulo. Una lectura que falló hace dos preguntas ya no
   puede hablar por la de ahora. */
async function loadUsersRes(){
  if(USERSP)return USERSP;
  USERSP=(async function(){
    let m=null;
    try{
      const rows=await proxyGet('action=data&table=TaUsers&limit=200');
      m=new Map();
      rows.forEach(function(u){
        const id=String(u[U.id]||'').trim(), nm=String(u[U.name]||'').trim();
        if(id&&nm)m.set(id,nm);
      });
    }catch(e){ LAST_KO=e; dbg('TaUsers ko'); }
    if(m){ USERS=m; return {map:m,ok:true}; }
    /* Un fallo no se guarda: la siguiente pregunta lo vuelve a intentar una
       vez. Dentro de la misma pregunta solo se llama aquí una vez, así que no
       hay bucle de reintentos. */
    USERSP=null;
    return {map:new Map(),ok:false};
  })();
  return USERSP;
}
async function loadUsers(){ return (await loadUsersRes()).map; }
/* Solo se baja el mapa si hace falta un nombre y la página no tiene el suyo
   (tareas.html guarda allUsersMap dentro de su IIFE, así que no se ve). */
/* Devuelve si el mapa está disponible para ESTA pregunta (G5). */
async function ensureUsers(name){
  const raw=String(name==null?'':name).trim();
  if(!raw)return true;
  /* También para un token con forma de id: con el mapa cargado se comprueba
     que existe de verdad, así "LIMPIEZ4" no acaba en u= como si fuera una
     persona. */
  if(userPairs().length)return true;
  return (await loadUsersRes()).ok;
}
/* La misma llamada que ya hacía doVilla: action=data&table=TaVillas&limit=500,
   con el token del propio usuario. De cada fila se guarda solo el id, el
   nombre para inquilinos y el nombre interno; las filas enteras se sueltan y
   llegan ya sin los campos sensibles (proxyGet). Una vez por carga de página. */
let VILLASP=null;
async function loadVillas(){
  if(VILLASP)return VILLASP;
  VILLASP=(async function(){
    let list=null;
    try{
      const rows=await proxyGet('action=data&table=TaVillas&limit=500');
      list=rows.map(function(r){
        return {
          id:String(r.villaid||''),
          name:String(r.Name_villa_para_inquilinos||r.Name||'').trim(),
          alt:String(r.Name||'').trim()
        };
      }).filter(function(v){ return v.id&&v.name; });
    }catch(e){ LAST_KO=e; dbg('TaVillas ko'); }
    if(list)return list;
    /* Un fallo no se guarda: la siguiente pregunta lo vuelve a intentar una
       vez. Dentro de la misma pregunta solo se llama aquí una vez, así que no
       hay bucle de reintentos. */
    VILLASP=null;
    return [];
  })();
  return VILLASP;
}
/* Distancia de edición entre dos cadenas cortas (Levenshtein). */
function lev(a,b){
  if(a===b)return 0;
  if(!a.length)return b.length;
  if(!b.length)return a.length;
  let prev=[]; for(let j=0;j<=b.length;j++)prev.push(j);
  for(let i=1;i<=a.length;i++){
    const cur=[i];
    for(let j=1;j<=b.length;j++){
      cur.push(Math.min(prev[j]+1,cur[j-1]+1,prev[j-1]+(a[i-1]===b[j-1]?0:1)));
    }
    prev=cur;
  }
  return prev[b.length];
}
/* R3 · palabras de lo que se ha escrito, sin acentos y sin signos. */
function qWords(v){ return fold(v).split(/[^a-z0-9]+/).filter(Boolean); }
/* R3 · la villa lleva TODAS esas palabras, en el nombre para inquilinos o en
   el interno, en cualquier orden. */
function hasAllWords(r,qw){
  const hay=fold(r&&r.name)+' '+fold(r&&r.alt);
  for(let i=0;i<qw.length;i++)if(hay.indexOf(qw[i])<0)return false;
  return true;
}
/* R3 · con varias villas candidatas, delante las que llevan todas las
   palabras escritas: "apartamentos voramar" tiene que dar APARTAMENTOS
   VORAMAR antes que VILLA VORAMAR, que solo lleva una de las dos. El resto
   se queda detrás en el mismo orden: no se pierde ninguna villa, solo cambia
   cuál se lee primero. Con una sola candidata no hay nada que ordenar. */
function rankVillas(list,qw){
  if(!qw.length||!list||list.length<2)return list;
  const yes=[],rest=[];
  list.forEach(function(r){ (hasAllWords(r,qw)?yes:rest).push(r); });
  return (yes.length&&rest.length)?yes.concat(rest):list;
}
/* R11 · el nombre interno para la lista de elección. Solo se enseña cuando el
   acierto vino de él: alguna palabra escrita NO está en el nombre para
   inquilinos y sí está en el interno ("villa son" -> VILLA FERNANDA, interna
   SON FERNANDA). Si los dos nombres son iguales, no hay nada que añadir. */
function altHint(h,typed){
  const qw=qWords(typed);
  const alt=String((h&&h.alt)||'').trim();
  if(!qw.length||!alt)return '';
  const nm=fold(h&&h.name), al=fold(alt);
  if(!nm||al===nm)return '';
  let miss=false, inAlt=false;
  for(let i=0;i<qw.length;i++){
    if(nm.indexOf(qw[i])<0)miss=true;
    if(al.indexOf(qw[i])>=0)inAlt=true;
  }
  return (miss&&inAlt)?alt:'';
}
/* Devuelve {hits:[{id,name}], ok:true, guessed, near:[{id,name}]}, o
   {hits:[], ok:false} si no se pudo leer la lista. El nombre exacto manda (el
   de inquilinos o el interno); si no hay ninguno, valen los que contienen lo
   escrito. No se recorta: quien pinta la lista decide cuántas enseña.
   near: hasta MAX_SUGGEST villas parecidas que NO están en hits, para el
   "¿Querías decir…?". Solo se calcula con cero o una villa acertada; con
   varias ya sale la lista para elegir. */
async function resolveVilla(name){
  const q=fold(name);
  if(!q)return {hits:[],ok:true};
  const rows=await loadVillas();
  if(!rows.length)return {hits:[],ok:false};
  /* Igualdad exacta sin la palabra villa/finca/casa delante: "delfi" es VILLA
     DELFI, no también VILLA DELFIN. Si no hay igual, contiene. Si tampoco,
     se acorta la pregunta por el final (orquida -> orquid -> VILLA ORQUIDEA)
     hasta cuatro letras: una falta al final no puede dejar la villa sin salir. */
  function norm(v){ return fold(v).replace(/^(villa|finca|casa|apartamento|apto)\s+/,''); }
  function contains(qq){ return rows.filter(function(r){ return fold(r.name).indexOf(qq)>=0||fold(r.alt).indexOf(qq)>=0; }); }
  const qn=norm(q);
  /* Villas parecidas a lo escrito, sin las ya acertadas. Primero las que
     contienen lo escrito (delfi -> DELFIN), después por distancia de edición
     contra el nombre sin "villa" y contra cada palabra del nombre. Límite:
     una letra de diferencia por cada cuatro escritas (delfi: 1, binisafua: 2),
     para que un nombre inventado no traiga villas al azar. */
  function nearest(hits){
    const ex={}; hits.forEach(function(h){ ex[h.id]=1; });
    const lim=Math.max(1,Math.floor(qn.length/4));
    return rows.filter(function(r){ return !ex[r.id]; }).map(function(r){
      const cands=[norm(r.name),norm(r.alt)].concat(fold(r.name).split(/[^a-z0-9]+/)).filter(Boolean);
      let d=Infinity;
      cands.forEach(function(c){
        if(c.indexOf(qn)>=0)d=Math.min(d,0.5);
        else d=Math.min(d,lev(qn,c));
      });
      return {r:r,d:d};
    }).filter(function(x){ return x.d<=lim; })
      .sort(function(a,b){ return a.d-b.d||a.r.name.localeCompare(b.r.name); })
      .slice(0,MAX_SUGGEST).map(function(x){ return x.r; });
  }
  /* R3: el orden de las candidatas lo decide rankVillas; qué villas son
     candidatas no cambia. */
  const qw=qWords(q);
  const exact=rows.filter(function(r){ return norm(r.name)===qn||norm(r.alt)===qn; });
  if(exact.length)return {hits:rankVillas(exact,qw),ok:true,guessed:false,near:exact.length===1?nearest(exact):[]};
  let part=contains(q);
  /* R3: lo escrito lleva varias palabras y ninguna villa las tiene SEGUIDAS.
     Antes se iba directo a acortar la pregunta por el final, y "apartamentos
     voramar" acababa en cualquier villa que empezara por "apartamentos". Aquí
     valen las villas que llevan TODAS las palabras, en el orden que sea:
     APARTAMENTOS VORAMAR y VORAMAR APARTAMENTOS son la misma villa, y VILLA
     VORAMAR no es ninguna de las dos. Solo se mira cuando la búsqueda seguida
     no ha dado nada, así que ninguna respuesta de antes cambia. */
  if(!part.length&&qw.length>1)part=rows.filter(function(r){ return hasAllWords(r,qw); });
  if(!part.length&&qn!==q)part=contains(qn);
  let qq=qn;
  let guessed=false;
  while(!part.length&&qq.length>4){ qq=qq.slice(0,-1); part=contains(qq); guessed=!!part.length; }
  return {hits:rankVillas(part,qw),ok:true,guessed:guessed,near:part.length<=1?nearest(part):[]};
}
/* Bloque "¿Querías decir…?": un enlace por villa parecida. hrefOf(villa)
   devuelve el enlace o null (sin id no hay enlace, solo el nombre). */
function suggestBlock(near,hrefOf){
  const l=(near||[]).slice(0,MAX_SUGGEST);
  if(!l.length)return null;
  const box=E('div','mia-suggest');
  box.appendChild(note(T.didYouMean));
  const list=E('div','mia-list');
  l.forEach(function(h){
    const row=E('div','mia-vrow');
    const nm=String(h.name||'—');
    const href=hrefOf(h);
    if(href){
      const a=document.createElement('a');
      a.className='mia-vmain';
      a.setAttribute('href',href);
      a.appendChild(E('span','mia-n',nm));
      row.appendChild(a);
    }else{
      const d=E('div','mia-vmain');
      d.appendChild(E('span','mia-n',nm));
      row.appendChild(d);
    }
    list.appendChild(row);
  });
  box.appendChild(list);
  return box;
}

/* ════════════════ WHERE de reservas ════════════════ */
/* Mismos operadores y escapado que buildWhere() de entradas-equipo.
   OJO con la trampa de fechas: stay_on = Checkin <= día AND Checkout >= día. */
function phClean(f){
  return "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE("+f+",' ',''),'+',''),'-',''),'.',''),'(',''),')','')";
}
function bookingsWhere(b){
  const parts=[];
  /* G11: lo que llega del Worker puede ser un número (un código sin comillas).
     String() en el borde: sin él, trim() revienta y la respuesta era "No he
     entendido la pregunta". */
  const code=String(b.code==null?'':b.code).trim(),
        guest=String(b.guest==null?'':b.guest).trim(),
        villa=String(b.villa==null?'':b.villa).trim();
  /* Siempre, también con código: es la primera condición de buildWhere() en
     entradas-equipo, así que la ficha enseña lo mismo que la página. */
  parts.push(F.status+"<>'cancelled'");
  if(code)parts.push(F.confirmCode+" LIKE '%"+sqLike(code)+"%'");
  if(villa)parts.push(F.villaName+" LIKE '%"+sqLike(villa)+"%'");
  if(guest){
    const q=sqLike(guest);
    let c=F.guestName+" LIKE '%"+q+"%' OR "+F.guestEmail+" LIKE '%"+q+"%' OR "+F.secondEmail+" LIKE '%"+q+"%'";
    /* Teléfonos: misma cadena de REPLACE que entradas-equipo (línea ~1348) */
    const ph=guest.replace(/[\s+\-.()]/g,'');
    if(ph&&/^\d+$/.test(ph)){
      const p=sqLike(ph);
      c+=' OR '+phClean(F.guestPhone)+" LIKE '%"+p+"%' OR "+phClean(F.phoneArrival)+" LIKE '%"+p+"%'";
      if(ph.indexOf('00')===0&&ph.slice(2)){
        const p2=sqLike(ph.slice(2));
        c+=' OR '+phClean(F.guestPhone)+" LIKE '%"+p2+"%' OR "+phClean(F.phoneArrival)+" LIKE '%"+p2+"%'";
      }
    }
    const words=guest.split(/\s+/).filter(Boolean).slice(0,4);
    if(words.length>1){
      c+=' OR ('+words.map(function(w){ return F.guestName+" LIKE '%"+sqLike(w)+"%'"; }).join(' AND ')+')';
      c+=' OR ('+words.map(function(w){ return '('+F.fiscalName+" LIKE '%"+sqLike(w)+"%' OR "+F.fiscalSurname+" LIKE '%"+sqLike(w)+"%')"; }).join(' AND ')+')';
    }
    parts.push('('+c+')');
  }
  if(isDate(b.stay_on)){
    /* "quién está el 14" es la estancia entera; pero si la pregunta dice
       salida o entrada, manda el tipo: ese día se va o llega, no está. */
    if(b.tipo==='salida')parts.push('('+F.checkOut+">='"+b.stay_on+"T00:00:00' AND "+F.checkOut+"<='"+b.stay_on+"T23:59:59')");
    else if(b.tipo==='entrada')parts.push('('+F.checkIn+">='"+b.stay_on+"T00:00:00' AND "+F.checkIn+"<='"+b.stay_on+"T23:59:59')");
    else parts.push('('+F.checkIn+"<='"+b.stay_on+"T23:59:59' AND "+F.checkOut+">='"+b.stay_on+"T00:00:00')");
  }else{
    /* Misma condición que buildWhere() de entradas-equipo (línea 1348): la
       ventana vale para la ENTRADA o para la SALIDA. Con solo el check-in, una
       pregunta de salida ("quién se va el 6") no encontraba nada, y el Worker
       manda las salidas con la fecha en check_in_from/to a propósito. */
    const d=isDate(b.check_in_from)?b.check_in_from:'', h=isDate(b.check_in_to)?b.check_in_to:'';
    /* La página trae entradas Y salidas en la ventana y luego enseña una de
       las dos según tipo (renderCards, línea 1423). Mia hace lo mismo en la
       consulta: con tipo salida solo la salida, con tipo entrada solo la
       entrada. Si no, "quién se va el 6" traía también a los que llegaban. */
    const only=b.tipo==='salida'?'out':(b.tipo==='entrada'?'in':'');
    const inC=[], outC=[];
    if(d){ inC.push(F.checkIn+">='"+d+"T00:00:00'"); outC.push(F.checkOut+">='"+d+"T00:00:00'"); }
    if(h){ inC.push(F.checkIn+"<='"+h+"T23:59:59'"); outC.push(F.checkOut+"<='"+h+"T23:59:59'"); }
    if(inC.length){
      if(only==='in')parts.push('('+inC.join(' AND ')+')');
      else if(only==='out')parts.push('('+outC.join(' AND ')+')');
      else parts.push('(('+inC.join(' AND ')+') OR ('+outC.join(' AND ')+'))');
    }
  }
  const mgr=b.manager?nameToId(b.manager):'';
  if(mgr)parts.push(F.villaManager+"='"+sq(mgr)+"'");
  /* Source y limpieza NO entran aquí. Entradas no tiene parámetro para
     ninguno de los dos, así que el enlace no los lleva y el chip no los
     dice; si la consulta sí los aplicara, la ficha enseñaría menos reservas
     que el enlace del mismo panel. Los dos van a "No pude aplicar". */
  /* G2: la condición de canceladas va siempre y sola no es un filtro. Si es lo
     único que hay, no hay consulta: fetchBookings devuelve null y quien
     pregunta recibe una nota, no las cinco reservas más nuevas de la empresa
     con el nombre de sus inquilinos. */
  if(parts.length<=1)return '';
  return parts.join(' AND ');
}
async function fetchBookings(b,limit,order){
  const where=bookingsWhere(b);
  if(!where)return null;
  let qs='action=view&view='+encodeURIComponent(VIEW_BOOKINGS)+'&where='+encodeURIComponent(where);
  if(order)qs+='&orderBy='+encodeURIComponent(order);
  qs+='&limit='+limit;
  return await proxyGet(qs);
}

/* ════════════════ FICHA DE ESTADO ════════════════ */
/* G9: tres estados de verdad, los mismos de readyPill: hecho, pendiente y sin
   dato. Un campo vacío no es un trabajo pendiente, es un campo sin rellenar, y
   pintarlo igual que "pendiente" era decir un dato que nadie apuntó. */
function statePill(label,val){ return readyPill(label,val); }
function payConcept(r){
  const out=[];
  PAY_CONCEPTS.forEach(function(p){ if(isOk(r[p[0]])===true)out.push(p[1]); });
  const st=r[PAY.status];
  let txt=out.length?out.join(' · '):'Pago';
  if(st)txt+=' — '+st;
  return txt;
}
function payTable(rows){
  const box=E('div');
  box.appendChild(E('div','mia-sec',T.payments));
  if(!rows.length){ box.appendChild(note('Sin líneas de pago.')); return box; }
  /* La fecha viaja dos veces: en su columna y, repetida, debajo del concepto.
     Por debajo de 360 px el CSS esconde la columna y enseña la de debajo, así
     que Concepto e Importe caben sin arrastrar nada. */
  let total=0, html='<tr><th class="mia-c">'+escapeHtml(T.concept)+'</th><th class="mia-d">'+escapeHtml(T.date)
    +'</th><th class="mia-n">'+escapeHtml(T.amount)+'</th></tr>';
  rows.forEach(function(r){
    const n=parseFloat(r[PAY.amount]); if(!isNaN(n))total+=n;
    const d=escapeHtml(fmtDate(r[PAY.date]));
    html+='<tr><td class="mia-c">'+escapeHtml(payConcept(r))+'<span class="mia-dsub">'+d+'</span></td>'
        +'<td class="mia-d">'+d+'</td>'
        +'<td class="mia-n">'+escapeHtml(fmtEUR(r[PAY.amount]))+'</td></tr>';
  });
  html+='<tr><td class="mia-c"><b>'+escapeHtml(T.total)+'</b></td><td class="mia-d"></td>'
      +'<td class="mia-n"><b>'+escapeHtml(fmtEUR(total))+'</b></td></tr>';
  const t=E('table','mia-pay'); t.innerHTML=html;
  const w=E('div','mia-payw'); w.appendChild(t);
  box.appendChild(w);
  const hint=E('div','mia-payhint',T.payScroll);
  box.appendChild(hint);
  /* La pista solo aparece si el carril de verdad se puede arrastrar. */
  setTimeout(function(){
    try{ if(w.scrollWidth>w.clientWidth+1)w.classList.add('mia-scrolls'); }catch(e){}
  },0);
  return box;
}
function kvRow(kv,k,v){ kv.appendChild(E('span','mia-k',k)); kv.appendChild(E('span','mia-v',v)); }

/* Enlace a Entradas para una reserva concreta: ventana de un día antes a un
   día después, para que la reserva caiga dentro pase lo que pase.
   Primero el código y solo si no hay, el nombre: el WHERE de inq de
   entradas-equipo mete el texto sin escapar, así que un apóstrofo en el
   nombre le rompe la consulta. El código es de Hostaway y no lo lleva. */
function entradasParamsFor(r){
  const code=String(g(r,'confirmCode')||'').trim();
  const guest=String(g(r,'guestName')||'').trim();
  const p={ desde:addDays(dOnly(g(r,'checkIn')),-1), hasta:addDays(dOnly(g(r,'checkOut')),1) };
  /* G10: mismo criterio que bookingsPlan. entradas-equipo mete inq en su WHERE
     sin escapar, así que un nombre con comillas le rompe la consulta: en ese
     caso el enlace va solo con las fechas. Aquí no hay lista de "No pude
     aplicar" que enseñar —esto es el enlace de una fila—, así que se cae en
     silencio y la fila sigue abriendo la ventana de esos días. */
  if(code)p.cod=code;
  else if(guest&&!/['"]/.test(guest))p.inq=guest;
  return p;
}

async function renderState(r,ctx,req){
  /* J8: si esta ficha ya no es la de la pregunta que hay en pantalla, no se
     pinta y tampoco se leen sus pagos: sería una lectura para nadie. */
  if(stale(req))return;
  const code=String(g(r,'confirmCode')||'');
  const villa=String(g(r,'villaName')||'—');
  const box=E('div');
  /* Los mismos chips que en la lista: si la pregunta llevaba tipo, villa o
     fechas, la ficha también lo dice y se pueden quitar. */
  if(ctx&&ctx.chips){
    const ch=chipsBlock(ctx.chips,ctx.filters,ctx.onChange);
    if(ch)box.appendChild(ch);
  }
  /* Lo que no se pudo aplicar se dice también en la ficha: source y limpieza
     no tienen filtro, y un nombre que no está en el mapa tampoco. */
  if(ctx&&ctx.no){
    const na=noApplyBlock(ctx.no);
    if(na)box.appendChild(na);
  }
  const card=E('div','mcard');
  const head=E('div','mcard-h');
  head.appendChild(E('span','mia-t',villa));
  if(code)head.appendChild(E('span','mia-id',code));
  card.appendChild(head);
  const body=E('div','mcard-b'); card.appendChild(body);

  /* Datos */
  const kv=E('div','mia-kv');
  const pax=(parseInt(g(r,'adults'),10)||0)+(parseInt(g(r,'children'),10)||0);
  const gline=[g(r,'guestName'),pax?pax+' pax':'',g(r,'portalName')].filter(Boolean).join(' · ');
  kvRow(kv,T.guest,gline||'—');
  const nights=g(r,'nights');
  kvRow(kv,T.dates,fmtDate(g(r,'checkIn'))+' → '+fmtDate(g(r,'checkOut'))+(nights?' · '+nights+' '+T.nights:''));
  const mgrId=String(g(r,'villaManager')||'').trim();
  if(mgrId){
    let nm='';
    const pairs=mapPairs(globalMap('allUsersMap')).concat(mapPairs(globalMap('managersMap')));
    for(let i=0;i<pairs.length&&!nm;i++)if(pairs[i][0]===mgrId)nm=pairs[i][1];
    if(!nm){ const users=await loadUsers(); nm=users.get(mgrId)||''; }   /* mismo mapa, una sola descarga */
    if(nm)kvRow(kv,T.vm,nm);   /* si no hay nombre, no se pinta el id a secas */
  }
  body.appendChild(kv);

  /* Estados */
  const secSt=E('div');
  secSt.appendChild(E('div','mia-sec',T.state));
  const sts=E('div','mia-states');
  const stName=String(g(r,'statusNameFormula')||g(r,'status')||'').trim();
  if(stName)sts.appendChild(E('span','mia-st'+(fold(stName).indexOf('cancel')>=0?' bad':''),'· '+stName));
  /* R13 (revisión del 2026-09-07): la línea del check-in online lee la MISMA
     casilla que la insignia de la tarjeta de Entradas Equipo, Arrivalform_done
     (auditoría equipo-card-marks-audit-2026-09-07). Antes leía
     checkinonline_todo_terminado, que vale 3 mientras el formulario está a
     medias, y una reserva con el formulario de llegada entregado salía con
     punto de pendiente.
     Y con la misma degradación de entradas-equipo v144 (G11, líneas 1921 y
     2466, función arrivalOk): un formulario marcado con CERO adultos no
     cuenta como hecho. El número de adultos es el del formulario y, si no
     trae nada, el de la reserva; el campo llega en la misma vista que el
     resto de la ficha. La regla solo puede bajar a pendiente, nunca subir a
     hecho. Tres estados, como el resto de las pastillas (G9): hecho,
     pendiente y sin dato — una casilla vacía no es un trabajo pendiente. */
  const afRaw=g(r,'arrivalFormDone');
  const afNr=r['TaBookings2021_Guest_adults_nr_form'];
  const afAd=(afNr===undefined||afNr===null||String(afNr).trim()==='')?g(r,'adults'):afNr;
  const afVal=(isOk(afRaw)===true&&!(parseInt(afAd,10)>=1))?0:afRaw;
  sts.appendChild(statePill('Check-in online',afVal));
  sts.appendChild(statePill('WelcomePack',g(r,'wellcomePack')));
  sts.appendChild(statePill('Limpieza',g(r,'limpieza')));
  sts.appendChild(statePill('Ecotasa',g(r,'ecotasaCobrada')));
  sts.appendChild(statePill('Policía',g(r,'policeDone')));
  sts.appendChild(statePill('Depósito',g(r,'depositDone')));
  sts.appendChild(statePill('Cierre',g(r,'cierre')));
  secSt.appendChild(sts);
  body.appendChild(secSt);

  /* Pagos: solo para quien puede abrir cobros-inquilinos. Para el resto no
     hay hueco, ni aviso, ni consulta: la ficha no menciona los pagos. */
  const payBox=canSeePayments()?E('div'):null;
  if(payBox){ payBox.appendChild(note(T.loading)); body.appendChild(payBox); }

  /* Botones */
  const btns=E('div','mia-btns');
  btns.appendChild(btn(T.openEnt,link('entradas',entradasParamsFor(r)),true));
  if(code)btns.appendChild(btn(T.openNotes,link('notas',{TaBookings2021_FS_confirmation_code:code})));
  const vid=String(g(r,'villaId')||'').trim();
  if(isId(vid))btns.appendChild(btn(T.openVilla,link('villa',{villa_id:vid})));
  body.appendChild(btns);

  box.appendChild(card);
  say(box,req);

  if(!payBox)return;
  /* J2: función con nombre para que el botón Reintentar vuelva a leer SOLO
     los pagos, sin repintar el resto de la ficha. */
  async function loadPayments(){
    try{
      /* Solo las líneas cobradas: una línea sin cobrar no puede sumar en el
         total de la ficha. Mismo campo de estado que ya se ve en cada línea. */
      const rows=await proxyGet('action=view&view='+encodeURIComponent(VIEW_PAYMENTS)
        +'&where='+encodeURIComponent(PAY.code+"='"+sq(code)+"' AND "+PAY.status+"='COBRADO'")+'&limit=50');
      if(stale(req))return;   /* J8: los pagos de una pregunta anterior no se pintan */
      payBox.textContent='';
      payBox.appendChild(payTable(rows));
    }catch(e){
      if(stale(req))return;   /* J8 */
      payBox.textContent='';
      if(FEAT.retry){
        /* G4: sesión caducada, no fallo de lectura: sin botón Reintentar. */
        if(e&&e.miaKind==='401'){ payBox.appendChild(note(T.expired)); return; }
        payBox.appendChild(note(T.payFail));
        payBox.appendChild(retryBlock(loadPayments));
      }else{
        payBox.appendChild(note('No he podido leer los pagos.'));
      }
    }
  }
  if(code){
    /* Sin await: la lectura de pagos no puede retener el bloqueo del campo,
       que no tiene tope de tiempo. Sus propias comprobaciones de respuesta
       tardía la hacen segura si para entonces hay otra pregunta. */
    loadPayments();
  }else{
    payBox.textContent='';
  }
}

/* Se han enseñado MAX_ROWS y hay más: se dice, se da el enlace que abre el
   resto en Entradas y se avisa de lo que ese enlace NO puede llevar. */
function moreBlock(box,plan,b){
  box.appendChild(note(T.more));
  if(b&&b.manager&&findUser(b.manager).id)box.appendChild(note(T.noMgrLink));
  /* Si lo único que llevaría el enlace son los parámetros vacíos, no lleva
     nada: abriría Entradas sin filtro y eso no es "ver el resto". */
  const real=Object.keys(plan.params||{}).filter(function(k){ return plan.params[k]!==EMPTY; });
  if(!real.length)return;
  const btns=E('div','mia-btns');
  btns.appendChild(btn(T.openEnt,link('entradas',plan.params)));
  box.appendChild(btns);
}

/* Fila de resultado: nombre + datos (abre la ficha) y un botón a la derecha */
function resultRow(r,extraLabel,extraHref,req){
  const row=E('div','mia-vrow');
  const main=E('button','mia-vmain'); main.type='button';
  main.appendChild(E('span','mia-n',String(g(r,'villaName')||'—')));
  main.appendChild(E('span','mia-m',String(g(r,'guestName')||'')+' · '
    +fmtDate(g(r,'checkIn'))+' → '+fmtDate(g(r,'checkOut'))));
  main.addEventListener('click',function(){
    /* G7: al abrir una fila, el aviso de fallo pasa a hablar de ESTA reserva y
       se queda sin los chips de la lista, que ya no está. Sin código no se
       comparte enlace: el de la fila llevaría el nombre del inquilino. */
    const c=String(g(r,'confirmCode')||'').trim();
    ST.shareHref=c?link('entradas',entradasParamsFor(r)):'';
    ST.shareChips=[];
    renderState(r,null,req);
  });
  row.appendChild(main);
  if(extraLabel&&extraHref)row.appendChild(btn(extraLabel,extraHref));
  return row;
}
function resultList(rows,extraLabel,hrefOf,req){
  const list=E('div','mia-list');
  rows.forEach(function(r){ list.appendChild(resultRow(r,extraLabel,hrefOf?hrefOf(r):'',req)); });
  return list;
}

/* ════════════════ RESERVAS ════════════════ */
/* Los parámetros que Entradas entiende de verdad (restoreFromURL: mgr, ci,
   wp, cierr, tipo, cod, villa, inq, desde, hasta). No hay parámetro de
   source ni de limpieza: esos van a "No pude aplicar". */
function bookingsPlan(b){
  const p={}, chips={}, no=[];
  /* J1: si el código lo puso la página y no la pregunta, el chip lo dice
     ("Usando esta reserva: …"). El filtro y el enlace son los mismos. */
  if(b.code){ p.cod=b.code; chips[b.ctxOn?'ctx':'code']=b.code; }
  if(b.guest){
    /* G10: entradas-equipo mete inq en su WHERE sin escapar (ver el comentario
       de entradasParamsFor), así que un nombre con comillas le rompe la
       consulta. Con comillas no viaja en el enlace y se dice; el filtro sigue
       aplicándose en la consulta de Mia. */
    if(/['"]/.test(String(b.guest)))no.push(T.noApplyInq);
    else p.inq=b.guest;
    chips.guest=b.guest;
  }
  if(b.villa){ p.villa=b.villa; chips.villa=b.villa; }
  if(isDate(b.stay_on)){
    /* Nunca una ventana de un día: Entradas cruza entradas Y salidas contra
       el rango, así que un huésped a mitad de estancia sería invisible. */
    p.desde=addDays(b.stay_on,-30); p.hasta=addDays(b.stay_on,30);
    chips.stay_on=b.stay_on;
  }else{
    if(isDate(b.check_in_from)){ p.desde=b.check_in_from; chips.check_in_from=b.check_in_from; }
    if(isDate(b.check_in_to)){ p.hasta=b.check_in_to; chips.check_in_to=b.check_in_to; }
  }
  /* Manager: se aplica en la CONSULTA, nunca en el enlace. entradas-equipo
     lee mgr de la URL y acto seguido applyUserPrefs (línea 1021) lo pisa con
     la preferencia guardada del usuario, así que el enlace mentiría. El chip
     se queda porque la ficha y la lista sí filtran por manager. */
  if(b.manager){
    const u=findUser(b.manager);
    /* El chip dice el nombre del mapa, igual que renderChips() de la página
       (allUsersMap.get(id)); si el mapa no tiene nombre, lo que escribió quien
       preguntó. */
    if(u.id)chips.manager=userName(u.id)||b.manager;
    else no.push('manager: '+b.manager+(u.many?' (varios)':''));
  }
  if(b.cleaner)no.push('limpieza: '+b.cleaner);
  if(b.source)no.push('source: '+b.source);
  if(['both','entrada','salida'].indexOf(b.tipo)>=0){ p.tipo=b.tipo; chips.tipo=b.tipo; }
  else if(b.tipo)no.push('tipo: '+b.tipo);
  /* Sin fechas en la pregunta, el enlace las lleva vacías a propósito: si no,
     entradas-equipo aplica la ventana guardada del usuario (línea 1031) y una
     reserva de noviembre no aparece. p.has('desde') le basta para no hacerlo. */
  if(p.desde===undefined&&p.hasta===undefined){ p.desde=EMPTY; p.hasta=EMPTY; }
  return {params:p,chips:chips,no:no};
}
function doBookingsLink(b,extraNo,pre,req){   /* extraNo = data.unmatched; pre = J2, nota delante */
  const render=function(){
    const plan=bookingsPlan(b); plan.no=plan.no.concat(extraNo||[]);
    /* Lo que el enlace lleva de verdad. desde= y hasta= vacíos son una marca
       para la página, no un filtro: no cuentan. */
    const real=Object.keys(plan.params).filter(function(k){ return plan.params[k]!==EMPTY; });
    const box=E('div');
    if(pre)box.appendChild(pre);
    /* R4: sin ningún filtro y sin reserva en la página no hay lista que abrir.
       El botón llevaría a todas las reservas desde 2021, así que no hay botón:
       se pide el dato que falta, igual que en la ficha y en la tarjeta. */
    if(!real.length){
      ST.shareHref=''; ST.shareChips=[];
      box.appendChild(note(T.noFilter));
      const na0=noApplyBlock(plan.no);
      if(na0)box.appendChild(na0);
      say(box,req);
      return;
    }
    const chips=chipsBlock(plan.chips,b,render);
    if(chips)box.appendChild(chips);
    box.appendChild(note(T.usedHere));
    /* R6: la ventana va vacía a propósito, pero eso abre todo el historial de
       la villa. Se dice aquí, que es donde pasa. */
    const sinFecha=plan.params.desde===EMPTY&&plan.params.hasta===EMPTY;
    /* S4: solo se nombra la villa cuando la pregunta trae una; si no, la nota
       habla del historial a secas. */
    if(sinFecha)box.appendChild(note(plan.chips.villa?T.noDates:T.noDatesAll));
    const na=noApplyBlock(plan.no);
    if(na)box.appendChild(na);
    const href=link('entradas',plan.params);
    ST.shareHref=href; ST.shareChips=chipTexts(plan.chips);   /* J3 */
    /* R7: si algo no se pudo aplicar, el botón dice qué abre de verdad. */
    const label=btnLabel(T.openEnt,plan.no.length?[
      plan.params.tipo==='salida'?T.btnOnlyOut:(plan.params.tipo==='entrada'?T.btnOnlyIn:''),
      sinFecha?T.btnNoDate:''
    ]:[]);
    const btns=E('div','mia-btns');
    if(curPage()===PAGES.entradas){
      const go=E('button','mia-btn mia-primary',label); go.type='button';
      go.addEventListener('click',function(){ location.href=href; });
      btns.appendChild(go);
    }else{
      btns.appendChild(btn(label,href,true));
    }
    box.appendChild(btns);
    say(box,req);
  };
  render();
}
/* J2: un fallo de lectura nunca se calla como si no hubiera resultados. El
   botón vuelve a llamar a fn() con los mismos datos: no repite la pregunta
   al Worker, solo la lectura que falló. Un botón, un reintento por toque. */
function retryBlock(fn){
  const box=E('div','mia-retry');
  const b=document.createElement('button');
  b.type='button';
  b.className='mia-btn';
  b.textContent=T.retry;
  b.addEventListener('click',function(){ fn(); });
  box.appendChild(b);
  return box;
}
/* G4: con la sesión caducada no hay nada que reintentar. El aviso lo dice y
   no lleva botón: el botón solo volvería a fallar. */
function readFailNote(fn,e){
  if(e&&e.miaKind==='401')return note(T.expired);
  const box=E('div');
  box.appendChild(note(T.readFail));
  box.appendChild(retryBlock(fn));
  return box;
}
async function doBookingsCard(b,extraNo,req){
  const plan=bookingsPlan(b); plan.no=plan.no.concat(extraNo||[]);
  /* J3: el aviso comparte SIEMPRE el enlace del plan, nunca el de una fila:
     el de la fila lleva el nombre del inquilino en inq=. */
  ST.shareHref=link('entradas',plan.params); ST.shareChips=chipTexts(plan.chips);
  /* Sin código: las más recientes primero, para que las cinco que se
     enseñan sean las útiles. */
  const order=(b.code&&String(b.code).trim())?'':F.checkIn+' DESC';
  let rows;
  /* G17: se pide una fila de más que las que se enseñan. Así se sabe si de
     verdad hay más y con exactamente MAX_ROWS no se promete un resto que no
     existe. */
  try{ rows=await fetchBookings(b,MAX_ROWS+1,order); }
  catch(e){
    if(FEAT.retry){ say(readFailNote(function(){ doBookingsCard(b,extraNo,req); },e),req); return; }
    say(note('No he podido leer la reserva.'),req); return;
  }
  /* G2: sin ningún filtro no hay lista de reservas, hay una pregunta. */
  if(rows===null){ say(note(T.noFilter),req); return; }
  const more=rows.length>MAX_ROWS;
  if(more)rows=rows.slice(0,MAX_ROWS);

  if(!rows.length){
    /* Sin resultados no se deja al usuario en un callejón: el mismo enlace
       de Entradas que llevaría el panel de lista, con lo que sí se pudo
       aplicar (código o inquilino, villa y fechas). */
    const box=E('div');
    const chips=chipsBlock(plan.chips,b,function(){ doBookingsCard(b,extraNo,req); });
    if(chips)box.appendChild(chips);
    box.appendChild(note(T.noBooking));
    const na=noApplyBlock(plan.no);
    if(na)box.appendChild(na);
    const btns=E('div','mia-btns');
    btns.appendChild(btn(T.openEnt,link('entradas',plan.params),true));
    box.appendChild(btns);
    say(box,req);
    return;
  }
  if(rows.length===1){
    await renderState(rows[0],{chips:plan.chips,no:plan.no,filters:b,onChange:function(){ doBookingsCard(b,extraNo,req); }},req);
    return;
  }

  const box=E('div');
  const chips=chipsBlock(plan.chips,b,function(){ doBookingsCard(b,extraNo,req); });
  if(chips)box.appendChild(chips);
  box.appendChild(note(T.many));
  box.appendChild(resultList(rows,T.openEnt,function(r){ return link('entradas',entradasParamsFor(r)); },req));
  if(more)moreBlock(box,plan,b);
  const na=noApplyBlock(plan.no);
  if(na)box.appendChild(na);
  say(box,req);
}
/* "quién está el 14" — nunca un enlace de un día. Se lista lo que devuelve
   la consulta de estancia; si la consulta falla, ventana de ±30 días. */
async function doBookingsStay(b,extraNo,req){
  const plan=bookingsPlan(b); plan.no=plan.no.concat(extraNo||[]);
  ST.shareHref=link('entradas',plan.params); ST.shareChips=chipTexts(plan.chips);   /* J3 */
  let rows;
  try{ rows=await fetchBookings(b,MAX_ROWS+1,F.checkIn+' DESC'); }   /* G17: una fila de más */
  catch(e){
    /* G15: lo que el Worker no supo aplicar viaja también por este camino. */
    if(!FEAT.retry){ doBookingsLink(b,extraNo,null,req); return; }
    /* G4: con la sesión caducada no se ofrece un botón que no puede funcionar. */
    if(e&&e.miaKind==='401'){ say(note(T.expired),req); return; }
    const pre=E('div');
    pre.appendChild(note(T.readFail));
    pre.appendChild(retryBlock(function(){ doBookingsStay(b,extraNo,req); }));
    doBookingsLink(b,extraNo,pre,req);
    return;
  }
  /* G2: sin ningún filtro no se lista nada. */
  if(rows===null){ sayWithNo(note(T.noFilter),extraNo,req); return; }
  const more=rows.length>MAX_ROWS;
  if(more)rows=rows.slice(0,MAX_ROWS);
  if(rows.length===1){
    await renderState(rows[0],{chips:plan.chips,no:plan.no,filters:b,onChange:function(){ doBookings(b,false,extraNo,'',req); }},req);
    return;
  }

  const box=E('div');
  const chips=chipsBlock(plan.chips,b,function(){ doBookings(b,false,extraNo,'',req); });
  if(chips)box.appendChild(chips);
  box.appendChild(note(rows.length?T.many:T.noBooking));
  if(rows.length){
    box.appendChild(resultList(rows,T.openEnt,function(r){ return link('entradas',entradasParamsFor(r)); },req));
    if(more)moreBlock(box,plan,b);
  }
  const na=noApplyBlock(plan.no);
  if(na)box.appendChild(na);
  if(!rows.length){
    /* Ninguna reserva: queda la ventana de ±30 días, que es lo único que
       Entradas sabe entender de una pregunta de estancia. */
    const btns=E('div','mia-btns');
    btns.appendChild(btn(T.openEnt,link('entradas',plan.params),true));
    box.appendChild(btns);
  }
  say(box,req);
}
/* ── J5: "¿qué falta para las entradas de mañana?" ────────────────────────
   Una fila por reserva con sus seis marcas. Ninguna casilla vacía se da por
   buena: un campo nulo o vacío dice "sin dato", nunca "hecho". Las marcas son
   las de Entradas Equipo (la tabla de reservas): dicen lo que alguien apuntó,
   no lo que Mia haya comprobado. */
const READY_FLAGS = [
  [T.rdArrival,'arrivalFormDone'],
  [T.rdPolice ,'policeDone'],
  [T.rdPaso4  ,'ecotasaCobrada'],
  [T.rdDeposit,'depositDone'],
  [T.rdClean  ,'limpieza'],
  [T.rdWp     ,'wellcomePack']
];
/* Tres estados de verdad: hecho, pendiente y sin dato. isOk() devuelve null
   cuando el campo es nulo o está vacío, y ese null NO se convierte en hecho. */
function readyPill(label,val){
  const ok=isOk(val);
  const st=E('span','mia-st'+(ok===true?' ok':ok===false?' pend':' na'));
  st.textContent=(ok===true?'✓ ':ok===false?'· ':'? ')+label
    +(ok===true?'':' '+(ok===false?T.rdPend:T.rdNa));
  return st;
}
/* Pendiente = cualquiera de las seis que no esté hecha, y "sin dato" cuenta.
   Si no contara, un día entero sin apuntar saldría como día resuelto. */
function readyPending(r){
  return READY_FLAGS.some(function(f){ return isOk(g(r,f[1]))!==true; });
}
function readyRow(r){
  const row=E('div','mia-rdrow');
  row.appendChild(E('div','mia-rd-n',String(g(r,'villaName')||'—')));
  const code=String(g(r,'confirmCode')||'').trim();
  const meta=[String(g(r,'guestName')||'').trim(),code?'#'+code:'',fmtDate(g(r,'checkIn'))]
    .filter(Boolean).join(' · ');
  row.appendChild(E('div','mia-rd-m',meta));
  const sts=E('div','mia-states');
  READY_FLAGS.forEach(function(f){ sts.appendChild(readyPill(f[0],g(r,f[1]))); });
  row.appendChild(sts);
  return row;
}
async function doBookingsReady(b,extraNo,req){
  /* La pregunta es de entradas: si el Worker no manda tipo, lo pone Mia. Es
     lo que define esta tarjeta, así que el chip Tipo vuelve si se quita. */
  const bb=Object.assign({},b);
  if(!bb.tipo)bb.tipo='entrada';
  /* Sin fecha la tarjeta sería "todas las reservas desde 2021": sin fechas
     es el día de hoy. */
  /* G18: sin fechas la tarjeta es la de HOY, y al quitar el chip de fecha
     vuelve a hoy (la ventana no se ensancha sola a todas las reservas). Se
     dice con una nota para que nadie lea la lista como "todas". */
  let hoyPuesto=false;
  if(!isDate(bb.check_in_from)&&!isDate(bb.check_in_to)&&!isDate(bb.stay_on)){ const hoy=todayISO(); bb.check_in_from=hoy; bb.check_in_to=hoy; hoyPuesto=true; }
  const plan=bookingsPlan(bb); plan.no=plan.no.concat(extraNo||[]);
  /* G7: la tarjeta también deja puesto el enlace del plan y sus chips para el
     aviso de fallo. Nunca el enlace de una fila. */
  ST.shareHref=link('entradas',plan.params); ST.shareChips=chipTexts(plan.chips);
  const again=function(){ doBookingsReady(bb,extraNo,req); };
  let rows;
  try{ rows=await fetchBookings(bb,READY_MAX,F.checkIn+' ASC,'+F.villaName+' ASC'); }
  catch(e){ if(FEAT.retry){ say(readFailNote(again,e),req); return; } say(note(T.rdRead),req); return; }
  /* G2: sin ningún filtro no hay tarjeta. */
  if(rows===null){ say(note(T.noFilter),req); return; }
  rows=rows||[];
  const box=E('div');
  const chips=chipsBlock(plan.chips,bb,again);
  if(chips)box.appendChild(chips);
  if(hoyPuesto)box.appendChild(note(T.rdToday));   /* G18 */
  /* El botón sale del plan, nunca de una fila: el enlace tiene que abrir el
     día entero, no la reserva de arriba. */
  const btns=E('div','mia-btns');
  btns.appendChild(btn(T.openEnt,link('entradas',plan.params),true));
  if(!rows.length){
    box.appendChild(note(T.rdNone));
    box.appendChild(note(T.rdSource));
    const na0=noApplyBlock(plan.no);
    if(na0)box.appendChild(na0);
    box.appendChild(btns);
    say(box,req);
    return;
  }
  /* Lo que tiene algo pendiente, arriba. sort() mantiene el orden de la
     consulta entre iguales (check-in y luego nombre de villa). */
  const list=rows.slice().sort(function(x,y){
    return (readyPending(x)?0:1)-(readyPending(y)?0:1);
  });
  if(rows.length<READY_MAX){
    let pend=0;
    list.forEach(function(r){ if(readyPending(r))pend++; });
    box.appendChild(note(rows.length+' '+T.rdEnt+', '+pend+' '+T.rdPendN));
  }else{
    /* Tope alcanzado: la cuenta sería mentira, así que no se da ninguna. */
    box.appendChild(note(T.rdMore));
  }
  const ul=E('div','mia-list');
  list.forEach(function(r){ ul.appendChild(readyRow(r)); });
  box.appendChild(ul);
  box.appendChild(note(T.rdSource));
  const na=noApplyBlock(plan.no);
  if(na)box.appendChild(na);
  box.appendChild(btns);
  say(box,req);
}
async function doBookings(b,card,extraNo,answerCard,req){
  /* G5: el mapa de usuarios se pide aquí y su fallo se sabe en el momento. Un
     manager que no se resuelve porque la lectura falló no es un manager
     desconocido: es una lectura que hay que reintentar. */
  const usersOk=b.manager?await ensureUsers(b.manager):true;
  if(FEAT.retry&&b.manager&&!usersOk&&!findUser(b.manager).id){
    say(readFailNote(function(){ doBookings(b,card,extraNo,answerCard,req); },LAST_KO),req);
    return;
  }
  /* J5: la tarjeta "qué falta" de las entradas de un día. Con FEAT.ready=0
     no se pide nunca y el resto del reparto es exactamente el de antes. */
  if(FEAT.ready&&answerCard==='ready'){ await doBookingsReady(b,extraNo,req); return; }
  if(isDate(b.stay_on)){ await doBookingsStay(b,extraNo,req); return; }
  /* Con nombre, con código o con manager se consulta y se enseña la ficha o la
     lista: son las tres preguntas cuya respuesta el enlace no puede dar bien
     (el manager lo pisa la preferencia de la página, y sin fechas la ventana
     guardada esconde la reserva). */
  const named=(b.code&&String(b.code).trim())||(b.guest&&String(b.guest).trim());
  const mgr=b.manager?findUser(b.manager).id:'';
  if(card||named||mgr){ await doBookingsCard(b,extraNo,req); return; }
  doBookingsLink(b,extraNo,null,req);
}

/* ════════════════ NOTAS ════════════════ */
async function doNotes(n,extraNo,req){
  const code=String((n&&n.code)||'').trim();
  const guest=String((n&&n.guest)||'').trim();
  /* Un chip por cada condición aplicada de verdad, igual que en reservas. */
  const chips={};
  if(code)chips[(n&&n.ctxOn)?'ctx':'code']=code;   /* J1: mismo chip que en reservas */
  if(guest)chips.guest=guest;
  /* J3: con código, el enlace de notas; sin él, el de Entradas con el nombre
     que se escribió. Los de la lista salen de filas leídas y no se comparten. */
  ST.shareHref=code?link('notas',{TaBookings2021_FS_confirmation_code:code})
                   :(guest?link('entradas',bookingsPlan({guest:guest}).params):'');
  ST.shareChips=chipTexts(chips);
  const again=function(){ doNotes(n,extraNo,req); };
  const head=function(box){
    const c=chipsBlock(chips,n,again);
    if(c)box.appendChild(c);
  };
  if(code){
    const box=E('div');
    head(box);
    const naC=noApplyBlock(extraNo);
    if(naC)box.appendChild(naC);
    const btns=E('div','mia-btns');
    btns.appendChild(btn(T.openNotes,link('notas',{TaBookings2021_FS_confirmation_code:code}),true));
    box.appendChild(btns);
    say(box,req);
    return;
  }
  /* G16: sin código y sin nombre no se ha buscado nada, así que no se puede
     decir "no encuentro esa reserva". Se pide el dato que falta. */
  if(!guest){ sayWithNo(note(T.noFilter),extraNo,req); return; }
  let rows;
  try{ rows=await fetchBookings({guest:guest},MAX_ROWS+1,F.checkIn+' DESC'); }   /* G17 */
  catch(e){
    if(FEAT.retry){ say(readFailNote(again,e),req); return; }
    say(note('No he podido leer la reserva.'),req); return;
  }
  const more=!!rows&&rows.length>MAX_ROWS;
  if(more)rows=rows.slice(0,MAX_ROWS);
  const box=E('div');
  head(box);
  if(!rows||!rows.length){
    /* Sin reservas no hay notas que abrir: queda el enlace a Entradas con el
       nombre, que es lo único que se pudo aplicar. */
    box.appendChild(note(T.noBooking));
    const naZ=noApplyBlock(extraNo);
    if(naZ)box.appendChild(naZ);
    const btns=E('div','mia-btns');
    btns.appendChild(btn(T.openEnt,link('entradas',bookingsPlan({guest:guest}).params),true));
    box.appendChild(btns);
    say(box,req);
    return;
  }
  box.appendChild(note(T.many));
  box.appendChild(resultList(rows,T.notes,function(r){
    const c=String(g(r,'confirmCode')||'').trim();
    return c?link('notas',{TaBookings2021_FS_confirmation_code:c}):'';
  },req));
  if(more)moreBlock(box,bookingsPlan({guest:guest}),{guest:guest});
  const naL=noApplyBlock(extraNo);
  if(naL)box.appendChild(naL);
  say(box,req);
}

/* ════════════════ TAREAS ════════════════ */
/* Palabra del usuario -> id del catálogo. Primero la frase entera; si no,
   la primera palabra que esté en el mapa ("compras de la villa" -> 14). */
function taskTT(type){
  const q=fold(type);
  const exact=own(TASK_TT,q);
  if(exact)return exact;
  const words=q.split(/\s+/).filter(Boolean);
  for(let i=0;i<words.length;i++){
    const hit=own(TASK_TT,words[i]);
    if(hit)return hit;
  }
  return undefined;
}
function tasksPlan(t){
  const p={}, chips={}, no=[];
  /* Con el id de la villa el filtro es exacto (vid, tareas.html v86). Sin id
     —lista de villas ilegible— va el nombre en vi, como hasta ahora. Quitar el
     chip borra t.villa, y entonces no se emite ninguno de los dos. */
  /* vid manda en tareas.html v86; vi va también para la tareas.html anterior que
     un navegador pueda tener en caché hasta cuatro horas (ignora vid, filtra por nombre). */
  if(t.villa && isId(t.villaId)){ p.vid=String(t.villaId); p.vi=t.villa; chips.villa=t.villa; }
  else if(t.villa){ p.vi=t.villa; chips.villa=t.villa; }
  /* J4: la unidad (apartamento) dentro de la villa. mu es el multiunitID de
     TaMultiunits, el mismo valor que lee el filtro de tareas.html (línea 1640),
     y solo tiene sentido con la villa resuelta a una: por eso va atado a vid.
     unitId/unitName los ha resuelto doTasks. Si la villa no se resolvió, o si
     se quita su chip, la unidad no se puede aplicar y se dice. */
  if(FEAT.unit && t.unit){
    if(t.unitId && t.villa && isId(t.villaId)){
      p.mu=String(t.unitId);
      const uLbl=String(t.unitName||t.unit);
      chips.unit=uLbl;
      /* Donde la tarjeta nombra la villa, nombra también la unidad. */
      chips.villa=t.villa+' — '+uLbl;
    }else{
      no.push('unidad "'+t.unit+'"');
    }
  }
  if(t.status){
    const est=own(TASK_EST,fold(t.status));
    if(est){ p.est=est; chips.status=t.status; }
    else no.push('estado: '+t.status);   /* "en curso" no existe como filtro de URL */
  }
  if(t.type){
    const bt=own(TASK_BT,fold(t.type));
    if(bt){ p.bt=bt; chips.type=t.type; }
    else {
      /* tt es un id del catálogo: solo se emite el de TASK_TT, nunca uno
         inventado. Lo que no está en el mapa va a "No pude aplicar". */
      const tt=taskTT(t.type);
      if(tt){ p.tt=tt; chips.type=t.type; }
      else no.push('tipo: '+t.type);
    }
  }
  /* u SIEMPRE va en la URL, aunque vaya vacío: tareas.html preselecciona al
     usuario que ha entrado (línea 871) y solo lo cambia si la URL trae u
     (línea 1585). Sin u=, "limpiezas pendientes" enseñaba solo las mías. */
  if(t.user){
    const u=findUser(t.user);
    if(u.id){ p.u=u.id; chips.user=t.user; }
    else { p.u=EMPTY; no.push('usuario: '+t.user+(u.many?' (varios)':'')); }
  }else{
    p.u=EMPTY;
  }
  if(isDate(t.from)){ p.fd=t.from; chips.from=t.from; }
  if(isDate(t.to)){ p.fh=t.to; chips.to=t.to; }
  if(t.urgent===true){ p.urg='1'; chips.urgent=true; }
  if(t.important===true){ p.imp='1'; chips.important=true; }
  /* Quién decide esto es doTasks, aquí solo se emite. */
  if(t.noauto===true){ p.auto='0'; chips.noauto=true; }
  return {params:p,chips:chips,no:no};
}
/* De cada fila de TaMultiunits Mia guarda SOLO esto: el id, la villa, el
   nombre completo, la etiqueta corta y el nombre de listing. Keybox y todo lo
   demás se quedan fuera aquí, además de que stripSensitive ya los ha borrado
   al recibir la respuesta. */
function unitRow(r){
  return {
    id:String(r.multiunitID||'').trim(),
    villaId:String(r.VillaIDcaspio||'').trim(),
    name:String(r.nombre_completo||'').trim(),
    short:String(r.descripcion_corta||'').trim(),
    alt:String(r.nombre_listing_manual||'').trim()
  };
}
/* La misma llamada que hace tareas.html en loadMultiunitsFirst() (línea 1012),
   con el token del propio usuario. Solo se baja si la pregunta nombra una
   unidad. Una vez por carga de página. */
/* G6: devuelve {list,ok}, igual que resolveVilla. Un fallo de lectura NO es
   "esa unidad no existe", así que se distingue y quien llama ofrece
   Reintentar en vez de dar por buena una lista vacía. */
let UNITSP=null;
async function loadUnits(){
  if(UNITSP)return UNITSP;
  UNITSP=(async function(){
    let list=null;
    try{
      const rows=await proxyGet('action=data&table=TaMultiunits&limit=500');
      list=rows.map(unitRow).filter(function(u){ return u.id&&u.villaId&&(u.name||u.short); });
    }catch(e){ LAST_KO=e; dbg('TaMultiunits ko'); }
    if(list)return {list:list,ok:true};
    /* Un fallo no se guarda: la siguiente pregunta lo vuelve a intentar una
       vez. Dentro de la misma pregunta solo se llama aquí una vez, así que no
       hay bucle de reintentos. */
    UNITSP=null;
    return {list:[],ok:false};
  })();
  return UNITSP;
}
/* Letras y cifras, sin espacios ni acentos: "13 a" y "13A" son la misma. */
function unitKey(v){ return fold(v).replace(/[^a-z0-9]+/g,''); }
/* Lo que se enseña de una unidad: la etiqueta corta ("Apto 4", "13A") y, si no
   la hay, el nombre completo. */
function unitLabel(u){ return String((u&&(u.short||u.name))||'').trim(); }
/* Las tres formas de nombrar una unidad, cada una tal cual y sin espacios. */
function unitKeys(u){
  const out=[];
  [u.name,u.short,u.alt].forEach(function(f){
    const s=fold(f); if(s&&out.indexOf(s)<0)out.push(s);
    const k=unitKey(f); if(k&&out.indexOf(k)<0)out.push(k);
  });
  return out;
}
/* Unidades que encajan con las palabras del usuario. Manda lo igual (nombre,
   etiqueta corta o nombre de listing, con espacios o sin ellos); solo si no hay
   ninguna igual valen las que contienen lo escrito. Así "13" es el apto 13 y no
   también el 13A, y "13 a" sí es el 13A. */
function matchUnits(units,words){
  const q=fold(words), qk=unitKey(words);
  if(!q)return [];
  function hit(u,test){
    const ks=unitKeys(u);
    for(let i=0;i<ks.length;i++)if(test(ks[i]))return true;
    return false;
  }
  const exact=units.filter(function(u){
    return hit(u,function(s){ return s===q||(!!qk&&s===qk); });
  });
  if(exact.length)return exact;
  return units.filter(function(u){
    return hit(u,function(s){ return s.indexOf(q)>=0||(!!qk&&s.indexOf(qk)>=0); });
  });
}
/* Unidades de UNA villa que encajan con lo escrito. Sin villa no hay lista. */
async function resolveUnit(villaId,words){
  const vid=String(villaId==null?'':villaId).trim();
  if(!vid)return {hits:[],ok:true};
  const res=await loadUnits();
  if(!res.ok)return {hits:[],ok:false};   /* G6 */
  const mine=res.list.filter(function(u){ return u.villaId===vid; });
  if(!mine.length)return {hits:[],ok:true};
  return {hits:matchUnits(mine,words),ok:true};
}
async function doTasks(t,extraNo,req){
  /* Las tres tareas automáticas (limpieza, welcomepack, cierre) comparten
     Tasktype 20. Se ocultan salvo que la pregunta las nombre: "limpiezas
     pendientes de X" tiene que enseñarlas. El usuario puede quitar el chip.
     Se decide una sola vez, fuera de render: al quitar el chip no vuelve. */
  if(t.noauto===undefined){
    const ty=fold(t.type);
    /* R12: esta expresión lee la PREGUNTA, no la fila. Es la palabra que
       escribió quien pregunta; lo que una fila es lo dice isAutoTask.
       Una pregunta por incidencias nombra a las automáticas sin decirlo: el
       parte de incidencia lo rellenan limpieza y cierre, que son Tasktype 20.
       Si se escondieran, la respuesta sería siempre "no hay tareas con
       incidencia" y el botón abriría una página igual de vacía. */
    const names=!!own(TASK_BT,ty) || /limpiez|welcome|wellcome|cierre/.test(ty) || t.incident===true;
    if(!names) t.noauto=true;
  }
  /* J2: si TaUsers no se pudo leer y la pregunta pide un usuario que el mapa
     no resuelve, el fallo real es de lectura, no "usuario no encontrado":
     decirlo así en vez de mandar el nombre a "No pude aplicar". */
  const usersOk=t.user?await ensureUsers(t.user):true;
  if(FEAT.retry && t.user && !usersOk && !findUser(t.user).id){
    sayWithNo(readFailNote(async function(){ await doTasks(t,extraNo,req); },LAST_KO),extraNo,req);
    return;
  }
  /* La villa se resuelve una vez, antes de pintar nada: con el id el filtro de
     tareas.html es exacto y deja de depender del texto del nombre. */
  let topNote=null;
  let near=[];
  const vName=String(t.villa==null?'':t.villa).trim();
  if(vName && !t.villaId){
    const r=await resolveVilla(vName);
    if(r.ok)near=r.near||[];
    if(!r.ok){
      /* Sin lista de villas se sigue como antes: el nombre viaja en vi. */
    }else if(r.hits.length===1){
      t.villaId=r.hits[0].id; t.villa=r.hits[0].name;
      /* Acierto por nombre acortado: se dice, para que nadie tome una villa
         parecida por la que quería. El chip enseña el nombre real. */
      if(r.guessed)topNote=T.guessVilla;
    }else if(r.hits.length>1){
      /* Varias villas: no se elige por el usuario. Un enlace por villa, cada
         uno con el resto de filtros de la pregunta ya puestos. */
      const box=E('div');
      box.appendChild(note(T.manyVillas));
      const list=E('div','mia-list');
      r.hits.slice(0,MAX_VILLAS).forEach(function(h){
        const row=E('div','mia-vrow');
        const a=document.createElement('a');
        a.className='mia-vmain';
        a.setAttribute('href',link('tareas',tasksPlan(Object.assign({},t,{villa:h.name,villaId:h.id})).params));
        a.appendChild(E('span','mia-n',h.name));
        /* R11: misma regla que la lista de villas de doVilla. Si esta villa
           salió por su nombre interno y el nombre para inquilinos no lleva la
           palabra escrita, el interno va debajo, en gris. */
        const hint=altHint(h,vName);
        if(hint)a.appendChild(E('span','mia-m',hint));
        row.appendChild(a);
        list.appendChild(row);
      });
      box.appendChild(list);
      if(r.hits.length>MAX_VILLAS)box.appendChild(note(T.moreVillas));
      const naV=noApplyBlock(tasksPlan(Object.assign({},t,{villa:''})).no.concat(extraNo||[]));
      if(naV)box.appendChild(naV);
      say(box,req);
      return;
    }else{
      /* Ninguna villa con ese nombre: el resto de la pregunta sí se aplica. */
      delete t.villa;
      extraNo=(extraNo||[]).concat(['villa: '+vName]);
      topNote=T.noVilla;
    }
  }
  /* J4: la unidad se resuelve una vez, igual que la villa, y solo si la villa
     ha quedado en una: mu es un id de TaMultiunits y sin villa no hay lista con
     la que comparar. Cero unidades, o villa sin resolver, lo dice tasksPlan en
     "No pude aplicar". */
  if(FEAT.unit){
    const uWords=String(t.unit==null?'':t.unit).trim();
    if(uWords && t.villa && isId(t.villaId)){
      const uRes=await resolveUnit(t.villaId,uWords);
      /* G6: la lista de unidades no se pudo leer. No es que la unidad no
         exista: se ofrece volver a intentarlo. */
      if(!uRes.ok&&FEAT.retry){ say(readFailNote(function(){ doTasks(t,extraNo,req); },LAST_KO),req); return; }
      let uHits=uRes.hits;
      /* La villa acertada no tiene esa unidad, pero una de las parecidas sí
         (VILLA VORAMAR frente a APARTAMENTOS VORAMAR): si es exactamente una,
         Mia se pasa a esa villa y lo dice. */
      if(!uHits.length && near.length){
        const alts=[];
        for(let ai=0; ai<near.length; ai++){
          const hh=(await resolveUnit(near[ai].id,uWords)).hits;
          if(hh.length===1)alts.push({v:near[ai],u:hh[0]});
        }
        if(alts.length===1){
          t.villaId=alts[0].v.id; t.villa=alts[0].v.name; uHits=[alts[0].u];
          near=near.filter(function(h){ return h.id!==alts[0].v.id; });
          topNote=T.unitVilla;
        }
      }
      if(uHits.length===1){
        t.unitId=uHits[0].id; t.unitName=unitLabel(uHits[0]);
      }else if(uHits.length>1){
        /* Varias unidades: no se elige por el usuario. Un enlace por unidad,
           cada uno con su mu y con el resto de filtros ya puestos. Mismo tope
           que la lista de villas. */
        const boxU=E('div');
        boxU.appendChild(note(T.manyUnits));
        const listU=E('div','mia-list');
        uHits.slice(0,MAX_VILLAS).forEach(function(h){
          const rowU=E('div','mia-vrow');
          const aU=document.createElement('a');
          aU.className='mia-vmain';
          aU.setAttribute('href',link('tareas',tasksPlan(Object.assign({},t,{unitId:h.id,unitName:unitLabel(h)})).params));
          aU.appendChild(E('span','mia-n',t.villa+' — '+unitLabel(h)));
          rowU.appendChild(aU);
          listU.appendChild(rowU);
        });
        boxU.appendChild(listU);
        if(uHits.length>MAX_VILLAS)boxU.appendChild(note(T.moreUnits));
        const naU=noApplyBlock(tasksPlan(Object.assign({},t,{unit:''})).no.concat(extraNo||[]));
        if(naU)boxU.appendChild(naU);
        say(boxU,req);
        return;
      }
    }
  }
  /* J6: la pregunta es por incidencias reportadas. Se bifurca AQUÍ, con la
     villa ya resuelta por el bloque de arriba: así la lista de incidencias
     usa el mismo id de villa, el mismo aviso de villa supuesta y las mismas
     villas parecidas que el resto de Tareas, sin repetir ni una línea.
     Con FEAT.incid a 0 esta rama no existe y la respuesta es la de siempre. */
  if(FEAT.incid && t.incident===true){ await doTasksIncidents(t,extraNo,topNote,near,req); return; }
  const render=function(){
    const plan=tasksPlan(t); plan.no=plan.no.concat(extraNo||[]);
    /* R7: lo que el enlace lleva de verdad. auto=0 lo pone Mia sola y u= vacío
       es una marca para la página: ninguno de los dos es un filtro que alguien
       haya pedido, así que ninguno cuenta. */
    const real=Object.keys(plan.params).filter(function(k){ return k!=='auto'&&plan.params[k]!==EMPTY; });
    const failed=plan.no.length>0;
    /* R7: con un filtro caído y nada que llevar, el botón abriría TODAS las
       tareas. No hay botón: la respuesta dice qué falló y ya está. */
    const noBtn=failed&&!real.length;
    const box=E('div');
    if(topNote)box.appendChild(note(topNote));
    const chips=chipsBlock(plan.chips,t,render);
    if(chips)box.appendChild(chips);
    if(!noBtn)box.appendChild(note(T.usedHere));
    const na=noApplyBlock(plan.no);
    if(na)box.appendChild(na);
    const href=link('tareas',plan.params);
    ST.shareHref=noBtn?'':href; ST.shareChips=chipTexts(plan.chips);   /* J3 */
    /* R7: la villa que no se encontró se dice también en el botón, para que
       nadie lea la lista que se abre como "las tareas de esa villa". */
    const label=btnLabel(T.openTar,(failed&&vName&&!plan.params.vi&&!plan.params.vid)?[T.btnNoVilla]:[]);
    const btns=E('div','mia-btns');
    if(curPage()===PAGES.tareas){
      const go=E('button','mia-btn mia-primary',label); go.type='button';
      go.addEventListener('click',function(){ location.href=href; });
      btns.appendChild(go);
    }else{
      btns.appendChild(btn(label,href,true));
    }
    if(!noBtn)box.appendChild(btns);
    /* Villas parecidas: mismo resto de filtros, otra villa. Se calculan una
       vez con la pregunta original; quitar un chip no las cambia. */
    const sg=suggestBlock(near,function(h){
      return link('tareas',tasksPlan(Object.assign({},t,{villa:h.name,villaId:h.id})).params);
    });
    if(sg)box.appendChild(sg);
    say(box,req);
  };
  render();
}

/* ════════════════ TAREAS CON INCIDENCIA (J6) ════════════════ */
/* Qué se enseña: el registro que la limpieza rellenó, tal cual. Reportado no
   es aceptado ni resuelto, y la nota de cabecera lo dice siempre.

   Los campos, leídos del volcado del 2026-09-01 y de las páginas que rellena
   el equipo (task-limpieza.html y task-cierre.html):
    · Incidencias es un campo Sí/No —el interruptor "⚠️ Incidencias"—, no un
      texto: 599 tareas marcadas de 75.285. Aquí NUNCA se pinta su valor.
    · El texto de la incidencia es Taskdescription ("📝 Descripción de la
      incidencia" en la página de limpieza). Las tareas de antes de 2026
      guardaban ese texto en Solutiondescription (531 de las 599), así que se
      usa como segunda opción. Si no hay ninguno de los dos, no se pinta línea.
    · La fecha es Data_to_be_done_fixed. Data_to_be_done está vacío en 75.284
      de las 75.285 filas, y es el campo por el que filtran tareas.html y
      listado-guardias-e-intervenciones.html.
    · Las fotos son los campos que empiezan por Picture_ o por Pictures_:
      guardan URLs, así que de ellos solo sale una CUENTA. Ni una URL entra
      en el DOM. */
function incText(r){
  const s=String(r.Taskdescription||r.Solutiondescription||'').trim();
  return s.length>INC_TEXT?s.slice(0,INC_TEXT):s;
}
/* Cuenta de fotos. Solo cuenta: el valor es una URL y no se toca. */
function incPhotos(r){
  let n=0;
  const ks=Object.keys(r||{});
  for(let i=0;i<ks.length;i++){
    if(!/^Pictures?_/.test(ks[i]))continue;
    if(String(r[ks[i]]==null?'':r[ks[i]]).trim())n++;
  }
  return n;
}
function incPhotoText(n){
  if(!n)return T.incNoPhoto;
  return n===1?T.incPhoto:(n+' '+T.incPhotos);
}
/* WHERE con la sintaxis de tareas.html: mismas comillas dobladas, mismo
   villaid=N y mismo corte de fechas con T00:00:00 / T23:59:59.
   withFlag decide si la marca de incidencia va en el servidor. Este proyecto
   tiene documentado que un campo Sí/No no es de fiar en el WHERE (ver el
   historial v07 de listado-guardias-e-intervenciones.html), así que se pide
   con la marca y, si el servidor rechaza la consulta, se vuelve a pedir sin
   ella y se separan aquí. En los dos casos la marca se comprueba también
   aquí antes de pintar: nunca sale una tarea sin incidencia. */
function incidentsWhere(t,uid,withFlag){
  const parts=[];
  if(withFlag)parts.push('Incidencias=1');
  /* La misma condición que tasksPlan: el id solo vale si sigue habiendo
     nombre de villa. Al quitar el chip de villa se borra t.villa, y entonces
     el filtro tiene que irse de la consulta igual que se va del enlace. */
  if(t.villa && isId(t.villaId))parts.push('villaid='+parseInt(t.villaId,10));
  if(isDate(t.from))parts.push("Data_to_be_done_fixed>='"+t.from+"T00:00:00'");
  if(isDate(t.to))parts.push("Data_to_be_done_fixed<='"+t.to+"T23:59:59'");
  /* Responsable O asignado: quien responde de la tarea y quien la hizo. */
  if(uid)parts.push("(UserID_responsible_alfanum='"+sq(uid)+"' OR UserID_asigned_alfanum='"+sq(uid)+"')");
  return parts.join(' AND ');
}
/* Solo las marcadas, de la más reciente a la más antigua. El orden se rehace
   aquí y no se confía al servidor: así la lista es la misma venga como venga. */
function incidentsPick(rows){
  const list=(rows||[]).filter(function(r){ return r&&isOk(r.Incidencias)===true; });
  list.sort(function(a,b){
    const A=String(a.Data_to_be_done_fixed||''), B=String(b.Data_to_be_done_fixed||'');
    return A<B?1:(A>B?-1:0);
  });
  return list;
}
const INC_ORDER='Data_to_be_done_fixed DESC';
function incidentsQs(where,limit){
  return 'action=data&table=TaTasks'+(where?'&where='+encodeURIComponent(where):'')
    +'&orderBy='+encodeURIComponent(INC_ORDER)+'&limit='+limit;
}
async function incidentsFetch(t,uid){
  /* Comprobado en vivo el 2026-09-07: caspio-proxy acepta Incidencias=1 y
     devuelve las mismas tareas que el volcado (22 del verano). El plan B queda
     por si un día deja de aceptarlo. */
  t._incPlanB=false;
  try{
    return await proxyGet(incidentsQs(incidentsWhere(t,uid,true),INC_FETCH));
  }catch(e){
    t._incPlanB=true;
    /* Plan B: el servidor no ha querido la marca Sí/No. Se pide la misma
       ventana sin ella, con el tope de 1000 filas de tareas.html, y las
       tareas con incidencia se separan aquí. */
    dbg('incidencias: 2ª consulta sin la marca');
    return await proxyGet(incidentsQs(incidentsWhere(t,uid,false),INC_SCAN));
  }
}
/* id de villa → nombre, del mismo listado que ya usa doTasks. */
async function villaNames(){
  const rows=await loadVillas();
  const m={};
  rows.forEach(function(v){ m[String(v.id)]=v.name; });
  return m;
}
/* Una fila = un registro de tarea. Todo entra por textContent (E). */
function incidentRow(r,names,users){
  const row=E('div','mia-inc');
  const vid=String(r.villaid==null?'':r.villaid).trim();
  const head=E('div','mia-inc-h');
  /* Mismo criterio que tareas.html v86: si la villa no está en el listado se
     dice "Villa <id>", que sigue siendo un dato útil. */
  head.appendChild(E('span','mia-inc-v',(names&&names[vid])||(vid?'Villa '+vid:'—')));
  head.appendChild(E('span','mia-inc-d',fmtDate(r.Data_to_be_done_fixed)));
  row.appendChild(head);
  const tn=String(r.Taskname==null?'':r.Taskname).trim();
  if(tn)row.appendChild(E('div','mia-inc-n',tn));
  const tx=incText(r);
  if(tx)row.appendChild(E('div','mia-inc-t',tx));
  const meta=E('div','mia-inc-m');
  /* El nombre sale del mapa de usuarios; si no está, una raya. Nunca el id a
     secas, igual que en la ficha de reserva. */
  /* tareas.html no expone el mapa de usuarios de Entradas: se completa con
     la lista de TaUsers ya descargada (users), sin otra llamada. */
  const rid=String(r.UserID_responsible_alfanum||'').trim(), aid=String(r.UserID_asigned_alfanum||'').trim();
  /* G8: la etiqueta dice de quién es el nombre que se pinta. Si el nombre sale
     del responsable, "Responsable:"; si sale de quien la tiene asignada,
     "Asignada a:". Antes ponía siempre "Responsable" aunque el id fuera el
     otro, y eso señalaba a la persona equivocada. */
  const rName=userName(rid)||(users&&users.get(rid))||'';
  const aName=rName?'':(userName(aid)||(users&&users.get(aid))||'');
  const asig=(!rName)&&(!!aName||(!rid&&!!aid));
  meta.appendChild(E('span',null,(asig?T.incAsig:T.incResp)+' '+(rName||aName||'—')));
  meta.appendChild(E('span',null,isOk(r.Tarea_terminada)===true?T.incDone:T.incPend));
  meta.appendChild(E('span',null,incPhotoText(incPhotos(r))));
  row.appendChild(meta);
  const tid=String(r.taskid==null?'':r.taskid).trim();
  if(isId(tid))row.appendChild(btn(T.incOpen,link('tareas',{tid:tid})));
  return row;
}
async function doTasksIncidents(t,extraNo,topNote,near,req){
  /* Ventana por defecto: los últimos INC_DAYS días hasta hoy. Se decide UNA
     vez, igual que noauto en doTasks: si quien pregunta quita los chips de
     fecha, la ventana no vuelve a ponerse sola. */
  if(!t.incWin){
    t.incWin=1;
    if(!isDate(t.from)&&!isDate(t.to)){ const hoy=todayISO(); t.from=addDays(hoy,-INC_DAYS); t.to=hoy; }
  }
  const u=t.user?findUser(t.user):{id:'',many:false};
  const no=(extraNo||[]).slice();
  if(t.user&&!u.id)no.push('usuario: '+t.user+(u.many?' (varios)':''));

  /* J4: la unidad resuelta en doTasks filtra también aquí; sin resolver, se
     dice en "No pude aplicar" como en el enlace. */
  if(t.unit&&!t.unitId)no.push('unidad "'+t.unit+'"');

  let rows=null, ko=false;
  try{ rows=await incidentsFetch(t,u.id); }
  catch(e){ LAST_KO=e; ko=true; }
  const names=await villaNames();
  /* Tope de la consulta alcanzado: puede faltar alguna tarea antigua. */
  const capped=!ko&&rows&&rows.length>=(t._incPlanB?INC_SCAN:INC_FETCH);
  let list=ko?[]:incidentsPick(rows);
  /* R12: si esta pregunta esconde las automáticas, la lista de Mia las
     esconde con la MISMA regla que la página: Tasktype 20 en la fila. */
  if(t.noauto===true)list=list.filter(function(r){ return !isAutoTask(r); });
  if(t.unitId)list=list.filter(function(r){ return String(r.PMSmultiunitID==null?'':r.PMSmultiunitID).trim()===String(t.unitId); });
  const shown=list.slice(0,INC_MAX);

  /* Quitar el chip de incidencia deja de ser esta pregunta: se responde con la
     tarjeta normal de Tareas. Cualquier otro chip rehace esta misma lista. */
  const again=function(){
    if(!t.unit){ t.unitId=''; t.unitName=''; }
    if(!t.villa){ topNote=null; near=[]; }
    if(t.incident!==true){ doTasks(t,extraNo,req); return; }
    doTasksIncidents(t,extraNo,topNote,near,req);
  };

  const box=E('div');
  if(topNote)box.appendChild(note(topNote));
  const chipObj={incident:true,villa:t.villa,unit:t.unitId?t.unitName:'',from:t.from,to:t.to,user:t.user};
  /* G7: el aviso de fallo lleva el enlace de Tareas de esta pregunta y estos
     mismos chips. Antes se quedaba con los de la respuesta anterior. */
  ST.shareHref=link('tareas',tasksPlan(t).params); ST.shareChips=chipTexts(chipObj);
  const chips=chipsBlock(chipObj,t,again);
  if(chips)box.appendChild(chips);
  /* Siempre, pase lo que pase con la consulta. */
  box.appendChild(note(T.incHead));
  const na=noApplyBlock(no);
  if(na)box.appendChild(na);
  if(ko){
    box.appendChild(note(T.incKo));
  }else if(!shown.length){
    box.appendChild(note(T.incNone));
  }else{
    const l=E('div','mia-list');
    let users=null; try{ users=await loadUsers(); }catch(e){}
    shown.forEach(function(r){ l.appendChild(incidentRow(r,names,users)); });
    box.appendChild(l);
    if(list.length>INC_MAX)box.appendChild(note(T.incMore));
  }
  if(capped)box.appendChild(note(T.incCap));
  /* El enlace abre Tareas con la villa, las fechas y el usuario, pero la
     página no sabe filtrar por incidencia: se dice, para que el botón no
     prometa una lista que no da. */
  box.appendChild(note(T.incNoLink));
  const btns=E('div','mia-btns');
  btns.appendChild(btn(T.openTar,link('tareas',tasksPlan(t).params),true));
  box.appendChild(btns);
  const sg=suggestBlock(near,function(h){
    return link('tareas',tasksPlan(Object.assign({},t,{villa:h.name,villaId:h.id})).params);
  });
  if(sg)box.appendChild(sg);
  say(box,req);
}

/* ════════════════ OCUPACIÓN Y VILLAS ════════════════ */
/* Ocupación no admite ningún filtro por enlace: el enlace va sin parámetros,
   así que NO hay chips que enseñar —un chip diría un filtro que no existe—.
   Lo que se entiende se dice como instrucción ("abre la página y pon…") y lo
   que no (el texto suelto de other) va a "No pude aplicar". */
function doAvailability(a,extraNo,req){
  const box=E('div');
  const bits=[];
  if(isDate(a.from)||isDate(a.to))bits.push(fmtDate(a.from)+' → '+fmtDate(a.to));
  if(a.pax)bits.push(a.pax+' plazas');
  if(a.pool)bits.push('piscina');
  ST.shareHref=link('ocupacion',{}); ST.shareChips=[];   /* J3: Ocupación no admite filtros por enlace */
  box.appendChild(note(T.ocuNote+' '+(bits.join(', ')||'—')));
  const na=noApplyBlock((Array.isArray(a.other)?a.other:[]).map(function(o){ return String(o==null?'':o); }).concat(extraNo||[]));
  if(na)box.appendChild(na);
  const btns=E('div','mia-btns');
  btns.appendChild(btn(T.openOcu,link('ocupacion',{}),true));
  box.appendChild(btns);
  say(box,req);
}
async function doVilla(v,extraNo,req){
  const name=String((v&&v.name)||'').trim();
  if(!name){ sayWithNo(note(T.noVilla),extraNo,req); return; }
  /* La misma lista que usa doTasks, resuelta con el mismo criterio. */
  const res=await resolveVilla(name);
  if(!res.ok){
    if(FEAT.retry){ sayWithNo(readFailNote(function(){ doVilla(v,extraNo,req); },LAST_KO),extraNo,req); return; }
    sayWithNo(note('No he podido leer las villas.'),extraNo,req); return;
  }
  const hits=res.hits;
  const sgV=suggestBlock(res.near,function(h){ return isId(String(h.id||''))?link('villa',{villa_id:String(h.id)}):null; });
  const box=E('div');
  if(!hits.length){
    box.appendChild(note(T.noVilla));
    if(sgV)box.appendChild(sgV);
    const naN=noApplyBlock(extraNo);
    if(naN)box.appendChild(naN);
    say(box,req);
    return;
  }
  if(hits.length===1){
    const id=String(hits[0].id||'');
    if(isId(id))ST.shareHref=link('villa',{villa_id:id});   /* J3 */
    if(res.guessed)box.appendChild(note(T.guessVilla));
    box.appendChild(note(String(hits[0].name||name)));
    const btns=E('div','mia-btns');
    if(isId(id))btns.appendChild(btn(T.openVilla,link('villa',{villa_id:id}),true));
    box.appendChild(btns);
    if(sgV)box.appendChild(sgV);
  }else{
    box.appendChild(note(T.manyVillas));
    const list=E('div','mia-list');
    hits.slice(0,MAX_VILLAS).forEach(function(h){
      const id=String(h.id||'');
      const row=E('div','mia-vrow');
      const nm=String(h.name||'—');
      /* R11: si la villa salió por su nombre interno y el nombre para
         inquilinos no lleva la palabra escrita, el interno va debajo, en gris
         (.mia-m, que en un teléfono ocupa su propia línea). Así se ve por qué
         está en la lista. */
      const hint=altHint(h,name);
      /* Mismo criterio que con una sola villa: sin id numérico no hay enlace,
         se enseña el nombre y ya está. */
      if(isId(id)){
        const a=document.createElement('a');
        a.className='mia-vmain';
        a.setAttribute('href',link('villa',{villa_id:id}));
        a.appendChild(E('span','mia-n',nm));
        if(hint)a.appendChild(E('span','mia-m',hint));
        row.appendChild(a);
      }else{
        const d=E('div','mia-vmain');
        d.appendChild(E('span','mia-n',nm));
        if(hint)d.appendChild(E('span','mia-m',hint));
        row.appendChild(d);
      }
      list.appendChild(row);
    });
    box.appendChild(list);
    if(hits.length>MAX_VILLAS)box.appendChild(note(T.moreVillas));
  }
  const naV=noApplyBlock(extraNo);
  if(naV)box.appendChild(naV);
  say(box,req);
}
/* Una nota mas lo que el Worker no pudo aplicar, en un solo bloque. */
function sayWithNo(el,extraNo,req){
  const na=noApplyBlock(extraNo);
  if(!na){ say(el,req); return; }
  const box=E('div');
  box.appendChild(el);
  box.appendChild(na);
  say(box,req);
}
/* J7 · abrir una página del menú por su nombre. El Worker solo devuelve una
   clave; el nombre y el enlace salen de la lista que se le mandó, que es la
   del menú de quien pregunta. Si la clave no está en esa lista (Worker viejo,
   respuesta rara), no se inventa nada: devuelve false y la respuesta pasa a
   "no he entendido". Sin chips: aquí no hay ningún filtro. */
function doPage(p,extraNo,req){
  const key=String((p&&p.key)||'').trim().toLowerCase();
  if(!key)return false;
  const list=menuPages();
  let hit=null;
  for(let i=0;i<list.length;i++){ if(list[i].key===key){ hit=list[i]; break; } }
  if(!hit)return false;
  /* G14: el enlace se arma con la clave de la lista blanca, nunca con la url
     tal como venía en el menú. */
  const href=hit.key+'.html';
  ST.shareHref=href; ST.shareChips=[];   /* J3 */
  const box=E('div');
  box.appendChild(note(T.pageLine+' '+hit.label));
  const na=noApplyBlock(extraNo);
  if(na)box.appendChild(na);
  const btns=E('div','mia-btns');
  btns.appendChild(btn(T.pageOpen+' '+hit.label,href,true));
  box.appendChild(btns);
  say(box,req);
  return true;
}
function doUnknown(data,req){
  /* Aquí no hay ni filtros ni enlace, y el aviso de fallo tiene que decirlo:
     "Filtros: ninguno" y "Enlace: -". Se ponen a cero a mano para que no se
     queden los de la respuesta anterior. */
  ST.shareHref=''; ST.shareChips=[];
  const box=E('div');
  box.appendChild(note(T.unknown));
  const na=noApplyBlock((data&&Array.isArray(data.unmatched))?data.unmatched:[]);
  if(na)box.appendChild(na);
  say(box,req);
}

/* ════════════════ PREGUNTA ════════════════ */
/* Worker caído o apagado: un aviso y Mia se retira hasta la próxima sesión.
   El panel con el aviso se queda hasta que el usuario lo cierre; la fila
   desaparece y la página queda como si Mia no hubiera estado. */
/* off=true solo cuando el Worker dice enabled:false, que es la palanca de
   apagado. Un 500, un 404, un JSON roto o un fallo de red retiran a Mia de
   ESTA página —fila, panel, botón Aa y el texto grande— pero no marcan la
   sesión: la siguiente página vuelve a intentarlo una vez. */
function fail(off){
  /* J8: sube el número ANTES de pintar. Con la fila ya fuera, ninguna cadena
     que siga viva (otra pregunta en marcha) puede escribir detrás: si lo
     hiciera, su clearPanel se llevaría este aviso y el botón Aa que hideRow
     acaba de mudar al panel. */
  if(FEAT.seq){ REQ++; setBusy(false); }
  /* Este aviso va SIN número de pregunta a propósito. No es la respuesta a
     una pregunta: es la caída de Mia, y con él se va la fila entera. */
  if(!downShown){ downShown=true; say(note(T.down)); }
  if(off)setMiaOff();
  hideRow(true);
}
function kind(k){ const e=new Error(k); e.miaKind=k; return e; }
/* Lo que viaja con la pregunta. J7 añade "pages": las páginas del menú de
   quien pregunta, con su nombre tal como lo pone el menú (texto del menú, no
   texto de la persona). Si no hay ninguna —bandera apagada, sin nav.js, rol
   sin menú— no se manda la clave y el Worker se comporta como siempre. */
function askBody(q){
  const b={ q:q, page:curPage(), today:todayISO() };
  if(FEAT.page){
    const pages=menuPages();
    if(pages.length)b.pages=pages.map(function(p){ return {key:p.key,label:String(p.label).slice(0,40)}; });
  }
  return b;
}
async function askWorker(q){
  const ctl=new AbortController();
  const to=setTimeout(function(){ ctl.abort(); },TIMEOUT_MS);
  let res;
  try{
    res=await fetch(MIA_WORKER_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':'Bearer '+Auth.token()},
      body:JSON.stringify(askBody(q)),
      signal:ctl.signal
    });
  }catch(e){
    throw kind(e&&e.name==='AbortError'?'timeout':'red');
  }finally{ clearTimeout(to); }
  if(res.status===401)throw kind('401');
  if(res.status===429)throw kind('429');
  if(res.status===400)throw kind('400');
  if(!res.ok)throw kind('red');
  try{ return await res.json(); }
  catch(e){ throw kind('red'); }
}
/* ════════════════ J1 · LA RESERVA ABIERTA EN LA PÁGINA ════════════════ */
/* "¿ha pagado?" en la página de una reserva es una pregunta completa para
   quien la hace: la reserva ya está delante. Mia usa esa reserva cuando la
   pregunta no nombra ninguna.
   Reglas:
    · El código se lee EN EL MOMENTO DE PREGUNTAR. Nunca al montar la fila y
      nunca guardado de una pregunta a la siguiente: si el usuario abre otra
      reserva, la siguiente pregunta lee la otra.
    · Solo se lee el código de confirmación, que es lo que la página ya enseña
      en su URL o en su cabecera. Ni un dato del huésped, ni una caja de
      llaves, ni una contraseña.
    · No se manda nada nuevo al Worker: el código se aplica aquí, en el
      navegador, igual que si lo hubiera escrito quien pregunta.
    · Nada se guarda en el almacenamiento y nada se registra. */
/* Páginas que no están en PAGES porque Mia no enlaza a ellas: solo lee de
   ellas la reserva abierta. */
const CTX_COBROS = 'cobros-inquilinos.html';
const CTX_WA     = 'entradas-primer-contacto-whatsapp.html';
/* Un código de confirmación: ocho o más letras y cifras, sin nada más
   (56120018 de Hostaway, HM3ABCDEF de Airbnb). El tope de 30 es el mismo
   maxlength del campo de cobros-inquilinos. Todo lo demás no es un código:
   un nombre, una fecha o un texto vacío se descartan aquí. */
const CTX_CODE_RE = /^[A-Za-z0-9]{8,30}$/;
function ctxCode(v){
  const s=String(v==null?'':v).trim().replace(/^#/,'');
  return CTX_CODE_RE.test(s)?s:'';
}
function ctxParam(name){
  try{ return new URLSearchParams(location.search).get(name)||''; }
  catch(e){ return ''; }
}
function pageBookingCode(){
  try{
    const page=curPage();
    /* Notas: la reserva es el parámetro de la URL; la página no abre otra. */
    if(page===PAGES.notas)return ctxCode(ctxParam('TaBookings2021_FS_confirmation_code'));
    /* Cobros: llega por ?code= y la página lo copia al campo de búsqueda.
       Manda el campo: si la persona ha escrito otro código, es ese. */
    if(page===CTX_COBROS){
      const el=document.getElementById('fCode');
      const f=el?ctxCode(el.value):'';
      return f||ctxCode(ctxParam('code'));
    }
    /* Primer contacto: solo cuando la ventana de la reserva está abierta.
       mData se queda con la última reserva después de cerrarla, así que sin
       la clase open no vale. */
    if(page===CTX_WA){
      const m=document.getElementById('waModal');
      if(!m||!m.classList||!m.classList.contains('open'))return '';
      let d=null;
      try{ d=window.mData; }catch(e){}
      return (d&&typeof d==='object')?ctxCode(d.code):'';
    }
    /* Entradas: una lista de reservas no es "esta reserva". Solo vale cuando
       en la tabla se ve UNA sola: entonces la página está enseñando esa. */
    if(page===PAGES.entradas){
      const nodes=document.querySelectorAll('.res-id');
      const seen=[];
      for(let i=0;i<nodes.length;i++){
        const c=ctxCode(nodes[i].textContent);
        if(c&&seen.indexOf(c)<0)seen.push(c);
        if(seen.length>1)return '';
      }
      return seen.length===1?seen[0]:'';
    }
  }catch(e){}
  return '';
}
/* Campos que ya dicen de qué reserva habla la pregunta. Si viene cualquiera
   de ellos, manda la pregunta y la página no pinta nada. */
const CTX_OWN_KEYS = ['code','guest','villa','check_in_from','check_in_to','stay_on','manager','source','cleaner','tipo'];
function injectPageBooking(f){
  if(!FEAT.ctx)return false;
  if(!f||typeof f!=='object')return false;
  if(f.ctxOff)return false;          /* el usuario ya quitó el chip: no vuelve */
  for(let i=0;i<CTX_OWN_KEYS.length;i++){
    const v=f[CTX_OWN_KEYS[i]];
    if(v!==undefined&&v!==null&&v!==''&&v!==false)return false;
  }
  const code=pageBookingCode();
  if(!code)return false;
  f.code=code; f.ctxOn=true;
  return true;
}

async function onAsk(){
  if(!INPUT)return;
  const q=String(INPUT.value||'').trim().slice(0,300);
  if(!q)return;
  /* J8: el número de ESTA pregunta. Todo lo que se pinte después lo lleva; si
     para entonces hay otra pregunta, o el panel se ha cerrado, no se pinta.
     El campo y el botón quedan bloqueados hasta que llegue la respuesta. */
  const my=++REQ;
  setBusy(true);
  ST.q=q;
  ST.shareHref=''; ST.shareChips=[];   /* J3: cada pregunta empieza sin enlace ni chips */
  try{
    say(note(T.loading),my);
    await answer(q,my);
  }finally{
    /* Si ya hay otra pregunta en marcha, el bloqueo lo suelta la suya. */
    if(my===REQ)setBusy(false);
  }
}
async function answer(q,my){
  let data;
  try{ data=await askWorker(q); }
  catch(e){
    const k=e&&e.miaKind;
    /* La fila se queda: estos tres son problemas de un momento, no una
       caída, y culpar al usuario con "no he entendido" sería mentira. */
    if(k==='401'){ say(note(T.expired),my); return; }
    if(k==='429'){ say(note(T.busyWait),my); return; }
    if(k==='400'){ say(note(T.badQ),my); return; }
    if(k==='timeout'){ say(note(T.busy),my); return; }
    fail(false); return;   /* red o 5xx: se reintenta en la próxima página */
  }
  if(!data||typeof data!=='object'){ fail(false); return; }
  if(data.enabled===false){ fail(true); return; }   /* apagada a propósito: hasta la próxima sesión */
  if(data.error==='modelo'||data.error==='ocupado'){ say(note(T.busy),my); return; }
  const target=String(data.target||'unknown');
  /* Lo que el Worker no supo mapear se dice SIEMPRE, en el camino que sea:
     antes solo salía en la respuesta "no he entendido". */
  const um=(Array.isArray(data.unmatched)?data.unmatched:[]).map(function(x){ return String(x==null?'':x).trim(); }).filter(Boolean);
  /* J1: la pregunta no dice de qué reserva habla, pero la página sí. */
  if(FEAT.ctx&&target==='bookings'){ data.bookings=data.bookings||{}; injectPageBooking(data.bookings); }
  else if(FEAT.ctx&&target==='notes'){ data.notes=data.notes||{}; injectPageBooking(data.notes); }
  try{
    if(target==='bookings'){
      const b=Object.assign({},data.bookings||{});
      const card=data.answer_card==='state'&&((b.code&&String(b.code).trim())||(b.guest&&String(b.guest).trim()));
      await doBookings(b,card,um,data.answer_card,my);
    }
    else if(target==='tasks'){
      const t=Object.assign({},data.tasks||{});
      await doTasks(t,um,my);
    }
    else if(target==='notes')await doNotes(Object.assign({},data.notes||{}),um,my);
    else if(target==='availability')doAvailability(Object.assign({},data.availability||{}),um,my);
    else if(target==='villa')await doVilla(data.villa||{},um,my);
    /* J7: si la clave no es una página del menú de quien pregunta, doPage no
       pinta nada y la respuesta sigue hasta "no he entendido". */
    else if(FEAT.page&&target==='page'&&doPage(data.page||{},um,my)){}
    else doUnknown(data,my);
  }catch(e){ dbg('render ko'); say(note(T.unknown),my); }
}

/* ════════════════ ARRANQUE ════════════════ */
function start(){ try{ mount(); }catch(e){ dbg('mount ko'); } }
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
else start();

})();
