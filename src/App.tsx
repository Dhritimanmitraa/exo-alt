import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';

// FadeInText component for fade-in animation
function TypewriterFadeText({ text, className }: { text: string; className?: string }) {
  void React;
  const [displayed, setDisplayed] = useState('');
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    setDisplayed('');
    setVisible(false);
    let timeouts: number[] = [];
    for (let i = 0; i <= text.length; i++) {
      timeouts.push(setTimeout(() => setDisplayed(text.slice(0, i)), i * 40));
    }
    // Fade in after typewriter
    timeouts.push(setTimeout(() => setVisible(true), text.length * 40 + 100));
    return () => timeouts.forEach((t) => clearTimeout(t));
  }, [text]);
  return (
    <span
      className={className}
      style={{
        opacity: visible ? 1 : 0.7,
        transform: visible ? 'translate3d(0,0,0)' : 'translate3d(0,10px,0)',
        transition: 'opacity 0.8s cubic-bezier(0.4,0,0.2,1), transform 0.8s cubic-bezier(0.4,0,0.2,1)',
        willChange: 'opacity, transform',
        display: 'inline-block'
      }}
    >{displayed}</span>
  );
}
import FilterPills, { FilterType } from './components/FilterPills';
import PlanetCard from './components/PlanetCard';
import PlanetDetail from './components/PlanetDetail';
import Timeline from './components/Timeline';
import Charts from './components/Charts';
import PlanetComparison from './components/PlanetComparison';
import ExoplanetNewsFeed from './components/ExoplanetNewsFeed';
import SpaceMissionPlanner from './components/SpaceMissionPlanner';
import EducationalQuests from './components/EducationalQuests';
import DataVisualization from './components/DataVisualization';
import { Planet, filterEarthLike, filterWeird, filterClosest, getRandomPlanet } from './lib/filters';
import VirtualPlanetGrid from './components/VirtualPlanetGrid';
import { NarrativeContext } from './lib/narrator';
import dataService from './lib/dataService';

// Lazy load the expensive 3D viewer component
const Planet3DViewer = lazy(() => import('./components/Planet3DViewer'));

