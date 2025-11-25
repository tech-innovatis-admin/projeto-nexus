import React, { useEffect, useMemo } from 'react';
import maplibregl from 'maplibre-gl';
import type { RotaCompleta } from '@/types/routing';
import { waitForMapReady, addMapInstanceListener } from '@/utils/mapRegistry';

interface RotaMapVisualizationProps {
  rota: RotaCompleta | null;
  showLabels?: boolean;
  showDirections?: boolean;
}

export default function RotaMapVisualization({ 
  rota, 
  showLabels = true, 
  showDirections = false 
}: RotaMapVisualizationProps) {

  // Cores para diferentes tipos de trecho
  const cores = useMemo(() => ({
    voo: '#3B82F6', // azul
    terrestre: '#10B981', // verde
    polo: '#EF4444', // vermelho
    periferia: '#F59E0B', // amarelo
    sem_tag: '#8B5CF6' // roxo para municípios sem tag
  }), []);

  // Identificadores das camadas e fontes
  const LAYER_IDS = useMemo(() => ({
    trechosVoo: 'rotas-trechos-voo',
    trechosTerrestres: 'rotas-trechos-terrestres',
    iconesVoo: 'rotas-icones-voo',
    iconesTerrestres: 'rotas-icones-terrestres',
    polos: 'rotas-polos',
    periferias: 'rotas-periferias',
    semTag: 'rotas-sem-tag',
    labels: 'rotas-labels'
  }), []);

  const SOURCE_IDS = useMemo(() => ({
    trechos: 'rotas-trechos-source',
    pontos: 'rotas-pontos-source',
    iconesTrechos: 'rotas-icones-trechos-source'
  }), []);

  useEffect(() => {
    const handleMapReady = async () => {
      try {
        console.log('🗺️ [RotaMapVisualization] Aguardando mapa estar pronto...');
        const map = await waitForMapReady(10000); // 10 segundos de timeout
        console.log('🗺️ [RotaMapVisualization] Mapa pronto, processando rota:', !!rota);
        
        // Função de limpeza para remover layers, sources e imagens
        const cleanupLayers = () => {
          // Remover layers (ordem inversa para evitar dependências)
          const layersToRemove = [
            LAYER_IDS.labels,
            LAYER_IDS.iconesTerrestres,
            LAYER_IDS.iconesVoo,
            LAYER_IDS.semTag,
            LAYER_IDS.periferias,
            LAYER_IDS.polos,
            LAYER_IDS.trechosTerrestres,
            LAYER_IDS.trechosVoo
          ];

          layersToRemove.forEach(layerId => {
            try {
              if (map.getLayer && map.getLayer(layerId)) {
                map.removeLayer(layerId);
                console.log(`🗺️ [RotaMapVisualization] Layer ${layerId} removida`);
              }
            } catch (error) {
              console.warn(`🗺️ [RotaMapVisualization] Erro ao remover layer ${layerId}:`, error);
            }
          });

          // Remover sources
          Object.values(SOURCE_IDS).forEach(sourceId => {
            try {
              if (map.getSource && map.getSource(sourceId)) {
                map.removeSource(sourceId);
                console.log(`🗺️ [RotaMapVisualization] Source ${sourceId} removida`);
              }
            } catch (error) {
              console.warn(`🗺️ [RotaMapVisualization] Erro ao remover source ${sourceId}:`, error);
            }
          });

          // Remover imagens de marcadores antigos (polo-marker-*, periferia-marker-*, sem-tag-marker-*, icone-aviao, icone-carro)
          try {
            const imageKeys = Object.keys((map as any).style.imageManager?.images || {});
            imageKeys.forEach(imageId => {
              if (imageId.startsWith('polo-marker-') || 
                  imageId.startsWith('periferia-marker-') || 
                  imageId.startsWith('sem-tag-marker-') ||
                  imageId === 'icone-aviao' ||
                  imageId === 'icone-carro') {
                try {
                  if (map.hasImage(imageId)) {
                    map.removeImage(imageId);
                    console.log(`🗺️ [RotaMapVisualization] Imagem ${imageId} removida`);
                  }
                } catch (error) {
                  console.warn(`🗺️ [RotaMapVisualization] Erro ao remover imagem ${imageId}:`, error);
                }
              }
            });
          } catch (error) {
            console.warn(`🗺️ [RotaMapVisualization] Erro ao listar/remover imagens:`, error);
          }
        };

        // Limpar camadas existentes
        cleanupLayers();
        
        if (!rota) {
          console.log('🗺️ [RotaMapVisualization] Sem rota para visualizar');
          return;
        }

        // Preparar dados dos trechos
        const trechosVoo: GeoJSON.Feature[] = [];
        const trechosTerrestres: GeoJSON.Feature[] = [];
        const iconesTrechos: GeoJSON.Feature[] = [];
        const pontos: GeoJSON.Feature[] = [];
        const pontosUnicos = new Map<string, any>();
        const ordemVisita: string[] = []; // Array para manter ordem de visita

        // Função para calcular ponto médio de uma linha
        const calcularPontoMedio = (coordinates: [number, number][]): [number, number] => {
          if (coordinates.length === 0) return [0, 0];
          if (coordinates.length === 1) return coordinates[0];
          
          // Se a linha tem múltiplos pontos, calcular o ponto médio do segmento central
          const meio = Math.floor(coordinates.length / 2);
          if (coordinates.length === 2) {
            // Para linha reta, calcular ponto médio entre os dois pontos
            const [lng1, lat1] = coordinates[0];
            const [lng2, lat2] = coordinates[1];
            return [(lng1 + lng2) / 2, (lat1 + lat2) / 2];
          } else {
            // Para linha com múltiplos pontos, usar o ponto do meio
            return coordinates[meio];
          }
        };

        // Função para calcular bearing (direção) de uma linha
        const calcularBearing = (coordinates: [number, number][]): number => {
          if (coordinates.length < 2) return 0;
          
          // Usar primeiro e último ponto para calcular direção geral
          const [lng1, lat1] = coordinates[0];
          const [lng2, lat2] = coordinates[coordinates.length - 1];
          
          const dLng = (lng2 - lng1) * Math.PI / 180;
          const lat1Rad = lat1 * Math.PI / 180;
          const lat2Rad = lat2 * Math.PI / 180;
          
          const y = Math.sin(dLng) * Math.cos(lat2Rad);
          const x = Math.cos(lat1Rad) * Math.sin(lat2Rad) - 
                    Math.sin(lat1Rad) * Math.cos(lat2Rad) * Math.cos(dLng);
          
          const bearing = Math.atan2(y, x) * 180 / Math.PI;
          return (bearing + 360) % 360; // Normalizar para 0-360
        };

        rota.trechos.forEach((trecho, index) => {
          // Função auxiliar para obter coordenadas (pista ou município)
          const obterCoordenadas = (municipio: any): [number, number] => {
            // Para trechos aéreos entre polos, priorizar coordenadas da pista
            if (trecho.tipo === 'voo' && municipio.tipo === 'polo' && municipio.pistaSelecionada) {
              const pista = municipio.pistaSelecionada;
              // Verificar se a pista tem coordenadas válidas
              if (pista.coordenadas && pista.coordenadas.lat && pista.coordenadas.lng) {
                return [pista.coordenadas.lng, pista.coordenadas.lat];
              }
              // Fallback para coordenadas diretas da pista
              if (pista.latitude_pista && pista.longitude_pista) {
                return [pista.longitude_pista, pista.latitude_pista];
              }
            }
            // Fallback: coordenadas do município
            return [municipio.coordenadas.lng, municipio.coordenadas.lat];
          };

          // Obter coordenadas de origem e destino
          const coordOrigem = obterCoordenadas(trecho.origem);
          const coordDestino = obterCoordenadas(trecho.destino);

          // Coletar pontos únicos e ordem de visita (usar coordenadas do município para os pins)
          if (!pontosUnicos.has(trecho.origem.codigo)) {
            pontosUnicos.set(trecho.origem.codigo, {
              municipio: trecho.origem,
              coordinates: [trecho.origem.coordenadas.lng, trecho.origem.coordenadas.lat],
              tipo: trecho.origem.tipo,
              ordem: ordemVisita.length + 1
            });
            ordemVisita.push(trecho.origem.codigo);
          }
          if (!pontosUnicos.has(trecho.destino.codigo)) {
            pontosUnicos.set(trecho.destino.codigo, {
              municipio: trecho.destino,
              coordinates: [trecho.destino.coordenadas.lng, trecho.destino.coordenadas.lat],
              tipo: trecho.destino.tipo,
              ordem: ordemVisita.length + 1
            });
            ordemVisita.push(trecho.destino.codigo);
          }

          // Preparar geometria do trecho - linha reta entre origem e destino
          // Para rotas aéreas: usar coordenadas de pista se disponível
          // Para rotas terrestres: sempre usar coordenadas do município
          const coordinates: [number, number][] = [
            coordOrigem,
            coordDestino
          ];

          const feature: GeoJSON.Feature = {
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates
            },
            properties: {
              tipo: trecho.tipo,
              origem: trecho.origem.nome,
              destino: trecho.destino.nome,
              distancia: trecho.distanciaKm.toFixed(1),
              tempo: Math.round(trecho.tempoMinutos),
              index: index + 1,
              total: rota.trechos.length
            }
          };

          // Calcular ponto médio e bearing para o ícone
          const pontoMedio = calcularPontoMedio(coordinates);
          const bearing = calcularBearing(coordinates);
          const iconeFeature: GeoJSON.Feature = {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: pontoMedio
            },
            properties: {
              tipo: trecho.tipo,
              origem: trecho.origem.nome,
              destino: trecho.destino.nome,
              index: index + 1,
              bearing: bearing
            }
          };

          if (trecho.tipo === 'voo') {
            trechosVoo.push(feature);
            iconesTrechos.push(iconeFeature);
          } else {
            trechosTerrestres.push(feature);
            iconesTrechos.push(iconeFeature);
          }
        });

        // Converter pontos únicos para GeoJSON
        pontosUnicos.forEach(({ municipio, coordinates, tipo, ordem }) => {
          pontos.push({
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates
            },
            properties: {
              codigo: municipio.codigo,
              nome: municipio.nome,
              uf: municipio.uf,
              populacao: municipio.populacao,
              tipo,
              ordem // Adicionar número de ordem
            }
          });
        });

        console.log('🗺️ [RotaMapVisualization] Dados preparados:', {
          trechosVoo: trechosVoo.length,
          trechosTerrestres: trechosTerrestres.length,
          iconesTrechos: iconesTrechos.length,
          pontos: pontos.length
        });

        // Adicionar fonte dos trechos
        map.addSource(SOURCE_IDS.trechos, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: [...trechosVoo, ...trechosTerrestres]
          }
        });

        // Adicionar fonte dos pontos
        map.addSource(SOURCE_IDS.pontos, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: pontos
          }
        });

        // Adicionar fonte dos ícones dos trechos
        map.addSource(SOURCE_IDS.iconesTrechos, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: iconesTrechos
          }
        });

        // Função auxiliar para adicionar layer com verificação
        const addLayerSafely = (layerConfig: any) => {
          try {
            if (map.getLayer && map.getLayer(layerConfig.id)) {
              console.log(`🗺️ [RotaMapVisualization] Layer ${layerConfig.id} já existe, pulando...`);
              return;
            }
            map.addLayer(layerConfig);
            console.log(`🗺️ [RotaMapVisualization] Layer ${layerConfig.id} adicionada`);
          } catch (error) {
            console.warn(`🗺️ [RotaMapVisualization] Erro ao adicionar layer ${layerConfig.id}:`, error);
          }
        };

        // Camada dos trechos de voo (linha contínua)
        addLayerSafely({
          id: LAYER_IDS.trechosVoo,
          type: 'line',
          source: SOURCE_IDS.trechos,
          filter: ['==', 'tipo', 'voo'],
          paint: {
            'line-color': cores.voo,
            'line-width': 3,
            'line-opacity': 0.8
          }
        });

        // Camada dos trechos terrestres (linha pontilhada)
        addLayerSafely({
          id: LAYER_IDS.trechosTerrestres,
          type: 'line',
          source: SOURCE_IDS.trechos,
          filter: ['==', 'tipo', 'terrestre'],
          paint: {
            'line-color': cores.terrestre,
            'line-width': 4,
            'line-opacity': 0.8,
            'line-dasharray': [4, 2]
          }
        });

        // Criar ícones SVG para marcadores com numeração
        const createMarkerIcon = (color: string, tipo: 'polo' | 'periferia' | 'sem_tag', numero: number) => {
          return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
            <svg width="40" height="50" viewBox="0 0 40 50" xmlns="http://www.w3.org/2000/svg">
              <defs>
                <filter id="shadow-${tipo}-${numero}" x="-50%" y="-50%" width="200%" height="200%">
                  <feDropShadow dx="1" dy="2" stdDeviation="2" flood-opacity="0.4"/>
                </filter>
              </defs>
              <path d="M20 0C9 0 0 9 0 20c0 15 20 30 20 30s20-15 20-30C40 9 31 0 20 0z" 
                    fill="${color}" stroke="#ffffff" stroke-width="2.5" filter="url(#shadow-${tipo}-${numero})"/>
              <circle cx="20" cy="20" r="13" fill="#ffffff" opacity="0.95"/>
              <text x="20" y="27" text-anchor="middle" font-size="16" font-weight="bold" fill="#1f2937">${numero}</text>
            </svg>
          `)}`;
        };

        // Criar ícone SVG de avião (Send do Lucide - apenas o ícone)
        const createAviaoIcon = () => {
          return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" 
                    fill="none" 
                    stroke="${cores.voo}" 
                    stroke-width="2" 
                    stroke-linecap="round" 
                    stroke-linejoin="round"/>
            </svg>
          `)}`;
        };

        // Criar ícone SVG de carro (Car do Lucide - apenas o ícone)
        const createCarroIcon = () => {
          return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(`
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${cores.terrestre}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M19 17h2c.6 0 1-.4 1-1v-3c0-.9-.7-1.7-1.5-1.9C18.7 10.6 16 10 16 10s-1.3-1.4-2.2-2.3c-.5-.4-1.1-.7-1.8-.7H5c-.6 0-1.1.4-1.4.9l-1.4 2.9A3.7 3.7 0 0 0 2 12v4c0 .6.4 1 1 1h2"/>
              <circle cx="7" cy="17" r="2"/>
              <path d="M9 17h6"/>
              <circle cx="17" cy="17" r="2"/>
            </svg>
          `)}`;
        };

        // Gerar imagens para cada número único necessário
        const numerosUnicos = Array.from(new Set(pontos.map(p => p.properties?.ordem)));
        
        // Carregar imagens dos marcadores numerados
        const loadMarkerImage = (id: string, url: string) => {
          return new Promise<void>((resolve) => {
            // Verificar se a imagem já existe
            if (map.hasImage(id)) {
              console.log(`🗺️ [RotaMapVisualization] Imagem ${id} já existe, pulando...`);
              resolve();
              return;
            }
            
            const img = new Image();
            img.onload = () => {
              try {
                // Verificar novamente antes de adicionar (race condition)
                if (!map.hasImage(id)) {
                  map.addImage(id, img);
                  console.log(`🗺️ [RotaMapVisualization] Imagem ${id} adicionada com sucesso`);
                }
                resolve();
              } catch (error) {
                console.warn(`🗺️ [RotaMapVisualization] Erro ao adicionar imagem ${id}:`, error);
                resolve();
              }
            };
            img.onerror = () => {
              console.warn(`🗺️ [RotaMapVisualization] Erro ao carregar imagem ${id}`);
              resolve();
            };
            img.src = url;
          });
        };

        // Carregar todas as imagens de marcadores necessárias
        const imagePromises: Promise<void>[] = [];
        numerosUnicos.forEach(numero => {
          // Criar marcadores para polos, periferias e sem tag com o mesmo número
          const poloIconUrl = createMarkerIcon(cores.polo, 'polo', numero);
          const periferiaIconUrl = createMarkerIcon(cores.periferia, 'periferia', numero);
          const semTagIconUrl = createMarkerIcon(cores.sem_tag, 'sem_tag', numero);
          
          imagePromises.push(loadMarkerImage(`polo-marker-${numero}`, poloIconUrl));
          imagePromises.push(loadMarkerImage(`periferia-marker-${numero}`, periferiaIconUrl));
          imagePromises.push(loadMarkerImage(`sem-tag-marker-${numero}`, semTagIconUrl));
        });

        // Carregar ícones de avião e carro
        const aviaoIconUrl = createAviaoIcon();
        const carroIconUrl = createCarroIcon();
        imagePromises.push(loadMarkerImage('icone-aviao', aviaoIconUrl));
        imagePromises.push(loadMarkerImage('icone-carro', carroIconUrl));

        await Promise.all(imagePromises);

        // Camada dos polos com ícones de pin numerados
        addLayerSafely({
          id: LAYER_IDS.polos,
          type: 'symbol',
          source: SOURCE_IDS.pontos,
          filter: ['==', 'tipo', 'polo'],
          layout: {
            'icon-image': ['concat', 'polo-marker-', ['get', 'ordem']],
            'icon-size': 0.8,
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          }
        });

        // Camada das periferias com ícones de pin numerados
        addLayerSafely({
          id: LAYER_IDS.periferias,
          type: 'symbol',
          source: SOURCE_IDS.pontos,
          filter: ['==', 'tipo', 'periferia'],
          layout: {
            'icon-image': ['concat', 'periferia-marker-', ['get', 'ordem']],
            'icon-size': 0.7,
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          }
        });

        // Camada dos municípios sem tag com ícones de pin numerados
        addLayerSafely({
          id: LAYER_IDS.semTag,
          type: 'symbol',
          source: SOURCE_IDS.pontos,
          filter: ['==', 'tipo', 'sem_tag'],
          layout: {
            'icon-image': ['concat', 'sem-tag-marker-', ['get', 'ordem']],
            'icon-size': 0.7,
            'icon-anchor': 'bottom',
            'icon-allow-overlap': true,
            'icon-ignore-placement': true
          }
        });

        // Camada dos ícones de avião nos trechos aéreos
        addLayerSafely({
          id: LAYER_IDS.iconesVoo,
          type: 'symbol',
          source: SOURCE_IDS.iconesTrechos,
          filter: ['==', 'tipo', 'voo'],
          layout: {
            'icon-image': 'icone-aviao',
            'icon-size': 0.9,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-rotation-alignment': 'map',
            'icon-rotate': ['get', 'bearing']
          }
        });

        // Camada dos ícones de carro nos trechos terrestres
        addLayerSafely({
          id: LAYER_IDS.iconesTerrestres,
          type: 'symbol',
          source: SOURCE_IDS.iconesTrechos,
          filter: ['==', 'tipo', 'terrestre'],
          layout: {
            'icon-image': 'icone-carro',
            'icon-size': 0.9,
            'icon-allow-overlap': true,
            'icon-ignore-placement': true,
            'icon-rotation-alignment': 'map',
            'icon-rotate': ['get', 'bearing']
          }
        });

        // Camada de labels se solicitada
        if (showLabels) {
          addLayerSafely({
            id: LAYER_IDS.labels,
            type: 'symbol',
            source: SOURCE_IDS.pontos,
            layout: {
              'text-field': ['get', 'nome'],
              'text-font': ['Open Sans Regular'],
              'text-size': 11,
              'text-offset': [0, 1.5],
              'text-anchor': 'top',
              'text-allow-overlap': false,
              'text-optional': true
            },
            paint: {
              'text-color': '#000000',
              'text-halo-color': '#ffffff',
              'text-halo-width': 1
            }
          });
        }

        // Adicionar popups nos cliques
        const addPopupHandlers = () => {
          // Popup para trechos
          [LAYER_IDS.trechosVoo, LAYER_IDS.trechosTerrestres].forEach(layerId => {
            map.on('click', layerId, (e: any) => {
              if (e.features && e.features[0]) {
                const props = e.features[0].properties;
                const popup = new maplibregl.Popup({ offset: 4 })
                  .setLngLat(e.lngLat)
                  .setHTML(`
                    <div class="text-sm">
                      <div class="font-semibold mb-1">
                        ${props?.tipo === 'voo' ? '✈️ Voo' : '🚗 Terrestre'}
                      </div>
                      <div><strong>De:</strong> ${props?.origem}</div>
                      <div><strong>Para:</strong> ${props?.destino}</div>
                      <div><strong>Distância:</strong> ${props?.distancia} km</div>
                      <div><strong>Tempo:</strong> ${props?.tempo} min</div>
                      <div class="text-xs text-gray-500 mt-1">Trecho ${props?.index} de ${props?.total}</div>
                    </div>
                  `)
                  .addTo(map);
              }
            });

            // Cursor pointer
            map.on('mouseenter', layerId, () => {
              map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', layerId, () => {
              map.getCanvas().style.cursor = '';
            });
          });

          // Popup para pontos
          [LAYER_IDS.polos, LAYER_IDS.periferias, LAYER_IDS.semTag].forEach(layerId => {
            map.on('click', layerId, (e: any) => {
              if (e.features && e.features[0]) {
                const props = e.features[0].properties;
                const tipo = props?.tipo || 'periferia';
                const tipoLabel = tipo === 'polo' ? 'Polo' : tipo === 'sem_tag' ? 'Fora do Polo' : 'Periferia';
                const emoji = tipo === 'polo' ? '🏢' : tipo === 'sem_tag' ? '📍' : '🏘️';
                
                const popup = new maplibregl.Popup({ offset: 4 })
                  .setLngLat(e.lngLat)
                  .setHTML(`
                    <div class="text-base p-2" style="color: black; min-width: 200px;">
                      <div class="font-bold mb-2 flex items-center gap-3" style="color: black;">
                        <span class="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-600 text-white text-sm font-bold">
                          ${props?.ordem}
                        </span>
                        <span class="text-lg">${emoji}</span>
                        <span class="text-base">${props?.nome}</span>
                      </div>
                      <div class="mb-1" style="color: black;"><strong class="text-sm">UF:</strong> <span class="text-base">${props?.uf}</span></div>
                      <div class="mb-1" style="color: black;"><strong class="text-sm">Tipo:</strong> <span class="text-base">${tipoLabel}</span></div>
                      <div class="text-sm mt-2 pt-1 border-t border-gray-300" style="color: #666;">Parada ${props?.ordem} na rota</div>
                    </div>
                  `)
                  .addTo(map);
              }
            });

            map.on('mouseenter', layerId, () => {
              map.getCanvas().style.cursor = 'pointer';
            });
            map.on('mouseleave', layerId, () => {
              map.getCanvas().style.cursor = '';
            });
          });
        };

        addPopupHandlers();

        // Forçar resize do mapa (importante para visualização correta)
        const triggerResize = () => {
          if (map && map.getContainer()) {
            map.resize();
            console.log('🗺️ [RotaMapVisualization] Mapa redimensionado');
          }
        };
        
        // Múltiplos triggers de resize para garantir funcionamento em diferentes situações
        setTimeout(triggerResize, 100);
        setTimeout(triggerResize, 500);
        setTimeout(triggerResize, 1000);

        // Função para ajustar vista
        const ajustarVista = () => {
          if (pontos.length > 0) {
            const coordinates = pontos
              .filter(p => p.geometry.type === 'Point')
              .map(p => (p.geometry as GeoJSON.Point).coordinates as [number, number]);
            
            if (coordinates.length > 0) {
              try {
                const bounds = coordinates.reduce((bounds, coord) => {
                  return bounds.extend(coord);
                }, new maplibregl.LngLatBounds(coordinates[0], coordinates[0]));

                // Usar padding responsivo baseado no tamanho da tela
                const padding = window.innerWidth < 768 ? 15 : 
                              window.innerWidth < 1024 ? 30 : 50;
                
                map.fitBounds(bounds, { 
                  padding,
                  maxZoom: 12, // Permitir zoom um pouco maior
                  duration: 1500 // Animação mais suave
                });
                
                console.log('🗺️ [RotaMapVisualization] Vista ajustada para mostrar toda a rota');
              } catch (error) {
                console.warn('🗺️ [RotaMapVisualization] Erro ao ajustar vista:', error);
              }
            }
          }
        };

        // Ajustar vista com múltiplos delays para garantir renderização
        // Primeiro ajuste rápido
        setTimeout(ajustarVista, 300);
        
        // Segundo ajuste após um tempo maior
        setTimeout(() => {
          // Verificar se o container do mapa está visível
          const container = map.getContainer();
          if (container && container.offsetWidth > 0 && container.offsetHeight > 0) {
            ajustarVista();
          } else {
            console.warn('🗺️ [RotaMapVisualization] Container do mapa não está visível, tentando novamente...');
            setTimeout(ajustarVista, 1000);
          }
        }, 800);
        
        // Terceiro ajuste como fallback
        setTimeout(ajustarVista, 2000);

        console.log('🗺️ [RotaMapVisualization] Visualização da rota adicionada ao mapa');

      } catch (error) {
        console.error('🗺️ [RotaMapVisualization] Erro ao processar mapa:', error);
      }
    };

    // Variáveis para cleanup 
    let resizeCleanup: (() => void) | null = null;

    const processMapWithCleanup = async () => {
      await handleMapReady();
      
      // Adicionar listener para redimensionamento da janela
      const handleWindowResize = () => {
        waitForMapReady(1000).then(currentMap => {
          if (currentMap && currentMap.getContainer()) {
            currentMap.resize();
            console.log('🗺️ [RotaMapVisualization] Mapa redimensionado após mudança de tamanho da janela');
          }
        }).catch(error => {
          console.warn('🗺️ [RotaMapVisualization] Erro no resize:', error);
        });
      };
      
      window.addEventListener('resize', handleWindowResize);
      
      resizeCleanup = () => {
        window.removeEventListener('resize', handleWindowResize);
      };
    };

    processMapWithCleanup();

    // Cleanup function
    return () => {
      console.log('🗺️ [RotaMapVisualization] Limpando visualização da rota');
      if (resizeCleanup) {
        resizeCleanup();
      }
      // Remover camadas, fontes e imagens quando o componente desmonta (ex.: clique em "Limpar")
      waitForMapReady(1000)
        .then(map => {
          try {
            const layersToRemove = [
              LAYER_IDS.labels,
              LAYER_IDS.iconesTerrestres,
              LAYER_IDS.iconesVoo,
              LAYER_IDS.semTag,
              LAYER_IDS.periferias,
              LAYER_IDS.polos,
              LAYER_IDS.trechosTerrestres,
              LAYER_IDS.trechosVoo
            ];

            layersToRemove.forEach(layerId => {
              try {
                if (map.getLayer && map.getLayer(layerId)) {
                  map.removeLayer(layerId);
                  console.log(`🗺️ [RotaMapVisualization] Layer ${layerId} removida (cleanup unmount)`);
                }
              } catch (error) {
                console.warn(`🗺️ [RotaMapVisualization] Erro ao remover layer ${layerId} no cleanup:`, error);
              }
            });

            Object.values(SOURCE_IDS).forEach(sourceId => {
              try {
                if (map.getSource && map.getSource(sourceId)) {
                  map.removeSource(sourceId);
                  console.log(`🗺️ [RotaMapVisualization] Source ${sourceId} removida (cleanup unmount)`);
                }
              } catch (error) {
                console.warn(`🗺️ [RotaMapVisualization] Erro ao remover source ${sourceId} no cleanup:`, error);
              }
            });

            try {
              const imageKeys = Object.keys((map as any).style.imageManager?.images || {});
              imageKeys.forEach(imageId => {
                if (imageId.startsWith('polo-marker-') || 
                    imageId.startsWith('periferia-marker-') || 
                    imageId.startsWith('sem-tag-marker-') ||
                    imageId === 'icone-aviao' ||
                    imageId === 'icone-carro') {
                  try {
                    if (map.hasImage(imageId)) {
                      map.removeImage(imageId);
                      console.log(`🗺️ [RotaMapVisualization] Imagem ${imageId} removida (cleanup unmount)`);
                    }
                  } catch (error) {
                    console.warn(`🗺️ [RotaMapVisualization] Erro ao remover imagem ${imageId} no cleanup:`, error);
                  }
                }
              });
            } catch (error) {
              console.warn('🗺️ [RotaMapVisualization] Erro ao listar/remover imagens no cleanup:', error);
            }
          } catch (error) {
            console.warn('🗺️ [RotaMapVisualization] Erro no cleanup ao desmontar:', error);
          }
        })
        .catch(() => {
          // Sem ação se o mapa não estiver pronto
        });
    };
  }, [rota, showLabels, cores, LAYER_IDS, SOURCE_IDS]);

  return null; // Este componente não renderiza nada diretamente
}

// Estilos CSS adicionais que podem ser incluídos globalmente
export const rotaMapStyles = `
  .custom-tooltip {
    background: rgba(0, 0, 0, 0.8) !important;
    color: white !important;
    border: none !important;
    border-radius: 4px !important;
    font-size: 11px !important;
    font-weight: 500 !important;
    padding: 2px 6px !important;
    box-shadow: 0 2px 4px rgba(0,0,0,0.3) !important;
  }
  
  .custom-tooltip::before {
    border-bottom-color: rgba(0, 0, 0, 0.8) !important;
  }
  
  .custom-div-icon {
    background: transparent !important;
    border: none !important;
  }
`;