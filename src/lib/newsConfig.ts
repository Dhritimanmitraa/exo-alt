/**
 * News Feed Configuration
 * 
 * This file contains configuration options for the ExoplanetNewsFeed component.
 * Users can customize the news sources and data feeds.
 */

export interface NewsSource {
  name: string;
  url: string;
  type: 'json' | 'rss' | 'api';
  enabled: boolean;
  headers?: Record<string, string>;
}

export interface NewsConfig {
  sources: NewsSource[];
  refreshInterval: number; // in milliseconds
  useRealData: boolean;
  fallbackToMock: boolean;
}

export const DEFAULT_NEWS_CONFIG: NewsConfig = {
  // Default configuration uses mock data for comprehensive coverage
  useRealData: false,
  fallbackToMock: true,
  refreshInterval: 300000, // 5 minutes
  sources: [
    {
      name: 'NASA Exoplanet Archive News',
      url: 'https://exoplanetarchive.ipac.caltech.edu/docs/news_feed.json',
      type: 'json',
      enabled: false, // Disabled by default since this is a hypothetical API
    },
    {
      name: 'ESA Science News',
      url: 'https://www.esa.int/Science_Exploration/Space_Science/news.json',
      type: 'json',
      enabled: false, // Disabled by default since this is a hypothetical API
    },
    {
      name: 'User Custom Feed',
      url: '/data/custom-news.json',
      type: 'json',
      enabled: false, // Users can enable this and provide their own JSON file
    },
    {
      name: 'Local News File',
      url: '/data/exoplanet-news.json',
      type: 'json',
      enabled: false, // Disabled to use comprehensive mock data instead
    }
  ]
};

/**
 * News API Response Interface
 * This interface defines the expected structure for news data from APIs
 */
export interface NewsApiResponse {
  articles: Array<{
    id?: string;
    title: string;
    summary?: string;
    description?: string;
    content?: string;
    fullContent?: string;
    publishedAt?: string;
    source?: {
      name: string;
      url?: string;
    };
    urlToImage?: string;
    imageUrl?: string;
    tags?: string[];
    category?: string;
    significance?: 'breakthrough' | 'interesting' | 'routine';
    relatedPlanet?: string;
  }>;
  totalResults?: number;
  status?: string;
}

/**
 * Transform API response to internal news format
 */
export function transformApiResponse(response: NewsApiResponse): any[] {
  return response.articles.map((article, index) => ({
    id: article.id || `api-${Date.now()}-${index}`,
    title: article.title,
    summary: article.summary || article.description || '',
    fullContent: article.fullContent || article.content || article.summary || article.description || '',
    discoveryDate: article.publishedAt ? new Date(article.publishedAt) : new Date(),
    source: article.source?.name || 'External API',
    significance: article.significance || 'interesting',
    imageUrl: article.imageUrl || article.urlToImage,
    tags: article.tags || [],
    planet: undefined // This would need to be matched against the planets database
  }));
}

/**
 * Example custom news JSON structure that users can provide
 */
export const EXAMPLE_CUSTOM_NEWS = {
  articles: [
    {
      id: 'custom-1',
      title: 'Your Custom News Title',
      summary: 'A brief summary of your news article',
      fullContent: 'The full content of your news article...',
      publishedAt: '2024-01-15T10:00:00Z',
      source: {
        name: 'Your Source'
      },
      imageUrl: '/images/your-image.jpg',
      significance: 'interesting',
      tags: ['custom', 'example'],
      relatedPlanet: 'Kepler-442b'
    }
  ]
};