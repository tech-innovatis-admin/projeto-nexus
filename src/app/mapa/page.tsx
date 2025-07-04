"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef } from "react";
import type { Feature, FeatureCollection } from "geojson";
import "leaflet/dist/leaflet.css";
import Image from "next/image";
import InformacoesMunicipio from "../../components/InformacoesMunicipio";
import { MapDataProvider, useMapData } from "../../contexts/MapDataContext";
import ExportPDFButton from "@/components/ExportPDFButton";
import ScrollToTopButton from "@/components/ScrollToTopButton";

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
        setMunicipioSelecionado(municipioEncontrado);
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
      setMunicipioSelecionado(municipioEncontrado);
    } else {
      setErroBusca(`Município "${municipio}" não encontrado no estado "${estado}".`);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white overflow-hidden">
      {/* Cabeçalho */}
      <header className="w-full py-2 px-6 bg-[#1e293b] text-white shadow-md">
        <div className="w-full max-w-7xl mx-auto flex flex-col md:grid md:grid-cols-3 items-center gap-2 md:gap-0">
          {/* Logo e nome no canto esquerdo */}
          <div className="flex items-center gap-4 justify-self-start">
            <div className="text-gray-400">
              <Image
                src="/logo_innovatis.svg"
                alt="Logo Innovatis"
                width={40}
                height={40}
                className="object-contain [&>path]:fill-current [&>g]:fill-current"
                priority
              />
            </div>
            <h1 className="text-white text-lg md:text-xl font-bold tracking-wide">Nexus - Plataforma de Produtos</h1>
          </div>
          {/* Texto centralizado */}
          <div className="flex justify-center mt-1 md:mt-0">
            <span className="text-xs text-slate-300 text-center">Powered by Data Science Team - Innovatis MC</span>
          </div>
          {/* Espaço vazio à direita para equilíbrio */}
          <div className="hidden md:block"></div>
        </div>
      </header>

      {/* Área de busca e título */}
      <div className="w-full px-4 py-0.5">
        <div className="w-full max-w-7xl mx-auto flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Buscador de município/estado - sempre à esquerda */}
          <section className="w-full md:w-auto flex flex-col z-10 mb-1 md:mb-0">
            <form
              className="flex flex-col md:flex-row gap-3 w-full"
              onSubmit={handleBuscarMunicipio}
            >
              {/* Dropdown de estados */}
              <select
                className="flex-1 rounded-md bg-[#1e293b] text-white placeholder-slate-400 border border-slate-600 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
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
                className="flex-1 rounded-md bg-[#1e293b] text-white placeholder-slate-400 border border-slate-600 px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:border-gray-500"
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
                  className="w-full md:w-auto bg-gray-600 hover:bg-gray-700 text-white font-semibold py-1.5 px-4 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#0f172a]"
                  type="submit"
                >
                  Buscar
                </button>
                
                {/* Botão de Exportar PDF - sempre visível */}
                <ExportPDFButton 
                  city={municipioSelecionado ? {
                    municipio: municipioSelecionado.properties?.nome_municipio || municipioSelecionado.properties?.municipio,
                    nome: municipioSelecionado.properties?.nome_municipio || municipioSelecionado.properties?.municipio,
                    name_state: municipioSelecionado.properties?.name_state,
                    VALOR_PD: municipioSelecionado.properties?.VALOR_PD,
                    VALOR_CTM: municipioSelecionado.properties?.VALOR_CTM,
                    VALOR_PMSB: municipioSelecionado.properties?.VALOR_PMSB
                  } : null}
                />
              </div>
            </form>

            {erroBusca && <span className="text-red-400 mt-1 text-sm">{erroBusca}</span>}
          </section>
          
          {/* Título à direita (visível apenas quando não estiver carregando) */}
          {!loading && (
            <div className="text-center md:text-right mt-2 mb-1">
              <h2 className="text-lg font-bold text-gray-300">Dados Municipais</h2>
            </div>
          )}
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
        <div className="flex justify-center mt-4 mb-3">
          <div className="text-center">
            <h2 className="text-lg font-bold text-gray-300">Informações e Mapa Interativo</h2>
            <p className="text-xs text-slate-300 mt-1">Visualização detalhada do município</p>
          </div>
        </div>
      )}

      {/* Conteúdo principal com visualização lado a lado */}
      <main className="flex-1 w-full flex flex-col items-center justify-center gap-1 p-0.5 md:p-0.5">
        <div className="w-full max-w-7xl" ref={dadosRef}>
          {/* Dashboard com informações administrativas */}
          {municipioSelecionado && (
            <div className="w-full bg-[#1e293b] rounded-lg shadow-lg p-0.5 mb-0.5 border border-slate-600 animate-fade-in">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-1">
                {/* Coluna 1: Informações básicas */}
                <div className="bg-[#0f172a] rounded p-2 flex flex-col transition-all duration-300 hover:bg-[#111a2d] hover:shadow-md hover:border-gray-800 border border-transparent cursor-pointer">
                  <div className="flex items-center mb-1">
                    <div className="w-6 h-6 rounded-full bg-[#0f172a] flex items-center justify-center mr-2">
                      <Image 
                        src="/municipio-icon.svg" 
                        alt="Município" 
                        width={18} 
                        height={18} 
                        className="text-sky-500" 
                      />
                    </div>
                    <span className="text-sm text-gray-400 font-semibold">Informações Municipais</span>
                  </div>
                  <div className="flex items-center mt-0.5 group">
                    <span className="text-xs text-gray-300 mr-1 group-hover:text-gray-400 transition-colors">Município:</span>
                    <span className="text-white font-bold">{municipioSelecionado.properties?.nome_municipio || municipioSelecionado.properties?.municipio || "N/A"}</span>
                  </div>
                  <div className="flex items-center mt-0.5 group">
                    <span className="text-xs text-gray-300 mr-1 group-hover:text-gray-400 transition-colors">Estado:</span>
                    <span className="text-white font-bold">{municipioSelecionado.properties?.name_state || "N/A"}</span>
                  </div>
                  <div className="flex items-center mt-0.5 group">
                    <span className="text-xs text-gray-300 mr-1 group-hover:text-gray-400 transition-colors">População:</span>
                    <span className="text-white font-bold">{municipioSelecionado.properties?.POPULACAO_FORMAT || "N/A"}</span>
                  </div>
                  <div className="flex items-center mt-0.5 group">
                    <span className="text-xs text-gray-300 mr-1 group-hover:text-gray-400 transition-colors">Domicílios:</span>
                    <span className="text-white font-bold">{municipioSelecionado.properties?.DOMICILIO_FORMAT || "N/A"}</span>
                  </div>
                </div>
                
                {/* Coluna 2: Informações políticas */}
                <div className="bg-[#0f172a] rounded p-2 flex flex-col transition-all duration-300 hover:bg-[#111a2d] hover:shadow-md hover:border-gray-800 border border-transparent cursor-pointer">
                  <div className="flex items-center mb-1">
                    <div className="w-6 h-6 rounded-full bg-[#0f172a] flex items-center justify-center mr-2">
                      <Image 
                        src="/gestao-icon.svg" 
                        alt="Gestão" 
                        width={18} 
                        height={18} 
                        className="text-sky-500" 
                      />
                    </div>
                    <span className="text-sm text-gray-400 font-semibold">Gestão</span>
                  </div>
                  <div className="flex items-center mt-1 group">
                    <span className="text-xs text-gray-300 mr-1 group-hover:text-gray-400 transition-colors">Prefeito:</span>
                    <span className="text-white font-bold">{municipioSelecionado.properties?.nome2024 || "N/A"}</span>
                  </div>
                  <div className="flex items-center mt-1 group">
                    <span className="text-xs text-gray-300 mr-1 group-hover:text-gray-400 transition-colors">Partido 2024:</span>
                    <span className="text-white font-bold">{municipioSelecionado.properties?.sigla_partido2024 || "N/A"}</span>
                  </div>
                  <div className="flex items-center mt-1 group">
                    <span className="text-xs text-gray-300 mr-1 group-hover:text-gray-400 transition-colors">Mandato:</span>
                    <span className="text-white font-bold">{(municipioSelecionado.properties?.mandato || "N/A").replace("º mandato", "º")}</span>
                  </div>
                </div>
                
                {/* Coluna 3: Plano Diretor e REURB */}
                <div className="bg-[#0f172a] rounded p-2 flex flex-col transition-all duration-300 hover:bg-[#111a2d] hover:shadow-md hover:border-gray-800 border border-transparent cursor-pointer">
                  <div className="flex items-center mb-1">
                    <div className="w-6 h-6 rounded-full bg-[#0f172a] flex items-center justify-center mr-2">
                      <Image 
                        src="/planos-icon.svg" 
                        alt="Planos" 
                        width={18} 
                        height={18} 
                        className="text-sky-500" 
                      />
                    </div>
                    <span className="text-sm text-gray-400 font-semibold">Planos e Regulamentos</span>
                  </div>
                  <div className="flex items-center mt-1 group">
                    <span className="text-xs text-gray-300 mr-1 group-hover:text-gray-400 transition-colors">Plano Diretor:</span>
                    <span className="text-white font-bold">{municipioSelecionado.properties?.PD_ALTERADA || "N/A"}</span>
                  </div>
                  
                  {municipioSelecionado.properties?.PD_ANO && municipioSelecionado.properties.PD_ANO !== "0" && (
                    <div className="flex items-center mt-1 group">
                      <span className="text-xs text-gray-300 mr-1 group-hover:text-gray-400 transition-colors">Ano do Plano Diretor:</span>
                      <span className="text-white font-bold">{municipioSelecionado.properties.PD_ANO}</span>
                    </div>
                  )}
                  
                  <div className="flex items-center mt-1 group">
                    <span className="text-xs text-gray-300 mr-1 group-hover:text-gray-400 transition-colors">Plano Diretor Vencido:</span>
                    <span className="text-white font-bold">{municipioSelecionado.properties?.pd_venci || "N/A"}</span>
                  </div>
                  
                  <div className="flex items-center mt-1 group">
                    <span className="text-xs text-gray-300 mr-1 group-hover:text-gray-400 transition-colors">Lei do REURB:</span>
                    <span className="text-white font-bold">{municipioSelecionado.properties?.reurb_exist || "N/A"}</span>
                  </div>
                  
                  {municipioSelecionado.properties?.REURB_ANO && municipioSelecionado.properties.REURB_ANO !== "0" && (
                    <div className="flex items-center mt-1 group">
                      <span className="text-xs text-gray-300 mr-1 group-hover:text-gray-400 transition-colors">Ano da Lei REURB:</span>
                      <span className="text-white font-bold">{municipioSelecionado.properties.REURB_ANO}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {/* Contêineres principais */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-1.5">
            {/* Mapa interativo */}
            <div className="h-[45vh] lg:h-[45vh] rounded-lg overflow-hidden shadow-lg bg-[#0f172a] border border-slate-600 animate-fade-in">
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
            
            {/* Painel de informações, agora com fundo escuro para combinar com o dashboard */}
            <div className="bg-[#1e293b] rounded-lg shadow-lg p-0 animate-fade-in text-white h-auto lg:h-[45vh] flex flex-col overflow-hidden border border-slate-600">
              {loading ? (
                <div className="flex flex-col items-center justify-center w-full h-full p-4">
                  <Image 
                    src="/database-icon.svg" 
                    alt="Banco de dados" 
                    width={80} 
                    height={80} 
                    className="animate-pulse mb-3" 
                  />
                  <p className="text-sky-400 text-sm font-medium">Carregando dados...</p>
                </div>
              ) : (
                <>
                  {/* Título fixo */}
                  <div className="sticky top-0 left-0 right-0 bg-[#1e293b] py-1 px-4 z-30 border-b border-slate-700 shadow-sm">
                    <h2 className="text-base font-bold text-gray-300 text-center">Produtos Municipais</h2>
                  </div>
                  
                  {/* Conteúdo rolável */}
                  <div className="flex-1 overflow-y-auto p-2 pt-1.5">
                    <InformacoesMunicipio municipioSelecionado={municipioSelecionado} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </main>

      {/* Rodapé */}
      <footer className="w-full py-0.25 text-center text-xs text-slate-400 opacity-70">
        &copy; {new Date().getFullYear()} Innovatis MC. Todos os direitos reservados.
      </footer>

      {/* Botão para voltar ao topo (visível apenas em mobile) */}
      <ScrollToTopButton />
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