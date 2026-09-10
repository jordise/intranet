/* Pruebas de la peticion de Toni Segui (10/09/2026 17:40, WhatsApp): la devolucion
   de la fianza en dos pasos (Enviado a firmar -> Devuelto) en Control Cobros v33.
   node cobros-devolucion-fianza.test.js

   Como dep-cobros-opcion3.test.js: NO copia el codigo de las paginas. Extrae el
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

var F = 'cobros-inquilinos.html';
var SRC = fs.readFileSync(F, 'utf8');
function fn(name, extra) {
  return new Function((extra || '') + '\n' + fnSource(F, name) + '\nreturn ' + name + ';')();
}

/* ── estadoDevolucion(firmar, devuelto) ── */
console.log('cobros-inquilinos.html: estadoDevolucion');
(function () {
  /* con el isTruthy real de la pagina */
  var est = fn('estadoDevolucion', fnSource(F, 'isTruthy'));
  ok('sin marcas: pendiente', est(0, 0) === 'pendiente');
  ok('solo enviado a firmar: firmar', est(1, 0) === 'firmar');
  ok('solo devuelto: devuelto', est(0, 1) === 'devuelto');
  ok('las dos marcas: manda devuelto', est(1, 1) === 'devuelto');
  ok('texto "1"/"0" de Caspio', est('1', '0') === 'firmar' && est('0', '1') === 'devuelto');
  ok('booleanos true/false', est(true, false) === 'firmar' && est(false, true) === 'devuelto');
  ok('texto "true"/"false"', est('true', 'false') === 'firmar' && est('false', 'true') === 'devuelto');
  ok('-1 de Caspio tambien cuenta', est(-1, 0) === 'firmar' && est(0, -1) === 'devuelto');
  ok('null/null: pendiente', est(null, null) === 'pendiente');
  ok('la vista no trae el campo del paso 1 (undefined): pendiente, no rompe', est(undefined, undefined) === 'pendiente' && est(undefined, 1) === 'devuelto');
  ok('cadena vacia: pendiente', est('', '') === 'pendiente');
})();

/* ── lineaMarcaDevolucion(tipo, desmarcar, nombre, fecha) ── */
console.log('cobros-inquilinos.html: lineaMarcaDevolucion');
(function () {
  var linea = fn('lineaMarcaDevolucion');
  var d = new Date(2026, 8, 10, 17, 40);
  ok('paso 1 marcado', linea('firmar', false, 'Toni Seguí', d) === '[Fianza enviada a firmar 10/09/2026 17:40 - Toni Seguí]');
  ok('paso 2 marcado', linea('devuelto', false, 'Toni Seguí', d) === '[Fianza devuelta 10/09/2026 17:40 - Toni Seguí]');
  ok('paso 1 desmarcado', linea('firmar', true, 'Toni Seguí', d) === '[Fianza enviada a firmar DESMARCADA 10/09/2026 17:40 - Toni Seguí]');
  ok('paso 2 desmarcado', linea('devuelto', true, 'Toni Seguí', d) === '[Fianza devuelta DESMARCADA 10/09/2026 17:40 - Toni Seguí]');
  ok('sin nombre: equipo', linea('devuelto', false, '', d) === '[Fianza devuelta 10/09/2026 17:40 - equipo]');
  ok('nombre nulo: equipo', linea('devuelto', false, null, d) === '[Fianza devuelta 10/09/2026 17:40 - equipo]');
  ok('dia, mes y hora con dos digitos', linea('firmar', false, 'X', new Date(2026, 0, 5, 9, 5)) === '[Fianza enviada a firmar 05/01/2026 09:05 - X]');
  ok('sin fecha usa la de ahora', /^\[Fianza devuelta \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} - X\]$/.test(linea('devuelto', false, 'X')));
})();

