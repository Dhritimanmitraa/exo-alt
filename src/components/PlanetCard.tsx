import React from 'react';
import { Planet, earthLikeScore, weirdnessScore } from '../lib/filters';
import PlanetSelectionBadge from './multiplayer/PlanetSelectionBadge';

interface PlanetCardProps {
  planet: Planet;
  onClick: () => void;
  filterType?: string;
  onView3D?: (planet: Planet) => void;
  selectedBy?: string[];
}

const PlanetCard: React.FC<PlanetCardProps> = ({ planet, onClick, filterType, onView3D = () => {}, selectedBy = [] }) => {
  const formatValue = (value: number | null | undefined, unit: string = '', precision: number = 1): string => {
    if (value == null) return 'Unknown';
    return value.toFixed(precision) + unit;
  };

  const getScoreDisplay = () => {
    if (filterType === 'earthlike') {
      const score = earthLikeScore(planet);
      return score > 0 ? (
        <div className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full">
          Earth-like: {score}/100
        </div>
      ) : null;
    }
    if (filterType === 'weird') {
      const score = weirdnessScore(planet);
      return score > 0 ? (
        <div className="text-xs bg-red-100 text-red-800 px-2 py-1 rounded-full">
          Weirdness: {score}/100
        </div>
      ) : null;
    }
    return null;
  };

  const getTemperatureColor = (temp: number | null | undefined) => {
    if (!temp) return 'text-gray-600';
    if (temp > 1000) return 'text-red-600';
    if (temp > 500) return 'text-orange-600';
    if (temp > 200) return 'text-yellow-600';
    return 'text-blue-600';
  };

  return (
    <div
      onClick={onClick}
      tabIndex={0}
      className={`relative planet-card glow-blue-strong bg-white rounded-lg shadow-lg hover:shadow-xl transition-all duration-300 ease-in-out cursor-pointer p-4 border border-gray-200 focus:outline-none hover:scale-105 hover:-translate-y-2 hover:border-gray-300`}
    >
      {selectedBy.length > 0 && (
        <PlanetSelectionBadge selectedBy={selectedBy as any} />
      )}
      {/* Preview button removed per request */}
      <div className="planet-media mb-3 overflow-hidden rounded-md">
        <img
          src={planet.image || `https://via.placeholder.com/300x150?text=${encodeURIComponent(planet.pl_name)}`}
          alt={`${planet.pl_name} planet`}
          className="planet-image w-full h-24 object-cover rounded-md transition-transform duration-500 ease-in-out"
        />
      </div>
      <div className="flex justify-between items-start mb-3">
        <h3 className="font-bold text-lg text-gray-900 truncate flex-1 mr-2">
          {planet.pl_name}
        </h3>
        {getScoreDisplay()}
      </div>
      {/* Add space between heading and summary */}
      <div className="my-4"></div>
      <div className="text-sm text-gray-600 mb-3">
        <div className="flex items-center gap-1 mb-1">
          <span className="font-medium">Host:</span>
          <span>{planet.hostname || 'Unknown'}</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="font-medium">Discovered:</span>
          <span>{planet.discoveryyear || 'Unknown'}</span>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 text-xs">
        <div className="bg-gray-50 p-2 rounded">
          <div className="font-medium text-gray-700">Distance</div>
          <div className="text-gray-900">{formatValue(planet.sy_dist, ' pc')}</div>
        </div>
        
        <div className="bg-gray-50 p-2 rounded">
          <div className="font-medium text-gray-700">Radius</div>
          <div className="text-gray-900">{formatValue(planet.pl_rade, ' R')}</div>
        </div>
        
        <div className="bg-gray-50 p-2 rounded">
          <div className="font-medium text-gray-700">Temperature</div>
          <div className={getTemperatureColor(planet.pl_eqt)}>
            {formatValue(planet.pl_eqt, ' K', 0)}
          </div>
        </div>
        
        <div className="bg-gray-50 p-2 rounded">
          <div className="font-medium text-gray-700">Insolation</div>
          <div className="text-gray-900">{formatValue(planet.pl_insol, ' Earth')}</div>
        </div>
      </div>
      {/* In-app unified 3D viewer button */}
      <div className="mt-3">
        <button
          onClick={(e) => { e.stopPropagation(); onView3D(planet); }}
          className="view3d-btn inline-flex items-center gap-2 text-sm font-medium hover:opacity-95 transition-opacity"
          aria-label={`Open 3D view for ${planet.pl_name}`}
        >
          <span role="img" aria-hidden="true">🌍</span>
          <span>View in 3D</span>
        </button>
      </div>
      {/* Expanded details revealed on hover */}
      <div className="expanded-details mt-3 pt-3 border-t border-gray-100 max-h-0 overflow-hidden transition-all duration-300">
        <div className="grid grid-cols-2 gap-3 text-sm text-gray-700">
          <div>
            <div className="font-medium">Method</div>
            <div className="text-xs text-gray-500">{planet.discoverymethod || 'Unknown'}</div>
          </div>
          <div>
            <div className="font-medium">Orbital period</div>
            <div className="text-xs text-gray-500">{planet.pl_orbper ? `${planet.pl_orbper} days` : '—'}</div>
          </div>
          <div>
            <div className="font-medium">Mass</div>
            <div className="text-xs text-gray-500">{planet.pl_bmasse ? `${planet.pl_bmasse} M⊕` : '—'}</div>
          </div>
          <div>
            <div className="font-medium">Star</div>
            <div className="text-xs text-gray-500">{planet.st_spectype || '—'} • {planet.st_teff ? `${planet.st_teff} K` : '—'}</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PlanetCard;
