"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useIdentidad } from "@/app/components/Identidad";
import { PATRONES } from "@/lib/patrones";
import type { Patron } from "@/lib/types";

export default function CrearPage() {
  const router = useRouter();
  const [identidad, , cargado] = useIdentidad();
  const [titulo, setTitulo] = useState("");
  const [patrones, setPatrones] = useState<Patron[]>(["linea"]);
  const [cartonesPorJugador, setCartones] = useState<1 | 2>(1);
  const [mostrarPatron, setMostrarPatron] = useState(false);
  const [historialVisibleJugador, setHistorialVisible] = useState(false);
  const [avisarNumerosPasados, setAvisarNumerosPasados] = useState(false);
  const [error, setError] = useState("");
  const [creando, setCreando] = useState(false);

  // Si pasa a 1 cartón, quitar "dos_cartones_llenos".
  useEffect(() => {
    if (cartonesPorJugador === 1 && patrones.includes("dos_cartones_llenos")) {
      setPatrones((prev) => prev.filter((p) => p !== "dos_cartones_llenos"));
    }
  }, [cartonesPorJugador, patrones]);

  if (!cargado) return null;

  const togglePatron = (p: Patron) => {
    setPatrones((prev) => {
      if (prev.includes(p)) return prev.filter((x) => x !== p);
      // Respetamos el orden canónico de PATRONES al agregar.
      return PATRONES.map((x) => x.key).filter(
        (k) => prev.includes(k) || k === p,
      ) as Patron[];
    });
  };

  const crear = async () => {
    setError("");
    if (!identidad.email || !identidad.nombre) {
      setError("Primero guarda tu nombre y email en la página principal.");
      return;
    }
    if (!titulo.trim()) {
      setError("El título es obligatorio.");
      return;
    }
    if (patrones.length === 0) {
      setError("Selecciona al menos un premio.");
      return;
    }
    setCreando(true);
    const res = await fetch("/api/bingo/juegos", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        titulo: titulo.trim(),
        lider: identidad.email,
        patrones,
        cartonesPorJugador,
        mostrarPatron,
        historialVisibleJugador,
        avisarNumerosPasados,
      }),
    });
    const data = await res.json();
    setCreando(false);
    if (!res.ok) {
      setError(data.error ?? "Error al crear");
      return;
    }
    router.push(`/bingo/juego/${data.id}/lider`);
  };

  const labelClass = "mb-1 block text-xs text-zinc-400";
  const inputClass =
    "w-full rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none";

  return (
    <main className="mx-auto max-w-2xl px-6 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-violet-400">Crear juego</h1>
        <Link href="/" className="text-sm text-zinc-400 hover:text-zinc-200">
          ← Volver
        </Link>
      </div>

      <div className="space-y-4 rounded-xl border border-zinc-700 bg-zinc-800 p-5">
        <div>
          <label className={labelClass}>Título del juego</label>
          <input
            className={inputClass}
            value={titulo}
            onChange={(e) => setTitulo(e.target.value)}
            placeholder="Ej: Bingo ADIPA - 23 abril"
          />
        </div>

        <div>
          <label className={labelClass}>Cartones por jugador</label>
          <div className="flex gap-2">
            {([1, 2] as const).map((v) => (
              <button
                type="button"
                key={v}
                onClick={() => setCartones(v)}
                className={`rounded-lg border px-4 py-2 text-sm ${
                  cartonesPorJugador === v
                    ? "border-violet-500 bg-violet-600/20 text-violet-300"
                    : "border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                {v} {v === 1 ? "cartón" : "cartones"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className={labelClass}>Premios de la partida (puedes elegir varios)</label>
          <div className="space-y-2">
            {PATRONES.map((p) => {
              const deshabilitado = p.requiere2Cartones && cartonesPorJugador !== 2;
              const checked = patrones.includes(p.key);
              return (
                <label
                  key={p.key}
                  className={`flex items-start gap-3 rounded-lg border p-3 transition-colors ${
                    deshabilitado
                      ? "cursor-not-allowed border-zinc-800 bg-zinc-900/30 opacity-50"
                      : checked
                        ? "cursor-pointer border-violet-500 bg-violet-900/20"
                        : "cursor-pointer border-zinc-700 bg-zinc-900/40 hover:border-zinc-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    disabled={deshabilitado}
                    onChange={() => !deshabilitado && togglePatron(p.key)}
                    className="mt-0.5 h-4 w-4 accent-violet-500"
                  />
                  <div>
                    <div className="text-sm font-medium text-zinc-100">{p.label}</div>
                    <div className="text-xs text-zinc-400">{p.descripcion}</div>
                    {deshabilitado && (
                      <div className="mt-1 text-xs text-amber-400">
                        Requiere 2 cartones por jugador
                      </div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>
          {patrones.length > 1 && (
            <p className="mt-2 text-xs text-zinc-500">
              El juego termina cuando todos los premios tengan ganador.
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={mostrarPatron}
            onChange={(e) => setMostrarPatron(e.target.checked)}
            className="h-4 w-4 accent-violet-500"
          />
          Mostrar a los jugadores cuáles son los premios
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={historialVisibleJugador}
            onChange={(e) => setHistorialVisible(e.target.checked)}
            className="h-4 w-4 accent-violet-500"
          />
          Permitir que los jugadores vean el historial de números cantados
        </label>

        <label className="flex items-center gap-2 text-sm text-zinc-300">
          <input
            type="checkbox"
            checked={avisarNumerosPasados}
            onChange={(e) => setAvisarNumerosPasados(e.target.checked)}
            className="h-4 w-4 accent-violet-500"
          />
          Avisar al jugador si pasó por alto un número de su cartón (lo marca en
          rojo)
        </label>

        {error && <p className="text-sm text-rose-400">{error}</p>}

        <button
          type="button"
          onClick={crear}
          disabled={creando}
          className="rounded-lg border border-violet-600 bg-violet-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
        >
          {creando ? "Creando..." : "Crear juego"}
        </button>
      </div>
    </main>
  );
}
