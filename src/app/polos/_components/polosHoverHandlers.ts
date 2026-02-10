/**
 * Utilitários para hover/tooltip em camadas de municípios no mapa de Polos (MapLibre GL)
 * Fornece lógica reutilizável para realce visual, extração de dados e renderização de tooltips
 * 
 * Tipos de municípios:
 * - Polo Estratégico (verde #36C244): municípios com relacionamento_ativo = true
 * - Munic. Oportunidade (amarelo #F5DF09): municípios sem relacionamento ativo
 *
 * Responsabilidades:
 * - Extrair campos municipais com fallbacks robustos
 * - Gerar HTML do tooltip com escape XSS
 * - Aplicar/remover estilos de hover mantendo idempotência
 * - Anexar handlers de mousemove/mouseleave/click aos features
 */

import maplibregl from 'maplibre-gl';

/**
 * Interface para campos extraídos de um município
 */
export interface MunicipioFields {
  uf: string;      // Unidade Federativa (sigla: "SP", "RJ", etc.)
  ibge: string;    // Código IBGE do município
  nome: string;    // Nome completo do município
  valorTotal?: number; // Valor total de produtos (opcional)
}

/**
 * Tipo genérico para propriedades de features GeoJSON
 */
type MuniProps = Record<string, unknown>;

/**
 * Cores para os tipos de municípios
 */
export const CORES_MUNICIPIOS = {
  poloEstrategico: {
    fill: '#36C244',
    stroke: '#2A9A35',
    badge: '#36C244',
    text: '#ffffff',
  },
  poloLogistico: {
    fill: '#9333EA',
    stroke: '#7E22CE',
    badge: '#9333EA',
    text: '#ffffff',
  },
  municipioSatelite: {
    fill: '#F5DF09',
    stroke: '#C4A800',
    badge: '#F5DF09',
    text: '#1a1a1a',
  },
  municOportunidade: {
    fill: '#F5DF09',
    stroke: '#C4A800',
    badge: '#F5DF09',
    text: '#1a1a1a',
  },
  municipioBloqueado: {
    fill: '#EF4444',
    stroke: '#B91C1C',
    badge: '#EF4444',
    text: '#ffffff',
  },
} as const;

/**
 * Extrai campos essenciais de um município a partir de propriedades GeoJSON
 * com fallbacks múltiplos para suportar diferentes esquemas de dados.
 *
 * @param properties - Objeto de propriedades do feature
 * @returns MunicipioFields com UF, IBGE, Nome e Valor extraídos
 */
export function extractMunicipioFields(properties: MuniProps): MunicipioFields {
  const uf =
    properties.name_state ??
    properties.UF ??
    properties.uf ??
    properties.sigla_uf ??
    properties.state ??
    properties.STATE ??
    '-';

  const ibge =
    properties.code_muni ??
    properties.codigo_ibge ??
    properties.codigo ??
    properties.cod_ibge ??
    properties.CD_MUN ??
    properties.COD_MUNIC ??
    properties.IBGE ??
    '-';

  const nome =
    properties.nome_municipio ??
    properties.municipio ??
    properties.nome ??
    properties.nome_munic ??
    properties.NM_MUN ??
    properties.NM_MUNICIP ??
    properties.MUNICIPIO ??
    '-';

  const valorTotal = typeof properties.valor_total_produtos === 'number' 
    ? properties.valor_total_produtos 
    : undefined;

  return {
    uf: String(uf).trim() || '-',
    ibge: String(ibge).trim() || '-',
    nome: String(nome).trim() || '-',
    valorTotal,
  };
}

/**
 * Escapa caracteres HTML perigosos para evitar injeção XSS no tooltip
 * @param value - Valor a ser escapado
 * @returns String segura para inserção em HTML
 */
function escapeHtml(value: unknown): string {
  const text = String(value || '');
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  };
  return text.replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Formata valor em reais brasileiro
 * @param valor - Valor numérico
 * @returns String formatada em BRL
 */
function formatarValorBRL(valor: number | undefined): string {
  if (valor === undefined || valor === null) return 'N/A';
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(valor);
}

/**
 * Gera HTML do tooltip para Polo Estratégico (verde)
 * @param properties - Propriedades do feature GeoJSON
 * @returns String com HTML do tooltip
 */
