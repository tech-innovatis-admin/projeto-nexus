// Componente: Permissões e Escopo de Acesso

'use client';

import { useState, useMemo } from 'react';
import { Shield, Search, MapPin, ChevronLeft, ChevronRight } from 'lucide-react';
import type { PermissoesScope } from '@/types/perfil';

interface PerfilPermissoesProps {
  scope: PermissoesScope;
}

export default function PerfilPermissoes({ scope }: PerfilPermissoesProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 25;

  // Filtrar municípios
  const municipiosFiltrados = useMemo(() => {
    if (!searchTerm.trim()) return scope.municipios;
    const search = searchTerm.toLowerCase();
    return scope.municipios.filter(m =>
      m.municipio?.toLowerCase().includes(search) ||
      m.name_state?.toLowerCase().includes(search) ||
      m.uf?.toLowerCase().includes(search)
    );
  }, [scope.municipios, searchTerm]);

  // Paginação
  const totalPages = Math.ceil(municipiosFiltrados.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const municipiosPaginados = municipiosFiltrados.slice(startIndex, startIndex + itemsPerPage);

  // Reset página ao buscar
  const handleSearch = (value: string) => {
    setSearchTerm(value);
    setCurrentPage(1);
  };

  if (scope.fullAccess) {
    return (
      <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-600">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Shield size={24} className="text-emerald-400" />
          Acesso & Permissões
        </h2>
        <div className="bg-emerald-900/30 border border-emerald-700/50 rounded-lg p-6 text-center">
          <Shield size={48} className="mx-auto text-emerald-400 mb-3" />
          <p className="text-lg font-semibold text-emerald-200 mb-2">Acesso Total</p>
          <p className="text-sm text-emerald-300">
            Você possui acesso irrestrito a todos os municípios e funcionalidades da plataforma.
          </p>
        </div>
      </div>
    );
  }

  // Empty state
  if (scope.municipios.length === 0 && scope.estados.length === 0) {
    return (
      <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-600">
        <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
          <Shield size={24} className="text-amber-400" />
          Acesso & Permissões
        </h2>
        <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-6 text-center">
          <Shield size={48} className="mx-auto text-slate-500 mb-3" />
          <p className="text-lg font-semibold text-slate-300 mb-2">Nenhuma Permissão Definida</p>
          <p className="text-sm text-slate-400">
            Você não possui escopos ou restrições específicas cadastradas no momento.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-600">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Shield size={24} className="text-sky-400" />
        Acesso & Permissões
      </h2>

      {/* Contadores */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <p className="text-2xl font-bold text-white">{scope.municipios.length}</p>
          <p className="text-sm text-slate-400">Municípios Acessíveis</p>
        </div>
        <div className="bg-slate-900/50 rounded-lg p-4 border border-slate-700">
          <p className="text-2xl font-bold text-white">{new Set(scope.municipios.map(m => m.uf || m.name_state)).size}</p>
          <p className="text-sm text-slate-400">Estados com Acesso</p>
        </div>
      </div>

      {/* Busca */}
      <div className="relative mb-4">
        <Search size={20} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar município ou estado..."
          value={searchTerm}
          onChange={(e) => handleSearch(e.target.value)}
          className="w-full bg-slate-900/50 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500"
        />
      </div>

      {/* Lista de Municípios */}
      {municipiosFiltrados.length === 0 ? (
        <div className="text-center py-8 text-slate-400">
          Nenhum município encontrado para "{searchTerm}"
        </div>
      ) : (
        <>
          <div className="space-y-2 mb-4 max-h-96 overflow-y-auto">
            {municipiosPaginados.map((mun, idx) => (
              <div
                key={idx}
                className="bg-slate-900/50 rounded-lg p-3 border border-slate-700 hover:border-slate-600 transition-colors flex items-center gap-3"
              >
                <MapPin size={16} className="text-sky-400 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-white font-medium truncate">{mun.municipio}</p>
                  <p className="text-sm text-slate-400">{mun.name_state} ({mun.uf})</p>
                </div>
                {mun.code_muni && (
                  <span className="text-xs text-slate-500 font-mono">{mun.code_muni}</span>
                )}
              </div>
            ))}
          </div>

          {/* Paginação */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-4 border-t border-slate-700">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft size={16} />
                Anterior
              </button>
              <span className="text-slate-400 text-sm">
                Página {currentPage} de {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex items-center gap-2 px-4 py-2 bg-slate-700 text-white rounded-lg hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                Próxima
                <ChevronRight size={16} />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
