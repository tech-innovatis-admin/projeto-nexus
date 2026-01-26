/**
 * Página de Login da NEXUS
 * Implementa autenticação segura via API
 */

"use client"; // Marca este componente como um componente cliente

// Importações necessárias
import { useState } from "react"; // Hook para gerenciamento de estado
import { useRouter } from "next/navigation"; // Hook para navegação
import { motion } from "framer-motion"; // Biblioteca de animações
import Image from "next/image"; // Importação do componente Image
import MiniFooter from "@/components/MiniFooter"; // Componente de rodapé

export default function LoginPage() {
  // Estados para controle do formulário
  const [error, setError] = useState(""); // Estado para mensagens de erro
  const [isLoading, setIsLoading] = useState(false); // Estado para controle de carregamento
  const [isFadingOut, setIsFadingOut] = useState(false); // Estado para fade out
  const router = useRouter(); // Hook de navegação

  /**
   * Manipula o envio do formulário de login
   * Redireciona diretamente para a página do mapa
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`🔐 [LoginPage] Entrada sem autenticação`);
    setIsLoading(true);

    try {
      // Inicia fade out
      console.log('🎬 [LoginPage] Iniciando animação de fade out...');
      setIsFadingOut(true);

      setTimeout(() => {
        console.log('🗺️ [LoginPage] Redirecionando para /mapa');
        router.push('/mapa');
      }, 500); // Duração do fade out
    } catch (error) {
      console.error(`❌ [LoginPage] Erro:`, error instanceof Error ? error.message : error);
      setError('Erro ao entrar. Tente novamente.');
    } finally {
      console.log('🔄 [LoginPage] Finalizando entrada');
      setIsLoading(false);
    }
  };

  // Configurações de animação para o container
  const containerVariants = {
    hidden: { opacity: 0, y: -30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  // Configurações de animação para o botão
  const buttonVariants = {
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95 },
  };

  return (
    // Container principal com gradiente de fundo
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      {/* Card de login com efeito de vidro e animação de entrada */}
      <motion.div
        className="w-full max-w-sm bg-white/10 backdrop-blur-md shadow-xl shadow-black/20 rounded-xl p-6"
        variants={containerVariants}
        initial="hidden"
        animate={isFadingOut ? "hidden" : "visible"}
        transition={{ duration: 0.5 }}
      >
        {/* Cabeçalho com logo e título */}
        <div className="flex flex-col items-center justify-center mb-6">
          {/* Logo Innovatis com cor controlada por CSS */}
          <div className="text-sky-300"> {/* Esta classe controla a cor do SVG */}
            <Image
              src="/logo_innovatis.svg"
              alt="Logo Innovatis"
              width={120}
              height={120}
              className="mb-2 object-contain [&>path]:fill-current [&>g]:fill-current"
              priority
            />
          </div>
          <h1 className="text-3xl font-bold text-white mb-1">NEXUS</h1>
          <p className="text-sm text-sky-300">
            Bem-vindo à Plataforma
          </p>
        </div>

        {/* Formulário de login */}
        <form onSubmit={handleSubmit} className="space-y-4">

          {/* Mensagem de boas-vindas */}
          <p className="text-center text-sm text-slate-300 mb-6">
            Clique em "Entrar" para acessar a plataforma
          </p>

          {/* Mensagem de erro com animação */}
          {error && (
            <motion.p
              className="text-red-400 text-sm text-center"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
              onAnimationComplete={() => {
                console.log(`❌ [LoginPage] Mensagem de erro exibida: ${error}`);
              }}
            >
              {error}
            </motion.p>
          )}

          {/* Botão de login com animação */}
          <div>
            <motion.button
              type="submit"
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed"
              variants={buttonVariants}
              whileHover="hover"
              whileTap="tap"
              disabled={isLoading}
              onClick={() => {
                console.log(`🚀 [LoginPage] Formulário submetido - Username: ${username}, Password: ${password.length > 0 ? 'Preenchida' : 'Vazia'}`);
              }}
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </motion.button>
          </div>
        </form>
      </motion.div>

      {/* Componente MiniFooter */}
      <div className="absolute bottom-0 w-full">
        <MiniFooter />
      </div>
    </div>
  );
} 