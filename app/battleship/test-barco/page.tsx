"use client";

import Link from "next/link";
import { useState } from "react";
import BarcoSVG from "@/app/battleship/components/BarcoSVG";

export default function TestBarcoPage() {
  const [celdaPx, setCeldaPx] = useState(48);

  const filas: { titulo: string; barcos: { tamano: number; orientacion: "h" | "v"; estado: "sano" | "danado" | "hundido"; hits?: number[] }[] }[] = [
    {
      titulo: "Sanos — diferentes tamaños",
      barcos: [
        { tamano: 2, orientacion: "h", estado: "sano" },
        { tamano: 3, orientacion: "h", estado: "sano" },
        { tamano: 4, orientacion: "h", estado: "sano" },
        { tamano: 5, orientacion: "h", estado: "sano" },
      ],
    },
    {
      titulo: "Con impactos parciales",
      barcos: [
        { tamano: 3, orientacion: "h", estado: "danado", hits: [1] },
        { tamano: 4, orientacion: "h", estado: "danado", hits: [0, 2] },
        { tamano: 5, orientacion: "h", estado: "danado", hits: [0, 1, 3] },
      ],
    },
    {
      titulo: "Hundidos (rotación + tinte rojo)",
      barcos: [
        { tamano: 3, orientacion: "h", estado: "hundido", hits: [0, 1, 2] },
        { tamano: 4, orientacion: "h", estado: "hundido", hits: [0, 1, 2, 3] },
      ],
    },
    {
      titulo: "Verticales",
      barcos: [
        { tamano: 3, orientacion: "v", estado: "sano" },
        { tamano: 4, orientacion: "v", estado: "danado", hits: [1] },
        { tamano: 3, orientacion: "v", estado: "hundido", hits: [0, 1, 2] },
      ],
    },
  ];

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <Link href="/battleship" className="text-xs text-zinc-500 hover:text-zinc-300">
        ← Hundir la Flota
      </Link>
      <h1 className="mb-2 mt-1 text-2xl font-bold text-cyan-300">Mockup de barcos</h1>
      <p className="mb-6 text-sm text-zinc-400">
        Esta página solo es para previsualizar cómo van a verse los barcos en el tablero
        antes de integrarlos. Cambiá el tamaño de celda con el slider.
      </p>

      <div className="mb-6 flex items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 p-3">
        <label className="text-xs text-zinc-300">Tamaño de celda</label>
        <input
          type="range"
          min={20}
          max={80}
          value={celdaPx}
          onChange={(e) => setCeldaPx(parseInt(e.target.value, 10))}
          className="w-64 accent-cyan-500"
        />
        <span className="text-xs text-zinc-400">{celdaPx}px</span>
      </div>

      <div className="space-y-8">
        {filas.map((f) => (
          <section key={f.titulo}>
            <h2 className="mb-3 border-l-2 border-cyan-500 pl-3 text-sm font-semibold text-zinc-200">
              {f.titulo}
            </h2>
            <div className="flex flex-wrap items-center gap-6 rounded-lg border border-zinc-700 bg-zinc-950 p-4">
              {f.barcos.map((b, i) => {
                const w = b.orientacion === "h" ? celdaPx * b.tamano : celdaPx;
                const h = b.orientacion === "v" ? celdaPx * b.tamano : celdaPx;
                return (
                  <div key={i} className="flex flex-col items-center gap-1">
                    {/* fondo de celdas para que se vea cómo se monta sobre el grid */}
                    <div
                      className="relative"
                      style={{
                        width: w,
                        height: h,
                        display: "grid",
                        gridTemplateColumns:
                          b.orientacion === "h"
                            ? `repeat(${b.tamano}, ${celdaPx}px)`
                            : `${celdaPx}px`,
                        gridTemplateRows:
                          b.orientacion === "v"
                            ? `repeat(${b.tamano}, ${celdaPx}px)`
                            : `${celdaPx}px`,
                      }}
                    >
                      {Array.from({ length: b.tamano }).map((_, k) => (
                        <div
                          key={k}
                          className="border border-zinc-800 bg-zinc-900"
                        />
                      ))}
                      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                        <BarcoSVG
                          tamano={b.tamano}
                          orientacion={b.orientacion}
                          estado={b.estado}
                          celdaPx={celdaPx}
                          hitsLocales={b.hits ?? []}
                        />
                      </div>
                    </div>
                    <span className="text-[10px] text-zinc-500">
                      tam {b.tamano} · {b.orientacion} · {b.estado}
                    </span>
                  </div>
                );
              })}
            </div>
          </section>
        ))}
      </div>

      <p className="mt-8 text-xs text-zinc-500">
        Si te gusta, lo integro al tablero real (jugador y líder). Si querés cambiar
        colores, forma de la proa, intensidad del hundimiento, o las cruces de hits,
        decímelo y lo retoco antes de integrar.
      </p>
    </main>
  );
}
