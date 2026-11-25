#!/usr/bin/env python3
"""Genera inv-movimiento.json: animaciones de entrada y transiciones de página de todos los proyectos.
Hechas a mano a partir del CSS original (las rutas van en «archivos»). Cada demo lleva «↻ Repetir»."""
import json, os

REP = """document.querySelectorAll('[data-rep]').forEach(b => b.onclick = () => {
  const w = document.querySelector(b.dataset.rep); w.replaceWith(w.cloneNode(true));
});"""
VT = "const vt = f => document.startViewTransition ? document.startViewTransition(f) : f();\n"
BTN = lambda sel: f'<button class="mo-rep" data-rep="{sel}">↻ Repetir</button>'
BTN_CSS = ".mo-rep{position:absolute;top:10px;right:10px;z-index:5;border:1px solid #dcdbd0;background:#fff;color:#15161a;border-radius:99px;padding:5px 11px;font:700 12px Inter,system-ui,sans-serif;cursor:pointer}.mo-rep:hover{background:#15161a;color:#fff}"

P = []
def pieza(**k):
    k.setdefault("js", ""); P.append(k)

# ---------------------------------------------------------------- Entradas
pieza(id="mo-entrada-escalonada", nombre="Entrada escalonada del contenido", categoria="otros", proyecto="Panel Majosoft", stack="css",
  archivos=["/Users/lolyfernandezrodriguez/Desktop/Majosoft/admin-app/public/panel.css:76"],
  descripcion="Al llegar a una página, la cabecera, las cifras, las tarjetas y las filas de la tabla suben 10 px y aparecen una detrás de otra, con desfases de 20 a 60 ms.",
  cuando_usar="En cualquier página de panel: da sensación de rapidez sin hacer esperar (todo termina en menos de 0,6 s).",
  reglas=["Una sola animación (mj-rise: de 10 px abajo y transparente a su sitio) con curva de salida cubic-bezier(.16,1,.3,1).",
          "Los desfases son mínimos: 40 ms entre cifras, 60 ms entre tarjetas y 20 ms entre filas; desde la sexta fila todas a la vez, para no hacer esperar en tablas largas.",
          "Con prefers-reduced-motion todo se reduce a 0,01 ms."],
  html=f"""<div class="mo-ee">{BTN('.mo-ee-w')}<div class="mo-ee-w">
  <div class="mo-ee-head"><small>Comercial</small><b>Facturas</b><p>Lo cobrado y lo pendiente de este año.</p></div>
  <div class="mo-ee-kpis"><div class="mo-ee-kpi dark"><small>Cobrado</small><b>12.480 €</b></div><div class="mo-ee-kpi"><small>Pendiente</small><b>2.150 €</b></div><div class="mo-ee-kpi"><small>Facturas</small><b>38</b></div><div class="mo-ee-kpi"><small>Clientes</small><b>14</b></div></div>
  <table class="mo-ee-t"><tbody>
    <tr><td>Panadería Luna</td><td>Mantenimiento web</td><td>90,75 €</td></tr><tr><td>Clínica Arce</td><td>Desarrollo de app</td><td>2.420,00 €</td></tr>
    <tr><td>Taller Sur</td><td>Licencia anual</td><td>36,30 €</td></tr><tr><td>Estudio Mar</td><td>Bono de horas</td><td>480,00 €</td></tr><tr><td>Hotel Brisa</td><td>Hosting</td><td>121,00 €</td></tr>
  </tbody></table></div></div>""",
  css=BTN_CSS + """
.mo-ee{position:relative;background:#f5f4ec;border-radius:14px;padding:22px;font-family:Inter,system-ui,sans-serif;color:#15161a}
@keyframes mo-ee-rise{from{opacity:0;transform:translateY(10px)}}
.mo-ee-head,.mo-ee-kpi,.mo-ee-t tr{animation:mo-ee-rise .5s cubic-bezier(.16,1,.3,1) both}
.mo-ee-kpi:nth-child(2){animation-delay:.04s}.mo-ee-kpi:nth-child(3){animation-delay:.08s}.mo-ee-kpi:nth-child(4){animation-delay:.12s}
.mo-ee-t tr{animation-duration:.4s;animation-delay:.14s}.mo-ee-t tr:nth-child(2){animation-delay:.16s}.mo-ee-t tr:nth-child(3){animation-delay:.18s}.mo-ee-t tr:nth-child(4){animation-delay:.2s}.mo-ee-t tr:nth-child(n+5){animation-delay:.22s}
.mo-ee-head small{font-size:12px;color:#6b6b62;font-weight:600}.mo-ee-head b{display:block;font-size:26px;letter-spacing:-.03em;margin-top:4px}.mo-ee-head p{margin:2px 0 16px;color:#6b6b62}
.mo-ee-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-bottom:12px}
.mo-ee-kpi{background:#fff;border:1px solid #dcdbd0;border-radius:14px;padding:14px 16px}.mo-ee-kpi small{font-size:12px;color:#6b6b62;font-weight:700}.mo-ee-kpi b{display:block;font-size:22px;letter-spacing:-.03em;margin-top:4px}
.mo-ee-kpi.dark{background:#15161a;border-color:#15161a;color:#f5f4ec}.mo-ee-kpi.dark b{color:#d6e022}.mo-ee-kpi.dark small{color:#a9a99c}
.mo-ee-t{width:100%;border-collapse:collapse;background:#fff;border:1px solid #dcdbd0;border-radius:14px;overflow:hidden;font-size:13px}.mo-ee-t td{padding:10px 14px;border-top:1px solid #ecebe2}.mo-ee-t tr:first-child td{border-top:0}.mo-ee-t td:last-child{text-align:right;font-weight:700}
@media (prefers-reduced-motion:reduce){.mo-ee *{animation:none!important}}""",
  js=REP)

