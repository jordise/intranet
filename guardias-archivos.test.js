/* Pruebas de vídeos y documentos en las ranuras de archivos de guardias-e-intervenciones.html v24.
   Caso: Nazaret, 16/09/2026: "subir videos y documentos en el registro de guardias... los técnicos
   mandan informes de lo que han hecho o videos".
   v24: la página rechaza todo tipo de archivo fuera de la lista antes de subirlo.
   node guardias-archivos.test.js

   Como listado-guardias-detalle.test.js: NO copia el código de la página. Extrae con vm las
   funciones reales (limpiaUrl, isImageUrl, fileKind, etiquetaArchivos, extPorMime, extDeArchivo,
   archivoPermitido) y las constantes reales (MAX_ARCHIVO, ARCHIVO_ACCEPT, EXT_IMAGEN, EXT_VIDEO,
   EXT_PERMITIDAS) del HTML y las ejecuta. Sin red, sin datos reales. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }
var F = 'guardias-e-intervenciones.html', S = fs.readFileSync(F, 'utf8');

function fnSource(name) {
  var i = S.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = S.indexOf('{', i), depth = 0, k = j;
  for (; k < S.length; k++) { if (S[k] === '{') depth++; else if (S[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return S.slice(i, k);
}
function varSource(name) {
  var m = S.match(new RegExp('^var ' + name + '=.*$', 'm'));
  if (!m) throw new Error('no encuentro var ' + name);
  return m[0];
}

var ctx = {};
['MAX_ARCHIVO', 'ARCHIVO_ACCEPT', 'EXT_IMAGEN', 'EXT_VIDEO', 'EXT_PERMITIDAS'].forEach(function (n) { vm.runInNewContext(varSource(n), ctx); });
var mMime = S.match(/^var MIME_EXT=\{[\s\S]*?\};$/m); if (!mMime) throw new Error('no encuentro var MIME_EXT'); vm.runInNewContext(mMime[0], ctx);
['limpiaUrl', 'isImageUrl', 'fileKind', 'etiquetaArchivos', 'extPorMime', 'extDeArchivo', 'archivoPermitido'].forEach(function (n) { vm.runInNewContext(fnSource(n), ctx); });

var BASE = 'https://archivos.3villas.com/fotos-guardias/2026_guardia_1758000000000_kike_b1';

console.log('isImageUrl: una foto se reconoce por su extensión');
ok('jpg = imagen', ctx.isImageUrl(BASE + '.jpg') === true);
ok('JPEG en mayúsculas = imagen', ctx.isImageUrl(BASE + '.JPEG') === true);
ok('png = imagen', ctx.isImageUrl(BASE + '.png') === true);
ok('webp = imagen', ctx.isImageUrl(BASE + '.webp') === true);
ok('heic = imagen', ctx.isImageUrl(BASE + '.heic') === true);
ok('pdf no es imagen', ctx.isImageUrl(BASE + '.pdf') === false);
ok('mp4 no es imagen', ctx.isImageUrl(BASE + '.mp4') === false);
ok('docx no es imagen', ctx.isImageUrl(BASE + '.docx') === false);
ok('vacío no es imagen', ctx.isImageUrl('') === false);
ok('la extensión se lee sin ?firma ni #ancla', ctx.isImageUrl(BASE + '.jpg?v=2#top') === true);
ok('vista previa data:image = imagen', ctx.isImageUrl('data:image/jpeg;base64,AAAA') === true);

console.log('fileKind: lo que no es foto se parte en vídeo y documento');
ok('mp4 = vídeo', ctx.fileKind(BASE + '.mp4') === 'video');
ok('mov = vídeo', ctx.fileKind(BASE + '.mov') === 'video');
ok('MOV en mayúsculas = vídeo', ctx.fileKind(BASE + '.MOV') === 'video');
ok('webm = vídeo', ctx.fileKind(BASE + '.webm') === 'video');
ok('3gp = vídeo', ctx.fileKind(BASE + '.3gp') === 'video');
ok('pdf = documento', ctx.fileKind(BASE + '.pdf') === 'doc');
ok('docx = documento', ctx.fileKind(BASE + '.docx') === 'doc');
ok('doc = documento', ctx.fileKind(BASE + '.doc') === 'doc');
ok('sin extensión = documento', ctx.fileKind(BASE) === 'doc');

console.log('etiquetaArchivos: la cuenta de la tarjeta');
ok('todas fotos = 📷 2', ctx.etiquetaArchivos([BASE + '.jpg', BASE + '.png']) === '📷 2');
ok('con un vídeo = 📎 2', ctx.etiquetaArchivos([BASE + '.jpg', BASE + '.mp4']) === '📎 2');
ok('con un documento = 📎 1', ctx.etiquetaArchivos([BASE + '.pdf']) === '📎 1');
ok('los huecos vacíos no cuentan', ctx.etiquetaArchivos([BASE + '.jpg', '', '  ']) === '📷 1');
ok('sin archivos = etiqueta vacía', ctx.etiquetaArchivos([]) === '');
ok('sin lista = etiqueta vacía', ctx.etiquetaArchivos() === '');

console.log('el botón 📂 y el tope de tamaño');
ok('v24: accept sin comodín image/*', ctx.ARCHIVO_ACCEPT.indexOf('image/*') < 0, ctx.ARCHIVO_ACCEPT);
ok('v24: accept sin comodín video/*', ctx.ARCHIVO_ACCEPT.indexOf('video/*') < 0, ctx.ARCHIVO_ACCEPT);
ok('accept con application/pdf', ctx.ARCHIVO_ACCEPT.indexOf('application/pdf') >= 0, ctx.ARCHIVO_ACCEPT);
ok('accept con .doc y .docx', ctx.ARCHIVO_ACCEPT.indexOf('.doc') >= 0 && ctx.ARCHIVO_ACCEPT.indexOf('.docx') >= 0, ctx.ARCHIVO_ACCEPT);
ok('el input de archivo usa ARCHIVO_ACCEPT', /inpFile\.accept=ARCHIVO_ACCEPT/.test(S));
ok('la cámara sigue siendo solo image/* con capture', /inpCam\.accept='image\/\*'; inpCam\.setAttribute\('capture','environment'\)/.test(S));
ok('tope = 60 MB', ctx.MAX_ARCHIVO === 60 * 1024 * 1024, ctx.MAX_ARCHIVO);
ok('el tope se comprueba antes de subir, con aviso en español', /if\(file && file\.size>MAX_ARCHIVO\)\{[\s\S]{0,160}toast\('⚠️ El archivo supera los 60 MB\. Reduce el vídeo o el documento e inténtalo de nuevo','err'\);[\s\S]{0,40}return;/.test(S));

console.log('cómo se pinta cada archivo');
ok('la foto sigue yendo por compressImage y el resto no', /var preparado=esImagen\?compressImage\(file,1200,0\.80\):Promise\.resolve\(file\);/.test(S));
ok('el vídeo sale como enlace 🎬 Ver vídeo', /enlaceArchivo\(existingUrl,'🎬 Ver vídeo'\)/.test(S));
ok('el documento sale como enlace 📄 Ver archivo', /enlaceArchivo\(existingUrl,'📄 Ver archivo'\)/.test(S));
ok('el enlace abre en pestaña nueva con rel=noopener', /a\.target='_blank'; a\.rel='noopener'/.test(S));
ok('la lupa solo se abre con imágenes', /function openLB\(src\)\{if\(!src\)return;if\(!isImageUrl\(src\)\)\{window\.open\(src,'_blank','noopener'\);return;\}/.test(S));
ok('el nombre del archivo conserva la extensión elegida', /var fname='fotos-guardias\/'\+year\+'_guardia_'\+Date\.now\(\)\+'_'\+safe\+'_'\+idxLabel\+'\.'\+ext;/.test(S));
ok('la tarjeta usa etiquetaArchivos', /descHtml\+='<div style="margin-top:4px">'\+etiquetaArchivos\(archivosCard\)\+'<\/div>'/.test(S));

console.log('v24: la lista de tipos admitidos y el filtro antes de subir');
function f(name, type) { return { name: name, type: type }; }
ok('la lista tiene los 15 tipos acordados', ctx.EXT_PERMITIDAS.join(',') === 'jpg,jpeg,png,gif,webp,heic,heif,mp4,mov,m4v,webm,3gp,pdf,doc,docx', ctx.EXT_PERMITIDAS.join(','));
ok("foto.JPG se admite (mayúsculas)", ctx.archivoPermitido(f('foto.JPG', 'image/jpeg')) === true);
ok("informe.pdf se admite", ctx.archivoPermitido(f('informe.pdf', 'application/pdf')) === true);
ok("video.MOV se admite", ctx.archivoPermitido(f('video.MOV', 'video/quicktime')) === true);
ok("doc.docx se admite", ctx.archivoPermitido(f('doc.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document')) === true);
ok("pagina.html se rechaza", ctx.archivoPermitido(f('pagina.html', 'text/html')) === false);
ok("virus.exe se rechaza", ctx.archivoPermitido(f('virus.exe', 'application/octet-stream')) === false);
ok("archivo.zip se rechaza", ctx.archivoPermitido(f('archivo.zip', 'application/zip')) === false);
ok('sin extensión en el nombre: manda el tipo MIME (image/heic se admite)', ctx.archivoPermitido(f('sin-extension', 'image/heic')) === true);
ok('sin extensión en el nombre: text/html se rechaza', ctx.archivoPermitido(f('sin-extension', 'text/html')) === false);
ok('sin nombre y sin tipo se rechaza, sin error', ctx.archivoPermitido({}) === false);
ok('null se rechaza, sin error', ctx.archivoPermitido(null) === false);
ok('extDeArchivo lee la extensión del nombre en minúsculas', ctx.extDeArchivo(f('video.MOV', 'video/quicktime')) === 'mov');
ok('extDeArchivo cae al tipo MIME si el nombre no trae extensión', ctx.extDeArchivo(f('sin-extension', 'application/pdf')) === 'pdf');
ok("extDeArchivo devuelve '' cuando no se sabe", ctx.extDeArchivo(f('sin-extension', 'text/html')) === '');
ok('setPhotoSlot filtra el tipo antes del tope de 60 MB, con aviso en español', /if\(file && !archivoPermitido\(file\)\)\{[\s\S]{0,200}toast\('⚠️ Tipo de archivo no admitido\. Solo foto \(jpg, png, heic\), vídeo \(mp4, mov\) o documento \(pdf, doc, docx\)','err'\);[\s\S]{0,40}return;[\s\S]{0,200}if\(file && file\.size>MAX_ARCHIVO\)/.test(S));

console.log('versión');
var hv = S.match(/VERSIÓN ACTUAL: v(\d+) \|/), pv = S.match(/const PAGE_VERSION='v(\d+)'/), tv = S.match(/<title>Guardias e Intervenciones v(\d+)/);
ok('v24 en cabecera, PAGE_VERSION y título', hv && pv && tv && hv[1] === '24' && pv[1] === '24' && tv[1] === '24', [hv && hv[1], pv && pv[1], tv && tv[1]].join('/'));
ok('historial v24', /<!-- HISTORIAL: v24 - /.test(S));
ok('el historial v24 aparece una sola vez', S.split('<!-- HISTORIAL: v24 - ').length === 2);
ok('el historial v24 va encima del v23 (el más nuevo primero)', S.indexOf('<!-- HISTORIAL: v24 - ') >= 0 && S.indexOf('<!-- HISTORIAL: v24 - ') < S.indexOf('<!-- HISTORIAL: v23 - '));
ok('el comentario del historial v24 cierra una sola vez', S.slice(S.indexOf('<!-- HISTORIAL: v24'), S.indexOf('<!-- HISTORIAL: v', S.indexOf('<!-- HISTORIAL: v24') + 1)).split('-->').length === 2);
ok('historial v23', /<!-- HISTORIAL: v23 - /.test(S));
ok('el comentario del historial v23 cierra una sola vez', S.slice(S.indexOf('<!-- HISTORIAL: v23'), S.indexOf('<!-- HISTORIAL: v', S.indexOf('<!-- HISTORIAL: v23') + 1)).split('-->').length === 2);

console.log('los scripts de la página compilan');
ok('sin errores de sintaxis', (function () {
console.log('Revisión v23: sin extensión, formatos raros y extensión por MIME');
ok('URL sin extensión = imagen (fotos antiguas, igual que v22)', ctx.isImageUrl(BASE) === true);
ok('jfif = imagen', ctx.isImageUrl(BASE + '.jfif') === true);
ok('avif = imagen', ctx.isImageUrl(BASE + '.avif') === true);
ok('extPorMime pdf', ctx.extPorMime('application/pdf') === 'pdf');
ok('extPorMime docx', ctx.extPorMime('application/vnd.openxmlformats-officedocument.wordprocessingml.document') === 'docx');
ok('extPorMime video/mp4', ctx.extPorMime('video/mp4') === 'mp4');
ok('extPorMime vídeo desconocido -> mp4', ctx.extPorMime('video/x-raro') === 'mp4');
ok('extPorMime imagen desconocida -> jpg', ctx.extPorMime('image/x-raro') === 'jpg');
ok('extPorMime vacío -> bin, nunca jpg', ctx.extPorMime('') === 'bin');
  try {
    var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, n = 0;
    while ((m = re.exec(S))) { n++; new vm.Script(m[1], { filename: F + '#script' + n }); }
    return n > 0;
  } catch (e) { return e.message; }
})() === true);

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
