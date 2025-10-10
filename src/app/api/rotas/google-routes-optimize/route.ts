import { NextRequest, NextResponse } from 'next/server';
import { withApiGuard, createApiErrorResponse } from '@/utils/mapsApiGuard';

// Interface para coordenadas
interface Coordenada {
  lat: number;
  lng: number;
}

// Interface para waypoints com informações do município
interface WaypointInfo {
  coordenadas: Coordenada;
  codigo: string;
  nome: string;
  uf: string;
  tipo: 'polo' | 'periferia';
}

// Interface para requisição
interface OptimizationRequest {
  start: WaypointInfo;
  end?: WaypointInfo; // Opcional para rotas fechadas
  waypoints: WaypointInfo[];
  mode: 'open' | 'closed'; // Aberto (não volta) ou Fechado (volta ao início)
  travelMode?: 'DRIVE' | 'WALK' | 'BICYCLE' | 'TWO_WHEELER';
  routingPreference?: 'TRAFFIC_AWARE' | 'TRAFFIC_AWARE_OPTIMAL';
}

// Interface para resposta
interface OptimizationResponse {
  success: boolean;
  order: number[]; // Índices otimizados
  totalDistanceKm: number;
  totalDurationMin: number;
  routes?: any; // Dados completos da rota (opcional)
  error?: string;
}

// Cache em memória (simples, pode migrar para Redis)
const cache = new Map<string, { data: OptimizationResponse; timestamp: number }>();
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000; // 7 dias

// Função auxiliar para gerar chave de cache
function generateCacheKey(req: OptimizationRequest): string {
  const startKey = `${req.start.codigo}`;
  const endKey = req.end ? `${req.end.codigo}` : 'none';
  const waypointsKey = req.waypoints.map(w => w.codigo).sort().join(',');
  return `${req.mode}:${startKey}:${endKey}:${waypointsKey}`;
}

