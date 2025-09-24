import { describe, it, expect, vi, beforeEach } from 'vitest';
import type { Planet } from '../filters';

vi.mock('@tensorflow/tfjs', () => ({
  default: {},
  tensor2d: (data: number[][], _shape: [number, number]) => ({ data, shape: _shape }),
  setBackend: vi.fn(),
}));

vi.mock('@tensorflow/tfjs-backend-webgl', () => ({}));

// Mock fetch for manifest and model loading
const globalAny: any = globalThis;

const mockModel = {
  predict: vi.fn(() => ({
    dataSync: () => new Float32Array([0.8])
  }))
};

globalAny.fetch = vi.fn(async (url: string) => {
  if (url.includes('/models/ml-manifest.json')) {
    return {
      ok: true,
      json: async () => ({
        version: '1.0.0',
        models: {
          earthlike: '/models/earthlike_v1/model.json',
          weirdness: '/models/weirdness_v1/model.json'
        }
      })
    } as Response;
  }
  // For tf.loadLayersModel, our mlClassifier calls it directly; we intercept by mocking tf itself
  return { ok: false } as Response;
});

// Monkey-patch tf.loadLayersModel once module loads
vi.mock('../mlClassifier', async (orig) => {
  const actual = await vi.importActual<any>('../mlClassifier');
  const tf = await import('@tensorflow/tfjs');
  (tf as any).loadLayersModel = vi.fn(async (_url: string) => mockModel);
  return actual;
});

import { predict, clearCache, getModelInfo } from '../mlClassifier';

describe('mlClassifier', () => {
  beforeEach(() => {
    clearCache();
    mockModel.predict.mockClear();
  });

  const planet: Planet = {
    pl_name: 'Test-1',
    pl_rade: 1,
    pl_bmasse: 1,
    pl_insol: 1,
    pl_eqt: 288,
    sy_dist: 1,
    pl_orbper: 365,
  };

  it('returns probabilities within 0-1', async () => {
    const res = await predict(planet);
    expect(res.earthLike).toBeGreaterThanOrEqual(0);
    expect(res.earthLike).toBeLessThanOrEqual(1);
    expect(res.weird).toBeGreaterThanOrEqual(0);
    expect(res.weird).toBeLessThanOrEqual(1);
  });

  it('caches predictions for the same planet', async () => {
    await predict(planet);
    await predict(planet);
    // Under caching, model.predict should have been called twice (earth + weird) only once
    expect(mockModel.predict).toHaveBeenCalledTimes(2);
  });

  it('exposes model info and metrics', async () => {
    await predict(planet);
    const info = getModelInfo();
    expect(info.loaded).toBe(true);
    expect(info.version).toBeDefined();
  });
});


