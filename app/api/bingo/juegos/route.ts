import { NextRequest, NextResponse } from "next/server";
import { listarJuegos, setJuego, nuevoId, barajar90 } from "@/lib/store";
import type { Juego, Patron } from "@/lib/types";

export const dynamic = "force-dynamic";

const PATRONES_VALIDOS: Patron[] = ["terna", "linea", "carton_lleno", "dos_cartones_llenos"];

export async function GET() {
  const juegos = (await listarJuegos()).map((j) => ({
    id: j.id,
    titulo: j.titulo,
    lider: j.lider,
    estado: j.estado,
    jugadores: j.jugadores.length,
    patrones: j.patrones,
    cartonesPorJugador: j.cartonesPorJugador,
    createdAt: j.createdAt,
  }));
  return NextResponse.json(juegos);
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const titulo = String(body.titulo ?? "").trim();
  const lider = String(body.lider ?? "").trim().toLowerCase();
  const patronesInput = Array.isArray(body.patrones) ? body.patrones : [];
  const cartonesPorJugador = body.cartonesPorJugador === 2 ? 2 : 1;
  const mostrarPatron = !!body.mostrarPatron;
  const historialVisibleJugador = !!body.historialVisibleJugador;
  const avisarNumerosPasados = !!body.avisarNumerosPasados;

  if (!titulo || !lider) {
    return NextResponse.json({ error: "Título y líder son obligatorios" }, { status: 400 });
  }

  // Deduplicar y filtrar sólo patrones válidos, manteniendo el orden que mandó el cliente.
  const vistos = new Set<Patron>();
  const patrones: Patron[] = [];
  for (const p of patronesInput) {
    if (PATRONES_VALIDOS.includes(p) && !vistos.has(p)) {
      vistos.add(p);
      patrones.push(p);
    }
  }

  if (patrones.length === 0) {
    return NextResponse.json({ error: "Selecciona al menos un premio" }, { status: 400 });
  }
  if (patrones.includes("dos_cartones_llenos") && cartonesPorJugador !== 2) {
    return NextResponse.json(
      { error: "El premio '2 cartones llenos' requiere 2 cartones por jugador" },
      { status: 400 },
    );
  }

  const id = nuevoId();
  const juego: Juego = {
    id,
    titulo,
    lider,
    cartonesPorJugador,
    patrones,
    mostrarPatron,
    historialVisibleJugador,
    avisarNumerosPasados,
    estado: "lobby",
    numerosBarajados: barajar90(),
    indiceActual: -1,
    jugadores: [],
    cartones: [],
    sorteos: [],
    marcas: [],
    bingos: [],
    ganadores: [],
    createdAt: Date.now(),
    startedAt: null,
    endedAt: null,
  };
  await setJuego(juego);
  return NextResponse.json({ id });
}
