"use client";

import { useState, memo, useMemo, useRef, useCallback } from 'react';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MiniFooter from '@/components/MiniFooter';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import { useEffect } from 'react';
import { usePolosData } from '@/contexts/PolosDataContext';
import { PRODUTOS_CONFIG, SIGLAS_ESTADOS } from './types';
import dynamic from 'next/dynamic';
import EstrategiaFiltersMenu from './_components/EstrategiaPoloFiltersMenu';
import RelacionamentoModal from './_components/RelacionamentoModal';
import { createPortal } from 'react-dom';
import CelebrationMessage from './_components/CelebrationMessage';
import ConfettiEffect from './_components/ConfettiEffect';

// Lista de Estados e Regiões
const REGIOES_BRASIL: Record<string, string[]> = {
  'Norte': ['AC', 'AP', 'AM', 'PA', 'RO', 'RR', 'TO'],
  'Nordeste': ['AL', 'BA', 'CE', 'MA', 'PB', 'PE', 'PI', 'RN', 'SE'],
  'Centro-Oeste': ['DF', 'GO', 'MT', 'MS'],
  'Sudeste': ['ES', 'MG', 'RJ', 'SP'],
  'Sul': ['PR', 'RS', 'SC']
};

const TODAS_UFS = Object.values(REGIOES_BRASIL).flat();

// Constantes do Raio Estratégico (João Pessoa)
const JOAO_PESSOA_COORDS: [number, number] = [-7.14804917856058, -34.95096946933421]; // [lat, lng]
const JOAO_PESSOA_RADIUS_KM = 1300;

// Função para calcular distância entre dois pontos (Haversine)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371; // km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

const UF_NAMES: Record<string, string> = {
  'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas',
  'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal', 
  'ES': 'Espírito Santo', 'GO': 'Goiás', 'MA': 'Maranhão',
  'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul', 'MG': 'Minas Gerais',
  'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná', 'PE': 'Pernambuco',
  'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
  'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima',
  'SC': 'Santa Catarina', 'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'
};

// Importar MapaPolos dinamicamente (sem SSR)
const MapaPolos = dynamic(() => import('./_components/MapaPolos'), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center bg-[#1e293b]">
      <div className="text-slate-400">Carregando mapa...</div>
    </div>
  ),
});

// Componente para contagem animada de valores monetarios
const AnimatedCurrency = memo(function AnimatedCurrency({ targetValue }: { targetValue: number }) {
  const count = useMotionValue(0);
  const displayValue = useTransform(count, (latest) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(latest);
  });

  useEffect(() => {
    const controls = animate(count, targetValue, {
      duration: 1.0,
      ease: "easeOut"
    });
    return controls.stop;
  }, [count, targetValue]);

  return <motion.span>{displayValue}</motion.span>;
});

// Componente para contagem animada de numeros inteiros
const AnimatedNumber = memo(function AnimatedNumber({ targetValue }: { targetValue: number }) {
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => Math.round(latest));

  useEffect(() => {
    const controls = animate(count, targetValue, {
      duration: 1.0,
      ease: "easeOut"
    });
    return controls.stop;
  }, [count, targetValue]);

  return <motion.span>{rounded}</motion.span>;
});

// Componente para contagem animada de valores monetarios simples
const AnimatedMonetaryValue = memo(function AnimatedMonetaryValue({ targetValue }: { targetValue: number }) {
  const count = useMotionValue(0);
  const formattedValue = useTransform(count, (latest) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(latest);
  });

  useEffect(() => {
    const controls = animate(count, targetValue, {
      duration: 1.0,
      ease: "easeOut"
    });
    return controls.stop;
  }, [count, targetValue]);

  return <motion.span>{formattedValue}</motion.span>;
});

