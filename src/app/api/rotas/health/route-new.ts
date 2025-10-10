import { NextResponse } from 'next/server';

/**
 * Health check do sistema de rotas
 * Endpoint: /api/rotas/health
 * Método: GET
 * 
 * Verifica:
 * - Status da API Google Maps
 * - Conectividade da internet
 * - Teste de rota simples
 */
export async function GET() {
  try {
    const apiKey = process.env.GOOGLE_MAPS_API_KEY;
    
    const result = {
      status: 'ok' as 'ok' | 'warning' | 'error',
      timestamp: new Date().toISOString(),
      services: {
        googleMaps: {
          available: false,
          status: 'unknown' as string,
          responseTime: 0
        },
        cache: {
          available: true,
          size: 0
        }
      },
      environment: {
        hasApiKey: !!apiKey,
        nodeEnv: process.env.NODE_ENV
      }
    };

    // Verificar se a API Key está configurada
    if (!apiKey || apiKey === 'GOOGLE_MAPS_API_KEY') {
      result.status = 'error';
      result.services.googleMaps = {
        available: false,
        status: 'API Key não configurada ou inválida',
        responseTime: 0
      };

      return NextResponse.json(result, { status: 503 });
    }

    // Teste de conectividade com Google Maps
    // Rota simples: São Paulo → Rio de Janeiro
    const testUrl = `https://maps.googleapis.com/maps/api/directions/json?` +
      `origin=-23.550520,-46.633308&` +
      `destination=-22.906847,-43.172896&` +
      `mode=driving&key=${apiKey}`;

    const startTime = Date.now();
    
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(testUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      if (response.ok) {
        const data = await response.json();
        
        result.services.googleMaps = {
          available: data.status === 'OK',
          status: data.status,
          responseTime
        };

        if (data.status === 'OK') {
          result.status = 'ok';
        } else if (data.status === 'OVER_QUERY_LIMIT') {
          result.status = 'warning';
        } else {
          result.status = 'error';
        }
      } else {
        result.status = 'error';
        result.services.googleMaps = {
          available: false,
          status: `HTTP ${response.status}`,
          responseTime
        };
      }
    } catch (error: any) {
      result.status = 'error';
      result.services.googleMaps = {
        available: false,
        status: error.name === 'AbortError' ? 'Timeout' : error.message,
        responseTime: Date.now() - startTime
      };
    }

    // Status HTTP baseado no resultado
    const httpStatus = result.status === 'ok' ? 200 : 
                      result.status === 'warning' ? 200 : 503;

    return NextResponse.json(result, { status: httpStatus });

  } catch (error: any) {
    console.error('🗺️ [Health Check] Erro interno:', error);

    return NextResponse.json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Erro interno no health check',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined
    }, { status: 500 });
  }
}