function App() {
  const [planets, setPlanets] = useState<Planet[]>([]);
  const [filteredPlanets, setFilteredPlanets] = useState<Planet[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [selectedPlanet, setSelectedPlanet] = useState<Planet | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'home' | 'timeline' | 'charts'>('home');
  const [loading, setLoading] = useState(true);
  const [randomPlanet, setRandomPlanet] = useState<Planet | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false);
  const [isComparisonOpen, setIsComparisonOpen] = useState(false);
  const [comparedPlanets] = useState<Planet[]>([]);
  const [isNewsFeedOpen, setIsNewsFeedOpen] = useState(false);
  const [isMissionPlannerOpen, setIsMissionPlannerOpen] = useState(false);
  const [isEducationalQuestsOpen, setIsEducationalQuestsOpen] = useState(false);
  const [isDataVisualizationOpen, setIsDataVisualizationOpen] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [viewerPlanet, setViewerPlanet] = useState<Planet | null>(null);
  const [userStats, setUserStats] = useState({
    planetsViewed: 0,
    comparisonsCreated: 0,
    missionsPlanned: 0,
    newsRead: 0,
    simulationsRun: 0
  });
  // (footer animation observer removed — reverting to original behavior)
  const openViewer = (planet: Planet) => setViewerPlanet(planet);
  const closeViewer = () => setViewerPlanet(null);

  // Keyboard shortcuts removed

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await dataService.fetchPlanets();
        if (!mounted) return;
        try {
          const m = await import('./lib/memoizedFilters');
          m.clearFilterCaches();
        } catch (e) { /* ignore cache clear failure */ }
        setPlanets(data);
        setFilteredPlanets(data);
        setRandomPlanet(getRandomPlanet(data));
      } catch (error) {
        console.error('Error loading planets:', error);
        if (mounted) setLoadError('Failed to load planet data. Please check your connection and try again.');
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  // Wire header audio controls to the audio element
  // Controlled audio: use React state and a ref for mute/volume persistence
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(0.45);

  // Initialize from localStorage and wire audio element events
  useEffect(() => {
    const a = audioRef.current;
    if (!a) return;

    // hydrate from storage
    try {
      const storedVol = localStorage.getItem('exo-audio-volume');
      const storedMuted = localStorage.getItem('exo-audio-muted');
      if (storedVol !== null) {
        const v = parseFloat(storedVol);
        if (!isNaN(v)) setVolume(v);
      }
      if (storedMuted !== null) setIsMuted(storedMuted === '1');
    } catch (e) { /* ignore */ }
    // apply to element
    a.volume = volume;
    a.muted = isMuted;

    const onVolume = () => {
      setVolume(a.volume);
      setIsMuted(a.muted);
      try { localStorage.setItem('exo-audio-volume', String(a.volume)); } catch(e){}
      try { localStorage.setItem('exo-audio-muted', a.muted ? '1' : '0'); } catch(e){}
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    a.addEventListener('play', onPlay);
    a.addEventListener('pause', onPause);
    a.addEventListener('volumechange', onVolume);

    // Try to start audio on mount (best-effort). Keep default volume applied.
    try { a.volume = volume; a.muted = isMuted; const p = a.play(); if (p && typeof p.then === 'function') p.catch(()=>{}); } catch(e){}

    return () => {
      a.removeEventListener('play', onPlay);
      a.removeEventListener('pause', onPause);
      a.removeEventListener('volumechange', onVolume);
    };
  // intentionally include volume/isMuted so we re-apply when user updates state
  }, [audioRef, volume, isMuted]);

  // Handlers for controls
  const toggleMute = () => {
    const a = audioRef.current;
    if (!a) return;
    a.muted = !a.muted;
    setIsMuted(a.muted);
    try { localStorage.setItem('exo-audio-muted', a.muted ? '1' : '0'); } catch(e){}
  };
  // Volume is persisted but no UI control is shown; keep handler available if needed in future
  const togglePlay = async () => {
    const a = audioRef.current;
    if (!a) return;
    try {
      if (a.paused) await a.play(); else a.pause();
    } catch(e) { /* ignore play errors */ }
  };
  const handleVolumeChange = (v: number) => {
    const a = audioRef.current;
    if (!a) return;
    const vol = Math.max(0, Math.min(1, v));
    a.volume = vol;
    a.muted = vol === 0 ? true : false;
    setVolume(a.volume);
    setIsMuted(a.muted);
    try { localStorage.setItem('exo-audio-volume', String(a.volume)); localStorage.setItem('exo-audio-muted', a.muted ? '1' : '0'); } catch(e){}
  };

  useEffect(() => {
    if (planets.length === 0) return;

    let filtered: Planet[];
    
    // First apply filter
    switch (activeFilter) {
      case 'earthlike':
        filtered = filterEarthLike(planets);
        break;
      case 'weird':
        filtered = filterWeird(planets);
        break;
      case 'closest':
        filtered = filterClosest(planets);
        break;
      default:
        filtered = planets;
    }

    // Then apply search if there's a query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(planet => 
        planet.pl_name?.toLowerCase().includes(query) ||
        planet.hostname?.toLowerCase().includes(query) ||
        planet.discoverymethod?.toLowerCase().includes(query) ||
        planet.disc_facility?.toLowerCase().includes(query)
      );
    }

    const t0 = performance.now();
    setFilteredPlanets(filtered);
    if ((import.meta as any).env?.DEV) {
      const dt = Math.round(performance.now() - t0);
      console.debug(`[filters] ${activeFilter} -> ${filtered.length} planets in ${dt}ms`);
    }
  }, [activeFilter, planets, searchQuery]);

  const handlePlanetClick = (planet: Planet) => {
    setSelectedPlanet(planet);
    setIsDetailOpen(true);
    // Update user stats
    setUserStats(prev => ({
      ...prev,
      planetsViewed: prev.planetsViewed + 1
    }));
  };

  const getContextFromFilter = (filter: FilterType): NarrativeContext => {
    switch (filter) {
      case 'earthlike': return 'earthlike';
      case 'weird': return 'weird';
      case 'closest': return 'closest';
      default: return 'random';
    }
  };

  // Typewriter animation state
  const [typewriterName, setTypewriterName] = useState<string>("");
  const [typewriterInfo, setTypewriterInfo] = useState<string>("");
  const typewriterTimeouts = useRef<number[]>([]);

  // Helper for typewriter effect
  const runTypewriter = (text: string, setter: (s: string) => void, speed = 30) => {
    setter("");
    typewriterTimeouts.current.forEach(clearTimeout);
    typewriterTimeouts.current = [];
    for (let i = 0; i <= text.length; i++) {
      typewriterTimeouts.current.push(
        window.setTimeout(() => setter(text.slice(0, i)), i * speed)
      );
    }
  };

  // Generate new random planet and animate
  const generateNewRandomPlanet = () => {
    const planet = getRandomPlanet(planets);
    setRandomPlanet(planet);
    if (planet) {
      runTypewriter(planet.pl_name, setTypewriterName, 50);
      // Use narrator for info text
      // Default context is 'random' for random discovery
      // Import narrate from lib/narrator
      import('./lib/narrator').then(({ narrate }) => {
        runTypewriter(narrate(planet, 'random'), setTypewriterInfo, 20);
      });
    } else {
      setTypewriterName("");
      setTypewriterInfo("");
    }
  };

  // (No display-only swap necessary; data loaded above is already swapped if desired)

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-space-dark via-space-blue to-cosmic-purple flex items-center justify-center">
        <div className="text-center text-white">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-stellar-gold mx-auto mb-4"></div>
          <h2 className="text-2xl font-bold mb-2">ExoArchive Pocket</h2>
          <p className="text-lg opacity-90">Loading cosmic data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-transparent">
      {/* Header */}
  <header className="bg-gradient-to-r from-space-dark to-space-blue text-white shadow-lg" style={{background: 'linear-gradient(to right, rgba(15,23,42,0.5), rgba(37,99,235,0.5))'}}>
        <div className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div className="mb-3 sm:mb-0">
              {/* Fade-in animation for header text */}
              <div>
                <TypewriterFadeText text="🌟 ExoArchive Pocket" className="text-2xl sm:text-3xl font-bold mb-1 sm:mb-2" />
                <br />
                <TypewriterFadeText text="Discover exoplanets and space heritage" className="text-blue-200 text-sm sm:text-base" />
              </div>
            </div>
            <nav className="flex gap-2 sm:gap-4">
              <button
                onClick={() => setCurrentView('home')}
                className={'px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ' +
                  (currentView === 'home' ? 'bg-white text-space-blue' : 'text-white hover:bg-white/20')}
              >
                Planets
              </button>
              <button
                onClick={() => setCurrentView('timeline')}
                className={'px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ' +
                  (currentView === 'timeline' ? 'bg-white text-space-blue' : 'text-white hover:bg-white/20')}
              >
                Timeline
              </button>
              <button
                onClick={() => setCurrentView('charts')}
                className={'px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base ' +
                  (currentView === 'charts' ? 'bg-white text-space-blue' : 'text-white hover:bg-white/20')}
              >
                Charts
              </button>
              <button
                onClick={() => setIsComparisonOpen(true)}
                className="px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base text-white hover:bg-white/20 border border-white/20"
              >
                Compare
              </button>
              <button
                onClick={() => setIsNewsFeedOpen(true)}
                className="px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base text-white hover:bg-white/20 border border-white/20"
              >
                📡 News
              </button>
              <button
                onClick={() => setIsMissionPlannerOpen(true)}
                className="px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base text-white hover:bg-white/20 border border-white/20"
              >
                🚀 Missions
              </button>
              <button
                onClick={() => setIsEducationalQuestsOpen(true)}
                className="px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base text-white hover:bg-white/20 border border-white/20"
              >
                🎓 Quests
              </button>
              <button
                onClick={() => setIsDataVisualizationOpen(true)}
                className="px-3 sm:px-4 py-2 rounded-lg transition-colors text-sm sm:text-base text-white hover:bg-white/20 border border-white/20"
              >
                📊 Data
              </button>
              {/* Theme is fixed to dark; theme toggle removed */}
              {/* Audio controls: play/pause, speaker (mute), volume */}
              <div className="flex items-center gap-2 ml-2">
                <button onClick={togglePlay} aria-label="Play/Pause audio" title="Play/Pause audio" className="px-3 py-2 rounded-lg bg-white/10 hover:bg-white/20 text-white">{isPlaying ? '⏸' : '⏵'}</button>
                <button onClick={toggleMute} aria-label={isMuted || volume === 0 ? 'Unmute audio' : 'Mute audio'} title={isMuted || volume === 0 ? 'Unmute' : 'Mute'} aria-pressed={isMuted || volume === 0} className="p-2 rounded-md bg-white/5 hover:bg-white/10 text-white">
                  { (isMuted || volume === 0) ? (
                    // Muted icon (speaker with X)
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                      <line x1="19" y1="5" x2="5" y2="19"></line>
                    </svg>
                  ) : (
                    // Speaker icon (sound present)
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 5L6 9H2v6h4l5 4V5z"></path>
                    </svg>
                  )}
                  {/* subtle playing indicator: appears only when audio is playing and not muted */}
                  {(isPlaying && !isMuted && volume > 0) && (
                    <span className="sound-indicator" aria-hidden="true"></span>
                  )}
                </button>
                <input value={String(volume)} onChange={(e) => handleVolumeChange(parseFloat(e.target.value || '0'))} type="range" min="0" max="1" step="0.01" className="w-24" aria-label="Volume" />
              </div>
            </nav>
          </div>
        </div>
      </header>

  {/* Hidden audio element managed by React */}
  <audio ref={audioRef} src="/audio/ambient.mp3" loop preload="auto" style={{ display: 'none' }} autoPlay />

      {/* Load error banner (non-blocking) */}
      {loadError && (
        <div className="max-w-7xl mx-auto px-3 sm:px-4 mt-3">
          <div className="bg-red-50 border border-red-200 text-red-800 rounded-lg p-3 text-sm">
            {loadError}
          </div>
        </div>
      )}

      {currentView === 'timeline' ? (
        <Timeline />
      ) : currentView === 'charts' ? (
        <Charts planets={planets} />
      ) : (
        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6">
          {/* Filters */}
          <div className="bg-transparent rounded-lg shadow-none mb-4 sm:mb-6">
            <FilterPills activeFilter={activeFilter} onFilterChange={setActiveFilter} />
          </div>

          {/* Search */}
              <div className="bg-white rounded-lg shadow-md mb-4 sm:mb-6 p-3 sm:p-4">
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="h-5 w-5 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </div>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search planets, stars, or discovery methods..."
                className="block w-full pl-10 pr-10 py-2 sm:py-3 rounded-lg frosted-search text-white placeholder-gray-400 focus:ring-2 focus:ring-cosmic-purple focus:border-transparent text-sm"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>

          {/* Random Planet Showcase */}
          {randomPlanet && activeFilter === 'all' && (
            <div className="frosted-panel text-white rounded-lg p-4 sm:p-6 mb-4 sm:mb-6">
              <div className="flex flex-col">
                <div className="flex-1 panel-content">
                  <h2 className="text-xl sm:text-2xl font-bold mb-2">🎲 Random Discovery</h2>
                  <h3 className="text-lg sm:text-xl mb-2">
                    <span>{typewriterName || randomPlanet.pl_name}</span>
                  </h3>
                  <p className="text-blue-100 mb-4 text-sm sm:text-base">
                    <span>{typewriterInfo || `Orbiting ${randomPlanet.hostname || 'its star'} • Discovered in ${randomPlanet.discoveryyear || 'unknown year'} • ${randomPlanet.sy_dist ? `${randomPlanet.sy_dist.toFixed(1)} parsecs away` : 'Distance unknown'}`}</span>
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <button
                      onClick={() => handlePlanetClick(randomPlanet)}
                      className="cta-primary"
                    >
                      Explore This World
                    </button>
                    <button
                      onClick={generateNewRandomPlanet}
                      className="cta-secondary"
                    >
                      🎲 Travel Random
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Results count */}
          <div className="mb-4">
            <p className="text-gray-600">
              {searchQuery.trim() ? (
                `Found ${filteredPlanets.length} planets matching "${searchQuery}"`
              ) : filteredPlanets.length === planets.length ? (
                `Showing all ${planets.length} planets`
              ) : (
                `Found ${filteredPlanets.length} planets matching filter`
              )}
              {searchQuery.trim() && activeFilter !== 'all' && ` (${activeFilter} filter applied)`}
            </p>
          </div>

          {/* Planet Grid (virtualized) */}
          {filteredPlanets.length > 0 ? (
            <VirtualPlanetGrid
              planets={filteredPlanets}
              onPlanetClick={handlePlanetClick}
              onView3D={openViewer}
              filterType={activeFilter}
              className="planet-grid"
            />
          ) : (
            <div className="text-center py-12">
              <div className="text-6xl mb-4"></div>
              <h3 className="text-xl font-bold text-gray-900 mb-2">No planets found</h3>
              <p className="text-gray-600 mb-4">
                Try adjusting your filter or explore all planets to discover amazing worlds.
              </p>
              <button
                onClick={() => setActiveFilter('all')}
                className="bg-cosmic-purple text-white px-6 py-3 rounded-lg hover:bg-purple-700 transition-colors"
              >
                Show All Planets
              </button>
            </div>
          )}
        </main>
      )}

      {/* Planet Detail Modal */}
      <PlanetDetail
        planet={selectedPlanet}
        isOpen={isDetailOpen}
        onClose={() => setIsDetailOpen(false)}
        context={getContextFromFilter(activeFilter)}
      />

      {/* Footer */}
      <footer className="bg-space-dark text-white mt-12">
        <div className="max-w-7xl mx-auto px-4 py-8">
            <div className="text-center">
              <h3 className="text-xl font-bold mb-2 footer-animate" style={{ animationDelay: '80ms' }}>ExoArchive Pocket</h3>
              <p className="text-gray-300 mb-4 footer-animate" style={{ animationDelay: '180ms' }}>
                Exploring the cosmos, one planet at a time.
              </p>
              <p className="text-sm text-gray-400 footer-animate" style={{ animationDelay: '280ms' }}>
                Data sourced from NASA Exoplanet Archive
              </p>
            </div>
        </div>
      </footer>

      {/* Keyboard Shortcuts Help */}
      {showKeyboardHelp && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-gray-900">⌨️ Keyboard Shortcuts</h3>
              <button
                onClick={() => setShowKeyboardHelp(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            
            <div className="space-y-3 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <div className="font-bold text-gray-700 mb-2">Navigation</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>Planets</span>
                      <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">1</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Timeline</span>
                      <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">2</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Charts</span>
                      <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">3</kbd>
                    </div>
                  </div>
                </div>
                
                <div>
                  <div className="font-bold text-gray-700 mb-2">Filters</div>
                  <div className="space-y-1">
                    <div className="flex justify-between">
                      <span>All</span>
                      <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">A</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Earth-like</span>
                      <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">E</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Weird</span>
                      <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">W</kbd>
                    </div>
                    <div className="flex justify-between">
                      <span>Closest</span>
                      <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">C</kbd>
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="pt-3 border-t border-gray-200">
                <div className="font-bold text-gray-700 mb-2">Actions</div>
                <div className="space-y-1">
                  <div className="flex justify-between">
                    <span>Search</span>
                    <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">/</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Random Planet</span>
                    <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">R</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Compare Planets</span>
                    <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">X</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>News Feed</span>
                    <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">N</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Mission Planner</span>
                    <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">M</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Educational Quests</span>
                    <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">Q</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Data Visualization</span>
                    <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">D</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>Close/Clear</span>
                    <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">ESC</kbd>
                  </div>
                  <div className="flex justify-between">
                    <span>This Help</span>
                    <kbd className="bg-gray-100 px-2 py-1 rounded text-xs">?</kbd>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* Planet Comparison Tool */}
      <PlanetComparison
        planets={planets}
        isOpen={isComparisonOpen}
        onClose={() => setIsComparisonOpen(false)}
        initialPlanets={comparedPlanets}
      />
      
      {/* Exoplanet News Feed */}
      <ExoplanetNewsFeed
        planets={planets}
        isOpen={isNewsFeedOpen}
        onClose={() => setIsNewsFeedOpen(false)}
        onPlanetClick={(planet) => {
          setSelectedPlanet(planet);
          setIsDetailOpen(true);
          setIsNewsFeedOpen(false);
        }}
      />
      
      {/* Space Mission Planner */}
      <SpaceMissionPlanner
        planets={planets}
        isOpen={isMissionPlannerOpen}
        onClose={() => setIsMissionPlannerOpen(false)}
      />
      
      {/* Educational Quests */}
      <EducationalQuests
        planets={planets}
        isOpen={isEducationalQuestsOpen}
        onClose={() => setIsEducationalQuestsOpen(false)}
        userStats={userStats}
      />
      
      {/* Data Visualization Dashboard */}
      <DataVisualization
        planets={planets}
        isOpen={isDataVisualizationOpen}
        onClose={() => setIsDataVisualizationOpen(false)}
      />

      {/* 3D Planet Viewer */}
      <Suspense fallback={<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"><div className="text-white">Loading 3D viewer...</div></div>}>
        {viewerPlanet && (
          <Planet3DViewer planet={viewerPlanet} onClose={closeViewer} />
        )}
      </Suspense>
    </div>
  );
}

// ThemeToggle removed; app is dark-only by default.

export default App;
