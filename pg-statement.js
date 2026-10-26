/* ============================================================
   GABI · pg-statement.js v1 — el documento COMMISSION STATEMENT.
   23-oct-2026. Lo usan Comisiones FAM (fam-comisiones.html) y, después,
   Mi statement (gabi-asesor.html). Un solo dibujo para los dos lados:
   lo que Jeff ve en "Ver como lo verá X" es exactamente lo que recibe
   la persona.

   API:
     pgStatement.html(doc)  -> string con el documento (trae su <style>
                               propio, clases pgst-*). doc = lo que
                               devuelve portal.com_statement_doc.
     pgStatement.abrir(doc) -> abre ventana nueva con el documento y
                               llama a print() (igual que los PG-FIN).
                               Devuelve false si el navegador bloqueó
                               la ventana.

   Reglas: nada guardado en el navegador, sin dependencias, todo texto escapado,
   "—" cuando no hay dato, carta al imprimir, 400 px sin barra
   horizontal (el detalle se desliza dentro de su propia caja).
   ============================================================ */
(function () {
  "use strict";

  function esc(s) {
    return s == null ? '' : String(s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function hay(n) { return n !== null && n !== undefined && n !== '' && !isNaN(+n); }
  function money(n) {
    if (!hay(n)) return '—';
    n = +n;
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
  /* "Issuer. Commissions are…" → la entrada en negrita */
  function legal(p) {
    var m = /^([^.]{2,40}\.)\s+([\s\S]*)$/.exec(String(p == null ? '' : p));
    return m ? '<b>' + esc(m[1]) + '</b> ' + esc(m[2]) : esc(p);
  }

  var CSS = '' +
    '.pgst{position:relative;background:#fff;color:#1B2D3A;max-width:820px;margin:0 auto;padding:36px 42px;border-radius:14px;' +
    'box-shadow:0 2px 14px rgba(27,45,58,.08);font-family:"Inter",Arial,sans-serif;font-size:12.5px;line-height:1.45;min-width:0;box-sizing:border-box;' +
    '-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
    '.pgst *{box-sizing:border-box}' +
    '.pgst-prev{background:#FBF3E2;border:1px solid #D9A520;color:#8a6a1d;font-weight:800;font-size:10.5px;letter-spacing:.12em;text-transform:uppercase;' +
    'text-align:center;border-radius:999px;padding:4px 12px;margin:0 auto 14px;width:max-content;max-width:100%}' +
    '.pgst-mb{display:flex;justify-content:space-between;align-items:flex-start;gap:12px;border-bottom:3px solid #1B2D3A;padding-bottom:10px;margin-bottom:14px}' +
    '.pgst-wm{font-family:"Montserrat","Arial Black",sans-serif;font-weight:800;font-size:20px;letter-spacing:.02em}' +
    '.pgst-wm small{display:block;font-family:"Inter",Arial,sans-serif;font-weight:500;font-size:11px;color:#6B7D89;letter-spacing:.1em}' +
    '.pgst h1{font-family:"Montserrat","Arial Black",sans-serif;font-size:18px;margin:0;letter-spacing:.04em;color:#1B2D3A}' +
    '.pgst-num{font-family:"JetBrains Mono","Courier New",monospace;font-variant-numeric:tabular-nums}' +
    '.pgst-mu{color:#6B7D89}' +
    '.pgst-neg{color:#D5594F}' +
    '.pgst-meta{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px 18px;margin:12px 0 16px;font-size:12px}' +
    '.pgst-meta > div{min-width:0;overflow-wrap:anywhere}' +
    '.pgst-meta b{display:block;font-size:10px;letter-spacing:.1em;text-transform:uppercase;color:#6B7D89}' +
    '.pgst-tot{background:#1B2D3A;color:#fff;border-radius:12px;padding:14px 18px;display:flex;justify-content:space-between;align-items:center;gap:10px;margin:12px 0 16px}' +
    '.pgst-tot .pgst-v{font-family:"JetBrains Mono","Courier New",monospace;font-size:26px;font-weight:600;white-space:nowrap}' +
    '.pgst-tot .pgst-l{font-size:10px;letter-spacing:.12em;text-transform:uppercase;color:#b9c6d0}' +
    '.pgst-tot .pgst-s{font-size:11px;color:#b9c6d0;margin-top:4px}' +
    '.pgst table{width:100%;border-collapse:collapse;margin-bottom:14px}' +
    '.pgst th{font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#6B7D89;text-align:left;padding:6px;border-bottom:2px solid #1B2D3A;white-space:nowrap}' +
    '.pgst td{padding:5px 6px;border-bottom:1px solid #E7EDF2;font-size:11.5px;vertical-align:top}' +
    '.pgst td.n,.pgst th.n{text-align:right;font-family:"JetBrains Mono","Courier New",monospace;font-variant-numeric:tabular-nums;white-space:nowrap}' +
    '.pgst tr.pgst-t td{border-top:2px solid #1B2D3A;border-bottom:none;font-weight:800}' +
    '.pgst-tw{overflow-x:auto;-webkit-overflow-scrolling:touch;max-width:100%}' +
    '.pgst-sec{font-family:"Montserrat","Arial Black",sans-serif;font-size:12px;letter-spacing:.1em;text-transform:uppercase;color:#229A82;margin:16px 0 6px}' +
    '.pgst ol{padding-left:18px;margin:0}' +
    '.pgst ol li{margin-bottom:5px}' +
    '.pgst-es{background:#F4F7FA;border-radius:10px;padding:10px 12px;margin-top:10px;font-size:11.5px}' +
    '.pgst-pie{margin-top:16px;border-top:1px solid #E7EDF2;padding-top:8px;font-size:10.5px;color:#6B7D89;display:flex;justify-content:space-between;flex-wrap:wrap;gap:6px}' +
    '@media (max-width:900px){.pgst{padding:18px}.pgst-meta{grid-template-columns:repeat(2,minmax(0,1fr))}}' +
    '@media (max-width:640px){.pgst-mb{flex-direction:column;gap:8px}.pgst-mb .pgst-r{text-align:left!important}' +
    '.pgst-meta{grid-template-columns:1fr}.pgst-tot{flex-wrap:wrap;gap:8px}.pgst-tot .pgst-v{font-size:22px}' +
    '.pgst-tw td,.pgst-tw th{white-space:nowrap}}' +
    '@media print{.pgst{box-shadow:none;border-radius:0;max-width:none;padding:0}.pgst-tw{overflow:visible}' +
    '.pgst tr{page-break-inside:avoid}.pgst-prev{border-width:1px}}' +
    '@page{size:letter;margin:.45in}';

  function html(doc) {
    doc = doc || {};
    var payee = doc.payee || {};
    var lineas = doc.lineas || [];
    var camino = doc.en_camino || [];
    var resumen = (doc.resumen || []).filter(function (r) { return hay(r.monto) && +r.monto !== 0; });
    var legalTxt = doc.texto_legal || {};
    var en = legalTxt.en || [];
    if (typeof en === 'string') en = [en];

    var h = '<div class="pgst"><style>' + CSS + '</style>';
    if (doc.preliminar) h += '<div class="pgst-prev">VISTA PREVIA · no compartido</div>';
    if (doc.nota_es) h += '<div class="pgst-prev" style="text-transform:none;letter-spacing:0;font-weight:600">' + esc(doc.nota_es) + '</div>';

    h += '<div class="pgst-mb"><div class="pgst-wm">ProtectGo Services LLC<small>COMMERCIAL TRUCKING INSURANCE · VON ORMY, TX</small></div>' +
      '<div class="pgst-r" style="text-align:right"><h1>COMMISSION STATEMENT</h1><div class="pgst-mu" style="font-size:11px">Statement # <b class="pgst-num">' +
      txt(doc.numero) + '</b>' + (hay(doc.version) && +doc.version > 0 ? ' · v' + esc(doc.version) : '') + '</div></div></div>';

    h += '<div class="pgst-meta">' +
      '<div><b>Payee</b>' + txt(payee.nombre) + (payee.rol ? '<br><span class="pgst-mu">' + esc(payee.rol) + '</span>' : '') +
      (payee.correo ? '<br><span class="pgst-mu">' + esc(payee.correo) + '</span>' : '') + '</div>' +
      '<div><b>Period</b>' + txt(doc.periodo_txt) + '</div>' +
      '<div><b>Payment date</b>' + txt(doc.fecha_pago_txt) + '</div>' +
      '<div><b>Issued</b>' + txt(doc.emitido_txt) + '</div>' +
      '<div><b>Issued by</b>FAM · Finance &amp; Accounts</div>' +
      '<div><b>Status</b>' + txt(doc.estado) + '</div></div>';

    h += '<div class="pgst-tot"><div><div class="pgst-l">Total commission · USD</div><div class="pgst-s">' +
      (hay(doc.cop) && +doc.cop ? 'Plus ' + cop(doc.cop) + ' endorsement bonus, paid in COP.' : 'Calculated on commissions and fees received by the agency.') +
      '</div></div><div class="pgst-v">' + money(doc.total_usd) + '</div></div>';

    h += '<div class="pgst-sec">Summary</div><table><tbody>' +
      resumen.map(function (r) {
        return '<tr><td>' + esc(r.concepto) + '</td><td class="n' + neg(r.monto) + '">' + money(r.monto) + '</td></tr>';
      }).join('') +
      '<tr class="pgst-t"><td>TOTAL</td><td class="n' + neg(doc.total_usd) + '">' + money(doc.total_usd) + '</td></tr></tbody></table>';

    h += '<div class="pgst-sec">Detail · ' + lineas.length + ' item' + (lineas.length === 1 ? '' : 's') + '</div>';
    if (lineas.length) {
      h += '<div class="pgst-tw"><table><thead><tr><th>Date</th><th>Client</th><th>MGA / Carrier</th><th>Type</th>' +
        '<th class="n">Agency comm.</th><th class="n">Rate</th><th class="n">Amount</th></tr></thead><tbody>' +
        lineas.map(function (l) {
          return '<tr><td>' + txt(l.fecha) + '</td><td>' + txt(l.cliente) + '</td><td>' + txt(l.mga) + '</td><td>' + txt(l.trans) +
            '</td><td class="n' + neg(l.base) + '">' + money(l.base) + '</td><td class="n">' + rate(l.pct) +
            '</td><td class="n' + neg(l.monto) + '">' + money(l.monto) + '</td></tr>';
        }).join('') + '</tbody></table></div>';
    } else {
      h += '<div class="pgst-mu" style="margin-bottom:14px">—</div>';
    }

    if (camino.length) {
      h += '<div class="pgst-sec">Earned, pending carrier statement — will be paid when received</div>' +
        '<div class="pgst-tw"><table><thead><tr><th>Client</th><th>MGA</th><th>Type</th><th class="n">Est. amount</th></tr></thead><tbody>' +
        camino.map(function (l) {
          return '<tr><td>' + txt(l.cliente) + '</td><td>' + txt(l.mga) + '</td><td>' + txt(l.trans) + '</td><td class="n">' + money(l.monto) + '</td></tr>';
        }).join('') + '</tbody></table></div>' +
        '<div class="pgst-mu" style="font-size:11px">Not included in the total above. These items will be paid in the month the carrier statement is received.</div>';
    }

    if (en.length || legalTxt.es) {
      h += '<div class="pgst-sec">Terms</div>';
      if (en.length) h += '<ol>' + en.map(function (p) { return '<li>' + legal(p) + '</li>'; }).join('') + '</ol>';
      if (legalTxt.es) h += '<div class="pgst-es"><b>Resumen en español.</b> ' + esc(legalTxt.es) + '</div>';
    }

    h += '<div class="pgst-pie"><span>ProtectGo Services LLC · fam@protectgoservices.com</span><span>Keep this statement for your records</span></div>';
    h += '</div>';
    return h;
  }

  function abrir(doc) {
    var w = window.open('', '_blank');
    if (!w) return false;
    var titulo = 'Commission Statement ' + ((doc && doc.numero) || '');
    w.document.open();
    w.document.write('<!doctype html><html lang="en"><head><meta charset="utf-8">' +
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

  window.pgStatement = { html: html, abrir: abrir };
})();