/* ── selloDevolucion(marcasTexto, tipo) ── */
console.log('cobros-inquilinos.html: selloDevolucion');
(function () {
  var sello = fn('selloDevolucion');
  var uno = '[Fianza enviada a firmar 10/09/2026 17:40 - Toni Seguí]';
  var dos = '[Fianza devuelta 11/09/2026 09:15 - Jordi Seguí]';
  var s = sello(uno, 'firmar');
  ok('lee la fecha con año y el nombre', s && s.fecha === '10/09/2026 17:40' && s.nombre === 'Toni Seguí');
  ok('lee el sello del paso 2', sello(uno + '\n' + dos, 'devuelto').fecha === '11/09/2026 09:15');
  ok('el paso 2 no confunde con el paso 1', sello(uno + '\n' + dos, 'firmar').nombre === 'Toni Seguí');
  ok('manda la ultima linea del mismo tipo',
    sello(uno + '\n[Fianza enviada a firmar 12/09/2026 08:00 - Marta]', 'firmar').nombre === 'Marta');
  ok('una desmarca posterior lo anula',
    sello(uno + '\n[Fianza enviada a firmar DESMARCADA 10/09/2026 18:00 - Toni Seguí]', 'firmar') === null);
  ok('y volver a marcar despues de la desmarca cuenta otra vez',
    sello(uno + '\n[Fianza enviada a firmar DESMARCADA 10/09/2026 18:00 - Toni]\n[Fianza enviada a firmar 11/09/2026 08:30 - Marta]', 'firmar').nombre === 'Marta');
  ok('una desmarca del paso 2 no toca el sello del paso 1',
    sello(uno + '\n[Fianza devuelta DESMARCADA 11/09/2026 10:00 - Toni]', 'firmar').nombre === 'Toni Seguí');
  ok('las demas marcas del rastro se ignoran',
    sello('[Deposito cobrado por transferencia 09/09/2026 10:00 - Toni]\n[Policia marcado 09/09/2026 11:00 - Marta]', 'firmar') === null);
  ok('rastro vacio: null', sello('', 'firmar') === null);
  ok('rastro nulo: null', sello(null, 'devuelto') === null);
  ok('sin linea de ese tipo: null', sello(dos, 'firmar') === null);
})();

/* ── textoDesmarcar(estado, firmarFlag) ── */
console.log('cobros-inquilinos.html: textoDesmarcar');
(function () {
  var txt = fn('textoDesmarcar', fnSource(F, 'isTruthy'));
  ok('quitar Devuelto con el paso 1 puesto vuelve a Enviado a firmar', txt('devuelto', 1) === 'Vuelve a "Enviado a firmar".');
  ok('quitar Devuelto SIN el paso 1 vuelve a Pendiente (fila vieja de Caspio)', txt('devuelto', 0) === 'Vuelve a "Pendiente".');
  ok('el campo que la vista no trae cuenta como no puesto', txt('devuelto', undefined) === 'Vuelve a "Pendiente".' && txt('devuelto', null) === 'Vuelve a "Pendiente".');
  ok('quitar Enviado a firmar vuelve a Pendiente', txt('firmar', 1) === 'Vuelve a "Pendiente".');
  ok('en Pendiente no hay nada que deshacer', txt('pendiente', 0) === '');
})();

/* ── avisoCorte(n) ── */
console.log('cobros-inquilinos.html: avisoCorte');
(function () {
  var av = fn('avisoCorte');
  ok('999 reservas: sin aviso', av(999) === '');
  ok('1000 reservas: aviso de lista cortada', av(1000) === 'Lista cortada a 1000 reservas: ajusta las fechas o los filtros.');
  ok('mas de 1000 tambien avisa', av(1200) !== '');
  ok('cero reservas: sin aviso', av(0) === '');
})();

/* ── fmtCuentaDevolucion(r): la cuenta del huesped en la ficha ── */
console.log('cobros-inquilinos.html: fmtCuentaDevolucion');
(function () {
  var cta = fn('fmtCuentaDevolucion', fnSource(F, 'esc'));
  function r(o) { var x = {}; for (var k in o) x['TaBookings2021_' + k] = o[k]; return x; }
  var h = cta(r({ Security_deposit_options: 3, Numero_cuenta_bancaria_guest: 'ES00 1111 2222 33 4444444444', Numero_swift_bic_bancario_guest: 'ABCDESMM' }));
  ok('opcion 3 con cuenta: fila Cuenta para la devolucion con IBAN y BIC',
    h.indexOf('Cuenta para la devolución') > 0 && h.indexOf('ES00 1111 2222 33 4444444444') > 0 && h.indexOf('ABCDESMM') > 0);
  ok('opcion 3 solo con IBAN: sale igual', cta(r({ Security_deposit_options: 3, Numero_cuenta_bancaria_guest: 'ES99' })).indexOf('ES99') > 0);
  ok('opcion 3 sin datos: no sale la fila', cta(r({ Security_deposit_options: 3, Numero_cuenta_bancaria_guest: '  ' })) === '');
  ok('opcion 2 (tarjeta): no sale la fila', cta(r({ Security_deposit_options: 2, Numero_cuenta_bancaria_guest: 'ES99' })) === '');
  ok('sin opcion: no sale la fila', cta(r({ Numero_cuenta_bancaria_guest: 'ES99' })) === '');
  ok('la cuenta va escapada', cta(r({ Security_deposit_options: 3, Numero_cuenta_bancaria_guest: '<b>x</b>' })).indexOf('&lt;b&gt;') > 0);
})();

