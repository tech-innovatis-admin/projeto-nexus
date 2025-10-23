/**
 * Utilitários para classificação de produtos municipais
 * 
 * Este módulo contém funções puras para determinar elegibilidade de venda
 * de Plano Diretor (PD) e Plano Municipal de Saneamento Básico (PMSB).
 * 
 * @module utils/produtos
 */

// Constantes de vigência (anos)
export const PD_VIGENCIA_ANOS = 10;
export const PMSB_VIGENCIA_ANOS = 4;
export const EDUCAGAME_POPULACAO_MAX = 20000; // Máximo de habitantes para Educagame

/**
 * Interface para propriedades de município necessárias para classificação
 */
export interface PropriedadesMunicipio {
  PD_ALTERADA?: string | null;
  PD_ANO?: string | number | null;
  plano_saneamento_existe?: string | null;
  plano_saneamento_ano?: string | number | null;
  VALOR_PD?: string | number | null;
  VALOR_PMSB?: string | number | null;
  [key: string]: any;
}

/**
 * Interface para item de produto elegível
 */
export interface ItemProduto {
  chave: string;
  nome: string;
  valor: string | number | null;
  ano?: number | null;
  status: 'vencido' | 'em_dia' | 'nao_tem';
  motivo?: string;
}

/**
 * Interface para resultado de classificação
 */
export interface ClassificacaoElegibilidade {
  vender: ItemProduto[];
  naoVender: ItemProduto[];
}

/**
 * Normaliza texto removendo acentos, espaços extras e convertendo para minúsculas
 * 
 * @param texto - Texto a ser normalizado
 * @returns Texto normalizado ou string vazia se input inválido
 * 
 * @example
 * normalizarTexto("São Paulo") // "sao paulo"
 * normalizarTexto("  SIM  ") // "sim"
 * normalizarTexto(null) // ""
 */
export function normalizarTexto(texto: string | undefined | null): string {
  if (!texto) return '';
  return texto
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim()
    .toLowerCase();
}

/**
 * Valida se um ano é válido (numérico e > 1900)
 * 
 * @param ano - Ano a ser validado
 * @returns true se ano válido, false caso contrário
 */
export function isAnoValido(ano: string | number | null | undefined): boolean {
  if (!ano) return false;
  const anoNum = Number(ano);
  return !isNaN(anoNum) && anoNum > 1900 && anoNum <= new Date().getFullYear() + 10;
}

/**
 * Verifica se o município possui Plano Diretor
 * 
 * @param props - Propriedades do município
 * @returns true se possui PD, false caso contrário
 */
export function temPlanoDiretor(props: PropriedadesMunicipio): boolean {
  return normalizarTexto(props.PD_ALTERADA) === 'sim';
}

/**
 * Verifica se o Plano Diretor está vencido
 * 
 * Regra: PD válido por 10 anos. Vencido se (PD_ANO + 10 < anoAtual)
 * 
 * @param props - Propriedades do município
 * @param anoAtual - Ano atual (padrão: ano corrente)
 * @returns true se PD vencido, false caso contrário
 * 
 * @example
 * // Considerando ano atual = 2025
 * isPDVencido({ PD_ALTERADA: 'sim', PD_ANO: 2014 }) // true (2014+10=2024 < 2025)
 * isPDVencido({ PD_ALTERADA: 'sim', PD_ANO: 2020 }) // false (2020+10=2030 >= 2025)
 * isPDVencido({ PD_ALTERADA: 'não' }) // false (não tem PD)
 */
export function isPDVencido(props: PropriedadesMunicipio, anoAtual: number = new Date().getFullYear()): boolean {
  if (!temPlanoDiretor(props)) return false;
  
  const pdAno = props.PD_ANO;
  if (!isAnoValido(pdAno)) return false;
  
  const ano = Number(pdAno);
  return ano + PD_VIGENCIA_ANOS < anoAtual;
}

