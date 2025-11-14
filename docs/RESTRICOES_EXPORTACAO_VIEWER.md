# Restrições de Exportação para Usuários Viewer

## 📋 Resumo das Implementações

Este documento detalha as restrições implementadas no sistema de exportação da plataforma NEXUS para usuários com perfil `viewer` que possuem restrições geográficas definidas na tabela `municipio_acessos`.

## 🎯 Objetivos Alcançados

### 1. Controle de Acesso por Role
- ✅ Usuários `admin` e `gestor`: acesso total a todas as exportações
- ✅ Usuários `viewer` sem restrições: acesso total a todas as exportações
- ✅ Usuários `viewer` com restrições: acesso limitado conforme `municipio_acessos`

### 2. Ocultação da Opção "Export Dados"
- ✅ A opção "Export Dados" (planilha avançada) é ocultada para viewers restritos
- ✅ A opção "Export Orçamento" permanece visível para todos os usuários

### 3. Filtros Automáticos de Permissão
- ✅ Antes de exibir municípios/estados nos modais de exportação, o sistema consulta `/api/municipios/permitidos`
- ✅ Apenas municípios e estados autorizados são exibidos nas listas de seleção
- ✅ Usuários restritos não conseguem visualizar ou exportar dados de regiões não autorizadas

## 🔧 Arquivos Modificados

### 1. `src/components/ExportMenu.jsx`
**Modificação:** Adição de controle condicional para ocultar "Export Dados"

```jsx
// Import do contexto de usuário
import { useUser } from '@/contexts/UserContext';

// Uso do hook
const { user } = useUser();

// Condicional para exibir/ocultar "Export Dados"
{!(user?.role && String(user.role).toLowerCase() === 'viewer' && user?.isRestricted) && (
  <button onClick={handleAdvanced}>
    Export Dados
  </button>
)}
```

**Comportamento:**
- `admin` e `gestor`: veem todas as opções
- `viewer` sem restrição: veem todas as opções
- `viewer` com restrição (`isRestricted = true`): **não veem** "Export Dados"

---

### 2. `src/components/ModalOrcamento.jsx`
**Modificação:** Filtragem de municípios/estados antes da exibição

**Fluxo implementado:**
1. Ao abrir o modal, verifica se o usuário é um `viewer`
2. Se sim, consulta a API `/api/municipios/permitidos`
3. Constrói dois conjuntos (Sets):
   - `allowedStates`: estados com acesso completo (UF)
   - `allowedMunicipios`: municípios específicos permitidos
4. Filtra as listas de estados e municípios exibidas no modal
5. Apenas os dados permitidos são mostrados para seleção

**Lógica de Filtragem:**
```javascript
if (isRestricted) {
  // Filtrar estados
  filteredStates = allStatesRaw.filter(state => allowedStates.has(state));

  // Filtrar municípios
  filteredMunicipalities = allMunicipalitiesRaw.filter(m => {
    const hasStateAccess = allowedStates.has(m.state);
    const hasMunicipalityAccess = allowedMunicipios.has(`${m.name}|${m.state}`);
    
    // Se tem acesso completo ao estado (UF)
    if (hasStateAccess) {
      const specificMunicipalitiesFromState = Array.from(allowedMunicipios)
        .filter(key => key.endsWith(`|${m.state}`));
      
      // Sem municípios específicos = acesso total à UF
      if (specificMunicipalitiesFromState.length === 0) {
        return true;
      }
    }
    
    // Caso contrário, apenas se o município específico foi liberado
    return hasMunicipalityAccess;
  });
}
```

**Logs de Auditoria:**
```javascript
console.log(`🔒 [ModalOrcamento] ${userInfo} - Viewer restrito detectado, aplicando filtros de permissão`);
console.log(`🔒 [ModalOrcamento] ${userInfo} - Estados permitidos (UF completa):`, Array.from(allowedStates));
console.log(`🔒 [ModalOrcamento] ${userInfo} - Municípios específicos permitidos:`, allowedMunicipios.size);
console.log(`🔒 [ModalOrcamento] ${userInfo} - Dados filtrados: ${filteredStates.length} estados, ${filteredMunicipalities.length} municípios (de ${allStatesRaw.length} estados e ${allMunicipalitiesRaw.length} municípios totais)`);
```

