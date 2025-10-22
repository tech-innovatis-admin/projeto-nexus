// UFs com abertura comercial
export const UF_ABERTURA = [
  'MA', 'PB', 'PE', 'PI', 'RN', 'SE', 'AL', 'BA','CE', 'MT' // Nordeste
] as const;
export type UFAbertura = typeof UF_ABERTURA[number];

export function isUFAbertura(uf: string | undefined | null): boolean {
  if (!uf) return false;
  const upper = String(uf).toUpperCase();
  return (UF_ABERTURA as readonly string[]).includes(upper);
}

// Todas as regiões do Brasil com suas UFs
export const REGIOES_BRASIL: Record<string, readonly string[]> = {
  Norte: ['AC','AM','AP','PA','RO','RR','TO'] as const,
  Nordeste: ['AL','BA','CE','MA','PB','PE','PI','RN','SE'] as const,
  'Centro-Oeste': ['DF','GO','MS','MT'] as const,
  Sudeste: ['ES','MG','RJ','SP'] as const,
  Sul: ['PR','RS','SC'] as const,
};

// Todas as UFs do Brasil em ordem alfabética
export const TODAS_UFS = [
  'AC','AL','AM','AP','BA','CE','DF','ES','GO','MA','MG','MS','MT','PA','PB','PE','PI','PR','RJ','RN','RO','RR','RS','SC','SE','SP','TO'
] as const;

// Função para verificar se uma região tem abertura comercial
export function isRegiaoAbertura(regiao: string): boolean {
  if (regiao === 'Nordeste') return true;
  if (regiao === 'Centro-Oeste') return true; // MT tem  abertura
  return false;
}

// Agrupamento por região para o filtro de abertura (mantido para compatibilidade)
export const ABERTURA_REGIOES: Record<string, readonly string[]> = {
  Nordeste: ['AL','BA','CE','MA','PB','PE','PI','RN','SE'] as const,
};

// Configuração centralizada dos campos de produtos
// Facilita manutenção e evita ajustes manuais em múltiplos arquivos
// origemKey pode ser null para produtos que só existem nas periferias
export const PROD_FIELDS = {
  VALOR_PD: {
    label: 'Plano Diretor',
    shortLabel: 'Plano Diretor',
    origemKey: 'valor_pd_num_origem',
    destinoKey: 'valor_pd_num_destino',
    category: 'planejamento'
  },
  VALOR_PMBSB: {
    label: 'Plano Municipal de Saneamento Básico',
    shortLabel: 'PMSB',
    origemKey: 'valor_pmsb_num_origem',
    destinoKey: 'valor_pmsb_num_destino',
    category: 'planejamento'
  },
  VALOR_CTM: {
    label: 'IPTU Legal',
    shortLabel: 'IPTU Legal',
    // VALOR_CTM só existe nas periferias (destinos), não nos polos (origens)
    origemKey: null,
    destinoKey: 'valor_ctm_num_destino',
    category: 'tributario'
  },
  VALOR_DEC_AMBIENTAL: {
    label: 'Plano Decenal do Meio Ambiente',
    shortLabel: 'Plano Decenal do Meio Ambiente',
    origemKey: 'VALOR_DEC_AMBIENTAL_NUM_origem',
    destinoKey: 'VALOR_DEC_AMBIENTAL_NUM_destino',
    category: 'ambiental'
  },
  VALOR_PLHIS: {
    label: 'Plano Habitacional',
    shortLabel: 'PLHIS',
    origemKey: 'PLHIS_origem',
    destinoKey: 'PLHIS_destino',
    category: 'habitacional'
  },
  VALOR_START: {
    label: 'Start Lab',
    shortLabel: 'Start Lab',
    origemKey: 'valor_start_iniciais_finais_origem',
    destinoKey: 'valor_start_iniciais_finais_destino',
    category: 'educacao'
  },
  VALOR_LIVRO: {
    label: 'Programa Saber+',
    shortLabel: 'Saber+',
    origemKey: 'LIVRO_FUND_1_2_origem',
    destinoKey: 'LIVRO_FUND_1_2_destino',
    category: 'educacao'
  },
  VALOR_PVA: {
    label: 'Procon Vai às Aulas',
    shortLabel: 'Procon Vai às Aulas',
    origemKey: 'PVA_origem',
    destinoKey: 'PVA_destino',
    category: 'educacao'
  },
  VALOR_EDUCAGAME: {
    label: 'Educa Game',
    shortLabel: 'EducaGame',
    origemKey: 'educagame_origem',
    destinoKey: 'educagame_destino',
    category: 'educacao'
  },
  VALOR_REURB: {
    label: 'REURB',
    shortLabel: 'REURB',
    origemKey: 'valor_reurb_origem',
    destinoKey: 'valor_reurb_destino',
    category: 'regularizacao'
  },
  VALOR_DESERT: {
    label: 'Plano de Desertificação',
    shortLabel: 'Plano de Desertificação',
    origemKey: 'VALOR_DESERT_NUM_origem',
    destinoKey: 'VALOR_DESERT_NUM_destino',
    category: 'ambiental'
  }
} as const;

// Produtos disponíveis para filtro e agregação (mantido para compatibilidade)
export const PRODUCTS = Object.entries(PROD_FIELDS).map(([key, config]) => ({
  key: key as keyof typeof PROD_FIELDS,
  label: config.shortLabel,
  origemvalorKey: config.origemKey as string | null,
  destinovalorKey: config.destinoKey
}));

export type ProductKey = typeof PRODUCTS[number]['key'];
export type ProdFieldKey = keyof typeof PROD_FIELDS;

