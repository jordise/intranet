/* Pruebas de la fila Propietario en "Ver detalles" de la ficha (v157, Rafa 26/10/2026: el villa manager
   que tiene que llamar al propietario debe tener sus datos en la ficha; Gary 26/10/2026: variante 1,
   "villa manager and management only", "not cleaners"). node entradas-propietario.test.js

   Como entradas-horas-salida.test.js: NO copia el codigo de la pagina. Extrae de entradas-equipo.html
   puedeVerPropietario, escP, cleanPhone y propietarioHtml y los ejecuta con mapas de prueba. Sin red. */
var fs = require('fs'), vm = require('vm');
var P = 'entradas-equipo.html';
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

var SRC = fs.readFileSync(P, 'utf8');

function bloque(marca, abre, cierra) {
  var i = SRC.indexOf(marca);
  if (i < 0) throw new Error('no encuentro ' + marca + ' en ' + P);
  var j = SRC.indexOf(abre, i), depth = 0, k = j;
  for (; k < SRC.length; k++) {
    if (SRC[k] === abre) depth++;
    else if (SRC[k] === cierra) { depth--; if (depth === 0) { k++; break; } }
  }
  return SRC.slice(i, k);
}
function linea(marca) {
  var i = SRC.indexOf(marca);
  if (i < 0) throw new Error('no encuentro ' + marca + ' en ' + P);
  return SRC.slice(i, SRC.indexOf('\n', i));
}

/* datos de prueba: villa 101 con propietario e incidencias distintos, 102 propietario = incidencias,
   103 sin propietario, 104 propietario que no existe en TaContacts, 105 propietario sin telefono */
var ctx = { contactsInfo: new Map(), villaOwnersMap: new Map() };
ctx.contactsInfo.set('501', { name: 'Joan Pons', phone: '+34 600 000 001', email: 'owner@example.com' });
ctx.contactsInfo.set('502', { name: 'Marta Mercadal', phone: '+34 611 222 333', email: '' });
ctx.contactsInfo.set('503', { name: 'Pep <b>Sin tel</b>', phone: '', email: '' });
ctx.villaOwnersMap.set('101', { owner: '501', issues: '502' });
ctx.villaOwnersMap.set('102', { owner: '501', issues: '501' });
ctx.villaOwnersMap.set('103', { owner: '', issues: '502' });
ctx.villaOwnersMap.set('104', { owner: '999', issues: '' });
ctx.villaOwnersMap.set('105', { owner: '503', issues: '' });
var codigo;
try {
  codigo = [linea('function cleanPhone('), bloque('function escP(', '{', '}'), bloque('function puedeVerPropietario(', '{', '}'),
    bloque('function propietarioHtml(', '{', '}')].join('\n');
  vm.runInNewContext(codigo, ctx);
} catch (e) { ok('las funciones nuevas existen en la pagina', false, e.message); console.log('\n' + pass + ' pasan, ' + fail + ' fallan'); process.exit(1); }

console.log('1. Quien la ve (la puerta)');
ok('admin la ve', ctx.puedeVerPropietario('admin', false) === true);
ok('manager la ve', ctx.puedeVerPropietario('manager', false) === true);
ok('villa manager (staff con Keyholder_por_defecto) la ve', ctx.puedeVerPropietario('staff', true) === true);
ok('cleaner NO la ve', ctx.puedeVerPropietario('cleaner', false) === false);
ok('sales NO la ve', ctx.puedeVerPropietario('sales', false) === false);
ok('staff sin Keyholder_por_defecto NO la ve', ctx.puedeVerPropietario('staff', false) === false);
ok('sin rol NO la ve', ctx.puedeVerPropietario('', false) === false);
ok('isVillaManager tiene que ser true de verdad (no "x")', ctx.puedeVerPropietario('cleaner', 'x') === false);

