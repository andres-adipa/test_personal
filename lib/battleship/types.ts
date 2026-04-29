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

export type EventoDesperdicio = {
  atacante: string;       // email
  atacanteNombre: string;
};

export type EventoHerencia = {
  hundidor: string;
  hundidorNombre: string;
  victima: string;
  victimaNombre: string;
  celdasGanadas: number;
};

export type EventoHitPublico = {
  atacanteNombre: string;
  victimaNombre: string;
  hundeBarco: boolean;
};

export type EventoRonda = {
  ronda: number;
  hits: EventoHit[];
  fails: EventoFail[];
  desperdicios: EventoDesperdicio[]; // disparos a celdas ya impactadas
  herencias: EventoHerencia[];
  eliminados: string[];   // emails recién eliminados esta ronda
  hitsPublicos?: EventoHitPublico[]; // sólo se llena al filtrar para un jugador no involucrado
  // Conteos globales sin spoiler. Los enviamos a TODOS los jugadores para que
  // el banner de "Resultados" pueda mostrar el total real de la ronda.
  totalHits?: number;
  totalFails?: number;
  totalDesperdicios?: number;
};

export type DensidadMapa = "denso" | "normal" | "tranquilo";

export type ConfigJuego = {
  barcosPorJugador: number;
  tamanoBarco: number;
  permitirEspectador: boolean;
  robaInformacion: boolean;
  liderJugador: boolean;
  autoLanzar: boolean;
  densidad: DensidadMapa;
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
  revelandoStartedAt: number | null;
  cuentaAtrasIniciadaAt: number | null;
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
