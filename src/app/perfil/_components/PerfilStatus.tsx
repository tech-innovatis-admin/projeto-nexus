// Componente: Status dos Serviços

'use client';

import useSWR from 'swr';
import { Activity, CheckCircle, AlertTriangle, XCircle, Loader2 } from 'lucide-react';
import { fetchServicesStatus } from '@/lib/perfil/fetchers';
import type { ServiceStatus } from '@/types/perfil';

export default function PerfilStatus() {
  const { data: services, error, isLoading } = useSWR<ServiceStatus[]>(
    'services-status',
    fetchServicesStatus,
    {
      refreshInterval: 60000, // Atualiza a cada 60s
      revalidateOnFocus: false
    }
  );

  const getStatusIcon = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return <CheckCircle size={20} className="text-emerald-400" />;
      case 'degraded':
        return <AlertTriangle size={20} className="text-amber-400" />;
      case 'down':
        return <XCircle size={20} className="text-red-400" />;
      default:
        return <Activity size={20} className="text-slate-400" />;
    }
  };

  const getStatusLabel = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'Operacional';
      case 'degraded':
        return 'Degradado';
      case 'down':
        return 'Indisponível';
      default:
        return 'Desconhecido';
    }
  };

  const getStatusColor = (status: ServiceStatus['status']) => {
    switch (status) {
      case 'operational':
        return 'border-emerald-500/50 bg-emerald-500/10';
      case 'degraded':
        return 'border-amber-500/50 bg-amber-500/10';
      case 'down':
        return 'border-red-500/50 bg-red-500/10';
      default:
        return 'border-slate-600 bg-slate-900/50';
    }
  };

  return (
    <div className="bg-slate-800 rounded-xl shadow-lg p-6 border border-slate-600">
      <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
        <Activity size={24} className="text-sky-400" />
        Status dos Serviços
      </h2>

      {isLoading && (
        <div className="flex items-center justify-center py-8">
          <Loader2 size={32} className="animate-spin text-sky-400" />
        </div>
      )}

      {error && (
        <div className="bg-red-900/30 border border-red-700/50 rounded-lg p-4 text-center">
          <XCircle size={32} className="mx-auto text-red-400 mb-2" />
          <p className="text-red-200 text-sm">Erro ao carregar status dos serviços</p>
          <button
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm transition-colors"
          >
            Tentar Novamente
          </button>
        </div>
      )}

      {!isLoading && !error && services && (
        <div className="space-y-3">
          {services.map((service, idx) => (
            <div
              key={idx}
              className={`rounded-lg p-4 border ${getStatusColor(service.status)} transition-colors`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3 flex-1">
                  {getStatusIcon(service.status)}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-white truncate">{service.service}</p>
                    <p className="text-sm text-slate-400 mt-1">
                      Status: <span className="font-medium">{getStatusLabel(service.status)}</span>
                    </p>
                    {service.message && (
                      <p className="text-xs text-slate-500 mt-1">{service.message}</p>
                    )}
                  </div>
                </div>
                {service.responseTime && (
                  <div className="text-right flex-shrink-0">
                    <p className="text-xs text-slate-500">Tempo de resposta</p>
                    <p className="text-sm font-mono text-slate-300">{service.responseTime}ms</p>
                  </div>
                )}
              </div>
            </div>
          ))}

          {services.length === 0 && (
            <div className="text-center py-8 text-slate-400">
              Nenhum serviço monitorado no momento
            </div>
          )}
        </div>
      )}
    </div>
  );
}
