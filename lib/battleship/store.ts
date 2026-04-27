import fs from "node:fs";
import path from "node:path";
import type { Juego } from "./types";

const DATA_DIR = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIR, "battleship.json");
// Saltar disco si estamos en serverless/contenedor con FS efímero (Vercel, Cloud Run).
const FS_EFIMERO = !!process.env.VERCEL || !!process.env.K_SERVICE;

type Store = { juegos: Map<string, Juego> };

declare global {
  var __BATTLESHIP_STORE__: Store | undefined;
}

function cargarDeDisco(): Store {
  if (FS_EFIMERO) return { juegos: new Map() };
  try {
    if (!fs.existsSync(DATA_FILE)) return { juegos: new Map() };
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const obj = JSON.parse(raw) as Record<string, Juego>;
    return { juegos: new Map(Object.entries(obj)) };
  } catch {
    return { juegos: new Map() };
  }
}

function persistirADisco(s: Store) {
  if (FS_EFIMERO) return;
  try {
    if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
    const obj: Record<string, Juego> = {};
    for (const [k, v] of s.juegos) obj[k] = v;
    fs.writeFileSync(DATA_FILE, JSON.stringify(obj));
  } catch {}
}

export const store: Store = globalThis.__BATTLESHIP_STORE__ ?? cargarDeDisco();
if (!globalThis.__BATTLESHIP_STORE__) globalThis.__BATTLESHIP_STORE__ = store;

export function getJuego(id: string): Juego | undefined {
  return store.juegos.get(id);
}

export function setJuego(j: Juego): void {
  store.juegos.set(j.id, j);
  persistirADisco(store);
}

export function listarJuegos(): Juego[] {
  return Array.from(store.juegos.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function nuevoId(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 10);
}
