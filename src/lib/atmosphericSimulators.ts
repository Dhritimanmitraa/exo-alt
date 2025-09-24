import { Planet } from './filters';
import {
  AtmosphericPhysicsConfig,
  DEFAULT_PHYSICS_CONFIG,
  validatePhysicsConfig
} from './atmosphericPhysics';

export interface AtmosphericCondition {
  temperature: number; // Kelvin
  pressure: number; // Earth atmospheres
  windSpeed: number; // km/h
  humidity: number; // percentage
  visibility: number; // km
  uvIndex: number; // 0-15+
}

export interface WeatherEvent {
  id: string;
  name: string;
  description: string;
  probability: number; // 0-100
  severity: 'mild' | 'moderate' | 'severe' | 'extreme';
  effects: string[];
}

export interface WeatherPattern {
  type: 'storm' | 'clear' | 'cloudy' | 'extreme' | 'aurora' | 'rain';
  intensity: number; // 0-100
  duration: number; // hours
  description: string;
}

export interface IAtmosphericSimulator {
  calculateAtmosphericConditions(
    planet: Planet,
    timeOfDay: number,
    config: AtmosphericPhysicsConfig
  ): Promise<AtmosphericCondition>;

  generateWeatherEvents(
    planet: Planet,
    config: AtmosphericPhysicsConfig
  ): Promise<WeatherEvent[]>;

  simulateWeatherEvolution(
    planet: Planet,
    timeStep: number,
    config: AtmosphericPhysicsConfig
  ): Promise<WeatherPattern>;

  getSimulatorInfo(): { name: string; accuracy: 'heuristic' | 'physics'; performance: 'fast' | 'accurate' };
}

// performance helper retained for potential future metrics; not used currently
// eslint-disable-next-line @typescript-eslint/no-unused-vars
// time helper removed (unused)

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

import { AtmosphericComposition } from './atmosphericPhysics';

function greenhouseDeltaKFromComposition(comp: AtmosphericComposition): number {
  // Simple parametric greenhouse contribution using composition (very rough)
  const co2 = clamp((comp.CO2 || 0) / 100, 0, 1);
  const h2o = clamp((comp.H2O || 0) / 100, 0, 1);
  return 25 * co2 + 10 * Math.sqrt(h2o);
}

export class HeuristicSimulator implements IAtmosphericSimulator {
  getSimulatorInfo() {
    return { name: 'Heuristic Simulator', accuracy: 'heuristic', performance: 'fast' } as const;
  }

  async calculateAtmosphericConditions(planet: Planet, timeOfDay: number, cfg: AtmosphericPhysicsConfig): Promise<AtmosphericCondition> {
    // compute heuristic conditions
    const baseTemp = planet.pl_eqt || 255;
    const insolation = planet.pl_insol || 1;
    const radius = planet.pl_rade || 1;
    const tempVariation = Math.sin(timeOfDay * Math.PI * 2) * 20;
    const temperature = baseTemp + tempVariation;
    const pressure = radius * Math.sqrt(temperature / 255) * 0.5;
    const windSpeed = Math.abs(tempVariation) * (10 * cfg.windSpeedFactors.thermal) + insolation * (5 * cfg.windSpeedFactors.pressure);
    const humidity = Math.max(0, Math.min(100, temperature > 273 && temperature < 373 ? 60 : 5));
    const visibility = Math.max(0.1, 50 - windSpeed / 10);
    const uvIndex = Math.min(15, insolation * 5);
    return { temperature, pressure, windSpeed, humidity, visibility, uvIndex };
  }

