"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import type GeoJSON from 'geojson';
import type { MunicipiosGeoJSON, MunicipioRelacionamento } from '@/contexts/PolosDataContext';
import { setupPolosHover } from './polosHoverHandlers';

type MapLibreMap = maplibregl.Map;

interface MunicipioSelecionado {
  codigo: string;
  nome: string;
  UF: string;
  properties?: {
    valor_total_produtos?: number | null;
    [key: string]: unknown;
  };
}

interface MapaPolosProps {
  baseMunicipios: MunicipiosGeoJSON | null;
  municipiosRelacionamento?: MunicipioRelacionamento[];
  selectedMunicipio?: MunicipioSelecionado | null;
  selectedUFs?: string[]; // Estados selecionados (siglas)
  radarFilterActive?: boolean; // Raio Estratégico ativo
  onMunicipioClick?: (codigoMunicipio: string) => void; // Callback ao clicar em polígono
}

export default function MapaPolos({ baseMunicipios, municipiosRelacionamento = [], selectedMunicipio, selectedUFs = [], radarFilterActive = false, onMunicipioClick }: MapaPolosProps) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoverCleanupRef = useRef<(() => void) | null>(null);
  const [mapReady, setMapReady] = useState(false);
  const prevSelectedRef = useRef<string | null>(null);
  const prevSelectedUFsRef = useRef<string[]>([]);
  
  // Dados vazios para inicialização
  const emptyFC: MunicipiosGeoJSON = { type: 'FeatureCollection', features: [] };

  // Set de códigos de municípios com relacionamento ativo (Polos Estratégicos)
  const polosEstrategicosSet = useMemo(() => {
    const set = new Set<string>();
    municipiosRelacionamento.forEach(m => {
      if (m.relacionamento_ativo) {
        // Normalizar code_muni para string
        set.add(String(m.code_muni));
      }
    });
    
    // Log detalhado para debug (apenas quando há dados)
    if (municipiosRelacionamento.length > 0) {
      console.log('[MapaPolos] municipiosRelacionamento recebidos:', municipiosRelacionamento.length);
      console.log('[MapaPolos] Polos Estratégicos (relacionamento_ativo=true):', set.size);
    }
    
    return set;
  }, [municipiosRelacionamento]);

  // Set de códigos de municípios que são Polos Logísticos (tipo_polo_satelite = 'polo_logistico')
  // Nota: Esta informação vem do GeoJSON (baseMunicipios), não do relacionamento
  const polosLogisticosSet = useMemo(() => {
    const set = new Set<string>();
    baseMunicipios?.features?.forEach(f => {
      const tipoPoloSatelite = f.properties?.tipo_polo_satelite;
      if (tipoPoloSatelite === 'polo_logistico') {
        set.add(String(f.properties?.code_muni || ''));
      }
    });
    
    if (set.size > 0) {
      console.log('[MapaPolos] Polos Logísticos (tipo_polo_satelite=polo_logistico):', set.size);
    }
    
    return set;
  }, [baseMunicipios]);

  // Ref para acessar polosEstrategicosSet dentro dos handlers
  const polosSetRef = useRef(polosEstrategicosSet);
  useEffect(() => {
    polosSetRef.current = polosEstrategicosSet;
  }, [polosEstrategicosSet]);

  // Ref para acessar polosLogisticosSet dentro dos handlers
  const polosLogisticosSetRef = useRef(polosLogisticosSet);
  useEffect(() => {
    polosLogisticosSetRef.current = polosLogisticosSet;
  }, [polosLogisticosSet]);

  // Função para aplicar feature state nos municípios
  const applyFeatureStates = useCallback(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !baseMunicipios?.features?.length) {
      return;
    }

    // Verificar se a source existe
    if (!map.getSource('municipios-src')) {
      console.log('[MapaPolos] ⏭️ Source ainda não existe');
      return;
    }

    let matchCountEstrategico = 0;
    let matchCountLogistico = 0;
    const matchedEstrategicos: string[] = [];
    const matchedLogisticos: string[] = [];

    // Aplicar isPolo e isPoloLogistico feature state para cada município
    // Lógica:
    // - isPolo (verde): tem relacionamento_ativo = true (prioridade sobre polo_logistico)
    // - isPoloLogistico (roxo): tem tipo_polo_satelite = 'polo_logistico' E NÃO tem relacionamento_ativo
    baseMunicipios.features.forEach(feature => {
      const codeMuni = String(feature.properties?.code_muni || '');
      const isPolo = polosEstrategicosSet.has(codeMuni);
      const isPoloLogisticoRaw = polosLogisticosSet.has(codeMuni);
      // Polo Logístico só se NÃO for Polo Estratégico
      const isPoloLogistico = isPoloLogisticoRaw && !isPolo;
      
      if (isPolo) {
        matchCountEstrategico++;
        if (matchedEstrategicos.length < 5) {
          matchedEstrategicos.push(`${feature.properties?.nome_municipio} (${codeMuni})`);
        }
      }
      
      if (isPoloLogistico) {
        matchCountLogistico++;
        if (matchedLogisticos.length < 5) {
          matchedLogisticos.push(`${feature.properties?.nome_municipio} (${codeMuni})`);
        }
      }
      
      if (codeMuni) {
        try {
          map.setFeatureState(
            { source: 'municipios-src', id: codeMuni },
            { isPolo, isPoloLogistico }
          );
        } catch (err) {
          // Ignora erros silenciosamente
        }
      }
    });

    // Log do resultado do matching
    console.log('[MapaPolos] ========== RESULTADO DO MATCHING ==========');
    console.log('[MapaPolos] Total de features no GeoJSON:', baseMunicipios.features.length);
    console.log('[MapaPolos] Total de Polos Estratégicos no Set:', polosEstrategicosSet.size);
    console.log('[MapaPolos] Total de Polos Logísticos no Set:', polosLogisticosSet.size);
    console.log('[MapaPolos] ✅ MATCHES Estratégicos:', matchCountEstrategico);
    console.log('[MapaPolos] ✅ MATCHES Logísticos (sem relacionamento):', matchCountLogistico);
    if (matchedEstrategicos.length > 0) {
      console.log('[MapaPolos] Exemplos Estratégicos:', matchedEstrategicos);
    }
    if (matchedLogisticos.length > 0) {
      console.log('[MapaPolos] Exemplos Logísticos:', matchedLogisticos);
    }
    console.log('[MapaPolos] ================================================');
    
    // Forçar re-render do mapa
    map.triggerRepaint();
  }, [baseMunicipios, polosEstrategicosSet, polosLogisticosSet, mapReady]);

  // Inicializar o mapa (apenas uma vez)
  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [-40, -8],
      zoom: 5,
      attributionControl: false,
    });
    
    mapRef.current = map;

    map.on('load', () => {
      console.log('[MapaPolos] 🗺️ Mapa carregado!');
      
      // Adicionar source para municípios
      map.addSource('municipios-src', {
        type: 'geojson',
        data: emptyFC as GeoJSON.FeatureCollection,
        promoteId: 'code_muni',
      });

      // Camada de preenchimento dos municípios
      // Cores:
      // - Verde (#36C244): Polo Estratégico (relacionamento_ativo = true)
      // - Roxo (#9333EA): Polo Logístico (tipo_polo_satelite = 'polo_logistico' sem relacionamento)
      // - Amarelo (#F5DF09): Município Oportunidade (demais)
      map.addLayer({
        id: 'municipios-fill',
        type: 'fill',
        source: 'municipios-src',
        paint: {
          'fill-color': [
            'case',
            ['boolean', ['feature-state', 'isPolo'], false],
            '#36C244',
            ['boolean', ['feature-state', 'isPoloLogistico'], false],
            '#9333EA',
            '#F5DF09'
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.5,
            0.7
          ],
        },
      });

      // Camada de contorno dos municípios
      map.addLayer({
        id: 'municipios-line',
        type: 'line',
        source: 'municipios-src',
        paint: {
          'line-color': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            [
              'case',
              ['boolean', ['feature-state', 'isPolo'], false],
              '#2A9A35',
              ['boolean', ['feature-state', 'isPoloLogistico'], false],
              '#7E22CE',
              '#D4B800'
            ],
            [
              'case',
              ['boolean', ['feature-state', 'isPolo'], false],
              '#2A9A35',
              ['boolean', ['feature-state', 'isPoloLogistico'], false],
              '#6B21A8',
              '#C4A800'
            ]
          ],
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            2,
            0.5
          ],
        },
      });

      // Camada de destaque para município selecionado (borda vermelha)
      map.addLayer({
        id: 'municipio-selected-line',
        type: 'line',
        source: 'municipios-src',
        paint: {
          'line-color': '#EF4444',
          'line-width': [
            'case',
            ['boolean', ['feature-state', 'isSelected'], false],
            1,
            0
          ],
        },
      });

      // Fonte e camada para o Raio Estratégico (círculo João Pessoa)
      map.addSource('radar-circle-src', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection,
      });

      map.addLayer({
        id: 'radar-circle-fill',
        type: 'fill',
        source: 'radar-circle-src',
        paint: {
          'fill-color': '#0066ff',
          'fill-opacity': 0.15,
        },
      });

      map.addLayer({
        id: 'radar-circle-line',
        type: 'line',
        source: 'radar-circle-src',
        paint: {
          'line-color': '#0066ff',
          'line-width': 2,
          'line-dasharray': [5, 5],
        },
      });

      // Configurar handlers de hover usando o novo sistema
      hoverCleanupRef.current = setupPolosHover(
        map,
        'municipios-fill',
        'municipios-src',
        () => polosSetRef.current,
        () => polosLogisticosSetRef.current,
        onMunicipioClick
      );

      // Marcar mapa como pronto
      setMapReady(true);
    });

    return () => {
      // Limpar handlers de hover
      if (hoverCleanupRef.current) {
        hoverCleanupRef.current();
        hoverCleanupRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
    };
  }, []);

  // Atualizar dados do mapa quando baseMunicipios mudar
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !baseMunicipios) return;

    const source = map.getSource('municipios-src') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      console.log('[MapaPolos] 📥 Atualizando dados do mapa...');
      source.setData(baseMunicipios as GeoJSON.FeatureCollection);
      
      // Aplicar feature states após atualizar os dados
      // Pequeno delay para garantir que os dados foram processados
      setTimeout(() => {
        applyFeatureStates();
      }, 100);
    }
  }, [baseMunicipios, mapReady, applyFeatureStates]);

  // Aplicar feature states quando polosEstrategicosSet mudar
  useEffect(() => {
    if (mapReady && baseMunicipios?.features?.length && polosEstrategicosSet.size >= 0) {
      console.log('[MapaPolos] 🔄 Aplicando feature state para Polos Estratégicos...');
      applyFeatureStates();
    }
  }, [polosEstrategicosSet, mapReady, baseMunicipios, applyFeatureStates]);

  // Aplicar filtro visual do Raio Estratégico
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !baseMunicipios?.features?.length) return;

    const radarSource = map.getSource('radar-circle-src') as maplibregl.GeoJSONSource | undefined;
    if (!radarSource) return;

    // Constantes do raio
    const JOAO_PESSOA_COORDS: [number, number] = [-34.95096946933421, -7.14804917856058]; // [lng, lat]
    const JOAO_PESSOA_RADIUS_KM = 1300;

    if (radarFilterActive) {
      // Criar círculo do raio
      const circle = turf.circle(JOAO_PESSOA_COORDS, JOAO_PESSOA_RADIUS_KM, {
        steps: 128,
        units: 'kilometers',
      });

      // Atualizar fonte do raio com o círculo
      const circleFeatureCollection: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features: [circle]
      };
      radarSource.setData(circleFeatureCollection);

      // Filtrar municípios que estão dentro do raio
      const municipiosDentroDoRaio = baseMunicipios.features.filter(f => {
        try {
          return turf.booleanIntersects(circle as any, f as any);
        } catch {
          return false;
        }
      });

      // Atualizar source de municípios com apenas os dentro do raio
      const municipiosSrc = map.getSource('municipios-src') as maplibregl.GeoJSONSource | undefined;
      if (municipiosSrc) {
        const filteredFC: GeoJSON.FeatureCollection = {
          type: 'FeatureCollection',
          features: municipiosDentroDoRaio as any[] // Cast necessário para compatibilidade
        };
        municipiosSrc.setData(filteredFC);
      }

      console.log('[MapaPolos] 🎯 Raio ativo: ', municipiosDentroDoRaio.length, 'municípios dentro do raio');
    } else {
      // Desativar raio: mostrar todos os municípios e limpar círculo
      const municipiosSrc = map.getSource('municipios-src') as maplibregl.GeoJSONSource | undefined;
      if (municipiosSrc) {
        municipiosSrc.setData(baseMunicipios as GeoJSON.FeatureCollection);
      }

      // Limpar círculo do raio
      const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
      radarSource.setData(emptyFC);

      console.log('[MapaPolos] ✓ Raio desativado: mostrando todos os municípios');
    }

    map.triggerRepaint();
  }, [radarFilterActive, baseMunicipios, mapReady]);

  // Aplicar destaque no município selecionado e fazer flyTo
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !baseMunicipios?.features?.length) return;
    
    const source = map.getSource('municipios-src');
    if (!source) return;
    
    const currentSelected = selectedMunicipio?.codigo || null;
    const prevSelected = prevSelectedRef.current;
    
    // Remover destaque do município anteriormente selecionado
    if (prevSelected && prevSelected !== currentSelected) {
      try {
        map.setFeatureState(
          { source: 'municipios-src', id: prevSelected },
          { isSelected: false }
        );
      } catch (err) {
        // Ignora erros silenciosamente
      }
    }
    
    // Aplicar destaque no novo município selecionado
    if (currentSelected) {
      try {
        map.setFeatureState(
          { source: 'municipios-src', id: currentSelected },
          { isSelected: true }
        );
        
        // Encontrar a feature para fazer flyTo
        const feature = baseMunicipios.features.find(
          f => String(f.properties?.code_muni) === currentSelected
        );
        
        if (feature && feature.geometry) {
          // Calcular bounds da geometria
          let minLng = Infinity, maxLng = -Infinity;
          let minLat = Infinity, maxLat = -Infinity;
          
          const processCoordinates = (coords: number[][]) => {
            coords.forEach(([lng, lat]) => {
              minLng = Math.min(minLng, lng);
              maxLng = Math.max(maxLng, lng);
              minLat = Math.min(minLat, lat);
              maxLat = Math.max(maxLat, lat);
            });
          };
          
          if (feature.geometry.type === 'Polygon') {
            feature.geometry.coordinates.forEach(ring => processCoordinates(ring as number[][]));
          } else if (feature.geometry.type === 'MultiPolygon') {
            feature.geometry.coordinates.forEach(polygon => {
              polygon.forEach(ring => processCoordinates(ring as number[][]));
            });
          }
          
          if (minLng !== Infinity) {
            const bounds: [[number, number], [number, number]] = [
              [minLng, minLat],
              [maxLng, maxLat]
            ];
            
            map.fitBounds(bounds, {
              padding: { top: 100, bottom: 100, left: 100, right: 100 },
              maxZoom: 10,
              duration: 1000
            });
            
            console.log('[MapaPolos] 🎯 FlyTo para:', selectedMunicipio?.nome);
          }
        }
      } catch (err) {
        console.warn('[MapaPolos] Erro ao aplicar destaque:', err);
      }
    }
    
    // Atualizar referência
    prevSelectedRef.current = currentSelected;
    
    // Forçar re-render
    map.triggerRepaint();
  }, [selectedMunicipio, mapReady, baseMunicipios]);

  // Aplicar filtro nos estados/regiões selecionados: mostrar apenas municípios da região
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !baseMunicipios?.features?.length) return;
    
    // Se há município selecionado, o efeito de município tem prioridade
    if (selectedMunicipio?.codigo) return;
    
    const municipiosSrc = map.getSource('municipios-src') as maplibregl.GeoJSONSource | undefined;
    if (!municipiosSrc) return;
    
    const currentUFs = selectedUFs || [];
    
    // Mapeamento de sigla para nome do estado
    const siglaToNome: Record<string, string> = {
      'AC': 'Acre', 'AL': 'Alagoas', 'AP': 'Amapá', 'AM': 'Amazonas',
      'BA': 'Bahia', 'CE': 'Ceará', 'DF': 'Distrito Federal',
      'ES': 'Espírito Santo', 'GO': 'Goiás', 'MA': 'Maranhão',
      'MT': 'Mato Grosso', 'MS': 'Mato Grosso do Sul', 'MG': 'Minas Gerais',
      'PA': 'Pará', 'PB': 'Paraíba', 'PR': 'Paraná', 'PE': 'Pernambuco',
      'PI': 'Piauí', 'RJ': 'Rio de Janeiro', 'RN': 'Rio Grande do Norte',
      'RS': 'Rio Grande do Sul', 'RO': 'Rondônia', 'RR': 'Roraima',
      'SC': 'Santa Catarina', 'SP': 'São Paulo', 'SE': 'Sergipe', 'TO': 'Tocantins'
    };
    
    // Converter siglas para nomes de estados
    const estadosNomes = new Set(currentUFs.map(uf => siglaToNome[uf] || uf));
    
    // Se não há estados selecionados, mostrar todos os municípios
    if (currentUFs.length === 0) {
      municipiosSrc.setData(baseMunicipios as GeoJSON.FeatureCollection);
      prevSelectedUFsRef.current = currentUFs;
      map.triggerRepaint();
      return;
    }
    
    // Filtrar apenas os municípios dos estados selecionados
    const municipiosFiltrados = baseMunicipios.features.filter(feature => {
      const estado = feature.properties?.name_state || '';
      return estadosNomes.has(estado);
    });
    
    // Atualizar source com os municípios filtrados
    const filteredFC: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: municipiosFiltrados as any[]
    };
    municipiosSrc.setData(filteredFC);
    
    // Calcular bounds para fazer flyTo
    let minLng = Infinity, maxLng = -Infinity;
    let minLat = Infinity, maxLat = -Infinity;
    
    const processCoordinates = (coords: number[][]) => {
      coords.forEach(([lng, lat]) => {
        minLng = Math.min(minLng, lng);
        maxLng = Math.max(maxLng, lng);
        minLat = Math.min(minLat, lat);
        maxLat = Math.max(maxLat, lat);
      });
    };
    
    municipiosFiltrados.forEach(feature => {
      if (feature.geometry) {
        if (feature.geometry.type === 'Polygon') {
          feature.geometry.coordinates.forEach(ring => processCoordinates(ring as number[][]));
        } else if (feature.geometry.type === 'MultiPolygon') {
          feature.geometry.coordinates.forEach(polygon => {
            polygon.forEach(ring => processCoordinates(ring as number[][]));
          });
        }
      }
    });
    
    // Fazer flyTo para os bounds dos estados selecionados
    if (minLng !== Infinity && municipiosFiltrados.length > 0) {
      const bounds: [[number, number], [number, number]] = [
        [minLng, minLat],
        [maxLng, maxLat]
      ];
      
      map.fitBounds(bounds, {
        padding: { top: 50, bottom: 50, left: 50, right: 50 },
        maxZoom: 8,
        duration: 1000
      });
      
      console.log(`[MapaPolos] 🎯 Filtrando para ${currentUFs.length} estado(s): ${currentUFs.join(', ')} (${municipiosFiltrados.length} municípios visíveis)`);
    }
    
    // Atualizar referência
    prevSelectedUFsRef.current = currentUFs;
    
    // Forçar re-render
    map.triggerRepaint();
  }, [selectedUFs, selectedMunicipio, mapReady, baseMunicipios]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full rounded-xl" />

      {/* Legenda Estática */}
      <div className="absolute bottom-3 left-3 bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-lg p-4 z-10 border border-slate-700/50 space-y-3 max-w-xs">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Legenda</h4>
        
        {/* Polos Estratégicos */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[#36C244] border border-[#2A9A35]" />
          <span className="text-sm font-medium text-slate-200">Polos Estratégicos</span>
        </div>

        {/* Polos Logísticos */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[#9333EA] border border-[#7E22CE]" />
          <span className="text-sm font-medium text-slate-200">Polos Logísticos</span>
        </div>

        {/* Municípios Oportunidade */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[#F5DF09] border border-[#D4B800]" />
          <span className="text-sm font-medium text-slate-200">Municípios Oportunidade</span>
        </div>
      </div>

    </div>
  );
}
