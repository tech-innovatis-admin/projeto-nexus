const MiniFooter = () => {
  const currentYear = new Date().getFullYear();
  
  return (
    <footer className="w-full bg-[#0f172a] border-t border-slate-700/30 relative z-10">
      <div className="max-w-screen-xl mx-auto px-4 py-5 text-sm">
        <div className="flex flex-col md:flex-row md:justify-between md:items-center">
          {/* Links à esquerda */}
          <div className="md:w-1/3 flex justify-center md:justify-start">
            <div className="space-x-2 text-slate-400">
              <span>Termo de uso</span>
              <span className="text-slate-600"> | </span>
              <span>
                Privacidade e Política
              </span>
            </div>
          </div>
          
          {/* Copyright centralizado */}
          <div className="md:w-1/3 flex justify-center mt-2 md:mt-0">
            <p className="text-center text-gray-400">
              © {currentYear} Innovatis. Todos os direitos reservados.
            </p>
          </div>
          
          {/* Créditos do Data Science à direita */}
          <div className="md:w-1/3 mt-4 md:mt-0 flex justify-center md:justify-end">
            <p className="text-gray-400">
              Powered by Data Science Team - Innovatis MC
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

export default MiniFooter
