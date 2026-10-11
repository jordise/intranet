/* Pruebas del envio directo del recordatorio por Whaticket (notas-equipo-reservas v84,
   11/10/2026). El Worker whaticket-front-notify tiene sus propias pruebas
   (3villas/workers/whaticket-front-notify/test/reminder.test.mjs); aqui se prueba la
   pagina: el cuerpo de la llamada (una sola reserva), los textos de error, que el
   envio solo sale del boton de la ventana de confirmacion y que no hay envio masivo.
   node whaticket-envio.test.js

   Como codigo-huesped.test.js: NO copia el codigo de la pagina. Extrae el texto
   real de cada funcion del HTML y lo ejecuta. */
var fs = require('fs');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

function fnSource(src, name) {
  var i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = src.indexOf('{', i), depth = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) { k++; break; } }
  }
  return src.slice(i, k);
}
/* window.x = function(...) { ... }; */
function winFnSource(src, name) {
  var i = src.indexOf('window.' + name + ' = function');
  if (i < 0) throw new Error('no encuentro window.' + name);
  var j = src.indexOf('{', i), depth = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) { k++; break; } }
  }
  return src.slice(i, k);
}

var SRC = fs.readFileSync('notas-equipo-reservas.html', 'utf8');
var VIVO = SRC.split('<!-- HISTORIAL:')[0];
function fn(name) { return new Function(fnSource(SRC, name) + '\nreturn ' + name + ';')(); }

console.log('wtReminderBody: una sola reserva por llamada');
(function () {
  var b = fn('wtReminderBody');
  var p = b(' 55990582 ', false, 'Ana  Villa/1  12/10');
  ok('vista previa: codigo limpio, telefono host, nombre de agenda, sin hash',
    JSON.stringify(p) === JSON.stringify({ code: '55990582', phone: 'host', contactName: 'Ana  Villa/1  12/10' }), JSON.stringify(p));
  var s = b('55990582', true, '', 'abc');
  ok('envio: telefono arrival y el hash confirmado', s.phone === 'arr' && s.hash === 'abc' && s.code === '55990582');
  ok('nunca una lista de codigos', typeof b(['1', '2'], false, '').code === 'string' && !('codes' in s));
})();

console.log('wtErrText');
(function () {
  var t = fn('wtErrText');
  ok('usa el mensaje del servidor', t(429, { message: 'Espere 12 segundos' }) === 'Espere 12 segundos');
  ok('401 sin mensaje = sesion caducada', /Sesión caducada/.test(t(401, {})));
  ok('sin conexion = no se ha enviado nada', /No se ha enviado nada/.test(t(0, {})));
  ok('otro error = codigo y nada enviado', t(500, null) === 'Error 500. No se ha enviado nada.');
  ok('envio sin respuesta = estado desconocido, nunca "nada enviado"', /Estado desconocido/.test(t(0, {}, true)) && !/No se ha enviado nada/.test(t(0, {}, true)));
  ok('envio con 5xx sin mensaje = estado desconocido', /Estado desconocido/.test(t(524, null, true)) && /Estado desconocido/.test(t(500, {}, true)));
  ok('envio con 4xx sin mensaje = error y nada enviado', t(400, {}, true) === 'Error 400. No se ha enviado nada.');
})();

console.log('wtPuedeEnviar: el boton solo para los roles que acepta el Worker');
(function () {
  var p = fn('wtPuedeEnviar');
  ok('admin y staff si', p('admin') && p('staff') && p(' Staff '));
  ok('manager, sales, cleaner y vacio no', !p('manager') && !p('sales') && !p('cleaner') && !p('') && !p(null));
  ok('la pagina oculta el boton segun el rol de la sesion',
    /var b = g\('c2dSendBtn'\); if \(b && !wtPuedeEnviar\(Auth\.role\(\)\)\) b\.style\.display = 'none';/.test(SRC));
})();

