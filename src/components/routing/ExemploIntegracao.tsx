/**
 * EXEMPLO DE INTEGRAÇÃO DO SISTEMA DE ROTAS NA PÁGINA DE ESTRATÉGIA
 * 
 * Este arquivo mostra como integrar o sistema de rotas na página /estrategia
 * existente. Não é para ser usado diretamente - é apenas um guia de implementação.
 * 
 * NOTA: Os erros TypeScript neste arquivo são esperados, pois é apenas um exemplo
 * mostrando como integrar os componentes na página real.
 */

// @ts-nocheck

import React, { useState, useRef } from 'react';
import { RotasComponent, RotaMapVisualization, useRotas } from '@/components/routing';
import type { RotaCompleta } from '@/types/routing';

// EXEMPLO 1: Adição do componente de rotas como uma nova seção na sidebar

/*
Na função EstrategiaPage, adicionar:

const [mostrarRotas, setMostrarRotas] = useState(false);
const [rotaAtual, setRotaAtual] = useState<RotaCompleta | null>(null);
const mapRef = useRef<maplibregl.Map | null>(null); // Referência do mapa existente

// Callback para quando uma rota for calculada
const handleRotaChange = (rota: RotaCompleta | null) => {
  setRotaAtual(rota);
};

// No JSX da sidebar, adicionar uma nova seção:
*/

const ExemploSidebarSection = () => (
  <div className="mb-6">
    <button
      onClick={() => setMostrarRotas(!mostrarRotas)}
      className="w-full flex justify-between items-center p-3 bg-blue-50 hover:bg-blue-100 rounded-lg transition-colors"
    >
      <span className="font-medium text-blue-800">🛣️ Sistema de Rotas</span>
      <span className="text-blue-600">
        {mostrarRotas ? '▼' : '▶'}
      </span>
    </button>
    
    {mostrarRotas && (
      <div className="mt-3">
        <RotasComponent
          municipios={municipiosSelecionados} // Array de municípios selecionados
          onRotaChange={handleRotaChange}
          className="border border-gray-200 rounded-lg"
        />
      </div>
    )}
  </div>
);

// EXEMPLO 2: Integração com o mapa existente

/*
No componente MapLibrePolygons, adicionar o RotaMapVisualization:

const MapLibrePolygonsComRotas = ({ 
  // ... props existentes
  rotaParaVisualizar 
}) => {
  // ... código existente do mapa

  return (
    <div ref={mapContainerRef} className="map-container">
      // Componente invisível que adiciona as camadas de rota ao mapa
      <RotaMapVisualization
        map={mapRef.current}
        rota={rotaParaVisualizar}
        showLabels={true}
        showDirections={false}
      />
    </div>
  );
};
*/

// EXEMPLO 3: Hook customizado para gerenciar estado das rotas na página

export const useEstrategiaRotas = (municipios: any[]) => {
  const [mostrarPainelRotas, setMostrarPainelRotas] = useState(false);
  const [rotaAtiva, setRotaAtiva] = useState<RotaCompleta | null>(null);
  
  const togglePainelRotas = () => {
    setMostrarPainelRotas(!mostrarPainelRotas);
  };

  const limparRota = () => {
    setRotaAtiva(null);
  };

  const handleNovaRota = (rota: RotaCompleta | null) => {
    setRotaAtiva(rota);
    
    // Opcional: analytics ou logs
    console.log('Nova rota calculada:', rota);
  };

  return {
    mostrarPainelRotas,
    rotaAtiva,
    togglePainelRotas,
    limparRota,
    handleNovaRota
  };
};

// EXEMPLO 4: Integração completa na página de estratégia

