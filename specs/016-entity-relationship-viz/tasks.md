# Tasks: Entity Relationship Visualization

**Feature Branch**: `016-entity-relationship-viz`
**Input**: Design documents from `/specs/016-entity-relationship-viz/`
**Prerequisites**: plan.md, spec.md, research.md, data-model.md, contracts/, quickstart.md

**Organization**: Tasks are grouped by user story (US1-US4) to enable independent implementation and testing.

**Tests**: Test tasks included per Constitution Principle II (Test-First Development). Write failing tests before implementation.

---

## Format: `- [ ] [ID] [P?] [Story] Description`

- **Checkbox**: `- [ ]` (markdown checkbox)
- **[ID]**: Sequential task number (T001, T002, T003...)
- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: User story label (US1, US2, US3, US4) - ONLY for user story phases
- **Description**: Clear action with exact file path

**Path Convention**: Nx monorepo structure (apps/web/, packages/*)

---

## Implementation Strategy

**MVP Scope**: User Story 1 (P1) - View Incoming Relationships
- Minimum viable feature that delivers immediate research value
- Independent test: Navigate to entity page and verify incoming relationships displayed
- Deliverable: Researchers can assess citation impact and entity influence

**Incremental Delivery**:
1. **US1 (P1)**: Incoming relationships → Deploy and gather feedback
2. **US2 (P2)**: Outgoing relationships → Complete bidirectional view
3. **US3 (P3)**: Filtering → Usability enhancement for complex entities
4. **US4 (P4)**: Count badges → Scannability improvement

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Create foundational components and hooks shared across all user stories

**Tasks**:

- [ ] T001 [P] Create TypeScript types file at apps/web/src/types/relationship.ts with EntityRelationshipView, RelationshipSection, RelationshipItem, and RelationshipFilter interfaces from data-model.md
- [ ] T002 [P] Create useEntityRelationships hook at apps/web/src/hooks/use-entity-relationships.ts with signature: (entityId: string, entityType: EntityType) => {incoming: RelationshipSection[], outgoing: RelationshipSection[], loading: boolean, error?: RelationshipError}
- [ ] T003 [P] Create RelationshipItem component at apps/web/src/components/relationship/RelationshipItem.tsx to display individual relationship with clickable entity link and optional metadata
- [ ] T004 [P] Create RelationshipList component at apps/web/src/components/relationship/RelationshipList.tsx with pagination support (50 items per page, "Load more" button)
- [ ] T005 Create component tests at apps/web/test/component/relationship-item.component.test.tsx to verify RelationshipItem renders entity name, handles click navigation, and displays metadata
- [ ] T006 Create component tests at apps/web/test/component/relationship-list.component.test.tsx to verify pagination works correctly, "Load more" button appears when hasMore=true, and displays count (e.g., "Showing 50 of 150")

**Completion Criteria**: Base components and hooks created; unit tests pass; no user stories implemented yet

---

## Phase 2: User Story 1 (P1) - View Incoming Relationships

**Goal**: Researchers can view which entities link TO this entity (incoming relationships)

**Independent Test**: Navigate to `/works/W123` and verify incoming citations section appears with other works that cite W123

**Acceptance Scenarios**:
1. Work page shows incoming citations
2. Author page shows incoming authorship (works by this author)
3. Institution page shows incoming affiliations (authors at this institution)
4. Empty state: "No incoming relationships found"
5. Pagination: First 50 relationships with "Show more" button

**Tasks**:

- [ ] T007 [US1] Write failing E2E test at apps/web/test/e2e/incoming-relationships.e2e.test.ts for viewing incoming citations on work detail page (AS1)
- [ ] T008 [US1] Write failing E2E test at apps/web/test/e2e/incoming-relationships.e2e.test.ts for viewing incoming authorship on author detail page (AS2)
- [ ] T009 [US1] Write failing E2E test at apps/web/test/e2e/incoming-relationships.e2e.test.ts for viewing incoming affiliations on institution detail page (AS3)
- [ ] T010 [US1] Write failing E2E test at apps/web/test/e2e/incoming-relationships.e2e.test.ts for empty state display when no incoming relationships exist (AS4)
- [ ] T011 [US1] Write failing E2E test at apps/web/test/e2e/incoming-relationships.e2e.test.ts for pagination with 50+ incoming relationships (AS5)
- [ ] T012 [P] [US1] Create RelationshipSection component at apps/web/src/components/relationship/RelationshipSection.tsx to display grouped relationships with type label, count badge, and list of RelationshipItem components
- [ ] T013 [P] [US1] Create component tests at apps/web/test/component/relationship-section.component.test.tsx to verify section displays type label, count badge (e.g., "Citations (45)"), and renders RelationshipItem children
- [ ] T014 [US1] Implement useEntityRelationships hook logic to filter edges where edge.target === entityId and group by RelationType with direction='inbound'
- [ ] T015 [P] [US1] Add incoming relationships section to Work detail page at apps/web/src/routes/_entityType/_workId.lazy.tsx using RelationshipSection components for each relationship type
- [ ] T016 [P] [US1] Add incoming relationships section to Author detail page at apps/web/src/routes/_entityType/_authorId.lazy.tsx using RelationshipSection components
- [ ] T017 [P] [US1] Add incoming relationships section to Institution detail page at apps/web/src/routes/_entityType/_institutionId.lazy.tsx using RelationshipSection components
- [ ] T018 [P] [US1] Add incoming relationships section to Source detail page at apps/web/src/routes/_entityType/_sourceId.lazy.tsx using RelationshipSection components
- [ ] T019 [P] [US1] Add incoming relationships section to Publisher detail page at apps/web/src/routes/_entityType/_publisherId.lazy.tsx using RelationshipSection components
- [ ] T020 [P] [US1] Add incoming relationships section to Funder detail page at apps/web/src/routes/_entityType/_funderId.lazy.tsx using RelationshipSection components
- [ ] T021 [P] [US1] Add incoming relationships section to Topic detail page at apps/web/src/routes/_entityType/_topicId.lazy.tsx using RelationshipSection components
- [ ] T022 [US1] Verify all US1 E2E tests pass (T007-T011) and component tests pass (T005-T006, T013)

**Parallel Opportunities**:
- Component creation (T012) can run in parallel with test writing (T013)
- Entity page modifications (T015-T021) can run in parallel after T012 completes

**Completion Criteria**: All acceptance scenarios pass; incoming relationships visible on all 7 entity types; pagination works correctly; empty states display properly

---

## Phase 3: User Story 2 (P2) - View Outgoing Relationships

**Goal**: Researchers can view which entities this entity links TO (outgoing relationships)

**Independent Test**: Navigate to `/works/W123` and verify outgoing references section appears with works cited by W123

**Acceptance Scenarios**:
1. Work page shows outgoing references (cited works) and authors
2. Author page shows outgoing affiliations (institutions)
3. Institution page shows outgoing lineage (parent institutions)
4. Empty state: Section hidden or shows "None"
5. Outgoing relationships displayed separately from incoming

**Tasks**:

- [ ] T023 [US2] Write failing E2E test at apps/web/test/e2e/outgoing-relationships.e2e.test.ts for viewing outgoing references on work detail page (AS1)
- [ ] T024 [US2] Write failing E2E test at apps/web/test/e2e/outgoing-relationships.e2e.test.ts for viewing outgoing authors on work detail page (AS1)
- [ ] T025 [US2] Write failing E2E test at apps/web/test/e2e/outgoing-relationships.e2e.test.ts for viewing outgoing affiliations on author detail page (AS2)
- [ ] T026 [US2] Write failing E2E test at apps/web/test/e2e/outgoing-relationships.e2e.test.ts for viewing outgoing lineage on institution detail page (AS3)
- [ ] T027 [US2] Write failing E2E test at apps/web/test/e2e/outgoing-relationships.e2e.test.ts for empty state when no outgoing relationships exist (AS4)
- [ ] T028 [US2] Update useEntityRelationships hook at apps/web/src/hooks/use-entity-relationships.ts to also return outgoing relationships where edge.source === entityId with direction='outbound'
- [ ] T029 [P] [US2] Add outgoing relationships section to Work detail page at apps/web/src/routes/_entityType/_workId.lazy.tsx below incoming section with clear visual separator
- [ ] T030 [P] [US2] Add outgoing relationships section to Author detail page at apps/web/src/routes/_entityType/_authorId.lazy.tsx below incoming section
- [ ] T031 [P] [US2] Add outgoing relationships section to Institution detail page at apps/web/src/routes/_entityType/_institutionId.lazy.tsx below incoming section
- [ ] T032 [P] [US2] Add outgoing relationships section to Source detail page at apps/web/src/routes/_entityType/_sourceId.lazy.tsx below incoming section
- [ ] T033 [P] [US2] Add outgoing relationships section to Publisher detail page at apps/web/src/routes/_entityType/_publisherId.lazy.tsx below incoming section
- [ ] T034 [P] [US2] Add outgoing relationships section to Funder detail page at apps/web/src/routes/_entityType/_funderId.lazy.tsx below incoming section
- [ ] T035 [P] [US2] Add outgoing relationships section to Topic detail page at apps/web/src/routes/_entityType/_topicId.lazy.tsx below incoming section
- [ ] T036 [US2] Add visual distinction between incoming and outgoing sections using Mantine UI Stack/Divider components with section headers ("Incoming Relationships" and "Outgoing Relationships")
- [ ] T037 [US2] Verify all US2 E2E tests pass (T023-T027) and outgoing relationships display correctly on all entity types

**Parallel Opportunities**:
- Entity page modifications (T029-T035) can run in parallel after T028 completes

**Completion Criteria**: All acceptance scenarios pass; outgoing relationships visible on all 7 entity types; clear visual distinction from incoming; empty states work correctly

---

## Phase 4: User Story 3 (P3) - Relationship Type Filtering

**Goal**: Researchers can filter relationships by type (AUTHORSHIP, REFERENCE, AFFILIATION, etc.)

**Independent Test**: View entity with multiple relationship types, toggle AUTHORSHIP filter, verify only authorship relationships displayed

**Acceptance Scenarios**:
1. Toggle relationship type filter → only that type displayed
2. Clear filter → all types shown again
3. Filter state preserved (or reset) when navigating to another entity

**Tasks**:

- [ ] T038 [US3] Write failing E2E test at apps/web/test/e2e/relationship-filtering.e2e.test.ts for filtering to show only AUTHORSHIP relationships (AS1)
- [ ] T039 [US3] Write failing E2E test at apps/web/test/e2e/relationship-filtering.e2e.test.ts for clearing filter to show all types (AS2)
- [ ] T040 [US3] Write failing E2E test at apps/web/test/e2e/relationship-filtering.e2e.test.ts for filter state persistence across navigation (AS3)
- [ ] T041 [US3] Extract filterByDirection function from apps/web/src/components/sections/EdgeFiltersSection.tsx to shared utility at apps/web/src/utils/relationship-filters.ts
- [ ] T042 [US3] Create filterByType function at apps/web/src/utils/relationship-filters.ts with signature: (sections: RelationshipSection[], types: RelationType[]) => RelationshipSection[]
- [ ] T043 [US3] Add RelationshipFilter state to useEntityRelationships hook at apps/web/src/hooks/use-entity-relationships.ts with default filter: {direction: 'both', types: [], showSelfReferences: true}
- [ ] T044 [US3] Create RelationshipTypeFilter component at apps/web/src/components/relationship/RelationshipTypeFilter.tsx with checkboxes for each RelationType and "Clear all" button
- [ ] T045 [US3] Add RelationshipTypeFilter component to entity detail pages above relationship sections (Work, Author, Institution pages)
- [ ] T046 [US3] Implement filter logic in useEntityRelationships to apply filterByType and filterByDirection before returning sections
- [ ] T047 [US3] Add filter state persistence to localStorage using key: `entity-relationship-filter-${entityType}-${entityId}`
- [ ] T048 [US3] Verify all US3 E2E tests pass (T038-T040) and filtering works correctly with <1s response time per SC-005

**Parallel Opportunities**:
- Utility function creation (T041-T042) can run in parallel
- Component creation (T044) can run in parallel with hook updates (T043)

**Completion Criteria**: All acceptance scenarios pass; filtering responds in <1 second; filter state persists across navigation; all relationship types supported

---

## Phase 5: User Story 4 (P4) - Relationship Counts and Summaries

**Goal**: Researchers can see summary counts to quickly assess entity connectivity

**Independent Test**: View entity page and verify count badges appear in section headers (e.g., "Citations (150)")

**Acceptance Scenarios**:
1. Total incoming and outgoing count badges visible
2. Each relationship type shows count (e.g., "Authors (12)", "Citations (45)")
3. Counts show total available even if only 50 displayed

**Tasks**:

- [ ] T049 [US4] Write failing E2E test at apps/web/test/e2e/relationship-counts.e2e.test.ts for total incoming/outgoing count badges (AS1)
- [ ] T050 [US4] Write failing E2E test at apps/web/test/e2e/relationship-counts.e2e.test.ts for per-type count badges (AS2)
- [ ] T051 [US4] Write failing E2E test at apps/web/test/e2e/relationship-counts.e2e.test.ts for correct total count when pagination applied (AS3)
- [ ] T052 [P] [US4] Create RelationshipCounts component at apps/web/src/components/relationship/RelationshipCounts.tsx to display summary badges (total incoming, total outgoing, grand total)
- [ ] T053 [P] [US4] Create component tests at apps/web/test/component/relationship-counts.component.test.tsx to verify count badges render correctly and display accurate numbers
- [ ] T054 [US4] Add RelationshipSummary calculation to useEntityRelationships hook at apps/web/src/hooks/use-entity-relationships.ts with counts by type and direction
- [ ] T055 [US4] Update RelationshipSection component at apps/web/src/components/relationship/RelationshipSection.tsx to display count in section header (e.g., "Citations (totalCount)")
- [ ] T056 [US4] Add RelationshipCounts component to entity detail pages at top of relationship sections showing total incoming, outgoing, and overall counts
- [ ] T057 [US4] Implement count accuracy validation: totalCount must equal items.length per data-model.md validation rules
- [ ] T058 [US4] Verify all US4 E2E tests pass (T049-T051) and count accuracy is 100% per SC-008

**Parallel Opportunities**:
- Component creation (T052) can run in parallel with test writing (T053)

**Completion Criteria**: All acceptance scenarios pass; count accuracy 100%; counts display correctly with pagination; summary badges visible

---

## Phase 6: Integration and Polish

**Purpose**: Cross-cutting concerns, performance optimization, error handling, accessibility

**Tasks**:

- [ ] T059 [P] Create integration test at apps/web/test/integration/entity-relationships.integration.test.tsx to verify all user stories work together (incoming + outgoing + filtering + counts)
- [ ] T060 [P] Add loading skeleton components using Mantine Skeleton for relationship sections while data fetches (FR-012)
- [ ] T061 [P] Add error state components with retry button for relationship loading failures (FR-013)
- [ ] T062 [P] Implement async loading for relationships to not block main entity info render (FR-011)
- [ ] T063 [P] Add self-reference indicator to RelationshipItem component for self-referencing relationships (edge case from spec.md)
- [ ] T064 [P] Add partial data warning message when relationship metadata incomplete (edge case from spec.md)
- [ ] T065 [P] Create performance test at apps/web/test/performance/relationship-performance.test.ts to verify <2s load time with 1000 relationships (SC-006)
- [ ] T066 [P] Add ARIA labels and keyboard navigation to RelationshipTypeFilter for accessibility (WCAG 2.1 AA compliance)
- [ ] T067 [P] Run Playwright accessibility tests with @axe-core/playwright on entity detail pages with relationships
- [ ] T068 Verify performance targets met: 2s load (SC-001), <1s filtering (SC-005), 1000 relationships without degradation (SC-006)
- [ ] T069 Verify 95% entity coverage without errors (SC-002) by testing across all 7 entity types with real OpenAlex data
- [ ] T070 Run full quality pipeline: pnpm validate (typecheck + lint + test + build) and verify all tests pass

**Parallel Opportunities**:
- All tasks T059-T067 can run in parallel (different concerns)

**Completion Criteria**: All success criteria met; performance targets achieved; accessibility compliant; error handling robust

---

## Phase 7: Deployment Readiness

**Purpose**: Ensure feature meets Constitution Principle IX (Deployment Readiness)

**Tasks**:

- [ ] T071 Resolve any pre-existing TypeScript errors in packages/graph that block deployment (Constitution Principle IX)
- [ ] T072 Run pnpm typecheck across all packages and verify zero errors
- [ ] T073 Run pnpm test across all packages serially and verify zero failures
- [ ] T074 Run pnpm build and verify all packages build successfully
- [ ] T075 Run pnpm lint and verify zero violations (or document acceptable warnings)
- [ ] T076 Verify CI/CD pipeline would succeed if triggered (simulate deployment)
- [ ] T077 Create atomic conventional commits for each completed user story (feat(web): implement US1 incoming relationships, etc.)
- [ ] T078 Update CLAUDE.md with spec 016 completion status (if not gitignored)
- [ ] T079 Mark spec 016 as complete in specs/016-entity-relationship-viz/spec.md status field
- [ ] T080 Create pull request to merge 016-entity-relationship-viz branch to main with summary of changes

**Completion Criteria**: Branch deployable; all quality gates pass; atomic commits created; ready for merge

---

## Task Dependencies

### User Story Dependency Graph

```
Setup (Phase 1)
  ↓
US1 (P1) ← MVP: Incoming Relationships (Independent)
  ↓
US2 (P2) ← Outgoing Relationships (Depends on US1 components)
  ↓
US3 (P3) ← Filtering (Depends on US1+US2 display working)
  ↓
US4 (P4) ← Counts (Depends on US1+US2+US3 for accurate counts)
  ↓
Integration & Polish (Phase 6)
  ↓
Deployment Readiness (Phase 7)
```

### Critical Path

```
T001-T006 (Setup) → T007-T022 (US1) → T023-T037 (US2) → T038-T048 (US3) → T049-T058 (US4) → T070 (Validate)
```

### Parallelization Within Phases

**Phase 1 (Setup)**: T001-T004 can run in parallel (different files)

**Phase 2 (US1)**:
- Tests T007-T011 can run in parallel (different scenarios)
- Entity page mods T015-T021 can run in parallel (different files) after T012 completes

**Phase 3 (US2)**:
- Tests T023-T027 can run in parallel
- Entity page mods T029-T035 can run in parallel after T028 completes

**Phase 4 (US3)**:
- Utilities T041-T042 can run in parallel

**Phase 5 (US4)**:
- Component T052 and tests T053 can run in parallel

**Phase 6 (Integration)**:
- All tasks T059-T067 can run in parallel (different concerns)

---

## Task Summary

**Total Tasks**: 80

**Tasks by Phase**:
- Phase 1 (Setup): 6 tasks
- Phase 2 (US1): 16 tasks
- Phase 3 (US2): 15 tasks
- Phase 4 (US3): 11 tasks
- Phase 5 (US4): 10 tasks
- Phase 6 (Integration): 12 tasks
- Phase 7 (Deployment): 10 tasks

**Tasks by User Story**:
- Setup/Infrastructure: 6 tasks
- US1 (P1): 16 tasks
- US2 (P2): 15 tasks
- US3 (P3): 11 tasks
- US4 (P4): 10 tasks
- Cross-cutting: 22 tasks

**Parallelization**:
- 35 tasks marked [P] (can run in parallel)
- 45 tasks sequential (dependencies)

**MVP Scope**: Phases 1-2 (22 tasks) deliver US1 (View Incoming Relationships)

**Test Coverage**:
- Component tests: 4 files (T005, T006, T013, T053)
- Integration tests: 1 file (T059)
- E2E tests: 4 files per user story (16 total: T007-T011, T023-T027, T038-T040, T049-T051)
- Performance tests: 1 file (T065)
- Accessibility tests: 1 file (T067)

**Constitution Compliance**:
- ✅ Principle I (Type Safety): T001 defines strict types
- ✅ Principle II (Test-First): Tests written before implementation for each user story
- ✅ Principle VI (Atomic Commits): T077 creates conventional commits per user story
- ✅ Principle IX (Deployment Readiness): Phase 7 ensures deployability

---

**Ready for Implementation**: Follow test-first development (Red-Green-Refactor) and create atomic commits after each task completion.

**Last Updated**: 2025-11-18
**Status**: Tasks generated and ready for execution
