/* =====================================================================
   ms-statement.js · Monthly Account Statement (Operyx Group × ProtectGo)
   Ronda 13 · 5-oct-2026. Lo usan amazon-relay/index.html y fam.html.
   Necesita pdf-lib (window.PDFLib) ya cargado. Carta vertical, inglés.
   API:
     MSStatement.pdfBytes(st, pagoTxt)  -> Promise<Uint8Array>
     MSStatement.descargarPDF(st, pagoTxt) -> Promise (descarga el archivo)
     MSStatement.filas(st)              -> filas planas para Excel/CSV
     MSStatement.nombre(st)             -> "MS-2026-09_Operyx_Statement"
     MSStatement.correo(st)             -> {to, subject, body} para mailto
   st = fila de portal.amazon_statements (tipo 'mensual') con lineas jsonb.
   ===================================================================== */
(function () {
  var MESES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
  function d(s) { if (!s) return null; var x = new Date(String(s).length === 10 ? s + 'T12:00:00' : s); return isNaN(x) ? null : x; }
  function fUS(s) { var x = d(s); return x ? MESES[x.getMonth()].slice(0, 3) + ' ' + String(x.getDate()).padStart(2, '0') + ', ' + x.getFullYear() : '-'; }
  function fCorta(s) { var x = d(s); return x ? String(x.getMonth() + 1).padStart(2, '0') + '/' + String(x.getDate()).padStart(2, '0') + '/' + x.getFullYear() : '-'; }
  function mes(st) { var x = d(st.desde); return x ? MESES[x.getMonth()] + ' ' + x.getFullYear() : (st.numero || ''); }
  function n(v) { var x = Number(v); return isFinite(x) ? x : 0; }
  function usd(v) { return (n(v) < 0 ? '-$' : '$') + Math.abs(n(v)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  function pct(v) { var x = n(v); return (Math.round(x * 100) / 100).toString(); }
  /* Helvetica estándar = WinAnsi: se limpia todo lo que no entra */
  function w(s) {
    return String(s == null ? '' : s)
      .replace(/[→➔➡]/g, '->').replace(/[←]/g, '<-')
      .replace(/[‘’]/g, "'").replace(/[“”]/g, '"')
      .replace(/−/g, '-').replace(/ /g, ' ')
      .replace(/[^\x09\x0A\x0D\x20-\x7E -ÿ–—•…€]/g, '');
  }
  function tipoEN(t) {
    t = String(t || '');
    if (/^dispatching/i.test(t)) return 'Dispatching';
    var suf = /· *Upfront$/i.test(t) ? ' · Upfront' : (/· *Balance$/i.test(t) ? ' · Balance' : '');
    return t ? 'Prof. service' + suf : '-';
  }
  function lineas(st) { return Array.isArray(st.lineas) ? st.lineas : []; }
  function nombre(st) { return (st.numero || 'MS') + '_Operyx_Statement'; }

  function filas(st) {
    return lineas(st).map(function (l) {
      return {
        Block: l.blk === 'A' ? 'A · 100% Operyx' : 'B · Standard split',
        Date: l.fecha || '', Client: l.cliente || '', DOT: l.dot || '', 'Load ID / Ref': l.ref || '', Type: tipoEN(l.tipo), Service: l.tipo || '',
        Gross: n(l.gross), 'Service fee': n(l.fee), 'Rate / Split': (l.rate || '') + ' · ' + pct(l.pct_operyx) + '/' + pct(100 - n(l.pct_operyx)),
        'Due Operyx': n(l.operyx), 'Retained ProtectGo': n(l.protectgo), 'Transaction #': l.transaccion || ''
      };
    });
  }

  function correo(st) {
    var subj = 'Operyx Monthly Account Statement ' + (st.numero || '') + ' · ' + mes(st) + ' · ' + usd(st.total_operyx);
    var body = 'Hi Jeff,\n\nAttached is the Monthly Account Statement ' + (st.numero || '') + ' (Operyx Group x ProtectGo Services).\n\n' +
      'Period: ' + fUS(st.desde) + ' - ' + fUS(st.hasta) + '\n' +
      'Operations: ' + (st.cobros || 0) + '\n' +
      'Total service fees collected: ' + usd(st.fees != null ? st.fees : st.cobrado) + '\n' +
      'Total retained by ProtectGo: ' + usd(st.total_protectgo) + '\n' +
      'TOTAL DUE TO JUAN PABLO (OPERYX): ' + usd(st.total_operyx) + '\n' +
      'Due date: ' + fUS(st.due_date) + '\n\n' +
      '(Attach the PDF ' + nombre(st) + '.pdf before sending.)\n\nThank you.';
    return { to: 'fam@protectgoservices.com', subject: subj, body: body };
  }

  async function pdfBytes(st, pagoTxt) {
    var P = window.PDFLib; if (!P) throw new Error('pdf-lib no está cargado');
    var doc = await P.PDFDocument.create();
    doc.setTitle(w('Monthly Account Statement ' + (st.numero || '')));
    doc.setAuthor('ProtectGo Services'); doc.setCreator('Amazon Relay · ProtectGo');
    var F = await doc.embedFont(P.StandardFonts.Helvetica), B = await doc.embedFont(P.StandardFonts.HelveticaBold);
    var C = { ink: P.rgb(0, 0.184, 0.239), mint: P.rgb(0.133, 0.604, 0.51), amb: P.rgb(0.851, 0.647, 0.125), mut: P.rgb(0.42, 0.49, 0.54), line: P.rgb(0.86, 0.89, 0.91), soft: P.rgb(0.95, 0.97, 0.97), white: P.rgb(1, 1, 1), txt: P.rgb(0.1, 0.13, 0.16) };
    var W = 612, H = 792, M = 40, pages = [], pg, y;
    function nueva() { pg = doc.addPage([W, H]); pages.push(pg); y = H - M; }
    function tx(s, x, yy, o) {
      o = o || {}; var f = o.b ? B : F, size = o.s || 9, t = w(s);
      if (o.max) { while (t.length > 1 && f.widthOfTextAtSize(t, size) > o.max) t = t.slice(0, -2) + '…'; }
      var xx = x; if (o.r) xx = x - f.widthOfTextAtSize(t, size);
      pg.drawText(t, { x: xx, y: yy, size: size, font: f, color: o.c || C.txt });
    }
    function rect(x, yy, ww, hh, c) { pg.drawRectangle({ x: x, y: yy, width: ww, height: hh, color: c }); }
    function hr(yy, c, t) { pg.drawLine({ start: { x: M, y: yy }, end: { x: W - M, y: yy }, thickness: t || 0.6, color: c || C.line }); }

    /* ---- cabecera ---- */
    nueva();
    rect(0, H - 92, W, 92, C.ink);
    tx('OPERYX GROUP × PROTECTGO SERVICES', M, H - 42, { b: true, s: 15, c: C.white });
    tx('MONTHLY ACCOUNT STATEMENT', M, H - 62, { b: true, s: 10.5, c: P.rgb(0.55, 0.85, 0.77) });
    tx(mes(st), W - M, H - 42, { b: true, s: 12, c: C.white, r: true });
    tx('Statement No. ' + (st.numero || '-'), W - M, H - 62, { s: 9.5, c: P.rgb(0.8, 0.88, 0.9), r: true });
    y = H - 118;
    var meta = [
      ['Statement No.', st.numero || '-'], ['Period', fUS(st.desde) + ' - ' + fUS(st.hasta)],
      ['Issue date', fUS(st.created_at)], ['Due date', fUS(st.due_date)],
      ['Payee', 'Juan Pablo (Operyx Group)'], ['Bill to', 'Jeff (FAM / ProtectGo)']
    ];
    for (var i = 0; i < meta.length; i++) {
      var col = i % 2, x0 = M + col * 270;
      if (col === 0 && i) y -= 26;
      tx(meta[i][0].toUpperCase(), x0, y, { b: true, s: 7.5, c: C.mut });
      tx(meta[i][1], x0, y - 12, { b: meta[i][0] === 'Due date', s: 10, max: 255 });
    }
    y -= 34; hr(y);

    /* ---- resumen ejecutivo ---- */
    y -= 22; tx('EXECUTIVE SUMMARY', M, y, { b: true, s: 9, c: C.mint });
    var fees = st.fees != null ? st.fees : st.cobrado;
    var res = [
      ['Total gross revenue managed', usd(st.gross)],
      ['Total service fees collected', usd(fees)],
      ['Total retained by ProtectGo', usd(st.total_protectgo != null ? st.total_protectgo : st.agencia)]
    ];
    y -= 8;
    res.forEach(function (r) { y -= 18; rect(M, y - 5, W - 2 * M, 18, C.soft); tx(r[0], M + 10, y, { s: 10 }); tx(r[1], W - M - 10, y, { s: 10, r: true }); });
    y -= 26; rect(M, y - 8, W - 2 * M, 24, C.amb);
    tx('TOTAL DUE TO JUAN PABLO (OPERYX)', M + 10, y, { b: true, s: 11, c: C.ink });
    tx(usd(st.total_operyx != null ? st.total_operyx : st.operario), W - M - 10, y, { b: true, s: 12, c: C.ink, r: true });
    tx((st.cobros || 0) + ' operation(s) · ' + lineas(st).length + ' line(s)', M, y - 24, { s: 8, c: C.mut });
    y -= 40;

    /* ---- detalle ---- */
    var cols = [
      { t: 'Date', w: 50 }, { t: 'Client', w: 112 }, { t: 'Load ID / Ref', w: 112 }, { t: 'Type', w: 72 },
      { t: 'Gross', w: 58, r: 1 }, { t: 'Rate / Split', w: 66 }, { t: 'Due Operyx', w: 62, r: 1 }
    ];
    function cab() {
      rect(M, y - 5, W - 2 * M, 16, C.ink);
      var x = M + 4; cols.forEach(function (c) { tx(c.t.toUpperCase(), c.r ? x + c.w - 8 : x, y, { b: true, s: 7, c: C.white, r: !!c.r }); x += c.w; });
      y -= 16;
    }
    function espacio(h) { if (y - h < M + 40) { nueva(); y -= 6; return true; } return false; }
    function bloque(letra, titulo, ls) {
      if (!ls.length) return;
      espacio(60);
      y -= 6; tx(letra + ' · ' + titulo, M, y, { b: true, s: 9.5, c: C.ink }); y -= 16; cab();
      var sg = 0, so = 0, sf = 0;
      ls.forEach(function (l, k) {
        if (espacio(16)) { tx(letra + ' · ' + titulo + ' (cont.)', M, y, { b: true, s: 9, c: C.ink }); y -= 16; cab(); }
        if (k % 2) rect(M, y - 4, W - 2 * M, 14, C.soft);
        var vals = [fCorta(l.fecha), l.cliente || '-', l.ref || '-', tipoEN(l.tipo), usd(l.gross),
          (l.rate || '-') + ' · ' + pct(l.pct_operyx) + '/' + pct(100 - n(l.pct_operyx)), usd(l.operyx)];
        var x = M + 4;
        cols.forEach(function (c, j) { tx(vals[j], c.r ? x + c.w - 8 : x, y, { s: 7.6, r: !!c.r, max: c.w - 8 }); x += c.w; });
        sg += n(l.gross); sf += n(l.fee); so += n(l.operyx); y -= 14;
      });
      espacio(18); hr(y + 9, C.ink, 0.8);
      tx('Subtotal ' + letra + ' · fees ' + usd(sf), M + 4, y - 2, { b: true, s: 8 });
      tx(usd(sg), M + 4 + 50 + 112 + 112 + 72 + 58 - 8, y - 2, { b: true, s: 8, r: true });
      tx(usd(so), W - M - 4, y - 2, { b: true, s: 8, r: true });
      y -= 22;
    }
    var A = lineas(st).filter(function (l) { return l.blk === 'A'; }), Bl = lineas(st).filter(function (l) { return l.blk !== 'A'; });
    espacio(40); tx('ITEMIZED BREAKDOWN', M, y, { b: true, s: 9, c: C.mint }); y -= 14;
    bloque('A', 'Clients 100% Operyx', A);
    bloque('B', 'Standard split', Bl);
    if (!A.length && !Bl.length) { tx('No operations in this period.', M, y, { s: 9, c: C.mut }); y -= 18; }
    espacio(26); rect(M, y - 6, W - 2 * M, 20, C.soft);
    tx('TOTAL DUE TO JUAN PABLO (OPERYX)', M + 8, y, { b: true, s: 9.5, c: C.ink });
    tx(usd(st.total_operyx != null ? st.total_operyx : st.operario), W - M - 8, y, { b: true, s: 10, c: C.ink, r: true });
    y -= 34;

    /* ---- instrucciones de pago ---- */
    var pago = String(pagoTxt || '').trim();
    var pl = pago ? pago.split(/\r?\n/) : ['Payment details on file.'];
    espacio(40 + pl.length * 12);
    tx('PAYMENT INSTRUCTIONS', M, y, { b: true, s: 9, c: C.mint }); y -= 14;
    tx('Please remit ' + usd(st.total_operyx != null ? st.total_operyx : st.operario) + ' to Juan Pablo (Operyx Group) on or before ' + fUS(st.due_date) + '.', M, y, { s: 9 }); y -= 14;
    pl.forEach(function (t) { espacio(14); tx(t, M, y, { s: 9, max: W - 2 * M }); y -= 12; });

    /* ---- pie en todas las páginas ---- */
    pages.forEach(function (p, k) {
      pg = p; hr(M - 6);
      tx('ProtectGo Services · Operyx Group · ' + (st.numero || ''), M, M - 18, { s: 7.5, c: C.mut });
      tx('Page ' + (k + 1) + ' of ' + pages.length, W - M, M - 18, { s: 7.5, c: C.mut, r: true });
    });
    return doc.save();
  }

  async function descargarPDF(st, pagoTxt) {
    var bytes = await pdfBytes(st, pagoTxt);
    var blob = new Blob([bytes], { type: 'application/pdf' });
    var a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = nombre(st) + '.pdf';
    document.body.appendChild(a); a.click(); setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 1500);
    return bytes;
  }

  window.MSStatement = { pdfBytes: pdfBytes, descargarPDF: descargarPDF, filas: filas, nombre: nombre, correo: correo, mes: mes, usd: usd };
})();
