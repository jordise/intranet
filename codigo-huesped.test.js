/* Pruebas del bloque "Código para el huésped" de notas-equipo-reservas v76 y del
   arreglo de pantalla del código alternativo. Caso de Cristian (10/09/2026 19:05,
   feel good communication, reserva 54614278: el huésped no recibía el código por
   email) y pregunta de Jordi (22:14).
   v77: enlace de acceso de un toque (botón «Enviar acceso»), tras el segundo aviso
   de Cristian (11/09/2026: "no encuentro el botón").
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
  ok('frase acordada del bloque (v77: nombra el enlace y el código)',
    SRC.indexOf('Si el huésped no recibe el código por email, envíale el enlace de acceso (recomendado) o genera un código.') > 0);
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

/* ══════════ v77: ENLACE DE ACCESO (un toque) ══════════ */

/* ── buildAccesoMsg(ph, nm, link) ── */
console.log('notas-equipo-reservas.html: buildAccesoMsg (v77)');
(function () {
  var msg = fn('buildAccesoMsg');
  var LINK = 'https://www.3villas.com/intranet/checkin-pasos.html?reserva=54614278&acceso=abc.def.ghi';

  var es = msg('+34 600 11 22 33', 'Ana', LINK);
  ok('ES: saluda por el nombre', es.indexOf('Hola Ana,') === 0);
  ok('ES: lleva el enlace entero', es.indexOf(LINK) > 0);
  ok('ES: dice que no hace falta código', es.indexOf('sin código') > 0);
  ok('ES: dice cualquier dispositivo y 3 días después de la salida',
    es.indexOf('cualquier dispositivo') > 0 && es.indexOf('3 días después de su salida') > 0);
  ok('ES: no menciona ningún código de acceso', es.indexOf('Su código') < 0);
  ok('ES: firma 3VILLAS', /3VILLAS$/.test(es));

  var en = msg('+44 7700 900123', 'John', LINK);
  ok('EN por defecto para un prefijo que no es 34/33/39', en.indexOf('Hello John,') === 0);
  ok('EN: lleva el enlace y dice que no hace falta código',
    en.indexOf(LINK) > 0 && en.indexOf('no code needed') > 0);

  var fr = msg('+33 6 12 34 56 78', 'Marie', LINK);
  ok('FR por el prefijo 33', fr.indexOf('Bonjour Marie,') === 0);
  ok('FR: lleva el enlace y dice sans code', fr.indexOf(LINK) > 0 && fr.indexOf('sans code') > 0);

  var it = msg('+39 320 1234567', 'Luca', LINK);
  ok('IT por el prefijo 39', it.indexOf('Buongiorno Luca,') === 0);
  ok('IT: lleva el enlace y dice senza codice', it.indexOf(LINK) > 0 && it.indexOf('senza codice') > 0);

  ok('el prefijo sin + ni espacios tambien se reconoce',
    msg('34 600 11 22 33', 'Ana', LINK).indexOf('Hola') === 0 &&
    msg('+34-600-112-233', 'Ana', LINK).indexOf('Hola') === 0);
  ok('el prefijo escrito 0034 cuenta como Espana',
    msg('0034600112233', 'Ana', LINK).indexOf('Hola') === 0);
  ok('0033 cuenta como Francia y 0039 como Italia',
    msg('0033612345678', 'Ana', LINK).indexOf('Bonjour') === 0 &&
    msg('0039320123456', 'Ana', LINK).indexOf('Buongiorno') === 0);
  ok('sin nombre: saluda "Hola," sin espacio ni coma suelta', msg('+34600112233', '', LINK).indexOf('Hola,') === 0);
  ok('sin nombre en ingles: "Hello,"', msg('+44700000000', '', LINK).indexOf('Hello,') === 0);
  ok('sin telefono: ingles', msg('', 'Ana', LINK).indexOf('Hello') === 0);
  ok('sin nombre no rompe y no deja "undefined"', msg('+34600112233', '', LINK).indexOf('undefined') < 0);
  ok('sin enlace no deja "undefined"', msg('+34600112233', 'Ana', '').indexOf('undefined') < 0);

  /* texto plano: se pega en WhatsApp, no admite simbolos de formato */
  [es, en, fr, it].forEach(function (m, i) {
    var idioma = ['ES', 'EN', 'FR', 'IT'][i];
    ok(idioma + ': sin asteriscos ni guiones bajos de formato', m.indexOf('*') < 0 && m.indexOf('_') < 0);
    ok(idioma + ': ninguna linea empieza por viñeta (-, *, >)',
      m.split('\n').every(function (l) { return !/^\s*[-*>]/.test(l); }));
    ok(idioma + ': saltos de linea de verdad, no "\\n" escrito', m.indexOf('\n') > 0 && m.indexOf('\\n') < 0);
    ok(idioma + ': el enlace va en su propia linea, desnudo',
      m.split('\n').indexOf(LINK) > 0 && m.indexOf('](') < 0 && m.indexOf('<' + LINK) < 0);
  });
})();