console.log('2. La fila para admin, villa 101');
var h = ctx.propietarioHtml('101', 'admin', false);
ok('usa .staff-row', /class="staff-row staff-owner"/.test(h), h);
ok('💼 nombre — Propietario', /💼 <strong>.*Joan Pons.*<\/strong> — Propietario/.test(h), h);
ok('el nombre enlaza a contactos.html?contactid=501', h.indexOf('href="contactos.html?contactid=501"') >= 0);
ok('muestra el telefono', h.indexOf('+34 600 000 001') >= 0);
ok('📞 Llamar con tel: sin espacios', h.indexOf('href="tel:+34600000001"') >= 0 && h.indexOf('📞 Llamar') >= 0, h);
ok('📞 Llamar con el aspecto .lnk azul', /class="lnk lnk-m"[^>]*href="tel:/.test(h));
ok('💬 WhatsApp a wa.me con los digitos de cleanPhone', h.indexOf('href="https://wa.me/' + ctx.cleanPhone('+34 600 000 001') + '"') >= 0 && h.indexOf('https://wa.me/34600000001') >= 0, h);
ok('💬 WhatsApp con el aspecto .lnk verde', /class="lnk lnk-wa"[^>]*href="https:\/\/wa\.me\//.test(h));
ok('✉️ email con mailto:', h.indexOf('✉️') >= 0 && h.indexOf('href="mailto:owner@example.com"') >= 0, h);
ok('🛠️ Responsable incidencias: Marta Mercadal · telefono', /🛠️ Responsable incidencias: .*Marta Mercadal.* · .*\+34 611 222 333/.test(h), h);

console.log('3. La fila para un villa manager, y nada para los demas');
ok('villa manager (staff) ve la misma fila', ctx.propietarioHtml('101', 'staff', true) === h);
ok('manager ve la misma fila', ctx.propietarioHtml('101', 'manager', false) === h);
ok('cleaner: cadena vacia', ctx.propietarioHtml('101', 'cleaner', false) === '');
ok('sales: cadena vacia', ctx.propietarioHtml('101', 'sales', false) === '');
ok('staff sin keyholder: cadena vacia', ctx.propietarioHtml('101', 'staff', false) === '');

console.log('4. Sin propietario no hay fila (ni linea vacia)');
ok('villa sin Owner: vacio', ctx.propietarioHtml('103', 'admin', false) === '');
ok('Owner que no esta en TaContacts: vacio', ctx.propietarioHtml('104', 'admin', false) === '');
ok('villa que no esta en TaVillas: vacio', ctx.propietarioHtml('999', 'admin', false) === '');
ok('sin villaId: vacio', ctx.propietarioHtml('', 'admin', false) === '');
var h5 = ctx.propietarioHtml('105', 'admin', false);
ok('propietario sin telefono ni email: solo la primera linea, sin botones', h5.indexOf('Propietario') >= 0 && h5.indexOf('tel:') < 0 && h5.indexOf('wa.me') < 0 && h5.indexOf('mailto:') < 0, h5);
ok('el nombre se escapa (sin HTML inyectado)', h5.indexOf('<b>') < 0 && h5.indexOf('&lt;b&gt;') >= 0, h5);

console.log('5. Responsable incidencias solo si existe y es otra persona');
var h2 = ctx.propietarioHtml('102', 'admin', false);
ok('mismo contacto que el propietario: sin linea de incidencias', h2.indexOf('Responsable incidencias') < 0 && h2.indexOf('Propietario') >= 0, h2);
ok('sin Issues_responsible: sin linea', h5.indexOf('Responsable incidencias') < 0);

console.log('6. buildCard, carga y CSS');
var card = bloque('function buildCard(', '{', '}');
ok('buildCard llama a propietarioHtml con Auth.role() y __isVillaManager', /propietarioHtml\(villaId,\s*Auth\.role\(\),\s*window\.__isVillaManager===true\)/.test(card));
ok('el bloque .c-staff se abre tambien si solo hay propietario', /if\(cleanerName\|\|vmName\|\|ownerHtml\)/.test(card));
var iVm = card.indexOf('— Villa Manager'), iOw = card.indexOf('html+=ownerHtml'), iClose = card.indexOf("html+='</div>'", iVm);
ok('la fila va despues de Villa Manager y dentro de .c-staff', iVm > 0 && iOw > iVm && iClose > iOw);
var lc = bloque('async function loadContacts(', '{', '}');
ok('loadContacts guarda telefono y email en contactsInfo (misma llamada)', /contactsInfo\.set\(/.test(lc) && /CONTACT_F\.phone/.test(lc) && /CONTACT_F\.email/.test(lc));
ok('una sola llamada a TaContacts en la pagina', (SRC.match(/table=\$\{CFG\.contactsTable\}/g) || []).length === 1);
var lv = bloque('async function loadVillaOwners(', '{', '}');
ok('loadVillaOwners lee TaVillas una vez, limit 500', /table=TaVillas/.test(lv) && /limit=500/.test(lv) && (lv.match(/fetch\(/g) || []).length === 1);
ok('guarda Owner e Issues_responsible por villaid', /villaOwnersMap\.set\(/.test(lv) && /Owner/.test(lv) && /Issues_responsible/.test(lv) && /villaid/.test(lv));
ok('se carga junto a loadContacts y loadMultiunits (una vez por pagina)', /Promise\.allSettled\(\[[^\]]*loadContacts\(\),loadMultiunits\(\),[^\]]*loadVillaOwners\(\)/.test(SRC));
ok('buildCard no hace fetch', card.indexOf('fetch(') < 0);
ok('CSS .lnk-wa verde', /\.lnk-wa\{background:#e6f7ee;color:#1e9e4e\}/.test(SRC));
ok('CSS movil: la fila envuelve y no ensancha la ficha', /\.own-line\{[^}]*flex-wrap:wrap[^}]*min-width:0/.test(SRC) && /\.own-mail\{[^}]*overflow-wrap:anywhere/.test(SRC));
ok('la ficha del limpiador no se toca (entradas-cleaner.html no esta en el payload)', !fs.existsSync('entradas-cleaner.html') || fs.readFileSync('entradas-cleaner.html', 'utf8').indexOf('propietarioHtml') < 0);

console.log('7. Version');
ok('version v157 en las tres marcas', SRC.indexOf('VERSIÓN ACTUAL: v157') >= 0 && SRC.indexOf('Entradas Equipo v157') >= 0 && SRC.indexOf("PAGE_VERSION='v157'") >= 0);
var hist = SRC.slice(SRC.indexOf('<!-- HISTORIAL: v157'));
ok('HISTORIAL v157 con Rafa, fecha y prueba, y v156 detras', /<!-- HISTORIAL: v157 - /.test(SRC) && hist.indexOf('Rafa') >= 0 && hist.indexOf('26/10/2026') >= 0 && hist.indexOf('entradas-propietario.test.js') >= 0 && hist.indexOf('| v156 - ') > 0);
ok('el comentario HISTORIAL cierra una sola vez', hist.split('-->').length === 2);
var scripts = 0, re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, compila = true;
while ((m = re.exec(SRC))) { scripts++; try { new vm.Script(m[1]); } catch (e) { compila = e.message; } }
ok('los scripts inline compilan', scripts > 0 && compila === true, compila);

console.log('\n' + pass + ' pasan, ' + fail + ' fallan');
process.exit(fail ? 1 : 0);
