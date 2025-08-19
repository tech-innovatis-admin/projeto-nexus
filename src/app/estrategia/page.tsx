"use client";

import { useState } from 'react';
import { motion } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MiniFooter from '@/components/MiniFooter';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import dynamic from 'next/dynamic';

// MapLibre não funciona no SSR; carregar dinamicamente apenas no cliente
const DynamicMapLibreMock = dynamic(() => import('@/components/MapLibreMock'), {
  ssr: false
});

export default function EstrategiaPage() {
  const [selectedMetric, setSelectedMetric] = useState('overview');
  // Filtros (mock)
  const [selectedUF, setSelectedUF] = useState<string>('ALL');
  const [selectedPolo, setSelectedPolo] = useState<string>('ALL');
  const [minValor, setMinValor] = useState<number | ''>('');
  const [maxValor, setMaxValor] = useState<number | ''>('');

  const metrics = [
    {
      id: 'overview',
      title: 'Visão Geral',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
        </svg>
      ),
      value: '5.570',
      subtitle: 'Municípios Brasileiros',
      description: 'Total de municípios cadastrados na plataforma'
    },
    {
      id: 'products',
      title: 'Produtos Ativos',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      ),
      value: '7',
      subtitle: 'Soluções Disponíveis',
      description: 'Plano Diretor, PMSB, CTM, REURB, Start Lab, Procon VAA, VAAT'
    },
    {
      id: 'coverage',
      title: 'Cobertura',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      value: '27',
      subtitle: 'Estados Cobertos',
      description: 'Presença em todo território nacional'
    },
    {
      id: 'partnerships',
      title: 'Municípios Cobertos',
      icon: (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
        </svg>
      ),
      value: '100+',
      subtitle: 'Municípios',
      description: 'Gestores públicos impactados'
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
                  Análise Estratégica
                </h1>
                <p className="text-slate-400">
                  Apoio para visão estratégica e insights para direcionamento da equipe
                </p>
              </motion.div>
            </div>
          </div>

          {/* Conteúdo scrollável */}
          <div className="flex-1 overflow-y-auto p-6">
            <div className="max-w-7xl mx-auto space-y-8">
              
              {/* Grid de Métricas Principais */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <h2 className="text-xl font-semibold text-white mb-6">Métricas Principais</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                  {metrics.map((metric, index) => (
                    <motion.div
                      key={metric.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 + index * 0.1 }}
                      className="bg-[#1e293b] rounded-lg p-6 border border-slate-700/50 hover:bg-[#233044] transition-all duration-300 cursor-pointer group"
                      onClick={() => setSelectedMetric(metric.id)}
                    >
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sky-400 group-hover:text-sky-300 transition-colors">
                          {metric.icon}
                        </div>
                        <div className={`w-2 h-2 rounded-full ${selectedMetric === metric.id ? 'bg-sky-400' : 'bg-slate-600'}`}></div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-2xl font-bold text-white">{metric.value}</p>
                        <p className="text-sm font-medium text-slate-300">{metric.subtitle}</p>
                        <p className="text-xs text-slate-500">{metric.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.section>

              {/* Mapa MapLibre com dados mock */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
              >
                <h2 className="text-xl font-semibold text-white mt-10 mb-4">Mapa Estratégico dos Polos (Mock)</h2>
                <p className="text-slate-400 text-sm mb-3">
                  Espaço dedicado para a visualização dos Polos e os municípios vizinhos com potenciais conversões.
                </p>
                {/* Filtros mock (profissionais) */}
                <div className="bg-[#1e293b] border border-slate-700/50 rounded-lg p-4 mb-4">
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
                <DynamicMapLibreMock
                  uf={selectedUF}
                  polo={selectedPolo}
                  minValue={minValor === '' ? undefined : minValor}
                  maxValue={maxValor === '' ? undefined : maxValor}
                />
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
