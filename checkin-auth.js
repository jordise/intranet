/* checkin-auth.js v12 — Autenticación huéspedes 3Villas
   Flujo huésped:
   1. checkin-online: URL tiene ?reserva=XXXXXXXX (o ?TaBookings2021_FS_confirmation_code= / ?FS_confirmation_code= / ?code=)
      → pantalla verificación email → PIN → sesión guardada en localStorage (15 días) → onVerified(booking)
   2. Páginas hijas (checkin-arrival, police, deposit, taxes, premium):
      → si hay sesión válida PARA EL CODE DE LA URL → cargar datos del Worker directamente, SIN pedir PIN de nuevo
      → si hay sesión pero de OTRO code (el code de la URL cambió) → mostrar overlay de verificación
        con el code nuevo (login de nuevo) y cargar los datos de la nueva reserva
      → si no hay sesión → mostrar overlay de verificación con el code de la URL
   Flujo admin/manager:
      → si Auth está disponible y autenticado → bypass total, carga directa por el code de la URL (sin sesión huésped)

   CAMBIOS v10 (sobre v9):
   - checkin-hint: lee hasEmail; si hasEmail=false muestra checkbox "No tengo email"
   - hint preferido: Segundo_email (si existe), si no Guest_email
   - Checkbox "no tengo email": entra directamente al paso PIN con el código alternativo
     (el huésped escribe 5+código_reserva+7, sin necesidad de email ni OTP)
   - PIN ahora es OTP aleatorio (el Worker lo genera); maxlength del input ajustado
   - Bloqueo progresivo: el Worker devuelve locked=true con remainingSeconds;
     la UI muestra cuenta atrás y bloquea el botón hasta que expire

   CAMBIOS v8 (sobre v7):
   - Fix: isMainPage usaba location.pathname.includes('checkin-online.html'), que falla
     cuando el servidor sirve la página sin extensión (/checkin-online en lugar de
     /checkin-online.html). Ahora usa regex sobre location.href para cubrir ambos casos.

   CAMBIOS v7 (sobre v6):
   - getCode() acepta también el parámetro ?reserva= (URL más limpia). Mantiene compatibilidad
     con TaBookings2021_FS_confirmation_code, FS_confirmation_code y code para no romper enlaces antiguos.
   - Páginas hijas: si el code de la URL no coincide con el de la sesión (o no hay sesión),
     se muestra el overlay de verificación con el code de la URL en lugar de cargar la reserva
     de la sesión anterior. Antes cargaba siempre sess.code e ignoraba el code de la URL. */

