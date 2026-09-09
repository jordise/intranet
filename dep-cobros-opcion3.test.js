/* Pruebas del caso de Toni Segui (09/09/2026): fianza por transferencia (opcion 3).
   node dep-cobros-opcion3.test.js

   Como marcas-manuales.test.js: NO copia el codigo de las paginas. Extrae el
   texto real de cada funcion del HTML y lo ejecuta. */
var fs = require('fs');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

function fnSource(file, name) {
  var src = fs.readFileSync(file, 'utf8');
  var i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name + ' en ' + file);
  var j = src.indexOf('{', i), depth = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) { k++; break; } }
  }
  return src.slice(i, k);
}

/* ── notas-equipo-reservas: depAplica(tipo) ── */
console.log('notas-equipo-reservas.html: depAplica');
function depAplicaCon(opt, waver) {
  var els = { fDepOpt: { value: String(opt) }, fSeWaver: { value: String(waver) } };
  var body = fnSource('notas-equipo-reservas.html', 'depAplica') + '\nreturn depAplica;';
  return new Function('g', body)(function (id) { return els[id] || null; });
}
var d3 = depAplicaCon(3, 1);
ok('opcion 3 (transferencia): la fianza se puede marcar', d3('deposito') === true);
ok('opcion 3: los gastos de tarjeta NO se pueden marcar', d3('gastos') === false);
ok('opcion 3: el waiver NO se puede marcar', d3('waiver') === false);
var d2 = depAplicaCon(2, 1);
ok('opcion 2 (tarjeta): la fianza se puede marcar', d2('deposito') === true);
ok('opcion 2: los gastos de tarjeta se pueden marcar', d2('gastos') === true);
var d1 = depAplicaCon(1, 1);
ok('opcion 1 (waiver permitido): el waiver se puede marcar', d1('waiver') === true);
ok('opcion 1: la fianza NO se puede marcar', d1('deposito') === false);
ok('opcion 1 sin waiver permitido: nada', depAplicaCon(1, 20)('waiver') === false);
ok('opcion 0 (sin elegir): nada', depAplicaCon(0, 1)('deposito') === false && depAplicaCon(0, 1)('waiver') === false);
ok('opcion 4 (airbnb): nada', depAplicaCon(4, 1)('deposito') === false);

/* ── cobros-inquilinos: fmtPendientes(r) ── */
console.log('cobros-inquilinos.html: fmtPendientes');
function fmt(fields) {
  var r = {};
  for (var k in fields) r['TaBookings2021_' + k] = fields[k];
  var body = fnSource('cobros-inquilinos.html', 'fmtPendientes') + '\nreturn fmtPendientes;';
  var f = new Function('isTruthy', 'esc', body)(
    function (v) { return v === true || v === 1 || v === -1 || v === '1' || v === 'true' || v === 'True'; },
    function (s) { return String(s); });
  return f(r);
}
var h = fmt({ Security_deposit_options: 3, Security_deposit_EUR: 900, Security_deposit_cobrado: 0 });
ok('opcion 3 sin cobrar: Fianza (transferencia) 900 pendiente', h.indexOf('Fianza (transferencia)') >= 0 && h.indexOf('✗ Pendiente') >= 0 && h.indexOf('Recibido') < 0);
ok('opcion 3 sin cobrar: cabecera Importes pendientes', h.indexOf('Importes pendientes') >= 0);
ok('ya no dice Depósito', h.indexOf('Depósito') < 0);
h = fmt({ Security_deposit_options: 3, Security_deposit_EUR: 900, Security_deposit_cobrado: 1 });
ok('opcion 3 cobrada: Fianza (transferencia) 900 Recibido en verde', h.indexOf('Fianza (transferencia)') >= 0 && h.indexOf('✓ Recibido') >= 0 && h.indexOf('b-ok') >= 0 && h.indexOf('✗ Pendiente') < 0);
ok('opcion 3 cobrada: cabecera Importes recibidos + Nada pendiente', h.indexOf('Importes recibidos') >= 0 && h.indexOf('Nada pendiente') >= 0);
h = fmt({ Security_deposit_options: 3, Security_deposit_EUR: 900, Security_deposit_cobrado: -1 });
ok('opcion 3 cobrada con -1 de Caspio: Recibido', h.indexOf('✓ Recibido') >= 0);
h = fmt({ Security_deposit_options: 2, Security_deposit_EUR: 900, Security_deposit_cobrado: 1, Gasto_tarjeta_deposito_seguridad: 27.58, Gasto_tarjeta_dep_seguri_cobrado: 0 });
ok('opcion 2 fianza cobrada, gastos no: una Recibido y una Pendiente, cabecera pendientes', h.indexOf('✓ Recibido') >= 0 && h.indexOf('✗ Pendiente') >= 0 && h.indexOf('Importes pendientes') >= 0 && h.indexOf('Nada pendiente') < 0);
h = fmt({ Security_deposit_options: 1, Deposit_waver_EUR: 57.33, Deposit_waver_cobrado: 1 });
ok('opcion 1 waiver cobrado: Waiver Recibido', h.indexOf('Waiver') >= 0 && h.indexOf('✓ Recibido') >= 0);
h = fmt({ Security_deposit_options: 4, Security_deposit_EUR: 900, Security_deposit_cobrado: 0 });
ok('opcion 4 (airbnb): Nada pendiente', h.indexOf('Nada pendiente') >= 0 && h.indexOf('Fianza') < 0);
h = fmt({ Security_deposit_options: 0 });
ok('opcion 0: aviso sin opcion', h.indexOf('Todavía no se ha seleccionado') >= 0);
ok('opcion 0: cabecera pendientes, nunca Nada pendiente ni Importes recibidos', h.indexOf('Importes pendientes') >= 0 && h.indexOf('Nada pendiente') < 0 && h.indexOf('Importes recibidos') < 0);
h = fmt({});
ok('registro vacio: aviso sin opcion y sin Nada pendiente', h.indexOf('Todavía no se ha seleccionado') >= 0 && h.indexOf('Nada pendiente') < 0);
h = fmt({ Security_deposit_options: 3, Security_deposit_EUR: 900, Security_deposit_cobrado: 1, Ecotasa_final: 30.8, Ecotasa_cobrada: 0 });
ok('ecotasa pendiente + fianza recibida: cabecera pendientes, sin Nada pendiente', h.indexOf('Ecotasa') >= 0 && h.indexOf('Importes pendientes') >= 0 && h.indexOf('Nada pendiente') < 0);


