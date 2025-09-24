import React, { useState, useEffect } from 'react';
import { Planet } from '../lib/filters';

interface PlanetComparisonProps {
  planets: Planet[];
  isOpen: boolean;
  onClose: () => void;
  initialPlanets?: Planet[];
}

interface ComparisonMetric {
  key: keyof Planet;
  label: string;
  unit: string;
  format: (value: any) => string;
  category: 'size' | 'orbital' | 'atmospheric' | 'discovery';
}

const COMPARISON_METRICS: ComparisonMetric[] = [
  // Size & Mass
  { key: 'pl_rade', label: 'Radius', unit: 'R⊕', format: (v) => v?.toFixed(2) || 'Unknown', category: 'size' },
  { key: 'pl_bmasse', label: 'Mass', unit: 'M⊕', format: (v) => v?.toFixed(2) || 'Unknown', category: 'size' },
  
  // Orbital Properties
  { key: 'pl_orbper', label: 'Orbital Period', unit: 'days', format: (v) => v?.toFixed(1) || 'Unknown', category: 'orbital' },
  { key: 'sy_dist', label: 'Distance from Earth', unit: 'pc', format: (v) => v?.toFixed(1) || 'Unknown', category: 'orbital' },
  
  // Atmospheric
  { key: 'pl_eqt', label: 'Equilibrium Temperature', unit: 'K', format: (v) => v?.toFixed(0) || 'Unknown', category: 'atmospheric' },
  { key: 'pl_insol', label: 'Insolation', unit: 'S⊕', format: (v) => v?.toFixed(2) || 'Unknown', category: 'atmospheric' },
  
  // Discovery
  { key: 'discoveryyear', label: 'Discovery Year', unit: '', format: (v) => v?.toString() || 'Unknown', category: 'discovery' },
  { key: 'discoverymethod', label: 'Discovery Method', unit: '', format: (v) => v || 'Unknown', category: 'discovery' },
];

