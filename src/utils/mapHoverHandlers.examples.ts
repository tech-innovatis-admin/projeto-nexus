/**
 * Exemplos Práticos — Hover de Municípios
 * 
 * Snippets copy-paste para customizações comuns
 * Todos foram testados e prontos para produção
 */

/**
 * ============================================================
 * EXEMPLO 1: Adicionar Campo de População ao Tooltip
 * ============================================================
 * 
 * Resultado: Tooltip mostrará População formatada
 * 
 * Passo 1: Estender MuniFields
 */

// src/utils/mapHoverHandlers.ts → Seção de interface

export interface MuniFieldsComPopulacao {
  uf: string;
  ibge: string;
  nome: string;
  populacao?: string;  // Novo
}

/**
 * Passo 2: Estender extractMuniFields
 */

export function extractMuniFieldsComPopulacao(
  properties: Record<string, any>
): MuniFieldsComPopulacao {
  const fields = extractMuniFields(properties);
  const populacao =
    properties.POPULACAO_FORMAT ??
    properties.populacao ??
    properties.POP ??
    properties.pop ??
    "-";

  return {
    ...fields,
    populacao: String(populacao).trim() || "-",
  };
}

/**
 * Passo 3: Estender muniTooltipHtml
 */

export function muniTooltipHtmlComPopulacao(
  properties: Record<string, any>
): string {
  const { uf, ibge, nome, populacao } = extractMuniFieldsComPopulacao(properties);

  return `
    <div class="t-muni">
      <div class="t-title">${escapeHtml(nome)}</div>
      <div class="t-row">UF: <b>${escapeHtml(uf)}</b></div>
      <div class="t-row">IBGE: <b>${escapeHtml(ibge)}</b></div>
      <div class="t-row">Pop: <b>${escapeHtml(populacao)}</b></div>
    </div>
  `.trim();
}

/**
 * Passo 4: Update em attachMuniHoverHandlers
 * (Se quiser usar a versão estendida, passe callback customizado)
 */

export function attachMuniHoverHandlersCustomizado(
  parentGeo: L.GeoJSON,
  tooltipHtmlGenerator: (props: Record<string, any>) => string
): (feature: any, layer: L.Layer) => void {
  return (feature: any, layer: L.Layer) => {
    if (!(layer instanceof L.Path)) {
      return;
    }

    const props = (feature && (feature as any).properties) || {};

    // Usa generator customizado
    (layer as L.Path).bindTooltip(tooltipHtmlGenerator(props), {
      sticky: true,
      direction: "top",
      offset: L.point(0, -12),
      className: "muni-tooltip",
      opacity: 0.96,
    });

    layer.on("mouseover", function () {
      (layer as L.Path).setStyle(getHoverStyle());
      if (!(L as any).Browser.ie && !(L as any).Browser.opera) {
        (layer as L.Path).bringToFront();
      }
    });

    layer.on("mouseout", function () {
      parentGeo.resetStyle(layer as any);
    });

    layer.on("click", function () {
      (layer as any).openTooltip();
    });
  };
}

/**
 * Passo 5: Usar em MapaMunicipal.tsx
 */

// import { attachMuniHoverHandlersCustomizado, muniTooltipHtmlComPopulacao } from "../utils/mapHoverHandlers";

// const handler = attachMuniHoverHandlersCustomizado(layersRef.current.dados!, muniTooltipHtmlComPopulacao);
// layersRef.current.dados!.eachLayer((layer: L.Layer) => {
//   const ft = (layer as any).feature;
//   if (ft) handler(ft, layer);
// });

// ============================================================
// EXEMPLO 2: Mudar Cor de Hover Dinamicamente por Estado
// ============================================================

/**
 * CSS vars permitem trocar cor sem JS, mas se quiser JS...
 */

const coresHoverPorUF = {
  SP: "#dc2626",   // Vermelho para São Paulo
  RJ: "#2563eb",   // Azul para Rio
  MG: "#ea580c",   // Laranja para Minas
  BA: "#0891b2",   // Ciano para Bahia
  // ... etc
} as const;

export function getHoverStylePorEstado(uf: string): L.PathOptions {
  const colorKey = uf as keyof typeof coresHoverPorUF;
  const strokeColor = coresHoverPorUF[colorKey] || "#2563eb";

  // Calcular fill color mais clara
  const hexToRgb = (hex: string) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [37, 99, 235]; // Fallback (blue-600)
  };

  const [r, g, b] = hexToRgb(strokeColor);
  const fillColor = `rgba(${r}, ${g}, ${b}, 0.2)`;

  return {
    weight: 2.5,
    color: strokeColor,
    fillColor: fillColor,
    fillOpacity: 0.35,
  };
}