/**
 * Verifica se o município possui PMSB
 * 
 * @param props - Propriedades do município
 * @returns true se possui PMSB (sim ou em elaboração), false caso contrário
 */
export function temPMSB(props: PropriedadesMunicipio): boolean {
  const status = normalizarTexto(props.plano_saneamento_existe);
  return status === 'sim' || status === 'em elaboracao';
}

/**
 * Verifica se o PMSB está vencido
 * 
 * Regra: PMSB válido por 4 anos. Vencido se (status='sim' && PMSB_ANO + 4 < anoAtual)
 * Nota: "em elaboração" não é considerado vencido
 * 
 * @param props - Propriedades do município
 * @param anoAtual - Ano atual (padrão: ano corrente)
 * @returns true se PMSB vencido, false caso contrário
 * 
 * @example
 * // Considerando ano atual = 2025
 * isPMSBVencido({ plano_saneamento_existe: 'sim', plano_saneamento_ano: 2020 }) // true (2020+4=2024 < 2025)
 * isPMSBVencido({ plano_saneamento_existe: 'sim', plano_saneamento_ano: 2023 }) // false (2023+4=2027 >= 2025)
 * isPMSBVencido({ plano_saneamento_existe: 'em elaboracao' }) // false (em elaboração não vence)
 */
export function isPMSBVencido(props: PropriedadesMunicipio, anoAtual: number = new Date().getFullYear()): boolean {
  const status = normalizarTexto(props.plano_saneamento_existe);
  
  // "Em elaboração" não é considerado vencido
  if (status !== 'sim') return false;
  
  const pmsbAnoStr = String(props.plano_saneamento_ano || '');
  
  // Validar se ano é válido
  if (!isAnoValido(pmsbAnoStr)) return false;
  if (['-', 'na', 'recusa', ''].includes(normalizarTexto(pmsbAnoStr))) return false;
  
  const ano = Number(pmsbAnoStr);
  return ano + PMSB_VIGENCIA_ANOS < anoAtual;
}

/**
 * Determina o status do Plano Diretor
 * 
 * @param props - Propriedades do município
 * @param anoAtual - Ano atual (padrão: ano corrente)
 * @returns Status: 'vencido', 'em_dia' ou 'nao_tem'
 */
export function getStatusPD(props: PropriedadesMunicipio, anoAtual?: number): 'vencido' | 'em_dia' | 'nao_tem' {
  if (!temPlanoDiretor(props)) return 'nao_tem';
  return isPDVencido(props, anoAtual) ? 'vencido' : 'em_dia';
}

/**
 * Determina o status do PMSB
 * 
 * @param props - Propriedades do município
 * @param anoAtual - Ano atual (padrão: ano corrente)
 * @returns Status: 'vencido', 'em_dia' ou 'nao_tem'
 */
export function getStatusPMSB(props: PropriedadesMunicipio, anoAtual?: number): 'vencido' | 'em_dia' | 'nao_tem' {
  if (!temPMSB(props)) return 'nao_tem';
  return isPMSBVencido(props, anoAtual) ? 'vencido' : 'em_dia';
}

/**
 * Verifica se podemos vender Plano Diretor para o município
 * 
 * Regra: Podemos vender se não tem PD OU se o PD está vencido
 * 
 * @param props - Propriedades do município
 * @param anoAtual - Ano atual (padrão: ano corrente)
 * @returns true se podemos vender, false caso contrário
 */
export function podemosVenderPD(props: PropriedadesMunicipio, anoAtual?: number): boolean {
  const status = getStatusPD(props, anoAtual);
  return status === 'nao_tem' || status === 'vencido';
}

/**
 * Verifica se podemos vender PMSB para o município
 * 
 * Regra: Podemos vender se não tem PMSB OU se o PMSB está vencido
 * 
 * @param props - Propriedades do município
 * @param anoAtual - Ano atual (padrão: ano corrente)
 * @returns true se podemos vender, false caso contrário
 */
