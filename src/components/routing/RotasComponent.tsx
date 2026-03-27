import React, { useState, useEffect, useMemo } from 'react';
import { useRotas } from '@/hooks/useRotas';
import { useMapData } from '@/contexts/MapDataContext';
import ConfiguracaoRotas from './ConfiguracaoRotas';
import SeletorPistas from './SeletorPistas';
import type { 
  MunicipioPolo, 
  MunicipioPeriferia, 
  TrechoVoo, 
  TrechoTerrestre,
  Coordenada,
  PistaVoo
} from '@/types/routing';
import { formatarTempo, formatarDistancia } from '@/utils/routingUtils';
import { inicializarCacheCoordenas, isCacheInicializado } from '@/utils/coordenadasService';

interface RotasComponentProps {
  municipios: any[]; // Dados dos municípios vindos da estratégia
  onRotaChange?: (rota: any) => void; // Callback para o mapa
  className?: string;
  hideHeader?: boolean; // Opção para esconder o cabeçalho com título e subtítulo
}

export default function RotasComponent({ 
  municipios, 
  onRotaChange, 
  className = '',
  hideHeader = false
}: RotasComponentProps) {
  const {
    polosSelecionados,
    periferiasSelecionadas,
    rotaAtual,
    configuracao,
    carregando,
    erro,
    temSelecoes,
    podeCalcularRota,
    togglePolo,
    togglePeriferia,
    atualizarPoloSelecionado,
    definirPapelPolo,
    atualizarConfiguracao,
    calcularRota,
    limparSelecoes
  } = useRotas();

  const [abaSelecionada, setAbaSelecionada] = useState<'selecao' | 'configuracao' | 'resultado'>('selecao');
  const [filtroPolos, setFiltroPolos] = useState('');
  const [filtroPeriferias, setFiltroPeriferias] = useState('');
  const [estadoSelecionadoPolos, setEstadoSelecionadoPolos] = useState('');
  const [estadoSelecionadoPeriferias, setEstadoSelecionadoPeriferias] = useState('');
  const [secaoPolosAberta, setSecaoPolosAberta] = useState(true);
  const [secaoPeriferiasAberta, setSecaoPeriferiasAberta] = useState(true);

  // Obter dados de pistas e sedes municipais do contexto
  const { mapData } = useMapData();
  const pistasData = mapData?.pistas || [];
  const sedesMunicipais = mapData?.sedesMunicipais || [];
  
  // Inicializar cache de coordenadas quando os dados estiverem disponíveis
  useEffect(() => {
    if (sedesMunicipais.length > 0 && !isCacheInicializado()) {
      console.log('🚀 [RotasComponent] Inicializando cache de coordenadas municipais...');
      console.log('📊 [RotasComponent] Dados carregados da base sedes_municipais_lat_long.json:', sedesMunicipais.length, 'municípios');
      console.log('🏙️ [RotasComponent] Exemplo de dados da base:', sedesMunicipais.slice(0, 2));
      inicializarCacheCoordenas(sedesMunicipais);
      console.log('✅ [RotasComponent] Cache de coordenadas inicializado com sucesso!');
    }
  }, [sedesMunicipais]);

  // Converter dados dos municípios para tipos de rota
  const { polosDisponiveis, periferiasDisponiveis } = useMemo(() => {
    console.log('🔄 [RotasComponent] Processando municípios para rotas:', municipios.length);
    console.log('🛬 [RotasComponent] Pistas disponíveis:', pistasData.length);
    console.log('🏛️ [RotasComponent] Sedes municipais disponíveis:', sedesMunicipais.length);
    console.log('🔗 [JOIN] Iniciando joins: municípios + pistas + sedes municipais...');

    // Criar mapa de coordenadas da sede municipal por código IBGE
    const coordenadasSedePorCodigo = new Map<string, { lat: number; lng: number }>();
    if (Array.isArray(sedesMunicipais) && sedesMunicipais.length > 0) {
      sedesMunicipais.forEach((sede: any) => {
        const codigo = String(sede.codigo_ibge || '').trim();
        if (!codigo || codigo === '0' || codigo === '') return;

        // Converter coordenadas de string para número
        const lat = parseFloat(String(sede.latitude_munic || sede.latitude_munic || '').trim());
        const lng = parseFloat(String(sede.longitude_munic || sede.longitude_munic || '').trim());

        // Validar coordenadas
        const coordenadasValidas = !isNaN(lat) && !isNaN(lng) &&
                                  lat >= -90 && lat <= 90 &&
                                  lng >= -180 && lng <= 180 &&
                                  lat !== 0 && lng !== 0;

        if (coordenadasValidas) {
          coordenadasSedePorCodigo.set(codigo, { lat, lng });
          console.log(`🏛️ [JOIN] Sede municipal ${sede.municipio_br} (${codigo}) → Lat: ${lat}, Lng: ${lng}`);
        } else {
          console.warn(`⚠️ [JOIN] Coordenadas inválidas para sede ${sede.municipio_br} (${codigo}): lat=${sede.latitude_munic}, lng=${sede.longitude_munic}`);
        }
      });
      console.log(`🏛️ [RotasComponent] Sedes municipais com coordenadas válidas: ${coordenadasSedePorCodigo.size}`);
    }

    // Criar mapa de pistas por código IBGE para acesso rápido
    const pistasPorCodigo = new Map<string, PistaVoo[]>();
    
    if (Array.isArray(pistasData) && pistasData.length > 0) {
      pistasData.forEach((pista: any) => {
        // Código IBGE é tratado como string (vem como string do CSV)
        const codigo = String(pista.codigo || pista.codigo_ibge || '').trim();
        if (!codigo || codigo === '0' || codigo === '') return;

        // Converter coordenadas de string para número com validação
        const latStr = String(pista.latitude_pista || '').trim();
        const lngStr = String(pista.longitude_pista || '').trim();

        const lat = latStr ? parseFloat(latStr) : NaN;
        const lng = lngStr ? parseFloat(lngStr) : NaN;

        // Validar se são coordenadas geográficas válidas
        const coordenadasValidas = !isNaN(lat) && !isNaN(lng) &&
                                  lat >= -90 && lat <= 90 &&
                                  lng >= -180 && lng <= 180 &&
                                  lat !== 0 && lng !== 0; // Excluir coordenadas zeradas


        const pistaObj: PistaVoo = {
          codigo_pista: String(pista.codigo_pista || '').trim(),
          nome_pista: String(pista.nome_pista || '').trim(),
          tipo_pista: String(pista.tipo_pista || '').trim(),
          latitude_pista: coordenadasValidas ? lat : 0,
          longitude_pista: coordenadasValidas ? lng : 0,
          coordenadas: coordenadasValidas ? { lat, lng } : { lat: 0, lng: 0 }
        };

        if (!pistasPorCodigo.has(codigo)) {
          pistasPorCodigo.set(codigo, []);
        }
        pistasPorCodigo.get(codigo)!.push(pistaObj);
      });

      console.log('🛬 [RotasComponent] Municípios com pistas:', pistasPorCodigo.size);
    }
    
    // Arraays vazios para armazenar os municípios classificados
    const polos: MunicipioPolo[] = [];
    const periferias: MunicipioPeriferia[] = [];

    // Extração de Coordenadas - AGORA USANDO SEDES MUNICIPAIS
    municipios.forEach(municipio => {
      // Primeiro tentar obter coordenadas da sede municipal oficial
      const coordenadasSede = coordenadasSedePorCodigo.get(municipio.codigo);

      let coordenadas: Coordenada;
      if (coordenadasSede) {
        // Usar coordenadas da sede municipal oficial
        coordenadas = coordenadasSede;
        console.log(`🏛️ [COORDS] ${municipio.nome} (${municipio.codigo}) → USANDO SEDE MUNICIPAL: Lat: ${coordenadas.lat}, Lng: ${coordenadas.lng}`);
      } else {
        // Fallback para coordenadas antigas (caso sede não seja encontrada)
        coordenadas = {
          lat: parseFloat(municipio.latitude) || 0,
          lng: parseFloat(municipio.longitude) || 0
        };
        console.warn(`⚠️ [COORDS] ${municipio.nome} (${municipio.codigo}) → SEDE NÃO ENCONTRADA, usando fallback: Lat: ${coordenadas.lat}, Lng: ${coordenadas.lng}`);
      }

      const populacao = parseInt(municipio.populacao) || 0;
      
      // Buscar pistas para este município
      const pistasDoMunicipio = pistasPorCodigo.get(municipio.codigo) || [];

      // Log do join entre município e pistas
      if (pistasDoMunicipio.length > 0) {
        console.log(`🔗 [JOIN] Município ${municipio.nome} (${municipio.codigo}) ↔ ${pistasDoMunicipio.length} pista(s) encontrada(s): ${pistasDoMunicipio.map(p => p.codigo_pista).join(', ')}`);
      }
      
      // Usar o campo 'tipo' que já vem dos dados, não baseado em população
      if (municipio.tipo === 'polo') {
        polos.push({
          codigo: municipio.codigo,
          nome: municipio.nome,
          uf: municipio.estado || municipio.uf,
          estado: municipio.estado || municipio.uf,
          coordenadas,
          populacao,
          tipo: 'polo' as const,
          temPistaVoo: pistasDoMunicipio.length > 0,
          aeroporto: pistasDoMunicipio.length > 0,
          tipoTransporteDisponivel: pistasDoMunicipio.length > 0 ? ['aviao', 'helicoptero'] : [],
          periferias: [],
          pistas: pistasDoMunicipio,
          pistaSelecionada: pistasDoMunicipio.find(p =>
            p.latitude_pista !== 0 && p.longitude_pista !== 0 &&
            p.coordenadas.lat !== 0 && p.coordenadas.lng !== 0
          ) || undefined
        });

        // Log quando uma pista é selecionada automaticamente para cálculo
        const pistaSelecionada = polos[polos.length - 1].pistaSelecionada;
        if (pistaSelecionada) {
          console.log(`🎯 [JOIN] Pista selecionada automaticamente para ${municipio.nome}: ${pistaSelecionada.codigo_pista} (${pistaSelecionada.nome_pista})`);
        }
      } else if (municipio.tipo === 'periferia' || municipio.tipo === 'sem_tag') {
        periferias.push({
          codigo: municipio.codigo,
          nome: municipio.nome,
          uf: municipio.estado || municipio.uf,
          estado: municipio.estado || municipio.uf,
          coordenadas,
          populacao,
          tipo: municipio.tipo === 'sem_tag' ? 'sem_tag' : 'periferia',
          poloVinculado: undefined, // Será calculado automaticamente
          pistas: pistasDoMunicipio,
          pistaSelecionada: pistasDoMunicipio.find(p =>
            p.latitude_pista !== 0 && p.longitude_pista !== 0 &&
            p.coordenadas.lat !== 0 && p.coordenadas.lng !== 0
          ) || undefined
        });
      }
    });

    // Calcular estatísticas do join
    const municipiosComPistas = polos.filter(p => p.pistas && p.pistas.length > 0).length +
                               periferias.filter(p => p.pistas && p.pistas.length > 0).length;
    const totalPistasEncontradas = polos.reduce((acc, p) => acc + (p.pistas?.length || 0), 0) +
                                  periferias.reduce((acc, p) => acc + (p.pistas?.length || 0), 0);

    console.log('🔄 [RotasComponent] Municípios processados:', {
      totalMunicipios: municipios.length,
      polosEncontrados: polos.length,
      periferiasEncontradas: periferias.filter(p => p.tipo === 'periferia').length,
      semTagEncontrados: periferias.filter(p => p.tipo === 'sem_tag').length,
      polosComPistas: polos.filter(p => p.pistas && p.pistas.length > 0).length,
      tiposOriginais: municipios.map(m => ({ nome: m.nome, tipo: m.tipo })).slice(0, 5)
    });

    console.log('🔗 [JOIN SUMMARY] Estatísticas do join municípios ↔ pistas_s3_lat_log.json:', {
      municipiosComPistas,
      municipiosSemPistas: municipios.length - municipiosComPistas,
      totalPistasEncontradas,
      taxaSucesso: `${((municipiosComPistas / municipios.length) * 100).toFixed(1)}%`
    });

    return { polosDisponiveis: polos, periferiasDisponiveis: periferias };
  }, [municipios, pistasData]);

  // Estados únicos disponíveis
  const estadosPolos = useMemo(() => {
    const estados = [...new Set(polosDisponiveis.map(polo => polo.estado))].sort();
    return estados;
  }, [polosDisponiveis]);

  const estadosPeriferias = useMemo(() => {
    const estados = [...new Set(periferiasDisponiveis.map(periferia => periferia.estado))].sort();
    return estados;
  }, [periferiasDisponiveis]);

  // Filtrar polos e periferias
  const polosFiltrados = useMemo(() => {
    return polosDisponiveis.filter(polo => {
      const matchNome = polo.nome.toLowerCase().includes(filtroPolos.toLowerCase());
      const matchEstado = estadoSelecionadoPolos === '' || polo.estado === estadoSelecionadoPolos;
      return matchNome && matchEstado;
    });
  }, [polosDisponiveis, filtroPolos, estadoSelecionadoPolos]);

  const periferiasFiltradas = useMemo(() => {
    return periferiasDisponiveis.filter(periferia => {
      const matchNome = periferia.nome.toLowerCase().includes(filtroPeriferias.toLowerCase());
      const matchEstado = estadoSelecionadoPeriferias === '' || periferia.estado === estadoSelecionadoPeriferias;
      return matchNome && matchEstado;
    });
  }, [periferiasDisponiveis, filtroPeriferias, estadoSelecionadoPeriferias]);

  const poloOrigemSelecionado = useMemo(
    () => polosSelecionados.find((polo) => polo.papelNaRota === 'origem') || null,
    [polosSelecionados]
  );

  const poloDestinoSelecionado = useMemo(
    () => polosSelecionados.find((polo) => polo.papelNaRota === 'destino') || null,
    [polosSelecionados]
  );

  const mensagemSelecaoPolos = useMemo(() => {
    if (!poloOrigemSelecionado) {
      return {
        texto: 'Selecione o local de partida',
        className: 'border-blue-200 bg-blue-50 text-blue-800'
      };
    }

    if (!poloDestinoSelecionado) {
      return {
        texto: 'Selecione o local de destino',
        className: 'border-emerald-200 bg-emerald-50 text-emerald-800'
      };
    }

    return null;
  }, [poloOrigemSelecionado, poloDestinoSelecionado]);

  // Notificar mudanças de rota para o mapa
  useEffect(() => {
    if (onRotaChange) {
      onRotaChange(rotaAtual);
    }
  }, [rotaAtual, onRotaChange]);

  // Ir para aba de resultado quando rota for calculada
  useEffect(() => {
    if (rotaAtual && abaSelecionada !== 'resultado') {
      setAbaSelecionada('resultado');
    }
  }, [rotaAtual]);

  const handleCalcularRota = async () => {
    await calcularRota();
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg flex flex-col h-full ${className}`}>
      {/* Header (opcional) */}
      {!hideHeader && (
        <div className="p-4 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-800">Sistema de Rotas</h2>
          <p className="text-sm text-gray-600 mt-1">
            Planeje rotas otimizadas entre municípios polos e periferias
          </p>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setAbaSelecionada('selecao')}
          className={`px-4 py-2 text-sm font-medium ${
            abaSelecionada === 'selecao'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Seleção ({polosSelecionados.length + periferiasSelecionadas.length})
        </button>
        <button
          onClick={() => setAbaSelecionada('configuracao')}
          className={`px-4 py-2 text-sm font-medium ${
            abaSelecionada === 'configuracao'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Parâmetros
        </button>
        <button
          onClick={() => setAbaSelecionada('resultado')}
          className={`px-4 py-2 text-sm font-medium ${
            abaSelecionada === 'resultado'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          } ${!rotaAtual ? 'opacity-50' : ''}`}
          disabled={!rotaAtual}
        >
          Resultado {rotaAtual && '✓'}
        </button>
      </div>

      {/* Content Aqui pode se trocar a altura da parte branca*/}
      <div className="p-4 flex-1 overflow-y-auto">
        {/* Aba de Seleção */}
        {abaSelecionada === 'selecao' && (
          <div className="space-y-6">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-blue-700">Origem</div>
                    <div className="mt-1 text-sm font-medium text-gray-800">
                      {poloOrigemSelecionado ? `${poloOrigemSelecionado.nome} (${poloOrigemSelecionado.uf})` : 'Nenhum polo definido'}
                    </div>
                  </div>
                  {poloOrigemSelecionado && (
                    <button
                      type="button"
                      onClick={() => togglePolo(poloOrigemSelecionado)}
                      className="rounded-md bg-white px-2 py-1 text-xs font-medium text-blue-700 transition-colors hover:bg-blue-100"
                    >
                      Excluir
                    </button>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  {poloOrigemSelecionado
                    ? 'A rota começa por este polo.'
                    : 'Selecione um polo para iniciar a rota.'}
                </div>
              </div>

              <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-emerald-700">Destino</div>
                    <div className="mt-1 text-sm font-medium text-gray-800">
                      {poloDestinoSelecionado ? `${poloDestinoSelecionado.nome} (${poloDestinoSelecionado.uf})` : 'Nenhum polo definido'}
                    </div>
                  </div>
                  {poloDestinoSelecionado && (
                    <button
                      type="button"
                      onClick={() => togglePolo(poloDestinoSelecionado)}
                      className="rounded-md bg-white px-2 py-1 text-xs font-medium text-emerald-700 transition-colors hover:bg-emerald-100"
                    >
                      Excluir
                    </button>
                  )}
                </div>
                <div className="mt-1 text-xs text-gray-600">
                  {poloDestinoSelecionado
                    ? 'A rota termina por este polo.'
                    : 'Selecione um segundo polo para finalizar a rota.'}
                </div>
              </div>
            </div>

            {/* Polos */}
            <div>
              <button
                onClick={() => setSecaoPolosAberta(!secaoPolosAberta)}
                className="w-full flex items-center justify-between text-lg font-semibold text-gray-800 mb-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="inline-flex items-center gap-2 rounded-md px-2 py-1" style={{ backgroundColor: 'oklch(92% 0.004 286.32)' }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5 text-gray-800 lucide lucide-building-2"
                    aria-hidden="true"
                  >
                    <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z" />
                    <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
                    <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
                    <path d="M10 6h4" />
                    <path d="M10 10h4" />
                    <path d="M10 14h4" />
                    <path d="M10 18h4" />
                  </svg>
                  <span>
                    Polos
                  </span>
                </span>
                <svg 
                  className={`w-5 h-5 transition-transform ${secaoPolosAberta ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {secaoPolosAberta && (
                <div>
                  {mensagemSelecaoPolos && (
                    <div className={`mb-3 rounded-lg border px-3 py-2 text-sm font-medium ${mensagemSelecaoPolos.className}`}>
                      {mensagemSelecaoPolos.texto}
                    </div>
                  )}
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <select
                      value={estadoSelecionadoPolos}
                      onChange={(e) => setEstadoSelecionadoPolos(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 bg-white"
                    >
                      <option value="">Todos os estados</option>
                      {estadosPolos.map(estado => (
                        <option key={estado} value={estado}>{estado}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Filtrar por nome..."
                      value={filtroPolos}
                      onChange={(e) => setFiltroPolos(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-800 placeholder-gray-500 bg-white"
                    />
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto bg-gray-50 rounded-lg p-2">
                    {polosFiltrados.length > 0 ? (
                      polosFiltrados.map(polo => {
                        const poloSelecionado = polosSelecionados.find(p => p.codigo === polo.codigo);
                        const estaSelecionado = !!poloSelecionado;
                        const papelNaRota = poloSelecionado?.papelNaRota;
                        
                        return (
                          <div
                            key={polo.codigo}
                            className={`p-3 border rounded-lg transition-colors ${
                              estaSelecionado
                                ? 'border-blue-500 bg-blue-50'
                                : 'border-gray-200 hover:border-gray-300 bg-white'
                            }`}
                          >
                            <div
                              onClick={() => togglePolo(polo)}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center gap-2">
                                <div className="font-medium text-gray-800">{polo.nome}</div>
                                {papelNaRota === 'origem' && (
                                  <span className="inline-flex items-center rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">
                                    Origem
                                  </span>
                                )}
                                {papelNaRota === 'destino' && (
                                  <span className="inline-flex items-center rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                                    Destino
                                  </span>
                                )}
                              </div>
                              <div className="text-sm text-gray-600">
                                {polo.estado}
                                {polo.pistas && polo.pistas.length > 0 && (
                                  <span className="inline-flex items-center">
                                    {' • '}
                                    <svg
                                      xmlns="http://www.w3.org/2000/svg"
                                      width="16"
                                      height="16"
                                      viewBox="0 0 24 24"
                                      fill="none"
                                      stroke="currentColor"
                                      strokeWidth={2}
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      className="inline-block mr-1 text-blue-600 lucide lucide-plane"
                                    >
                                      <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                                    </svg>
                                    {polo.pistas.length} pista{polo.pistas.length > 1 ? 's' : ''}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            {/* Seletor de pistas (só aparece se o polo estiver selecionado) */}
                            {estaSelecionado && poloSelecionado && (
                              <div className="mt-3 flex flex-wrap gap-2">
                                <button
                                  type="button"
                                  onClick={() => definirPapelPolo(polo.codigo, 'origem')}
                                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                    papelNaRota === 'origem'
                                      ? 'bg-blue-600 text-white'
                                      : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
                                  }`}
                                >
                                  Definir como origem
                                </button>
                                <button
                                  type="button"
                                  onClick={() => definirPapelPolo(polo.codigo, 'destino')}
                                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                                    papelNaRota === 'destino'
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                  }`}
                                >
                                  Definir como destino
                                </button>
                              </div>
                            )}

                            {estaSelecionado && polo.pistas && polo.pistas.length > 0 && (
                              <SeletorPistas
                                municipio={polo}
                                pistaSelecionada={poloSelecionado?.pistaSelecionada}
                                label={`Pista de ${papelNaRota === 'destino' ? 'Destino' : 'Origem'}`}
                                onSelecionarPista={(pista) => {
                                  atualizarPoloSelecionado(polo.codigo, { pistaSelecionada: pista });
                                }}
                              />
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-center py-4 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        {polosDisponiveis.length === 0 
                          ? '🏢 Nenhum polo encontrado nos dados'
                          : '🔍 Nenhum polo corresponde ao filtro'
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Periferias */}
            <div>
              <button
                onClick={() => setSecaoPeriferiasAberta(!secaoPeriferiasAberta)}
                className="w-full flex items-center justify-between text-lg font-semibold text-gray-800 mb-3 p-2 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <span className="inline-flex items-center gap-2 rounded-md px-2 py-1" style={{ backgroundColor: 'oklch(92% 0.004 286.32)' }}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="24"
                    height="24"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.25}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="w-5 h-5 text-gray-800 lucide lucide-building"
                    aria-hidden="true"
                  >
                    <path d="M12 10h.01" />
                    <path d="M12 14h.01" />
                    <path d="M12 6h.01" />
                    <path d="M16 10h.01" />
                    <path d="M16 14h.01" />
                    <path d="M16 6h.01" />
                    <path d="M8 10h.01" />
                    <path d="M8 14h.01" />
                    <path d="M8 6h.01" />
                    <path d="M9 22v-3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v3" />
                    <rect x="4" y="2" width="16" height="20" rx="2" />
                  </svg>
                  <span>
                    Periferias
                  </span>
                </span>
                <svg 
                  className={`w-5 h-5 transition-transform ${secaoPeriferiasAberta ? 'rotate-180' : ''}`}
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              {secaoPeriferiasAberta && (
                <div>
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    <select
                      value={estadoSelecionadoPeriferias}
                      onChange={(e) => setEstadoSelecionadoPeriferias(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 bg-white"
                    >
                      <option value="">Todos os estados</option>
                      {estadosPeriferias.map(estado => (
                        <option key={estado} value={estado}>{estado}</option>
                      ))}
                    </select>
                    <input
                      type="text"
                      placeholder="Filtrar por nome..."
                      value={filtroPeriferias}
                      onChange={(e) => setFiltroPeriferias(e.target.value)}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-gray-800 placeholder-gray-500 bg-white"
                    />
                  </div>
                  <div className="space-y-2 max-h-56 overflow-y-auto bg-gray-50 rounded-lg p-2">
                    {periferiasFiltradas.length > 0 ? (
                      periferiasFiltradas.map(periferia => (
                        <div
                          key={periferia.codigo}
                          onClick={() => togglePeriferia(periferia)}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            periferiasSelecionadas.some(p => p.codigo === periferia.codigo)
                              ? 'border-green-500 bg-green-50'
                              : 'border-gray-200 hover:border-gray-300 bg-white'
                          }`}
                        >
                          <div className="font-medium text-gray-800 flex items-center gap-2">
                            {periferia.nome}
                            {periferia.tipo === 'sem_tag' && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-200 text-gray-700">
                                Fora do Polo
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-600">
                            {periferia.estado}
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-4 text-gray-500 bg-white rounded-lg border-2 border-dashed border-gray-300">
                        {periferiasDisponiveis.length === 0 
                          ? '🏘️ Nenhuma periferia encontrada nos dados'
                          : '🔍 Nenhuma periferia corresponde ao filtro'
                        }
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Aba de Configuração */}
        {abaSelecionada === 'configuracao' && (
          <ConfiguracaoRotas
            configuracao={configuracao}
            onConfiguracao={atualizarConfiguracao}
            rota={rotaAtual}
          />
        )}

        {/* Aba de Resultado */}
        {abaSelecionada === 'resultado' && (
          <div>
            {rotaAtual ? (
              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-blue-800 mb-2">{rotaAtual.nome}</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-blue-600">Distância Total:</span>
                      <br />
                      <span className="font-medium text-gray-800">
                        {formatarDistancia(rotaAtual.estatisticas.distanciaTotalKm)}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-600">Tempo Total:</span>
                      <br />
                      <span className="font-medium text-gray-800">
                        {formatarTempo(rotaAtual.estatisticas.tempoTotalMinutos)}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-600">Trechos de Voo:</span>
                      <br />
                      <span className="font-medium text-gray-800">
                        {rotaAtual.estatisticas.quantidadeTrechosVoo}
                      </span>
                    </div>
                    <div>
                      <span className="text-blue-600">Trechos Terrestres:</span>
                      <br />
                      <span className="font-medium text-gray-800">
                        {rotaAtual.estatisticas.quantidadeTrechosTerrestres}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Lista de Trechos */}
                <div>
                  <h4 className="font-medium text-gray-800 mb-2">Roteiro Detalhado:</h4>
                  <div className="space-y-2">
                    {rotaAtual.trechos.map((trecho, index) => (
                      <div
                        key={index}
                        className={`p-3 rounded border-l-4 ${
                          trecho.tipo === 'voo'
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-green-500 bg-green-50'
                        }`}
                      >
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="font-medium text-gray-800">
                              {trecho.origem.nome} → {trecho.destino.nome}
                            </div>
                            <div className="text-sm text-gray-600 flex items-center">
                              {trecho.tipo === 'voo' ? (
                                <>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="inline-block mr-1 text-blue-600 lucide lucide-plane"
                                  >
                                    <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
                                  </svg> 
                                  Voo
                                </>
                              ) : (
                                <>
                                  <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="14"
                                    height="14"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth={2}
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="inline-block mr-1 text-green-600 lucide lucide-car"
                                  >
                                    <path d="M14 16H9m10 0h3v-3.15a1 1 0 0 0-.84-.99L16 11l-2.7-3.6a1 1 0 0 0-.8-.4H5.24a2 2 0 0 0-1.8 1.1l-.8 1.63A6 6 0 0 0 2 12.42V16h2" />
                                    <circle cx="6.5" cy="16.5" r="2.5" />
                                    <circle cx="16.5" cy="16.5" r="2.5" />
                                  </svg>
                                  Terrestre
                                </>
                              )}
                            </div>
                            
                            {/* Indicador de uso de pistas para voos */}
                            {trecho.tipo === 'voo' && trecho.metodoCalculo && (
                              <div className="text-xs mt-1">
                                {trecho.metodoCalculo === 'pista-pista' && (
                                  <span className="text-green-700 font-medium">
                                    ✈️ Pista → Pista (cálculo preciso)
                                  </span>
                                )}
                                {trecho.metodoCalculo === 'pista-municipio' && (
                                  <span className="text-amber-700">
                                    ✈️ Pista → 📍 Centro (cálculo parcial)
                                  </span>
                                )}
                                {trecho.metodoCalculo === 'municipio-pista' && (
                                  <span className="text-amber-700">
                                    📍 Centro → ✈️ Pista (cálculo parcial)
                                  </span>
                                )}
                                {trecho.metodoCalculo === 'municipio-municipio' && (
                                  <span className="text-gray-600">
                                    📍 Centro → Centro (haversine)
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                          <div className="text-right text-sm">
                            <div className="font-medium text-gray-800">
                              {formatarDistancia(trecho.distanciaKm)}
                            </div>
                            <div className="text-gray-600">
                              {formatarTempo(trecho.tempoMinutos)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center text-gray-500 py-8">
                Nenhuma rota calculada ainda.
                <br />
                Selecione municípios e clique em "Calcular Rota".
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer com ações */}
      <div className="p-4 border-t border-gray-200 flex justify-between items-center">
        <div className="text-sm text-gray-500">
          {polosSelecionados.length} polos, {periferiasSelecionadas.length} periferias
        </div>
        
        <div className="space-x-2">
          {temSelecoes && (
            <button
              onClick={limparSelecoes}
              className="px-3 py-2 text-sm text-gray-600 hover:text-gray-800"
            >
              Limpar
            </button>
          )}
          
          <button
            onClick={handleCalcularRota}
            disabled={!podeCalcularRota}
            className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              podeCalcularRota
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
            }`}
          >
            {carregando ? 'Calculando...' : 'Calcular Rota'}
          </button>
        </div>
      </div>

      {/* Erro */}
      {erro && (
        <div className="mx-4 mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
          <div className="text-sm text-red-600">{erro}</div>
        </div>
      )}
    </div>
  );
}
