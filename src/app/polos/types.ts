/**
 * Tipos para a página de Polos
 * Baseado na estrutura de base_municipios.geojson
 */

// Propriedades do município no GeoJSON (colunas que serão usadas)
export interface MunicipioProperties {
  // Identificação
  code_muni: string;
  name_state: string;
  nome_municipio: string;

  // Valores dos produtos (numéricos)
  valor_total_produtos: number | null;     // Valor total dos produtos
  valor_reurb_: number | null;             // REURB
  valor_pmsb_num: number | null;           // PMSB
  valor_ctm_num: number | null;            // IPTU Legal
  VALOR_DEC_AMBIENTAL_NUM: number | null;  // Plano Decenal do Meio Ambiente
  valor_pd_num: number | null;             // Plano Diretor
  VALOR_DESERT_NUM: number | null;         // Plano de Desertificação
  educagame: number | null;                // EducaGame
  PVA_minimo: number | null;               // Procon Vai às Aulas
  LIVRO_FUND_1_2: number | null;           // Saber+
  valor_start_iniciais_finais_: number | null; // Start Lab
  PLHIS: number | null;                    // PLHIS
}

// Feature GeoJSON do município
export interface MunicipioFeature {
  type: 'Feature';
  properties: MunicipioProperties;
  geometry: {
    type: 'MultiPolygon' | 'Polygon';
    coordinates: number[][][] | number[][][][];
  } | null;
}

// FeatureCollection de municípios
export interface MunicipiosGeoJSON {
  type: 'FeatureCollection';
  features: MunicipioFeature[];
}

// Município com relacionamento (do PostgreSQL)
export interface MunicipioRelacionamento {
  row_index: number;
  name_state: string;
  code_muni: string;
  name_muni: string;
  relacionamento_ativo: boolean;
  relacionamento_criado: string | null;
  relacionamento_editado: string | null;
}

// Mapeamento de produtos para suas colunas
export const PRODUTOS_CONFIG = {
  valor_total: {
    campo: 'valor_total_produtos',
    nome: 'Valor Total',
    descricao: 'Soma total dos produtos',
    category: 'total'
  },
  reurb: {
    campo: 'valor_reurb_',
    nome: 'REURB',
    descricao: 'Regularização Fundiária Urbana',
    category: 'regularizacao'
  },
  pmsb: {
    campo: 'valor_pmsb_num',
    nome: 'PMSB',
    descricao: 'Plano Municipal de Saneamento Básico',
    category: 'planejamento'
  },
  iptu_legal: {
    campo: 'valor_ctm_num',
    nome: 'IPTU Legal',
    descricao: 'Cadastro Técnico Multifinalitário',
    category: 'tributario'
  },
  dec_ambiental: {
    campo: 'VALOR_DEC_AMBIENTAL_NUM',
    nome: 'Plano Decenal do Meio Ambiente',
    descricao: 'Plano Decenal Ambiental',
    category: 'ambiental'
  },
  plano_diretor: {
    campo: 'valor_pd_num',
    nome: 'Plano Diretor',
    descricao: 'Plano Diretor Municipal',
    category: 'planejamento'
  },
  plano_desertificacao: {
    campo: 'VALOR_DESERT_NUM',
    nome: 'Plano de Desertificação',
    descricao: 'Plano de Combate à Desertificação',
    category: 'ambiental'
  },
  educagame: {
    campo: 'educagame',
    nome: 'EducaGame',
    descricao: 'Plataforma Educacional Gamificada',
    category: 'educacao'
  },
  pva: {
    campo: 'PVA_minimo',
    nome: 'Procon Vai às Aulas',
    descricao: 'Programa de Educação para Consumo',
    category: 'educacao'
  },
  saber_mais: {
    campo: 'LIVRO_FUND_1_2',
    nome: 'Saber+',
    descricao: 'Material Didático',
    category: 'educacao'
  },
  start_lab: {
    campo: 'valor_start_iniciais_finais_',
    nome: 'Start Lab',
    descricao: 'Laboratórios de Tecnologia',
    category: 'educacao'
  },
  plhis: {
    campo: 'PLHIS',
    nome: 'PLHIS',
    descricao: 'Plano Local de Habitação de Interesse Social',
    category: 'habitacional'
  }
} as const;

export type ProdutoKey = keyof typeof PRODUTOS_CONFIG;

// Lista de estados brasileiros
export const ESTADOS_BRASIL = [
  'Acre', 'Alagoas', 'Amapá', 'Amazonas', 'Bahia', 'Ceará', 
  'Distrito Federal', 'Espírito Santo', 'Goiás', 'Maranhão', 
  'Mato Grosso', 'Mato Grosso do Sul', 'Minas Gerais', 'Pará', 
  'Paraíba', 'Paraná', 'Pernambuco', 'Piauí', 'Rio de Janeiro', 
  'Rio Grande do Norte', 'Rio Grande do Sul', 'Rondônia', 'Roraima', 
  'Santa Catarina', 'São Paulo', 'Sergipe', 'Tocantins'
] as const;

// Siglas de estados
export const SIGLAS_ESTADOS: Record<string, string> = {
  'Acre': 'AC', 'Alagoas': 'AL', 'Amapá': 'AP', 'Amazonas': 'AM',
  'Bahia': 'BA', 'Ceará': 'CE', 'Distrito Federal': 'DF', 
  'Espírito Santo': 'ES', 'Goiás': 'GO', 'Maranhão': 'MA',
  'Mato Grosso': 'MT', 'Mato Grosso do Sul': 'MS', 'Minas Gerais': 'MG',
  'Pará': 'PA', 'Paraíba': 'PB', 'Paraná': 'PR', 'Pernambuco': 'PE',
  'Piauí': 'PI', 'Rio de Janeiro': 'RJ', 'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS', 'Rondônia': 'RO', 'Roraima': 'RR',
  'Santa Catarina': 'SC', 'São Paulo': 'SP', 'Sergipe': 'SE', 'Tocantins': 'TO'
};
