"use client";

import { useState, useEffect } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MiniFooter from '@/components/MiniFooter';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import dynamic from 'next/dynamic';

// MapLibre não funciona no SSR; carregar dinamicamente apenas no cliente
const DynamicMapLibreMock = dynamic(() => import('@/components/MapLibreMock'), {
  ssr: false
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
      duration: 1.5, // 1.5 segundos para a animação
      ease: "easeOut"
    });
    return controls.stop;
  }, [count, targetValue, selectedPolo]); // Reexecuta quando o polo muda

  return <motion.span>{displayValue}</motion.span>;
}

export default function EstrategiaPage() {
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [showMunicipiosList, setShowMunicipiosList] = useState(false);
  // Filtros (mock)
  const [selectedUF, setSelectedUF] = useState<string>('ALL');
  const [selectedPolo, setSelectedPolo] = useState<string>('ALL');
  const [minValor, setMinValor] = useState<number | ''>('');
  const [maxValor, setMaxValor] = useState<number | ''>('');

  // Dados mock dos polos para demonstração
  const polosData = {
    'ALL': {
      valorTotal: 15750000, // Soma de todos os polos
      municipios: ['Polo 1: 8 municípios', 'Polo 2: 12 municípios', 'Polo 3: 6 municípios', 'Polo 4: 10 municípios', 'Polo 5: 9 municípios'],
      totalMunicipios: 45
    },
    'Polo 1': {
      valorTotal: 3200000,
      municipios: ['Município A', 'Município B', 'Município C', 'Município D', 'Município E', 'Município F', 'Município G', 'Município H'],
      totalMunicipios: 8
    },
    'Polo 2': {
      valorTotal: 4100000,
      municipios: ['Município I', 'Município J', 'Município K', 'Município L', 'Município M', 'Município N', 'Município O', 'Município P', 'Município Q', 'Município R', 'Município S', 'Município T'],
      totalMunicipios: 12
    },
    'Polo 3': {
      valorTotal: 2800000,
      municipios: ['Município U', 'Município V', 'Município W', 'Município X', 'Município Y', 'Município Z'],
      totalMunicipios: 6
    },
    'Polo 4': {
      valorTotal: 3500000,
      municipios: ['Município AA', 'Município BB', 'Município CC', 'Município DD', 'Município EE', 'Município FF', 'Município GG', 'Município HH', 'Município II', 'Município JJ'],
      totalMunicipios: 10
    },
    'Polo 5': {
      valorTotal: 2150000,
      municipios: ['Município KK', 'Município LL', 'Município MM', 'Município NN', 'Município OO', 'Município PP', 'Município QQ', 'Município RR', 'Município SS'],
      totalMunicipios: 9
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
  const currentPoloData = polosData[selectedPolo as keyof typeof polosData] || polosData['ALL'];

  // Reset da lista de municípios quando o polo mudar
  useEffect(() => {
    setShowMunicipiosList(false);
  }, [selectedPolo]);

  const metrics = [
    {
      id: 'valor_polo',
      title: 'Valor do Polo',

      value: currentPoloData.valorTotal, // Passamos o valor numérico para a animação
      subtitle: selectedPolo === 'ALL' ? 'Todos os Polos' : selectedPolo,
      description: 'Somatório do valor disponível no polo e vizinhança'
    },
    {
      id: 'municipios_polo',
      title: 'Municípios do Polo',

      value: currentPoloData.totalMunicipios.toString(),
      subtitle: selectedPolo === 'ALL' ? 'Municípios Totais' : 'Municípios no Polo',
      description: selectedPolo === 'ALL' ? 'Total de municípios em todos os polos' : 'Municípios que fazem parte deste polo'
    },
    {
      id: 'reservado',
      title: 'Em Desenvolvimento',

      value: '--',
      subtitle: 'Funcionalidade Futura',
      description: 'Este card está reservado para desenvolvimento futuro'
    }
  ];

  const strategicAreas = [
    {
      title: 'Análise de Mercado',
      description: 'Identificação de oportunidades e tendências nos municípios brasileiros',
      progress: 75,
      status: 'Em Andamento',
      color: 'bg-blue-500'
    },
    {
      title: 'Expansão Territorial',
      description: 'Estratégia de crescimento para novos mercados regionais',
      progress: 60,
      status: 'Planejamento',
      color: 'bg-green-500'
    },
    {
      title: 'Parcerias Estratégicas',
      description: 'Desenvolvimento de alianças com instituições de ensino',
      progress: 90,
      status: 'Ativo',
      color: 'bg-purple-500'
    },
    {
      title: 'Inovação de Produtos',
      description: 'Pesquisa e desenvolvimento de novas soluções municipais',
      progress: 45,
      status: 'Pesquisa',
      color: 'bg-orange-500'
    }
  ];

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white">
      {/* Navbar */}
      <Navbar />
      
      {/* Layout principal com Sidebar */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Conteúdo principal */}
        <main className="flex-1 flex flex-col overflow-hidden">
          {/* Header da página */}
          <div className="p-6 border-b border-slate-700/50">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
              >
                <h1 className="text-3xl font-bold text-white mb-2">
                  Análise Estratégica dos Polos e Produtos (Mock)
                </h1>
                <p className="text-slate-400">
                  Apoio para visão e insights para direcionamento da equipe
                </p>
              </motion.div>
            </div>
          </div>

          {/* Conteúdo scrollável */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-4">
              
              {/* Seção de Filtros */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="bg-[#1e293b] border border-slate-700/50 rounded-lg p-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    {/* UF */}
                    <div className="flex flex-col">
                      <label className="text-slate-300 text-xs mb-1">UF</label>
                      <select
                        value={selectedUF}
                        onChange={(e) => setSelectedUF(e.target.value)}
                        className="bg-[#0f172a] text-slate-200 border border-slate-700/50 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="ALL">Todas as UFs</option>
                        {[
                          'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
                        ].map(uf => (
                          <option key={uf} value={uf}>{uf}</option>
                        ))}
                      </select>
                    </div>

                    {/* Polo */}
                    <div className="flex flex-col">
                      <label className="text-slate-300 text-xs mb-1">Polo</label>
                      <select
                        value={selectedPolo}
                        onChange={(e) => setSelectedPolo(e.target.value)}
                        className="bg-[#0f172a] text-slate-200 border border-slate-700/50 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
                      >
                        <option value="ALL">Todos os Polos</option>
                        {/* Opções mock coerentes com o MapLibreMock (Polo 1...Polo 5) */}
                        {[1,2,3,4,5].map(n => (
                          <option key={n} value={`Polo ${n}`}>{`Polo ${n}`}</option>
                        ))}
                      </select>
                    </div>

                    {/* Valor (R$) */}
                    <div className="flex flex-col">
                      <label className="text-slate-300 text-xs mb-1">Valor (R$)</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={minValor}
                          onChange={(e) => setMinValor(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="Mínimo"
                          className="bg-[#0f172a] text-slate-200 border border-slate-700/50 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                        <input
                          type="number"
                          min={0}
                          step={1000}
                          value={maxValor}
                          onChange={(e) => setMaxValor(e.target.value === '' ? '' : Number(e.target.value))}
                          placeholder="Máximo"
                          className="bg-[#0f172a] text-slate-200 border border-slate-700/50 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-sky-500"
                        />
                      </div>
                      <span className="text-xs text-slate-500 mt-1">Prévia (mock) — valores ilustrativos</span>
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* Seção de Informações dos Polos - Cards */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-2"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {metrics.map((metric, index) => (
                    <motion.div
                      key={metric.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                      className={`bg-[#1e293b] rounded-lg p-6 border border-slate-700/50 hover:bg-[#233044] transition-all duration-300 group ${
                        metric.id === 'municipios_polo' ? 'cursor-pointer' : ''
                      } ${metric.id === 'reservado' ? 'opacity-60' : ''}`}
                      onClick={() => {
                        if (metric.id === 'municipios_polo') {
                          setShowMunicipiosList(!showMunicipiosList);
                        }
                        setSelectedMetric(metric.id);
                      }}
                    >
                      <div className="flex items-center justify-end mb-4">
                        {metric.id === 'municipios_polo' && (
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-4 w-4 text-slate-400 transition-transform duration-200 ${showMunicipiosList ? 'rotate-180' : ''}`} 
                            fill="none" 
                            viewBox="0 0 24 24" 
                            stroke="currentColor"
                          >
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                        )}
                      </div>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-white">
                          {metric.id === 'valor_polo' ? (
                            <AnimatedCurrency 
                              targetValue={metric.value as number} 
                              selectedPolo={selectedPolo}
                            />
                          ) : (
                            metric.value
                          )}
                        </p>
                        <p className="text-sm font-medium text-slate-300">{metric.subtitle}</p>
                        <p className="text-xs text-slate-500">{metric.description}</p>
                        
                        {/* Lista expandível de municípios */}
                        {metric.id === 'municipios_polo' && showMunicipiosList && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.3 }}
                            className="mt-4 pt-4 border-t border-slate-600"
                          >
                            <div className="max-h-32 overflow-y-auto space-y-1">
                              {currentPoloData.municipios.map((municipio, idx) => (
                                <div key={idx} className="text-xs text-slate-400 py-1 px-2 bg-slate-800/50 rounded">
                                  {municipio}
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Mapa logo abaixo dos cards */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="mt-2"
                >
                  <DynamicMapLibreMock
                    uf={selectedUF}
                    polo={selectedPolo}
                    minValue={minValor === '' ? undefined : minValor}
                    maxValue={maxValor === '' ? undefined : maxValor}
                  />
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
