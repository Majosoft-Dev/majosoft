// Pinta el menú lateral antes del primer pintado de la página (se carga con blocking="render"),
// para que al cambiar de página el menú no desaparezca un instante durante la transición.
import { mountShell } from "/admin/panel.js";
const tramo = location.pathname.replace(/^\/admin\/?/, "").replace(/\.html$/, "").split("/")[0];
await mountShell(tramo === "" ? "home" : tramo === "tareas" ? "calendario" : tramo);
