"use client";
import dynamic from "next/dynamic";
import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { createPortal } from "react-dom";
import type { Feature, FeatureCollection } from "geojson";
import "leaflet/dist/leaflet.css";
import Image from "next/image";
import InformacoesMunicipio from "../../components/InformacoesMunicipio";
import { useMapData } from "../../contexts/MapDataContext";
import { useUser } from "../../contexts/UserContext";
import ScrollToTopButton from "@/components/ScrollToTopButton";
import MiniFooter from "@/components/MiniFooter";
import Navbar from "@/components/Navbar";
import Sidebar from "@/components/Sidebar";
import ExportMenu from "@/components/ExportMenu";
import ExportAdvancedModal from "@/components/ExportAdvancedModal";

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

// Componente de tooltip com portal
interface PortalTooltipProps {
  isVisible: boolean;
  anchorRef: React.RefObject<HTMLElement | null>;
  children: React.ReactNode;
}

function PortalTooltip({ isVisible, anchorRef, children }: PortalTooltipProps) {
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (isVisible && anchorRef.current) {
      const updatePosition = () => {
        const rect = anchorRef.current!.getBoundingClientRect();
        const scrollY = window.scrollY;
        const scrollX = window.scrollX;
        
        // Largura estimada do tooltip (320px = max-w-80)
        const tooltipMaxWidth = 280;
        const screenWidth = window.innerWidth;
        const spaceOnRight = screenWidth - rect.right;
        const spaceOnLeft = rect.left;
        
        // Verifica se há espaço suficiente à direita (incluindo margem de segurança)
        const shouldShowOnLeft = spaceOnRight < (tooltipMaxWidth + 20);
        
        let left: number;
        if (shouldShowOnLeft && spaceOnLeft > tooltipMaxWidth) {
          // Posiciona à esquerda do ícone
          left = rect.left + scrollX - tooltipMaxWidth - 8;
        } else {
          // Posiciona à direita do ícone (comportamento padrão)
          left = rect.right + scrollX + 8;
        }
        
        setPosition({
          top: rect.top + scrollY + rect.height / 2 - 10, // Centraliza verticalmente
          left: left
        });
      };

      updatePosition();
      window.addEventListener('scroll', updatePosition);
      window.addEventListener('resize', updatePosition);

      return () => {
        window.removeEventListener('scroll', updatePosition);
        window.removeEventListener('resize', updatePosition);
      };
    }
  }, [isVisible, anchorRef]);

  if (!mounted || !isVisible) return null;

  return createPortal(
    <div
      className="absolute z-[9999] w-max max-w-80 bg-slate-900/95 text-white text-xs rounded-md border border-slate-700 shadow-xl p-3 pointer-events-none"
      style={{
        top: position.top,
        left: position.left,
      }}
    >
      {children}
    </div>,
    document.body
  );
}

// Função helper para formatar informações do usuário nos logs
function formatUserInfo(user: any): string {
  if (!user) return "Usuário não identificado";
  const name = user.name || user.username || `ID:${user.id}`;
  return `${name}${user.role ? ` (${user.role})` : ''}`;
}

