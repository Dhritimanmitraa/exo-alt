import React, { useState, useEffect, useCallback } from 'react';
import { Planet } from '../lib/filters';
import { DEFAULT_PHYSICS_CONFIG, AtmosphericPhysicsConfig, validatePhysicsConfig, DEFAULT_COMPOSITIONS, PlanetType } from '../lib/atmosphericPhysics';
import { useAtmosphericWorker } from '../lib/atmosphericWorker';
import { SimulatorType } from '../lib/atmosphericSimulators';

interface WeatherPattern {
  type: 'storm' | 'clear' | 'cloudy' | 'extreme' | 'aurora' | 'rain';
  intensity: number; // 0-100
  duration: number; // hours
  description: string;
}

interface AtmosphericCondition {
  temperature: number; // Kelvin
  pressure: number; // Earth atmospheres
  windSpeed: number; // km/h
  humidity: number; // percentage
  visibility: number; // km
  uvIndex: number; // 0-15+
}

interface WeatherEvent {
  id: string;
  name: string;
  description: string;
  probability: number; // 0-100
  severity: 'mild' | 'moderate' | 'severe' | 'extreme';
  effects: string[];
}

interface WeatherSimulatorProps {
  planet: Planet;
  isOpen: boolean;
  onClose: () => void;
}

// Event generation handled by simulators via worker

// Conditions are computed by simulators via worker

// Weather animation component
function WeatherAnimation({ 
  intensity,
  planet
}: { 
  intensity: number;
  planet: Planet;
}) {
  const getAnimationStyle = () => {
    const baseOpacity = 0.3 + (intensity / 100) * 0.7;
    const temp = planet.pl_eqt || 255;
    
    // Ultra-hot planets (>2000K) - Dark with intense reds, oranges, yellows
    if (temp > 2000) {
      return {
        background: `linear-gradient(45deg, 
          rgba(40, 0, 0, ${baseOpacity * 1.2}) 0%,
          rgba(139, 0, 0, ${baseOpacity}) 20%,
          rgba(255, 69, 0, ${baseOpacity * 0.9}) 40%,
          rgba(255, 140, 0, ${baseOpacity * 0.8}) 60%,
          rgba(255, 215, 0, ${baseOpacity * 0.7}) 80%,
          rgba(255, 255, 100, ${baseOpacity * 0.6}) 100%)`,
        animation: 'extreme-flicker 1.5s ease-in-out infinite'
      };
    }
    
    // Very hot planets (1500-2000K) - Dark red to orange gradients
    if (temp > 1500) {
      return {
        background: `linear-gradient(135deg, 
          rgba(25, 0, 0, ${baseOpacity * 1.1}) 0%,
          rgba(139, 0, 0, ${baseOpacity}) 25%,
          rgba(220, 20, 60, ${baseOpacity * 0.9}) 50%,
          rgba(255, 69, 0, ${baseOpacity * 0.8}) 75%,
          rgba(255, 140, 0, ${baseOpacity * 0.7}) 100%)`,
        animation: 'storm-pulse 2s ease-in-out infinite'
      };
    }
    
    // Hot planets (1000-1500K) - Dark to red/orange
    if (temp > 1000) {
      return {
        background: `linear-gradient(45deg, 
          rgba(20, 10, 0, ${baseOpacity * 1.1}) 0%,
          rgba(139, 69, 19, ${baseOpacity}) 30%,
          rgba(178, 34, 34, ${baseOpacity * 0.9}) 60%,
          rgba(255, 69, 0, ${baseOpacity * 0.8}) 100%)`,
        animation: 'storm-pulse 2.5s ease-in-out infinite'
      };
    }
    
    // Warm planets (600-1000K) - Orange to yellow tones
    if (temp > 600) {
      return {
        background: `linear-gradient(45deg, 
          rgba(139, 69, 19, ${baseOpacity}) 0%,
          rgba(205, 92, 92, ${baseOpacity * 0.9}) 30%,
          rgba(255, 140, 0, ${baseOpacity * 0.8}) 70%,
          rgba(255, 215, 0, ${baseOpacity * 0.7}) 100%)`,
        animation: 'extreme-flicker 2s ease-in-out infinite'
      };
    }
    
    // Temperate planets (300-600K) - Blue to light blue
    if (temp > 300) {
      return {
        background: `linear-gradient(45deg, 
          rgba(25, 25, 112, ${baseOpacity}) 0%,
          rgba(70, 130, 180, ${baseOpacity * 0.9}) 40%,
          rgba(135, 206, 235, ${baseOpacity * 0.8}) 70%,
          rgba(173, 216, 230, ${baseOpacity * 0.7}) 100%)`,
        animation: 'aurora-wave 3s ease-in-out infinite'
      };
    }
    
    // Cold planets (<300K) - Deep blue to light blue
    return {
      background: `linear-gradient(45deg, 
        rgba(0, 0, 139, ${baseOpacity}) 0%,
        rgba(30, 144, 255, ${baseOpacity * 0.9}) 30%,
        rgba(135, 206, 250, ${baseOpacity * 0.8}) 70%,
        rgba(176, 224, 230, ${baseOpacity * 0.7}) 100%)`,
      animation: 'clear-glow 4s ease-in-out infinite'
    };
  };

  return (
    <div 
      className="absolute inset-0 rounded-lg pointer-events-none"
      style={getAnimationStyle()}
    />
  );
}

