"use client";

import { useState, useEffect, useMemo, KeyboardEvent, Fragment, useRef, useCallback } from 'react';
import { useEstrategiaData } from '../../contexts/EstrategiaDataContext';
import { motion, useMotionValue, useTransform, animate } from 'framer-motion';
import Navbar from '@/components/Navbar';
import Sidebar from '@/components/Sidebar';
import MiniFooter from '@/components/MiniFooter';
import ScrollToTopButton from '@/components/ScrollToTopButton';
import dynamic from 'next/dynamic';
import { AnimatePresence } from 'framer-motion';
import { createPortal } from 'react-dom';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import { RadiusResultPayload, MunicipioRaio } from '@/components/MapLibrePolygons';
// Removido: import { fetchGeoJSONWithCache } from '@/utils/cacheGeojson';
import { UF_ABERTURA, isUFAbertura, REGIOES_BRASIL, TODAS_UFS, UF_NAMES, isRegiaoAbertura, PRODUCTS, PROD_FIELDS, ProdFieldKey } from '@/utils/mapConfig';

// Evita SSR para o mapa (MapLibre), prevenindo avisos de hidratação
const MapLibrePolygons = dynamic(() => import('@/components/MapLibrePolygons'), { ssr: false });

// Constantes e funções puras no escopo do módulo (evita realocação a cada render)
const JOAO_PESSOA_COORDS: [number, number] = [-7.14804917856058, -34.95096946933421]; // [lat, lng]
const JOAO_PESSOA_RADIUS_KM = 1300;

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
  productValues?: Record<string, number>;
  propriedadesOriginais?: Record<string, any>; // Preserva todas as propriedades originais
  // Coordenadas já fornecidas pela base (evita calcular centróide)
  latitude_munic_polo?: number;
  longitude_munic_polo?: number;
}

interface PeriferiaProps {
  codigo_origem: string;
  municipio_destino: string;
  valor_total_destino: number;
  UF?: string; // UF herdada do polo de origem (para colorização)
  // Geometria do município periférico (Polygon/MultiPolygon) vinda do GeoJSON (feature.geometry ou properties.geom)
  geom?: any;
  productValues?: Record<string, number>;
  codigo_destino?: string;
  propriedadesOriginais?: Record<string, any>; // Preserva todas as propriedades originais
  // Coordenadas já fornecidas pela base (evita calcular centróide)
  latitude_munic_periferia?: number;
  longitude_munic_periferia?: number;
}

interface MunicipioRanking {
  nome: string;
  valor: number;
}

// Municípios Sem Tag (não são polo nem periferia)
interface SemTagMunicipio {
  UF?: string;
  codigo: string;
  municipio: string;
  valor_total_sem_tag?: number;
  polo_mais_proximo?: string;
  codigo_polo?: string;
  productValues?: Record<string, number>;
}

// MapLibre não funciona no SSR; o componente MapLibrePolygons é client-only (este arquivo já é "use client")

