import type { Feature } from "geojson";
import { useState, useRef, useEffect } from 'react';

interface InformacoesMunicipioProps {
  municipioSelecionado: Feature | null;
}

export default function InformacoesMunicipio({ municipioSelecionado }: InformacoesMunicipioProps) {
  // Estado para controlar a visibilidade do popover de status na versão mobile
  const [showStatusPopover, setShowStatusPopover] = useState(false);
  // Referência para o timer do popover
  const popoverTimerRef = useRef<number | null>(null);
  
  // Função para mostrar o popover e configurar o timer para escondê-lo após 5 segundos
  const handleShowStatusPopover = () => {
    setShowStatusPopover(true);
    
    // Limpa qualquer timer existente para evitar múltiplos timers
    if (popoverTimerRef.current) {
      window.clearTimeout(popoverTimerRef.current);
    }
    
    // Define novo timer para esconder o popover após 5 segundos
    popoverTimerRef.current = window.setTimeout(() => {
      setShowStatusPopover(false);
    }, 5000);
  };

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
    'VALOR_START_INICIAIS',
    'VALOR_START_FINAIS',
    'VALOR_DEC_AMBIENTAL',
    'VALOR_PLHIS',
    'VALOR_DESERT',
    'educagame_fmt',
    'PVA_fmt',
    'LIVRO_FUND_1_fmt',
    'LIVRO_FUND_2_fmt',
    'valor_vaat_mensal_fmt' // VAAT mensal (valor cheio / 12 - 5%)
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
    VALOR_START_INICIAIS: "Start Lab - Ensino Fund. 1",
    VALOR_START_FINAIS: "Start Lab - Ensino Fund. 2",
    VALOR_DEC_AMBIENTAL: "Plano Decenal do Meio Ambiente",
    VALOR_PLHIS: "PLHIS",
    VALOR_DESERT: "Plano de Desertificação",
    educagame_fmt: "Educa Game",
    PVA_fmt: "Procon Vai Às Aulas",
    LIVRO_FUND_1_fmt: "Livros - Ensino Fund. 1",
    LIVRO_FUND_2_fmt: "Livros - Ensino Fund. 2",
    valor_vaat_mensal_fmt: 'VAAT',
  };


  // Verifica se o município possui Plano Diretor conforme PD_ALTERADA === 'sim'
  const temPlanoDiretor = normalizar(municipioSelecionado.properties?.PD_ALTERADA) === 'sim';

  // Pega o ano atual para todas as verificações
  const anoAtual = new Date().getFullYear();

  // Verifica se o Plano Diretor está vencido (PD_ANO + 10 < ano atual)
  const pdAno = Number(municipioSelecionado.properties?.PD_ANO);
  const planoDiretorVencido = temPlanoDiretor && pdAno && (pdAno + 10 < anoAtual);

  // Status final do Plano Diretor
  const statusPD = temPlanoDiretor ? (planoDiretorVencido ? 'vencido' : 'em_dia') : 'nao_tem';

  // Verifica se o município possui PMSB (Sim ou Em elaboração)
  const statusPMSB = normalizar(municipioSelecionado.properties?.plano_saneamento_existe);
  const temPMSB = statusPMSB === 'sim' || statusPMSB === 'em elaboracao';
  
  // Verifica se o PMSB está vencido
  const pmsbAnoStr = String(municipioSelecionado.properties?.plano_saneamento_ano || '');
  const pmsbAno = !isNaN(Number(pmsbAnoStr)) && 
                  !['-', 'NA', 'Recusa', ''].includes(pmsbAnoStr.trim()) ? 
                  Number(pmsbAnoStr) : null;
  const pmsbVencido = statusPMSB === 'sim' && pmsbAno && (pmsbAno + 4 < anoAtual);

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
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8"/>
        <rect width="16" height="12" x="4" y="8" rx="2"/>
        <path d="M2 14h2"/>
        <path d="M20 14h2"/>
        <path d="M15 13v2"/>
        <path d="M9 13v2"/>
      </svg>
    ),
    VALOR_START_FINAIS: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8"/>
        <rect width="16" height="12" x="4" y="8" rx="2"/>
        <path d="M2 14h2"/>
        <path d="M20 14h2"/>
        <path d="M15 13v2"/>
        <path d="M9 13v2"/>
      </svg>
    ),
    VALOR_DEC_AMBIENTAL: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/>
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/>
      </svg>
    ),
    VALOR_PLHIS: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
      </svg>
    ),
    VALOR_DESERT: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M8 19a4 4 0 0 1-2.24-7.32A3.5 3.5 0 0 1 9 6.03V6a3 3 0 1 1 6 0v.04a3.5 3.5 0 0 1 3.24 5.65A4 4 0 0 1 16 19Z"/>
        <path d="M12 19v3"/>
      </svg>
    ),
    educagame_fmt: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 8V4H8"/>
        <rect width="16" height="12" x="4" y="8" rx="2"/>
        <path d="M2 14h2"/>
        <path d="M20 14h2"/>
        <path d="M15 13v2"/>
        <path d="M9 13v2"/>
      </svg>
    ),
    PVA_fmt: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M10.394 2.08a1 1 0 00-.788 0l-7 3a1 1 0 000 1.84L5.25 8.051a.999.999 0 01.356-.257l4-1.714a1 1 0 11.788 1.838L7.667 9.088l1.94.831a1 1 0 00.787 0l7-3a1 1 0 000-1.838l-7-3zM3.31 9.397L5 10.12v4.102a8.969 8.969 0 00-1.05-.174 1 1 0 01-.89-.89 11.115 11.115 0 01.25-3.762zM9.3 16.573A9.026 9.026 0 007 14.935v-3.957l1.818.78a3 3 0 002.364 0l5.508-2.361a11.026 11.026 0 01.25 3.762 1 1 0 01-.89.89 8.968 8.968 0 00-5.35 2.524 1 1 0 01-1.4 0zM6 18a1 1 0 001-1v-2.065a8.935 8.935 0 00-2-.712V17a1 1 0 001 1z" />
      </svg>
    ),
    LIVRO_FUND_1_fmt: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
      </svg>
    ),
    LIVRO_FUND_2_fmt: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
      </svg>
    ),
    valor_vaat_mensal_fmt: (
      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M4 4a2 2 0 00-2 2v4a2 2 0 002 2V6h10a2 2 0 00-2-2H4zm2 6a2 2 0 012-2h8a2 2 0 012 2v4a2 2 0 01-2 2H8a2 2 0 01-2-2v-4zm6 4a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
      </svg>
    ),
  };

  const linksProdutos: Record<string, string> = {
    VALOR_PD: "https://drive.google.com/drive/u/0/folders/1yhMYDt1MxGL1b-k2gNanG2qSM3_LMm3U",
    VALOR_PMSB: "https://drive.google.com/drive/u/0/folders/1YSQNlu4_5SrA7GE-c7aXXWkEu7GYknyT",
    VALOR_CTM: "https://drive.google.com/drive/u/0/folders/1Jf4mLWZZzcCTP5fRh0ckx6S9sqsZxWIb",
    VALOR_REURB: "https://drive.google.com/drive/u/0/folders/1Noi7iCP9hAieSMwtoSNwExj1UdAkazss",
    VALOR_START_INICIAIS: "https://drive.google.com/drive/u/0/folders/1UMbF1pPA2wDKfDZNC6_Pm5Jl8KswgWNi",
    VALOR_START_FINAIS: "https://drive.google.com/drive/u/0/folders/1UMbF1pPA2wDKfDZNC6_Pm5Jl8KswgWNi",
    educagame_fmt: "https://drive.google.com/drive/folders/1-NjXvYeJ49Lt1Ft8QWNzy1hQ9uj4gGR7?usp=drive_link",
    PVA_fmt: "https://drive.google.com/drive/u/0/folders/1W2WZH5Za-Si_VB_lVhsC5bU2akbc59Nj",
    VALOR_DEC_AMBIENTAL: "https://drive.google.com/drive/folders/1lxN3vMm_w0zflGhQM65e3Gd_kbmJcpBb?usp=drive_link",
    VALOR_PLHIS: "https://drive.google.com/drive/folders/12Zlcn93Yfc7peeQpmJ4GPSv7I72FLyJT?usp=drive_link",
    VALOR_DESERT: "https://drive.google.com/drive/folders/1VKgFSaWnCGMI0UDmmAf2brlryK4P02wZ?usp=drive_link",
    LIVRO_FUND_1_fmt: "https://drive.google.com/drive/folders/1Zx-Q7D0tIj4uZPUp8TLEmorkA2gFiTIz?usp=drive_link",
    LIVRO_FUND_2_fmt: "https://drive.google.com/drive/folders/1Zx-Q7D0tIj4uZPUp8TLEmorkA2gFiTIz?usp=drive_link",
    valor_vaat_mensal_fmt: "https://drive.google.com/drive/folders/1bmzujp0eHCIN9GkswEgv-i2OJVe2qkG1?hl=pt-br"
  };

  // Removendo o objeto não utilizado
  // const categoriasProdutos = { ... };

  // Determina quais produtos exibir conforme condições independentes
  const chavesParaExibir = chavesValores.filter(k => {
    if (k === 'VALOR_PD') {
      return true; // Sempre exibe Plano Diretor
    }
    if (k === 'VALOR_PMSB') {
      return true; // Agora sempre exibe PMSB, independentemente de condições
    }
    return true;
  });

  const valoresFiltrados = chavesParaExibir.map(k => {
    // Para o VAAT, tratamos diferente
    if (k === 'valor_vaat_mensal_fmt') {
      const valorVaat = municipioSelecionado.properties?.valor_vaat_mensal_fmt      ;
      return [k, valorVaat === "N/A" ? null : valorVaat];
    }
    // Para o REURB, exibir texto fixo
    if (k === 'VALOR_REURB') {
      return [k, 'R$ 300.000,00 (200 imóveis)'];
    }
    // Para os demais produtos, usamos o valor presente nas propriedades
    const valor = municipioSelecionado.properties?.[k];
    return [k, valor];
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

    // Se não for número válido, retorna o próprio texto (ex.: "Mín. 200unid.")
    if (isNaN(numero)) return valor.toString();

    return `R$ ${numero.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  return (
    <div className="flex flex-col w-full h-full min-h-0">
      {/* Container da tabela com scroll */}
      <div className="flex flex-col flex-1 min-h-0 relative bg-[#0f172a] rounded-lg border border-slate-700/50">
        {/* Legenda de status */}
        <div className="absolute top-2 right-2 z-10">
          <div className="group relative flex items-center">
            <button
              className="hover:bg-slate-700 rounded-full p-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-sky-500 bg-transparent"
              title="Legenda dos status"
              onClick={handleShowStatusPopover}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-400" viewBox="0 0 24 24" fill="none">
                <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" fill="none" />
                <rect x="11" y="6.5" width="2" height="7" rx="1" fill="currentColor" />
                <circle cx="12" cy="17" r="1.2" fill="currentColor" />
              </svg>
            </button>
            {/* Popover para mobile */}
            <div className={`md:hidden absolute right-0 mt-2 w-64 bg-slate-900/70 backdrop-blur-sm text-white text-xs rounded-lg shadow-lg p-3 z-20 transition-opacity duration-200 ${showStatusPopover ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}>
              <div className="mb-3 border-b border-slate-700 pb-1.5">
                <span className="text-sm font-medium text-slate-300">Status dos Produtos</span>
              </div>
              <div className="flex items-center mb-2">
                <svg className="h-4 w-4 mr-2" viewBox="0 0 200 200" fill="none">
                  <path d="M50 110 L90 150 L160 60" stroke="#23d13a" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-slate-300">Produto em dia</span>
              </div>
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 20h20L12 2z" fill="#FFD600"/>
                  <circle cx="12" cy="16" r="1.5" fill="#222"/>
                  <rect x="11" y="8" width="2" height="5" rx="1" fill="#222"/>
                </svg>
                <span className="text-slate-300">Produto vencido (mais de 10 anos)</span>
              </div>
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2" viewBox="0 0 200 200" fill="none">
                  <line x1="60" y1="60" x2="140" y2="140" stroke="#d12323" strokeWidth="24" strokeLinecap="round" />
                  <line x1="140" y1="60" x2="60" y2="140" stroke="#d12323" strokeWidth="24" strokeLinecap="round" />
                </svg>
                <span className="text-slate-300">Produto não existe</span>
              </div>
            </div>
            {/* Popover para desktop */}
            <div className="hidden md:group-hover:block absolute right-0 mt-2 w-64 bg-slate-900/70 backdrop-blur-sm text-white text-xs rounded-lg shadow-lg p-3 z-20">
              <div className="mb-3 border-b border-slate-700 pb-1.5">
                <span className="text-sm font-medium text-slate-300">Status dos Produtos</span>
              </div>
              <div className="flex items-center mb-2">
                <svg className="h-4 w-4 mr-2" viewBox="0 0 200 200" fill="none">
                  <path d="M50 110 L90 150 L160 60" stroke="#23d13a" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                <span className="text-slate-300">Produto em dia</span>
              </div>
              <div className="flex items-center mb-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none">
                  <path d="M12 2L2 20h20L12 2z" fill="#FFD600"/>
                  <circle cx="12" cy="16" r="1.5" fill="#222"/>
                  <rect x="11" y="8" width="2" height="5" rx="1" fill="#222"/>
                </svg>
                <span className="text-slate-300">Produto vencido (mais de 10 anos)</span>
              </div>
              <div className="flex items-center">
                <svg className="h-4 w-4 mr-2" viewBox="0 0 200 200" fill="none">
                  <line x1="60" y1="60" x2="140" y2="140" stroke="#d12323" strokeWidth="24" strokeLinecap="round" />
                  <line x1="140" y1="60" x2="60" y2="140" stroke="#d12323" strokeWidth="24" strokeLinecap="round" />
                </svg>
                <span className="text-slate-300">Produto não existe</span>
              </div>
            </div>
          </div>
        </div>

        {/* Container flex para tabela com scroll */}
        <div className="flex flex-col h-full">
          {/* Cabeçalho fixo da tabela */}
          <table className="w-full flex-shrink-0">
            <thead className="bg-slate-900 border-b border-slate-700/50 sticky top-0 z-10">
              <tr>
                <th className="text-center px-2 sm:px-3 py-3 text-xs uppercase text-white font-bold tracking-wider bg-slate-900/80">
                  Produto
                </th>
                <th className="text-center px-2 sm:px-3 py-3 text-xs uppercase text-white font-bold tracking-wider bg-slate-900/80">
                  Valor
                </th>
              </tr>
            </thead>
          </table>

          {/* Corpo rolável da tabela */}
          <div className="flex-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900">
            <table className="w-full">
              <tbody>
            {valoresFiltrados.map(([k, valor], index) => (
              <tr key={k} className={`border-b border-slate-700/30 ${index % 2 === 0 ? 'bg-transparent' : 'bg-slate-800/20'}`}>
                <td className="px-1 sm:px-3 py-4">
                  <div className={`flex items-start ${k === 'VALOR_PD' ? 'justify-center' : 'justify-start ml-[calc(50%-5rem)]'} ${k !== 'VALOR_PD' ? 'pl-4' : ''}`}>
                    <span className={`mr-2 sm:mr-3 mt-[2px] ${index % 2 === 0 ? 'text-sky-400' : 'text-white'}`}>
                      {iconesProdutos[k] || (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M4 4a2 2 0 002-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
                        </svg>
                      )}
                    </span>
                    <span className={`text-xs sm:text-sm font-medium text-gray-300 ${k === 'VALOR_PD' ? 'text-center' : 'text-left'}`}>
                      {linksProdutos[k] ? (
                        <a
                          href={linksProdutos[k]}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sky-400 hover:text-sky-300 transition-colors"
                          style={{ textDecoration: 'none' }}
                        >
                          {nomesCustomizados[k] || k}
                        </a>
                      ) : (
                        nomesCustomizados[k] || k
                      )}
                      {/* Mantém os ícones e textos extras */}
                      {k === 'VALOR_PD' && (
                        <>
                          {temPlanoDiretor ? (
                            planoDiretorVencido ? (
                              <span title="Plano Diretor vencido">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline ml-1" viewBox="0 0 24 24" fill="none">
                                  <path d="M12 2L2 20h20L12 2z" fill="#FFD600"/>
                                  <circle cx="12" cy="16" r="1.5" fill="#222"/>
                                  <rect x="11" y="8" width="2" height="5" rx="1" fill="#222"/>
                                </svg>
                              </span>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline ml-1" viewBox="0 0 200 200" fill="none">
                                <path d="M50 110 L90 150 L160 60" stroke="#23d13a" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                              </svg>
                            )
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline ml-1" viewBox="0 0 200 200" fill="none">
                              <line x1="60" y1="60" x2="140" y2="140" stroke="#d12323" strokeWidth="24" strokeLinecap="round" />
                              <line x1="140" y1="60" x2="60" y2="140" stroke="#d12323" strokeWidth="24" strokeLinecap="round" />
                            </svg>
                          )}
                          {/* Texto 'Em dia' abaixo do nome, apenas se tem plano diretor e não está vencido */}
                          {temPlanoDiretor && !planoDiretorVencido && (
                            <div className="text-xs text-slate-400 font-medium mt-1">Em dia</div>
                          )}
                          {planoDiretorVencido && (
                            <div className="text-xs text-slate-400 font-medium mt-1">Vencido</div>
                          )}
                        </>
                      )}
                      {k === 'VALOR_PMSB' && (
                        <>
                          {temPMSB ? (
                            pmsbVencido ? (
                              <span title="PMSB vencido">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline ml-1" viewBox="0 0 24 24" fill="none">
                                  <path d="M12 2L2 20h20L12 2z" fill="#FFD600"/>
                                  <circle cx="12" cy="16" r="1.5" fill="#222"/>
                                  <rect x="11" y="8" width="2" height="5" rx="1" fill="#222"/>
                                </svg>
                              </span>
                            ) : (
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline ml-1" viewBox="0 0 200 200" fill="none">
                                <path d="M50 110 L90 150 L160 60" stroke="#23d13a" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round" fill="none" />
                              </svg>
                            )
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 inline ml-1" viewBox="0 0 200 200" fill="none">
                              <line x1="60" y1="60" x2="140" y2="140" stroke="#d12323" strokeWidth="24" strokeLinecap="round" />
                              <line x1="140" y1="60" x2="60" y2="140" stroke="#d12323" strokeWidth="24" strokeLinecap="round" />
                            </svg>
                          )}
                          {/* Texto 'Em dia' abaixo do nome, apenas se tem PMSB e não está vencido */}
                          {temPMSB && !pmsbVencido && (
                            <div className="text-xs text-slate-400 font-medium mt-1">Em dia</div>
                          )}
                          {pmsbVencido && (
                            <div className="text-xs text-slate-400 font-medium mt-1">Vencido</div>
                          )}
                        </>
                      )}
                    </span>
                  </div>
                </td>
                <td className="px-2 sm:px-4 py-4">
                  <div className={`flex ${k === 'VALOR_PD' ? 'justify-center' : 'justify-start ml-[calc(50%-3.5rem)]'}`}>
                  {k === 'VALOR_REURB' ? (() => {
                    const valorStr = valor?.toString() || '';
                    const splitIndex = valorStr.indexOf('(');
                    const mainValor = splitIndex !== -1 ? valorStr.substring(0, splitIndex).trim() : valorStr;
                    const detalhe = splitIndex !== -1 ? valorStr.substring(splitIndex).trim() : '';
                    return (
                      <div className="flex flex-col">
                        <span className={`text-base font-bold ${index % 2 === 0 ? 'text-sky-400' : 'text-white'}`}>{mainValor}</span>
                        {detalhe && (
                          <span className="text-xs text-slate-400 font-medium mt-1">{detalhe}</span>
                        )}
                      </div>
                    );
                  })() : k === 'educagame_fmt' ? (() => {
                    const valorPrincipal = formatarValor(valor?.toString());
                    return (
                      <div className="flex flex-col">
                        <span className={`text-base font-bold ${index % 2 === 0 ? 'text-sky-400' : 'text-white'}`}>{valorPrincipal}</span>
                        <span className="text-xs text-slate-400 font-medium mt-1">Até 200 alunos</span>
                      </div>
                    );
                  })() : k === 'PVA_fmt' ? (() => {
                    const valorPrincipal = formatarValor(valor?.toString());
                    return (
                      <div className="flex flex-col">
                        <span className={`text-base font-bold ${index % 2 === 0 ? 'text-sky-400' : 'text-white'}`}>{valorPrincipal}</span>
                        <span className="text-xs text-slate-400 font-medium mt-1">R$ 450,00/aluno</span>
                      </div>
                    );
                  })() : k === 'VALOR_START_INICIAIS' ? (() => {
                    const valorPrincipal = formatarValor(valor?.toString());
                    return (
                      <div className="flex flex-col">
                        <span className={`text-base font-bold ${index % 2 === 0 ? 'text-sky-400' : 'text-white'}`}>{valorPrincipal}</span>
                        <span className="text-xs text-slate-400 font-medium mt-1">R$ 395,00/aluno</span>
                      </div>
                    );
                  })() : k === 'VALOR_START_FINAIS' ? (() => {
                    const valorPrincipal = formatarValor(valor?.toString());
                    return (
                      <div className="flex flex-col">
                        <span className={`text-base font-bold ${index % 2 === 0 ? 'text-sky-400' : 'text-white'}`}>{valorPrincipal}</span>
                        <span className="text-xs text-slate-400 font-medium mt-1">R$ 395,00/aluno</span>
                      </div>
                    );
                  })() : k === 'valor_vaat_mensal_fmt' ? (() => {
                    const valorMensal = formatarValor(valor?.toString());
                    // Pegar o valor cheio da propriedade valor_vaat_formato
                    const valorCheio = municipioSelecionado.properties?.valor_vaat_formato;
                    const valorCheioFormatado = formatarValor(String(valorCheio));
                    return (
                      <div className="flex flex-col">
                        <span className={`text-base font-bold ${index % 2 === 0 ? 'text-sky-400' : 'text-white'}`}>{valorMensal}</span>
                        <span className="text-xs text-slate-400 font-medium mt-1">Valor: {valorCheioFormatado}</span>
                      </div>
                    );
                  })() : (
                    <span className={`text-base font-bold ${index % 2 === 0 ? 'text-sky-400' : 'text-white'}`}>{formatarValor(valor?.toString())}</span>
                  )}
                  </div>
                </td>
              </tr>
            ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}