pieza(id="mo-titular-sube", nombre="Titular que sube desde su línea", categoria="otros", proyecto="Cetemet", stack="astro / css",
  archivos=["/Users/lolyfernandezrodriguez/Desktop/Cetemet/src/componentes/secciones/Encabezado.astro:305", "/Users/lolyfernandezrodriguez/Desktop/Cetemet/src/estilos/tokens.css:357"],
  descripcion="Cada línea del título sube desde debajo de su propio recorte (como si saliera de una ranura); antes aparece el antetítulo y después la entradilla y los datos.",
  cuando_usar="Cabeceras de portada o de sección donde el título es el protagonista.",
  reglas=["El título lleva overflow: clip con overflow-clip-margin, para que no se corten los rasgos de la g, la p o la y mientras sube.",
          "Tiempos con tokens: --duracion-lenta 600 ms, --duracion-titular 900 ms y --retardo-portada 120 ms (el texto entra a 3 × 120 ms).",
          "Solo al cargar, no al recargar: el selector es html:not(.recarga).",
          "Con movimiento reducido no hay animación (va dentro de prefers-reduced-motion: no-preference)."],
  html=f"""<div class="mo-ts">{BTN('.mo-ts-w')}<div class="mo-ts-w">
  <span class="mo-ts-ante">Formación técnica</span>
  <h2 class="mo-ts-tit"><span class="mo-ts-l">Energía que se aprende</span><span class="mo-ts-l">en el taller</span></h2>
  <p class="mo-ts-entra">Cursos de eficiencia energética para profesionales de la industria, con prácticas reales.</p>
  <div class="mo-ts-datos"><span><b>24</b> cursos</span><span><b>1.200</b> alumnos</span></div></div></div>""",
  css=BTN_CSS + """
.mo-ts{position:relative;background:radial-gradient(70% 90% at 100% 0%,rgba(23,28,158,.8),transparent 70%),radial-gradient(50% 70% at 0% 100%,rgba(63,67,252,.35),transparent 70%),#020d29;color:#fff;border-radius:14px;padding:44px 36px;font-family:Inter,system-ui,sans-serif;--c:cubic-bezier(.16,1,.3,1)}
.mo-ts-ante{display:inline-block;color:#bdd7f8;font-size:13px;font-weight:600;letter-spacing:.04em}
.mo-ts-tit{font:300 46px/1.05 Outfit,Inter,sans-serif;letter-spacing:-.015em;margin:12px 0 16px;overflow:clip;overflow-clip-margin:.12em}
.mo-ts-l{display:block}
.mo-ts-entra{max-width:440px;color:#bdd7f8;line-height:1.55;margin:0 0 18px}.mo-ts-datos{display:flex;gap:24px;font-size:13px;color:#bdd7f8}.mo-ts-datos b{font:400 22px Outfit,sans-serif;color:#fff;margin-right:4px}
@keyframes mo-ts-entrada{from{opacity:0;translate:0 1.5rem}}
@keyframes mo-ts-titular{from{translate:0 110%}}
@media (prefers-reduced-motion:no-preference){
.mo-ts-ante{animation:mo-ts-entrada .6s var(--c) both}
.mo-ts-l{animation:mo-ts-titular .9s var(--c) both;animation-delay:.12s}.mo-ts-l+.mo-ts-l{animation-delay:.2s}
.mo-ts-entra,.mo-ts-datos{animation:mo-ts-entrada .6s var(--c) both;animation-delay:.36s}}""",
  js=REP)

pieza(id="mo-menu-escalonado", nombre="Menú que se abre con entrada escalonada", categoria="otros", proyecto="Cetemet", stack="astro / css",
  archivos=["/Users/lolyfernandezrodriguez/Desktop/Cetemet/src/componentes/bloques/Cabecera.astro:200"],
  descripcion="Al abrir el menú, cada enlace baja 0,5 rem y aparece 40 ms después del anterior; el orden lo marca la variable --orden de cada elemento.",
  cuando_usar="Menús de móvil y submenús que se despliegan.",
  reglas=["animation-delay: calc(var(--orden) * var(--retardo-escalonado)), con --retardo-escalonado de 40 ms: el orden va en el HTML (style=\"--orden:2\"), no en una cadena de nth-child.",
          "Duración --duracion-normal (300 ms) y --curva-salida cubic-bezier(.16,1,.3,1).",
          "El icono de rayas pasa a cruz en dos tiempos: primero se juntan en el centro y luego giran."],
  html="""<div class="mo-me"><button class="mo-me-b" aria-expanded="false"><span></span><span></span><span></span></button><span class="mo-me-logo">cetemet</span>
  <nav class="mo-me-nav"><a style="--orden:0">Cursos</a><a style="--orden:1">Empresas</a><a style="--orden:2">Instalaciones</a><a style="--orden:3">Noticias</a><a style="--orden:4" class="mo-me-cta">Contacto</a></nav></div>""",
  css="""
.mo-me{position:relative;background:#fff;border:1px solid #e1e2e5;border-radius:14px;padding:14px 16px;min-height:290px;font-family:Inter,system-ui,sans-serif}
.mo-me-logo{font:500 22px Outfit,Inter,sans-serif;color:#020d29;margin-left:12px;vertical-align:middle}
.mo-me-b{width:40px;height:40px;border:1px solid #e1e2e5;border-radius:10px;background:#fff;display:inline-grid;place-content:center;gap:4px;cursor:pointer;vertical-align:middle}
.mo-me-b span{display:block;width:18px;height:2px;background:#020d29;border-radius:2px;transition:transform .3s cubic-bezier(.16,1,.3,1),opacity .2s}
.mo-me.abierto .mo-me-b span:nth-child(1){transform:translateY(6px) rotate(45deg)}.mo-me.abierto .mo-me-b span:nth-child(2){opacity:0}.mo-me.abierto .mo-me-b span:nth-child(3){transform:translateY(-6px) rotate(-45deg)}
.mo-me-nav{display:none;flex-direction:column;gap:2px;margin-top:14px}
.mo-me.abierto .mo-me-nav{display:flex}
.mo-me-nav a{font:400 24px Outfit,Inter,sans-serif;color:#020d29;padding:6px 4px;border-bottom:1px solid #e1e2e5}
.mo-me-nav .mo-me-cta{color:#2929fd;border:0}
@keyframes mo-me-entrar{from{opacity:0;transform:translateY(-.5rem)}}
.mo-me.abierto .mo-me-nav a{animation:mo-me-entrar .3s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--orden,0) * 40ms)}
@media (prefers-reduced-motion:reduce){.mo-me *{animation:none!important;transition:none!important}}""",
  js="""const m = document.querySelector('.mo-me'), b = m.querySelector('.mo-me-b');
b.onclick = () => { const a = m.classList.toggle('abierto'); b.setAttribute('aria-expanded', a); };
setTimeout(() => b.click(), 400);""")

