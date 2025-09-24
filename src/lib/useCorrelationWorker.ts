import { useEffect, useMemo, useRef, useState } from 'react';
import type { Planet } from './filters';

export type CorrelationMatrix = { [key: string]: { [key: string]: number } };

type PendingEntry = {
  resolve: (m: CorrelationMatrix) => void;
  reject: (e: any) => void;
  timeoutId: any;
};

const SYNC_FALLBACK = (planets: Planet[], metrics: string[]): CorrelationMatrix => {
  const matrix: CorrelationMatrix = {};
  for (const m1 of metrics) {
    matrix[m1] = {};
    for (const m2 of metrics) {
      const valid = planets.filter(p => p[m1 as keyof Planet] != null && p[m2 as keyof Planet] != null);
      if (valid.length < 10) {
        matrix[m1][m2] = 0;
        continue;
      }
      const values1 = valid.map(p => Number(p[m1 as keyof Planet]));
      const values2 = valid.map(p => Number(p[m2 as keyof Planet]));
      const n = values1.length;
      let sum1 = 0, sum2 = 0, sum11 = 0, sum22 = 0, sum12 = 0;
      for (let i = 0; i < n; i++) {
        const x = values1[i];
        const y = values2[i];
        sum1 += x; sum2 += y; sum11 += x * x; sum22 += y * y; sum12 += x * y;
      }
      const cov = sum12 - (sum1 * sum2) / n;
      const var1 = sum11 - (sum1 * sum1) / n;
      const var2 = sum22 - (sum2 * sum2) / n;
      const denom = Math.sqrt(var1 * var2);
      matrix[m1][m2] = denom === 0 ? 0 : cov / denom;
    }
  }
  return matrix;
};

export function useCorrelationWorker() {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, PendingEntry>>(new Map());
  const [isCalculating, setIsCalculating] = useState(false);
  const [inflightCount, setInflightCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  // Initialize worker
  useEffect(() => {
    let attempts = 0;
    const startWorker = () => {
      try {
        workerRef.current = new Worker(new URL('../workers/correlation.worker.ts', import.meta.url), { type: 'module' });
        workerRef.current.onmessage = (e: MessageEvent<any>) => {
          const { id, success, matrix, error: err, progress: p } = e.data || {};
          if (p != null) {
            setProgress(typeof p === 'number' ? p : 0);
          }
          if (id && pendingRef.current.has(id)) {
            const entry = pendingRef.current.get(id)!;
            if (entry.timeoutId) clearTimeout(entry.timeoutId);
            pendingRef.current.delete(id);
            if (success === false) {
              const message = err || 'Worker failed';
              setError(message);
              entry.reject(new Error(message));
            } else if (success && matrix) {
              entry.resolve(matrix);
            }
          }
        };
        workerRef.current.onerror = () => {
          setError('Correlation worker error');
        };
      } catch (e) {
        attempts++;
        if (attempts < 3) {
          setTimeout(startWorker, attempts * 500);
        } else {
          setError('Failed to initialize correlation worker');
        }
      }
    };
    startWorker();
    return () => {
      if (workerRef.current) workerRef.current.terminate();
      workerRef.current = null;
      pendingRef.current.forEach(p => clearTimeout(p.timeoutId));
      pendingRef.current.clear();
    };
  }, []);

  const calculateCorrelations = useMemo(() => {
    return (planets: Planet[], metrics: string[]): Promise<CorrelationMatrix> => {
      setError(null);
      setProgress(0);
      setInflightCount(prev => prev + 1);
      setIsCalculating(true);
      const id = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);

      return new Promise<CorrelationMatrix>((resolve, reject) => {
        const timeoutId = setTimeout(() => {
          // Timeout: fallback
          pendingRef.current.delete(id);
          try {
            const matrix = SYNC_FALLBACK(planets, metrics);
            resolve(matrix);
          } catch (e: any) {
            reject(e);
          }
        }, 30000);

        pendingRef.current.set(id, { resolve, reject, timeoutId });

        if (workerRef.current) {
          workerRef.current.postMessage({ id, type: 'calculate', planets, metrics });
        } else {
          // No worker: fallback immediately
          clearTimeout(timeoutId);
          try {
            const matrix = SYNC_FALLBACK(planets, metrics);
            resolve(matrix);
          } catch (e: any) {
            reject(e);
          }
        }
      }).finally(() => {
        setInflightCount(prev => {
          const next = Math.max(0, prev - 1);
          if (next === 0) {
            setIsCalculating(false);
            setProgress(1);
          }
          return next;
        });
      });
    };
  }, []);

  return { calculateCorrelations, isCalculating, error, progress } as const;
}


