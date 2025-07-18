import { PDFDocument } from 'pdf-lib';
import download from 'downloadjs';
import Image from 'next/image';
import { useState, useRef, useEffect } from 'react';

function ExportPDFButton({ city, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [pdfUrl, setPdfUrl] = useState('');
  const [showAlert, setShowAlert] = useState(false);
  const dropdownRef = useRef(null);
  
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

  // Limpar URL do PDF quando o componente for desmontado
  useEffect(() => {
    return () => {
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
    };
  }, [pdfUrl]);

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

  // Função para converter nome do estado para sigla
  const getEstadoSigla = (nomeEstado) => {
    const estados = {
      'Acre': 'AC',
      'Alagoas': 'AL',
      'Amapá': 'AP',
      'Amazonas': 'AM',
      'Bahia': 'BA',
      'Ceará': 'CE',
      'Distrito Federal': 'DF',
      'Espírito Santo': 'ES',
      'Goiás': 'GO',
      'Maranhão': 'MA',
      'Mato Grosso': 'MT',
      'Mato Grosso do Sul': 'MS',
      'Minas Gerais': 'MG',
      'Pará': 'PA',
      'Paraíba': 'PB',
      'Paraná': 'PR',
      'Pernambuco': 'PE',
      'Piauí': 'PI',
      'Rio de Janeiro': 'RJ',
      'Rio Grande do Norte': 'RN',
      'Rio Grande do Sul': 'RS',
      'Rondônia': 'RO',
      'Roraima': 'RR',
      'Santa Catarina': 'SC',
      'São Paulo': 'SP',
      'Sergipe': 'SE',
      'Tocantins': 'TO'
    };
    return estados[nomeEstado] || nomeEstado;
  };

  const generatePDF = async () => {
    try {
      // 1. Buscar o PDF template do diretório public
      const url = '/template/innovatis_orcamento_munic_editavel.pdf';
      const existingPdfBytes = await fetch(url).then(res => res.arrayBuffer());

      // 2. Carregar o PDF em memória com pdf-lib
      const pdfDoc = await PDFDocument.load(existingPdfBytes);
      const form = pdfDoc.getForm();

      // Converter nome do estado para sigla
      const estadoSigla = getEstadoSigla(city.name_state);

      // 3. Preencher os campos do formulário com os dados da cidade
      form.getTextField('nome_munic').setText(`${city.municipio} - ${estadoSigla}`);
      form.getTextField('VALOR_PD').setText(city.VALOR_PD || 'N/A');
      form.getTextField('VALOR_CTM').setText(city.VALOR_CTM || 'N/A');
      form.getTextField('VALOR_PMSB').setText(city.VALOR_PMSB || 'N/A');
      form.getTextField('VALOR_REURB').setText('R$1.500,00/unid.');
      form.getTextField('VALOR_START').setText('R$ 395,00/aluno');

      // 4. "Flatten" (achatar) o formulário para incorporar o texto e evitar edição futura
      form.flatten();

      // 5. Gerar os bytes do PDF modificado
      const pdfBytes = await pdfDoc.save();
      
      return {
        bytes: pdfBytes,
        fileName: `${city.nome}_${estadoSigla}_orcamento_innovatis.pdf`
      };
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Erro ao gerar o PDF. Por favor, tente novamente.');
      return null;
    }
  };

  const handleButtonClick = () => {
    if (!city) {
      setShowAlert(true);
      return;
    }
    setIsOpen(!isOpen);
  };

  const handleDownload = async () => {
    if (!city) {
      setShowAlert(true);
      return;
    }
    
    const pdf = await generatePDF();
    if (pdf) {
      download(pdf.bytes, pdf.fileName, 'application/pdf');
    }
    setIsOpen(false);
  };

  const handleShareWhatsApp = async () => {
    if (!city) {
      setShowAlert(true);
      return;
    }
    
    try {
      const pdf = await generatePDF();
      if (!pdf) return;
      
      // Criar um blob e uma URL para o PDF
      const blob = new Blob([pdf.bytes], { type: 'application/pdf' });
      
      // Limpar URL anterior se existir
      if (pdfUrl) {
        URL.revokeObjectURL(pdfUrl);
      }
      
      // Se estiver em ambiente mobile, podemos usar a API de compartilhamento nativa
      if (navigator.share && navigator.canShare) {
        const file = new File([blob], pdf.fileName, { type: 'application/pdf' });
        
        try {
          await navigator.share({
            files: [file],
            title: 'Orçamento Innovatis',
            text: `Orçamento para ${city.nome}`
          });
        } catch (err) {
          // Fallback para abrir WhatsApp Web
          const tempUrl = URL.createObjectURL(blob);
          setPdfUrl(tempUrl);
          
          // Aqui abrimos o WhatsApp Web com uma mensagem padrão
          // Como não podemos anexar arquivos diretamente via URL, orientamos o usuário a anexar o PDF baixado
          const whatsappText = encodeURIComponent(`Olá! Segue o orçamento para o município de ${city.nome}. Estou enviando o PDF em anexo.`);
          window.open(`https://wa.me/?text=${whatsappText}`, '_blank');
        }
      } else {
        // Fallback para navegadores que não suportam a API de compartilhamento
        const tempUrl = URL.createObjectURL(blob);
        setPdfUrl(tempUrl);
        
        const whatsappText = encodeURIComponent(`Olá! Segue o orçamento para o município de ${city.nome}. Estou enviando o PDF em anexo.`);
        window.open(`https://wa.me/?text=${whatsappText}`, '_blank');
      }
    } catch (error) {
      console.error('Erro ao compartilhar PDF:', error);
      alert('Erro ao compartilhar o PDF. Por favor, tente novamente.');
    }
    
    setIsOpen(false);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={handleButtonClick}
        className={`w-full md:w-auto flex items-center justify-center md:justify-start gap-2 bg-sky-600 hover:bg-sky-700 text-white font-semibold py-1.5 px-4 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-[#0f172a] ${!city ? 'opacity-90' : ''} ${className}`}
      >
        <Image
          src="/file.svg"
          alt="PDF"
          width={16}
          height={16}
          className="text-white brightness-0 invert opacity-90"
        />
        Exportar Orçamento
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          className={`h-4 w-4 ml-1 transition-transform duration-200 text-white ${isOpen ? 'rotate-180' : ''}`} 
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      
      {/* Alerta de município não selecionado */}
      {showAlert && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-red-500/90 backdrop-blur-sm text-white text-sm py-2 px-3 rounded-md shadow-lg z-50 animate-fade-in">
          <div className="flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            Nenhum município selecionado
          </div>
        </div>
      )}
      
      {isOpen && city && (
        <div className="absolute right-0 mt-1 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-50">
          <div className="py-1" role="menu" aria-orientation="vertical">
            <button
              onClick={handleDownload}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download PDF
            </button>
            <button
              onClick={handleShareWhatsApp}
              className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              role="menuitem"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-green-600" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
              </svg>
              Compartilhar via WhatsApp
            </button>
          </div>
        </div>
      )}
      
      {pdfUrl && (
        <a 
          href={pdfUrl} 
          download={`${city?.nome}_${getEstadoSigla(city?.name_state)}_orcamento_innovatis.pdf`}
          className="hidden"
          id="pdf-download-link"
        />
      )}
    </div>
  );
}

export default ExportPDFButton;