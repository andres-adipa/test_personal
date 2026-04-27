import { NextRequest, NextResponse } from "next/server";
import { getJuego } from "@/lib/battleship/store";
import { celdasDeBarco } from "@/lib/battleship/colocacion";
import type { EventoHit, EventoRonda } from "@/lib/battleship/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = (req.nextUrl.searchParams.get("email") ?? "").toLowerCase();
  const j = await getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });

  const esLider = !!email && email === j.lider;
  const jugador = j.jugadores.find((p) => p.email === email) ?? null;
  const estoyEliminado = !!jugador?.eliminado;
  const espectadorActivo =
    estoyEliminado && j.config.permitirEspectador && j.estado !== "terminado";
  // Si el modo "líder jugador" está activo y el líder está vivo, juega como
  // cualquier otro: ve sólo sus barcos. Cuando lo eliminan, vuelve a ver todo.
  const liderJuegaVivo =
    esLider && !!j.config.liderJugador && !!jugador && !jugador.eliminado;
  const verTodo =
    (esLider && !liderJuegaVivo) || espectadorActivo || j.estado === "terminado";

  // El jugador siempre ve sus barcos; además, todo barco hundido es público
  // para todos (así nadie se estanca buscando un barco ya muerto).
  const barcosVisibles = verTodo
    ? j.barcos
    : j.barcos.filter(
        (b) => b.jugadorEmail === email || j.hundidos.some((h) => h.barcoId === b.id),
      );

  const bombaPropiaRondaActual =
    j.bombas.find((b) => b.email === email && b.ronda === j.rondaActual) ?? null;

  // Líder/espectador ven todas las bombas, incluyendo las pendientes de la ronda actual.
  // Jugador no ve bombas de otros (sólo las suyas).
  const bombasRevReales =
    j.estado === "revelando" || j.estado === "terminado"
      ? j.bombas
      : verTodo
        ? j.bombas
        : j.bombas.filter((b) => b.ronda < j.rondaActual);

  const totalCeldasBarcos = j.barcos.reduce((acc, b) => acc + b.tamano, 0);
  const totalHitsUnicos = new Set(j.hits.map((h) => `${h.fila},${h.col}`)).size;

  // Construir set de celdas visibles para el jugador:
  // - lo que él disparó (siempre en "conocidas")
  // - lo que heredó al hundir (también está en "conocidas" si robaInformacion=ON)
  // - celdas donde le pegaron a sus barcos (víctima)
  const celdasVisibles = new Set<string>();
  for (const k of jugador?.conocidas ?? []) celdasVisibles.add(k);
  for (const h of j.hits) {
    if (!h.barcoId) continue;
    const b = j.barcos.find((x) => x.id === h.barcoId);
    if (b?.jugadorEmail === email) celdasVisibles.add(`${h.fila},${h.col}`);
  }

  // Filtro de hits y bombas según rol
  const hitsVisibles = verTodo
    ? j.hits
    : j.hits.filter((h) => celdasVisibles.has(`${h.fila},${h.col}`));

  const bombasFiltradas = verTodo
    ? bombasRevReales
    : bombasRevReales.filter((b) => b.email === email);

  const bombasReveladas = bombasFiltradas.map((b) => ({
    ...b,
    nombre: j.jugadores.find((p) => p.email === b.email)?.nombre ?? b.email,
  }));

  // Filtro de eventos por rol
  let eventos: EventoRonda[];
  if (verTodo) {
    eventos = j.eventosPorRonda;
  } else {
    eventos = j.eventosPorRonda.map((ev) => ({
      ronda: ev.ronda,
      hits: ev.hits.filter(
        (h: EventoHit) => h.atacante === email || h.victima === email,
      ),
      fails: ev.fails.filter((f) => f.atacante === email),
      herencias: (ev.herencias ?? []).filter((h) => h.hundidor === email),
      eliminados: ev.eliminados,
    }));
  }

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
    hits: hitsVisibles,
    hundidos: j.hundidos,
    eventosPorRonda: eventos,
    bombaPropiaRondaActual,
    bombasRondaActualCount: j.bombas.filter((b) => b.ronda === j.rondaActual).length,
    totalCeldasBarcos,
    totalHitsUnicos,
    startedAt: j.startedAt,
    endedAt: j.endedAt,
    esLider,
    estoyEliminado,
    esEspectador: espectadorActivo,
  });
}
