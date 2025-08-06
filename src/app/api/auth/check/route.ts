import { cookies } from 'next/headers';
import { verify } from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Obtém o token do cookie
    const cookieStore = request.cookies;
    const token = cookieStore.get('auth_token')?.value;

    if (!token) {
      return NextResponse.json({
        authenticated: false,
        message: 'Não autenticado'
      });
    }

    // Verifica o token
    const decoded = verify(
      token,
      process.env.JWT_SECRET || 'ProjetoNexus_InnOvatis_Plataforma_2025'
    );

    return NextResponse.json({
      authenticated: true,
      user: decoded
    });
  } catch (error) {
    return NextResponse.json({
      authenticated: false,
      message: 'Token inválido'
    });
  }
}
