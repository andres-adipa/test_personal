import type { Cuadricula, Patron } from "./types";

export const PATRONES: {
  key: Patron;
  label: string;
  descripcion: string;
  requiere2Cartones?: boolean;
}[] = [
  { key: "terna", label: "Terna", descripcion: "3 números en una misma línea" },
  { key: "linea", label: "Línea", descripcion: "Una fila completa (5 números)" },
  { key: "carton_lleno", label: "Cartón lleno", descripcion: "Los 15 números de tu cartón" },
  {
    key: "dos_cartones_llenos",
    label: "2 cartones llenos",
    descripcion: "Tus 2 cartones completos (30 números)",
    requiere2Cartones: true,
  },
];

export type ChequeoPatron = {
  gana: boolean;
  faltantesMin: number;
};

function numerosDeCarton(c: Cuadricula): number[] {
  const r: number[] = [];
  for (const fila of c) for (const n of fila) if (n !== null) r.push(n);
  return r;
}

function numerosDeFila(fila: (number | null)[]): number[] {
  return fila.filter((n): n is number => n !== null);
}

// Chequeo por un solo cartón (para terna, linea, carton_lleno).
export function chequearPatron(
  carton: Cuadricula,
  cantados: Set<number>,
  patron: Patron,
): ChequeoPatron {
  if (patron === "terna") {
    // Cualquier fila con ≥3 números marcados gana. Faltantes = max(0, 3 - marcados) min entre filas.
    let faltantesMin = Infinity;
    for (const fila of carton) {
      const nums = numerosDeFila(fila);
      const marcados = nums.filter((n) => cantados.has(n)).length;
      const faltan = Math.max(0, 3 - marcados);
      if (faltan < faltantesMin) faltantesMin = faltan;
      if (faltan === 0) return { gana: true, faltantesMin: 0 };
    }
    return { gana: false, faltantesMin: faltantesMin === Infinity ? 3 : faltantesMin };
  }

  if (patron === "linea") {
    let faltantesMin = Infinity;
    for (const fila of carton) {
      const nums = numerosDeFila(fila);
      const faltan = nums.filter((n) => !cantados.has(n)).length;
      if (faltan < faltantesMin) faltantesMin = faltan;
      if (faltan === 0) return { gana: true, faltantesMin: 0 };
    }
    return { gana: false, faltantesMin: faltantesMin === Infinity ? 5 : faltantesMin };
  }

  if (patron === "carton_lleno") {
    const todos = numerosDeCarton(carton);
    const faltan = todos.filter((n) => !cantados.has(n)).length;
    return { gana: faltan === 0, faltantesMin: faltan };
  }

  // Para dos_cartones_llenos individualmente solo chequeamos que este cartón esté lleno.
  if (patron === "dos_cartones_llenos") {
    const todos = numerosDeCarton(carton);
    const faltan = todos.filter((n) => !cantados.has(n)).length;
    return { gana: faltan === 0, faltantesMin: faltan };
  }

  return { gana: false, faltantesMin: 0 };
}

// Chequeo cross-cartón (para "dos cartones llenos"): todos los cartones del jugador deben estar llenos.
export function chequearDosCartonesLlenos(
  cartones: Cuadricula[],
  cantados: Set<number>,
): ChequeoPatron {
  let totalFaltantes = 0;
  for (const c of cartones) {
    const nums = numerosDeCarton(c);
    totalFaltantes += nums.filter((n) => !cantados.has(n)).length;
  }
  return { gana: totalFaltantes === 0, faltantesMin: totalFaltantes };
}

// Por ahora el resaltado visual del patrón está deshabilitado: los patrones actuales
// (terna/línea/lleno) no se benefician de resaltar celdas estáticas. La ayuda se muestra
// como texto "Objetivo: ..." en la UI del jugador cuando mostrarPatron está activo.
export function celdasDelPatron(_carton: Cuadricula, _patron: Patron): boolean[][] {
  return Array.from({ length: 3 }, () => new Array(9).fill(false));
}
