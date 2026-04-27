"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useRef, useState } from "react";
import IdentidadForm, { useIdentidad } from "@/app/components/Identidad";
import Tablero, { type BarcoVisible } from "@/app/battleship/components/Tablero";
import { coordLabel } from "@/lib/battleship/coords";
import { calcularPodio, type ItemPodio } from "@/lib/battleship/podio";

type Bomba = { email: string; fila: number; col: number; ronda: number; lanzadaAt: number };

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
  config: { barcosPorJugador: number; tamanoBarco: number; permitirEspectador: boolean; robaInformacion: boolean; liderJugador: boolean };
  estado: "lobby" | "en_ronda" | "revelando" | "terminado";
  tablero: { ancho: number; alto: number } | null;
  rondaActual: number;
  jugadores: { email: string; nombre: string; eliminado: boolean }[];
  barcos: BarcoVisible[];
  bombas: Bomba[];
  hits: { fila: number; col: number; ronda: number; barcoId: string | null }[];
  hundidos: { barcoId: string; ronda: number }[];
  eventosPorRonda: EventoRonda[];
  bombaPropiaRondaActual: Bomba | null;
  bombasRondaActualCount: number;
  totalCeldasBarcos: number;
  totalHitsUnicos: number;
  startedAt: number | null;
  endedAt: number | null;
  esLider: boolean;
  estoyEliminado: boolean;
  esEspectador: boolean;
};

const POLL_FREEZE_MS = 1500;

