// Panel privado de Majosoft (/admin): login con contraseña + verificación en dos pasos,
// sesiones en servidor y almacenamiento de presupuestos y facturas.
import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";
import QRCode from "qrcode";
import { db, audit } from "./lib/db.js";
import * as correo from "./lib/correo.js";
import {
  verifyPassword, hashPassword, DUMMY_HASH, passwordProblems,
  newTotpSecret, verifyTotp, totpUri, newToken, sha256,
} from "./lib/security.js";

const PORT = +process.env.PORT || 3060;
const ORIGIN = process.env.ADMIN_ORIGIN || "https://majosoft.es";
// La web también responde en www: se aceptan las dos direcciones como propias
const ORIGINS = new Set([ORIGIN, ORIGIN.replace("://", "://www.")]);
const PUBLIC = path.join(path.dirname(fileURLToPath(import.meta.url)), "public");

const SESSION_TTL = 8 * 3600e3;    // duración máxima de una sesión
const IDLE_TTL = 60 * 60e3;        // cierre por inactividad
const PRE_TTL = 5 * 60e3;          // tiempo para introducir el código 2FA
const MAX_FAILS = 5;               // fallos antes de bloquear la cuenta
const LOCK_MS = 15 * 60e3;         // duración del bloqueo
const COOKIE = "mj_session", PRE_COOKIE = "mj_pre";

const app = express();
app.disable("x-powered-by");
app.set("trust proxy", "loopback");
app.use(express.json({ limit: "3mb" }));

/* ===== El panel siempre en la dirección principal (sin www) ===== */
// Si se entra por www.majosoft.es se redirige a majosoft.es, para que la sesión sea siempre la misma
app.use("/admin", (req, res, next) => {
  const host = new URL(ORIGIN).host;
  if (req.method === "GET" && req.hostname === "www." + host) return res.redirect(301, ORIGIN + req.originalUrl);
  next();
});

/* ===== Cabeceras de seguridad ===== */
app.use((req, res, next) => {
  res.set({
    "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src https://fonts.gstatic.com; img-src 'self' data: blob:; connect-src 'self'; frame-ancestors 'none'; base-uri 'none'; form-action 'self'",
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "same-origin",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "X-Robots-Tag": "noindex, nofollow",
    "Cache-Control": "no-store",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  });
  next();
});

/* ===== Cookies ===== */
const cookies = req => Object.fromEntries((req.headers.cookie || "").split(";").map(c => c.trim().split("=")).filter(c => c[0]).map(([k, ...v]) => [k, decodeURIComponent(v.join("="))]));
const setCookie = (res, name, value, maxAgeMs) =>
  res.append("Set-Cookie", `${name}=${value}; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=${Math.floor(maxAgeMs / 1000)}`);
const clearCookie = (res, name) => res.append("Set-Cookie", `${name}=; Path=/admin; HttpOnly; Secure; SameSite=Strict; Max-Age=0`);

/* ===== Protección CSRF: toda escritura debe venir de nuestra propia web ===== */
app.use("/admin/api", (req, res, next) => {
  if (req.method === "GET") return next();
  const origin = req.get("origin");
  if (req.get("x-requested-with") !== "majosoft" || (origin && !ORIGINS.has(origin))) {
    return res.status(403).json({ error: "Petición no permitida" });
  }
  next();
});

/* ===== Sesiones ===== */
const pending = new Map(); // primer paso superado, a falta del código 2FA

function loadSession(req) {
  const token = cookies(req)[COOKIE];
  if (!token) return null;
  const now = Date.now();
  const s = db.prepare(`SELECT s.*, u.email, u.name FROM sessions s JOIN users u ON u.id = s.user_id WHERE s.token_hash = ?`).get(sha256(token));
  if (!s || s.expires_at < now || s.last_seen + IDLE_TTL < now) {
    if (s) db.prepare("DELETE FROM sessions WHERE id = ?").run(s.id);
    return null;
  }
  db.prepare("UPDATE sessions SET last_seen = ? WHERE id = ?").run(now, s.id);
  return { id: s.id, user: { id: s.user_id, email: s.email, name: s.name } };
}

