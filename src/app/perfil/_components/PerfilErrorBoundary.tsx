// Error Boundary para a página de perfil

'use client';

import { Component, ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export default class PerfilErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('Erro na página de perfil:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex items-center justify-center min-h-[400px] p-6">
          <div className="bg-red-900/30 border border-red-700/50 rounded-xl p-8 max-w-md w-full text-center">
            <AlertTriangle size={48} className="mx-auto text-red-400 mb-4" />
            <h2 className="text-2xl font-bold text-red-200 mb-2">Erro Inesperado</h2>
            <p className="text-red-300 mb-4">
              Ocorreu um erro ao carregar o perfil. Por favor, tente recarregar a página.
            </p>
            {this.state.error && (
              <details className="text-left mb-4">
                <summary className="text-sm text-red-400 cursor-pointer mb-2">
                  Detalhes técnicos
                </summary>
                <pre className="text-xs bg-slate-900/50 p-3 rounded border border-slate-700 overflow-x-auto">
                  {this.state.error.message}
                </pre>
              </details>
            )}
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-red-700 hover:bg-red-600 text-white font-semibold rounded-lg transition-colors"
            >
              Recarregar Página
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
