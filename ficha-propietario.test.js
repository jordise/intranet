/* Pruebas de ficha-propietario.html v01, la ficha publica que rellena el propietario.
   node ficha-propietario.test.js

   Como unidad-direccion.test.js y fotos-mismo-host.test.js: NO copia el codigo de la
   pagina. Extrae del HTML las funciones y las listas reales y las ejecuta en un vm.
   Nunca imprime datos de ningun propietario: todos los datos de prueba son inventados. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

var FILE = 'ficha-propietario.html';
var S = fs.readFileSync(FILE, 'utf8');

/* Extrae el texto de una funcion del HTML, contando llaves. */
function fnSource(name, s) {
  s = s || S;
  var i = s.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name);
  var j = s.indexOf('{', i), depth = 0, k = j;
  for (; k < s.length; k++) { if (s[k] === '{') depth++; else if (s[k] === '}') { depth--; if (depth === 0) { k++; break; } } }
  return s.slice(i, k);
}
/* Extrae un bloque "var NOMBRE = ..." hasta su cierre. */
function varBlock(name, cierre, s) {
  s = s || S;
  var a = s.indexOf('var ' + name + ' = ');
  if (a < 0) a = s.indexOf('var ' + name + ' = [');
  if (a < 0) throw new Error('no encuentro ' + name);
  var b = s.indexOf(cierre, a);
  if (b < 0) throw new Error('sin cierre ' + name);
  return s.slice(a, b + cierre.length);
}

/* ════════ 1. Version coherente en los tres sitios ════════ */
console.log(FILE + ': version');
var vTop = (S.match(/VERSIÓN ACTUAL:\s*v(\d+)/) || [])[1];
var vTitle = (S.match(/<title>Ficha Propietario v(\d+)/) || [])[1];
var vJs = (S.match(/var PAGE_VERSION = (\d+);/) || [])[1];
ok('version igual en comentario, titulo y PAGE_VERSION (v' + vTop + ')',
  vTop && vTitle && vJs && parseInt(vTop, 10) === parseInt(vTitle, 10) && parseInt(vTop, 10) === parseInt(vJs, 10),
  vTop + '/' + vTitle + '/' + vJs);
ok('el comentario y el titulo llevan el numero con dos cifras (v01)', vTop === vTitle && vTop.length === 2, vTop + '/' + vTitle);
ok('historial v01', /<!-- HISTORIAL: v01 - /.test(S));
ok('el comentario HISTORIAL cierra una sola vez (sin cierre prematuro)',
  S.slice(S.indexOf('<!-- HISTORIAL: v01')).split('-->').length === 2);
ok('el historial no nombra a personas ajenas ni lleva horas',
  !/\d{1,2}:\d{2}/.test(S.slice(S.indexOf('<!-- HISTORIAL: v01'))));

/* ════════ 2. Pagina publica: sin sesion del equipo ni menu ════════ */
console.log(FILE + ': es publica');
var codigo = S.split('<!-- HISTORIAL:')[0];
ok('no carga auth.js', codigo.indexOf('src="auth.js"') < 0);
ok('no llama a Auth.require', codigo.indexOf('Auth.require') < 0);
ok('no carga nav.js ni nav-component.js',
  codigo.indexOf('src="nav.js"') < 0 && codigo.indexOf('src="nav-component.js"') < 0);
ok('carga ficha-campos.js, la unica fuente de campos', codigo.indexOf('src="ficha-campos.js"') > 0);
ok('la API es la del mismo host', codigo.indexOf("var API = 'https://www.3villas.com/intranet/api'") > 0);
ok('llama a las tres acciones del Worker de la ficha',
  codigo.indexOf("?action=ficha-load&token=") > 0 &&
  codigo.indexOf("?action=ficha-save") > 0 &&
  codigo.indexOf("?action=ficha-upload") > 0);
ok('no escribe nada en la consola (ningun dato del propietario)',
  codigo.indexOf('console.log') < 0 && codigo.indexOf('console.error') < 0 && codigo.indexOf('console.warn') < 0);

/* ════════ 3. El token se lee y se quita de la barra de direcciones ════════ */
console.log(FILE + ': token del enlace');
var ctxTok = { location: { search: '?acceso=T0K3N&x=1', href: 'https://www.3villas.com/intranet/ficha-propietario.html?acceso=T0K3N&x=1' },
  URLSearchParams: URLSearchParams, URL: URL, sessionStorage: null };
ctxTok.history = { _url: null, replaceState: function (a, b, u) { ctxTok.history._url = u; } };
vm.createContext(ctxTok);
vm.runInContext(fnSource('tokenDeUrl') + '\n' + fnSource('quitarTokenDeUrl'), ctxTok);
ok('tokenDeUrl lee ?acceso=', ctxTok.tokenDeUrl() === 'T0K3N', ctxTok.tokenDeUrl());
ctxTok.quitarTokenDeUrl();
ok('quitarTokenDeUrl borra el token de la barra y conserva el resto',
  ctxTok.history._url === '/intranet/ficha-propietario.html?x=1', String(ctxTok.history._url));
ok('usa history.replaceState, asi que el token tampoco queda en el historial',
  codigo.indexOf("history.replaceState(null, '', u.pathname") > 0);
ok('arrancar guarda el token en sessionStorage y despues lo quita de la url',
  /TOKEN = deUrl \|\| tokenGuardado\(\);[\s\S]{0,120}guardarTokenEnSesion\(deUrl\);[\s\S]{0,80}quitarTokenDeUrl\(\);/.test(codigo));
