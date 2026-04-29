import { celdasDeBarco } from "./colocacion";
import type {
  EventoDesperdicio,
  EventoFail,
  EventoHerencia,
  EventoHit,
  Juego,
} from "./types";

// Aplica la lógica de cierre de ronda sobre el objeto Juego (mutación in-place).
// Devuelve `todosBarcosHundidos` para que el llamador decida si pasa a "terminado"
// más adelante. NO escribe a la base de datos — el caller persiste con setJuego.
export function cerrarRondaEnMemoria(j: Juego): { todosBarcosHundidos: boolean } {
  const ronda = j.rondaActual;
  const bombasRonda = j.bombas.filter((b) => b.ronda === ronda);

  // Celdas impactadas ANTES de esta ronda (fijo). Disparar acá = desperdicio.
  const celdasImpactadasAntes = new Set(j.hits.map((h) => `${h.fila},${h.col}`));
  // Celdas impactadas DURANTE esta ronda (crece). No son desperdicio: dos
  // jugadores pudieron tirar a la misma celda en simultáneo.
  const celdasYaImpactadas = new Set(celdasImpactadasAntes);

  const celdaABarco = new Map<string, string>();
  for (const barco of j.barcos) {
    for (const c of celdasDeBarco(barco)) {
      celdaABarco.set(`${c.fila},${c.col}`, barco.id);
    }
  }

  const hitsEvento: EventoHit[] = [];
  const failsEvento: EventoFail[] = [];
  const desperdiciosEvento: EventoDesperdicio[] = [];
  const herenciasEvento: EventoHerencia[] = [];

  for (const bomba of bombasRonda.sort((a, b) => a.lanzadaAt - b.lanzadaAt)) {
    const key = `${bomba.fila},${bomba.col}`;

    const atacanteJug = j.jugadores.find((p) => p.email === bomba.email);
    if (atacanteJug) {
      if (!atacanteJug.conocidas) atacanteJug.conocidas = [];
      if (!atacanteJug.conocidas.includes(key)) atacanteJug.conocidas.push(key);
    }

    // Desperdicio real: la celda ya estaba impactada en una RONDA PREVIA
    if (celdasImpactadasAntes.has(key)) {
      const atacante = j.jugadores.find((p) => p.email === bomba.email);
      desperdiciosEvento.push({
        atacante: bomba.email,
        atacanteNombre: atacante?.nombre ?? bomba.email,
      });
      continue;
    }

    const barcoId = celdaABarco.get(key) ?? null;
    // Sólo registrar hit en j.hits una vez por celda (evita duplicados cuando
    // dos jugadores caen en la misma celda esta ronda).
    if (!celdasYaImpactadas.has(key)) {
      j.hits.push({ fila: bomba.fila, col: bomba.col, ronda, barcoId });
      celdasYaImpactadas.add(key);
    }

    if (!barcoId) {
      const atacante = j.jugadores.find((p) => p.email === bomba.email);
      failsEvento.push({
        atacante: bomba.email,
        atacanteNombre: atacante?.nombre ?? bomba.email,
        fila: bomba.fila,
        col: bomba.col,
      });
      continue;
    }

    const barco = j.barcos.find((b) => b.id === barcoId);
    if (!barco) continue;

    const celdas = celdasDeBarco(barco);
    const yaHundido = j.hundidos.some((h) => h.barcoId === barcoId);
    const todasImpactadas = celdas.every((c) => celdasYaImpactadas.has(`${c.fila},${c.col}`));
    const hundeBarco = !yaHundido && todasImpactadas;
    if (hundeBarco) j.hundidos.push({ barcoId, ronda });

    const atacante = j.jugadores.find((p) => p.email === bomba.email);
    const victima = j.jugadores.find((p) => p.email === barco.jugadorEmail);
    hitsEvento.push({
      atacante: bomba.email,
      atacanteNombre: atacante?.nombre ?? bomba.email,
      victima: barco.jugadorEmail,
      victimaNombre: victima?.nombre ?? barco.jugadorEmail,
      barcoId,
      fila: bomba.fila,
      col: bomba.col,
      hundeBarco,
    });
  }

  if (j.config.robaInformacion) {
    const hundidosEstaRonda = j.hundidos.filter((h) => h.ronda === ronda);
    for (const hundimiento of hundidosEstaRonda) {
      const barco = j.barcos.find((b) => b.id === hundimiento.barcoId);
      if (!barco) continue;
      const victima = j.jugadores.find((p) => p.email === barco.jugadorEmail);
      const heredadas = victima?.conocidas ?? [];
      if (heredadas.length === 0) continue;

      const hundidoresEmails = new Set<string>();
      for (const h of hitsEvento) {
        if (h.barcoId === hundimiento.barcoId) hundidoresEmails.add(h.atacante);
      }
      for (const emailH of hundidoresEmails) {
        const hundidor = j.jugadores.find((p) => p.email === emailH);
        if (!hundidor) continue;
        if (!hundidor.conocidas) hundidor.conocidas = [];
        const setPrev = new Set(hundidor.conocidas);
        let celdasGanadas = 0;
        for (const k of heredadas) {
          if (!setPrev.has(k)) {
            setPrev.add(k);
            celdasGanadas++;
          }
        }
        hundidor.conocidas = Array.from(setPrev);
        if (celdasGanadas > 0) {
          herenciasEvento.push({
            hundidor: emailH,
            hundidorNombre: hundidor.nombre,
            victima: barco.jugadorEmail,
            victimaNombre: victima?.nombre ?? barco.jugadorEmail,
            celdasGanadas,
          });
        }
      }
    }
  }

  const eliminados: string[] = [];
  for (const p of j.jugadores) {
    if (p.eliminado) continue;
    const propios = j.barcos.filter((b) => b.jugadorEmail === p.email);
    if (propios.length === 0) continue;
    const todos = propios.every((b) => j.hundidos.some((h) => h.barcoId === b.id));
    if (todos) {
      p.eliminado = true;
      eliminados.push(p.email);
    }
  }

  j.eventosPorRonda.push({
    ronda,
    hits: hitsEvento,
    fails: failsEvento,
    desperdicios: desperdiciosEvento,
    herencias: herenciasEvento,
    eliminados,
  });

  j.estado = "revelando";
  j.revelandoStartedAt = Date.now();
  j.cuentaAtrasIniciadaAt = null;

  return { todosBarcosHundidos: debeTerminar(j) };
}

function debeTerminar(j: Juego): boolean {
  const todosBarcosHundidos =
    j.barcos.length > 0 && j.hundidos.length === j.barcos.length;
  const vivos = j.jugadores.filter((p) => !p.eliminado).length;
  const sinOponentes = j.jugadores.length > 1 && vivos <= 1;
  return todosBarcosHundidos || sinOponentes;
}

// Se llama desde GET (lazy) y desde cerrar (setTimeout) para pasar de
// "revelando" a la siguiente ronda o a "terminado". Mutación in-place.
export function avanzarPostRevelado(j: Juego): boolean {
  if (j.estado !== "revelando") return false;
  if (debeTerminar(j)) {
    j.estado = "terminado";
    j.endedAt = Date.now();
  } else {
    j.estado = "en_ronda";
    j.rondaActual = j.rondaActual + 1;
  }
  j.revelandoStartedAt = null;
  return true;
}

export const REVELANDO_DURATION_MS = 5000;
export const COUNTDOWN_DURATION_MS = 3000;
