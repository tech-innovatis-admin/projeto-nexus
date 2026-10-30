const CARTO_LIGHT_TILES =
  "https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png";

const CARTO_POSITRON_STYLE =
  "https://basemaps.cartocdn.com/gl/positron-gl-style/style.json";

function withCartoKey(url: string, apiKey: string) {
  const key = apiKey.trim();
  if (!key) return url;
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}key=${encodeURIComponent(key)}`;
}

export function cartoLightTileUrl(apiKey: string) {
  return withCartoKey(CARTO_LIGHT_TILES, apiKey);
}

export function cartoPositronStyleUrl(apiKey: string) {
  return withCartoKey(CARTO_POSITRON_STYLE, apiKey);
}
