const MiniFooter = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="sticky bottom-0 w-full bg-[#0f172a] border-t border-slate-700/30 relative z-10">
      <div className="max-w-screen-xl mx-auto px-3 py-2 sm:px-4 sm:py-3 text-xs sm:text-sm">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-1 sm:gap-2">
          {/* Links à esquerda */}
          <div className="md:w-1/3 flex justify-center md:justify-start">
            <div className="space-x-1 sm:space-x-2 text-slate-400">
              <span className="text-xs sm:text-sm">Termo de uso</span>
              <span className="text-slate-600"> | </span>
              <span className="text-xs sm:text-sm">
                Privacidade e Política
              </span>
            </div>
          </div>
          
          {/* Copyright centralizado */}
          <div className="md:w-1/3 flex justify-center">
            <p className="text-center text-gray-400 text-xs sm:text-sm">
              © {currentYear} Innovatis. Todos os direitos reservados.
            </p>
          </div>
          
          {/* Créditos do Data Science à direita */}
          <div className="md:w-1/3 flex justify-center md:justify-end">
            <p className="text-gray-400 text-xs sm:text-sm">
              Powered by Data Science Team
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default MiniFooter
