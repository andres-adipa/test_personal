import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuego } from "@/lib/battleship/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const nombre = String(body.nombre ?? "").trim();
  if (!email || !nombre) {
    return NextResponse.json({ error: "Nombre y email son obligatorios" }, { status: 400 });
  }
  const j = await getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  if (j.estado !== "lobby") {
    return NextResponse.json({ error: "El juego ya empezó" }, { status: 400 });
  }
  const existente = j.jugadores.find((p) => p.email === email);
  if (existente) {
    existente.nombre = nombre;
  } else {
    j.jugadores.push({ email, nombre, joinedAt: Date.now(), eliminado: false, conocidas: [] });
  }
  await setJuego(j);
  return NextResponse.json({ ok: true });
}