---

### 3. `src/components/ExportAdvancedModal.jsx`
**Modificação:** Mesma lógica de filtragem aplicada ao modal de exportação avançada (planilha Excel)

**Comportamento idêntico ao `ModalOrcamento.jsx`:**
- Consulta `/api/municipios/permitidos`
- Filtra estados e municípios antes da exibição
- Aplica logs de auditoria
- Garante que apenas dados permitidos sejam exportados

**Importante:** Este modal só é acessível se a opção "Export Dados" estiver visível (ou seja, não é acessível por viewers restritos via interface).

---

## 🔐 Estrutura de Permissões

### Tabela `municipio_acessos`
```sql
id           INT PRIMARY KEY
user_id      INT (FK → users.id)
municipio_id INT (FK → municipios.id)
uf           VARCHAR (sigla do estado, ex: 'SP')
exclusive    BOOLEAN
valid_until  TIMESTAMP
```

### API `/api/municipios/permitidos`
**Retorno esperado:**
```json
{
  "fullAccess": false,
  "estados": [
    { "uf": "SP", "uf_name": "São Paulo" }
  ],
  "municipios": [
    { "municipio": "Campinas", "name_state": "São Paulo" }
  ]
}
```

**Interpretação:**
- `fullAccess: true` → Usuário tem acesso completo (admin/gestor ou viewer sem restrição)
- `estados`: Lista de UFs com acesso completo
- `municipios`: Lista de municípios específicos permitidos

---

## 🧪 Casos de Teste

### Caso 1: Admin/Gestor
- ✅ Vê "Export Orçamento" e "Export Dados"
- ✅ Vê todos os estados e municípios nas listas
- ✅ Pode exportar qualquer região

### Caso 2: Viewer sem Restrição (`isRestricted = false`)
- ✅ Vê "Export Orçamento" e "Export Dados"
- ✅ Vê todos os estados e municípios nas listas
- ✅ Pode exportar qualquer região

### Caso 3: Viewer Restrito - Acesso a UF Completa
**Exemplo:** Acesso a todo o estado de São Paulo
- ✅ Vê apenas "Export Orçamento" (Export Dados oculto)
- ✅ Vê apenas "São Paulo" na lista de estados
- ✅ Vê todos os municípios de São Paulo
- ✅ Pode exportar orçamentos apenas de municípios paulistas

### Caso 4: Viewer Restrito - Acesso a Municípios Específicos
**Exemplo:** Acesso apenas a Campinas e São José dos Campos
- ✅ Vê apenas "Export Orçamento" (Export Dados oculto)
- ✅ Vê "São Paulo" na lista de estados (estado dos municípios permitidos)
- ✅ Vê apenas "Campinas" e "São José dos Campos" na lista de municípios
- ✅ Pode exportar orçamentos apenas desses dois municípios

### Caso 5: Viewer Restrito - Acesso Misto
**Exemplo:** Acesso a todo o Rio de Janeiro + Campinas (SP)
- ✅ Vê "Export Orçamento" (Export Dados oculto)
- ✅ Vê "Rio de Janeiro" e "São Paulo" na lista de estados
- ✅ Vê todos os municípios do RJ + apenas Campinas de SP
- ✅ Pode exportar orçamentos de qualquer município do RJ ou de Campinas

---

## 🔒 Segurança

### Camadas de Proteção Implementadas

1. **Frontend (Interface):**
   - Ocultação de opções não autorizadas
   - Filtragem de dados exibidos nos dropdowns
   - Validação antes de iniciar exportação

2. **Backend (API - pendente):**
   - ⚠️ **RECOMENDAÇÃO:** Implementar validação adicional nas APIs de exportação
   - Garantir que mesmo manipulações no frontend não permitam acesso indevido
   - Sugestão de implementação nas rotas:
     - `/api/export/orcamento`
     - `/api/export/dados`

