# Feature Specification: OpenAlex Relationship Implementation

**Feature Branch**: `015-openalex-relationships`
**Created**: 2025-11-18
**Status**: Completed
**Completed**: 2025-11-18
**Input**: User description: "correctly implement handling of ALL relationships"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - View Authorship Relationships Correctly (Priority: P1)

As a researcher exploring academic networks, I want to see which authors wrote which works so that I can understand collaboration patterns and track research contributions accurately.

**Why this priority**: CRITICAL - Authorship is the most fundamental relationship in academic graphs. Currently reversed direction causes incorrect network topology, breaking all author-work queries and collaboration analysis.

**Independent Test**: Can be fully tested by expanding a work node and verifying that edges point FROM work TO authors (Work → Author), and by expanding an author node to verify consistent edge directions.

**Acceptance Scenarios**:

1. **Given** a work W123 with three authors (A1, A2, A3), **When** I expand the work node, **Then** I see three edges with source=W123 and targets A1, A2, A3
2. **Given** an author A456 who wrote five works, **When** I expand the author node, **Then** I see five edges discovered via reverse lookup (not duplicate edges in wrong direction)
3. **Given** I expand both work W123 and author A456 in the same graph, **When** both expansions complete, **Then** there are no duplicate authorship edges with conflicting directions

---

### User Story 2 - Explore Citation Networks (Priority: P1)

As a researcher analyzing research impact, I want to see which works cite which other works so that I can trace knowledge flow, identify influential papers, and understand citation patterns.

**Why this priority**: CRITICAL - Citation analysis is fundamental to bibliometrics and research impact assessment. Currently completely missing from the application.

**Independent Test**: Can be fully tested by expanding a highly-cited work and verifying that edges point FROM citing work TO cited work, showing the complete citation network.

**Acceptance Scenarios**:

1. **Given** a work W789 that cites 15 other works, **When** I expand the work node, **Then** I see 15 citation edges with source=W789 pointing to each cited work
2. **Given** a seminal paper W111 cited by 500 works, **When** I query for works citing W111, **Then** I can discover all 500 citing works via reverse lookup
3. **Given** works W1, W2, W3 forming a citation chain (W1→W2→W3), **When** I expand all three, **Then** I see the complete citation path visualized correctly

---

### User Story 3 - Discover Funding Relationships (Priority: P2)

As a funding analyst, I want to see which funders supported which research works so that I can analyze funding patterns, track grant impact, and identify research portfolios.

**Why this priority**: HIGH - Critical for funding analysis, grant tracking, and understanding research sponsorship patterns. Currently completely missing.

**Independent Test**: Can be fully tested by expanding a funded work and verifying edges point FROM work TO funders, showing all funding sources for the research.

**Acceptance Scenarios**:

1. **Given** a work W234 funded by three agencies (F1, F2, F3), **When** I expand the work node, **Then** I see three funding edges with source=W234 and targets F1, F2, F3, including grant award IDs in metadata
2. **Given** a funder F567 that funded 200 works, **When** I expand the funder node, **Then** I can discover all 200 funded works via reverse lookup
3. **Given** a work with no funding information, **When** I expand the work node, **Then** no funding edges are created (graceful handling of missing data)

---

### User Story 4 - Navigate Topic Hierarchies (Priority: P2)

As a researcher browsing research areas, I want to see how topics relate to fields and domains so that I can navigate the taxonomy, find related research areas, and understand subject classifications.

**Why this priority**: HIGH - Essential for topic-based browsing, subject classification, and understanding research domains. Currently completely missing.

**Independent Test**: Can be fully tested by expanding a topic node and verifying edges point TO parent field, and field edges point TO parent domain, forming complete hierarchical paths.

**Acceptance Scenarios**:

1. **Given** a topic T123 in field F456 in domain D789, **When** I expand the topic node, **Then** I see edges T123→F456→D789 forming the complete taxonomy path
2. **Given** a field F999 containing 50 topics, **When** I query for topics in this field, **Then** I can discover all 50 topics via reverse lookup
3. **Given** a topic with sibling topics in the same field, **When** I expand the topic, **Then** I can optionally see related sibling topics for lateral exploration

---

### User Story 5 - Trace Institutional Hierarchies (Priority: P3)

As an institutional analyst, I want to see organizational hierarchies (department → university → university system) so that I can understand institutional structure and affiliations.

**Why this priority**: MEDIUM - Valuable for institutional analysis and organizational structure understanding, but less critical than authorship/citations.

