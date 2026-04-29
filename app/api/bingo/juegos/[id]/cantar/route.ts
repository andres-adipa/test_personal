import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuego } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();

  const j = await getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  if (email !== j.lider) return NextResponse.json({ error: "Solo el líder canta números" }, { status: 403 });
  if (j.estado !== "en_curso") return NextResponse.json({ error: "El juego no está en curso" }, { status: 400 });

  // Si el último premio ya tiene ganador, el líder debe usar "Terminar juego",
  // no "Cantar siguiente" (para cerrar la ventana de empate del último premio).
  const ultimoPremio = j.patrones[j.patrones.length - 1];
  const ultimoGanado = j.ganadores.some((g) => g.patron === ultimoPremio);
  if (ultimoGanado) {
    return NextResponse.json(
      { error: "Usa 'Terminar juego' para cerrar la partida" },
      { status: 400 },
    );
  }

  const siguiente = j.indiceActual + 1;
  if (siguiente >= j.numerosBarajados.length) {
    return NextResponse.json({ error: "Ya se cantaron todos los números" }, { status: 400 });
  }
  const numero = j.numerosBarajados[siguiente];
  j.indiceActual = siguiente;
  j.sorteos.push({ numero, orden: siguiente, cantadoAt: Date.now() });
  await setJuego(j);
  return NextResponse.json({ numero, orden: siguiente });
}
