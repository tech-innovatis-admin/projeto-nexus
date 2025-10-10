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
    console.log('🔑 [Health Check] === VERIFICAÇÃO DA CHAVE API GOOGLE MAPS ===');
    console.log('🔑 [Health Check] Usando variável: GOOGLE_MAPS_API_KEY');
    console.log('🔑 [Health Check] API Key presente:', !!apiKey);
    console.log('🔑 [Health Check] Comprimento da chave:', apiKey ? apiKey.length : 0);
    console.log('🔑 [Health Check] Primeiros 10 caracteres:', apiKey ? apiKey.substring(0, 10) + '...' : 'UNDEFINED');
    console.log('🔑 [Health Check] Últimos 10 caracteres:', apiKey ? '...' + apiKey.substring(apiKey.length - 10) : 'UNDEFINED');
    console.log('🔑 [Health Check] Contém apenas letras/números:', apiKey ? /^[A-Za-z0-9]+$/.test(apiKey) : false);
    console.log('🔑 [Health Check] NODE_ENV:', process.env.NODE_ENV);
    
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
    if (!apiKey) {
      result.status = 'error';
      result.services.googleMaps = {
        available: false,
        status: 'API Key não configurada',
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

      console.log('🌐 [Health Check] Fazendo requisição para Google Maps API...');
      console.log('🌐 [Health Check] URL de teste:', testUrl.replace(apiKey, 'API_KEY_HIDED'));

      const response = await fetch(testUrl, {
        signal: controller.signal,
        headers: {
          'Accept': 'application/json'
        }
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      console.log('🌐 [Health Check] Status HTTP:', response.status);
      console.log('🌐 [Health Check] Tempo de resposta:', responseTime + 'ms');

      if (response.ok) {
        const data = await response.json();
        console.log('🌐 [Health Check] Resposta da API Google Maps:');
        console.log('🌐 [Health Check] Status:', data.status);
        console.log('🌐 [Health Check] Error Message:', data.error_message || 'Nenhuma');

        result.services.googleMaps = {
          available: data.status === 'OK',
          status: data.status,
          responseTime
        };

        if (data.status === 'OK') {
          result.status = 'ok';
          console.log('✅ [Health Check] API Google Maps funcionando corretamente!');
        } else if (data.status === 'OVER_QUERY_LIMIT') {
          result.status = 'warning';
          console.log('⚠️ [Health Check] Limite de requisições excedido');
        } else {
          result.status = 'error';
          console.log('❌ [Health Check] Erro na API:', data.status);
        }
      } else {
        result.status = 'error';
        result.services.googleMaps = {
          available: false,
          status: `HTTP ${response.status}`,
          responseTime
        };
        console.log('❌ [Health Check] Erro HTTP:', response.status);
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

