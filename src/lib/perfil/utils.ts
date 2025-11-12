// Utilitários para a página de perfil

import type { MunicipioAcesso, ExportData, PermissoesScope } from '@/types/perfil';

/**
 * Calcula dias desde o último login
 */
export function calcularDiasDesdeUltimoLogin(lastLogin?: string): number {
  if (!lastLogin) return -1;
  const diff = Date.now() - new Date(lastLogin).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calcula dias restantes até a data de expiração (prazo de uso)
 */
export function calcularDiasRestantes(expireAt?: string): number | null {
  if (!expireAt) return null;
  const diff = new Date(expireAt).getTime() - Date.now();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

/**
 * Formata data para exibição
 */
export function formatarData(dateString?: string): string {
  if (!dateString) return 'N/A';

  // Normaliza formatos vindos do banco, ex: "2025-07-30 13:30:27.036875+00"
  const normalizeDbTimestamp = (s: string): string => {
    // Se já for ISO (contém 'T'), retorna
    if (s.includes('T')) return s;
    // Se contiver espaço entre data e hora, substitui por 'T'
    let norm = s.replace(' ', 'T');
    // Tratar fração de segundos com mais de 3 dígitos (JS só suporta milissegundos)
    norm = norm.replace(/\.(\d{3})(\d+)/, '.$1');
    // Ajustar timezone '+00' -> '+00:00' ou 'Z'
    norm = norm.replace(/\+00$/, 'Z');
    // Ex: '+03' -> '+03:00'
    norm = norm.replace(/([\+\-]\d{2})$/, '$1:00');
    return norm;
  };

  const safe = normalizeDbTimestamp(String(dateString));
  const date = new Date(safe);
  if (isNaN(date.getTime())) return 'N/A';

  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }).format(date);
}

/**
 * Formata tamanho de arquivo
 */
export function formatarTamanho(bytes?: number): string {
  if (!bytes) return 'N/A';
  const sizes = ['B', 'KB', 'MB', 'GB'];
  if (bytes === 0) return '0 B';
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
}

/**
 * Exporta dados para CSV
 */
export function exportarCSV(data: ExportData): void {
  const headers = ['Município', 'UF', 'Estado', 'Código'];
  const rows = data.municipiosAcesso.map(m => [
    m.municipio,
    m.uf,
    m.name_state,
    m.code_muni || 'N/A'
  ]);

  const csvContent = [
    `# Exportação de Perfil - ${data.usuario}`,
    `# Email: ${data.email}`,
    `# Role: ${data.role}`,
    `# Exportado em: ${data.exportadoEm}`,
    '',
    headers.join(','),
    ...rows.map(row => row.join(','))
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `perfil_nexus_${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Exporta dados para JSON
 */
export function exportarJSON(data: ExportData): void {
  const jsonContent = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `perfil_nexus_${Date.now()}.json`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Trunca texto longo
 */
export function truncarTexto(texto: string, maxLength: number = 50): string {
  if (texto.length <= maxLength) return texto;
  return texto.substring(0, maxLength) + '...';
}

/**
 * Agrupa municípios por UF
 */
export function agruparMunicipiosPorUF(municipios: MunicipioAcesso[]): Record<string, MunicipioAcesso[]> {
  return municipios.reduce((acc, mun) => {
    const uf = mun.uf || mun.name_state;
    if (!acc[uf]) acc[uf] = [];
    acc[uf].push(mun);
    return acc;
  }, {} as Record<string, MunicipioAcesso[]>);
}

/**
 * Calcula estatísticas de acesso
 */
export function calcularEstatisticasAcesso(scope: PermissoesScope): {
  totalMunicipios: number;
  totalUFs: number;
  ufsMaisAcesso: Array<{ uf: string; count: number }>;
} {
  const totalMunicipios = scope.municipios.length;
  const ufsSet = new Set(scope.municipios.map(m => m.uf || m.name_state));
  const totalUFs = ufsSet.size;

  const agrupado = agruparMunicipiosPorUF(scope.municipios);
  const ufsMaisAcesso = Object.entries(agrupado)
    .map(([uf, muns]) => ({ uf, count: muns.length }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  return { totalMunicipios, totalUFs, ufsMaisAcesso };
}
