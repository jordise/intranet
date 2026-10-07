/* Pruebas del boton 'Borrar todo' y de la X de filtros (v153, aviso de Toni Segui
   07/10/2026). node entradas-borrar-todo.test.js

   Como equipo-paso4.test.js: NO copia el codigo de la pagina. Extrae el texto real
   de resetSistema, borrarTodo y clearAll de entradas-equipo.html y lo ejecuta con un
   DOM minimo. Nunca se llama al proxy: no hay red. */
var fs = require('fs');
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
function fnSource(name) { return bloque('function ' + name + '(', '{', '}'); }

var resetSrc = fnSource('resetSistema');
var borrarSrc = fnSource('borrarTodo');
var clearSrc = fnSource('clearAll');

console.log('1. Ninguna de las tres funciones escribe nada');
['setView(', 'applyUserPrefs(', 'action=update', 'action=save', 'fetch('].forEach(function (p) {
  ok('resetSistema no contiene ' + p, resetSrc.indexOf(p) < 0);
  ok('borrarTodo no contiene ' + p, borrarSrc.indexOf(p) < 0);
});
ok('clearAll NO llama a setView', clearSrc.indexOf('setView(') < 0);
ok('clearAll SI aplica las prefs del usuario', clearSrc.indexOf('applyUserPrefs(') >= 0);
ok('clearAll empieza por resetSistema', clearSrc.indexOf('resetSistema()') >= 0);

console.log('2. Boton en el HTML');
ok('boton Borrar todo presente', /onclick="borrarTodo\(\)"[^>]*>Borrar todo</.test(SRC));
ok('tooltip de la X cambiado', SRC.indexOf('title="Volver a mis valores por defecto"') >= 0);
ok('version v154 en las tres marcas',
  SRC.indexOf('VERSIÓN ACTUAL: v154') >= 0 && SRC.indexOf('Entradas Equipo v154') >= 0 && SRC.indexOf("PAGE_VERSION='v154'") >= 0);

console.log('3. resetSistema deja el estado base (DOM minimo)');
function makeEnv() {
  var els = {};
  ['fCodigo', 'fVilla', 'fInquilino', 'fDesde', 'fHasta'].forEach(function (id) { els[id] = { value: 'x' }; });
  var calls = [];
  var env = {
    window: { __urlHasDates: true, __urlManagers: ['9'] },
    localStorage: { removeItem: function () {} },
    $: function (id) { return els[id] || null; },
    selectedSources: new Set(['A']), selectedCleaners: new Set(['7']), selectedManagers: new Set(['3']),
    renderSourceList: function () { calls.push('renderSourceList'); }, updateSourceBtn: function () {},
    renderCleanerList: function () { calls.push('renderCleanerList'); }, updateCleanerBtn: function () {},
    renderManagerList: function () { calls.push('renderManagerList'); }, updateManagerBtn: function () {},
    _syncDates: function () { calls.push('_syncDates'); },
    todayStr: function () { return '2026-10-07'; },
    _calMode: false,
    fWelcomePack: 'pending', fCierre: 'pending', toggleMode: 'pend', tipoFilter: 'entrada',
    els: els, calls: calls
  };
  return env;
}
function runReset(env) {
  var keys = Object.keys(env);
  var body = resetSrc + '\nresetSistema();\nreturn {fWelcomePack:fWelcomePack,fCierre:fCierre,toggleMode:toggleMode,tipoFilter:tipoFilter};';
  var fn = new Function(keys.join(','), body);
  return fn.apply(null, keys.map(function (k) { return env[k]; }));
}
var env = makeEnv();
var out = runReset(env);
ok('textos vacios', env.els.fCodigo.value === '' && env.els.fVilla.value === '' && env.els.fInquilino.value === '');
ok('fechas hoy-hoy', env.els.fDesde.value === '2026-10-07' && env.els.fHasta.value === '2026-10-07');
ok('fuentes, limpieza y managers vacios', env.selectedSources.size === 0 && env.selectedCleaners.size === 0 && env.selectedManagers.size === 0);
ok('listas repintadas', env.calls.indexOf('renderCleanerList') >= 0 && env.calls.indexOf('renderManagerList') >= 0 && env.calls.indexOf('renderSourceList') >= 0);
ok('marcas de enlace limpias', env.window.__urlHasDates === false && env.window.__urlManagers === null);
ok('conmutadores en todo/ambos', out.fWelcomePack === 'all' && out.fCierre === 'all' && out.toggleMode === 'all' && out.tipoFilter === 'both');

var env2 = makeEnv(); env2._calMode = true;
runReset(env2);
ok('en vista semanal usa _syncDates', env2.calls.indexOf('_syncDates') >= 0 && env2.els.fDesde.value === 'x');

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
