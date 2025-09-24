import React, { useState, useEffect } from 'react';
import { Planet } from '../lib/filters';

interface ChartsProps {
  planets: Planet[];
}

const Charts: React.FC<ChartsProps> = ({ planets }) => {
  const [discoveryData, setDiscoveryData] = useState<{year: number, count: number}[]>([]);
  const [sizeData, setSizeData] = useState<{category: string, count: number}[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const processData = () => {
      if (!planets?.length) {
        setIsLoading(false);
        return;
      }

      // Process discovery year data
      const yearCounts = planets.reduce((acc: Record<number, number>, planet) => {
        if (planet.disc_year && planet.disc_year >= 1995) {
          acc[planet.disc_year] = (acc[planet.disc_year] || 0) + 1;
        }
        return acc;
      }, {});

      const yearData = Object.entries(yearCounts)
        .map(([year, count]) => ({ year: parseInt(year), count }))
        .sort((a, b) => a.year - b.year)
        .slice(-10); // Last 10 years with discoveries

      setDiscoveryData(yearData);

      // Process size distribution data
      const sizeCounts = {
        'Sub-Earth': 0,
        'Earth-sized': 0,
        'Super-Earth': 0,
        'Neptune-sized': 0,
        'Jupiter-sized': 0,
        'Super-Jupiter': 0
      };

      planets.forEach(planet => {
        if (planet.pl_rade) {
          const radius = planet.pl_rade;
          if (radius < 0.8) sizeCounts['Sub-Earth']++;
          else if (radius <= 1.25) sizeCounts['Earth-sized']++;
          else if (radius <= 2.0) sizeCounts['Super-Earth']++;
          else if (radius <= 6.0) sizeCounts['Neptune-sized']++;
          else if (radius <= 15.0) sizeCounts['Jupiter-sized']++;
          else sizeCounts['Super-Jupiter']++;
        }
      });

      const sizeDistribution = Object.entries(sizeCounts)
        .map(([category, count]) => ({ category, count }))
        .filter(item => item.count > 0);

      setSizeData(sizeDistribution);
      setIsLoading(false);
    };

    processData();
  }, [planets]);

  const maxDiscoveries = discoveryData.length > 0 ? Math.max(...discoveryData.map(d => d.count)) : 0;
  const maxSizeCount = sizeData.length > 0 ? Math.max(...sizeData.map(d => d.count)) : 0;

  const getSizeColor = (category: string) => {
    const colors: Record<string, string> = {
      'Sub-Earth': '#8B5CF6',
      'Earth-sized': '#10B981', 
      'Super-Earth': '#F59E0B',
      'Neptune-sized': '#3B82F6',
      'Jupiter-sized': '#EF4444',
      'Super-Jupiter': '#F97316'
    };
    return colors[category] || '#6B7280';
  };

  // Mock data for orbital characteristics and stellar irradiance
  const orbitalPeriods = [
    { period: '<10d', count: 156, color: '#8B5CF6' },
    { period: '10-100d', count: 98, color: '#10B981' },
    { period: '100d-1y', count: 67, color: '#F59E0B' },
    { period: '1-10y', count: 45, color: '#3B82F6' },
    { period: '>10y', count: 23, color: '#EF4444' }
  ];

  const stellarIrradiance = [
    { range: '<0.25x', count: 45, color: '#8B5CF6' },
    { range: '0.25-1x', count: 78, color: '#10B981' },
    { range: '1-4x', count: 123, color: '#F59E0B' },
    { range: '4-16x', count: 89, color: '#3B82F6' },
    { range: '>16x', count: 54, color: '#EF4444' }
  ];

  return (
  <div className="frosted-panel rounded-lg p-6 space-y-8">
      <h2 className="text-2xl font-bold text-white mb-6">📊 Data Insights</h2>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cosmic-purple mx-auto mb-4"></div>
            <p className="text-gray-300">Analyzing exoplanet data...</p>
          </div>
        </div>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          {/* Planet Size Distribution */}
          <div className="frosted-chart-card rounded-lg p-6 transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-2xl hover:glow-blue-strong hover:border-cosmic-purple border border-transparent">
            <h3 className="text-lg font-bold text-white mb-4">Planet Size Distribution</h3>
            <div className="space-y-3">
              {sizeData.map((item) => (
                <div key={item.category} className="flex items-center">
                  <div className="w-32 text-sm text-gray-300 font-medium">{item.category}</div>
                  <div className="flex-1 mx-3">
                    <div className="bg-gray-800/30 rounded-full h-6 relative overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ 
                          width: `${maxSizeCount > 0 ? (item.count / maxSizeCount) * 100 : 0}%`,
                          backgroundColor: getSizeColor(item.category)
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-12 text-sm text-gray-200 font-semibold text-right">{item.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Orbital Characteristics */}
          <div className="frosted-chart-card rounded-lg p-6 transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-lg hover:border-cosmic-purple border border-transparent">
            <h3 className="text-lg font-bold text-white mb-4">Orbital Periods</h3>
            <div className="space-y-3">
              {orbitalPeriods.map((item) => (
                <div key={item.period} className="flex items-center">
                  <div className="w-20 text-sm text-gray-300 font-medium">{item.period}</div>
                  <div className="flex-1 mx-3">
                    <div className="bg-gray-800/30 rounded-full h-6 relative overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ 
                          width: `${(item.count / Math.max(...orbitalPeriods.map(d => d.count))) * 100}%`,
                          backgroundColor: item.color
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-12 text-sm text-gray-200 font-semibold text-right">{item.count}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Discovery Timeline */}
          <div className="frosted-chart-card rounded-lg p-6 transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-lg hover:border-cosmic-purple border border-transparent">
            <h3 className="text-lg font-bold text-white mb-4">Recent Discoveries</h3>
            {discoveryData.length > 0 ? (
              <div className="space-y-3">
                {discoveryData.map((item) => (
                  <div key={item.year} className="flex items-center">
                    <div className="w-16 text-sm text-gray-300 font-medium">{item.year}</div>
                    <div className="flex-1 mx-3">
                      <div className="bg-gray-800/30 rounded-full h-6 relative overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-cosmic-purple to-space-blue h-full rounded-full transition-all duration-1000 ease-out"
                          style={{ width: `${maxDiscoveries > 0 ? (item.count / maxDiscoveries) * 100 : 0}%` }}
                        ></div>
                      </div>
                    </div>
                    <div className="w-12 text-sm text-gray-200 font-semibold text-right">{item.count}</div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 italic">No discovery year data available</p>
            )}
          </div>

          {/* Stellar Irradiance */}
          <div className="frosted-chart-card rounded-lg p-6 transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-lg hover:border-cosmic-purple border border-transparent">
            <h3 className="text-lg font-bold text-white mb-4">Stellar Irradiance</h3>
            <div className="space-y-3">
              {stellarIrradiance.map((item) => (
                <div key={item.range} className="flex items-center">
                  <div className="w-20 text-sm text-gray-300 font-medium">{item.range}</div>
                  <div className="flex-1 mx-3">
                    <div className="bg-gray-800/30 rounded-full h-6 relative overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-1000 ease-out"
                        style={{ 
                          width: `${(item.count / Math.max(...stellarIrradiance.map(d => d.count))) * 100}%`,
                          backgroundColor: item.color
                        }}
                      ></div>
                    </div>
                  </div>
                  <div className="w-12 text-sm text-gray-200 font-semibold text-right">{item.count}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Summary Stats */}
  <div className="grid grid-cols-4 gap-4 mt-8">
  <div className="frosted-stat-card p-6 rounded-lg text-center transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-2xl hover:glow-blue-strong hover:border-cosmic-purple border border-transparent">
          <div className="text-3xl font-bold text-purple-400 mb-2">{planets.length}</div>
          <div className="text-sm text-gray-300">Total Planets</div>
        </div>
  <div className="frosted-stat-card p-6 rounded-lg text-center transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-lg hover:border-cosmic-purple border border-transparent">
          <div className="text-3xl font-bold text-purple-400 mb-2">
            {new Set(planets.map(p => p.hostname).filter(Boolean)).size}
          </div>
          <div className="text-sm text-gray-300">Host Stars</div>
        </div>
  <div className="frosted-stat-card p-6 rounded-lg text-center transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-lg hover:border-cosmic-purple border border-transparent">
          <div className="text-3xl font-bold text-yellow-400 mb-2">
            {planets.filter(p => p.pl_rade && p.pl_rade >= 0.8 && p.pl_rade <= 1.25).length}
          </div>
          <div className="text-sm text-gray-300">Earth-sized</div>
        </div>
  <div className="frosted-stat-card p-6 rounded-lg text-center transition-all duration-500 ease-in-out hover:scale-105 hover:shadow-lg hover:border-cosmic-purple border border-transparent">
          <div className="text-3xl font-bold text-green-400 mb-2">
            {planets.filter(p => p.pl_eqt && p.pl_eqt >= 273 && p.pl_eqt <= 373).length}
          </div>
          <div className="text-sm text-gray-300">Habitable Temp</div>
        </div>
      </div>
    </div>
  );
};

export default Charts;