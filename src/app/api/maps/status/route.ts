import { NextResponse } from 'next/server';
import { getApiStatus } from '@/utils/mapsApiGuard';

/**
 * GET /api/maps/status
 * Retorna o status atual do controle de custos da Google Maps API
 */
export async function GET() {
  try {
    const status = getApiStatus();

    return NextResponse.json({
      success: true,
      status: {
        disabled: status.disabled,
        limits: status.limits,
        counters: status.counters,
        remaining: status.remaining,
        canMakeRequests: {
          routes: status.remaining.routes > 0 && !status.disabled,
          geocode: status.remaining.geocode > 0 && !status.disabled
        }
      }
    });

  } catch (error) {
    console.error('❌ [Maps Status] Erro ao obter status:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Erro interno ao obter status da API'
      },
      { status: 500 }
    );
  }
}
