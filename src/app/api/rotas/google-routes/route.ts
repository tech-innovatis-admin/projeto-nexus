import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, createApiErrorResponse, getApiStatus } from '@/utils/mapsApiGuard';

// Interface para coordenadas
interface Coordenada {
  lat: number;
  lng: number;
}

// Interface para instrução de rota
interface InstrucaoRota {
  tipo: string;
  descricao: string;
  distanciaKm: number;
  tempoMinutos: number;
  coordenada: Coordenada;
}

// Interface para localização (coordenadas OU nome/UF)
interface Localizacao {
  // Opção 1: Coordenadas diretas
  lat?: number;
  lng?: number;
  // Opção 2: Nome do município + UF (para geocoding)
  nome?: string;
  uf?: string;
}

// Interface para requisição
interface RoutesRequest {
  origem: Localizacao;
  destino: Localizacao;
  waypoints?: Localizacao[]; // Pontos intermediários opcionais
  travelMode?: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TWO_WHEELER';
}

// Interface para resposta
interface RoutesResponse {
  success: boolean;
  distanciaKm: number;
  tempoMinutos: number;
  geometria: [number, number][]; // [[lng, lat], ...]
  instrucoes: InstrucaoRota[];
  metadados?: {
    origem: Coordenada;
    destino: Coordenada;
    travelMode: string;
  };
  error?: string;
}

// Cache em memória para rotas individuais
const cache = new Map<string, { data: RoutesResponse; timestamp: number }>();
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24 horas

// Rate limiting simples (60 req/min por IP)
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW = 60 * 1000; // 1 minuto
const RATE_LIMIT_MAX = 60;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const requests = rateLimitMap.get(ip) || [];
  
  // Limpar requisições antigas
  const recentRequests = requests.filter(timestamp => now - timestamp < RATE_LIMIT_WINDOW);
  
  if (recentRequests.length >= RATE_LIMIT_MAX) {
    return false;
  }
  
  recentRequests.push(now);
  rateLimitMap.set(ip, recentRequests);
  return true;
}

// Função para traduzir tipos de manobra para português
function traduzirManobra(tipo: string): string {
  const traducoes: Record<string, string> = {
    'straight': 'Siga em frente',
    'turn-left': 'Vire à esquerda',
    'turn-right': 'Vire à direita',
    'turn-slight-left': 'Vire levemente à esquerda',
    'turn-slight-right': 'Vire levemente à direita',
    'turn-sharp-left': 'Faça curva acentuada à esquerda',
    'turn-sharp-right': 'Faça curva acentuada à direita',
    'uturn-left': 'Faça retorno à esquerda',
    'uturn-right': 'Faça retorno à direita',
    'merge': 'Entre na via',
    'roundabout-left': 'Entre na rotatória e saia à esquerda',
    'roundabout-right': 'Entre na rotatória e saia à direita',
    'exit': 'Pegue a saída',
    'ramp-left': 'Entre na rampa à esquerda',
    'ramp-right': 'Entre na rampa à direita',
    'fork-left': 'Mantenha-se à esquerda na bifurcação',
    'fork-right': 'Mantenha-se à direita na bifurcação',
    'ferry': 'Pegue a balsa',
    'ferry-train': 'Pegue o trem',
    'depart': 'Inicie o percurso',
    'arrive': 'Chegue ao destino'
  };
  
  return traducoes[tipo] || tipo;
}

// Função para decodificar polyline (formato Google)
function decodePolyline(encoded: string): [number, number][] {
  const coordinates: [number, number][] = [];
  let index = 0;
  let lat = 0;
  let lng = 0;

  while (index < encoded.length) {
    let shift = 0;
    let result = 0;
    let byte;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLat = result & 1 ? ~(result >> 1) : result >> 1;
    lat += deltaLat;

    shift = 0;
    result = 0;

    do {
      byte = encoded.charCodeAt(index++) - 63;
      result |= (byte & 0x1f) << shift;
      shift += 5;
    } while (byte >= 0x20);

    const deltaLng = result & 1 ? ~(result >> 1) : result >> 1;
    lng += deltaLng;

    coordinates.push([lng / 1e5, lat / 1e5] as [number, number]); // [lng, lat]
  }

  return coordinates;
}

