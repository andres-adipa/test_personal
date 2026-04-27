import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuego } from "@/lib/battleship/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const fila = parseInt(body.fila, 10);
  const col = parseInt(body.col, 10);

  const j = getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  if (j.estado !== "en_ronda") {
    return NextResponse.json({ error: "No estamos en ronda activa" }, { status: 400 });
  }
  if (!j.tablero) return NextResponse.json({ error: "Sin tablero" }, { status: 400 });
  const jugador = j.jugadores.find((p) => p.email === email);
  if (!jugador) return NextResponse.json({ error: "No estás en el juego" }, { status: 403 });
  if (jugador.eliminado) {
    return NextResponse.json({ error: "Estás eliminado" }, { status: 403 });
  }
  if (Number.isNaN(fila) || Number.isNaN(col) || fila < 0 || col < 0 || fila >= j.tablero.alto || col >= j.tablero.ancho) {
    return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
  }
  const previa = j.bombas.find((b) => b.email === email && b.ronda === j.rondaActual);
  if (previa) {
    previa.fila = fila;
    previa.col = col;
    previa.lanzadaAt = Date.now();
  } else {
    j.bombas.push({ email, fila, col, ronda: j.rondaActual, lanzadaAt: Date.now() });
  }
  setJuego(j);
  return NextResponse.json({ ok: true });
}
