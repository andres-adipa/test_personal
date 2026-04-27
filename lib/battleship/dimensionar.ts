import type { Tablero } from "./types";

const DENSIDAD_OBJETIVO = 0.15;
const MIN_LADO = 8;
const MAX_LADO = 80;
const PROPORCION = 4 / 5;

export function dimensionarTablero(
  nJugadores: number,
  barcosPorJugador: number,
  tamanoBarco: number,
): Tablero {
  const celdasOcupadas = Math.max(1, nJugadores) * barcosPorJugador * tamanoBarco;
  const totalCeldas = Math.ceil(celdasOcupadas / DENSIDAD_OBJETIVO);

  let alto = Math.round(Math.sqrt(totalCeldas * PROPORCION));
  alto = Math.min(MAX_LADO, Math.max(MIN_LADO, alto));
  let ancho = Math.ceil(totalCeldas / alto);
  ancho = Math.min(MAX_LADO, Math.max(MIN_LADO, ancho));

  const ladoMin = tamanoBarco + 2;
  if (ancho < ladoMin) ancho = ladoMin;
  if (alto < ladoMin) alto = ladoMin;

  return { ancho, alto };
}
