"use client";

import { useEffect, useMemo, useRef } from 'react';
import maplibregl, { LngLatBoundsLike, Map as MapLibreMap, LngLatBounds } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';

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
  
  // Cores para polígonos normais e destacados (selecionados)
  const colors = {
    polo: {
      fillOpacity: 0.45,
      line: '#082A66',
      lineWidth: 0.6,
    },
    poloHighlighted: {
      fillOpacity: 0.8,
      line: '#082A66',
      lineWidth: 1.6,
    },
    periferia: {
      fillOpacity: 0.35,
      line: '#2B6CB0',
      lineWidth: 0.6,
    },
    periferiaHighlighted: {
      fillOpacity: 0.55,
      line: '#2B6CB0',
      lineWidth: 1.2,
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

  // Paleta oficial por UF (polo = escuro, periferia = claro)
  const UF_COLORS: Record<string, { polo: string; peri: string }> = {
    AC: { polo: '#0A3D91', peri: '#8BB6FF' },
    AL: { polo: '#2F5AA6', peri: '#A9C4FF' },
    AM: { polo: '#3B47A5', peri: '#B8C0FF' },
    AP: { polo: '#1E60A7', peri: '#A8D1FF' },
    BA: { polo: '#234E9D', peri: '#9CB5FF' },
    CE: { polo: '#2A6F9B', peri: '#A7D3F2' },
    ES: { polo: '#1F7A8C', peri: '#9ED9E3' },
    GO: { polo: '#0E91A1', peri: '#A3E7EF' },
    MA: { polo: '#1A8F84', peri: '#A1E3D8' },
    MG: { polo: '#1D7F62', peri: '#9DDCC3' },
    MS: { polo: '#1E7D4F', peri: '#A6E4C8' },
    MT: { polo: '#226B5C', peri: '#9ED3C5' },
    PA: { polo: '#2BAE66', peri: '#B6F2D8' },
    PB: { polo: '#2B9EA9', peri: '#B3E5EC' },
    PE: { polo: '#3D5A80', peri: '#BBD1F3' },
    PI: { polo: '#305A79', peri: '#AFC7DE' },
    PR: { polo: '#2A7FB8', peri: '#AED7F4' },
    RJ: { polo: '#2D8FD5', peri: '#B9E1FA' },
    RN: { polo: '#3F6FE2', peri: '#C8D3FF' },
    RO: { polo: '#4338CA', peri: '#C7D2FE' },
    RR: { polo: '#2563EB', peri: '#BFDBFE' },
    RS: { polo: '#06B6D4', peri: '#CFFAFE' },
    SC: { polo: '#0D9488', peri: '#99F6E4' },
    SE: { polo: '#059669', peri: '#A7F3D0' },
    SP: { polo: '#0284C7', peri: '#BAE6FD' },
    TO: { polo: '#6D28D9', peri: '#DDD6FE' },
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

    // layers
      map.addLayer({
        id: 'polos-fill',
        type: 'fill',
        source: 'polos-src',
        paint: {
      'fill-color': poloFillByUF as any,
      'fill-opacity': colors.polo.fillOpacity,
        },
      });
      map.addLayer({
        id: 'polos-line',
        type: 'line',
        source: 'polos-src',
        paint: {
      'line-color': colors.polo.line,
      'line-width': colors.polo.lineWidth,
        },
      });

      map.addLayer({
        id: 'peri-fill',
        type: 'fill',
        source: 'periferia-src',
        paint: {
      'fill-color': periFillByUF as any,
      'fill-opacity': colors.periferia.fillOpacity,
        },
      });
      map.addLayer({
        id: 'peri-line',
        type: 'line',
        source: 'periferia-src',
        paint: {
      'line-color': colors.periferia.line,
      'line-width': colors.periferia.lineWidth,
        },
      });

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
      map.remove();
      mapRef.current = null;
    };
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    // Determinar modo de operação
    const isPoloMode = appliedPolo !== 'ALL';
    const isUFMode = !isPoloMode && appliedUF !== 'ALL';
    const isAllMode = !isPoloMode && !isUFMode;

    // Se as features já têm geometria, evite reprocessar
    const polosFC: FC = Array.isArray(polos.features) && polos.features.every(f => !!f.geometry)
      ? (polos as FC)
      : { type: 'FeatureCollection', features: toGeometryFromPropsGeom(polos.features) };
    const periFC: FC = Array.isArray(periferias.features) && periferias.features.every(f => !!f.geometry)
      ? (periferias as FC)
      : { type: 'FeatureCollection', features: toGeometryFromPropsGeom(periferias.features) };
    
    // Filtrar dados conforme o modo
    let filteredPolosFC: FC;
    let filteredPeriFC: FC;

    if (isUFMode) {
      // Modo UF: mostrar apenas polos da UF e periferias associadas
      const polosUF = polosFC.features.filter(f => f.properties?.UF === appliedUF);
      const codigosPolosUF = new Set(polosUF.map(f => f.properties?.codigo_origem).filter(Boolean));
      const periferiasUF = periFC.features.filter(f => codigosPolosUF.has(f.properties?.codigo_origem));
      
      filteredPolosFC = { type: 'FeatureCollection', features: polosUF };
      filteredPeriFC = { type: 'FeatureCollection', features: periferiasUF };
    } else {
      // Modo Polo ou All: mostrar todos
      filteredPolosFC = polosFC;
      filteredPeriFC = periFC;
    }
    
    // Atualizar sources
    (map.getSource('polos-src') as any)?.setData(filteredPolosFC);
    (map.getSource('periferia-src') as any)?.setData(filteredPeriFC);
    
    // Atualiza as propriedades de pintura para destacar conforme o modo
    if (map.isStyleLoaded()) {
      let poloFillOpacityExpr: any;
      let poloLineWidthExpr: any;
      let periFillOpacityExpr: any;
      let periLineWidthExpr: any;

      if (isPoloMode) {
        // Modo Polo: destacar polo específico
        poloFillOpacityExpr = ['case', ['==', ['get', 'codigo_origem'], appliedPolo], colors.poloHighlighted.fillOpacity, colors.polo.fillOpacity];
        poloLineWidthExpr = ['case', ['==', ['get', 'codigo_origem'], appliedPolo], colors.poloHighlighted.lineWidth, colors.polo.lineWidth];
        periFillOpacityExpr = ['case', ['==', ['get', 'codigo_origem'], appliedPolo], colors.periferiaHighlighted.fillOpacity, colors.periferia.fillOpacity];
        periLineWidthExpr = ['case', ['==', ['get', 'codigo_origem'], appliedPolo], colors.periferiaHighlighted.lineWidth, colors.periferia.lineWidth];
      } else if (isUFMode) {
        // Modo UF: destacar todos os polos/periferias da UF (já filtrados)
        poloFillOpacityExpr = colors.poloHighlighted.fillOpacity;
        poloLineWidthExpr = colors.poloHighlighted.lineWidth;
        periFillOpacityExpr = colors.periferiaHighlighted.fillOpacity;
        periLineWidthExpr = colors.periferiaHighlighted.lineWidth;
      } else {
        // Modo All: opacidade normal
        poloFillOpacityExpr = colors.polo.fillOpacity;
        poloLineWidthExpr = colors.polo.lineWidth;
        periFillOpacityExpr = colors.periferia.fillOpacity;
        periLineWidthExpr = colors.periferia.lineWidth;
      }

      map.setPaintProperty('polos-fill', 'fill-opacity', poloFillOpacityExpr);
      map.setPaintProperty('polos-line', 'line-width', poloLineWidthExpr);
      map.setPaintProperty('peri-fill', 'fill-opacity', periFillOpacityExpr);
      map.setPaintProperty('peri-line', 'line-width', periLineWidthExpr);
    }

    // Fit bounds conforme o modo
    if (isUFMode) {
      // Modo UF: fit para as feições da UF
      const combinedFC: FC = {
        type: 'FeatureCollection',
        features: [...filteredPolosFC.features, ...filteredPeriFC.features]
      };
      const bounds = computeBounds(combinedFC);
      if (bounds) {
        map.fitBounds([bounds.getSouthWest().toArray(), bounds.getNorthEast().toArray()], { 
          padding: 24, 
          duration: 700 
        });
      }
    } else if (isAllMode) {
      // Modo All: fit para o Brasil
      map.fitBounds([[-74, -34], [-34, 5]], { padding: 24, duration: 700 });
    }
    // Modo Polo: não faz auto-fit (comportamento atual mantido)
  }, [polos, periferias, appliedPolo, appliedUF]);

  return <div ref={containerRef} className="w-full h-full" />;
}
