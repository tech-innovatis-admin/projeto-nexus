import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Redireciona solicitações para /data/ para nossa API de proxy
  if (pathname.startsWith('/data/')) {
    const fileName = pathname.replace('/data/', '');
    const url = new URL(`/api/proxy-geojson/${fileName}`, request.url);
    console.log(`Redirecionando ${pathname} para ${url.pathname}`);
    return NextResponse.rewrite(url);
  }
  
  return NextResponse.next();
}

// Especifica os caminhos que o middleware deve ser executado
export const config = {
  matcher: ['/data/:path*']
}; 