/* pg-pendientes-cancel.js \u00b7 v1 (9-oct-2026) \u2014 desplegable "pending cancellation" para FAM, KAM, Brahian y GABI 360.
   Uso: <div data-pg-pend data-titulo="toda la agencia"></div> + <script src="pg-pendientes-cancel.js"></script>
   Lee public.v_pending_cancel_visible con la sesi\u00f3n de quien entr\u00f3: el candado decide qu\u00e9 ve cada uno
   (direcci\u00f3n, socios, renovaciones, retenci\u00f3n, FAM y KAM todo; el l\u00edder comercial su equipo; el asesor lo suyo).
   No escribe nada. No toca pg-novedades.js. Sin localStorage propio (usa la sesi\u00f3n que ya guarda supabase-js). */
(function(){
  'use strict';
  if (window.__pgPend) return; window.__pgPend = true;
  var URL = 'https://hivpqsepwsfmafamxkzy.supabase.co', KEY = 'sb_publishable_Kak00GbGVt2K3yGh6IBZvw_99IybVvt';
  var MES = ['ene','feb','mar','abr','may','jun','jul','ago','sep','oct','nov','dic'];
  function esc(s){ return String(s == null ? '' : s).replace(/[&<>"']/g, function(c){ return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]; }); }
  function fecha(s){ if(!s) return '\u2014'; var d = new Date(String(s).slice(0,10)+'T12:00:00'); return d.getDate()+' '+MES[d.getMonth()]+(d.getFullYear()!==new Date().getFullYear()?' '+d.getFullYear():''); }
  function k(n){ n = Number(n||0); return n >= 1e6 ? '$'+(n/1e6).toFixed(1)+'M' : n >= 1e3 ? '$'+Math.round(n/1e3)+'K' : '$'+Math.round(n); }
  function estilos(){
    if (document.getElementById('pg-pend-css')) return;
    var st = document.createElement('style'); st.id = 'pg-pend-css';
    st.textContent =
      '.pgpd{background:#fff;border:1px solid #F1C9C4;border-left:5px solid #D5594F;border-radius:14px;overflow:hidden;margin:12px 0;font-family:Inter,system-ui,sans-serif;color:#28323B}'+
      '.pgpd summary{list-style:none;cursor:pointer;padding:12px 14px;display:flex;justify-content:space-between;gap:10px;align-items:center;background:#FCEFED;color:#8a2f27;font:700 13.5px Montserrat,system-ui,sans-serif}'+
      '.pgpd summary::-webkit-details-marker{display:none}.pgpd summary small{font:500 12px Inter,system-ui,sans-serif;white-space:nowrap}'+
      '.pgpd[open] .pgpd-fl{transform:rotate(90deg)}.pgpd-fl{display:inline-block;transition:transform .15s}'+
      '.pgpd-r{display:grid;grid-template-columns:minmax(0,1.4fr) auto minmax(0,1fr) 130px 84px;gap:10px;padding:9px 14px;border-top:1px solid #E7EDF2;align-items:center;font-size:12.5px;text-decoration:none;color:inherit}'+
      '.pgpd-r:hover{background:#FFF8F7}.pgpd-r b{color:#1B2D3A;font:700 13px Montserrat,system-ui,sans-serif;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}'+
      '.pgpd-r .mu{color:#6B7D89;font-size:11.5px}.pgpd-r .num{font:700 12.5px "JetBrains Mono",ui-monospace,monospace;text-align:right;color:#1B2D3A}'+
      '.pgpd-c{display:inline-block;font:700 10.5px "JetBrains Mono",ui-monospace,monospace;padding:3px 8px;border-radius:999px;border:1.5px dashed #D5594F;color:#a3362c;background:#fff}'+
      '.pgpd-n{display:inline-block;margin-left:6px;font:700 9.5px Inter,system-ui,sans-serif;background:#D5594F;color:#fff;border-radius:999px;padding:1px 6px}'+
      '.pgpd-v{padding:12px 14px;color:#6B7D89;font-size:12.5px}'+
      '@media (max-width:640px){.pgpd-r{grid-template-columns:minmax(0,1fr) auto;row-gap:2px}.pgpd-r .h{display:none}}';
    document.head.appendChild(st);
  }
  function cli(){
    if (window.__pgPendSB) return window.__pgPendSB;
    if (!window.supabase || !window.supabase.createClient) return null;
    window.__pgPendSB = window.supabase.createClient(URL, KEY);
    return window.__pgPendSB;
  }
  function pintar(el, filas){
    var titulo = el.getAttribute('data-titulo') || '';
    var hace7 = Date.now() - 7*864e5;
    var nuevas = filas.filter(function(p){ return p.entro_at && Date.parse(p.entro_at) >= hace7; }).length;
    var tot = filas.reduce(function(a,p){ return a + Number(p.premium_activo||0); }, 0);
    var abierto = el.hasAttribute('data-abierto');
    if (!filas.length){
      el.innerHTML = '<div class="pgpd" style="border-left-color:#229A82;border-color:#CFE9E2"><div class="pgpd-v">\u2713 Ninguna p\u00f3liza en pending cancellation'+(titulo?' \u00b7 '+esc(titulo):'')+'.</div></div>';
      return;
    }
    filas.sort(function(a,b){ var na = a.entro_at && Date.parse(a.entro_at) >= hace7, nb = b.entro_at && Date.parse(b.entro_at) >= hace7;
      return (nb?1:0)-(na?1:0) || String(a.vence).localeCompare(String(b.vence)); });
    el.innerHTML = '<details class="pgpd"'+(abierto?' open':'')+'><summary><span>\u26a0 '+filas.length+(filas.length===1?' p\u00f3liza':' p\u00f3lizas')+' en pending cancellation \u00b7 '+k(tot)+
      (nuevas?' \u00b7 '+nuevas+' nueva'+(nuevas===1?'':'s')+' esta semana':'')+(titulo?' \u00b7 '+esc(titulo):'')+'</span><small>ver <span class="pgpd-fl">\u25b8</span></small></summary>'+
      filas.map(function(p){ var nueva = p.entro_at && Date.parse(p.entro_at) >= hace7;
        return '<a class="pgpd-r" href="renovaciones.html#v=cartera" title="Abrir en Renovaciones"><b>'+esc(p.cuenta_nombre||p.dot)+(nueva?'<span class="pgpd-n">nueva</span>':'')+'</b>'+
          '<span><span class="pgpd-c">'+esc(p.ramo)+'</span></span><span class="mu h">'+esc(p.agente||'\u2014')+'</span>'+
          '<span class="mu">desde '+fecha(p.desde)+' \u00b7 vence '+fecha(p.vence)+'</span><span class="num">'+k(p.premium_activo)+'</span></a>'; }).join('')+
      '</details>';
  }
  function cargar(el){
    var c = cli(); if (!c) return false;
    c.auth.getSession().then(function(r){
      if (!r || !r.data || !r.data.session){ el.__pgPendTry = (el.__pgPendTry||0)+1; if (el.__pgPendTry < 40) setTimeout(function(){ cargar(el); }, 3000); return; }
      c.from('v_pending_cancel_visible').select('cuenta_nombre,dot,agente,ramo,vence,desde,entro_at,premium_activo').then(function(res){
        if (res.error){ el.innerHTML = '<div class="pgpd"><div class="pgpd-v">No se pudo cargar el pending cancellation.</div></div>'; return; }
        pintar(el, res.data || []);
      });
    });
    return true;
  }
  function montar(){
    estilos();
    var els = document.querySelectorAll('[data-pg-pend]');
    for (var i = 0; i < els.length; i++){ var el = els[i]; if (!el.__pgPendOk){ if (cargar(el)){ el.__pgPendOk = true; el.setAttribute('data-pg-pend-ok','1'); } } }
  }
  /* las pantallas que pintan su app despu\u00e9s del login (template) montan el contenedor tarde: se revisa un rato */
  try { new MutationObserver(function(){ if (document.querySelector('[data-pg-pend]:not([data-pg-pend-ok])')) montar(); })
          .observe(document.documentElement, { childList:true, subtree:true }); } catch(e) {}
  setInterval(function(){ var els = document.querySelectorAll('[data-pg-pend]'); for (var i = 0; i < els.length; i++) if (els[i].__pgPendOk) cargar(els[i]); }, 300000);
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
})();
