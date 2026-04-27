import { NextRequest, NextResponse } from "next/server";
import { listarJuegos, setJuego, nuevoId } from "@/lib/battleship/store";
import type { Juego, ResumenJuego } from "@/lib/battleship/types";

export const dynamic = "force-dynamic";

export async function GET() {
  const juegos: ResumenJuego[] = listarJuegos().map((j) => ({
    id: j.id,
    titulo: j.titulo,
    lider: j.lider,
    estado: j.estado,
    jugadores: j.jugadores.length,
    config: j.config,
    createdAt: j.createdAt,
  }));
  return NextResponse.json(juegos);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const titulo = String(body.titulo ?? "").trim();
  const lider = String(body.lider ?? "").trim().toLowerCase();
  const barcosPorJugador = clamp(parseInt(body.barcosPorJugador, 10) || 1, 1, 5);
  const tamanoBarco = clamp(parseInt(body.tamanoBarco, 10) || 3, 2, 6);
  const prellenarBarcos = body.prellenarBarcos !== false;

  if (!titulo || !lider) {
    return NextResponse.json({ error: "Título y email del líder son obligatorios" }, { status: 400 });
  }

  const id = nuevoId();
  const juego: Juego = {
    id,
    titulo,
    lider,
    config: { barcosPorJugador, tamanoBarco, prellenarBarcos },
    estado: "lobby",
    tablero: null,
    jugadores: [],
    barcos: [],
    bombas: [],
    hits: [],
    hundidos: [],
    rondaActual: 0,
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
  };
  setJuego(juego);
  return NextResponse.json({ id });
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}
