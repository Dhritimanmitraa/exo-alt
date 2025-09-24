import { Planet } from './filters';

export interface DataConfig {
  useRemoteData: boolean;
  maxAgeMs: number; // cache freshness window
  fallbackToLocal: boolean;
  refreshInterval: number; // reserved for future background refresh
  maxRecords?: number; // NASA TAP MAXREC upper bound
}

const DEFAULT_DATA_CONFIG: DataConfig = {
  useRemoteData: true,
  maxAgeMs: 24 * 60 * 60 * 1000, // 24 hours
  fallbackToLocal: true,
  refreshInterval: 60 * 60 * 1000, // 1 hour
  maxRecords: 5000
};

const DATA_VERSION = 1;
const LS_KEY = 'exo-planets-cache';

type CachedPayload = {
  version: number;
  timestamp: number;
  data: Planet[];
};

class DataService {
  private config: DataConfig;
  private memoryCache: { data: Planet[]; timestamp: number; version: number } | null = null;
  private enrichmentsPromise: Promise<Record<string, Partial<Planet>>> | null = null;

  constructor(config: Partial<DataConfig> = {}) {
    this.config = { ...DEFAULT_DATA_CONFIG, ...config };
    this.ensureStorageVersion();
  }

  updateConfig(newConfig: Partial<DataConfig>) {
    this.config = { ...this.config, ...newConfig };
  }

  async fetchPlanets(forceRefresh?: boolean): Promise<Planet[]> {
    // 1) Try fresh in-memory cache
    if (!forceRefresh && this.memoryCache && this.isFresh(this.memoryCache.timestamp, this.memoryCache.version)) {
      return this.memoryCache.data;
    }

    // 2) Try remote NASA API (primary)
    if (this.config.useRemoteData) {
      try {
        const remote = await this.fetchFromNasa();
        const enriched = await this.mergeWithEnrichments(remote);
        this.writeCaches(enriched);
        return enriched;
      } catch (err) {
        console.error('NASA TAP fetch failed:', err);
      }
    }

    // 3) Fallback to stale localStorage cache if present
    const stale = this.readLocalStorage();
    if (stale) {
      console.warn('Using stale cached planet data from localStorage');
      this.memoryCache = { data: stale.data, timestamp: stale.timestamp, version: stale.version };
      return stale.data;
    }

    // 4) Fallback to local JSON
    if (this.config.fallbackToLocal) {
      try {
        const local = await this.fetchLocalJson();
        // Local file already includes enrichments; return directly to avoid double-fetch
        this.writeCaches(local);
        return local;
      } catch (err) {
        console.error('Local JSON fallback failed:', err);
      }
    }

    // 5) Nothing worked
    throw new Error('Unable to load planet data from NASA API, cache, or local file');
  }

  private isFresh(timestamp: number, version: number): boolean {
    if (version !== DATA_VERSION) return false;
    return Date.now() - timestamp < this.config.maxAgeMs;
  }