// Real-time weather display
function WeatherDisplay({ 
  conditions, 
  currentWeather,
  planet
}: { 
  conditions: AtmosphericCondition; 
  currentWeather: WeatherPattern;
  planet: Planet;
}) {
  const formatTemperature = (kelvin: number) => {
    const celsius = kelvin - 273.15;
    const fahrenheit = celsius * 9/5 + 32;
    return `${kelvin.toFixed(0)}K (${celsius.toFixed(0)}°C / ${fahrenheit.toFixed(0)}°F)`;
  };

  const getTemperatureColor = (temp: number) => {
    if (temp > 1000) return 'text-red-600';
    if (temp > 500) return 'text-orange-600';
    if (temp > 373) return 'text-yellow-600';
    if (temp > 273) return 'text-green-600';
    return 'text-blue-600';
  };

  const getWindDescription = (speed: number) => {
    if (speed > 1000) return 'Supersonic hurricane';
    if (speed > 300) return 'Devastating storm';
    if (speed > 150) return 'Extreme winds';
    if (speed > 80) return 'Strong winds';
    if (speed > 30) return 'Moderate breeze';
    return 'Light winds';
  };

  return (
    <div className="relative bg-gradient-to-br from-slate-800 to-slate-900 rounded-lg p-6 overflow-hidden border border-white/10 shadow-xl hover:shadow-2xl transition-all duration-300">
      <WeatherAnimation intensity={currentWeather.intensity} planet={planet} />
      
      <div className="relative z-10">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Conditions */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Current Conditions</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Temperature:</span>
                <span className={`font-bold ${getTemperatureColor(conditions.temperature)}`}>
                  {formatTemperature(conditions.temperature)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Pressure:</span>
                <span className="font-medium">
                  {conditions.pressure.toFixed(2)} atm
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Wind Speed:</span>
                <span className="font-medium text-blue-400">
                  {conditions.windSpeed.toFixed(0)} km/h
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Wind Condition:</span>
                <span className="font-medium text-orange-400">
                  {getWindDescription(conditions.windSpeed)}
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">Visibility:</span>
                <span className="font-medium text-green-400">
                  {conditions.visibility.toFixed(1)} km
                </span>
              </div>
              
              <div className="flex justify-between items-center">
                <span className="text-gray-300">UV Index:</span>
                <span className={`font-bold ${
                  conditions.uvIndex > 10 ? 'text-red-400' :
                  conditions.uvIndex > 6 ? 'text-orange-400' :
                  'text-green-400'
                }`}>
                  {conditions.uvIndex.toFixed(1)}
                </span>
              </div>
            </div>
          </div>

          {/* Weather Pattern */}
          <div>
            <h3 className="text-lg font-bold text-white mb-4">Weather Pattern</h3>
            <div className="space-y-3">
              <div>
                <span className="text-gray-300">Current Pattern:</span>
                <div className="font-bold text-purple-400 capitalize mt-1">
                  {currentWeather.type.replace('-', ' ')}
                </div>
              </div>
              
              <div>
                <span className="text-gray-300">Intensity:</span>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex-1 bg-gray-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full ${
                        currentWeather.intensity > 70 ? 'bg-red-500' :
                        currentWeather.intensity > 40 ? 'bg-yellow-500' :
                        'bg-green-500'
                      }`}
                      style={{ width: `${currentWeather.intensity}%` }}
                    />
                  </div>
                  <span className="text-sm font-medium text-white">
                    {currentWeather.intensity}%
                  </span>
                </div>
              </div>
              
              <div>
                <span className="text-gray-300">Duration:</span>
                <div className="font-medium text-white mt-1">
                  {currentWeather.duration} hours remaining
                </div>
              </div>
              
              <div>
                <span className="text-gray-300">Description:</span>
                <div className="text-sm text-gray-200 mt-1">
                  {currentWeather.description}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Weather events list
function WeatherEventsList({ events }: { events: WeatherEvent[] }) {
  const getSeverityColor = (severity: WeatherEvent['severity']) => {
    switch (severity) {
      case 'mild': return 'bg-green-100 text-green-800 border-green-200';
      case 'moderate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'severe': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'extreme': return 'bg-red-100 text-red-800 border-red-200';
    }
  };

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-bold text-white">Possible Weather Events</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {events.map((event) => (
          <div key={event.id} className="bg-slate-800 rounded-lg border border-white/20 p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:bg-slate-700 hover:scale-105">
            <div className="flex justify-between items-start mb-3">
              <h4 className="font-bold text-white">{event.name}</h4>
              <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getSeverityColor(event.severity)}`}>
                {event.severity.toUpperCase()}
              </span>
            </div>
            
            <p className="text-sm text-gray-200 mb-3">{event.description}</p>
            
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-300">Probability:</span>
                <span className="text-sm font-medium text-white">{event.probability}%</span>
              </div>
              
              <div>
                <span className="text-sm text-gray-300">Effects:</span>
                <ul className="text-xs text-gray-200 mt-1 space-y-1">
                  {event.effects.map((effect, index) => (
                    <li key={index} className="flex items-center gap-1">
                      <span className="text-blue-500">•</span>
                      {effect}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// Time control component
function TimeControl({ 
  timeOfDay, 
  setTimeOfDay, 
  isPlaying, 
  setIsPlaying 
}: {
  timeOfDay: number;
  setTimeOfDay: (time: number) => void;
  isPlaying: boolean;
  setIsPlaying: (playing: boolean) => void;
}) {
  const formatTime = (time: number) => {
    const hours = Math.floor(time * 24);
    const minutes = Math.floor((time * 24 * 60) % 60);
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-slate-800 rounded-lg border border-white/20 p-4 shadow-lg hover:shadow-xl transition-all duration-300">
      <h3 className="text-lg font-bold text-white mb-4">Time Control</h3>
      
      <div className="space-y-4">
        <div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-300">Local Time:</span>
            <span className="font-bold text-blue-400">{formatTime(timeOfDay)}</span>
          </div>
          
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={timeOfDay}
            onChange={(e) => setTimeOfDay(parseFloat(e.target.value))}
            className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <button
          onClick={() => setIsPlaying(!isPlaying)}
          className={`w-full py-2 px-4 rounded-lg font-medium transition-colors ${
            isPlaying 
              ? 'bg-red-900 text-red-300 hover:bg-red-800' 
              : 'bg-green-900 text-green-300 hover:bg-green-800'
          }`}
        >
          {isPlaying ? '⏸ Pause Simulation' : '▶ Play Simulation'}
        </button>
      </div>
    </div>
  );
}

// Main weather simulator component
const WeatherSimulator: React.FC<WeatherSimulatorProps> = ({ 
  planet, 
  isOpen, 
  onClose 
}) => {
  const [timeOfDay, setTimeOfDay] = useState(0.5); // 0 = midnight, 0.5 = noon, 1 = midnight
  const [isPlaying, setIsPlaying] = useState(false);
  const [physicsConfig, setPhysicsConfig] = useState<AtmosphericPhysicsConfig>(DEFAULT_PHYSICS_CONFIG);
  const [simulatorType, setSimulatorType] = useState<SimulatorType>('heuristic');
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isCompositionOpen, setIsCompositionOpen] = useState(false);
  const [isAltitudeOpen, setIsAltitudeOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastCalcMs, setLastCalcMs] = useState<number | null>(null);
  const [currentWeather, setCurrentWeather] = useState<WeatherPattern>({
    type: 'clear',
    intensity: 30,
    duration: 6,
    description: 'Clear atmospheric conditions with normal visibility'
  });
  const [weatherEvents, setWeatherEvents] = useState<WeatherEvent[]>([]);
  const [currentConditions, setCurrentConditions] = useState<AtmosphericCondition>({
    temperature: planet.pl_eqt || 255,
    pressure: 1,
    windSpeed: 10,
    humidity: 40,
    visibility: 50,
    uvIndex: 5
  });

  const worker = useAtmosphericWorker();

  // Generate weather events when planet or simulator changes
  useEffect(() => {
    let active = true;
    setError(null);
    worker
      .generateEventsAsync(planet, simulatorType, physicsConfig)
      .then((events) => { if (active) setWeatherEvents(events as WeatherEvent[]); })
      .catch((e) => { if (active) setError(e.message || 'Failed to generate events'); });

    // Set initial weather based on planet conditions (quick heuristic)
    const temp = planet.pl_eqt || 255;
    if (temp > 1000) {
      setCurrentWeather({ type: 'extreme', intensity: 90, duration: 12, description: 'Extreme heat creating hostile surface conditions with molten surfaces' });
    } else if (temp > 600) {
      setCurrentWeather({ type: 'storm', intensity: 70, duration: 8, description: 'Violent atmospheric storms with extreme wind patterns' });
    } else if (temp < 200) {
      setCurrentWeather({ type: 'cloudy', intensity: 40, duration: 10, description: 'Frozen atmospheric conditions with ice crystal formations' });
    } else {
      setCurrentWeather({ type: 'clear', intensity: 30, duration: 6, description: 'Stable atmospheric conditions suitable for observation' });
    }

    return () => { active = false; };
  }, [planet, simulatorType, physicsConfig, worker]);

  // Animation loop for time progression
  useEffect(() => {
    let interval: number;
    
    if (isPlaying) {
      interval = setInterval(() => {
        setTimeOfDay(prev => (prev + 0.01) % 1); // 100 steps per day
      }, 100); // Update every 100ms
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying]);

  // Update weather patterns based on time and planet characteristics (using backend evolution)
  const updateWeatherPattern = useCallback(() => {
    worker
      .evolveAsync(planet, 1, simulatorType, physicsConfig)
      .then((pattern) => setCurrentWeather(pattern as WeatherPattern))
      .catch(() => {
        // ignore evolution errors, keep prior state
      });
  }, [planet, simulatorType, physicsConfig, worker]);

  // Randomly update weather patterns
  useEffect(() => {
    const weatherInterval = setInterval(updateWeatherPattern, 5000); // Every 5 seconds
    return () => clearInterval(weatherInterval);
  }, [updateWeatherPattern]);

  // Compute current atmospheric conditions asynchronously
  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    const t0 = performance.now();
    const cfg = validatePhysicsConfig(physicsConfig);
    worker
      .calculateAsync(planet, timeOfDay, simulatorType, cfg)
      .then((cond) => {
        if (!active) return;
        setCurrentConditions(cond as AtmosphericCondition);
        setLastCalcMs(performance.now() - t0);
      })
      .catch((e) => { if (active) setError(e.message || 'Calculation failed'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [planet, timeOfDay, simulatorType, physicsConfig, worker]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    
    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }
    
    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-7xl mx-auto bg-slate-900 rounded-lg shadow-2xl border border-slate-700">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-slate-700 bg-slate-800 rounded-t-lg">
            <div>
              <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                🌦️ Weather Simulator
              </h2>
              <p className="text-gray-300 mt-1">
                Real-time atmospheric conditions on {planet.pl_name}
              </p>
              <div className="text-xs text-gray-400 mt-1">
                Backend: <span className="font-semibold">{simulatorType}</span>
                {lastCalcMs != null && (
                  <span className="ml-2">Last calc: {lastCalcMs.toFixed(1)} ms</span>
                )}
                {loading && <span className="ml-2 text-blue-300">calculating…</span>}
                {error && <span className="ml-2 text-red-400">{error}</span>}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 space-y-6">
            {/* Configuration Panel */}
            <div className="bg-slate-800 rounded-lg border border-white/20">
              <button className="w-full text-left px-4 py-3 font-semibold text-white flex items-center justify-between" onClick={() => setIsConfigOpen(v => !v)}>
                <span>Simulation Configuration</span>
                <span className="text-sm text-gray-300">{isConfigOpen ? 'Hide' : 'Show'}</span>
              </button>
              {isConfigOpen && (
                <div className="px-4 pb-4 grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">Backend</label>
                    <select
                      value={simulatorType}
                      onChange={(e) => setSimulatorType((e.target.value as SimulatorType) || 'heuristic')}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white"
                    >
                      <option value="heuristic">Heuristic (fast)</option>
                      <option value="physics">Physics (accurate)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">Albedo min</label>
                    <input type="number" step="0.01" min="0" max="1" value={physicsConfig.albedoRange.min}
                      onChange={(e) => setPhysicsConfig(validatePhysicsConfig({ ...physicsConfig, albedoRange: { ...physicsConfig.albedoRange, min: Number(e.target.value) } }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">Albedo max</label>
                    <input type="number" step="0.01" min="0" max="1" value={physicsConfig.albedoRange.max}
                      onChange={(e) => setPhysicsConfig(validatePhysicsConfig({ ...physicsConfig, albedoRange: { ...physicsConfig.albedoRange, max: Number(e.target.value) } }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">Thermal factor</label>
                    <input type="number" step="0.01" value={physicsConfig.windSpeedFactors.thermal}
                      onChange={(e) => setPhysicsConfig(validatePhysicsConfig({ ...physicsConfig, windSpeedFactors: { ...physicsConfig.windSpeedFactors, thermal: Number(e.target.value) } }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">Pressure factor</label>
                    <input type="number" step="0.01" value={physicsConfig.windSpeedFactors.pressure}
                      onChange={(e) => setPhysicsConfig(validatePhysicsConfig({ ...physicsConfig, windSpeedFactors: { ...physicsConfig.windSpeedFactors, pressure: Number(e.target.value) } }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">Rotation factor</label>
                    <input type="number" step="0.01" value={physicsConfig.windSpeedFactors.rotation}
                      onChange={(e) => setPhysicsConfig(validatePhysicsConfig({ ...physicsConfig, windSpeedFactors: { ...physicsConfig.windSpeedFactors, rotation: Number(e.target.value) } }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">Solar constant (W/m²)</label>
                    <input type="number" step="1" value={physicsConfig.solarConstant}
                      onChange={(e) => setPhysicsConfig(validatePhysicsConfig({ ...physicsConfig, solarConstant: Number(e.target.value) }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">Stefan–Boltzmann (W·m⁻²·K⁻⁴)</label>
                    <input type="number" step="1e-9" value={physicsConfig.stefanBoltzmann}
                      onChange={(e) => setPhysicsConfig(validatePhysicsConfig({ ...physicsConfig, stefanBoltzmann: Number(e.target.value) }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">Reference scale height H₀ (m)</label>
                    <input type="number" step="100" value={physicsConfig.atmosphericScaleHeight}
                      onChange={(e) => setPhysicsConfig(validatePhysicsConfig({ ...physicsConfig, atmosphericScaleHeight: Number(e.target.value) }))}
                      className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white" />
                  </div>
                  <div className="space-y-2">
                    <label className="block text-sm text-gray-300">Presets</label>
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={() => setPhysicsConfig(DEFAULT_PHYSICS_CONFIG)} className="px-3 py-1 bg-slate-700 rounded text-white text-sm hover:bg-slate-600">Earth-like</button>
                      <button onClick={() => setPhysicsConfig(validatePhysicsConfig({ ...DEFAULT_PHYSICS_CONFIG, albedoRange: { min: 0.05, max: 0.2 }, windSpeedFactors: { thermal: 0.2, pressure: 0.1, rotation: 0.05 } }))} className="px-3 py-1 bg-slate-700 rounded text-white text-sm hover:bg-slate-600">Hot Jupiter</button>
                      <button onClick={() => setPhysicsConfig(validatePhysicsConfig({ ...DEFAULT_PHYSICS_CONFIG, albedoRange: { min: 0.5, max: 0.8 } }))} className="px-3 py-1 bg-slate-700 rounded text-white text-sm hover:bg-slate-600">Ice World</button>
                      <button onClick={() => setPhysicsConfig(validatePhysicsConfig({ ...physicsConfig, defaultComposition: DEFAULT_COMPOSITIONS[PlanetType.terrestrial] }))} className="px-3 py-1 bg-slate-700 rounded text-white text-sm hover:bg-slate-600">Terrestrial Atmosphere</button>
                      <button onClick={() => setPhysicsConfig(validatePhysicsConfig({ ...physicsConfig, defaultComposition: DEFAULT_COMPOSITIONS[PlanetType.gas_giant] }))} className="px-3 py-1 bg-slate-700 rounded text-white text-sm hover:bg-slate-600">Gas Giant Atmosphere</button>
                      <button onClick={() => setPhysicsConfig(validatePhysicsConfig({ ...physicsConfig, defaultComposition: DEFAULT_COMPOSITIONS[PlanetType.ice_giant] }))} className="px-3 py-1 bg-slate-700 rounded text-white text-sm hover:bg-slate-600">Ice Giant Atmosphere</button>
                      <button onClick={() => setPhysicsConfig(validatePhysicsConfig({ ...physicsConfig, defaultComposition: DEFAULT_COMPOSITIONS[PlanetType.hot_jupiter] }))} className="px-3 py-1 bg-slate-700 rounded text-white text-sm hover:bg-slate-600">Hot Jupiter Atmosphere</button>
                    </div>
                  </div>
                </div>
              )}
            </div>
            {/* Current Weather Display */}
            <WeatherDisplay 
              conditions={currentConditions} 
              currentWeather={currentWeather}
              planet={planet}
            />

            {/* Composition Panel */}
            <div className="bg-slate-800 rounded-lg border border-white/20">
              <button className="w-full text-left px-4 py-3 font-semibold text-white flex items-center justify-between" onClick={() => setIsCompositionOpen(v => !v)}>
                <span>Atmospheric Composition</span>
                <span className="text-sm text-gray-300">{isCompositionOpen ? 'Hide' : 'Show'}</span>
              </button>
              {isCompositionOpen && (
                <div className="px-4 pb-4 grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                  {Object.entries(physicsConfig.defaultComposition || {}).map(([k, v]) => (
                    <div key={k} className="flex justify-between bg-slate-900 border border-slate-700 rounded px-2 py-1 text-white">
                      <span className="text-gray-300">{k}</span>
                      <span className="font-semibold">{(v as number).toFixed(2)}%</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Altitude Profile Panel */}
            <AltitudeProfile
              planet={planet}
              physicsConfig={physicsConfig}
              basePressureAtm={currentConditions.pressure}
              temperatureK={currentConditions.temperature}
              simulatorType={simulatorType}
              isOpen={isAltitudeOpen}
              setIsOpen={setIsAltitudeOpen}
            />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Time Control */}
              <div className="lg:col-span-1">
                <TimeControl
                  timeOfDay={timeOfDay}
                  setTimeOfDay={setTimeOfDay}
                  isPlaying={isPlaying}
                  setIsPlaying={setIsPlaying}
                />
              </div>
              
              {/* Weather Events */}
              <div className="lg:col-span-2">
                <WeatherEventsList events={weatherEvents} />
              </div>
            </div>

            {/* Planet Info */}
            <div className="bg-blue-50 rounded-lg p-4 border border-blue-200 shadow-md hover:shadow-lg transition-all duration-300 hover:bg-blue-100">
              <h3 className="font-bold text-blue-900 mb-2">Planet Characteristics</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-blue-700">Temperature:</span>
                  <div className="font-bold">{planet.pl_eqt?.toFixed(0) || 'Unknown'} K</div>
                </div>
                <div>
                  <span className="text-blue-700">Size:</span>
                  <div className="font-bold">{planet.pl_rade?.toFixed(1) || 'Unknown'} R⊕</div>
                </div>
                <div>
                  <span className="text-blue-700">Insolation:</span>
                  <div className="font-bold">{planet.pl_insol?.toFixed(1) || 'Unknown'} S⊕</div>
                </div>
                <div>
                  <span className="text-blue-700">Period:</span>
                  <div className="font-bold">{planet.pl_orbper?.toFixed(1) || 'Unknown'} days</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      
      {/* Custom CSS for animations */}
      <style>{`
        @keyframes storm-pulse {
          0%, 100% { 
            opacity: 0.4; 
            filter: brightness(1);
          }
          50% { 
            opacity: 0.9; 
            filter: brightness(1.2);
          }
        }
        
        @keyframes extreme-flicker {
          0%, 100% { 
            opacity: 0.5; 
            filter: brightness(1) saturate(1);
          }
          25% { 
            opacity: 0.95; 
            filter: brightness(1.4) saturate(1.3);
          }
          75% { 
            opacity: 0.4; 
            filter: brightness(0.8) saturate(1.1);
          }
        }
        
        @keyframes aurora-wave {
          0%, 100% { 
            transform: translateX(0); 
            opacity: 0.5; 
            filter: brightness(1);
          }
          50% { 
            transform: translateX(8px); 
            opacity: 0.8; 
            filter: brightness(1.1);
          }
        }
        
        @keyframes rain-fall {
          0% { 
            transform: translateY(-10px); 
            opacity: 0.8; 
          }
          100% { 
            transform: translateY(10px); 
            opacity: 0.4; 
          }
        }
        
        @keyframes cloud-drift {
          0%, 100% { 
            transform: translateX(0); 
            opacity: 0.6;
          }
          50% { 
            transform: translateX(6px); 
            opacity: 0.8;
          }
        }
        
        @keyframes clear-glow {
          0%, 100% { 
            opacity: 0.3; 
            filter: brightness(1);
          }
          50% { 
            opacity: 0.6; 
            filter: brightness(1.1);
          }
        }
      `}</style>
    </div>
  );
};

export default WeatherSimulator;

// Collapsible altitude profile panel
function AltitudeProfile({
  planet,
  physicsConfig,
  basePressureAtm,
  temperatureK,
  simulatorType,
  isOpen,
  setIsOpen
}: {
  planet: Planet;
  physicsConfig: AtmosphericPhysicsConfig;
  basePressureAtm: number;
  temperatureK: number;
  simulatorType: SimulatorType;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
}) {
  const cfg = validatePhysicsConfig(physicsConfig);

  // gravity using same relation as PhysicsSimulator
  const r = planet.pl_rade ?? 1;
  const massEarthUnits = planet.pl_bmasse ?? (planet.pl_rade ? Math.pow(planet.pl_rade, 3) : 1);
  const g = cfg.earthGravity * (massEarthUnits / Math.max(r * r, 1e-6));

  // mean molar mass from composition
  const comp = cfg.defaultComposition || DEFAULT_PHYSICS_CONFIG.defaultComposition;
  const molarMasses: Record<string, number> = { N2: 0.028, O2: 0.032, CO2: 0.044, H2O: 0.018, He: 0.004, H2: 0.002, CH4: 0.016, NH3: 0.017, Ar: 0.040 };
  let meanMolarMass = 0;
  Object.keys(molarMasses).forEach(k => {
    const pct = (comp as any)[k] || 0;
    meanMolarMass += (pct / 100) * molarMasses[k];
  });
  if (meanMolarMass <= 0) meanMolarMass = 0.029;

  const R = 8.314; // J/(mol·K)
  const H = (R * temperatureK) / (meanMolarMass * g); // m

  const altitudesKm = [0, 5, 10, 20, 30, 40, 50];
  const profile = altitudesKm.map(km => {
    const z = km * 1000;
    const p = basePressureAtm * Math.exp(-z / Math.max(H, 1));
    return { km, p };
  });

  return (
    <div className="bg-slate-800 rounded-lg border border-white/20">
      <button className="w-full text-left px-4 py-3 font-semibold text-white flex items-center justify-between" onClick={() => setIsOpen(!isOpen)}>
        <span>Pressure vs Altitude</span>
        <span className="text-sm text-gray-300">{isOpen ? 'Hide' : 'Show'}</span>
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          <div className="text-xs text-gray-400 mb-2 flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full border border-green-400 text-green-300">physics-based</span>
            <span>H ≈ {(H/1000).toFixed(1)} km, g ≈ {g.toFixed(2)} m/s² ({simulatorType})</span>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-2">
            {profile.map(({ km, p }) => (
              <div key={km} className="bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm flex flex-col items-center">
                <div className="text-gray-300">{km} km</div>
                <div className="font-semibold">{p.toFixed(2)} atm</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}