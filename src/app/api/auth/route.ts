import { cookies } from 'next/headers';
import { sign } from 'jsonwebtoken';
import { prisma } from '@/lib/prisma';
import { verifyPassword } from '@/utils/passwordUtils';
import { NextResponse } from 'next/server';

// Aviso em desenvolvimento se JWT_SECRET não estiver definido
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET não definido. Usando valor padrão inseguro. Não recomendado para produção!');
}

export async function POST(request: Request) {
  try {
    const { username, password } = await request.json();
    console.log('Tentativa de login com username:', username);

    // Buscar usuário no banco de dados PostgreSQL
    const user = await prisma.users.findUnique({
      where: { username }
    });

    // Se o usuário não existir no banco
    if (!user) {
      console.log('Usuário não encontrado:', username);
      return NextResponse.json({ 
        success: false, 
        error: 'Credenciais inválidas' 
      }, { status: 401 });
    }

    // Verificar se a senha corresponde ao hash armazenado
    const isPasswordValid = await verifyPassword(password, user.hash);
    
    if (isPasswordValid) {
      console.log('Login bem-sucedido para', username);
      // Criar token JWT
      const token = sign(
        { 
          id: user.id,
          username: user.username, 
          role: user.role || 'user',
          email: user.email 
        },
        process.env.JWT_SECRET || 'ProjetoNexus_InnOvatis_Plataforma_2025',
        { expiresIn: '1h' }
      );

      // Criar resposta com cookie
      const response = NextResponse.json({
        success: true, 
        role: user.role || 'user'
      });
      
      // Configurar cookie
      response.cookies.set({
        name: 'auth_token',
        value: token,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 3600 // 1 hora
      });

      return response;
    }

    console.log('Senha inválida para o usuário:', username);
    return NextResponse.json({ 
      success: false, 
      error: 'Credenciais inválidas' 
    }, { status: 401 });

  } catch (error) {
    console.error('Erro na autenticação:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
} 