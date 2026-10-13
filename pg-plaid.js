/* pg-plaid.js — tarjeta "Saldo automático de Chase" (Plaid) para control-maestro.html
 * v1 · 12-oct-2026 · MONTADO en control-maestro.html v13: contenedor #cm-plaid (03 Cuentas), solo sales@, con
 *   alCambiar → cargarCajaTodo (la tabla de caja y la auditoría se repintan después de sincronizar/conectar/desconectar).
 *
 * Qué pinta: una tarjeta .pg-card con el estado de la conexión de Chase y dos botones .pg-btn:
 *   «Conectar Chase» (abre Plaid Link) y «Sincronizar ahora» (lee el saldo y lo escribe en la caja).
 * Todo lo hace la edge function plaid-chase; este archivo no guarda nada en el navegador (ni almacenamiento
 * local, ni de sesión, ni cookies): el estado vive en la base y se vuelve a pedir cada vez.
 *
 * Cómo se monta en control-maestro.html (sube PGV_VERSION en el mismo commit):
 *   1) <script src="pg-plaid.js"></script>                       ← ruta relativa, como los demás pg-*.js
 *   2) un contenedor dentro de la sección de Cuentas (#pg-caja-liquidez), p. ej. antes de la tabla #cl-tabla-caja:
 *        <div id="pg-plaid"></div>
 *   3) al final de initCajaLiquidez(), cuando ya se sabe que es sales@ y hay sesión:
 *        if (window.pgPlaid) pgPlaid.montar(clById('pg-plaid'), SB, { alCambiar: cargarCajaTodo });
 *      (alCambiar es opcional: se llama después de sincronizar/conectar/desconectar para que la tabla de cuentas
 *       y la auditoría se vuelvan a pintar.)
 *
 * Sugerencia aparte (una línea, en cargarCajaAuditoria de control-maestro.html): las filas que escribe el robot
 * llevan el user_id del dueño de la caja (caja_auditoria.user_id es NOT NULL), así que hoy dirían "A. Salcedo".
 *   const quien = /^plaid/i.test(a.notas||'') ? 'Plaid' : (a.user_id==='f1e2d3c4-…' ? 'A. López' : 'A. Salcedo');
 *
 * Reglas de la casa que cumple: sin gráficas de barras · ámbar solo vía .pg-pill.warn / --pg-warn (#D9A520) ·
 * guion (—) cuando no hay dato · nada guardado en el navegador · se ve bien a 400 px sin barra horizontal.
 *
 * OAuth de Chase: en escritorio abre en una ventana emergente y NO necesita redirect_uri (docs de Plaid, "OAuth":
 * "OAuth flows will function properly on web even if you don't set up a redirect URI"). Por eso este archivo no
 * guarda ningún link_token pendiente. Desde celular NO está probado (Plaid dice que el navegador móvil también intenta la
 * ventana emergente; si no puede, o en una WebView, hace falta redirect_uri), ver el TODO.
 *   // TODO: celular/tableta → redirect_uri registrado en Plaid + acción link_token_pendiente (ver plaid-chase/index.ts).
 */