// Componente para contagem animada de valores
function AnimatedCurrency({ targetValue, selectedPolo }: { targetValue: number; selectedPolo: string }) {
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
  const rounded = useTransform(count, (latest) => latest); // Removido Math.round para preservar decimais
  const formattedValue = useTransform(rounded, (latest) => {
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
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

// Componente de Dropdown Portal para Estados/Regiões Unificado
function EstadoDropdown({ 
  isOpen, 
  buttonRef, 
  dropdownRef, 
  selectedUFs, 
  setSelectedUFs,
  availableUFs = new Set(TODAS_UFS)
}: {
  isOpen: boolean;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  selectedUFs: string[];
  setSelectedUFs: React.Dispatch<React.SetStateAction<string[]>>;
  availableUFs?: Set<string>;
}) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4, // 4px de margem
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen, buttonRef]);

  if (!isOpen) return null;

  const dropdownContent = (
    <div 
      ref={dropdownRef}
      className="fixed bg-[#1e293b] border border-slate-600 rounded-md shadow-lg z-[9999]"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        minWidth: '250px',
        maxHeight: '400px',
        height: '400px'
      }}
    >
      <div className="h-full flex flex-col">
        {/* Header fixo */}
        <div className="p-2 border-b border-slate-700/50 flex-shrink-0 shadow-sm">
          {/* Seção TODOS */}
      <div className="px-1 py-1">
            <label className="flex items-center gap-2 py-1 px-1 hover:bg-slate-600 rounded cursor-pointer transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={selectedUFs.length === UF_ABERTURA.length && UF_ABERTURA.every(uf => selectedUFs.includes(uf))}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (checked) {
                    setSelectedUFs([...UF_ABERTURA]);
                  } else {
                    setSelectedUFs([]);
                  }
                }}
              />
              <span className="text-sm text-white font-semibold">Todos (Abertura)</span>
            </label>
            <label className="flex items-center gap-2 py-1 px-1 hover:bg-slate-600 rounded cursor-pointer transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={selectedUFs.length === TODAS_UFS.length && TODAS_UFS.every(uf => selectedUFs.includes(uf))}
                onChange={(e) => {
                  const checked = e.target.checked;
                  if (checked) {
                    setSelectedUFs([...TODAS_UFS]);
                  } else {
                    setSelectedUFs([]);
                  }
                }}
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
          </div>
        </div>
        
        {/* Área scrollável */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          {/* Seção REGIÕES */}
          <div className="px-3 py-2">
            <p className="text-[10px] tracking-wider text-slate-400 font-semibold mb-2">REGIÕES</p>
            {Object.entries(REGIOES_BRASIL).map(([regiao, ufs]) => {
              // 🆕 Filtrar apenas UFs disponíveis nesta região
              const ufsDisponiveis = ufs.filter(uf => availableUFs.has(uf));
              
              // Se não há UFs disponíveis nesta região, não renderizar
              if (ufsDisponiveis.length === 0) return null;

              const allSelected = ufsDisponiveis.every(uf => selectedUFs.includes(uf));
              const someSelected = ufsDisponiveis.some(uf => selectedUFs.includes(uf));
              const temAbertura = isRegiaoAbertura(regiao);
          return (
            <label key={regiao} className="flex items-center gap-2 py-1 px-1 hover:bg-slate-600 rounded cursor-pointer transition-colors">
              <input
                type="checkbox"
                className="w-4 h-4"
                checked={allSelected}
                ref={(el) => {
                  if (el) el.indeterminate = someSelected && !allSelected;
                }}
                onChange={(e) => {
                  const checked = e.target.checked;
                      setSelectedUFs((prev: string[]) => {
                    const setPrev = new Set(prev);
                    if (checked) {
                      ufsDisponiveis.forEach(uf => setPrev.add(uf));
                    } else {
                      ufsDisponiveis.forEach(uf => setPrev.delete(uf));
                    }
                    return Array.from(setPrev);
                  });
                }}
              />
                  <span className="text-sm text-white">
                    {regiao}{temAbertura ? <span className="text-sky-400"> (Abertura)</span> : ''}
                  </span>
            </label>
          );
        })}
      </div>
          
          <div className="mx-3 border-t border-slate-700/50" />
          
      {/* Seção ESTADOS */}
          <div className="px-3 py-2">
            <p className="text-[10px] tracking-wider text-slate-400 font-semibold mb-2">ESTADOS</p>
            {TODAS_UFS.map(uf => {
              // 🆕 Filtrar apenas UFs disponíveis
              if (!availableUFs.has(uf)) return null;

              const temAbertura = isUFAbertura(uf);
              return (
          <label key={uf} className="flex items-center gap-2 py-1 px-1 hover:bg-slate-600 rounded cursor-pointer transition-colors">
            <input
              type="checkbox"
              className="w-4 h-4"
                    checked={selectedUFs.includes(uf)}
              onChange={(e) => {
                const checked = e.target.checked;
                      setSelectedUFs((prev: string[]) => {
                  const next = new Set(prev);
                  if (checked) next.add(uf); else next.delete(uf);
                  return Array.from(next);
                });
              }}
            />
                  <span className="text-sm text-white">
                    {UF_NAMES[uf] || uf}{temAbertura ? <span className="text-sky-400"> (Abertura)</span> : ''}
                  </span>
          </label>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );

  // Renderizar via portal no body
  return typeof window !== 'undefined' ? createPortal(dropdownContent, document.body) : null;
}

// Componente de Combobox para busca
function Combobox({
  value,
  onChange,
  options,
  placeholder,
  buttonRef,
  dropdownRef,
  isOpen,
  setIsOpen,
  label,
  disabled = false
}: {
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder: string;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  label: string;
  disabled?: boolean;
}) {
  const [searchTerm, setSearchTerm] = useState('');

  // Filtrar opções baseado no termo de busca
  const filteredOptions = useMemo(() => {
    if (!searchTerm) return options;
    return options.filter(option =>
      option.label.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [options, searchTerm]);

  // Reset search quando fecha
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  const selectedOption = options.find(opt => opt.value === value);

  return (
    <div className="flex flex-col">
      <label className="text-slate-300 text-sm mb-0.5 text-center font-bold">{label}</label>
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`bg-[#0f172a] text-slate-200 border border-slate-700/50 rounded-md px-3 py-1.5 text-left flex items-center justify-between min-h-[40px] ${
          disabled
            ? 'opacity-50 cursor-not-allowed'
            : 'hover:bg-[#1a2332] cursor-pointer focus:outline-none focus:ring-2 focus:ring-sky-500'
        }`}
      >
        <span className="text-sm truncate">
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
        </svg>
      </button>

      {isOpen && !disabled && typeof window !== 'undefined' && createPortal((
        <div
          ref={dropdownRef}
          className="fixed bg-[#0f172a] border border-slate-700/70 rounded-md shadow-lg z-[9999]"
          style={{
            top: ((buttonRef.current?.getBoundingClientRect()?.bottom || 0) + window.scrollY + 4),
            left: ((buttonRef.current?.getBoundingClientRect()?.left || 0) + window.scrollX),
            width: buttonRef.current?.getBoundingClientRect()?.width,
            minWidth: '280px',
            maxHeight: '300px',
            height: '300px'
          }}
        >
          <div className="h-full flex flex-col">
            {/* Campo de busca */}
            <div className="p-2 border-b border-slate-700/50 flex-shrink-0">
              <input
                type="text"
                placeholder="Buscar..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-slate-800/50 text-slate-200 border border-slate-600/50 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                autoFocus
              />
            </div>

            {/* Área scrollável */}
            <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
              <div className="px-3 py-2">
                <p className="text-[10px] tracking-wider text-slate-400 font-semibold mb-2">{label.toUpperCase()}</p>
                {filteredOptions.map(option => (
                  <label key={option.value} className="flex items-center gap-2 py-1 px-1 hover:bg-slate-800/50 rounded cursor-pointer">
                    <input
                      type="radio"
                      name={`combobox-${label}`}
                      className="w-4 h-4"
                      checked={value === option.value}
                      onChange={() => {
                        onChange(option.value);
                        setIsOpen(false);
                      }}
                    />
                    <span className="text-sm text-white">{option.label}</span>
                  </label>
                ))}
                {filteredOptions.length === 0 && searchTerm && (
                  <div className="text-xs text-slate-500 text-center py-4">
                    Nenhum resultado encontrado para "{searchTerm}"
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ), document.body)}
    </div>
  );
}

// Componente para dropdown de Municípios Periféricos
function MunicipioPerifericoDropdown({
  isOpen,
  buttonRef,
  dropdownRef,
  selectedMunicipio,
  setSelectedMunicipio,
  periferiasDisponiveis
}: {
  isOpen: boolean;
  buttonRef: React.RefObject<HTMLButtonElement | null>;
  dropdownRef: React.RefObject<HTMLDivElement | null>;
  selectedMunicipio: string;
  setSelectedMunicipio: React.Dispatch<React.SetStateAction<string>>;
  periferiasDisponiveis: PeriferiaProps[];
}) {
  const [position, setPosition] = useState({ top: 0, left: 0, width: 0 });
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setPosition({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
        width: rect.width
      });
    }
  }, [isOpen, buttonRef]);

  // Reset search quando fecha
  useEffect(() => {
    if (!isOpen) {
      setSearchTerm('');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  // Ordenar periferias alfabeticamente por município e filtrar por busca
  const periferiasOrdenadas = [...periferiasDisponiveis]
    .filter(peri =>
      peri.municipio_destino.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) =>
    a.municipio_destino.localeCompare(b.municipio_destino, 'pt-BR')
  );

  const dropdownContent = (
    <div
      ref={dropdownRef}
      className="fixed bg-[#0f172a] border border-slate-700/70 rounded-md shadow-lg z-[9999]"
      style={{
        top: position.top,
        left: position.left,
        width: position.width,
        minWidth: '280px',
        maxHeight: '300px',
        height: '300px'
      }}
    >
      <div className="h-full flex flex-col">
        {/* Header fixo - Limpar Seleção */}
        <div className="p-2 border-b border-slate-700/50 flex-shrink-0">
          <button
            onClick={() => setSelectedMunicipio('ALL')}
            className="flex items-center gap-2 py-1 px-1 hover:bg-slate-800/50 rounded cursor-pointer w-full text-left"
          >
            <div className="w-4 h-4 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <span className="text-sm text-red-400 font-semibold">Limpar Seleção</span>
          </button>
        </div>

        {/* Campo de busca */}
        <div className="p-2 border-b border-slate-700/50 flex-shrink-0">
          <input
            type="text"
            placeholder="Buscar município..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-slate-800/50 text-slate-200 border border-slate-600/50 rounded-md px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
            autoFocus
          />
        </div>

        {/* Área scrollável */}
        <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800">
          <div className="px-3 py-2">
            <p className="text-[10px] tracking-wider text-slate-400 font-semibold mb-2">MUNICÍPIOS PERIFÉRICOS</p>
            {periferiasOrdenadas.map(peri => (
              <label key={peri.codigo_destino || peri.municipio_destino} className="flex items-center gap-2 py-1 px-1 hover:bg-slate-800/50 rounded cursor-pointer">
                <input
                  type="radio"
                  name="municipio-periferico"
                  className="w-4 h-4"
                  checked={selectedMunicipio === (peri.codigo_destino || peri.municipio_destino)}
                  onChange={() => setSelectedMunicipio(peri.codigo_destino || peri.municipio_destino)}
                />
                <div className="flex flex-col leading-tight">
                  <span className="text-sm text-white font-medium">{peri.municipio_destino}</span>
                  <span className="text-xs text-slate-400">{peri.UF}</span>
                </div>
                <div className="ml-auto text-right">
                  <span className="text-xs text-emerald-400 font-medium">
                    R$ {new Intl.NumberFormat('pt-BR', { maximumFractionDigits: 0 }).format(peri.valor_total_destino || 0)}
                  </span>
                </div>
              </label>
            ))}
            {periferiasOrdenadas.length === 0 && (
              <div className="text-xs text-slate-500 text-center py-4">
                {searchTerm ? `Nenhum município encontrado para "${searchTerm}"` : 'Nenhum município periférico encontrado para este polo'}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // Renderizar via portal no body
  return typeof window !== 'undefined' ? createPortal(dropdownContent, document.body) : null;
}

export default function EstrategiaPage() {
  // Loga apenas uma vez no mount real (evita confundir re-render com remount)
  useEffect(() => {
    console.log('📊 [EstrategiaPage] Componente montado');
  }, []);

  // 🔥 USANDO O NOVO CONTEXTO - Resolve problema de remount-triggered fetching
  const { estrategiaData, loading: loadingData, error: errorData } = useEstrategiaData();

  const [selectedMetric, setSelectedMetric] = useState('overview');
  const [showMunicipiosList, setShowMunicipiosList] = useState(false);
  const [isCardFlipped, setIsCardFlipped] = useState(false);

  // Filtros selecionados (não aplicados ainda)
  const [selectedPolo, setSelectedPolo] = useState<string>('ALL');
  const [selectedMunicipioPeriferico, setSelectedMunicipioPeriferico] = useState<string>('ALL');
  const [minValor, setMinValor] = useState<number | ''>('');
  const [maxValor, setMaxValor] = useState<number | ''>('');
  // Filtro de Produtos (por padrão todos selecionados)
  const [selectedProducts, setSelectedProducts] = useState<string[]>(PRODUCTS.map(p => p.key));
  const [isProdutosOpen, setIsProdutosOpen] = useState<boolean>(false);
  const produtosButtonRef = useRef<HTMLButtonElement>(null);
  const produtosDropdownRef = useRef<HTMLDivElement>(null);
  // Filtro de Estados/Regiões unificado: iniciar com "Todos (Abertura)"
  const [selectedUFs, setSelectedUFs] = useState<string[]>([...UF_ABERTURA]);
  const [isEstadoOpen, setIsEstadoOpen] = useState<boolean>(false);
  const estadoButtonRef = useRef<HTMLButtonElement>(null);
  const estadoDropdownRef = useRef<HTMLDivElement>(null);
  // Filtro de Municípios Periféricos
  const [isPeriferiaOpen, setIsPeriferiaOpen] = useState<boolean>(false);
  const periferiaDropdownRef = useRef<HTMLDivElement>(null);

  // Base dos Municípios Sem Tag (para incluir no filtro "MUNICÍPIOS PRÓXIMO")
  const [semTagMunicipios, setSemTagMunicipios] = useState<SemTagMunicipio[]>([]);

  // Filtros aplicados (após clicar em buscar)
  const [appliedUF, setAppliedUF] = useState<string>('ALL'); // Mantido para compatibilidade com mapa
  const [appliedPolo, setAppliedPolo] = useState<string>('ALL');
  const [appliedMunicipioPeriferico, setAppliedMunicipioPeriferico] = useState<string>('ALL');
  // Município Sem Tag aplicado (quando selecionado em MUNICÍPIOS PRÓXIMO)
  const [appliedSemTagMunicipio, setAppliedSemTagMunicipio] = useState<string>('ALL');
  const [appliedMinValor, setAppliedMinValor] = useState<number | ''>('');
  const [appliedMaxValor, setAppliedMaxValor] = useState<number | ''>('');
  const [appliedUFs, setAppliedUFs] = useState<string[]>([...UF_ABERTURA]); // Inicia aplicado com "Todos (Abertura)"
  const [appliedProducts, setAppliedProducts] = useState<string[]>([]);

  // Estados para inputs de busca
  const [poloInputValue, setPoloInputValue] = useState<string>('');
  const [periferiaInputValue, setPeriferiaInputValue] = useState<string>('');
  const [isPoloDropdownOpen, setIsPoloDropdownOpen] = useState<boolean>(false);
  const [isPeriferiaDropdownOpen, setIsPeriferiaDropdownOpen] = useState<boolean>(false);
  const poloInputRef = useRef<HTMLDivElement>(null);

  // Estado para filtro de João Pessoa (raio de 1.300km)
  const [isJoaoPessoaFilterActive, setIsJoaoPessoaFilterActive] = useState<boolean>(false);

  // 🆕 Estados para controlar periferias com múltiplos polos
  const [showPoloSelectionWarning, setShowPoloSelectionWarning] = useState<boolean>(false);
  const [filteredPolosByPeriferia, setFilteredPolosByPeriferia] = useState<string[]>([]);

  // Estado dos dados processados do contexto
  const [polosValores, setPolosValores] = useState<PoloValoresProps[]>([]);
  const [periferia, setPeriferia] = useState<PeriferiaProps[]>([]);

  // Estado para paginação do card de municípios
  const [currentPage, setCurrentPage] = useState(0);
  const MUNICIPIOS_PER_PAGE = 10;

  // Estado para controlar tooltip do Radar Estratégico
  const [showRadarTooltip, setShowRadarTooltip] = useState(false);

  // Estado para dados do raio (usado nas exportações)
  const [radiusPayload, setRadiusPayload] = useState<RadiusResultPayload | null>(null);

  // Coordenadas e função de distância movidas para escopo do módulo (ver topo do arquivo)

  // Função para extrair coordenadas do centroide de uma geometria
  const getCentroid = (geom: any): [number, number] | null => {
    if (!geom || !geom.coordinates) return null;
    
    try {
      if (geom.type === 'Point') {
        return [geom.coordinates[1], geom.coordinates[0]]; // [lat, lng]
      } else if (geom.type === 'Polygon') {
        const coords = geom.coordinates[0];
        let latSum = 0, lngSum = 0;
        for (const coord of coords) {
          lngSum += coord[0];
          latSum += coord[1];
        }
        return [latSum / coords.length, lngSum / coords.length];
      } else if (geom.type === 'MultiPolygon') {
        const firstPolygon = geom.coordinates[0][0];
        let latSum = 0, lngSum = 0;
        for (const coord of firstPolygon) {
          lngSum += coord[0];
          latSum += coord[1];
        }
        return [latSum / firstPolygon.length, lngSum / firstPolygon.length];
      }
    } catch (error) {
      console.warn('Erro ao calcular centroide:', error);
    }
    return null;
  };

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
      const origemMissingSamples: Array<{ codigo: string; key: string }> = [];
      const destinoMissingSamples: Array<{ codigo: string; key: string }> = [];

      const valoresJson = estrategiaData.poloValores;
      const periferiaJson = estrategiaData.poloPeriferia;

      // Agrega valores de ORIGEM por produto a partir de poloPeriferia
      const origemAggByCodigo = new Map<string, Record<string, number>>();
      if (Array.isArray(periferiaJson?.features)) {
        for (const f of periferiaJson.features as any[]) {
          const codigo = String(f?.properties?.codigo_origem ?? '');
          if (!codigo) continue;
          if (!origemAggByCodigo.has(codigo)) origemAggByCodigo.set(codigo, {});
          const bucket = origemAggByCodigo.get(codigo)!;
          for (const p of PRODUCTS as any) {
            const origemKey = (p as any).origemvalorKey as string | null;
            if (!origemKey) continue;
            const raw = f?.properties?.[origemKey];
            const val = parsePtBrNumber(raw);
            bucket[p.key] = (bucket[p.key] || 0) + val;
          }
        }
      }

      const valores: PoloValoresProps[] = Array.isArray(valoresJson?.features)
        ? valoresJson.features.map((f: any) => {
            const codigo = String(f?.properties?.codigo_origem ?? '');
            const agg = origemAggByCodigo.get(codigo);
            const produtoValuesFromAgg: Record<string, number> | null = agg ? Object.keys(agg).reduce((o: Record<string, number>, k) => {
              o[k] = Number(agg[k] || 0);
              return o;
            }, {}) : null;

            return {
              codigo_origem: codigo,
              municipio_origem: String(f?.properties?.municipio_origem ?? ''),
              soma_valor_total_destino: parsePtBrNumber(f?.properties?.soma_valor_total_destino),
              valor_total_origem: parsePtBrNumber(f?.properties?.valor_total_origem),
              UF_origem: String(f?.properties?.UF_origem ?? ''),
              UF: String(f?.properties?.UF_origem ?? ''), // normaliza para UF
              // Preserve a geometria (prioriza feature.geometry; fallback para properties.geom)
              geom: f?.geometry ?? f?.properties?.geom ?? null,
              // Coordenadas diretas do polo (se fornecidas na base)
              latitude_munic_polo: f?.properties?.latitude_munic_polo != null ? Number(f.properties.latitude_munic_polo) : undefined,
              longitude_munic_polo: f?.properties?.longitude_munic_polo != null ? Number(f.properties.longitude_munic_polo) : undefined,
              // Preferir agregação vinda da periferia; fallback para ler direto de poloValores quando não houver
              productValues: produtoValuesFromAgg ?? PRODUCTS.reduce((acc: Record<string, number>, p) => {
                const origemvalorKey = (p as any).origemvalorKey as string | null;
                if (origemvalorKey) {
                  const raw = f?.properties?.[origemvalorKey];
                  if ((raw === undefined || raw === null) && origemMissingSamples.length < 8) {
                    origemMissingSamples.push({ codigo, key: origemvalorKey });
                  }
                  acc[p.key] = parsePtBrNumber(raw);
                } else {
                  acc[p.key] = 0;
                }
                return acc;
              }, {}),
              // Preserva TODAS as propriedades originais para acesso posterior
              propriedadesOriginais: f?.properties || {},
            } as PoloValoresProps;
          })
        : [];

      const peri: PeriferiaProps[] = Array.isArray(periferiaJson?.features)
        ? periferiaJson.features.map((f: any) => ({
            codigo_origem: String(f?.properties?.codigo_origem ?? ''),
            municipio_destino: String(f?.properties?.municipio_destino ?? ''),
            valor_total_destino: parsePtBrNumber(f?.properties?.valor_total_destino),
            ...(f?.properties?.codigo_destino ? { codigo_destino: String(f.properties.codigo_destino) } : {}),
            // Preserve a geometria
            geom: f?.geometry ?? f?.properties?.geom ?? null,
            // Coordenadas diretas da periferia (se fornecidas na base)
            latitude_munic_periferia: f?.properties?.latitude_munic_periferia != null ? Number(f.properties.latitude_munic_periferia) : undefined,
            longitude_munic_periferia: f?.properties?.longitude_munic_periferia != null ? Number(f.properties.longitude_munic_periferia) : undefined,
            productValues: PRODUCTS.reduce((acc: Record<string, number>, p) => {
              // Para periferias, usar somente valores de DESTINO
              const destinoKey = (p as any).destinovalorKey as string;
              const raw = f?.properties?.[destinoKey];
              if ((raw === undefined || raw === null) && destinoMissingSamples.length < 8) {
                destinoMissingSamples.push({ codigo: String(f?.properties?.codigo_origem ?? ''), key: destinoKey });
              }
              acc[p.key] = parsePtBrNumber(raw);
              return acc;
            }, {}),
            // Preserva TODAS as propriedades originais para acesso posterior
            propriedadesOriginais: f?.properties || {},
          }))
        : [];

      if (origemMissingSamples.length) {
        console.warn('⚠️ [EstrategiaPage] Valores de origem ausentes/nulos identificados', origemMissingSamples);
      }

      if (destinoMissingSamples.length) {
        console.warn('⚠️ [EstrategiaPage] Valores de destino ausentes/nulos identificados', destinoMissingSamples);
      }

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

  // Carregar base dos municípios Sem Tag para o filtro de "MUNICÍPIOS PRÓXIMO"
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const resp = await fetch('/api/proxy-geojson/municipios_sem_tag.json', { cache: 'force-cache' });
        if (!resp.ok) return;
        const json = await resp.json();

        if (cancelled) return;

        const items: SemTagMunicipio[] = [];
        const pushItem = (props: any) => {
          const it: SemTagMunicipio = {
            UF: props?.UF,
            codigo: String(props?.codigo || props?.codigo_ibge || ''),
            municipio: String(props?.municipio || ''),
            valor_total_sem_tag: Number(props?.valor_total_sem_tag || 0),
            polo_mais_proximo: props?.polo_mais_proximo ? String(props.polo_mais_proximo) : undefined,
            codigo_polo: props?.codigo_polo ? String(props.codigo_polo) : undefined,
            productValues: {
              VALOR_PD: Number(props?.valor_pd_num_sem_tag || 0),
              VALOR_PMBSB: Number(props?.valor_pmsb_num_sem_tag || 0),
              VALOR_CTM: Number(props?.valor_ctm_num_sem_tag || 0),
              VALOR_DEC_AMBIENTAL: Number(props?.VALOR_DEC_AMBIENTAL_NUM_sem_tag || 0),
              VALOR_PLHIS: Number(props?.PLHIS_sem_tag || 0),
              VALOR_START: Number(props?.valor_start_iniciais_finais_sem_tag || 0),
              VALOR_LIVRO: Number(props?.LIVRO_FUND_1_2_sem_tag || 0),
              VALOR_PVA: Number(props?.PVA_sem_tag || 0),
              VALOR_EDUCAGAME: Number(props?.educagame_sem_tag || 0),
              VALOR_REURB: Number(props?.valor_reurb_sem_tag || 0),
              VALOR_DESERT: Number(props?.VALOR_DESERT_NUM_sem_tag || 0),
            }
          };
          if (it.codigo && it.municipio) items.push(it);
        };

        if (Array.isArray(json)) {
          json.forEach(pushItem);
        } else if (json?.type === 'FeatureCollection' && Array.isArray(json.features)) {
          json.features.forEach((f: any) => pushItem(f?.properties || {}));
        } else if (Array.isArray(json?.data || json?.items)) {
          (json.data || json.items).forEach(pushItem);
        }

        setSemTagMunicipios(items);
      } catch (e) {
        console.warn('Não foi possível carregar municipios_sem_tag.json para o filtro:', e);
      }
    };
    load();
    return () => { cancelled = true; };
  }, []);

  // Função para filtrar municípios dentro do raio de João Pessoa
  const filterByJoaoPessoaRadius = useCallback((municipios: (PoloValoresProps | PeriferiaProps)[]) => {
    if (!isJoaoPessoaFilterActive) return municipios;

    return municipios.filter(municipio => {
      // Preferir coordenadas diretas, evitando cálculo de centróide
      let lat: number | undefined;
      let lon: number | undefined;

      const asAny = municipio as any;
      if (typeof asAny.latitude_munic_polo === 'number' && typeof asAny.longitude_munic_polo === 'number') {
        lat = asAny.latitude_munic_polo;
        lon = asAny.longitude_munic_polo;
      } else if (typeof asAny.latitude_munic_periferia === 'number' && typeof asAny.longitude_munic_periferia === 'number') {
        lat = asAny.latitude_munic_periferia;
        lon = asAny.longitude_munic_periferia;
      } else {
        // Fallback raro: tenta centróide se não houver coordenadas na base
        const centroid = getCentroid((municipio as any).geom);
        if (!centroid) return false;
        lat = centroid[0];
        lon = centroid[1];
      }

      const distance = calculateDistance(
        JOAO_PESSOA_COORDS[0], JOAO_PESSOA_COORDS[1],
        lat!, lon!
      );

      return distance <= JOAO_PESSOA_RADIUS_KM;
    });
  }, [isJoaoPessoaFilterActive]);

  // Soma produtos selecionados com fallback para total quando nenhum produto aplicado
  const sumSelectedProducts = (vals: Record<string, number> | undefined, fallbackTotal: number): number => {
    if (!vals) return fallbackTotal || 0;
    if (!appliedProducts.length) return fallbackTotal || 0;
    // Quando todos os produtos estiverem selecionados, retorna o valor consolidado (fallbackTotal)
    if (appliedProducts.length === PRODUCTS.length) return fallbackTotal || 0;
    let total = 0;
    for (const key of appliedProducts) {
      const val = Number(vals[key] || 0);
      total += val;
    }
    if (total === 0 && appliedProducts.length === PRODUCTS.length) {
      console.warn('⚠️ [EstrategiaPage] Soma de produtos resultou em 0 com todos os produtos aplicados. Aplicando fallback.', {
        fallbackTotal,
      });
      return fallbackTotal || 0;
    }
    return total;
  };

  // Agregação por polo (codigo_origem) a partir da periferia filtrada
  const periferiaAggByCodigo = useMemo(() => {
    const ufUpper = String(appliedUF || '').toUpperCase();
    const inUFMode = appliedPolo === 'ALL' && ufUpper !== 'ALL' && ufUpper !== '';
    const inPoloMode = appliedPolo !== 'ALL';
    let base = periferia as PeriferiaProps[];
    if (appliedUFs.length) base = base.filter(p => appliedUFs.includes(String(p.UF)));
    if (inPoloMode) base = base.filter(p => p.codigo_origem === appliedPolo);
    else if (inUFMode) base = base.filter(p => String(p.UF || '').toUpperCase() === ufUpper);
    
    // Aplicar filtro de João Pessoa se ativo
    base = filterByJoaoPessoaRadius(base) as PeriferiaProps[];
    
    const map = new Map<string, number>();
    for (const f of base) {
      const agg = sumSelectedProducts(f.productValues, Number(f.valor_total_destino) || 0);
      map.set(f.codigo_origem, (map.get(f.codigo_origem) || 0) + agg);
    }
    return map;
  }, [periferia, appliedUFs, appliedPolo, appliedUF, appliedProducts, filterByJoaoPessoaRadius]);

  // Função para formatar valores monetários
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(value);
  };

  // Opções de polo vindas da base real (filtradas por João Pessoa se ativo)
  const poloOptions = useMemo(() => {
    const seen = new Set<string>();
    let base = selectedUFs.length
      ? polosValores.filter(p => selectedUFs.includes(String(p.UF || p.UF_origem)))
      : polosValores;
    
    // Aplicar filtro de João Pessoa se ativo
    base = filterByJoaoPessoaRadius(base) as PoloValoresProps[];
    
    const opts = base
      .filter(p => {
        if (!p.codigo_origem) return false;
        if (seen.has(p.codigo_origem)) return false;
        seen.add(p.codigo_origem);
        return true;
      })
      .map(p => ({ value: p.codigo_origem, label: p.municipio_origem }));
    // Ordena alfabeticamente pelo label
    return opts.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [polosValores, selectedUFs, filterByJoaoPessoaRadius]);

  // 🆕 UFs disponíveis quando o filtro de João Pessoa está ativo
  const availableUFsWithRadiusFilter = useMemo(() => {
    if (!isJoaoPessoaFilterActive) {
      // Se o raio não está ativo, retornar todos os UFs
      return new Set(TODAS_UFS);
    }

    // Se o raio está ativo, retornar apenas os UFs que têm polos dentro do raio
    const ufsWithinRadius = new Set<string>();

    for (const polo of polosValores) {
      let lat: number | undefined = polo.latitude_munic_polo;
      let lon: number | undefined = polo.longitude_munic_polo;
      if (typeof lat !== 'number' || typeof lon !== 'number') {
        // Fallback eventual
        const centroid = getCentroid(polo.geom);
        if (centroid) {
          lat = centroid[0];
          lon = centroid[1];
        }
      }
      if (typeof lat !== 'number' || typeof lon !== 'number') continue;

      const distance = calculateDistance(
        JOAO_PESSOA_COORDS[0], JOAO_PESSOA_COORDS[1],
        lat, lon
      );

      if (distance <= JOAO_PESSOA_RADIUS_KM) {
        const uf = String(polo.UF || polo.UF_origem || '').toUpperCase();
        if (uf) ufsWithinRadius.add(uf);
      }
    }

    return ufsWithinRadius;
  }, [polosValores, isJoaoPessoaFilterActive]);

  // 🆕 Mapa de periferias para seus polos (pre-computado para performance) - SIMPLIFICADO
  const periferiaToPolosMap = useMemo(() => {
    const map = new Map<string, Array<{ codigo_origem: string; municipio_origem: string }>>();

    let base = selectedUFs.length
      ? periferia.filter(p => selectedUFs.includes(String(p.UF)))
      : periferia;

    // Aplicar filtro de João Pessoa se ativo
    base = filterByJoaoPessoaRadius(base) as PeriferiaProps[];

    for (const peri of base) {
      const codigoDestino = peri.codigo_destino || peri.municipio_destino;
      if (!codigoDestino) continue;

      if (!map.has(codigoDestino)) {
        map.set(codigoDestino, []);
      }

      // Encontrar o município polo correspondente
      const polo = polosValores.find(p => p.codigo_origem === peri.codigo_origem);
      if (polo) {
        const existingPolo = map.get(codigoDestino)!.find(p => p.codigo_origem === peri.codigo_origem);
        if (!existingPolo) {
          map.get(codigoDestino)!.push({
            codigo_origem: peri.codigo_origem,
            municipio_origem: polo.municipio_origem
          });
        }
      }
    }

    return map;
  }, [periferia, polosValores, selectedUFs, filterByJoaoPessoaRadius]);

  // 🆕 Lista única de municípios periféricos (sem duplicatas)
  const municipiosPerifericosUnicos = useMemo(() => {
    const uniqueMunicipios = new Map<string, PeriferiaProps>();

    let base = selectedUFs.length
      ? periferia.filter(p => selectedUFs.includes(String(p.UF)))
      : periferia;

    // Aplicar filtro de João Pessoa se ativo
    base = filterByJoaoPessoaRadius(base) as PeriferiaProps[];

    // Quando "Todos os Polos" está selecionado, mostrar TODAS as periferias (sem duplicatas)
    if (selectedPolo === 'ALL') {
      for (const peri of base) {
        const codigoDestino = peri.codigo_destino || peri.municipio_destino;
        if (!codigoDestino) continue;

        // Mantém apenas a primeira ocorrência de cada município
        if (!uniqueMunicipios.has(codigoDestino)) {
          uniqueMunicipios.set(codigoDestino, peri);
        }
      }
    } else {
      // Quando um polo específico está selecionado, mostrar apenas periferias desse polo
      for (const peri of base) {
        if (peri.codigo_origem === selectedPolo) {
          const codigoDestino = peri.codigo_destino || peri.municipio_destino;
          if (!codigoDestino) continue;

          if (!uniqueMunicipios.has(codigoDestino)) {
            uniqueMunicipios.set(codigoDestino, peri);
          }
        }
      }
    }

    return Array.from(uniqueMunicipios.values());
  }, [periferia, selectedUFs, selectedPolo, filterByJoaoPessoaRadius]);


  // Polos filtrados baseado no input de busca
  const polosFiltrados = useMemo(() => {
    // Determinar se existe uma periferia selecionada com múltiplos polos relacionados
    let restrictedCodes: string[] = [];
    if (showPoloSelectionWarning && filteredPolosByPeriferia.length > 0) {
      // Estado explícito de aviso já fornece a lista restrita
      restrictedCodes = filteredPolosByPeriferia;
    } else if (selectedMunicipioPeriferico !== 'ALL') {
      // Restringir com base no município periférico selecionado (persistente mesmo após escolher/limpar o polo)
      const relacionados = periferiaToPolosMap.get(String(selectedMunicipioPeriferico)) || [];
      if (relacionados.length > 1) {
        restrictedCodes = relacionados.map(p => p.codigo_origem);
      }
    }

    if (restrictedCodes.length > 0) {
      const base = poloOptions.filter(polo => restrictedCodes.includes(polo.value));

      // Ordenar por distância apenas quando uma periferia estiver selecionada e houver múltiplos polos
      let sorted = base;
      if (selectedMunicipioPeriferico !== 'ALL' && restrictedCodes.length > 1) {
        const selectedPeri = periferia.find(p => String(p.codigo_destino || p.municipio_destino) === String(selectedMunicipioPeriferico));
        const periLat = selectedPeri?.latitude_munic_periferia;
        const periLon = selectedPeri?.longitude_munic_periferia;

        if (typeof periLat === 'number' && typeof periLon === 'number') {
          sorted = [...base].sort((a, b) => {
            const poloA = polosValores.find(p => p.codigo_origem === a.value);
            const poloB = polosValores.find(p => p.codigo_origem === b.value);
            const dA = (poloA && typeof poloA.latitude_munic_polo === 'number' && typeof poloA.longitude_munic_polo === 'number')
              ? calculateDistance(periLat, periLon, poloA.latitude_munic_polo!, poloA.longitude_munic_polo!)
              : Number.POSITIVE_INFINITY;
            const dB = (poloB && typeof poloB.latitude_munic_polo === 'number' && typeof poloB.longitude_munic_polo === 'number')
              ? calculateDistance(periLat, periLon, poloB.latitude_munic_polo!, poloB.longitude_munic_polo!)
              : Number.POSITIVE_INFINITY;
            return dA - dB;
          });
        }
      }

      if (!poloInputValue.trim()) return sorted;
      return sorted.filter(polo => polo.label.toLowerCase().includes(poloInputValue.toLowerCase()));
    }

    if (!poloInputValue.trim()) return poloOptions;
    return poloOptions.filter(polo =>
      polo.label.toLowerCase().includes(poloInputValue.toLowerCase())
    );
  }, [poloOptions, poloInputValue, showPoloSelectionWarning, filteredPolosByPeriferia, selectedMunicipioPeriferico, periferiaToPolosMap, periferia, polosValores]);

  // Periferias filtradas baseado no input de busca e filtro de João Pessoa - SIMPLIFICADO
  const periferiasFiltradas = useMemo(() => {
    let base = municipiosPerifericosUnicos;

    if (!periferiaInputValue.trim()) return base;
    return base.filter(peri =>
      peri.municipio_destino.toLowerCase().includes(periferiaInputValue.toLowerCase())
    );
  }, [municipiosPerifericosUnicos, periferiaInputValue]);

  // Lista combinada para o filtro "MUNICÍPIOS PRÓXIMO": periferias + sem tag
  type MunicipioProximoItem =
    | { tipo: 'periferia'; id: string; nome: string; UF: string; valor?: number; codigo_origem?: string }
    | { tipo: 'semTag'; id: string; nome: string; UF: string; valor?: number; poloMaisProximo?: string };

  const municipiosProximosFiltrados = useMemo(() => {
    const normalize = (s: string) => s ? s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim() : '';

    const perif: MunicipioProximoItem[] = (periferiasFiltradas || []).map(p => ({
      tipo: 'periferia' as const,
      id: String(p.codigo_destino || p.municipio_destino),
      nome: p.municipio_destino,
      UF: String(p.UF || ''),
      valor: Number(p.valor_total_destino || 0),
      codigo_origem: p.codigo_origem,
    }));

    // Filtrar sem tag pela seleção de UFs quando houver
    const baseSemTag = selectedUFs.length
      ? semTagMunicipios.filter(s => selectedUFs.includes(String(s.UF || '')))
      : semTagMunicipios;

    const term = (periferiaInputValue || '').toLowerCase();
    let semTagFiltered = (!term ? baseSemTag : baseSemTag.filter(s => s.municipio.toLowerCase().includes(term)));

    // Se um polo estiver selecionado, manter apenas Sem Tag cujo polo_mais_proximo corresponda ao nome do polo
    if (selectedPolo !== 'ALL') {
      const selectedLabel = (poloOptions.find(o => o.value === selectedPolo)?.label) || '';
      if (selectedLabel) {
        const poloNorm = normalize(selectedLabel);
        semTagFiltered = semTagFiltered.filter(s => normalize(String(s.polo_mais_proximo || '')) === poloNorm);
      }
    }

    const semTag: MunicipioProximoItem[] = semTagFiltered.map(s => ({
      tipo: 'semTag' as const,
      id: s.codigo,
      nome: s.municipio,
      UF: String(s.UF || ''),
      valor: Number(s.valor_total_sem_tag || 0),
      poloMaisProximo: s.polo_mais_proximo,
    }));

    // Ordenar alfabeticamente dentro de cada grupo, mantendo periferias primeiro
    perif.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    semTag.sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
    return [...perif, ...semTag];
  }, [periferiasFiltradas, semTagMunicipios, selectedUFs, periferiaInputValue, selectedPolo, poloOptions]);

  // Opções filtradas por UFs selecionadas e filtro de João Pessoa (para o select de POLO)
  const filteredPoloOptions = useMemo(() => {
    let base = selectedUFs.length
      ? polosValores.filter(p => selectedUFs.includes(String(p.UF || p.UF_origem)))
      : polosValores;
    
    // Aplicar filtro de João Pessoa se ativo
    base = filterByJoaoPessoaRadius(base) as PoloValoresProps[];
    
    const seen = new Set<string>();
    const opts = base
      .filter(p => {
        if (!p.codigo_origem) return false;
        if (seen.has(p.codigo_origem)) return false;
        seen.add(p.codigo_origem);
        return true;
      })
      .map(p => ({ value: p.codigo_origem, label: p.municipio_origem }));
    return opts.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'));
  }, [selectedUFs, polosValores, filterByJoaoPessoaRadius]);

  // Resetar polo selecionado caso UFs mudem e o polo atual não exista mais
  useEffect(() => {
    if (selectedPolo === 'ALL') return;
    const exists = filteredPoloOptions.some(o => o.value === selectedPolo);
    if (!exists) setSelectedPolo('ALL');
  }, [selectedUFs, filteredPoloOptions, selectedPolo]);

  // Opções de municípios periféricos filtrados por polo selecionado e filtro de João Pessoa
  const filteredPeriferiaOptions = useMemo(() => {
    if (selectedPolo === 'ALL') return [];
    let base = selectedUFs.length
      ? periferia.filter(p => selectedUFs.includes(String(p.UF)))
      : periferia;
    
    // Aplicar filtro de João Pessoa se ativo
    base = filterByJoaoPessoaRadius(base) as PeriferiaProps[];
    
    return base.filter(p => p.codigo_origem === selectedPolo);
  }, [periferia, selectedPolo, selectedUFs, filterByJoaoPessoaRadius]);

  // Resetar município periférico selecionado caso o polo mude
  useEffect(() => {
    // Não limpar o município periférico quando o POLO estiver em 'ALL'
    // pois o usuário pode ter escolhido um município com múltiplos polos e
    // queremos manter a restrição do dropdown de POLO por esse município.
    if (selectedPolo === 'ALL' || selectedMunicipioPeriferico === 'ALL') return;
    const exists = filteredPeriferiaOptions.some(p =>
      (p.codigo_destino || p.municipio_destino) === selectedMunicipioPeriferico
    );
    if (!exists) setSelectedMunicipioPeriferico('ALL');
  }, [selectedPolo, filteredPeriferiaOptions, selectedMunicipioPeriferico]);

  // Resetar filtros quando o filtro de João Pessoa for ativado/desativado
  useEffect(() => {
    // Resetar polo selecionado se não existir mais nas opções filtradas
    if (selectedPolo !== 'ALL') {
      const exists = poloOptions.some(o => o.value === selectedPolo);
      if (!exists) {
        setSelectedPolo('ALL');
        setPoloInputValue('');
      }
    }

    // Resetar município periférico
    if (selectedMunicipioPeriferico !== 'ALL') {
      setSelectedMunicipioPeriferico('ALL');
      setPeriferiaInputValue('');
    }

    // 🆕 Resetar aviso de seleção de polo
    setShowPoloSelectionWarning(false);
    setFilteredPolosByPeriferia([]);
  }, [isJoaoPessoaFilterActive, poloOptions]);

  // 🆕 Resetar aviso quando UFs ou polo mudarem
  useEffect(() => {
    if (selectedPolo !== 'ALL') {
      setShowPoloSelectionWarning(false);
      setFilteredPolosByPeriferia([]);
    }
  }, [selectedPolo, selectedUFs]);

  // Click outside e ESC para fechar dropdown de Estado
  useEffect(() => {
    if (!isEstadoOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        estadoButtonRef.current && 
        estadoDropdownRef.current &&
        !estadoButtonRef.current.contains(event.target as Node) &&
        !estadoDropdownRef.current.contains(event.target as Node)
      ) {
        setIsEstadoOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsEstadoOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape as any);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape as any);
    };
  }, [isEstadoOpen]);

  // Click outside e ESC para fechar dropdown de Produtos
  useEffect(() => {
    if (!isProdutosOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (
        produtosButtonRef.current &&
        produtosDropdownRef.current &&
        !produtosButtonRef.current.contains(event.target as Node) &&
        !produtosDropdownRef.current.contains(event.target as Node)
      ) {
        setIsProdutosOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsProdutosOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape as any);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape as any);
    };
  }, [isProdutosOpen]);

  // Click outside e ESC para fechar dropdown de Municípios Periféricos
  useEffect(() => {
    if (!isPeriferiaOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (periferiaDropdownRef.current &&
          !periferiaDropdownRef.current.contains(event.target as Node)) {
        setIsPeriferiaOpen(false);
      }
    };
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsPeriferiaOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape as any);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape as any);
    };
  }, [isPeriferiaOpen]);


  // Click outside e ESC para fechar dropdown de Polo (busca)
  useEffect(() => {
    if (!isPoloDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (poloInputRef.current &&
          !poloInputRef.current.contains(event.target as Node)) {
        setIsPoloDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPoloDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape as any);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape as any);
    };
  }, [isPoloDropdownOpen]);

  // Click outside e ESC para fechar dropdown de Periferias (busca)
  useEffect(() => {
    if (!isPeriferiaDropdownOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (periferiaDropdownRef.current &&
          !periferiaDropdownRef.current.contains(event.target as Node)) {
        setIsPeriferiaDropdownOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsPeriferiaDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape as any);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape as any);
    };
  }, [isPeriferiaDropdownOpen]);

  // GeoJSON minimal para o mapa (com geometria e apenas campos usados no mapa/popup)
  const polosFCForMap = useMemo(() => {
    const ufUpper = String(appliedUF || '').toUpperCase();
    const inUFMode = appliedPolo === 'ALL' && ufUpper !== 'ALL' && ufUpper !== '';
    const inPoloMode = appliedPolo !== 'ALL';
    let base = polosValores;
    if (appliedUFs.length) base = base.filter(p => appliedUFs.includes(String(p.UF || p.UF_origem)));
    if (inPoloMode) base = base.filter(p => p.codigo_origem === appliedPolo);
    else if (inUFMode) base = base.filter(p => String(p.UF || p.UF_origem || '').toUpperCase() === ufUpper);
    
    // Aplicar filtro de João Pessoa se ativo
    base = filterByJoaoPessoaRadius(base) as PoloValoresProps[];
    
    const features = base
      .filter(p => !!p.geom)
      .map(p => ({
        type: 'Feature' as const,
        geometry: p.geom,
        properties: {
          // Propriedades essenciais primeiro (evita sobrescrever com valores originais)
          codigo_origem: p.codigo_origem,
          municipio_origem: p.municipio_origem,
          UF: String(p.UF || p.UF_origem || '').toUpperCase(),
          UF_origem: p.UF_origem || '',
          soma_valor_total_destino: periferiaAggByCodigo.get(p.codigo_origem) || 0,
          valor_total_origem: Number(p.valor_total_origem) || 0,
          // Inclui productValues já calculados para uso no raio/export
          productValues: p.productValues,
          // Inclui TODAS as propriedades originais para acesso aos valores de produtos
          ...p.propriedadesOriginais,
        }
      }));
    return { type: 'FeatureCollection' as const, features };
  }, [polosValores, appliedUF, appliedPolo, appliedUFs, periferiaAggByCodigo, filterByJoaoPessoaRadius]);

  const periferiasFCForMap = useMemo(() => {
    const ufUpper = String(appliedUF || '').toUpperCase();
    const inUFMode = appliedPolo === 'ALL' && ufUpper !== 'ALL' && ufUpper !== '';
    const inPoloMode = appliedPolo !== 'ALL';
    let base = periferia;
    if (appliedUFs.length) base = base.filter(p => appliedUFs.includes(String(p.UF)));
    if (inPoloMode) base = base.filter(p => p.codigo_origem === appliedPolo);
    else if (inUFMode) base = base.filter(p => String(p.UF || '').toUpperCase() === ufUpper);
    
    // Aplicar filtro de João Pessoa se ativo
    base = filterByJoaoPessoaRadius(base) as PeriferiaProps[];
    
    const features = base
      .filter(p => !!p.geom)
      .map(p => ({
        type: 'Feature' as const,
        geometry: p.geom,
        properties: {
          // Propriedades essenciais primeiro (evita sobrescrever com valores originais)
          codigo_origem: p.codigo_origem,
          codigo_destino: String((p as any).codigo_destino ?? (p as any).codigo ?? (p as any).codigo_ibge ?? ''),
          municipio_destino: p.municipio_destino,
          UF: String(p.UF || '').toUpperCase(),
          valor_total_destino: sumSelectedProducts(p.productValues, Number(p.valor_total_destino) || 0),
          // Inclui productValues já calculados para uso no raio/export
          productValues: p.productValues,
          // Inclui TODAS as propriedades originais para acesso aos valores de produtos
          ...p.propriedadesOriginais,
        } as any
      }));
    return { type: 'FeatureCollection' as const, features };
  }, [periferia, appliedUF, appliedPolo, appliedUFs, appliedProducts, filterByJoaoPessoaRadius]);

  // Cálculos derivados para cards com base no polo aplicado
  const derived = useMemo(() => {
    const ufUpper = String(appliedUF || '').toUpperCase();
    const inUFMode = appliedPolo === 'ALL' && ufUpper !== 'ALL' && ufUpper !== '';
    const inPoloMode = appliedPolo !== 'ALL';

    // Filtrar registros conforme interseção: UFs selecionadas, UF/Polo
    let valoresFiltrados = polosValores;
    if (appliedUFs.length) valoresFiltrados = valoresFiltrados.filter(v => appliedUFs.includes(String(v.UF || v.UF_origem)));
    if (inPoloMode) {
      valoresFiltrados = valoresFiltrados.filter(v => v.codigo_origem === appliedPolo);
    } else if (inUFMode) {
      valoresFiltrados = valoresFiltrados.filter(v => String(v.UF || v.UF_origem || '').toUpperCase() === ufUpper);
    }
    
    // Aplicar filtro de João Pessoa se ativo
    valoresFiltrados = filterByJoaoPessoaRadius(valoresFiltrados) as PoloValoresProps[];

    // Card 2 e 3: base de periferias filtrada
    let periferiaFiltrada = periferia;
    if (appliedUFs.length) periferiaFiltrada = periferiaFiltrada.filter(p => appliedUFs.includes(String(p.UF)));
    if (inPoloMode) {
      periferiaFiltrada = periferiaFiltrada.filter(p => p.codigo_origem === appliedPolo);
    } else if (inUFMode) {
      periferiaFiltrada = periferiaFiltrada.filter(p => String(p.UF || '').toUpperCase() === ufUpper);
    }
    
    // Aplicar filtro de João Pessoa se ativo
    periferiaFiltrada = filterByJoaoPessoaRadius(periferiaFiltrada) as PeriferiaProps[];
    if (appliedMinValor !== '' || appliedMaxValor !== '') {
      periferiaFiltrada = periferiaFiltrada.filter(p => {
        const val = Number(p.valor_total_destino) || 0;
        if (appliedMinValor !== '' && val < (appliedMinValor as number)) return false;
        if (appliedMaxValor !== '' && val > (appliedMaxValor as number)) return false;
        return true;
      });
    }

    // Card 1: soma por produtos selecionados na periferia (fallback para total quando nada selecionado) + valor_total_origem dos polos
    let somaOrigemSelecionada = 0;
    let somaPeriferiaSelecionada = 0;

    const valorPolo = valoresFiltrados.reduce((acc, polo) => {
      const valorPeriferias = periferiaAggByCodigo.get(polo.codigo_origem) || 0;
      const valorOrigem = sumSelectedProducts(polo.productValues, Number(polo.valor_total_origem) || 0);
      somaPeriferiaSelecionada += valorPeriferias;
      somaOrigemSelecionada += valorOrigem;
      return acc + valorPeriferias + valorOrigem;
    }, 0);

    // Consolidar por município_destino e pegar Top 3
    const aggMap = new Map<string, number>();
    for (const p of periferiaFiltrada) {
      const nome = p.municipio_destino || '';
      const val = sumSelectedProducts(p.productValues, Number(p.valor_total_destino) || 0);
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

    // 🆕 Criar mapa de municipio_destino para codigo_destino para o card
    const municipiosCodigoMap = new Map<string, string>();
    for (const p of periferiaFiltrada) {
      const codigoDestino = p.codigo_destino || p.municipio_destino;
      if (p.municipio_destino && codigoDestino) {
        municipiosCodigoMap.set(p.municipio_destino, codigoDestino);
      }
    }

    // Subtítulo com label de contexto
    const poloLabel = inPoloMode
      ? (poloOptions.find(o => o.value === appliedPolo)?.label || appliedPolo)
      : inUFMode
        ? `UF ${ufUpper}`
        : 'Todos os Polos';

    console.log('📈 [EstrategiaPage] Métricas calculadas – Valor do Polo', {
      contexto: poloLabel,
      appliedUF,
      appliedPolo,
      appliedProducts,
      somaOrigemSelecionada,
      somaPeriferiaSelecionada,
      valorPolo,
    });

    return {
      valorPolo,
      top3,
      municipiosList,
      municipiosCodigoMap,
      totalMunicipios: municipiosList.length,
      poloLabel
    };
  }, [appliedPolo, appliedUF, appliedUFs, appliedProducts, appliedMinValor, appliedMaxValor, polosValores, periferia, poloOptions, periferiaAggByCodigo, filterByJoaoPessoaRadius]);

  // Reset da lista de municípios quando o polo mudar
  useEffect(() => {
    setShowMunicipiosList(false);
    setIsCardFlipped(false);
    setCurrentPage(0); // 🆕 Resetar página ao trocar polo
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

  // Dados do município periférico selecionado
  const municipioPerifericoSelecionado = useMemo(() => {
    if (appliedMunicipioPeriferico === 'ALL') return null;

    const periferiaFiltrada = periferia.filter(p => {
      const match = (p.codigo_destino || p.municipio_destino) === appliedMunicipioPeriferico;
      const poloMatch = appliedPolo === 'ALL' || p.codigo_origem === appliedPolo;
      const ufMatch = appliedUFs.length === 0 || appliedUFs.includes(String(p.UF));
      return match && poloMatch && ufMatch;
    });

    return periferiaFiltrada[0] || null;
  }, [appliedMunicipioPeriferico, periferia, appliedPolo, appliedUFs]);

  // Valor total do município periférico selecionado
  const valorMunicipioPeriferico = useMemo(() => {
    if (!municipioPerifericoSelecionado) return 0;
    return sumSelectedProducts(municipioPerifericoSelecionado.productValues, Number(municipioPerifericoSelecionado.valor_total_destino) || 0);
  }, [municipioPerifericoSelecionado, appliedProducts]);

  // Lista detalhada de produtos do município periférico
  const produtosMunicipioPeriferico = useMemo(() => {
    if (!municipioPerifericoSelecionado) return [];

    return Object.entries(PROD_FIELDS).map(([key, config]) => {
      const valor = municipioPerifericoSelecionado.productValues?.[key as ProdFieldKey] || 0;
      return {
        key: key as ProdFieldKey,
        label: config.label,
        shortLabel: config.shortLabel,
        valor: Number(valor),
        category: config.category
      };
    }).filter(produto => produto.valor > 0); // Mostrar apenas produtos com valor > 0
  }, [municipioPerifericoSelecionado]);

  // Município Sem Tag selecionado (se houver)
  const municipioSemTagSelecionado = useMemo(() => {
    if (appliedSemTagMunicipio === 'ALL') return null;
    const m = semTagMunicipios.find(s => s.codigo === appliedSemTagMunicipio) || null;
    return m;
  }, [appliedSemTagMunicipio, semTagMunicipios]);

  const valorMunicipioSemTag = useMemo(() => {
    if (!municipioSemTagSelecionado) return 0;
    return sumSelectedProducts(municipioSemTagSelecionado.productValues, Number(municipioSemTagSelecionado.valor_total_sem_tag) || 0);
  }, [municipioSemTagSelecionado, appliedProducts]);

  const produtosMunicipioSemTag = useMemo(() => {
    if (!municipioSemTagSelecionado) return [];
    return Object.entries(PROD_FIELDS).map(([key, config]) => {
      const valor = municipioSemTagSelecionado.productValues?.[key as ProdFieldKey] || 0;
      return {
        key: key as ProdFieldKey,
        label: config.label,
        shortLabel: config.shortLabel,
        valor: Number(valor),
        category: config.category
      };
    }).filter(produto => produto.valor > 0);
  }, [municipioSemTagSelecionado]);

  // Lista de produtos para o município selecionado (periferia ou sem tag)
  const produtosMunicipioDetalhes = produtosMunicipioPeriferico.length > 0 ? produtosMunicipioPeriferico : produtosMunicipioSemTag;

  // Montagem dos cards: Sem Tag selecionado -> mostra dados do Sem Tag;
  // senão, Periferia selecionada -> mostra dados da periferia; caso contrário, visão agregada por polo
  const metrics = (appliedSemTagMunicipio !== 'ALL' && municipioSemTagSelecionado) ? [
    {
      id: 'valor_municipio_periferico',
      title: 'Valor Total',
      value: valorMunicipioSemTag,
      subtitle: municipioSemTagSelecionado.municipio,
      description: `${municipioSemTagSelecionado.UF || ''} • ${municipioSemTagSelecionado.codigo}`
    },
    {
      id: 'produtos_municipio_periferico',
      title: 'Produtos Detalhados',
      value: 'produtos',
      subtitle: `${produtosMunicipioDetalhes.length} produtos ativos`,
      description: 'Valores individuais por produto no município'
    }
  ] : (appliedMunicipioPeriferico !== 'ALL' && municipioPerifericoSelecionado) ? [
    // Card 1: Valor total do município periférico
    {
      id: 'valor_municipio_periferico',
      title: 'Valor Total',
      value: valorMunicipioPeriferico,
      subtitle: municipioPerifericoSelecionado.municipio_destino,
      description: `${municipioPerifericoSelecionado.UF} • ${municipioPerifericoSelecionado.codigo_destino || 'Código não disponível'}`
    },
    // Card 2: Lista detalhada de produtos
    {
      id: 'produtos_municipio_periferico',
      title: 'Produtos Detalhados',
      value: 'produtos',
      subtitle: `${produtosMunicipioDetalhes.length} produtos ativos`,
      description: 'Valores individuais por produto no município'
    }
  ] : [
    // Cards originais (visão agregada)
    {
      id: 'valor_polo',
      title: 'Valor do Polo',
      value: derived.valorPolo, // valor numérico real calculado
      subtitle: derived.poloLabel,
      description: appliedProducts.length ? 'Soma dos produtos selecionados' : 'Soma total (todos os produtos)'
    },
    {
      id: 'top_municipios',
      title: 'Top 3 Municípios',
      value: 'ranking',
      subtitle: 'Maior Potencial',
      description: 'Municipios com maior valor total em produtos'
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

  // Funções de exportação do raio
  const handleExportRadiusXLSX = useCallback(() => {
    if (!radiusPayload) return;

    const workbook = XLSX.utils.book_new();

    // Aba de Metadados
    const metadataSheet = XLSX.utils.json_to_sheet([{
      'Raio (km)': radiusPayload.metadata.raioKm.toFixed(2),
      'Centro (Lat/Lng)': `${radiusPayload.metadata.centro[1].toFixed(6)}, ${radiusPayload.metadata.centro[0].toFixed(6)}`,
      'Critério': radiusPayload.metadata.criterio === 'intersecta' ? 'Intersecta' : 'Contém',
      'Timestamp': new Date(radiusPayload.metadata.timestamp).toLocaleString('pt-BR')
    }]);
    XLSX.utils.book_append_sheet(workbook, metadataSheet, 'Metadados');

    // Aba de Subtotais
    const subtotaisSheet = XLSX.utils.json_to_sheet([{
      'Origem (Polos)': radiusPayload.subtotais.origem,
      'Destinos (Periferias)': radiusPayload.subtotais.destinos,
      'Total': radiusPayload.subtotais.total,
      'Total Formatado': formatCurrency(radiusPayload.subtotais.total)
    }]);
    XLSX.utils.book_append_sheet(workbook, subtotaisSheet, 'Subtotais');

    // Aba de Polos
    const polosData = radiusPayload.polos.map(p => ({
      'Código IBGE': p.codigo_origem,
      'Município': p.nome,
      'UF': p.uf,
      'Valor': p.valor,
      'Valor Formatado': formatCurrency(p.valor)
    }));
    const polosSheet = XLSX.utils.json_to_sheet(polosData);
    XLSX.utils.book_append_sheet(workbook, polosSheet, 'Polos');

    // Aba de Periferias
    const periferiasData = radiusPayload.periferias.map(p => ({
      'Código Origem': p.codigo_origem,
      'Código IBGE': p.codigo_destino || p.codigo_origem,
      'Município': p.nome,
      'UF': p.uf,
      'Valor': p.valor,
      'Valor Formatado': formatCurrency(p.valor)
    }));
    const periferiasSheet = XLSX.utils.json_to_sheet(periferiasData);
    XLSX.utils.book_append_sheet(workbook, periferiasSheet, 'Periferias');

    // Aba Consolidada
    const consolidadaData = radiusPayload.todosMunicipios.map(m => ({
      'Tipo': m.tipo,
      'Código IBGE': m.tipo === 'Polo' ? m.codigo_origem : (m.codigo_destino || m.codigo_origem),
      'Município': m.nome,
      'UF': m.uf,
      'Valor': m.valor,
      'Valor Formatado': formatCurrency(m.valor)
    }));
    const consolidadaSheet = XLSX.utils.json_to_sheet(consolidadaData);
    XLSX.utils.book_append_sheet(workbook, consolidadaSheet, 'Consolidado');

    // Aba de Produtos Detalhados Periferia - um registro por município periférico
    const produtosDetalhadosPeriferiaData = radiusPayload.periferias.map(periferia => {
      const total_destino =
        (periferia.propriedadesOriginais?.valor_pd_num_destino || 0) +
        (periferia.propriedadesOriginais?.valor_pmsb_num_destino || 0) +
        (periferia.propriedadesOriginais?.valor_ctm_num_destino || 0) +
        (periferia.propriedadesOriginais?.VALOR_DEC_AMBIENTAL_NUM_destino || 0) +
        (periferia.propriedadesOriginais?.PLHIS_destino || 0) +
        (periferia.propriedadesOriginais?.valor_start_iniciais_finais_destino || 0) +
        (periferia.propriedadesOriginais?.LIVRO_FUND_1_2_destino || 0) +
        (periferia.propriedadesOriginais?.PVA_destino || 0) +
        (periferia.propriedadesOriginais?.educagame_destino || 0) +
        (periferia.propriedadesOriginais?.valor_reurb_destino || 0) +
        (periferia.propriedadesOriginais?.VALOR_DESERT_NUM_destino || 0);

      return {
        'codigo_origem': String(periferia.propriedadesOriginais?.codigo_origem || ''),
        'codigo_destino': String(periferia.propriedadesOriginais?.codigo_destino || periferia.propriedadesOriginais?.codigo || periferia.propriedadesOriginais?.codigo_ibge || ''),
        'municipio_destino': periferia.nome,
        'UF': periferia.uf,
        'valor_pd_num_destino': periferia.propriedadesOriginais?.valor_pd_num_destino || 0,
        'valor_pmsb_num_destino': periferia.propriedadesOriginais?.valor_pmsb_num_destino || 0,
        'valor_ctm_num_destino': periferia.propriedadesOriginais?.valor_ctm_num_destino || 0,
        'VALOR_DEC_AMBIENTAL_NUM_destino': periferia.propriedadesOriginais?.VALOR_DEC_AMBIENTAL_NUM_destino || 0,
        'PLHIS_destino': periferia.propriedadesOriginais?.PLHIS_destino || 0,
        'valor_start_iniciais_finais_destino': periferia.propriedadesOriginais?.valor_start_iniciais_finais_destino || 0,
        'LIVRO_FUND_1_2_destino': periferia.propriedadesOriginais?.LIVRO_FUND_1_2_destino || 0,
        'PVA_destino': periferia.propriedadesOriginais?.PVA_destino || 0,
        'educagame_destino': periferia.propriedadesOriginais?.educagame_destino || 0,
        'valor_reurb_destino': periferia.propriedadesOriginais?.valor_reurb_destino || 0,
        'VALOR_DESERT_NUM_destino': periferia.propriedadesOriginais?.VALOR_DESERT_NUM_destino || 0,
        'total_destino': total_destino
      };
    });
    const produtosDetalhadosPeriferiaSheet = XLSX.utils.json_to_sheet(produtosDetalhadosPeriferiaData);
    XLSX.utils.book_append_sheet(workbook, produtosDetalhadosPeriferiaSheet, 'Produtos Detalhados Periferia');

    // Aba de Produtos Detalhados Polos - um registro por município polo
    const produtosDetalhadosPolosData = radiusPayload.polos.map(polo => {
      // DEBUG: Log de depuração no momento da exportação
      console.log('📊 [XLSX EXPORT POLO] Processando polo para exportação:', {
        nome: polo.nome,
        codigo_origem: polo.codigo_origem,
        productValues: polo.productValues,
        productValuesKeys: Object.keys(polo.productValues || {}),
        totalProductValues: Object.values(polo.productValues || {}).reduce((sum, val) => sum + val, 0)
      });

      // Usar productValues (que agora está corretamente populado) como fonte primária
      const valor_pd_num_origem = polo.productValues?.VALOR_PD || 0;
      const valor_pmsb_num_origem = polo.productValues?.VALOR_PMBSB || 0;
      const valor_ctm_num_origem = polo.productValues?.VALOR_CTM || 0;
      const VALOR_DEC_AMBIENTAL_NUM_origem = polo.productValues?.VALOR_DEC_AMBIENTAL || 0;
      const PLHIS_origem = polo.productValues?.VALOR_PLHIS || 0;
      const valor_start_iniciais_finais_origem = polo.productValues?.VALOR_START || 0;
      const LIVRO_FUND_1_2_origem = polo.productValues?.VALOR_LIVRO || 0;
      const PVA_origem = polo.productValues?.VALOR_PVA || 0;
      const educagame_origem = polo.productValues?.VALOR_EDUCAGAME || 0;
      const valor_reurb_origem = polo.productValues?.VALOR_REURB || 0;
      const VALOR_DESERT_NUM_origem = polo.productValues?.VALOR_DESERT || 0;

      const total_origem = valor_pd_num_origem + valor_pmsb_num_origem + valor_ctm_num_origem +
                          VALOR_DEC_AMBIENTAL_NUM_origem + PLHIS_origem + valor_start_iniciais_finais_origem +
                          LIVRO_FUND_1_2_origem + PVA_origem + educagame_origem + valor_reurb_origem + VALOR_DESERT_NUM_origem;

      return {
        'codigo_origem': String(polo.codigo_origem || ''),
        'municipio_origem': polo.nome,
        'UF': polo.uf,
        'valor_pd_num_origem': valor_pd_num_origem,
        'valor_pmsb_num_origem': valor_pmsb_num_origem,
        'valor_ctm_num_origem': valor_ctm_num_origem,
        'VALOR_DEC_AMBIENTAL_NUM_origem': VALOR_DEC_AMBIENTAL_NUM_origem,
        'PLHIS_origem': PLHIS_origem,
        'valor_start_iniciais_finais_origem': valor_start_iniciais_finais_origem,
        'LIVRO_FUND_1_2_origem': LIVRO_FUND_1_2_origem,
        'PVA_origem': PVA_origem,
        'educagame_origem': educagame_origem,
        'valor_reurb_origem': valor_reurb_origem,
        'VALOR_DESERT_NUM_origem': VALOR_DESERT_NUM_origem,
        'total_origem': total_origem
      };
    });
    const produtosDetalhadosPolosSheet = XLSX.utils.json_to_sheet(produtosDetalhadosPolosData);
    XLSX.utils.book_append_sheet(workbook, produtosDetalhadosPolosSheet, 'Produtos Detalhados Polos');

    const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
    saveAs(blob, `raio_analise_${new Date().toISOString().split('T')[0]}.xlsx`);
  }, [radiusPayload]);


  const handleExportRadiusPNG = useCallback(async () => {
    if (!radiusPayload) return;

    try {
      // Importar html2canvas dinamicamente
      const html2canvas = (await import('html2canvas')).default;

      // Encontrar o container do mapa completo
      const mapContainer = document.querySelector('.maplibregl-map') as HTMLElement;
      if (!mapContainer) {
        alert('Container do mapa não encontrado para captura de screenshot');
        return;
      }

      // Capturar o mapa completo com todos os elementos visuais
      const canvas = await html2canvas(mapContainer, {
        useCORS: true,
        allowTaint: true,
        backgroundColor: null,
        scale: 1,
        logging: false,
        ignoreElements: (element) => {
          // Ignorar elementos de controle que não queremos na captura
          return element.classList.contains('maplibregl-ctrl-top-right') ||
                 element.classList.contains('maplibregl-ctrl-bottom-left') ||
                 element.classList.contains('maplibregl-ctrl-bottom-right');
        }
      });

      // Criar um novo canvas para adicionar informações
      const finalCanvas = document.createElement('canvas');
      const ctx = finalCanvas.getContext('2d');
      if (!ctx) return;

      // Definir dimensões do canvas final
      const mapWidth = canvas.width;
      const mapHeight = canvas.height;
      const infoHeight = 140; // Espaço para informações

      finalCanvas.width = mapWidth;
      finalCanvas.height = mapHeight + infoHeight;

      // Copiar o conteúdo do mapa capturado
      ctx.drawImage(canvas, 0, 0);

      // Adicionar fundo para as informações
      ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
      ctx.fillRect(0, mapHeight, mapWidth, infoHeight);

      // Adicionar informações do raio
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 18px Arial';
      ctx.fillText('Análise de Raio - NEXUS', 20, mapHeight + 30);

      ctx.font = '16px Arial';
      ctx.fillText(`Raio: ${radiusPayload.metadata.raioKm.toFixed(2)} km`, 20, mapHeight + 60);
      ctx.fillText(`Centro: ${radiusPayload.metadata.centro[1].toFixed(6)}, ${radiusPayload.metadata.centro[0].toFixed(6)}`, 20, mapHeight + 85);
      ctx.fillText(`Municípios: ${radiusPayload.todosMunicipios.length}`, 20, mapHeight + 110);
      ctx.fillText(`Total: ${formatCurrency(radiusPayload.subtotais.total)}`, 20, mapHeight + 135);

      // Adicionar timestamp no canto inferior direito
      const timestamp = new Date(radiusPayload.metadata.timestamp).toLocaleString('pt-BR');
      ctx.font = '12px Arial';
      ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.textAlign = 'right';
      ctx.fillText(timestamp, mapWidth - 20, mapHeight + infoHeight - 10);
      ctx.textAlign = 'left'; // Resetar alinhamento

      // Converter para blob e salvar
      finalCanvas.toBlob((blob) => {
        if (blob) {
          saveAs(blob, `raio_mapa_${new Date().toISOString().split('T')[0]}.png`);
        }
      }, 'image/png', 0.95);

    } catch (error) {
      console.error('Erro ao capturar screenshot:', error);
      alert('Erro ao capturar screenshot do mapa. Tente novamente.');
    }
  }, [radiusPayload]);

  const handleExportResultados = useCallback(() => {
    try {
      const ufUpper = String(appliedUF || '').toUpperCase();
      const inUFMode = appliedPolo === 'ALL' && ufUpper !== 'ALL' && ufUpper !== '';
      const inPoloMode = appliedPolo !== 'ALL';

      let valoresFiltrados = polosValores;
      if (appliedUFs.length) valoresFiltrados = valoresFiltrados.filter(v => appliedUFs.includes(String(v.UF || v.UF_origem)));
      if (inPoloMode) valoresFiltrados = valoresFiltrados.filter(v => v.codigo_origem === appliedPolo);
      else if (inUFMode) valoresFiltrados = valoresFiltrados.filter(v => String(v.UF || v.UF_origem || '').toUpperCase() === ufUpper);

      let periferiaFiltrada = periferia;
      if (appliedUFs.length) periferiaFiltrada = periferiaFiltrada.filter(p => appliedUFs.includes(String(p.UF)));
      if (inPoloMode) periferiaFiltrada = periferiaFiltrada.filter(p => p.codigo_origem === appliedPolo);
      else if (inUFMode) periferiaFiltrada = periferiaFiltrada.filter(p => String(p.UF || '').toUpperCase() === ufUpper);
      if (appliedMinValor !== '' || appliedMaxValor !== '') {
        periferiaFiltrada = periferiaFiltrada.filter(p => {
          const val = Number(p.valor_total_destino) || 0;
          if (appliedMinValor !== '' && val < (appliedMinValor as number)) return false;
          if (appliedMaxValor !== '' && val > (appliedMaxValor as number)) return false;
          return true;
        });
      }

      const periferiaAgg = new Map<string, number>();
      for (const item of periferiaFiltrada) {
        const val = sumSelectedProducts(item.productValues, Number(item.valor_total_destino) || 0);
        periferiaAgg.set(item.codigo_origem, (periferiaAgg.get(item.codigo_origem) || 0) + val);
      }

      const polosSheetData = valoresFiltrados.map(polo => {
        const valorOrigemSelecionada = sumSelectedProducts(polo.productValues, Number(polo.valor_total_origem) || 0);
        const valorDestinoSelecionada = periferiaAgg.get(polo.codigo_origem) || 0;
        const row: Record<string, any> = {
          codigo_origem: polo.codigo_origem,
          municipio_origem: polo.municipio_origem,
          UF: polo.UF || polo.UF_origem || '',
          valor_origem_selecionada: valorOrigemSelecionada,
          valor_destinos_selecionada: valorDestinoSelecionada,
          valor_polo_total: valorOrigemSelecionada + valorDestinoSelecionada,
        };
        const activeProducts = appliedProducts.length ? appliedProducts : PRODUCTS.map(p => p.key);
        for (const key of activeProducts) {
          row[key] = Number(polo.productValues?.[key] || 0);
        }
        return row;
      });

      const periferiasSheetData = periferiaFiltrada.map(periItem => ({
        codigo_origem: periItem.codigo_origem,
        municipio_destino: periItem.municipio_destino,
        UF: periItem.UF || '',
        valor_destino_selecionada: sumSelectedProducts(periItem.productValues, Number(periItem.valor_total_destino) || 0),
        ...(periItem.codigo_destino ? { codigo_destino: periItem.codigo_destino } : {}),
      }));

      const periferiasPorPoloSheetData = Array.from(periferiaAgg.entries()).map(([codigo, valor]) => {
        const polo = valoresFiltrados.find(v => v.codigo_origem === codigo);
        return {
          codigo_origem: codigo,
          UF: polo?.UF || polo?.UF_origem || '',
          municipio_origem: polo?.municipio_origem || '',
          valor_destinos_selecionada: valor,
        };
      });

      const workbook = XLSX.utils.book_new();
      if (polosSheetData.length) {
        const sheet = XLSX.utils.json_to_sheet(polosSheetData);
        XLSX.utils.book_append_sheet(workbook, sheet, 'Polos');
      }
      if (periferiasSheetData.length) {
        const sheet = XLSX.utils.json_to_sheet(periferiasSheetData);
        XLSX.utils.book_append_sheet(workbook, sheet, 'Periferias');
      }
      if (periferiasPorPoloSheetData.length) {
        const sheet = XLSX.utils.json_to_sheet(periferiasPorPoloSheetData);
        XLSX.utils.book_append_sheet(workbook, sheet, 'Periferias_por_Polo');
      }

      const wbout = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
      const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      saveAs(blob, 'resultado_estrategia.xlsx');
      console.log('📤 [EstrategiaPage] Exportação de resultados concluída', {
        polos: polosSheetData.length,
        periferias: periferiasSheetData.length,
        periferiasPorPolo: periferiasPorPoloSheetData.length,
      });
    } catch (error) {
      console.error('Erro ao exportar resultados:', error);
    }
  }, [appliedUF, appliedPolo, appliedUFs, appliedMinValor, appliedMaxValor, appliedProducts, polosValores, periferia, sumSelectedProducts]);



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
                className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 md:gap-0"
              >
                <h1 className="text-3xl font-bold text-white">
                  Análise Estratégica de <span className="text-sky-400">Produtos</span>
                </h1>
                
                {/* Botão Toggle para Filtro de João Pessoa */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 relative">
                    <span 
                      className="text-sm text-slate-300 font-medium cursor-pointer"
                      onMouseEnter={() => setShowRadarTooltip(true)}
                      onMouseLeave={() => setShowRadarTooltip(false)}
                      onClick={() => setShowRadarTooltip(!showRadarTooltip)}
                    >
                      Radar Estratégico
                    </span>
                    
                    {/* Tooltip profissional */}
                    {showRadarTooltip && (
                      <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-2 px-3 py-2 bg-slate-800 text-white text-xs rounded-md shadow-lg border border-slate-600 z-50 whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                          </svg>
                          Raio de 1.300 km a partir de João Pessoa
                        </div>
                        {/* Seta do tooltip */}
                        <div className="absolute -top-1 left-1/2 transform -translate-x-1/2 w-2 h-2 bg-slate-800 border-l border-t border-slate-600 rotate-45"></div>
                      </div>
                    )}
                    
                    <button
                      onClick={() => setIsJoaoPessoaFilterActive(!isJoaoPessoaFilterActive)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-800 ${
                        isJoaoPessoaFilterActive ? 'bg-sky-600' : 'bg-slate-600'
                      }`}
                      role="switch"
                      aria-checked={isJoaoPessoaFilterActive}
                      aria-label="Ativar filtro de raio de João Pessoa"
                    >
                      <span
                        className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                          isJoaoPessoaFilterActive ? 'translate-x-6' : 'translate-x-1'
                        }`}
                      />
                    </button>
                  </div>
                  {isJoaoPessoaFilterActive && (
                    <div className="flex items-center gap-1 text-xs text-sky-400 bg-sky-900/30 px-2 py-1 rounded-md border border-sky-700/50">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                      <span>Filtro Ativo</span>
                    </div>
                  )}
                </div>

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
                  <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
                    {/* ESTADO/REGIÃO Unificado */}
                    <div className="flex flex-col">
                      <label className="text-slate-300 text-sm mb-0.5 text-center font-bold">ESTADO/REGIÃO</label>
                      <button
                        ref={estadoButtonRef}
                        type="button"
                        onClick={() => setIsEstadoOpen(v => !v)}
                        className="relative bg-[#1e293b] text-white border border-slate-600 rounded-md px-3 pr-8 py-1.5 text-left flex items-center min-h-[40px] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      >
                        <span className="text-sm">
                          {selectedUFs.length === 0 ? 'Todos os Estados' :
                           selectedUFs.length === UF_ABERTURA.length && UF_ABERTURA.every(uf => selectedUFs.includes(uf)) ? 'Todos (Abertura)' :
                           selectedUFs.length === TODAS_UFS.length ? 'Todos' :
                           selectedUFs.length <= 3 ? selectedUFs.join(', ') : `${selectedUFs.length} selecionados`}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-300 transition-transform absolute right-2 top-1/2 -translate-y-1/2 ${isEstadoOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
                      </button>
                      <EstadoDropdown
                        isOpen={isEstadoOpen}
                        buttonRef={estadoButtonRef}
                        dropdownRef={estadoDropdownRef}
                        selectedUFs={selectedUFs}
                        setSelectedUFs={setSelectedUFs}
                        availableUFs={availableUFsWithRadiusFilter}
                      />
                    </div>

                    {/* POLO */}
                    <div className="flex flex-col">
                      <label className="text-slate-300 text-sm mb-0.5 text-center font-bold">POLO</label>
                      {/* 🆕 Aviso sutil quando há múltiplos polos */}
                      {showPoloSelectionWarning && (
                        <div className="text-[10px] text-amber-400 text-center mb-0.5 animate-pulse">
                          Selecionar um dos polos
                        </div>
                      )}
                      <div className="relative" ref={poloInputRef}>
                        <input
                          type="text"
                          value={poloInputValue}
                          onChange={(e) => {
                            setPoloInputValue(e.target.value);
                            setIsPoloDropdownOpen(true);
                          }}
                          onFocus={() => {
                            // Apenas abre o dropdown; não limpar o valor automaticamente
                            setIsPoloDropdownOpen(true);
                          }}
                          placeholder="Digite o nome do polo..."
                          className={`w-full rounded-md bg-[#1e293b] text-white placeholder-slate-400 border px-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:border-sky-500 text-left ${
                            showPoloSelectionWarning 
                              ? 'border-amber-500/70 focus:ring-amber-500' 
                              : 'border-slate-600 focus:ring-sky-500'
                          }`}
                        />
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          className={`h-4 w-4 absolute right-2 top-1/2 -translate-y-1/2 transition-transform duration-200 pointer-events-none ${
                            isPoloDropdownOpen ? 'rotate-180' : ''
                          } ${showPoloSelectionWarning ? 'text-amber-400' : 'text-slate-300'}`}
                          viewBox="0 0 20 20"
                          fill="currentColor"
                          aria-hidden="true"
                        >
                          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.061l-4.24 4.24a.75.75 0 01-1.06 0l-4.24-4.24a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                        </svg>

                        {/* Dropdown personalizado */}
                        {isPoloDropdownOpen && (
                          <div className="absolute top-full left-0 mt-1 w-full rounded-md shadow-lg bg-[#1e293b] border border-slate-600 z-50 max-h-80 overflow-y-auto">
                            <div className="py-1">
                              {/* Opção "Todos os Polos" */}
                              <button
                                onClick={() => {
                                  setSelectedPolo('ALL');
                                  setPoloInputValue('Todos os Polos');
                                  setIsPoloDropdownOpen(false);
                                  // 🆕 Limpar aviso ao selecionar "Todos os Polos"
                                  setShowPoloSelectionWarning(false);
                                  setFilteredPolosByPeriferia([]);
                                }}
                                className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
                              >
                                Todos os Polos
                              </button>

                              {/* Polos filtrados */}
                              {polosFiltrados.map((polo) => (
                                <button
                                  key={polo.value}
                                  onClick={() => {
                                    setSelectedPolo(polo.value);
                                    setPoloInputValue(polo.label);
                                    setIsPoloDropdownOpen(false);
                                    // 🆕 Limpar aviso ao selecionar um polo específico
                                    setShowPoloSelectionWarning(false);
                                    setFilteredPolosByPeriferia([]);
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
                                >
                                  {polo.label}
                                </button>
                              ))}

                              {/* Mensagem quando não há resultados na busca */}
                              {poloInputValue.trim() && polosFiltrados.length === 0 && (
                                <div className="px-3 py-2 text-sm text-slate-400 text-center">
                                  Nenhum polo encontrado
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* MUNICÍPIO PERIFÉRICO */}
                    <div className="flex flex-col">
                      <label className="text-slate-300 text-sm mb-0.5 text-center font-bold">MUNICÍPIOS PRÓXIMOS</label>
                      <div className="flex gap-2">
                        <div className="relative flex-1" ref={periferiaDropdownRef}>
                          <input
                            type="text"
                            value={periferiaInputValue}
                            onChange={(e) => {
                              setPeriferiaInputValue(e.target.value);
                              setIsPeriferiaDropdownOpen(true);
                            }}
                            onFocus={() => {
                              // Apenas abre o dropdown; não limpar o valor automaticamente
                              setIsPeriferiaDropdownOpen(true);
                            }}
                            placeholder="Digite o nome do município..."
                            className="appearance-none w-full rounded-md bg-[#1e293b] text-white placeholder-slate-400 border border-slate-600 px-3 pr-8 py-1.5 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 text-left cursor-text"
                          />
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className={`h-4 w-4 text-slate-300 absolute right-2 top-1/2 -translate-y-1/2 transition-transform duration-200 pointer-events-none ${isPeriferiaDropdownOpen ? 'rotate-180' : ''}`}
                            viewBox="0 0 20 20"
                            fill="currentColor"
                            aria-hidden="true"
                          >
                            <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 10.939l3.71-3.71a.75.75 0 111.06 1.061l-4.24 4.24a.75.75 0 01-1.06 0l-4.24-4.24a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                          </svg>

                          {/* Dropdown personalizado - 🆕 SIMPLIFICADO */}
                          {isPeriferiaDropdownOpen && (
                            <div className="absolute top-full left-0 mt-1 w-full rounded-md shadow-lg bg-[#1e293b] border border-slate-600 z-50 max-h-80 overflow-y-auto">
                              <div className="py-1">
                                {/* Opção "Todos os municípios" */}
                                <button
                                  onClick={() => {
                                    setSelectedMunicipioPeriferico('ALL');
                                    setPeriferiaInputValue('Todos os municípios');
                                    setIsPeriferiaDropdownOpen(false);
                                    // 🆕 Limpar aviso ao selecionar "Todos"
                                    setShowPoloSelectionWarning(false);
                                    setFilteredPolosByPeriferia([]);
                                    setAppliedSemTagMunicipio('ALL');
                                  }}
                                  className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
                                >
                                  Todos os municípios
                                </button>

                                {/* Municípios próximos (periferias + sem tag) */}
                                {municipiosProximosFiltrados.map((item) => {
                                  if (item.tipo === 'periferia') {
                                    const codigoDestino = item.id;
                                    const polosRelacionados = periferiaToPolosMap.get(codigoDestino) || [];
                                    return (
                                      <button
                                        key={`peri-${codigoDestino}`}
                                        onClick={() => {
                                          const municipioId = codigoDestino;

                                          if (polosRelacionados.length > 1) {
                                            setShowPoloSelectionWarning(true);
                                            setFilteredPolosByPeriferia(polosRelacionados.map(p => p.codigo_origem));
                                            setSelectedMunicipioPeriferico(municipioId);
                                            setPeriferiaInputValue(item.nome);
                                            // 🧹 Limpar automaticamente o campo de POLO quando a periferia pertence a múltiplos polos
                                            setSelectedPolo('ALL');
                                            setPoloInputValue('');
                                          } else {
                                            if (selectedPolo === 'ALL' && polosRelacionados.length === 1) {
                                              setSelectedPolo(polosRelacionados[0].codigo_origem);
                                              setPoloInputValue(polosRelacionados[0].municipio_origem);
                                            }
                                            setSelectedMunicipioPeriferico(municipioId);
                                            setPeriferiaInputValue(item.nome);
                                            setShowPoloSelectionWarning(false);
                                            setFilteredPolosByPeriferia([]);

                                            // Aplicar filtros imediatamente (auto buscar)
                                            setAppliedPolo(selectedPolo);
                                            setAppliedMunicipioPeriferico(municipioId);
                                            setAppliedSemTagMunicipio('ALL');
                                            setAppliedMinValor(minValor);
                                            setAppliedMaxValor(maxValor);
                                            setAppliedUFs(selectedUFs);
                                            setAppliedProducts(selectedProducts.length === PRODUCTS.length ? [] : selectedProducts);
                                            setAppliedUF(selectedUFs.length === 1 ? selectedUFs[0] : 'ALL');
                                          }

                                          setIsPeriferiaDropdownOpen(false);
                                          setAppliedSemTagMunicipio('ALL');
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-600 transition-colors"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>{item.nome}</span>
                                          <span className="text-[10px] text-slate-400">{item.UF}</span>
                                        </div>
                                      </button>
                                    );
                                  } else {
                                    // item.tipo === 'semTag'
                                    return (
                                      <button
                                        key={`sem-${item.id}`}
                                        onClick={() => {
                                          // Encontrar o código do polo mais próximo pelo nome informado na base sem tag
                                          const nomePolo = (item.poloMaisProximo || '').trim();
                                          const match = polosValores.find(p => p.municipio_origem.toLowerCase() === nomePolo.toLowerCase());
                                          if (!match) {
                                            console.warn('Polo mais próximo não encontrado para município Sem Tag:', { municipio: item.nome, nomePolo });
                                            setIsPeriferiaDropdownOpen(false);
                                            return;
                                          }

                                          // Preencher o campo de POLO e aplicar a busca automaticamente
                                          setSelectedPolo(match.codigo_origem);
                                          setPoloInputValue(`${match.municipio_origem} (Mais Próximo)`);
                                          setSelectedMunicipioPeriferico('ALL');
                                          setPeriferiaInputValue(item.nome);

                                          // Aplicar filtros imediatamente (auto buscar)
                                          setAppliedPolo(match.codigo_origem);
                                          setAppliedMunicipioPeriferico('ALL');
                                          setAppliedSemTagMunicipio(item.id);
                                          setAppliedMinValor(minValor);
                                          setAppliedMaxValor(maxValor);
                                          setAppliedUFs(selectedUFs);
                                          setAppliedProducts(selectedProducts.length === PRODUCTS.length ? [] : selectedProducts);
                                          setAppliedUF(selectedUFs.length === 1 ? selectedUFs[0] : 'ALL');

                                          setShowPoloSelectionWarning(false);
                                          setFilteredPolosByPeriferia([]);
                                          setIsPeriferiaDropdownOpen(false);
                                        }}
                                        className="w-full text-left px-3 py-2 text-sm text-white hover:bg-slate-700 transition-colors"
                                        title="Selecionar município sem tag e pesquisar automaticamente"
                                      >
                                        <div className="flex items-center gap-2">
                                          <span>{item.nome}</span>
                                          {item.poloMaisProximo && (
                                            <span className="ml-auto text-[10px] text-sky-300">Polo próximo: {item.poloMaisProximo}</span>
                                          )}
                                        </div>
                                      </button>
                                    );
                                  }
                                })}

                                {/* Mensagem quando não há resultados na busca */}
                                {periferiaInputValue.trim() && municipiosProximosFiltrados.length === 0 && (
                                  <div className="px-3 py-2 text-sm text-slate-400 text-center">
                                    Nenhum município encontrado
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>

                        {(selectedMunicipioPeriferico !== 'ALL' || appliedSemTagMunicipio !== 'ALL') && (
                          <button
                            onClick={() => {
                              setSelectedMunicipioPeriferico('ALL');
                              setAppliedMunicipioPeriferico('ALL');
                              setAppliedSemTagMunicipio('ALL');
                              setPeriferiaInputValue('');
                              setIsPeriferiaDropdownOpen(false);
                              // 🆕 Limpar aviso ao limpar seleção
                              setShowPoloSelectionWarning(false);
                              setFilteredPolosByPeriferia([]);
                            }}
                            className="bg-red-600/80 hover:bg-red-600 text-white px-2 py-1.5 rounded-md font-medium transition-colors duration-200 flex items-center justify-center min-h-[40px]"
                            title="Limpar seleção do município periférico"
                            aria-label="Limpar seleção do município periférico"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                          </button>
                        )}
                      </div>
                    </div>

                    {/* PRODUTOS (Dropdown multi-select via Portal) */}
                    <div className="flex flex-col">
                      <label className="text-slate-300 text-sm mb-0.5 text-center font-bold" title="Filtro por produto (soma das colunas selecionadas). Sem seleção: usa total agregado.">PRODUTOS</label>
                      <button
                        ref={produtosButtonRef}
                        type="button"
                        onClick={() => setIsProdutosOpen(v => !v)}
                        className="relative bg-[#1e293b] text-white border border-slate-600 rounded-md px-3 pr-8 py-1.5 text-left flex items-center min-h-[40px] focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                      >
                        <span className="text-sm">
                          {selectedProducts.length === PRODUCTS.length ? 'Todos' : selectedProducts.length === 0 ? 'Nenhum' : selectedProducts.map(k => (PRODUCTS.find(p => p.key === k)?.label || k)).join(', ')}
                        </span>
                        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-300 transition-transform absolute right-2 top-1/2 -translate-y-1/2 ${isProdutosOpen ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/></svg>
                      </button>
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
                                checked={selectedProducts.length === PRODUCTS.length}
                                ref={(el) => { if (el) el.indeterminate = selectedProducts.length > 0 && selectedProducts.length < PRODUCTS.length; }}
                                onChange={(e) => {
                                  const checked = e.target.checked;
                                  if (checked) {
                                    setSelectedProducts(PRODUCTS.map(p => p.key));
                                  } else {
                                    setSelectedProducts([]);
                                  }
                                }}
                              />
                              <span className="text-sm text-white">Todos</span>
                            </label>
                            {PRODUCTS.map(prod => (
                              <label key={prod.key} className="flex items-center gap-2 py-1 px-1 hover:bg-slate-600 rounded cursor-pointer transition-colors">
                                <input
                                  type="checkbox"
                                  className="w-4 h-4"
                                  checked={selectedProducts.includes(prod.key)}
                                  onChange={(e) => {
                                    const checked = e.target.checked;
                                    setSelectedProducts(prev => {
                                      const next = new Set(prev);
                                      if (checked) next.add(prod.key); else next.delete(prod.key);
                                      return Array.from(next);
                                    });
                                  }}
                                />
                                <span className="text-sm text-white">{prod.label}</span>
                              </label>
                            ))}
                          </div>
                        </div>
                      ), document.body)}
                    </div>

                    {/* Botão de Buscar */}
                    <div className="flex flex-col justify-end">
                      <label className="text-slate-300 text-sm mb-0.5 text-center font-bold opacity-0">Buscar</label>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => {
                            // Aplicar filtros selecionados
                            setAppliedPolo(selectedPolo);
                            setAppliedMunicipioPeriferico(selectedMunicipioPeriferico);
                            setAppliedMinValor(minValor);
                            setAppliedMaxValor(maxValor);
                            setAppliedUFs(selectedUFs);
                            setAppliedProducts(selectedProducts.length === PRODUCTS.length ? [] : selectedProducts);
                            // Manter appliedUF para compatibilidade com mapa (ALL quando múltiplas UFs)
                            setAppliedUF(selectedUFs.length === 1 ? selectedUFs[0] : 'ALL');
                            // Fechar dropdowns
                            setIsEstadoOpen(false);
                            setIsProdutosOpen(false);
                            setIsPeriferiaOpen(false);
                            setIsPoloDropdownOpen(false);
                            setIsPeriferiaDropdownOpen(false);
                          }}
                          className="bg-sky-600 hover:bg-sky-700 text-white px-3 py-1.5 rounded-md font-medium transition-colors duration-200 flex items-center justify-center gap-1.5 min-h-[40px] flex-1"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 104.5 4.5a7.5 7.5 0 0012.15 12.15z" />
                          </svg>
                          <span className="text-sm font-semibold">Buscar</span>
                        </button>
                        <button
                          onClick={handleExportResultados}
                          className="bg-slate-600/70 hover:bg-slate-500/80 text-white px-3 py-1.5 rounded-md font-medium transition-colors duration-200 flex items-center justify-center gap-1.5 min-h-[40px] flex-1"
                          title="Exportar filtros"
                          aria-label="Exportar filtros aplicados"
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

              {/* Seção de Informações dos Polos - Cards */}
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2 }}
                className="mt-2 mb-2"
              >
                <div className={`grid grid-cols-1 ${
                  appliedMunicipioPeriferico !== 'ALL' && municipioPerifericoSelecionado
                    ? 'md:grid-cols-3' // 3 colunas quando município periférico selecionado (1/3 + 2/3)
                    : 'md:grid-cols-2 lg:grid-cols-3'   // 3 cards na visão agregada
                } gap-2 ${loadingData ? 'opacity-60 pointer-events-none' : ''}`}>
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
                          className="relative w-full h-full focus:outline-none focus:ring-2 focus:ring-sky-500 rounded-lg"
                          style={{ transformStyle: 'preserve-3d' }}
                          onKeyDown={(e) => { if (!isCardFlipped) handleCardKeyDown(e, metric.id); }}
                          tabIndex={0}
                          role="button"
                          aria-label={isCardFlipped ? 'Fechar lista de municípios' : 'Ver lista de municípios do polo'}
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
                                    <AnimatedNumber
                                      targetValue={derived.totalMunicipios}
                                      selectedPolo={selectedPolo}
                                    />
                                </p>
                                <div className="flex flex-col items-start leading-tight">
                                  <span className="text-sky-400 text-base sm:text-lg md:text-xl lg:text-lg xl:text-xl font-semibold">
                                    {derived.totalMunicipios === 1 ? 'Município' : 'Municípios'}
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
                                }}
                                className="text-slate-400 hover:text-white transition-colors text-sm"
                                aria-label="Fechar lista de municípios"
                              >
                                ✕
                              </button>
                            </div>

                            {/* Área compacta: todos os municípios cabem sem rolagem */}
                            <div className="flex-1 flex flex-col">
                              <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-0.5 sm:gap-1 justify-items-stretch content-start auto-rows-min">
                                {(() => {
                                  // 🆕 Cálculo de paginação
                                  const totalMunicipios = derived.municipiosList.length;
                                  const startIdx = currentPage * MUNICIPIOS_PER_PAGE;
                                  const endIdx = Math.min(startIdx + MUNICIPIOS_PER_PAGE, totalMunicipios);
                                  const municipiosPaginados = derived.municipiosList.slice(startIdx, endIdx);
                                  const totalPages = Math.ceil(totalMunicipios / MUNICIPIOS_PER_PAGE);

                                  return municipiosPaginados.map((municipio, idx) => {
                                    // Obter o codigo_destino correspondente ao nome do município
                                    const codigoDestino = derived.municipiosCodigoMap?.get(municipio) || municipio;
                                    
                                    return (
                                      <button
                                        key={`${currentPage}-${idx}`}
                                        onClick={() => {
                                          // 🆕 Usar codigo_destino em vez do nome do município
                                          setSelectedMunicipioPeriferico(codigoDestino);
                                          setPeriferiaInputValue(municipio);
                                          
                                          // Aplicar filtros selecionados (executar busca)
                                          setAppliedPolo(selectedPolo);
                                          setAppliedMunicipioPeriferico(codigoDestino);
                                          setAppliedMinValor(minValor);
                                          setAppliedMaxValor(maxValor);
                                          setAppliedUFs(selectedUFs);
                                          setAppliedProducts(selectedProducts.length === PRODUCTS.length ? [] : selectedProducts);
                                          setAppliedUF(selectedUFs.length === 1 ? selectedUFs[0] : 'ALL');
                                          
                                          // Fechar o flip card automaticamente
                                          setIsCardFlipped(false);
                                          
                                          // Fechar todos os dropdowns
                                          setIsEstadoOpen(false);
                                          setIsProdutosOpen(false);
                                          setIsPeriferiaOpen(false);
                                          setIsPoloDropdownOpen(false);
                                          setIsPeriferiaDropdownOpen(false);
                                          
                                          // 🆕 Resetar página ao fechar card
                                          setCurrentPage(0);
                                        }}
                                        className="w-full text-xs text-slate-300 py-0.5 px-1.5 truncate leading-tight bg-slate-800/60 rounded border border-slate-700/30 text-center hover:bg-sky-700/60 hover:text-sky-200 hover:border-sky-500/50 transition-all cursor-pointer font-medium"
                                        title={`Selecionar ${municipio} e pesquisar`}
                                      >
                                        {municipio}
                                      </button>
                                    );
                                  });
                                })()}
                              </div>

                              {/* 🆕 Controle de Paginação Sutil */}
                              {(() => {
                                const totalPages = Math.ceil(derived.municipiosList.length / MUNICIPIOS_PER_PAGE);
                                return totalPages > 1 ? (
                                  <div className="flex items-center justify-between gap-2 mt-2 pt-2 border-t border-slate-700/30">
                                    <button
                                      onClick={() => setCurrentPage(prev => Math.max(0, prev - 1))}
                                      disabled={currentPage === 0}
                                      className="flex items-center justify-center w-6 h-6 rounded text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-700/40 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                                      title="Página anterior"
                                      aria-label="Página anterior"
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
                                      title="Próxima página"
                                      aria-label="Próxima página"
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
                    ) : (
                      // Cards normais (não flip)
                      <motion.div
                        key={metric.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5, delay: 0.2 + index * 0.1 }}
                        className={`bg-[#1e293b] rounded-lg border border-slate-700/50 hover:bg-[#233044] transition-all duration-300 group min-h-[160px] ${
                          metric.id === 'top_municipios' ? 'p-4' : metric.id === 'valor_polo' ? 'p-6' : 'p-4'
                        } ${
                          ((appliedMunicipioPeriferico !== 'ALL' && municipioPerifericoSelecionado) || (appliedSemTagMunicipio !== 'ALL' && municipioSemTagSelecionado))
                            ? metric.id === 'valor_municipio_periferico'
                              ? 'md:col-span-1' // Primeiro card ocupa 1/3 do espaço
                              : metric.id === 'produtos_municipio_periferico'
                              ? 'md:col-span-2' // Segundo card ocupa 2/3 do espaço
                              : ''
                            : ''
                        }`}
                        onClick={() => setSelectedMetric(metric.id)}
                        tabIndex={-1}
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
                        ) : metric.id === 'produtos_municipio_periferico' ? (
                          // Layout especial para Produtos Detalhados do Município Periférico
                          // Ocupa a altura dos dois cards anteriores (altura dobrada)
                          <div className="flex flex-col h-full">
                            <div className="mb-3 text-center">
                              <h3 className="text-lg font-semibold text-white">Produtos Detalhados</h3>
                              <p className="text-xs text-slate-400">Valores individuais por produto no município</p>
                            </div>
                            <div className="flex-1">
                              {/* Grid de 5 linhas x 2 colunas para produtos */}
                              <div className="grid grid-cols-2 grid-rows-5 gap-1 h-full">
                                {Array.from({ length: 10 }, (_, idx) => {
                                  const produto = produtosMunicipioDetalhes[idx];
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
                                              'bg-gray-500'
                                            }`} />
                                            <span className="text-xs font-medium text-slate-200 truncate" title={produto.label}>
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
                              {produtosMunicipioDetalhes.length === 0 && (
                                <div className="absolute inset-0 flex items-center justify-center text-slate-500 text-sm">
                                  Nenhum produto ativo neste município
                                </div>
                              )}
                            </div>
                          </div>
                        ) : (
                          // Layout padrão para outros cards // card 1
                          <div className="relative flex flex-col h-full">
                            {metric.id === 'valor_polo' || metric.id === 'valor_municipio_periferico' ? (
                              // Layout especial para o card de Valor (Polo ou Município Periférico)
                              <>
                                {/* Textos no canto superior esquerdo */}
                                <div className="absolute top-0 left-0 text-left space-y-1">
                                  <p className="text-sm font-bold text-slate-300">{metric.subtitle}</p>
                                  <p className="text-xs text-slate-500">{metric.description}</p>
                                </div>

                                {/* Valor centralizado no meio do card */}
                                <div className="absolute inset-0 flex items-center justify-center px-2">
                                  <p className="font-extrabold text-emerald-400 text-2xl sm:text-3xl md:text-4xl lg:text-3xl xl:text-4xl text-center leading-tight break-words">
                                    <AnimatedCurrency
                                      targetValue={metric.value as number}
                                      selectedPolo={
                                        appliedMunicipioPeriferico !== 'ALL'
                                          ? appliedMunicipioPeriferico
                                          : appliedSemTagMunicipio !== 'ALL'
                                          ? appliedSemTagMunicipio
                                          : appliedPolo
                                      }
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
                          appliedUFs={appliedUFs}
                          appliedProducts={appliedProducts}
                          appliedMinValor={appliedMinValor}
                          appliedMaxValor={appliedMaxValor}
                          onRadiusResult={setRadiusPayload}
                          onExportXLSX={handleExportRadiusXLSX}
                          onMunicipioPerifericoClick={(municipioId) => {
                            setSelectedMunicipioPeriferico(municipioId);
                            setAppliedMunicipioPeriferico(municipioId);
                          }}
                          municipioPerifericoSelecionado={appliedMunicipioPeriferico}
                          municipioSemTagSelecionado={appliedSemTagMunicipio !== 'ALL' ? appliedSemTagMunicipio : undefined}
                          // Passa o estado do filtro Radar (João Pessoa 1.300km) para filtrar Sem Tag visualmente
                          radarFilterActive={isJoaoPessoaFilterActive}
                          // Converter [lat, lng] -> [lng, lat] para uso no Turf/MapLibre
                          radarCenterLngLat={[JOAO_PESSOA_COORDS[1], JOAO_PESSOA_COORDS[0]] as [number, number]}
                          radarRadiusKm={JOAO_PESSOA_RADIUS_KM}
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
                        appliedUFs={appliedUFs}
                        appliedProducts={appliedProducts}
                        appliedMinValor={appliedMinValor}
                        appliedMaxValor={appliedMaxValor}
                        onRadiusResult={setRadiusPayload}
                        onExportXLSX={handleExportRadiusXLSX}
                        onMunicipioPerifericoClick={(municipioId) => {
                          setSelectedMunicipioPeriferico(municipioId);
                          setAppliedMunicipioPeriferico(municipioId);
                        }}
                        municipioPerifericoSelecionado={appliedMunicipioPeriferico}
                        municipioSemTagSelecionado={appliedSemTagMunicipio !== 'ALL' ? appliedSemTagMunicipio : undefined}
                        // Passa o estado do filtro Radar (João Pessoa 1.300km) para filtrar Sem Tag visualmente
                        radarFilterActive={isJoaoPessoaFilterActive}
                        // Converter [lat, lng] -> [lng, lat]
                        radarCenterLngLat={[JOAO_PESSOA_COORDS[1], JOAO_PESSOA_COORDS[0]] as [number, number]}
                        radarRadiusKm={JOAO_PESSOA_RADIUS_KM}
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