function startSession(req, res, user) {
  const token = newToken(), now = Date.now();
  db.prepare("INSERT INTO sessions (token_hash, user_id, created_at, last_seen, expires_at, ip, user_agent) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(sha256(token), user.id, now, now, now + SESSION_TTL, req.ip, String(req.get("user-agent") || "").slice(0, 200));
  setCookie(res, COOKIE, token, SESSION_TTL);
  clearCookie(res, PRE_COOKIE);
  db.prepare("UPDATE users SET failed_attempts = 0, locked_until = 0 WHERE id = ?").run(user.id);
  audit("login_ok", { user, ip: req.ip });
}

function requireAuth(req, res, next) {
  const s = loadSession(req);
  if (s) { req.session = s; return next(); }
  if (req.originalUrl.startsWith("/admin/api/")) return res.status(401).json({ error: "Sesión caducada" });
  res.redirect(302, "/admin/login");
}

function registerFailure(user, req, why) {
  audit("login_fail", { user, email: user?.email, ip: req.ip, detail: why });
  if (!user) return;
  const fails = user.failed_attempts + 1;
  const lock = fails >= MAX_FAILS ? Date.now() + LOCK_MS : 0;
  db.prepare("UPDATE users SET failed_attempts = ?, locked_until = ? WHERE id = ?").run(lock ? 0 : fails, lock, user.id);
  if (lock) audit("account_locked", { user, ip: req.ip });
}

const getUser = email => db.prepare("SELECT * FROM users WHERE email = ? COLLATE NOCASE").get(String(email || "").trim());
const lockedMsg = u => `Cuenta bloqueada temporalmente por intentos fallidos. Inténtalo de nuevo en ${Math.ceil((u.locked_until - Date.now()) / 60000)} min.`;

/* ===== Login: paso 1, contraseña ===== */
app.post("/admin/api/login", (req, res) => {
  const { email, password } = req.body || {};
  const user = getUser(email);
  if (user && user.locked_until > Date.now()) return res.status(429).json({ error: lockedMsg(user) });
  const ok = verifyPassword(String(password || ""), user?.password_hash || DUMMY_HASH);
  if (!user || !ok) {
    registerFailure(user, req, "contraseña");
    return res.status(401).json({ error: "Correo o contraseña incorrectos" });
  }
  // La verificación en dos pasos es opcional: sin ella activada se entra directamente
  if (!user.totp_enabled) { startSession(req, res, user); return res.json({ step: "done" }); }
  const pre = newToken();
  pending.set(sha256(pre), { userId: user.id, exp: Date.now() + PRE_TTL, secret: null });
  setCookie(res, PRE_COOKIE, pre, PRE_TTL);
  res.json({ step: "totp" });
});

function takePending(req) {
  const t = cookies(req)[PRE_COOKIE];
  const p = t && pending.get(sha256(t));
  if (!p || p.exp < Date.now()) return null;
  return { key: sha256(t), ...p, user: db.prepare("SELECT * FROM users WHERE id = ?").get(p.userId) };
}

/* ===== Alta de la verificación en dos pasos (primer acceso) ===== */
app.get("/admin/api/login/setup", async (req, res) => {
  const p = takePending(req);
  if (!p || !p.secret) return res.status(401).json({ error: "Vuelve a iniciar sesión" });
  const uri = totpUri(p.secret, p.user.email);
  res.json({ qr: await QRCode.toDataURL(uri, { margin: 1, width: 220 }), secret: p.secret.match(/.{1,4}/g).join(" ") });
});

/* ===== Login: paso 2, código de la app ===== */
app.post("/admin/api/login/verify", (req, res) => {
  const p = takePending(req);
  if (!p) return res.status(401).json({ error: "El tiempo para introducir el código ha caducado. Vuelve a iniciar sesión." });
  const user = p.user;
  if (user.locked_until > Date.now()) return res.status(429).json({ error: lockedMsg(user) });
  const secret = p.secret || user.totp_secret;
  const counter = verifyTotp(secret, req.body?.code, p.secret ? -1 : user.totp_last_counter);
  if (counter === null) {
    registerFailure(user, req, "código 2FA");
    return res.status(401).json({ error: "Código incorrecto o caducado" });
  }
  if (p.secret) {
    db.prepare("UPDATE users SET totp_secret = ?, totp_enabled = 1, totp_last_counter = ? WHERE id = ?").run(p.secret, counter, user.id);
    audit("2fa_enabled", { user, ip: req.ip });
  } else {
    db.prepare("UPDATE users SET totp_last_counter = ? WHERE id = ?").run(counter, user.id);
  }
  pending.delete(p.key);
  startSession(req, res, user);
  res.json({ ok: true });
});

app.post("/admin/api/logout", (req, res) => {
  const s = loadSession(req);
  if (s) { db.prepare("DELETE FROM sessions WHERE id = ?").run(s.id); audit("logout", { user: s.user, ip: req.ip }); }
  clearCookie(res, COOKIE);
  res.json({ ok: true });
});

/* ===== Formulario de contacto de la web (público) ===== */
const contactos = new Map(); // ip -> marcas de tiempo recientes
app.post("/api/contacto", (req, res) => {
  const origin = req.get("origin");
  if (origin && !ORIGINS.has(origin)) return res.status(403).json({ ok: false });
  const { nombre, email, mensaje, botcheck } = req.body || {};
  if (botcheck) return res.json({ ok: true }); // bot: se descarta sin avisar
  const n = String(nombre || "").trim().slice(0, 120), e = String(email || "").trim().slice(0, 200), m = String(mensaje || "").trim().slice(0, 5000);
  if (!n || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) || !m) return res.status(400).json({ ok: false, error: "Faltan datos" });
  const now = Date.now(), prev = (contactos.get(req.ip) || []).filter(t => now - t < 10 * 60e3);
  if (prev.length >= 5) return res.status(429).json({ ok: false, error: "Demasiados mensajes seguidos" });
  contactos.set(req.ip, [...prev, now]);
  db.prepare("INSERT INTO mensajes (at, nombre, email, mensaje, ip) VALUES (?, ?, ?, ?, ?)").run(now, n, e, m, req.ip);
  res.json({ ok: true });
});

