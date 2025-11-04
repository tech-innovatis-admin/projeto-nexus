import { useState, useCallback, useMemo } from 'react';
import type {
  MunicipioPolo,
  MunicipioPeriferia,
  RotaCompleta,
  ConfiguracaoRota,
  EstadoRotas,
  TrechoVoo,
  TrechoTerrestre
} from '@/types/routing';
import {
  criarTrechoVoo,
  criarTrechoTerrestre,
  resolverTSP,
  calcularEstatisticasRota,
  calcularDistanciaHaversine
} from '@/utils/routingUtils';

const CONFIGURACAO_PADRAO: ConfiguracaoRota = {
  velocidadeMediaVooKmh: 300, // Helicóptero médio
  preferirVooEntrePolos: true,
  otimizarOrdemPolos: true,
  otimizarRotasPeriferias: true,
  limitarDistanciaMaximaTerrestreKm: undefined,
  poloToPoloOverrides: {}
};

export function useRotas() {
  const [estado, setEstado] = useState<EstadoRotas>({
    polosSelecionados: [],
    periferiasSelecionadas: [],
    rotaAtual: null,
    configuracao: CONFIGURACAO_PADRAO,
    carregando: false,
    erro: null,
    cacheRotas: new Map()
  });

  // Selecionar/desselecionar polos
  const togglePolo = useCallback((polo: MunicipioPolo) => {
    setEstado(prev => {
      const jaEstaSeleccionado = prev.polosSelecionados.some(p => p.codigo === polo.codigo);

      // Se está desmarcando, permitir
      if (jaEstaSeleccionado) {
        const novosPolos = prev.polosSelecionados.filter(p => p.codigo !== polo.codigo);
        return {
          ...prev,
          polosSelecionados: novosPolos,
          rotaAtual: null // Invalidar rota atual
        };
      }

      // Se está marcando, verificar limite total
      const totalSelecionados = prev.polosSelecionados.length + prev.periferiasSelecionadas.length;
      if (totalSelecionados >= 40) {
        return {
          ...prev,
          erro: 'Limite de 40 municípios selecionados atingido para proteger a API'
        };
      }

      const novosPolos = [...prev.polosSelecionados, polo];
      return {
        ...prev,
        polosSelecionados: novosPolos,
        rotaAtual: null, // Invalidar rota atual
        erro: null // Limpar erro anterior
      };
    });
  }, []);

  // Selecionar/desselecionar periferias
  const togglePeriferia = useCallback((periferia: MunicipioPeriferia) => {
    setEstado(prev => {
      const jaEstaSeleccionada = prev.periferiasSelecionadas.some(p => p.codigo === periferia.codigo);

      // Se está desmarcando, permitir
      if (jaEstaSeleccionada) {
        const novasPerifeiras = prev.periferiasSelecionadas.filter(p => p.codigo !== periferia.codigo);
        return {
          ...prev,
          periferiasSelecionadas: novasPerifeiras,
          rotaAtual: null // Invalidar rota atual
        };
      }

      // Se está marcando, verificar limite total
      const totalSelecionados = prev.polosSelecionados.length + prev.periferiasSelecionadas.length;
      if (totalSelecionados >= 40) {
        return {
          ...prev,
          erro: 'Limite de 40 municípios selecionados atingido para proteger a API'
        };
      }

      const novasPerifeiras = [...prev.periferiasSelecionadas, periferia];
      return {
        ...prev,
        periferiasSelecionadas: novasPerifeiras,
        rotaAtual: null, // Invalidar rota atual
        erro: null // Limpar erro anterior
      };
    });
  }, []);

  // Atualizar configuração
  const atualizarConfiguracao = useCallback((novaConfiguracao: Partial<ConfiguracaoRota>) => {
    setEstado(prev => {
      const chaves = Object.keys(novaConfiguracao);
      const apenasOverrides = chaves.length > 0 && chaves.every(k => k === 'poloToPoloOverrides');
      const novaConfig = { ...prev.configuracao, ...novaConfiguracao } as ConfiguracaoRota;

      return {
        ...prev,
        configuracao: novaConfig,
        // Não invalidar a rota quando apenas os overrides polo→polo foram alterados;
        // o usuário recalcula manualmente ao clicar em "Calcular Rota".
        rotaAtual: apenasOverrides ? prev.rotaAtual : null
      };
    });
  }, []);

  // Vincular periferias aos polos mais próximos
  const vincularPeriferias = useCallback((polos: MunicipioPolo[], periferias: MunicipioPeriferia[]): MunicipioPolo[] => {
    const polosComPeriferias = polos.map(polo => ({ ...polo, periferias: [] as MunicipioPeriferia[] }));
    
    for (const periferia of periferias) {
      if (periferia.poloVinculado) {
        // Se já tem vínculo definido, usar esse
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
  }, []);

  // Calcular rota otimizada
  const calcularRota = useCallback(async (): Promise<void> => {
    const { polosSelecionados, periferiasSelecionadas, configuracao, cacheRotas } = estado;

    console.log('🚀 [useRotas] Iniciando cálculo de rota...');
    console.log('🚀 [useRotas] Polos selecionados:', polosSelecionados.length);
    console.log('🚀 [useRotas] Periferias selecionadas:', periferiasSelecionadas.length);
    console.log('🚀 [useRotas] Configuração:', configuracao);

    // Permitir rotas apenas com periferias (transporte terrestre entre elas)
    if (polosSelecionados.length === 0 && periferiasSelecionadas.length === 0) {
      console.log('❌ [useRotas] Nenhum município selecionado');
      setEstado(prev => ({ ...prev, erro: 'Selecione pelo menos um município' }));
      return;
    }

    // Verificar cache
    const chaveCache = JSON.stringify({
      polos: polosSelecionados.map(p => p.codigo).sort(),
      periferias: periferiasSelecionadas.map(p => p.codigo).sort(),
      configuracao
    });

    if (cacheRotas.has(chaveCache)) {
      setEstado(prev => ({ ...prev, rotaAtual: cacheRotas.get(chaveCache)! }));
      return;
    }

    setEstado(prev => ({ ...prev, carregando: true, erro: null }));

    try {
      const trechos: (TrechoVoo | TrechoTerrestre)[] = [];

      // Caso especial: apenas periferias selecionadas
      if (polosSelecionados.length === 0 && periferiasSelecionadas.length > 0) {
        console.log('🔄 [useRotas] Calculando rota otimizada apenas entre periferias');

        if (periferiasSelecionadas.length === 1) {
          // Apenas uma periferia - rota simples
          trechos.push(await criarTrechoTerrestre(periferiasSelecionadas[0], periferiasSelecionadas[0]));
        } else {
          // Múltiplas periferias - usar algoritmo de otimização (Nearest Neighbor)
          const periferiasOrdenadas = configuracao.otimizarOrdemPolos
            ? resolverTSPPeriferiasIndependentes(periferiasSelecionadas)
            : periferiasSelecionadas;

          console.log('📋 [useRotas] Ordem selecionada:', periferiasSelecionadas.map(p => p.nome).join(', '));
          console.log('🎯 [useRotas] Ordem otimizada:', periferiasOrdenadas.map(p => p.nome).join(' → '));

          // Criar trechos terrestres entre todas as periferias na ordem otimizada
          for (let i = 0; i < periferiasOrdenadas.length - 1; i++) {
            const periferiaAtual = periferiasOrdenadas[i];
            const proximaPeriferia = periferiasOrdenadas[i + 1];
            const trecho = await criarTrechoTerrestre(periferiaAtual, proximaPeriferia);
            trechos.push(trecho);
          }
        }
      } else {
        // Caso normal: polos com ou sem periferias
        // 1. Vincular periferias aos polos
        const polosComPeriferias = vincularPeriferias(polosSelecionados, periferiasSelecionadas);

        // 2. Otimizar ordem dos polos (TSP)
        const polosOrdenados = configuracao.otimizarOrdemPolos
          ? resolverTSP(polosComPeriferias)
          : polosComPeriferias;

        // 3. Construir rota intercalando polos e periferias na sequência correta
        for (let i = 0; i < polosOrdenados.length; i++) {
          const poloAtual = polosOrdenados[i];

          // 3.1. Visitar periferias do polo atual (se houver)
          if (poloAtual.periferias.length > 0) {
            if (configuracao.otimizarRotasPeriferias && poloAtual.periferias.length > 1) {
              // TSP para periferias (simplificado - nearest neighbor)
              const periferiasOrdenadas = resolverTSPPeriferias(poloAtual, poloAtual.periferias);
              
              // Rota: polo -> primeira periferia
              const primeiraPeriferia = periferiasOrdenadas[0];
              const trechoInicial = await criarTrechoTerrestre(poloAtual, primeiraPeriferia);
              trechos.push(trechoInicial);

              // Rotas: periferia -> periferia
              for (let j = 0; j < periferiasOrdenadas.length - 1; j++) {
                const periferiaAtual = periferiasOrdenadas[j];
                const proximaPeriferia = periferiasOrdenadas[j + 1];
                const trecho = await criarTrechoTerrestre(periferiaAtual, proximaPeriferia);
                trechos.push(trecho);
              }

              // Rota: última periferia -> polo
              const ultimaPeriferia = periferiasOrdenadas[periferiasOrdenadas.length - 1];
              const trechoRetorno = await criarTrechoTerrestre(ultimaPeriferia, poloAtual);
              trechos.push(trechoRetorno);

            } else {
              // Sem otimização: polo -> cada periferia -> polo
              for (const periferia of poloAtual.periferias) {
                const trechoIda = await criarTrechoTerrestre(poloAtual, periferia);
                const trechoVolta = await criarTrechoTerrestre(periferia, poloAtual);
                trechos.push(trechoIda, trechoVolta);
              }
            }
          }

          // 3.2. Trecho entre polos (se houver próximo polo)
          if (i < polosOrdenados.length - 1) {
            const proximoPolo = polosOrdenados[i + 1];
            // Verificar override do usuário para este par de polos
            const chaveOverride = `${poloAtual.codigo}->${proximoPolo.codigo}`;
            const modo = configuracao.poloToPoloOverrides?.[chaveOverride] || (configuracao.preferirVooEntrePolos ? 'voo' : 'terrestre');

            if (modo === 'terrestre') {
              // Permitir explicitamente rota terrestre entre polos
              const trecho = await criarTrechoTerrestre(poloAtual, proximoPolo, true);
              trechos.push(trecho);
            } else {
              trechos.push(criarTrechoVoo(poloAtual, proximoPolo, configuracao));
            }
          }
        }
      }

      // 5. Criar rota completa
      const estatisticas = calcularEstatisticasRota(trechos);

      // Definir nome da rota baseado no tipo de seleção
      let nomeRota: string;
      if (polosSelecionados.length === 0 && periferiasSelecionadas.length > 0) {
        nomeRota = `Rota ${periferiasSelecionadas.length} periferias`;
      } else {
        nomeRota = `Rota ${polosSelecionados.length} polos - ${periferiasSelecionadas.length} periferias`;
      }

      const novaRota: RotaCompleta = {
        id: `rota_${Date.now()}`,
        nome: nomeRota,
        trechos,
        estatisticas,
        criadaEm: new Date()
      };

      console.log('✅ [useRotas] Rota calculada com sucesso!');
      console.log('✅ [useRotas] Estatísticas da rota:', {
        distanciaTotal: estatisticas.distanciaTotalKm.toFixed(2) + ' km',
        tempoTotal: estatisticas.tempoTotalMinutos + ' min',
        trechosTotais: trechos.length,
        polosVisitados: polosSelecionados.length,
        periferiasVisitadas: periferiasSelecionadas.length
      });

      // Adicionar ao cache
      const novoCache = new Map(cacheRotas);
      novoCache.set(chaveCache, novaRota);

      setEstado(prev => ({
        ...prev,
        rotaAtual: novaRota,
        cacheRotas: novoCache,
        carregando: false
      }));

    } catch (error) {
      console.error('Erro ao calcular rota:', error);
      setEstado(prev => ({
        ...prev,
        erro: error instanceof Error ? error.message : 'Erro desconhecido',
        carregando: false
      }));
    }
  }, [estado, vincularPeriferias]);

  // TSP simplificado para periferias de um polo
  const resolverTSPPeriferias = useCallback((polo: MunicipioPolo, periferias: MunicipioPeriferia[]): MunicipioPeriferia[] => {
    if (periferias.length <= 1) return periferias;

    const visitadas = new Set<string>();
    const rota: MunicipioPeriferia[] = [];
    
    // Começar pela periferia mais próxima do polo
    let atual: MunicipioPeriferia | null = null;
    let menorDistancia = Infinity;

    for (const periferia of periferias) {
      const distancia = calcularDistanciaHaversine(polo.coordenadas, periferia.coordenadas);
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        atual = periferia;
      }
    }

    if (!atual) return periferias;

    rota.push(atual);
    visitadas.add(atual.codigo);

    // Nearest neighbor para o resto
    while (visitadas.size < periferias.length) {
      let proximaMaisProxima: MunicipioPeriferia | null = null;
      let menorDist = Infinity;

      for (const periferia of periferias) {
        if (visitadas.has(periferia.codigo)) continue;

        const dist = calcularDistanciaHaversine(atual!.coordenadas, periferia.coordenadas);
        if (dist < menorDist) {
          menorDist = dist;
          proximaMaisProxima = periferia;
        }
      }

      if (proximaMaisProxima) {
        rota.push(proximaMaisProxima);
        visitadas.add(proximaMaisProxima.codigo);
        atual = proximaMaisProxima;
      }
    }

    return rota;
  }, []);

  // Função auxiliar para encontrar o centro geográfico de um grupo de periferias
  const encontrarCentroGeografico = useCallback((periferias: MunicipioPeriferia[]): MunicipioPeriferia => {
    if (periferias.length === 1) return periferias[0];
    
    // Calcular centroide aproximado
    let somaLat = 0;
    let somaLng = 0;
    
    for (const p of periferias) {
      somaLat += p.coordenadas.lat;
      somaLng += p.coordenadas.lng;
    }
    
    const centroLat = somaLat / periferias.length;
    const centroLng = somaLng / periferias.length;
    
    // Encontrar a periferia mais próxima do centro calculado
    let maisProxima = periferias[0];
    let menorDistancia = calcularDistanciaHaversine(
      { lat: centroLat, lng: centroLng }, 
      maisProxima.coordenadas
    );
    
    for (const p of periferias) {
      const distancia = calcularDistanciaHaversine(
        { lat: centroLat, lng: centroLng }, 
        p.coordenadas
      );
      if (distancia < menorDistancia) {
        menorDistancia = distancia;
        maisProxima = p;
      }
    }
    
    console.log(`📍 [useRotas] Centro geográfico: ${maisProxima.nome} (mais próximo do centroide)`);
    return maisProxima;
  }, []);

  // Resolver TSP para periferias independentes (sem polo)
  const resolverTSPPeriferiasIndependentes = useCallback((periferias: MunicipioPeriferia[]): MunicipioPeriferia[] => {
    if (periferias.length <= 1) return periferias;

    console.log('🔄 [useRotas] Otimizando ordem de periferias independentes...');

    const visitadas = new Set<string>();
    const rota: MunicipioPeriferia[] = [];

    // Usar o PRIMEIRO município da lista como ponto de partida
    let atual = periferias[0];
    rota.push(atual);
    visitadas.add(atual.codigo);

    console.log(`🎯 [useRotas] Ponto de partida: ${atual.nome} (primeiro da seleção)`);

    // Nearest neighbor para os demais municípios
    while (visitadas.size < periferias.length) {
      let proximaMaisProxima: MunicipioPeriferia | null = null;
      let menorDist = Infinity;

      for (const periferia of periferias) {
        if (visitadas.has(periferia.codigo)) continue;

        const dist = calcularDistanciaHaversine(atual.coordenadas, periferia.coordenadas);
        if (dist < menorDist) {
          menorDist = dist;
          proximaMaisProxima = periferia;
        }
      }

      if (proximaMaisProxima) {
        rota.push(proximaMaisProxima);
        visitadas.add(proximaMaisProxima.codigo);
        atual = proximaMaisProxima;
      }
    }

    console.log('✅ [useRotas] Rota otimizada:', rota.map(p => p.nome).join(' → '));
    return rota;
  }, []);

  // Limpar seleções
  const limparSelecoes = useCallback(() => {
    setEstado(prev => ({
      ...prev,
      polosSelecionados: [],
      periferiasSelecionadas: [],
      rotaAtual: null,
      erro: null
    }));
  }, []);

  // Valores computados
  const temSelecoes = useMemo(() => {
    return estado.polosSelecionados.length > 0 || estado.periferiasSelecionadas.length > 0;
  }, [estado.polosSelecionados.length, estado.periferiasSelecionadas.length]);

  const podeCalcularRota = useMemo(() => {
    return temSelecoes && !estado.carregando;
  }, [temSelecoes, estado.carregando]);

  return {
    // Estado
    polosSelecionados: estado.polosSelecionados,
    periferiasSelecionadas: estado.periferiasSelecionadas,
    rotaAtual: estado.rotaAtual,
    configuracao: estado.configuracao,
    carregando: estado.carregando,
    erro: estado.erro,
    
    // Computados
    temSelecoes,
    podeCalcularRota,
    
    // Ações
    togglePolo,
    togglePeriferia,
    atualizarConfiguracao,
    calcularRota,
    limparSelecoes
  };
}