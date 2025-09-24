# ExoArchive Pocket - News Feed Configuration

## Overview

The ExoArchive Pocket application supports configurable news feeds. You can use mock data (default), provide your own JSON feed, or integrate with real APIs.

## Quick Start

### Option 1: Use Mock Data (Default)
No configuration needed. The application will use built-in mock news articles.

### Option 2: Custom Local JSON Feed
1. Edit `public/data/exoplanet-news.json` with your own news articles
2. In `src/lib/newsConfig.ts`, set:
   ```typescript
   export const DEFAULT_NEWS_CONFIG: NewsConfig = {
     useRealData: true,
     sources: [
       {
         name: 'Local News File',
         url: '/data/exoplanet-news.json',
         type: 'json',
         enabled: true
       }
     ]
   };
   ```

### Option 3: External API Integration
1. In `src/lib/newsConfig.ts`, configure your API:
   ```typescript
   export const DEFAULT_NEWS_CONFIG: NewsConfig = {
     useRealData: true,
     sources: [
       {
         name: 'Your API',
         url: 'https://your-api.com/news.json',
         type: 'json',
         enabled: true,
         headers: {
           'Authorization': 'Bearer YOUR_API_KEY'
         }
       }
     ]
   };
   ```

## JSON Format

Your news feed should follow this structure:

```json
{
  "articles": [
    {
      "id": "unique-id",
      "title": "News Article Title",
      "summary": "Brief summary...",
      "fullContent": "Full article content...",
      "publishedAt": "2024-01-15T10:00:00Z",
      "source": {
        "name": "Source Name"
      },
      "imageUrl": "/images/image.jpg",
      "significance": "breakthrough|interesting|routine",
      "tags": ["tag1", "tag2"],
      "relatedPlanet": "Planet Name (optional)"
    }
  ]
}
```

## Configuration Options

### News Sources
- **Local JSON**: Files in the `public/data/` directory
- **External APIs**: Any HTTP endpoint returning JSON
- **Multiple Sources**: Enable multiple sources for aggregated news

### Refresh Settings
- `refreshInterval`: How often to fetch new data (milliseconds)
- `fallbackToMock`: Whether to use mock data if APIs fail

### Example Real API Endpoints (Hypothetical)
- NASA Exoplanet Archive: `https://exoplanetarchive.ipac.caltech.edu/docs/news_feed.json`
- ESA Science News: `https://www.esa.int/Science_Exploration/Space_Science/news.json`

## Implementation Notes

1. The application automatically matches news articles to planets in the database
2. Articles are sorted by publication date
3. Duplicate articles (by title) are automatically removed
4. If all configured sources fail, the app falls back to mock data (if enabled)

## Security Considerations

- Only use trusted news sources
- API keys should be handled securely
- CORS policies may affect external API access

## Troubleshooting

- Check browser console for API errors
- Verify JSON format validity
- Ensure CORS headers are properly configured for external APIs
- Test with local JSON files first before using external APIs