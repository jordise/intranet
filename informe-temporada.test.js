/* Pruebas del informe de fin de temporada (informe-temporada.html v1, Jordi 27/10/2026; ejemplo en papel de Rafa,
   villa Cielos Azules). node informe-temporada.test.js

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
  'whereInforme', 'whereLinea', 'lineaRequest', 'borrarLineaRequest', 'informeRequest', 'validarEnvio', 'soloLectura',
  'fotoNombre', 'fotoUrl', 'fotoSrc', 'urlDeSubida', 'textoEstancia', 'partirEstancia', 'filaVacia'];
var ctx = {};
try {
  vm.runInNewContext([constLine(SRC, 'WORKER'), constLine(SRC, 'R2_PUBLIC'), constLine(SRC, 'FOTOS_HOST')].join('\n') + '\n' +
    FNS.map(function (n) { return fnSource(SRC, n); }).join('\n') + '\nthis.WORKER=WORKER;', ctx);
} catch (e) { ok('las funciones existen en la pagina', false, e.message); console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(1); }
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
var d1 = ctx.borrarLineaRequest(5);
ok('Quitar foto: DELETE por el relay, POST sin cuerpo', q(d1.url, 'action') === 'save' && q(d1.url, 'where') === 'linea_id=5' && q(d1.url, 'method') === 'DELETE' && d1.method === 'POST' && d1.body === undefined && d1.headers === undefined, JSON.stringify(d1));
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
ok("Reabrir pone estado borrador", /estado:'borrador'/.test(fnSource(SRC, 'reabrirInforme')));

console.log('6. Solo lectura');
ok('enviado: solo lectura para staff', ctx.soloLectura({ estado: 'enviado' }, 'staff') === true);
ok('enviado: editable para admin y manager', ctx.soloLectura({ estado: 'enviado' }, 'admin') === false && ctx.soloLectura({ estado: 'enviado' }, 'manager') === false);
ok('borrador: editable para staff', ctx.soloLectura({ estado: 'borrador' }, 'staff') === false);
ok('sin informe: editable', ctx.soloLectura(null, 'staff') === false);

console.log('7. Fotos');
ok('nombre de archivo', ctx.fotoNombre(2026, 9, 'foto_3', 'IMG_001.JPG') === '2026_informe_9_foto_3.jpg');
ok('sin extension: jpg', ctx.fotoNombre(2026, 9, 'foto_1', 'blob') === '2026_informe_9_foto_1.jpg');
var R2 = 'https://pub-48c1cfd5de614ff0a0cebfec482a7b32.r2.dev/';
ok('fotoUrl reescribe r2.dev', ctx.fotoUrl(R2 + 'informe/2026_informe_9_foto_1.jpg') === 'https://www.3villas.com/intranet/fotos/informe/2026_informe_9_foto_1.jpg');
ok('fotoUrl deja otras URL', ctx.fotoUrl('https://x.com/a.jpg') === 'https://x.com/a.jpg');
ok('fotoSrc añade ?v=', ctx.fotoSrc(R2 + 'informe/a.jpg', 123) === 'https://www.3villas.com/intranet/fotos/informe/a.jpg?v=123');
ok('fotoSrc con ? ya: &v=', ctx.fotoSrc('https://x.com/a.jpg?s=1', 5) === 'https://x.com/a.jpg?s=1&v=5');
ok('respuesta {url}', ctx.urlDeSubida('{"url":"https://a/b.jpg"}') === 'https://a/b.jpg');
ok('respuesta {publicUrl}', ctx.urlDeSubida('{"publicUrl":"https://a/c.jpg"}') === 'https://a/c.jpg');
ok('respuesta texto', ctx.urlDeSubida(' https://a/d.jpg\n') === 'https://a/d.jpg');
ok('respuesta vacia o sin URL', ctx.urlDeSubida('') === '' && ctx.urlDeSubida('{"ok":true}') === '' && ctx.urlDeSubida('error') === '');
var sf = fnSource(SRC, 'subirFoto');
ok("subida: FormData file + filename informe/<nombre> a action=upload", sf.indexOf("fd.append('file',file,nombre)") >= 0 && sf.indexOf("fd.append('filename','informe/'+nombre)") >= 0 && sf.indexOf("?action=upload") > 0);
ok('input de camara', SRC.indexOf('accept="image/*" capture="environment"') > 0 || /accept='image\/\*' capture='environment'/.test(SRC) || SRC.indexOf("accept=\"image/*\" capture=\"environment\"") > 0);

console.log('8. Estancias añadidas y filas vacias');
ok('textoEstancia', ctx.textoEstancia('Terraza', 'Toldo roto') === 'Terraza: Toldo roto');
ok('partirEstancia', JSON.stringify(ctx.partirEstancia('Terraza: Toldo roto: ya')) === JSON.stringify({ nombre: 'Terraza', incidencia: 'Toldo roto: ya' }));
ok('partirEstancia sin nombre', ctx.partirEstancia('algo').nombre === '' && ctx.partirEstancia('algo').incidencia === 'algo');
ok('filaVacia', ctx.filaVacia({ estado: '', texto_1: ' ', texto_2: '', prioridad: '', foto_url: '' }) === true && ctx.filaVacia({ prioridad: 'Alta' }) === false && ctx.filaVacia(undefined) === true);

console.log('9. Pagina');
ok('VERSIÓN ACTUAL: v1 en las 5 primeras lineas', /VERSIÓN ACTUAL: v1 \|/.test(SRC.split('\n').slice(0, 5).join('\n')));
ok('PAGE_VERSION = 1', /const PAGE_VERSION = 1;/.test(SRC));
ok('checkForNewerVersion', SRC.indexOf('function checkForNewerVersion(') > 0);
ok('toast "No guardado: "', SRC.indexOf("'No guardado: '") > 0);
ok('debounce 800 ms al salir de una caja', /programar\(800\)/.test(fnSource(SRC, 'alSalir')) && /setTimeout\(guardarPendientes,ms\)/.test(fnSource(SRC, 'programar')));
ok('@media print con el titulo de Rafa', SRC.indexOf('@media print') > 0 && SRC.indexOf('Informe de Fin de Temporada — Estado de la villa y puntos de mejora') > 0);
ok('salto de pagina antes de 5 y Fotos', (SRC.match(/break-before:page/g) || []).length >= 1 && /pv-salto/.test(SRC));
ok('botones Guardar, Enviar, Reabrir, Imprimir', ['💾 Guardar', '📤 Enviar', '🔓 Reabrir', '🖨️ Imprimir'].every(function (t) { return SRC.indexOf(t) > 0; }));
var hist = SRC.slice(SRC.indexOf('<!-- HISTORIAL: v1 - '));
ok('HISTORIAL v1 con Jordi, fecha, Rafa, otra_N y la prueba', SRC.indexOf('<!-- HISTORIAL: v1 - ') > 0 && hist.indexOf('Jordi') >= 0 && hist.indexOf('27/10/2026') >= 0 && hist.indexOf('Rafa') >= 0 && hist.indexOf('otra_') >= 0 && hist.indexOf('informe-temporada.test.js') >= 0);
ok('el comentario HISTORIAL cierra una sola vez', hist.split('-->').length === 2);
var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, n = 0, bad = '';
while ((m = re.exec(SRC))) { n++; try { new vm.Script(m[1]); } catch (e) { bad += e.message; } }
ok('los scripts compilan', n > 0 && !bad, bad);

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
