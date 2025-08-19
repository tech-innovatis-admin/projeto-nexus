"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import maplibregl, { Map } from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type LngLat = [number, number];

function computeBbox(coordinates: LngLat[] | LngLat[][] | LngLat[][][]) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  const visit = (coords: any) => {
    if (typeof coords[0] === "number") {
      const [x, y] = coords as LngLat;
      if (x < minX) minX = x;
      if (y < minY) minY = y;
      if (x > maxX) maxX = x;
      if (y > maxY) maxY = y;
    } else {
      (coords as any[]).forEach(visit);
    }
  };

  visit(coordinates as any);
  return [minX, minY, maxX, maxY] as [number, number, number, number];
}

interface MapFiltersProps {
  uf?: string; // ex.: 'PB' ou 'ALL'
  polo?: string; // ex.: 'Polo 1' ou 'ALL'
  minValue?: number;
  maxValue?: number;
}

export default function MapLibreMock({ uf = 'ALL', polo = 'ALL', minValue, maxValue }: MapFiltersProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<Map | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [showLegend, setShowLegend] = useState(true);

  // Dados fictícios (mock) – NÃO representam locais reais
  const aerodromes = useMemo(() => {
    const points: LngLat[] = [
      [-34.8805, -7.1153], // Próximo a João Pessoa (mock)
      [-35.3230, -7.2300], // (mock)
      [-36.0000, -7.0000], // (mock)
      [-37.0500, -7.1500], // (mock)
      [-34.9500, -6.9500]  // (mock)
    ];

    // UFs mock (maioria PB por foco na PB)
    const ufMock = 'PB';
    return {
      type: "FeatureCollection",
      features: points.map((p, idx) => ({
        type: "Feature",
        geometry: { type: "Point", coordinates: p },
        properties: { 
          name: `Aeródromo ${idx + 1}`,
          uf: ufMock,
          value: Math.floor(50000 + Math.random() * 1500000) // R$ mock
        }
      }))
    } as GeoJSON.FeatureCollection;
  }, []);

  const polos = useMemo(() => {
    // 5 polígonos simples (quadrados/retângulos) como mock dentro da PB
    const polyCenters: LngLat[] = [
      [-35.1, -7.15],
      [-36.2, -7.25],
      [-35.7, -6.95],
      [-36.6, -7.05],
      [-35.3, -7.35]
    ];

    const makeSquare = ([lng, lat]: LngLat, sizeDeg = 0.15): LngLat[] => [
      [lng - sizeDeg, lat - sizeDeg],
      [lng + sizeDeg, lat - sizeDeg],
      [lng + sizeDeg, lat + sizeDeg],
      [lng - sizeDeg, lat + sizeDeg],
      [lng - sizeDeg, lat - sizeDeg]
    ];

    const ufMock = 'PB';
    return {
      type: "FeatureCollection",
      features: polyCenters.map((c, idx) => ({
        type: "Feature",
        geometry: { type: "Polygon", coordinates: [makeSquare(c)] },
        properties: { 
          name: `Polo ${idx + 1}`,
          uf: ufMock,
          value: Math.floor(100000 + Math.random() * 2000000) // R$ mock
        }
      }))
    } as GeoJSON.FeatureCollection;
  }, []);

  // Bounding box dos polígonos de polos (para gerar pontos aleatórios dentro desta área)
  const polosBbox = useMemo(() => {
    const coords = (polos.features as any[]).map((f: any) => (f.geometry as any).coordinates);
    return computeBbox(coords as any);
  }, [polos]);







  // Estilo customizado dark para o mapa
  const mapStyle = useMemo(() => ({
    version: 8 as const,
    sources: {
      'osm': {
        type: 'raster' as const,
        tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
        tileSize: 256,
        attribution: '© OpenStreetMap contributors'
      }
    },
    layers: [
      {
        id: 'osm',
        type: 'raster' as const,
        source: 'osm'
      }
    ],
    glyphs: "https://demotiles.maplibre.org/font/{fontstack}/{range}.pbf"
  }), []);

  useEffect(() => {
    if (!containerRef.current) return;

    const map = new maplibregl.Map({
      container: containerRef.current,
      style: mapStyle,
      center: [-36.0, -7.1],
      zoom: 7,
      pitch: 0,
      bearing: 0
    });

    // Adicionar controles de navegação
    map.addControl(new maplibregl.NavigationControl(), 'top-right');
    map.addControl(new maplibregl.ScaleControl({ maxWidth: 100, unit: 'metric' }), 'bottom-left');

    mapRef.current = map;

    map.on("load", () => {
      setIsLoading(false);
      
      // Ajuste de aparência do raster para ficar mais claro e legível
      map.setPaintProperty('osm', 'raster-saturation', -0.2);
      map.setPaintProperty('osm', 'raster-brightness-min', 0.35);
      map.setPaintProperty('osm', 'raster-brightness-max', 0.95);
      map.setPaintProperty('osm', 'raster-contrast', 0.05);
      
      // Fontes
      if (!map.getSource("aerodromes")) {
        map.addSource("aerodromes", {
          type: "geojson",
          data: aerodromes
        });
      }

      if (!map.getSource("polos")) {
        map.addSource("polos", {
          type: "geojson",
          data: polos
        });
      }





      // Removido: não renderizar polígonos (fill/outline) dos polos; será exibido apenas o ícone da bandeira

      // Aeródromos (pontos) – cores complementares do site
      if (!map.getLayer("aerodromes-glow")) {
        map.addLayer({
          id: "aerodromes-glow",
          type: "circle",
          source: "aerodromes",
          paint: {
            "circle-radius": 12,
            "circle-color": "#fbbf24", // amber-400
            "circle-opacity": 0.3,
            "circle-blur": 1
          }
        });
      }

      if (!map.getLayer("aerodromes-points")) {
        map.addLayer({
          id: "aerodromes-points",
          type: "circle",
          source: "aerodromes",
          paint: {
            "circle-radius": 8,
            "circle-color": "#f59e0b", // amber-500
            "circle-stroke-color": "#ffffff",
            "circle-stroke-width": 2,
            "circle-stroke-opacity": 0.8
          }
        });
      }

      // Interações melhoradas com popups customizados
      map.on("click", "aerodromes-points", (e) => {
        const feature = e.features?.[0];
        if (!feature) return;
        const coords = (feature.geometry as any).coordinates as LngLat;
        const name = feature.properties?.["name"] ?? "Aeródromo";
        new maplibregl.Popup({ 
          closeButton: true,
          className: 'custom-popup'
        })
          .setLngLat(coords)
          .setHTML(`
            <div class="bg-slate-800 text-white p-3 rounded-lg border border-amber-400">
              <div class="flex items-center gap-2 mb-2">
                <div class="w-3 h-3 rounded-full bg-amber-500"></div>
                <strong class="text-amber-400">${name}</strong>
              </div>
              <p class="text-xs text-slate-300">Coordenadas: ${coords[1].toFixed(4)}, ${coords[0].toFixed(4)}</p>
              <p class="text-xs text-slate-400 mt-1">Dados fictícios para demonstração</p>
            </div>
          `)
          .addTo(map);
      });



      // Efeitos hover
      map.on("mouseenter", "aerodromes-points", () => {
        map.getCanvas().style.cursor = "pointer";
      });
      
      map.on("mouseleave", "aerodromes-points", () => {
        map.getCanvas().style.cursor = "";
      });



      // Ajusta o mapa para enquadrar todos os dados
      const bboxA = computeBbox(
        aerodromes.features.map((f: any) => f.geometry.coordinates) as LngLat[]
      );
      const bboxP = computeBbox(
        polos.features.map((f: any) => f.geometry.coordinates) as LngLat[][][]
      );
      const minX = Math.min(bboxA[0], bboxP[0]);
      const minY = Math.min(bboxA[1], bboxP[1]);
      const maxX = Math.max(bboxA[2], bboxP[2]);
      const maxY = Math.max(bboxA[3], bboxP[3]);

      map.fitBounds([
        [minX, minY],
        [maxX, maxY]
      ], { padding: 40, duration: 600 });
    });

    return () => {
      map.remove();
      mapRef.current = null;
    };
  }, [aerodromes, polos, mapStyle]);

  // Aplica filtros nas camadas quando props mudarem
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    const buildValueConds = (layerSupportsValue: boolean) => {
      const conds: any[] = ['all'];
      if (uf && uf !== 'ALL') conds.push(['==', ['get', 'uf'], uf]);
      if (layerSupportsValue) {
        if (typeof minValue === 'number') conds.push(['>=', ['get', 'value'], minValue]);
        if (typeof maxValue === 'number') conds.push(['<=', ['get', 'value'], maxValue]);
      }
      return conds.length > 1 ? conds : null;
    };

    // Polos: suporta filtro por polo (nome)
    const polosConds: any[] = ['all'];
    if (uf && uf !== 'ALL') polosConds.push(['==', ['get', 'uf'], uf]);
    if (polo && polo !== 'ALL') polosConds.push(['==', ['get', 'name'], polo]);
    if (typeof minValue === 'number') polosConds.push(['>=', ['get', 'value'], minValue]);
    if (typeof maxValue === 'number') polosConds.push(['<=', ['get', 'value'], maxValue]);
    const polosFilter = polosConds.length > 1 ? polosConds : null;

    // Polígonos desativados

    const aeroFilter = buildValueConds(true);
    if (map.getLayer('aerodromes-glow')) map.setFilter('aerodromes-glow', aeroFilter as any);
    if (map.getLayer('aerodromes-points')) map.setFilter('aerodromes-points', aeroFilter as any);


  }, [uf, polo, minValue, maxValue]);

  return (
    <div className="relative w-full h-[350px] rounded-xl overflow-hidden border border-slate-700/50 bg-[#0f172a] shadow-2xl">
      {/* Loading overlay */}
      {isLoading && (
        <div className="absolute inset-0 bg-[#0f172a] flex items-center justify-center z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-sky-400 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-slate-400 text-sm">Carregando mapa...</p>
          </div>
        </div>
      )}

      {/* Mapa */}
      <div ref={containerRef} className="w-full h-full" />

      {/* Legenda */}
      {showLegend && !isLoading && (
        <div className="absolute top-4 left-4 bg-[#1e293b]/95 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50 shadow-lg">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white text-sm font-semibold">Legenda</h3>
            <button
              onClick={() => setShowLegend(false)}
              className="text-slate-400 hover:text-white transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-full bg-amber-500 border-2 border-white"></div>
              <span className="text-slate-300 text-xs">Aeródromos (5)</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="w-4 h-4 rounded-sm bg-sky-500 border border-sky-400"></div>
              <span className="text-slate-300 text-xs">Polos Estratégicos (5)</span>
            </div>
          </div>
          <div className="mt-3 pt-3 border-t border-slate-600">
            <p className="text-slate-500 text-xs">Dados fictícios para demonstração</p>
          </div>
        </div>
      )}

      {/* Botão para mostrar legenda quando oculta */}
      {!showLegend && !isLoading && (
        <button
          onClick={() => setShowLegend(true)}
          className="absolute top-4 left-4 bg-[#1e293b]/95 backdrop-blur-sm rounded-lg p-2 border border-slate-700/50 hover:bg-[#233044] transition-colors"
          title="Mostrar legenda"
        >
          <svg className="w-5 h-5 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </button>
      )}

      {/* Contador de elementos */}
      {!isLoading && (
        <div className="absolute bottom-4 right-4 bg-[#1e293b]/95 backdrop-blur-sm rounded-lg px-3 py-2 border border-slate-700/50">
          <div className="flex items-center gap-4 text-xs">
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-amber-500"></div>
              <span className="text-slate-300">5 Aeródromos</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-sm bg-sky-500"></div>
              <span className="text-slate-300">5 Polos</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}


