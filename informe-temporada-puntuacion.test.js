/* Pruebas de informe-temporada-puntuacion.js (Puntuacion: la condición provisional del villa manager en el formulario v5
   y la caja "¿Cómo se calcula?"). node informe-temporada-puntuacion.test.js
   Job informe-form-v5-v3b, lane B, 29/10/2026 (paquete JOB2, slice E punto 5). Usa el InformeScore REAL
   (informe-temporada-score.js) con Puntuacion.usar({InformeScore}), como las lanes del job uno, y además lo prueba
   como en el navegador (los dos scripts en un contexto con window). Las cifras esperadas son los ocho casos de
   aceptación del Consenso v2 sobre la forma LINEAS del formulario ('seccion|clave' -> fila). Sin red. */
var fs = require('fs'), path = require('path'), vm = require('vm');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e !== undefined ? '  -> ' + e : '')); } }
function J(x) { return JSON.stringify(x); }
function safe(f) { try { return f(); } catch (e) { return e; } }
function fin() { console.log('\n' + pass + ' PASS, ' + fail + ' FAIL'); process.exit(fail ? 1 : 0); }

var InformeScore = require('./informe-temporada-score.js'), Puntuacion;
try { Puntuacion = require('./informe-temporada-puntuacion.js'); } catch (e) { ok('se carga informe-temporada-puntuacion.js', false, e.message); fin(); }
ok('se carga informe-temporada-puntuacion.js con require', !!Puntuacion && typeof Puntuacion === 'object');
['usar', 'lineasDe', 'condicion', 'texto', 'lineaHtml', 'ayudaLineas', 'ayudaHtml'].forEach(function (n) { ok('expone ' + n, !!Puntuacion && typeof Puntuacion[n] === 'function'); });
if (fail) fin();

console.log('0. Sin InformeScore: error claro (lo carga la página antes, como en el cuadro)');
var e0 = safe(function () { return Puntuacion.texto({}); });
ok('sin InformeScore = error que nombra informe-temporada-score.js', e0 instanceof Error && /informe-temporada-score\.js/.test(e0.message), e0 && e0.message);
ok('usar devuelve Puntuacion', Puntuacion.usar({ InformeScore: InformeScore }) === Puntuacion);

/* LINEAS del formulario: 'seccion|clave' -> fila; estado como lo guarda el formulario ('Bueno'|'Regular'|'Malo'|''),
   na como llega de Caspio (true/false/null) o del formulario v5; más filas de otras secciones que no puntúan */
var DEF = InformeScore.elementosDef();
function lineasForm(marcas, extra) {
  var L = {};
  DEF.forEach(function (d, i) {
    var m = marcas[i] || '';
    L[d.seccion + '|' + d.clave] = { seccion: d.seccion, clave: d.clave, orden: i + 1, estado: m === 'NA' ? '' : m, na: m === 'NA' ? true : (m ? false : null),
      na_motivo: m === 'NA' ? 'sin piscina' : '', texto_1: '', texto_2: '', prioridad: '', foto_url: '', _sucio: false, _ver: 0 };
  });
  L['resumen|accion_1'] = { seccion: 'resumen', clave: 'accion_1', texto_1: 'Pintar fachada', prioridad: 'Alta', estado: '' };
  L['foto|foto_1'] = { seccion: 'foto', clave: 'foto_1', foto_url: 'https://x/y.jpg', texto_1: 'Grieta', estado: '' };
  L['huesped|comentario_1'] = { seccion: 'huesped', clave: 'comentario_1', estado: 'Review', texto_1: 'Todo bien' };
  return Object.assign(L, extra || {});
}
function rep(m, n) { var a = []; for (var i = 0; i < n; i++) a.push(m); return a; }
var IDX = {}; DEF.forEach(function (d, i) { IDX[d.clave] = i; });