// Individual planet comparison card
function ComparisonCard({ 
  planet, 
  onRemove, 
  isReference = false 
}: { 
  planet: Planet; 
  onRemove: () => void; 
  isReference?: boolean;
}) {
  const getCardColor = () => {
    if (isReference) return 'border-gray-400 bg-gray-700/20';
    const temp = planet.pl_eqt || 255;
    if (temp > 1000) return 'border-gray-500 bg-gray-700/30';
    if (temp > 500) return 'border-gray-500 bg-gray-700/25';
    if (temp > 300) return 'border-gray-500 bg-gray-700/20';
    return 'border-gray-500 bg-gray-700/15';
  };

  return (
    <div className={`border-2 rounded-lg p-4 ${getCardColor()} relative shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:-translate-y-1`}>
      {!isReference && (
        <button
          onClick={onRemove}
          className="absolute top-2 right-2 text-gray-400 hover:text-red-400 hover:bg-red-50 rounded-full p-1 transition-all duration-200 hover:scale-110"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      )}
      
      <div className="pr-6">
        <h3 className="font-bold text-lg mb-2 text-white truncate">
          {planet.pl_name}
          {isReference && <span className="text-gray-400 text-sm ml-2 font-semibold">(Reference)</span>}
        </h3>
        
        <div className="space-y-1 text-sm text-white">
          <div><strong className="text-white">Host:</strong> {planet.hostname || 'Unknown'}</div>
          <div><strong className="text-white">Year:</strong> {planet.discoveryyear || 'Unknown'}</div>
          
          {planet.pl_rade && (
            <div className="flex items-center gap-2">
              <strong className="text-white">Size:</strong>
              <div className="flex items-center">
                <div 
                  className="bg-gray-500 rounded-full shadow-sm"
                  style={{ 
                    width: `${Math.max(8, Math.min(24, planet.pl_rade * 8))}px`,
                    height: `${Math.max(8, Math.min(24, planet.pl_rade * 8))}px`
                  }}
                />
                <span className="ml-2 text-white font-medium">{planet.pl_rade.toFixed(2)} R⊕</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Planet search and add component
function PlanetSelector({ 
  planets, 
  selectedPlanets, 
  onAddPlanet 
}: { 
  planets: Planet[]; 
  selectedPlanets: Planet[]; 
  onAddPlanet: (planet: Planet) => void;
}) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPlanets, setFilteredPlanets] = useState<Planet[]>([]);

  useEffect(() => {
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      const filtered = planets.filter(planet => 
        !selectedPlanets.some(selected => selected.pl_name === planet.pl_name) &&
        (planet.pl_name?.toLowerCase().includes(query) ||
         planet.hostname?.toLowerCase().includes(query))
      ).slice(0, 10); // Limit results
      setFilteredPlanets(filtered);
    } else {
      setFilteredPlanets([]);
    }
  }, [searchQuery, planets, selectedPlanets]);

  return (
    <div className="mb-6">
      <div className="relative">
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search planets to add for comparison..."
          className="w-full p-3 border border-gray-600 rounded-lg focus:ring-2 focus:ring-gray-500 focus:border-gray-500 bg-gray-800 text-white placeholder-gray-400 shadow-md hover:shadow-lg transition-all duration-200"
        />
        
        {filteredPlanets.length > 0 && (
          <div className="absolute top-full left-0 right-0 bg-gray-800 border border-gray-600 rounded-lg mt-1 max-h-64 overflow-y-auto z-10 shadow-lg">
            {filteredPlanets.map((planet) => (
              <button
                key={planet.pl_name}
                onClick={() => {
                  onAddPlanet(planet);
                  setSearchQuery('');
                }}
                className="w-full text-left p-3 hover:bg-gray-700 border-b border-gray-600 last:border-b-0 transition-colors"
              >
                <div className="font-medium text-white">{planet.pl_name}</div>
                <div className="text-sm text-gray-300 font-medium">
                  {planet.hostname} • {planet.discoveryyear} • 
                  {planet.pl_rade ? ` ${planet.pl_rade.toFixed(1)} R⊕` : ' Unknown size'}
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Comparison table component
function ComparisonTable({ comparedPlanets }: { comparedPlanets: Planet[] }) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  
  const categories = [
    { id: 'all', label: 'All Properties' },
    { id: 'size', label: 'Size & Mass' },
    { id: 'orbital', label: 'Orbital Properties' },
    { id: 'atmospheric', label: 'Atmospheric' },
    { id: 'discovery', label: 'Discovery Info' }
  ];

  const filteredMetrics = selectedCategory === 'all' 
    ? COMPARISON_METRICS 
    : COMPARISON_METRICS.filter(m => m.category === selectedCategory);

  const getValueColor = (values: any[], currentValue: any) => {
    if (!currentValue || currentValue === 'Unknown') return 'text-gray-400';
    
    const numericValues = values.filter(v => v && v !== 'Unknown' && !isNaN(Number(v)));
    if (numericValues.length === 0) return 'text-gray-200';
    
    const numValue = Number(currentValue);
    const min = Math.min(...numericValues.map(Number));
    const max = Math.max(...numericValues.map(Number));
    
    if (numValue === max && max !== min) return 'text-white font-medium bg-gray-700/30 border-l-2 border-gray-400';
    if (numValue === min && max !== min) return 'text-gray-300 font-medium bg-gray-800/40 border-l-2 border-gray-500';
    return 'text-gray-200';
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-xl overflow-hidden border border-gray-600">
      {/* Category filter */}
      <div className="p-4 border-b border-gray-600 bg-gray-900">
        <div className="flex flex-wrap gap-2">
          {categories.map((category) => (
            <button
              key={category.id}
              onClick={() => setSelectedCategory(category.id)}
              className={`px-3 py-1 rounded-full text-sm font-medium transition-all duration-200 shadow-sm hover:shadow-md hover:scale-105 ${
                selectedCategory === category.id
                  ? 'bg-gray-600 text-white shadow-sm'
                  : 'bg-gray-700 text-gray-200 hover:bg-gray-600 border border-gray-500'
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>
      </div>

      {/* Comparison table */}
      <div className="overflow-x-auto bg-gray-900 rounded-lg shadow-xl border border-gray-600 transition-shadow duration-300 hover:shadow-2xl">
        <table className="w-full bg-gray-800">
          <thead className="bg-gray-900">
            <tr>
              <th className="p-3 text-left font-bold text-white border-b border-gray-600 hover:bg-gray-700 transition-colors duration-200">Property</th>
              {comparedPlanets.map((planet) => (
                <th key={planet.pl_name} className="p-3 text-center font-bold text-white border-b border-gray-600 hover:bg-gray-700 transition-colors duration-200">
                  <div className="truncate max-w-32" title={planet.pl_name}>
                    {planet.pl_name}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredMetrics.map((metric) => {
              const values = comparedPlanets.map(p => p[metric.key]);
              return (
                <tr key={metric.key} className="border-b border-gray-700 hover:bg-gray-600/50 transition-colors duration-200">
                  <td className="p-3 font-semibold text-gray-200 bg-gray-800 border-r border-gray-600 hover:bg-gray-700 transition-colors duration-200">
                    {metric.label}
                    {metric.unit && <span className="text-gray-400 text-sm font-normal"> ({metric.unit})</span>}
                  </td>
                  {comparedPlanets.map((planet) => {
                    const value = planet[metric.key];
                    const formattedValue = metric.format(value);
                    return (
                      <td 
                        key={`${planet.pl_name}-${metric.key}`}
                        className={`p-3 text-center font-medium hover:bg-gray-600/30 transition-colors duration-200 ${getValueColor(values, value)}`}
                      >
                        {formattedValue}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Export functionality
function ExportTools({ comparedPlanets }: { comparedPlanets: Planet[] }) {
  const exportAsJSON = () => {
    const data = comparedPlanets.map(planet => {
      const exported: any = { name: planet.pl_name };
      COMPARISON_METRICS.forEach(metric => {
        exported[metric.label] = metric.format(planet[metric.key]);
      });
      return exported;
    });
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'planet-comparison.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportAsCSV = () => {
    const headers = ['Planet', ...COMPARISON_METRICS.map(m => `${m.label} (${m.unit})`.trim())];
    const rows = comparedPlanets.map(planet => [
      planet.pl_name,
      ...COMPARISON_METRICS.map(metric => metric.format(planet[metric.key]))
    ]);
    
    const csvContent = [headers, ...rows].map(row => 
      row.map(cell => `"${cell}"`).join(',')
    ).join('\n');
    
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'planet-comparison.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (comparedPlanets.length === 0) return null;

  return (
    <div className="flex gap-2 mt-4">
      <button
        onClick={exportAsJSON}
        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
      >
        Export JSON
      </button>
      <button
        onClick={exportAsCSV}
        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105"
      >
        Export CSV
      </button>
    </div>
  );
}

// Main comparison component
const PlanetComparison: React.FC<PlanetComparisonProps> = ({ 
  planets, 
  isOpen, 
  onClose, 
  initialPlanets = [] 
}) => {
  const [comparedPlanets, setComparedPlanets] = useState<Planet[]>([]);
  const [referenceEarth] = useState<Planet>({
    pl_name: 'Earth',
    hostname: 'Sun',
    pl_rade: 1.0,
    pl_bmasse: 1.0,
    pl_orbper: 365.25,
    sy_dist: 0.0000158, // 1 AU in parsecs
    pl_eqt: 255,
    pl_insol: 1.0,
    discoveryyear: 1995, // First confirmed exoplanet
    discoverymethod: 'Known'
  });

  useEffect(() => {
    if (initialPlanets.length > 0) {
      setComparedPlanets(initialPlanets);
    }
  }, [initialPlanets]);

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

  const addPlanet = (planet: Planet) => {
    if (comparedPlanets.length < 5 && !comparedPlanets.some(p => p.pl_name === planet.pl_name)) {
      setComparedPlanets([...comparedPlanets, planet]);
    }
  };

  const removePlanet = (planetName: string) => {
    setComparedPlanets(comparedPlanets.filter(p => p.pl_name !== planetName));
  };

  const addEarthReference = () => {
    if (!comparedPlanets.some(p => p.pl_name === 'Earth')) {
      setComparedPlanets([referenceEarth, ...comparedPlanets]);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 overflow-y-auto">
      <div className="min-h-screen px-4 py-8">
        <div className="max-w-7xl mx-auto bg-gray-900 rounded-lg shadow-xl border border-gray-700">
          {/* Header */}
          <div className="flex justify-between items-center p-6 border-b border-gray-700">
            <div>
              <h2 className="text-2xl font-bold text-white">Planet Comparison Tool</h2>
              <p className="text-gray-300 mt-1">Compare up to 5 exoplanets side by side</p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-200 p-2 transition-all duration-200 hover:bg-gray-700 rounded-lg hover:scale-110"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-6 bg-gray-900">
            {/* Quick actions */}
            <div className="flex flex-wrap gap-3 mb-6">
              <button
                onClick={addEarthReference}
                disabled={comparedPlanets.some(p => p.pl_name === 'Earth')}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-md hover:shadow-lg hover:scale-105 disabled:hover:scale-100"
              >
                + Add Earth Reference
              </button>
              <div className="text-sm text-gray-300 font-medium self-center">
                {comparedPlanets.length}/5 planets selected
              </div>
            </div>

            {/* Planet selector */}
            <PlanetSelector
              planets={planets}
              selectedPlanets={comparedPlanets}
              onAddPlanet={addPlanet}
            />

            {/* Selected planets cards */}
            {comparedPlanets.length > 0 && (
              <div className="mb-6">
                <h3 className="text-lg font-bold text-white mb-3">Selected Planets</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
                  {comparedPlanets.map((planet) => (
                    <ComparisonCard
                      key={planet.pl_name}
                      planet={planet}
                      onRemove={() => removePlanet(planet.pl_name)}
                      isReference={planet.pl_name === 'Earth'}
                    />
                  ))}
                </div>
              </div>
            )}

            {/* Comparison table */}
            {comparedPlanets.length > 0 && (
              <div>
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold text-white">Detailed Comparison</h3>
                  <ExportTools comparedPlanets={comparedPlanets} />
                </div>
                <ComparisonTable comparedPlanets={comparedPlanets} />
              </div>
            )}

            {comparedPlanets.length === 0 && (
              <div className="text-center py-12 bg-gray-800 border border-gray-600 rounded-lg">
                <div className="text-6xl mb-4">🔍</div>
                <h3 className="text-xl font-bold text-white mb-2">No planets selected</h3>
                <p className="text-gray-300 mb-4 font-medium">
                  Search and add planets above to start comparing their properties.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanetComparison;
