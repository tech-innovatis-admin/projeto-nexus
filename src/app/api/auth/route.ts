import { cookies } from 'next/headers';
import { sign } from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { Prisma } from '@prisma/client';

// Aviso em desenvolvimento se JWT_SECRET não estiver definido
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET não definido. Usando valor padrão inseguro. Não recomendado para produção!');
}

export async function POST(request: Request) {
  try {

    const { username, password } = await request.json();
    const identifier: string = String(username ?? '').trim();
    const plainPassword: string = String(password ?? '');
    console.log('Tentativa de login com identificador:', identifier);

    if (!identifier || !plainPassword) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Usuário/e-mail e senha são obrigatórios'
      }), { status: 400, headers: { 'Content-Type': 'application/json' } });
    }

    // Busca o usuário no Postgres por e-mail OU username.
    // Usamos $queryRaw para conseguir ler a coluna platforms mesmo que não esteja no schema Prisma.
    const rows = await prisma.$queryRaw<
      { id: number; email: string | null; username: string | null; hash: string; role: string | null; platforms: unknown; }[]
    >`SELECT id, email, username, hash, role, platforms
      FROM "users"
      WHERE email ILIKE ${identifier} OR username ILIKE ${identifier}
      LIMIT 1`;

    const dbUser = rows[0];
    if (!dbUser) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Credenciais inválidas'
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Confere a senha com bcrypt
    const isPasswordValid = await bcrypt.compare(plainPassword, dbUser.hash);
    if (!isPasswordValid) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Credenciais inválidas'
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    // Verifica se a plataforma "nexus" está permitida
    let platformList: string[] = [];
    const rawPlatforms = dbUser.platforms as unknown;
    if (Array.isArray(rawPlatforms)) {
      platformList = (rawPlatforms as unknown[]).map((p) => String(p));
    } else if (typeof rawPlatforms === 'string') {
      // Fallback caso venha no formato "{nexus, saep}"
      platformList = rawPlatforms
        .replace(/[{}]/g, '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    }

    const hasNexusAccess = platformList.some((p) => p.toLowerCase() === 'nexus');
    if (!hasNexusAccess) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Usuário não possui acesso à plataforma nexus'
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    // Criar token JWT
    const token = sign(
      {
        id: dbUser.id,
        username: dbUser.username,
        email: dbUser.email,
        role: dbUser.role,
        platforms: platformList
      },
      process.env.JWT_SECRET || 'ProjetoNexus_InnOvatis_Plataforma_2025',
      { expiresIn: '1h' }
    );

    // Configurar cookie
    const cookieStore = await cookies();
    cookieStore.set('auth_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 3600 // 1 hora
    });

    return new Response(JSON.stringify({ success: true, role: dbUser.role }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Erro na autenticação:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
} 