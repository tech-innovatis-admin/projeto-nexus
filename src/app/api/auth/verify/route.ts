import { verify } from 'jsonwebtoken';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

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

    return new Response(JSON.stringify({ 
      success: true, 
      user: decoded 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
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
