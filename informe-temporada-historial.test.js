/* Pruebas de informe-temporada-historial.js (Historial: el historial de envíos del informe de temporada, formulario v5).
   node informe-temporada-historial.test.js
   Job informe-form-v5-v3b, lane B, 29/10/2026 (paquete, slice E punto 6; consenso del cuadro, punto 17).
   Las líneas "<dd/mm/aaaa hh:mm> enviado por <nombre> (rev N)" y "... reabierto por ...", el añadido sin duplicados
   por "(rev N)" del mismo tipo, el aviso de los informes anteriores a la v5, y las dos funciones de cableado
   (registrarEnvio, registrarReapertura) con un Worker falso y con las funciones REALES del formulario
   (informeRequest, leer, enviar) cargadas por arnes-informe.js. Sin red. */
var pass = 0, fail = 0, terminado = false;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '  -> ' + e : '')); } }
function J(x) { return JSON.stringify(x); }
function safe(f) { try { return f(); } catch (e) { return e; } }
function fin() { terminado = true; console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(fail ? 1 : 0); }
process.on('exit', function () { if (!terminado) { console.log('\n' + pass + ' PASS, ' + (fail + 1) + ' FAIL (las pruebas asíncronas no terminaron)'); process.exitCode = 1; } });

var Historial;
try { Historial = require('./informe-temporada-historial.js'); } catch (e) { ok('se carga informe-temporada-historial.js', false, e.message); fin(); }
ok('se carga informe-temporada-historial.js con require', !!Historial && typeof Historial === 'object');
['fechaVer', 'lineaEnvio', 'lineaReapertura', 'contiene', 'append', 'mostrar', 'nombreDe', 'registrarEnvio', 'registrarReapertura'].forEach(function (n) {
  ok('expone ' + n, !!Historial && typeof Historial[n] === 'function');
});
if (fail) fin();

console.log('1. Fecha y líneas');
ok('fechaVer de la hora de Caspio (ahoraCaspio)', Historial.fechaVer('2026-10-29T14:05:09') === '29/10/2026 14:05', Historial.fechaVer('2026-10-29T14:05:09'));
ok('fechaVer con espacio en vez de T', Historial.fechaVer('2026-10-29 08:07:00') === '29/10/2026 08:07');
ok('fechaVer de una fecha sin hora = solo el día', Historial.fechaVer('2026-10-26T00:00:00') === '26/10/2026 00:00' && Historial.fechaVer('2026-10-26') === '26/10/2026');
ok('fechaVer de un Date (hora local)', Historial.fechaVer(new Date(2026, 9, 3, 7, 4, 0)) === '03/10/2026 07:04');
ok('fechaVer vacío o raro = ""', Historial.fechaVer('') === '' && Historial.fechaVer(null) === '' && Historial.fechaVer('ayer') === '');
ok('lineaEnvio', Historial.lineaEnvio('Ana Admin', 1, '2026-10-29T14:05:09') === '29/10/2026 14:05 enviado por Ana Admin (rev 1)', Historial.lineaEnvio('Ana Admin', 1, '2026-10-29T14:05:09'));
ok('lineaReapertura', Historial.lineaReapertura('Jordi', 3, '2026-10-30T09:00:00') === '30/10/2026 09:00 reabierto por Jordi (rev 3)', Historial.lineaReapertura('Jordi', 3, '2026-10-30T09:00:00'));
ok('nombre vacío = "usuario desconocido"', Historial.lineaEnvio('  ', 2, '2026-10-29T14:05:00') === '29/10/2026 14:05 enviado por usuario desconocido (rev 2)');
ok('rev como texto o null: número entero (null = 0)', Historial.lineaReapertura('Pep', '4', '2026-10-29T10:00:00') === '29/10/2026 10:00 reabierto por Pep (rev 4)' && /\(rev 0\)$/.test(Historial.lineaReapertura('Pep', null, '2026-10-29T10:00:00')));
ok('un salto de línea en el nombre no rompe el historial (una línea por envío)', Historial.lineaEnvio('Ana\nAdmin', 1, '2026-10-29T14:05:00').indexOf('\n') < 0);
ok('nombreDe: Name, si no UserID, si no el email', Historial.nombreDe({ Name: 'Ana Admin', UserID: 'U1' }) === 'Ana Admin' && Historial.nombreDe({ UserID: 'U7' }) === 'U7' && Historial.nombreDe(null, 'vm@3villas.com') === 'vm@3villas.com' && Historial.nombreDe(null) === '');

