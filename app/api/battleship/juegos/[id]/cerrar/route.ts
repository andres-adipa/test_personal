import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuego } from "@/lib/battleship/store";
import { celdasDeBarco } from "@/lib/battleship/colocacion";
import type { EventoFail, EventoHerencia, EventoHit } from "@/lib/battleship/types";

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
  const bombasRonda = j.bombas.filter((b) => b.ronda === ronda);

  const celdasYaImpactadas = new Set(j.hits.map((h) => `${h.fila},${h.col}`));

  // Mapa celda -> barco
  const celdaABarco = new Map<string, string>();
  for (const barco of j.barcos) {
    for (const c of celdasDeBarco(barco)) {
      celdaABarco.set(`${c.fila},${c.col}`, barco.id);
    }
  }

  // Procesar cada bomba de la ronda en orden de llegada
  const hitsEvento: EventoHit[] = [];
  const failsEvento: EventoFail[] = [];
  const herenciasEvento: EventoHerencia[] = [];

  // Para detectar correctamente "este hit hundió el barco" hay que aplicar
  // los hits en orden y ver tras cada uno si el barco quedó completo.
  for (const bomba of bombasRonda.sort((a, b) => a.lanzadaAt - b.lanzadaAt)) {
    const key = `${bomba.fila},${bomba.col}`;

    // Siempre agrego la celda apuntada al set "conocidas" del atacante (sirve
    // para roba-info y para que vea su disparo aunque la celda esté repetida)
    const atacanteJug = j.jugadores.find((p) => p.email === bomba.email);
    if (atacanteJug) {
      if (!atacanteJug.conocidas) atacanteJug.conocidas = [];
      if (!atacanteJug.conocidas.includes(key)) atacanteJug.conocidas.push(key);
    }

    if (celdasYaImpactadas.has(key)) {
      // celda ya tocada en alguna ronda anterior — no cuenta de nuevo
      continue;
    }
    const barcoId = celdaABarco.get(key) ?? null;
    j.hits.push({ fila: bomba.fila, col: bomba.col, ronda, barcoId });
    celdasYaImpactadas.add(key);

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

  // Roba-información: cuando un barco se hunde en esta ronda, los atacantes
  // que pegaron hits en esta ronda al barco hundido absorben TODO el set
  // "conocidas" de la víctima (que puede incluir info heredada previamente).
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

  // Eliminar jugadores cuyos barcos están todos hundidos
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
    herencias: herenciasEvento,
    eliminados,
  });

  const todosBarcosHundidos =
    j.barcos.length > 0 && j.hundidos.length === j.barcos.length;

  j.estado = "revelando";
  await setJuego(j);

  setTimeout(async () => {
    const fresco = await getJuego(id);
    if (!fresco) return;
    if (fresco.estado !== "revelando" || fresco.rondaActual !== ronda) return;
    if (todosBarcosHundidos) {
      fresco.estado = "terminado";
      fresco.endedAt = Date.now();
    } else {
      fresco.estado = "en_ronda";
      fresco.rondaActual = ronda + 1;
    }
    await setJuego(fresco);
  }, 5000);

  return NextResponse.json({ ok: true, todosBarcosHundidos });
}
