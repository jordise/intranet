/* Pruebas de la hoja en papel del formulario v5 (informe-temporada.html, carril E de informe-form-v5-v3b, 29/10/2026).
   node informe-temporada-hoja.test.js
   Los cuatro datos nuevos en la hoja de Rafa (pantalla = papel): la marca N/A con su motivo, "⚠" + texto del peligro
   bajo la observación, la banda de coste tras la actuación y la referencia de la foto bajo el pie. Las líneas llegan de
   Caspio con las columnas na, na_motivo, peligro, peligro_texto, coste y clave_ref (CASPIO-COLUMNS.md).
   Como informe-temporada.test.js: NO copia el código de la página; extrae con vm las funciones reales hoja* y las ejecuta. */
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
function bloque(s, cabeza) { var i = s.indexOf(cabeza); if (i < 0) return ''; var j = s.indexOf('{', i), d = 0, k = j; for (; k < s.length; k++) { if (s[k] === '{') d++; else if (s[k] === '}') { d--; if (!d) break; } } return s.slice(i, k + 1); }

var HOJA = ['hojaSi', 'hojaNa', 'hojaPeligro', 'hojaCosteTexto', 'hojaCoste', 'hojaRefTexto', 'hojaRef', 'hojaV5'];
var FNS = ['esc', 'escQ', 'seccionesDef'].concat(HOJA);
var faltan = FNS.filter(function (n) { try { fnSource(SRC, n); return false; } catch (e) { return true; } });
ok('las funciones hoja* existen en la pagina', !faltan.length, faltan.join(', '));
var ctx = {};
try { vm.runInNewContext(FNS.filter(function (n) { return faltan.indexOf(n) < 0; }).map(function (n) { return fnSource(SRC, n); }).join('\n'), ctx); }
catch (e) { ok('las funciones compilan', false, e.message); }
faltan.forEach(function (n) { ctx[n] = function () { return ''; }; });

console.log('1. Sí / no de Caspio (YES/NO llega como true/false; null = no)');
ok('verdadero: true, 1, "1", "true", "Sí", "si", "yes", " Yes "', [true, 1, '1', 'true', 'Sí', 'si', 'yes', ' Yes '].every(function (v) { return ctx.hojaSi(v) === true; }));
ok('falso: false, 0, "0", "false", "", null, undefined, "no"', [false, 0, '0', 'false', '', null, undefined, 'no'].every(function (v) { return ctx.hojaSi(v) === false; }));

console.log('2. N/A: la marca de la columna N/A va en la fila; la hoja pone "N/A: motivo" bajo la observación');
var na = ctx.hojaNa({ seccion: 'exterior', clave: 'piscina', estado: '', na: true, na_motivo: 'sin piscina' });
ok('N/A con motivo', /class="h-v5 h-na"/.test(na) && na.indexOf('N/A: sin piscina') >= 0, na);
ok('N/A sin motivo (borrador) = "N/A: sin motivo"', ctx.hojaNa({ na: 'true', na_motivo: '  ' }).indexOf('N/A: sin motivo') >= 0);
ok('sin N/A no pinta nada (null, false, "false")', ctx.hojaNa({ na: null, na_motivo: 'x' }) === '' && ctx.hojaNa({ na: false }) === '' && ctx.hojaNa({ na: 'false' }) === '' && ctx.hojaNa(null) === '');
ok('el motivo se escapa', ctx.hojaNa({ na: true, na_motivo: '<b>x</b>' }).indexOf('&lt;b&gt;x&lt;/b&gt;') >= 0);

