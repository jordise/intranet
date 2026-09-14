/* Pruebas de la fila de detalle del resumen de guardias (v09).
   Caso: Nazaret, grupo TIC 14/09/2026: "clicar sobre cada intervención y que te
   dirigiese directamente a la descripción completa de la guardia".
   node listado-guardias-detalle.test.js

   Como paso4-tasa-pagada.test.js: NO copia el código de la página. Extrae las
   funciones reales (subsetRows, sortForDetail, detailRowHTML, numBtn,
   detailTitle, isGuardiaRow, extractTime, fmtDMY, plainText, extractDateOnly,
   isFlagOn, esc, pad2) de listado-guardias-e-intervenciones.html y las ejecuta.
   Sin red, sin datos reales. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var F = 'listado-guardias-e-intervenciones.html', S = fs.readFileSync(F, 'utf8');
function fnSource(name) {
  var i = S.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = S.indexOf('{', i), depth = 0, k = j;
  for (; k < S.length; k++) { if (S[k] === '{') depth++; else if (S[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return S.slice(i, k);
}
var ctx = { tiposMap: { 'corte': 'Corte de electricidad', 'otros': 'Otros' }, allUsersMap: { 'U1': 'Nazaret', 'U2': 'Kike' } };
['esc', 'pad2', 'isFlagOn', 'extractDateOnly', 'isGuardiaRow', 'subsetRows', 'detailTitle', 'extractTime', 'fmtDMY', 'plainText', 'detailRowHTML', 'sortForDetail', 'numBtn']
  .forEach(function (n) { vm.runInNewContext(fnSource(n), ctx); });

var rows = [
  { TaTasks_taskid: 87569, TaTasks_Intervencion_guardia_tipo_ID: 'corte', TaTasks_Tarea_terminada: false, TaTasks_Data_to_be_done_fixed: '2026-08-24T00:00:00', TaVillas_Name_villa_para_inquilinos: 'VILLA MISUCO', TaTasks_UserID_responsible_alfanum: 'U1', TaTasks_Taskdescription: '• corte electrico\n[x] luz repuesta', TaTasks_Idreserva: '55601223', TaTasks_Intervencion_guardia_hora_inicio: '1899-12-30T12:50:00', TaTasks_Intervencion_guardia_hora_fin: '1899-12-30T14:50:00', TaTasks_importante: true, TaTasks_urgente: true, TaTasks_Desplazamientos: false },
  { TaTasks_taskid: 87000, TaTasks_Intervencion_guardia_tipo_ID: 'guardia sin intervencion', TaTasks_Tarea_terminada: false, TaTasks_Data_to_be_done_fixed: '2026-08-30 00:00:00', TaVillas_Name_villa_para_inquilinos: '', TaTasks_UserID_responsible_alfanum: 'U1', TaTasks_Desplazamientos: false },
  { TaTasks_taskid: 86500, TaTasks_Intervencion_guardia_tipo_ID: 'otros', TaTasks_Tarea_terminada: true, TaTasks_Data_to_be_done_fixed: '2026-08-28T00:00:00', TaVillas_Name_villa_para_inquilinos: 'Bini <b>X</b>', TaTasks_UserID_responsible_alfanum: 'U2', TaTasks_Taskdescription: 'a'.repeat(200), TaTasks_Desplazamientos: true },
  { TaTasks_taskid: 86400, TaTasks_Intervencion_guardia_tipo_ID: 'corte', TaTasks_Tarea_terminada: false, TaTasks_Data_to_be_done_fixed: '2026-08-02T00:00:00', TaTasks_UserID_responsible_alfanum: 'U2', TaTasks_Desplazamientos: false }
];
var grp = { mgrName: 'Nazaret', rows: rows };

console.log('subsetRows: las mismas reglas que las cuentas');
ok('guardias = solo "guardia sin intervencion"', ctx.subsetRows(grp, 'guardias').map(function (r) { return r.TaTasks_taskid; }).join() === '87000');
ok('intervenciones = el resto', ctx.subsetRows(grp, 'intervenciones').length === 3);
ok('pendientes = intervenciones sin Terminada (la guardia no cuenta)', ctx.subsetRows(grp, 'pendientes').map(function (r) { return r.TaTasks_taskid; }).sort().join() === '86400,87569');
ok('desplazamientos = marca Desplazamientos', ctx.subsetRows(grp, 'desplazamientos').map(function (r) { return r.TaTasks_taskid; }).join() === '86500');
ok('tipo:corte = dos registros', ctx.subsetRows(grp, 'tipo:corte').length === 2);
ok('clave desconocida = vacío', ctx.subsetRows(grp, 'zzz').length === 0);
ok('grupo sin rows no rompe', ctx.subsetRows({}, 'guardias').length === 0);

console.log('paridad: cada cuenta de aggregate() = longitud de subsetRows()');
vm.runInNewContext(fnSource('aggregate'), ctx);
var grps = ctx.aggregate(rows.concat([{ TaTasks_taskid: 1, TaTasks_Intervencion_guardia_tipo_ID: 'otros', TaTasks_Tarea_terminada: 'No', TaTasks_Data_to_be_done_fixed: '2026-07-03T00:00:00', TaTasks_UserID_responsible_alfanum: 'U1', TaTasks_Desplazamientos: 'Yes' }]));
ok('dos grupos (agosto Nazaret/Kike + julio Nazaret)', grps.length === 3, grps.length);
grps.forEach(function (gp) {
  ['guardias', 'intervenciones', 'pendientes', 'desplazamientos'].forEach(function (k) {
    ok(gp.monthKey + ' ' + gp.mgrName + ' ' + k + ': ' + gp[k], ctx.subsetRows(gp, k).length === gp[k], ctx.subsetRows(gp, k).length);
  });
  Object.keys(gp.porTipo).forEach(function (tid) {
    ok(gp.monthKey + ' ' + gp.mgrName + ' tipo:' + tid + ': ' + gp.porTipo[tid], ctx.subsetRows(gp, 'tipo:' + tid).length === gp.porTipo[tid]);
  });
});

console.log('sortForDetail: pendientes primero, luego fecha descendente');
var order = ctx.sortForDetail(rows).map(function (r) { return r.TaTasks_taskid; });
ok('orden 87569, 86400, 87000, 86500', order.join() === '87569,86400,87000,86500', order.join());

console.log('detailRowHTML: el enlace y los textos');
var h = ctx.detailRowHTML(rows[0]);
ok('enlace ?editar=87569 a guardias-e-intervenciones.html', h.indexOf('href="guardias-e-intervenciones.html?editar=87569"') > 0);
ok('pill Pendiente', h.indexOf('det-pill pend">Pendiente') > 0);
ok('fecha 24/08/2026', h.indexOf('24/08/2026') > 0);
ok('horas 12:50–14:50', h.indexOf('12:50–14:50') > 0);
ok('villa y reserva', h.indexOf('VILLA MISUCO') > 0 && h.indexOf('Reserva 55601223') > 0);
ok('tipo por nombre + banderas', h.indexOf('Corte de electricidad 🚩 🏁') > 0);
ok('descripción sin viñeta, puntos unidos con ·', h.indexOf('corte electrico · luz repuesta') > 0 && h.indexOf('•') < 0, h);
ok('responsable por nombre', h.indexOf('>Nazaret<') > 0);
ok('fila marcada como pendiente', h.indexOf('det-row pend') > 0);
var hg = ctx.detailRowHTML(rows[1]);
ok('guardia: pill Guardia, tipo "Guardia sin intervención", sin horas', hg.indexOf('det-pill guardia">Guardia') > 0 && hg.indexOf('Guardia sin intervención') > 0 && hg.indexOf('det-muted">12') < 0);
ok('guardia: villa vacía = raya, sin descripción', hg.indexOf('>—<') > 0 && hg.indexOf('Sin descripción') > 0);
var hd = ctx.detailRowHTML(rows[2]);
ok('terminada: pill Terminada y 🚗', hd.indexOf('det-pill done">Terminada') > 0 && hd.indexOf('🚗') > 0);
ok('descripción recortada a 90 con …', /a{89}…/.test(hd) && hd.indexOf('a'.repeat(100)) < 0);
ok('la villa se escapa (sin <b>)', hd.indexOf('<b>') < 0 && hd.indexOf('&lt;b&gt;') > 0);

console.log('numBtn y detailTitle');
ok('0 = raya', ctx.numBtn(0, 'guardias', 0) === '—');
ok('0 en TOTALES = 0', ctx.numBtn('T', 'guardias', 0) === '0');
ok('n>0 = botón con data-gi y data-k', /^<button type="button" class="num-btn" data-gi="3" data-k="tipo:corte"/.test(ctx.numBtn(3, 'tipo:corte', 2)));
ok('con etiqueta: número en negrita y nombre escapado dentro del botón', ctx.numBtn(3, 'tipo:corte', 2, 'Corte <x>').indexOf('<strong>2</strong> Corte &lt;x&gt;</button>') > 0);
ok('título pendientes', ctx.detailTitle(grp, 'pendientes', 2) === '2 intervenciones pendientes · Nazaret');
ok('título singular', ctx.detailTitle(grp, 'pendientes', 1) === '1 intervención pendiente · Nazaret');
ok('título tipo por nombre', ctx.detailTitle(grp, 'tipo:corte', 1) === '1 Corte de electricidad · Nazaret');
ok('título totales = TOTALES delante', ctx.detailTitle({ rows: [] }, 'guardias', 19) === 'TOTALES · 19 guardias');
ok('plainText quita viñetas y casillas y une con ·', ctx.plainText('• uno\n[x] dos\n[ ] tres', 90) === 'uno · dos · tres');

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
