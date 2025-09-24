import type { Planet } from './filters';

export const MODEL_VERSION = '1.0.0';

// Avoid static type dependency to keep lints green without external @types
type TfModule = any;

type Prediction = { earthLike: number; weird: number; confidence?: number };

// Lightweight LRU cache for predictions
class LruCache<K, V> {
  private map = new Map<K, { key: K; value: V }>();
  private order: K[] = [];
  constructor(private capacity: number) {}
  get(key: K): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    this.order = this.order.filter(k => k !== key);
    this.order.push(key);
    return hit.value;
  }
  set(key: K, value: V) {
    if (this.map.has(key)) {
      this.order = this.order.filter(k => k !== key);
    }
    this.map.set(key, { key, value });
    this.order.push(key);
    if (this.order.length > this.capacity) {
      const evict = this.order.shift();
      if (evict !== undefined) this.map.delete(evict);
    }
  }
  clear() { this.map.clear(); this.order = []; }
  size() { return this.order.length; }
}

let tfPromise: Promise<TfModule> | null = null;
let earthModel: any | null = null;
let weirdModel: any | null = null;
let loadedVersion: string | null = null;

// Notify consumers when model version changes so they can invalidate caches
export let onModelVersionChange: (version: string) => void = () => {};
export function setModelVersionChangeCallback(cb: (version: string) => void) { onModelVersionChange = cb; }

const inFlight = new Map<string, Promise<Prediction>>();
const predictionCache = new LruCache<string, Prediction>(1000);

const metrics = {
  modelLoadMs: 0,
  modelLoadSuccess: 0,
  modelLoadFail: 0,
  inferenceMs: 0,
  inferenceCount: 0,
  cacheHit: 0,
  cacheMiss: 0,
  fallbacks: 0,
};

export function getModelInfo() {
  return {
    version: loadedVersion,
    loaded: Boolean(earthModel && weirdModel),
    metrics: { ...metrics, cacheSize: predictionCache.size() },
  };
}

export function clearCache() {
  predictionCache.clear();
  inFlight.clear();
}

async function loadTensorFlow(): Promise<TfModule> {
  if (!tfPromise) {
    // @ts-expect-error module types resolved at runtime
    tfPromise = import('@tensorflow/tfjs') as Promise<TfModule>;
  }
  return tfPromise;
}

async function backoff<T>(fn: () => Promise<T>, retries = 2, baseDelayMs = 250): Promise<T> {
  try {
    return await fn();
  } catch (err) {
    if (retries <= 0) throw err;
    const delay = baseDelayMs * Math.pow(2, 2 - retries);
    await new Promise(res => setTimeout(res, delay));
    return backoff(fn, retries - 1, baseDelayMs);
  }
}

async function ensureModelsLoaded(): Promise<void> {
  if (earthModel && weirdModel && loadedVersion) return;

  const start = performance.now();
  try {
    const tf = await loadTensorFlow();
    // Ensure WebGL backend is available but don't hard fail if not
    try { 
      // @ts-expect-error module types resolved at runtime
      await import('@tensorflow/tfjs-backend-webgl'); 
      await (tf as any).setBackend('webgl'); 
    } catch {}

    const base = (import.meta as any).env?.BASE_URL || '/';
    const manifestUrl = new URL('models/ml-manifest.json', base).toString();
    const manifestRes = await fetch(manifestUrl);
    if (!manifestRes.ok) throw new Error('ml-manifest fetch failed');
    const manifest = await manifestRes.json();
    const models = manifest.models || {};

    const earthUrl = models.earthlike ? new URL(models.earthlike, base).toString() : null;
    const weirdUrl = models.weirdness ? new URL(models.weirdness, base).toString() : null;
    if (!earthUrl || !weirdUrl) throw new Error('model URLs missing');

    const [earth, weird] = await Promise.all([
      backoff(() => (tf as any).loadLayersModel(earthUrl)),
      backoff(() => (tf as any).loadLayersModel(weirdUrl)),
    ]);

    earthModel = earth;
    weirdModel = weird;
    const previous = loadedVersion;
    loadedVersion = manifest.version || MODEL_VERSION;
    metrics.modelLoadSuccess++;
    if (loadedVersion && loadedVersion !== previous) {
      try { onModelVersionChange(loadedVersion); } catch {}
    }
  } catch (e) {
    metrics.modelLoadFail++;
    throw e;
  } finally {
    metrics.modelLoadMs = performance.now() - start;
  }
}

function safeLog1p(value: number | undefined | null): number {
  const v = value == null ? 0 : value;
  const clamped = v < 0 ? 0 : v;
  return Math.log1p(clamped);
}

function normalizeMinMax(value: number | undefined | null, min: number, max: number, defaultValue: number): number {
  const v = value == null ? defaultValue : value;
  if (max === min) return 0;
  const n = (v - min) / (max - min);
  return Math.max(0, Math.min(1, n));
}

