/* ============================================================
   GABI · pg-sombra.js — la métrica del mes que sigue a la persona
   por todas las herramientas del portal.

   Qué es: una píldora chiquita, fija abajo a la derecha, con lo que
   lleva este mes contra SU meta (la misma de Mi proceso y del tablero
   del equipo: premium + fee contra meta_de_agente). Un toque abre
   Mi proceso.

   Por qué funciona: siempre el mismo sitio, el mismo tamaño y el mismo
   número. No pide nada, no bloquea nada, no cambia de color. Solo late
   una vez cuando el número sube. La repetición en el mismo lugar es lo
   que se vuelve inconsciente.

   Cómo se usa: una línea en cada página, después del script de Supabase.
     <script src="pg-sombra.js"></script>
   Nada más. Si la RPC falla o la persona no es asesor, no se pinta nada
   y la herramienta sigue igual (fail-silent, nunca fail-loud).

   v2 (1-oct-2026): al lado de la métrica, las caritas de los mejores del mes
   que cerró (portal.top_mes_vigente: el último top que publicó el robot del
   primer día hábil). Chiquitas, sin texto; el nombre y el puesto salen al pasar
   el mouse. Además pg-novedades.js v4.6 la carga sola en las herramientas que
   no la tenían (no en el Index: allá está el anillo grande del saludo).

   NO escribe nada de negocio. Lo único que registra es la apertura de
   Mi proceso desde aquí (portal.aperturas), para saber si la sombra
   sirve de verdad.
   ============================================================ */
