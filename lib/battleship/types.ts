export type EstadoJuego =
  | "lobby"
  | "colocando"
  | "en_ronda"
  | "revelando"
  | "terminado";

export type Orientacion = "h" | "v";

export type Barco = {
  id: string;
  jugadorEmail: string;
  tamano: number;
  fila: number;
  col: number;
  orientacion: Orientacion;
  prellenado: boolean;
};

export type Jugador = {
  email: string;
  nombre: string;
  joinedAt: number;
  listo: boolean;
};

export type Bomba = {
  email: string;
  fila: number;
  col: number;
  ronda: number;
  lanzadaAt: number;
};

export type Hit = {
  fila: number;
  col: number;
  ronda: number;
  barcoId: string | null;
};

export type Hundimiento = {
  barcoId: string;
  ronda: number;
};

export type ConfigJuego = {
  barcosPorJugador: number;
  tamanoBarco: number;
  prellenarBarcos: boolean;
};

export type Tablero = {
  ancho: number;
  alto: number;
};

export type Juego = {
  id: string;
  titulo: string;
  lider: string;
  config: ConfigJuego;
  estado: EstadoJuego;
  tablero: Tablero | null;
  jugadores: Jugador[];
  barcos: Barco[];
  bombas: Bomba[];
  hits: Hit[];
  hundidos: Hundimiento[];
  rondaActual: number;
  createdAt: number;
  startedAt: number | null;
  endedAt: number | null;
};

export type ResumenJuego = {
  id: string;
  titulo: string;
  lider: string;
  estado: EstadoJuego;
  jugadores: number;
  config: ConfigJuego;
  createdAt: number;
};
