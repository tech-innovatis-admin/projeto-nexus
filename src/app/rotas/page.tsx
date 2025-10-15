"use client";

import { useState, useEffect, useMemo, useRef } from 'react';
import { useEstrategiaData } from '../../contexts/EstrategiaDataContext';
import { motion, AnimatePresence } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MiniFooter from '@/components/MiniFooter';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import dynamic from 'next/dynamic';
import { RotasComponent, RotaMapVisualization } from '@/components/routing';
import type { RotaCompleta } from '@/types/routing';
import { Route, Map as MapIcon, X, RefreshCw, Settings, AlertTriangle, CheckCircle, Download } from 'lucide-react';
import { generateRoutePDF, downloadPDF } from '@/utils/pdfRotas';

// Evita SSR para o mapa (MapLibre), prevenindo avisos de hidratação
const RotaMapa = dynamic(() => import('@/components/RotaMapa'), { ssr: false });

// Tipagens para as duas bases reais
interface PoloValoresProps {
  codigo_origem: string;
  municipio_origem: string;
  soma_valor_total_destino: number;
  valor_total_origem: number;
  UF_origem?: string;
  UF?: string; // UF normalizada usada no mapa
  geom?: any;
  productValues?: Record<string, number>;
  propriedadesOriginais?: Record<string, any>;
}

interface PeriferiaProps {
  codigo_origem: string;
  municipio_destino: string;
  valor_total_destino: number;
  UF?: string;
  geom?: any;
  productValues?: Record<string, number>;
  codigo_destino?: string;
  propriedadesOriginais?: Record<string, any>;
}

