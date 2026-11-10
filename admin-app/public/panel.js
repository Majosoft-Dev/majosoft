// Estructura común del panel: menú lateral, usuario, llamadas a la API y avisos.
const ICONS = {
  home: '<path d="M3 11l9-7 9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z"/>',
  doc: '<path d="M14 3H6a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V8z"/><path d="M14 3v5h5M8 13h8M8 17h6"/>',
  invoice: '<path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6"/>',
  chat: '<path d="M4 5h16v11H8l-4 4z"/><path d="M8 9h8M8 12h5"/>',
  mail: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M3 7l9 6 9-6"/>',
  server: '<rect x="3" y="4" width="18" height="7" rx="2"/><rect x="3" y="13" width="18" height="7" rx="2"/><path d="M7 7.5h.01M7 16.5h.01"/>',
  shield: '<path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/><path d="M9 12l2 2 4-4"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
  check: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M8 13l2.5 2.5L16 10"/>',
  cal: '<rect x="3" y="4" width="18" height="17" rx="2"/><path d="M8 2v4M16 2v4M3 10h18M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01"/>',
  web: '<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',
};
const icon = n => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[n]}</svg>`;

export async function api(path, { method = "GET", body } = {}) {
  const json = body ? JSON.stringify(body) : undefined;
  const res = await fetch("/admin/api/" + path, {
    method, credentials: "same-origin",
    headers: { "X-Requested-With": "majosoft", ...(body ? { "Content-Type": "application/json" } : {}) },
    body: json,
    // keepalive: la petición termina aunque se cambie de página (el navegador lo limita a ~64 KB)
    keepalive: method !== "GET" && (!json || json.length < 60000),
  });
  if (res.status === 401) { location.href = "/admin/login"; throw new Error("Sesión caducada"); }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error || "Error " + res.status);
  return data;
}

let toastEl, toastT;
export function toast(msg, err = false) {
  toastEl ??= document.body.appendChild(Object.assign(document.createElement("div"), { className: "toast" }));
  toastEl.textContent = msg;
  toastEl.className = "toast on" + (err ? " err" : "");
  clearTimeout(toastT); toastT = setTimeout(() => toastEl.className = "toast", 2600);
}

// Guardado automático con espera: agrupa cambios seguidos en una sola petición.
// save.flush() guarda ya lo pendiente; también se guarda solo al salir de la página.
const pendientes = new Set();
addEventListener("pagehide", () => pendientes.forEach(f => f()));
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") pendientes.forEach(f => f()); });
export function autosaver(fn, delay = 700) {
  let t, el;
  const state = s => { el ??= document.querySelector("[data-save-state]"); if (el) el.textContent = s; };
  const run = async () => {
    clearTimeout(t); pendientes.delete(flush);
    try { await fn(); state("Guardado ✓"); } catch (e) { state("Sin guardar"); toast(e.message, true); }
  };
  const flush = () => pendientes.has(flush) ? run() : Promise.resolve();
  const save = () => { state("Guardando…"); clearTimeout(t); pendientes.add(flush); t = setTimeout(run, delay); };
  save.flush = flush;
  return save;
}

export async function mountShell(active) {
  // El menú se pinta al instante con el último usuario conocido; luego se confirma con el servidor
  let me;
  try { me = JSON.parse(sessionStorage.getItem("mj-me")); } catch {}
  const fresh = api("me").then(m => { try { sessionStorage.setItem("mj-me", JSON.stringify(m)); } catch {} return m; });
  if (!me) me = await fresh;
  const ini = (me.name || me.email).split(/[\s@.]+/).filter(Boolean).slice(0, 2).map(s => s[0].toUpperCase()).join("");
  const link = (href, key, label, ic) => `<a href="${href}" class="${active === key ? "on" : ""}">${icon(ic)}${label}</a>`;
  const side = document.createElement("aside");
  side.className = "side";
  side.innerHTML = `
    <a class="side-brand" href="/admin/"><img src="/assets/logo.svg" alt="" /><div><b>Majosoft</b><small>Panel de gestión</small></div></a>
    <button class="side-toggle" aria-label="Menú">☰</button>
    <div class="side-body">
      <div class="side-sec">General</div>
      <nav>${link("/admin/", "home", "Resumen", "home")}${link("/admin/tareas", "calendario", "Calendario", "cal")}</nav>
      <div class="side-sec">Comercial</div>
      <nav>${link("/admin/presupuestos", "presupuestos", "Presupuestos", "doc")}${link("/admin/facturas", "facturas", "Facturas", "invoice")}${link("/admin/bonos", "bonos", "Bonos de horas", "clock")}</nav>
      <div class="side-sec">Comunicación</div>
      <nav>${link("/admin/mensajes", "mensajes", "Mensajes web", "chat")}${link("/admin/correo", "correo", "Correo", "mail")}</nav>
      <div class="side-sec">Sistemas</div>
      <nav>${link("/admin/servidores", "servidores", "Servidores", "server")}${link("/admin/consultas", "consultas", "Consultas SQL", "doc")}</nav>
      <div class="side-sec">Cuenta</div>
      <nav>${link("/admin/seguridad", "seguridad", "Seguridad", "shield")}<a href="/" target="_blank" rel="noopener">${icon("web")}Ver la web ↗</a></nav>
      <div class="side-user">
      <div class="av">${ini}</div>
      <div class="who"><b>${(me.name || me.email).replace(/</g, "&lt;")}</b><span>Administrador</span></div>
        <button id="logout">Salir</button>
      </div>
    </div>`;
  document.body.prepend(side);
  document.body.classList.add("has-side");
  side.querySelector(".side-toggle").onclick = () => side.classList.toggle("open");
  side.querySelector("#logout").onclick = async () => { try { sessionStorage.removeItem("mj-me"); } catch {} await api("logout", { method: "POST" }); location.href = "/admin/login"; };
  return fresh;
}

/* ===== Desplegable propio del panel =====
   Todos los <select> se sustituyen solos por un botón con una lista propia (igual en Chrome y Safari).
   El <select> original sigue en la página, oculto: guarda el valor, y al elegir se lanzan sus eventos
   input y change, así que formularios y guardado automático funcionan como siempre. */
const SEL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>';
let selPop, selActual;
// Coloca una lista flotante junto a su campo (debajo, o encima si no cabe). Dentro de una ventana
// las coordenadas «fixed» pueden ir referidas a la ventana: se mide y se corrige la diferencia.
function colocar(pop, r, maxAlto) {
  pop.style.minWidth = r.width + "px"; pop.style.maxHeight = maxAlto + "px";
  const alto = Math.min(pop.scrollHeight, maxAlto), abajo = innerHeight - r.bottom;
  const top = abajo < alto + 12 && r.top > abajo ? r.top - alto - 6 : r.bottom + 6;
  const left = Math.max(8, Math.min(r.left, innerWidth - pop.offsetWidth - 8));
  pop.style.top = top + "px"; pop.style.left = left + "px";
  const real = pop.getBoundingClientRect();
  pop.style.top = top + (top - real.top) + "px"; pop.style.left = left + (left - real.left) + "px";
}
// Cierre con animación: la lista se desvanece y luego se oculta
function cerrarPop(pop) {
  if (!pop || pop.hidden || pop.classList.contains("cerrando")) return;
  pop.classList.add("cerrando");
  clearTimeout(pop._t); pop._t = setTimeout(() => { pop.hidden = true; pop.classList.remove("cerrando"); }, 120);
}
function abrirPop(pop) { clearTimeout(pop._t); pop.classList.remove("cerrando"); pop.hidden = false; pop.style.animation = "none"; pop.offsetWidth; pop.style.animation = ""; }
function selCerrar() {
  if (!selActual) return;
  selActual.btn.classList.remove("open"); selActual.btn.setAttribute("aria-expanded", "false");
  cerrarPop(selPop); selActual = null;
}
function selElegir(sel, i) {
  if (sel.selectedIndex !== i) {
    sel.selectedIndex = i;
    sel.dispatchEvent(new Event("input", { bubbles: true }));
    sel.dispatchEvent(new Event("change", { bubbles: true }));
  }
  sel._mjSync?.();
}
function selAbrir(sel, btn) {
  if (selActual?.sel === sel) return selCerrar();
  selCerrar();
  selPop ??= Object.assign(document.createElement("div"), { className: "mj-pop", role: "listbox", hidden: true });
  // Dentro de una ventana (<dialog>) la lista va en la propia ventana para quedar por encima
  const caja = sel.closest("dialog") || document.body;
  if (selPop.parentNode !== caja) caja.appendChild(selPop);
  const opts = [...sel.options];
  selPop.innerHTML = opts.map((o, i) => o.hidden ? "" : `<div class="mj-opt ${i === sel.selectedIndex ? "on" : ""} ${o.disabled ? "off" : ""}" data-i="${i}" role="option">${o.textContent.replace(/</g, "&lt;")}</div>`).join("");
  abrirPop(selPop); selActual = { sel, btn, foco: sel.selectedIndex };
  btn.classList.add("open"); btn.setAttribute("aria-expanded", "true");
  colocar(selPop, btn.getBoundingClientRect(), 300);
  selPop.querySelector(".on")?.scrollIntoView({ block: "nearest" });
  selMarcar();
}
function selMarcar() {
  selPop.querySelectorAll(".mj-opt").forEach(o => o.classList.toggle("foco", +o.dataset.i === selActual.foco));
  selPop.querySelector(".foco")?.scrollIntoView({ block: "nearest" });
}
function selMejorar(sel) {
  if (sel._mjSync || sel.multiple || sel.size > 1 || sel.closest("[data-sin-mj]")) return;
  const btn = document.createElement("button");
  btn.type = "button"; btn.className = "mj-sel"; btn.setAttribute("aria-haspopup", "listbox");
  if (sel.title) btn.title = sel.title;
  sel.classList.add("mj-native"); sel.tabIndex = -1; sel.setAttribute("aria-hidden", "true");
  sel.after(btn);
  const sync = sel._mjSync = () => {
    const o = sel.options[sel.selectedIndex];
    btn.innerHTML = `<span>${(o?.textContent || "").replace(/</g, "&lt;") || "&nbsp;"}</span>${SEL_ICON}`;
    btn.disabled = sel.disabled;
  };
  // .value y .selectedIndex puestos desde código también actualizan el botón
  for (const prop of ["value", "selectedIndex"]) {
    const d = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, prop);
    Object.defineProperty(sel, prop, { configurable: true, get() { return d.get.call(this); }, set(v) { d.set.call(this, v); sync(); } });
  }
  sel.addEventListener("change", sync);
  new MutationObserver(sync).observe(sel, { childList: true, subtree: true, attributes: true, attributeFilter: ["disabled", "selected"] });
  btn.addEventListener("click", e => { e.preventDefault(); selAbrir(sel, btn); });
  btn.addEventListener("keydown", e => {
    const abierto = selActual?.sel === sel, n = sel.options.length;
    const paso = d => { let i = abierto ? selActual.foco : sel.selectedIndex; do { i = Math.max(0, Math.min(n - 1, i + d)); } while (sel.options[i]?.disabled && i > 0 && i < n - 1); return i; };
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      const i = paso(e.key === "ArrowDown" ? 1 : -1);
      if (abierto) { selActual.foco = i; selMarcar(); } else selElegir(sel, i);
    } else if ((e.key === "Enter" || e.key === " ") && abierto) { e.preventDefault(); selElegir(sel, selActual.foco); selCerrar(); }
    else if (e.key === "Escape" && abierto) { e.preventDefault(); e.stopPropagation(); selCerrar(); }
    else if (e.key === "Tab") selCerrar();
    else if (e.key.length === 1 && /\S/.test(e.key)) { // salta a la opción que empieza por esa letra
      const k = e.key.toLowerCase(), desde = (abierto ? selActual.foco : sel.selectedIndex) + 1;
      const opts = [...sel.options], i = [...opts.slice(desde), ...opts.slice(0, desde)].find(o => !o.disabled && o.textContent.trim().toLowerCase().startsWith(k))?.index;
      if (i != null) { if (abierto) { selActual.foco = i; selMarcar(); } else selElegir(sel, i); }
    }
  });
  sync();
}
document.addEventListener("mousedown", e => {
  if (!selActual) return;
  const o = e.target.closest?.(".mj-opt");
  if (o && !o.classList.contains("off")) { e.preventDefault(); const s = selActual.sel, b = selActual.btn; selElegir(s, +o.dataset.i); selCerrar(); b.focus(); return; }
  if (!e.target.closest?.(".mj-pop") && !e.target.closest?.(".mj-sel")) selCerrar();
});
document.addEventListener("mouseover", e => { const o = e.target.closest?.(".mj-opt"); if (o && selActual) { selActual.foco = +o.dataset.i; selMarcar(); } });
addEventListener("scroll", e => { if (selActual && !e.target.closest?.(".mj-pop")) selCerrar(); }, true);
addEventListener("resize", selCerrar);
// Un clic en la etiqueta del campo abre el desplegable, como en un campo normal
document.addEventListener("click", e => {
  const lab = e.target.closest?.("label"); if (!lab || e.target.closest(".mj-sel, .mj-pop, input, textarea, a, button")) return;
  const sel = lab.querySelector("select.mj-native"); if (sel) { e.preventDefault(); sel.nextElementSibling?.click(); sel.nextElementSibling?.focus(); }
});
const selTodos = root => root.querySelectorAll?.("select").forEach(selMejorar);
selTodos(document);
new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) n.tagName === "SELECT" ? selMejorar(n) : selTodos(n); })
  .observe(document.documentElement, { childList: true, subtree: true });

/* ===== Campo con sugerencias (input con list=…) =====
   Sustituye la lista del navegador: al entrar se ven todas las opciones (aunque ya haya un valor),
   al escribir se filtran, y se puede escribir un valor nuevo. */
let sugPop, sugActual;
const sinTildes = s => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
function sugCerrar() { cerrarPop(sugPop); sugActual = null; }
function sugAbrir(inp, filtrar) {
  const dl = document.getElementById(inp.dataset.mjList);
  const todas = dl ? [...dl.options].map(o => o.value).filter(Boolean) : [];
  const q = filtrar ? sinTildes(inp.value.trim()) : "";
  const lista = q ? todas.filter(v => sinTildes(v).includes(q)) : todas;
  sugPop ??= Object.assign(document.createElement("div"), { className: "mj-pop", role: "listbox" });
  const caja = inp.closest("dialog") || document.body;
  if (sugPop.parentNode !== caja) caja.appendChild(sugPop);
  if (!lista.length) return sugCerrar();
  sugPop.innerHTML = lista.slice(0, 200).map((v, i) => `<div class="mj-opt ${v === inp.value ? "on" : ""}" data-v="${v.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")}" data-i="${i}">${v.replace(/&/g, "&amp;").replace(/</g, "&lt;")}</div>`).join("");
  if (sugPop.hidden || sugPop.classList.contains("cerrando")) abrirPop(sugPop);
  sugActual = { inp, foco: -1 };
  colocar(sugPop, inp.getBoundingClientRect(), 280);
}
function sugPoner(inp, v) {
  inp.value = v;
  inp.dispatchEvent(new Event("input", { bubbles: true }));
  inp.dispatchEvent(new Event("change", { bubbles: true }));
  sugCerrar();
}
function sugMejorar(inp) {
  if (inp.dataset.mjList || !inp.getAttribute("list")) return;
  inp.dataset.mjList = inp.getAttribute("list"); inp.removeAttribute("list"); inp.autocomplete = "off";
  inp.classList.add("mj-sug");
  inp.addEventListener("focus", () => sugAbrir(inp, false));
  inp.addEventListener("click", () => { if (sugActual?.inp !== inp) sugAbrir(inp, false); });
  inp.addEventListener("input", e => { if (e.isTrusted) sugAbrir(inp, true); });
  inp.addEventListener("blur", () => setTimeout(() => { if (sugActual?.inp === inp && document.activeElement !== inp) sugCerrar(); }, 120));
  inp.addEventListener("keydown", e => {
    if (sugActual?.inp !== inp) { if (e.key === "ArrowDown") { e.preventDefault(); sugAbrir(inp, false); } return; }
    const ops = [...sugPop.querySelectorAll(".mj-opt")];
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      sugActual.foco = Math.max(0, Math.min(ops.length - 1, sugActual.foco + (e.key === "ArrowDown" ? 1 : -1)));
      ops.forEach((o, i) => o.classList.toggle("foco", i === sugActual.foco));
      ops[sugActual.foco]?.scrollIntoView({ block: "nearest" });
    } else if (e.key === "Enter" && sugActual.foco >= 0) { e.preventDefault(); sugPoner(inp, ops[sugActual.foco].dataset.v); }
    else if (e.key === "Escape") { e.preventDefault(); e.stopPropagation(); sugCerrar(); }
    else if (e.key === "Tab") sugCerrar();
  });
}
document.addEventListener("mousedown", e => {
  if (!sugActual) return;
  const o = e.target.closest?.(".mj-opt");
  if (o && sugPop.contains(o)) { e.preventDefault(); sugPoner(sugActual.inp, o.dataset.v); return; }
  if (e.target !== sugActual.inp && !e.target.closest?.(".mj-pop")) sugCerrar();
});
addEventListener("scroll", e => { if (sugActual && !e.target.closest?.(".mj-pop")) sugCerrar(); }, true);
const sugTodos = root => root.querySelectorAll?.("input[list]").forEach(sugMejorar);
sugTodos(document);
new MutationObserver(ms => { for (const m of ms) for (const n of m.addedNodes) if (n.nodeType === 1) n.matches?.("input[list]") ? sugMejorar(n) : sugTodos(n); })
  .observe(document.documentElement, { childList: true, subtree: true });

