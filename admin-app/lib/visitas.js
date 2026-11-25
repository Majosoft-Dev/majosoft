// Estadísticas internas de majosoft.es: la web avisa de cada página vista (main.js → /api/visita)
// y aquí se guarda lo justo para contar. Sin cookies y sin guardar IPs: a cada persona se le da
// un código que es un resumen (hash) de su IP + navegador + una sal que cambia cada día, así que
// se puede contar «personas distintas en un día» pero no seguir a nadie de un día a otro.
import crypto from "node:crypto";
import { db } from "./db.js";

db.exec(`
  CREATE TABLE IF NOT EXISTS visitas (
    id INTEGER PRIMARY KEY,
    at INTEGER NOT NULL,
    dia TEXT NOT NULL,          -- AAAA-MM-DD en hora de Madrid
    hora INTEGER NOT NULL,      -- 0-23 en hora de Madrid
    ruta TEXT NOT NULL,
    visitante TEXT NOT NULL,    -- hash diario, no identifica a nadie
    entrada INTEGER NOT NULL,   -- 1 = llega de fuera (no es un clic dentro de la web)
    origen TEXT NOT NULL DEFAULT '',
    dispositivo TEXT NOT NULL DEFAULT '',
    navegador TEXT NOT NULL DEFAULT ''
  );
  CREATE INDEX IF NOT EXISTS visitas_dia ON visitas (dia);
`);

const CONSERVAR_DIAS = 400;
const diaDe = t => new Intl.DateTimeFormat("sv-SE", { timeZone: "Europe/Madrid" }).format(t);
const horaDe = t => +new Intl.DateTimeFormat("es-ES", { timeZone: "Europe/Madrid", hour: "numeric", hourCycle: "h23" }).format(t);

// Sal del día: se guarda en memoria; al cambiar de día se genera otra y la anterior se pierde
let sal = { dia: "", valor: "" };
const salDe = dia => sal.dia === dia ? sal.valor : (sal = { dia, valor: crypto.randomBytes(16).toString("hex") }).valor;

const BOTS = /bot|crawl|spider|slurp|headless|lighthouse|pagespeed|preview|facebookexternalhit|bingpreview|python|curl|wget|httpclient|java\/|go-http|phantom|selenium|puppeteer|playwright/i;
const NUESTROS = new Set(["majosoft.es", "www.majosoft.es"]);

// Nombres claros para las webs de las que más se llega
const ORIGENES = [
  [/(^|\.)google\./, "Google"], [/(^|\.)bing\.com$/, "Bing"], [/duckduckgo\.com$/, "DuckDuckGo"], [/(^|\.)yahoo\./, "Yahoo"], [/ecosia\.org$/, "Ecosia"],
  [/instagram\.com$/, "Instagram"], [/facebook\.com$|^fb\.me$/, "Facebook"], [/linkedin\.com$|^lnkd\.in$/, "LinkedIn"],
  [/^t\.co$|(^|\.)x\.com$|twitter\.com$/, "X (Twitter)"], [/tiktok\.com$/, "TikTok"], [/youtube\.com$|^youtu\.be$/, "YouTube"],
  [/whatsapp\.(com|net)$|^wa\.me$/, "WhatsApp"], [/chatgpt\.com$|openai\.com$/, "ChatGPT"], [/perplexity\.ai$/, "Perplexity"], [/claude\.ai$/, "Claude"],
];
const nombreOrigen = host => ORIGENES.find(([re]) => re.test(host))?.[1] || host.replace(/^www\./, "");