export default function RotasPage() {
  // Contexto de dados
  const { 
    estrategiaData, 
    loading: loadingData, 
    error: errorData 
  } = useEstrategiaData();

  // Estados para o sistema de rotas
  const [rotaAtiva, setRotaAtiva] = useState<RotaCompleta | null>(null);
  const [forceMapUpdate, setForceMapUpdate] = useState(0);
  const [polosValores, setPolosValores] = useState<PoloValoresProps[]>([]);
  const [periferia, setPeriferia] = useState<PeriferiaProps[]>([]);
  const mapRef = useRef<any>(null);

  // Função auxiliar para formatar tempo em horas e minutos
  const formatarTempo = (minutos: number): string => {
    const horas = Math.floor(minutos / 60);
    const minutosRestantes = Math.round(minutos % 60);
    
    if (horas === 0) {
      return `${minutosRestantes} min`;
    } else if (minutosRestantes === 0) {
      return `${horas} hora${horas > 1 ? 's' : ''}`;
    } else {
      return `${horas} hora${horas > 1 ? 's' : ''} e ${minutosRestantes} min`;
    }
  };

  // Função de exportação da rota em PDF
  const exportarRotaPDFHandler = async () => {
    if (!rotaAtiva) return;

    try {
      const pdfData = await generateRoutePDF({
        rota: rotaAtiva,
        dataGeracao: new Date()
      });
      downloadPDF(pdfData);
    } catch (error) {
      console.error('Erro ao gerar PDF da rota:', error);
    }
  };

  // Processar dados do contexto
  useEffect(() => {
    if (!estrategiaData || loadingData) return;

    console.log('🛣️ [RotasPage] Processando dados do contexto...');

    try {
      const valoresJson = estrategiaData.poloValores;
      const periferiaJson = estrategiaData.poloPeriferia;

      // Processar polos - lógica simplificada para a página de rotas
      if (Array.isArray(valoresJson?.features)) {
        const polosProcessados = valoresJson.features.map((feature: any) => ({
          codigo_origem: feature.properties?.codigo_origem || '',
          municipio_origem: feature.properties?.municipio_origem || '',
          soma_valor_total_destino: Number(feature.properties?.soma_valor_total_destino) || 0,
          valor_total_origem: Number(feature.properties?.valor_total_origem) || 0,
          UF_origem: feature.properties?.UF_origem || '',
          UF: feature.properties?.UF_origem || '',
          geom: feature.geometry,
          propriedadesOriginais: feature.properties
        }));
        setPolosValores(polosProcessados);
      }

      // Processar periferias
      if (Array.isArray(periferiaJson?.features)) {
        const periferiasProcessadas = periferiaJson.features.map((feature: any) => ({
          codigo_origem: feature.properties?.codigo_origem || '',
          municipio_destino: feature.properties?.municipio_destino || '',
          valor_total_destino: Number(feature.properties?.valor_total_destino) || 0,
          UF: feature.properties?.UF_destino || feature.properties?.UF_origem || feature.properties?.UF || feature.properties?.uf || '',
          geom: feature.geometry,
          codigo_destino: feature.properties?.codigo_destino || '',
          propriedadesOriginais: feature.properties
        }));
        setPeriferia(periferiasProcessadas);
        
        // Log para diagnóstico
        console.log('🛣️ [RotasPage] Sample de periferias processadas:', 
          periferiasProcessadas.slice(0, 3).map((p: any) => ({ 
            nome: p.municipio_destino, 
            UF: p.UF
          }))
        );
      }

      console.log('🛣️ [RotasPage] Dados processados com sucesso');
    } catch (error) {
      console.error('🛣️ [RotasPage] Erro ao processar dados:', error);
    }
  }, [estrategiaData, loadingData]);

  // Função para transformar dados para o sistema de rotas
  const municipiosParaRotas = useMemo(() => {
    const municipios: any[] = [];
    const codigosUsados = new Set<string>();
    
    // Adicionar polos
    polosValores.forEach((polo, index) => {
      // Tentar extrair coordenadas da geometria
      let latitude = 0, longitude = 0;
      
      if (polo.geom?.coordinates) {
        // Se for Point
        if (polo.geom.type === 'Point') {
          longitude = polo.geom.coordinates[0];
          latitude = polo.geom.coordinates[1];
        }
        // Se for Polygon, pegar o centróide aproximado
        else if (polo.geom.type === 'Polygon' && polo.geom.coordinates[0]) {
          const coords = polo.geom.coordinates[0];
          longitude = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
          latitude = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
        }
        // Se for MultiPolygon, pegar o primeiro polígono
        else if (polo.geom.type === 'MultiPolygon' && polo.geom.coordinates[0]?.[0]) {
          const coords = polo.geom.coordinates[0][0];
          longitude = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
          latitude = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
        }
      }
      
      // Fallback 1: usar propriedades originais se disponível
      if ((!latitude || !longitude) && polo.propriedadesOriginais) {
        latitude = polo.propriedadesOriginais.latitude || polo.propriedadesOriginais.lat || 0;
        longitude = polo.propriedadesOriginais.longitude || polo.propriedadesOriginais.lng || 0;
      }
      
      // Fallback 2: coordenadas padrão do Brasil (centro aproximado)
      if (!latitude || !longitude || latitude === 0 || longitude === 0) {
        console.warn(`🛣️ [RotasPage] Coordenadas inválidas para polo ${polo.municipio_origem}, usando coordenadas padrão`);
        latitude = -14.235; // Centro do Brasil
        longitude = -51.925;
      }
      
      // Usar código IBGE real para permitir join com pistas
      const codigoPolo = String(polo.codigo_origem || '').trim();

      if (codigoPolo && !codigosUsados.has(codigoPolo)) {
        codigosUsados.add(codigoPolo);
        municipios.push({
          codigo: codigoPolo,
          nome: polo.municipio_origem,
          estado: polo.UF_origem || polo.UF || 'BR',
          uf: polo.UF_origem || polo.UF || 'BR',
          latitude: latitude,
          longitude: longitude,
          populacao: polo.valor_total_origem || 100000, // Usar valor como proxy de população
          tipo: 'polo' as const
        });
      }
    });
    
    // Adicionar periferias (deduplicas por nome do município)
    const periferiasUnicas: Map<string, any> = new Map();
    
    // Primeiro passo: coletar periferias únicas baseadas no municipio_destino
    periferia.forEach((periferiaItem) => {
      const chaveMunicipio = periferiaItem.municipio_destino;
      
      if (!periferiasUnicas.has(chaveMunicipio)) {
        periferiasUnicas.set(chaveMunicipio, periferiaItem);
      } else {
        // Se já existe, manter o que tem maior valor total ou mais dados completos
        const existente = periferiasUnicas.get(chaveMunicipio);
        const valorExistente = Number(existente.valor_total_destino) || 0;
        const valorAtual = Number(periferiaItem.valor_total_destino) || 0;
        
        if (valorAtual > valorExistente || (periferiaItem.geom && !existente.geom)) {
          periferiasUnicas.set(chaveMunicipio, periferiaItem);
        }
      }
    });
    
    // Segundo passo: processar periferias únicas
    periferiasUnicas.forEach((periferiaItem, nomeMunicipio) => {
      // Tentar extrair coordenadas da geometria
      let latitude = 0, longitude = 0;
      
      if (periferiaItem.geom?.coordinates) {
        // Se for Point
        if (periferiaItem.geom.type === 'Point') {
          longitude = periferiaItem.geom.coordinates[0];
          latitude = periferiaItem.geom.coordinates[1];
        }
        // Se for Polygon, pegar o centróide aproximado
        else if (periferiaItem.geom.type === 'Polygon' && periferiaItem.geom.coordinates[0]) {
          const coords = periferiaItem.geom.coordinates[0];
          longitude = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
          latitude = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
        }
        // Se for MultiPolygon, pegar o primeiro polígono
        else if (periferiaItem.geom.type === 'MultiPolygon' && periferiaItem.geom.coordinates[0]?.[0]) {
          const coords = periferiaItem.geom.coordinates[0][0];
          longitude = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
          latitude = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
        }
      }
      
      // Fallback 1: usar propriedades originais se disponível
      if ((!latitude || !longitude) && periferiaItem.propriedadesOriginais) {
        latitude = periferiaItem.propriedadesOriginais.latitude || periferiaItem.propriedadesOriginais.lat || 0;
        longitude = periferiaItem.propriedadesOriginais.longitude || periferiaItem.propriedadesOriginais.lng || 0;
      }
      
      // Fallback 2: coordenadas padrão do Brasil (centro aproximado)
      if (!latitude || !longitude || latitude === 0 || longitude === 0) {
        console.warn(`🛣️ [RotasPage] Coordenadas inválidas para periferia ${periferiaItem.municipio_destino}, usando coordenadas padrão`);
        latitude = -14.235; // Centro do Brasil
        longitude = -51.925;
      }
      
      // Usar código IBGE real para permitir join com pistas
      const codigoPeriferia = String(periferiaItem.codigo_destino || '').trim();

      if (codigoPeriferia && !codigosUsados.has(codigoPeriferia)) {
        codigosUsados.add(codigoPeriferia);
        municipios.push({
          codigo: codigoPeriferia,
          nome: periferiaItem.municipio_destino,
          estado: periferiaItem.UF || 'BR',
          uf: periferiaItem.UF || 'BR',
          latitude: latitude,
          longitude: longitude,
          populacao: periferiaItem.valor_total_destino || 30000, // Usar valor como proxy de população
          tipo: 'periferia' as const
        });
      }
    });
    
    console.log('🛣️ [RotasPage] Municípios transformados para rotas:', {
      total: municipios.length,
      polos: municipios.filter(m => m.tipo === 'polo').length,
      periferias: municipios.filter(m => m.tipo === 'periferia').length,
      periferiasBrutasOriginais: periferia.length,
      periferiasUnicasProcessadas: periferiasUnicas.size,
      codigosUnicos: codigosUsados.size
    });

    // Ordenar municípios em ordem alfabética pelo nome
    return municipios.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [polosValores, periferia]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white">
      {/* Navbar */}
      <Navbar />
      
      {/* Layout principal com Sidebar */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Conteúdo principal */}
        <main className="flex-1 flex flex-col overflow-hidden max-h-screen">
          {/* Header da página */}
          <div className="p-4 border-b border-slate-700/50">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col gap-2"
              >
                <div className="flex items-center gap-3">
                  <Route className="w-8 h-8 text-blue-400" />
                  <h1 className="text-3xl font-bold text-white">
                    Otimização de <span className="text-blue-400">Rotas</span>
                  </h1>
                </div>
                <p className="text-slate-300 text-sm">
                  Selecione, planeje e otimize rotas entre os municípios
                </p>
              </motion.div>
            </div>
          </div>

          {/* Conteúdo scrollável */}
          <div className="flex-1 overflow-hidden">
            <div className="h-full flex">
              {/* Painel de controle - lado esquerdo */}
              <div className="w-[430px] xl:w-[460px] bg-slate-800/50 border-r border-slate-700/50 flex flex-col">
                <div className="p-4 border-b border-slate-700/50">
                  <div className="flex items-center gap-2 mb-1">
                    <Settings className="w-5 h-5 text-blue-400" />
                    <h2 className="text-lg font-semibold text-white">Configuração de Rotas</h2>
                  </div>
                </div>
                
                <div className="flex-1 overflow-hidden">
                  {/* Loading/Error states */}
                  {loadingData && (
                    <div className="p-4">
                      <div className="bg-slate-700 border border-slate-600 rounded-lg p-3 text-slate-300 text-sm flex items-center gap-2">
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Carregando dados dos municípios...
                      </div>
                    </div>
                  )}
                  {errorData && (
                    <div className="p-4">
                      <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-200 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        {errorData}
                      </div>
                    </div>
                  )}
                  
                  {/* Componente de rotas - Removidos título e subtítulo */}
                  {!loadingData && !errorData && municipiosParaRotas.length > 0 && (
                    <RotasComponent
                      municipios={municipiosParaRotas}
                      onRotaChange={setRotaAtiva}
                      hideHeader={true}
                    />
                  )}
                  
                  {!loadingData && !errorData && municipiosParaRotas.length === 0 && (
                    <div className="p-4">
                      <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 text-yellow-200 text-sm flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4" />
                        Nenhum município disponível para rotas. Verifique se há dados carregados na análise estratégica.
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Área do mapa - lado direito */}
              <div className="flex-1 relative">
                <div className="absolute inset-0">
                  {!loadingData && estrategiaData ? (
                    <>
                      <RotaMapa
                        polos={estrategiaData.poloValores || { type: 'FeatureCollection', features: [] }}
                        periferias={estrategiaData.poloPeriferia || { type: 'FeatureCollection', features: [] }}
                        appliedUF=""
                        appliedPolo=""
                        appliedUFs={[]}
                        appliedMinValor={0}
                        appliedMaxValor={0}
                        appliedProducts={[]}
                        onRadiusResult={() => {}}
                        onExportXLSX={() => {}}
                        onMunicipioPerifericoClick={() => {}}
                        municipioPerifericoSelecionado=""
                      />
                      
                      {/* Componente invisível que adiciona as rotas ao mapa */}
                      {rotaAtiva && (
                        <RotaMapVisualization
                          rota={rotaAtiva}
                          showLabels={true}
                          showDirections={false}
                          key={`rota-viz-${forceMapUpdate}`}
                        />
                      )}
                    </>
                  ) : (
                    <div className="flex items-center justify-center h-full bg-slate-900/50">
                      <div className="text-center text-slate-400">
                        <div className="flex justify-center mb-4">
                          <MapIcon className="w-24 h-24 text-blue-400" />
                        </div>
                        <p className="text-lg font-medium mb-2">Carregando Mapa</p>
                        <p className="text-sm">Aguarde enquanto os dados são processados...</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Informações da rota ativa - overlay */}
                <AnimatePresence>
                  {rotaAtiva && (
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 20 }}
                      transition={{ duration: 0.3 }}
                      className="absolute top-4 right-4 bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-lg p-4 max-w-sm shadow-xl"
                    >
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <h3 className="font-semibold text-white mb-1 flex items-center gap-2">
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            {rotaAtiva.nome}
                          </h3>
                          <p className="text-xs text-slate-400">Rota calculada</p>
                        </div>
                        <button
                          onClick={() => {
                            setRotaAtiva(null);
                            setForceMapUpdate(prev => prev + 1);
                          }}
                          className="text-slate-400 hover:text-white p-1 rounded"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-slate-300">Distância Total:</span>
                          <span className="text-blue-300 font-medium">
                            {rotaAtiva.estatisticas.distanciaTotalKm.toFixed(1)} km
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Tempo Total:</span>
                          <span className="text-green-300 font-medium">
                            {formatarTempo(rotaAtiva.estatisticas.tempoTotalMinutos)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Trechos Aéreos:</span>
                          <span className="text-sky-300 font-medium">
                            {rotaAtiva.estatisticas.quantidadeTrechosVoo}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-300">Trechos Terrestres:</span>
                          <span className="text-emerald-300 font-medium">
                            {rotaAtiva.estatisticas.quantidadeTrechosTerrestres}
                          </span>
                        </div>
                      </div>
                      
                      <div className="mt-3 pt-3 border-t border-slate-600/50 space-y-2">
                        <button
                          onClick={() => {
                            setForceMapUpdate(prev => prev + 1);
                          }}
                          className="w-full px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
                        >
                          <RefreshCw className="w-4 h-4" />
                          Recentralizar no Mapa
                        </button>

                        <button
                          onClick={exportarRotaPDFHandler}
                          className="w-full px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
                        >
                          <Download className="w-4 h-4" />
                          Exportar Relatório PDF
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <MiniFooter />
      
      {/* Scroll to top button */}
      <ScrollToTopButton />
    </div>
  );
}