console.log('3. Peligro: "⚠" + texto bajo la observación');
var pe = ctx.hojaPeligro({ seccion: 'exterior', clave: 'piscina', estado: 'Bueno', peligro: true, peligro_texto: 'Cable pelado junto a la ducha' });
ok('peligro marcado, también en una fila Bueno', /class="h-v5 h-peligro"/.test(pe) && pe.indexOf('⚠ Cable pelado junto a la ducha') >= 0, pe);
ok('peligro sin texto (borrador) = "⚠ Peligro (sin descripción)"', ctx.hojaPeligro({ peligro: 1, peligro_texto: '' }).indexOf('⚠ Peligro (sin descripción)') >= 0);
ok('sin la marca no pinta nada, aunque quede texto', ctx.hojaPeligro({ peligro: false, peligro_texto: 'algo' }) === '' && ctx.hojaPeligro({ peligro: null }) === '' && ctx.hojaPeligro(undefined) === '');
ok('el texto se escapa', ctx.hojaPeligro({ peligro: true, peligro_texto: 'a & <b>' }).indexOf('a &amp; &lt;b&gt;') >= 0);

console.log('4. Coste: la banda tras la actuación; en blanco no pinta nada (nunca "0")');
var B = { 'desconocido': 'desconocido', '<500': 'menos de 500 €', '500-2000': '500 a 2.000 €', '2000-10000': '2.000 a 10.000 €', '10000+': 'más de 10.000 €' };
ok('las cinco bandas de Caspio en palabras', Object.keys(B).every(function (k) { return ctx.hojaCosteTexto(k) === B[k]; }), Object.keys(B).map(function (k) { return ctx.hojaCosteTexto(k); }).join(' | '));
ok('en blanco = "" (null, "", espacios)', ctx.hojaCosteTexto(null) === '' && ctx.hojaCosteTexto('') === '' && ctx.hojaCosteTexto('  ') === '');
ok('un valor raro se conserva tal cual', ctx.hojaCosteTexto('1.000 €') === '1.000 €');
var co = ctx.hojaCoste({ seccion: 'resumen', clave: 'accion_1', texto_1: 'Cambiar colchones', coste: '500-2000' });
ok('fila de coste: "Coste estimado: 500 a 2.000 €" con & y < escapados', /class="h-v5 h-coste"/.test(co) && co.indexOf('Coste estimado: 500 a 2.000 €') >= 0 && ctx.hojaCoste({ coste: '<500' }).indexOf('menos de 500 €') >= 0, co);
ok('sin coste no pinta nada', ctx.hojaCoste({ coste: '' }) === '' && ctx.hojaCoste({ coste: null }) === '' && ctx.hojaCoste({}) === '');

console.log('5. Referencia de la foto: "Se refiere a: ..." bajo el pie');
ok('un elemento de los 26', ctx.hojaRefTexto('colchones') === 'Colchones y almohadas' && ctx.hojaRefTexto('instalacion_electrica') === 'Instalación eléctrica (cuadro, diferencial, potencia)');
ok('una estancia de las 7 y "otra"', ctx.hojaRefTexto('salon') === 'Salón / comedor' && ctx.hojaRefTexto('exterior_piscina') === 'Exterior / zona piscina' && ctx.hojaRefTexto('otra') === 'Otra');
var S = ctx.seccionesDef(), claves = [];
S.forEach(function (s) { if (s.tipo === 'estado' || s.tipo === 'estancia') s.claves.forEach(function (c) { claves.push(c[0]); }); });
ok('las 33 claves (26 elementos + 7 estancias) tienen su nombre', claves.length === 33 && claves.every(function (c) { var t = ctx.hojaRefTexto(c); return t && t !== c; }), claves.length);
ok('una clave desconocida se conserva; en blanco = ""', ctx.hojaRefTexto('garaje') === 'garaje' && ctx.hojaRefTexto('') === '' && ctx.hojaRefTexto(null) === '');
var rf = ctx.hojaRef({ seccion: 'foto', clave: 'foto_1', texto_1: 'Pérgola', clave_ref: 'piscina' });
ok('fila de foto: "Se refiere a: Piscina (...)"', /class="h-v5 h-ref"/.test(rf) && rf.indexOf('Se refiere a: Piscina (vaso, gresites, filtro / skimmer, ducha, depuradora, etc)') >= 0, rf);
ok('sin referencia no pinta nada', ctx.hojaRef({ clave_ref: '' }) === '' && ctx.hojaRef({ clave_ref: null }) === '' && ctx.hojaRef(null) === '');

