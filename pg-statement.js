/* ============================================================
   GABI · pg-statement.js v4 — el documento REPORTE DE COMISIONES (statement).
   12-nov-2026 · v4.1: % sobre premium exacto (premium × % MGA × % persona) cuando cuadra con el monto.
   12-nov-2026 · v4 (R8): formato de Jeff, versión amigable. Banda "VENTAS <MES> <AÑO>",
   tabla de ventas con casillas (Mes · Cliente · MGA · Transaction · Premium · [Seller · Cargo] ·
   % sobre premium · Comisión · Notas), lo pendiente de statement de la MGA va DENTRO de la tabla
   como línea normal sin comisión y con la nota "Pendiente por MGA", cuadro PREMIUM por tipo,
   RESUMEN con el total a pagar, tarjeta del total arriba, meta del equipo para el líder,
   logo y colores de la agencia, hoja carta horizontal al imprimir. Opción B (Andrés, 12-nov):
   nadie ve el % de la MGA; solo el % sobre el premium.
   Historia: v3 28-oct (Premium y % sobre premium) · v2 26-oct (bloques por cargo) · v1 23-oct.
   Lo usan Statement · FAM (fam-comisiones.html), Mi statement (mi-statement.html) y
   Comisiones agentes (comisiones-agentes.html). Un solo dibujo para todos: lo que FAM ve en
   "Ver como lo verá X" es exactamente lo que recibe la persona.

   API (igual que v3):
     pgStatement.html(doc)  -> string con el documento (trae su <style> propio, clases pgst-*).
                               doc = portal.com_statement_doc / com_statements.doc.
     pgStatement.abrir(doc) -> ventana nueva con el documento y print(). false si el navegador
                               bloqueó la ventana.

   Lee docs viejos sin romperse: sin 'bloques' usa 'lineas'; sin 'pendientes' usa 'en_camino';
   sin 'periodo' saca el mes de 'periodo_txt' o del número CS.
   Reglas: nada guardado en el navegador, sin dependencias, todo texto escapado, "—" cuando no
   hay dato, 400 px sin barra horizontal de página (la tabla se desliza dentro de su caja).
   ============================================================ */
