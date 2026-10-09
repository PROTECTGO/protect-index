/* ============================================================
   GABI · pg-samu.js v1.1 — la carita de SAMU que acompaña SOLO a quien
   tiene puesto de SAMU (el mentor de riesgo en ChatGPT).  9-oct-2026.

   Pieza hermana de pg-bonos.js (lo carga pg-bonos.js al final): mismo
   estilo (IIFE, candado global, cliente compartido, CSS inyectado con id,
   todo texto de la base con textContent, nunca rompe la página).

   Qué pinta (todo sale de portal.samu_mio(); si devuelve null, NADA):
   1. La pastilla "SAMU n" con la carita, justo antes de la de bonos
      (o de "Salir"; si no hay ninguna, fija arriba a la derecha).
      Un toque abre el panel: mi semana, top 3, qué me falta, Abrir SAMU.
      Brilla con un destello cuando hay usos nuevos desde la última vez
      que abrió el panel (portal.samu_panel_visto lo marca).
   2. index.html: la tarjeta "SAMU · tu mentor de riesgo" entre el saludo
      y las herramientas.
   3. gabi-asesor.html: la tarjeta "Mi SAMU" arriba de "Mi actividad".
   4. quick-quote.html: el botón "Analizar con SAMU" — copia la Quick
      Quote como texto (sin datos sensibles) y abre SAMU en otra pestaña.

   Reglas:
   - Sin sesión, cuenta externa, recuperar/firma, sin puesto o error: nada.
   - ?ver_como=correo → samu_mio(p_nombre) (la base solo lo deja a
     dirección) y en ese modo no se marca nada como visto.
   - Nada en localStorage ni sessionStorage. Sin dato: "—".
   - Cero gráficas de barras. Ámbar #D9A520.
   - API: window.pgSamuDatos y el evento 'pg-samu' en document.
   v1.1 (9-oct): en teléfono (≤640 px) la carita sale como burbuja flotante
   abajo a la derecha (no se mete al encabezado, que ya va lleno), y dirección
   ve el enlace "Pulso del equipo →" (portal.samu_soy_direccion).
   ============================================================ */
