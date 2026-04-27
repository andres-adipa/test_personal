"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import IdentidadForm, { useIdentidad } from "@/app/components/Identidad";

type JuegoLista = {
  id: string;
  titulo: string;
  lider: string;
  estado: "lobby" | "eligiendo" | "en_curso" | "terminado";
  jugadores: number;
  cartonesPorJugador: 1 | 2;
  patrones: string[];
};

const ESTADO_LABEL: Record<string, string> = {
  lobby: "Abierto",
  eligiendo: "Eligiendo cartones",
  en_curso: "En curso",
  terminado: "Terminado",
};

const ESTADO_COLOR: Record<string, string> = {
  lobby: "bg-emerald-500/20 text-emerald-400",
  eligiendo: "bg-amber-500/20 text-amber-400",
  en_curso: "bg-violet-500/20 text-violet-300",
  terminado: "bg-zinc-500/20 text-zinc-400",
};

export default function Home() {
  const [identidad, guardar, cargado] = useIdentidad();
  const [juegos, setJuegos] = useState<JuegoLista[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const tick = () => {
      fetch("/api/bingo/juegos")
        .then((r) => r.json())
        .then(setJuegos)
        .catch(() => {})
        .finally(() => setCargando(false));
    };
    tick();
    const timer = setInterval(tick, 2000);
    return () => clearInterval(timer);
  }, []);

  if (!cargado) return null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-violet-400">Bingo ADIPA</h1>
        <Link
          href="/bingo/crear"
          className="rounded-lg border border-violet-600 bg-violet-600/20 px-4 py-2 text-sm font-medium text-violet-300 transition-colors hover:bg-violet-600/40"
        >
          + Crear juego
        </Link>
      </div>

      <IdentidadForm valor={identidad} onGuardar={guardar} />

      <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4">
        <h2 className="mb-3 border-l-2 border-violet-500 pl-3 text-sm font-semibold text-zinc-200">
          Juegos disponibles
        </h2>
        {cargando ? (
          <p className="text-sm text-zinc-500">Cargando...</p>
        ) : juegos.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No hay juegos aún. Crea uno con el botón de arriba.
          </p>
        ) : (
          <ul className="space-y-2">
            {juegos.map((j) => {
              const soyLider = identidad.email && identidad.email === j.lider;
              const href = soyLider
                ? `/bingo/juego/${j.id}/lider`
                : `/bingo/juego/${j.id}/jugar`;
              return (
                <li key={j.id}>
                  <Link
                    href={href}
                    className="flex items-center justify-between rounded-lg border border-zinc-700 bg-zinc-900/40 p-3 transition-colors hover:border-violet-500 hover:bg-zinc-900/70"
                  >
                    <div>
                      <div className="font-medium text-zinc-100">
                        {j.titulo}{" "}
                        {soyLider && (
                          <span className="ml-2 text-xs text-violet-400">(eres líder)</span>
                        )}
                      </div>
                      <div className="text-xs text-zinc-400">
                        Líder: {j.lider} · {j.jugadores} jugador(es) ·{" "}
                        {j.cartonesPorJugador} cartón(es) por jugador · premios:{" "}
                        {(j.patrones ?? []).join(", ") || "—"}
                      </div>
                    </div>
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-medium ${ESTADO_COLOR[j.estado]}`}
                    >
                      {ESTADO_LABEL[j.estado]}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </main>
  );
}
