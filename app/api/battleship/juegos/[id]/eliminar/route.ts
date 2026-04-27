import { NextResponse } from "next/server";
import { eliminarJuego } from "@/lib/battleship/store";

export const dynamic = "force-dynamic";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ok = await eliminarJuego(id);
  if (!ok) return NextResponse.json({ error: "Sala no existe" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
