"use client";

import Link from "next/link";
import { type CSSProperties, use, useEffect, useMemo, useRef, useState } from "react";
import IdentidadForm, { useIdentidad } from "@/app/components/Identidad";
import Tablero, { type BarcoVisible } from "@/app/battleship/components/Tablero";
import BannerRevelado from "@/app/battleship/components/BannerRevelado";
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

type EventoHitPublico = {
  atacanteNombre: string;
  victimaNombre: string;
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
  hitsPublicos?: EventoHitPublico[];
};

type Estado = {
  id: string;
  titulo: string;
  lider: string;
  config: { barcosPorJugador: number; tamanoBarco: number; permitirEspectador: boolean; robaInformacion: boolean; liderJugador: boolean; autoLanzar: boolean; densidad?: "denso" | "normal" | "tranquilo" };
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
  revelandoStartedAt: number | null;
  cuentaAtrasIniciadaAt: number | null;
  esLider: boolean;
  estoyEliminado: boolean;
  esEspectador: boolean;
};

const POLL_FREEZE_MS = 1500;
const COUNTDOWN_MS = 3000;

export default function JugarBattleshipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [identidad, guardar, cargado] = useIdentidad();
  const [data, setData] = useState<Estado | null>(null);
  const [unido, setUnido] = useState(false);
  const [error, setError] = useState<string | null>(null);
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

  // Reloj para la cuenta atrás (refresca cada 250ms para fluidez)
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(t);
  }, []);

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

  // Etapa visible (banner grande)
  const etapa = computarEtapa(data, now);

  // ¿Soy ganador?
  const yoSoyGanador =
    data.estado === "terminado" &&
    podio.length > 0 &&
    podio[0].jugador.email === identidad.email &&
    !podio[0].jugador.eliminado;

  // ¿Acabo de caer en la ronda que se está revelando?
  const caiEstaRonda =
    data.estado === "revelando" &&
    !!ultimaRondaRevelada?.eliminados.includes(identidad.email);

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

      {/* Banner de etapa */}
      {etapa && (
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
      )}

      {/* Banner: acabas de caer (revelando) */}
      {caiEstaRonda && (
        <div className="mb-3 rounded-2xl border-2 border-red-600 bg-gradient-to-br from-red-950/80 via-red-900/40 to-red-950/60 p-5 text-center shadow-lg shadow-red-900/40">
          <div className="text-3xl">🪦</div>
          <div className="mt-1 text-2xl font-extrabold uppercase tracking-wide text-red-200">
            Caíste
          </div>
          <div className="mt-1 text-sm text-red-300">
            Hundieron tu último barco esta ronda.
          </div>
        </div>
      )}

      {/* Banner de derrota cuando terminó y perdí */}
      {data.estado === "terminado" && data.estoyEliminado && !yoSoyGanador && (
        <div className="mb-3 rounded-2xl border-2 border-red-600 bg-gradient-to-br from-red-950/80 via-red-900/40 to-red-950/60 p-5 text-center shadow-lg shadow-red-900/40">
          <div className="text-3xl">🪦</div>
          <div className="mt-1 text-2xl font-extrabold uppercase tracking-wide text-red-200">
            Perdiste
          </div>
          {podio[0] && (
            <div className="mt-1 text-sm text-red-300">
              {podio[0].jugador.eliminado
                ? `Nadie quedó en pie. ${podio[0].jugador.nombre} fue el último en caer.`
                : `Ganó ${podio[0].jugador.nombre}.`}
            </div>
          )}
        </div>
      )}

      {data.estoyEliminado && data.estado !== "terminado" && data.esEspectador && (
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
                <div className="mb-3 space-y-2">
                  <BannerRevelado
                    evento={ultimaRondaRevelada}
                    jugadores={data.jugadores}
                    veTodo={data.esEspectador}
                  />
                  <ToastPersonalRonda
                    evento={ultimaRondaRevelada}
                    miEmail={identidad.email}
                  />
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

type EtapaInfo = {
  titulo: string;
  subtitulo: string;
  detalle?: string;
  clases: string;
};

function computarEtapa(d: Estado, now: number): EtapaInfo | null {
  if (d.estado === "lobby") {
    return {
      titulo: "Lobby",
      subtitulo: "Etapa",
      detalle: "Esperando que el líder inicie",
      clases: "border-zinc-600 bg-zinc-800/60 text-zinc-200",
    };
  }
  if (d.estado === "terminado") return null; // banner de derrota/victoria toma la voz

  if (d.estado === "revelando") {
    return {
      titulo: "Revelando ronda",
      subtitulo: `Ronda ${d.rondaActual}`,
      detalle: "Mira el resultado de los disparos",
      clases: "border-fuchsia-600 bg-fuchsia-950/50 text-fuchsia-100",
    };
  }

  // en_ronda
  if (d.estoyEliminado) {
    return {
      titulo: "Mira nomás",
      subtitulo: `Ronda ${d.rondaActual} · Eliminado`,
      detalle: "No puedes disparar",
      clases: "border-zinc-600 bg-zinc-800/60 text-zinc-300",
    };
  }

  // ¿Cuenta atrás activa?
  if (d.config.autoLanzar && d.cuentaAtrasIniciadaAt) {
    const restante = Math.max(0, COUNTDOWN_MS - (now - d.cuentaAtrasIniciadaAt));
    const segundos = Math.max(1, Math.ceil(restante / 1000));
    return {
      titulo: `Lanzando en ${segundos}…`,
      subtitulo: `Ronda ${d.rondaActual}`,
      detalle: "Todos los disparos enviados — preparándose para revelar",
      clases:
        "border-amber-500 bg-amber-950/50 text-amber-100 animate-pulse",
    };
  }

  if (d.bombaPropiaRondaActual) {
    return {
      titulo: "Esperando disparos",
      subtitulo: `Ronda ${d.rondaActual}`,
      detalle: `${d.bombasRondaActualCount}/${
        d.jugadores.filter((p) => !p.eliminado).length
      } jugadores ya dispararon`,
      clases: "border-sky-600 bg-sky-950/50 text-sky-100",
    };
  }

  return {
    titulo: "Dispara",
    subtitulo: `Ronda ${d.rondaActual}`,
    detalle: "Click en una celda para lanzar tu bomba",
    clases: "border-emerald-500 bg-emerald-950/50 text-emerald-100",
  };
}

function ToastPersonalRonda({
  evento,
  miEmail,
}: {
  evento: EventoRonda;
  miEmail: string;
}) {
  const misAtaques = evento.hits.filter((h) => h.atacante === miEmail);
  const golpesRecibidos = evento.hits.filter((h) => h.victima === miEmail);
  const fuiEliminado = evento.eliminados.includes(miEmail);
  const yoFalle = evento.fails.filter((f) => f.atacante === miEmail).length;

  // Construir mensaje sobre lo que ME pasó
  const lineas: { txt: string; color: string }[] = [];
  for (const h of misAtaques) {
    lineas.push({
      txt: h.hundeBarco
        ? `🔥 ¡Le hundiste un barco a ${h.victimaNombre}!`
        : `🎯 Le pegaste a ${h.victimaNombre} en ${coordLabel(h.fila, h.col)}`,
      color: "text-emerald-200",
    });
  }
  for (const h of golpesRecibidos) {
    lineas.push({
      txt: h.hundeBarco
        ? `💀 ${h.atacanteNombre} te hundió un barco`
        : `💥 ${h.atacanteNombre} te impactó en ${coordLabel(h.fila, h.col)}`,
      color: "text-red-300",
    });
  }
  if (fuiEliminado) {
    lineas.push({ txt: "🪦 Te eliminaron de la partida", color: "text-rose-300" });
  }

  if (lineas.length === 0) {
    if (yoFalle > 0) {
      return (
        <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-3 text-center text-sm text-zinc-400">
          🌊 Tu disparo fue al agua
        </div>
      );
    }
    return null;
  }

  return (
    <div className="rounded-xl border border-zinc-700 bg-zinc-900/80 p-3">
      <div className="mb-1 text-center text-[11px] uppercase tracking-widest text-zinc-500">
        A ti esta ronda
      </div>
      <ul className="space-y-1 text-center text-sm font-semibold">
        {lineas.map((l, i) => (
          <li
            key={i}
            className={`battleship-fade-in ${l.color}`}
            style={{ animationDelay: `${i * 140}ms` }}
          >
            {l.txt}
          </li>
        ))}
      </ul>
    </div>
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
  const hitsPublicos = evento.hitsPublicos ?? [];
  const sinNada =
    misAtaques.length === 0 &&
    golpesRecibidos.length === 0 &&
    !fuiEliminadoEstaRonda &&
    otrosEliminados.length === 0 &&
    evento.fails.length === 0 &&
    misHerencias.length === 0 &&
    hitsPublicos.length === 0;

  // Indexador local de animación para que cada línea aparezca con delay
  let idx = 0;
  const fadeStyle = (): CSSProperties => ({
    animationDelay: `${idx++ * 100}ms`,
  });

  return (
    <div className="rounded border border-zinc-700 bg-zinc-900 p-2">
      <div className="mb-1 font-semibold text-violet-300">Ronda {evento.ronda}</div>
      {sinNada && <p className="text-zinc-500">Nada para ti esta ronda.</p>}
      <ul className="space-y-1 leading-tight">
        {misAtaques.map((h, i) => (
          <li key={`a${i}`} className="battleship-fade-in text-emerald-200" style={fadeStyle()}>
            🎯 Le pegaste a <strong>{h.victimaNombre}</strong> en {coordLabel(h.fila, h.col)}
            {h.hundeBarco && " — ¡y le hundiste un barco!"}
          </li>
        ))}
        {evento.fails.length > 0 && (
          <li className="battleship-fade-in text-zinc-500" style={fadeStyle()}>
            🌊 {evento.fails.length} disparo(s) tuyos al agua
          </li>
        )}
        {golpesRecibidos.map((h, i) => (
          <li key={`r${i}`} className="battleship-fade-in text-red-300" style={fadeStyle()}>
            💥 <strong>{h.atacanteNombre}</strong> te impactó en {coordLabel(h.fila, h.col)}
            {h.hundeBarco && " — y hundió uno de tus barcos"}
          </li>
        ))}
        {hitsPublicos.map((h, i) => (
          <li key={`p${i}`} className="battleship-fade-in text-zinc-300" style={fadeStyle()}>
            ⚔️ <strong>{h.atacanteNombre}</strong> le pegó a{" "}
            <strong>{h.victimaNombre}</strong>
            {h.hundeBarco && " — ¡y le hundió un barco!"}
          </li>
        ))}
        {misHerencias.map((h, i) => (
          <li key={`h${i}`} className="battleship-fade-in text-fuchsia-300" style={fadeStyle()}>
            🧠 Heredaste la info de <strong>{h.victimaNombre}</strong>
            {h.celdasGanadas > 0 && ` (+${h.celdasGanadas} celda(s) nueva(s))`}
          </li>
        ))}
        {fuiEliminadoEstaRonda && (
          <li className="battleship-fade-in font-semibold text-red-300" style={fadeStyle()}>
            🪦 Fuiste eliminado.
          </li>
        )}
        {otrosEliminados.length > 0 && (
          <li className="battleship-fade-in text-amber-300" style={fadeStyle()}>
            Eliminados: {otrosEliminadosNombres}
          </li>
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
