"use client";

import { useState, useEffect, KeyboardEvent, Fragment } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MiniFooter from '@/components/MiniFooter';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import styles from './page.module.css';

// Tipagem dos dados dos polos
interface MunicipioRanking {
  nome: string;
  valor: number;
}

interface PoloData {
  valorTotal: number;
  municipios: string[];
  totalMunicipios: number;
  topMunicipios: MunicipioRanking[];
}

interface PolosData {
  [key: string]: PoloData;
}

// MapLibre não funciona no SSR; carregar dinamicamente apenas no cliente
const DynamicMapLibreMock = dynamic(() => import('@/components/MapLibreMock'), {
  ssr: false,
  loading: () => (
    <div className="h-64 rounded-lg border border-slate-700/50 bg-slate-800/30 animate-pulse flex items-center justify-center">
      <div className="text-slate-400 text-sm">Carregando mapa...</div>
    </div>
  )
});

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

  // Dados mock dos polos para demonstração
  const polosData: PolosData = {
    'ALL': {
      valorTotal: 15750000,
      municipios: ['Polo 1: 8 municípios', 'Polo 2: 12 municípios', 'Polo 3: 6 municípios', 'Polo 4: 10 municípios', 'Polo 5: 9 municípios'],
      totalMunicipios: 45,
      topMunicipios: [
        { nome: 'Araçatuba', valor: 3000000 },
        { nome: 'João Pessoa', valor: 2000000 },
        { nome: 'Alagoinha', valor: 1000000 }
      ]
    },
    'Polo 1': {
      valorTotal: 3200000,
      municipios: ['Município A', 'Município B', 'Município C', 'Município D', 'Município E', 'Município F', 'Município G', 'Município H'],
      totalMunicipios: 8,
      topMunicipios: [
        { nome: 'Araçatuba', valor: 1200000 },
        { nome: 'Santos', valor: 1000000 },
        { nome: 'Bauru', valor: 800000 }
      ]
    },
    'Polo 2': {
      valorTotal: 4100000,
      municipios: ['Município I', 'Município J', 'Município K', 'Município L', 'Município M', 'Município N', 'Município O', 'Município P', 'Município Q', 'Município R', 'Município S', 'Município T'],
      totalMunicipios: 12,
      topMunicipios: [
        { nome: 'João Pessoa', valor: 1500000 },
        { nome: 'Campina Grande', valor: 1200000 },
        { nome: 'Bayeux', valor: 900000 }
      ]
    },
    'Polo 3': {
      valorTotal: 2800000,
      municipios: ['Município U', 'Município V', 'Município W', 'Município X', 'Município Y', 'Município Z'],
      totalMunicipios: 6,
      topMunicipios: [
        { nome: 'Recife', valor: 1100000 },
        { nome: 'Olinda', valor: 850000 },
        { nome: 'Jaboatão', valor: 700000 }
      ]
    },
    'Polo 4': {
      valorTotal: 3500000,
      municipios: ['Município AA', 'Município BB', 'Município CC', 'Município DD', 'Município EE', 'Município FF', 'Município GG', 'Município HH', 'Município II', 'Município JJ'],
      totalMunicipios: 10,
      topMunicipios: [
        { nome: 'Fortaleza', valor: 1300000 },
        { nome: 'Caucaia', valor: 1100000 },
        { nome: 'Maracanaú', valor: 950000 }
      ]
    },
    'Polo 5': {
      valorTotal: 2150000,
      municipios: ['Município KK', 'Município LL', 'Município MM', 'Município NN', 'Município OO', 'Município PP', 'Município QQ', 'Município RR', 'Município SS'],
      totalMunicipios: 9,
      topMunicipios: [
        { nome: 'Alagoinha', valor: 800000 },
        { nome: 'Guarabira', valor: 650000 },
        { nome: 'Esperança', valor: 500000 }
      ]
    }
  };

  // Função para formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Dados dinâmicos dos cards baseados no polo selecionado
  const currentPoloData = polosData[appliedPolo] || polosData['ALL'];

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

      value: currentPoloData.valorTotal, // Passamos o valor numérico para a animação
      subtitle: appliedPolo === 'ALL' ? 'Todos os Polos' : appliedPolo,
      description: 'Valor total potencial...'
    },
    {
      id: 'top_municipios',
      title: 'Top 3 Municípios',
      value: 'ranking',
      subtitle: 'Maior Potencial',
      description: 'Municípios com maior potencial de conversão'
    },
    {
      id: 'municipios_polo',
      title: 'Municípios do Polo',

      value: currentPoloData.totalMunicipios.toString(),
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
                        {/* Opções mock coerentes com o MapLibreMock (Polo 1...Polo 5) */}
                        {[1,2,3,4,5].map(n => (
                          <option key={n} value={`Polo ${n}`}>{`Polo ${n}`}</option>
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
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
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
                                    targetValue={currentPoloData.totalMunicipios}
                                    selectedPolo={selectedPolo}
                                  />
                                </p>
                                <div className="flex flex-col items-start leading-tight">
                                  <span className="text-sky-400 text-xl md:text-2xl font-semibold">
                                    {currentPoloData.totalMunicipios === 1 ? 'Município' : 'Municípios'}
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
                              <div className="grid grid-cols-3 md:grid-cols-4 gap-2 h-full content-start">
                                {currentPoloData.municipios.map((municipio, idx) => (
                                  <div 
                                    key={idx} 
                                    className="text-xs text-slate-300 py-1.5 px-3 whitespace-nowrap leading-tight bg-slate-800/60 rounded-md border border-slate-700/30 text-center hover:bg-slate-700/60 transition-colors"
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
                              {currentPoloData.topMunicipios.map((municipio, idx) => (
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
                                        targetValue={currentPoloData.totalMunicipios}
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
                        <DynamicMapLibreMock
                          uf={appliedUF}
                          polo={appliedPolo}
                          minValue={appliedMinValor === '' ? undefined : appliedMinValor}
                          maxValue={appliedMaxValor === '' ? undefined : appliedMaxValor}
                          onRunwayClick={handleRunwayClick}
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
                      <DynamicMapLibreMock
                        uf={appliedUF}
                        polo={appliedPolo}
                        minValue={appliedMinValor === '' ? undefined : appliedMinValor}
                        maxValue={appliedMaxValor === '' ? undefined : appliedMaxValor}
                        onRunwayClick={handleRunwayClick}
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
