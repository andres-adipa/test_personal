import { NextRequest, NextResponse } from "next/server";
import { getJuego, listarMarcasJuego } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = (req.nextUrl.searchParams.get("email") ?? "").toLowerCase();
  // Las marcas viven en su propia tabla (ver lib/store.ts). Consultamos en
  // paralelo con el juego para no agregar latencia al GET.
  const [j, marcas] = await Promise.all([getJuego(id), listarMarcasJuego(id)]);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });

  const esLider = !!email && email === j.lider;

  const cartones = esLider
    ? j.cartones.filter((c) => c.elegido)
    : j.cartones.filter((c) => c.ofrecidoA === email || c.jugadorEmail === email);

  const marcasVisibles = esLider
    ? marcas
    : marcas.filter((m) => {
        const carton = j.cartones.find((c) => c.id === m.cartonId);
        return carton?.jugadorEmail === email;
      });

  const sorteosVisibles =
    !esLider && !j.historialVisibleJugador ? j.sorteos.slice(-1) : j.sorteos;

  // Sólo exponemos los números no cantados cuando el juego terminó.
  const numerosNoCantados =
    j.estado === "terminado" ? j.numerosBarajados.slice(j.indiceActual + 1) : [];

  return NextResponse.json({
    id: j.id,
    titulo: j.titulo,
    lider: j.lider,
    patrones: j.patrones,
    mostrarPatron: j.mostrarPatron,
    historialVisibleJugador: j.historialVisibleJugador,
    avisarNumerosPasados: !!j.avisarNumerosPasados,
    cartonesPorJugador: j.cartonesPorJugador,
    estado: j.estado,
    indiceActual: j.indiceActual,
    cantadosCount: j.sorteos.length,
    jugadores: j.jugadores,
    cartones,
    sorteos: sorteosVisibles,
    numerosNoCantados,
    bingos: j.bingos,
    ganadores: j.ganadores,
    startedAt: j.startedAt,
    endedAt: j.endedAt,
    esLider,
    marcas: marcasVisibles,
  });
}
