"use client";
import { memo, useEffect, useState, useCallback, useRef } from 'react';
import { createPortal } from 'react-dom';
import { TODAS_UFS, UF_NAMES } from '@/utils/mapConfig';

// Tipo para os dados de relacionamento
export interface RelacionamentoMunicipio {
  row_index: number;
  name_state: string;
  code_muni: string;
  name_muni: string;
  relacionamento_ativo: boolean;
  relacionamento_criado: string | null;
  relacionamento_editado: string | null;
}

// Tipo para municípios disponíveis (vindos da base de polos/periferias)
export interface MunicipioDisponivel {
  codigo: string;
  nome: string;
  UF: string;
}

export interface RelacionamentoModalProps {
  isOpen: boolean;
  onClose: (novosCadastros?: number) => void;
  municipiosDisponiveis?: MunicipioDisponivel[];
}

const RelacionamentoModal = memo(function RelacionamentoModal({
  isOpen,
  onClose,
  municipiosDisponiveis = []
}: RelacionamentoModalProps) {
  // Estado para lista de relacionamentos
  const [relacionamentos, setRelacionamentos] = useState<RelacionamentoMunicipio[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Estado para o formulário de adição
  const [selectedUF, setSelectedUF] = useState<string>('');
  const [selectedMunicipio, setSelectedMunicipio] = useState<string>('');
  const [searchMunicipio, setSearchMunicipio] = useState<string>('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [saving, setSaving] = useState(false);

  // Estado para filtro da tabela
  const [filterUF, setFilterUF] = useState<string>('');
  const [filterSearch, setFilterSearch] = useState<string>('');
  const [showOnlyActive, setShowOnlyActive] = useState(true);

  // Refs
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // 🆕 Contador de novos cadastros durante a sessão do modal
  const novosCadastrosRef = useRef<number>(0);

  // Carregar relacionamentos ao abrir e resetar contador
  useEffect(() => {
    if (isOpen) {
      novosCadastrosRef.current = 0; // Reset contador ao abrir
      fetchRelacionamentos();
    }
  }, [isOpen]);

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    if (!isDropdownOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  // Limpar mensagens após 3 segundos
  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  const fetchRelacionamentos = async () => {
    setLoading(true);
    setError(null);
    try {
      // Sempre carrega TODOS os relacionamentos (ativos + inativos)
      // O filtro showOnlyActive é aplicado apenas na exibição da tabela
      const res = await fetch(`/api/relacionamentos?apenas_ativos=false`);
      const data = await res.json();
      if (data.success) {
        setRelacionamentos(data.data);
      } else {
        setError(data.error || 'Erro ao carregar relacionamentos');
      }
    } catch (err) {
      setError('Erro de conexão ao carregar relacionamentos');
    } finally {
      setLoading(false);
    }
  };

  // Removido: recarregar quando filtro de ativos mudar
  // Agora showOnlyActive é apenas um filtro de visualização, não recarrega dados

  // Municípios filtrados por UF selecionada
  const municipiosFiltrados = municipiosDisponiveis
    .filter(m => {
      if (!selectedUF) return false;
      if (m.UF?.toUpperCase() !== selectedUF.toUpperCase()) return false;
      // Filtrar por busca
      if (searchMunicipio) {
        const searchLower = searchMunicipio.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        const nomeLower = m.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
        return nomeLower.includes(searchLower);
      }
      return true;
    })
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));

  // Verificar se município já tem relacionamento
  const jaTemRelacionamento = (codigo: string) => {
    return relacionamentos.some(r => r.code_muni === codigo && r.relacionamento_ativo);
  };

  // Adicionar novo relacionamento
  const handleAddRelacionamento = async () => {
    if (!selectedUF || !selectedMunicipio) {
      setError('Selecione o estado e o município');
      return;
    }

    const municipio = municipiosDisponiveis.find(m => m.codigo === selectedMunicipio);
    if (!municipio) {
      setError('Município não encontrado');
      return;
    }

    // Verificar se já existe (ativo ou inativo)
    const existente = relacionamentos.find(r => r.code_muni === municipio.codigo);

    setSaving(true);
    setError(null);

    try {
      if (existente) {
        // Se existe mas está inativo, reativar
        if (!existente.relacionamento_ativo) {
          const res = await fetch('/api/relacionamentos', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              code_muni: municipio.codigo,
              relacionamento_ativo: true
            })
          });
          const data = await res.json();
          if (data.success) {
            novosCadastrosRef.current += 1; // 🆕 Incrementar contador
            setSuccessMessage('Relacionamento reativado com sucesso!');
            await fetchRelacionamentos();
            resetForm();
          } else {
            setError(data.error || 'Erro ao reativar relacionamento');
          }
        } else {
          setError('Município já possui relacionamento ativo');
        }
      } else {
        // Criar novo
        const res = await fetch('/api/relacionamentos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name_state: selectedUF.toUpperCase(),
            code_muni: municipio.codigo,
            name_muni: municipio.nome,
            relacionamento_ativo: true
          })
        });
        const data = await res.json();
        if (data.success) {
          novosCadastrosRef.current += 1; // 🆕 Incrementar contador
          setSuccessMessage('Relacionamento cadastrado com sucesso!');
          await fetchRelacionamentos();
          resetForm();
        } else {
          setError(data.error || 'Erro ao cadastrar relacionamento');
        }
      }
    } catch (err) {
      setError('Erro de conexão ao salvar');
    } finally {
      setSaving(false);
    }
  };

  // Desativar relacionamento
  const handleDesativar = async (codeMuni: string) => {
    try {
      const res = await fetch(`/api/relacionamentos?code_muni=${codeMuni}`, {
        method: 'DELETE'
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Relacionamento desativado');
        await fetchRelacionamentos();
      } else {
        setError(data.error || 'Erro ao desativar');
      }
    } catch (err) {
      setError('Erro de conexão');
    }
  };

  // Reativar relacionamento
  const handleReativar = async (codeMuni: string) => {
    try {
      const res = await fetch('/api/relacionamentos', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code_muni: codeMuni,
          relacionamento_ativo: true
        })
      });
      const data = await res.json();
      if (data.success) {
        setSuccessMessage('Relacionamento reativado');
        await fetchRelacionamentos();
      } else {
        setError(data.error || 'Erro ao reativar');
      }
    } catch (err) {
      setError('Erro de conexão');
    }
  };

  const resetForm = () => {
    setSelectedUF('');
    setSelectedMunicipio('');
    setSearchMunicipio('');
    setIsDropdownOpen(false);
  };

  // Relacionamentos filtrados para exibição na tabela
  const relacionamentosFiltrados = relacionamentos.filter(r => {
    // Filtro de apenas ativos (aplicado apenas na visualização)
    if (showOnlyActive && !r.relacionamento_ativo) return false;
    if (filterUF && r.name_state !== filterUF) return false;
    if (filterSearch) {
      const searchLower = filterSearch.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      const nomeLower = r.name_muni.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
      if (!nomeLower.includes(searchLower)) return false;
    }
    return true;
  });

  // Formatar data (com proteção para null/undefined)
  const formatDate = (dateStr: string | null | undefined) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '—';
    }
  };

  if (!isOpen) return null;

  const modalContent = (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center p-4">
      {/* Overlay */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm" 
        onClick={() => onClose(novosCadastrosRef.current)}
      />
      
      {/* Modal */}
      <div className="relative bg-white border border-gray-200 rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col mx-4">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-sky-100 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-sky-600" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">Gerenciar Relacionamentos</h2>
              <p className="text-xs text-gray-500">Cadastre e gerencie municípios com relacionamento ativo</p>
            </div>
          </div>
          <button
            onClick={() => onClose(novosCadastrosRef.current)}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Fechar modal"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>

        {/* Messages */}
        {(error || successMessage) && (
          <div className="px-6 pt-4">
            {error && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </div>
            )}
            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-700 text-sm flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                {successMessage}
              </div>
            )}
          </div>
        )}

        {/* Formulário de adição */}
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-sm font-medium text-gray-800 mb-3">Adicionar Novo Relacionamento</h3>
          <div className="flex flex-wrap gap-3">
            {/* Select de UF */}
            <div className="flex-1 min-w-[150px]">
              <label className="block font-bold text-xs text-gray-600 mb-1">Estado (UF)</label>
              <select
                value={selectedUF}
                onChange={(e) => {
                  setSelectedUF(e.target.value);
                  setSelectedMunicipio('');
                  setSearchMunicipio('');
                }}
                className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-sky-500"
              >
                <option value="">Selecione o estado</option>
                {TODAS_UFS.map(uf => (
                  <option key={uf} value={uf}>{uf} - {UF_NAMES[uf]}</option>
                ))}
              </select>
            </div>

            {/* Combobox de Município */}
            <div className="flex-[2] min-w-[250px] relative" ref={dropdownRef}>
              <label className="block font-bold text-xs text-gray-600 mb-1">Município</label>
              <div className="relative">
                <input
                  ref={inputRef}
                  type="text"
                  value={searchMunicipio || (selectedMunicipio ? municipiosDisponiveis.find(m => m.codigo === selectedMunicipio)?.nome : '')}
                  onChange={(e) => {
                    setSearchMunicipio(e.target.value);
                    setSelectedMunicipio('');
                    setIsDropdownOpen(true);
                  }}
                  onFocus={() => setIsDropdownOpen(true)}
                  placeholder={selectedUF ? 'Buscar município...' : 'Selecione o estado primeiro'}
                  disabled={!selectedUF}
                  className="w-full px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50 disabled:cursor-not-allowed pr-8"
                />
                {selectedMunicipio && (
                  <button
                    onClick={() => {
                      setSelectedMunicipio('');
                      setSearchMunicipio('');
                    }}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-gray-100 rounded"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                )}
              </div>
              
              {/* Dropdown de municípios */}
              {isDropdownOpen && selectedUF && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-white border border-gray-300 rounded-lg shadow-xl z-50 max-h-[200px] overflow-y-auto">
                  {municipiosFiltrados.length === 0 ? (
                    <div className="px-3 py-2 text-sm text-gray-500">
                      {searchMunicipio ? 'Nenhum município encontrado' : 'Nenhum município disponível'}
                    </div>
                  ) : (
                    municipiosFiltrados.map(m => {
                      const temRelacionamento = jaTemRelacionamento(m.codigo);
                      return (
                        <button
                          key={m.codigo}
                          onClick={() => {
                            if (!temRelacionamento) {
                              setSelectedMunicipio(m.codigo);
                              setSearchMunicipio('');
                              setIsDropdownOpen(false);
                            }
                          }}
                          disabled={temRelacionamento}
                          className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                            temRelacionamento 
                              ? 'text-gray-400 cursor-not-allowed bg-gray-50' 
                              : 'text-gray-700 hover:bg-gray-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span>{m.nome}</span>
                            {temRelacionamento && (
                              <span className="text-xs text-sky-600 flex items-center gap-1">
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                                Já cadastrado
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Botão de adicionar */}
            <div className="flex items-end">
              <button
                onClick={handleAddRelacionamento}
                disabled={!selectedUF || !selectedMunicipio || saving}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors flex items-center gap-2"
              >
                {saving ? (
                  <>
                    <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Salvando...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
                    </svg>
                    Adicionar
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Filtros da tabela */}
        <div className="px-6 py-3 border-b border-gray-200 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-600">Filtrar por UF:</label>
            <select
              value={filterUF}
              onChange={(e) => setFilterUF(e.target.value)}
              className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700 focus:outline-none focus:ring-1 focus:ring-sky-500"
            >
              <option value="">Todos</option>
              {TODAS_UFS.map(uf => (
                <option key={uf} value={uf}>{uf}</option>
              ))}
            </select>
          </div>
          
          <div className="flex items-center gap-2">
            <label className="text-xs font-bold text-gray-600">Buscar:</label>
            <input
              type="text"
              value={filterSearch}
              onChange={(e) => setFilterSearch(e.target.value)}
              placeholder="Nome do município..."
              className="px-2 py-1 bg-white border border-gray-300 rounded text-xs text-gray-700 placeholder-gray-500 focus:outline-none focus:ring-1 focus:ring-sky-500 w-40"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer ml-auto">
            <input
              type="checkbox"
              checked={showOnlyActive}
              onChange={(e) => setShowOnlyActive(e.target.checked)}
              className="w-4 h-4 rounded border-gray-300 bg-white text-sky-600 focus:ring-sky-500 focus:ring-offset-0"
            />
            <span className="text-xs font-bold text-gray-600">Apenas ativos</span>
          </label>

          <div className="text-xs text-gray-500">
            {relacionamentosFiltrados.length} de {relacionamentos.length} registros
          </div>
        </div>

        {/* Tabela de relacionamentos */}
        <div className="flex-1 overflow-auto px-6 py-4">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <svg className="animate-spin h-8 w-8 text-sky-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            </div>
          ) : relacionamentosFiltrados.length === 0 ? (
            <div className="text-center py-12">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <p className="text-gray-500">Nenhum relacionamento encontrado</p>
              <p className="text-gray-400 text-sm mt-1">Adicione um novo relacionamento acima</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left text-xs text-slate-400 border-b border-slate-700">
                  <th className="pb-2 font-medium text-center text-gray-600">UF</th>
                  <th className="pb-2 font-medium text-gray-600">Município</th>
                  <th className="pb-2 font-medium text-gray-600">Código</th>
                  <th className="pb-2 font-medium text-gray-600">Status</th>
                  <th className="pb-2 font-medium text-gray-600">Criado em</th>
                  <th className="pb-2 font-medium text-gray-600">Editado em</th>
                  <th className="pb-2 font-medium text-center text-gray-600">Ações</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                {relacionamentosFiltrados.map(rel => (
                  <tr key={rel.row_index} className="border-b border-gray-200 hover:bg-gray-50">
                    <td className="py-2.5 text-center">
                      <span className="inline-flex items-center px-2 py-0.5 rounded bg-gray-100 text-gray-700 text-xs font-medium">
                        {rel.name_state}
                      </span>
                    </td>
                    <td className="py-2.5 text-gray-900">{rel.name_muni}</td>
                    <td className="py-2.5 text-gray-500 font-mono text-xs">{rel.code_muni}</td>
                    <td className="py-2.5">
                      {rel.relacionamento_ativo ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                          Ativo
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gray-100 text-gray-600 text-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-gray-500"></span>
                          Inativo
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 text-gray-500 text-xs">{formatDate(rel.relacionamento_criado)}</td>
                    <td className="py-2.5 text-gray-500 text-xs">{formatDate(rel.relacionamento_editado)}</td>
                    <td className="py-2.5 text-center">
                      {rel.relacionamento_ativo ? (
                        <button
                          onClick={() => handleDesativar(rel.code_muni)}
                          className="px-2 py-1 text-xs bg-red-100 text-red-600 hover:bg-red-200 hover:text-red-700 rounded transition-colors"
                          title="Desativar relacionamento"
                        >
                          Desativar
                        </button>
                      ) : (
                        <button
                          onClick={() => handleReativar(rel.code_muni)}
                          className="px-2 py-1 text-xs text-sky-600 hover:text-sky-700 hover:bg-sky-50 rounded transition-colors"
                          title="Reativar relacionamento"
                        >
                          Reativar
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between text-xs text-gray-500">
          <span>
            Total: {relacionamentos.filter(r => r.relacionamento_ativo).length} ativos de {relacionamentos.length} cadastrados
          </span>
          <button
            onClick={() => onClose(novosCadastrosRef.current)}
            className="px-4 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );

  return typeof window !== 'undefined' ? createPortal(modalContent, document.body) : null;
});

export default RelacionamentoModal;
