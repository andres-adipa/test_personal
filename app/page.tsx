import Link from "next/link";

export default function Home() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-10">
      <header className="mb-8">
        <h1 className="text-3xl font-bold text-zinc-100">Entretenimiento ADIPA</h1>
        <p className="mt-1 text-sm text-zinc-400">
          Vista de revisión que estamos usando como Friends and Family. Cada sala
          se entra con tu nombre, sin login.
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
          className="group rounded-xl border border-zinc-700 bg-zinc-800 p-5 transition-colors hover:border-violet-500"
        >
          <h2 className="mb-2 text-lg font-semibold text-violet-300">Hundir la Flota</h2>
          <p className="text-sm text-zinc-400">
            Cada jugador coloca un barco en un mapa compartido y bombardean por rondas hasta que solo quede uno en pie.
          </p>
          <span className="mt-3 inline-block text-xs text-violet-400 opacity-70 transition-opacity group-hover:opacity-100">
            Entrar →
          </span>
        </Link>
      </section>
    </main>
  );
}
