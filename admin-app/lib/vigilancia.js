// Vigilancia automática cada 5 minutos, aunque nadie tenga el panel abierto.
// Avisa por email (buzón conectado al panel) cuando algo empieza a fallar y cuando se arregla:
//  · webs que no responden o dan 5xx (se reintenta una vez antes de avisar, por si es un corte puntual)
//  · errores 5xx nuevos en los logs de nginx de cada servidor (páginas internas, APIs…)
//  · certificados SSL que caducan pronto, certbot sin poder renovar, servicios caídos y disco lleno
import { db } from "./db.js";
import * as copias from "./copias.js";
import * as salud from "./salud.js";
import * as correo from "./correo.js";

const CADA = 5 * 60e3, SSL_DIAS = 14, DISCO = 85;
const leer = () => JSON.parse(db.prepare("SELECT value FROM settings WHERE key = 'vigilancia'").get()?.value || "null")
  || { activos: {}, historial: [], ultima: 0, error: "" };
const guardar = st => db.prepare("INSERT INTO settings (key, value) VALUES ('vigilancia', ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(JSON.stringify(st));
export const estado = () => ({ ...leer(), cada: CADA });

/* ===== Email con la estética de Majosoft (estilos en línea: los clientes de correo ignoran <style>) ===== */
const esc = t => String(t ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const TONO = { bad: ["#fbe9e7", "#b42318", "Problema"], warn: ["#fff5d6", "#a86b00", "Aviso"], ok: ["#e6f3ea", "#2f7d4f", "Arreglado"] };
function plantilla({ titulo, resumen, secciones }) {
  const filas = secciones.map(({ tono, titulo, items }) => { const [fondo, color, etiqueta] = TONO[tono]; return `
    <tr><td style="padding:0 32px 18px">
      <div style="font:700 11px/1 Inter,Arial,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:${color};margin:0 0 8px">${esc(etiqueta)} · ${esc(titulo)}</div>
      ${items.map(i => `<div style="background:${fondo};border-left:3px solid ${color};border-radius:8px;padding:12px 14px;margin:0 0 8px;font:500 14px/1.45 Inter,Arial,sans-serif;color:#15161a">${esc(i.texto)}${i.nota ? `<div style="font-size:12px;color:#6b6b62;margin-top:3px">${esc(i.nota)}</div>` : ""}</div>`).join("")}
    </td></tr>`; }).join("");
  return `<!doctype html><html><body style="margin:0;background:#f5f4ec;padding:24px 12px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#fff;border-radius:16px;overflow:hidden;border:1px solid #dcdbd0">
    <tr><td style="background:#15161a;padding:26px 32px">
      <div style="font:800 15px/1 Inter,Arial,sans-serif;color:#fff;letter-spacing:-.02em">majosoft<span style="color:#d6e022">.</span></div>
      <div style="font:800 22px/1.25 Inter,Arial,sans-serif;color:#fff;letter-spacing:-.02em;margin-top:18px">${esc(titulo)}</div>
      <div style="font:500 13px/1.5 Inter,Arial,sans-serif;color:#a9a99c;margin-top:6px">${esc(resumen)}</div>
    </td></tr>
    <tr><td style="height:24px"></td></tr>
    ${filas}
    <tr><td style="padding:6px 32px 28px"><a href="https://majosoft.es/admin/servidores" style="display:inline-block;background:#d6e022;color:#15161a;font:800 14px/1 Inter,Arial,sans-serif;text-decoration:none;padding:13px 20px;border-radius:10px">Ver estado en directo →</a></td></tr>
    <tr><td style="border-top:1px solid #eeede5;padding:16px 32px;font:500 11.5px/1.5 Inter,Arial,sans-serif;color:#8a8a80">Vigilancia del panel Majosoft · Revisa las webs, los errores 5xx y los servidores cada 5 minutos. Te escribe cuando algo falla y cuando se arregla.</td></tr>
  </table></body></html>`;
}

const espera = ms => new Promise(r => setTimeout(r, ms));
const host = url => new URL(url).hostname;

async function revisar() {
  const st = leer(), ahora = Date.now(), desde = st.ultima || ahora - CADA;
  const problemas = {}, sucesos = [];
  const srvs = await copias.estado();

  // Webs: código HTTP y certificado
  await Promise.all(srvs.flatMap(s => s.webs.filter(w => w.url).map(async w => {
    let r = await salud.web(w.url);
    if (!r.codigo || r.codigo >= 500) { await espera(20e3); r = await salud.web(w.url); }
    if (!r.codigo) problemas[`web:${w.url}`] = `${w.nombre} (${host(w.url)}) no responde: ${r.error}`;
    else if (r.codigo >= 500) problemas[`web:${w.url}`] = `${w.nombre} (${host(w.url)}) da error ${r.codigo}`;
    if (r.ssl != null && r.ssl < SSL_DIAS) problemas[`ssl:${host(w.url)}`] = `El certificado SSL de ${host(w.url)} caduca en ${r.ssl} días`;
  })));

  // Servidores: errores 5xx nuevos, certbot, servicios y disco
  await Promise.all(copias.SERVIDORES.map(async s => {
    let d;
    try { d = await copias.salud(s, salud.servidor); } catch (e) {
      if (!/Orden no permitida/.test(e.message)) problemas[`srv:${s.id}`] = `No se puede consultar el servidor ${s.nombre}: ${e.message}`;
      return;
    }
    const nuevos = d.nginx.rutas.filter(r => r.ultima > desde);
    if (nuevos.length) sucesos.push(`Errores 5xx en ${s.nombre}:\n` + nuevos.map(r => `  · ${r.ruta} (${r.veces} ${r.veces === 1 ? "vez" : "veces"} en 24 h)`).join("\n"));
    for (const c of d.certbot) problemas[`certbot:${c}`] = `${s.nombre}: certbot no consigue renovar ${c}`;
    for (const x of d.servicios) if (!(x === "certbot.service" && d.certbot.length)) problemas[`svc:${s.id}:${x}`] = `${s.nombre}: servicio caído ${x}`;
    const pd = d.disco.total ? Math.round(d.disco.usado / d.disco.total * 100) : 0;
    if (pd >= DISCO) problemas[`disco:${s.id}`] = `${s.nombre}: disco al ${pd} %`;
  }));

  // Qué empieza a fallar y qué se ha arreglado
  const nuevos = Object.entries(problemas).filter(([k]) => !st.activos[k]);
  const resueltos = Object.entries(st.activos).filter(([k]) => !problemas[k]);
  for (const [k, texto] of nuevos) st.activos[k] = { texto, desde: ahora };
  for (const [k, p] of resueltos) { st.historial.unshift({ tipo: "ok", texto: p.texto, desde: p.desde, hasta: ahora }); delete st.activos[k]; }
  for (const [, texto] of nuevos) st.historial.unshift({ tipo: "fallo", texto, desde: ahora });
  for (const texto of sucesos) st.historial.unshift({ tipo: "5xx", texto, desde: ahora });
  st.historial = st.historial.slice(0, 100);
  st.ultima = ahora;
  st.error = ""; // si el envío de abajo falla, se vuelve a anotar

  if (nuevos.length || resueltos.length || sucesos.length) {
    const dur = ms => ms < 3600e3 ? Math.max(1, Math.round(ms / 60e3)) + " min" : (ms / 3600e3).toFixed(1).replace(".", ",") + " h";
    const secciones = [
      nuevos.length && { tono: "bad", titulo: nuevos.length === 1 ? "algo ha dejado de funcionar" : `${nuevos.length} cosas han dejado de funcionar`, items: nuevos.map(([, texto]) => ({ texto })) },
      sucesos.length && { tono: "warn", titulo: "errores 5xx nuevos", items: sucesos.map(t => { const [cab, ...rs] = t.split("\n"); return { texto: cab.replace(/:$/, ""), nota: rs.map(x => x.trim().replace(/^· /, "")).join(" · ") }; }) },
      resueltos.length && { tono: "ok", titulo: "vuelve a funcionar", items: resueltos.map(([, p]) => ({ texto: p.texto, nota: `Duró ${dur(ahora - p.desde)}` })) },
    ].filter(Boolean);
    const asunto = nuevos.length ? `⛔ ${nuevos[0][1]}${nuevos.length > 1 ? ` (+${nuevos.length - 1})` : ""}`
      : sucesos.length ? "⚠️ Errores 5xx nuevos en los servidores" : `✅ Arreglado: ${resueltos[0][1].texto}`;
    const titulo = nuevos.length ? "Algo no va bien" : sucesos.length ? "Ha habido errores" : "Todo vuelve a funcionar";
    const resumen = new Date(ahora).toLocaleString("es-ES", { timeZone: "Europe/Madrid", weekday: "long", day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
    const texto = secciones.map(x => `${TONO[x.tono][2].toUpperCase()} · ${x.titulo}\n` + x.items.map(i => `  · ${i.texto}${i.nota ? ` (${i.nota})` : ""}`).join("\n")).join("\n\n") + "\n\nEstado en directo: https://majosoft.es/admin/servidores";
    try {
      await correo.enviar({ asunto, texto, html: plantilla({ titulo, resumen, secciones }) });
      st.error = "";
    } catch (e) { st.error = "No se pudo enviar el aviso: " + e.message; }
  }
  guardar(st);
}

export async function prueba() {
  const texto = "Los avisos funcionan. Te escribiré aquí cuando una web dé error, aparezcan errores 5xx o algo del servidor falle, y otra vez cuando se arregle.";
  await correo.enviar({ asunto: "✅ Prueba de avisos del panel Majosoft", texto: texto + "\n\nhttps://majosoft.es/admin/servidores",
    html: plantilla({ titulo: "Los avisos funcionan", resumen: "Email de prueba de la vigilancia del panel", secciones: [{ tono: "ok", titulo: "todo listo", items: [{ texto }] }] }) });
}

let enMarcha = false;
export function arrancar() {
  const ciclo = async () => {
    if (enMarcha) return;
    enMarcha = true;
    try { await revisar(); } catch (e) { const st = leer(); st.error = "La revisión falló: " + e.message; guardar(st); }
    finally { enMarcha = false; }
  };
  setTimeout(ciclo, 30e3).unref();
  setInterval(ciclo, CADA).unref();
}
