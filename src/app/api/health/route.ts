/**
 * =============================================================================
 * HEALTH CHECK ENDPOINT - NEXUS Platform
 * =============================================================================
 * Endpoint para verificação de saúde da aplicação
 * Usado pelo Docker health check e monitoramento
 * =============================================================================
 */

import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Verificar se a aplicação está rodando
    const startTime = Date.now();
    
    // Status básico da aplicação
    const health = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || 'unknown',
      environment: process.env.NODE_ENV || 'development',
      services: {
        database: 'checking...',
        redis: 'checking...'
      }
    };

    // Verificar conexão com banco de dados (opcional)
    try {
      const { PrismaClient } = await import('@/generated/prisma');
      const prisma = new PrismaClient();
      
      await prisma.$queryRaw`SELECT 1`;
      health.services.database = 'healthy';
      
      await prisma.$disconnect();
    } catch (dbError) {
      console.warn('Database health check failed:', dbError);
      health.services.database = 'unhealthy';
    }

    // Calcular tempo de resposta
    const responseTime = Date.now() - startTime;
    
    return NextResponse.json({
      ...health,
      responseTime: `${responseTime}ms`
    }, {
      status: 200,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Health check error:', error);
    
    return NextResponse.json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error'
    }, {
      status: 500
    });
  }
}