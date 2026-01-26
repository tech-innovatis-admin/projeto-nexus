import { cookies } from 'next/headers';

export async function POST(request: Request) {
  try {
    // Sem validação de credenciais, apenas cria uma sessão simples
    const cookieStore = await cookies();
    cookieStore.set('session_token', 'no-auth-required', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 86400 * 30 // 30 dias
    });

    return new Response(JSON.stringify({ 
      success: true, 
      user: {
        id: 1,
        username: 'Usuario',
        email: 'usuario@nexus.local',
        role: 'admin',
        name: 'Usuário NEXUS',
        cargo: 'Acessor',
        photo: null
      }
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