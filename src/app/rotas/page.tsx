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

// Mapeamento de UF para nome completo dos estados
const ufParaNomeCompleto: Record<string, string> = {
  'AC': 'Acre',
  'AL': 'Alagoas',
  'AM': 'Amazonas',
  'AP': 'Amapá',
  'BA': 'Bahia',
  'CE': 'Ceará',
  'DF': 'Distrito Federal',
  'ES': 'Espírito Santo',
  'GO': 'Goiás',
  'MA': 'Maranhão',
  'MG': 'Minas Gerais',
  'MS': 'Mato Grosso do Sul',
  'MT': 'Mato Grosso',
  'PA': 'Pará',
  'PB': 'Paraíba',
  'PE': 'Pernambuco',
  'PI': 'Piauí',
  'PR': 'Paraná',
  'RJ': 'Rio de Janeiro',
  'RN': 'Rio Grande do Norte',
  'RO': 'Rondônia',
  'RR': 'Roraima',
  'RS': 'Rio Grande do Sul',
  'SC': 'Santa Catarina',
  'SE': 'Sergipe',
  'SP': 'São Paulo',
  'TO': 'Tocantins'
};

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
  const [municipiosSemTag, setMunicipiosSemTag] = useState<any[]>([]);
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

  // Carregar municípios sem tag
  useEffect(() => {
    let cancelled = false;
    const loadMunicipiosSemTag = async () => {
      try {
        console.log('🏷️ [RotasPage] Carregando municípios sem tag...');
        const resp = await fetch('/api/proxy-geojson/municipios_sem_tag.json', { cache: 'force-cache' });
        if (!resp.ok) {
          console.warn('⚠️ [RotasPage] Falha ao carregar municípios sem tag:', resp.status);
          return;
        }
        const json = await resp.json();
        if (cancelled) return;

        // Processar dados - pode vir como FeatureCollection ou Array
        let items: any[] = [];
        if (json.type === 'FeatureCollection' && Array.isArray(json.features)) {
          items = json.features.map((feature: any) => ({
            UF: feature.properties?.UF || '',
            codigo: String(feature.properties?.codigo || feature.properties?.codigo_ibge || '').trim(),
            municipio: feature.properties?.municipio || '',
            latitude_sem_tag: parseFloat(feature.properties?.latitude_sem_tag || '0'),
            longitude_sem_tag: parseFloat(feature.properties?.longitude_sem_tag || '0'),
            geom_sem_tag: feature.geometry || feature.properties?.geom_sem_tag,
            propriedadesOriginais: feature.properties
          }));
        } else if (Array.isArray(json)) {
          items = json.map((item: any) => ({
            UF: item.UF || '',
            codigo: String(item.codigo || item.codigo_ibge || '').trim(),
            municipio: item.municipio || '',
            latitude_sem_tag: parseFloat(String(item.latitude_sem_tag || '0')),
            longitude_sem_tag: parseFloat(String(item.longitude_sem_tag || '0')),
            geom_sem_tag: item.geom_sem_tag || item.geometry,
            propriedadesOriginais: item
          }));
        }

        // Filtrar apenas itens válidos
        const itemsValidos = items.filter(item => 
          item.codigo && item.codigo !== '0' && item.municipio && item.UF
        );

        if (!cancelled) {
          setMunicipiosSemTag(itemsValidos);
          console.log(`✅ [RotasPage] Municípios sem tag carregados: ${itemsValidos.length}`);
        }
      } catch (error) {
        console.error('❌ [RotasPage] Erro ao carregar municípios sem tag:', error);
      }
    };

    loadMunicipiosSemTag();
    return () => { cancelled = true; };
  }, []);

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
        const periferiasProcessadas = periferiaJson.features.map((feature: any) => {
          const props = feature.properties || {};
          // Normaliza UF lendo múltiplas variantes e aplicando trim/uppercase
          const rawUF =
            props.UF_destino ?? props.uf_destino ?? props.UF_origem ?? props.uf_origem ?? props.UF ?? props.uf ?? '';
          const UF = String(rawUF).trim().toUpperCase();

          // Fallbacks para código IBGE do destino
          const codigo_destino = String(
            props.codigo_destino ?? props.codigo_ibge ?? props.cod_municipio ?? props.cod_ibge ?? ''
          ).trim();

          return {
            codigo_origem: props.codigo_origem || '',
            municipio_destino: props.municipio_destino || '',
            valor_total_destino: Number(props.valor_total_destino) || 0,
            UF,
            geom: feature.geometry,
            codigo_destino,
            propriedadesOriginais: props
          } as PeriferiaProps;
        });
        setPeriferia(periferiasProcessadas);

        // Log para diagnóstico
        console.log('🛣️ [RotasPage] Sample de periferias processadas:',
          periferiasProcessadas.slice(0, 5).map((p: any) => ({
            nome: p.municipio_destino,
            UF: p.UF,
            codigo: p.codigo_destino
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
        const ufPolo = polo.UF_origem || polo.UF || 'BR';
        const nomeEstadoCompleto = ufParaNomeCompleto[ufPolo] || ufPolo;

        codigosUsados.add(codigoPolo);
        municipios.push({
          codigo: codigoPolo,
          nome: polo.municipio_origem,
          estado: nomeEstadoCompleto,
          uf: ufPolo,
          latitude: latitude,
          longitude: longitude,
          populacao: polo.valor_total_origem || 100000, // Usar valor como proxy de população
          tipo: 'polo' as const
        });
      }
    });
    
    // Adicionar periferias (deduplicação por código IBGE do destino; fallback: nome+UF)
    const periferiasUnicas: Map<string, any> = new Map();

    periferia.forEach((periferiaItem) => {
      const ufNorm = String(periferiaItem.UF || '').trim().toUpperCase();
      const nomeNorm = String(periferiaItem.municipio_destino || '').trim();
      const codigoNorm = String(periferiaItem.codigo_destino || '').trim();

      // Preferir chave por código IBGE; se ausente, usar nome+UF
      const chave = codigoNorm || `${nomeNorm}__${ufNorm}`;

      if (!periferiasUnicas.has(chave)) {
        periferiasUnicas.set(chave, periferiaItem);
      } else {
        // Se já existe, manter o que tem maior valor total ou mais dados completos
        const existente = periferiasUnicas.get(chave);
        const valorExistente = Number(existente.valor_total_destino) || 0;
        const valorAtual = Number(periferiaItem.valor_total_destino) || 0;

        if (valorAtual > valorExistente || (periferiaItem.geom && !existente.geom)) {
          periferiasUnicas.set(chave, periferiaItem);
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
      const codigoPeriferia = String(
        periferiaItem.codigo_destino ||
        periferiaItem.propriedadesOriginais?.codigo_ibge ||
        periferiaItem.propriedadesOriginais?.cod_municipio ||
        ''
      ).trim();

      if (codigoPeriferia && !codigosUsados.has(codigoPeriferia)) {
        const ufPeriferia = String(periferiaItem.UF || 'BR').trim().toUpperCase();
        const nomeEstadoCompleto = ufParaNomeCompleto[ufPeriferia] || ufPeriferia;

        codigosUsados.add(codigoPeriferia);
        municipios.push({
          codigo: codigoPeriferia,
          nome: String(periferiaItem.municipio_destino || '').trim(),
          estado: nomeEstadoCompleto,
          uf: ufPeriferia,
          latitude: latitude,
          longitude: longitude,
          populacao: periferiaItem.valor_total_destino || 30000, // Usar valor como proxy de população
          tipo: 'periferia' as const
        });
      }
    });

    // Adicionar municípios sem tag (processar após periferias para evitar duplicatas)
    municipiosSemTag.forEach((semTagItem) => {
      const codigoSemTag = String(semTagItem.codigo || '').trim();
      
      // Verificar se já não foi adicionado como polo ou periferia
      if (!codigoSemTag || codigoSemTag === '0' || codigosUsados.has(codigoSemTag)) {
        return; // Pular se já existe ou código inválido
      }

      // Extrair coordenadas - prioridade: latitude_sem_tag/longitude_sem_tag > geom_sem_tag > fallback
      let latitude = 0, longitude = 0;
      
      // Prioridade 1: coordenadas diretas
      if (semTagItem.latitude_sem_tag && semTagItem.longitude_sem_tag) {
        latitude = parseFloat(String(semTagItem.latitude_sem_tag));
        longitude = parseFloat(String(semTagItem.longitude_sem_tag));
      }
      
      // Prioridade 2: extrair da geometria
      if ((!latitude || !longitude) && semTagItem.geom_sem_tag?.coordinates) {
        const geom = semTagItem.geom_sem_tag;
        if (geom.type === 'Point') {
          longitude = geom.coordinates[0];
          latitude = geom.coordinates[1];
        } else if (geom.type === 'Polygon' && geom.coordinates[0]) {
          const coords = geom.coordinates[0];
          longitude = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
          latitude = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
        } else if (geom.type === 'MultiPolygon' && geom.coordinates[0]?.[0]) {
          const coords = geom.coordinates[0][0];
          longitude = coords.reduce((sum: number, coord: number[]) => sum + coord[0], 0) / coords.length;
          latitude = coords.reduce((sum: number, coord: number[]) => sum + coord[1], 0) / coords.length;
        }
      }
      
      // Fallback: coordenadas padrão
      if (!latitude || !longitude || latitude === 0 || longitude === 0) {
        console.warn(`🛣️ [RotasPage] Coordenadas inválidas para município sem tag ${semTagItem.municipio}, usando coordenadas padrão`);
        latitude = -14.235;
        longitude = -51.925;
      }

      const ufSemTag = String(semTagItem.UF || '').trim().toUpperCase();
      const nomeEstadoCompleto = ufParaNomeCompleto[ufSemTag] || ufSemTag;

      codigosUsados.add(codigoSemTag);
      municipios.push({
        codigo: codigoSemTag,
        nome: String(semTagItem.municipio || '').trim(),
        estado: nomeEstadoCompleto,
        uf: ufSemTag,
        latitude: latitude,
        longitude: longitude,
        tipo: 'sem_tag' as const
      });
    });

    // Log específico para conferir "Bom Jesus" PB
    const bomJesusPB = municipios.find(
      (m) => m.tipo === 'periferia' && m.nome.toUpperCase() === 'BOM JESUS' && m.uf === 'PB'
    );
    if (!bomJesusPB) {
      console.warn('🛣️ [RotasPage] Bom Jesus (PB) não encontrado após processamento.');
    } else {
      console.log('🛣️ [RotasPage] Bom Jesus (PB) presente:', bomJesusPB);
    }
    
    console.log('🛣️ [RotasPage] Municípios transformados para rotas:', {
      total: municipios.length,
      polos: municipios.filter(m => m.tipo === 'polo').length,
      periferias: municipios.filter(m => m.tipo === 'periferia').length,
      semTag: municipios.filter(m => m.tipo === 'sem_tag').length,
      periferiasBrutasOriginais: periferia.length,
      periferiasUnicasProcessadas: periferiasUnicas.size,
      codigosUnicos: codigosUsados.size
    });

    // Ordenar municípios em ordem alfabética pelo nome
    return municipios.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [polosValores, periferia, municipiosSemTag]);

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white">
      {/* Navbar */}
      <Navbar />
      
      {/* Layout principal com Sidebar */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar />
        
  {/* Conteúdo principal */}
  <main className="flex-1 flex flex-col overflow-hidden min-h-0">
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
                  <Route className="w-6 h-6 sm:w-8 sm:h-8 text-blue-400" />
                  <h1 className="text-2xl sm:text-3xl font-bold text-white">
                    Otimização de <span className="text-blue-400">Rotas</span>
                  </h1>
                </div>
                <p className="text-slate-300 text-sm">
                  Selecione, planeje e otimize rotas entre os municípios
                </p>
              </motion.div>
            </div>
          </div>

          {/* Conteúdo scrollável com cartões e separação visual (similar à tela /mapa) */}
          <div className="flex-1 overflow-hidden min-h-0">
            <div className="w-full max-w-[1400px] mx-auto p-2 sm:p-3 lg:p-4 h-full">
              <div className="grid grid-cols-1 lg:grid-cols-[350px_minmax(0,1fr)] xl:grid-cols-[400px_minmax(0,1fr)] gap-2 sm:gap-3 lg:gap-4 h-full min-h-0">
                {/* Painel de controle (card) */}
                <div className="bg-[#1e293b] rounded-lg shadow-lg p-0.5 border border-slate-600 h-full">
                  <div className="bg-[#0f172a] rounded-lg border border-slate-700 h-full flex flex-col">
                    <div className="p-3 sm:p-4 border-b border-slate-700/50">
                      <div className="flex items-center gap-2 mb-1">
                        <Settings className="w-5 h-5 text-blue-400" />
                        <h2 className="text-base sm:text-lg font-semibold text-white">Planejamento de Rotas</h2>
                      </div>
                      <p className="text-slate-400 text-xs">Selecione polos e periferias, ajuste opções e gere a rota.</p>
                    </div>

                    <div className="flex-1 overflow-auto p-2 sm:p-3">
                      {/* Loading/Error states */}
                      {loadingData && (
                        <div className="">
                          <div className="bg-slate-800/60 border border-slate-600 rounded-lg p-3 text-slate-300 text-sm flex items-center gap-2">
                            <RefreshCw className="w-4 h-4 animate-spin" />
                            Carregando dados dos municípios...
                          </div>
                        </div>
                      )}
                      {errorData && (
                        <div className="">
                          <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-200 text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            {errorData}
                          </div>
                        </div>
                      )}

                      {/* Componente de rotas - título interno oculto */}
                      {!loadingData && !errorData && municipiosParaRotas.length > 0 && (
                        <RotasComponent
                          municipios={municipiosParaRotas}
                          onRotaChange={setRotaAtiva}
                          hideHeader={true}
                        />
                      )}

                      {!loadingData && !errorData && municipiosParaRotas.length === 0 && (
                        <div className="">
                          <div className="bg-yellow-900/30 border border-yellow-700/50 rounded-lg p-3 text-yellow-200 text-sm flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
                            Nenhum município disponível para rotas. Verifique se há dados carregados na análise estratégica.
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Mapa (card) */}
                <div className="rounded-lg overflow-hidden shadow-lg bg-[#0f172a] border border-slate-600 relative min-h-[350px] sm:min-h-[400px] lg:min-h-[500px] xl:min-h-[600px]">
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

                        {/* Camada de rotas sobre o mapa */}
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
                      <div className="flex items-center justify-center h-full bg-slate-900/30">
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
                        className="absolute top-2 right-2 sm:top-4 sm:right-4 bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-lg p-2 sm:p-4 max-w-[280px] sm:max-w-sm shadow-xl"
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

                        <div className="space-y-1 sm:space-y-2 text-xs sm:text-sm">
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

                        <div className="flex flex-col gap-1 mt-2 sm:mt-3 pt-2 sm:pt-3 border-t border-slate-600/50 space-y-1.5 sm:space-y-2">
                          <button
                            onClick={() => {
                              setForceMapUpdate(prev => prev + 1);
                            }}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
                          >
                            <RefreshCw className="w-3 h-3 sm:w-4 sm:h-4" />
                            Recentralizar no Mapa
                          </button>

                          <button
                            onClick={exportarRotaPDFHandler}
                            className="w-full px-2 sm:px-3 py-1.5 sm:py-2 bg-purple-600 hover:bg-purple-700 text-white text-xs sm:text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-1.5 sm:gap-2"
                          >
                            <Download className="w-3 h-3 sm:w-4 sm:h-4" />
                            Exportar Relatório PDF
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
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
