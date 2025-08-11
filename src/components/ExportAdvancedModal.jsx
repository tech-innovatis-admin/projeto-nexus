import { useState, useEffect } from 'react';
import { utils as XLSXUtils, write as XLSXWrite } from 'xlsx';

function ExportAdvancedModal({ isOpen, onClose, mapData }) {
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedMunicipalities, setSelectedMunicipalities] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allStates, setAllStates] = useState([]);
  const [allMunicipalities, setAllMunicipalities] = useState([]);

  // Colunas disponíveis para exportação
  const availableColumns = [
    { id: 'name_state', label: 'Estado', checked: true },
    { id: 'nome_municipio', label: 'Nome do Município', checked: true },
    { id: 'nome2024', label: 'Nome do Prefeito', checked: false },
    { id: 'mandato', label: 'Mandato', checked: false },
    { id: 'sigla_partido2024', label: 'Partido do Prefeito', checked: false },
    { id: 'POPULACAO_FORMAT', label: 'População', checked: false },
    { id: 'DOMICILIO_FORMAT', label: 'Domicílios Recenseados', checked: false },
    { id: 'PD_ALTERADA', label: 'Plano Diretor', checked: false },
    { id: 'PD_ANO', label: 'Plano Diretor - Ano', checked: false },
    { id: 'VALOR_PD', label: 'Plano Diretor - Valor', checked: false },
    { id: 'plano_saneamento_existe', label: 'PMSB', checked: false },
    { id: 'VALOR_PMSB', label: 'PMSB - Valor', checked: false },
    { id: 'plano_saneamento_ano', label: 'PMSB - ANO', checked: false },
    { id: 'VALOR_CTM', label: 'CTM - Valor', checked: false },
    { id: 'valor_vaat_formato', label: 'VAAT', checked: false }
  ];

  // Extrair estados e municípios dos dados
  useEffect(() => {
    if (mapData?.dados?.features) {
      const states = [...new Set(mapData.dados.features
        .map(feature => feature.properties?.name_state)
        .filter(Boolean)
        .sort()
      )];
      setAllStates(states);

      const municipalities = mapData.dados.features.map(feature => ({
        name: feature.properties?.nome_municipio || feature.properties?.municipio,
        state: feature.properties?.name_state,
        data: feature.properties
      })).filter(item => item.name && item.state);
      
      setAllMunicipalities(municipalities);
    }
  }, [mapData]);

  // Inicializar colunas selecionadas com as padrão
  useEffect(() => {
    const defaultColumns = availableColumns
      .filter(col => col.checked)
      .map(col => col.id);
    setSelectedColumns(defaultColumns);
  }, []);

  // Filtrar municípios por estados selecionados
  const filteredMunicipalities = selectedStates.length > 0
    ? allMunicipalities.filter(municipality => selectedStates.includes(municipality.state))
    : allMunicipalities;

  // Handlers
  const handleStateChange = (state, checked) => {
    if (checked) {
      setSelectedStates(prev => [...prev, state]);
    } else {
      setSelectedStates(prev => prev.filter(s => s !== state));
      // Remover municípios do estado desmarcado
      setSelectedMunicipalities(prev => 
        prev.filter(municipality => {
          const municipalityData = allMunicipalities.find(m => m.name === municipality);
          return municipalityData?.state !== state;
        })
      );
    }
  };

  const handleMunicipalityChange = (municipality, checked) => {
    if (checked) {
      setSelectedMunicipalities(prev => [...prev, municipality]);
    } else {
      setSelectedMunicipalities(prev => prev.filter(m => m !== municipality));
    }
  };

  const handleColumnChange = (columnId, checked) => {
    if (checked) {
      setSelectedColumns(prev => [...prev, columnId]);
    } else {
      setSelectedColumns(prev => prev.filter(c => c !== columnId));
    }
  };

  const handleSelectAllStates = () => {
    setSelectedStates([...allStates]);
  };

  const handleSelectAllMunicipalities = () => {
    const municipalityNames = filteredMunicipalities.map(m => m.name);
    setSelectedMunicipalities(municipalityNames);
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(availableColumns.map(col => col.id));
  };

  const handleClearSelections = () => {
    setSelectedStates([]);
    setSelectedMunicipalities([]);
    setSelectedColumns(availableColumns.filter(col => col.checked).map(col => col.id));
  };

  // Exportação avançada
  const handleAdvancedExport = async () => {
    if (selectedColumns.length === 0) {
      alert('Selecione pelo menos uma coluna para exportar.');
      return;
    }

    setIsLoading(true);
    
    try {
      // Preparar dados para exportação
      let dataToExport = [];

      if (selectedMunicipalities.length > 0) {
        // Exportar municípios específicos
        dataToExport = allMunicipalities
          .filter(municipality => selectedMunicipalities.includes(municipality.name))
          .map(municipality => municipality.data);
      } else if (selectedStates.length > 0) {
        // Exportar todos os municípios dos estados selecionados
        dataToExport = allMunicipalities
          .filter(municipality => selectedStates.includes(municipality.state))
          .map(municipality => municipality.data);
      } else {
        // Exportar todos os municípios
        dataToExport = allMunicipalities.map(municipality => municipality.data);
      }

      // Filtrar apenas as colunas selecionadas
      const filteredData = dataToExport.map(row => {
        const filteredRow = {};
        selectedColumns.forEach(columnId => {
          const columnConfig = availableColumns.find(col => col.id === columnId);
          filteredRow[columnConfig?.label || columnId] = row[columnId] || '';
        });
        return filteredRow;
      });

      // Gerar planilha Excel
      const ws = XLSXUtils.json_to_sheet(filteredData);
      const wb = XLSXUtils.book_new();
      XLSXUtils.book_append_sheet(wb, ws, 'Municípios');

      // Configurar largura das colunas
      const colWidths = selectedColumns.map(() => ({ wch: 20 }));
      ws['!cols'] = colWidths;

      // Gerar arquivo e fazer download
      const buf = XLSXWrite(wb, { type: 'array', bookType: 'xlsx' });
      const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      
      // Criar nome do arquivo
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const fileName = `export_municipios_${timestamp}.xlsx`;
      
      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      onClose();
    } catch (error) {
      console.error('Erro ao exportar:', error);
      alert('Erro ao exportar dados. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="relative flex items-center justify-center p-6 border-b border-gray-200 flex-shrink-0">
          <h2 className="text-xl font-semibold text-gray-900 w-full text-center">Exportação Avançada</h2>
          <button
            onClick={onClose}
            className="absolute right-6 text-gray-400 hover:text-red-500 transition-colors"
            aria-label="Fechar"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Estados */}
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Estados</h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-xs text-gray-600">Selecionar:</span>
                  <button
                    onClick={handleSelectAllStates}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-900 px-2 py-1 rounded border border-sky-200 hover:bg-sky-50 transition-colors min-w-[50px] inline-block"
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setSelectedStates([])}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-900 px-2 py-1 rounded border border-sky-200 hover:bg-sky-50 transition-colors min-w-[50px] inline-block"
                  >
                    Nenhum
                  </button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3 max-h-64 overflow-y-auto">
                {allStates.map(state => (
                  <label key={state} className="flex items-center py-1">
                    <input
                      type="checkbox"
                      checked={selectedStates.includes(state)}
                      onChange={(e) => handleStateChange(state, e.target.checked)}
                      className="rounded border-gray-300 mr-3"
                    />
                    <span className="text-sm text-gray-700">{state}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                {selectedStates.length} de {allStates.length} selecionados
              </p>
            </div>

            {/* Municípios */}
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Municípios</h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-xs text-gray-600">Selecionar:</span>
                  <button
                    onClick={handleSelectAllMunicipalities}
                    disabled={filteredMunicipalities.length === 0}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-900 px-2 py-1 rounded border border-sky-200 hover:bg-sky-50 transition-colors min-w-[50px] disabled:opacity-50 disabled:cursor-not-allowed inline-block"
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setSelectedMunicipalities([])}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-900 px-2 py-1 rounded border border-sky-200 hover:bg-sky-50 transition-colors min-w-[50px] inline-block"
                  >
                    Nenhum
                  </button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3 max-h-64 overflow-y-auto">
                {filteredMunicipalities.length > 0 ? (
                  filteredMunicipalities.map(municipality => (
                    <label key={`${municipality.name}-${municipality.state}`} className="flex items-center py-1">
                      <input
                        type="checkbox"
                        checked={selectedMunicipalities.includes(municipality.name)}
                        onChange={(e) => handleMunicipalityChange(municipality.name, e.target.checked)}
                        className="rounded border-gray-300 mr-3"
                      />
                      <span className="text-sm text-gray-700">{municipality.name} - {municipality.state}</span>
                    </label>
                  ))
                ) : (
                  <p className="text-sm text-gray-500 text-center py-4">
                    {selectedStates.length === 0 ? 'Selecione um estado primeiro' : 'Nenhum município encontrado'}
                  </p>
                )}
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                {selectedMunicipalities.length} de {filteredMunicipalities.length} selecionados
              </p>
            </div>

            {/* Colunas */}
            <div className="space-y-4">
              <div className="flex flex-col items-center">
                <h3 className="text-lg font-medium text-gray-900 text-center mb-2">Variáveis</h3>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <span className="text-xs text-gray-600">Selecionar:</span>
                  <button
                    onClick={handleSelectAllColumns}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-900 px-2 py-1 rounded border border-sky-200 hover:bg-sky-50 transition-colors min-w-[50px] inline-block"
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => setSelectedColumns(availableColumns.filter(col => col.checked).map(col => col.id))}
                    className="text-xs font-semibold text-sky-600 hover:text-sky-900 px-2 py-1 rounded border border-sky-200 hover:bg-sky-50 transition-colors min-w-[50px] inline-block"
                  >
                    Nenhum
                  </button>
                </div>
              </div>
              <div className="border border-gray-200 rounded-lg p-3 max-h-64 overflow-y-auto">
                {availableColumns.map(column => (
                  <label key={column.id} className="flex items-center py-1">
                    <input
                      type="checkbox"
                      checked={selectedColumns.includes(column.id)}
                      onChange={(e) => handleColumnChange(column.id, e.target.checked)}
                      className="rounded border-gray-300 mr-3"
                    />
                    <span className="text-sm text-gray-700">{column.label}</span>
                  </label>
                ))}
              </div>
              <p className="text-xs text-gray-500 text-center mt-2">
                {selectedColumns.length} de {availableColumns.length} selecionadas
              </p>
            </div>
          </div>

          {/* Resumo da seleção */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Resumo da Exportação:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Estados: {selectedStates.length === 0 ? 'Todos' : selectedStates.length}</li>
              <li>• Municípios: {selectedMunicipalities.length === 0 ? 'Todos dos estados selecionados' : selectedMunicipalities.length}</li>
              <li>• Colunas: {selectedColumns.length}</li>
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <button
            onClick={handleClearSelections}
            className="px-4 py-2 text-sm flex items-center space-x-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-md border border-gray-200 shadow-sm transition-all"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            <span>Limpar Seleções</span>
          </button>
          
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-600 hover:text-red-500 transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={handleAdvancedExport}
              disabled={selectedColumns.length === 0 || isLoading}
              className="px-6 py-2 bg-sky-600 text-white text-sm font-medium rounded-md hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
            >
              {isLoading && (
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              <span>Exportar Planilha</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ExportAdvancedModal;