/* ===== Páginas públicas del panel (solo el login) ===== */
app.get("/admin/login", (req, res) => loadSession(req) ? res.redirect(302, "/admin/") : res.sendFile(path.join(PUBLIC, "login.html")));
app.get("/admin/panel.css", (req, res) => res.sendFile(path.join(PUBLIC, "panel.css")));

/* ===== A partir de aquí, todo requiere sesión ===== */
app.use("/admin", requireAuth);

app.get("/admin/api/me", (req, res) => {
  const u = db.prepare("SELECT totp_enabled FROM users WHERE id = ?").get(req.session.user.id);
  res.json({ ...req.session.user, totp: !!u.totp_enabled });
});

/* ===== Verificación en dos pasos (opcional, desde Seguridad) ===== */
const setupSecrets = new Map(); // userId -> { secret, exp }
app.get("/admin/api/2fa/setup", async (req, res) => {
  const secret = newTotpSecret();
  setupSecrets.set(req.session.user.id, { secret, exp: Date.now() + 10 * 60e3 });
  const qr = await QRCode.toDataURL(totpUri(secret, req.session.user.email), { margin: 1, width: 220 });
  res.json({ qr, secret: secret.match(/.{1,4}/g).join(" ") });
});
app.post("/admin/api/2fa/enable", (req, res) => {
  const p = setupSecrets.get(req.session.user.id);
  if (!p || p.exp < Date.now()) return res.status(400).json({ error: "Vuelve a generar el código QR" });
  const counter = verifyTotp(p.secret, req.body?.code);
  if (counter === null) return res.status(400).json({ error: "Código incorrecto o caducado" });
  db.prepare("UPDATE users SET totp_secret = ?, totp_enabled = 1, totp_last_counter = ? WHERE id = ?").run(p.secret, counter, req.session.user.id);
  setupSecrets.delete(req.session.user.id);
  audit("2fa_enabled", { user: req.session.user, ip: req.ip });
  res.json({ ok: true });
});
app.post("/admin/api/2fa/disable", (req, res) => {
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.user.id);
  if (!verifyPassword(String(req.body?.password || ""), user.password_hash)) return res.status(400).json({ error: "La contraseña no es correcta" });
  db.prepare("UPDATE users SET totp_secret = NULL, totp_enabled = 0, totp_last_counter = -1 WHERE id = ?").run(user.id);
  audit("2fa_disabled", { user: req.session.user, ip: req.ip });
  res.json({ ok: true });
});