pieza(id="mo-menu-movil-fichaje", nombre="Menú de móvil con enlaces que entran uno a uno", categoria="otros", proyecto="Fichaje", stack="html / css",
  archivos=["/Users/lolyfernandezrodriguez/Desktop/Fichaje/public/index.html:300"],
  descripcion="Menú plegable (<details>) que al abrirse hace subir cada enlace 10 px con un desfase de 35 ms (más 60 ms de espera inicial); la flecha de cada enlace se desplaza al pasar el ratón.",
  cuando_usar="Menús de móvil sencillos sin JavaScript.",
  reglas=["Sin JS: es un <details>; la animación se lanza con .nav-mobile[open].",
          "animation-delay: calc(var(--i) * 35ms + 60ms): los 60 ms dejan que se abra el panel antes de que entren los enlaces.",
          "Curva --ease cubic-bezier(.16,1,.3,1), 0,38 s."],
  html="""<details class="mo-mf" open><summary>Menú</summary><nav>
  <a style="--i:0">Fichar <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a><a style="--i:1">Mis jornadas <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a>
  <a style="--i:2">Solicitudes <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a><a style="--i:3">Ajustes <svg viewBox="0 0 24 24"><path d="M5 12h14M13 6l6 6-6 6"/></svg></a></nav></details>""",
  css="""
.mo-mf{background:#f7f6f0;border-radius:22px;padding:14px 18px;font-family:-apple-system,Inter,system-ui,sans-serif;color:#15161a;min-height:270px}
.mo-mf summary{list-style:none;cursor:pointer;font-weight:700;display:inline-block;background:#15161a;color:#fff;border-radius:99px;padding:8px 16px}
.mo-mf summary::-webkit-details-marker{display:none}
.mo-mf nav{display:flex;flex-direction:column;margin-top:12px}
.mo-mf a{display:flex;align-items:center;justify-content:space-between;font-size:22px;font-weight:700;letter-spacing:-.02em;padding:12px 2px;border-bottom:1px solid #e4e2d8;cursor:pointer}
.mo-mf a svg{width:22px;height:22px;fill:none;stroke:#aebb0c;stroke-width:2.2;stroke-linecap:round;stroke-linejoin:round;transition:transform .2s cubic-bezier(.16,1,.3,1)}
.mo-mf a:hover svg{transform:translateX(4px)}
@keyframes mo-mf-enlace{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
.mo-mf[open] a{animation:mo-mf-enlace .38s cubic-bezier(.16,1,.3,1) both;animation-delay:calc(var(--i) * 35ms + 60ms)}
@media (prefers-reduced-motion:reduce){.mo-mf a{animation:none}}""")

pieza(id="mo-bloque-sube", nombre="Tarjeta que sube al aparecer", categoria="otros", proyecto="Fichaje", stack="css",
  archivos=["/Users/lolyfernandezrodriguez/Desktop/Fichaje/public/css/styles.css:462", "/Users/lolyfernandezrodriguez/Desktop/cursosumme/src/styles/CursoDetalle.css:143"],
  descripcion="La tarjeta de acceso entra subiendo 10 px y creciendo de 0,98 a 1 en medio segundo: un gesto mínimo que hace que la pantalla no aparezca «de golpe».",
  cuando_usar="Una pieza protagonista sola en pantalla: acceso, confirmación, tarjeta de bienvenida.",
  reglas=["@keyframes rise: translateY(10px) scale(.98) → sitio; 0,5 s con --ease cubic-bezier(.16,1,.3,1).",
          "Mejor un solo elemento que se mueve que muchos: el resto de la pantalla ya está quieto."],
  variantes=["Cursos UMME (CursoDetalle.css:143): cdSube, sube 18 px solo con opacidad, sin escala; para bloques de la ficha de curso."],
  html=f"""<div class="mo-bs">{BTN('.mo-bs-card')}<div class="mo-bs-card"><span class="mo-bs-logo">⏱</span><b>Entrar a Fichaje</b><p>Escribe tu PIN de 4 cifras.</p><div class="mo-bs-pin"><i></i><i></i><i></i><i></i></div></div></div>""",
  css=BTN_CSS + """
.mo-bs{position:relative;background:#f7f6f0;border-radius:22px;padding:40px 20px;display:grid;place-items:center;font-family:-apple-system,Inter,system-ui,sans-serif;color:#15161a}
.mo-bs-card{background:#fff;border-radius:26px;box-shadow:0 20px 50px rgba(21,22,26,.12);padding:28px 34px;text-align:center;width:280px;animation:mo-bs-rise .5s cubic-bezier(.16,1,.3,1)}
@keyframes mo-bs-rise{from{opacity:0;transform:translateY(10px) scale(.98)}to{opacity:1;transform:translateY(0) scale(1)}}
.mo-bs-logo{display:grid;place-items:center;width:46px;height:46px;margin:0 auto 12px;border-radius:14px;background:#d6e022;font-size:22px}
.mo-bs-card b{font-size:19px;letter-spacing:-.02em}.mo-bs-card p{margin:4px 0 16px;color:#3a3a33;font-size:13.5px}
.mo-bs-pin{display:flex;gap:10px;justify-content:center}.mo-bs-pin i{width:12px;height:12px;border-radius:50%;border:2px solid #e4e2d8}
@media (prefers-reduced-motion:reduce){.mo-bs-card{animation:none}}""",
  js=REP)