**Independent Test**: Can be fully tested by expanding an institution node and verifying lineage edges point TO parent institutions, forming organizational hierarchy chains.

**Acceptance Scenarios**:

1. **Given** a department I123 that is part of university I456 which is part of university system I789, **When** I expand the department node, **Then** I see edges I123→I456→I789 showing complete organizational hierarchy
2. **Given** a university I999 with 20 departments, **When** I query for child institutions, **Then** I can discover all 20 departments via reverse lookup
3. **Given** an institution with no lineage information, **When** I expand the institution node, **Then** no lineage edges are created (graceful handling)

---

### User Story 6 - Link Sources to Publishers (Priority: P3)

As a publishing analyst, I want to see which publishers host which journals/sources so that I can analyze publishing patterns and journal-publisher relationships.

**Why this priority**: MEDIUM - Valuable for publishing industry analysis, but less critical than core academic relationships.

**Independent Test**: Can be fully tested by expanding a source node and verifying host organization edge points TO the publisher entity.

**Acceptance Scenarios**:

1. **Given** a journal source S123 published by publisher P456, **When** I expand the source node, **Then** I see edge S123→P456 showing the host organization relationship
2. **Given** a publisher P789 hosting 50 journals, **When** I expand the publisher node, **Then** I can discover all 50 hosted sources via reverse lookup
3. **Given** a source with no host organization, **When** I expand the source node, **Then** no host organization edge is created

---

### Edge Cases

- What happens when a work has no authors in OpenAlex data? (Edge should not be created; node should still display with zero authorship edges)
- How does system handle works with 100+ citations? (Support pagination/limiting of citation edges; metadata indicates total count)
- What if OpenAlex API returns incomplete relationship data (missing IDs)? (Skip that specific relationship; log warning; continue with other relationships)
- How to handle bidirectional relationships discovered from both sides? (Use `direction` metadata: 'outbound' for data owner, 'inbound' for reverse lookup; prevent duplicates)
- What if a relationship points to an entity type not yet supported? (Create edge with basic node stub; mark node as unexpanded; support future expansion)
- How to handle very large expansion results (e.g., highly-cited work with 1000+ citing papers)? (Apply configurable limits; provide metadata indicating truncation; support pagination)

## Requirements *(mandatory)*

### Functional Requirements

#### Core Relationship Direction Fixes

- **FR-001**: System MUST reverse AUTHORSHIP edge direction so Work entities are source and Author entities are target (Work → Author)
- **FR-002**: System MUST mark AUTHORSHIP edges created during work expansion as `direction: 'outbound'` (data ownership)
- **FR-003**: System MUST mark AUTHORSHIP edges discovered during author expansion as `direction: 'inbound'` (reverse lookup)
- **FR-004**: System MUST prevent duplicate edges when same relationship discovered from both sides (use edge ID normalization)

#### Citation Relationships (referenced_works[])

- **FR-005**: System MUST create REFERENCE edges when expanding works, with Work as source and cited Work as target (Work → cited Work)
- **FR-006**: System MUST extract citation information from `referenced_works[]` array in OpenAlex work data
- **FR-007**: System MUST support reverse lookup to find all works that cite a given work (inbound citations)
- **FR-008**: System MUST include citation count metadata on REFERENCE edges when available

#### Funding Relationships (grants[])

- **FR-009**: System MUST create FUNDED_BY edges when expanding works with grant information, with Work as source and Funder as target
- **FR-010**: System MUST extract funder information from `grants[]` array in OpenAlex work data
- **FR-011**: System MUST include grant award ID in edge metadata when available
- **FR-012**: System MUST support reverse lookup to find all works funded by a given funder

#### Topic Hierarchy Relationships

- **FR-013**: System MUST create TOPIC_PART_OF_FIELD edges connecting topics to their parent fields (Topic → Field)
- **FR-014**: System MUST create FIELD_PART_OF_DOMAIN edges connecting fields to their parent domains (Field → Domain)
- **FR-015**: System MUST extract topic hierarchy from `subfield`, `field`, and `domain` properties in OpenAlex topic data
- **FR-016**: System MUST support reverse lookup to find all topics within a field or domain

#### Institution Lineage Relationships

- **FR-017**: System MUST create LINEAGE edges connecting institutions to parent institutions from `lineage[]` array
- **FR-018**: System MUST support multiple levels of institutional hierarchy (department → university → system)
- **FR-019**: System MUST support reverse lookup to find child institutions

#### Source-Publisher Relationships

