/**
 * Utilitários para hover/tooltip em camadas de municípios no mapa Leaflet
 * Fornece lógica reutilizável para realce visual, extração de dados e renderização de tooltips
 *
 * Responsabilidades:
 * - Extrair campos municipais com fallbacks robustos (tolerante a esquemas diferentes)
 * - Gerar HTML do tooltip com escape XSS
 * - Aplicar/remover estilos de hover mantendo idempotência
 * - Anexar handlers de mouseover/mouseout/click aos features
 *
 * Pontos de extensão:
 * - `extractMuniFields`: adicione novos esquemas de propriedades aqui
 * - `muniTooltipHtml`: customize campos/layout do tooltip
 * - `getHoverStyle`: ajuste o visual do realce
 * - `attachMuniHoverHandlers`: adicione novos listeners (ex.: contexto menu)
 */

import L from 'leaflet';

/**
 * Interface para campos extraídos de um município
 * Garante tipagem forte durante manipulação de dados
 */
export interface MuniFields {
  uf: string;      // Unidade Federativa (sigla: "SP", "RJ", etc.)
  ibge: string;    // Código IBGE (municipio + 1 dígito verificador)
  nome: string;    // Nome completo do município
}

/**
 * Tipo genérico para propriedades de features GeoJSON
 */
type MuniProps = Record<string, any>;

/**
 * Extrai campos essenciais de um município a partir de propriedades GeoJSON
 * com fallbacks múltiplos para suportar diferentes esquemas de dados.
 *
 * Estratégia:
 * 1. UF: busca em variações de nomes (UF, uf, sigla_uf, UF_origem, etc.)
 * 2. IBGE: busca em variações (code_muni, codigo_ibge, CD_MUN, etc.)
 * 3. Nome: busca em variações (nome, nome_municipio, NM_MUN, municipio, etc.)
 * 4. Fallback final: "-" (indica campo não disponível)
 *
 * @param properties - Objeto de propriedades do feature
 * @returns MuniFields com UF, IBGE e Nome extraídos
 *
 * Exemplo:
 *   const fields = extractMuniFields({ nome_municipio: "São Paulo", name_state: "SP", code_muni: 3550308 });
 *   // { uf: "SP", ibge: "3550308", nome: "São Paulo" }
 */
export function extractMuniFields(properties: MuniProps): MuniFields {
  const uf =
    properties.UF ??
    properties.uf ??
    properties.sigla_uf ??
    properties.UF_origem ??
    properties.UF_destino ??
    properties.name_state ??
    properties.state ??
    properties.STATE ??
    '-';

  const ibge =
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
    properties.nome ??
    properties.nome_munic ??
    properties.nome_municipio ??
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
 *
 * Exemplo:
 *   readCssVar('--map-hover-stroke', '#2563eb') // lê CSS var ou retorna fallback
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
    console.warn(`⚠️ [mapHoverHandlers] Erro ao ler CSS var '${varName}':`, e);
    return fallback;
  }
}

/**
 * Gera HTML do tooltip com informações do município
 * Mantém estrutura simples, semântica, e pronta para CSS
 *
 * @param properties - Propriedades do feature GeoJSON
 * @returns String com HTML do tooltip
 *
 * Estrutura:
 *   <div class="t-muni">
 *     <div class="t-title">Nome do Município</div>
 *     <div class="t-row">UF: <b>SP</b></div>
 *     <div class="t-row">IBGE: <b>3550308</b></div>
 *   </div>
 */
export function muniTooltipHtml(properties: MuniProps): string {
  const { uf, nome } = extractMuniFields(properties);

  return `
    <div class="t-muni">
      <div class="t-title">${escapeHtml(nome)}</div>
      <div class="t-row">UF: <b>${escapeHtml(uf)}</b></div>
    </div>
  `.trim();
}

/**
 * Retorna estilos de hover para polígonos de municípios
 * Mantém realce leve e harmônico com a paleta de cores do site
 *
 * Usa variáveis CSS para permitir ajustes centralizados do tema
 * sem tocar no código do mapa.
 *
 * @returns L.PathOptions com stroke, color, fillColor, fillOpacity, weight
 */
export function getHoverStyle(): L.PathOptions {
  return {
    weight: 2.5,                                                  // Borda ligeiramente mais grossa
    color: readCssVar('--map-hover-stroke', '#2563eb'),          // Azul médio
    fillColor: readCssVar('--map-hover-fill', '#bfdbfe'),        // Azul claro
    fillOpacity: 0.35,                                            // Opacidade moderada
  };
}