export default function JugarBattleshipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [identidad, guardar, cargado] = useIdentidad();
  const [data, setData] = useState<Estado | null>(null);
  const [unido, setUnido] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    if (!data || unido || !identidad.email) return;
    const yaEsta = data.jugadores.some((p) => p.email === identidad.email);
    if (yaEsta) {
      setUnido(true);
      return;
    }
    if (data.estado !== "lobby") return;
    fetch(`/api/battleship/juegos/${id}/unirse`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identidad.email, nombre: identidad.nombre }),
    })
      .then((r) => r.json())
      .then((j) => {
        if (j.error) setError(j.error);
        else setUnido(true);
      })
      .catch(() => {});
  }, [data, identidad, id, unido]);

  const misBarcosVivos = useMemo(() => {
    if (!data) return [];
    return data.barcos.filter(
      (b) => b.jugadorEmail === identidad.email && !b.hundido,
    );
  }, [data, identidad.email]);

  const ultimaRondaRevelada = useMemo<EventoRonda | null>(() => {
    if (!data?.eventosPorRonda.length) return null;
    return data.eventosPorRonda[data.eventosPorRonda.length - 1];
  }, [data]);

  const statsPorJugador = useMemo(() => {
    const m = new Map<string, { hits: number; hundimientos: number }>();
    if (!data) return m;
    for (const ev of data.eventosPorRonda) {
      for (const h of ev.hits) {
        const cur = m.get(h.atacante) ?? { hits: 0, hundimientos: 0 };
        cur.hits++;
        if (h.hundeBarco) cur.hundimientos++;
        m.set(h.atacante, cur);
      }
    }
    return m;
  }, [data]);

  const podio = useMemo<ItemPodio[]>(() => {
    if (!data) return [];
    return calcularPodio(data.jugadores, data.eventosPorRonda, statsPorJugador);
  }, [data, statsPorJugador]);

  if (!cargado) return null;

  if (!identidad.email) {
    return (
      <main className="mx-auto max-w-md px-6 py-8">
        <Link href="/battleship" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Salas
        </Link>
        <h1 className="mb-4 mt-1 text-xl font-bold text-violet-300">Entrar al juego</h1>
        <IdentidadForm valor={identidad} onGuardar={guardar} />
      </main>
    );
  }

  if (!data) {
    return <main className="mx-auto max-w-md px-6 py-8 text-zinc-400">Cargando...</main>;
  }

  // ---- OPTIMISTIC ----
  const aplicarOptimistic = (patch: (d: Estado) => Estado) => {
    lastActionAt.current = Date.now();
    setData((prev) => (prev ? patch(prev) : prev));
  };

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
    aplicarOptimistic((d) => {
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

  const fasePuedeBombardear =
    data.estado === "en_ronda" && !data.estoyEliminado;

  const verTodosLosNombres = data.esEspectador || data.estado === "terminado";
  const nombrePorEmail: Record<string, string> = {};
  for (const p of data.jugadores) nombrePorEmail[p.email] = p.nombre;

  return (
    <main className="mx-auto max-w-7xl px-3 py-4">
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/battleship" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Salas
          </Link>
          <h1 className="text-lg font-bold text-violet-300">{data.titulo}</h1>
        </div>
        <div className="text-right text-xs text-zinc-400">
          <div>{identidad.nombre}</div>
          <div>
            {data.jugadores.length} jugador(es) · estado: {data.estado}
            {data.estado === "en_ronda" && ` · ronda ${data.rondaActual}`}
          </div>
        </div>
      </div>

      {error && (
        <div className="mb-2 rounded-lg border border-red-700 bg-red-950/50 p-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {data.estoyEliminado && data.esEspectador && (
        <div className="mb-2 rounded-lg border border-amber-700 bg-amber-950/50 p-3 text-sm text-amber-200">
          🪦 Fuiste eliminado. Estás en modo espectador — ves todos los barcos pero ya no puedes disparar.
        </div>
      )}
      {data.estoyEliminado && !data.esEspectador && data.estado !== "terminado" && (
        <div className="mb-2 rounded-lg border border-amber-700 bg-amber-950/50 p-3 text-sm text-amber-200">
          🪦 Fuiste eliminado. El líder no permitió modo espectador, así que esperarás al final del juego.
        </div>
      )}

      {data.estado === "lobby" && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4 text-sm text-zinc-300">
          <p>Esperando que el líder inicie el juego.</p>
          <p className="mt-2 text-xs text-zinc-500">
            Cuando inicie, se calcula el tamaño del mapa y se reparten los barcos
            automáticamente. No hace falta colocar nada.
          </p>
        </div>
      )}

      {(data.estado === "en_ronda" ||
        data.estado === "revelando" ||
        data.estado === "terminado") &&
        data.tablero && (
          <div className="grid gap-3 lg:grid-cols-[1fr_320px]">
            <div>
              <div className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 p-2 text-sm">
                <span className="text-xs text-zinc-300">
                  Ronda <span className="font-bold text-violet-300">{data.rondaActual}</span>
                </span>
                <span className="text-xs text-zinc-400">
                  {data.estado === "terminado"
                    ? "Juego terminado"
                    : data.estoyEliminado
                      ? "Eliminado — sin disparo"
                      : data.bombaPropiaRondaActual
                        ? `Tu bomba: ${coordLabel(data.bombaPropiaRondaActual.fila, data.bombaPropiaRondaActual.col)} · click otra celda para cambiar`
                        : "Click una celda para tirar tu bomba"}
                </span>
                <span className="ml-auto text-xs text-zinc-400">
                  Bombas: {data.bombasRondaActualCount}/
                  {data.jugadores.filter((p) => !p.eliminado).length} · Hits{" "}
                  {data.totalHitsUnicos}/{data.totalCeldasBarcos} · Mis barcos vivos{" "}
                  {misBarcosVivos.length}/{data.config.barcosPorJugador}
                </span>
              </div>

              {data.estado === "revelando" && ultimaRondaRevelada && (
                <div className="mb-2 rounded-lg border border-fuchsia-700 bg-fuchsia-950/40 p-2 text-xs text-fuchsia-200">
                  Ronda {ultimaRondaRevelada.ronda} cerrada — próxima en breve...
                </div>
              )}

              {data.estado === "terminado" && (
                <div className="mb-2 rounded-lg border border-emerald-700 bg-emerald-950/40 p-3 text-center text-emerald-200">
                  🎉 Juego terminado. Hits {data.totalHitsUnicos}/{data.totalCeldasBarcos}
                  {" · "}
                  {data.hundidos.length} barco(s) hundido(s)
                </div>
              )}

              <Tablero
                ancho={data.tablero.ancho}
                alto={data.tablero.alto}
                barcosVisibles={data.barcos}
                hits={data.hits}
                bombasVisibles={data.bombas}
                miEmail={identidad.email}
                rondaActual={data.rondaActual}
                bombaPropiaActual={data.bombaPropiaRondaActual}
                fasePuedeColocar={false}
                fasePuedeBombardear={fasePuedeBombardear}
                onBomba={fasePuedeBombardear ? lanzarBomba : undefined}
                esLider={data.esEspectador || data.estado === "terminado"}
                mostrarNombres={verTodosLosNombres}
                nombrePorEmail={nombrePorEmail}
              />
            </div>

            <aside className="rounded-xl border border-zinc-700 bg-zinc-800 p-3 text-xs">
              <h2 className="mb-2 border-l-2 border-violet-500 pl-3 font-semibold text-zinc-200">
                Mi historial
              </h2>
              {data.eventosPorRonda.length === 0 && data.estado !== "terminado" && (
                <p className="text-zinc-500">Sin rondas reveladas todavía.</p>
              )}
              <div className="max-h-[75vh] space-y-3 overflow-auto pr-1">
                {data.estado === "terminado" && (
                  <PanelGanador podio={podio} miEmail={identidad.email} />
                )}
                {[...data.eventosPorRonda].reverse().map((ev) => (
                  <ItemRondaJugador
                    key={ev.ronda}
                    evento={ev}
                    miEmail={identidad.email}
                    jugadores={data.jugadores}
                  />
                ))}
              </div>
            </aside>
          </div>
        )}
    </main>
  );
}

