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
    { id: '503', name: 'Pep "Sin tel"', phone: '', email: '' }
  ]
};
try {
  vm.runInNewContext(['esc', 'escQ', 'cleanPhone', 'puedeVerPropietario', 'esVillaManager', 'propietarioCabeceraHtml']
    .map(function (n) { return fnSource(SRC, n); }).join('\n'), ctx);
} catch (e) { ok('las funciones nuevas existen en la pagina', false, e.message); console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(1); }

console.log('1. La puerta');
ok('admin', ctx.puedeVerPropietario('admin', false) === true);
ok('manager', ctx.puedeVerPropietario('manager', false) === true);
ok('villa manager', ctx.puedeVerPropietario('staff', true) === true);
ok('cleaner no', ctx.puedeVerPropietario('cleaner', false) === false);
ok('sales no', ctx.puedeVerPropietario('sales', false) === false);
ok('staff sin keyholder no', ctx.puedeVerPropietario('staff', false) === false);

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
ok('💼 Propietario: nombre', /💼 Propietario: <strong>Joan Pons<\/strong>/.test(h), h);
ok('📞 Llamar tel:', h.indexOf('href="tel:+34600000001"') >= 0 && h.indexOf('📞 Llamar') >= 0);
ok('💬 WhatsApp wa.me con cleanPhone', h.indexOf('href="https://wa.me/34600000001"') >= 0 && h.indexOf('💬 WhatsApp') >= 0, h);
ok('colores: llamar azul, whatsapp verde', /class="own-btn own-tel"/.test(h) && /class="own-btn own-wa"/.test(h) && /\.own-tel\{background:#e8f0fe;color:#1967d2\}/.test(SRC) && /\.own-wa\{background:#e6f7ee;color:#1e9e4e\}/.test(SRC));
ok('✉️ mailto', h.indexOf('✉️') >= 0 && h.indexOf('href="mailto:owner@example.com"') >= 0);
ok('🛠️ Responsable incidencias: nombre', /🛠️ Responsable incidencias: <strong>Marta Mercadal<\/strong>/.test(h), h);
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

console.log('4. Carga y cabecera en la pagina');
ok('contacts guarda phone y email de CONTACT_F', /contacts=cRows\.map\(c=>\(\{[^\n]*phone:String\(c\[CONTACT_F\.phone\]/.test(SRC) && /email:String\(c\[CONTACT_F\.email\]/.test(SRC));
ok('sin llamadas nuevas: una TaUsers y una TaContacts', (SRC.match(/table=TaUsers/g) || []).length === 1 && (SRC.match(/table=TaContacts/g) || []).length === 1);
ok('cabecera: #hOwner justo debajo de #hMeta', /<div class="h-meta" id="hMeta"><\/div>\s*<div class="h-meta h-owner" id="hOwner"><\/div>/.test(SRC));
ok('#hOwner vacio no ocupa sitio', /\.h-owner:empty\{display:none\}/.test(SRC));
var lv = fnSource(SRC, 'loadVilla');
ok('loadVilla pinta el bloque con Auth.role() y esVillaManager(uRows,Auth.email())', /g\('hOwner'\)\.innerHTML=propietarioCabeceraHtml\(d,\s*Auth\.role\(\),\s*esVillaManager\(uRows,\s*Auth\.email\(\)\)\)/.test(lv));
ok('Villamanager sigue en #hMeta', lv.indexOf("' · Villamanager: '+esc(vmName)") >= 0);
ok('la seccion Equipo sigue con Owner e Issues_responsible', /buildContactSelect\('Owner'/.test(SRC) && /buildContactSelect\('Issues_responsible'/.test(SRC));

console.log('5. Version');
ok('v27 en PAGE_VERSION, cabecera y titulo', /const PAGE_VERSION = 27;/.test(SRC) && /VERSIÓN ACTUAL: v27 \|/.test(SRC));
var hist = SRC.slice(SRC.indexOf('<!-- HISTORIAL: v27'));
ok('HISTORIAL v27 con Rafa, fecha y prueba, y v26 detras', /<!-- HISTORIAL: v27 - /.test(SRC) && hist.indexOf('Rafa') >= 0 && hist.indexOf('26/10/2026') >= 0 && hist.indexOf('villa-propietario.test.js') >= 0 && hist.indexOf('| v26 - ') > 0);
ok('el comentario HISTORIAL cierra una sola vez', hist.split('-->').length === 2);

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