/**
 * Anexa handlers de hover/tooltip a um layer de município
 * Chamada por `onEachFeature` ou em loop com `eachLayer` após `addData`
 *
 * Comportamento:
 * - mouseover: aplica realce + traz layer para frente (z-index)
 * - mouseout: remove realce via resetStyle (seguro, sem resíduos)
 * - click: abre tooltip manualmente (suporte a touch/tap)
 *
 * Idempotência:
 * - Safe para ser chamada múltiplas vezes no mesmo layer
 * - Usa resetStyle do GeoJSON parent para garantir limpeza
 *
 * @param parentGeo - Instância do L.GeoJSON container (usado para resetStyle)
 * @returns Função onEachFeature pronta para uso em L.geoJSON()
 *
 * Uso:
 *   const geo = L.geoJSON(data, {
 *     onEachFeature: attachMuniHoverHandlers(geo)
 *   }).addTo(map);
 *
 *   Ou em loop pós-criação:
 *   const geo = L.geoJSON(data, { style: myStyle });
 *   geo.eachLayer((layer) => {
 *     attachMuniHoverHandlers(geo)(geo.feature as any, layer);
 *   });
 */
export function attachMuniHoverHandlers(
  parentGeo: L.GeoJSON
): (feature: any, layer: L.Layer) => void {
  return (feature: any, layer: L.Layer) => {
    // Valida se o layer é um Path (polygon/polyline) — tooltips em pontos não fazem sentido
    if (!(layer instanceof L.Path)) {
      return;
    }

    const props = (feature && (feature as any).properties) || {};

    // --- Tooltip pegajoso (segue o mouse) ---
    // sticky: true faz o tooltip seguir o cursor
    // direction: "top" prefere posicionar acima do polígono
    // offset: desloca verticamente para evitar conflito com cursor
    // className: permite styling customizado via CSS
    // opacity: opacidade suave (legibilidade mantida)
    (layer as L.Path).bindTooltip(muniTooltipHtml(props), {
      sticky: true,
      direction: 'top',
      offset: L.point(0, -12),
      className: 'muni-tooltip',
      opacity: 0.96,
    });

    // --- Hover highlight (mouseover) ---
    layer.on('mouseover', function () {
      (layer as L.Path).setStyle(getHoverStyle());

      // Traz o layer para frente (respeitando limitações de browsers antigos)
      // Evita que o layer fique "por baixo" de vizinhos durante hover
      if (!(L as any).Browser.ie && !(L as any).Browser.opera) {
        (layer as L.Path).bringToFront();
      }
    });

    // --- Reset seguro (mouseout) ---
    // resetStyle remove os estilos aplicados ao vivo e retorna ao estilo original do GeoJSON
    // Garante que não haja "fantasmas" de estilo após sair do hover
    layer.on('mouseout', function () {
      parentGeo.resetStyle(layer as any);
    });

    // --- Fallback para touch/tap (click) ---
    // Em dispositivos touch, não há "hover" nativo, então abrimos o tooltip no tap
    layer.on('click', function () {
      (layer as any).openTooltip();
    });

    // Nota: Não usamos setInterval ou setTimeout para hover
    // Isso evita memory leaks e garante que a lógica é idempotente
  };
}

/**
 * Função de limpeza para remover handlers de hover de um layer específico
 * Útil ao destruir camadas dinâmicas ou ao mudar entre visualizações
 *
 * @param layer - Layer do qual remover listeners
 */
export function removeMuniHoverHandlers(layer: L.Layer): void {
  if (!(layer instanceof L.Path)) {
    return;
  }

  layer.off('mouseover');
  layer.off('mouseout');
  layer.off('click');

  // Remove tooltip se existir
  if ((layer as any).unbindTooltip) {
    (layer as any).unbindTooltip();
  }
}

/**
 * Aplica handlers de hover a todos os layers de uma camada GeoJSON
 * Útil para aplicar hover a camadas criadas antes do código de hover existir
 *
 * @param geoJsonLayer - Instância de L.GeoJSON
 *
 * Exemplo:
 *   applyMuniHoverToLayer(layersRef.current.dados);
 */
export function applyMuniHoverToLayer(geoJsonLayer: L.GeoJSON | null): void {
  if (!geoJsonLayer) {
    return;
  }

  const handler = attachMuniHoverHandlers(geoJsonLayer);
  geoJsonLayer.eachLayer((layer: L.Layer) => {
    const ft = (layer as any).feature;
    if (ft) {
      handler(ft, layer);
    }
  });
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
    `🎯 [mapHover] ${action}${muniStr}${detailsStr ? ` — ${detailsStr}` : ''}`
  );
}
