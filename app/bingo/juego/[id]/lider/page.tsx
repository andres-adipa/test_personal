"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Carton from "@/app/components/Carton";
import { useIdentidad } from "@/app/components/Identidad";
import type { Cuadricula, Patron, EstadoJuego } from "@/lib/types";
import { PATRONES } from "@/lib/patrones";

type OrdenHistorial = "aparicion" | "numero";

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
  numerosNoCantados: number[];
  marcas: { cartonId: string; numero: number; marcadoAt: number }[];
  bingos: {
    cartonId: string;
    email: string;
    valido: boolean;
    faltantes: number;
    cantadoAt: number;
    patron: Patron;
  }[];
  ganadores: { patron: Patron; cartonId: string; email: string; cantadoAt: number; indiceActualGanado: number }[];
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
  const miEmail = identidad.email;
  const [data, setData] = useState<Estado | null>(null);
  const [error, setError] = useState("");
  const [cantandoPendiente, setCantandoPendiente] = useState(false);
  const [iniciando, setIniciando] = useState(false);
  const [terminando, setTerminando] = useState(false);
  const [reiniciando, setReiniciando] = useState(false);
  const [ordenHistorial, setOrdenHistorial] = useState<OrdenHistorial>("aparicion");
  const ultimoJsonRef = useRef<string>("");
  const targetCountRef = useRef<number | null>(null);

  const refetch = useCallback(async () => {
    if (!miEmail) return;
    try {
      const r = await fetch(`/api/bingo/juegos/${id}?email=${encodeURIComponent(miEmail)}`);
      if (!r.ok) return;
      const texto = await r.text();
      if (texto === ultimoJsonRef.current) return;
      ultimoJsonRef.current = texto;
      setData(JSON.parse(texto));
    } catch {}
  }, [id, miEmail]);

  useEffect(() => {
    if (!cargado || !miEmail) return;
    refetch();
    const t = setInterval(refetch, 1000);
    return () => clearInterval(t);
  }, [cargado, miEmail, refetch]);

  const historialOrdenado = useMemo(() => {
    const copy = (data?.sorteos ?? []).slice();
    if (ordenHistorial === "numero") copy.sort((a, b) => a.numero - b.numero);
    else copy.sort((a, b) => b.orden - a.orden);
    return copy;
  }, [data, ordenHistorial]);

  const ultimoPremioGanado = useMemo(() => {
    if (!data || data.patrones.length === 0) return false;
    const ultimo = data.patrones[data.patrones.length - 1];
    return data.ganadores.some((g) => g.patron === ultimo);
  }, [data]);

  const jugadoresConEstado = useMemo(() => {
    if (!data) return [];
    return data.jugadores.map((p) => {
      const elegidos = data.cartones.filter(
        (c) => c.jugadorEmail === p.email && c.elegido,
      ).length;
      return { ...p, elegidos, listo: elegidos === data.cartonesPorJugador };
    });
  }, [data]);

  const todosListos =
    !!data && data.jugadores.length > 0 && jugadoresConEstado.every((j) => j.listo);

  const iniciar = async () => {
    if (iniciando) return;
    setError("");
    setIniciando(true);
    try {
      const r = await fetch(`/api/bingo/juegos/${id}/iniciar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: miEmail }),
      });
      if (!r.ok) {
        const e = await r.json();
        setError(e.error ?? "Error");
      }
      await refetch();
    } finally {
      setIniciando(false);
    }
  };

  const cantar = async () => {
    if (!data || data.estado !== "en_curso" || cantandoPendiente) return;
    targetCountRef.current = data.sorteos.length + 1;
    setCantandoPendiente(true);
    try {
      await fetch(`/api/bingo/juegos/${id}/cantar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: miEmail }),
      });
      await refetch();
    } catch {}
  };

  // Libera el spinner cuando data refleja el nuevo sorteo (con safety timeout).
  useEffect(() => {
    if (!cantandoPendiente) return;
    const target = targetCountRef.current;
    if (data && target !== null && data.sorteos.length >= target) {
      targetCountRef.current = null;
      setCantandoPendiente(false);
      return;
    }
    const t = setTimeout(() => {
      targetCountRef.current = null;
      setCantandoPendiente(false);
    }, 4000);
    return () => clearTimeout(t);
  }, [cantandoPendiente, data]);

  const cantando = cantandoPendiente;

  const reiniciar = async () => {
    if (reiniciando) return;
    if (!confirm("¿Reiniciar el juego? Se regenerarán todos los cartones.")) return;
    setReiniciando(true);
    try {
      await fetch(`/api/bingo/juegos/${id}/reiniciar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: miEmail }),
      });
      await refetch();
    } finally {
      setReiniciando(false);
    }
  };

  const terminar = async () => {
    if (terminando) return;
    if (!confirm("¿Terminar el juego? Se cerrará la posibilidad de empate del último premio.")) return;
    setTerminando(true);
    try {
      await fetch(`/api/bingo/juegos/${id}/terminar`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ email: miEmail }),
      });
      await refetch();
    } finally {
      setTerminando(false);
    }
  };

  if (!cargado) return null;
  if (!miEmail) {
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
            disabled={reiniciando}
            className="rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-rose-500 hover:text-rose-300 active:scale-95 disabled:opacity-50"
          >
            {reiniciando ? "Reiniciando..." : "Reiniciar"}
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-4 rounded-lg border border-rose-700 bg-rose-900/20 p-3 text-sm text-rose-300">
          {error}
        </div>
      )}

      <section className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800 p-4">
        <h2 className="mb-3 border-l-2 border-violet-500 pl-3 text-sm font-semibold text-zinc-200">
          Jugadores ({jugadoresConEstado.length})
        </h2>
        {jugadoresConEstado.length === 0 ? (
          <p className="text-sm text-zinc-500">Esperando jugadores...</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {jugadoresConEstado.map((p) => (
              <li
                key={p.email}
                className="flex items-center justify-between rounded-lg bg-zinc-900/40 px-3 py-2"
              >
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

      {data.estado !== "en_curso" && data.estado !== "terminado" && (
        <section className="mb-6 rounded-xl border border-zinc-700 bg-zinc-800 p-5">
          <button
            type="button"
            onClick={iniciar}
            disabled={!todosListos || iniciando}
            className="w-full rounded-lg border border-violet-600 bg-violet-600 px-6 py-3 text-base font-semibold text-white transition-all duration-150 hover:bg-violet-500 active:scale-[0.98] disabled:opacity-40"
          >
            {iniciando
              ? "Iniciando..."
              : todosListos
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
              {cantando ? (
                <div className="inline-flex h-28 w-28 items-center justify-center rounded-full bg-amber-500/30 text-amber-200 shadow-lg ring-2 ring-amber-400/60 animate-pulse">
                  <svg className="h-10 w-10 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                    <circle cx="12" cy="12" r="10" className="opacity-25" />
                    <path d="M4 12a8 8 0 018-8" className="opacity-90" strokeLinecap="round" />
                  </svg>
                </div>
              ) : ultimoCantado !== null ? (
                <div
                  key={ultimoCantado}
                  className="inline-flex h-28 w-28 items-center justify-center rounded-full bg-amber-500 text-5xl font-bold text-zinc-900 shadow-lg"
                >
                  {ultimoCantado}
                </div>
              ) : (
                <div className="text-sm text-zinc-500">Aún no has cantado ningún número</div>
              )}
              <div className="mt-3 text-xs text-zinc-400">
                {data.cantadosCount}/90 números cantados
              </div>
            </div>
            <div className="flex items-stretch">
              {data.estado === "en_curso" ? (
                ultimoPremioGanado ? (
                  <button
                    type="button"
                    onClick={terminar}
                    disabled={terminando}
                    className="flex min-h-[7.5rem] min-w-[13rem] items-center justify-center rounded-xl border border-rose-600 bg-rose-600 px-10 py-8 text-2xl font-bold text-white transition-all duration-150 hover:scale-105 hover:bg-rose-500 active:scale-95 disabled:opacity-60"
                  >
                    {terminando ? (
                      <span className="flex flex-col items-center gap-1">
                        <svg className="h-7 w-7 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <circle cx="12" cy="12" r="10" className="opacity-25" />
                          <path d="M4 12a8 8 0 018-8" strokeLinecap="round" />
                        </svg>
                        <span className="text-base">Terminando...</span>
                      </span>
                    ) : (
                      <span className="text-center leading-tight">Terminar<br />juego</span>
                    )}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={cantar}
                    disabled={cantando || data.cantadosCount >= 90}
                    className="flex min-h-[7.5rem] min-w-[13rem] items-center justify-center rounded-xl border border-violet-600 bg-violet-600 px-10 py-8 text-2xl font-bold text-white transition-all duration-150 hover:scale-105 hover:bg-violet-500 active:scale-95 disabled:opacity-60"
                  >
                    {cantando ? (
                      <span className="flex flex-col items-center gap-1">
                        <svg className="h-7 w-7 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                          <circle cx="12" cy="12" r="10" className="opacity-25" />
                          <path d="M4 12a8 8 0 018-8" strokeLinecap="round" />
                        </svg>
                        <span className="text-base">Cantando...</span>
                      </span>
                    ) : (
                      <span className="text-center leading-tight">Cantar<br />siguiente</span>
                    )}
                  </button>
                )
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

          {data.estado === "terminado" && data.numerosNoCantados && data.numerosNoCantados.length > 0 && (
            <section className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800 p-4">
              <h2 className="mb-3 border-l-2 border-violet-500 pl-3 text-sm font-semibold text-zinc-200">
                Números no cantados ({data.numerosNoCantados.length}){" "}
                <span className="ml-2 text-xs font-normal text-zinc-500">
                  en el orden en que hubieran salido
                </span>
              </h2>
              <div className="flex flex-wrap gap-1.5">
                {data.numerosNoCantados.map((n, i) => (
                  <span
                    key={i}
                    className="rounded bg-zinc-900/60 px-2 py-1 text-xs text-zinc-400 border border-zinc-800"
                  >
                    {n}
                  </span>
                ))}
              </div>
            </section>
          )}

          <section className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800 p-4">
            <h2 className="mb-3 border-l-2 border-violet-500 pl-3 text-sm font-semibold text-zinc-200">
              Premios y ganadores
            </h2>
            <ul className="space-y-1.5 text-sm">
              {data.patrones.map((p) => {
                const gs = data.ganadores
                  .filter((x) => x.patron === p)
                  .sort((a, b) => a.cantadoAt - b.cantadoAt);
                const ventanaAbierta =
                  gs.length > 0 &&
                  gs[0].indiceActualGanado === data.indiceActual &&
                  data.estado === "en_curso";
                return (
                  <li
                    key={p}
                    className={`rounded-lg px-3 py-2 ${
                      gs.length > 0 ? "bg-emerald-900/30" : "bg-zinc-900/40"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-zinc-200">
                        {patronLabel(p)}
                        {ventanaAbierta && (
                          <span className="ml-2 rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-medium text-amber-300">
                            Empate abierto
                          </span>
                        )}
                      </span>
                      {gs.length === 0 && (
                        <span className="text-xs text-zinc-500">Pendiente</span>
                      )}
                    </div>
                    {gs.length > 0 && (
                      <ul className="mt-1 space-y-0.5 pl-3 text-xs text-emerald-200">
                        {gs.map((g, i) => {
                          const nombre =
                            data.jugadores.find((j) => j.email === g.email)?.nombre ??
                            g.email;
                          return (
                            <li key={i}>
                              {i + 1}. {nombre}{" "}
                              <span className="text-emerald-400">({fmtHora(g.cantadoAt)})</span>
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </section>

          {data.sorteos.length > 0 && (
            <section className="mb-4 rounded-xl border border-zinc-700 bg-zinc-800 p-4">
              <div className="mb-3 flex items-center justify-between">
                <h2 className="border-l-2 border-violet-500 pl-3 text-sm font-semibold text-zinc-200">
                  Historial de números cantados
                </h2>
                <div className="flex overflow-hidden rounded-lg border border-zinc-700">
                  {(["aparicion", "numero"] as OrdenHistorial[]).map((o) => (
                    <button
                      key={o}
                      type="button"
                      onClick={() => setOrdenHistorial(o)}
                      className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                        ordenHistorial === o
                          ? "bg-violet-600 text-white"
                          : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                      }`}
                    >
                      {o === "aparicion" ? "Por aparición" : "Por número"}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {historialOrdenado.map((s) => (
                  <span
                    key={s.orden}
                    className={`rounded px-2 py-1 text-xs ${
                      s.numero === ultimoCantado
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
                    const nombre =
                      data.jugadores.find((p) => p.email === b.email)?.nombre ?? b.email;
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
