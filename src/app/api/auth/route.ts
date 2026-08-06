import { cookies } from 'next/headers';
import { prisma } from '@/lib/prisma';
import bcrypt from 'bcryptjs';
import { credentialsEnabled } from '@/lib/auth/authMode';
import {
  AUTH_COOKIE_NAME,
  authCookieOptions,
  createNexusSession,
  type NexusDbUser,
} from '@/lib/auth/session';

export async function POST(request: Request) {
  try {
    if (!credentialsEnabled()) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Login por senha desabilitado. Use SSO.'
      }), { status: 403, headers: { 'Content-Type': 'application/json' } });
    }

    if (!process.env.JWT_SECRET) {
      console.error('❌ JWT_SECRET não está configurado');
      return new Response(JSON.stringify({
        success: false,
        error: 'Erro de configuração do servidor'
      }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }

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

    const rows = await prisma.$queryRaw<
      (NexusDbUser & { hash: string })[]
    >`SELECT id, email, username, hash, role, platforms, name, cargo, photo
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

    const isPasswordValid = await bcrypt.compare(plainPassword, dbUser.hash);
    if (!isPasswordValid) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Credenciais inválidas'
      }), { status: 401, headers: { 'Content-Type': 'application/json' } });
    }

    const session = await createNexusSession(dbUser);
    if (!session.ok) {
      return new Response(JSON.stringify({
        success: false,
        error: session.error
      }), { status: session.status, headers: { 'Content-Type': 'application/json' } });
    }

    const cookieStore = await cookies();
    cookieStore.set(AUTH_COOKIE_NAME, session.token, authCookieOptions());
    console.log('✅ Cookie auth_token definido');

    return new Response(JSON.stringify({
      success: true,
      user: session.user
    }), {
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
