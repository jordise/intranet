/* Pruebas del bloque Propietario en la cabecera de la ficha de villa (v27, Rafa 26/10/2026: el villa
   manager que tiene que contactar con el propietario debe encontrar sus datos; Gary 26/10/2026: variante 4,
   "villa manager and management only", "not cleaners"). node villa-propietario.test.js

   Como villa-iconos.test.js: NO copia el codigo de la pagina. Extrae con vm las funciones reales de
   villa.html (esc, escQ, cleanPhone, puedeVerPropietario, esVillaManager, propietarioCabeceraHtml)
   y comprueba la carga y la cabecera en el HTML. Sin red. */
var fs = require('fs'), vm = require('vm');
var P = 'villa.html';
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var SRC = fs.readFileSync(P, 'utf8');
function fnSource(s, name) {
  var i = s.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = s.indexOf('{', i), depth = 0, k = j;
  for (; k < s.length; k++) { if (s[k] === '{') depth++; else if (s[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return s.slice(i, k);
}

var ctx = {
  contacts: [
    { id: '501', name: 'Joan Pons', phone: '+34 600 000 001', email: 'owner@example.com' },
    { id: '502', name: 'Marta Mercadal', phone: '+34 611 222 333', email: '' },
    { id: '503', name: 'Pep "Sin tel"', phone: '', email: '' },
    /* fix1: telefono sin digitos, marcador "Propietario" y "3Villas" */
    { id: '504', name: 'Tel Raro', phone: 'abc', email: '' },
    { id: '505', name: ' Propietario ', phone: '+34 622 000 000', email: '' },
    { id: '506', name: '3Villas', phone: '971 36 12 34', email: '' }
  ]
};
try {
  vm.runInNewContext(['esc', 'escQ', 'cleanPhone', 'puedeVerPropietario', 'esVillaManager', 'propietarioCabeceraHtml']
    .map(function (n) { return fnSource(SRC, n); }).join('\n'), ctx);
} catch (e) { ok('las funciones nuevas existen en la pagina', false, e.message); console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(1); }
try { vm.runInNewContext(fnSource(SRC, 'waDigitsPropietario'), ctx); }
catch (e) { ok('waDigitsPropietario existe en la pagina', false, e.message); ctx.waDigitsPropietario = function () { return undefined; }; }

console.log('1. La puerta');
ok('admin', ctx.puedeVerPropietario('admin', false) === true);
ok('manager', ctx.puedeVerPropietario('manager', false) === true);
ok('villa manager', ctx.puedeVerPropietario('staff', true) === true);
ok('cleaner no', ctx.puedeVerPropietario('cleaner', false) === false);
ok('sales no', ctx.puedeVerPropietario('sales', false) === false);
ok('staff sin keyholder no', ctx.puedeVerPropietario('staff', false) === false);
/* fix1 (Gary): villa managers de rol staff y direccion; nunca limpieza ni ventas aunque tengan Keyholder_por_defecto */
ok('cleaner con keyholder no', ctx.puedeVerPropietario('cleaner', true) === false);
ok('sales con keyholder no', ctx.puedeVerPropietario('sales', true) === false);
ok('staff con keyholder si', ctx.puedeVerPropietario('staff', true) === true);
ok('"ADMIN " (mayusculas y espacio) si', ctx.puedeVerPropietario('ADMIN ', false) === true);
ok('isVM tiene que ser true de verdad', ctx.puedeVerPropietario('staff', 'true') === false);

console.log('2. esVillaManager: la fila propia de TaUsers por email de sesion');
var uRows = [
  { UserID: 'U1', Email: 'Vm@3villas.com', Keyholder_por_defecto: 'U1' },
  { UserID: 'U2', Email: 'limpia@3villas.com', Keyholder_por_defecto: '' },
  { UserID: 'U3', Email: 'staff@3villas.com', Keyholder_por_defecto: '   ' }
];
ok('email con mayusculas distintas y Keyholder_por_defecto: si', ctx.esVillaManager(uRows, 'vm@3villas.com') === true);
ok('sin Keyholder_por_defecto: no', ctx.esVillaManager(uRows, 'limpia@3villas.com') === false);
ok('Keyholder_por_defecto en blanco: no', ctx.esVillaManager(uRows, 'staff@3villas.com') === false);
ok('email que no esta: no', ctx.esVillaManager(uRows, 'otro@3villas.com') === false);
ok('sin email de sesion: no', ctx.esVillaManager(uRows, '') === false);

console.log('3. Bloque de cabecera');
var d = { Owner: '501', Issues_responsible: '502' };
var h = ctx.propietarioCabeceraHtml(d, 'admin', false);
ok('💼 Propietario: nombre enlazado a contactos.html?contactid=501', /💼 Propietario: <strong><a href="contactos\.html\?contactid=501"[^>]*>Joan Pons<\/a><\/strong>/.test(h), h);
ok('📞 Llamar tel:', h.indexOf('href="tel:+34600000001"') >= 0 && h.indexOf('📞 Llamar') >= 0);
ok('💬 WhatsApp wa.me con waDigitsPropietario', h.indexOf('href="https://wa.me/34600000001"') >= 0 && h.indexOf('💬 WhatsApp') >= 0, h);
ok('botones: clases own-btn own-tel / own-btn own-wa', /class="own-btn own-tel"/.test(h) && /class="own-btn own-wa"/.test(h));
ok('✉️ mailto', h.indexOf('✉️') >= 0 && h.indexOf('href="mailto:owner@example.com"') >= 0);
ok('✉️ dentro del enlace mailto (>✉️ email)', /<a [^>]*href="mailto:owner@example\.com"[^>]*>✉️ owner@example\.com<\/a>/.test(h), h);
ok('🛠️ Responsable incidencias: nombre', /🛠️ Responsable incidencias: <strong>Marta Mercadal<\/strong>/.test(h), h);
ok('incidencias: "· telefono" en un span nowrap con tel:', /Marta Mercadal<\/strong> <span style="white-space:nowrap">· <a href="tel:\+34611222333"[^>]*>\+34 611 222 333<\/a><\/span>/.test(h), h);
ok('cleaner con keyholder: vacio', ctx.propietarioCabeceraHtml(d, 'cleaner', true) === '');
ok('villa manager ve lo mismo', ctx.propietarioCabeceraHtml(d, 'staff', true) === h);
ok('cleaner: vacio', ctx.propietarioCabeceraHtml(d, 'cleaner', false) === '');
ok('sales: vacio', ctx.propietarioCabeceraHtml(d, 'sales', false) === '');
ok('staff sin keyholder: vacio', ctx.propietarioCabeceraHtml(d, 'staff', false) === '');
ok('sin Owner: vacio', ctx.propietarioCabeceraHtml({ Owner: '', Issues_responsible: '502' }, 'admin', false) === '');
ok('Owner no encontrado: vacio', ctx.propietarioCabeceraHtml({ Owner: '999' }, 'admin', false) === '');
var h2 = ctx.propietarioCabeceraHtml({ Owner: '501', Issues_responsible: '501' }, 'admin', false);
ok('incidencias = propietario: sin linea', h2.indexOf('Responsable incidencias') < 0 && h2.indexOf('Propietario') >= 0);
var h3 = ctx.propietarioCabeceraHtml({ Owner: '503' }, 'admin', false);
ok('sin incidencias ni telefono: solo el nombre, sin botones', h3.indexOf('Responsable') < 0 && h3.indexOf('tel:') < 0 && h3.indexOf('wa.me') < 0 && h3.indexOf('mailto:') < 0, h3);
ok('nombre escapado', h3.indexOf('Pep &quot;Sin tel&quot;') >= 0 || h3.indexOf('Pep "Sin tel"') >= 0);
var h7 = ctx.propietarioCabeceraHtml({ Owner: '501', Issues_responsible: '505' }, 'admin', false);
ok('incidencias = contacto "Propietario" (marcador): sin linea', h7.indexOf('Responsable incidencias') < 0 && h7.indexOf('Joan Pons') >= 0, h7);
var h8 = ctx.propietarioCabeceraHtml({ Owner: '501', Issues_responsible: '506' }, 'admin', false);
ok('incidencias = "3Villas": se muestra tal cual', /🛠️ Responsable incidencias: <strong>3Villas<\/strong>/.test(h8) && h8.indexOf('href="tel:971361234"') >= 0, h8);

console.log('3b. WhatsApp y tel: (waDigitsPropietario; cleanPhone no cambia)');
var W = ctx.waDigitsPropietario;
[['+34 600 000 001', '34600000001'], ['600000001', '34600000001'], ['0034 600-000-001', '34600000001'],
 ['+44 7700 900123', '447700900123'], ['971 36 12 34', '34971361234'], ['abc', ''], ['600 000 001 / 611 222 333', '34600000001']
].forEach(function (c) { ok('waDigitsPropietario("' + c[0] + '") = "' + c[1] + '"', W(c[0]) === c[1], W(c[0])); });
ok('cleanPhone sigue igual', fnSource(SRC, 'cleanPhone') === "function cleanPhone(ph){return(ph||'').replace(/\\s/g,'').replace(/^\\+/,'');}");
var h6 = ctx.propietarioCabeceraHtml({ Owner: '504' }, 'admin', false);
ok('telefono "abc": Llamar si, WhatsApp no', h6.indexOf('📞 Llamar') >= 0 && h6.indexOf('wa.me') < 0 && h6.indexOf('WhatsApp') < 0, h6);
var pc = fnSource(SRC, 'propietarioCabeceraHtml');
ok('la cabecera no usa cleanPhone', pc.indexOf('cleanPhone(') < 0);
ok("tel: con String(ph).replace(/[^\\d+]/g,'')", pc.indexOf(".replace(/[^\\d+]/g,'')") >= 0);

console.log('4. Carga y cabecera en la pagina');
ok('contacts guarda phone y email de CONTACT_F', /contacts=cRows\.map\(c=>\(\{[^\n]*phone:String\(c\[CONTACT_F\.phone\]/.test(SRC) && /email:String\(c\[CONTACT_F\.email\]/.test(SRC));
ok('sin llamadas nuevas: una TaUsers y una TaContacts', (SRC.match(/table=TaUsers/g) || []).length === 1 && (SRC.match(/table=TaContacts/g) || []).length === 1);
var navHtml = SRC.slice(SRC.indexOf('<nav class="top-nav">'), SRC.indexOf('</nav>', SRC.indexOf('<nav class="top-nav">')));
var navCenter = navHtml.slice(navHtml.indexOf('<div class="nav-center">'), navHtml.indexOf('<div style="display:flex;gap:6px'));
ok('cabecera: #hOwner fuera de .nav-center', navCenter.indexOf('hOwner') < 0 && /<div class="h-meta" id="hMeta"><\/div>\s*<\/div>/.test(navCenter), navCenter);
ok('cabecera: #hOwner es el ultimo hijo de nav.top-nav', /<div class="h-owner" id="hOwner"><\/div>\s*$/.test(navHtml), navHtml.slice(-200));
ok('CSS .top-nav envuelve (flex-wrap:wrap)', /\.top-nav\{flex-wrap:wrap\}/.test(SRC));
ok('CSS .nav-center sigue con flex:1', /\.nav-center\{flex:1;/.test(SRC));
ok('CSS .h-owner a lo ancho, 12px', SRC.indexOf('.h-owner{flex-basis:100%;font-size:12px;color:var(--gray-5);display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;margin-top:4px}') >= 0);
ok('CSS .own-btn de 32px', SRC.indexOf('.own-btn{display:inline-flex;align-items:center;gap:5px;padding:6px 12px;min-height:32px;border-radius:20px;font-family:Montserrat,sans-serif;font-size:11px;font-weight:800;text-decoration:none;white-space:nowrap}') >= 0);
ok('CSS colores: llamar verde solido, whatsapp verde claro', SRC.indexOf('.own-tel{background:var(--green);color:#fff;border:1.5px solid var(--green)}') >= 0 && SRC.indexOf('.own-wa{background:var(--green-light);color:var(--green);border:1.5px solid rgba(30,158,78,.35)}') >= 0);
ok('#hOwner vacio no ocupa sitio', /\.h-owner:empty\{display:none\}/.test(SRC));
var lv = fnSource(SRC, 'loadVilla');
ok('loadVilla pinta el bloque con Auth.role() y esVillaManager(uRows,Auth.email())', /g\('hOwner'\)\.innerHTML=propietarioCabeceraHtml\(d,\s*Auth\.role\(\),\s*esVillaManager\(uRows,\s*Auth\.email\(\)\)\)/.test(lv));
ok('Villamanager sigue en #hMeta', lv.indexOf("' · Villamanager: '+esc(vmName)") >= 0);
ok('fixStickyTops corre despues de pintar #hOwner', lv.indexOf("g('hOwner').innerHTML") > 0 && lv.indexOf('fixStickyTops()') > lv.indexOf("g('hOwner').innerHTML"));
ok('la seccion Equipo sigue con Owner e Issues_responsible', /buildContactSelect\('Owner'/.test(SRC) && /buildContactSelect\('Issues_responsible'/.test(SRC));

console.log('5. Version');
/* v28 (Jordi 27/10/2026, boton del informe de temporada): la version sube; la entrada v27 sigue en el HISTORIAL */
ok('v28 en PAGE_VERSION, cabecera y titulo', /const PAGE_VERSION = 28;/.test(SRC) && /VERSIÓN ACTUAL: v28 \|/.test(SRC));
var hist = SRC.slice(SRC.indexOf('<!-- HISTORIAL: v28'));
ok('HISTORIAL v27 con Rafa, fecha y prueba, y v26 detras', /\| v27 - Propietario en la cabecera/.test(SRC) && hist.indexOf('Rafa') >= 0 && hist.indexOf('26/10/2026') >= 0 && hist.indexOf('villa-propietario.test.js') >= 0 && hist.indexOf('| v26 - ') > 0);
ok('el comentario HISTORIAL cierra una sola vez', hist.split('-->').length === 2);

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
