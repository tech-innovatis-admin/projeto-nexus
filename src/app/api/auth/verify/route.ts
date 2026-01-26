export async function GET() {
  try {
    // Sem verificação de autenticação, sempre retorna usuário válido
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
    return new Response(JSON.stringify({ 
      success: false, 
      error: 'Erro interno do servidor' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}
