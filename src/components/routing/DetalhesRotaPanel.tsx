import React, { useState } from 'react';
import type { RotaCompleta, TrechoVoo, TrechoTerrestre } from '@/types/routing';
import { 
  Plane, 
  Car, 
  Clock, 
  MapPin, 
  ChevronDown, 
  ChevronUp,
  Navigation,
  Download,
  X
} from 'lucide-react';
import { formatarTempo, formatarDistancia } from '@/utils/routingUtils';
import { exportarRotaJSON } from '@/utils/routingOptimization';

interface DetalhesRotaPanelProps {
  rota: RotaCompleta;
  onClose?: () => void;
  onExportar?: () => void;
  className?: string;
}

export default function DetalhesRotaPanel({
  rota,
  onClose,
  onExportar,
  className = ''
}: DetalhesRotaPanelProps) {
  const [trechoExpandido, setTrechoExpandido] = useState<number | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'resumo' | 'trechos' | 'instrucoes'>('resumo');

  const toggleTrecho = (index: number) => {
    setTrechoExpandido(prev => prev === index ? null : index);
  };

  const downloadJSON = () => {
    const json = exportarRotaJSON(rota);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `rota_${rota.id}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg border border-slate-200 flex flex-col ${className}`}>
      {/* Header */}
      <div className="p-4 border-b border-slate-200 flex justify-between items-start">
        <div>
          <h3 className="font-semibold text-slate-900 text-lg">{rota.nome}</h3>
          <p className="text-xs text-slate-500 mt-1">
            Criada em {rota.criadaEm.toLocaleString('pt-BR')}
          </p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setAbaAtiva('resumo')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            abaAtiva === 'resumo'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Resumo
        </button>
        <button
          onClick={() => setAbaAtiva('trechos')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            abaAtiva === 'trechos'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Trechos ({rota.trechos.length})
        </button>
        <button
          onClick={() => setAbaAtiva('instrucoes')}
          className={`flex-1 py-3 px-4 text-sm font-medium transition-colors ${
            abaAtiva === 'instrucoes'
              ? 'text-blue-600 border-b-2 border-blue-600 bg-blue-50'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
          }`}
        >
          Instruções
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {/* Aba Resumo */}
        {abaAtiva === 'resumo' && (
          <div className="space-y-4">
            {/* Estatísticas Gerais */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                <div className="flex items-center gap-2 mb-1">
                  <MapPin className="w-4 h-4 text-blue-600" />
                  <span className="text-xs text-blue-700 font-medium">Distância Total</span>
                </div>
                <p className="text-lg font-bold text-blue-900">
                  {formatarDistancia(rota.estatisticas.distanciaTotalKm)}
                </p>
              </div>

              <div className="p-3 bg-gradient-to-br from-green-50 to-green-100 rounded-lg border border-green-200">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="w-4 h-4 text-green-600" />
                  <span className="text-xs text-green-700 font-medium">Tempo Total</span>
                </div>
                <p className="text-lg font-bold text-green-900">
                  {formatarTempo(rota.estatisticas.tempoTotalMinutos)}
                </p>
              </div>
            </div>

            {/* Breakdown por Modal */}
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                <Plane className="w-4 h-4" />
                Voo (Aéreo)
              </h4>
              <div className="pl-6 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Distância:</span>
                  <span className="font-medium text-slate-900">
                    {formatarDistancia(rota.estatisticas.distanciaVooKm)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tempo:</span>
                  <span className="font-medium text-slate-900">
                    {formatarTempo(rota.estatisticas.tempoVooMinutos)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Trechos:</span>
                  <span className="font-medium text-slate-900">
                    {rota.estatisticas.quantidadeTrechosVoo}
                  </span>
                </div>
              </div>

              <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2 mt-3">
                <Car className="w-4 h-4" />
                Terrestre (Carro)
              </h4>
              <div className="pl-6 space-y-1 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-600">Distância:</span>
                  <span className="font-medium text-slate-900">
                    {formatarDistancia(rota.estatisticas.distanciaTerrestreKm)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Tempo:</span>
                  <span className="font-medium text-slate-900">
                    {formatarTempo(rota.estatisticas.tempoTerrestreMinutos)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-600">Trechos:</span>
                  <span className="font-medium text-slate-900">
                    {rota.estatisticas.quantidadeTrechosTerrestres}
                  </span>
                </div>
              </div>
            </div>

            {/* Municípios */}
            <div className="pt-3 border-t border-slate-200">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Polos visitados:</span>
                <span className="font-medium text-slate-900">{rota.estatisticas.numeroPolos}</span>
              </div>
              <div className="flex justify-between text-sm mt-1">
                <span className="text-slate-600">Periferias visitadas:</span>
                <span className="font-medium text-slate-900">{rota.estatisticas.numeroPeriferias}</span>
              </div>
            </div>
          </div>
        )}

        {/* Aba Trechos */}
        {abaAtiva === 'trechos' && (
          <div className="space-y-2">
            {rota.trechos.map((trecho, index) => (
              <div
                key={index}
                className="border border-slate-200 rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleTrecho(index)}
                  className="w-full p-3 flex items-center justify-between hover:bg-slate-50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {trecho.tipo === 'voo' ? (
                      <Plane className="w-4 h-4 text-blue-600" />
                    ) : (
                      <Car className="w-4 h-4 text-green-600" />
                    )}
                    <div className="text-left">
                      <p className="text-sm font-medium text-slate-900">
                        {trecho.origem.nome} → {trecho.destino.nome}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatarDistancia(trecho.distanciaKm)} • {formatarTempo(trecho.tempoMinutos)}
                      </p>
                    </div>
                  </div>
                  {trechoExpandido === index ? (
                    <ChevronUp className="w-4 h-4 text-slate-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-slate-400" />
                  )}
                </button>

                {trechoExpandido === index && (
                  <div className="p-3 bg-slate-50 border-t border-slate-200">
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tipo:</span>
                        <span className="font-medium text-slate-900 capitalize">{trecho.tipo}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Origem:</span>
                        <span className="font-medium text-slate-900">{trecho.origem.nome}, {trecho.origem.uf}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Destino:</span>
                        <span className="font-medium text-slate-900">{trecho.destino.nome}, {trecho.destino.uf}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Distância:</span>
                        <span className="font-medium text-slate-900">{formatarDistancia(trecho.distanciaKm)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-600">Tempo</span>
                        <span className="font-medium text-slate-900">{formatarTempo(trecho.tempoMinutos)}</span>
                      </div>
                      
                      {trecho.tipo === 'terrestre' && trecho.instrucoes && (
                        <div className="mt-3 pt-3 border-t border-slate-200">
                          <p className="text-xs font-semibold text-slate-700 mb-2">
                            {trecho.instrucoes.length} instruções de navegação
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Aba Instruções */}
        {abaAtiva === 'instrucoes' && (
          <div className="space-y-4">
            {rota.trechos.map((trecho, trechoIndex) => (
              trecho.tipo === 'terrestre' && trecho.instrucoes && trecho.instrucoes.length > 0 && (
                <div key={trechoIndex} className="border border-slate-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-3">
                    <Car className="w-4 h-4 text-green-600" />
                    <h4 className="text-sm font-semibold text-slate-900">
                      {trecho.origem.nome} → {trecho.destino.nome}
                    </h4>
                  </div>
                  
                  <div className="space-y-2">
                    {trecho.instrucoes.map((instrucao, instrucaoIndex) => (
                      <div
                        key={instrucaoIndex}
                        className="flex gap-3 text-sm p-2 hover:bg-slate-50 rounded"
                      >
                        <div className="flex-shrink-0 w-6 h-6 rounded-full bg-green-100 text-green-700 flex items-center justify-center text-xs font-semibold">
                          {instrucaoIndex + 1}
                        </div>
                        <div className="flex-1">
                          <p className="text-slate-900">{instrucao.descricao}</p>
                          <p className="text-xs text-slate-500 mt-1">
                            {formatarDistancia(instrucao.distanciaKm)} • {formatarTempo(instrucao.tempoMinutos)}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )
            ))}
          </div>
        )}
      </div>

      {/* Footer com ações */}
      <div className="p-4 border-t border-slate-200 bg-slate-50 flex gap-2">
        <button
          onClick={downloadJSON}
          className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-md transition-colors flex items-center justify-center gap-2"
        >
          <Download className="w-4 h-4" />
          Baixar JSON
        </button>
        
        {onExportar && (
          <button
            onClick={onExportar}
            className="flex-1 px-4 py-2 border border-slate-300 hover:bg-white text-slate-700 text-sm font-medium rounded-md transition-colors"
          >
            Exportar Relatório
          </button>
        )}
      </div>
    </div>
  );
}

