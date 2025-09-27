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