ok('el token nunca viaja en el cuerpo de un enlace de la pagina',
  codigo.indexOf('?acceso=') < 0 || /get\('acceso'\)|has\('acceso'\)|delete\('acceso'\)/.test(codigo));

/* ════════ 4. Los nueve pasos cubren TODAS las columnas del esquema ════════ */
console.log(FILE + ': los nueve pasos cubren el esquema');
var ctxP = {};
vm.createContext(ctxP);
ctxP.window = ctxP;
vm.runInContext(fs.readFileSync('ficha-campos.js', 'utf8'), ctxP, { filename: 'ficha-campos.js' });
vm.runInContext(varBlock('PASOS', '\n];') + '\n' + varBlock('REPEAT', '};') + '\n' + varBlock('CAMPOS_DOCS', '];') +
  '\n' + varBlock('UI', '\n};') + '\n' + varBlock('OBLIG', '];'), ctxP);

ok('PASOS tiene nueve pasos numerados del 1 al 9',
  ctxP.PASOS.length === 9 && ctxP.PASOS.every(function (p, i) { return p.n === i + 1; }));

var delEsquema = ctxP.FICHA_CAMPOS.filter(function (c) { return c.step >= 1; }).map(function (c) { return c.name; });
var enPagina = [];
ctxP.PASOS.forEach(function (p) { p.campos.forEach(function (c) { enPagina.push(c); }); });
var faltan = delEsquema.filter(function (c) { return enPagina.indexOf(c) < 0; });
ok('las ' + delEsquema.length + ' columnas con step >= 1 estan en algun paso de la pagina',
  faltan.length === 0, faltan.join(', '));
var sobran = enPagina.filter(function (c) { return delEsquema.indexOf(c) < 0; });
ok('la pagina no inventa ninguna columna que el esquema no tenga', sobran.length === 0, sobran.join(', '));
var repes = enPagina.filter(function (c, i) { return enPagina.indexOf(c) !== i; });
ok('ninguna columna sale dos veces', repes.length === 0, repes.join(', '));

var malPaso = [];
ctxP.PASOS.forEach(function (p) {
  p.campos.forEach(function (c) {
    var d = ctxP.FICHA_CAMPOS.filter(function (x) { return x.name === c; })[0];
    if (d && d.step !== p.n) malPaso.push(c + ' esta en el paso ' + p.n + ' y el esquema dice ' + d.step);
  });
});
ok('cada columna esta en el paso que dice el esquema', malPaso.length === 0, malPaso.join(' | '));

/* Las tres listas se pintan como grupo repetible, no como una casilla de texto */
['bedrooms_json', 'bathrooms_json', 'sharedBathrooms_json'].forEach(function (c) {
  ok(c + ' se pinta como grupo repetible', ctxP.UI[c] && ctxP.UI[c].ctrl === 'grupo');
  ok(c + ' esta declarado en REPEAT', !!ctxP.REPEAT[c]);
});
ok('el paso 3 pide "Anadir dormitorio" y el 4 los dos tipos de bano',
  codigo.indexOf("add_dorm:") > 0 && codigo.indexOf("add_suite:") > 0 && codigo.indexOf("add_comp:") > 0);
ok('las ocho configuraciones de cama son las del contrato',
  /var BED_OPS = \['doubleWide','doubleLong','single1','single2','single3','single4','trundle','bunk'\];/.test(codigo));
ok('las medidas de la cama solo salen con cama doble',
  /it\.bedConfiguration === 'doubleWide' \|\| it\.bedConfiguration === 'doubleLong'/.test(codigo));