console.log('flujo: vista previa -> confirmacion -> envio');
(function () {
  var start = winFnSource(SRC, 'c2dSendStart'), send = winFnSource(SRC, 'wtConfSend');
  ok('el boton del modal solo pide la vista previa', /wtPost\('preview'/.test(start) && !/wtPost\('send'/.test(start));
  ok('el envio solo sale del boton "Enviar ahora" de la confirmacion',
    /wtPost\('send'/.test(send) && VIVO.indexOf('id="wtConfGo" onclick="wtConfSend()"') > 0 &&
    (VIVO.match(/wtConfSend\(\)/g) || []).length === 1);
  ok('el envio lleva el hash del texto mostrado', /p\.hash\)/.test(send));
  ok('la confirmacion muestra el numero y el texto exacto',
    VIVO.indexOf('id="wtConfPhone"') > 0 && VIVO.indexOf('id="wtConfText"') > 0 &&
    /g\('wtConfPhone'\)\.textContent = p\.phone/.test(SRC) && /g\('wtConfText'\)\.textContent = p\.text/.test(SRC));
  ok('el texto se pone con textContent, nunca innerHTML', !/wtConfText'\)\.innerHTML/.test(SRC));
  ok('si el servidor bloquea (ya enviado, limite diario) no hay boton de enviar', /if \(p\.blocked\) \{[^}]*go\.style\.display = 'none'/.test(SRC));
  ok('la confirmacion muestra el estado de la reserva', /' · estado ' \+ p\.status/.test(SRC));
  ok('un error o un estado desconocido en el envio quita el boton', /res\.status === 0 \|\| res\.status >= 500\) \{[^}]*go\.style\.display = 'none'/.test(send));
  ok('el envio usa el texto de estado desconocido', (send.match(/wtErrText\(res\.status, res\.j, true\)/g) || []).length === 2);
  ok('la nota dice un solo recordatorio por reserva (no 24 h)', VIVO.indexOf('un solo recordatorio por reserva') > 0 && VIVO.indexOf('cada 24 horas') < 0);
  ok('tras un envio correcto marca contactados_1er_whatsapp como markC de entradas-primer-contacto-whatsapp',
    /contactados_1er_whatsapp: true/.test(send) && /action=save&table=TaBookings2021/.test(send) && /method=PUT/.test(send));
  ok('si cambia el texto, vuelve a mostrar la confirmacion con el nuevo', /text_changed/.test(send) && /wtShowConf\(res\.j\.preview\)/.test(send));
})();

console.log('seguridad y protecciones del numero');
(function () {
  ok('llama al Worker en el mismo host', /var WT_REMINDER = 'https:\/\/www\.3villas\.com\/intranet\/whaticket\/reminder\/';/.test(SRC));
  ok('ningun token de Whaticket ni llamada directa a api.whaticket.com en la pagina',
    VIVO.indexOf('api.whaticket.com') < 0 && VIVO.indexOf('WT_SEND_TOKEN') < 0 && VIVO.indexOf('WT_TOKEN') < 0);
  ok('sin envio masivo: ni "enviar todos", ni bucles de envio, ni listas de codigos',
    !/enviar todos|enviar a todos|send all|sendAll|envio masivo/i.test(VIVO.replace(/<!--[\s\S]*?-->/g, '').replace(/\/\*[\s\S]*?\*\//g, '')) &&
    !/forEach\([^)]*\)[\s\S]{0,80}wtPost/.test(SRC) && !/codes\s*:/.test(SRC));
  ok('un solo boton de envio en el modal', (VIVO.match(/onclick="c2dSendStart\(\)"/g) || []).length === 1);
  ok('el boton se desactiva mientras espera (doble clic)', /btn\.disabled = true/.test(winFnSource(SRC, 'c2dSendStart')) && /go\.disabled = true/.test(winFnSource(SRC, 'wtConfSend')));
  ok('los scripts inline compilan', (function () {
    var re = /<script>([\s\S]*?)<\/script>/g, m, n = 0;
    while ((m = re.exec(SRC))) { try { new Function(m[1]); n++; } catch (e) { return e.message; } }
    return n > 0;
  })() === true);
})();

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
