// Bandeja de entrada del panel: lectura del buzón por IMAP (IONOS u otro).
// La contraseña del buzón se guarda cifrada (AES-256-GCM) con una clave que
// vive en un archivo aparte del servidor, nunca en el código ni en GitHub.
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { ImapFlow } from "imapflow";
import { simpleParser } from "mailparser";
import { db } from "./db.js";

const KEY_PATH = process.env.ADMIN_SECRET_KEY || path.join(path.dirname(process.env.ADMIN_DB || "/var/lib/majosoft-admin/admin.db"), "secret.key");

db.exec(`CREATE TABLE IF NOT EXISTS settings (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);

function key() {
  if (!fs.existsSync(KEY_PATH)) fs.writeFileSync(KEY_PATH, crypto.randomBytes(32), { mode: 0o600 });
  return fs.readFileSync(KEY_PATH);
}
function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const c = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return [iv, c.getAuthTag(), data].map(b => b.toString("base64")).join(".");
}
function decrypt(blob) {
  const [iv, tag, data] = blob.split(".").map(s => Buffer.from(s, "base64"));
  const d = crypto.createDecipheriv("aes-256-gcm", key(), iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(data), d.final()]).toString("utf8");
}

const getSetting = k => db.prepare("SELECT value FROM settings WHERE key = ?").get(k)?.value;
const setSetting = (k, v) => db.prepare("INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value").run(k, v);

export function config() {
  const raw = getSetting("imap");
  if (!raw) return null;
  const c = JSON.parse(raw);
  return { ...c, password: decrypt(c.password) };
}
export const estado = () => { const c = config(); return c ? { configurado: true, user: c.user, host: c.host } : { configurado: false }; };

function client(c = config()) {
  if (!c) throw Object.assign(new Error("El buzón no está conectado"), { status: 409 });
  const imap = new ImapFlow({ host: c.host, port: c.port, secure: true, auth: { user: c.user, pass: c.password }, logger: false, socketTimeout: 30000 });
  // Sin este oyente, un timeout del socket es un 'error' sin capturar y tumba todo el panel
  imap.on("error", e => console.error("correo (imap):", e.code || "", e.message));
  return imap;
}

async function withBox(fn, c) {
  const imap = client(c);
  try { await imap.connect(); }
  catch (e) {
    if (e.authenticationFailed) throw Object.assign(new Error("El servidor de correo rechaza la contraseña del buzón. Desconéctalo y vuelve a conectarlo con la contraseña actual."), { status: 409 });
    throw e;
  }
  try {
    const lock = await imap.getMailboxLock("INBOX");
    try { return await fn(imap); } finally { lock.release(); }
  } finally { await imap.logout().catch(() => {}); }
}

export async function guardar({ host, port, user, password }) {
  const c = { host: String(host || "imap.ionos.es").trim(), port: +port || 993, user: String(user || "").trim(), password: String(password || "") };
  if (!c.user || !c.password) throw Object.assign(new Error("Faltan el correo o la contraseña"), { status: 400 });
  try { await withBox(async () => {}, c); }
  catch { throw Object.assign(new Error("No se pudo conectar al buzón: revisa el correo, la contraseña y el servidor"), { status: 400 }); }
  setSetting("imap", JSON.stringify({ ...c, password: encrypt(c.password) }));
}
export const desconectar = () => db.prepare("DELETE FROM settings WHERE key = 'imap'").run();

const addr = a => (a?.value || []).map(x => ({ name: x.name || "", address: x.address || "" }));

export async function listar({ pagina = 1, porPagina = 30, buscar = "" } = {}) {
  return withBox(async imap => {
    const total = imap.mailbox.exists;
    let uids;
    if (buscar) uids = (await imap.search({ or: [{ subject: buscar }, { from: buscar }, { body: buscar }] }, { uid: true })) || [];
    else uids = (await imap.search({ all: true }, { uid: true })) || [];
    uids.sort((a, b) => b - a);
    const pageUids = uids.slice((pagina - 1) * porPagina, pagina * porPagina);
    const out = [];
    if (pageUids.length) {
      for await (const m of imap.fetch(pageUids, { uid: true, envelope: true, flags: true, bodyStructure: true, internalDate: true }, { uid: true })) {
        const adj = JSON.stringify(m.bodyStructure || {}).includes('"disposition":"attachment"');
        out.push({
          uid: m.uid, asunto: m.envelope?.subject || "(sin asunto)",
          de: (m.envelope?.from || []).map(x => ({ name: x.name || "", address: x.address || "" })),
          fecha: (m.envelope?.date || m.internalDate)?.toISOString?.() || null,
          leido: m.flags?.has("\\Seen") || false, adjuntos: adj,
        });
      }
    }
    out.sort((a, b) => b.uid - a.uid);
    const noLeidos = (await imap.search({ seen: false }, { uid: true }))?.length || 0;
    return { total, coincidencias: uids.length, noLeidos, pagina, porPagina, mensajes: out };
  });
}

async function descargar(imap, uid) {
  const msg = await imap.fetchOne(String(uid), { source: true }, { uid: true });
  if (!msg) throw Object.assign(new Error("No existe el mensaje"), { status: 404 });
  return simpleParser(msg.source);
}

export async function leer(uid) {
  return withBox(async imap => {
    const p = await descargar(imap, uid);
    await imap.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true });
    return {
      uid, asunto: p.subject || "(sin asunto)", de: addr(p.from), para: addr(p.to), cc: addr(p.cc),
      fecha: p.date?.toISOString() || null, html: p.html || null, texto: p.text || "",
      adjuntos: (p.attachments || []).filter(a => a.contentDisposition !== "inline" || !a.cid)
        .map((a, i) => ({ i, nombre: a.filename || `adjunto-${i + 1}`, tipo: a.contentType, tamano: a.size })),
    };
  });
}

export async function adjunto(uid, i) {
  return withBox(async imap => {
    const p = await descargar(imap, uid);
    const list = (p.attachments || []).filter(a => a.contentDisposition !== "inline" || !a.cid);
    const a = list[+i];
    if (!a) throw Object.assign(new Error("No existe el adjunto"), { status: 404 });
    return { nombre: a.filename || `adjunto-${+i + 1}`, tipo: a.contentType || "application/octet-stream", contenido: a.content };
  });
}

export async function marcar(uid, leido) {
  return withBox(imap => leido
    ? imap.messageFlagsAdd(String(uid), ["\\Seen"], { uid: true })
    : imap.messageFlagsRemove(String(uid), ["\\Seen"], { uid: true }));
}

// Envío de avisos desde el mismo buzón (SMTP de IONOS con las credenciales guardadas)
export async function enviar({ asunto, texto, html, para }) {
  const c = config();
  if (!c) throw new Error("El buzón no está conectado: no se pueden enviar avisos");
  const { createTransport } = await import("nodemailer");
  const smtp = createTransport({ host: c.host.replace(/^imap\./, "smtp."), port: 465, secure: true, auth: { user: c.user, pass: c.password } });
  await smtp.sendMail({ from: `Panel Majosoft <${c.user}>`, to: para || c.user, subject: asunto, text: texto, html });
}
