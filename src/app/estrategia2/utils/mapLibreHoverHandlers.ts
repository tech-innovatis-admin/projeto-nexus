/**
 * Utilitários para hover/tooltip em camadas de municípios no mapa MapLibre GL
 * Fornece lógica reutilizável para realce visual, extração de dados e renderização de tooltips
 * 
 * Mantém a mesma estética e comportamento do mapHoverHandlers.ts (Leaflet) mas adaptado para MapLibre GL
 *
 * Responsabilidades:
 * - Extrair campos municipais com fallbacks robustos para POLOS e PERIFERIAS
 * - Gerar HTML do tooltip com escape XSS
 * - Aplicar/remover estilos de hover mantendo idempotência
 * - Anexar handlers de mouseover/mouseout aos features
 *
 * Pontos de extensão:
 * - `extractPoloFields`: adicione novos esquemas de propriedades para polos
 * - `extractPeriferiaFields`: adicione novos esquemas de propriedades para periferias
 * - `poloTooltipHtml` / `periferiaTooltipHtml`: customize campos/layout do tooltip
 */

import maplibregl from 'maplibre-gl';

/**
 * Interface para campos extraídos de um município polo
 */
export interface PoloFields {
  uf: string;      // Unidade Federativa (sigla: "SP", "RJ", etc.)
  ibge: string;    // Código IBGE do polo
  nome: string;    // Nome completo do município polo
}

/**
 * Interface para campos extraídos de um município periferia
 */
export interface PeriferiaFields {
  uf: string;      // Unidade Federativa (sigla: "SP", "RJ", etc.)
  ibge: string;    // Código IBGE da periferia
  nome: string;    // Nome completo do município periferia
}

/**
 * Interface para campos extraídos de um município SEM TAG
 */
export interface SemTagFields {
  uf: string;      // Unidade Federativa (sigla)
  ibge: string;    // Código IBGE do município
  nome: string;    // Nome do município
}

/**
 * Tipo genérico para propriedades de features GeoJSON
 */
type MuniProps = Record<string, any>;

/**
 * Extrai campos essenciais de um município POLO a partir de propriedades GeoJSON
 * com fallbacks múltiplos para suportar diferentes esquemas de dados.
 *
 * Estratégia para POLOS:
 * 1. UF: busca em UF_origem, UF, name_state, etc.
 * 2. IBGE: busca em codigo_origem, code_muni, codigo_ibge, etc.
 * 3. Nome: busca em municipio_origem, nome_municipio, municipio, etc.
 * 4. Fallback final: "-" (indica campo não disponível)
 *
 * @param properties - Objeto de propriedades do feature
 * @returns PoloFields com UF, IBGE e Nome extraídos
 */
export function extractPoloFields(properties: MuniProps): PoloFields {
  const uf =
    properties.UF_origem ??
    properties.UF ??
    properties.uf ??
    properties.sigla_uf ??
    properties.name_state ??
    properties.state ??
    properties.STATE ??
    '-';

  const ibge =
    properties.codigo_origem ??
    properties.code_muni ??
    properties.codigo_ibge ??
    properties.cod_ibge ??
    properties.CD_MUN ??
    properties.COD_MUNIC ??
    properties.codigo_ibge7 ??
    properties.codigo_ibge_7 ??
    properties.IBGE ??
    '-';

  const nome =
    properties.municipio_origem ??
    properties.nome_municipio ??
    properties.nome ??
    properties.nome_munic ??
    properties.NM_MUN ??
    properties.NM_MUNICIP ??
    properties.municipio ??
    properties.MUNICIPIO ??
    '-';

  return {
    uf: String(uf).trim() || '-',
    ibge: String(ibge).trim() || '-',
    nome: String(nome).trim() || '-',
  };
}

/**
 * Extrai campos essenciais de um município PERIFERIA a partir de propriedades GeoJSON
 * com fallbacks múltiplos para suportar diferentes esquemas de dados.
 *
 * Estratégia para PERIFERIAS:
 * 1. UF: busca em UF_destino, UF, name_state, etc.
 * 2. IBGE: busca em codigo_destino, codigo, codigo_ibge, etc.
 * 3. Nome: busca em municipio_destino, nome_municipio, municipio, etc.
 * 4. Fallback final: "-" (indica campo não disponível)
 *
 * @param properties - Objeto de propriedades do feature
 * @returns PeriferiaFields com UF, IBGE e Nome extraídos
 */
