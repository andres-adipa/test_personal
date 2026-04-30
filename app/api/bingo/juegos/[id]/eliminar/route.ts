import { NextResponse } from "next/server";
import { eliminarJuego, limpiarMarcasJuego } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await eliminarJuego(id);
  if (!ok) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  await limpiarMarcasJuego(id);
  return NextResponse.json({ ok: true });
}
