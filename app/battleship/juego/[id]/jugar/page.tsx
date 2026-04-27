"use client";

import Link from "next/link";
import { use, useEffect, useMemo, useState } from "react";
import IdentidadForm, { useIdentidad } from "@/app/components/Identidad";
import Tablero, { type BarcoVisible } from "@/app/battleship/components/Tablero";

type Estado = {
  id: string;
  titulo: string;
  lider: string;
  config: { barcosPorJugador: number; tamanoBarco: number; prellenarBarcos: boolean };
  estado: "lobby" | "colocando" | "en_ronda" | "revelando" | "terminado";
  tablero: { ancho: number; alto: number } | null;
  rondaActual: number;
  jugadores: { email: string; nombre: string; listo: boolean }[];
  barcos: BarcoVisible[];
  bombas: { email: string; fila: number; col: number; ronda: number; lanzadaAt: number }[];
  hits: { fila: number; col: number; ronda: number; barcoId: string | null }[];
  hundidos: { barcoId: string; ronda: number }[];
  bombaPropiaRondaActual: { email: string; fila: number; col: number; ronda: number; lanzadaAt: number } | null;
  bombasRondaActualCount: number;
  totalCeldasBarcos: number;
  totalHitsUnicos: number;
  startedAt: number | null;
  endedAt: number | null;
  esLider: boolean;
};