export function validateFeatures(planet: Planet) {
  const issues: string[] = [];
  if (planet.pl_rade == null) issues.push('pl_rade missing');
  if (planet.pl_insol == null) issues.push('pl_insol missing');
  if (planet.pl_eqt == null) issues.push('pl_eqt missing');
  return { ok: issues.length === 0, issues };
}

function extractFeatures(planet: Planet): Float32Array {
  // Defaults correspond roughly to medians from dataset
  const rade = normalizeMinMax(planet.pl_rade, 0, 10, 1);
  const bmasse = safeLog1p(planet.pl_bmasse);
  const insol = safeLog1p(planet.pl_insol);
  const eqt = normalizeMinMax(planet.pl_eqt, 0, 3000, 255);
  const dist = safeLog1p(planet.sy_dist);
  const orbper = safeLog1p(planet.pl_orbper);
  return new Float32Array([rade, bmasse, insol, eqt, dist, orbper]);
}

function keyForPlanet(planet: Planet): string {
  const version = loadedVersion || MODEL_VERSION;
  return `${planet.pl_name || 'unknown'}_${version}`;
}

function probabilityToConfidence(prob: number): number {
  const p = Math.max(1e-6, Math.min(1 - 1e-6, prob));
  const logit = Math.log(p / (1 - p));
  const conf = Math.min(1, Math.abs(logit) / 5);
  return conf;
}

async function predictSingle(planet: Planet): Promise<Prediction> {
  const cacheKey = keyForPlanet(planet);
  const cached = predictionCache.get(cacheKey);
  if (cached) { metrics.cacheHit++; return cached; }
  metrics.cacheMiss++;

  const inflight = inFlight.get(cacheKey);
  if (inflight) return inflight;

  const promise = (async () => {
    try {
      await ensureModelsLoaded();
      const tf = await loadTensorFlow();
      const features = extractFeatures(planet);
      const start = performance.now();

      const { earthLike, weird } = (tf as any).tidy(() => {
        const x = (tf as any).tensor2d([Array.from(features)], [1, 6]);
        const pEarthT = (earthModel as any).predict(x) as any;
        const pWeirdT = (weirdModel as any).predict(x) as any;
        const e = pEarthT.dataSync()[0] as number;
        const w = pWeirdT.dataSync()[0] as number;
        return { earthLike: e, weird: w };
      });

      const elapsed = performance.now() - start;
      metrics.inferenceMs += elapsed; metrics.inferenceCount++;

      const result: Prediction = { earthLike, weird, confidence: probabilityToConfidence(Math.max(earthLike, weird)) };
      predictionCache.set(cacheKey, result);
      return result;
    } catch (e) {
      metrics.fallbacks++;
      throw e;
    } finally {
      inFlight.delete(cacheKey);
    }
  })();

  inFlight.set(cacheKey, promise);
  return promise;
}

export async function predict(planet: Planet, timeoutMs = 5000): Promise<Prediction | null> {
  const p = predictSingle(planet);
  const timeout = new Promise<Prediction | null>((resolve) => setTimeout(() => resolve(null), timeoutMs));
  const res = await Promise.race([p, timeout]);
  return res as Prediction | null;
}

export async function predictBatch(planets: Planet[], timeoutMs = 5000): Promise<(Prediction | null)[]> {
  const run = (async () => {
    await ensureModelsLoaded();
    const tf = await loadTensorFlow();
    const start = performance.now();
    const featuresBatch = planets.map(p => Array.from(extractFeatures(p)));
    const { earthArr, weirdArr } = (tf as any).tidy(() => {
      const batchX = (tf as any).tensor2d(featuresBatch, [featuresBatch.length, 6]);
      const pEarth = (earthModel as any).predict(batchX) as any;
      const pWeird = (weirdModel as any).predict(batchX) as any;
      const earthArr = Array.from(pEarth.dataSync()) as number[];
      const weirdArr = Array.from(pWeird.dataSync()) as number[];
      return { earthArr, weirdArr };
    });

    const elapsed = performance.now() - start;
    metrics.inferenceMs += elapsed; metrics.inferenceCount += planets.length;

    const results: Prediction[] = planets.map((planet, i) => {
      const earthLike = earthArr[i] ?? 0;
      const weird = weirdArr[i] ?? 0;
      const pred: Prediction = { earthLike, weird, confidence: probabilityToConfidence(Math.max(earthLike, weird)) };
      const cacheKey = keyForPlanet(planet);
      predictionCache.set(cacheKey, pred);
      return pred;
    });
    return results as (Prediction | null)[];
  })();

  const timeout = new Promise<(Prediction | null)[]>((resolve) => setTimeout(() => resolve(planets.map(() => null)), timeoutMs));
  try {
    return await Promise.race([run, timeout]);
  } catch (e) {
    metrics.fallbacks++;
    throw e;
  }
}


