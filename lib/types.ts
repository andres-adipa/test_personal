export type Patron = "terna" | "linea" | "carton_lleno" | "dos_cartones_llenos";

export type EstadoJuego = "lobby" | "eligiendo" | "en_curso" | "terminado";

export type Celda = number | null;
export type Cuadricula = Celda[][];

export type Carton = {
  id: string;
  juegoId: string;
  jugadorEmail: string | null;
  slot: 1 | 2 | null;
  numeros: Cuadricula;
  hashUnico: string;
  elegido: boolean;
  ofrecidoA: string | null;
};

export type Jugador = {
  email: string;
  nombre: string;
  joinedAt: number;
};

export type Sorteo = {
  numero: number;
  orden: number;
  cantadoAt: number;
};

export type Marca = {
  cartonId: string;
  numero: number;
  marcadoAt: number;
};

export type Bingo = {
  cartonId: string;
  email: string;
  cantadoAt: number;
  valido: boolean;
  faltantes: number;
  patron: Patron;
};

export type GanadorDePatron = {
  patron: Patron;
  cartonId: string;
  email: string;
  cantadoAt: number;
};

export type Juego = {
  id: string;
  titulo: string;
  lider: string;
  cartonesPorJugador: 1 | 2;
  patrones: Patron[]; // múltiples premios en una partida, en orden
  mostrarPatron: boolean;
  historialVisibleJugador: boolean;
  estado: EstadoJuego;
  numerosBarajados: number[];
  indiceActual: number;
  jugadores: Jugador[];
  cartones: Carton[];
  sorteos: Sorteo[];
  marcas: Marca[];
  bingos: Bingo[];
  ganadores: GanadorDePatron[]; // un ganador por cada patrón
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
};
