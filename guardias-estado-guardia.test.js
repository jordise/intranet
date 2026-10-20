/* Pruebas de la guardia con estado propio (Guardias e Intervenciones v25, Resumen v10).
   Caso: Jordi, WhatsApp 20/10/2026 12:07, reenviando a Irene ("una tarea de intervención de
   guardia en villa Bella que ni yo ni Anaís conseguimos cerrar"): "when in the filter I select
   pending this one should be shown and is not".
   Hasta v24 una guardia no tenía estado (regla G24 de v21): los filtros Pendientes/Terminadas la
   escondían, el formulario no tenía interruptor Terminada y la tarjeta pintaba "Pendiente" igual.
   node guardias-estado-guardia.test.js

   Como listado-guardias-detalle.test.js: NO copia el código de la página. Extrae las funciones
   reales (isFlagOn, pasaFiltroEstado, puedeSeguirRegistro, subsetRows, isGuardiaRow) y las ejecuta.
   Sin red, sin datos reales. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
function fnSource(S, name) {
  var i = S.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = S.indexOf('{', i), depth = 0, k = j;
  for (; k < S.length; k++) { if (S[k] === '{') depth++; else if (S[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return S.slice(i, k);
}

var G = fs.readFileSync('guardias-e-intervenciones.html', 'utf8');
var L = fs.readFileSync('listado-guardias-e-intervenciones.html', 'utf8');

var guardiaPend = { TaTasks_taskid: 1, TaTasks_Intervencion_guardia_tipo_ID: 'guardia sin intervencion', TaTasks_Tarea_terminada: false, TaTasks_UserID_asigned_alfanum: 'U7' };
var guardiaDone = { TaTasks_taskid: 2, TaTasks_Intervencion_guardia_tipo_ID: 'guardia sin intervencion', TaTasks_Tarea_terminada: 'Yes', TaTasks_UserID_asigned_alfanum: 'U7' };
var intPend = { TaTasks_taskid: 3, TaTasks_Intervencion_guardia_tipo_ID: 'otros', TaTasks_Tarea_terminada: 'No', TaTasks_UserID_asigned_alfanum: 'U7' };
var intDone = { TaTasks_taskid: 4, TaTasks_Intervencion_guardia_tipo_ID: 'otros', TaTasks_Tarea_terminada: true, TaTasks_UserID_asigned_alfanum: 'U9' };

console.log('Guardias e Intervenciones: versión y filtro de estado');
ok('la página es v25 o posterior', /VERSI[ÓO]N ACTUAL: v(2[5-9]|[3-9]\d)/.test(G.slice(0, 400)));
ok('la regla G24 (guardia solo con "Todas") ya no está', G.indexOf('estadoFilter!==\'all\' && isGuardiaRow(r)') < 0);

var ctx = {};
['isFlagOn', 'pasaFiltroEstado', 'puedeSeguirRegistro'].forEach(function (n) { vm.runInNewContext(fnSource(G, n), ctx); });

ok('Todas deja pasar la guardia pendiente', ctx.pasaFiltroEstado(guardiaPend, 'all') === true);
ok('Pendientes muestra la guardia pendiente', ctx.pasaFiltroEstado(guardiaPend, 'pend') === true);
ok('Pendientes esconde la guardia terminada', ctx.pasaFiltroEstado(guardiaDone, 'pend') === false);
ok('Terminadas muestra la guardia terminada', ctx.pasaFiltroEstado(guardiaDone, 'done') === true);
ok('Terminadas esconde la guardia pendiente', ctx.pasaFiltroEstado(guardiaPend, 'done') === false);
ok('Pendientes sigue igual para una intervención pendiente', ctx.pasaFiltroEstado(intPend, 'pend') === true);
ok('Terminadas sigue igual para una intervención terminada', ctx.pasaFiltroEstado(intDone, 'done') === true);

console.log('Contadores: pendientes y terminadas cuentan también las guardias');
var cnt = G.match(/var pendCnt=([a-zA-Z]+)\.filter\(/);
ok('pendCnt se calcula sobre todas las filas filtradas, no solo intervenciones', !!cnt && cnt[1] === 'filtered');

console.log('Puerta de las 24 horas: el asignado puede cerrar también una guardia');
ok('asignado + pendiente = puede, en una guardia', ctx.puedeSeguirRegistro(guardiaPend, 'U7') === true);
ok('asignado + pendiente = puede, en una intervención', ctx.puedeSeguirRegistro(intPend, 'U7') === true);
ok('asignado + terminada = no puede', ctx.puedeSeguirRegistro(guardiaDone, 'U7') === false);
ok('otro usuario = no puede', ctx.puedeSeguirRegistro(guardiaPend, 'U8') === false);
ok('sin sesión resuelta = no puede', ctx.puedeSeguirRegistro(guardiaPend, '') === false);
ok('el aviso de bloqueo de una guardia nombra al Villa Manager asignado', /Esta guardia se registró hace más de 24 horas\. Solo la puede editar el Villa Manager asignado/.test(G));

console.log('Formulario de guardia: interruptor Terminada visible y guardado');
var saveG = G.slice(G.indexOf('var recordG='), G.indexOf('var recordG=') + 400);
ok('el guardado de la guardia escribe Tarea_terminada desde el interruptor', /Tarea_terminada:\s*g\('mTerminada'\)\.checked\s*\?\s*'Yes'\s*:\s*'No'/.test(saveG));
var campos = G.indexOf('<div id="mCamposCompletos">'), tcard = G.indexOf('<div class="toggle-card terminada-card">'), fotos = G.indexOf('<div id="mFotosWrap">');
/* entre la apertura de mCamposCompletos y la tarjeta Terminada se cierran tantos <div como se abren,
   más el propio mCamposCompletos: la tarjeta queda fuera */
