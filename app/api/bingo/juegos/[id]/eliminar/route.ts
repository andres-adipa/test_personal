import { NextRequest, NextResponse } from "next/server";
import { getJuego, store } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  const email = String(body.email ?? "").trim().toLowerCase();

  const j = getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  if (email !== j.lider) {
    return NextResponse.json({ error: "Solo el líder puede eliminar" }, { status: 403 });
  }

  store.juegos.delete(id);
  return NextResponse.json({ ok: true });
}
