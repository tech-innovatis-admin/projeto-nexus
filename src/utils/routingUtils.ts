import * as turf from '@turf/turf';
import type {
  Coordenada,
  MunicipioBase,
  MunicipioPolo,
  MunicipioPeriferia,
  TrechoVoo,
  TrechoTerrestre,
  RotaCompleta,
  EstatisticasRota,
  ConfiguracaoRota,
  InstrucaoRota
} from '@/types/routing';

/**
 * Calcula distância haversine entre duas coordenadas
 */
export function calcularDistanciaHaversine(origem: Coordenada, destino: Coordenada): number {
  const from = turf.point([origem.lng, origem.lat]);
  const to = turf.point([destino.lng, destino.lat]);
  return turf.distance(from, to, { units: 'kilometers' });
}

/**
 * Calcula tempo de voo baseado na distância e velocidade média
 */
export function calcularTempoVoo(distanciaKm: number, velocidadeKmh: number): number {
  return (distanciaKm / velocidadeKmh) * 60; // retorna em minutos
}

/**
 * Cria um trecho de voo entre dois polos
 * Usa coordenadas das pistas se estiverem selecionadas e disponíveis
 */
export function criarTrechoVoo(
  origem: MunicipioPolo,
  destino: MunicipioPolo,
  configuracao: ConfiguracaoRota
): TrechoVoo {
  // Determinar coordenadas de origem
  let coordOrigem = origem.coordenadas;
  let usaPistaOrigem = false;
  
  if (origem.pistaSelecionada &&
      origem.pistaSelecionada.latitude_pista !== 0 &&
      origem.pistaSelecionada.longitude_pista !== 0 &&
      origem.pistaSelecionada.coordenadas.lat !== 0 &&
      origem.pistaSelecionada.coordenadas.lng !== 0) {
    coordOrigem = origem.pistaSelecionada.coordenadas;
    usaPistaOrigem = true;
    console.log(`✈️ [criarTrechoVoo] Usando pista de origem: ${origem.pistaSelecionada.codigo_pista} em ${origem.nome}`);
  } else if (origem.pistas && origem.pistas.length > 0 && !origem.pistaSelecionada) {
    console.log(`⚠️ [criarTrechoVoo] ${origem.nome} tem ${origem.pistas.length} pista(s), mas nenhuma selecionada. Usando centro do município.`);
  }
  
  // Determinar coordenadas de destino
  let coordDestino = destino.coordenadas;
  let usaPistaDestino = false;
  
  if (destino.pistaSelecionada &&
      destino.pistaSelecionada.latitude_pista !== 0 &&
      destino.pistaSelecionada.longitude_pista !== 0 &&
      destino.pistaSelecionada.coordenadas.lat !== 0 &&
      destino.pistaSelecionada.coordenadas.lng !== 0) {
    coordDestino = destino.pistaSelecionada.coordenadas;
    usaPistaDestino = true;
    console.log(`✈️ [criarTrechoVoo] Usando pista de destino: ${destino.pistaSelecionada.codigo_pista} em ${destino.nome}`);
  } else if (destino.pistas && destino.pistas.length > 0 && !destino.pistaSelecionada) {
    console.log(`⚠️ [criarTrechoVoo] ${destino.nome} tem ${destino.pistas.length} pista(s), mas nenhuma selecionada. Usando centro do município.`);
  }
  
  // Calcular distância usando as coordenadas determinadas
  const distancia = calcularDistanciaHaversine(coordOrigem, coordDestino);
  const tempo = calcularTempoVoo(distancia, configuracao.velocidadeMediaVooKmh);
  
  // Determinar método de cálculo
  let metodoCalculo: 'pista-pista' | 'pista-municipio' | 'municipio-pista' | 'municipio-municipio';
  if (usaPistaOrigem && usaPistaDestino) {
    metodoCalculo = 'pista-pista';
  } else if (usaPistaOrigem && !usaPistaDestino) {
    metodoCalculo = 'pista-municipio';
  } else if (!usaPistaOrigem && usaPistaDestino) {
    metodoCalculo = 'municipio-pista';
  } else {
    metodoCalculo = 'municipio-municipio';
  }
  
  console.log(`📏 [criarTrechoVoo] ${origem.nome} → ${destino.nome}: ${distancia.toFixed(2)}km (método: ${metodoCalculo})`);
  
  return {
    tipo: 'voo',
    origem,
    destino,
    distanciaKm: distancia,
    tempoMinutos: tempo,
    geometria: [
      [coordOrigem.lng, coordOrigem.lat],
      [coordDestino.lng, coordDestino.lat]
    ],
    usaPistaOrigem,
    usaPistaDestino,
    metodoCalculo
  };
}

