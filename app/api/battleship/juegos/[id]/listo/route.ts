import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuego } from "@/lib/battleship/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const listo = body.listo !== false;

  const j = getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  if (j.estado !== "colocando") {
    return NextResponse.json({ error: "Fuera de fase de colocación" }, { status: 400 });
  }
  const jugador = j.jugadores.find((p) => p.email === email);
  if (!jugador) return NextResponse.json({ error: "No estás en el juego" }, { status: 403 });

  const propios = j.barcos.filter((b) => b.jugadorEmail === email);
  if (listo && propios.length < j.config.barcosPorJugador) {
    return NextResponse.json(
      { error: `Te faltan barcos por colocar (${propios.length}/${j.config.barcosPorJugador})` },
      { status: 400 },
    );
  }

  jugador.listo = listo;
  setJuego(j);
  return NextResponse.json({ ok: true });
}
