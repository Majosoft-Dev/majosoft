#!/usr/bin/env python3
"""Junta los inventarios de piezas de UI (inv-*.json) en public/biblioteca.json.

Uso: python3 lib/biblioteca-juntar.py   (lee lib/biblioteca-inv/inv-*.json; las piezas de movimiento salen de lib/biblioteca-inv/movimiento.py)
Cada inventario puede traer { proyecto, paleta, tipografia, piezas } o { proyectos: [...], piezas }.
Las rutas de archivo se guardan relativas al Escritorio (p. ej. «Cetemet/src/...:12»).
"""
import json, os, sys, glob, re

src = sys.argv[1] if len(sys.argv) > 1 else os.path.join(os.path.dirname(__file__), "biblioteca-inv")
out = os.path.join(os.path.dirname(__file__), "..", "public", "biblioteca.json")
DESK = os.path.expanduser("~/Desktop/")
CATS = {"navegacion", "listados", "calendarios", "detalle", "formularios", "estados", "estadisticas", "movil", "avisos", "acceso", "otros"}

proyectos, piezas, ids = {}, [], set()
for f in sorted(glob.glob(os.path.join(src, "inv-*.json"))):
    d = json.load(open(f))
    meta = d.get("proyectos") or ([{k: d.get(k) for k in ("proyecto", "paleta", "tipografia", "stack", "reglas_globales")}] if d.get("proyecto") else [])
    for m in meta:
        if m.get("proyecto"):
            proyectos[m["proyecto"]] = {**proyectos.get(m["proyecto"], {}), **{k: v for k, v in m.items() if v}}
    for p in d.get("piezas", []):
        p.setdefault("proyecto", d.get("proyecto", "?"))
        p.setdefault("stack", d.get("stack", ""))
        if p.get("categoria") not in CATS:
            p["categoria"] = "otros"
        base = re.sub(r"[^a-z0-9-]", "-", (p.get("id") or p.get("nombre", "pieza")).lower())
        pid, n = base, 2
        while pid in ids:
            pid, n = f"{base}-{n}", n + 1
        ids.add(pid)
        p["id"] = pid
        p["archivos"] = [a.replace(DESK, "") for a in p.get("archivos", [])]
        for k in ("html", "css", "js", "descripcion", "cuando_usar"):
            p[k] = p.get(k) or ""
        p["reglas"] = p.get("reglas") or []
        piezas.append(p)

# Grupos (selectores, login, animaciones…): una pieza puede estar en varios; el primero es el principal.
# Se editan a mano en lib/biblioteca-grupos.json. Lo que tenga @keyframes entra solo en «Animaciones».
GRUPOS = json.load(open(os.path.join(os.path.dirname(__file__), "biblioteca-grupos.json")))
for p in piezas:
    p["grupos"] = [k for k, g in GRUPOS.items() if p["id"] in g["piezas"]]
    if "animaciones" in GRUPOS and not p["grupos"] and re.search(r"@keyframes|animation\s*:", p["css"]):
        p["grupos"].append("animaciones")
    if not p["grupos"]:
        print("Sin grupo:", p["id"])
grupos = [{"id": k, **{c: g.get(c, "") for c in ("titulo", "familia", "descripcion", "portada")}, "directo": bool(g.get("directo")), "conjuntos": g.get("conjuntos", [])} for k, g in GRUPOS.items()]

json.dump({"proyectos": list(proyectos.values()), "grupos": grupos, "piezas": piezas}, open(out, "w"), ensure_ascii=False)
print(f"{len(piezas)} piezas de {len(proyectos)} proyectos → {os.path.normpath(out)}")
