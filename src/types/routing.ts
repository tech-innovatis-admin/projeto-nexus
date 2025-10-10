// Tipos para o sistema de rotas entre municípios

export interface Coordenada {
  lat: number;
  lng: number;
}

export interface MunicipioBase {
  codigo: string;
  nome: string;
  uf: string;
  estado: string;
  coordenadas: Coordenada;
  populacao: number;
  tipo: 'polo' | 'periferia';
}

export interface MunicipioPolo extends MunicipioBase {
  tipo: 'polo';
  temPistaVoo: boolean;
  aeroporto: boolean;
  tipoTransporteDisponivel: string[];
  periferias: MunicipioPeriferia[];
}

export interface MunicipioPeriferia extends MunicipioBase {
  tipo: 'periferia';
  poloVinculado?: string; // codigo do polo
}

export interface TrechoVoo {
  tipo: 'voo';
  origem: MunicipioPolo;
  destino: MunicipioPolo;
  distanciaKm: number;
  tempoMinutos: number;
  geometria: [number, number][]; // linha reta
}

export interface TrechoTerrestre {
  tipo: 'terrestre';
  origem: MunicipioBase;
  destino: MunicipioBase;
  distanciaKm: number;
  tempoMinutos: number;
  geometria: [number, number][]; // linha seguindo estradas
  instrucoes: InstrucaoRota[];
}

export interface InstrucaoRota {
  tipo: 'straight' | 'turn' | 'merge' | 'roundabout' | 'exit';
  descricao: string;
  distanciaKm: number;
  tempoMinutos: number;
  coordenada: Coordenada;
}

export interface RotaCompleta {
  id: string;
  nome: string;
  trechos: (TrechoVoo | TrechoTerrestre)[];
  estatisticas: EstatisticasRota;
  criadaEm: Date;
}

export interface EstatisticasRota {
  distanciaTotalKm: number;
  tempoTotalMinutos: number;
  distanciaVooKm: number;
  tempoVooMinutos: number;
  distanciaTerrestreKm: number;
  tempoTerrestreMinutos: number;
  numeroPolos: number;
  numeroPeriferias: number;
  numeroTrechosVoo: number;
  numeroTrechosTerrestre: number;
  quantidadeTrechosVoo: number;
  quantidadeTrechosTerrestres: number;
}

export interface ConfiguracaoRota {
  velocidadeMediaVooKmh: number; // ex: 220 km/h para helicóptero
  preferirVooEntrePolos: boolean;
  limitarDistanciaMaximaTerrestreKm?: number;
  otimizarOrdemPolos: boolean; // TSP entre polos
  otimizarRotasPeriferias: boolean; // TSP local para cada polo
}

export interface ResultadoOSRM {
  routes: Array<{
    distance: number; // metros
    duration: number; // segundos
    geometry: any; // GeoJSON LineString ou encoded polyline
    legs: Array<{
      distance: number;
      duration: number;
      steps: Array<{
        distance: number;
        duration: number;
        geometry: any;
        maneuver: {
          type: string;
          instruction: string;
          location: [number, number];
        };
      }>;
    }>;
  }>;
  waypoints: Array<{
    location: [number, number];
    name?: string;
  }>;
}

export interface EstadoRotas {
  polosSelecionados: MunicipioPolo[];
  periferiasSelecionadas: MunicipioPeriferia[];
  rotaAtual: RotaCompleta | null;
  configuracao: ConfiguracaoRota;
  carregando: boolean;
  erro: string | null;
  cacheRotas: Map<string, RotaCompleta>;
}