(function (global) {
  'use strict';
  if (global.__pgSamuListo) return;
  global.__pgSamuListo = true;

  /* la carpeta de este archivo (sirve igual en / y en /amazon-relay/) */
  var SRC = '';
  try { SRC = (document.currentScript && document.currentScript.src) || ''; } catch (e) {}
  if (!SRC) { try { var ss = document.querySelectorAll('script[src*="pg-samu.js"]'); if (ss.length) SRC = ss[ss.length - 1].src; } catch (e) {} }
  var BASE = SRC ? SRC.replace(/pg-samu\.js(\?.*)?$/, '') : '';
  var AVATAR = BASE + 'fotos/samu-avatar.png';

  var URL_SB   = 'https://hivpqsepwsfmafamxkzy.supabase.co';
  var KEY_SB   = 'sb_publishable_Kak00GbGVt2K3yGh6IBZvw_99IybVvt';
  var EXTERNOS = ['gerencia@leonis-go.com', 'quoteautocomercial@gmail.com'];
  var SIN_PINTAR = /^(recuperar\.html|firma-protectgo\.html|samu-pulso\.html)$/i;
  var GPT_URL  = 'https://chatgpt.com/g/g-6a55026171108191ad44ae49bf10cc4a-samu-mentor-de-riesgo-protectgo';
  var MINT = '#2DBFA3', MINT_DEEP = '#1F9C84', AMBAR = '#D9A520', ROJO = '#E0614F', FONDO = '#0D3040', FONDO2 = '#0F4A52';
  var GRIS = '#7E95A4', GRIS_CLARO = '#9FB2BF';
  var REFRESCO_MS = 10 * 60 * 1000;
  var TIPOS = {
    analisis_riesgo: 'Análisis de riesgo', mercado: 'Mercado', mvr: 'MVR', dot_safer: 'DOT / SAFER',
    redaccion_uw: 'Redacción al UW', traduccion: 'Traducción', lectura_quote: 'Lectura de quote',
    guion_cliente: 'Guion al cliente', comercial: 'Comercial', aprendizaje: 'Aprendizaje',
    captura: 'Captura', otro: 'Otro'
  };

  var datos = null, ultimaCarga = 0, cont = null, abierto = false, cargando = false;
  var cliGlobal = null, verComoCorreo = '', vistoMarcado = false, esDireccion = false;

  function pagina() { try { return (global.location.pathname.split('/').pop() || 'index.html').toLowerCase(); } catch (e) { return ''; } }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = String(txt);
    return e;
  }
  function esNum(n) { return n !== null && n !== undefined && n !== '' && isFinite(Number(n)); }
  function num(n) { return esNum(n) ? String(Math.round(Number(n))) : '—'; }
  function primerNombre(n) { return String(n || '').trim().split(/\s+/)[0] || ''; }
  function gpt(d) { var u = String((d && d.gpt_url) || ''); return /^https:\/\/chatgpt\.com\//.test(u) ? u : GPT_URL; }
  function cuando(ts) {
    if (!ts) return '—';
    var d = new Date(ts); if (isNaN(d)) return '—';
    var hoy = new Date(), ayer = new Date(); ayer.setDate(hoy.getDate() - 1);
    var h = d.toLocaleTimeString('es-CO', { hour: 'numeric', minute: '2-digit' }).replace(/\s?a\.?\s?m\.?/i, ' am').replace(/\s?p\.?\s?m\.?/i, ' pm');
    if (d.toDateString() === hoy.toDateString()) return 'hoy ' + h;
    if (d.toDateString() === ayer.toDateString()) return 'ayer ' + h;
    return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  }
  function mensaje(d) {
    var n = primerNombre(d.nombre), s = String(d.semaforo || '');
    if (s === 'verde') return 'Vas bien esta semana' + (n ? ', ' + n : '');
    if (s === 'ambar') return 'Úsalo en tu próxima cuenta' + (n ? ', ' + n : '');
    if (s === 'rojo') return esNum(d.dias_sin_uso) ? ('Llevas ' + num(d.dias_sin_uso) + ' días sin abrir SAMU') : 'Esta semana no has usado SAMU';
    if (s === 'gris') return 'Tu puesto lleva más de dos semanas quieto';
    return 'Arranca: tu primera cuenta con SAMU';
  }
  function consejo(d) {
    var top = Array.isArray(d.top3) ? d.top3 : [], yo = String(d.email || '').toLowerCase();
    if (!top.length) return 'Nadie ha arrancado esta semana. Tu próxima cuenta: "analiza el riesgo" + la Quick Quote, y quedas #1 de la semana.';
    if (top[0] && String(top[0].email || '').toLowerCase() === yo) return 'Vas #1 esta semana. Sostenlo: cada cuenta nueva, analízala con SAMU antes de someter.';
    var f = Number(d.falta_para_primero);
    var lider = primerNombre(top[0] && top[0].nombre);
    if (f > 0) return 'Te faltan ' + f + (f === 1 ? ' uso' : ' usos') + ' para alcanzar a ' + (lider || 'el #1') + '. Tu próxima cuenta: "analiza el riesgo" + Quick Quote.';
    return 'Tu próxima cuenta: "analiza el riesgo" + Quick Quote, y te metes en el top.';
  }

  /* ---------- estilos ---------- */
  function estilos() {
    if (document.getElementById('pgsamu-css')) return;
    var st = document.createElement('style');
    st.id = 'pgsamu-css';
    var F = 'Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
    var M = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
    var T = 'Montserrat,' + F;
    st.textContent =
      /* pastilla */
      '#pgSamu{position:relative;display:inline-block;flex:0 0 auto;vertical-align:middle;font:600 12.5px/1.2 ' + F + ';color:#fff;}' +
      '#pgSamu.pgs2-en-header{margin-right:10px;}' +
      '#pgSamu.pgs2-fijo{position:fixed;top:14px;z-index:99993;margin:0;}' +
      '#pgSamu.pgs2-abierto{z-index:99995;}' +
      '#pgSamu .pgs2-pill{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:7px;margin:0;cursor:pointer;background:linear-gradient(135deg,' + FONDO2 + ',' + FONDO + ');' +
        'color:#fff;border:1.5px solid ' + MINT + ';border-radius:999px;padding:3px 8px 3px 3px;font:800 10.5px/1 ' + T + ';letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;' +
        'box-shadow:0 6px 18px rgba(45,191,163,.28);transition:transform .15s ease,box-shadow .15s ease;}' +
      '#pgSamu .pgs2-pill:hover{transform:translateY(-1px);box-shadow:0 9px 24px rgba(45,191,163,.42);}' +
      '#pgSamu .pgs2-pill:focus-visible{outline:2px solid ' + MINT + ';outline-offset:3px;}' +
      '#pgSamu .pgs2-pill::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:38%;pointer-events:none;background:linear-gradient(100deg,rgba(255,255,255,0),rgba(255,255,255,.28),rgba(255,255,255,0));transform:skewX(-18deg);animation:pgs2Brillo 9s ease-in-out 2.4s infinite;}' +
      '@keyframes pgs2Brillo{0%{left:-60%}16%{left:130%}100%{left:130%}}' +
      '.pgs2-cara{display:block;border-radius:50%;background:#E8F7F3 center/cover no-repeat;flex:0 0 auto;}' +
      '#pgSamu .pgs2-pill .pgs2-cara{width:26px;height:26px;box-shadow:0 0 0 1.5px rgba(255,255,255,.5);}' +
      '#pgSamu .pgs2-n{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 5px;border-radius:999px;background:' + MINT + ';color:' + FONDO + ';font:800 10.5px/1 ' + M + ';letter-spacing:0;}' +
      '#pgSamu .pgs2-n.cero{background:rgba(255,255,255,.14);color:#fff;}' +
      '#pgSamu .pgs2-chispa{position:absolute;top:-1px;left:20px;font:700 11px/1 ' + F + ';color:' + AMBAR + ';text-shadow:0 0 6px rgba(217,165,32,.9);animation:pgs2Chispa 1.8s ease-in-out infinite;pointer-events:none;}' +
      '@keyframes pgs2Chispa{0%,100%{transform:scale(.7) rotate(0);opacity:.55}50%{transform:scale(1.25) rotate(25deg);opacity:1}}' +
      '#pgSamu.pgs2-nuevo .pgs2-pill{animation:pgs2Pulso 2.2s ease-in-out infinite;}' +
      '@keyframes pgs2Pulso{0%,100%{box-shadow:0 6px 18px rgba(45,191,163,.28)}50%{box-shadow:0 0 0 5px rgba(45,191,163,.22),0 8px 22px rgba(45,191,163,.45)}}' +
      /* panel */
      '#pgSamu .pgs2-panel{display:none;position:absolute;top:calc(100% + 10px);right:0;width:300px;max-width:calc(100vw - 20px);box-sizing:border-box;background:' + FONDO + ';color:#fff;border-radius:16px;' +
        'border:1px solid rgba(255,255,255,.07);box-shadow:0 18px 44px rgba(13,48,64,.38);text-align:left;text-transform:none;letter-spacing:0;overflow:hidden;}' +
      '#pgSamu.pgs2-abierto .pgs2-panel{display:block;animation:pgs2Entra .18s ease-out;}' +
      '@keyframes pgs2Entra{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}' +
      '#pgSamu .pgs2-cab{position:relative;display:flex;align-items:center;gap:11px;padding:14px 40px 13px 14px;background:linear-gradient(135deg,rgba(45,191,163,.18),rgba(45,191,163,0) 70%);border-bottom:1px solid #24404F;}' +
      '#pgSamu .pgs2-cab .pgs2-cara{width:42px;height:42px;box-shadow:0 0 0 2px ' + MINT + ';}' +
      '#pgSamu .pgs2-k{font:800 9px/1 ' + T + ';letter-spacing:.16em;text-transform:uppercase;color:' + MINT + ';}' +
      '#pgSamu .pgs2-big{font:800 19px/1.15 ' + M + ';margin-top:5px;}' +
      '#pgSamu .pgs2-x{position:absolute;top:9px;right:9px;background:rgba(255,255,255,.06);border:0;color:' + GRIS_CLARO + ';width:26px;height:26px;border-radius:50%;font:600 17px/26px ' + F + ';cursor:pointer;padding:0;}' +
      '#pgSamu .pgs2-x:hover{color:#fff;background:rgba(255,255,255,.12);}' +
      '#pgSamu .pgs2-top{list-style:none;margin:0;padding:10px 14px;border-bottom:1px solid #24404F;}' +
      '#pgSamu .pgs2-top li{display:flex;justify-content:space-between;gap:10px;padding:4px 0;font:700 12px/1.3 ' + F + ';}' +
      '#pgSamu .pgs2-top li.yo{color:' + MINT + ';}' +
      '#pgSamu .pgs2-top li b{font-family:' + M + ';color:' + MINT + ';}' +
      '#pgSamu .pgs2-top li.vacio{color:' + GRIS_CLARO + ';font-weight:600;}' +
      '#pgSamu .pgs2-msg{margin:12px 14px 0;padding:10px 11px;border-radius:10px;background:rgba(255,255,255,.06);font:600 11.5px/1.45 ' + F + ';color:#DDE8EE;}' +
      '#pgSamu .pgs2-pie{padding:12px 14px 14px;}' +
      '.pgs2-boton{display:block;text-align:center;background:' + MINT + ';color:' + FONDO + '!important;border-radius:10px;padding:10px 12px;font:800 12px/1 ' + T + ';letter-spacing:.03em;text-decoration:none!important;border:0;cursor:pointer;}' +
      '.pgs2-boton:hover{filter:brightness(1.06);}' +
      /* tarjeta del Index y de Mi proceso */
      '.pgs2-card{box-sizing:border-box;position:relative;overflow:hidden;background:radial-gradient(120% 140% at 100% 0%,rgba(45,191,163,.22),rgba(45,191,163,0) 55%),linear-gradient(135deg,' + FONDO2 + ',' + FONDO + ');' +
        'color:#fff;border:1.5px solid rgba(45,191,163,.55);border-radius:18px;padding:18px 18px 16px;box-shadow:0 10px 28px rgba(13,48,64,.18);font:500 13px/1.4 ' + F + ';}' +
      '.pgs2-card.pgs2-index{margin:18px auto 22px;}' +
      '.pgs2-card.pgs2-mp{margin-bottom:20px;}' +
      '.pgs2-r1{display:grid;grid-template-columns:auto 1fr auto;gap:14px;align-items:center;}' +
      '.pgs2-card .pgs2-cara{width:56px;height:56px;box-shadow:0 0 0 2.5px ' + MINT + ',0 0 0 6px rgba(45,191,163,.18);}' +
      '.pgs2-card .pgs2-k{font:800 9.5px/1 ' + T + ';letter-spacing:.16em;text-transform:uppercase;color:' + MINT + ';}' +
      '.pgs2-card h3{margin:6px 0 0;font:800 17px/1.2 ' + T + ';color:#fff;}' +
      '.pgs2-card .pgs2-num{text-align:right;}' +
      '.pgs2-card .pgs2-num b{display:block;font:800 26px/1 ' + M + ';color:' + MINT + ';}' +
      '.pgs2-card .pgs2-num small{display:block;font:600 11px/1.3 ' + F + ';color:' + GRIS_CLARO + ';margin-top:4px;}' +
      '.pgs2-chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:13px;}' +
      '.pgs2-chips span{background:rgba(255,255,255,.08);border-radius:999px;padding:4px 9px;font:700 11px/1.2 ' + F + ';color:#E6EEF2;}' +
      '.pgs2-chips span b{color:' + MINT + ';font-family:' + M + ';margin-left:4px;}' +
      '.pgs2-chips span.vacio{color:' + GRIS_CLARO + ';font-weight:600;}' +
      '.pgs2-r3{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:10px 14px;margin-top:13px;}' +
      '.pgs2-meta{font:600 11.5px/1.4 ' + F + ';color:' + GRIS_CLARO + ';min-width:0;}' +
      '.pgs2-meta b{color:#fff;font-weight:700;}' +
      '.pgs2-card .pgs2-boton{display:inline-block;padding:9px 14px;}' +
      '.pgs2-card .pgs2-msg2{margin-top:12px;padding:9px 11px;border-radius:10px;background:rgba(255,255,255,.06);font:600 11.5px/1.45 ' + F + ';color:#DDE8EE;}' +
      '.pgs2-sem{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:6px;vertical-align:middle;}' +
      /* botón de Quick Quote */
      '#pgSamuFab{position:fixed;right:18px;bottom:22px;z-index:99990;display:inline-flex;align-items:center;gap:9px;background:linear-gradient(135deg,' + FONDO2 + ',' + FONDO + ');color:#fff;border:1.5px solid ' + MINT + ';' +
        'border-radius:999px;padding:5px 16px 5px 5px;font:800 12px/1 ' + T + ';letter-spacing:.02em;cursor:pointer;box-shadow:0 10px 26px rgba(13,48,64,.35);}' +
      '#pgSamuFab .pgs2-cara{width:34px;height:34px;}' +
      '#pgSamuFab:hover{transform:translateY(-1px);}' +
      '#pgSamuAviso{position:fixed;right:18px;bottom:78px;z-index:99991;max-width:min(320px,calc(100vw - 36px));background:' + FONDO + ';color:#fff;border-radius:12px;padding:11px 13px;' +
        'font:600 12px/1.45 ' + F + ';box-shadow:0 12px 30px rgba(13,48,64,.4);border:1px solid rgba(45,191,163,.5);}' +
      '#pgSamuAviso b{color:' + MINT + ';}' +
      /* teléfono / 400 px */
      '@media (max-width:640px){' +
        '#pgSamu.pgs2-fijo{top:10px;}' +
        '#pgSamu .pgs2-pill{letter-spacing:.08em;}' +
        '#pgSamu .pgs2-panel{position:fixed;left:10px;right:10px;top:56px;width:auto;max-width:none;}' +
        '.pgs2-r1{grid-template-columns:auto 1fr;}' +
        '.pgs2-card .pgs2-num{grid-column:1 / -1;text-align:left;display:flex;align-items:baseline;gap:8px;}' +
        '.pgs2-card .pgs2-num b{display:inline;font-size:22px;}' +
        '.pgs2-card .pgs2-num small{display:inline;margin:0;}' +
        '.pgs2-card .pgs2-cara{width:46px;height:46px;}' +
        '.pgs2-card h3{font-size:15.5px;}' +
        '#pgSamuFab{right:12px;bottom:14px;}' +
      '}' +
      '#pgSamu.pgs2-movil{position:fixed;right:14px;bottom:16px;top:auto;z-index:99993;margin:0;}' +
      '#pgSamu.pgs2-movil .pgs2-pill{padding:3px;gap:0;border-width:2px;box-shadow:0 10px 26px rgba(13,48,64,.4);}' +
      '#pgSamu.pgs2-movil .pgs2-pill .pgs2-cara{width:44px;height:44px;}' +
      '#pgSamu.pgs2-movil .pgs2-lbl{display:none;}' +
      '#pgSamu.pgs2-movil .pgs2-n{position:absolute;top:-4px;right:-4px;box-shadow:0 0 0 2px ' + FONDO + ';}' +
      '#pgSamu.pgs2-movil .pgs2-n.cero{background:' + FONDO2 + ';color:#fff;}' +
      '#pgSamu.pgs2-movil .pgs2-pill{overflow:visible;}#pgSamu.pgs2-movil .pgs2-pill::after{display:none;}' +
      '#pgSamu.pgs2-movil .pgs2-chispa{left:2px;top:-6px;}' +
      '#pgSamu.pgs2-movil .pgs2-panel{position:fixed;left:10px;right:10px;top:auto;bottom:78px;width:auto;max-width:none;max-height:calc(100vh - 110px);overflow-y:auto;}' +
      '.pgs2-pulso{display:block;text-align:center;margin-top:9px;font:700 11.5px/1 ' + F + ';color:' + MINT + '!important;text-decoration:none!important;}' +
      '.pgs2-card .pgs2-pulso{display:inline-block;margin:0 12px 0 0;}' +
      'body.pgs2-con-burbuja #pgSamuFab{bottom:84px;}' +
      '@media (max-width:420px){#pgSamu .pgs2-lbl{display:none;}}' +
      '@media (prefers-reduced-motion:reduce){#pgSamu .pgs2-pill::after,#pgSamu .pgs2-chispa{animation:none;}#pgSamu.pgs2-nuevo .pgs2-pill{animation:none;}}' +
      '@media print{#pgSamu,#pgSamuFab,#pgSamuAviso,.pgs2-card{display:none!important;}}';
    (document.head || document.documentElement).appendChild(st);
  }

  function cara() { var c = el('span', 'pgs2-cara'); c.style.backgroundImage = 'url("' + AVATAR + '")'; c.setAttribute('aria-hidden', 'true'); return c; }
  function colorSem(s) { return s === 'verde' ? MINT : s === 'ambar' ? AMBAR : s === 'rojo' ? ROJO : s === 'gris' ? GRIS : '#8FD9C8'; }
  function abrirSamu(d) { try { global.open(gpt(d), '_blank', 'noopener'); } catch (e) {} }
  function botonSamu(d, txt) {
    var a = el('a', 'pgs2-boton', txt || 'Abrir SAMU →');
    a.href = gpt(d); a.target = '_blank'; a.rel = 'noopener';
    return a;
  }
  function chips(d) {
    var box = el('div', 'pgs2-chips');
    var pt = d.por_tipo && typeof d.por_tipo === 'object' ? d.por_tipo : {};
    var ks = Object.keys(pt).filter(function (k) { return k !== 'consulta' && Number(pt[k]) > 0; })
                 .sort(function (a, b) { return Number(pt[b]) - Number(pt[a]); });
    if (!ks.length) { box.appendChild(el('span', 'vacio', 'Esta semana todavía sin usos')); return box; }
    ks.slice(0, 5).forEach(function (k) { var s = el('span', null, TIPOS[k] || k); s.appendChild(el('b', null, num(pt[k]))); box.appendChild(s); });
    return box;
  }
  function metaLinea(d) {
    var m = el('div', 'pgs2-meta');
    var dot = el('span', 'pgs2-sem'); dot.style.background = colorSem(d.semaforo); m.appendChild(dot);
    m.appendChild(document.createTextNode('Puesto '));
    m.appendChild(el('b', null, esNum(d.puesto) ? (num(d.puesto) + ' de ' + num(d.total_puestos)) : '—'));
    m.appendChild(document.createTextNode(' · última vez '));
    m.appendChild(el('b', null, cuando(d.ultimo_uso)));
    if (Number(d.protocolo_semana) > 0) m.appendChild(document.createTextNode(' · ' + num(d.protocolo_semana) + (Number(d.protocolo_semana) === 1 ? ' caso con protocolo' : ' casos con protocolo')));
    return m;
  }

  function enlacePulso() {
    var a = el('a', 'pgs2-pulso', 'Pulso del equipo →');
    a.href = BASE + 'samu-pulso.html';
    return a;
  }

  /* ---------- 1. la pastilla + panel ---------- */
  function construirPanel(d) {
    var p = el('div', 'pgs2-panel'); p.id = 'pgSamuPanel'; p.setAttribute('role', 'dialog'); p.setAttribute('aria-label', 'Tu semana con SAMU');
    var cab = el('div', 'pgs2-cab');
    cab.appendChild(cara());
    var t = el('div'); t.appendChild(el('div', 'pgs2-k', 'Tu semana con SAMU'));
    var n = Number(d.usos_semana) || 0;
    t.appendChild(el('div', 'pgs2-big', esNum(d.usos_semana) ? (n + (n === 1 ? ' uso' : ' usos')) : '—'));
    cab.appendChild(t);
    var x = el('button', 'pgs2-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'Cerrar');
    x.addEventListener('click', function (e) { e.stopPropagation(); cerrar(true); });
    cab.appendChild(x);
    p.appendChild(cab);

    var ol = el('ol', 'pgs2-top');
    var top = Array.isArray(d.top3) ? d.top3 : [], yo = String(d.email || '').toLowerCase();
    if (!top.length) ol.appendChild(el('li', 'vacio', 'Top de la semana: — (nadie ha arrancado)'));
    top.forEach(function (r, i) {
      var esYo = String(r.email || '').toLowerCase() === yo;
      var li = el('li', esYo ? 'yo' : null);
      li.appendChild(el('span', null, (i + 1) + ' · ' + (r.nombre || '—') + (esYo ? ' (tú)' : '')));
      li.appendChild(el('b', null, num(r.usos)));
      ol.appendChild(li);
    });
    p.appendChild(ol);
    p.appendChild(el('div', 'pgs2-msg', consejo(d)));
    var pie = el('div', 'pgs2-pie'); pie.appendChild(botonSamu(d)); if (esDireccion && !verComoCorreo) pie.appendChild(enlacePulso()); p.appendChild(pie);
    return p;
  }
  function pintarPill(d) {
    var primera = !cont;
    if (primera) { cont = el('span'); cont.id = 'pgSamu'; }
    else while (cont.firstChild) cont.removeChild(cont.firstChild);
    var pill = el('button', 'pgs2-pill'); pill.type = 'button';
    pill.setAttribute('aria-expanded', abierto ? 'true' : 'false'); pill.setAttribute('aria-controls', 'pgSamuPanel');
    pill.title = 'SAMU · tu mentor de riesgo';
    pill.appendChild(cara());
    pill.appendChild(el('span', 'pgs2-lbl', 'SAMU'));
    var n = Number(d.usos_semana) || 0;
    pill.appendChild(el('span', 'pgs2-n' + (n ? '' : ' cero'), esNum(d.usos_semana) ? n : '—'));
    pill.addEventListener('click', function (e) { e.stopPropagation(); alternar(); });
    cont.appendChild(pill);
    if (d.hay_nuevo && !vistoMarcado) cont.appendChild(el('span', 'pgs2-chispa', '✦'));
    cont.classList.toggle('pgs2-nuevo', !!d.hay_nuevo && !vistoMarcado);
    cont.appendChild(construirPanel(d));
    cont.classList.toggle('pgs2-abierto', abierto);
    if (primera) (document.body || document.documentElement).appendChild(cont);
    ubicar();
  }
  function alternar() { if (abierto) cerrar(false); else abrir(); }
  function abrir() {
    if (!cont) return;
    abierto = true; cont.classList.add('pgs2-abierto');
    var b = cont.querySelector('.pgs2-pill'); if (b) b.setAttribute('aria-expanded', 'true');
    marcarVisto();
  }
  function cerrar(foco) {
    if (!cont) return;
    abierto = false; cont.classList.remove('pgs2-abierto');
    var b = cont.querySelector('.pgs2-pill');
    if (b) { b.setAttribute('aria-expanded', 'false'); if (foco) { try { b.focus(); } catch (e) {} } }
  }
  function marcarVisto() {
    if (vistoMarcado || verComoCorreo || !cliGlobal) return;
    vistoMarcado = true;
    try { cont.classList.remove('pgs2-nuevo'); var c = cont.querySelector('.pgs2-chispa'); if (c) c.parentNode.removeChild(c); } catch (e) {}
    try { cliGlobal.schema('portal').rpc('samu_panel_visto').then(function () {}, function () {}); } catch (e) {}
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && abierto) cerrar(true); });
  document.addEventListener('click', function (e) { if (abierto && cont && !cont.contains(e.target)) cerrar(false); });

  function visible(n) {
    try { var r = n.getBoundingClientRect(); if (!(r.width > 0 && r.height > 0)) return false;
      var cs = global.getComputedStyle(n); return cs.visibility !== 'hidden' && cs.display !== 'none'; } catch (e) { return false; }
  }
  function ancla() {
    var b = document.getElementById('pgBonos');
    if (b && b.classList.contains('pgb-en-header') && b.parentNode) return b;
    var lista = [], i, n;
    try {
      n = document.querySelectorAll('[data-act="logout"]'); for (i = 0; i < n.length; i++) lista.push(n[i]);
      n = document.querySelectorAll('button,a'); for (i = 0; i < n.length; i++) if ((n[i].textContent || '').trim() === 'Salir') lista.push(n[i]);
    } catch (e) {}
    for (i = 0; i < lista.length; i++) {
      var s = lista[i]; if (cont && cont.contains(s)) continue;
      if (visible(s) && s.getBoundingClientRect().top < 90) return s;
    }
    return null;
  }
  function ubicar() {
    try {
      if (!cont) return;
      var movil = global.innerWidth <= 640;
      cont.classList.toggle('pgs2-movil', movil);
      try { document.body.classList.toggle('pgs2-con-burbuja', movil); } catch (e) {}
      if (movil) {
        var cu = document.body || document.documentElement;
        if (cont.parentNode !== cu) cu.appendChild(cont);
        cont.classList.remove('pgs2-en-header', 'pgs2-fijo'); cont.style.right = '';
        /* encima del muelle de abajo (pg-sombra) si está visible */
        var mu = document.getElementById('pgMuelle'), abajo = 16;
        if (mu && visible(mu)) { var rm = mu.getBoundingClientRect(); if (rm.top > global.innerHeight / 2) abajo = Math.round(global.innerHeight - rm.top) + 10; }
        cont.style.bottom = abajo + 'px';
        var pn = cont.querySelector('.pgs2-panel'); if (pn) pn.style.bottom = (abajo + 62) + 'px';
        var fab = document.getElementById('pgSamuFab'); if (fab) fab.style.bottom = (abajo + 66) + 'px';
        return;
      }
      cont.style.bottom = ''; { var pn2 = cont.querySelector('.pgs2-panel'); if (pn2) pn2.style.bottom = ''; }
      var a = ancla();
      if (a && a.parentNode) {
        if (cont.nextSibling !== a || cont.parentNode !== a.parentNode) a.parentNode.insertBefore(cont, a);
        cont.classList.add('pgs2-en-header'); cont.classList.remove('pgs2-fijo'); cont.style.right = '';
      } else {
        var cuerpo = document.body || document.documentElement;
        if (cont.parentNode !== cuerpo) cuerpo.appendChild(cont);
        cont.classList.add('pgs2-fijo'); cont.classList.remove('pgs2-en-header');
        var b = document.getElementById('pgBonos'), der = 16;
        if (b && b.classList.contains('pgb-fijo') && visible(b)) der = Math.round(global.innerWidth - b.getBoundingClientRect().left) + 8;
        cont.style.right = der + 'px';
      }
    } catch (e) {}
  }

  /* ---------- 2. tarjeta del Index ---------- */
  function tarjeta(d, cls, titulo) {
    var c = el('section', 'pgs2-card ' + cls); c.id = cls === 'pgs2-index' ? 'pgSamuCard' : 'pgSamuMp';
    c.setAttribute('aria-label', 'SAMU, tu mentor de riesgo');
    var r1 = el('div', 'pgs2-r1');
    r1.appendChild(cara());
    var t = el('div'); t.appendChild(el('div', 'pgs2-k', titulo)); t.appendChild(el('h3', null, mensaje(d))); r1.appendChild(t);
    var nn = el('div', 'pgs2-num'); nn.appendChild(el('b', null, esNum(d.usos_semana) ? num(d.usos_semana) : '—')); nn.appendChild(el('small', null, 'usos esta semana'));
    r1.appendChild(nn);
    c.appendChild(r1);
    c.appendChild(chips(d));
    if (cls === 'pgs2-mp') c.appendChild(el('div', 'pgs2-msg2', consejo(d)));
    var r3 = el('div', 'pgs2-r3'); r3.appendChild(metaLinea(d));
    var acc = el('div'); if (esDireccion && !verComoCorreo) acc.appendChild(enlacePulso()); acc.appendChild(botonSamu(d)); r3.appendChild(acc); c.appendChild(r3);
    return c;
  }
  function pintarIndex(d) {
    if (pagina() !== 'index.html') return;
    var grid = document.querySelector('main.grid'); if (!grid || !grid.parentNode) return;
    var viejo = document.getElementById('pgSamuCard');
    var nueva = tarjeta(d, 'pgs2-index', 'SAMU · tu mentor de riesgo');
    if (viejo && viejo.parentNode) viejo.parentNode.replaceChild(nueva, viejo);
    else grid.parentNode.insertBefore(nueva, grid);
    medirIndex();
  }
  function medirIndex() {
    try {
      var c = document.getElementById('pgSamuCard'), g = document.querySelector('main.grid');
      if (!c || !g) return;
      var w = g.getBoundingClientRect().width, cs = global.getComputedStyle(g);
      var inner = w - (parseFloat(cs.paddingLeft) || 0) - (parseFloat(cs.paddingRight) || 0);
      if (inner > 200) c.style.maxWidth = Math.round(inner) + 'px';
      c.style.width = 'calc(100% - 32px)';
    } catch (e) {}
  }
  global.addEventListener('resize', function () { medirIndex(); ubicar(); });

  /* ---------- 3. Mi SAMU en Mi proceso ---------- */
  function pintarMiProceso(d) {
    if (pagina() !== 'gabi-asesor.html') return;
    var act = document.getElementById('act2-bloque');
    var caja = act && act.closest ? act.closest('.pg-card') : null;
    if (!caja || !caja.parentNode) return;
    var viejo = document.getElementById('pgSamuMp');
    var nueva = tarjeta(d, 'pgs2-mp', 'Mi SAMU');
    if (viejo && viejo.parentNode) viejo.parentNode.replaceChild(nueva, viejo);
    else caja.parentNode.insertBefore(nueva, caja);
  }

  /* ---------- 4. Analizar con SAMU (Quick Quote) ---------- */
  var SENSIBLE = /(ssn|social|d\.?o\.?b|birth|nacim|license\s*(#|no|num)|cdl\s*(#|no|num)|licen[cs]ia|tax\s*id|\bein\b|fein|itin|card|tarjeta|bank|banco|routing|account\s*(#|no|num)|password|contrase)/i;
  function etiqueta(c) {
    var l = c.querySelector('label'); return l ? String(l.textContent || '').replace(/\s+/g, ' ').trim() : '';
  }
  function valorCampo(c) {
    var vals = [];
    c.querySelectorAll('input,select,textarea').forEach(function (i) {
      if (i.type === 'hidden' || i.type === 'file' || i.type === 'password') return;
      if (i.type === 'checkbox' || i.type === 'radio') { if (i.checked) { var lb = i.closest('label'); vals.push(lb ? String(lb.textContent || '').trim() : (i.value || 'sí')); } return; }
      var v = i.tagName === 'SELECT' ? (i.selectedIndex >= 0 && i.value ? String(i.options[i.selectedIndex].text || '') : '') : String(i.value || '');
      v = v.replace(/\s+/g, ' ').trim(); if (v) vals.push(v);
    });
    return vals.join(', ');
  }
  function textoQuickQuote(d) {
    var L = [];
    L.push('Analiza el riesgo de esta Quick Quote (cadena completa).');
    L.push('Agente: ' + (primerNombre(d.nombre) || '—'));
    var kp = { 'Power units': 'kpiUnits', 'Drivers': 'kpiDrivers', 'Radius': 'kpiRadius', 'Years in business': 'kpiYears', 'Effective': 'kpiEffective' };
    Object.keys(kp).forEach(function (k) { var e = document.getElementById(kp[k]); var v = e ? String(e.textContent || '').trim() : ''; if (v && v !== '—') L.push(k + ': ' + v); });
    var secs = [['sec-account', 'Account'], ['sec-agency', 'Applicant'], ['sec-op', 'Operation'], ['sec-commodities', 'Commodities'], ['sec-cov', 'Coverages'], ['sec-losses', 'Losses']];
    secs.forEach(function (s) {
      var box = document.getElementById(s[0]); if (!box) return;
      var filas = [];
      box.querySelectorAll('.campo').forEach(function (c) {
        var l = etiqueta(c); if (!l || SENSIBLE.test(l)) return;
        var v = valorCampo(c); if (!v || SENSIBLE.test(v)) return;
        filas.push('- ' + l + ': ' + v);
      });
      if (s[0] === 'sec-cov' && typeof global.__qqCoberturas === 'function') {
        try { global.__qqCoberturas(true).forEach(function (r) { filas.push('- ' + r.name + (r.limit ? ' · limit ' + r.limit : '') + (r.ded ? ' · ded ' + r.ded : '')); }); } catch (e) {}
      }
      if (filas.length) { L.push(''); L.push('## ' + s[1]); L.push.apply(L, filas); }
    });
    ['sec-units', 'sec-trailers'].forEach(function (id, k) {
      var rows = [];
      document.querySelectorAll('#' + id + ' .rt-rows .rt-row').forEach(function (r) {
        var vals = []; r.querySelectorAll('input,select').forEach(function (i) { var v = String(i.value || '').trim(); if (v) vals.push(v); });
        if (vals.length) rows.push('- ' + vals.join(' · '));
      });
      if (rows.length) { L.push(''); L.push(k ? '## Trailers' : '## Units'); L.push.apply(L, rows); }
    });
    var nd = 0; document.querySelectorAll('#sec-drivers .rt-rows .rt-row').forEach(function (r) { var any = false; r.querySelectorAll('input').forEach(function (i) { if (String(i.value || '').trim()) any = true; }); if (any) nd++; });
    if (nd) { L.push(''); L.push('## Drivers: ' + nd + ' (datos personales no se copian; pídelos si hacen falta)'); }
    return L.join('\n');
  }
  function aviso(html) {
    var a = document.getElementById('pgSamuAviso'); if (a) a.parentNode.removeChild(a);
    a = el('div'); a.id = 'pgSamuAviso'; a.setAttribute('role', 'status');
    html.forEach(function (p) { a.appendChild(typeof p === 'string' ? document.createTextNode(p) : p); });
    (document.body || document.documentElement).appendChild(a);
    setTimeout(function () { try { a.parentNode && a.parentNode.removeChild(a); } catch (e) {} }, 7000);
  }
  function pintarFab(d) {
    if (pagina() !== 'quick-quote.html' || document.getElementById('pgSamuFab')) return;
    var b = el('button'); b.id = 'pgSamuFab'; b.type = 'button'; b.title = 'Copia esta Quick Quote y abre SAMU';
    b.appendChild(cara()); b.appendChild(el('span', null, 'Analizar con SAMU'));
    b.addEventListener('click', function () {
      var t = ''; try { t = textoQuickQuote(datos || d); } catch (e) { t = 'Analiza el riesgo. Agente: ' + primerNombre((datos || d).nombre); }
      var ok = function () { aviso([el('b', null, 'Quick Quote copiada. '), 'En SAMU pega con Ctrl+V y envía.']); };
      var mal = function () { aviso([el('b', null, 'No pude copiar. '), 'Abre SAMU y escribe "analiza el riesgo" + pega la Quick Quote.']); };
      try { if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(t).then(ok, mal); else mal(); } catch (e) { mal(); }
      abrirSamu(datos || d);
    });
    (document.body || document.documentElement).appendChild(b);
  }

  /* ---------- datos ---------- */
  function cliente() {
    try { if (typeof global.pgSB === 'function') { var c = global.pgSB(); if (c) return c; } } catch (e) {}
    try { if (typeof global.pgNovedadesCliente === 'function') { var c2 = global.pgNovedadesCliente(); if (c2) return c2; } } catch (e) {}
    if (!(global.supabase && global.supabase.createClient)) return null;
    try { return global.supabase.createClient(URL_SB, KEY_SB); } catch (e) { return null; }
  }
  function recibir(d) {
    datos = d; ultimaCarga = Date.now();
    try { global.pgSamuDatos = d; } catch (e) {}
    estilos();
    try { pintarPill(d); } catch (e) {}
    try { pintarIndex(d); } catch (e) {}
    try { pintarMiProceso(d); } catch (e) {}
    try { pintarFab(d); } catch (e) {}
    try { ubicar(); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('pg-samu', { detail: d })); } catch (e) {}
  }
  function pedir() {
    if (cargando || !cliGlobal) return;
    cargando = true;
    try {
      cliGlobal.schema('portal').rpc('samu_mio', verComoCorreo ? { p_nombre: verComoCorreo } : {}).then(function (r) {
        cargando = false;
        if (r && !r.error && r.data && typeof r.data === 'object' && r.data.email) {
          recibir(r.data);
          if (!verComoCorreo && !esDireccion) {
            try { cliGlobal.schema('portal').rpc('samu_soy_direccion').then(function (x) { if (x && !x.error && x.data === true) { esDireccion = true; recibir(datos); } }, function () {}); } catch (e) {}
          }
        }
      }, function () { cargando = false; });
    } catch (e) { cargando = false; }
  }
  document.addEventListener('visibilitychange', function () {
    try { if (document.visibilityState === 'visible' && datos && (Date.now() - ultimaCarga) >= REFRESCO_MS) pedir(); } catch (e) {}
  });

  function arrancar() {
    if (SIN_PINTAR.test(pagina())) return;
    try { verComoCorreo = String(new URLSearchParams(global.location.search).get('ver_como') || '').trim(); } catch (e) {}
    var cli = cliente(); if (!cli) return;
    cliGlobal = cli;
    var hecho = false;
    function una(s) {
      if (hecho || !s || !s.user) return; hecho = true;
      if (EXTERNOS.indexOf(String(s.user.email || '').toLowerCase()) >= 0) return;
      pedir();
      setTimeout(ubicar, 1500); setTimeout(ubicar, 4000); setTimeout(ubicar, 8000);
      /* Mi proceso e Index pintan sus bloques tarde: se vuelve a intentar */
      setTimeout(function () { if (datos) { try { pintarMiProceso(datos); } catch (e) {} try { medirIndex(); } catch (e) {} } }, 2500);
      setTimeout(function () { if (datos && !document.getElementById('pgSamuMp')) { try { pintarMiProceso(datos); } catch (e) {} } }, 6000);
    }
    try { if (typeof global.pgSesionActual === 'function') { var s0 = global.pgSesionActual(); if (s0 && s0.user) { una(s0); return; } } } catch (e) {}
    try { if (typeof global.pgOnSesion === 'function') global.pgOnSesion(una); } catch (e) {}
    cli.auth.getSession().then(function (r) { una(r && r.data && r.data.session); }, function () {});
  }
  var intentos = 0;
  function esperar() {
    if (global.supabase && global.supabase.createClient) { try { arrancar(); } catch (e) {} return; }
    if (++intentos > 100) return;
    setTimeout(esperar, 100);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', esperar);
  else esperar();
})(window);
