# Feature Specification: Complete OpenAlex Relationship Support

**Feature Branch**: `020-complete-openalex-relationships`
**Created**: 2025-11-21
**Status**: Draft
**Input**: User description: "add support for all of them"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Visualize Work Funding Sources (Priority: P1)

As a researcher exploring academic literature, I want to see which funding organizations supported a research work so that I can understand research funding patterns and identify potential funding sources for my own work.

**Why this priority**: Funding relationships are critical for research transparency and help researchers identify grant opportunities. This is the most commonly requested relationship type for academic research.

**Independent Test**: Can be fully tested by loading a work with grants data into the graph visualization and verifying that funding organization nodes appear with labeled connections, delivering immediate value for understanding research funding.

**Acceptance Scenarios**:

1. **Given** a work with funding grants in the graph, **When** the relationship detection runs, **Then** edges to funder entities are created with FUNDED_BY relationship type
2. **Given** a work and its funder both loaded in the graph, **When** viewing the graph, **Then** a visible connection shows the funding relationship between work and funder
3. **Given** a work with multiple funders, **When** the graph loads, **Then** all funding relationships are detected and visualized correctly

---

### User Story 2 - Discover Research Keywords (Priority: P1)

As an academic researcher, I want to see the keywords associated with research works so that I can quickly identify research topics and find related works through keyword connections.

**Why this priority**: Keywords provide immediate topical understanding and are essential for research discovery. They complement topics by providing more granular subject classification.

**Independent Test**: Can be fully tested by loading a work with keywords into the graph and verifying keyword nodes appear with connections, delivering value for topic-based navigation.

**Acceptance Scenarios**:

1. **Given** a work with keywords in the graph, **When** relationship detection runs, **Then** edges to keyword entities are created
2. **Given** multiple works sharing keywords, **When** all are loaded in the graph, **Then** keyword nodes show connections to all related works
3. **Given** a keyword entity page, **When** viewing relationships, **Then** all works using that keyword are listed

---

### User Story 3 - Explore Researcher Expertise Areas (Priority: P2)

As a research collaborator, I want to see which topics an author specializes in so that I can identify experts in specific research areas and potential collaboration partners.

**Why this priority**: Author-topic relationships enable expertise discovery and collaboration matching, which is valuable for research networking but less critical than work-level relationships.

**Independent Test**: Can be fully tested by loading an author with topic expertise data and verifying topic nodes appear with strength indicators (count/score), delivering value for expertise visualization.

**Acceptance Scenarios**:

1. **Given** an author with topic expertise, **When** relationship detection runs, **Then** edges to topic entities are created with strength metadata
2. **Given** an author specializing in multiple topics, **When** viewing their graph, **Then** all topic relationships show with relative importance indicators
3. **Given** a topic entity, **When** viewing related authors, **Then** authors are ordered by expertise level (topic count/score)

---

### User Story 4 - Analyze Journal Coverage Areas (Priority: P2)

As a researcher selecting publication venues, I want to see which topics a journal or conference covers so that I can determine if my research is a good fit for that venue.

**Why this priority**: Source-topic relationships help with publication venue selection, which is important for researchers but less time-critical than work-level discovery.

**Independent Test**: Can be fully tested by loading a source (journal) with topic data and verifying topic nodes appear with coverage indicators, delivering value for venue assessment.

**Acceptance Scenarios**:

1. **Given** a source with topic coverage data, **When** relationship detection runs, **Then** edges to topic entities are created
2. **Given** multiple sources covering similar topics, **When** comparing them in the graph, **Then** topic overlap is visually apparent
3. **Given** a topic entity, **When** viewing publishing venues, **Then** sources are listed with relevance scores

---

### User Story 5 - Understand Institutional Research Focus (Priority: P2)

As a prospective graduate student, I want to see which research topics an institution focuses on so that I can identify universities aligned with my research interests.

**Why this priority**: Institution-topic relationships support academic decision-making but are less frequently used than work or author relationships.

**Independent Test**: Can be fully tested by loading an institution with topic data and verifying topic nodes appear with institutional strength indicators, delivering value for institutional research assessment.

**Acceptance Scenarios**:

1. **Given** an institution with research topic data, **When** relationship detection runs, **Then** edges to topic entities are created with volume indicators
2. **Given** multiple institutions, **When** comparing their graphs, **Then** research focus differences are visible through topic relationships
3. **Given** a topic entity, **When** viewing institutions, **Then** institutions are ranked by research output in that topic

---

### User Story 6 - Access Legacy Concept Classifications (Priority: P3)

