import { verify } from 'jsonwebtoken';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  try {
    const token = request.headers.get('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return NextResponse.json({
        success: false, 
        error: 'Token não encontrado' 
      }, { status: 401 });
    }

    // Verifica o token
    const decoded = verify(
      token,
      process.env.JWT_SECRET || 'ProjetoNexus_InnOvatis_Plataforma_2025'
    );

    return NextResponse.json({
      success: true, 
      user: decoded 
    });
  } catch (error) {
    return NextResponse.json({
      success: false, 
      error: 'Token inválido' 
    }, { status: 401 });
  }
}
