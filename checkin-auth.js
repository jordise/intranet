/* checkin-auth.js v4 — Autenticación huéspedes 3Villas
   Flujo:
   1. URL tiene ?TaBookings2021_FS_confirmation_code=XXXXXXXX
   2. ¿PIN guardado en sessionStorage? → re-verificar → datos frescos → onVerified(booking)
   3. Si no → pantalla de verificación email → código → sessionStorage → onVerified(booking) */

const CheckinAuth = (function(){

  const WORKER      = 'https://caspio-proxy.jordi-89b.workers.dev';
  const SESSION_KEY = '3v_checkin_auth';
  const SESSION_TTL = 4 * 60 * 60 * 1000;
  const MAX_ATT     = 5;

  /* ── i18n v4: textos del overlay traducidos ── */
  const CA_LANG = {
    en:{
      title_email:'Check-in Online',
      sub_email:'Enter the email address you used when booking to receive your access code.',
      lbl_email:'Email address', ph_email:'your@email.com',
      btn_email:'Send access code', sending:'Sending…',
      title_pin:'Check your email', lbl_pin:'Access code', ph_pin:'· · · · ·',
      btn_pin:'Verify code', verifying:'Verifying…',
      back:'← Try a different email',
      no_email:"Didn't receive it? Check spam or contact us at",
      verified:'Verified!', loading:'Loading your check-in…',
      need_help:'Need help?',
      err_email:'Please enter a valid email address.',
      err_not_found:'This email does not match our records. Please use the email you booked with.',
      err_send:'Could not send the code. Please try again or contact us.',
      err_code:'Please enter the full code.',
      err_too_many:'Too many incorrect attempts. Please contact us at bookings@3villas.com',
      err_incorrect:'Incorrect code. {left} attempt{s} remaining.',
      att_used:'{att} of {max} attempts used',
      hint_confirm:'Your access code will be sent to <strong>{hint}</strong>. Click the button to confirm.',
      sent:'We’ve sent a 5-digit code to {email}. Check your inbox (and spam folder).',
    },
    es:{
      title_email:'Check-in Online',
      sub_email:'Introduce el email que usaste al hacer la reserva para recibir tu código de acceso.',
      lbl_email:'Correo electrónico', ph_email:'tu@email.com',
      btn_email:'Enviar código', sending:'Enviando…',
      title_pin:'Revisa tu email', lbl_pin:'Código de acceso', ph_pin:'· · · · ·',
      btn_pin:'Verificar código', verifying:'Verificando…',
      back:'← Usar otro email',
      no_email:'¿No lo has recibido? Revisa el spam o contáctanos en',
      verified:'¡Verificado!', loading:'Cargando tu check-in…',
      need_help:'¿Necesitas ayuda?',
      err_email:'Por favor, introduce un email válido.',
      err_not_found:'Este email no coincide con nuestros registros. Usa el email con el que reservaste.',
      err_send:'No se pudo enviar el código. Inténtalo de nuevo o contáctanos.',
      err_code:'Por favor, introduce el código completo.',
      err_too_many:'Demasiados intentos incorrectos. Contáctanos en bookings@3villas.com',
      err_incorrect:'Código incorrecto. Quedan {left} intento{s}.',
      att_used:'{att} de {max} intentos usados',
      hint_confirm:'Tu código de acceso se enviará a <strong>{hint}</strong>. Pulsa el botón para confirmar.',
      sent:'Hemos enviado un código de 5 dígitos a {email}. Revisa tu bandeja de entrada (y el spam).',
    },
    fr:{
      title_email:'Check-in Online',
      sub_email:"Entrez l’email utilisé lors de votre réservation pour recevoir votre code d’accès.",
      lbl_email:'Adresse e-mail', ph_email:'votre@email.com',
      btn_email:"Envoyer le code", sending:'Envoi…',
      title_pin:'Vérifiez vos emails', lbl_pin:"Code d’accès", ph_pin:'· · · · ·',
      btn_pin:'Vérifier le code', verifying:'Vérification…',
      back:'← Utiliser un autre email',
      no_email:"Vous ne l’avez pas reçu ? Vérifiez les spams ou contactez-nous :",
      verified:'Vérifié !', loading:'Chargement de votre check-in…',
      need_help:"Besoin d’aide ?",
      err_email:'Veuillez entrer une adresse e-mail valide.',
      err_not_found:"Cet email ne correspond pas à nos enregistrements. Utilisez l’email de réservation.",
      err_send:"Impossible d’envoyer le code. Réessayez ou contactez-nous.",
      err_code:'Veuillez entrer le code complet.',
      err_too_many:'Trop de tentatives incorrectes. Contactez-nous à bookings@3villas.com',
      err_incorrect:'Code incorrect. {left} tentative{s} restante{s}.',
      att_used:'{att} sur {max} tentatives utilisées',
      hint_confirm:'Votre code sera envoyé à <strong>{hint}</strong>. Cliquez pour confirmer.',
      sent:'Nous avons envoyé un code à 5 chiffres à {email}. Vérifiez votre boîte (et les spams).',
    },
    de:{
      title_email:'Check-in Online',
      sub_email:'Geben Sie die E-Mail-Adresse ein, die Sie bei der Buchung verwendet haben, um Ihren Zugangscode zu erhalten.',
      lbl_email:'E-Mail-Adresse', ph_email:'ihre@email.com',
      btn_email:'Code senden', sending:'Senden…',
      title_pin:'E-Mail prüfen', lbl_pin:'Zugangscode', ph_pin:'· · · · ·',
      btn_pin:'Code bestätigen', verifying:'Prüfen…',
      back:'← Andere E-Mail verwenden',
      no_email:'Nichts erhalten? Spam-Ordner prüfen oder kontaktieren Sie uns:',
      verified:'Bestätigt!', loading:'Ihr Check-in wird geladen…',
      need_help:'Brauchen Sie Hilfe?',
      err_email:'Bitte geben Sie eine gültige E-Mail-Adresse ein.',
      err_not_found:'Diese E-Mail stimmt nicht mit unseren Daten überein. Bitte die Buchungs-E-Mail verwenden.',
      err_send:'Code konnte nicht gesendet werden. Bitte erneut versuchen oder uns kontaktieren.',
      err_code:'Bitte geben Sie den vollständigen Code ein.',
      err_too_many:'Zu viele falsche Versuche. Kontaktieren Sie uns: bookings@3villas.com',
      err_incorrect:'Falscher Code. Noch {left} Versuch{s}.',
      att_used:'{att} von {max} Versuchen verwendet',
      hint_confirm:'Ihr Code wird an <strong>{hint}</strong> gesendet. Klicken Sie zur Bestätigung.',
      sent:'Wir haben einen 5-stelligen Code an {email} gesendet. Posteingang (und Spam) prüfen.',
    },
    it:{
      title_email:'Check-in Online',
      sub_email:"Inserisci l’email usata per la prenotazione per ricevere il tuo codice di accesso.",
      lbl_email:'Indirizzo email', ph_email:'tuo@email.com',
      btn_email:'Invia codice', sending:'Invio…',
      title_pin:'Controlla la tua email', lbl_pin:'Codice di accesso', ph_pin:'· · · · ·',
      btn_pin:'Verifica codice', verifying:'Verifica…',
      back:'← Usa un’altra email',
      no_email:"Non l’hai ricevuto? Controlla lo spam o contattaci:",
      verified:'Verificato!', loading:'Caricamento check-in…',
      need_help:'Hai bisogno di aiuto?',
      err_email:'Inserisci un indirizzo email valido.',
      err_not_found:"Questa email non corrisponde ai nostri dati. Usa l’email con cui hai prenotato.",
      err_send:'Impossibile inviare il codice. Riprova o contattaci.',
      err_code:'Inserisci il codice completo.',
      err_too_many:'Troppi tentativi errati. Contattaci a bookings@3villas.com',
      err_incorrect:'Codice errato. Rimangono {left} tentativo{s}.',
      att_used:'{att} di {max} tentativi usati',
      hint_confirm:'Il tuo codice verrà inviato a <strong>{hint}</strong>. Clicca per confermare.',
      sent:'Abbiamo inviato un codice a 5 cifre a {email}. Controlla la posta in arrivo (e lo spam).',
    },
    nl:{
      title_email:'Check-in Online',
      sub_email:'Voer het e-mailadres in dat u bij de boeking heeft gebruikt om uw toegangscode te ontvangen.',
      lbl_email:'E-mailadres', ph_email:'uw@email.com',
      btn_email:'Code verzenden', sending:'Verzenden…',
      title_pin:'Controleer uw e-mail', lbl_pin:'Toegangscode', ph_pin:'· · · · ·',
      btn_pin:'Code verifiëren', verifying:'Verifiëren…',
      back:'← Ander e-mailadres gebruiken',
      no_email:'Niet ontvangen? Controleer spam of neem contact op:',
      verified:'Geverifieerd!', loading:'Check-in wordt geladen…',
      need_help:'Hulp nodig?',
      err_email:'Voer een geldig e-mailadres in.',
      err_not_found:'Dit e-mailadres komt niet overeen met onze gegevens. Gebruik het boekings-e-mailadres.',
      err_send:'Kon de code niet verzenden. Probeer opnieuw of neem contact op.',
      err_code:'Voer de volledige code in.',
      err_too_many:'Te veel onjuiste pogingen. Neem contact op: bookings@3villas.com',
      err_incorrect:'Onjuiste code. Nog {left} poging{s} over.',
      att_used:'{att} van {max} pogingen gebruikt',
      hint_confirm:'Uw code wordt verzonden naar <strong>{hint}</strong>. Klik om te bevestigen.',
      sent:'We hebben een 5-cijferige code gestuurd naar {email}. Controleer uw inbox (en spam).',
    },
    pt:{
      title_email:'Check-in Online',
      sub_email:'Introduza o email que usou na reserva para receber o seu código de acesso.',
      lbl_email:'Endereço de email', ph_email:'seu@email.com',
      btn_email:'Enviar código', sending:'A enviar…',
      title_pin:'Verifique o seu email', lbl_pin:'Código de acesso', ph_pin:'· · · · ·',
      btn_pin:'Verificar código', verifying:'A verificar…',
      back:'← Usar outro email',
      no_email:'Não recebeu? Verifique o spam ou contacte-nos:',
      verified:'Verificado!', loading:'A carregar o check-in…',
      need_help:'Precisa de ajuda?',
      err_email:'Por favor, introduza um email válido.',
      err_not_found:'Este email não corresponde aos nossos registos. Use o email da reserva.',
      err_send:'Não foi possível enviar o código. Tente novamente ou contacte-nos.',
      err_code:'Por favor, introduza o código completo.',
      err_too_many:'Demasiadas tentativas incorretas. Contacte-nos: bookings@3villas.com',
      err_incorrect:'Código incorreto. Restam {left} tentativa{s}.',
      att_used:'{att} de {max} tentativas usadas',
      hint_confirm:'O seu código será enviado para <strong>{hint}</strong>. Clique para confirmar.',
      sent:'Enviamos um código de 5 dígitos para {email}. Verifique a sua caixa de entrada (e spam).',
    },
    ca:{
      title_email:'Check-in Online',
      sub_email:"Introdueix l’email que vas fer servir a la reserva per rebre el teu codi d’accés.",
      lbl_email:'Adreça de correu', ph_email:'elvostrre@email.com',
      btn_email:'Enviar codi', sending:'Enviant…',
      title_pin:'Revisa el teu correu', lbl_pin:"Codi d’accés", ph_pin:'· · · · ·',
      btn_pin:'Verificar codi', verifying:'Verificant…',
      back:'← Usar un altre correu',
      no_email:"No l’has rebut? Revisa l’spam o contacta’ns a",
      verified:'Verificat!', loading:"Carregant el check-in…",
      need_help:'Necessites ajuda?',
      err_email:'Si us plau, introdueix un email vàlid.',
      err_not_found:"Aquest email no coincideix amb els nostres registres. Usa l’email amb què vas reservar.",
      err_send:"No s’ha pogut enviar el codi. Torna-ho a intentar o contacta’ns.",
      err_code:'Si us plau, introdueix el codi complet.',
      err_too_many:"Massa intents incorrectes. Contacta’ns a bookings@3villas.com",
      err_incorrect:'Codi incorrecte. Queden {left} intent{s}.',
      att_used:'{att} de {max} intents usats',
      hint_confirm:"El teu codi s’enviarà a <strong>{hint}</strong>. Fes clic per confirmar.",
      sent:"Hem enviat un codi de 5 xífres a {email}. Revisa la safata d’entrada (i l’spam).",
    },
  };

  function _getLang(){
    var sup=['en','es','fr','de','it','nl','pt','ca'];
    var saved=null; try{saved=localStorage.getItem('3v_lang');}catch(e){}
    var nav=(navigator.language||'en').split('-')[0].toLowerCase();
    var l=saved||(sup.includes(nav)?nav:'en');
    return CA_LANG[l]?l:'en';
  }
  function _t(k,vars){
    var lang=_getLang();
    var s=(CA_LANG[lang]&&CA_LANG[lang][k])||(CA_LANG.en[k])||k;
    if(vars) Object.keys(vars).forEach(function(p){s=s.replace(new RegExp('{'+p+'}','g'),vars[p]);});
    return s;
  }

  /* Actualizar textos del overlay cuando el idioma cambia externamente */
  function _refreshOverlay(){
    var steps=['Email','Pin','Ok'];
    var visible='';
    steps.forEach(function(s){
      var el=document.getElementById('caStep'+s);
      if(el&&el.style.display!=='none') visible=s;
    });
    /* Actualizar textos estáticos */
    _applyOverlayTexts();
    /* Si está en paso email, re-aplicar el sub */
    if(visible==='Email'){
      var sub=document.getElementById('caEmailSub');
      if(sub&&!sub.innerHTML.includes('<strong>')){
        sub.textContent=_t('sub_email');
      }
    }
  }

  /* Aplicar todos los textos al overlay */
  function _applyOverlayTexts(){
    var ids={
      'caStepEmail .ca-title':        'title_email',
    };
    /* Actualizar dinámicamente los nodos de texto */
    [
      ['caEmailSub',    'sub_email',    'text'],
      ['caBtnEmail',    'btn_email',    'text'],
      ['caBtnPin',      'btn_pin',      'text'],
      ['caBack',        'back',         'text'],
    ].forEach(function(row){
      var el=document.getElementById(row[0]);
      if(!el) return;
      /* Solo actualizar si el botón no está en estado "busy" */
      if(el.disabled) return;
      el.textContent=_t(row[1]);
    });
    /* Títulos y labels */
    document.querySelectorAll('[data-ca-i18n]').forEach(function(el){
      el.textContent=_t(el.getAttribute('data-ca-i18n'));
    });
    /* Placeholders */
    document.querySelectorAll('[data-ca-ph]').forEach(function(el){
      el.placeholder=_t(el.getAttribute('data-ca-ph'));
    });
  }

  /* ── Session (guarda solo code + pin, no el booking) ── */
  function getSession(code){
    try {
      const s = sessionStorage.getItem(SESSION_KEY);
      if(!s) return null;
      const obj = JSON.parse(s);
      if(obj.code !== code || Date.now() > obj.expires){
        sessionStorage.removeItem(SESSION_KEY);
        return null;
      }
      return obj;
    } catch(e){ return null; }
  }

  function setSession(code, pin){
    sessionStorage.setItem(SESSION_KEY, JSON.stringify({
      code, pin, expires: Date.now() + SESSION_TTL
    }));
  }

  /* ── URL param ── */
  function getCode(){
    const p = new URLSearchParams(location.search);
    return p.get('TaBookings2021_FS_confirmation_code')
        || p.get('FS_confirmation_code')
        || p.get('code') || '';
  }

  /* ── Worker call ── */
  async function wPost(action, body){
    const r = await fetch(`${WORKER}?action=${action}`, {
      method : 'POST',
      headers: {'Content-Type':'application/json'},
      body   : JSON.stringify(body)
    });
    const j = await r.json();
    if(!r.ok) throw new Error(j.error || `Error ${r.status}`);
    return j;
  }

  /* ══ CSS del overlay ══ */
  const CSS = `
    #caOverlay{position:fixed;inset:0;background:#fff;z-index:9999;
      display:flex;align-items:center;justify-content:center;padding:24px 20px;
      font-family:'Open Sans',sans-serif}
    .ca-card{width:100%;max-width:380px}
    .ca-logo{display:block;height:192px;max-width:100%;object-fit:contain;margin:0 auto 18px}
    .ca-title{font-family:Montserrat,sans-serif;font-size:20px;font-weight:900;
      color:#C8102E;text-align:center;margin-bottom:6px}
    .ca-sub{font-size:13px;color:#868e96;text-align:center;margin-bottom:22px;line-height:1.5}
    .ca-lbl{font-family:Montserrat,sans-serif;font-size:10px;font-weight:800;
      text-transform:uppercase;letter-spacing:.5px;color:#495057;display:block;margin-bottom:5px}
    .ca-inp{width:100%;padding:11px 14px;border:1.5px solid #dee2e6;border-radius:10px;
      font-size:15px;outline:none;transition:border-color .15s;margin-bottom:10px;
      font-family:'Open Sans',sans-serif;box-sizing:border-box}
    .ca-inp:focus{border-color:#C8102E}
    .ca-inp.pin{font-size:26px;letter-spacing:8px;text-align:center;font-weight:800;
      font-family:Montserrat,sans-serif}
    .ca-btn{width:100%;padding:12px;background:#C8102E;color:#fff;border:none;
      border-radius:10px;font-family:Montserrat,sans-serif;font-size:14px;
      font-weight:800;cursor:pointer;margin-top:4px;box-sizing:border-box}
    .ca-btn:disabled{opacity:.5;cursor:not-allowed}
    .ca-err{background:#fff5f5;border:1px solid #feb2b2;border-radius:8px;
      padding:10px 14px;font-size:12px;color:#C8102E;margin-bottom:10px;
      display:none;font-family:Montserrat,sans-serif;font-weight:600}
    .ca-back{background:none;border:none;color:#868e96;font-size:12px;cursor:pointer;
      margin-top:12px;font-family:Montserrat,sans-serif;font-weight:600;
      text-decoration:underline;width:100%;text-align:center;display:block}
    .ca-att{font-size:11px;color:#adb5bd;text-align:center;margin-top:8px}
    .ca-ok{text-align:center;padding:20px 0}
    .ca-ok-ico{font-size:48px;display:block;margin-bottom:8px}
    .ca-sp{display:inline-block;width:18px;height:18px;border:2px solid rgba(255,255,255,.4);
      border-top-color:#fff;border-radius:50%;animation:casp .6s linear infinite;
      vertical-align:middle;margin-right:6px}
    @keyframes casp{to{transform:rotate(360deg)}}
    .ca-contact{margin-top:20px;padding-top:16px;border-top:1px solid #f1f3f5;
      text-align:center;font-size:11px;color:#adb5bd;line-height:1.6}
    .ca-contact a{color:#C8102E;text-decoration:none}
  `;

  function inject(){
    const s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);
    const d = document.createElement('div');
    d.id = 'caOverlay';
    d.innerHTML = `
      <div class="ca-card">
        <img class="ca-logo" src="logo-negro.png" alt="3Villas"
             onerror="this.onerror=null;this.style.display='none'">
        <div id="caStepEmail">
          <div class="ca-title" data-ca-i18n="title_email">Check-in Online</div>
          <div class="ca-sub" id="caEmailSub" data-ca-i18n="sub_email">Enter the email address you used when booking to receive your access code.</div>
          <div class="ca-err" id="caErrEmail"></div>
          <label class="ca-lbl" data-ca-i18n="lbl_email">Email address</label>
          <input class="ca-inp" id="caEmail" type="email" data-ca-ph="ph_email" placeholder="your@email.com" autocomplete="email">
          <button class="ca-btn" id="caBtnEmail" onclick="CheckinAuth._send()">Send access code</button>
          <div class="ca-contact">
            <span data-ca-i18n="need_help">Need help?</span>
            <a href="https://api.whatsapp.com/send?phone=34659933434" target="_blank">WhatsApp</a>
            · <a href="mailto:bookings@3villas.com">bookings@3villas.com</a>
          </div>
        </div>
        <div id="caStepPin" style="display:none">
          <div class="ca-title" data-ca-i18n="title_pin">Check your email</div>
          <div class="ca-sub" id="caPinSub"></div>
          <div class="ca-err" id="caErrPin"></div>
          <label class="ca-lbl" data-ca-i18n="lbl_pin">Access code</label>
          <input class="ca-inp pin" id="caPin" type="text" inputmode="numeric"
                 maxlength="5" data-ca-ph="ph_pin" placeholder="· · · · ·" autocomplete="one-time-code">
          <button class="ca-btn" id="caBtnPin" onclick="CheckinAuth._verify()">Verify code</button>
          <div class="ca-att" id="caAtt"></div>
          <button class="ca-back" id="caBack" onclick="CheckinAuth._back()">← Try a different email</button>
          <div class="ca-contact">
            <span data-ca-i18n="no_email">Didn't receive it? Check spam or contact us at</span>
            <a href="https://api.whatsapp.com/send?phone=34659933434" target="_blank">+34 659 93 34 34</a>
          </div>
        </div>
        <div id="caStepOk" style="display:none">
          <div class="ca-ok">
            <span class="ca-ok-ico">✅</span>
            <div id="caOkTitle" data-ca-i18n="verified" style="font-family:Montserrat,sans-serif;font-weight:800;font-size:16px;color:#16a34a">Verified!</div>
            <div id="caOkSub" data-ca-i18n="loading" style="font-size:13px;color:#868e96;margin-top:4px">Loading your check-in…</div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(d);
    document.getElementById('caEmail').addEventListener('keydown', e => { if(e.key==='Enter') CheckinAuth._send(); });
    document.getElementById('caPin').addEventListener('keydown',  e => { if(e.key==='Enter') CheckinAuth._verify(); });
    /* v4: aplicar idioma al overlay nada más montarlo */
    _applyOverlayTexts();
    document.getElementById('caBtnEmail').textContent = _t('btn_email');
    document.getElementById('caBtnPin').textContent   = _t('btn_pin');
    document.getElementById('caBack').textContent     = _t('back');

    /* Pedir email hint al Worker y pre-rellenar */
    fetch(`${WORKER}?action=checkin-hint&code=${encodeURIComponent(_code)}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if(!j || !j.hint) return;
        const inp = document.getElementById('caEmail');
        if(inp) inp.value = j.hint;
        const sub = document.getElementById('caEmailSub');
        if(sub) sub.innerHTML = _t('hint_confirm',{hint:j.hint});
      })
      .catch(() => {});
  }

  function step(s){
    ['Email','Pin','Ok'].forEach(n => {
      document.getElementById('caStep'+n).style.display = n===s ? 'block' : 'none';
    });
  }
  function err(id, msg){ const e=document.getElementById(id); e.textContent=msg; e.style.display='block'; }
  function noErr(id){ document.getElementById(id).style.display='none'; }
  function busy(id, on, txt){
    const b = document.getElementById(id);
    b.disabled = on;
    if(!b._orig) b._orig = b.textContent;
    b.innerHTML = on ? `<span class="ca-sp"></span>${txt||'Please wait…'}` : b._orig;
  }

  let _code='', _email='', _att=0, _cb=null;

  async function send(){
    noErr('caErrEmail');
    const email = (document.getElementById('caEmail').value||'').toLowerCase().trim();
    if(!email || !email.includes('@')){ err('caErrEmail',_t('err_email')); return; }
    busy('caBtnEmail', true, _t('sending'));
    try {
      await wPost('send-checkin-code', { bookingCode:_code, email });
      _email = email;
      document.getElementById('caPinSub').textContent = _t('sent',{email:email});
      step('Pin');
    } catch(e){
      err('caErrEmail', e.message.includes('not found') ? _t('err_not_found') : _t('err_send'));
    } finally { busy('caBtnEmail', false); }
  }

  async function verify(){
    noErr('caErrPin');
    const pin = (document.getElementById('caPin').value||'').replace(/\D/g,'').trim();
    if(pin.length < 4){ err('caErrPin',_t('err_code')); return; }
    busy('caBtnPin', true, _t('verifying'));
    try {
      const j = await wPost('verify-checkin-code', { bookingCode:_code, pin });
      step('Ok');
      setSession(_code, pin);
      setTimeout(() => {
        document.getElementById('caOverlay').remove();
        if(_cb) _cb(j.booking);
      }, 700);
    } catch(e){
      _att++;
      const left = MAX_ATT - _att;
      if(left <= 0){
        err('caErrPin',_t('err_too_many'));
        document.getElementById('caBtnPin').disabled = true;
        document.getElementById('caPin').disabled = true;
      } else {
        err('caErrPin', _t('err_incorrect',{left:left, s:left!==1?'s':''}));
        document.getElementById('caPin').value = '';
        document.getElementById('caAtt').textContent = _t('att_used',{att:_att, max:MAX_ATT});
      }
    } finally { busy('caBtnPin', false); }
  }

  function back(){
    noErr('caErrPin');
    document.getElementById('caPin').value = '';
    _att = 0;
    document.getElementById('caAtt').textContent = '';
    document.getElementById('caBtnPin').disabled = false;
    step('Email');
    busy('caBtnEmail', false);
  }

  /* ══ API pública ══ */
  return {
    init(opts){
      _cb   = opts.onVerified || (() => {});
      _code = opts.code || getCode();

      if(!_code){
        document.body.innerHTML = '<div style="text-align:center;padding:60px 20px;font-family:Montserrat,sans-serif">' +
          '<p style="color:#C8102E;font-weight:800">No booking code in URL</p>' +
          '<p style="font-size:13px;color:#868e96;margin-top:8px">Add ?TaBookings2021_FS_confirmation_code=CODE to the URL</p></div>';
        return;
      }

      /* ¿Sesión existente? Re-verificar con PIN guardado → datos frescos */
      const sess = getSession(_code);
      if(sess){
        wPost('verify-checkin-code', { bookingCode: _code, pin: sess.pin })
          .then(j => {
            if(_cb && j.booking){
              _cb(j.booking);
            } else {
              /* booking null/undefined → sesión inválida, mostrar overlay */
              sessionStorage.removeItem(SESSION_KEY);
              const go = () => inject();
              document.readyState === 'loading'
                ? document.addEventListener('DOMContentLoaded', go)
                : go();
            }
          })
          .catch(e => {
            /* Si falla (pin expirado, error de red, etc.) → mostrar overlay */
            sessionStorage.removeItem(SESSION_KEY);
            const go = () => inject();
            document.readyState === 'loading'
              ? document.addEventListener('DOMContentLoaded', go)
              : go();
          });
        return;
      }

      /* Sin sesión → mostrar overlay */
      const go = () => inject();
      document.readyState === 'loading'
        ? document.addEventListener('DOMContentLoaded', go)
        : go();
    },

    _send:   () => send(),
    _verify: () => verify(),
    _back:   () => back(),
    /* v4: llamar desde la página cuando el usuario cambia idioma */
    _refreshLang: () => { if(document.getElementById('caOverlay')) _refreshOverlay(); },

    getCode:    () => _code,
    getBooking: () => null,
    isVerified: () => !!getSession(_code),
  };

})();



FILE: checkin-deposit.html
