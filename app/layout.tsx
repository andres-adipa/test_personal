import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Bingo ADIPA",
  description: "Bingo interno para el equipo ADIPA",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-zinc-900 text-zinc-100 antialiased">{children}</body>
    </html>
  );
}
