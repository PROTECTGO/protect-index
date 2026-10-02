/* ============================================================
   GABI · pg-destellos.js v1 — lo personal, a la vista.  2-oct-2026.

   Qué hace:
   - Al abrir cualquier herramienta, busca en el muro lo que es SOLO
     para esa persona (área 'personal': felicitaciones del robot,
     consejos del mes y mensajes de Andrés) y que todavía no ha leído.
   - Si hay algo, lo pinta en una tarjeta destacada arriba a la
     derecha (a lo ancho arriba en teléfono). No bloquea la pantalla:
     se puede seguir trabajando.
   - Foto grande de la persona con un anillo de color: mint si es
     felicitación, ámbar #D9A520 si es consejo, blanco si es mensaje
     de Andrés. En los mensajes de Andrés va además su sello chico
     ("Mensaje de Andrés").
   - "Leído" lo marca leído (marcar_novedad_leida, ya existe) y no
     vuelve nunca. "Después" lo esconde solo en esta pestaña: al abrir
     otra herramienta vuelve. No se jubila hasta que la persona diga
     que lo leyó.
   - Si hay varios, de a uno, el más viejo primero, con "1 de 3".

   Reglas:
   - Lo que llega ya viene filtrado por la base (novedades_muro: solo
     lo de esa persona). Este archivo solo pinta.
   - No sale sin sesión, a cuentas externas, en "ver como", en
     recuperar ni en la firma. Nunca rompe la página.
   - Nada en localStorage ni sessionStorage: "Después" vive en memoria.
   - Todo texto de la base va con textContent; fotos solo por https.

   Cómo llega: pg-novedades.js v4.8 lo carga en las 29 herramientas
   que cargan ese archivo; Mi Proceso (gabi-asesor.html v19) lo trae
   con su <script>. Candado __pgDestellosListo: una sola copia.
   ============================================================ */
