# ✅ Checklist de Verificação - Dropdowns de Estado e Município

## 📋 Verificação Rápida (2 minutos)

Execute estas verificações na página `/mapa` para confirmar que está funcionando:

### ✓ Teste 1: Busca por Estado - "São Paulo"
- [ ] Clique no campo "Digite o estado..."
- [ ] Escreva: `São Paulo`
- [ ] **Esperado:** Dropdown mostra APENAS "São Paulo" ✅
- [ ] **Status:** 
  - [ ] ✅ Passou
  - [ ] ❌ Falhou

### ✓ Teste 2: Busca por Estado - Minúsculas "sp"
- [ ] Limpe o campo (Delete ou Ctrl+A → Delete)
- [ ] Escreva: `sp` (minúsculo)
- [ ] **Esperado:** Dropdown mostra "São Paulo" (case-insensitive) ✅
- [ ] **Status:**
  - [ ] ✅ Passou
  - [ ] ❌ Falhou

### ✓ Teste 3: Busca por Estado - Parcial "minas"
- [ ] Limpe o campo
- [ ] Escreva: `minas` ou `min`
- [ ] **Esperado:** Dropdown mostra "Minas Gerais" ✅
- [ ] **Status:**
  - [ ] ✅ Passou
  - [ ] ❌ Falhou

### ✓ Teste 4: Dropdown Permanece Aberto
- [ ] Escreva lentamente: `b-a-h-i-a`
- [ ] **Esperado:** Dropdown fica SEMPRE aberto enquanto digita ✅
- [ ] **Problema:** Dropdown fechava durante a digitação ❌
- [ ] **Status:**
  - [ ] ✅ Passou
  - [ ] ❌ Falhou

### ✓ Teste 5: Expandir Estados (Sem Digitação)
- [ ] Limpe completamente o campo de Estado
- [ ] Clique em "Exibir mais"
- [ ] **Esperado:** Aparecem TODOS os ~16 estados ✅
- [ ] **Status:**
  - [ ] ✅ Passou
  - [ ] ❌ Falhou

### ✓ Teste 6: Filtro Anula Expansão
- [ ] Tenha "Exibir mais" ativado (vendo todos os 16 estados)
- [ ] Agora escreva: `parana` ou `pr`
- [ ] **Esperado:** Mostra APENAS "Paraná" (ignora expansão) ✅
- [ ] **Status:**
  - [ ] ✅ Passou
  - [ ] ❌ Falhou

### ✓ Teste 7: Busca por Município
- [ ] Selecione um Estado (ex: "São Paulo")
- [ ] Clique no campo "Digite o município..."
- [ ] Escreva: `santos` ou `são`
- [ ] **Esperado:** Mostra APENAS municípios que contêm a busca ✅
- [ ] **Status:**
  - [ ] ✅ Passou
  - [ ] ❌ Falhou

### ✓ Teste 8: Município Desabilitado Sem Estado
- [ ] Limpe o Estado
- [ ] Tente clicar no campo de Município
- [ ] **Esperado:** Campo fica DESABILITADO (cinzento) ✅
- [ ] **Status:**
  - [ ] ✅ Passou
  - [ ] ❌ Falhou

### ✓ Teste 9: Botão "Limpar"
- [ ] Preencha Estado e Município
- [ ] Clique no botão "Limpar"
- [ ] **Esperado:** 
  - [ ] Ambos campos ficam vazios ✅
  - [ ] Consegue digitar novamente ✅
  - [ ] Campo Município fica desabilitado ✅
- [ ] **Status:**
  - [ ] ✅ Passou
  - [ ] ❌ Falhou

### ✓ Teste 10: Buscar Depois de Tudo
- [ ] Preencha Estado e Município via dropdown
- [ ] Clique em "Buscar"
- [ ] **Esperado:** 
  - [ ] Mapa carrega ✅
  - [ ] Informações aparecem ✅
  - [ ] Sem erros no console ✅
- [ ] **Status:**
  - [ ] ✅ Passou
  - [ ] ❌ Falhou

### ✓ Teste 11: Limpeza Automática ao Clicar em Estado
- [ ] Selecione "Paraíba" no dropdown de Estado
- [ ] Selecione "João Pessoa" no dropdown de Município
- [ ] Clique novamente no campo "Digite o estado..."
- [ ] **Esperado:** 
  - [ ] Campo de Estado fica VAZIO automaticamente ✅
  - [ ] Campo de Município fica VAZIO automaticamente ✅
  - [ ] Dropdown de Estado abre ✅
- [ ] **Status:**
  - [ ] ✅ Passou
  - [ ] ❌ Falhou

