import { PDFDocument } from 'pdf-lib';

export interface CityPropsLike {
  [key: string]: any;
  nome_municipio?: string;
  municipio?: string;
  nome?: string;
  name_state?: string;
  VALOR_PD?: string;
  VALOR_CTM?: string;
  VALOR_PMSB?: string;
}

const ESTADO_UF: Record<string, string> = {
  'Acre': 'AC',
  'Alagoas': 'AL',
  'Amapá': 'AP',
  'Amazonas': 'AM',
  'Bahia': 'BA',
  'Ceará': 'CE',
  'Distrito Federal': 'DF',
  'Espírito Santo': 'ES',
  'Goías': 'GO', // fallback typo guard
  'Goiás': 'GO',
  'Maranhão': 'MA',
  'Mato Grosso': 'MT',
  'Mato Grosso do Sul': 'MS',
  'Minas Gerais': 'MG',
  'Pará': 'PA',
  'Paraíba': 'PB',
  'Paraná': 'PR',
  'Pernambuco': 'PE',
  'Piauí': 'PI',
  'Rio de Janeiro': 'RJ',
  'Rio Grande do Norte': 'RN',
  'Rio Grande do Sul': 'RS',
  'Rondônia': 'RO',
  'Roraima': 'RR',
  'Santa Catarina': 'SC',
  'São Paulo': 'SP',
  'Sergipe': 'SE',
  'Tocantins': 'TO'
};

export function estadoParaUF(nomeEstado?: string | null): string {
  const raw = (nomeEstado ?? '').toString().trim();
  if (!raw) return '';
  // If already a UF like 'SP'
  if (/^[A-Z]{2}$/.test(raw)) return raw;
  return ESTADO_UF[raw] || raw;
}

export function sanitizeFileName(name: string): string {
  const withoutAccents = name.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return withoutAccents.replace(/[^a-zA-Z0-9-_\.]+/g, '_').replace(/_+/g, '_');
}

export function resolveMunicipioNome(props: CityPropsLike): string {
  return (
    (props?.nome_municipio && String(props.nome_municipio)) ||
    (props?.municipio && String(props.municipio)) ||
    (props?.nome && String(props.nome)) ||
    ''
  );
}

export async function generateBudgetPDF(city: CityPropsLike): Promise<{ bytes: Uint8Array; fileName: string; displayName: string; uf: string }>
{
  const municipioNome = resolveMunicipioNome(city);
  const uf = estadoParaUF(city?.name_state as string);
  const displayName = municipioNome && uf ? `${municipioNome} - ${uf}` : municipioNome || 'Município';

  const templateUrl = '/template/innovatis_orcamento_munic_editavel.pdf';
  const existingPdfBytes = await fetch(templateUrl).then((res) => {
    if (!res.ok) throw new Error('Falha ao carregar template do orçamento');
    return res.arrayBuffer();
  });
  const pdfDoc = await PDFDocument.load(existingPdfBytes);
  const form = pdfDoc.getForm();

  try {
    form.getTextField('nome_munic').setText(displayName);
  } catch {}
  try {
    form.getTextField('VALOR_PD').setText(city?.VALOR_PD || 'N/A');
  } catch {}
  try {
    form.getTextField('VALOR_CTM').setText(city?.VALOR_CTM || 'N/A');
  } catch {}
  try {
    form.getTextField('VALOR_PMSB').setText(city?.VALOR_PMSB || 'N/A');
  } catch {}
  try {
    form.getTextField('VALOR_REURB').setText('R$1.500,00/unid.');
  } catch {}
  try {
    form.getTextField('VALOR_START').setText('R$ 395,00/aluno');
  } catch {}

  try { form.flatten(); } catch {}
  const pdfBytes = await pdfDoc.save();

  const safeMunicipio = sanitizeFileName(municipioNome || 'municipio');
  const safeUF = sanitizeFileName(uf || 'UF');
  const fileName = `${safeMunicipio}_${safeUF}_orcamento_innovatis.pdf`;

  return { bytes: pdfBytes, fileName, displayName, uf };
}

export async function mergePdfPages(pdfByteArrays: Uint8Array[]): Promise<Uint8Array> {
  const merged = await PDFDocument.create();
  for (const bytes of pdfByteArrays) {
    const src = await PDFDocument.load(bytes);
    const copied = await merged.copyPages(src, src.getPageIndices());
    copied.forEach((p) => merged.addPage(p));
  }
  return merged.save();
}
