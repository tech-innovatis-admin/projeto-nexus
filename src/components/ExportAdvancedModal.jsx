import { useState, useEffect, useMemo } from 'react';
import { utils as XLSXUtils, write as XLSXWrite } from 'xlsx';
import { useUser } from '@/contexts/UserContext';

function ExportAdvancedModal({ isOpen, onClose, mapData }) {
  const { user } = useUser();
  const [selectedStates, setSelectedStates] = useState([]);
  const [selectedMunicipalities, setSelectedMunicipalities] = useState([]);
  const [selectedColumns, setSelectedColumns] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [allStates, setAllStates] = useState([]);
  const [allMunicipalities, setAllMunicipalities] = useState([]);
  const [columnFilters, setColumnFilters] = useState({});
  const [partyOptions, setPartyOptions] = useState([]);
  const [pmsbSemAnoMunicipalities, setPmsbSemAnoMunicipalities] = useState([]);
  const [showAllSubfilters, setShowAllSubfilters] = useState(false);
  const [exportFileName, setExportFileName] = useState('export_municipios');
  const [priceOptions, setPriceOptions] = useState({
    VALOR_PD: ['Personalizado'],
    VALOR_PMSB: ['Personalizado'],
    VALOR_CTM: ['Personalizado']
  });
  const hasAnySubfilters = useMemo(() => {
    return selectedColumns.some((id) => {
      const filter = columnFilters[id];
      return filter && filter.type !== 'none';
    });
  }, [selectedColumns, columnFilters]);

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
    { id: 'VALOR_PMSB', label: 'Valor - PMSB', checked: false },
    { id: 'plano_saneamento_ano', label: 'PMSB - ANO', checked: false },
    { id: 'VALOR_CTM', label: 'Valor CTM', checked: false },
    { id: 'valor_reurb_', label: 'Valor REURB', checked: false },
    { id: 'valor_vaat_formato', label: 'VAAT', checked: false },
    { id: 'PLHIS', label: 'Valor PLHIS', checked: false },
    { id: 'VALOR_DESERT_NUM', label: 'ValorPlano de Desertificação', checked: false },
    { id: 'VALOR_DEC_AMBIENTAL_NUM', label: 'valor Plano Dec. Meio Ambiente', checked: false },
    { id: 'tem_pista', label: 'Existência de Pista', checked: false },
    { id: 'alunos_iniciais', label: 'QTD de Alunos - Ensino Fundamental Inicial', checked: false },
    { id: 'alunos_finais', label: 'QTD de Alunos - Ensino Fundamental Final', checked: false },
    { id: 'alunos_iniciais_finais', label: 'QTD de Alunos - Fundamental Iniciais + Finais', checked: false },
    { id: 'alunos_medio', label: 'QTD de Alunos - Ensino Médio', checked: false },
    { id: 'educagame', label: 'Valor Educame', checked: false },
    { id: 'valor_start_iniciais_', label: 'Valor Start Lab - Fund 1', checked: false },
    { id: 'valor_start_finais_', label: 'Valor Start Lab - Fund 2', checked: false },
    { id: 'valor_start_iniciais_finais_', label: 'Valor Start Lab - Fund 1 e 2', checked: false },
    { id: 'PVA_minimo', label: 'PVA Mínimo (Procon Vai Ás Aulas)', checked: false },
    { id: 'PVA_maximo', label: 'PVA Máximo (Procon Vai Ás Aulas)', checked: false },
    { id: 'LIVRO_FUND_1', label: 'Valor Saber+ - Fundamental 1', checked: false },
    { id: 'LIVRO_FUND_2', label: 'Valor Saber+ - Fundamental 2', checked: false },
    { id: 'LIVRO_FUND_1_2', label: 'Valor Saber+ - Fundamental 1 e 2', checked: false }
  ];

  // Extrair estados e municípios dos dados (com restrições para viewers)
  useEffect(() => {
    if (!mapData?.dados?.features) return;

    const loadPermissionsAndData = async () => {
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
              console.log(`🔒 [ExportAdvancedModal] Viewer restrito detectado, aplicando filtros de permissão`);
              
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

              console.log(`🔒 [ExportAdvancedModal] Estados permitidos (UF completa):`, Array.from(allowedStates));
              console.log(`🔒 [ExportAdvancedModal] Municípios específicos permitidos:`, allowedMunicipios.size);
            }
          }
        } catch (err) {
          console.warn('Erro ao carregar permissões do viewer:', err);
        }
      }

      // Extract all data
      const statesRaw = [...new Set(mapData.dados.features
        .map(feature => feature.properties?.name_state)
        .filter(Boolean)
        .sort()
      )];

      const municipalitiesRaw = mapData.dados.features.map(feature => ({
        name: feature.properties?.nome_municipio || feature.properties?.municipio,
        state: feature.properties?.name_state,
        data: feature.properties
      })).filter(item => item.name && item.state)
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR', { sensitivity: 'base' }));
      
      // Apply filters if restricted
      let filteredStates = statesRaw;
      let filteredMunicipalities = municipalitiesRaw;

      if (isRestricted) {
        // Filter states: only show states that user has access to
        filteredStates = statesRaw.filter(state => allowedStates.has(state));

        // Filter municipalities: show only if user has access
        filteredMunicipalities = municipalitiesRaw.filter(m => {
          const hasStateAccess = allowedStates.has(m.state);
          const hasMunicipalityAccess = allowedMunicipios.has(`${m.name}|${m.state}`);
          
          // If user has full state access, all municipalities are allowed
          if (hasStateAccess) {
            // Check if this state access is from UF (not just from specific municipalities)
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

        console.log(`🔒 [ExportAdvancedModal] Dados filtrados: ${filteredStates.length} estados, ${filteredMunicipalities.length} municípios`);
      }

      setAllStates(filteredStates);
      setAllMunicipalities(filteredMunicipalities);

      // Opções de partidos (únicos) - usando os municípios filtrados
      const parties = [...new Set(filteredMunicipalities
        .map(m => m.data?.sigla_partido2024)
        .filter(Boolean)
        .sort()
      )];
      setPartyOptions(parties);

      // Municípios com PMSB = 'Sim' e sem ano definido - usando os municípios filtrados
      const municipiosPmsbSemAno = filteredMunicipalities
        .filter(m => {
          const hasPmsb = (m.data?.plano_saneamento_existe || '').toString().toLowerCase() === 'sim';
          const ano = m.data?.plano_saneamento_ano;
          const noAno = !ano || ano === 0 || ano === '0' || ano === '' || ano === null;
          return hasPmsb && noAno;
        })
        .map(m => ({ key: `${m.name} - ${m.state}`, name: m.name, state: m.state }));
      setPmsbSemAnoMunicipalities(municipiosPmsbSemAno);

      // Construir opções dinâmicas para valores de preço (VALOR_PD, VALOR_PMSB, VALOR_CTM)
      const parseBRL = (value) => {
        if (value === undefined || value === null) return null;
        const normalized = String(value)
          .replace(/[^0-9,.-]/g, '')
          .replace(/\./g, '')
          .replace(',', '.');
        const num = parseFloat(normalized);
        return Number.isNaN(num) ? null : num;
      };

      const keys = ['VALOR_PD', 'VALOR_PMSB', 'VALOR_CTM'];
      const next = {};
      keys.forEach((key) => {
        const values = filteredMunicipalities
          .map(m => m.data?.[key])
          .filter(v => v !== null && v !== undefined && String(v).trim() !== '');
        const unique = Array.from(new Set(values.map(v => String(v))));

        const numerics = [];
        const nonNumerics = [];
        unique.forEach((s) => {
          if (s.toLowerCase() === 'personalizado') return; // será inserido manualmente no início
          const n = parseBRL(s);
          if (n !== null) numerics.push({ s, n }); else nonNumerics.push(s);
        });

        numerics.sort((a, b) => a.n - b.n);
        nonNumerics.sort((a, b) => a.localeCompare(b, 'pt-BR'));
        next[key] = ['Personalizado', ...numerics.map(e => e.s), ...nonNumerics];
      });

      setPriceOptions(next);
    };

    loadPermissionsAndData();
  }, [mapData, user]);

  // Inicializar colunas selecionadas com as padrão
  useEffect(() => {
    const defaultColumns = availableColumns
      .filter(col => col.checked)
      .map(col => col.id);
    setSelectedColumns(defaultColumns);
  }, []);

  // Atualiza filtros padrão quando variáveis são marcadas/desmarcadas
  useEffect(() => {
    const nextFilters = { ...columnFilters };
    const selectedSet = new Set(selectedColumns);

    // Remover filtros de colunas não selecionadas
    Object.keys(nextFilters).forEach(key => {
      if (!selectedSet.has(key)) delete nextFilters[key];
    });

    // Adicionar filtros padrão para novas colunas
    selectedColumns.forEach(colId => {
      if (!nextFilters[colId]) {
        nextFilters[colId] = createDefaultFilter(colId);
      }
    });

    setColumnFilters(nextFilters);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedColumns]);

  // Helpers de parsing
  const toIntFromString = (value) => {
    if (value === undefined || value === null) return null;
    const onlyDigits = String(value).replace(/\D+/g, '');
    if (!onlyDigits) return null;
    return parseInt(onlyDigits, 10);
  };

  const toFloatBRL = (value) => {
    if (value === undefined || value === null) return null;
    const normalized = String(value)
      .replace(/[^0-9,.-]/g, '')
      .replace(/\./g, '')
      .replace(',', '.');
    const num = parseFloat(normalized);
    return Number.isNaN(num) ? null : num;
  };

  // Fábrica de filtros padrão
  function createDefaultFilter(columnId) {
    const numeric = { type: 'numeric', mode: 'min', min: '', max: '' };
    const boolean = { type: 'boolean', value: '' }; // '' | 'Sim' | 'Não'
    const multiSelect = { type: 'multi', values: [] };

    switch (columnId) {
      case 'POPULACAO_FORMAT':
      case 'DOMICILIO_FORMAT':
      case 'PD_ANO':
      case 'valor_vaat_formato':
      case 'alunos_iniciais':
      case 'alunos_finais':
      case 'alunos_iniciais_finais':
      case 'alunos_medio':
      case 'PLHIS':
      case 'VALOR_DESERT_NUM':
      case 'VALOR_DEC_AMBIENTAL_NUM':
      case 'educagame':
      case 'valor_start_iniciais_':
      case 'valor_start_finais_':
      case 'valor_start_iniciais_finais_':
      case 'PVA_minimo':
      case 'PVA_maximo':
      case 'LIVRO_FUND_1':
      case 'LIVRO_FUND_2':
      case 'LIVRO_FUND_1_2':
      case 'valor_reurb_':
        return { ...numeric };
      case 'plano_saneamento_ano':
        return { type: 'pmsbAno', mode: 'min', min: '', max: '', includeSemAno: false, selectedMunicipalities: [] };
      case 'sigla_partido2024':
        return { ...multiSelect };
      case 'mandato':
        return { type: 'multi', values: [] }; // '1º mandato', '2º mandato'
      case 'PD_ALTERADA':
      case 'plano_saneamento_existe':
  case 'tem_pista':
        return { ...boolean };
      case 'VALOR_PD':
      case 'VALOR_PMSB':
      case 'VALOR_CTM':
        return { ...multiSelect };
      default:
        return { type: 'none' };
    }
  }

  

  const updateFilter = (columnId, partial) => {
    setColumnFilters(prev => ({ ...prev, [columnId]: { ...prev[columnId], ...partial } }));
  };

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
        prev.filter(municipalityKey => {
          const [name, state_from_key] = municipalityKey.split('|');
          return state_from_key !== state;
        })
      );
    }
  };

  const handleMunicipalityChange = (municipalityKey, checked) => {
    if (checked) {
      setSelectedMunicipalities(prev => [...prev, municipalityKey]);
    } else {
      setSelectedMunicipalities(prev => prev.filter(m => m !== municipalityKey));
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
    const municipalityKeys = filteredMunicipalities.map(m => `${m.name}|${m.state}`);
    setSelectedMunicipalities(municipalityKeys);
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(availableColumns.map(col => col.id));
  };

  const handleClearSelections = () => {
    setSelectedStates([]);
    setSelectedMunicipalities([]);
    setSelectedColumns(availableColumns.filter(col => col.checked).map(col => col.id));
  };

  // Aplica subfiltros linha a linha
  const rowPassesFilters = (row) => {
    for (const colId of Object.keys(columnFilters)) {
      const filter = columnFilters[colId];
      if (!filter || filter.type === 'none') continue;

      // Determinar se filtro está ativo
      const isActive = (() => {
        if (filter.type === 'numeric') return filter.min !== '' || (filter.mode === 'between' && filter.max !== '');
        if (filter.type === 'pmsbAno') return filter.min !== '' || (filter.mode === 'between' && filter.max !== '') || filter.includeSemAno;
        if (filter.type === 'boolean') return filter.value === 'Sim' || filter.value === 'Não';
        if (filter.type === 'multi') return Array.isArray(filter.values) && filter.values.length > 0;
        return false;
      })();
      if (!isActive) continue;

      const value = row[colId];

      switch (colId) {
        case 'POPULACAO_FORMAT': {
          const num = toIntFromString(value);
          if (num === null) return false;
          const min = filter.min !== '' ? parseInt(filter.min, 10) : null;
          const max = filter.max !== '' ? parseInt(filter.max, 10) : null;
          if (filter.mode === 'min' && min !== null && !(num >= min)) return false;
          if (filter.mode === 'max' && min !== null && !(num <= min)) return false;
          if (filter.mode === 'equal' && min !== null && !(num === min)) return false;
          if (filter.mode === 'between' && (min !== null || max !== null)) {
            if (min !== null && num < min) return false;
            if (max !== null && num > max) return false;
          }
          break;
        }
        case 'DOMICILIO_FORMAT': {
          const num = toIntFromString(value);
          if (num === null) return false;
          const min = filter.min !== '' ? parseInt(filter.min, 10) : null;
          const max = filter.max !== '' ? parseInt(filter.max, 10) : null;
          if (filter.mode === 'min' && min !== null && !(num >= min)) return false;
          if (filter.mode === 'max' && min !== null && !(num <= min)) return false;
          if (filter.mode === 'equal' && min !== null && !(num === min)) return false;
          if (filter.mode === 'between' && (min !== null || max !== null)) {
            if (min !== null && num < min) return false;
            if (max !== null && num > max) return false;
          }
          break;
        }
        case 'valor_vaat_formato': {
          const num = toFloatBRL(value);
          if (num === null) return false;
          // Aceita valor digitado sem formatação (ex.: 45124145) e com decimal
          const min = filter.min !== '' ? parseFloat(String(filter.min).replace(/[^0-9.-]/g, '')) : null;
          const max = filter.max !== '' ? parseFloat(String(filter.max).replace(/[^0-9.-]/g, '')) : null;
          if (filter.mode === 'min' && min !== null && !(num >= min)) return false;
          if (filter.mode === 'max' && min !== null && !(num <= min)) return false;
          if (filter.mode === 'equal' && min !== null && !(num === min)) return false;
          if (filter.mode === 'between' && (min !== null || max !== null)) {
            if (min !== null && num < min) return false;
            if (max !== null && num > max) return false;
          }
          break;
        }
        case 'PD_ANO': {
          const num = toIntFromString(value);
          if (num === null) return false;
          const min = filter.min !== '' ? parseInt(filter.min, 10) : null;
          const max = filter.max !== '' ? parseInt(filter.max, 10) : null;
          if (filter.mode === 'min' && min !== null && !(num >= min)) return false;
          if (filter.mode === 'max' && min !== null && !(num <= min)) return false;
          if (filter.mode === 'equal' && min !== null && !(num === min)) return false;
          if (filter.mode === 'between' && (min !== null || max !== null)) {
            if (min !== null && num < min) return false;
            if (max !== null && num > max) return false;
          }
          break;
        }
        case 'alunos_iniciais':
        case 'alunos_finais':
        case 'alunos_iniciais_finais':
        case 'alunos_medio':
        case 'PLHIS':
        case 'VALOR_DESERT_NUM':
        case 'VALOR_DEC_AMBIENTAL_NUM':
        case 'educagame':
        case 'valor_start_iniciais_':
        case 'valor_start_finais_':
        case 'valor_start_iniciais_finais_':
        case 'PVA_minimo':
        case 'PVA_maximo':
        case 'LIVRO_FUND_1':
        case 'LIVRO_FUND_2':
        case 'LIVRO_FUND_1_2':
        case 'valor_reurb_': {
          const num = toIntFromString(value);
          if (num === null) return false;
          const min = filter.min !== '' ? parseInt(filter.min, 10) : null;
          const max = filter.max !== '' ? parseInt(filter.max, 10) : null;
          if (filter.mode === 'min' && min !== null && !(num >= min)) return false;
          if (filter.mode === 'max' && min !== null && !(num <= min)) return false;
          if (filter.mode === 'equal' && min !== null && !(num === min)) return false;
          if (filter.mode === 'between' && (min !== null || max !== null)) {
            if (min !== null && num < min) return false;
            if (max !== null && num > max) return false;
          }
          break;
        }
        case 'plano_saneamento_ano': {
          const ano = toIntFromString(value);
          const hasAno = ano !== null;
          if (hasAno) {
            const min = filter.min !== '' ? parseInt(filter.min, 10) : null;
            const max = filter.max !== '' ? parseInt(filter.max, 10) : null;
            if (filter.mode === 'min' && min !== null && !(ano >= min)) return false;
            if (filter.mode === 'max' && min !== null && !(ano <= min)) return false;
            if (filter.mode === 'equal' && min !== null && !(ano === min)) return false;
            if (filter.mode === 'between' && (min !== null || max !== null)) {
              if (min !== null && ano < min) return false;
              if (max !== null && ano > max) return false;
            }
          } else {
            // Sem ano: só passa se PMSB = 'Sim' e estiver permitido
            const hasPmsb = (row.plano_saneamento_existe || '').toString().toLowerCase() === 'sim';
            if (!hasPmsb) return false;
            if (!filter.includeSemAno) return false;
            if (Array.isArray(filter.selectedMunicipalities) && filter.selectedMunicipalities.length > 0) {
              const key = `${row.nome_municipio || row.municipio} - ${row.name_state}`;
              if (!filter.selectedMunicipalities.includes(key)) return false;
            }
          }
          break;
        }
        case 'sigla_partido2024': {
          if (!Array.isArray(filter.values) || filter.values.length === 0) break;
          const party = (value || '').toString();
          if (!filter.values.includes(party)) return false;
          break;
        }
        case 'mandato': {
          if (!Array.isArray(filter.values) || filter.values.length === 0) break;
          const mandato = (value || '').toString();
          if (!filter.values.includes(mandato)) return false;
          break;
        }
        case 'PD_ALTERADA':
  case 'plano_saneamento_existe':
  case 'tem_pista': {
          if (filter.value !== 'Sim' && filter.value !== 'Não') break;
          const normalized = (() => {
            const v = (value ?? '').toString().toLowerCase();
            if (v === 'sim' || v === 'true' || v === '1') return 'Sim';
            if (v === 'não' || v === 'nao' || v === 'false' || v === '0') return 'Não';
            return '';
          })();
          if (normalized !== filter.value) return false;
          break;
        }
        case 'VALOR_PD':
        case 'VALOR_PMSB':
        case 'VALOR_CTM': {
          if (!Array.isArray(filter.values) || filter.values.length === 0) break;
          const val = (value || '').toString();
          if (!filter.values.includes(val)) return false;
          break;
        }
        default:
          break;
      }
    }
    return true;
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
        // Exportar municípios específicos (usando chave única estado|município)
        dataToExport = allMunicipalities
          .filter(municipality => {
            const municipalityKey = `${municipality.name}|${municipality.state}`;
            return selectedMunicipalities.includes(municipalityKey);
          })
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

      // Aplicar subfiltros por variável
      const filteredBySubfilters = dataToExport.filter(row => rowPassesFilters(row));

      // Filtrar apenas as colunas selecionadas
      const filteredData = filteredBySubfilters.map(row => {
        const filteredRow = {};
        selectedColumns.forEach(columnId => {
          const columnConfig = availableColumns.find(col => col.id === columnId);
          const label = columnConfig?.label || columnId;
          let value = row[columnId] || '';
          if (columnId === 'tem_pista') {
            const v = (row[columnId] ?? '').toString().toLowerCase();
            if (v === 'sim' || v === 'true' || v === '1') value = 'Sim';
            else if (v === 'não' || v === 'nao' || v === 'false' || v === '0') value = 'Não';
            else value = '';
          }
          filteredRow[label] = value;
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
      
      // Criar nome do arquivo (personalizável pelo usuário)
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const baseNameRaw = (exportFileName || '').trim();
      const safeBaseName = baseNameRaw
        ? baseNameRaw.replace(/[\\/:*?"<>|]+/g, '_')
        : `export_municipios_${timestamp}`;
      const fileName = safeBaseName.toLowerCase().endsWith('.xlsx')
        ? safeBaseName
        : `${safeBaseName}.xlsx`;
      
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

  // Calcular o número de observações que passarão pelos filtros atuais
  const observationsCount = useMemo(() => {
    if (selectedColumns.length === 0) return 0;

    // Replicar o mesmo pipeline de filtragem usado na exportação
    let dataToFilter = [];

    if (selectedMunicipalities.length > 0) {
      // Filtrar municípios específicos
      dataToFilter = allMunicipalities
        .filter(municipality => {
          const municipalityKey = `${municipality.name}|${municipality.state}`;
          return selectedMunicipalities.includes(municipalityKey);
        })
        .map(municipality => municipality.data);
    } else if (selectedStates.length > 0) {
      // Filtrar todos os municípios dos estados selecionados
      dataToFilter = allMunicipalities
        .filter(municipality => selectedStates.includes(municipality.state))
        .map(municipality => municipality.data);
    } else {
      // Usar todos os municípios
      dataToFilter = allMunicipalities.map(municipality => municipality.data);
    }

    // Aplicar subfiltros (mesma lógica da exportação)
    const filteredBySubfilters = dataToFilter.filter(row => rowPassesFilters(row));

    return filteredBySubfilters.length;
  }, [
    selectedColumns,
    selectedMunicipalities,
    selectedStates,
    allMunicipalities,
    columnFilters,
    rowPassesFilters
  ]);

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
                  filteredMunicipalities.map(municipality => {
                    const municipalityKey = `${municipality.name}|${municipality.state}`;
                    return (
                      <label key={`${municipality.name}-${municipality.state}`} className="flex items-center py-1">
                        <input
                          type="checkbox"
                          checked={selectedMunicipalities.includes(municipalityKey)}
                          onChange={(e) => handleMunicipalityChange(municipalityKey, e.target.checked)}
                          className="rounded border-gray-300 mr-3"
                        />
                        <span className="text-sm text-gray-700">{municipality.name} - {municipality.state}</span>
                      </label>
                    );
                  })
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

          {/* Subfiltros por variável (apresentados somente para colunas selecionadas) */}
          <div className="mt-6">
            <h4 className="font-medium text-gray-900">Subfiltros por variável</h4>
            <div className="mt-2 mb-3">
              {hasAnySubfilters && (
                <button
                  onClick={() => setShowAllSubfilters(prev => !prev)}
                  className="text-xs font-semibold text-sky-600 hover:text-sky-900 px-2 py-1 rounded border border-sky-200 hover:bg-sky-50 transition-colors min-w-[50px] inline-block"
                >
                  {showAllSubfilters ? 'Contrair subfiltros' : 'Expandir subfiltros'}
                </button>
              )}
            </div>
            {hasAnySubfilters && showAllSubfilters && (
              <div className="space-y-4">
                {selectedColumns.map(colId => {
                const col = availableColumns.find(c => c.id === colId);
                const filter = columnFilters[colId];
                if (!col || !filter) return null;

                // Renderizadores
                const renderNumeric = (id, label, isCurrency = false, hint = '') => (
                  <div key={id} className="border border-gray-200 rounded-md p-3">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-sm font-medium text-gray-800">{label}</span>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600">Filtros</label>
                        <select
                          value={filter.mode}
                          onChange={(e) => updateFilter(id, { mode: e.target.value })}
                          className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-500"
                        >
                          <option value="min">Mínimo</option>
                          <option value="equal">Igual</option>
                          <option value="max">Máximo</option>
                          <option value="between">Entre</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(() => { const placeholder1 =
                          filter.mode === 'max'
                            ? (isCurrency ? 'máx. (R$)' : 'máx.')
                            : filter.mode === 'equal'
                              ? (isCurrency ? 'valor (R$)' : 'valor')
                              : (isCurrency ? 'mín. (R$)' : 'mín.');
                        return null; })()}
                      {(filter.mode === 'min' || filter.mode === 'equal' || filter.mode === 'max' || filter.mode === 'between') && (
                        <input
                          type="number"
                          placeholder={
                            filter.mode === 'max'
                              ? (isCurrency ? 'máx. (R$)' : 'máx.')
                              : filter.mode === 'equal'
                                ? (isCurrency ? 'valor (R$)' : 'valor')
                                : (isCurrency ? 'mín. (R$)' : 'mín.')
                          }
                          value={filter.min}
                          onChange={(e) => updateFilter(id, { min: e.target.value })}
                          className="w-40 text-sm border border-gray-200 rounded px-2 py-1 text-gray-500"
                        />
                      )}
                      {filter.mode === 'between' && (
                        <input
                          type="number"
                          placeholder={isCurrency ? 'máx. (R$)' : 'máx.'}
                          value={filter.max}
                          onChange={(e) => updateFilter(id, { max: e.target.value })}
                          className="w-40 text-sm border border-gray-200 rounded px-2 py-1 text-gray-500"
                        />
                      )}
                    </div>
                    {hint && <p className="mt-1 text-[11px] text-gray-500">{hint}</p>}
                  </div>
                );

                const renderBoolean = (id, label) => (
                  <div key={id} className="border border-gray-200 rounded-md p-3">
                    <span className="text-sm font-medium text-gray-800">{label}</span>
                    <div className="mt-2 flex items-center gap-4 text-sm">
                      <label className="flex items-center gap-1">
                        <input type="radio" name={`bool-${id}`} checked={filter.value === 'Sim'} onChange={() => updateFilter(id, { value: 'Sim' })} />
                        <span className="text-gray-700">Sim</span>
                      </label>
                      <label className="flex items-center gap-1">
                        <input type="radio" name={`bool-${id}`} checked={filter.value === 'Não'} onChange={() => updateFilter(id, { value: 'Não' })} />
                        <span className="text-gray-700">Não</span>
                      </label>
                      <button className="ml-2 text-xs text-sky-700" onClick={() => updateFilter(id, { value: '' })}>Limpar</button>
                    </div>
                  </div>
                );

                const renderMultiSelect = (id, label, options = []) => (
                  <div key={id} className="border border-gray-200 rounded-md p-3">
                    <span className="text-sm font-medium text-gray-800">{label}</span>
                    <div className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-y-1">
                      {options.map(opt => (
                        <label key={opt} className="text-sm text-gray-700 flex items-center gap-2">
                          <input
                            type="checkbox"
                            checked={filter.values?.includes(opt)}
                            onChange={(e) => {
                              const next = new Set(filter.values || []);
                              if (e.target.checked) next.add(opt); else next.delete(opt);
                              updateFilter(id, { values: Array.from(next) });
                            }}
                          />
                          <span>{opt}</span>
                        </label>
                      ))}
                    </div>
                    <button className="mt-2 text-xs text-sky-700" onClick={() => updateFilter(id, { values: [] })}>Limpar</button>
                  </div>
                );

                const renderPmsbAno = (id) => (
                  <div key={id} className="border border-gray-200 rounded-md p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-800">PMSB - ANO</span>
                      <div className="flex items-center gap-2">
                        <label className="text-xs text-gray-600">Filtros</label>
                        <select
                          value={filter.mode}
                          onChange={(e) => updateFilter(id, { mode: e.target.value })}
                          className="text-xs border border-gray-200 rounded px-2 py-1 text-gray-500"
                        >
                          <option value="min">Mínimo</option>
                          <option value="equal">Igual</option>
                          <option value="max">Máximo</option>
                          <option value="between">Entre</option>
                        </select>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {(filter.mode === 'min' || filter.mode === 'equal' || filter.mode === 'max' || filter.mode === 'between') && (
                        <input
                          type="number"
                          placeholder={
                            filter.mode === 'max'
                              ? 'máx. (ano)'
                              : filter.mode === 'equal'
                                ? 'ano'
                                : 'mín. (ano)'
                          }
                          value={filter.min}
                          onChange={(e) => updateFilter(id, { min: e.target.value })}
                          className="w-40 text-sm border border-gray-200 rounded px-2 py-1 text-gray-500"
                        />
                      )}
                      {filter.mode === 'between' && (
                        <input type="number" placeholder="máx. (ano)" value={filter.max} onChange={(e) => updateFilter(id, { max: e.target.value })} className="w-40 text-sm border border-gray-200 rounded px-2 py-1 text-gray-500" />
                      )}
                    </div>
                    <div className="pt-2 border-t">
                      <label className="flex items-center text-gray-500 gap-2 text-sm">
                        <input type="checkbox" checked={filter.includeSemAno} onChange={(e) => updateFilter(id, { includeSemAno: e.target.checked })} />
                        <span>Incluir municípios com PMSB = "Sim" sem ano</span>
                      </label>
                      {filter.includeSemAno && (
                        <div className="mt-2">
                          <p className="text-xs text-gray-600 mb-1">Selecionar municípios (opcional)</p>
                          <div className="max-h-32 overflow-y-auto border rounded p-2">
                            {pmsbSemAnoMunicipalities.length === 0 ? (
                              <p className="text-xs text-gray-500">Nenhum município com PMSB sem ano encontrado</p>
                            ) : (
                              pmsbSemAnoMunicipalities.map(m => (
                                <label key={m.key} className="flex items-center gap-2 text-sm py-0.5">
                                  <input
                                    type="checkbox"
                                    checked={filter.selectedMunicipalities?.includes(m.key)}
                                    onChange={(e) => {
                                      const next = new Set(filter.selectedMunicipalities || []);
                                      if (e.target.checked) next.add(m.key); else next.delete(m.key);
                                      updateFilter(id, { selectedMunicipalities: Array.from(next) });
                                    }}
                                  />
                                  <span>{m.key}</span>
                                </label>
                              ))
                            )}
                          </div>
                          <button className="mt-2 text-xs text-sky-700" onClick={() => updateFilter(id, { selectedMunicipalities: [] })}>Limpar seleção</button>
                        </div>
                      )}
                    </div>
                  </div>
                );

                // Escolher UI conforme coluna
                if (colId === 'POPULACAO_FORMAT') return renderNumeric(colId, 'População', false, 'O valor no dataset está como string (ex.: 21.558 hab.). Apenas a parte numérica é considerada, como "21558".');
                if (colId === 'DOMICILIO_FORMAT') return renderNumeric(colId, 'Domicílios Recenseados', false, 'Valor no formato string (ex.: 44.157). Apenas números são considerados, como "44157".');
                if (colId === 'valor_vaat_formato') return renderNumeric(colId, 'VAAT (R$)', true, 'Valor no formato BRL (ex.: R$ 582.330,00). Informe números simples.');
                if (colId === 'PD_ANO') return renderNumeric(colId, 'Plano Diretor - Ano');
                if (colId === 'alunos_iniciais') return renderNumeric(colId, 'Alunos - Ensino Fundamental Inicial', false, 'Quantidade de alunos no ensino fundamental inicial (ex.: 4785).');
                if (colId === 'alunos_finais') return renderNumeric(colId, 'Alunos - Ensino Fundamental Final', false, 'Quantidade de alunos no ensino fundamental final (ex.: 3241).');
                if (colId === 'alunos_iniciais_finais') return renderNumeric(colId, 'Alunos - Fundamental Iniciais + Finais', false, 'Quantidade total de alunos nos anos iniciais e finais do fundamental (ex.: 8026).');
                if (colId === 'alunos_medio') return renderNumeric(colId, 'Alunos - Ensino Médio', false, 'Quantidade de alunos no ensino médio (ex.: 2156).');
                if (colId === 'PLHIS') return renderNumeric(colId, 'PLHIS', false, 'Valor do produto PLHIS (ex.: 4785).');
                if (colId === 'VALOR_DESERT_NUM') return renderNumeric(colId, 'Plano de Desertificação', false, 'Valor do Plano de Desertificação (ex.: 4785).');
                if (colId === 'VALOR_DEC_AMBIENTAL_NUM') return renderNumeric(colId, 'Plano Dec. Meio Ambiente', false, 'Valor do Plano Dec. Meio Ambiente (ex.: 4785).');
                if (colId === 'educagame') return renderNumeric(colId, 'Educame', false, 'Valor do produto Educame (ex.: 4785).');
                if (colId === 'valor_start_iniciais_') return renderNumeric(colId, 'Start Lab - Fund 1', false, 'Valor do Start Lab para Fundamental 1 (ex.: 4785).');
                if (colId === 'valor_start_finais_') return renderNumeric(colId, 'Start Lab - Fund 2', false, 'Valor do Start Lab para Fundamental 2 (ex.: 4785).');
                if (colId === 'valor_start_iniciais_finais_') return renderNumeric(colId, 'Start Lab - Fund 1 e 2', false, 'Valor do Start Lab para Fundamental 1 e 2 (ex.: 4785).');
                if (colId === 'PVA_minimo') return renderNumeric(colId, 'PVA Mínimo (Procon Vai Ás Aulas)', false, 'Valor mínimo do produto PVA (ex.: 4785).');
                if (colId === 'PVA_maximo') return renderNumeric(colId, 'PVA Máximo (Procon Vai Ás Aulas)', false, 'Valor máximo do produto PVA (ex.: 4785).');
                if (colId === 'LIVRO_FUND_1') return renderNumeric(colId, 'Livros - Fundamental 1', false, 'Valor do envio de livros do Fundamental 1 (ex.: 4785).');
                if (colId === 'LIVRO_FUND_2') return renderNumeric(colId, 'Livros - Fundamental 2', false, 'Valor do envio de livros do Fundamental 2 (ex.: 4785).');
                if (colId === 'LIVRO_FUND_1_2') return renderNumeric(colId, 'Livros - Fundamental 1 e 2', false, 'Valor do envio de livros do Fundamental 1 e 2 (ex.: 4785).');
                if (colId === 'valor_reurb_') return renderNumeric(colId, 'REURB', false, 'Valor do produto REURB (ex.: 4785).');
                if (colId === 'plano_saneamento_ano') return renderPmsbAno(colId);
                if (colId === 'sigla_partido2024') return renderMultiSelect(colId, 'Partido', partyOptions);
                if (colId === 'mandato') return renderMultiSelect(colId, 'Mandato', ['1º mandato', '2º mandato']);
                if (colId === 'PD_ALTERADA') return renderBoolean(colId, 'Plano Diretor');
                if (colId === 'plano_saneamento_existe') return renderBoolean(colId, 'PMSB');
                if (colId === 'tem_pista') return renderBoolean(colId, 'Tem pista');
                if (colId === 'VALOR_PD') return renderMultiSelect(colId, 'Plano Diretor - Valor', priceOptions.VALOR_PD || ['Personalizado']);
                if (colId === 'VALOR_PMSB') return renderMultiSelect(colId, 'PMSB - Valor', priceOptions.VALOR_PMSB || ['Personalizado']);
                if (colId === 'VALOR_CTM') return renderMultiSelect(colId, 'CTM - Valor', priceOptions.VALOR_CTM || ['Personalizado']);
                return null;
              })}
              </div>
            )}
          </div>

          {/* Resumo da seleção */}
          <div className="mt-6 p-4 bg-gray-50 rounded-lg">
            <h4 className="font-medium text-gray-900 mb-2">Resumo da Exportação:</h4>
            <ul className="text-sm text-gray-700 space-y-1">
              <li>• Estados: {selectedStates.length === 0 ? 'Todos' : selectedStates.length}</li>
              <li>• Municípios: {selectedMunicipalities.length === 0 ? 'Todos dos estados selecionados' : selectedMunicipalities.length}</li>
              <li>• Colunas: {selectedColumns.length}</li>
              <li>• Observações a exportar: {observationsCount.toLocaleString('pt-BR')}</li>
            </ul>
            {observationsCount === 0 && (
              <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                <p className="text-sm text-red-700">
                  ⚠️ Nenhum município corresponde aos filtros aplicados.
                </p>
              </div>
            )}
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
                className="w-full max-w-sm text-sm border border-gray-300 rounded px-3 py-2 text-gray-700"
              />
              <span className="text-xs text-gray-700">.xlsx</span>
            </div>
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
              disabled={selectedColumns.length === 0 || isLoading || observationsCount === 0}
              title={observationsCount === 0 ? "Não há dados que correspondam aos filtros selecionados." : ""}
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
