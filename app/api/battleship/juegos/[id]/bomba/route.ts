import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuegoSiEstado } from "@/lib/battleship/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const fila = parseInt(body.fila, 10);
  const col = parseInt(body.col, 10);

  const j = await getJuego(id);
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

  // Auto-lanzamiento: si todos los activos ya enviaron su bomba y la sala
  // tiene autoLanzar activo, arrancamos la cuenta atrás (3-2-1).
  if (j.config.autoLanzar && !j.cuentaAtrasIniciadaAt) {
    const activos = j.jugadores.filter((p) => !p.eliminado).length;
    const conBomba = new Set(
      j.bombas.filter((b) => b.ronda === j.rondaActual).map((b) => b.email),
    ).size;
    if (activos > 0 && conBomba >= activos) {
      j.cuentaAtrasIniciadaAt = Date.now();
    }
  }

  const ok = await setJuegoSiEstado(j, "en_ronda");
  if (!ok) {
    return NextResponse.json({ error: "La ronda ya cerró" }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
