import { PDFDocument, rgb, StandardFonts, PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import type { RotaCompleta } from '@/types/routing';

export interface RoutePDFData {
  rota: RotaCompleta;
  dataGeracao: Date;
}

/**
 * Carrega uma fonte Poppins específica
 */
async function loadPoppinsFont(pdfDoc: PDFDocument, weight: 'Regular' | 'Bold' | 'Medium' | 'Light'): Promise<any> {
  try {
    const fontPath = `/Poppins/Poppins-${weight}.ttf`;
    const response = await fetch(fontPath);

    if (!response.ok) {
      throw new Error(`Failed to load font: ${fontPath}`);
    }

    const fontBytes = await response.arrayBuffer();
    return await pdfDoc.embedFont(fontBytes);
  } catch (error) {
    console.error(`Erro ao carregar fonte Poppins-${weight}:`, error);
    // Fallback para Helvetica se a fonte não carregar
    return await pdfDoc.embedFont(weight === 'Bold' ? StandardFonts.HelveticaBold : StandardFonts.Helvetica);
  }
}

/**
 * Adiciona papel timbrado a uma página
 */
async function addLetterheadToPage(page: PDFPage, pdfDoc: PDFDocument, fontPoppins: any, fontPoppinsBold: any, width: number, topY: number): Promise<void> {
  const margin = 50;
  
  // Logo da Innovatis
  await drawInnovatisLogo(page, pdfDoc, margin + 20, topY - 20);
  
  // Nome da empresa
  page.drawText('INNOVATIS', {
    x: margin + 50,
    y: topY - 15,
    size: 14,
    font: fontPoppinsBold,
    color: rgb(0.1, 0.1, 0.1)
  });

  // Subtítulo da empresa
  page.drawText('inteligência em gestão', {
    x: margin + 50,
    y: topY - 28,
    size: 8,
    font: fontPoppins,
    color: rgb(0.4, 0.4, 0.4)
  });

  // Rodapé
  page.drawLine({
    start: { x: margin, y: 60 },
    end: { x: width - margin, y: 60 },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7)
  });

  // Endereços no rodapé
  page.drawText('R. EMPRESÁRIO CLOVIS ROLIM, 2061 BLOCO B, 1702', {
    x: margin,
    y: 45,
    size: 7,
    font: fontPoppins,
    color: rgb(0.5, 0.5, 0.5)
  });
  
  page.drawText('BAIRRO DOS IPÊS - JOÃO PESSOA - PB, 58033-454', {
    x: margin,
    y: 35,
    size: 7,
    font: fontPoppins,
    color: rgb(0.5, 0.5, 0.5)
  });

  const brasiliaText1 = 'BRASÍLIA SHOPPING,';
  const brasiliaText2 = 'SALA 1415/1416 - BRASÍLIA - DF, 70297-000';
  const brasiliaWidth1 = fontPoppins.widthOfTextAtSize(brasiliaText1, 7);
  const brasiliaWidth2 = fontPoppins.widthOfTextAtSize(brasiliaText2, 7);
  
  page.drawText(brasiliaText1, {
    x: width - margin - brasiliaWidth1,
    y: 45,
    size: 7,
    font: fontPoppins,
    color: rgb(0.5, 0.5, 0.5)
  });
  
  page.drawText(brasiliaText2, {
    x: width - margin - brasiliaWidth2,
    y: 35,
    size: 7,
    font: fontPoppins,
    color: rgb(0.5, 0.5, 0.5)
  });
}

/**
 * Carrega e desenha a logo da Innovatis do arquivo PNG
 */
async function drawInnovatisLogo(page: PDFPage, pdfDoc: PDFDocument, centerX: number, centerY: number): Promise<void> {
  try {
    // Carregar a imagem PNG da logo usando fetch
    const response = await fetch('/logo-innovatis_preta_nova.png');
    if (!response.ok) {
      throw new Error(`Failed to fetch logo: ${response.status}`);
    }
    
    const logoBytes = await response.arrayBuffer();
    
    // Incorporar a imagem no PDF
    const logoImage = await pdfDoc.embedPng(logoBytes);
    
    // Obter dimensões da imagem
    const { width, height } = logoImage.scale(1);
    
    // Calcular escala para manter proporção (altura máxima de 40px)
    const maxHeight = 40;
    const scale = maxHeight / height;
    const scaledWidth = width * scale;
    const scaledHeight = height * scale;
    
    // Desenhar a imagem centralizada
    page.drawImage(logoImage, {
      x: centerX - scaledWidth / 2,
      y: centerY - scaledHeight / 2,
      width: scaledWidth,
      height: scaledHeight,
    });
  } catch (error) {
    console.error('Erro ao carregar logo:', error);
    
    // Fallback: desenhar um círculo simples se a imagem não carregar
    page.drawCircle({
      x: centerX,
      y: centerY,
      size: 20,
      borderColor: rgb(0.1, 0.1, 0.1),
      borderWidth: 2,
      color: rgb(0.95, 0.95, 0.95)
    });
    
    page.drawText('I', {
      x: centerX - 4,
      y: centerY - 6,
      size: 16,
      color: rgb(0.1, 0.1, 0.1)
    });
  }
}

