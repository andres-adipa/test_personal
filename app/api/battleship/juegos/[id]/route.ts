import { NextRequest, NextResponse } from "next/server";
import { getJuego } from "@/lib/battleship/store";
import { celdasDeBarco } from "@/lib/battleship/colocacion";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = (req.nextUrl.searchParams.get("email") ?? "").toLowerCase();
  const j = getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });

  const esLider = !!email && email === j.lider;

  const barcosVisibles = esLider
    ? j.barcos
    : j.barcos.filter((b) => b.jugadorEmail === email);

  const bombaPropiaRondaActual = j.bombas.find(
    (b) => b.email === email && b.ronda === j.rondaActual,
  ) ?? null;

  const bombasReveladas = j.estado === "revelando" || j.estado === "terminado"
    ? j.bombas
    : j.bombas.filter((b) => b.ronda < j.rondaActual);

  const totalCeldasBarcos = j.barcos.reduce((acc, b) => acc + b.tamano, 0);
  const totalHitsUnicos = new Set(j.hits.map((h) => `${h.fila},${h.col}`)).size;

  return NextResponse.json({
    id: j.id,
    titulo: j.titulo,
    lider: j.lider,
    config: j.config,
    estado: j.estado,
    tablero: j.tablero,
    rondaActual: j.rondaActual,
    jugadores: j.jugadores,
    barcos: barcosVisibles.map((b) => ({
      id: b.id,
      jugadorEmail: b.jugadorEmail,
      tamano: b.tamano,
      fila: b.fila,
      col: b.col,
      orientacion: b.orientacion,
      celdas: celdasDeBarco(b),
      hundido: j.hundidos.some((h) => h.barcoId === b.id),
    })),
    bombas: bombasReveladas,
    hits: j.hits,
    hundidos: j.hundidos,
    bombaPropiaRondaActual,
    bombasRondaActualCount: j.bombas.filter((b) => b.ronda === j.rondaActual).length,
    totalCeldasBarcos,
    totalHitsUnicos,
    startedAt: j.startedAt,
    endedAt: j.endedAt,
    esLider,
  });
}
