import { verify } from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
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
      process.env.JWT_SECRET || 'ProjetoNexus_InnOvatis_Plataforma_2025'
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
      const rows = await prisma.$queryRaw<
        { id: number; username: string | null; email: string | null; role: string | null; name: string | null; cargo: string | null; photo: string | null; }[]
      >`SELECT id, username, email, role, name, cargo, photo FROM "users" WHERE id = ${decoded.id} LIMIT 1`;
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

      return new Response(JSON.stringify({ 
        success: true, 
        user: userData
      }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    } catch (dbError) {
      console.error('Erro ao buscar dados do usuário:', dbError);
      return new Response(JSON.stringify({ 
        success: true, 
        user: {
          id: decoded.id,
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
