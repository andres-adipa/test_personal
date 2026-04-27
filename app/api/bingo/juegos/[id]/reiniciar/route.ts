import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuego, barajar99 } from "@/lib/store";

export const dynamic = "force-dynamic";

// Reinicia la ronda: mantiene jugadores, regenera cartones y re-baraja números.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();

  const j = await getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  if (email !== j.lider) return NextResponse.json({ error: "Solo el líder puede reiniciar" }, { status: 403 });

  j.cartones = [];
  j.sorteos = [];
  j.marcas = [];
  j.bingos = [];
  j.ganadores = [];
  j.indiceActual = -1;
  j.numerosBarajados = barajar99();
  j.estado = "lobby";
  j.startedAt = null;
  j.endedAt = null;
  // Los jugadores se mantienen pero sus cartones se borran → deben re-elegir.
  await setJuego(j);
  return NextResponse.json({ ok: true });
}
