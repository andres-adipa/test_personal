import type { DensidadMapa, Tablero } from "./types";

const MIN_LADO = 8;
const MAX_LADO = 80;
const PROPORCION = 4 / 5;

// Densidad = celdas con barco / celdas totales. Lineal, no escalada por
// cantidad de jugadores. El líder elige el preset al crear la sala.
const DENSIDAD: Record<DensidadMapa, number> = {
  denso: 0.30,
  normal: 0.22,
  tranquilo: 0.15,
};

export function dimensionarTablero(
  nJugadores: number,
  barcosPorJugador: number,
  tamanoBarco: number,
  densidad: DensidadMapa = "tranquilo",
): Tablero {
  const celdasOcupadas = Math.max(1, nJugadores) * barcosPorJugador * tamanoBarco;
  const totalCeldas = Math.ceil(celdasOcupadas / DENSIDAD[densidad]);

  let alto = Math.round(Math.sqrt(totalCeldas * PROPORCION));
  alto = Math.min(MAX_LADO, Math.max(MIN_LADO, alto));
  let ancho = Math.ceil(totalCeldas / alto);
  ancho = Math.min(MAX_LADO, Math.max(MIN_LADO, ancho));

  const ladoMin = tamanoBarco + 2;
  if (ancho < ladoMin) ancho = ladoMin;
  if (alto < ladoMin) alto = ladoMin;

  return { ancho, alto };
}
