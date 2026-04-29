export type StatsJugador = { hits: number; hundimientos: number };

export type ItemPodio = {
  jugador: { email: string; nombre: string; eliminado: boolean };
  posicion: number;
  medalla: "🥇" | "🥈" | "🥉" | null;
  stats: StatsJugador;
  empate?: boolean; // true cuando comparte primer puesto con otro(s)
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

  // Detectar empate en el primer puesto:
  // - Si el primero está vivo, no hay empate (ganador único).
  // - Si el primero está eliminado, son empate todos los eliminados que cayeron
  //   en la misma ronda final.
  const empatadosEmails = new Set<string>();
  if (ordenado.length > 0) {
    const primero = ordenado[0];
    if (primero.eliminado) {
      const rondaPrimero = cayoEnRonda.get(primero.email);
      if (rondaPrimero !== undefined) {
        for (const j of ordenado) {
          if (j.eliminado && cayoEnRonda.get(j.email) === rondaPrimero) {
            empatadosEmails.add(j.email);
          } else {
            break;
          }
        }
      }
    }
  }
  const hayEmpate = empatadosEmails.size >= 2;

  return ordenado.slice(0, Math.max(3, empatadosEmails.size)).map((j, i) => {
    const enEmpate = hayEmpate && empatadosEmails.has(j.email);
    return {
      jugador: j,
      posicion: enEmpate ? 1 : i + 1,
      medalla: enEmpate ? "🥇" : i < 3 ? MEDALLAS[i] : null,
      stats: statsPorJugador.get(j.email) ?? { hits: 0, hundimientos: 0 },
      empate: enEmpate,
    };
  });
}