- **FR-020**: System MUST create HOST_ORGANIZATION edges connecting sources to publishers from `host_organization` property
- **FR-021**: System MUST support reverse lookup to find all sources hosted by a publisher

#### Publisher Hierarchy Relationships

- **FR-022**: System MUST create PUBLISHER_CHILD_OF edges connecting publishers to parent publishers from `parent_publisher` property
- **FR-023**: System MUST create LINEAGE edges for publisher hierarchies from `lineage[]` array
- **FR-024**: System MUST implement `expandPublisherWithCache()` method for publisher entity expansion

#### Funder Expansion

- **FR-025**: System MUST implement `expandFunderWithCache()` method to support funder entity expansion
- **FR-026**: System MUST support reverse lookup from funders to find all funded works

#### Additional Relationship Types

- **FR-027**: System MUST add missing RelationType enum values: FIELD_PART_OF_DOMAIN, TOPIC_PART_OF_SUBFIELD, TOPIC_SIBLING
- **FR-028**: System MUST add WORK_HAS_KEYWORD relationship support for work-keyword connections from `keywords[]` array
- **FR-029**: System MUST add AUTHOR_RESEARCHES relationship support for author-topic connections

#### Error Handling & Data Quality

- **FR-030**: System MUST gracefully handle missing relationship arrays (undefined or empty) without creating edges
- **FR-031**: System MUST skip relationships with missing or invalid entity IDs (log warnings but continue)
- **FR-032**: System MUST validate entity IDs before creating edges (proper OpenAlex ID format)
- **FR-033**: System MUST apply configurable limits to prevent expansion of extremely large relationship sets (e.g., max 100 citations per work)

#### Expansion Method Consistency

- **FR-034**: All `expand*WithCache()` methods MUST follow consistent edge creation pattern: source = entity being expanded, target = related entity
- **FR-035**: All edge objects MUST include `direction` metadata field ('outbound' or 'inbound')
- **FR-036**: All expansion methods MUST use batch preloading for related entities when cache is available

### Key Entities

- **GraphEdge**: Represents relationships between entities, with source (data owner), target (referenced entity), type (RelationType), direction ('outbound'/'inbound'), and optional metadata
- **Work**: Academic publication owning authorships[], referenced_works[], topics[], primary_location.source, grants[]
- **Author**: Researcher owning affiliations[], last_known_institutions[]
- **Source**: Publication venue owning host_organization
- **Institution**: Organization owning lineage[] for hierarchy
- **Publisher**: Publishing company owning parent_publisher and lineage[]
- **Funder**: Funding agency discovered via reverse lookup from works
- **Topic**: Research area owning field, domain, subfield hierarchy
- **Field**: Mid-level taxonomy category owning domain parent
- **Domain**: Top-level taxonomy category

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Researchers can trace authorship relationships with 100% correct direction (Work → Author)
- **SC-002**: Researchers can build citation networks including all available citations from OpenAlex (up to configured limits)
- **SC-003**: Researchers can analyze funding patterns by discovering all works funded by a specific agency
- **SC-004**: Researchers can navigate topic taxonomies from specific topics through fields to domains
- **SC-005**: Researchers can explore institutional hierarchies showing complete organizational structures
- **SC-006**: Graph expansion completes within 5 seconds for works with up to 100 relationships
- **SC-007**: All existing graph tests continue to pass with updated relationship directions
- **SC-008**: Zero duplicate edges created when expanding relationships from both sides
- **SC-009**: System handles missing relationship data gracefully without errors
- **SC-010**: Relationship coverage increases from 11% to at least 80% for core work relationships

## Constitution Alignment *(recommended)*

- **Type Safety**: Feature uses strict TypeScript types for all relationship data; no `any` types; uses type guards for OpenAlex data validation
- **Test-First**: Implementation follows Red-Green-Refactor; tests written for each relationship type before implementation; edge direction tests verify correctness
- **Monorepo Architecture**: Changes contained within `packages/graph` (providers, types, services) with no cross-package violations
- **Storage Abstraction**: Relationship data flows through storage provider interface; no direct IndexedDB access
- **Performance & Memory**: Batch preloading for related entities; configurable limits prevent memory exhaustion; expansion completes within 5 seconds
- **Atomic Conventional Commits**: Each relationship type implemented in separate atomic commit; direction fix is breaking change requiring dedicated commit
- **Development-Stage Pragmatism**: Breaking changes to edge direction are acceptable; no migration path required for development phase; production deployment will need data migration strategy
- **Test-First Bug Fixes**: Authorship direction bug has comprehensive regression tests written before fix applied
- **Deployment Readiness**: All relationship implementations include complete test coverage; no work considered complete until all tests pass across entire monorepo