console.log('1. Los ocho casos de aceptación del Consenso v2, en la forma LINEAS del formulario');
var c1 = lineasForm(rep('Bueno', 26));
ok('26 Bueno -> "Condición: 100,0 · 26 de 26 evaluados"', Puntuacion.texto(c1) === 'Condición: 100,0 · 26 de 26 evaluados', Puntuacion.texto(c1));
var c2 = lineasForm(rep('Bueno', 13).concat(rep('Regular', 13)));
ok('13 Bueno / 13 Regular -> 75,0 completo', Puntuacion.texto(c2) === 'Condición: 75,0 · 26 de 26 evaluados', Puntuacion.texto(c2));
var m3 = rep('Bueno', 26); m3[IDX.instalacion_electrica] = 'Malo';
var c3 = lineasForm(m3);
ok('25 Bueno / eléctrica Malo -> 96,2 completo', Puntuacion.texto(c3) === 'Condición: 96,2 · 26 de 26 evaluados', Puntuacion.texto(c3));
var c4 = lineasForm(rep('Bueno', 19).concat(rep('NA', 7)));
ok('19 Bueno / 7 N/A -> 100,0 completo, 19 de 19 y los N/A', Puntuacion.texto(c4) === 'Condición: 100,0 · 19 de 19 evaluados · 7 N/A', Puntuacion.texto(c4));
var c5 = lineasForm(rep('Bueno', 20));
ok('20 Bueno / 6 en blanco -> "Condición provisional: 100,0 · 20 de 26 evaluados"', Puntuacion.texto(c5) === 'Condición provisional: 100,0 · 20 de 26 evaluados', Puntuacion.texto(c5));
var c6 = lineasForm(['Regular'].concat(rep('Malo', 7), rep('NA', 18)));
ok('1 Regular / 7 Malo / 18 N/A -> 6,3 completo', Puntuacion.texto(c6) === 'Condición: 6,3 · 8 de 8 evaluados · 18 N/A', Puntuacion.texto(c6));
var c7 = lineasForm([]);
ok('todo en blanco -> "Condición provisional: — · 0 de 26 evaluados"', Puntuacion.texto(c7) === 'Condición provisional: — · 0 de 26 evaluados', Puntuacion.texto(c7));
ok('el octavo caso (Alta con el mismo texto en resumen y estancia) no cambia la condición: las actuaciones no puntúan',
  Puntuacion.texto(lineasForm(rep('Bueno', 26), { 'estancia|salon': { seccion: 'estancia', clave: 'salon', texto_1: 'Pintar fachada', prioridad: 'Alta' } })) === 'Condición: 100,0 · 26 de 26 evaluados');