/**
 * Interface para resultado da API Google Maps
 */
interface ResultadoGoogleMaps {
  origem: {
    codigo: string;
    nome: string;
    uf: string;
    tipo: 'polo' | 'periferia';
    endereco: string;
  };
  destino: {
    codigo: string;
    nome: string;
    uf: string;
    tipo: 'polo' | 'periferia';
    endereco: string;
  };
  transporte: string;
  distanciaKm: number;
  tempoMinutos: number;
  tempoTexto: string;
  distanciaTexto: string;
  geometria: [number, number][];
  instrucoes: any[];
}

/**
 * Interface para resultado da API Google Routes
 */
interface ResultadoGoogleRoutes {
  success: boolean;
  distanciaKm: number;
  tempoMinutos: number;
  geometria: [number, number][];
  instrucoes: InstrucaoRota[];
  metadados?: any;
  error?: string;
}

/**
 * Interface para compatibilidade com OSRM (formato legado)
 */
interface ResultadoOSRM {
  routes: Array<{
    distance: number;
    duration: number;
    geometry: any;
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

/**
 * Calcula rota terrestre usando Google Routes API (novo)
 * Válido para: Polo → Periferia, Periferia → Polo, Periferia → Periferia
 */
export async function calcularRotaTerrestre(
  origem: MunicipioPolo | MunicipioPeriferia,
  destino: MunicipioPolo | MunicipioPeriferia
): Promise<TrechoTerrestre> {
  try {
    console.log(`🚗 [routingUtils] Calculando rota terrestre: ${origem.nome} → ${destino.nome}`);

    // Validar que não é rota Polo → Polo (deve ser voo)
    if (origem.tipo === 'polo' && destino.tipo === 'polo') {
      console.warn(`⚠️ [routingUtils] Tentativa de rota terrestre entre polos: ${origem.nome} → ${destino.nome}`);
      throw new Error('Rotas entre polos devem ser calculadas como voo, não como rota terrestre');
    }

    // Usar nova API Google Routes com geocoding
    const response = await fetch('/api/rotas/google-routes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        origem: {
          nome: origem.nome,
          uf: origem.uf
        },
        destino: {
          nome: destino.nome,
          uf: destino.uf
        },
        travelMode: 'DRIVE'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error(`❌ [routingUtils] Erro na API: ${response.status}`, errorData);
      throw new Error(errorData?.error || `Erro ${response.status} ao calcular rota`);
    }

    const data: ResultadoGoogleRoutes = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Falha ao calcular rota terrestre');
    }

    console.log(`✅ [routingUtils] Rota calculada: ${data.distanciaKm}km, ${data.tempoMinutos}min`);

    return {
      tipo: 'terrestre',
      origem,
      destino,
      distanciaKm: data.distanciaKm,
      tempoMinutos: data.tempoMinutos,
      geometria: data.geometria,
      instrucoes: data.instrucoes
    };
  } catch (error) {
    console.error(`❌ [routingUtils] Erro ao calcular rota terrestre:`, error);
    
    // Fallback para linha reta com cálculo haversine
    console.warn(`⚠️ [routingUtils] Usando fallback (linha reta) para: ${origem.nome} → ${destino.nome}`);
    const distancia = calcularDistanciaHaversine(origem.coordenadas, destino.coordenadas);
    const tempo = (distancia / 60) * 60; // Aproximação: 60 km/h de média

    return {
      tipo: 'terrestre',
      origem,
      destino,
      distanciaKm: distancia,
      tempoMinutos: tempo,
      geometria: [
        [origem.coordenadas.lng, origem.coordenadas.lat],
        [destino.coordenadas.lng, destino.coordenadas.lat]
      ],
      instrucoes: [{
        tipo: 'straight',
        descricao: `Rota aproximada de ${origem.nome} para ${destino.nome}`,
        distanciaKm: distancia,
        tempoMinutos: tempo,
        coordenada: origem.coordenadas
      }]
    };
  }
}

/**
 * NOVA FUNÇÃO: Otimiza ordem de waypoints usando Google Routes API
 */
