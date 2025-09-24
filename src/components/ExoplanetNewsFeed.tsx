import React, { useState, useEffect } from 'react';
import { Planet } from '../lib/filters';
import { newsService, ExoplanetNews } from '../lib/newsService';

interface ExoplanetNewsFeedProps {
  planets: Planet[];
  isOpen: boolean;
  onClose: () => void;
  onPlanetClick?: (planet: Planet) => void;
}

// News item component
function NewsItem({ 
  news, 
  onPlanetClick,
  isExpanded,
  onToggleExpand
}: { 
  news: ExoplanetNews; 
  onPlanetClick?: (planet: Planet) => void;
  isExpanded: boolean;
  onToggleExpand: (newsId: string) => void;
}) {
  const getSignificanceColor = (significance: ExoplanetNews['significance']) => {
    switch (significance) {
      case 'breakthrough': return 'bg-red-100 text-red-800 border-red-200';
      case 'interesting': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'routine': return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getSignificanceIcon = (significance: ExoplanetNews['significance']) => {
    switch (significance) {
      case 'breakthrough': return '🚀';
      case 'interesting': return '🔍';
      case 'routine': return '📰';
    }
  };

  const formatDate = (date: Date) => {
    const now = new Date();
    const diffTime = now.getTime() - date.getTime();
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Today';
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.floor(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  return (
    <article className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow duration-300">
      {/* Image */}
      {news.imageUrl && (
        <div className="h-48 overflow-hidden">
          <img
            src={news.imageUrl}
            alt={news.title}
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </div>
      )}
      
      <div className="p-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <span 
              className={`px-2 py-1 rounded-full text-xs font-medium border ${getSignificanceColor(news.significance)}`}
            >
              {getSignificanceIcon(news.significance)} {news.significance.charAt(0).toUpperCase() + news.significance.slice(1)}
            </span>
            <span className="text-sm text-gray-500">{formatDate(news.discoveryDate)}</span>
          </div>
          <span className="text-xs text-gray-400">{news.source}</span>
        </div>
        
        {/* Title */}
        <h3 className="text-lg font-bold text-gray-900 mb-3 line-clamp-2">
          {news.title}
        </h3>
        
        {/* Summary or Full Content */}
        <div className="text-gray-700 text-sm leading-relaxed mb-4">
          {isExpanded ? (
            <div className="space-y-3">
              {news.fullContent.split('\n\n').map((paragraph, index) => (
                <p key={index}>{paragraph}</p>
              ))}
            </div>
          ) : (
            <p className="line-clamp-3">{news.summary}</p>
          )}
        </div>
        
        {/* Tags */}
        <div className="flex flex-wrap gap-1 mb-4">
          {news.tags.map((tag) => (
            <span
              key={tag}
              className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-md"
            >
              #{tag}
            </span>
          ))}
        </div>
        
        {/* Actions */}
        <div className="flex items-center justify-between">
          {news.planet && onPlanetClick && (
            <button
              onClick={() => onPlanetClick(news.planet!)}
              className="text-cosmic-purple hover:text-purple-700 text-sm font-medium flex items-center gap-1"
            >
              🌍 View Planet Details
            </button>
          )}
          <button 
            onClick={() => onToggleExpand(news.id)}
            className="text-blue-600 hover:text-blue-800 text-sm font-medium hover:underline transition-colors flex items-center gap-1"
          >
            {isExpanded ? (
              <>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                </svg>
                Show Less
              </>
            ) : (
              <>
                Read More
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </article>
  );
}

// Filter component
function NewsFilters({ 
  selectedFilter, 
  onFilterChange,
  newsCount
}: { 
  selectedFilter: string; 
  onFilterChange: (filter: string) => void;
  newsCount: { [key: string]: number };
}) {
  const filters = [
    { id: 'all', label: 'All News', count: newsCount.all },
    { id: 'breakthrough', label: 'Breakthroughs', count: newsCount.breakthrough },
    { id: 'interesting', label: 'Interesting', count: newsCount.interesting },
    { id: 'routine', label: 'Updates', count: newsCount.routine }
  ];

  return (
    <div className="flex flex-wrap gap-2 mb-6">
      {filters.map((filter) => (
        <button
          key={filter.id}
          onClick={() => onFilterChange(filter.id)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors border ${
            selectedFilter === filter.id
              ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
              : 'bg-white text-gray-800 border-gray-300 hover:bg-gray-50 hover:border-gray-400'
          }`}
        >
          {filter.label} ({filter.count})
        </button>
      ))}
    </div>
  );
}

// Search component
function NewsSearch({ 
  searchQuery, 
  onSearchChange 
}: { 
  searchQuery: string; 
  onSearchChange: (query: string) => void;
}) {
  return (
    <div className="relative mb-6">
      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
        <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </div>
      <input
        type="text"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        placeholder="Search exoplanet news..."
        className="block w-full pl-10 pr-3 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cosmic-purple focus:border-transparent"
      />
    </div>
  );
}

// Main news feed component
const ExoplanetNewsFeed: React.FC<ExoplanetNewsFeedProps> = ({ 
  planets, 
  isOpen, 
  onClose,
  onPlanetClick
}) => {
  const [newsItems, setNewsItems] = useState<ExoplanetNews[]>([]);
  const [filteredNews, setFilteredNews] = useState<ExoplanetNews[]>([]);
  const [selectedFilter, setSelectedFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedArticles, setExpandedArticles] = useState<Set<string>>(new Set());

  // Fetch news when component mounts or planets change
  useEffect(() => {
    if (isOpen && planets.length > 0) {
      fetchNewsData();
    }
  }, [isOpen, planets]);

  const fetchNewsData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const news = await newsService.fetchNews(planets);
      setNewsItems(news);
      setFilteredNews(news);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch news');
      console.error('Error fetching news:', err);
    } finally {
      setLoading(false);
    }
  };

  // Filter and search news
  useEffect(() => {
    let filtered = newsItems;

    // Apply significance filter
    if (selectedFilter !== 'all') {
      filtered = filtered.filter(news => news.significance === selectedFilter);
    }

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(news =>
        news.title.toLowerCase().includes(query) ||
        news.summary.toLowerCase().includes(query) ||
        news.tags.some(tag => tag.toLowerCase().includes(query)) ||
        (news.planet && news.planet.pl_name.toLowerCase().includes(query))
      );
    }

    setFilteredNews(filtered);
  }, [newsItems, selectedFilter, searchQuery]);

  // Calculate filter counts
  const newsCount = {
    all: newsItems.length,
    breakthrough: newsItems.filter(n => n.significance === 'breakthrough').length,
    interesting: newsItems.filter(n => n.significance === 'interesting').length,
    routine: newsItems.filter(n => n.significance === 'routine').length
  };

  const handlePlanetClick = (planet: Planet) => {
    if (onPlanetClick) {
      onPlanetClick(planet);
    }
  };

  const handleToggleExpand = (newsId: string) => {
    setExpandedArticles(prev => {
      const newSet = new Set(prev);
      if (newSet.has(newsId)) {
        newSet.delete(newsId);
      } else {
        newSet.add(newsId);
      }
      return newSet;
    });
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
                📡 Exoplanet News Feed
              </h2>
              <p className="text-gray-600 mt-1">Latest discoveries and research updates</p>
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

          <div className="p-6">
            {loading ? (
              <div className="text-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-cosmic-purple mx-auto mb-4"></div>
                <p className="text-gray-600">Loading latest news...</p>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚠️</div>
                <h3 className="text-xl font-bold text-gray-900 mb-2">Failed to load news</h3>
                <p className="text-gray-600 mb-4">{error}</p>
                <button
                  onClick={fetchNewsData}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <>
                {/* Search */}
                <NewsSearch searchQuery={searchQuery} onSearchChange={setSearchQuery} />
                
                {/* Filters */}
                <NewsFilters
                  selectedFilter={selectedFilter}
                  onFilterChange={setSelectedFilter}
                  newsCount={newsCount}
                />
                
                {/* News Grid */}
                {filteredNews.length > 0 ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredNews.map((news) => (
                      <NewsItem
                        key={news.id}
                        news={news}
                        onPlanetClick={handlePlanetClick}
                        isExpanded={expandedArticles.has(news.id)}
                        onToggleExpand={handleToggleExpand}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="text-6xl mb-4">🔍</div>
                    <h3 className="text-xl font-bold text-gray-900 mb-2">No news found</h3>
                    <p className="text-gray-600">
                      Try adjusting your search or filter criteria.
                    </p>
                  </div>
                )}

                {/* Configuration note */}
                <div className="mt-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>News Configuration:</strong> This application supports custom news feeds. 
                    You can provide your own JSON feed or enable real API integration by modifying 
                    the news configuration in <code>src/lib/newsConfig.ts</code>. 
                    See <code>public/data/exoplanet-news.json</code> for an example custom feed format.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ExoplanetNewsFeed;