pieza(id="mo-resalte-cambio", nombre="Resaltar lo que acaba de cambiar", categoria="otros", proyecto="Arbitraje (y Designaciones, su prototipo)", stack="html / css",
  archivos=["/Users/lolyfernandezrodriguez/Desktop/Arbitraje/public/admin.html:94", "/Users/lolyfernandezrodriguez/Desktop/Arbitraje/public/admin.html:376"],
  descripcion="Al asignar a alguien, su hueco da un pequeño salto en lima (flash) y la ficha a la que te lleva un aviso se rodea un par de segundos con un anillo lima que se apaga solo (resalte).",
  cuando_usar="Para que se vea dónde ha caído un cambio: tras arrastrar, guardar o saltar a un elemento desde un aviso.",
  reglas=["flash: 0,6 s, de scale(.85) con fondo lima a 1,05 y a 1.",
          "resalte: 2,2 s; el anillo se queda quieto hasta el 35 % y luego se desvanece, para que dé tiempo a verlo.",
          "Para repetirla hay que quitar la clase, forzar un reflow (offsetWidth) y volver a ponerla."],
  html="""<div class="mo-rc"><div class="mo-rc-fila"><b>Sábado 10:00 · Pabellón Norte</b><div class="mo-rc-huecos"><span class="mo-rc-slot">Principal</span><span class="mo-rc-slot">Auxiliar</span></div></div>
  <div class="mo-rc-personas"><button data-n="Laura M.">+ Laura M.</button><button data-n="Iván R.">+ Iván R.</button><button class="mo-rc-ir">Ir a la ficha de Iván</button></div>
  <div class="mo-rc-ficha"><b>Iván R.</b><span>Disponible sábados · 4 partidos este mes</span></div></div>""",
  css="""
.mo-rc{background:#f3f2ee;border-radius:14px;padding:18px;font-family:Inter,system-ui,sans-serif;color:#111;display:flex;flex-direction:column;gap:12px}
.mo-rc-fila,.mo-rc-ficha{background:#fff;border:1px solid #e6e4dd;border-radius:14px;padding:14px}
.mo-rc-huecos{display:flex;gap:8px;margin-top:10px}
.mo-rc-slot{flex:1;border:1.5px dashed #e6e4dd;border-radius:10px;padding:10px;text-align:center;font-size:13px;color:#6b6b66}
.mo-rc-slot.lleno{border-style:solid;border-color:#9fb81a;color:#1d2400;font-weight:700;background:#f4f9d9}
.mo-rc-slot.flash{animation:mo-rc-flash .6s ease}
@keyframes mo-rc-flash{0%{transform:scale(.85);background:#d4ec3a}60%{transform:scale(1.05)}100%{transform:scale(1)}}
.mo-rc-personas{display:flex;gap:8px;flex-wrap:wrap}
.mo-rc-personas button{border:1px solid #e6e4dd;background:#fff;border-radius:99px;padding:7px 13px;font:600 13px Inter,sans-serif;cursor:pointer}
.mo-rc-personas .mo-rc-ir{background:#16160f;color:#f4f3ee;border-color:#16160f}
.mo-rc-ficha span{display:block;color:#6b6b66;font-size:13px;margin-top:2px}
.mo-rc-ficha.resaltada{animation:mo-rc-resalte 2.2s ease}
@keyframes mo-rc-resalte{0%,35%{box-shadow:0 0 0 3px #d4ec3a;border-color:#9fb81a}100%{box-shadow:0 0 0 0 transparent}}""",
  js="""const anima = (el, c) => { el.classList.remove(c); void el.offsetWidth; el.classList.add(c); };
document.querySelectorAll('.mo-rc-personas [data-n]').forEach(b => b.onclick = () => {
  const s = [...document.querySelectorAll('.mo-rc-slot')].find(x => !x.classList.contains('lleno')) || document.querySelector('.mo-rc-slot');
  s.textContent = b.dataset.n; s.classList.add('lleno'); anima(s, 'flash');
});
document.querySelector('.mo-rc-ir').onclick = () => anima(document.querySelector('.mo-rc-ficha'), 'resaltada');""")

# ---------------------------------------------------------------- Transiciones de página
PAGINAS_JS = """const PAGINAS = [
  ['General', 'Resumen', 'Cómo va todo hoy.', ['Cobrado|12.480 €', 'Pendiente|2.150 €', 'Tareas|7']],
  ['Comercial', 'Facturas', 'Lo cobrado y lo pendiente.', ['Este mes|3.210 €', 'Sin cobrar|4', 'Clientes|14']],
  ['General', 'Calendario', 'Lo que toca esta semana.', ['Hoy|3', 'Semana|11', 'Atrasadas|1']],
];"""

