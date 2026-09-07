/* Pruebas del validador de redirect de login.html — node login-redirect.test.js */
var fs = require('fs');
var path = require('path');

var html = fs.readFileSync(path.join(__dirname, 'login.html'), 'utf8');
var m = html.match(/function sanitizeRedirect\(raw\) \{[\s\S]*?\n\}/);
if (!m) { console.error('No se encontro sanitizeRedirect en login.html'); process.exit(1); }

var sanitizeRedirect = new Function('raw', m[0].replace(/^function sanitizeRedirect\(raw\) \{/, '').replace(/\}$/, ''));

var pass = 0, fail = 0;
function ok(name, cond, extra) {
  if (cond) { pass++; console.log('  PASS  ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '  -> ' + extra : '')); }
}

ok('vacio -> entradas.html', sanitizeRedirect('') === 'entradas.html', sanitizeRedirect(''));
ok('https absoluto ajeno -> entradas.html', sanitizeRedirect('https://x.com') === 'entradas.html', sanitizeRedirect('https://x.com'));
ok('protocolo-relativo // -> entradas.html', sanitizeRedirect('//x.com') === 'entradas.html', sanitizeRedirect('//x.com'));
ok('javascript: -> entradas.html', sanitizeRedirect('javascript:alert(1)') === 'entradas.html', sanitizeRedirect('javascript:alert(1)'));
ok('ruta absoluta fuera de /intranet/ -> entradas.html', sanitizeRedirect('/other/a.html') === 'entradas.html', sanitizeRedirect('/other/a.html'));
ok('con ".." -> entradas.html', sanitizeRedirect('../a.html') === 'entradas.html', sanitizeRedirect('../a.html'));
ok('nombre relativo se conserva', sanitizeRedirect('tareas.html?tid=1') === 'tareas.html?tid=1', sanitizeRedirect('tareas.html?tid=1'));
ok('ruta absoluta /intranet/ se conserva', sanitizeRedirect('/intranet/tareas.html') === '/intranet/tareas.html', sanitizeRedirect('/intranet/tareas.html'));

ok('espacio + // -> entradas.html', sanitizeRedirect(' //x.com') === 'entradas.html', sanitizeRedirect(' //x.com'));
ok('tabulador + https -> entradas.html', sanitizeRedirect('\thttps://x.com') === 'entradas.html', sanitizeRedirect('\thttps://x.com'));
ok('salto de linea dentro de javascript: -> entradas.html', sanitizeRedirect('java\nscript:alert(1)') === 'entradas.html', sanitizeRedirect('java\nscript:alert(1)'));
ok('barra invertida -> entradas.html', sanitizeRedirect('\\\\x.com') === 'entradas.html', sanitizeRedirect('\\\\x.com'));
ok('/intranet/../ -> entradas.html', sanitizeRedirect('/intranet/../admin/') === 'entradas.html', sanitizeRedirect('/intranet/../admin/'));

console.log('\n' + pass + ' pass, ' + fail + ' fail');
process.exit(fail ? 1 : 0);
