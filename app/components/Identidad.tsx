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

function slug(s: string) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 24) || "jugador";
}

function generarId(nombre: string) {
  const random = Math.random().toString(36).slice(2, 8);
  return `${slug(nombre)}-${random}@local`;
}

export default function IdentidadForm({
  valor,
  onGuardar,
}: {
  valor: Identidad;
  onGuardar: (i: Identidad) => void;
}) {
  const [nombre, setNombre] = useState(valor.nombre);
  const guardar = () => {
    const limpio = nombre.trim();
    if (!limpio) return;
    const email = valor.email && valor.nombre.trim() === limpio ? valor.email : generarId(limpio);
    onGuardar({ nombre: limpio, email });
  };
  return (
    <div className="mb-6 rounded-xl border border-zinc-700 bg-zinc-800 p-4">
      <h2 className="mb-3 border-l-2 border-violet-500 pl-3 text-sm font-semibold text-zinc-200">
        Tus datos
      </h2>
      <div>
        <label className="mb-1 block text-xs text-zinc-400">Nombre</label>
        <input
          className="w-full rounded-lg border border-zinc-700 bg-zinc-800 px-2 py-2 text-sm text-zinc-100 focus:border-violet-500 focus:outline-none"
          value={nombre}
          onChange={(e) => setNombre(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") guardar();
          }}
          placeholder="Tu nombre"
        />
      </div>
      {valor.email && (
        <p className="mt-1 text-[10px] text-zinc-500">id: {valor.email}</p>
      )}
      <button
        type="button"
        disabled={!nombre.trim()}
        onClick={guardar}
        className="mt-3 rounded-lg border border-violet-600 bg-violet-600/20 px-4 py-2 text-sm font-medium text-violet-300 transition-colors hover:bg-violet-600/40 disabled:opacity-40"
      >
        Guardar
      </button>
    </div>
  );
}
