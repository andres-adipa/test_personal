export type EstadoJuego =
  | "lobby"
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
  eliminado: boolean;
  conocidas: string[]; // celdas "fila,col" que el jugador sabe (propias + heredadas)
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

export type EventoHit = {
  atacante: string;       // email
  atacanteNombre: string;
  victima: string;        // email dueño del barco
  victimaNombre: string;
  barcoId: string;
  fila: number;
  col: number;
  hundeBarco: boolean;    // si este hit hundió el barco
};

export type EventoFail = {
  atacante: string;       // email
  atacanteNombre: string;
  fila: number;
  col: number;
};

export type EventoHerencia = {
  hundidor: string;
  hundidorNombre: string;
  victima: string;
  victimaNombre: string;
  celdasGanadas: number;
};

export type EventoRonda = {
  ronda: number;
  hits: EventoHit[];
  fails: EventoFail[];
  herencias: EventoHerencia[];
  eliminados: string[];   // emails recién eliminados esta ronda
};

export type ConfigJuego = {
  barcosPorJugador: number;
  tamanoBarco: number;
  permitirEspectador: boolean;
  robaInformacion: boolean;
  liderJugador: boolean;
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
  eventosPorRonda: EventoRonda[];
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