// Componente principal que usa o contexto
function MapaPageContent() {
  const { user } = useUser();
  const { municipioSelecionado, setMunicipioSelecionado, loading, loadingProgress, mapData } = useMapData();
  const userInfo = formatUserInfo(user);

  // Função helper para logs de exportação
  const logExport = (action: string, fileName: string, method?: string) => {
    const methodInfo = method ? ` via ${method}` : '';
    console.log(`📤 [MapaPage] ${userInfo} - ${action}: "${fileName}"${methodInfo}`);
  };

  console.log(`🗺️ [MapaPage] ${userInfo} - Componente montado`);
  const [municipio, setMunicipio] = useState<string>("");
  const [estado, setEstado] = useState<string>("");
  const [erroBusca, setErroBusca] = useState<string | null>(null);
  const [estados, setEstados] = useState<string[]>([]);
  const [municipios, setMunicipios] = useState<string[]>([]);
  const [estadoSelecionado, setEstadoSelecionado] = useState<string>("");
  const [municipioSelecionadoDropdown, setMunicipioSelecionadoDropdown] = useState<string>("");
  const [advancedModalOpen, setAdvancedModalOpen] = useState<boolean>(false);
  const [tooltipVisible, setTooltipVisible] = useState<boolean>(false);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== 'undefined' ? window.innerWidth : 1024);
  const [estadosSubmenuOpen, setEstadosSubmenuOpen] = useState<boolean>(false);
  const [estadosExpanded, setEstadosExpanded] = useState<boolean>(false);
  const [municipiosSubmenuOpen, setMunicipiosSubmenuOpen] = useState<boolean>(false);
  const [selectValue, setSelectValue] = useState<string>("");
  const [estadoInputValue, setEstadoInputValue] = useState<string>("");
  const [municipioInputValue, setMunicipioInputValue] = useState<string>("");
  const [modoVendas, setModoVendas] = useState<boolean>(true);
  const dadosRef = useRef<HTMLDivElement>(null);
  const planeIconRef = useRef<HTMLDivElement>(null);
  const estadosDropdownRef = useRef<HTMLDivElement>(null);
  const municipiosDropdownRef = useRef<HTMLDivElement>(null);

  // Estados prioritários (Nordeste + Mato Grosso - abertura comercial)
  const estadosPrioritarios = [
    "Alagoas", "Bahia", "Ceará", "Maranhão", "Paraíba",
    "Pernambuco", "Piauí", "Rio Grande do Norte", "Sergipe", "Mato Grosso"
  ];

  // Estados filtrados baseado no input e estado do dropdown
  const estadosFiltrados = useMemo(() => {
    // PRIORIDADE 1: Se há texto digitado, SEMPRE filtrar por input (ignorar expansão)
    if (estadoInputValue.trim()) {
      return estados.filter(estado =>
        estado.toLowerCase().includes(estadoInputValue.toLowerCase())
      );
    }

    // PRIORIDADE 2: Sem texto digitado, respeitar a expansão
    return estadosExpanded ? estados : estadosPrioritarios;
  }, [estados, estadosPrioritarios, estadosExpanded, estadoInputValue]);

  // Municípios filtrados baseado no input
  const municipiosFiltrados = useMemo(() => {
    // Se há texto digitado, filtrar por input
    if (municipioInputValue.trim()) {
      return municipios.filter(municipio =>
        municipio.toLowerCase().includes(municipioInputValue.toLowerCase())
      );
    }
    // Sem texto, mostrar todos os municípios
    return municipios;
  }, [municipios, municipioInputValue]);

  // Atualizar largura da tela para responsividade
  useEffect(() => {
    const handleResize = () => setWindowWidth(window.innerWidth);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Constantes para calcular automaticamente as alturas dos containers - RESPONSIVAS
  const alturaMunicipioGestao = windowWidth < 768 ? 200 : 220; // px - menor em mobile
  const alturaMapa = windowWidth < 768 ? 40 : 45; // vh - menor em mobile
  const gapContainers = 1; // rem - reduzido

  // Altura total combinada dos containers da esquerda - mais responsiva
  const alturaTotalContainersEsquerda = `calc(${alturaMunicipioGestao}px + ${gapContainers}rem + ${alturaMapa}vh)`;
  
  // Fechar tooltip ao clicar fora ou pressionar ESC (melhor UX no mobile/desktop)
  useEffect(() => {
    const handleGlobalClick = (e: MouseEvent | TouchEvent) => {
      if (!tooltipVisible) return;
      const target = e.target as Node | null;
      if (planeIconRef.current && target && planeIconRef.current.contains(target)) return;
      setTooltipVisible(false);
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTooltipVisible(false);
    };
    document.addEventListener('mousedown', handleGlobalClick);
    document.addEventListener('touchstart', handleGlobalClick, { passive: true });
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleGlobalClick);
      document.removeEventListener('touchstart', handleGlobalClick as any);
      document.removeEventListener('keydown', handleKey);
    };
  }, [tooltipVisible]);

  // Fechar submenus ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (estadosDropdownRef.current && !estadosDropdownRef.current.contains(event.target as Node)) {
        setEstadosSubmenuOpen(false);
      }
      if (municipiosDropdownRef.current && !municipiosDropdownRef.current.contains(event.target as Node)) {
        setMunicipiosSubmenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  // Pistas de voo do município selecionado (match por code_muni)
  const pistasDoMunicipio = useMemo(() => {
    try {
      if (!mapData?.pistas || !municipioSelecionado?.properties) return [] as any[];

      const raw = (municipioSelecionado as any).properties?.code_muni;
      const codeMuni = String(raw ?? '').trim();
      const norm = (v: any) => String(v ?? '').replace(/\D+/g, '');
      const codeKey = norm(codeMuni);

      if (!codeKey) return [] as any[];

      const list = (mapData.pistas as any[]).filter((p: any) => norm(p['codigo']) === codeKey);

      console.log(`✈️ [MapaPage] ${userInfo} - Pistas para ${municipioSelecionado.properties?.nome_municipio}: ${list.length} encontradas`);
      if (list.length > 0) {
        console.log(`✈️ [MapaPage] ${userInfo} - Primeira pista: ${list[0]['nome_pista']} (${list[0]['codigo_pista']})`);
      }

      return list;
    } catch (e) {
      console.error(`❌ [MapaPage] ${userInfo} - Erro ao calcular pistas:`, e);
      return [] as any[];
    }
  }, [mapData, municipioSelecionado, userInfo]);

  // Frequência de códigos no CSV para depuração/uso futuro
  const frequenciaPistasPorCodigo = useMemo(() => {
    const freq: Record<string, number> = {};
    try {
      if (!Array.isArray(mapData?.pistas)) return freq;
      const norm = (v: any) => String(v ?? '').replace(/\D+/g, '');
      for (const p of mapData!.pistas as any[]) {
        const key = norm(p['codigo']);
        if (!key) continue;
        freq[key] = (freq[key] || 0) + 1;
      }
      if (typeof window !== 'undefined') {
        console.log('[Pistas] frequência por código (principais 5):', Object.entries(freq).slice(0, 5));
      }
    } catch (e) {
      console.warn('[Pistas] erro ao montar frequência:', e);
    }
    return freq;
  }, [mapData]);
  
  // Extrair estados únicos do GeoJSON quando os dados forem carregados
  useEffect(() => {
    if (mapData?.dados && mapData.dados.features) {
      const estadosUnicos = [...new Set(mapData.dados.features
        .map((feature: Feature) => feature.properties?.name_state)
        .filter(Boolean)
        .sort()
      )];
      console.log(`📊 [MapaPage] ${userInfo} - Estados carregados: ${estadosUnicos.length} estados encontrados`);
      setEstados(estadosUnicos as string[]);
    } else {
      console.log(`📊 [MapaPage] ${userInfo} - Aguardando dados do mapa...`);
    }
  }, [mapData, userInfo]);
  
  // Atualizar municípios quando um estado for selecionado
  useEffect(() => {
    if (!estadoSelecionado || !mapData?.dados) {
      setMunicipios([]);
      return;
    }

    console.log(`🏛️ [MapaPage] ${userInfo} - Estado selecionado: ${estadoSelecionado}`);

    const municipiosDoEstado = mapData.dados.features
      .filter((feature: Feature) => feature.properties?.name_state === estadoSelecionado)
      .map((feature: Feature) => feature.properties?.nome_municipio || feature.properties?.municipio)
      .filter(Boolean)
      .sort();

    console.log(`🏛️ [MapaPage] ${userInfo} - Municípios encontrados para ${estadoSelecionado}: ${municipiosDoEstado.length}`);
    setMunicipios([...new Set(municipiosDoEstado)] as string[]);
    
    // Limpar município selecionado quando trocar de estado
    setMunicipioSelecionadoDropdown('');
    console.log(`🧹 [MapaPage] ${userInfo} - Município limpo ao trocar estado`);
  }, [estadoSelecionado, mapData, userInfo]);
  
  // Atualizar os campos de texto quando as listas mudarem
  useEffect(() => {
    if (estadoSelecionado) {
      console.log(`📍 [MapaPage] ${userInfo} - Estado selecionado na lista: ${estadoSelecionado}`);
    }
    setEstado(estadoSelecionado);
    setSelectValue(estadoSelecionado);
    setEstadoInputValue(estadoSelecionado);
  }, [estadoSelecionado, userInfo]);

  useEffect(() => {
    if (municipioSelecionadoDropdown) {
      console.log(`🏛️ [MapaPage] ${userInfo} - Município selecionado na lista: ${municipioSelecionadoDropdown}`);
    }
    setMunicipio(municipioSelecionadoDropdown);
    setMunicipioInputValue(municipioSelecionadoDropdown);
  }, [municipioSelecionadoDropdown, userInfo]);

  // Busca automática APENAS quando município é selecionado no dropdown
  useEffect(() => {
    if (estadoSelecionado && municipioSelecionadoDropdown && mapData?.dados) {
      console.log(`🔍 [MapaPage] ${userInfo} - Busca automática iniciada para: ${municipioSelecionadoDropdown} - ${estadoSelecionado}`);

      // Simular o evento de submit para usar a lógica existente
      const mockEvent = {
        preventDefault: () => {},
      } as React.FormEvent;

      handleBuscarMunicipio(mockEvent);
    }
  }, [municipioSelecionadoDropdown, mapData, userInfo]); // Removido estadoSelecionado das dependências

  // Log quando um município é selecionado (por qualquer método)
  useEffect(() => {
    if (municipioSelecionado) {
      console.log(`🗺️ [MapaPage] ${userInfo} - Município selecionado: ${municipioSelecionado.properties?.nome_municipio || municipioSelecionado.properties?.municipio} - ${municipioSelecionado.properties?.name_state}`);
    } else {
      console.log(`🗺️ [MapaPage] ${userInfo} - Nenhum município selecionado`);
    }
  }, [municipioSelecionado, userInfo]);

  // Busca o município ao clicar em buscar
  function removerAcentos(str: string) {
    return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  }
  function handleBuscarMunicipio(e: React.FormEvent) {
    e.preventDefault();
    console.log(`🔍 [MapaPage] ${userInfo} - Iniciando busca de município...`);

    setMunicipioSelecionado(null);
    setErroBusca(null);

    if (!mapData?.dados) return;
    
    // Se temos o município selecionado no dropdown, usamos ele diretamente
    if (estadoSelecionado && municipioSelecionadoDropdown) {
      console.log(`🔍 [MapaPage] ${userInfo} - Busca por lista: ${municipioSelecionadoDropdown} - ${estadoSelecionado}`);

      const municipioEncontrado = mapData.dados.features.find((feature: Feature) =>
        (feature.properties?.nome_municipio === municipioSelecionadoDropdown ||
         feature.properties?.municipio === municipioSelecionadoDropdown) &&
        feature.properties?.name_state === estadoSelecionado
      );

      if (municipioEncontrado) {
        console.log(`✅ [MapaPage] ${userInfo} - Município encontrado: ${municipioEncontrado.properties?.nome_municipio || municipioEncontrado.properties?.municipio}`);

        // Mescla propriedades de produtos
        let municipioFinal = municipioEncontrado;
        if (mapData?.produtos?.features) {
          const prodMatch = mapData.produtos.features.find((f: Feature) => {
            const nome = f.properties?.nome_municipio || f.properties?.municipio;
            const uf = f.properties?.name_state;
            return nome === (municipioEncontrado.properties?.nome_municipio || municipioEncontrado.properties?.municipio) && uf === municipioEncontrado.properties?.name_state;
          });
          if (prodMatch) {
            console.log(`📦 [MapaPage] ${userInfo} - Dados de produtos mesclados`);
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
        console.log(`🗺️ [MapaPage] ${userInfo} - Município selecionado no mapa`);

        // Scroll para os dados no mobile
        setTimeout(() => {
          if (window.innerWidth < 768 && dadosRef.current) {
            dadosRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
          }
        }, 200);
      } else {
        console.error(`❌ [MapaPage] ${userInfo} - Município não encontrado: ${municipioSelecionadoDropdown} - ${estadoSelecionado}`);
        setErroBusca(`Município "${municipioSelecionadoDropdown}" não encontrado no estado "${estadoSelecionado}".`);
      }
      return;
    }
    
    // Caso contrário, usamos a busca por texto
    const municipioBuscaNorm = removerAcentos(municipio.toLowerCase());
    const estadoBuscaNorm = removerAcentos(estado.toLowerCase());

    console.log(`🔍 [MapaPage] ${userInfo} - Busca por texto: "${municipio}" em "${estado}"`);
    console.log(`🔍 [MapaPage] ${userInfo} - Termos normalizados: "${municipioBuscaNorm}" / "${estadoBuscaNorm}"`);

    const municipioEncontrado = mapData.dados.features.find((feature: Feature) => {
      const nomeMunicipio = feature.properties?.nome_municipio || feature.properties?.municipio || "";
      const nomeEstado = feature.properties?.name_state || "";

      return (
        removerAcentos(nomeMunicipio.toLowerCase()).includes(municipioBuscaNorm) &&
        removerAcentos(nomeEstado.toLowerCase()).includes(estadoBuscaNorm)
      );
    });

    if (municipioEncontrado) {
      console.log(`✅ [MapaPage] ${userInfo} - Município encontrado por texto: ${municipioEncontrado.properties?.nome_municipio || municipioEncontrado.properties?.municipio}`);

      let municipioFinal = municipioEncontrado;
      if (mapData?.produtos?.features) {
        const prodMatch = mapData.produtos.features.find((f: Feature) => {
          const nome = f.properties?.nome_municipio || f.properties?.municipio;
          const uf = f.properties?.name_state;
          return nome === (municipioEncontrado.properties?.nome_municipio || municipioEncontrado.properties?.municipio) && uf === municipioEncontrado.properties?.name_state;
        });
        if (prodMatch) {
          console.log(`📦 [MapaPage] ${userInfo} - Dados de produtos mesclados (busca por texto)`);
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
      console.log(`🗺️ [MapaPage] ${userInfo} - Município selecionado no mapa (busca por texto)`);
    } else {
      console.error(`❌ [MapaPage] ${userInfo} - Município não encontrado por texto: "${municipio}" em "${estado}"`);
      setErroBusca(`Município "${municipio}" não encontrado no estado "${estado}".`);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white">
      {/* Navbar componentizado - apenas com logo e título */}
      <Navbar />

      {/* sidebar */}
      <div className="flex flex-1">
        <Sidebar />
        {/* Conteúdo principal */}
        <div className="flex-1 flex flex-col overflow-hidden">
      
      {/* Área de busca e título */}
      <div className="w-full py-3 border-b border-slate-700/50">
        <div className="w-full max-w-[1400px] mx-auto px-4">
          <div className="w-full md:max-w-[1200px] mx-auto">
            {/* Buscador de município/estado - alinhado com a logo */}
            <section className="w-full flex flex-col z-10 mb-1 md:mb-0 pl-0">
              <form
                className="flex flex-col md:flex-row gap-3"
                onSubmit={handleBuscarMunicipio}
              >
              {/* Dropdown personalizado de estados */}
              <div className="relative w-full md:w-48" ref={estadosDropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={estadoInputValue}
                    onChange={(e) => {
                      setEstadoInputValue(e.target.value);
                      // Garantir que o dropdown fica aberto enquanto há digitação
                      setEstadosSubmenuOpen(true);
                      // Não modificar estadosExpanded automaticamente - deixar o usuário controlar
                    }}
                    onFocus={() => {
                      // Limpeza automática: ao clicar, apagar o conteúdo anterior
                      setEstadoInputValue("");
                      setEstadoSelecionado("");
                      setEstadosSubmenuOpen(true);
                      // Também limpar o município quando mudar de estado
                      setMunicipioInputValue("");
                      setMunicipioSelecionadoDropdown("");
                      console.log(`🧹 [MapaPage] ${userInfo} - Campo de Estado limpo automaticamente ao focar`);
                    }}
                    placeholder="Digite o estado..."
                    className="appearance-none w-full rounded-md bg-[#1e293b] text-white placeholder-slate-400 border border-slate-600 px-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-left"
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 text-slate-300 absolute right-2 top-1/2 -translate-y-1/2 transition-transform duration-200 pointer-events-none ${estadosSubmenuOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.061l-4.24 4.24a.75.75 0 01-1.06 0l-4.24-4.24a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>

                  {/* Submenu personalizado */}
                  {estadosSubmenuOpen && (
                    <div className="absolute top-full left-0 mt-1 w-full rounded-md shadow-lg bg-[#1e293b] border border-slate-600 z-50 max-h-80 overflow-y-auto">
                      <div className="py-1">
                        {/* Estados filtrados */}
                        {estadosFiltrados.map((estado) => (
                          <button
                            key={estado}
                            onClick={() => {
                              setEstadoInputValue(estado);
                              setEstadoSelecionado(estado);
                              setEstadosSubmenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
                          >
                            {estado}
                          </button>
                        ))}

                        {/* Divisor e opções de expansão se não houver filtro */}
                        {!estadoInputValue.trim() && (
                          <>
                            <div className="border-t border-slate-600 my-1" />

                            {/* Opção Exibir mais */}
                            {!estadosExpanded && estados.length > estadosPrioritarios.length && (
                              <button
                                onClick={() => setEstadosExpanded(true)}
                                className="w-full text-left px-3 py-2 text-sm text-sky-300 hover:bg-slate-600 transition-colors font-semibold"
                              >
                                ── Exibir mais ──
                              </button>
                            )}

                            {/* Estados adicionais quando expandido */}
                            {estadosExpanded && (
                              <>
                                {estados
                                  .filter(estado => !estadosPrioritarios.includes(estado))
                                  .map((estado) => (
                                    <button
                                      key={estado}
                                      onClick={() => {
                                        setEstadoInputValue(estado);
                                        setEstadoSelecionado(estado);
                                        setEstadosSubmenuOpen(false);
                                      }}
                                      className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
                                    >
                                      {estado}
                                    </button>
                                  ))}

                                {/* Opção Exibir menos */}
                                <div className="border-t border-slate-600 my-1" />
                                <button
                                  onClick={() => setEstadosExpanded(false)}
                                  className="w-full text-left px-3 py-2 text-sm text-orange-300 hover:bg-slate-600 transition-colors font-semibold"
                                >
                                  ── Exibir menos ──
                                </button>
                              </>
                            )}
                          </>
                        )}
                        
                        {/* Mensagem quando não há resultados na busca */}
                        {estadoInputValue.trim() && estadosFiltrados.length === 0 && (
                          <div className="px-3 py-2 text-sm text-slate-400 text-center">
                            Nenhum estado encontrado
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              {/* Dropdown personalizado de municípios */}
              <div className="relative w-full md:w-56" ref={municipiosDropdownRef}>
                <div className="relative">
                  <input
                    type="text"
                    value={municipioInputValue}
                    onChange={(e) => {
                      setMunicipioInputValue(e.target.value);
                      // Manter o dropdown aberto enquanto há digitação
                      setMunicipiosSubmenuOpen(true);
                    }}
                    onFocus={() => {
                      if (estadoSelecionado) {
                        // Limpeza automática: ao clicar, apagar o conteúdo anterior
                        setMunicipioInputValue("");
                        setMunicipioSelecionadoDropdown("");
                        setMunicipiosSubmenuOpen(true);
                        console.log(`🧹 [MapaPage] ${userInfo} - Campo de Município limpo automaticamente ao focar`);
                      }
                    }}
                    disabled={!estadoSelecionado}
                    placeholder={estadoSelecionado ? "Digite o município..." : "Selecione um estado primeiro"}
                    className={`appearance-none w-full rounded-md bg-[#1e293b] text-white placeholder-slate-400 border border-slate-600 px-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-left ${
                      !estadoSelecionado ? 'opacity-60 cursor-not-allowed' : 'cursor-text'
                    } md:w-56`}
                  />
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    className={`h-4 w-4 text-slate-300 absolute right-2 top-1/2 -translate-y-1/2 transition-transform duration-200 pointer-events-none ${municipiosSubmenuOpen ? 'rotate-180' : ''}`}
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    aria-hidden="true"
                  >
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.061l-4.24 4.24a.75.75 0 01-1.06 0l-4.24-4.24a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>

                  {/* Submenu personalizado */}
                  {municipiosSubmenuOpen && estadoSelecionado && (
                    <div className="absolute top-full left-0 mt-1 w-full rounded-md shadow-lg bg-[#1e293b] border border-slate-600 z-50 max-h-80 overflow-y-auto">
                      <div className="py-1">
                        {municipiosFiltrados.map((municipio) => (
                          <button
                            key={municipio}
                            onClick={() => {
                              setMunicipioInputValue(municipio);
                              setMunicipioSelecionadoDropdown(municipio);
                              setMunicipiosSubmenuOpen(false);
                            }}
                            className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
                          >
                            {municipio}
                          </button>
                        ))}
                        {municipioInputValue.trim() && municipiosFiltrados.length === 0 && (
                          <div className="px-3 py-2 text-sm text-slate-400 text-center">
                            Nenhum município encontrado
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col md:flex-row gap-3 w-full md:w-auto">
                {/* Botão de Exportar com menu e opção avançada */}
                <ExportMenu
                  city={municipioSelecionado ? {
                    municipio: municipioSelecionado.properties?.nome_municipio || municipioSelecionado.properties?.municipio,
                    nome: municipioSelecionado.properties?.nome_municipio || municipioSelecionado.properties?.municipio,
                    name_state: municipioSelecionado.properties?.name_state,
                    VALOR_PD: municipioSelecionado.properties?.VALOR_PD,
                    VALOR_CTM: municipioSelecionado.properties?.VALOR_CTM,
                    VALOR_PMSB: municipioSelecionado.properties?.VALOR_PMSB
                  } : null}
                  className="w-full md:w-auto"
                  onOpenAdvanced={() => {
                    console.log(`📤 [MapaPage] ${userInfo} - Modal de exportação avançada aberta`);
                    setAdvancedModalOpen(true);
                  }}
                  onLogExport={logExport}
                  mapData={mapData}
                />

                <button
                  className="w-full md:w-auto bg-sky-600 hover:bg-sky-700 text-white font-semibold py-1.5 px-4 rounded-md flex items-center justify-center gap-2 transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-[#0f172a]"
                  type="submit"
                  onClick={() => console.log(`🔍 [MapaPage] ${userInfo} - Botão "Buscar" clicado`)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                  </svg>
                  Buscar
                </button>

                {/* Botão de Limpar Seleção */}
                <button
                  type="button"
                  onClick={() => {
                    console.log(`🧹 [MapaPage] ${userInfo} - Seleção limpa`);
                    setEstadoSelecionado('');
                    setSelectValue('');
                    setEstadoInputValue('');
                    setMunicipioSelecionadoDropdown('');
                    setMunicipioInputValue('');
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

                {/* Botão Toggle: Modo Vendas */}
                <button
                  type="button"
                  onClick={() => {
                    const novoEstado = !modoVendas;
                    setModoVendas(novoEstado);
                    
                    // Telemetria: evento de toggle
                    console.log(`💼 [MapaPage] ${userInfo} - Modo vendas ${novoEstado ? 'ativado' : 'desativado'}`, {
                      estado: novoEstado ? 'on' : 'off',
                      municipio: municipioSelecionado?.properties?.code_muni || null,
                      uf: municipioSelecionado?.properties?.UF || null,
                      nome_municipio: municipioSelecionado?.properties?.nome_municipio || null
                    });
                  }}
                  disabled={!municipioSelecionado}
                  aria-pressed={modoVendas}
                  aria-label={modoVendas ? "Desativar modo vendas" : "Ativar modo vendas"}
                  title={!municipioSelecionado ? "Selecione um município primeiro" : (modoVendas ? "Mostrar portfólio completo" : "Exibir o que podemos vender")}
                  className={`
                    w-full md:w-auto font-semibold py-1.5 px-4 rounded-md transition-all duration-150 ease-in-out 
                    flex items-center justify-center gap-2
                    focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#0f172a]
                    ${!municipioSelecionado 
                      ? 'border border-slate-700 text-slate-500 bg-slate-800/50 cursor-not-allowed' 
                      : modoVendas 
                        ? 'border border-cyan-500 text-cyan-400 bg-cyan-900/30 hover:bg-cyan-900/50 focus:ring-cyan-500' 
                        : 'border border-slate-600 text-slate-300 bg-transparent hover:bg-slate-700/50 focus:ring-slate-500'
                    }
                  `}
                >
                  {modoVendas ? (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-iteration-cw-icon lucide-iteration-cw h-5 w-5">
                      <path d="M4 10a8 8 0 1 1 8 8H4"/>
                      <path d="m8 22-4-4 4-4"/>
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chart-no-axes-combined-icon lucide-chart-no-axes-combined h-5 w-5">
                      <path d="M12 16v5"/>
                      <path d="M16 14v7"/>
                      <path d="M20 10v11"/>
                      <path d="m22 3-8.646 8.646a.5.5 0 0 1-.708 0L9.354 8.354a.5.5 0 0 0-.707 0L2 15"/>
                      <path d="M4 18v3"/>
                      <path d="M8 14v7"/>
                    </svg>
                  )}
                  {modoVendas ? 'Exibir todos' : 'Soluções disponíveis'}
                </button>
              </div>
            </form>

            {erroBusca && (
              <span className="text-red-400 mt-1 text-sm">{erroBusca}</span>
            )}
          </section>
        </div>
        </div>
      </div>

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
      <main className="flex-1 w-full flex flex-col items-center justify-center gap-2 lg:gap-1 p-1 lg:p-0.5">
        <div className="w-full max-w-[1400px] mx-auto px-2 lg:px-4" ref={dadosRef}>
          {/* Dashboard com informações administrativas */}
          {municipioSelecionado ? (
            <>
              {/* Grid para organizar os containers lado a lado */}
              <div className="grid grid-cols-1 lg:grid-cols-[55fr_45fr] gap-2 lg:gap-3 md:max-w-[1200px] mx-auto overflow-visible lg:overflow-hidden" style={{
                gridTemplateRows: windowWidth < 1024 ? 'auto 1fr' : `${alturaMunicipioGestao}px ${alturaMapa}vh`
              }}>
                {/* Container 1: Município e Gestão (linha 1, coluna 1) */}
                <div className="bg-[#1e293b] rounded-lg shadow-lg p-0.5 border border-slate-600 animate-fade-in lg:col-start-1 lg:row-start-1" style={{
                  height: windowWidth < 1024 ? 'auto' : `${alturaMunicipioGestao}px`,
                  minHeight: windowWidth < 1024 ? '250px' : `${alturaMunicipioGestao}px`
                }}>
                  <div className={`bg-[#0f172a] rounded-lg ${windowWidth < 1024 ? 'p-3' : 'p-2'} flex flex-col transition-all duration-300 hover:bg-[#111a2d] hover:shadow-lg border border-slate-700 relative overflow-visible h-full`}>
                    {/* Efeito de brilho no canto superior */}
                    <div className="absolute -top-10 -right-10 w-20 h-20 bg-blue-500/10 rounded-full blur-xl"></div>
                    
                    <div className="flex flex-row items-center justify-center mb-3 gap-3">
                      <div className="flex items-center gap-2">
                        <h3 className="text-base text-sky-300 font-bold tracking-wide">Município e Gestão</h3>
                        {pistasDoMunicipio.length > 0 && (
                          <div 
                            ref={planeIconRef}
                            className="ml-2 cursor-pointer select-none"
                            role="button"
                            tabIndex={0}
                            aria-label="Pistas de voo"
                            aria-haspopup="dialog"
                            aria-expanded={tooltipVisible}
                            onMouseEnter={() => setTooltipVisible(true)}
                            onMouseLeave={() => setTooltipVisible(false)}
                            onClick={() => {
                              console.log(`✈️ [MapaPage] ${userInfo} - Tooltip de pistas ${!tooltipVisible ? 'aberto' : 'fechado'}`);
                              setTooltipVisible(v => !v);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                setTooltipVisible(v => !v);
                              }
                            }}
                          >
                            {/* Ícone tipo lucide (aviação) */}
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              viewBox="0 0 24 24"
                              width="18"
                              height="18"
                              fill="none"
                              stroke="currentColor"
                              strokeWidth="2"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              className="lucide lucide-plane text-slate-300 hover:text-slate-200 transition-colors"
                            >
                              <path d="M2 22h20" />
                              <path d="M9.5 12.5 3 10l1-2 8 2 5-5 3 1-5 5 2 8-2 1-2.5-6.5-3.5 3.5v3l-2 1v-4l3.5-3.5Z" />
                            </svg>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Informações em duas colunas com ícones */}
                    <div className={`grid ${windowWidth < 1024 ? 'grid-cols-1 gap-4' : 'grid-cols-1 lg:grid-cols-2 gap-4'} flex-1`}>
                      {/* Coluna esquerda - Gestão */}
                      <div className={`bg-slate-800/30 rounded-lg ${windowWidth < 1024 ? 'p-4' : 'p-3'} backdrop-blur-sm`}>
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
                          
                          {/* Partido e VAAT lado a lado */}
                          <div className="grid grid-cols-2 gap-4">
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

                            {/* VAAT - Valor Anual Aluno/Professor */}
                            <div className="flex flex-col">
                              <div className="flex items-center mb-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-sky-400 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                </svg>
                                <span className="text-sm text-gray-400">VAAT mensal</span>
                              </div>
                              <div className="flex flex-col pl-5.5">
                                <span className="text-sm text-white font-semibold">
                                  {municipioSelecionado.properties?.valor_vaat_mensal_fmt === "N/A" || !municipioSelecionado.properties?.valor_vaat_mensal_fmt
                                    ? "N/A"
                                    : municipioSelecionado.properties.valor_vaat_mensal_fmt}
                                </span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Mandato removido conforme design */}
                        </div>
                      </div>
                      
                      {/* Coluna direita - Demografia e Educação */}
                      <div className={`bg-slate-800/30 rounded-lg ${windowWidth < 1024 ? 'p-4' : 'p-3'} backdrop-blur-sm`}>
                        <div className="text-xs text-emerald-400 uppercase tracking-wider mb-4 font-semibold text-center">Demografia e Educação</div>

                        {/* Primeira linha - População e Domicílios */}
                        <div className="grid grid-cols-2 gap-x-6 gap-y-3 mb-6">
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

                        {/* Segunda linha - Dados Educacionais */}
                        <div className={`grid ${windowWidth < 640 ? 'grid-cols-1 gap-y-4' : 'grid-cols-3 gap-x-4 gap-y-4'}`}>
                          {/* Fund. 1 */}
                          <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-full mb-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                              </svg>
                              <span className="text-sm text-gray-400">Fund. 1</span>
                            </div>
                            <div className="flex items-center justify-center">
                              <span className="text-sm text-white font-semibold">
                                {municipioSelecionado.properties?.alunos_iniciais ?? "0"}
                              </span>
                            </div>
                          </div>

                          {/* Fund. 2 */}
                          <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-full mb-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                              </svg>
                              <span className="text-sm text-gray-400">Fund. 2</span>
                            </div>
                            <div className="flex items-center justify-center">
                              <span className="text-sm text-white font-semibold">
                                {municipioSelecionado.properties?.alunos_finais ?? "0"}
                              </span>
                            </div>
                          </div>

                          {/* Médio */}
                          <div className="flex flex-col items-center">
                            <div className="flex items-center justify-center w-full mb-1">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-emerald-400 mr-1.5" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                              </svg>
                              <span className="text-sm text-gray-400">Médio</span>
                            </div>
                            <div className="flex items-center justify-center">
                              <span className="text-sm text-white font-semibold">
                                {municipioSelecionado.properties?.alunos_medio ?? "0"}
                              </span>
                            </div>
                          </div>
                        </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                {/* Container 2: Produtos Municipais (ocupa toda a coluna direita) */}
                <div className="bg-[#1e293b] rounded-lg shadow-lg p-0.5 border border-slate-600 animate-fade-in lg:col-start-2 lg:row-span-2 w-full" style={{
                  height: windowWidth < 1024 ? '400px' : alturaTotalContainersEsquerda,
                  maxHeight: windowWidth < 1024 ? '50vh' : 'none'
                }}>
                  <div className="bg-[#0f172a] rounded-lg flex flex-col transition-all duration-300 hover:bg-[#111a2d] hover:shadow-lg border border-slate-700 relative h-full overflow-hidden">
                    {/* Efeito de brilho no canto superior */}
                    <div className="absolute -top-10 -right-10 w-20 h-20 bg-indigo-500/10 rounded-full blur-xl"></div>
                    
                    {/* Container com largura total e altura completa */}
                    <div className="flex flex-col w-full h-full p-2 md:p-3 overflow-y-auto">
                      <InformacoesMunicipio 
                        municipioSelecionado={municipioSelecionado} 
                        modoVendas={modoVendas}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Container 3: Mapa interativo (abaixo do painel de município) */}
                <div className="rounded-lg overflow-hidden shadow-lg bg-[#0f172a] border border-slate-600 animate-fade-in lg:col-start-1 lg:row-start-2" style={{
                  height: `${alturaMapa}vh`,
                  minHeight: windowWidth < 1024 ? '250px' : '300px',
                  maxHeight: windowWidth < 1024 ? '40vh' : 'none'
                }}>
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
      </div>
      </div>

      {/* Rodapé customizado */}
      <MiniFooter />

      {/* Botão para voltar ao topo (visível apenas em mobile) */}
      <ScrollToTopButton />

      {/* Modal de exportação avançada */}
      <ExportAdvancedModal
        isOpen={advancedModalOpen}
        onClose={() => {
          console.log(`📤 [MapaPage] ${userInfo} - Modal de exportação avançada fechada`);
          setAdvancedModalOpen(false);
        }}
        mapData={mapData}
      />

      {/* Tooltip das pistas de voo via portal */}
      <PortalTooltip
        isVisible={tooltipVisible}
        anchorRef={planeIconRef}
      >
        <div className="font-semibold text-sky-300 mb-1 whitespace-nowrap">Pistas de voo</div>
        <ul className="space-y-1 max-h-60 overflow-auto pr-1">
          {pistasDoMunicipio.map((p: any, idx: number) => (
            <li key={idx} className="text-slate-200 whitespace-nowrap">
              <span className="text-slate-400">{String(p['codigo_pista'] ?? '').trim()}</span>
              {` - `}
              <span className="font-medium">{String(p['nome_pista'] ?? '').trim()}</span>
              {p['tipo_pista'] ? (
                <span className="text-slate-400"> {` (${String(p['tipo_pista']).trim()})`}</span>
              ) : null}
            </li>
          ))}
        </ul>
      </PortalTooltip>
    </div>
  );

  // Log quando a página está totalmente carregada
  console.log(`✅ [MapaPage] ${userInfo} - Página renderizada - Carregando: ${loading}, Município selecionado: ${!!municipioSelecionado}`);
}

export default function MapaPage() {
  return <MapaPageContent />;
}