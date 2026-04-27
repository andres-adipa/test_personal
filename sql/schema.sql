-- Schema para test-entretenimiento (Bingo + Battleship)
-- Ejecutar en Supabase SQL Editor.

CREATE TABLE IF NOT EXISTS bingo_juegos (
  id           TEXT PRIMARY KEY,
  titulo       TEXT NOT NULL,
  lider        TEXT NOT NULL,
  estado       TEXT NOT NULL,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_bingo_juegos_created_at ON bingo_juegos(created_at DESC);

CREATE TABLE IF NOT EXISTS battleship_juegos (
  id           TEXT PRIMARY KEY,
  titulo       TEXT NOT NULL,
  lider        TEXT NOT NULL,
  estado       TEXT NOT NULL,
  data         JSONB NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_battleship_juegos_created_at ON battleship_juegos(created_at DESC);
