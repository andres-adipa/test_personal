import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuego } from "@/lib/store";
import { chequearPatron, chequearDosCartonesLlenos } from "@/lib/patrones";
import type { Patron } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const cartonId = String(body.cartonId ?? "");
  const patron = String(body.patron ?? "") as Patron;

  const j = await getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  if (j.estado !== "en_curso") return NextResponse.json({ error: "El juego no está en curso" }, { status: 400 });
  if (!j.patrones.includes(patron)) {
    return NextResponse.json({ error: "Ese premio no aplica a este juego" }, { status: 400 });
  }
  if (j.ganadores.some((g) => g.patron === patron)) {
    return NextResponse.json({ error: "Ese premio ya fue ganado" }, { status: 400 });
  }

  const carton = j.cartones.find((c) => c.id === cartonId);
  if (!carton || carton.jugadorEmail !== email) {
    return NextResponse.json({ error: "Cartón inválido" }, { status: 400 });
  }

  const cantados = new Set(j.sorteos.map((s) => s.numero));

  let valido: boolean;
  let faltantes: number;

  if (patron === "dos_cartones_llenos") {
    const mios = j.cartones
      .filter((c) => c.jugadorEmail === email && c.elegido)
      .map((c) => c.numeros);
    const r = chequearDosCartonesLlenos(mios, cantados);
    valido = r.gana;
    faltantes = r.faltantesMin;
  } else {
    const r = chequearPatron(carton.numeros, cantados, patron);
    valido = r.gana;
    faltantes = r.faltantesMin;
  }

  const ahora = Date.now();
  j.bingos.push({
    cartonId,
    email,
    cantadoAt: ahora,
    valido,
    faltantes,
    patron,
  });

  if (valido) {
    j.ganadores.push({ patron, cartonId, email, cantadoAt: ahora });
    // Si todos los premios ya tienen ganador, se termina.
    if (j.ganadores.length >= j.patrones.length) {
      j.estado = "terminado";
      j.endedAt = ahora;
    }
  }

  await setJuego(j);
  return NextResponse.json({ valido, faltantes, patron });
}
