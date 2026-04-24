"use client";

import { useEffect, useState } from "react";

export type Identidad = { nombre: string; email: string };

export function useIdentidad(): [Identidad, (i: Identidad) => void, boolean] {
  const [identidad, setIdentidad] = useState<Identidad>({ nombre: "", email: "" });
  const [cargado, setCargado] = useState(false);
  useEffect(() => {
    try {
      const raw = localStorage.getItem("bingo-identidad");
      if (raw) setIdentidad(JSON.parse(raw));
    } catch {}
    setCargado(true);
  }, []);
  const guardar = (i: Identidad) => {
    setIdentidad(i);
    try {
      localStorage.setItem("bingo-identidad", JSON.stringify(i));
    } catch {}
  };
  return [identidad, guardar, cargado];
}

export default function IdentidadForm({
  valor,
  onGuardar,
}: {
  valor: Identidad;
  onGuardar: (i: Identidad) => void;
}) {
  const [nombre, setNombre] = useState(valor.nombre);
  const [email, setEmail] = useState(valor.email);
  return (
    <div className="mb-6 rounded-xl border border-zinc-700 bg-zinc-800 p-4">
      <h2 className="mb-3 border-l-2 border-violet-500 pl-3 text-sm font-semibold text-zinc-200">
        Tus datos
      </h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Nombre</label>
          <input
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            placeholder="Tu nombre"
          />
        </div>
        <div>
          <label className="mb-1 block text-xs text-zinc-400">Email</label>
          <input
            type="email"
            className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
            value={email}
            onChange={(e) => setEmail(e.target.value.toLowerCase())}
            placeholder="tu@adipa.cl"
          />
        </div>
      </div>
      <button
        type="button"
        disabled={!nombre.trim() || !email.trim()}
        onClick={() => onGuardar({ nombre: nombre.trim(), email: email.trim().toLowerCase() })}
        className="mt-3 rounded-lg border border-violet-600 bg-violet-600/20 px-4 py-2 text-sm font-medium text-violet-300 transition-colors hover:bg-violet-600/40 disabled:opacity-40"
      >
        Guardar
      </button>
    </div>
  );
}
