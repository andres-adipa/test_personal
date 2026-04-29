"use client";

import type { Cuadricula, Patron } from "@/lib/types";
import { celdasDelPatron } from "@/lib/patrones";

type Props = {
  numeros: Cuadricula;
  marcados?: Set<number>;
  cantados?: Set<number>;
  patronResaltado?: Patron | null;
  onClickNumero?: (n: number) => void;
  compacto?: boolean;
};

export default function Carton({
  numeros,
  marcados,
  cantados,
  patronResaltado,
  onClickNumero,
  compacto,
}: Props) {
  const mask = patronResaltado ? celdasDelPatron(numeros, patronResaltado) : null;
  const celdaBase = compacto ? "h-9 w-9 text-xs" : "h-12 w-12 text-base";
  const clickable = !!onClickNumero;
  return (
    <div className="inline-block rounded-xl border border-zinc-700 bg-zinc-800 p-2">
      <div className="grid grid-cols-9 gap-1">
        {numeros.flatMap((fila, f) =>
          fila.map((cell, c) => {
            if (cell === null) {
              return (
                <div
                  key={`${f}-${c}`}
                  className={`${celdaBase} rounded bg-zinc-900/60 border border-zinc-800`}
                />
              );
            }
            const marcado = marcados?.has(cell);
            const cantadoNoMarcado = !marcado && cantados?.has(cell);
            const enPatron = mask?.[f]?.[c];
            let bg = "bg-zinc-700";
            if (clickable) bg += " hover:bg-zinc-600";
            if (marcado) bg = clickable ? "bg-violet-600 hover:bg-violet-500 text-white" : "bg-violet-600 text-white";
            if (cantadoNoMarcado) bg = clickable ? "bg-rose-500/20 text-rose-300 hover:bg-rose-500/30" : "bg-rose-500/20 text-rose-300";
            const ring = enPatron && !marcado ? "ring-1 ring-violet-400/60" : "";
            const cls = `${celdaBase} rounded font-semibold transition-all duration-100 ${bg} ${ring} flex items-center justify-center select-none`;
            if (clickable) {
              return (
                <button
                  key={`${f}-${c}`}
                  type="button"
                  onClick={() => onClickNumero?.(cell)}
                  className={`${cls} cursor-pointer touch-manipulation active:scale-90`}
                  style={{ WebkitTapHighlightColor: "transparent" }}
                >
                  {cell}
                </button>
              );
            }
            return (
              <div key={`${f}-${c}`} className={cls}>
                {cell}
              </div>
            );
          }),
        )}
      </div>
    </div>
  );
}
