import React, { useState } from 'react';
import { Planet } from '../lib/filters';
import { narrate, NarrativeContext } from '../lib/narrator';
import WeatherSimulator from './WeatherSimulator';

interface PlanetDetailProps {
  planet: Planet | null;
  isOpen: boolean;
  onClose: () => void;
  context: NarrativeContext;
}

const formatValue = (value: number | null | undefined, unit: string = '', precision: number = 2): string => {
  if (value == null) return 'Unknown';
  return value.toFixed(precision) + unit;
};

const PlanetDetail: React.FC<PlanetDetailProps> = ({ planet, isOpen, onClose, context }) => {
  const [showWeatherSim, setShowWeatherSim] = useState(false);
  
  const getNASAUrl = (planetName: string): string => {
    // Map specific planets to their NASA catalog URLs
    const planetMap: Record<string, string> = {
      'Kepler-186 f': 'https://exoplanets.nasa.gov/alien-worlds/exoplanet-travel-bureau/explore-kepler-186f/?travel_bureau=true',
      'KELT-9 b': 'https://science.nasa.gov/exoplanet-catalog/kelt-9-b/',
      'Proxima Centauri b': 'https://science.nasa.gov/exoplanet-catalog/proxima-centauri-b/',
      'TRAPPIST-1e': 'https://exoplanets.nasa.gov/alien-worlds/exoplanet-travel-bureau/trappist-1e-guided-tour/?intent=021',
      'TOI-715 b': 'https://science.nasa.gov/exoplanet-catalog/toi-715-b/',
      'HD 40307 g': 'https://exoplanets.nasa.gov/alien-worlds/exoplanet-travel-bureau/hd-40307g-guided-tour/?intent=021',
      '55 Cancri e': 'https://exoplanets.nasa.gov/alien-worlds/exoplanet-travel-bureau/explore-55-cancri-e/?travel_bureau=true&intent=021',
      'WASP-12 b': 'https://science.nasa.gov/exoplanet-catalog/wasp-12-b/',
      'K2-18 b': 'https://science.nasa.gov/exoplanet-catalog/k2-18-b/',
      'PSR B1620-26 b': 'https://science.nasa.gov/exoplanet-catalog/psr-b1620-26-b/',
      'Gliese 667C c': 'https://science.nasa.gov/exoplanet-catalog/gj-667-c-c/',
      'GJ 1002 b': 'https://science.nasa.gov/exoplanet-catalog/gj-1002-b/'
    };
    
    return planetMap[planetName] || `https://exoplanetarchive.ipac.caltech.edu/cgi-bin/DisplayOverview/nph-DisplayOverview?objname=${encodeURIComponent(planetName)}`;
  };
  
  if (!isOpen || !planet) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-2 sm:p-4 z-50" style={{ zIndex: 2000 }}>
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
        <div className="sticky top-0 bg-white border-b border-gray-200 p-3 sm:p-4 flex justify-between items-center">
          <h2 className="text-lg sm:text-xl font-bold text-gray-900 truncate pr-2">{planet.pl_name}</h2>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowWeatherSim(true)}
              className="bg-blue-600 text-white px-3 py-2 rounded-lg hover:bg-blue-700 transition-all duration-200 text-sm flex items-center gap-2 shadow-md hover:shadow-lg hover:scale-105"
            >
              <span>🌦️</span>
              Weather
            </button>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 flex-shrink-0 p-1 hover:bg-gray-100 rounded-lg transition-all duration-200 hover:scale-110"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
        <div className="p-3 sm:p-6 space-y-4 sm:space-y-6">
          {/* Narrative Section */}
          <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-3 sm:p-4 shadow-md hover:shadow-lg transition-all duration-300">
            <p className="text-gray-800 leading-relaxed text-sm sm:text-base">{narrate(planet, context)}</p>
          </div>
          <div className="grid md:grid-cols-2 gap-6">
            <div>
              <h3 className="font-bold text-lg mb-4 text-gray-900">Planet Properties</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Name:</span>
                  <span className="text-gray-900">{planet.pl_name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Host Star:</span>
                  <span className="text-gray-900">{planet.hostname || 'Unknown'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Distance:</span>
                  <span className="text-gray-900">{formatValue(planet.sy_dist, ' parsecs')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Radius:</span>
                  <span className="text-gray-900">{formatValue(planet.pl_rade, ' R')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Mass:</span>
                  <span className="text-gray-900">{formatValue(planet.pl_bmasse, ' M')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Orbital Period:</span>
                  <span className="text-gray-900">{formatValue(planet.pl_orbper, ' days')}</span>
                </div>
              </div>
            </div>
            <div>
              <h3 className="font-bold text-lg mb-4 text-gray-900">Atmospheric Conditions</h3>
              <div className="space-y-3">
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Equilibrium Temp:</span>
                  <span className="text-gray-900">{formatValue(planet.pl_eqt, ' K', 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Insolation:</span>
                  <span className="text-gray-900">{formatValue(planet.pl_insol, ' Earth')}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Star Type:</span>
                  <span className="text-gray-900">{planet.st_spectype || 'Unknown'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Star Temperature:</span>
                  <span className="text-gray-900">{formatValue(planet.st_teff, ' K', 0)}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Discovery Method:</span>
                  <span className="text-gray-900">{planet.discoverymethod || 'Unknown'}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-gray-100">
                  <span className="font-medium text-gray-700">Discovery Year:</span>
                  <span className="text-gray-900">{planet.discoveryyear || 'Unknown'}</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* NASA Learn More Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={() => window.open(getNASAUrl(planet.pl_name), '_blank')}
              className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-lg hover:from-blue-700 hover:to-purple-700 transition-all duration-200 flex items-center gap-2 font-medium shadow-lg hover:shadow-xl hover:scale-105"
            >
              <span>🚀</span>
              Learn more about this planet
            </button>
          </div>
        </div>
      </div>
      
      {/* Weather Simulator Modal */}
      <WeatherSimulator
        planet={planet}
        isOpen={showWeatherSim}
        onClose={() => setShowWeatherSim(false)}
      />
    </div>
  );
};

export default PlanetDetail;
