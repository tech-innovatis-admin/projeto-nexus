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
import { FaEye, FaEyeSlash } from 'react-icons/fa'; // Ícones para mostrar/ocultar senha

export default function LoginPage() {
  // Estados para controle do formulário
  const [username, setUsername] = useState(""); // Estado para o nome de usuário
  const [password, setPassword] = useState(""); // Estado para a senha
  const [error, setError] = useState(""); // Estado para mensagens de erro
  const [isLoading, setIsLoading] = useState(false); // Estado para controle de carregamento
  const [showPassword, setShowPassword] = useState(false); // Estado para mostrar/ocultar senha
  const [isFadingOut, setIsFadingOut] = useState(false); // Estado para fade out
  const router = useRouter(); // Hook de navegação

  /**
   * Manipula o envio do formulário de login
   * Valida as credenciais e redireciona para a página do mapa se corretas
   */
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || 'Erro ao fazer login');
      }
      
      if (data.success) {
        // Espera um momento para o cookie ser definido
        await new Promise(resolve => setTimeout(resolve, 100));
        // Inicia fade out
        setIsFadingOut(true);
        setTimeout(() => {
          router.push('/mapa');
        }, 500); // Duração do fade out
      } else {
        throw new Error(data.error || 'Erro ao fazer login');
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Erro ao fazer login');
    } finally {
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

          {/* Campo de usuário */}
          <div className="relative mb-1">
            <input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              className="w-full h-11 pl-4 pr-4 text-sm leading-none bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition duration-150 ease-in-out"
              placeholder="Usuário"
              disabled={isLoading}
            />
          </div>

          {/* Campo de senha */}
          <div className="relative mb-1">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="off"
              data-lpignore="true"
              spellCheck="false"
              aria-autocomplete="none"
              className="w-full h-11 pl-4 pr-10 text-sm leading-none bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition duration-150 ease-in-out"
              placeholder="Senha"
              disabled={isLoading}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-white focus:outline-none"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? <FaEyeSlash size={16} /> : <FaEye size={16} />}
            </button>
          </div>

          {/* Mensagem de erro com animação */}
          {error && (
            <motion.p 
              className="text-red-400 text-sm text-center"
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ type: "spring", stiffness: 500, damping: 30 }}
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
            >
              {isLoading ? 'Entrando...' : 'Entrar'}
            </motion.button>
          </div>
        </form>

        {/* Mensagem de ajuda com link para contato */}
        <p className="mt-6 text-center text-sm text-slate-400">
          Ainda não tem acesso?<br />
          <a 
            href="mailto:victor.eduardo@innovatismc.com?subject=Solicitação%20de%20Acesso%20-%20Nexus&body=Olá,%0A%0AGostaria%20de%20solicitar%20acesso%20à%20plataforma%20Nexus.%0A%0AAtenciosamente,"
            className="text-sky-300 hover:text-sky-300 transition-colors font-medium"
            target="_blank"
            rel="noopener noreferrer"
          >
            Fale com o administrador
          </a>.
        </p>
      </motion.div>

      {/* Rodapé com copyright */}
      <footer className="absolute bottom-4 text-center text-xs text-slate-400 opacity-70 w-full px-4">
        &copy; {new Date().getFullYear()} Innovatis MC. Todos os direitos reservados.
      </footer>
    </div>
  );
} 