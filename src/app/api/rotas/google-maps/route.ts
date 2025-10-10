import { NextRequest, NextResponse } from 'next/server';

// Cache em memória para respostas Google Maps
const cacheGoogleMaps = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hora

// Rate limiting simples (por IP)
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX_REQUESTS = 100; // 100 requisições por minuto

interface Coordenada {
  lat: number;
  lng: number;
}

interface MunicipioRota {
  codigo: string;
  nome: string;
  uf: string;
  coordenadas: Coordenada;
  tipo: 'polo' | 'periferia';
}

/**
 * API para calcular rotas usando Google Maps Directions API
 * Endpoint: /api/rotas/google-maps
 * Método: POST
 * 
 * Body esperado:
 * {
 *   "origem": {
 *     "codigo": "2507507",
 *     "nome": "João Pessoa",
 *     "uf": "PB",
 *     "coordenadas": { "lat": -7.1195, "lng": -34.8450 },
 *     "tipo": "polo"
 *   },
 *   "destino": {
 *     "codigo": "2513703",
 *     "nome": "Queimadas",
 *     "uf": "PB", 
 *     "coordenadas": { "lat": -7.3554, "lng": -35.8959 },
 *     "tipo": "periferia"
 *   },
 *   "tipoTransporte": "driving" // ou "transit" ou "walking"
 * }
 */