export const ExemploIntegracaoCompleta = () => {
  // ... estados existentes da página
  const [municipiosSelecionados, setMunicipiosSelecionados] = useState([]);
  const mapRef = useRef<maplibregl.Map | null>(null);

  // Estados para rotas
  const {
    mostrarPainelRotas,
    rotaAtiva,
    togglePainelRotas,
    limparRota,
    handleNovaRota
  } = useEstrategiaRotas(municipiosSelecionados);

  return (
    <div className="flex h-screen">
      {/* Sidebar existente */}
      <div className="w-1/3 bg-white border-r border-gray-200 overflow-y-auto">
        
        {/* Seções existentes da sidebar... */}
        
        {/* Nova seção de rotas */}
        <div className="p-4 border-b border-gray-200">
          <button
            onClick={togglePainelRotas}
            className="w-full flex justify-between items-center p-3 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-lg transition-all"
          >
            <span className="font-medium">🛣️ Planejamento de Rotas</span>
            <span>{mostrarPainelRotas ? '▼' : '▶'}</span>
          </button>
          
          {mostrarPainelRotas && (
            <div className="mt-4">
              <RotasComponent
                municipios={municipiosSelecionados}
                onRotaChange={handleNovaRota}
                className="shadow-lg"
              />
              
              {rotaAtiva && (
                <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-medium text-green-800">✅ Rota Calculada</div>
                      <div className="text-sm text-green-600 mt-1">
                        {rotaAtiva.estatisticas.distanciaTotalKm.toFixed(1)} km • {' '}
                        {Math.round(rotaAtiva.estatisticas.tempoTotalMinutos)} min
                      </div>
                    </div>
                    <button
                      onClick={limparRota}
                      className="text-green-600 hover:text-green-800 text-sm"
                    >
                      ✕
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
        
        {/* Outras seções existentes... */}
        
      </div>

      {/* Área do mapa */}
      <div className="w-2/3 relative">
        {/* MapLibrePolygons existente */}
        <MapLibrePolygons
          // ... props existentes
          ref={(ref) => {
            if (ref && ref.getMap) {
              mapRef.current = ref.getMap();
            }
          }}
        />
        
        {/* Overlay de visualização da rota */}
        <RotaMapVisualization
          rota={rotaAtiva}
          showLabels={true}
          showDirections={false}
        />
        
        {/* Opcional: Controles do mapa para rotas */}
        {rotaAtiva && (
          <div className="absolute top-4 right-4 bg-white rounded-lg shadow-lg p-3">
            <div className="text-sm font-medium text-gray-800">Rota Ativa</div>
            <div className="text-xs text-gray-600 mt-1">
              {rotaAtiva.nome}
            </div>
            <button
              onClick={limparRota}
              className="mt-2 text-xs text-red-600 hover:text-red-800"
            >
              Ocultar Rota
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// EXEMPLO 5: Configurações específicas para o projeto NEXUS

export const configuracaoRotasNexus = {
  // Configuração padrão otimizada para o Brasil
  velocidadeMediaVooKmh: 220, // Helicóptero médio
  preferirVooEntrePolos: true,
  limitarDistanciaMaximaTerrestreKm: 400, // Acima de 400km, preferir voo
  otimizarOrdemPolos: true,
  otimizarRotasPeriferias: true,
  
  // Estilos do mapa
  coresPersonalizadas: {
    voo: '#1E40AF', // Azul escuro
    terrestre: '#059669', // Verde escuro  
    polo: '#DC2626', // Vermelho
    periferia: '#D97706' // Laranja
  }
};

/*
INSTRUÇÕES DE IMPLEMENTAÇÃO:

1. Instalar dependências (se necessário):
   npm install @turf/turf

2. Adicionar os imports na página de estratégia:
   import { RotasComponent, RotaMapVisualization } from '@/components/routing';

3. Adicionar os estados para rotas:
   const [mostrarRotas, setMostrarRotas] = useState(false);
   const [rotaAtual, setRotaAtual] = useState<RotaCompleta | null>(null);

4. Adicionar o RotasComponent na sidebar onde desejar

5. Adicionar o RotaMapVisualization dentro ou após o MapLibrePolygons

6. Configurar callbacks para comunicação entre componentes

7. Opcional: Adicionar persistência das rotas no contexto ou localStorage

8. Opcional: Integrar com sistema de exportação existente (PDF, Excel)

CONSIDERAÇÕES TÉCNICAS:

- O sistema é totalmente modular e não interfere com código existente
- Usa MapLibre GL JS (já instalado no projeto)
- Compatible com o contexto de estratégia existente
- Suporta diferentes tipos de transporte e otimizações
- Preparado para integração com OSRM quando disponível
- Responsivo e acessível
*/

export default ExemploIntegracaoCompleta;