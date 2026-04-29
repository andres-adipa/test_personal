import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuegoSiEstado } from "@/lib/battleship/store";
import { celdasDeBarco } from "@/lib/battleship/colocacion";
import {
  COUNTDOWN_DURATION_MS,
  REVELANDO_DURATION_MS,
  avanzarPostRevelado,
  cerrarRondaEnMemoria,
} from "@/lib/battleship/cerrarRonda";
import type {
  EventoHit,
  EventoHitPublico,
  EventoRonda,
} from "@/lib/battleship/types";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const email = (req.nextUrl.searchParams.get("email") ?? "").toLowerCase();
  const j = await getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });

  // ---------- Lazy state advance (bug fix: serverless setTimeout no siempre corre)
  // Usa UPDATE condicional para evitar races: si dos GETs llegan a la vez,
  // sólo uno logra avanzar el estado.
  if (
    j.estado === "en_ronda" &&
    j.config.autoLanzar &&
    j.cuentaAtrasIniciadaAt &&
    Date.now() - j.cuentaAtrasIniciadaAt >= COUNTDOWN_DURATION_MS
  ) {
    const original = j.estado;
    cerrarRondaEnMemoria(j);
    const ok = await setJuegoSiEstado(j, original);
    if (!ok) {
      // Otro request ganó la carrera. Recargar estado fresco.
      const fresco = await getJuego(id);
      if (fresco) Object.assign(j, fresco);
    }
  }
  if (
    j.estado === "revelando" &&
    j.revelandoStartedAt &&
    Date.now() - j.revelandoStartedAt >= REVELANDO_DURATION_MS
  ) {
    const original = j.estado;
    if (avanzarPostRevelado(j)) {
      const ok = await setJuegoSiEstado(j, original);
      if (!ok) {
        const fresco = await getJuego(id);
        if (fresco) Object.assign(j, fresco);
      }
    }
  }

  const esLider = !!email && email === j.lider;
  const jugador = j.jugadores.find((p) => p.email === email) ?? null;
  const estoyEliminado = !!jugador?.eliminado;
  const espectadorActivo =
    estoyEliminado && j.config.permitirEspectador && j.estado !== "terminado";
  const liderJuegaVivo =
    esLider && !!j.config.liderJugador && !!jugador && !jugador.eliminado;
  const verTodo =
    (esLider && !liderJuegaVivo) || espectadorActivo || j.estado === "terminado";

  const barcosVisibles = verTodo
    ? j.barcos
    : j.barcos.filter(
        (b) => b.jugadorEmail === email || j.hundidos.some((h) => h.barcoId === b.id),
      );

  const bombaPropiaRondaActual =
    j.bombas.find((b) => b.email === email && b.ronda === j.rondaActual) ?? null;

  const bombasRevReales =
    j.estado === "revelando" || j.estado === "terminado"
      ? j.bombas
      : verTodo
        ? j.bombas
        : j.bombas.filter((b) => b.ronda < j.rondaActual);

  const totalCeldasBarcos = j.barcos.reduce((acc, b) => acc + b.tamano, 0);
  const totalHitsUnicos = new Set(j.hits.map((h) => `${h.fila},${h.col}`)).size;

  const celdasVisibles = new Set<string>();
  for (const k of jugador?.conocidas ?? []) celdasVisibles.add(k);
  for (const h of j.hits) {
    if (!h.barcoId) continue;
    const b = j.barcos.find((x) => x.id === h.barcoId);
    if (b?.jugadorEmail === email) celdasVisibles.add(`${h.fila},${h.col}`);
  }

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

  // Filtro de eventos por rol. Siempre adjuntamos totales globales (sin
  // spoiler de coordenadas) para que el banner de "Resultados" pueda mostrar
  // el conteo real de la ronda.
  const enriquecer = (ev: EventoRonda) => ({
    totalHits: ev.hits.length,
    totalFails: (ev.fails ?? []).length,
    totalDesperdicios: (ev.desperdicios ?? []).length,
  });

  let eventos: EventoRonda[];
  if (verTodo) {
    eventos = j.eventosPorRonda.map((ev) => ({
      ...ev,
      desperdicios: ev.desperdicios ?? [],
      ...enriquecer(ev),
    }));
  } else {
    eventos = j.eventosPorRonda.map((ev) => {
      const hitsInvolucrado = ev.hits.filter(
        (h: EventoHit) => h.atacante === email || h.victima === email,
      );
      const hitsPublicos: EventoHitPublico[] = ev.hits
        .filter((h: EventoHit) => h.atacante !== email && h.victima !== email)
        .map((h) => ({
          atacanteNombre: h.atacanteNombre,
          victimaNombre: h.victimaNombre,
          hundeBarco: h.hundeBarco,
        }));
      return {
        ronda: ev.ronda,
        hits: hitsInvolucrado,
        fails: ev.fails.filter((f) => f.atacante === email),
        desperdicios: (ev.desperdicios ?? []).filter((d) => d.atacante === email),
        herencias: (ev.herencias ?? []).filter((h) => h.hundidor === email),
        eliminados: ev.eliminados,
        hitsPublicos,
        ...enriquecer(ev),
      };
    });
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
    revelandoStartedAt: j.revelandoStartedAt,
    cuentaAtrasIniciadaAt: j.cuentaAtrasIniciadaAt,
    esLider,
    estoyEliminado,
    esEspectador: espectadorActivo,
  });
}
