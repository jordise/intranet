/* Pruebas del rastro de marcas manuales (peticion de Toni Segui, 04/09/2026).
   node marcas-manuales.test.js

   Como police-url.integration.test.js: NO copia el codigo de las paginas.
   Extrae el texto real de cada funcion del HTML y lo ejecuta. Si alguien edita
   una pagina, estas pruebas corren el codigo NUEVO. */
var fs = require('fs');
var pass = 0, fail = 0;
function ok(n, c, e) { if (c) { pass++; console.log('  PASS  ' + n); } else { fail++; console.log('  FAIL  ' + n + (e ? '  -> ' + e : '')); } }

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

/* Saca el bloque de guardar() que anade el sello al record. */
function guardarBlock(file) {
  var src = fs.readFileSync(file, 'utf8');
  var a = src.indexOf('var _mn=marcasNuevas()');
  if (a < 0) throw new Error('no encuentro el bloque de guardar en ' + file);
  var b = src.indexOf("record.Marcas_manuales=_ls.join('\\n');", a);
  if (b < 0) throw new Error('no encuentro la escritura del campo en ' + file);
  return src.slice(a, src.indexOf('}', b) + 1);
}

/* Un DOM minimo: solo lo que estas funciones tocan. */
function makeEnv(file, opts) {
  opts = opts || {};
  var els = {};
  function el(id, extra) {
    var o = { id: id, style: {}, innerHTML: '' };
    for (var k in (extra || {})) o[k] = extra[k];
    els[id] = o; return o;
  }
  el('cbArrDone', { checked: !!opts.arr });
  el('cbPolDone', { checked: !!opts.pol });
  el('cbDepTerm', { checked: !!opts.dep });
  el('fEcotasaCobrada', { value: opts.eco === undefined ? '0' : opts.eco });
  /* v82/v42: importe manual de la ecotasa y sus comentarios */
  el('fEcotasaManual', { value: opts.ecoImporte === undefined ? '' : opts.ecoImporte });
  el('fEcotasaComentarios', { value: opts.ecoComent === undefined ? '' : opts.ecoComent });
  el('mkArrDone'); el('mkPolDone'); el('mkDepTerm'); el('mkEco');

  var ctx = {
    g: function (id) { return els[id] || null; },
    MARCAS_MAX: 3800,
    MARCA_DEFS: [['arr', 'Arrival form', 'mkArrDone'], ['pol', 'Policia', 'mkPolDone'], ['dep', 'Deposito', 'mkDepTerm'], ['eco', 'Ecotasa', 'mkEco']],
    marcaPrev: opts.prev || { arr: null, pol: null, dep: null, eco: null },
    ecoPrev: opts.ecoPrev || { importe: null, coment: null },
    marcasTexto: opts.texto === undefined ? '' : opts.texto,
    Auth: opts.noAuth ? undefined : { name: function () { return opts.who || 'Toni Segui'; } },
    els: els
  };
  var body = [
    fnSource(file, 'marcaEsc'),
    fnSource(file, 'marcaSello'),
    fnSource(file, 'marcasNuevas'),
    fnSource(file, 'depNum'),
    fnSource(file, 'marcasEcotasa'),
    fnSource(file, 'renderMarcas'),
    'function _guardar(record){' + guardarBlock(file) + '\nreturn record;}',
    'return {marcaSello:marcaSello, marcasNuevas:marcasNuevas, marcasEcotasa:marcasEcotasa, renderMarcas:renderMarcas, guardar:_guardar};'
  ].join('\n');
  var f = new Function('g', 'MARCAS_MAX', 'MARCA_DEFS', 'marcaPrev', 'ecoPrev', 'marcasTexto', 'Auth', body);
  var api = f(ctx.g, ctx.MARCAS_MAX, ctx.MARCA_DEFS, ctx.marcaPrev, ctx.ecoPrev, ctx.marcasTexto, ctx.Auth);
  api.els = els;
  return api;
}

var PAGES = ['notas-equipo-reservas.html', 'notas-villamanager.html'];

