import { useEffect, useMemo, useState } from 'react';
import JSZip from 'jszip';
import { generateBudgetPDF, resolveMunicipioNome, estadoParaUF, sanitizeFileName, mergePdfPages } from '@/utils/pdfOrcamento';

function ModalOrcamento({ isOpen, onClose, mapData }) {
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

  // Load universe from mapData
  useEffect(() => {
    if (!isOpen) return;
    try {
      const states = [...new Set((mapData?.dados?.features || [])
        .map(f => f?.properties?.name_state)
        .filter(Boolean))].sort();
      setAllStates(states);

      const municipalities = (mapData?.dados?.features || []).map(f => {
        const props = f?.properties || {};
        const name = props?.nome_municipio || props?.municipio;
        const state = props?.name_state;
        return name && state ? ({ name, state, data: props }) : null;
      }).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
      setAllMunicipalities(municipalities);
    } catch (e) {
      console.warn('Erro ao montar universo de estados/municípios:', e);
    }
  }, [isOpen, mapData]);

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
      alert('Nenhum município encontrado para exportação.');
      return;
    }
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
        const blob = await zip.generateAsync({ type: 'blob' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportFileName || `orcamentos_municipios_${new Date().toISOString().slice(0,10)}`}.zip`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      } else {
        const mergedBytes = await mergePdfPages(pdfBuffers);
        const blob = new Blob([mergedBytes], { type: 'application/pdf' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `${exportFileName || `orcamentos_municipios_${new Date().toISOString().slice(0,10)}`}.pdf`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }

      onClose();
    } catch (e) {
      console.error('Erro na exportação em massa:', e);
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
            onClick={onClose}
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
            <div className="border border-gray-200 rounded-md">
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between relative">
                <div className="absolute inset-x-0 text-center">
                  <span className="font-medium text-gray-800">Estados</span>
                </div>
                <div className="invisible">
                  <span className="font-medium text-gray-800">Estados</span>
                </div>
                <div className="space-x-2 z-10">
                  <button className="text-xs font-semibold text-sky-600 hover:text-sky-900 px-2 py-1 rounded border border-sky-200 hover:bg-sky-50 transition-colors min-w-[50px] inline-block" onClick={() => setSelectedStates([...allStates])}>Todos</button>
                  <button className="text-xs font-semibold text-sky-600 hover:text-sky-900 px-2 py-1 rounded border border-sky-200 hover:bg-sky-50 transition-colors min-w-[50px] inline-block" onClick={() => setSelectedStates([])}>Nenhum</button>
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

            {/* Municípios */}
            <div className="border border-gray-200 rounded-md">
              <div className="px-3 py-2 border-b border-gray-200 bg-gray-50 flex items-center justify-between relative">
                <div className="absolute inset-x-0 text-center">
                  <span className="font-medium text-gray-800">Municípios</span>
                </div>
                <div className="invisible">
                  <span className="font-medium text-gray-800">Municípios</span>
                </div>
                <div className="space-x-2 z-10">
                  <button className="text-xs font-semibold text-sky-600 hover:text-sky-900 px-2 py-1 rounded border border-sky-200 hover:bg-sky-50 transition-colors min-w-[50px] inline-block" onClick={() => setSelectedMunicipalities(filteredMunicipalities.map(m => municipalityKey(m)))}>Todos</button>
                  <button className="text-xs font-semibold text-sky-600 hover:text-sky-900 px-2 py-1 rounded border border-sky-200 hover:bg-sky-50 transition-colors min-w-[50px] inline-block" onClick={() => setSelectedMunicipalities([])}>Nenhum</button>
                </div>
              </div>
              <div className="p-3">
                <input
                  type="text-black"
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
          </div>

          {/* Nome do arquivo */}
          <div className="mt-4">
            <label className="block text-sm font-medium text-gray-800 mb-1">Nome do arquivo</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={exportFileName}
                onChange={(e) => setExportFileName(e.target.value)}
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
                <input type="radio" name="mode" value="merged" checked={mode === 'merged'} onChange={() => setMode('merged')} />
                <span>PDF único (mesclado)</span>
              </label>
              <label className="text-black flex items-center gap-2 text-sm">
                <input type="radio" name="mode" value="zip" checked={mode === 'zip'} onChange={() => setMode('zip')} />
                <span>ZIP (múltiplos PDFs)</span>
              </label>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={onClose}
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
