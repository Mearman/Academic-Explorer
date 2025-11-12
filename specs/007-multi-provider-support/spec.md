# Feature Specification: Multi-Provider Scholarly Data Support

**Feature Branch**: `007-multi-provider-support`
**Created**: 2025-11-12
**Status**: Draft
**Input**: User description: "add support for the other scholarly data providers listed in ./docs/academic-apis/ . beware that not all of these are appropriate to be included"

## User Scenarios & Testing

### User Story 1 - Cross-Validate Research Data from Multiple Sources (Priority: P1)

Researchers need to verify and enrich academic data by cross-referencing multiple scholarly databases. Currently, Academic Explorer only queries OpenAlex, limiting data completeness and verification options.

**Why this priority**: Core value proposition - enables data validation and fills gaps in OpenAlex coverage. Essential for research credibility and data completeness.

**Independent Test**: Can be fully tested by querying a DOI/paper through multiple providers and comparing results. Delivers immediate value by showing data differences and gaps.

**Acceptance Scenarios**:

1. **Given** a user views a work with a DOI, **When** they request cross-provider data, **Then** they see metadata from OpenAlex, Crossref, and Semantic Scholar side-by-side
2. **Given** a work exists in Semantic Scholar but not in OpenAlex, **When** a user searches by paper title, **Then** results include papers from both providers
3. **Given** citation count discrepancies between providers, **When** viewing work details, **Then** the user sees citation counts from each provider with last-updated timestamps

---

### User Story 2 - Access Domain-Specific Collections (Priority: P2)

Researchers in physics, mathematics, and computer science need direct access to arXiv preprints, which may not be fully indexed in OpenAlex or may have version updates not yet reflected.

**Why this priority**: Serves specific research domains with high-value specialized content. Preprint access is crucial for fast-moving fields.

**Independent Test**: Can be tested by searching for recent arXiv papers and accessing preprint versions. Delivers value by providing earlier access to research findings.

**Acceptance Scenarios**:

1. **Given** a user searches for recent AI papers, **When** filtering by preprints, **Then** results include arXiv papers with links to PDF and LaTeX source
2. **Given** an arXiv paper has multiple versions, **When** viewing paper details, **Then** the user sees version history with dates and can access any version
3. **Given** a paper exists as both preprint and published version, **When** viewing work details, **Then** both versions are linked with clear status labels

---

### User Story 3 - Unified Search Across Providers (Priority: P3)

Researchers want a single search interface that queries multiple providers simultaneously and merges results intelligently.

**Why this priority**: Enhanced user experience feature that builds on P1-P2 capabilities. Increases discoverability but requires complex deduplication logic.

**Independent Test**: Can be tested by performing a search query and verifying results from multiple providers appear in unified list. Delivers value by reducing search time.

**Acceptance Scenarios**:

1. **Given** a user enters a search query, **When** multi-provider search is enabled, **Then** results appear from all configured providers with source badges
2. **Given** the same paper appears in multiple providers, **When** viewing search results, **Then** duplicates are merged with links to view data from each source
3. **Given** different providers return results at different speeds, **When** searching, **Then** results stream in progressively with loading indicators per provider

---

### Edge Cases

- What happens when a provider API is unavailable or returns errors?
- How does the system handle rate limit exhaustion from multiple simultaneous provider queries?
- What happens when provider response formats change or return unexpected data structures?
- How are conflicts resolved when providers return contradictory metadata (e.g., different publication years)?
- What happens when a paper identifier (DOI, arXiv ID) exists in one provider but not others?
- How does caching work when the same entity is retrieved from multiple providers?
- What happens when a provider requires authentication but credentials are missing or expired?

## Requirements

### Functional Requirements

#### Core Integration (P1 - MVP)

- **FR-001**: System MUST support querying Crossref API for DOI resolution and citation metadata
- **FR-002**: System MUST support querying Semantic Scholar API for paper search and citation analysis
- **FR-003**: System MUST support querying arXiv API for preprint paper discovery
- **FR-004**: System MUST respect each provider's rate limits (Crossref: 50/sec, Semantic Scholar: 100/sec, arXiv: respectful delays)
- **FR-005**: System MUST include provider source attribution for all retrieved data
- **FR-006**: System MUST handle provider-specific error responses and retry logic
- **FR-007**: System MUST cache responses from each provider separately using existing multi-tier caching strategy

#### Data Integration (P1 - MVP)

- **FR-008**: System MUST map provider-specific entity formats to unified internal data model
- **FR-009**: System MUST preserve provider-specific identifiers (DOI, Semantic Scholar ID, arXiv ID, OpenAlex ID)
- **FR-010**: System MUST track data source and timestamp for each piece of metadata
- **FR-011**: System MUST allow querying by provider-specific identifiers across all providers
- **FR-012**: System MUST normalize author names and affiliations across providers for comparison

