// Estado en directo de las webs y del servidor del panel («apartamentos»).
// Las webs se comprueban desde aquí por HTTPS (código, tiempo y caducidad del certificado);
// del servidor local se leen disco, memoria, carga, servicios caídos, renovaciones de certbot y errores 5xx de nginx.
// En «guiadelbombero» y «objetivo» este mismo archivo está copiado como /usr/local/bin/salud-servidor.mjs y lo lanza
// copias-web-remoto con la orden «salud» (solo lectura). Si se cambia, hay que volver a copiarlo allí.
import { execFile } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import tls from "node:tls";
import { pathToFileURL } from "node:url";

const sh = (cmd, args) => new Promise(resolve =>
  execFile(cmd, args, { timeout: 15e3 }, (err, stdout) => resolve(err && !stdout ? "" : String(stdout))));

// Días que le quedan al certificado SSL de un dominio
function certificado(host) {
  return new Promise(resolve => {
    const s = tls.connect({ host, port: 443, servername: host, timeout: 8e3 }, () => {
      const c = s.getPeerCertificate();
      s.end();
      resolve(c?.valid_to ? Math.floor((new Date(c.valid_to) - Date.now()) / 86400e3) : null);
    });
    s.on("error", () => resolve(null));
    s.on("timeout", () => { s.destroy(); resolve(null); });
  });
}

export async function web(url) {
  const t0 = Date.now();
  let codigo = 0, error = "";
  try {
    const r = await fetch(url, { redirect: "follow", signal: AbortSignal.timeout(10e3), headers: { "user-agent": "MajosoftEstado/1.0" } });
    codigo = r.status;
    await r.arrayBuffer().catch(() => {});
  } catch (e) { error = e.name === "TimeoutError" ? "No responde (más de 10 s)" : (e.cause?.code || e.message); }
  const ms = Date.now() - t0;
  const ssl = await certificado(new URL(url).hostname);
  return { url, codigo, ms, ssl, error };
}

const RUIDO = /xmlrpc\.php|wp-config-sample\.php|wp-signup\.php|\/wp-admin\/includes\/|\/wp-includes\//i;

// Errores 5xx de nginx en las últimas 24 h, agrupados por ruta
function errores5xx() {
  const desde = Date.now() - 24 * 3600e3, rutas = new Map();
  let total = 0, peticiones = 0;
  for (const f of ["/var/log/nginx/access.log.1", "/var/log/nginx/access.log"]) {
    let txt = "";
    try { txt = fs.readFileSync(f, "utf8"); } catch { continue; }
    for (const l of txt.split("\n")) {
      const m = l.match(/\[(\d{2})\/(\w{3})\/(\d{4}):(\d{2}:\d{2}:\d{2}) [^\]]+\] "(\w+) ([^ ?"]+)[^"]*" (\d{3})/);
      if (!m) continue;
      const t = Date.parse(`${m[1]} ${m[2]} ${m[3]} ${m[4]} UTC`);
      if (!(t >= desde)) continue;
      peticiones++;
      if (m[7][0] !== "5") continue;
      if (RUIDO.test(m[6])) continue; // bots que piden ficheros internos de WordPress: no es un fallo real
      total++;
      const k = `${m[7]} ${m[5]} ${m[6]}`, v = rutas.get(k) || { ruta: k, veces: 0, ultima: 0 };
      v.veces++; v.ultima = Math.max(v.ultima, t); rutas.set(k, v);
    }
  }
  return { total, peticiones, rutas: [...rutas.values()].sort((a, b) => b.veces - a.veces).slice(0, 10) };
}

export async function servidor() {
  const [df, fallidos, certbot] = await Promise.all([
    sh("df", ["-P", "-B1", "/"]),
    sh("systemctl", ["--failed", "--no-legend", "--plain"]),
    sh("journalctl", ["-u", "certbot", "-n", "40", "--no-pager", "-o", "cat"]),
  ]);
  const [, tam, usado] = (df.trim().split("\n")[1] || "").split(/\s+/).map(Number);
  // Solo cuenta la última ejecución de certbot (si ya se arregló, no sigue avisando)
  const lineas = certbot.split("\n"), ini = lineas.findLastIndex(l => /^Starting certbot/.test(l));
  const fallos = lineas.slice(Math.max(0, ini)).filter(l => /Failed to renew certificate/.test(l)).map(l => l.match(/certificate (\S+)/)?.[1]).filter(Boolean);
  // Memoria disponible de verdad (la caché del sistema se puede liberar)
  let disp = 0;
  try { disp = Number(fs.readFileSync("/proc/meminfo", "utf8").match(/MemAvailable:\s+(\d+)/)?.[1] || 0) * 1024; } catch {}
  return {
    actividad: Math.floor(os.uptime() / 86400),
    carga: os.loadavg().map(n => +n.toFixed(2)), cpus: os.cpus().length,
    memoria: { total: os.totalmem(), libre: disp || os.freemem() },
    disco: { total: tam || 0, usado: usado || 0 },
    servicios: fallidos.trim().split("\n").filter(Boolean).map(l => l.split(/\s+/)[0]),
    certbot: [...new Set(fallos)],
    nginx: errores5xx(),
  };
}

// Uso desde la línea de órdenes (servidores remotos): node salud-servidor.mjs → JSON del servidor
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) console.log(JSON.stringify(await servidor()));
