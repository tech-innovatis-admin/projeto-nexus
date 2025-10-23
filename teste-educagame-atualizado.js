/**
 * Testes para Educagame com regra atualizada: POPULACAO <= 20k
 * 
 * Testes a serem executados:
 * 1. População = 1 (elegível)
 * 2. População = 5.000 (elegível)
 * 3. População = 10.000 (elegível)
 * 4. População = 19.999 (elegível)
 * 5. População = 20.000 (elegível - agora com <=)
 * 6. População = 20.001 (NÃO elegível)
 * 7. População = 25.000 (NÃO elegível)
 * 8. População = 100.000 (NÃO elegível)
 * 9. População = null (NÃO elegível)
 * 10. População = 0 (NÃO elegível - população deve ser > 0)
 * 11. População = -1000 (NÃO elegível)
 * 12. População = "20000" (elegível - string que converte)
 */

const EDUCAGAME_POPULACAO_MAX = 20000;

// Função de teste
function temPopulacaoEducagame(props) {
  const populacao = props.POPULACAO;
  if (!populacao) return false;
  
  const popNum = Number(populacao);
  return !isNaN(popNum) && popNum > 0 && popNum <= EDUCAGAME_POPULACAO_MAX;
}

// Casos de teste
const casosTeste = [
  { populacao: 1, esperado: true, descricao: "Pop 1 hab" },
  { populacao: 5000, esperado: true, descricao: "Pop 5k" },
  { populacao: 10000, esperado: true, descricao: "Pop 10k" },
  { populacao: 19999, esperado: true, descricao: "Pop 19.999" },
  { populacao: 20000, esperado: true, descricao: "Pop 20.000 (limite inclusivo)" },
  { populacao: 20001, esperado: false, descricao: "Pop 20.001 (acima do limite)" },
  { populacao: 25000, esperado: false, descricao: "Pop 25k" },
  { populacao: 100000, esperado: false, descricao: "Pop 100k" },
  { populacao: null, esperado: false, descricao: "Pop null" },
  { populacao: 0, esperado: false, descricao: "Pop 0 (deve ser > 0)" },
  { populacao: -1000, esperado: false, descricao: "Pop -1000" },
  { populacao: "20000", esperado: true, descricao: "Pop '20000' (string)" },
];

// Executar testes
console.log("🧪 TESTES EDUCAGAME - REGRA ATUALIZADA (POPULACAO <= 20k)\n");
console.log("═".repeat(70));

let passaram = 0;
let falharam = 0;

casosTeste.forEach((caso, index) => {
  const props = { POPULACAO: caso.populacao };
  const resultado = temPopulacaoEducagame(props);
  const passou = resultado === caso.esperado;
  
  if (passou) {
    passaram++;
    console.log(`✅ Teste ${index + 1}: ${caso.descricao}`);
    console.log(`   Pop: ${caso.populacao} → Elegível: ${resultado} (esperado: ${caso.esperado})`);
  } else {
    falharam++;
    console.log(`❌ Teste ${index + 1}: ${caso.descricao}`);
    console.log(`   Pop: ${caso.populacao} → Elegível: ${resultado} (esperado: ${caso.esperado})`);
  }
  console.log();
});

console.log("═".repeat(70));
console.log(`\n📊 RESULTADO FINAL: ${passaram}/${casosTeste.length} testes PASSARAM ✅`);
if (falharam > 0) {
  console.log(`❌ ${falharam} teste(s) falharam`);
} else {
  console.log("🎉 Todos os testes passaram com a regra POPULACAO <= 20k!");
}
