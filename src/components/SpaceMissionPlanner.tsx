import React, { useState, useEffect } from 'react';
import { Planet } from '../lib/filters';

interface SpaceMission {
  id: string;
  name: string;
  targetPlanet: Planet;
  missionType: 'probe' | 'telescope' | 'crewed' | 'colony';
  launchDate: Date;
  travelTime: number; // years
  cost: number; // billion USD
  technology: TechnologyRequirement[];
  objectives: string[];
  riskLevel: 'low' | 'medium' | 'high' | 'extreme';
  feasibility: number; // 0-100 score
}

interface TechnologyRequirement {
  name: string;
  description: string;
  currentReadiness: number; // 1-9 TRL scale
  requiredReadiness: number;
  estimatedDevelopmentTime: number; // years
  cost: number; // billion USD
}

interface SpaceMissionPlannerProps {
  planets: Planet[];
  isOpen: boolean;
  onClose: () => void;
}

// Propulsion technologies and their specifications
const PROPULSION_TYPES = {
  chemical: {
    name: 'Chemical Rockets',
    maxVelocity: 0.01, // % of light speed
    developmentCost: 0.1,
    readiness: 9,
    description: 'Current technology, reliable but slow'
  },
  nuclear: {
    name: 'Nuclear Pulse Propulsion',
    maxVelocity: 0.05,
    developmentCost: 5,
    readiness: 4,
    description: 'Theoretical, significant development needed'
  },
  fusion: {
    name: 'Fusion Ramjet',
    maxVelocity: 0.12,
    developmentCost: 20,
    readiness: 2,
    description: 'Far future technology, breakthrough required'
  },
  antimatter: {
    name: 'Antimatter Drive',
    maxVelocity: 0.25,
    developmentCost: 100,
    readiness: 1,
    description: 'Theoretical only, massive challenges'
  }
};

// Mission objectives templates
const MISSION_OBJECTIVES = {
  probe: [
    'Flyby observations and photography',
    'Atmospheric composition analysis',
    'Magnetic field measurements',
    'Surface composition spectroscopy',
    'Search for biosignatures'
  ],
  telescope: [
    'Direct exoplanet imaging',
    'Atmospheric spectroscopy',
    'Search for water vapor',
    'Monitor stellar activity',
    'Long-term habitability assessment'
  ],
  crewed: [
    'Establish orbital research station',
    'Surface exploration missions',
    'Sample collection and analysis',
    'Technology demonstration',
    'Search for microbial life'
  ],
  colony: [
    'Establish permanent settlement',
    'Terraforming preparation',
    'Resource extraction setup',
    'Self-sustaining ecosystem',
    'Population expansion planning'
  ]
};

// Calculate travel time based on distance and propulsion
const calculateTravelTime = (distance: number, propulsion: keyof typeof PROPULSION_TYPES): number => {
  const distanceKm = distance * 3.086e13; // parsecs to km
  const speedOfLight = 299792458000; // m/s
  const maxSpeed = speedOfLight * PROPULSION_TYPES[propulsion].maxVelocity;
  const travelTimeSeconds = distanceKm * 1000 / maxSpeed;
  return travelTimeSeconds / (365.25 * 24 * 3600); // convert to years
};

// Calculate mission cost
const calculateMissionCost = (
  planet: Planet,
  missionType: SpaceMission['missionType'],
  propulsion: keyof typeof PROPULSION_TYPES
): number => {
  const baseCosts = {
    probe: 2,
    telescope: 8,
    crewed: 100,
    colony: 1000
  };
  
  const distance = planet.sy_dist || 100;
  const distanceMultiplier = Math.log10(distance + 1);
  const propulsionCost = PROPULSION_TYPES[propulsion].developmentCost;
  
  return baseCosts[missionType] * distanceMultiplier + propulsionCost;
};

// Calculate feasibility score
const calculateFeasibility = (
  planet: Planet,
  missionType: SpaceMission['missionType'],
  propulsion: keyof typeof PROPULSION_TYPES
): number => {
  let score = 100;
  
  // Distance penalty
  const distance = planet.sy_dist || 100;
  score -= Math.min(50, distance * 2);
  
  // Technology readiness penalty
  const readiness = PROPULSION_TYPES[propulsion].readiness;
  score -= (9 - readiness) * 10;
  
  // Mission complexity penalty
  const complexityPenalty = {
    probe: 0,
    telescope: 5,
    crewed: 30,
    colony: 60
  };
  score -= complexityPenalty[missionType];
  
  // Habitability bonus for relevant missions
  if (missionType === 'crewed' || missionType === 'colony') {
    const temp = planet.pl_eqt || 0;
    if (temp > 200 && temp < 350) score += 20;
    if (planet.pl_rade && planet.pl_rade > 0.5 && planet.pl_rade < 2) score += 10;
  }
  
  return Math.max(0, Math.min(100, score));
};