console.log('6. hojaV5: una sola llamada por fila; orden N/A, peligro, coste, referencia');
/* fixtures: las líneas tal como vuelven de Caspio (YES/NO = true/false, null = vacío) */
var FIX = {
  na: { linea_id: 11, informe_id: 9, seccion: 'exterior', clave: 'piscina', estado: '', texto_1: '', na: true, na_motivo: 'sin piscina', peligro: false, peligro_texto: null, coste: null, clave_ref: null },
  peligro: { linea_id: 12, informe_id: 9, seccion: 'seguridad', clave: 'instalacion_electrica', estado: 'Regular', texto_1: 'Diferencial salta', na: false, na_motivo: null, peligro: true, peligro_texto: 'Cable pelado en el cuadro', coste: null, clave_ref: null },
  accion: { linea_id: 13, informe_id: 9, seccion: 'resumen', clave: 'accion_1', texto_1: 'Cambiar el cuadro', texto_2: 'Riesgo', prioridad: 'Alta', na: null, na_motivo: null, peligro: null, peligro_texto: null, coste: '2000-10000', clave_ref: null },
  estancia: { linea_id: 14, informe_id: 9, seccion: 'estancia', clave: 'cocina', texto_1: 'Grifo gotea', texto_2: 'Cambiar grifo', prioridad: 'Media', na: null, peligro: null, coste: 'desconocido', clave_ref: null },
  foto: { linea_id: 15, informe_id: 9, seccion: 'foto', clave: 'foto_1', foto_url: 'https://x.com/a.jpg', texto_1: 'Cuadro eléctrico', na: null, peligro: null, coste: null, clave_ref: 'instalacion_electrica' },
  vieja: { linea_id: 16, informe_id: 9, seccion: 'interior', clave: 'pintura', estado: 'Bueno', texto_1: 'ok' } /* informe anterior a la v5: sin las columnas nuevas */
};
var hv = {}; Object.keys(FIX).forEach(function (k) { hv[k] = ctx.hojaV5(FIX[k]); });
ok('fila N/A: solo la línea N/A', hv.na.indexOf('N/A: sin piscina') >= 0 && hv.na.indexOf('⚠') < 0 && hv.na.indexOf('Coste') < 0 && hv.na.indexOf('Se refiere') < 0, hv.na);
ok('fila con peligro: "⚠ Cable pelado en el cuadro"', hv.peligro.indexOf('⚠ Cable pelado en el cuadro') >= 0 && hv.peligro.indexOf('N/A') < 0, hv.peligro);
ok('actuación: "Coste estimado: 2.000 a 10.000 €"', hv.accion.indexOf('Coste estimado: 2.000 a 10.000 €') >= 0, hv.accion);
ok('estancia: "Coste estimado: desconocido"', hv.estancia.indexOf('Coste estimado: desconocido') >= 0, hv.estancia);
ok('foto: "Se refiere a: Instalación eléctrica (...)"', hv.foto.indexOf('Se refiere a: Instalación eléctrica (cuadro, diferencial, potencia)') >= 0, hv.foto);
ok('línea anterior a la v5 (sin columnas nuevas): nada', hv.vieja === '');
var todo = ctx.hojaV5({ na: true, na_motivo: 'm', peligro: true, peligro_texto: 'p', coste: '10000+', clave_ref: 'otra' });
ok('orden N/A, peligro, coste, referencia', todo.indexOf('h-na') < todo.indexOf('h-peligro') && todo.indexOf('h-peligro') < todo.indexOf('h-coste') && todo.indexOf('h-coste') < todo.indexOf('h-ref'), todo);
ok('las líneas de la hoja no son entradas (sin data-campo, sin input/select/textarea)', !/data-campo|<input|<select|<textarea/.test(todo));

