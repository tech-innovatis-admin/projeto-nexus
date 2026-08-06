/**
 * Página de Login da NEXUS
 * Implementa autenticação segura via API (+ SSO Cognito quando habilitado)
 */

"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Image from "next/image";
import { FaEye, FaEyeSlash } from 'react-icons/fa';
import { useUser } from "@/contexts/UserContext";
import MiniFooter from "@/components/MiniFooter";
import { preloadPolosDataOnLogin } from "@/contexts/PolosDataContext";

const SSO_ERROR_MESSAGES: Record<string, string> = {
  cognito_denied: 'Login SSO cancelado ou negado.',
  missing_code: 'Resposta SSO incompleta. Tente novamente.',
  missing_oauth_cookie: 'Sessão SSO expirou. Inicie o login de novo.',
  invalid_oauth_cookie: 'Sessão SSO inválida. Tente novamente.',
  state_mismatch: 'Falha de segurança no SSO (state). Tente novamente.',
  user_not_linked: 'Usuário sem acesso ao Nexus (tag nexus) ou não vinculado.',
  callback_failed: 'Falha ao concluir o SSO. Tente novamente.',
};

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [isFadingOut, setIsFadingOut] = useState(false);
  const [showCredentials, setShowCredentials] = useState(true);
  const [showSso, setShowSso] = useState(false);
  const router = useRouter();
  const { setUser } = useUser();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const ssoError = params.get('sso_error');
    if (ssoError) {
      setError(SSO_ERROR_MESSAGES[ssoError] || `Erro SSO: ${ssoError}`);
      params.delete('sso_error');
      const next = params.toString();
      window.history.replaceState(
        null,
        '',
        `${window.location.pathname}${next ? `?${next}` : ''}`
      );
    }

    let cancelled = false;
    (async () => {
      try {
        const res = await fetch('/api/auth/mode');
        if (!res.ok) return;
        const data = (await res.json()) as {
          credentials?: boolean;
          cognito?: boolean;
        };
        if (!cancelled) {
          setShowCredentials(data.credentials !== false);
          setShowSso(Boolean(data.cognito));
        }
      } catch {
        // keep legacy defaults
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log(`🔐 [LoginPage] Tentativa de login: ${username}`);
    setIsLoading(true);
    setError("");

    try {
      console.log('📡 [LoginPage] Enviando request para /api/auth...');
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
      });

      console.log(`📡 [LoginPage] Response status: ${response.status}`);
      const data = await response.json();
      console.log('📡 [LoginPage] Response data:', data);

      if (!response.ok) {
        console.error(`❌ [LoginPage] Login falhou - Status: ${response.status}, Error:`, data.error);
        throw new Error(data.error || 'Erro ao fazer login');
      }

      if (data.success) {
        console.log('✅ [LoginPage] Login bem-sucedido!');

        if (data.user) {
          console.log('👤 [LoginPage] Definindo dados do usuário:', data.user);
          setUser(data.user);
        }

        preloadPolosDataOnLogin();

        console.log('⏳ [LoginPage] Aguardando cookie ser definido...');
        await new Promise(resolve => setTimeout(resolve, 100));

        console.log('🎬 [LoginPage] Iniciando animação de fade out...');
        setIsFadingOut(true);

        setTimeout(() => {
          console.log('🗺️ [LoginPage] Redirecionando para /mapa');
          router.push('/mapa');
        }, 500);
      } else {
        console.error(`❌ [LoginPage] Login falhou - Response success: false`);
        throw new Error(data.error || 'Erro ao fazer login');
      }
    } catch (error) {
      console.error(`❌ [LoginPage] Erro no login:`, error instanceof Error ? error.message : error);
      setError(error instanceof Error ? error.message : 'Erro ao fazer login');
    } finally {
      console.log('🔄 [LoginPage] Finalizando tentativa de login');
      setIsLoading(false);
    }
  };

  const containerVariants = {
    hidden: { opacity: 0, y: -30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  const buttonVariants = {
    hover: { scale: 1.05, transition: { duration: 0.2 } },
    tap: { scale: 0.95 },
  };

  return (
    <div className="h-screen flex flex-col items-center justify-center bg-gradient-to-br from-slate-900 to-slate-700 p-4">
      <motion.div
        className="w-full max-w-sm bg-white/10 backdrop-blur-md shadow-xl shadow-black/20 rounded-xl p-6"
        variants={containerVariants}
        initial="hidden"
        animate={isFadingOut ? "hidden" : "visible"}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center justify-center mb-6">
          <div className="text-sky-300">
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

        {error && (
          <motion.p
            className="text-red-400 text-sm text-center mb-4"
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          >
            {error}
          </motion.p>
        )}

        {showSso && (
          <a
            href="/auth/login"
            className="mb-4 w-full inline-flex items-center justify-center bg-white/90 hover:bg-white text-slate-900 font-semibold py-2 px-4 rounded-lg transition-colors duration-150"
          >
            Entrar com SSO
          </a>
        )}

        {showSso && showCredentials && (
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wider text-slate-400">
            ou com senha
          </p>
        )}

        {showCredentials && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative mb-1">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  if (error) setError("");
                }}
                required
                className="w-full h-11 pl-4 pr-4 text-sm leading-none bg-slate-800/50 border border-slate-600 rounded-lg text-white placeholder-slate-400 focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition duration-150 ease-in-out"
                placeholder="Usuário"
                disabled={isLoading}
              />
            </div>

            <div className="relative mb-1">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (error) setError("");
                }}
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
        )}

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

      <div className="absolute bottom-0 w-full">
        <MiniFooter />
      </div>
    </div>
  );
}
