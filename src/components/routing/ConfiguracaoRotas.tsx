import React from 'react';
import { Plane } from 'lucide-react';
import type { ConfiguracaoRota } from '@/types/routing';

interface ConfiguracaoRotasProps {
  configuracao: ConfiguracaoRota;
  onConfiguracao: (novaConfiguracao: Partial<ConfiguracaoRota>) => void;
  className?: string;
}

export default function ConfiguracaoRotas({ 
  configuracao, 
  onConfiguracao, 
  className = '' 
}: ConfiguracaoRotasProps) {
  return (
    <div className={`space-y-4 ${className}`}>
      <h3 className="text-lg font-semibold text-gray-800 mb-3">
        Configurações de Rota
      </h3>

      {/* Velocidade Média de Voo - Destacada */}
      <div className="p-6 bg-blue-50 border-2 border-blue-200 rounded-lg space-y-4">
        <div className="flex items-center space-x-3">
          {/* Ícone gauge da Lucide (convertido para JSX) */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            className="w-5 h-5 text-blue-600 lucide lucide-gauge"
          >
            <path d="m12 14 4-4" />
            <path d="M3.34 19a10 10 0 1 1 17.32 0" />
          </svg>
          <label className="block text-lg font-semibold text-blue-900">
            Velocidade Média de Voo em Km/h:
          </label>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2 flex flex-col items-center">
            <input
              type="number"
              min="100"
              max="300"
              step="10"
              value={configuracao.velocidadeMediaVooKmh}
              onChange={(e) => onConfiguracao({
                velocidadeMediaVooKmh: parseInt(e.target.value) || 220
              })}
              className="w-36 px-4 py-4 text-lg font-medium text-black border-2 border-blue-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-center"
            />
          </div>
        </div>
        
        <div className="space-y-3">
          <p className="text-sm text-blue-700 font-medium text-center">
            💡 Esta velocidade será usada para calcular o tempo de viagem
          </p>
          
          <div className="flex justify-center space-x-2">
            <button
              onClick={() => onConfiguracao({ velocidadeMediaVooKmh: 150 })}
              className={`px-4 py-2 text-sm rounded-full transition-colors ${
                configuracao.velocidadeMediaVooKmh === 150 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              150 km/h
            </button>
            <button
              onClick={() => onConfiguracao({ velocidadeMediaVooKmh: 180 })}
              className={`px-4 py-2 text-sm rounded-full transition-colors ${
                configuracao.velocidadeMediaVooKmh === 180 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              180 km/h
            </button>
            <button
              onClick={() => onConfiguracao({ velocidadeMediaVooKmh: 270 })}
              className={`px-4 py-2 text-sm rounded-full transition-colors ${
                configuracao.velocidadeMediaVooKmh === 270 
                ? 'bg-blue-600 text-white' 
                : 'bg-blue-100 text-blue-700 hover:bg-blue-200'
              }`}
            >
              270 km/h
            </button>
          </div>
        </div>
      </div>

      {/* Otimizar Ordem dos Polos */}
      <div className="flex items-start space-x-5">
        <input
          type="checkbox"
          id="otimizar-polos"
          checked={configuracao.otimizarOrdemPolos}
          onChange={(e) => onConfiguracao({ 
            otimizarOrdemPolos: e.target.checked 
          })}
          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <div>
          <label htmlFor="otimizar-polos" className="text-sm font-medium text-gray-700">
            Otimizar ordem dos polos
          </label>
          <p className="text-xs text-gray-500">
            Calcular melhor sequência para visitar os polos (TSP)
          </p>
        </div>
      </div>

      {/* Otimizar Rotas das Periferias */}
      <div className="flex items-start space-x-5">
        <input
          type="checkbox"
          id="otimizar-periferias"
          checked={configuracao.otimizarRotasPeriferias}
          onChange={(e) => onConfiguracao({ 
            otimizarRotasPeriferias: e.target.checked 
          })}
          className="mt-1 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
        />
        <div>
          <label htmlFor="otimizar-periferias" className="text-sm font-medium text-gray-700">
            Otimizar rotas das periferias
          </label>
          <p className="text-xs text-gray-500">
            Calcular melhor sequência para visitar periferias de cada polo
          </p>
        </div>
      </div>

      {/* Limitação de Distância Terrestre */}
      <div className="space-y-2">
        <div className="flex items-center space-x-5">
          <input
            type="checkbox"
            id="limitar-distancia"
            checked={configuracao.limitarDistanciaMaximaTerrestreKm !== undefined}
            onChange={(e) => onConfiguracao({ 
              limitarDistanciaMaximaTerrestreKm: e.target.checked ? 300 : undefined 
            })}
            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
          />
          <label htmlFor="limitar-distancia" className="text-sm font-medium text-gray-700">
            Limitar distância terrestre máxima
          </label>
        </div>
        
        {configuracao.limitarDistanciaMaximaTerrestreKm !== undefined && (
          <div className="ml-7">
            <input
              type="number"
              min="50"
              max="1000"
              step="50"
              value={configuracao.limitarDistanciaMaximaTerrestreKm}
              onChange={(e) => onConfiguracao({ 
                limitarDistanciaMaximaTerrestreKm: parseInt(e.target.value) || 300 
              })}
              className="w-32 px-3 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm text-gray-600">km</span>
            <p className="text-xs text-gray-500 mt-1">
              Acima dessa distância, preferir voo automaticamente
            </p>
          </div>
        )}
      </div>

      {/* Resumo da Configuração */}
      <div className="mt-6 p-3 bg-gray-50 rounded-lg">
        <h4 className="text-sm font-medium text-gray-700 mb-2">Parâmetros:</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Velocidade de voo: {configuracao.velocidadeMediaVooKmh} km/h</li>
          <li>• Transporte Polo→Polo: <Plane className="inline w-3 h-3" /> Sempre voo</li>
          <li>• Otimizar polos: {configuracao.otimizarOrdemPolos ? 'Sim' : 'Não'}</li>
          <li>• Otimizar periferias: {configuracao.otimizarRotasPeriferias ? 'Sim' : 'Não'}</li>
          {configuracao.limitarDistanciaMaximaTerrestreKm && (
            <li>• Limite terrestre: {configuracao.limitarDistanciaMaximaTerrestreKm} km</li>
          )}
        </ul>
      </div>
    </div>
  );
}