/* ── el cableado del enlace de acceso ── */
console.log('notas-equipo-reservas.html: boton Enviar acceso y bloque del enlace (v77)');
(function () {
  ok('el boton esta en la fila CHECKIN ONLINE, justo detras del boton Login',
    /id="btnEnviarAcceso" onclick="enviarAcceso\(\)"/.test(SRC) &&
    SRC.indexOf('id="btnEnviarAcceso"') > SRC.indexOf("togCiSection('colLogin')") &&
    SRC.indexOf('id="btnEnviarAcceso"') < SRC.indexOf('<div class="ci-bar">'));
  ok('texto y titulo del boton',
    SRC.indexOf('🔗 Enviar acceso') > 0 &&
    SRC.indexOf('title="Copia un mensaje con el enlace de acceso del huésped (sin código)"') > 0);
  ok('es verde, como el bloque del codigo',
    /id="btnEnviarAcceso"[^>]*background:#ecfdf5;color:#047857;border:1\.5px solid #047857/.test(SRC));

  ok('el bloque del enlace va DENTRO de la tarjeta verde y ENCIMA de Generar codigo',
    SRC.indexOf('id="btnAccesoBloque"') > SRC.indexOf('🔑 Código para el huésped') &&
    SRC.indexOf('id="btnAccesoBloque"') < SRC.indexOf('id="btnCodigoHuesped"'));
  ok('boton Crear enlace', /id="btnAccesoBloque" onclick="enviarAcceso\(\)"/.test(SRC) && SRC.indexOf('🔗 Crear enlace') > 0);
  ok('linea que explica el enlace',
    SRC.indexOf('el huésped entra directo en cualquier dispositivo hasta 3 días después del checkout.') > 0);
  ok('area de resultado oculta al cargar', /id="accesoRes" style="display:none/.test(SRC));
  ok('el enlace sale en monoespaciada y parte las lineas largas',
    /id="accesoLink" style="font-family:'Courier New',monospace;[^"]*word-break:break-all/.test(SRC));
  ok('los dos botones de copiar',
    SRC.indexOf('onclick="copiarAcceso()"') > 0 && SRC.indexOf('onclick="copiarMsgAcceso()"') > 0 &&
    SRC.indexOf('📋 Copiar enlace') > 0 && SRC.indexOf('📋 Copiar mensaje') > 0);
  ok('linea gris de validez', SRC.indexOf('id="accesoInfo"') > 0 &&
    SRC.indexOf("'personal · cualquier dispositivo'") > 0 && SRC.indexOf("'Válido hasta '") > 0);

  ok('llama al Worker con la accion del enlace y la sesion del equipo',
    SRC.indexOf("WORKER+'?action=staff-checkin-link'") > 0 &&
    /action=staff-checkin-link'[\s\S]{0,200}headers:Object\.assign\(\{'Content-Type':'application\/json'\},Auth\.headers\(\)\)/.test(SRC) &&
    /action=staff-checkin-link'[\s\S]{0,260}body:JSON\.stringify\(\{bookingCode:confCode\}\)/.test(SRC));
  ok('sin reserva no llama al Worker', /window\.enviarAcceso=function\(\)\{\s*if\(!confCode\)\{toast/.test(SRC));
  ok('estado ocupado de los botones mientras crea', SRC.indexOf("b.textContent='Creando…'") > 0);
  ok('el mensaje de WhatsApp se arma con los campos de la reserva y el enlace',
    /buildAccesoMsg\(\s*fB\('Guest_phonenumber'\)\|\|fB\('Segundo_Telefono'\),/.test(SRC) &&
    SRC.split('buildAccesoMsg(').length - 1 === 3 /* definicion + enviarAcceso + copiarMsgAcceso */);
  ok('enviarAcceso copia el mensaje y avisa',
    /toast\(_accesoFallback\?'✅ Enlace copiado \(dura 72 h/.test(SRC) && SRC.indexOf("'✅ Enlace copiado, pégalo en WhatsApp'") > 0 && /navigator\.clipboard\.writeText\(msg\)/.test(SRC));
  ok('si el portapapeles falla, abre la seccion Login SOLO si esta cerrada y avisa',
    /getComputedStyle\(col\)\.display==='none'\)togCiSection\('colLogin'\)/.test(SRC) &&
    SRC.indexOf("toast('Enlace listo, pulsa Copiar mensaje','ok')") > 0);
  ok('el enlace se pinta siempre, tanto si el portapapeles funciona como si no',
    SRC.indexOf('pintarAcceso(j);') > 0 && SRC.split('pintarAcceso(').length - 1 === 2);
  ok('el error del Worker se muestra tal cual en un toast',
    /toast\('❌ '\+\(j\.error\|\|'No se pudo crear el enlace'\),'err'\)/.test(SRC));
  ok('los botones son window.* (onclick inline)',
    SRC.indexOf('window.enviarAcceso=function()') > 0 &&
    SRC.indexOf('window.copiarAcceso=function()') > 0 &&
    SRC.indexOf('window.copiarMsgAcceso=function()') > 0);
  ok('?ci=login abre la seccion Login del huesped',
    /var cm=\{login:'colLogin',arrival:'colArrival'/.test(SRC));
})();

/* ── version ── */
console.log('notas-equipo-reservas.html: version');
(function () {
  ok('cabecera v77', /VERSIÓN ACTUAL: v77 \|/.test(SRC));
  ok('titulo v77', /<title>Notas Equipo Reservas v77 — 3Villas<\/title>/.test(SRC));
  ok('PAGE_VERSION 77 (la auto-recarga mira este numero)',
    SRC.indexOf('var PAGE_VERSION = 77;') > 0 && SRC.indexOf('var PAGE_VERSION = 76;') < 0);
  ok('el historial empieza en v77 y nombra el caso', /<!-- HISTORIAL: v77 - Cristian \(11\/09\/2026\)/.test(SRC));
  ok('y conserva la v76, la v75 y la v74',
    / \| v76 - /.test(SRC) && / \| v75 - /.test(SRC) && / \| v74 - /.test(SRC));
})();


/* ── revision del checker 11/09/2026: fallback, fecha de caducidad, wrap ── */
console.log('notas-equipo-reservas.html: fallback + fmtAccesoExpira + wrap');
(function () {
  var msgA = fn('buildAccesoMsg');
  ok('con fallback el mensaje ES dice 72 horas y no promete 3 dias', /72 horas/.test(msgA('+34600112233', 'Ana', 'https://x', true)) && !/3 días/.test(msgA('+34600112233', 'Ana', 'https://x', true)));
  ok('sin fallback el mensaje ES promete hasta 3 dias despues de su salida', /3 días después de su salida/.test(msgA('+34600112233', 'Ana', 'https://x', false)));
  ok('con fallback el mensaje EN dice 72 hours', /72 hours/.test(msgA('+44700000000', 'Ann', 'https://x', true)));
  ok('con fallback FR e IT tambien cambian', /72 heures/.test(msgA('+33612345678', 'Luc', 'https://x', true)) && /72 ore/.test(msgA('+39333000000', 'Gio', 'https://x', true)));
  var fmt = fn('fmtAccesoExpira');
  ok('fmtAccesoExpira: exp 2026-10-11T00:00:00Z (checkout 07/10 + 3 dias) muestra el ultimo dia valido 10/10/2026', fmt(Date.UTC(2026, 9, 11) / 1000) === '10/10/2026', fmt(Date.UTC(2026, 9, 11) / 1000));
  ok('fmtAccesoExpira: vacio sin numero', fmt('') === '' && fmt(0) === '');
  ok('la fila CHECKIN ONLINE hace wrap en movil', SRC.indexOf('display:flex;flex-wrap:wrap;align-items:stretch;gap:10px;padding:12px 16px;') > 0);
  ok('enviarAcceso pasa el flag fallback al mensaje y a la linea gris', /_accesoLinkVal, _accesoFallback\);/.test(SRC) && SRC.indexOf("j&&j.fallback?'Válido 72 horas") > 0);
  ok('la tarjeta sigue explicando que el codigo vale una vez', SRC.indexOf('El código vale una vez y no se anula aunque el huésped vuelva a pulsar «enviar código».') > 0);
})();

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);