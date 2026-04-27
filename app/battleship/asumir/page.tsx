"use client";

import { useEffect } from "react";

export default function AsumirIdentidad() {
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nombre = params.get("nombre") ?? "";
    const email = params.get("email") ?? "";
    const go = params.get("go") ?? "/battleship";
    if (nombre && email) {
      localStorage.setItem("bingo-identidad", JSON.stringify({ nombre, email }));
    }
    window.location.replace(go);
  }, []);

  return (
    <main className="mx-auto max-w-md px-6 py-8 text-zinc-400">
      Asumiendo identidad…
    </main>
  );
}
