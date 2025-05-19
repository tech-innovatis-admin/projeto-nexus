"use client";
import { useState, useEffect, useRef } from "react";

interface AutocompleteMunicipioProps {
  municipios: { nome_municipio: string; name_state: string }[];
  onSelect: (municipio: string, estado: string) => void;
  estadoAtual: string;
}

export default function AutocompleteMunicipio({ municipios, onSelect, estadoAtual }: AutocompleteMunicipioProps) {
  const [input, setInput] = useState("");
  const [sugestoes, setSugestoes] = useState<{ nome_municipio: string; name_state: string }[]>([]);
  const [foco, setFoco] = useState(-1);
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Atualiza sugestões conforme digita
  useEffect(() => {
    if (input.length < 2) {
      setSugestoes([]);
      setShow(false);
      return;
    }
    const termo = input.toLowerCase();
    const estado = estadoAtual.toLowerCase();
    setSugestoes(
      municipios.filter(m =>
        m.nome_municipio.toLowerCase().includes(termo) &&
        (!estado || m.name_state.toLowerCase().includes(estado))
      ).slice(0, 10)
    );
    setShow(true);
  }, [input, estadoAtual, municipios]);

  // Fecha sugestões ao clicar fora
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setShow(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Seleciona sugestão pelo teclado
  function handleKeyDown(e: React.KeyboardEvent) {
    if (!show) return;
    if (e.key === "ArrowDown") {
      setFoco(f => Math.min(f + 1, sugestoes.length - 1));
    } else if (e.key === "ArrowUp") {
      setFoco(f => Math.max(f - 1, 0));
    } else if (e.key === "Enter" && foco >= 0) {
      selecionar(sugestoes[foco]);
    }
  }

  function selecionar(m: { nome_municipio: string; name_state: string }) {
    setInput(m.nome_municipio);
    setShow(false);
    setFoco(-1);
    onSelect(m.nome_municipio, m.name_state);
  }

  return (
    <div className="relative w-full" ref={ref}>
      <input
        className="flex-1 rounded border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all text-black"
        type="text"
        placeholder="Nome do município"
        value={input}
        onChange={e => setInput(e.target.value)}
        onFocus={() => setShow(true)}
        onKeyDown={handleKeyDown}
        autoComplete="off"
      />
      {show && sugestoes.length > 0 && (
        <ul className="absolute z-20 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded shadow-lg mt-1 max-h-60 overflow-y-auto animate-fade-in">
          {sugestoes.map((m, i) => (
            <li
              key={m.nome_municipio + m.name_state}
              className={`px-3 py-2 cursor-pointer hover:bg-blue-100 dark:hover:bg-blue-900 transition-all ${i === foco ? "bg-blue-200 dark:bg-blue-700" : ""}`}
              onMouseDown={() => selecionar(m)}
            >
              {m.nome_municipio} <span className="text-xs text-gray-500">({m.name_state})</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 