console.log('2. append: una línea por envío o reapertura, sin duplicados por "(rev N)" del mismo tipo');
var e1 = Historial.lineaEnvio('Ana', 1, '2026-10-29T14:05:00'), r1 = Historial.lineaReapertura('Jordi', 1, '2026-10-29T16:00:00'), e2 = Historial.lineaEnvio('Ana', 2, '2026-10-30T09:00:00');
var h1 = Historial.append(null, e1, 1, 'envio');
ok('historial vacío (null) + envío = la línea', h1 === e1, J(h1));
ok('historial "" + envío = la línea', Historial.append('', e1, 1, 'envio') === e1);
var h1b = Historial.append(h1, Historial.lineaEnvio('Ana', 1, '2026-10-29T14:09:00'), 1, 'envio');
ok('reintento: otro envío con la misma rev no añade nada', h1b === h1, J(h1b));
var h2 = Historial.append(h1, r1, 1, 'reapertura');
ok('reapertura de la rev 1 tras el envío de la rev 1 = segunda línea', h2 === e1 + '\n' + r1, J(h2));
ok('reintento de la reapertura de la rev 1 = nada', Historial.append(h2, r1, 1, 'reapertura') === h2);
var h3 = Historial.append(h2, e2, 2, 'envio');
ok('nuevo envío (rev 2) tras la reapertura = tercera línea', h3.split('\n').length === 3 && h3.split('\n')[2] === e2);
ok('"(rev 1)" no se confunde con "(rev 11)"', Historial.append(Historial.lineaEnvio('Ana', 11, '2026-10-29T14:05:00'), e1, 1, 'envio').split('\n').length === 2);
ok('contiene(historial, rev, tipo)', Historial.contiene(h3, 2, 'envio') === true && Historial.contiene(h3, 2, 'reapertura') === false && Historial.contiene(h3, 1, 'reapertura') === true && Historial.contiene('', 1, 'envio') === false);
ok('un tipo que no es envio ni reapertura = error', safe(function () { return Historial.append('', e1, 1, 'otro'); }) instanceof Error);
ok('una línea con otra rev que la del tipo = error (la línea y la rev van juntas)', safe(function () { return Historial.append('', e1, 2, 'envio'); }) instanceof Error);
ok('una línea de reapertura pasada como envío = error', safe(function () { return Historial.append('', r1, 1, 'envio'); }) instanceof Error);
ok('las líneas en blanco o con \\r\\n del historial guardado se respetan', Historial.append(e1 + '\r\n', r1, 1, 'reapertura') === e1 + '\n' + r1);
var largo = []; for (var i = 1; i <= 1400; i++) largo.push(Historial.lineaEnvio('Nombre de prueba largo', i, '2026-10-29T14:05:00'));
var hl = Historial.append(largo.join('\n'), Historial.lineaEnvio('Ana', 1401, '2026-10-29T14:05:00'), 1401, 'envio');
ok('cabe en la columna de Caspio (64000): se quitan las líneas más antiguas, la nueva queda', hl.length <= 64000 && /\(rev 1401\)$/.test(hl) && hl.indexOf('(rev 1)\n') < 0, hl.length);

