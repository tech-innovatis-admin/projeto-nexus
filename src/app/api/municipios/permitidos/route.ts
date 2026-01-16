import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

// Mapeamento UF -> Nome completo
const UF_NAME_BY_SIGLA: Record<string, string> = {
  AC: 'Acre', AL: 'Alagoas', AP: 'Amapá', AM: 'Amazonas', BA: 'Bahia', CE: 'Ceará',
  DF: 'Distrito Federal', ES: 'Espírito Santo', GO: 'Goiás', MA: 'Maranhão', MT: 'Mato Grosso',
  MS: 'Mato Grosso do Sul', MG: 'Minas Gerais', PA: 'Pará', PB: 'Paraíba', PR: 'Paraná',
  PE: 'Pernambuco', PI: 'Piauí', RJ: 'Rio de Janeiro', RN: 'Rio Grande do Norte', RS: 'Rio Grande do Sul',
  RO: 'Rondônia', RR: 'Roraima', SC: 'Santa Catarina', SP: 'São Paulo', SE: 'Sergipe', TO: 'Tocantins'
};

/**
 * GET /api/municipios/permitidos
 * Retorna lista de estados e municípios permitidos para o usuário autenticado.
 */
export async function GET(request: NextRequest) {
  try {
    // Validar JWT_SECRET obrigatório
    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET não está configurado');
      return NextResponse.json({ error: 'Erro de configuração do servidor' }, { status: 500 });
    }

    // 1) Obter token do cookie ou do header Authorization
    const cookieToken = request.cookies.get('auth_token')?.value;
    const authHeader = request.headers.get('authorization') || request.headers.get('Authorization');
    const headerToken = authHeader?.startsWith('Bearer ')
      ? authHeader.slice('Bearer '.length)
      : undefined;

    const token = cookieToken || headerToken;
    if (!token) {
      return NextResponse.json({ error: 'Token não fornecido' }, { status: 401 });
    }

    // 2) Verificar token
    let decoded: any;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });
    }

    const userId: number = decoded.id || decoded.userId;

    // 3) Buscar usuário
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, role: true }
    });
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    const role = (user.role || '').toLowerCase();

    // 4) Admin e gestor: full access (não restringe dropdown)
    if (role === 'admin' || role === 'gestor') {
      return NextResponse.json({ fullAccess: true, estados: null, municipios: null });
    }

    // 5) Viewer: coletar acessos válidos (não expirados ou sem validade)
    const now = new Date();
    const acessos = await prisma.municipio_acessos.findMany({
      where: {
        user_id: user.id,
        OR: [
          { valid_until: null },
          { valid_until: { gt: now } },
        ],
      },
      include: {
        municipios: { select: { id: true, municipio: true, name_state: true } },
      },
    });

    // Montar listas únicas
    const estadosSet = new Set<string>();
    const municipiosMap = new Map<number, { id: number; municipio: string; name_state: string }>();

    for (const a of acessos) {
      // UF direta
      if (a.uf) {
        estadosSet.add(String(a.uf).toUpperCase());
      }
      // Município específico
      if (a.municipio_id && a.municipios) {
        municipiosMap.set(a.municipios.id, {
          id: a.municipios.id,
          municipio: a.municipios.municipio,
          name_state: a.municipios.name_state,
        });
      }
    }

    const estados = Array.from(estadosSet).map((uf) => ({ uf, uf_name: UF_NAME_BY_SIGLA[uf] || uf }));
    const municipios = Array.from(municipiosMap.values());

    if (estados.length === 0 && municipios.length === 0) {
      return NextResponse.json({
        fullAccess: false,
        estados: [],
        municipios: [],
        mensagem: 'Você não possui acesso a nenhum município ou estado nesta plataforma.'
      });
    }

    return NextResponse.json({ fullAccess: false, estados, municipios });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar permissões', detalhes: error instanceof Error ? error.message : 'Erro desconhecido' }, { status: 500 });
  }
}
