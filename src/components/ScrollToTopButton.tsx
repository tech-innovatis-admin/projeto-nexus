"use client";

import { useState, useEffect } from 'react';

/**
 * Componente que exibe um botão para rolar de volta ao topo da página
 * Visível apenas em dispositivos móveis e quando o usuário rolou para baixo
 */
export default function ScrollToTopButton() {
  const [isVisible, setIsVisible] = useState(false);

  // Verifica a posição de rolagem e atualiza a visibilidade do botão
  useEffect(() => {
    const toggleVisibility = () => {
      // Mostra o botão quando o usuário rolar além de 300px
      if (window.scrollY > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    // Adiciona o listener de evento de rolagem
    window.addEventListener('scroll', toggleVisibility);

    // Remove o listener quando o componente é desmontado
    return () => window.removeEventListener('scroll', toggleVisibility);
  }, []);

  // Função para rolar suavemente para o topo
  const scrollToTop = () => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth'
    });
  };

  // Renderiza o botão apenas se estiver visível
  return (
    <>
      {isVisible && (
        <button
          onClick={scrollToTop}
          className="md:hidden fixed bottom-4 right-4 bg-sky-600/80 hover:bg-sky-700 text-white rounded-full p-2 shadow-lg backdrop-blur-sm transition-all duration-300 z-50 border border-sky-500/30"
          aria-label="Voltar ao topo"
        >
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            className="h-5 w-5" 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path 
              strokeLinecap="round" 
              strokeLinejoin="round" 
              strokeWidth={2} 
              d="M5 10l7-7m0 0l7 7m-7-7v18" 
            />
          </svg>
        </button>
      )}
    </>
  );
} 