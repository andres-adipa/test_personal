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
  cartonesPorJugador: 1 | 2;
  estado: EstadoJuego;
  indiceActual: number;
  cantadosCount: number;
  jugadores: { email: string; nombre: string; joinedAt: number }[];
  cartones: {
    id: string;
    jugadorEmail: string | null;
    elegido: boolean;
    numeros: Cuadricula;
  }[];
  sorteos: { numero: number; orden: number; cantadoAt: number }[];
  marcas: { cartonId: string; numero: number; marcadoAt: number }[];
  bingos: {
    cartonId: string;
    email: string;
    valido: boolean;
    faltantes: number;
    cantadoAt: number;
    patron: Patron;
  }[];
  ganadores: { patron: Patron; cartonId: string; email: string; cantadoAt: number }[];
  esLider: boolean;
};

function patronLabel(p: Patron) {
  return PATRONES.find((x) => x.key === p)?.label ?? p;
}

function fmtHora(ts: number) {
  return new Date(ts).toLocaleTimeString("es-CL", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZone: "America/Santiago",
  });
}

export default function LiderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [identidad, , cargado] = useIdentidad();
  const [data, setData] = useState<Estado | null>(null);
  const [error, setError] = useState("");
  const [cantando, setCantando] = useState(false);

  useEffect(() => {
    if (!cargado || !identidad.email) return;
    const tick = async () => {
      try {
        const r = await fetch(`/api/juegos/${id}?email=${encodeURIComponent(identidad.email)}`);
        if (!r.ok) return;
        const j = await r.json();
        setData(j);
      } catch {}
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [id, identidad.email, cargado]);

  const jugadoresConEstado = useMemo(() => {
    if (!data) return [];
    return data.jugadores.map((p) => {
      const elegidos = data.cartones.filter((c) => c.jugadorEmail === p.email && c.elegido).length;
      return { ...p, elegidos, listo: elegidos === data.cartonesPorJugador };
    });
  }, [data]);

  const todosListos =
    !!data &&
    data.jugadores.length > 0 &&
    jugadoresConEstado.every((j) => j.listo);

  const iniciar = async () => {
    setError("");
    const r = await fetch(`/api/juegos/${id}/iniciar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: identidad.email }),
    });
    if (!r.ok) {
      const e = await r.json();
      setError(e.error ?? "Error");
    }
  };

  const cantar = async () => {
    if (!data || data.estado !== "en_curso" || cantando) return;
    setCantando(true);
    await fetch(`/api/juegos/${id}/cantar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: identidad.email }),
    });
    setTimeout(() => setCantando(false), 300);
  };

  const reiniciar = async () => {
    if (!confirm("¿Reiniciar el juego? Se regenerarán todos los cartones.")) return;
    await fetch(`/api/juegos/${id}/reiniciar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: identidad.email }),
    });
  };

  if (!cargado) return null;
  if (!identidad.email) {
    return (
      <main className="mx-auto max-w-xl px-6 py-12 text-center">
        <p className="text-zinc-300">
          Primero guarda tu email en{" "}
          <Link href="/" className="text-violet-400 underline">
            la página principal
          </Link>
          .
        </p>
      </main>
    );
  }
  if (!data) {
    return <main className="mx-auto max-w-4xl px-6 py-8 text-zinc-400">Cargando...</main>;
  }
  if (!data.esLider) {
    return (
      <main className="mx-auto max-w-xl px-6 py-12 text-center">
        <p className="text-rose-300">
          No eres el líder de este juego. Ve a{" "}
          <Link href="/" className="text-violet-400 underline">
            la página principal
          </Link>{" "}
          y entra como jugador.
        </p>
      </main>
    );
  }

  const ultimoCantado =
    data.sorteos.length > 0 ? data.sorteos[data.sorteos.length - 1].numero : null;

  return (
    <main className="mx-auto max-w-5xl px-6 py-8">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <Link href="/" className="text-xs text-zinc-400 hover:text-zinc-200">
            ← Volver
          </Link>
          <h1 className="mt-1 text-2xl font-bold text-violet-400">{data.titulo}</h1>
          <p className="text-xs text-zinc-400">
            Vista del líder · premios:{" "}
            <span className="text-zinc-200">
              {data.patrones.map(patronLabel).join(" · ")}
            </span>{" "}
            · {data.cartonesPorJugador} cartón(es) por jugador
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={reiniciar}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-rose-500 hover:text-rose-300"
          >
            Reiniciar
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-700 bg-rose-900/20 p-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      {/* Lista de jugadores */}
      <section className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800 p-4">
        <h2 className="mb-3 border-l-2 border-violet-500 pl-3 text-sm font-semibold text-zinc-200">
          Jugadores ({jugadoresConEstado.length})
        </h2>
        {jugadoresConEstado.length === 0 ? (
          <p className="text-sm text-zinc-500">Esperando jugadores...</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {jugadoresConEstado.map((p) => (
              <li key={p.email} className="flex items-center justify-between rounded-lg bg-zinc-900/40 px-3 py-2">
                <span className="text-zinc-200">
                  {p.nombre} <span className="text-xs text-zinc-500">· {p.email}</span>
                </span>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs ${
                    p.listo
                      ? "bg-emerald-500/20 text-emerald-300"
                      : "bg-amber-500/20 text-amber-300"
                  }`}
                >
                  {p.listo
                    ? `Listo (${p.elegidos}/${data.cartonesPorJugador})`
                    : `Eligiendo (${p.elegidos}/${data.cartonesPorJugador})`}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Control según estado */}
      {data.estado !== "en_curso" && data.estado !== "terminado" && (
        <section className="mb-6 rounded-xl border border-zinc-700 bg-zinc-800 p-5">
          <button
            type="button"
            onClick={iniciar}
            disabled={!todosListos}
            className="w-full rounded-lg border border-violet-600 bg-violet-600 px-6 py-3 text-base font-semibold text-white transition-colors hover:bg-violet-500 disabled:opacity-40"
          >
            {todosListos
              ? "Iniciar juego"
              : "Esperando que todos los jugadores elijan sus cartones..."}
          </button>
        </section>
      )}

      {(data.estado === "en_curso" || data.estado === "terminado") && (
        <>
          <section className="mb-4 grid gap-4 sm:grid-cols-[1fr_auto]">
            <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-5">
              <div className="mb-2 text-xs text-zinc-400">Número actual</div>
              {ultimoCantado !== null ? (
                <div className="inline-flex h-28 w-28 items-center justify-center rounded-full bg-amber-500 text-5xl font-bold text-zinc-900 shadow-lg">
                  {ultimoCantado}
                </div>
              ) : (
                <div className="text-sm text-zinc-500">Aún no has cantado ningún número</div>
              )}
              <div className="mt-3 text-xs text-zinc-400">
                {data.cantadosCount}/99 números cantados
              </div>
            </div>
            <div className="flex items-stretch">
              {data.estado === "en_curso" ? (
                <button
                  type="button"
                  onClick={cantar}
                  disabled={cantando || data.cantadosCount >= 99}
                  className="rounded-xl border border-violet-600 bg-violet-600 px-10 py-8 text-2xl font-bold text-white transition-transform hover:scale-105 hover:bg-violet-500 disabled:opacity-40"
                >
                  Cantar<br />siguiente
                </button>
              ) : (
                <div className="flex items-center justify-center rounded-xl border border-emerald-600 bg-emerald-900/30 px-10 py-8 text-center">
                  <div>
                    <div className="text-xs text-emerald-300">Juego terminado</div>
                    <div className="mt-1 text-sm text-emerald-100">
                      {data.ganadores.length} premio(s) otorgado(s)
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>

          <section className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800 p-4">
            <h2 className="mb-3 border-l-2 border-violet-500 pl-3 text-sm font-semibold text-zinc-200">
              Premios y ganadores
            </h2>
            <ul className="space-y-1.5 text-sm">
              {data.patrones.map((p) => {
                const g = data.ganadores.find((x) => x.patron === p);
                const nombre = g
                  ? data.jugadores.find((j) => j.email === g.email)?.nombre ?? g.email
                  : null;
                return (
                  <li
                    key={p}
                    className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                      g ? "bg-emerald-900/30" : "bg-zinc-900/40"
                    }`}
                  >
                    <span className="text-zinc-200">{patronLabel(p)}</span>
                    {g ? (
                      <span className="text-xs text-emerald-300">
                        ✓ {nombre} · {fmtHora(g.cantadoAt)}
                      </span>
                    ) : (
                      <span className="text-xs text-zinc-500">Pendiente</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {data.sorteos.length > 0 && (
            <section className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800 p-4">
              <h2 className="mb-3 border-l-2 border-violet-500 pl-3 text-sm font-semibold text-zinc-200">
                Historial (más recientes primero)
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {data.sorteos
                  .slice()
                  .reverse()
                  .map((s, i) => (
                    <span
                      key={s.orden}
                      className={`rounded px-2 py-1 text-xs ${
                        i === 0
                          ? "bg-amber-500 text-zinc-900 font-bold"
                          : "bg-zinc-900 text-zinc-300"
                      }`}
                    >
                      {s.numero}
                    </span>
                  ))}
              </div>
            </section>
          )}

          {data.bingos.length > 0 && (
            <section className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800 p-4">
              <h2 className="mb-3 border-l-2 border-violet-500 pl-3 text-sm font-semibold text-zinc-200">
                Intentos de bingo
              </h2>
              <ul className="space-y-1.5 text-sm">
                {data.bingos
                  .slice()
                  .reverse()
                  .map((b, i) => {
                    const nombre = data.jugadores.find((p) => p.email === b.email)?.nombre ?? b.email;
                    return (
                      <li
                        key={i}
                        className={`flex items-center justify-between rounded-lg px-3 py-2 ${
                          b.valido ? "bg-emerald-900/30" : "bg-rose-900/20"
                        }`}
                      >
                        <span className="text-zinc-200">
                          {nombre}{" "}
                          <span className="text-xs text-zinc-400">· {patronLabel(b.patron)}</span>{" "}
                          <span className="text-xs text-zinc-500">{fmtHora(b.cantadoAt)}</span>
                        </span>
                        <span
                          className={`text-xs font-medium ${
                            b.valido ? "text-emerald-300" : "text-rose-300"
                          }`}
                        >
                          {b.valido ? "✓ VÁLIDO" : `✗ Falso (faltaban ${b.faltantes})`}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            </section>
          )}

          {/* Cartones de los jugadores, con marcas visibles para auditoría */}
          <section className="rounded-xl border border-zinc-700 bg-zinc-800 p-4">
            <h2 className="mb-3 border-l-2 border-violet-500 pl-3 text-sm font-semibold text-zinc-200">
              Cartones de los jugadores
            </h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {data.cartones
                .filter((c) => c.elegido)
                .map((c) => {
                  const nombre =
                    data.jugadores.find((p) => p.email === c.jugadorEmail)?.nombre ??
                    c.jugadorEmail ??
                    "";
                  const marcas = new Set(
                    data.marcas.filter((m) => m.cartonId === c.id).map((m) => m.numero),
                  );
                  return (
                    <div key={c.id} className="rounded-lg bg-zinc-900/40 p-3">
                      <div className="mb-2 text-xs text-zinc-400">{nombre}</div>
                      <Carton
                        numeros={c.numeros}
                        marcados={marcas}
                        ultimoCantado={ultimoCantado}
                        compacto
                      />
                    </div>
                  );
                })}
            </div>
          </section>
        </>
      )}
    </main>
  );
}
