// Store de Bingo persistido en Postgres (Supabase). Tabla `bingo_juegos`.
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

export function barajar90(): number[] {
  const a: number[] = [];
  for (let i = 1; i <= 90; i++) a.push(i);
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
