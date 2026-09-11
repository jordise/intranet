/* Pruebas de la sesion del huesped en checkin-auth.js v22: la sesion dura hasta
   el final de la reserva (Checkout + 3 dias + 1, a medianoche local) en vez de
   30 dias fijos. Pregunta de Jordi (03/09/2026 22:14: "la sesion puede durar
   hasta la fecha de checkout?") y caso de Cristian (10/09/2026 19:05).
   v23: entrada por enlace de acceso (?acceso=TOKEN) creado por el equipo en
   notas-equipo-reservas v77, tras el segundo aviso de Cristian (11/09/2026).
   node checkin-sesion.test.js

   Como cobros-devolucion-fianza.test.js: NO copia el codigo del fichero. Extrae
   el texto real de cada funcion y lo ejecuta. */
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

var F = 'checkin-auth.js';
var SRC = fs.readFileSync(F, 'utf8');
/* Las dos funciones viven dentro del IIFE CheckinAuth y usan dos constantes suyas */
var CONST = 'var EXPIRE_DAYS = 3, SESSION_TTL = 30 * 24 * 60 * 60 * 1000;';
var ENV = CONST + '\n' + fnSource(F, '_parseCheckout') + '\n' + fnSource(F, '_sessionExpiry') + '\n';
var _parseCheckout = new Function(ENV + 'return _parseCheckout;')();
var _sessionExpiry = new Function(ENV + 'return _sessionExpiry;')();

var DIA = 24 * 60 * 60 * 1000;
var TTL = 30 * DIA;
function medianoche(y, m, d) { return new Date(y, m - 1, d).getTime(); }
function bk(o) { return o; }

/* ── _parseCheckout(raw) ── */
console.log('checkin-auth.js: _parseCheckout');
(function () {
  var iso = _parseCheckout('2026-10-07');
  ok('ISO YYYY-MM-DD', iso && iso.getFullYear() === 2026 && iso.getMonth() === 9 && iso.getDate() === 7);
  ok('ISO con hora: se queda con el dia', _parseCheckout('2026-10-07T10:00:00').getDate() === 7);
  var us = _parseCheckout('10/07/2026');
  ok('Caspio MM/DD/YYYY = 7 de octubre', us && us.getMonth() === 9 && us.getDate() === 7);
  ok('vacio: null', _parseCheckout('') === null && _parseCheckout(null) === null);
  ok('texto raro: null', _parseCheckout('manana') === null);
})();

/* ── _sessionExpiry(booking, nowMs) ── */
console.log('checkin-auth.js: _sessionExpiry');
(function () {
  var ahora = medianoche(2026, 9, 11) + 12 * 60 * 60 * 1000;   /* 11/09/2026 12:00 */

  ok('checkout ISO 07/10/2026: caduca a medianoche del 11/10/2026 (checkout + 3 + 1)',
    _sessionExpiry(bk({ TaBookings2021_Checkout: '2026-10-07' }), ahora) === medianoche(2026, 10, 11),
    new Date(_sessionExpiry(bk({ TaBookings2021_Checkout: '2026-10-07' }), ahora)).toString());
  ok('la fecha de Caspio 10/07/2026 da lo mismo',
    _sessionExpiry(bk({ TaBookings2021_Checkout: '10/07/2026' }), ahora) === medianoche(2026, 10, 11));
  ok('con hora en la fecha, igual',
    _sessionExpiry(bk({ TaBookings2021_Checkout: '2026-10-07T11:00:00' }), ahora) === medianoche(2026, 10, 11));
  ok('la errata TaBookings2021_Checkount tambien cuenta',
    _sessionExpiry(bk({ TaBookings2021_Checkount: '2026-10-07' }), ahora) === medianoche(2026, 10, 11));
  ok('el campo bueno manda sobre la errata',
    _sessionExpiry(bk({ TaBookings2021_Checkout: '2026-10-07', TaBookings2021_Checkount: '2026-12-01' }), ahora) === medianoche(2026, 10, 11));

  ok('sin fecha de checkout: respaldo de 30 dias',
    _sessionExpiry(bk({}), ahora) === ahora + TTL);
  ok('sin booking: respaldo de 30 dias',
    _sessionExpiry(null, ahora) === ahora + TTL);
  ok('fecha ilegible: respaldo de 30 dias',
    _sessionExpiry(bk({ TaBookings2021_Checkout: 'sin fecha' }), ahora) === ahora + TTL);
  ok('checkout pasado (01/08/2026): respaldo de 30 dias, nunca una fecha ya caducada',
    _sessionExpiry(bk({ TaBookings2021_Checkout: '2026-08-01' }), ahora) === ahora + TTL);

  /* el limite: el ultimo dia de acceso es checkout + 3 (lo que bloquea _isExpired) */
  var salida = medianoche(2026, 9, 11);
  var exp = _sessionExpiry(bk({ TaBookings2021_Checkout: '2026-09-11' }), salida + 1000);
  ok('checkout hoy: la sesion llega hasta la medianoche del 15/09 (3 dias de gracia enteros)',
    exp === medianoche(2026, 9, 15));
  ok('y esa caducidad esta por delante de ahora', exp > salida);
  ok('checkout de ayer: sigue valiendo hasta el dia 4 tras el checkout',
    _sessionExpiry(bk({ TaBookings2021_Checkout: '2026-09-10' }), ahora) === medianoche(2026, 9, 14));
  ok('checkout de hace 4 dias: ya no da fecha, cae al respaldo',
    _sessionExpiry(bk({ TaBookings2021_Checkout: '2026-09-07' }), ahora) === ahora + TTL);
  ok('una estancia larga da una sesion mas larga que el respaldo',
    _sessionExpiry(bk({ TaBookings2021_Checkout: '2027-01-15' }), ahora) > ahora + TTL);
})();

