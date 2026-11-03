// Calendario iCal de tareas y renovaciones, para suscribirse desde Google Calendar.
import crypto from "node:crypto";
import { db } from "./db.js";

export const PERSONAS = { jose: "Jose", maria: "María", majosoft: "Majosoft" };
const FECHA = /^\d{4}-\d{2}-\d{2}$/;
export const PERIODOS = { mensual: 1, trimestral: 3, semestral: 6, anual: 12 };

const docs = kind => db.prepare("SELECT data FROM docs WHERE kind = ?").all(kind).map(r => JSON.parse(r.data));
const ajustes = () => JSON.parse(db.prepare("SELECT data FROM docs WHERE kind = 'ajustes' AND id = 'calendario'").get()?.data || "{}");

// Comprueba el token del enlace privado del calendario
export function tokenValido(token) {
  const t = ajustes().token;
  return !!t && /^[A-Za-z0-9_-]{20,64}$/.test(token) && t.length === token.length && crypto.timingSafeEqual(Buffer.from(t), Buffer.from(token));
}

// Primera renovación: inicio + un periodo (si el día no existe en el mes, el último día del mes)
export function sumarPeriodo(fecha, tipo, n = 1) {
  const [y, m, d] = fecha.split("-").map(Number);
  const meses = (PERIODOS[tipo] || 1) * n;
  const ultimo = new Date(Date.UTC(y, m - 1 + meses + 1, 0)).getUTCDate();
  const r = new Date(Date.UTC(y, m - 1 + meses, Math.min(d, ultimo)));
  return r.toISOString().slice(0, 10);
}

// Renovaciones de los últimos 2 meses y de los próximos 2 años (mensual) o 5 años (anual)
export function renovaciones(r, hoy = new Date().toISOString().slice(0, 10)) {
  if (!PERIODOS[r.tipo] || !FECHA.test(r.inicio || "")) return [];
  const desde = sumarPeriodo(hoy, "mensual", -2), tope = sumarPeriodo(hoy, "mensual", r.tipo === "mensual" ? 24 : 60);
  const hasta = FECHA.test(r.hasta || "") && r.hasta < tope ? r.hasta : tope, out = [];
  for (let n = 1; n < 2000; n++) {
    const fecha = sumarPeriodo(r.inicio, r.tipo, n);
    if (fecha > hasta) break;
    if (fecha >= desde) out.push({ n, fecha });
  }
  return out;
}

const esc = s => String(s ?? "").replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
const dia = f => f.replace(/-/g, "");
// Las líneas de iCal no deben pasar de 75 bytes: se parten con un espacio al inicio de la siguiente
const plegar = linea => {
  const out = []; let cur = "";
  for (const ch of linea) {
    if (Buffer.byteLength(cur + ch) > (out.length ? 74 : 75)) { out.push(cur); cur = ""; }
    cur += ch;
  }
  out.push(cur);
  return out.join("\r\n ");
};

function evento({ uid, fecha, hora, titulo, descripcion, sello }) {
  const fin = new Date(fecha + "T12:00Z"); fin.setUTCDate(fin.getUTCDate() + 1);
  // Con hora: evento de 1 h en hora de Madrid; sin hora: de día completo
  const h = /^\d{2}:\d{2}$/.test(hora || "") ? hora.replace(":", "") : "";
  const hFin = h && String(Math.min(23, +h.slice(0, 2) + 1)).padStart(2, "0") + (+h.slice(0, 2) >= 23 ? "59" : h.slice(2));
  return [
    "BEGIN:VEVENT", `UID:${uid}@majosoft.es`, `DTSTAMP:${sello}`,
    ...(h ? [`DTSTART;TZID=Europe/Madrid:${dia(fecha)}T${h}00`, `DTEND;TZID=Europe/Madrid:${dia(fecha)}T${hFin}00`]
      : [`DTSTART;VALUE=DATE:${dia(fecha)}`, `DTEND;VALUE=DATE:${dia(fin.toISOString().slice(0, 10))}`]),
    `SUMMARY:${esc(titulo)}`, ...(descripcion ? [`DESCRIPTION:${esc(descripcion)}`] : []),
    "TRANSP:TRANSPARENT", "END:VEVENT",
  ];
}