export async function POST(request: NextRequest) {
  const clientIP = request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   'unknown';

  // Rate limiting
  const now = Date.now();
  const rateLimitEntry = rateLimitMap.get(clientIP);
  
  if (rateLimitEntry) {
    if (now < rateLimitEntry.resetTime) {
      if (rateLimitEntry.count >= RATE_LIMIT_MAX_REQUESTS) {
        return NextResponse.json(
          { 
            error: 'Rate limit exceeded',
            message: 'Muitas requisições. Por favor, aguarde um momento.' 
          },
          { status: 429 }
        );
      }
      rateLimitEntry.count++;
    } else {
      // Reset do contador
      rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    }
  } else {
    rateLimitMap.set(clientIP, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
  }

  try {
    const body = await request.json();
    const { origem, destino, tipoTransporte = 'driving' } = body as {
      origem: MunicipioRota;
      destino: MunicipioRota;
      tipoTransporte?: 'driving' | 'transit' | 'walking';
    };

    // Validação de entrada
    if (!origem || !destino) {
      return NextResponse.json(
        { error: 'Origem e destino são obrigatórios' },
        { status: 400 }
      );
    }

    if (!isValidMunicipio(origem) || !isValidMunicipio(destino)) {
      return NextResponse.json(
        { error: 'Dados de município inválidos' },
        { status: 400 }
      );
    }

    // Validar lógica de transporte
    const tipoRotaValido = validateTipoRota(origem.tipo, destino.tipo, tipoTransporte);
    if (!tipoRotaValido.valid) {
      return NextResponse.json(
        { error: tipoRotaValido.message },
        { status: 400 }
      );
    }

    // Gerar chave de cache
    const cacheKey = generateCacheKey(origem, destino, tipoTransporte);

    // Verificar cache
    const cached = cacheGoogleMaps.get(cacheKey);
    if (cached && (now - cached.timestamp) < CACHE_TTL_MS) {
      console.log('🗺️ [Google Maps API] Cache hit:', cacheKey);
      return NextResponse.json({
        ...cached.data,
        cached: true,
        cachedAt: new Date(cached.timestamp).toISOString()
      });
    }

    // Verificar API Key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: 'Google Maps API Key não configurada' },
        { status: 500 }
      );
    }

    // Montar URL da API do Google
    const baseUrl = 'https://maps.googleapis.com/maps/api/directions/json';
    const params = new URLSearchParams({
      origin: `${origem.coordenadas.lat},${origem.coordenadas.lng}`,
      destination: `${destino.coordenadas.lat},${destino.coordenadas.lng}`,
      mode: tipoTransporte,
      language: 'pt-BR',
      region: 'BR',
      units: 'metric',
      key: apiKey
    });

    const url = `${baseUrl}?${params.toString()}`;
    
    console.log('🗺️ [Google Maps API] Requisitando rota:', {
      origem: `${origem.nome} (${origem.uf})`,
      destino: `${destino.nome} (${destino.uf})`,
      transporte: tipoTransporte
    });

    // Chamar Google Maps com timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15s timeout

    let response;
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });
    } finally {
      clearTimeout(timeoutId);
    }

    if (!response.ok) {
      const errorText = await response.text();
      console.error('🗺️ [Google Maps API] Erro na resposta:', response.status, errorText);
      
      return NextResponse.json(
        { 
          error: 'Erro ao calcular rota',
          message: 'O serviço Google Maps está temporariamente indisponível',
          details: response.status === 404 ? 'Rota não encontrada' : undefined
        },
        { status: response.status === 404 ? 404 : 503 }
      );
    }

    const data = await response.json();

    // Validar resposta do Google Maps
    if (data.status !== 'OK' || !data.routes || data.routes.length === 0) {
      let errorMessage = 'Não foi possível encontrar uma rota';
      
      switch (data.status) {
        case 'NOT_FOUND':
          errorMessage = 'Origem ou destino não encontrados';
          break;
        case 'ZERO_RESULTS':
          errorMessage = 'Nenhuma rota encontrada entre os pontos';
          break;
        case 'OVER_QUERY_LIMIT':
          errorMessage = 'Limite de consultas excedido';
          break;
        case 'REQUEST_DENIED':
          errorMessage = 'Requisição negada - verifique a API Key';
          break;
        case 'INVALID_REQUEST':
          errorMessage = 'Parâmetros de requisição inválidos';
          break;
      }

      return NextResponse.json(
        { 
          error: 'Erro na rota',
          message: errorMessage,
          googleStatus: data.status
        },
        { status: data.status === 'OVER_QUERY_LIMIT' ? 429 : 404 }
      );
    }

    const route = data.routes[0];
    const leg = route.legs[0]; // Primeira (e única) perna da viagem

    // Extrair geometria (polyline decodificada)
    const geometria = decodePolyline(route.overview_polyline.points);

    // Formatar resposta padronizada
    const resultado = {
      origem: {
        codigo: origem.codigo,
        nome: origem.nome,
        uf: origem.uf,
        tipo: origem.tipo,
        endereco: leg.start_address
      },
      destino: {
        codigo: destino.codigo,
        nome: destino.nome,
        uf: destino.uf,
        tipo: destino.tipo,
        endereco: leg.end_address
      },
      transporte: tipoTransporte,
      distanciaKm: leg.distance.value / 1000,
      tempoMinutos: leg.duration.value / 60,
      tempoTexto: leg.duration.text,
      distanciaTexto: leg.distance.text,
      geometria: geometria, // [[lat, lng], ...]
      instrucoes: extractInstructions(leg.steps),
      metadados: {
        googleStatus: data.status,
        calculadoEm: new Date().toISOString(),
        copyright: data.copyrights,
        avisos: data.warnings || []
      }
    };

    // Salvar no cache
    cacheGoogleMaps.set(cacheKey, {
      data: resultado,
      timestamp: now
    });

    console.log('🗺️ [Google Maps API] Rota calculada com sucesso:', {
      rota: `${origem.nome} → ${destino.nome}`,
      distancia: resultado.distanciaTexto,
      tempo: resultado.tempoTexto,
      transporte: tipoTransporte
    });

    return NextResponse.json({
      ...resultado,
      cached: false
    });

  } catch (error: any) {
    console.error('🗺️ [Google Maps API] Erro interno:', error);

    if (error.name === 'AbortError') {
      return NextResponse.json(
        { 
          error: 'Timeout',
          message: 'A requisição demorou muito tempo. Tente novamente.' 
        },
        { status: 504 }
      );
    }

    return NextResponse.json(
      { 
        error: 'Erro interno',
        message: 'Erro ao processar requisição de rota',
        details: process.env.NODE_ENV === 'development' ? error.message : undefined
      },
      { status: 500 }
    );
  }
}

/**
 * Health check do serviço Google Maps
 */