(function (global) {
  'use strict';
  if (global.__pgDestellosListo) return;
  global.__pgDestellosListo = true;

  var URL_SB = 'https://hivpqsepwsfmafamxkzy.supabase.co';
  var KEY_SB = 'sb_publishable_Kak00GbGVt2K3yGh6IBZvw_99IybVvt';
  var EXTERNOS = ['gerencia@leonis-go.com', 'quoteautocomercial@gmail.com'];
  var SIN = /^(recuperar\.html|firma-protectgo\.html)$/i;
  var MINT = '#2DBFA3', AMBAR = '#D9A520', BLANCO = '#FFFFFF', PISTA = '#35566A';
  var SELLO_ANDRES = ['fotos/andres.salcedo-v2.jpg', 'fotos/logo-protectgo.png'];

  var cola = [];            // novedades personales sin leer, la más vieja primero
  var despues = {};         // ids escondidos en esta pestaña (memoria, no storage)
  var cli = null;

  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = String(txt);
    return e;
  }
  function fotoOk(u) { return /^https:\/\/[^"'()\s]+$/.test(String(u || '')); }
  function iniciales(n) {
    var p = String(n || '').trim().split(/\s+/);
    return (((p[0] || '').charAt(0)) + ((p[1] || '').charAt(0))).toUpperCase() || '·';
  }
  function pagina() { try { return global.location.pathname.split('/').pop() || 'index.html'; } catch (e) { return ''; } }
  function esDeAndres(n) {
    return /^Mensaje de Andr[eé]s/i.test(String(n.logro || '')) || /—\s*Andr[eé]s\s*$/.test(String(n.cuerpo || ''));
  }
  function clase(n) {
    if (esDeAndres(n)) return 'andres';
    if (n.tipo === 'consejo') return 'consejo';
    if (n.tipo === 'felicitacion') return 'felic';
    return 'andres';
  }

  function estilos() {
    if (document.getElementById('pgdestellos-css')) return;
    var st = document.createElement('style');
    st.id = 'pgdestellos-css';
    st.textContent =
      '#pgDestello{position:fixed;top:72px;right:20px;width:380px;max-width:calc(100vw - 40px);z-index:99992;' +
        'background:#0D3040;color:#fff;border-radius:18px;border:1px solid rgba(255,255,255,.12);' +
        'box-shadow:0 18px 48px rgba(13,48,64,.38),0 2px 8px rgba(13,48,64,.2);' +
        'font:500 13px/1.45 Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;' +
        'opacity:0;transform:translateY(-10px);transition:opacity .35s ease,transform .35s ease;overflow:hidden;}' +
      '#pgDestello.in{opacity:1;transform:translateY(0);}' +
      '#pgDestello .pgd-barra{height:4px;}' +
      '#pgDestello.felic .pgd-barra{background:' + MINT + ';}' +
      '#pgDestello.consejo .pgd-barra{background:' + AMBAR + ';}' +
      '#pgDestello.andres .pgd-barra{background:linear-gradient(90deg,' + MINT + ',' + AMBAR + ');}' +
      '#pgDestello .pgd-in{padding:14px 16px 14px;}' +
      '#pgDestello .pgd-cab{display:flex;align-items:center;gap:8px;margin-bottom:12px;}' +
      '#pgDestello .pgd-k{font:800 9.5px/1.2 Montserrat,Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;}' +
      '#pgDestello.felic .pgd-k{color:' + MINT + ';}' +
      '#pgDestello.consejo .pgd-k{color:' + AMBAR + ';}' +
      '#pgDestello.andres .pgd-k{color:#fff;}' +
      '#pgDestello .pgd-n{margin-left:auto;font:700 10.5px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#7E95A4;}' +
      '#pgDestello .pgd-x{background:none;border:0;color:#9FB2BF;font:600 18px/1 Inter,system-ui,sans-serif;cursor:pointer;padding:0 0 0 6px;}' +
      '#pgDestello .pgd-x:hover{color:#fff;}' +
      '#pgDestello .pgd-cuerpo{display:flex;gap:14px;align-items:flex-start;}' +
      '#pgDestello .pgd-foto{position:relative;flex:0 0 60px;width:60px;height:60px;}' +
      '#pgDestello .pgd-cara{width:60px;height:60px;border-radius:50%;background:' + PISTA + ' center/cover no-repeat;' +
        'display:flex;align-items:center;justify-content:center;font:800 18px/1 Inter,system-ui,sans-serif;color:#fff;}' +
      '#pgDestello.felic .pgd-cara{box-shadow:0 0 0 3px #0D3040,0 0 0 5.5px ' + MINT + ';}' +
      '#pgDestello.consejo .pgd-cara{box-shadow:0 0 0 3px #0D3040,0 0 0 5.5px ' + AMBAR + ';}' +
      '#pgDestello.andres .pgd-cara{box-shadow:0 0 0 3px #0D3040,0 0 0 5.5px ' + BLANCO + ';}' +
      '#pgDestello .pgd-sello{position:absolute;right:-6px;bottom:-6px;width:26px;height:26px;border-radius:50%;' +
        'background:#fff center/cover no-repeat;box-shadow:0 0 0 2.5px #0D3040;}' +
      '#pgDestello .pgd-txt{min-width:0;flex:1;}' +
      '#pgDestello .pgd-t{font:800 15.5px/1.25 Montserrat,Inter,system-ui,sans-serif;margin:2px 0 6px;letter-spacing:-.005em;}' +
      '#pgDestello .pgd-p{color:#DCE6EC;white-space:pre-line;max-height:38vh;overflow:auto;overscroll-behavior:contain;padding-right:2px;}' +
      '#pgDestello .pgd-firma{display:inline-flex;align-items:center;gap:6px;margin-top:8px;font:700 10.5px/1 Inter,system-ui,sans-serif;' +
        'letter-spacing:.06em;text-transform:uppercase;color:#9FB2BF;}' +
      '#pgDestello .pgd-acc{display:flex;gap:8px;justify-content:flex-end;margin-top:14px;}' +
      '#pgDestello .pgd-b{border:0;border-radius:999px;padding:9px 16px;font:700 12.5px/1 Inter,system-ui,sans-serif;cursor:pointer;' +
        '-webkit-tap-highlight-color:transparent;}' +
      '#pgDestello .pgd-b.si{background:' + MINT + ';color:#0D3040;}' +
      '#pgDestello .pgd-b.si:hover{background:#3FD4B7;}' +
      '#pgDestello .pgd-b.no{background:transparent;color:#C9D6DE;box-shadow:inset 0 0 0 1px rgba(255,255,255,.22);}' +
      '#pgDestello .pgd-b.no:hover{color:#fff;box-shadow:inset 0 0 0 1px rgba(255,255,255,.45);}' +
      '#pgDestello .pgd-b:focus-visible,#pgDestello .pgd-x:focus-visible{outline:2px solid ' + MINT + ';outline-offset:2px;}' +
      '@media (max-width:640px){#pgDestello{top:10px;left:10px;right:10px;width:auto;max-width:none;}' +
        '#pgDestello .pgd-p{max-height:34vh;}}' +
      '@media (prefers-reduced-motion:reduce){#pgDestello{transition:none;}}' +
      '@media print{#pgDestello{display:none!important;}}';
    (document.head || document.documentElement).appendChild(st);
  }

  function siguiente() {
    for (var i = 0; i < cola.length; i++) { if (!despues[cola[i].id]) return i; }
    return -1;
  }

  function quitar() {
    var t = document.getElementById('pgDestello');
    if (t) t.remove();
  }

  function pintar() {
    quitar();
    var i = siguiente();
    if (i < 0) return;
    var n = cola[i];
    var pend = cola.filter(function (x) { return !despues[x.id]; });
    var pos = pend.indexOf(n) + 1;
    estilos();

    var c = clase(n);
    var t = el('section', c); t.id = 'pgDestello';
    t.setAttribute('role', 'dialog');
    t.setAttribute('aria-live', 'polite');
    t.setAttribute('aria-label', n.titulo || 'Para ti');
    t.appendChild(el('div', 'pgd-barra'));
    var inn = el('div', 'pgd-in');

    var cab = el('div', 'pgd-cab');
    var k = c === 'andres' ? 'Mensaje de Andrés · solo para ti'
          : (c === 'consejo' ? 'Para seguir · solo para ti' : 'Tu mes · solo para ti');
    cab.appendChild(el('span', 'pgd-k', k));
    if (pend.length > 1) cab.appendChild(el('span', 'pgd-n', pos + ' de ' + pend.length));
    var x = el('button', 'pgd-x', '×'); x.type = 'button'; x.title = 'Después'; x.setAttribute('aria-label', 'Ver después');
    x.addEventListener('click', function () { despues[n.id] = true; pintar(); });
    if (pend.length <= 1) x.style.marginLeft = 'auto';
    cab.appendChild(x);
    inn.appendChild(cab);

    var cuerpo = el('div', 'pgd-cuerpo');
    var foto = el('div', 'pgd-foto');
    var cara = el('div', 'pgd-cara');
    var persona = (Array.isArray(n.personas) && n.personas[0]) || {};
    var url = fotoOk(n.imagen_url) ? n.imagen_url : (fotoOk(persona.foto_url) ? persona.foto_url : '');
    if (url) cara.style.backgroundImage = 'url("' + url + '")';
    else cara.textContent = iniciales(persona.nombre || '');
    foto.appendChild(cara);
    if (c === 'andres') {
      var sello = el('span', 'pgd-sello'); sello.title = 'Mensaje de Andrés';
      // el sello prueba la foto de Andrés y, si no existe, usa el logo
      (function probar(j) {
        if (j >= SELLO_ANDRES.length) return;
        var im = new Image();
        im.onload = function () { sello.style.backgroundImage = 'url("' + SELLO_ANDRES[j] + '")'; if (/logo/.test(SELLO_ANDRES[j])) sello.style.backgroundSize = '78% auto'; };
        im.onerror = function () { probar(j + 1); };
        im.src = SELLO_ANDRES[j];
      })(0);
      foto.appendChild(sello);
    }
    cuerpo.appendChild(foto);

    var txt = el('div', 'pgd-txt');
    txt.appendChild(el('div', 'pgd-t', n.titulo || ''));
    txt.appendChild(el('div', 'pgd-p', n.cuerpo || ''));
    if (n.logro && c === 'felic') txt.appendChild(el('div', 'pgd-firma', n.logro));
    cuerpo.appendChild(txt);
    inn.appendChild(cuerpo);

    var acc = el('div', 'pgd-acc');
    var no = el('button', 'pgd-b no', 'Después'); no.type = 'button';
    no.addEventListener('click', function () { despues[n.id] = true; pintar(); });
    var si = el('button', 'pgd-b si', 'Leído'); si.type = 'button';
    si.addEventListener('click', function () {
      si.disabled = true; no.disabled = true;
      var listo = function () { cola = cola.filter(function (q) { return q.id !== n.id; }); pintar(); };
      try {
        cli.schema('portal').rpc('marcar_novedad_leida', { p_novedad_id: n.id }).then(listo, listo);
      } catch (e) { listo(); }
    });
    acc.appendChild(no); acc.appendChild(si);
    inn.appendChild(acc);

    t.appendChild(inn);
    document.body.appendChild(t);
    var entrar = function () { t.classList.add('in'); };
    try { requestAnimationFrame(function () { requestAnimationFrame(entrar); }); } catch (e) { entrar(); }
    setTimeout(entrar, 150);
  }

  function cliente() {
    try { if (typeof global.pgSB === 'function') { var c = global.pgSB(); if (c) return c; } } catch (e) {}
    try { if (typeof global.pgNovedadesCliente === 'function') { var c2 = global.pgNovedadesCliente(); if (c2) return c2; } } catch (e) {}
    if (!(global.supabase && global.supabase.createClient)) return null;
    try { return global.supabase.createClient(URL_SB, KEY_SB); } catch (e) { return null; }
  }

  function arrancar() {
    if (SIN.test(pagina())) return;
    try { if (new URLSearchParams(global.location.search).get('ver_como')) return; } catch (e) {}
    cli = cliente();
    if (!cli) return;
    cli.auth.getSession().then(function (r) {
      var s = r && r.data && r.data.session;
      if (!s || !s.user) return;
      if (EXTERNOS.indexOf(String(s.user.email || '').toLowerCase()) >= 0) return;
      cli.schema('portal').rpc('novedades_muro', { p_limite: 60 }).then(function (res) {
        if (!res || res.error || !Array.isArray(res.data)) return;
        cola = res.data.filter(function (n) { return n && n.area === 'personal' && !n.leida; })
                       .sort(function (a, b) { return String(a.created_at).localeCompare(String(b.created_at)); });
        if (cola.length) { try { pintar(); } catch (e) {} }
      }, function () {});
    }, function () {});
  }

  var intentos = 0;
  function esperar() {
    if (global.supabase && global.supabase.createClient) { arrancar(); return; }
    if (++intentos > 40) return;
    setTimeout(esperar, 250);
  }
  /* un respiro para que la herramienta pinte primero y el bloqueo de novedades (si hay) salga antes */
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(esperar, 900); });
  else setTimeout(esperar, 900);
})(window);
