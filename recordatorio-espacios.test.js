/* Pruebas de notas-equipo-reservas.html v87: el texto del recordatorio de check-in online
   (buildC2DMsg) lleva un espacio en blanco entre frases y ninguna línea empieza por espacio,
   en los cuatro idiomas (ES, FR, IT, EN). Marta (Reservas), WhatsApp 20/10/2026 14:13:
   "MODIFICAR TEXTOS: REMINDER CHECK IN ONLINE en intranet. El texto es correcto, sin embargo,
   esta bailando la jota ... Insertar espacio entre las frases. Para todos los idiomas".
   Datos inventados.  node recordatorio-espacios.test.js */
var fs = require('fs');
var path = require('path');
var vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

function blockEnd(src, j, open, close) {
  var depth = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === open) depth++;
    else if (src[k] === close) { depth--; if (depth === 0) return k + 1; }
  }
  throw new Error('bloque sin cerrar');
}
function fnSource(src, name) {
  var i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  return src.slice(i, blockEnd(src, src.indexOf('{', i), '{', '}'));
}
function varSource(src, name) {
  var i = src.indexOf('var ' + name + '=');
  if (i < 0) i = src.indexOf('var ' + name + ' =');
  if (i < 0) throw new Error('no encuentro var ' + name);
  return src.slice(i, src.indexOf(';\n', i) + 1);
}

var SRC = fs.readFileSync(path.join(__dirname, 'notas-equipo-reservas.html'), 'utf8');
var c = { bookingData: null, villaData: null, confCode: 'ABC123', Auth: { name: function () { return 'Kike'; } } };
vm.runInNewContext(fnSource(SRC, 'fB') + '\n' + fnSource(SRC, 'fV') + '\n' + varSource(SRC, 'PLACE_BY_VILLAID') + '\n' +
  varSource(SRC, 'PLACE_TXT') + '\n' + fnSource(SRC, 'villaPlace') + '\n' + fnSource(SRC, 'buildC2DMsg') +
  '\nthis.msg=buildC2DMsg;this.setRow=function(r){bookingData=r;villaData=r;};', c);

var PH = { es: '+34600000000', fr: '+33600000000', it: '+39300000000', en: '+44700000000' };
var FIRST = { es: 'Buenos días, Ana,', fr: 'Bonjour, Ana,', it: 'Buongiorno Ana,', en: 'Good morning, Ana,' };
var SIGN = { es: 'Atentamente,', fr: 'Cordialement,', it: 'Cordiali saluti,', en: 'Kind regards,' };
var LINK = 'https://www.3villas.com/intranet/checkin-pasos.html?reserva=ABC123';

console.log('Recordatorio de check-in online: espacio entre frases, sin espacios al inicio (v87)');
Object.keys(PH).forEach(function (l) {
  c.setRow({ TaBookings2021_Guest_phonenumber: PH[l], TaBookings2021_Fiscal_guest_name: 'Ana', TaVillas_villaid: 12 });
  var m = c.msg(false), lines = m.split('\n'), L = l.toUpperCase();
  ok(L + ': ninguna línea empieza ni acaba por espacio', lines.every(function (x) { return x === x.trim(); }), JSON.stringify(lines.filter(function (x) { return x !== x.trim(); })));
  ok(L + ': empieza por el saludo y una línea en blanco', lines[0] === FIRST[l] && lines[1] === '', JSON.stringify(lines.slice(0, 2)));
  var body = lines.slice(0, lines.indexOf(SIGN[l]));
  ok(L + ': cada frase del cuerpo va seguida de una línea en blanco', body.length > 0 && body.every(function (x, i) { return i % 2 === 0 ? x !== '' : x === ''; }), JSON.stringify(body));
  ok(L + ': el enlace va solo, con una línea en blanco antes y después', m.indexOf('\n\n' + LINK + '\n\n') > 0);
  var tail = lines.slice(lines.indexOf(SIGN[l]));
  ok(L + ': la firma son tres líneas seguidas: despedida, nombre, 3VILLAS y el lugar', tail.length === 3 && tail[1] === 'Kike' && /^3VILLAS Minorca$|^3VILLAS Minorque$|^3VILLAS Menorca$/.test(tail[2]), JSON.stringify(tail));
  ok(L + ': sin dos líneas en blanco seguidas', m.indexOf('\n\n\n') < 0);
  ok(L + ': 4 pasos y el código poco antes de las 16:00 siguen en el texto', /4 (pasos|étapes|i passaggi|steps)/.test(m) && /16:00|16h00|4:00 PM/.test(m));
});
c.setRow({ TaBookings2021_Guest_phonenumber: PH.en, TaBookings2021_Fiscal_guest_name: 'Ana', TaVillas_villaid: 169 });
ok('EN Casa Premià: firma "3VILLAS Barcelona" sin espacio delante', c.msg(false).split('\n').pop() === '3VILLAS Barcelona');
c.setRow({ TaBookings2021_Guest_phonenumber: '', TaBookings2021_Segundo_Telefono: '0034611111111', TaBookings2021_Fiscal_guest_name: 'Ana' });
ok('ES por el segundo teléfono (0034…): saludo en español', c.msg(true).indexOf('Buenos días, Ana,') === 0);

console.log('Versión');
ok('v88 en cabecera, título y PAGE_VERSION (v88 = codigo de 72 h, la v87 sigue en el historial)', /VERSIÓN ACTUAL: v88 \|/.test(SRC) && /<title>Notas Equipo Reservas v88 — 3Villas<\/title>/.test(SRC) &&
  SRC.indexOf('var PAGE_VERSION = 88;') > 0 && SRC.indexOf('var PAGE_VERSION = 87;') < 0);
ok('HISTORIAL lleva la v87 - 20/10/2026 (recordatorio con espacio entre frases, pedido de Marta) y conserva la v86 (enlace Historial WhatsApp)', / \| v87 - 20\/10\/2026: recordatorio de check-in online/.test(SRC) &&
  SRC.indexOf('bailando la jota') > 0 && / \| v86 - 12\/10\/2026: enlace "Historial WhatsApp"/.test(SRC));
ok('los scripts inline compilan', (function () {
  var re = /<script>([\s\S]*?)<\/script>/g, mm, n = 0;
  while ((mm = re.exec(SRC))) { try { new Function(mm[1]); n++; } catch (e) { return e.message; } }
  return n > 0;
})() === true);

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