pieza(id="mo-pagina-menu-quieto", nombre="Cambio de página con el menú quieto", categoria="otros", proyecto="Panel Majosoft", stack="css (View Transitions)",
  archivos=["/Users/lolyfernandezrodriguez/Desktop/Majosoft/admin-app/public/panel.css:63"],
  descripcion="Al pasar de una página a otra, el contenido viejo se va subiendo 6 px y desvaneciéndose (0,16 s) y el nuevo entra desde 10 px más abajo (0,28 s); el menú lateral no se mueve. Pruébalo de verdad con el menú de la izquierda.",
  cuando_usar="Paneles de varias páginas (navegación normal, sin SPA): parece una aplicación sin añadir JavaScript.",
  reglas=["Entre documentos basta con @view-transition { navigation: auto; } en el CSS de las dos páginas; la demo usa document.startViewTransition() porque aquí todo es una sola página.",
          "El menú lleva view-transition-name: side y sus animaciones a none: se queda fijo mientras cambia el resto.",
          "La salida es más corta que la entrada (0,16 s frente a 0,28 s) y con ease-in; la entrada, con curva de salida cubic-bezier(.16,1,.3,1).",
          "Al pulsar un enlace del menú, <main> se marca con .mj-saliendo (baja a 0,55 de opacidad) mientras llega la página nueva.",
          "Ojo: panel.css tiene dos bloques de transición (líneas ~63 y «Cambio de página desde el menú»); manda el segundo, el primero sobra.",
          "El menú se pinta antes del primer pintado (script con blocking=\"render\") para que no parpadee (commit 0a7c6fe); la transición llegó en d06af53.",
          "Con prefers-reduced-motion las animaciones de la transición se quitan."],
  html="""<div class="mo-pq"><aside class="mo-pq-side"><b>Majosoft</b><a data-p="0" class="on">Resumen</a><a data-p="1">Facturas</a><a data-p="2">Calendario</a></aside><main class="mo-pq-main"></main></div>""",
  css="""@view-transition { navigation: auto; }
.mo-pq{display:grid;grid-template-columns:170px 1fr;min-height:300px;border-radius:14px;overflow:hidden;font-family:Inter,system-ui,sans-serif;background:#f5f4ec;color:#15161a}
.mo-pq-side{background:#15161a;color:#f5f4ec;padding:18px 10px;display:flex;flex-direction:column;gap:2px;view-transition-name:mo-side}
.mo-pq-side b{padding:0 10px 14px;font-size:16px}
.mo-pq-side a{padding:9px 10px;border-radius:9px;font-weight:600;font-size:13.5px;color:#c9c9bd;cursor:pointer}
.mo-pq-side a:hover{color:#fff}.mo-pq-side a.on{background:#d6e022;color:#15161a}
.mo-pq-main{padding:24px 26px}
.mo-pq-main small{font-size:12px;color:#6b6b62;font-weight:600}.mo-pq-main h3{margin:4px 0 2px;font-size:24px;letter-spacing:-.03em}.mo-pq-main p{margin:0 0 16px;color:#6b6b62}
.mo-pq-k{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.mo-pq-k div{background:#fff;border:1px solid #dcdbd0;border-radius:14px;padding:12px 14px}.mo-pq-k span{font-size:12px;color:#6b6b62;font-weight:700}.mo-pq-k b{display:block;font-size:20px;margin-top:4px}
::view-transition-old(root){animation:mo-pq-out .16s ease-in both}
::view-transition-new(root){animation:mo-pq-in .28s cubic-bezier(.16,1,.3,1) both}
::view-transition-group(mo-side),::view-transition-old(mo-side),::view-transition-new(mo-side){animation:none}
@keyframes mo-pq-out{to{opacity:0;transform:translateY(-6px)}}
@keyframes mo-pq-in{from{opacity:0;transform:translateY(10px)}}
@media (prefers-reduced-motion:reduce){::view-transition-old(root),::view-transition-new(root){animation:none}}""",
  js=VT + PAGINAS_JS + """
const main = document.querySelector('.mo-pq-main');
const pinta = i => { const [c, t, s, k] = PAGINAS[i];
  main.innerHTML = `<small>${c}</small><h3>${t}</h3><p>${s}</p><div class="mo-pq-k">${k.map(x => `<div><span>${x.split('|')[0]}</span><b>${x.split('|')[1]}</b></div>`).join('')}</div>`;
  document.querySelectorAll('.mo-pq-side a').forEach(a => a.classList.toggle('on', +a.dataset.p === i)); };
document.querySelectorAll('.mo-pq-side a').forEach(a => a.onclick = () => vt(() => pinta(+a.dataset.p)));
pinta(0);""")

pieza(id="mo-pagina-fundido", nombre="Fundido corto entre páginas con la cabecera fija", categoria="otros", proyecto="Reservas", stack="css (View Transitions)",
  archivos=["/Users/lolyfernandezrodriguez/Desktop/reservas-majosoft/src/styles/global.css:520", "/Users/lolyfernandezrodriguez/Desktop/web-playa/src/styles/global.css:520"],
  descripcion="El navegador funde una página con la siguiente en 0,25 s, sin el parpadeo blanco, y la cabecera se queda quieta en su sitio.",
  cuando_usar="Webs y paneles con cabecera superior donde basta un cambio suave, sin desplazamientos.",
  reglas=["Solo CSS: @view-transition { navigation: auto; }, view-transition-name: site-header en la cabecera y animation-duration: .25s para el fundido de root.",
          "Con prefers-reduced-motion se pone navigation: none (sin transición).",
          "Navegadores sin soporte navegan como siempre."],
  variantes=["web-playa (Mar de Dunas): el mismo bloque, copiado tal cual.", "Bambina: <ClientRouter /> de Astro con su fundido por defecto."],
  html="""<div class="mo-pf"><header class="mo-pf-h"><b>Reservas</b><nav><a data-p="0" class="on">Hoy</a><a data-p="1">Calendario</a><a data-p="2">Mensajes</a></nav></header><main class="mo-pf-m"></main></div>""",
  css="""@view-transition { navigation: auto; }
.mo-pf{border-radius:14px;overflow:hidden;background:#f5f4ec;font-family:Inter,system-ui,sans-serif;color:#15161a;min-height:290px}
.mo-pf-h{display:flex;align-items:center;justify-content:space-between;padding:14px 20px;background:#fff;border-bottom:1px solid rgba(21,22,26,.09);view-transition-name:mo-pf-header}
.mo-pf-h b{font-weight:800;letter-spacing:-.04em;font-size:17px}
.mo-pf-h nav{display:flex;gap:4px;background:#e9e8de;border-radius:99px;padding:3px}
.mo-pf-h a{padding:6px 13px;border-radius:99px;font-size:13px;font-weight:600;color:#6b6b60;cursor:pointer}.mo-pf-h a.on{background:#fff;color:#15161a;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.mo-pf-m{padding:24px}.mo-pf-m h3{font-size:30px;font-weight:800;letter-spacing:-.04em;margin:0 0 4px}.mo-pf-m h3 em{font-style:normal;background:linear-gradient(transparent 60%,#d6e022 60%)}.mo-pf-m p{color:#6b6b60;margin:0 0 14px}
.mo-pf-l{display:flex;flex-direction:column;gap:8px}.mo-pf-l div{background:#fff;border-radius:14px;padding:12px 14px;display:flex;justify-content:space-between;font-size:13.5px}.mo-pf-l span{color:#6b6b60}
::view-transition-old(root),::view-transition-new(root){animation-duration:.25s}
@media (prefers-reduced-motion:reduce){@view-transition{navigation:none}}""",
  js=VT + """const P = [['Buenos días, <em>Lucía</em>', 'Así va el día en el apartamento.', ['Llegada de Laura M.|16:00', 'Limpieza|12:00']],
  ['Noviembre <em>2026</em>', '9 de 30 noches ocupadas.', ['Laura M.|10 → 12 nov', 'Jordi P.|12 → 14 nov']],
  ['Tus <em>mensajes</em>', 'Dos conversaciones sin leer.', ['Laura M.|¿A qué hora es el check-in?', 'Jordi P.|Gracias por todo']]];
const m = document.querySelector('.mo-pf-m');
const pinta = i => { const [t, s, l] = P[i]; m.innerHTML = `<h3>${t}</h3><p>${s}</p><div class="mo-pf-l">${l.map(x => `<div><b>${x.split('|')[0]}</b><span>${x.split('|')[1]}</span></div>`).join('')}</div>`;
  document.querySelectorAll('.mo-pf-h a').forEach(a => a.classList.toggle('on', +a.dataset.p === i)); };
document.querySelectorAll('.mo-pf-h a').forEach(a => a.onclick = () => vt(() => pinta(+a.dataset.p)));
pinta(0);""")

