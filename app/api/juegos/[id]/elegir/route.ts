import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuego } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const cartonIds: string[] = Array.isArray(body.cartonIds) ? body.cartonIds : [];

  const j = getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  if (j.estado !== "eligiendo" && j.estado !== "lobby") {
    return NextResponse.json({ error: "Ya no se puede elegir" }, { status: 400 });
  }
  if (cartonIds.length !== j.cartonesPorJugador) {
    return NextResponse.json(
      { error: `Debes elegir exactamente ${j.cartonesPorJugador} cartón(es)` },
      { status: 400 },
    );
  }

  const ofrecidos = j.cartones.filter((c) => c.ofrecidoA === email);
  const elegidos = ofrecidos.filter((c) => cartonIds.includes(c.id));
  if (elegidos.length !== cartonIds.length) {
    return NextResponse.json({ error: "Algún cartón no está disponible para ti" }, { status: 400 });
  }

  // Marcar los elegidos y descartar los no elegidos (se remueven del array).
  j.cartones = j.cartones.filter((c) => c.ofrecidoA !== email || cartonIds.includes(c.id));
  for (let i = 0, slot = 1; i < j.cartones.length; i++) {
    const c = j.cartones[i];
    if (c.ofrecidoA === email && cartonIds.includes(c.id)) {
      c.jugadorEmail = email;
      c.elegido = true;
      c.slot = (slot as 1 | 2);
      slot = slot + 1 > 2 ? 1 : slot + 1;
    }
  }

  setJuego(j);
  return NextResponse.json({ ok: true });
}