  async generateWeatherEvents(planet: Planet, _cfg: AtmosphericPhysicsConfig): Promise<WeatherEvent[]> {
    const events: WeatherEvent[] = [];
    const temp = planet.pl_eqt || 255;
    const radius = planet.pl_rade || 1;
    const insolation = planet.pl_insol || 1;
    if (temp > 1000) {
      events.push({ id: 'lava-rain', name: 'Molten Rock Precipitation', description: 'Temperatures so extreme that rock vaporizes and condenses as molten droplets', probability: 85, severity: 'extreme', effects: ['Surface melting', 'Metal vapor clouds', 'Extreme radiation'] });
      events.push({ id: 'plasma-storms', name: 'Plasma Storm Systems', description: 'Ionized atmospheric particles create violent electromagnetic storms', probability: 70, severity: 'extreme', effects: ['Electromagnetic interference', 'Aurora-like displays', 'Particle radiation'] });
    }
    if (temp > 800 && temp <= 1000) {
      events.push({ id: 'metal-snow', name: 'Metallic Precipitation', description: 'Vaporized metals condense in the upper atmosphere and fall as metallic snow', probability: 60, severity: 'severe', effects: ['Metallic cloud formation', 'Conductive surface deposits', 'Extreme corrosion'] });
    }
    if (temp > 600 && radius > 3) {
      events.push({ id: 'diamond-rain', name: 'Diamond Rain Events', description: 'Extreme pressure and carbon-rich atmosphere create diamond precipitation', probability: 40, severity: 'moderate', effects: ['Crystalline precipitation', 'Pressure variations', 'Valuable surface deposits'] });
      events.push({ id: 'supersonic-winds', name: 'Supersonic Wind Storms', description: 'Atmospheric circulation creates winds exceeding the speed of sound', probability: 90, severity: 'extreme', effects: ['Sonic shockwaves', 'Rapid temperature changes', 'Atmospheric mixing'] });
    }
    if (temp > 200 && temp < 350 && radius > 0.5 && radius < 2) {
      events.push({ id: 'water-cycle', name: 'Liquid Water Weather', description: 'Traditional water-based precipitation and weather patterns', probability: 95, severity: 'mild', effects: ['Cloud formation', 'Precipitation cycles', 'Seasonal variations'] });
      events.push({ id: 'aurora', name: 'Auroral Displays', description: 'Magnetic field interactions create beautiful light displays', probability: 30, severity: 'mild', effects: ['Light phenomena', 'Particle interactions', 'Navigation interference'] });
    }
    if (temp < 200) {
      events.push({ id: 'nitrogen-snow', name: 'Nitrogen Snow Storms', description: 'Frozen nitrogen and other gases create alien snowfall patterns', probability: 70, severity: 'moderate', effects: ['Frozen gas precipitation', 'Sublimation cycles', 'Surface frost'] });
      events.push({ id: 'cryovolcanism', name: 'Ice Volcano Activity', description: 'Subsurface liquids erupt as ice and gas geysers', probability: 25, severity: 'moderate', effects: ['Ice geysers', 'Surface renewal', 'Atmospheric venting'] });
    }
    if (insolation > 10) {
      events.push({ id: 'radiation-storms', name: 'Stellar Radiation Storms', description: 'Intense stellar radiation creates dangerous atmospheric conditions', probability: 80, severity: 'severe', effects: ['High UV exposure', 'Atmospheric ionization', 'Radiation hazards'] });
    }
    if (planet.pl_orbper && planet.pl_orbper < 10) {
      events.push({ id: 'terminator-storms', name: 'Terminator Zone Cyclones', description: 'Extreme temperature differences create massive storm systems at day/night boundary', probability: 95, severity: 'extreme', effects: ['Extreme wind gradients', 'Temperature shocks', 'Atmospheric circulation'] });
    }
    return events;
  }

  async simulateWeatherEvolution(planet: Planet, timeStep: number, _cfg: AtmosphericPhysicsConfig): Promise<WeatherPattern> {
    const events = await this.generateWeatherEvents(planet, DEFAULT_PHYSICS_CONFIG);
    const choice = events.length ? events[Math.floor(Math.random() * events.length)] : null;
    const intensity = clamp(20 + Math.random() * 80, 0, 100);
    return {
      type: choice ? (choice.severity === 'extreme' ? 'extreme' : choice.severity === 'severe' ? 'storm' : 'cloudy') : 'clear',
      intensity,
      duration: Math.max(1, Math.round((timeStep || 1) * (2 + Math.random() * 10))),
      description: choice ? choice.description : 'Stable atmospheric conditions'
    };
  }
}

export class PhysicsSimulator implements IAtmosphericSimulator {
  getSimulatorInfo() {
    return { name: 'Physics-Based Simulator', accuracy: 'physics', performance: 'accurate' } as const;
  }

  private computeGravityMs2(planet: Planet, cfg: AtmosphericPhysicsConfig): number {
    const gEarth = cfg.earthGravity;
    const r = planet.pl_rade ?? 1; // Earth radii
    const massEarthUnits = planet.pl_bmasse ?? (planet.pl_rade ? Math.pow(planet.pl_rade, 3) : 1);
    // g = g_earth * (M/M_earth) / (R/R_earth)^2
    return gEarth * (massEarthUnits / Math.max(r * r, 1e-6));
  }

  private equilibriumTemperatureK(planet: Planet, cfg: AtmosphericPhysicsConfig, albedo: number): number {
    const S = (planet.pl_insol || 1) * cfg.solarConstant;
    const A = clamp(albedo, 0, 1);
    const T = Math.pow(((1 - A) * S) / (4 * cfg.stefanBoltzmann), 0.25);
    return T;
  }

