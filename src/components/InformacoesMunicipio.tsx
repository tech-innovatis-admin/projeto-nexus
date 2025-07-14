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

  // Ícones para cada produto
  const iconesProdutos: Record<string, React.ReactNode> = {
    VALOR_PD: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
      </svg>
    ),
    VALOR_PMSB: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 2a2 2 0 00-2 2v12a2 2 0 002 2h8a2 2 0 002-2V7.414A2 2 0 0015.414 6L12 2.586A2 2 0 0010.586 2H6zm5 6a1 1 0 10-2 0v2H7a1 1 0 100 2h2v2a1 1 0 102 0v-2h2a1 1 0 100-2h-2V8z" clipRule="evenodd" />
      </svg>
    ),
    VALOR_CTM: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
      </svg>
    ),
    VALOR_REURB: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    ),
    desert: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5.293 9.707a1 1 0 010-1.414l4-4a1 1 0 011.414 0l4 4a1 1 0 01-1.414 1.414L11 7.414V15a1 1 0 11-2 0V7.414L6.707 9.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm0-2a6 6 0 100-12 6 6 0 000 12z" clipRule="evenodd" />
      </svg>
    ),
    dec_ambiente: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4.382 13.795l1.774-1.42a2 2 0 012.53 0l1.774 1.42a2 2 0 002.53 0l1.775-1.42a2 2 0 012.529 0l1.774 1.42a2 2 0 002.53 0V6.87a2 2 0 00-.691-1.495L13.682 1.5a2 2 0 00-2.53 0L8.378 3.375a2 2 0 00-.692 1.495v8.925z" clipRule="evenodd" />
      </svg>
    ),
    VALOR_START_INICIAIS_FINAIS: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
      </svg>
    ),
    VALOR_START_INICIAIS: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
      </svg>
    ),
    VALOR_START_FINAIS: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
      </svg>
    ),
  };

  // Cores para cada categoria de produto
  const coresProdutos: Record<string, string> = {
    VALOR_PD: "text-blue-400",
    VALOR_PMSB: "text-emerald-400",
    VALOR_CTM: "text-purple-400",
    VALOR_REURB: "text-amber-400",
    desert: "text-orange-400",
    dec_ambiente: "text-teal-400",
    VALOR_START_INICIAIS_FINAIS: "text-indigo-400",
    VALOR_START_INICIAIS: "text-pink-400",
    VALOR_START_FINAIS: "text-cyan-400",
  };

  // Agrupa produtos por categoria
  const categoriasProdutos = {
    "Planos Urbanos": ["VALOR_PD", "VALOR_REURB"],
    "Saneamento e Meio Ambiente": ["VALOR_PMSB", "desert", "dec_ambiente"],
    "Tributação": ["VALOR_CTM"],
    "Educação": ["VALOR_START_INICIAIS_FINAIS", "VALOR_START_INICIAIS", "VALOR_START_FINAIS"]
  };

  // Filtra apenas as chaves que queremos exibir
  const valoresFiltrados = Object.entries(municipioSelecionado.properties || {})
    .filter(([k]) => chavesValores.includes(k));

  // Formata valor monetário
  const formatarValor = (valor: string | null | undefined) => {
    if (!valor) return "—";

    // Lida com strings específicas
    if (typeof valor === 'string') {
      const texto = valor.trim();

      // Exibe "Personalizado" (capitalizado) quando o valor contém "PERSONALIZADO"
      if (texto.toUpperCase().includes('PERSONALIZADO')) return 'Personalizado';

      // Se já estiver formatado com "R$", retorna como está
      if (texto.includes('R$')) return texto;
    }

    // Tenta converter para número
    const numero = parseFloat(String(valor));

    // Se não for número válido, retorna travessão
    if (isNaN(numero)) return '—';

    return `R$ ${numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="grid grid-cols-1 gap-3">
      {/* Valor total - removido conforme solicitado */}

      {/* Produtos por categoria */}
      {Object.entries(categoriasProdutos).map(([categoria, chaves]) => {
        // Filtra produtos desta categoria que existem no município
        const produtosCategoria = valoresFiltrados.filter(([k]) => chaves.includes(k));
        
        // Se não houver produtos nesta categoria, não mostra o card
        if (produtosCategoria.length === 0) return null;
        
        return (
          <div key={categoria} className="bg-[#0f172a] rounded-lg p-3 border border-slate-700/50 shadow-md">
            <div className="text-xs text-gray-400 uppercase tracking-wider mb-2 font-semibold border-b border-slate-700/50 pb-1">
              {categoria}
            </div>
            <div className="space-y-3">
              {produtosCategoria.map(([k, v]) => (
                <div key={k} className="flex items-center justify-between">
                  <div className="flex items-center">
                    <span className={`mr-2 ${coresProdutos[k] || "text-gray-400"}`}>
                      {iconesProdutos[k] || (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm text-gray-300">{nomesCustomizados[k] || k}</span>
                  </div>
                  <span className={`text-base font-bold ${coresProdutos[k] || "text-white"}`}>
                    {formatarValor(v?.toString())}
                  </span>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
} 