export function poloEstrategicoTooltipHtml(properties: MuniProps): string {
  const { uf, nome, valorTotal } = extractMunicipioFields(properties);
  const cores = CORES_MUNICIPIOS.poloEstrategico;

  return `
    <div style="padding: 12px; font-family: system-ui, -apple-system, sans-serif; min-width: 200px; background: #ffffff; border-radius: 14px; text-align: center; box-shadow: 0 10px 30px rgba(2,6,23,0.08); border: 1px solid rgba(15,23,42,0.06);">
      <!-- Badge Polo Estratégico -->
      <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: ${cores.badge}; color: ${cores.text}; font-size: 10px; font-weight: 600; padding: 4px 10px; border-radius: 14px; margin: 0 auto 10px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:4px;" class="lucide lucide-chess-rook-icon lucide-chess-rook"><path d="M5 20a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M10 2v2"/><path d="M14 2v2"/><path d="m17 18-1-9"/><path d="M6 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2"/><path d="M6 4h12"/><path d="m7 18 1-9"/></svg> Polo Estratégico
      </div>
      
      <!-- Nome do Município -->
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: #0f172a; text-align: center;">
        ${escapeHtml(nome)}
      </div>
      
      <!-- Estado (UF) -->
      <div style="font-size: 12px; color: #64748b; margin-bottom: 4px; text-align: center;">
        <span style="font-weight: 500;">UF:</span> ${escapeHtml(uf)}
      </div>
      
      <!-- Separador e Valor -->
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">
          Valor Total Produtos
        </div>
        <div style="font-size: 14px; font-weight: 600; color: #10b981;">
          ${formatarValorBRL(valorTotal)}
        </div>
      </div>
    </div>
  `.trim();
}

/**
 * Gera HTML do tooltip para Polo Logístico (roxo)
 * @param properties - Propriedades do feature GeoJSON
 * @returns String com HTML do tooltip
 */
export function poloLogisticoTooltipHtml(properties: MuniProps): string {
  const { uf, nome, valorTotal } = extractMunicipioFields(properties);
  const cores = CORES_MUNICIPIOS.poloLogistico;

  return `
    <div style="padding: 12px; font-family: system-ui, -apple-system, sans-serif; min-width: 200px; background: #ffffff; border-radius: 14px; text-align: center; box-shadow: 0 10px 30px rgba(2,6,23,0.08); border: 1px solid rgba(15,23,42,0.06);">
      <!-- Badge Polo Logístico -->
      <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: ${cores.badge}; color: ${cores.text}; font-size: 10px; font-weight: 600; padding: 4px 10px; border-radius: 14px; margin: 0 auto 10px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:4px;" class="lucide lucide-package-icon lucide-package"><line x1="16.5" y1="9.4" x2="7.5" y2="4.21"/><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg> Polo Logístico
      </div>
      
      <!-- Nome do Município -->
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: #0f172a; text-align: center;">
        ${escapeHtml(nome)}
      </div>
      
      <!-- Estado (UF) -->
      <div style="font-size: 12px; color: #64748b; margin-bottom: 4px; text-align: center;">
        <span style="font-weight: 500;">UF:</span> ${escapeHtml(uf)}
      </div>
      
      <!-- Separador e Valor -->
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">
          Valor Total Produtos
        </div>
        <div style="font-size: 14px; font-weight: 600; color: #9333EA;">
          ${formatarValorBRL(valorTotal)}
        </div>
      </div>
    </div>
  `.trim();
}

/**
 * Gera HTML do tooltip para Município Oportunidade (amarelo)
 * @param properties - Propriedades do feature GeoJSON
 * @returns String com HTML do tooltip
 */
export function municOportunidadeTooltipHtml(properties: MuniProps): string {
  const { uf, nome, valorTotal } = extractMunicipioFields(properties);
  const cores = CORES_MUNICIPIOS.municOportunidade;

  return `
    <div style="padding: 12px; font-family: system-ui, -apple-system, sans-serif; min-width: 200px; background: #ffffff; border-radius: 14px; text-align: center; box-shadow: 0 10px 30px rgba(2,6,23,0.08); border: 1px solid rgba(15,23,42,0.06);">
      <!-- Badge Munic. Oportunidade -->
      <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: ${cores.badge}; color: ${cores.text}; font-size: 10px; font-weight: 600; padding: 4px 10px; border-radius: 14px; margin: 0 auto 10px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:4px;" class="lucide lucide-crosshair-icon lucide-crosshair"><circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/></svg> Munic. Oportunidade
      </div>
      
      <!-- Nome do Município -->
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: #0f172a; text-align: center;">
        ${escapeHtml(nome)}
      </div>
      
      <!-- Estado (UF) -->
      <div style="font-size: 12px; color: #64748b; margin-bottom: 4px; text-align: center;">
        <span style="font-weight: 500;">UF:</span> ${escapeHtml(uf)}
      </div>
      
      <!-- Separador e Valor -->
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">
          Valor Total Produtos
        </div>
        <div style="font-size: 14px; font-weight: 600; color: #eab308;">
          ${formatarValorBRL(valorTotal)}
        </div>
      </div>
    </div>
  `.trim();
}

