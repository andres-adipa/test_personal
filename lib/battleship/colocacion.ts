import type { Barco, Orientacion, Tablero } from "./types";

export function celdasDeBarco(b: Pick<Barco, "fila" | "col" | "tamano" | "orientacion">) {
  const out: { fila: number; col: number }[] = [];
  for (let i = 0; i < b.tamano; i++) {
    if (b.orientacion === "h") out.push({ fila: b.fila, col: b.col + i });
    else out.push({ fila: b.fila + i, col: b.col });
  }
  return out;
}

export function caben(
  fila: number,
  col: number,
  tamano: number,
  orientacion: Orientacion,
  tablero: Tablero,
): boolean {
  if (fila < 0 || col < 0) return false;
  if (orientacion === "h") return col + tamano <= tablero.ancho && fila < tablero.alto;
  return fila + tamano <= tablero.alto && col < tablero.ancho;
}

export function colisiona(
  candidato: Pick<Barco, "fila" | "col" | "tamano" | "orientacion">,
  otros: Barco[],
  excluirId: string | null = null,
): boolean {
  const ocupadas = new Set<string>();
  for (const b of otros) {
    if (b.id === excluirId) continue;
    for (const c of celdasDeBarco(b)) ocupadas.add(`${c.fila},${c.col}`);
  }
  for (const c of celdasDeBarco(candidato)) {
    if (ocupadas.has(`${c.fila},${c.col}`)) return true;
  }
  return false;
}

export function colocarAleatorio(
  jugadorEmail: string,
  cuantos: number,
  tamano: number,
  tablero: Tablero,
  yaPuestos: Barco[],
): Barco[] {
  const nuevos: Barco[] = [];
  const todos = [...yaPuestos];
  for (let i = 0; i < cuantos; i++) {
    let intentos = 0;
    let puesto: Barco | null = null;
    while (intentos < 200) {
      intentos++;
      const orientacion: Orientacion = Math.random() < 0.5 ? "h" : "v";
      const maxFila = orientacion === "v" ? tablero.alto - tamano : tablero.alto - 1;
      const maxCol = orientacion === "h" ? tablero.ancho - tamano : tablero.ancho - 1;
      if (maxFila < 0 || maxCol < 0) break;
      const fila = Math.floor(Math.random() * (maxFila + 1));
      const col = Math.floor(Math.random() * (maxCol + 1));
      const candidato: Barco = {
        id: Math.random().toString(36).slice(2, 10),
        jugadorEmail,
        tamano,
        fila,
        col,
        orientacion,
        prellenado: true,
      };
      if (!caben(fila, col, tamano, orientacion, tablero)) continue;
      if (colisiona(candidato, todos)) continue;
      puesto = candidato;
      todos.push(candidato);
      nuevos.push(candidato);
      break;
    }
    if (!puesto) {
      throw new Error("No se pudo colocar todos los barcos al azar — tablero muy lleno");
    }
  }
  return nuevos;
}
