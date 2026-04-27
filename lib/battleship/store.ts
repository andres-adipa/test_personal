import type { Juego } from "./types";

type Store = { juegos: Map<string, Juego> };

declare global {
  var __BATTLESHIP_STORE__: Store | undefined;
}

export const store: Store = globalThis.__BATTLESHIP_STORE__ ?? { juegos: new Map() };
if (!globalThis.__BATTLESHIP_STORE__) globalThis.__BATTLESHIP_STORE__ = store;

export function getJuego(id: string): Juego | undefined {
  return store.juegos.get(id);
}

export function setJuego(j: Juego): void {
  store.juegos.set(j.id, j);
}

export function listarJuegos(): Juego[] {
  return Array.from(store.juegos.values()).sort((a, b) => b.createdAt - a.createdAt);
}

export function nuevoId(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 10);
}
