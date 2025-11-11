# Data Model: Test Environment MSW Setup

**Feature**: 005-test-environment-msw
**Date**: 2025-11-11

## Overview

This feature does NOT introduce new data models. It integrates existing MSW mock factories into Playwright test lifecycle. All entity types already exist in `apps/web/src/test/msw/handlers.ts`.

## Existing Entity Models

### 1. Work (OpenAlex Scholarly Document)

**Source**: `createMockWork(id: string)` in `apps/web/src/test/msw/handlers.ts`

**Core Fields**:
```typescript
interface Work {
  id: string;                    // https://openalex.org/W123
  doi: string | undefined;       // https://doi.org/10.1000/w123
  title: string;                 // Human-readable title
  display_name: string;          // Display title
  publication_year: number;      // 2023
  publication_date: string;      // "2023-01-01"
  type: string;                  // "article", "book", etc.
  cited_by_count: number;        // 10
  authorships: Authorship[];     // Author + institution relationships
  open_access: {
    is_oa: boolean;
    oa_url: string | undefined;
    any_repository_has_fulltext: boolean;
  };
  primary_location: Location | undefined;
  locations: Location[];
  best_oa_location: Location | undefined;
  // ... 50+ additional fields for full OpenAlex schema
}
```

**Metadata Fields** (used by catalogue feature):
```typescript
interface WorkMetadata {
  type: 'work';
  displayName: string;
  publicationYear?: number;
  citedByCount: number;
  primaryLocation?: {
    source?: { displayName: string };
  };
  authorships?: Array<{
    author: { displayName: string };
    institutions: Array<{ displayName: string }>;
  }>;
  openAccess?: {
    isOa: boolean;
    oaStatus: string;
  };
}
```

**Validation**:
- `id` must start with `https://openalex.org/W`
- `cited_by_count` must be non-negative integer
- `publication_year` must be 4-digit year or undefined
- `authorships` can be empty array but must exist

**Relationships**:
- Work → Author (via `authorships[].author`)
- Work → Institution (via `authorships[].institutions`)
- Work → Source (via `primary_location.source`)

---

### 2. Author (OpenAlex Researcher)

**Source**: `createMockAuthor(id: string)` in `apps/web/src/test/msw/handlers.ts`

**Core Fields**:
```typescript
interface Author {
  id: string;                    // https://openalex.org/A123
  orcid: string | undefined;     // https://orcid.org/0000-0001-2345-6789
  display_name: string;          // "John Doe"
  display_name_alternatives: string[];
  works_count: number;           // 50
  cited_by_count: number;        // 500
  last_known_institutions: Institution[];
  summary_stats: {
    "2yr_mean_citedness": number;
    h_index: number;
    i10_index: number;
  };
}
```

**Metadata Fields** (used by catalogue feature):
```typescript
interface AuthorMetadata {
  type: 'author';
  displayName: string;
  worksCount: number;
  citedByCount: number;
  hIndex?: number;
  lastKnownInstitution?: {
    displayName: string;
  };
}
```

**Validation**:
- `id` must start with `https://openalex.org/A`
- `works_count` must be non-negative integer
- `cited_by_count` must be non-negative integer
- `h_index` must be non-negative integer or undefined

---

### 3. Institution (OpenAlex Organization)

**Source**: `createMockInstitution(id: string)` in `apps/web/src/test/msw/handlers.ts`

**Core Fields**:
```typescript
interface Institution {
  id: string;                    // https://openalex.org/I123
  ror: string | undefined;       // https://ror.org/012345678
  display_name: string;          // "University of Example"
  country_code: string;          // "US", "GB", etc.
  type: string;                  // "education", "healthcare", etc.
  lineage: string[];             // Parent institution IDs
}
```

**Metadata Fields** (used by catalogue feature):
```typescript
interface InstitutionMetadata {
  type: 'institution';
  displayName: string;
  worksCount: number;
  citedByCount: number;
  countryCode?: string;
  institutionType?: string;
}
```

**Validation**:
- `id` must start with `https://openalex.org/I`
- `country_code` must be 2-letter ISO code
- `type` must be one of: Education, Healthcare, Company, Archive, Nonprofit, Government, Facility, Other

---

### 4. Authorship (Work-Author Relationship)

**Source**: Part of Work entity in `createMockWork()`

