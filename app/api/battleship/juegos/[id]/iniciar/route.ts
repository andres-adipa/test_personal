import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuego } from "@/lib/battleship/store";
import { dimensionarTablero } from "@/lib/battleship/dimensionar";
import { colocarAleatorio } from "@/lib/battleship/colocacion";
import type { Barco } from "@/lib/battleship/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const j = await getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  if (email !== j.lider) return NextResponse.json({ error: "Solo el líder" }, { status: 403 });
  if (j.estado !== "lobby") return NextResponse.json({ error: "Ya iniciado" }, { status: 400 });
  if (j.jugadores.length === 0) {
    return NextResponse.json({ error: "Necesitas al menos 1 jugador" }, { status: 400 });
  }

  const tablero = dimensionarTablero(
    j.jugadores.length,
    j.config.barcosPorJugador,
    j.config.tamanoBarco,
    j.config.densidad ?? "tranquilo",
  );

  const barcos: Barco[] = [];
  for (const jug of j.jugadores) {
    const nuevos = colocarAleatorio(
      jug.email,
      j.config.barcosPorJugador,
      j.config.tamanoBarco,
      tablero,
      barcos,
    );
    barcos.push(...nuevos);
  }

  j.tablero = tablero;
  j.barcos = barcos;
  j.estado = "en_ronda";
  j.rondaActual = 1;
  j.startedAt = Date.now();
  j.revelandoStartedAt = null;
  j.cuentaAtrasIniciadaAt = null;
  for (const p of j.jugadores) p.eliminado = false;
  await setJuego(j);
  return NextResponse.json({ ok: true });
}