app.get("/admin/api/security", (req, res) => {
  const uid = req.session.user.id;
  res.json({
    sessions: db.prepare("SELECT id, created_at, last_seen, ip, user_agent FROM sessions WHERE user_id = ? ORDER BY last_seen DESC").all(uid)
      .map(s => ({ ...s, current: s.id === req.session.id })),
    audit: db.prepare("SELECT at, email, event, ip, detail FROM audit ORDER BY id DESC LIMIT 40").all(),
  });
});

app.delete("/admin/api/sessions/:id", (req, res) => {
  db.prepare("DELETE FROM sessions WHERE id = ? AND user_id = ? AND id != ?").run(+req.params.id, req.session.user.id, req.session.id);
  audit("session_revoked", { user: req.session.user, ip: req.ip });
  res.json({ ok: true });
});

app.post("/admin/api/password", (req, res) => {
  const { current, next: nueva } = req.body || {};
  const user = db.prepare("SELECT * FROM users WHERE id = ?").get(req.session.user.id);
  if (!verifyPassword(String(current || ""), user.password_hash)) return res.status(400).json({ error: "La contraseña actual no es correcta" });
  const problems = passwordProblems(String(nueva || ""));
  if (problems.length) return res.status(400).json({ error: "La nueva contraseña necesita " + problems.join(", ") });
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(hashPassword(nueva), user.id);
  db.prepare("DELETE FROM sessions WHERE user_id = ? AND id != ?").run(user.id, req.session.id);
  audit("password_changed", { user, ip: req.ip });
  res.json({ ok: true });
});

/* ===== Documentos: presupuestos y facturas ===== */
const KINDS = new Set(["presupuestos", "facturas", "ajustes"]);
const ID = /^[\w-]{1,64}$/;
app.param("kind", (req, res, next, kind) => KINDS.has(kind) ? next() : res.status(404).json({ error: "No existe" }));

app.get("/admin/api/docs/:kind", (req, res) => {
  res.json(db.prepare("SELECT id, data, updated_at FROM docs WHERE kind = ? ORDER BY updated_at DESC").all(req.params.kind)
    .map(r => ({ ...JSON.parse(r.data), id: r.id, updated_at: r.updated_at })));
});

app.put("/admin/api/docs/:kind/:id", (req, res) => {
  const { kind, id } = req.params;
  if (!ID.test(id) || typeof req.body !== "object" || Array.isArray(req.body)) return res.status(400).json({ error: "Datos no válidos" });
  const existed = db.prepare("SELECT 1 FROM docs WHERE kind = ? AND id = ?").get(kind, id);
  db.prepare(`INSERT INTO docs (kind, id, data, updated_at, updated_by) VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(kind, id) DO UPDATE SET data = excluded.data, updated_at = excluded.updated_at, updated_by = excluded.updated_by`)
    .run(kind, id, JSON.stringify({ ...req.body, id }), Date.now(), req.session.user.id);
  if (!existed) audit("doc_created", { user: req.session.user, ip: req.ip, detail: `${kind}/${id}` });
  res.json({ ok: true });
});

