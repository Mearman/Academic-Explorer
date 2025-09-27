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