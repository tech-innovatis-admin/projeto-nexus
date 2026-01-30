import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

// Chave secreta convertida para o formato esperado pelo jose (Uint8Array)
// Usamos o segredo do ambiente ou o fallback padrão
const secret = new TextEncoder().encode(
  process.env.JWT_SECRET || 'nexus_jwt_secret_2025_production'
);

/**
 * MIDDLEWARE DA PLATAFORMA NEXUS
 * ----------------------------
 * Gerencia redirecionamentos, proxy de GeoJSON e proteção de rotas.
 */
export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Redireciona solicitações para /data/ para nossa API de proxy (S3)
  if (pathname.startsWith('/data/')) {
    const fileName = pathname.replace('/data/', '');
    const url = new URL(`/api/proxy-geojson/${fileName}`, request.url);
    return NextResponse.rewrite(url);
  }

  // 2. Definição de rotas protegidas
  const protectedPaths = ['/mapa', '/estrategia', '/rotas', '/perfil'];
  const isProtectedPath = protectedPaths.some(path => pathname.startsWith(path));

  if (isProtectedPath) {
    const token = request.cookies.get('auth_token')?.value;

    if (!token) {
      console.warn(`[Middleware] Redirecionando para login: Token ausente em ${pathname}`);
      const loginUrl = new URL('/login', request.url);
      return NextResponse.redirect(loginUrl);
    }

    try {
      /**
       * 🔐 VERIFICAÇÃO DIRETA (Node/Edge Runtime)
       * Substituído fetch interno por verificação local via 'jose'.
       * Motivo: Container em produção muitas vezes não consegue resolver sua própria URL pública (Hairpin NAT).
       */
      const { payload } = await jwtVerify(token, secret);

      if (!payload) throw new Error('Payload vazio');

      // 3. Verificação de permissão para Viewers Restritos (apenas em Estratégia e Rotas)
      const restrictedPaths = ['/estrategia', '/rotas'];
      const isRestrictedPage = restrictedPaths.some((path) => pathname.startsWith(path));
      const role = String(payload.role || '').toLowerCase();

      if (role === 'viewer' && isRestrictedPage) {
        // Se for um viewer acessando página restrita, validamos a lista de permissões
        // Nota: Esta chamada interna para 127.0.0.1 é opcionalmente mantida se localhost estiver resolvendo.
        try {
          // Fallback: Se a verificação de acessos falhar, bloqueamos por segurança ou permitimos?
          // Aqui optamos por consultar a API que já validamos antes.
          const verifyAcessosUrl = new URL('/api/municipios/acessos', request.url);
          const acessosResp = await fetch(verifyAcessosUrl, {
            headers: { 'Authorization': `Bearer ${token}` }
          });

          if (acessosResp.ok) {
            const acessosData = await acessosResp.json();
            if (acessosData?.totalAcessos > 0) {
              return NextResponse.redirect(new URL('/acesso-negado', request.url));
            }
          }
        } catch (e) {
          console.error('[Middleware] Erro ao verificar acessos:', e);
        }
      }

    } catch (error) {
      console.error(`[Middleware] Token inválido para ${pathname}:`, error instanceof Error ? error.message : 'Erro');
      const response = NextResponse.redirect(new URL('/login', request.url));
      // Limpa o cookie em caso de erro
      response.cookies.set('auth_token', '', { path: '/', maxAge: 0, sameSite: 'lax' });
      return response;
    }
  }

  // 4. Se o usuário já estiver logado (token válido) e tentar acessar /login, manda para o mapa
  if (pathname === '/login') {
    const token = request.cookies.get('auth_token')?.value;
    if (token) {
      try {
        await jwtVerify(token, secret);
        return NextResponse.redirect(new URL('/mapa', request.url));
      } catch {
        // Token inválido, ignora e deixa renderizar o login para novo acesso
      }
    }
  }

  return NextResponse.next();
}

/**
 * Configuração de monitoramento do Middleware
 */
export const config = {
  matcher: [
    '/mapa/:path*',
    '/estrategia/:path*',
    '/rotas/:path*',
    '/login',
    '/data/:path*',
    '/perfil/:path*'
  ]
};