export function extractPeriferiaFields(properties: MuniProps): PeriferiaFields {
  const uf =
    properties.UF_destino ??
    properties.UF ??
    properties.uf ??
    properties.sigla_uf ??
    properties.name_state ??
    properties.state ??
    properties.STATE ??
    '-';

  const ibge =
    properties.codigo_destino ??
    properties.codigo ??
    properties.codigo_ibge ??
    properties.code_muni ??
    properties.cod_ibge ??
    properties.CD_MUN ??
    properties.COD_MUNIC ??
    properties.codigo_ibge7 ??
    properties.codigo_ibge_7 ??
    properties.IBGE ??
    '-';

  const nome =
    properties.municipio_destino ??
    properties.nome_municipio ??
    properties.nome ??
    properties.nome_munic ??
    properties.NM_MUN ??
    properties.NM_MUNICIP ??
    properties.municipio ??
    properties.MUNICIPIO ??
    '-';

  return {
    uf: String(uf).trim() || '-',
    ibge: String(ibge).trim() || '-',
    nome: String(nome).trim() || '-',
  };
}

/**
 * Extrai campos essenciais de um município SEM TAG a partir de propriedades GeoJSON
 * com fallbacks múltiplos para suportar diferentes esquemas de dados.
 */
export function extractSemTagFields(properties: MuniProps): SemTagFields {
  const uf =
    properties.UF ??
    properties.uf ??
    properties.sigla_uf ??
    properties.name_state ??
    properties.state ??
    properties.STATE ??
    '-';

  const ibge =
    properties.codigo ??
    properties.codigo_ibge ??
    properties.code_muni ??
    properties.cod_ibge ??
    properties.CD_MUN ??
    properties.COD_MUNIC ??
    properties.codigo_ibge7 ??
    properties.codigo_ibge_7 ??
    properties.IBGE ??
    '-';

  const nome =
    properties.municipio ??
    properties.nome_municipio ??
    properties.nome ??
    properties.nome_munic ??
    properties.NM_MUN ??
    properties.NM_MUNICIP ??
    properties.MUNICIPIO ??
    '-';

  return {
    uf: String(uf).trim() || '-',
    ibge: String(ibge).trim() || '-',
    nome: String(nome).trim() || '-',
  };
}

/**
 * Escapa caracteres HTML perigosos para evitar injeção XSS no tooltip
 * @param value - Valor a ser escapado
 * @returns String segura para inserção em HTML
 */
