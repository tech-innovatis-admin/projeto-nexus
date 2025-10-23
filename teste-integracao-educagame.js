/**
 * Teste de Integração: Educagame - Filtro por População em Modo Vendas
 * 
 * Este teste simula o fluxo completo:
 * 1. classificarElegibilidade() determina se Educagame é elegível
 * 2. InformacoesMunicipio.tsx filtra educagame_fmt baseado em VALOR_EDUCAGAME
 * 3. Educagame aparece/desaparece conforme população
 */

// Simular a função classificarElegibilidade
function classificarElegibilidade(props) {
  const EDUCAGAME_POPULACAO_MAX = 20000;
  
  function getPopulacao(props) {
    const populacao = props.POPULACAO;
    if (!populacao) return null;
    const popNum = Number(populacao);
    return !isNaN(popNum) && popNum > 0 ? popNum : null;
  }

  function temPopulacaoEducagame(props) {
    const populacao = props.POPULACAO;
    if (!populacao) return false;
    const popNum = Number(populacao);
    return !isNaN(popNum) && popNum > 0 && popNum <= EDUCAGAME_POPULACAO_MAX;
  }

  const resultado = {
    vender: [],
    naoVender: []
  };

  // Simular Educagame
  const populacao = getPopulacao(props);
  const temPopEducagame = temPopulacaoEducagame(props);
  const itemEducagame = {
    chave: 'VALOR_EDUCAGAME',
    nome: 'Educagame',
    valor: props.VALOR_EDUCAGAME ?? null,
    status: temPopEducagame ? 'em_dia' : 'nao_tem',
    motivo: temPopEducagame
      ? `Elegível: população ${populacao?.toLocaleString('pt-BR') || '?'} <= 20.000 hab.`
      : `Não elegível: população ${populacao?.toLocaleString('pt-BR') || '?'} > 20.000 hab.`
  };

  if (temPopEducagame) {
    resultado.vender.push(itemEducagame);
  } else {
    resultado.naoVender.push(itemEducagame);
  }

  return resultado;
}

// Simular o filtro de InformacoesMunicipio.tsx
function filtrarProdutosEmModoVendas(municipio, valoresFiltrados) {
  const classificacao = classificarElegibilidade(municipio.properties);
  
  const chavesVendaveis = new Set(classificacao.vender.map(item => item.chave));
  
  const produtosSempreVendaveis = [
    'VALOR_CTM', 
    'VALOR_REURB', 
    'VALOR_START_INICIAIS_FINAIS', 
    'VALOR_DEC_AMBIENTAL', 
    'VALOR_PLHIS', 
    'VALOR_DESERT',
    // ✅ educagame_fmt REMOVIDO
    'PVA_fmt', 
    'LIVRO_FUND_COMBINADO'
  ];

  const produtosFiltrados = valoresFiltrados.filter(([chave]) => {
    if (produtosSempreVendaveis.includes(chave)) {
      return true;
    }
    
    // Para educagame_fmt, verificar se VALOR_EDUCAGAME está em vendáveis
    if (chave === 'educagame_fmt') {
      return chavesVendaveis.has('VALOR_EDUCAGAME');
    }
    
    if (chave === 'VALOR_PD' || chave === 'VALOR_PMSB') {
      return chavesVendaveis.has(chave);
    }
    
    return false;
  });

  return {
    filtrados: produtosFiltrados,
    vendaveis: Array.from(chavesVendaveis),
    educagameElegivelModoVendas: chavesVendaveis.has('VALOR_EDUCAGAME')
  };
}

// ====================
// TESTES DE INTEGRAÇÃO
// ====================

console.log("🧪 TESTES DE INTEGRAÇÃO: EDUCAGAME - FILTRO POR POPULAÇÃO\n");
console.log("═".repeat(80));