PAGES.forEach(function (P) {
  console.log('\n== ' + P + ' ==');

  /* 1. nada cambia -> ningun sello */
  var e = makeEnv(P, { prev: { arr: false, pol: false, dep: false, eco: false } });
  ok('abrir y guardar sin tocar nada no anade ningun sello', e.marcasNuevas().length === 0);
  var rec = e.guardar({});
  ok('  ...y el campo Marcas_manuales no viaja en el record', !('Marcas_manuales' in rec));

  /* 2. off -> on */
  e = makeEnv(P, { pol: true, prev: { arr: false, pol: false, dep: false, eco: false } });
  var m = e.marcasNuevas();
  ok('marcar policia deja exactamente un sello', m.length === 1, JSON.stringify(m));
  ok('  ...con la etiqueta Policia', m[0].indexOf('[Policia marcado ') === 0, m[0]);
  ok('  ...con el nombre del usuario de la sesion', m[0].indexOf('- Toni Segui]') > 0, m[0]);
  ok('  ...con fecha DD/MM/AAAA y hora HH:MM', /^\[Policia marcado \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} - /.test(m[0]), m[0]);

  /* 3. on -> off */
  e = makeEnv(P, { pol: false, prev: { arr: false, pol: true, dep: false, eco: false } });
  ok('desmarcar tambien deja rastro', e.marcasNuevas()[0].indexOf('[Policia desmarcado ') === 0);

  /* 4. dos casillas a la vez */
  e = makeEnv(P, { arr: true, dep: true, prev: { arr: false, pol: false, dep: false, eco: false } });
  ok('dos casillas cambiadas dejan dos sellos', e.marcasNuevas().length === 2);

  /* 5. estado previo desconocido -> no se inventa nada */
  e = makeEnv(P, { pol: true, prev: { arr: null, pol: null, dep: null, eco: null } });
  ok('si el estado previo no se cargo, no se escribe ningun sello', e.marcasNuevas().length === 0);

  /* 6. ecotasa: solo '1' cuenta como pagada */
  e = makeEnv(P, { eco: '1', prev: { arr: false, pol: false, dep: false, eco: false } });
  ok('ecotasa de pendiente a pagado deja sello', e.marcasNuevas()[0].indexOf('[Ecotasa marcado ') === 0);
  e = makeEnv(P, { eco: '', prev: { arr: false, pol: false, dep: false, eco: false } });
  ok('ecotasa vacia no cuenta como pagada', e.marcasNuevas().length === 0);

  /* 7. sin sesion -> "equipo" */
  e = makeEnv(P, { pol: true, noAuth: true, prev: { arr: false, pol: false, dep: false, eco: false } });
  ok('sin nombre de usuario el sello dice equipo', e.marcasNuevas()[0].indexOf('- equipo]') > 0);

  /* 8. el historial anterior se conserva */
  e = makeEnv(P, { pol: true, texto: '[Deposito marcado 01/09/2026 10:00 - Marta]', prev: { arr: false, pol: false, dep: false, eco: false } });
  rec = e.guardar({});
  ok('el historial anterior se conserva', rec.Marcas_manuales.indexOf('[Deposito marcado 01/09/2026 10:00 - Marta]') === 0);
  ok('  ...y el sello nuevo se anade al final', rec.Marcas_manuales.split('\n').length === 2);

  /* 9. LA PRUEBA IMPORTANTE: si no se pudo leer el valor anterior, no se escribe */
  e = makeEnv(P, { pol: true, texto: null, prev: { arr: false, pol: false, dep: false, eco: false } });
  rec = e.guardar({});
  ok('si el valor anterior NO se pudo leer, el campo no se escribe (no se borra el historial)', !('Marcas_manuales' in rec));

  /* 10. tope de longitud: corta lineas enteras, nunca por la mitad */
  var largo = [];
  for (var i = 0; i < 200; i++) largo.push('[Deposito marcado 01/09/2026 10:00 - Usuario numero ' + i + ']');
  e = makeEnv(P, { pol: true, texto: largo.join('\n'), prev: { arr: false, pol: false, dep: false, eco: false } });
  rec = e.guardar({});
  ok('el tope de 3800 caracteres se respeta', rec.Marcas_manuales.length <= 3800, String(rec.Marcas_manuales.length));
  var ls = rec.Marcas_manuales.split('\n');
  ok('  ...cortando lineas enteras, ninguna a medias', ls.every(function (l) { return l.charAt(0) === '[' && l.charAt(l.length - 1) === ']'; }));
  ok('  ...y el sello mas reciente sobrevive', ls[ls.length - 1].indexOf('[Policia marcado ') === 0);

  /* 11. renderMarcas reparte por etiqueta */
  e = makeEnv(P, { texto: '[Policia marcado 01/09/2026 10:00 - Marta]\n[Deposito marcado 02/09/2026 11:00 - Toni]' });
  e.renderMarcas();
  ok('la linea de policia se pinta bajo la casilla de policia', e.els.mkPolDone.innerHTML.indexOf('- Marta') > 0);
  ok('  ...y no bajo la de deposito', e.els.mkDepTerm.innerHTML.indexOf('- Marta') === -1);
  ok('la linea de deposito se pinta bajo la casilla de deposito', e.els.mkDepTerm.innerHTML.indexOf('- Toni') > 0);
  ok('una casilla sin sellos queda oculta', e.els.mkArrDone.style.display === 'none');
  ok('una casilla con sellos se muestra', e.els.mkPolDone.style.display === 'block');

  /* 12. renderMarcas escapa el HTML */
  e = makeEnv(P, { texto: '[Policia marcado 01/09/2026 10:00 - <img src=x onerror=alert(1)>]' });
  e.renderMarcas();
  ok('el nombre del usuario se escapa antes de entrar en el HTML', e.els.mkPolDone.innerHTML.indexOf('<img') === -1, e.els.mkPolDone.innerHTML);

  /* 13. sin historial, nada que pintar */
  e = makeEnv(P, { texto: '' });
  e.renderMarcas();
  ok('sin historial las cuatro cajas quedan ocultas',
    ['mkArrDone', 'mkPolDone', 'mkDepTerm', 'mkEco'].every(function (k) { return e.els[k].style.display === 'none'; }));

  /* 14. v82/v42: importe manual de la ecotasa y comentarios (aviso de Toni Segui
     21/09/2026 09:31, reserva 62873423). Reloj fijo inyectado por la prueba. */
  var sello = function (etiqueta, accion) { return '[' + etiqueta + ' ' + accion + ' 21/09/2026 09:31 - Toni Segui]'; };
  e = makeEnv(P, {});
  var me = e.marcasEcotasa;

  var s = me({ importe: '149.60', coment: '' }, { importe: '123.65', coment: '' }, sello);
  ok('cambiar el importe manual de la ecotasa deja exactamente un sello', s.length === 1, JSON.stringify(s));
  ok('  ...con el importe viejo y el nuevo',
    s[0] === '[Ecotasa importe cambiado de 149.60 a 123.65 21/09/2026 09:31 - Toni Segui]', s[0]);

  ok('el mismo importe escrito de otra forma no deja sello',
    me({ importe: '50', coment: '' }, { importe: '50.00', coment: '' }, sello).length === 0);
  ok('la coma decimal cuenta como punto',
    me({ importe: '50,00', coment: '' }, { importe: '50', coment: '' }, sello).length === 0);

  s = me({ importe: '', coment: '' }, { importe: '123.65', coment: '' }, sello);
  ok('un importe nuevo sobre un campo vacio deja sello desde 0.00',
    s.length === 1 && s[0] === '[Ecotasa importe cambiado de 0.00 a 123.65 21/09/2026 09:31 - Toni Segui]', JSON.stringify(s));

  s = me({ importe: '149.60', coment: 'sin pagar' }, { importe: '149.60', coment: 'pagado en efectivo' }, sello);
  ok('cambiar el comentario deja exactamente un sello', s.length === 1, JSON.stringify(s));
  ok('  ...sin copiar el texto del comentario dentro de la marca',
    s[0] === '[Ecotasa comentario cambiado 21/09/2026 09:31 - Toni Segui]', s[0]);
  ok('un comentario con espacios de mas no es un cambio',
    me({ importe: '10', coment: ' nota ' }, { importe: '10', coment: 'nota' }, sello).length === 0);
  ok('un comentario guardado con saltos de Windows (\\r\\n) no es un cambio',
    me({ importe: '10', coment: 'a\r\nb' }, { importe: '10', coment: 'a\nb' }, sello).length === 0);

  ok('cambiar importe y comentario a la vez deja dos sellos',
    me({ importe: '149.60', coment: 'a' }, { importe: '123.65', coment: 'b' }, sello).length === 2);

  ok('si el valor anterior no se cargo, no se escribe ningun sello',
    me({ importe: null, coment: null }, { importe: '123.65', coment: 'b' }, sello).length === 0);

  ok('un importe que no es un numero no deja sello',
    me({ importe: '149.60', coment: '' }, { importe: 'ciento', coment: '' }, sello).length === 0);
  ok('  ...tampoco si el que no es numero es el anterior',
    me({ importe: 'ciento', coment: '' }, { importe: '123.65', coment: '' }, sello).length === 0);

  /* 15. el sello del importe viaja en el record igual que los demas */
  e = makeEnv(P, {
    ecoImporte: '123.65', ecoComent: 'pagado en efectivo',
    ecoPrev: { importe: '149.60', coment: '' },
    prev: { arr: false, pol: false, dep: false, eco: false }
  });
  rec = e.guardar({});
  var ls2 = String(rec.Marcas_manuales || '').split('\n');
  ok('guardar escribe las dos lineas nuevas de la ecotasa en Marcas_manuales', ls2.length === 2, JSON.stringify(rec));
  ok('  ...con el formato [Ecotasa importe cambiado de 149.60 a 123.65 DD/MM/AAAA HH:MM - Nombre]',
    /^\[Ecotasa importe cambiado de 149\.60 a 123\.65 \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} - Toni Segui\]$/.test(ls2[0]), ls2[0]);
  ok('  ...y [Ecotasa comentario cambiado DD/MM/AAAA HH:MM - Nombre]',
    /^\[Ecotasa comentario cambiado \d{2}\/\d{2}\/\d{4} \d{2}:\d{2} - Toni Segui\]$/.test(ls2[1]), ls2[1]);

  e = makeEnv(P, {
    ecoImporte: '149.60', ecoComent: '',
    ecoPrev: { importe: '149.60', coment: '' },
    prev: { arr: false, pol: false, dep: false, eco: false }
  });
  ok('sin tocar la ecotasa el campo no viaja en el record', !('Marcas_manuales' in e.guardar({})));

  /* 16. estas lineas NO son la casilla de ecotasa cobrada */
  e = makeEnv(P, {
    texto: '[Ecotasa marcado 01/09/2026 10:00 - Marta]\n[Ecotasa importe cambiado de 149.60 a 123.65 21/09/2026 09:31 - Toni]\n[Ecotasa comentario cambiado 21/09/2026 09:31 - Toni]'
  });
  e.renderMarcas();
  ok('bajo la casilla de ecotasa solo se pinta el sello de la casilla',
    e.els.mkEco.innerHTML.indexOf('- Marta') > 0 && e.els.mkEco.innerHTML.indexOf('importe cambiado') === -1
    && e.els.mkEco.innerHTML.indexOf('comentario cambiado') === -1, e.els.mkEco.innerHTML);
});

