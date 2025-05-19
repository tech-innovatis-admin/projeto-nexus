import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { sign } from 'jsonwebtoken';

const ADMIN_USER = process.env.ADMIN_USER;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET;

if (!ADMIN_USER || !ADMIN_PASSWORD || !JWT_SECRET) {
  throw new Error('Variáveis de ambiente necessárias não configuradas');
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    if (username !== ADMIN_USER || password !== ADMIN_PASSWORD) {
      return NextResponse.json({ error: 'Usuário ou senha inválidos' }, { status: 401 });
    }
    const token = sign({ username, role: 'admin' }, JWT_SECRET, { expiresIn: '8h' });
    cookies().set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 8 * 60 * 60
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Erro interno do servidor' }, { status: 500 });
  }
} 