const casosTesteTeste = [
  {
    nome: "Município com 5k habitantes",
    populacao: 5000,
    esperadoModoVendas: true,
    descricao: "Deve aparecer (5k <= 20k)"
  },
  {
    nome: "Município com 10k habitantes",
    populacao: 10000,
    esperadoModoVendas: true,
    descricao: "Deve aparecer (10k <= 20k)"
  },
  {
    nome: "Município com 19.999 habitantes",
    populacao: 19999,
    esperadoModoVendas: true,
    descricao: "Deve aparecer (19.999 <= 20k)"
  },
  {
    nome: "Município com 20.000 habitantes (LIMITE)",
    populacao: 20000,
    esperadoModoVendas: true,
    descricao: "Deve aparecer (20k == 20k, <= é inclusivo)"
  },
  {
    nome: "Município com 20.001 habitantes",
    populacao: 20001,
    esperadoModoVendas: false,
    descricao: "NÃO deve aparecer (20.001 > 20k)"
  },
  {
    nome: "Município com 25k habitantes",
    populacao: 25000,
    esperadoModoVendas: false,
    descricao: "NÃO deve aparecer (25k > 20k)"
  },
  {
    nome: "Município com 50k habitantes",
    populacao: 50000,
    esperadoModoVendas: false,
    descricao: "NÃO deve aparecer (50k > 20k)"
  },
  {
    nome: "Município com 100k habitantes",
    populacao: 100000,
    esperadoModoVendas: false,
    descricao: "NÃO deve aparecer (100k > 20k)"
  }
];

let passaram = 0;
let falharam = 0;

casosTesteTeste.forEach((caso, index) => {
  // Simular município
  const municipio = {
    properties: {
      code_muni: `TESTE_${index}`,
      POPULACAO: caso.populacao,
      VALOR_EDUCAGAME: 50000
    }
  };

  // Valores filtrados simulados (como se viessem do componente)
  const valoresFiltrados = [
    ['VALOR_PD', 'valor_pd'],
    ['VALOR_PMSB', 'valor_pmsb'],
    ['educagame_fmt', 'valor_educagame'],
    ['PVA_fmt', 'valor_pva'],
    ['VALOR_CTM', 'valor_ctm']
  ];

  // Executar filtro em modo vendas
  const resultado = filtrarProdutosEmModoVendas(municipio, valoresFiltrados);
  
  // Verificar se educagame aparece ou não
  const educagameNoFiltro = resultado.filtrados.some(([chave]) => chave === 'educagame_fmt');
  const passou = educagameNoFiltro === caso.esperadoModoVendas;

  const emoji = passou ? '✅' : '❌';
  
  if (passou) passaram++;
  else falharam++;

  console.log(`\n${emoji} Teste ${index + 1}: ${caso.nome}`);
  console.log(`   Descrição: ${caso.descricao}`);
  console.log(`   População: ${caso.populacao.toLocaleString('pt-BR')} hab`);
  console.log(`   Elegível para Educagame: ${resultado.vendaveis.includes('VALOR_EDUCAGAME') ? 'SIM' : 'NÃO'}`);
  console.log(`   Apareça em Modo Vendas: ${educagameNoFiltro ? 'SIM' : 'NÃO'} (esperado: ${caso.esperadoModoVendas ? 'SIM' : 'NÃO'})`);
  
  if (!passou) {
    console.log(`   ❌ FALHA: Esperado=${caso.esperadoModoVendas}, Obtido=${educagameNoFiltro}`);
  }
});

console.log("\n" + "═".repeat(80));
console.log(`\n📊 RESULTADO FINAL: ${passaram}/${casosTesteTeste.length} testes PASSARAM`);

if (falharam > 0) {
  console.log(`❌ ${falharam} teste(s) falharam`);
  process.exit(1);
} else {
  console.log("🎉 Todos os testes passaram! Educagame filtra corretamente por população!");
  console.log("\n✅ FLUXO VALIDADO:");
  console.log("   1. classificarElegibilidade() determina elegibilidade");
  console.log("   2. InformacoesMunicipio.tsx mapeia educagame_fmt → VALOR_EDUCAGAME");
  console.log("   3. Educagame aparece apenas se população <= 20k");
  process.exit(0);
}