pieza(id="mo-pagina-sin-fundido", nombre="Cambio de página sin fundido (cabecera de vidrio quieta)", categoria="otros", proyecto="Cetemet", stack="css (View Transitions)",
  archivos=["/Users/lolyfernandezrodriguez/Desktop/Cetemet/src/estilos/base.css:121", "/Users/lolyfernandezrodriguez/Desktop/Cetemet/src/componentes/bloques/Cabecera.astro:156"],
  descripcion="Se usa la transición del navegador pero con todas sus animaciones a none: el contenido cambia de golpe y lo único que consigue es que la cabecera de vidrio no se repinte ni dé un tirón.",
  cuando_usar="Cuando el fundido estropea algo (fondos blancos que parpadean, dos páginas superpuestas, cabeceras con desenfoque).",
  reglas=["Con fundido se veía el fondo blanco entre una página y otra (parpadeo del hero) o las dos superpuestas: por eso <main> cambia sin animación.",
          "El nombre de transición va en la barra y no en la cabecera entera: un elemento con view-transition-name corta el desenfoque de lo que lleva dentro.",
          "De la cabecera solo se enseña la nueva (::view-transition-old(cabecera) oculta): la captura vieja no lleva el desenfoque y el logo daba un tirón.",
          "Activada solo con prefers-reduced-motion: no-preference."],
  html="""<div class="mo-sf"><header class="mo-sf-h"><b>cetemet</b><nav><a data-p="0" class="on">Cursos</a><a data-p="1">Empresas</a><a data-p="2">Noticias</a></nav></header><main class="mo-sf-m"></main></div>""",
  css="""@media (prefers-reduced-motion:no-preference){@view-transition{navigation:auto}}
.mo-sf{position:relative;border-radius:14px;overflow:hidden;font-family:Inter,system-ui,sans-serif;min-height:300px;background:#020d29}
.mo-sf-h{position:absolute;top:12px;left:12px;right:12px;z-index:2;display:flex;justify-content:space-between;align-items:center;padding:10px 16px;border-radius:14px;background:rgba(255,255,255,.7);backdrop-filter:blur(14px);-webkit-backdrop-filter:blur(14px);border:1px solid rgba(225,226,229,.7);view-transition-name:mo-sf-cab}
.mo-sf-h b{font:500 19px Outfit,Inter,sans-serif;color:#020d29}.mo-sf-h nav{display:flex;gap:16px}.mo-sf-h a{font-size:13.5px;color:#41495e;cursor:pointer}.mo-sf-h a.on{color:#2929fd;font-weight:600}
.mo-sf-m{min-height:300px;padding:86px 26px 26px;color:#fff;view-transition-name:mo-sf-contenido}
.mo-sf-m h3{font:300 38px/1.05 Outfit,Inter,sans-serif;margin:0 0 10px}.mo-sf-m p{color:#bdd7f8;max-width:380px;line-height:1.5;margin:0}
::view-transition-group(*),::view-transition-old(*),::view-transition-new(*){animation:none;mix-blend-mode:normal}
::view-transition-old(mo-sf-cab){display:none}""",
  js=VT + """const P = [['Cursos', 'Eficiencia energética para profesionales.', 'radial-gradient(70% 90% at 100% 0%,rgba(23,28,158,.8),transparent 70%),#020d29'],
  ['Empresas', 'Formación a medida para tu plantilla.', 'radial-gradient(60% 80% at 0% 0%,rgba(41,41,253,.6),transparent 70%),#020d29'],
  ['Noticias', 'Lo último del centro y del sector.', 'radial-gradient(60% 80% at 50% 100%,rgba(63,67,252,.5),transparent 70%),#020d29']];
const m = document.querySelector('.mo-sf-m');
const pinta = i => { const [t, s, f] = P[i]; m.style.background = f; m.innerHTML = `<h3>${t}</h3><p>${s}</p>`;
  document.querySelectorAll('.mo-sf-h a').forEach(a => a.classList.toggle('on', +a.dataset.p === i)); };
document.querySelectorAll('.mo-sf-h a').forEach(a => a.onclick = () => vt(() => pinta(+a.dataset.p)));
pinta(0);""")

