export interface Planet {
  pl_name: string;
  hostname?: string;
  sy_dist?: number;
  pl_rade?: number;
  pl_bmasse?: number;
  pl_orbper?: number;
  pl_insol?: number;
  pl_eqt?: number;
  discoverymethod?: string;
  discoveryyear?: number;
  st_spectype?: string;
  st_teff?: number;
  [k: string]: any;
}

function clamp(v: number, a = 0, b = 1): number {
  return Math.max(a, Math.min(b, v));
}

// ML integration wrappers (sync facade with async background prediction)
import { predict as mlPredict, predictBatch as mlPredictBatch, MODEL_VERSION } from './mlClassifier';
import { writeThroughEarthLikeScore, writeThroughWeirdScore } from './memoizedFilters';

const mlCache = new Map<string, number>();

function mlKey(name: string, prefix = '', version: string = MODEL_VERSION) { return `${prefix}${name}_${version}`; }

export function getMlCachedScore(name: string, isWeird: boolean, version: string = MODEL_VERSION): number | undefined {
  const k = mlKey(name, isWeird ? 'w:' : '', version);
  return mlCache.get(k);
}

async function earthLikeScoreAsync(p: Planet): Promise<number> {
  const k = mlKey(p.pl_name);
  if (mlCache.has(k)) return mlCache.get(k)!;
  try {
    const res = await mlPredict(p, 5000);
    if (res == null) {
      const fallback = _heuristicEarthLikeScore(p);
      mlCache.set(k, fallback);
      // write-through to memo caches
      try { writeThroughEarthLikeScore(p.pl_name, MODEL_VERSION, fallback); } catch {}
      return fallback;
    }
    const score = Math.round(res.earthLike * 100);
    mlCache.set(k, score);
    try { writeThroughEarthLikeScore(p.pl_name, MODEL_VERSION, score); } catch {}
    return score;
  } catch {
    const fallback = _heuristicEarthLikeScore(p);
    mlCache.set(k, fallback);
    try { writeThroughEarthLikeScore(p.pl_name, MODEL_VERSION, fallback); } catch {}
    return fallback;
  }
}

async function weirdnessScoreAsync(p: Planet): Promise<number> {
  const k = mlKey(p.pl_name, 'w:');
  if (mlCache.has(k)) return mlCache.get(k)!;
  try {
    const res = await mlPredict(p, 5000);
    if (res == null) {
      const fallback = _heuristicWeirdnessScore(p);
      mlCache.set(k, fallback);
      try { writeThroughWeirdScore(p.pl_name, MODEL_VERSION, fallback); } catch {}
      return fallback;
    }
    const score = Math.round(res.weird * 100);
    mlCache.set(k, score);
    try { writeThroughWeirdScore(p.pl_name, MODEL_VERSION, score); } catch {}
    return score;
  } catch {
    const fallback = _heuristicWeirdnessScore(p);
    mlCache.set(k, fallback);
    try { writeThroughWeirdScore(p.pl_name, MODEL_VERSION, fallback); } catch {}
    return fallback;
  }
}

function mlEarthLikeScoreSync(p: Planet): number {
  const k = mlKey(p.pl_name);
  const cached = mlCache.get(k);
  if (cached != null) return cached;
  void earthLikeScoreAsync(p);
  return _heuristicEarthLikeScore(p);
}

function mlWeirdnessScoreSync(p: Planet): number {
  const k = mlKey(p.pl_name, 'w:');
  const cached = mlCache.get(k);
  if (cached != null) return cached;
  void weirdnessScoreAsync(p);
  return _heuristicWeirdnessScore(p);
}

export { mlEarthLikeScoreSync, mlWeirdnessScoreSync };

function _heuristicEarthLikeScore(p: Planet): number {
  if (p.pl_rade == null || p.pl_insol == null) return 0;
  
  // radius closeness (ideal 1 R)
  const radiusDiff = Math.abs(p.pl_rade - 1) / 1;  // normalized
  const radiusScore = clamp(1 - radiusDiff, 0, 1);

  // insolation closeness (ideal 1 S)
  const insolDiff = Math.abs((p.pl_insol || 0) - 1) / 2; // allow broader spread
  const insolScore = clamp(1 - insolDiff, 0, 1);

  // temperature closeness (optional)
  let tempScore = 0.5;
  if (p.pl_eqt != null) {
    const ideal = 255; // rough Earth equilibrium K
    const tempDiff = Math.abs(p.pl_eqt - ideal) / 100;
    tempScore = clamp(1 - tempDiff, 0, 1);
  }

  // weighted combination
  const score = (0.5 * radiusScore) + (0.35 * insolScore) + (0.15 * tempScore);
  return Math.round(score * 100);
}

function _heuristicWeirdnessScore(p: Planet): number {
  let weirdness = 0;
  
  // Extreme temperatures
  if (p.pl_eqt != null) {
    if (p.pl_eqt > 1000 || p.pl_eqt < 150) {
      weirdness += 30;
    }
  }
  
  // Extreme insolation
  if (p.pl_insol != null) {
    if (p.pl_insol > 100 || p.pl_insol < 0.1) {
      weirdness += 25;
    }
  }
  
  // Extreme radius
  if (p.pl_rade != null) {
    if (p.pl_rade > 4 || p.pl_rade < 0.5) {
      weirdness += 20;
    }
  }
  
  // Very short orbital periods (tidally locked, hot planets)
  if (p.pl_orbper != null && p.pl_orbper < 2) {
    weirdness += 15;
  }
  
  // Very massive planets
  if (p.pl_bmasse != null && p.pl_bmasse > 100) {
    weirdness += 10;
  }
  
  return Math.min(weirdness, 100);
}

function filterEarthLike(planets: Planet[]): Planet[] {
  // Trigger background ML batch to warm caches
  try { void mlPredictBatch(planets); } catch {}
  return planets
    .filter(p => mlEarthLikeScoreSync(p) > 30)
    .sort((a, b) => mlEarthLikeScoreSync(b) - mlEarthLikeScoreSync(a));
}

function filterWeird(planets: Planet[]): Planet[] {
  try { void mlPredictBatch(planets); } catch {}
  return planets
    .filter(p => mlWeirdnessScoreSync(p) > 40)
    .sort((a, b) => mlWeirdnessScoreSync(b) - mlWeirdnessScoreSync(a));
}

function filterClosest(planets: Planet[]): Planet[] {
  return planets
    .filter(p => p.sy_dist != null)
    .sort((a, b) => (a.sy_dist || 0) - (b.sy_dist || 0));
}

export function getRandomPlanet(planets: Planet[]): Planet | null {
  if (planets.length === 0) return null;
  return planets[Math.floor(Math.random() * planets.length)];
}

// Memoized re-exports for performance
// Keep originals available with _original prefix for testing/fallback
export {
  _heuristicEarthLikeScore as _originalEarthLikeScore,
  _heuristicWeirdnessScore as _originalWeirdnessScore,
  filterEarthLike as _originalFilterEarthLike,
  filterWeird as _originalFilterWeird,
  filterClosest as _originalFilterClosest,
};

// Override exports with memoized versions
import {
  memoizedEarthLikeScore,
  memoizedWeirdnessScore,
  memoizedFilterEarthLike,
  memoizedFilterWeird,
  memoizedFilterClosest,
} from './memoizedFilters';

export { memoizedEarthLikeScore as earthLikeScore };
export { memoizedWeirdnessScore as weirdnessScore };
export { memoizedFilterEarthLike as filterEarthLike };
export { memoizedFilterWeird as filterWeird };
export { memoizedFilterClosest as filterClosest };