#### User Interface (P2 - Enhanced)

- **FR-013**: Users MUST be able to select which providers to include in searches
- **FR-014**: Users MUST see clear provider badges/labels on search results and entity details
- **FR-015**: Users MUST be able to view side-by-side comparisons of metadata from different providers
- **FR-016**: System MUST display citation counts from each provider with source attribution
- **FR-017**: Users MUST be able to toggle between provider views for the same entity

#### Provider Selection Criteria

**Included Providers** (free, no authentication, aligned with research mission):
- **Crossref**: DOI resolution, essential for bibliographic integrity
- **Semantic Scholar**: Citation analysis, paper recommendations, free API
- **arXiv**: Preprint access for physics/math/CS, free and unrestricted

**Excluded Providers** (rationale):
- **Web of Science, Scopus, Dimensions**: Require institutional subscriptions ($5k-$50k+/year)
- **ScienceDirect, Springer Nature, Wiley, Taylor & Francis**: Limited access, publisher-specific content
- **Mendeley**: Reference management focus, not primary research discovery
- **PubMed**: Domain-specific (biomedical), requires API key, potential future addition
- **DBLP**: Computer science bibliography, narrower scope than Semantic Scholar
- **Unpaywall, CORE, DOAJ, HAL**: Open access aggregators, potential future additions for OA discovery
- **DataCite, ORCID**: Metadata/identity services, not primary research content
- **Altmetric, PlumX**: Impact metrics, premium pricing models

### Key Entities

- **Provider**: Represents a scholarly data source (OpenAlex, Crossref, Semantic Scholar, arXiv); includes API configuration, rate limits, capabilities
- **ProviderEntity**: Unified entity representation that aggregates data from multiple providers; tracks source and timestamp per field
- **ProviderMapping**: Maps provider-specific field names and formats to internal schema
- **ProviderIdentifier**: Cross-reference between provider-specific IDs (DOI, S2ID, arXiv ID, OpenAlex ID)
- **ProviderCache**: Provider-specific cache entries within existing caching infrastructure

## Success Criteria

### Measurable Outcomes

- **SC-001**: Users can query any of the three new providers (Crossref, Semantic Scholar, arXiv) with response times under 2 seconds per provider
- **SC-002**: System successfully deduplicates and merges results when the same paper appears in multiple providers with 95%+ accuracy
- **SC-003**: Citation count discrepancies between providers are visible to users with clear source attribution
- **SC-004**: Provider-specific rate limits are respected with zero rate limit violations during normal operation
- **SC-005**: Search results include papers from all enabled providers within 5 seconds total (parallel queries)
- **SC-006**: Users can access arXiv preprint PDFs with one click from search results or work detail pages
- **SC-007**: System handles provider API failures gracefully, showing partial results from available providers while indicating which failed

## Constitution Alignment

- **Type Safety**: Provider clients and entity mappings will use strict TypeScript types with Zod validation; no `any` types; provider-specific response types validated at runtime
- **Test-First**: Each provider client will have unit tests for API requests, response parsing, error handling, and rate limiting; integration tests for cross-provider queries
- **Monorepo Architecture**: Provider clients implemented as modules within `packages/client/src/providers/`; shared abstractions in `packages/client/src/providers/base`; UI components in `packages/ui/src/providers/`
- **Storage Abstraction**: Provider-specific cached data uses existing storage provider interface; no direct IndexedDB/localStorage calls
- **Performance & Memory**: Each provider client implements connection pooling and request queuing; responses cached at field level to minimize redundant API calls; parallel provider queries with Promise.all for P3 unified search
- **Atomic Conventional Commits**: Implementation will follow atomic commits per provider (e.g., `feat(client): add Crossref provider client`, `feat(client): add Semantic Scholar provider client`)

## Assumptions

1. **Provider API Stability**: Assumes Crossref, Semantic Scholar, and arXiv APIs remain stable and free during implementation and deployment
2. **OpenAlex Primary**: OpenAlex remains the primary provider; other providers supplement and validate OpenAlex data
3. **Entity Model Compatibility**: Current entity types (Work, Author, Institution, etc.) can accommodate metadata from new providers without schema breaking changes
4. **Rate Limit Compliance**: Academic Explorer's usage patterns fit within free tier rate limits for all providers (development/individual researcher scale)
5. **Identifier Availability**: Most works will have at least one cross-provider identifier (DOI, arXiv ID) for linking
6. **Caching Effectiveness**: Existing multi-tier caching strategy (Memory → localStorage → IndexedDB → Static JSON → API) applies to new providers
7. **User Preference**: Users want more data sources and are willing to see provider-specific differences (not expecting perfect normalization)