// Todo lo que se renueva: fichas de renovación y presupuestos con renovación
export function fuentes() {
  const out = [];
  for (const r of docs("renovaciones")) out.push({ ...r, id: "r-" + r.id,
    titulo: [r.cliente, r.concepto].filter(Boolean).join(" · ") || "Renovación",
    nota: [r.importe && `Importe: ${r.importe}`, r.nota].filter(Boolean).join("\n") });
  for (const p of docs("presupuestos")) {
    const r = p.renov || {};
    if (PERIODOS[r.tipo]) out.push({ ...r, id: p.id, titulo: p.cliente || p.titulo || "presupuesto",
      nota: [p.titulo, p.referencia && "Referencia: " + p.referencia, r.nota].filter(Boolean).join("\n") });
  }
  return out;
}

// persona: "jose", "maria" o vacío para todas
export function ics(persona) {
  const sello = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  // El enlace de Jose o María incluye también lo de los dos (Majosoft o sin asignar)
  const de = p => !persona || persona === "majosoft" || p === persona || !PERSONAS[p] || p === "majosoft";
  const ev = [];
  for (const t of docs("tareas")) {
    if (!FECHA.test(t.fecha || "") || !de(t.persona)) continue;
    const hecha = t.estado === "hecha";
    ev.push(...evento({
      uid: "tarea-" + t.id, fecha: t.fecha, hora: t.hora, sello,
      titulo: `${hecha ? "✓ " : ""}[${PERSONAS[t.persona] || "Majosoft"}] ${t.titulo || "Tarea"}${t.cliente ? " · " + t.cliente : ""}`,
      descripcion: [t.detalle, Array.isArray(t.sub) && t.sub.length && t.sub.map(x => `${x.hecha ? "☑" : "☐"} ${x.texto}`).join("\n"), t.estado === "curso" ? "Estado: en curso" : hecha ? "Estado: hecha" : "Estado: pendiente"].filter(Boolean).join("\n\n"),
    }));
  }
  for (const x of fuentes()) {
    if (!de(x.persona)) continue;
    const quien = PERSONAS[x.persona] ? `[${PERSONAS[x.persona]}] ` : "";
    // Fechas concretas (no RRULE): así un inicio el día 31 cae el último día de los meses cortos
    for (const { n, fecha } of renovaciones(x)) ev.push(...evento({
      uid: `renov-${x.id}-${n}`, fecha, sello,
      titulo: `${quien}Renovar ${x.tipo}: ${x.titulo}`,
      descripcion: x.nota,
    }));
  }
  // Publicaciones de redes de UMME (las manda cada semana el Mac de María): son de María
  if (de("maria")) {
    const ahora = new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid", dateStyle: "short", timeStyle: "short" }).format(new Date());
    for (const p of publicaciones().lista) {
      // Lo programado, pasada su hora, ya está publicado (sin esperar a la siguiente actualización)
      const pasada = `${p.fecha} ${p.hora || "23:59"}` <= ahora;
      const estado = p.estado === "programado" && pasada ? "publicado" : p.estado;
      const icono = { publicado: "✅ Publicado", programado: "📅 Programado" }[estado] || "📲 Por publicar";
      ev.push(...evento({
        uid: "umme-" + p.id, fecha: p.fecha, hora: p.hora, sello,
        titulo: `${icono}: ${p.titulo}`,
        descripcion: [p.cuenta && "Cuenta: " + p.cuenta, p.detalle].filter(Boolean).join("\n\n"),
      }));
    }
  }
  const nombre = persona ? `Majosoft · ${PERSONAS[persona]}` : "Majosoft · Tareas";
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Majosoft//Panel//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${nombre}`, "X-WR-TIMEZONE:Europe/Madrid", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H",
    ...ev, "END:VCALENDAR"].map(plegar).join("\r\n") + "\r\n";
}
