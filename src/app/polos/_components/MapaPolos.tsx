"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import type GeoJSON from 'geojson';
import type { MunicipiosGeoJSON, MunicipioRelacionamento } from '@/contexts/PolosDataContext';
import { setupPolosHover, POPUP_HOVER_CONFIG } from './polosHoverHandlers';

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

interface PistaVoo {
  codigo: string;
  uf: string;
  cidade: string;
  codigo_pista: string;
  nome_pista: string;
  tipo_pista: string;
  latitude_pista: string | number;
  longitude_pista: string | number;
}

interface MapaPolosProps {
  baseMunicipios: MunicipiosGeoJSON | null;
  municipiosRelacionamento?: MunicipioRelacionamento[];
  municipiosSatelites?: string[]; // Vizinhos queen (1ª ordem) dos Polos Estratégicos
  selectedMunicipio?: MunicipioSelecionado | null;
  selectedUFs?: string[]; // Estados selecionados (siglas)
  radarFilterActive?: boolean; // Raio Estratégico ativo
  relacionamentoFilterActive?: boolean; // Filtro de Relacionamento ativo (apenas Polos Estratégicos)
  poloLogisticoFilterActive?: boolean; // Filtro de Polos Logísticos ativo
  pistas?: PistaVoo[]; // Pistas de voo
  pistasFilterActive?: boolean; // Filtro de Pistas de Voo ativo
  onMunicipioClick?: (codigoMunicipio: string) => void; // Callback ao clicar em polígono
}