As a researcher using historical OpenAlex data, I want to see concept classifications on older works so that I can maintain continuity with previous research categorizations.

**Why this priority**: Concepts are deprecated in favor of topics, but some works still only have concept data. Supporting this ensures backward compatibility but is lower priority.

**Independent Test**: Can be fully tested by loading a work with legacy concept data and verifying concept nodes appear, delivering value for historical data access.

**Acceptance Scenarios**:

1. **Given** a work with concept classifications (legacy), **When** relationship detection runs, **Then** edges to concept entities are created
2. **Given** a work with both topics and concepts, **When** viewing the graph, **Then** both relationship types are visible and distinguishable
3. **Given** concept entities in the graph, **When** filtering by relationship type, **Then** concepts can be shown/hidden independently

---

### User Story 7 - Discover Institutional Repositories (Priority: P3)

As a librarian or institutional researcher, I want to see which repository systems an institution hosts so that I can understand the scholarly infrastructure landscape.

**Why this priority**: Repository relationships are specialized use cases for institutional analysis, valuable but serving a niche audience.

**Independent Test**: Can be fully tested by loading an institution with repository data and verifying source (repository) nodes appear with host relationships, delivering value for infrastructure mapping.

**Acceptance Scenarios**:

1. **Given** an institution hosting repositories, **When** relationship detection runs, **Then** edges to repository source entities are created
2. **Given** an institution with multiple repositories, **When** viewing the graph, **Then** all repository relationships are displayed
3. **Given** a repository source, **When** viewing relationships, **Then** the host institution is shown

---

### User Story 8 - Explore Multi-Role Organizations (Priority: P3)

As a research administrator, I want to see when an institution acts in multiple roles (funder, publisher, institution) so that I can understand organizational complexity in the research ecosystem.

**Why this priority**: Role relationships reveal organizational complexity but require cross-entity connections, making them the most complex and least commonly needed.

**Independent Test**: Can be fully tested by loading an institution with role data and verifying cross-entity connections (e.g., institution→funder entity, institution→publisher entity) appear, delivering value for organizational analysis.

**Acceptance Scenarios**:

1. **Given** an institution with multiple roles, **When** viewing its entity page, **Then** all role-based identities are listed (funder ID, publisher ID, institution ID)
2. **Given** an institution acting as a funder, **When** its funder entity is loaded in the graph, **Then** a connection between institution and funder entities is visible
3. **Given** funder and publisher entities, **When** viewing their relationships, **Then** role metadata indicates which institutions they represent

---

### Edge Cases

- What happens when a work has empty grants array vs. missing grants field?
- How does the system handle works with 50+ keywords without overwhelming the visualization?
- What happens when an author's topic data includes topics not yet loaded in the graph?
- How does the system distinguish between deprecated concepts and current topics when both exist?
- What happens when repository data references sources that don't exist in OpenAlex?
- How does the system handle role data that references entities across different types (institution→funder→publisher chain)?
- What happens when relationship data is incomplete or malformed in the API response?

## Requirements *(mandatory)*

### Functional Requirements

#### Work Relationships

- **FR-001**: System MUST detect funding relationships from work.grants[] array
- **FR-002**: System MUST extract funder ID and display name from grant objects
- **FR-003**: System MUST create FUNDED_BY edges from works to funder entities when both exist in graph
- **FR-004**: System MUST detect keyword relationships from work.keywords[] array
- **FR-005**: System MUST extract keyword ID and display name from keyword objects
- **FR-006**: System MUST create edges from works to keyword entities when both exist in graph
- **FR-007**: System MUST detect legacy concept relationships from work.concepts[] array
- **FR-008**: System MUST distinguish between topics (current) and concepts (deprecated) in visualization

#### Author/Source/Institution → Topic Relationships

- **FR-009**: System MUST detect topic expertise from author.topics[] array (includes count and score fields)
- **FR-010**: System MUST detect topic coverage from source.topics[] array
- **FR-011**: System MUST detect research focus from institution.topics[] array
- **FR-012**: System MUST preserve topic metadata (count, score) when creating edges
- **FR-013**: System MUST handle nested topic structure (includes subfield, field, domain objects)

#### Institution Relationships

- **FR-014**: System MUST detect repository relationships from institution.repositories[] array
- **FR-015**: System MUST extract repository source ID and host organization data
- **FR-016**: System MUST create edges from institutions to repository source entities
- **FR-017**: System MUST detect role relationships from institution.roles[] array
- **FR-018**: System MUST handle cross-entity role connections (institution→funder, institution→publisher)

