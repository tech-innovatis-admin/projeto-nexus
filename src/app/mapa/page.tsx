"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useCallback } from "react";
import type { Feature, FeatureCollection } from "geojson";
import "leaflet/dist/leaflet.css";
import Image from "next/image";
import InformacoesMunicipio from "../../components/InformacoesMunicipio";
import { MapDataProvider, useMapData } from "../../contexts/MapDataContext";

// Importação dinâmica do mapa para evitar problemas de SSR
const MapaMunicipal = dynamic(() => import("../../components/MapaMunicipal"), { ssr: false });

// Componente de barra de progresso
function LoadingProgressBar({ progress }: { progress: number }) {
  return (
    <div className="w-full max-w-3xl mx-auto mb-2">
      <div className="w-full bg-gray-700 h-1 rounded-full overflow-hidden">
        <div 
          className="bg-sky-500 h-full rounded-full transition-all duration-300 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>
      <div className="flex justify-between text-xs text-slate-400 mt-0.5">
        <span>Carregando dados...</span>
        <span>{progress}%</span>
      </div>
    </div>
  );
}

// Componente principal que usa o contexto
function MapaPageContent() {
  const { municipioSelecionado, setMunicipioSelecionado, loading, loadingProgress } = useMapData();
  const [municipio, setMunicipio] = useState<string>("");
  const [estado, setEstado] = useState<string>("");
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  const [estados, setEstados] = useState<string[]>([]);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [estadoSelecionado, setEstadoSelecionado] = useState<string>("");
  const [municipioSelecionadoDropdown, setMunicipioSelecionadoDropdown] = useState<string>("");
  
  const [geojsonMunicipios, setGeojsonMunicipios] = useState<FeatureCollection | null>(null);
  const [loadingGeojson, setLoadingGeojson] = useState(false);

  // Carrega o GeoJSON dos municípios uma vez
  useEffect(() => {
    async function fetchGeojson() {
      try {
        setLoadingGeojson(true);
        const response = await fetch('/api/geojson');
        if (!response.ok) {
          throw new Error('Falha ao carregar dados do mapa');
        }
        const data = await response.json();
        setGeojsonMunicipios(data);
        
        // Extrair estados únicos do GeoJSON
        if (data && data.features) {
          const estadosUnicos = [...new Set(data.features
            .map((feature: any) => feature.properties?.name_state)
            .filter(Boolean)
            .sort()
          )];
          setEstados(estadosUnicos as string[]);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do mapa:', error);
      } finally {
        setLoadingGeojson(false);
      }
    }
    
    fetchGeojson();
  }, []);
  
  // Atualizar municípios quando um estado for selecionado
  useEffect(() => {
    if (!estadoSelecionado || !geojsonMunicipios) {
      setMunicipios([]);
      return;
    }
    
    const municipiosDoEstado = geojsonMunicipios.features
      .filter(feature => feature.properties?.name_state === estadoSelecionado)
      .map(feature => feature.properties?.nome_municipio || feature.properties?.municipio)
      .filter(Boolean)
      .sort();
    
    setMunicipios([...new Set(municipiosDoEstado)]);
  }, [estadoSelecionado, geojsonMunicipios]);
  
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
    
    if (!geojsonMunicipios) return;
    
    // Se temos o município selecionado no dropdown, usamos ele diretamente
    if (estadoSelecionado && municipioSelecionadoDropdown) {
      const municipioEncontrado = geojsonMunicipios.features.find(feature => 
        (feature.properties?.nome_municipio === municipioSelecionadoDropdown || 
         feature.properties?.municipio === municipioSelecionadoDropdown) && 
        feature.properties?.name_state === estadoSelecionado
      );
      
      if (municipioEncontrado) {
        setMunicipioSelecionado(municipioEncontrado);
      } else {
        setErroBusca(`Município "${municipioSelecionadoDropdown}" não encontrado no estado "${estadoSelecionado}".`);
      }
      return;
    }
    
    // Caso contrário, usamos a busca por texto
    const municipioBuscaNorm = removerAcentos(municipio.toLowerCase());
    const estadoBuscaNorm = removerAcentos(estado.toLowerCase());
    
    const municipioEncontrado = geojsonMunicipios.features.find(feature => {
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
        <div className="w-full max-w-7xl mx-auto grid grid-cols-3 items-center">
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
            <h1 className="text-white text-xl font-bold tracking-wide">Nexus - Plataforma de Produtos</h1>
          </div>
          {/* Texto centralizado */}
          <div className="flex justify-center">
            <span className="text-xs text-slate-300">Powered by Data Science Team - Innovatis MC</span>
          </div>
          {/* Espaço vazio à direita para equilíbrio */}
          <div></div>
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
              
              <button
                className="bg-gray-600 hover:bg-gray-700 text-white font-semibold py-1.5 px-4 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 focus:ring-offset-[#0f172a]"
                type="submit"
              >
                Buscar
              </button>
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

      {/* Barra de progresso - com margem superior para posicioná-la mais abaixo */}
      {loading && <div className="mt-4">{/* Adicionado espaço acima da barra */}
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
        <div className="w-full max-w-7xl">
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
                    <h2 className="text-base font-bold text-gray-300 text-center">Produtos Innovatis</h2>
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