(function (global) {
  'use strict';

  var VERSION = 'pg-plaid v1 · 12-oct-2026';
  var URL_BASE = 'https://hivpqsepwsfmafamxkzy.supabase.co';          // se usa solo si el cliente no la expone
  var LINK_JS = 'https://cdn.plaid.com/link/v2/stable/link-initialize.js';
  var TZ = 'America/Bogota';
  var cargaPlaid = null;

  // ------------------------------------------------------------------ utilidades
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function usd(n) {
    if (n == null || n === '' || isNaN(Number(n))) return '—';
    var v = Number(n);
    var t = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (v < 0 ? '-$' : '$') + t;
  }

  function diaBogota(d) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
  }

  // "a las 06:00" si es de hoy; "el 12 oct a las 06:00" si no. Siempre en hora de Bogotá.
  function cuando(iso) {
    if (!iso) return '—';
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    var hora = new Intl.DateTimeFormat('es-CO', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: false }).format(d);
    if (diaBogota(d) === diaBogota(new Date())) return 'a las ' + hora;
    var fecha = new Intl.DateTimeFormat('es-CO', { timeZone: TZ, day: 'numeric', month: 'short' }).format(d).replace('.', '');
    return 'el ' + fecha + ' a las ' + hora;
  }

  // "ITEM_LOGIN_REQUIRED · Chase pidió…" → "Chase pidió…"
  function sinCodigo(t) {
    return String(t || '').replace(/^[A-Z][A-Z0-9_]+ · /, '');
  }

  function inyectarCss() {
    if (document.getElementById('pgp-css')) return;
    var st = document.createElement('style');
    st.id = 'pgp-css';
    st.textContent =
      // Respaldo de las clases de la casa (.pg-card, .pg-pill, .pg-btn): control-maestro.html no carga pg-estandar.css,
      // así que la tarjeta se las trae. Donde sí existen (pg-estandar.css o el estilo propio de #pg-caja-liquidez) mandan ellas.
      '.pgp{background:var(--pg-card,#FFFFFF);border:1px solid var(--pg-line,#E7EDF2);border-radius:14px;padding:16px 18px;margin:12px 0 18px;box-shadow:0 1px 3px rgba(27,45,58,.04);max-width:100%;box-sizing:border-box}' +
      '.pgp *{box-sizing:border-box}' +
      '.pgp .pgp-titulo{font-family:var(--f-title,Montserrat,Arial,sans-serif);font-size:15.5px;font-weight:800;color:var(--pg-ink,#1B2D3A);margin:0 0 3px;line-height:1.5}' +
      '.pgp .h2sub{font-size:12px;color:var(--pg-muted,#6B7D89);margin-bottom:12px}' +
      '.pgp .pg-pill{display:inline-block;padding:3px 10px;border-radius:999px;font-size:10.5px;font-weight:700;white-space:nowrap;background:#EEF1F5;color:var(--pg-ink,#1B2D3A);margin-left:6px;vertical-align:middle;line-height:1.4}' +
      '.pgp .pg-pill.ok{background:#E3F4EF;color:var(--pg-pos,#1F9D6B)}' +
      '.pgp .pg-pill.due{background:#FCEEEC;color:var(--pg-neg,#D5594F)}' +
      '.pgp .pg-pill.warn{background:#FBF1D8;color:#8A6A14}' +
      '.pgp .pg-btn{background:var(--pg-ink,#1B2D3A);color:#fff;border:2px solid transparent;border-radius:999px;padding:9px 18px;font-family:var(--f-body,Inter,Arial,sans-serif);font-size:13px;font-weight:700;cursor:pointer}' +
      '.pgp .pg-btn.secondary{background:transparent;color:var(--pg-ink,#1B2D3A);border:2px solid var(--pg-line,#E7EDF2)}' +
      '.pgp .pg-btn[disabled]{opacity:.45;cursor:not-allowed}' +
      '.pgp .pgp-estado{font-size:13.5px;color:var(--pg-txt,#28323B);margin:2px 0 2px;overflow-wrap:anywhere}' +
      '.pgp .pgp-sub{font-size:12px;color:var(--pg-muted,#6B7D89);overflow-wrap:anywhere}' +
      '.pgp .pgp-botones{display:flex;flex-wrap:wrap;gap:8px;margin-top:12px}' +
      '.pgp .pgp-msg{font-size:12.5px;margin-top:10px;overflow-wrap:anywhere;color:var(--pg-txt,#28323B)}' +
      '.pgp .pgp-msg:empty{display:none}' +
      '.pgp .pgp-msg.err{color:#A63F36}' +
      '.pgp .pgp-msg.ok{color:var(--pg-pos,#1F9D6B)}' +
      '.pgp .pgp-elegir{margin-top:12px;border:1px solid var(--pg-line,#E7EDF2);border-radius:10px;padding:10px 12px;background:var(--pg-bg,#F4F7FA)}' +
      '.pgp .pgp-elegir label{display:block;font-size:13px;padding:4px 0;overflow-wrap:anywhere;cursor:pointer}' +
      '.pgp .pgp-pie{margin-top:10px;font-size:11.5px;color:var(--pg-muted,#6B7D89)}' +
      '.pgp .pgp-link{background:none;border:0;padding:0;margin:0;color:var(--pg-muted,#6B7D89);text-decoration:underline;cursor:pointer;font:inherit}' +
      '@media (max-width:420px){.pgp .pgp-botones .pg-btn{flex:1 1 100%}}';
    document.head.appendChild(st);
  }

  // ------------------------------------------------------------------ llamadas
  // Habla con la edge function con el access token de la sesión (sb.auth.getSession()). Siempre devuelve un objeto.
  async function llamar(sb, accion, extra) {
    var sesion = null;
    try {
      var r = await sb.auth.getSession();
      sesion = r && r.data && r.data.session;
    } catch (e) { /* sin sesión */ }
    if (!sesion || !sesion.access_token) return { ok: false, error: 'No hay una sesión iniciada. Entra de nuevo.' };
    var base = (typeof sb.supabaseUrl === 'string' && sb.supabaseUrl) || URL_BASE;
    // La llave pública sale del propio cliente (sb.supabaseKey); aquí no se escribe ninguna llave. La función no la exige
    // (verify_jwt desactivado: se identifica con el Authorization de la sesión), así que si el cliente no la expone se omite.
    var cabeceras = { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + sesion.access_token };
    if (typeof sb.supabaseKey === 'string' && sb.supabaseKey) cabeceras.apikey = sb.supabaseKey;
    try {
      var resp = await fetch(base + '/functions/v1/plaid-chase', {
        method: 'POST',
        headers: cabeceras,
        body: JSON.stringify(Object.assign({ accion: accion }, extra || {}))
      });
      var j = null;
      try { j = await resp.json(); } catch (e) { /* no era JSON */ }
      if (!j || typeof j !== 'object') return { ok: false, error: 'Respuesta inesperada del servidor (HTTP ' + resp.status + ').' };
      if (typeof j.ok !== 'boolean') {
        // No es una respuesta de plaid-chase (siempre trae "ok"): es el aviso de la puerta de Supabase, p. ej. función no desplegada.
        var detalle = typeof j.error === 'string' ? j.error : (typeof j.message === 'string' ? j.message : (typeof j.msg === 'string' ? j.msg : ''));
        if (resp.status === 404) detalle = 'La función plaid-chase no está desplegada todavía.';
        return { ok: false, error: (detalle || 'Respuesta inesperada del servidor') + ' (HTTP ' + resp.status + ').' };
      }
      return j;
    } catch (e) {
      return { ok: false, error: 'No pude comunicarme con el servidor. Revisa la conexión a internet.' };
    }
  }

  function cargarPlaid() {
    if (global.Plaid) return Promise.resolve();
    if (cargaPlaid) return cargaPlaid;
    cargaPlaid = new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = LINK_JS;
      s.async = true;
      s.onload = function () { global.Plaid ? resolve() : (cargaPlaid = null, reject(new Error('Plaid no se inicializó.'))); };
      s.onerror = function () { cargaPlaid = null; reject(new Error('No se pudo cargar Plaid (¿bloqueador de anuncios o sin internet?).')); };
      document.head.appendChild(s);
    });
    return cargaPlaid;
  }

  // Abre Plaid Link y espera a que la persona termine o cierre. No guarda nada en el navegador.
  function abrirLink(token) {
    return new Promise(function (resolve) {
      var h = null;
      function cerrar() { try { if (h) h.destroy(); } catch (e) { /* ya cerrado */ } }
      h = global.Plaid.create({
        token: token,
        onSuccess: function (publicToken, metadata) { resolve({ ok: true, publicToken: publicToken, metadata: metadata || {} }); cerrar(); },
        onExit: function (err, metadata) { resolve({ ok: false, err: err || null, metadata: metadata || {} }); cerrar(); },
        onEvent: function () { /* sin telemetría propia */ }
      });
      h.open();
    });
  }

  // Cuál de las cuentas que devolvió Link es el saldo de caja. Si hay más de una candidata, se pregunta.
  function escogerCuenta(accounts) {
    var dep = (accounts || []).filter(function (a) { return a && a.type === 'depository'; });
    var chk = dep.filter(function (a) { return a.subtype === 'checking'; });
    if (chk.length === 1) return { auto: chk[0] };
    if (chk.length > 1) return { elegir: chk };
    if (dep.length === 1) return { auto: dep[0] };
    if (dep.length > 1) return { elegir: dep };
    return { ninguna: true };
  }

  // ------------------------------------------------------------------ la tarjeta
  function montar(el, sb, opciones) {
    opciones = opciones || {};
    if (!el || !sb) return null;
    inyectarCss();

    var est = null;                 // último "estado" que devolvió la función
    var ocupado = false;
    var msg = { t: '', k: '' };     // mensaje bajo los botones (k: 'ok' | 'err' | '')
    var elegir = null;              // { publicToken, cuentas } mientras se espera que la persona escoja

    function avisarCambio() {
      try { if (typeof opciones.alCambiar === 'function') opciones.alCambiar(); } catch (e) { /* no frenar */ }
    }

    function vista() {
      if (!est) return { k: 'cargando', pill: ['n', 'Cargando'], texto: 'Cargando…', sub: '' };
      if (est.ok === false) return { k: 'error', pill: ['n', 'Sin estado'], texto: est.error || 'No pude leer el estado.', sub: '' };
      var c = est.cuenta || null;
      var cta = c ? 'Chase ••' + (c.mascara || '—') : 'Chase';
      var sub = c && c.nombre ? 'Cuenta: ' + c.nombre : '';
      if (!est.configurado) return { k: 'no_config', pill: ['warn', 'No configurado'], texto: 'Faltan las llaves de Plaid en Supabase.', sub: 'Las pega Andrés en Supabase → Edge Functions → Secrets (guía GUIA_PLAID_CHASE.md).' };
      if (est.reconectar) {
        return { k: 'reconectar', pill: ['due', 'Hay que reconectar'], texto: 'Hay que reconectar · ' + cta, sub: sinCodigo(est.ultimo_error) };
      }
      if (est.conectado) {
        var saldo = est.ultimo_saldo == null ? '— (aún sin lectura)' : usd(est.ultimo_saldo) + ' ' + cuando(est.ultimo_sync);
        return { k: 'conectado', pill: ['ok', 'Conectado'], texto: 'Conectado · ' + cta + ' · último saldo ' + saldo, sub: sub };
      }
      return { k: 'listo', pill: ['n', 'Listo para conectar'], texto: 'Listo para conectar', sub: '' };
    }

    function pintar() {
      var v = vista();
      var puede = !!(est && est.puede_conectar);
      var conItem = !!(est && est.ok !== false && (est.conectado || est.reconectar));
      var bloqueado = ocupado || !!elegir || v.k === 'cargando' || v.k === 'error' || v.k === 'no_config';
      var esReconectar = v.k === 'reconectar';
      var modoNuevo = esReconectar && est.reconectar_modo === 'nuevo';
      var etiquetaConectar = esReconectar && !modoNuevo ? 'Reconectar Chase' : 'Conectar Chase';
      var primarioConectar = v.k === 'listo' || esReconectar;

      var pruebas = est && est.ok !== false && est.entorno === 'sandbox';
      var pillPruebas = pruebas ? ' <span class="pg-pill warn" title="Plaid en modo de prueba">Prueba (sandbox)</span>' : '';
      var notaPruebas = pruebas && est.escribe_caja === false
        ? '<div class="pgp-sub">En modo de prueba el saldo se lee pero NO se escribe en la caja.</div>' : '';

      var h = '';
      h += '<div class="pg-card pgp" data-pgp-version="' + esc(VERSION) + '">';
      h += '<div class="pgp-titulo" role="heading" aria-level="3">Saldo automático de Chase <span class="pg-pill ' + esc(v.pill[0]) + '">' + esc(v.pill[1]) + '</span>' + pillPruebas + '</div>';
      h += '<div class="h2sub">Plaid lee el saldo de Chase cada mañana a las 6:00 a. m. (hora de Bogotá) y lo deja en la caja.</div>';
      h += '<div class="pgp-estado">' + esc(v.texto) + '</div>';
      if (v.sub) h += '<div class="pgp-sub">' + esc(v.sub) + '</div>';
      h += notaPruebas;
      if (v.k === 'conectado' && est.ultimo_error) {
        h += '<div class="pgp-msg err">La última lectura falló: ' + esc(sinCodigo(est.ultimo_error)) + '</div>';
      }

      if (elegir) {
        h += '<div class="pgp-elegir"><div class="pgp-sub" style="margin-bottom:6px">Plaid devolvió más de una cuenta. Elige la que es el saldo de caja:</div>';
        elegir.cuentas.forEach(function (a, i) {
          h += '<label><input type="radio" name="pgp-cta" value="' + esc(a.id) + '"' + (i === 0 ? ' checked' : '') + '> ' +
               esc(a.name || 'Cuenta') + ' ••' + esc(a.mask || '—') + (a.subtype ? ' <span class="pgp-sub">(' + esc(a.subtype) + ')</span>' : '') + '</label>';
        });
        h += '<div class="pgp-botones"><button type="button" class="pg-btn" data-pgp="usar">Usar esta cuenta</button>' +
             '<button type="button" class="pg-btn secondary" data-pgp="cancelar">Cancelar</button></div></div>';
      }

      h += '<div class="pgp-botones">';
      h += '<button type="button" class="pg-btn' + (primarioConectar ? '' : ' secondary') + '" data-pgp="conectar"' +
           ((bloqueado || !puede) ? ' disabled' : '') +
           (!puede && !bloqueado ? ' title="Solo sales@ puede conectar el banco"' : '') + '>' + esc(etiquetaConectar) + '</button>';
      h += '<button type="button" class="pg-btn' + (primarioConectar ? ' secondary' : '') + '" data-pgp="sincronizar"' +
           ((bloqueado || !conItem) ? ' disabled' : '') + '>Sincronizar ahora</button>';
      h += '</div>';

      h += '<div class="pgp-msg ' + esc(msg.k) + '" role="status" aria-live="polite">' + esc(msg.t) + '</div>';

      if (puede && conItem && !ocupado && !elegir) {
        h += '<div class="pgp-pie"><button type="button" class="pgp-link" data-pgp="desconectar">Desconectar Chase de Plaid</button>' +
             (modoNuevo ? ' · <span>La conexión guardada ya no sirve: usa «Conectar Chase».</span>' : '') + '</div>';
      }
      if (v.k === 'error') {
        h += '<div class="pgp-pie"><button type="button" class="pgp-link" data-pgp="reintentar">Reintentar</button></div>';
      }
      h += '</div>';

      el.innerHTML = h;
      var acciones = {
        conectar: function () { return conectar(modoNuevo || !esReconectar ? 'nuevo' : 'actualizar'); },
        sincronizar: sincronizar,
        desconectar: desconectar,
        usar: usarCuenta,
        cancelar: cancelarEleccion,
        reintentar: refrescar
      };
      Array.prototype.forEach.call(el.querySelectorAll('[data-pgp]'), function (b) {
        var f = acciones[b.getAttribute('data-pgp')];
        if (f) b.addEventListener('click', function () { f(); });
      });
    }

    function decir(texto, tipo) { msg = { t: texto || '', k: tipo || '' }; pintar(); }

    async function refrescar() {
      est = null; msg = { t: '', k: '' }; pintar();
      est = await llamar(sb, 'estado');
      pintar();
    }

    async function trasCambio() {
      est = await llamar(sb, 'estado');
      pintar();
      avisarCambio();
    }

    // Texto corto de lo que pasó al leer/escribir el saldo (lo devuelven "sincronizar" e "intercambiar").
    function resumenLectura(r) {
      if (r.simulado) return 'Prueba: Plaid leyó ' + usd(r.saldo) + ' (' + (r.tipo || 'saldo') + '). En modo de prueba no se escribió nada en la caja.';
      if (r.escrito) return 'Listo: la caja quedó en ' + usd(r.saldo) + ' (' + (r.tipo || 'saldo') + ') a las ' + (r.hora || '—') + (r.cambio && r.saldo_anterior != null ? ' · antes ' + usd(r.saldo_anterior) : '') + '.';
      if (r.omitido) return r.mensaje || 'Ya se sincronizó hace unos segundos.';
      return 'Sin cambios: Chase sigue en ' + usd(r.saldo) + '. No se escribió nada nuevo.';
    }

    async function conectar(modo) {
      if (ocupado) return;
      if (modo === 'nuevo' && est && est.conectado && !est.reconectar) {
        var quien = est.cuenta ? ('Chase ••' + (est.cuenta.mascara || '—')) : 'una cuenta';
        if (!global.confirm('Ya hay ' + quien + ' conectada.\n\nConectar de nuevo crea OTRA conexión en Plaid (en el plan de prueba gasta uno de los 10 cupos) y reemplaza a la actual.\n\n¿Seguro?')) return;
      }
      ocupado = true; decir('Abriendo Plaid…', '');
      try {
        var t = await llamar(sb, 'link_token', { modo: modo });
        if (!t.ok || !t.link_token) { ocupado = false; return decir(t.error || 'No pude abrir Plaid.', 'err'); }
        await cargarPlaid();
        var res = await abrirLink(t.link_token);
        if (!res.ok) {
          ocupado = false;
          var e = res.err;
          return decir(e ? (e.display_message || e.error_message || 'Plaid se cerró con un error.') : 'Plaid se cerró sin conectar la cuenta.', e ? 'err' : '');
        }
        if (modo === 'actualizar') {
          // Reconexión: el Item es el mismo y el access_token no cambia; solo se vuelve a leer el saldo.
          decir('Reconectado. Leyendo el saldo…', '');
          var s = await llamar(sb, 'sincronizar');
          ocupado = false;
          await trasCambio();
          return decir(s.ok ? resumenLectura(s) : (s.error || 'Se reconectó, pero no pude leer el saldo.'), s.ok ? 'ok' : 'err');
        }
        var d = escogerCuenta(res.metadata.accounts);
        if (d.ninguna) { ocupado = false; return decir('Plaid no devolvió ninguna cuenta de cheques o ahorros. Vuelve a intentar y elige la cuenta del negocio.', 'err'); }
        if (d.elegir) {
          ocupado = false; elegir = { publicToken: res.publicToken, cuentas: d.elegir, inst: res.metadata.institution };
          return decir('', '');
        }
        await guardarCuenta(res.publicToken, d.auto);
      } catch (e) {
        ocupado = false;
        decir((e && e.message) || 'Algo salió mal al abrir Plaid.', 'err');
      }
    }

    async function guardarCuenta(publicToken, cuenta) {
      ocupado = true; decir('Guardando la cuenta y leyendo el saldo…', '');
      var r = await llamar(sb, 'intercambiar', {
        public_token: publicToken, account_id: cuenta.id, nombre: cuenta.name || '', mascara: cuenta.mask || ''
      });
      ocupado = false;
      await trasCambio();
      if (!r.ok) return decir(r.error || 'No pude guardar la conexión.', 'err');
      decir('Conectado. ' + (r.aviso ? 'Ojo: ' + r.aviso : resumenLectura(r)), r.aviso ? 'err' : 'ok');
    }

    async function usarCuenta() {
      if (!elegir) return;
      var marcada = el.querySelector('input[name="pgp-cta"]:checked');
      var id = marcada && marcada.value;
      var cuenta = elegir.cuentas.filter(function (a) { return a.id === id; })[0];
      var pt = elegir.publicToken;
      if (!cuenta) return decir('Escoge una cuenta.', 'err');
      elegir = null;
      await guardarCuenta(pt, cuenta);
    }

    function cancelarEleccion() {
      elegir = null;
      decir('No se guardó nada. Para conectar otra vez usa «Conectar Chase».', '');
    }

    async function sincronizar() {
      if (ocupado) return;
      ocupado = true; decir('Leyendo el saldo en Plaid…', '');
      var r = await llamar(sb, 'sincronizar');
      ocupado = false;
      await trasCambio();
      if (r.ok) return decir(resumenLectura(r), 'ok');
      decir(r.error || 'No pude sincronizar.', 'err');
    }

    async function desconectar() {
      if (ocupado) return;
      if (!global.confirm('¿Desconectar Chase de Plaid?\n\nEl saldo dejará de actualizarse solo. Volver a conectar crea una conexión nueva (en el plan de prueba gasta otro de los 10 cupos).')) return;
      ocupado = true; decir('Desconectando…', '');
      var r = await llamar(sb, 'desconectar');
      ocupado = false;
      await trasCambio();
      if (!r.ok) return decir(r.error || 'No pude desconectar.', 'err');
      decir(r.retirado_en_plaid === false ? 'Desconectado aquí. Plaid no pudo retirar la conexión desde este entorno: revócala también en Chase o en my.plaid.com.' : 'Desconectado.', 'ok');
    }

    pintar();
    refrescar();
    return { refrescar: refrescar, version: VERSION };
  }

  global.pgPlaid = { montar: montar, version: VERSION };
})(window);
