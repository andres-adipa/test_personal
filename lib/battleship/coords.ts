export function colLetra(col: number): string {
  let s = "";
  let n = col + 1;
  while (n > 0) {
    const r = (n - 1) % 26;
    s = String.fromCharCode(65 + r) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function coordLabel(fila: number, col: number): string {
  return `${colLetra(col)}${fila + 1}`;
}
