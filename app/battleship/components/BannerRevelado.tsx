"use client";

type EventoHit = {
  atacante: string;
  atacanteNombre: string;
  victima: string;
  victimaNombre: string;
  hundeBarco: boolean;
};

type EventoHitPublico = {
  atacanteNombre: string;
  victimaNombre: string;
  hundeBarco: boolean;
};

export type RondaResumen = {
  ronda: number;
  hits: EventoHit[];
  fails: { atacante: string }[];
  eliminados: string[];
  hitsPublicos?: EventoHitPublico[];
};

type Props = {
  evento: RondaResumen;
  jugadores: { email: string; nombre: string }[];
  // Si true, se considera que el viewer ve todo (líder/espectador). Sirve para
  // saber si hay que combinar `hits` con `hitsPublicos` o no.
  veTodo: boolean;
};

export default function BannerRevelado({ evento, jugadores, veTodo }: Props) {
  // Hits totales (cualquier viewer ve los suyos en `hits`. veTodo=true ya tiene
  // todos. veTodo=false suma hitsPublicos).
  const hitsBase = evento.hits ?? [];
  const hitsExtra = veTodo ? [] : (evento.hitsPublicos ?? []);
  const totalHits = hitsBase.length + hitsExtra.length;
  const totalFails = (evento.fails ?? []).length;

  const hundimientosCount =
    hitsBase.filter((h) => h.hundeBarco).length +
    hitsExtra.filter((h) => h.hundeBarco).length;

  const eliminadosNombres = (evento.eliminados ?? []).map(
    (e) => jugadores.find((p) => p.email === e)?.nombre ?? e,
  );

  // Highlights: a quién hundió quién, si hay
  const hundimientosDetalle: { atacante: string; victima: string }[] = [
    ...hitsBase
      .filter((h) => h.hundeBarco)
      .map((h) => ({ atacante: h.atacanteNombre, victima: h.victimaNombre })),
    ...hitsExtra
      .filter((h) => h.hundeBarco)
      .map((h) => ({ atacante: h.atacanteNombre, victima: h.victimaNombre })),
  ];

  const sinNada = totalHits === 0 && totalFails === 0 && eliminadosNombres.length === 0;

  return (
    <div className="rounded-2xl border-2 border-fuchsia-600 bg-gradient-to-br from-fuchsia-950/80 via-fuchsia-900/40 to-fuchsia-950/60 p-5 shadow-lg shadow-fuchsia-900/30">
      <div className="text-center">
        <div className="text-[11px] uppercase tracking-widest text-fuchsia-300 opacity-80">
          Resultado
        </div>
        <div className="mt-0.5 text-2xl font-extrabold uppercase tracking-wide text-fuchsia-100 sm:text-3xl">
          Ronda {evento.ronda}
        </div>
      </div>

      {/* Stats grandes */}
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-5 gap-y-1 text-sm">
        <Stat icono="💥" label="impactos" valor={totalHits} color="text-red-200" />
        <Stat icono="🌊" label="al agua" valor={totalFails} color="text-sky-200" />
        <Stat
          icono="🔥"
          label={hundimientosCount === 1 ? "hundido" : "hundidos"}
          valor={hundimientosCount}
          color="text-amber-200"
        />
        <Stat
          icono="🪦"
          label={eliminadosNombres.length === 1 ? "eliminado" : "eliminados"}
          valor={eliminadosNombres.length}
          color="text-rose-200"
        />
      </div>

      {/* Highlights destacados */}
      {(hundimientosDetalle.length > 0 ||
        eliminadosNombres.length > 0 ||
        sinNada) && (
        <div className="mt-3 space-y-1 text-center text-sm">
          {sinNada && (
            <div className="font-semibold text-sky-200">
              🌊 Todos al agua esta ronda
            </div>
          )}
          {hundimientosDetalle.slice(0, 2).map((h, i) => (
            <div key={`hd${i}`} className="font-semibold text-amber-200">
              🔥 <strong>{h.atacante}</strong> hundió un barco de{" "}
              <strong>{h.victima}</strong>
            </div>
          ))}
          {hundimientosDetalle.length > 2 && (
            <div className="text-xs text-amber-300/80">
              + {hundimientosDetalle.length - 2} hundimiento(s) más
            </div>
          )}
          {eliminadosNombres.length > 0 && (
            <div className="font-semibold text-rose-200">
              💀 Cayó: <strong>{eliminadosNombres.join(", ")}</strong>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({
  icono,
  label,
  valor,
  color,
}: {
  icono: string;
  label: string;
  valor: number;
  color: string;
}) {
  return (
    <div className="flex items-baseline gap-1.5">
      <span className="text-lg leading-none">{icono}</span>
      <span className={`text-2xl font-extrabold leading-none ${color}`}>{valor}</span>
      <span className="text-xs uppercase tracking-wide text-fuchsia-300/80">{label}</span>
    </div>
  );
}
