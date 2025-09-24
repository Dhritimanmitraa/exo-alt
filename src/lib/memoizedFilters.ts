import { _originalFilterClosest as _filterClosest, _originalFilterEarthLike as _filterEarthLike, _originalFilterWeird as _filterWeird, Planet, mlEarthLikeScoreSync as _earthLikeScore, mlWeirdnessScoreSync as _weirdnessScore, getMlCachedScore } from './filters';
import { MODEL_VERSION, getModelInfo, setModelVersionChangeCallback } from './mlClassifier';

type LruEntry<K, V> = { key: K; value: V };

class LruCache<K, V> {
  private map = new Map<K, LruEntry<K, V>>();
  private order: K[] = [];
  constructor(private capacity: number) {}
  get(key: K): V | undefined {
    const hit = this.map.get(key);
    if (!hit) return undefined;
    // move to end
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

const planetScoreCache = new LruCache<string, number>(1200);
const weirdScoreCache = new LruCache<string, number>(1200);
const filterCache = new WeakMap<Planet[], Map<string, Planet[]>>();

const metrics = { enabled: false };
const stats = { scoreHits: 0, scoreMiss: 0, filterHits: 0, filterMiss: 0 };

const keyForParams = (name: string, extra?: Record<string, unknown>) => {
  return extra ? `${name}:${JSON.stringify(extra)}` : name;
};

export const memoizedEarthLikeScore = (planet: Planet): number => {
  const version = getModelInfo().version || MODEL_VERSION;
  const k = `${planet.pl_name}_${version}`;
  // Prefer ML score if available
  const ml = getMlCachedScore(planet.pl_name, false, version);
  if (ml != null) {
    planetScoreCache.set(k, ml);
    return ml;
  }
  const hit = planetScoreCache.get(k);
  if (hit !== undefined) { if (metrics.enabled) stats.scoreHits++; return hit; }
  if (metrics.enabled) stats.scoreMiss++;
  const val = _earthLikeScore(planet);
  planetScoreCache.set(k, val);
  return val;
};

export const memoizedWeirdnessScore = (planet: Planet): number => {
  const version = getModelInfo().version || MODEL_VERSION;
  const k = `w:${planet.pl_name}_${version}`;
  const ml = getMlCachedScore(planet.pl_name, true, version);
  if (ml != null) {
    weirdScoreCache.set(k, ml);
    return ml;
  }
  const hit = weirdScoreCache.get(k);
  if (hit !== undefined) { if (metrics.enabled) stats.scoreHits++; return hit; }
  if (metrics.enabled) stats.scoreMiss++;
  const val = _weirdnessScore(planet);
  weirdScoreCache.set(k, val);
  return val;
};

const getFilterBucket = (planets: Planet[]) => {
  let bucket = filterCache.get(planets);
  if (!bucket) { bucket = new Map(); filterCache.set(planets, bucket); }
  return bucket;
};

export const memoizedFilterEarthLike = (planets: Planet[]): Planet[] => {
  const key = keyForParams('earthlike');
  const bucket = getFilterBucket(planets);
  const hit = bucket.get(key);
  if (hit) { if (metrics.enabled) stats.filterHits++; return hit; }
  if (metrics.enabled) stats.filterMiss++;
  const result = _filterEarthLike(planets).slice(0);
  bucket.set(key, result);
  return result;
};

export const memoizedFilterWeird = (planets: Planet[]): Planet[] => {
  const key = keyForParams('weird');
  const bucket = getFilterBucket(planets);
  const hit = bucket.get(key);
  if (hit) { if (metrics.enabled) stats.filterHits++; return hit; }
  if (metrics.enabled) stats.filterMiss++;
  const result = _filterWeird(planets).slice(0);
  bucket.set(key, result);
  return result;
};

export const memoizedFilterClosest = (planets: Planet[]): Planet[] => {
  const key = keyForParams('closest');
  const bucket = getFilterBucket(planets);
  const hit = bucket.get(key);
  if (hit) { if (metrics.enabled) stats.filterHits++; return hit; }
  if (metrics.enabled) stats.filterMiss++;
  const result = _filterClosest(planets).slice(0);
  bucket.set(key, result);
  return result;
};

export const enableFilterMetrics = (enabled: boolean) => { metrics.enabled = enabled; };
export const clearFilterCaches = () => { planetScoreCache.clear(); weirdScoreCache.clear(); filterCache.clear(); };
export const getFilterCacheStats = () => ({ ...stats, planetScoreCacheSize: planetScoreCache.size(), weirdScoreCacheSize: weirdScoreCache.size() });

// ML model version invalidation support
export const invalidateMLCaches = () => {
  planetScoreCache.clear();
  weirdScoreCache.clear();
};

// Write-through helpers for when async ML resolves
export const writeThroughEarthLikeScore = (name: string, version: string, score: number) => {
  const k = `${name}_${version || MODEL_VERSION}`;
  planetScoreCache.set(k, score);
};

export const writeThroughWeirdScore = (name: string, version: string, score: number) => {
  const k = `w:${name}_${version || MODEL_VERSION}`;
  weirdScoreCache.set(k, score);
};

// Hook model version change to invalidate memoized ML caches
setModelVersionChangeCallback(() => invalidateMLCaches());