#### Data Fetching

- **FR-019**: System MUST add "grants" to ADVANCED_FIELD_SELECTIONS.works.minimal
- **FR-020**: System MUST add "keywords" to ADVANCED_FIELD_SELECTIONS.works.minimal
- **FR-021**: System MUST add "concepts" to ADVANCED_FIELD_SELECTIONS.works.minimal
- **FR-022**: System MUST add "topics" to ADVANCED_FIELD_SELECTIONS for authors, sources, and institutions
- **FR-023**: System MUST add "repositories" and "roles" to ADVANCED_FIELD_SELECTIONS.institutions.minimal
- **FR-024**: System MUST extract all relationship fields in fetchMinimalEntityData for each entity type

#### Relationship Detection

- **FR-025**: System MUST implement analyzeGrantRelationshipsForWork helper method
- **FR-026**: System MUST implement analyzeKeywordRelationshipsForWork helper method
- **FR-027**: System MUST implement analyzeConceptRelationshipsForWork helper method
- **FR-028**: System MUST implement analyzeTopicRelationshipsForEntity helper method (reusable for authors/sources/institutions)
- **FR-029**: System MUST implement analyzeRepositoryRelationshipsForInstitution helper method
- **FR-030**: System MUST implement analyzeRoleRelationshipsForEntity helper method (institutions/funders/publishers)

#### MinimalEntityData Interface

- **FR-031**: System MUST add grants field to MinimalEntityData for works
- **FR-032**: System MUST add keywords field to MinimalEntityData for works
- **FR-033**: System MUST add concepts field to MinimalEntityData for works
- **FR-034**: System MUST add topics field to MinimalEntityData (with count/score metadata)
- **FR-035**: System MUST add repositories field to MinimalEntityData for institutions
- **FR-036**: System MUST add roles field to MinimalEntityData (for cross-entity connections)

### Key Entities

- **Grant**: Represents a funding relationship - includes funder ID, funder display name, and optional award ID
- **Keyword**: Topical tag with ID, display name, and relevance score
- **Concept**: Legacy classification entity with ID, display name, level, and score (deprecated but still in data)
- **Topic (with metadata)**: Extended topic structure including count (publication volume) and score (relevance strength) in addition to basic ID/name
- **Repository**: Source entity representing institutional repository systems - includes host organization linkage
- **Role**: Cross-entity identity mapping showing when entities have multiple roles (e.g., institution also acts as funder/publisher)

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Users can visualize funding relationships for any work with grants data within 2 seconds of loading
- **SC-002**: Researchers can identify all keywords associated with a work through graph connections
- **SC-003**: Users can discover author expertise areas ranked by topic strength (count/score indicators visible)
- **SC-004**: Journal selection researchers can compare topic coverage across multiple sources in a single graph view
- **SC-005**: Institution comparison shows research focus differences through topic relationship patterns
- **SC-006**: Historical works display legacy concept classifications alongside modern topic classifications when both exist
- **SC-007**: Librarians can map institutional repository infrastructure through institution→repository connections
- **SC-008**: Research administrators can identify multi-role organizations through cross-entity role connections
- **SC-009**: Graph performance remains under 5 seconds for entities with 25+ relationships of new types
- **SC-010**: Relationship detection accuracy reaches 100% for all API-provided relationship data (no false negatives)

## Constitution Alignment

- **Type Safety**: Implementation will avoid `any` types; use typed interfaces for all relationship data structures (grants, keywords, concepts with proper fields)
- **Test-First**: Each relationship type will have component tests before implementation; acceptance scenarios map directly to test cases
- **Monorepo Architecture**: Changes isolated to apps/web (relationship-detection-service.ts) and packages/client (advanced-field-selection.ts); no cross-package re-exports
- **Storage Abstraction**: Relationship detection uses in-memory graph data structures; no new storage operations required
- **Performance & Memory**: Success criteria include 5-second performance target for 25+ relationships; serial test execution prevents OOM
- **Atomic Conventional Commits**: Each relationship type group (work→funders, work→keywords, entity→topics, etc.) committed separately with feat() prefix
- **Development-Stage Pragmatism**: Breaking changes acceptable for relationship data structures if needed; no backward compatibility required
- **Test-First Bug Fixes**: Any relationship detection bugs will have regression tests written before fixes
- **Deployment Readiness**: Implementation must maintain passing typecheck and build; all 8 user stories independently deployable
- **Continuous Execution**: Specification ready for /speckit.plan → /speckit.tasks → /speckit.implement flow without interruption
