import { useState, useRef, useEffect } from 'react';
import download from 'downloadjs';
import { generateBudgetPDF } from '@/utils/pdfOrcamento';
import ModalOrcamento from '@/components/ModalOrcamento';

function ExportMenu({ city, className = '', onOpenAdvanced, mapData }) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAlert, setShowAlert] = useState(false);
  const dropdownRef = useRef(null);
  const [massOpen, setMassOpen] = useState(false);
  const [submenuOpen, setSubmenuOpen] = useState(false);
  
  // Fechar o dropdown quando clicar fora dele
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Efeito para esconder a mensagem de alerta após 3 segundos
  useEffect(() => {
    let timer;
    if (showAlert) {
      timer = setTimeout(() => {
        setShowAlert(false);
      }, 3000);
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [showAlert]);

  // PDF centralizado em utils/pdfOrcamento

  // Handler para exportar orçamento
  const handleOrcamento = async () => {
    if (!city) {
      setShowAlert(true);
      return;
    }
    
    try {
      const { fileName, bytes } = await generateBudgetPDF(city);
      download(bytes, fileName, 'application/pdf');
      setIsOpen(false);
    } catch (error) {
      alert(error.message);
    }
  };

  // Handler para compartilhar via WhatsApp
  const handleWhatsApp = async () => {
    if (!city) {
      setShowAlert(true);
      return;
    }
    
    try {
      const { fileName, bytes } = await generateBudgetPDF(city);
      const blob = new Blob([bytes], { type: 'application/pdf' });
      
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], fileName, { type: 'application/pdf' });
        
        try {
          await navigator.share({
            files: [file],
            title: 'Orçamento Innovatis',
            text: `Orçamento para ${city.nome}`
          });
        } catch (err) {
          const tempUrl = URL.createObjectURL(blob);
          const whatsappText = encodeURIComponent(`Olá! Segue o orçamento para o município de ${city.nome}. Estou enviando o PDF em anexo.`);
          window.open(`https://wa.me/?text=${whatsappText}`, '_blank');
          setTimeout(() => URL.revokeObjectURL(tempUrl), 100);
        }
      } else {
        const tempUrl = URL.createObjectURL(blob);
        const whatsappText = encodeURIComponent(`Olá! Segue o orçamento para o município de ${city.nome}. Estou enviando o PDF em anexo.`);
        window.open(`https://wa.me/?text=${whatsappText}`, '_blank');
        setTimeout(() => URL.revokeObjectURL(tempUrl), 100);
      }
      
  setIsOpen(false);
    } catch (error) {
      alert('Erro ao compartilhar PDF. Por favor, tente novamente.');
    }
  };

  const handleButtonClick = () => {
    setIsOpen(!isOpen);
  };

  const handleAdvanced = () => {
    setIsOpen(false);
    onOpenAdvanced();
  };

  const handleMass = () => {
    setIsOpen(false);
    setMassOpen(true);
  };

  const toggleSubmenu = () => {
    setSubmenuOpen(!submenuOpen);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleButtonClick}
        aria-haspopup="menu"
        aria-expanded={isOpen}
        className={`relative w-full md:w-auto flex items-center justify-center md:justify-start gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-1.5 px-4 pr-8 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-[#0f172a] ${className}`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        Exportar
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-3 w-3 absolute right-2 top-1/2 -translate-y-1/2 transition-transform duration-200 pointer-events-none ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Dropdown Menu */}
      {isOpen && (
        <div className="absolute right-0 mt-1 w-64 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50" role="menu" aria-orientation="vertical">
          <div className="py-1">
            {/* Cabeçalho de grupo: Orçamento */}
            <div className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wide text-center">Exportar</div>

            {/* Subgrupo: Município Selecionado */}
            <div className="px-2">
              <button
                onClick={toggleSubmenu}
                className={`flex items-center justify-between w-full text-left px-2 py-2 text-[13px] font-medium rounded transition-colors ${city ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
                disabled={!city}
                title={!city ? 'Selecione um município para habilitar' : ''}
              >
                <span>Município Selecionado</span>
                <svg 
                  className={`h-4 w-4 transition-transform duration-200 ${submenuOpen ? 'rotate-180' : ''}`} 
                  fill="none" 
                  viewBox="0 0 24 24" 
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>
              
              {/* Opções do submenu - só aparecem quando submenuOpen é true */}
              {submenuOpen && (
                <div className="ml-4 mt-1 space-y-1">
                  <button
                    onClick={handleOrcamento}
                    disabled={!city}
                    title={!city ? 'Selecione um município para habilitar' : ''}
                    className={`flex items-center w-full text-left px-4 py-2 text-sm rounded ${city ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
                    role="menuitem"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Download PDF
                  </button>
                  <button
                    onClick={handleWhatsApp}
                    disabled={!city}
                    title={!city ? 'Selecione um município para habilitar' : ''}
                    className={`flex items-center w-full text-left px-4 py-2 text-sm rounded ${city ? 'text-gray-700 hover:bg-gray-100' : 'text-gray-400 cursor-not-allowed'}`}
                    role="menuitem"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884" />
                    </svg>
                    Compartilhar via WhatsApp
                  </button>
                </div>
              )}
            </div>

            {/* Divisor */}
            <div className="border-t border-gray-200 my-1" />

            {/* Em Massa */}
            <button
              onClick={handleMass}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 1.343-3 3m3-3a3 3 0 013 3m-3 3c-1.657 0-3-1.343-3-3m3 3a3 3 0 003-3m6 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Export Orçamento
            </button>

            {/* Divisor */}
            <div className="border-t border-gray-200 my-1" />

            {/* Avançado (planilha existente) */}
            <button
              onClick={handleAdvanced}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Export Dados
            </button>
          </div>
        </div>
      )}
      {/* Modal em Massa */}
      <ModalOrcamento isOpen={massOpen} onClose={() => setMassOpen(false)} mapData={mapData} />
    </div>
  );
}

export default ExportMenu;