export default function MapaPolos({ baseMunicipios, municipiosRelacionamento = [], municipiosSatelites = [], selectedMunicipio, selectedUFs = [], radarFilterActive = false, relacionamentoFilterActive = false, poloLogisticoFilterActive = false, pistas = [], pistasFilterActive = false, onMunicipioClick }: MapaPolosProps) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const hoverCleanupRef = useRef<(() => void) | null>(null);
  const pistasHoverCleanupRef = useRef<(() => void) | null>(null);
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

  // Set de municípios satélites (vizinhos queen 1ª ordem dos Polos Estratégicos)
  // IMPORTANTE: satélite NÃO pode ser Polo Estratégico nem Polo Logístico (independente de filtro)
  const municipiosSatelitesSet = useMemo(() => {
    const raw = new Set<string>((municipiosSatelites || []).map((c) => String(c)).filter(Boolean));
    const cleaned = new Set<string>();
    raw.forEach((code) => {
      if (!polosEstrategicosSet.has(code) && !polosLogisticosSet.has(code)) {
        cleaned.add(code);
      }
    });

    if (raw.size > 0) {
      console.log('[MapaPolos] Municípios Satélites (queen, limpos):', cleaned.size, '(raw:', raw.size, ')');
    }

    return cleaned;
  }, [municipiosSatelites, polosEstrategicosSet, polosLogisticosSet]);

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

  // Ref para acessar municipiosSatelitesSet dentro dos handlers
  const municipiosSatelitesSetRef = useRef(municipiosSatelitesSet);
  useEffect(() => {
    municipiosSatelitesSetRef.current = municipiosSatelitesSet;
  }, [municipiosSatelitesSet]);

  // Contagens para legenda (mutuamente exclusivas por prioridade de exibição)
  const legendCounts = useMemo(() => {
    const total = baseMunicipios?.features?.length ?? 0;
    const countStrategic = polosEstrategicosSet.size;
    const countSatellite = municipiosSatelitesSet.size;
    const countLogistic = Array.from(polosLogisticosSet).filter(
      (code) => !polosEstrategicosSet.has(code)
    ).length;
    const countOportunidade = Math.max(
      0,
      total - countStrategic - countSatellite - countLogistic
    );
    return {
      strategic: countStrategic,
      satellite: countSatellite,
      logistic: countLogistic,
      oportunidade: countOportunidade
    };
  }, [baseMunicipios?.features?.length, polosEstrategicosSet, municipiosSatelitesSet, polosLogisticosSet]);

  // Função centralizada para aplicar filtros de municípios em sequência
  // Pipeline: UF → Radar → Relacionamento → (outros filtros futuros)
  const applyMunicipiosFilters = useCallback((): GeoJSON.FeatureCollection => {
    if (!baseMunicipios?.features?.length) {
      return { type: 'FeatureCollection', features: [] };
    }

    let filteredFeatures = [...baseMunicipios.features];

    // PASSO 1: Filtrar por UF/Região (se houver seleção)
    if (selectedUFs && selectedUFs.length > 0) {
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
      
      const estadosNomes = new Set(selectedUFs.map(uf => siglaToNome[uf] || uf));
      filteredFeatures = filteredFeatures.filter(feature => {
        const estado = feature.properties?.name_state || '';
        return estadosNomes.has(estado);
      });
    }

    // PASSO 2: Filtrar por Radar Estratégico (se ativo)
    if (radarFilterActive) {
      const JOAO_PESSOA_COORDS: [number, number] = [-34.95096946933421, -7.14804917856058];
      const JOAO_PESSOA_RADIUS_KM = 1300;
      
      const circle = turf.circle(JOAO_PESSOA_COORDS, JOAO_PESSOA_RADIUS_KM, {
        steps: 128,
        units: 'kilometers',
      });

      filteredFeatures = filteredFeatures.filter(f => {
        try {
          return turf.booleanIntersects(circle as any, f as any);
        } catch {
          return false;
        }
      });
    }

    // PASSO 3: Filtrar por Relacionamento (apenas Polos Estratégicos) se ativo
    if (relacionamentoFilterActive) {
      filteredFeatures = filteredFeatures.filter(f => {
        const codeMuni = String(f.properties?.code_muni || '');
        return polosEstrategicosSet.has(codeMuni) || municipiosSatelitesSet.has(codeMuni);
      });
    }

    // PASSO 4: Garantir que o município selecionado sempre apareça (se existir)
    // Isso permite que o usuário veja o município destacado mesmo que ele não passe pelos filtros
    if (selectedMunicipio?.codigo) {
      const municipioSelecionado = baseMunicipios.features.find(
        f => String(f.properties?.code_muni) === selectedMunicipio.codigo
      );
      if (municipioSelecionado) {
        // Verificar se já não está na lista filtrada
        const jaEstaNaLista = filteredFeatures.some(
          f => String(f.properties?.code_muni) === selectedMunicipio.codigo
        );
        if (!jaEstaNaLista) {
          // Adicionar o município selecionado à lista filtrada
          filteredFeatures.push(municipioSelecionado as any);
        }
      }
    }

    return {
      type: 'FeatureCollection',
      features: filteredFeatures as any[]
    };
  }, [baseMunicipios, selectedUFs, radarFilterActive, relacionamentoFilterActive, polosEstrategicosSet, municipiosSatelitesSet, selectedMunicipio]);

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

    // Aplicar isPolo, isPoloLogistico e isSatellite feature state para cada município
    // Lógica:
    // - isPolo (verde): tem relacionamento_ativo = true (prioridade sobre polo_logistico)
    // - isPoloLogistico (roxo): tem tipo_polo_satelite = 'polo_logistico' E NÃO tem relacionamento_ativo E filtro está ativo
    // - isSatellite (amarelo #F5DF09, opacidade menor): vizinho queen de 1ª ordem de polo estratégico, mas NÃO é polo estratégico nem logístico
    baseMunicipios.features.forEach(feature => {
      const codeMuni = String(feature.properties?.code_muni || '');
      const isPolo = polosEstrategicosSet.has(codeMuni);
      const isPoloLogisticoRaw = polosLogisticosSet.has(codeMuni);
      // Polo Logístico só se NÃO for Polo Estratégico E filtro estiver ativo
      const isPoloLogistico = isPoloLogisticoRaw && !isPolo && poloLogisticoFilterActive;
      const isSatellite = municipiosSatelitesSet.has(codeMuni);
      
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
            { isPolo, isPoloLogistico, isSatellite }
          );
        } catch (err) {
          //
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
  }, [baseMunicipios, polosEstrategicosSet, polosLogisticosSet, mapReady, poloLogisticoFilterActive]);

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
      // - Amarelo (#F5DF09, opacidade menor): Município Satélite (queen 1ª ordem de polo estratégico)
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
            ['boolean', ['feature-state', 'isSatellite'], false],
            '#F5DF09',
            '#F5DF09'
          ],
          'fill-opacity': [
            'case',
            ['boolean', ['feature-state', 'hover'], false],
            0.5,
            ['boolean', ['feature-state', 'isSatellite'], false],
            0.35,
            0.6
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
              ['boolean', ['feature-state', 'isSatellite'], false],
              '#C4A800',
              '#D4B800'
            ],
            [
              'case',
              ['boolean', ['feature-state', 'isPolo'], false],
              '#2A9A35',
              ['boolean', ['feature-state', 'isPoloLogistico'], false],
              '#6B21A8',
              ['boolean', ['feature-state', 'isSatellite'], false],
              '#C4A800',
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
        () => municipiosSatelitesSetRef.current,
        onMunicipioClick
      );

      // Criar ícone SVG de avião (branco com contorno escuro) e adicionar ao mapa
      const airplaneSvg = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z" fill="#FFFFFF" stroke="#111827" stroke-width="0.7"/>
        </svg>
      `;
      
      // Converter SVG para imagem
      const img = new Image();
      img.onload = () => {
        if (!map.hasImage('airplane-icon')) {
          map.addImage('airplane-icon', img);
        }
        
        // Adicionar source para pistas de voo (só se ainda não existir)
        if (!map.getSource('pistas-src')) {
          map.addSource('pistas-src', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] } as GeoJSON.FeatureCollection,
          });

          // Adicionar camada de símbolos para pistas
          // Visibilidade inicial: 'none' (desativado por padrão)
          map.addLayer({
            id: 'pistas-layer',
            type: 'symbol',
            source: 'pistas-src',
            layout: {
              'icon-image': 'airplane-icon',
              'icon-size': 0.8,
              'icon-allow-overlap': true,
              'icon-ignore-placement': false,
              'visibility': 'none', // Inicialmente oculta
            },
          });

          // Handler de hover para pistas de voo (similar aos polígonos)
          let pistasPopup: maplibregl.Popup | null = null;

          // Handler de mousemove (exibe tooltip)
          const handlePistasMouseMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
            if (!e.features || e.features.length === 0) return;

            const feature = e.features[0];
            const props = feature.properties as any;

            // Escapar HTML para segurança
            const escapeHtml = (text: string) => {
              const div = document.createElement('div');
              div.textContent = text;
              return div.innerHTML;
            };

            // Criar HTML do tooltip (mesmo estilo dos polos)
            const tooltipHtml = `
              <div style="padding: 12px; font-family: system-ui, -apple-system, sans-serif; min-width: 200px; background: #ffffff; border-radius: 14px; text-align: center; box-shadow: 0 10px 30px rgba(2,6,23,0.08); border: 1px solid rgba(15,23,42,0.06);">
                <!-- Badge Pista de Voo -->
                <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: #6B7280; color: #ffffff; font-size: 10px; font-weight: 600; padding: 4px 10px; border-radius: 14px; margin: 0 auto 10px;">
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M21 16v-2l-8-5V3.5c0-.83-.67-1.5-1.5-1.5S10 2.67 10 3.5V9l-8 5v2l8-2.5V19l-2 1.5V22l3.5-1 3.5 1v-1.5L13 19v-5.5l8 2.5z"/></svg> Pista de Voo
                </div>
                
                <!-- Nome da Cidade -->
                <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: #0f172a; text-align: center;">
                  ${escapeHtml(props.cidade || '-')}
                </div>
                
                <!-- Estado (UF) -->
                <div style="font-size: 12px; color: #64748b; margin-bottom: 4px; text-align: center;">
                  <span style="font-weight: 500;">UF:</span> ${escapeHtml(props.uf || '-')}
                </div>
                
                <!-- Separador e Informações da Pista -->
                <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
                  <div style="font-size: 12px; color: #0f172a; margin-bottom: 4px; text-align: center;">
                    <span style="font-weight: 500;">Código:</span> ${escapeHtml(props.codigo_pista || '-')}
                  </div>
                  <div style="font-size: 12px; color: #0f172a; margin-bottom: 4px; text-align: center;">
                    <span style="font-weight: 500;">Nome:</span> ${escapeHtml(props.nome_pista || '-')}
                  </div>
                  <div style="font-size: 12px; color: #0f172a; text-align: center;">
                    <span style="font-weight: 500;">Tipo:</span> ${escapeHtml(props.tipo_pista || '-')}
                  </div>
                </div>
              </div>
            `;

            // Remove popup anterior se existir
            if (pistasPopup) {
              pistasPopup.remove();
            }

            // Cria novo popup de hover
            pistasPopup = new maplibregl.Popup(POPUP_HOVER_CONFIG)
              .setLngLat(e.lngLat)
              .setHTML(tooltipHtml)
              .addTo(map);

            // Muda cursor para pointer
            map.getCanvas().style.cursor = 'pointer';
          };

          // Handler de mouseleave (remove tooltip)
          const handlePistasMouseLeave = () => {
            // Remove popup
            if (pistasPopup) {
              pistasPopup.remove();
              pistasPopup = null;
            }

            // Reseta cursor
            map.getCanvas().style.cursor = '';
          };

          // Registrar handlers de hover
          map.on('mousemove', 'pistas-layer', handlePistasMouseMove);
          map.on('mouseleave', 'pistas-layer', handlePistasMouseLeave);

          // Guardar função de cleanup (captura pistasPopup do escopo)
          pistasHoverCleanupRef.current = () => {
            map.off('mousemove', 'pistas-layer', handlePistasMouseMove);
            map.off('mouseleave', 'pistas-layer', handlePistasMouseLeave);
            // Nota: pistasPopup será limpo quando o mapa for removido
          };
        }
      };
      
      const svgBlob = new Blob([airplaneSvg], { type: 'image/svg+xml' });
      const url = URL.createObjectURL(svgBlob);
      img.src = url;

      // Marcar mapa como pronto
      setMapReady(true);
    });

    return () => {
      // Limpar handlers de hover dos polígonos
      if (hoverCleanupRef.current) {
        hoverCleanupRef.current();
        hoverCleanupRef.current = null;
      }
      // Limpar handlers de hover das pistas
      if (pistasHoverCleanupRef.current) {
        pistasHoverCleanupRef.current();
        pistasHoverCleanupRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
      setMapReady(false);
    };
  }, []);

  // Atualizar dados do mapa quando baseMunicipios mudar (usando pipeline centralizado)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !baseMunicipios) return;

    const source = map.getSource('municipios-src') as maplibregl.GeoJSONSource | undefined;
    if (source) {
      console.log('[MapaPolos] 📥 Atualizando dados do mapa...');
      
      // Sempre usar pipeline centralizado que respeita UF + Radar + Relacionamento
      // Quando há município selecionado, ele será destacado visualmente, mas todos os polígonos filtrados permanecem visíveis
      const filteredFC = applyMunicipiosFilters();
      source.setData(filteredFC);
      
      // Aplicar feature states após atualizar os dados
      // Pequeno delay para garantir que os dados foram processados
      setTimeout(() => {
        applyFeatureStates();
      }, 100);
    }
  }, [baseMunicipios, mapReady, applyFeatureStates, applyMunicipiosFilters]);

  // Aplicar feature states quando polosEstrategicosSet mudar
  useEffect(() => {
    if (mapReady && baseMunicipios?.features?.length && polosEstrategicosSet.size >= 0) {
      console.log('[MapaPolos] 🔄 Aplicando feature state para Polos Estratégicos...');
      applyFeatureStates();
    }
  }, [polosEstrategicosSet, mapReady, baseMunicipios, applyFeatureStates]);

  // Aplicar feature states quando o filtro de Polos Logísticos mudar
  useEffect(() => {
    if (mapReady && baseMunicipios?.features?.length) {
      console.log('[MapaPolos] 🔄 Aplicando feature state para Polos Logísticos (filtro:', poloLogisticoFilterActive ? 'ativo' : 'inativo', ')...');
      applyFeatureStates();
    }
  }, [poloLogisticoFilterActive, mapReady, baseMunicipios, applyFeatureStates]);

  // Aplicar filtro visual do Raio Estratégico e atualizar municípios usando pipeline centralizado
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
    } else {
      // Limpar círculo do raio
      const emptyFC: GeoJSON.FeatureCollection = { type: 'FeatureCollection', features: [] };
      radarSource.setData(emptyFC);
    }

    // IMPORTANTE: Usar função centralizada que respeita UF + Radar + Relacionamento
    // Aplicar filtros normalmente mesmo quando há município selecionado
    const municipiosSrc = map.getSource('municipios-src') as maplibregl.GeoJSONSource | undefined;
    if (municipiosSrc) {
      const filteredFC = applyMunicipiosFilters();
      municipiosSrc.setData(filteredFC);
      console.log('[MapaPolos] 🔄 Pipeline de filtros aplicado:', filteredFC.features.length, 'municípios visíveis');
    }

    map.triggerRepaint();
  }, [radarFilterActive, relacionamentoFilterActive, baseMunicipios, mapReady, applyMunicipiosFilters]);

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

  // Aplicar filtro nos estados/regiões selecionados usando pipeline centralizado
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !baseMunicipios?.features?.length) return;
    
    const municipiosSrc = map.getSource('municipios-src') as maplibregl.GeoJSONSource | undefined;
    if (!municipiosSrc) return;
    
    // Usar função centralizada que respeita UF + Radar + Relacionamento
    // Aplicar filtros normalmente mesmo quando há município selecionado
    const filteredFC = applyMunicipiosFilters();
    municipiosSrc.setData(filteredFC);
    
    // Calcular bounds para fazer flyTo (apenas se houver UF selecionada E não houver município selecionado)
    // Quando há município selecionado, o flyTo é feito pelo useEffect específico do município
    const currentUFs = selectedUFs || [];
    if (currentUFs.length > 0 && filteredFC.features.length > 0 && !selectedMunicipio?.codigo) {
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
      
      filteredFC.features.forEach(feature => {
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
      if (minLng !== Infinity) {
        const bounds: [[number, number], [number, number]] = [
          [minLng, minLat],
          [maxLng, maxLat]
        ];
        
        map.fitBounds(bounds, {
          padding: { top: 50, bottom: 50, left: 50, right: 50 },
          maxZoom: 8,
          duration: 1000
        });
        
        console.log(`[MapaPolos] 🎯 Filtrando para ${currentUFs.length} estado(s): ${currentUFs.join(', ')} (${filteredFC.features.length} municípios visíveis)`);
      }
    }
    
    // Atualizar referência
    prevSelectedUFsRef.current = currentUFs;
    
    // Forçar re-render
    map.triggerRepaint();
  }, [selectedUFs, selectedMunicipio, mapReady, baseMunicipios, applyMunicipiosFilters, relacionamentoFilterActive]);

  // Atualizar pistas de voo no mapa (respeitando filtros de UF, Raio Estratégico e Relacionamento)
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady || !pistas.length) return;

    const pistasSource = map.getSource('pistas-src') as maplibregl.GeoJSONSource | undefined;
    if (!pistasSource) return;

    // Filtrar pistas por UF se houver seleção
    let pistasFiltradas = pistas;
    if (selectedUFs && selectedUFs.length > 0) {
      pistasFiltradas = pistasFiltradas.filter(p => selectedUFs.includes(p.uf));
    }

    // Filtrar pistas por Raio Estratégico se ativo
    if (radarFilterActive) {
      const JOAO_PESSOA_COORDS: [number, number] = [-34.95096946933421, -7.14804917856058]; // [lng, lat]
      const JOAO_PESSOA_RADIUS_KM = 1300;
      
      const circle = turf.circle(JOAO_PESSOA_COORDS, JOAO_PESSOA_RADIUS_KM, {
        steps: 128,
        units: 'kilometers',
      });

      // Filtrar pistas que estão dentro do raio
      pistasFiltradas = pistasFiltradas.filter(p => {
        const lat = typeof p.latitude_pista === 'string' ? parseFloat(p.latitude_pista) : p.latitude_pista;
        const lng = typeof p.longitude_pista === 'string' ? parseFloat(p.longitude_pista) : p.longitude_pista;
        
        if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) {
          return false;
        }

        // Criar um ponto GeoJSON para a pista
        const pistaPoint: GeoJSON.Feature = {
          type: 'Feature',
          geometry: {
            type: 'Point',
            coordinates: [lng, lat],
          },
          properties: {},
        };

        // Verificar se o ponto está dentro ou intersecta o círculo
        try {
          return turf.booleanIntersects(circle as any, pistaPoint as any);
        } catch {
          return false;
        }
      });
    }

    // Filtrar pistas por Relacionamento (apenas Polos Estratégicos) se ativo
    if (relacionamentoFilterActive) {
      pistasFiltradas = pistasFiltradas.filter(p => {
        const codigoMuni = String(p.codigo || '');
        return polosEstrategicosSet.has(codigoMuni);
      });
    }

    // Converter pistas filtradas para GeoJSON FeatureCollection
    const pistasFeatures: GeoJSON.Feature[] = pistasFiltradas
      .map(p => {
        const lat = typeof p.latitude_pista === 'string' ? parseFloat(p.latitude_pista) : p.latitude_pista;
        const lng = typeof p.longitude_pista === 'string' ? parseFloat(p.longitude_pista) : p.longitude_pista;
        
        return {
          type: 'Feature' as const,
          geometry: {
            type: 'Point' as const,
            coordinates: [lng, lat],
          },
          properties: {
            codigo: p.codigo,
            uf: p.uf,
            cidade: p.cidade,
            codigo_pista: p.codigo_pista,
            nome_pista: p.nome_pista,
            tipo_pista: p.tipo_pista,
          },
        };
      });

    const pistasGeoJSON: GeoJSON.FeatureCollection = {
      type: 'FeatureCollection',
      features: pistasFeatures,
    };

    pistasSource.setData(pistasGeoJSON);
    const filtrosAplicados = [];
    if (selectedUFs?.length) filtrosAplicados.push(`UF: ${selectedUFs.join(', ')}`);
    if (radarFilterActive) filtrosAplicados.push('Raio Estratégico');
    if (relacionamentoFilterActive) filtrosAplicados.push('Relacionamento');
    console.log('[MapaPolos] ✈️ Pistas de voo atualizadas:', pistasFeatures.length, filtrosAplicados.length ? `(filtros: ${filtrosAplicados.join(', ')})` : '');
  }, [pistas, mapReady, selectedUFs, radarFilterActive, relacionamentoFilterActive, polosEstrategicosSet]);

  // Controlar visibilidade da camada de pistas baseado no filtro
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !mapReady) return;

    // Verificar se a camada existe antes de tentar alterar
    const pistasLayer = map.getLayer('pistas-layer');
    if (!pistasLayer) {
      // Se a camada ainda não existe, tentar novamente após um pequeno delay
      setTimeout(() => {
        const retryLayer = map.getLayer('pistas-layer');
        if (retryLayer) {
          map.setLayoutProperty('pistas-layer', 'visibility', pistasFilterActive ? 'visible' : 'none');
        }
      }, 100);
      return;
    }

    // Mostrar ou esconder a camada baseado no filtro
    map.setLayoutProperty('pistas-layer', 'visibility', pistasFilterActive ? 'visible' : 'none');
    console.log('[MapaPolos] ✈️ Visibilidade das pistas:', pistasFilterActive ? 'visível' : 'oculta');
  }, [pistasFilterActive, mapReady]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full rounded-xl" />

      {/* Legenda Estática */}
      <div className="absolute bottom-3 left-3 bg-slate-800/95 backdrop-blur-sm rounded-lg shadow-lg p-4 z-10 border border-slate-700/50 space-y-3 max-w-xs">
        <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Legenda</h4>
        
        {/* Polos Estratégicos */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[#36C244] border border-[#2A9A35]" />
          <span className="text-sm font-medium text-slate-200">Polos Estratégicos - {legendCounts.strategic}</span>
        </div>

        {/* Municípios Satélites */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[#F5DF09] border border-[#C4A800] opacity-90" />
          <span className="text-sm font-medium text-slate-200">Municípios Satélites - {legendCounts.satellite}</span>
        </div>

        {/* Polos Logísticos */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[#9333EA] border border-[#7E22CE]" />
          <span className="text-sm font-medium text-slate-200">Polos Logísticos - {legendCounts.logistic}</span>
        </div>

        {/* Municípios Oportunidade */}
        <div className="flex items-center gap-2">
          <span className="inline-block w-3 h-3 rounded-full bg-[#F5DF09] border border-[#D4B800]" />
          <span className="text-sm font-medium text-slate-200">Municípios Oportunidade - {legendCounts.oportunidade}</span>
        </div>
      </div>

    </div>
  );
}