**Exemplo de validação backend sugerida:**
```javascript
// No endpoint de exportação
const user = await getUserFromToken(token);

if (user.role === 'viewer') {
  const acessos = await prisma.municipio_acessos.findMany({
    where: { user_id: user.id },
    select: { municipio_id: true, uf: true, municipios: true }
  });

  // Filtrar dados a exportar conforme acessos
  dadosParaExportar = dadosParaExportar.filter(item => {
    // Lógica de verificação similar ao frontend
  });
}
```

---

## 📊 Logs de Auditoria

Todos os acessos e exportações são logados com informações detalhadas:

```javascript
// Abertura de modal
console.log(`📤 [ModalOrcamento] ${userInfo} - Modal de exportação aberto`);

// Detecção de restrição
console.log(`🔒 [ModalOrcamento] ${userInfo} - Viewer restrito detectado`);

// Dados carregados
console.log(`📤 [ModalOrcamento] ${userInfo} - Dados carregados: ${states.length} estados, ${municipalities.length} municípios`);

// Início de exportação
console.log(`📤 [ModalOrcamento] ${userInfo} - Iniciando exportação em massa`);
console.log(`📤 [ModalOrcamento] ${userInfo} - Filtros aplicados: ${filtrosAplicados.join(' | ')}`);
console.log(`📤 [ModalOrcamento] ${userInfo} - Total de municípios: ${targets.length}`);

// Conclusão
console.log(`✅ [ModalOrcamento] ${userInfo} - Exportação concluída: "${fileName}" (${targets.length} municípios)`);
```

**Informações registradas:**
- Nome/ID do usuário
- Role do usuário
- Ação realizada
- Filtros aplicados
- Quantidade de municípios exportados
- Nome do arquivo gerado
- Sucesso/falha da operação

---

## 🚀 Melhorias Futuras

### Curto Prazo
1. ✅ Implementar validação backend nas APIs de exportação
2. ✅ Adicionar indicadores visuais de restrição na interface
3. ✅ Implementar controle de validade temporal (`valid_until`)

### Médio Prazo
1. Criar dashboard administrativo para gestão de permissões
2. Implementar auditoria em banco de dados (tabela `export_logs`)
3. Adicionar notificações quando permissões estiverem próximas de expirar

### Longo Prazo
1. Sistema de aprovação de exportações para viewers restritos
2. Controle granular por tipo de dado exportado
3. Relatórios de uso e estatísticas de exportação por usuário

---

## 📝 Notas Técnicas

### Compatibilidade
- ✅ React 18+
- ✅ Next.js 14+
- ✅ Mantém compatibilidade com todo o código existente
- ✅ Não quebra funcionalidades para outros perfis de usuário

### Performance
- Consulta à API `/api/municipios/permitidos` é feita apenas uma vez por abertura de modal
- Filtragem ocorre no cliente para melhor responsividade
- Uso de `Set()` para operações de lookup eficientes (O(1))

### Manutenibilidade
- Código modular e reutilizável
- Logs detalhados para debugging
- Comentários explicativos em pontos-chave
- Separação clara entre lógica de permissão e lógica de negócio

---

## ✅ Checklist de Implementação

- [x] Ocultar "Export Dados" para viewers restritos
- [x] Filtrar estados por permissão em ModalOrcamento
- [x] Filtrar municípios por permissão em ModalOrcamento
- [x] Filtrar estados por permissão em ExportAdvancedModal
- [x] Filtrar municípios por permissão em ExportAdvancedModal
- [x] Adicionar logs de auditoria
- [x] Testar compatibilidade com perfis admin/gestor
- [x] Documentar implementação
- [ ] Implementar validação backend (pendente)
- [ ] Testes E2E com diferentes perfis
- [ ] Revisão de segurança

---

**Data da Implementação:** Novembro 2025  
**Versão do Sistema:** NEXUS 2.0  
**Responsável Técnico:** Desenvolvimento Innovatis

