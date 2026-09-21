/* Pruebas de fichas-propietarios.html v01, la pagina del equipo para las fichas de
   propietario, y de la entrada nueva de nav.js v15.
   node fichas-propietarios.test.js

   Como unidad-direccion.test.js y fotos-mismo-host.test.js: NO copia el codigo de la
   pagina. Extrae del HTML el bloque real del mapeo a TaVillas y lo ejecuta en un vm
   junto con ficha-campos.js. Todos los datos de prueba son inventados. */
var fs = require('fs'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

var FILE = 'fichas-propietarios.html';
var S = fs.readFileSync(FILE, 'utf8');
var codigo = S.split('<!-- HISTORIAL:')[0];

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
function varBlock(name, cierre, s2) {
  s2 = s2 || S;
  var a = s2.indexOf('var ' + name + ' = ');
  if (a < 0) throw new Error('no encuentro ' + name);
  var b = s2.indexOf(cierre, a);
  if (b < 0) throw new Error('sin cierre ' + name);
  return s2.slice(a, b + cierre.length);
}
/* Extrae el bloque del mapeo entre sus dos marcas. */
function bloqueMapeo() {
  var a = S.indexOf('▼▼ MAPEO A TaVillas — inicio');
  var b = S.indexOf('▲▲ MAPEO A TaVillas — fin');
  if (a < 0 || b < 0) throw new Error('no encuentro las marcas del bloque de mapeo');
  a = S.indexOf('*/', a) + 2;
  b = S.lastIndexOf('/*', b);
  return S.slice(a, b);
}

/* ════════ 1. Version coherente ════════ */
console.log(FILE + ': version');
var vTop = (S.match(/VERSIÓN ACTUAL:\s*v(\d+)/) || [])[1];
var vTitle = (S.match(/<title>Fichas de Propietarios v(\d+)/) || [])[1];
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

/* ════════ 2. Misma cascara que el resto de la intranet ════════ */
console.log(FILE + ': cascara y permiso');
ok('cierra la puerta con la clave crear-villa, no con editar-villas',
  codigo.indexOf("Auth.require('crear-villa')") > 0 && codigo.indexOf("Auth.require('editar-villas')") < 0);
ok('y auth.js da esa clave solo a admin y manager',
  /'crear-villa'\s*:\s*\['admin', 'manager'\]/.test(fs.readFileSync('auth.js', 'utf8')));
ok('los roles del permiso son los mismos que pueden promover',
  /function puedePromover\(\)\{ return \['admin', 'manager'\]/.test(codigo));
ok('carga auth.js, nav.js y nav-component.js',
  codigo.indexOf('src="auth.js"') > 0 && codigo.indexOf('src="nav.js"') > 0 && codigo.indexOf('src="nav-component.js"') > 0);
ok('carga ficha-campos.js, la unica fuente de campos', codigo.indexOf('src="ficha-campos.js"') > 0);
ok('cabecera estandar: logo, boton de menu y boton de cerrar',
  /<nav class="top-nav">/.test(codigo) && codigo.indexOf('NavComponent.open()') > 0 &&
  codigo.indexOf('class="nav-close-btn"') > 0);
ok('la API es la del mismo host', codigo.indexOf("var WORKER = 'https://www.3villas.com/intranet/api'") > 0);
ok('solo admin y manager pueden promover',
  /function puedePromover\(\)\{ return \['admin', 'manager'\]\.indexOf\(rol\(\)\) >= 0; \}/.test(codigo));
ok('el rol se lee de Auth, como en el resto de la intranet', /Auth\.role\(\)/.test(codigo));

/* ════════ 3. Alta del enlace ════════ */
console.log(FILE + ': nuevo enlace');
ok('el formulario pide los cinco datos del contrato',
  ['nOwner', 'nVilla', 'nEmail', 'nTel', 'nLang'].every(function (id) { return codigo.indexOf('id="' + id + '"') > 0; }));
ok('llama a ficha-link con ownerName, propertyName, email, phone y lang',
  codigo.indexOf("?action=ficha-link") > 0 &&
  /ownerName: g\('nOwner'\)[\s\S]{0,260}lang: g\('nLang'\)\.value/.test(codigo));
ok('ensena el enlace, el boton de copiar y el boton de WhatsApp',
  codigo.indexOf("id=\"enlaceUrl\"") > 0 && codigo.indexOf('copiarEnlace()') > 0 &&
  codigo.indexOf("'https://wa.me/?text=' +") > 0);
ok('ensena la caducidad del enlace',
  codigo.indexOf("fCad ? ('El enlace caduca el ' + fCad + '.') : ''") > 0);
ok('avisa de que un enlace perdido no se puede volver a pedir',
  codigo.indexOf('Si un propietario pierde su enlace no se puede volver a enseñar') > 0);
ok('NO hay ningun boton de "enlace de nuevo" en el listado',
  codigo.indexOf('Enlace de nuevo') < 0);

/* ════════ 4. Listado y detalle ════════ */
console.log(FILE + ': listado y detalle');
ok('lee TaVillas_ficha con action=data y limite 200',
  /action=data&table=TaVillas_ficha&where=[\s\S]{0,120}limit=200/.test(codigo));
ok('ordena las mas nuevas primero', /fichas\.sort\(function \(a, b\)\{[\s\S]{0,120}ficha_id/.test(codigo) ||
  /fichas\.sort\(function\(a, b\)\{[\s\S]{0,120}ficha_id/.test(codigo));
ok('la tabla tiene las seis columnas del contrato',
  ['<th>Fecha</th>', '<th>Propietario</th>', '<th>Villa</th>', '<th>Estado</th>', '<th>Idioma</th>', '<th>Acciones</th>']
    .every(function (c) { return codigo.indexOf(c) > 0; }));
ok('los cinco estados tienen su etiqueta de color, incluido promoviendo',
  /var ESTADOS = \['abierta', 'enviada', 'revisada', 'promoviendo', 'promovida'\];/.test(codigo) &&
  ['.badge.abierta', '.badge.enviada', '.badge.revisada', '.badge.promoviendo', '.badge.promovida']
    .every(function (c) { return S.indexOf(c) > 0; }));
ok('"Promover a villa" solo sale en fichas enviadas o revisadas y solo para admin o manager',
  /var promovible = esPromovible\(est\) && puedePromover\(\);/.test(codigo) &&
  /function esPromovible\(est\)\{ return \['enviada', 'revisada'\]\.indexOf/.test(codigo));
ok('una ficha promoviendo NO se puede promover otra vez',
  (function () {
    var ctxE = {}; vm.createContext(ctxE);
    vm.runInContext(fnSource('esPromovible'), ctxE);
    return ctxE.esPromovible('enviada') && ctxE.esPromovible('revisada') &&
      !ctxE.esPromovible('promoviendo') && !ctxE.esPromovible('promovida') &&
      !ctxE.esPromovible('abierta') && !ctxE.esPromovible('') && !ctxE.esPromovible(null);
  })());
ok('el detalle usa la misma regla, no una copia', /\(esPromovible\(est\) && puedePromover\(\)/.test(codigo));
ok('abrirPromocion se niega si la ficha no es promovible',
  /if\(!esPromovible\(f\.ficha_status\)\)\{[\s\S]{0,340}return;\s*\}/.test(codigo));
ok('y lo dice con sus palabras cuando ya se esta promoviendo',
  codigo.indexOf("'Esta ficha ya se está promoviendo'") > 0);
ok('una ficha promoviendo avisa de que la villa se esta creando',
  codigo.indexOf('La villa se está creando ahora mismo') > 0);
ok('un 409 al promover no se trata como un fallo de red, y usa el texto del Worker',
  /if\(res\.status === 409\)\{[\s\S]{0,260}La ficha ya está promovida o en curso/.test(codigo));
ok('y tras el 409 se recarga el listado para ver el estado de verdad',
  /if\(res\.status === 409\)\{[\s\S]{0,200}cargarLista\(\);/.test(codigo));
ok('"Ver" abre el detalle en la misma pagina', codigo.indexOf('onclick="verFicha(') > 0 &&
  codigo.indexOf("g('cardDetalle')") > 0);
ok('el detalle agrupa por los nueve pasos con los titulos en espanol',
  /for\(paso = 1; paso <= 9; paso\+\+\)/.test(codigo) && codigo.indexOf('var PASO_TITULO = {') > 0);
ok('las fotos salen como miniatura con lupa (mismo patron openLB de editar-villa)',
  /function openLB\(src\)\{/.test(codigo) && /function miniatura\(u\)\{[\s\S]{0,600}openLB\(/.test(codigo));
ok('las fotos se piden por el mismo host (arreglo del bloqueo de r2.dev)',
  codigo.indexOf("var FOTOS_HOST = 'https://www.3villas.com/intranet/fotos/'") > 0 &&
  /function fotoUrl\(u\)\{/.test(codigo));
ok('las tres listas JSON se pintan como tabla', /function tablaLista\(valor, nombre\)\{/.test(codigo));
ok('los cuatro campos fiscales solo se pintan para admin y manager',
  /if\(paso === 9 && puedePromover\(\)\)\{/.test(codigo) &&
  /var CAMPOS_FISCALES = \['fiscal_nif', 'fiscal_name', 'fiscal_address', 'fiscal_municipio'\];/.test(codigo));
ok('hay caja de notas de revision y boton de marcar revisada',
  codigo.indexOf('id="notasRev"') > 0 && codigo.indexOf('marcarRevisada()') > 0);
ok('marcar revisada usa ficha-promote con status revisada y las notas',
  /action=ficha-promote[\s\S]{0,400}status:'revisada', notas_revision:notas/.test(codigo));
ok('promover usa ficha-promote con id y villaFields',
  /action=ficha-promote[\s\S]{0,400}id:parseInt\(id, 10\), villaFields:r\.villaFields/.test(codigo));
ok('al promover ensena "Villa creada" con el enlace a la pagina de editar',
  codigo.indexOf("'<b>Villa creada: '") > 0 &&
  codigo.indexOf("editar-villa.html?villaid=' + parseInt(j.villaid, 10)") > 0);
ok('el enlace usa el parametro villaid, el que lee la pagina de editar',
  fs.readFileSync('editar-villa.html', 'utf8').indexOf("urlP.get('villaid')") > 0);
ok('antes de crear la villa ensena la lista "Para completar en Editar Villa"',
  codigo.indexOf('Para completar en Editar Villa') > 0 &&
  /abrirPromocion[\s\S]{0,2600}btnPromo/.test(codigo));

/* ════════ 5. El mapeo real, ejercitado ════════ */
console.log(FILE + ': mapeo a TaVillas');
var ctx = {};
vm.createContext(ctx);
ctx.window = ctx;
vm.runInContext(fs.readFileSync('ficha-campos.js', 'utf8'), ctx, { filename: 'ficha-campos.js' });
vm.runInContext(bloqueMapeo(), ctx, { filename: FILE + '#mapeo' });

ok('el bloque de mapeo se ejecuta y publica construirVillaFields',
  typeof ctx.construirVillaFields === 'function');
ok('y las cinco listas de clasificacion', ['NUNCA_ENVIAR', 'TV_CUENTA', 'TV_SINO_10', 'TV_SINO_BOOL', 'TV_LOOKUP']
  .every(function (k) { return Object.prototype.toString.call(ctx[k]) === '[object Array]'; }));

/* Una ficha de prueba, entera e inventada. */
var FICHA = {
  ficha_id: 42, ficha_status: 'enviada', lang: 'es', villaid: '',
  ownerName: 'Ana Ejemplo', propertyName: 'Villa Prueba', email: 'a@ejemplo.test', phone: '600111222',
  address: 'Carrer Inventat, 9', googlemaps_link: 'https://maps.example.test/vp',
  referencia_catastral: '0000000XX0000X', licenseNumber: 'ETV/0000',
  licenseFile: 'https://pub-48c1cfd5de614ff0a0cebfec482a7b32.r2.dev/ficha/licencia.pdf',
  registrationNumber: 'RUA-0000',
  registrationFile: 'https://pub-48c1cfd5de614ff0a0cebfec482a7b32.r2.dev/ficha/registro.pdf',
  floorPlanFile: 'https://pub-48c1cfd5de614ff0a0cebfec482a7b32.r2.dev/ficha/plano.pdf',
  legalCapacity: '8', totalCapacity: '10', keyboxNumber: '1234', alarmCode: '9876',
  foto_etv_plate: 'https://ejemplo.test/etv.jpg',
  foto_house_plate: 'https://ejemplo.test/placa.jpg',
  foto_keybox: 'https://ejemplo.test/keybox.jpg',
  observations_general: 'La casa esta al final del camino.',
  acLivingRoom: '1', acBedrooms: 'some', numberOfFans: '2', dehumidifiers: '1', hasHeating: '0',
  observations_climatization: 'El aire del salon es nuevo.',
  totalBedrooms: '3',
  bedrooms_json: JSON.stringify([
    { bedConfiguration: 'doubleWide', bedDimensions: '160x200', location: 'Planta baja', hasAC: '1', hasCeilingFan: '0', hasEnSuite: '1', enSuiteBathtubOrShower: 'shower', photo: 'https://ejemplo.test/d1.jpg' },
    { bedConfiguration: 'single2', bedDimensions: '', location: 'Primera planta', hasAC: '0', hasCeilingFan: '1', hasEnSuite: '0', enSuiteBathtubOrShower: '', photo: '' }
  ]),
  observations_bedrooms: 'Las camas son nuevas.',
  totalBathrooms: '2',
  bathrooms_json: JSON.stringify([{ associatedBedroom: 'Dormitorio 1', hasBathtub: '0', hasShower: '1', hasBidet: '0', photo: '' }]),
  sharedBathrooms_json: JSON.stringify([
    { associatedBedroom: '', hasBathtub: '1', hasShower: '1', hasBidet: '1', photo: '' },
    { associatedBedroom: '', hasBathtub: '0', hasShower: '1', hasBidet: '0', photo: '' }
  ]),
  observations_bathrooms: 'El bano de abajo es pequeno.',
  hasDishwasher: '1', hasOven: '1', hasMicrowave: '1', hasCoffeeMaker: '1', hasWashingMachine: '0',
  hasDryer: '0', hasIron: '1', hasHairDryer: '1', coffeeMakerType: 'De capsulas',
  stoveType: 'induction', numberOfCribs: '1', numberOfHighChairs: '2',
  observations_equipment: 'El horno se cambio el ano pasado.',
  electricalPanelLocation: 'En el garaje, a la derecha',
  foto_electricalPanel: 'https://ejemplo.test/cuadro.jpg',
  fireExtinguisherLocation: 'En la cocina',
  waterShutoffLocation: 'Debajo del fregadero',
  foto_waterShutoff: 'https://ejemplo.test/llave.jpg',
  waterHeaterType: 'Termo electrico', waterHeaterLocation: 'En el lavadero',
  hasSmokeDetector: '1', hasFirstAidKit: '1', firstAidLocation: 'En el bano de abajo',
  electricitySupplier: 'Compania de prueba', electricityMeterLocation: 'En la entrada',
  waterSupplier: 'Aguas de prueba', waterMeterLocation: 'En la acera',
  gasSupplier: 'Butano', gasLocation: 'Caseta del jardin',
  hasSolarPanels: '1', solarPanelsInfo: 'Cuatro placas en el tejado',
  solarPanelsPdf: 'https://ejemplo.test/placas.pdf',
  hasJacuzzi: '0', jacuzziInfo: '', jacuzziPdf: '',
  observations_facilities: '',
  internetProvider: 'Fibra de prueba', contractedSpeed: '600 Mb',
  wifiUsername: 'VillaPrueba', wifiPassword: 'clave-de-prueba',
  whoContractsInternet: 'owner', smartTvSatelliteNetflix: 'Smart TV con Netflix',
  hasSafe: '1', safeCode: '0000', foto_safe: 'https://ejemplo.test/caja.jpg',
  hasBoardGames: '1', observations_entertainment: '',
  hasPool: '1', poolType: 'private', poolDimensions: '8 x 4', poolMinDepth: '1,2', poolMaxDepth: '2',
  hasChildBarrier: '1', isHeatedPool: '0', hasOutdoorShower: '1',
  foto_pool: 'https://ejemplo.test/piscina.jpg',
  hasBBQ: '1', bbqType: 'charcoal', hasSeaViews: '1', seaViewsFrom: 'Desde la terraza',
  parking: 'garage',
  foto_exterior1: 'https://ejemplo.test/ext1.jpg',
  foto_exterior2: 'https://ejemplo.test/ext2.jpg',
  foto_exterior3: '',
  distanceBeach: '900 m', distanceSupermarket: '2 km', distanceRestaurant: '1 km',
  distancePharmacy: '1,5 km', distanceAirport: '20 min',
  beachTowelsProvided: '1', publicTransport: 'Autobus cada hora', taxiTransfers: 'Taxi de prueba',
  observations_exterior: '',
  currentCleaner: 'Limpiezas de prueba', currentGardener: 'Jardines de prueba',
  currentPoolCompany: 'Piscinas de prueba', changeoverDay: 'sat',
  acceptsPets: '0', houseRules: 'No se fuma dentro.', ownerComments: 'Avisar antes de entrar.',
  observations_rules: '',
  fiscal_nif: 'X0000000X', fiscal_name: 'Ana Ejemplo', fiscal_address: 'Carrer Inventat, 9',
  fiscal_municipio: 'Ciutadella', acceptedTerms: true, acceptedTerms_at: '2026-09-21T09:00:00Z'
};

var R = ctx.construirVillaFields(FICHA);
var VF = R.villaFields;

/* 5.1 Los cinco campos que el Worker rechaza (revision de seguridad) */
ok('la lista de prohibidos son los cinco del Worker',
  ctx.NUNCA_ENVIAR.slice().sort().join(',') === 'Activa,Deal_Type,SIGNED,Status,villaid',
  ctx.NUNCA_ENVIAR.join(','));
['SIGNED', 'Activa', 'villaid', 'Status', 'Deal_Type'].forEach(function (k) {
  ok(k + ' nunca se envia', !(k in VF));
});
ok('tampoco salen si la propia ficha los trae dentro',
  (function () {
    var sucia = { propertyName: 'X', SIGNED: 1, Activa: 1, villaid: 99, Status: 3, Deal_Type: 2 };
    var r2 = ctx.construirVillaFields(sucia).villaFields;
    return ['SIGNED', 'Activa', 'villaid', 'Status', 'Deal_Type'].every(function (k) { return !(k in r2); });
  })());
ok('ningun destino del esquema es uno de los cinco prohibidos',
  ctx.FICHA_CAMPOS.filter(function (c) { return c.step >= 1; })
    .every(function (c) { return ctx.NUNCA_ENVIAR.indexOf(c.maps_to) < 0; }));

/* 5.2 El nombre */
ok('Name lleva el nombre de la villa', VF.Name === 'Villa Prueba', VF.Name);

/* 5.3 Texto llano, una sola fuente */
ok('Address tal cual', VF.Address === 'Carrer Inventat, 9', VF.Address);
ok('Googlemaps_link tal cual', VF.Googlemaps_link === 'https://maps.example.test/vp');
ok('Referencia_Catastral tal cual', VF.Referencia_Catastral === '0000000XX0000X');
ok('License tal cual', VF.License === 'ETV/0000');
ok('nro_rua tal cual', VF.nro_rua === 'RUA-0000');
ok('Keybox_code tal cual', VF.Keybox_code === '1234');
ok('Alarm_code tal cual', VF.Alarm_code === '9876');
ok('where_is_mainpower tal cual', VF.where_is_mainpower === 'En el garaje, a la derecha');
ok('wher_is_water_stopcock tal cual', VF.wher_is_water_stopcock === 'Debajo del fregadero');
ok('where_is_first_aid tal cual', VF.where_is_first_aid === 'En el bano de abajo');
ok('Wifi_user y Wifi_password tal cual', VF.Wifi_user === 'VillaPrueba' && VF.Wifi_password === 'clave-de-prueba');
ok('TV tal cual', VF.TV === 'Smart TV con Netflix');
ok('las cinco distancias tal cual',
  VF.Beach_distance === '900 m' && VF.Supermarket_distance === '2 km' &&
  VF.Restaurant_distance === '1 km' && VF.Pharmacy_distance === '1,5 km' && VF.Airport_distance === '20 min');
ok('Public_transpost y Taxi_and_Transfers tal cual',
  VF.Public_transpost === 'Autobus cada hora' && VF.Taxi_and_Transfers === 'Taxi de prueba');
ok('los cuatro campos fiscales viajan a sus campos de TaVillas',
  VF.propietario_NIF === 'X0000000X' && VF.propietario_Nombre_fiscal === 'Ana Ejemplo' &&
  VF.propietario_Calle_Fiscal === 'Carrer Inventat, 9' && VF.propietario_Municipio_fiscal === 'Ciutadella');
ok('Rooms_number lleva el total de dormitorios', VF.Rooms_number === '3', VF.Rooms_number);
ok('Fans_ventiladores lleva el numero de ventiladores', VF.Fans_ventiladores === '2', VF.Fans_ventiladores);

/* 5.4 Las fotos van a los campos cloudflare_* */
console.log(FILE + ': las fotos a los campos cloudflare_*');
ok('foto_keybox -> cloudflare_foto1_keybox1', VF.cloudflare_foto1_keybox1 === 'https://ejemplo.test/keybox.jpg');
ok('foto_etv_plate -> cloudflare_generic_image_2', VF.cloudflare_generic_image_2 === 'https://ejemplo.test/etv.jpg');
ok('foto_pool -> cloudflare_generic_image_1', VF.cloudflare_generic_image_1 === 'https://ejemplo.test/piscina.jpg');
ok('foto_electricalPanel -> cloudflare_foto_cuadro_electrico', VF.cloudflare_foto_cuadro_electrico === 'https://ejemplo.test/cuadro.jpg');
ok('foto_waterShutoff -> cloudflare_foto_llave_agua', VF.cloudflare_foto_llave_agua === 'https://ejemplo.test/llave.jpg');
ok('foto_safe -> cloudflare_safe_box_File1', VF.cloudflare_safe_box_File1 === 'https://ejemplo.test/caja.jpg');
ok('foto_exterior1 -> cloudflare_marketing_photos', VF.cloudflare_marketing_photos === 'https://ejemplo.test/ext1.jpg');
ok('floorPlanFile -> cloudflare_groundplan_file', /plano\.pdf$/.test(String(VF.cloudflare_groundplan_file)));
ok('solarPanelsPdf -> cloudflare_pdf_placas_solares', VF.cloudflare_pdf_placas_solares === 'https://ejemplo.test/placas.pdf');
ok('el jacuzzi sin manual no manda el pdf vacio', !('cloudflare_pdf_jacuzzi' in VF));
var camposFoto = Object.keys(VF).filter(function (k) { return k.indexOf('cloudflare_') === 0; });
ok('todo lo que empieza por cloudflare_ lleva una url', camposFoto.every(function (k) { return /^https?:\/\//.test(String(VF[k])); }),
  camposFoto.join(','));

/* 5.5 Las concatenaciones */
console.log(FILE + ': concatenaciones con punto medio');
ok('poolDimensions + las dos profundidades -> size_of_swimingpool',
  VF.size_of_swimingpool === 'Dimensiones de la piscina (m): 8 x 4 · Profundidad mínima: 1,2 · Profundidad máxima: 2',
  VF.size_of_swimingpool);
ok('waterHeaterType + waterHeaterLocation -> Caldera_info_team',
  VF.Caldera_info_team === 'Tipo de termo / caldera: Termo electrico · Dónde está el termo / caldera: En el lavadero',
  VF.Caldera_info_team);
ok('hasSafe + safeCode -> safe_box_comments_team',
  VF.safe_box_comments_team === 'Caja fuerte: Sí · Código de la caja fuerte: 0000',
  VF.safe_box_comments_team);
ok('observations_general + ownerComments -> Important_comments',
  VF.Important_comments === 'Observaciones (general): La casa esta al final del camino. · Comentarios del propietario: Avisar antes de entrar.',
  VF.Important_comments);
ok('las dos casillas de observaciones de camas y banos -> Beds_Explanation',
  VF.Beds_Explanation === 'Observaciones (dormitorios): Las camas son nuevas. · Observaciones (baños): El bano de abajo es pequeno.',
  VF.Beds_Explanation);
ok('electricitySupplier + electricityMeterLocation -> Electricidad_info_team',
  VF.Electricidad_info_team === 'Compañía de electricidad: Compania de prueba · Dónde está el contador de la luz: En la entrada',
  VF.Electricidad_info_team);
ok('waterSupplier + waterMeterLocation -> Agua_info_team',
  VF.Agua_info_team === 'Compañía del agua: Aguas de prueba · Dónde está el contador del agua: En la acera');
ok('gasSupplier + gasLocation -> Gas_info_team',
  VF.Gas_info_team === 'Gas: tipo y compañía: Butano · Dónde están las bombonas / la llave del gas: Caseta del jardin');
ok('hasSolarPanels + solarPanelsInfo -> Placas_solares_info',
  VF.Placas_solares_info === 'Placas solares: Sí · Placas solares: información: Cuatro placas en el tejado',
  VF.Placas_solares_info);
ok('hasBBQ + bbqType -> BBQ, con el tipo en espanol',
  VF.BBQ === 'Barbacoa: Sí · Tipo de barbacoa: Carbón', VF.BBQ);
/* Los cinco destinos que el esquema corrigio el 21/09/2026: ahora SI se envian */
ok('acBedrooms + observations_climatization -> Explanation_aircon',
  VF.Explanation_aircon === 'Aire acondicionado en dormitorios: En algunos · Observaciones (climatización): El aire del salon es nuevo.',
  VF.Explanation_aircon);
ok('coffeeMakerType -> Description_cofe_machine',
  VF.Description_cofe_machine === 'De capsulas', VF.Description_cofe_machine);
ok('internetProvider + contractedSpeed -> Wifi_speed_company_type',
  VF.Wifi_speed_company_type === 'Compañía de internet: Fibra de prueba · Velocidad contratada: 600 Mb',
  VF.Wifi_speed_company_type);
ok('fireExtinguisherLocation -> Extintores__extinguisher_comment, ya no a la mano',
  VF.Extintores__extinguisher_comment === 'En la cocina', VF.Extintores__extinguisher_comment);
ok('el Si/No Extintores__extinguisher ya no recibe texto', !('Extintores__extinguisher' in VF));
ok('poolType + la respuesta de la valla -> Swimingpool_fence_description',
  VF.Swimingpool_fence_description === 'Tipo de piscina: Privada · Valla de seguridad para niños: Sí',
  VF.Swimingpool_fence_description);
ok('y la valla viaja ademas sola al campo Si/No Swimingpool_fence', VF.Swimingpool_fence === true);
ok('una piscina sin valla contestada solo lleva el tipo en la descripcion',
  (function () {
    var r2 = ctx.construirVillaFields({ propertyName: 'X', hasPool: '1', poolType: 'communal' }).villaFields;
    return r2.Swimingpool_fence_description === 'Tipo de piscina: Comunitaria' && !('Swimingpool_fence' in r2);
  })());
ok('una valla contestada que no baja como false y lo dice en la descripcion',
  (function () {
    var r2 = ctx.construirVillaFields({ propertyName: 'X', poolType: 'private', hasChildBarrier: '0' }).villaFields;
    return r2.Swimingpool_fence === false &&
      r2.Swimingpool_fence_description === 'Tipo de piscina: Privada · Valla de seguridad para niños: No';
  })());
ok('los cuatro nombres viejos del esquema ya no aparecen en el codigo del mapeo',
  ['Aircon_Explanation', 'Cofe_Machine_Description', "'Wifi_speed'"].every(function (k) {
    return bloqueMapeo().indexOf(k) < 0;
  }));
ok('hasSeaViews + seaViewsFrom -> Views',
  VF.Views === 'Vistas al mar: Sí · Vistas al mar desde: Desde la terraza', VF.Views);
ok('un jacuzzi contestado que no y sin texto solo manda el No',
  VF.Jacuzzi_info_team === 'Jacuzzi: No', VF.Jacuzzi_info_team);
ok('las partes vacias no dejan puntos medios sueltos',
  Object.keys(VF).every(function (k) {
    var v = String(VF[k]);
    return v.indexOf(' ·  · ') < 0 && v.indexOf(' · ') !== 0 && !/ · $/.test(v);
  }));

/* 5.6 Cuentas y Si/No */
console.log(FILE + ': cuentas y Si/No');
ok('Pax_legal es un numero', VF.Pax_legal === 8, String(VF.Pax_legal));
ok('Total_Pax es un numero', VF.Total_Pax === 10, String(VF.Total_Pax));
ok('cots_cunas es un numero', VF.cots_cunas === 1, String(VF.cots_cunas));
ok('Highchair_silita es un numero', VF.Highchair_silita === 2, String(VF.Highchair_silita));
ok('dehumidifier_number es un numero', VF.dehumidifier_number === 1, String(VF.dehumidifier_number));
ok('Ensuite_BATHROOMS es la cuenta de la lista de banos en suite', VF.Ensuite_BATHROOMS === '1', VF.Ensuite_BATHROOMS);
ok('Shared_BATHROOMS es la cuenta de la lista de banos compartidos', VF.Shared_BATHROOMS === '2', VF.Shared_BATHROOMS);
ok('Dishwasher_lavaplatos va como 1 (entero Si/No de Caspio)', VF.Dishwasher_lavaplatos === 1, String(VF.Dishwasher_lavaplatos));
ok('Washing_machine va como 0 cuando el propietario dice que no', VF.Washing_machine === 0, String(VF.Washing_machine));
ok('Cofe_Machine va como 1', VF.Cofe_Machine === 1);
ok('Beach_towels_provided va como 1', VF.Beach_towels_provided === 1);
ok('Detector_de_humos__Smoke_Detecto va como 1', VF.Detector_de_humos__Smoke_Detecto === 1);
ok('Swimingpool_fence va como true (campo Yes/No de Caspio)', VF.Swimingpool_fence === true, String(VF.Swimingpool_fence));
ok('first_aid_kit va como true (campo Yes/No de Caspio)', VF.first_aid_kit === true, String(VF.first_aid_kit));
ok('ningun Si/No de Caspio viaja como texto',
  ['Dishwasher_lavaplatos', 'Washing_machine', 'Cofe_Machine', 'Beach_towels_provided', 'Detector_de_humos__Smoke_Detecto']
    .every(function (k) { return !(k in VF) || typeof VF[k] === 'number'; }));

/* 5.7 Los dormitorios */
console.log(FILE + ': los siete dormitorios');
ok('Room1comments resume el primer dormitorio con el texto de la cama',
  VF.Room1comments === 'Cama doble ancha · Medidas: 160x200 · Ubicación: Planta baja · Aire acondicionado: Sí · Ventilador de techo: No · Baño en suite: Sí (Ducha)',
  VF.Room1comments);
ok('Room2comments resume el segundo dormitorio', VF.Room2comments ===
  '2 camas individuales · Ubicación: Primera planta · Aire acondicionado: No · Ventilador de techo: Sí · Baño en suite: No',
  VF.Room2comments);
ok('no se inventa un tercer dormitorio', !('Room3comments' in VF));
ok('las camas, el aire, el ventilador, el bano y la planta NO se envian (son desplegables)',
  ['Room1Beds', 'Room1Aircon', 'Room1fan', 'Room1Bath', 'Room1foor',
   'Room2Beds', 'Room2Aircon', 'Room2fan', 'Room2Bath', 'Room2foor'].every(function (k) { return !(k in VF); }));
ok('nunca se escriben mas de siete habitaciones',
  (function () {
    var muchos = [], i;
    for (i = 0; i < 9; i++) muchos.push({ bedConfiguration: 'bunk', location: 'Planta ' + i });
    var r2 = ctx.construirVillaFields({ propertyName: 'X', bedrooms_json: JSON.stringify(muchos) });
    return !('Room8comments' in r2.villaFields) && ('Room7comments' in r2.villaFields);
  })());
ok('si hay mas de siete dormitorios se avisa en la lista de la mano',
  (function () {
    var muchos = [], i;
    for (i = 0; i < 9; i++) muchos.push({ bedConfiguration: 'bunk', location: 'Planta ' + i });
    var r2 = ctx.construirVillaFields({ propertyName: 'X', bedrooms_json: JSON.stringify(muchos) });
    return r2.manual.some(function (m) { return m.etiqueta === 'Dormitorios de más'; });
  })());

/* 5.8 Lo que NO se envia y queda para la mano */
console.log(FILE + ': "Para completar en Editar Villa"');
var enManual = R.manual.map(function (m) { return m.campo; });
[['Aircon', 'acLivingRoom'], ['Parking', 'parking'], ['Cleanning_team', 'currentCleaner'],
 ['Garden_team', 'currentGardener'], ['Pool_team', 'currentPoolCompany'], ['Changeoverday', 'changeoverDay'],
 ['Who_contract_internet', 'whoContractsInternet'], ['Pets_allowed', 'acceptsPets'],
 ['Swiming_pool', 'hasPool']].forEach(function (par) {
  ok(par[0] + ' es un desplegable: no se envia y sale en la lista de la mano',
    !(par[0] in VF) && enManual.indexOf(par[1]) >= 0, par[0] + ' en villaFields: ' + (par[0] in VF));
});
/* Wifi_Comany, ETV_Plate y House_Name_Plate siguen en la lista de desplegables
   como red, aunque desde el 21/09/2026 ninguna columna del esquema apunte a
   ellos: si manana alguna lo hiciera, iria a la mano y no al PUT. */
['Wifi_Comany', 'ETV_Plate', 'House_Name_Plate'].forEach(function (k) {
  ok(k + ' ya no tiene origen en el esquema y no se envia',
    !(k in VF) && ctx.FICHA_CAMPOS.every(function (c) { return c.maps_to !== k; }) &&
    ctx.TV_LOOKUP.indexOf(k) >= 0);
});
ok('acBedrooms, coffeeMakerType, contractedSpeed y el extintor YA NO estan en la lista de la mano',
  ['acBedrooms', 'coffeeMakerType', 'contractedSpeed', 'internetProvider', 'fireExtinguisherLocation']
    .every(function (c) { return enManual.indexOf(c) < 0; }),
  enManual.join(','));
ok('el tipo de piscina tampoco: ahora viaja en la descripcion de la valla',
  enManual.indexOf('poolType') < 0, enManual.join(','));
ok('la regla de seguridad contra un texto en un campo Si/No sigue viva en el codigo',
  /El campo ' \+ destino \+ ' de TaVillas es un Sí\/No y esta respuesta es texto/.test(bloqueMapeo()));
ok('cada linea de la lista lleva campo, etiqueta, valor y motivo',
  R.manual.every(function (m) { return m.campo && m.etiqueta && m.valor && m.motivo; }));
ok('las respuestas de la lista salen en espanol, no en clave',
  R.manual.some(function (m) { return m.campo === 'parking' && m.valor === 'Garaje'; }),
  JSON.stringify(R.manual.filter(function (m) { return m.campo === 'parking'; })));
ok('el dia de cambio sale en espanol',
  R.manual.some(function (m) { return m.campo === 'changeoverDay' && m.valor === 'Sábado'; }));
ok('los Si/No de la lista salen como Si o No',
  R.manual.some(function (m) { return m.campo === 'acceptsPets' && m.valor === 'No'; }));
ok('los archivos sin campo en TaVillas se avisan, no se pierden en silencio',
  ['foto_house_plate', 'foto_exterior2', 'licenseFile', 'registrationFile']
    .every(function (c) { return enManual.indexOf(c) >= 0; }), enManual.join(','));
ok('un archivo vacio no genera aviso', enManual.indexOf('foto_exterior3') < 0);

/* 5.9 Una ficha vacia no rompe nada */
console.log(FILE + ': ficha vacia');
var R0 = ctx.construirVillaFields({});
ok('una ficha vacia no revienta', !!R0 && !!R0.villaFields);
ok('y no manda ningun campo prohibido',
  !('SIGNED' in R0.villaFields) && !('Activa' in R0.villaFields) && !('villaid' in R0.villaFields));
ok('las dos cuentas de banos salen a 0', R0.villaFields.Ensuite_BATHROOMS === '0' && R0.villaFields.Shared_BATHROOMS === '0');
ok('no manda campos de texto vacios',
  Object.keys(R0.villaFields).every(function (k) { return String(R0.villaFields[k]) !== ''; }),
  JSON.stringify(R0.villaFields));
ok('construirVillaFields aguanta null', !!ctx.construirVillaFields(null).villaFields);
ok('un bedrooms_json roto no revienta', !!ctx.construirVillaFields({ bedrooms_json: '{no es json' }).villaFields);

/* ════════ 5bis. Revision del 21/09/2026 ════════ */

/* — (1) el XSS de la foto: escape y lista de origenes — */
console.log(FILE + ': escape y origen de las URL');
var ctxX = {};
vm.createContext(ctxX);
vm.runInContext(fnSource('esc') + '\n' +
  "var R2_PUBLIC = 'https://pub-48c1cfd5de614ff0a0cebfec482a7b32.r2.dev/';\n" +
  "var FOTOS_HOST = 'https://www.3villas.com/intranet/fotos/';\n" +
  fnSource('fotoUrl') + '\n' +
  'var ORIGENES_OK = [FOTOS_HOST, R2_PUBLIC];\n' +
  fnSource('urlSegura') + '\n' + fnSource('esImagen') + '\n' + fnSource('miniatura'), ctxX);

var POC = "a.jpg?');alert(1)//";
ok('esc escapa la comilla simple', ctxX.esc("'") === '&#39;');
ok('esc escapa la tilde invertida', ctxX.esc('`') === '&#96;');
ok('el valor de prueba no deja ni una comilla sin escapar',
  ctxX.esc(POC).indexOf("'") < 0 && ctxX.esc(POC).indexOf('"') < 0, ctxX.esc(POC));

/* El PoC, subido con ese nombre en el bucket de verdad: ni una comilla suelta
   puede llegar al HTML que se pinta en la pantalla del equipo. */
var pocUrl = 'https://pub-48c1cfd5de614ff0a0cebfec482a7b32.r2.dev/ficha/' + POC;
var htmlPoc = ctxX.miniatura(pocUrl);
ok('la miniatura del PoC no deja ninguna comilla simple sin escapar dentro del onclick',
  (function () {
    var m = htmlPoc.match(/onclick="openLB\('([^"]*)'\)"/);
    return !!m && m[1].indexOf("'") < 0;
  })(), htmlPoc.slice(0, 200));
ok('y el nombre sale escapado como &#39;', htmlPoc.indexOf('&#39;') > 0, htmlPoc.slice(0, 200));
ok('la miniatura del PoC no abre ninguna etiqueta nueva ni rompe el atributo',
  htmlPoc.indexOf('<script') < 0 && htmlPoc.indexOf("');alert") < 0, htmlPoc.slice(0, 220));
ok('el onclick del PoC sigue siendo una sola llamada a openLB',
  (htmlPoc.match(/openLB\(/g) || []).length === 1, htmlPoc.slice(0, 220));
ok('un javascript: NO se enlaza: sale como texto',
  (function () {
    var h = ctxX.miniatura('javascript:alert(1)');
    return h.indexOf('href') < 0 && h.indexOf('<img') < 0 && h.indexOf('Archivo de otro origen') >= 0;
  })(), ctxX.miniatura('javascript:alert(1)'));
ok('un data: tampoco se enlaza',
  ctxX.miniatura('data:text/html,<script>alert(1)</script>').indexOf('href') < 0);
ok('otro host tampoco, aunque acabe en .jpg',
  ctxX.miniatura('https://malo.example/a.jpg').indexOf('<img') < 0);
ok('una foto de verdad del bucket R2 SI se pinta, y por el mismo host',
  (function () {
    var h = ctxX.miniatura('https://pub-48c1cfd5de614ff0a0cebfec482a7b32.r2.dev/villa-info/a.jpg');
    return h.indexOf('<img src="https://www.3villas.com/intranet/fotos/villa-info/a.jpg"') >= 0;
  })());
ok('un PDF del bucket se enlaza con rel noopener noreferrer',
  (function () {
    var h = ctxX.miniatura('https://pub-48c1cfd5de614ff0a0cebfec482a7b32.r2.dev/ficha/x.pdf');
    return h.indexOf('rel="noopener noreferrer"') > 0;
  })());
ok('sin archivo sale una raya', ctxX.miniatura('').indexOf('—') > 0);
ok('urlSegura RECHAZA un http:// del propio host',
  ctxX.urlSegura('http://www.3villas.com/intranet/fotos/a.jpg') === '');
ok('la lista de origenes son solo los dos del Worker', ctxX.ORIGENES_OK.length === 2);

/* — (10) nada de lo contestado se pierde — */
console.log(FILE + ': ninguna respuesta se cae en silencio');
var SIN_DESTINO = ctx.FICHA_CAMPOS.filter(function (c) {
  return c.step >= 1 && !c.maps_to &&
    ['bedrooms_json', 'bathrooms_json', 'sharedBathrooms_json', 'acceptedTerms', 'acceptedTerms_at'].indexOf(c.name) < 0;
}).map(function (c) { return c.name; });
ok('el esquema tiene ' + SIN_DESTINO.length + ' columnas contestables sin campo en TaVillas', SIN_DESTINO.length > 10);
var faltanEnManual = SIN_DESTINO.filter(function (c) {
  return String(FICHA[c] === undefined || FICHA[c] === null ? '' : FICHA[c]).trim() !== '' && enManual.indexOf(c) < 0;
});
ok('todas las que la ficha de prueba contesta salen en la lista de la mano',
  faltanEnManual.length === 0, faltanEnManual.join(', '));
['stoveType', 'totalBathrooms', 'houseRules', 'hasHeating', 'isHeatedPool', 'hasOutdoorShower',
 'hasBoardGames', 'hasOven', 'hasMicrowave', 'hasDryer', 'hasIron', 'hasHairDryer',
 'poolMinDepth', 'poolMaxDepth'].forEach(function (c) {
  var esp = ctx.FICHA_CAMPOS.filter(function (x) { return x.name === c; })[0];
  if (esp && esp.maps_to) { ok(c + ' SI tiene destino en TaVillas, asi que viaja', true); return; }
  ok(c + ' no tiene destino: sale en la lista de la mano', enManual.indexOf(c) >= 0, enManual.join(','));
});
ok('las casillas de observaciones sin destino tambien salen',
  ctx.FICHA_CAMPOS.filter(function (c) {
    return c.name.indexOf('observations_') === 0 && !c.maps_to &&
      String(FICHA[c.name] || '').trim() !== '';
  }).every(function (c) { return enManual.indexOf(c.name) >= 0; }));
ok('una respuesta vacia NO genera aviso',
  enManual.indexOf('observations_facilities') < 0 && enManual.indexOf('foto_exterior3') < 0);
ok('la conformidad no se cuela en la lista (no es un dato de la villa)',
  enManual.indexOf('acceptedTerms') < 0 && enManual.indexOf('acceptedTerms_at') < 0);
ok('las tres listas JSON no se cuelan como fila suelta',
  ['bathrooms_json', 'sharedBathrooms_json'].every(function (c) { return enManual.indexOf(c) < 0; }));
ok('los Si/No sin destino salen como Si o No, no como 1 ni 0',
  R.manual.some(function (m) { return m.campo === 'hasOven' && m.valor === 'Sí'; }) &&
  R.manual.some(function (m) { return m.campo === 'hasDryer' && m.valor === 'No'; }));
ok('el tipo de placa sale en espanol',
  R.manual.some(function (m) { return m.campo === 'stoveType' && m.valor === 'Inducción'; }),
  JSON.stringify(R.manual.filter(function (m) { return m.campo === 'stoveType'; })));

/* — (11) los textos de 255 caracteres — */
console.log(FILE + ': los campos de 255 caracteres');
ok('la lista de destinos STRING(255) son los siete del contrato',
  ctx.TV_STRING255.slice().sort().join(',') ===
  ['Caldera_info_team', 'Description_cofe_machine', 'Explanation_aircon',
   'Extintores__extinguisher_comment', 'Jacuzzi_info_team', 'Wifi_speed_company_type',
   'safe_box_comments_team'].sort().join(','), ctx.TV_STRING255.join(','));
var LARGO = new Array(400).join('x');   /* 399 caracteres */
var rLargo = ctx.construirVillaFields({ propertyName: 'X', waterHeaterType: LARGO, waterHeaterLocation: 'En el lavadero' });
ok('un texto de mas de 255 se manda cortado a 255',
  rLargo.villaFields.Caldera_info_team.length === 255, String(rLargo.villaFields.Caldera_info_team.length));
ok('y acaba en puntos suspensivos', /…$/.test(rLargo.villaFields.Caldera_info_team));
ok('el texto completo pasa a la lista de la mano',
  rLargo.manual.some(function (m) { return m.valor.length > 255 && /texto completo/.test(m.etiqueta); }),
  JSON.stringify(rLargo.manual.map(function (m) { return m.etiqueta; })));
ok('y el motivo dice cuantos caracteres tiene',
  rLargo.manual.some(function (m) { return /admite 255 caracteres y esta respuesta tiene \d+/.test(m.motivo); }));
ok('un texto que cabe NO se corta ni se duplica en la lista',
  (function () {
    var r2 = ctx.construirVillaFields({ propertyName: 'X', waterHeaterType: 'Termo electrico' });
    return r2.villaFields.Caldera_info_team === 'Tipo de termo / caldera: Termo electrico' &&
      !r2.manual.some(function (m) { return /texto completo/.test(m.etiqueta); });
  })());
ok('ningun destino de 255 se manda mas largo de 255',
  ctx.TV_STRING255.every(function (k) { return !(k in VF) || String(VF[k]).length <= 255; }));
ok('los destinos que NO son de 255 no se cortan',
  (function () {
    var r2 = ctx.construirVillaFields({ propertyName: 'X', houseRules: LARGO, observations_general: LARGO });
    return !('Important_comments' in r2.villaFields) || r2.villaFields.Important_comments.length > 255;
  })());

/* — (12) la caducidad es el exp del JWT, en segundos — */
console.log(FILE + ': la caducidad del enlace');
var ctxC = {};
vm.createContext(ctxC);
vm.runInContext(fnSource('fecha') + '\n' + fnSource('fechaCaducidad'), ctxC);
var EPOCH = Math.floor(Date.UTC(2026, 9, 21, 10, 0, 0) / 1000);   /* 21/10/2026 */
ok('un exp en segundos se lee como fecha', ctxC.fechaCaducidad(EPOCH) === '21/10/2026', ctxC.fechaCaducidad(EPOCH));
ok('y tambien si llega como texto numerico', ctxC.fechaCaducidad(String(EPOCH)) === '21/10/2026');
ok('ya NO sale la cifra cruda cortada a diez', ctxC.fechaCaducidad(EPOCH).indexOf('17') !== 0);
ok('una fecha en texto sigue valiendo', ctxC.fechaCaducidad('2026-10-21T10:00:00Z') === '21/10/2026');
ok('vacio no ensena nada', ctxC.fechaCaducidad('') === '' && ctxC.fechaCaducidad(null) === '');
ok('fecha() acepta un Date', ctxC.fecha(new Date(2026, 8, 21)) === '21/09/2026');

/* — (13) el texto de WhatsApp por idioma — */
console.log(FILE + ': el texto de WhatsApp');
var ctxW = {};
vm.createContext(ctxW);
vm.runInContext(varBlock('WA_TXT', '\n};') + '\n' + fnSource('textoWhatsApp'), ctxW);
ok('hay texto en los cinco idiomas',
  ['es', 'en', 'fr', 'de', 'it'].every(function (l) { return !!ctxW.WA_TXT[l]; }), Object.keys(ctxW.WA_TXT).join(','));
ok('el texto espanol es el exacto del contrato',
  ctxW.textoWhatsApp('es', 'Ana', 'Villa Prueba', '21/10/2026', 'https://x.test/a') ===
  'Hola Ana, somos 3Villas. Le enviamos el enlace para completar los datos de Villa Prueba. Puede hacerlo poco a poco, se guarda solo. El enlace caduca el 21/10/2026: https://x.test/a',
  ctxW.textoWhatsApp('es', 'Ana', 'Villa Prueba', '21/10/2026', 'https://x.test/a'));
['en', 'fr', 'de', 'it'].forEach(function (l) {
  var txt = ctxW.textoWhatsApp(l, 'Ana', 'Villa Prueba', '21/10/2026', 'https://x.test/a');
  ok('el texto ' + l + ' lleva nombre, villa, caducidad y enlace',
    txt.indexOf('Ana') >= 0 && txt.indexOf('Villa Prueba') >= 0 &&
    txt.indexOf('21/10/2026') >= 0 && txt.indexOf('https://x.test/a') >= 0, txt);
  ok('el texto ' + l + ' no deja ningun hueco sin rellenar', txt.indexOf('{') < 0, txt);
  ok('el texto ' + l + ' es corto (menos de 300 caracteres)', txt.length < 300, String(txt.length));
});
ok('un idioma que no existe cae al espanol',
  ctxW.textoWhatsApp('zz', 'Ana', 'V', 'f', 'l').indexOf('Hola Ana') === 0);
ok('el boton usa el idioma de la ficha',
  /textoWhatsApp\(cuerpo\.lang, cuerpo\.ownerName, cuerpo\.propertyName, fCad, j\.link\)/.test(codigo));

/* — (14) sin contestar es una raya — */
console.log(FILE + ': las tablas de dormitorios y banos');
var ctxG = {};
vm.createContext(ctxG);
vm.runInContext(fnSource('esSi') + '\n' + fnSource('esNo') + '\n' + fnSource('siNoGuion'), ctxG);
ok('contestado que si sale Si', ctxG.siNoGuion('1') === 'Sí' && ctxG.siNoGuion(true) === 'Sí');
ok('contestado que no sale No', ctxG.siNoGuion('0') === 'No' && ctxG.siNoGuion(false) === 'No');
ok('sin contestar sale una raya, NO un No',
  ctxG.siNoGuion('').indexOf('—') > 0 && ctxG.siNoGuion(null).indexOf('—') > 0 &&
  ctxG.siNoGuion(undefined).indexOf('—') > 0);
ok('y la raya va en gris de campo vacio', ctxG.siNoGuion('').indexOf('det-vacio') > 0);
ok('la tabla de dormitorios usa siNoGuion en aire, ventilador y en suite',
  /siNoGuion\(it\.hasAC\)/.test(codigo) && /siNoGuion\(it\.hasCeilingFan\)/.test(codigo) &&
  /siNoGuion\(it\.hasEnSuite\)/.test(codigo));
ok('la de banos lo usa en banera, ducha y bide',
  /siNoGuion\(it\.hasBathtub\)/.test(codigo) && /siNoGuion\(it\.hasShower\)/.test(codigo) &&
  /siNoGuion\(it\.hasBidet\)/.test(codigo));

/* — (15) marcar revisada cierra la ficha — */
console.log(FILE + ': revisar y promover piden confirmacion');
ok('el boton lleva la nota de que el propietario ya no podra editar',
  codigo.indexOf('(el propietario ya no podrá editar)') > 0);
ok('y pregunta antes de cerrar la ficha',
  /function marcarRevisada\(\)\{[\s\S]{0,420}window\.confirm\('Marcar esta ficha como revisada\. El propietario ya no podrá editarla/.test(codigo));
ok('la pregunta va ANTES de la llamada al Worker',
  (function () {
    var i = codigo.indexOf('function marcarRevisada('), j = codigo.indexOf('function abrirPromocion(');
    var b2 = codigo.slice(i, j);
    return b2.indexOf('window.confirm') < b2.indexOf('ficha-promote');
  })());

/* — (16) promover pide confirmacion y ensena lo que copia — */
ok('promover pregunta con el texto del contrato',
  /function promover\(id\)\{[\s\S]{0,220}window\.confirm\('Esto crea una villa nueva\. No se puede deshacer desde aquí\. ¿Sigue\?'\)/.test(codigo));
ok('la pregunta va ANTES de la llamada al Worker',
  (function () {
    var i = codigo.indexOf('function promover(');
    var b2 = codigo.slice(i, i + 1400);
    return b2.indexOf('window.confirm') < b2.indexOf('ficha-promote');
  })());
ok('el aviso tambien sale escrito en la pantalla',
  codigo.indexOf('Esto crea una villa nueva. No se puede deshacer desde aquí.') > 0);
ok('hay una lista plegable con los campos que se van a copiar',
  /<details class="promo-det"><summary>Ver los ' \+ n \+ ' campos que se van a copiar<\/summary>/.test(codigo));
ok('la lista ensena el campo y el valor de cada uno',
  /esc\(claves\[z\]\) \+ '<\/td><td>' \+ esc\(String\(r\.villaFields\[claves\[z\]\]\)\)/.test(codigo));
ok('y va ordenada', /claves\.sort\(\);/.test(codigo));
ok('el resumen plegable tiene 36 px de alto para el dedo', /\.promo-det summary\{[^}]*min-height:36px/.test(S));

/* — (17) filtro y columna "Enviada el" — */
console.log(FILE + ': filtro y columna de envio');
var ctxL2 = {};
vm.createContext(ctxL2);
vm.runInContext(fnSource('llano'), ctxL2);
ok('llano quita los acentos', ctxL2.llano('José Muñoz') === 'jose munoz');
ok('llano baja a minusculas', ctxL2.llano('VILLA') === 'villa');
ok('llano aguanta vacio y null', ctxL2.llano('') === '' && ctxL2.llano(null) === '');
ok('existe el cuadro de busqueda', codigo.indexOf('id="filtro"') > 0 && codigo.indexOf('oninput="filtrar()"') > 0);
ok('el filtro mira propietario Y villa',
  /llano\(f\.ownerName\)\.indexOf\(q\) >= 0 \|\| llano\(f\.propertyName\)\.indexOf\(q\) >= 0/.test(codigo));
ok('la tabla tiene las siete columnas, con "Enviada el"',
  codigo.indexOf('<th>Fecha</th><th>Propietario</th><th>Villa</th><th>Estado</th><th>Enviada el</th><th>Idioma</th><th>Acciones</th>') > 0);
ok('la fecha de envio sale de submitted_at', /var env = fecha\(f\.submitted_at\);/.test(codigo));
ok('y sin envio sale una raya', /env \? esc\(env\) : '<span class="det-vacio">—<\/span>'/.test(codigo));
ok('se dice cuantas fichas se ven de cuantas',
  /vis\.length \+ ' de ' \+ fichas\.length \+ ' fichas\./.test(codigo));
ok('si el filtro no encuentra nada lo dice', codigo.indexOf('Ninguna ficha coincide con la búsqueda.') > 0);
ok('el foco vuelve al cuadro despues de repintar', /c\.focus\(\); c\.selectionStart = c\.selectionEnd = c\.value\.length;/.test(codigo));
ok('filtrar esta expuesta en window', /window\.filtrar = filtrar;/.test(codigo));

/* — (18) los campos vacios se esconden — */
console.log(FILE + ': el detalle esconde los vacios');
ok('arranca escondiendo los vacios', /var verVacios = false;/.test(codigo));
ok('hay un boton que los ensena y los esconde',
  codigo.indexOf('alternarVacios()') > 0 &&
  /verVacios \? 'Ocultar vacíos' : 'Mostrar vacíos'/.test(codigo));
ok('un texto vacio se salta y se cuenta', /if\(txt === '' && !verVacios\)\{ nVacios\+\+; continue; \}/.test(codigo));
ok('una foto vacia tambien', /if\(!v && !verVacios\)\{ nVacios\+\+; continue; \}/.test(codigo));
ok('y una lista vacia tambien',
  /if\(!listaDe\(f\[d\.name\]\)\.length && !verVacios\)\{ nVacios\+\+; continue; \}/.test(codigo));
ok('se dice cuantos se han escondido',
  /nVacios \+ ' campos sin contestar están escondidos/.test(codigo));
ok('alternarVacios repinta el detalle abierto',
  /function alternarVacios\(\)\{\s*verVacios = !verVacios;\s*if\(fichaAbierta\) verFicha\(fichaAbierta\.ficha_id\);/.test(codigo));
ok('alternarVacios esta expuesta en window', /window\.alternarVacios = alternarVacios;/.test(codigo));

/* ════════ 6. nav.js lleva la entrada ════════ */
console.log('nav.js: v15');
var NAV = fs.readFileSync('nav.js', 'utf8');
ok('cabecera y VERSION ACTUAL en v15',
  /nav\.js — MENÚS POR ROL  3Villas  v15/.test(NAV) && /VERSIÓN ACTUAL: v15 \|/.test(NAV));
ok('NAV_VERSION 15 (la auto-deteccion mira este numero)',
  NAV.indexOf('var NAV_VERSION = 15;') > 0 && NAV.indexOf('var NAV_VERSION = 14;') < 0);
ok('historial v15 y conserva la v14', /\/\/ HISTORIAL: v15 - /.test(NAV) && / \| v14 - /.test(NAV));
var navCodigo = NAV.split('// HISTORIAL:')[0];
ok('la entrada "Fichas de propietarios" existe',
  navCodigo.indexOf("{ label: 'Fichas de propietarios', url: 'fichas-propietarios.html',        icon: '📋' },") > 0);
ok('esta justo debajo de "Nueva Villa"',
  navCodigo.indexOf("url: 'fichas-propietarios.html'") > navCodigo.indexOf("url: 'crear-villa.html'") &&
  navCodigo.indexOf("url: 'fichas-propietarios.html'") < navCodigo.indexOf("url: 'control-waiver.html'"));
ok('esta una sola vez y solo en el menu de admin y manager (_menuAdmin)',
  navCodigo.split('fichas-propietarios.html').length - 1 === 1 &&
  navCodigo.indexOf('fichas-propietarios.html') < navCodigo.indexOf('var _menuStaff'));
ok('ve la entrada el mismo grupo de roles que ve "Nueva Villa"',
  navCodigo.indexOf("url: 'crear-villa.html'") < navCodigo.indexOf('var _menuStaff'));
/* El propietario llega por su enlace con token, nunca por el menu del equipo.
   El historial de nav.js si la nombra, y eso es prosa, no un enlace. */
ok('la pagina publica del propietario NO entra en ningun menu', navCodigo.indexOf('ficha-propietario.html') < 0);

/* ════════ 7. Todos los <script> inline compilan ════════ */
var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, n = 0, err = null;
try { while ((m = re.exec(S))) { n++; new vm.Script(m[1], { filename: FILE + '#script' + n }); } } catch (e) { err = String(e); }
ok('los ' + n + ' scripts inline compilan', !err, err);

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