const CheckinAuth = (function(){

  const WORKER      = 'https://caspio-proxy.jordi-89b.workers.dev';
  const SESSION_KEY = '3v_checkin_auth';
  const SESSION_TTL = 15 * 24 * 60 * 60 * 1000; // 15 días
  const MAX_ATT     = 5;
  const CHECKIN_MAIN = 'checkin-online.html'; // página principal

  /* ─────────────────────────────────────────────
     i18n v5: textos del overlay en 8 idiomas
     ───────────────────────────────────────────── */
  const CA_LANG = {
    en:{
      title_email:'Check-in Online',
      sub_email:'Enter the email address you used when booking to receive your access code.',
      lbl_email:'Email address', ph_email:'your@email.com',
      btn_email:'Send access code', sending:'Sending\u2026',
      title_pin:'Check your email', lbl_pin:'Access code', ph_pin:'\u00b7 \u00b7 \u00b7 \u00b7 \u00b7',
      btn_pin:'Verify code', verifying:'Verifying\u2026',
      back:'\u2190 Try a different email',
      no_email:"Didn't receive it? Check spam or contact us at",
      verified:'Verified!', loading:'Loading your check-in\u2026',
      need_help:'Need help?',
      err_email:'Please enter a valid email address.',
      err_not_found:'This email does not match our records. Please use the email you booked with.',
      err_send:'Could not send the code. Please try again or contact us.',
      no_email_check:'I don\'t have access to the booking email',
      no_email_hint:'Enter the special access code provided by 3Villas staff.',
      err_locked:'Access blocked. Try again in {mins} minute{s}.',
      lbl_alt_code:'Special access code',
      err_code:'Please enter the full code.',
      err_too_many:'Too many incorrect attempts. Please contact us at bookings@3villas.com',
      err_incorrect:'Incorrect code. {left} attempt{s} remaining.',
      att_used:'{att} of {max} attempts used',
      hint_confirm:'Your access code will be sent to <strong>{hint}</strong>. Click the button to confirm.',
      sent:'We\u2019ve sent a 5-digit code to {email}. Check your inbox (and spam folder).',
      redirect_msg:'Please complete the check-in from the main page.',
      redirect_btn:'Go to Check-in',
    },
    es:{
      title_email:'Check-in Online',
      sub_email:'Introduce el email que usaste al hacer la reserva para recibir tu c\u00f3digo de acceso.',
      lbl_email:'Correo electr\u00f3nico', ph_email:'tu@email.com',
      btn_email:'Enviar c\u00f3digo', sending:'Enviando\u2026',
      title_pin:'Revisa tu email', lbl_pin:'C\u00f3digo de acceso', ph_pin:'\u00b7 \u00b7 \u00b7 \u00b7 \u00b7',
      btn_pin:'Verificar c\u00f3digo', verifying:'Verificando\u2026',
      back:'\u2190 Usar otro email',
      no_email:'\u00bfNo lo has recibido? Revisa el spam o cont\u00e1ctanos en',
      verified:'\u00a1Verificado!', loading:'Cargando tu check-in\u2026',
      need_help:'\u00bfNecesitas ayuda?',
      err_email:'Por favor, introduce un email v\u00e1lido.',
      err_not_found:'Este email no coincide con nuestros registros. Usa el email con el que reservaste.',
      err_send:'No se pudo enviar el c\u00f3digo. Int\u00e9ntalo de nuevo o cont\u00e1ctanos.',
      err_code:'Por favor, introduce el c\u00f3digo completo.',
      err_too_many:'Demasiados intentos incorrectos. Cont\u00e1ctanos en bookings@3villas.com',
      err_incorrect:'C\u00f3digo incorrecto. Quedan {left} intento{s}.',
      att_used:'{att} de {max} intentos usados',
      hint_confirm:'Tu c\u00f3digo de acceso se enviar\u00e1 a <strong>{hint}</strong>. Pulsa el bot\u00f3n para confirmar.',
      sent:'Hemos enviado un c\u00f3digo de 5 d\u00edgitos a {email}. Revisa tu bandeja de entrada (y el spam).',
      redirect_msg:'Accede al check-in desde la p\u00e1gina principal.',
      redirect_btn:'Ir al Check-in',
    },
    fr:{
      title_email:'Check-in Online',
      sub_email:"Entrez l\u2019email utilis\u00e9 lors de votre r\u00e9servation pour recevoir votre code d\u2019acc\u00e8s.",
      lbl_email:'Adresse e-mail', ph_email:'votre@email.com',
      btn_email:'Envoyer le code', sending:'Envoi\u2026',
      title_pin:'V\u00e9rifiez vos emails', lbl_pin:"Code d\u2019acc\u00e8s", ph_pin:'\u00b7 \u00b7 \u00b7 \u00b7 \u00b7',
      btn_pin:'V\u00e9rifier le code', verifying:'V\u00e9rification\u2026',
      back:'\u2190 Utiliser un autre email',
      no_email:"Vous ne l\u2019avez pas re\u00e7u ? V\u00e9rifiez les spams ou contactez-nous :",
      verified:'V\u00e9rifi\u00e9 !', loading:'Chargement de votre check-in\u2026',
      need_help:"Besoin d\u2019aide ?",
      err_email:'Veuillez entrer une adresse e-mail valide.',
      err_not_found:"Cet email ne correspond pas \u00e0 nos enregistrements. Utilisez l\u2019email de r\u00e9servation.",
      err_send:"Impossible d\u2019envoyer le code. R\u00e9essayez ou contactez-nous.",
      err_code:'Veuillez entrer le code complet.',
      err_too_many:'Trop de tentatives incorrectes. Contactez-nous \u00e0 bookings@3villas.com',
      err_incorrect:'Code incorrect. {left} tentative{s} restante{s}.',
      att_used:'{att} sur {max} tentatives utilis\u00e9es',
      hint_confirm:'Votre code sera envoy\u00e9 \u00e0 <strong>{hint}</strong>. Cliquez pour confirmer.',
      sent:'Nous avons envoy\u00e9 un code \u00e0 5 chiffres \u00e0 {email}. V\u00e9rifiez votre bo\u00eete (et les spams).',
      redirect_msg:'Veuillez acc\u00e9der au check-in depuis la page principale.',
      redirect_btn:'Aller au Check-in',
    },
    de:{
      title_email:'Check-in Online',
      sub_email:'Geben Sie die E-Mail-Adresse ein, die Sie bei der Buchung verwendet haben, um Ihren Zugangscode zu erhalten.',
      lbl_email:'E-Mail-Adresse', ph_email:'ihre@email.com',
      btn_email:'Code senden', sending:'Senden\u2026',
      title_pin:'E-Mail pr\u00fcfen', lbl_pin:'Zugangscode', ph_pin:'\u00b7 \u00b7 \u00b7 \u00b7 \u00b7',
      btn_pin:'Code best\u00e4tigen', verifying:'Pr\u00fcfen\u2026',
      back:'\u2190 Andere E-Mail verwenden',
      no_email:'Nichts erhalten? Spam-Ordner pr\u00fcfen oder kontaktieren Sie uns:',
      verified:'Best\u00e4tigt!', loading:'Ihr Check-in wird geladen\u2026',
      need_help:'Brauchen Sie Hilfe?',
      err_email:'Bitte geben Sie eine g\u00fcltige E-Mail-Adresse ein.',
      err_not_found:'Diese E-Mail stimmt nicht mit unseren Daten \u00fcberein. Bitte die Buchungs-E-Mail verwenden.',
      err_send:'Code konnte nicht gesendet werden. Bitte erneut versuchen oder uns kontaktieren.',
      no_email_check:'Ich habe keinen Zugriff auf die Buchungs-E-Mail',
      no_email_hint:'Geben Sie den Sonderzugangscode des 3Villas-Teams ein.',
      err_locked:'Zugang gesperrt. Versuchen Sie es in {mins} Minute{s} erneut.',
      lbl_alt_code:'Sonderzugangscode',
      err_code:'Bitte geben Sie den vollst\u00e4ndigen Code ein.',
      err_too_many:'Zu viele falsche Versuche. Kontaktieren Sie uns: bookings@3villas.com',
      err_incorrect:'Falscher Code. Noch {left} Versuch{s}.',
      att_used:'{att} von {max} Versuchen verwendet',
      hint_confirm:'Ihr Code wird an <strong>{hint}</strong> gesendet. Klicken Sie zur Best\u00e4tigung.',
      sent:'Wir haben einen 5-stelligen Code an {email} gesendet. Posteingang (und Spam) pr\u00fcfen.',
      redirect_msg:'Bitte nutzen Sie den Check-in \u00fcber die Hauptseite.',
      redirect_btn:'Zum Check-in',
    },
    it:{
      title_email:'Check-in Online',
      sub_email:"Inserisci l\u2019email usata per la prenotazione per ricevere il tuo codice di accesso.",
      lbl_email:'Indirizzo email', ph_email:'tuo@email.com',
      btn_email:'Invia codice', sending:'Invio\u2026',
      title_pin:'Controlla la tua email', lbl_pin:'Codice di accesso', ph_pin:'\u00b7 \u00b7 \u00b7 \u00b7 \u00b7',
      btn_pin:'Verifica codice', verifying:'Verifica\u2026',
      back:"\u2190 Usa un'altra email",
      no_email:"Non l\u2019hai ricevuto? Controlla lo spam o contattaci:",
      verified:'Verificato!', loading:'Caricamento check-in\u2026',
      need_help:'Hai bisogno di aiuto?',
      err_email:'Inserisci un indirizzo email valido.',
      err_not_found:"Questa email non corrisponde ai nostri dati. Usa l\u2019email con cui hai prenotato.",
      err_send:'Impossibile inviare il codice. Riprova o contattaci.',
      no_email_check:"Non ho accesso all\'email della prenotazione",
      no_email_hint:"Inserisci il codice speciale fornito dal team 3Villas.",
      err_locked:'Accesso bloccato. Riprova tra {mins} minuto{s}.',
      lbl_alt_code:'Codice speciale di accesso',
      err_code:'Inserisci il codice completo.',
      err_too_many:'Troppi tentativi errati. Contattaci a bookings@3villas.com',
      err_incorrect:'Codice errato. Rimangono {left} tentativo{s}.',
      att_used:'{att} di {max} tentativi usati',
      hint_confirm:'Il tuo codice verr\u00e0 inviato a <strong>{hint}</strong>. Clicca per confermare.',
      sent:'Abbiamo inviato un codice a 5 cifre a {email}. Controlla la posta in arrivo (e lo spam).',
      redirect_msg:'Accedi al check-in dalla pagina principale.',
      redirect_btn:'Vai al Check-in',
    },
    nl:{
      title_email:'Check-in Online',
      sub_email:'Voer het e-mailadres in dat u bij de boeking heeft gebruikt om uw toegangscode te ontvangen.',
      lbl_email:'E-mailadres', ph_email:'uw@email.com',
      btn_email:'Code verzenden', sending:'Verzenden\u2026',
      title_pin:'Controleer uw e-mail', lbl_pin:'Toegangscode', ph_pin:'\u00b7 \u00b7 \u00b7 \u00b7 \u00b7',
      btn_pin:'Code verifi\u00ebren', verifying:'Verifi\u00ebren\u2026',
      back:'\u2190 Ander e-mailadres gebruiken',
      no_email:'Niet ontvangen? Controleer spam of neem contact op:',
      verified:'Geverifieerd!', loading:'Check-in wordt geladen\u2026',
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
      redirect_msg:'Gebruik de check-in via de hoofdpagina.',
      redirect_btn:'Naar Check-in',
    },
    pt:{
      title_email:'Check-in Online',
      sub_email:'Introduza o email que usou na reserva para receber o seu c\u00f3digo de acesso.',
      lbl_email:'Endere\u00e7o de email', ph_email:'seu@email.com',
      btn_email:'Enviar c\u00f3digo', sending:'A enviar\u2026',
      title_pin:'Verifique o seu email', lbl_pin:'C\u00f3digo de acesso', ph_pin:'\u00b7 \u00b7 \u00b7 \u00b7 \u00b7',
      btn_pin:'Verificar c\u00f3digo', verifying:'A verificar\u2026',
      back:'\u2190 Usar outro email',
      no_email:'N\u00e3o recebeu? Verifique o spam ou contacte-nos:',
      verified:'Verificado!', loading:'A carregar o check-in\u2026',
      need_help:'Precisa de ajuda?',
      err_email:'Por favor, introduza um email v\u00e1lido.',
      err_not_found:'Este email n\u00e3o corresponde aos nossos registos. Use o email da reserva.',
      err_send:'N\u00e3o foi poss\u00edvel enviar o c\u00f3digo. Tente novamente ou contacte-nos.',
      err_code:'Por favor, introduza o c\u00f3digo completo.',
      err_too_many:'Demasiadas tentativas incorretas. Contacte-nos: bookings@3villas.com',
      err_incorrect:'C\u00f3digo incorreto. Restam {left} tentativa{s}.',
      att_used:'{att} de {max} tentativas usadas',
      hint_confirm:'O seu c\u00f3digo ser\u00e1 enviado para <strong>{hint}</strong>. Clique para confirmar.',
      sent:'Enviamos um c\u00f3digo de 5 d\u00edgitos para {email}. Verifique a sua caixa de entrada (e spam).',
      redirect_msg:'Aceda ao check-in a partir da p\u00e1gina principal.',
      redirect_btn:'Ir ao Check-in',
    },
    ca:{
      title_email:'Check-in Online',
      sub_email:"Introdueix l\u2019email que vas fer servir a la reserva per rebre el teu codi d\u2019acc\u00e9s.",
      lbl_email:'Adre\u00e7a de correu', ph_email:'elvostrre@email.com',
      btn_email:'Enviar codi', sending:'Enviant\u2026',
      title_pin:'Revisa el teu correu', lbl_pin:"Codi d\u2019acc\u00e9s", ph_pin:'\u00b7 \u00b7 \u00b7 \u00b7 \u00b7',
      btn_pin:'Verificar codi', verifying:'Verificant\u2026',
      back:'\u2190 Usar un altre correu',
      no_email:"No l\u2019has rebut? Revisa l\u2019spam o contacta\u2019ns a",
      verified:'Verificat!', loading:"Carregant el check-in\u2026",
      need_help:'Necessites ajuda?',
      err_email:'Si us plau, introdueix un email v\u00e0lid.',
      err_not_found:"Aquest email no coincideix amb els nostres registres. Usa l\u2019email amb qu\u00e8 vas reservar.",
      err_send:"No s\u2019ha pogut enviar el codi. Torna-ho a intentar o contacta\u2019ns.",
      err_code:'Si us plau, introdueix el codi complet.',
      err_too_many:"Massa intents incorrectes. Contacta\u2019ns a bookings@3villas.com",
      err_incorrect:'Codi incorrecte. Queden {left} intent{s}.',
      att_used:'{att} de {max} intents usats',
      hint_confirm:"El teu codi s\u2019enviar\u00e0 a <strong>{hint}</strong>. Fes clic per confirmar.",
      sent:"Hem enviat un codi de 5 x\u00edfres a {email}. Revisa la safata d\u2019entrada (i l\u2019spam).",
      redirect_msg:"Accedeix al check-in des de la p\u00e0gina principal.",
      redirect_btn:'Anar al Check-in',
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
  function _applyOverlayTexts(){
    document.querySelectorAll('[data-ca-i18n]').forEach(function(el){
      el.textContent=_t(el.getAttribute('data-ca-i18n'));
    });
    document.querySelectorAll('[data-ca-ph]').forEach(function(el){
      el.placeholder=_t(el.getAttribute('data-ca-ph'));
    });
  }
  function _setLang(lang){
    try{ localStorage.setItem('3v_lang', lang); }catch(e){}
    /* Refrescar también la página principal si tiene applyLang */
    if(typeof applyLang === 'function') applyLang(lang);
    var lsel = document.getElementById('caLangSel');
    if(lsel) lsel.value = lang;
    _refreshOverlay();
  }

  function _refreshOverlay(){
    _applyOverlayTexts();
    var btnE=document.getElementById('caBtnEmail');
    var btnP=document.getElementById('caBtnPin');
    var btnB=document.getElementById('caBack');
    if(btnE&&!btnE.disabled) btnE.textContent=_t('btn_email');
    if(btnP&&!btnP.disabled) btnP.textContent=_t('btn_pin');
    if(btnB) btnB.textContent=_t('back');
  }

  /* ── Session ── */
  function getSession(code){
    try {
      const s = localStorage.getItem(SESSION_KEY);
      if(!s) return null;
      const obj = JSON.parse(s);
      if(Date.now() > obj.expires){ localStorage.removeItem(SESSION_KEY); return null; }
      /* Si se pasa code específico, verificar que coincide */
      if(code && obj.code !== code){ return null; }
      return obj;
    } catch(e){ return null; }
  }
  function setSession(code, pin){
    localStorage.setItem(SESSION_KEY, JSON.stringify({
      code, pin, expires: Date.now() + SESSION_TTL
    }));
  }

  /* ── URL param ──
     v7: acepta ?reserva= (parámetro nuevo, URL más limpia) además de los antiguos
     para no romper enlaces ya enviados a inquilinos ni las llamadas a Caspio. */
  function getCode(){
    const p = new URLSearchParams(location.search);
    return p.get('reserva')
        || p.get('TaBookings2021_FS_confirmation_code')
        || p.get('FS_confirmation_code')
        || p.get('code') || '';
  }

  /* ── ¿Es admin/manager? (tiene Auth del sistema interno) ── */
  function isAdmin(){
    try {
      return typeof Auth !== 'undefined' && Auth.isLoggedIn && Auth.isLoggedIn();
    } catch(e){ return false; }
  }

  /* ── Worker calls ── */
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

  /* Cargar booking data del Worker usando code + pin */

  /* ── Caché del booking en sessionStorage ───────────────────────────
     Evita llamar al Worker con el OTP ya consumido al navegar entre páginas.
     La clave incluye el code para que no se mezclen reservas distintas. */
  const BOOKING_CACHE_KEY = '3v_booking_cache';

  function getCachedBooking(code){
    try{
      const raw = sessionStorage.getItem(BOOKING_CACHE_KEY);
      if(!raw) return null;
      const obj = JSON.parse(raw);
      if(obj.code !== code) return null;
      return obj.booking || null;
    }catch(e){ return null; }
  }

  function setCachedBooking(code, booking){
    try{ sessionStorage.setItem(BOOKING_CACHE_KEY, JSON.stringify({ code, booking })); }catch(e){}
  }

  function clearBookingCache(){
    try{ sessionStorage.removeItem(BOOKING_CACHE_KEY); }catch(e){}
  }

  async function loadBookingData(code, pin){
    /* Leer caché primero — tras verify() el OTP ya está consumido en Caspio,
       así que no podemos volver a llamar a verify-checkin-code con ese PIN. */
    const cached = getCachedBooking(code);
    if(cached) return cached;
    /* No en caché → llamar al Worker (solo funciona si el PIN es el código alternativo) */
    const j = await wPost('verify-checkin-code', { bookingCode: code, pin });
    if(!j.booking) throw new Error('no booking data');
    setCachedBooking(code, j.booking);
    return j.booking;
  }

  /* Cargar booking data como admin (usando Auth token) */
  async function loadBookingDataAdmin(code){
    const url = WORKER + '?action=view&view=Vi_villas_and_bookings2021&where='
      + encodeURIComponent("TaBookings2021_FS_confirmation_code='" + code + "'");
    const r = await fetch(typeof Auth !== 'undefined' ? Auth.url(url) : url);
    const j = await r.json();
    if(!r.ok) throw new Error(j.error || 'Error ' + r.status);
    const rows = j.Result || j.result || j;
    if(!rows || !rows.length) throw new Error('booking not found');
    return rows[0];
  }

  /* ── Redirigir a checkin-online si no hay sesión y no es admin ── */
  function redirectToMain(code){
    const lang = _getLang();
    const txt  = CA_LANG[lang] || CA_LANG.en;
    const base = location.pathname.replace(/[^/]*$/, '') + CHECKIN_MAIN;
    const url  = code ? `${base}?reserva=${code}` : base;
    document.body.innerHTML = `
      <div style="display:flex;align-items:center;justify-content:center;min-height:100vh;padding:24px;font-family:Montserrat,sans-serif;text-align:center;">
        <div style="max-width:360px">
          <img src="logo-negro.png" alt="3Villas" style="height:80px;margin-bottom:24px;display:block;margin-left:auto;margin-right:auto"
               onerror="this.style.display='none'">
          <div style="font-size:40px;margin-bottom:16px">🔐</div>
          <p style="font-size:15px;font-weight:700;color:#212529;margin-bottom:8px">${txt.redirect_msg}</p>
          <a href="${url}" style="display:inline-block;margin-top:16px;padding:12px 28px;background:#C8102E;color:#fff;border-radius:10px;text-decoration:none;font-weight:800;font-size:14px">${txt.redirect_btn}</a>
        </div>
      </div>`;
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
        <div id="caLangWrap" style="position:absolute;top:12px;right:12px">
          <select id="caLangSel" onchange="CheckinAuth._setLang(this.value)" style="font-family:Montserrat,sans-serif;font-size:11px;font-weight:700;border:1px solid #dee2e6;border-radius:8px;padding:4px 8px;background:#fff;color:#495057;cursor:pointer;outline:none;appearance:none;-webkit-appearance:none;padding-right:6px">
            <option value="en">🌐 EN</option>
            <option value="es">ES</option>
            <option value="fr">FR</option>
            <option value="de">DE</option>
            <option value="it">IT</option>
            <option value="nl">NL</option>
            <option value="pt">PT</option>
            <option value="ca">CA</option>
          </select>
        </div>
        <div id="caStepEmail">
          <div class="ca-title" data-ca-i18n="title_email">Check-in Online</div>
          <div class="ca-sub" id="caEmailSub" data-ca-i18n="sub_email">Enter the email address you used when booking to receive your access code.</div>
          <div class="ca-err" id="caErrEmail"></div>
          <label class="ca-lbl" data-ca-i18n="lbl_email">Email address</label>
          <input class="ca-inp" id="caEmail" type="email" data-ca-ph="ph_email" placeholder="your@email.com" autocomplete="email">
          <div id="caNoEmailWrap" style="display:none;margin-bottom:12px">
            <label style="display:flex;align-items:flex-start;gap:8px;cursor:pointer;font-size:12px;color:#868e96;line-height:1.4">
              <input type="checkbox" id="caNoEmail" onchange="CheckinAuth._toggleNoEmail()" style="margin-top:2px;flex-shrink:0">
              <span id="caNoEmailLbl" data-ca-i18n="no_email_check">I don't have access to the booking email</span>
            </label>
          </div>
          <button class="ca-btn" id="caBtnEmail" onclick="CheckinAuth._send()">Send access code</button>
          <div class="ca-contact">
            <span data-ca-i18n="need_help">Need help?</span>
            <a href="https://api.whatsapp.com/send?phone=34659933434" target="_blank">WhatsApp</a>
            &middot; <a href="mailto:bookings@3villas.com">bookings@3villas.com</a>
          </div>
        </div>
        <div id="caStepPin" style="display:none">
          <div class="ca-title" data-ca-i18n="title_pin">Check your email</div>
          <div class="ca-sub" id="caPinSub"></div>
          <div class="ca-err" id="caErrPin"></div>
          <label class="ca-lbl" data-ca-i18n="lbl_pin">Access code</label>
          <input class="ca-inp pin" id="caPin" type="text" inputmode="numeric"
                 maxlength="30" data-ca-ph="ph_pin" placeholder="&middot; &middot; &middot; &middot; &middot;" autocomplete="one-time-code">
          <button class="ca-btn" id="caBtnPin" onclick="CheckinAuth._verify()">Verify code</button>
          <div class="ca-att" id="caAtt"></div>
          <button class="ca-back" id="caBack" onclick="CheckinAuth._back()">&#8592; Try a different email</button>
          <div class="ca-contact">
            <span data-ca-i18n="no_email">Didn't receive it? Check spam or contact us at</span>
            <a href="https://api.whatsapp.com/send?phone=34659933434" target="_blank">+34 659 93 34 34</a>
          </div>
        </div>
        <div id="caStepOk" style="display:none">
          <div class="ca-ok">
            <span class="ca-ok-ico">&#x2705;</span>
            <div data-ca-i18n="verified" style="font-family:Montserrat,sans-serif;font-weight:800;font-size:16px;color:#16a34a">Verified!</div>
            <div data-ca-i18n="loading" style="font-size:13px;color:#868e96;margin-top:4px">Loading your check-in&#8230;</div>
          </div>
        </div>
      </div>`;
    document.body.appendChild(d);
    document.getElementById('caEmail').addEventListener('keydown', e => { if(e.key==='Enter') CheckinAuth._send(); });
    document.getElementById('caPin').addEventListener('keydown',  e => { if(e.key==='Enter') CheckinAuth._verify(); });
    /* Inicializar selector de idioma con el idioma actual */
    var _lsel = document.getElementById('caLangSel');
    if(_lsel) _lsel.value = _getLang();
    _applyOverlayTexts();
    document.getElementById('caBtnEmail').textContent = _t('btn_email');
    document.getElementById('caBtnPin').textContent   = _t('btn_pin');
    document.getElementById('caBack').textContent     = _t('back');

    fetch(`${WORKER}?action=checkin-hint&code=${encodeURIComponent(_code)}`)
      .then(r => r.ok ? r.json() : null)
      .then(j => {
        if(!j) {
          /* Sin respuesta del Worker — mostrar checkbox por si acaso */
          const nw = document.getElementById('caNoEmailWrap');
          if(nw) nw.style.display = 'block';
          return;
        }
        /* Mostrar checkbox "no tengo email":
           - Worker v40: hasEmail===false
           - Worker v39 (fallback): hint está vacío */
        const noEmailWrap = document.getElementById('caNoEmailWrap');
        if(noEmailWrap && (j.hasEmail === false || !j.hint)){
          noEmailWrap.style.display = 'block';
          _applyOverlayTexts(); /* traducir el checkbox al idioma actual */
        }
        if(!j.hint) return;
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
    b.innerHTML = on ? `<span class="ca-sp"></span>${txt||'Please wait\u2026'}` : b._orig;
  }

  let _code='', _email='', _att=0, _cb=null;

  let _noEmailMode = false;

  function _toggleNoEmail(){
    _noEmailMode = document.getElementById('caNoEmail').checked;
    if(_noEmailMode){
      /* Ir directamente al paso PIN con el label de código especial */
      const lbl = document.querySelector('#caStepPin .ca-lbl');
      if(lbl) lbl.textContent = _t('lbl_alt_code');
      document.getElementById('caPinSub').textContent = _t('no_email_hint');
      step('Pin');
    } else {
      /* Volver al paso Email */
      step('Email');
    }
  }

  async function send(){
    noErr('caErrEmail');
    /* Modo sin email: saltar directamente al paso PIN */
    if(_noEmailMode){
      document.getElementById('caPinSub').textContent = _t('no_email_hint');
      const lbl = document.querySelector('#caStepPin .ca-lbl');
      if(lbl) lbl.textContent = _t('lbl_alt_code');
      step('Pin');
      return;
    }
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

  function _startLockoutTimer(secs){
    const btn = document.getElementById('caBtnPin');
    const inp = document.getElementById('caPin');
    if(btn) btn.disabled = true;
    if(inp) inp.disabled = true;
    const end = Date.now() + secs * 1000;
    const tick = setInterval(() => {
      const left = Math.max(0, Math.ceil((end - Date.now()) / 1000));
      const mins = Math.ceil(left / 60);
      if(left <= 0){
        clearInterval(tick);
        if(btn){ btn.disabled = false; btn.textContent = _t('btn_pin'); }
        if(inp){ inp.disabled = false; inp.value = ''; }
        noErr('caErrPin');
        document.getElementById('caAtt').textContent = '';
      } else {
        err('caErrPin', _t('err_locked',{mins:String(mins),s:mins!==1?'s':''}));
      }
    }, 1000);
  }

  async function verify(){
    noErr('caErrPin');
    const rawPin = (document.getElementById('caPin').value||'').trim();
    /* En modo sin email el código alternativo puede tener cualquier longitud */
    const pin = _noEmailMode ? rawPin : rawPin.replace(/\D/g,'');
    if(pin.length < 4){ err('caErrPin',_t('err_code')); return; }
    busy('caBtnPin', true, _t('verifying'));
    try {
      const j = await wPost('verify-checkin-code', { bookingCode:_code, pin });
      step('Ok');
      setSession(_code, pin);
      /* Guardar booking en sessionStorage para que loadBookingData lo use sin llamar al Worker */
      try{ sessionStorage.setItem('3v_booking_cache', JSON.stringify({code:_code, booking:j.booking})); }catch(e){}
      setTimeout(() => {
        document.getElementById('caOverlay').remove();
        if(_cb) _cb(j.booking);
      }, 700);
    } catch(e){
      /* El Worker puede devolver locked=true con remainingSeconds */
      let data = {};
      try { data = JSON.parse(e.message); } catch(pe) { data = { message: e.message }; }
      if(data.locked && data.remainingSeconds){
        busy('caBtnPin', false);
        _startLockoutTimer(data.remainingSeconds);
        return;
      }
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

      /* ── MODO ADMIN/MANAGER: Auth del sistema interno → carga directa por code de la URL ── */
      if(isAdmin()){
        if(!_code){
          /* Admin sin code en URL: mostrar mensaje */
          document.body.innerHTML = '<div style="text-align:center;padding:60px 20px;font-family:Montserrat,sans-serif">' +
            '<p style="color:#C8102E;font-weight:800">No booking code in URL</p>' +
            '<p style="font-size:13px;color:#868e96;margin-top:8px">Add ?reserva=CODE to the URL</p></div>';
          return;
        }
        /* Admin con code: cargar datos directamente via Auth */
        const go = () => {
          loadBookingDataAdmin(_code)
            .then(booking => { if(_cb) _cb(booking); })
            .catch(e => {
              document.body.innerHTML = '<div style="text-align:center;padding:60px 20px;font-family:Montserrat,sans-serif">' +
                '<p style="color:#C8102E;font-weight:800">Error loading booking</p>' +
                '<p style="font-size:13px;color:#868e96;margin-top:8px">' + e.message + '</p></div>';
            });
        };
        document.readyState === 'loading'
          ? document.addEventListener('DOMContentLoaded', go)
          : go();
        return;
      }

      /* ── MODO HUÉSPED ── */

      /* Página principal (checkin-online): necesita code en URL.
         Cubre tanto /checkin-online.html como /checkin-online (sin extensión). */
      const isMainPage = /checkin-online(\.html)?(\?|#|$)/.test(location.href);

      if(isMainPage){
        /* Sin code → error */
        if(!_code){
          document.body.innerHTML = '<div style="text-align:center;padding:60px 20px;font-family:Montserrat,sans-serif">' +
            '<p style="color:#C8102E;font-weight:800">No booking code in URL</p>' +
            '<p style="font-size:13px;color:#868e96;margin-top:8px">Add ?reserva=CODE to the URL</p></div>';
          return;
        }
        /* Con code: ver si hay sesión válida para este code */
        const sess = getSession(_code);
        if(sess){
          /* Sesión válida → cargar datos directamente SIN llamar al Worker de nuevo */
          const go = () => {
            loadBookingData(_code, sess.pin)
              .then(booking => { if(_cb) _cb(booking); })
              .catch(() => {
                /* Sesión caducada o inválida → pedir verificación de nuevo */
                localStorage.removeItem(SESSION_KEY); try{sessionStorage.removeItem('3v_booking_cache');}catch(e){}
                inject();
              });
          };
          document.readyState === 'loading'
            ? document.addEventListener('DOMContentLoaded', go)
            : go();
        } else {
          /* Sin sesión → overlay de verificación */
          const go = () => inject();
          document.readyState === 'loading'
            ? document.addEventListener('DOMContentLoaded', go)
            : go();
        }
        return;
      }

      /* Páginas hijas (arrival, police, deposit, taxes, premium):
         v7: el code de la URL manda. Si hay sesión válida PARA ESE code → carga directa.
         Si no la hay (no hay sesión, o la sesión es de OTRA reserva porque el code cambió),
         se muestra el overlay de verificación con el code de la URL para hacer login de la
         nueva reserva y cargar sus datos. Si la URL no trae code, se usa el de la sesión. */

      /* Si la URL no trae code, intentar reutilizar el de la sesión existente */
      if(!_code){
        const anySess = getSession(null);
        if(anySess) _code = anySess.code;
      }

      /* Sin code de ninguna forma → redirigir a checkin-online */
      if(!_code){
        const go = () => redirectToMain('');
        document.readyState === 'loading'
          ? document.addEventListener('DOMContentLoaded', go)
          : go();
        return;
      }

      /* ¿Hay sesión válida para ESTE code concreto? */
      const sess = getSession(_code);
      if(sess){
        /* Sesión válida para el code de la URL → cargar datos frescos del Worker */
        const go = () => {
          loadBookingData(_code, sess.pin)
            .then(booking => { if(_cb) _cb(booking); })
            .catch(() => {
              /* Sesión caducada/ inválida → pedir verificación de nuevo */
              localStorage.removeItem(SESSION_KEY); try{sessionStorage.removeItem('3v_booking_cache');}catch(e){}
              inject();
            });
        };
        document.readyState === 'loading'
          ? document.addEventListener('DOMContentLoaded', go)
          : go();
      } else {
        /* No hay sesión para este code (code cambiado o sin sesión) → overlay de login
           con el code de la URL; al verificar, onVerified carga la nueva reserva */
        const go = () => inject();
        document.readyState === 'loading'
          ? document.addEventListener('DOMContentLoaded', go)
          : go();
      }
    },

    _send:   () => send(),
    _verify: () => verify(),
    _back:   () => back(),
    _toggleNoEmail: () => _toggleNoEmail(),
    _setLang: (l) => _setLang(l),
    _refreshLang: () => { if(document.getElementById('caOverlay')) _refreshOverlay(); },

    getCode:    () => _code,
    getBooking: () => null,
    isVerified: () => !!getSession(null),
  };

})();
