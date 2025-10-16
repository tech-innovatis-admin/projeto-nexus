/**
 * Schema de Propriedades de Municípios
 * 
 * Este arquivo documenta as possíveis chaves e variações de propriedades
 * esperadas em features GeoJSON de municípios. Serve como referência para:
 * 
 * 1. Entender quais campos estão disponíveis por source de dados
 * 2. Estender extractMuniFields com novos fallbacks
 * 3. Debugar dados ausentes ou inesperados
 * 
 * Estratégia: Cada fonte de dados pode nomear campos diferentemente.
 * Os fallbacks em extractMuniFields seguem essa ordem de prioridade.
 */

/**
 * ============================================================
 * FONTE: Dados Gerais (GeoJSON principal)
 * ============================================================
 * 
 * Propriedades típicas (verificadas e em uso):
 */
export const schemaDataosGerais = {
  // Identifição
  code_muni: "3550308",              // IBGE 7-dígitos (primary)
  name_state: "SP",                  // UF (primary)
  
  // Nomes
  nome_municipio: "São Paulo",       // Nome completo (primary)
  
  // Dados Administrativos (exemplos)
  nome2024: "Prefeito XYZ",
  sigla_partido2024: "PT",
  mandato: "2024-2028",
  
  // Dados Demográficos
  POPULACAO_FORMAT: "11.451.245",    // Population formatted
  DOMICILIO_FORMAT: "3.850.092",     // Households formatted
  
  // Plano Diretor
  PD_ALTERADA: "Sim",
  PD_ANO: "2014",
  pd_venci: "Não",
  VALOR_PD: "R$ 150.000,00",
  
  // REURB (Regularização Fundiária)
  reurb_exist: "Sim",
  REURB_ANO: "2020",
  
  // PMSB (Plano de Saneamento Básico)
  plano_saneamento_existe: "Sim",
  plano_saneamento_ano: "2019",
  VALOR_PMSB: "R$ 500.000,00",
} as const;

/**
 * ============================================================
 * FONTE: Produtos (GeoJSON alternativo, se existir)
 * ============================================================
 * 
 * Propriedades esperadas:
 */
export const schemaProdutos = {
  // Identificação
  municipio: "São Paulo",            // Nome (alternativa)
  name_state: "SP",
  
  // Valores/Orçamentos
  VALOR_PMSB: "R$ 500.000,00",
  VALOR_PD: "R$ 150.000,00",
  VALOR_CTM: "R$ 75.000,00",         // Cadastro Técnico Municipal
} as const;

/**
 * ============================================================
 * VARIAÇÕES ESPERADAS (Fallbacks)
 * ============================================================
 */
export const fallbackKeys = {
  // UF (Unidade Federativa)
  uf: [
    "UF",                             // Padrão IBGE
    "uf",
    "sigla_uf",
    "UF_origem",
    "UF_destino",
    "name_state",                    // CartoDB/Leaflet
    "state",
    "STATE",
  ],

  // IBGE Code
  ibge: [
    "code_muni",                     // Primary (7-dígitos)
    "codigo_ibge",
    "cod_ibge",
    "CD_MUN",                        // Variação maiúscula
    "COD_MUNIC",
    "codigo_ibge7",
    "codigo_ibge_7",
    "IBGE",
  ],

  // Nome do Município
  nome: [
    "nome",                          // Genérico
    "nome_munic",
    "nome_municipio",                // Primary
    "NM_MUN",                        // Variação maiúscula
    "NM_MUNICIP",
    "municipio",                     // Alternativa
    "MUNICIPIO",
  ],
} as const;

/**
 * ============================================================
 * PRÓXIMAS EXTENSÕES SUGERIDAS
 * ============================================================
 */

/**
 * Exemplo: Adicionar Região Geográfica
 * 
 * Padrão IBGE de regiões: Nordeste, Sudeste, Sul, Norte, Centro-Oeste
 */
export const extensionRegion = {
  fallbackKeys: [
    "regiao",
    "REGIAO",
    "region",
    "REGION",
    "nome_regiao",
    "NOME_REGIAO",
  ],
  
  mapValores: {
    "1": "Norte",
    "2": "Nordeste",
    "3": "Sudeste",
    "4": "Sul",
    "5": "Centro-Oeste",
  } as const,
};

/**
 * Exemplo: Adicionar Índices (IDH, IDHM, etc.)
 */
export const extensionIndices = {
  IDHM: {
    fallbackKeys: ["IDHM", "idhm", "idhm_municipio"],
    type: "float", // 0.0 a 1.0
    format: "percentage", // Mostrar como %
  },
  
  Gini: {
    fallbackKeys: ["Gini", "gini", "coeficiente_gini"],
    type: "float",
  },
  
  PopulacaoAtiva: {
    fallbackKeys: ["pop_ativa", "POP_ATIVA", "populacao_ativa"],
    type: "integer",
  },
} as const;

/**
 * ============================================================
 * HELPER: Mapear schema a função
 * ============================================================
 */

/**
 * Tipo genérico para estender MuniFields
 * Uso: export type MuniFieldsExtended = MuniFields & { regiao?: string };
 */
export interface MuniFieldsExtensible {
  uf: string;
  ibge: string;
  nome: string;
  // [key: string]: any; // Para extensões futuras
}

/**
 * ============================================================
 * NOTAS DE MANUTENÇÃO
 * ============================================================
 * 
 * 1. **Ao adicionar nova fonte de dados:**
 *    - Documente as chaves esperadas aqui
 *    - Estenda fallbackKeys se encontrar nomes novos
 *    - Atualize extractMuniFields em mapHoverHandlers.ts
 * 
 * 2. **Ao renomear propriedades no GeoJSON:**
 *    - Adicione a chave ANTIGA aos fallbacks
 *    - Mantenha compatibilidade backward (nunca remova keys antigas)
 *    - Documente a mudança em CHANGELOG.md
 * 
 * 3. **Para debugging:**
 *    - Use logHoverDebug("extract-fields", muniName, properties)
 *    - Imprima campos extraídos no console
 *    - Compare com este schema para entender fallbacks
 * 
 * 4. **Para testes:**
 *    - Use objetos deste arquivo em unit tests
 *    - Garanta que fallbacks funcionam para cada variação
 *    - Simule dados faltando (propriedade undefined)
 */
