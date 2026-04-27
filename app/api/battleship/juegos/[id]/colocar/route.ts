import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuego, nuevoId } from "@/lib/battleship/store";
import { caben, colisiona } from "@/lib/battleship/colocacion";
import type { Barco, Orientacion } from "@/lib/battleship/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const barcoId = body.barcoId ? String(body.barcoId) : null;
  const fila = parseInt(body.fila, 10);
  const col = parseInt(body.col, 10);
  const orientacion = body.orientacion === "v" ? "v" : "h";

  const j = getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  if (j.estado !== "colocando") {
    return NextResponse.json({ error: "Fuera de fase de colocación" }, { status: 400 });
  }
  if (!j.tablero) return NextResponse.json({ error: "Sin tablero" }, { status: 400 });
  const jugador = j.jugadores.find((p) => p.email === email);
  if (!jugador) return NextResponse.json({ error: "No estás en el juego" }, { status: 403 });
  if (jugador.listo) {
    return NextResponse.json({ error: "Ya marcaste listo, no puedes mover" }, { status: 400 });
  }

  if (Number.isNaN(fila) || Number.isNaN(col)) {
    return NextResponse.json({ error: "Coordenadas inválidas" }, { status: 400 });
  }

  const tamano = j.config.tamanoBarco;
  if (!caben(fila, col, tamano, orientacion as Orientacion, j.tablero)) {
    return NextResponse.json({ error: "Barco fuera del tablero" }, { status: 400 });
  }

  if (barcoId) {
    const barco = j.barcos.find((b) => b.id === barcoId);
    if (!barco || barco.jugadorEmail !== email) {
      return NextResponse.json({ error: "Barco no es tuyo" }, { status: 403 });
    }
    const candidato = { fila, col, tamano: barco.tamano, orientacion: orientacion as Orientacion };
    if (colisiona(candidato, j.barcos, barcoId)) {
      return NextResponse.json({ error: "Colisiona con otro barco" }, { status: 400 });
    }
    barco.fila = fila;
    barco.col = col;
    barco.orientacion = orientacion as Orientacion;
  } else {
    const propios = j.barcos.filter((b) => b.jugadorEmail === email);
    if (propios.length >= j.config.barcosPorJugador) {
      return NextResponse.json({ error: "Ya colocaste todos tus barcos" }, { status: 400 });
    }
    const nuevo: Barco = {
      id: nuevoId(),
      jugadorEmail: email,
      tamano,
      fila,
      col,
      orientacion: orientacion as Orientacion,
      prellenado: false,
    };
    if (colisiona(nuevo, j.barcos)) {
      return NextResponse.json({ error: "Colisiona con otro barco" }, { status: 400 });
    }
    j.barcos.push(nuevo);
  }

  setJuego(j);
  return NextResponse.json({ ok: true });
}
