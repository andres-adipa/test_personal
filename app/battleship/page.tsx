"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import IdentidadForm, { useIdentidad } from "@/app/components/Identidad";

type ResumenJuego = {
  id: string;
  titulo: string;
  lider: string;
  estado: "lobby" | "en_ronda" | "revelando" | "terminado";
  jugadores: number;
  config: { barcosPorJugador: number; tamanoBarco: number; permitirEspectador: boolean; robaInformacion: boolean; liderJugador: boolean };
  createdAt: number;
};

const ESTADO_LABEL: Record<string, string> = {
  lobby: "Sala abierta",
  en_ronda: "En ronda",
  revelando: "Revelando",
  terminado: "Terminado",
};

const ESTADO_COLOR: Record<string, string> = {
  lobby: "bg-emerald-500/20 text-emerald-400",
  en_ronda: "bg-violet-500/20 text-violet-300",
  revelando: "bg-fuchsia-500/20 text-fuchsia-300",
  terminado: "bg-zinc-500/20 text-zinc-400",
};

export default function BattleshipHome() {
  const [identidad, guardar, cargado] = useIdentidad();
  const [juegos, setJuegos] = useState<ResumenJuego[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    const tick = () => {
      fetch("/api/battleship/juegos")
        .then((r) => r.json())
        .then(setJuegos)
        .catch(() => {})
        .finally(() => setCargando(false));
    };
    tick();
    const t = setInterval(tick, 2000);
    return () => clearInterval(t);
  }, []);

  if (!cargado) return null;

  return (
    <main className="mx-auto max-w-4xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link href="/" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Entretenimiento
          </Link>
          <h1 className="text-2xl font-bold text-violet-300">Hundir la Flota</h1>
        </div>
        <Link
          href="/battleship/crear"
          className="rounded-lg border border-violet-600 bg-violet-600/20 px-4 py-2 text-sm font-medium text-violet-200 transition-colors hover:bg-violet-600/40"
        >
          + Crear sala
        </Link>
      </div>

      <IdentidadForm valor={identidad} onGuardar={guardar} />

      <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4">
        <h2 className="mb-3 border-l-2 border-violet-500 pl-3 text-sm font-semibold text-zinc-200">
          Salas disponibles
        </h2>
        {cargando ? (
          <p className="text-sm text-zinc-500">Cargando...</p>
        ) : juegos.length === 0 ? (
          <p className="text-sm text-zinc-500">
            No hay salas aún. Crea una con el botón de arriba.
          </p>
        ) : (
          <ul className="space-y-2">
            {juegos.map((j) => {
              const soyLider = identidad.email && identidad.email === j.lider;
              const href = soyLider
                ? `/battleship/juego/${j.id}/lider`
                : `/battleship/juego/${j.id}/jugar`;
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
                        {j.config.barcosPorJugador} barco(s) por jugador, tamaño{" "}
                        {j.config.tamanoBarco}
                        {j.config.permitirEspectador ? " · espectador permitido" : " · sin espectador"}
                        {j.config.robaInformacion && " · roba info"}
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
