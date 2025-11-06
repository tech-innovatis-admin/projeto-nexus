"use client";

import { LockKeyhole } from 'lucide-react';
import MiniFooter from '@/components/MiniFooter';
import { useState, useEffect } from 'react';

export default function AcessoNegadoPage() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(true), 350);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="flex flex-col min-h-screen bg-gradient-to-br from-slate-900 to-slate-800">
      <div className={`flex items-center justify-center flex-1 px-4 transition-opacity duration-500 ${isVisible ? 'opacity-100' : 'opacity-0'}`}>
        <div className="max-w-md w-full bg-slate-800 rounded-xl shadow-lg p-8 text-center border border-slate-600">
          <div className="mb-6">
            <LockKeyhole size={72} className="mx-auto text-sky-600" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-4">Acesso Restrito</h1>
          <p className="text-slate-300 mb-8 leading-relaxed">
            Seu perfil possui restrições e não tem acesso a esta página.
          </p>
          <a
            href="/mapa"
            className="inline-flex items-center px-6 py-3 bg-sky-600 text-white font-bold rounded-lg hover:bg-sky-700 transition-colors duration-200 shadow-md hover:shadow-lg mx-4 my-4"
          >
            Voltar para a NEXUS
          </a>
        </div>
      </div>
      <MiniFooter />
    </div>
  );
}