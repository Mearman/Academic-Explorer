# @academic-explorer/client

TypeScript client for the OpenAlex API with entity support and utilities.

## Main Exports

- **OpenAlexBaseClient** - Base client class
- **Entity APIs** - WorksApi, AuthorsApi, SourcesApi, InstitutionsApi, TopicsApi, PublishersApi, FundersApi
- **CachedOpenAlexClient** - Client with caching capabilities
- **Type Guards** - isWork, isAuthor, isInstitution, etc.
- **Query Builder** - QueryBuilder, createWorksQuery, buildFilterString, etc.
- **Types** - TypeScript types for all OpenAlex entities

## Usage

```typescript
import { cachedOpenAlex, createWorksQuery } from '@academic-explorer/client';

const works = await cachedOpenAlex.works(createWorksQuery({
  filter: { author: 'A123456789' },
  select: ['id', 'title', 'publication_year']
}));
```

## Wikidata ID Support

Topics and Concepts APIs support Wikidata IDs in multiple formats:

```typescript
import { TopicsApi, ConceptsApi } from '@academic-explorer/client';

const topicsApi = new TopicsApi(client);
const conceptsApi = new ConceptsApi(client);

// Topics with Wikidata IDs
const topic1 = await topicsApi.get('Q123456');                              // Simple Q ID
const topic2 = await topicsApi.get('wikidata:Q123456');                     // Prefixed format
const topic3 = await topicsApi.get('https://www.wikidata.org/wiki/Q123456'); // Wiki URL
const topic4 = await topicsApi.get('https://www.wikidata.org/entity/Q123456'); // Entity URL

// Concepts with Wikidata IDs (deprecated but supported)
const concept1 = await conceptsApi.getConcept('Q11190');                    // Medicine concept
const concept2 = await conceptsApi.getConcept('wikidata:Q11190');
const concept3 = await conceptsApi.getConcept('https://www.wikidata.org/wiki/Q11190');

// With additional parameters
const detailedTopic = await topicsApi.get('Q123456', {
  select: ['id', 'display_name', 'keywords', 'works_count']
});
```

### Supported Wikidata Formats

- **Q123456** - Simple Q notation (recommended)
- **wikidata:Q123456** - OpenAlex API format (used internally)
- **https://www.wikidata.org/wiki/Q123456** - Wikidata wiki URL
- **https://www.wikidata.org/entity/Q123456** - Wikidata entity URL

All formats are automatically normalized to the OpenAlex API format (`wikidata:Q123456`) before making requests.

## Autocomplete API

The client provides fast autocomplete functionality for typeahead/search suggestions. The autocomplete API uses debouncing and caching to minimize API calls.

### General Autocomplete (Recommended)

Use `autocompleteGeneral()` for the fastest results across all entity types (single API call):

```typescript
import { AutocompleteApi, OpenAlexBaseClient } from '@academic-explorer/client';

const client = new OpenAlexBaseClient();
const autocomplete = new AutocompleteApi(client);

// General autocomplete - searches all entity types (single API call to /autocomplete)
const results = await autocomplete.autocompleteGeneral('hello world');

// With options
const limitedResults = await autocomplete.autocompleteGeneral('machine learning', {
  per_page: 10
});

// Results include mixed entity types (works, authors, sources, institutions, topics)
console.log(results[0]);
// {
//   id: "https://openalex.org/W123456789",
//   display_name: "Machine Learning Basics",
//   entity_type: "work",
//   cited_by_count: 1500,
//   works_count: null,
//   hint: "John Smith, Jane Doe"
// }
```

### Entity-Specific Autocomplete

Search specific entity types when you know what you're looking for:

```typescript
// Search specific entity types
const works = await autocomplete.autocompleteWorks('neural networks');
const authors = await autocomplete.autocompleteAuthors('john smith');
const sources = await autocomplete.autocompleteSources('nature');
const institutions = await autocomplete.autocompleteInstitutions('MIT');
const topics = await autocomplete.autocompleteTopics('artificial intelligence');

// Alternative syntax
const authors2 = await autocomplete.autocomplete('einstein', 'authors');
```

### Cross-Entity Search

Search multiple entity types simultaneously (makes separate API calls for each type):

```typescript
// Search all entity types (makes 5 API calls)
const allResults = await autocomplete.search('quantum computing');

// Search specific entity types only
const academicResults = await autocomplete.search('climate change', ['works', 'authors']);
```

### Features

- ✅ **Debouncing** - Prevents excessive API calls (300ms delay)
- ✅ **Caching** - Results cached for 30 seconds
- ✅ **Sorting** - Results sorted by relevance (`cited_by_count`, then `works_count`)
- ✅ **Type Safety** - Full TypeScript support with autocomplete
- ✅ **Error Handling** - Graceful fallbacks on API errors

### Performance Comparison

| Method | API Calls | Speed | Use Case |
|--------|-----------|-------|----------|
| `autocompleteGeneral()` | 1 | Fastest (~200ms) | General search, typeahead UI |
| `autocomplete(query, type)` | 1 | Fast | When entity type is known |
| `search(query)` | 5 | Slower | When you need all entity types separately |

**Recommendation:** Use `autocompleteGeneral()` for search bars and typeahead components for the best performance.
