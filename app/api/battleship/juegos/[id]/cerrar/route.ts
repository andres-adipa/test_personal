import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuego } from "@/lib/battleship/store";
import { celdasDeBarco } from "@/lib/battleship/colocacion";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const j = getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  if (email !== j.lider) return NextResponse.json({ error: "Solo el líder" }, { status: 403 });
  if (j.estado !== "en_ronda") {
    return NextResponse.json({ error: "No hay ronda abierta" }, { status: 400 });
  }

  const ronda = j.rondaActual;
  const bombasRonda = j.bombas.filter((b) => b.ronda === ronda);

  const celdasYaImpactadas = new Set(j.hits.map((h) => `${h.fila},${h.col}`));
  const nuevasCeldas = new Set<string>();
  for (const b of bombasRonda) nuevasCeldas.add(`${b.fila},${b.col}`);

  const celdaABarco = new Map<string, string>();
  for (const barco of j.barcos) {
    for (const c of celdasDeBarco(barco)) {
      celdaABarco.set(`${c.fila},${c.col}`, barco.id);
    }
  }

  for (const key of nuevasCeldas) {
    if (celdasYaImpactadas.has(key)) continue;
    const [fila, col] = key.split(",").map(Number);
    const barcoId = celdaABarco.get(key) ?? null;
    j.hits.push({ fila, col, ronda, barcoId });
    celdasYaImpactadas.add(key);
  }

  for (const barco of j.barcos) {
    if (j.hundidos.some((h) => h.barcoId === barco.id)) continue;
    const celdas = celdasDeBarco(barco);
    const todasImpactadas = celdas.every((c) => celdasYaImpactadas.has(`${c.fila},${c.col}`));
    if (todasImpactadas) j.hundidos.push({ barcoId: barco.id, ronda });
  }

  const todosHundidos = j.barcos.length > 0 && j.hundidos.length === j.barcos.length;

  j.estado = "revelando";
  setJuego(j);

  setTimeout(() => {
    const fresco = getJuego(id);
    if (!fresco) return;
    if (fresco.estado !== "revelando" || fresco.rondaActual !== ronda) return;
    if (todosHundidos) {
      fresco.estado = "terminado";
      fresco.endedAt = Date.now();
    } else {
      fresco.estado = "en_ronda";
      fresco.rondaActual = ronda + 1;
    }
    setJuego(fresco);
  }, 4000);

  return NextResponse.json({ ok: true, todosHundidos });
}
