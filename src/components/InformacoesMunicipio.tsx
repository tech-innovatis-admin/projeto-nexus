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
    'VALOR_START_INICIAIS_FINAIS',
    'PROCON_VAA', // Nova chave para o produto Procon Vai às Aulas
  ];

  // Função utilitária para normalizar strings (remove acentos, espaços extras e converte para minúsculas)
  const normalizar = (texto: string | undefined | null) => {
    if (!texto) return "";
    return texto
      .toString()
      .normalize("NFD") // separa acentos
      .replace(/[^\w\s]/g, "") // remove acentos e pontuação
      .trim()
      .toLowerCase();
  };

  // Mapeamento de nomes para exibição
  const nomesCustomizados: Record<string, string> = {
    VALOR_PD:
      municipioSelecionado.properties &&
      normalizar(municipioSelecionado.properties.pd_venci) === 'sim' &&
      municipioSelecionado.properties.PD_ANO &&
      String(municipioSelecionado.properties.PD_ANO) !== '0'
        ? `Plano Diretor - ${municipioSelecionado.properties.PD_ANO}`
        : "Plano Diretor",
    VALOR_PMSB:
      municipioSelecionado.properties &&
      normalizar(municipioSelecionado.properties.plano_saneamento_existe) === 'sim' &&
      municipioSelecionado.properties.plano_saneamento_ano &&
      !['-', 'recusa', '', null, undefined].includes(normalizar(municipioSelecionado.properties.plano_saneamento_ano))
        ? `PMSB - ${municipioSelecionado.properties.plano_saneamento_ano}`
        : "PMSB",
    VALOR_CTM: "IPTU Legal",
    VALOR_REURB: "REURB",
    VALOR_START_INICIAIS_FINAIS: "Start anos iniciais e finais",
    VALOR_START_INICIAIS: "Start anos iniciais",
    VALOR_START_FINAIS: "Start anos finais",
    // VAAT removido
    PROCON_VAA: 'Procon Vai às Aulas',
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
    // VAAT removido
    PROCON_VAA: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 11H9v-1h2v1zm0-2H9V7h2v4z" />
      </svg>
    ),
  };

  // Cores para cada categoria de produto
  const coresProdutos: Record<string, string> = {
    VALOR_PD: "text-sky-500",         // Azul mais vibrante para Plano Diretor
    VALOR_PMSB: "text-teal-400",      // Verde-azulado para PMSB
    VALOR_CTM: "text-emerald-500",    // Verde esmeralda para IPTU Legal (antes violeta)
    VALOR_REURB: "text-blue-500",     // Azul forte para REURB (antes amarelo)
    VALOR_START_INICIAIS_FINAIS: "text-blue-400", // Azul clássico para Start
    VALOR_START_INICIAIS: "text-rose-400",    // Rosa suave para Start Iniciais
    VALOR_START_FINAIS: "text-cyan-400",      // Ciano para Start Finais
    PROCON_VAA: "text-teal-500",      // Verde teal mais escuro para Procon (antes laranja)
  };

  // Removendo o objeto não utilizado
  // const categoriasProdutos = { ... };

  // Valores mínimos fixos para produtos (mantendo os valores originais)
  const valoresMinimosFixos: Record<string, string> = {
    VALOR_CTM: '318895.00',
    VALOR_PMSB: '119850.00',
    VALOR_PD: '233707.50',
    VALOR_START_INICIAIS_FINAIS: '78000.00',
    VALOR_REURB: '300000.00',
  };

  // Determina quais produtos exibir conforme condições independentes
  const chavesParaExibir = chavesValores.filter(k => {
    if (k === 'VALOR_PD') {
      const pdAlterada = municipioSelecionado.properties?.PD_ALTERADA;
      const pdVenci = municipioSelecionado.properties?.pd_venci;
      const pdAno = municipioSelecionado.properties?.PD_ANO;
      // Exibe se PD_ALTERADA for 'nao' OU (for 'sim' e pd_venci for 'sim') OU PD_ANO for '2016'
      return (
        normalizar(pdAlterada) === 'nao' ||
        (normalizar(pdAlterada) === 'sim' && normalizar(pdVenci) === 'sim') ||
        normalizar(pdAno) === '2016'
      );
    }
    if (k === 'VALOR_PMSB') {
      const planoSaneamentoExiste = municipioSelecionado.properties?.plano_saneamento_existe;
      const anoPMSB = municipioSelecionado.properties?.plano_saneamento_ano;
      const anoAtual = new Date().getFullYear();
      // Exibe se NÃO tem PMSB
      if (normalizar(planoSaneamentoExiste) === 'nao') return true;
      // Exibe se PMSB está vencido (ano válido e ano + 9 < ano atual)
      if (anoPMSB && !['-', 'recusa', '', null, undefined].includes(normalizar(anoPMSB))) {
        const anoNum = parseInt(anoPMSB, 10);
        if (!isNaN(anoNum) && anoNum + 9 < anoAtual) return true;
      }
      return false;
    }
    return true;
  });

  const valoresFiltrados = chavesParaExibir.map(k => {
    // Para o VAAT, tratamos diferente
    if (k === 'valor_vaat_formato') {
      const valorVaat = municipioSelecionado.properties?.valor_vaat_formato;
      return [k, null, valorVaat === "N/A" ? null : valorVaat];
    }
    // Para o Procon Vai às Aulas, valores fixos
    if (k === 'PROCON_VAA') {
      return [k, 'R$ 200,00/aluno', 'R$ 450,00/aluno'];
    }
    // Para os outros valores
    const valorMaximo = municipioSelecionado.properties?.[k];
    const valorMinimo = valoresMinimosFixos[k];

    return [
      k,
      valorMinimo,
      valorMaximo
    ];
  });

  // Formata valor monetário (mantendo a função original para garantir consistência)
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
      {/* Produtos em formato de tabela profissional */}
      <div className="bg-[#0f172a] rounded-lg border border-slate-700/50 shadow-md overflow-hidden">
        <table className="w-full">
          <thead className="bg-slate-800/30 border-b border-slate-700/50">
            <tr>
              <th className="text-left px-4 py-3 text-xs uppercase text-slate-400 font-medium tracking-wider">
                Produto
              </th>
              <th className="text-right px-4 py-3 text-xs uppercase text-slate-400 font-medium tracking-wider">
                Valor Mín.
              </th>
              <th className="text-right px-4 py-3 text-xs uppercase text-slate-400 font-medium tracking-wider">
                Valor Máx.
              </th>
            </tr>
          </thead>
          <tbody>
            {valoresFiltrados.map(([k, vMin, vMax], index) => (
              <tr key={k} className={`border-b border-slate-700/30 ${index % 2 === 0 ? 'bg-transparent' : 'bg-slate-800/20'}`} style={{height: '64px'}}>
                <td className="px-4 py-6">
                  <div className="flex items-center">
                    <span className={`mr-3 ${coresProdutos[k] || "text-gray-400"}`}>
                      {iconesProdutos[k] || (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    <span className="text-sm font-medium text-gray-300">
                      {nomesCustomizados[k] || k}
                    </span>
                  </div>
                </td>
                <td className="px-4 py-6 text-right">
                  <span className="text-sm text-gray-400">
                    {formatarValor(vMin?.toString())}
                  </span>
                </td>
                <td className={`px-4 py-6 text-right`}>
                  <span className={`text-base font-bold ${coresProdutos[k] || "text-white"}`}>
                    {formatarValor(vMax?.toString())}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {/* VAAT - Agora após a tabela */}
        {municipioSelecionado.properties?.valor_vaat_formato && (
          <div className="px-4 py-4 border-t border-slate-700/50 mt-1 bg-slate-800/20">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <span className="text-blue-400 mr-3">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                  </svg>
                </span>
                <span className="text-base font-medium text-gray-300">Valor disponível VAAT</span>
              </div>
              <span className="text-lg font-bold text-blue-400">
                {municipioSelecionado.properties?.valor_vaat_formato || "—"}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 