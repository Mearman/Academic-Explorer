# GitHub Pages Static Data Reader

This module provides functionality to fetch static data from GitHub Pages URLs in production mode, with comprehensive caching, retry logic, and error handling.

## Features

- **Production-only fetching**: Only fetches data when running in production environment
- **In-memory caching**: Efficient TTL-based caching with configurable limits
- **Retry logic**: Exponential backoff retry mechanism for failed requests
- **Response validation**: Built-in data validation and type checking
- **Graceful degradation**: Returns null on failures instead of throwing errors
- **Timeout handling**: Configurable request timeouts with abort controller
- **Environment detection**: Automatic detection of production vs development environments

## Usage

### Basic Usage

```typescript
import { createGitHubPagesReader } from '@academic-explorer/client';

// Create reader with default configuration
const reader = createGitHubPagesReader({
  baseUrl: 'https://your-username.github.io/academic-explorer-data'
});

// Fetch static data
const data = await reader.fetchStaticData('entities/works/W123456789.json');
if (data) {
  console.log('Fetched data:', data);
} else {
  console.log('Data not available (development mode or fetch failed)');
}
```

### Advanced Configuration

```typescript
import { GitHubPagesReader } from '@academic-explorer/client';

const reader = new GitHubPagesReader({
  baseUrl: 'https://your-username.github.io/academic-explorer-data',
  timeout: 15000,           // 15 second timeout
  maxRetries: 5,            // 5 retry attempts
  initialRetryDelay: 2000,  // 2 second initial delay
  maxRetryDelay: 16000,     // 16 second max delay
  cacheTtl: 10 * 60 * 1000, // 10 minute cache TTL
  maxCacheSize: 200,        // Cache up to 200 items
  validateData: true        // Enable data validation
});
```

### Entity-specific Methods

```typescript
// Fetch OpenAlex entities
const work = await reader.fetchEntity<Work>('works', 'W123456789');
const author = await reader.fetchEntity<Author>('authors', 'A987654321');

// Fetch OpenAlex API responses
const response = await reader.fetchResponse<Work>('works', 'query-hash-123');
```

### Cache Management

```typescript
// Get cache statistics
const stats = reader.getCacheStats();
console.log('Cache hit rate:', stats.hitRate);
console.log('Cache size:', stats.size);

// Clear cache
reader.clearCache();

// Update configuration
reader.updateConfig({
  cacheTtl: 20 * 60 * 1000 // Change TTL to 20 minutes
});
```

## Environment Detection

The reader automatically detects production environments based on:

### Browser Environment
- **GitHub Pages**: Hostname contains 'github.io'
- **Custom domain**: Not localhost, dev, or test domains

### Node.js Environment
- **NODE_ENV**: Checks if `process.env.NODE_ENV === 'production'`

In non-production environments, all fetch methods return `null` immediately.

## Error Handling

The reader implements graceful error handling:

- **Network failures**: Retried with exponential backoff
- **Timeouts**: Requests aborted after configured timeout
- **Invalid data**: Validation errors logged and null returned
- **HTTP errors**: 4xx/5xx responses logged and retried appropriately

All errors are logged but do not throw exceptions, ensuring graceful degradation.

## File Structure

```
cache/static/
├── github-pages-reader.ts  # Main implementation
├── index.ts               # Exports
└── README.md             # This file
```

## Configuration Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `baseUrl` | string | Required | Base URL for GitHub Pages static data |
| `timeout` | number | 10000 | Request timeout in milliseconds |
| `maxRetries` | number | 3 | Maximum retry attempts |
| `initialRetryDelay` | number | 1000 | Initial retry delay in milliseconds |
| `maxRetryDelay` | number | 8000 | Maximum retry delay in milliseconds |
| `cacheTtl` | number | 300000 | Cache TTL in milliseconds (5 minutes) |
| `maxCacheSize` | number | 100 | Maximum number of cached items |
| `validateData` | boolean | true | Enable response data validation |

## Integration with Academic Explorer

This reader is designed to integrate with the Academic Explorer's static data generation pipeline:

1. **CLI generates static data** → GitHub Pages hosts it
2. **Production app uses reader** → Fetches pre-generated data
3. **Development app ignores reader** → Uses live API calls

This approach provides fast loading in production while maintaining flexibility in development.