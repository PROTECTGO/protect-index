/* ============================================================
   GABI · pg-sombra.js v6 — la columna que sigue a la persona por todas
   las herramientas del portal.  6-oct-2026.

   v6 (6-oct, carga inmediata): el top y la bolita salen de portal.rapido()
   (lo último calculado, ~10 ms) y se repintan solos si portal.refrescar()
   trae algo más nuevo (dato de más de 5 min). Arranca apenas la página tiene
   sesión (pgSesionActual / pgOnSesion del Index, o getSession), sin el reloj
   de 200 ms. Si la base no tiene la caché, pide las funciones de siempre.

   v5 (6-oct, pedido de Andrés): (a) si ya estás en Mi proceso (gabi-asesor.html),
   tocar la bolita NO recarga la página ni registra apertura: sube al inicio
   con scroll suave. (b) si la pantalla trae su barra lateral oscura
   (.pg-side, pegada a la izquierda), la columna se corre a la derecha de
   esa barra en escritorio en vez de montarse encima; en teléfono no cambia.
   (c) raiz(): en amazon-relay/ el destino y el volver apuntan con ../ al
   Index y a Mi proceso de la raíz del sitio (antes caían dentro de la subcarpeta).

   v4 (5-oct, pedido de Andrés): en ESCRITORIO (641 px o más) el muelle
   pasa a ser una COLUMNA VERTICAL abajo a la izquierda, de 78 px de
   ancho, con todo junto de arriba a abajo: el botón de volver al Index,
   el mes de las caritas ("TOP SEP" / "OCT VA"), Top fee (ámbar) y Top
   premium (mint) con las tres caritas apiladas, y la bolita de la meta
   con la foto en la esquina, "$28.4k" y "META OCTUBRE". El desplegable
   del top abre HACIA LA DERECHA de la columna. En TELÉFONO sigue el
   muelle horizontal de la v3, abajo y a lo ancho, sin cambios.
   El volver de la columna reemplaza la pastilla de pg-volver.js en
   escritorio (pg-volver v2 se esconde cuando ve la columna).

   v3 (2-oct): la barrita dice de qué mes son las caritas ("TOP SEPTIEMBRE"
   mientras la bolita va por la meta de octubre); un toque en "Top premium"
   o en "Top fee" despliega la lista completa del mes (premium + combinada,
   o fee + pólizas) y otro toque la cierra. La base (top_mes_vigente) ya
   trae el mes cerrado en vivo aunque el robot no lo haya publicado.

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
  function raiz() { try { return global.location.pathname.indexOf('/amazon-relay/') >= 0 ? '../' : ''; } catch (e) { return ''; } }   // v5: amazon-relay vive en una subcarpeta
  var DESTINO  = raiz() + 'gabi-asesor.html';   // relativa a la página: las herramientas viven en la raíz (amazon-relay con ../)
  var EXTERNOS = ['gerencia@leonis-go.com', 'quoteautocomercial@gmail.com'];
  var ROJO = '#E0523F', AMBAR = '#D9A520', MINT = '#2DBFA3', PISTA = '#35566A';
  var SIN_VOLVER = /^(index\.html|recuperar\.html|firma-protectgo\.html)$/i;   // donde no va el volver
  function pagina() { try { return global.location.pathname.split('/').pop() || 'index.html'; } catch (e) { return ''; } }
  function compacto(n) {                // $28,400 -> $28.4k  ·  $111,787 -> $112k
    n = Math.round(Number(n) || 0);
    if (n < 1000) return '$' + n;
    var k = n / 1000;
    return '$' + (k >= 100 ? Math.round(k) : Math.round(k * 10) / 10) + 'k';
  }

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
      '#pgMuelle .pgs-grupo{display:flex;align-items:center;gap:8px;background:none;border:0;padding:3px 6px;margin:-3px -6px;border-radius:10px;' +
        'color:inherit;font:inherit;cursor:pointer;transition:background .15s ease;}' +
      '#pgMuelle .pgs-grupo:hover,#pgMuelle .pgs-grupo.abierto{background:rgba(255,255,255,.08);}' +
      '#pgMuelle .pgs-grupo+.pgs-grupo{margin-left:auto;}' +
      '#pgMuelle .pgs-grupo .pgs-flecha{width:0;height:0;border-left:3.5px solid transparent;border-right:3.5px solid transparent;' +
        'border-bottom:4px solid #7E95A4;margin-left:2px;transition:transform .2s ease;}' +
      '#pgMuelle .pgs-grupo.abierto .pgs-flecha{transform:rotate(180deg);}' +
      /* el desplegable: la lista completa del mes */
      '#pgsPanel{background:#0D3040;border-radius:16px 16px 0 0;border-bottom:1px solid #24404F;min-width:330px;max-height:min(62vh,520px);' +
        'display:flex;flex-direction:column;overflow:hidden;}' +
      '#pgsPanel .pgsp-cab{display:flex;align-items:center;gap:8px;padding:10px 12px 8px 14px;border-bottom:1px solid #24404F;}' +
      '#pgsPanel .pgsp-tabs{display:flex;gap:4px;background:#1B2D3A;border-radius:9px;padding:3px;}' +
      '#pgsPanel .pgsp-tab{background:none;border:0;color:#9FB2BF;font:800 9.5px/1 Montserrat,Inter,system-ui,sans-serif;letter-spacing:.12em;' +
        'text-transform:uppercase;padding:6px 10px;border-radius:7px;cursor:pointer;}' +
      '#pgsPanel .pgsp-tab.prem.on{background:#0D3040;color:' + MINT + ';}' +
      '#pgsPanel .pgsp-tab.fee.on{background:#0D3040;color:' + AMBAR + ';}' +
      '#pgsPanel .pgsp-mes{margin-left:auto;font:700 9.5px/1 Inter,system-ui,sans-serif;letter-spacing:.06em;color:#7E95A4;text-transform:uppercase;white-space:nowrap;}' +
      '#pgsPanel .pgsp-x{background:none;border:0;color:#9FB2BF;font:600 18px/1 Inter,system-ui,sans-serif;cursor:pointer;padding:0 2px 0 8px;}' +
      '#pgsPanel .pgsp-x:hover{color:#fff;}' +
      '#pgsPanel .pgsp-lista{overflow:auto;padding:6px 8px 8px;overscroll-behavior:contain;}' +
      '#pgsPanel .pgsp-fila{display:grid;grid-template-columns:20px 30px 1fr auto;align-items:center;gap:8px;padding:6px 6px;border-radius:10px;}' +
      '#pgsPanel .pgsp-fila:nth-child(odd){background:rgba(255,255,255,.035);}' +
      '#pgsPanel .pgsp-pos{font:800 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;color:#7E95A4;text-align:right;}' +
      '#pgsPanel .pgsp-fila.top3 .pgsp-pos{color:#fff;}' +
      '#pgsPanel .pgsp-cara{width:30px;height:30px;border-radius:50%;background:' + PISTA + ' center/cover no-repeat;display:flex;align-items:center;' +
        'justify-content:center;font:800 10px/1 Inter,system-ui,sans-serif;color:#fff;}' +
      '#pgsPanel.prem .pgsp-fila.n1 .pgsp-cara{box-shadow:0 0 0 2px #0D3040,0 0 0 3.5px ' + MINT + ';}' +
      '#pgsPanel.fee .pgsp-fila.n1 .pgsp-cara{box-shadow:0 0 0 2px #0D3040,0 0 0 3.5px ' + AMBAR + ';}' +
      '#pgsPanel .pgsp-nom{display:flex;flex-direction:column;gap:2px;min-width:0;}' +
      '#pgsPanel .pgsp-nom b{font:700 12.5px/1.15 Inter,system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}' +
      '#pgsPanel .pgsp-nom small{font:600 10.5px/1.15 Inter,system-ui,sans-serif;color:#9FB2BF;white-space:nowrap;}' +
      '#pgsPanel .pgsp-val{display:flex;flex-direction:column;align-items:flex-end;gap:2px;}' +
      '#pgsPanel .pgsp-val b{font:700 13px/1.15 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.01em;}' +
      '#pgsPanel.prem .pgsp-fila.top3 .pgsp-val b{color:' + MINT + ';}' +
      '#pgsPanel.fee .pgsp-fila.top3 .pgsp-val b{color:' + AMBAR + ';}' +
      '#pgsPanel .pgsp-val small{font:600 10.5px/1.15 Inter,system-ui,sans-serif;color:#9FB2BF;white-space:nowrap;}' +
      '#pgsPanel .pgsp-vacio{padding:18px 14px;color:#9FB2BF;font-weight:600;text-align:center;}' +
      '#pgsPanel+.pgs-top{border-radius:0;}' +
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
      '@media (max-width:640px){#pgMuelle .pgs-mes{font-size:8.5px;padding-right:8px;}' +
        '#pgsPanel{min-width:0;max-height:min(70vh,520px);}' +
        '#pgsPanel .pgsp-fila{grid-template-columns:18px 26px 1fr auto;gap:6px;}' +
        '#pgsPanel .pgsp-cara{width:26px;height:26px;}}' +
      '@media (max-width:400px){#pgMuelle .pgs-k{font-size:8.5px;letter-spacing:.08em;}}' +
      /* piezas que solo existen en un modo */
      '#pgMuelle .pgs-volver,#pgMuelle .pgs-sep,#pgMuelle .pgs-corto,#pgSombra .pgs-mini{display:none;}' +
      '#pgMuelle .pgs-sep+#pgSombra{border-radius:16px;}' +   /* sin barrita: la bolita sola, redonda */
      /* ===== v4: la COLUMNA, en escritorio ===== */
      '@media (min-width:641px){' +
        '#pgMuelle{left:16px;right:auto;bottom:16px;width:78px;align-items:center;background:#0D3040;border-radius:22px;' +
          'padding:10px 0 8px;border:1px solid rgba(255,255,255,.06);}' +
        '#pgMuelle .pgs-volver{display:flex;width:40px;height:40px;border-radius:50%;background:#163F54;align-items:center;justify-content:center;' +
          'border:1px solid rgba(255,255,255,.14);color:#fff;text-decoration:none;transition:background .15s ease,transform .15s ease;}' +
        '#pgMuelle .pgs-volver:hover{background:#1E5069;}' +
        '#pgMuelle .pgs-volver:active{transform:translateY(1px);}' +
        '#pgMuelle .pgs-volver:focus-visible{outline:2px solid ' + MINT + ';outline-offset:2px;}' +
        '#pgMuelle .pgs-volver svg{width:16px;height:16px;display:block;}' +
        '#pgMuelle .pgs-sep{display:block;width:34px;height:1px;background:#24404F;margin:10px 0 10px;}' +
        '#pgMuelle .pgs-top{flex-direction:column;gap:6px;background:none;border:0;border-radius:0;padding:0;}' +
        '#pgMuelle .pgs-top:last-child{border-radius:0;}' +
        '#pgMuelle .pgs-mes{border:0;padding:0;margin-bottom:2px;text-align:center;font-size:8.5px;letter-spacing:.12em;line-height:1.35;}' +
        '#pgMuelle .pgs-largo{display:none;}' +
        '#pgMuelle .pgs-corto{display:inline;}' +
        '#pgMuelle .pgs-grupo{flex-direction:column;gap:7px;margin:0;padding:7px 9px 6px;border-radius:14px;}' +
        '#pgMuelle .pgs-grupo+.pgs-grupo{margin-left:0;}' +
        '#pgMuelle .pgs-k{font-size:8.5px;letter-spacing:.12em;}' +
        '#pgMuelle .pgs-caras{flex-direction:column;}' +
        '#pgMuelle .pgs-cara{width:32px;height:32px;margin-left:0;margin-top:-7px;font-size:10px;box-shadow:0 0 0 2.5px #0D3040;}' +
        '#pgMuelle .pgs-cara:first-child{margin-top:0;}' +
        '#pgMuelle .pgs-cara:nth-child(2){position:relative;z-index:1;}' +
        '#pgMuelle .pgs-grupo.fee .pgs-cara.n1{box-shadow:0 0 0 2.5px #0D3040,0 0 0 4.5px ' + AMBAR + ';z-index:2;}' +
        '#pgMuelle .pgs-grupo.prem .pgs-cara.n1{box-shadow:0 0 0 2.5px #0D3040,0 0 0 4.5px ' + MINT + ';z-index:2;}' +
        '#pgMuelle .pgs-grupo .pgs-flecha{margin:0;transform:rotate(90deg);}' +
        '#pgMuelle .pgs-grupo.abierto .pgs-flecha{transform:rotate(-90deg);}' +
        /* el desplegable abre a la derecha de la columna */
        '#pgsPanel{position:absolute;left:calc(100% + 10px);bottom:0;width:340px;border-radius:18px;border:1px solid rgba(255,255,255,.06);' +
          'max-height:min(70vh,520px);}' +
        '#pgsPanel+.pgs-top{border-radius:0;}' +
        /* la bolita, en vertical */
        '#pgSombra{position:relative;flex-direction:column;gap:0;width:62px;margin-top:10px;padding:10px 4px 9px;border-radius:18px;text-align:center;}' +
        '#pgSombra:first-child{border-radius:18px;}' +
        '#pgMuelle .pgs-sep+#pgSombra{margin-top:0;border-radius:18px;}' +
        '#pgSombra .pgs-texto{display:none;}' +
        '#pgSombra .pgs-foto{position:absolute;right:-7px;top:-7px;width:26px;height:26px;flex:none;box-shadow:0 0 0 2.5px #0D3040;}' +
        '#pgSombra .pgs-anillo{width:46px;height:46px;flex:none;}' +
        '#pgSombra .pgs-mini{display:flex;flex-direction:column;align-items:center;gap:3px;margin-top:7px;}' +
        '#pgSombra .pgs-mini b{font:800 11px/1 ui-monospace,SFMono-Regular,Menlo,monospace;letter-spacing:-.01em;color:#fff;}' +
        '#pgSombra .pgs-mini small{font:700 7.5px/1.25 Inter,system-ui,sans-serif;letter-spacing:.06em;text-transform:uppercase;color:#9FB2BF;}' +
        '#pgSombra .pgs-mini small.rojo{color:#F08B7F;}' +
        '#pgSombra .pgs-mini small.alerta{color:#F0C55A;}' +
      '}' +
      '@media (prefers-reduced-motion:reduce){#pgMuelle{transition:none;}}' +
      '@media print{#pgMuelle{display:none!important;}}';
    (document.head || document.documentElement).appendChild(st);
  }

  /* v5: si hay una barra lateral oscura pegada a la izquierda (.pg-side), la columna se corre a su derecha (solo escritorio) */
  function correrSiHayBarra(m) {
    try {
      var side = document.querySelector('.pg-side'), r = null;
      if (side && side.offsetWidth > 0 && global.innerWidth >= 641) {
        r = side.getBoundingClientRect();
        if (!(r.left <= 2 && r.width >= 120 && r.width <= 400)) r = null;
      }
      m.style.left = r ? (Math.round(r.right) + 14) + 'px' : '';
    } catch (e) {}
  }
  var rafBarra = 0;
  global.addEventListener('resize', function () {
    if (rafBarra) return;
    var f = function () { rafBarra = 0; var m = document.getElementById('pgMuelle'); if (m) correrSiHayBarra(m); };
    try { rafBarra = requestAnimationFrame(f); } catch (e) { rafBarra = setTimeout(f, 80); }
  });

  /* ---------- el muelle: un solo contenedor, en orden barrita → bolita ---------- */
  function muelle() {
    var m = document.getElementById('pgMuelle');
    if (m) return m;
    estilos();
    m = el('div'); m.id = 'pgMuelle';
    if (!SIN_VOLVER.test(pagina())) {        // v4: en la columna, el volver va arriba (en teléfono se esconde)
      var v = document.createElement('a');
      v.className = 'pgs-volver'; v.href = raiz() + 'index.html';
      v.title = 'Volver al Index'; v.setAttribute('aria-label', 'Volver al Index');
      v.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.5 3.5 6 8l4.5 4.5"/></svg>';
      m.appendChild(v);
      m.appendChild(el('span', 'pgs-sep'));
    }
    document.body.appendChild(m);
    correrSiHayBarra(m);
    function entrar() { m.classList.add('pgs-in'); m.style.opacity = '1'; m.style.transform = 'translateY(0)'; }
    try { requestAnimationFrame(entrar); } catch (e) { entrar(); }
    setTimeout(entrar, 120);
    return m;
  }

  /* ---------- 1) la barrita del top ---------- */
  function grupo(cls, titulo, gente, posKey, t) {
    var g = el('button', 'pgs-grupo ' + cls); g.type = 'button';
    g.setAttribute('aria-expanded', 'false');
    g.title = 'Ver ' + titulo.toLowerCase() + ' completo de ' + mesBonito(t.mesTxt);
    var k = el('span', 'pgs-k');
    k.appendChild(el('span', 'pgs-largo', titulo));
    k.appendChild(el('span', 'pgs-corto', titulo.replace(/^Top\s+/i, '')));
    g.appendChild(k);
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
    g.appendChild(el('i', 'pgs-flecha'));
    g.addEventListener('click', function () { alternarPanel(cls, t, g); });
    return g;
  }
  function mesBonito(m) { m = String(m || ''); return m.charAt(0).toUpperCase() + m.slice(1); }
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
    var mes = mesBonito(t.mesTxt);
    /* el mes de las caritas, dicho claro: "TOP SEPTIEMBRE" (cerró) o "OCTUBRE · VA GANANDO" (en curso) */
    var modo = el('span', 'pgs-mes');
    var abrev = mes.slice(0, 3);
    modo.appendChild(el('span', 'pgs-largo', t.modo === 'en_curso' ? (mes + ' · va ganando') : ('Top ' + mes)));
    var corto = el('span', 'pgs-corto');
    corto.appendChild(document.createTextNode(t.modo === 'en_curso' ? abrev : 'Top'));
    corto.appendChild(document.createElement('br'));
    corto.appendChild(document.createTextNode(t.modo === 'en_curso' ? 'va' : abrev));
    modo.appendChild(corto);
    modo.title = t.modo === 'en_curso' ? ('Así va ' + mes + ' hasta hoy') : ('Los mejores de ' + mes + ', el mes que cerró');
    bar.appendChild(modo);
    bar.appendChild(grupo('fee', 'Top fee', fee, 'pos_fee', t));
    bar.appendChild(grupo('prem', 'Top premium', prem, 'pos_premium', t));
    var m = muelle();
    var ref = document.getElementById('pgSombra');
    if (ref && ref.parentNode === m) m.insertBefore(bar, ref);   // arriba de la bolita
    else m.appendChild(bar);                                    // (el volver y la línea quedan arriba)
  }

  /* ---------- 1b) el desplegable: la lista completa del mes ---------- */
  var panelAbierto = null;   // 'prem' | 'fee' | null
  function cerrarPanel() {
    var p = document.getElementById('pgsPanel'); if (p) p.remove();
    panelAbierto = null;
    var m = document.getElementById('pgMuelle');
    if (m) m.querySelectorAll('.pgs-grupo').forEach(function (g) { g.classList.remove('abierto'); g.setAttribute('aria-expanded', 'false'); });
  }
  function alternarPanel(cual, t, boton) {
    if (panelAbierto === cual) { cerrarPanel(); return; }
    cerrarPanel();
    panelAbierto = cual;
    var m = muelle();
    var p = el('div', cual); p.id = 'pgsPanel'; p.setAttribute('role', 'dialog');
    p.setAttribute('aria-label', (cual === 'fee' ? 'Top fee' : 'Top premium') + ' de ' + mesBonito(t.mesTxt));

    var cab = el('div', 'pgsp-cab');
    var tabs = el('div', 'pgsp-tabs');
    ['prem', 'fee'].forEach(function (k) {
      var b = el('button', 'pgsp-tab ' + k + (k === cual ? ' on' : ''), k === 'fee' ? 'Fee' : 'Premium'); b.type = 'button';
      b.addEventListener('click', function () { if (k !== panelAbierto) { panelAbierto = null; alternarPanel(k, t, boton); } });
      tabs.appendChild(b);
    });
    cab.appendChild(tabs);
    cab.appendChild(el('span', 'pgsp-mes', t.modo === 'en_curso' ? (mesBonito(t.mesTxt) + ' · hasta hoy') : mesBonito(t.mesTxt)));
    var x = el('button', 'pgsp-x', '×'); x.type = 'button'; x.title = 'Cerrar'; x.setAttribute('aria-label', 'Cerrar');
    x.addEventListener('click', cerrarPanel);
    cab.appendChild(x);
    p.appendChild(cab);

    var lista = el('div', 'pgsp-lista');
    var rank = (t && Array.isArray(t.ranking)) ? t.ranking.slice() : [];
    var posKey = cual === 'fee' ? 'pos_fee' : 'pos_premium';
    rank.sort(function (a, b) { return Number(a[posKey]) - Number(b[posKey]); });
    if (!rank.length) lista.appendChild(el('div', 'pgsp-vacio', 'Todavía no hay ventas este mes'));
    rank.forEach(function (r, i) {
      var pos = i + 1;
      var fila = el('div', 'pgsp-fila' + (pos <= 3 ? ' top3' : '') + (pos === 1 ? ' n1' : ''));
      fila.appendChild(el('span', 'pgsp-pos', pos));
      var c = el('span', 'pgsp-cara');
      if (fotoOk(r.foto)) c.style.backgroundImage = 'url("' + r.foto + '")'; else c.textContent = iniciales(r.nombre_completo || r.nombre);
      fila.appendChild(c);
      var nom = el('span', 'pgsp-nom');
      nom.appendChild(el('b', null, r.nombre_completo || r.nombre || '—'));
      var pol = Number(r.polizas) || 0;
      var ncli = Number(r.clientes) || 0;
      nom.appendChild(el('small', null, pol + (pol === 1 ? ' póliza' : ' pólizas') + ' · ' + ncli + (ncli === 1 ? ' cuenta' : ' cuentas')));
      fila.appendChild(nom);
      var val = el('span', 'pgsp-val');
      if (cual === 'fee') {
        val.appendChild(el('b', null, (Number(r.fee_n) || 0) > 0 ? (r.fee || usd(r.fee_n)) : '—'));
        val.appendChild(el('small', null, 'fee'));
      } else {
        val.appendChild(el('b', null, r.premium || usd(r.premium_n)));
        val.appendChild(el('small', null, 'combinada ' + (r.mc || usd(r.mc_n))));
      }
      fila.appendChild(val);
      lista.appendChild(fila);
    });
    p.appendChild(lista);
    var bar = document.getElementById('pgsTop');
    if (bar && bar.parentNode === m) m.insertBefore(p, bar);   // justo arriba de la barrita (en la columna va flotando a la derecha)
    else m.insertBefore(p, m.firstChild);
    if (boton) { boton.classList.add('abierto'); boton.setAttribute('aria-expanded', 'true'); }
    var g2 = m.querySelector('.pgs-grupo.' + cual); if (g2) { g2.classList.add('abierto'); g2.setAttribute('aria-expanded', 'true'); }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && panelAbierto) cerrarPanel(); });
  document.addEventListener('click', function (e) {
    if (!panelAbierto) return;
    var m = document.getElementById('pgMuelle');
    if (m && !m.contains(e.target)) cerrarPanel();
  });

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
  var MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  function mesActualTxt() { return MESES[new Date().getMonth()]; }
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
    linea.appendChild(el('span', 'pgs-de', ' de ' + usd(d.meta) + ' · meta ' + mesActualTxt()));
    txt.appendChild(linea);
    var dias = (d.diasSin === null || d.diasSin === undefined) ? null : Number(d.diasSin);
    if ((Number(d.mc) || 0) <= 0) txt.appendChild(el('span', 'pgs-sub rojo', 'Sin ventas este mes · la primera marca el ritmo'));
    else if (dias !== null && dias >= 3) txt.appendChild(el('span', 'pgs-sub alerta', dias + ' días sin cotizar'));
    else txt.appendChild(el('span', 'pgs-sub', Math.round(Number(d.pct) || 0) + '% de la meta'));
    b.appendChild(txt);

    /* v4: en la columna, debajo del anillo: "$28.4k" y "META OCTUBRE" (o el aviso corto) */
    var mini = el('span', 'pgs-mini');
    mini.appendChild(el('b', null, compacto(d.mc)));
    if ((Number(d.mc) || 0) <= 0) mini.appendChild(el('small', 'rojo', 'Sin ventas'));
    else if (dias !== null && dias >= 3) mini.appendChild(el('small', 'alerta', dias + 'd sin cotizar'));
    else mini.appendChild(el('small', null, 'meta ' + mesActualTxt()));
    b.appendChild(mini);
    b.title = 'Mi proceso · ' + usd(d.mc) + ' de ' + usd(d.meta) + ' · meta ' + mesActualTxt();

    b.addEventListener('click', function () {
      if (pagina() === 'gabi-asesor.html') {        // v5: ya estás en Mi proceso → subir, sin navegar ni registrar
        try { global.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) {}
        return;
      }
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

  /* v6: lo guardado ya, y si tiene más de 5 min, lo nuevo detrás */
  function rapido(cli, clave, viejo, alPintar) {
    var por = cli.schema('portal'), a = { p_clave: clave };
    function vivo(fresco) {
      por.rpc('refrescar', a).then(function (r) {
        if (r && !r.error) { try { alPintar(r.data, fresco); } catch (e) {} }
        else if (!fresco) viejo();
      }, function () { if (!fresco) viejo(); });
    }
    try {
      por.rpc('rapido', a).then(function (r) {
        if (!r || r.error) { viejo(); return; }          // base sin caché: como antes
        var c = r.data;
        if (c) { try { alPintar(c.datos, false); } catch (e) {} if (Number(c.edad) > 300) vivo(true); }
        else vivo(false);
      }, function () { viejo(); });
    } catch (e) { viejo(); }
  }
  /* la sesión, apenas la página la tenga (una sola vez) */
  function conSesion(cli, fn) {
    var hecho = false;
    function una(s) { if (hecho || !s || !s.user) return; hecho = true; fn(s); }
    try { if (typeof global.pgSesionActual === 'function') { var s0 = global.pgSesionActual(); if (s0 && s0.user) { una(s0); return; } } } catch (e) {}
    try { if (typeof global.pgOnSesion === 'function') global.pgOnSesion(una); } catch (e) {}
    try { cli.auth.getSession().then(function (r) { una(r && r.data && r.data.session); }, function () {}); } catch (e) {}
  }

  function arrancar() {
    var verComo = false;
    try { verComo = !!new URLSearchParams(global.location.search).get('ver_como'); } catch (e) {}
    var cli = cliente();
    if (!cli) return;
    conSesion(cli, function (s) {
      if (EXTERNOS.indexOf(String(s.user.email || '').toLowerCase()) >= 0) return;
      /* las dos piezas se piden a la vez */
      rapido(cli, 'top_mes_vigente', function () {
        try { cli.schema('portal').rpc('top_mes_vigente').then(function (res) {
          if (!res || res.error || !res.data) return; try { pintarTop(res.data); } catch (e) {} }, function () {}); } catch (e) {}
      }, function (d, fresco) {
        if (!d) return;
        if (fresco) { cerrarPanel(); var v = document.getElementById('pgsTop'); if (v) v.remove(); }
        pintarTop(d);
      });
      if (!verComo) {
        rapido(cli, 'mi_sombra', function () {
          try { cli.schema('public').rpc('mi_sombra').then(function (res) {
            if (!res || res.error || !res.data) return; try { pintarSombra(res.data, cli); } catch (e) {} }, function () {}); } catch (e) {}
        }, function (d, fresco) {
          if (!d) return;                                   // no es asesor: solo la barrita
          if (fresco) { var v = document.getElementById('pgSombra'); if (v) v.remove(); }
          pintarSombra(d, cli);
        });
      }
    });
  }

  var intentos = 0;
  function esperar() {
    if (global.supabase && global.supabase.createClient) { arrancar(); return; }
    if (++intentos > 100) return;           // ~10 s sin supabase-js: no se pinta
    setTimeout(esperar, 100);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', esperar);   // v6: sin reloj de 200 ms
  else esperar();
})(window);
