export type StatsJugador = { hits: number; hundimientos: number };

export type ItemPodio = {
  jugador: { email: string; nombre: string; eliminado: boolean };
  posicion: number;
  medalla: "🥇" | "🥈" | "🥉" | null;
  stats: StatsJugador;
};

const MEDALLAS = ["🥇", "🥈", "🥉"] as const;

export function calcularPodio(
  jugadores: { email: string; nombre: string; eliminado: boolean }[],
  eventosPorRonda: { ronda: number; eliminados: string[] }[],
  statsPorJugador: Map<string, StatsJugador>,
): ItemPodio[] {
  // Ronda en la que cayó cada jugador eliminado
  const cayoEnRonda = new Map<string, number>();
  for (const ev of eventosPorRonda) {
    for (const elim of ev.eliminados) {
      if (!cayoEnRonda.has(elim)) cayoEnRonda.set(elim, ev.ronda);
    }
  }

  const ordenado = [...jugadores].sort((a, b) => {
    // Vivos antes que eliminados
    if (a.eliminado !== b.eliminado) return a.eliminado ? 1 : -1;
    // Ambos eliminados: el que cayó más tarde queda mejor
    if (a.eliminado && b.eliminado) {
      const ra = cayoEnRonda.get(a.email) ?? 0;
      const rb = cayoEnRonda.get(b.email) ?? 0;
      if (ra !== rb) return rb - ra;
    }
    // Desempate: hundimientos, luego hits
    const sa = statsPorJugador.get(a.email) ?? { hits: 0, hundimientos: 0 };
    const sb = statsPorJugador.get(b.email) ?? { hits: 0, hundimientos: 0 };
    if (sb.hundimientos !== sa.hundimientos) return sb.hundimientos - sa.hundimientos;
    return sb.hits - sa.hits;
  });

  return ordenado.slice(0, 3).map((j, i) => ({
    jugador: j,
    posicion: i + 1,
    medalla: i < 3 ? MEDALLAS[i] : null,
    stats: statsPorJugador.get(j.email) ?? { hits: 0, hundimientos: 0 },
  }));
}
