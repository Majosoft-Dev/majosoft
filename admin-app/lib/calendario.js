// Calendario iCal de tareas y renovaciones, para suscribirse desde Google Calendar.
import crypto from "node:crypto";
import { db } from "./db.js";

export const PERSONAS = { jose: "Jose", maria: "María" };
const FECHA = /^\d{4}-\d{2}-\d{2}$/;

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
  const meses = (tipo === "anual" ? 12 : 1) * n;
  const ultimo = new Date(Date.UTC(y, m - 1 + meses + 1, 0)).getUTCDate();
  const r = new Date(Date.UTC(y, m - 1 + meses, Math.min(d, ultimo)));
  return r.toISOString().slice(0, 10);
}

// Renovaciones de los últimos 2 meses y de los próximos 2 años (mensual) o 5 años (anual)
export function renovaciones(r, hoy = new Date().toISOString().slice(0, 10)) {
  if (!["mensual", "anual"].includes(r.tipo) || !FECHA.test(r.inicio || "")) return [];
  const desde = sumarPeriodo(hoy, "mensual", -2), tope = sumarPeriodo(hoy, r.tipo === "anual" ? "anual" : "mensual", r.tipo === "anual" ? 5 : 24);
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

function evento({ uid, fecha, titulo, descripcion, sello }) {
  const fin = new Date(fecha + "T12:00Z"); fin.setUTCDate(fin.getUTCDate() + 1);
  return [
    "BEGIN:VEVENT", `UID:${uid}@majosoft.es`, `DTSTAMP:${sello}`,
    `DTSTART;VALUE=DATE:${dia(fecha)}`, `DTEND;VALUE=DATE:${dia(fin.toISOString().slice(0, 10))}`,
    `SUMMARY:${esc(titulo)}`, ...(descripcion ? [`DESCRIPTION:${esc(descripcion)}`] : []),
    "TRANSP:TRANSPARENT", "END:VEVENT",
  ];
}

// persona: "jose", "maria" o vacío para todas
export function ics(persona) {
  const sello = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+/, "");
  const de = p => !persona || p === persona;
  const ev = [];
  for (const t of docs("tareas")) {
    if (!FECHA.test(t.fecha || "") || !de(t.persona)) continue;
    const hecha = t.estado === "hecha";
    ev.push(...evento({
      uid: "tarea-" + t.id, fecha: t.fecha, sello,
      titulo: `${hecha ? "✓ " : ""}[${PERSONAS[t.persona] || "Sin asignar"}] ${t.titulo || "Tarea"}`,
      descripcion: [t.detalle, t.estado === "curso" ? "Estado: en curso" : hecha ? "Estado: hecha" : "Estado: pendiente"].filter(Boolean).join("\n\n"),
    }));
  }
  for (const p of docs("presupuestos")) {
    const r = p.renov || {};
    if (!de(r.persona)) continue;
    const quien = PERSONAS[r.persona] ? `[${PERSONAS[r.persona]}] ` : "";
    // Fechas concretas (no RRULE): así un inicio el día 31 cae el último día de los meses cortos
    for (const { n, fecha } of renovaciones(r)) ev.push(...evento({
      uid: `renov-${p.id}-${n}`, fecha, sello,
      titulo: `${quien}Renovar ${r.tipo}: ${p.cliente || p.titulo || "presupuesto"}`,
      descripcion: [p.titulo, p.referencia && "Referencia: " + p.referencia, r.nota].filter(Boolean).join("\n"),
    }));
  }
  const nombre = persona ? `Majosoft · ${PERSONAS[persona]}` : "Majosoft · Tareas";
  return ["BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Majosoft//Panel//ES", "CALSCALE:GREGORIAN", "METHOD:PUBLISH",
    `X-WR-CALNAME:${nombre}`, "X-WR-TIMEZONE:Europe/Madrid", "REFRESH-INTERVAL;VALUE=DURATION:PT1H", "X-PUBLISHED-TTL:PT1H",
    ...ev, "END:VCALENDAR"].map(plegar).join("\r\n") + "\r\n";
}
