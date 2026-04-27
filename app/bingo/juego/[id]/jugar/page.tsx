"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import Carton from "@/app/components/Carton";
import { useIdentidad } from "@/app/components/Identidad";
import type { Cuadricula, Patron, EstadoJuego } from "@/lib/types";
import { PATRONES } from "@/lib/patrones";

type Estado = {
  id: string;
  titulo: string;
  lider: string;
  patrones: Patron[];
  mostrarPatron: boolean;
  historialVisibleJugador: boolean;
  cartonesPorJugador: 1 | 2;
  estado: EstadoJuego;
  indiceActual: number;
  cantadosCount: number;
  jugadores: { email: string; nombre: string; joinedAt: number }[];
  cartones: {
    id: string;
    jugadorEmail: string | null;
    elegido: boolean;
    ofrecidoA: string | null;
    numeros: Cuadricula;
  }[];
  sorteos: { numero: number; orden: number; cantadoAt: number }[];
  marcas: { cartonId: string; numero: number; marcadoAt: number }[];
  bingos: { cartonId: string; email: string; valido: boolean; faltantes: number; cantadoAt: number; patron: Patron }[];
  ganadores: { patron: Patron; cartonId: string; email: string; cantadoAt: number }[];
  esLider: boolean;
};

function patronLabel(p: Patron) {
  return PATRONES.find((x) => x.key === p)?.label ?? p;
}

function patronDescripcion(p: Patron) {
  return PATRONES.find((x) => x.key === p)?.descripcion ?? "";
}

function fmtHora(ts: number) {
  return new Date(ts).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Santiago",
  });
}

