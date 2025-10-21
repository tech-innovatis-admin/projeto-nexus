/**
 * Serviço para buscar coordenadas dos municípios
 * Usa a base sedes_municipais_lat_long.json que já possui as coordenadas precisas
 * Evita a necessidade de geocoding via Google Maps API
 */

export interface SedeMunicipal {
  uf: string;
  codigo_ibge: string;
  municipio_br: string;
  latitude_munic: string;
  longitude_munic: string;
}

export interface Coordenada {
  lat: number;
  lng: number;
}

// Cache em memória para lookup rápido
let coordenadasCache: Map<string, Coordenada> | null = null;
let sedesRawData: SedeMunicipal[] | null = null;

/**
 * Inicializa o cache de coordenadas a partir dos dados carregados
 */
export function inicializarCacheCoordenas(sedesMunicipais: SedeMunicipal[]): void {
  console.log('📍 [coordenadasService] 🚀 INICIALIZANDO CACHE DE COORDENADAS 🚀');
  console.log('📍 [coordenadasService] 📊 Dados recebidos da base sedes_municipais_lat_long.json');
  console.log('📍 [coordenadasService] 🏙️ Total de sedes municipais:', sedesMunicipais.length);
  console.log('📍 [coordenadasService] 💡 Exemplo de dados da base:');
  console.log('📍 [coordenadasService]', JSON.stringify(sedesMunicipais.slice(0, 1), null, 2));

  sedesRawData = sedesMunicipais;
  coordenadasCache = new Map();
  
  let sucessos = 0;
  let falhas = 0;
  
  for (const sede of sedesMunicipais) {
    const codigo = String(sede.codigo_ibge || '').trim();
    
    if (!codigo || codigo === '0' || codigo === '') {
      falhas++;
      continue;
    }
    
    // Converter coordenadas de string para número
    const lat = parseFloat(String(sede.latitude_munic || '').trim());
    const lng = parseFloat(String(sede.longitude_munic || '').trim());
    
    // Validar coordenadas
    const coordenadasValidas = !isNaN(lat) && !isNaN(lng) &&
                              lat >= -90 && lat <= 90 &&
                              lng >= -180 && lng <= 180 &&
                              lat !== 0 && lng !== 0;
    
    if (coordenadasValidas) {
      coordenadasCache.set(codigo, { lat, lng });
      sucessos++;
    } else {
      falhas++;
      console.warn(`⚠️ [coordenadasService] Coordenadas inválidas para código ${codigo} (${sede.municipio_br}):`, {
        lat: sede.latitude_munic,
        lng: sede.longitude_munic
      });
    }
  }
  
  console.log('✅ [coordenadasService] Cache inicializado:', {
    total: sedesMunicipais.length,
    sucessos,
    falhas,
    taxaSucesso: ((sucessos / sedesMunicipais.length) * 100).toFixed(1) + '%'
  });
}

/**
 * Busca coordenadas de um município pelo código IBGE
 */
export function buscarCoordenadasPorCodigoIBGE(codigoIBGE: string): Coordenada | null {
  if (!coordenadasCache) {
    console.warn('⚠️ [coordenadasService] Cache não inicializado. Chame inicializarCacheCoordenas() primeiro.');
    return null;
  }

  const codigo = String(codigoIBGE || '').trim();

  if (!codigo || codigo === '0' || codigo === '') {
    console.log(`🔍 [coordenadasService] Código IBGE inválido: "${codigoIBGE}"`);
    return null;
  }

  console.log(`🔍 [coordenadasService] Buscando coordenadas para código IBGE: ${codigo}`);

  const coordenadas = coordenadasCache.get(codigo);

  if (!coordenadas) {
    console.warn(`⚠️ [coordenadasService] Coordenadas NÃO encontradas no cache para código IBGE: ${codigo}`);
    console.log(`📊 [coordenadasService] Total de coordenadas no cache: ${coordenadasCache.size}`);
    return null;
  }

  console.log(`✅ [coordenadasService] Coordenadas ENCONTRADAS no cache para código IBGE ${codigo}:`);
  console.log(`📍 [coordenadasService] Latitude: ${coordenadas.lat}, Longitude: ${coordenadas.lng}`);
  console.log(`🎯 [coordenadasService] Coordenadas retornadas da base sedes_municipais_lat_long.json`);

  return coordenadas;
}

/**
 * Busca informações completas de uma sede municipal pelo código IBGE
 */
export function buscarSedeMunicipalPorCodigoIBGE(codigoIBGE: string): SedeMunicipal | null {
  if (!sedesRawData) {
    console.warn('⚠️ [coordenadasService] Dados não inicializados.');
    return null;
  }
  
  const codigo = String(codigoIBGE || '').trim();
  
  if (!codigo || codigo === '0' || codigo === '') {
    return null;
  }
  
  return sedesRawData.find(sede => String(sede.codigo_ibge).trim() === codigo) || null;
}

/**
 * Verifica se o cache está inicializado
 */
export function isCacheInicializado(): boolean {
  return coordenadasCache !== null && coordenadasCache.size > 0;
}

/**
 * Retorna estatísticas do cache
 */
export function getEstatisticasCache(): {
  inicializado: boolean;
  totalCoordenas: number;
  totalSedes: number;
} {
  return {
    inicializado: coordenadasCache !== null,
    totalCoordenas: coordenadasCache?.size || 0,
    totalSedes: sedesRawData?.length || 0
  };
}

/**
 * Limpa o cache (útil para testes)
 */
export function limparCache(): void {
  coordenadasCache = null;
  sedesRawData = null;
  console.log('🗑️ [coordenadasService] Cache limpo');
}

