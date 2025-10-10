// Controle preventivo de custos para Google Maps API
// Implementa Kill Switch e limites diários de requisições

interface ApiLimits {
  routes: number;
  geocode: number;
}

interface DailyCounters {
  routes: number;
  geocode: number;
  date: string; // Formato YYYY-MM-DD
}

// Contadores em memória (reiniciam com o servidor)
let dailyCounters: DailyCounters = {
  routes: 0,
  geocode: 0,
  date: new Date().toISOString().split('T')[0]
};

// Limites configurados via variáveis de ambiente
const getApiLimits = (): ApiLimits => ({
  routes: parseInt(process.env.MAPS_DAILY_CAP_ROUTES || '1000'),
  geocode: parseInt(process.env.MAPS_DAILY_CAP_GEOCODE || '1000')
});

const isMapsDisabled = (): boolean => {
  return process.env.MAPS_DISABLED === 'true';
};

// Resetar contadores diários se mudou o dia
const resetCountersIfNeeded = (): void => {
  const today = new Date().toISOString().split('T')[0];
  if (dailyCounters.date !== today) {
    dailyCounters = {
      routes: 0,
      geocode: 0,
      date: today
    };
    console.log('🗺️ [MapsApiGuard] Contadores diários resetados para', today);
  }
};

// Verificar se pode fazer uma requisição específica
const canMakeRequest = (apiType: 'routes' | 'geocode'): boolean => {
  // Verificar kill switch global
  if (isMapsDisabled()) {
    console.warn('🚫 [MapsApiGuard] Google Maps API desabilitada via MAPS_DISABLED=true');
    return false;
  }

  // Resetar contadores se necessário
  resetCountersIfNeeded();

  // Verificar limites diários
  const limits = getApiLimits();
  const currentCount = dailyCounters[apiType];

  if (currentCount >= limits[apiType]) {
    console.warn(`🚫 [MapsApiGuard] Limite diário atingido para ${apiType}: ${currentCount}/${limits[apiType]}`);
    return false;
  }

  return true;
};

// Incrementar contador após requisição bem-sucedida
const incrementCounter = (apiType: 'routes' | 'geocode'): void => {
  resetCountersIfNeeded();
  dailyCounters[apiType]++;
  console.log(`📊 [MapsApiGuard] Contador ${apiType} incrementado: ${dailyCounters[apiType]}`);
};

// Obter status atual dos limites
export const getApiStatus = () => {
  resetCountersIfNeeded();
  const limits = getApiLimits();

  return {
    disabled: isMapsDisabled(),
    limits,
    counters: {
      routes: dailyCounters.routes,
      geocode: dailyCounters.geocode,
      date: dailyCounters.date
    },
    remaining: {
      routes: Math.max(0, limits.routes - dailyCounters.routes),
      geocode: Math.max(0, limits.geocode - dailyCounters.geocode)
    }
  };
};

// Middleware para proteger chamadas à Google Maps API
export const withApiGuard = async <T>(
  apiType: 'routes' | 'geocode',
  apiCall: () => Promise<T>
): Promise<T> => {
  // Verificar se pode fazer a requisição
  if (!canMakeRequest(apiType)) {
    const status = getApiStatus();

    if (status.disabled) {
      throw new Error('GOOGLE_MAPS_API_DISABLED');
    } else {
      throw new Error('GOOGLE_MAPS_API_LIMIT_EXCEEDED');
    }
  }

  try {
    // Fazer a chamada da API
    const result = await apiCall();

    // Incrementar contador apenas se a chamada foi bem-sucedida
    incrementCounter(apiType);

    return result;
  } catch (error) {
    // Se for erro de nossa validação, repassar
    if (error instanceof Error &&
        (error.message === 'GOOGLE_MAPS_API_DISABLED' ||
         error.message === 'GOOGLE_MAPS_API_LIMIT_EXCEEDED')) {
      throw error;
    }

    // Para outros erros (da API do Google), ainda incrementamos o contador
    // pois a requisição foi feita
    incrementCounter(apiType);

    throw error;
  }
};

// Função helper para criar respostas de erro padronizadas
export const createApiErrorResponse = (error: Error) => {
  const status = getApiStatus();

  if (error.message === 'GOOGLE_MAPS_API_DISABLED') {
    return {
      status: 429,
      body: {
        error: 'Google Maps API Temporarily Disabled',
        message: 'O serviço de mapas está temporariamente desabilitado para controle de custos.',
        details: {
          disabled: true,
          reason: 'MAPS_DISABLED=true'
        }
      }
    };
  }

  if (error.message === 'GOOGLE_MAPS_API_LIMIT_EXCEEDED') {
    return {
      status: 429,
      body: {
        error: 'Daily API Limit Exceeded',
        message: 'Limite diário de requisições à Google Maps API foi atingido.',
        details: {
          limits: status.limits,
          counters: status.counters,
          remaining: status.remaining
        }
      }
    };
  }

  // Para outros erros, retornar erro genérico
  return {
    status: 500,
    body: {
      error: 'Internal Server Error',
      message: 'Erro interno do servidor.',
      details: { error: error.message }
    }
  };
};