export default function JugarPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [identidad, , cargado] = useIdentidad();
  const [data, setData] = useState<Estado | null>(null);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [resultadoBingo, setResultadoBingo] = useState<{
    valido: boolean;
    faltantes: number;
    patron: Patron;
  } | null>(null);
  const [mensajeUnion, setMensajeUnion] = useState("");

  useEffect(() => {
    if (!cargado || !identidad.email) return;
    const tick = async () => {
      try {
        const r = await fetch(`/api/bingo/juegos/${id}?email=${encodeURIComponent(identidad.email)}`);
        if (!r.ok) return;
        const j = await r.json();
        setData(j);
      } catch {}
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [id, identidad.email, cargado]);

  useEffect(() => {
    if (!data || !identidad.email || !identidad.nombre) return;
    const yaEstoy = data.jugadores.some((p) => p.email === identidad.email);
    const fueOfrecido = data.cartones.some((c) => c.ofrecidoA === identidad.email);
    if (!yaEstoy || !fueOfrecido) {
      if (data.estado === "lobby" || data.estado === "eligiendo") {
        fetch(`/api/bingo/juegos/${id}/unirse`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: identidad.email, nombre: identidad.nombre }),
        }).then(async (r) => {
          if (!r.ok) {
            const e = await r.json();
            setMensajeUnion(e.error ?? "No se pudo unir");
          }
        });
      }
    }
  }, [data, identidad.email, identidad.nombre, id]);

  const misCartones = useMemo(() => (data ? data.cartones : []), [data]);
  const opciones = misCartones.filter((c) => !c.elegido && c.ofrecidoA === identidad.email);
  const elegidos = misCartones.filter((c) => c.elegido && c.jugadorEmail === identidad.email);

  const ultimoCantado =
    data && data.sorteos.length > 0 ? data.sorteos[data.sorteos.length - 1].numero : null;

  const misMarcasPorCarton = useMemo(() => {
    const m = new Map<string, Set<number>>();
    if (!data) return m;
    for (const marca of data.marcas) {
      if (!m.has(marca.cartonId)) m.set(marca.cartonId, new Set());
      m.get(marca.cartonId)!.add(marca.numero);
    }
    return m;
  }, [data]);

  // Premios que todavía no tienen ganador.
  const premiosPendientes = useMemo(() => {
    if (!data) return [];
    const ganados = new Set(data.ganadores.map((g) => g.patron));
    return data.patrones.filter((p) => !ganados.has(p));
  }, [data]);

  if (!cargado) return null;
  if (!identidad.email || !identidad.nombre) {
    return (
      <main className="mx-auto max-w-xl px-6 py-12 text-center">
        <p className="text-zinc-300">
          Primero necesitas guardar tu nombre y email en la{" "}
          <Link href="/" className="text-violet-400 underline">
            página principal
          </Link>
          .
        </p>
      </main>
    );
  }
  if (!data) {
    return <main className="mx-auto max-w-4xl px-6 py-8 text-zinc-400">Cargando juego...</main>;
  }

  const toggleSeleccion = (cartonId: string) => {
    setSeleccion((prev) => {
      if (prev.includes(cartonId)) return prev.filter((x) => x !== cartonId);
      if (prev.length >= data.cartonesPorJugador) return prev;
      return [...prev, cartonId];
    });
  };

  const confirmarEleccion = async () => {
    if (seleccion.length !== data.cartonesPorJugador) return;
    await fetch(`/api/bingo/juegos/${id}/elegir`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: identidad.email, cartonIds: seleccion }),
    });
    setSeleccion([]);
  };

  const marcarNumero = async (cartonId: string, numero: number) => {
    if (data.estado !== "en_curso") return;
    const yaMarcado = misMarcasPorCarton.get(cartonId)?.has(numero);
    await fetch(`/api/bingo/juegos/${id}/marcar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: identidad.email,
        cartonId,
        numero,
        desmarcar: yaMarcado,
      }),
    });
  };

  const cantarBingo = async (cartonId: string, patron: Patron) => {
    setResultadoBingo(null);
    const r = await fetch(`/api/bingo/juegos/${id}/bingo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: identidad.email, cartonId, patron }),
    });
    const j = await r.json();
    setResultadoBingo({ valido: !!j.valido, faltantes: j.faltantes ?? 0, patron });
    setTimeout(() => setResultadoBingo(null), 6000);
  };

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-200">
            ← Salir
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-violet-400">{data.titulo}</h1>
          <p className="text-xs text-zinc-400">
            Premios:{" "}
            <span className="text-zinc-200">
              {data.patrones.map(patronLabel).join(" · ")}
            </span>{" "}
            · {data.cartonesPorJugador} cartón(es) por jugador
          </p>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-400">Números cantados</div>
          <div className="text-2xl font-bold text-zinc-100">{data.cantadosCount}/99</div>
        </div>
      </div>

      {mensajeUnion && (
        <div className="mb-4 rounded-lg border border-rose-700 bg-rose-900/20 p-3 text-sm text-rose-300">
          {mensajeUnion}
        </div>
      )}

      {data.mostrarPatron && (
        <div className="mb-4 rounded-lg border border-violet-700/60 bg-violet-900/20 p-3 text-sm text-violet-200">
          <span className="font-semibold">🎯 Premios en juego:</span>
          <ul className="mt-1 list-disc space-y-0.5 pl-5">
            {data.patrones.map((p) => {
              const g = data.ganadores.find((x) => x.patron === p);
              const nombreG = g
                ? data.jugadores.find((j) => j.email === g.email)?.nombre ?? g.email
                : null;
              return (
                <li key={p}>
                  <span className="font-medium">{patronLabel(p)}</span>{" "}
                  <span className="text-violet-300">— {patronDescripcion(p)}</span>
                  {nombreG && (
                    <span className="ml-2 text-xs text-emerald-300">
                      ✓ ganó {nombreG}
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {(data.estado === "lobby" || data.estado === "eligiendo") && elegidos.length === 0 && (
        <section className="mb-6 rounded-xl border border-zinc-700 bg-zinc-800 p-5">
          <h2 className="mb-3 border-l-2 border-violet-500 pl-3 text-sm font-semibold text-zinc-200">
            Elige tu{data.cartonesPorJugador > 1 ? "s" : ""} cartón(es) — {seleccion.length}/
            {data.cartonesPorJugador}
          </h2>
          {opciones.length === 0 ? (
            <p className="text-sm text-zinc-500">Generando tus cartones...</p>
          ) : (
            <>
              <div className="flex flex-wrap gap-4">
                {opciones.map((c) => {
                  const sel = seleccion.includes(c.id);
                  return (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => toggleSeleccion(c.id)}
                      className={`rounded-xl p-1 transition-all ${
                        sel ? "ring-2 ring-violet-500 bg-violet-900/20" : "hover:bg-zinc-900/40"
                      }`}
                    >
                      <Carton numeros={c.numeros} compacto />
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                disabled={seleccion.length !== data.cartonesPorJugador}
                onClick={confirmarEleccion}
                className="mt-4 rounded-lg border border-violet-600 bg-violet-600 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
              >
                Confirmar elección
              </button>
            </>
          )}
        </section>
      )}

      {data.estado === "eligiendo" && elegidos.length > 0 && (
        <section className="mb-6 rounded-xl border border-amber-700/50 bg-amber-900/10 p-5 text-center">
          <p className="text-amber-300">
            Cartones confirmados. Esperando a que {data.lider} inicie el juego...
          </p>
        </section>
      )}

      {(data.estado === "en_curso" || data.estado === "terminado") && (
        <>
          <section className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800 p-4">
            <div className="flex items-center justify-between">
              <h2 className="border-l-2 border-violet-500 pl-3 text-sm font-semibold text-zinc-200">
                Último número cantado
              </h2>
              <div className="text-right">
                {ultimoCantado !== null ? (
                  <div className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-amber-500 text-4xl font-bold text-zinc-900 shadow-lg">
                    {ultimoCantado}
                  </div>
                ) : (
                  <span className="text-sm text-zinc-500">—</span>
                )}
              </div>
            </div>
            {data.historialVisibleJugador && data.sorteos.length > 1 && (
              <div className="mt-3">
                <div className="mb-1 text-xs text-zinc-500">Anteriores (más recientes primero):</div>
                <div className="flex flex-wrap gap-1">
                  {data.sorteos
                    .slice(0, -1)
                    .reverse()
                    .map((s) => (
                      <span
                        key={s.orden}
                        className="rounded bg-zinc-900 px-2 py-1 text-xs text-zinc-300"
                      >
                        {s.numero}
                      </span>
                    ))}
                </div>
              </div>
            )}
            {!data.historialVisibleJugador && (
              <div className="mt-3 text-xs text-zinc-500 italic">
                El historial de números cantados no está visible para los jugadores en este juego.
              </div>
            )}
          </section>

          <section className="space-y-4">
            {elegidos.map((c) => {
              const marcas = misMarcasPorCarton.get(c.id) ?? new Set<number>();
              return (
                <div key={c.id} className="rounded-xl border border-zinc-700 bg-zinc-800 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-zinc-400">
                      Tu cartón · marca haciendo clic en los números que se van cantando
                    </span>
                    {data.estado === "en_curso" && premiosPendientes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {premiosPendientes.map((p) => (
                          <button
                            key={p}
                            type="button"
                            onClick={() => cantarBingo(c.id, p)}
                            className="rounded-lg border border-amber-500 bg-amber-500 px-4 py-2 text-xs font-bold uppercase text-zinc-900 transition-transform hover:scale-105"
                          >
                            ¡{patronLabel(p)}!
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <Carton
                    numeros={c.numeros}
                    marcados={marcas}
                    onClickNumero={
                      data.estado === "en_curso" ? (n) => marcarNumero(c.id, n) : undefined
                    }
                  />
                </div>
              );
            })}
          </section>

          {resultadoBingo && (
            <div
              className={`fixed bottom-6 left-1/2 -translate-x-1/2 rounded-xl border px-6 py-4 text-lg font-bold shadow-lg ${
                resultadoBingo.valido
                  ? "border-emerald-500 bg-emerald-900/60 text-emerald-200"
                  : "border-rose-600 bg-rose-900/60 text-rose-200"
              }`}
            >
              {resultadoBingo.valido
                ? `¡${patronLabel(resultadoBingo.patron).toUpperCase()} VÁLIDA! 🎉`
                : `Falso ${patronLabel(resultadoBingo.patron)} — te faltan ${resultadoBingo.faltantes} número(s)`}
            </div>
          )}

          {data.ganadores.length > 0 && (
            <section className="mt-6 rounded-xl border border-emerald-600 bg-emerald-900/30 p-5">
              <div className="mb-2 text-sm font-semibold text-emerald-300">Ganadores</div>
              <ul className="space-y-1.5">
                {data.ganadores.map((g) => {
                  const nombre =
                    data.jugadores.find((p) => p.email === g.email)?.nombre ?? g.email;
                  return (
                    <li key={g.patron} className="flex items-center justify-between text-sm">
                      <span className="text-emerald-100">
                        <span className="font-medium">{patronLabel(g.patron)}:</span> {nombre}
                      </span>
                      <span className="text-xs text-emerald-300">{fmtHora(g.cantadoAt)}</span>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}
        </>
      )}
    </main>
  );
}
