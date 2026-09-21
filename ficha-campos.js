// ================================================================
//  ficha-campos.js — CAMPOS DE LA FICHA DE PROPIETARIO  3Villas  v01
// ================================================================
// VERSIÓN ACTUAL: v01 | Historial completo al final de este archivo
//
// ARCHIVO GENERADO. No se edita a mano.
// Fuente única: 3villas/workers/caspio-proxy/ficha-schema.json
//   tabla TaVillas_ficha, version 1, fecha 2026-09-21.
// La prueba ficha-campos.test.js compara este archivo con el JSON campo a campo:
// si el JSON cambia y este archivo no se regenera, la prueba falla.
//
// step 0  = columnas de sistema. Nunca son un campo del formulario.
// step 1..9 = los nueve pasos de ficha-propietario.html.
// maps_to = campo de TaVillas que recibe el valor al promover. Vacío = no viaja.
//
// GENERADOR. El repo no tiene carpeta scripts/, así que el generador vive aquí.
// Para regenerar: guardar el bloque siguiente como gen-ficha-campos.js dentro de
// intranet/ y ejecutar "node gen-ficha-campos.js" desde esa carpeta.
//
//   var fs = require('fs');
//   var SCHEMA = '../../3villas/workers/caspio-proxy/ficha-schema.json';  /* ruta desde intranet/ */
//   var OUT = 'ficha-campos.js';
//   var j = JSON.parse(fs.readFileSync(SCHEMA, 'utf8'));
//   function q(s){ return JSON.stringify(s == null ? '' : s); }
//   var filas = j.columns.map(function (c) {
//     return '  { name: ' + q(c.name) + ', type: ' + q(c.type) + ', step: ' + c.step +
//       ', label_es: ' + q(c.label_es) + ', maps_to: ' + q(c.maps_to) + ', note: ' + q(c.note) + ' }';
//   }).join(',\n');
//   /* Se conserva tal cual la cabecera de comentarios y el HISTORIAL del archivo
//      actual: solo se sustituye el bloque entre 'window.FICHA_CAMPOS = [' y '];'. */
//   var viejo = fs.readFileSync(OUT, 'utf8');
//   var a = viejo.indexOf('window.FICHA_CAMPOS = [');
//   var b = viejo.indexOf('\n];', a);
//   var nuevo = viejo.slice(0, a) + 'window.FICHA_CAMPOS = [\n' + filas + viejo.slice(b);
//   nuevo = nuevo.replace(/window\.FICHA_SCHEMA_META = \{[^}]*\}/,
//     'window.FICHA_SCHEMA_META = { table: ' + q(j.table) + ', version: ' + j.version + ', date: ' + q(j.date) + ' }');
//   fs.writeFileSync(OUT, nuevo);
//   console.log('ficha-campos.js regenerado: ' + j.columns.length + ' columnas');