export default function PolosPage() {
  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [isRadarActive, setIsRadarActive] = useState(false);
  const [isRelActive, setIsRelActive] = useState(false);
  const [isPoloLogisticoActive, setIsPoloLogisticoActive] = useState(false); // Por padrão desativado
  const [isPistasActive, setIsPistasActive] = useState(false);
  const [isRelacionamentoModalOpen, setIsRelacionamentoModalOpen] = useState(false);
  const [showConfetti, setShowConfetti] = useState<boolean>(false);
  const [confettiMessage, setConfettiMessage] = useState<string>('');
  const MUNICIPIOS_PER_PAGE = 10;

  // Estados para filtros
  const [selectedUFs, setSelectedUFs] = useState<string[]>([]);
  const [isEstadoOpen, setIsEstadoOpen] = useState(false);
  const estadoButtonRef = useRef<HTMLButtonElement>(null);
  const estadoDropdownRef = useRef<HTMLDivElement>(null);

  // Filtro de Polo Estratégico
  const [selectedPolo, setSelectedPolo] = useState<string>('ALL');
  const [poloInputValue, setPoloInputValue] = useState('');
  const [isPoloDropdownOpen, setIsPoloDropdownOpen] = useState(false);
  const poloInputRef = useRef<HTMLDivElement>(null);

  // Filtro de Todos os Municípios
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>('ALL');
  const [municipioInputValue, setMunicipioInputValue] = useState('');
  const [isMunicipioDropdownOpen, setIsMunicipioDropdownOpen] = useState(false);
  const municipioInputRef = useRef<HTMLDivElement>(null);

  // Filtro de Produtos
  const [selectedProducts, setSelectedProducts] = useState<string[]>(Object.keys(PRODUTOS_CONFIG).filter(k => k !== 'valor_total'));
  const [isProdutosOpen, setIsProdutosOpen] = useState(false);
  const produtosButtonRef = useRef<HTMLButtonElement>(null);
  const produtosDropdownRef = useRef<HTMLDivElement>(null);

  // Estados aplicados (após clicar em Buscar)
  const [appliedUFs, setAppliedUFs] = useState<string[]>([]);
  const [appliedPolo, setAppliedPolo] = useState<string>('ALL');
  const [appliedMunicipio, setAppliedMunicipio] = useState<string>('ALL');
  const [appliedProducts, setAppliedProducts] = useState<string[]>([]);

  // Dados do contexto
  const { polosData, loading, error, loadingProgress, refreshPolosData, refreshRelacionamentos } = usePolosData();
  
  // Estado para pistas de voo
  const [pistas, setPistas] = useState<any[]>([]);
  
  // Carregar pistas de voo
  useEffect(() => {
    const loadPistas = async () => {
      try {
        const response = await fetch('/api/proxy-geojson/pistas_s3_lat_log.json');
        if (response.ok) {
          const data = await response.json();
          setPistas(Array.isArray(data) ? data : []);
        }
      } catch (err) {
        console.error('Erro ao carregar pistas:', err);
      }
    };
    loadPistas();
  }, []);

  // Handler para abrir modal de relacionamento
  const handleOpenRelacionamentoModal = () => {
    setIsRelacionamentoModalOpen(true);
  };

  // Set de códigos de municípios com relacionamento (Polos Estratégicos)
  const polosEstrategicosSet = useMemo(() => {
    const set = new Set<string>();
    polosData?.municipiosRelacionamento?.forEach(m => {
      if (m.relacionamento_ativo) {
        set.add(String(m.code_muni));
      }
    });
    return set;
  }, [polosData?.municipiosRelacionamento]);

  // Lista de Polos Estratégicos para o dropdown (filtrada por estado se houver seleção)
  const polosEstrategicosList = useMemo(() => {
    if (!polosData?.baseMunicipios?.features) return [];
    
    let features = polosData.baseMunicipios.features;
    
    // Filtrar por estados selecionados se houver
    if (selectedUFs.length > 0) {
      const estadosNomes = new Set(selectedUFs.map(uf => UF_NAMES[uf] || uf));
      features = features.filter(f => {
        const estado = f.properties?.name_state || '';
        return estadosNomes.has(estado);
      });
    }
    
    return features
      .filter(f => polosEstrategicosSet.has(String(f.properties?.code_muni)))
      .map(f => ({
        codigo: String(f.properties?.code_muni || ''),
        nome: f.properties?.nome_municipio || 'N/A',
        UF: f.properties?.name_state || '',
        valor: f.properties?.valor_total_produtos || 0
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [polosData?.baseMunicipios, polosEstrategicosSet, selectedUFs]);

  // Lista de todos os municípios para o dropdown (filtrada por estado se houver seleção)
  const todosMunicipiosList = useMemo(() => {
    if (!polosData?.baseMunicipios?.features) return [];
    
    let features = polosData.baseMunicipios.features;
    
    // Filtrar por estados selecionados se houver
    if (selectedUFs.length > 0) {
      const estadosNomes = new Set(selectedUFs.map(uf => UF_NAMES[uf] || uf));
      features = features.filter(f => {
        const estado = f.properties?.name_state || '';
        return estadosNomes.has(estado);
      });
    }
    
    return features
      .map(f => ({
        codigo: String(f.properties?.code_muni || ''),
        nome: f.properties?.nome_municipio || 'N/A',
        UF: f.properties?.name_state || '',
        valor: f.properties?.valor_total_produtos || 0
      }))
      .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
  }, [polosData?.baseMunicipios, selectedUFs]);

  // Polos filtrados pelo input de busca
  const polosFiltrados = useMemo(() => {
    const searchTerm = poloInputValue.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!searchTerm) return polosEstrategicosList;
    
    return polosEstrategicosList.filter(p => 
      p.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(searchTerm)
    );
  }, [polosEstrategicosList, poloInputValue]);

  // Municípios filtrados pelo input de busca
  const municipiosFiltrados = useMemo(() => {
    const searchTerm = municipioInputValue.trim().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    if (!searchTerm) return todosMunicipiosList.slice(0, 100); // Limitar para performance
    
    return todosMunicipiosList.filter(m => 
      m.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').includes(searchTerm)
    );
  }, [todosMunicipiosList, municipioInputValue]);

  // Handler de busca
  const handleBuscar = useCallback(() => {
    setAppliedUFs([...selectedUFs]);
    setAppliedPolo(selectedPolo);
    setAppliedMunicipio(selectedMunicipio);
    setAppliedProducts(selectedProducts.length === Object.keys(PRODUTOS_CONFIG).length - 1 ? [] : [...selectedProducts]);
    
    // Fechar dropdowns
    setIsEstadoOpen(false);
    setIsPoloDropdownOpen(false);
    setIsMunicipioDropdownOpen(false);
    setIsProdutosOpen(false);
  }, [selectedUFs, selectedPolo, selectedMunicipio, selectedProducts]);

  // Handler para selecionar município do card flip
  const handleMunicipioFromCard = useCallback((nomeMunicipio: string) => {
    if (!polosData?.baseMunicipios?.features) return;

    // Buscar o município pelo nome nos dados filtrados (mesmos filtros aplicados)
    let features = polosData.baseMunicipios.features;
    
    // Aplicar os mesmos filtros que foram aplicados no computedData
    if (appliedUFs.length > 0) {
      const estadosNomes = new Set(appliedUFs.map(uf => UF_NAMES[uf] || uf));
      features = features.filter(f => {
        const estado = f.properties?.name_state || '';
        return estadosNomes.has(estado);
      });
    }

    if (isRadarActive) {
      features = features.filter(f => {
        let lat: number | undefined;
        let lon: number | undefined;

        if (f.geometry && f.geometry.coordinates && f.geometry.coordinates.length > 0) {
          if (f.geometry.type === 'MultiPolygon') {
            const coords = f.geometry.coordinates as number[][][][];
            const firstCoords = coords[0]?.[0];
            if (firstCoords && firstCoords.length > 0) {
              [lon, lat] = firstCoords[0];
            }
          } else if (f.geometry.type === 'Polygon') {
            const coords = f.geometry.coordinates as number[][][];
            const firstCoords = coords[0];
            if (firstCoords && firstCoords.length > 0) {
              [lon, lat] = firstCoords[0];
            }
          }
        }
        
        if (typeof lat !== 'number' || typeof lon !== 'number') {
          return false;
        }
        
        const distance = calculateDistance(
          JOAO_PESSOA_COORDS[0],
          JOAO_PESSOA_COORDS[1],
          lat,
          lon
        );
        
        return distance <= JOAO_PESSOA_RADIUS_KM;
      });
    }

    // Encontrar o município pelo nome
    const municipioFeature = features.find(
      f => f.properties?.nome_municipio === nomeMunicipio
    );

    if (municipioFeature) {
      const codigoMunicipio = String(municipioFeature.properties?.code_muni || '');
      
      // Atualizar estados
      setSelectedMunicipio(codigoMunicipio);
      setMunicipioInputValue(nomeMunicipio);
      setSelectedPolo('ALL');
      setPoloInputValue('');
      
      // Aplicar busca automaticamente (mantém os filtros já aplicados)
      setAppliedUFs([...appliedUFs]);
      setAppliedPolo('ALL');
      setAppliedMunicipio(codigoMunicipio);
      setAppliedProducts(appliedProducts.length === Object.keys(PRODUTOS_CONFIG).length - 1 ? [] : [...appliedProducts]);
      
      // Fechar card flip
      setIsCardFlipped(false);
      setCurrentPage(0);
      
      // Fechar dropdowns
      setIsEstadoOpen(false);
      setIsPoloDropdownOpen(false);
      setIsMunicipioDropdownOpen(false);
      setIsProdutosOpen(false);
    }
  }, [polosData?.baseMunicipios, appliedUFs, isRadarActive, appliedProducts]);

  // Determinar se há município específico selecionado
  const municipioSelecionado = useMemo(() => {
    const codigoMunicipio = appliedMunicipio !== 'ALL' ? appliedMunicipio : (appliedPolo !== 'ALL' ? appliedPolo : null);
    if (!codigoMunicipio || !polosData?.baseMunicipios?.features) return null;
    
    const feature = polosData.baseMunicipios.features.find(
      f => String(f.properties?.code_muni) === codigoMunicipio
    );
    
    if (!feature) return null;
    
    return {
      codigo: codigoMunicipio,
      nome: feature.properties?.nome_municipio || 'N/A',
      UF: feature.properties?.name_state || '',
      properties: feature.properties as unknown as { valor_total_produtos?: number | null; [key: string]: unknown }
    };
  }, [appliedMunicipio, appliedPolo, polosData?.baseMunicipios]);

  // Calcular métricas baseadas nos dados reais e filtros aplicados
  const computedData = useMemo(() => {
    if (!polosData?.baseMunicipios?.features) {
      return {
        valorTotal: 0,
        totalMunicipios: 0,
        top3: [],
        municipiosList: [],
        produtosMunicipio: []
      };
    }

    let features = polosData.baseMunicipios.features;
    
    // Aplicar filtro de UFs se houver
    if (appliedUFs.length > 0) {
      features = features.filter(f => {
        const uf = f.properties?.name_state || '';
        // Converter nome do estado para sigla se necessário
        const sigla = Object.entries(UF_NAMES).find(([s, n]) => n === uf)?.[0] || uf;
        return appliedUFs.includes(sigla) || appliedUFs.includes(uf);
      });
    }
    
    // Aplicar filtro do Raio Estratégico (João Pessoa 1.300km) se ativado
    if (isRadarActive) {
      features = features.filter(f => {
        // Extrair coordenadas do geometry (centroide ou primeira coordenada)
        let lat: number | undefined;
        let lon: number | undefined;

        if (f.geometry && f.geometry.coordinates && f.geometry.coordinates.length > 0) {
          if (f.geometry.type === 'MultiPolygon') {
            // MultiPolygon: pega primeira coordenada do primeiro polígono
            const coords = f.geometry.coordinates as number[][][][];
            const firstCoords = coords[0]?.[0];
            if (firstCoords && firstCoords.length > 0) {
              [lon, lat] = firstCoords[0];
            }
          } else if (f.geometry.type === 'Polygon') {
            // Polygon: pega primeira coordenada
            const coords = f.geometry.coordinates as number[][][];
            const firstCoords = coords[0];
            if (firstCoords && firstCoords.length > 0) {
              [lon, lat] = firstCoords[0];
            }
          }
        }
        
        if (typeof lat !== 'number' || typeof lon !== 'number') {
          return false;
        }
        
        const distance = calculateDistance(
          JOAO_PESSOA_COORDS[0], // lon
          JOAO_PESSOA_COORDS[1], // lat
          lat,
          lon
        );
        
        return distance <= JOAO_PESSOA_RADIUS_KM;
      });
    }
    
    // Calcular valor total
    const valorTotal = features.reduce((acc, f) => {
      const valor = f.properties?.valor_total_produtos;
      return acc + (typeof valor === 'number' ? valor : 0);
    }, 0);

    // Total de municípios
    const totalMunicipios = features.length;

    // Top 3 municípios por valor total
    const sortedByValue = [...features]
      .filter(f => typeof f.properties?.valor_total_produtos === 'number')
      .sort((a, b) => (b.properties?.valor_total_produtos || 0) - (a.properties?.valor_total_produtos || 0))
      .slice(0, 3)
      .map(f => ({
        nome: f.properties?.nome_municipio || 'N/A',
        valor: f.properties?.valor_total_produtos || 0
      }));

    // Lista de municípios para o card flip
    const municipiosList = features
      .map(f => f.properties?.nome_municipio || 'N/A')
      .sort((a, b) => a.localeCompare(b, 'pt-BR'));

    // Produtos do município selecionado (quando há município específico)
    let produtosMunicipio: Array<{ key: string; nome: string; valor: number; category: string; shortLabel: string }> = [];
    if (municipioSelecionado?.properties) {
      const props = municipioSelecionado.properties;
      produtosMunicipio = Object.entries(PRODUTOS_CONFIG)
        .filter(([key]) => key !== 'valor_total')
        .map(([key, config]) => ({
          key,
          nome: config.nome,
          valor: Number(props[config.campo as keyof typeof props]) || 0,
          category: config.category,
          shortLabel: config.nome
        }))
        .filter(p => p.valor > 0)
        .sort((a, b) => b.valor - a.valor);
    }

    return {
      valorTotal,
      totalMunicipios,
      top3: sortedByValue,
      municipiosList,
      produtosMunicipio
    };
  }, [polosData, appliedUFs, municipioSelecionado, isRadarActive]);

  // Click outside para fechar dropdowns
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      // Estado dropdown
      if (isEstadoOpen && estadoDropdownRef.current && !estadoDropdownRef.current.contains(e.target as Node) &&
          estadoButtonRef.current && !estadoButtonRef.current.contains(e.target as Node)) {
        setIsEstadoOpen(false);
      }
      // Polo dropdown
      if (isPoloDropdownOpen && poloInputRef.current && !poloInputRef.current.contains(e.target as Node)) {
        setIsPoloDropdownOpen(false);
      }
      // Município dropdown
      if (isMunicipioDropdownOpen && municipioInputRef.current && !municipioInputRef.current.contains(e.target as Node)) {
        setIsMunicipioDropdownOpen(false);
      }
      // Produtos dropdown
      if (isProdutosOpen && produtosDropdownRef.current && !produtosDropdownRef.current.contains(e.target as Node) &&
          produtosButtonRef.current && !produtosButtonRef.current.contains(e.target as Node)) {
        setIsProdutosOpen(false);
      }
    };
    
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsEstadoOpen(false);
        setIsPoloDropdownOpen(false);
        setIsMunicipioDropdownOpen(false);
        setIsProdutosOpen(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [isEstadoOpen, isPoloDropdownOpen, isMunicipioDropdownOpen, isProdutosOpen]);

  // Metricas para os cards - dinâmicas baseadas no município selecionado
  const metrics = useMemo(() => {
    // Quando há município selecionado, mostrar cards diferentes
    if (municipioSelecionado) {
      return [
        {
          id: 'valor_municipio',
          title: 'Valor Total',
          value: municipioSelecionado.properties?.valor_total_produtos || 0,
          subtitle: municipioSelecionado.nome,
          description: `${municipioSelecionado.UF} - Soma total dos produtos`
        },
        {
          id: 'produtos_municipio',
          title: 'Produtos do Município',
          value: 'produtos',
          subtitle: 'Detalhamento',
          description: 'Valores por produto'
        }
      ];
    }
    
    // Visão agregada (estado/região ou todos)
    return [
      {
        id: 'valor_polo',
        title: 'Valor Total',
        value: computedData.valorTotal,
        subtitle: appliedUFs.length > 0 ? `${appliedUFs.length} estado(s)` : 'Brasil',
        description: 'Soma total dos produtos'
      },
      {
        id: 'top_municipios',
        title: 'Top 3 Municipios',
        value: 'ranking',
        subtitle: 'Maior Potencial',
        description: 'Municipios com maior valor total'
      },
      {
        id: 'municipios_polo',
        title: 'Total de Municipios',
        value: computedData.totalMunicipios.toString(),
        subtitle: 'Municipios Totais',
        description: 'Clique para ver lista de municipios'
      }
    ];
  }, [municipioSelecionado, computedData, appliedUFs]);

  // Error state
  if (error) {
    return (
      <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white">
        <Navbar />
        <div className="flex flex-1">
          <Sidebar />
          <main className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="text-red-500 text-6xl mb-4">⚠️</div>
              <p className="text-slate-300 text-lg">Erro ao carregar dados</p>
              <p className="text-slate-500 text-sm mt-2">{error}</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white">
      {/* Navbar */}
      <Navbar />
      
      {/* Layout principal com Sidebar */}
      <div className="flex flex-1">
        {/* Sidebar */}
        <Sidebar />
        
        {/* Conteudo principal */}
        <main className="flex-1 flex flex-col overflow-hidden max-h-screen">
          {/* Header da pagina */}
          <div className="p-4 border-b border-slate-700/50">
            <div className="max-w-7xl mx-auto">
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-0"
              >
                <h1 className="text-3xl font-bold text-white">
                  Analise Estrategica de <span className="text-sky-400">Produtos</span>
                </h1>
                
                {/* Area para botoes/filtros */}
                <div className="flex items-center gap-3 flex-wrap">
                  <EstrategiaFiltersMenu
                    isRadarActive={isRadarActive}
                    setIsRadarActive={setIsRadarActive}
                    isRelActive={isRelActive}
                    setIsRelActive={setIsRelActive}
                    isPoloLogisticoActive={isPoloLogisticoActive}
                    setIsPoloLogisticoActive={setIsPoloLogisticoActive}
                    isPistasActive={isPistasActive}
                    setIsPistasActive={setIsPistasActive}
                    onOpenRelacionamentoModal={handleOpenRelacionamentoModal}
                  />
                </div>
              </motion.div>
            </div>
          </div>

          {/* Conteudo scrollavel */}
          <div className="flex-1 overflow-y-auto p-4">
            <div className="max-w-7xl mx-auto space-y-3">
              
              {/* Secao de Filtros */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.1 }}
              >
                <div className="bg-[#1e293b] border border-slate-700/50 rounded-lg p-3">
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {/* ESTADO/REGIAO */}
                    <div className="flex flex-col">
                      <label className="text-slate-300 text-sm mb-0.5 text-center font-bold">ESTADO/REGIÃO</label>
                      <button
                        ref={estadoButtonRef}
                        type="button"
                        onClick={() => setIsEstadoOpen(v => !v)}
                        className="relative bg-[#1e293b] text-white border border-slate-600 rounded-md px-3 pr-8 py-1.5 text-left flex items-center min-h-[40px] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      >
                        <span className="text-sm truncate">
                          {selectedUFs.length === 0 ? 'Todos os Estados' :
                           selectedUFs.length <= 3 ? selectedUFs.join(', ') : `${selectedUFs.length} selecionados`}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-300 transition-transform absolute right-2 top-1/2 -translate-y-1/2 ${isEstadoOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
                        </svg>
                      </button>
                      {/* Dropdown de Estados via Portal */}
                      {typeof window !== 'undefined' && isEstadoOpen && createPortal((
                        <div
                          ref={estadoDropdownRef}
                          className="fixed bg-[#1e293b] border border-slate-600 rounded-md shadow-lg z-[9999] max-h-[400px] overflow-y-auto"
                          style={{
                            top: ((estadoButtonRef.current?.getBoundingClientRect()?.bottom || 0) + window.scrollY + 4),
                            left: ((estadoButtonRef.current?.getBoundingClientRect()?.left || 0) + window.scrollX),
                            width: estadoButtonRef.current?.getBoundingClientRect()?.width,
                            minWidth: '250px'
                          }}
                        >
                          <div className="p-2">
                            {/* Todos */}
                            <label className="flex items-center gap-2 py-1 px-1 hover:bg-slate-600 rounded cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                className="w-4 h-4"
                                checked={selectedUFs.length === TODAS_UFS.length}
                                onChange={(e) => setSelectedUFs(e.target.checked ? [...TODAS_UFS] : [])}
                              />
                              <span className="text-sm text-white font-semibold">Todos</span>
                            </label>
                            <button
                              onClick={() => setSelectedUFs([])}
                              className="flex items-center gap-2 py-1 px-1 hover:bg-slate-600 rounded cursor-pointer w-full text-left transition-colors"
                            >
                              <div className="w-4 h-4 flex items-center justify-center">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </div>
                              <span className="text-sm text-red-400 font-semibold">Limpar</span>
                            </button>
                            
                            <div className="border-t border-slate-700/50 my-2" />
                            
                            {/* Regiões */}
                            <p className="text-[10px] tracking-wider text-slate-400 font-semibold mb-1">REGIÕES</p>
                            {Object.entries(REGIOES_BRASIL).map(([regiao, ufs]) => {
                              const allSelected = ufs.every(uf => selectedUFs.includes(uf));
                              const someSelected = ufs.some(uf => selectedUFs.includes(uf));
                              return (
                                <label key={regiao} className="flex items-center gap-2 py-1 px-1 hover:bg-slate-600 rounded cursor-pointer transition-colors">
                                  <input
                                    type="checkbox"
                                    className="w-4 h-4"
                                    checked={allSelected}
                                    ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                                    onChange={(e) => {
                                      setSelectedUFs(prev => {
                                        const set = new Set(prev);
                                        if (e.target.checked) ufs.forEach(uf => set.add(uf));
                                        else ufs.forEach(uf => set.delete(uf));
                                        return Array.from(set);
                                      });
                                    }}
                                  />
                                  <span className="text-sm text-white">{regiao}</span>
                                </label>
                              );
                            })}
                            
                            <div className="border-t border-slate-700/50 my-2" />
                            
                            {/* Estados */}
                            <p className="text-[10px] tracking-wider text-slate-400 font-semibold mb-1">ESTADOS</p>
                            {TODAS_UFS.map(uf => (
                              <label key={uf} className="flex items-center gap-2 py-1 px-1 hover:bg-slate-600 rounded cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4"
                                  checked={selectedUFs.includes(uf)}
                                  onChange={(e) => {
                                    setSelectedUFs(prev => {
                                      const set = new Set(prev);
                                      if (e.target.checked) set.add(uf);
                                      else set.delete(uf);
                                      return Array.from(set);
                                    });
                                  }}
                                />
                                <span className="text-sm text-white">{UF_NAMES[uf] || uf}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ), document.body)}
                    </div>

                    {/* POLO ESTRATÉGICO */}
                    <div className="flex flex-col">
                      <label className="text-slate-300 text-sm mb-0.5 text-center font-bold">POLO ESTRATÉGICO</label>
                      <div className="relative" ref={poloInputRef}>
                        <input
                          type="text"
                          value={poloInputValue}
                          onChange={(e) => {
                            setPoloInputValue(e.target.value);
                            setIsPoloDropdownOpen(true);
                          }}
                          onFocus={() => setIsPoloDropdownOpen(true)}
                          placeholder="Digite o nome do polo..."
                          className="w-full rounded-md bg-[#1e293b] text-white placeholder-slate-400 border border-slate-600 px-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-left"
                        />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none transition-transform ${isPoloDropdownOpen ? 'rotate-180' : ''}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.061l-4.24 4.24a.75.75 0 01-1.06 0l-4.24-4.24a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                        
                        {/* Dropdown de Polos */}
                        {isPoloDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 w-full rounded-md shadow-lg bg-[#1e293b] border border-slate-600 z-50 max-h-80 overflow-y-auto">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setSelectedPolo('ALL');
                                  setPoloInputValue('');
                                  setIsPoloDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
                              >
                                Todos os Polos ({polosEstrategicosList.length})
                              </button>
                              
                              {polosFiltrados.map(polo => (
                                <button
                                  key={polo.codigo}
                                  onClick={() => {
                                    setSelectedPolo(polo.codigo);
                                    setPoloInputValue(polo.nome);
                                    setSelectedMunicipio('ALL');
                                    setMunicipioInputValue('');
                                    setIsPoloDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{polo.nome}</span>
                                    <span className="text-[10px] text-slate-400">{polo.UF}</span>
                                  </div>
                                </button>
                              ))}
                              
                              {polosFiltrados.length === 0 && poloInputValue && (
                                <div className="px-3 py-2 text-sm text-slate-400 text-center">
                                  Nenhum polo encontrado
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* TODOS OS MUNIC */}
                    <div className="flex flex-col">
                      <label className="text-slate-300 text-sm mb-0.5 text-center font-bold">TODOS OS MUNIC</label>
                      <div className="relative" ref={municipioInputRef}>
                        <input
                          type="text"
                          value={municipioInputValue}
                          onChange={(e) => {
                            setMunicipioInputValue(e.target.value);
                            setIsMunicipioDropdownOpen(true);
                          }}
                          onFocus={() => setIsMunicipioDropdownOpen(true)}
                          placeholder="Digite o nome do município..."
                          className="w-full rounded-md bg-[#1e293b] text-white placeholder-slate-400 border border-slate-600 px-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-left"
                        />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 pointer-events-none transition-transform ${isMunicipioDropdownOpen ? 'rotate-180' : ''}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                        >
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.061l-4.24 4.24a.75.75 0 01-1.06 0l-4.24-4.24a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>
                        
                        {/* Dropdown de Municípios */}
                        {isMunicipioDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 w-full rounded-md shadow-lg bg-[#1e293b] border border-slate-600 z-50 max-h-80 overflow-y-auto">
                            <div className="py-1">
                              <button
                                onClick={() => {
                                  setSelectedMunicipio('ALL');
                                  setMunicipioInputValue('');
                                  setIsMunicipioDropdownOpen(false);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
                              >
                                Todos os Municípios ({todosMunicipiosList.length})
                              </button>
                              
                              {municipiosFiltrados.map(m => (
                                <button
                                  key={m.codigo}
                                  onClick={() => {
                                    setSelectedMunicipio(m.codigo);
                                    setMunicipioInputValue(m.nome);
                                    setSelectedPolo('ALL');
                                    setPoloInputValue('');
                                    setIsMunicipioDropdownOpen(false);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
                                >
                                  <div className="flex items-center justify-between">
                                    <span>{m.nome}</span>
                                    <span className="text-[10px] text-slate-400">{m.UF}</span>
                                  </div>
                                </button>
                              ))}
                              
                              {municipiosFiltrados.length === 0 && municipioInputValue && (
                                <div className="px-3 py-2 text-sm text-slate-400 text-center">
                                  Nenhum município encontrado
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PRODUTOS */}
                    <div className="flex flex-col">
                      <label className="text-slate-300 text-sm mb-0.5 text-center font-bold">PRODUTOS</label>
                      <button
                        ref={produtosButtonRef}
                        type="button"
                        onClick={() => setIsProdutosOpen(v => !v)}
                        className="relative bg-[#1e293b] text-white border border-slate-600 rounded-md px-3 pr-8 py-1.5 text-left flex items-center min-h-[40px] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      >
                        <span className="text-sm truncate block w-full">
                          {selectedProducts.length === Object.keys(PRODUTOS_CONFIG).length - 1 ? 'Todos' :
                           selectedProducts.length === 0 ? 'Nenhum' :
                           `${selectedProducts.length} selecionados`}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-300 transition-transform absolute right-2 top-1/2 -translate-y-1/2 ${isProdutosOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
                        </svg>
                      </button>
                      {/* Dropdown de Produtos via Portal */}
                      {typeof window !== 'undefined' && isProdutosOpen && createPortal((
                        <div
                          ref={produtosDropdownRef}
                          className="fixed bg-[#1e293b] border border-slate-600 rounded-md shadow-lg p-2 z-[9999]"
                          style={{
                            top: ((produtosButtonRef.current?.getBoundingClientRect()?.bottom || 0) + window.scrollY + 4),
                            left: ((produtosButtonRef.current?.getBoundingClientRect()?.left || 0) + window.scrollX),
                            width: produtosButtonRef.current?.getBoundingClientRect()?.width
                          }}
                        >
                          <div className="px-1 py-1">
                            <p className="text-[10px] tracking-wider text-slate-400 font-semibold mb-1">PRODUTOS</p>
                            <label className="flex items-center gap-2 py-1 px-1 hover:bg-slate-600 rounded cursor-pointer transition-colors">
                              <input
                                type="checkbox"
                                className="w-4 h-4"
                                checked={selectedProducts.length === Object.keys(PRODUTOS_CONFIG).length - 1}
                                ref={(el) => { if (el) el.indeterminate = selectedProducts.length > 0 && selectedProducts.length < Object.keys(PRODUTOS_CONFIG).length - 1; }}
                                onChange={(e) => {
                                  const allProducts = Object.keys(PRODUTOS_CONFIG).filter(k => k !== 'valor_total');
                                  setSelectedProducts(e.target.checked ? allProducts : []);
                                }}
                              />
                              <span className="text-sm text-white">Todos</span>
                            </label>
                            {Object.entries(PRODUTOS_CONFIG)
                              .filter(([key]) => key !== 'valor_total')
                              .map(([key, config]) => (
                              <label key={key} className="flex items-center gap-2 py-1 px-1 hover:bg-slate-600 rounded cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4"
                                  checked={selectedProducts.includes(key)}
                                  onChange={(e) => {
                                    setSelectedProducts(prev => {
                                      const set = new Set(prev);
                                      if (e.target.checked) set.add(key);
                                      else set.delete(key);
                                      return Array.from(set);
                                    });
                                  }}
                                />
                                <span className="text-sm text-white">{config.nome}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ), document.body)}
                    </div>

                    {/* Botao de Buscar */}
                    <div className="flex flex-col justify-end">
                      <label className="text-slate-300 text-sm mb-0.5 text-center font-bold opacity-0">Buscar</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleBuscar}
                          className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-md font-medium transition-colors duration-200 flex items-center justify-center gap-1.5 min-h-[40px] flex-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                          </svg>
                          <span className="text-sm font-semibold">Buscar</span>
                        </button>
                        <button
                          className="bg-slate-600/70 hover:bg-slate-500/80 text-white px-3 py-1.5 rounded-md font-medium transition-colors duration-200 flex items-center justify-center gap-1.5 min-h-[40px] flex-1"
                          title="Exportar dados"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
                          </svg>
                          <span className="text-sm font-semibold">Exportar</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </motion.section>

              {/* Secao de Cards */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-2 mb-2"
              >
                {/* Layout condicional: Município selecionado OU visão agregada */}
                {municipioSelecionado ? (
                  /* LAYOUT MUNICÍPIO SELECIONADO - 2 cards lado a lado */
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2 auto-rows-fr">
                    {/* Card 1: Valor Total do Município */}
                    <motion.div
                      key="valor_municipio_card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5 }}
                      className="bg-[#1e293b] rounded-lg border border-slate-700/50 hover:bg-[#233044] transition-all duration-300 p-6 h-full"
                    >
                      <div className="flex flex-col h-full items-center justify-between gap-3">
                        {/* Título com nome do município */}
                        <div className="text-center space-y-1 pt-1">
                          <p className="text-lg font-bold text-white">{municipioSelecionado.nome}</p>
                          <p className="text-sm text-sky-400 font-medium">{municipioSelecionado.UF}</p>
                          <p className="text-xs text-slate-500">Soma total dos produtos</p>
                        </div>

                        {/* Valor centralizado embaixo */}
                        <div className="flex items-center justify-center flex-1">
                          <p className="font-extrabold text-emerald-400 text-2xl sm:text-3xl md:text-4xl lg:text-4xl xl:text-5xl text-center leading-tight break-words">
                            <AnimatedCurrency targetValue={municipioSelecionado.properties?.valor_total_produtos || 0} />
                          </p>
                        </div>


                      </div>
                    </motion.div>

                    {/* Card 2: Produtos do Município - Grid de produtos */}
                    <motion.div
                      key="produtos_municipio_card"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.5, delay: 0.1 }}
                      className="bg-[#1e293b] rounded-lg border border-slate-700/50 p-4 h-full"
                    >
                      <div className="flex flex-col h-full">
                        <div className="mb-3 text-center">
                          <h3 className="text-lg font-semibold text-white">Produtos Detalhados</h3>
                          <p className="text-xs text-slate-400">Valores individuais por produto no município</p>
                        </div>
                        <div className="flex-1">
                          {/* Grid de 5 linhas x 2 colunas para produtos */}
                          <div className="grid grid-cols-2 grid-rows-5 gap-1 h-full">
                            {Array.from({ length: 10 }, (_, idx) => {
                              const produto = computedData.produtosMunicipio[idx];
                              return (
                                <div
                                  key={idx}
                                  className={`flex items-center justify-between py-1.5 px-2 rounded-md border transition-colors ${
                                    produto
                                      ? 'bg-slate-800/30 border-slate-700/20 hover:bg-slate-700/40'
                                      : 'bg-slate-800/10 border-slate-700/10'
                                  }`}
                                >
                                  {produto ? (
                                    <>
                                      <div className="flex items-center gap-1.5 flex-1 min-w-0">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                          produto.category === 'educacao' ? 'bg-blue-500' :
                                          produto.category === 'planejamento' ? 'bg-green-500' :
                                          produto.category === 'ambiental' ? 'bg-emerald-500' :
                                          produto.category === 'tributario' ? 'bg-yellow-500' :
                                          produto.category === 'habitacional' ? 'bg-purple-500' :
                                          produto.category === 'regularizacao' ? 'bg-indigo-500' :
                                          'bg-gray-500'
                                        }`} />
                                        <span className="text-xs font-medium text-slate-200 truncate" title={produto.nome}>
                                          {produto.shortLabel}
                                        </span>
                                      </div>
                                      <span className="text-xs font-semibold text-emerald-400 tabular-nums flex-shrink-0">
                                        R$ {new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(produto.valor)}
                                      </span>
                                    </>
                                  ) : (
                                    <span className="text-xs text-slate-500 italic">-</span>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                          {computedData.produtosMunicipio.length === 0 && (
                            <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                              Nenhum produto ativo neste município
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  </div>
                ) : (
                  /* LAYOUT VISÃO AGREGADA - 3 cards */
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 auto-rows-fr">
                    {metrics.map((metric, index) => (
                      <div key={metric.id} className="h-full">
                        {metric.id === 'municipios_polo' ? (
                          // Flip Card Container
                          <div
                            className="relative w-full h-full"
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
                              className="relative w-full h-full focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg"
                              style={{ transformStyle: 'preserve-3d' }}
                              tabIndex={0}
                              role="button"
                              aria-label={isCardFlipped ? 'Fechar lista de municipios' : 'Ver lista de municipios do polo'}
                            >
                              {/* Frente do Card */}
                              <div
                                className="absolute inset-0 w-full h-full bg-[#1e293b] rounded-lg border border-slate-700/50 hover:bg-[#233044] transition-all duration-300 p-4 cursor-pointer"
                                style={{ backfaceVisibility: 'hidden' }}
                                onClick={() => {
                                  if (!isCardFlipped) {
                                    setIsCardFlipped(true);
                                    setSelectedMetric(metric.id);
                                  }
                                }}
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
                                <div className="absolute inset-0 flex items-center justify-center px-2">
                                  <div className="flex items-center gap-3 sm:gap-4 lg:gap-4">
                                    <p className="text-white font-extrabold leading-none text-5xl sm:text-6xl md:text-7xl lg:text-6xl xl:text-7xl">
                                      <AnimatedNumber targetValue={computedData.totalMunicipios} />
                                    </p>
                                    <div className="flex flex-col items-start leading-tight">
                                      <span className="text-sky-400 text-base sm:text-lg md:text-xl lg:text-lg xl:text-xl font-semibold">
                                        {computedData.totalMunicipios === 1 ? 'Municipio' : 'Municipios'}
                                      </span>
                                      <span className="text-slate-400 text-sm sm:text-base md:text-lg lg:text-base xl:text-lg">No Polo</span>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Verso do Card */}
                              <div
                                className="absolute inset-0 w-full h-full bg-[#1e293b] rounded-lg border border-slate-700/50 p-3 flex flex-col"
                                style={{
                                  backfaceVisibility: 'hidden',
                                  transform: 'rotateX(180deg)'
                                }}
                              >
                                <div className="flex justify-end mb-0.5">
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setIsCardFlipped(false);
                                      setCurrentPage(0);
                                    }}
                                    className="text-slate-400 hover:text-white transition-colors text-sm"
                                    aria-label="Fechar lista de municipios"
                                  >
                                    ✕
                                  </button>
                                </div>

                                {/* Area compacta: todos os municipios cabem sem rolagem */}
                                <div className="flex-1 flex flex-col">
                                  <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-0.5 sm:gap-1 justify-items-stretch content-start auto-rows-min">
                                    {(() => {
                                      // Calculo de paginacao
                                      const totalMunicipios = computedData.municipiosList.length;
                                      const startIdx = currentPage * MUNICIPIOS_PER_PAGE;
                                      const endIdx = Math.min(startIdx + MUNICIPIOS_PER_PAGE, totalMunicipios);
                                      const municipiosPaginados = computedData.municipiosList.slice(startIdx, endIdx);

                                      return municipiosPaginados.map((municipio, idx) => (
                                        <button
                                          key={`${currentPage}-${idx}`}
                                          onClick={() => handleMunicipioFromCard(municipio)}
                                          className="w-full text-xs text-slate-300 py-0.5 px-1.5 truncate leading-tight bg-slate-800/60 rounded border border-slate-700/30 text-center hover:bg-sky-700/60 hover:text-sky-200 hover:border-sky-500/50 transition-all cursor-pointer font-medium"
                                          title={`Selecionar ${municipio} e pesquisar`}
                                        >
                                          {municipio}
                                        </button>
                                      ));
                                    })()}
                                  </div>

                                  {/* Controle de Paginacao Sutil */}
                                  {(() => {
                                    const totalPages = Math.ceil(computedData.municipiosList.length / MUNICIPIOS_PER_PAGE);
                                    return totalPages > 1 ? (
                                      <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-700/30">
                                        <button
                                          onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                          disabled={currentPage === 0}
                                          className="flex items-center justify-center w-6 h-6 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                          title="Pagina anterior"
                                          aria-label="Pagina anterior"
                                        >
                                          ‹
                                        </button>
                                        
                                        <span className="text-[10px] text-slate-500 font-medium">
                                          {currentPage + 1} / {totalPages}
                                        </span>
                                        
                                        <button
                                          onClick={() => setCurrentPage(prev => Math.min(totalPages - 1, prev + 1))}
                                          disabled={currentPage === totalPages - 1}
                                          className="flex items-center justify-center w-6 h-6 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                          title="Proxima pagina"
                                          aria-label="Proxima pagina"
                                        >
                                          ›
                                        </button>
                                      </div>
                                    ) : null;
                                  })()}
                                </div>
                              </div>
                            </motion.div>
                          </div>
                        ) : metric.id === 'top_municipios' ? (
                          // Card Top 3
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                            className="bg-[#1e293b] rounded-lg border border-slate-700/50 hover:bg-[#233044] transition-all duration-300 p-4 h-full"
                          >
                            <div className="flex flex-col h-full">
                              <div className="mb-3">
                                <h3 className="text-lg font-semibold text-white">{metric.title}</h3>
                                <p className="text-xs text-slate-400">{metric.description}</p>
                              </div>
                              <div className="flex-1 flex flex-col justify-center space-y-2">
                                {computedData.top3.map((municipio, idx) => (
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
                                      R$ <AnimatedMonetaryValue targetValue={municipio.valor} />
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        ) : metric.id === 'valor_polo' ? (
                          // Card Valor Total (layout especial identico ao estrategia)
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                            className="bg-[#1e293b] rounded-lg border border-slate-700/50 hover:bg-[#233044] transition-all duration-300 p-6 h-full"
                            onClick={() => setSelectedMetric(metric.id)}
                          >
                            <div className="flex flex-col h-full items-center justify-between gap-3">
                              {/* Textos centralizados no topo */}
                              <div className="text-center space-y-1 pt-1">
                                <p className="text-sm font-bold text-slate-300">{metric.subtitle}</p>
                                <p className="text-xs text-slate-500">{metric.description}</p>
                              </div>

                              {/* Valor centralizado embaixo */}
                              <div className="flex items-center justify-center flex-1">
                                <p className="font-extrabold text-emerald-400 text-2xl sm:text-3xl md:text-3xl lg:text-3xl xl:text-4xl text-center leading-tight break-words">
                                  <AnimatedCurrency targetValue={metric.value as number} />
                                </p>
                              </div>
                            </div>
                          </motion.div>
                        ) : (
                          // Cards normais (nao flip)
                          <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                            className="bg-[#1e293b] rounded-lg border border-slate-700/50 hover:bg-[#233044] transition-all duration-300 group h-full p-4"
                            onClick={() => setSelectedMetric(metric.id)}
                            tabIndex={-1}
                          >
                            <div className="flex-1 flex flex-col">
                              <div className="flex items-center min-h-[80px]">
                                <p className="font-bold text-white text-2xl">
                                  {metric.value}
                                </p>
                              </div>
                              <div className="space-y-1 mt-auto">
                                <p className="text-sm font-medium text-slate-300">{metric.subtitle}</p>
                                <p className="text-xs text-slate-500">{metric.description}</p>
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Container do Mapa */}
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                  className="mt-2 mb-2"
                >
                  <div className="h-[450px] bg-[#1e293b] rounded-xl border border-slate-700/50 overflow-hidden">
                    <MapaPolos 
                      baseMunicipios={polosData?.baseMunicipios || null}
                      municipiosRelacionamento={polosData?.municipiosRelacionamento || []}
                      selectedMunicipio={municipioSelecionado}
                      selectedUFs={appliedUFs}
                      radarFilterActive={isRadarActive}
                      poloLogisticoFilterActive={isPoloLogisticoActive}
                      pistas={pistas}
                      pistasFilterActive={isPistasActive}
                      onMunicipioClick={(codigoMunicipio) => {
                        // Atualizar seleção do município ao clicar no polígono
                        setSelectedMunicipio(codigoMunicipio);
                        // Aplicar filtros automaticamente após pequeno delay
                        setTimeout(() => {
                          setAppliedMunicipio(codigoMunicipio);
                          setAppliedUFs(selectedUFs);
                          setAppliedPolo('ALL');
                          setAppliedProducts(selectedProducts.length === Object.keys(PRODUTOS_CONFIG).length - 1 ? [] : [...selectedProducts]);
                          // Fechar dropdowns
                          setIsEstadoOpen(false);
                          setIsPoloDropdownOpen(false);
                          setIsMunicipioDropdownOpen(false);
                          setIsProdutosOpen(false);
                        }, 50);
                      }}
                    />
                  </div>
                </motion.div>
              </motion.section>

            </div>
          </div>
        </main>
      </div>

      {/* Modal de Relacionamento */}
      <RelacionamentoModal
        isOpen={isRelacionamentoModalOpen}
        onClose={async (novosCadastros) => {
          setIsRelacionamentoModalOpen(false);
          if (novosCadastros && novosCadastros > 0) {
            // Atualizar apenas relacionamentos (sem buscar GeoJSON novamente)
            await refreshRelacionamentos();
            
            const plural = novosCadastros === 1 ? 'município' : 'municípios';
            setConfettiMessage(`🎉 Você acabou de desbloquear ${novosCadastros} ${plural}! Parabéns`);
            setShowConfetti(true);
          }
        }}
        municipiosDisponiveis={
          polosData?.municipiosRelacionamento?.map(m => ({
            codigo: m.code_muni,
            nome: m.name_muni,
            UF: m.name_state
          })) || []
        }
      />

      {/* Efeito de Celebração */}
      <ConfettiEffect trigger={showConfetti} onComplete={() => setShowConfetti(false)} />
      <CelebrationMessage show={showConfetti} message={confettiMessage} onComplete={() => setShowConfetti(false)} />

      {/* Footer */}
      <MiniFooter />
      
      {/* Botao scroll to top */}
      <ScrollToTopButton />
    </div>
  );
}
