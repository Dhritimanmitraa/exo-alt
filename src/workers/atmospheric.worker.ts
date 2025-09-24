import { createSimulator } from '../lib/atmosphericSimulators';
import { validatePhysicsConfig, DEFAULT_PHYSICS_CONFIG } from '../lib/atmosphericPhysics';

function nowMs() {
	return (self as any).performance && (self as any).performance.now ? (self as any).performance.now() : Date.now();
}

(self as any).onmessage = async (event: MessageEvent) => {
	const req = (event as any).data;
	const start = nowMs();
	try {
		const { type, payload } = req;
		const simulator = createSimulator(payload.simulatorType || 'heuristic', payload.config || DEFAULT_PHYSICS_CONFIG);
		const cfg = validatePhysicsConfig(payload.config || DEFAULT_PHYSICS_CONFIG);
		let data: any;
		if (type === 'calculate') {
			data = await simulator.calculateAtmosphericConditions(payload.planet, payload.timeOfDay || 0.5, cfg);
		} else if (type === 'simulate') {
			data = await simulator.generateWeatherEvents(payload.planet, cfg);
		} else if (type === 'evolve') {
			data = await simulator.simulateWeatherEvolution(payload.planet, payload.timeStep || 1, cfg);
		} else {
			throw new Error('Unknown request type');
		}
		const elapsedMs = nowMs() - start;
		(self as any).postMessage({ id: req.id, success: true, data, metrics: { elapsedMs } });
	} catch (e: any) {
		const elapsedMs = nowMs() - start;
		(self as any).postMessage({ id: req.id, success: false, error: (e && e.message) || String(e), metrics: { elapsedMs } });
	}
};


