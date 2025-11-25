// Tipos para o sistema de rotas entre municípios

export interface Coordenada {
  lat: number;
  lng: number;
}

export interface PistaVoo {
  codigo_pista: string; // Código ICAO (ex: "SBCZ")
  nome_pista: string; // Nome oficial do aeródromo
  tipo_pista: string; // "PUBLI" (pública) ou "PRIV" (privada)
  latitude_pista: number;
  longitude_pista: number;
  coordenadas: Coordenada; // Coordenadas da pista
}

export interface MunicipioBase {
  codigo: string;
  nome: string;
  uf: string;
  estado: string;
  coordenadas: Coordenada;
  populacao: number;
  tipo: 'polo' | 'periferia' | 'sem_tag';
  pistas?: PistaVoo[]; // Pistas de voo disponíveis no município
  pistaSelecionada?: PistaVoo; // Pista escolhida pelo usuário para cálculos
}

export interface MunicipioPolo extends MunicipioBase {
  tipo: 'polo';
  temPistaVoo: boolean;
  aeroporto: boolean;
  tipoTransporteDisponivel: string[];
  periferias: MunicipioPeriferia[];
  pistas?: PistaVoo[]; // Override para garantir tipagem
  pistaSelecionada?: PistaVoo;
}

export interface MunicipioPeriferia extends MunicipioBase {
  tipo: 'periferia' | 'sem_tag';
  poloVinculado?: string; // codigo do polo
}

export interface TrechoVoo {
  tipo: 'voo';
  origem: MunicipioPolo;
  destino: MunicipioPolo;
  distanciaKm: number;
  tempoMinutos: number;
  geometria: [number, number][]; // linha reta
  usaPistaOrigem?: boolean; // Se true, usou coordenadas da pista na origem
  usaPistaDestino?: boolean; // Se true, usou coordenadas da pista no destino
  metodoCalculo?: 'pista-pista' | 'pista-municipio' | 'municipio-pista' | 'municipio-municipio'; // Método usado
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
  /**
   * Quando true, a rota entre polos deve ser fechada,
   * retornando ao primeiro polo selecionado no final do trajeto.
   */
  retornarParaOrigem?: boolean;
  /**
   * Overrides explícitos definidos pelo usuário para trechos entre polos.
   * Chave no formato "<codigoOrigem>-><codigoDestino>", valor: 'voo' | 'terrestre'.
   * Quando não definido, o padrão é 'voo'.
   */
  poloToPoloOverrides?: Record<string, 'voo' | 'terrestre'>;
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