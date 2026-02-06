/**
 * Componente utilitário para gerar o conteúdo HTML do tooltip de municípios
 * Usado no mapa de polos para exibir informações detalhadas ao clicar em um município
 */

interface MunicipioTooltipData {
  nome_municipio?: string;
  name_state?: string;
  code_muni?: string | number;
  valor_total_produtos?: number;
}

/**
 * Gera o HTML do tooltip com as informações do município
 * @param props Propriedades do município (GeoJSON feature.properties)
 * @param isPolo Indica se o município é um Polo Estratégico
 * @returns String HTML formatada para o popup do MapLibre
 */
export function gerarTooltipMunicipio(props: MunicipioTooltipData, isPolo: boolean = false): string {
  // Formatar valor total em reais
  const valorTotal = props.valor_total_produtos 
    ? new Intl.NumberFormat('pt-BR', { 
        style: 'currency', 
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(props.valor_total_produtos)
    : 'N/A';

  // Configurações de estilo baseadas no tipo de município
  const estilo = isPolo 
    ? {
        badgeBg: '#36C244',
        badgeText: '#ffffff',
        badgeIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 20a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1z"/><path d="M10 2v2"/><path d="M14 2v2"/><path d="m17 18-1-9"/><path d="M6 2v5a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V2"/><path d="M6 4h12"/><path d="m7 18 1-9"/></svg>`,
        badgeLabel: 'Polo Estratégicos',
        valorColor: '#22c55e',
        borderColor: '#d1fae5',
        headerBg: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)'
      }
    : {
        badgeBg: '#F5DF09',
        badgeText: '#1a1a1a',
        badgeIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="22" x2="18" y1="12" y2="12"/><line x1="6" x2="2" y1="12" y2="12"/><line x1="12" x2="12" y1="6" y2="2"/><line x1="12" x2="12" y1="22" y2="18"/></svg>`,
        badgeLabel: 'Munic. Oportunidade',
        valorColor: '#ca8a04',
        borderColor: '#fef08a',
        headerBg: 'linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)'
      };

  return `
    <div style="
      min-width: 280px;
      max-width: 300px;
      border-radius: 24px;
      overflow: hidden;
      background: #ffffff;
      box-shadow: 0 10px 40px rgba(0, 0, 0, 0.15);
      border: 1px solid ${estilo.borderColor};
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
    ">
      <!-- Header com gradiente -->
      <div style="
        background: ${estilo.headerBg};
        padding: 16px;
        border-bottom: 2px solid ${estilo.borderColor};
        text-align: center;
      ">
        <!-- Badge -->
        <div style="
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          background: ${estilo.badgeBg};
          color: ${estilo.badgeText};
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.5px;
          padding: 6px 12px;
          border-radius: 20px;
          margin-bottom: 12px;
          text-transform: uppercase;
        ">
          ${estilo.badgeIcon}
          ${estilo.badgeLabel}
        </div>
        
        <!-- Nome do Município -->
        <div style="
          font-weight: 700;
          font-size: 18px;
          line-height: 1.2;
          color: #0f172a;
          margin: 0;
          text-align: center;
        ">
          ${props.nome_municipio || 'Município'}
        </div>
      </div>

      <!-- Conteúdo Principal -->
      <div style="padding: 16px; text-align: center;">
        <!-- Estado (UF) -->
        <div style="
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 16px;
          font-size: 13px;
        ">
          <span style="
            color: #64748b;
            font-weight: 500;
          ">UF:</span>
          <span style="
            color: #1e293b;
            font-weight: 600;
            letter-spacing: 1px;
          ">${props.name_state || '—'}</span>
        </div>

        <!-- Separador -->
        <div style="
          height: 1px;
          background: linear-gradient(90deg, ${estilo.borderColor} 0%, transparent 50%, ${estilo.borderColor} 100%);
          margin: 12px 0;
        "></div>

        <!-- Valor Total -->
        <div style="margin-top: 12px; text-align: center;">
          <div style="
            font-size: 11px;
            font-weight: 600;
            color: #64748b;
            letter-spacing: 0.5px;
            text-transform: uppercase;
            margin-bottom: 6px;
          ">
            💰 Valor Total Produtos
          </div>
          
          <div style="
            font-size: 16px;
            font-weight: 700;
            color: ${estilo.valorColor};
            letter-spacing: -0.5px;
          ">
            ${valorTotal}
          </div>
        </div>
      </div>

      <!-- Footer com informação adicional -->
      <div style="
        background: #f8fafc;
        padding: 10px 16px;
        border-top: 1px solid ${estilo.borderColor};
        font-size: 11px;
        color: #94a3b8;
        text-align: center;
        border-radius: 0 0 24px 24px;
      ">
        Clique para mais detalhes
      </div>
    </div>
  `;
}

/**
 * Configuração padrão do popup MapLibre
 */
export const TOOLTIP_CONFIG = {
  closeButton: true,
  closeOnClick: true,
  maxWidth: '300px',
} as const;