console.log('7. CSS: pantalla, móvil (390 px) y papel');
var STYLE = (function () { var i = SRC.indexOf('<style>'), j = SRC.indexOf('</style>'); return i >= 0 && j > i ? SRC.slice(i, j) : ''; })();
var PRINT = bloque(STYLE, '@media print{'), MOVIL = bloque(STYLE, '@media (max-width:699px){');
var PANTALLA = STYLE.replace(PRINT, '').replace(MOVIL, '');
ok('pantalla: las líneas de la hoja (.h-v5) no se ven; los controles son la pantalla', /\.h-v5\{display:none\}/.test(PANTALLA));
ok('pantalla: la marca N/A en gris; elegida, fondo gris', /\.st\[data-v="N\/A"\][^{]*\{[^}]*color:#[0-9a-f]{3,6}/i.test(PANTALLA) && /\.st\[data-v="N\/A"\]\.on[^{]*\{[^}]*background:var\(--gray-2\)/.test(PANTALLA));
ok('pantalla: los selects de coste y referencia alineados a la izquierda, sin tocar el tamaño de letra (16 px en el móvil, sin zoom en iOS)', /\.sel\[data-campo="coste"\],\.sel\[data-campo="clave_ref"\]\{[^}]*text-align:left/.test(PANTALLA) && !/\.sel\[data-campo="coste"\],\.sel\[data-campo="clave_ref"\]\{[^}]*font-size/.test(PANTALLA));
ok('pantalla: la marca de peligro pequeña, en gris, siempre visible', /\[data-campo="peligro"\][^{]*\{[^}]*color:#/.test(PANTALLA) && !/\[data-campo="peligro"\][^{]*\{[^}]*display:none/.test(PANTALLA));
ok('pantalla: estilo de las líneas (peligro en rojo y negrita)', /\.h-peligro\{[^}]*color:var\(--red\)[^}]*font-weight:700/.test(STYLE));
ok('móvil: la fila de estado pasa a rejilla de 5 (Elemento + Bueno, Regular, Malo, N/A de 44 px)', /\.t-est tr\{grid-template-columns:minmax\(0,1fr\) 44px 44px 44px 44px\}/.test(MOVIL));
ok('móvil: la marca de peligro con 44 px de alto para el dedo', /\[data-campo="peligro"\][^{]*\{[^}]*min-height:44px/.test(MOVIL) || /\.v5-peligro[^{]*\{[^}]*min-height:44px/.test(MOVIL));
ok('papel: las líneas de la hoja salen (.h-v5{display:block})', /\.h-v5\{display:block/.test(PRINT));
var OCULTOS = ['na_motivo', 'peligro', 'peligro_texto', 'coste', 'clave_ref'];
ok('papel: los controles nuevos no salen (los cinco data-campo + .v5-ctl)', OCULTOS.every(function (c) { return PRINT.indexOf('[data-campo="' + c + '"]') >= 0; }) && PRINT.indexOf('.v5-ctl') >= 0 && /display:none!important/.test(PRINT));
ok('papel: la copia .ta-p de una caja nueva tampoco sale (sin texto doble)', PRINT.indexOf('[data-campo="na_motivo"]+.ta-p') >= 0 && PRINT.indexOf('[data-campo="peligro_texto"]+.ta-p') >= 0);
ok('papel: la marca de la columna N/A sí sale (no se oculta data-v="N/A" ni data-campo="na")', PRINT.indexOf('[data-v="N/A"]{display:none') < 0 && PRINT.indexOf('[data-campo="na"]') < 0 && /\.st\[data-v="N\/A"\]\{[^}]*color:#222/.test(PRINT));
ok('sin printHtml / pintarImpresion / printView (la regla v3 sigue)', SRC.slice(0, SRC.indexOf('<!-- HISTORIAL:')).indexOf('printHtml') < 0);
var re = /<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi, m, n = 0, bad = '';
while ((m = re.exec(SRC))) { n++; try { new vm.Script(m[1]); } catch (e) { bad += e.message; } }
ok('los scripts compilan', n > 0 && !bad, bad);

console.log('\n' + pass + ' PASS, ' + fail + ' FAIL');
process.exit(fail ? 1 : 0);
