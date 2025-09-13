# OpenAlex API Client

A comprehensive TypeScript client for the [OpenAlex API](https://docs.openalex.org/), providing type-safe access to scholarly data including works, authors, sources, institutions, topics, publishers, and funders.

## Features

- **Complete API Coverage** - All OpenAlex entities and endpoints
- **Type Safety** - Full TypeScript support with strict typing
- **Rate Limiting** - Built-in rate limiting respecting OpenAlex limits
- **Automatic Retries** - Robust error handling with exponential backoff
- **Streaming Support** - Memory-efficient processing of large datasets
- **Query Builder** - Fluent API for building complex queries
- **Autocomplete** - Search suggestions and cross-entity search
- **Comprehensive Documentation** - JSDoc for all methods

## Quick Start

```typescript
import { OpenAlexClient, createOpenAlexClient } from '@/lib/openalex';

// Create client with configuration
const client = createOpenAlexClient({
  userEmail: 'researcher@university.edu' // Recommended for best performance
});

// Or use the default instance
import { openAlex } from '@/lib/openalex';
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

// Get works by author
const authorWorks = await client.works.getWorksByAuthor('A5023888391');

// Stream large datasets efficiently
for await (const batch of client.works.streamWorks({ filter: 'publication_year:2023' })) {
  console.log(`Processing ${batch.length} works...`);
  // Process each batch
}
```

### Authors

```typescript
// Get author details
const author = await client.authors.getAuthor('A5023888391');

// Search authors
const authors = await client.authors.searchAuthors('albert einstein');

// Get authors by institution
const institutionAuthors = await client.authors.getAuthorsByInstitution('I27837315');

// Analyze collaborators
const collaborators = await client.authors.getAuthorCollaborators('A5023888391');
```

### Sources (Journals, Conferences)

```typescript
// Get journal information
const journal = await client.sources.getSource('S4210194219');

// Find open access sources
const oaSources = await client.sources.getOpenAccessSources();

// Get sources by publisher
const publisherSources = await client.sources.getSourcesByPublisher('elsevier');
```

### Institutions

```typescript
// Get institution details
const institution = await client.institutions.getInstitution('I27837315');

// Search institutions
const institutions = await client.institutions.searchInstitutions('stanford university');

// Get institutions by country
const usInstitutions = await client.institutions.getInstitutionsByCountry('US');
```

## Advanced Usage

### Query Builder

Build complex queries with the fluent query builder:

```typescript
import { createWorksQuery } from '@/lib/openalex';

const query = createWorksQuery()
  .addFilter('publication_year', 2023)
  .addFilter('authorships.institution.country_code', 'US')
  .addFilter('cited_by_count', 10, '>')
  .addFilter('is_oa', true)
  .addSearch('default.search', 'climate change')
  .addSort('cited_by_count', 'desc');

const works = await client.works.getWorks({
  filter: query.buildFilterString(),
  sort: query.buildSortString(),
  per_page: 50
});
```

### Cross-Entity Search

Search across multiple entity types simultaneously:

```typescript
const results = await client.searchAll('artificial intelligence', {
  entityTypes: ['works', 'authors', 'topics'],
  limit: 10
});

console.log(\`Found:\`);
console.log(\`- \${results.works.length} works\`);
console.log(\`- \${results.authors.length} authors\`);
console.log(\`- \${results.topics.length} topics\`);
```

### Autocomplete

Get search suggestions:

```typescript
// General autocomplete
const suggestions = await client.autocomplete.autocomplete('stanf');

// Entity-specific autocomplete
const authorSuggestions = await client.autocomplete.autocompleteAuthors('john sm');

// Cross-entity search
const searchResults = await client.autocomplete.search('machine learning', ['works', 'authors']);
```

### Batch Processing

Process large datasets efficiently:

```typescript
await client.batchProcess(
  'works',
  { filter: 'publication_year:2023', per_page: 200 },
  async (batch) => {
    for (const work of batch) {
      // Process each work
      console.log(\`Processing: \${work.display_name}\`);

      // Your processing logic here
      await processWork(work);
    }
  }
);
```

### Entity Detection

Automatically detect and fetch entities by ID:

```typescript
// Automatically detects entity type and fetches appropriately
const entity = await client.getEntity('W2741809807'); // Work
const entity2 = await client.getEntity('A5023888391'); // Author

// Check entity type
const entityType = client.detectEntityType('W2741809807'); // 'works'

// Validate OpenAlex ID
const isValid = client.isValidOpenAlexId('W2741809807'); // true
```

## Configuration

### Client Options

```typescript
const client = createOpenAlexClient({
  // Required: Your email for best performance (recommended by OpenAlex)
  userEmail: 'researcher@university.edu',

  // Optional: Custom base URL (defaults to https://api.openalex.org)
  baseUrl: 'https://api.openalex.org',

  // Optional: Rate limiting configuration
  rateLimit: {
    requestsPerSecond: 10,     // Max requests per second (default: 10)
    requestsPerDay: 100000     // Max requests per day (default: 100,000)
  },

  // Optional: Request timeout in milliseconds (default: 30000)
  timeout: 30000,

  // Optional: Number of retries for failed requests (default: 3)
  retries: 3,

  // Optional: Delay between retries in milliseconds (default: 1000)
  retryDelay: 1000
});
```

### Environment Variables

You can also configure the client using environment variables:

```bash
OPENALEX_USER_EMAIL=researcher@university.edu
OPENALEX_BASE_URL=https://api.openalex.org
OPENALEX_REQUESTS_PER_SECOND=10
OPENALEX_REQUESTS_PER_DAY=100000
```

## Rate Limiting

The client automatically handles OpenAlex rate limits:

- **Daily Limit**: 100,000 requests per day
- **Per-Second Limit**: Configurable (default: 10 requests/second)
- **Automatic Throttling**: Built-in request spacing
- **Rate Limit Monitoring**: Check current usage

```typescript
// Check rate limit status
const stats = client.getStats();
console.log(\`Requests today: \${stats.rateLimit.requestsToday}\`);
console.log(\`Requests remaining: \${stats.rateLimit.requestsRemaining}\`);
console.log(\`Reset time: \${stats.rateLimit.dailyResetTime}\`);
```

## Error Handling

The client provides detailed error information:

```typescript
import { OpenAlexApiError, OpenAlexRateLimitError } from '@/lib/openalex';

try {
  const work = await client.works.getWork('invalid-id');
} catch (error) {
  if (error instanceof OpenAlexRateLimitError) {
    console.log(\`Rate limit exceeded. Retry after: \${error.retryAfter}ms\`);
  } else if (error instanceof OpenAlexApiError) {
    console.log(\`API Error: \${error.message} (Status: \${error.statusCode})\`);
  } else {
    console.log(\`Unexpected error: \${error.message}\`);
  }
}
```

## TypeScript Support

Full TypeScript support with comprehensive type definitions:

```typescript
import type {
  Work,
  Author,
  Source,
  WorksFilters,
  QueryParams,
  OpenAlexResponse
} from '@/lib/openalex';

// Type-safe filtering
const filters: WorksFilters = {
  'publication_year': 2023,
  'authorships.author.id': ['A123', 'A456'],
  'is_oa': true,
  'cited_by_count': '>10'
};

// Type-safe responses
const response: OpenAlexResponse<Work> = await client.works.getWorks({ filter: buildFilterString(filters) });
```

## Entity Types

The client supports all OpenAlex entity types:

| Entity | Description | Example ID |
|--------|-------------|------------|
| **Works** | Scholarly documents (papers, books, datasets) | `W2741809807` |
| **Authors** | Researchers and their publications | `A5023888391` |
| **Sources** | Journals, conferences, repositories | `S4210194219` |
| **Institutions** | Universities, companies, research centers | `I27837315` |
| **Topics** | Research topics and subjects (new) | `T12345` |
| **Publishers** | Academic publishers | `P4310319900` |
| **Funders** | Research funding organizations | `F4320306076` |
| **Concepts** | Legacy research concepts (being phased out) | `C2780797713` |

## Advanced Filtering

### Logical Operators

```typescript
// OR logic with arrays
filters['authorships.author.id'] = ['A123', 'A456']; // author A123 OR A456

// Comparison operators
filters['cited_by_count'] = '>10';        // more than 10 citations
filters['publication_year'] = '2020-2023'; // between 2020 and 2023
filters['is_oa'] = true;                   // boolean filter

// Negation
filters['type'] = '!article';             // not an article
```

### Date Filtering

```typescript
// Publication date filtering
const filters: WorksFilters = {
  'from_publication_date': '2020-01-01',
  'to_publication_date': '2023-12-31',
  'publication_year': 2023
};
```

### Text Search

```typescript
// Different search types
const filters: WorksFilters = {
  'default.search': 'machine learning',           // Full-text search
  'title.search': 'neural networks',             // Title search only
  'display_name.search': 'deep learning'         // Display name search
};
```

## Contributing

This client is designed to be:
- **Maintainable**: Clear separation of concerns
- **Extensible**: Easy to add new endpoints
- **Testable**: Comprehensive test coverage
- **Type-safe**: Full TypeScript integration

## API Reference

For complete API reference, see the [OpenAlex Documentation](https://docs.openalex.org/).

## License

This client is designed for use with the OpenAlex API, which provides free access to scholarly data under a CC0 license.