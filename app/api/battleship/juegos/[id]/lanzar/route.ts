import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuego } from "@/lib/battleship/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const j = getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  if (email !== j.lider) return NextResponse.json({ error: "Solo el líder" }, { status: 403 });
  if (j.estado !== "colocando") {
    return NextResponse.json({ error: "No está en fase de colocación" }, { status: 400 });
  }
  if (j.barcos.length === 0) {
    return NextResponse.json({ error: "No hay barcos colocados" }, { status: 400 });
  }
  j.estado = "en_ronda";
  j.rondaActual = 1;
  setJuego(j);
  return NextResponse.json({ ok: true });
}
