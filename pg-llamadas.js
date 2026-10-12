/* =====================================================================
   pg-llamadas.js · Pulso de llamadas · v1 (12-oct-2026) · todas las clases llevan prefijo pll- (ninguna página las pisa)
   Un solo widget para tres pantallas, con el MISMO número en las tres:
     · gabi-brahian.html (Equipo Comercial)  modo 'equipo'  → todos, con ficha
     · fam.html (pestaña Equipo)             modo 'grande'  → todos, en grande
     · gabi-asesor.html (Mi Proceso)         modo 'mio'     → solo la persona + su puesto
   Fuente única: portal.equipo_llamadas_pulso()  (o _de(p_nombre) en "ver como").
   La base decide qué ve cada cuenta: a un asesor NUNCA le llega la lista del equipo.

   Cuatro momentos, siempre en este orden:
     Hoy · Último día hábil · Semana · Mes
   "El último día hábil ya cerró. Hoy, la semana y el mes van corriendo."

   Reglas de la casa: cero barras · ámbar #D9A520 · guion (—) cuando no hay dato,
   nunca 0 · sin localStorage · se ve bien a 400 px.

   Uso:
     PGLlamadas.montar(el, {
       sb,                 // cliente supabase-js (cualquier esquema; se usa .schema('portal'))
       modo: 'equipo'|'grande'|'mio',
       nombre: null,       // "ver como" (correo o nombre); solo dirección comercial
       correo: null,       // (modo 'mio') correo de la sesión: si la cuenta es de dirección, se pide su propia fila
       alAbrir: fn(agente, contenedor),   // opcional: ficha en acordeón bajo la fila
       alVerMes: fn()      // opcional (modo 'mio'): enlace "ver mi mes →"
     })
     PGLlamadas.filtrar('llamadas'|'conversaciones'|'positivos'|'ventas'|'sinllamar'|null)
     PGLlamadas.abrirFicha(agente)
     PGLlamadas.recargar()
   ===================================================================== */
