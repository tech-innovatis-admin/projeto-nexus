"use client";
import dynamic from "next/dynamic";
import { useState, useEffect } from "react";
import type { FeatureCollection, Feature } from "geojson";
import "leaflet/dist/leaflet.css";
import Image from "next/image";

// Importação dinâmica do mapa para evitar problemas de SSR
const MapaMunicipal = dynamic(() => import("../../components/MapaMunicipal"), { ssr: false });

export default function MapaPage() { // Renomeado de Home para MapaPage para clareza
  // Estados para os campos do formulário
  const [municipio, setMunicipio] = useState("");
  const [estado, setEstado] = useState("");
  
  // Estados para busca efetiva - só usados quando clica em "Buscar"
  const [municipioBusca, setMunicipioBusca] = useState("");
  const [estadoBusca, setEstadoBusca] = useState("");
  
  const [municipioSelecionado, setMunicipioSelecionado] = useState<Feature | null>(null);
  const [erroBusca, setErroBusca] = useState("");

  // Função chamada ao buscar município
  function handleBuscarMunicipio(e: React.FormEvent) {
    e.preventDefault();
    setMunicipioBusca(municipio);
    setEstadoBusca(estado);
    setErroBusca("");
    setMunicipioSelecionado(null); // Limpa seleção anterior
  }

  // Função chamada quando o mapa encontra o município
  function handleMunicipioEncontrado(feature: Feature | null) {
    if (!feature) {
      setErroBusca("Município/Estado não encontrado!");
      setMunicipioSelecionado(null);
    } else {
      setErroBusca("");
      setMunicipioSelecionado(feature);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-br from-[#0f172a] to-[#1e293b] text-white">
      {/* Cabeçalho */}
      <header className="w-full py-6 px-4 bg-[#1e293b] text-white shadow-md flex flex-col md:flex-row items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="text-sky-400">
            <Image
              src="/logo_innovatis.svg"
              alt="Logo Innovatis"
              width={40}
              height={40}
              className="object-contain [&>path]:fill-current [&>g]:fill-current"
              priority
            />
          </div>
          <h1 className="text-white text-2xl font-bold tracking-wide">Nexus - Plataforma de Produtos</h1>
        </div>
        <span className="text-xs text-slate-300 mt-2 md:mt-0">Powered by Next.js, React, Leaflet e Tailwind</span>
      </header>

      {/* Buscador de município/estado */}
      <section className="w-full flex flex-col items-center py-8 px-2 z-10 mb-8">
        <form
          className="flex flex-col md:flex-row gap-4 w-full max-w-2xl"
          onSubmit={handleBuscarMunicipio}
        >
          <input
            className="flex-1 rounded-md bg-[#1e293b] text-white placeholder-slate-400 border border-slate-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            type="text"
            placeholder="Nome do município"
            value={municipio}
            onChange={e => setMunicipio(e.target.value)}
            required
          />
          <input
            className="flex-1 rounded-md bg-[#1e293b] text-white placeholder-slate-400 border border-slate-600 px-4 py-2 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
            type="text"
            placeholder="Nome do estado"
            value={estado}
            onChange={e => setEstado(e.target.value)}
            required
          />
          <button
            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-md transition-colors duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-offset-2 focus:ring-offset-[#0f172a]"
            type="submit"
          >
            Buscar
          </button>
        </form>
        {erroBusca && <span className="text-red-400 mt-2">{erroBusca}</span>}
      </section>

      {/* Divisor visual */}
      <div className="mx-auto border-t border-slate-700 opacity-50"></div>

      {/* Mapa interativo */}
      <main className="flex-1 w-full flex flex-col md:flex-row items-start justify-center gap-6 p-4 md:p-8 pt-16">
        <div className="w-full md:w-2/3 max-w-4xl h-[80vh] md:h-[80vh] rounded-lg overflow-hidden shadow-lg bg-[#0f172a] border border-slate-00">
          <MapaMunicipal
            municipio={municipioBusca}
            estado={estadoBusca}
            onMunicipioEncontrado={handleMunicipioEncontrado}
          />
        </div>
        {municipioSelecionado && (
          <aside className="w-full md:w-1/3 max-w-md bg-[#1e293b] rounded-lg shadow-lg p-6 animate-fade-in text-white mt-6 md:mt-0">
            <h2 className="text-xl font-bold text-sky-300 mb-4 text-center">Informações do Município</h2>
            <ul className="grid grid-cols-1 gap-x-8 gap-y-2">
              {Object.entries(municipioSelecionado.properties || {}).map(([k, v]) => {
                // Mapeamento de nomes customizados
                const nomesCustomizados: Record<string, string> = {
                  name_state: "Estado",
                  nome_municipio: "Município",
                  municipio: "Município",
                  nome2024: "Prefeito 2024",
                  sigla_partido2024: "Sigla Partido 2024",
                  mandato: "Mandato",
                  POPULACAO_FORMAT: "População",
                  DOMICILIO_FORMAT: "Domicílios",
                  PD_ALTERADA: "Plano Diretor",
                  PD_ANO: "Ano do Plano Diretor",
                  pd_venci: "Plano Diretor Vencido",
                  reurb_exist: "REURB existência",
                  REURB_ANO: "Ano do REURB",
                  VALOR_PD: "Valor do Plano Diretor",
                  VALOR_PMSB: "Valor do PMSB",
                  VALOR_REURB: "Valor do REURB",
                  desert: "Valor do Plano Desertificação",
                  dec_ambiente: "Valor do Plano Meio Ambiente",
                  VALOR_START_INICIAIS: "Valor do Plano Start Iniciais",
                  VALOR_START_FINAIS: "Valor do Plano Start Finais",
                  VALOR_START_INICIAIS_FINAIS: "Valor do Plano Start Iniciais e Finais"
                };
                const nomeExibido = nomesCustomizados[k] || k.replace(/_/g, " ");
                return (
                  <li key={k} className="group cursor-pointer py-1">
                    <span className="font-semibold capitalize text-slate-300 group-hover:text-sky-200 transition-colors duration-150 ease-in-out">{nomeExibido}: </span>
                    <span className="text-slate-100 group-hover:text-sky-200 transition-colors duration-150 ease-in-out break-words">{v as string}</span>
                  </li>
                );
              })}
            </ul>
          </aside>
        )}
      </main>


      {/* Rodapé */}
      <footer className="w-full py-4 text-center text-xs text-white text-slate-400 opacity-70 mt-8">
        &copy; {new Date().getFullYear()} Innovatis MC. Todos os direitos reservados.
      </footer>
    </div>
  );
} 