"use client";

import React, { useRef, useEffect, useState } from 'react';
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
import { registerMapInstance } from '@/utils/mapRegistry';
import 'maplibre-gl/dist/maplibre-gl.css';
import { useMapData } from '@/contexts/MapDataContext';

interface RotaMapaProps {
  polos: any;
  periferias: any;
  appliedUF: string;
  appliedPolo: string;
  appliedUFs: string[];
  appliedMinValor: number;
  appliedMaxValor: number;
  appliedProducts: string[];
  onRadiusResult: (result: any) => void;
  onExportXLSX: () => void;
  onMunicipioPerifericoClick: (municipio: any) => void;
  municipioPerifericoSelecionado: string;
  className?: string;
}

export default function RotaMapa({
  polos,
  periferias,
  appliedUF,
  appliedPolo,
  appliedUFs,
  appliedMinValor,
  appliedMaxValor,
  appliedProducts,
  onRadiusResult,
  onExportXLSX,
  onMunicipioPerifericoClick,
  municipioPerifericoSelecionado,
  className = ''
}: RotaMapaProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<MapLibreMap | null>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showPistas, setShowPistas] = useState(true); // Pistas visíveis por padrão
  const { mapData } = useMapData();

  // Inicializar o mapa
  useEffect(() => {
    if (mapContainer.current && !map.current) {
      map.current = new maplibregl.Map({
        container: mapContainer.current,
        // Estilo OSM com tiles raster diretos do OpenStreetMap
        style: {
          version: 8,
          glyphs: 'https://fonts.openmaptiles.org/{fontstack}/{range}.pbf',
          sources: {
            'osm-tiles': {
              type: 'raster',
              tiles: [
                'https://a.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://b.tile.openstreetmap.org/{z}/{x}/{y}.png',
                'https://c.tile.openstreetmap.org/{z}/{x}/{y}.png'
              ],
              tileSize: 256,
              attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
            }
          },
          layers: [
            {
              id: 'osm-tiles',
              type: 'raster',
              source: 'osm-tiles',
              minzoom: 0,
              maxzoom: 19
            }
          ]
        },
        center: [-47.8825, -15.7942], // Brasília - Centro do Brasil
        zoom: 4,
        maxZoom: 19,
        minZoom: 2
      });

      map.current.on('load', () => {
        setMapLoaded(true);
        console.log('🗺️ [RotaMapa] Mapa carregado com estilo OSM');
        // Registrar instância global para que RotaMapVisualization consiga acessar
        try {
          registerMapInstance(map.current as MapLibreMap);
          console.log('🗺️ [RotaMapa] Instância registrada no mapRegistry');
        } catch (err) {
          console.warn('🗺️ [RotaMapa] Falha ao registrar mapa no mapRegistry', err);
        }
      });

      // Controles de navegação
      map.current.addControl(new maplibregl.NavigationControl(), 'top-left');
      map.current.addControl(new maplibregl.FullscreenControl(), 'top-left');
    }

    return () => {
      if (map.current) {
        try {
          registerMapInstance(null);
        } catch {}
        map.current.remove();
        map.current = null;
        setMapLoaded(false);
      }
    };
  }, []);

  // Componente focado apenas em rotas - polígonos removidos
  // Os dados dos polos e periferias são mantidos apenas para compatibilidade de interface

  // Mapa focado em rotas - sem auto-fit aos polígonos
  // O componente RotaMapVisualization cuidará do posicionamento quando houver rotas ativas

  // Adicionar camadas de Pistas de Voo (SVG lucide plane) a partir de mapData.pistas
  useEffect(() => {
    if (!mapLoaded || !map.current) return;

    const pistas = Array.isArray(mapData?.pistas) ? mapData!.pistas : [];

    // Converter para GeoJSON
    const features: GeoJSON.Feature[] = [];
    for (const pista of pistas as any[]) {
      const lat = parseFloat(String(pista.latitude_pista ?? '').trim());
      const lng = parseFloat(String(pista.longitude_pista ?? '').trim());
      if (isNaN(lat) || isNaN(lng) || lat === 0 || lng === 0) continue;

      features.push({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [lng, lat] },
        properties: {
          codigo_pista: String(pista.codigo_pista ?? '').trim(),
          nome_pista: String(pista.nome_pista ?? '').trim(),
          tipo_pista: String(pista.tipo_pista ?? '').trim()
        }
      } as any);
    }

    const sourceId = 'pistas-voo-source';
    const layerId = 'pistas-voo-layer';
    const imageId = 'lucide-plane-icon';

    const addOrUpdateSource = () => {
      const data: GeoJSON.FeatureCollection = {
        type: 'FeatureCollection',
        features
      };
      const src = map.current!.getSource(sourceId) as maplibregl.GeoJSONSource | undefined;
      if (src) {
        src.setData(data as any);
      } else {
        map.current!.addSource(sourceId, {
          type: 'geojson',
          data
        } as any);
      }
    };

    const ensurePlaneImage = () => {
      if (map.current!.hasImage(imageId)) return;
      const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="darkblue" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" opacity="0.7">
  <path d="M2 22h20" />
  <path d="M9.5 12.5 3 10l1-2 8 2 5-5 3 1-5 5 2 8-2 1-2.5-6.5-3.5 3.5v3l-2 1v-4l3.5-3.5Z" />
</svg>`;
      const url = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      const img = new Image();
      img.onload = () => {
        try {
          if (!map.current) return;
          if (!map.current.hasImage(imageId)) {
            map.current.addImage(imageId, img as any, { pixelRatio: 2 });
          }
        } catch {}
      };
      img.src = url;
    };

    const addOrUpdateLayer = () => {
      if (map.current!.getLayer(layerId)) return;
      map.current!.addLayer({
        id: layerId,
        type: 'symbol',
        source: sourceId,
        layout: {
          'icon-image': imageId,
          'icon-size': 0.9,
          'icon-anchor': 'bottom',
          'icon-allow-overlap': true,
          'icon-ignore-placement': true
        }
      } as any);

      // Interações: cursor e popup
      map.current!.on('mouseenter', layerId, () => {
        map.current!.getCanvas().style.cursor = 'pointer';
      });
      map.current!.on('mouseleave', layerId, () => {
        map.current!.getCanvas().style.cursor = '';
      });
      map.current!.on('click', layerId, (e: any) => {
        if (!e.features || !e.features[0]) return;
        const f = e.features[0];
        const props = f.properties || {};
        const lngLat = e.lngLat;
        new maplibregl.Popup({ offset: 6 })
          .setLngLat(lngLat)
          .setHTML(`
            <div class="text-sm" style="color: black; min-width: 200px;">
              <div><strong>Código:</strong> ${props.codigo_pista || ''}</div>
              <div><strong>Nome:</strong> ${props.nome_pista || ''}</div>
              <div><strong>Tipo:</strong> ${props.tipo_pista || ''}</div>
            </div>
          `)
          .addTo(map.current!);
      });
    };

    // Aplicar
    ensurePlaneImage();
    addOrUpdateSource();
    addOrUpdateLayer();

    // Cleanup deste efeito (remover layer/source ao atualizar ou desmontar)
    return () => {
      if (!map.current) return;
      try {
        if (map.current.getLayer(layerId)) {
          map.current.removeLayer(layerId);
        }
      } catch {}
      try {
        if (map.current.getSource(sourceId)) {
          map.current.removeSource(sourceId);
        }
      } catch {}
      try {
        if (map.current.hasImage(imageId)) {
          map.current.removeImage(imageId);
        }
      } catch {}
    };
  }, [mapLoaded, mapData?.pistas]);

  // Controlar visibilidade da camada de pistas
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    
    try {
      if (map.current.getLayer('pistas-voo-layer')) {
        map.current.setLayoutProperty('pistas-voo-layer', 'visibility', showPistas ? 'visible' : 'none');
      }
    } catch (err) {
      console.warn('Erro ao controlar visibilidade de pistas:', err);
    }
  }, [showPistas, mapLoaded]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div 
        ref={mapContainer} 
        className="absolute inset-0 w-full h-full"
        style={{ minHeight: '400px' }}
      />
      
      {/* Painel de controles para pistas */}
      {mapLoaded && (
        <div className="absolute bottom-3 left-3 z-50">
          <div className="bg-[#0b1220]/80 text-white rounded-md shadow-md p-2 text-sm">
            <label className="flex items-center gap-2 cursor-pointer">
              <input 
                type="checkbox" 
                checked={showPistas} 
                onChange={(e) => setShowPistas(e.target.checked)} 
                className="w-4 h-4" 
              />
              <span>Pistas de Aeródromo</span>
            </label>
          </div>
        </div>
      )}
      
      {!mapLoaded && (
        <div className="absolute inset-0 flex items-center justify-center bg-gray-100">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
            <p className="text-gray-600">Carregando mapa...</p>
          </div>
        </div>
      )}
    </div>
  );
}