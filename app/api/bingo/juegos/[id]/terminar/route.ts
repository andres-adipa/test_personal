import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuego } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();

  const j = getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  if (email !== j.lider) {
    return NextResponse.json({ error: "Solo el líder puede terminar" }, { status: 403 });
  }
  if (j.estado !== "en_curso") {
    return NextResponse.json({ error: "El juego no está en curso" }, { status: 400 });
  }

  j.estado = "terminado";
  j.endedAt = Date.now();
  setJuego(j);
  return NextResponse.json({ ok: true });
}
