import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

export async function POST() {
  try {
    const cookieStore = await cookies();
    
    // Remove o cookie de sessão
    cookieStore.delete('session_token');
    
    return NextResponse.json({ 
      success: true, 
      message: 'Logout realizado com sucesso' 
    });
  } catch (error) {
    console.error('Erro no logout:', error);
    return NextResponse.json({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }, { status: 500 });
  }
}
