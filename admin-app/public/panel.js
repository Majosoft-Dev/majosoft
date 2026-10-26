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
      <nav>${link("/admin/", "home", "Resumen", "home")}</nav>
      <div class="side-sec">Comercial</div>
      <nav>${link("/admin/presupuestos", "presupuestos", "Presupuestos", "doc")}${link("/admin/facturas", "facturas", "Facturas", "invoice")}${link("/admin/bonos", "bonos", "Bonos de horas", "clock")}</nav>
      <div class="side-sec">Comunicación</div>
      <nav>${link("/admin/mensajes", "mensajes", "Mensajes web", "chat")}${link("/admin/correo", "correo", "Correo", "mail")}</nav>
      <div class="side-sec">Sistemas</div>
      <nav>${link("/admin/servidores", "servidores", "Servidores", "server")}</nav>
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
