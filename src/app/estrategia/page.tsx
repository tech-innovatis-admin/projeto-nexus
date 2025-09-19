"use client";

import { useState, useEffect, useMemo, KeyboardEvent, Fragment } from 'react';
import { useEstrategiaData } from '../../contexts/EstrategiaDataContext';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MiniFooter from '@/components/MiniFooter';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
// Removido: import { fetchGeoJSONWithCache } from '@/utils/cacheGeojson';
import styles from './page.module.css';
// Evita SSR para o mapa (MapLibre), prevenindo avisos de hidratação
const MapLibrePolygons = dynamic(() => import('@/components/MapLibrePolygons'), { ssr: false });

// Tipagens para as duas bases reais
interface PoloValoresProps {
  codigo_origem: string;
  municipio_origem: string;
  soma_valor_total_destino: number;
  valor_total_origem: number;
  UF_origem?: string;
  UF?: string; // UF normalizada usada no mapa
  // Geometria do município polo (Polygon/MultiPolygon) vinda do GeoJSON (feature.geometry ou properties.geom)
  geom?: any;
}

interface PeriferiaProps {
  codigo_origem: string;
  municipio_destino: string;
  valor_total_destino: number;
  UF?: string; // UF herdada do polo de origem (para colorização)
  // Geometria do município periférico (Polygon/MultiPolygon) vinda do GeoJSON (feature.geometry ou properties.geom)
  geom?: any;
}

interface MunicipioRanking {
  nome: string;
  valor: number;
}

// MapLibre não funciona no SSR; o componente MapLibrePolygons é client-only (este arquivo já é "use client")

// Componente para contagem animada de valores
function AnimatedCurrency({ targetValue, selectedPolo }: { targetValue: number; selectedPolo: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const displayValue = useTransform(rounded, (latest) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(latest);
  });

  useEffect(() => {
    const controls = animate(count, targetValue, {
      duration: 1.0, // 1.0 segundos para a animação
      ease: "easeOut"
    });
    return controls.stop;
  }, [count, targetValue, selectedPolo]); // Reexecuta quando o polo muda

  return <motion.span>{displayValue}</motion.span>;
}

// Componente para contagem animada de números inteiros
function AnimatedNumber({ targetValue, selectedPolo }: { targetValue: number; selectedPolo: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, targetValue, {
      duration: 1.0, // 1.0 segundos para a animação
      ease: "easeOut"
    });
    return controls.stop;
  }, [count, targetValue, selectedPolo]); // Reexecuta quando o polo muda

  return <motion.span>{rounded}</motion.span>;
}

// Componente para contagem animada de valores monetários
function AnimatedMonetaryValue({ targetValue, selectedPolo }: { targetValue: number; selectedPolo: string }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));
  const formattedValue = useTransform(rounded, (latest) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(latest);
  });

  useEffect(() => {
    const controls = animate(count, targetValue, {
      duration: 1.0, // 1.0 segundos para a animação
      ease: "easeOut"
    });
    return controls.stop;
  }, [count, targetValue, selectedPolo]); // Reexecuta quando o polo muda

  return <motion.span>{formattedValue}</motion.span>;
}