app.delete("/admin/api/docs/:kind/:id", (req, res) => {
  db.prepare("DELETE FROM docs WHERE kind = ? AND id = ?").run(req.params.kind, req.params.id);
  audit("doc_deleted", { user: req.session.user, ip: req.ip, detail: `${req.params.kind}/${req.params.id}` });
  res.json({ ok: true });
});

/* ===== Mensajes del formulario de la web ===== */
app.get("/admin/api/mensajes", (req, res) => {
  res.json(db.prepare("SELECT id, at, nombre, email, mensaje, origen, leido FROM mensajes ORDER BY id DESC LIMIT 500").all());
});
app.post("/admin/api/mensajes/:id/leido", (req, res) => {
  db.prepare("UPDATE mensajes SET leido = ? WHERE id = ?").run(req.body?.leido ? 1 : 0, +req.params.id);
  res.json({ ok: true });
});
app.delete("/admin/api/mensajes/:id", (req, res) => {
  db.prepare("DELETE FROM mensajes WHERE id = ?").run(+req.params.id);
  audit("message_deleted", { user: req.session.user, ip: req.ip, detail: "mensaje " + req.params.id });
  res.json({ ok: true });
});

/* ===== Correo (buzón IMAP) ===== */
const wrap = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (e) { res.status(e.status || 502).json({ error: e.status ? e.message : "No se pudo leer el buzón. Inténtalo de nuevo." }); if (!e.status) console.error("correo:", e.message); }
};
app.get("/admin/api/correo/estado", (req, res) => res.json(correo.estado()));
app.post("/admin/api/correo/config", wrap(async (req, res) => {
  await correo.guardar(req.body || {});
  audit("mail_connected", { user: req.session.user, ip: req.ip, detail: String(req.body?.user || "") });
  res.json(correo.estado());
}));
app.delete("/admin/api/correo/config", (req, res) => { correo.desconectar(); audit("mail_disconnected", { user: req.session.user, ip: req.ip }); res.json({ ok: true }); });
app.get("/admin/api/correo/mensajes", wrap(async (req, res) => {
  res.json(await correo.listar({ pagina: Math.max(1, +req.query.pagina || 1), buscar: String(req.query.q || "").slice(0, 100) }));
}));
app.get("/admin/api/correo/mensajes/:uid", wrap(async (req, res) => res.json(await correo.leer(+req.params.uid))));
app.post("/admin/api/correo/mensajes/:uid/leido", wrap(async (req, res) => { await correo.marcar(+req.params.uid, !!req.body?.leido); res.json({ ok: true }); }));
app.get("/admin/api/correo/mensajes/:uid/adjuntos/:i", wrap(async (req, res) => {
  const a = await correo.adjunto(+req.params.uid, +req.params.i);
  res.set({ "Content-Type": "application/octet-stream", "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(a.nombre)}` });
  res.send(a.contenido);
}));

/* ===== Páginas privadas ===== */
const PAGES = { "": "index.html", presupuestos: "presupuestos.html", facturas: "facturas.html", correo: "correo.html", mensajes: "mensajes.html", seguridad: "seguridad.html" };
app.get("/admin/panel.js", (req, res) => res.sendFile(path.join(PUBLIC, "panel.js")));
app.get(["/admin", "/admin/:page"], (req, res, next) => {
  const f = PAGES[(req.params.page || "").replace(/\.html$/, "")];
  f ? res.sendFile(path.join(PUBLIC, f)) : next();
});
app.use("/admin", (req, res) => res.status(404).send("No encontrado"));

/* ===== Limpieza periódica ===== */
setInterval(() => {
  const now = Date.now();
  db.prepare("DELETE FROM sessions WHERE expires_at < ? OR last_seen < ?").run(now, now - IDLE_TTL);
  for (const [k, p] of pending) if (p.exp < now) pending.delete(k);
}, 10 * 60e3).unref();

app.listen(PORT, "127.0.0.1", () => console.log(`Panel Majosoft escuchando en 127.0.0.1:${PORT}`));
