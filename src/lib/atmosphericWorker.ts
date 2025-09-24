import { Planet } from './filters';
import { AtmosphericPhysicsConfig, DEFAULT_PHYSICS_CONFIG, validatePhysicsConfig } from './atmosphericPhysics';
import { SimulatorType, createSimulator } from './atmosphericSimulators';

export type WorkerRequestType = 'calculate' | 'simulate' | 'evolve';

export interface WorkerRequest<TPayload = any> {
  id: string;
  type: WorkerRequestType;
  payload: TPayload;
}

export interface WorkerResponse<TData = any> {
  id: string;
  success: boolean;
  data?: TData;
  error?: string;
  metrics?: { elapsedMs: number };
}

export interface AtmosphericCalculationPayload {
  simulatorType: SimulatorType;
  planet: Planet;
  timeOfDay?: number;
  timeStep?: number;
  config?: AtmosphericPhysicsConfig;
}

function createWorker(): Worker {
  // @ts-ignore
  return new Worker(new URL('../workers/atmospheric.worker.ts', import.meta.url), { type: 'module' });
}

type PendingMap = Map<string, { resolve: (v: any) => void; reject: (e: any) => void; timeout: any }>;

export class AtmosphericWorkerPool {
  private workers: Worker[] = [];
  private pending: PendingMap = new Map();
  private rrIndex = 0;
  private maxWorkers: number;
  private fallbackSimulatorType: SimulatorType = 'heuristic';

  constructor(size?: number) {
    const hw = (typeof navigator !== 'undefined' && (navigator as any).hardwareConcurrency) || 4;
    this.maxWorkers = Math.max(1, Math.min(size || Math.ceil(hw / 2), 6));
    this.spawn();
  }

  private spawn() {
    try {
      for (let i = 0; i < this.maxWorkers; i++) {
        const w = createWorker();
        w.onmessage = (ev: MessageEvent<WorkerResponse>) => this.onMessage(ev.data);
        w.onerror = (e: any) => {
          // fail fast on errors
          console.error('Atmospheric worker error', e);
        };
        this.workers.push(w);
      }
    } catch (e) {
      console.warn('Web Workers unavailable, falling back to main thread computations');
      this.workers = [];
    }
  }

  private onMessage(resp: WorkerResponse) {
    const entry = this.pending.get(resp.id);
    if (!entry) return;
    clearTimeout(entry.timeout);
    this.pending.delete(resp.id);
    if (resp.success) entry.resolve(resp.data);
    else entry.reject(new Error(resp.error || 'Worker failed'));
  }

  terminate() {
    for (const w of this.workers) {
      try { w.terminate(); } catch {}
    }
    this.workers = [];
    for (const [id, entry] of this.pending) {
      clearTimeout(entry.timeout);
      entry.reject(new Error('Worker pool terminated'));
      this.pending.delete(id);
    }
  }

  private nextWorker(): Worker | null {
    if (!this.workers.length) return null;
    const w = this.workers[this.rrIndex % this.workers.length];
    this.rrIndex++;
    return w;
  }

  private send<T>(type: WorkerRequestType, payload: AtmosphericCalculationPayload, timeoutMs = 10000): Promise<T> {
    const id = Math.random().toString(36).slice(2);
    const worker = this.nextWorker();
    if (!worker) {
      // Fallback: run on main thread
      return this.executeOnMainThread<T>(type, payload);
    }
    const req: WorkerRequest = { id, type, payload };
    return new Promise<T>((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error('Worker request timed out'));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timeout });
      try {
        worker.postMessage(req);
      } catch (e) {
        clearTimeout(timeout);
        this.pending.delete(id);
        // fallback main thread
        this.executeOnMainThread<T>(type, payload).then(resolve).catch(reject);
      }
    });
  }

  private async executeOnMainThread<T>(type: WorkerRequestType, payload: AtmosphericCalculationPayload): Promise<T> {
    const simulatorType = payload.simulatorType || this.fallbackSimulatorType;
    const simulator = createSimulator(simulatorType, payload.config || DEFAULT_PHYSICS_CONFIG);
    const cfg = validatePhysicsConfig(payload.config || DEFAULT_PHYSICS_CONFIG);
    if (type === 'calculate') {
      return simulator.calculateAtmosphericConditions(payload.planet, payload.timeOfDay || 0.5, cfg) as unknown as T;
    } else if (type === 'simulate') {
      return simulator.generateWeatherEvents(payload.planet, cfg) as unknown as T;
    } else {
      return simulator.simulateWeatherEvolution(payload.planet, payload.timeStep || 1, cfg) as unknown as T;
    }
  }

  calculateAsync(planet: Planet, timeOfDay: number, simulatorType: SimulatorType, config?: AtmosphericPhysicsConfig) {
    return this.send('calculate', { planet, timeOfDay, simulatorType, config });
  }
  generateEventsAsync(planet: Planet, simulatorType: SimulatorType, config?: AtmosphericPhysicsConfig) {
    return this.send('simulate', { planet, simulatorType, config });
  }
  evolveAsync(planet: Planet, timeStep: number, simulatorType: SimulatorType, config?: AtmosphericPhysicsConfig) {
    return this.send('evolve', { planet, timeStep, simulatorType, config });
  }
}

// Simple hook wrapper for React components
import { useEffect, useMemo } from 'react';
export function useAtmosphericWorker(size?: number) {
  const pool = useMemo(() => new AtmosphericWorkerPool(size), [size]);
  useEffect(() => () => pool.terminate(), [pool]);
  return pool;
}


