"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import maplibregl, { LngLatBoundsLike, Map as MapLibreMap, LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';

export interface FeatureLike {
  type: 'Feature';
  properties: Record<string, any>;
  geometry: any;
}

export interface FC {
  type: 'FeatureCollection';
  features: FeatureLike[];
}

function toGeometryFromPropsGeom(features: any[]): FeatureLike[] {
  return features.map((f) => {
    const props = f?.properties ?? {};
    const geom = f?.geometry ?? props?.geom ?? null;
    return {
      type: 'Feature',
      properties: props,
      geometry: geom,
    } as FeatureLike;
  }).filter(f => !!f.geometry);
}

function computeBounds(fc: FC): LngLatBounds | null {
  const bounds = new LngLatBounds();
  let has = false;
  for (const f of fc.features) {
    const geom = f.geometry;
    const coords = geom?.type === 'Polygon' || geom?.type === 'MultiPolygon' ? geom.coordinates : null;
    if (!coords) continue;
    // iterate coordinates recursively
    const pushCoord = (c: number[]) => {
      if (Array.isArray(c) && c.length >= 2) {
        bounds.extend([c[0], c[1]]);
        has = true;
      }
    };
    const walk = (arr: any) => {
      if (typeof arr?.[0] === 'number') {
        pushCoord(arr as number[]);
      } else if (Array.isArray(arr)) {
        for (const a of arr) walk(a);
      }
    };
    walk(coords);
  }
  return has ? bounds : null;
}

// Função para dissolver/unificar geometrias em um contorno único
function dissolveGeometries(features: FeatureLike[]): any {
  if (!features.length) return null;
  
  // Coletar todas as coordenadas de contorno
  const allCoordinates: number[][][] = [];
  
  for (const feature of features) {
    const geom = feature.geometry;
    if (!geom) continue;
    
    if (geom.type === 'Polygon') {
      // Para Polygon, pegar apenas o anel externo (primeiro array)
      if (geom.coordinates && geom.coordinates[0]) {
        allCoordinates.push(geom.coordinates[0]);
      }
    } else if (geom.type === 'MultiPolygon') {
      // Para MultiPolygon, pegar o anel externo de cada polígono
      for (const polygon of geom.coordinates || []) {
        if (polygon && polygon[0]) {
          allCoordinates.push(polygon[0]);
        }
      }
    }
  }
  
  if (!allCoordinates.length) return null;
  
  // Simples união: criar um MultiPolygon com todos os anéis externos
  // (Para uma dissolução mais sofisticada, seria necessário usar uma biblioteca como Turf.js)
  return {
    type: 'MultiPolygon',
    coordinates: allCoordinates.map(coords => [coords])
  };
}