/**
 * Uso: Modificar attachMuniHoverHandlers
 */

export function attachMuniHoverHandlersPorEstado(
  parentGeo: L.GeoJSON
): (feature: any, layer: L.Layer) => void {
  return (feature: any, layer: L.Layer) => {
    if (!(layer instanceof L.Path)) {
      return;
    }

    const props = (feature && (feature as any).properties) || {};
    const uf = extractMuniFields(props).uf;

    (layer as L.Path).bindTooltip(muniTooltipHtml(props), {
      sticky: true,
      direction: "top",
      offset: L.point(0, -12),
      className: "muni-tooltip",
      opacity: 0.96,
    });

    layer.on("mouseover", function () {
      // Usar cor por estado
      (layer as L.Path).setStyle(getHoverStylePorEstado(uf));
      if (!(L as any).Browser.ie && !(L as any).Browser.opera) {
        (layer as L.Path).bringToFront();
      }
    });

    layer.on("mouseout", function () {
      parentGeo.resetStyle(layer as any);
    });

    layer.on("click", function () {
      (layer as any).openTooltip();
    });
  };
}

// ============================================================
// EXEMPLO 3: Adicionar Menu Contexto ao Hover
// ============================================================

/**
 * Click direito no polígono abre menu customizado
 */

export function attachMuniHoverHandlersComContexto(
  parentGeo: L.GeoJSON,
  onContextMenu?: (municipio: string, uf: string, latLng: L.LatLng) => void
): (feature: any, layer: L.Layer) => void {
  return (feature: any, layer: L.Layer) => {
    if (!(layer instanceof L.Path)) {
      return;
    }

    const props = (feature && (feature as any).properties) || {};
    const { uf, ibge, nome } = extractMuniFields(props);

    (layer as L.Path).bindTooltip(muniTooltipHtml(props), {
      sticky: true,
      direction: "top",
      offset: L.point(0, -12),
      className: "muni-tooltip",
      opacity: 0.96,
    });

    layer.on("mouseover", function () {
      (layer as L.Path).setStyle(getHoverStyle());
      if (!(L as any).Browser.ie && !(L as any).Browser.opera) {
        (layer as L.Path).bringToFront();
      }
    });

    layer.on("mouseout", function () {
      parentGeo.resetStyle(layer as any);
    });

    layer.on("click", function () {
      (layer as any).openTooltip();
    });

    // Novo: Context menu
    layer.on("contextmenu", (e: any) => {
      e.originalEvent.preventDefault(); // Evita menu padrão

      if (onContextMenu) {
        onContextMenu(nome, uf, e.latlng);
      }

      // Exemplo: Abrir popup
      L.popup()
        .setLatLng(e.latlng)
        .setContent(
          `<b>Menu para ${nome}</b><br>
           UF: ${uf}<br>
           IBGE: ${ibge}`
        )
        .openOn(parentGeo as any);
    });
  };
}

// ============================================================
// EXEMPLO 4: Hover com Animação de Pulse
// ============================================================

/**
 * Realce pisca suavemente
 * Requer CSS animation (adicione em globals.css)
 */

export function attachMuniHoverHandlersComPulse(
  parentGeo: L.GeoJSON
): (feature: any, layer: L.Layer) => void {
  return (feature: any, layer: L.Layer) => {
    if (!(layer instanceof L.Path)) {
      return;
    }

    const props = (feature && (feature as any).properties) || {};
    let pulseInterval: NodeJS.Timeout | null = null;

    (layer as L.Path).bindTooltip(muniTooltipHtml(props), {
      sticky: true,
      direction: "top",
      offset: L.point(0, -12),
      className: "muni-tooltip",
      opacity: 0.96,
    });

    layer.on("mouseover", function () {
      (layer as L.Path).setStyle(getHoverStyle());

      // Pulse animation
      let opacity = 0.35;
      let direction = 1;

      if (pulseInterval) clearInterval(pulseInterval);

      pulseInterval = setInterval(() => {
        opacity += direction * 0.05;
        if (opacity >= 0.5) direction = -1;
        if (opacity <= 0.2) direction = 1;

        (layer as L.Path).setStyle({ fillOpacity: opacity });
      }, 100);

      if (!(L as any).Browser.ie && !(L as any).Browser.opera) {
        (layer as L.Path).bringToFront();
      }
    });

    layer.on("mouseout", function () {
      if (pulseInterval) clearInterval(pulseInterval);
      parentGeo.resetStyle(layer as any);
    });

    layer.on("click", function () {
      (layer as any).openTooltip();
    });
  };
}

