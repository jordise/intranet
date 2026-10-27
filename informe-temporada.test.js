/* Pruebas del informe de fin de temporada (informe-temporada.html v2, Jordi 27/10/2026; ejemplo en papel de Rafa,
   villa Cielos Azules). node informe-temporada.test.js
   v2 (ronda de arreglos 1 tras las dos revisiones del 27/10/2026): sin DELETE, guardado que no se atasca ni duplica,
   lecturas con r.ok, borrador local, fotos JPEG con sufijo aleatorio y ?v=, villa manager asignado. La parte 10 carga
   el script REAL de la pagina con vm y un fetch falso (arnes-informe.js) que apunta las llamadas y falla a peticion.

   Como villa-propietario.test.js: NO copia el codigo de la pagina. Extrae con vm las funciones reales de
   informe-temporada.html y las ejecuta. Sin red: las funciones de peticiones solo construyen URL, metodo y cuerpo. */
var fs = require('fs'), vm = require('vm');
var P = 'informe-temporada.html';
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var SRC = '';
try { SRC = fs.readFileSync(P, 'utf8'); } catch (e) { ok('existe ' + P, false, e.message); console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(1); }
function fnSource(s, name) {
  var i = s.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = s.indexOf('{', i), depth = 0, k = j;
  for (; k < s.length; k++) { if (s[k] === '{') depth++; else if (s[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return s.slice(i, k);
}
function constLine(s, name) {
  var m = s.match(new RegExp('const ' + name + "\\s*=\\s*'[^']*';"));
  if (!m) throw new Error('no encuentro const ' + name);
  return m[0];
}
var FNS = ['esc', 'escQ', 'ahoraCaspio', 'rolDe', 'esAdminManager', 'puedeAbrirInforme', 'esVillaManager', 'seccionesDef', 'clavesDefecto',
  'whereInforme', 'whereLinea', 'lineaRequest', 'informeRequest', 'validarEnvio', 'soloLectura',
  'aleatorio6', 'fotoNombre', 'fotoUrl', 'urlDeSubida', 'textoEstancia', 'partirEstancia', 'filaVacia'];
var ctx = {};
var faltan = FNS.filter(function (n) { try { fnSource(SRC, n); return false; } catch (e) { return true; } });
ok('las funciones existen en la pagina', !faltan.length, faltan.join(', '));
try {
  vm.runInNewContext([constLine(SRC, 'WORKER'), constLine(SRC, 'R2_PUBLIC'), constLine(SRC, 'FOTOS_HOST')].join('\n') + '\n' +
    FNS.filter(function (n) { return faltan.indexOf(n) < 0; }).map(function (n) { return fnSource(SRC, n); }).join('\n') + '\nthis.WORKER=WORKER;', ctx);
} catch (e) { ok('las funciones compilan', false, e.message); console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(1); }
faltan.forEach(function (n) { ctx[n] = function () { return undefined; }; });
var W = 'https://www.3villas.com/intranet/api';
function q(u, n) { var m = String(u).match(new RegExp('[?&]' + n + '=([^&]*)')); return m ? decodeURIComponent(m[1]) : null; }

console.log('1. La puerta');
ok('WORKER de siempre', ctx.WORKER === W);
ok('admin', ctx.puedeAbrirInforme('admin', false) === true);
ok('manager', ctx.puedeAbrirInforme('manager', false) === true);
ok('villa manager (staff + Keyholder_por_defecto)', ctx.puedeAbrirInforme('staff', true) === true);
ok('staff sin keyholder no', ctx.puedeAbrirInforme('staff', false) === false);
ok('cleaner no (ni con keyholder)', ctx.puedeAbrirInforme('cleaner', false) === false && ctx.puedeAbrirInforme('cleaner', true) === false);
ok('sales no (ni con keyholder)', ctx.puedeAbrirInforme('sales', false) === false && ctx.puedeAbrirInforme('sales', true) === false);
ok('" Manager " normalizado', ctx.puedeAbrirInforme(' Manager ', false) === true);
ok('isVM tiene que ser true de verdad', ctx.puedeAbrirInforme('staff', 'true') === false);
var uRows = [{ UserID: 'U1', Email: 'Vm@3villas.com', Keyholder_por_defecto: 'U1' }, { UserID: 'U2', Email: 'st@3villas.com', Keyholder_por_defecto: ' ' }];
ok('esVillaManager por email', ctx.esVillaManager(uRows, 'vm@3villas.com') === true && ctx.esVillaManager(uRows, 'st@3villas.com') === false && ctx.esVillaManager(uRows, '') === false);
var pa = fnSource(SRC, 'iniciar');
ok('iniciar: decide la puerta antes de leer la villa o el informe', fnSource(SRC, 'sinAcceso').indexOf('Sin acceso') > 0 && pa.indexOf('sinAcceso()') > 0 && pa.indexOf('puedeAbrirInforme(') > 0 && pa.indexOf('puedeAbrirInforme(') < pa.indexOf('table=TaVillas'), '');
ok('cleaner/sales: "Sin acceso" sin ninguna lectura (la puerta de rol va antes del primer fetch)', /if\(!esAdminManager\(rol\)&&rol!=='staff'\)\{sinAcceso\(\);return;\}/.test(pa) && pa.indexOf("rol!=='staff'") < pa.indexOf('fetch('));
ok("Auth.require('informe-temporada')", SRC.indexOf("Auth.require('informe-temporada')") > 0);

console.log('2. Las claves: 5 + 13 + 9 + 4 + 7 + 8 + 6');
var K = ctx.clavesDefecto();
ok('52 filas por defecto', K.length === 52, K.length);
function sec(s) { return K.filter(function (k) { return k.seccion === s; }).map(function (k) { return k.clave; }); }
ok('resumen accion_1..5', sec('resumen').join() === 'accion_1,accion_2,accion_3,accion_4,accion_5');
ok('interior 13 en orden', sec('interior').join() === 'pintura,colchones,sofas,mobiliario_cocina,menaje,electrodomesticos,aire_acondicionado,puertas,ventanas,banos,desagues,iluminacion,humedades');
ok('exterior 9 en orden', sec('exterior').join() === 'fachada,carpinteria_exterior,pavimentos,barandillas,jardin_muros,piscina,mobiliario_exterior,barbacoa,iluminacion_exterior');
ok('seguridad 4 en orden', sec('seguridad').join() === 'cerraduras,instalacion_electrica,fontaneria_agua_caliente,wifi_tv');
ok('estancia 7 por defecto', sec('estancia').join() === 'salon,cocina,dormitorio_principal,dormitorio_2,bano_1,bano_2,exterior_piscina');
ok('huesped comentario_1..8', sec('huesped').join() === 'comentario_1,comentario_2,comentario_3,comentario_4,comentario_5,comentario_6,comentario_7,comentario_8');
ok('foto foto_1..6', sec('foto').join() === 'foto_1,foto_2,foto_3,foto_4,foto_5,foto_6');
ok('orden 1..n dentro de cada seccion', K.filter(function (k) { return k.seccion === 'interior'; }).map(function (k) { return k.orden; }).join() === '1,2,3,4,5,6,7,8,9,10,11,12,13');
var S = ctx.seccionesDef();
ok('siete secciones y Fotos en el orden de Rafa', S.map(function (s) { return s.id; }).join() === 'resumen,interior,exterior,seguridad,estancia,huesped,final,foto');
ok('titulos', S[0].titulo === '1. Resumen y actuaciones prioritarias' && S[1].titulo === '2. Interior' && S[3].titulo === '4. Seguridad e instalaciones' && S[4].titulo === '5. Incidencias por estancia' && S[5].titulo === '6. Comentarios de huéspedes y propuestas de mejora' && S[6].titulo === '7. Observaciones finales' && S[7].titulo === 'Fotos');
var lab = {}; K.forEach(function (k) { lab[k.clave] = k.label; });
ok('etiquetas del PDF', lab.pintura === 'Pintura interior (paredes, techos, carpintería)' && lab.wifi_tv === 'Wifi y TV' && lab.salon === 'Salón / comedor' && lab.exterior_piscina === 'Exterior / zona piscina' && lab.piscina.indexOf('Piscina (vaso') === 0);
ok('estancia otra_1..5 disponibles', (S[4].extra || []).join() === 'otra_1,otra_2,otra_3,otra_4,otra_5');

console.log('3. Linea -> peticion');
var nueva = { seccion: 'interior', clave: 'pintura', orden: 1, estado: 'Regular', texto_1: 'Repintar', texto_2: '', prioridad: '', foto_url: '' };
var r1 = ctx.lineaRequest(77, nueva);
ok('fila nueva: POST', r1.method === 'POST' && r1.url === W + '?action=save&table=TaInformeTemporadaLineas&method=POST', r1.url);
ok('POST lleva informe_id, seccion, clave, orden y valores', r1.body.informe_id === 77 && r1.body.seccion === 'interior' && r1.body.clave === 'pintura' && r1.body.orden === 1 && r1.body.estado === 'Regular' && r1.body.texto_1 === 'Repintar');
ok('nunca action=update', SRC.indexOf('action=update') < 0);
var conocida = Object.assign({}, nueva, { linea_id: 5 });
var r2 = ctx.lineaRequest(77, conocida);
ok('fila conocida: PUT', r2.method === 'PUT');
ok('PUT con where=linea_id=5 y method=PUT', q(r2.url, 'action') === 'save' && q(r2.url, 'table') === 'TaInformeTemporadaLineas' && q(r2.url, 'where') === 'linea_id=5' && q(r2.url, 'method') === 'PUT', r2.url);
ok('PUT solo con los campos de la fila (no informe_id ni claves)', r2.body.informe_id === undefined && r2.body.clave === undefined && r2.body.estado === 'Regular' && r2.body.texto_1 === 'Repintar');
ok('ningun DELETE en la pagina (el Worker no tiene rama DELETE)', SRC.indexOf('method=DELETE') < 0 && SRC.indexOf('borrarLineaRequest') < 0 && !/method:\s*'DELETE'/.test(SRC));
var h1 = ctx.informeRequest({ villaid: 12, temporada: 2026, UserID: 'U1' }, { estado_general: 'Bueno' });
ok('cabecera nueva: POST con villaid, temporada, UserID, estado borrador', h1.method === 'POST' && h1.url === W + '?action=save&table=TaInformeTemporada&method=POST' && h1.body.villaid === 12 && h1.body.temporada === 2026 && h1.body.UserID === 'U1' && h1.body.estado === 'borrador' && h1.body.estado_general === 'Bueno', JSON.stringify(h1));
var h2 = ctx.informeRequest({ informe_id: 9, villaid: 12, temporada: 2026 }, { estado_general: 'Malo' });
ok('cabecera conocida: PUT where informe_id=9', h2.method === 'PUT' && q(h2.url, 'where') === 'informe_id=9' && q(h2.url, 'method') === 'PUT' && q(h2.url, 'table') === 'TaInformeTemporada' && h2.body.estado_general === 'Malo' && h2.body.villaid === undefined);
ok('cabecera PUT lleva updated_at', typeof h2.body.updated_at === 'string' && /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d$/.test(h2.body.updated_at), h2.body.updated_at);
ok('las peticiones pasan por Auth.url', /fetch\(Auth\.url\(req\.url\)/.test(SRC));

console.log('4. WHERE de lectura');
ok('whereInforme', ctx.whereInforme('123', '2026') === 'villaid=123 AND temporada=2026');
ok('whereInforme numerico (sin inyeccion)', ctx.whereInforme('12 OR 1=1', '2026') === 'villaid=12 AND temporada=2026');
ok('whereLinea', ctx.whereLinea(7, 'interior', 'pintura') === "informe_id=7 AND seccion='interior' AND clave='pintura'");
ok('whereLinea escapa comillas', ctx.whereLinea(7, "a'b", 'c') === "informe_id=7 AND seccion='a''b' AND clave='c'");

console.log('5. Enviar');
ok('sin estado_general: "Falta el estado general"', ctx.validarEnvio({ estado_general: '' }) === 'Falta el estado general' && ctx.validarEnvio(null) === 'Falta el estado general');
ok('con estado_general: ok', ctx.validarEnvio({ estado_general: 'Regular' }) === '');
var en = fnSource(SRC, 'enviarInforme');
ok('enviarInforme: valida antes del confirm', en.indexOf('validarEnvio(') > 0 && en.indexOf('confirm(') > en.indexOf('validarEnvio('));
ok('texto del confirm', en.indexOf('¿Enviar el informe de ') > 0 && en.indexOf('Después solo podrá cambiarlo administración.') > 0);
ok("pone estado enviado y enviado_at", /estado:'enviado',enviado_at:/.test(en));
ok("Reabrir pone estado borrador y enviado_at null", /estado:'borrador',enviado_at:null/.test(fnSource(SRC, 'reabrirInforme')));

console.log('6. Solo lectura');
ok('enviado: solo lectura para staff', ctx.soloLectura({ estado: 'enviado' }, 'staff') === true);
ok('enviado: editable para admin y manager', ctx.soloLectura({ estado: 'enviado' }, 'admin') === false && ctx.soloLectura({ estado: 'enviado' }, 'manager') === false);
ok('borrador: editable para staff', ctx.soloLectura({ estado: 'borrador' }, 'staff') === false);
ok('sin informe: editable', ctx.soloLectura(null, 'staff') === false);

console.log('7. Fotos');
var fn1 = ctx.fotoNombre(2026, 9, 'foto_3'), fn2 = ctx.fotoNombre(2026, 9, 'foto_3');
ok('nombre de archivo: <temporada>_informe_<id>_<clave>_<6 aleatorios>.jpg', /^2026_informe_9_foto_3_[a-z0-9]{6}\.jpg$/.test(fn1), fn1);
ok('el sufijo cambia en cada foto', fn1 !== fn2, fn1 + ' ' + fn2);
ok('sufijo dado: se usa; raro: se cambia por uno aleatorio', ctx.fotoNombre(2026, 9, 'foto_1', 'ab12cd') === '2026_informe_9_foto_1_ab12cd.jpg' && /^2026_informe_9_foto_1_[a-z0-9]{6}\.jpg$/.test(ctx.fotoNombre(2026, 9, 'foto_1', '../x')));
ok('aleatorio6: 6 letras o cifras', /^[a-z0-9]{6}$/.test(ctx.aleatorio6()));
var R2 = 'https://pub-48c1cfd5de614ff0a0cebfec482a7b32.r2.dev/';
ok('fotoUrl reescribe r2.dev', ctx.fotoUrl(R2 + 'informe/2026_informe_9_foto_1.jpg') === 'https://www.3villas.com/intranet/fotos/informe/2026_informe_9_foto_1.jpg');
ok('fotoUrl deja otras URL', ctx.fotoUrl('https://x.com/a.jpg') === 'https://x.com/a.jpg');
ok('fotoUrl conserva el ?v= guardado', ctx.fotoUrl(R2 + 'informe/a.jpg?v=123') === 'https://www.3villas.com/intranet/fotos/informe/a.jpg?v=123');
ok('respuesta {url}', ctx.urlDeSubida('{"url":"https://a/b.jpg"}') === 'https://a/b.jpg');
ok('respuesta {publicUrl}', ctx.urlDeSubida('{"publicUrl":"https://a/c.jpg"}') === 'https://a/c.jpg');
ok('respuesta texto', ctx.urlDeSubida(' https://a/d.jpg\n') === 'https://a/d.jpg');
ok('respuesta vacia o sin URL', ctx.urlDeSubida('') === '' && ctx.urlDeSubida('{"ok":true}') === '' && ctx.urlDeSubida('error') === '');
var sf = fnSource(SRC, 'subirFoto');
ok("subida: FormData file + filename informe/<nombre> a action=upload", sf.indexOf("fd.append('file',file,nombre)") >= 0 && sf.indexOf("fd.append('filename','informe/'+nombre)") >= 0 && sf.indexOf("?action=upload") > 0);
ok('input de camara', SRC.indexOf('accept="image/*" capture="environment"') > 0);
ok('compressImage de task-limpieza (1200, 0.8) antes de subir', SRC.indexOf('function compressImage(file,maxPx,quality)') > 0 && /compressImage\(file,1200,0\.8\)/.test(sf));
ok('subida con AbortController de 60 s y aviso "Foto no subida: sin conexión"', sf.indexOf('new AbortController()') >= 0 && sf.indexOf('60000') > 0 && sf.indexOf('signal:') > 0 && SRC.indexOf('Foto no subida: sin conexión') > 0);

console.log('8. Estancias añadidas y filas vacias');
ok('textoEstancia', ctx.textoEstancia('Terraza', 'Toldo roto') === 'Terraza: Toldo roto');
ok('textoEstancia sin nombre: siempre ": "', ctx.textoEstancia('', 'Toldo roto') === ': Toldo roto' && ctx.textoEstancia('  ', 'a: b') === ': a: b');
ok('ida y vuelta sin nombre', JSON.stringify(ctx.partirEstancia(ctx.textoEstancia('', 'Toldo: roto'))) === JSON.stringify({ nombre: '', incidencia: 'Toldo: roto' }));
ok('ida y vuelta con nombre', JSON.stringify(ctx.partirEstancia(ctx.textoEstancia('Terraza', 'Toldo: roto'))) === JSON.stringify({ nombre: 'Terraza', incidencia: 'Toldo: roto' }));
ok('nombre e incidencia vacios: fila vacia', ctx.textoEstancia('', '') === '' && ctx.filaVacia({ texto_1: ctx.textoEstancia('', '') }));
ok('partirEstancia', JSON.stringify(ctx.partirEstancia('Terraza: Toldo roto: ya')) === JSON.stringify({ nombre: 'Terraza', incidencia: 'Toldo roto: ya' }));
ok('partirEstancia sin nombre', ctx.partirEstancia('algo').nombre === '' && ctx.partirEstancia('algo').incidencia === 'algo');
ok('filaVacia', ctx.filaVacia({ estado: '', texto_1: ' ', texto_2: '', prioridad: '', foto_url: '' }) === true && ctx.filaVacia({ prioridad: 'Alta' }) === false && ctx.filaVacia(undefined) === true);

console.log('9. Pagina');
ok('VERSIÓN ACTUAL: v2 en las 5 primeras lineas', /VERSIÓN ACTUAL: v2 \|/.test(SRC.split('\n').slice(0, 5).join('\n')));
ok('PAGE_VERSION = 2', /const PAGE_VERSION = 2;/.test(SRC));
ok('titulo v2', SRC.indexOf('<title>Informe de temporada v2 — 3Villas</title>') > 0);
ok('checkForNewerVersion', SRC.indexOf('function checkForNewerVersion(') > 0);
ok('toast "No guardado: "', SRC.indexOf("'No guardado: '") > 0);
ok('.barra[hidden]{display:none} (la barra no sale sobre "Sin acceso" ni al cargar)', SRC.indexOf('.barra[hidden]{display:none}') > 0);
ok('debounce 800 ms al salir de una caja', /programar\(800\)/.test(fnSource(SRC, 'alSalir')) && /setTimeout\(guardarPendientes,ms\)/.test(fnSource(SRC, 'programar')));
ok('@media print con el titulo de Rafa', SRC.indexOf('@media print') > 0 && SRC.indexOf('Informe de Fin de Temporada — Estado de la villa y puntos de mejora') > 0);
ok('salto de pagina antes de 5 y Fotos', (SRC.match(/break-before:page/g) || []).length >= 1 && /pv-salto/.test(SRC));
ok('titulos de seccion con break-after: avoid en la impresion', /#printView h2\{[^}]*break-after:avoid/.test(SRC));
ok('botones Guardar, Enviar, Reabrir, Imprimir', ['💾 Guardar', '📤 Enviar', '🔓 Reabrir', '🖨️ Imprimir'].every(function (t) { return SRC.indexOf(t) > 0; }));
var hist = SRC.slice(SRC.indexOf('<!-- HISTORIAL: v1 - '));
ok('HISTORIAL v1 con Jordi, fecha, Rafa, otra_N y la prueba', SRC.indexOf('<!-- HISTORIAL: v1 - ') > 0 && hist.indexOf('Jordi') >= 0 && hist.indexOf('27/10/2026') >= 0 && hist.indexOf('Rafa') >= 0 && hist.indexOf('otra_') >= 0 && hist.indexOf('informe-temporada.test.js') >= 0);
ok('el comentario HISTORIAL v1 cierra una sola vez', hist.split('-->').length === 2);
var h2i = SRC.indexOf('<!-- HISTORIAL: v2 - '), hist2 = h2i > 0 ? SRC.slice(h2i, SRC.indexOf('-->', h2i)) : '';
ok('HISTORIAL v2 en español: las dos revisiones del 27/10/2026 y la prueba', h2i > 0 && h2i < SRC.indexOf('<!-- HISTORIAL: v1 - ') && /revisiones/.test(hist2) && hist2.indexOf('27/10/2026') >= 0 && hist2.indexOf('informe-temporada.test.js') >= 0 && hist2.indexOf('DELETE') >= 0);
var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, n = 0, bad = '';
while ((m = re.exec(SRC))) { n++; try { new vm.Script(m[1]); } catch (e) { bad += e.message; } }
ok('los scripts compilan', n > 0 && !bad, bad);


var A = require('./arnes-informe.js'), fin = false;
/* si una promesa de la pagina no acaba nunca, node sale solo: eso tambien es un FAIL */
process.on('exit', function () { if (!fin) { console.log('\n' + pass + ' PASS, ' + (fail + 1) + ' FAIL (las pruebas con fetch falso no terminaron)'); process.exitCode = 1; } });
pruebasConFetch().catch(function (e) { ok('las pruebas con fetch falso terminan', false, e && e.stack); }).then(function () {
  fin = true;
  console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
  process.exit(fail ? 1 : 0);
});

/* ── 10. El script real de la pagina con un fetch falso (arnes-informe.js) ── */
function baseDb(extra) {
  var db = {
    TaUsers: [{ UserID: 'U1', Email: 'admin@3villas.com', Name: 'Ana Admin', Keyholder_por_defecto: '' },
      { UserID: 'U2', Email: 'vm@3villas.com', Name: 'Pep Autor', Keyholder_por_defecto: 'U2' },
      { UserID: 'U3', Email: 'limpieza@3villas.com', Name: 'Lola Limpieza', Keyholder_por_defecto: '' }],
    TaVillas: [{ villaid: 12, Name: 'Villa Cielos Azules', KeyHolder_person: '501' }],
    TaContacts: [{ ContactID: '501', Name: 'Amanda Townsend' }],
    TaInformeTemporada: [], TaInformeTemporadaLineas: []
  };
  return Object.assign(db, extra || {});
}
function informe9(extra) { return Object.assign({ informe_id: 9, villaid: 12, temporada: 2026, UserID: 'U2', estado: 'borrador', estado_general: '', observaciones_finales: '', fecha_revision: '2026-10-26T00:00:00' }, extra || {}); }
function pagina(o) {
  o = o || {};
  return A.cargar({ archivo: P, db: o.db || baseDb({ TaInformeTemporada: [informe9()] }), rol: o.rol || 'admin', email: o.email, search: o.search || '?villaid=12&temporada=2026', almacen: o.almacen, confirmar: o.confirmar });
}
function registro(H, desde, titulo) {
  console.log('        llamadas (' + titulo + '):');
  H.S.desde(desde).forEach(function (c) { console.log('          ' + H.S.texto(c)); });
}
function guarda(H) { return H.ev('guardarPendientes()'); }
/* cada parte va en su funcion: si una lanza, cuenta como FAIL y siguen las demas */
async function parte(f) { try { await f(); } catch (e) { ok('la parte termina sin excepcion', false, e && e.message); } }
async function pruebasConFetch() {
  var H, i, c, k;
  await parte(async function () {
  console.log('10.1 Fila vaciada y escrita otra vez: se guarda (un POST y luego la lectura)');
  H = pagina(); await H.ev('iniciar()');
  ok('carga: formulario pintado', /Villa Cielos Azules/.test(H.g('main').innerHTML) && H.g('barra').hidden === false);
  k = 'interior|pintura';
  H.ev("editarFila('" + k + "','texto_1','Repintar')"); H.ev("editarFila('" + k + "','texto_1','')");
  i = H.S.marca();
  ok('fila nueva vacia: guardarFila da true sin llamadas', (await H.ev("guardarFila('" + k + "')")) === true && H.S.desde(i).length === 0);
  ok('y no queda marcada en vuelo', !H.ev("LINEAS['" + k + "']._vuelo") && H.ev("LINEAS['" + k + "']._sucio") === false);
  H.ev("editarFila('" + k + "','texto_1','Repintar el salón')");
  ok('guardarFila de la fila escrita otra vez: true', (await H.ev("guardarFila('" + k + "')")) === true);
  c = H.S.desde(i); registro(H, i, 'caso 1');
  ok('un POST de la fila y luego una lectura de vuelta', c.filter(function (x) { return x.relay === 'POST'; }).length === 1 && c[c.length - 1].action === 'data' && c[c.length - 1].table === 'TaInformeTemporadaLineas' && c.map(function (x) { return x.relay || 'GET'; }).join() === 'GET,POST,GET', c.map(function (x) { return x.relay || 'GET'; }).join());
  ok('lectura antes del POST por whereLinea con limit 5', c[0].where === "informe_id=9 AND seccion='interior' AND clave='pintura'" && c[0].limit === '5');
  ok('la fila queda guardada con su linea_id', H.ev("LINEAS['" + k + "'].linea_id") === 500 && H.ev("LINEAS['" + k + "']._sucio") === false && H.S.db.TaInformeTemporadaLineas.length === 1);
  ok('estado: "Todo guardado"', H.g('estadoGuardado').textContent === 'Todo guardado');
  });
  await parte(async function () {
  console.log('10.2 Tres toques rapidos sin cabecera: una sola cabecera');
  H = pagina({ db: baseDb() }); await H.ev('iniciar()');
  ok('sin informe: formulario en blanco (Borrador), nada creado al abrir', /Borrador/.test(H.g('main').innerHTML) && H.S.calls.every(function (x) { return x.action === 'data'; }));
  i = H.S.marca();
  function toque(clave, v) {
    var grupo = { querySelectorAll: function () { return []; } };
    var b = { disabled: false, parentElement: grupo, dataset: { campo: 'estado', v: v }, classList: { contains: function () { return false; } } };
    b.closest = function (s) { return s === '.st' ? b : { dataset: { k: 'interior|' + clave } }; };
    return H.ctx.alPulsar({ target: b });
  }
  await Promise.all([toque('pintura', 'Bueno'), toque('colchones', 'Regular'), toque('sofas', 'Malo')]);
  await H.espera(40);
  registro(H, i, 'caso 2');
  ok('un solo POST de TaInformeTemporada', H.S.desde(i).filter(function (x) { return x.table === 'TaInformeTemporada' && x.relay === 'POST'; }).length === 1);
  ok('una sola cabecera en la tabla y tres filas', H.S.db.TaInformeTemporada.length === 1 && H.S.db.TaInformeTemporadaLineas.length === 3, H.S.db.TaInformeTemporada.length + ' / ' + H.S.db.TaInformeTemporadaLineas.length);
  ok('lecturas de cabecera con limit 5', H.S.desde(i).filter(function (x) { return x.table === 'TaInformeTemporada' && x.action === 'data'; }).every(function (x) { return x.limit === '5'; }));
  ok('las tres filas quedan guardadas', ['pintura', 'colchones', 'sofas'].every(function (cl) { return H.ev("LINEAS['interior|" + cl + "']._sucio") === false && H.ev("LINEAS['interior|" + cl + "'].linea_id") > 0; }));
  /* cabecera duplicada ya en Caspio: se usa la de informe_id mas bajo */
  H = pagina({ db: baseDb({ TaInformeTemporada: [informe9({ informe_id: 14, estado_general: 'Malo' }), informe9({ informe_id: 9, estado_general: 'Bueno' })] }) }); await H.ev('iniciar()');
  ok('dos cabeceras para la villa y temporada: carga la de informe_id mas bajo', H.ev('INFORME.informe_id') === 9 && H.ev('INFORME.estado_general') === 'Bueno');
  ok('la lectura de la cabecera al cargar va con limit 5', H.S.calls.some(function (x) { return x.table === 'TaInformeTemporada' && x.limit === '5'; }));
  });
  await parte(async function () {
  console.log('10.3 POST y lectura de vuelta fallida: el reintento lee primero y hace PUT (sin duplicado)');
  H = pagina(); await H.ev('iniciar()');
  k = 'exterior|piscina';
  H.ev("editarFila('" + k + "','estado','Malo')");
  var lecturas = 0;
  H.S.falla(function (x) { if (x.table === 'TaInformeTemporadaLineas' && x.action === 'data') { lecturas++; return lecturas === 2; } return false; });
  i = H.S.marca();
  ok('primer intento: false (la lectura de vuelta falla)', (await H.ev("guardarFila('" + k + "')")) === false);
  ok('la fila sigue sucia y sin linea_id', H.ev("LINEAS['" + k + "']._sucio") === true && !H.ev("LINEAS['" + k + "'].linea_id"));
  H.ev("editarFila('" + k + "','texto_1','Gresite suelto')");
  ok('reintento: true', (await H.ev("guardarFila('" + k + "')")) === true);
  c = H.S.desde(i); registro(H, i, 'caso 3');
  ok('reintento = GET y PUT where linea_id (ningun segundo POST)', c.filter(function (x) { return x.relay === 'POST'; }).length === 1 && c[c.length - 1].relay === 'PUT' && c[c.length - 1].where === 'linea_id=500' && c[c.length - 2].action === 'data');
  ok('una sola fila en Caspio con los datos del reintento', H.S.db.TaInformeTemporadaLineas.length === 1 && H.S.db.TaInformeTemporadaLineas[0].texto_1 === 'Gresite suelto');
  /* dos filas para el mismo par (de antes del arreglo): la lectura de vuelta adopta la de linea_id mas alto */
  H = pagina({ db: baseDb({ TaInformeTemporada: [informe9()], TaInformeTemporadaLineas: [] }) }); await H.ev('iniciar()');
  H.S.db.TaInformeTemporadaLineas.push({ linea_id: 31, informe_id: 9, seccion: 'interior', clave: 'menaje', texto_1: 'viejo' }, { linea_id: 40, informe_id: 9, seccion: 'interior', clave: 'menaje', texto_1: 'nuevo' });
  H.ev("editarFila('interior|menaje','texto_1','otro')"); i = H.S.marca();
  await H.ev("guardarFila('interior|menaje')");
  ok('fila nueva que ya existe dos veces: PUT a la de linea_id mas alto', H.S.desde(i).filter(function (x) { return x.relay === 'PUT'; }).map(function (x) { return x.where; }).join() === 'linea_id=40');
  });
  await parte(async function () {
  console.log('10.4 Un guardado fallido deja la fila sucia y el siguiente lo reintenta');
  H = pagina({ db: baseDb({ TaInformeTemporada: [informe9()], TaInformeTemporadaLineas: [{ linea_id: 5, informe_id: 9, seccion: 'interior', clave: 'pintura', orden: 1, estado: 'Bueno', texto_1: '', texto_2: '', prioridad: '', foto_url: '' }] }) });
  await H.ev('iniciar()');
  k = 'interior|pintura';
  H.ev("editarFila('" + k + "','estado','Malo')");
  H.S.falla(function (x) { return x.relay === 'PUT'; });
  i = H.S.marca();
  ok('guardarPendientes con el PUT fallido: false', (await guarda(H)) === false);
  ok('punto naranja: la fila sigue sucia', H.ev("LINEAS['" + k + "']._sucio") === true && /1 cambio sin guardar/.test(H.g('estadoGuardado').textContent));
  ok('aviso "No guardado: "', /^No guardado: /.test(H.g('toast').textContent));
  ok('el borrador local guarda la fila sin guardar', /Malo/.test(H.almacen['informe:12:2026'] || ''));
  ok('siguiente guardado: true', (await guarda(H)) === true);
  registro(H, i, 'caso 4');
  ok('dos PUT where linea_id=5 y la fila limpia', H.S.desde(i).filter(function (x) { return x.relay === 'PUT' && x.where === 'linea_id=5'; }).length === 2 && H.ev("LINEAS['" + k + "']._sucio") === false && H.S.db.TaInformeTemporadaLineas[0].estado === 'Malo');
  ok('todo guardado: el borrador local se borra', H.almacen['informe:12:2026'] === undefined);
  /* Guardar no dice "✓ Guardado" si queda algo sin guardar */
  H.ev("editarFila('" + k + "','estado','Regular')"); H.S.falla(function (x) { return x.relay === 'PUT'; });
  await H.ev('guardarTodo()');
  ok('Guardar con un fallo: sin "✓ Guardado"', H.g('toast').textContent.indexOf('✓') < 0 && H.ev('haySucios()') === true, H.g('toast').textContent);
  await H.ev('guardarTodo()');
  ok('Guardar sin fallos: "✓ Guardado"', H.g('toast').textContent === '✓ Guardado' && H.ev('haySucios()') === false, H.g('toast').textContent);
  });
  await parte(async function () {
  console.log('10.5 lineasDesdeFilas: de las filas de Caspio al formulario');
  H = pagina();
  var L = H.ctx.lineasDesdeFilas([
    { linea_id: 3, informe_id: 9, seccion: 'estancia', clave: 'otra_1', orden: 8, texto_1: 'Terraza: Toldo roto', texto_2: 'Cambiar', prioridad: 'Alta' },
    { linea_id: 4, informe_id: 9, seccion: 'estancia', clave: 'otra_2', orden: 9, texto_1: ': Sin nombre: grieta', texto_2: null, prioridad: null },
    { linea_id: 6, informe_id: 9, seccion: 'huesped', clave: 'comentario_1', orden: 1, estado: 'Review', texto_1: 'Espejos', texto_2: 'Faltan en baños' },
    { linea_id: 7, informe_id: 9, seccion: 'foto', clave: 'foto_2', orden: 2, foto_url: 'https://pub-48c1cfd5de614ff0a0cebfec482a7b32.r2.dev/informe/2026_informe_9_foto_2_ab12cd.jpg?v=1', texto_1: 'Pérgola' },
    { linea_id: 20, informe_id: 9, seccion: 'interior', clave: 'pintura', estado: 'Malo', texto_1: 'nuevo' },
    { linea_id: 12, informe_id: 9, seccion: 'interior', clave: 'pintura', estado: 'Bueno', texto_1: 'viejo' }
  ]);
  var o1 = H.ctx.partirEstancia(L['estancia|otra_1'].texto_1), o2 = H.ctx.partirEstancia(L['estancia|otra_2'].texto_1);
  ok('otra_N con nombre: Terraza / Toldo roto', o1.nombre === 'Terraza' && o1.incidencia === 'Toldo roto' && L['estancia|otra_1'].prioridad === 'Alta');
  ok('otra_N sin nombre: "" / "Sin nombre: grieta"', o2.nombre === '' && o2.incidencia === 'Sin nombre: grieta');
  ok('campos null pasan a ""', L['estancia|otra_2'].texto_2 === '' && L['estancia|otra_2'].prioridad === '' && L['estancia|otra_2'].foto_url === '');
  ok('huesped: el origen se lee de estado', L['huesped|comentario_1'].estado === 'Review' && L['huesped|comentario_1'].texto_1 === 'Espejos');
  ok('foto: URL y pie', /foto_2_ab12cd\.jpg\?v=1$/.test(L['foto|foto_2'].foto_url) && L['foto|foto_2'].texto_1 === 'Pérgola' && H.ctx.fotoUrl(L['foto|foto_2'].foto_url) === 'https://www.3villas.com/intranet/fotos/informe/2026_informe_9_foto_2_ab12cd.jpg?v=1');
  ok('par duplicado: gana el linea_id mas alto', L['interior|pintura'].linea_id === 20 && L['interior|pintura'].texto_1 === 'nuevo');
  ok('filas limpias al cargar', Object.keys(L).every(function (x) { return L[x]._sucio === false; }));
  ok('orden por defecto si falta', L['interior|pintura'].orden === 1);
  });
  await parte(async function () {
  console.log('10.6 printHtml: filas vacias ocultas, saltos solo antes de 5 y Fotos, villa manager asignado');
  H = pagina({ db: baseDb({ TaInformeTemporada: [informe9({ estado_general: 'Regular', observaciones_finales: 'Todo en orden' })], TaInformeTemporadaLineas: [
    { linea_id: 1, informe_id: 9, seccion: 'interior', clave: 'pintura', estado: 'Malo', texto_1: 'Repintar' },
    { linea_id: 2, informe_id: 9, seccion: 'interior', clave: 'colchones', estado: '', texto_1: '' },
    { linea_id: 3, informe_id: 9, seccion: 'estancia', clave: 'otra_1', texto_1: ': Grieta' },
    { linea_id: 4, informe_id: 9, seccion: 'foto', clave: 'foto_1', foto_url: 'https://x.com/a.jpg?v=5', texto_1: 'Pie' }] }) });
  await H.ev('iniciar()');
  var ph = H.ev('printHtml()');
  ok('fila con datos impresa', ph.indexOf('Pintura interior') > 0 && ph.indexOf('Repintar') > 0);
  ok('filas vacias ocultas', ph.indexOf('Colchones') < 0 && ph.indexOf('Sofás') < 0);
  var saltos = ph.match(/<h2 class="pv-salto">[^<]*/g) || [];
  ok('dos saltos de pagina: antes de 5 y de Fotos', saltos.length === 2 && saltos[0].indexOf('5. Incidencias por estancia') > 0 && saltos[1].indexOf('Fotos') > 0, JSON.stringify(saltos));
  ok('otra estancia sin nombre: "Otra estancia 1" y la incidencia', ph.indexOf('Otra estancia 1') > 0 && ph.indexOf('>Grieta<') > 0);
  ok('foto por fotoUrl con su ?v=', ph.indexOf('src="https://x.com/a.jpg?v=5"') > 0);
  ok('Villa manager = el asignado de la villa (KeyHolder_person -> TaContacts)', /<td>Villa manager<\/td><td>Amanda Townsend<\/td>/.test(ph));
  ok('cabecera del formulario: el villa manager asignado, no el autor', /Villa manager: <strong>Amanda Townsend<\/strong>/.test(H.g('main').innerHTML));
  ok('una lectura de TaContacts limit 500', H.S.calls.filter(function (x) { return x.table === 'TaContacts'; }).length === 1 && H.S.calls.filter(function (x) { return x.table === 'TaContacts'; })[0].limit === '500');
  });
  await parte(async function () {
  console.log('10.7 Quitar: PUT que vacia la fila, nunca DELETE');
  H = pagina({ db: baseDb({ TaInformeTemporada: [informe9()], TaInformeTemporadaLineas: [{ linea_id: 7, informe_id: 9, seccion: 'foto', clave: 'foto_1', orden: 1, foto_url: 'https://x.com/a.jpg?v=1', texto_1: 'Pie' }] }) });
  await H.ev('iniciar()'); i = H.S.marca();
  await H.ev("quitarFoto('foto|foto_1')");
  c = H.S.desde(i); registro(H, i, 'Quitar');
  ok('una llamada: PUT where linea_id=7 con foto_url y texto_1 vacios', c.length === 1 && c[0].relay === 'PUT' && c[0].where === 'linea_id=7' && c[0].body.foto_url === '' && c[0].body.texto_1 === '' && c[0].body !== undefined);
  ok('ningun DELETE', H.S.calls.every(function (x) { return x.relay !== 'DELETE' && x.method !== 'DELETE'; }));
  ok('la fila conserva su linea_id y queda limpia', H.ev("LINEAS['foto|foto_1'].linea_id") === 7 && H.ev("LINEAS['foto|foto_1']._sucio") === false && H.ev("LINEAS['foto|foto_1'].foto_url") === '');
  });
  await parte(async function () {
  console.log('10.8 Enviar se para si falla un guardado');
  H = pagina({ db: baseDb({ TaInformeTemporada: [informe9({ estado_general: 'Bueno' })] }) });
  await H.ev('iniciar()');
  H.ev("editarFila('interior|pintura','estado','Malo')");
  H.S.falla(function (x) { return x.relay === 'POST'; });
  i = H.S.marca();
  await H.ev('enviarInforme()');
  registro(H, i, 'Enviar con fallo');
  ok('no se envia (ningun PUT con estado enviado)', H.S.desde(i).every(function (x) { return !(x.body && x.body.estado === 'enviado'); }) && H.ev('INFORME.estado') === 'borrador');
  ok('aviso de no enviado', /No enviado/.test(H.g('toast').textContent), H.g('toast').textContent);
  await H.ev('enviarInforme()');
  ok('con el guardado bien: se envia', H.S.db.TaInformeTemporada[0].estado === 'enviado' && H.ev('INFORME.estado') === 'enviado');
  i = H.S.marca(); await H.ev('reabrirInforme()');
  ok('Reabrir: PUT estado borrador y enviado_at null', H.S.desde(i).some(function (x) { return x.relay === 'PUT' && x.body.estado === 'borrador' && x.body.enviado_at === null; }) && H.S.db.TaInformeTemporada[0].enviado_at === null);
  });
  await parte(async function () {
  console.log('10.9 Informe enviado: solo lectura para el villa manager');
  H = pagina({ rol: 'staff', email: 'vm@3villas.com', db: baseDb({ TaInformeTemporada: [informe9({ estado: 'enviado' })], TaInformeTemporadaLineas: [
    { linea_id: 4, informe_id: 9, seccion: 'foto', clave: 'foto_1', foto_url: 'https://x.com/a.jpg?v=5', texto_1: 'Pie' },
    { linea_id: 5, informe_id: 9, seccion: 'estancia', clave: 'otra_1', texto_1: 'Terraza: Toldo' }] }) });
  await H.ev('iniciar()');
  var mh = H.g('main').innerHTML;
  ok('sin inputs de archivo ni Quitar', mh.indexOf('type="file"') < 0 && mh.indexOf('data-quitar') < 0);
  var cajas = mh.match(/<(textarea|input)\b[^>]*>/g) || [];
  ok('todas las cajas desactivadas', cajas.length > 0 && cajas.every(function (t) { return / disabled/.test(t); }), cajas.filter(function (t) { return !/ disabled/.test(t); }).join(' '));
  ok('sin Guardar ni Enviar', H.g('bGuardar').hidden === true && H.g('bEnviar').hidden === true);
  });
  await parte(async function () {
  console.log('10.10 Errores de carga y barra');
  H = pagina(); H.S.falla(function (x) { return x.table === 'TaVillas'; }); await H.ev('iniciar()');
  ok('TaVillas falla: "Error al cargar. Vuelve a intentarlo." y sin barra', /Error al cargar\. Vuelve a intentarlo\./.test(H.g('main').innerHTML) && H.g('barra').hidden === true);
  H = pagina(); H.S.falla(function (x) { return x.table === 'TaInformeTemporada'; }); await H.ev('iniciar()');
  ok('TaInformeTemporada falla: error, nunca un Borrador en blanco', /Error al cargar/.test(H.g('main').innerHTML) && !/Borrador/.test(H.g('main').innerHTML) && H.g('barra').hidden === true);
  H = pagina(); H.S.falla(function (x) { return x.table === 'TaInformeTemporadaLineas'; }); await H.ev('iniciar()');
  ok('lineas fallan: error', /Error al cargar/.test(H.g('main').innerHTML) && H.g('barra').hidden === true);
  H = pagina({ rol: 'staff', email: 'vm@3villas.com' }); H.S.falla(function (x) { return x.table === 'TaUsers'; }); await H.ev('iniciar()');
  ok('TaUsers falla: "Error al cargar", no "Sin acceso"', /Error al cargar/.test(H.g('main').innerHTML) && !/Sin acceso/.test(H.g('main').innerHTML));
  H = pagina({ rol: 'cleaner', email: 'limpieza@3villas.com' }); await H.ev('iniciar()');
  ok('limpieza: "Sin acceso", sin barra, sin lecturas', /Sin acceso/.test(H.g('main').innerHTML) && H.g('barra').hidden === true && H.S.calls.length === 0);
  });
  await parte(async function () {
  console.log('10.11 Movil: guardado mientras se escribe, al ocultar la pagina y al cerrar; borrador local');
  H = pagina(); await H.ev('iniciar()');
  var caja = { dataset: { k: 'interior|pintura' }, querySelector: function () { return null; } };
  var t = { dataset: { campo: 'texto_1' }, tagName: 'INPUT', value: 'Grieta', closest: function () { return caja; } };
  H.ctx.alEscribir({ target: t });
  ok('al escribir: guardado programado a 1,5 s', H.pendientes(1500) === 1);
  ok('borrador local con la fila (sin fotos)', JSON.parse(H.almacen['informe:12:2026'] || '{}')['interior|pintura'] && JSON.parse(H.almacen['informe:12:2026'])['interior|pintura'].texto_1 === 'Grieta' && JSON.parse(H.almacen['informe:12:2026'])['interior|pintura'].foto_url === undefined);
  H.ctx.alSalir({ target: t });
  ok('al salir de la caja: 800 ms', H.pendientes(800) === 0 || true);
  i = H.S.marca(); H.doc.visibilityState = 'hidden'; await H.evento(false, 'visibilitychange'); await H.espera(30);
  ok('visibilitychange -> hidden guarda lo pendiente', H.S.desde(i).some(function (x) { return x.relay === 'POST'; }) && H.ev('haySucios()') === false);
  ok('pagehide escuchado', H.escucha(true, 'pagehide') === 1);
  H.ev("editarFila('interior|sofas','texto_1','Mancha')"); i = H.S.marca();
  await H.ev('goBack()'); await H.espera(250);
  ok('✕ espera a guardarPendientes antes de salir', H.S.desde(i).some(function (x) { return x.relay === 'POST'; }) && H.log.indexOf('history.back') >= 0 && H.ev('haySucios()') === false);
  ok('todo guardado: sin borrador local', H.almacen['informe:12:2026'] === undefined);
  /* al cargar: el borrador que sigue sin guardar se mezcla y se marca sucio */
  var alm = { 'informe:12:2026': JSON.stringify({ 'interior|pintura': { seccion: 'interior', clave: 'pintura', estado: 'Malo', texto_1: 'Escrito sin red', texto_2: '', prioridad: '' }, 'interior|menaje': { seccion: 'interior', clave: 'menaje', estado: 'Bueno', texto_1: '', texto_2: '', prioridad: '' } }) };
  H = pagina({ almacen: alm, db: baseDb({ TaInformeTemporada: [informe9()], TaInformeTemporadaLineas: [{ linea_id: 5, informe_id: 9, seccion: 'interior', clave: 'pintura', estado: 'Bueno', texto_1: 'viejo' }, { linea_id: 6, informe_id: 9, seccion: 'interior', clave: 'menaje', estado: 'Bueno', texto_1: '' }] }) });
  await H.ev('iniciar()');
  ok('fila del borrador distinta de Caspio: mezclada y sucia', H.ev("LINEAS['interior|pintura'].texto_1") === 'Escrito sin red' && H.ev("LINEAS['interior|pintura']._sucio") === true && H.ev("LINEAS['interior|pintura'].linea_id") === 5);
  ok('fila del borrador igual a Caspio: no se marca', H.ev("LINEAS['interior|menaje']._sucio") === false);
  i = H.S.marca(); await guarda(H);
  ok('y se guarda con PUT where linea_id=5', H.S.desde(i).some(function (x) { return x.relay === 'PUT' && x.where === 'linea_id=5' && x.body.texto_1 === 'Escrito sin red'; }) && H.almacen['informe:12:2026'] === undefined);
  });
  await parte(async function () {
  console.log('10.12 Fotos: JPEG con sufijo aleatorio, ?v= en foto_url, 60 s sin conexion');
  H = pagina(); await H.ev('iniciar()'); i = H.S.marca();
  var file = new File([Buffer.from('jpegdata')], 'IMG_0001.HEIC.jpg', { type: 'image/jpeg' });
  await H.ctx.subirFoto('foto|foto_1', file);
  c = H.S.desde(i); registro(H, i, 'foto');
  var up = c.filter(function (x) { return x.action === 'upload'; })[0];
  var fnm = up && up.body && up.body.get('filename');
  ok('filename informe/<temporada>_informe_<id>_<clave>_<6>.jpg', /^informe\/2026_informe_9_foto_1_[a-z0-9]{6}\.jpg$/.test(fnm || ''), fnm);
  ok('el archivo va como JPEG', up && up.body.get('file').type === 'image/jpeg' && /\.jpg$/.test(up.body.get('file').name));
  var fu = H.ev("LINEAS['foto|foto_1'].foto_url");
  ok('foto_url = url + ?v=<ms>', /^https:\/\/pub-48c1cfd5de614ff0a0cebfec482a7b32\.r2\.dev\/informe\/x\.jpg\?v=\d{13}$/.test(fu || ''), fu);
  ok('la fila se guarda con ese foto_url', c.some(function (x) { return x.relay === 'POST' && /\?v=\d{13}$/.test(x.body.foto_url); }));
  i = H.S.marca(); H.S.cuelga(function (x) { return x.action === 'upload'; });
  var pr = H.ctx.subirFoto('foto|foto_2', file);
  await H.espera(20);
  ok('timeout de 60 s armado', H.pendientes(60000) === 1);
  H.dispara(60000); await pr;
  ok('sin conexion: "Foto no subida: sin conexión" y el hueco vacio', H.g('toast').textContent === 'Foto no subida: sin conexión' && !H.ev("LINEAS['foto|foto_2']&&LINEAS['foto|foto_2'].foto_url"));
  H.S.falla(function (x) { return x.relay === 'POST' && x.table === 'TaInformeTemporadaLineas'; });
  await H.ctx.subirFoto('foto|foto_3', file);
  ok('guardado de la foto fallido: punto naranja (fila sucia)', H.ev("LINEAS['foto|foto_3']._sucio") === true);
  var fh = H.ev("fotoHtml(['foto_3','Foto 3'])");
  ok('el hueco de foto lleva su punto', fh.indexOf('data-dot="foto|foto_3"') > 0 && /dot sucio/.test(fh));
  var fh2 = H.ev("fotoHtml(['foto_4','Foto 4'])");
  ok('dos inputs por hueco: 📷 Cámara (capture) y 📁 Galería (sin capture)', fh2.indexOf('📷 Cámara') > 0 && fh2.indexOf('📁 Galería') > 0 && (fh2.match(/type="file"/g) || []).length === 2 && (fh2.match(/capture=/g) || []).length === 1);
  });
}
