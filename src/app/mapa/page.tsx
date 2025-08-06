"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef } from "react";
import type { Feature, FeatureCollection } from "geojson";
import "leaflet/dist/leaflet.css";
import Image from "next/image";
import InformacoesMunicipio from "../../components/InformacoesMunicipio";
import { MapDataProvider, useMapData } from "../../contexts/MapDataContext";
import ExportMenu from "@/components/ExportMenu";
import ExportAdvancedModal from "@/components/ExportAdvancedModal";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import MiniFooter from "@/components/MiniFooter";
import Navbar from "@/components/Navbar";

// Importação dinâmica do mapa para evitar problemas de SSR
const MapaMunicipal = dynamic(() => import("../../components/MapaMunicipal"), { ssr: false });

// Componente de barra de progresso
function LoadingProgressBar({ progress }: { progress: number }) {
  // Função para gerar o gradiente de cor baseado no progresso
  const getProgressColor = (progress: number) => {
    // Cores para diferentes estágios de progresso usando apenas tons de azul
    // Início (0-33%): azul claro para azul médio
    // Meio (33-66%): azul médio para azul mais escuro
    // Final (66-100%): azul escuro para azul muito escuro
    
    if (progress < 33) {
      // De azul claro para azul médio
      return `linear-gradient(to right, #38bdf8, #0ea5e9, #0284c7)`;
    } else if (progress < 66) {
      // De azul médio para azul mais escuro
      return `linear-gradient(to right,rgb(31, 152, 207),rgb(34, 138, 190),rgb(30, 69, 175))`;
    } else {
      // De azul escuro para azul muito escuro
      return `linear-gradient(to right,rgb(29, 85, 170),rgb(28, 59, 160),rgb(27, 54, 128))`;
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-3 px-4">
      <div className="w-full bg-gray-700 h-2 rounded-full overflow-hidden shadow-inner">
        <div 
          className="h-full rounded-full transition-all duration-300 ease-out shadow-lg progress-bar-shine"
          style={{ 
            width: `${progress}%`,
            background: getProgressColor(progress)
          }}
        />
      </div>
      <div className="flex justify-between text-sm text-slate-400 mt-1 px-0.5">
        <span>Carregando dados...</span>
        <span>{progress}%</span>
      </div>
    </div>
  );
}

// Componente principal que usa o contexto
function MapaPageContent() {
  const { municipioSelecionado, setMunicipioSelecionado, loading, loadingProgress, mapData } = useMapData();
  const [municipio, setMunicipio] = useState<string>("");
  const [estado, setEstado] = useState<string>("");
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  const [estados, setEstados] = useState<string[]>([]);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [estadoSelecionado, setEstadoSelecionado] = useState<string>("");
  const [municipioSelecionadoDropdown, setMunicipioSelecionadoDropdown] = useState<string>("");
  const [advancedModalOpen, setAdvancedModalOpen] = useState<boolean>(false);
  const dadosRef = useRef<HTMLDivElement>(null);
  
  // Extrair estados únicos do GeoJSON quando os dados forem carregados
  useEffect(() => {
    if (mapData?.dados && mapData.dados.features) {
      const estadosUnicos = [...new Set(mapData.dados.features
        .map((feature: Feature) => feature.properties?.name_state)
        .filter(Boolean)
        .sort()
      )];
      setEstados(estadosUnicos as string[]);
    }
  }, [mapData]);
  
  // Atualizar municípios quando um estado for selecionado
  useEffect(() => {
    if (!estadoSelecionado || !mapData?.dados) {
      setMunicipios([]);
      return;
    }
    
    const municipiosDoEstado = mapData.dados.features
      .filter((feature: Feature) => feature.properties?.name_state === estadoSelecionado)
      .map((feature: Feature) => feature.properties?.nome_municipio || feature.properties?.municipio)
      .filter(Boolean)
      .sort();
    
    setMunicipios([...new Set(municipiosDoEstado)] as string[]);
  }, [estadoSelecionado, mapData]);
  
  // Atualizar os campos de texto quando os dropdowns mudarem
  useEffect(() => {
    setEstado(estadoSelecionado);
  }, [estadoSelecionado]);
  
  useEffect(() => {
    setMunicipio(municipioSelecionadoDropdown);
  }, [municipioSelecionadoDropdown]);

  // Busca o município ao clicar em buscar
  function removerAcentos(str: string) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function handleBuscarMunicipio(e: React.FormEvent) {
    e.preventDefault();
    setMunicipioSelecionado(null);
    setErroBusca(null);
    
    if (!mapData?.dados) return;
    
    // Se temos o município selecionado no dropdown, usamos ele diretamente
    if (estadoSelecionado && municipioSelecionadoDropdown) {
      const municipioEncontrado = mapData.dados.features.find((feature: Feature) => 
        (feature.properties?.nome_municipio === municipioSelecionadoDropdown || 
         feature.properties?.municipio === municipioSelecionadoDropdown) && 
        feature.properties?.name_state === estadoSelecionado
      );
      
      if (municipioEncontrado) {
        // Mescla propriedades de produtos (ex: valor_vaat_formato)
        let municipioFinal = municipioEncontrado;
        if (mapData?.produtos?.features) {
          const prodMatch = mapData.produtos.features.find((f: Feature) => {
            const nome = f.properties?.nome_municipio || f.properties?.municipio;
            const uf = f.properties?.name_state;
            return nome === (municipioEncontrado.properties?.nome_municipio || municipioEncontrado.properties?.municipio) && uf === municipioEncontrado.properties?.name_state;
          });
          if (prodMatch) {
            municipioFinal = {
              ...municipioEncontrado,
              properties: {
                ...municipioEncontrado.properties,
                ...prodMatch.properties,
              },
            } as Feature;
          }
        }
        setMunicipioSelecionado(municipioFinal);
        // Scroll para os dados no mobile
        setTimeout(() => {
          if (window.innerWidth < 768 && dadosRef.current) {
            dadosRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 200);
      } else {
        setErroBusca(`Município "${municipioSelecionadoDropdown}" não encontrado no estado "${estadoSelecionado}".`);
      }
      return;
    }
    
    // Caso contrário, usamos a busca por texto
    const municipioBuscaNorm = removerAcentos(municipio.toLowerCase());
    const estadoBuscaNorm = removerAcentos(estado.toLowerCase());
    
    const municipioEncontrado = mapData.dados.features.find((feature: Feature) => {
      const nomeMunicipio = feature.properties?.nome_municipio || feature.properties?.municipio || "";
      const nomeEstado = feature.properties?.name_state || "";
      
      return (
        removerAcentos(nomeMunicipio.toLowerCase()).includes(municipioBuscaNorm) &&
        removerAcentos(nomeEstado.toLowerCase()).includes(estadoBuscaNorm)
      );
    });
    
    if (municipioEncontrado) {
      let municipioFinal = municipioEncontrado;
      if (mapData?.produtos?.features) {
        const prodMatch = mapData.produtos.features.find((f: Feature) => {
          const nome = f.properties?.nome_municipio || f.properties?.municipio;
          const uf = f.properties?.name_state;
          return nome === (municipioEncontrado.properties?.nome_municipio || municipioEncontrado.properties?.municipio) && uf === municipioEncontrado.properties?.name_state;
        });
        if (prodMatch) {
          municipioFinal = {
            ...municipioEncontrado,
            properties: {
              ...municipioEncontrado.properties,
              ...prodMatch.properties,
            },
          } as Feature;
        }
      }
      setMunicipioSelecionado(municipioFinal);
    } else {
      setErroBusca(`Município "${municipio}" não encontrado no estado "${estado}".`);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white">
      {/* Navbar componentizado - apenas com logo e título */}
      <Navbar />
      
      {/* Área de busca e título */}
      <div className="w-full py-3">
        <div className="w-full max-w-[1400px] mx-auto px-4">
          <div className="w-full md:max-w-[1200px] mx-auto">
            {/* Buscador de município/estado - alinhado com a logo */}
            <section className="w-full flex flex-col z-10 mb-1 md:mb-0 pl-0">
              <form
                className="flex flex-col md:flex-row gap-3"
                onSubmit={handleBuscarMunicipio}
              >
              {/* Dropdown de estados */}
              <select
                className="rounded-md bg-[#1e293b] text-white placeholder-slate-400 border border-slate-600 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 w-full md:w-48"
                value={estadoSelecionado}
                onChange={(e) => setEstadoSelecionado(e.target.value)}
                required
              >
                <option value="">Selecione o estado</option>
                {estados.map((estado) => (
                  <option key={estado} value={estado}>
                    {estado}
                  </option>
                ))}
              </select>
              
              {/* Dropdown de municípios */}
              <select
                className="rounded-md bg-[#1e293b] text-white placeholder-slate-400 border border-slate-600 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 w-full md:w-56"
                value={municipioSelecionadoDropdown}
                onChange={(e) => setMunicipioSelecionadoDropdown(e.target.value)}
                required
                disabled={!estadoSelecionado}
              >
                <option value="">Selecione o município</option>
                {municipios.map((municipio) => (
                  <option key={municipio} value={municipio}>
                    {municipio}
                  </option>
                ))}
              </select>
              
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                <button
                  className="w-full md:w-auto bg-sky-600 hover:bg-sky-700 text-white font-semibold py-1.5 px-4 rounded-md flex items-center justify-center md:justify-start gap-2 transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-[#0f172a]"
                  type="submit"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                  </svg>
                  <span>Buscar</span>
                </button>

                {/* Botão de Exportar - novo componente */}
                <ExportMenu
                  city={municipioSelecionado ? {
                    municipio: municipioSelecionado.properties?.nome_municipio || municipioSelecionado.properties?.municipio,
                    nome: municipioSelecionado.properties?.nome_municipio || municipioSelecionado.properties?.municipio,
                    name_state: municipioSelecionado.properties?.name_state,
                    VALOR_PD: municipioSelecionado.properties?.VALOR_PD,
                    VALOR_CTM: municipioSelecionado.properties?.VALOR_CTM,
                    VALOR_PMSB: municipioSelecionado.properties?.VALOR_PMSB
                  } : null}
                  onOpenAdvanced={() => setAdvancedModalOpen(true)}
                  className="w-full md:w-auto border border-slate-600 text-white bg-transparent hover:bg-slate-800/30 font-semibold py-1.5 px-4 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-[#0f172a]"
                />

                {/* Botão de Limpar Seleção */}
                <button
                  type="button"
                  onClick={() => {
                    setEstadoSelecionado('');
                    setMunicipioSelecionadoDropdown('');
                    setMunicipioSelecionado(null);
                    setErroBusca(null);
                  }}
                  className="w-full md:w-auto border border-slate-600 text-white bg-transparent hover:bg-red-900/30 font-semibold py-1.5 px-4 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 focus:ring-offset-[#0f172a] flex items-center justify-center gap-2"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Limpar
                </button>
              </div>
            </form>

            {erroBusca && <span className="text-red-400 mt-1 text-sm">{erroBusca}</span>}
          </section>
        </div>
        </div>
      </div>

      {/* Divisor visual */}
      <div className="mx-auto border-t border-slate-700 opacity-50 my-0.5 w-full"></div>

      {/* Barra de progresso - com margens adequadas */}
      {loading && <div className="mt-4 px-2">
        <LoadingProgressBar progress={loadingProgress} />
      </div>}

      {/* Título centralizado (visível apenas durante o carregamento) */}
      {loading && (
        <div className="flex justify-center mt-8 mb-6">
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-300">Informações e Mapa Interativo</h2>
            <p className="text-xs text-slate-300 mt-1">Visualização detalhada do município</p>
          </div>
        </div>
      )}

      {/* Conteúdo principal com visualização lado a lado */}
      <main className="flex-1 w-full flex flex-col items-center justify-center gap-1 p-0.5 md:p-0.5">
        <div className="w-full max-w-[1400px] mx-auto px-4" ref={dadosRef}>
          {/* Dashboard com informações administrativas */}
          {municipioSelecionado ? (
            <>
              {/* Grid para organizar os containers lado a lado */}
              <div className="grid grid-cols-1 md:grid-cols-[55fr_45fr] auto-rows-auto gap-1.5 md:max-w-[1200px] mx-auto">
                {/* Container 1: Município e Gestão (linha 1, coluna 1) */}
                <div className="bg-[#1e293b] rounded-lg shadow-lg p-0.5 border border-slate-600 animate-fade-in md:col-start-1 md:row-start-1">
                  <div className="bg-[#0f172a] rounded-lg p-2 flex flex-col transition-all duration-300 hover:bg-[#111a2d] hover:shadow-lg border border-slate-700 relative overflow-hidden max-h-[320px] h-full">
                    {/* Efeito de brilho no canto superior */}
                    <div className="absolute -top-10 -right-10 w-20 h-20 bg-blue-500/10 rounded-full blur-xl"></div>
                    
                    <div className="flex flex-row items-center justify-center mb-3 gap-3">
                      <div className="w-10 h-10 rounded-full bg-blue-900/50 flex items-center justify-center shadow-lg">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-400" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h2v2H7V5zm2 4H7v2h2V9zm2-4h2v2h-2V5zm2 4h-2v2h2V9z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <h3 className="text-base text-sky-300 font-bold tracking-wide">Município e Gestão</h3>
                    </div>
                    
                    {/* Informações em duas colunas com ícones */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 flex-1">
                      {/* Coluna esquerda - Gestão */}
                      <div className="bg-slate-800/30 rounded-lg p-3 backdrop-blur-sm">
                        <div className="text-xs text-sky-400 uppercase tracking-wider mb-2 font-semibold text-center">
                          {municipioSelecionado && municipioSelecionado.properties?.nome_municipio && municipioSelecionado.properties?.name_state
                            ? `${municipioSelecionado.properties.nome_municipio} - ${municipioSelecionado.properties.name_state}`
                            : 'Município - UF'}
                        </div>
                        
                        <div className="space-y-3">
                          {/* Prefeito + Mandato */}
                          <div className="flex flex-col">
                            <div className="flex items-center mb-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-400 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm text-gray-400">
                                Prefeito
                                {municipioSelecionado.properties?.mandato ? ` - ${municipioSelecionado.properties.mandato}` : ''}
                              </span>
                            </div>
                            <span className="text-base text-white font-bold pl-5.5">
                              {municipioSelecionado.properties?.nome2024 || "N/A"}
                            </span>
                          </div>
                          
                          {/* Partido */}
                          <div className="flex flex-col">
                            <div className="flex items-center mb-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-400 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M2 5a2 2 0 012-2h8a2 2 0 012 2v10a2 2 0 002 2H4a2 2 0 01-2-2V5z" />
                              </svg>
                              <span className="text-sm text-gray-400">Partido</span>
                            </div>
                            <div className="flex items-center pl-5.5">
                              <span className="text-sm text-white font-semibold">
                                {municipioSelecionado.properties?.sigla_partido2024 || "N/A"}
                              </span>
                            </div>
                          </div>
                          
                          {/* Mandato removido conforme design */}
                        </div>
                      </div>
                      
                      {/* Coluna direita - Demografia */}
                      <div className="bg-slate-800/30 rounded-lg p-3 backdrop-blur-sm">
                        <div className="text-xs text-emerald-400 uppercase tracking-wider mb-2 font-semibold text-center">Demografia</div>
                        
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3">
                          {/* População */}
                          <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-full mb-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                              </svg>
                              <span className="text-sm text-gray-400">População</span>
                            </div>
                            <div className="flex items-center justify-center">
                              <span className="text-sm text-white font-semibold">
                                {municipioSelecionado.properties?.POPULACAO_FORMAT || "N/A"}
                              </span>
                            </div>
                          </div>
                          
                          {/* Domicílios */}
                          <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-full mb-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                              </svg>
                              <span className="text-sm text-gray-400">Domicílios</span>
                            </div>
                            <div className="flex items-center justify-center">
                              <span className="text-sm text-white font-semibold">
                                {municipioSelecionado.properties?.DOMICILIO_FORMAT || "N/A"}
                              </span>
                            </div>
                          </div>
                        </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                {/* Container 2: Produtos Municipais (ocupa toda a coluna direita) */}
                <div className="bg-[#1e293b] rounded-lg shadow-lg p-0.5 border border-slate-600 animate-fade-in md:col-start-2 md:row-span-2 w-full">
                  <div className="bg-[#0f172a] rounded-lg p-0 sm:p-2 flex flex-col transition-all duration-300 hover:bg-[#111a2d] hover:shadow-lg border border-slate-700 relative overflow-hidden h-full">
                    {/* Efeito de brilho no canto superior */}
                    <div className="absolute -top-10 -right-10 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl"></div>
                    
                    {/* Container com largura total */}
                    <div className="flex flex-col w-full px-0">
                      <div className="w-full overflow-y-auto px-0">
                      <InformacoesMunicipio municipioSelecionado={municipioSelecionado} />
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* Container 3: Mapa interativo (abaixo do painel de município) */}
                <div className="h-[50vh] rounded-lg overflow-hidden shadow-lg bg-[#0f172a] border border-slate-600 animate-fade-in md:col-start-1 md:row-start-2">
              {loading ? (
                <div className="flex flex-col items-center justify-center w-full h-full p-4">
                  <Image 
                    src="/map-icon.svg" 
                    alt="Mapa" 
                    width={80} 
                    height={80} 
                    className="animate-pulse mb-3" 
                  />
                  <p className="text-sky-400 text-sm font-medium">Carregando mapa...</p>
                </div>
              ) : (
                <MapaMunicipal
                  municipioSelecionado={municipioSelecionado}
                />
              )}
            </div>
                  </div>
                </>
          ) : loading ? (
            // Tela de carregamento
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              {/* Painel de mapa carregando */}
              <div className="bg-[#1e293b] rounded-lg shadow-lg p-0.5 border border-slate-600 h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <Image 
                    src="/map-icon.svg" 
                    alt="Mapa" 
                    width={64} 
                    height={64} 
                    className="animate-pulse mb-3" 
                  />
                  <p className="text-sky-400 text-sm font-medium">Carregando mapa...</p>
                </div>
              </div>
              
              {/* Painel de dados carregando */}
              <div className="bg-[#1e293b] rounded-lg shadow-lg p-0.5 border border-slate-600 h-[400px] flex items-center justify-center">
                <div className="flex flex-col items-center">
                  <Image 
                    src="/database-icon.svg" 
                    alt="Dados" 
                    width={64} 
                    height={64} 
                    className="animate-pulse mb-3" 
                  />
                  <p className="text-sky-400 text-sm font-medium">Carregando dados...</p>
                </div>
              </div>
            </div>
          ) : (
            // Tela inicial quando não há município selecionado
            <div className="flex flex-col items-center justify-center py-8">
              <div className="text-center mb-6">
                <h2 className="text-xl font-bold text-gray-300 mb-2">Bem-vindo à Plataforma Nexus</h2>
                <p className="text-slate-400 max-w-lg mx-auto">
                  Selecione um estado e município acima para visualizar informações detalhadas.
                </p>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Rodapé customizado */}
      <MiniFooter />

      {/* Botão para voltar ao topo (visível apenas em mobile) */}
      <ScrollToTopButton />

      {/* Modal de exportação avançada */}
      <ExportAdvancedModal
        isOpen={advancedModalOpen}
        onClose={() => setAdvancedModalOpen(false)}
        mapData={mapData}
      />
    </div>
  );
}

export default function MapaPage() {
  return (
    <MapDataProvider>
      <MapaPageContent />
    </MapDataProvider>
  );
} 