  private ensureStorageVersion() {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return;
      const parsed: CachedPayload = JSON.parse(raw);
      if (!parsed || parsed.version !== DATA_VERSION) {
        localStorage.removeItem(LS_KEY);
      }
    } catch {
      // ignore storage errors
    }
  }

  private readLocalStorage(): CachedPayload | null {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return null;
      const parsed: CachedPayload = JSON.parse(raw);
      if (!parsed || parsed.version !== DATA_VERSION) return null;
      return parsed;
    } catch {
      return null;
    }
  }

  private writeCaches(data: Planet[]) {
    const payload: CachedPayload = { version: DATA_VERSION, timestamp: Date.now(), data };
    this.memoryCache = { data, timestamp: payload.timestamp, version: DATA_VERSION };
    try {
      localStorage.setItem(LS_KEY, JSON.stringify(payload));
    } catch {
      // ignore storage write errors
    }
  }

  private async fetchFromNasa(): Promise<Planet[]> {
    const columns = [
      'pl_name',
      'hostname',
      'sy_dist',
      'pl_rade',
      'pl_bmasse',
      'pl_orbper',
      'pl_insol',
      'pl_eqt',
      'discoverymethod',
      'discoveryyear',
      'st_spectype',
      'st_teff'
    ];

    const adql = `select ${columns.join(', ')} from ps where default_flag = 1`;
    const maxRecords = this.config.maxRecords ?? 5000;
    const url = `https://exoplanetarchive.ipac.caltech.edu/TAP/sync?query=${encodeURIComponent(adql)}&format=json&MAXREC=${encodeURIComponent(String(maxRecords))}`;

    const resp = await this.fetchWithTimeout(url, { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) {
      throw new Error(`NASA TAP HTTP ${resp.status}`);
    }
    const json = await resp.json();
    // Robustly support either array or { data: [] } shapes, fail clearly otherwise
    const rows = Array.isArray(json)
      ? json
      : (json && typeof json === 'object' && Array.isArray((json as any).data))
        ? (json as any).data
        : null;
    if (!rows) {
      throw new Error('Unexpected NASA TAP response shape: expected array or object with data array');
    }
    return (rows as any[]).map(row => this.normalizePlanet(row));
  }

  private async fetchLocalJson(): Promise<Planet[]> {
    const resp = await this.fetchWithTimeout('/data/planets.min.json', { headers: { 'Accept': 'application/json' } });
    if (!resp.ok) {
      throw new Error(`Local planets JSON HTTP ${resp.status}`);
    }
    const data: Planet[] = await resp.json();
    return data;
  }

  private normalizePlanet(row: any): Planet {
    const planet: Planet = {
      pl_name: String(this.getValueCaseInsensitive(row, 'pl_name') ?? ''),
      hostname: this.stringOrUndefined(this.getValueCaseInsensitive(row, 'hostname')),
      sy_dist: numOrUndefined(this.getValueCaseInsensitive(row, 'sy_dist')),
      pl_rade: numOrUndefined(this.getValueCaseInsensitive(row, 'pl_rade')),
      pl_bmasse: numOrUndefined(this.getValueCaseInsensitive(row, 'pl_bmasse')),
      pl_orbper: numOrUndefined(this.getValueCaseInsensitive(row, 'pl_orbper')),
      pl_insol: numOrUndefined(this.getValueCaseInsensitive(row, 'pl_insol')),
      pl_eqt: numOrUndefined(this.getValueCaseInsensitive(row, 'pl_eqt')),
      discoverymethod: this.stringOrUndefined(this.getValueCaseInsensitive(row, 'discoverymethod')),
      discoveryyear: numOrUndefined(this.getValueCaseInsensitive(row, 'discoveryyear')),
      st_spectype: this.stringOrUndefined(this.getValueCaseInsensitive(row, 'st_spectype')),
      st_teff: numOrUndefined(this.getValueCaseInsensitive(row, 'st_teff'))
    };
    return planet;
  }

  private async loadEnrichments(): Promise<Record<string, Partial<Planet>>> {
    if (!this.enrichmentsPromise) {
      this.enrichmentsPromise = (async () => {
        try {
          const local = await this.fetchLocalJson();
          const map: Record<string, Partial<Planet>> = {};
          for (const p of local) {
            const key = (p.pl_name || '').trim().toLowerCase();
            if (!key) continue;
            // Only keep fields that act as enrichments; preserve all extras present
            const { pl_name, hostname, sy_dist, pl_rade, pl_bmasse, pl_orbper, pl_insol, pl_eqt, discoverymethod, discoveryyear, st_spectype, st_teff, ...extras } = p as any;
            map[key] = extras as Partial<Planet>;
          }
          return map;
        } catch (e) {
          console.warn('Failed to load local enrichments; proceeding without extras');
          return {};
        }
      })();
    }
    return this.enrichmentsPromise;
  }

  private async mergeWithEnrichments(planets: Planet[]): Promise<Planet[]> {
    const enrichments = await this.loadEnrichments();
    return planets.map(p => {
      const extras = enrichments[(p.pl_name || '').trim().toLowerCase()] || {};
      return { ...p, ...extras } as Planet;
    });
  }

  // Fetch with AbortController-based timeout for resiliency
  private async fetchWithTimeout(input: RequestInfo | URL, init?: RequestInit & { timeoutMs?: number }): Promise<Response> {
    const timeoutMs = (init as any)?.timeoutMs ?? 10000;
    const controller = new AbortController();
    const id = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const resp = await fetch(input as any, { ...(init || {}), signal: controller.signal });
      return resp;
    } catch (e: any) {
      if (e && e.name === 'AbortError') {
        throw new Error(`Fetch timeout after ${timeoutMs} ms`);
      }
      throw e;
    } finally {
      clearTimeout(id);
    }
  }

  // Case-insensitive value getter for safer normalization of external data
  private getValueCaseInsensitive(row: any, key: string): any {
    if (!row || typeof row !== 'object') return undefined;
    if (key in row) return (row as any)[key];
    const lower = key.toLowerCase();
    const upper = key.toUpperCase();
    // Find matching key ignoring case
    const match = Object.keys(row).find(k => k === key || k.toLowerCase() === lower || k.toUpperCase() === upper);
    return match ? (row as any)[match] : undefined;
  }

  private stringOrUndefined(value: any): string | undefined {
    if (value == null) return undefined;
    const s = String(value);
    return s.length ? s : undefined;
  }
}

function numOrUndefined(value: any): number | undefined {
  if (value == null) return undefined;
  const n = typeof value === 'number' ? value : Number(value);
  return isNaN(n) ? undefined : n;
}

export const dataService = new DataService();
export default dataService;


