import { NextResponse } from "next/server";
import { getJuego, store } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const j = getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  store.juegos.delete(id);
  return NextResponse.json({ ok: true });
}