/* ── el resto del cableado de la v22 (texto real del fichero) ── */
console.log('checkin-auth.js: v22');
(function () {
  ok('cabecera v23', /checkin-auth\.js v23 — Autenticaci/.test(SRC) && /CAMBIOS v23 \(sobre v22\):/.test(SRC));
  ok('y conserva los cambios de la v22', /CAMBIOS v22 \(sobre v21\):/.test(SRC));
  ok('el historial empieza en v23 y conserva la v22 y la v21',
    /\/\* HISTORIAL: v23 - /.test(SRC) && / \| v22 - /.test(SRC) && / \| v21 - /.test(SRC));

  ok('setSession recibe el booking', /function setSession\(code, pin, email, token, booking\)\{/.test(SRC));
  ok('y calcula la caducidad con _sessionExpiry', /expires: _sessionExpiry\(booking \|\| null, Date\.now\(\)\)/.test(SRC));
  ok('ya no hay ninguna sesion con caducidad fija de SESSION_TTL en setSession',
    SRC.indexOf('expires: Date.now() + SESSION_TTL') < 0);
  ok('verify() pasa el booking a la sesion',
    /setSession\(_code, pin, loginEmail, j\.checkinToken \|\| '', j\.booking\);/.test(SRC));
  ok('el refresco del token en loadBookingData tambien lo pasa',
    /setSession\(_s\.code, _s\.pin, _s\.email, j\.checkinToken, j\.booking\);/.test(SRC));

  ok('boton "Ya tengo un codigo" en el paso del email',
    /id="caHaveCode" onclick="CheckinAuth\._haveCode\(\)" data-ca-i18n="have_code"/.test(SRC));
  ok('esta debajo del boton de enviar y encima del pie de contacto',
    SRC.indexOf('id="caHaveCode"') > SRC.indexOf('id="caBtnEmail"') &&
    SRC.indexOf('id="caHaveCode"') < SRC.indexOf('<div class="ca-contact">'));
  ok('_haveCode va al paso del codigo en modo normal, no en modo alternativo',
    /function _haveCode\(\)\{[\s\S]*?_pinDirectUI\(false\);[\s\S]*?have_code_hint[\s\S]*?step\('Pin'\);/.test(SRC));
  ok('y el boton se oculta en el modo sin email', /_haveCodeBtn\(false\);/.test(SRC));

  ok('logout borra la sesion, la cache y recarga',
    /function logout\(\)\{[\s\S]*?removeItem\(SESSION_KEY\)[\s\S]*?removeItem\('3v_booking_cache'\)[\s\S]*?location\.reload\(\)/.test(SRC));
  ok('_mountLogout cuelga una pastilla fija abajo a la izquierda en el body una sola vez (revision del checker 11/09/2026)',
    /function _mountLogout\(\)\{[\s\S]*?getElementById\('caLogoutBtn'\)\) return;[\s\S]*?position:fixed;left:12px;bottom:12px/.test(SRC) &&
    /id="caLogoutBtn"[^>]*data-ca-i18n="logout"/.test(SRC));
  ok('_haveCode deja _email VACIO (sin exencion @3villas.com con un email no validado)',
    /function _haveCode\(\)\{[\s\S]*?_email = '';[\s\S]*?step\('Pin'\);/.test(SRC) &&
    !/function _haveCode\(\)\{[\s\S]*?_email = \(\(em/.test(SRC));
  ok('en modo "ya tengo un codigo" el paso PIN oculta el pie de email y usa el titulo neutro',
    /function _haveCodeUI\(on\)\{[\s\S]*?'title_email' : 'title_pin'[\s\S]*?\.ca-contact'\)[\s\S]*?on \? 'none' : ''/.test(SRC));
  ok('back() restaura el paso PIN al salir del modo "ya tengo un codigo"',
    /_haveCodeBtn\(true\);[\s\S]{0,80}if\(_haveCodeMode\)\{ _haveCodeMode = false; _haveCodeUI\(false\); \}/.test(SRC));
  ok('se monta tras un login correcto, tras restaurar una sesion y tras un enlace de acceso (4 sitios)',
    SRC.split('_mountLogout();').length - 1 === 4);
  ok('la API publica expone _haveCode y logout',
    /_haveCode: \(\) => _haveCode\(\),/.test(SRC) && /logout:    \(\) => logout\(\),/.test(SRC));

  var idiomas = ['en', 'es', 'fr', 'de', 'it', 'nl', 'pt', 'ca'];
  ok('have_code, have_code_hint y logout en los 8 idiomas',
    SRC.split('have_code:').length - 1 === idiomas.length &&
    SRC.split('have_code_hint:').length - 1 === idiomas.length &&
    SRC.split('logout:').length - 1 === idiomas.length + 1 /* + la linea de la API publica */);
  ok('los textos de es/fr/it/de son los acordados',
    SRC.indexOf("have_code:'Ya tengo un c\\u00f3digo'") > 0 &&
    SRC.indexOf("have_code:'J\\u2019ai d\\u00e9j\\u00e0 un code'") > 0 &&
    SRC.indexOf("have_code:'Ho gi\\u00e0 un codice'") > 0 &&
    SRC.indexOf("have_code:'Ich habe bereits einen Code'") > 0);
})();

/* ══════════ v23: ENLACE DE ACCESO (?acceso=TOKEN) ══════════ */
console.log('checkin-auth.js: enlace de acceso (v23)');
(function () {
  /* _accessParam lee el parametro de la URL: se ejecuta de verdad con un
     location de mentira, igual que las funciones puras de arriba. */
  function conUrl(qs) {
    return new Function('location', 'URLSearchParams',
      fnSource(F, '_accessParam') + '\nreturn _accessParam();')(
      { search: qs }, URLSearchParams);
  }
  ok('lee ?acceso=', conUrl('?reserva=54614278&acceso=abc.def') === 'abc.def');
  ok('sin el parametro devuelve cadena vacia', conUrl('?reserva=54614278') === '');
  ok('sin query devuelve cadena vacia', conUrl('') === '');

  var BOOT = fnSource(F, '_bootFromAccessLink');
  ok('valida el token con la accion de siempre, no con una nueva',
    /wPost\('verify-checkin-code', \{ bookingCode:code, token \}\)/.test(BOOT) &&
    BOOT.indexOf('pin') < 0);
  ok('abre la sesion con los 5 argumentos (el booking fija la caducidad, v22)',
    /setSession\(code, '', '', j\.checkinToken \|\| '', j\.booking\)/.test(BOOT));
  ok('guarda el booking en la cache, como verify()', BOOT.indexOf("sessionStorage.setItem('3v_booking_cache'") > 0);
  ok('quita el token de la barra de direcciones valga o no el enlace',
    BOOT.split('_stripAccessParam()').length - 1 === 2);
  ok('comprueba el bloqueo por reserva finalizada antes de entrar',
    /_isExpired\(j\.booking, ''\)\)\{ showExpired\(\); return true; \}/.test(BOOT));
  ok('monta el boton Salir y llama al callback', /_mountLogout\(\);\s*if\(_cb\) _cb\(j\.booking\);/.test(BOOT));
  ok('devuelve true si entra y false si el enlace no vale',
    /return true;\s*\}catch\(e\)\{[\s\S]*?return false;/.test(BOOT));

  var STRIP = fnSource(F, '_stripAccessParam');
  ok('_stripAccessParam usa history.replaceState y no recarga',
    /searchParams\.delete\('acceso'\)/.test(STRIP) && /history\.replaceState\(null, '',/.test(STRIP) &&
    STRIP.indexOf('location.reload') < 0);

  var INIT = SRC.slice(SRC.indexOf('    init(opts){'), SRC.indexOf('    _send:   () => send(),'));
  ok('init() mira el enlace de acceso en las dos rutas de huesped (principal e hijas)',
    INIT.split('_accessParam()').length - 1 === 2 &&
    INIT.split('_bootFromAccessLink(_code, _acc)').length - 1 === 2);
  ok('y solo en modo huesped: la rama de admin va antes y sale con return',
    INIT.indexOf('_accessParam()') > INIT.indexOf('/* ── MODO HUÉSPED ── */'));
  ok('si el enlace no vale, sigue el flujo de siempre',
    INIT.split('if(!ok){ if(!sess) _linkExpiredNotice(); goNormal(); }').length - 1 === 2);
  ok('una sesion guardada valida NO se pierde por un enlace caducado (no se borra ni se avisa)',
    /if\(!ok\)\{ if\(!sess\) _linkExpiredNotice\(\); goNormal\(\); \}/.test(INIT) &&
    INIT.indexOf('if(!ok){ localStorage.removeItem') < 0);
  ok('el arranque espera al DOM, como el resto de rutas',
    INIT.split("document.addEventListener('DOMContentLoaded', go)").length - 1 === 4);

  ok('el aviso link_expired se pinta bajo el subtitulo del paso del email',
    SRC.indexOf("[['caEmailSub','caLinkExp'],['caPinSub','caLinkExp2']]") > 0 && /function _linkExpiredNotice\(\)\{[\s\S]*?insertAdjacentHTML\('afterend'/.test(SRC));
  ok('y se repinta cuando el overlay se monta despues (inject)',
    /if\(_linkFailed\) _linkExpiredNotice\(\);/.test(SRC));

  var idiomas = ['en', 'es', 'fr', 'de', 'it', 'nl', 'pt', 'ca'];
  ok('link_expired en los 8 idiomas', SRC.split('link_expired:').length - 1 === idiomas.length);
  ok('los textos de en/es son los acordados',
    SRC.indexOf("link_expired:'This access link is no longer valid. Request a code with your e-mail.'") > 0 &&
    SRC.indexOf("link_expired:'Este enlace de acceso ya no es v\\u00e1lido. Pide un c\\u00f3digo con tu email.'") > 0);
})();

/* ── checkin-pasos.html v98 y checkin-premium.html v27: cargan la version nueva del js ── */
console.log('checkin-pasos.html: v98');
(function () {
  var P = fs.readFileSync('checkin-pasos.html', 'utf8');
  ok('carga checkin-auth.js?v=23', P.indexOf('<script src="checkin-auth.js?v=23"></script>') > 0);
  ok('sin la carga antigua sin version', P.indexOf('<script src="checkin-auth.js"></script>') < 0);
  ok('sin la carga de la v22 (fuera del historial)',
    P.split('<!-- HISTORIAL:')[0].indexOf('checkin-auth.js?v=22') < 0);
  ok('cabecera v98', /VERSIÓN ACTUAL: v98 \|/.test(P));
  ok('titulo v98', /<title>Check-in Pasos v98 — 3Villas<\/title>/.test(P));
  ok('PAGE_VERSION 98 (la auto-deteccion mira este numero)',
    P.indexOf('var PAGE_VERSION = 98;') > 0 && P.indexOf('var PAGE_VERSION = 97;') < 0);
  ok('el historial empieza en v98 y conserva la v97 y la v96',
    /<!-- HISTORIAL: v98 - /.test(P) && / \| v97 - /.test(P) && / \| v96 - /.test(P));
})();

console.log('checkin-premium.html: v27');
(function () {
  var P = fs.readFileSync('checkin-premium.html', 'utf8');
  ok('carga checkin-auth.js?v=23', P.indexOf('<script src="checkin-auth.js?v=23"></script>') > 0);
  ok('sin la carga de la v22 (fuera del historial)',
    P.split('<!-- HISTORIAL:')[0].indexOf('checkin-auth.js?v=22') < 0);
  ok('cabecera v27', /VERSIÓN ACTUAL: v27 \|/.test(P));
  ok('titulo v27', /<title>Checkin Premium v27 — 3Villas<\/title>/.test(P));
  ok('el historial empieza en v27 y conserva la v26',
    /<!-- HISTORIAL: v27 - /.test(P) && / \| v26 - /.test(P));
})();


/* ── revision del checker 11/09/2026 ── */
console.log('checkin-auth.js: revision v23');
(function () {
  ok('_bootFromAccessLink comprueba la reserva finalizada ANTES de guardar la sesion', /async function _bootFromAccessLink\([\s\S]*?_isExpired\(j\.booking, ''\)[\s\S]*?setSession\(code, '', '', j\.checkinToken/.test(SRC));
  ok('el catch marca _linkFailed', /async function _bootFromAccessLink\([\s\S]*?catch\(e\)\{[\s\S]*?_linkFailed = true;/.test(SRC));
  ok('el aviso sale bajo el paso Email y bajo el paso PIN', SRC.indexOf("[['caEmailSub','caLinkExp'],['caPinSub','caLinkExp2']]") > 0);
  ok('el modo admin quita ?acceso= de la URL', /if\(isAdmin\(\)\)\{\s*_stripAccessParam\(\);/.test(SRC));
})();

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);