console.log('3. mostrar: el historial, o el aviso de los informes anteriores a la v5 con sus fechas guardadas');
var m1 = Historial.mostrar(h3, { informe_id: 9, estado: 'enviado', revision: 2, fecha_revision: '2026-10-26T00:00:00', updated_at: '2026-10-30T09:00:05' });
ok('con historial: una entrada por línea, en orden', (m1.match(/<li>/g) || []).length === 3 && m1.indexOf(e1) < m1.indexOf(r1) && m1.indexOf(r1) < m1.indexOf(e2), m1);
ok('con historial: no sale el aviso de antes de la v5', m1.indexOf('antes de la v5') < 0);
ok('con historial: la revisión actual', /Revisión actual: 2/.test(m1));
var m2 = Historial.mostrar('', { informe_id: 9, estado: 'enviado', fecha_revision: '2026-10-26T00:00:00', updated_at: '2026-10-28T18:20:00', enviado_at: '2026-10-28T18:20:00' });
ok('enviado antes de la v5 (historial vacío): "Historial no disponible antes de la v5"', m2.indexOf('Historial no disponible antes de la v5') >= 0, m2);
ok('aviso: Fecha de revisión = la del villa manager, solo el día', /Fecha de revisión[^<]*: 26\/10\/2026/.test(m2) && m2.indexOf('26/10/2026 00:00') < 0, m2);
ok('aviso: Último guardado = updated_at con su hora', /Último guardado[^<]*: 28\/10\/2026 18:20/.test(m2), m2);
ok('aviso: el envío guardado (enviado_at) cuando existe', /Envío guardado[^<]*: 28\/10\/2026 18:20/.test(m2), m2);
var m3 = Historial.mostrar(null, { informe_id: 9, estado: 'enviado', fecha_revision: '2026-10-26', updated_at: null });
ok('sin fecha guardada = "—", nunca otra fecha en su lugar', /Último guardado[^<]*: —/.test(m3) && m3.indexOf('Envío guardado') < 0, m3);
var m4 = Historial.mostrar('', { informe_id: 9, estado: 'borrador', fecha_revision: '2026-10-26', updated_at: '2026-10-29T10:00:00' });
ok('borrador sin historial: "Sin envíos registrados" (el historial empieza en la v5)', m4.indexOf('Sin envíos registrados') >= 0 && m4.indexOf('Historial no disponible') < 0, m4);
var m5 = Historial.mostrar('', null);
ok('informe nuevo (null): "Sin envíos registrados", sin fechas', m5.indexOf('Sin envíos registrados') >= 0 && m5.indexOf('Último guardado') < 0, m5);
var m6 = Historial.mostrar('29/10/2026 14:05 enviado por <b>Ana</b> & co (rev 1)', { informe_id: 9, estado: 'enviado', revision: 1 });
ok('mostrar escapa el texto', m6.indexOf('<b>') < 0 && m6.indexOf('&lt;b&gt;Ana&lt;/b&gt; &amp; co') >= 0, m6);
ok('mostrar: el bloque tiene la clase historial y el título', /class="historial"/.test(m1) && /Historial de envíos/.test(m1));

/* ── 4. Cableado con un Worker falso (fakes) ── */
function fakes(fila, o) {
  o = o || {};
  var F = { fila: fila, llamadas: [], escritos: [] };
  F.informeRequest = function (inf, cambios) {
    var c = Object.assign({}, cambios || {});
    if (!inf || !inf.informe_id) return { method: 'POST', url: 'W?action=save&table=TaInformeTemporada&method=POST', body: c };
    c.updated_at = '2026-10-29T14:05:59';
    return { method: 'PUT', url: 'W?action=save&table=TaInformeTemporada&where=informe_id%3D' + inf.informe_id + '&method=PUT', body: c };
  };
  F.leer = function (tabla, where, limit) {
    F.llamadas.push('leer ' + tabla + ' ' + where + ' ' + limit);
    if (o.leerFalla) return Promise.reject(new Error('HTTP 500 al leer ' + tabla));
    return Promise.resolve(F.fila ? [Object.assign({}, F.fila)] : []);
  };
  F.enviar = function (req) {
    F.llamadas.push(req.method + ' ' + req.url);
    if (o.enviarFalla) return Promise.reject(new Error('HTTP 500: fallo de prueba'));
    F.escritos.push(req.body); Object.assign(F.fila, req.body);
    return Promise.resolve({ ok: true });
  };
  F.dep = { informeRequest: F.informeRequest, leer: F.leer, enviar: F.enviar, ahora: function () { return '2026-10-29T14:05:09'; } };
  return F;
}
async function parte(f) { try { await f(); } catch (e) { ok('la parte termina sin excepción', false, e && e.stack); } }
async function rechaza(p) { try { await p; return null; } catch (e) { return e; } }