export async function otimizarSequenciaWaypoints(
  inicio: MunicipioPolo | MunicipioPeriferia,
  waypoints: (MunicipioPolo | MunicipioPeriferia)[],
  retornarAoInicio: boolean = false
): Promise<{
  ordem: number[];
  distanciaTotalKm: number;
  tempoTotalMin: number;
}> {
  try {
    console.log(`🎯 [routingUtils] Otimizando sequência de ${waypoints.length} waypoints`);

    if (waypoints.length === 0) {
      return { ordem: [], distanciaTotalKm: 0, tempoTotalMin: 0 };
    }

    if (waypoints.length > 25) {
      console.warn(`⚠️ [routingUtils] Limite de 25 waypoints excedido (${waypoints.length}). Usando apenas os primeiros 25.`);
      waypoints = waypoints.slice(0, 25);
    }

    const response = await fetch('/api/rotas/google-routes-optimize', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        start: {
          coordenadas: inicio.coordenadas,
          codigo: inicio.codigo,
          nome: inicio.nome,
          uf: inicio.uf,
          tipo: inicio.tipo
        },
        waypoints: waypoints.map(wp => ({
          coordenadas: wp.coordenadas,
          codigo: wp.codigo,
          nome: wp.nome,
          uf: wp.uf,
          tipo: wp.tipo
        })),
        mode: retornarAoInicio ? 'closed' : 'open'
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error(`❌ [routingUtils] Erro na API de otimização: ${response.status}`, errorData);
      throw new Error(errorData?.error || `Erro ${response.status} ao otimizar sequência`);
    }

    const data = await response.json();

    if (!data.success) {
      throw new Error(data.error || 'Falha ao otimizar sequência');
    }

    console.log(`✅ [routingUtils] Sequência otimizada: ${data.order.length} waypoints, ${data.totalDistanceKm}km`);

    return {
      ordem: data.order,
      distanciaTotalKm: data.totalDistanceKm,
      tempoTotalMin: data.totalDurationMin
    };
  } catch (error) {
    console.error(`❌ [routingUtils] Erro ao otimizar sequência:`, error);
    
    // Fallback: retorna ordem original
    console.warn(`⚠️ [routingUtils] Usando ordem original como fallback`);
    return {
      ordem: waypoints.map((_, index) => index),
      distanciaTotalKm: 0,
      tempoTotalMin: 0
    };
  }
}

/**
 * Calcula rota terrestre (compatibilidade com OSRM - DEPRECATED)
 * Use calcularRotaTerrestre(origem, destino) em vez disso
 */
export async function calcularRotaTerrestreOSRM(
  origem: Coordenada,
  destino: Coordenada,
  waypoints: Coordenada[] = []
): Promise<ResultadoOSRM> {
  console.warn('⚠️ calcularRotaTerrestreOSRM está deprecated. Use calcularRotaTerrestre com objetos de município.');
  
  // Criar objetos temporários para compatibilidade
  const origemTemp: MunicipioPeriferia = {
    codigo: 'temp_origem',
    nome: 'Origem Temporária',
    uf: 'XX',
    estado: 'Estado Temporário',
    coordenadas: origem,
    populacao: 0,
    tipo: 'periferia'
  };

  const destinoTemp: MunicipioPeriferia = {
    codigo: 'temp_destino',
    nome: 'Destino Temporário',
    uf: 'XX',
    estado: 'Estado Temporário',
    coordenadas: destino,
    populacao: 0,
    tipo: 'periferia'
  };

  try {
    const resultado = await calcularRotaTerrestre(origemTemp, destinoTemp);
    
    // Converter para formato OSRM para compatibilidade
    return {
      routes: [{
        distance: resultado.distanciaKm * 1000,
        duration: resultado.tempoMinutos * 60,
        geometry: {
          type: 'LineString',
          coordinates: resultado.geometria.map(coord => [coord[1], coord[0]]) // Inverter lat,lng para lng,lat
        },
        legs: [{
          distance: resultado.distanciaKm * 1000,
          duration: resultado.tempoMinutos * 60,
          steps: resultado.instrucoes.map((instr: any) => ({
            distance: instr.distanciaKm * 1000,
            duration: instr.tempoMinutos * 60,
            geometry: null,
            maneuver: {
              type: instr.tipo,
              instruction: instr.descricao,
              location: [instr.coordenada.lng, instr.coordenada.lat]
            }
          }))
        }]
      }],
      waypoints: [
        { location: [origem.lng, origem.lat] },
        { location: [destino.lng, destino.lat] }
      ]
    };
  } catch (error: any) {
    console.error('�️ [routingUtils] Erro na compatibilidade OSRM:', error);
    throw error;
  }
}