window.FICHA_CAMPOS = [
  { name: "ficha_id", type: "AUTONUMBER", step: 0, label_es: "Id de ficha", maps_to: "", note: "clave; va dentro del token" },
  { name: "ficha_status", type: "STRING", step: 0, label_es: "Estado", maps_to: "", note: "abierta | enviada | revisada | promovida" },
  { name: "lang", type: "STRING", step: 0, label_es: "Idioma", maps_to: "", note: "es en fr de it" },
  { name: "created_by", type: "STRING", step: 0, label_es: "Creada por (UserID)", maps_to: "", note: "" },
  { name: "created_at", type: "DATE/TIME", step: 0, label_es: "Creada el", maps_to: "", note: "" },
  { name: "submitted_at", type: "DATE/TIME", step: 0, label_es: "Enviada el", maps_to: "", note: "" },
  { name: "reviewed_by", type: "STRING", step: 0, label_es: "Revisada por (UserID)", maps_to: "", note: "" },
  { name: "promoted_at", type: "DATE/TIME", step: 0, label_es: "Promovida el", maps_to: "", note: "" },
  { name: "villaid", type: "INTEGER", step: 0, label_es: "villaid creado", maps_to: "villaid", note: "se rellena al promover" },
  { name: "notas_revision", type: "TEXT", step: 0, label_es: "Notas de revisión (equipo)", maps_to: "", note: "" },
  { name: "ownerName", type: "STRING", step: 1, label_es: "Nombre del propietario", maps_to: "", note: "TaContacts más adelante" },
  { name: "propertyName", type: "STRING", step: 1, label_es: "Nombre de la villa", maps_to: "Name", note: "" },
  { name: "email", type: "STRING", step: 1, label_es: "Correo electrónico", maps_to: "", note: "" },
  { name: "phone", type: "STRING", step: 1, label_es: "Teléfono", maps_to: "", note: "" },
  { name: "address", type: "STRING", step: 1, label_es: "Dirección completa", maps_to: "Address", note: "adición 1" },
  { name: "googlemaps_link", type: "STRING", step: 1, label_es: "Enlace de Google Maps", maps_to: "Googlemaps_link", note: "adición 1" },
  { name: "referencia_catastral", type: "STRING", step: 1, label_es: "Referencia catastral", maps_to: "Referencia_Catastral", note: "adición 1" },
  { name: "licenseNumber", type: "STRING", step: 1, label_es: "Número de licencia turística (ETV)", maps_to: "License", note: "" },
  { name: "licenseFile", type: "STRING", step: 1, label_es: "Documento de la licencia (URL)", maps_to: "", note: "" },
  { name: "registrationNumber", type: "STRING", step: 1, label_es: "Número de registro nacional", maps_to: "nro_rua", note: "" },
  { name: "registrationFile", type: "STRING", step: 1, label_es: "Documento del registro (URL)", maps_to: "", note: "" },
  { name: "floorPlanFile", type: "STRING", step: 1, label_es: "Plano de la casa (URL)", maps_to: "cloudflare_groundplan_file", note: "adición 3" },
  { name: "legalCapacity", type: "INTEGER", step: 1, label_es: "Plazas legales", maps_to: "Pax_legal", note: "" },
  { name: "totalCapacity", type: "INTEGER", step: 1, label_es: "Plazas totales", maps_to: "Total_Pax", note: "" },
  { name: "keyboxNumber", type: "STRING", step: 1, label_es: "Nº keybox", maps_to: "Keybox_code", note: "" },
  { name: "alarmCode", type: "STRING", step: 1, label_es: "Código de alarma", maps_to: "Alarm_code", note: "" },
  { name: "foto_etv_plate", type: "STRING", step: 1, label_es: "Foto de la placa ETV", maps_to: "cloudflare_generic_image_2", note: "adición 2" },
  { name: "foto_house_plate", type: "STRING", step: 1, label_es: "Foto de la placa con el nombre de la casa", maps_to: "", note: "adición 2" },
  { name: "foto_keybox", type: "STRING", step: 1, label_es: "Foto del keybox", maps_to: "cloudflare_foto1_keybox1", note: "adición 2" },
  { name: "observations_general", type: "TEXT", step: 1, label_es: "Observaciones (general)", maps_to: "Important_comments", note: "" },
  { name: "acLivingRoom", type: "YES/NO", step: 2, label_es: "Aire acondicionado en el salón", maps_to: "Aircon", note: "" },
  { name: "acBedrooms", type: "STRING", step: 2, label_es: "Aire acondicionado en dormitorios", maps_to: "Explanation_aircon", note: "all | some | none" },
  { name: "numberOfFans", type: "INTEGER", step: 2, label_es: "Número de ventiladores portátiles", maps_to: "Fans_ventiladores", note: "" },
  { name: "dehumidifiers", type: "INTEGER", step: 2, label_es: "Número de deshumidificadores", maps_to: "dehumidifier_number", note: "adición 11" },
  { name: "hasHeating", type: "YES/NO", step: 2, label_es: "Calefacción central", maps_to: "", note: "" },
  { name: "observations_climatization", type: "TEXT", step: 2, label_es: "Observaciones (climatización)", maps_to: "Explanation_aircon", note: "" },
  { name: "totalBedrooms", type: "INTEGER", step: 3, label_es: "Número total de dormitorios", maps_to: "Rooms_number", note: "" },
  { name: "bedrooms_json", type: "TEXT", step: 3, label_es: "Dormitorios (lista)", maps_to: "Room1..Room7_*", note: "JSON: [{n, bedConfiguration, bedDimensions, location, hasAC, hasCeilingFan, hasEnSuite, enSuiteBathtubOrShower, photo}]" },
  { name: "observations_bedrooms", type: "TEXT", step: 3, label_es: "Observaciones (dormitorios)", maps_to: "Beds_Explanation", note: "" },
  { name: "totalBathrooms", type: "INTEGER", step: 4, label_es: "Número total de baños", maps_to: "", note: "" },
  { name: "bathrooms_json", type: "TEXT", step: 4, label_es: "Baños en suite (lista)", maps_to: "Ensuite_BATHROOMS", note: "JSON: [{associatedBedroom, hasBathtub, hasShower, hasBidet, photo}]; el recuento va al campo" },
  { name: "sharedBathrooms_json", type: "TEXT", step: 4, label_es: "Baños compartidos (lista)", maps_to: "Shared_BATHROOMS", note: "JSON igual; el recuento va al campo" },
  { name: "observations_bathrooms", type: "TEXT", step: 4, label_es: "Observaciones (baños)", maps_to: "Beds_Explanation", note: "" },
  { name: "hasDishwasher", type: "YES/NO", step: 5, label_es: "Lavavajillas", maps_to: "Dishwasher_lavaplatos", note: "" },
  { name: "hasOven", type: "YES/NO", step: 5, label_es: "Horno", maps_to: "", note: "" },
  { name: "hasMicrowave", type: "YES/NO", step: 5, label_es: "Microondas", maps_to: "", note: "" },
  { name: "hasCoffeeMaker", type: "YES/NO", step: 5, label_es: "Cafetera", maps_to: "Cofe_Machine", note: "" },
  { name: "hasWashingMachine", type: "YES/NO", step: 5, label_es: "Lavadora", maps_to: "Washing_machine", note: "" },
  { name: "hasDryer", type: "YES/NO", step: 5, label_es: "Secadora", maps_to: "", note: "" },
  { name: "hasIron", type: "YES/NO", step: 5, label_es: "Plancha y tabla", maps_to: "", note: "" },
  { name: "hasHairDryer", type: "YES/NO", step: 5, label_es: "Secador de pelo", maps_to: "", note: "" },
  { name: "coffeeMakerType", type: "STRING", step: 5, label_es: "Tipo de cafetera", maps_to: "Description_cofe_machine", note: "" },
  { name: "stoveType", type: "STRING", step: 5, label_es: "Tipo de placa", maps_to: "", note: "gas | induction | ceramic | electric" },
  { name: "numberOfCribs", type: "INTEGER", step: 5, label_es: "Número de cunas", maps_to: "cots_cunas", note: "" },
  { name: "numberOfHighChairs", type: "INTEGER", step: 5, label_es: "Número de tronas", maps_to: "Highchair_silita", note: "" },
  { name: "observations_equipment", type: "TEXT", step: 5, label_es: "Observaciones (equipamiento)", maps_to: "", note: "" },
  { name: "electricalPanelLocation", type: "STRING", step: 6, label_es: "Dónde está el cuadro eléctrico", maps_to: "where_is_mainpower", note: "" },
  { name: "foto_electricalPanel", type: "STRING", step: 6, label_es: "Foto del cuadro eléctrico", maps_to: "cloudflare_foto_cuadro_electrico", note: "adición 2" },
  { name: "fireExtinguisherLocation", type: "STRING", step: 6, label_es: "Dónde está el extintor", maps_to: "Extintores__extinguisher_comment", note: "" },
  { name: "waterShutoffLocation", type: "STRING", step: 6, label_es: "Dónde está la llave de paso del agua", maps_to: "wher_is_water_stopcock", note: "" },
  { name: "foto_waterShutoff", type: "STRING", step: 6, label_es: "Foto de la llave de paso", maps_to: "cloudflare_foto_llave_agua", note: "adición 2" },
  { name: "waterHeaterType", type: "STRING", step: 6, label_es: "Tipo de termo / caldera", maps_to: "Caldera_info_team", note: "" },
  { name: "waterHeaterLocation", type: "STRING", step: 6, label_es: "Dónde está el termo / caldera", maps_to: "Caldera_info_team", note: "" },
  { name: "hasSmokeDetector", type: "YES/NO", step: 6, label_es: "Detector de humos", maps_to: "Detector_de_humos__Smoke_Detecto", note: "adición 4" },
  { name: "hasFirstAidKit", type: "YES/NO", step: 6, label_es: "Botiquín", maps_to: "first_aid_kit", note: "adición 4" },
  { name: "firstAidLocation", type: "STRING", step: 6, label_es: "Dónde está el botiquín", maps_to: "where_is_first_aid", note: "adición 4" },
  { name: "electricitySupplier", type: "STRING", step: 6, label_es: "Compañía de electricidad", maps_to: "Electricidad_info_team", note: "adición 5" },
  { name: "electricityMeterLocation", type: "STRING", step: 6, label_es: "Dónde está el contador de la luz", maps_to: "Electricidad_info_team", note: "adición 5" },
  { name: "waterSupplier", type: "STRING", step: 6, label_es: "Compañía del agua", maps_to: "Agua_info_team", note: "adición 5" },
  { name: "waterMeterLocation", type: "STRING", step: 6, label_es: "Dónde está el contador del agua", maps_to: "Agua_info_team", note: "adición 5" },
  { name: "gasSupplier", type: "STRING", step: 6, label_es: "Gas: tipo y compañía", maps_to: "Gas_info_team", note: "adición 5" },
  { name: "gasLocation", type: "STRING", step: 6, label_es: "Dónde están las bombonas / la llave del gas", maps_to: "Gas_info_team", note: "adición 5" },
  { name: "hasSolarPanels", type: "YES/NO", step: 6, label_es: "Placas solares", maps_to: "Placas_solares_info", note: "adición 6" },
  { name: "solarPanelsInfo", type: "STRING", step: 6, label_es: "Placas solares: información", maps_to: "Placas_solares_info", note: "adición 6" },
  { name: "solarPanelsPdf", type: "STRING", step: 6, label_es: "Placas solares: manual (URL)", maps_to: "cloudflare_pdf_placas_solares", note: "adición 6" },
  { name: "hasJacuzzi", type: "YES/NO", step: 6, label_es: "Jacuzzi", maps_to: "Jacuzzi_info_team", note: "adición 6" },
  { name: "jacuzziInfo", type: "STRING", step: 6, label_es: "Jacuzzi: información", maps_to: "Jacuzzi_info_team", note: "adición 6" },
  { name: "jacuzziPdf", type: "STRING", step: 6, label_es: "Jacuzzi: manual (URL)", maps_to: "cloudflare_pdf_jacuzzi", note: "adición 6" },
  { name: "observations_facilities", type: "TEXT", step: 6, label_es: "Observaciones (instalaciones)", maps_to: "", note: "" },
  { name: "internetProvider", type: "STRING", step: 7, label_es: "Compañía de internet", maps_to: "Wifi_speed_company_type", note: "" },
  { name: "contractedSpeed", type: "STRING", step: 7, label_es: "Velocidad contratada", maps_to: "Wifi_speed_company_type", note: "" },
  { name: "wifiUsername", type: "STRING", step: 7, label_es: "Nombre de la red wifi", maps_to: "Wifi_user", note: "" },
  { name: "wifiPassword", type: "STRING", step: 7, label_es: "Contraseña del wifi", maps_to: "Wifi_password", note: "" },
  { name: "whoContractsInternet", type: "STRING", step: 7, label_es: "Quién contrata internet", maps_to: "Who_contract_internet", note: "adición 12: owner | 3villas" },
  { name: "smartTvSatelliteNetflix", type: "STRING", step: 7, label_es: "TV inteligente / satélite / streaming", maps_to: "TV", note: "" },
  { name: "hasSafe", type: "YES/NO", step: 7, label_es: "Caja fuerte", maps_to: "safe_box_comments_team", note: "" },
  { name: "safeCode", type: "STRING", step: 7, label_es: "Código de la caja fuerte", maps_to: "safe_box_comments_team", note: "" },
  { name: "foto_safe", type: "STRING", step: 7, label_es: "Foto de la caja fuerte", maps_to: "cloudflare_safe_box_File1", note: "adición 2" },
  { name: "hasBoardGames", type: "YES/NO", step: 7, label_es: "Juegos de mesa / libros", maps_to: "", note: "" },
  { name: "observations_entertainment", type: "TEXT", step: 7, label_es: "Observaciones (ocio / tecnología)", maps_to: "", note: "" },
  { name: "hasPool", type: "YES/NO", step: 8, label_es: "Piscina", maps_to: "Swiming_pool", note: "" },
  { name: "poolType", type: "STRING", step: 8, label_es: "Tipo de piscina", maps_to: "Swimingpool_fence_description", note: "private | communal" },
  { name: "poolDimensions", type: "STRING", step: 8, label_es: "Dimensiones de la piscina (m)", maps_to: "size_of_swimingpool", note: "" },
  { name: "poolMinDepth", type: "STRING", step: 8, label_es: "Profundidad mínima", maps_to: "size_of_swimingpool", note: "" },
  { name: "poolMaxDepth", type: "STRING", step: 8, label_es: "Profundidad máxima", maps_to: "size_of_swimingpool", note: "" },
  { name: "hasChildBarrier", type: "YES/NO", step: 8, label_es: "Valla de seguridad para niños", maps_to: "Swimingpool_fence", note: "" },
  { name: "isHeatedPool", type: "YES/NO", step: 8, label_es: "Piscina climatizada", maps_to: "", note: "" },
  { name: "hasOutdoorShower", type: "YES/NO", step: 8, label_es: "Ducha exterior", maps_to: "", note: "" },
  { name: "foto_pool", type: "STRING", step: 8, label_es: "Foto de la piscina", maps_to: "cloudflare_generic_image_1", note: "adición 2" },
  { name: "hasBBQ", type: "YES/NO", step: 8, label_es: "Barbacoa", maps_to: "BBQ", note: "" },
  { name: "bbqType", type: "STRING", step: 8, label_es: "Tipo de barbacoa", maps_to: "BBQ", note: "" },
  { name: "hasSeaViews", type: "YES/NO", step: 8, label_es: "Vistas al mar", maps_to: "Views", note: "" },
  { name: "seaViewsFrom", type: "STRING", step: 8, label_es: "Vistas al mar desde", maps_to: "Views", note: "" },
  { name: "parking", type: "STRING", step: 8, label_es: "Tipo de aparcamiento", maps_to: "Parking", note: "street | insideProperty | garage" },
  { name: "foto_exterior1", type: "STRING", step: 8, label_es: "Foto exterior 1", maps_to: "cloudflare_marketing_photos", note: "adición 2" },
  { name: "foto_exterior2", type: "STRING", step: 8, label_es: "Foto exterior 2", maps_to: "", note: "adición 2" },
  { name: "foto_exterior3", type: "STRING", step: 8, label_es: "Foto exterior 3", maps_to: "", note: "adición 2" },
  { name: "distanceBeach", type: "STRING", step: 8, label_es: "Distancia a la playa", maps_to: "Beach_distance", note: "adición 8" },
  { name: "distanceSupermarket", type: "STRING", step: 8, label_es: "Distancia al supermercado", maps_to: "Supermarket_distance", note: "adición 8" },
  { name: "distanceRestaurant", type: "STRING", step: 8, label_es: "Distancia al restaurante", maps_to: "Restaurant_distance", note: "adición 8" },
  { name: "distancePharmacy", type: "STRING", step: 8, label_es: "Distancia a la farmacia", maps_to: "Pharmacy_distance", note: "adición 8" },
  { name: "distanceAirport", type: "STRING", step: 8, label_es: "Distancia al aeropuerto", maps_to: "Airport_distance", note: "adición 8" },
  { name: "beachTowelsProvided", type: "YES/NO", step: 8, label_es: "Toallas de playa incluidas", maps_to: "Beach_towels_provided", note: "adición 9" },
  { name: "publicTransport", type: "STRING", step: 8, label_es: "Transporte público", maps_to: "Public_transpost", note: "adición 9" },
  { name: "taxiTransfers", type: "STRING", step: 8, label_es: "Taxi y transfers", maps_to: "Taxi_and_Transfers", note: "adición 9" },
  { name: "observations_exterior", type: "TEXT", step: 8, label_es: "Observaciones (exterior)", maps_to: "", note: "" },
  { name: "currentCleaner", type: "STRING", step: 9, label_es: "Limpieza actual (empresa o persona)", maps_to: "Cleanning_team", note: "adición 7" },
  { name: "currentGardener", type: "STRING", step: 9, label_es: "Jardinero actual", maps_to: "Garden_team", note: "adición 7" },
  { name: "currentPoolCompany", type: "STRING", step: 9, label_es: "Mantenimiento de piscina actual", maps_to: "Pool_team", note: "adición 7" },
  { name: "changeoverDay", type: "STRING", step: 9, label_es: "Día de cambio habitual", maps_to: "Changeoverday", note: "adición 7" },
  { name: "acceptsPets", type: "YES/NO", step: 9, label_es: "Se aceptan mascotas", maps_to: "Pets_allowed", note: "" },
  { name: "houseRules", type: "TEXT", step: 9, label_es: "Normas de la casa", maps_to: "", note: "destino Guidal_* a confirmar" },
  { name: "ownerComments", type: "TEXT", step: 9, label_es: "Comentarios del propietario", maps_to: "Important_comments", note: "" },
  { name: "observations_rules", type: "TEXT", step: 9, label_es: "Observaciones (normas)", maps_to: "", note: "" },
  { name: "fiscal_nif", type: "STRING", step: 9, label_es: "NIF del propietario", maps_to: "propietario_NIF", note: "adición 10; privado" },
  { name: "fiscal_name", type: "STRING", step: 9, label_es: "Nombre fiscal", maps_to: "propietario_Nombre_fiscal", note: "adición 10; privado" },
  { name: "fiscal_address", type: "STRING", step: 9, label_es: "Dirección fiscal (calle y número)", maps_to: "propietario_Calle_Fiscal", note: "adición 10; privado" },
  { name: "fiscal_municipio", type: "STRING", step: 9, label_es: "Municipio fiscal", maps_to: "propietario_Municipio_fiscal", note: "adición 10; privado" },
  { name: "acceptedTerms", type: "YES/NO", step: 9, label_es: "Acepta que la información es veraz", maps_to: "", note: "" },
  { name: "acceptedTerms_at", type: "DATE/TIME", step: 9, label_es: "Aceptado el", maps_to: "", note: "" }
];

window.FICHA_SCHEMA_META = { table: "TaVillas_ficha", version: 1, date: "2026-09-21" };

// HISTORIAL: v01 - Primera version. Lista de los campos de la ficha de propietario, generada
// desde ficha-schema.json del Worker caspio-proxy, para que la pagina publica del propietario
// (ficha-propietario.html) y la pagina del equipo (fichas-propietarios.html) lean los mismos
// nombres, tipos, pasos y destinos de TaVillas que usa el Worker. Sin este archivo cada pagina
// tendria su propia copia de la lista y las dos se separarian del Worker a la primera columna
// nueva. La prueba ficha-campos.test.js compara archivo y JSON campo a campo, asi que un cambio
// en el JSON sin regenerar este archivo rompe la suite. Fecha 21/09/2026.