pieza(id="mo-pastilla-viaja", nombre="Pastilla del menú que viaja de una página a otra", categoria="otros", proyecto="Academias", stack="astro (ClientRouter)",
  archivos=["/Users/lolyfernandezrodriguez/Desktop/Dev-Majosoft/src/components/CabeceraCampus.astro:352", "/Users/lolyfernandezrodriguez/Desktop/Dev-Majosoft/src/styles/temas.css:1184"],
  descripcion="La pastilla que marca el apartado activo lleva un nombre de transición: al cambiar de página se desliza desde el apartado viejo hasta el nuevo en 0,35 s.",
  cuando_usar="Menús de pestañas o secciones en webs con ClientRouter o View Transitions.",
  reglas=["En Astro: transition:name en el indicador; en CSS puro, view-transition-name. La animación se ajusta en global: ::view-transition-group(campus-nav-activo) { animation-duration: .35s; animation-timing-function: cubic-bezier(.3,.7,.2,1) }.",
          "Ojo: hoy temas.css quita todas las animaciones de View Transitions con !important, porque durante el fundido los clics se perdían (el botón «+ Nueva pregunta» no respondía hasta pulsar varias veces). Así que en el campus la pastilla ya salta sin deslizarse; para recuperarla hay que excluir este grupo de esa regla.",
          "El ClientRouter se mantiene aunque no anime: hace falta para que el toast de una acción no desaparezca de golpe."],
  html="""<div class="mo-pv"><nav class="mo-pv-nav"><a data-p="0"><span class="mo-pv-ind"></span>Inicio</a><a data-p="1">Temario</a><a data-p="2">Tests</a><a data-p="3">Liga</a></nav><main class="mo-pv-m"></main></div>""",
  css="""
.mo-pv{background:#15161b;border-radius:14px;padding:16px;font-family:Inter,system-ui,sans-serif;color:#fff;min-height:240px}
.mo-pv-nav{display:flex;gap:4px;background:#1b1c22;border:1px solid rgba(255,255,255,.12);border-radius:99px;padding:4px;width:max-content}
.mo-pv-nav a{position:relative;padding:8px 16px;border-radius:99px;font-size:13.5px;font-weight:600;color:rgba(255,255,255,.62);cursor:pointer}
.mo-pv-nav a.on{color:#fff}
.mo-pv-nav a>*:not(.mo-pv-ind){position:relative}
.mo-pv-ind{position:absolute;inset:0;border-radius:99px;background:rgba(224,43,32,.12);box-shadow:inset 0 0 0 1px rgba(224,43,32,.25);view-transition-name:mo-pv-activo;z-index:-1}
.mo-pv-nav a{isolation:isolate}
.mo-pv-m{margin-top:22px}.mo-pv-m h3{font:400 34px Anton,Inter,sans-serif;letter-spacing:.01em;text-transform:uppercase;margin:0}.mo-pv-m p{color:rgba(255,255,255,.62);margin:4px 0 0}
::view-transition-group(root),::view-transition-old(root),::view-transition-new(root){animation:none}
::view-transition-group(mo-pv-activo){animation-duration:.35s;animation-timing-function:cubic-bezier(.3,.7,.2,1)}""",
  js=VT + """const T = [['Inicio', 'Tu resumen de hoy.'], ['Temario', '24 temas en 3 bloques.'], ['Tests', '12 tests pendientes.'], ['Liga', 'Vas 3.º esta semana.']];
const ind = document.querySelector('.mo-pv-ind'), m = document.querySelector('.mo-pv-m');
const pinta = i => { const a = document.querySelector(`.mo-pv-nav [data-p="${i}"]`); a.prepend(ind);
  document.querySelectorAll('.mo-pv-nav a').forEach(x => x.classList.toggle('on', x === a));
  m.innerHTML = `<h3>${T[i][0]}</h3><p>${T[i][1]}</p>`; };
document.querySelectorAll('.mo-pv-nav a').forEach(a => a.onclick = () => vt(() => pinta(+a.dataset.p)));
pinta(0);""")

pieza(id="mo-desliza-direccion", nombre="El contenido entra por el lado al que vas", categoria="otros", proyecto="Arbitraje (y Designaciones, su prototipo)", stack="html / css / js",
  archivos=["/Users/lolyfernandezrodriguez/Desktop/Arbitraje/public/admin.html:143"],
  descripcion="Al pasar a la semana siguiente el contenido entra 24 px desde la derecha; a la anterior, desde la izquierda; y lo que no tiene dirección (un menú, cambiar de vista) sube 6 px.",
  cuando_usar="Navegación por fechas o pasos (semana, mes, paso del asistente) dentro de la misma página.",
  reglas=["Tres animaciones: entraD (desde +24 px), entraI (desde −24 px) y entraF (sube 6 px). Las laterales duran 0,32 s con cubic-bezier(.2,.8,.3,1); la de subir, 0,25 s.",
          "La clase se quita, se fuerza un reflow y se vuelve a poner para que se repita en cada clic.",
          "Los menús que se abren usan entraF de 0,18 s."],
  html="""<div class="mo-dd"><div class="mo-dd-bar"><button data-d="-1">‹</button><b class="mo-dd-sem">Semana 12</b><button data-d="1">›</button><span class="mo-dd-sp"></span><button class="mo-dd-mas">⋯</button><div class="mo-dd-menu" hidden><a>Duplicar semana</a><a>Exportar</a><a>Avisar a todos</a></div></div>
  <div class="mo-dd-main"></div></div>""",
  css="""
.mo-dd{background:#f3f2ee;border-radius:14px;padding:16px;font-family:Inter,system-ui,sans-serif;color:#111;overflow:hidden;min-height:260px}
.mo-dd-bar{position:relative;display:flex;align-items:center;gap:8px;margin-bottom:12px}
.mo-dd-bar button{width:34px;height:34px;border-radius:10px;border:1px solid #e6e4dd;background:#fff;font-size:17px;cursor:pointer}
.mo-dd-sem{font-size:17px;letter-spacing:-.02em;min-width:100px;text-align:center}.mo-dd-sp{flex:1}
.mo-dd-menu{position:absolute;right:0;top:calc(100% + 6px);background:#fff;border:1px solid #e6e4dd;border-radius:14px;box-shadow:0 12px 32px rgba(0,0,0,.14);padding:6px;min-width:190px;z-index:3;animation:mo-dd-F .18s ease}
.mo-dd-menu a{display:block;padding:8px 10px;border-radius:9px;font-size:13.5px;cursor:pointer}.mo-dd-menu a:hover{background:#efeee9}
.mo-dd-main{display:flex;flex-direction:column;gap:8px}
.mo-dd-main div{background:#fff;border:1px solid #e6e4dd;border-radius:12px;padding:11px 14px;font-size:13.5px;display:flex;justify-content:space-between}.mo-dd-main span{color:#6b6b66}
.mo-dd-main.entra-d{animation:mo-dd-D .32s cubic-bezier(.2,.8,.3,1)}.mo-dd-main.entra-i{animation:mo-dd-I .32s cubic-bezier(.2,.8,.3,1)}
@keyframes mo-dd-D{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
@keyframes mo-dd-I{from{opacity:0;transform:translateX(-24px)}to{opacity:1;transform:none}}
@keyframes mo-dd-F{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:none}}""",
  js="""let sem = 12; const main = document.querySelector('.mo-dd-main'), menu = document.querySelector('.mo-dd-menu');
const EQ = ['CB Norte – Atlético Sur', 'Unión Playa – CD Vega', 'Club Río – Real Olivo', 'Peña Alta – UD Llano'];
const pinta = () => { document.querySelector('.mo-dd-sem').textContent = 'Semana ' + sem;
  main.innerHTML = [0, 1, 2].map(i => `<div><b>${EQ[(sem + i) % 4]}</b><span>${['Sáb 10:00', 'Sáb 12:00', 'Dom 11:00'][i]}</span></div>`).join(''); };
document.querySelectorAll('[data-d]').forEach(b => b.onclick = () => { const d = +b.dataset.d; sem += d; pinta();
  main.classList.remove('entra-d', 'entra-i'); void main.offsetWidth; main.classList.add(d > 0 ? 'entra-d' : 'entra-i'); });
document.querySelector('.mo-dd-mas').onclick = e => { e.stopPropagation(); menu.hidden = !menu.hidden; };
document.addEventListener('click', () => menu.hidden = true);
pinta();""")