/* ===== Avisos y confirmaciones propios (sustituyen alert y confirm del navegador) =====
   await confirmar("¿Eliminar…?") → true/false. aviso("Texto") muestra un aviso con «Entendido». */
function mjDialogo({ titulo, texto, ok = "Aceptar", cancelar, peligro }) {
  return new Promise(resolve => {
    const d = document.createElement("dialog");
    d.className = "mj-dlg" + (peligro ? " peligro" : "");
    const e = s => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;");
    d.innerHTML = `<div class="mj-dlg-ic">${peligro ? "!" : "i"}</div>
      <div class="mj-dlg-txt">${titulo ? `<b>${e(titulo)}</b>` : ""}<p>${e(texto)}</p></div>
      <div class="mj-dlg-acts">${cancelar ? `<button type="button" class="mj-b" data-r="0">${e(cancelar)}</button>` : ""}<button type="button" class="mj-b mj-b-ok" data-r="1">${e(ok)}</button></div>`;
    let hecho = false;
    const fin = r => {
      if (hecho) return; hecho = true;
      d.classList.add("cerrando");
      setTimeout(() => { d.close(); d.remove(); }, 140);
      resolve(r);
    };
    d.addEventListener("click", ev => { const b = ev.target.closest("[data-r]"); if (b) fin(b.dataset.r === "1"); else if (ev.target === d) fin(false); });
    d.addEventListener("cancel", ev => { ev.preventDefault(); fin(false); });
    document.body.appendChild(d);
    d.showModal();
    d.querySelector(peligro ? "[data-r='0']" : "[data-r='1']")?.focus();
  });
}
const PELIGRO = /eliminar|borrar|desconectar|dejará de funcionar|se perderán|sobrescrib/i;
export const confirmar = (texto, o = {}) => mjDialogo({ texto, cancelar: "Cancelar", peligro: o.peligro ?? PELIGRO.test(texto),
  ok: o.ok ?? (/^¿?\s*eliminar/i.test(texto) ? "Eliminar" : /desconectar/i.test(texto) ? "Desconectar" : "Continuar"), titulo: o.titulo });
export const aviso = (texto, o = {}) => mjDialogo({ texto, ok: o.ok || "Entendido", titulo: o.titulo, peligro: o.peligro });
window.alert = t => { aviso(String(t)); };

/* ===== Animación al cambiar de página desde el menú (el menú se queda quieto) ===== */
document.addEventListener("click", e => {
  const a = e.target.closest?.(".side nav a"); if (!a || a.target === "_blank" || e.metaKey || e.ctrlKey) return;
  a.closest("nav").querySelectorAll("a").forEach(x => x.classList.toggle("on", x === a));
  document.querySelector("main")?.classList.add("mj-saliendo");
});
addEventListener("pageshow", () => document.querySelector("main")?.classList.remove("mj-saliendo"));
