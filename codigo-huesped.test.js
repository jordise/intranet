/* Pruebas del bloque "Código para el huésped" de notas-equipo-reservas v76 y del
   arreglo de pantalla del código alternativo. Caso de Cristian (10/09/2026 19:05,
   feel good communication, reserva 54614278: el huésped no recibía el código por
   email) y pregunta de Jordi (22:14).
   node codigo-huesped.test.js

   Como cobros-devolucion-fianza.test.js: NO copia el codigo de la pagina. Extrae
   el texto real de cada funcion del HTML y lo ejecuta. */
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

var F = 'notas-equipo-reservas.html';
var SRC = fs.readFileSync(F, 'utf8');
function fn(name, extra) {
  return new Function((extra || '') + '\n' + fnSource(F, name) + '\nreturn ' + name + ';')();
}

/* ── altCodeAplica(guestEmail, segundoEmail) ── */
console.log('notas-equipo-reservas.html: altCodeAplica');
(function () {
  var vale = fn('altCodeAplica');
  ok('sin ningun email: el codigo alternativo vale', vale('', '') === true);
  ok('campos nulos o sin definir: vale', vale(null, undefined) === true && vale() === true);
  ok('solo espacios: vale', vale('   ', '  ') === true);
  ok('solo el alias de Booking: vale (no se le envia OTP)', vale('xmodol.596116@guest.booking.com', '') === true);
  ok('el alias en mayusculas tambien es alias', vale('XMODOL.596116@GUEST.BOOKING.COM', '') === true);
  ok('alias en los dos campos: vale', vale('a@guest.booking.com', 'b@guest.booking.com') === true);
  ok('email real de Hostaway: NO vale', vale('ana@gmail.com', '') === false);
  ok('solo email del Arrival Form: NO vale', vale('', 'ana@gmail.com') === false);
  ok('alias de Booking + email personal: NO vale', vale('x@guest.booking.com', 'ana@gmail.com') === false);
  ok('email de la casa @3villas.com: NO vale (es un email efectivo)', vale('bookings@3villas.com', '') === false);
  ok('un email que solo contiene el dominio de Booking en medio no es alias',
    vale('guest.booking.com.ana@gmail.com', '') === false);
  ok('espacios alrededor de un email real: NO vale', vale('  ana@gmail.com ', '') === false);
})();

