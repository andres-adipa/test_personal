import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100">Entretenimiento</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Juegos multijugador para correr en local o en un deploy rápido. Sin login,
          se entra con nombre y email por sala.
        </p>
      </header>

      <section className="grid gap-4 sm:grid-cols-2">
        <Link
          href="/bingo"
          className="group rounded-xl border border-zinc-700 bg-zinc-800 p-5 transition-colors hover:border-violet-500"
        >
          <h2 className="mb-2 text-lg font-semibold text-violet-300">Bingo</h2>
          <p className="text-sm text-zinc-400">
            Bingo multijugador en tiempo real con vista de líder y jugadores.
          </p>
          <span className="mt-3 inline-block text-xs text-violet-400 opacity-70 transition-opacity group-hover:opacity-100">
            Entrar →
          </span>
        </Link>

        <Link
          href="/battleship"
          className="group rounded-xl border border-zinc-700 bg-zinc-800 p-5 transition-colors hover:border-cyan-500"
        >
          <h2 className="mb-2 text-lg font-semibold text-cyan-300">Hundir la Flota</h2>
          <p className="text-sm text-zinc-400">
            Cooperativo: cada jugador coloca un barco en un mapa compartido y todos bombardean por rondas.
          </p>
          <span className="mt-3 inline-block text-xs text-cyan-400 opacity-70 transition-opacity group-hover:opacity-100">
            Entrar →
          </span>
        </Link>
      </section>
    </main>
  );
}