/**
 * Resolve TSP (Traveling Salesman Problem) usando algoritmo heurístico simples
 * Para poucos pontos, usa força bruta; para muitos, usa nearest neighbor
 */
export function resolverTSP(pontos: MunicipioPolo[], pontoInicial?: MunicipioPolo): MunicipioPolo[] {
  if (pontos.length <= 1) return pontos;
  
  // Se há menos de 8 pontos, usa força bruta
  if (pontos.length <= 8) {
    return resolverTSPForcaBruta(pontos, pontoInicial);
  }
  
  // Para mais pontos, usa heurística nearest neighbor
  return resolverTSPNearestNeighbor(pontos, pontoInicial);
}

function resolverTSPForcaBruta(pontos: MunicipioPolo[], pontoInicial?: MunicipioPolo): MunicipioPolo[] {
  if (pontos.length <= 1) return pontos;
  
  const start = pontoInicial || pontos[0];
  const remaining = pontos.filter(p => p.codigo !== start.codigo);
  
  let melhorRota = [start, ...remaining];
  let menorDistancia = calcularDistanciaRotaTotal(melhorRota);
  
  // Gerar todas as permutações dos pontos restantes
  const permutacoes = gerarPermutacoes(remaining);
  
  for (const perm of permutacoes) {
    const rota = [start, ...perm];
    const distancia = calcularDistanciaRotaTotal(rota);
    
    if (distancia < menorDistancia) {
      menorDistancia = distancia;
      melhorRota = rota;
    }
  }
  
  return melhorRota;
}

function resolverTSPNearestNeighbor(pontos: MunicipioPolo[], pontoInicial?: MunicipioPolo): MunicipioPolo[] {
  if (pontos.length <= 1) return pontos;
  
  const visitados = new Set<string>();
  const rota: MunicipioPolo[] = [];
  
  let atual = pontoInicial || pontos[0];
  rota.push(atual);
  visitados.add(atual.codigo);
  
  while (visitados.size < pontos.length) {
    let proximoMaisProximo: MunicipioPolo | null = null;
    let menorDistancia = Infinity;
    
    for (const ponto of pontos) {
      if (visitados.has(ponto.codigo)) continue;
      
      const distancia = calcularDistanciaHaversine(atual.coordenadas, ponto.coordenadas);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        proximoMaisProximo = ponto;
      }
    }
    
    if (proximoMaisProximo) {
      rota.push(proximoMaisProximo);
      visitados.add(proximoMaisProximo.codigo);
      atual = proximoMaisProximo;
    }
  }
  
  return rota;
}

function calcularDistanciaRotaTotal(rota: MunicipioPolo[]): number {
  let distanciaTotal = 0;
  
  for (let i = 0; i < rota.length - 1; i++) {
    distanciaTotal += calcularDistanciaHaversine(
      rota[i].coordenadas,
      rota[i + 1].coordenadas
    );
  }
  
  return distanciaTotal;
}

function gerarPermutacoes<T>(array: T[]): T[][] {
  if (array.length <= 1) return [array];
  
  const result: T[][] = [];
  
  for (let i = 0; i < array.length; i++) {
    const rest = [...array.slice(0, i), ...array.slice(i + 1)];
    const permutacoes = gerarPermutacoes(rest);
    
    for (const perm of permutacoes) {
      result.push([array[i], ...perm]);
    }
  }
  
  return result;
}

/**
 * Converte instruções OSRM para português
 */
export function traduzirInstrucaoOSRM(step: any): InstrucaoRota {
  const maneuver = step.maneuver;
  let descricao = '';
  
  switch (maneuver.type) {
    case 'depart':
      descricao = 'Saia do ponto de partida';
      break;
    case 'turn':
      const direcao = maneuver.modifier === 'left' ? 'esquerda' : 
                     maneuver.modifier === 'right' ? 'direita' : 'em frente';
      descricao = `Vire à ${direcao}`;
      break;
    case 'merge':
      descricao = 'Entre na via';
      break;
    case 'roundabout':
      descricao = 'Entre na rotatória';
      break;
    case 'exit roundabout':
      descricao = 'Saia da rotatória';
      break;
    case 'arrive':
      descricao = 'Chegue ao destino';
      break;
    default:
      descricao = maneuver.instruction || 'Continue em frente';
  }
  
  return {
    tipo: maneuver.type,
    descricao,
    distanciaKm: step.distance / 1000,
    tempoMinutos: step.duration / 60,
    coordenada: {
      lat: maneuver.location[1],
      lng: maneuver.location[0]
    }
  };
}