function escapeHtml(value: any): string {
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
 * Lê uma variável CSS com fallback confiável
 * Retorna o valor computado ou o fallback se a variável não existir
 *
 * @param varName - Nome da variável CSS (com ou sem '--')
 * @param fallback - Valor padrão se não encontrado
 * @returns String com o valor da variável ou fallback
 */
export function readCssVar(varName: string, fallback: string): string {
  // Verificação de SSR (Next.js renderiza no servidor sem window)
  if (typeof window === 'undefined') {
    return fallback;
  }

  try {
    const name = varName.startsWith('--') ? varName : `--${varName}`;
    const computed = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return computed || fallback;
  } catch (e) {
    console.warn(`⚠️ [mapLibreHoverHandlers] Erro ao ler CSS var '${varName}':`, e);
    return fallback;
  }
}

/**
 * Gera HTML do tooltip para município POLO
 * Mantém estrutura simples, semântica, e pronta para CSS
 * Usa as mesmas classes CSS do Leaflet para manter estética consistente
 *
 * @param properties - Propriedades do feature GeoJSON
 * @param municipiosComRelacionamento - Set de códigos IBGE com relacionamento ativo
 * @param municipiosEmNegociacao - Set de códigos IBGE em negociação
 * @returns String com HTML do tooltip
 */
export function poloTooltipHtml(
  properties: MuniProps,
  municipiosComRelacionamento?: Set<string>,
  municipiosEmNegociacao?: Set<string>
): string {
  const { uf, ibge, nome } = extractPoloFields(properties);
  
  // Determinar categoria: relacionamento tem prioridade
  const isRelacionamento = municipiosComRelacionamento ? municipiosComRelacionamento.has(ibge) : false;
  const isNegociacao = municipiosEmNegociacao ? municipiosEmNegociacao.has(ibge) : false;
  
  // Determinar tipo de polo: prioridade para relacionamento
  let tipoPolo: string;
  let tipoColor: string;
  
  if (isRelacionamento) {
    tipoPolo = 'Polo Estratégico';
    tipoColor = '#10b981'; // Verde
  } else {
    tipoPolo = 'Polo Logístico';
    tipoColor = '#0022E0'; // Marrom
  }
  
  // Status adicional (negociação)
  let statusHtml = '';
  if (isNegociacao) {
    statusHtml = `
      <div class="t-row t-status">
        <span class="t-label">Status</span>
        <span class="t-status-badge" style="color: #EDCA32; font-size: 11px; font-weight: 500;">Em negociação</span>
      </div>`;
  }

  return `
    <div class="t-muni">
      <div class="t-title">${escapeHtml(nome)}</div>
      <div class="t-row">UF: <b>${escapeHtml(uf)}</b></div>
      <div class="t-row t-tipo"><span class="t-badge" style="background-color: ${tipoColor}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 500;">${tipoPolo}</span></div>
      ${statusHtml}
    </div>
  `.trim();
}

/**
 * Gera HTML do tooltip para município PERIFERIA
 * Mantém estrutura simples, semântica, e pronta para CSS
 * Usa as mesmas classes CSS do Leaflet para manter estética consistente
 *
 * @param properties - Propriedades do feature GeoJSON
 * @param municipiosComRelacionamento - Set de códigos IBGE com relacionamento ativo
 * @param municipiosEmNegociacao - Set de códigos IBGE em negociação
 * @returns String com HTML do tooltip
 */
export function periferiaTooltipHtml(
  properties: MuniProps,
  municipiosComRelacionamento?: Set<string>,
  municipiosEmNegociacao?: Set<string>
): string {
  const { uf, ibge, nome } = extractPeriferiaFields(properties);
  
  // Determinar categoria: relacionamento tem prioridade
  const isRelacionamento = municipiosComRelacionamento ? municipiosComRelacionamento.has(ibge) : false;
  const isNegociacao = municipiosEmNegociacao ? municipiosEmNegociacao.has(ibge) : false;
  
  // Determinar tipo: prioridade para relacionamento
  let tipoMunicipio: string;
  let tipoColor: string;
  
  if (isRelacionamento) {
    tipoMunicipio = 'Polo Estratégico';
    tipoColor = '#10b981'; // Verde
  } else {
    tipoMunicipio = 'Munic. Satélite';
    tipoColor = '#6b7280'; // Cinza
  }
  
  // Status adicional (negociação)
  let statusHtml = '';
  if (isNegociacao) {
    statusHtml = `
      <div class="t-row t-status">
        <span class="t-label">Status</span>
        <span class="t-status-badge" style="color: #A855F7; font-size: 11px; font-weight: 500;">Em negociação</span>
      </div>`;
  }

  return `
    <div class="t-muni">
      <div class="t-title">${escapeHtml(nome)}</div>
      <div class="t-row">UF: <b>${escapeHtml(uf)}</b></div>
      <div class="t-row t-tipo"><span class="t-badge" style="background-color: ${tipoColor}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 500;">${tipoMunicipio}</span></div>
      ${statusHtml}
    </div>
  `.trim();
}

/**
 * Gera HTML do tooltip para município SEM TAG
 * @param properties - Propriedades do feature GeoJSON
 * @param municipiosComRelacionamento - Set de códigos IBGE com relacionamento ativo
 * @param municipiosEmNegociacao - Set de códigos IBGE em negociação
 * @returns String com HTML do tooltip
 */
export function semTagTooltipHtml(
  properties: MuniProps,
  municipiosComRelacionamento?: Set<string>,
  municipiosEmNegociacao?: Set<string>
): string {
  const { uf, ibge, nome } = extractSemTagFields(properties);
  
  // Determinar status: relacionamento > sem status
  const isRelacionamento = municipiosComRelacionamento ? municipiosComRelacionamento.has(ibge) : false;
  const isNegociacao = municipiosEmNegociacao ? municipiosEmNegociacao.has(ibge) : false;
  
  // Determinar tipo: prioridade para relacionamento
  let tipoMunicipio: string;
  let tipoColor: string;
  
  if (isRelacionamento) {
    tipoMunicipio = 'Polo Estratégico';
    tipoColor = '#10b981'; // Verde
  } else {
    tipoMunicipio = 'Munic. Oportunidade';
    tipoColor = '#6b7280'; // Cinza
  }
  
  // Status adicional (negociação)
  let statusHtml = '';
  if (isNegociacao) {
    statusHtml = `
      <div class="t-row t-status">
        <span class="t-label">Status</span>
        <span class="t-status-badge" style="color: #A855F7; font-size: 11px; font-weight: 500;">Em negociação</span>
      </div>`;
  }

  return `
    <div class="t-muni">
      <div class="t-title">${escapeHtml(nome)}</div>
      <div class="t-row">UF: <b>${escapeHtml(uf)}</b></div>
      <div class="t-row t-tipo"><span class="t-badge" style="background-color: ${tipoColor}; color: white; padding: 2px 8px; border-radius: 3px; font-size: 11px; font-weight: 500;">${tipoMunicipio}</span></div>
      ${statusHtml}
    </div>
  `.trim();
}

/**
 * Cores de hover para MapLibre GL (mantém consistência com Leaflet)
 * Usa variáveis CSS para permitir ajustes centralizados do tema
 */
export function getHoverColors() {
  return {
    stroke: readCssVar('--map-hover-stroke', '#2563eb'),        // Azul médio
    fill: readCssVar('--map-hover-fill', '#bfdbfe'),            // Azul claro
    strokeWidth: 2.5,
    fillOpacity: 0.35,
  };
}

/**
 * Configuração de handlers de hover para MapLibre GL
 * 
 * @param map - Instância do MapLibre GL Map
 * @param layerId - ID da camada (ex: 'polos-fill', 'peri-fill')
 * @param isPolo - true se for camada de polos, false se for periferias
 * @param getRelacionamentos - Função que retorna Set de códigos IBGE com relacionamento ativo
 * @param getNegociacoes - Função que retorna Set de códigos IBGE em negociação
 * 
 * Uso:
 *   setupMapLibreHover(map, 'polos-fill', true, () => relacionamentoRef.current, () => negociacaoRef.current);
 */
export function setupMapLibreHover(
  map: maplibregl.Map,
  layerId: string,
  isPolo: boolean,
  getRelacionamentos?: () => Set<string>,
  getNegociacoes?: () => Set<string>
): void {
  let popup: maplibregl.Popup | null = null;
  let hoveredFeatureId: string | number | null = null;

  // Estilo de hover
  const hoverColors = getHoverColors();

  // Handler de mousemove (exibe tooltip + aplica realce)
  map.on('mousemove', layerId, (e) => {
    if (!e.features || e.features.length === 0) return;

    const feature = e.features[0];
    const properties = feature.properties || {};
    
    // Obtém os Sets atualizados através dos getters
    const municipiosComRelacionamento = getRelacionamentos ? getRelacionamentos() : undefined;
    const municipiosEmNegociacao = getNegociacoes ? getNegociacoes() : undefined;

    // Gera HTML do tooltip baseado no tipo (polo ou periferia), passando os Sets
    const tooltipHtml = isPolo
      ? poloTooltipHtml(properties, municipiosComRelacionamento, municipiosEmNegociacao)
      : periferiaTooltipHtml(properties, municipiosComRelacionamento, municipiosEmNegociacao);

    // Remove popup anterior se existir
    if (popup) {
      popup.remove();
    }

    // Cria novo popup com a mesma classe do Leaflet para manter estilo consistente
    popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'muni-tooltip maplibregl-popup',
      offset: 12,
    })
      .setLngLat(e.lngLat)
      .setHTML(tooltipHtml)
      .addTo(map);

    // Aplica realce visual ao feature (apenas se tiver ID válido)
    const sourceId = map.getLayer(layerId)?.source as string;
    if (sourceId) {
      // Remove hover do feature anterior se existir
      if (hoveredFeatureId !== null) {
        try {
          map.setFeatureState(
            { source: sourceId, id: hoveredFeatureId },
            { hover: false }
          );
        } catch (error) {
          // Ignora erro se o ID anterior não existir mais
          console.warn('⚠️ [mapLibreHover] Erro ao remover hover do feature anterior:', error);
        }
      }

      // Gera um ID único baseado nas propriedades do município
      // Para polos: usa codigo_origem
      // Para periferias: usa codigo_destino ou codigo_origem + codigo_destino
      const newFeatureId = isPolo
        ? properties.codigo_origem || properties.code_muni || properties.codigo_ibge || `polo-${Math.random()}`
        : properties.codigo_destino || properties.codigo || properties.codigo_ibge || `peri-${Math.random()}`;

      // Aplica hover no novo feature se conseguimos gerar um ID
      if (newFeatureId) {
        try {
          map.setFeatureState(
            { source: sourceId, id: newFeatureId },
            { hover: true }
          );
          hoveredFeatureId = newFeatureId;
        } catch (error) {
          console.warn('⚠️ [mapLibreHover] Erro ao aplicar hover no feature:', error);
          hoveredFeatureId = null;
        }
      } else {
        hoveredFeatureId = null;
      }
    }

    // Muda cursor para pointer
    map.getCanvas().style.cursor = 'pointer';
  });

  // Handler de mouseleave (remove tooltip + remove realce)
  map.on('mouseleave', layerId, () => {
    // Remove popup
    if (popup) {
      popup.remove();
      popup = null;
    }

    // Remove realce
    const sourceId = map.getLayer(layerId)?.source as string;
    if (sourceId && hoveredFeatureId !== null) {
      try {
        map.setFeatureState(
          { source: sourceId, id: hoveredFeatureId },
          { hover: false }
        );
      } catch (error) {
        console.warn('⚠️ [mapLibreHover] Erro ao remover hover no mouseleave:', error);
      }
      hoveredFeatureId = null;
    }

    // Reseta cursor
    map.getCanvas().style.cursor = '';
  });

  // Handler de click (fallback para touch/mobile)
  map.on('click', layerId, (e) => {
    if (!e.features || e.features.length === 0) return;

    const feature = e.features[0];
    const properties = feature.properties || {};
    
    // Obtém os Sets atualizados através dos getters
    const municipiosComRelacionamento = getRelacionamentos ? getRelacionamentos() : undefined;
    const municipiosEmNegociacao = getNegociacoes ? getNegociacoes() : undefined;

    // Passa os Sets para o tooltip no click também
    const tooltipHtml = isPolo
      ? poloTooltipHtml(properties, municipiosComRelacionamento, municipiosEmNegociacao)
      : periferiaTooltipHtml(properties, municipiosComRelacionamento, municipiosEmNegociacao);

    // Remove popup anterior
    if (popup) {
      popup.remove();
    }

    // Cria popup persistente no click (para mobile)
    popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      className: 'muni-tooltip maplibregl-popup',
      offset: 12,
    })
      .setLngLat(e.lngLat)
      .setHTML(tooltipHtml)
      .addTo(map);
  });
}