var entre = G.slice(campos, tcard), abiertos = entre.split('<div').length - 1, cerrados = entre.split('</div>').length - 1;
ok('la tarjeta Terminada está fuera de mCamposCompletos (se ve en una guardia)', campos > 0 && tcard > 0 && fotos > 0 && cerrados === abiertos, abiertos + ' abiertos / ' + cerrados + ' cerrados');
ok('las fotos tienen su propio envoltorio mFotosWrap, escondido en una guardia', fotos > tcard && /g\('mFotosWrap'\)\.style\.display\s*=\s*isGuardiaOnlyEdit\?'none':'block'/.test(G));

console.log('Resumen de guardias v10: Pendientes cuenta la guardia sin Terminada');
ok('el resumen es v10 o posterior', /VERSI[ÓO]N ACTUAL: v(1\d|[2-9]\d)/.test(L.slice(0, 400)));
var lctx = {};
['isFlagOn', 'isGuardiaRow', 'subsetRows'].forEach(function (n) { vm.runInNewContext(fnSource(L, n), lctx); });
var grp = { rows: [guardiaPend, guardiaDone, intPend, intDone] };
ok('pendientes = toda fila sin Terminada, guardias incluidas', lctx.subsetRows(grp, 'pendientes').map(function (r) { return r.TaTasks_taskid; }).join() === '1,3');
ok('guardias = solo guardias', lctx.subsetRows(grp, 'guardias').length === 2);
/* la línea que suma pendientes está fuera del else de las intervenciones: después del cierre del
   if/else de tipoId y antes de la cuenta de desplazamientos */
var agg = L.slice(L.indexOf("if(tipoId==='guardia sin intervencion'){"), L.indexOf('grp.desplazamientos++'));
var cierreElse = agg.indexOf('\n    }\n'), lineaPend = agg.indexOf('if(!isFlagOn(r.TaTasks_Tarea_terminada)) grp.pendientes++;');
ok('la cuenta por grupo suma la guardia pendiente (fuera del else de intervenciones)', cierreElse > 0 && lineaPend > cierreElse, cierreElse + ' / ' + lineaPend);

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