/**
 * Gera PDF profissional da rota calculada
 */
export async function generateRoutePDF(routeData: RoutePDFData): Promise<{ bytes: Uint8Array; fileName: string; displayName: string }> {
  const { rota, dataGeracao } = routeData;

  // Criar novo documento PDF
  const pdfDoc = await PDFDocument.create();

  // Registrar fontkit para suportar fontes customizadas (TTF)
  pdfDoc.registerFontkit(fontkit);

  let page = pdfDoc.addPage([595.28, 841.89]); // A4
  const { width, height } = page.getSize();

  // Carregar fontes Poppins
  const fontPoppins = await loadPoppinsFont(pdfDoc, 'Regular');
  const fontPoppinsBold = await loadPoppinsFont(pdfDoc, 'Bold');
  const fontPoppinsMedium = await loadPoppinsFont(pdfDoc, 'Medium');
  const fontPoppinsLight = await loadPoppinsFont(pdfDoc, 'Light');

  const margin = 50;
  let currentY = height - margin;

  // Papel timbrado - Cabeçalho
  // Logo da Innovatis (usando arquivo PNG)
  await drawInnovatisLogo(page, pdfDoc, margin + 20, currentY - 20);

  // Nome da empresa (sem subtítulo, como no papel timbrado)
  page.drawText('INNOVATIS', {
    x: margin + 50,
    y: currentY - 15,
    size: 14,
    font: fontPoppinsBold,
    color: rgb(0.1, 0.1, 0.1)
  });

  // Subtítulo da empresa
  page.drawText('inteligência em gestão', {
    x: margin + 50,
    y: currentY - 28,
    size: 8,
    font: fontPoppins,
    color: rgb(0.4, 0.4, 0.4)
  });

  // Linha separadora horizontal (como no papel timbrado)
  page.drawLine({
    start: { x: margin, y: currentY - 45 },
    end: { x: width - margin, y: currentY - 45 },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7)
  });

  // Data de geração alinhada à direita
  const dataText = `Gerado em: ${dataGeracao.toLocaleString('pt-BR')}`;
  const dataWidth = fontPoppins.widthOfTextAtSize(dataText, 10);
  page.drawText(dataText, {
    x: width - margin - dataWidth,
    y: currentY - 15,
    size: 10,
    font: fontPoppins,
    color: rgb(0.4, 0.4, 0.4)
  });

  currentY -= 80;

  // Título principal
  const title = 'Relatório de Rotas Otimizadas';
  page.drawText(title, {
    x: margin,
    y: currentY,
    size: 20,
    font: fontPoppinsBold,
    color: rgb(0, 0, 0)
  });

  currentY -= 35;

  // Linha separadora
  page.drawLine({
    start: { x: margin, y: currentY },
    end: { x: width - margin, y: currentY },
    thickness: 1,
    color: rgb(0.5, 0.5, 0.5)
  });

  currentY -= 35;

  // Seção: Informações do Relatório
  page.drawText('Informações do Relatório', {
    x: margin,
    y: currentY,
    size: 14,
    font: fontPoppinsBold,
    color: rgb(0, 0, 0)
  });

  currentY -= 25;

  // Linha separadora
  page.drawLine({
    start: { x: margin, y: currentY },
    end: { x: width - margin, y: currentY },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8)
  });

  currentY -= 20;

  // Informações do relatório
  const reportInfo = [
    ['Total de trechos:', rota.trechos.length.toString()],
    ['Plataforma:', 'NEXUS'],
    ['Módulo:', 'Otimização de Rotas'],
  ];

  reportInfo.forEach(([label, value]) => {
    // Label
    page.drawText(label, {
      x: margin,
      y: currentY,
      size: 11,
      font: fontPoppinsBold,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Value
    page.drawText(value, {
      x: margin + 160,
      y: currentY,
      size: 10,
      font: fontPoppins,
      color: rgb(0, 0, 0)
    });

    currentY -= 15;
  });

  currentY -= 20;

  // Seção: Dados da Rota
  page.drawText(`Dados da Rota (${rota.trechos.length} trechos)`, {
    x: margin,
    y: currentY,
    size: 14,
    font: fontPoppinsBold,
    color: rgb(0, 0, 0)
  });

  currentY -= 25;

  // Linha separadora
  page.drawLine({
    start: { x: margin, y: currentY },
    end: { x: width - margin, y: currentY },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8)
  });

  currentY -= 20;

  // Informações da rota
  const routeInfo = [
    ['Nome da Rota:', rota.nome],
    ['Total de Polos:', rota.estatisticas.numeroPolos.toString()],
    ['Total de Periferias:', rota.estatisticas.numeroPeriferias.toString()],
    ['Distância Total:', `${rota.estatisticas.distanciaTotalKm.toFixed(1)} km`],
    ['Tempo Total Estimado:', formatarTempo(rota.estatisticas.tempoTotalMinutos)],
    ['Trechos Aéreos:', rota.estatisticas.numeroTrechosVoo.toString()],
    ['Trechos Terrestres:', rota.estatisticas.numeroTrechosTerrestre.toString()],
  ];

  routeInfo.forEach(([label, value]) => {
    // Label
    page.drawText(label, {
      x: margin,
      y: currentY,
      size: 11,
      font: fontPoppinsBold,
      color: rgb(0.5, 0.5, 0.5)
    });

    // Value
    page.drawText(value, {
      x: margin + 160,
      y: currentY,
      size: 11,
      font: fontPoppins,
      color: rgb(0, 0, 0)
    });

    currentY -= 20;
  });

  currentY -= 20;

  // Título dos trechos
  page.drawText('DETALHAMENTO DOS TRECHOS', {
    x: margin,
    y: currentY,
    size: 14,
    font: fontPoppinsBold,
    color: rgb(0, 0, 0)
  });

  currentY -= 25;

  // Cabeçalhos da tabela
  const tableHeaders = ['Tipo', 'Origem', 'Destino', 'Distância', 'Tempo'];
  const colWidths = [90, 130, 130, 70, 75];
  let currentX = margin;

  tableHeaders.forEach((header, index) => {
    page.drawText(header, {
      x: currentX,
      y: currentY,
      size: 10,
      font: fontPoppinsBold,
      color: rgb(0.5, 0.5, 0.5)
    });
    currentX += colWidths[index];
  });

  currentY -= 15;

  // Linha separadora da tabela
  page.drawLine({
    start: { x: margin, y: currentY },
    end: { x: width - margin, y: currentY },
    thickness: 1,
    color: rgb(0.8, 0.8, 0.8)
  });

  currentY -= 20;

  // Dados dos trechos
  rota.trechos.forEach((trecho, index) => {
    // Verificar se precisa de nova página
    if (currentY < 100) {
      const newPage = pdfDoc.addPage([595.28, 841.89]);
      currentY = newPage.getHeight() - margin;
      page = newPage;
      
      // Aplicar papel timbrado básico na nova página (sem logo para simplificar)
      page.drawLine({
        start: { x: margin, y: currentY - 45 },
        end: { x: width - margin, y: currentY - 45 },
        thickness: 1,
        color: rgb(0.7, 0.7, 0.7)
      });
      
      page.drawText('INNOVATIS - inteligência em gestão', {
        x: margin,
        y: currentY - 25,
        size: 10,
        font: fontPoppinsBold,
        color: rgb(0.5, 0.5, 0.5)
      });
      
      currentY -= 80;
    }

    currentX = margin;

    const rowData = [
      trecho.tipo === 'voo' ? 'Aéreo (Voo)' : 'Terrestre (Carro)',
      `${formatLocationName(trecho.origem)}`,
      `${formatLocationName(trecho.destino)}`,
      `${trecho.distanciaKm.toFixed(1)} km`,
      formatarTempo(trecho.tempoMinutos)
    ];

    rowData.forEach((data, colIndex) => {
      page.drawText(data, {
        x: currentX,
        y: currentY,
        size: 9,
        font: fontPoppins,
        color: rgb(0, 0, 0)
      });
      currentX += colWidths[colIndex];
    });

    currentY -= 15;
  });

  currentY -= 30;

  // Resumo final
  if (currentY < 150) {
    const newPage = pdfDoc.addPage([595.28, 841.89]);
    currentY = newPage.getHeight() - margin;
    page = newPage;
    
    // Aplicar papel timbrado básico na nova página
    page.drawLine({
      start: { x: margin, y: currentY - 45 },
      end: { x: width - margin, y: currentY - 45 },
      thickness: 1,
      color: rgb(0.7, 0.7, 0.7)
    });
    
    page.drawText('INNOVATIS - inteligência em gestão', {
      x: margin,
      y: currentY - 25,
      size: 10,
      font: fontPoppinsBold,
      color: rgb(0.5, 0.5, 0.5)
    });
    
    currentY -= 80;
  }

  page.drawText('RESUMO EXECUTIVO', {
    x: margin,
    y: currentY,
    size: 12,
    font: fontPoppinsBold,
    color: rgb(0, 0, 0)
  });

  currentY -= 25;

    const summaryText = `Esta rota otimizada compreende ${rota.trechos.length} trechos, conectando ${rota.estatisticas.numeroPolos} polos estratégicos e ${rota.estatisticas.numeroPeriferias} municípios periféricos. A rota combina ${rota.estatisticas.numeroTrechosVoo} trechos aéreos e ${rota.estatisticas.numeroTrechosTerrestre} trechos terrestres para otimizar tempo e eficiência logística.`;

  const words = summaryText.split(' ');
  let line = '';
  const maxWidth = width - 2 * margin;

  for (const word of words) {
    const testLine = line + (line ? ' ' : '') + word;
    const textWidth = fontPoppins.widthOfTextAtSize(testLine, 10);

    if (textWidth > maxWidth && line) {
      page.drawText(line, {
        x: margin,
        y: currentY,
        size: 10,
        font: fontPoppins,
        color: rgb(0, 0, 0)
      });
      currentY -= 15;
      line = word;
    } else {
      line = testLine;
    }
  }

  if (line) {
    page.drawText(line, {
      x: margin,
      y: currentY,
      size: 10,
      font: fontPoppins,
      color: rgb(0, 0, 0)
    });
  }

  currentY -= 40;

  // Linha separadora antes do rodapé
  page.drawLine({
    start: { x: margin, y: 60 },
    end: { x: width - margin, y: 60 },
    thickness: 1,
    color: rgb(0.7, 0.7, 0.7)
  });

  // Rodapé com informações de endereço (papel timbrado)
  // Endereço João Pessoa (lado esquerdo)
  page.drawText('R. EMPRESÁRIO CLOVIS ROLIM, 2061 BLOCO B, 1702', {
    x: margin,
    y: 45,
    size: 7,
    font: fontPoppins,
    color: rgb(0.5, 0.5, 0.5)
  });
  
  page.drawText('BAIRRO DOS IPÊS - JOÃO PESSOA - PB, 58033-454', {
    x: margin,
    y: 35,
    size: 7,
    font: fontPoppins,
    color: rgb(0.5, 0.5, 0.5)
  });

  // Endereço Brasília (lado direito)
  const brasiliaText1 = 'BRASÍLIA SHOPPING,';
  const brasiliaText2 = 'SALA 1415/1416 - BRASÍLIA - DF, 70297-000';
  const brasiliaWidth1 = fontPoppins.widthOfTextAtSize(brasiliaText1, 7);
  const brasiliaWidth2 = fontPoppins.widthOfTextAtSize(brasiliaText2, 7);
  
  page.drawText(brasiliaText1, {
    x: width - margin - brasiliaWidth1,
    y: 45,
    size: 7,
    font: fontPoppins,
    color: rgb(0.5, 0.5, 0.5)
  });
  
  page.drawText(brasiliaText2, {
    x: width - margin - brasiliaWidth2,
    y: 35,
    size: 7,
    font: fontPoppins,
    color: rgb(0.5, 0.5, 0.5)
  });

  // Informação do sistema (centralizada)
  const sistemaText = 'Relatório gerado pelo Plataforma NEXUS';
  const sistemaWidth = fontPoppins.widthOfTextAtSize(sistemaText, 8);
  page.drawText(sistemaText, {
    x: (width - sistemaWidth) / 2,
    y: 20,
    size: 8,
    font: fontPoppins,
    color: rgb(0.4, 0.4, 0.4)
  });

  // Salvar o PDF
  const pdfBytes = await pdfDoc.save();

  // Gerar nome do arquivo
  const timestamp = dataGeracao.toISOString().slice(0, 19).replace(/[:.]/g, '-');
  const fileName = `rota_${rota.id}_${timestamp}.pdf`;
  const displayName = `Rota ${rota.nome} - ${dataGeracao.toLocaleDateString('pt-BR')}.pdf`;

  return {
    bytes: pdfBytes,
    fileName,
    displayName
  };
}

/**
 * Formata o tempo em minutos para string legível
 */
function formatarTempo(minutos: number): string {
  const horas = Math.floor(minutos / 60);
  const minutosRestantes = Math.round(minutos % 60);

  if (horas === 0) {
    return `${minutosRestantes} min`;
  } else if (minutosRestantes === 0) {
    return `${horas}h`;
  } else {
    return `${horas}h ${minutosRestantes}min`;
  }
}

/**
 * Formata nome da localização para exibição
 */
function formatLocationName(location: any): string {
  const name = location.nome || location.municipio || 'N/A';
  const uf = location.uf || location.estado || '';
  return uf ? `${name} (${uf})` : name;
}

/**
 * Faz o download do PDF no navegador
 */
export function downloadPDF(pdfData: { bytes: Uint8Array; fileName: string }): void {
  const blob = new Blob([pdfData.bytes as unknown as ArrayBuffer], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = pdfData.fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(url);
}