// Função auxiliar para limpar cache expirado
function cleanExpiredCache() {
  const now = Date.now();
  for (const [key, value] of cache.entries()) {
    if (now - value.timestamp > CACHE_TTL) {
      cache.delete(key);
    }
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: OptimizationRequest = await request.json();

    // Validações
    if (!body.start || !body.waypoints || body.waypoints.length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Parâmetros inválidos: start e waypoints são obrigatórios' 
        },
        { status: 400 }
      );
    }

    if (body.waypoints.length > 25) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Máximo de 25 waypoints permitidos pela Google Routes API' 
        },
        { status: 400 }
      );
    }

    // Verificar cache
    const cacheKey = generateCacheKey(body);
    const cached = cache.get(cacheKey);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
      console.log('🎯 [Google Routes] Cache HIT:', cacheKey);
      return NextResponse.json(cached.data);
    }

    // Preparar requisição para Google Routes API
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    console.log('🔑 [Google Routes Optimize] Verificando API Key...');
    console.log('🔑 [Google Routes Optimize] Usando variável: GOOGLE_MAPS_API_KEY');
    console.log('🔑 [Google Routes Optimize] API Key presente:', !!apiKey);
    console.log('🔑 [Google Routes Optimize] Comprimento da chave:', apiKey ? apiKey.length : 0);
    console.log('🔑 [Google Routes Optimize] NODE_ENV:', process.env.NODE_ENV);

    if (!apiKey) {
      console.error('❌ [Google Routes Optimize] API Key não configurada');
      return NextResponse.json(
        {
          success: false,
          error: 'Chave da API Google Routes não configurada'
        },
        { status: 500 }
      );
    }

    // Determinar origem e destino baseado no modo
    const origin = {
      location: {
        latLng: {
          latitude: body.start.coordenadas.lat,
          longitude: body.start.coordenadas.lng
        }
      }
    };

    const destination = body.mode === 'closed' 
      ? origin // Rota fechada: volta ao ponto de partida
      : body.end 
        ? {
            location: {
              latLng: {
                latitude: body.end.coordenadas.lat,
                longitude: body.end.coordenadas.lng
              }
            }
          }
        : origin; // Fallback para fechado se não tiver destino

    // Preparar intermediários
    const intermediates = body.waypoints.map(wp => ({
      location: {
        latLng: {
          latitude: wp.coordenadas.lat,
          longitude: wp.coordenadas.lng
        }
      }
    }));

    // Corpo da requisição para Google Routes API
    const routesRequestBody = {
      origin,
      destination,
      intermediates,
      travelMode: body.travelMode || 'DRIVE',
      routingPreference: body.routingPreference || 'TRAFFIC_AWARE',
      optimizeWaypointOrder: true, // 🔥 Mágica da otimização
      languageCode: 'pt-BR',
      units: 'METRIC'
    };

    console.log('📡 [Google Routes] Chamando API com', {
      waypoints: body.waypoints.length,
      mode: body.mode,
      travelMode: body.travelMode || 'DRIVE'
    });

    // Fazer requisição à API Google Routes com controle de custos
    const response = await withApiGuard('routes', async () => {
      return await fetch(
        `https://routes.googleapis.com/directions/v2:computeRoutes?key=${apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Field mask - especifica exatamente o que queremos receber
            'X-Goog-FieldMask': 'routes.distanceMeters,routes.duration,routes.optimizedIntermediateWaypointIndex,routes.legs.distanceMeters,routes.legs.duration,routes.polyline.encodedPolyline'
          },
          body: JSON.stringify(routesRequestBody)
        }
      );
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ [Google Routes] Erro na API:', response.status, errorText);
      
      // Tratamento de erros específicos
      if (response.status === 400) {
        return NextResponse.json(
          { success: false, error: 'Requisição inválida para Google Routes API' },
          { status: 400 }
        );
      } else if (response.status === 403) {
        return NextResponse.json(
          { success: false, error: 'Permissão negada - verifique API Key e billing' },
          { status: 403 }
        );
      } else if (response.status === 429) {
        return NextResponse.json(
          { success: false, error: 'Limite de requisições excedido' },
          { status: 429 }
        );
      }

      return NextResponse.json(
        { success: false, error: 'Erro ao calcular rota otimizada' },
        { status: 500 }
      );
    }

    const data = await response.json();

    // Processar resposta
    if (!data.routes || data.routes.length === 0) {
      console.warn('⚠️ [Google Routes] Nenhuma rota encontrada');
      return NextResponse.json(
        { success: false, error: 'Nenhuma rota encontrada para os waypoints fornecidos' },
        { status: 404 }
      );
    }

    const route = data.routes[0];
    
    // Extrair ordem otimizada (índices dos waypoints)
    const optimizedOrder = route.optimizedIntermediateWaypointIndex || [];
    
    // Distância total em km
    const totalDistanceKm = (route.distanceMeters || 0) / 1000;
    
    // Duração total em minutos
    const durationSeconds = parseInt(route.duration?.replace('s', '') || '0', 10);
    const totalDurationMin = Math.round(durationSeconds / 60);

    const result: OptimizationResponse = {
      success: true,
      order: optimizedOrder,
      totalDistanceKm: parseFloat(totalDistanceKm.toFixed(2)),
      totalDurationMin,
      routes: data.routes // Incluir dados completos para uso posterior
    };

    // Armazenar em cache
    cache.set(cacheKey, {
      data: result,
      timestamp: Date.now()
    });

    // Limpar cache expirado periodicamente
    if (Math.random() < 0.1) { // 10% de chance
      cleanExpiredCache();
    }

    console.log('✅ [Google Routes] Rota otimizada calculada:', {
      waypoints: body.waypoints.length,
      optimizedOrder,
      totalDistanceKm: result.totalDistanceKm,
      totalDurationMin: result.totalDurationMin,
      cached: false
    });

    return NextResponse.json(result);

  } catch (error) {
    console.error('❌ [Google Routes] Erro interno:', error);

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
        error: error instanceof Error ? error.message : 'Erro interno do servidor'
      },
      { status: 500 }
    );
  }
}

// Health check
export async function GET() {
  const apiKey = process.env.GOOGLE_ROUTES_API_KEY;
  
  return NextResponse.json({
    status: 'ok',
    service: 'Google Routes Optimization',
    apiConfigured: !!apiKey,
    cacheSize: cache.size,
    timestamp: new Date().toISOString()
  });
}