/* ── v74: desmarcar un cobro (solo admin) y aviso por email de marcas manuales ── */
console.log('notas-equipo-reservas.html: v74 desmarcar (solo admin) + aviso');
(function () {
  var F = 'notas-equipo-reservas.html';
  function conRol(rol) {
    var body = fnSource(F, 'puedeDesmarcarCobro') + '\nreturn puedeDesmarcarCobro;';
    return new Function('Auth', body)({ role: function () { return rol; } })();
  }
  ok('admin puede desmarcar', conRol('admin') === true);
  ok('manager NO puede desmarcar', conRol('manager') === false);
  ok('staff NO puede desmarcar', conRol('staff') === false);
  ok('ADMIN en mayusculas tambien', conRol('ADMIN') === true);
  var d = new Function(fnSource(F, 'depCobrosDesmarcados') + '\nreturn depCobrosDesmarcados;')();
  var r = d({ CleaningNotes: 'x' }, { deposito: true });
  ok('desmarcar la fianza escribe Security_deposit_cobrado a 0', r.Security_deposit_cobrado === 0);
  ok('  ...y no toca waiver ni gastos', !('Deposit_waver_cobrado' in r) && !('Gasto_tarjeta_dep_seguri_cobrado' in r));
  r = d({}, {});
  ok('sin nada desmarcado no escribe nada', Object.keys(r).length === 0);
  r = d({}, null);
  ok('sin objeto tampoco', Object.keys(r).length === 0);
  var p = new Function(fnSource(F, 'depCobrosPend') + '\nreturn depCobrosPend;')();
  r = p({}, { deposito: 'transferencia' });
  ok('depCobrosPend sigue escribiendo solo 1', r.Security_deposit_cobrado === 1 && Object.keys(r).length === 1);
  /* el sello de desmarcado y el filtro que lo oculta bajo la casilla */
  var src = fs.readFileSync(F, 'utf8');
  ok('marcasNuevas deja la linea "cobro desmarcado"', src.indexOf("marcaSello(DEP_SELLOS[d3][1],false,'cobro desmarcado')") > 0);
  ok('el filtro de "Marcado a mano" oculta las lineas de cobro y de cobro desmarcado', /\/ \(cobrados\? \(por\|en\)\|cobro desmarcado\) \//.test(src));
  ok('notas-villamanager tiene el mismo filtro', /\/ \(cobrados\? \(por\|en\)\|cobro desmarcado\) \//.test(fs.readFileSync('notas-villamanager.html', 'utf8')));
  ok('el guardado aplica los desmarcados despues de los marcados', src.indexOf('depCobrosPend(record,window.__depPendCobrado);') < src.indexOf('depCobrosDesmarcados(record,window.__depPendDescobrado);'));
  /* aviso: funcion pura */
  var a = new Function(fnSource(F, 'avisoMarcasFila') + '\nreturn avisoMarcasFila;')();
  ok('interruptor apagado: no hay fila', a(false, ['[x]'], '1', 'V', 'p', 'u') === null);
  ok('interruptor desconocido (null): no hay fila', a(null, ['[x]'], '1', 'V', 'p', 'u') === null);
  ok('sin lineas nuevas: no hay fila', a(true, [], '1', 'V', 'p', 'u') === null);
  var fila = a(true, ['[Deposito cobrado por transferencia 09/09/2026 10:00 - Toni Seguí]'], '65182346', 'Villa 18 B', 'notas-equipo-reservas v74', 'Toni Seguí');
  ok('con interruptor y lineas: fila con fecha, reserva, villa, usuario y enlace', fila && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(fila.Fecha) && fila.FS_confirmation_code === '65182346' && fila.Villa === 'Villa 18 B' && fila.Usuario === 'Toni Seguí' && fila.Lineas.indexOf('cobrado por transferencia') > 0 && fila.Enlace.indexOf('65182346') > 0);
  ok('el aviso se dispara despues del Guardado y nunca dentro del record', src.indexOf("toast('✅ Guardado','ok')") < src.indexOf('avisarMarcas(_mn);') && src.indexOf('avisarMarcas(_mn);') < src.indexOf('setTimeout(function(){history.back();},1200);'));
  ok('notas-villamanager tambien avisa tras guardar', fs.readFileSync('notas-villamanager.html', 'utf8').indexOf('avisarMarcas(_mn);') > 0);
})();
console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
