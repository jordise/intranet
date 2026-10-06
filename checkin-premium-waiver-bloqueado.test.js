/* Pruebas del caso de Marta Deza (06/10/2026): en una boda el equipo puso
   "Se permite seleccionar waiver" en No y el huesped consiguio el waiver igualmente
   por la pagina del Check-in Premium (checkin-premium v28).
   node checkin-premium-waiver-bloqueado.test.js

   Como dep-cobros-opcion3.test.js: NO copia el codigo de la pagina. Extrae el
   texto real de cada funcion del HTML y lo ejecuta. */
var fs = require('fs');
var FILE = 'checkin-premium.html';
var src = fs.readFileSync(FILE, 'utf8');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

function fnSource(name) {
  var i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name + ' en ' + FILE);
  var j = src.indexOf('{', i), depth = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) { k++; break; } }
  }
  return src.slice(i, k);
}

/* ── premiumDisponible(r): la regla ── */
console.log('checkin-premium.html: premiumDisponible');
var premiumDisponible = new Function(fnSource('g') + '\n' + fnSource('isYes') + '\n' + fnSource('premiumDisponible') + '\nreturn premiumDisponible;')();
function con(v) { return { TaBookings2021_Se_permite_waver: v }; }
ok('Se_permite_waver = 1 (Si): Premium disponible', premiumDisponible(con(1)) === true);
ok('Se_permite_waver = "1": Premium disponible', premiumDisponible(con('1')) === true);
ok('Se_permite_waver = -1 (Caspio Si): Premium disponible', premiumDisponible(con(-1)) === true);
ok('Se_permite_waver = true (Worker booleano): Premium disponible', premiumDisponible(con(true)) === true);
ok('Se_permite_waver = 20 (NO en TaViXYesNo): Premium NO disponible', premiumDisponible(con(20)) === false);
ok('Se_permite_waver = "20": Premium NO disponible', premiumDisponible(con('20')) === false);
ok('Se_permite_waver = 0: Premium NO disponible', premiumDisponible(con(0)) === false);
ok('Se_permite_waver = false: Premium NO disponible', premiumDisponible(con(false)) === false);
ok('Se_permite_waver vacio: Premium NO disponible', premiumDisponible(con('')) === false);
ok('Se_permite_waver nulo: Premium NO disponible', premiumDisponible(con(null)) === false);
ok('Se_permite_waver ausente: Premium NO disponible', premiumDisponible({}) === false);
ok('campo sin prefijo TaBookings2021_ tambien se lee', premiumDisponible({ Se_permite_waver: 1 }) === true);

/* ── Guardas en selectOpt y savePremium ── */
console.log('checkin-premium.html: guardas');
var selSrc = fnSource('selectOpt');
ok('selectOpt ignora prem con _waiverBlocked', /_waiverBlocked\s*&&\s*opt\s*===\s*'prem'\s*\)\s*return/.test(selSrc));
var saveIdx = src.indexOf('async function savePremium(');
var saveSrc = src.slice(saveIdx, src.indexOf('goBack();', saveIdx));
ok('savePremium vuelve antes de guardar con _waiverBlocked', /if\(_waiverBlocked\)\{[^}]*return;\s*\}/.test(saveSrc));
ok('la guarda de savePremium esta ANTES del saveFields', saveSrc.indexOf('_waiverBlocked') < saveSrc.indexOf('saveFields('));
ok('savePremium sigue escribiendo opcion 1 + terminado solo en el camino permitido', saveSrc.indexOf("Security_deposit_options:1, Security_deposit_terminado:1") > 0);

/* ── render(): el bloqueo v24 (waiver cobrado) manda sobre el v28 ── */
var renderSrc = fnSource('render');
var iLocked = renderSrc.indexOf("_locked=isYes(g(r,'Deposit_waver_cobrado'))");
var iBlocked = renderSrc.indexOf('_waiverBlocked=!premiumDisponible(r)');
ok('render calcula _waiverBlocked con premiumDisponible', iBlocked > 0);
ok('render evalua el bloqueo v24 antes que el v28', iLocked > 0 && iLocked < iBlocked);
ok('render atenua la tarjeta Premium', /cardPrem'\)\.classList\.add\('locked'\)/.test(renderSrc));
ok('render muestra el banner prem_blocked_msg', renderSrc.indexOf("t('prem_blocked_msg')") > 0);
ok('render preselecciona Estandar cuando el waiver esta bloqueado', renderSrc.slice(iBlocked).indexOf("selectOpt('std')") > 0);

/* ── i18n: el texto existe en los 8 idiomas ── */
console.log('checkin-premium.html: i18n');
var n = (src.match(/prem_blocked_msg:'/g) || []).length;
ok('prem_blocked_msg en los 8 idiomas (en/es/fr/de/it/nl/pt/ca)', n === 8, 'hay ' + n);
ok('cabecera VERSION ACTUAL: v28', /VERSI[OÓ]N ACTUAL: v28/.test(src.split('\n').slice(0, 5).join('\n')));
ok('HISTORIAL empieza por v28', /<!-- HISTORIAL: v28 - /.test(src));

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