(function () {
  'use strict';

  var MOMENTOS = [
    ['hoy', 'Hoy'],
    ['ultimo_habil', 'Último día hábil'],
    ['semana', 'Semana'],
    ['mes', 'Mes']
  ];
  var DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];
  var MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
  var REFRESCO_MS = 5 * 60 * 1000;

  var S = { el: null, o: null, D: null, momento: null, filtro: null, abierta: null, timer: null, cargando: false };

  /* ---------------- utilidades ---------------- */
  function esc(s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
  function n(v) { return v == null || v === '' || isNaN(v) ? null : Number(v); }
  function fmt(v) { v = n(v); return v == null ? '—' : v.toLocaleString('es-CO'); }
  function usd(v) {
    v = n(v); if (v == null || v === 0) return '';
    return v >= 1000 ? '$' + (Math.round(v / 100) / 10).toLocaleString('es-CO') + 'k' : '$' + Math.round(v).toLocaleString('es-CO');
  }
  function fecha(iso) { var d = new Date(iso + 'T12:00:00'); return DIAS[d.getDay()] + ' ' + d.getDate(); }
  function ahoraCol() { var d = new Date(Date.now() - 5 * 3600000); return { h: d.getUTCHours(), dow: d.getUTCDay() }; }
  function rpcCli() { var sb = S.o.sb; return (sb && typeof sb.schema === 'function') ? sb.schema('portal') : sb; }

  /* ---------------- estilos (una sola vez) ---------------- */
  function estilos() {
    if (document.getElementById('pll-css')) return;
    var c = document.createElement('style'); c.id = 'pll-css';
    c.textContent = [
      '.pll{--pll-ink:var(--pg-ink,#1B2D3A);--pll-mint:var(--pg-mint,#2DBFA3);--pll-deep:var(--pg-mint-deep,#229A82);--pll-line:var(--pg-line,#E7EDF2);--pll-muted:var(--pg-muted,#6B7D89);--pll-txt:var(--pg-txt,#28323B);--pll-amb:#D9A520;--pll-rojo:#D5594F;--pll-num:var(--pg-font-num,"JetBrains Mono",ui-monospace,monospace);--pll-tit:var(--pg-font-title,"Montserrat",system-ui,sans-serif);color:var(--pll-txt);font-family:var(--pg-font-body,"Inter",system-ui,sans-serif);min-width:0}',
      '.pll *{box-sizing:border-box}',
      '.pll-cab{display:flex;justify-content:space-between;align-items:center;gap:10px 16px;flex-wrap:wrap;margin-bottom:6px}',
      '.pll-mom{display:flex;gap:4px;flex-wrap:wrap;background:#EEF3F6;border-radius:11px;padding:4px}',
      '.pll-mom button{font:inherit;font-family:var(--pll-tit);font-weight:700;font-size:12.5px;border:0;background:transparent;color:var(--pll-muted);padding:7px 12px;border-radius:8px;cursor:pointer;white-space:nowrap}',
      '.pll-mom button.pll-on{background:#fff;color:var(--pll-ink);box-shadow:0 1px 3px rgba(27,45,58,.12)}',
      '.pll-mom button:focus-visible,.pll-ci:focus-visible,.pll-tab tbody tr:focus-visible{outline:2px solid var(--pll-mint);outline-offset:2px}',
      '.pll-sello{font-size:11.5px;color:var(--pll-muted);white-space:nowrap}',
      '.pll-sello b{font-family:var(--pll-num);color:var(--pll-ink);font-weight:600}',
      '.pll-logica{font-size:12px;color:var(--pll-muted);margin:2px 0 12px;line-height:1.5}',
      '.pll-tit{font-family:var(--pll-tit);font-weight:800;font-size:16px;color:var(--pll-ink);margin:0 0 10px}',
      '.pll-corto{background:#FBF0DC;border:1px solid #ECD08C;border-left:5px solid var(--pll-amb);border-radius:11px;padding:10px 14px;color:#6b4e0c;font-size:12.5px;line-height:1.5;margin:0 0 12px}',
      '.pll-corto b{color:#8a6408}',
      '.pll-cifras{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:10px;margin-bottom:12px}',
      '.pll-ci{font:inherit;text-align:left;background:#fff;border:1px solid var(--pll-line);border-radius:13px;padding:12px 14px;cursor:pointer;min-width:0;transition:border-color .15s}',
      '.pll-ci:hover{border-color:var(--pll-mint)}',
      '.pll-ci.pll-on{border-color:var(--pll-deep);box-shadow:inset 0 0 0 1px var(--pll-deep)}',
      '.pll-ci .pll-l{font-size:10.5px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:var(--pll-muted)}',
      '.pll-ci .pll-v{font-family:var(--pll-num);font-size:26px;font-weight:600;color:var(--pll-ink);margin-top:4px;line-height:1.1;font-variant-numeric:tabular-nums}',
      '.pll-ci .pll-v.pll-mint{color:var(--pll-deep)}',
      '.pll-ci .pll-s{font-size:11.5px;color:var(--pll-muted);margin-top:3px;line-height:1.35}',
      '.pll-ci.pll-est{cursor:default}',
      '.pll-pills{display:flex;gap:6px;flex-wrap:wrap;margin:-2px 0 12px}',
      '.pll-pill{font:inherit;font-size:12px;font-weight:700;border:1px solid #ECD08C;background:#FBF0DC;color:#6b4e0c;border-radius:999px;padding:5px 12px;cursor:pointer}',
      '.pll-pill.pll-on{background:var(--pll-amb);color:var(--pll-ink);border-color:var(--pll-amb)}',
      '.pll-pill.pll-limpia{border-color:var(--pll-line);background:#fff;color:var(--pll-muted)}',
      '.pll-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}',
      '.pll-tab{width:100%;border-collapse:collapse;font-size:13.5px}',
      '.pll-tab th{font-size:10.5px;font-weight:700;letter-spacing:.05em;text-transform:uppercase;color:var(--pll-muted);text-align:right;padding:8px 8px;border-bottom:1px solid var(--pll-line);white-space:nowrap}',
      '.pll-tab th:first-child{text-align:left}',
      '.pll-tab td{padding:9px 8px;border-bottom:1px solid #F0F4F7;text-align:right;font-family:var(--pll-num);font-variant-numeric:tabular-nums;white-space:nowrap}',
      '.pll-tab td.pll-per{text-align:left;font-family:inherit;font-weight:600;color:var(--pll-ink);white-space:normal}',
      '.pll-tab td .pll-g{color:#A9B7C1}',
      '.pll-tab td.pll-si{color:var(--pll-ink);font-weight:700}',
      '.pll-tab td.pll-ve{color:var(--pll-deep);font-weight:700}',
      '.pll-tab tbody tr.pll-clic{cursor:pointer}',
      '.pll-tab tbody tr.pll-clic:hover td{background:#F7FAFC}',
      '.pll-tab tbody tr.pll-sel td{background:#EEF8F5}',
      '.pll-dot{display:inline-block;width:9px;height:9px;border-radius:50%;margin-right:8px;vertical-align:1px;flex-shrink:0}',
      '.pll-ficha td{padding:0!important;background:#FAFCFD!important;text-align:left!important;font-family:inherit!important;white-space:normal!important}',
      '.pll-ficha td{max-width:0}',
      '.pll-ficha .pll-in{padding:14px 16px 16px;overflow-x:auto}',
      '.pll-pie{font-size:11.5px;color:var(--pll-muted);line-height:1.55;margin-top:10px}',
      '.pll-vacio,.pll-err{font-size:13px;color:var(--pll-muted);padding:16px 2px}',
      '.pll-err button{font:inherit;font-weight:700;margin-left:8px;border:1px solid var(--pll-line);background:#fff;border-radius:8px;padding:5px 11px;cursor:pointer}',
      '.pll-puesto{font-size:13.5px;color:var(--pll-txt);margin:2px 0 4px}',
      '.pll-puesto b{font-family:var(--pll-num);color:var(--pll-ink)}',
      '.pll-link{font:inherit;font-size:12.5px;font-weight:700;color:var(--pll-deep);background:none;border:0;padding:0;cursor:pointer;margin-top:6px}',
      /* modo grande (FAM) */
      '.pll.pll-grande .pll-ci .pll-v{font-size:40px}',
      '.pll.pll-grande .pll-ci .pll-l{font-size:12px}',
      '.pll.pll-grande .pll-ci .pll-s{font-size:13px}',
      '.pll.pll-grande .pll-tab{font-size:16px}',
      '.pll.pll-grande .pll-tab td{padding:12px 10px}',
      '.pll.pll-grande .pll-tit{font-size:20px}',
      /* modo mío: cuatro cifras grandes, sin lista */
      '.pll.pll-mio .pll-ci .pll-v{font-size:34px}',
      '@media (max-width:860px){.pll-cifras{grid-template-columns:repeat(2,minmax(0,1fr))}.pll.pll-grande .pll-ci .pll-v{font-size:32px}}',
      '@media (max-width:520px){.pll-mom button{padding:6px 9px;font-size:12px}.pll-ci{padding:10px 11px}.pll-ci .pll-v{font-size:22px}.pll.pll-mio .pll-ci .pll-v,.pll.pll-grande .pll-ci .pll-v{font-size:26px}.pll-tab{font-size:12.5px}.pll-tab td,.pll-tab th{padding:8px 5px}.pll-tab .pll-opc{display:none}.pll.pll-grande .pll-tab{font-size:14px}}'
    ].join('\n');
    document.head.appendChild(c);
  }

  /* ---------------- datos ---------------- */
  function cargar(silencioso) {
    if (!S.o || S.cargando) return;
    S.cargando = true;
    if (!silencioso && !S.D) S.el.innerHTML = '<div class="pll"><div class="pll-vacio">Cargando las llamadas…</div></div>';
    var cli = rpcCli();
    /* Modo 'mio' + cuenta de dirección (Brahian, sales@): la cuenta ve al equipo completo,
       así que se pide SU propia fila con su correo (equipo_llamadas_pulso_de). */
    var quien = S.o.nombre || (S.yoEquipo && S.o.correo) || null;
    var p = quien ? cli.rpc('equipo_llamadas_pulso_de', { p_nombre: quien }) : cli.rpc('equipo_llamadas_pulso');
    Promise.resolve(p).then(function (r) {
      if (!r.error && r.data && r.data.alcance === 'equipo' && S.o.modo === 'mio' && S.o.correo && !S.yoEquipo) {
        S.yoEquipo = true; S.cargando = false; return cargar(silencioso);
      }
      S.cargando = false;
      if (r.error) return error(r.error.message);
      var d = r.data;
      if (!d || d.error) return error(d && d.error === 'sin_paquete' ? 'Esta cuenta no tiene acceso al pulso de llamadas.'
        : d && d.error === 'sin_agente' ? 'No encontré a esta persona en la lista de asesores.'
        : d && d.error === 'no_autorizado' ? 'Solo dirección comercial puede mirar el pulso de otra persona.'
        : 'No llegó el dato (' + esc(d && d.error) + ').');
      d.__t = Date.now();
      S.D = d;
      if (!S.momento) S.momento = momentoInicial(d);
      pintar();
    }, function (e) { S.cargando = false; error(e && e.message ? e.message : String(e)); });
  }
  function error(m) {
    if (S.D) return; // si ya había dato, se queda el último; el siguiente refresco reintenta
    S.el.innerHTML = '<div class="pll"><div class="pll-err">No pude traer las llamadas: ' + esc(m) + ' <button type="button" data-pll="reintentar">Reintentar</button></div></div>';
  }
  function momentoInicial(d) {
    var a = ahoraCol();
    var habil = d.hoy && d.hoy.habil;
    return (habil && a.h >= 9) ? 'hoy' : 'ultimo_habil';
  }

  /* ---------------- cálculos sobre las filas ---------------- */
  function filasDe(m) { var b = S.D && S.D[m]; return (b && Array.isArray(b.filas)) ? b.filas : []; }
  function suma(F, k) { var t = 0, hay = false; F.forEach(function (r) { var v = n(r[k]); if (v != null) { t += v; hay = true; } }); return hay ? t : null; }
  function ordenar(F) {
    return F.slice().sort(function (a, b) {
      return (n(b.ventas) || 0) - (n(a.ventas) || 0) || (n(b.positivos) || 0) - (n(a.positivos) || 0)
        || (n(b.llamadas) == null ? -1 : n(b.llamadas)) - (n(a.llamadas) == null ? -1 : n(a.llamadas))
        || String(a.agente).localeCompare(String(b.agente));
    });
  }
  function sinLlamarActivo() {
    var a = ahoraCol();
    return S.momento === 'hoy' && S.D.hoy && S.D.hoy.habil && a.h >= 11;
  }
  function aplicarFiltro(F) {
    var f = S.filtro;
    if (!f) return ordenar(F);
    if (f === 'sinllamar') return ordenar(F.filter(function (r) { return r.tiene_rc && (n(r.llamadas) || 0) === 0; }));
    if (f === 'llamadas') return F.slice().sort(function (a, b) { return (n(b.llamadas) == null ? -1 : n(b.llamadas)) - (n(a.llamadas) == null ? -1 : n(a.llamadas)) || String(a.agente).localeCompare(String(b.agente)); });
    var k = f;
    return F.filter(function (r) { return (n(r[k]) || 0) > 0; }).sort(function (a, b) { return (n(b[k]) || 0) - (n(a[k]) || 0) || String(a.agente).localeCompare(String(b.agente)); });
  }

  /* ---------------- pintura ---------------- */
  function tituloMomento() {
    var D = S.D, m = S.momento;
    if (m === 'hoy') return 'Hoy, ' + fecha(D.hoy.dia) + (D.hoy.habil ? '' : ' · no es día hábil');
    if (m === 'ultimo_habil') return 'Último día hábil: ' + fecha(D.ultimo_habil.dia);
    if (m === 'semana') return 'Esta semana, desde el ' + fecha(D.semana.desde);
    var x = D.mes, mm = new Date(x.desde + 'T12:00:00').getMonth();
    return MESES[mm].replace(/^./, function (c) { return c.toUpperCase(); }) + ', día ' + x.habiles_corridos + ' de ' + x.habiles_mes + ' hábiles';
  }

  function cifras(F, filtrable) {
    var ll = suma(F, 'llamadas'), ti = suma(F, 'solo_timbre'), cv = suma(F, 'conversaciones'),
        po = suma(F, 'positivos') || 0, ve = suma(F, 'ventas') || 0, pz = suma(F, 'polizas') || 0, pr = suma(F, 'premium') || 0;
    var conPo = F.filter(function (r) { return (n(r.positivos) || 0) > 0; }).length;
    var grande = S.o.modo === 'grande', mio = S.o.modo === 'mio';
    var C = [
      ['llamadas', 'Llamadas', fmt(ll), ll == null ? 'sin usuario de RingCentral' : (ti ? fmt(ti) + ' fueron solo timbre' : 'ninguna quedó en solo timbre')],
      ['conversaciones', 'De más de 2 min', fmt(cv), (ll && cv) ? 'una de cada ' + Math.round(ll / Math.max(cv, 1)) + ' llamadas' : (ll ? 'ninguna pasó de 2 min' : '—')],
      ['positivos', 'Positivos', fmt(po), mio ? 'contactos que creaste en HubSpot' : (conPo ? conPo + (conPo === 1 ? ' persona registró' : ' personas registraron') : 'nadie registró')],
      ['ventas', 'Ventas', fmt(ve), ve ? (grande ? pz + (pz === 1 ? ' póliza registrada' : ' pólizas registradas') : (ve === 1 ? '1 cliente' : ve + ' clientes') + (pr ? ' · ' + usd(pr) : '')) : (mio ? 'sin venta registrada' : 'nadie cerró')]
    ];
    return '<div class="pll-cifras">' + C.map(function (c) {
      var on = filtrable && S.filtro === c[0];
      return '<button type="button" class="pll-ci' + (on ? ' pll-on' : '') + (filtrable ? '' : ' pll-est') + '"'
        + (filtrable ? ' data-pll-f="' + c[0] + '" aria-pressed="' + on + '"' : ' tabindex="-1"') + '>'
        + '<div class="pll-l">' + c[1] + '</div><div class="pll-v' + (c[0] === 'ventas' && ve ? ' pll-mint' : '') + '">' + c[2] + '</div><div class="pll-s">' + esc(c[3]) + '</div></button>';
    }).join('') + '</div>';
  }

  function franjaCorto() {
    var U = S.D.ultimo_habil;
    if (S.momento !== 'ultimo_habil' || !U || !U.corto) return '';
    if (S.o.modo === 'mio') return '<div class="pll-corto"><b>Día corto para todo el equipo:</b> ' + fmt(U.total) + ' llamadas entre todos, contra '
      + fmt(U.promedio10) + ' de un día normal. Lee tus cifras de ese día con eso en mente.</div>';
    return '<div class="pll-corto"><b>Día corto:</b> ' + fmt(U.total) + ' llamadas contra un promedio de ' + fmt(U.promedio10)
      + ' en un día normal. Si fue media jornada, el dato está bien; si se trabajó completo, hay que revisar RingCentral.</div>';
  }

  function tabla(F) {
    var grande = S.o.modo === 'grande', abre = typeof S.o.alAbrir === 'function';
    if (!F.length) return '<div class="pll-vacio">' + (S.filtro ? 'Nadie con esa cifra en este momento.' : 'No hay personas en la lista.') + '</div>';
    var sem = { verde: ['#229A82', 'Su mes va en el estándar'], ambar: ['#D9A520', 'Su mes va cerca del estándar'], rojo: ['#D5594F', 'Su mes va lejos del estándar'] };
    var cel = function (v, cls) { v = n(v); return v == null ? '<td><span class="pll-g">—</span></td>' : '<td' + (cls && v > 0 ? ' class="' + cls + '"' : '') + '>' + (v > 0 || !cls ? fmt(v) : '<span class="pll-g">0</span>') + '</td>'; };
    return '<div class="pll-scroll"><table class="pll-tab"><thead><tr><th>Persona</th><th>Llamadas</th><th class="pll-opc">+2 min</th><th>Positivos</th><th>Ventas</th>'
      + (grande ? '<th>Registradas</th>' : '') + '</tr></thead><tbody>'
      + F.map(function (r) {
          var s = sem[r.semaforo] || ['#C9D3DA', 'Sin semáforo'];
          var sel = S.abierta && S.abierta === r.agente;
          return '<tr' + (abre ? ' class="pll-clic' + (sel ? ' pll-sel' : '') + '" tabindex="0" data-pll-ag="' + esc(r.agente) + '"' : '') + '>'
            + '<td class="pll-per"><span class="pll-dot" style="background:' + s[0] + '" title="' + s[1] + '"></span>' + esc(r.agente) + '</td>'
            + cel(r.llamadas) + '<td class="pll-opc">' + (n(r.conversaciones) == null ? '<span class="pll-g">—</span>' : fmt(r.conversaciones)) + '</td>'
            + cel(r.positivos, 'pll-si') + cel(r.ventas, 'pll-ve')
            + (grande ? cel(r.polizas, 'pll-si') : '')
            + '</tr>'
            + (sel ? '<tr class="pll-ficha"><td colspan="' + (grande ? 6 : 5) + '"><div class="pll-in" id="pll-ficha-in"></div></td></tr>' : '');
        }).join('')
      + '</tbody></table></div>';
  }

  function pie(F) {
    var sinRc = F.filter(function (r) { return !r.tiene_rc; }).map(function (r) { return esc(r.agente); });
    return '<div class="pll-pie"><b>Positivo</b> = contacto que la persona creó en HubSpot. <b>Ventas</b> = clientes distintos registrados en el BOS. '
      + 'El punto de color es cómo va su mes.'
      + (sinRc.length ? '<br><b>Sin usuario de RingCentral:</b> ' + sinRc.join(', ') + ' — de ellos no se sabe el teléfono; el guion no quiere decir cero.' : '')
      + '</div>';
  }

  function cabecera() {
    var se = S.D.sello || {};
    return '<div class="pll-cab"><div class="pll-mom" role="tablist" aria-label="Momento">'
      + MOMENTOS.map(function (m) { return '<button type="button" role="tab" aria-selected="' + (S.momento === m[0]) + '" class="' + (S.momento === m[0] ? 'pll-on' : '') + '" data-pll-m="' + m[0] + '">' + m[1] + '</button>'; }).join('')
      + '</div><div class="pll-sello">RingCentral <b>' + esc(se.rc || '—') + '</b> · HubSpot <b>' + esc(se.hubspot || '—') + '</b></div></div>'
      + '<div class="pll-logica">El último día hábil ya cerró. Hoy, la semana y el mes van corriendo: se actualizan solos cada 15 minutos.</div>';
  }

  function pintar() {
    if (!S.D) return;
    var modo = S.o.modo || 'equipo', F = filasDe(S.momento);
    var h = '<div class="pll pll-' + modo + '">' + cabecera() + '<div class="pll-tit">' + esc(tituloMomento()) + '</div>' + franjaCorto();
    if (modo === 'mio') {
      var M = S.D.mio || {}, p = M.puesto ? M.puesto[S.momento] : null;
      h += cifras(F, false)
        + '<div class="pll-puesto">' + (p ? 'Vas de <b>N.º ' + p + '</b> de ' + (M.de || '—') + ' en llamadas' : 'Tu puesto en llamadas: <b>—</b>')
        + (S.momento === 'hoy' ? ' (va corriendo)' : '') + '.</div>'
        + (F.length && F[0].tiene_rc === false ? '<div class="pll-pie">No tienes usuario de RingCentral asignado: el guion no quiere decir cero.</div>' : '')
        + (typeof S.o.alVerMes === 'function' ? '<button type="button" class="pll-link" data-pll="vermes">Ver mi mes día por día →</button>' : '');
    } else {
      var pills = '';
      if (sinRonda()) {
        var nSin = F.filter(function (r) { return r.tiene_rc && (n(r.llamadas) || 0) === 0; }).length;
        if (nSin) pills += '<button type="button" class="pll-pill' + (S.filtro === 'sinllamar' ? ' pll-on' : '') + '" data-pll-f="sinllamar">' + nSin + (nSin === 1 ? ' persona sin llamar' : ' personas sin llamar') + '</button>';
      }
      if (S.filtro) pills += '<button type="button" class="pll-pill pll-limpia" data-pll-f="">Quitar filtro ✕</button>';
      h += cifras(F, true) + (pills ? '<div class="pll-pills">' + pills + '</div>' : '') + tabla(aplicarFiltro(F)) + pie(F);
    }
    h += '</div>';
    S.el.innerHTML = h;
    if (S.abierta && typeof S.o.alAbrir === 'function') {
      var cont = document.getElementById('pll-ficha-in');
      if (cont) { try { S.o.alAbrir(S.abierta, cont, S.momento); } catch (e) { cont.textContent = 'No pude abrir la ficha.'; } }
    }
  }
  function sinRonda() { return sinLlamarActivo(); }

  /* ---------------- eventos (delegados, una sola vez por contenedor) ---------------- */
  function cablear(el) {
    if (el.__pllWired) return; el.__pllWired = true;
    el.addEventListener('click', function (e) {
      var t = e.target.closest('[data-pll-m],[data-pll-f],[data-pll-ag],[data-pll]');
      if (!t || !el.contains(t)) return;
      if (t.hasAttribute('data-pll-m')) { S.momento = t.getAttribute('data-pll-m'); if (S.filtro === 'sinllamar' && S.momento !== 'hoy') S.filtro = null; return pintar(); }
      if (t.hasAttribute('data-pll-f')) { var f = t.getAttribute('data-pll-f') || null; S.filtro = (S.filtro === f) ? null : f; return pintar(); }
      if (t.hasAttribute('data-pll-ag')) { var ag = t.getAttribute('data-pll-ag'); S.abierta = (S.abierta === ag) ? null : ag; pintar(); var r = el.querySelector('tr.pll-sel'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); return; }
      var a = t.getAttribute('data-pll');
      if (a === 'reintentar') return cargar();
      if (a === 'vermes' && typeof S.o.alVerMes === 'function') return S.o.alVerMes();
    });
    el.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      var tr = e.target.closest && e.target.closest('tr[data-pll-ag]');
      if (!tr) return; e.preventDefault(); tr.click();
    });
  }

  function vigilar() {
    if (S.timer) clearInterval(S.timer);
    S.timer = setInterval(function () { if (document.visibilityState === 'visible') cargar(true); }, REFRESCO_MS);
    if (!S.__vis) {
      S.__vis = true;
      document.addEventListener('visibilitychange', function () {
        if (document.visibilityState === 'visible' && S.D && S.D.__t && Date.now() - S.D.__t > REFRESCO_MS) cargar(true);
      });
    }
  }

  window.PGLlamadas = {
    version: 1,
    montar: function (el, o) {
      if (!el || !o || !o.sb) return;
      estilos();
      S.el = el; S.o = o; S.D = null; S.yoEquipo = false; S.momento = o.momento || null; S.filtro = null; S.abierta = null;
      cablear(el); cargar(); vigilar();
    },
    recargar: function () { cargar(true); },
    filtrar: function (f) { S.filtro = f || null; pintar(); },
    abrirFicha: function (ag) { S.abierta = ag || null; pintar(); var r = S.el && S.el.querySelector('tr.pll-sel'); if (r) r.scrollIntoView({ behavior: 'smooth', block: 'center' }); },
    momento: function (m) { if (m) { S.momento = m; pintar(); } return S.momento; },
    datos: function () { return S.D; }
  };
})();
