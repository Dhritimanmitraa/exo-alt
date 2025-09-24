import { Planet } from './filters';

export interface AlbedoRange {
  min: number;
  max: number;
}

export interface WindSpeedFactors {
  thermal: number;
  pressure: number;
  rotation: number;
}

export interface AtmosphericComposition {
  N2: number;
  O2: number;
  CO2: number;
  H2O: number;
  He?: number;
  H2?: number;
  CH4?: number;
  NH3?: number;
  Ar?: number;
  // percent values should sum close to 100
}

export enum PlanetType {
  terrestrial = 'terrestrial',
  gas_giant = 'gas_giant',
  ice_giant = 'ice_giant',
  hot_jupiter = 'hot_jupiter'
}

export interface AtmosphericPhysicsConfig {
  gasConstant: number; // J/(kmol·K) universal gas constant
  stefanBoltzmann: number; // W/(m²·K⁴)
  earthGravity: number; // m/s²
  earthRadius: number; // m
  earthMass: number; // kg
  solarConstant: number; // W/m² at 1 AU
  albedoRange: AlbedoRange;
  atmosphericScaleHeight: number; // m
  windSpeedFactors: WindSpeedFactors;
  defaultPlanetType?: PlanetType;
  defaultComposition?: AtmosphericComposition;
}

export const DEFAULT_COMPOSITIONS: Record<PlanetType, AtmosphericComposition> = {
  [PlanetType.terrestrial]: { N2: 78, O2: 21, Ar: 1, CO2: 0.04, H2O: 1 },
  [PlanetType.gas_giant]: { H2: 89, He: 10, CH4: 1, N2: 0, O2: 0, CO2: 0, H2O: 0 },
  [PlanetType.ice_giant]: { H2: 80, He: 19, CH4: 1, N2: 0, O2: 0, CO2: 0, H2O: 0 },
  [PlanetType.hot_jupiter]: { H2: 85, He: 14, H2O: 1, N2: 0, O2: 0, CO2: 0 }
};

export const DEFAULT_PHYSICS_CONFIG: AtmosphericPhysicsConfig = {
  gasConstant: 8314.46,
  stefanBoltzmann: 5.67e-8,
  earthGravity: 9.81,
  earthRadius: 6.371e6,
  earthMass: 5.972e24,
  solarConstant: 1361,
  albedoRange: { min: 0.1, max: 0.9 },
  atmosphericScaleHeight: 8400,
  windSpeedFactors: { thermal: 0.1, pressure: 0.05, rotation: 0.02 },
  defaultPlanetType: PlanetType.terrestrial,
  defaultComposition: DEFAULT_COMPOSITIONS[PlanetType.terrestrial]
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function normalizeComposition(comp: Partial<AtmosphericComposition> | undefined): AtmosphericComposition {
  const base: AtmosphericComposition = {
    N2: 78,
    O2: 21,
    CO2: 0.04,
    H2O: 1,
    He: 0,
    H2: 0,
    CH4: 0,
    NH3: 0,
    Ar: 0
  };
  const merged: any = { ...base, ...(comp || {}) };
  const total = Object.values(merged).reduce((a: number, b: any) => a + (typeof b === 'number' ? b : 0), 0);
  if (total <= 0) return base;
  const scale = 100 / total;
  Object.keys(merged).forEach(k => {
    if (typeof merged[k] === 'number') merged[k] = clamp(merged[k] * scale, 0, 100);
  });
  return merged as AtmosphericComposition;
}

export function validatePhysicsConfig(config: Partial<AtmosphericPhysicsConfig>): AtmosphericPhysicsConfig {
  const merged: AtmosphericPhysicsConfig = {
    ...DEFAULT_PHYSICS_CONFIG,
    ...config,
    albedoRange: {
      min: clamp(config.albedoRange?.min ?? DEFAULT_PHYSICS_CONFIG.albedoRange.min, 0, 1),
      max: clamp(config.albedoRange?.max ?? DEFAULT_PHYSICS_CONFIG.albedoRange.max, 0, 1)
    },
    windSpeedFactors: {
      thermal: clamp(config.windSpeedFactors?.thermal ?? DEFAULT_PHYSICS_CONFIG.windSpeedFactors.thermal, 0, 10),
      pressure: clamp(config.windSpeedFactors?.pressure ?? DEFAULT_PHYSICS_CONFIG.windSpeedFactors.pressure, 0, 10),
      rotation: clamp(config.windSpeedFactors?.rotation ?? DEFAULT_PHYSICS_CONFIG.windSpeedFactors.rotation, 0, 10)
    },
    defaultComposition: normalizeComposition(config.defaultComposition ?? DEFAULT_PHYSICS_CONFIG.defaultComposition)
  };
  if (merged.albedoRange.min > merged.albedoRange.max) {
    const mid = (merged.albedoRange.min + merged.albedoRange.max) / 2;
    merged.albedoRange.min = mid - 0.05;
    merged.albedoRange.max = mid + 0.05;
    merged.albedoRange.min = clamp(merged.albedoRange.min, 0, 1);
    merged.albedoRange.max = clamp(merged.albedoRange.max, 0, 1);
  }
  return merged;
}

export function getDefaultPlanetType(planet: Planet): PlanetType {
  if (planet.pl_rade != null) {
    if (planet.pl_rade > 8) return PlanetType.gas_giant;
    if (planet.pl_rade > 3) return PlanetType.ice_giant;
  }
  if ((planet.pl_eqt || 0) > 800 && (planet.pl_rade || 0) > 3) return PlanetType.hot_jupiter;
  return PlanetType.terrestrial;
}

export function getDefaultCompositionForPlanet(planet: Planet): AtmosphericComposition {
  const type = getDefaultPlanetType(planet);
  return DEFAULT_COMPOSITIONS[type];
}


