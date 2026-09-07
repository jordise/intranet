/* Pruebas: desmarcar una tarea de reserva solo lo puede hacer un admin o un manager,
   una foto que no sube nunca deja la tarea guardada como terminada, y despues de
   guardar la pagina enseña el estado real de la fila.
   node limpieza-lock.test.js

   Problema que cubren: el disparador de Caspio marcaba la tarea como terminada en
   cualquier actualizacion, asi que nadie podia deshacer una marca puesta por error.
   Ademas, si la foto principal fallaba, la pagina solo avisaba y guardaba igual la
   tarea como terminada y sin foto; y nunca comprobaba lo que quedaba escrito.

   Como ecotasa-flags-dirty.test.js: NO copia el codigo de las paginas. Extrae el
   texto real de cada funcion del HTML y lo ejecuta con muñecos, sin DOM ni red,
   asi que si alguien edita una pagina estas pruebas corren el codigo NUEVO. */
var fs = require('fs');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

/* ── Utilidades de extraccion ── */
function fnSource(file, name) {
  var src = fs.readFileSync(file, 'utf8');
  var i = src.indexOf('function ' + name + '(');
  if (i < 0) throw new Error('no encuentro ' + name + ' en ' + file);
  var j = src.indexOf('{', i), depth = 0, k = j;
  for (; k < src.length; k++) {
    if (src[k] === '{') depth++;
    else if (src[k] === '}') { depth--; if (depth === 0) { k++; break; } }
  }
  return src.slice(i, k);
}

/* El trozo de guardar() que va desde su cabecera hasta la PRIMERA escritura:
   lo que se compruebe aqui es lo que se ejecuta antes de escribir nada. */
var MARCAS_ESCRITURA = ['action=save&table=', 'action=update&table='];
function iEscritura(src, desde) {
  var i = -1;
  MARCAS_ESCRITURA.forEach(function (m) {
    var p = src.indexOf(m, desde);
    if (p > 0 && (i < 0 || p < i)) i = p;
  });
  if (i < 0) throw new Error('no encuentro la escritura del guardado');
  return i;
}
function bloqueGuardado(file) {
  var src = fs.readFileSync(file, 'utf8');
  var a = src.indexOf('async function guardar(');
  if (a < 0) throw new Error('no encuentro guardar() en ' + file);
  return src.slice(a, iEscritura(src, a));
}

/* La expresion real que la pagina manda en Tarea_terminada, tal cual esta escrita. */
function exprTerminada(file) {
  var src = fs.readFileSync(file, 'utf8');
  var i = src.indexOf('Tarea_terminada:');
  if (i < 0) throw new Error('no encuentro Tarea_terminada en ' + file);
  var j = i + 'Tarea_terminada:'.length, depth = 0, k = j;
  for (; k < src.length; k++) {
    var c = src[k];
    if (c === '(' || c === '[' || c === '{') depth++;
    else if (c === ')' || c === ']' || c === '}') { if (depth === 0) break; depth--; }
    else if (c === ',' && depth === 0) break;
  }
  return src.slice(j, k).trim();
}

/* El bloque <script> grande de la pagina (el que lleva toda la logica). */
function scriptPrincipal(file) {
  var src = fs.readFileSync(file, 'utf8'), mayor = '', i = 0;
  while ((i = src.indexOf('<script>', i)) >= 0) {
    var j = src.indexOf('</script>', i);
    var b = src.slice(i + 8, j);
    if (b.length > mayor.length) mayor = b;
    i = j + 1;
  }
  return mayor;
}

/* ── Muñecos: pantalla de mentira, sin DOM ni red ── */
function pantalla(cfg, estado) {
  var avisos = [];
  var swBox = { style: {} };
  var fila = { style: {}, querySelector: function () { return swBox; } };
  var els = {};
  els.swDone = { checked: !!estado.done, disabled: false };
  els[cfg.card] = { style: {}, querySelector: function () { return fila; } };
  els[cfg.hint] = { textContent: '', style: {} };
  function g(id) { return els[id] || null; }
  function sw(id) { return !!(els[id] || {}).checked; }
  function $sw(id, val) {
    var el = els[id]; if (!el) return;
    if (typeof val === 'boolean') el.checked = val;
    else el.checked = val === true || val === 1 || val === -1 || ['yes', 'sí', 'true', '1'].indexOf(String(val).toLowerCase()) >= 0;
  }
  function toast(msg, tipo) { avisos.push({ msg: msg, tipo: tipo }); }
  return { els: els, fila: fila, swBox: swBox, avisos: avisos, g: g, sw: sw, $sw: $sw, toast: toast };
}

