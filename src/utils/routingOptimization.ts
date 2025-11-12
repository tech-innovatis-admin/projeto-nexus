/**
 * Utilitários para otimização avançada de rotas com Google Routes API
 * Complementa routingUtils.ts com lógica multimodal (voo + terrestre)
 */

import type {
  MunicipioPolo,
  MunicipioPeriferia,
  TrechoVoo,
  TrechoTerrestre,
  RotaCompleta,
  ConfiguracaoRota,
  EstatisticasRota
} from '@/types/routing';
import {
  calcularDistanciaHaversine,
  calcularTempoVoo,
  criarTrechoVoo,
  calcularRotaTerrestre,
  otimizarSequenciaWaypoints,
  calcularEstatisticasRota
} from './routingUtils';

/**
 * Estratégia de roteamento multimodal
 * Decide quando usar voo vs terrestre para deslocamentos polo-polo
 */
export interface EstrategiaRoteamento {
  preferirVoo: boolean; // Se true, sempre usa voo entre polos
  distanciaMaximaTerrestreKm?: number; // Acima disso, força voo
  considerarCusto?: boolean; // Se true, compara custo voo vs terrestre
}

/**
 * Calcula rota otimizada multimodal completa
 * Integra voos entre polos + rotas terrestres para periferias
 */
