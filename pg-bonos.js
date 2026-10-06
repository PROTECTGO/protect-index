/* ============================================================
   GABI · pg-bonos.js v2 — la pastilla dorada "BONOS OCT · hasta $850.000" que acompaña a la
   persona por todas las herramientas del portal.  6-oct-2026.

   Pieza hermana de pg-sombra.js: mismo estilo (IIFE, candado global,
   cliente compartido, CSS inyectado con id, todo texto de la base con
   textContent, nunca rompe la página).

   v2 (6-oct, carga inmediata): sale de portal.rapido('bonos') (~10 ms) y se
   repinta solo si portal.refrescar() trae algo más nuevo (más de 5 min);
   arranca apenas la página tiene sesión, sin reloj de 200 ms.

   Qué hace:
   - Una pastilla fija arriba a la derecha (o, si hay un botón "Salir"
     visible en la franja de arriba, pegada justo antes de él).
     Un toque abre un panel chico con los bonos del mes; otro toque,
     clic afuera o Escape lo cierra.
   - Sale de portal.bonos_mes_vigente() (una llamada al arrancar y otra
     al volver a la pestaña si pasaron 10 minutos o más).
   - Asesor del equipo: barrita de progreso por bono y lo que le falta.
     Dirección / áreas: quién va y cuántos ya lo lograron.
     Sin plan publicado: "BONOS OCT · en camino".

   Reglas:
   - Sin sesión, cuenta externa (Leonis, UTS), página de recuperar o de
     firma, o error en la base: no se pinta nada.
   - Con ?ver_como=correo se pide con p_nombre = ese correo (la base lo
     autoriza solo a dirección; si da error, no se pinta).
   - Nada en localStorage ni sessionStorage.
   - Todo texto de la base va con textContent; fotos solo por https.
   - API pública: window.pgBonosDatos (último objeto recibido) y el
     evento 'pg-bonos' en document con { detail: datos }.
   ============================================================ */
