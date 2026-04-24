// Store en memoria. Funciona mientras el servidor de Next.js esté vivo.
// Se pierde al reiniciar `npm run dev` — perfecto para MVP local.

import type { Juego } from "./types";

type Store = {
  juegos: Map<string, Juego>;
};

declare global {
  var __BINGO_STORE__: Store | undefined;
}

export const store: Store = globalThis.__BINGO_STORE__ ?? {
  juegos: new Map(),
};

if (!globalThis.__BINGO_STORE__) {
  globalThis.__BINGO_STORE__ = store;
}

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

// Baraja 1..99
export function barajar99(): number[] {
  const a: number[] = [];
  for (let i = 1; i <= 99; i++) a.push(i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