export async function calcularRotaMultimodal(
  polos: MunicipioPolo[],
  periferias: MunicipioPeriferia[],
  configuracao: ConfiguracaoRota,
  estrategia: EstrategiaRoteamento = { preferirVoo: true }
): Promise<RotaCompleta> {
  console.log(`🌍 [Otimização] Iniciando cálculo multimodal: ${polos.length} polos, ${periferias.length} periferias`);

  try {
    // 1. Vincular periferias aos polos mais próximos
    const polosVinculados = vincularPeriferiaAosPolo(polos, periferias);
    console.log(`🔗 [Otimização] Periferias vinculadas aos polos`);

    // 2. Otimizar sequência de polos usando Google Routes API
    let sequenciaPolos: MunicipioPolo[] = polosVinculados;
    
    if (configuracao.otimizarOrdemPolos && polosVinculados.length > 1) {
      console.log(`🎯 [Otimização] Otimizando sequência de ${polosVinculados.length} polos...`);
      
      // Usar Google Routes para otimizar sequência de voos entre polos
      const ordemOtimizada = await otimizarSequenciaPolos(polosVinculados);
      sequenciaPolos = ordemOtimizada;
      
      console.log(`✅ [Otimização] Sequência otimizada:`, sequenciaPolos.map(p => p.nome));
    }

    // 3. Construir trechos da rota completa
    const trechos: (TrechoVoo | TrechoTerrestre)[] = [];

    // 3.1. Criar trechos de voo entre polos
    for (let i = 0; i < sequenciaPolos.length - 1; i++) {
      const poloAtual = sequenciaPolos[i];
      const proximoPolo = sequenciaPolos[i + 1];

      // Decisão: voo ou terrestre para polo→polo?
      const distancia = calcularDistanciaHaversine(poloAtual.coordenadas, proximoPolo.coordenadas);
      
      if (estrategia.preferirVoo || 
          (estrategia.distanciaMaximaTerrestreKm && distancia > estrategia.distanciaMaximaTerrestreKm)) {
        // Usar voo
        trechos.push(criarTrechoVoo(poloAtual, proximoPolo, configuracao));
        console.log(`✈️ [Otimização] Voo: ${poloAtual.nome} → ${proximoPolo.nome} (${distancia.toFixed(1)}km)`);
      } else {
        // Usar terrestre (raro, mas possível se configurado)
        const trechoTerrestre = await calcularRotaTerrestre(poloAtual, proximoPolo);
        trechos.push(trechoTerrestre);
        console.log(`🚗 [Otimização] Terrestre: ${poloAtual.nome} → ${proximoPolo.nome} (${trechoTerrestre.distanciaKm}km)`);
      }
    }

    // 3.2. Para cada polo, criar rotas terrestres otimizadas para suas periferias
    for (const polo of sequenciaPolos) {
      if (polo.periferias.length === 0) continue;

      console.log(`📍 [Otimização] Processando ${polo.periferias.length} periferias de ${polo.nome}`);

      if (configuracao.otimizarRotasPeriferias && polo.periferias.length > 1) {
        // Otimizar sequência de periferias com Google Routes
        const trechosOtimizados = await otimizarRotaPeriferias(polo, polo.periferias);
        trechos.push(...trechosOtimizados);
      } else {
        // Sem otimização: visita em ordem original
        for (const periferia of polo.periferias) {
          const trechoIda = await calcularRotaTerrestre(polo, periferia);
          const trechoVolta = await calcularRotaTerrestre(periferia, polo);
          trechos.push(trechoIda, trechoVolta);
        }
      }
    }

    // 4. Calcular estatísticas finais
    const estatisticas = calcularEstatisticasRota(trechos);

    // 5. Criar objeto da rota completa
    const rotaCompleta: RotaCompleta = {
      id: `rota_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      nome: gerarNomeRota(polos, periferias),
      trechos,
      estatisticas,
      criadaEm: new Date()
    };

    console.log(`✅ [Otimização] Rota multimodal calculada:`, {
      trechos: trechos.length,
      distanciaTotal: estatisticas.distanciaTotalKm.toFixed(1),
      tempoTotal: estatisticas.tempoTotalMinutos
    });

    return rotaCompleta;

  } catch (error) {
    console.error(`❌ [Otimização] Erro ao calcular rota multimodal:`, error);
    throw error;
  }
}

/**
 * Otimiza sequência de polos usando Google Routes API
 */
async function otimizarSequenciaPolos(polos: MunicipioPolo[]): Promise<MunicipioPolo[]> {
  if (polos.length <= 1) return polos;

  try {
    // Usar primeiro polo como início
    const inicio = polos[0];
    const waypoints = polos.slice(1);

    const resultado = await otimizarSequenciaWaypoints(inicio, waypoints, false);

    // Reordenar polos baseado na ordem otimizada
    const polosOrdenados = [inicio];
    for (const indice of resultado.ordem) {
      polosOrdenados.push(waypoints[indice]);
    }

    return polosOrdenados;
  } catch (error) {
    console.warn(`⚠️ [Otimização] Falha na otimização de polos, usando ordem original:`, error);
    return polos;
  }
}

/**
 * Otimiza rota de um polo para suas periferias usando Google Routes API
 * Retorna lista de trechos terrestres otimizados: polo → periferias → polo
 */
async function otimizarRotaPeriferias(
  polo: MunicipioPolo,
  periferias: MunicipioPeriferia[]
): Promise<TrechoTerrestre[]> {
  if (periferias.length === 0) return [];

  try {
    console.log(`🔄 [Otimização] Otimizando rota para ${periferias.length} periferias de ${polo.nome}`);

    // Otimizar sequência (retorna ao polo)
    const resultado = await otimizarSequenciaWaypoints(polo, periferias, true);

    // Criar trechos baseados na ordem otimizada
    const trechos: TrechoTerrestre[] = [];

    // Primeiro trecho: polo → primeira periferia
    const primeiraPeriferia = periferias[resultado.ordem[0]];
    const trechoInicial = await calcularRotaTerrestre(polo, primeiraPeriferia);
    trechos.push(trechoInicial);

    // Trechos intermediários: periferia → periferia
    for (let i = 0; i < resultado.ordem.length - 1; i++) {
      const periferiaAtual = periferias[resultado.ordem[i]];
      const proximaPeriferia = periferias[resultado.ordem[i + 1]];
      const trecho = await calcularRotaTerrestre(periferiaAtual, proximaPeriferia);
      trechos.push(trecho);
    }

    // Último trecho: última periferia → polo
    const ultimaPeriferia = periferias[resultado.ordem[resultado.ordem.length - 1]];
    const trechoRetorno = await calcularRotaTerrestre(ultimaPeriferia, polo);
    trechos.push(trechoRetorno);

    console.log(`✅ [Otimização] Rota otimizada criada: ${trechos.length} trechos`);
    return trechos;

  } catch (error) {
    console.warn(`⚠️ [Otimização] Falha na otimização de periferias, usando fallback:`, error);
    
    // Fallback: visita simples sem otimização
    const trechos: TrechoTerrestre[] = [];
    for (const periferia of periferias) {
      const trechoIda = await calcularRotaTerrestre(polo, periferia);
      const trechoVolta = await calcularRotaTerrestre(periferia, polo);
      trechos.push(trechoIda, trechoVolta);
    }
    return trechos;
  }
}

/**
 * Vincula periferias aos polos mais próximos
 */
function vincularPeriferiaAosPolo(
  polos: MunicipioPolo[],
  periferias: MunicipioPeriferia[]
): MunicipioPolo[] {
  const polosComPeriferias = polos.map(polo => ({
    ...polo,
    periferias: [] as MunicipioPeriferia[]
  }));

  for (const periferia of periferias) {
    // Se já tem vínculo definido, usar esse
    if (periferia.poloVinculado) {
      const polo = polosComPeriferias.find(p => p.codigo === periferia.poloVinculado);
      if (polo) {
        polo.periferias.push(periferia);
        continue;
      }
    }

    // Senão, vincular ao polo mais próximo
    let poloMaisProximo: typeof polosComPeriferias[0] | null = null;
    let menorDistancia = Infinity;

    for (const polo of polosComPeriferias) {
      const distancia = calcularDistanciaHaversine(polo.coordenadas, periferia.coordenadas);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        poloMaisProximo = polo;
      }
    }

    if (poloMaisProximo) {
      poloMaisProximo.periferias.push(periferia);
    }
  }

  return polosComPeriferias;
}

/**
 * Gera nome descritivo para a rota
 */
function gerarNomeRota(polos: MunicipioPolo[], periferias: MunicipioPeriferia[]): string {
  if (polos.length === 1 && periferias.length === 0) {
    return `Rota: ${polos[0].nome}`;
  }
  
  if (polos.length === 1) {
    return `${polos[0].nome} + ${periferias.length} periferias`;
  }

  const totalMunicipios = polos.length + periferias.length;
  return `Rota Otimizada: ${polos.length} polos, ${periferias.length} periferias (${totalMunicipios} municípios)`;
}

/**
 * Valida se a configuração de rota é válida
 */
export function validarConfiguracaoRota(config: ConfiguracaoRota): boolean {
  if (config.velocidadeMediaVooKmh < 100 || config.velocidadeMediaVooKmh > 1000) {
    console.warn('[Validação] Velocidade de voo fora do intervalo válido (100-1000 km/h)');
    return false;
  }

  if (config.limitarDistanciaMaximaTerrestreKm && config.limitarDistanciaMaximaTerrestreKm < 0) {
    console.warn('[Validação] Distância máxima terrestre não pode ser negativa');
    return false;
  }

  return true;
}

/**
 * Exporta rota para formato JSON estruturado
 */
export function exportarRotaJSON(rota: RotaCompleta): string {
  const exportData = {
    id: rota.id,
    nome: rota.nome,
    criadaEm: rota.criadaEm.toISOString(),
    estatisticas: rota.estatisticas,
    trechos: rota.trechos.map(trecho => ({
      tipo: trecho.tipo,
      origem: {
        codigo: trecho.origem.codigo,
        nome: trecho.origem.nome,
        uf: trecho.origem.uf,
        coordenadas: trecho.origem.coordenadas
      },
      destino: {
        codigo: trecho.destino.codigo,
        nome: trecho.destino.nome,
        uf: trecho.destino.uf,
        coordenadas: trecho.destino.coordenadas
      },
      distanciaKm: trecho.distanciaKm,
      tempoMinutos: trecho.tempoMinutos,
      geometria: trecho.geometria,
      instrucoes: trecho.tipo === 'terrestre' ? trecho.instrucoes : undefined
    }))
  };

  return JSON.stringify(exportData, null, 2);
}

