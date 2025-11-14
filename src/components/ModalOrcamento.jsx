import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { generateBudgetPDF, resolveMunicipioNome, estadoParaUF, sanitizeFileName, mergePdfPages } from '@/utils/pdfOrcamento';
import { useUser } from '../contexts/UserContext';

function ModalOrcamento({ isOpen, onClose, mapData }) {
  const { user } = useUser();
  const [allStates, setAllStates] = useState([]);
  const [allMunicipalities, setAllMunicipalities] = useState([]);
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedMunicipalities, setSelectedMunicipalities] = useState([]); // keys: name|state
  const [searchState, setSearchState] = useState('');
  const [searchMunicipio, setSearchMunicipio] = useState('');
  const [mode, setMode] = useState('merged'); // 'merged' | 'zip'
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0, label: '' });
  const [exportFileName, setExportFileName] = useState(`orcamentos_municipios_${new Date().toISOString().slice(0,10)}`);

  // Função helper para formatar informações do usuário nos logs
  const formatUserInfo = (user) => {
    if (!user) return "Usuário não identificado";
    const name = user.name || user.username || `ID:${user.id}`;
    return `${name}${user.role ? ` (${user.role})` : ''}`;
  };

  const userInfo = formatUserInfo(user);

  // Load universe from mapData
  useEffect(() => {
    if (!isOpen) return;
    
    const loadPermissionsAndData = async () => {
      try {
        let allowedStates = new Set();
        let allowedMunicipios = new Set(); // Set of "municipio|state" keys
        let isRestricted = false;

        // Check if user is a restricted viewer
        if (user?.role && String(user.role).toLowerCase() === 'viewer') {
          try {
            const resp = await fetch('/api/municipios/permitidos', { credentials: 'same-origin' });
            if (resp.ok) {
              const data = await resp.json();
              
              if (!data.fullAccess) {
                isRestricted = true;
                console.log(`🔒 [ModalOrcamento] ${userInfo} - Viewer restrito detectado, aplicando filtros de permissão`);
                
                // Process allowed states (UFs with full access)
                if (Array.isArray(data.estados)) {
                  data.estados.forEach(e => {
                    if (e?.uf_name) {
                      allowedStates.add(e.uf_name);
                    }
                  });
                }
                
                // Process allowed specific municipalities
                if (Array.isArray(data.municipios)) {
                  data.municipios.forEach(m => {
                    if (m?.municipio && m?.name_state) {
                      allowedMunicipios.add(`${m.municipio}|${m.name_state}`);
                      // Also add the state to display in dropdown
                      allowedStates.add(m.name_state);
                    }
                  });
                }

                console.log(`🔒 [ModalOrcamento] ${userInfo} - Estados permitidos (UF completa):`, Array.from(allowedStates));
                console.log(`🔒 [ModalOrcamento] ${userInfo} - Municípios específicos permitidos:`, allowedMunicipios.size);
              }
            }
          } catch (err) {
            console.warn('Erro ao carregar permissões do viewer:', err);
          }
        }

        // Load all data
        const allStatesRaw = [...new Set((mapData?.dados?.features || [])
          .map(f => f?.properties?.name_state)
          .filter(Boolean))].sort();
        
        const allMunicipalitiesRaw = (mapData?.dados?.features || []).map(f => {
          const props = f?.properties || {};
          const name = props?.nome_municipio || props?.municipio;
          const state = props?.name_state;
          return name && state ? ({ name, state, data: props }) : null;
        }).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));

        // Apply filters if restricted
        let filteredStates = allStatesRaw;
        let filteredMunicipalities = allMunicipalitiesRaw;

        if (isRestricted) {
          // Filter states: only show states that user has access to
          filteredStates = allStatesRaw.filter(state => allowedStates.has(state));

          // Filter municipalities: show only if:
          // 1. User has full access to the state (UF) OR
          // 2. User has specific access to the municipality
          filteredMunicipalities = allMunicipalitiesRaw.filter(m => {
            const hasStateAccess = allowedStates.has(m.state);
            const hasMunicipalityAccess = allowedMunicipios.has(`${m.name}|${m.state}`);
            
            // If user has full state access, all municipalities are allowed
            if (hasStateAccess) {
              // Check if this state access is from UF (not just from specific municipalities)
              // This requires checking if at least one municipio from this state is in allowedMunicipios
              // If no specific municipalities from this state, it means full UF access
              const specificMunicipalitiesFromState = Array.from(allowedMunicipios)
                .filter(key => key.endsWith(`|${m.state}`));
              
              // If there are no specific municipalities, it's full UF access
              if (specificMunicipalitiesFromState.length === 0) {
                return true;
              }
            }
            
            // Otherwise, only allow if specific municipality is granted
            return hasMunicipalityAccess;
          });

          console.log(`🔒 [ModalOrcamento] ${userInfo} - Dados filtrados: ${filteredStates.length} estados, ${filteredMunicipalities.length} municípios (de ${allStatesRaw.length} estados e ${allMunicipalitiesRaw.length} municípios totais)`);
        }

        setAllStates(filteredStates);
        setAllMunicipalities(filteredMunicipalities);

        console.log(`📤 [ModalOrcamento] ${userInfo} - Modal de exportação aberto`);
        console.log(`📤 [ModalOrcamento] ${userInfo} - Dados carregados: ${filteredStates.length} estados, ${filteredMunicipalities.length} municípios`);
      } catch (e) {
        console.warn('Erro ao montar universo de estados/municípios:', e);
      }
    };

    loadPermissionsAndData();
  }, [isOpen, mapData, userInfo, user]);

  const filteredStates = useMemo(() => {
    const q = searchState.trim().toLowerCase();
    if (!q) return allStates;
    return allStates.filter(s => s.toLowerCase().includes(q));
  }, [searchState, allStates]);

  const filteredMunicipalities = useMemo(() => {
    const base = selectedStates.length > 0
      ? allMunicipalities.filter(m => selectedStates.includes(m.state))
      : allMunicipalities;
    const q = searchMunicipio.trim().toLowerCase();
    if (!q) return base;
    return base.filter(m => m.name.toLowerCase().includes(q));
  }, [selectedStates, allMunicipalities, searchMunicipio]);

  const municipalityKey = (m) => `${m.name}|${m.state}`;

  const buildExportSet = () => {
    // 1) if municipalities marked -> use those
    if (selectedMunicipalities.length > 0) {
      const setKeys = new Set(selectedMunicipalities);
      return allMunicipalities.filter(m => setKeys.has(municipalityKey(m)));
    }
    // 2) else if states marked -> all municipalities from those states
    if (selectedStates.length > 0) {
      return allMunicipalities.filter(m => selectedStates.includes(m.state));
    }
    // 3) else -> all
    return allMunicipalities;
  };

  const exportNow = async () => {
    const targets = buildExportSet();
    if (!targets || targets.length === 0) {
      console.log(`📤 [ModalOrcamento] ${userInfo} - Tentativa de exportação sem municípios selecionados`);
      alert('Nenhum município encontrado para exportação.');
      return;
    }

    // Log detalhado dos filtros aplicados
    const filtrosAplicados = [];
    if (selectedStates.length > 0) {
      filtrosAplicados.push(`Estados: ${selectedStates.join(', ')}`);
    }
    if (selectedMunicipalities.length > 0) {
      const municipioNomes = selectedMunicipalities.map(key => {
        const [name] = key.split('|');
        return name;
      });
      filtrosAplicados.push(`Municípios específicos: ${municipioNomes.slice(0, 3).join(', ')}${municipioNomes.length > 3 ? ` (+${municipioNomes.length - 3} outros)` : ''}`);
    }
    if (filtrosAplicados.length === 0) {
      filtrosAplicados.push('Todos os municípios');
    }

    console.log(`📤 [ModalOrcamento] ${userInfo} - Iniciando exportação em massa`);
    console.log(`📤 [ModalOrcamento] ${userInfo} - Filtros aplicados: ${filtrosAplicados.join(' | ')}`);
    console.log(`📤 [ModalOrcamento] ${userInfo} - Total de municípios: ${targets.length}`);
    console.log(`📤 [ModalOrcamento] ${userInfo} - Modo: ${mode === 'merged' ? 'PDF único (mesclado)' : 'ZIP (arquivos separados)'}`);
    console.log(`📤 [ModalOrcamento] ${userInfo} - Nome do arquivo: ${exportFileName || 'orcamentos_municipios_' + new Date().toISOString().slice(0,10)}`);

    setIsExporting(true);
    setProgress({ current: 0, total: targets.length, label: '' });

    try {
      const chunkSize = 15;
      const pdfBuffers = [];
      const zip = new JSZip();

      for (let i = 0; i < targets.length; i += chunkSize) {
        const chunk = targets.slice(i, i + chunkSize);
        await Promise.all(chunk.map(async (m, idx) => {
          const props = m.data || {};
          // Map fallback values similar to ExportMenu usage
          const cityProps = {
            ...props,
            municipio: resolveMunicipioNome(props),
            nome: resolveMunicipioNome(props),
            name_state: props?.name_state,
            VALOR_PD: props?.VALOR_PD,
            VALOR_CTM: props?.VALOR_CTM,
            VALOR_PMSB: props?.VALOR_PMSB,
          };
          const { bytes, fileName } = await generateBudgetPDF(cityProps);
          if (mode === 'zip') {
            zip.file(fileName, bytes);
          } else {
            pdfBuffers.push(bytes);
          }
          const currentIndex = i + idx + 1;
          setProgress({ current: currentIndex, total: targets.length, label: `${m.name} - ${m.state}` });
        }));
        // Yield to UI
        await new Promise(r => setTimeout(r, 0));
      }

      if (mode === 'zip') {
        const finalFileName = `${exportFileName || `orcamentos_municipios_${new Date().toISOString().slice(0,10)}`}.zip`;
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`✅ [ModalOrcamento] ${userInfo} - Exportação ZIP concluída com sucesso: "${finalFileName}" (${targets.length} municípios)`);
      } else {
        const finalFileName = `${exportFileName || `orcamentos_municipios_${new Date().toISOString().slice(0,10)}`}.pdf`;
        const mergedBytes = await mergePdfPages(pdfBuffers);
        const blob = new Blob([mergedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = finalFileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        console.log(`✅ [ModalOrcamento] ${userInfo} - Exportação PDF mesclado concluída com sucesso: "${finalFileName}" (${targets.length} municípios, ${pdfBuffers.length} páginas)`);
      }

      onClose();
    } catch (e) {
      console.error(`❌ [ModalOrcamento] ${userInfo} - Erro na exportação em massa:`, e);
      console.log(`❌ [ModalOrcamento] ${userInfo} - Exportação falhou após processar ${progress.current}/${targets.length} municípios`);
      alert('Erro ao gerar orçamentos. Verifique o template e tente novamente.');
    } finally {
      setIsExporting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-5xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative flex items-center justify-center p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 w-full text-center">Exportar Orçamento</h2>
          <button
            onClick={() => {
              console.log(`📤 [ModalOrcamento] ${userInfo} - Modal fechado (botão X)`);
              onClose();
            }}
            className="absolute right-4 top-4 text-gray-500 hover:text-gray-700"
            aria-label="Fechar"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" /></svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 md:p-6 overflow-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Estados */}
            <div>
              <div className="border border-gray-200 rounded-md">
                <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between relative">
                  <div className="absolute inset-x-0 text-center">
                    <span className="font-medium text-gray-800">Estados</span>
                  </div>
                  <div className="invisible">
                    <span className="font-medium text-gray-800">Estados</span>
                  </div>
                  <div className="space-x-2 z-10">
                    <button className="text-xs font-semibold text-sky-600 hover:text-sky-900 px-2 py-1 rounded border border-sky-200 hover:bg-sky-50 transition-colors min-w-[50px] inline-block" onClick={() => {
                      setSelectedStates([...allStates]);
                      console.log(`📤 [ModalOrcamento] ${userInfo} - Selecionou todos os estados (${allStates.length})`);
                    }}>Todos</button>
                    <button className="text-xs font-semibold text-sky-600 hover:text-sky-900 px-2 py-1 rounded border border-sky-200 hover:bg-sky-50 transition-colors min-w-[50px] inline-block" onClick={() => {
                      setSelectedStates([]);
                      console.log(`📤 [ModalOrcamento] ${userInfo} - Desmarcou todos os estados`);
                    }}>Nenhum</button>
                  </div>
                </div>
                <div className="p-3">
                  <input
                    type="text"
                    placeholder="Buscar estado..."
                    value={searchState}
                    onChange={(e) => setSearchState(e.target.value)}
                    className="text-gray-700 w-full border border-gray-300 rounded px-2 py-1 mb-2 text-sm"
                  />
                  <div className="max-h-64 overflow-auto space-y-1 tex-sm text-gray-700">
                    {filteredStates.map((st) => (
                      <label key={st} className="flex items-center gap-2 text-sm">
                        <input
                          type="checkbox"
                          checked={selectedStates.includes(st)}
                          onChange={(e) => {
                            if (e.target.checked) setSelectedStates(prev => [...prev, st]);
                            else setSelectedStates(prev => prev.filter(s => s !== st));
                          }}
                        />
                        <span className="text-sm text-gray-700">{st}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {selectedStates.length} de {allStates.length} selecionados
              </p>
            </div>

            {/* Municípios */}
            <div>
              <div className="border border-gray-200 rounded-md">
                <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between relative">
                  <div className="absolute inset-x-0 text-center">
                    <span className="font-medium text-gray-800">Municípios</span>
                  </div>
                  <div className="invisible">
                    <span className="font-medium text-gray-800">Municípios</span>
                  </div>
                  <div className="space-x-2 z-10">
                    <button className="text-xs font-semibold text-sky-600 hover:text-sky-900 px-2 py-1 rounded border border-sky-200 hover:bg-sky-50 transition-colors min-w-[50px] inline-block" onClick={() => {
                      const allKeys = filteredMunicipalities.map(m => municipalityKey(m));
                      setSelectedMunicipalities(allKeys);
                      console.log(`📤 [ModalOrcamento] ${userInfo} - Selecionou todos os municípios visíveis (${allKeys.length})`);
                    }}>Todos</button>
                    <button className="text-xs font-semibold text-sky-600 hover:text-sky-900 px-2 py-1 rounded border border-sky-200 hover:bg-sky-50 transition-colors min-w-[50px] inline-block" onClick={() => {
                      setSelectedMunicipalities([]);
                      console.log(`📤 [ModalOrcamento] ${userInfo} - Desmarcou todos os municípios`);
                    }}>Nenhum</button>
                  </div>
                </div>
                <div className="p-3">
                  <input
                    type="text"
                    placeholder="Buscar município..."
                    value={searchMunicipio}
                    onChange={(e) => setSearchMunicipio(e.target.value)}
                    className="text-gray-700 w-full border border-gray-300 rounded px-2 py-1 mb-2 text-sm"
                  />
                  <div className="max-h-64 overflow-auto space-y-1 text-sm text-gray-700">
                    {filteredMunicipalities.map((m) => {
                      const key = municipalityKey(m);
                      return (
                        <label key={key} className="text-gray-700 flex items-center gap-2 text-sm">
                          <input
                            type="checkbox"
                            checked={selectedMunicipalities.includes(key)}
                            onChange={(e) => {
                              if (e.target.checked) setSelectedMunicipalities(prev => [...prev, key]);
                              else setSelectedMunicipalities(prev => prev.filter(x => x !== key));
                            }}
                          />
                          <span className="text-sm text-gray-700">{m.name} - {m.state}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-2 text-center">
                {selectedMunicipalities.length} de {filteredMunicipalities.length} selecionados
              </p>
            </div>
          </div>

          {/* Nome do arquivo */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-800 mb-1">Nome do arquivo</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={exportFileName}
                onChange={(e) => {
                  const newName = e.target.value;
                  setExportFileName(newName);
                  if (newName.trim()) {
                    console.log(`📤 [ModalOrcamento] ${userInfo} - Nome do arquivo alterado para: "${newName}"`);
                  }
                }}
                placeholder="ex.: minha_exportacao"
                className="w-full max-w-sm text-sm border-gray-300 rounded px-3 py-2 text-gray-700"
              />
              <span className="text-xs text-gray-500">{mode === 'merged' ? '.pdf' : '.zip'}</span>
            </div>
          </div>

          {/* Footer controls */}
          <div className="mt-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <label className="text-black flex items-center gap-2 text-sm">
                <input type="radio" name="mode" value="merged" checked={mode === 'merged'} onChange={() => {
                  setMode('merged');
                  console.log(`📤 [ModalOrcamento] ${userInfo} - Alterou modo para: PDF mesclado`);
                }} />
                <span>PDF</span>
              </label>
              <label className="text-black flex items-center gap-2 text-sm">
                <input type="radio" name="mode" value="zip" checked={mode === 'zip'} onChange={() => {
                  setMode('zip');
                  console.log(`📤 [ModalOrcamento] ${userInfo} - Alterou modo para: ZIP (arquivos separados)`);
                }} />
                <span>ZIP</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  console.log(`📤 [ModalOrcamento] ${userInfo} - Modal fechado (botão Cancelar)`);
                  onClose();
                }}
                className="px-4 py-2 rounded border border-gray-300 text-gray-700 hover:bg-gray-50"
                disabled={isExporting}
              >Cancelar</button>
              <button
                onClick={exportNow}
                className="px-6 py-2 bg-sky-600 text-white text-sm font-medium rounded-md hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                disabled={isExporting}
              >{isExporting ? 'Gerando...' : 'Exportar'}</button>
            </div>
          </div>

          {isExporting && (
            <div className="mt-3 text-sm text-gray-700">
              Gerando: <span className="font-medium">{progress.label}</span> ({progress.current}/{progress.total})
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ModalOrcamento;
