/* Pruebas del informe de fin de temporada (informe-temporada.html v3, Jordi 27/10/2026; ejemplo en papel de Rafa,
   villa Cielos Azules). node informe-temporada.test.js
   v3 (ronda de arreglos 2, Gary 27/10/2026: "no se parece al formulario"): la pantalla es la hoja de Rafa. Las partes 9,
   10.6 y 11 prueban la maqueta nueva (titulos, cabeceras de tabla, etiquetas del PDF, movil, impresion, Alto/Medio/Bajo);
   el resto de casos de logica y de fetch falso siguen igual.
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
ok('iniciar: decide la puerta antes de leer la villa o el informe', fnSource(SRC, 'sinAcceso').indexOf('Sin acceso') > 0 && pa.indexOf('sinAcceso()') > 0 && pa.indexOf('puedeAbrirInforme(') > 0 && pa.indexOf('puedeAbrirInforme(') < pa.indexOf("leer('TaVillas'"), '');
ok('cleaner/sales: "Sin acceso" sin ninguna lectura (la puerta de rol va antes de la primera lectura)', /if\(!esAdminManager\(rol\)&&rol!=='staff'\)\{sinAcceso\(\);return;\}/.test(pa) && pa.indexOf("rol!=='staff'") < pa.indexOf('leer(') && pa.indexOf('fetch(') < 0);
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
/* v3: las palabras exactas del PDF de Rafa (las claves no cambian) */
var PDF_INTERIOR = ['Pintura interior (paredes, techos, carpintería)', 'Colchones y almohadas', 'Sofás, tapicerías y alfombras', 'Mobiliario y módulos de cocina', 'Menaje de cocina', 'Electrodomésticos', 'Aire acondicionado/ventiladores (equipos y mandos)', 'Puertas de entrada (cierre y entrada de agua)', 'Ventanas y contraventanas (manecillas, mecanismos)', 'Baños: grifería, duchas y mamparas', 'Desagües (atascos y olores)', 'Iluminación interior', 'Humedades y ventilación'];
var PDF_EXTERIOR = ['Fachada y pintura exterior', 'Carpintería exterior (madera / PVC)', 'Pavimentos, escalones y rampas', 'Barreras y barandillas', 'Jardín, muros y vallas', 'Piscina (vaso, gresites, filtro / skimmer, ducha, depuradora, etc)', 'Mobiliario exterior', 'Barbacoa', 'Iluminación exterior'];
var PDF_SEGURIDAD = ['Cerraduras y accesos', 'Instalación eléctrica (cuadro, diferencial, potencia)', 'Fontanería y agua caliente (fugas, termo, llaves de paso, contador)', 'Wifi y TV'];
var PDF_ESTANCIAS = ['Salón / comedor', 'Cocina', 'Dormitorio principal', 'Dormitorio 2', 'Baño 1', 'Baño 2', 'Exterior / zona piscina'];
function labs(s) { return K.filter(function (k) { return k.seccion === s; }).map(function (k) { return k.label; }); }
ok('13 elementos de Interior con las palabras del PDF', labs('interior').join('|') === PDF_INTERIOR.join('|'), labs('interior').filter(function (l, i) { return l !== PDF_INTERIOR[i]; }).join(' / '));
ok('9 elementos de Exterior con las palabras del PDF', labs('exterior').join('|') === PDF_EXTERIOR.join('|'), labs('exterior').filter(function (l, i) { return l !== PDF_EXTERIOR[i]; }).join(' / '));
ok('4 elementos de Seguridad con las palabras del PDF', labs('seguridad').join('|') === PDF_SEGURIDAD.join('|'));
ok('7 estancias con las palabras del PDF', labs('estancia').join('|') === PDF_ESTANCIAS.join('|'));
ok('texto de ayuda de 6 como el PDF (p.ej.)', S[5].ayuda === 'Quejas o sugerencias repetidas de los huéspedes (reviews, partes o comentarios directos) y mejoras de equipamiento que aumentarían su satisfacción (p.ej., espejos, baldas).', S[5].ayuda);
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
ok("subida: FormData file + filename informe/<nombre> a action=upload", sf.indexOf("fd.append('file',jpg,nombre)") >= 0 && sf.indexOf("fd.append('filename','informe/'+nombre)") >= 0 && sf.indexOf("?action=upload") > 0);
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
ok('VERSIÓN ACTUAL: v4 en las 5 primeras lineas', /VERSIÓN ACTUAL: v4 \|/.test(SRC.split('\n').slice(0, 5).join('\n')));
ok('PAGE_VERSION = 4', /const PAGE_VERSION = 4;/.test(SRC));
ok('titulo v4', SRC.indexOf('<title>Informe de temporada v4 — 3Villas</title>') > 0);
/* v4: un <select> que solo dispara 'change' (prioridad, origen) tambien guarda */
ok('select change: el manejador de change trata un <select> con data-campo como escritura (alEscribir)', /addEventListener\('change'[\s\S]{0,400}t\.tagName==='SELECT'&&t\.dataset&&t\.dataset\.campo\)return alEscribir\(e\)/.test(SRC));
ok('HISTORIAL v4 presente', /<!-- HISTORIAL: v4 - 27\/10\/2026/.test(SRC));
ok('checkForNewerVersion', SRC.indexOf('function checkForNewerVersion(') > 0);
ok('toast "No guardado: "', SRC.indexOf("'No guardado: '") > 0);
ok('.barra[hidden]{display:none} (la barra no sale sobre "Sin acceso" ni al cargar)', SRC.indexOf('.barra[hidden]{display:none}') > 0);
ok('debounce 800 ms al salir de una caja', /programar\(800\)/.test(fnSource(SRC, 'alSalir')) && /setTimeout\(guardarPendientes,ms\)/.test(fnSource(SRC, 'programar')));
/* v3: la impresion es la misma maqueta que la pantalla */
var PRINT = (function () { var i = SRC.indexOf('@media print{'); if (i < 0) return ''; var j = SRC.indexOf('{', i), d = 0, k = j; for (; k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) break; } } return SRC.slice(i, k + 1); })();
var MOVIL = (function () { var i = SRC.indexOf('@media (max-width:699px){'); if (i < 0) return ''; var j = SRC.indexOf('{', i), d = 0, k = j; for (; k < SRC.length; k++) { if (SRC[k] === '{') d++; else if (SRC[k] === '}') { d--; if (!d) break; } } return SRC.slice(i, k + 1); })();
var CODIGO = SRC.slice(0, SRC.indexOf('<!-- HISTORIAL:')); /* el historial cuenta lo de antes: no cuenta */
ok('sin printHtml, sin pintarImpresion, sin #printView', CODIGO.length > 1000 && CODIGO.indexOf('printHtml') < 0 && CODIGO.indexOf('pintarImpresion') < 0 && CODIGO.indexOf('printView') < 0);
ok('sin "+ Añadir actuación" (las cinco filas siempre están)', CODIGO.indexOf('+ Añadir actuación') < 0);
ok('Imprimir = window.print()', /window\.print\(\)/.test(fnSource(SRC, 'imprimir')));
ok('@page A4 con márgenes 14 mm 12 mm', /@page\{size:A4;margin:14mm 12mm\}/.test(PRINT));
ok('impresion: oculta la barra, el nav, la pastilla, los enlaces de añadir, los controles de foto y el hueco vacío', ['.barra', '.top-nav', '.pill', '.anadir', '.f-ctl', '.foto.vacia'].every(function (c) { return PRINT.indexOf(c) >= 0; }) && /display:none!important/.test(PRINT), PRINT.slice(0, 300));
ok('impresion: filas y fotos sin cortar, titulos pegados a su tabla, cada foto en su pagina', /tr\{[^}]*break-inside:avoid/.test(PRINT) && /\.s-tit\{[^}]*break-after:avoid/.test(PRINT) && /\.foto\{[^}]*break-before:page[^}]*break-inside:avoid|\.foto\{[^}]*break-inside:avoid[^}]*break-before:page/.test(PRINT));
ok('impresion: las cajas de texto salen como texto (sin bordes ni scroll)', /textarea\{display:none/.test(PRINT) && /\.ta-p\{display:block/.test(PRINT));
ok('movil: bloque @media (max-width:699px) que pone la fila en rejilla de 4 y baja Observaciones a la segunda linea', MOVIL.length > 0 && /grid-template-columns:minmax\(0,1fr\) 44px 44px 44px/.test(MOVIL) && /grid-column:1\/-1/.test(MOVIL));
ok('movil: casillas de 44 px, cajas de 16 px (sin zoom en iOS), hoja con 10 px a los lados', /min-height:44px/.test(MOVIL) && /font-size:16px/.test(MOVIL) && /\.hoja\{[^}]*padding:[^;}]*10px/.test(MOVIL));
ok('movil: la cabecera Observaciones se oculta', /\.c-obs-h\{display:none\}|th\.c-obs\{display:none\}/.test(MOVIL));
ok('hoja: max-width 820 px, logo de 44 px, raya roja, titulo rojo 26 px, titulos de seccion 17 px', /\.hoja\{[^}]*max-width:820px/.test(SRC) && /\.h-logo\{[^}]*height:44px/.test(SRC) && /\.h-cab\{[^}]*border-bottom:[^;}]*var\(--red\)/.test(SRC) && /\.h-tit\{[^}]*font-size:26px/.test(SRC) && /\.h-tit\{[^}]*color:var\(--red\)/.test(SRC) && /\.s-tit\{[^}]*font-size:17px/.test(SRC));
ok('tabla: etiquetas #f2f2f2 y bordes #cfcfcf; columnas de estado de 62 px', /#f2f2f2/.test(SRC) && /#cfcfcf/.test(SRC) && /\.c-st\{[^}]*width:62px/.test(SRC));
ok('botones Guardar, Enviar, Reabrir, Imprimir', ['💾 Guardar', '📤 Enviar', '🔓 Reabrir', '🖨️ Imprimir'].every(function (t) { return SRC.indexOf(t) > 0; }));
var hist = SRC.slice(SRC.indexOf('<!-- HISTORIAL: v1 - '));
ok('HISTORIAL v1 con Jordi, fecha, Rafa, otra_N y la prueba', SRC.indexOf('<!-- HISTORIAL: v1 - ') > 0 && hist.indexOf('Jordi') >= 0 && hist.indexOf('27/10/2026') >= 0 && hist.indexOf('Rafa') >= 0 && hist.indexOf('otra_') >= 0 && hist.indexOf('informe-temporada.test.js') >= 0);
ok('el comentario HISTORIAL v1 cierra una sola vez', hist.split('-->').length === 2);
var h2i = SRC.indexOf('<!-- HISTORIAL: v2 - '), hist2 = h2i > 0 ? SRC.slice(h2i, SRC.indexOf('-->', h2i)) : '';
ok('HISTORIAL v2 en español: las dos revisiones del 27/10/2026 y la prueba', h2i > 0 && h2i < SRC.indexOf('<!-- HISTORIAL: v1 - ') && /revisiones/.test(hist2) && hist2.indexOf('27/10/2026') >= 0 && hist2.indexOf('informe-temporada.test.js') >= 0 && hist2.indexOf('DELETE') >= 0);
var h3i = SRC.indexOf('<!-- HISTORIAL: v3 - '), hist3 = h3i > 0 ? SRC.slice(h3i, SRC.indexOf('-->', h3i)) : '';
ok('HISTORIAL v3 en español, antes de v2, con el texto pedido', h3i > 0 && h3i < h2i && hist3.indexOf('v3 - 27/10/2026 — la pantalla es la misma hoja que el modelo de Rafa (logo, título rojo, tablas Elemento | Bueno | Regular | Malo | Observaciones), en escritorio y en móvil; la impresión usa la misma maqueta; sin cambios de datos') >= 0);
ok('el comentario HISTORIAL v3 cierra una sola vez', h3i > 0 && SRC.slice(h3i, SRC.indexOf('<!-- HISTORIAL: v2 - ')).split('-->').length === 2);
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
  console.log('10.6 La hoja: filas con datos, villa manager asignado, otra estancia, fotos');
  H = pagina({ db: baseDb({ TaInformeTemporada: [informe9({ estado_general: 'Regular', observaciones_finales: 'Todo en orden' })], TaInformeTemporadaLineas: [
    { linea_id: 1, informe_id: 9, seccion: 'interior', clave: 'pintura', estado: 'Malo', texto_1: 'Repintar' },
    { linea_id: 2, informe_id: 9, seccion: 'interior', clave: 'colchones', estado: '', texto_1: '' },
    { linea_id: 3, informe_id: 9, seccion: 'estancia', clave: 'otra_1', texto_1: ': Grieta' },
    { linea_id: 4, informe_id: 9, seccion: 'foto', clave: 'foto_1', foto_url: 'https://x.com/a.jpg?v=5', texto_1: 'Pie' }] }) });
  await H.ev('iniciar()');
  var ph = H.g('main').innerHTML;
  var filaPintura = (ph.match(/<tr[^>]*data-k="interior\|pintura"[\s\S]*?<\/tr>/) || [''])[0];
  ok('fila con datos: Malo marcado con X, Bueno y Regular con ☐, observacion en su caja', /data-v="Malo"[^>]*>X</.test(filaPintura) && /data-v="Bueno"[^>]*>☐</.test(filaPintura) && /data-v="Regular"[^>]*>☐</.test(filaPintura) && />Repintar<\/textarea>/.test(filaPintura), filaPintura.slice(0, 400));
  ok('las filas vacias tambien estan (como en el PDF)', ph.indexOf('Colchones y almohadas') > 0 && ph.indexOf('Sofás, tapicerías y alfombras') > 0);
  ok('otra estancia sin nombre: fila con la estancia editable y la incidencia', /data-k="estancia\|otra_1"/.test(ph) && /data-campo="est_nombre"[^>]*value=""/.test(ph) && />Grieta<\/textarea>/.test(ph));
  ok('foto por fotoUrl con su ?v=', ph.indexOf('src="https://x.com/a.jpg?v=5"') > 0);
  ok('Villa manager = el asignado de la villa (KeyHolder_person -> TaContacts)', /<th>Villa manager<\/th><td>Amanda Townsend<\/td>/.test(ph));
  ok('cabecera: Villa, Fecha de revisión (fecha en la celda) y Temporada', /<th>Villa<\/th><td>Villa Cielos Azules<\/td>/.test(ph) && /<th>Fecha de revisión<\/th><td><input type="date"[^>]*value="2026-10-26"/.test(ph) && /<th>Temporada<\/th><td>2026<\/td>/.test(ph));
  ok('estado general Regular marcado con X', /data-campo="estado_general" data-v="Regular"[^>]*><span class="cx">X<\/span> Regular/.test(ph) && /data-v="Bueno"[^>]*><span class="cx">☐<\/span> Bueno/.test(ph));
  ok('observaciones finales en su caja', />Todo en orden<\/textarea>/.test(ph));
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
  ok('al salir de la caja: el guardado pasa a 800 ms (el de 1,5 s se cancela)', H.pendientes(1500) === 0 && /programar\(800\)/.test(fnSource(SRC, 'alSalir')));
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
  await parte(async function () {
  console.log('11. La hoja de Rafa en pantalla (v3)');
  H = pagina(); await H.ev('iniciar()');
  var mh = H.g('main').innerHTML;
  var TIT = ['1. Resumen y actuaciones prioritarias', '2. Interior', '3. Exterior', '4. Seguridad e instalaciones', '5. Incidencias por estancia', '6. Comentarios de huéspedes y propuestas de mejora', '7. Observaciones finales'];
  var vistos = (mh.match(/<h2 class="s-tit">[^<]*<\/h2>/g) || []).map(function (x) { return x.replace(/<[^>]+>/g, ''); });
  ok('los siete titulos del PDF, en orden, sin contador ni triangulo', vistos.join('|') === TIT.join('|') && mh.indexOf('<details') < 0 && mh.indexOf('data-n=') < 0, vistos.join('|'));
  var THS = (mh.match(/<th\b[^>]*>[^<]*<\/th>/g) || []).map(function (x) { return x.replace(/<[^>]+>/g, ''); });
  var PAL = ['Elemento', 'Bueno', 'Regular', 'Malo', 'Observaciones / acción recomendada', 'Nº', 'Actuación prioritaria', 'Motivo / impacto', 'Prioridad', 'Estancia', 'Incidencia detectada', 'Acción recomendada', 'Tema', 'Origen', 'Detalle / mejora propuesta'];
  ok('cabeceras de tabla del PDF', PAL.every(function (w) { return THS.indexOf(w) >= 0; }), PAL.filter(function (w) { return THS.indexOf(w) < 0; }).join(', '));
  ok('tres tablas Elemento | Bueno | Regular | Malo | Observaciones', (mh.match(/<th[^>]*>Elemento<\/th><th[^>]*>Bueno<\/th><th[^>]*>Regular<\/th><th[^>]*>Malo<\/th><th[^>]*>Observaciones \/ acción recomendada<\/th>/g) || []).length === 3);
  function enOrden(lista) { var p = -1; return lista.every(function (l) { var i = mh.indexOf('>' + esc(l) + '<', p + 1); if (i < 0) return false; p = i; return true; }); }
  function esc(t) { return t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;'); }
  ok('13 + 9 + 4 elementos con las palabras del PDF y en su orden', enOrden(PDF_INTERIOR.concat(PDF_EXTERIOR, PDF_SEGURIDAD)));
  ok('7 estancias del PDF en su orden', enOrden(PDF_ESTANCIAS));
  ok('cabecera: Villa, Villa manager, Fecha de revisión, Temporada', enOrden(['Villa', 'Villa manager', 'Fecha de revisión', 'Temporada']) && /<th>Villa<\/th>/.test(mh));
  ok('logo-negro.png, titulo "Informe de Fin de Temporada" y subtitulo', /<img class="h-logo" src="logo-negro\.png"/.test(mh) && /<h1 class="h-tit">Informe de Fin de Temporada<\/h1>/.test(mh) && /<div class="h-sub">Estado de la villa y puntos de mejora<\/div>/.test(mh));
  ok('pastilla Borrador en la linea del logo', /<div class="h-cab">[\s\S]*?<span class="pill borrador">Borrador<\/span>[\s\S]*?<\/div>/.test(mh));
  ok('Estado general de la villa: una fila con ☐ Bueno ☐ Regular ☐ Malo', /<th>Estado general de la villa<\/th>/.test(mh) && /><span class="cx">☐<\/span> Bueno<\/button>[\s\S]*?><span class="cx">☐<\/span> Regular<\/button>[\s\S]*?><span class="cx">☐<\/span> Malo<\/button>/.test(mh));
  ok('cinco filas de actuacion numeradas 1-5 siempre (vacias tambien)', [1, 2, 3, 4, 5].every(function (n) { return new RegExp('data-k="resumen\\|accion_' + n + '"[^>]*><td class="c-n"[^>]*>' + n + '<').test(mh); }));
  ok('tres filas de comentarios siempre, la 4 no', /data-k="huesped\|comentario_3"/.test(mh) && !/data-k="huesped\|comentario_4"/.test(mh));
  ok('enlaces "+ Añadir estancia" y "+ Añadir comentario"', /class="anadir"[^>]*data-anadir="estancia"[^>]*>\+ Añadir estancia</.test(mh) && /class="anadir"[^>]*data-anadir="huesped"[^>]*>\+ Añadir comentario</.test(mh));
  ok('una caja por valor: cada fila de Interior tiene un solo texto_1', ['pintura', 'menaje', 'humedades'].every(function (cl) { var f = (mh.match(new RegExp('<tr[^>]*data-k="interior\\|' + cl + '"[\\s\\S]*?</tr>')) || [''])[0]; return (f.match(/data-campo="texto_1"/g) || []).length === 1 && (f.match(/<textarea/g) || []).length === 1; }));
  ok('Prioridad = select Elegir / Alto / Medio / Bajo (gris mientras Elegir)', /<select class="sel vacio" data-campo="prioridad"><option value="" selected>Elegir<\/option><option value="Alta">Alto<\/option><option value="Media">Medio<\/option><option value="Baja">Bajo<\/option><\/select>/.test(mh));
  ok('Origen = select Review / Parte / Propuesta', /<select class="sel vacio" data-campo="estado"><option value="" selected>Review \/ Parte \/ Propuesta<\/option><option value="Review">Review<\/option><option value="Parte">Parte<\/option><option value="Propuesta">Propuesta<\/option><\/select>/.test(mh));
  ok('fotos: un solo hueco vacio con "Añadir foto" y las dos entradas', (mh.match(/class="foto[ "]/g) || []).length === 1 && /class="foto vacia"/.test(mh) && mh.indexOf('Añadir foto') > 0 && (mh.match(/type="file"/g) || []).length === 2);
  ok('7. Observaciones finales: caja directamente bajo el titulo', /7\. Observaciones finales<\/h2><div data-k="__cab"><textarea class="in libre"/.test(mh));
  ok('el texto de ayuda de 5 y 6 en gris (reviews en cursiva)', /class="s-ayuda">Detalle de los desperfectos concretos detectados en cada estancia que no queden recogidos en los apartados anteriores\.</.test(mh) && /class="s-ayuda">Quejas o sugerencias repetidas de los huéspedes \(<em>reviews<\/em>, partes/.test(mh));

  console.log('11.2 Alto / Medio / Bajo en pantalla; Alta / Media / Baja guardado');
  ok('prioridadVer: Alta->Alto, Media->Medio, Baja->Bajo (y en minusculas)', H.ctx.prioridadVer('Alta') === 'Alto' && H.ctx.prioridadVer('Media') === 'Medio' && H.ctx.prioridadVer('Baja') === 'Bajo' && H.ctx.prioridadVer('alta') === 'Alto' && H.ctx.prioridadVer('') === '');
  ok('prioridadGuardar: Alto->Alta, Medio->Media, Bajo->Baja', H.ctx.prioridadGuardar('Alto') === 'Alta' && H.ctx.prioridadGuardar('Medio') === 'Media' && H.ctx.prioridadGuardar('Bajo') === 'Baja' && H.ctx.prioridadGuardar('') === '');
  ok('ida y vuelta', ['Alta', 'Media', 'Baja'].every(function (v) { return H.ctx.prioridadGuardar(H.ctx.prioridadVer(v)) === v; }));
  H = pagina({ db: baseDb({ TaInformeTemporada: [informe9()], TaInformeTemporadaLineas: [
    { linea_id: 1, informe_id: 9, seccion: 'resumen', clave: 'accion_1', texto_1: 'Pérgola', texto_2: 'Temporal', prioridad: 'Media' },
    { linea_id: 2, informe_id: 9, seccion: 'estancia', clave: 'cocina', texto_1: 'Grifo', prioridad: 'alta' },
    { linea_id: 3, informe_id: 9, seccion: 'huesped', clave: 'comentario_5', estado: 'Parte', texto_1: 'Ruido' }] }) });
  await H.ev('iniciar()'); mh = H.g('main').innerHTML;
  ok('guardado "Media": se ve Medio elegido', /<select class="sel" data-campo="prioridad">[^]*?<option value="Media" selected>Medio<\/option>/.test((mh.match(/data-k="resumen\|accion_1"[\s\S]*?<\/tr>/) || [''])[0]));
  ok('guardado "alta" (minusculas): se ve Alto elegido', /<option value="alta" selected>Alto<\/option>/.test((mh.match(/data-k="estancia\|cocina"[\s\S]*?<\/tr>/) || [''])[0]));
  ok('comentario 5 con datos: su fila sale (y la 4 no)', /data-k="huesped\|comentario_5"/.test(mh) && !/data-k="huesped\|comentario_4"/.test(mh) && /<option value="Parte" selected>Parte<\/option>/.test(mh));
  var sel = { tagName: 'SELECT', value: 'Baja', dataset: { campo: 'prioridad' }, classList: { toggle: function () {} }, closest: function () { return { dataset: { k: 'resumen|accion_2' }, querySelector: function () { return null; } }; } };
  H.ctx.alEscribir({ target: sel });
  ok('elegir Bajo guarda "Baja" (el valor de siempre)', H.ev("LINEAS['resumen|accion_2'].prioridad") === 'Baja' && H.ev("LINEAS['resumen|accion_2']._sucio") === true);

  console.log('11.3 Añadir estancia y comentario: una fila mas en la tabla');
  H.ev("anadir('estancia')"); mh = H.g('main').innerHTML;
  ok('+ Añadir estancia: fila otra_1 con la estancia editable', /data-k="estancia\|otra_1"/.test(mh) && /<tr[^>]*data-k="estancia\|otra_1"[\s\S]*?data-campo="est_nombre"/.test(mh));
  H.ev("anadir('huesped')"); mh = H.g('main').innerHTML;
  ok('+ Añadir comentario: aparece la 4', /data-k="huesped\|comentario_4"/.test(mh));

  console.log('11.4 Fotos: las llenas y un hueco vacio; solo lectura sin hueco');
  H = pagina({ db: baseDb({ TaInformeTemporada: [informe9()], TaInformeTemporadaLineas: [
    { linea_id: 4, informe_id: 9, seccion: 'foto', clave: 'foto_1', foto_url: 'https://x.com/a.jpg?v=5', texto_1: 'Pérgola' },
    { linea_id: 5, informe_id: 9, seccion: 'foto', clave: 'foto_2', foto_url: 'https://x.com/b.jpg?v=6', texto_1: '' }] }) });
  await H.ev('iniciar()'); mh = H.g('main').innerHTML;
  ok('dos fotos llenas y un hueco (foto_3)', (mh.match(/class="foto"/g) || []).length === 2 && /class="foto vacia" data-k="foto\|foto_3"/.test(mh) && !/foto\|foto_4/.test(mh));
  ok('pie de foto bajo la foto y controles bajo el pie', /src="https:\/\/x\.com\/a\.jpg\?v=5"[\s\S]*?data-campo="texto_1"[\s\S]*?class="f-ctl"[\s\S]*?Quitar/.test(mh));
  H = pagina({ rol: 'staff', email: 'vm@3villas.com', db: baseDb({ TaInformeTemporada: [informe9({ estado: 'enviado', estado_general: 'Bueno' })], TaInformeTemporadaLineas: [
    { linea_id: 4, informe_id: 9, seccion: 'foto', clave: 'foto_1', foto_url: 'https://x.com/a.jpg?v=5', texto_1: 'Pérgola' }] }) });
  await H.ev('iniciar()'); mh = H.g('main').innerHTML;
  ok('enviado (villa manager): sin hueco vacio, pastilla Enviado, casillas y selects desactivados', !/foto vacia/.test(mh) && /<span class="pill enviado">Enviado<\/span>/.test(mh) && (mh.match(/<button[^>]*class="st[^"]*"[^>]*>/g) || []).every(function (t) { return / disabled/.test(t); }) && (mh.match(/<select\b[^>]*>/g) || []).every(function (t) { return / disabled/.test(t); }));
  });
  /* ── 12. v5, carril A (29/10/2026): N/A con motivo, ⚠ Peligro con texto, coste estimado, «Se refiere a:» de la foto ──
     Columnas de Caspio de CASPIO-COLUMNS.md: na y peligro (Sí/No: true/false), na_motivo, peligro_texto, coste, clave_ref. */
  var V5 = ['na', 'na_motivo', 'peligro', 'peligro_texto', 'coste', 'clave_ref'];
  function filaDe(html, k) { return (html.match(new RegExp('<tr[^>]*data-k="' + k.replace('|', '\\|') + '"[\\s\\S]*?</tr>')) || [''])[0]; }
  function cajaFalsa(k) { return { dataset: { k: k } }; }
  function pulsa(H, k, campo, v, on) {
    var b = { disabled: false, dataset: { campo: campo, v: v }, classList: { contains: function (c) { return c === 'on' && !!on; } } };
    b.closest = function (s) { return s === '.st' ? b : cajaFalsa(k); };
    return H.ctx.alPulsar({ target: b });
  }
  await parte(async function () {
  console.log('12.1 v5: las dos listas de columnas del guardado llevan las seis columnas nuevas');
  H = pagina();
  var L5 = { seccion: 'exterior', clave: 'piscina', orden: 6, estado: '', texto_1: '', texto_2: '', prioridad: '', foto_url: '', na: true, na_motivo: 'sin piscina', peligro: false, peligro_texto: '', coste: '', clave_ref: '' };
  var p1 = H.ctx.lineaRequest(9, L5), p2 = H.ctx.lineaRequest(9, Object.assign({}, L5, { linea_id: 8 }));
  ok('POST: las seis columnas nuevas en el cuerpo', V5.every(function (c) { return Object.prototype.hasOwnProperty.call(p1.body, c); }), JSON.stringify(p1.body));
  ok('PUT: las seis columnas nuevas en el cuerpo', p2.method === 'PUT' && V5.every(function (c) { return Object.prototype.hasOwnProperty.call(p2.body, c); }), JSON.stringify(p2.body));
  ok('na y peligro van como true / false (columnas Sí/No), nunca texto', p1.body.na === true && p1.body.peligro === false && p2.body.na === true && p2.body.peligro === false);
  ok('na_motivo con su texto; coste en blanco sigue en blanco (nunca "0")', p1.body.na_motivo === 'sin piscina' && p1.body.coste === '' && p1.body.clave_ref === '');
  var vieja = H.ctx.lineaRequest(9, { seccion: 'interior', clave: 'pintura', orden: 1, estado: 'Bueno', texto_1: '', texto_2: '', prioridad: '', foto_url: '' });
  ok('fila sin los campos nuevos (v4 o recien creada): na y peligro false, textos ""', vieja.body.na === false && vieja.body.peligro === false && vieja.body.na_motivo === '' && vieja.body.peligro_texto === '' && vieja.body.coste === '' && vieja.body.clave_ref === '', JSON.stringify(vieja.body));
  ok('coste y clave_ref con su valor', H.ctx.lineaRequest(9, { seccion: 'resumen', clave: 'accion_1', coste: '500-2000' }).body.coste === '500-2000' && H.ctx.lineaRequest(9, { seccion: 'foto', clave: 'foto_1', clave_ref: 'piscina' }).body.clave_ref === 'piscina');
  var Ls = H.ctx.lineasDesdeFilas([
    { linea_id: 1, informe_id: 9, seccion: 'exterior', clave: 'piscina', estado: '', na: true, na_motivo: 'sin piscina', peligro: null, peligro_texto: null, coste: null, clave_ref: null },
    { linea_id: 2, informe_id: 9, seccion: 'seguridad', clave: 'instalacion_electrica', estado: 'Malo', peligro: true, peligro_texto: 'cable pelado' },
    { linea_id: 3, informe_id: 9, seccion: 'resumen', clave: 'accion_1', texto_1: 'Cuadro', coste: '2000-10000' },
    { linea_id: 4, informe_id: 9, seccion: 'foto', clave: 'foto_1', foto_url: 'https://x.com/a.jpg', clave_ref: 'piscina' },
    { linea_id: 5, informe_id: 9, seccion: 'interior', clave: 'pintura', estado: 'Bueno' }]);
  ok('lectura: na true sigue true, peligro null pasa a false', Ls['exterior|piscina'].na === true && Ls['exterior|piscina'].peligro === false && Ls['exterior|piscina'].na_motivo === 'sin piscina');
  ok('lectura: textos nuevos null pasan a ""', Ls['exterior|piscina'].peligro_texto === '' && Ls['exterior|piscina'].coste === '' && Ls['exterior|piscina'].clave_ref === '');
  ok('lectura: peligro, coste y clave_ref con su valor', Ls['seguridad|instalacion_electrica'].peligro === true && Ls['seguridad|instalacion_electrica'].peligro_texto === 'cable pelado' && Ls['resumen|accion_1'].coste === '2000-10000' && Ls['foto|foto_1'].clave_ref === 'piscina');
  ok('lectura: fila de antes de la v5 (sin columnas nuevas): na y peligro false', Ls['interior|pintura'].na === false && Ls['interior|pintura'].peligro === false && Ls['interior|pintura'].na_motivo === '');
  ok('lectura: "1" y "true" tambien son si', H.ctx.lineasDesdeFilas([{ linea_id: 1, seccion: 'interior', clave: 'menaje', na: '1', peligro: 'true' }])['interior|menaje'].na === true && H.ctx.lineasDesdeFilas([{ linea_id: 1, seccion: 'interior', clave: 'menaje', na: '1', peligro: 'true' }])['interior|menaje'].peligro === true);
  ok('filaVacia: solo N/A, solo peligro, solo coste o solo clave_ref = fila con datos', [{ na: true }, { peligro: true }, { coste: 'desconocido' }, { clave_ref: 'otra' }, { na_motivo: 'x' }, { peligro_texto: 'x' }].every(function (L) { return H.ctx.filaVacia(L) === false; }));
  ok('filaVacia: campos nuevos en blanco o false = vacia', H.ctx.filaVacia({ estado: '', texto_1: '', na: false, na_motivo: '', peligro: false, peligro_texto: '', coste: '', clave_ref: '' }) === true);
  await H.ev('iniciar()'); i = H.S.marca();
  H.ev("editarFila('exterior|barbacoa','na',true)"); H.ev("editarFila('exterior|barbacoa','na_motivo','no hay')");
  await guarda(H);
  c = H.S.desde(i).filter(function (x) { return x.relay === 'POST' && x.table === 'TaInformeTemporadaLineas'; });
  ok('fila nueva solo con N/A: se guarda (POST con na true y su motivo, estado vacio)', c.length === 1 && c[0].body.na === true && c[0].body.na_motivo === 'no hay' && c[0].body.estado === '', c.length ? JSON.stringify(c[0].body) : 'sin POST');
  });
  await parte(async function () {
  console.log('12.2 v5: N/A excluye Bueno / Regular / Malo y al reves');
  H = pagina({ db: baseDb({ TaInformeTemporada: [informe9()], TaInformeTemporadaLineas: [{ linea_id: 5, informe_id: 9, seccion: 'exterior', clave: 'piscina', orden: 6, estado: 'Bueno', texto_1: '' }] }) });
  await H.ev('iniciar()');
  k = 'exterior|piscina';
  await pulsa(H, k, 'na', 'N/A', false); await H.espera(40);
  ok('pulsar N/A en una fila con Bueno: na true y estado vacio', H.ev("LINEAS['" + k + "'].na") === true && H.ev("LINEAS['" + k + "'].estado") === '');
  ok('y se guarda: PUT con na true y estado ""', H.S.db.TaInformeTemporadaLineas[0].na === true && H.S.db.TaInformeTemporadaLineas[0].estado === '');
  H.ev("editarFila('" + k + "','na_motivo','sin piscina')");
  await pulsa(H, k, 'estado', 'Regular', false);
  ok('pulsar Regular en una fila N/A: estado Regular, na false y el motivo se borra', H.ev("LINEAS['" + k + "'].estado") === 'Regular' && H.ev("LINEAS['" + k + "'].na") === false && H.ev("LINEAS['" + k + "'].na_motivo") === '');
  await pulsa(H, k, 'na', 'N/A', false);
  await pulsa(H, k, 'na', 'N/A', true); await H.espera(40);
  ok('pulsar N/A otra vez (ya marcada): na false; el estado sigue vacio', H.ev("LINEAS['" + k + "'].na") === false && H.ev("LINEAS['" + k + "'].estado") === '');
  ok('nunca na true con estado a la vez', !(H.S.db.TaInformeTemporadaLineas[0].na === true && H.S.db.TaInformeTemporadaLineas[0].estado));
  var cm = H.ctx.cambiosMarca({ estado: 'Malo', na: false }, 'na', 'N/A');
  ok('cambiosMarca: N/A = {na: true, estado: ""}', cm.na === true && cm.estado === '' && Object.keys(cm).length === 2, JSON.stringify(cm));
  cm = H.ctx.cambiosMarca({ estado: '', na: true, na_motivo: 'x' }, 'estado', 'Bueno');
  ok('cambiosMarca: marca sobre N/A = {estado, na: false, na_motivo: ""}', cm.estado === 'Bueno' && cm.na === false && cm.na_motivo === '', JSON.stringify(cm));
  cm = H.ctx.cambiosMarca({ estado: 'Bueno', na: false }, 'estado', 'Malo');
  ok('cambiosMarca: marca sin N/A = solo el estado', cm.estado === 'Malo' && Object.keys(cm).length === 1, JSON.stringify(cm));
  cm = H.ctx.cambiosMarca({ estado: '', na: true, na_motivo: 'x' }, 'na', '');
  ok('cambiosMarca: quitar N/A = {na: false, na_motivo: ""}', cm.na === false && cm.na_motivo === '' && cm.estado === undefined, JSON.stringify(cm));
  });
  await parte(async function () {
  console.log('12.3 v5: la fila de elemento en pantalla (N/A, motivo, ⚠ Peligro)');
  H = pagina({ db: baseDb({ TaInformeTemporada: [informe9()], TaInformeTemporadaLineas: [
    { linea_id: 1, informe_id: 9, seccion: 'exterior', clave: 'piscina', estado: '', na: true, na_motivo: 'sin piscina' },
    { linea_id: 2, informe_id: 9, seccion: 'seguridad', clave: 'instalacion_electrica', estado: 'Bueno', peligro: true, peligro_texto: 'enchufe suelto en la terraza' }] }) });
  await H.ev('iniciar()'); var mh = H.g('main').innerHTML;
  var fp = filaDe(mh, 'interior|pintura');
  ok('cuarta marca N/A justo despues de Malo y antes de Observaciones', /data-v="Malo"[\s\S]*?<\/td><td class="c-st c-na"><button type="button" class="st na"[^>]*data-campo="na" data-v="N\/A"[^>]*><span class="cx">☐<\/span> N\/A<\/button><\/td><td class="c-obs"/.test(fp), fp.slice(0, 900));
  ok('las 26 filas de elemento tienen N/A', (mh.match(/data-campo="na" data-v="N\/A"/g) || []).length === 26);
  ok('motivo de N/A: caja de una linea oculta hasta elegir N/A, con "p. ej. sin piscina"', /<div class="na-caja" hidden><input class="in na-motivo" data-campo="na_motivo"[^>]*placeholder="p\. ej\. sin piscina"/.test(fp), fp);
  var fpi = filaDe(mh, 'exterior|piscina');
  ok('fila N/A: la marca N/A con X, Bueno / Regular / Malo con ☐, el motivo a la vista con su texto', /data-v="N\/A"[^>]*aria-pressed="true"[^>]*><span class="cx">X<\/span> N\/A/.test(fpi) && /class="st on"/.test(fpi) === false && /<div class="na-caja"><input class="in na-motivo" data-campo="na_motivo"[^>]*value="sin piscina"/.test(fpi), fpi);
  ok('⚠ Peligro: una casilla en cada fila de elemento (26), tambien en Bueno', (mh.match(/<input type="checkbox" class="pel-chk" data-campo="peligro"/g) || []).length === 26 && /⚠ Peligro/.test(fp));
  ok('texto del peligro oculto hasta marcar la casilla', /<div class="peligro-caja" hidden><input class="in peligro-texto" data-campo="peligro_texto"/.test(fp));
  var fe = filaDe(mh, 'seguridad|instalacion_electrica');
  ok('fila con peligro: casilla marcada y el texto a la vista', /data-campo="peligro" checked/.test(fe) && /<div class="peligro-caja"><input class="in peligro-texto" data-campo="peligro_texto"[^>]*value="enchufe suelto en la terraza"/.test(fe) && /data-v="Bueno"[^>]*>X</.test(fe), fe);
  ok('el peligro va al final de la celda de observaciones (despues de la caja de texto)', /<td class="c-obs"[\s\S]*?<\/textarea><div class="ta-p">[^<]*<\/div><label class="peligro">/.test(fe));
  ok('cabecera: Observaciones cubre la columna N/A (colspan 2) en las tres tablas', (mh.match(/<th class="c-obs-h" colspan="2">Observaciones \/ acción recomendada<\/th>/g) || []).length === 3);
  });
  await parte(async function () {
  console.log('12.4 v5: coste estimado en las 5 actuaciones y las estancias; «Se refiere a:» en las fotos');
  H = pagina({ db: baseDb({ TaInformeTemporada: [informe9()], TaInformeTemporadaLineas: [
    { linea_id: 1, informe_id: 9, seccion: 'resumen', clave: 'accion_2', texto_1: 'Cambiar termo', coste: '500-2000' },
    { linea_id: 2, informe_id: 9, seccion: 'estancia', clave: 'cocina', texto_1: 'Grifo', coste: 'desconocido' },
    { linea_id: 3, informe_id: 9, seccion: 'foto', clave: 'foto_1', foto_url: 'https://x.com/a.jpg?v=5', texto_1: 'Gresite', clave_ref: 'piscina' }] }) });
  await H.ev('iniciar()'); var mh = H.g('main').innerHTML;
  ok('cinco selects coste en las actuaciones', [1, 2, 3, 4, 5].every(function (n) { return /data-campo="coste"/.test(filaDe(mh, 'resumen|accion_' + n)); }));
  ok('siete selects coste en las estancias', ['salon', 'cocina', 'dormitorio_principal', 'dormitorio_2', 'bano_1', 'bano_2', 'exterior_piscina'].every(function (e) { return /data-campo="coste"/.test(filaDe(mh, 'estancia|' + e)); }));
  var f1 = filaDe(mh, 'resumen|accion_1');
  ok('coste: "Coste estimado:" y — / desconocido / menos de 500 € / 500 a 2.000 € / 2.000 a 10.000 € / más de 10.000 €', /<label class="coste">Coste estimado: <select class="sel vacio" data-campo="coste"><option value="" selected>—<\/option><option value="desconocido">desconocido<\/option><option value="&lt;500">menos de 500 €<\/option><option value="500-2000">500 a 2\.000 €<\/option><option value="2000-10000">2\.000 a 10\.000 €<\/option><option value="10000\+">más de 10\.000 €<\/option><\/select><\/label>/.test(f1), f1);
  ok('el coste va despues de la actuacion (en su celda), la prioridad sigue en la suya', /data-l="Actuación prioritaria"><textarea[\s\S]*?<\/div><label class="coste">[\s\S]*?<\/label><\/td><td class="c-txt" data-l="Motivo \/ impacto">/.test(f1));
  ok('coste guardado "500-2000": se ve elegido', /<option value="500-2000" selected>500 a 2\.000 €<\/option>/.test(filaDe(mh, 'resumen|accion_2')));
  ok('estancia: el coste va despues de la accion recomendada, "desconocido" elegido', /data-l="Acción recomendada"><textarea[\s\S]*?<label class="coste">[\s\S]*?<option value="desconocido" selected>desconocido<\/option>/.test(filaDe(mh, 'estancia|cocina')));
  var foto = (mh.match(/<div class="foto" data-k="foto\|foto_1">[\s\S]*?class="f-ctl"/) || [''])[0];
  ok('foto: «Se refiere a:» bajo el pie, con la referencia guardada elegida', /data-campo="texto_1"[\s\S]*?<label class="f-ref">Se refiere a: <select class="sel" data-campo="clave_ref">/.test(foto) && /<option value="piscina" selected>Piscina<\/option>/.test(foto), foto.slice(0, 400));
  var opts = (foto.match(/<option value="[^"]*"/g) || []).map(function (x) { return x.slice(15, -1); });
  ok('las opciones: — + 26 elementos + 7 estancias + otra (35)', opts.length === 35 && opts[0] === '' && opts[opts.length - 1] === 'otra' && opts.indexOf('instalacion_electrica') > 0 && opts.indexOf('exterior_piscina') > 0 && opts.indexOf('salon') > 0, opts.length + ': ' + opts.join(','));
  ok('grupos Interior, Exterior, Seguridad e instalaciones y Estancias', /<optgroup label="Interior">[\s\S]*<optgroup label="Exterior">[\s\S]*<optgroup label="Seguridad e instalaciones">[\s\S]*<optgroup label="Estancias">/.test(foto));
  ok('el hueco vacio de foto no lleva «Se refiere a:»', !/data-campo="clave_ref"/.test((mh.match(/<div class="foto vacia"[\s\S]*?<\/div><\/div>/) || [''])[0]));
  ok('el pie sigue aparte de la referencia (texto_1 = pie, clave_ref = referencia)', (foto.match(/data-campo="texto_1"/g) || []).length === 1 && (foto.match(/data-campo="clave_ref"/g) || []).length === 1);
  var sel = { tagName: 'SELECT', value: '10000+', dataset: { campo: 'coste' }, classList: { toggle: function () {} }, closest: function () { return { dataset: { k: 'estancia|salon' }, querySelector: function () { return null; } }; } };
  H.ctx.alEscribir({ target: sel });
  ok('elegir un coste lo apunta en la fila (sucia, guardado programado)', H.ev("LINEAS['estancia|salon'].coste") === '10000+' && H.ev("LINEAS['estancia|salon']._sucio") === true && H.pendientes(1500) === 1);
  sel = { tagName: 'SELECT', value: 'barbacoa', dataset: { campo: 'clave_ref' }, classList: { toggle: function () {} }, closest: function () { return { dataset: { k: 'foto|foto_1' }, querySelector: function () { return null; } }; } };
  H.ctx.alEscribir({ target: sel });
  ok('elegir «Se refiere a:» lo apunta en clave_ref (el pie no cambia)', H.ev("LINEAS['foto|foto_1'].clave_ref") === 'barbacoa' && H.ev("LINEAS['foto|foto_1'].texto_1") === 'Gresite');
  await guarda(H);
  ok('y se guardan', H.S.db.TaInformeTemporadaLineas.some(function (r) { return r.clave === 'foto_1' && r.clave_ref === 'barbacoa'; }) && H.S.db.TaInformeTemporadaLineas.some(function (r) { return r.clave === 'salon' && r.coste === '10000+'; }));
  await H.ev("quitarFoto('foto|foto_1')");
  ok('Quitar la foto borra tambien su referencia', H.S.db.TaInformeTemporadaLineas.filter(function (r) { return r.clave === 'foto_1'; })[0].clave_ref === '' && H.ev("LINEAS['foto|foto_1'].clave_ref") === '');
  });
  await parte(async function () {
  console.log('12.5 v5: ⚠ Peligro y motivo al escribir; borrador local con los campos nuevos');
  H = pagina(); await H.ev('iniciar()');
  var caja = { dataset: { k: 'interior|electrodomesticos' }, querySelector: function () { return null; } };
  var chk = { dataset: { campo: 'peligro' }, tagName: 'INPUT', type: 'checkbox', checked: true, value: 'on', closest: function () { return caja; } };
  H.ctx.alEscribir({ target: chk });
  ok('marcar ⚠ Peligro: peligro true (no "on"), fila sucia, guardado programado', H.ev("LINEAS['interior|electrodomesticos'].peligro") === true && H.ev("LINEAS['interior|electrodomesticos']._sucio") === true && H.pendientes(1500) === 1);
  var ver = H.ev("LINEAS['interior|electrodomesticos']._ver");
  H.ctx.alEscribir({ target: chk });
  ok('el mismo valor otra vez (input y change del mismo toque): no cambia nada', H.ev("LINEAS['interior|electrodomesticos']._ver") === ver);
  var txt = { dataset: { campo: 'peligro_texto' }, tagName: 'INPUT', value: 'horno da calambre', closest: function () { return caja; } };
  H.ctx.alEscribir({ target: txt });
  ok('texto del peligro apuntado', H.ev("LINEAS['interior|electrodomesticos'].peligro_texto") === 'horno da calambre');
  var b = JSON.parse(H.almacen['informe:12:2026'] || '{}')['interior|electrodomesticos'] || {};
  ok('borrador local con peligro y su texto', b.peligro === true && b.peligro_texto === 'horno da calambre', JSON.stringify(b));
  chk.checked = false; H.ctx.alEscribir({ target: chk });
  ok('desmarcar ⚠ Peligro: peligro false y el texto se borra', H.ev("LINEAS['interior|electrodomesticos'].peligro") === false && H.ev("LINEAS['interior|electrodomesticos'].peligro_texto") === '');
  ok('el change de una casilla tambien llega a alEscribir', /addEventListener\('change'[\s\S]{0,700}t\.type==='checkbox'&&t\.dataset&&t\.dataset\.campo\)return alEscribir\(e\)/.test(SRC));
  var alm = { 'informe:12:2026': JSON.stringify({ 'exterior|piscina': { seccion: 'exterior', clave: 'piscina', estado: '', texto_1: '', texto_2: '', prioridad: '', na: true, na_motivo: 'sin piscina' } }) };
  H = pagina({ almacen: alm, db: baseDb({ TaInformeTemporada: [informe9()], TaInformeTemporadaLineas: [{ linea_id: 5, informe_id: 9, seccion: 'exterior', clave: 'piscina', estado: '' }] }) });
  await H.ev('iniciar()');
  ok('borrador con N/A sin guardar: se mezcla (na true, motivo) y queda sucio', H.ev("LINEAS['exterior|piscina'].na") === true && H.ev("LINEAS['exterior|piscina'].na_motivo") === 'sin piscina' && H.ev("LINEAS['exterior|piscina']._sucio") === true);
  alm = { 'informe:12:2026': JSON.stringify({ 'exterior|piscina': { seccion: 'exterior', clave: 'piscina', estado: '', texto_1: '', texto_2: '', prioridad: '' } }) };
  H = pagina({ almacen: alm, db: baseDb({ TaInformeTemporada: [informe9()], TaInformeTemporadaLineas: [{ linea_id: 5, informe_id: 9, seccion: 'exterior', clave: 'piscina', estado: '', na: true, na_motivo: 'sin piscina' }] }) });
  await H.ev('iniciar()');
  ok('borrador de la v4 (sin campos nuevos) igual a Caspio: no se marca ni borra el N/A guardado', H.ev("LINEAS['exterior|piscina']._sucio") === false && H.ev("LINEAS['exterior|piscina'].na") === true && H.ev("LINEAS['exterior|piscina'].na_motivo") === 'sin piscina');
  });
  await parte(async function () {
  console.log('12.6 v5: Enviar se para con N/A sin motivo o peligro sin texto (y dice cuales)');
  H = pagina({ db: baseDb({ TaInformeTemporada: [informe9({ estado_general: 'Bueno' })], TaInformeTemporadaLineas: [
    { linea_id: 1, informe_id: 9, seccion: 'exterior', clave: 'piscina', estado: '', na: true, na_motivo: '' },
    { linea_id: 2, informe_id: 9, seccion: 'exterior', clave: 'barbacoa', estado: '', na: true, na_motivo: '  ' },
    { linea_id: 3, informe_id: 9, seccion: 'seguridad', clave: 'instalacion_electrica', estado: 'Malo', peligro: true, peligro_texto: '' },
    { linea_id: 4, informe_id: 9, seccion: 'interior', clave: 'pintura', estado: 'Regular', texto_1: '' }] }) });
  await H.ev('iniciar()');
  var f = H.ev('faltasEnvio(LINEAS)');
  ok('faltasEnvio: N/A sin motivo (tambien solo espacios) y peligro sin texto, en el orden de la hoja', f.na.join() === 'exterior|piscina,exterior|barbacoa' && f.peligro.join() === 'seguridad|instalacion_electrica', JSON.stringify(f));
  var msg = H.ev('mensajeFaltas(faltasEnvio(LINEAS))');
  ok('mensaje: "Falta el motivo de N/A en: Piscina, Barbacoa" y "Falta describir el peligro en: Instalación eléctrica"', msg.indexOf('Falta el motivo de N/A en: Piscina, Barbacoa') >= 0 && msg.indexOf('Falta describir el peligro en: Instalación eléctrica') >= 0, msg);
  ok('sin faltas: mensaje vacio (Malo sin observacion, actuaciones sin coste y fotos sin referencia pasan)', H.ev("mensajeFaltas(faltasEnvio({'interior|pintura':{seccion:'interior',clave:'pintura',estado:'Malo',texto_1:''},'resumen|accion_1':{seccion:'resumen',clave:'accion_1',texto_1:'x',coste:''},'foto|foto_1':{seccion:'foto',clave:'foto_1',foto_url:'u',clave_ref:''},'exterior|piscina':{seccion:'exterior',clave:'piscina',na:true,na_motivo:'sin piscina'},'seguridad|cerraduras':{seccion:'seguridad',clave:'cerraduras',peligro:true,peligro_texto:'bombin roto'}}))") === '');
  i = H.S.marca(); var antes = H.log.length;
  await H.ev('enviarInforme()');
  ok('Enviar: no se envia y no pregunta', H.S.desde(i).every(function (x) { return !(x.body && x.body.estado === 'enviado'); }) && H.ev('INFORME.estado') === 'borrador' && H.log.slice(antes).every(function (l) { return l.indexOf('confirm') !== 0; }));
  ok('el aviso dice que falta y donde', /Falta el motivo de N\/A en: Piscina, Barbacoa/.test(H.g('toast').textContent) && /Falta describir el peligro en: Instalación eléctrica/.test(H.g('toast').textContent), H.g('toast').textContent);
  ok('enviarInforme: la revision v5 va antes del confirm', fnSource(SRC, 'enviarInforme').indexOf('faltasEnvio(') > 0 && fnSource(SRC, 'enviarInforme').indexOf('faltasEnvio(') < fnSource(SRC, 'enviarInforme').indexOf('confirm('));
  H.ev("editarFila('exterior|piscina','na_motivo','sin piscina')"); H.ev("editarFila('exterior|barbacoa','na_motivo','no hay')"); H.ev("editarFila('seguridad|instalacion_electrica','peligro_texto','cuadro quemado')");
  await H.ev('enviarInforme()');
  ok('con los motivos y el texto: se envia', H.S.db.TaInformeTemporada[0].estado === 'enviado' && H.ev('INFORME.estado') === 'enviado');
  ok('y lo escrito llega a Caspio', H.S.db.TaInformeTemporadaLineas.filter(function (r) { return r.clave === 'piscina'; })[0].na_motivo === 'sin piscina' && H.S.db.TaInformeTemporadaLineas.filter(function (r) { return r.clave === 'instalacion_electrica'; })[0].peligro_texto === 'cuadro quemado');
  });
  await parte(async function () {
  console.log('12.7 v5: informe enviado, solo lectura: N/A, peligro, coste y referencia desactivados');
  H = pagina({ rol: 'staff', email: 'vm@3villas.com', db: baseDb({ TaInformeTemporada: [informe9({ estado: 'enviado', estado_general: 'Bueno' })], TaInformeTemporadaLineas: [
    { linea_id: 4, informe_id: 9, seccion: 'foto', clave: 'foto_1', foto_url: 'https://x.com/a.jpg?v=5', texto_1: 'Pie', clave_ref: 'piscina' },
    { linea_id: 5, informe_id: 9, seccion: 'exterior', clave: 'piscina', na: true, na_motivo: 'sin piscina' }] }) });
  await H.ev('iniciar()'); var mh = H.g('main').innerHTML;
  ok('botones N/A desactivados', (mh.match(/<button[^>]*data-campo="na"[^>]*>/g) || []).length === 26 && (mh.match(/<button[^>]*data-campo="na"[^>]*>/g) || []).every(function (t) { return / disabled/.test(t); }));
  ok('casillas ⚠ Peligro y cajas nuevas desactivadas', (mh.match(/<input[^>]*data-campo="(peligro|peligro_texto|na_motivo)"[^>]*>/g) || []).every(function (t) { return / disabled/.test(t); }));
  ok('selects coste y «Se refiere a:» desactivados', (mh.match(/<select[^>]*data-campo="(coste|clave_ref)"[^>]*>/g) || []).length === 13 && (mh.match(/<select[^>]*data-campo="(coste|clave_ref)"[^>]*>/g) || []).every(function (t) { return / disabled/.test(t); }));
  await pulsa(H, 'exterior|barbacoa', 'na', 'N/A', false);
  ok('pulsar N/A en solo lectura: nada cambia', !H.ev("LINEAS['exterior|barbacoa']"));
  });
}
