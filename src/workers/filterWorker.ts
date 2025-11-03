// Dedicated web worker for heavy filtering and geospatial calculations
// Keep types minimal to avoid TS lib issues in worker context

// Haversine distance (km)
function calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

// Sum selected products with fallback logic (mirrors page.tsx function)
function sumSelectedProducts(
  vals: Record<string, number> | undefined,
  fallbackTotal: number,
  appliedProducts: string[],
  totalProductCount: number
): number {
  if (!vals) return fallbackTotal || 0;
  if (!appliedProducts.length) return fallbackTotal || 0;
  if (appliedProducts.length === totalProductCount) return fallbackTotal || 0;
  let total = 0;
  for (const key of appliedProducts) {
    total += Number(vals[key] || 0);
  }
  if (total === 0 && appliedProducts.length === totalProductCount) return fallbackTotal || 0;
  return total;
}

// Message router
self.onmessage = (event: MessageEvent) => {
  const { requestId, type, payload } = event.data || {};

  try {
    if (type === 'FILTER_AND_SORT_POLOS') {
      const { polos, periLat, periLon, searchTermLower } = payload as {
        polos: Array<{ value: string; labelLower: string; lat?: number; lon?: number; label?: string }>;
        periLat?: number; periLon?: number;
        searchTermLower: string;
      };

      let list = polos;
      // Filter by term if provided
      if (searchTermLower) {
        const term = String(searchTermLower);
        list = list.filter(p => p.labelLower.includes(term));
      }

      // Sort by distance if perimeter coords present and we have lat/lon for polos
      if (typeof periLat === 'number' && typeof periLon === 'number') {
        list = [...list].sort((a, b) => {
          const dA = (typeof a.lat === 'number' && typeof a.lon === 'number')
            ? calculateDistance(periLat, periLon, a.lat!, a.lon!)
            : Number.POSITIVE_INFINITY;
          const dB = (typeof b.lat === 'number' && typeof b.lon === 'number')
            ? calculateDistance(periLat, periLon, b.lat!, b.lon!)
            : Number.POSITIVE_INFINITY;
          return dA - dB;
        });
      }

      (self as any).postMessage({ requestId, type, result: list });
      return;
    }

    if (type === 'AGG_PERIFERIA_BY_CODIGO') {
      const { items, appliedProducts, totalProductCount } = payload as {
        items: Array<{ codigo_origem: string; valor_total_destino: number; productValues?: Record<string, number> }>;
        appliedProducts: string[];
        totalProductCount: number;
      };

      const agg: Record<string, number> = {};
      for (const f of items) {
        const v = sumSelectedProducts(f.productValues, Number(f.valor_total_destino) || 0, appliedProducts, totalProductCount);
        agg[f.codigo_origem] = (agg[f.codigo_origem] || 0) + v;
      }

      (self as any).postMessage({ requestId, type, result: agg });
      return;
    }

    // default: echo back
    (self as any).postMessage({ requestId, type: 'UNKNOWN', result: null });
  } catch (err) {
    (self as any).postMessage({ requestId, type: 'ERROR', error: String(err) });
  }
};