export default function JugarBattleshipPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [identidad, guardar, cargado] = useIdentidad();
  const [data, setData] = useState<Estado | null>(null);
  const [unido, setUnido] = useState(false);
  const [orientacion, setOrientacion] = useState<"h" | "v">("h");
  const [hover, setHover] = useState<{ fila: number; col: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!cargado || !identidad.email) return;
    const tick = async () => {
      try {
        const r = await fetch(`/api/battleship/juegos/${id}?email=${encodeURIComponent(identidad.email)}`);
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
    if (!data || unido || !identidad.email) return;
    const yaEsta = data.jugadores.some((p) => p.email === identidad.email);
    if (yaEsta) {
      setUnido(true);
      return;
    }
    if (data.estado !== "lobby" && data.estado !== "colocando") return;
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

  const yo = useMemo(
    () => data?.jugadores.find((p) => p.email === identidad.email) ?? null,
    [data, identidad.email],
  );

  const misBarcos = useMemo(
    () => (data?.barcos ?? []).filter((b) => b.jugadorEmail === identidad.email),
    [data, identidad.email],
  );

  if (!cargado) return null;

  if (!identidad.email) {
    return (
      <main className="mx-auto max-w-md px-6 py-8">
        <Link href="/battleship" className="text-xs text-zinc-500 hover:text-zinc-300">
          ← Salas
        </Link>
        <h1 className="mb-4 mt-1 text-xl font-bold text-cyan-300">Entrar al juego</h1>
        <IdentidadForm valor={identidad} onGuardar={guardar} />
      </main>
    );
  }

  if (!data) {
    return <main className="mx-auto max-w-md px-6 py-8 text-zinc-400">Cargando...</main>;
  }

  const colocarBarco = async (fila: number, col: number) => {
    setError(null);
    const yaPuestos = misBarcos.length;
    const idMover = yaPuestos >= data.config.barcosPorJugador ? misBarcos[0]?.id : null;
    const idMoverFinal =
      idMover ?? (misBarcos.length > 0 ? misBarcos[misBarcos.length - 1]?.id : null);
    const cuerpo: Record<string, unknown> = {
      email: identidad.email,
      fila,
      col,
      orientacion,
    };
    if (yaPuestos >= data.config.barcosPorJugador && idMoverFinal) {
      cuerpo.barcoId = idMoverFinal;
    }
    const r = await fetch(`/api/battleship/juegos/${id}/colocar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(cuerpo),
    });
    const j = await r.json();
    if (!r.ok) setError(j.error ?? "Error");
  };

  const moverBarco = (barcoId: string) => async (fila: number, col: number) => {
    setError(null);
    const r = await fetch(`/api/battleship/juegos/${id}/colocar`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identidad.email, fila, col, orientacion, barcoId }),
    });
    const j = await r.json();
    if (!r.ok) setError(j.error ?? "Error");
  };

  const marcarListo = async (listo: boolean) => {
    setError(null);
    const r = await fetch(`/api/battleship/juegos/${id}/listo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identidad.email, listo }),
    });
    const j = await r.json();
    if (!r.ok) setError(j.error ?? "Error");
  };

  const lanzarBomba = async (fila: number, col: number) => {
    setError(null);
    const r = await fetch(`/api/battleship/juegos/${id}/bomba`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: identidad.email, fila, col }),
    });
    const j = await r.json();
    if (!r.ok) setError(j.error ?? "Error");
  };

  const [barcoSeleccionado, setBarcoSeleccionado] = useState<string | null>(null);

  const handleClickColocar = (fila: number, col: number) => {
    if (barcoSeleccionado) {
      moverBarco(barcoSeleccionado)(fila, col);
      setBarcoSeleccionado(null);
      return;
    }
    if (misBarcos.length < data.config.barcosPorJugador) {
      colocarBarco(fila, col);
    }
  };

  const fasePuedeColocar = data.estado === "colocando" && !yo?.listo;
  const fasePuedeBombardear =
    data.estado === "en_ronda" && !data.bombaPropiaRondaActual;

  return (
    <main className="mx-auto max-w-5xl px-4 py-6">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div>
          <Link href="/battleship" className="text-xs text-zinc-500 hover:text-zinc-300">
            ← Salas
          </Link>
          <h1 className="text-xl font-bold text-cyan-300">{data.titulo}</h1>
          <p className="text-xs text-zinc-500">
            {data.jugadores.length} jugador(es) · estado: {data.estado}
            {data.estado === "en_ronda" && ` · ronda ${data.rondaActual}`}
          </p>
        </div>
        <div className="text-right text-xs text-zinc-400">
          <div>{identidad.nombre} ({identidad.email})</div>
          <div>{misBarcos.length}/{data.config.barcosPorJugador} barco(s) colocado(s)</div>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-red-700 bg-red-950/50 p-2 text-sm text-red-300">
          {error}
        </div>
      )}

      {data.estado === "lobby" && (
        <div className="rounded-xl border border-zinc-700 bg-zinc-800 p-4 text-sm text-zinc-300">
          <p>Esperando que el líder inicie el juego.</p>
          <p className="mt-2 text-xs text-zinc-500">
            Cuando inicie, el sistema calcula el tamaño del mapa según los jugadores y
            entras a la fase de colocación.
          </p>
        </div>
      )}

      {data.estado === "colocando" && data.tablero && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-sm">
            <button
              type="button"
              onClick={() => setOrientacion(orientacion === "h" ? "v" : "h")}
              disabled={!!yo?.listo}
              className="rounded-lg border border-zinc-600 px-3 py-1 text-xs text-zinc-200 hover:border-cyan-500 disabled:opacity-40"
            >
              Orientación: {orientacion === "h" ? "Horizontal →" : "Vertical ↓"}
            </button>
            <div className="text-xs text-zinc-400">
              {misBarcos.length < data.config.barcosPorJugador
                ? "Click en una celda para colocar tu barco."
                : barcoSeleccionado
                  ? "Click en una nueva celda para mover el barco seleccionado."
                  : "Click en uno de tus barcos para moverlo."}
            </div>
            {misBarcos.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {misBarcos.map((b, i) => (
                  <button
                    key={b.id}
                    type="button"
                    disabled={!!yo?.listo}
                    onClick={() => setBarcoSeleccionado(b.id === barcoSeleccionado ? null : b.id)}
                    className={`rounded border px-2 py-1 text-xs ${
                      barcoSeleccionado === b.id
                        ? "border-cyan-400 bg-cyan-500/20 text-cyan-200"
                        : "border-zinc-600 text-zinc-300 hover:border-cyan-600"
                    } disabled:opacity-40`}
                  >
                    Barco {i + 1}
                  </button>
                ))}
              </div>
            )}
            <div className="ml-auto flex gap-2">
              {!yo?.listo ? (
                <button
                  type="button"
                  disabled={misBarcos.length < data.config.barcosPorJugador}
                  onClick={() => marcarListo(true)}
                  className="rounded-lg border border-emerald-600 bg-emerald-600/20 px-3 py-1 text-xs font-medium text-emerald-200 hover:bg-emerald-600/40 disabled:opacity-40"
                >
                  Estoy listo
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => marcarListo(false)}
                  className="rounded-lg border border-amber-600 bg-amber-600/20 px-3 py-1 text-xs font-medium text-amber-200 hover:bg-amber-600/40"
                >
                  Volver a editar
                </button>
              )}
            </div>
          </div>

          <Tablero
            ancho={data.tablero.ancho}
            alto={data.tablero.alto}
            barcosVisibles={data.barcos}
            hits={[]}
            bombasVisibles={[]}
            miEmail={identidad.email}
            rondaActual={0}
            bombaPropiaActual={null}
            fasePuedeColocar={fasePuedeColocar}
            fasePuedeBombardear={false}
            onColocar={handleClickColocar}
            esLider={false}
            preview={hover && fasePuedeColocar
              ? { fila: hover.fila, col: hover.col, tamano: data.config.tamanoBarco, orientacion }
              : null}
          />
          <p className="mt-2 text-xs text-zinc-500">
            Listos: {data.jugadores.filter((p) => p.listo).length}/{data.jugadores.length}
          </p>
        </>
      )}

      {(data.estado === "en_ronda" || data.estado === "revelando") && data.tablero && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-3 rounded-lg border border-zinc-700 bg-zinc-800 p-3 text-sm">
            <div className="text-xs text-zinc-300">
              Ronda <span className="font-bold text-cyan-300">{data.rondaActual}</span>
            </div>
            <div className="text-xs text-zinc-400">
              {data.bombaPropiaRondaActual
                ? `Tu bomba: F${data.bombaPropiaRondaActual.fila} C${data.bombaPropiaRondaActual.col}`
                : "Click una celda para tirar tu bomba"}
            </div>
            <div className="ml-auto text-xs text-zinc-400">
              Bombas tiradas esta ronda: {data.bombasRondaActualCount}/{data.jugadores.length}
            </div>
            <div className="text-xs text-zinc-400">
              Hits: {data.totalHitsUnicos}/{data.totalCeldasBarcos}
            </div>
          </div>
          {data.estado === "revelando" && (
            <div className="mb-3 rounded-lg border border-fuchsia-700 bg-fuchsia-950/40 p-3 text-sm text-fuchsia-200">
              ¡Ronda cerrada! Resultados revelados, próxima ronda en breve...
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
            onBomba={lanzarBomba}
            esLider={false}
          />
        </>
      )}

      {data.estado === "terminado" && data.tablero && (
        <>
          <div className="mb-3 rounded-lg border border-emerald-700 bg-emerald-950/40 p-4 text-center text-emerald-200">
            🎉 ¡Juego terminado! Hits {data.totalHitsUnicos}/{data.totalCeldasBarcos} ·{" "}
            {data.hundidos.length} barco(s) hundido(s)
          </div>
          <Tablero
            ancho={data.tablero.ancho}
            alto={data.tablero.alto}
            barcosVisibles={data.barcos}
            hits={data.hits}
            bombasVisibles={data.bombas}
            miEmail={identidad.email}
            rondaActual={data.rondaActual}
            bombaPropiaActual={null}
            fasePuedeColocar={false}
            fasePuedeBombardear={false}
            esLider={false}
          />
        </>
      )}

      {/* hover preview helper */}
      <HoverGlobal onMove={setHover} />
    </main>
  );
}

function HoverGlobal({ onMove }: { onMove: (h: { fila: number; col: number } | null) => void }) {
  useEffect(() => {
    const fn = (e: MouseEvent) => {
      const target = e.target as HTMLElement | null;
      const title = target?.getAttribute?.("title") ?? "";
      const m = /^F(\d+) C(\d+)$/.exec(title);
      if (m) onMove({ fila: parseInt(m[1], 10), col: parseInt(m[2], 10) });
      else onMove(null);
    };
    window.addEventListener("mousemove", fn);
    return () => window.removeEventListener("mousemove", fn);
  }, [onMove]);
  return null;
}
