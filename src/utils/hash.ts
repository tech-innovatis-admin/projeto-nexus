// Lightweight hashing utilities to create stable, cheap dependency keys for large arrays
// Avoids expensive deep equality checks or JSON.stringify for big datasets.

export function simpleHash(input: string): string {
  // FNV-1a 32-bit hash (fast and sufficient for dependency keys)
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = (hash + ((hash << 1) + (hash << 4) + (hash << 7) + (hash << 8) + (hash << 24))) >>> 0;
  }
  // Return as hex string to keep it compact and stable
  return hash.toString(16);
}

export function hashStringArray(values: readonly string[] | string[] | undefined | null): string {
  if (!values || values.length === 0) return '0';
  // Order-insensitive: sort to avoid spurious changes
  const sorted = [...values].map(String).sort();
  return simpleHash(sorted.join('|'));
}

export function hashBy<T>(items: readonly T[] | T[] | undefined | null, key: (item: T) => string): string {
  if (!items || items.length === 0) return '0';
  let acc = '';
  for (let i = 0; i < items.length; i++) {
    acc += key(items[i]);
    acc += '\n';
  }
  return simpleHash(acc);
}