export async function POST(request: NextRequest) {
  try {
    // Rate limiting
    const ip = request.headers.get('x-forwarded-for') ||
               request.headers.get('x-real-ip') ||
               'unknown';

    console.log('🛣️ [Google Routes] === NOVA REQUISIÇÃO DE ROTA ===');
    console.log('🛣️ [Google Routes] IP do cliente:', ip);

    if (!checkRateLimit(ip)) {
      console.log('🚫 [Google Routes] Rate limit excedido para IP:', ip);
      return NextResponse.json(
        { success: false, error: 'Limite de requisições excedido. Tente novamente em 1 minuto.' },
        { status: 429 }
      );
    }

    const body: RoutesRequest = await request.json();
    console.log('🛣️ [Google Routes] Body recebido:', {
      origem: body.origem ? (body.origem.nome ? `${body.origem.nome} (${body.origem.uf})` : `${body.origem.lat},${body.origem.lng}`) : 'UNDEFINED',
      destino: body.destino ? (body.destino.nome ? `${body.destino.nome} (${body.destino.uf})` : `${body.destino.lat},${body.destino.lng}`) : 'UNDEFINED',
      travelMode: body.travelMode || 'DRIVE',
      waypoints: body.waypoints ? body.waypoints.length : 0
    });

    // Validações
    if (!body.origem || !body.destino) {
      return NextResponse.json(
        { success: false, error: 'Origem e destino são obrigatórios' },
        { status: 400 }
      );
    }

    // API Key
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    console.log('🔑 [Google Routes] Verificando API Key...');
    console.log('🔑 [Google Routes] Usando variável: GOOGLE_MAPS_API_KEY');
    console.log('🔑 [Google Routes] API Key presente:', !!apiKey);
    console.log('🔑 [Google Routes] Comprimento da chave:', apiKey ? apiKey.length : 0);
    console.log('🔑 [Google Routes] NODE_ENV:', process.env.NODE_ENV);

    if (!apiKey) {
      console.log('❌ [Google Routes] API Key não configurada no ambiente');
      return NextResponse.json(
        { success: false, error: 'API Key não configurada' },
        { status: 500 }
      );
    }

    // Converter localizações para coordenadas (geocoding se necessário)
    console.log('🗺️ [Google Routes] Convertendo localizações para coordenadas...');
    let coordenadasOrigem: Coordenada;
    let coordenadasDestino: Coordenada;

    try {
      coordenadasOrigem = await geocodeLocalizacao(body.origem);
      coordenadasDestino = await geocodeLocalizacao(body.destino);
      console.log('✅ [Google Routes] Coordenadas obtidas:', {
        origem: `${coordenadasOrigem.lat}, ${coordenadasOrigem.lng}`,
        destino: `${coordenadasDestino.lat}, ${coordenadasDestino.lng}`
      });
    } catch (error) {
      console.error('❌ [Google Routes] Erro no geocoding:', error);
      return NextResponse.json(
        { success: false, error: error instanceof Error ? error.message : 'Erro no geocoding' },
        { status: 400 }
      );
    }

    // Gerar chave de cache
    const cacheKey = `${coordenadasOrigem.lat},${coordenadasOrigem.lng}-${coordenadasDestino.lat},${coordenadasDestino.lng}-${body.travelMode || 'DRIVE'}`;
    const cached = cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('🎯 [Google Routes] Cache HIT para rota');
      return NextResponse.json(cached.data);
    }

    // Preparar requisição
    const routesRequestBody: any = {
      origin: {
        location: {
          latLng: {
            latitude: coordenadasOrigem.lat,
            longitude: coordenadasOrigem.lng
          }
        }
      },
      destination: {
        location: {
          latLng: {
            latitude: coordenadasDestino.lat,
            longitude: coordenadasDestino.lng
          }
        }
      },
      travelMode: body.travelMode || 'DRIVE',
      routingPreference: 'TRAFFIC_AWARE',
      languageCode: 'pt-BR',
      units: 'METRIC'
    };

    // Adicionar waypoints se fornecidos
    if (body.waypoints && body.waypoints.length > 0) {
      routesRequestBody.intermediates = body.waypoints.map(wp => ({
        location: {
          latLng: {
            latitude: wp.lat,
            longitude: wp.lng
          }
        }
      }));
    }

    // Verificar controle de custos e fazer requisição
    console.log('🌐 [Google Routes] Fazendo requisição para Google Routes API...');
    console.log('🌐 [Google Routes] URL:', `https://routes.googleapis.com/directions/v2:computeRoutes?key=API_KEY_HIDED`);
    console.log('🌐 [Google Routes] Headers:', {
      'Content-Type': 'application/json',
      'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,...'
    });
    console.log('🌐 [Google Routes] Request Body:', JSON.stringify(routesRequestBody, null, 2));

    const startTime = Date.now();

    // Usar API Guard para controlar custos
    const response = await withApiGuard('routes', async () => {
      return await fetch(
        `https://routes.googleapis.com/directions/v2:computeRoutes?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.legs.steps.distanceMeters,routes.legs.steps.staticDuration,routes.legs.steps.polyline.encodedPolyline,routes.legs.steps.navigationInstruction'
          },
          body: JSON.stringify(routesRequestBody),
          signal: AbortSignal.timeout(15000) // Timeout de 15s
        }
      );
    });

    const responseTime = Date.now() - startTime;
    console.log('🌐 [Google Routes] Status HTTP:', response.status);
    console.log('🌐 [Google Routes] Tempo de resposta:', responseTime + 'ms');

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Google Routes] Erro:', response.status, errorText);
      return NextResponse.json(
        { success: false, error: 'Erro ao calcular rota' },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log('🌐 [Google Routes] Resposta recebida da API:');
    console.log('🌐 [Google Routes] Status da resposta:', data.status || 'OK');
    console.log('🌐 [Google Routes] Número de rotas encontradas:', data.routes?.length || 0);
    console.log('🌐 [Google Routes] Primeira rota - distanceMeters:', data.routes?.[0]?.distanceMeters);
    console.log('🌐 [Google Routes] Primeira rota - duration:', data.routes?.[0]?.duration);

    if (!data.routes || data.routes.length === 0) {
      console.log('❌ [Google Routes] Nenhuma rota encontrada na resposta');
      return NextResponse.json(
        { success: false, error: 'Nenhuma rota encontrada' },
        { status: 404 }
      );
    }

    const route = data.routes[0];

    // Extrair dados principais
    const distanciaKm = (route.distanceMeters || 0) / 1000;
    const durationSeconds = parseInt(route.duration?.replace('s', '') || '0', 10);
    const tempoMinutos = Math.round(durationSeconds / 60);

    console.log('📏 [Google Routes] Dados extraídos:');
    console.log('📏 [Google Routes] Distância:', distanciaKm.toFixed(2) + ' km');
    console.log('📏 [Google Routes] Tempo:', tempoMinutos + ' minutos');

    // Decodificar geometria
    const geometria: [number, number][] = route.polyline?.encodedPolyline 
      ? decodePolyline(route.polyline.encodedPolyline)
      : [[body.origem.lng, body.origem.lat] as [number, number], [body.destino.lng, body.destino.lat] as [number, number]];

    // Processar instruções
    const instrucoes: InstrucaoRota[] = [];
    
    if (route.legs && route.legs.length > 0) {
      for (const leg of route.legs) {
        if (leg.steps) {
          for (const step of leg.steps) {
            const stepDuration = parseInt(step.staticDuration?.replace('s', '') || '0', 10);
            const stepDistance = (step.distanceMeters || 0) / 1000;
            
            // Extrair coordenada do início do step
            const stepPolyline = step.polyline?.encodedPolyline;
            const stepCoords = stepPolyline ? decodePolyline(stepPolyline) : [];
            const coordenada: Coordenada = stepCoords.length > 0
              ? { lat: stepCoords[0][1], lng: stepCoords[0][0] }
              : coordenadasOrigem;

            // Extrair instrução
            const navInstruction = step.navigationInstruction;
            const tipo = navInstruction?.maneuver || 'straight';
            const descricao = navInstruction?.instructions || traduzirManobra(tipo);

            instrucoes.push({
              tipo,
              descricao,
              distanciaKm: parseFloat(stepDistance.toFixed(2)),
              tempoMinutos: Math.round(stepDuration / 60),
              coordenada
            });
          }
        }
      }
    }

    const result: RoutesResponse = {
      success: true,
      distanciaKm: parseFloat(distanciaKm.toFixed(2)),
      tempoMinutos,
      geometria,
      instrucoes,
      metadados: {
        origem: coordenadasOrigem,
        destino: coordenadasDestino,
        travelMode: body.travelMode || 'DRIVE'
      }
    };

    // Armazenar em cache
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    console.log('✅ [Google Routes] Rota calculada:', {
      distanciaKm: result.distanciaKm,
      tempoMinutos: result.tempoMinutos,
      instrucoes: result.instrucoes.length
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ [Google Routes] Erro:', error);

    // Verificar se é erro do API Guard
    if (error instanceof Error &&
        (error.message === 'GOOGLE_MAPS_API_DISABLED' ||
         error.message === 'GOOGLE_MAPS_API_LIMIT_EXCEEDED')) {

      const apiError = createApiErrorResponse(error);
      return NextResponse.json(apiError.body, { status: apiError.status });
    }

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Erro interno'
      },
      { status: 500 }
    );
  }
}

// Função para geocoding (converter nome + UF em coordenadas)
async function geocodeLocalizacao(localizacao: Localizacao): Promise<Coordenada> {
  // Se já tem coordenadas, retorna diretamente
  if (localizacao.lat !== undefined && localizacao.lng !== undefined) {
    return { lat: localizacao.lat, lng: localizacao.lng };
  }

  // Se tem nome e UF, faz geocoding
  if (localizacao.nome && localizacao.uf) {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    if (!apiKey) {
      throw new Error('API Key não configurada para geocoding');
    }

    const endereco = `${localizacao.nome}, ${localizacao.uf}, Brasil`;
    const geocodeUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(endereco)}&key=${apiKey}&region=BR&language=pt-BR`;

    console.log('🗺️ [Geocoding] Fazendo geocoding para:', endereco);
    console.log('🔑 [Geocoding] API Key presente:', !!apiKey);
    console.log('🔑 [Geocoding] Comprimento da chave:', apiKey.length);
    console.log('🔑 [Geocoding] Primeiros 10 caracteres:', apiKey.substring(0, 10) + '...');
    console.log('🔑 [Geocoding] Últimos 10 caracteres:', '...' + apiKey.substring(apiKey.length - 10));
    console.log('🔑 [Geocoding] Contém apenas caracteres válidos:', /^[A-Za-z0-9_-]+$/.test(apiKey));
    console.log('🔑 [Geocoding] URL (sem chave):', geocodeUrl.replace(apiKey, 'API_KEY_HIDED'));

    const response = await withApiGuard('geocode', async () => {
      return await fetch(geocodeUrl);
    });
    console.log('🌐 [Geocoding] Status HTTP da resposta:', response.status);
    console.log('🌐 [Geocoding] Headers da resposta:', Object.fromEntries(response.headers.entries()));

    const data = await response.json();
    console.log('📊 [Geocoding] Resposta completa da API:', JSON.stringify(data, null, 2));

    if (data.status === 'OK' && data.results && data.results.length > 0) {
      const location = data.results[0].geometry.location;
      console.log('✅ [Geocoding] Coordenadas encontradas:', location);
      return { lat: location.lat, lng: location.lng };
    } else {
      console.log('❌ [Geocoding] Falha no geocoding:', data.status, data.error_message);
      console.log('❌ [Geocoding] Detalhes do erro:', JSON.stringify(data, null, 2));
      throw new Error(`Não foi possível encontrar coordenadas para: ${endereco}`);
    }
  }

  throw new Error('Localização inválida: deve ter coordenadas OU nome + UF');
}

// Health check
export async function GET() {
  const apiKey = process.env.GOOGLE_MAPS_API_KEY;

  // Teste direto da API key com curl-like request
  let apiTestResult = null;
  if (apiKey) {
    try {
      const testUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=Jo%C3%A3o%20Pessoa%2C%20PB%2C%20Brasil&key=${apiKey}&region=BR&language=pt-BR`;
      const testResponse = await fetch(testUrl);
      const testData = await testResponse.json();
      apiTestResult = {
        status: testResponse.status,
        apiStatus: testData.status,
        errorMessage: testData.error_message,
        hasResults: testData.results && testData.results.length > 0
      };
    } catch (error) {
      apiTestResult = { error: error instanceof Error ? error.message : 'Erro desconhecido' };
    }
  }

  return NextResponse.json({
    status: 'ok',
    service: 'Google Routes Directions',
    apiConfigured: !!apiKey,
    apiKeyLength: apiKey ? apiKey.length : 0,
    apiKeyValidChars: apiKey ? /^[A-Za-z0-9_-]+$/.test(apiKey) : false,
    apiTestResult,
    cacheSize: cache.size,
    timestamp: new Date().toISOString()
  });
}

