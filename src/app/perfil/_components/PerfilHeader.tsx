// Componente: Cabeçalho do Perfil do Usuário (SSR)

import type { UserProfile } from '@/types/perfil';
import { User, Mail, Shield, Calendar } from 'lucide-react';
import { formatarData, calcularDiasRestantes } from '@/lib/perfil/utils';

interface PerfilHeaderProps {
  user: UserProfile;
  isRestricted?: boolean;
  isExpired?: boolean;
}

export default function PerfilHeader({ user, isRestricted, isExpired }: PerfilHeaderProps) {
  const roleLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    MANAGER: 'Gestor',
    VIEWER: 'Visualizador'
  };

  const roleColors: Record<string, string> = {
    ADMIN: 'bg-red-500/20 text-red-300 border-red-500/50',
    MANAGER: 'bg-blue-500/20 text-blue-300 border-blue-500/50',
    VIEWER: 'bg-green-500/20 text-green-300 border-green-500/50'
  };

  return (
    <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-600">
      <div className="flex flex-col md:flex-row gap-6 items-start md:items-center">
        {/* Avatar */}
        <div className="flex-shrink-0">
          {user.avatar_url ? (
            <img
              src={user.avatar_url}
              alt={`Avatar de ${user.name}`}
              className="w-24 h-24 rounded-full border-4 border-sky-500 object-cover"
            />
          ) : (
            <div className="w-24 h-24 rounded-full border-4 border-sky-500 bg-slate-700 flex items-center justify-center">
              <User size={48} className="text-slate-400" />
            </div>
          )}
        </div>

        {/* Informações do Usuário */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-bold text-white mb-2 truncate">{user.name}</h1>
          
          <div className="flex flex-wrap gap-3 mb-2">
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <User size={16} />
              <span>@{user.username}</span>
            </div>
            <div className="flex items-center gap-2 text-slate-300 text-sm">
              <Mail size={16} />
              <span className="truncate">{user.email}</span>
            </div>
          </div>

          {/* Cargo e datas chave */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Cargo</p>
              <p className="text-sm font-semibold text-white truncate">{user.cargo || '—'}</p>
            </div>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Validade da Conta</p>
              {user.expires_at ? (
                <p className="text-sm text-white">
                  {formatarData(user.expires_at)}
                  {(() => {
                    const dias = calcularDiasRestantes(user.expires_at);
                    return (
                      <span className="text-slate-300">{dias !== null ? ` • ${dias} dia${dias === 1 ? '' : 's'} restantes` : ''}</span>
                    );
                  })()}
                </p>
              ) : (
                <p className="text-sm text-slate-300">Indeterminado</p>
              )}
            </div>
            <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-3">
              <p className="text-xs text-slate-400 mb-1">Data do Cadastro</p>
              <p className="text-sm text-white">{user.created_at ? formatarData(user.created_at) : 'Indisponível'}</p>
            </div>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2">
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${roleColors[user.role] || roleColors.VIEWER}`}>
              <Shield size={14} className="inline mr-1" />
              {roleLabels[user.role] || user.role}
            </span>
            
            {/* Status de Acesso */}
            <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${
              isExpired 
                ? 'bg-red-500/20 text-red-300 border-red-500/50' 
                : 'bg-green-500/20 text-green-300 border-green-500/50'
            }`}>
              <Shield size={14} className="inline mr-1" />
              {isExpired ? 'Acesso Expirado' : 'Acesso Ativo'}
            </span>
            
            {isRestricted && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-amber-500/20 text-amber-300 border-amber-500/50">
                <Shield size={14} className="inline mr-1" />
                Acesso Restrito
              </span>
            )}

            {user.last_login && (
              <span className="px-3 py-1 rounded-full text-xs font-semibold border bg-slate-700/50 text-slate-300 border-slate-600">
                <Calendar size={14} className="inline mr-1" />
                Último acesso: {formatarData(user.last_login)}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