/* ── buildCodigoMsg(ph, nm, link, codigo) ── */
console.log('notas-equipo-reservas.html: buildCodigoMsg');
(function () {
  var msg = fn('buildCodigoMsg');
  var LINK = 'https://www.3villas.com/intranet/checkin-pasos.html?reserva=54614278';
  var COD = '12345';

  var es = msg('+34 600 11 22 33', 'Ana', LINK, COD);
  ok('ES: saluda por el nombre', es.indexOf('Hola Ana,') === 0);
  ok('ES: lleva el codigo', es.indexOf(COD) > 0);
  ok('ES: lleva el enlace de la reserva', es.indexOf(LINK) > 0);
  ok('ES: nombra el boton de la pantalla del huesped', es.indexOf('Ya tengo un código') > 0);
  ok('ES: dice que vale una sola vez', es.indexOf('una sola vez') > 0);
  ok('ES: dice que no hay que repetirlo hasta el final de la estancia', es.indexOf('final de su estancia') > 0);
  ok('ES: firma 3VILLAS', /3VILLAS$/.test(es));

  var en = msg('+44 7700 900123', 'John', LINK, COD);
  ok('EN por defecto para un prefijo que no es 34/33/39', en.indexOf('Hello John,') === 0);
  ok('EN: nombra el boton en ingles', en.indexOf('I already have a code') > 0);
  ok('EN: lleva codigo y enlace', en.indexOf(COD) > 0 && en.indexOf(LINK) > 0);

  var fr = msg('+33 6 12 34 56 78', 'Marie', LINK, COD);
  ok('FR por el prefijo 33', fr.indexOf('Bonjour Marie,') === 0);
  ok('FR: nombra el boton en frances', fr.indexOf('J’ai déjà un code') > 0);
  ok('FR: lleva codigo y enlace', fr.indexOf(COD) > 0 && fr.indexOf(LINK) > 0);

  var it = msg('+39 320 1234567', 'Luca', LINK, COD);
  ok('IT por el prefijo 39', it.indexOf('Buongiorno Luca,') === 0);
  ok('IT: nombra el boton en italiano', it.indexOf('Ho già un codice') > 0);
  ok('IT: lleva codigo y enlace', it.indexOf(COD) > 0 && it.indexOf(LINK) > 0);

  ok('el prefijo sin + ni espacios tambien se reconoce',
    msg('34 600 11 22 33', 'Ana', LINK, COD).indexOf('Hola') === 0 &&
    msg('+34-600-112-233', 'Ana', LINK, COD).indexOf('Hola') === 0);
  ok('el prefijo escrito 0034 cuenta como Espana (revision del checker 11/09/2026)',
    msg('0034600112233', 'Ana', LINK, COD).indexOf('Hola') === 0);
  ok('0033 cuenta como Francia', msg('0033612345678', 'Ana', LINK, COD).indexOf('Bonjour') === 0);
  ok('sin nombre: saluda "Hola," sin espacio ni coma suelta', msg('+34600112233', '', LINK, COD).indexOf('Hola,') === 0);
  ok('sin nombre en ingles: "Hello,"', msg('+44700000000', '', LINK, COD).indexOf('Hello,') === 0);
  ok('sin telefono: ingles', msg('', 'Ana', LINK, COD).indexOf('Hello') === 0);
  ok('sin nombre no rompe y no deja "undefined"',
    msg('+34600112233', '', LINK, COD).indexOf('undefined') < 0);

  /* texto plano: se pega en WhatsApp, no admite simbolos de formato */
  [es, en, fr, it].forEach(function (m, i) {
    var idioma = ['ES', 'EN', 'FR', 'IT'][i];
    ok(idioma + ': sin asteriscos ni guiones bajos de formato', m.indexOf('*') < 0 && m.indexOf('_') < 0);
    ok(idioma + ': ninguna linea empieza por viñeta (-, *, >)',
      m.split('\n').every(function (l) { return !/^\s*[-*>]/.test(l); }));
    ok(idioma + ': saltos de linea de verdad, no "\\n" escrito', m.indexOf('\n') > 0 && m.indexOf('\\n') < 0);
    ok(idioma + ': los tres pasos van numerados', /\n1\. /.test(m) && /\n2\. /.test(m) && /\n3\. /.test(m));
  });

  ok('sin markdown de enlace: el link va desnudo', es.indexOf('](') < 0 && es.indexOf('<' + LINK) < 0);
})();

