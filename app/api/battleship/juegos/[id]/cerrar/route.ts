import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuegoSiEstado } from "@/lib/battleship/store";
import {
  REVELANDO_DURATION_MS,
  avanzarPostRevelado,
  cerrarRondaEnMemoria,
} from "@/lib/battleship/cerrarRonda";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const j = await getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  if (email !== j.lider) return NextResponse.json({ error: "Solo el líder" }, { status: 403 });
  if (j.estado !== "en_ronda") {
    return NextResponse.json({ error: "No hay ronda abierta" }, { status: 400 });
  }

  const ronda = j.rondaActual;
  const estadoPrevio = j.estado;
  cerrarRondaEnMemoria(j);
  const ok = await setJuegoSiEstado(j, estadoPrevio);
  if (!ok) {
    // Otro avance lazy ya cerró la ronda; basta con responder ok.
    return NextResponse.json({ ok: true });
  }

  // Best-effort fast path: en long-running (Cloud Run con tráfico) corre el
  // setTimeout y avanza al siguiente estado. En serverless puede no firearse —
  // el GET hace el lazy advance como respaldo.
  setTimeout(async () => {
    const fresco = await getJuego(id);
    if (!fresco) return;
    if (fresco.estado !== "revelando" || fresco.rondaActual !== ronda) return;
    avanzarPostRevelado(fresco);
    await setJuegoSiEstado(fresco, "revelando");
  }, REVELANDO_DURATION_MS);

  return NextResponse.json({ ok: true });
}