/**
 * Handlers de hover específicos para camada de Municípios Sem Tag
 * @param map - Instância do MapLibre GL Map
 * @param layerId - ID da camada
 * @param getRelacionamentos - Função que retorna Set de códigos IBGE com relacionamento ativo
 * @param getNegociacoes - Função que retorna Set de códigos IBGE em negociação
 */
export function setupMapLibreHoverSemTag(
  map: maplibregl.Map,
  layerId: string,
  getRelacionamentos?: () => Set<string>,
  getNegociacoes?: () => Set<string>
): void {
  let popup: maplibregl.Popup | null = null;
  let hoveredFeatureId: string | number | null = null;

  const hoverColors = getHoverColors();

  map.on('mousemove', layerId, (e) => {
    if (!e.features || e.features.length === 0) return;
    const feature = e.features[0];
    const properties = feature.properties || {};
    
    // Obtém os Sets atualizados através dos getters
    const municipiosComRelacionamento = getRelacionamentos ? getRelacionamentos() : undefined;
    const municipiosEmNegociacao = getNegociacoes ? getNegociacoes() : undefined;

    // Passa os Sets para o tooltip
    const tooltipHtml = semTagTooltipHtml(properties, municipiosComRelacionamento, municipiosEmNegociacao);

    if (popup) popup.remove();
    popup = new maplibregl.Popup({
      closeButton: false,
      closeOnClick: false,
      className: 'muni-tooltip maplibregl-popup',
      offset: 12,
    })
      .setLngLat(e.lngLat)
      .setHTML(tooltipHtml)
      .addTo(map);

    const sourceId = map.getLayer(layerId)?.source as string;
    if (sourceId) {
      if (hoveredFeatureId !== null) {
        try {
          map.setFeatureState({ source: sourceId, id: hoveredFeatureId }, { hover: false });
        } catch {}
      }
      const newFeatureId = properties.codigo || properties.codigo_ibge || properties.code_muni || `sem-${Math.random()}`;
      if (newFeatureId) {
        try {
          map.setFeatureState({ source: sourceId, id: newFeatureId }, { hover: true });
          hoveredFeatureId = newFeatureId;
        } catch { hoveredFeatureId = null; }
      } else {
        hoveredFeatureId = null;
      }
    }
    map.getCanvas().style.cursor = 'pointer';
  });

  map.on('mouseleave', layerId, () => {
    if (popup) { popup.remove(); popup = null; }
    const sourceId = map.getLayer(layerId)?.source as string;
    if (sourceId && hoveredFeatureId !== null) {
      try { map.setFeatureState({ source: sourceId, id: hoveredFeatureId }, { hover: false }); } catch {}
      hoveredFeatureId = null;
    }
    map.getCanvas().style.cursor = '';
  });

  map.on('click', layerId, (e) => {
    if (!e.features || e.features.length === 0) return;
    const feature = e.features[0];
    const properties = feature.properties || {};
    
    // Obtém os Sets atualizados através dos getters
    const municipiosComRelacionamento = getRelacionamentos ? getRelacionamentos() : undefined;
    const municipiosEmNegociacao = getNegociacoes ? getNegociacoes() : undefined;
    
    // Passa os Sets para o tooltip no click também
    const tooltipHtml = semTagTooltipHtml(properties, municipiosComRelacionamento, municipiosEmNegociacao);
    if (popup) popup.remove();
    popup = new maplibregl.Popup({
      closeButton: true,
      closeOnClick: true,
      className: 'muni-tooltip maplibregl-popup',
      offset: 12,
    })
      .setLngLat(e.lngLat)
      .setHTML(tooltipHtml)
      .addTo(map);
  });
}

