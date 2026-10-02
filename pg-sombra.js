/* ============================================================
   GABI · pg-sombra.js v2 — el muelle de abajo a la derecha que sigue
   a la persona por todas las herramientas del portal.  1-oct-2026.

   Dos piezas, pegadas, siempre en el mismo sitio:

   1) LA BARRITA DEL TOP (arriba, todo el equipo con sesión):
        TOP FEE  (o)(o)(o)        TOP PREMIUM  (o)(o)(o)
      Las caritas de los tres mejores en fee (izquierda) y los tres
      mejores en premium (derecha). Sale de portal.top_mes_vigente():
      los primeros 3 días hábiles del mes muestra el mes que CERRÓ (lo
      que publicó el robot); del 4º día hábil en adelante, el top EN
      CURSO del mes que va ("Octubre · va ganando"), en vivo. Rota sola.
      Nombre y puesto al pasar el mouse.

   2) LA BOLITA DE LA META (abajo, solo asesores):
      su foto + un anillo que se llena con el % de su combinada contra
      su meta, con la META EN MILES adentro ("70" = $70,000) + "$X de $Y"
      + los días sin cotizar. El anillo es ROJO si no lleva nada, ÁMBAR
      si va por detrás del ritmo del mes y MINT si va al ritmo o ya pasó
      la meta. Un toque abre Mi proceso.

   Reglas:
   - Si no hay sesión, es cuenta externa (Leonis, UTS) o la RPC falla, esa
     pieza no se pinta y la herramienta sigue igual. Nunca rompe nada.
   - Quien no es asesor (dirección, áreas) ve solo la barrita del top.
   - En modo "ver como" la bolita no sale (mostraría la meta de quien mira).
   - Nada en localStorage ni sessionStorage (regla de la casa). El caché
     que traía la v1 se quitó: mi_sombra ya tarda 0,25 s.
   - Todo texto de la base va con textContent; fotos solo por https.

   Cómo llega a cada página: pg-novedades.js v4.6 lo carga solo en todas
   las herramientas que cargan ese archivo (incluido el Index). Las 23
   páginas que ya traían <script src="pg-sombra.js"> siguen igual: el
   candado __pgSombraLista deja una sola copia.

   Lo único que escribe: la apertura de Mi proceso desde aquí
   (portal.aperturas), para saber si la bolita sirve de verdad.
   ============================================================ */
