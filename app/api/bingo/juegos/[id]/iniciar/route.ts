import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuego } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();

  const j = await getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  if (email !== j.lider) return NextResponse.json({ error: "Solo el líder puede iniciar" }, { status: 403 });
  if (j.estado === "en_curso") return NextResponse.json({ ok: true });

  // Validar que haya al menos 1 jugador y todos hayan elegido sus cartones.
  if (j.jugadores.length === 0) {
    return NextResponse.json({ error: "No hay jugadores" }, { status: 400 });
  }
  for (const p of j.jugadores) {
    const elegidos = j.cartones.filter((c) => c.jugadorEmail === p.email && c.elegido);
    if (elegidos.length !== j.cartonesPorJugador) {
      return NextResponse.json(
        { error: `${p.nombre} aún no eligió sus cartones` },
        { status: 400 },
      );
    }
  }

  j.estado = "en_curso";
  j.startedAt = Date.now();
  await setJuego(j);
  return NextResponse.json({ ok: true });
}