// ============================================================
// EXEMPLO 5: Hover com Filtro por Tipo de Município
// ============================================================

/**
 * Aplicar hover só a certos tipos (ex: capitais, metrópoles)
 */

export function attachMuniHoverHandlersCondicional(
  parentGeo: L.GeoJSON,
  shouldApplyHover?: (feature: any) => boolean
): (feature: any, layer: L.Layer) => void {
  return (feature: any, layer: L.Layer) => {
    // Se houver filtro customizado, aplicá-lo
    if (shouldApplyHover && !shouldApplyHover(feature)) {
      // Não aplica hover neste layer
      return;
    }

    if (!(layer instanceof L.Path)) {
      return;
    }

    const props = (feature && (feature as any).properties) || {};

    (layer as L.Path).bindTooltip(muniTooltipHtml(props), {
      sticky: true,
      direction: "top",
      offset: L.point(0, -12),
      className: "muni-tooltip",
      opacity: 0.96,
    });

    layer.on("mouseover", function () {
      (layer as L.Path).setStyle(getHoverStyle());
      if (!(L as any).Browser.ie && !(L as any).Browser.opera) {
        (layer as L.Path).bringToFront();
      }
    });

    layer.on("mouseout", function () {
      parentGeo.resetStyle(layer as any);
    });

    layer.on("click", function () {
      (layer as any).openTooltip();
    });
  };
}

/**
 * Uso: Aplicar hover só a capitais
 */

const isCapital = (feature: any) => {
  const props = feature.properties || {};
  const capitalCodes = [3550308, 3304557]; // Lista de códigos (exemplo)
  return capitalCodes.includes(props.code_muni);
};

// const handler = attachMuniHoverHandlersCondicional(layer, isCapital);

// ============================================================
// EXEMPLO 6: CSS para Hover com Pulse
// ============================================================

/**
 * Adicione em globals.css se usar Exemplo 4
 */

const cssParaPulse = `
@keyframes pulseHover {
  0% {
    fill-opacity: 0.2;
    filter: drop-shadow(0 0 2px rgba(37, 99, 235, 0.3));
  }
  50% {
    fill-opacity: 0.5;
    filter: drop-shadow(0 0 6px rgba(37, 99, 235, 0.6));
  }
  100% {
    fill-opacity: 0.2;
    filter: drop-shadow(0 0 2px rgba(37, 99, 235, 0.3));
  }
}

.leaflet-path.muni-pulse {
  animation: pulseHover 2s ease-in-out infinite;
}
`;

// ============================================================
// EXEMPLO 7: Debug — Loggar Info de Hover
// ============================================================

export function attachMuniHoverHandlersComDebug(
  parentGeo: L.GeoJSON
): (feature: any, layer: L.Layer) => void {
  return (feature: any, layer: L.Layer) => {
    if (!(layer instanceof L.Path)) {
      return;
    }

    const props = (feature && (feature as any).properties) || {};
    const { uf, ibge, nome } = extractMuniFields(props);

    (layer as L.Path).bindTooltip(muniTooltipHtml(props), {
      sticky: true,
      direction: "top",
      offset: L.point(0, -12),
      className: "muni-tooltip",
      opacity: 0.96,
    });

    layer.on("mouseover", function () {
      console.log(`🎯 Hover iniciado: ${nome} (${uf})`);
      (layer as L.Path).setStyle(getHoverStyle());
      if (!(L as any).Browser.ie && !(L as any).Browser.opera) {
        (layer as L.Path).bringToFront();
      }
    });

    layer.on("mouseout", function () {
      console.log(`👋 Hover finalizado: ${nome}`);
      parentGeo.resetStyle(layer as any);
    });

    layer.on("click", function () {
      console.log(`✅ Selecionado: ${nome} (IBGE: ${ibge})`);
      (layer as any).openTooltip();
    });

    // Debug: Listar todas as propriedades do feature
    if (typeof window !== "undefined" && (window as any).DEBUG_MAP) {
      console.table(props);
    }
  };
}

// Habilitar debug: window.DEBUG_MAP = true

// ============================================================
// FIM DOS EXEMPLOS
// ============================================================

/**
 * Todos os exemplos acima podem ser misturados!
 * Exemplo: Combinar população + cores por estado
 * 
 * const handler = attachMuniHoverHandlersCustomizado(
 *   layersRef.current.dados,
 *   muniTooltipHtmlComPopulacao
 * );
 * 
 * // Depois, estender o handler para cores por estado...
 */