### ✓ Teste 12: Limpeza Automática ao Clicar em Município
- [ ] Selecione "São Paulo" no dropdown de Estado
- [ ] Selecione "São Paulo" (cidade) no dropdown de Município
- [ ] Clique novamente no campo "Digite o município..."
- [ ] **Esperado:** 
  - [ ] Campo de Município fica VAZIO automaticamente ✅
  - [ ] Campo de Estado CONTINUA preenchido ✅
  - [ ] Dropdown de Município abre ✅
- [ ] **Status:**
  - [ ] ✅ Passou
  - [ ] ❌ Falhou

### ✓ Teste 13: Console Mostra Limpeza
- [ ] Abra DevTools (F12)
- [ ] Vá para aba "Console"
- [ ] Clique em Estado ou Município
- [ ] **Esperado:** Ver log:
  ```
  🧹 [MapaPage] ... - Campo de Estado/Município limpo automaticamente ao focar
  ```
- [ ] **Status:**
  - [ ] ✅ Passou (vê o log)
  - [ ] ❌ Falhou (sem log)

---

## 🔍 Verificação do Console (Desenvolvedor)

Abra DevTools (F12) e veja se há erros:

```
Pressione: F12 (ou Ctrl+Shift+I)
Vá para: Aba "Console"
Procure por: Erros vermelhos ❌

Esperado: Nenhum erro relacionado a dropdowns ✅
```

### Logs Esperados
```
✅ 🔍 [MapaPage] ... - Iniciando busca de município...
✅ ✅ [MapaPage] ... - Município encontrado
✅ 🗺️ [MapaPage] ... - Município selecionado no mapa
```

---

## 📊 Resultado Final

| Teste | Resultado |
|-------|-----------|
| Teste 1 | [ ] ✅ [ ] ❌ |
| Teste 2 | [ ] ✅ [ ] ❌ |
| Teste 3 | [ ] ✅ [ ] ❌ |
| Teste 4 | [ ] ✅ [ ] ❌ |
| Teste 5 | [ ] ✅ [ ] ❌ |
| Teste 6 | [ ] ✅ [ ] ❌ |
| Teste 7 | [ ] ✅ [ ] ❌ |
| Teste 8 | [ ] ✅ [ ] ❌ |
| Teste 9 | [ ] ✅ [ ] ❌ |
| Teste 10 | [ ] ✅ [ ] ❌ |
| Teste 11 | [ ] ✅ [ ] ❌ |
| Teste 12 | [ ] ✅ [ ] ❌ |
| Teste 13 | [ ] ✅ [ ] ❌ |
| **TOTAL** | **__ / 13** |

### Critério de Sucesso
- ✅ **13/13 testes passaram:** Tudo funcionando perfeitamente!
- ✅ **12/13 testes passaram:** Muito bom!
- ⚠️ **10-11/13 testes passaram:** OK, mas verificar os que falharam
- ❌ **Menos de 10/13:** Contatar dev para investigar

---

## 🐛 Se Algo Falhar

### Problema: Dropdown não filtra enquanto digito
**Solução:**
1. Abra DevTools (F12)
2. Veja se há erros no console
3. Verifique se o arquivo foi salvo: `src/app/mapa/page.tsx`
4. Recarregue a página (F5)
5. Tente novamente

### Problema: Campo de Município sempre desabilitado
**Solução:**
1. Verifique se selecionou um Estado primeiro
2. Clique em um Estado da lista
3. Depois o campo de Município deve se habilitar

### Problema: Busca por Município não funciona
**Solução:**
1. Certifique-se que há municípios para o Estado selecionado
2. Verifique console por mensagens de erro
3. Tente clicar em "Buscar" manualmente

### Problema: Console mostra erros TypeScript
**Solução:**
1. Verificar se há erros de sintaxe
2. Executar: `npm run build` para compilar
3. Se ainda houver erro, reabra VS Code

---

## 📞 Informações para Debug

Se precisar reportar um problema, inclua:

```
1. Qual teste falhou?
   [ ] Estado [ ] Município [ ] Outro

2. O que você esperava?
   
3. O que aconteceu de verdade?
   
4. Prints de erros do console? (Copy/paste aqui)
   
5. Sistema operacional?
   [ ] Windows [ ] Mac [ ] Linux
```

---

## ✨ Bom Funcionamento Indica

- ✅ Código carregado corretamente
- ✅ Sem erros de compilação
- ✅ Lógica de filtro funcionando
- ✅ UI responsiva
- ✅ Telemetria ativa

---

## 🎯 Próximo Passo

Após passar em todos os testes:
1. Testar em dados reais (municípios do seu dataset)
2. Testar em diferentes navegadores (Chrome, Firefox, Safari)
3. Testar em mobile (responsive)
4. Reportar sucesso ou qualquer issue encontrada

---

**Criado em:** 23 de outubro de 2025  
**Versão:** 1.0  
**Status:** Pronto para teste ✅