(function (global) {
  'use strict';

  var URL_SB   = 'https://hivpqsepwsfmafamxkzy.supabase.co';
  var KEY_SB   = 'sb_publishable_Kak00GbGVt2K3yGh6IBZvw_99IybVvt';
  /* Relativa a la PAGINA que carga este script, no al script.
     Todas las pantallas que lo usan viven en la raiz del sitio. */
  var DESTINO  = 'gabi-asesor.html';
  var CACHE_MS = 10 * 60 * 1000;          // 10 minutos: se llama en cada pantalla
  var LLAVE    = 'pgSombra.v1';

  function guardado() {
    try {
      var raw = global.sessionStorage.getItem(LLAVE);
      if (!raw) return null;
      var o = JSON.parse(raw);
      return (o && o.t && (Date.now() - o.t) < CACHE_MS) ? o : null;
    } catch (e) { return null; }
  }
  function guardar(d) {
    try { global.sessionStorage.setItem(LLAVE, JSON.stringify({ t: Date.now(), d: d })); }
    catch (e) { /* modo privado: la sombra sigue funcionando, solo sin cache */ }
  }
  function anterior() {
    try {
      var raw = global.localStorage.getItem(LLAVE + '.mc');
      return raw === null ? null : Number(raw);
    } catch (e) { return null; }
  }
  function recordar(mc) {
    try { global.localStorage.setItem(LLAVE + '.mc', String(mc)); } catch (e) {}
  }

  function usd(n) {
    n = Math.round(Number(n) || 0);
    return '$' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function esc(s) {
    return String(s === null || s === undefined ? '' : s)
      .replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; });
  }

  function estilos() {
    if (document.getElementById('pgsombra-css')) return;
    var st = document.createElement('style');
    st.id = 'pgsombra-css';
    st.textContent =
      '#pgSombra{position:fixed;right:20px;bottom:20px;z-index:99990;display:flex;align-items:center;gap:10px;' +
        'background:#1B2D3A;color:#fff;border:0;border-radius:999px;padding:7px 15px 7px 7px;cursor:pointer;' +
        'font:600 12.5px/1.2 Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;' +
        'box-shadow:0 6px 22px rgba(13,48,64,.26);opacity:0;transform:translateY(8px);' +
        'transition:opacity .35s ease,transform .35s ease,box-shadow .2s ease;}' +
      '#pgSombra.pgs-in{opacity:1;transform:translateY(0);}' +
      '#pgSombra:hover{box-shadow:0 10px 28px rgba(13,48,64,.34);}' +
      '#pgSombra .pgs-anillo{position:relative;width:32px;height:32px;flex:0 0 32px;border-radius:50%;}' +
      '#pgSombra .pgs-anillo i{position:absolute;inset:4px;border-radius:50%;background:#1B2D3A;display:flex;' +
        'align-items:center;justify-content:center;font:700 9px/1 ui-monospace,SFMono-Regular,Menlo,monospace;' +
        'color:#2DBFA3;font-style:normal;letter-spacing:-.02em;}' +
      '#pgSombra .pgs-foto{width:32px;height:32px;flex:0 0 32px;border-radius:50%;object-fit:cover;display:block;}' +
      '#pgSombra b{font:700 13px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.01em;}' +
      '#pgSombra .pgs-de{color:#9FB2BF;font-weight:600;}' +
      '#pgSombra .pgs-alerta{color:#F0C55A;font-weight:700;}' +
      '#pgSombra .pgs-top{display:flex;align-items:center;padding-left:10px;margin-left:2px;border-left:1px solid #35566A;}' +
      '#pgSombra .pgs-top svg{width:14px;height:14px;color:#2DBFA3;flex:0 0 14px;margin-right:6px;}' +
      '#pgSombra .pgs-cara{width:22px;height:22px;flex:0 0 22px;border-radius:50%;background:#35566A center/cover no-repeat;' +
        'box-shadow:0 0 0 2px #1B2D3A;margin-left:-6px;display:flex;align-items:center;justify-content:center;' +
        'font:800 8px/1 Inter,system-ui,sans-serif;color:#fff;}' +
      '#pgSombra .pgs-cara:first-of-type{margin-left:0;}' +
      '#pgSombra .pgs-cara.f{box-shadow:0 0 0 2px #1B2D3A,0 0 0 3px #D9A520;}' +
      '#pgSombra .pgs-cara.p{box-shadow:0 0 0 2px #1B2D3A,0 0 0 3px #2DBFA3;}' +
      '@keyframes pgsLate{0%{transform:scale(1)}35%{transform:scale(1.09)}100%{transform:scale(1)}}' +
      '#pgSombra.pgs-late{animation:pgsLate .9s ease 1;}' +
      '@media (max-width:640px){#pgSombra{right:12px;bottom:12px;padding:6px 12px 6px 6px;}' +
        '#pgSombra .pgs-texto{display:none;}}' +
      '@media print{#pgSombra{display:none!important;}}';
    document.head.appendChild(st);
  }

  /* v2 · Las caritas del top del mes (top_mes_vigente). Solo nombre/foto/puesto. */
  function caritasTop(t) {
    var gente = (t && Array.isArray(t.personas)) ? t.personas.slice(0, 6) : [];
    if (!gente.length) return '';
    var titulo = 'Los mejores de ' + esc(t.mesTxt || 'el mes') + ': ' + gente.map(function (p) {
      var pp = Number(p.pos_premium), pf = Number(p.pos_fee);
      var et = (pp <= 3 && pf <= 3) ? 'doble podio' : (pp <= 3 ? '#' + pp + ' premium' : '#' + pf + ' fee');
      return esc(p.nombre || '') + ' (' + et + ')';
    }).join(', ');
    var caras = gente.map(function (p) {
      var pp = Number(p.pos_premium), pf = Number(p.pos_fee);
      var cls = (pp <= 3) ? 'p' : 'f';
      var foto = String(p.foto || '');
      var ini = String(p.nombre_completo || p.nombre || '').trim().split(/\s+/).slice(0, 2)
                  .map(function (x) { return x.charAt(0); }).join('').toUpperCase();
      return /^https:\/\/[^"'()\s]+$/.test(foto)
        ? '<span class="pgs-cara ' + cls + '" style="background-image:url(&quot;' + esc(foto) + '&quot;)"></span>'
        : '<span class="pgs-cara ' + cls + '">' + esc(ini) + '</span>';
    }).join('');
    return '<span class="pgs-top" title="' + titulo + '" aria-label="' + titulo + '">'
      + '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'
      + '<path d="M8 21h8M12 17v4M7 4h10v5a5 5 0 0 1-10 0V4z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/></svg>'
      + caras + '</span>';
  }
  function ponerTop(t) {
    var b = document.getElementById('pgSombra');
    if (!b || b.querySelector('.pgs-top')) return;
    var html = caritasTop(t);
    if (html) b.insertAdjacentHTML('beforeend', html);
  }

  function pintar(d, cli) {
    if (document.getElementById('pgSombra')) return;
    estilos();

    var pct  = Math.max(0, Math.min(100, Number(d.pct) || 0));
    var real = Number(d.pct) || 0;
    var b = document.createElement('button');
    b.id = 'pgSombra';
    b.type = 'button';
    b.title = 'Mi proceso · ' + esc(d.nombre);
    b.setAttribute('aria-label', 'Mi proceso: llevas ' + usd(d.mc) + ' de ' + usd(d.meta));

    var anillo = '<span class="pgs-anillo" style="background:conic-gradient(#2DBFA3 0 ' + pct + '%,#35566A ' + pct + '% 100%)">'
               + '<i>' + (real > 999 ? '999' : real) + '</i></span>';
    var foto = d.foto
      ? '<img class="pgs-foto" src="' + esc(d.foto) + '" alt="" onerror="this.remove()">'
      : '';

    var aviso = (d.diasSin !== null && d.diasSin !== undefined && Number(d.diasSin) >= 3)
      ? ' <span class="pgs-alerta">· ' + Number(d.diasSin) + ' d sin cotizar</span>' : '';

    b.innerHTML = foto + anillo
      + '<span class="pgs-texto"><b>' + usd(d.mc) + '</b> <span class="pgs-de">de ' + usd(d.meta) + '</span>' + aviso + '</span>';

    b.addEventListener('click', function () {
      try {
        cli.schema('portal').from('aperturas')
           .insert({ clave: 'gabi_asesor', origen: 'sombra' }).then(function () {}, function () {});
      } catch (e) { /* la medición nunca puede estorbar el clic */ }
      global.location.href = DESTINO;
    });

    document.body.appendChild(b);
    if (global.__pgSombraTop) ponerTop(global.__pgSombraTop);
    // Entrada: rAF no siempre corre si la pestana arranca oculta, asi que va con
    // reloj de respaldo y, si aun asi no entra, se pinta visible a mano. La sombra
    // NUNCA puede quedarse invisible por culpa de la animacion.
    function entrar() {
      b.classList.add('pgs-in');
      b.style.opacity = '1';
      b.style.transform = 'translateY(0)';
    }
    try { requestAnimationFrame(entrar); } catch (e) { entrar(); }
    setTimeout(entrar, 120);

    var antes = anterior();
    if (antes !== null && Number(d.mc) > antes) {
      setTimeout(function () { b.classList.add('pgs-late'); }, 500);
    }
    recordar(Number(d.mc) || 0);
  }

  function cliente() {
    if (!(global.supabase && global.supabase.createClient)) return null;
    try { return global.supabase.createClient(URL_SB, KEY_SB); } catch (e) { return null; }
  }

  function arrancar() {
    // En modo "ver como" la sombra no aplica: mostraría las cifras de quien
    // mira, no las de la persona simulada, y eso confunde más de lo que ayuda.
    try {
      if (new URLSearchParams(global.location.search).get('ver_como')) return;
    } catch (e) {}
    // La página ya la pintó (dos scripts, una sola sombra)
    if (global.__pgSombraLista) return;
    global.__pgSombraLista = true;

    var cli = cliente();
    if (!cli) return;

    function pedirTop() {
      try {
        cli.schema('portal').rpc('top_mes_vigente').then(function (res) {
          if (!res || res.error || !res.data) return;
          global.__pgSombraTop = res.data;
          ponerTop(res.data);
        }, function () {});
      } catch (e) { /* sin top: la sombra sigue igual */ }
    }

    var cache = guardado();
    if (cache && cache.d) { pintar(cache.d, cli); pedirTop(); return; }

    cli.auth.getSession().then(function (r) {
      if (!(r && r.data && r.data.session)) return;
      pedirTop();
      cli.rpc('mi_sombra').then(function (res) {
        if (!res || res.error || !res.data) return;   // no es asesor, o no resolvió: sin sombra
        guardar(res.data);
        pintar(res.data, cli);
      }, function () {});
    }, function () {});
  }

  function esperar() {
    if (global.supabase && global.supabase.createClient) { arrancar(); return; }
    var s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2';
    s.onload = arrancar;
    document.head.appendChild(s);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function () { setTimeout(esperar, 250); });
  } else {
    setTimeout(esperar, 250);
  }
})(window);