## Dependencies & Assumptions

### Dependencies

- OpenAlex API provides complete relationship data in entity responses (authorships[], referenced_works[], grants[], etc.)
- Graph visualization system can handle increased edge count from comprehensive relationship implementation
- Storage provider can efficiently handle batch operations for relationship discovery

### Assumptions

- OpenAlex relationship data format remains stable during implementation (no breaking API changes)
- Existing graph repository and provider interfaces support all required relationship operations
- Performance targets (5-second expansion) achievable with batch preloading and caching strategies
- Development phase allows breaking changes to existing graph data (no production users affected)
- Relationship limits (e.g., max 100 citations) are configurable and can be adjusted based on performance testing

## Out of Scope

- Visualization styling/rendering of different relationship types (UI concern, not data model)
- Real-time updates of relationships as OpenAlex data changes (handled by existing cache invalidation)
- Custom relationship types beyond those available in OpenAlex API
- Relationship weight calculation for graph algorithms (future enhancement)
- Bidirectional query optimization (future enhancement after basic relationships work)
- Migration tooling for existing production graph data (not needed in development phase per Constitution Principle VII)
- Concepts entity relationships (deprecated by OpenAlex, low priority)
- SDG (Sustainable Development Goals) relationships (low priority, not in core requirements)
- Related works similarity relationships (low priority, not in core OpenAlex data)

---

## Implementation Status

**Progress**: 90/90 tasks (100%) complete ✅
**Status**: ✅ All phases complete
**Completed**: 2025-11-18

### Completed Phases

**Phase 1: Setup (Shared Infrastructure)** (5/5 tasks ✅)
- RelationType enum extensions (FIELD_PART_OF_DOMAIN, TOPIC_PART_OF_SUBFIELD, etc.)
- Edge utilities (createCanonicalEdgeId, validateOpenAlexId)
- ExpansionLimits interface
- Edge metadata type interfaces

**Phase 2: Foundational (Blocking Prerequisites)** (4/4 tasks ✅)
- Edge deduplication logic using edge.id as primary key
- Batch entity preloading for related entities
- getRelationshipLimit() helper with configurable limits
- Truncation metadata in GraphExpansion interface

**Phase 3: User Story 1 - Authorship Fix** (8/8 tasks ✅) 🎯 **MVP**
- Fixed AUTHORSHIP edge direction: Work → Author (not Author → Work)
- Work expansion creates outbound edges to authors
- Author expansion discovers works via reverse lookup with inbound edges
- Edge deduplication prevents duplicates from bidirectional expansion
- Commit: `83e32e408` - fix(graph): correct AUTHORSHIP edge direction (Work → Author) - US1 MVP

**Phase 4: User Story 2 - Citation Networks** (10/10 tasks ✅)
- Implemented REFERENCE edges from referenced_works[] array
- Citing work → cited work direction
- Citation metadata extraction (citation_count)
- Reverse citation lookup to discover citing works
- Configurable citation limit (default 20)
- Commit: `85f255a98` - feat(graph): implement REFERENCE edges for citations (Work → Work) - US2

**Phase 5: User Story 3 - Funding Relationships** (11/11 tasks ✅)
- Implemented FUNDED_BY edges from grants[] array
- Work → Funder direction with award_id metadata
- expandFunderWithCache() method for funder entity expansion
- Reverse lookup to discover all funded works
- Graceful handling of missing grants[]
- Commit: `40fb02053` - feat(graph): implement FUNDED_BY edges (Work → Funder) - US3

**Phase 6: User Story 4 - Topic Hierarchies** (11/11 tasks ✅)
- Implemented topic taxonomy hierarchy edges
- TOPIC_PART_OF_FIELD edges (Topic → Field)
- FIELD_PART_OF_DOMAIN edges (Field → Domain)
- TOPIC_PART_OF_SUBFIELD edges for complete taxonomy
- Reverse lookup to find topics within field or domain
- Field and domain stub nodes for visualization
- Commit: `d4bb09078` - feat(graph): implement topic taxonomy hierarchy edges - US4

