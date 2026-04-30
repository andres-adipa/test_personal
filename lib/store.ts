// Store de Bingo persistido en Postgres (Supabase).
// - `bingo_juegos`: objeto Juego completo serializado en columna `data` (JSONB).
// - `bingo_marcas`: filas independientes (juego_id, carton_id, numero, email,
//   marcado_at). Se separó del JSONB para evitar contención de row lock cuando
//   muchos jugadores marcan a la vez (a 45+ jugadores el read-modify-write
//   sobre la misma fila JSONB serializaba todo y saturaba al servidor).

import { db } from "@/lib/db";
import type { Juego, Marca } from "./types";

type Row = { data: Juego | string };

function parseData(d: Juego | string | undefined): Juego | undefined {
  if (d == null) return undefined;
  return typeof d === "string" ? (JSON.parse(d) as Juego) : d;
}

export async function getJuego(id: string): Promise<Juego | undefined> {
  const rows = await db<Row[]>`
    SELECT data FROM bingo_juegos WHERE id = ${id} LIMIT 1
  `;
  return parseData(rows[0]?.data);
}

export async function setJuego(j: Juego): Promise<void> {
  await db`
    INSERT INTO bingo_juegos (id, titulo, lider, estado, data)
    VALUES (${j.id}, ${j.titulo}, ${j.lider}, ${j.estado}, ${db.json(j as never)})
    ON CONFLICT (id) DO UPDATE
      SET titulo     = EXCLUDED.titulo,
          lider      = EXCLUDED.lider,
          estado     = EXCLUDED.estado,
          data       = EXCLUDED.data,
          updated_at = NOW()
  `;
}

export async function eliminarJuego(id: string): Promise<boolean> {
  const res = await db`DELETE FROM bingo_juegos WHERE id = ${id}`;
  return res.count > 0;
}

export async function listarJuegos(): Promise<Juego[]> {
  const rows = await db<Row[]>`
    SELECT data FROM bingo_juegos
    ORDER BY created_at DESC
    LIMIT 200
  `;
  return rows.map((r) => parseData(r.data)!).filter(Boolean);
}

export function nuevoId(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 10);
}

// === Marcas (tabla aparte) ===
// Una fila por (juego_id, carton_id, numero). UPSERT y DELETE puntuales: cada
// marca toca una fila distinta, así 45 jugadores marcando a la vez no se
// pelean por el mismo lock.

type MarcaRow = {
  juego_id: string;
  carton_id: string;
  numero: number;
  email: string;
  marcado_at: Date;
};

export async function listarMarcasJuego(juegoId: string): Promise<Marca[]> {
  const rows = await db<MarcaRow[]>`
    SELECT juego_id, carton_id, numero, email, marcado_at
      FROM bingo_marcas
     WHERE juego_id = ${juegoId}
  `;
  return rows.map((r) => ({
    cartonId: r.carton_id,
    numero: r.numero,
    marcadoAt: new Date(r.marcado_at).getTime(),
  }));
}

export async function agregarMarca(
  juegoId: string,
  cartonId: string,
  numero: number,
  email: string,
): Promise<void> {
  await db`
    INSERT INTO bingo_marcas (juego_id, carton_id, numero, email)
    VALUES (${juegoId}, ${cartonId}, ${numero}, ${email})
    ON CONFLICT (juego_id, carton_id, numero) DO NOTHING
  `;
}

export async function quitarMarca(
  juegoId: string,
  cartonId: string,
  numero: number,
): Promise<void> {
  await db`
    DELETE FROM bingo_marcas
     WHERE juego_id = ${juegoId}
       AND carton_id = ${cartonId}
       AND numero = ${numero}
  `;
}

export async function limpiarMarcasJuego(juegoId: string): Promise<void> {
  await db`DELETE FROM bingo_marcas WHERE juego_id = ${juegoId}`;
}

export function barajar90(): number[] {
  const a: number[] = [];
  for (let i = 1; i <= 90; i++) a.push(i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
