// Simple client-side cache for large JSON (GeoJSON) using localStorage + in-memory session cache
// - Tries HEAD revalidation via ETag/Last-Modified when available
// - Falls back to age-based revalidation
// - Safe no-op on SSR (returns null)

type CacheMeta = {
  etag?: string;
  lastModified?: string;
  savedAt: number; // epoch ms
};

const memoryCache = new Map<string, any>();

const getLS = () => (typeof window === 'undefined' ? null : window.localStorage);

export async function fetchGeoJSONWithCache(
  url: string,
  cacheKey: string,
  revalidateMs = 24 * 60 * 60 * 1000 // 24h
): Promise<{ data: any | null; fromCache: boolean }> {
  if (typeof window === 'undefined') return { data: null, fromCache: false };

  // 1) In-memory session cache
  if (memoryCache.has(cacheKey)) {
    return { data: memoryCache.get(cacheKey), fromCache: true };
  }

  const ls = getLS();
  const metaKey = `${cacheKey}:meta`;
  const dataKey = `${cacheKey}:data`;

  const readLS = () => {
    try {
      const metaRaw = ls?.getItem(metaKey);
      const dataRaw = ls?.getItem(dataKey);
      const meta: CacheMeta | null = metaRaw ? JSON.parse(metaRaw) : null;
      const data = dataRaw ? JSON.parse(dataRaw) : null;
      return { meta, data };
    } catch {
      return { meta: null, data: null };
    }
  };

  const writeLS = (meta: CacheMeta, data: any) => {
    try {
      ls?.setItem(metaKey, JSON.stringify(meta));
      ls?.setItem(dataKey, JSON.stringify(data));
    } catch {
      // quota exceeded or disabled; ignore
    }
  };

  const { meta: cachedMeta, data: cachedData } = readLS();
  const now = Date.now();

  // Helper: return cached if available and not expired (age-based)
  const returnCachedIfValid = () => {
    if (cachedData && cachedMeta) {
      const age = now - (cachedMeta.savedAt || 0);
      if (age <= revalidateMs) {
        memoryCache.set(cacheKey, cachedData);
        return { data: cachedData, fromCache: true } as const;
      }
    }
    return null;
  };

  // Try HEAD for revalidation tokens
  try {
    const headResp = await fetch(url, { method: 'HEAD' });
    if (headResp.ok) {
      const etag = headResp.headers.get('ETag') || undefined;
      const lastMod = headResp.headers.get('Last-Modified') || undefined;

      const tagsMatch =
        !!etag && !!cachedMeta?.etag && etag === cachedMeta.etag;
      const lastModMatch =
        !!lastMod && !!cachedMeta?.lastModified && lastMod === cachedMeta.lastModified;

      if ((tagsMatch || lastModMatch) && cachedData) {
        // Fresh by server signature
        memoryCache.set(cacheKey, cachedData);
        return { data: cachedData, fromCache: true };
      }

      // Need fresh GET
      const getResp = await fetch(url, { method: 'GET' });
      if (!getResp.ok) {
        // fallback to cached if valid by age
        const cached = returnCachedIfValid();
        if (cached) return cached;
        return { data: null, fromCache: false };
      }
      const json = await getResp.json();
      const newMeta: CacheMeta = { etag, lastModified: lastMod, savedAt: now };
      writeLS(newMeta, json);
      memoryCache.set(cacheKey, json);
      return { data: json, fromCache: false };
    }
  } catch {
    // HEAD failed (CORS/offline). Try age-based cache, else GET
    const cached = returnCachedIfValid();
    if (cached) return cached;
  }

  // 3) Fallback: GET and cache
  try {
    const resp = await fetch(url);
    if (!resp.ok) {
      const cached = returnCachedIfValid();
      if (cached) return cached;
      return { data: null, fromCache: false };
    }
    const json = await resp.json();
    const newMeta: CacheMeta = { savedAt: now };
    writeLS(newMeta, json);
    memoryCache.set(cacheKey, json);
    return { data: json, fromCache: false };
  } catch {
    const cached = returnCachedIfValid();
    if (cached) return cached;
    return { data: null, fromCache: false };
  }
}

export function clearGeoJSONCache(cacheKey: string) {
  memoryCache.delete(cacheKey);
  const ls = getLS();
  if (ls) {
    try {
      ls.removeItem(`${cacheKey}:meta`);
      ls.removeItem(`${cacheKey}:data`);
    } catch {}
  }
}
