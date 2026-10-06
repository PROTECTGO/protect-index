/* ============================================================
   GABI · pg-volver.js v2 — "← Volver al Index", igual en todas las
   herramientas del portal.  2-oct-2026 · v2 5-oct-2026.

   v2 (5-oct): en ESCRITORIO, cuando la columna de pg-sombra.js v4 está en
   pantalla (trae su propio volver arriba), esta pastilla se esconde: una
   sola forma de volver. En teléfono, o donde no hay columna (Mi Proceso,
   cuentas sin top ni meta), la pastilla sigue igual que en la v1.

   Qué hace:
   - Pone una sola pastilla fija ABAJO A LA IZQUIERDA (#pgVolver) que
     lleva al Index: el espejo del muelle de abajo a la derecha, mismo
     color, misma letra, misma sombra. Abajo nunca tapa la cabecera ni el
     logo de ninguna herramienta (arriba a la izquierda sí lo hacía en
     Control Maestro, Mapa de puestos y Quick Quote).
   - En teléfono el muelle ocupa todo el ancho de abajo: la pastilla se
     monta justo encima de él y lo sigue si el muelle crece (desplegable).
   - Si la página ya traía su #pgVolver, lo reviste con el estándar (no
     se duplica). Si traía enlaces sueltos "← Volver al portal" dentro
     del contenido, los esconde: queda una sola forma de volver.
   - No sale en el Index (ya estás), en recuperar ni en la firma.
   - En teléfono se achica. No sale al imprimir.
   - Nada en localStorage ni sessionStorage. Sin dependencias: no
     necesita supabase ni sesión.

   Cómo llega a cada página: pg-novedades.js v4.7 lo carga solo en las
   29 herramientas que cargan ese archivo. Mi Proceso (gabi-asesor.html
   v18) lo trae con su propio <script>. El candado __pgVolverListo deja
   una sola copia.
   ============================================================ */
(function (global) {
  'use strict';
  if (global.__pgVolverListo) return;
  global.__pgVolverListo = true;

  var DESTINO = 'index.html';
  var SIN = /^(index\.html|recuperar\.html|firma-protectgo\.html)$/i;

  function pagina() {
    try { return (global.location.pathname.split('/').pop() || 'index.html'); } catch (e) { return ''; }
  }

  function estilos() {
    if (document.getElementById('pgvolver-css')) return;
    var st = document.createElement('style');
    st.id = 'pgvolver-css';
    st.textContent =
      '#pgVolver.pg-volver{position:fixed;left:20px;bottom:20px;top:auto;right:auto;z-index:99991;display:inline-flex;align-items:center;gap:8px;' +
        'padding:9px 15px 9px 12px;border-radius:999px;background:#0D3040;color:#fff;text-decoration:none;cursor:pointer;' +
        'font:700 12.5px/1 Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif;letter-spacing:.01em;white-space:nowrap;' +
        'border:1px solid rgba(255,255,255,.18);box-shadow:0 3px 12px rgba(13,48,64,.28);-webkit-tap-highlight-color:transparent;' +
        'transition:background .15s ease,transform .15s ease;}' +
      '#pgVolver.pg-volver:hover{background:#163F54;}' +
      '#pgVolver.pg-volver:active{transform:translateY(1px);}' +
      '#pgVolver.pg-volver:focus-visible{outline:2px solid #2DBFA3;outline-offset:2px;}' +
      '#pgVolver.pg-volver .pgv-f{display:inline-block;width:14px;height:14px;flex:0 0 14px;}' +
      '#pgVolver.pg-volver .pgv-f svg{display:block;width:14px;height:14px;}' +
      '#pgVolver.pg-volver .pgv-t{display:inline-block;}' +
      '@media (max-width:640px){#pgVolver.pg-volver{left:10px;bottom:10px;padding:8px 12px 8px 10px;font-size:12px;}}' +
      '@media print{#pgVolver.pg-volver{display:none!important;}}';
    (document.head || document.documentElement).appendChild(st);
  }

  function flecha() {
    var w = document.createElement('span'); w.className = 'pgv-f'; w.setAttribute('aria-hidden', 'true');
    w.innerHTML = '<svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">' +
      '<path d="M10.5 3.5 6 8l4.5 4.5"/></svg>';
    return w;
  }

  function esVuelta(a) {
    var h = (a.getAttribute('href') || '').split(/[?#]/)[0].trim();
    if (!(/(^|\/)index\.html$/i.test(h) || h === './' || h === '/' || h === '.')) return false;
    var t = (a.textContent || '').replace(/\s+/g, ' ').trim();
    return t.length < 40 && /volver|portal|inicio|index|←|⇦/i.test(t);
  }

  function montar() {
    if (SIN.test(pagina())) return;
    if (!document.body) return;
    estilos();
    var a = document.getElementById('pgVolver');
    if (!a) {
      a = document.createElement('a');
      a.id = 'pgVolver';
      document.body.appendChild(a);
    }
    a.setAttribute('href', DESTINO);
    a.removeAttribute('style');                    // el estilo viejo pegado en el HTML se va
    a.classList.add('pg-volver');
    a.setAttribute('aria-label', 'Volver al Index');
    a.title = 'Volver al Index';
    while (a.firstChild) a.removeChild(a.firstChild);
    a.appendChild(flecha());
    var t = document.createElement('span'); t.className = 'pgv-t';
    var fijo = document.createTextNode('Index');
    var sp = document.createElement('span'); sp.textContent = 'Volver al ';
    t.appendChild(sp); t.appendChild(fijo);
    a.appendChild(t);

    /* una sola forma de volver: los enlaces sueltos del contenido se esconden */
    try {
      var otros = document.querySelectorAll('a[href]');
      for (var i = 0; i < otros.length; i++) {
        var x = otros[i];
        if (x === a || x.closest('#pgMuelle')) continue;
        if (esVuelta(x)) x.style.display = 'none';
      }
    } catch (e) {}
  }

  /* en teléfono el muelle (#pgMuelle) va a lo ancho de abajo: la pastilla se sube encima */
  function acomodar() {
    var a = document.getElementById('pgVolver'); if (!a) return;
    var m = document.getElementById('pgMuelle');
    var angosto = false; try { angosto = global.matchMedia('(max-width:640px)').matches; } catch (e) {}
    var r = m ? m.getBoundingClientRect() : null;        // el muelle es fixed: offsetParent no sirve
    /* v2: en escritorio, si la columna ya trae su volver, esta pastilla sobra */
    var vCol = m ? m.querySelector('.pgs-volver') : null;
    var colConVolver = !angosto && vCol && vCol.getBoundingClientRect().width > 0;
    a.style.display = colConVolver ? 'none' : '';
    if (colConVolver) return;
    if (angosto && r && r.height > 0 && r.width > 0) {
      a.style.bottom = Math.round(global.innerHeight - r.top + 10) + 'px';
    } else {
      a.style.bottom = '';
    }
  }
  function arrancar() {
    montar(); acomodar();
    setTimeout(function () { montar(); acomodar(); }, 1200);   // cabeceras que se pintan después
    setInterval(acomodar, 700);                                 // el muelle aparece y crece a su ritmo
    global.addEventListener('resize', acomodar);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar);
  else arrancar();
})(window);