export default function EstrategiaPage() {
  console.log('📊 [EstrategiaPage] Componente montado');

  // 🔥 USANDO O NOVO CONTEXTO - Resolve problema de remount-triggered fetching
  const { estrategiaData, loading: loadingData, error: errorData } = useEstrategiaData();

  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [showMunicipiosList, setShowMunicipiosList] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Filtros selecionados (não aplicados ainda)
  const [selectedUF, setSelectedUF] = useState<string>('ALL');
  const [selectedPolo, setSelectedPolo] = useState<string>('ALL');
  const [minValor, setMinValor] = useState<number | ''>('');
  const [maxValor, setMaxValor] = useState<number | ''>('');

  // Filtros aplicados (após clicar em buscar)
  const [appliedUF, setAppliedUF] = useState<string>('ALL');
  const [appliedPolo, setAppliedPolo] = useState<string>('ALL');
  const [appliedMinValor, setAppliedMinValor] = useState<number | ''>('');
  const [appliedMaxValor, setAppliedMaxValor] = useState<number | ''>('');

  // Estado dos dados processados do contexto
  const [polosValores, setPolosValores] = useState<PoloValoresProps[]>([]);
  const [periferia, setPeriferia] = useState<PeriferiaProps[]>([]);

  // Normalizador de números pt-BR (aceita number ou string "1.234,56")
  const parsePtBrNumber = (v: unknown): number => {
    if (typeof v === 'number') return v;
    if (typeof v !== 'string') return 0;
    const clean = v
      .replace(/\s+/g, '')
      .replace(/^R\$\s?/, '')
      .replace(/\./g, '')
      .replace(/,/g, '.');
    const n = Number(clean);
    return Number.isFinite(n) ? n : 0;
  };

  // 🔥 NOVO: Processar dados do contexto (resolve remount-triggered fetching)
  useEffect(() => {
    if (!estrategiaData || loadingData) return;

    console.log('📊 [EstrategiaPage] Processando dados do contexto...');

    try {
      const valoresJson = estrategiaData.poloValores;
      const periferiaJson = estrategiaData.poloPeriferia;

      const valores: PoloValoresProps[] = Array.isArray(valoresJson?.features)
        ? valoresJson.features.map((f: any) => ({
            codigo_origem: String(f?.properties?.codigo_origem ?? ''),
            municipio_origem: String(f?.properties?.municipio_origem ?? ''),
            soma_valor_total_destino: parsePtBrNumber(f?.properties?.soma_valor_total_destino),
            valor_total_origem: parsePtBrNumber(f?.properties?.valor_total_origem),
            UF_origem: String(f?.properties?.UF_origem ?? ''),
            UF: String(f?.properties?.UF_origem ?? ''), // normaliza para UF
            // Preserve a geometria (prioriza feature.geometry; fallback para properties.geom)
            geom: f?.geometry ?? f?.properties?.geom ?? null,
          }))
        : [];

      const peri: PeriferiaProps[] = Array.isArray(periferiaJson?.features)
        ? periferiaJson.features.map((f: any) => ({
            codigo_origem: String(f?.properties?.codigo_origem ?? ''),
            municipio_destino: String(f?.properties?.municipio_destino ?? ''),
            valor_total_destino: parsePtBrNumber(f?.properties?.valor_total_destino),
            ...(f?.properties?.codigo_destino ? { codigo_destino: String(f.properties.codigo_destino) } : {}),
            // Preserve a geometria
            geom: f?.geometry ?? f?.properties?.geom ?? null,
          }))
        : [];

      // Enriquecer UF nas periferias herdando do polo (via codigo_origem)
      const ufByCodigo = new Map(valores.map(v => [v.codigo_origem, String(v.UF || v.UF_origem || '').toUpperCase()]));
      const valoresEnriched = valores.map(v => ({ ...v, UF: String(v.UF || v.UF_origem || '').toUpperCase() }));
      const periEnriched = peri.map(v => ({ ...v, UF: ufByCodigo.get(v.codigo_origem) || '' }));

      setPolosValores(valoresEnriched);
      setPeriferia(periEnriched);

      console.log(`📊 [EstrategiaPage] Dados processados: ${valoresEnriched.length} polos, ${periEnriched.length} periferias`);
    } catch (err: any) {
      console.error('Erro ao processar dados estratégicos:', err);
    }
  }, [estrategiaData, loadingData]);

  // Função para formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Opções de polo vindas da base real (todas)
  const poloOptions = useMemo(() => {
    const seen = new Set<string>();
    const opts = polosValores
      .filter(p => {
        if (!p.codigo_origem) return false;
        if (seen.has(p.codigo_origem)) return false;
        seen.add(p.codigo_origem);
        return true;
      })
      .map(p => ({ value: p.codigo_origem, label: p.municipio_origem }));
    // Ordena alfabeticamente pelo label
    return opts.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [polosValores]);

  // Opções filtradas por UF selecionada (para o select de POLO)
  const filteredPoloOptions = useMemo(() => {
    if (selectedUF === 'ALL') return poloOptions;
    const seen = new Set<string>();
    const opts = polosValores
      .filter(p => p.UF_origem === selectedUF)
      .filter(p => {
        if (!p.codigo_origem) return false;
        if (seen.has(p.codigo_origem)) return false;
        seen.add(p.codigo_origem);
        return true;
      })
      .map(p => ({ value: p.codigo_origem, label: p.municipio_origem }));
    return opts.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [selectedUF, polosValores, poloOptions]);

  // Resetar polo selecionado caso UF mude e o polo atual não exista mais
  useEffect(() => {
    if (selectedPolo === 'ALL') return;
    const exists = filteredPoloOptions.some(o => o.value === selectedPolo);
    if (!exists) setSelectedPolo('ALL');
  }, [selectedUF, filteredPoloOptions, selectedPolo]);

  // GeoJSON minimal para o mapa (com geometria e apenas campos usados no mapa/popup)
  const polosFCForMap = useMemo(() => {
    const features = polosValores
      .filter(p => !!p.geom)
      .map(p => ({
        type: 'Feature' as const,
        geometry: p.geom,
        properties: {
          codigo_origem: p.codigo_origem,
          municipio_origem: p.municipio_origem,
          UF: String(p.UF || p.UF_origem || '').toUpperCase(),
          UF_origem: p.UF_origem || '',
          soma_valor_total_destino: p.soma_valor_total_destino,
          valor_total_origem: p.valor_total_origem,
        }
      }));
    return { type: 'FeatureCollection' as const, features };
  }, [polosValores]);

  const periferiasFCForMap = useMemo(() => {
    const features = periferia
      .filter(p => !!p.geom)
      .map(p => ({
        type: 'Feature' as const,
        geometry: p.geom,
        properties: {
          codigo_origem: p.codigo_origem,
          municipio_destino: p.municipio_destino,
          UF: p.UF || '',
          valor_total_destino: p.valor_total_destino,
          // codigo_destino pode não existir na tipagem atual; manter se vier na base original
        } as any
      }));
    return { type: 'FeatureCollection' as const, features };
  }, [periferia]);

  // Cálculos derivados para cards com base no polo aplicado
  const derived = useMemo(() => {
    const ufUpper = String(appliedUF || '').toUpperCase();
    const inUFMode = appliedPolo === 'ALL' && ufUpper !== 'ALL' && ufUpper !== '';
    const inPoloMode = appliedPolo !== 'ALL';

    // Filtrar registros conforme modo
    let valoresFiltrados = polosValores;
    if (inPoloMode) {
      valoresFiltrados = polosValores.filter(v => v.codigo_origem === appliedPolo);
    } else if (inUFMode) {
      valoresFiltrados = polosValores.filter(v => String(v.UF || v.UF_origem || '').toUpperCase() === ufUpper);
    }

    // Card 1: soma(soma_valor_total_destino + valor_total_origem)
    const valorPolo = valoresFiltrados.reduce((acc, v) => acc + (v.soma_valor_total_destino + v.valor_total_origem), 0);

    // Card 2 e 3: periferias filtradas por modo
    let periferiaFiltrada = periferia;
    if (inPoloMode) {
      periferiaFiltrada = periferia.filter(p => p.codigo_origem === appliedPolo);
    } else if (inUFMode) {
      periferiaFiltrada = periferia.filter(p => String(p.UF || '').toUpperCase() === ufUpper);
    }

    // Consolidar por município_destino e pegar Top 3
    const aggMap = new Map<string, number>();
    for (const p of periferiaFiltrada) {
      const nome = p.municipio_destino || '';
      const val = Number(p.valor_total_destino) || 0;
      if (!nome) continue;
      aggMap.set(nome, (aggMap.get(nome) || 0) + val);
    }
    const top3: MunicipioRanking[] = Array.from(aggMap.entries())
      .map(([nome, valor]) => ({ nome, valor }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 3);

    // Card 3 (flip): lista e total de municípios (destinos)
    const municipiosSet = new Set(periferiaFiltrada.map(p => p.municipio_destino).filter(Boolean));
    const municipiosList = Array.from(municipiosSet).sort((a, b) => a.localeCompare(b, 'pt-BR'));

    // Subtítulo com label de contexto
    const poloLabel = inPoloMode
      ? (poloOptions.find(o => o.value === appliedPolo)?.label || appliedPolo)
      : inUFMode
        ? `UF ${ufUpper}`
        : 'Todos os Polos';

    return {
      valorPolo,
      top3,
      municipiosList,
      totalMunicipios: municipiosList.length,
      poloLabel
    };
  }, [appliedPolo, appliedUF, polosValores, periferia, poloOptions]);

  // Reset da lista de municípios quando o polo mudar
  useEffect(() => {
    setShowMunicipiosList(false);
    setIsCardFlipped(false);
  }, [appliedPolo]);

  // Handler para eventos de teclado nos cards
  const handleCardKeyDown = (event: KeyboardEvent<HTMLDivElement>, metricId: string) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      if (metricId === 'municipios_polo') {
        setIsCardFlipped(!isCardFlipped);
      }
      setSelectedMetric(metricId);
    }
  };

  const metrics = [
    {
      id: 'valor_polo',
      title: 'Valor do Polo',
      value: derived.valorPolo, // valor numérico real calculado
      subtitle: derived.poloLabel,
      description: 'Soma de Polo + Periferia'
    },
    {
      id: 'top_municipios',
      title: 'Top 3 Municípios',
      value: 'ranking',
      subtitle: 'Maior Potencial',
      description: 'Municipios com maior valor_total_destino'
    },
    {
      id: 'municipios_polo',
      title: 'Municípios do Polo',
      value: derived.totalMunicipios.toString(),
      subtitle: appliedPolo === 'ALL' ? 'Municípios Totais' : 'Municípios no Polo',
      description: appliedPolo === 'ALL' ? '• Clique para ver lista de municípios' : 'Municípios que fazem parte deste polo • Clique para ver lista'
    }
  ];

  // Estado para painel de pista
  const [selectedRunway, setSelectedRunway] = useState<any | null>(null);
  const [isRunwayOpen, setIsRunwayOpen] = useState(false);

  // Largura alvo do painel
  const PANEL_WIDTH = 420; // px

  const handleRunwayClick = (runway: any, bbox: [number, number, number, number], mapInstance: any) => {
    setSelectedRunway(runway);
    setIsRunwayOpen(true);
    // Fit bounds considerando espaço do painel (desktop)
    if (mapInstance && window.innerWidth >= 768) {
      const [[minX, minY, maxX, maxY]] = [[bbox[0], bbox[1], bbox[2], bbox[3]]];
      mapInstance.fitBounds([
        [bbox[0], bbox[1]],
        [bbox[2], bbox[3]]
      ], {
        padding: { top: 24, bottom: 24, left: 24, right: PANEL_WIDTH + 24 },
        duration: 650
      });
    }
  };

  const closeRunwayPanel = () => {
    setIsRunwayOpen(false);
    setTimeout(() => setSelectedRunway(null), 400);
  };

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
              >
                <h1 className="text-3xl font-bold text-white mb-2">
                  Análise Estratégica de <span className="text-sky-400">Produtos</span>
                </h1>
              </motion.div>
            </div>
          </div>

          {/* Conteúdo scrollável */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-7xl mx-auto space-y-3">
              {/* Loading/Error states for data */}
              {loadingData && (
                <div className="bg-[#1e293b] border border-slate-700/50 rounded-lg p-3 text-slate-300 text-sm">
                  Carregando dados dos polos...
                </div>
              )}
              {errorData && (
                <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-3 text-red-200 text-sm">
                  {errorData}
                </div>
              )}
              
              {/* Seção de Filtros */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="bg-[#1e293b] border border-slate-700/50 rounded-lg p-3">
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                    {/* UF */}
                    <div className="flex flex-col">
                      <label className="text-slate-300 text-xs mb-0.5 text-center font-bold">ESTADO</label>
                      <select
                        value={selectedUF}
                        onChange={(e) => setSelectedUF(e.target.value)}
                        className="bg-[#0f172a] text-slate-200 border border-slate-700/50 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
                      >
                        <option value="ALL">Todas as UFs</option>
                        {[
                          'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
                        ].map(uf => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>

                    {/* POLO */}
                    <div className="flex flex-col">
                      <label className="text-slate-300 text-xs mb-0.5 text-center font-bold">POLO</label>
                      <select
                        value={selectedPolo}
                        onChange={(e) => setSelectedPolo(e.target.value)}
                        className="bg-[#0f172a] text-slate-200 border border-slate-700/50 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors"
                      >
                        <option value="ALL">Todos os Polos</option>
                        {filteredPoloOptions.map(opt => (
                          <option key={opt.value} value={opt.value}>{opt.label}</option>
                        ))}
                      </select>
                    </div>

                    {/* VALOR (R$) */}
                    <div className="flex flex-col">
                      <label className="text-slate-300 text-xs mb-0.5 text-center font-bold">VALOR (R$)</label>
                      <div className="grid grid-cols-2 gap-1.5">
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={minValor}
                          onChange={(e) => setMinValor(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="Mínimo"
                          className={`bg-[#0f172a] text-slate-200 border border-slate-700/50 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors ${styles['input-number']}`}
                        />
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={maxValor}
                          onChange={(e) => setMaxValor(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="Máximo"
                          className={`bg-[#0f172a] text-slate-200 border border-slate-700/50 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 transition-colors ${styles['input-number']}`}
                        />
                      </div>
                    </div>
                    
                    {/* Botão de Buscar */}
                    <div className="flex flex-col justify-end">
                      <label className="text-slate-300 text-xs mb-0.5 text-center font-bold opacity-0">Buscar</label>
                      <button
                        onClick={() => {
                          setAppliedUF(selectedUF);
                          setAppliedPolo(selectedPolo);
                          setAppliedMinValor(minValor);
                          setAppliedMaxValor(maxValor);
                        }}
                        className="bg-sky-600 hover:bg-sky-700 text-white px-4 py-1.5 rounded-md font-medium transition-colors duration-200 flex items-center justify-center gap-2 h-[38px]"
                      >
                        <span>
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                          </svg>
                        </span>
                        <span>Buscar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* Seção de Informações dos Polos - Cards */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-2 mb-2"
              >
                <div className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 ${loadingData ? 'opacity-60 pointer-events-none' : ''}`}>
                  {metrics.map((metric, index) => (
                    <Fragment key={metric.id}>
                      {metric.id === 'municipios_polo' ? (
                      // Flip Card Container
                      <div
                        className="relative w-full min-h-[160px] h-full"
                        style={{ perspective: '1000px' }}
                      >
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{
                            opacity: 1,
                            y: 0,
                            rotateX: isCardFlipped ? 180 : 0
                          }}
                          transition={{ duration: 0.6, ease: 'easeInOut' }}
                          className="relative w-full h-full cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg"
                          style={{ transformStyle: 'preserve-3d' }}
                          onClick={() => {
                            setIsCardFlipped(!isCardFlipped);
                            setSelectedMetric(metric.id);
                          }}
                          onKeyDown={(e) => handleCardKeyDown(e, metric.id)}
                          tabIndex={0}
                          role="button"
                          aria-label={isCardFlipped ? 'Fechar lista de municípios' : 'Ver lista de municípios do polo'}
                        >
                          {/* Frente do Card */}
                          <div
                            className="absolute inset-0 w-full h-full bg-[#1e293b] rounded-lg border border-slate-700/50 hover:bg-[#233044] transition-all duration-300 p-4"
                            style={{ backfaceVisibility: 'hidden' }}
                          >
                            <div className="absolute top-3 right-3">
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${isCardFlipped ? 'rotate-180' : ''}`}
                                fill="none"
                                viewBox="0 0 24 24"
                                stroke="currentColor"
                              >
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                              </svg>
                            </div>
                            <div className="absolute inset-0 flex items-center justify-center">
                              <div className="flex items-center gap-4">
                                <p className="text-white font-extrabold leading-none text-7xl md:text-8xl">
                                    <AnimatedNumber
                                      targetValue={derived.totalMunicipios}
                                      selectedPolo={selectedPolo}
                                    />
                                </p>
                                <div className="flex flex-col items-start leading-tight">
                                  <span className="text-sky-400 text-xl md:text-2xl font-semibold">
                                    {derived.totalMunicipios === 1 ? 'Município' : 'Municípios'}
                                  </span>
                                  <span className="text-slate-400 text-base md:text-lg">No Polo</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Verso do Card */}
                          <div
                            className="absolute inset-0 w-full h-full bg-[#1e293b] rounded-lg border border-slate-700/50 px-4 pt-2 pb-4 flex flex-col"
                            style={{
                              backfaceVisibility: 'hidden',
                              transform: 'rotateX(180deg)'
                            }}
                          >
                            <div className="flex justify-end mb-1">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setIsCardFlipped(false);
                                }}
                                className="text-slate-400 hover:text-white transition-colors"
                                aria-label="Fechar lista de municípios"
                              >
                                ✕
                              </button>
                            </div>
                            <div className="flex-1">
                              <div className="grid grid-cols-2 gap-2 h-full content-start">
                                {derived.municipiosList.slice(0, 10).map((municipio, idx) => (
                                  <div 
                                    key={idx}
                                    className="text-xs text-slate-300 py-1 px-2 max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap leading-tight bg-slate-800/60 rounded-md border border-slate-700/30 text-center hover:bg-slate-700/60 transition-colors"
                                    title={municipio}
                                  >
                                    {municipio}
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </div>
                    ) : (
                      // Cards normais (não flip)
                      <motion.div
                        key={metric.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                        className={`bg-[#1e293b] rounded-lg border border-slate-700/50 hover:bg-[#233044] transition-all duration-300 group min-h-[160px] ${
                          metric.id === 'valor_polo' ? 'focus:outline-none focus:ring-2 focus:ring-sky-500' : ''
                        } ${metric.id === 'top_municipios' ? 'p-4' : metric.id === 'valor_polo' ? 'p-6' : 'p-4'}`}
                        onClick={() => setSelectedMetric(metric.id)}
                        onKeyDown={(e) => {
                          if (metric.id === 'valor_polo') {
                            handleCardKeyDown(e, metric.id);
                          }
                        }}
                        tabIndex={metric.id === 'valor_polo' ? 0 : -1}
                      >
                        {metric.id === 'top_municipios' ? (
                          // Layout especial para Top 3 Municípios
                          <div className="flex flex-col h-full">
                            <div className="mb-3">
                              <h3 className="text-lg font-semibold text-white">{metric.title}</h3>
                              <p className="text-xs text-slate-400">{metric.description}</p>
                            </div>
                            <div className="flex-1 flex flex-col justify-center space-y-2">
                              {derived.top3.map((municipio, idx) => (
                                <div key={idx} className="flex items-center justify-between py-1.5 px-2 rounded-md bg-slate-800/30 border border-slate-700/20 hover:bg-slate-700/30 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                                      idx === 0 ? 'bg-blue-800 text-white' : 
                                      idx === 1 ? 'bg-blue-600 text-white' : 
                                      'bg-blue-400 text-white'
                                    }`}>
                                      {idx + 1}
                                    </div>
                                    <span className="text-sm font-medium text-slate-200 break-words max-w-[120px] leading-tight">
                                      {municipio.nome}
                                    </span>
                                  </div>
                                  <span className="text-sm font-semibold text-emerald-400 tabular-nums">
                                    R$ <AnimatedMonetaryValue 
                                      targetValue={municipio.valor} 
                                      selectedPolo={selectedPolo}
                                    />
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : (
                          // Layout padrão para outros cards // card 1
                          <div className="relative flex flex-col h-full">
                            {metric.id === 'valor_polo' ? (
                              // Layout especial para o card de Valor do Polo
                              <>
                                {/* Textos no canto superior esquerdo */}
                                <div className="absolute top-0 left-0 text-left space-y-1">
                                  <p className="text-sm font-bold text-slate-300">{metric.subtitle}</p>
                                  <p className="text-xs text-slate-500">{metric.description}</p>
                                </div>
                                
                                {/* Valor centralizado no meio do card */}
                                <div className="absolute inset-0 flex items-center justify-center">
                                  <p className="font-extrabold text-emerald-400 text-5xl">
                                    <AnimatedCurrency
                                      targetValue={metric.value as number}
                                      selectedPolo={appliedPolo}
                                    />
                                  </p>
                                </div>
                              </>
                            ) : (
                              // Layout padrão para outros cards
                              <div className="flex-1 flex flex-col">
                                <div className="flex items-center min-h-[80px]">
                                  <p className={`font-bold text-white ${metric.id === 'municipios_polo' ? 'text-5xl' : 'text-2xl'}`}>
                                    {metric.id === 'municipios_polo' ? (
                                      <AnimatedNumber
                                        targetValue={derived.totalMunicipios}
                                        selectedPolo={appliedPolo}
                                      />
                                    ) : (
                                      metric.value
                                    )}
                                  </p>
                                </div>
                                <div className="space-y-1 mt-auto">
                                  <p className="text-sm font-medium text-slate-300">{metric.subtitle}</p>
                                  <p className="text-xs text-slate-500">{metric.description}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                      </motion.div>
                      )}
                    </Fragment>
                  ))}
                </div>

                {/* Container do mapa + painel */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="mt-2 mb-2"
                >
                  {/* Desktop / md+ */}
                  <div className="hidden md:block">
                    <motion.div
                      className="grid w-full rounded-xl overflow-hidden"
                      animate={{ gridTemplateColumns: isRunwayOpen ? `1fr ${PANEL_WIDTH}px` : '1fr 0px' }}
                      transition={{ type: 'spring', stiffness: 120, damping: 20 }}
                      style={{ gap: isRunwayOpen ? '10px' : '0px' }}
                    >
                      <div className="h-[450px]">
                        <MapLibrePolygons
                          polos={polosFCForMap as any}
                          periferias={periferiasFCForMap as any}
                          appliedPolo={appliedPolo}
                          appliedUF={appliedUF}
                        />
                      </div>
                      <AnimatePresence initial={false}>
                        {isRunwayOpen && (
                          <motion.aside
                            key="runway-panel"
                            initial={{ opacity: 0, x: 40 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 40 }}
                            transition={{ type: 'spring', stiffness: 140, damping: 18 }}
                            className="h-[450px] bg-[#1e293b] border border-slate-700/50 rounded-xl p-4 flex flex-col"
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div>
                                <h3 className="text-lg font-semibold text-white">{selectedRunway?.name}</h3>
                                <p className="text-xs text-slate-400">Informações da pista selecionada</p>
                              </div>
                              <button onClick={closeRunwayPanel} className="text-slate-400 hover:text-white transition-colors" aria-label="Fechar painel">✕</button>
                            </div>
                            <div className="space-y-3 text-sm">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Comprimento</span>
                                <span className="text-sky-400 font-medium">{selectedRunway?.length} m</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Superfície</span>
                                <span className="text-sky-400 font-medium">{selectedRunway?.surface}</span>
                              </div>
                            </div>
                            <div className="mt-auto pt-4">
                              <button
                                onClick={closeRunwayPanel}
                                className="w-full bg-sky-600 hover:bg-sky-700 text-white text-sm font-medium py-2 rounded-md transition-colors"
                              >
                                Fechar
                              </button>
                            </div>
                          </motion.aside>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  </div>
                  {/* Mobile */}
                  <div className="md:hidden">
                    <div className="h-[415px] relative">
                      <MapLibrePolygons
                        polos={polosFCForMap as any}
                        periferias={periferiasFCForMap as any}
                        appliedPolo={appliedPolo}
                        appliedUF={appliedUF}
                      />
                      <AnimatePresence>
                        {isRunwayOpen && (
                          <motion.div
                            key="runway-sheet"
                            initial={{ y: '100%' }}
                            animate={{ y: 0 }}
                            exit={{ y: '100%' }}
                            transition={{ type: 'spring', stiffness: 160, damping: 22 }}
                            className="absolute bottom-0 inset-x-0 bg-[#1e293b] border-t border-slate-700/60 rounded-t-xl p-4 max-h-[70%] flex flex-col shadow-2xl"
                          >
                            <div className="w-12 h-1.5 rounded-full bg-slate-600 mx-auto mb-3" />
                            <div className="flex items-start justify-between mb-2">
                              <div>
                                <h3 className="text-base font-semibold text-white">{selectedRunway?.name}</h3>
                                <p className="text-[11px] text-slate-400">Informações da pista</p>
                              </div>
                              <button onClick={closeRunwayPanel} className="text-slate-400 hover:text-white transition-colors text-sm" aria-label="Fechar">✕</button>
                            </div>
                            <div className="space-y-2 text-xs">
                              <div className="flex justify-between">
                                <span className="text-slate-400">Comprimento</span>
                                <span className="text-sky-400 font-medium">{selectedRunway?.length} m</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-slate-400">Superfície</span>
                                <span className="text-sky-400 font-medium">{selectedRunway?.surface}</span>
                              </div>
                            </div>
                            <div className="mt-4">
                              <button
                                onClick={closeRunwayPanel}
                                className="w-full bg-sky-600 hover:bg-sky-700 text-white text-xs font-medium py-2 rounded-md transition-colors"
                              >Fechar</button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  </div>
                </motion.div>
              </motion.section>

            </div>
          </div>
        </main>
      </div>

      {/* Footer */}
      <MiniFooter />
      
      {/* Botão scroll to top */}
      <ScrollToTopButton />
    </div>
  );
}