(function (global) {
  'use strict';
  if (global.__pgBonosListo) return;
  global.__pgBonosListo = true;

  var URL_SB   = 'https://hivpqsepwsfmafamxkzy.supabase.co';
  var KEY_SB   = 'sb_publishable_Kak00GbGVt2K3yGh6IBZvw_99IybVvt';
  var EXTERNOS = ['gerencia@leonis-go.com', 'quoteautocomercial@gmail.com'];
  var SIN_PINTAR = /^(recuperar\.html|firma-protectgo\.html)$/i;   // donde no va la pastilla
  var AMBAR = '#D9A520', MINT = '#2DBFA3', PISTA = '#35566A', FONDO = '#0D3040';
  var GRIS = '#7E95A4', GRIS_CLARO = '#9FB2BF';
  var MESES = ['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'];
  var REFRESCO_MS = 10 * 60 * 1000;   // 10 minutos

  var datos = null;          // último objeto recibido
  var ultimaCarga = 0;       // marca de tiempo de la última respuesta buena
  var cont = null;           // contenedor: pastilla + panel
  var abierto = false;
  var cargando = false;
  var cliGlobal = null;
  var verComoCorreo = '';

  function pagina() { try { return global.location.pathname.split('/').pop() || 'index.html'; } catch (e) { return ''; } }

  /* ---------- helpers (los mismos de pg-sombra) ---------- */
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
  function esNum(n) { return n !== null && n !== undefined && n !== '' && isFinite(Number(n)); }

  /* dólares: $41,925 (coma de miles) · sin dato: guion */
  function usd(n) {
    if (!esNum(n)) return '—';
    n = Math.round(Number(n));
    return '$' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  }
  /* pesos colombianos: $400.000 (punto de miles) · sin dato: guion */
  function cop(n) {
    if (!esNum(n)) return '—';
    n = Math.round(Number(n));
    return '$' + n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  }
  function capital(m) { m = String(m || ''); return m.charAt(0).toUpperCase() + m.slice(1); }
  function abrevMes(m) {
    var s = String(m || '').trim();
    return s ? s.slice(0, 3).toLocaleUpperCase('es') : '—';
  }
  /* '2026-11-02' -> '2 de noviembre' (vacío si no se entiende) */
  function fechaPago(p) {
    var m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(p || ''));
    if (!m) return '';
    var mes = MESES[Number(m[2]) - 1];
    if (!mes) return '';
    return Number(m[3]) + ' de ' + mes;
  }
  function clamp(p) { p = Number(p); if (!isFinite(p)) return 0; return Math.max(0, Math.min(100, p)); }

  /* ---------- estilos ---------- */
  /* 6-oct (Andrés): "que destaque más, más práctico y armonioso". La pastilla es dorada
     (el color del dinero en la casa) con un brillo suave; el panel mantiene el azul de la
     columna del top y dice primero lo que importa: cuánto te puedes llevar y cuánto te falta. */
  function estilos() {
    if (document.getElementById('pgbonos-css')) return;
    var st = document.createElement('style');
    st.id = 'pgbonos-css';
    var F = 'Inter,system-ui,-apple-system,"Segoe UI",Roboto,Arial,sans-serif';
    var M = 'ui-monospace,SFMono-Regular,Menlo,Consolas,monospace';
    st.textContent =
      '#pgBonos{position:relative;display:inline-block;flex:0 0 auto;vertical-align:middle;font:600 12.5px/1.2 ' + F + ';color:#fff;}' +
      '#pgBonos.pgb-en-header{margin-right:12px;}' +
      '#pgBonos.pgb-fijo{position:fixed;top:14px;right:16px;z-index:99993;margin:0;}' +
      '#pgBonos.pgb-abierto.pgb-fijo{z-index:99994;}' +
      /* la pastilla dorada */
      '#pgBonos .pgb-pill{position:relative;overflow:hidden;display:inline-flex;align-items:center;gap:9px;margin:0;cursor:pointer;' +
        'background:linear-gradient(135deg,#F4C95A 0%,' + AMBAR + ' 55%,#C8951A 100%);color:' + FONDO + ';border:0;border-radius:999px;' +
        'padding:6px 6px 6px 12px;font:800 11px/1 Montserrat,' + F + ';letter-spacing:.12em;text-transform:uppercase;white-space:nowrap;' +
        'box-shadow:0 6px 20px rgba(217,165,32,.42),inset 0 1px 0 rgba(255,255,255,.45);transition:transform .15s ease,box-shadow .15s ease;}' +
      '#pgBonos .pgb-pill:hover{transform:translateY(-1px);box-shadow:0 9px 26px rgba(217,165,32,.55),inset 0 1px 0 rgba(255,255,255,.45);}' +
      '#pgBonos .pgb-pill:focus-visible{outline:2px solid ' + FONDO + ';outline-offset:3px;}' +
      '#pgBonos .pgb-pill::after{content:"";position:absolute;top:0;bottom:0;left:-60%;width:40%;pointer-events:none;' +
        'background:linear-gradient(100deg,rgba(255,255,255,0) 0%,rgba(255,255,255,.55) 50%,rgba(255,255,255,0) 100%);' +
        'transform:skewX(-18deg);animation:pgbBrillo 7s ease-in-out 1.2s infinite;}' +
      '@keyframes pgbBrillo{0%{left:-60%}18%{left:130%}100%{left:130%}}' +
      '#pgBonos .pgb-ico{width:16px;height:16px;flex:0 0 16px;display:block;}' +
      '#pgBonos .pgb-chip{display:inline-flex;align-items:center;gap:6px;background:' + FONDO + ';color:#fff;border-radius:999px;padding:6px 10px 6px 10px;' +
        'font:700 11.5px/1 ' + M + ';letter-spacing:0;text-transform:none;}' +
      '#pgBonos .pgb-chip small{font:700 9px/1 Montserrat,' + F + ';letter-spacing:.1em;text-transform:uppercase;color:' + GRIS_CLARO + ';}' +
      '#pgBonos .pgb-chip .ok{color:' + MINT + ';}' +
      '#pgBonos .pgb-flecha{width:0;height:0;border-left:4px solid transparent;border-right:4px solid transparent;border-top:5px solid ' + AMBAR + ';transition:transform .2s ease;}' +
      '#pgBonos.pgb-abierto .pgb-flecha{transform:rotate(180deg);}' +
      /* sin plan: discreta */
      '#pgBonos .pgb-pill.pgb-espera{background:' + FONDO + ';color:#fff;padding:8px 14px;box-shadow:0 6px 18px rgba(13,48,64,.28);}' +
      '#pgBonos .pgb-pill.pgb-espera::after{display:none;}' +
      '#pgBonos .pgb-pill.pgb-espera .pgb-flecha{border-top-color:' + GRIS_CLARO + ';}' +
      /* el panel */
      '#pgBonos .pgb-panel{display:none;position:absolute;top:calc(100% + 10px);right:0;z-index:99994;width:350px;max-width:calc(100vw - 20px);' +
        'box-sizing:border-box;max-height:min(76vh,600px);overflow-y:auto;overflow-x:hidden;overscroll-behavior:contain;background:' + FONDO + ';color:#fff;' +
        'border-radius:18px;border:1px solid rgba(255,255,255,.07);box-shadow:0 18px 44px rgba(13,48,64,.38);text-align:left;text-transform:none;letter-spacing:0;}' +
      '#pgBonos.pgb-abierto .pgb-panel{display:block;animation:pgbEntra .18s ease-out;}' +
      '@keyframes pgbEntra{from{opacity:0;transform:translateY(-4px)}to{opacity:1;transform:none}}' +
      '#pgBonos .pgb-cab{position:relative;padding:14px 16px 14px;background:linear-gradient(135deg,rgba(244,201,90,.16),rgba(217,165,32,0) 70%);border-bottom:1px solid #24404F;}' +
      '#pgBonos .pgb-k{font:800 9.5px/1 Montserrat,' + F + ';letter-spacing:.16em;text-transform:uppercase;color:' + AMBAR + ';}' +
      '#pgBonos .pgb-total{font:800 26px/1.05 ' + M + ';color:#fff;letter-spacing:-.02em;margin-top:7px;}' +
      '#pgBonos .pgb-total small{font:700 12px/1 ' + F + ';color:' + GRIS_CLARO + ';letter-spacing:0;margin-right:6px;}' +
      '#pgBonos .pgb-sub{font:600 11.5px/1.4 ' + F + ';color:' + GRIS_CLARO + ';margin-top:6px;}' +
      '#pgBonos .pgb-sub b{color:#fff;}' +
      '#pgBonos .pgb-x{position:absolute;top:10px;right:10px;background:rgba(255,255,255,.06);border:0;color:' + GRIS_CLARO + ';width:28px;height:28px;border-radius:50%;' +
        'font:600 18px/28px ' + F + ';cursor:pointer;padding:0;text-align:center;}' +
      '#pgBonos .pgb-x:hover{color:#fff;background:rgba(255,255,255,.12);}' +
      '#pgBonos .pgb-llevo{display:flex;gap:8px;margin-top:11px;}' +
      '#pgBonos .pgb-llevo span{flex:1;background:rgba(255,255,255,.06);border-radius:10px;padding:7px 9px;font:600 10px/1.2 ' + F + ';color:' + GRIS_CLARO + ';}' +
      '#pgBonos .pgb-llevo b{display:block;font:700 13.5px/1.2 ' + M + ';color:#fff;margin-top:3px;}' +
      '#pgBonos .pgb-vacio{padding:16px;font:600 12.5px/1.5 ' + F + ';color:' + GRIS_CLARO + ';}' +
      '#pgBonos .pgb-lista{padding:6px 10px 4px;}' +
      '#pgBonos .pgb-fila{display:grid;grid-template-columns:48px 1fr;gap:12px;align-items:center;padding:10px 6px;border-radius:12px;}' +
      '#pgBonos .pgb-fila+.pgb-fila{border-top:1px solid #24404F;border-radius:0;}' +
      '#pgBonos .pgb-anillo{position:relative;width:48px;height:48px;border-radius:50%;}' +
      '#pgBonos .pgb-anillo i{position:absolute;inset:5px;border-radius:50%;background:' + FONDO + ';display:flex;align-items:center;justify-content:center;' +
        'font:800 12.5px/1 ' + M + ';font-style:normal;color:#fff;}' +
      '#pgBonos .pgb-anillo.ok i{color:' + MINT + ';font-size:18px;}' +
      '#pgBonos .pgb-cuerpo{min-width:0;}' +
      '#pgBonos .pgb-l1{display:flex;align-items:baseline;justify-content:space-between;gap:10px;}' +
      '#pgBonos .pgb-nom{font:700 13px/1.25 ' + F + ';min-width:0;}' +
      '#pgBonos .pgb-monto{font:800 14px/1.2 ' + M + ';color:' + AMBAR + ';white-space:nowrap;}' +
      '#pgBonos .pgb-falta{font:700 12px/1.35 ' + F + ';color:#fff;margin-top:4px;}' +
      '#pgBonos .pgb-falta .n{font-family:' + M + ';color:' + AMBAR + ';}' +
      '#pgBonos .pgb-falta.ok{color:' + MINT + ';}' +
      '#pgBonos .pgb-det{font:600 10.5px/1.35 ' + F + ';color:' + GRIS_CLARO + ';margin-top:2px;}' +
      '#pgBonos .pgb-extra{margin-top:7px;display:flex;align-items:center;gap:7px;background:rgba(217,165,32,.10);border:1px dashed rgba(217,165,32,.45);' +
        'border-radius:9px;padding:6px 8px;font:600 10.5px/1.35 ' + F + ';color:#F3DDA0;}' +
      '#pgBonos .pgb-extra b{font-family:' + M + ';color:' + AMBAR + ';white-space:nowrap;}' +
      '#pgBonos .pgb-extra.ok{background:rgba(45,191,163,.12);border-color:rgba(45,191,163,.45);color:' + MINT + ';}' +
      '#pgBonos .pgb-van{display:flex;align-items:center;flex-wrap:wrap;gap:5px 10px;margin-top:6px;font:600 11px/1.2 ' + F + ';color:' + GRIS_CLARO + ';}' +
      '#pgBonos .pgb-pers{display:inline-flex;align-items:center;gap:5px;}' +
      '#pgBonos .pgb-cara{width:22px;height:22px;border-radius:50%;background:' + PISTA + ' center/cover no-repeat;display:inline-flex;align-items:center;' +
        'justify-content:center;font:800 8.5px/1 ' + F + ';color:#fff;flex:0 0 22px;}' +
      '#pgBonos .pgb-pct{font:700 10.5px/1 ' + M + ';color:#fff;}' +
      '#pgBonos .pgb-ico-grande{width:48px;height:48px;border-radius:50%;background:rgba(217,165,32,.14);display:flex;align-items:center;justify-content:center;}' +
      '#pgBonos .pgb-ico-grande svg{width:22px;height:22px;}' +
      '#pgBonos .pgb-todo{margin:4px 16px 0;padding:9px 11px;border-radius:10px;background:rgba(45,191,163,.10);font:600 11.5px/1.45 ' + F + ';color:#CFEFE7;}' +
      '#pgBonos .pgb-todo b{font-family:' + M + ';color:' + MINT + ';}' +
      '#pgBonos .pgb-pie{padding:12px 16px 14px;}' +
      '#pgBonos .pgb-boton{display:block;text-align:center;background:linear-gradient(135deg,#F4C95A,' + AMBAR + ');color:' + FONDO + ';border-radius:11px;padding:11px 12px;' +
        'font:800 12px/1 Montserrat,' + F + ';letter-spacing:.04em;text-decoration:none;box-shadow:0 6px 16px rgba(217,165,32,.3);}' +
      '#pgBonos .pgb-boton:hover{filter:brightness(1.05);}' +
      '#pgBonos .pgb-nota{font:600 10.5px/1.45 ' + F + ';color:' + GRIS + ';margin-top:9px;text-align:center;}' +
      /* teléfono */
      '@media (max-width:640px){' +
        '#pgBonos.pgb-fijo{top:10px;right:10px;}' +
        '#pgBonos .pgb-pill{font-size:10px;gap:7px;padding:5px 5px 5px 10px;}' +
        '#pgBonos .pgb-chip{font-size:10.5px;padding:5px 8px;}' +
        '#pgBonos .pgb-panel{position:fixed;left:10px;right:10px;top:56px;width:auto;max-width:none;max-height:calc(100vh - 76px);}' +
        '#pgBonos .pgb-total{font-size:23px;}' +
      '}' +
      '@media (max-width:380px){#pgBonos .pgb-chip small{display:none;}}' +
      '@media (prefers-reduced-motion:reduce){#pgBonos .pgb-pill::after{animation:none;display:none;}#pgBonos.pgb-abierto .pgb-panel{animation:none;}}' +
      '@media print{#pgBonos{display:none!important;}}';
    (document.head || document.documentElement).appendChild(st);
  }

  /* trofeo (SVG en línea, sin dependencias) */
  function icono(cls, color) {
    var ns = 'http://www.w3.org/2000/svg';
    var s = document.createElementNS(ns, 'svg');
    s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('fill', 'none'); s.setAttribute('stroke', color || 'currentColor');
    s.setAttribute('stroke-width', '2.2'); s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round');
    s.setAttribute('aria-hidden', 'true'); if (cls) s.setAttribute('class', cls);
    ['M8 21h8', 'M12 17v4', 'M7 4h10v5a5 5 0 0 1-10 0V4z', 'M17 6h2.5a1.5 1.5 0 0 1 0 3.5H17', 'M7 6H4.5a1.5 1.5 0 0 0 0 3.5H7'].forEach(function (d) {
      var p = document.createElementNS(ns, 'path'); p.setAttribute('d', d); s.appendChild(p);
    });
    return s;
  }

  /* ---------- cuentas útiles ---------- */
  /* lo máximo que una persona se puede llevar este mes (respeta maxPorPersona) */
  function totalPosible(d) {
    var bonos = Array.isArray(d.bonos) ? d.bonos : [];
    var montos = bonos.map(function (b) { return (Number(b.monto_cop) || 0) + (b.extra ? (Number(b.extra.monto_cop) || 0) : 0); })
                      .sort(function (a, b) { return b - a; });
    var max = Number(d.maxPorPersona) > 0 ? Number(d.maxPorPersona) : montos.length;
    return montos.slice(0, max).reduce(function (a, b) { return a + b; }, 0);
  }
  /* lo que ya tiene asegurado (si el mes cerrara hoy) */
  function ganadoHoy(d) {
    var t = 0;
    (Array.isArray(d.bonos) ? d.bonos : []).forEach(function (b) {
      if (b && b.yo && b.yo.cumple) t += Number(b.monto_cop) || 0;
      if (b && b.yo && b.yo.extra && b.yo.extra.cumple && b.extra) t += Number(b.extra.monto_cop) || 0;
    });
    return t;
  }
  /* días hábiles que quedan del mes, sin contar hoy (igual que "Días que quedan del mes" en Mi Proceso) */
  function habilesQuedan() {
    var h = new Date(), fin = new Date(h.getFullYear(), h.getMonth() + 1, 0), n = 0;
    for (var x = new Date(h.getFullYear(), h.getMonth(), h.getDate() + 1); x <= fin; x.setDate(x.getDate() + 1)) {
      var w = x.getDay(); if (w !== 0 && w !== 6) n++;
    }
    return n;
  }

  /* ---------- una fila por bono ---------- */
  function anillo(pct, ok) {
    var a = el('span', 'pgb-anillo' + (ok ? ' ok' : ''));
    var c = ok ? MINT : (pct >= 50 ? AMBAR : '#8FA5B3');
    a.style.background = 'conic-gradient(' + c + ' 0 ' + pct + '%,' + PISTA + ' ' + pct + '% 100%)';
    a.appendChild(el('i', null, ok ? '✓' : (Math.round(pct) + '%')));
    return a;
  }
  function filaBono(b) {
    var fila = el('div', 'pgb-fila');
    if (b.regla) fila.title = String(b.regla);
    var y = b.yo, premium = b.medida === 'premium';
    if (y) fila.appendChild(anillo(clamp(y.pct), !!y.cumple));
    else { var g = el('span', 'pgb-ico-grande'); g.appendChild(icono(null, AMBAR)); fila.appendChild(g); }

    var cu = el('div', 'pgb-cuerpo');
    var l1 = el('div', 'pgb-l1');
    l1.appendChild(el('span', 'pgb-nom', b.nombre || '—'));
    l1.appendChild(el('span', 'pgb-monto', cop(b.monto_cop)));
    cu.appendChild(l1);

    if (y) {
      if (y.cumple) cu.appendChild(el('div', 'pgb-falta ok', '✓ Lo tienes. Sostenlo hasta el cierre.'));
      else {
        var f = el('div', 'pgb-falta');
        f.appendChild(document.createTextNode('Te faltan '));
        f.appendChild(el('span', 'n', usd(y.falta)));
        f.appendChild(document.createTextNode(premium ? ' de premium' : ' de combinada'));
        cu.appendChild(f);
      }
      cu.appendChild(el('div', 'pgb-det', 'Llevas ' + usd(y.valor) + ' de ' + usd(b.objetivo) + (premium ? ' · premium neto' : ' · premium + fee cobrado × 10')));
    } else {
      cu.appendChild(el('div', 'pgb-det', premium ? ('Premium neto de ' + usd(b.objetivo)) : ('Combinada de ' + usd(b.objetivo))));
      var van = Array.isArray(b.van) ? b.van.slice(0, 3) : [];
      var bloque = el('div', 'pgb-van');
      if (!van.length) bloque.appendChild(el('span', null, 'Todavía nadie arranca'));
      else {
        bloque.appendChild(el('span', null, 'Van:'));
        van.forEach(function (p) {
          var w = el('span', 'pgb-pers'), c = el('span', 'pgb-cara');
          if (fotoOk(p.foto)) c.style.backgroundImage = 'url("' + p.foto + '")'; else c.textContent = iniciales(p.nombre);
          w.title = String(p.nombre || '');
          w.appendChild(c);
          w.appendChild(el('span', 'pgb-pct', esNum(p.pct) ? (Math.round(Number(p.pct)) + '%') : '—'));
          bloque.appendChild(w);
        });
      }
      if (Number(b.logrados) > 0) bloque.appendChild(el('span', null, '· ya lo lograron: ' + Number(b.logrados)));
      cu.appendChild(bloque);
    }

    if (b.extra) {
      var e = b.extra, ec = e.condiciones || {}, ye = y && y.extra;
      var ex = el('div', 'pgb-extra' + (ye && ye.cumple ? ' ok' : ''));
      ex.appendChild(el('b', null, '+' + cop(e.monto_cop)));
      var t = ye && ye.cumple ? 'Extra ganado'
            : ('si además llegas a ' + usd(ec.combinada_min) + ' de combinada' + (ye ? ' (te faltan ' + usd(ye.falta_mc) + ')' : ''));
      ex.appendChild(el('span', null, t));
      cu.appendChild(ex);
    }
    fila.appendChild(cu);
    return fila;
  }

  /* ---------- el panel completo ---------- */
  function construirPanel(d) {
    var p = el('div', 'pgb-panel');
    p.id = 'pgBonosPanel';
    p.setAttribute('role', 'dialog');
    p.setAttribute('aria-label', 'Bonos de ' + (d.mesTxt || 'el mes'));
    var mes = String(d.mesTxt || 'este mes').toLowerCase();
    var sinPlan = !d.plan;

    var cab = el('div', 'pgb-cab');
    cab.appendChild(el('div', 'pgb-k', 'Bonos de ' + mes + ' · ProtectGo'));
    var x = el('button', 'pgb-x', '×'); x.type = 'button'; x.title = 'Cerrar'; x.setAttribute('aria-label', 'Cerrar');
    x.addEventListener('click', function (e) { e.stopPropagation(); cerrar(true); });
    cab.appendChild(x);
    if (sinPlan) {
      p.appendChild(cab);
      p.appendChild(el('div', 'pgb-vacio', 'Los bonos de ' + mes + ' se publican en los próximos días. Apenas salgan, aquí ves cuánto te puedes llevar y cuánto te falta.'));
      return p;
    }
    var tot = el('div', 'pgb-total');
    tot.appendChild(el('small', null, d.yo ? 'Te puedes llevar hasta' : 'Cada asesor puede llevarse hasta'));
    tot.appendChild(document.createElement('br'));
    tot.appendChild(document.createTextNode(cop(totalPosible(d))));
    cab.appendChild(tot);
    var sub = el('div', 'pgb-sub');
    var pago = fechaPago(d.pago), hq = habilesQuedan();
    sub.textContent = (pago ? 'Se pagan el ' + pago + ' · ' : '') + 'quedan ' + hq + (hq === 1 ? ' día hábil' : ' días hábiles') + ' del mes';
    cab.appendChild(sub);
    if (d.yo) {
      var ll = el('div', 'pgb-llevo');
      var s1 = el('span', null, 'Mi combinada'); s1.appendChild(el('b', null, usd(d.yo.mc)));
      var s2 = el('span', null, 'Mi premium'); s2.appendChild(el('b', null, usd(d.yo.premium)));
      var g = ganadoHoy(d);
      var s3 = el('span', null, 'Ya asegurado'); s3.appendChild(el('b', null, g > 0 ? cop(g) : '—'));
      ll.appendChild(s1); ll.appendChild(s2); ll.appendChild(s3);
      cab.appendChild(ll);
    }
    p.appendChild(cab);

    var lista = el('div', 'pgb-lista');
    var bonos = Array.isArray(d.bonos) ? d.bonos : [];
    if (!bonos.length) lista.appendChild(el('div', 'pgb-vacio', '—'));
    bonos.forEach(function (b) { try { if (b) lista.appendChild(filaBono(b)); } catch (e) {} });
    p.appendChild(lista);

    if (d.yo && bonos.length > 1 && ganadoHoy(d) < totalPosible(d)) {
      var todo = el('div', 'pgb-todo');
      todo.appendChild(document.createTextNode('Cumpliendo todo te llevas '));
      todo.appendChild(el('b', null, cop(totalPosible(d))));
      todo.appendChild(document.createTextNode('. Son acumulables y se pagan aparte de la comisión.'));
      p.appendChild(todo);
    }

    var pie = el('div', 'pgb-pie');
    if (d.yo) {
      var enMiProceso = pagina().toLowerCase() === 'gabi-asesor.html';
      var a = el('a', 'pgb-boton', enMiProceso ? 'Ver condiciones en Mis números →' : 'Ver condiciones y mi avance →');
      var rel = (global.location.pathname || '').indexOf('/amazon-relay/') >= 0 ? '../' : '';
      a.href = enMiProceso ? '#bonos' : rel + 'gabi-asesor.html#bonos';
      a.addEventListener('click', function (e) {
        if (enMiProceso && typeof global.irABonos === 'function') { e.preventDefault(); cerrar(false); try { global.irABonos(); } catch (er) {} }
      });
      pie.appendChild(a);
    }
    if (d.nota) pie.appendChild(el('div', 'pgb-nota', d.nota));
    if (pie.firstChild) p.appendChild(pie);
    return p;
  }

  /* ---------- pintar / repintar (conserva abierto/cerrado) ---------- */
  function pintar(d) {
    estilos();
    var primera = !cont;
    if (primera) {
      cont = el('span'); cont.id = 'pgBonos';
    } else {
      while (cont.firstChild) cont.removeChild(cont.firstChild);
    }

    var sinPlan = !d.plan;
    var pill = el('button', 'pgb-pill' + (sinPlan ? ' pgb-espera' : '')); pill.type = 'button';
    pill.setAttribute('aria-expanded', abierto ? 'true' : 'false');
    pill.setAttribute('aria-controls', 'pgBonosPanel');
    if (sinPlan) {
      pill.appendChild(el('span', null, 'BONOS ' + abrevMes(d.mesTxt) + ' · en camino'));
      pill.appendChild(el('i', 'pgb-flecha'));
    } else {
      pill.appendChild(icono('pgb-ico', FONDO));
      pill.appendChild(el('span', null, 'BONOS ' + abrevMes(d.mesTxt)));
      var chip = el('span', 'pgb-chip');
      var g = d.yo ? ganadoHoy(d) : 0;
      if (g > 0) { chip.appendChild(el('span', 'ok', '✓')); chip.appendChild(document.createTextNode(cop(g))); }
      else { chip.appendChild(el('small', null, 'hasta')); chip.appendChild(document.createTextNode(cop(totalPosible(d)))); }
      chip.appendChild(el('i', 'pgb-flecha'));
      pill.appendChild(chip);
    }
    pill.title = 'Bonos de ' + (d.mesTxt || 'el mes');
    pill.addEventListener('click', function (e) { e.stopPropagation(); alternar(); });
    cont.appendChild(pill);
    cont.appendChild(construirPanel(d));
    cont.classList.toggle('pgb-abierto', abierto);

    if (primera) {
      var cuerpo = document.body || document.documentElement;
      cuerpo.appendChild(cont);
    }
    ubicar();
  }

  /* ---------- abrir / cerrar ---------- */
  function alternar() { if (abierto) cerrar(false); else abrir(); }
  function abrir() {
    if (!cont) return;
    abierto = true;
    cont.classList.add('pgb-abierto');
    var b = cont.querySelector('.pgb-pill'); if (b) b.setAttribute('aria-expanded', 'true');
  }
  function cerrar(devolverFoco) {
    if (!cont) return;
    abierto = false;
    cont.classList.remove('pgb-abierto');
    var b = cont.querySelector('.pgb-pill');
    if (b) { b.setAttribute('aria-expanded', 'false'); if (devolverFoco) { try { b.focus(); } catch (e) {} } }
  }
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && abierto) cerrar(true); });
  document.addEventListener('click', function (e) {
    if (!abierto || !cont) return;
    if (!cont.contains(e.target)) cerrar(false);
  });

  /* ---------- ubicar: al lado de "Salir" si está arriba, si no, fija ---------- */
  function visible(n) {
    try {
      var r = n.getBoundingClientRect();
      if (!(r.width > 0 && r.height > 0)) return false;
      var cs = global.getComputedStyle(n);
      return cs.visibility !== 'hidden' && cs.display !== 'none';
    } catch (e) { return false; }
  }
  function botonSalir() {
    var lista = [], i, n;
    try {
      n = document.querySelectorAll('[data-act="logout"]');
      for (i = 0; i < n.length; i++) lista.push(n[i]);
      n = document.querySelectorAll('button,a');
      for (i = 0; i < n.length; i++) if ((n[i].textContent || '').trim() === 'Salir') lista.push(n[i]);
    } catch (e) {}
    for (i = 0; i < lista.length; i++) {
      var b = lista[i];
      if (cont && cont.contains(b)) continue;
      if (!visible(b)) continue;
      if (b.getBoundingClientRect().top < 90) return b;
    }
    return null;
  }
  function ubicar() {
    try {
      if (!cont) return;
      var s = botonSalir();
      if (s && s.parentNode) {
        if (cont.nextSibling !== s || cont.parentNode !== s.parentNode) s.parentNode.insertBefore(cont, s);
        cont.classList.add('pgb-en-header');
        cont.classList.remove('pgb-fijo');
      } else if (!cont.classList.contains('pgb-en-header') || !cont.parentNode) {
        var cuerpo = document.body || document.documentElement;
        if (cont.parentNode !== cuerpo) cuerpo.appendChild(cont);
        cont.classList.add('pgb-fijo');
        cont.classList.remove('pgb-en-header');
      }
      /* si ya estaba en el header y Salir se esconde un momento, se queda donde está */
    } catch (e) {}
  }

  /* ---------- datos ---------- */
  function cliente() {
    try { if (typeof global.pgSB === 'function') { var c = global.pgSB(); if (c) return c; } } catch (e) {}
    try { if (typeof global.pgNovedadesCliente === 'function') { var c2 = global.pgNovedadesCliente(); if (c2) return c2; } } catch (e) {}
    if (!(global.supabase && global.supabase.createClient)) return null;
    try { return global.supabase.createClient(URL_SB, KEY_SB); } catch (e) { return null; }
  }

  function recibir(d) {
    datos = d;
    ultimaCarga = Date.now();
    try { global.pgBonosDatos = d; } catch (e) {}
    try { pintar(d); } catch (e) {}
    try { document.dispatchEvent(new CustomEvent('pg-bonos', { detail: d })); } catch (e) {}
  }

  function pedir(forzar) {
    if (cargando || !cliGlobal) return;
    cargando = true;
    var por = cliGlobal.schema('portal');
    var a = { p_clave: 'bonos' }; if (verComoCorreo) a.p_nombre = verComoCorreo;
    function bueno(d) { return d && typeof d === 'object'; }
    function viejo() {        /* base sin caché: la función de siempre */
      try {
        por.rpc('bonos_mes_vigente', verComoCorreo ? { p_nombre: verComoCorreo } : {}).then(function (res) {
          cargando = false; if (res && !res.error && bueno(res.data)) recibir(res.data);
        }, function () { cargando = false; });
      } catch (e) { cargando = false; }
    }
    function vivo(detras) {
      por.rpc('refrescar', a).then(function (r) {
        cargando = false;
        if (r && !r.error && bueno(r.data)) recibir(r.data); else if (!detras) viejo();
      }, function () { cargando = false; if (!detras) viejo(); });
    }
    try {
      if (forzar) { vivo(true); return; }
      por.rpc('rapido', a).then(function (r) {
        if (!r || r.error) { viejo(); return; }
        var c = r.data;
        if (c && bueno(c.datos)) { recibir(c.datos); if (Number(c.edad) > REFRESCO_MS / 2000) vivo(true); else cargando = false; }
        else vivo(false);
      }, function () { viejo(); });
    } catch (e) { cargando = false; }
  }

  document.addEventListener('visibilitychange', function () {
    try {
      if (document.visibilityState === 'visible' && datos && (Date.now() - ultimaCarga) >= REFRESCO_MS) pedir(true);
    } catch (e) {}
  });

  function arrancar() {
    if (SIN_PINTAR.test(pagina())) return;
    try { verComoCorreo = String(new URLSearchParams(global.location.search).get('ver_como') || '').trim(); } catch (e) {}
    var cli = cliente();
    if (!cli) return;
    cliGlobal = cli;
    var hecho = false;
    function una(s) {
      if (hecho || !s || !s.user) return; hecho = true;
      if (EXTERNOS.indexOf(String(s.user.email || '').toLowerCase()) >= 0) return;
      pedir();
      /* el header del Index a veces se pinta tarde: se vuelve a ubicar */
      setTimeout(ubicar, 1500);
      setTimeout(ubicar, 4000);
    }
    try { if (typeof global.pgSesionActual === 'function') { var s0 = global.pgSesionActual(); if (s0 && s0.user) { una(s0); return; } } } catch (e) {}
    try { if (typeof global.pgOnSesion === 'function') global.pgOnSesion(una); } catch (e) {}
    cli.auth.getSession().then(function (r) { una(r && r.data && r.data.session); }, function () {});
  }

  var intentos = 0;
  function esperar() {
    if (global.supabase && global.supabase.createClient) { try { arrancar(); } catch (e) {} return; }
    if (++intentos > 100) return;           // ~10 s sin supabase-js: no se pinta
    setTimeout(esperar, 100);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', esperar);   // v2: sin reloj
  else esperar();
})(window);