// Mission planning form
function MissionPlannerForm({
  planets,
  onCreateMission
}: {
  planets: Planet[];
  onCreateMission: (mission: SpaceMission) => void;
}) {
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [missionName, setMissionName] = useState('');
  const [missionType, setMissionType] = useState<SpaceMission['missionType']>('probe');
  const [propulsion, setPropulsion] = useState<keyof typeof PROPULSION_TYPES>('chemical');
  const [launchDate, setLaunchDate] = useState(new Date(2030, 0, 1));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPlanet || !missionName.trim()) return;

    const travelTime = calculateTravelTime(selectedPlanet.sy_dist || 100, propulsion);
    const cost = calculateMissionCost(selectedPlanet, missionType, propulsion);
    const feasibility = calculateFeasibility(selectedPlanet, missionType, propulsion);

    const objectives = MISSION_OBJECTIVES[missionType];
    const riskLevel: SpaceMission['riskLevel'] = 
      feasibility > 70 ? 'low' :
      feasibility > 50 ? 'medium' :
      feasibility > 30 ? 'high' : 'extreme';

    const technology: TechnologyRequirement[] = [
      {
        name: PROPULSION_TYPES[propulsion].name,
        description: PROPULSION_TYPES[propulsion].description,
        currentReadiness: PROPULSION_TYPES[propulsion].readiness,
        requiredReadiness: 8,
        estimatedDevelopmentTime: Math.max(0, (8 - PROPULSION_TYPES[propulsion].readiness) * 2),
        cost: PROPULSION_TYPES[propulsion].developmentCost
      }
    ];

    const mission: SpaceMission = {
      id: `mission-${Date.now()}`,
      name: missionName,
      targetPlanet: selectedPlanet,
      missionType,
      launchDate,
      travelTime,
      cost,
      technology,
      objectives,
      riskLevel,
      feasibility
    };

    onCreateMission(mission);
  };

  // Calculate mission parameters
  const estimatedTravelTime = selectedPlanet 
    ? calculateTravelTime(selectedPlanet.sy_dist || 100, propulsion)
    : 0;
  const estimatedCost = selectedPlanet 
    ? calculateMissionCost(selectedPlanet, missionType, propulsion)
    : 0;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Mission Name */}
      <div>
        <label className="block text-sm font-bold text-white mb-2">
          Mission Name
        </label>
        <input
          type="text"
          value={missionName}
          onChange={(e) => setMissionName(e.target.value)}
          placeholder="e.g., Kepler-442b Explorer"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
          required
        />
      </div>

      {/* Target Planet */}
      <div>
        <label className="block text-sm font-bold text-white mb-2">
          Target Planet
        </label>
        <select
          value={selectedPlanet?.pl_name || ''}
          onChange={(e) => {
            const planet = planets.find(p => p.pl_name === e.target.value);
            setSelectedPlanet(planet || null);
          }}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
          required
        >
          <option value="">Select a planet...</option>
          {planets.slice(0, 50).map((planet) => (
            <option key={planet.pl_name} value={planet.pl_name}>
              {planet.pl_name} ({planet.sy_dist?.toFixed(1) || '?'} pc away)
            </option>
          ))}
        </select>
        {selectedPlanet && (
          <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
            <strong>{selectedPlanet.pl_name}</strong> - 
            Host: {selectedPlanet.hostname} • 
            Distance: {selectedPlanet.sy_dist?.toFixed(1) || 'Unknown'} parsecs • 
            Size: {selectedPlanet.pl_rade?.toFixed(1) || 'Unknown'} R⊕
          </div>
        )}
      </div>

      {/* Mission Type */}
      <div>
        <label className="block text-sm font-bold text-white mb-2">
          Mission Type
        </label>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {(Object.keys(MISSION_OBJECTIVES) as Array<keyof typeof MISSION_OBJECTIVES>).map((type) => (
            <button
              key={type}
              type="button"
              onClick={() => setMissionType(type)}
              className={`p-3 rounded-lg border-2 text-sm font-bold transition-colors ${
                missionType === type
                  ? 'border-blue-600 bg-blue-100 text-blue-900 shadow-md'
                  : 'border-gray-400 hover:border-gray-600 hover:bg-gray-100 text-gray-900 bg-white'
              }`}
            >
              {type.charAt(0).toUpperCase() + type.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Propulsion Technology */}
      <div>
        <label className="block text-sm font-bold text-white mb-2">
          Propulsion Technology
        </label>
        <div className="space-y-3">
          {(Object.keys(PROPULSION_TYPES) as Array<keyof typeof PROPULSION_TYPES>).map((tech) => {
            const technology = PROPULSION_TYPES[tech];
            return (
              <label
                key={tech}
                className={`flex items-center p-3 rounded-lg border-2 cursor-pointer transition-colors ${
                  propulsion === tech
                    ? 'border-blue-600 bg-blue-100 shadow-md'
                    : 'border-gray-300 hover:border-gray-400 hover:bg-gray-50'
                }`}
              >
                <input
                  type="radio"
                  name="propulsion"
                  value={tech}
                  checked={propulsion === tech}
                  onChange={(e) => setPropulsion(e.target.value as keyof typeof PROPULSION_TYPES)}
                  className="sr-only"
                />
                <div className="flex-1">
                  <div className={`font-bold ${propulsion === tech ? 'text-blue-900' : 'text-white'}`}>
                    {technology.name}
                  </div>
                  <div className={`text-sm font-semibold ${propulsion === tech ? 'text-blue-800' : 'text-gray-200'}`}>
                    {technology.description}
                  </div>
                  <div className={`text-xs mt-1 font-bold ${propulsion === tech ? 'text-blue-700' : 'text-gray-300'}`}>
                    Readiness: {technology.readiness}/9 TRL • 
                    Max Speed: {(technology.maxVelocity * 100).toFixed(1)}% light speed
                  </div>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Launch Date */}
      <div>
        <label className="block text-sm font-bold text-white mb-2">
          Planned Launch Date
        </label>
        <input
          type="date"
          value={launchDate.toISOString().split('T')[0]}
          onChange={(e) => setLaunchDate(new Date(e.target.value))}
          min={new Date().toISOString().split('T')[0]}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
        />
      </div>

      {/* Mission Estimates */}
      {selectedPlanet && (
        <div className="bg-gray-50 rounded-lg p-4">
          <h3 className="font-bold text-lg mb-3">Mission Estimates</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <strong>Travel Time:</strong>
              <div className="text-2xl font-bold text-cosmic-purple">
                {estimatedTravelTime.toFixed(1)} years
              </div>
            </div>
            <div>
              <strong>Estimated Cost:</strong>
              <div className="text-2xl font-bold text-green-600">
                ${estimatedCost.toFixed(1)}B
              </div>
            </div>
            <div>
              <strong>Feasibility:</strong>
              <div className={`text-2xl font-bold ${
                calculateFeasibility(selectedPlanet, missionType, propulsion) > 70 ? 'text-green-600' :
                calculateFeasibility(selectedPlanet, missionType, propulsion) > 50 ? 'text-yellow-600' :
                'text-red-600'
              }`}>
                {calculateFeasibility(selectedPlanet, missionType, propulsion).toFixed(0)}%
              </div>
            </div>
          </div>
        </div>
      )}

      <button
        type="submit"
        disabled={!selectedPlanet || !missionName.trim()}
        className="w-full py-3 bg-cosmic-purple text-white rounded-lg font-medium hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        Create Mission Plan
      </button>
    </form>
  );
}

// Mission details display
function MissionDetails({ mission }: { mission: SpaceMission }) {
  const getRiskColor = (risk: SpaceMission['riskLevel']) => {
    switch (risk) {
      case 'low': return 'text-green-600 bg-green-100';
      case 'medium': return 'text-yellow-600 bg-yellow-100';
      case 'high': return 'text-orange-600 bg-orange-100';
      case 'extreme': return 'text-red-600 bg-red-100';
    }
  };

  const arrivalDate = new Date(mission.launchDate);
  arrivalDate.setFullYear(arrivalDate.getFullYear() + Math.ceil(mission.travelTime));

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-gray-900">{mission.name}</h3>
          <p className="text-gray-600">Mission to {mission.targetPlanet.pl_name}</p>
        </div>
        <span className={`px-3 py-1 rounded-full text-sm font-medium ${getRiskColor(mission.riskLevel)}`}>
          {mission.riskLevel.toUpperCase()} RISK
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Mission Overview */}
        <div>
          <h4 className="font-bold text-gray-900 mb-3">Mission Overview</h4>
          <div className="space-y-2 text-sm">
            <div><strong>Type:</strong> {mission.missionType.charAt(0).toUpperCase() + mission.missionType.slice(1)}</div>
            <div><strong>Target:</strong> {mission.targetPlanet.pl_name}</div>
            <div><strong>Distance:</strong> {mission.targetPlanet.sy_dist?.toFixed(1) || 'Unknown'} parsecs</div>
            <div><strong>Launch:</strong> {mission.launchDate.toLocaleDateString()}</div>
            <div><strong>Arrival:</strong> {arrivalDate.toLocaleDateString()}</div>
            <div><strong>Travel Time:</strong> {mission.travelTime.toFixed(1)} years</div>
            <div><strong>Cost:</strong> ${mission.cost.toFixed(1)} billion</div>
            <div><strong>Feasibility:</strong> {mission.feasibility.toFixed(0)}%</div>
          </div>
        </div>

        {/* Mission Objectives */}
        <div>
          <h4 className="font-bold text-gray-900 mb-3">Mission Objectives</h4>
          <ul className="space-y-1 text-sm">
            {mission.objectives.map((objective, index) => (
              <li key={index} className="flex items-start gap-2">
                <span className="text-cosmic-purple">•</span>
                {objective}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Technology Requirements */}
      <div className="mt-6">
        <h4 className="font-bold text-gray-900 mb-3">Technology Requirements</h4>
        <div className="space-y-3">
          {mission.technology.map((tech, index) => (
            <div key={index} className="border border-gray-200 rounded-lg p-3">
              <div className="flex justify-between items-start mb-2">
                <h5 className="font-medium">{tech.name}</h5>
                <span className="text-sm text-gray-500">
                  TRL {tech.currentReadiness}/{tech.requiredReadiness}
                </span>
              </div>
              <p className="text-sm text-gray-600 mb-2">{tech.description}</p>
              {tech.estimatedDevelopmentTime > 0 && (
                <div className="text-xs text-gray-500">
                  Development needed: {tech.estimatedDevelopmentTime} years, 
                  Cost: ${tech.cost}B
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// Main mission planner component
const SpaceMissionPlanner: React.FC<SpaceMissionPlannerProps> = ({ 
  planets, 
  isOpen, 
  onClose 
}) => {
  const [plannedMissions, setPlannedMissions] = useState<SpaceMission[]>([]);
  const [activeTab, setActiveTab] = useState<'planner' | 'missions'>('planner');

  const handleCreateMission = (mission: SpaceMission) => {
    setPlannedMissions([mission, ...plannedMissions]);
    setActiveTab('missions');
  };

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
        <div className="max-w-6xl mx-auto bg-white rounded-lg shadow-xl">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-200">
            <div>
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                🚀 Space Mission Planner
              </h2>
              <p className="text-gray-600 mt-1">Plan hypothetical missions to exoplanets</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Tabs */}
          <div className="flex border-b border-gray-200">
            <button
              onClick={() => setActiveTab('planner')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'planner'
                  ? 'border-b-2 border-cosmic-purple text-cosmic-purple'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Mission Planner
            </button>
            <button
              onClick={() => setActiveTab('missions')}
              className={`px-6 py-3 font-medium text-sm ${
                activeTab === 'missions'
                  ? 'border-b-2 border-cosmic-purple text-cosmic-purple'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              Planned Missions ({plannedMissions.length})
            </button>
          </div>

          <div className="p-6">
            {activeTab === 'planner' ? (
              <MissionPlannerForm
                planets={planets}
                onCreateMission={handleCreateMission}
              />
            ) : (
              <div>
                {plannedMissions.length > 0 ? (
                  <div className="space-y-6">
                    {plannedMissions.map((mission) => (
                      <MissionDetails key={mission.id} mission={mission} />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🚀</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No missions planned yet</h3>
                    <p className="text-gray-600 mb-4">
                      Create your first mission plan using the Mission Planner tab.
                    </p>
                    <button
                      onClick={() => setActiveTab('planner')}
                      className="px-6 py-3 bg-cosmic-purple text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      Start Planning
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Disclaimer */}
          <div className="p-6 bg-yellow-50 border-t border-yellow-200">
            <p className="text-sm text-yellow-800">
              <strong>Note:</strong> This is a speculative mission planning tool for educational purposes. 
              Travel times, costs, and feasibility scores are estimates based on current theoretical understanding 
              and may not reflect actual future capabilities or requirements.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SpaceMissionPlanner;