/**
 * Remove handlers de hover de uma camada MapLibre GL
 * Útil ao destruir camadas dinâmicas ou ao mudar entre visualizações
 *
 * @param map - Instância do MapLibre GL Map
 * @param layerId - ID da camada
 */
export function removeMapLibreHover(
  map: maplibregl.Map,
  layerId: string
): void {
  // Remove todos os listeners do layerId
  // MapLibre GL requer que você remova os listeners com a mesma assinatura de quando foram adicionados
  // Como não armazenamos referências aos listeners, vamos apenas limpar o que pudermos
  try {
    // Nota: MapLibre GL não tem um método simples para remover listeners por layerId
    // Os listeners são removidos automaticamente quando o mapa é destruído
    // Esta função existe para consistência com a API do Leaflet
    console.log(`🧹 [mapLibreHover] Limpeza de handlers para camada ${layerId} será feita ao destruir o mapa`);
  } catch (e) {
    console.warn(`⚠️ [mapLibreHover] Erro ao limpar handlers da camada ${layerId}:`, e);
  }
}

/**
 * Log estruturado para debugging de hover
 * Usa emoji e contexto para facilitar identificação em consoles com muitas mensagens
 *
 * @param action - Ação sendo realizada (ex: "hover", "tooltip-open")
 * @param municipio - Nome do município (se disponível)
 * @param details - Detalhes adicionais
 */
export function logHoverDebug(
  action: string,
  municipio?: string,
  details?: Record<string, any>
): void {
  const muniStr = municipio ? ` (${municipio})` : '';
  const detailsStr = details ? JSON.stringify(details) : '';
  console.log(
    `🎯 [mapLibreHover] ${action}${muniStr}${detailsStr ? ` — ${detailsStr}` : ''}`
  );
}

