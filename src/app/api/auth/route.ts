import { cookies } from 'next/headers';
import { sign } from 'jsonwebtoken';
import { loadEnvFromS3 } from '@/utils/envManager';
import { fetchEnvConfig } from '@/utils/s3Service';

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

    // Carrega o arquivo de configuração do S3 (senhas_s3.json)
    const config = await fetchEnvConfig();
    if (!config || !Array.isArray(config.USERS)) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Configuração de usuários inválida.'
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Procura o usuário no array USERS
    const user = config.USERS.find((u: any) => u.username === username && u.password === password);
    if (user) {
      console.log('Login bem-sucedido para', username);
      // Criar token JWT
      const token = sign(
        { username: user.username, role: user.role },
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

      return new Response(JSON.stringify({ success: true, role: user.role }), {
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