pieza(id="mo-cambio-pestana", nombre="Cambio de pestaña con el panel que sube", categoria="otros", proyecto="Fichaje", stack="css",
  archivos=["/Users/lolyfernandezrodriguez/Desktop/Fichaje/public/css/styles.css:1788"],
  descripcion="Al cambiar de pestaña, el panel nuevo sube 8 px mientras aparece (0,28 s) en vez de cambiar de golpe; lo que se despliega dentro de una fila solo se funde (0,2 s).",
  cuando_usar="Pestañas o vistas dentro de la misma página.",
  reglas=["Se reproduce sola cada vez porque el panel pasa de display:none a visible: no hace falta JS para relanzarla.",
          "panel-entra (sube 8 px) para lo que cambia de sitio; aparecer (solo opacidad) para lo que se despliega en su sitio.",
          "Curva --ease cubic-bezier(.16,1,.3,1); todo se desactiva con movimiento reducido."],
  html="""<div class="mo-cp"><div class="mo-cp-tabs"><button class="on" data-t="0">Hoy</button><button data-t="1">Semana</button><button data-t="2">Mes</button></div>
  <section class="mo-cp-p"><b>Hoy · 7 h 32 min</b><div class="mo-cp-l"><span>Entrada</span><span>08:02</span></div><div class="mo-cp-l"><span>Pausa</span><span>14:00 – 14:30</span></div></section>
  <section class="mo-cp-p" hidden><b>Semana · 31 h 10 min</b><div class="mo-cp-l"><span>Lunes</span><span>7 h 45</span></div><div class="mo-cp-l"><span>Martes</span><span>8 h 02</span></div></section>
  <section class="mo-cp-p" hidden><b>Noviembre · 128 h</b><div class="mo-cp-l"><span>Días trabajados</span><span>17</span></div><div class="mo-cp-l"><span>Correcciones</span><span>1</span></div></section></div>""",
  css="""
.mo-cp{background:#f7f6f0;border-radius:22px;padding:16px;font-family:-apple-system,Inter,system-ui,sans-serif;color:#15161a;min-height:220px}
.mo-cp-tabs{display:flex;gap:4px;background:#ece9de;border-radius:99px;padding:4px;width:max-content;margin-bottom:14px}
.mo-cp-tabs button{border:0;background:none;border-radius:99px;padding:7px 16px;font:600 13.5px inherit;font-family:inherit;color:#3a3a33;cursor:pointer}
.mo-cp-tabs button.on{background:#fff;color:#15161a;box-shadow:0 1px 3px rgba(0,0,0,.08)}
.mo-cp-p{background:#fff;border-radius:18px;padding:16px;animation:mo-cp-entra .28s cubic-bezier(.16,1,.3,1)}
.mo-cp-p b{display:block;font-size:17px;letter-spacing:-.02em;margin-bottom:8px;font-variant-numeric:tabular-nums}
.mo-cp-l{display:flex;justify-content:space-between;padding:8px 0;border-top:1px solid #e4e2d8;font-size:13.5px;font-variant-numeric:tabular-nums}.mo-cp-l span:first-child{color:#3a3a33}
@keyframes mo-cp-entra{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:none}}
@media (prefers-reduced-motion:reduce){.mo-cp-p{animation:none}}""",
  js="""const tabs = document.querySelectorAll('.mo-cp-tabs button'), ps = document.querySelectorAll('.mo-cp-p');
tabs.forEach(b => b.onclick = () => { tabs.forEach(x => x.classList.toggle('on', x === b)); ps.forEach((p, i) => p.hidden = i !== +b.dataset.t); });""")

out = os.path.join(os.path.dirname(__file__), "inv-movimiento.json")
json.dump({"piezas": P}, open(out, "w"), ensure_ascii=False, indent=1)
print(len(P), "piezas →", out)