  async calculateAtmosphericConditions(planet: Planet, timeOfDay: number, cfgInput: AtmosphericPhysicsConfig): Promise<AtmosphericCondition> {
    // compute physics-based conditions
    const cfg = validatePhysicsConfig(cfgInput);
    const gravity = this.computeGravityMs2(planet, cfg);
    const comp = cfg.defaultComposition ?? DEFAULT_PHYSICS_CONFIG.defaultComposition!;

    // Albedo heuristic based on temperature/radius
    const baseAlbedo = clamp(0.3 + ((planet.pl_rade || 1) - 1) * 0.05 - ((planet.pl_eqt || 255) - 255) / 2000, cfg.albedoRange.min, cfg.albedoRange.max);
    const Teq = this.equilibriumTemperatureK(planet, cfg, baseAlbedo);

    // Diurnal cycle
    const diurnalAmplitude = clamp(Teq * 0.05, 5, 50);
    const temperature = Teq + Math.sin(timeOfDay * Math.PI * 2) * diurnalAmplitude + greenhouseDeltaKFromComposition(comp);

    // Surface pressure: use scale height with ideal gas approximation
    // Compute mean molecular mass (kg/mol) from composition
    const molarMasses: Record<keyof AtmosphericComposition, number> = {
      N2: 0.028,
      O2: 0.032,
      CO2: 0.044,
      H2O: 0.018,
      He: 0.004,
      H2: 0.002,
      CH4: 0.016,
      NH3: 0.017,
      Ar: 0.040
    } as const;
    let meanMolarMass = 0.0;
    let accounted = 0.0;
    (Object.keys(molarMasses) as (keyof AtmosphericComposition)[]).forEach((k) => {
      const pct = (comp as any)[k] || 0;
      accounted += pct;
      meanMolarMass += (pct / 100) * molarMasses[k];
    });
    if (meanMolarMass <= 0) meanMolarMass = 0.029; // fallback to Earth-like
    const R = 8.314; // J/(mol·K)
    const H = (R * (temperature)) / (meanMolarMass * gravity); // scale height
    const referenceH = cfg.atmosphericScaleHeight;
    const pressureAtm = clamp(H / referenceH, 0.05, 50); // approx relative to Earth

    // Wind speed from thermal gradients, pressure gradients, and rotation proxy (orbital period)
    const thermal = diurnalAmplitude * 2 * cfg.windSpeedFactors.thermal;
    const pressure = Math.abs(pressureAtm - 1) * 50 * cfg.windSpeedFactors.pressure;
    const rotationFactor = planet.pl_orbper ? clamp(1 / Math.max(planet.pl_orbper, 0.1), 0, 10) : 0.5;
    const coriolis = rotationFactor * 30 * cfg.windSpeedFactors.rotation;
    const windSpeed = clamp((thermal + pressure + coriolis) * 3.6, 0, 5000); // convert m/s-ish to km/h rough

    const humidity = clamp(temperature > 273 && temperature < 373 ? 40 + diurnalAmplitude * 0.2 : 5, 0, 100);
    const visibility = clamp(60 - windSpeed / 15 - Math.abs(pressureAtm - 1) * 10, 0.1, 80);
    const uvIndex = clamp(((planet.pl_insol || 1) * 5) * (1 - baseAlbedo), 0, 20);

    return { temperature, pressure: pressureAtm, windSpeed, humidity, visibility, uvIndex };
  }

  async generateWeatherEvents(planet: Planet, cfg: AtmosphericPhysicsConfig): Promise<WeatherEvent[]> {
    // Start from heuristic events, then adjust probabilities by physics-based cues
    const heuristic = await new HeuristicSimulator().generateWeatherEvents(planet, cfg);
    const adjusted = heuristic.map(e => {
      let p = e.probability;
      if ((planet.pl_eqt || 0) > 1000 && e.severity === 'extreme') p = clamp(p + 10, 0, 100);
      if ((planet.pl_insol || 1) > 10 && e.id === 'radiation-storms') p = clamp(p + 10, 0, 100);
      return { ...e, probability: p };
    });
    return adjusted;
  }

  async simulateWeatherEvolution(planet: Planet, timeStep: number, cfg: AtmosphericPhysicsConfig): Promise<WeatherPattern> {
    const events = await this.generateWeatherEvents(planet, cfg);
    const gravity = this.computeGravityMs2(planet, cfg);
    const intense = (planet.pl_eqt || 255) > 800 || gravity > 15;
    const choice = events.sort((a, b) => b.probability - a.probability)[0];
    const type: WeatherPattern['type'] = intense ? 'storm' : choice ? (choice.severity === 'extreme' ? 'extreme' : 'cloudy') : 'clear';
    const intensity = clamp((intense ? 70 : 40) + Math.random() * 30, 0, 100);
    const duration = Math.max(1, Math.round((timeStep || 1) * (intense ? 12 : 6)));
    return { type, intensity, duration, description: choice ? choice.description : 'Stable atmospheric regime' };
  }
}

export type SimulatorType = 'heuristic' | 'physics';

export function createSimulator(type: SimulatorType, config?: AtmosphericPhysicsConfig): IAtmosphericSimulator {
  // validate to ensure downstream has sane defaults, even if not used here
  void validatePhysicsConfig(config || DEFAULT_PHYSICS_CONFIG);
  if (type === 'physics') return new PhysicsSimulator();
  return new HeuristicSimulator();
}


