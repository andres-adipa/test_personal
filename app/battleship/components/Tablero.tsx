"use client";

import { useMemo } from "react";

type Celda = { fila: number; col: number };

type Hit = { fila: number; col: number; ronda: number; barcoId: string | null };
type Bomba = { fila: number; col: number; ronda: number; email: string };

export type BarcoVisible = {
  id: string;
  jugadorEmail: string;
  tamano: number;
  fila: number;
  col: number;
  orientacion: "h" | "v";
  celdas: Celda[];
  hundido: boolean;
};

type Props = {
  ancho: number;
  alto: number;
  barcosVisibles: BarcoVisible[];
  hits: Hit[];
  bombasVisibles: Bomba[];
  miEmail: string;
  rondaActual: number;
  bombaPropiaActual: Bomba | null;
  fasePuedeColocar: boolean;
  fasePuedeBombardear: boolean;
  onColocar?: (fila: number, col: number) => void;
  onBomba?: (fila: number, col: number) => void;
  esLider: boolean;
  preview?: { fila: number; col: number; tamano: number; orientacion: "h" | "v" } | null;
};

export default function Tablero({
  ancho,
  alto,
  barcosVisibles,
  hits,
  bombasVisibles,
  miEmail,
  rondaActual,
  bombaPropiaActual,
  fasePuedeColocar,
  fasePuedeBombardear,
  onColocar,
  onBomba,
  esLider,
  preview = null,
}: Props) {
  const celdasPropias = useMemo(() => {
    const set = new Set<string>();
    for (const b of barcosVisibles) {
      if (esLider || b.jugadorEmail === miEmail) {
        for (const c of b.celdas) set.add(`${c.fila},${c.col}`);
      }
    }
    return set;
  }, [barcosVisibles, miEmail, esLider]);

  const celdaABarco = useMemo(() => {
    const m = new Map<string, BarcoVisible>();
    for (const b of barcosVisibles) {
      for (const c of b.celdas) m.set(`${c.fila},${c.col}`, b);
    }
    return m;
  }, [barcosVisibles]);

  const hitsSet = useMemo(() => {
    const m = new Map<string, Hit>();
    for (const h of hits) m.set(`${h.fila},${h.col}`, h);
    return m;
  }, [hits]);

  const bombasRondaActual = useMemo(() => {
    const m = new Map<string, Bomba>();
    for (const b of bombasVisibles) {
      if (b.ronda === rondaActual) m.set(`${b.fila},${b.col}`, b);
    }
    return m;
  }, [bombasVisibles, rondaActual]);

  const previewSet = useMemo(() => {
    if (!preview) return new Set<string>();
    const set = new Set<string>();
    for (let i = 0; i < preview.tamano; i++) {
      const f = preview.orientacion === "v" ? preview.fila + i : preview.fila;
      const c = preview.orientacion === "h" ? preview.col + i : preview.col;
      set.add(`${f},${c}`);
    }
    return set;
  }, [preview]);

  const tamanoCelda = Math.max(14, Math.min(36, Math.floor(800 / Math.max(ancho, alto))));

  const filas = [];
  for (let f = 0; f < alto; f++) {
    const celdas = [];
    for (let c = 0; c < ancho; c++) {
      const key = `${f},${c}`;
      const propia = celdasPropias.has(key);
      const barco = celdaABarco.get(key);
      const esBarcoPropio = barco && (esLider || barco.jugadorEmail === miEmail);
      const hit = hitsSet.get(key);
      const bombaActual = bombasRondaActual.get(key);
      const enPreview = previewSet.has(key);

      let bg = "bg-zinc-900";
      let borde = "border-zinc-800";
      let contenido: React.ReactNode = null;

      if (esBarcoPropio) {
        bg = barco?.hundido ? "bg-red-900/60" : "bg-cyan-700/40";
        borde = barco?.hundido ? "border-red-700" : "border-cyan-600";
      }

      if (hit) {
        if (hit.barcoId) {
          bg = "bg-red-600";
          borde = "border-red-400";
          contenido = <span className="text-[10px] font-bold text-white">✸</span>;
        } else {
          bg = "bg-zinc-700/80";
          borde = "border-zinc-600";
          contenido = <span className="text-[10px] text-zinc-400">·</span>;
        }
      }

      if (bombaActual) {
        bg = "bg-amber-500/80";
        borde = "border-amber-300";
        if (bombaActual.email === miEmail) {
          contenido = <span className="text-[10px] font-bold text-zinc-900">●</span>;
        } else if (esLider) {
          contenido = <span className="text-[9px] text-zinc-900">●</span>;
        }
      }

      if (enPreview && fasePuedeColocar) {
        bg = "bg-cyan-500/40";
        borde = "border-cyan-300";
      }

      const interactivo =
        (fasePuedeColocar && onColocar) ||
        (fasePuedeBombardear && onBomba && !hit && !bombaPropiaActual);

      const click = () => {
        if (fasePuedeColocar && onColocar) onColocar(f, c);
        else if (fasePuedeBombardear && onBomba && !hit && !bombaPropiaActual) onBomba(f, c);
      };

      celdas.push(
        <button
          key={key}
          type="button"
          disabled={!interactivo}
          onClick={click}
          className={`flex items-center justify-center border ${borde} ${bg} ${interactivo ? "hover:brightness-125 cursor-pointer" : "cursor-default"}`}
          style={{ width: tamanoCelda, height: tamanoCelda }}
          title={`F${f} C${c}`}
        >
          {contenido}
        </button>,
      );
    }
    filas.push(
      <div key={f} className="flex">
        {celdas}
      </div>,
    );
  }

  return (
    <div className="overflow-auto rounded-lg border border-zinc-700 bg-zinc-950 p-2">
      <div className="inline-block">{filas}</div>
    </div>
  );
}
