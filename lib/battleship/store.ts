// Store de Battleship persistido en Postgres (Supabase). Tabla `battleship_juegos`.
// El objeto Juego completo se serializa en la columna `data` (JSONB).

import { db } from "@/lib/db";
import type { Juego } from "./types";

type Row = { data: Juego | string };

function parseData(d: Juego | string | undefined): Juego | undefined {
  if (d == null) return undefined;
  return typeof d === "string" ? (JSON.parse(d) as Juego) : d;
}

export async function getJuego(id: string): Promise<Juego | undefined> {
  const rows = await db<Row[]>`
    SELECT data FROM battleship_juegos WHERE id = ${id} LIMIT 1
  `;
  return parseData(rows[0]?.data);
}

export async function setJuego(j: Juego): Promise<void> {
  await db`
    INSERT INTO battleship_juegos (id, titulo, lider, estado, data)
    VALUES (${j.id}, ${j.titulo}, ${j.lider}, ${j.estado}, ${db.json(j as never)})
    ON CONFLICT (id) DO UPDATE
      SET titulo     = EXCLUDED.titulo,
          lider      = EXCLUDED.lider,
          estado     = EXCLUDED.estado,
          data       = EXCLUDED.data,
          updated_at = NOW()
  `;
}

// UPDATE condicional: sólo persiste si el estado actual en BD coincide con
// `estadoEsperado`. Evita races cuando varios GETs intentan avanzar el estado
// en paralelo (lazy advance). Devuelve `true` si la fila fue actualizada.
export async function setJuegoSiEstado(
  j: Juego,
  estadoEsperado: Juego["estado"],
): Promise<boolean> {
  const res = await db`
    UPDATE battleship_juegos
       SET titulo     = ${j.titulo},
           lider      = ${j.lider},
           estado     = ${j.estado},
           data       = ${db.json(j as never)},
           updated_at = NOW()
     WHERE id = ${j.id}
       AND estado = ${estadoEsperado}
  `;
  return res.count > 0;
}

export async function eliminarJuego(id: string): Promise<boolean> {
  const res = await db`DELETE FROM battleship_juegos WHERE id = ${id}`;
  return res.count > 0;
}

export async function listarJuegos(): Promise<Juego[]> {
  const rows = await db<Row[]>`
    SELECT data FROM battleship_juegos
    ORDER BY created_at DESC
    LIMIT 200
  `;
  return rows.map((r) => parseData(r.data)!).filter(Boolean);
}

export function nuevoId(prefix = ""): string {
  return prefix + Math.random().toString(36).slice(2, 10);
}
