import { verify } from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    // Validar JWT_SECRET obrigatório
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET não está configurado');
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Erro de configuração do servidor' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    let token = request.headers.get('Authorization')?.replace('Bearer ', '');
    if (!token) {
      const cookieStore = await cookies();
      token = cookieStore.get('auth_token')?.value || '';
    }

    if (!token) {
      return new Response(JSON.stringify({ 
        success: false, 
        error: 'Token não encontrado' 
      }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Verifica o token
    const decoded = verify(
      token,
      process.env.JWT_SECRET
    ) as any;

    // Garante que o token também contenha acesso a "nexus" (defesa adicional)
    const platforms: string[] = Array.isArray(decoded?.platforms) ? decoded.platforms : [];
    const hasNexus = platforms.some((p) => String(p).toLowerCase() === 'nexus');
    if (!hasNexus) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Sem acesso à plataforma nexus'
      }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Busca dados atualizados do usuário no banco
    try {
      // Converter ID do token (string) para Number/BigInt conforme necessário
      // O token pode ter o ID como string (se foi BigInt) ou number
      const userId = typeof decoded.id === 'string' 
        ? (decoded.id.includes('e') || decoded.id.includes('E') || decoded.id.length > 15 
            ? BigInt(decoded.id) 
            : Number(decoded.id))
        : decoded.id;

      const rows = await prisma.$queryRaw<
        { id: number | bigint; username: string | null; email: string | null; role: string | null; name: string | null; cargo: string | null; photo: string | null; }[]
      >`SELECT id, username, email, role, name, cargo, photo FROM "users" WHERE id = ${userId} LIMIT 1`;
      const userData = rows[0];

      if (!userData) {
        return new Response(JSON.stringify({
          success: false,
          error: 'Usuário não encontrado'
        }), {
          status: 404,
          headers: { 'Content-Type': 'application/json' }
        });
      }

      // Normalizar BigInt na resposta JSON
      const normalizeForJson = (value: unknown): any => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
        return value;
      };

      const normalizedUser = {
        id: normalizeForJson(userData.id),
        username: userData.username,
        email: userData.email,
        role: userData.role,
        name: userData.name,
        cargo: userData.cargo,
        photo: userData.photo
      };

      return new Response(JSON.stringify({ 
        success: true, 
        user: normalizedUser
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (dbError) {
      console.error('Erro ao buscar dados do usuário:', dbError);
      // Fallback: retornar dados do token (já normalizados)
      return new Response(JSON.stringify({ 
        success: true, 
        user: {
          id: decoded.id, // Já está como string se era BigInt
          username: decoded.username,
          email: decoded.email,
          role: decoded.role
        }
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  } catch (error) {
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Token inválido' 
    }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