export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    if (!apiKey) {
      return NextResponse.json({
        status: 'error',
        googleMapsAvailable: false,
        error: 'API Key não configurada',
        timestamp: new Date().toISOString()
      }, { status: 503 });
    }

    // Teste simples com rota conhecida (São Paulo → Rio de Janeiro)
    const testUrl = `https://maps.googleapis.com/maps/api/directions/json?origin=-23.550520,-46.633308&destination=-22.906847,-43.172896&mode=driving&key=${apiKey}`;
    
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(testUrl, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      return NextResponse.json({
        status: 'ok',
        googleMapsAvailable: response.ok && data.status === 'OK',
        googleStatus: data.status,
        cacheSize: cacheGoogleMaps.size,
        timestamp: new Date().toISOString()
      });
    } finally {
      clearTimeout(timeoutId);
    }
  } catch (error: any) {
    return NextResponse.json({
      status: 'error',
      googleMapsAvailable: false,
      error: error.message,
      timestamp: new Date().toISOString()
    }, { status: 503 });
  }
}

// Funções auxiliares

function isValidMunicipio(municipio: MunicipioRota): boolean {
  return (
    typeof municipio.codigo === 'string' &&
    typeof municipio.nome === 'string' &&
    typeof municipio.uf === 'string' &&
    municipio.coordenadas &&
    typeof municipio.coordenadas.lat === 'number' &&
    typeof municipio.coordenadas.lng === 'number' &&
    municipio.coordenadas.lat >= -90 &&
    municipio.coordenadas.lat <= 90 &&
    municipio.coordenadas.lng >= -180 &&
    municipio.coordenadas.lng <= 180 &&
    (municipio.tipo === 'polo' || municipio.tipo === 'periferia')
  );
}

function validateTipoRota(origemTipo: string, destinoTipo: string, transporte: string): { valid: boolean; message?: string } {
  // Polo → Polo: deve ser voo (calculado no frontend, não nesta API)
  if (origemTipo === 'polo' && destinoTipo === 'polo') {
    return {
      valid: false,
      message: 'Rotas entre polos devem ser calculadas como voo no frontend'
    };
  }

  // Polo → Periferia ou Periferia → Polo ou Periferia → Periferia: deve ser driving
  if (transporte !== 'driving') {
    return {
      valid: false,
      message: 'Rotas terrestres devem usar transporte "driving"'
    };
  }

  return { valid: true };
}

function generateCacheKey(origem: MunicipioRota, destino: MunicipioRota, transporte: string): string {
  return `${origem.codigo}-${destino.codigo}-${transporte}`;
}

function extractInstructions(steps: any[]): any[] {
  return steps.map(step => ({
    tipo: step.maneuver || 'straight',
    descricao: step.html_instructions.replace(/<[^>]*>/g, ''), // Remove HTML tags
    distanciaKm: step.distance.value / 1000,
    tempoMinutos: step.duration.value / 60,
    distanciaTexto: step.distance.text,
    tempoTexto: step.duration.text,
    coordenada: {
      lat: step.start_location.lat,
      lng: step.start_location.lng
    }
  }));
}

// Função para decodificar polyline do Google Maps
function decodePolyline(str: string): [number, number][] {
  let index = 0;
  const len = str.length;
  let lat = 0;
  let lng = 0;
  const coordinates: [number, number][] = [];

  while (index < len) {
    let b: number;
    let shift = 0;
    let result = 0;

    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLat = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      b = str.charCodeAt(index++) - 63;
      result |= (b & 0x1f) << shift;
      shift += 5;
    } while (b >= 0x20);

    const deltaLng = (result & 1) !== 0 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lat / 1e5, lng / 1e5]);
  }

  return coordinates;
}

// Limpeza periódica do cache (rodar a cada 1 hora)
setInterval(() => {
  const now = Date.now();
  let cleanedCount = 0;
  
  for (const [key, entry] of cacheGoogleMaps.entries()) {
    if (now - entry.timestamp > CACHE_TTL_MS) {
      cacheGoogleMaps.delete(key);
      cleanedCount++;
    }
  }
  
  if (cleanedCount > 0) {
    console.log(`🗺️ [Google Maps Cache] Limpou ${cleanedCount} entradas antigas`);
  }
}, CACHE_TTL_MS);