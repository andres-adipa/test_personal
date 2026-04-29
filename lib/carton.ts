import type { Cuadricula } from "./types";

// Bingo chileno: 3 filas x 9 columnas, 15 números, 12 vacíos.
// Rango total 1..90. Cada columna es una decena (col 8: 80..90).
// Cada fila tiene exactamente 5 números y 4 vacíos.
// Cada columna tiene entre 1 y 3 números.

export function rangoColumna(c: number): [number, number] {
  if (c === 0) return [1, 9];
  if (c === 8) return [80, 90];
  return [c * 10, c * 10 + 9];
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function pickN(rango: [number, number], n: number): number[] {
  const pool: number[] = [];
  for (let k = rango[0]; k <= rango[1]; k++) pool.push(k);
  return shuffle(pool).slice(0, n);
}

export function generarCarton(): Cuadricula {
  // Intento hasta obtener una matriz con cada columna >= 1.
  for (let intento = 0; intento < 200; intento++) {
    const filasConNumero: number[][] = Array.from({ length: 9 }, () => []);
    // Cada fila elige 5 de las 9 columnas.
    for (let f = 0; f < 3; f++) {
      const cols = shuffle([0, 1, 2, 3, 4, 5, 6, 7, 8]).slice(0, 5);
      for (const c of cols) filasConNumero[c].push(f);
    }
    if (filasConNumero.some((fs) => fs.length === 0)) continue;

    const celdas: Cuadricula = Array.from({ length: 3 }, () => new Array<number | null>(9).fill(null));
    for (let c = 0; c < 9; c++) {
      const filas = filasConNumero[c].slice().sort((a, b) => a - b);
      const nums = pickN(rangoColumna(c), filas.length).sort((a, b) => a - b);
      filas.forEach((f, i) => {
        celdas[f][c] = nums[i];
      });
    }
    return celdas;
  }
  throw new Error("No se pudo generar cartón después de 200 intentos");
}

export function hashCarton(c: Cuadricula): string {
  const nums: number[] = [];
  for (const fila of c) for (const cell of fila) if (cell !== null) nums.push(cell);
  return nums.slice().sort((a, b) => a - b).join("-");
}

export function generarCartonUnico(existentes: Set<string>): { carton: Cuadricula; hash: string } {
  for (let i = 0; i < 50; i++) {
    const carton = generarCarton();
    const h = hashCarton(carton);
    if (!existentes.has(h)) return { carton, hash: h };
  }
  throw new Error("No se pudo generar cartón único");
}
