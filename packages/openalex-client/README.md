# @academic-explorer/openalex-client

A comprehensive TypeScript client for the [OpenAlex API](https://docs.openalex.org/), providing type-safe access to scholarly data including works, authors, sources, institutions, topics, publishers, and funders.

## Features

- **Complete API Coverage** - All OpenAlex entities and endpoints
- **Type Safety** - Full TypeScript support with strict typing
- **Rate Limiting** - Built-in rate limiting respecting OpenAlex limits
- **Automatic Retries** - Robust error handling with exponential backoff
- **Query Builder** - Fluent API for building complex queries
- **Autocomplete** - Search suggestions and cross-entity search
- **Zero Dependencies** - Self-contained package with no external dependencies
- **ESM/CJS Support** - Works in both ES modules and CommonJS environments

## Installation

```bash
npm install @academic-explorer/openalex-client
```

## Quick Start

```typescript
import { OpenAlexClient, createOpenAlexClient } from '@academic-explorer/openalex-client';

// Create client with configuration
const client = createOpenAlexClient({
  userEmail: 'researcher@university.edu' // Recommended for best performance
});

// Or use the default instance
import { openAlex } from '@academic-explorer/openalex-client';
```

## Basic Usage

### Works (Scholarly Documents)

```typescript
// Get a single work
const work = await client.works.getWork('W2741809807');

// Search for works
const works = await client.works.searchWorks('machine learning', {
  filters: {
    'publication_year': 2023,
    'is_oa': true,
    'cited_by_count': '>10'
  },
  sort: 'cited_by_count:desc',
  per_page: 25
});
```

### Authors

```typescript
// Get an author
const author = await client.authors.getAuthor('A5023888391');

// Search authors
const authors = await client.authors.searchAuthors('neural networks');
```

### Query Builder

```typescript
import { createWorksQuery } from '@academic-explorer/openalex-client';

const query = createWorksQuery()
  .filter('publication_year', 2023)
  .filter('is_oa', true)
  .filter('cited_by_count', '>10')
  .sort('cited_by_count:desc')
  .select(['id', 'display_name', 'cited_by_count'])
  .build();

const works = await client.works.getWorks(query);
```

## API Reference

### Entity APIs

- `client.works` - Works (papers, articles, books, etc.)
- `client.authors` - Authors and contributors
- `client.sources` - Journals, repositories, etc.
- `client.institutions` - Universities, organizations
- `client.topics` - Research topics and concepts
- `client.publishers` - Academic publishers
- `client.funders` - Funding organizations

### Utility APIs

- `client.autocomplete` - Search suggestions
- `client.textAnalysis` - Text analysis utilities
- `client.sampling` - Data sampling helpers
- `client.grouping` - Data grouping utilities
- `client.statistics` - Statistical analysis

## Configuration

```typescript
const client = createOpenAlexClient({
  // Your email for polite pool (higher rate limits)
  userEmail: 'researcher@university.edu',

  // Custom base URL (optional)
  baseUrl: 'https://api.openalex.org',

  // Request timeout in milliseconds
  timeout: 30000,

  // Custom headers
  headers: {
    'User-Agent': 'MyApp/1.0'
  }
});
```

## Error Handling

```typescript
import { OpenAlexApiError, OpenAlexRateLimitError } from '@academic-explorer/openalex-client';

try {
  const work = await client.works.getWork('W123456789');
} catch (error) {
  if (error instanceof OpenAlexRateLimitError) {
    console.log('Rate limited, retry after:', error.retryAfter);
  } else if (error instanceof OpenAlexApiError) {
    console.log('API error:', error.status, error.message);
  } else {
    console.log('Unknown error:', error);
  }
}
```

## Type Definitions

The package includes comprehensive TypeScript definitions for all OpenAlex entities:

```typescript
import type {
  Work,
  Author,
  Source,
  InstitutionEntity,
  Topic,
  Publisher,
  Funder
} from '@academic-explorer/openalex-client';
```

## License

MIT

## Contributing

This package is part of the Academic Explorer project. For issues and contributions, please visit the [GitHub repository](https://github.com/academic-explorer/academic-explorer).