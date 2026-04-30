"use client";

import Link from "next/link";
import { use, useCallback, useEffect, useMemo, useRef, useState } from "react";
import Carton from "@/app/components/Carton";
import { useIdentidad } from "@/app/components/Identidad";
import type { Cuadricula, Patron, EstadoJuego } from "@/lib/types";
import { PATRONES, chequearPatron, chequearDosCartonesLlenos } from "@/lib/patrones";

type OrdenHistorial = "aparicion" | "numero";

type Estado = {
  id: string;
  titulo: string;
  lider: string;
  patrones: Patron[];
  mostrarPatron: boolean;
  historialVisibleJugador: boolean;
  avisarNumerosPasados: boolean;
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
  numerosNoCantados: number[];
  marcas: { cartonId: string; numero: number; marcadoAt: number }[];
  bingos: { cartonId: string; email: string; valido: boolean; faltantes: number; cantadoAt: number; patron: Patron }[];
  ganadores: { patron: Patron; cartonId: string; email: string; cantadoAt: number; indiceActualGanado: number }[];
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
  const miEmail = identidad.email;
  const [data, setData] = useState<Estado | null>(null);
  const [seleccion, setSeleccion] = useState<string[]>([]);
  const [resultadoBingo, setResultadoBingo] = useState<{
    valido: boolean;
    faltantes: number;
    patron: Patron;
  } | null>(null);
  const [mensajeUnion, setMensajeUnion] = useState("");
  const [ordenHistorial, setOrdenHistorial] = useState<OrdenHistorial>("aparicion");
  const ultimoJsonRef = useRef<string>("");
  // Marcas optimistas: lo que el usuario tocó y aún no confirma el servidor.
  const [marcasOpt, setMarcasOpt] = useState<
    Map<string, { add: Set<number>; remove: Set<number> }>
  >(new Map());

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
    // 2.5s en lugar de 1s: con 45+ jugadores reduce GETs de ~45/s a ~18/s,
    // alivia carga sobre Postgres y Cloud Run sin que la UX se sienta lenta
    // (las acciones del propio jugador hacen refetch inmediato).
    const t = setInterval(refetch, 2500);
    return () => clearInterval(t);
  }, [cargado, miEmail, refetch]);

  useEffect(() => {
    if (!data || !miEmail || !identidad.nombre) return;
    const yaEstoy = data.jugadores.some((p) => p.email === miEmail);
    const fueOfrecido = data.cartones.some((c) => c.ofrecidoA === miEmail);
    if (!yaEstoy || !fueOfrecido) {
      if (data.estado === "lobby" || data.estado === "eligiendo") {
        fetch(`/api/bingo/juegos/${id}/unirse`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email: miEmail, nombre: identidad.nombre }),
        }).then(async (r) => {
          if (!r.ok) {
            const e = await r.json();
            setMensajeUnion(e.error ?? "No se pudo unir");
          }
        });
      }
    }
  }, [data, miEmail, identidad.nombre, id]);

  const misCartones = useMemo(() => (data ? data.cartones : []), [data]);
  const opciones = misCartones.filter((c) => !c.elegido && c.ofrecidoA === miEmail);
  const elegidos = misCartones.filter((c) => c.elegido && c.jugadorEmail === miEmail);

  const ultimoCantado =
    data && data.sorteos.length > 0 ? data.sorteos[data.sorteos.length - 1].numero : null;

  const cantados = useMemo(
    () => new Set((data?.sorteos ?? []).map((s) => s.numero)),
    [data],
  );

  const misMarcasPorCarton = useMemo(() => {
    const m = new Map<string, Set<number>>();
    if (!data) return m;
    for (const marca of data.marcas) {
      if (!m.has(marca.cartonId)) m.set(marca.cartonId, new Set());
      m.get(marca.cartonId)!.add(marca.numero);
    }
    return m;
  }, [data]);

  const marcasEfectivasPorCarton = useMemo(() => {
    const m = new Map<string, Set<number>>();
    for (const c of elegidos) {
      const server = misMarcasPorCarton.get(c.id) ?? new Set<number>();
      const opt = marcasOpt.get(c.id);
      const eff = new Set(server);
      if (opt) {
        for (const n of opt.add) eff.add(n);
        for (const n of opt.remove) eff.delete(n);
      }
      m.set(c.id, eff);
    }
    return m;
  }, [elegidos, misMarcasPorCarton, marcasOpt]);

  // Reconciliación: cuando el servidor refleja el cambio optimista, se quita.
  useEffect(() => {
    setMarcasOpt((prev) => {
      if (prev.size === 0) return prev;
      let changed = false;
      const next = new Map(prev);
      for (const [cartonId, { add, remove }] of prev) {
        const server = misMarcasPorCarton.get(cartonId) ?? new Set<number>();
        const nAdd = new Set<number>();
        const nRem = new Set<number>();
        for (const n of add) if (!server.has(n)) nAdd.add(n);
        for (const n of remove) if (server.has(n)) nRem.add(n);
        if (nAdd.size !== add.size || nRem.size !== remove.size) changed = true;
        if (nAdd.size === 0 && nRem.size === 0) next.delete(cartonId);
        else next.set(cartonId, { add: nAdd, remove: nRem });
      }
      return changed ? next : prev;
    });
  }, [misMarcasPorCarton]);

  const todasMisMarcas = useMemo(() => {
    const s = new Set<number>();
    for (const c of elegidos) {
      const m = marcasEfectivasPorCarton.get(c.id);
      if (m) for (const n of m) s.add(n);
    }
    return s;
  }, [elegidos, marcasEfectivasPorCarton]);

  const numerosEnMisCartones = useMemo(() => {
    const s = new Set<number>();
    for (const c of elegidos) for (const fila of c.numeros) for (const n of fila) if (n !== null) s.add(n);
    return s;
  }, [elegidos]);

  const numerosNoMarcados = useMemo(() => {
    const out: number[] = [];
    for (const s of data?.sorteos ?? []) {
      if (numerosEnMisCartones.has(s.numero) && !todasMisMarcas.has(s.numero)) {
        out.push(s.numero);
      }
    }
    return out;
  }, [data, numerosEnMisCartones, todasMisMarcas]);

  const historialOrdenado = useMemo(() => {
    const copy = (data?.sorteos ?? []).slice();
    if (ordenHistorial === "numero") copy.sort((a, b) => a.numero - b.numero);
    else copy.sort((a, b) => b.orden - a.orden);
    return copy;
  }, [data, ordenHistorial]);

  const premiosPendientes = useMemo(() => {
    if (!data) return [] as Patron[];
    return data.patrones.filter((p) => {
      const ganadoresP = data.ganadores.filter((g) => g.patron === p);
      if (ganadoresP.length === 0) return true;
      const primer = ganadoresP[0];
      if (primer.indiceActualGanado !== data.indiceActual) return false;
      if (ganadoresP.some((g) => g.email === miEmail)) return false;
      return true;
    });
  }, [data, miEmail]);

  if (!cargado) return null;
  if (!miEmail || !identidad.nombre) {
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
      body: JSON.stringify({ email: miEmail, cartonIds: seleccion }),
    });
    setSeleccion([]);
    await refetch();
  };

  const marcarNumero = (cartonId: string, numero: number) => {
    if (data.estado !== "en_curso") return;
    const efectivas = marcasEfectivasPorCarton.get(cartonId) ?? new Set<number>();
    const yaMarcado = efectivas.has(numero);
    setMarcasOpt((prev) => {
      const next = new Map(prev);
      const cur = next.get(cartonId) ?? { add: new Set<number>(), remove: new Set<number>() };
      const add = new Set(cur.add);
      const remove = new Set(cur.remove);
      if (yaMarcado) {
        add.delete(numero);
        remove.add(numero);
      } else {
        remove.delete(numero);
        add.add(numero);
      }
      next.set(cartonId, { add, remove });
      return next;
    });
    const revertir = () => {
      setMarcasOpt((prev) => {
        const cur = prev.get(cartonId);
        if (!cur) return prev;
        const add = new Set(cur.add);
        const remove = new Set(cur.remove);
        if (yaMarcado) remove.delete(numero);
        else add.delete(numero);
        const next = new Map(prev);
        if (add.size === 0 && remove.size === 0) next.delete(cartonId);
        else next.set(cartonId, { add, remove });
        return next;
      });
    };
    fetch(`/api/bingo/juegos/${id}/marcar`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: miEmail, cartonId, numero, desmarcar: yaMarcado }),
    })
      .then((r) => {
        if (!r.ok) revertir();
      })
      .catch(revertir);
  };

  const cantarBingo = async (cartonId: string, patron: Patron) => {
    setResultadoBingo(null);
    const r = await fetch(`/api/bingo/juegos/${id}/bingo`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email: miEmail, cartonId, patron }),
    });
    const j = await r.json();
    setResultadoBingo({ valido: !!j.valido, faltantes: j.faltantes ?? 0, patron });
    setTimeout(() => setResultadoBingo(null), 6000);
    await refetch();
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
          <div className="text-2xl font-bold text-zinc-100">{data.cantadosCount}/90</div>
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
              const gs = data.ganadores.filter((x) => x.patron === p);
              const nombres = gs.map(
                (g) => data.jugadores.find((j) => j.email === g.email)?.nombre ?? g.email,
              );
              return (
                <li key={p}>
                  <span className="font-medium">{patronLabel(p)}</span>{" "}
                  <span className="text-violet-300">— {patronDescripcion(p)}</span>
                  {nombres.length > 0 && (
                    <span className="ml-2 text-xs text-emerald-300">
                      ✓ {nombres.join(", ")}
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
                  <div
                    key={ultimoCantado}
                    className="inline-flex h-20 w-20 items-center justify-center rounded-full bg-amber-500 text-4xl font-bold text-zinc-900 shadow-lg"
                  >
                    {ultimoCantado}
                  </div>
                ) : (
                  <span className="text-sm text-zinc-500">—</span>
                )}
              </div>
            </div>
            {data.historialVisibleJugador && data.sorteos.length > 1 && (
              <div className="mt-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-xs text-zinc-500">Historial de números cantados:</span>
                  <div className="flex overflow-hidden rounded-lg border border-zinc-700">
                    {(["aparicion", "numero"] as OrdenHistorial[]).map((o) => (
                      <button
                        key={o}
                        type="button"
                        onClick={() => setOrdenHistorial(o)}
                        className={`px-3 py-1 text-xs transition-colors ${
                          ordenHistorial === o
                            ? "bg-violet-600 text-white"
                            : "bg-zinc-800 text-zinc-400 hover:text-zinc-200"
                        }`}
                      >
                        {o === "aparicion" ? "Aparición" : "Número"}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
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
              </div>
            )}
            {!data.historialVisibleJugador && (
              <div className="mt-3 text-xs text-zinc-500 italic">
                El historial de números cantados no está visible para los jugadores en este juego.
              </div>
            )}
            {data.avisarNumerosPasados && numerosNoMarcados.length > 0 && (
              <div className="mt-3 rounded-lg border border-rose-700/40 bg-rose-900/20 px-3 py-2 text-xs">
                <span className="font-medium text-rose-300">Se te pasaron {numerosNoMarcados.length} número(s):</span>{" "}
                <span className="text-rose-200">{numerosNoMarcados.join(", ")}</span>
                <span className="ml-1 text-rose-400">— márcalos en tu cartón</span>
              </div>
            )}
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

          <section className="space-y-4">
            {elegidos.map((c) => {
              const marcas = marcasEfectivasPorCarton.get(c.id) ?? new Set<number>();
              const puedeGanar = (patron: Patron): boolean => {
                if (patron === "dos_cartones_llenos") {
                  return chequearDosCartonesLlenos(
                    elegidos.map((x) => x.numeros),
                    todasMisMarcas,
                  ).gana;
                }
                return chequearPatron(c.numeros, marcas, patron).gana;
              };
              return (
                <div key={c.id} className="rounded-xl border border-zinc-700 bg-zinc-800 p-4">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-xs text-zinc-400">
                      Tu cartón · marca haciendo clic en los números que se van cantando
                    </span>
                    {data.estado === "en_curso" && premiosPendientes.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {premiosPendientes.map((p) => {
                          const listo = puedeGanar(p);
                          return (
                            <button
                              key={p}
                              type="button"
                              disabled={!listo}
                              onClick={() => cantarBingo(c.id, p)}
                              title={listo ? "Cantar este premio" : "Aún te faltan números por marcar"}
                              className={`rounded-lg border px-4 py-2 text-xs font-bold uppercase transition-transform ${
                                listo
                                  ? "border-amber-500 bg-amber-500 text-zinc-900 hover:scale-105 cursor-pointer"
                                  : "border-zinc-700 bg-zinc-800 text-zinc-500 cursor-not-allowed"
                              }`}
                            >
                              ¡{patronLabel(p)}!
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <Carton
                    numeros={c.numeros}
                    marcados={marcas}
                    cantados={data.avisarNumerosPasados ? cantados : undefined}
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
                {data.patrones
                  .filter((p) => data.ganadores.some((g) => g.patron === p))
                  .map((p) => {
                    const gs = data.ganadores
                      .filter((g) => g.patron === p)
                      .sort((a, b) => a.cantadoAt - b.cantadoAt);
                    return (
                      <li key={p} className="text-sm">
                        <span className="font-medium text-emerald-100">{patronLabel(p)}:</span>{" "}
                        <span className="text-emerald-100">
                          {gs
                            .map((g) => {
                              const nombre =
                                data.jugadores.find((p2) => p2.email === g.email)?.nombre ??
                                g.email;
                              return `${nombre} (${fmtHora(g.cantadoAt)})`;
                            })
                            .join(", ")}
                        </span>
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