function ItemRondaJugador({
  evento,
  miEmail,
  jugadores,
}: {
  evento: EventoRonda;
  miEmail: string;
  jugadores: { email: string; nombre: string; eliminado: boolean }[];
}) {
  const misAtaques = evento.hits.filter((h) => h.atacante === miEmail);
  const golpesRecibidos = evento.hits.filter((h) => h.victima === miEmail);
  const fuiEliminadoEstaRonda = evento.eliminados.includes(miEmail);
  const otrosEliminados = evento.eliminados.filter((e) => e !== miEmail);
  const otrosEliminadosNombres = otrosEliminados
    .map((e) => jugadores.find((p) => p.email === e)?.nombre ?? e)
    .join(", ");

  const misHerencias = evento.herencias ?? [];
  const sinNada =
    misAtaques.length === 0 &&
    golpesRecibidos.length === 0 &&
    !fuiEliminadoEstaRonda &&
    otrosEliminados.length === 0 &&
    evento.fails.length === 0 &&
    misHerencias.length === 0;

  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 p-2">
      <div className="mb-1 font-semibold text-violet-300">Ronda {evento.ronda}</div>
      {sinNada && <p className="text-zinc-500">Nada para vos esta ronda.</p>}
      <ul className="space-y-1 leading-tight">
        {misAtaques.map((h, i) => (
          <li key={`a${i}`} className="text-emerald-200">
            🎯 Le pegaste a <strong>{h.victimaNombre}</strong> en {coordLabel(h.fila, h.col)}
            {h.hundeBarco && " — ¡y le hundiste un barco!"}
          </li>
        ))}
        {evento.fails.length > 0 && (
          <li className="text-zinc-500">
            🌊 {evento.fails.length} disparo(s) tuyos al agua
          </li>
        )}
        {golpesRecibidos.map((h, i) => (
          <li key={`r${i}`} className="text-red-300">
            💥 <strong>{h.atacanteNombre}</strong> te impactó en {coordLabel(h.fila, h.col)}
            {h.hundeBarco && " — y hundió uno de tus barcos"}
          </li>
        ))}
        {misHerencias.map((h, i) => (
          <li key={`h${i}`} className="text-fuchsia-300">
            🧠 Heredaste la info de <strong>{h.victimaNombre}</strong>
            {h.celdasGanadas > 0 && ` (+${h.celdasGanadas} celda(s) nueva(s))`}
          </li>
        ))}
        {fuiEliminadoEstaRonda && (
          <li className="font-semibold text-red-300">🪦 Fuiste eliminado.</li>
        )}
        {otrosEliminados.length > 0 && (
          <li className="text-amber-300">Eliminados: {otrosEliminadosNombres}</li>
        )}
      </ul>
    </div>
  );
}

function PanelGanador({
  podio,
  miEmail,
}: {
  podio: ItemPodio[];
  miEmail: string;
}) {
  if (podio.length === 0) {
    return (
      <div className="rounded-lg border border-zinc-600 bg-zinc-900 p-3 text-sm text-zinc-300">
        Juego terminado. Nadie quedó en pie.
      </div>
    );
  }
  const ganador = podio[0].jugador;
  const yoSoyGanador = ganador.email === miEmail && !ganador.eliminado;
  const titulo = yoSoyGanador ? "¡Ganaste!" : "Tenemos un ganador";

  return (
    <div className="rounded-lg border-2 border-amber-400 bg-gradient-to-br from-amber-900/70 via-amber-800/40 to-amber-950/60 p-4 shadow-lg shadow-amber-900/40">
      <div className="text-center">
        <div className="text-3xl">🏆</div>
        <div className="mt-1 text-base font-extrabold uppercase tracking-wide text-amber-200">
          {titulo}
        </div>
        <div className="mt-1 text-lg font-bold text-amber-100">{ganador.nombre}</div>
      </div>
      <FilasPodio podio={podio} miEmail={miEmail} />
    </div>
  );
}

function FilasPodio({
  podio,
  miEmail,
}: {
  podio: ItemPodio[];
  miEmail?: string;
}) {
  const colorPos: Record<number, string> = {
    1: "border-amber-500/70 bg-amber-950/40 text-amber-100",
    2: "border-zinc-400/60 bg-zinc-700/30 text-zinc-100",
    3: "border-orange-700/60 bg-orange-950/30 text-orange-100",
  };
  return (
    <div className="mt-3 space-y-1 text-xs">
      {podio.map((it) => (
        <div
          key={it.jugador.email}
          className={`flex items-center justify-between rounded border px-2 py-1 ${colorPos[it.posicion] ?? "border-zinc-700 bg-zinc-900"} ${
            miEmail && it.jugador.email === miEmail ? "ring-1 ring-violet-300" : ""
          }`}
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
  );
}

