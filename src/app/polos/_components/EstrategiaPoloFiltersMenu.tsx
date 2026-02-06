"use client";
import { memo, useEffect, useRef, useState } from 'react';

export type EstrategiaFiltersMenuProps = {
  isRadarActive: boolean;
  setIsRadarActive: (v: boolean) => void;
  isRelActive: boolean;
  setIsRelActive: (v: boolean) => void;
  onOpenRelacionamentoModal?: () => void;
};

const EstrategiaFiltersMenu = memo(function EstrategiaFiltersMenu({
  isRadarActive,
  setIsRadarActive,
  isRelActive,
  setIsRelActive,
  onOpenRelacionamentoModal,
}: EstrategiaFiltersMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const buttonRef = useRef<HTMLButtonElement | null>(null);

  // Fecha ao clicar fora (fechamento por ESC removido; abrir só por clique)
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (!containerRef.current) return;
      if (!containerRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => {
      document.removeEventListener('mousedown', onDocClick);
    };
  }, [open]);

  const activeCount = (isRadarActive ? 1 : 0) + (isRelActive ? 1 : 0);
  const anyActive = activeCount > 0;

  return (
    <div ref={containerRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen(v => !v)}
        className={`inline-flex items-center gap-2 bg-[#0f172a] border border-slate-700/60 rounded-md px-3 py-1.5 text-sm text-slate-200 hover:bg-[#1a2332] focus:outline-none focus:ring-2 focus:ring-sky-500`}
        aria-haspopup="menu"
        aria-expanded={open}
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-300" viewBox="0 0 24 24" fill="currentColor">
          <path d="M10.5 6a1.5 1.5 0 1 1-3 0 1.5 1.5 0 0 1 3 0ZM18 6h-4.5a.75.75 0 0 0 0 1.5H18A.75.75 0 0 0 18 6Zm0 5.25H6a.75.75 0 0 0 0 1.5h12a.75.75 0 0 0 0-1.5Zm-9 6H6a.75.75 0 0 0 0 1.5h3a.75.75 0 0 0 0-1.5Zm11.25 0H12a.75.75 0 0 0 0 1.5h8.25a.75.75 0 0 0 0-1.5Z"/>
        </svg>
        <span>Filtros do Mapa</span>
        <svg xmlns="http://www.w3.org/2000/svg" className={`h-4 w-4 text-slate-300 transition-transform ${open ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd"/>
        </svg>
        {anyActive && (
          <span className="ml-1 inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-700/60 text-slate-200">
            {activeCount} {activeCount === 1 ? 'Ativo' : 'Ativos'}
          </span>
        )}
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Filtros do mapa"
          className="absolute left-0 sm:left-auto sm:right-0 top-full mt-2 w-fit min-w-[200px] rounded-md border border-slate-700/70 bg-[#0f172a] shadow-xl z-[9999] p-2"
        >
          {/* Item: Radar Estratégico */}
          <div className="flex items-center justify-between px-2 py-2 rounded hover:bg-slate-800/50">
            <div className="min-w-0 flex-1">
              <span className="text-sm text-white font-medium truncate">Radar Estratégico</span>
              <p className="mt-0.5 text-[11px] text-slate-400">Raio de 1.300 km</p>
            </div>
            <button
              onClick={() => setIsRadarActive(!isRadarActive)}
              className={`relative inline-flex h-6 w-11 ml-2 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-sky-500 flex-shrink-0 ${isRadarActive ? 'bg-sky-600 shadow-lg shadow-sky-500/30' : 'bg-slate-600'}`}
              role="switch"
              aria-checked={isRadarActive}
              aria-label="Ativar filtro Radar Estratégico"
            >
              <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 ${isRadarActive ? 'translate-x-6 scale-110' : 'translate-x-1'}`} />
            </button>
          </div>

          <div className="my-1 border-t border-slate-700/60" />

          {/* Item: Relacionamento */}
          <div className="flex items-center justify-between px-2 py-2 rounded hover:bg-slate-800/50">
            <div className="min-w-0 flex-1">
              <span className="text-sm text-white font-medium truncate">Relacionamento</span>
              <p className="mt-0.5 text-[11px] text-slate-400">Apenas com relacionamento.</p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              {/* Botão de gerenciar */}
              {onOpenRelacionamentoModal && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onOpenRelacionamentoModal();
                  }}
                  className="p-1.5 hover:bg-slate-700 rounded-md transition-colors"
                  title="Gerenciar relacionamentos"
                  aria-label="Gerenciar relacionamentos"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-slate-400 hover:text-emerald-400" viewBox="0 0 20 20" fill="currentColor">
                    <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
                  </svg>
                </button>
              )}
              {/* Toggle switch */}
              <button
                onClick={() => setIsRelActive(!isRelActive)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-emerald-500 flex-shrink-0 ${isRelActive ? 'bg-emerald-600 shadow-lg shadow-emerald-500/30' : 'bg-slate-600'}`}
                role="switch"
                aria-checked={isRelActive}
                aria-label="Ativar filtro de relacionamento"
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-all duration-300 ${isRelActive ? 'translate-x-6 scale-110' : 'translate-x-1'}`} />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
});

export default EstrategiaFiltersMenu;
