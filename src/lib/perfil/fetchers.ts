// Fetchers para dados do perfil (somente leitura)

import type { PermissoesScope, ServiceStatus, DataVersion } from '@/types/perfil';

/**
 * Busca permissões e escopo do usuário
 */
export async function fetchPermissoes(): Promise<PermissoesScope> {
  const response = await fetch('/api/municipios/permitidos', {
    credentials: 'same-origin',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar permissões: ${response.status}`);
  }

  const json = await response.json();

  // Normalização defensiva: garantir arrays e campos obrigatórios
  const estados = Array.isArray(json?.estados) ? json.estados : [];
  const municipios = Array.isArray(json?.municipios) ? json.municipios : [];
  const fullAccess = Boolean(json?.fullAccess);

  // Totais derivados com base nos arrays normalizados
  const totalMunicipios = municipios.length;
  const totalUFs = new Set(municipios.map((m: any) => m.uf || m.name_state).filter(Boolean)).size;

  const normalized: PermissoesScope = {
    fullAccess,
    estados,
    municipios,
    totalMunicipios,
    totalUFs,
  };

  return normalized;
}

/**
 * Busca status dos serviços
 */
export async function fetchServicesStatus(): Promise<ServiceStatus[]> {
  const services: ServiceStatus[] = [];

  try {
    const mapsStatusPromise = fetch('/api/maps/status', { cache: 'no-store' })
      .then(async res => {
        const start = Date.now();
        const data = await res.json();
        return {
          service: 'Mapas & Dados Municipais',
          status: res.ok ? 'operational' : 'degraded',
          responseTime: Date.now() - start,
          lastCheck: new Date().toISOString(),
          message: data.message || undefined
        } as ServiceStatus;
      })
      .catch(() => ({
        service: 'Mapas & Dados Municipais',
        status: 'down' as const,
        lastCheck: new Date().toISOString(),
        message: 'Serviço indisponível'
      }));

    const rotasHealthPromise = fetch('/api/rotas/health', { cache: 'no-store' })
      .then(async res => {
        const start = Date.now();
        const data = await res.json();
        return {
          service: 'Sistema de Rotas',
          status: res.ok && data.status === 'ok' ? 'operational' : 'degraded',
          responseTime: Date.now() - start,
          lastCheck: new Date().toISOString(),
          message: data.message || undefined
        } as ServiceStatus;
      })
      .catch(() => ({
        service: 'Sistema de Rotas',
        status: 'down' as const,
        lastCheck: new Date().toISOString(),
        message: 'Serviço indisponível'
      }));

    const results = await Promise.allSettled([mapsStatusPromise, rotasHealthPromise]);
    
    results.forEach(result => {
      if (result.status === 'fulfilled') {
        services.push(result.value);
      }
    });

  } catch (error) {
    console.error('Erro ao buscar status dos serviços:', error);
  }

  return services;
}

/**
 * Busca versões e metadados dos datasets
 */
export async function fetchDataVersions(): Promise<DataVersion[]> {
  const datasets = [
    { name: 'Municípios (GeoJSON)', endpoint: '/api/maps/status' },
    { name: 'Produtos Municipais', endpoint: '/api/maps/status' },
    { name: 'Pistas de Voo', endpoint: '/api/maps/status' }
  ];

  const versions: DataVersion[] = [];

  for (const dataset of datasets) {
    try {
      const response = await fetch(dataset.endpoint, { cache: 'no-store' });
      
      if (response.ok) {
        const data = await response.json();
        versions.push({
          dataset: dataset.name,
          lastModified: data.lastModified || data.updatedAt || undefined,
          size: data.size || undefined,
          records: data.recordCount || data.features?.length || undefined,
          status: 'available'
        });
      } else {
        versions.push({
          dataset: dataset.name,
          status: 'unavailable'
        });
      }
    } catch (error) {
      versions.push({
        dataset: dataset.name,
        status: 'unavailable'
      });
    }
  }

  return versions;
}

/**
 * Busca municípios do escopo com paginação
 */
export async function fetchMunicipiosPaginados(page: number = 1, limit: number = 25, search?: string) {
  const response = await fetch('/api/municipios/permitidos', {
    credentials: 'same-origin',
    cache: 'no-store'
  });

  if (!response.ok) {
    throw new Error(`Erro ao buscar municípios: ${response.status}`);
  }

  const data = await response.json();
  let municipios = data.municipios || [];

  // Filtro de busca client-side
  if (search) {
    const searchLower = search.toLowerCase();
    municipios = municipios.filter((m: any) => 
      m.municipio?.toLowerCase().includes(searchLower) ||
      m.name_state?.toLowerCase().includes(searchLower) ||
      m.uf?.toLowerCase().includes(searchLower)
    );
  }

  const total = municipios.length;
  const totalPages = Math.ceil(total / limit);
  const start = (page - 1) * limit;
  const end = start + limit;
  const paginatedMunicipios = municipios.slice(start, end);

  return {
    municipios: paginatedMunicipios,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  };
}

/**
 * Busca acessos do usuário (inclui valid_until) para cálculo de prazo de uso.
 * Aceita opcionalmente o userId para filtrar no servidor (quando suportado) e sempre retorna o campo id.
 */
export async function fetchMunicipioAcessos(userId?: number | string): Promise<Array<{ id?: number | string; user_id?: number | string; municipio?: string; name_state?: string; uf?: string; valid_until?: string }>> {
  try {
    const qs = userId != null ? `?userId=${encodeURIComponent(String(userId))}` : '';
    const resp = await fetch(`/api/municipios/acessos${qs}`, { credentials: 'same-origin', cache: 'no-store' });
    if (!resp.ok) return [];
    const data = await resp.json();
    const list = Array.isArray(data?.acessos) ? data.acessos : (Array.isArray(data) ? data : []);
    return list.map((item: any) => ({
      id: item?.id ?? undefined,
      user_id: item?.user_id ?? undefined,
      municipio: item?.municipio ?? item?.nome_municipio ?? undefined,
      name_state: item?.name_state ?? item?.estado ?? undefined,
      uf: item?.uf ?? undefined,
      valid_until: item?.valid_until ?? item?.prazo ?? undefined,
    }));
  } catch {
    return [];
  }
}
