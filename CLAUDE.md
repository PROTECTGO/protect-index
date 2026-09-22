# Reglas del portal de ProtectGo

Este repositorio es el portal interno: se publica con GitHub Pages y lo abre
el equipo todos los días. No hay build, no hay framework, no hay servidor de
pruebas: lo que se sube al repositorio es exactamente lo que la gente ve.
Por eso las reglas de abajo no son estilo, son seguridad.

---

## 1. Nada de gráficas de barras

Cero gráficas de barras. Ninguna, en ninguna pantalla, ni "solo esta vez".
Para comparar usa tablas, cifras grandes con su contexto, listas ordenadas o
una línea de tiempo. Si crees que una barra es lo único que sirve, pregunta
antes de dibujarla.

## 2. El ámbar es `#D9A520`

El ámbar de la casa es **`#D9A520`** (meta, por validar, señal de atención).

**Nunca `#B8841F`.** Si lo ves en un archivo, es un error viejo y se corrige.

## 3. Cuando no hay dato, va un guion

Si no hay dato, se escribe **`—`**. Nunca `0`, nunca `N/A`, nunca vacío.

Un cero es una afirmación: dice "medimos y dio cero". El guion dice "no hay
dato". Confundirlos hace que la gente tome decisiones sobre números que nadie
midió.

## 4. Nada de `localStorage` ni `sessionStorage`

Prohibido `localStorage` y `sessionStorage`, en todos los archivos.

Lo que cada persona ve vive en la base, no en su navegador. El estado que
haya que recordar se guarda en la base o se pasa por la URL (`?` y `#`).

## 5. Responsive a 400 px, sin barra horizontal

Toda pantalla tiene que verse bien a **400 px de ancho** y **no** aparecer
barra de desplazamiento horizontal. Se revisa a 400 px antes de dar algo por
terminado.

## 6. Todo cambio sube `PGV_VERSION`

Cada archivo HTML que se toque sube su `PGV_VERSION` **dentro del HTML**, en
el mismo commit, y deja una nota corta de qué cambió (así está hoy en
`index.html` y `control-maestro.html`).

Si tocas tres archivos, suben tres versiones.

## 7. `portal.app_versiones` se sube AL FINAL

La tabla `portal.app_versiones` se actualiza **solo después** de confirmar
que GitHub Pages ya está sirviendo el archivo nuevo.

Nunca antes. Si la tabla va adelante del archivo, la compuerta de versión
(`ui.pgv`) ve una versión mayor que la del archivo servido y **recarga el
portal en bucle para todo el equipo** — ya pasó el 4-sep-2026.

El orden es siempre: subir el archivo → confirmar que Pages lo sirve (por
sha256) → subir la tabla.

## 8. Verificar siempre por sha256

"Se ve bien" no es verificación. Se compara la huella:

```sh
# el archivo que está en el repositorio
sha256sum index.html

# el que GitHub Pages está sirviendo de verdad
curl -s https://protectgo.github.io/protect-index/index.html | sha256sum
```

Las dos huellas tienen que ser iguales. Si no lo son, Pages todavía no
publicó (puede tardar) y **no** se toca `portal.app_versiones`.

Lo mismo para mover o copiar archivos: se compara la huella del original
contra la del destino antes de dar el paso por bueno.

## 9. `index.html` y `quick-quote.html` son cosas distintas

- **`index.html`** = el portal, con login y las tarjetas de herramientas.
- **`quick-quote.html`** = el cotizador.

**Nunca se reemplaza uno con el otro**, ni se copia encima del otro, ni se
"arregla" el portal pegándole el cotizador. Antes de escribir en cualquiera
de los dos, confirma cuál es cuál abriéndolo.

## 10. Las direcciones internas van relativas

Cualquier enlace, `src` o `href` que apunte a otro archivo de este mismo
sitio va **relativo**:

```html
<!-- bien -->
<script src="pg-auth.js"></script>
<a href="amazon-relay/">Amazon Relay</a>

<!-- mal -->
<script src="https://protectgo.github.io/protect-index/pg-auth.js"></script>
```

Con rutas relativas el sitio sigue funcionando si cambia el nombre del
repositorio o la dirección. Absoluto solo para lo que de verdad vive afuera
(fuentes, CDN, otros dominios) o para lo que tiene que viajar fuera del
navegador: un correo, una firma, un PDF.

## 11. Nada se borra, se jubila

No se borran archivos, ni columnas, ni filas, ni herramientas.

Se jubilan: se dejan fuera de circulación (se quita el enlace, se marca como
jubilado, se renombra con la fecha — como
`gabi-brahian-v1-jubilado-4sep2026.html`) y se deja dicho en el commit por
qué. Un repositorio del que ya se migró todo tampoco se borra: queda
reenviando.

## 12. No se publica sin el "publica" de Andrés

Se trabaja en ramas. Nunca directo a `main`.

Cuando el trabajo esté listo se deja el PR abierto y se avisa. **Se espera a
que Andrés escriba "publica".** Sin esa palabra no se hace merge, no se
despliega y no se toca la base.

## 13. Claude nunca escribe contraseñas ni tokens

Claude no escribe ni pega contraseñas, llaves, tokens ni `service_role` — ni
en el código, ni en un commit, ni en un PR, ni en el chat.

Si hace falta un secreto, se pide que lo ponga Andrés donde corresponda.
Claude solo dice **cuál** falta y **dónde** va.

---

## Cómo está armado esto

- Sitio estático servido por GitHub Pages, sin build.
- `index.html` (portal + login) · `quick-quote.html` (cotizador) ·
  `control-maestro.html` (permisos, solo sales@) · `amazon-relay/index.html`
  (Amazon Relay, entró con su historia por `git subtree`).
- Compartidos: `pg-auth.js` (sesión), `pg-ui.js` (componentes y la compuerta
  `ui.pgv`), `pg-novedades.js`, `pg-sombra.js`, `pg-estandar.css`.
- Lo que cada persona ve **no** está en el código: sale de la base
  (widgets por usuario). Al terminar cualquier cambio, la foto de quién ve
  qué tiene que salir idéntica a como estaba antes de empezar.
- La base la toca Andrés desde el chat de Herramientas. Claude entrega el SQL
  y la lista de pendientes; no ejecuta.