console.log('2. La misma cifra que InformeScore.condicion, otros casos y formas');
var mix = rep('Bueno', 11).concat(rep('Regular', 6), rep('Malo', 2)), cm = lineasForm(mix), sc = InformeScore.condicion(Puntuacion.lineasDe(cm));
ok('19 de 26 evaluados: la cifra es la de InformeScore con coma', Puntuacion.texto(cm) === 'Condición provisional: ' + sc.puntuacion.toFixed(1).replace('.', ',') + ' · 19 de 26 evaluados', Puntuacion.texto(cm) + ' / ' + sc.puntuacion);
ok('condicion(LINEAS) = InformeScore.condicion de sus filas', J(Puntuacion.condicion(cm)) === J(sc));
ok('lineasDe acepta el objeto LINEAS, una lista, null', Puntuacion.lineasDe(cm).length === Object.keys(cm).length && Puntuacion.lineasDe([cm['interior|pintura']]).length === 1 && Puntuacion.lineasDe(null).length === 0);
ok('mayúsculas y espacios en la marca (" malo ") cuentan como Malo', Puntuacion.texto(lineasForm(rep(' malo ', 26))) === 'Condición: 0,0 · 26 de 26 evaluados', Puntuacion.texto(lineasForm(rep(' malo ', 26))));
var naTxt = lineasForm(rep('Bueno', 26)); naTxt['exterior|piscina'].na = 'true'; naTxt['exterior|piscina'].estado = ''; naTxt['exterior|piscina'].na_motivo = 'sin piscina';
ok('na guardado como texto "true" = N/A', Puntuacion.texto(naTxt) === 'Condición: 100,0 · 25 de 25 evaluados · 1 N/A', Puntuacion.texto(naTxt));
var naNo = lineasForm(rep('Bueno', 26)); Object.keys(naNo).forEach(function (k) { naNo[k].na = false; });
ok('na = false en todas las filas = ningún N/A', Puntuacion.texto(naNo) === 'Condición: 100,0 · 26 de 26 evaluados');
var todoNa = lineasForm(rep('NA', 26));
ok('los 26 en N/A -> sin puntuación, lo dice', Puntuacion.texto(todoNa) === 'Condición: sin puntuación · los 26 elementos están en N/A', Puntuacion.texto(todoNa));
var malo = lineasForm(rep('Bueno', 26)); malo['interior|pintura'].na = true;
ok('N/A y marca a la vez -> no se puede calcular, dice por qué', /^Condición: no se puede calcular \(/.test(Puntuacion.texto(malo)) && /N\/A y marca/.test(Puntuacion.texto(malo)), Puntuacion.texto(malo));
var raro = lineasForm(rep('Bueno', 26)); raro['interior|pintura'].estado = 'Excelente';
ok('marca no válida -> no se puede calcular', /^Condición: no se puede calcular/.test(Puntuacion.texto(raro)));

console.log('3. La línea en HTML: gris, con la banda y el enlace "¿Cómo se calcula?"; nunca bloquea');
var h5 = Puntuacion.lineaHtml(c5);
ok('lleva el texto', h5.indexOf('Condición provisional: 100,0 · 20 de 26 evaluados') >= 0, h5);
ok('clase cond-prov (gris) y data-banda', /class="cond-prov"/.test(h5) && /data-banda="verde"/.test(h5), h5);
ok('el botón "¿Cómo se calcula?" (type=button, aria-expanded, aria-controls de la caja)', /<button type="button"[^>]*data-accion="como-se-calcula"[^>]*aria-expanded="false"[^>]*aria-controls="comoSeCalcula"[^>]*>¿Cómo se calcula\?<\/button>/.test(h5), h5);
ok('banda ámbar y roja y gris', /data-banda="ambar"/.test(Puntuacion.lineaHtml(c2)) && /data-banda="rojo"/.test(Puntuacion.lineaHtml(c6)) && /data-banda="gris"/.test(Puntuacion.lineaHtml(c7)));
ok('aria-live="polite" (cambia con cada marca)', /aria-live="polite"/.test(h5));
ok('ningún "disabled" ni "required": no bloquea Enviar', !/disabled|required/.test(h5));

console.log('4. La caja "¿Cómo se calcula?" en español sencillo');
var A = Puntuacion.ayudaLineas(), todo = A.join('\n');
ok('entre 5 y 10 líneas, ninguna vacía, ninguna de más de 160 caracteres', A.length >= 5 && A.length <= 10 && A.every(function (l) { return typeof l === 'string' && l.trim() && l.length <= 160; }), J(A.map(function (l) { return l.length; })));
ok('la fórmula en palabras: Bueno = 2, Regular = 1, Malo = 0, igual peso', /Bueno = 2/.test(todo) && /Regular = 1/.test(todo) && /Malo = 0/.test(todo) && /26 elementos/.test(todo));
ok('las bandas: verde desde 80, ámbar de 50 a 79,9, rojo por debajo de 50', /verde desde 80/.test(todo) && /ámbar de 50 a 79,9/.test(todo) && /rojo por debajo de 50/.test(todo), todo);
ok('qué hace N/A (no cuenta y baja el total)', /N\/A/.test(todo) && /no cuenta/.test(todo));
ok('sin marcar = provisional', /sin marcar/i.test(todo) && /provisional/.test(todo));
ok('no impide enviar', /no impide enviar/.test(todo));
var ej = todo.match(/(\d+) Bueno y (\d+) Regular = (\d+,\d)/);
ok('el ejemplo de la caja es la cifra real de InformeScore', !!ej && Puntuacion.texto(lineasForm(rep('Bueno', +ej[1]).concat(rep('Regular', +ej[2])))).indexOf(': ' + ej[3] + ' ·') > 0, ej && ej[0]);
var H = Puntuacion.ayudaHtml();
ok('ayudaHtml: id comoSeCalcula, oculta al empezar, título y una entrada por línea', /id="comoSeCalcula"/.test(H) && /hidden/.test(H) && /¿Cómo se calcula\?/.test(H) && (H.match(/<li>/g) || []).length === A.length, H);
ok('ayudaHtml escapa (">" de las bandas sale como &gt; o en palabras)', H.indexOf('<li>') >= 0 && !/<li>[^<]*<(?!\/li>)/.test(H));

console.log('5. Como en el navegador: los dos scripts en un contexto con window, sin usar()');
var ctx = { console: console }; ctx.window = ctx; vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'informe-temporada-score.js'), 'utf8'), ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, 'informe-temporada-puntuacion.js'), 'utf8'), ctx);
ok('window.Puntuacion existe y usa window.InformeScore', !!ctx.Puntuacion && ctx.Puntuacion.texto(c5) === 'Condición provisional: 100,0 · 20 de 26 evaluados', ctx.Puntuacion && safe(function () { return ctx.Puntuacion.texto(c5); }));

fin();