(function () {
  "use strict";

  var LOGO = (function () {
    try {
      var s = document.currentScript && document.currentScript.src;
      if (s) return s.replace(/[^\/?#]*([?#].*)?$/, '') + 'fotos/logo-protectgo.png';
    } catch (e) {}
    return 'fotos/logo-protectgo.png';
  })();
  var NOTA_PEND = 'Pendiente por MGA';
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
  var TIPOS = ['Sale', 'Endorsement', 'Fees', 'Cancellation', 'MVR', 'Residual'];
  var ORDEN_X = ['Renewal', 'Regulatory', 'Negativo', 'Other'];

  function esc(s) {
    return s == null ? '' : String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function hay(n) { return n !== null && n !== undefined && n !== '' && !isNaN(+n); }
  function money(n, guionSiCero) {
    if (!hay(n)) return '—';
    n = +n;
    if (guionSiCero && Math.abs(n) < 0.005) return '—';
    var s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (n < 0 ? '−$' : '$') + s;
  }
  function rate(p) {
    if (!hay(p)) return '—';
    return (+p).toLocaleString('en-US', { maximumFractionDigits: 2 }) + '%';
  }
  function cop(n) { return hay(n) && +n ? '$' + Math.round(+n).toLocaleString('es-CO') + ' COP' : '—'; }
  function txt(s) { return s == null || s === '' ? '—' : esc(s); }
  function neg(n) { return hay(n) && +n < 0 ? ' pgst-neg' : ''; }
  function cap(s) { return s ? s.charAt(0).toUpperCase() + s.slice(1) : s; }
  function legal(p) {
    var m = /^([^.]{2,40}\.)\s+([\s\S]*)$/.exec(String(p == null ? '' : p));
    return m ? '<b>' + esc(m[1]) + '</b> ' + esc(m[2]) : esc(p);
  }

  /* "October 30, 2026" -> "30 de octubre de 2026"; si no lo reconoce, lo deja igual */
  function fechaEs(s) {
    var m = /^\s*([A-Za-z]+)\s+(\d{1,2}),\s*(\d{4})\s*$/.exec(String(s || ''));
    if (!m) return s;
    var i = MONTHS.indexOf(m[1].toLowerCase());
    return i < 0 ? s : (+m[2]) + ' de ' + MESES[i] + ' de ' + m[3];
  }
  function estadoEs(s) {
    s = String(s || '');
    if (/^DRAFT/i.test(s)) return 'Borrador';
    if (/^SHARED/i.test(s)) return 'Compartido · pendiente de pago';
    var m = /^PAID\s*·?\s*(.*)$/i.exec(s);
    if (m) return 'Pagado' + (m[1] ? ' · ' + m[1] : '');
    return s;
  }
  /* mes del documento: {mes:0-11, anio} */
  function periodoDe(doc) {
    var m = /^(\d{4})-(\d{2})/.exec(String(doc.periodo || ''));
    if (m) return { mes: +m[2] - 1, anio: +m[1] };
    m = /^\s*([A-Za-z]+)\s+(\d{4})/.exec(String(doc.periodo_txt || ''));
    if (m && MONTHS.indexOf(m[1].toLowerCase()) >= 0) return { mes: MONTHS.indexOf(m[1].toLowerCase()), anio: +m[2] };
    m = /^CS-(\d{4})-(\d{2})/.exec(String(doc.numero || ''));
    if (m) return { mes: +m[2] - 1, anio: +m[1] };
    return null;
  }
  function tipoDe(t) {
    t = String(t || '');
    if (/^Renewal/.test(t)) return 'Renewal';
    if (TIPOS.indexOf(t) >= 0 || t === 'Regulatory') return t;
    if (/neg/i.test(t)) return 'Negativo';
    return t || 'Other';
  }
  /* % sobre el premium: lo que cobra la persona dividido por la prima (10 % de una comisión del 10 % = 1 %).
     En pendientes (sin monto) sale de % MGA × % de la persona. */
  function tasa(l) {
    /* si el monto sale de premium × % MGA × % de la persona, se muestra ese % exacto (evita 14.99 % por redondeo) */
    if (hay(l.prima) && hay(l.pct_mga) && hay(l.pct) && (l._pend || (hay(l.monto) && Math.abs(+l.prima * +l.pct_mga * +l.pct / 10000 - +l.monto) < 0.02)))
      return rate(+l.pct_mga * +l.pct / 100);
    if (hay(l.prima) && +l.prima !== 0 && hay(l.monto) && !l._pend) return rate(Math.abs(+l.monto / +l.prima * 100));
    if (hay(l.pct_mga) && hay(l.pct)) return rate(+l.pct_mga * +l.pct / 100);
    return rate(l.pct);
  }

  var CSS = '' +
    '.pgst{--k:#1B2D3A;--m:#2DBFA3;--ms:#C4E8DF;--md:#229A82;--bg:#F4F7FA;--ln:#E7EDF2;--ln2:#D3DCE3;--tx:#28323B;--mu:#6B7D89;--ng:#D5594F;--am:#D9A520;' +
    'position:relative;background:#fff;color:var(--tx);max-width:1120px;margin:0 auto;padding:30px 34px;border-radius:14px;box-shadow:0 2px 14px rgba(27,45,58,.08);' +
    'font-family:"Inter",Arial,sans-serif;font-size:12px;line-height:1.42;min-width:0;box-sizing:border-box;-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.pgst *{box-sizing:border-box}' +
    '.pgst-num,.pgst td.n,.pgst td.c{font-family:"JetBrains Mono","Courier New",monospace;font-variant-numeric:tabular-nums}' +
    '.pgst-neg{color:var(--ng)!important}' +
    '.pgst-mu{color:var(--mu)}' +
    '.pgst-prev{background:#FBF3E2;border:1px solid var(--am);color:#7a5c12;font-weight:800;font-size:10.5px;letter-spacing:.1em;text-transform:uppercase;text-align:center;border-radius:999px;padding:4px 12px;margin:0 auto 12px;width:max-content;max-width:100%}' +
    '.pgst-mb{display:flex;justify-content:space-between;align-items:center;gap:12px;border-bottom:3px solid var(--m);padding-bottom:10px;margin-bottom:14px}' +
    '.pgst-marca{display:flex;align-items:center;gap:12px;min-width:0}' +
    '.pgst-marca img{height:46px;width:auto;flex:none}' +
    '.pgst-wm{font-family:"Montserrat","Arial Black",sans-serif;font-weight:800;font-size:20px;color:var(--k);line-height:1.1}' +
    '.pgst-wm small{display:block;font-family:"Inter",Arial,sans-serif;font-weight:500;font-size:10px;color:var(--mu);letter-spacing:.14em;margin-top:3px}' +
    '.pgst h1{font-family:"Montserrat","Arial Black",sans-serif;font-weight:800;font-size:18px;margin:0;letter-spacing:.05em;color:var(--k);text-align:right}' +
    '.pgst-nro{font-size:11px;color:var(--mu);text-align:right;margin-top:3px}' +
    '.pgst-top{display:flex;gap:12px;align-items:stretch;margin-bottom:16px}' +
    '.pgst-cas{flex:1;display:grid;grid-template-columns:1.5fr 1.2fr 1fr;gap:9px 12px;background:var(--bg);border-radius:12px;padding:12px 16px;min-width:0}' +
    '.pgst-cas > div{min-width:0;overflow-wrap:anywhere}' +
    '.pgst-cas b{display:block;font-size:9.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mu);font-weight:600}' +
    '.pgst-cas span{display:block;font-weight:600;font-size:12.5px;color:var(--k)}' +
    '.pgst-pagar{background:var(--k);color:#fff;border-radius:12px;padding:12px 22px;min-width:250px;display:flex;flex-direction:column;justify-content:center;border-left:6px solid var(--m)}' +
    '.pgst-pagar b{font-size:9.5px;letter-spacing:.14em;text-transform:uppercase;color:#b9c6d0;font-weight:600}' +
    '.pgst-pagar .pgst-val{font-family:"JetBrains Mono","Courier New",monospace;font-weight:600;font-size:27px;line-height:1.2;margin-top:2px;white-space:nowrap}' +
    '.pgst-pagar .pgst-s{font-size:10.5px;color:#b9c6d0;margin-top:2px}' +
    '.pgst-tw{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}' +
    '.pgst table{border-collapse:separate;border-spacing:0}' +
    'table.pgst-v{width:100%}' +
    '.pgst-v thead{display:table-header-group}' +
    '.pgst-v tr{page-break-inside:avoid;break-inside:avoid}' +
    '.pgst-v th.pgst-band{background:var(--k);color:#fff;font-family:"Montserrat","Arial Black",sans-serif;font-size:13px;letter-spacing:.16em;text-align:center;padding:8px;font-weight:800;border-radius:10px 10px 0 0;text-transform:uppercase}' +
    '.pgst-v th{background:var(--ms);color:var(--k);font-size:9.5px;letter-spacing:.08em;text-transform:uppercase;text-align:left;padding:7px 10px;white-space:nowrap;font-weight:700}' +
    '.pgst-v th.r{text-align:right}.pgst-v th.ce{text-align:center}' +
    '.pgst-v td{padding:6px 10px;border-bottom:1px solid var(--ln);vertical-align:middle}' +
    '.pgst-v tbody tr:nth-child(even) td{background:#F8FAFC}' +
    '.pgst-v td.pgst-cli{font-weight:600;color:var(--k)}' +
    '.pgst-v td.n{text-align:right;white-space:nowrap;font-size:11.5px}' +
    '.pgst-v td.c{text-align:center;white-space:nowrap;font-size:11.5px}' +
    '.pgst-v td.pgst-com{font-weight:600;color:var(--k)}' +
    '.pgst-v .gl{border-left:1px solid var(--ln2)}' +
    '.pgst-v td.pgst-nota{font-size:11px;min-width:120px}' +
    '.pgst-v tbody tr.pgst-pe td{background:#FDF8EA}' +
    '.pgst-v.pgst-lid td{padding:5.5px 7px}.pgst-v.pgst-lid th{padding:7px 7px}' +
    '.pgst-pill{display:inline-block;background:#FBF0D2;color:#7a5c12;border-radius:999px;padding:1.5px 9px;font-weight:600;font-size:10.5px;white-space:nowrap}' +
    '.pgst-tot{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin:8px 0 18px;page-break-inside:avoid;break-inside:avoid}' +
    '.pgst-ley{font-size:11px;color:var(--mu);padding-top:6px;max-width:55%}' +
    '.pgst-tot table{border-radius:10px;overflow:hidden;margin-left:auto}' +
    '.pgst-tot td{padding:7px 14px;font-size:12.5px}' +
    '.pgst-tot td.l{background:var(--k);color:#fff;font-family:"Montserrat","Arial Black",sans-serif;font-weight:700;letter-spacing:.08em;text-transform:uppercase;text-align:right;min-width:240px;font-size:11px}' +
    '.pgst-tot td.r{text-align:right;min-width:120px;font-family:"JetBrains Mono","Courier New",monospace;font-weight:600;background:var(--bg);color:var(--k);white-space:nowrap}' +
    '.pgst-tot tr + tr td{border-top:1px solid #fff}' +
    '.pgst-fila{display:flex;gap:16px;align-items:flex-start;flex-wrap:wrap;margin-bottom:16px;page-break-inside:avoid;break-inside:avoid}' +
    '.pgst-box{border:1px solid var(--ln2);border-radius:10px;overflow:hidden;page-break-inside:avoid;break-inside:avoid}' +
    '.pgst-box th.pgst-band{background:var(--k);color:#fff;font-family:"Montserrat","Arial Black",sans-serif;font-size:11px;letter-spacing:.14em;text-align:center;padding:6px 10px;font-weight:800}' +
    '.pgst-box td{padding:5.5px 12px}' +
    '.pgst-box td.pgst-vl{background:var(--k);color:#fff;font-family:"Montserrat","Arial Black",sans-serif;font-weight:800;text-align:center;width:30px;font-size:11px;line-height:1.3;padding:3px 0}' +
    '.pgst-box td.k{min-width:140px;color:var(--tx);border-bottom:1px solid var(--ln)}' +
    '.pgst-box td.n{text-align:right;min-width:116px;border-bottom:1px solid var(--ln);font-size:11.5px;color:var(--k);white-space:nowrap}' +
    '.pgst-box tr:last-child td.k,.pgst-box tr:last-child td.n{border-bottom:none}' +
    '.pgst-box tr.pgst-t td.k{background:var(--ms);color:var(--k);font-family:"Montserrat","Arial Black",sans-serif;font-weight:800;letter-spacing:.05em}' +
    '.pgst-box tr.pgst-t td.n{background:var(--ms);font-size:14px;font-weight:600}' +
    '.pgst-g{border:1px solid var(--ln2);border-radius:10px;overflow:hidden}' +
    '.pgst-g th{background:var(--ms);color:var(--k);font-size:9.5px;letter-spacing:.06em;text-transform:uppercase;padding:6px 10px;text-align:center;font-weight:700}' +
    '.pgst-g th small{display:block;font-weight:500;text-transform:none;letter-spacing:0;font-size:9px}' +
    '.pgst-g td{padding:5.5px 10px;border-bottom:1px solid var(--ln)}' +
    '.pgst-g tr:last-child td{border-bottom:none}' +
    '.pgst-g td.n{text-align:right;font-size:11.5px;white-space:nowrap}.pgst-g td.c{text-align:center}' +
    '.pgst-g td.pgst-ok{color:var(--md);font-weight:800;text-align:center}.pgst-g td.pgst-no{color:var(--mu);text-align:center}' +
    '.pgst-sec{font-family:"Montserrat","Arial Black",sans-serif;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:var(--md);margin:6px 0 8px}' +
    '.pgst-cierre{page-break-inside:avoid;break-inside:avoid}' +
    '.pgst-terms{margin-top:8px;border-top:1px solid var(--ln);padding-top:8px;font-size:9.5px;color:var(--mu);column-count:2;column-gap:26px}' +
    '.pgst-terms ol{margin:0;padding-left:15px}.pgst-terms li{margin-bottom:3px}' +
    '.pgst-pie{margin-top:6px;font-size:10px;color:var(--mu);display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px}' +
    '@media (max-width:900px){.pgst{padding:18px}.pgst-top{flex-direction:column}.pgst-pagar{min-width:0}.pgst-terms{column-count:1}}' +
    '@media (max-width:640px){.pgst{padding:14px;border-radius:10px}.pgst-mb{flex-direction:column;align-items:flex-start}.pgst h1,.pgst-nro{text-align:left}' +
    '.pgst-cas{grid-template-columns:1fr 1fr}.pgst-pagar .pgst-val{font-size:23px}.pgst-tot{flex-direction:column}.pgst-ley{max-width:none}.pgst-tot table{margin-left:0}' +
    '.pgst-v td{white-space:nowrap}.pgst-v th.pgst-band{text-align:left}.pgst-tot td.l{min-width:0}.pgst-fila{flex-direction:column}.pgst-fila > table,.pgst-fila > .pgst-tw{max-width:100%}.pgst-box td.k{min-width:0}}' +
    '@media print{.pgst{box-shadow:none;border-radius:0;max-width:none;padding:0;font-size:10.4px}.pgst-tw{overflow:visible}' +
    '.pgst-top{flex-direction:row}.pgst-cas{grid-template-columns:1.5fr 1.2fr 1fr}.pgst-terms{column-count:2;font-size:7.8px}' +
    '.pgst-v td.n,.pgst-v td.c{font-size:9.6px}.pgst-v td{padding:5px 8px}.pgst-v.pgst-lid td{font-size:9.6px;padding:4.6px 6px;white-space:nowrap}' +
    '.pgst-v.pgst-lid td.pgst-cli,.pgst-v.pgst-lid td.pgst-mes,.pgst-v.pgst-lid td.pgst-nota{white-space:normal}.pgst-screen{display:none!important}}' +
    '@page{size:letter landscape;margin:.45in .45in .55in}';

  /* ---- datos del documento ---- */
  function bloquesDe(doc) {
    var B = (doc.bloques || []).slice();
    if (!B.length) {
      var L = doc.lineas || [];
      var sub = L.reduce(function (s, l) { return s + (hay(l.monto) ? +l.monto : 0); }, 0);
      if (L.length) B.push({ cargo: 'asesor', lineas: L, subtotal: Math.round(sub * 100) / 100, _viejo: true });
    }
    return B;
  }
  function bloque(B, c) { for (var i = 0; i < B.length; i++) if (B[i].cargo === c) return B[i]; return null; }
  function pendientesDe(doc) {
    var P = doc.pendientes;
    if (P && P.length) return P.map(function (p) { var o = {}; for (var k in p) o[k] = p[k]; o._pend = true; if (!o.cargo) o.cargo = 'asesor'; return o; });
    return (doc.en_camino || []).map(function (c) {
      return { cargo: 'asesor', cliente: c.cliente, mga: c.mga, trans: c.trans, prima: null, pct: null, _pend: true, estimado: c.monto };
    });
  }
  var NOMBRE_CARGO = { asesor: 'Asesor', lider: 'Líder', renov35: 'Renewal 3.5%' };
  var TOTAL_CARGO = { asesor: 'Comisión asesor', lider: 'Comisión líder', renov35: 'Comisión renovaciones 3.5%' };
  var BOX_CARGO = { asesor: 'ASESOR', lider: 'LÍDER', renov35: 'RENOVACIONES 3.5%' };

  function notaCelda(l) {
    if (l._pend) return '<span class="pgst-pill">' + esc(l.nota || NOTA_PEND) + '</span>';
    return esc(l.nota || '');
  }
  function premiumPorTipo(L) {
    var acc = {};
    L.forEach(function (l) { if (!hay(l.prima)) return; var t = tipoDe(l.trans); acc[t] = (acc[t] || 0) + (+l.prima); });
    var extra = Object.keys(acc).filter(function (k) { return TIPOS.indexOf(k) < 0 && Math.abs(acc[k]) >= 0.005; })
      .sort(function (a, b) { var ia = ORDEN_X.indexOf(a), ib = ORDEN_X.indexOf(b); return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib) || a.localeCompare(b); });
    return TIPOS.concat(extra).map(function (t) { return [t, acc[t] || 0]; });
  }
  function cuadroPremium(titulo, L) {
    var F = premiumPorTipo(L);
    var h = '<table class="pgst-box">';
    if (titulo) h += '<tr><th class="pgst-band" colspan="3">' + esc(titulo) + '</th></tr>';
    F.forEach(function (f, i) {
      h += '<tr>' + (i === 0 ? '<td class="pgst-vl" rowspan="' + F.length + '">' + 'PREMIUM'.split('').join('<br>') + '</td>' : '') +
        '<td class="k">' + esc(f[0]) + '</td><td class="n pgst-num' + neg(f[1]) + '">' + money(f[1], true) + '</td></tr>';
    });
    return h + '</table>';
  }
  function cuadroResumen(doc, partes) {
    var h = '<table class="pgst-box"><tr><th class="pgst-band" colspan="2">RESUMEN</th></tr>';
    partes.forEach(function (p) {
      h += '<tr><td class="k">' + esc(p[0]) + '</td><td class="n pgst-num' + neg(p[1]) + '">' + money(p[1]) + '</td></tr>';
    });
    h += '<tr class="pgst-t"><td class="k">TOTAL A PAGAR · USD</td><td class="n pgst-num' + neg(doc.total_usd) + '">' + money(doc.total_usd) + '</td></tr>';
    if (hay(doc.cop) && +doc.cop) h += '<tr><td class="k">Bono en COP</td><td class="n pgst-num">' + cop(doc.cop) + '</td></tr>';
    return h + '</table>';
  }

  /* fila de la tabla de ventas */
  function fila(l, lider) {
    var p = !!l._pend;
    var h = '<tr' + (p ? ' class="pgst-pe"' : '') + '><td class="pgst-mes">' + txt(l.fecha) + '</td><td class="pgst-cli">' + txt(l.cliente) + '</td><td>' + txt(l.mga) +
      '</td><td>' + txt(l.trans) + '</td><td class="n' + neg(l.prima) + '">' + money(l.prima) + '</td>';
    if (lider) h += '<td>' + txt(l.vendedor) + '</td><td class="gl">' + esc(NOMBRE_CARGO[l._cargo] || l.cargo || '—') + '</td>';
    h += '<td class="c' + (lider ? '' : ' gl') + '">' + tasa(l) + '</td><td class="n pgst-com' + (p ? '' : neg(l.monto)) + '">' + (p ? '—' : money(l.monto)) +
      '</td><td class="pgst-nota gl">' + notaCelda(l) + '</td></tr>';
    return h;
  }

  function ventas(doc, B, P, banda) {
    var cargos = ['lider', 'renov35', 'asesor'].filter(function (c) {
      var b = bloque(B, c);
      return (b && (b.lineas || []).length) || P.some(function (p) { return p.cargo === c; });
    });
    if (!cargos.length) return { html: '', grupos: [] };
    var lider = cargos.some(function (c) { return c !== 'asesor'; });
    var grupos = cargos.map(function (c) {
      var b = bloque(B, c) || { lineas: [], subtotal: 0 };
      var L = (b.lineas || []).map(function (l) { var o = {}; for (var k in l) o[k] = l[k]; o._cargo = c; return o; })
        .concat(P.filter(function (p) { return p.cargo === c; }).map(function (p) { p._cargo = c; return p; }));
      return { cargo: c, lineas: L, subtotal: b.subtotal };
    });
    var cab = '<th>Mes</th><th>Cliente</th><th>MGA</th><th>Transaction</th><th class="r">Premium</th>' +
      (lider ? '<th>Seller</th><th class="gl">Cargo</th><th class="ce">% sobre premium</th>' : '<th class="gl ce">% sobre premium</th>') +
      '<th class="r">Comisión</th><th class="gl">Notas</th>';
    var ncol = lider ? 10 : 8;
    var h = '<div class="pgst-tw"><table class="pgst-v' + (lider ? ' pgst-lid' : '') + '"><thead><tr><th class="pgst-band" colspan="' + ncol + '">' + esc(banda) +
      '</th></tr><tr>' + cab + '</tr></thead><tbody>';
    grupos.forEach(function (g) { g.lineas.forEach(function (l) { h += fila(l, lider); }); });
    h += '</tbody></table></div>';
    var hayP = grupos.some(function (g) { return g.lineas.some(function (l) { return l._pend; }); });
    h += '<div class="pgst-tot">' + (hayP ? '<div class="pgst-ley">Las líneas con la nota "' + NOTA_PEND + '" no suman al total: se pagan en el statement del mes en que llegue el pago de la MGA.</div>' : '<div></div>') +
      '<table>' + grupos.map(function (g) {
        return '<tr><td class="l">' + esc(TOTAL_CARGO[g.cargo]) + '</td><td class="r' + neg(g.subtotal) + '">' + money(g.subtotal) + '</td></tr>';
      }).join('') + '</table></div>';
    return { html: h, grupos: grupos };
  }

  function metaHtml(m) {
    var A = m.asesores || [];
    var h = '<div class="pgst-sec">Meta del equipo</div><div class="pgst-fila">';
    if (A.length) {
      h += '<div class="pgst-tw"><table class="pgst-g"><thead><tr><th>Asesores</th><th>Meta cumplida<small>Meta Combinada o Premium Min $20K</small></th><th>Tipo de meta</th><th>Premium<small>Meta Combinada</small></th></tr></thead><tbody>' +
        A.map(function (a) {
          return '<tr><td>' + txt(a.asesor) + '</td><td class="' + (a.cumplio ? 'pgst-ok' : 'pgst-no') + '">' + (a.cumplio ? 'SÍ' : 'NO') +
            (a.forzado ? ' <span class="pgst-mu" style="font-weight:500">(manual)</span>' : '') + '</td><td class="c">' + txt(a.tipo === '—' ? '' : a.tipo) +
            '</td><td class="n">' + money(/comb/i.test(a.tipo || '') ? a.combinada : a.premium, true) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    }
    h += '<table class="pgst-box"><tr><th class="pgst-band" colspan="2">META DEL EQUIPO</th></tr>' +
      '<tr><td class="k">Meta combinada x equipo (' + (hay(m.n_activos) ? esc(m.n_activos) : '—') + ' asesores)</td><td class="n pgst-num">' + money(m.meta_usd) + '</td></tr>' +
      '<tr><td class="k">Meta cumplida</td><td class="n pgst-num">' + money(m.cumplida_usd) + '</td></tr>' +
      '<tr><td class="k">Porcentaje cumplido</td><td class="n pgst-num">' + (hay(m.pct) ? (+m.pct).toLocaleString('en-US', { maximumFractionDigits: 1 }) + '%' : '—') + '</td></tr>' +
      (m.tabla || []).map(function (r) { return '<tr><td class="k">' + esc(r[0]) + '% → bono</td><td class="n pgst-num">' + money(r[1]) + '</td></tr>'; }).join('') +
      '<tr class="pgst-t"><td class="k">Bono</td><td class="n pgst-num">' + money(m.bono_usd) + '</td></tr></table></div>';
    return h;
  }

  function html(doc) {
    doc = doc || {};
    var payee = doc.payee || {};
    var per = periodoDe(doc);
    var mesTxt = per ? cap(MESES[per.mes]) + ' ' + per.anio : (doc.periodo_txt || '');
    var banda = 'Ventas' + (per ? ' ' + MESES[per.mes] + ' ' + per.anio : '');
    var B = bloquesDe(doc), P = pendientesDe(doc);
    var lt = doc.texto_legal || {}, en = lt.en || [];
    if (typeof en === 'string') en = [en];

    var h = '<div class="pgst"><style>' + CSS + '</style>';
    if (doc.preliminar) h += '<div class="pgst-prev">VISTA PREVIA · no compartido</div>';
    if (doc.nota_es) h += '<div class="pgst-prev" style="text-transform:none;letter-spacing:0;font-weight:600">' + esc(doc.nota_es) + '</div>';

    h += '<div class="pgst-mb"><div class="pgst-marca"><img src="' + esc(LOGO) + '" alt="ProtectGo">' +
      '<div class="pgst-wm">ProtectGo Services LLC<small>COMMERCIAL TRUCKING INSURANCE · VON ORMY, TX</small></div></div>' +
      '<div><h1>REPORTE DE COMISIONES</h1><div class="pgst-nro">Statement # <b class="pgst-num">' + txt(doc.numero) + '</b>' +
      (hay(doc.version) && +doc.version > 0 ? ' · v' + esc(doc.version) : '') + '</div></div></div>';

    var fp = fechaEs(doc.fecha_pago_txt);
    h += '<div class="pgst-top"><div class="pgst-cas">' +
      '<div><b>Nombre</b><span>' + txt(payee.nombre) + '</span></div>' +
      '<div><b>Cargo</b><span>' + txt(payee.rol) + '</span></div>' +
      '<div><b>Periodo</b><span>' + txt(mesTxt) + '</span></div>' +
      '<div><b>Fecha de pago</b><span>' + txt(fp) + '</span></div>' +
      '<div><b>Emitido</b><span>' + txt(fechaEs(doc.emitido_txt)) + '</span></div>' +
      '<div><b>Estado</b><span>' + txt(estadoEs(doc.estado)) + '</span></div></div>' +
      '<div class="pgst-pagar"><b>Total a pagar · USD</b><div class="pgst-val">' + money(doc.total_usd) + '</div>' +
      '<div class="pgst-s">' + (hay(doc.cop) && +doc.cop ? 'Más ' + esc(cop(doc.cop)) + ' de bono · ' : '') + (fp ? 'Se paga el ' + esc(fp) : '') + '</div></div></div>';

    var V = ventas(doc, B, P, banda);
    h += V.html;

    /* cuadros: PREMIUM por cargo + RESUMEN + bolsas + bono */
    var partes = [];
    V.grupos.forEach(function (g) { partes.push([TOTAL_CARGO[g.cargo], g.subtotal]); });
    var bb = bloque(B, 'bolsas'), bo = bloque(B, 'bono');
    if (bb) partes.push(['Bolsa de área', bb.subtotal]);
    if (bo) partes.push(['Bono', bo.subtotal]);
    if (!B.length) (doc.resumen || []).forEach(function (r) { if (hay(r.monto) && +r.monto) partes.push([r.concepto, r.monto]); });
    var varios = V.grupos.length > 1;
    h += '<div class="pgst-fila">' + V.grupos.map(function (g) { return cuadroPremium(varios ? BOX_CARGO[g.cargo] : null, g.lineas); }).join('') + cuadroResumen(doc, partes) + '</div>';
    if ((bb && (bb.lineas || []).length) || (bo && (bo.lineas || []).length)) {
      h += '<div class="pgst-fila">';
      if (bb && (bb.lineas || []).length) {
        h += '<div class="pgst-tw"><table class="pgst-g"><thead><tr><th>Bolsa de área</th><th>Base</th><th>%</th><th>Partes</th><th>Monto</th></tr></thead><tbody>' +
          bb.lineas.map(function (l) {
            return '<tr><td>' + txt(l.area) + '</td><td class="n pgst-num">' + money(l.base) + '</td><td class="c pgst-num">' + rate(l.pct) +
              '</td><td class="c pgst-num">' + (hay(l.partes) ? esc(l.partes) : '—') + '</td><td class="n pgst-num' + neg(l.monto) + '">' + money(l.monto) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      if (bo && (bo.lineas || []).length) {
        h += '<div class="pgst-tw"><table class="pgst-g"><thead><tr><th>Bono</th><th>Regla</th><th>Monto</th></tr></thead><tbody>' +
          bo.lineas.map(function (l) {
            return '<tr><td>' + txt(l.concepto) + '</td><td>' + txt(l.regla) + '</td><td class="n pgst-num' + neg(l.monto) + '">' + money(l.monto) + '</td></tr>';
          }).join('') + '</tbody></table></div>';
      }
      h += '</div>';
    }
    if (doc.meta) h += metaHtml(doc.meta);

    h += '<div class="pgst-cierre">';
    if (en.length || lt.es) {
      h += '<div class="pgst-terms">';
      if (en.length) h += '<ol>' + en.map(function (p) { return '<li>' + legal(p) + '</li>'; }).join('') + '</ol>';
      if (lt.es) h += '<div style="margin-top:4px">' + esc(lt.es) + '</div>';
      h += '</div>';
    }
    h += '<div class="pgst-pie"><span>ProtectGo Services LLC · fam@protectgoservices.com</span><span>Conserva este reporte para tus registros</span></div></div>';
    return h + '</div>';
  }

  function abrir(doc) {
    var w = window.open('', '_blank');
    if (!w) return false;
    var titulo = 'Reporte de comisiones · ProtectGo Services LLC ' + ((doc && doc.numero) || '');
    w.document.open();
    w.document.write('<!doctype html><html lang="es"><head><meta charset="utf-8">' +
      '<meta name="viewport" content="width=device-width, initial-scale=1">' +
      '<title>' + esc(titulo) + '</title>' +
      '<link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@600;700;800&family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@500;600&display=swap" rel="stylesheet">' +
      '<style>html,body{margin:0;background:#F4F7FA}body{padding:16px}@media print{html,body{background:#fff}body{padding:0}}</style>' +
      '</head><body>' + html(doc) +
      '<script>window.addEventListener("load",function(){setTimeout(function(){try{window.focus();window.print();}catch(e){}},400);});<\/script>' +
      '</body></html>');
    w.document.close();
    return true;
  }

  window.pgStatement = { html: html, abrir: abrir, version: 4 };
})();
