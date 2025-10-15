import React from 'react';
import type { MunicipioPolo, PistaVoo } from '@/types/routing';

interface SeletorPistasProps {
  municipio: MunicipioPolo;
  pistaSelecionada?: PistaVoo;
  onSelecionarPista: (pista: PistaVoo | undefined) => void;
  className?: string;
}

export default function SeletorPistas({ 
  municipio, 
  pistaSelecionada, 
  onSelecionarPista,
  className = '' 
}: SeletorPistasProps) {
  const pistas = municipio.pistas || [];

  if (pistas.length === 0) {
    return null; // Não exibir nada se não houver pistas
  }

  return (
    <div className={`mt-2 ${className}`}>
      <label className="block text-xs font-medium text-gray-700 mb-1">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="inline-block mr-1 text-blue-600"
        >
          <path d="M17.8 19.2 16 11l3.5-3.5C21 6 21.5 4 21 3c-1-.5-3 0-4.5 1.5L13 8 4.8 6.2c-.5-.1-.9.1-1.1.5l-.3.5c-.2.5-.1 1 .3 1.3L9 12l-2 3H4l-1 1 3 2 2 3 1-1v-3l3-2 3.5 5.3c.3.4.8.5 1.3.3l.5-.2c.4-.3.6-.7.5-1.2z" />
        </svg>
        Selecionar Pista de Voo
      </label>
      
      <select
        value={pistaSelecionada?.codigo_pista || ''}
        onChange={(e) => {
          const codigoPista = e.target.value;
          if (codigoPista === '') {
            // Usar coordenadas do município
            onSelecionarPista(undefined);
          } else {
            const pista = pistas.find(p => p.codigo_pista === codigoPista);
            onSelecionarPista(pista);
          }
        }}
        className="w-full px-2 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-800"
      >
        <option value="">
          {pistas.length > 0 && !pistas.some(p => p.latitude_pista && p.longitude_pista)
            ? '📍 Centro do município (sem coord. de pista)'
            : '📍 Centro do município'}
        </option>
        {pistas.map((pista) => {
          const temCoordenadas = pista.latitude_pista && pista.longitude_pista;
          return (
            <option key={pista.codigo_pista} value={pista.codigo_pista}>
              {temCoordenadas ? '✈️' : '⚠️'} {pista.codigo_pista} - {pista.nome_pista}
              {pista.tipo_pista === 'PUBLI' ? ' (Pública)' : ' (Privada)'}
              {!temCoordenadas ? ' - Sem coordenadas' : ''}
            </option>
          );
        })}
      </select>

      {pistaSelecionada && (
        <div className="mt-1 text-xs text-gray-600">
          {pistaSelecionada.latitude_pista && pistaSelecionada.longitude_pista ? (
            <span className="text-green-600">
              ✓ Cálculo usará coordenadas da pista: {pistaSelecionada.codigo_pista}
            </span>
          ) : (
            <span className="text-amber-600">
              ⚠️ Pista sem coordenadas. Usando Haversine a partir do centro do município.
            </span>
          )}
        </div>
      )}

      {!pistaSelecionada && pistas.length > 0 && (
        <div className="mt-1 text-xs text-gray-500">
          💡 Selecione uma pista para cálculo mais preciso
        </div>
      )}
    </div>
  );
}

