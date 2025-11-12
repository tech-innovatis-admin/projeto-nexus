// Tipos para a página de perfil (read-only)

export interface UserProfile {
  id: number;
  name: string;
  username: string;
  email: string;
  role: 'ADMIN' | 'MANAGER' | 'VIEWER';
  avatar_url?: string;
  cargo?: string;
  created_at: string;
  last_login?: string;
  platforms?: string[];
  expires_at?: string;
}

export interface MunicipioAcesso {
  id: number;
  municipio: string;
  name_state: string;
  uf: string;
  code_muni?: string;
  valid_until?: string; // Prazo de uso por acesso (formato Postgres)
}

export interface PermissoesScope {
  fullAccess: boolean;
  estados: Array<{ uf: string; uf_name: string }>;
  municipios: MunicipioAcesso[];
  totalMunicipios: number;
  totalUFs: number;
}

export interface ServiceStatus {
  service: string;
  status: 'operational' | 'degraded' | 'down' | 'unknown';
  lastCheck?: string;
  responseTime?: number;
  message?: string;
}

export interface DataVersion {
  dataset: string;
  lastModified?: string;
  size?: string;
  records?: number;
  status: 'available' | 'unavailable';
}

export interface PerfilKPIs {
  totalMunicipiosAcesso: number;
  totalEstadosAcesso: number;
  diasDesdeUltimoLogin: number;
  totalBuscasRealizadas?: number;
}

export interface ExportData {
  usuario: string;
  email: string;
  role: string;
  municipiosAcesso: MunicipioAcesso[];
  exportadoEm: string;
}