var FUNCIONES = ['puedeDesmarcar', 'esVerdadero', 'pintarBloqueoDone', 'abortarPorFotoFallida', 'onSwDoneChange'];
function cargar(file, Auth, doneLocked, p) {
  var body = FUNCIONES.map(function (n) { return fnSource(file, n); }).join('\n') +
    '\nreturn {' + FUNCIONES.map(function (n) { return n + ':' + n; }).join(',') + '};';
  return new Function('Auth', 'doneLocked', 'document', 'g', 'sw', '$sw', 'toast', body)(
    Auth, doneLocked, { getElementById: p.g }, p.g, p.sw, p.$sw, p.toast);
}

var PAGINAS = [
  { file: 'task-limpieza.html', ver: 11, titulo: 'Tarea Limpieza v11 — 3Villas', card: 'cardDone', hint: 'doneHint', wh: 'wh', pend: '⚠️ Pendiente — aparecerá en el listado' },
  { file: 'task-cierre.html', ver: 13, titulo: 'Tarea Cierre v13 — 3Villas', card: 'cardDone', hint: 'doneHint', wh: 'wh', pend: '⚠️ Pendiente — aparecerá en el listado' },
  { file: 'task-wp.html', ver: 22, titulo: 'WelcomePack v22 — 3Villas', card: 'cardWPDone', hint: 'wpDoneHint', wh: 'whereCheck', pend: '⚠️ Marcado como pendiente — aparecerá en el listado' }
];

var AVISO_BLOQUEO = 'Solo un manager puede desmarcar';
var AVISO_FOTO_PENDIENTE = 'Foto no subida. La tarea sigue pendiente';
var AVISO_FOTO_NADA = 'Foto no subida. No se ha guardado nada';
var AVISO_LEIDO_TERMINADA = 'Guardado. El sistema la deja como TERMINADA';
var AVISO_LEIDO_PENDIENTE = 'Guardado. El sistema la deja como PENDIENTE';
var AVISO_SIN_COMPROBAR = '✓ Guardado, sin confirmar. Comprueba en Equipo';
var AVISO_OK = '✓ Guardado correctamente';

