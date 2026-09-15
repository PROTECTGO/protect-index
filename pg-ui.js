/* =====================================================================
   ESTÁNDAR VISUAL PROTECTGO · pg-ui.js · v1 (4-sep-2026)
   Helpers de pintado compartidos. Base: 03_ui.js de Amazon Relay R1,
   destilado de renovaciones.html v27. Cada helper recibe datos y devuelve
   HTML/SVG como string; NO hay negocio aquí, solo pintar.
   Uso: pegar dentro de <script> ANTES del script de la app (o <script src>).
   Después de meter HTML en el DOM, llamar ui.mount(el) para animar barras,
   activar tooltips delegados y teclado.
   Depende de: nada (vanilla). ui.pgv y ui.esDireccion reciben el cliente
   supabase por parámetro.
   Cambios vs 03_ui.js: se quitó ui.memo (prefijo AMZ-, exclusivo de Amazon).
   ===================================================================== */
(function (w) {
  'use strict';
  const ui = {};
  const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  const MESES_L = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];

  /* =====================================================================
     FORMATO (todo número que sale de aquí va en JetBrains Mono por CSS)
     ===================================================================== */

  /** ui.esc(s: any) → string · escapa & < > " ' para meter texto en HTML. */
  ui.esc = s => (s ?? '').toString().replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

  /** ui.money(n: number, dec = 0) → '$1,234' · negativos '−$1,234' (menos tipográfico). */
  ui.money = (n, dec = 0) => { n = Number(n || 0); const s = Math.abs(n).toLocaleString('en-US', { minimumFractionDigits: dec, maximumFractionDigits: dec }); return (n < 0 ? '−$' : '$') + s; };

  /** ui.money2(n) → '$1,234.50' · dos decimales. */
  ui.money2 = n => ui.money(n, 2);

  /** ui.moneyC(n) → compacto: '$1.25M' / '$12.4K' / '$980' · para ejes y cintas. */
  ui.moneyC = n => { n = Number(n || 0); const a = Math.abs(n); const s = a >= 1e6 ? (a / 1e6).toFixed(2) + 'M' : a >= 1e4 ? (a / 1e3).toFixed(1) + 'K' : a.toLocaleString('en-US', { maximumFractionDigits: 0 }); return (n < 0 ? '−$' : '$') + s; };

  /** ui.cop(n) → 'COP 3.000.000' (es-CO, sin decimales). */
  ui.cop = n => { n = Number(n || 0); return (n < 0 ? '−' : '') + 'COP ' + Math.abs(Math.round(n)).toLocaleString('es-CO'); };

  /** ui.pct(n, dec = 1) → '36.1%' · null/NaN → '—' · quita '.0'. */
  ui.pct = (n, dec = 1) => (n == null || isNaN(n)) ? '—' : Number(n).toFixed(dec).replace(/\.0$/, '') + '%';

  /** ui.int(n) → '1,234'. */
  ui.int = n => Number(n || 0).toLocaleString('en-US');

  /** ui.mesCorto(i: 0-11) → 'ENE' · ui.mesLargo(i) → 'enero'. */
  ui.mesCorto = i => MESES[i] ? MESES[i].toUpperCase() : '';
  ui.mesLargo = i => MESES_L[i] || '';

  /** ui.fecha(d: 'YYYY-MM-DD'|ISO) → '30 jul' · ui.fechaL(d) → '30 jul 2026' · vacío → '—'. */
  ui.fecha = d => { if (!d) return '—'; const x = new Date(d.length === 10 ? d + 'T12:00:00' : d); return x.toLocaleDateString('es-CO', { day: '2-digit', month: 'short' }); };
  ui.fechaL = d => { if (!d) return '—'; const x = new Date(d.length === 10 ? d + 'T12:00:00' : d); return x.toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' }); };

  /** ui.hora(d?) → '04:56 p. m.' (es-CO) · sin argumento = ahora. */
  ui.hora = d => new Date(d || Date.now()).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });

  /** ui.semanaISO(d) → '2026-W36'. */
  ui.semanaISO = d => { const x = new Date(d.length === 10 ? d + 'T12:00:00' : d); const t = new Date(Date.UTC(x.getFullYear(), x.getMonth(), x.getDate())); const dn = t.getUTCDay() || 7; t.setUTCDate(t.getUTCDate() + 4 - dn); const y0 = new Date(Date.UTC(t.getUTCFullYear(), 0, 1)); const wk = Math.ceil(((t - y0) / 864e5 + 1) / 7); return t.getUTCFullYear() + '-W' + String(wk).padStart(2, '0'); };

  const neg = n => Number(n) < 0;

  /* =====================================================================
     PIEZAS DEL CATÁLOGO
     ===================================================================== */

  /** ui.kpis(list: [{k, v, d?, raw?, neg?, oscuro?, tip?}]) → <div class="kpis"> con N .kp
      · el primero es .oscuro (ancla) salvo que se pase oscuro:false · raw<0 o neg:true → .v.neg
      · v ya viene formateado (ui.money…); k = etiqueta; d = línea de apoyo. */
  ui.kpis = list => `<div class="kpis">${list.map((k, i) => `
    <div class="kp${(k.oscuro ?? i === 0) ? ' oscuro' : ''}"${k.tip ? ` data-tip="${ui.esc(k.tip)}"` : ''}>
      <div class="k">${ui.esc(k.k)}</div>
      <div class="v${k.neg ?? neg(k.raw) ? ' neg' : ''}">${k.v}</div>
      <div class="d">${k.d || ''}</div>
    </div>`).join('')}</div>`;

  /** ui.ring(pct: number|null, o = {size=128, r=52, color='var(--mint)', neg?, cap?, pct2?, color2='#8FA3B0'})
      → <div class="ring"><svg>…</svg>[<div class="cap">]</div>
      · anillo SVG 128px r=52 grosor 10, fondo rgba(255,255,255,.14) (va dentro de .strip)
      · pct null → '—' · pct2 = segundo anillo interior (r-14) para comparar, p. ej. "vs área". */
  ui.ring = (pct, o = {}) => {
    const size = o.size || 128, r = o.r || 52, c = 2 * Math.PI * r;
    const sinDato = pct == null || isNaN(Number(pct));
    const p = sinDato ? 0 : Math.max(0, Math.min(100, Number(pct) || 0));
    const isNeg = o.neg ?? (Number(pct) < 0);
    const col = isNeg ? 'var(--rojo-claro)' : (o.color || 'var(--mint)');
    return `<div class="ring"><svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="10"/>
      ${o.pct2 != null ? `<circle cx="${size / 2}" cy="${size / 2}" r="${r - 14}" fill="none" stroke="rgba(255,255,255,.14)" stroke-width="6"/>
      <circle cx="${size / 2}" cy="${size / 2}" r="${r - 14}" fill="none" stroke="${o.color2 || '#8FA3B0'}" stroke-width="6" stroke-linecap="round" stroke-dasharray="${(2 * Math.PI * (r - 14)) * Math.max(0, Math.min(100, o.pct2)) / 100} ${2 * Math.PI * (r - 14)}" transform="rotate(-90 ${size / 2} ${size / 2})" style="transition:stroke-dasharray .7s"/>` : ''}
      <circle cx="${size / 2}" cy="${size / 2}" r="${r}" fill="none" stroke="${col}" stroke-width="10" stroke-linecap="round" stroke-dasharray="${c * p / 100} ${c}" transform="rotate(-90 ${size / 2} ${size / 2})" style="transition:stroke-dasharray .7s"/>
      <text x="50%" y="50%" dominant-baseline="central" text-anchor="middle" class="pct${isNeg ? ' neg' : ''}">${sinDato ? '—' : ui.pct(pct, 0)}</text>
    </svg>${o.cap ? `<div class="cap">${o.cap}</div>` : ''}</div>`;
  };

  /** ui.strip(o: {eye, big, unit?, raw?, neg?, nums?: [{k, v, cls?: 'mint'|'neg'|'ambar'}], aviso?, ring?: {pct, cap, …}})
      → <div class="strip"> franja oscura: eyebrow menta · número gigante (.st-big) + unidad
      · fila de cifras .st-nums · aviso ámbar opcional (.st-aviso) · anillo a la derecha. */
  ui.strip = o => `<div class="strip">
    <div>
      <div class="st-eye">${ui.esc(o.eye || '')}</div>
      <div class="st-big${o.neg ?? neg(o.raw) ? ' neg' : ''}">${o.big}${o.unit ? `<small>${ui.esc(o.unit)}</small>` : ''}</div>
      ${o.nums && o.nums.length ? `<div class="st-nums">${o.nums.map(n => `<div class="st-n"><div class="k">${ui.esc(n.k)}</div><div class="v${n.cls ? ' ' + n.cls : ''}">${n.v}</div></div>`).join('')}</div>` : ''}
      ${o.aviso ? `<div class="st-aviso">${o.aviso}</div>` : ''}
    </div>
    ${o.ring ? ui.ring(o.ring.pct, o.ring) : ''}
  </div>`;

  /** ui.cinta(meses: [{lbl, num?, a, b, bneg?, futuro?, on?, tip?, v?, tick?}], opts = {max?, tick?})
      → <div class="months-scroll"><div class="months" role="tablist"> 12 <button class="mo" role="tab">
      · a = segmento superior AZUL (--falta: por renovar / costo / pendiente)
      · b = segmento inferior VERDE (--renov: renovado / utilidad); bneg:true → rojo (.seg-n)
      · tick = fracción 0–1 de la meta → marca punteada ámbar por barra (.tick); null = sin meta
      · alto de barra 104px; escala = opts.max o máximo de a+b · las alturas se animan en ui.mount. */
  ui.cinta = (meses, opts = {}) => {
    const H = 104;
    const max = opts.max || Math.max(1, ...meses.map(m => Math.abs(m.a || 0) + Math.abs(m.b || 0)));
    return `<div class="months-scroll"><div class="months" role="tablist">${meses.map(m => {
      const ha = Math.round(H * Math.abs(m.a || 0) / max), hb = Math.round(H * Math.abs(m.b || 0) / max);
      const tick = m.tick != null ? m.tick : opts.tick;
      return `<button type="button" class="mo${m.on ? ' on' : ''}${m.futuro ? ' futuro' : ''}" role="tab" aria-selected="${!!m.on}" data-mes="${m.v ?? ''}"${m.tip ? ` data-tip="${ui.esc(m.tip)}"` : ''}>
        <div class="bar">${tick != null ? `<div class="tick" style="bottom:${Math.round(H * tick)}px"></div>` : ''}
          <div class="seg-f" data-h="${ha}" style="height:0"></div>
          <div class="${m.bneg ? 'seg-n' : 'seg-r'}" data-h="${hb}" style="height:0"></div>
        </div>
        <div class="lbl">${ui.esc(m.lbl)}</div><div class="num">${m.num ?? ''}</div>
      </button>`;
    }).join('')}</div></div>`;
  };

  /** ui.chips(list: [{id, lbl, n?, on?}], extra = '') → <div class="chips"> con <button class="chip" data-chip=id>
      · n = conteo en mono (.n) · extra = HTML que se pega al final (normalmente ui.buscar). */
  ui.chips = (list, extra = '') => `<div class="chips">${list.map(c => `<button type="button" class="chip${c.on ? ' on' : ''}" data-chip="${ui.esc(c.id)}">${ui.esc(c.lbl)}${c.n != null ? `<span class="n">${c.n}</span>` : ''}</button>`).join('')}${extra}</div>`;

  /** ui.buscar(id, ph = 'Buscar…') → <div class="buscar"><input id=id type="search"> · se alinea a la derecha de .chips. */
  ui.buscar = (id, ph = 'Buscar…') => `<div class="buscar"><input id="${id}" type="search" placeholder="${ui.esc(ph)}" autocomplete="off" aria-label="${ui.esc(ph)}"></div>`;

  /** ui.card(o: {id, nom, extra?, meta?: [html…], prem?, premSub?, pill?: {cls: 'p-pend'|'p-cont'|'p-cot'|'p-ren'|'p-per', txt},
                  u?: 'rojo'|'ambar'|'gris'|'mint', hecha?, abierta?, tip?, acciones?: [{lbl, act, disabled?, title?}]})
      → <div class="card u-… [hecha] [abierta]" tabindex="0" role="button" data-card=id>
      · columna 1: .c-nom + .c-meta (separados por .dot) + .acciones (botones .mini data-act, aparecen al hover/focus)
      · columna 2: .c-prem (número grande) + .pz (línea de apoyo) · columna 3: .pill
      · u = borde izquierdo de urgencia · hecha = atenuada · abierta = tiene ficha debajo. */
  ui.card = o => `<div class="card u-${o.u || 'gris'}${o.hecha ? ' hecha' : ''}${o.abierta ? ' abierta' : ''}" tabindex="0" role="button" data-card="${ui.esc(o.id)}"${o.tip ? ` data-tip="${ui.esc(o.tip)}"` : ''}>
    <div>
      <div class="c-nom">${ui.esc(o.nom)}${o.extra || ''}</div>
      <div class="c-meta">${(o.meta || []).filter(Boolean).map((m, i) => (i ? '<span class="dot"></span>' : '') + m).join('')}</div>
      ${o.acciones && o.acciones.length ? `<div class="acciones">${o.acciones.map(a => `<button type="button" class="mini" data-act="${ui.esc(a.act)}" data-id="${ui.esc(o.id)}"${a.disabled ? ' disabled' : ''}${a.title ? ` title="${ui.esc(a.title)}"` : ''}>${ui.esc(a.lbl)}</button>`).join('')}</div>` : ''}
    </div>
    <div class="c-prem">${o.prem ?? ''}${o.premSub ? `<span class="pz">${o.premSub}</span>` : ''}</div>
    ${o.pill ? `<span class="pill ${o.pill.cls || 'p-pend'}">${ui.esc(o.pill.txt)}</span>` : '<span></span>'}
  </div>`;

  /** ui.ficha(bloques: [{tit?, html}], id?) → <div class="ficha" data-ficha=id> con N .fi-bloque (.fi-tit + html)
      · se inserta con insertAdjacentHTML('afterend') debajo de la .card abierta. */
  ui.ficha = (bloques, id) => `<div class="ficha"${id ? ` data-ficha="${ui.esc(id)}"` : ''}>${bloques.map(b => `<div class="fi-bloque">${b.tit ? `<div class="fi-tit">${ui.esc(b.tit)}</div>` : ''}${b.html || ''}</div>`).join('')}</div>`;

  /** ui.datos(list: [{l, v, txt?}]) → <div class="fi-grid"> de .fi-dato (etiqueta .l + valor .v en mono; txt:true → Inter). */
  ui.datos = list => `<div class="fi-grid">${list.map(d => `<div class="fi-dato"><div class="l">${ui.esc(d.l)}</div><div class="v${d.txt ? ' txt' : ''}">${d.v ?? '—'}</div></div>`).join('')}</div>`;

  /** ui.vr(o: {nom, sub?, a, b, max?, num?, pct?, pctCls?: 'bien'|'bajo'|'neg', tip?})
      → <div class="vr"> fila con dos barras: a = arriba AZUL (vendió / cobrado), b = abajo VERDE (renovó / utilidad); b<0 → rojo
      · .vnum a la derecha + .vpct (píldora de %) · anchos se animan en ui.mount. */
  ui.vr = o => { const max = o.max || Math.max(1, Math.abs(o.a || 0), Math.abs(o.b || 0)); return `<div class="vr"${o.tip ? ` data-tip="${ui.esc(o.tip)}"` : ''}>
    <div class="vn">${ui.esc(o.nom)}${o.sub ? `<small>${o.sub}</small>` : ''}</div>
    <div class="vbars"><div class="vb a" data-w="${Math.round(100 * Math.abs(o.a || 0) / max)}" style="width:0"></div><div class="vb b${neg(o.b) ? ' neg' : ''}" data-w="${Math.round(100 * Math.abs(o.b || 0) / max)}" style="width:0"></div></div>
    <div class="vnum">${o.num ?? ''}${o.pct != null ? `<br><span class="vpct ${o.pctCls || ''}">${ui.pct(o.pct)}</span>` : ''}</div>
  </div>`; };

  /** ui.barrow(o: {l, sub?, val, max?, neg?, marcas?: [{pos, cls: 'prom'|'est', lab}], n?, nsub?})
      → <div class="barrow"> barra .track/.fillb con marcas verticales: prom = gris #8FA3B0 (promedio), est = ámbar (estándar/objetivo)
      · cada marca lleva su etiqueta .mklab SIEMPRE visible (regla del ámbar) · escala = max o 1.08 × máximo. */
  ui.barrow = o => { const max = o.max || Math.max(1, Math.abs(o.val || 0), ...(o.marcas || []).map(m => Math.abs(m.pos || 0))) * 1.08; const pw = v => Math.max(0, Math.min(100, 100 * v / max)); return `<div class="barrow">
    <div class="l">${ui.esc(o.l)}${o.sub ? `<small>${o.sub}</small>` : ''}</div>
    <div class="track"><div class="fillb${o.neg ? ' neg' : ''}" data-w="${pw(o.val || 0)}" style="width:0"></div>
      ${(o.marcas || []).map(m => `<div class="mk ${m.cls || 'prom'}" style="left:${pw(m.pos)}%"></div><div class="mklab" style="left:${pw(m.pos)}%">${ui.esc(m.lab)}</div>`).join('')}</div>
    <div class="n">${o.n ?? ''}${o.nsub ? `<small>${o.nsub}</small>` : ''}</div>
  </div>`; };

  /** ui.estados(list: [{l, n, color, sub?}]) → <div class="estados"> filas .er: cuadrito de color + etiqueta · barra horizontal · número (.n) + apoyo. */
  ui.estados = list => { const max = Math.max(1, ...list.map(x => x.n || 0)); return `<div class="estados">${list.map(x => `<div class="er"><div class="l"><i style="background:${x.color}"></i>${ui.esc(x.l)}</div><div class="t"><i data-w="${Math.round(100 * (x.n || 0) / max)}" style="width:0;background:${x.color}"></i></div><div class="n">${ui.int(x.n)}${x.sub ? `<small>${x.sub}</small>` : ''}</div></div>`).join('')}</div>`; };

  /** ui.svgCombo(meses: [{lbl, bar, line?: 0-100|null, tip?}], o = {aria?})
      → <svg class="svgw" viewBox="0 0 820 260" preserveAspectRatio="xMidYMid meet">
      · barras VERDES (negativas en rojo) + línea ÁMBAR de % con puntos, eje izq en $ compacto, eje der 0/50/100 %
      · rejilla .gl, ejes .ax/.axn, zonas .hit con data-tip por mes. Cero librerías. */
  ui.svgCombo = (meses, o = {}) => {
    const W = 820, H = 260, L = 58, R = 46, T = 16, B = 34, iw = W - L - R, ih = H - T - B;
    const vals = meses.map(m => Number(m.bar || 0));
    const maxV = Math.max(1, ...vals.map(Math.abs));
    const minV = Math.min(0, ...vals);
    const range = maxV - minV || 1;
    const y = v => T + ih * (1 - (v - minV) / range);
    const y0 = y(0);
    const step = iw / meses.length, bw = step * 0.5;
    const grid = [0, .25, .5, .75, 1].map(f => { const v = minV + f * range; return `<line class="gl" x1="${L}" x2="${W - R}" y1="${y(v)}" y2="${y(v)}"/><text class="axn" x="${L - 8}" y="${y(v) + 3}" text-anchor="end">${ui.moneyC(v)}</text>`; }).join('');
    const bars = meses.map((m, i) => { const v = Number(m.bar || 0), x = L + i * step + (step - bw) / 2; const yy = Math.min(y0, y(v)), h = Math.abs(y0 - y(v)); return `<rect x="${x}" y="${yy}" width="${bw}" height="${h}" rx="3" fill="${v < 0 ? 'var(--rojo)' : 'var(--renov)'}"/>`; }).join('');
    const pts = meses.map((m, i) => m.line == null ? null : [L + i * step + step / 2, T + ih * (1 - Math.max(0, Math.min(100, m.line)) / 100)]).filter(Boolean);
    const line = pts.length > 1 ? `<polyline fill="none" stroke="var(--ambar)" stroke-width="2.5" stroke-linejoin="round" points="${pts.map(p => p.join(',')).join(' ')}"/>` : '';
    const dots = pts.map(p => `<circle cx="${p[0]}" cy="${p[1]}" r="4.5" fill="#fff" stroke="var(--ambar)" stroke-width="2.5"/>`).join('');
    const right = [0, 50, 100].map(v => `<text class="axn" x="${W - R + 8}" y="${T + ih * (1 - v / 100) + 3}">${v}%</text>`).join('');
    const xl = meses.map((m, i) => `<text class="ax" x="${L + i * step + step / 2}" y="${H - 10}" text-anchor="middle">${ui.esc(m.lbl)}</text>`).join('');
    const hits = meses.map((m, i) => `<rect class="hit" x="${L + i * step}" y="${T}" width="${step}" height="${ih}"${m.tip ? ` data-tip="${ui.esc(m.tip)}"` : ''}/>`).join('');
    return `<svg class="svgw" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${ui.esc(o.aria || 'Gráfica')}">${grid}<line class="gl" x1="${L}" x2="${W - R}" y1="${y0}" y2="${y0}" style="stroke:#B6C2CB"/>${bars}${line}${dots}${right}${xl}${hits}</svg>`;
  };

  /** ui.svgLineas(xs: number[], series: [{nombre, color, ys: number[], dash?}], o = {marca?: {y, lbl}, cruce?: {x, y, lbl}, xLbl?, aria?})
      → <svg class="svgw" viewBox="0 0 820 290" preserveAspectRatio="xMidYMid meet">
      · N polilíneas con su nombre al final · marca horizontal ámbar punteada (meta) · cruce = punto marcado con línea vertical gris. */
  ui.svgLineas = (xs, series, o = {}) => {
    const W = 820, H = 290, L = 62, R = 24, T = 18, B = 46, iw = W - L - R, ih = H - T - B;
    const all = series.flatMap(s => s.ys).concat(o.marca ? [o.marca.y] : []);
    const maxY = Math.max(1, ...all), minY = Math.min(0, ...all), rY = maxY - minY || 1;
    const maxX = Math.max(...xs), minX = Math.min(...xs), rX = maxX - minX || 1;
    const X = v => L + iw * (v - minX) / rX, Y = v => T + ih * (1 - (v - minY) / rY);
    const grid = [0, .25, .5, .75, 1].map(f => { const v = minY + f * rY; return `<line class="gl" x1="${L}" x2="${W - R}" y1="${Y(v)}" y2="${Y(v)}"/><text class="axn" x="${L - 8}" y="${Y(v) + 3}" text-anchor="end">${ui.moneyC(v)}</text>`; }).join('');
    const zero = minY < 0 ? `<line x1="${L}" x2="${W - R}" y1="${Y(0)}" y2="${Y(0)}" stroke="#B6C2CB" stroke-width="1.5"/>` : '';
    const xl = xs.filter((_, i) => i % Math.ceil(xs.length / 8) === 0 || i === xs.length - 1).map(v => `<text class="axn" x="${X(v)}" y="${H - 26}" text-anchor="middle">${ui.moneyC(v)}</text>`).join('');
    const lines = series.map(s => `<polyline fill="none" stroke="${s.color}" stroke-width="${s.dash ? 2 : 2.5}"${s.dash ? ' stroke-dasharray="6 5"' : ''} stroke-linejoin="round" points="${s.ys.map((v, i) => X(xs[i]) + ',' + Y(v)).join(' ')}"/><text class="ax" x="${X(xs[xs.length - 1]) - 4}" y="${Y(s.ys[s.ys.length - 1]) - 8}" text-anchor="end" style="fill:${s.color};text-transform:none;letter-spacing:0">${ui.esc(s.nombre)}</text>`).join('');
    const marca = o.marca ? `<line x1="${L}" x2="${W - R}" y1="${Y(o.marca.y)}" y2="${Y(o.marca.y)}" stroke="var(--ambar)" stroke-width="2" stroke-dasharray="6 5"/><text class="axn" x="${W - R}" y="${Y(o.marca.y) - 6}" text-anchor="end" style="fill:var(--ambar)">${ui.esc(o.marca.lbl)}</text>` : '';
    const cruce = o.cruce ? `<line x1="${X(o.cruce.x)}" x2="${X(o.cruce.x)}" y1="${T}" y2="${H - B}" stroke="#8FA3B0" stroke-dasharray="3 4"/><circle cx="${X(o.cruce.x)}" cy="${Y(o.cruce.y)}" r="6" fill="#fff" stroke="var(--ink)" stroke-width="2.5"/><text class="ax" x="${X(o.cruce.x) + 10}" y="${Y(o.cruce.y) - 10}" style="fill:var(--ink);text-transform:none;letter-spacing:0">${ui.esc(o.cruce.lbl || '')}</text>` : '';
    return `<svg class="svgw" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid meet" role="img" aria-label="${ui.esc(o.aria || 'Gráfica de líneas')}">${grid}${zero}${lines}${marca}${cruce}${xl}<text class="ax" x="${W / 2}" y="${H - 6}" text-anchor="middle" style="font-size:9.5px">${ui.esc(o.xLbl || 'eje x')}</text></svg>`;
  };

  /** ui.panel(o: {id?, tit, sub?, leg?: [{color, lbl}], der?, body?}) → <div class="panel"><div class="ph">título .pt + .ps + leyenda .leg + der</div>body</div>
      · body va tal cual: envolverlo en <div class="pb"> si necesita padding, o pasar ui.cinta / ui.estados que ya lo llevan. */
  ui.panel = (o) => `<div class="panel"${o.id ? ` id="${o.id}"` : ''}><div class="ph"><div><div class="pt">${ui.esc(o.tit)}</div>${o.sub ? `<div class="ps">${o.sub}</div>` : ''}</div>${o.leg ? `<div class="leg">${o.leg.map(l => `<span><i style="background:${l.color}"></i>${ui.esc(l.lbl)}</span>`).join('')}</div>` : ''}${o.der || ''}</div>${o.body || ''}</div>`;

  /** ui.skel(n = 3, cls = '') → n <div class="pg-skel [h36|h104|h160]"> · esqueleto por bloque mientras carga (render progresivo). */
  ui.skel = (n = 3, cls = '') => Array.from({ length: n }, () => `<div class="pg-skel ${cls}"></div>`).join('');

  /** ui.err(que: string, retryFn?: string) → <div class="bloque-err">No se pudo cargar <b>que</b>. [Reintentar]</div>
      · error por bloque, nunca pantalla vacía · retryFn es el texto del onclick (p. ej. 'loadAll().then(render)'). */
  ui.err = (que, retryFn) => `<div class="bloque-err"><span>No se pudo cargar <b>${ui.esc(que)}</b>.</span>${retryFn ? `<button type="button" class="mini" onclick="${retryFn}">Reintentar</button>` : ''}</div>`;

  /** ui.vacio(html) → <div class="vacio"> estado vacío honesto (nunca datos inventados). */
  ui.vacio = html => `<div class="vacio">${html}</div>`;

  /** ui.pend(txt = 'pendiente') → <span class="pend"> etiqueta ámbar mayúscula para "dato pendiente de definir". */
  ui.pend = txt => `<span class="pend">${ui.esc(txt || 'pendiente')}</span>`;

  /* =====================================================================
     MOUNT: animaciones, tooltips delegados, teclado, delegación de clics
     ===================================================================== */
  let tipEl = null;
  function tip() { if (!tipEl) { tipEl = document.createElement('div'); tipEl.className = 'tip'; document.body.appendChild(tipEl); } return tipEl; }
  /* un solo listener para toda la página: cualquier [data-tip] muestra su HTML en .tip */
  document.addEventListener('mousemove', e => {
    const t = e.target.closest && e.target.closest('[data-tip]');
    const el = tip();
    if (!t) { el.style.opacity = 0; return; }
    el.innerHTML = t.dataset.tip; el.style.opacity = 1;
    const x = Math.min(e.clientX + 14, w.innerWidth - el.offsetWidth - 10), y = Math.min(e.clientY + 14, w.innerHeight - el.offsetHeight - 10);
    el.style.left = x + 'px'; el.style.top = y + 'px';
  }, { passive: true });
  /* teclado: Enter/Espacio sobre .card[role=button] = clic */
  document.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches && e.target.matches('.card[role=button]')) { e.preventDefault(); e.target.click(); }
  });

  /** ui.mount(el = document) → void · tras pintar: anima [data-h] (alturas px) y [data-w] (anchos %) en el siguiente frame. */
  ui.mount = el => {
    el = el || document;
    requestAnimationFrame(() => requestAnimationFrame(() => {
      el.querySelectorAll('[data-h]').forEach(x => x.style.height = x.dataset.h + 'px');
      el.querySelectorAll('[data-w]').forEach(x => x.style.width = x.dataset.w + '%');
    }));
  };

  /** ui.on(container: Element, selector: string, fn(el, ev)) → void · delegación de clics: un listener por contenedor. */
  ui.on = (container, selector, fn) => { container.addEventListener('click', e => { const t = e.target.closest(selector); if (t && container.contains(t)) fn(t, e); }); };

  /* =====================================================================
     ESTADO EN LA URL (hash) — nunca localStorage
     ===================================================================== */
  /** ui.hash.read() → {v:'cobros', f:'vencido', c:'<id>'} desde '#v=cobros&f=vencido&c=<id>'
      ui.hash.write(o, replace = false) → escribe el objeto al hash (replace:true no crea historial)
      ui.hash.set(k, v) → cambia una clave (v vacío/null la borra) con replaceState. */
  ui.hash = {
    read() { const o = {}; location.hash.replace(/^#/, '').split('&').forEach(p => { if (!p) return; const [k, v] = p.split('='); o[decodeURIComponent(k)] = decodeURIComponent(v || ''); }); return o; },
    write(o, replace = false) { const s = '#' + Object.entries(o).filter(([, v]) => v != null && v !== '').map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&'); if (replace) history.replaceState(null, '', s); else if (location.hash !== s) location.hash = s; },
    set(k, v) { const o = ui.hash.read(); if (v == null || v === '') delete o[k]; else o[k] = v; ui.hash.write(o, true); }
  };

  /* =====================================================================
     COMPUERTA DE VERSIÓN (PGV) — patrón de renovaciones v27
     ===================================================================== */
  /** ui.pgv(sb: SupabaseClient con schema 'portal', archivo: string, version: number, opts = {isDirty?: () => bool, cada = 60000}) → void
      · consulta portal.app_versiones(archivo, version) al arrancar, cada `cada` ms y al volver la pestaña
      · si la base tiene versión mayor: recarga sola; si el usuario está escribiendo (isDirty) muestra .pgv-bar con "Recargar ahora"
      · archivo = nombre exacto de la fila (p. ej. 'renovaciones.html' o 'amazon-relay/index.html'). */
  ui.pgv = (sb, archivo, version, opts = {}) => {
    const isDirty = opts.isDirty || (() => !!document.querySelector('textarea:focus, input:focus'));
    let bar = null;
    async function check() {
      try {
        const { data } = await sb.from('app_versiones').select('version').eq('archivo', archivo).maybeSingle();
        if (data && Number(data.version) > Number(version)) {
          if (isDirty()) { if (!bar) { bar = document.createElement('div'); bar.className = 'pgv-bar'; bar.innerHTML = `Hay una versión nueva de la herramienta. <button type="button">Recargar ahora</button>`; bar.querySelector('button').onclick = () => location.reload(true); document.body.appendChild(bar); } }
          else location.reload(true);
        }
      } catch (e) { /* silencioso */ }
    }
    check(); setInterval(check, opts.cada || 60000);
    document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
  };

  /** ui.esDireccion(sb) → Promise<bool> · true si la sesión tiene rol director/socio en public.gabi_accesos (solo lectura).
      · para mostrar la casilla .dir ("solo dirección"). El candado real de cada pantalla sigue siendo el RPC puede_ver(p_clave). */
  ui.esDireccion = async sb => {
    try { const { data } = await sb.schema('public').from('gabi_accesos').select('rol,activo').eq('activo', true); return (data || []).some(r => ['director', 'socio'].includes(r.rol)); }
    catch (e) { return false; }
  };

  /** ui.sello(cargadoEn: ms, datoAl?: ms) → 'Datos en vivo · actualizado a las HH:MM[ · datos al minuto HH:MM]' · texto del .pie. */
  ui.sello = (cargadoEn, datoAl) => `Datos en vivo · actualizado a las ${ui.hora(cargadoEn)}${datoAl ? ` · datos al minuto ${ui.hora(datoAl)}` : ''}`;

  w.ui = ui;
})(window);
