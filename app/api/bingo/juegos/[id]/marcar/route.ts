import { NextRequest, NextResponse } from "next/server";
import { getJuego, setJuego } from "@/lib/store";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const cartonId = String(body.cartonId ?? "");
  const numero = Number(body.numero);
  const desmarcar = !!body.desmarcar;

  const j = await getJuego(id);
  if (!j) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });

  const carton = j.cartones.find((c) => c.id === cartonId);
  if (!carton || carton.jugadorEmail !== email || !carton.elegido) {
    return NextResponse.json({ error: "Cartón no válido" }, { status: 400 });
  }
  // El número debe estar realmente en el cartón.
  const existeEnCarton = carton.numeros.some((fila) => fila.some((n) => n === numero));
  if (!existeEnCarton) {
    return NextResponse.json({ error: "Ese número no está en tu cartón" }, { status: 400 });
  }

  if (desmarcar) {
    j.marcas = j.marcas.filter((m) => !(m.cartonId === cartonId && m.numero === numero));
  } else {
    const ya = j.marcas.find((m) => m.cartonId === cartonId && m.numero === numero);
    if (!ya) j.marcas.push({ cartonId, numero, marcadoAt: Date.now() });
  }
  await setJuego(j);
  return NextResponse.json({ ok: true });
}