function navegadorDe(ua) {
  if (/Edg\//.test(ua)) return "Edge";
  if (/OPR\/|Opera/.test(ua)) return "Opera";
  if (/SamsungBrowser/.test(ua)) return "Samsung";
  if (/Firefox|FxiOS/.test(ua)) return "Firefox";
  if (/Chrome|CriOS/.test(ua)) return "Chrome";
  if (/Safari/.test(ua)) return "Safari";
  return "Otro";
}

// Rutas iguales escritas distinto cuentan como la misma página
const limpiarRuta = p => {
  let r = String(p || "/").split(/[?#]/)[0].replace(/\.html$/, "").replace(/\/index$/, "/").replace(/\/+$/, "") || "/";
  return /^\/[\w\-./]{0,100}$/.test(r) ? r : null;
};

const recientes = new Map(); // ip -> marcas de tiempo (límite contra abusos)
setInterval(() => recientes.clear(), 60e3).unref();

// Guarda una página vista. Devuelve false si se descarta (bot, datos raros, demasiadas seguidas).
export function registrar({ ip, ua = "", ruta, referente = "", ancho = 0, fuente = "" }) {
  if (!ua || BOTS.test(ua)) return false;
  const n = (recientes.get(ip) || 0) + 1; recientes.set(ip, n);
  if (n > 60) return false;
  const r = limpiarRuta(ruta); if (!r) return false;
  const ahora = Date.now(), dia = diaDe(ahora);
  let host = "";
  try { host = referente ? new URL(String(referente)).hostname.toLowerCase() : ""; } catch {}
  const interna = NUESTROS.has(host);
  // utm_source manda si viene (enlaces que ponemos nosotros en redes, correos…)
  const f = String(fuente || "").trim().toLowerCase().slice(0, 40);
  const origen = interna ? "" : f ? nombreOrigen(f.includes(".") ? f : f + ".com") : host ? nombreOrigen(host) : "Directo";
  const w = +ancho || 0;
  const dispositivo = !w ? "" : w < 768 ? "Móvil" : w < 1100 ? "Tablet" : "Ordenador";
  const visitante = crypto.createHash("sha256").update(salDe(dia) + "|" + ip + "|" + ua).digest("hex").slice(0, 16);
  db.prepare("INSERT INTO visitas (at, dia, hora, ruta, visitante, entrada, origen, dispositivo, navegador) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .run(ahora, dia, horaDe(ahora), r, visitante, interna ? 0 : 1, origen, dispositivo, navegadorDe(ua));
  return true;
}

// Limpieza: solo se guardan ~13 meses
setInterval(() => db.prepare("DELETE FROM visitas WHERE at < ?").run(Date.now() - CONSERVAR_DIAS * 86400e3), 6 * 3600e3).unref();

// Resumen para el panel de los últimos `dias` días (hoy incluido)
export function resumen(dias = 30) {
  dias = Math.min(Math.max(1, Math.floor(dias) || 30), 366);
  const lista = [];
  for (let i = dias - 1; i >= 0; i--) lista.push(diaDe(Date.now() - i * 86400e3));
  // Rango anterior del mismo tamaño, para comparar
  const antes = diaDe(Date.now() - (2 * dias - 1) * 86400e3);
  const desde = lista[0];
  const q = (sql, ...a) => db.prepare(sql).all(...a);

  const porDia = new Map(q(`SELECT dia, COUNT(*) vistas, COUNT(DISTINCT visitante) personas FROM visitas WHERE dia >= ? GROUP BY dia`, desde).map(r => [r.dia, r]));
  const serie = lista.map(d => ({ dia: d, vistas: porDia.get(d)?.vistas || 0, personas: porDia.get(d)?.personas || 0 }));
  const sum = (arr, k) => arr.reduce((n, r) => n + r[k], 0);
  // Personas = suma de personas distintas de cada día (el código cambia cada día)
  const previo = q(`SELECT COUNT(*) vistas, COUNT(DISTINCT dia || visitante) personas FROM visitas WHERE dia >= ? AND dia < ?`, antes, desde)[0];
  const actual = q(`SELECT COUNT(*) vistas, COUNT(DISTINCT dia || visitante) personas, SUM(entrada) entradas FROM visitas WHERE dia >= ?`, desde)[0];
  // Personas que solo vieron una página ese día (se fueron sin seguir mirando)
  const rebote = q(`SELECT COUNT(*) n, SUM(c = 1) solo1 FROM (SELECT COUNT(*) c FROM visitas WHERE dia >= ? GROUP BY dia, visitante)`, desde)[0];

  return {
    dias, desde, hasta: lista.at(-1),
    totales: {
      vistas: actual.vistas, personas: actual.personas, entradas: actual.entradas || 0,
      vistasAntes: previo.vistas, personasAntes: previo.personas,
      paginasPorPersona: actual.personas ? +(actual.vistas / actual.personas).toFixed(1) : 0,
      soloUna: rebote.n ? Math.round(100 * (rebote.solo1 || 0) / rebote.n) : 0,
      ahora: q(`SELECT COUNT(DISTINCT visitante) n FROM visitas WHERE at >= ?`, Date.now() - 5 * 60e3)[0].n,
      mensajes: q(`SELECT at FROM mensajes WHERE at >= ?`, Date.now() - (dias + 1) * 86400e3).filter(m => diaDe(m.at) >= desde).length,
      primera: q(`SELECT MIN(at) t FROM visitas`)[0].t,
    },
    serie,
    paginas: q(`SELECT ruta, COUNT(*) vistas, COUNT(DISTINCT dia || visitante) personas FROM visitas WHERE dia >= ? GROUP BY ruta ORDER BY vistas DESC LIMIT 20`, desde),
    entradas: q(`SELECT ruta, COUNT(*) n FROM visitas WHERE dia >= ? AND entrada = 1 GROUP BY ruta ORDER BY n DESC LIMIT 10`, desde),
    origenes: q(`SELECT origen, COUNT(*) n FROM visitas WHERE dia >= ? AND entrada = 1 GROUP BY origen ORDER BY n DESC LIMIT 15`, desde),
    dispositivos: q(`SELECT dispositivo nombre, COUNT(DISTINCT dia || visitante) n FROM visitas WHERE dia >= ? AND dispositivo != '' GROUP BY dispositivo ORDER BY n DESC`, desde),
    navegadores: q(`SELECT navegador nombre, COUNT(DISTINCT dia || visitante) n FROM visitas WHERE dia >= ? GROUP BY navegador ORDER BY n DESC`, desde),
    horas: q(`SELECT hora h, COUNT(*) n FROM visitas WHERE dia >= ? GROUP BY hora`, desde),
  };
}
