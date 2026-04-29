"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useIdentidad } from "@/app/components/Identidad";

export default function CrearBattleshipPage() {
  const router = useRouter();
  const [identidad, , cargado] = useIdentidad();
  const [titulo, setTitulo] = useState("");
  const [barcosPorJugador, setBarcosPorJugador] = useState(1);
  const [tamanoBarco, setTamanoBarco] = useState(3);
  const [permitirEspectador, setPermitirEspectador] = useState(true);
  const [robaInformacion, setRobaInformacion] = useState(false);
  const [liderJugador, setLiderJugador] = useState(false);
  const [autoLanzar, setAutoLanzar] = useState(true);
  const [densidad, setDensidad] = useState<"denso" | "normal" | "tranquilo">("normal");
  const [enviando, setEnviando] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (cargado && !identidad.email) {
      router.push("/battleship");
    }
  }, [cargado, identidad.email, router]);

  if (!cargado || !identidad.email) return null;

  const enviar = async () => {
    setEnviando(true);
    setError(null);
    try {
      const r = await fetch("/api/battleship/juegos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          titulo,
          lider: identidad.email,
          barcosPorJugador,
          tamanoBarco,
          permitirEspectador,
          robaInformacion,
          liderJugador,
          autoLanzar,
          densidad,
        }),
      });
      const j = await r.json();
      if (!r.ok) {
        setError(j.error ?? "Error al crear");
        return;
      }
      router.push(`/battleship/juego/${j.id}/lider`);
    } catch {
      setError("Error de red");
    } finally {
      setEnviando(false);
    }
  };

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <Link href="/battleship" className="text-xs text-zinc-500 hover:text-zinc-300">
        ← Salas
      </Link>
      <h1 className="mb-6 mt-1 text-2xl font-bold text-violet-300">Crear sala</h1>

      <div className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-800 p-5">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Título de la sala</label>
          <input
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Reto del viernes"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Barcos por jugador</label>
            <input
              type="number"
              min={1}
              max={5}
              value={barcosPorJugador}
              onChange={(e) => setBarcosPorJugador(parseInt(e.target.value, 10) || 1)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs text-zinc-400">Tamaño del barco (celdas)</label>
            <input
              type="number"
              min={2}
              max={6}
              value={tamanoBarco}
              onChange={(e) => setTamanoBarco(parseInt(e.target.value, 10) || 3)}
              className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
            />
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs text-zinc-400">Densidad del mapa</label>
          <div className="grid gap-2 sm:grid-cols-3">
            {(
              [
                {
                  v: "denso",
                  titulo: "Denso",
                  resumen: "30% del mapa con barcos",
                  detalle: "Mapa pequeño, partidas rápidas. Más probabilidad de pegar y de que te peguen.",
                  color: "border-rose-500/70 bg-rose-950/30 text-rose-100",
                  activo: "ring-2 ring-rose-400",
                },
                {
                  v: "normal",
                  titulo: "Normal",
                  resumen: "22% del mapa con barcos",
                  detalle: "Balanceado: hay espacio para esconderse, pero los disparos suelen acertar.",
                  color: "border-violet-500/70 bg-violet-950/30 text-violet-100",
                  activo: "ring-2 ring-violet-400",
                },
                {
                  v: "tranquilo",
                  titulo: "Tranquilo",
                  resumen: "15% del mapa con barcos",
                  detalle: "Mapa grande con espacio. Partidas largas y exploratorias.",
                  color: "border-sky-500/70 bg-sky-950/30 text-sky-100",
                  activo: "ring-2 ring-sky-400",
                },
              ] as const
            ).map((op) => {
              const sel = densidad === op.v;
              return (
                <button
                  type="button"
                  key={op.v}
                  onClick={() => setDensidad(op.v)}
                  className={`rounded-lg border p-3 text-left text-xs transition ${op.color} ${sel ? op.activo : "opacity-70 hover:opacity-100"}`}
                >
                  <div className="text-sm font-bold">{op.titulo}</div>
                  <div className="mt-0.5 text-[11px] opacity-80">{op.resumen}</div>
                  <div className="mt-1 text-[11px] opacity-90">{op.detalle}</div>
                </button>
              );
            })}
          </div>
        </div>

        <label className="flex cursor-pointer items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={permitirEspectador}
            onChange={(e) => setPermitirEspectador(e.target.checked)}
            className="h-4 w-4 accent-violet-500"
          />
          Permitir modo espectador a los eliminados (verán todos los barcos hasta el final)
        </label>

        <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={robaInformacion}
            onChange={(e) => setRobaInformacion(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-violet-500"
          />
          <span>
            Roba información — al hundir un barco, absorbes todas las celdas que la
            víctima conocía (acumulativo y transitivo). Acelera partidas largas.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={liderJugador}
            onChange={(e) => setLiderJugador(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-violet-500"
          />
          <span>
            Líder jugador — el líder cuenta como jugador (recibe barcos y dispara).
            Cuando lo eliminan vuelve al modo solo-líder.
          </span>
        </label>

        <label className="flex cursor-pointer items-start gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={autoLanzar}
            onChange={(e) => setAutoLanzar(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-violet-500"
          />
          <span>
            Lanzar automáticamente las bombas cuando todos disparen — cuando
            todos los jugadores activos enviaron su disparo, se hace una cuenta
            regresiva 3-2-1 y se revela la ronda. El líder igual puede cerrar antes.
          </span>
        </label>

        <p className="text-xs text-zinc-500">
          Los barcos se posicionan automáticamente al iniciar — los jugadores no los colocan.
        </p>

        {error && <div className="text-sm text-red-400">{error}</div>}

        <div className="flex justify-end gap-2 pt-2">
          <Link
            href="/battleship"
            className="rounded-lg border border-zinc-700 px-4 py-2 text-sm text-zinc-300 hover:border-zinc-500"
          >
            Cancelar
          </Link>
          <button
            type="button"
            disabled={!titulo.trim() || enviando}
            onClick={enviar}
            className="rounded-lg border border-violet-600 bg-violet-600/20 px-4 py-2 text-sm font-medium text-violet-200 transition-colors hover:bg-violet-600/40 disabled:opacity-40"
          >
            {enviando ? "Creando..." : "Crear sala"}
          </button>
        </div>
      </div>
    </main>
  );
}
