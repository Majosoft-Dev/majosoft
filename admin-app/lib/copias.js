// Webs de cada servidor y sus copias de seguridad automáticas (script copias-web, igual en los tres).
// El panel corre en el servidor Majosoft («apartamentos» en IONOS): ahí se llama al script directamente; en los otros dos, por SSH
// con una clave que solo puede lanzar copias-web-remoto (estado / activar / desactivar).
import { execFile } from "node:child_process";

const CLAVE = process.env.COPIAS_CLAVE || "/root/.ssh/copias_panel";

export const SERVIDORES = [
  { id: "guiadelbombero", nombre: "Guía del Bombero", ip: "217.154.107.19", uso: "Academia de bomberos y su WordPress" },
  { id: "objetivo", nombre: "Objetivo Baeza", ip: "31.70.141.235", uso: "Academia de guardias civiles y su WordPress" },
  { id: "apartamentos", nombre: "Majosoft", ip: "31.70.154.16", uso: "Webs de Majosoft y clientes: panel, Fichaje, Bambina, María Sánchez y Duna Beach", local: true },
];

function lanzar(servidor, args) {
  const [cmd, argv] = servidor.local
    ? ["/usr/local/bin/copias-web", args]
    : ["ssh", ["-i", CLAVE, "-o", "BatchMode=yes", "-o", "ConnectTimeout=8", `root@${servidor.ip}`, args.join(" ")]];
  return new Promise((resolve, reject) => {
    execFile(cmd, argv, { timeout: 20e3 }, (err, stdout, stderr) =>
      err ? reject(new Error((stderr || err.message).trim().split("\n").pop())) : resolve(stdout));
  });
}

export async function estado() {
  return Promise.all(SERVIDORES.map(async ({ local, ...s }) => {
    try {
      const webs = (await lanzar({ local, ...s }, ["estado"])).trim().split("\n").filter(Boolean).map(l => JSON.parse(l));
      return { ...s, webs };
    } catch (e) {
      return { ...s, webs: [], error: "No se pudo consultar: " + e.message };
    }
  }));
}

export async function cambiar(servidorId, web, activa) {
  const s = SERVIDORES.find(x => x.id === servidorId);
  if (!s || !/^[a-z0-9-]{1,64}$/.test(web)) throw new Error("Web desconocida");
  await lanzar(s, [activa ? "activar" : "desactivar", web]);
}
