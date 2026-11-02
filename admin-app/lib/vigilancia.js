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

  if (nuevos.length || resueltos.length || sucesos.length) {
    const dur = ms => ms < 3600e3 ? Math.round(ms / 60e3) + " min" : (ms / 3600e3).toFixed(1).replace(".", ",") + " h";
    const partes = [
      nuevos.length && "⛔ NUEVOS PROBLEMAS\n" + nuevos.map(([, t]) => "  · " + t).join("\n"),
      sucesos.length && "⚠️ " + sucesos.join("\n\n⚠️ "),
      resueltos.length && "✅ ARREGLADO\n" + resueltos.map(([, p]) => `  · ${p.texto} (duró ${dur(ahora - p.desde)})`).join("\n"),
    ].filter(Boolean);
    const asunto = nuevos.length ? `⛔ ${nuevos[0][1]}${nuevos.length > 1 ? ` (+${nuevos.length - 1})` : ""}`
      : sucesos.length ? "⚠️ Errores 5xx nuevos en los servidores" : `✅ Arreglado: ${resueltos[0][1].texto}`;
    try {
      await correo.enviar({ asunto, texto: partes.join("\n\n") + "\n\nEstado en directo: https://majosoft.es/admin/servidores\n— Vigilancia del panel Majosoft (revisa cada 5 minutos)" });
      st.error = "";
    } catch (e) { st.error = "No se pudo enviar el aviso: " + e.message; }
  }
  guardar(st);
}

export async function prueba() {
  await correo.enviar({ asunto: "✅ Prueba de avisos del panel Majosoft", texto: "Los avisos funcionan. Te escribiré aquí cuando una web dé error, aparezcan errores 5xx o algo del servidor falle, y otra vez cuando se arregle.\n\nhttps://majosoft.es/admin/servidores" });
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
