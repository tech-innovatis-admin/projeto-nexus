import type { Feature } from "geojson";

interface InformacoesMunicipioProps {
  municipioSelecionado: Feature | null;
}

export default function InformacoesMunicipio({ municipioSelecionado }: InformacoesMunicipioProps) {
  if (!municipioSelecionado) {
    return (
      <div className="text-center text-slate-300 py-2">
        <p>Busque e selecione um município para ver as informações.</p>
      </div>
    );
  }

  // Lista de chaves específicas que queremos exibir
  const chavesValores = [
    'VALOR_PD',
    'VALOR_PMSB',
    'VALOR_CTM',
    'VALOR_REURB',
    'desert',
    'dec_ambiente',
    'VALOR_START_INICIAIS_FINAIS',
    'VALOR_START_INICIAIS',
    'VALOR_START_FINAIS'
  ];

  // Mapeamento de nomes para exibição
  const nomesCustomizados: Record<string, string> = {
    VALOR_PD: "Plano Diretor",
    VALOR_PMSB: "PMSB",
    VALOR_CTM: "IPTU Legal",
    VALOR_REURB: "REURB",
    desert: "Plano de Desertificação",
    dec_ambiente: "Plano Decenal do Meio Ambiente",
    VALOR_START_INICIAIS_FINAIS: "Start anos iniciais e finais",
    VALOR_START_INICIAIS: "Start anos iniciais",
    VALOR_START_FINAIS: "Start anos finais"
  };

  // Filtra apenas as chaves que queremos exibir
  const valoresFiltrados = Object.entries(municipioSelecionado.properties || {})
    .filter(([k]) => chavesValores.includes(k));

  return (
    <div className="grid grid-cols-1 gap-2">
      <div className="bg-[#0f172a] rounded p-2 flex flex-col border border-transparent transition-all duration-300 hover:border-gray-800 hover:shadow-md hover:bg-[#111a2d]">
        {/* <span className="text-xs text-sky-300 font-semibold mb-2">Valores de Produtos</span> */}
        {valoresFiltrados.map(([k, v]) => (
          <div key={k} className="flex items-center mb-1 last:mb-0">
            <span className="text-xs text-gray-300 mr-1 hover:text-gray-400 cursor-pointer transition-colors duration-150">{nomesCustomizados[k] || k}:</span>
            <span className="text-white text-base font-bold">{v || "N/A"}</span>
          </div>
        ))}
      </div>
    </div>
  );
} 