/* ── marcasConLinea(marcasTexto, linea, max) ── */
console.log('cobros-inquilinos.html: marcasConLinea');
(function () {
  var con = fn('marcasConLinea');
  ok('rastro vacio: solo la linea nueva', con('', '[B]', 3800) === '[B]');
  ok('rastro nulo: solo la linea nueva', con(null, '[B]', 3800) === '[B]');
  ok('la linea nueva va al final', con('[A]', '[B]', 3800) === '[A]\n[B]');
  ok('quita las lineas en blanco', con('[A]\n\n  \n[B]', '[C]', 3800) === '[A]\n[B]\n[C]');
  var largo = con('[1111111111]\n[2222222222]\n[3333333333]', '[4444444444]', 25);
  ok('con el tope suelta las mas viejas', largo === '[3333333333]\n[4444444444]' && largo.length <= 25);
  ok('la linea nueva nunca se pierde', con('[1111111111]\n[2222222222]', '[NUEVA]', 5) === '[NUEVA]');
  ok('el tope por defecto es 3800', con(new Array(400).join('[xxxxxxxxx]\n'), '[NUEVA]').length <= 3800);
})();

/* ── avisoMarcasFila: copiada de notas-equipo-reservas v74 ── */
console.log('cobros-inquilinos.html: avisoMarcasFila (aviso por email)');
(function () {
  var a = fn('avisoMarcasFila');
  ok('interruptor apagado: no hay fila', a(false, ['[x]'], '1', 'V', 'cobros-inquilinos v33', 'u') === null);
  ok('interruptor desconocido (null): no hay fila', a(null, ['[x]'], '1', 'V', 'cobros-inquilinos v33', 'u') === null);
  ok('sin lineas: no hay fila', a(true, [], '1', 'V', 'cobros-inquilinos v33', 'u') === null);
  var fila = a(true, ['[Fianza devuelta 10/09/2026 17:40 - Toni Seguí]'], 'RES1', 'Villa 18 B', 'cobros-inquilinos v33', 'Toni Seguí');
  ok('fila con fecha, reserva, villa, usuario y lineas',
    fila && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}$/.test(fila.Fecha) && fila.FS_confirmation_code === 'RES1' &&
    fila.Villa === 'Villa 18 B' && fila.Usuario === 'Toni Seguí' && fila.Lineas.indexOf('Fianza devuelta') === 1);
  ok('la pagina que se manda es cobros-inquilinos v33', fila.Pagina === 'cobros-inquilinos v33');
  ok('la funcion copiada sigue dando el enlace de la pagina de notas',
    fila.Enlace === 'https://3villas.com/intranet/notas-equipo-reservas.html?TaBookings2021_FS_confirmation_code=RES1');
  ok('pero el aviso lo cambia por el de esta pagina (donde se marca)',
    SRC.indexOf("fila.Enlace = 'https://3villas.com/intranet/cobros-inquilinos.html?code=' + encodeURIComponent(String(code || ''));") > 0);
  ok('sin usuario: equipo', a(true, ['[x]'], 'RES1', 'V', 'cobros-inquilinos v33', '').Usuario === 'equipo');
  ok('la funcion es la copia literal de notas-equipo-reservas',
    fnSource(F, 'avisoMarcasFila') === fnSource('notas-equipo-reservas.html', 'avisoMarcasFila'));
  ok('la pagina llama al aviso con cobros-inquilinos v33', SRC.indexOf("'cobros-inquilinos v33'") > 0);
  ok('el aviso va a TaAvisos_marcas_manuales', SRC.indexOf('action=create&table=TaAvisos_marcas_manuales') > 0);
  ok('el interruptor se lee una sola vez (la lectura de la v31, sin una segunda peticion)',
    SRC.split('action=data&table=TaConfig_intranet').length - 1 === 1);
})();

