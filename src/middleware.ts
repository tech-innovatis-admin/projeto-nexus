import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Redireciona solicitações para /data/ para nossa API de proxy
  if (pathname.startsWith('/data/')) {
    const fileName = pathname.replace('/data/', '');
    const url = new URL(`/api/proxy-geojson/${fileName}`, request.url);
    console.log(`Redirecionando ${pathname} para ${url.pathname}`);
    return NextResponse.rewrite(url);
  }

  // Verifica se é uma rota protegida (/mapa, /estrategia ou /rotas)
  if (pathname.startsWith('/mapa') || pathname.startsWith('/estrategia') || pathname.startsWith('/rotas') || pathname.startsWith('/perfil')) {
    const token = request.cookies.get('auth_token')?.value;
    
    // Se não houver token, redireciona para o login
    if (!token) {
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    try {
      // Verifica se o token é válido fazendo uma chamada para a API
      const baseUrl = request.nextUrl.origin;
      const verifyResponse = await fetch(`${baseUrl}/api/auth/verify`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': `auth_token=${token}`
        }
      });
      const verifyData = await verifyResponse.json();

      if (!verifyResponse.ok || !verifyData.success) {
        // Se o token for inválido, redireciona para o login e limpa o cookie
        const response = NextResponse.redirect(new URL('/login', request.url));
        response.cookies.delete('auth_token');
        return response;
      }

      // Regras adicionais: bloquear viewers restritos em /estrategia e /rotas
      const restrictedPaths = ['/estrategia', '/rotas'];
      const isRestrictedPage = restrictedPaths.some((path) => pathname.startsWith(path));
      const role: string = String(verifyData?.user?.role || '').toLowerCase();

      if (role === 'viewer' && isRestrictedPage) {
        try {
          // Consulta rápida ao backend para saber se o viewer é restrito (possui registros em municipio_acessos)
          const acessosResp = await fetch(new URL('/api/municipios/acessos', request.url), {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (acessosResp.ok) {
            const acessosData = await acessosResp.json();
            // Critério: viewer é "restrito" se possuir qualquer registro na tabela municipio_acessos
            const totalAcessos = typeof acessosData?.totalAcessos === 'number' ? acessosData.totalAcessos : 0;
            if (totalAcessos > 0) {
              return NextResponse.redirect(new URL('/acesso-negado', request.url));
            }
          }
          // Se a API falhar, mantemos o fluxo normal (não bloqueia) para evitar falso-positivo
        } catch {
          // Silencia e segue o fluxo normal
        }
      }
    } catch (error) {
      // Em caso de erro na verificação, redireciona para o login e limpa o cookie
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('auth_token');
      return response;
    }
  }

  // Verifica se está tentando acessar o login com um token válido
  if (pathname === '/login') {
    const token = request.cookies.get('auth_token')?.value;
    if (token) {
      try {
        const baseUrl = request.nextUrl.origin;
        const verifyResponse = await fetch(`${baseUrl}/api/auth/verify`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Cookie': `auth_token=${token}`
          }
        });

        if (verifyResponse.ok) {
          // Se já estiver autenticado, redireciona para o /mapa
          const mapaUrl = new URL('/mapa', request.url);
          return NextResponse.redirect(mapaUrl);
        }
      } catch (error) {
        // Em caso de erro, permite continuar para a página de login
      }
    }
  }
  
  return NextResponse.next();
}

// Especifica os caminhos que o middleware deve ser executado
export const config = {
  matcher: ['/mapa/:path*', '/estrategia/:path*', '/rotas/:path*', '/login', '/data/:path*', '/perfil/:path*']
}; 