export function podemosVenderPMSB(props: PropriedadesMunicipio, anoAtual?: number): boolean {
  const status = getStatusPMSB(props, anoAtual);
  return status === 'nao_tem' || status === 'vencido';
}

/**
 * Obtém o ano do Plano Diretor se válido
 * 
 * @param props - Propriedades do município
 * @returns Ano do PD ou null se inválido
 */
export function getAnoPD(props: PropriedadesMunicipio): number | null {
  if (!temPlanoDiretor(props)) return null;
  const ano = props.PD_ANO;
  return isAnoValido(ano) ? Number(ano) : null;
}

/**
 * Obtém o ano do PMSB se válido
 * 
 * @param props - Propriedades do município
 * @returns Ano do PMSB ou null se inválido
 */
export function getAnoPMSB(props: PropriedadesMunicipio): number | null {
  const status = normalizarTexto(props.plano_saneamento_existe);
  if (status !== 'sim') return null;
  
  const anoStr = String(props.plano_saneamento_ano || '');
  return isAnoValido(anoStr) && !(['-', 'na', 'recusa', ''].includes(normalizarTexto(anoStr))) 
    ? Number(anoStr) 
    : null;
}

/**
 * Verifica se o município tem população menor ou igual a 20k (elegível para Educagame)
 * 
 * @param props - Propriedades do município
 * @returns true se população <= 20k, false caso contrário
 */
export function temPopulacaoEducagame(props: PropriedadesMunicipio): boolean {
  const populacao = props.POPULACAO;
  if (!populacao) return false;
  
  const popNum = Number(populacao);
  return !isNaN(popNum) && popNum > 0 && popNum <= EDUCAGAME_POPULACAO_MAX;
}

/**
 * Obtém a população do município
 * 
 * @param props - Propriedades do município
 * @returns Número da população ou null se inválida
 */
export function getPopulacao(props: PropriedadesMunicipio): number | null {
  const populacao = props.POPULACAO || props.populacao;
  if (!populacao) return null;
  
  const popNum = Number(populacao);
  return !isNaN(popNum) && popNum > 0 ? popNum : null;
}

/**
 * Classifica produtos municipais em "podemos vender" vs "não vender"
 * 
 * Esta função é o coração da feature de modo vendas, aplicando todas as regras
 * de elegibilidade para PD, PMSB e Educagame.
 * 
 * Regras:
 * - PD: Vender se não tem ou está vencido (vigência 10 anos)
 * - PMSB: Vender se não tem ou está vencido (vigência 4 anos)
 * - Educagame: Vender APENAS se população <= 20k habitantes
 * 
 * @param props - Propriedades do município
 * @param anoAtual - Ano atual (padrão: ano corrente)
 * @returns Objeto com arrays 'vender' e 'naoVender'
 * 
 * @example
 * const classificacao = classificarElegibilidade(municipio.properties);
 * console.log(`Podemos vender ${classificacao.vender.length} produtos`);
 */
