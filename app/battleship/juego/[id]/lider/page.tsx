"use client";

import Link from "next/link";
import { use, useEffect, useState } from "react";
import IdentidadForm, { useIdentidad } from "@/app/components/Identidad";
import Tablero, { type BarcoVisible } from "@/app/battleship/components/Tablero";

type Estado = {
  id: string;
  titulo: string;
  lider: string;
  config: { barcosPorJugador: number; tamanoBarco: number; prellenarBarcos: boolean };
  estado: "lobby" | "colocando" | "en_ronda" | "revelando" | "terminado";
  tablero: { ancho: number; alto: number } | null;
  rondaActual: number;
  jugadores: { email: string; nombre: string; listo: boolean }[];
  barcos: BarcoVisible[];
  bombas: { email: string; fila: number; col: number; ronda: number; lanzadaAt: number }[];
  hits: { fila: number; col: number; ronda: number; barcoId: string | null }[];
  hundidos: { barcoId: string; ronda: number }[];
  bombasRondaActualCount: number;
  totalCeldasBarcos: number;
  totalHitsUnicos: number;
  esLider: boolean;
};

export default function LiderBattleshipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [identidad, guardar, cargado] = useIdentidad();
  const [data, setData] = useState<Estado | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cargado || !identidad.email) return;
    const tick = async () => {
      try {
        const r = await fetch(`/api/battleship/juegos/${id}?email=${encodeURIComponent(identidad.email)}`);
        if (!r.ok) return;
        const j = await r.json();
        setData(j);
      } catch {}
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [id, identidad.email, cargado]);

  if (!cargado) return null;

  if (!identidad.email) {
    return (
      <main className="mx-auto max-w-md px-6 py-8">
        <Link href="/battleship" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Salas
        </Link>
        <h1 className="mb-4 mt-1 text-xl font-bold text-cyan-300">Identifícate como líder</h1>
        <IdentidadForm valor={identidad} onGuardar={guardar} />
      </main>
    );
  }

  if (!data) {
    return <main className="mx-auto max-w-md px-6 py-8 text-zinc-400">Cargando...</main>;
  }

  if (!data.esLider) {
    return (
      <main className="mx-auto max-w-md px-6 py-8">
        <Link href="/battleship" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Salas
        </Link>
        <div className="mt-4 rounded-lg border border-amber-700 bg-amber-950/40 p-4 text-amber-200">
          No eres el líder de esta sala. El líder es {data.lider}.
        </div>
      </main>
    );
  }

  const accion = async (path: string) => {
    setError(null);
    const r = await fetch(`/api/battleship/juegos/${id}/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identidad.email }),
    });
    const j = await r.json();
    if (!r.ok) setError(j.error ?? "Error");
  };

  const listosCount = data.jugadores.filter((p) => p.listo).length;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/battleship" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Salas
          </Link>
          <h1 className="text-xl font-bold text-cyan-300">{data.titulo}</h1>
          <p className="text-xs text-zinc-500">
            Líder · {data.jugadores.length} jugador(es) · estado: {data.estado}
            {data.estado === "en_ronda" && ` · ronda ${data.rondaActual}`}
            {data.tablero && ` · mapa ${data.tablero.ancho}×${data.tablero.alto}`}
          </p>
        </div>
        <div className="flex gap-2">
          {data.estado === "lobby" && (
            <button
              type="button"
              disabled={data.jugadores.length === 0}
              onClick={() => accion("iniciar")}
              className="rounded-lg border border-cyan-600 bg-cyan-600/20 px-3 py-2 text-sm font-medium text-cyan-200 hover:bg-cyan-600/40 disabled:opacity-40"
            >
              Iniciar (calcular tablero)
            </button>
          )}
          {data.estado === "colocando" && (
            <button
              type="button"
              disabled={data.barcos.length === 0}
              onClick={() => accion("lanzar")}
              className="rounded-lg border border-emerald-600 bg-emerald-600/20 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-600/40 disabled:opacity-40"
              title={listosCount < data.jugadores.length ? "Puedes lanzar aunque no estén todos listos" : ""}
            >
              Lanzar primera ronda ({listosCount}/{data.jugadores.length} listos)
            </button>
          )}
          {data.estado === "en_ronda" && (
            <button
              type="button"
              onClick={() => accion("cerrar")}
              className="rounded-lg border border-fuchsia-600 bg-fuchsia-600/20 px-3 py-2 text-sm font-medium text-fuchsia-200 hover:bg-fuchsia-600/40"
            >
              Cerrar ronda y revelar ({data.bombasRondaActualCount}/{data.jugadores.length})
            </button>
          )}
          {data.estado !== "terminado" && data.estado !== "lobby" && (
            <button
              type="button"
              onClick={() => accion("terminar")}
              className="rounded-lg border border-zinc-600 bg-zinc-700/40 px-3 py-2 text-sm text-zinc-200 hover:bg-zinc-700/70"
            >
              Terminar
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-700 bg-red-950/50 p-2 text-sm text-red-300">
          {error}
        </div>
      )}

      <div className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800 p-3">
        <h2 className="mb-2 text-xs font-semibold text-zinc-300">Jugadores</h2>
        <div className="flex flex-wrap gap-2 text-xs">
          {data.jugadores.length === 0 && (
            <span className="text-zinc-500">Esperando jugadores...</span>
          )}
          {data.jugadores.map((p) => (
            <span
              key={p.email}
              className={`rounded border px-2 py-1 ${
                p.listo
                  ? "border-emerald-600 bg-emerald-600/10 text-emerald-300"
                  : "border-zinc-600 bg-zinc-900 text-zinc-300"
              }`}
            >
              {p.nombre} {p.listo && "✓"}
            </span>
          ))}
        </div>
      </div>

      {data.tablero && (
        <Tablero
          ancho={data.tablero.ancho}
          alto={data.tablero.alto}
          barcosVisibles={data.barcos}
          hits={data.hits}
          bombasVisibles={data.bombas}
          miEmail={identidad.email}
          rondaActual={data.rondaActual}
          bombaPropiaActual={null}
          fasePuedeColocar={false}
          fasePuedeBombardear={false}
          esLider={true}
        />
      )}

      <div className="mt-3 text-xs text-zinc-400">
        Hits {data.totalHitsUnicos}/{data.totalCeldasBarcos} · Hundidos{" "}
        {data.hundidos.length}/{data.barcos.length}
      </div>
    </main>
  );
}
