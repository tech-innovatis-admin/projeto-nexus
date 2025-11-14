/**
 * Página inicial da plataforma NEXUS
 * Apresenta uma animação 3D de introdução seguida da tela de boas-vindas
 * com efeitos visuais e botão de login
 */

"use client"; // Marca este componente como um componente cliente (Client Component)

// Importação de hooks React necessários
import { useEffect, useState } from 'react';
// Hook de navegação do Next.js
import { useRouter } from 'next/navigation';
// Importação dinâmica para otimização de performance
import dynamic from 'next/dynamic';
// Estilos CSS modulares
import styles from './mapa/page.module.css';
// Componente para voltar ao topo
import ScrollToTopButton from '@/components/ScrollToTopButton';

// Importação dinâmica do componente 3D para evitar problemas com SSR (Server Side Rendering)
// O componente só será carregado no lado do cliente
const Nexus3D = dynamic(() => import('../components/Nexus3D'), { ssr: false });

export default function HomePage() {
  // Estado para controlar a visibilidade da animação de introdução
  const [showIntro, setShowIntro] = useState(true);
  // Estado para controlar a visibilidade da descrição
  const [showDescription, setShowDescription] = useState(false);
  // Hook para navegação entre páginas
  const router = useRouter();

  // Efeito para controlar o tempo de exibição da animação de introdução
  useEffect(() => {
    // Timer para esconder a intro e mostrar a descrição após 4 segundos
    const timer = setTimeout(() => {
      setShowIntro(false);
      setShowDescription(true);
    }, 4000);

    // Cleanup function para limpar o timer quando o componente for desmontado
    return () => clearTimeout(timer);
  }, []); // Array vazio significa que o efeito só roda uma vez na montagem

  // Função para redirecionar o usuário para a página de login
  const handleLoginRedirect = () => {
    router.push('/login');
  };

  return (
    // Container principal que ocupa toda a viewport
    <div className={styles.mainContainer}>
      {/* Seção de introdução com animação 3D */}
      {showIntro && (
        <div className={styles.introContainer}>
          <Nexus3D />
        </div>
      )}

      {/* Container principal com efeitos visuais e conteúdo */}
      <div className={styles.container}>
        {/* Background com efeito de partículas */}
        <div className={styles.particleCanvas}>
          <Nexus3D hideText3D />
        </div>
        
        {/* Efeito de brilho flutuante */}
        <div className={styles.glowEffect} />
        
        {/* Título principal com efeito de texto */}
        <h1 className={styles.title}>
          <span data-text="NEXUS">NEXUS</span>
        </h1>

        {/* Seção de descrição com animação de fade in */}
        {showDescription && (
          <div className={styles.description}>
            <p>
              A <strong>NEXUS</strong> é uma plataforma de produtos e dados municipais que oferece suporte estratégico à Diretoria de Estratégia e Mercado da Innovatis.
            </p>
            {/* Botão de login com efeitos hover */}
            <button 
              onClick={handleLoginRedirect} 
              className={styles.loginButton}
              onMouseEnter={(e) => {
                if (e.currentTarget) {
                  e.currentTarget.style.transform = 'perspective(500px) rotateX(10deg) translateY(-5px)';
                }
              }}
              onMouseLeave={(e) => {
                if (e.currentTarget) {
                  e.currentTarget.style.transform = 'perspective(500px) rotateX(0deg)';
                }
              }}
            >
              Fazer Login
            </button>
          </div>
        )}
      </div>

      {/* Botão para voltar ao topo (visível apenas em mobile) */}
      <ScrollToTopButton />
    </div>
  );
} 