/**
 * Gera HTML do tooltip para Município Bloqueado (vermelho)
 * Municípios sem contato a priori.
 */
export function municipioBloqueadoTooltipHtml(properties: MuniProps): string {
  const { uf, nome } = extractMunicipioFields(properties);
  const cores = CORES_MUNICIPIOS.municipioBloqueado;

  return `
    <div style="padding: 12px; font-family: system-ui, -apple-system, sans-serif; min-width: 200px; background: #ffffff; border-radius: 14px; text-align: center; box-shadow: 0 10px 30px rgba(2,6,23,0.08); border: 1px solid rgba(15,23,42,0.06);">
      <!-- Badge Município Bloqueado -->
      <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: ${cores.badge}; color: ${cores.text}; font-size: 10px; font-weight: 600; padding: 4px 10px; border-radius: 14px; margin: 0 auto 10px;">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:4px;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Município Bloqueado
      </div>
      
      <!-- Nome do Município -->
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: #0f172a; text-align: center;">
        ${escapeHtml(nome)}
      </div>
      
      <!-- Estado (UF) -->
      <div style="font-size: 12px; color: #64748b; margin-bottom: 4px; text-align: center;">
        <span style="font-weight: 500;">UF:</span> ${escapeHtml(uf)}
      </div>
      
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
        <div style="font-size: 11px; color: #94a3b8;">Sem contato a priori</div>
      </div>
    </div>
  `.trim();
}

/**
 * Gera HTML do tooltip para Município Satélite (amarelo, opacidade menor no mapa)
 * @param properties - Propriedades do feature GeoJSON
 * @returns String com HTML do tooltip
 */
export function municipioSateliteTooltipHtml(properties: MuniProps): string {
  const { uf, nome, valorTotal } = extractMunicipioFields(properties);
  const cores = CORES_MUNICIPIOS.municipioSatelite;

  return `
    <div style="padding: 12px; font-family: system-ui, -apple-system, sans-serif; min-width: 200px; background: #ffffff; border-radius: 14px; text-align: center; box-shadow: 0 10px 30px rgba(2,6,23,0.08); border: 1px solid rgba(15,23,42,0.06);">
      <!-- Badge Município Satélite -->
      <div style="display: inline-flex; align-items: center; justify-content: center; gap: 6px; background: ${cores.badge}; color: ${cores.text}; font-size: 10px; font-weight: 600; padding: 4px 10px; border-radius: 14px; margin: 0 auto 10px; opacity: 0.85;">
        <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="width:12px;height:12px;display:inline-block;vertical-align:middle;margin-right:4px;" class="lucide lucide-orbit-icon lucide-orbit"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a7.9 7.9 0 0 0 0-6"/><path d="M4.6 9a7.9 7.9 0 0 0 0 6"/><path d="M9 19.4a7.9 7.9 0 0 0 6 0"/><path d="M15 4.6a7.9 7.9 0 0 0-6 0"/></svg> Munic. Satélite
      </div>
      
      <!-- Nome do Município -->
      <div style="font-weight: 700; font-size: 14px; margin-bottom: 8px; color: #0f172a; text-align: center;">
        ${escapeHtml(nome)}
      </div>
      
      <!-- Estado (UF) -->
      <div style="font-size: 12px; color: #64748b; margin-bottom: 4px; text-align: center;">
        <span style="font-weight: 500;">UF:</span> ${escapeHtml(uf)}
      </div>
      
      <!-- Separador e Valor -->
      <div style="margin-top: 8px; padding-top: 8px; border-top: 1px solid #e2e8f0;">
        <div style="font-size: 11px; color: #94a3b8; margin-bottom: 2px;">
          Valor Total Produtos
        </div>
        <div style="font-size: 14px; font-weight: 600; color: #10b981;">
          ${formatarValorBRL(valorTotal)}
        </div>
      </div>
    </div>
  `.trim();
}