**Phase 7: User Story 5 - Institutional Hierarchies** (10/10 tasks ✅)
- Implemented LINEAGE edges from lineage[] array
- Institution → Parent Institution direction
- Multi-level hierarchy support (department → university → system)
- Reverse lookup to discover child institutions
- Configurable lineage limit (default 5)
- Commit: `0ec15d7a1` - feat(graph): implement institution LINEAGE edges - US5

**Phase 8: User Story 6 - Publisher Relationships** (11/11 tasks ✅)
- Implemented HOST_ORGANIZATION edges (Source → Publisher)
- expandPublisherWithCache() method
- Reverse lookup to find all hosted sources
- PUBLISHER_CHILD_OF edges from parent_publisher
- Publisher LINEAGE edges for hierarchies
- Commit: `0776932df` - feat(graph): implement publisher relationships - US6

**Phase 9: Additional Relationships** (4/4 tasks ✅)
- WORK_HAS_KEYWORD edges from keywords[] array
- AUTHOR_RESEARCHES edges from author topics[]
- Unit tests for keyword and author topic edges
- Commit: `0d5e69ae7` - feat(graph): implement keyword and author topic edges - Phase 9

**Phase 10: Polish & Cross-Cutting Concerns** (16/16 tasks ✅)
- Comprehensive error handling for missing relationship arrays
- Warning logs for invalid entity IDs
- Entity ID validation across all edge creation
- Configurable limits applied to all relationship types
- Consistent expand*WithCache() patterns
- Direction metadata ('outbound'/'inbound') on all edges
- Batch preloading for all relationship types
- Updated metadata interfaces based on OpenAlex data
- Truncation metadata in expansion results
- Documentation updates (data-model.md, contracts/, MIGRATION.md)
- Full test suite passing
- Constitution compliance verification
- Commit: `5801c244c` - fix(graph): Phase 10 polish - metadata, truncation, test fixes

### Test Coverage

**Test-First Development**: All tests written BEFORE implementation (RED-GREEN-REFACTOR)
- Authorship tests: Work→Author direction, reverse lookup, bidirectional consistency, regression
- Citation tests: Citation chains, metadata extraction, reverse lookup
- Funding tests: Work→Funder edges, grant metadata, funder expansion, reverse lookup
- Topic tests: Taxonomy hierarchy paths, Field→Domain edges, reverse lookup
- Institution tests: Multi-level lineage, parent→child hierarchies, reverse lookup
- Publisher tests: Source→Publisher edges, publisher hierarchies, reverse lookup
- Additional: Keyword edges, author research topic edges
- Performance: Benchmark tests validate <5s expansion for 100 relationships

### Success Criteria Status

- ✅ **SC-001**: Authorship relationships 100% correct direction (Work → Author)
- ✅ **SC-002**: Citation networks include all available citations (up to configured limits)
- ✅ **SC-003**: Funding pattern analysis via reverse funder lookup
- ✅ **SC-004**: Topic taxonomies navigable from topics through fields to domains
- ✅ **SC-005**: Institutional hierarchies show complete organizational structures
- ✅ **SC-006**: Graph expansion completes within 5 seconds for 100 relationships
- ✅ **SC-007**: All existing graph tests pass with updated directions
- ✅ **SC-008**: Zero duplicate edges from bidirectional expansion
- ✅ **SC-009**: Missing relationship data handled gracefully
- ✅ **SC-010**: Relationship coverage increased from 11% to 80%+

### Implementation Complete

All phases complete. The graph package now correctly implements ALL OpenAlex relationships:
- **AUTHORSHIP**: Work → Author (fixed reversed direction)
- **REFERENCE**: Work → Cited Work (citations)
- **FUNDED_BY**: Work → Funder (grants)
- **TOPIC_PART_OF_FIELD**: Topic → Field (taxonomy)
- **FIELD_PART_OF_DOMAIN**: Field → Domain (taxonomy)
- **LINEAGE**: Institution → Parent Institution (hierarchies)
- **HOST_ORGANIZATION**: Source → Publisher
- **PUBLISHER_CHILD_OF**: Publisher → Parent Publisher
- **WORK_HAS_KEYWORD**: Work → Keyword
- **AUTHOR_RESEARCHES**: Author → Topic

**Breaking Change**: AUTHORSHIP edge direction reversed (Author→Work became Work→Author). Migration guide available in MIGRATION.md.

**Total Commits**: 10 commits (8 feature phases + 1 foundational + 1 polish)
**Total Tasks**: 90 tasks complete
**Test Strategy**: Test-first development (RED-GREEN-REFACTOR) throughout
**Constitution Compliance**: ✅ No `any` types, atomic commits, full test coverage
