"use client";

import Link from "next/link";
import { use, useEffect, useRef, useState } from "react";
import IdentidadForm, { useIdentidad } from "@/app/components/Identidad";
import Tablero, { type BarcoVisible } from "@/app/battleship/components/Tablero";
import BannerRevelado from "@/app/battleship/components/BannerRevelado";
import { coordLabel } from "@/lib/battleship/coords";
import { calcularPodio, type ItemPodio } from "@/lib/battleship/podio";

type Bomba = { email: string; fila: number; col: number; ronda: number; lanzadaAt: number };

const POLL_FREEZE_MS = 1500;

type EventoHit = {
  atacante: string;
  atacanteNombre: string;
  victima: string;
  victimaNombre: string;
  barcoId: string;
  fila: number;
  col: number;
  hundeBarco: boolean;
};

type EventoHerencia = {
  hundidor: string;
  hundidorNombre: string;
  victima: string;
  victimaNombre: string;
  celdasGanadas: number;
};

type EventoRonda = {
  ronda: number;
  hits: EventoHit[];
  fails: { atacante: string; atacanteNombre: string; fila: number; col: number }[];
  herencias: EventoHerencia[];
  eliminados: string[];
};

type Estado = {
  id: string;
  titulo: string;
  lider: string;
  config: { barcosPorJugador: number; tamanoBarco: number; permitirEspectador: boolean; robaInformacion: boolean; liderJugador: boolean; autoLanzar: boolean; densidad?: "super_denso" | "denso" | "normal" | "tranquilo" };
  estado: "lobby" | "en_ronda" | "revelando" | "terminado";
  tablero: { ancho: number; alto: number } | null;
  rondaActual: number;
  jugadores: { email: string; nombre: string; eliminado: boolean }[];
  barcos: BarcoVisible[];
  bombas: { email: string; fila: number; col: number; ronda: number; lanzadaAt: number }[];
  hits: { fila: number; col: number; ronda: number; barcoId: string | null }[];
  hundidos: { barcoId: string; ronda: number }[];
  eventosPorRonda: EventoRonda[];
  bombasRondaActualCount: number;
  bombaPropiaRondaActual: Bomba | null;
  totalCeldasBarcos: number;
  totalHitsUnicos: number;
  revelandoStartedAt: number | null;
  cuentaAtrasIniciadaAt: number | null;
  esLider: boolean;
  estoyEliminado: boolean;
  esEspectador: boolean;
};

const COUNTDOWN_MS = 3000;