/* ── puedeDesmarcarDevolucion(): solo administracion ── */
console.log('cobros-inquilinos.html: puedeDesmarcarDevolucion');
(function () {
  function conRol(rol) {
    var body = fnSource(F, 'puedeDesmarcarDevolucion') + '\nreturn puedeDesmarcarDevolucion;';
    return new Function('Auth', body)({ role: function () { return rol; } })();
  }
  ok('admin puede desmarcar', conRol('admin') === true);
  ok('manager NO puede desmarcar', conRol('manager') === false);
  ok('staff NO puede desmarcar', conRol('staff') === false);
  ok('ADMIN en mayusculas tambien', conRol('ADMIN') === true);
  ok('sin rol no puede', conRol('') === false);
  ok('misma regla que notas-equipo-reservas v74',
    fnSource(F, 'puedeDesmarcarDevolucion').replace('puedeDesmarcarDevolucion', 'X') ===
    fnSource('notas-equipo-reservas.html', 'puedeDesmarcarCobro').replace('puedeDesmarcarCobro', 'X'));
})();

/* ── la pagina: filtro, contador y guardado ── */
console.log('cobros-inquilinos.html: filtro, contador y guardado');
(function () {
  ok('la pastilla nueva "Enviado a firmar" con valor 2', /data-val="2"[^>]*>Enviado a firmar</.test(SRC));
  ok('el valor 1 de la pastilla no cambia',
    SRC.indexOf("if(_devFilter === '1') clauses.push(`TaBookings2021_Security_deposit_devuelto=1`)") > 0);
  ok('el valor 0 (Pendiente) mira las DOS marcas, igual que el contador',
    SRC.indexOf("else if(_devFilter === '0') clauses.push(`(TaBookings2021_Security_deposit_devuelto=0 OR TaBookings2021_Security_deposit_devuelto IS NULL) AND (TaBookings2021_Security_deposit_devolver_firmar=0 OR TaBookings2021_Security_deposit_devolver_firmar IS NULL)`)") > 0);
  ok('el valor 2 filtra por el paso 1 sin devolver',
    SRC.indexOf("else if(_devFilter === '2') clauses.push(`TaBookings2021_Security_deposit_devolver_firmar=1 AND (TaBookings2021_Security_deposit_devuelto=0 OR TaBookings2021_Security_deposit_devuelto IS NULL)`)") > 0);
  ok('contador nuevo statFirmar en la barra de totales', SRC.indexOf('id="statFirmar"') > 0);
  ok('la casilla unica de la v1 ya no existe (solo queda nombrada en el historial)',
    SRC.indexOf('function saveDevuelto') < 0 && SRC.indexOf('onchange="saveDevuelto') < 0 && SRC.indexOf('type="checkbox"') < 0);
  ok('el guardado es un solo PUT a TaBookings2021',
    SRC.indexOf('?action=save&table=TaBookings2021&method=PUT&where=${encodeURIComponent(where)}') > 0);
  ok('el rastro se lee de la tabla, no de la vista',
    SRC.indexOf('?action=data&table=TaBookings2021&where=') > 0);
  ok('los sellos se leen en lotes de 40 como mucho', /i \+= 40/.test(SRC) && /slice\(i, i \+ 40\)/.test(SRC));
  ok('el rastro se vuelve a leer justo antes de escribir',
    SRC.indexOf('const marcas = await leerMarcasUna(code);') > 0 &&
    SRC.indexOf('const marcas = await leerMarcasUna(code);') < SRC.indexOf('body.Marcas_manuales = marcasConLinea(marcas, linea, 3800);'));
  ok('si no se puede leer el historial no se escribe nada y se avisa',
    SRC.indexOf("alert('No se ha podido leer el historial de marcas. Inténtalo de nuevo.');") > 0 &&
    SRC.indexOf('if(marcas === null){') < SRC.indexOf('const url   = Auth.url(`${WORKER}?action=save'));
  ok('la marca siempre lleva su linea (no hay guardado sin Marcas_manuales)',
    SRC.indexOf('body.Marcas_manuales = marcasConLinea(marcas, linea, 3800);') > 0);
  ok('los flags se escriben como 1 y 0, no como booleanos',
    /const nuevo = valor \? 1 : 0;/.test(SRC) && /body\[campo\] = nuevo;/.test(SRC) &&
    fnSource(F, 'guardarDevolucion').indexOf('true') < 0);
  ok('los tres WHERE de la v33 escapan la comilla con sqlq, no con esc (esc es para HTML)',
    ['guardarDevolucion', 'leerMarcasUna', 'cargarMarcasDevolucion'].every(function (nm) {
      var f = fnSource(F, nm);
      return f.indexOf('sqlq(') > 0 && f.indexOf("='${esc(") < 0;
    }) && new Function(fnSource(F, 'sqlq') + "\nreturn sqlq(\"O'Brien\");")() === "O''Brien");
  ok('los botones no se pueden pulsar hasta que el lote inicial termina',
    /_marcasReady \? '' : ' disabled/.test(SRC) && /_marcasReady = true; pintarTodasDevoluciones\(\)/.test(SRC));
  ok('cada marca pregunta con confirm', /confirm\(pregunta\)/.test(SRC) && /como enviada a firmar\?/.test(SRC) && /como devuelta\?/.test(SRC));
  ok('el aviso se manda despues del guardado, nunca antes',
    SRC.indexOf("throw new Error('HTTP ' + res.status)") < SRC.indexOf('avisarMarcasDevolucion([linea], code,'));
  ok('si el guardado falla se avisa y se deshace lo pintado',
    SRC.indexOf("alert('No se pudo guardar la marca de la fianza: '") > 0 && SRC.indexOf('recs.forEach(r => { r[vista] = previo; });') > 0);
  ok('la lista muestra el estado con botones', /data-botones="1">\$\{devolucionHTML\(r, true\)\}/.test(SRC));
  ok('la ficha tambien lleva botones (es la vista por defecto y la del enlace ?code=)',
    SRC.split('data-botones="1"').length - 1 === 2 && SRC.indexOf('data-botones="0"') < 0);
  ok('los botones dicen Marcar enviado a firmar y Marcar devuelto',
    SRC.indexOf('>Marcar enviado a firmar<') > 0 && SRC.indexOf('>Marcar devuelto<') > 0);
  ok('la etiqueta del paso 1 no lleva icono', SRC.indexOf('b-pend">Enviado a firmar<') > 0 && SRC.indexOf('✉') < 0);
  ok('la ficha ensena la cuenta de la devolucion con la opcion 3',
    SRC.indexOf('${fmtCuentaDevolucion(r)}') > 0);
  ok('la ordenacion de la columna Devuelto usa los tres estados',
    /paso\[estadoDevolucion\(a\['TaBookings2021_Security_deposit_devolver_firmar'\]/.test(SRC));
  ok('con Pendiente o Enviado a firmar la lista se ordena por check-in',
    SRC.indexOf("const orden = (_devFilter === '0' || _devFilter === '2') ? 'TaBookings2021_Checkin DESC' : 'Ta_payments_Transactiaon_date DESC';") > 0);
  ok('el aviso de lista cortada se pinta encima de la lista', SRC.indexOf('id="avisoCorteWrap"') > 0 && SRC.indexOf('const corte = avisoCorte(_allRecs.length);') > 0);
})();

/* ── version ── */
console.log('cobros-inquilinos.html: version');
(function () {
  ok('cabecera v33', /VERSIÓN ACTUAL: v33 \|/.test(SRC));
  ok('titulo v33', /<title>Control Cobros Inquilinos v33 — 3Villas<\/title>/.test(SRC));
  ok('el historial empieza en v33', /<!-- HISTORIAL: v33 - Toni Segui \(10\/09\/2026 17:40, WhatsApp\)/.test(SRC));
  ok('y conserva la v32 y la v31', / \| v32 - /.test(SRC) && / \| v31 - /.test(SRC));
})();

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