ok('la banera o ducha del bano en suite solo sale si hay bano en suite',
  /if\(verdad\(it\.hasEnSuite\)\)\{[\s\S]{0,200}enSuiteBathtubOrShower/.test(codigo));
ok('cada paso tiene su casilla de observaciones',
  ctxP.PASOS.every(function (p) {
    return p.campos.some(function (c) { return c.indexOf('observations_') === 0; });
  }));

/* Los campos condicionales del paso 8 */
ok('el bloque de piscina solo sale si hay piscina',
  ['poolType', 'poolDimensions', 'poolMinDepth', 'poolMaxDepth', 'hasChildBarrier', 'isHeatedPool', 'hasOutdoorShower', 'foto_pool']
    .every(function (c) { return ctxP.UI[c] && ctxP.UI[c].si === 'hasPool'; }));
ok('el tipo de barbacoa solo sale si hay barbacoa', ctxP.UI.bbqType && ctxP.UI.bbqType.si === 'hasBBQ');
ok('"vistas al mar desde" solo sale si hay vistas al mar', ctxP.UI.seaViewsFrom && ctxP.UI.seaViewsFrom.si === 'hasSeaViews');
ok('el aparcamiento es un desplegable con las tres opciones del contrato',
  ctxP.UI.parking && ctxP.UI.parking.ctrl === 'select' &&
  ctxP.UI.parking.ops.join(',') === 'street,insideProperty,garage');
ok('los numeros usan el teclado numerico del movil', codigo.indexOf("setAttribute('inputmode', 'numeric')") > 0);
ok('las fotos aceptan imagen o PDF', /inp\.accept = 'image\/\*,\.pdf';/.test(codigo));
ok('las imagenes se reducen a 1600 px antes de subirlas', /comprimir\(bruto, 1600, 0\.82\)/.test(codigo));
ok('la barra de progreso dice el paso de nueve', codigo.indexOf("paso_de:['Paso {n} de 9'") > 0);
ok('el pie es el del contrato', codigo.indexOf('3Villas · Ficha de propietario') > 0);

/* ════════ 5. El validador real, ejercitado ════════ */
console.log(FILE + ': validacion por paso');
var ctxV = {};
vm.createContext(ctxV);
vm.runInContext(fnSource('validarPaso'), ctxV);
function claves(n, d) { return ctxV.validarPaso(n, d).map(function (e) { return e.campo + ':' + e.clave; }); }

var P1 = { ownerName: 'Ana Ejemplo', propertyName: 'Villa Prueba', email: 'a@ejemplo.test', phone: '600111222', legalCapacity: '6' };
ok('paso 1 completo pasa', claves(1, P1).length === 0, claves(1, P1).join(','));
ok('paso 1 vacio canta los cinco campos', claves(1, {}).length === 5, claves(1, {}).join(','));
ok('nombre de dos letras falla', claves(1, Object.assign({}, P1, { ownerName: 'Ab' })).join(',') === 'ownerName:err_min3');
ok('nombre de villa de dos letras falla', claves(1, Object.assign({}, P1, { propertyName: 'Ab' })).join(',') === 'propertyName:err_min3');
ok('correo sin arroba falla', claves(1, Object.assign({}, P1, { email: 'ejemplo.test' })).join(',') === 'email:err_email');
ok('correo sin punto final falla', claves(1, Object.assign({}, P1, { email: 'a@ejemplo' })).join(',') === 'email:err_email');
ok('telefono de ocho cifras falla', claves(1, Object.assign({}, P1, { phone: '60011122' })).join(',') === 'phone:err_tel');
ok('telefono con espacios y prefijo vale', claves(1, Object.assign({}, P1, { phone: '+34 600 11 12 22' })).length === 0);
ok('plazas legales 0 falla', claves(1, Object.assign({}, P1, { legalCapacity: '0' })).join(',') === 'legalCapacity:err_min1');
ok('plazas legales vacias fallan', claves(1, Object.assign({}, P1, { legalCapacity: '' })).join(',') === 'legalCapacity:err_min1');

ok('paso 2 completo pasa', claves(2, { acBedrooms: 'some', numberOfFans: '0' }).length === 0);
ok('paso 2 sin aire en dormitorios YA NO falla (se contesta dormitorio a dormitorio)',
  claves(2, { numberOfFans: '0' }).length === 0, claves(2, { numberOfFans: '0' }).join(','));
ok('acBedrooms no esta en la lista de obligatorios', ctxP.OBLIG.indexOf('acBedrooms') < 0, ctxP.OBLIG.join(','));
ok('y lleva la pista de que es opcional', ctxP.UI.acBedrooms.hint === 'hint_acBedrooms');
ok('paso 2 con ventiladores vacios falla', claves(2, { acBedrooms: 'none' }).join(',') === 'numberOfFans:err_num0');
ok('paso 2 con ventiladores negativos falla', claves(2, { acBedrooms: 'none', numberOfFans: '-1' }).join(',') === 'numberOfFans:err_num0');
ok('paso 2 con ventiladores con coma falla (INTEGER de Caspio)',
  claves(2, { numberOfFans: '2,5' }).join(',') === 'numberOfFans:err_num0');

ok('paso 3 con un dormitorio ubicado pasa',
  claves(3, { totalBedrooms: '3', bedrooms: [{ location: 'Planta baja' }] }).length === 0);
ok('paso 3 sin dormitorios falla dos veces',
  claves(3, { totalBedrooms: '0', bedrooms: [] }).join(',') === 'totalBedrooms:err_min1,bedrooms_json:err_dorm_ubic');
ok('paso 3 con un dormitorio sin ubicacion falla',
  claves(3, { totalBedrooms: '1', bedrooms: [{ location: '   ' }] }).join(',') === 'bedrooms_json:err_dorm_ubic');

ok('paso 4 con cero banos pasa (0 es valido)', claves(4, { totalBathrooms: '0' }).length === 0);
ok('paso 4 vacio falla', claves(4, {}).join(',') === 'totalBathrooms:err_num0');
ok('paso 4 con banos negativos falla', claves(4, { totalBathrooms: '-2' }).join(',') === 'totalBathrooms:err_num0');

ok('paso 5 con tipo de placa pasa', claves(5, { stoveType: 'induction' }).length === 0);
ok('paso 5 sin tipo de placa falla', claves(5, {}).join(',') === 'stoveType:err_req');

ok('paso 6 con cuadro electrico descrito pasa', claves(6, { electricalPanelLocation: 'En el garaje' }).length === 0);
ok('paso 6 con dos letras falla', claves(6, { electricalPanelLocation: 'ab' }).join(',') === 'electricalPanelLocation:err_min3');

ok('paso 7 no tiene obligatorios', claves(7, {}).length === 0);

ok('paso 8 con aparcamiento y sin piscina pasa', claves(8, { parking: 'garage' }).length === 0);
ok('paso 8 sin aparcamiento falla', claves(8, {}).join(',') === 'parking:err_req');
ok('paso 8 con piscina exige tipo y medidas',
  claves(8, { parking: 'street', hasPool: '1' }).join(',') === 'poolType:err_req,poolDimensions:err_req');
ok('paso 8 con piscina completa pasa',
  claves(8, { parking: 'street', hasPool: '1', poolType: 'private', poolDimensions: '8 x 4' }).length === 0);
ok('paso 8 sin piscina no pregunta por el tipo', claves(8, { parking: 'street', hasPool: '0' }).length === 0);
ok('paso 8 con vistas al mar exige desde donde',
  claves(8, { parking: 'street', hasSeaViews: '1' }).join(',') === 'seaViewsFrom:err_req');
ok('paso 8 con vistas al mar y respuesta pasa',
  claves(8, { parking: 'street', hasSeaViews: '1', seaViewsFrom: 'Desde la terraza' }).length === 0);

ok('paso 9 sin la casilla de conformidad no deja enviar', claves(9, {}).join(',') === 'acceptedTerms:err_terms');
ok('paso 9 con la casilla marcada pasa', claves(9, { acceptedTerms: true }).length === 0);
ok('paso 9 acepta el 1 de la casilla', claves(9, { acceptedTerms: '1' }).length === 0);
ok('paso 9 con la casilla en 0 no deja enviar', claves(9, { acceptedTerms: '0' }).join(',') === 'acceptedTerms:err_terms');
ok('validarPaso nunca revienta con datos vacios', [1, 2, 3, 4, 5, 6, 7, 8, 9].every(function (n) {
  return Object.prototype.toString.call(ctxV.validarPaso(n, null)) === '[object Array]';
}));

/* ════════ 6. Guardado por paso ════════ */
console.log(FILE + ': guardado por paso');
ok('camposDelPaso solo manda las columnas de ese paso',
  /function camposDelPaso\(n\)\{[\s\S]{0,120}var def = PASOS\[n - 1\]/.test(codigo));
ok('guardarPaso manda token, fields y submit, como pide el contrato',
  /var cuerpo = \{ token:TOKEN, fields:camposDelPaso\(n\), submit:!!enviar \};/.test(codigo));
ok('un 409 cierra la ficha en vez de tragarselo',
  /if\(r\.status === 409\)\{ editable = false; pantallaCerrada\(\); throw new Error\('cerrada'\); \}/.test(codigo));
ok('cada foto subida guarda ese paso', /return guardarPaso\(pasoActual, false, true\);/.test(codigo));
ok('solo el ultimo paso manda submit', /var ultimo = \(pasoActual === TOTAL_PASOS\);[\s\S]{0,300}guardarPaso\(n, ultimo, false\)/.test(codigo));
ok('si el guardado falla solo sale el recuadro de error',
  /eb\.textContent = t\('err_red'\);[\s\S]{0,120}eb\.style\.display = 'block';/.test(codigo));
ok('y los datos NO se pierden: nadie vacia datos ni las listas fuera de su declaracion',
  codigo.split('datos = {}').length === 2 &&            /* solo la declaracion var datos = {}; */
  codigo.indexOf('listas.bedrooms = []') < 0 &&
  !/catch\(function\(err\)\{[\s\S]{0,400}datos = \{\}/.test(codigo));
ok('"Anterior" guarda el paso que se deja, igual que Siguiente',
  /function irAnterior\(\)\{[\s\S]{0,420}guardarPaso\(n, false, true\)/.test(codigo));
ok('y NO valida: no llama a validarPaso',
  (function () { var i = codigo.indexOf('function irAnterior('); var j = codigo.indexOf('function irSiguiente(');
    return codigo.slice(i, j).indexOf('validarPaso') < 0; })());
ok('"Anterior" retrocede siempre, incluso si el guardado falla',
  /function irAnterior\(\)\{[\s\S]{0,520}pintaPaso\(n - 1\);\s*\}/.test(codigo));
ok('"Siguiente" valida antes de guardar', /var errs = validarPaso\(pasoActual, datosParaValidar\(\)\);/.test(codigo));
ok('la subida manda file, token y field al Worker',
  /fd\.append\('file'[\s\S]{0,120}fd\.append\('token', TOKEN\);[\s\S]{0,60}fd\.append\('field', campoDestino\);/.test(codigo));
ok('las fotos de los grupos usan los campos bedroom_photo y bathroom_photo',
  /claveLista === 'bedrooms' \? 'bedroom_photo' : 'bathroom_photo'/.test(codigo));
ok('los Si/No viajan como booleanos y los enteros como numero',
  codigo.indexOf("CAMPOS[c].type === 'YES/NO'") > 0 && codigo.indexOf("CAMPOS[c].type === 'INTEGER'") > 0);
ok('no queda ningun tipo con guion bajo', codigo.indexOf('YES_NO') < 0 && codigo.indexOf('DATE_TIME') < 0);
ok('la ficha ya revisada ensena el texto exacto del contrato',
  codigo.indexOf("'Esta ficha ya está revisada por 3Villas. Gracias.'") > 0);
ok('el texto de conformidad es el exacto del contrato',
  codigo.indexOf("'Confirmo que la información facilitada es veraz y autorizo a 3Villas a utilizarla para la gestión de mi propiedad.'") > 0);
ok('los cuatro campos fiscales van en su propio recuadro con el aviso de privacidad',
  codigo.indexOf("['fiscal_nif','fiscal_name','fiscal_address','fiscal_municipio']") > 0 &&
  codigo.indexOf('fiscal_p:') > 0);

/* ════════ 7. Los cinco diccionarios tienen el mismo juego de claves ════════ */
console.log(FILE + ': cinco idiomas');
var ctxL = {};
vm.createContext(ctxL);
vm.runInContext(varBlock('IDIOMAS', '];') + '\n' + varBlock('L', '\n};') + '\n' +
  S.slice(S.indexOf('var I18N = (function(){'), S.indexOf('})();', S.indexOf('var I18N = (function(){')) + 5), ctxL);

ok('los cinco idiomas son es, en, fr, de, it', ctxL.IDIOMAS.join(',') === 'es,en,fr,de,it');
var clavesEs = Object.keys(ctxL.I18N.es).sort().join(',');
ctxL.IDIOMAS.forEach(function (id) {
  ok('el diccionario ' + id + ' tiene las mismas claves que el espanol',
    Object.keys(ctxL.I18N[id]).sort().join(',') === clavesEs,
    String(Object.keys(ctxL.I18N[id]).length) + ' vs ' + String(Object.keys(ctxL.I18N.es).length));
});
var vacias = [];
ctxL.IDIOMAS.forEach(function (id) {
  Object.keys(ctxL.I18N[id]).forEach(function (k) {
    if (!ctxL.I18N[id][k] || String(ctxL.I18N[id][k]).trim() === '') vacias.push(id + '.' + k);
  });
});
ok('ningun texto esta vacio en ninguno de los cinco idiomas', vacias.length === 0, vacias.slice(0, 6).join(','));
var sinTraducir = [];
Object.keys(ctxL.I18N.es).forEach(function (k) {
  if (k.indexOf('op_3villas') === 0) return;                 /* la marca no se traduce */
  var n = 0;
  ctxL.IDIOMAS.forEach(function (id) { if (ctxL.I18N[id][k] === ctxL.I18N.es[k]) n++; });
  if (n === 5 && !/^(op_gas|op_garage|lbl_hasJacuzzi|ba_bidet)$/.test(k)) sinTraducir.push(k);
});
ok('casi ningun texto es identico en los cinco idiomas (senal de copia y pega)',
  sinTraducir.length <= 3, sinTraducir.join(','));

/* Cada columna del formulario tiene su etiqueta en los cinco idiomas */
var sinEtiqueta = delEsquema.filter(function (c) { return !ctxL.I18N.es['lbl_' + c]; });
ok('las ' + delEsquema.length + ' columnas tienen etiqueta lbl_<columna>', sinEtiqueta.length === 0, sinEtiqueta.join(','));
var sinTitulo = [1, 2, 3, 4, 5, 6, 7, 8, 9].filter(function (n) { return !ctxL.I18N.es['paso' + n]; });
ok('los nueve pasos tienen titulo', sinTitulo.length === 0, sinTitulo.join(','));
/* Cada opcion de cada desplegable tiene su texto */
var sinOpcion = [];
Object.keys(ctxP.UI).forEach(function (c) {
  var u = ctxP.UI[c];
  if (!u.ops) return;
  u.ops.forEach(function (o) { if (!ctxL.I18N.es['op_' + o]) sinOpcion.push(c + '/' + o); });
});
['doubleWide', 'doubleLong', 'single1', 'single2', 'single3', 'single4', 'trundle', 'bunk', 'bathtub', 'shower', 'both']
  .forEach(function (o) { if (!ctxL.I18N.es['op_' + o]) sinOpcion.push('grupo/' + o); });
ok('todas las opciones de los desplegables tienen texto', sinOpcion.length === 0, sinOpcion.join(','));
var sinAviso = ['err_min3', 'err_email', 'err_tel', 'err_min1', 'err_num0', 'err_req', 'err_dorm_ubic', 'err_terms']
  .filter(function (k) { return !ctxL.I18N.es[k]; });
ok('todos los avisos del validador tienen texto', sinAviso.length === 0, sinAviso.join(','));

/* ════════ 7bis. Revision del 21/09/2026 ════════ */

/* — (1) esc() y la lista de origenes: el XSS de la foto — */
console.log(FILE + ': escape y origen de las URL');
var ctxS = {};
vm.createContext(ctxS);
vm.runInContext(fnSource('esc') + '\n' + varBlock('ORIGENES_OK', '];') + '\n' + fnSource('urlSegura'), ctxS);
var POC = "a.jpg?');alert(1)//";
ok('esc escapa la comilla simple', ctxS.esc("'") === '&#39;');
ok('esc escapa la tilde invertida', ctxS.esc('`') === '&#96;');
ok('esc escapa las comillas dobles, < y >', ctxS.esc('<a href="x">') === '&lt;a href=&quot;x&quot;&gt;');
ok('el valor de prueba no deja ni una comilla sin escapar',
  ctxS.esc(POC).indexOf("'") < 0 && ctxS.esc(POC).indexOf('"') < 0, ctxS.esc(POC));
ok('y sigue siendo legible', ctxS.esc(POC) === 'a.jpg?&#39;);alert(1)//', ctxS.esc(POC));
ok('urlSegura acepta el host de las fotos de 3Villas',
  ctxS.urlSegura('https://www.3villas.com/intranet/fotos/villa-info/a.jpg') === 'https://www.3villas.com/intranet/fotos/villa-info/a.jpg');
ok('urlSegura acepta el bucket R2',
  ctxS.urlSegura('https://pub-48c1cfd5de614ff0a0cebfec482a7b32.r2.dev/ficha/a.jpg').length > 0);
ok('urlSegura RECHAZA un javascript:', ctxS.urlSegura('javascript:alert(1)') === '');
ok('urlSegura RECHAZA un data:', ctxS.urlSegura('data:text/html,<script>alert(1)</script>') === '');
ok('urlSegura RECHAZA otro host, aunque acabe en .jpg', ctxS.urlSegura('https://malo.example/a.jpg') === '');
ok('urlSegura RECHAZA un http:// del propio host', ctxS.urlSegura('http://www.3villas.com/intranet/fotos/a.jpg') === '');
ok('urlSegura RECHAZA vacio y null', ctxS.urlSegura('') === '' && ctxS.urlSegura(null) === '');
ok('dibujaFoto pasa la url por urlSegura antes de pintarla',
  /function dibujaFoto\([\s\S]{0,300}var segura = urlSegura\(url\);/.test(codigo));
ok('y si no es segura no se enlaza: se ensena un aviso',
  /if\(!segura\)\{[\s\S]{0,240}t\('foto_origen'\)/.test(codigo));
ok('el enlace del PDF usa la url comprobada y rel noreferrer',
  /a\.href = segura;[\s\S]{0,90}rel = 'noopener noreferrer'/.test(codigo));

/* — (3) el token no puede salir en un Referer — */
console.log(FILE + ': el token no sale en ninguna peticion');
ok('el head abre con la meta referrer strict-origin',
  /<head>\s*(<!--[\s\S]*?-->\s*)?<meta name="referrer" content="strict-origin">/.test(S));
ok('la comprobacion de version ya NO esta en el head',
  S.slice(0, S.indexOf('</head>')).indexOf("cache:'reload'") < 0);
ok('y corre despues de quitar el token de la url',
  /quitarTokenDeUrl\(\);[\s\S]{0,160}comprobarVersionNueva\(\);/.test(codigo));
ok('esa peticion tambien pide strict-origin por su cuenta',
  /fetch\(location\.pathname, \{ cache:'reload', referrerPolicy:'strict-origin' \}\)/.test(codigo));

/* — (4) los Yes/No de Caspio son booleanos — */
console.log(FILE + ': los Si/No vuelven marcados');
var ctxB = {};
vm.createContext(ctxB);
vm.runInContext(fnSource('verdad') + '\n' + fnSource('falso') + '\n' + fnSource('siNoGuardado'), ctxB);
ok('el true de Caspio marca el boton Si', ctxB.siNoGuardado(true) === '1');
ok('el false de Caspio marca el boton No', ctxB.siNoGuardado(false) === '0');
ok("el '1' de esta pagina marca Si", ctxB.siNoGuardado('1') === '1');
ok("el '0' de esta pagina marca No", ctxB.siNoGuardado('0') === '0');
ok('el -1 de Caspio marca Si', ctxB.siNoGuardado(-1) === '1');
ok('sin contestar no marca ninguno',
  ctxB.siNoGuardado('') === '' && ctxB.siNoGuardado(null) === '' && ctxB.siNoGuardado(undefined) === '');
ok('los botones Si/No de un campo se marcan con siNoGuardado',
  /if\(siNoGuardado\(datos\[campo\]\) === val\) b\.className = 'on';/.test(codigo));
ok('y tambien los de dentro de un dormitorio o un bano',
  /if\(siNoGuardado\(it\[prop\]\) === val\) bt\.className = 'on';/.test(codigo));
ok('al guardar, sin contestar va como null y no como false',
  /var sn = siNoGuardado\(datos\[c\]\);\s*out\[c\] = sn === '' \? null : \(sn === '1'\);/.test(codigo));

/* — (6) la foto de un grupo se resuelve por id — */
console.log(FILE + ': la foto de un dormitorio no se pierde');
ok('cada item lleva su _id al crearse',
  /_id:nuevoIdItem\(\), bedConfiguration/.test(codigo) && /_id:nuevoIdItem\(\), associatedBedroom/.test(codigo));
ok('los items que llegan de Caspio tambien reciben un _id',
  /function ponerIds\(clave\)\{/.test(codigo) && /ponerIds\(clave\);/.test(codigo));
ok('dibujaFoto recibe el id, no el indice', /function dibujaFoto\(box, campo, claveLista, itemId\)\{/.test(codigo));
ok('y la foto se escribe buscando ese id',
  /var vivo = itemPorId\(claveLista, itemId\);[\s\S]{0,160}if\(!vivo\) throw new Error\('quitado'\);[\s\S]{0,90}vivo\.photo = r\.url;/.test(codigo));
ok('si el item ya no esta, se avisa en vez de escribir en el vecino',
  /=== 'quitado' \? t\('foto_quitada'\) : t\('foto_mal'\)/.test(codigo));
ok('Quitar borra por id, no por indice',
  /x\.onclick = function\(\)\{[\s\S]{0,260}a\[j\]\._id === idIt/.test(codigo));
var ctxI = {};
vm.createContext(ctxI);
ctxI.listas = { bedrooms:[{ _id:'it1', photo:'' }, { _id:'it2', photo:'' }] };
vm.runInContext(fnSource('itemPorId'), ctxI);
ok('itemPorId encuentra el item por su id', ctxI.itemPorId('bedrooms', 'it2') !== null);
ok('itemPorId devuelve null si el item ya se quito', ctxI.itemPorId('bedrooms', 'it9') === null);
ok('el _id no se guarda en Caspio: camposDelPaso lo quita',
  /function listaParaGuardar\(clave\)\{[\s\S]{0,360}k !== '_id'/.test(codigo) &&
  /out\[c\] = JSON\.stringify\(listaParaGuardar\(REPEAT\[c\]\)\);/.test(codigo));

/* — (7) los enteros son enteros — */
console.log(FILE + ': los campos INTEGER solo aceptan enteros');
var ctxE = {};
vm.createContext(ctxE);
vm.runInContext(fnSource('entero'), ctxE);
ok('un entero pasa', ctxE.entero('8') === 8);
ok('un entero negativo pasa', ctxE.entero('-2') === -2);
ok('un decimal con coma se rechaza', ctxE.entero('3,5') === null);
ok('un decimal con punto se rechaza', ctxE.entero('4.7') === null);
ok('una palabra se rechaza', ctxE.entero('dos') === null);
ok('vacio es null', ctxE.entero('') === null && ctxE.entero(null) === null);
ok('camposDelPaso usa entero() en los campos INTEGER',
  /CAMPOS\[c\]\.type === 'INTEGER'\)\{ out\[c\] = entero\(datos\[c\]\); continue; \}/.test(codigo));
ok('el validador tambien rechaza los no enteros en las plazas legales',
  claves(1, Object.assign({}, P1, { legalCapacity: '6,5' })).join(',') === 'legalCapacity:err_min1');
ok('y en el total de dormitorios',
  claves(3, { totalBedrooms: '3.5', bedrooms: [{ location: 'x' }] }).join(',') === 'totalBedrooms:err_min1');

/* — (8) una ficha ya enviada lo dice — */
console.log(FILE + ': la ficha ya enviada');
var ctxF = {};
vm.createContext(ctxF);
vm.runInContext(fnSource('fechaCorta'), ctxF);
ok('fechaCorta pasa AAAA-MM-DD a DD/MM/AAAA', ctxF.fechaCorta('2026-09-21T09:00:00Z') === '21/09/2026');
ok('fechaCorta aguanta vacio', ctxF.fechaCorta('') === '' && ctxF.fechaCorta(null) === '');
ok('existe el recuadro del aviso', S.indexOf('id="bannerEnviada"') > 0);
ok('solo sale cuando el estado es enviada',
  /String\(datos\.ficha_status \|\| ''\)\.toLowerCase\(\) !== 'enviada'\)\{ b\.style\.display = 'none'; return; \}/.test(codigo));
ok('y lleva la fecha de envio', /t\('enviada_aviso', \{ fecha:fechaCorta\(datos\.submitted_at\) \|\| '—' \}\)/.test(codigo));
ok('el texto es el del contrato', ctxL.I18N.es.enviada_aviso === 'Ficha enviada el {fecha}. Puede corregir y volver a enviar.');
ok('se repinta al cambiar de idioma', /pintaPaso\(pasoActual\); pintaBannerEnviada\(\);/.test(codigo));

/* — (9) el enlace caducado — */
ok('el aviso del enlace malo habla tambien de caducidad',
  ctxL.I18N.es.sin_token === 'Este enlace no es válido o ha caducado. Pida uno nuevo a 3Villas.');
ok('y lo hace en los cinco idiomas',
  ctxL.IDIOMAS.every(function (id) { return String(ctxL.I18N[id].sin_token).length > 20; }));

/* — (19) los botones se pulsan con el dedo — */
console.log(FILE + ': tamano de los botones');
ok('el boton Quitar mide 36 px de alto como minimo', /\.grupo-x\{[^}]*min-height:36px/.test(S));
ok('y 76 px de ancho', /\.grupo-x\{[^}]*min-width:76px/.test(S));
ok('el selector de idioma mide 36 px de alto como minimo', /#langSel\{[^}]*min-height:36px/.test(S));

/* — (20) el bloque de documentos y fotos — */
console.log(FILE + ': documentos y fotos al final del paso 1');
ok('los seis archivos estan declarados como bloque',
  ctxP.CAMPOS_DOCS.join(',') === 'licenseFile,registrationFile,floorPlanFile,foto_etv_plate,foto_house_plate,foto_keybox');
var p1 = ctxP.PASOS[0].campos;
ok('y van los ultimos del paso 1',
  ctxP.CAMPOS_DOCS.every(function (c) { return p1.indexOf(c) >= p1.length - 6; }), p1.slice(-6).join(','));
ok('el primer campo de texto del paso 1 va antes que el primer archivo',
  p1.indexOf('ownerName') < p1.indexOf('licenseFile'));
ok('las observaciones del paso 1 tambien van antes de los archivos',
  p1.indexOf('observations_general') < p1.indexOf('licenseFile'));
ok('el bloque tiene titulo y linea de entrada',
  /db\.className = 'docs'/.test(codigo) && /dh\.textContent = t\('docs_h'\)/.test(codigo) &&
  /dp\.textContent = t\('docs_p'\)/.test(codigo));
ok('y los seis campos se pintan dentro de el',
  /else if\(n === 1 && CAMPOS_DOCS\.indexOf\(campo\) >= 0\) destino = \$\('bloqueDocs'\);/.test(codigo));

/* — (21) y (22) pistas — */
console.log(FILE + ': pistas nuevas');
ok('los dos totales llevan la pista de que debe coincidir con la lista',
  ctxP.UI.totalBedrooms.hint === 'hint_coincide' && ctxP.UI.totalBathrooms.hint === 'hint_coincide');
ok('la foto de la placa ETV explica cual es',
  ctxP.UI.foto_etv_plate.hint === 'hint_etv' &&
  ctxL.I18N.es.hint_etv === 'La placa azul de Estancia Turística que está en la entrada de la casa.');
ok('el plano dice que vale una foto en papel',
  ctxP.UI.floorPlanFile.hint === 'hint_plano' && ctxL.I18N.es.hint_plano === 'Vale una foto del plano en papel.');
ok('las tres fotos de exterior tienen nombre propio',
  ctxL.I18N.es.lbl_foto_exterior1 === 'Foto de la fachada' &&
  ctxL.I18N.es.lbl_foto_exterior2 === 'Foto del jardín o la terraza' &&
  ctxL.I18N.es.lbl_foto_exterior3 === 'Foto de la entrada');

/* — (24) el aviso de los datos fiscales — */
ok('la explicacion de los datos fiscales nombra la declaracion de alquileres turisticos',
  ctxL.I18N.es.fiscal_p === 'Estos cuatro datos son solo para la declaración informativa de alquileres turísticos que 3Villas presenta a Hacienda. Son privados y nunca se enseñan a los huéspedes.');

/* — (25) las dos camas de matrimonio con sus medidas — */
console.log(FILE + ': camas y traducciones');
ok('la cama de matrimonio lleva sus medidas', ctxL.I18N.es.op_doubleWide === 'Cama de matrimonio (150–160 cm)');
ok('y la grande tambien', ctxL.I18N.es.op_doubleLong === 'Cama de matrimonio grande (180–200 cm)');
ok('las medidas salen en los cinco idiomas',
  ctxL.IDIOMAS.every(function (id) {
    return ctxL.I18N[id].op_doubleWide.indexOf('150') > 0 && ctxL.I18N[id].op_doubleLong.indexOf('180') > 0;
  }));

/* — (26) traducciones corregidas — */
[['en', 'lbl_whoContractsInternet', 'Who holds the internet contract'],
 ['de', 'lbl_whoContractsInternet', 'Wer den Internetvertrag hat'],
 ['en', 'lbl_referencia_catastral', 'Cadastral reference (referencia catastral)'],
 ['es', 'lbl_registrationNumber', 'Número de registro estatal de alquiler turístico (NRUA)'],
 ['en', 'lbl_registrationNumber', 'National tourist rental registry number (NRUA)'],
 ['en', 'lbl_legalCapacity', 'Maximum guests allowed by the licence'],
 ['en', 'lbl_totalCapacity', 'Total sleeping places'],
 ['de', 'lbl_totalCapacity', 'Schlafplätze insgesamt'],
 ['es', 'lbl_keyboxNumber', 'Número de la caja de llaves (keybox)'],
 ['en', 'op_obra', 'Built-in (brick)'],
 ['en', 'paso6', 'Utilities and installations'],
 ['de', 'paso6', 'Haustechnik'],
 ['en', 'paso8', 'Outdoor areas'],
 ['en', 'lbl_observations_exterior', 'Notes (outdoor areas)'],
 ['de', 'lbl_gasLocation', 'Wo sich die Gasflaschen oder der Gashahn befinden'],
 ['de', 'lbl_waterHeaterLocation', 'Wo sich der Boiler oder die Therme befindet'],
 ['de', 'lbl_hasChildBarrier', 'Kinderschutzzaun am Pool'],
 ['it', 'paso5', 'Dotazioni'],
 ['it', 'lbl_contractedSpeed', 'Velocità prevista dal contratto']].forEach(function (t3) {
  ok(t3[0] + '.' + t3[1] + ' corregido', ctxL.I18N[t3[0]][t3[1]] === t3[2], ctxL.I18N[t3[0]][t3[1]]);
});
ok('el NRUA lleva su sigla en los cinco idiomas',
  ctxL.IDIOMAS.every(function (id) { return ctxL.I18N[id].lbl_registrationNumber.indexOf('NRUA') > 0; }));
['enviada_aviso', 'foto_quitada', 'foto_origen', 'docs_h', 'docs_p', 'hint_acBedrooms',
 'hint_coincide', 'hint_etv', 'hint_plano'].forEach(function (k) {
  ok('"' + k + '" existe en los cinco idiomas',
    ctxL.IDIOMAS.every(function (id) { return !!ctxL.I18N[id][k] && String(ctxL.I18N[id][k]).trim() !== ''; }));
});

/* ════════ 8. sw.js no cambia ════════ */
console.log('sw.js: la pagina publica no entra en la lista de precarga');
var SW = fs.readFileSync('sw.js', 'utf8');
ok('checkin-pasos.html tampoco esta en PRECACHE (misma regla para las paginas publicas)',
  SW.indexOf('checkin-pasos.html') < 0);
ok('ficha-propietario.html no esta en PRECACHE', SW.indexOf('ficha-propietario') < 0);
ok('el manejador de red sirve cualquier pagina no listada', /caches\.match\(e\.request\)/.test(SW));

/* ════════ 9. Todos los <script> inline compilan ════════ */
var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, n = 0, err = null;
try { while ((m = re.exec(S))) { n++; new vm.Script(m[1], { filename: FILE + '#script' + n }); } } catch (e) { err = String(e); }
ok('los ' + n + ' scripts inline compilan', !err, err);

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