/**
 * Cria um trecho terrestre usando Google Maps API
 */
export async function criarTrechoTerrestre(
  origem: MunicipioPolo | MunicipioPeriferia,
  destino: MunicipioPolo | MunicipioPeriferia
): Promise<TrechoTerrestre> {
  const resultado = await calcularRotaTerrestre(origem, destino);
  
  if (!resultado || !resultado.geometria) {
    throw new Error('Nenhuma rota encontrada');
  }
  
  // Converter instruções do Google Maps para formato InstrucaoRota
  const instrucoes: InstrucaoRota[] = resultado.instrucoes.map((instr: any) => ({
    tipo: instr.tipo || 'straight',
    descricao: instr.descricao,
    distanciaKm: instr.distanciaKm,
    tempoMinutos: instr.tempoMinutos,
    coordenada: instr.coordenada
  }));
  
  return {
    tipo: 'terrestre',
    origem,
    destino,
    distanciaKm: resultado.distanciaKm,
    tempoMinutos: resultado.tempoMinutos,
    geometria: resultado.geometria.map(coord => [coord[1], coord[0]]), // Converter [lat,lng] para [lng,lat]
    instrucoes
  };
}

/**
 * Calcula estatísticas de uma rota completa
 */
export function calcularEstatisticasRota(trechos: (TrechoVoo | TrechoTerrestre)[]): EstatisticasRota {
  let distanciaTotalKm = 0;
  let tempoTotalMinutos = 0;
  let distanciaVooKm = 0;
  let tempoVooMinutos = 0;
  let distanciaTerrestreKm = 0;
  let tempoTerrestreMinutos = 0;
  let numeroTrechosVoo = 0;
  let numeroTrechosTerrestre = 0;
  
  const polosVisitados = new Set<string>();
  const periferiasVisitadas = new Set<string>();
  
  for (const trecho of trechos) {
    distanciaTotalKm += trecho.distanciaKm;
    tempoTotalMinutos += trecho.tempoMinutos;
    
    if (trecho.tipo === 'voo') {
      distanciaVooKm += trecho.distanciaKm;
      tempoVooMinutos += trecho.tempoMinutos;
      numeroTrechosVoo++;
      polosVisitados.add(trecho.origem.codigo);
      polosVisitados.add(trecho.destino.codigo);
    } else {
      distanciaTerrestreKm += trecho.distanciaKm;
      tempoTerrestreMinutos += trecho.tempoMinutos;
      numeroTrechosTerrestre++;
      
      if (trecho.origem.tipo === 'polo') polosVisitados.add(trecho.origem.codigo);
      if (trecho.destino.tipo === 'polo') polosVisitados.add(trecho.destino.codigo);
      if (trecho.origem.tipo === 'periferia') periferiasVisitadas.add(trecho.origem.codigo);
      if (trecho.destino.tipo === 'periferia') periferiasVisitadas.add(trecho.destino.codigo);
    }
  }
  
  return {
    distanciaTotalKm,
    tempoTotalMinutos,
    distanciaVooKm,
    tempoVooMinutos,
    distanciaTerrestreKm,
    tempoTerrestreMinutos,
    numeroPolos: polosVisitados.size,
    numeroPeriferias: periferiasVisitadas.size,
    numeroTrechosVoo,
    numeroTrechosTerrestre,
    quantidadeTrechosVoo: numeroTrechosVoo,
    quantidadeTrechosTerrestres: numeroTrechosTerrestre
  };
}

/**
 * Formata tempo em minutos para string legível
 */
export function formatarTempo(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const mins = Math.round(minutos % 60);
  
  if (horas === 0) {
    return `${mins}min`;
  } else if (mins === 0) {
    return `${horas}h`;
  } else {
    return `${horas}h${mins}min`;
  }
}

/**
 * Formata distância em km para string legível
 */
export function formatarDistancia(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)}m`;
  } else {
    return `${km.toFixed(1)}km`;
  }
}