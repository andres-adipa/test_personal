import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { agregarMarca, quitarMarca } from "@/lib/store";
import type { Juego } from "@/lib/types";

export const dynamic = "force-dynamic";

// Marcar es la operación de mayor frecuencia (cada jugador marca ~15 números
// por partida, casi en sincronía cuando el líder canta). Antes hacíamos
// read-modify-write sobre la fila JSONB del juego, lo que serializaba todas
// las marcas y reventaba a 45+ jugadores. Ahora insertamos/borramos una sola
// fila en bingo_marcas y validamos lo mínimo (cartón pertenece al jugador y
// número está en el cartón) leyendo solo lo necesario del JSONB.
type CartonLite = Pick<Juego["cartones"][number], "id" | "jugadorEmail" | "elegido" | "numeros">;
type ValidacionRow = { lider: string; carton: CartonLite | null };

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const email = String(body.email ?? "").trim().toLowerCase();
  const cartonId = String(body.cartonId ?? "");
  const numero = Number(body.numero);
  const desmarcar = !!body.desmarcar;

  // Validar con una sola query: extrae el cartón puntual desde el JSONB.
  const rows = await db<ValidacionRow[]>`
    SELECT
      lider,
      (
        SELECT to_jsonb(c)
          FROM jsonb_array_elements(data->'cartones') AS c
         WHERE c->>'id' = ${cartonId}
         LIMIT 1
      ) AS carton
    FROM bingo_juegos
    WHERE id = ${id}
    LIMIT 1
  `;
  const fila = rows[0];
  if (!fila) return NextResponse.json({ error: "Juego no existe" }, { status: 404 });

  const carton = fila.carton;
  if (!carton || carton.jugadorEmail !== email || !carton.elegido) {
    return NextResponse.json({ error: "Cartón no válido" }, { status: 400 });
  }
  const existeEnCarton = carton.numeros.some((f) => f.some((n) => n === numero));
  if (!existeEnCarton) {
    return NextResponse.json({ error: "Ese número no está en tu cartón" }, { status: 400 });
  }

  if (desmarcar) {
    await quitarMarca(id, cartonId, numero);
  } else {
    await agregarMarca(id, cartonId, numero, email);
  }
  return NextResponse.json({ ok: true });
}
