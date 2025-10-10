// Registro global para instâncias do MapLibre GL JS
import type { Map as MapLibreMap } from 'maplibre-gl';

interface MapRegistry {
  mapInstance: MapLibreMap | null;
  listeners: Set<(map: MapLibreMap | null) => void>;
}

// Singleton do registro do mapa
const mapRegistry: MapRegistry = {
  mapInstance: null,
  listeners: new Set()
};

// Registrar uma instância do mapa
export function registerMapInstance(map: MapLibreMap | null) {
  console.log('🗺️ [MapRegistry] Registrando instância do mapa:', map ? 'definida' : 'null');
  
  mapRegistry.mapInstance = map;
  
  // Notificar todos os listeners
  mapRegistry.listeners.forEach(listener => {
    try {
      listener(map);
    } catch (error) {
      console.error('🗺️ [MapRegistry] Erro ao notificar listener:', error);
    }
  });
}

// Obter a instância atual do mapa
export function getMapInstance(): MapLibreMap | null {
  return mapRegistry.mapInstance;
}

// Adicionar um listener para mudanças na instância do mapa
export function addMapInstanceListener(listener: (map: MapLibreMap | null) => void): () => void {
  mapRegistry.listeners.add(listener);
  
  // Se já há uma instância, notificar imediatamente
  if (mapRegistry.mapInstance) {
    try {
      listener(mapRegistry.mapInstance);
    } catch (error) {
      console.error('🗺️ [MapRegistry] Erro ao notificar listener imediato:', error);
    }
  }
  
  // Retornar função para remover o listener
  return () => {
    mapRegistry.listeners.delete(listener);
  };
}

// Aguardar até que uma instância do mapa esteja disponível
export function waitForMapInstance(timeout = 5000): Promise<MapLibreMap> {
  return new Promise((resolve, reject) => {
    // Se já há uma instância, resolver imediatamente
    if (mapRegistry.mapInstance) {
      resolve(mapRegistry.mapInstance);
      return;
    }

    // Configurar timeout
    const timeoutId = setTimeout(() => {
      cleanup();
      reject(new Error('Timeout aguardando instância do mapa'));
    }, timeout);

    // Configurar listener
    const cleanup = addMapInstanceListener((map) => {
      if (map) {
        clearTimeout(timeoutId);
        cleanup();
        resolve(map);
      }
    });
  });
}

// Verificar se há uma instância do mapa carregada e pronta
export function isMapReady(): boolean {
  return mapRegistry.mapInstance !== null && mapRegistry.mapInstance.loaded();
}

// Aguardar até que o mapa esteja carregado e pronto
export function waitForMapReady(timeout = 5000): Promise<MapLibreMap> {
  return new Promise((resolve, reject) => {
    const checkReady = () => {
      if (isMapReady()) {
        resolve(mapRegistry.mapInstance!);
        return;
      }

      if (mapRegistry.mapInstance) {
        // Mapa existe mas não está carregado ainda
        mapRegistry.mapInstance.once('load', () => {
          resolve(mapRegistry.mapInstance!);
        });
      } else {
        // Aguardar instância ser registrada
        waitForMapInstance(timeout)
          .then(map => {
            if (map.loaded()) {
              resolve(map);
            } else {
              map.once('load', () => resolve(map));
            }
          })
          .catch(reject);
      }
    };

    checkReady();
  });
}

// Debug: mostrar estado atual do registro
export function debugMapRegistry() {
  console.log('🗺️ [MapRegistry] Estado atual:', {
    hasInstance: !!mapRegistry.mapInstance,
    isLoaded: mapRegistry.mapInstance?.loaded(),
    listenersCount: mapRegistry.listeners.size
  });
}