async function pruebasCableado() {
  await parte(async function () {
    console.log('4.1 registrarEnvio: primer envío (revision null) = rev 1 y una línea');
    var F = fakes({ informe_id: 9, estado: 'enviado', revision: null, historial: null });
    var r = await Historial.registrarEnvio({ informe_id: 9 }, 'Ana Admin', F.dep);
    ok('lee la cabecera antes de escribir', F.llamadas[0] === 'leer TaInformeTemporada informe_id=9 1', J(F.llamadas));
    ok('un PUT de la cabecera con la where del informe', F.llamadas.length === 2 && /^PUT .*informe_id%3D9/.test(F.llamadas[1]), J(F.llamadas));
    var b = F.escritos[0] || {};
    ok('escribe enviado_at, enviado_por, revision = 1 e historial', b.enviado_at === '2026-10-29T14:05:09' && b.enviado_por === 'Ana Admin' && b.revision === 1 && b.historial === '29/10/2026 14:05 enviado por Ana Admin (rev 1)', J(b));
    ok('no toca estado ni otros campos de la cabecera (el PUT del formulario ya lo hizo)', !('estado' in b) && !('estado_general' in b), J(Object.keys(b)));
    ok('devuelve {escrito: true, rev: 1, cambios}', r && r.escrito === true && r.rev === 1 && r.cambios && r.cambios.historial === b.historial, J(r));

    console.log('4.2 reintento con la misma revisión: no escribe nada');
    var n = F.llamadas.length, r2 = await Historial.registrarEnvio({ informe_id: 9 }, 'Ana Admin', F.dep);
    ok('solo la lectura, ningún PUT', F.llamadas.length === n + 1 && /^leer /.test(F.llamadas[n]), J(F.llamadas.slice(n)));
    ok('devuelve {escrito: false, rev: 1} y los valores guardados', r2.escrito === false && r2.rev === 1 && r2.cambios.historial === F.fila.historial, J(r2));

    console.log('4.3 registrarReapertura: misma rev, una línea; reintento = nada');
    var r3 = await Historial.registrarReapertura({ informe_id: 9 }, 'Jordi', Object.assign({}, F.dep, { ahora: function () { return '2026-10-29T16:00:00'; } }));
    var b3 = F.escritos[1] || {};
    ok('escribe solo historial (revision no cambia)', J(Object.keys(b3).filter(function (k) { return k !== 'updated_at'; })) === J(['historial']) && F.fila.revision === 1, J(b3));
    ok('la línea de reapertura con la rev 1', b3.historial === '29/10/2026 14:05 enviado por Ana Admin (rev 1)\n29/10/2026 16:00 reabierto por Jordi (rev 1)', J(b3.historial));
    ok('devuelve {escrito: true, rev: 1}', r3.escrito === true && r3.rev === 1);
    var n3 = F.escritos.length; await Historial.registrarReapertura({ informe_id: 9 }, 'Jordi', F.dep);
    ok('reintento de la reapertura: ningún PUT', F.escritos.length === n3);

    console.log('4.4 nuevo envío tras la reapertura = rev 2');
    var r4 = await Historial.registrarEnvio({ informe_id: 9 }, 'Pep Autor', Object.assign({}, F.dep, { ahora: function () { return '2026-10-30T09:00:00'; } }));
    ok('revision = 2 y tercera línea', r4.rev === 2 && F.fila.revision === 2 && F.fila.historial.split('\n')[2] === '30/10/2026 09:00 enviado por Pep Autor (rev 2)', J(F.fila));
    ok('enviado_por = el que envía esta vez', F.fila.enviado_por === 'Pep Autor');
  });

  await parte(async function () {
    console.log('4.5 informe anterior a la v5 (revision vacía, historial vacío, enviado con la v4) que se reabre y se envía');
    var F = fakes({ informe_id: 4, estado: 'enviado', revision: null, historial: '', enviado_at: '2026-10-28T18:20:00' });
    await Historial.registrarReapertura({ informe_id: 4 }, 'Jordi', F.dep);
    ok('reapertura = rev 0', F.fila.historial === '29/10/2026 14:05 reabierto por Jordi (rev 0)', J(F.fila.historial));
    await Historial.registrarEnvio({ informe_id: 4 }, 'Ana', F.dep);
    ok('envío = rev 1', F.fila.revision === 1 && /enviado por Ana \(rev 1\)$/.test(F.fila.historial), J(F.fila));
    var G = fakes({ informe_id: 5, revision: '3', historial: '' });
    await Historial.registrarEnvio({ informe_id: 5 }, 'Ana', G.dep);
    ok('revision guardada como texto "3" = rev 4', G.fila.revision === 4, J(G.fila.revision));
  });

  await parte(async function () {
    console.log('4.6 fallos: nada se escribe a medias y el error llega al formulario');
    var F = fakes({ informe_id: 9, revision: 1, historial: '' }, { leerFalla: true });
    var e = await rechaza(Historial.registrarEnvio({ informe_id: 9 }, 'Ana', F.dep));
    ok('la lectura falla = error, ningún PUT', e instanceof Error && F.escritos.length === 0 && F.llamadas.every(function (x) { return /^leer/.test(x); }), e && e.message);
    var G = fakes({ informe_id: 9, revision: 1, historial: '' }, { enviarFalla: true });
    var e2 = await rechaza(Historial.registrarEnvio({ informe_id: 9 }, 'Ana', G.dep));
    ok('el PUT falla = error, la fila no cambia', e2 instanceof Error && G.fila.revision === 1 && G.fila.historial === '', e2 && e2.message);
    var H = fakes(null);
    var e3 = await rechaza(Historial.registrarEnvio({ informe_id: 9 }, 'Ana', H.dep));
    ok('la cabecera no aparece al leerla = error, ningún PUT', e3 instanceof Error && /no aparece/.test(e3.message) && H.escritos.length === 0, e3 && e3.message);
    var K = fakes({ informe_id: 9 });
    var e4 = await rechaza(Historial.registrarEnvio({ villaid: 12 }, 'Ana', K.dep));
    ok('informe sin informe_id = error, ninguna llamada', e4 instanceof Error && K.llamadas.length === 0, e4 && e4.message);
    var e5 = await rechaza(Historial.registrarReapertura(null, 'Ana', K.dep));
    ok('reapertura sin informe = error, ninguna llamada', e5 instanceof Error && K.llamadas.length === 0);
    var e6 = await rechaza(Historial.registrarEnvio({ informe_id: 9 }, 'Ana', { leer: K.leer }));
    ok('faltan funciones del formulario = error claro', e6 instanceof Error && /informeRequest|enviar/.test(e6.message), e6 && e6.message);
    var M = fakes({ informe_id: 9, revision: 0, historial: '' });
    await Historial.registrarEnvio({ informe_id: 9 }, 'Ana', { informeRequest: M.informeRequest, leer: M.leer, enviar: M.enviar });
    ok('sin ahora: usa la hora local con el formato de Caspio', /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/.test(M.fila.enviado_at) && /^\d\d\/\d\d\/\d{4} \d\d:\d\d enviado por Ana \(rev 1\)$/.test(M.fila.historial), J(M.fila));
  });

  await parte(async function () {
    console.log('4.7 con las funciones REALES del formulario (informeRequest, leer, enviar, ahoraCaspio) y el Worker falso de arnes-informe.js');
    var A = require('./arnes-informe.js');
    var db = {
      TaUsers: [{ UserID: 'U1', Email: 'admin@3villas.com', Name: 'Ana Admin', Keyholder_por_defecto: '' }],
      TaVillas: [{ villaid: 12, Name: 'Villa Cielos Azules', KeyHolder_person: '' }], TaContacts: [],
      TaInformeTemporada: [{ informe_id: 9, villaid: 12, temporada: 2026, UserID: 'U1', estado: 'enviado', estado_general: 'Bueno', fecha_revision: '2026-10-26T00:00:00', revision: null, historial: null }],
      TaInformeTemporadaLineas: []
    };
    var H = A.cargar({ archivo: 'informe-temporada.html', db: db, rol: 'admin', search: '?villaid=12&temporada=2026' });
    var dep = { informeRequest: H.ev('informeRequest'), leer: H.ev('leer'), enviar: H.ev('enviar'), ahora: H.ev('ahoraCaspio') };
    var i0 = H.S.marca();
    var r = await Historial.registrarEnvio({ informe_id: 9 }, 'Ana Admin', dep);
    var c = H.S.desde(i0);
    c.forEach(function (x) { console.log('          ' + H.S.texto(x)); });
    ok('GET de la cabecera y un PUT a TaInformeTemporada con where informe_id=9', c.length === 2 && c[0].action === 'data' && c[0].where === 'informe_id=9' && c[1].relay === 'PUT' && c[1].where === 'informe_id=9', J(c.map(H.S.texto)));
    var f = db.TaInformeTemporada[0];
    ok('la fila de Caspio queda con revision 1, enviado_por, enviado_at y la línea', f.revision === 1 && f.enviado_por === 'Ana Admin' && /^\d{4}-\d\d-\d\dT/.test(f.enviado_at) && /^\d\d\/\d\d\/\d{4} \d\d:\d\d enviado por Ana Admin \(rev 1\)$/.test(f.historial), J(f));
    ok('updated_at lo pone informeRequest del formulario', /^\d{4}-\d\d-\d\dT/.test(f.updated_at || ''));
    var i1 = H.S.marca();
    await Historial.registrarEnvio({ informe_id: 9 }, 'Ana Admin', dep);
    ok('reintento con el Worker falso: solo la lectura', H.S.desde(i1).length === 1 && H.S.desde(i1)[0].action === 'data');
    ok('devuelve rev 1', r.rev === 1 && r.escrito === true);
  });
  await parte(async function () {
    console.log('4.8 integración (decisión 1 de bro): dep.cambios va en el MISMO PUT que el historial; un solo PUT por Enviar o Reabrir');
    var F = fakes({ informe_id: 9, estado: 'borrador', revision: null, historial: null, enviado_at: null });
    var dEnv = Object.assign({}, F.dep, { cambios: { estado: 'enviado', enviado_at: '2026-10-29T14:05:00' } });
    var r = await Historial.registrarEnvio({ informe_id: 9 }, 'Ana Admin', dEnv);
    ok('Enviar: una lectura y UN solo PUT', F.llamadas.length === 2 && /^leer /.test(F.llamadas[0]) && /^PUT /.test(F.llamadas[1]), J(F.llamadas));
    var b = F.escritos[0] || {};
    ok('el PUT lleva estado enviado + enviado_at + enviado_por + revision 1 + la línea', b.estado === 'enviado' && b.enviado_at === '2026-10-29T14:05:09' && b.enviado_por === 'Ana Admin' && b.revision === 1 && /enviado por Ana Admin \(rev 1\)$/.test(b.historial), J(b));
    ok('devuelve los cambios con el estado (el formulario los copia en INFORME)', r.escrito === true && r.cambios.estado === 'enviado' && r.cambios.revision === 1, J(r));
    var n = F.llamadas.length, r2 = await Historial.registrarEnvio({ informe_id: 9 }, 'Ana Admin', dEnv);
    ok('reintento con la cabecera ya enviada: solo la lectura', F.llamadas.length === n + 1 && r2.escrito === false && r2.cambios.estado === 'enviado', J(F.llamadas.slice(n)));
    var dReab = Object.assign({}, F.dep, { ahora: function () { return '2026-10-29T16:00:00'; }, cambios: { estado: 'borrador', enviado_at: null } });
    n = F.escritos.length;
    var r3 = await Historial.registrarReapertura({ informe_id: 9 }, 'Jordi', dReab);
    var b3 = F.escritos[n] || {};
    ok('Reabrir: UN PUT con estado borrador, enviado_at null y la línea de reapertura; revision sigue en 1', F.escritos.length === n + 1 && b3.estado === 'borrador' && b3.enviado_at === null && /reabierto por Jordi \(rev 1\)$/.test(b3.historial) && !('revision' in b3) && F.fila.revision === 1, J(b3));
    ok('Reabrir devuelve estado borrador', r3.escrito === true && r3.cambios.estado === 'borrador');
    n = F.escritos.length; await Historial.registrarReapertura({ informe_id: 9 }, 'Jordi', dReab);
    ok('reintento de Reabrir con la cabecera ya en borrador: ningún PUT', F.escritos.length === n);
    var G = fakes({ informe_id: 7, estado: 'borrador', revision: 1, historial: '29/10/2026 14:05 enviado por Ana (rev 1)' });
    await Historial.registrarEnvio({ informe_id: 7 }, 'Ana', Object.assign({}, G.dep, { cambios: { estado: 'enviado' } }));
    ok('cabecera en borrador con la última línea de envío (cambio fuera del formulario): no es un reintento, rev 2 con su estado', G.escritos.length === 1 && G.fila.estado === 'enviado' && G.fila.revision === 2, J(G.fila));
    var K = fakes({ informe_id: 8, estado: 'enviado', revision: 1, historial: '29/10/2026 14:05 enviado por Ana (rev 1)\n29/10/2026 15:00 reabierto por Jordi (rev 1)' });
    await Historial.registrarReapertura({ informe_id: 8 }, 'Jordi', Object.assign({}, K.dep, { cambios: { estado: 'borrador', enviado_at: null } }));
    ok('reapertura ya apuntada pero cabecera enviada: un PUT con el estado y el historial sin línea repetida', K.escritos.length === 1 && K.fila.estado === 'borrador' && K.fila.historial.split('\n').length === 2, J(K.fila));
    var M = fakes({ informe_id: 9, estado: 'borrador', revision: null, historial: null }, { enviarFalla: true });
    var e = await rechaza(Historial.registrarEnvio({ informe_id: 9 }, 'Ana', Object.assign({}, M.dep, { cambios: { estado: 'enviado', enviado_at: 'x' } })));
    ok('el único PUT falla: error y la cabecera sigue en borrador, sin revisión ni historial', e instanceof Error && M.fila.estado === 'borrador' && M.fila.revision === null && M.fila.historial === null, J(M.fila));
  });
}

pruebasCableado().catch(function (e) { ok('las pruebas de cableado terminan', false, e && e.stack); }).then(fin);