console.log('\n== las dos paginas (HTML) ==');
PAGES.forEach(function (P) {
  var src = fs.readFileSync(P, 'utf8');
  ['mkArrDone', 'mkPolDone', 'mkDepTerm', 'mkEco'].forEach(function (id) {
    ok(P + ' tiene la caja ' + id, src.indexOf('id="' + id + '"') > 0);
  });
  ok(P + ' lee el valor anterior de la TABLA, no de la vista',
    /action=data&table=TaBookings2021&where=/.test(src));
  ok(P + ' comprueba que el campo existe antes de usarlo',
    src.indexOf("'Marcas_manuales' in rows[0]") > 0);
});

var rSrc = fs.readFileSync('notas-equipo-reservas.html', 'utf8');
var rLine3 = rSrc.split('\n')[2];
ok('notas-equipo-reservas: marcador de version y PAGE_VERSION coinciden',
  /VERSIÓN ACTUAL: v82/.test(rLine3) && /PAGE_VERSION = 82/.test(rSrc), rLine3);
ok('notas-equipo-reservas: titulo e historial v82',
  rSrc.indexOf('<title>Notas Equipo Reservas v82') > 0 && /<!-- HISTORIAL: v82 - /.test(rSrc) && / \| v81 - /.test(rSrc));
var vSrc = fs.readFileSync('notas-villamanager.html', 'utf8');
ok('notas-villamanager: marcador de version v42', /VERSIÓN ACTUAL: v42/.test(vSrc.split('\n')[2]));
ok('notas-villamanager: titulo e historial v42',
  vSrc.indexOf('<title>Notas Villa Manager v42') > 0 && /<!-- HISTORIAL: v42 - /.test(vSrc) && / \| v41 - /.test(vSrc));

console.log('\n' + pass + ' pass, ' + fail + ' fail\n');
process.exit(fail ? 1 : 0);