/* ── el cableado de la pagina (texto real del HTML) ── */
console.log('notas-equipo-reservas.html: bloque y llamada al Worker');
(function () {
  ok('el bloque verde es el primero del cuerpo de la seccion Login',
    SRC.indexOf('🔑 Código para el huésped') > SRC.indexOf('<div class="col-body" id="bodyColLogin">') &&
    SRC.indexOf('🔑 Código para el huésped') < SRC.indexOf('¿Quién puede entrar al check-in online?'));
  ok('frase acordada del bloque',
    SRC.indexOf('Si el huésped no recibe el código por email, genera uno aquí y envíaselo por WhatsApp. Vale una vez y no se anula aunque el huésped vuelva a pulsar «enviar código».') > 0);
  ok('boton Generar codigo',
    /id="btnCodigoHuesped" onclick="generarCodigoHuesped\(\)"/.test(SRC) && SRC.indexOf('🔑 Generar código') > 0);
  ok('area de resultado oculta al cargar', /id="codigoHuespedRes" style="display:none/.test(SRC));
  ok('el codigo sale en grande y en monoespaciada',
    /<code id="codigoHuesped" style="font-family:'Courier New',monospace;font-size:22px/.test(SRC));
  ok('los dos botones de copiar',
    SRC.indexOf('onclick="copiarCodigoHuesped()"') > 0 && SRC.indexOf('onclick="copiarMsgCodigoHuesped()"') > 0);
  ok('llama al Worker con la accion nueva y la sesion del equipo',
    SRC.indexOf("WORKER+'?action=staff-checkin-code'") > 0 &&
    /headers:Object\.assign\(\{'Content-Type':'application\/json'\},Auth\.headers\(\)\)/.test(SRC) &&
    /body:JSON\.stringify\(\{bookingCode:confCode\}\)/.test(SRC));
  ok('estado ocupado del boton mientras genera', SRC.indexOf("btn.textContent='Generando…'") > 0);
  ok('el error del Worker se muestra tal cual en un toast',
    /toast\('❌ '\+\(j\.error\|\|'No se pudo generar el código'\),'err'\)/.test(SRC));
  ok('linea gris con el destinatario y el limite de tres codigos', SRC.indexOf("'vale una vez · no caduca · el equipo conserva los tres últimos'") > 0);
  ok('el mensaje de WhatsApp se arma con los campos de la reserva',
    /buildCodigoMsg\(\s*fB\('Guest_phonenumber'\)\|\|fB\('Segundo_Telefono'\),/.test(SRC) &&
    /fB\('Fiscal_guest_name'\)\|\|fB\('Guest_Full_Name'\)\|\|'',/.test(SRC) &&
    SRC.indexOf("'https://www.3villas.com/intranet/checkin-pasos.html?reserva='+confCode") > 0);
  ok('los botones son window.* (onclick inline, como copiarAltCode)',
    SRC.indexOf('window.generarCodigoHuesped=function()') > 0 &&
    SRC.indexOf('window.copiarCodigoHuesped=function()') > 0 &&
    SRC.indexOf('window.copiarMsgCodigoHuesped=function()') > 0);
  ok('no se usa ningun enlace wa.me: el texto se copia',
    SRC.split('<!-- HISTORIAL:')[0].indexOf('wa.me') < 0);
})();

console.log('notas-equipo-reservas.html: codigo alternativo y textos');
(function () {
  ok('la caja amarilla tiene id para poder ocultarla', SRC.indexOf('<div id="bloqueAltCode"') > 0);
  ok('el relleno consulta altCodeAplica con los dos emails',
    /altCodeAplica\(bkEmail\('Guest_email'\)\|\|bkEmail\('Email'\),bkEmail\('Segundo_email'\)\)/.test(SRC));
  ok('si no aplica, la caja se oculta y el codigo queda en "—"',
    /g\('loginAltCode'\)\.textContent=\(_altOk&&_lc\)\?\('5'\+_lc\+'7'\):'—';/.test(SRC) &&
    /_altBox\.style\.display=_altOk\?'':'none';/.test(SRC));
  ok('bkEmail existe como funcion propia', SRC.indexOf("function bkEmail(k){return String(fB(k)||'').trim();}") > 0);

  ok('la lista morada ya no ofrece "cualquier email @3villas.com" a secas',
    SRC.indexOf('para que el equipo pueda entrar sin ser el huésped') < 0);
  ok('y explica el boton del equipo',
    SRC.indexOf('<b>El equipo:</b> con el botón «Generar código» de arriba') > 0);
  ok('Tiempos de login cuenta las reglas de verdad',
    SRC.indexOf('El código del huésped no caduca y vale una sola vez.') > 0 &&
    SRC.indexOf('los tres últimos siguen valiendo') > 0 &&
    SRC.indexOf('hasta 3 días después del checkout') > 0);
  ok('y ya no dice que la sesion dura un mes', SRC.indexOf('sesión dura ~1 mes') < 0);
})();

/* ── version ── */
console.log('notas-equipo-reservas.html: version');
(function () {
  ok('cabecera v76', /VERSIÓN ACTUAL: v76 \|/.test(SRC));
  ok('titulo v76', /<title>Notas Equipo Reservas v76 — 3Villas<\/title>/.test(SRC));
  ok('PAGE_VERSION 76 (la auto-recarga mira este numero)',
    SRC.indexOf('var PAGE_VERSION = 76;') > 0 && SRC.indexOf('var PAGE_VERSION = 75;') < 0);
  ok('el historial empieza en v76', /<!-- HISTORIAL: v76 - Caso de Cristian \(10\/09\/2026 19:05/.test(SRC));
  ok('y conserva la v75 y la v74', / \| v75 - /.test(SRC) && / \| v74 - /.test(SRC));
})();

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
