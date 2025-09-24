let manifestCache: Map<string, string> | null = null;

export function slugFromPlanetName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim().replace(/\s+/g, '');
}

export async function loadModelManifest(): Promise<Map<string, string>> {
  if (manifestCache) return manifestCache;
  try {
    const res = await fetch('/models/manifest.json');
    if (!res.ok) return new Map();
    const json = await res.json();
    const models = json.models || {};
    manifestCache = new Map(Object.entries(models) as [string, string][]);
    return manifestCache;
  } catch {
    manifestCache = new Map();
    return manifestCache;
  }
}

export function getModelUrl(slug: string): string | undefined {
  if (!manifestCache) return undefined;
  return manifestCache.get(slug);
}


