"use client";

import React, { useRef, useEffect, useState } from 'react';
import maplibregl, { Map as MapLibreMap } from 'maplibre-gl';
import { registerMapInstance } from '@/utils/mapRegistry';
import 'maplibre-gl/dist/maplibre-gl.css';

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

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div 
        ref={mapContainer} 
        className="absolute inset-0 w-full h-full"
        style={{ minHeight: '400px' }}
      />
      
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