/**
 * Gera HTML do tooltip dinâmico baseado no tipo do município
 * 
 * Lógica de prioridade:
 * 1. isBloqueado = true -> Município Bloqueado (vermelho) - sem contato a priori
 * 2. isPolo = true -> Polo Estratégico (verde) - relacionamento_ativo
 * 3. isPoloLogistico = true -> Polo Logístico (roxo) - tipo_polo_satelite = 'polo_logistico'
 * 4. isSatellite = true -> Município Satélite (amarelo, opacidade menor no mapa) - vizinho queen 1ª ordem de polo estratégico
 * 5. Caso contrário -> Munic. Oportunidade (amarelo)
 * 
 * @param properties - Propriedades do feature GeoJSON
 * @param isBloqueado - true se for Município Bloqueado
 * @param isPolo - true se for Polo Estratégico
 * @param isPoloLogistico - true se for Polo Logístico
 * @param isSatellite - true se for Município Satélite
 * @returns String com HTML do tooltip
 */
export function gerarTooltipDinamico(
  properties: MuniProps,
  isBloqueado: boolean,
  isPolo: boolean,
  isPoloLogistico: boolean,
  isSatellite: boolean
): string {
  if (isBloqueado) {
    return municipioBloqueadoTooltipHtml(properties);
  }
  if (isPolo) {
    return poloEstrategicoTooltipHtml(properties);
  }
  if (isPoloLogistico) {
    return poloLogisticoTooltipHtml(properties);
  }
  if (isSatellite) {
    return municipioSateliteTooltipHtml(properties);
  }
  return municOportunidadeTooltipHtml(properties);
}

/**
 * Configuração padrão do popup MapLibre
 */
export const POPUP_CONFIG: maplibregl.PopupOptions = {
  closeButton: true,
  closeOnClick: true,
  maxWidth: '300px',
  className: 'polos-tooltip',
};

/**
 * Configuração do popup para hover (sem botão de fechar)
 */
export const POPUP_HOVER_CONFIG: maplibregl.PopupOptions = {
  closeButton: false,
  closeOnClick: false,
  maxWidth: '300px',
  className: 'polos-tooltip polos-tooltip-hover',
  offset: 12,
};

/**
 * Configuração de handlers de hover para o mapa de Polos
 * 
 * @param map - Instância do MapLibre GL Map
 * @param layerId - ID da camada (ex: 'municipios-fill')
 * @param sourceId - ID da source GeoJSON
 * @param getPolosEstrategicos - Função que retorna Set de códigos IBGE dos Polos Estratégicos
 * @param getPolosLogisticos - Função que retorna Set de códigos IBGE dos Polos Logísticos
 * @param onMunicipioClick - Callback opcional acionado ao clicar em um município
 * 
 * @returns Função de cleanup para remover os handlers
 * 
 * Uso:
 *   const cleanup = setupPolosHover(
 *     map, 
 *     'municipios-fill', 
 *     'municipios-src', 
 *     () => polosEstrategicosSet,
 *     () => polosLogisticosSet,
 *     (codigo) => console.log(codigo)
 *   );
 *   // Quando precisar remover:
 *   cleanup();
 */
