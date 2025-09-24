// Correlation Web Worker
import type { Planet } from '../lib/filters';

export type CorrelationMatrix = { [key: string]: { [key: string]: number } };

export interface CorrelationRequest {
  id: string;
  type: 'calculate';
  planets: Planet[];
  metrics: string[];
}

export interface CorrelationResponse {
  id: string;
  success: boolean;
  matrix?: CorrelationMatrix;
  error?: string;
  duration?: number;
  progress?: number;
}

const computeCorrelation = (values1: Float64Array, values2: Float64Array): number => {
  const n = values1.length;
  if (n === 0) return 0;
  let sum1 = 0, sum2 = 0, sum11 = 0, sum22 = 0, sum12 = 0;
  for (let i = 0; i < n; i++) {
    const x = values1[i];
    const y = values2[i];
    sum1 += x; sum2 += y;
    sum11 += x * x; sum22 += y * y;
    sum12 += x * y;
  }
  const cov = sum12 - (sum1 * sum2) / n;
  const var1 = sum11 - (sum1 * sum1) / n;
  const var2 = sum22 - (sum2 * sum2) / n;
  const denom = Math.sqrt(var1 * var2);
  return denom === 0 ? 0 : cov / denom;
};

const calculateMatrix = (planets: Planet[], metrics: string[], postProgress?: (p: number) => void): CorrelationMatrix => {
  const matrix: CorrelationMatrix = {};
  const total = metrics.length * metrics.length;
  let done = 0;

  for (let i = 0; i < metrics.length; i++) {
    const m1 = metrics[i];
    matrix[m1] = {};
    for (let j = 0; j < metrics.length; j++) {
      const m2 = metrics[j];
      const valid = planets.filter(p => p[m1 as keyof Planet] != null && p[m2 as keyof Planet] != null);
      if (valid.length < 10) {
        matrix[m1][m2] = 0;
      } else {
        const a = new Float64Array(valid.length);
        const b = new Float64Array(valid.length);
        for (let k = 0; k < valid.length; k++) {
          a[k] = Number(valid[k][m1 as keyof Planet]);
          b[k] = Number(valid[k][m2 as keyof Planet]);
        }
        matrix[m1][m2] = computeCorrelation(a, b);
      }
      done++;
      if (postProgress && (done % Math.max(1, Math.floor(total / 20)) === 0)) {
        postProgress(done / total);
      }
    }
  }
  postProgress && postProgress(1);
  return matrix;
};

self.onmessage = (event: MessageEvent<CorrelationRequest>) => {
  const msg = event.data;
  if (msg.type !== 'calculate') return;
  const start = performance.now();
  try {
    const matrix = calculateMatrix(msg.planets, msg.metrics, (p) => {
      const progress: CorrelationResponse = { id: msg.id, success: true, progress: p };
      // @ts-ignore - self.postMessage in worker
      self.postMessage(progress);
    });
    const end = performance.now();
    const response: CorrelationResponse = { id: msg.id, success: true, matrix, duration: end - start };
    // @ts-ignore
    self.postMessage(response);
  } catch (e: any) {
    const response: CorrelationResponse = { id: msg.id, success: false, error: e?.message || 'Unknown error' };
    // @ts-ignore
    self.postMessage(response);
  }
};