PAGINAS.forEach(function (P) {
  var src = fs.readFileSync(P.file, 'utf8');

  /* ── a. Quien puede desmarcar ── */
  console.log('\n== ' + P.file + ' (quien puede desmarcar) ==');
  function conRol(rol) {
    var p = pantalla(P, { done: true });
    var Auth = rol === undefined ? undefined : { role: function () { return rol; } };
    return cargar(P.file, Auth, false, p).puedeDesmarcar();
  }
  ok('admin puede desmarcar', conRol('admin') === true);
  ok('manager puede desmarcar', conRol('manager') === true);
  ok('el rol con mayusculas tambien vale (Manager)', conRol('Manager') === true);
  ok('staff NO puede desmarcar', conRol('staff') === false);
  ok('cleaner NO puede desmarcar', conRol('cleaner') === false);
  ok('un rol desconocido NO puede desmarcar', conRol('villamanager') === false);
  ok('un rol vacio NO puede desmarcar', conRol('') === false);
  ok('un rol nulo NO puede desmarcar', conRol(null) === false);
  ok('sin sesion (Auth sin definir) NO se puede desmarcar', conRol(undefined) === false);
  (function () {
    var p = pantalla(P, { done: true });
    ok('un Auth sin role() no rompe la pagina y NO deja desmarcar', cargar(P.file, {}, false, p).puedeDesmarcar() === false);
  })();

  /* ── El bloqueo: como se decide y como se ve ── */
  console.log('\n== ' + P.file + ' (bloqueo del control) ==');
  ok('el bloqueo se decide una sola vez al cargar la tarea',
    src.indexOf("doneLocked=sw('swDone')&&!puedeDesmarcar();") > 0 ||
    src.indexOf("doneLocked=(esVerdadero(r['TaTasks_Tarea_terminada'])||sw('swDone'))&&!puedeDesmarcar();") > 0);
  if (P.file === 'task-wp.html') {
    ok('  ...wp: manda el campo de la tarea, no la marca de la reserva',
      src.indexOf("doneLocked=(esVerdadero(r['TaTasks_Tarea_terminada'])||sw('swDone'))&&!puedeDesmarcar();") > 0);
    ok('  ...wp: $sw usa la misma regla de si/no que la relectura', /el\.checked=\(typeof val==='boolean'\)\?val:esVerdadero\(val\);/.test(src));
    ok('  ...wp: la reserva recibe el mismo valor que la tarea', src.indexOf("const wpDone=doneLocked?true:sw('swDone');") > 0);
  }
  ok('bloqueada, se puede guardar sin foto nueva (solo notas)', /if\(!doneLocked&&(sw\('swDone'\)&&)?!fotoPresente\(\)\)\{fotoError\(\);return;\}/.test(src));
  ok('si la carga de la tarea falla se enseña un error, no un formulario sin bloqueo', src.indexOf("if(cargas[1].status==='rejected'){showError(") > 0);
  ok('  ...y showError existe en la pagina', /function showError\(msg\)/.test(src));
  ok('la relectura sin respuesta no cierra la pagina sola', src.indexOf("if(leidoDone===null){sp.style.display='none';if(btnOk)btnOk.disabled=false;return;}") > 0);
  ok('tras un desacuerdo se guarda el estado de sesion', src.indexOf("onSwDoneChange();saveState();") > 0);
  ok("el WHERE escapa las comillas del Idreserva", src.indexOf("String(idReserva).replace(/'/g,\"''\")") > 0);
  ok('  ...y arranca apagado', /var doneLocked=false;/.test(src));
  (function () {
    var p = pantalla(P, { done: true });
    var api = cargar(P.file, { role: function () { return 'cleaner'; } }, true, p);
    api.pintarBloqueoDone();
    ok('bloqueada: el interruptor queda desactivado', p.els.swDone.disabled === true);
    ok('  ...y encendido', p.els.swDone.checked === true);
    ok('  ...la fila muestra cursor not-allowed y solo el interruptor se apaga (opacity .6, el texto sigue legible)',
      p.fila.style.cursor === 'not-allowed' && p.fila.style.opacity !== '.6' && p.swBox.style.opacity === '.6', JSON.stringify([p.fila.style, p.sw.style]));
    ok('  ...y debajo pone exactamente "' + AVISO_BLOQUEO + '"', p.els[P.hint].textContent === AVISO_BLOQUEO, p.els[P.hint].textContent);
    ok('  ...en gris oscuro legible al sol (#595f70, contraste 6.4:1)', p.els[P.hint].style.color === '#595f70', p.els[P.hint].style.color);
  })();
  (function () {
    var p = pantalla(P, { done: true });
    var api = cargar(P.file, { role: function () { return 'admin'; } }, false, p);
    api.pintarBloqueoDone();
    ok('sin bloqueo no se desactiva nada', p.els.swDone.disabled === false && p.els[P.hint].textContent === '');
  })();
  (function () {
    /* el limpiador apaga el interruptor: vuelve a encenderse y se le avisa */
    var p = pantalla(P, { done: true });
    var api = cargar(P.file, { role: function () { return 'cleaner'; } }, true, p);
    p.els.swDone.checked = false;
    api.onSwDoneChange();
    ok('bloqueada: apagar el interruptor lo vuelve a encender', p.els.swDone.checked === true);
    ok('  ...y avisa con "' + AVISO_BLOQUEO + '"',
      p.avisos.length === 1 && p.avisos[0].msg === AVISO_BLOQUEO, JSON.stringify(p.avisos));
    ok('  ...y el aviso sale en rojo (error)', p.avisos[0].tipo === 'error');
    ok('  ...y la linea de debajo sigue siendo la del bloqueo', p.els[P.hint].textContent === AVISO_BLOQUEO, p.els[P.hint].textContent);
  })();
  (function () {
    /* un manager si puede apagarlo */
    var p = pantalla(P, { done: true });
    var api = cargar(P.file, { role: function () { return 'manager'; } }, false, p);
    p.els.swDone.checked = false;
    api.onSwDoneChange();
    ok('sin bloqueo el interruptor se queda apagado', p.els.swDone.checked === false);
    ok('  ...sin ningun aviso', p.avisos.length === 0, JSON.stringify(p.avisos));
    ok('  ...y la linea de debajo avisa de que queda pendiente', p.els[P.hint].textContent === P.pend, p.els[P.hint].textContent);
  })();
  ok('al restaurar el estado de la sesion una tarea bloqueada se vuelve a encender',
    src.indexOf("if(doneLocked)$sw('swDone',true);") > 0);

  /* ── b. Lo que viaja en el guardado ── */
  console.log('\n== ' + P.file + ' (lo que se guarda) ==');
  var expr = exprTerminada(P.file);
  var enviado = new Function('doneLocked', 'sw', 'return (' + expr + ');');
  ok('bloqueada y con el interruptor apagado se envia terminada = true',
    enviado(true, function () { return false; }) === true, expr);
  ok('bloqueada y encendida tambien se envia true', enviado(true, function () { return true; }) === true);
  ok('sin bloqueo se envia lo que diga el interruptor (apagado = false)',
    enviado(false, function () { return false; }) === false);
  ok('sin bloqueo, encendido = true', enviado(false, function () { return true; }) === true);

  /* ── c. La foto que no sube aborta el guardado ── */
  console.log('\n== ' + P.file + ' (foto fallida) ==');
  (function () {
    var p = pantalla(P, { done: true });
    var api = cargar(P.file, { role: function () { return 'cleaner'; } }, false, p);
    api.abortarPorFotoFallida();
    ok('sin bloqueo: la tarea se queda pendiente', p.els.swDone.checked === false);
    ok('  ...la linea de debajo se actualiza', p.els[P.hint].textContent === P.pend, p.els[P.hint].textContent);
    var ultimo = p.avisos[p.avisos.length - 1];
    ok('  ...y avisa con "' + AVISO_FOTO_PENDIENTE + '"', ultimo && ultimo.msg === AVISO_FOTO_PENDIENTE, JSON.stringify(p.avisos));
    ok('  ...en rojo (error)', ultimo && ultimo.tipo === 'error');
  })();
  (function () {
    var p = pantalla(P, { done: true });
    var api = cargar(P.file, { role: function () { return 'cleaner'; } }, true, p);
    api.abortarPorFotoFallida();
    ok('bloqueada: la tarea sigue terminada', p.els.swDone.checked === true);
    var ultimo = p.avisos[p.avisos.length - 1];
    ok('  ...y avisa con "' + AVISO_FOTO_NADA + '"', ultimo && ultimo.msg === AVISO_FOTO_NADA, JSON.stringify(p.avisos));
    ok('  ...en rojo (error)', ultimo && ultimo.tipo === 'error');
  })();
  var bloque = bloqueGuardado(P.file);
  ok('el guardado corta antes de escribir si la foto nueva no sube', bloque.indexOf('abortarPorFotoFallida();') > 0);
  ok('  ...con un return, no siguiendo adelante', bloque.indexOf('abortarPorFotoFallida();') < bloque.lastIndexOf('return;'));
  ok('  ...y ese corte esta antes de cualquier PUT o POST',
    bloque.indexOf("method:'PUT'") === -1 && bloque.indexOf("method:'POST'") === -1);
  ok('  ...y se vuelven a habilitar los botones', bloque.indexOf('if(btnOk)btnOk.disabled=false;') > 0);
  ok('los dos textos de la foto fallida estan en la pagina',
    src.indexOf(AVISO_FOTO_PENDIENTE) > 0 && src.indexOf(AVISO_FOTO_NADA) > 0);
  if (P.file === 'task-wp.html') {
    ok('esta pagina no tiene fotos de incidencia que revisar', src.indexOf('Picture_cloudfare_after') === -1);
  } else {
    var a = src.indexOf('Picture_cloudfare_after');
    var incBloque = src.slice(a, src.indexOf('const wh=', a));
    ok('una foto de incidencia que falla NO aborta el guardado: avisa y sigue, como hasta ahora',
      incBloque.indexOf('abortarPorFotoFallida') === -1 && incBloque.indexOf('toast(') > 0, incBloque.length);
  }

  /* ── d. La lectura posterior al guardado ── */
  console.log('\n== ' + P.file + ' (lectura despues de guardar) ==');
  var iWrite = iEscritura(src, src.indexOf('async function guardar('));
  var lectura = '?action=data&table=TaTasks&where=${encodeURIComponent(' + P.wh + ')}&limit=1';
  ok('despues de guardar se lee la fila de TaTasks', src.indexOf(lectura) > 0, lectura);
  ok('  ...y esa lectura va DESPUES de la escritura', src.indexOf(lectura, iWrite) > iWrite);
  ok('  ...con 10 segundos de tope', /rbCtrl\.abort\(\),10000\)|,\{\},10000,/.test(src));
  ok('  ...y nunca revienta el guardado (tiene su propio catch)', /catch\(eRb\)\{/.test(src));
  ok('un estado distinto al enviado avisa de TERMINADA', src.indexOf(AVISO_LEIDO_TERMINADA) > 0);
  ok('  ...o de PENDIENTE', src.indexOf(AVISO_LEIDO_PENDIENTE) > 0);
  ok('  ...y en ese caso no se cierra la pagina ni se borra el estado guardado', (function () {
    var i = src.indexOf('if(leidoDone!==null&&leidoDone!==enviadoDone){');
    if (i < 0) return false;
    var b = src.slice(i, src.indexOf('clearState();', i));
    return b.indexOf('return;') > 0 && b.indexOf('window.close()') === -1;
  })());
  ok('  ...y el control pasa a mostrar el valor real, respetando el bloqueo',
    src.indexOf("$sw('swDone',doneLocked?true:leidoDone);onSwDoneChange();") > 0);
  ok('si la lectura falla se guarda igual, avisando "' + AVISO_SIN_COMPROBAR + '"',
    src.indexOf(AVISO_SIN_COMPROBAR) > 0 && src.indexOf("toast(leidoDone===null?'" + AVISO_SIN_COMPROBAR + "':'" + AVISO_OK + "','success');") > 0);
  (function () {
    var p = pantalla(P, { done: true });
    var v = cargar(P.file, {}, false, p).esVerdadero;
    ok('lee como terminada true, 1, -1, "1", "yes", "si" y "true"',
      v(true) && v(1) && v(-1) && v('1') && v('yes') && v('sí') && v('true'));
    ok('  ...y como pendiente false, 0, "", "no", null y sin valor',
      !v(false) && !v(0) && !v('') && !v('no') && !v(null) && !v(undefined));
  })();

  /* ── e. Versiones ── */
  console.log('\n== ' + P.file + ' (version v' + P.ver + ') ==');
  ok('la cabecera dice v' + P.ver, new RegExp('VERSIÓN ACTUAL: v' + P.ver + ' \\|').test(src.split('\n')[2]), src.split('\n')[2]);
  ok('el titulo de la pestaña dice v' + P.ver, src.indexOf('<title>' + P.titulo + '</title>') > 0);
  ok('el historial empieza por v' + P.ver, src.indexOf('<!-- HISTORIAL: v' + P.ver + ' - ') > 0);
  ok('el historial guarda la entrada anterior', src.indexOf('| v' + (P.ver - 1) + ' - ') > 0);
  ok('el JavaScript de la pagina sigue compilando', (function () {
    try { new Function(scriptPrincipal(P.file)); return true; } catch (e) { return e.message; }
  })() === true);
});

/* v11 limpieza: la URL de la foto de cocina (texto) se guarda de verdad */
(function(){
  var src=fs.readFileSync('task-limpieza.html','utf8');
  ok("limpieza guarda Picture_cloudfare1 con la URL de texto", /data\['Picture_cloudfare1'\]=upUrl\+/.test(src));
  ok("limpieza ya no comprueba up.url para la foto de cocina", !/if\(up&&up\.url\)data\['Picture_cloudfare1'\]/.test(src));
  ok("limpieza guarda las fotos de incidencias como texto", /data\['Picture_cloudfare_after'\+idx\]=u\+/.test(src));
})();

console.log('\n' + pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