export function setupPolosHover(
  map: maplibregl.Map,
  layerIds: string | string[],
  sourceId: string,
  getPolosEstrategicos: () => Set<string>,
  getPolosLogisticos: () => Set<string>,
  getMunicipiosSatelites: () => Set<string>,
  getMunicipiosBloqueados: () => Set<string>,
  onMunicipioClick?: (codigoMunicipio: string) => void
): () => void {
  const ids = Array.isArray(layerIds) ? layerIds : [layerIds];
  let popup: maplibregl.Popup | null = null;
  let hoveredFeatureId: string | number | null = null;

  // Handler de mousemove (exibe tooltip + aplica realce)
  const handleMouseMove = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
    if (!e.features || e.features.length === 0) return;

    const feature = e.features[0];
    const properties = feature.properties || {};
    const featureId = feature.id;
    
    // Obtém os Sets atualizados
    const polosEstrategicosSet = getPolosEstrategicos();
    const polosLogisticosSet = getPolosLogisticos();
    const municipiosSatelitesSet = getMunicipiosSatelites();
    const municipiosBloqueadosSet = getMunicipiosBloqueados();
    const codeMuni = String(properties.code_muni || '');
    const isBloqueado = municipiosBloqueadosSet.has(codeMuni);
    const isPolo = polosEstrategicosSet.has(codeMuni);
    const isPoloLogistico = polosLogisticosSet.has(codeMuni) && !isPolo;
    const isSatellite = municipiosSatelitesSet.has(codeMuni) && !isPolo && !isPoloLogistico;

    // Gera HTML do tooltip baseado no tipo
    const tooltipHtml = gerarTooltipDinamico(properties, isBloqueado, isPolo, isPoloLogistico, isSatellite);

    // Remove popup anterior se existir
    if (popup) {
      popup.remove();
    }

    // Cria novo popup
    popup = new maplibregl.Popup(POPUP_HOVER_CONFIG)
      .setLngLat(e.lngLat)
      .setHTML(tooltipHtml)
      .addTo(map);

    // Remove hover do feature anterior se existir
    if (hoveredFeatureId !== null && hoveredFeatureId !== featureId) {
      try {
        map.setFeatureState(
          { source: sourceId, id: hoveredFeatureId },
          { hover: false }
        );
      } catch {
        // Ignora erro se o ID anterior não existir mais
      }
    }

    // Aplica hover no novo feature
    if (featureId !== undefined && featureId !== null) {
      try {
        map.setFeatureState(
          { source: sourceId, id: featureId },
          { hover: true }
        );
        hoveredFeatureId = featureId;
      } catch {
        hoveredFeatureId = null;
      }
    }

    // Muda cursor para pointer
    map.getCanvas().style.cursor = 'pointer';
  };

  // Handler de mouseleave (remove tooltip + remove realce)
  const handleMouseLeave = () => {
    // Remove popup
    if (popup) {
      popup.remove();
      popup = null;
    }

    // Remove realce
    if (hoveredFeatureId !== null) {
      try {
        map.setFeatureState(
          { source: sourceId, id: hoveredFeatureId },
          { hover: false }
        );
      } catch {
        // Ignora erro
      }
      hoveredFeatureId = null;
    }

    // Reseta cursor
    map.getCanvas().style.cursor = '';
  };

  // Handler de click (popup persistente para mobile/touch)
  const handleClick = (e: maplibregl.MapMouseEvent & { features?: maplibregl.MapGeoJSONFeature[] }) => {
    if (!e.features || e.features.length === 0) return;

    const feature = e.features[0];
    const properties = feature.properties || {};
    const codeMuni = String(properties.code_muni || '');
    
    // Chamar callback ao clicar (funciona para todos os tipos)
    if (onMunicipioClick && codeMuni) {
      onMunicipioClick(codeMuni);
    }
    
    // Obtém os Sets atualizados
    const polosEstrategicosSet = getPolosEstrategicos();
    const polosLogisticosSet = getPolosLogisticos();
    const municipiosSatelitesSet = getMunicipiosSatelites();
    const municipiosBloqueadosSet = getMunicipiosBloqueados();
    const isBloqueado = municipiosBloqueadosSet.has(codeMuni);
    const isPolo = polosEstrategicosSet.has(codeMuni);
    const isPoloLogistico = polosLogisticosSet.has(codeMuni) && !isPolo;
    const isSatellite = municipiosSatelitesSet.has(codeMuni) && !isPolo && !isPoloLogistico;

    // Gera HTML do tooltip baseado no tipo
    const tooltipHtml = gerarTooltipDinamico(properties, isBloqueado, isPolo, isPoloLogistico, isSatellite);

    // Remove popup anterior
    if (popup) {
      popup.remove();
    }

    // Cria popup persistente no click (para mobile)
    popup = new maplibregl.Popup(POPUP_CONFIG)
      .setLngLat(e.lngLat)
      .setHTML(tooltipHtml)
      .addTo(map);
  };

  // Registra os handlers para cada camada
  ids.forEach((id) => {
    map.on('mousemove', id, handleMouseMove);
    map.on('mouseleave', id, handleMouseLeave);
    map.on('click', id, handleClick);
  });

  // Retorna função de cleanup
  return () => {
    ids.forEach((id) => {
      map.off('mousemove', id, handleMouseMove);
      map.off('mouseleave', id, handleMouseLeave);
      map.off('click', id, handleClick);
    });
    
    if (popup) {
      popup.remove();
      popup = null;
    }
  };
}

/**
 * Log estruturado para debugging de hover
 * @param action - Ação sendo realizada
 * @param municipio - Nome do município (se disponível)
 * @param details - Detalhes adicionais
 */
export function logHoverDebug(
  action: string,
  municipio?: string,
  details?: Record<string, unknown>
): void {
  const muniStr = municipio ? ` (${municipio})` : '';
  const detailsStr = details ? JSON.stringify(details) : '';
  console.log(
    `🎯 [polosHover] ${action}${muniStr}${detailsStr ? ` — ${detailsStr}` : ''}`
  );
}
