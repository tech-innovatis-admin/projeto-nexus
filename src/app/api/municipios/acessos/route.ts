import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import jwt from 'jsonwebtoken';

/**
 * GET /api/municipios/acessos
 * Retorna os municípios e UFs permitidos para o usuário autenticado.
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
    } catch (e) {
      return NextResponse.json({ error: 'Token inválido ou expirado' }, { status: 401 });
    }

    const userId: number = decoded.id || decoded.userId;

    // 3) Buscar usuário
    const user = await prisma.users.findUnique({
      where: { id: userId },
      select: { id: true, role: true, email: true, name: true },
    });
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
    }

    // 4) Admin e gestor: acesso total
    if ((user.role || '').toLowerCase() === 'admin' || (user.role || '').toLowerCase() === 'gestor') {
      return NextResponse.json({
        user,
        acessoTotal: true,
        municipios: null,
        ufs: null,
      });
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

    const municipiosPermitidos: number[] = [];
    const ufsPermitidas = new Set<string>();
    const detalhes: Array<{ municipioId: number | null; municipioNome: string | null; uf: string | null; exclusive: boolean; validUntil: Date | null; }> = [];

    for (const acesso of acessos) {
      if (acesso.municipio_id && acesso.municipios) {
        municipiosPermitidos.push(acesso.municipio_id);
        detalhes.push({
          municipioId: acesso.municipio_id,
          municipioNome: acesso.municipios.municipio,
          uf: acesso.municipios.name_state,
          exclusive: acesso.exclusive,
          validUntil: acesso.valid_until,
        });
      }
      if (acesso.uf) {
        ufsPermitidas.add(acesso.uf.toUpperCase());
        detalhes.push({ municipioId: null, municipioNome: null, uf: acesso.uf.toUpperCase(), exclusive: acesso.exclusive, validUntil: acesso.valid_until });
      }
    }

    if (municipiosPermitidos.length === 0 && ufsPermitidas.size === 0) {
      return NextResponse.json({ user, acessoTotal: false, municipios: [], ufs: [], detalhes, mensagem: 'Nenhum acesso configurado para este usuário' });
    }

    return NextResponse.json({
      user,
      acessoTotal: false,
      municipios: municipiosPermitidos.length ? municipiosPermitidos : null,
      ufs: ufsPermitidas.size ? Array.from(ufsPermitidas) : null,
      detalhes,
      totalAcessos: acessos.length,
    });
  } catch (error) {
    return NextResponse.json({ error: 'Erro ao buscar acessos', detalhes: error instanceof Error ? error.message : 'Erro desconhecido' }, { status: 500 });
  }
}
