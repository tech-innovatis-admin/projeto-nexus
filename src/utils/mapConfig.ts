// UFs com abertura comercial
export const UF_ABERTURA = [
  'AL','BA','CE','MA','PB','PE','PI','RN','SE', // Nordeste
  'MT' // Mato Grosso
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
  if (regiao === 'Centro-Oeste') return true; // MT tem abertura
  return false;
}

// Agrupamento por região para o filtro de abertura (mantido para compatibilidade)
export const ABERTURA_REGIOES: Record<string, readonly string[]> = {
  Nordeste: ['AL','BA','CE','MA','PB','PE','PI','RN','SE'] as const,
};


// Produtos disponíveis para filtro e agregação
// Agora separando chaves por origem e destino para evitar duplicação
export const PRODUCTS = [
  { key: 'VALOR_PD', label: 'PD', origemvalorKey: 'valor_pd_num_origem', destinovalorKey: 'valor_pd_num_destino' },
  { key: 'VALOR_PMBSB', label: 'PMSB', origemvalorKey: 'valor_pmsb_num_origem', destinovalorKey: 'valor_pmsb_num_destino' },
  { key: 'VALOR_CTM', label: 'CTM', origemvalorKey: 'valor_ctm_num_origem', destinovalorKey: 'valor_ctm_num_destino' },
  { key: 'VALOR_DEC_AMBIENTAL', label: 'Dec. Ambiental', origemvalorKey: 'VALOR_DEC_AMBIENTAL_NUM_origem', destinovalorKey: 'VALOR_DEC_AMBIENTAL_NUM_destino' },
  { key: 'VALOR_PLHIS', label: 'PLHIS', origemvalorKey: 'PLHIS_origem', destinovalorKey: 'PLHIS_destino' },
  { key: 'VALOR_START', label: 'Start', origemvalorKey: 'valor_start_iniciais_finais_origem', destinovalorKey: 'valor_start_iniciais_finais_destino' },
  { key: 'VALOR_LIVRO', label: 'Livros', origemvalorKey: 'LIVRO_FUND_1_2_origem', destinovalorKey: 'LIVRO_FUND_1_2_destino' },
  { key: 'VALOR_PVA', label: 'PVA', origemvalorKey: 'PVA_origem', destinovalorKey: 'PVA_destino' },
  { key: 'VALOR_EDUCAGAME', label: 'EducaGame', origemvalorKey: 'educagame_origem', destinovalorKey: 'educagame_destino' },
  { key: 'VALOR_REURB', label: 'REURB', origemvalorKey: 'valor_reurb_origem', destinovalorKey: 'valor_reurb_destino' },
  { key: 'VALOR_DESERT', label: 'Desert.', origemvalorKey: 'VALOR_DESERT_NUM_origem', destinovalorKey: 'VALOR_DESERT_NUM_destino' },
] as const;
export type ProductKey = typeof PRODUCTS[number]['key'];

