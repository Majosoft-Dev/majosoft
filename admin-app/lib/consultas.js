// Consola SQL de solo lectura sobre las bases de las academias.
// El panel entra por SSH con la clave de copias (orden forzada copias-web-remoto → «sql <pg|mysql> <base>»);
// en el servidor, /usr/local/bin/panel-sql lanza la consulta como el usuario panel_lectura, que solo puede leer.
import { spawn } from "node:child_process";

const CLAVE = process.env.COPIAS_CLAVE || "/root/.ssh/copias_panel";
const MAX_FILAS = 1000;

export const BASES = [
  { id: "gdb-academia", servidor: "Guía del Bombero", ip: "217.154.107.19", motor: "pg", base: "guiadelbombero", nombre: "Academia · PostgreSQL" },
  { id: "gdb-wp", servidor: "Guía del Bombero", ip: "217.154.107.19", motor: "mysql", base: "guiadelbombero_wp", nombre: "WordPress · MariaDB" },
  { id: "ob-academia", servidor: "Objetivo Baeza", ip: "31.70.141.235", motor: "pg", base: "academia", nombre: "Academia · PostgreSQL" },
  { id: "ob-wp", servidor: "Objetivo Baeza", ip: "31.70.141.235", motor: "mysql", base: "objetivobaeza_wp", nombre: "WordPress · MariaDB" },
];

const fallo = (msg, status = 400) => Object.assign(new Error(msg), { status });

function lanzar(b, sql) {
  return new Promise((resolve, reject) => {
    const p = spawn("ssh", ["-i", CLAVE, "-o", "BatchMode=yes", "-o", "ConnectTimeout=8", `root@${b.ip}`, `sql ${b.motor} ${b.base}`]);
    let out = "", err = "";
    const t = setTimeout(() => p.kill("SIGKILL"), 40e3);
    p.stdout.on("data", d => { out += d; });
    p.stderr.on("data", d => { err += d; });
    p.on("error", e => { clearTimeout(t); reject(fallo("No se pudo conectar: " + e.message, 502)); });
    p.on("close", code => {
      clearTimeout(t);
      if (code === 0) return resolve(out);
      const msg = err.split("\n").map(l => l.trim()).filter(l => l && !/^-+$/.test(l)).filter(l => !sql.includes(l)).join("\n");
      reject(fallo(msg || (code === null ? "La consulta tardó demasiado" : "La consulta falló")));
    });
    p.stdin.end(sql);
  });
}

// CSV de psql (RFC 4180). Pensado para una consulta: con varias, psql junta sus resultados seguidos.
function csv(txt) {
  const filas = []; let fila = [], campo = "", q = false;
  for (let i = 0; i < txt.length; i++) {
    const c = txt[i];
    if (q) { if (c === '"') { if (txt[i + 1] === '"') { campo += '"'; i++; } else q = false; } else campo += c; }
    else if (c === '"') q = true;
    else if (c === ",") { fila.push(campo); campo = ""; }
    else if (c === "\n") { fila.push(campo); filas.push(fila); fila = []; campo = ""; }
    else if (c !== "\r") campo += c;
  }
  if (campo || fila.length) { fila.push(campo); filas.push(fila); }
  return filas;
}

// Salida -B de mysql: tabuladores, con \t \n \\ \0 escapados
const tsv = txt => txt.replace(/\n$/, "").split("\n").filter((l, i, a) => a.length > 1 || l)
  .map(l => l.split("\t").map(c => c.replace(/\\(.)/g, (_, x) => ({ t: "\t", n: "\n", "\\": "\\", 0: "\0" })[x] ?? x)));

export async function consultar(id, sql) {
  const b = BASES.find(x => x.id === id);
  if (!b) throw fallo("Base no válida");
  sql = String(sql || "").trim();
  if (!sql) throw fallo("Escribe una consulta");
  if (sql.length > 20000) throw fallo("La consulta es demasiado larga");
  const t0 = Date.now();
  const out = await lanzar(b, sql);
  const filas = out.trim() ? (b.motor === "pg" ? csv(out) : tsv(out)) : [];
  const [columnas = [], ...datos] = filas;
  return { columnas, filas: datos.slice(0, MAX_FILAS), total: datos.length, truncado: datos.length > MAX_FILAS || out.length >= 2e6, ms: Date.now() - t0 };
}
