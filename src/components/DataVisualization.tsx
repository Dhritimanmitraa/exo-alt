import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Planet } from '../lib/filters';
import { useCorrelationWorker } from '../lib/useCorrelationWorker';
import { drawScatterPlot, drawHistogram, CANVAS_THRESHOLD } from '../lib/chartCanvas';

interface DataVisualizationProps {
  planets: Planet[];
  isOpen: boolean;
  onClose: () => void;
}

interface ChartConfig {
  id: string;
  title: string;
  type: 'scatter' | 'histogram' | 'bar' | 'correlation';
  xAxis: string;
  yAxis?: string;
  enabled: boolean;
}

interface StatsSummary {
  totalPlanets: number;
  avgRadius: number;
  avgMass: number;
  avgDistance: number;
  avgTemperature: number;
  earthLikePlanets: number;
  hotJupiters: number;
  superEarths: number;
}

const DataVisualization: React.FC<DataVisualizationProps> = ({ planets, isOpen, onClose }) => {
  const [activeTab, setActiveTab] = useState<'dashboard' | 'charts' | 'correlations' | 'export'>('dashboard');
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>(['pl_rade', 'pl_bmasse', 'sy_dist', 'pl_eqt']);
  const [chartConfigs, setChartConfigs] = useState<ChartConfig[]>([
    { id: 'mass-radius', title: 'Planet Mass vs Radius', type: 'scatter', xAxis: 'pl_rade', yAxis: 'pl_bmasse', enabled: true },
    { id: 'distance-temp', title: 'Distance vs Temperature', type: 'scatter', xAxis: 'sy_dist', yAxis: 'pl_eqt', enabled: true },
    { id: 'radius-distribution', title: 'Planet Radius Distribution', type: 'histogram', xAxis: 'pl_rade', enabled: true },
    { id: 'discovery-years', title: 'Discoveries by Year', type: 'bar', xAxis: 'discoveryyear', enabled: true }
  ]);

  // Calculate comprehensive statistics
  const stats: StatsSummary = useMemo(() => {
    const validPlanets = planets.filter(p => p.pl_rade && p.pl_bmasse && p.sy_dist && p.pl_eqt);
    
    const avgRadius = validPlanets.reduce((sum, p) => sum + (p.pl_rade || 0), 0) / validPlanets.length;
    const avgMass = validPlanets.reduce((sum, p) => sum + (p.pl_bmasse || 0), 0) / validPlanets.length;
    const avgDistance = validPlanets.reduce((sum, p) => sum + (p.sy_dist || 0), 0) / validPlanets.length;
    const avgTemperature = validPlanets.reduce((sum, p) => sum + (p.pl_eqt || 0), 0) / validPlanets.length;
    
    const earthLikePlanets = planets.filter(p => 
      p.pl_rade && p.pl_rade >= 0.5 && p.pl_rade <= 2.0 &&
      p.pl_eqt && p.pl_eqt >= 273 && p.pl_eqt <= 373
    ).length;
    
    const hotJupiters = planets.filter(p => 
      p.pl_bmasse && p.pl_bmasse > 50 &&
      p.pl_eqt && p.pl_eqt > 1000
    ).length;
    
    const superEarths = planets.filter(p => 
      p.pl_rade && p.pl_rade > 1.0 && p.pl_rade <= 2.0
    ).length;

    return {
      totalPlanets: planets.length,
      avgRadius: avgRadius || 0,
      avgMass: avgMass || 0,
      avgDistance: avgDistance || 0,
      avgTemperature: avgTemperature || 0,
      earthLikePlanets,
      hotJupiters,
      superEarths
    };
  }, [planets]);

  // Async correlation via worker
  const { calculateCorrelations, isCalculating, error: workerError, progress } = useCorrelationWorker();
  const [correlationMatrix, setCorrelationMatrix] = useState<{ [key: string]: { [key: string]: number } }>({});
  useEffect(() => {
    const metrics = ['pl_rade', 'pl_bmasse', 'sy_dist', 'pl_eqt', 'pl_orbper'];
    let cancelled = false;
    calculateCorrelations(planets, metrics)
      .then((m) => { if (!cancelled) setCorrelationMatrix(m); })
      .catch(() => { /* handled by hook error */ })
    return () => { cancelled = true; };
  }, [planets, calculateCorrelations]);

  const getMetricLabel = (metric: string): string => {
    const labels: { [key: string]: string } = {
      'pl_rade': 'Planet Radius (Earth radii)',
      'pl_bmasse': 'Planet Mass (Earth masses)',
      'sy_dist': 'Distance (parsecs)',
      'pl_eqt': 'Equilibrium Temperature (K)',
      'pl_orbper': 'Orbital Period (days)',
      'discoveryyear': 'Discovery Year'
    };
    return labels[metric] || metric;
  };

  const getCorrelationColor = (value: number): string => {
    const abs = Math.abs(value);
    if (abs > 0.7) return value > 0 ? 'bg-green-600 text-white' : 'bg-red-600 text-white';
    if (abs > 0.4) return value > 0 ? 'bg-green-700 text-green-200' : 'bg-red-700 text-red-200';
    if (abs > 0.2) return value > 0 ? 'bg-green-800 text-green-300' : 'bg-red-800 text-red-300';
    return 'bg-gray-700 text-gray-300';
  };

  // Simple scatter plot component
  const ScatterPlot: React.FC<{ config: ChartConfig }> = ({ config }) => {
    const dataPlanets = planets
      .filter(p => p[config.xAxis as keyof Planet] != null && p[config.yAxis as keyof Planet] != null);

    const width = 400; const height = 300; const padding = 40;
    const useCanvas = dataPlanets.length > CANVAS_THRESHOLD;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      if (!useCanvas) return;
      if (!canvasRef.current) return;
      const data = dataPlanets.map(p => ({ x: Number(p[config.xAxis as keyof Planet]), y: Number(p[config.yAxis as keyof Planet]) }));
      drawScatterPlot(canvasRef.current, data, { width, height, padding, colors: ['#8b5cf6'], gridLines: true });
    }, [useCanvas, dataPlanets, config.xAxis, config.yAxis]);

    if (useCanvas) {
      return (
        <div className="border border-gray-600 rounded-lg p-4 bg-gray-800 shadow-lg">
          <h3 className="text-lg font-semibold mb-2 text-white">{config.title} <span className="ml-2 text-xs text-blue-300">Canvas mode</span></h3>
          <canvas ref={canvasRef} style={{ width, height }} aria-label={`${config.title} scatter plot (canvas)`} />
          <div className="mt-2 text-xs text-gray-400">Showing {dataPlanets.length} planets</div>
        </div>
      );
    }

    const data = dataPlanets.slice(0, 200);
    const xValues = data.map(p => Number(p[config.xAxis as keyof Planet]));
    const yValues = data.map(p => Number(p[config.yAxis as keyof Planet]));
    const xMin = Math.min(...xValues);
    const xMax = Math.max(...xValues);
    const yMin = Math.min(...yValues);
    const yMax = Math.max(...yValues);
    return (
      <div className="border border-gray-600 rounded-lg p-4 bg-gray-800 shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105">
        <h3 className="text-lg font-semibold mb-4 text-white">{config.title}</h3>
        <div className="relative">
          <svg width={width} height={height} className="border">
            {[0, 1, 2, 3, 4].map(i => (
              <g key={i}>
                <line x1={padding + (i * (width - 2 * padding)) / 4} y1={padding} x2={padding + (i * (width - 2 * padding)) / 4} y2={height - padding} stroke="#e5e7eb" strokeWidth="1" />
                <line x1={padding} y1={padding + (i * (height - 2 * padding)) / 4} x2={width - padding} y2={padding + (i * (height - 2 * padding)) / 4} stroke="#e5e7eb" strokeWidth="1" />
              </g>
            ))}
            {data.map((planet, i) => {
              const x = padding + ((Number(planet[config.xAxis as keyof Planet]) - xMin) / (xMax - xMin)) * (width - 2 * padding);
              const y = height - padding - ((Number(planet[config.yAxis as keyof Planet]) - yMin) / (yMax - yMin)) * (height - 2 * padding);
              return (<circle key={i} cx={x} cy={y} r="3" fill="#8b5cf6" opacity="0.7" className="hover:opacity-100" />);
            })}
            <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151" strokeWidth="2"/>
            <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#374151" strokeWidth="2"/>
          </svg>
          <div className="mt-2 text-sm text-gray-300 text-center">{getMetricLabel(config.xAxis)}</div>
          <div className="absolute left-0 top-1/2 transform -rotate-90 -translate-y-1/2 text-sm text-gray-300">{getMetricLabel(config.yAxis || '')}</div>
        </div>
        <div className="mt-2 text-xs text-gray-400">Showing {data.length} planets with valid data</div>
      </div>
    );
  };

  // Simple histogram component
  const Histogram: React.FC<{ config: ChartConfig }> = ({ config }) => {
    const values = planets
      .filter(p => p[config.xAxis as keyof Planet] != null)
      .map(p => Number(p[config.xAxis as keyof Planet]));

    const min = Math.min(...values);
    const max = Math.max(...values);
    const binCount = 20;
    const binSize = (max - min) / binCount || 1;
    const bins = Array(binCount).fill(0);
    values.forEach(value => { const binIndex = Math.min(Math.floor((value - min) / binSize), binCount - 1); bins[binIndex]++; });
    const maxBinValue = Math.max(...bins, 1);
    const width = 400; const height = 300; const padding = 40;

    const useCanvas = values.length > CANVAS_THRESHOLD;
    const canvasRef = useRef<HTMLCanvasElement | null>(null);

    useEffect(() => {
      if (!useCanvas) return;
      if (!canvasRef.current) return;
      const data = bins.map((count, i) => ({ value: min + i * binSize, count }));
      drawHistogram(canvasRef.current, data, { width, height, padding, colors: ['#8b5cf6'], gridLines: false });
    }, [useCanvas, values.join(','), binSize]);

    if (useCanvas) {
      return (
        <div className="border border-gray-600 rounded-lg p-4 bg-gray-800 shadow-lg">
          <h3 className="text-lg font-semibold mb-2 text-white">{config.title} <span className="ml-2 text-xs text-blue-300">Canvas mode</span></h3>
          <canvas ref={canvasRef} style={{ width, height }} aria-label={`${config.title} histogram (canvas)`} />
          <div className="mt-2 text-xs text-gray-400">Distribution of {values.length} planets</div>
        </div>
      );
    }

    return (
      <div className="border rounded-lg p-4 bg-white">
        <h3 className="text-lg font-semibold mb-4">{config.title}</h3>
        <svg width={width} height={height} className="border">
          {bins.map((count, i) => {
            const barHeight = (count / maxBinValue) * (height - 2 * padding);
            const barWidth = (width - 2 * padding) / binCount;
            return (<rect key={i} x={padding + i * barWidth} y={height - padding - barHeight} width={barWidth - 1} height={barHeight} fill="#8b5cf6" opacity="0.8" />);
          })}
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#374151" strokeWidth="2"/>
          <line x1={padding} y1={padding} x2={padding} y2={height - padding} stroke="#374151" strokeWidth="2"/>
        </svg>
        <div className="mt-2 text-sm text-gray-300 text-center">{getMetricLabel(config.xAxis)}</div>
        <div className="mt-2 text-xs text-gray-400">Distribution of {values.length} planets</div>
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900 rounded-lg max-w-7xl w-full max-h-[90vh] overflow-hidden border border-gray-700">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-green-600 text-white p-6">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold">Data Visualization Dashboard</h2>
              <p className="opacity-90">Analyze {planets.length} exoplanets with interactive charts and statistics</p>
            </div>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 p-2"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="border-b border-gray-700 bg-gray-900">
          <nav className="flex">
            {[
              { key: 'dashboard', label: 'Overview Dashboard', icon: '📊' },
              { key: 'charts', label: 'Interactive Charts', icon: '📈' },
              { key: 'correlations', label: 'Correlation Analysis', icon: '🔗' },
              { key: 'export', label: 'Export Data', icon: '💾' }
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`flex items-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200'
                }`}
              >
                <span>{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-160px)] bg-gray-900 text-white">
          {activeTab === 'dashboard' && (
            <div className="space-y-6">
              {/* Key Statistics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:bg-blue-800">
                  <div className="text-3xl font-bold text-blue-300">{stats.totalPlanets}</div>
                  <div className="text-sm text-gray-300">Total Planets</div>
                </div>
                <div className="bg-green-900 border border-green-700 rounded-lg p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:bg-green-800">
                  <div className="text-3xl font-bold text-green-300">{stats.earthLikePlanets}</div>
                  <div className="text-sm text-gray-300">Earth-like Planets</div>
                </div>
                <div className="bg-purple-900 border border-purple-700 rounded-lg p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:bg-purple-800">
                  <div className="text-3xl font-bold text-purple-300">{stats.superEarths}</div>
                  <div className="text-sm text-gray-300">Super-Earths</div>
                </div>
                <div className="bg-red-900 border border-red-700 rounded-lg p-4 text-center shadow-lg hover:shadow-xl transition-all duration-300 hover:scale-105 hover:bg-red-800">
                  <div className="text-3xl font-bold text-red-300">{stats.hotJupiters}</div>
                  <div className="text-sm text-gray-300">Hot Jupiters</div>
                </div>
              </div>

              {/* Average Values */}
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-6">
                <h3 className="text-xl font-bold text-white mb-4">Average Properties</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <div className="text-2xl font-bold text-gray-200">{stats.avgRadius.toFixed(2)}</div>
                    <div className="text-sm text-gray-400">Earth Radii</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-200">{stats.avgMass.toFixed(2)}</div>
                    <div className="text-sm text-gray-400">Earth Masses</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-200">{stats.avgDistance.toFixed(1)}</div>
                    <div className="text-sm text-gray-400">Parsecs</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold text-gray-200">{stats.avgTemperature.toFixed(0)}</div>
                    <div className="text-sm text-gray-400">Kelvin</div>
                  </div>
                </div>
              </div>

              {/* Quick Charts Preview */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <ScatterPlot config={chartConfigs[0]} />
                <Histogram config={chartConfigs[2]} />
              </div>
            </div>
          )}

          {activeTab === 'charts' && (
            <div className="space-y-6">
              {/* Chart Configuration */}
              <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold mb-4">Chart Configuration</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {chartConfigs.map(config => (
                    <label key={config.id} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={config.enabled}
                        onChange={(e) => setChartConfigs(prev => 
                          prev.map(c => c.id === config.id ? { ...c, enabled: e.target.checked } : c)
                        )}
                        className="rounded"
                      />
                      <span className="text-sm">{config.title}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Charts Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {chartConfigs.filter(config => config.enabled).map(config => (
                  <div key={config.id}>
                    {config.type === 'scatter' && config.yAxis && (
                      <ScatterPlot config={config} />
                    )}
                    {config.type === 'histogram' && (
                      <Histogram config={config} />
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'correlations' && (
            <div className="space-y-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-blue-900 mb-2">Correlation Matrix</h3>
                <p className="text-sm text-blue-700">
                  Correlation values range from -1 (strong negative) to +1 (strong positive). 
                  Values near 0 indicate weak correlation.
                </p>
              </div>
              {isCalculating && (
                <div className="text-sm text-blue-300">
                  <div className="mb-1">Calculating correlations...</div>
                  <div className="w-full bg-gray-700 rounded h-2 overflow-hidden">
                    <div className="bg-blue-500 h-2" style={{ width: `${Math.max(5, Math.round((progress || 0) * 100))}%` }} />
                  </div>
                </div>
              )}
              {workerError && (
                <div className="text-sm text-red-400">{workerError}</div>
              )}
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead>
                    <tr>
                      <th className="text-left p-2 font-medium">Metric</th>
                      {Object.keys(correlationMatrix).map(metric => (
                        <th key={metric} className="text-center p-2 font-medium text-sm">
                          {getMetricLabel(metric).split(' ')[0]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(correlationMatrix).map(([metric1, correlations]) => (
                      <tr key={metric1}>
                        <td className="p-2 font-medium text-sm">
                          {getMetricLabel(metric1)}
                        </td>
                        {Object.entries(correlations).map(([metric2, correlation]) => (
                          <td key={metric2} className="p-2 text-center">
                            <div 
                              className={`w-12 h-12 rounded flex items-center justify-center text-xs font-bold ${
                                getCorrelationColor(correlation)
                              } ${Math.abs(correlation) > 0.5 ? 'text-white' : 'text-gray-700'}`}
                            >
                              {correlation.toFixed(2)}
                            </div>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Correlation Insights */}
              <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4">
                <h4 className="text-lg font-semibold text-yellow-300 mb-2">Key Insights</h4>
                <ul className="text-sm text-yellow-200 space-y-1">
                  <li>• Strong positive correlations (&gt;0.7) suggest related physical properties</li>
                  <li>• Strong negative correlations (&lt;-0.7) suggest inverse relationships</li>
                  <li>• Weak correlations (±0.2) suggest independent or complex relationships</li>
                  <li>• Use these insights to understand planetary formation and evolution</li>
                </ul>
              </div>
            </div>
          )}

          {activeTab === 'export' && (
            <div className="space-y-6">
              <div className="bg-green-900 border border-green-700 rounded-lg p-4">
                <h3 className="text-lg font-semibold text-green-300 mb-2">Export Options</h3>
                <p className="text-sm text-green-200">
                  Export your analysis data in various formats for further research or presentations.
                </p>
              </div>

              {/* Metric Selection */}
              <div>
                <h4 className="text-lg font-semibold mb-3">Select Metrics to Export</h4>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                  {['pl_name', 'pl_rade', 'pl_bmasse', 'sy_dist', 'pl_eqt', 'pl_orbper', 'discoveryyear', 'discoverymethod'].map(metric => (
                    <label key={metric} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={selectedMetrics.includes(metric)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedMetrics(prev => [...prev, metric]);
                          } else {
                            setSelectedMetrics(prev => prev.filter(m => m !== metric));
                          }
                        }}
                        className="rounded"
                      />
                      <span className="text-sm">{getMetricLabel(metric)}</span>
                    </label>
                  ))}
                </div>
              </div>

              {/* Export Buttons */}
              <div className="space-y-4">
                <h4 className="text-lg font-semibold">Export Formats</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <button
                    onClick={() => {
                      const data = planets.map(planet => {
                        const row: any = {};
                        selectedMetrics.forEach(metric => {
                          row[metric] = planet[metric as keyof Planet];
                        });
                        return row;
                      });
                      
                      const csv = [
                        selectedMetrics.join(','),
                        ...data.map(row => selectedMetrics.map(metric => row[metric] || '').join(','))
                      ].join('\n');
                      
                      const blob = new Blob([csv], { type: 'text/csv' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'exoplanet-data.csv';
                      a.click();
                    }}
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
                  >
                    <span>📄</span>
                    Export as CSV
                  </button>
                  
                  <button
                    onClick={() => {
                      const data = planets.map(planet => {
                        const row: any = {};
                        selectedMetrics.forEach(metric => {
                          row[metric] = planet[metric as keyof Planet];
                        });
                        return row;
                      });
                      
                      const json = JSON.stringify(data, null, 2);
                      const blob = new Blob([json], { type: 'application/json' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'exoplanet-data.json';
                      a.click();
                    }}
                    className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 transition-colors flex items-center gap-2"
                  >
                    <span>🗂️</span>
                    Export as JSON
                  </button>
                  
                  <button
                    onClick={() => {
                      const statsText = `
Exoplanet Data Analysis Report
=============================

Dataset Overview:
- Total Planets: ${stats.totalPlanets}
- Earth-like Planets: ${stats.earthLikePlanets}
- Super-Earths: ${stats.superEarths}
- Hot Jupiters: ${stats.hotJupiters}

Average Properties:
- Radius: ${stats.avgRadius.toFixed(2)} Earth radii
- Mass: ${stats.avgMass.toFixed(2)} Earth masses
- Distance: ${stats.avgDistance.toFixed(1)} parsecs
- Temperature: ${stats.avgTemperature.toFixed(0)} K

Correlation Analysis:
${Object.entries(correlationMatrix).map(([metric1, correlations]) => 
  `${getMetricLabel(metric1)}:\n${Object.entries(correlations).map(([metric2, corr]) => 
    `  - vs ${getMetricLabel(metric2)}: ${corr.toFixed(3)}`
  ).join('\n')}`
).join('\n\n')}

Generated on: ${new Date().toLocaleString()}
                      `.trim();
                      
                      const blob = new Blob([statsText], { type: 'text/plain' });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement('a');
                      a.href = url;
                      a.download = 'exoplanet-analysis-report.txt';
                      a.click();
                    }}
                    className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors flex items-center gap-2"
                  >
                    <span>📋</span>
                    Export Analysis Report
                  </button>
                </div>
              </div>

              {/* Preview */}
              <div className="bg-gray-800 border border-gray-600 rounded-lg p-4">
                <h4 className="text-lg font-semibold mb-3 text-white">Export Preview</h4>
                <div className="text-sm text-gray-300">
                  Selected {selectedMetrics.length} metrics from {planets.length} planets
                </div>
                <div className="mt-2 text-xs text-gray-400">
                  Metrics: {selectedMetrics.map(m => getMetricLabel(m)).join(', ')}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default DataVisualization;