(function (global) {
  'use strict';
  if (global.__pgSombraLista) return;
  global.__pgSombraLista = true;

  var URL_SB   = 'https://hivpqsepwsfmafamxkzy.supabase.co';
  var KEY_SB   = 'sb_publishable_Kak00GbGVt2K3yGh6IBZvw_99IybVvt';
  var DESTINO  = 'gabi-asesor.html';   // relativa a la página: todas viven en la raíz
  var EXTERNOS = ['gerencia@leonis-go.com', 'quoteautocomercial@gmail.com'];
  var ROJO = '#E0523F', AMBAR = '#D9A520', MINT = '#2DBFA3', PISTA = '#35566A';

  function usd(n) {
    n = Math.round(Number(n) || 0);
    return '$' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  function milesTxt(n) {
    n = Number(n) || 0;
    if (n >= 1000) { var k = n / 1000; return (k >= 100 ? Math.round(k) : Math.round(k * 10) / 10) + ''; }
    return Math.round(n) + '';
  }
  function el(tag, cls, txt) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt !== undefined && txt !== null) e.textContent = String(txt);
    return e;
  }
  function iniciales(n) {
    var p = String(n || '').trim().split(/\s+/);
    return (((p[0] || '').charAt(0)) + ((p[1] || '').charAt(0))).toUpperCase() || '·';
  }
  function fotoOk(u) { return /^https:\/\/[^"'()\s]+$/.test(String(u || '')); }

  function estilos() {
    if (document.getElementById('pgsombra-css')) return;
    var st = document.createElement('style');
    st.id = 'pgsombra-css';
    st.textContent =
      /* el muelle */
      '#pgMuelle{position:fixed;right:20px;bottom:20px;z-index:99990;display:flex;flex-direction:column;align-items:stretch;' +
        'font:600 12.5px/1.2 Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#fff;' +
        'filter:drop-shadow(0 8px 24px rgba(13,48,64,.28));opacity:0;transform:translateY(8px);' +
        'transition:opacity .35s ease,transform .35s ease;}' +
      '#pgMuelle.pgs-in{opacity:1;transform:translateY(0);}' +
      /* la barrita del top, pegada arriba */
      '#pgMuelle .pgs-top{display:flex;align-items:center;gap:18px;background:#0D3040;border-radius:16px 16px 0 0;' +
        'padding:7px 14px 8px;border-bottom:1px solid #24404F;}' +
      '#pgMuelle .pgs-top:last-child{border-radius:16px;border-bottom:0;}' +
      '#pgMuelle .pgs-mes{font:700 9.5px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;color:#7E95A4;white-space:nowrap;' +
        'padding-right:12px;border-right:1px solid #24404F;text-transform:uppercase;}' +
      '#pgMuelle .pgs-grupo{display:flex;align-items:center;gap:8px;}' +
      '#pgMuelle .pgs-grupo+.pgs-grupo{margin-left:auto;}' +
      '#pgMuelle .pgs-k{font:800 9.5px/1 Montserrat,Inter,system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;white-space:nowrap;}' +
      '#pgMuelle .pgs-grupo.fee .pgs-k{color:' + AMBAR + ';}' +
      '#pgMuelle .pgs-grupo.prem .pgs-k{color:' + MINT + ';}' +
      '#pgMuelle .pgs-caras{display:flex;align-items:center;}' +
      '#pgMuelle .pgs-cara{width:26px;height:26px;border-radius:50%;background:' + PISTA + ' center/cover no-repeat;' +
        'margin-left:-7px;display:flex;align-items:center;justify-content:center;font:800 9px/1 Inter,system-ui,sans-serif;color:#fff;' +
        'box-shadow:0 0 0 2px #0D3040;position:relative;}' +
      '#pgMuelle .pgs-cara:first-child{margin-left:0;}' +
      '#pgMuelle .pgs-grupo.fee .pgs-cara.n1{box-shadow:0 0 0 2px #0D3040,0 0 0 3.5px ' + AMBAR + ';}' +
      '#pgMuelle .pgs-grupo.prem .pgs-cara.n1{box-shadow:0 0 0 2px #0D3040,0 0 0 3.5px ' + MINT + ';}' +
      '#pgMuelle .pgs-sin{color:#7E95A4;font-weight:600;font-size:11.5px;}' +
      /* la bolita de la meta */
      '#pgSombra{display:flex;align-items:center;gap:11px;background:#1B2D3A;color:#fff;border:0;' +
        'border-radius:0 0 16px 16px;padding:8px 16px 8px 8px;cursor:pointer;text-align:left;font:inherit;' +
        'transition:background .2s ease;}' +
      '#pgSombra:first-child{border-radius:16px;}' +
      '#pgSombra:hover{background:#223848;}' +
      '#pgSombra .pgs-foto{width:38px;height:38px;flex:0 0 38px;border-radius:50%;object-fit:cover;display:block;background:' + PISTA + ';}' +
      '#pgSombra .pgs-anillo{position:relative;width:44px;height:44px;flex:0 0 44px;border-radius:50%;}' +
      '#pgSombra .pgs-anillo i{position:absolute;inset:5px;border-radius:50%;background:#1B2D3A;display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;font-style:normal;line-height:1;}' +
      '#pgSombra .pgs-anillo i b{font:800 14px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.02em;}' +
      '#pgSombra .pgs-anillo i small{font:700 6.5px/1 Inter,system-ui,sans-serif;letter-spacing:.08em;color:#7E95A4;margin-top:2px;}' +
      '#pgSombra .pgs-texto{display:flex;flex-direction:column;gap:2px;}' +
      '#pgSombra .pgs-texto b{font:700 13.5px/1.2 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.01em;}' +
      '#pgSombra .pgs-de{color:#9FB2BF;font-weight:600;}' +
      '#pgSombra .pgs-sub{font-size:11px;color:#9FB2BF;}' +
      '#pgSombra .pgs-sub.alerta{color:#F0C55A;font-weight:700;}' +
      '#pgSombra .pgs-sub.rojo{color:#F08B7F;font-weight:700;}' +
      /* teléfono */
      '@media (max-width:640px){#pgMuelle{right:10px;bottom:10px;left:10px;}' +
        '#pgMuelle .pgs-top{gap:10px;padding:6px 10px 7px;}' +
        '#pgMuelle .pgs-grupo{gap:6px;}' +
        '#pgMuelle .pgs-cara{width:22px;height:22px;margin-left:-6px;font-size:8px;}' +
        '#pgSombra{padding:7px 12px 7px 7px;}' +
        '#pgSombra .pgs-texto b{font-size:12.5px;}}' +
      '@media (max-width:640px){#pgMuelle .pgs-mes{display:none;}}' +
      '@media (max-width:400px){#pgMuelle .pgs-k{font-size:8.5px;letter-spacing:.08em;}}' +
      '@media (prefers-reduced-motion:reduce){#pgMuelle{transition:none;}}' +
      '@media print{#pgMuelle{display:none!important;}}';
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---------- el muelle: un solo contenedor, en orden barrita → bolita ---------- */
  function muelle() {
    var m = document.getElementById('pgMuelle');
    if (m) return m;
    estilos();
    m = el('div'); m.id = 'pgMuelle';
    document.body.appendChild(m);
    function entrar() { m.classList.add('pgs-in'); m.style.opacity = '1'; m.style.transform = 'translateY(0)'; }
    try { requestAnimationFrame(entrar); } catch (e) { entrar(); }
    setTimeout(entrar, 120);
    return m;
  }

  /* ---------- 1) la barrita del top ---------- */
  function grupo(cls, titulo, gente, posKey) {
    var g = el('div', 'pgs-grupo ' + cls);
    g.appendChild(el('span', 'pgs-k', titulo));
    var caras = el('div', 'pgs-caras');
    if (!gente.length) { caras.appendChild(el('span', 'pgs-sin', '—')); }
    gente.forEach(function (p) {
      var pos = Number(p[posKey]);
      var c = el('span', 'pgs-cara' + (pos === 1 ? ' n1' : ''));
      c.title = (p.nombre_completo || p.nombre || '') + ' · #' + pos + (posKey === 'pos_fee' ? ' en fee' : ' en premium')
              + (posKey === 'pos_fee' ? (p.fee ? ' · ' + p.fee : '') : (p.premium ? ' · ' + p.premium : ''));
      c.setAttribute('aria-label', c.title);
      if (fotoOk(p.foto)) c.style.backgroundImage = 'url("' + p.foto + '")';
      else c.textContent = iniciales(p.nombre_completo || p.nombre);
      caras.appendChild(c);
    });
    g.appendChild(caras);
    return g;
  }
  function pintarTop(t) {
    var gente = (t && Array.isArray(t.personas)) ? t.personas : [];
    if (!gente.length || document.getElementById('pgsTop')) return;
    var fee  = gente.filter(function (p) { return Number(p.pos_fee) <= 3 && String(p.fee || '') !== '$0'; })
                    .sort(function (a, b) { return Number(a.pos_fee) - Number(b.pos_fee); }).slice(0, 3);
    var prem = gente.filter(function (p) { return Number(p.pos_premium) <= 3; })
                    .sort(function (a, b) { return Number(a.pos_premium) - Number(b.pos_premium); }).slice(0, 3);
    if (!fee.length && !prem.length) return;
    var bar = el('div', 'pgs-top'); bar.id = 'pgsTop';
    bar.setAttribute('role', 'note');
    bar.setAttribute('aria-label', 'Los mejores de ' + (t.mesTxt || 'el mes'));
    bar.title = 'Los mejores de ' + (t.mesTxt || 'el mes');
    var mes = String(t.mesTxt || ''); mes = mes.charAt(0).toUpperCase() + mes.slice(1);
    var modo = el('span', 'pgs-mes', t.modo === 'en_curso' ? (mes + ' · va ganando') : mes);
    bar.appendChild(modo);
    bar.appendChild(grupo('fee', 'Top fee', fee, 'pos_fee'));
    bar.appendChild(grupo('prem', 'Top premium', prem, 'pos_premium'));
    var m = muelle();
    m.insertBefore(bar, m.firstChild);     // siempre arriba de la bolita
  }

  /* ---------- 2) la bolita de la meta ---------- */
  function colorMeta(d) {
    var mc = Number(d.mc) || 0, meta = Number(d.meta) || 0;
    if (mc <= 0) return ROJO;
    if (meta > 0 && mc >= meta) return MINT;
    var hoy = new Date(), m0 = new Date(hoy.getFullYear(), hoy.getMonth(), 1), hab = 0, habM = 0, fin = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0);
    for (var x = new Date(m0); x <= fin; x.setDate(x.getDate() + 1)) { if (x.getDay() !== 0 && x.getDay() !== 6) { habM++; if (x <= hoy) hab++; } }
    var ritmo = habM ? meta * hab / habM : 0;
    return (ritmo > 0 && mc < ritmo) ? AMBAR : MINT;
  }
  function pintarSombra(d, cli) {
    if (document.getElementById('pgSombra')) return;
    var pct  = Math.max(0, Math.min(100, Number(d.pct) || 0));
    var color = colorMeta(d);
    var b = el('button'); b.id = 'pgSombra'; b.type = 'button';
    b.title = 'Mi proceso · ' + (d.nombre || '');
    b.setAttribute('aria-label', 'Mi proceso: llevas ' + usd(d.mc) + ' de ' + usd(d.meta));

    if (fotoOk(d.foto)) {
      var img = document.createElement('img'); img.className = 'pgs-foto'; img.alt = ''; img.src = d.foto;
      img.onerror = function () { img.remove(); };
      b.appendChild(img);
    }
    var anillo = el('span', 'pgs-anillo');
    anillo.style.background = 'conic-gradient(' + color + ' 0 ' + pct + '%,' + PISTA + ' ' + pct + '% 100%)';
    var centro = el('i');
    var num = el('b', null, milesTxt(d.meta)); num.style.color = color;
    centro.appendChild(num);
    centro.appendChild(el('small', null, 'META'));
    anillo.appendChild(centro);
    b.appendChild(anillo);

    var txt = el('span', 'pgs-texto');
    var linea = el('span');
    linea.appendChild(el('b', null, usd(d.mc)));
    linea.appendChild(el('span', 'pgs-de', ' de ' + usd(d.meta)));
    txt.appendChild(linea);
    var dias = (d.diasSin === null || d.diasSin === undefined) ? null : Number(d.diasSin);
    if ((Number(d.mc) || 0) <= 0) txt.appendChild(el('span', 'pgs-sub rojo', 'Sin ventas este mes · la primera marca el ritmo'));
    else if (dias !== null && dias >= 3) txt.appendChild(el('span', 'pgs-sub alerta', dias + ' días sin cotizar'));
    else txt.appendChild(el('span', 'pgs-sub', Math.round(Number(d.pct) || 0) + '% de la meta'));
    b.appendChild(txt);

    b.addEventListener('click', function () {
      try {
        cli.schema('portal').from('aperturas').insert({ clave: 'gabi_asesor', origen: 'sombra' }).then(function () {}, function () {});
      } catch (e) { /* la medición nunca estorba el clic */ }
      global.location.href = DESTINO;
    });
    muelle().appendChild(b);               // siempre debajo de la barrita
  }

  /* ---------- cliente y arranque ---------- */
  function cliente() {
    try { if (typeof global.pgSB === 'function') { var c = global.pgSB(); if (c) return c; } } catch (e) {}
    try { if (typeof global.pgNovedadesCliente === 'function') { var c2 = global.pgNovedadesCliente(); if (c2) return c2; } } catch (e) {}
    if (!(global.supabase && global.supabase.createClient)) return null;
    try { return global.supabase.createClient(URL_SB, KEY_SB); } catch (e) { return null; }
  }

  function arrancar() {
    var verComo = false;
    try { verComo = !!new URLSearchParams(global.location.search).get('ver_como'); } catch (e) {}
    var cli = cliente();
    if (!cli) return;
    cli.auth.getSession().then(function (r) {
      var s = r && r.data && r.data.session;
      if (!s || !s.user) return;
      if (EXTERNOS.indexOf(String(s.user.email || '').toLowerCase()) >= 0) return;
      /* las dos piezas se piden a la vez */
      try {
        cli.schema('portal').rpc('top_mes_vigente').then(function (res) {
          if (!res || res.error || !res.data) return;
          try { pintarTop(res.data); } catch (e) {}
        }, function () {});
      } catch (e) {}
      if (!verComo) {
        try {
          cli.schema('public').rpc('mi_sombra').then(function (res) {
            if (!res || res.error || !res.data) return;   // no es asesor: solo la barrita
            try { pintarSombra(res.data, cli); } catch (e) {}
          }, function () {});
        } catch (e) {}
      }
    }, function () {});
  }

  var intentos = 0;
  function esperar() {
    if (global.supabase && global.supabase.createClient) { arrancar(); return; }
    if (++intentos > 40) return;            // ~10 s sin supabase-js: no se pinta
    setTimeout(esperar, 250);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(esperar, 200); });
  else setTimeout(esperar, 200);
})(window);
