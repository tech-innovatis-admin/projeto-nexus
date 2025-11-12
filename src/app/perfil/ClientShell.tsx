"use client";

import { useEffect, useState } from 'react';
import { useUser } from '@/contexts/UserContext';
import PerfilHeader from './_components/PerfilHeader';
import PerfilPermissoes from './_components/PerfilPermissoes';
import PerfilErrorBoundary from './_components/PerfilErrorBoundary';
import { fetchPermissoes, fetchMunicipioAcessos } from '@/lib/perfil/fetchers';
import type { UserProfile, PermissoesScope } from '@/types/perfil';
import { Loader2 } from 'lucide-react';

interface ClientShellProps {
  initialUser?: UserProfile;
}

export default function ClientShell({ initialUser }: ClientShellProps) {
  const { user } = useUser();
  console.log('[ClientShell] Componente inicializado', { initialUser, hasUser: !!user });
  
  const [scope, setScope] = useState<PermissoesScope | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expiresAt, setExpiresAt] = useState<string | undefined>(undefined);
  const [isExpired, setIsExpired] = useState<boolean>(false);

  useEffect(() => {
    async function loadPermissoes() {
      console.log('[ClientShell] Iniciando carregamento de permissões', { userId: user?.id });
      try {
        setLoading(true);
        const data = await fetchPermissoes();
        console.log('[ClientShell] Permissões carregadas com sucesso', { 
          hasScope: !!data, 
          municipiosCount: Array.isArray(data?.municipios) ? data.municipios.length : 0 
        });
        setScope(data);
      } catch (err) {
        console.error('[ClientShell] Erro ao carregar permissões:', err);
        setError('Não foi possível carregar as permissões do usuário');
      } finally {
        setLoading(false);
      }
    }

    if (user) {
      loadPermissoes();
    } else {
      console.log('[ClientShell] Usuário não disponível, aguardando...');
    }
  }, [user]);

  // Buscar prazo de uso através de municipio_acessos.valid_until se não vier no scope
  useEffect(() => {
    const computeFromAcessos = async () => {
      try {
        console.log('[ClientShell] Iniciando busca de acessos para cálculo de expiração', { userId: user?.id });
        // Buscar acessos filtrados pelo usuário atual (correção: user_id == user.id)
        const acessos = await fetchMunicipioAcessos(user?.id);
        console.log('[ClientShell] Acessos recebidos da API', { totalAcessos: acessos.length });
        
        const filtered = Array.isArray(acessos) && user?.id != null
          ? acessos.filter(a => a.user_id == user.id) // Correção: user_id em vez de id
          : acessos;
        console.log('[ClientShell] Acessos filtrados pelo user_id', { 
          filteredCount: filtered.length, 
          userId: user?.id,
          sampleUserId: filtered[0]?.user_id 
        });
        
        const candidates = filtered
          .map(a => a.valid_until)
          .filter((v): v is string => typeof v === 'string' && v.length > 0);
        console.log('[ClientShell] Candidatos de valid_until encontrados', { candidatesCount: candidates.length, candidates });
        
        if (candidates.length === 0) {
          console.log('[ClientShell] Nenhum candidato de valid_until encontrado, saindo...');
          return;
        }
        
        const toDate = (s: string) => new Date(s.includes('T') ? s : s.replace(' ', 'T').replace(/\.(\d{3})(\d+)/, '.$1').replace(/\+00$/, 'Z').replace(/([\+\-]\d{2})$/, '$1:00'));
        let best = candidates[0];
        for (const s of candidates) {
          if (toDate(s).getTime() > toDate(best).getTime()) best = s;
        }
        console.log('[ClientShell] Melhor data de expiração selecionada', { bestDate: best });
        
        setExpiresAt(best);
        
        // Calcular se o acesso expirou
        const bestDate = toDate(best);
        const now = new Date();
        const expired = bestDate.getTime() < now.getTime();
        console.log('[ClientShell] Cálculo de expiração', { 
          bestDate: bestDate.toISOString(), 
          now: now.toISOString(), 
          isExpired: expired 
        });
        setIsExpired(expired);
      } catch (e) {
        console.error('[ClientShell] Erro ao calcular expiração:', e);
        // silencioso
      }
    };

    // Se já derivamos pelo scope, usar ele. Caso contrário, buscar na rota de acessos.
    if (!expiresAt && user) {
      console.log('[ClientShell] Iniciando cálculo de expiração (expiresAt não definido)');
      computeFromAcessos();
    } else {
      console.log('[ClientShell] Pulando cálculo de expiração', { hasExpiresAt: !!expiresAt, hasUser: !!user });
    }
  }, [expiresAt, user]);

  if (!user) {
    return (
      <main className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Loader2 size={48} className="animate-spin text-sky-400 mx-auto mb-4" />
          <p className="text-slate-400">Carregando perfil...</p>
        </div>
      </main>
    );
  }

  // Mapear user do contexto para UserProfile
  const userProfile: UserProfile = {
    id: user.id,
    name: user.name || 'Usuário',
    username: user.username || user.email?.split('@')[0] || 'user',
    email: user.email || '',
    role: user.role as 'ADMIN' | 'MANAGER' | 'VIEWER',
    avatar_url: (user as any).photo || undefined,
    cargo: user.cargo || undefined,
    created_at: (user as any).createdAt || (user as any).created_at || undefined,
    last_login: (user as any).lastLogin || (user as any).last_login || undefined,
    expires_at: (user as any).expiresAt || (user as any).prazo_uso || (user as any).valid_until || undefined,
    platforms: []
  };

  console.log('[ClientShell] UserProfile criado', {
    id: userProfile.id,
    name: userProfile.name,
    role: userProfile.role,
    hasExpiresAt: !!userProfile.expires_at,
    isExpired
  });

  // Garantir arrays seguros para cálculos
  const municipiosArr = Array.isArray(scope?.municipios) ? scope!.municipios : [];

  // Derivar prazo de uso a partir de municipio_acessos.valid_until (usar o mais distante)
  const computedExpiresAt: string | undefined = (() => {
    if (!municipiosArr.length) return undefined;
    const candidates = municipiosArr
      .map((m: any) => m?.valid_until)
      .filter((v: any) => typeof v === 'string' && v.length > 0);
    if (!candidates.length) return undefined;
    // Seleciona a maior data (prazo mais longo)
    let best = candidates[0];
    const toDate = (s: string) => new Date(s.includes('T') ? s : s.replace(' ', 'T').replace(/\.(\d{3})(\d+)/, '.$1').replace(/\+00$/, 'Z').replace(/([\+\-]\d{2})$/, '$1:00'));
    for (const s of candidates) {
      if (toDate(s).getTime() > toDate(best).getTime()) best = s;
    }
    return best;
  })();

  console.log('[ClientShell] Renderizando componente', { 
    hasUser: !!user, 
    loading, 
    hasError: !!error, 
    hasScope: !!scope, 
    isExpired 
  });

  return (
    <main className="flex-1 p-4 md:p-6 overflow-y-auto">
      <PerfilErrorBoundary>
        <div className="max-w-7xl mx-auto space-y-16 md:space-y-20">
          {/* Header do perfil */}
          <PerfilHeader user={{ ...userProfile, expires_at: computedExpiresAt || expiresAt || userProfile.expires_at }} isRestricted={user.isRestricted} isExpired={isExpired} />

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={48} className="animate-spin text-sky-400" />
            </div>
          ) : error ? (
            <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-6 text-center">
              <p className="text-red-200">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="mt-4 px-6 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg transition-colors"
              >
                Tentar Novamente
              </button>
            </div>
          ) : scope ? (
            <>
              {/* Grid de 2 colunas para desktop */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 mt-6 lg:mt-8">
                {/* Coluna esquerda */}
                <div className="space-y-8">
                  <PerfilPermissoes scope={{
                    ...scope,
                    municipios: municipiosArr,
                    estados: Array.isArray(scope.estados) ? scope.estados : [],
                    totalMunicipios: municipiosArr.length,
                    totalUFs: new Set(municipiosArr.map(m => m.uf || m.name_state).filter(Boolean)).size
                  }} />
                </div>
              </div>
            </>
          ) : null}
        </div>
      </PerfilErrorBoundary>
    </main>
  );
}