export default function MapLibrePolygons({
  polos,
  periferias,
  appliedPolo,
  appliedUF,
}: {
  polos: FC;
  periferias: FC;
  appliedPolo: string;
  appliedUF: string;
}) {
  const mapRef = useRef<MapLibreMap | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const popupRef = useRef<maplibregl.Popup | null>(null);
  // Camadas visíveis: polos deve sempre iniciar ativado (e ficará bloqueado)
  const [showPolos, setShowPolos] = useState(true);
  const [showPeriferia, setShowPeriferia] = useState(false);
  // ADICIONAR ESTADO PARA RAIO
  const [radiusMode, setRadiusMode] = useState(false);
  const [circleGeoJSON, setCircleGeoJSON] = useState<any>(null);
  const centerRef = useRef<[number, number] | null>(null);
  const radiusPopupRef = useRef<maplibregl.Popup | null>(null);
  // ADICIONAR REFS NOVOS
  const radiusModeRef = useRef(false);
  const circleRef = useRef<any>(null);
  const isDrawingRef = useRef(false);
  const moveHandlerRef = useRef<((ev: MouseEvent) => void) | null>(null);
  const upHandlerRef = useRef<((ev: MouseEvent) => void) | null>(null);
  // Listas dentro do raio
  const [polosInRadius, setPolosInRadius] = useState<any[]>([]);
  const [periferiasInRadius, setPeriferiasInRadius] = useState<any[]>([]);
  // Refs com os dados mais recentes das features (evita closures com dados antigos)
  const polosLatestRef = useRef<FC>({ type: 'FeatureCollection', features: [] });
  const periLatestRef = useRef<FC>({ type: 'FeatureCollection', features: [] });
  
  // Sincronizar checkbox da periferia com contexto de filtro
  useEffect(() => {
    const ufUpper = String(appliedUF || '').toUpperCase();
    const inUFMode = appliedPolo === 'ALL' && ufUpper !== 'ALL' && ufUpper !== '';
    const inPoloMode = appliedPolo !== 'ALL';
    const inFilterMode = inUFMode || inPoloMode;
    
    // Ligar automaticamente o checkbox quando entrar em modo de filtro
    if (inFilterMode && !showPeriferia) {
      setShowPeriferia(true);
    }
  }, [appliedUF, appliedPolo, showPeriferia]);
  
  // Cores para polígonos normais e destacados (selecionados)
  const colors = {
    polo: {
      fillOpacity: 0.6,
      line: '#2563EB', // Azul substituindo cores anteriores
      lineWidth: 2,
    },
    poloHighlighted: {
      fillOpacity: 0.8,
      line: '#2563EB', // Azul para destaque
      lineWidth: 3,
    },
    periferia: {
      fillOpacity: 0.10,
      line: '#2563EB', // Azul com baixa opacidade
      lineWidth: 0, // Sem borda para periferia
    },
    periferiaHighlighted: {
      fillOpacity: 0.8,
      line: '#2563EB', // Azul com baixa opacidade
      lineWidth: 0, // Sem borda para periferia destacada
    }
  };

  // Formatadores para popup
  const formatCurrencyBRL = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
      minimumFractionDigits: 2
    }).format(value);
  };

  const safe = (value: any, fallback = '—') => {
    return value != null && value !== '' ? String(value) : fallback;
  };

  // Criar mapa codigo_origem -> municipio_origem para lookup (memoizado)
  const codigoToMunicipio = useMemo(() => {
    return new Map(
      (polos.features || []).map(f => [
        String(f.properties?.codigo_origem ?? '').trim(),
        String(f.properties?.municipio_origem ?? '')
      ])
    );
  }, [polos]);

  // Função para fechar popup ativo
  const closeActivePopup = () => {
    if (popupRef.current) {
      popupRef.current.remove();
      popupRef.current = null;
    }
  };

  // Função para criar conteúdo do popup
  const createPopupContent = (properties: any, isPoloLayer: boolean) => {
    if (isPoloLayer) {
      // Popup para polo
      const nome_polo = safe(properties.municipio_origem, 'Polo');
      const uf_polo = safe(properties.UF || properties.UF_origem);
      const codigo_polo = safe(properties.codigo_origem);
      const somaDestino = Number(properties.soma_valor_total_destino) || 0;
      const valorOrigem = Number(properties.valor_total_origem) || 0;
      const total_polo = somaDestino + valorOrigem;

      return `
        <div class="nexus-popup-content">
          <div class="nexus-popup-title">${nome_polo}</div>
          <div class="nexus-popup-line">UF: ${uf_polo}</div>
          <div class="nexus-popup-line">Código IBGE: ${codigo_polo}</div>
          <div class="nexus-popup-line">Valor Total Polo: ${formatCurrencyBRL(total_polo)}</div>
        </div>
      `;
    } else {
      // Popup para periferia
      const nome_destino = safe(properties.municipio_destino, 'Município');
      const uf_destino = safe(properties.UF);
      const codigoDestino = safe(properties.codigo_destino);
      const valor_destino = Number(properties.valor_total_destino) || 0;
      const codigoOrigem = safe(properties.codigo_origem);
      const poloReferencia = codigoToMunicipio.get(codigoOrigem) || codigoOrigem;

      return `
        <div class="nexus-popup-content">
          <div class="nexus-popup-title">${nome_destino}</div>
          <div class="nexus-popup-line">UF: ${uf_destino}</div>
          <div class="nexus-popup-line">Código: ${codigoDestino}</div>
          <div class="nexus-popup-line">Valor: ${formatCurrencyBRL(valor_destino)}</div>
          <div class="nexus-popup-line">Polo Código: ${safe(poloReferencia)}</div>
        </div>
      `;
    }
  };

  // Paleta oficial por UF (polo = escuro, periferia = claro com +15% luminosidade)
  const UF_COLORS: Record<string, { polo: string; peri: string }> = {
    AC: { polo: '#0A3D91', peri: '#A3C7FF' },
    AL: { polo: '#2F5AA6', peri: '#C1D5FF' },
    AM: { polo: '#3B47A5', peri: '#D0D1FF' },
    AP: { polo: '#1E60A7', peri: '#C0E2FF' },
    BA: { polo: '#234E9D', peri: '#B4C6FF' },
    CE: { polo: '#2A6F9B', peri: '#BFE4F5' },
    ES: { polo: '#1F7A8C', peri: '#B6E0E6' },
    GO: { polo: '#0E91A1', peri: '#BBEAF2' },
    MA: { polo: '#1A8F84', peri: '#B9E6DB' },
    MG: { polo: '#1D7F62', peri: '#B5DFC6' },
    MS: { polo: '#1E7D4F', peri: '#BEE7CB' },
    MT: { polo: '#226B5C', peri: '#B6D6C8' },
    PA: { polo: '#2BAE66', peri: '#CEF5DB' },
    PB: { polo: '#2B9EA9', peri: '#CBE8EF' },
    PE: { polo: '#3D5A80', peri: '#D3D4F6' },
    PI: { polo: '#305A79', peri: '#C7CAE1' },
    PR: { polo: '#2A7FB8', peri: '#C6DAF7' },
    RJ: { polo: '#2D8FD5', peri: '#D1E4FD' },
    RN: { polo: '#3F6FE2', peri: '#E0D6FF' },
    RO: { polo: '#4338CA', peri: '#DFD5FE' },
    RR: { polo: '#2563EB', peri: '#D7E4FE' },
    RS: { polo: '#06B6D4', peri: '#E7FDFE' },
    SC: { polo: '#0D9488', peri: '#B1F9E7' },
    SE: { polo: '#059669', peri: '#BFF6D3' },
    SP: { polo: '#0284C7', peri: '#D2E9FD' },
    TO: { polo: '#6D28D9', peri: '#E5D9FE' },
  };

  // Expressões de cor por UF (memoizado)
  const { poloFillByUF, periFillByUF } = useMemo(() => {
    const p: any[] = ['match', ['get', 'UF']];
    const r: any[] = ['match', ['get', 'UF']];
    Object.keys(UF_COLORS).forEach(uf => {
      p.push(uf, UF_COLORS[uf].polo);
      r.push(uf, UF_COLORS[uf].peri);
    });
    const fallbackColor = '#CCCCCC';
    p.push(fallbackColor);
    r.push(fallbackColor);
    return { poloFillByUF: p, periFillByUF: r };
  }, []);

  useEffect(() => {
    if (mapRef.current || !containerRef.current) return;
    const map = new maplibregl.Map({
      container: containerRef.current,
      style: 'https://basemaps.cartocdn.com/gl/positron-gl-style/style.json',
      center: [-54, -14],
      zoom: 3,
      attributionControl: false,
    });
    mapRef.current = map;

    map.on('load', () => {
      // sources
      map.addSource('polos-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addSource('periferia-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      // NOVO SOURCE
      map.addSource('radius-circle-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });

    // layers - ordem: periferia-fill → polos-fill → polos-line → polo-highlight-line
      // 1. Periferia fill (camada mais baixa)
      map.addLayer({
        id: 'peri-fill',
        type: 'fill',
        source: 'periferia-src',
        paint: {
      'fill-color': periFillByUF as any,
      'fill-opacity': colors.periferia.fillOpacity,
        },
      });
      
      // 2. Periferia line (opcional, pode ser removida)
      map.addLayer({
        id: 'peri-line',
        type: 'line',
        source: 'periferia-src',
        paint: {
      'line-color': colors.periferia.line,
      'line-width': colors.periferia.lineWidth,
        },
      });

      // 3. Polos fill (acima da periferia)
      map.addLayer({
        id: 'polos-fill',
        type: 'fill',
        source: 'polos-src',
        paint: {
      'fill-color': poloFillByUF as any,
      'fill-opacity': colors.polo.fillOpacity,
        },
      });
      
      // 4. Polos line (acima do fill dos polos)
      map.addLayer({
        id: 'polos-line',
        type: 'line',
        source: 'polos-src',
        paint: {
      'line-color': colors.polo.line,
      'line-width': colors.polo.lineWidth,
        },
      });

      // Camada para contorno azul destacando área total do polo
      map.addSource('polo-highlight-src', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
      map.addLayer({
        id: 'polo-highlight-line',
        type: 'line',
        source: 'polo-highlight-src',
        paint: {
          'line-color': '#2563EB', // Azul consistente
          'line-width': 2.5,
          'line-opacity': 0.9
        },
      });

      // Camada fill
      map.addLayer({
        id: 'radius-fill',
        type: 'fill',
        source: 'radius-circle-src',
        paint: { 'fill-color': '#2563EB', 'fill-opacity': 0.15 },
      });
      // Camada line
      map.addLayer({
        id: 'radius-line',
        type: 'line',
        source: 'radius-circle-src',
        paint: { 'line-color': '#2563EB', 'line-width': 2 },
      });

      // Aplicar visibilidade inicial (polos sempre visível)
      try {
        map.setLayoutProperty('polos-fill', 'visibility', showPolos ? 'visible' : 'none');
        map.setLayoutProperty('polos-line', 'visibility', showPolos ? 'visible' : 'none');
        map.setLayoutProperty('peri-fill', 'visibility', showPeriferia ? 'visible' : 'none');
        map.setLayoutProperty('peri-line', 'visibility', showPeriferia ? 'visible' : 'none');
        map.setLayoutProperty('polo-highlight-line', 'visibility', 'visible'); // Contorno sempre visível quando há dados
        // GARANTE VISIBILIDADE DO RAIO (inicial = none)
        map.setLayoutProperty('radius-fill', 'visibility', 'none');
        map.setLayoutProperty('radius-line', 'visibility', 'none');
      } catch (e) {
        // noop
      }

      // HANDLERS PARA RAIO (MOVIDOS PARA CIMA PARA TER PRIORIDADE)
      const startDraw = (e: any) => {
        console.log('startDraw called, radiusModeRef.current:', radiusModeRef.current);
        if (!radiusModeRef.current) return;
        console.log('Starting draw at:', e.lngLat);
        // Evita que outros handlers/movimentos interfiram
        if (typeof e.preventDefault === 'function') e.preventDefault();
        if (e.originalEvent && typeof e.originalEvent.stopPropagation === 'function') e.originalEvent.stopPropagation();
        isDrawingRef.current = true;
        const { lng, lat } = e.lngLat;
        centerRef.current = [lng, lat];
        const m = mapRef.current;
        try {
          m?.dragPan?.disable();
          m?.doubleClickZoom?.disable();
          m?.touchZoomRotate?.disable();
        } catch {}
        // Registrar listeners globais para garantir captura do movimento
        const onMove = (ev: MouseEvent) => {
          if (!radiusModeRef.current || !isDrawingRef.current || !centerRef.current) return;
          if (!mapRef.current) return;
          const point = { x: ev.clientX - (mapRef.current.getCanvas().getBoundingClientRect().left), y: ev.clientY - (mapRef.current.getCanvas().getBoundingClientRect().top) } as any;
          const lngLat = mapRef.current.unproject(point);
          // Reuso da lógica de drawMove
          const radiusKm = turf.distance(turf.point(centerRef.current), turf.point([lngLat.lng, lngLat.lat]), { units: 'kilometers' });
          const circle = turf.circle(centerRef.current, radiusKm, { steps: 128, units: 'kilometers' });
          circleRef.current = circle;
          try {
            (map.getSource('radius-circle-src') as any).setData(circle);
            map.setLayoutProperty('radius-fill', 'visibility', 'visible');
            map.setLayoutProperty('radius-line', 'visibility', 'visible');
          } catch {}
          if (!radiusPopupRef.current) {
            radiusPopupRef.current = new maplibregl.Popup({ closeButton: false, closeOnClick: false, offset: 4 })
              .setLngLat([lngLat.lng, lngLat.lat])
              .addTo(map);
          } else {
            radiusPopupRef.current.setLngLat([lngLat.lng, lngLat.lat]);
          }
          radiusPopupRef.current.setHTML(`<div class='nexus-popup-content' style="color:#000;font-weight:700">Raio: ${radiusKm.toFixed(1)} km</div>`);
        };
        const onUp = () => {
          if (!radiusModeRef.current) return;
          window.removeEventListener('mousemove', onMove);
          window.removeEventListener('mouseup', onUp);
          isDrawingRef.current = false;
          if (radiusPopupRef.current) radiusPopupRef.current.remove();
          radiusPopupRef.current = null;
          try {
            m?.dragPan?.enable();
            m?.doubleClickZoom?.enable();
            m?.touchZoomRotate?.enable();
          } catch {}
          const circleGeom = circleRef.current;
          if (circleGeom) {
            let total = 0;
            const pInside: any[] = [];
            const periInside: any[] = [];
            try {
              // Usar as features mais recentes já filtradas e normalizadas
              const polosCur = polosLatestRef.current?.features || [];
              const periCur = periLatestRef.current?.features || [];
              const polosForIntersect: any[] = Array.isArray(polosCur) && polosCur.every((f: any) => !!f.geometry)
                ? polosCur
                : toGeometryFromPropsGeom(polosCur as any);
              const periForIntersect: any[] = Array.isArray(periCur) && periCur.every((f: any) => !!f.geometry)
                ? periCur
                : toGeometryFromPropsGeom(periCur as any);
              // Polos: somar apenas o valor de origem para evitar dupla contagem dos destinos
              polosForIntersect.forEach((f: any) => {
                if (turf.booleanIntersects(circleGeom, f)) {
                  const valorOrigem = Number(f.properties?.valor_total_origem || 0);
                  total += valorOrigem;
                  pInside.push({
                    codigo_origem: String(f.properties?.codigo_origem || ''),
                    nome: f.properties?.municipio_origem || '',
                    uf: String(f.properties?.UF || f.properties?.UF_origem || ''),
                    valor: valorOrigem,
                    tipo: 'Polo'
                  });
                }
              });
              // Periferias
              periForIntersect.forEach((f: any) => {
                if (turf.booleanIntersects(circleGeom, f)) {
                  const valor = Number(f.properties?.valor_total_destino || 0);
                  total += valor;
                  periInside.push({
                    codigo_origem: String(f.properties?.codigo_origem || ''),
                    codigo_destino: String(f.properties?.codigo_destino || ''),
                    nome: f.properties?.municipio_destino || '',
                    uf: String(f.properties?.UF || ''),
                    valor,
                    tipo: 'Periferia'
                  });
                }
              });
              // Ordenar e publicar
              pInside.sort((a, b) => b.valor - a.valor);
              periInside.sort((a, b) => b.valor - a.valor);
              setPolosInRadius(pInside);
              setPeriferiasInRadius(periInside);
            } catch (error) {
              console.warn('Erro ao calcular interseções do raio:', error);
            }
            const popup = new maplibregl.Popup({ closeButton: true, offset: 6 })
              .setLngLat(centerRef.current as any)
              .setHTML(`<div class='nexus-popup-content'><div class='nexus-popup-title' style="color:#000">Total no Raio</div><div class='nexus-popup-line' style="color:#000;font-weight:700">${formatCurrencyBRL(total)}</div></div>`)
              .addTo(map);
            popupRef.current = popup;
          }
        };
        window.addEventListener('mousemove', onMove);
        window.addEventListener('mouseup', onUp);
        moveHandlerRef.current = onMove;
        upHandlerRef.current = onUp;
      };
      map.on('mousedown', startDraw);
      // map.on('mousemove', drawMove); // Removido para usar listeners globais
      // map.on('mouseup', endDraw); // Removido para usar listeners globais

      // Eventos de clique nos polígonos
      map.on('click', 'polos-fill', (e) => {
        if (e.features && e.features.length > 0) {
          closeActivePopup();
          const feature = e.features[0];
          const content = createPopupContent(feature.properties, true);
          
          const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 8
          })
            .setLngLat(e.lngLat)
            .setHTML(content)
            .addTo(map);
          
          popup.addClassName('nexus-popup');
          popupRef.current = popup;
        }
      });

      map.on('click', 'peri-fill', (e) => {
        if (e.features && e.features.length > 0) {
          closeActivePopup();
          const feature = e.features[0];
          const content = createPopupContent(feature.properties, false);
          
          const popup = new maplibregl.Popup({
            closeButton: false,
            closeOnClick: false,
            offset: 8
          })
            .setLngLat(e.lngLat)
            .setHTML(content)
            .addTo(map);
          
          popup.addClassName('nexus-popup');
          popupRef.current = popup;
        }
      });

      // Clique no mapa (fora dos polígonos) fecha popup
      map.on('click', (e) => {
        const features = map.queryRenderedFeatures(e.point, {
          layers: ['polos-fill', 'peri-fill']
        });
        
        if (features.length === 0) {
          closeActivePopup();
        }
      });

      // Cursor pointer ao passar sobre polígonos
      map.on('mouseenter', 'polos-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'polos-fill', () => {
        map.getCanvas().style.cursor = '';
      });
      map.on('mouseenter', 'peri-fill', () => {
        map.getCanvas().style.cursor = 'pointer';
      });
      map.on('mouseleave', 'peri-fill', () => {
        map.getCanvas().style.cursor = '';
      });
    });

    return () => {
      closeActivePopup();
      if (moveHandlerRef.current) window.removeEventListener('mousemove', moveHandlerRef.current);
      if (upHandlerRef.current) window.removeEventListener('mouseup', upHandlerRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, []);

  // Atualiza visibilidade quando os toggles mudam
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;

    // Detectar se estamos em modo de filtro (UF ou Polo específico)
    const ufUpper = String(appliedUF || '').toUpperCase();
    const inUFMode = appliedPolo === 'ALL' && ufUpper !== 'ALL' && ufUpper !== '';
    const inPoloMode = appliedPolo !== 'ALL';
    const inFilterMode = inUFMode || inPoloMode;

    const setVis = (layerId: string, visible: boolean) => {
      if (!map.getLayer(layerId)) return;
      try {
        map.setLayoutProperty(layerId, 'visibility', visible ? 'visible' : 'none');
      } catch {}
    };
    
    // Aplicar visibilidade conforme estados (polos agora controlável)
    setVis('polos-fill', showPolos);
    setVis('polos-line', showPolos);

    // Periferia: sempre visível quando há filtro aplicado, senão depende do toggle
    const shouldShowPeriferia = inFilterMode || showPeriferia;
    setVis('peri-fill', shouldShowPeriferia);
    setVis('peri-line', shouldShowPeriferia);
    
    // Contorno azul sempre visível quando há dados (independente dos toggles individuais)
    setVis('polo-highlight-line', true);
  }, [showPeriferia, showPolos, appliedUF, appliedPolo]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Se as features já têm geometria, evite reprocessar
    const polosFC: FC = Array.isArray(polos.features) && polos.features.every(f => !!f.geometry)
      ? (polos as FC)
      : { type: 'FeatureCollection', features: toGeometryFromPropsGeom(polos.features) };
    const periFC: FC = Array.isArray(periferias.features) && periferias.features.every(f => !!f.geometry)
      ? (periferias as FC)
      : { type: 'FeatureCollection', features: toGeometryFromPropsGeom(periferias.features) };
    const ufUpper = String(appliedUF || '').toUpperCase();
    const inUFMode = appliedPolo === 'ALL' && ufUpper !== 'ALL' && ufUpper !== '';
    
    // Filtrar polos e periferias em modo UF
    const polosFilteredFC: FC = inUFMode
      ? { type: 'FeatureCollection', features: polosFC.features.filter(f => String(f.properties?.UF || '').toUpperCase() === ufUpper) }
      : polosFC;
    const periFilteredFC: FC = inUFMode
      ? { type: 'FeatureCollection', features: periFC.features.filter(f => String(f.properties?.UF || '').toUpperCase() === ufUpper) }
      : periFC;
  try { (map.getSource('polos-src') as any)?.setData(polosFilteredFC); } catch {}
  try { (map.getSource('periferia-src') as any)?.setData(periFilteredFC); } catch {}
  // Atualizar refs com os dados mais recentes (evita stale closures no handler do raio)
  polosLatestRef.current = polosFilteredFC;
  periLatestRef.current = periFilteredFC;
    
    // Criar contorno azul unificado para polo selecionado ou UF
    let highlightGeometry = null;
    if (appliedPolo !== 'ALL') {
      // Modo polo específico - unificar polo + suas periferias
      const poloFeatures = polosFilteredFC.features.filter(f => f.properties?.codigo_origem === appliedPolo);
      const periferiaFeatures = periFilteredFC.features.filter(f => f.properties?.codigo_origem === appliedPolo);
      const allFeatures = [...poloFeatures, ...periferiaFeatures];
      highlightGeometry = dissolveGeometries(allFeatures);
    } else if (inUFMode) {
      // Modo UF - unificar todos os polos da UF + suas periferias
      const allFeatures = [...polosFilteredFC.features, ...periFilteredFC.features];
      highlightGeometry = dissolveGeometries(allFeatures);
    }
    
    // Atualizar source do contorno azul
    const highlightFC = highlightGeometry 
      ? { type: 'FeatureCollection', features: [{ type: 'Feature', geometry: highlightGeometry, properties: {} }] }
      : { type: 'FeatureCollection', features: [] };
    try { (map.getSource('polo-highlight-src') as any)?.setData(highlightFC); } catch {}
    
    // Atualiza as propriedades de pintura para destacar o polo selecionado (apenas opacidade/espessura)
    if (map.isStyleLoaded()) {
      let poloFillOpacityExpr: any = colors.polo.fillOpacity;
      let poloLineWidthExpr: any = colors.polo.lineWidth;
      let periFillOpacityExpr: any = colors.periferia.fillOpacity;
      let periLineWidthExpr: any = colors.periferia.lineWidth;

      if (appliedPolo !== 'ALL') {
        // Destaca apenas o polo selecionado
        poloFillOpacityExpr = ['case', ['==', ['get', 'codigo_origem'], appliedPolo], colors.poloHighlighted.fillOpacity, colors.polo.fillOpacity];
        poloLineWidthExpr = ['case', ['==', ['get', 'codigo_origem'], appliedPolo], colors.poloHighlighted.lineWidth, colors.polo.lineWidth];
        periFillOpacityExpr = ['case', ['==', ['get', 'codigo_origem'], appliedPolo], colors.periferiaHighlighted.fillOpacity, colors.periferia.fillOpacity];
        periLineWidthExpr = ['case', ['==', ['get', 'codigo_origem'], appliedPolo], colors.periferiaHighlighted.lineWidth, colors.periferia.lineWidth];
      } else if (inUFMode) {
        // Destaca todos os polos da UF e atenua o restante; periferias já filtradas
        const attenuated = 0.15;
        poloFillOpacityExpr = ['case', ['==', ['get', 'UF'], ufUpper], colors.poloHighlighted.fillOpacity, attenuated];
        poloLineWidthExpr = ['case', ['==', ['get', 'UF'], ufUpper], colors.poloHighlighted.lineWidth, 0.2];
        periFillOpacityExpr = colors.periferiaHighlighted.fillOpacity;
        periLineWidthExpr = colors.periferiaHighlighted.lineWidth;
      }

      // Proteger contra erros quando as camadas ainda não existem
      if (map.getLayer('polos-fill')) map.setPaintProperty('polos-fill', 'fill-opacity', poloFillOpacityExpr as any);
      if (map.getLayer('polos-line')) map.setPaintProperty('polos-line', 'line-width', poloLineWidthExpr as any);
      if (map.getLayer('peri-fill')) map.setPaintProperty('peri-fill', 'fill-opacity', periFillOpacityExpr as any);
      if (map.getLayer('peri-line')) map.setPaintProperty('peri-line', 'line-width', periLineWidthExpr as any);
    }

    // Fit bounds: Polo específico => enquadrar polo e suas periferias; UF mode => enquadrar UF; caso contrário, Brasil
    if (appliedPolo !== 'ALL') {
      // Modo polo específico - centralizar no polo selecionado e suas periferias
      const poloSelecionado: FC = { type: 'FeatureCollection', features: polosFilteredFC.features.filter(f => f.properties?.codigo_origem === appliedPolo) };
      const periferiasPolo: FC = { type: 'FeatureCollection', features: periFilteredFC.features.filter(f => f.properties?.codigo_origem === appliedPolo) };
      
      const boundsPoloSelecionado = computeBounds(poloSelecionado);
      const boundsPeriPolo = computeBounds(periferiasPolo);
      
      let finalBounds: LngLatBounds | null = null;
      if (boundsPoloSelecionado && boundsPeriPolo) {
        finalBounds = boundsPoloSelecionado;
        finalBounds.extend(boundsPeriPolo as any);
      } else {
        finalBounds = boundsPoloSelecionado || boundsPeriPolo;
      }
      
      if (finalBounds) {
        map.fitBounds(finalBounds, { padding: 50, duration: 700 });
      }
    } else if (inUFMode) {
      // Modo UF - enquadrar todos os polos da UF
      const boundsPolos = computeBounds(polosFilteredFC);
      const boundsPeri = computeBounds(periFilteredFC);
      let finalBounds: LngLatBounds | null = null;
      if (boundsPolos && boundsPeri) {
        finalBounds = boundsPolos;
        finalBounds.extend(boundsPeri as any);
      } else {
        finalBounds = boundsPolos || boundsPeri;
      }
      if (finalBounds) {
        map.fitBounds(finalBounds, { padding: 24, duration: 700 });
      }
    } else {
      // Modo geral - mostrar Brasil inteiro
      map.fitBounds([[-74, -34], [-34, 5]], { padding: 24, duration: 700 }); // Brasil aprox
    }
  }, [polos, periferias, appliedPolo, appliedUF]);

  // SINCRONIZAR refs COM STATE DE RAIO E CURSOR
  useEffect(() => {
    radiusModeRef.current = radiusMode;
    if (mapRef.current) {
      mapRef.current.getCanvas().style.cursor = radiusMode ? 'crosshair' : '';
    }
  }, [radiusMode]);

  return (
    <div className="w-full h-full relative">
      <div ref={containerRef} className="w-full h-full" />

      {/* Layer toggles overlay */}
  <div className="absolute bottom-3 left-3 z-50">
        <div className="bg-[#0b1220]/80 text-white rounded-md shadow-md p-2 text-sm">
          <div className="flex flex-col gap-2">
            <button
              onClick={() => {
                setRadiusMode(!radiusMode);
                if (!radiusMode) {
                  // entrando no modo, limpar circulo anterior
                  setCircleGeoJSON(null);
                  circleRef.current = null;
                  setPolosInRadius([]);
                  setPeriferiasInRadius([]);
                  const map = mapRef.current;
                  if (map) {
                    (map.getSource('radius-circle-src') as any)?.setData({ type: 'FeatureCollection', features: [] });
                    map.setLayoutProperty('radius-fill', 'visibility', 'none');
                    map.setLayoutProperty('radius-line', 'visibility', 'none');
                  }
                }
              }}
              className={`w-full bg-sky-600 hover:bg-sky-700 rounded-md px-2 py-1 mb-1 ${radiusMode ? 'bg-emerald-600' : ''}`}
            >{radiusMode ? 'Sair do Raio' : 'Raio'}</button>
            <button
              onClick={() => {
                setCircleGeoJSON(null);
                circleRef.current = null;
                setPolosInRadius([]);
                setPeriferiasInRadius([]);
                const map = mapRef.current;
                if (map) {
                  (map.getSource('radius-circle-src') as any)?.setData({ type: 'FeatureCollection', features: [] });
                  map.setLayoutProperty('radius-fill', 'visibility', 'none');
                  map.setLayoutProperty('radius-line', 'visibility', 'none');
                }
                if (popupRef.current) { popupRef.current.remove(); popupRef.current=null; }
              }}
              className="w-full bg-red-600 hover:bg-red-700 rounded-md px-2 py-1"
            >Limpar</button>
            <label className="flex items-center gap-2">
              <input 
                type="checkbox" 
                checked={showPolos} 
                onChange={(e) => setShowPolos(e.target.checked)} 
                className="w-4 h-4" 
              />
              <span>Polos</span>
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={showPeriferia}
                onChange={(e) => setShowPeriferia(e.target.checked)}
                className="w-4 h-4"
              />
              <span>Periferia</span>
            </label>
          </div>
        </div>
      </div>
      {(polosInRadius.length > 0 || periferiasInRadius.length > 0) && (
        <div className="absolute top-3 right-3 z-50">
          <div className="bg-[#0b1220]/80 text-white rounded-md shadow-md p-3 text-sm w-80 max-h-[70vh] overflow-y-auto">
            <div className="flex items-start justify-between mb-2">
              <div>
                <div className="text-base font-semibold">Dentro do Raio</div>
                <div className="text-[11px] text-slate-300">{polosInRadius.length + periferiasInRadius.length} municípios</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    // Exportar XLSX: tipo,Código IBGE,municipio,UF,valor
                    const rows = [...polosInRadius, ...periferiasInRadius]
                      .sort((a, b) => String(a.nome).localeCompare(String(b.nome), 'pt-BR'))
                      .map(r => ({
                        tipo: r.tipo,
                        'Código IBGE': (r.tipo === 'Polo' ? (r.codigo_origem || '') : (r.codigo_destino || r.codigo_origem || '')),
                        municipio: r.nome || '',
                        UF: r.uf || '',
                        valor: r.valor || 0,
                      }));
                    const wb = XLSX.utils.book_new();
                    const ws = XLSX.utils.json_to_sheet(rows);
                    XLSX.utils.book_append_sheet(wb, ws, 'Dentro_do_Raio');
                    const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
                    const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
                    saveAs(blob, 'municipios_no_raio.xlsx');
                  }}
                  title="Exportar XLSX"
                  aria-label="Exportar XLSX"
                  className="p-1 rounded hover:bg-slate-700/50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1M8 12l4 4m0 0l4-4m-4 4V4" />
                  </svg>
                </button>
                <button
                  onClick={() => { setPolosInRadius([]); setPeriferiasInRadius([]); }}
                  className="text-slate-300 hover:text-white"
                  aria-label="Fechar lista"
                >✕</button>
              </div>
            </div>
            {polosInRadius.length > 0 && (
              <div className="mb-3">
                <div className="text-xs text-slate-300 mb-1">Polos ({polosInRadius.length})</div>
                <div className="space-y-1">
                  {polosInRadius.map((m, idx) => (
                    <div key={`p-${idx}`} className="flex items-center justify-between bg-slate-800/50 border border-slate-700/40 rounded px-2 py-1">
                      <span className="text-slate-200 truncate max-w-[140px]" title={`${m.nome} - ${m.uf}`}>{m.nome}</span>
                      <span className="text-slate-300 tabular-nums">{formatCurrencyBRL(m.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {periferiasInRadius.length > 0 && (
              <div>
                <div className="text-xs text-slate-300 mb-1">Periferias ({periferiasInRadius.length})</div>
                <div className="space-y-1">
                  {periferiasInRadius.map((m, idx) => (
                    <div key={`peri-${idx}`} className="flex items-center justify-between bg-slate-800/50 border border-slate-700/40 rounded px-2 py-1">
                      <span className="text-slate-200 truncate max-w-[140px]" title={`${m.nome} - ${m.uf}`}>{m.nome}</span>
                      <span className="text-slate-300 tabular-nums">{formatCurrencyBRL(m.valor)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
