import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuego, nuevoId } from "@/lib/store";
import { generarCartonUnico } from "@/lib/carton";

const OPCIONES_POR_JUGADOR = 4; // 4 cartones a elegir

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const nombre = String(body.nombre ?? "").trim();
  if (!email || !nombre) {
    return NextResponse.json({ error: "Email y nombre son obligatorios" }, { status: 400 });
  }

  const j = await getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });
  if (j.estado !== "lobby" && j.estado !== "eligiendo") {
    return NextResponse.json({ error: "Este juego ya comenzó" }, { status: 400 });
  }

  const yaJugaba = j.jugadores.find((p) => p.email === email);
  if (!yaJugaba) {
    j.jugadores.push({ email, nombre, joinedAt: Date.now() });
  }

  // Si aún no se han generado las opciones para este jugador, generarlas.
  const yaTieneOpciones = j.cartones.some((c) => c.ofrecidoA === email);
  if (!yaTieneOpciones) {
    const hashesExistentes = new Set(j.cartones.map((c) => c.hashUnico));
    for (let k = 0; k < OPCIONES_POR_JUGADOR; k++) {
      const { carton, hash } = generarCartonUnico(hashesExistentes);
      hashesExistentes.add(hash);
      j.cartones.push({
        id: nuevoId("c_"),
        juegoId: j.id,
        jugadorEmail: null,
        slot: null,
        numeros: carton,
        hashUnico: hash,
        elegido: false,
        ofrecidoA: email,
      });
    }
  }

  j.estado = "eligiendo";
  await setJuego(j);
  return NextResponse.json({ ok: true });
}