**Core Fields**:
```typescript
interface Authorship {
  author_position: "first" | "middle" | "last";
  author: {
    id: string;
    display_name: string;
    orcid: string | undefined;
  };
  institutions: Institution[];
  countries: string[];
  is_corresponding: boolean;
  raw_author_name: string;
  raw_affiliation_strings: string[];
}
```

**Purpose**: Links Work to Authors and their Institutions

**Validation**:
- `author.id` must match Author entity ID format
- `institutions` can be empty array
- `countries` must be 2-letter ISO codes

---

### 5. Source (OpenAlex Publication Venue)

**Source**: Embedded in Work entity (no standalone factory yet)

**Core Fields**:
```typescript
interface Source {
  id: string;                    // https://openalex.org/S123
  display_name: string;          // "Nature"
  issn_l: string | undefined;    // "1234-5678"
  issn: string[];                // ["1234-5678", "5678-1234"]
  is_oa: boolean;
  is_in_doaj: boolean;
  type: string;                  // "journal", "repository", etc.
}
```

**Metadata Fields** (used by catalogue feature):
```typescript
interface SourceMetadata {
  type: 'source';
  displayName: string;
  worksCount: number;
  citedByCount: number;
  issn?: string[];
  isOa?: boolean;
}
```

**Note**: Source entities are embedded in Work.locations and Work.primary_location. No standalone `/sources/:id` endpoint handler exists yet (may add if needed).

---

## Static Fixtures (Optional Extension)

**Purpose**: For tests requiring specific entity data (e.g., bioplastics work for catalogue import tests)

**Structure**:
```
apps/web/test/fixtures/
├── works/
│   └── work-bioplastics.json     # Specific work for catalogue import tests
├── authors/
│   └── author-sample.json        # (if needed)
└── institutions/
    └── institution-sample.json   # (if needed)
```

**Schema**: Must match OpenAlex API response format (same as mock factory output)

**Loader Interface** (to be implemented if static fixtures added):
```typescript
interface FixtureLoader {
  loadWork(id: string): Work | null;
  loadAuthor(id: string): Author | null;
  loadInstitution(id: string): Institution | null;
  hasFixture(type: EntityType, id: string): boolean;
}
```

**Handler Integration**:
```typescript
http.get(`${API_BASE}/works/:id`, ({ params }) => {
  const { id } = params;

  // Check for static fixture first
  const fixture = fixtureLoader.loadWork(id);
  if (fixture) {
    return HttpResponse.json(fixture);
  }

  // Fallback to factory
  return HttpResponse.json(createMockWork(id));
});
```

---

## Entity Type Enum

**Source**: `apps/web/src/types/catalogue.ts`

```typescript
export type EntityType =
  | 'work'
  | 'author'
  | 'institution'
  | 'source'
  | 'topic'
  | 'funder'
  | 'publisher'
  | 'concept';
```

**Scope for This Feature**:
- **Implemented**: work, author, institution
- **Partially Implemented**: source (embedded in works, no standalone endpoint)
- **Not Implemented**: topic, funder, publisher, concept (not needed for fixing 27 failing tests)

---

## Data Flow

```
1. Playwright test makes HTTP request
   ↓
2. MSW intercepts request (setupServer listening)
   ↓
3. Handler matches URL pattern (e.g., /works/:id)
   ↓
4. Handler checks for static fixture (optional)
   ↓
5. Handler falls back to factory (createMockWork)
   ↓
6. Handler returns HttpResponse with mock data
   ↓
7. Test receives response (indistinguishable from real API)
```

---

## Schema Compliance

All mock entities MUST comply with:
1. **OpenAlex API Schema**: Match official docs at docs.openalex.org
2. **TypeScript Types**: Match `@academic-explorer/types` package (if defined)
3. **Catalogue Metadata**: Match interfaces in `apps/web/src/types/catalogue.ts`

**Validation Strategy**:
- TypeScript compiler validates structure at build time
- Tests validate behavior at runtime
- Manual comparison with live OpenAlex responses for critical fields

---

## Summary

- **No new data models introduced** - reusing existing mock factories
- **4 entity types** fully implemented: Work, Author, Institution, Authorship
- **1 entity type** partially implemented: Source (embedded, no standalone)
- **Static fixtures** optional, only if specific test data needed
- **Schema compliance** enforced via TypeScript types and OpenAlex documentation

**Next**: Phase 1 - Create contracts/
