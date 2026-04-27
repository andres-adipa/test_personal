"use client";

type Estado = "sano" | "danado" | "hundido";

type Props = {
  tamano: number;
  orientacion: "h" | "v";
  estado?: Estado;
  celdaPx: number;
  hitsLocales?: number[];
};

const COLOR = {
  sano: { casco: "#475569", borde: "#94a3b8", deck: "#cbd5e1", detalle: "#1e293b" },
  danado: { casco: "#475569", borde: "#94a3b8", deck: "#cbd5e1", detalle: "#1e293b" },
  hundido: { casco: "#7f1d1d", borde: "#fca5a5", deck: "#fecaca", detalle: "#450a0a" },
};

export default function BarcoSVG({
  tamano,
  orientacion,
  estado = "sano",
  celdaPx,
  hitsLocales = [],
}: Props) {
  const colores = COLOR[estado];

  const W = celdaPx * tamano;
  const H = celdaPx;
  const padX = celdaPx * 0.12;
  const padY = celdaPx * 0.18;
  const bodyW = W - padX * 2;
  const bodyH = H - padY * 2;

  // Forma del barco: rectángulo redondeado con proa puntiaguda en la derecha
  const proaW = bodyH * 0.55;
  const path = `
    M ${padX} ${padY + bodyH * 0.2}
    Q ${padX} ${padY}, ${padX + bodyH * 0.3} ${padY}
    L ${padX + bodyW - proaW} ${padY}
    L ${padX + bodyW} ${padY + bodyH / 2}
    L ${padX + bodyW - proaW} ${padY + bodyH}
    L ${padX + bodyH * 0.3} ${padY + bodyH}
    Q ${padX} ${padY + bodyH}, ${padX} ${padY + bodyH * 0.8}
    Z
  `;

  // Cubierta interna (rectángulo más fino encima)
  const deckPad = bodyH * 0.3;
  const deckPath = `
    M ${padX + deckPad} ${padY + deckPad}
    L ${padX + bodyW - proaW * 0.7} ${padY + deckPad}
    L ${padX + bodyW - proaW * 0.3} ${padY + bodyH / 2}
    L ${padX + bodyW - proaW * 0.7} ${padY + bodyH - deckPad}
    L ${padX + deckPad} ${padY + bodyH - deckPad}
    Z
  `;

  // tamaño y posición del SVG: si vertical, intercambio dimensiones
  const svgW = orientacion === "h" ? W : H;
  const svgH = orientacion === "h" ? H : W;

  // Para vertical: rotamos el contenido 90° y trasladamos para que quepa
  // dentro del nuevo viewBox (svgW × svgH).
  const transformWrap =
    orientacion === "v" ? `translate(${svgW} 0) rotate(90)` : "";

  // Marcas de hit (cruces rojas) — coordenadas en celdas locales del barco (0..tamano-1)
  const cruces = hitsLocales.map((idx) => {
    const cx = padX + idx * celdaPx + celdaPx / 2;
    const cy = padY + bodyH / 2;
    const r = celdaPx * 0.22;
    return (
      <g key={idx}>
        <circle cx={cx} cy={cy} r={r} fill="#dc2626" stroke="#fef2f2" strokeWidth={1.5} />
        <text
          x={cx}
          y={cy + r * 0.35}
          textAnchor="middle"
          fontSize={r * 1.4}
          fontWeight="bold"
          fill="#fff"
        >
          ✸
        </text>
      </g>
    );
  });

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${svgW} ${svgH}`}
      preserveAspectRatio="xMidYMid meet"
      className={estado === "hundido" ? "barco-hundido-anim" : ""}
      style={{
        transformOrigin: "center",
        overflow: "visible",
      }}
    >
      <g transform={transformWrap}>
        {/* sombra del casco */}
        <path
          d={path}
          fill={colores.casco}
          stroke={colores.borde}
          strokeWidth={1.5}
        />
        {/* cubierta superior */}
        <path d={deckPath} fill={colores.deck} opacity={0.55} />
        {/* línea central del casco */}
        <line
          x1={padX + bodyH * 0.3}
          y1={padY + bodyH / 2}
          x2={padX + bodyW - proaW}
          y2={padY + bodyH / 2}
          stroke={colores.detalle}
          strokeWidth={1}
          opacity={0.45}
        />
        {/* ojos de buey */}
        {Array.from({ length: tamano }).map((_, i) => (
          <circle
            key={i}
            cx={padX + i * celdaPx + celdaPx / 2}
            cy={padY + bodyH / 2}
            r={celdaPx * 0.07}
            fill={colores.detalle}
            opacity={0.7}
          />
        ))}
        {cruces}
      </g>
    </svg>
  );
}
