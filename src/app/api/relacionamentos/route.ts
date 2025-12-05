import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/relacionamentos
 * Retorna todos os municípios com relacionamento ativo
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const apenasAtivos = searchParams.get('apenas_ativos') !== 'false';

    const relacionamentos = await prisma.municipios_com_relacionamento.findMany({
      where: apenasAtivos ? { relacionamento_ativo: true } : undefined,
      orderBy: [
        { name_state: 'asc' },
        { name_muni: 'asc' }
      ]
    });

    return NextResponse.json({
      success: true,
      data: relacionamentos,
      total: relacionamentos.length
    });
  } catch (error) {
    console.error('Erro ao buscar relacionamentos:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao buscar relacionamentos', detalhes: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/relacionamentos
 * Cria um novo relacionamento com município
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name_state, code_muni, name_muni, relacionamento_ativo = true } = body;

    // Validações
    if (!name_state || !code_muni || !name_muni) {
      return NextResponse.json(
        { success: false, error: 'Campos obrigatórios: name_state, code_muni, name_muni' },
        { status: 400 }
      );
    }

    // Verificar se já existe
    const existente = await prisma.municipios_com_relacionamento.findUnique({
      where: { code_muni }
    });

    if (existente) {
      return NextResponse.json(
        { success: false, error: 'Município já possui relacionamento cadastrado', existente },
        { status: 409 }
      );
    }

    const novoRelacionamento = await prisma.municipios_com_relacionamento.create({
      data: {
        name_state: name_state.toUpperCase(),
        code_muni,
        name_muni,
        relacionamento_ativo,
        relacionamento_criado: new Date(),
        relacionamento_editado: new Date()
      }
    });

    return NextResponse.json({
      success: true,
      data: novoRelacionamento,
      message: 'Relacionamento criado com sucesso'
    }, { status: 201 });
  } catch (error) {
    console.error('Erro ao criar relacionamento:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao criar relacionamento', detalhes: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/relacionamentos
 * Atualiza um relacionamento existente
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { code_muni, relacionamento_ativo, name_state, name_muni } = body;

    if (!code_muni) {
      return NextResponse.json(
        { success: false, error: 'Campo obrigatório: code_muni' },
        { status: 400 }
      );
    }

    // Verificar se existe
    const existente = await prisma.municipios_com_relacionamento.findUnique({
      where: { code_muni }
    });

    if (!existente) {
      return NextResponse.json(
        { success: false, error: 'Relacionamento não encontrado' },
        { status: 404 }
      );
    }

    const dadosAtualizacao: any = {
      // SEMPRE atualiza a data de edição
      relacionamento_editado: new Date()
    };

    if (typeof relacionamento_ativo === 'boolean') {
      dadosAtualizacao.relacionamento_ativo = relacionamento_ativo;
      
      // Se está reativando um relacionamento que estava inativo E não tinha data de criação,
      // define a data de criação agora
      if (relacionamento_ativo && !existente.relacionamento_criado) {
        dadosAtualizacao.relacionamento_criado = new Date();
      }
    }
    if (name_state) {
      dadosAtualizacao.name_state = name_state.toUpperCase();
    }
    if (name_muni) {
      dadosAtualizacao.name_muni = name_muni;
    }

    const atualizado = await prisma.municipios_com_relacionamento.update({
      where: { code_muni },
      data: dadosAtualizacao
    });

    return NextResponse.json({
      success: true,
      data: atualizado,
      message: 'Relacionamento atualizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao atualizar relacionamento:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao atualizar relacionamento', detalhes: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/relacionamentos
 * Remove um relacionamento (soft delete via relacionamento_ativo = false ou hard delete)
 */
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code_muni = searchParams.get('code_muni');
    const hardDelete = searchParams.get('hard') === 'true';

    if (!code_muni) {
      return NextResponse.json(
        { success: false, error: 'Parâmetro obrigatório: code_muni' },
        { status: 400 }
      );
    }

    // Verificar se existe
    const existente = await prisma.municipios_com_relacionamento.findUnique({
      where: { code_muni }
    });

    if (!existente) {
      return NextResponse.json(
        { success: false, error: 'Relacionamento não encontrado' },
        { status: 404 }
      );
    }

    if (hardDelete) {
      await prisma.municipios_com_relacionamento.delete({
        where: { code_muni }
      });
      return NextResponse.json({
        success: true,
        message: 'Relacionamento removido permanentemente'
      });
    } else {
      // Soft delete: desativa o relacionamento
      const atualizado = await prisma.municipios_com_relacionamento.update({
        where: { code_muni },
        data: {
          relacionamento_ativo: false,
          relacionamento_editado: new Date()
        }
      });
      return NextResponse.json({
        success: true,
        data: atualizado,
        message: 'Relacionamento desativado com sucesso'
      });
    }
  } catch (error) {
    console.error('Erro ao remover relacionamento:', error);
    return NextResponse.json(
      { success: false, error: 'Erro ao remover relacionamento', detalhes: error instanceof Error ? error.message : 'Erro desconhecido' },
      { status: 500 }
    );
  }
}
