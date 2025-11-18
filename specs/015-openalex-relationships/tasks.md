# Tasks: OpenAlex Relationship Implementation

**Input**: Design documents from `/specs/015-openalex-relationships/`
**Prerequisites**: plan.md (complete), spec.md (complete), research.md (complete), data-model.md (complete), contracts/ (complete)

**Tests**: Following Test-First Development (TDD) approach per Constitution Principle II - ALL tests written BEFORE implementation

**Organization**: Tasks grouped by user story to enable independent implementation and testing of each story

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1, US2, US3, US4, US5, US6)
- Include exact file paths in descriptions

## Path Conventions

Academic Explorer monorepo structure:
- **packages/graph/src/** - Graph package implementation
- **packages/graph/tests/** - Graph package tests
- **packages/types/src/** - Shared TypeScript types

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Establish edge utilities and type definitions that ALL user stories depend on

**⚠️ CRITICAL**: These tasks MUST complete before ANY user story work begins

- [x] T001 [P] Add missing RelationType enum values in packages/graph/src/types/core.ts (FIELD_PART_OF_DOMAIN, TOPIC_PART_OF_SUBFIELD, TOPIC_SIBLING, WORK_HAS_KEYWORD, AUTHOR_RESEARCHES, PUBLISHER_CHILD_OF per FR-027)
- [x] T002 [P] Create edge ID generation utility function createCanonicalEdgeId() in packages/graph/src/utils/edge-utils.ts (supports FR-004 deduplication, see research.md Section 3)
- [x] T003 [P] Create edge ID validation function validateOpenAlexId() in packages/graph/src/utils/edge-utils.ts (supports FR-031, FR-032)
- [x] T004 [P] Create ExpansionLimits interface in packages/graph/src/types/expansion.ts with relationship-specific limits (supports FR-033, see research.md Section 4)
- [x] T005 [P] Create edge metadata type interfaces in packages/graph/src/types/metadata.ts (AuthorshipMetadata, CitationMetadata, FundingMetadata, AffiliationMetadata, TopicMetadata, PublicationMetadata per data-model.md lines 117-165)

**Checkpoint**: Foundation utilities ready - user story implementation can now begin in parallel

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Core edge creation infrastructure that ALL user stories depend on

**⚠️ CRITICAL**: No user story work can begin until this phase is complete

- [x] T006 Implement edge deduplication logic in packages/graph/src/services/graph-repository.ts using edge.id as primary key (supports FR-004, see data-model.md lines 499-520)
- [x] T007 Implement batch entity preloading in packages/graph/src/services/entity-cache.ts for related entities (supports FR-036, see research.md Section 2)
- [x] T008 Implement getRelationshipLimit() helper function in packages/graph/src/providers/base-provider.ts to apply configurable limits (supports FR-033, see research.md Section 4 lines 441-461)
- [x] T009 Add truncation metadata to GraphExpansion interface in packages/graph/src/types/expansion.ts (supports FR-033, see research.md Section 4 lines 463-497)

**Checkpoint**: Foundation ready - user story implementation can now begin in parallel

---

## Phase 3: User Story 1 - View Authorship Relationships Correctly (Priority: P1) 🎯 MVP

**Goal**: Fix critical AUTHORSHIP edge direction bug so Work → Author (not Author → Work)

**Independent Test**: Expand work node, verify edges point FROM work TO authors; expand author node, verify consistent direction

**Functional Requirements**: FR-001, FR-002, FR-003, FR-004

### Tests for User Story 1 (Test-First - Write BEFORE Implementation) ⚠️

> **NOTE: Write these tests FIRST, ensure they FAIL before implementation**
> **NAMING**: Tests follow pattern `*.test.ts` in packages/graph/tests/providers/

- [x] T010 [P] [US1] Write unit test for Work → Author direction in packages/graph/tests/providers/authorship.test.ts - verifies edge.source = workId, edge.target = authorId, edge.direction = 'outbound' when expanding work (FR-001, FR-002)
- [x] T011 [P] [US1] Write unit test for author reverse lookup in packages/graph/tests/providers/authorship.test.ts - verifies edge.source = workId (NOT authorId), edge.target = authorId, edge.direction = 'inbound' when expanding author (FR-003)
- [x] T012 [P] [US1] Write integration test for bidirectional consistency in packages/graph/tests/providers/authorship.test.ts - expand work then author, verify no duplicate edges (same edge.id from both directions) (FR-004)
- [x] T013 [P] [US1] Write regression test for original bug in packages/graph/tests/providers/authorship.test.ts - assert no edges ever have source=authorId and target=workId (see research.md Section 5 lines 815-833)

**Run tests**: `pnpm test packages/graph -- --testPathPattern="authorship"` → **MUST FAIL**

### Implementation for User Story 1

- [x] T014 [US1] Fix AUTHORSHIP edge creation in expandWorkWithCache() method in packages/graph/src/providers/openalex-provider.ts (lines ~550-556) - change source from authorship.author.id to workId, change target from workId to authorship.author.id, set direction='outbound' (FR-001, FR-002)
- [x] T015 [US1] Fix AUTHORSHIP edge creation in expandAuthorWithCache() method in packages/graph/src/providers/openalex-provider.ts (lines ~632-638) - ensure source=workId (NOT authorId), target=authorId, direction='inbound', use createCanonicalEdgeId() (FR-003)
- [x] T016 [US1] Update edge ID generation to use createCanonicalEdgeId(workId, authorId, RelationType.AUTHORSHIP) in both expansion methods (FR-004)
- [x] T017 [US1] Add validation for author IDs before edge creation in expandWorkWithCache() - skip invalid IDs with warning log (FR-031, FR-032)

**Run tests**: `pnpm test packages/graph -- --testPathPattern="authorship"` → **MUST PASS**

**Checkpoint**: At this point, User Story 1 should be fully functional - authorship edges correctly directed Work → Author

---

## Phase 4: User Story 2 - Explore Citation Networks (Priority: P1)

**Goal**: Implement REFERENCE edges for citations (citing Work → cited Work)

**Independent Test**: Expand work with citations, verify edges point FROM citing work TO cited works

**Functional Requirements**: FR-005, FR-006, FR-007, FR-008

### Tests for User Story 2 (Test-First - Write BEFORE Implementation) ⚠️

> **NAMING**: Tests follow pattern `*.test.ts` in packages/graph/tests/providers/

- [x] T018 [P] [US2] Write unit test for citing Work → cited Work edges in packages/graph/tests/providers/citations.test.ts - verifies edges created from referenced_works[] array with correct direction (FR-005, FR-006)
- [x] T019 [P] [US2] Write unit test for citation metadata extraction in packages/graph/tests/providers/citations.test.ts - verifies edge.metadata includes citation_count when available (FR-008)
- [x] T020 [P] [US2] Write integration test for citation chain in packages/graph/tests/providers/citations.test.ts - expand W1→W2→W3 citation path, verify complete directed chain (see spec.md lines 38-39)
- [x] T021 [P] [US2] Write unit test for reverse citation lookup in packages/graph/tests/providers/citations.test.ts - query for works citing a given work, verify reverse lookup discovers citing works (FR-007)

**Run tests**: `pnpm test packages/graph -- --testPathPattern="citations"` → **MUST FAIL**

### Implementation for User Story 2

- [x] T022 [P] [US2] Extract referenced_works[] array in expandWorkWithCache() in packages/graph/src/providers/openalex-provider.ts (FR-006)
- [x] T023 [US2] Create REFERENCE edges with source=citingWorkId, target=citedWorkId, direction='outbound' in expandWorkWithCache() (FR-005)
- [x] T024 [US2] Add citation metadata extraction from OpenAlex work data and include in edge.metadata (FR-008)
- [x] T025 [US2] Implement reverse citation lookup in expandWorkWithCache() using OpenAlex API filter for citing works, create edges with direction='inbound' (FR-007)
- [x] T026 [US2] Apply configurable citation limit using getRelationshipLimit(options, 'references') with default 20 (see research.md Section 4 line 511)
- [x] T027 [US2] Validate cited work IDs before edge creation, skip invalid IDs with warning (FR-031, FR-032)

**Run tests**: `pnpm test packages/graph -- --testPathPattern="citations"` → **MUST PASS**

**Checkpoint**: At this point, User Stories 1 AND 2 should both work independently - authorship and citation networks complete

---

## Phase 5: User Story 3 - Discover Funding Relationships (Priority: P2)

**Goal**: Implement FUNDED_BY edges connecting works to funders

**Independent Test**: Expand funded work, verify edges point FROM work TO funders with grant metadata

**Functional Requirements**: FR-009, FR-010, FR-011, FR-012, FR-025, FR-026

### Tests for User Story 3 (Test-First - Write BEFORE Implementation) ⚠️

> **NAMING**: Tests follow pattern `*.test.ts` in packages/graph/tests/providers/

- [x] T028 [P] [US3] Write unit test for Work → Funder edges in packages/graph/tests/providers/funding.test.ts - verifies edges created from grants[] array (FR-009, FR-010)
- [x] T029 [P] [US3] Write unit test for grant metadata in packages/graph/tests/providers/funding.test.ts - verifies edge.metadata.award_id included when available (FR-011)
- [x] T030 [P] [US3] Write unit test for graceful handling of missing funding in packages/graph/tests/providers/funding.test.ts - work with no grants creates no edges (see spec.md lines 54-55)
- [x] T031 [P] [US3] Write unit test for funder expansion in packages/graph/tests/providers/funding.test.ts - expand funder, verify reverse lookup discovers all funded works (FR-012, FR-026)

**Run tests**: `pnpm test packages/graph -- --testPathPattern="funding"` → **MUST FAIL**

### Implementation for User Story 3

- [x] T032 [P] [US3] Extract grants[] array in expandWorkWithCache() in packages/graph/src/providers/openalex-provider.ts (FR-010)
- [x] T033 [US3] Create FUNDED_BY edges with source=workId, target=funderId, direction='outbound' from grants[] (FR-009)
- [x] T034 [US3] Extract and include award_id in edge.metadata for funding edges (FR-011)
- [x] T035 [US3] Create expandFunderWithCache() method in packages/graph/src/providers/openalex-provider.ts (FR-025)
- [x] T036 [US3] Implement reverse lookup in expandFunderWithCache() to discover all funded works via API query (FR-012, FR-026)
- [x] T037 [US3] Apply configurable grant limit using getRelationshipLimit(options, 'grants') with default 5 (see research.md Section 4 line 518)
- [x] T038 [US3] Validate funder IDs before edge creation, handle missing grants[] gracefully (FR-030, FR-031)

**Run tests**: `pnpm test packages/graph -- --testPathPattern="funding"` → **MUST PASS**

**Checkpoint**: At this point, User Stories 1, 2, AND 3 should all work independently - authorship, citations, and funding complete

---

## Phase 6: User Story 4 - Navigate Topic Hierarchies (Priority: P2)

**Goal**: Implement topic taxonomy hierarchy edges (Topic → Field → Domain)

**Independent Test**: Expand topic node, verify edges point TO parent field, field edges point TO parent domain

**Functional Requirements**: FR-013, FR-014, FR-015, FR-016, FR-027

### Tests for User Story 4 (Test-First - Write BEFORE Implementation) ⚠️

> **NAMING**: Tests follow pattern `*.test.ts` in packages/graph/tests/providers/

- [x] T039 [P] [US4] Write unit test for Topic → Field edges in packages/graph/tests/providers/topics.test.ts - verifies TOPIC_PART_OF_FIELD edges created from field property (FR-013, FR-015)
- [x] T040 [P] [US4] Write unit test for Field → Domain edges in packages/graph/tests/providers/topics.test.ts - verifies FIELD_PART_OF_DOMAIN edges created from domain property (FR-014, FR-015)
- [x] T041 [P] [US4] Write integration test for complete taxonomy path in packages/graph/tests/providers/topics.test.ts - expand topic, verify T123→F456→D789 complete hierarchy (see spec.md lines 68-69)
- [x] T042 [P] [US4] Write unit test for reverse topic lookup in packages/graph/tests/providers/topics.test.ts - query field, discover all topics within field (FR-016)

**Run tests**: `pnpm test packages/graph -- --testPathPattern="topics"` → **MUST FAIL**

### Implementation for User Story 4

- [x] T043 [P] [US4] Extract topic hierarchy properties (subfield, field, domain) in expandTopicWithCache() in packages/graph/src/providers/openalex-provider.ts (FR-015)
- [x] T044 [US4] Create TOPIC_PART_OF_FIELD edges with source=topicId, target=fieldId, direction='outbound' (FR-013)
- [x] T045 [US4] Create FIELD_PART_OF_DOMAIN edges with source=fieldId, target=domainId, direction='outbound' (FR-014)
- [x] T046 [US4] Create TOPIC_PART_OF_SUBFIELD edges if subfield data available (FR-027)
- [x] T047 [US4] Implement reverse lookup to find topics within field or domain (FR-016)
- [x] T048 [US4] Create field and domain stub nodes for taxonomy hierarchy visualization
- [x] T049 [US4] Validate topic hierarchy IDs before edge creation, handle missing hierarchy gracefully (FR-030, FR-031)

**Run tests**: `pnpm test packages/graph -- --testPathPattern="topics"` → **MUST PASS**

**Checkpoint**: At this point, User Stories 1-4 should all work independently - core academic relationships complete

---

## Phase 7: User Story 5 - Trace Institutional Hierarchies (Priority: P3)

**Goal**: Implement institution LINEAGE edges for organizational hierarchies

**Independent Test**: Expand institution node, verify lineage edges point TO parent institutions

**Functional Requirements**: FR-017, FR-018, FR-019

### Tests for User Story 5 (Test-First - Write BEFORE Implementation) ⚠️

> **NAMING**: Tests follow pattern `*.test.ts` in packages/graph/tests/providers/

- [x] T050 [P] [US5] Write unit test for Institution → Parent edges in packages/graph/tests/providers/institutions.test.ts - verifies LINEAGE edges created from lineage[] array (FR-017)
- [x] T051 [P] [US5] Write integration test for complete hierarchy chain in packages/graph/tests/providers/institutions.test.ts - expand department, verify I123→I456→I789 complete hierarchy (FR-018, see spec.md lines 84-85)
- [x] T052 [P] [US5] Write unit test for reverse lineage lookup in packages/graph/tests/providers/institutions.test.ts - query university, discover all child departments (FR-019)
- [x] T053 [P] [US5] Write unit test for graceful handling of missing lineage in packages/graph/tests/providers/institutions.test.ts - institution with no lineage creates no edges (see spec.md lines 86-87)

**Run tests**: `pnpm test packages/graph -- --testPathPattern="institutions"` → **MUST FAIL**

### Implementation for User Story 5

- [x] T054 [P] [US5] Extract lineage[] array in expandInstitutionWithCache() in packages/graph/src/providers/openalex-provider.ts (FR-017)
- [x] T055 [US5] Create LINEAGE edges with source=institutionId, target=parentId for each lineage entry, direction='outbound' (FR-017)
- [x] T056 [US5] Support multiple hierarchy levels by iterating complete lineage[] array (FR-018)
- [x] T057 [US5] Implement reverse lookup to discover child institutions (FR-019)
- [x] T058 [US5] Apply configurable lineage limit using getRelationshipLimit(options, 'lineage') with default 5 (see research.md Section 4 line 526)
- [x] T059 [US5] Validate institution IDs in lineage[] before edge creation, handle missing lineage[] gracefully (FR-030, FR-031)

**Run tests**: `pnpm test packages/graph -- --testPathPattern="institutions"` → **MUST PASS**

**Checkpoint**: At this point, User Stories 1-5 should all work independently

---

## Phase 8: User Story 6 - Link Sources to Publishers (Priority: P3)

**Goal**: Implement HOST_ORGANIZATION edges connecting sources to publishers

**Independent Test**: Expand source node, verify host organization edge points TO publisher

**Functional Requirements**: FR-020, FR-021, FR-022, FR-023, FR-024

### Tests for User Story 6 (Test-First - Write BEFORE Implementation) ⚠️

> **NAMING**: Tests follow pattern `*.test.ts` in packages/graph/tests/providers/

- [x] T060 [P] [US6] Write unit test for Source → Publisher edges in packages/graph/tests/providers/publishers.test.ts - verifies HOST_ORGANIZATION edge created from host_organization property (FR-020)
- [x] T061 [P] [US6] Write unit test for publisher expansion in packages/graph/tests/providers/publishers.test.ts - expand publisher, verify reverse lookup discovers all hosted sources (FR-021)
- [x] T062 [P] [US6] Write unit test for publisher hierarchy in packages/graph/tests/providers/publishers.test.ts - verifies PUBLISHER_CHILD_OF edges from parent_publisher (FR-022)
- [x] T063 [P] [US6] Write unit test for graceful handling of missing host in packages/graph/tests/providers/publishers.test.ts - source with no host_organization creates no edge (see spec.md line 103)

**Run tests**: `pnpm test packages/graph -- --testPathPattern="publishers"` → **MUST FAIL**

### Implementation for User Story 6

- [x] T064 [P] [US6] Extract host_organization property in expandSourceWithCache() in packages/graph/src/providers/openalex-provider.ts (FR-020)
- [x] T065 [US6] Create HOST_ORGANIZATION edge with source=sourceId, target=publisherId, direction='outbound' (FR-020)
- [x] T066 [US6] Create expandPublisherWithCache() method in packages/graph/src/providers/openalex-provider.ts (FR-024)
- [x] T067 [US6] Implement reverse lookup in expandPublisherWithCache() to discover all hosted sources (FR-021)
- [x] T068 [US6] Extract parent_publisher property and create PUBLISHER_CHILD_OF edges in expandPublisherWithCache() (FR-022)
- [x] T069 [US6] Extract publisher lineage[] array and create LINEAGE edges for publisher hierarchies (FR-023)
- [x] T070 [US6] Validate publisher IDs before edge creation, handle missing host_organization gracefully (FR-030, FR-031)

**Run tests**: `pnpm test packages/graph -- --testPathPattern="publishers"` → **MUST PASS**

**Checkpoint**: All user stories should now be independently functional - complete relationship coverage achieved

---

## Phase 9: Additional Relationships (Cross-Story Enhancements)

**Purpose**: Additional relationship types that enhance multiple user stories

**Functional Requirements**: FR-028, FR-029

- [x] T071 [P] Implement WORK_HAS_KEYWORD edges in expandWorkWithCache() from keywords[] array in packages/graph/src/providers/openalex-provider.ts (FR-028)
- [x] T072 [P] Write unit test for keyword edges in packages/graph/src/providers/keywords.test.ts - verifies Work → Keyword edges created
- [x] T073 [P] Implement AUTHOR_RESEARCHES edges in expandAuthorWithCache() from author topics[] in packages/graph/src/providers/openalex-provider.ts (FR-029)
- [x] T074 [P] Write unit test for author research topics in packages/graph/src/providers/author-topics.test.ts - verifies Author → Topic edges created

**Run tests**: `pnpm test packages/graph`

---

## Phase 10: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories

- [ ] T075 [P] Add comprehensive error handling for missing relationship arrays across all expansion methods (FR-030)
- [ ] T076 [P] Add warning logs for invalid entity IDs across all edge creation logic (FR-031)
- [ ] T077 [P] Implement entity ID validation using validateOpenAlexId() before all edge creation (FR-032)
- [ ] T078 [P] Apply configurable limits across all relationship types using getRelationshipLimit() (FR-033)
- [ ] T079 [P] Ensure all expand*WithCache() methods follow consistent pattern: source=expanding entity, target=related entity (FR-034)
- [ ] T080 [P] Add direction metadata field to all edge creation: 'outbound' for owned data, 'inbound' for reverse lookup (FR-035)
- [ ] T081 [P] Implement batch preloading for all relationship types when cache available (FR-036)
- [ ] T082 [P] Update relationship-specific metadata interfaces in packages/graph/src/types/metadata.ts based on actual OpenAlex data
- [ ] T083 [P] Add truncation metadata to expansion results when limits applied (see research.md Section 4 lines 463-497)
- [ ] T084 Documentation: Update data-model.md with implementation details and examples
- [ ] T085 Documentation: Update contracts/ with actual edge creation patterns used
- [ ] T086 Documentation: Create migration guide for breaking AUTHORSHIP direction change
- [ ] T087 Run full test suite: `pnpm test packages/graph` - verify all 99+ tests pass
- [ ] T088 Run type check: `pnpm nx typecheck graph` - verify zero TypeScript errors
- [ ] T089 Run quickstart.md validation workflow to ensure all examples work
- [ ] T090 Constitution compliance verification:
  - [ ] No `any` types in implementation (Type Safety) - grep packages/graph/src for ': any'
  - [ ] All tests written before implementation (Test-First) - verify RED-GREEN-REFACTOR followed
  - [ ] Proper Nx workspace structure used (Monorepo Architecture) - changes only in packages/graph
  - [ ] No direct IndexedDB access (Storage Abstraction) - all via storage provider interface
  - [ ] Expansion completes within 5 seconds for 100 relationships (Performance & Memory) - benchmark tests
  - [ ] Each relationship type has atomic commit (Atomic Conventional Commits) - review git history
  - [ ] Breaking changes documented (Development-Stage Pragmatism) - migration guide created (T086)
  - [ ] Authorship bug has regression tests (Test-First Bug Fixes) - T013 completed

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies - can start immediately - BLOCKS all other phases
- **Foundational (Phase 2)**: Depends on Setup completion - BLOCKS all user stories
- **User Stories (Phase 3-8)**: All depend on Foundational phase completion
  - User stories CAN proceed in parallel (if staffed) after Foundational complete
  - Or sequentially in priority order: US1 (P1) → US2 (P1) → US3 (P2) → US4 (P2) → US5 (P3) → US6 (P3)
- **Additional Relationships (Phase 9)**: Can proceed after any relevant user story (keywords after US1, research topics after US1+US4)
- **Polish (Phase 10)**: Depends on all desired user stories being complete

### User Story Dependencies

- **User Story 1 (P1) - Authorship**: Depends ONLY on Phases 1+2 - No dependencies on other stories - 🎯 MVP SCOPE
- **User Story 2 (P1) - Citations**: Depends ONLY on Phases 1+2 - No dependencies on other stories
- **User Story 3 (P2) - Funding**: Depends ONLY on Phases 1+2 - No dependencies on other stories
- **User Story 4 (P2) - Topics**: Depends ONLY on Phases 1+2 - No dependencies on other stories
- **User Story 5 (P3) - Institutions**: Depends ONLY on Phases 1+2 - No dependencies on other stories
- **User Story 6 (P3) - Publishers**: Depends ONLY on Phases 1+2 - No dependencies on other stories

### Within Each User Story (RED-GREEN-REFACTOR)

1. **RED Phase**: Write tests FIRST, ensure they FAIL
2. **Verify**: Run tests, confirm FAILURE (no false positives)
3. **GREEN Phase**: Implement minimum code to pass tests
4. **Verify**: Run tests, confirm PASS
5. **REFACTOR Phase**: Extract common patterns, improve code quality
6. **Verify**: Run tests, confirm still PASS after refactoring

### Parallel Opportunities (96 parallelizable tasks out of 90 total)

**Phase 1 (Setup)**: All 5 tasks can run in parallel - different files
**Phase 2 (Foundational)**: Tasks T006-T009 can run in parallel - different files

**Phase 3 (US1)**: Tests T010-T013 can run in parallel (4 tasks), Implementation is sequential after tests pass

**Phase 4 (US2)**: Tests T018-T021 can run in parallel (4 tasks), Implementation T022-T027 has dependencies

**Phase 5 (US3)**: Tests T028-T031 can run in parallel (4 tasks), Implementation T032-T038 has dependencies

**Phase 6 (US4)**: Tests T039-T042 can run in parallel (4 tasks), Implementation T043-T049 has dependencies

**Phase 7 (US5)**: Tests T050-T053 can run in parallel (4 tasks), Implementation T054-T059 has dependencies

**Phase 8 (US6)**: Tests T060-T063 can run in parallel (4 tasks), Implementation T064-T070 has dependencies

**Phase 9 (Additional)**: All 4 tasks can run in parallel - different relationship types

**Phase 10 (Polish)**: Tasks T075-T083 can run in parallel (9 tasks) - different cross-cutting concerns

**Total Parallel Tasks**: Setup(5) + Foundational(4) + US1-US6 tests(24) + Additional(4) + Polish(9) = 46 parallelizable tasks

---

## Parallel Example: User Story 1 (Authorship Fix)

```bash
# RED PHASE: Launch all tests for User Story 1 together:
Task(description="US1 Work→Author direction test", prompt="Write unit test in packages/graph/tests/providers/authorship.test.ts verifying edge.source=workId, edge.target=authorId when expanding work. Mock OpenAlex client with work W123 having author A456. Assert edge direction='outbound'. Test MUST fail initially.")

Task(description="US1 Author reverse lookup test", prompt="Write unit test in packages/graph/tests/providers/authorship.test.ts verifying edge.source=workId (NOT authorId) when expanding author. Mock author A456 with work W123. Assert edge direction='inbound'. Test MUST fail initially.")

Task(description="US1 Bidirectional consistency test", prompt="Write integration test in packages/graph/tests/providers/authorship.test.ts expanding work W123 then author A456. Assert same edge.id from both directions. Test MUST fail initially.")

Task(description="US1 Regression test", prompt="Write regression test in packages/graph/tests/providers/authorship.test.ts asserting NO edges ever have source=authorId and target=workId. Test MUST fail with current reversed implementation.")

# Verify all tests FAIL, then proceed to GREEN PHASE implementation
```

---

## Implementation Strategy

### MVP First (User Story 1 Only) - Recommended for Initial Development

1. Complete Phase 1: Setup (T001-T005) → ~2 hours
2. Complete Phase 2: Foundational (T006-T009) → ~3 hours
3. Complete Phase 3: User Story 1 (T010-T017) → ~4 hours
4. **STOP and VALIDATE**: Run `pnpm test packages/graph -- --testPathPattern="authorship"`
5. **Deploy/Demo**: AUTHORSHIP direction fix is MVP - critical bug resolved
6. **Total MVP Time**: ~9 hours

### Incremental Delivery (Priority-Based)

1. MVP (US1) → Foundation + Authorship Fix → ~9 hours
2. Add US2 (Citations) → ~6 hours → Deploy/Demo (Authorship + Citations)
3. Add US3 (Funding) → ~5 hours → Deploy/Demo (Authorship + Citations + Funding)
4. Add US4 (Topics) → ~5 hours → Deploy/Demo (Complete core relationships)
5. Add US5 (Institutions) → ~4 hours → Optional enhancement
6. Add US6 (Publishers) → ~4 hours → Optional enhancement
7. Polish → ~6 hours → Production-ready

**Total Complete Implementation**: ~39 hours

### Parallel Team Strategy (With 3 Developers)

**Week 1**: All developers complete Setup + Foundational together (~5 hours)

**Week 2** (after Foundational complete):
- Developer A: User Story 1 (Authorship) + User Story 2 (Citations) → ~10 hours
- Developer B: User Story 3 (Funding) + User Story 4 (Topics) → ~10 hours
- Developer C: User Story 5 (Institutions) + User Story 6 (Publishers) → ~8 hours

**Week 3**: All developers work on Polish together → ~6 hours

**Total Team Time**: ~21 hours wall-clock time with 3 developers

---

## Summary Metrics

**Total Tasks**: 90
**Tasks per Story**:
- Setup: 5 tasks
- Foundational: 4 tasks
- US1 (Authorship - P1): 8 tasks (4 tests + 4 implementation)
- US2 (Citations - P1): 10 tasks (4 tests + 6 implementation)
- US3 (Funding - P2): 11 tasks (4 tests + 7 implementation)
- US4 (Topics - P2): 11 tasks (4 tests + 7 implementation)
- US5 (Institutions - P3): 10 tasks (4 tests + 6 implementation)
- US6 (Publishers - P3): 11 tasks (4 tests + 7 implementation)
- Additional: 4 tasks
- Polish: 16 tasks

**Parallel Opportunities**: 46 tasks can run in parallel
**MVP Scope**: User Story 1 only (13 tasks including Setup + Foundational)
**File Path**: `/Users/joe/Documents/Research/PhD/Academic Explorer/specs/015-openalex-relationships/tasks.md`

**Primary Implementation File**: `packages/graph/src/providers/openalex-provider.ts`
**Test Files**: `packages/graph/tests/providers/*.test.ts` (authorship, citations, funding, topics, institutions, publishers)

---

## Notes

- [P] tasks = different files, no dependencies
- [Story] label maps task to specific user story for traceability
- Each user story is independently completable and testable
- All tests written BEFORE implementation (TDD/RED-GREEN-REFACTOR)
- Verify tests FAIL before implementing (no false positives)
- Commit after each task or logical group
- Stop at any checkpoint to validate story independently
- Breaking change: AUTHORSHIP direction reversal requires migration guide (T086)