export function classificarElegibilidade(
  props: PropriedadesMunicipio,
  anoAtual: number = new Date().getFullYear()
): ClassificacaoElegibilidade {
  const resultado: ClassificacaoElegibilidade = {
    vender: [],
    naoVender: []
  };

  // Classificar Plano Diretor
  const statusPD = getStatusPD(props, anoAtual);
  const anoPD = getAnoPD(props);
  const itemPD: ItemProduto = {
    chave: 'VALOR_PD',
    nome: anoPD ? `Plano Diretor - ${anoPD}` : 'Plano Diretor',
    valor: props.VALOR_PD ?? null,
    ano: anoPD,
    status: statusPD,
    motivo: statusPD === 'nao_tem' 
      ? 'Município não possui Plano Diretor'
      : statusPD === 'vencido'
      ? `PD vencido (${anoPD} + ${PD_VIGENCIA_ANOS} anos < ${anoAtual})`
      : `PD válido até ${anoPD ? anoPD + PD_VIGENCIA_ANOS : 'N/A'}`
  };

  if (podemosVenderPD(props, anoAtual)) {
    resultado.vender.push(itemPD);
  } else {
    resultado.naoVender.push(itemPD);
  }

  // Classificar PMSB
  const statusPMSB = getStatusPMSB(props, anoAtual);
  const anoPMSB = getAnoPMSB(props);
  const itemPMSB: ItemProduto = {
    chave: 'VALOR_PMSB',
    nome: anoPMSB ? `PMSB - ${anoPMSB}` : 'PMSB',
    valor: props.VALOR_PMSB ?? null,
    ano: anoPMSB,
    status: statusPMSB,
    motivo: statusPMSB === 'nao_tem'
      ? 'Município não possui PMSB'
      : statusPMSB === 'vencido'
      ? `PMSB vencido (${anoPMSB} + ${PMSB_VIGENCIA_ANOS} anos < ${anoAtual})`
      : `PMSB válido até ${anoPMSB ? anoPMSB + PMSB_VIGENCIA_ANOS : 'N/A'}`
  };

  if (podemosVenderPMSB(props, anoAtual)) {
    resultado.vender.push(itemPMSB);
  } else {
    resultado.naoVender.push(itemPMSB);
  }

  // Classificar Educagame (apenas para municípios com população <= 20k)
  const populacao = getPopulacao(props);
  const temPopEducagame = temPopulacaoEducagame(props);
  const itemEducagame: ItemProduto = {
    chave: 'VALOR_EDUCAGAME',
    nome: 'Educagame',
    valor: props.VALOR_EDUCAGAME ?? null,
    ano: new Date().getFullYear(),
    status: temPopEducagame ? 'em_dia' : 'nao_tem',
    motivo: temPopEducagame
      ? `Elegível: população ${populacao?.toLocaleString('pt-BR') || '?'} <= ${EDUCAGAME_POPULACAO_MAX.toLocaleString('pt-BR')} hab.`
      : `Não elegível: população ${populacao?.toLocaleString('pt-BR') || '?'} > ${EDUCAGAME_POPULACAO_MAX.toLocaleString('pt-BR')} hab.`
  };

  if (temPopEducagame) {
    resultado.vender.push(itemEducagame);
  } else {
    resultado.naoVender.push(itemEducagame);
  }

  return resultado;
}

/**
 * Formata motivo para exibição amigável
 * 
 * @param item - Item de produto
 * @returns String formatada para exibição
 */
export function formatarMotivo(item: ItemProduto): string {
  return item.motivo || '';
}

/**
 * Verifica se há algum produto para vender
 * 
 * @param classificacao - Resultado da classificação
 * @returns true se há produtos vendáveis, false caso contrário
 */
export function temProdutosVendaveis(classificacao: ClassificacaoElegibilidade): boolean {
  return classificacao.vender.length > 0;
}

/**
 * Gera log estruturado para telemetria
 * 
 * @param classificacao - Resultado da classificação
 * @param municipio - Dados do município (code_muni, UF)
 * @returns Objeto para telemetria
 */
export interface TelemetriaVendas {
  vender: number;
  naoVender: number;
  produtos_vender: string[];
  produtos_nao_vender: string[];
  code_muni?: string;
  uf?: string;
}

export function gerarTelemetriaVendas(
  classificacao: ClassificacaoElegibilidade,
  municipio?: { code_muni?: string; UF?: string }
): TelemetriaVendas {
  return {
    vender: classificacao.vender.length,
    naoVender: classificacao.naoVender.length,
    produtos_vender: classificacao.vender.map(p => p.chave),
    produtos_nao_vender: classificacao.naoVender.map(p => p.chave),
    code_muni: municipio?.code_muni,
    uf: municipio?.UF
  };
}
