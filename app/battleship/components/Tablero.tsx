"use client";

import { useMemo } from "react";
import BarcoSVG from "./BarcoSVG";
import { colLetra } from "@/lib/battleship/coords";

type Celda = { fila: number; col: number };

type Hit = { fila: number; col: number; ronda: number; barcoId: string | null };
type Bomba = { fila: number; col: number; ronda: number; email: string; nombre?: string };

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
  onCellHover?: (h: { fila: number; col: number } | null) => void;
  esLider: boolean;
  preview?: { fila: number; col: number; tamano: number; orientacion: "h" | "v" } | null;
  mostrarNombres?: boolean;
  nombrePorEmail?: Record<string, string>;
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
  onCellHover,
  esLider,
  preview = null,
  mostrarNombres = false,
  nombrePorEmail = {},
}: Props) {
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

  const bombaPropiaKey = bombaPropiaActual
    ? `${bombaPropiaActual.fila},${bombaPropiaActual.col}`
    : null;

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

  // Bombas pendientes con nombre (para badges en el tablero del líder/espectador)
  const badgesBombas = useMemo(() => {
    if (!mostrarNombres) return [] as { fila: number; col: number; nombres: string[] }[];
    const porCelda = new Map<string, string[]>();
    for (const b of bombasVisibles) {
      if (b.ronda !== rondaActual || !b.nombre) continue;
      const key = `${b.fila},${b.col}`;
      const lista = porCelda.get(key) ?? [];
      lista.push(b.nombre);
      porCelda.set(key, lista);
    }
    return Array.from(porCelda.entries()).map(([key, nombres]) => {
      const [fila, col] = key.split(",").map(Number);
      return { fila, col, nombres };
    });
  }, [bombasVisibles, rondaActual, mostrarNombres]);

  // Barcos a renderizar como SVG: propios siempre; hundidos públicos para todos;
  // todos si soy líder/espectador.
  const barcosARenderizar = useMemo(() => {
    return barcosVisibles
      .filter((b) => esLider || b.jugadorEmail === miEmail || b.hundido)
      .map((b) => {
        const hitsLocales: number[] = [];
        for (let i = 0; i < b.tamano; i++) {
          const f = b.orientacion === "v" ? b.fila + i : b.fila;
          const c = b.orientacion === "h" ? b.col + i : b.col;
          if (hitsSet.has(`${f},${c}`)) hitsLocales.push(i);
        }
        const estado: "sano" | "danado" | "hundido" = b.hundido
          ? "hundido"
          : hitsLocales.length > 0
            ? "danado"
            : "sano";
        return { barco: b, hitsLocales, estado };
      });
  }, [barcosVisibles, esLider, miEmail, hitsSet]);

  const celdas: React.ReactNode[] = [];
  for (let f = 0; f < alto; f++) {
    for (let c = 0; c < ancho; c++) {
      const key = `${f},${c}`;
      const barco = celdaABarco.get(key);
      const esBarcoVisible = barco && (esLider || barco.jugadorEmail === miEmail);
      const hit = hitsSet.get(key);
      const bombaActual = bombasRondaActual.get(key);
      const enPreview = previewSet.has(key);
      const esBombaPropia = bombaPropiaKey === key;

      let bg = "bg-zinc-900";
      let borde = "border-zinc-800";
      let contenido: React.ReactNode = null;

      // celda propia con barco: sin fondo extra, el SVG lo dibuja
      if (esBarcoVisible) {
        bg = "bg-zinc-900/40";
        borde = "border-zinc-800";
      }

      if (hit) {
        if (hit.barcoId) {
          // golpe a un barco — siempre visible, aunque no veas el barco
          bg = "bg-red-700";
          borde = "border-red-500";
          contenido = <span className="text-[90%] font-bold leading-none text-white">✸</span>;
        } else {
          // disparo al agua (miss) — bien visible para que el jugador
          // sepa dónde ya tiró
          bg = "bg-sky-900/70";
          borde = "border-sky-600";
          contenido = <span className="text-[90%] font-bold leading-none text-sky-200">○</span>;
        }
      }

      if (bombaActual) {
        bg = "bg-amber-500/80";
        borde = "border-amber-300";
        // El nombre del atacante (cuando aplica) se renderiza en un layer
        // aparte, encima del grid, así no se trunca con celdas chicas.
        if (!mostrarNombres) {
          if (bombaActual.email === miEmail) {
            contenido = <span className="text-[60%] font-bold text-zinc-900">●</span>;
          } else if (esLider) {
            contenido = <span className="text-[55%] text-zinc-900">●</span>;
          }
        }
      }

      if (esBombaPropia && !bombaActual) {
        bg = "bg-amber-500/80";
        borde = "border-amber-300";
        contenido = <span className="text-[60%] font-bold text-zinc-900">●</span>;
      }

      if (enPreview && fasePuedeColocar) {
        bg = "bg-cyan-500/40";
        borde = "border-cyan-300";
      }

      const interactivo =
        (fasePuedeColocar && onColocar) ||
        (fasePuedeBombardear && onBomba && !hit);

      const click = () => {
        if (fasePuedeColocar && onColocar) onColocar(f, c);
        else if (fasePuedeBombardear && onBomba && !hit) onBomba(f, c);
      };

      celdas.push(
        <button
          key={key}
          type="button"
          disabled={!interactivo}
          onClick={click}
          onMouseEnter={() => onCellHover?.({ fila: f, col: c })}
          onMouseLeave={() => onCellHover?.(null)}
          className={`flex aspect-square w-full items-center justify-center border ${borde} ${bg} ${interactivo ? "cursor-pointer hover:brightness-125" : "cursor-default"}`}
        >
          {contenido}
        </button>,
      );
    }
  }

  const fontSizePx = Math.max(8, Math.min(20, Math.floor(900 / Math.max(ancho, alto))));
  const labelSize = `${Math.max(10, Math.min(14, fontSizePx + 2))}px`;
  const headerH = "1.25rem";
  const labelW = "1.5rem";
  // El tablero ocupa lo MENOR entre el ancho del padre y maxHeight*ratio,
  // así escala bien tanto en mapas chicos como grandes.
  const tableroWidth = `min(100%, calc((100vh - 220px - ${headerH}) * ${ancho} / ${alto}))`;

  return (
    <div className="flex w-full justify-center">
      <div className="w-full" style={{ maxWidth: "100%" }}>
        {/* Fila 1: corner + header de columnas (letras) */}
        <div className="flex">
          <div style={{ width: labelW, flexShrink: 0 }} />
          <div
            className="grid font-mono text-zinc-500"
            style={{
              width: tableroWidth,
              height: headerH,
              gridTemplateColumns: `repeat(${ancho}, minmax(0, 1fr))`,
              fontSize: labelSize,
            }}
          >
            {Array.from({ length: ancho }).map((_, i) => (
              <span key={i} className="flex items-end justify-center pb-0.5">
                {colLetra(i)}
              </span>
            ))}
          </div>
        </div>

        {/* Fila 2: labels de filas (números) + tablero */}
        <div className="flex items-stretch">
          <div
            className="grid font-mono text-zinc-500"
            style={{
              width: labelW,
              flexShrink: 0,
              gridTemplateRows: `repeat(${alto}, minmax(0, 1fr))`,
              fontSize: labelSize,
            }}
          >
            {Array.from({ length: alto }).map((_, i) => (
              <span key={i} className="flex items-center justify-end pr-1">
                {i + 1}
              </span>
            ))}
          </div>

          {/* Tablero (aspectRatio + width responsive) */}
          <div
            className="relative rounded-lg border border-zinc-700 bg-zinc-950"
            style={{
              aspectRatio: `${ancho} / ${alto}`,
              width: tableroWidth,
              fontSize: `${fontSizePx}px`,
            }}
          >
        <div
          className="grid h-full w-full"
          style={{
            gridTemplateColumns: `repeat(${ancho}, minmax(0, 1fr))`,
          }}
        >
          {celdas}
        </div>

        {/* Layer de barcos SVG, encima del grid, sin captura de eventos */}
        <div className="pointer-events-none absolute inset-0">
          <div className="relative h-full w-full">
            {barcosARenderizar.map(({ barco, hitsLocales, estado }) => {
              const top = (barco.fila / alto) * 100;
              const left = (barco.col / ancho) * 100;
              const width =
                barco.orientacion === "h"
                  ? (barco.tamano / ancho) * 100
                  : (1 / ancho) * 100;
              const height =
                barco.orientacion === "v"
                  ? (barco.tamano / alto) * 100
                  : (1 / alto) * 100;
              return (
                <div
                  key={barco.id}
                  className="absolute"
                  style={{
                    top: `${top}%`,
                    left: `${left}%`,
                    width: `${width}%`,
                    height: `${height}%`,
                    transition: "top 220ms ease, left 220ms ease",
                  }}
                >
                  <BarcoSVG
                    tamano={barco.tamano}
                    orientacion={barco.orientacion}
                    estado={estado}
                    celdaPx={100}
                    hitsLocales={hitsLocales}
                  />
                  {(mostrarNombres || barco.hundido) && nombrePorEmail[barco.jugadorEmail] && (
                    <span
                      className={`absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded px-1.5 py-0.5 text-[60%] font-semibold leading-none text-white shadow-sm ${
                        barco.hundido ? "bg-red-900/80 ring-1 ring-red-300" : "bg-black/70"
                      }`}
                      style={{ pointerEvents: "none" }}
                    >
                      {nombrePorEmail[barco.jugadorEmail]}
                    </span>
                  )}
                </div>
              );
            })}

            {/* Badges de bombas pendientes con nombre del atacante */}
            {badgesBombas.map(({ fila, col, nombres }) => {
              const top = ((fila + 0.5) / alto) * 100;
              const left = ((col + 0.5) / ancho) * 100;
              return (
                <span
                  key={`bomb-${fila}-${col}`}
                  className="absolute -translate-x-1/2 -translate-y-1/2 whitespace-nowrap rounded bg-amber-500 px-1.5 py-0.5 text-[60%] font-semibold leading-none text-zinc-900 shadow-sm ring-1 ring-amber-200"
                  style={{ top: `${top}%`, left: `${left}%` }}
                >
                  {nombres.join(", ")}
                </span>
              );
            })}
          </div>
        </div>
          </div>
        </div>
      </div>
    </div>
  );
}