export default function LiderBattleshipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [identidad, guardar, cargado] = useIdentidad();
  const [data, setData] = useState<Estado | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [unidoComoJugador, setUnidoComoJugador] = useState(false);
  const [now, setNow] = useState(() => Date.now());
  const lastActionAt = useRef(0);

  useEffect(() => {
    if (!cargado || !identidad.email) return;
    const tick = async () => {
      try {
        const r = await fetch(`/api/battleship/juegos/${id}?email=${encodeURIComponent(identidad.email)}`);
        if (!r.ok) return;
        const j = await r.json();
        if (Date.now() - lastActionAt.current < POLL_FREEZE_MS) return;
        setData(j);
      } catch {}
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [id, identidad.email, cargado]);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

  // Auto-unirse como jugador si la sala tiene "Líder jugador" activo
  useEffect(() => {
    if (!data || unidoComoJugador || !identidad.email) return;
    if (!data.config.liderJugador) return;
    if (data.estado !== "lobby") return;
    const yaEsta = data.jugadores.some((p) => p.email === identidad.email);
    if (yaEsta) {
      setUnidoComoJugador(true);
      return;
    }
    fetch(`/api/battleship/juegos/${id}/unirse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identidad.email, nombre: identidad.nombre }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error);
        else setUnidoComoJugador(true);
      })
      .catch(() => {});
  }, [data, identidad, id, unidoComoJugador]);

  if (!cargado) return null;

  if (!identidad.email) {
    return (
      <main className="mx-auto max-w-md px-6 py-8">
        <Link href="/battleship" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Salas
        </Link>
        <h1 className="mb-4 mt-1 text-xl font-bold text-violet-300">Identifícate como líder</h1>
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
          No eres el líder de esta sala.
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

  const jugadoresActivos = data.jugadores.filter((p) => !p.eliminado);
  const nombrePorEmail: Record<string, string> = {};
  for (const p of data.jugadores) nombrePorEmail[p.email] = p.nombre;

  const statsPorJugador = new Map<string, { hits: number; hundimientos: number }>();
  for (const ev of data.eventosPorRonda) {
    for (const h of ev.hits) {
      const cur = statsPorJugador.get(h.atacante) ?? { hits: 0, hundimientos: 0 };
      cur.hits++;
      if (h.hundeBarco) cur.hundimientos++;
      statsPorJugador.set(h.atacante, cur);
    }
  }
  const podio: ItemPodio[] = calcularPodio(
    data.jugadores,
    data.eventosPorRonda,
    statsPorJugador,
  );

  // Modo "líder jugador": el líder participa hasta que lo eliminen
  const liderJuegaVivo =
    !!data.config.liderJugador && !data.estoyEliminado && !!data.jugadores.find((p) => p.email === identidad.email);
  const fasePuedeBombardear = liderJuegaVivo && data.estado === "en_ronda";

  const lanzarBomba = async (fila: number, col: number) => {
    setError(null);
    const propiaPrev = data.bombaPropiaRondaActual;
    const nueva: Bomba = {
      email: identidad.email,
      fila,
      col,
      ronda: data.rondaActual,
      lanzadaAt: Date.now(),
    };
    lastActionAt.current = Date.now();
    setData((d) => {
      if (!d) return d;
      const otras = d.bombas.filter(
        (b) => !(b.email === identidad.email && b.ronda === d.rondaActual),
      );
      return {
        ...d,
        bombaPropiaRondaActual: nueva,
        bombas: [...otras, nueva],
        bombasRondaActualCount: propiaPrev
          ? d.bombasRondaActualCount
          : d.bombasRondaActualCount + 1,
      };
    });
    const r = await fetch(`/api/battleship/juegos/${id}/bomba`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identidad.email, fila, col }),
    });
    const j = await r.json();
    if (!r.ok) setError(j.error ?? "Error");
  };

  return (
    <main className="mx-auto max-w-7xl px-3 py-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/battleship" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Salas
          </Link>
          <h1 className="text-lg font-bold text-violet-300">{data.titulo}</h1>
          <p className="text-xs text-zinc-500">
            Líder · {data.jugadores.length} jugador(es) · estado: {data.estado}
            {data.estado === "en_ronda" && ` · ronda ${data.rondaActual}`}
            {data.tablero && ` · mapa ${data.tablero.ancho}×${data.tablero.alto}`}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {data.estado === "lobby" && (
            <button
              type="button"
              disabled={data.jugadores.length === 0}
              onClick={() => accion("iniciar")}
              className="rounded-lg border border-emerald-600 bg-emerald-600/20 px-3 py-2 text-sm font-medium text-emerald-200 hover:bg-emerald-600/40 disabled:opacity-40"
            >
              Iniciar juego
            </button>
          )}
          {data.estado === "en_ronda" && (
            <button
              type="button"
              onClick={() => accion("cerrar")}
              className="rounded-lg border border-fuchsia-600 bg-fuchsia-600/20 px-3 py-2 text-sm font-medium text-fuchsia-200 hover:bg-fuchsia-600/40"
            >
              Cerrar ronda y revelar ({data.bombasRondaActualCount}/{jugadoresActivos.length})
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

      {(() => {
        const etapa = computarEtapaLider(data, now, liderJuegaVivo);
        return etapa ? (
          <div
            className={`mb-3 rounded-2xl border-2 px-5 py-4 text-center shadow-lg ${etapa.clases}`}
          >
            <div className="text-[11px] uppercase tracking-widest opacity-70">
              {etapa.subtitulo}
            </div>
            <div className="mt-0.5 text-2xl font-extrabold uppercase tracking-wide sm:text-3xl">
              {etapa.titulo}
            </div>
            {etapa.detalle && (
              <div className="mt-1 text-xs opacity-90">{etapa.detalle}</div>
            )}
          </div>
        ) : null;
      })()}

      <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
        {/* Columna principal */}
        <div>
          <div className="mb-3 rounded-xl border border-zinc-700 bg-zinc-800 p-3">
            <h2 className="mb-2 text-xs font-semibold text-zinc-300">Jugadores</h2>
            <div className="flex flex-wrap gap-2 text-xs">
              {data.jugadores.length === 0 && (
                <span className="text-zinc-500">Esperando jugadores...</span>
              )}
              {data.jugadores.map((p) => (
                <span
                  key={p.email}
                  className={`rounded border px-2 py-1 ${
                    p.eliminado
                      ? "border-zinc-700 bg-zinc-900 text-zinc-500 line-through"
                      : "border-zinc-600 bg-zinc-900 text-zinc-200"
                  }`}
                >
                  {p.nombre}
                </span>
              ))}
            </div>
          </div>

          {liderJuegaVivo && (
            <div className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-violet-700 bg-violet-950/30 p-2 text-xs">
              <span className="text-violet-200">
                Modo Líder Jugador · {data.estado === "en_ronda" && data.bombaPropiaRondaActual
                  ? `Tu bomba: ${coordLabel(data.bombaPropiaRondaActual.fila, data.bombaPropiaRondaActual.col)} · click otra celda para cambiar`
                  : data.estado === "en_ronda"
                    ? "Click una celda para tirar tu bomba"
                    : "Esperando ronda"}
              </span>
            </div>
          )}
          {data.estoyEliminado && (
            <div className="mb-2 rounded-lg border border-amber-700 bg-amber-950/40 p-2 text-xs text-amber-200">
              🪦 Tu barco fue hundido. Pasaste a modo solo-líder y ves todo el mapa.
            </div>
          )}

          {data.tablero && (
            <Tablero
              ancho={data.tablero.ancho}
              alto={data.tablero.alto}
              barcosVisibles={data.barcos}
              hits={data.hits}
              bombasVisibles={data.bombas}
              miEmail={identidad.email}
              rondaActual={data.rondaActual}
              bombaPropiaActual={liderJuegaVivo ? data.bombaPropiaRondaActual : null}
              fasePuedeColocar={false}
              fasePuedeBombardear={fasePuedeBombardear}
              onBomba={fasePuedeBombardear ? lanzarBomba : undefined}
              esLider={!liderJuegaVivo}
              mostrarNombres={!liderJuegaVivo}
              nombrePorEmail={nombrePorEmail}
            />
          )}

          <div className="mt-3 text-xs text-zinc-400">
            Hits {data.totalHitsUnicos}/{data.totalCeldasBarcos} · Hundidos{" "}
            {data.hundidos.length}/{data.barcos.length} · Activos{" "}
            {jugadoresActivos.length}/{data.jugadores.length}
          </div>
        </div>

        {/* Sidebar: historial de rondas */}
        <aside className="rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-xs">
          {data.eventosPorRonda.length > 0 && data.estado !== "terminado" && (
            <div className="mb-3">
              <BannerRevelado
                evento={data.eventosPorRonda[data.eventosPorRonda.length - 1]}
                jugadores={data.jugadores}
                veTodo={!liderJuegaVivo}
                etiqueta={`Resultados ronda ${data.eventosPorRonda[data.eventosPorRonda.length - 1].ronda}`}
              />
            </div>
          )}
          <h2 className="mb-2 border-l-2 border-violet-500 pl-3 font-semibold text-zinc-200">
            Historial de rondas
          </h2>
          {data.eventosPorRonda.length === 0 && data.estado !== "terminado" && (
            <p className="text-zinc-500">Sin rondas reveladas todavía.</p>
          )}
          <div className="max-h-[75vh] space-y-3 overflow-auto">
            {data.estado === "terminado" && <PanelGanadorLider podio={podio} />}
            {[...data.eventosPorRonda].reverse().map((ev) => (
              <div key={ev.ronda} className="rounded border border-zinc-700 bg-zinc-900 p-2">
                <div className="mb-1 flex items-center justify-between">
                  <span className="font-semibold text-violet-300">Ronda {ev.ronda}</span>
                  <span className="text-zinc-500">
                    {ev.hits.length} hit(s) · {ev.fails.length} fallo(s)
                  </span>
                </div>
                {ev.hits.length === 0 ? (
                  <p className="text-zinc-500">Sin hits esta ronda.</p>
                ) : (
                  <ul className="space-y-1">
                    {ev.hits.map((h, i) => (
                      <li
                        key={i}
                        className="battleship-fade-in leading-tight"
                        style={{ animationDelay: `${i * 90}ms` }}
                      >
                        <span className="text-zinc-300">{h.atacanteNombre}</span>{" "}
                        <span className="text-zinc-500">→</span>{" "}
                        <span className="text-zinc-300">{h.victimaNombre}</span>{" "}
                        <span className="text-zinc-500">{coordLabel(h.fila, h.col)}</span>
                        {h.hundeBarco && (
                          <span className="ml-1 rounded bg-red-900/60 px-1 text-[10px] text-red-200">
                            HUNDIÓ
                          </span>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
                {(ev.herencias?.length ?? 0) > 0 && (
                  <ul className="mt-1 space-y-0.5">
                    {ev.herencias.map((h, i) => (
                      <li key={`her${i}`} className="text-fuchsia-300">
                        🧠 <strong>{h.hundidorNombre}</strong> heredó info de{" "}
                        <strong>{h.victimaNombre}</strong> (+{h.celdasGanadas} celda(s))
                      </li>
                    ))}
                  </ul>
                )}
                {ev.eliminados.length > 0 && (
                  <p className="mt-1 text-amber-400">
                    Eliminados:{" "}
                    {ev.eliminados
                      .map((e) => data.jugadores.find((p) => p.email === e)?.nombre ?? e)
                      .join(", ")}
                  </p>
                )}
              </div>
            ))}
          </div>
        </aside>
      </div>
    </main>
  );
}

type EtapaInfoLider = {
  titulo: string;
  subtitulo: string;
  detalle?: string;
  clases: string;
};

function computarEtapaLider(
  d: Estado,
  now: number,
  liderJuegaVivo: boolean,
): EtapaInfoLider | null {
  if (d.estado === "lobby") {
    return {
      titulo: "Lobby",
      subtitulo: "Etapa",
      detalle: "Pulsa Iniciar cuando estén todos",
      clases: "border-zinc-600 bg-zinc-800/60 text-zinc-200",
    };
  }
  if (d.estado === "terminado") {
    return {
      titulo: "Juego terminado",
      subtitulo: "Etapa",
      clases: "border-emerald-600 bg-emerald-950/50 text-emerald-100",
    };
  }
  if (d.estado === "revelando") {
    return {
      titulo: "Revelando ronda",
      subtitulo: `Ronda ${d.rondaActual}`,
      detalle: "Resultado en pantalla",
      clases: "border-fuchsia-600 bg-fuchsia-950/50 text-fuchsia-100",
    };
  }
  // en_ronda
  if (d.config.autoLanzar && d.cuentaAtrasIniciadaAt) {
    const restante = Math.max(0, COUNTDOWN_MS - (now - d.cuentaAtrasIniciadaAt));
    const segundos = Math.max(1, Math.ceil(restante / 1000));
    return {
      titulo: `Lanzando en ${segundos}…`,
      subtitulo: `Ronda ${d.rondaActual}`,
      detalle: "Puedes pulsar “Cerrar ronda y revelar” para forzarlo ahora",
      clases:
        "border-amber-500 bg-amber-950/50 text-amber-100 animate-pulse",
    };
  }
  if (liderJuegaVivo && d.bombaPropiaRondaActual) {
    return {
      titulo: "Esperando disparos",
      subtitulo: `Ronda ${d.rondaActual}`,
      detalle: `${d.bombasRondaActualCount}/${
        d.jugadores.filter((p) => !p.eliminado).length
      } jugadores ya dispararon`,
      clases: "border-sky-600 bg-sky-950/50 text-sky-100",
    };
  }
  if (liderJuegaVivo && !d.bombaPropiaRondaActual) {
    return {
      titulo: "Dispara",
      subtitulo: `Ronda ${d.rondaActual}`,
      detalle: "Click en una celda para lanzar tu bomba",
      clases: "border-emerald-500 bg-emerald-950/50 text-emerald-100",
    };
  }
  // Líder no jugador o eliminado
  return {
    titulo: "Esperando disparos",
    subtitulo: `Ronda ${d.rondaActual}`,
    detalle: `${d.bombasRondaActualCount}/${
      d.jugadores.filter((p) => !p.eliminado).length
    } jugadores ya dispararon`,
    clases: "border-sky-600 bg-sky-950/50 text-sky-100",
  };
}

function PanelGanadorLider({ podio }: { podio: ItemPodio[] }) {
  if (podio.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-600 bg-zinc-900 p-3 text-sm text-zinc-300">
        Juego terminado. Nadie quedó en pie.
      </div>
    );
  }
  const empatados = podio.filter((p) => p.empate);
  const hayEmpate = empatados.length >= 2;
  const ganador = podio[0].jugador;
  const colorPos: Record<number, string> = {
    1: "border-amber-500/70 bg-amber-950/40 text-amber-100",
    2: "border-zinc-400/60 bg-zinc-700/30 text-zinc-100",
    3: "border-orange-700/60 bg-orange-950/30 text-orange-100",
  };
  return (
    <div className="rounded-lg border-2 border-amber-400 bg-gradient-to-br from-amber-900/70 via-amber-800/40 to-amber-950/60 p-4 shadow-lg shadow-amber-900/40">
      <div className="text-center">
        <div className="text-3xl">{hayEmpate ? "🤝" : "🏆"}</div>
        <div className="mt-1 text-base font-extrabold uppercase tracking-wide text-amber-200">
          {hayEmpate ? "Empate" : "Solo queda un jugador"}
        </div>
        <div className="mt-1 text-lg font-bold text-amber-100">
          {hayEmpate
            ? empatados.map((e) => e.jugador.nombre).join(", ")
            : `${ganador.nombre} es el ganador`}
        </div>
        {hayEmpate && (
          <div className="mt-1 text-xs text-amber-300/80">
            Caída simultánea en la ronda final
          </div>
        )}
      </div>
      <div className="mt-3 space-y-1 text-xs">
        {podio.map((it) => (
          <div
            key={it.jugador.email}
            className={`flex items-center justify-between rounded border px-2 py-1 ${colorPos[it.posicion] ?? "border-zinc-700 bg-zinc-900"}`}
          >
            <span className="flex items-center gap-1.5">
              <span className="text-base leading-none">{it.medalla}</span>
              <span className="font-semibold">
                {it.posicion}° {it.jugador.nombre}
              </span>
            </span>
            <span className="font-mono text-[11px]">
              {it.stats.hits} hit · {it.stats.hundimientos} hundido{it.stats.hundimientos === 1 ? "" : "s"}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
