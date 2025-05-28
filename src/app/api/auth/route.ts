import { cookies } from 'next/headers';
import { sign } from 'jsonwebtoken';
import { loadEnvFromS3 } from '@/utils/envManager';

// Aviso em desenvolvimento se JWT_SECRET não estiver definido
if (!process.env.JWT_SECRET) {
  console.warn('⚠️ JWT_SECRET não definido. Usando valor padrão inseguro. Não recomendado para produção!');
}

export async function POST(request: Request) {
  try {
    // Carrega variáveis de ambiente do S3 antes de verificar credenciais
    await loadEnvFromS3();

    const { username, password } = await request.json();
    console.log('Tentativa de login com username:', username);
    
    // Verificar credenciais usando as variáveis carregadas do S3
    if (username === process.env.ADMIN_USER && 
        password === process.env.ADMIN_PASSWORD) {
      console.log('Login bem-sucedido');
      
      // Criar token JWT
      const token = sign(
        { username, role: 'admin' },
        process.env.JWT_SECRET || 'sua_chave_secreta_aqui',
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

      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    console.log('Credenciais inválidas');
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Credenciais inválidas' 
    }), {
      status: 401,
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