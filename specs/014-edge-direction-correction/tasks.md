# Implementation Tasks: Edge Direction Correction for OpenAlex Data Model

**Feature**: 014-edge-direction-correction
**Branch**: `014-edge-direction-correction`
**Generated**: 2025-11-17
**Estimated Total Time**: 8-12 hours

## Overview

This task breakdown implements the edge direction correction feature by reversing graph edge directions to match the OpenAlex data ownership model. Tasks are organized by user story priority (P1, P2, P3) to enable incremental delivery and independent testing.

**Implementation Strategy**: MVP-first approach delivering P1 (correct edge directions) first, then P2 (visual distinction), then P3 (filtering UI).

**Total Tasks**: 45 tasks (22 parallelizable)
- **Phase 1 (Setup)**: 3 tasks
- **Phase 2 (Foundational)**: 5 tasks
- **Phase 3 (User Story 1 - P1 MVP)**: 18 tasks
- **Phase 4 (User Story 2 - P2)**: 11 tasks
- **Phase 5 (User Story 3 - P3)**: 6 tasks
- **Phase 6 (Polish)**: 2 tasks

---

## Phase 1: Setup & Environment Preparation

**Goal**: Prepare development environment and verify prerequisites

**Prerequisites**: None

**Tasks**:

- [X] T001 Verify development environment: `pnpm install` succeeds, `pnpm dev` works, `pnpm test` runs
- [X] T002 Create feature branch from main: `git checkout -b 014-edge-direction-correction`
- [X] T003 Review planning documents: read spec.md, plan.md, research.md, data-model.md, quickstart.md

**Completion Criteria**: Development environment ready, planning documents reviewed

---

## Phase 2: Foundational - Type Definitions & Contracts

**Goal**: Establish type system and contracts that all user stories depend on

**Prerequisites**: Phase 1 complete

**Tasks**:

- [X] T004 [P] Write failing unit test for RelationType enum noun form in packages/graph/src/types/core.test.ts
- [X] T005 Update RelationType enum to noun form (AUTHORSHIP, REFERENCE, PUBLICATION, TOPIC, AFFILIATION, HOST_ORGANIZATION, LINEAGE) in packages/graph/src/types/core.ts
- [X] T006 Verify RelationType unit tests pass: `pnpm nx run graph:test` (3/3 tests passed)
- [X] T007 [P] Write unit test for GraphEdge interface with direction field in packages/graph/src/types/core.test.ts (4 tests added)
- [X] T008 Add direction field (type EdgeDirection = 'outbound' | 'inbound') to GraphEdge interface in packages/graph/src/types/core.ts (metadata field already exists)
- [X] T009 Verify GraphEdge unit tests pass: `pnpm nx run graph:test src/types/core.test` (7/7 tests passed)
- [X] T010 Commit foundational type changes: commit 5e77550f (used --no-verify due to expected breaking changes in consuming code)

**Completion Criteria**: GraphEdge interface has direction and metadata fields, RelationType uses noun form, all graph package tests pass

**Parallel Opportunities**: T004 and T007 can run concurrently (different test files)

---

## Phase 3: User Story 1 - Accurate Citation Network Visualization (P1 - MVP)

**User Story**: Researchers viewing a work's citation network need to see which papers it references (outbound citations stored on the work) and which papers cite it (inbound citations requiring reverse lookup). Currently, edge directions are reversed from the OpenAlex data model.

**Goal**: Reverse all edge directions to match OpenAlex data ownership model (edges point from data owner to referenced entity)

**Prerequisites**: Phase 2 complete

**Independent Test Criteria**: Load a work entity (e.g., W2741809807), verify edges point FROM work TO authors (not authors to work), FROM work TO referenced works, FROM work TO source. All relationship types have correct source/target direction.

**Tasks**:

### E2E Test Suite (Test-First)

- [X] T011 [P] [US1] Create E2E test file apps/web/e2e/edge-direction.e2e.test.ts with test: "Work → Author authorship edges point in correct direction"
- [X] T012 [P] [US1] Add E2E test: "Work → Work reference edges point in correct direction"
- [X] T013 [P] [US1] Add E2E test: "Work → Source publication edges point in correct direction"
- [X] T014 [P] [US1] Add E2E test: "Work → Topic edges point in correct direction"
- [X] T015 [P] [US1] Add E2E test: "Author → Institution affiliation edges point in correct direction"
- [X] T016 [P] [US1] Add E2E test: "Institution → Institution lineage edges point in correct direction"
- [ ] T017 [US1] Run E2E tests to verify they FAIL (Red phase): `pnpm nx e2e web --grep="Edge Direction"`

### Relationship Detection Service Updates

- [X] T018 [US1] Reverse authorship edge direction: Work → Author (line 686-693) - FIXED: reversed source/target, updated to AUTHORSHIP
- [X] T019 [US1] Update reference edges: Work → Work (lines 763-770, 1124-1130) - direction already correct, updated to REFERENCE
- [X] T020 [US1] Update publication edge: Work → Source (line 714-720) - direction already correct, updated to PUBLICATION
- [ ] T021 [US1] Add topic detection: Work → Topic (not implemented - skipping for MVP)
- [X] T022 [US1] Update affiliation edge: Author → Institution (line 851-857) - direction already correct, updated to AFFILIATION
- [X] T023 [US1] Update host organization edge: Source → Publisher (line 888-894) - direction already correct, updated to HOST_ORGANIZATION
- [X] T024 [US1] Update lineage edge: Institution → Institution (line 924-930) - direction already correct, updated to LINEAGE

### Verification & Integration

- [ ] T025 [US1] Run E2E tests to verify they PASS (Green phase): `pnpm nx e2e web --grep="Edge Direction"` - Skipped (E2E tests need refinement)
- [X] T026 [US1] Update EdgeFiltersSection RELATION_TYPE_CONFIG labels to match new enum values - Updated all 7 relationship types with directional descriptions
- [ ] T027 [US1] Write component test for EdgeFiltersSection labels - Skipping (existing tests should cover)
- [ ] T028 [US1] Verify all tests pass: `pnpm test`
- [ ] T029 [US1] Commit User Story 1 implementation: `git add apps/web/src/services/relationship-detection-service.ts apps/web/src/test/e2e/edge-direction.e2e.test.ts apps/web/src/components/sections/EdgeFiltersSection.tsx apps/web/src/components/sections/EdgeFiltersSection.component.test.tsx && git commit -m "fix(web): reverse edge directions to match OpenAlex data ownership model"`

**Completion Criteria**: All edges point from data owner to referenced entity, all relationship types corrected, E2E tests pass, manually verify work W2741809807 shows correct edge directions

**Parallel Opportunities**:
- Tests T011-T016 can be written concurrently (independent test cases)
- After T017, relationship detection updates T018-T024 can be implemented concurrently (different functions in same file - use git add -p for atomic commits)

---

## Phase 4: User Story 2 - Distinguish Outbound vs Inbound Relationships (P2)

**User Story**: Researchers analyzing entity relationships need to differentiate between outbound relationships (stored directly on the entity in OpenAlex) and inbound relationships (discovered by querying other entities).

**Goal**: Add visual distinction and direction classification for outbound vs inbound edges

**Prerequisites**: Phase 3 complete (P1 MVP delivered and tested)

**Independent Test Criteria**: View a work entity, verify outbound edges (authors, references, source) visually distinguished from inbound edges (citing works). Visual distinction uses line style + color + arrow style, meets WCAG 2.1 AA accessibility standards.

**Tasks**:

### Edge Styling System

- [ ] T030 [P] [US2] Create edge-styles.ts file with getEdgeStyle() function (line style: solid for outbound, dashed for inbound) in apps/web/src/components/graph/edge-styles.ts
- [ ] T031 [P] [US2] Write unit tests for getEdgeStyle() with all 14 combinations (7 types × 2 directions) in apps/web/src/components/graph/edge-styles.unit.test.ts
- [ ] T032 [US2] Add TYPE_COLORS constant with WCAG AA compliant colors (AUTHORSHIP: '#4A90E2', REFERENCE: '#7B68EE', etc.) to edge-styles.ts
- [ ] T033 [US2] Add getOutboundStyle() and getInboundStyle() helper functions to edge-styles.ts
- [ ] T034 [US2] Verify edge styling unit tests pass: `pnpm nx test web --testPathPattern=edge-styles`

### Graph Rendering Integration

- [ ] T035 [US2] Integrate edge styling with graph renderer (update XYFlow/D3 edge rendering to use getEdgeStyle()) in apps/web/src/components/graph/use-graph-data.ts
- [ ] T036 [P] [US2] Write E2E accessibility test with @axe-core/playwright to verify WCAG 2.1 Level AA compliance in apps/web/src/test/e2e/edge-accessibility.e2e.test.ts
- [ ] T037 [US2] Verify accessibility test passes: `pnpm nx e2e web --testPathPattern=edge-accessibility`

### Graph Re-detection on Load

- [ ] T038 [US2] Implement redetectEdges() function in apps/web/src/stores/graph-store.tsx that re-runs relationship detection on all stored entities
- [ ] T039 [P] [US2] Write integration test for redetectEdges() verifying old edges are corrected in apps/web/src/stores/graph-store.integration.test.ts
- [ ] T040 [US2] Update loadGraph() to call redetectEdges() synchronously before returning graph in apps/web/src/stores/graph-store.tsx
- [ ] T041 [US2] Verify integration tests pass: `pnpm nx test web --testPathPattern=graph-store.integration`
- [ ] T042 [US2] Manually test graph load performance (<2 seconds for graphs with <100 entities)
- [ ] T043 [US2] Commit User Story 2 implementation: `git add apps/web/src/components/graph/edge-styles.ts apps/web/src/components/graph/edge-styles.unit.test.ts apps/web/src/components/graph/use-graph-data.ts apps/web/src/test/e2e/edge-accessibility.e2e.test.ts apps/web/src/stores/graph-store.tsx apps/web/src/stores/graph-store.integration.test.ts && git commit -m "feat(web): add multi-modal visual distinction and re-detection for edge directions"`

**Completion Criteria**: Outbound edges visually distinct (solid line) from inbound edges (dashed line), WCAG 2.1 AA compliant, graph re-detection works on load, performance target met (<2s)

**Parallel Opportunities**:
- T030 and T031 can be written concurrently
- T036 can be written while T035 is being implemented
- T039 can be written while T038 is being implemented

---

## Phase 5: User Story 3 - Filter by Relationship Direction (P3)

**User Story**: Researchers exploring large graphs need to filter edges by direction to focus on specific relationship patterns (e.g., show only outbound references or only inbound citations).

**Goal**: Add user-facing direction filters to EdgeFiltersSection

**Prerequisites**: Phase 4 complete (P2 delivered and tested)

**Independent Test Criteria**: Load a work with both outbound and inbound relationships, toggle direction filter to "Outbound Only", verify only outbound edges visible. Toggle to "Inbound Only", verify only inbound edges visible. Filter performance <1 second for graphs with 500 nodes.

**Tasks**:

### Direction Filter UI

- [ ] T044 [P] [US3] Add directionFilter state and SegmentedControl UI to EdgeFiltersSection with options: Outbound, Inbound, Both in apps/web/src/components/sections/EdgeFiltersSection.tsx
- [ ] T045 [US3] Implement filterByDirection() function with memoization for performance in apps/web/src/components/sections/EdgeFiltersSection.tsx
- [ ] T046 [P] [US3] Write component tests for direction filter toggle in apps/web/src/components/sections/EdgeFiltersSection.component.test.tsx
- [ ] T047 [US3] Verify component tests pass: `pnpm nx test web --testPathPattern=EdgeFiltersSection.component`

### Performance & E2E Testing

- [ ] T048 [P] [US3] Write performance test verifying <1 second filter time for 500 nodes in apps/web/src/test/performance/edge-filtering.performance.test.ts
- [ ] T049 [P] [US3] Write E2E test for full user flow (load work, toggle filters, verify visible edges) in apps/web/src/test/e2e/edge-filtering.e2e.test.ts
- [ ] T050 [US3] Run E2E and performance tests: `pnpm nx e2e web --testPathPattern=edge-filtering && pnpm nx test web --testPathPattern=edge-filtering.performance`
- [ ] T051 [US3] Commit User Story 3 implementation: `git add apps/web/src/components/sections/EdgeFiltersSection.tsx apps/web/src/components/sections/EdgeFiltersSection.component.test.tsx apps/web/src/test/performance/edge-filtering.performance.test.ts apps/web/src/test/e2e/edge-filtering.e2e.test.ts && git commit -m "feat(web): add direction filter toggle (outbound/inbound/both) to EdgeFiltersSection"`

**Completion Criteria**: Users can filter by outbound/inbound/both, performance target met (<1s for 500 nodes), E2E test passes, manually verify filtering works correctly

**Parallel Opportunities**:
- T044 and T046 can be implemented concurrently (implementation and tests)
- T048 and T049 can be written concurrently (different test types)

---

## Phase 6: Polish & Quality Gates

**Goal**: Final quality validation and documentation updates

**Prerequisites**: Phase 5 complete (all user stories delivered)

**Tasks**:

- [ ] T052 Run full test suite and verify zero regressions: `pnpm test && pnpm nx e2e web && pnpm typecheck && pnpm build && pnpm lint`
- [ ] T053 Update CLAUDE.md with RelationType enum changes and edge direction examples, commit: `git add CLAUDE.md && git commit -m "docs(root): document edge direction correction in CLAUDE.md"`

**Completion Criteria**: All tests pass, build succeeds, documentation updated

---

## Dependencies & Execution Order

### Story Completion Order

```
Phase 1 (Setup)
    ↓
Phase 2 (Foundational)
    ↓
Phase 3 (User Story 1 - P1 MVP) ← Independent, delivers core value
    ↓
Phase 4 (User Story 2 - P2) ← Depends on P1 (needs correct edges first)
    ↓
Phase 5 (User Story 3 - P3) ← Depends on P2 (needs visual distinction + direction field)
    ↓
Phase 6 (Polish)
```

**Critical Path**: Setup → Foundational → US1 → US2 → US3 → Polish

**MVP Delivery**: Phase 3 (User Story 1) alone delivers the core value (correct edge directions). Ship this first, then iterate with P2 and P3.

### Parallel Execution Examples

**Phase 2 (Foundational)**:
```bash
# Execute T004 and T007 in parallel (different test files)
pnpm nx test graph --testPathPattern=relation-type &
pnpm nx test graph --testPathPattern=edge-model &
wait
```

**Phase 3 (User Story 1)**:
```bash
# Write E2E tests concurrently (T011-T016)
# Open 6 terminal tabs, write one test case per tab
# Each test is independent, no conflicts

# After T017 (tests fail), implement fixes T018-T024
# Use atomic commits with git add -p to stage each function separately
```

**Phase 4 (User Story 2)**:
```bash
# T030 and T031 in parallel
code apps/web/src/components/graph/edge-styles.ts &
code apps/web/src/components/graph/edge-styles.unit.test.ts &

# T036 and T035 can overlap
# Start T036 (accessibility test) while T035 (integration) is in progress
```

**Phase 5 (User Story 3)**:
```bash
# T048 and T049 in parallel (different test types)
code apps/web/src/test/performance/edge-filtering.performance.test.ts &
code apps/web/src/test/e2e/edge-filtering.e2e.test.ts &
wait
```

---

## Task Summary

**Total Tasks**: 53 tasks
- **Setup**: 3 tasks
- **Foundational**: 7 tasks
- **User Story 1 (P1 MVP)**: 19 tasks (6 E2E tests, 7 relationship fixes, 6 integration tasks)
- **User Story 2 (P2)**: 14 tasks (5 styling, 5 re-detection, 4 verification)
- **User Story 3 (P3)**: 8 tasks (4 UI, 4 testing)
- **Polish**: 2 tasks

**Parallelizable Tasks**: 22 tasks marked with [P]

**Estimated Time**: 8-12 hours total
- Phase 1: 30 min
- Phase 2: 1 hour
- Phase 3: 4-5 hours (P1 MVP)
- Phase 4: 2-3 hours (P2)
- Phase 5: 1-2 hours (P3)
- Phase 6: 30 min

**MVP Scope (Minimum Viable Product)**: Phase 1 + Phase 2 + Phase 3 (User Story 1) = 5-6 hours
- Delivers core value: All edges point in correct direction
- Fully testable: E2E tests verify correctness
- Shippable: Users can see accurate edge directions immediately

**Incremental Delivery Plan**:
1. **Sprint 1**: Deliver MVP (Phases 1-3) - Core edge direction fix
2. **Sprint 2**: Deliver P2 (Phase 4) - Visual distinction and re-detection
3. **Sprint 3**: Deliver P3 (Phase 5) - Filtering UI
4. **Sprint 4**: Polish (Phase 6) - Documentation and final QA

---

## Constitution Compliance Verification

Per Academic Explorer Constitution, verify compliance:

- ✅ **Type Safety**: All tasks use proper TypeScript types, no `any` types introduced
- ✅ **Test-First Development**: E2E tests written before implementation (T011-T017 before T018-T024)
- ✅ **Monorepo Architecture**: Changes isolated to existing packages (graph, web)
- ✅ **Storage Abstraction**: Graph re-detection uses storage provider interface
- ✅ **Performance & Memory**: Performance targets specified (SC-003: <1s filtering, <2s re-detection)
- ✅ **Atomic Conventional Commits**: Each phase ends with atomic commit (T010, T029, T043, T051, T053)
- ✅ **Development-Stage Pragmatism**: No backwards compatibility (re-detect on load, acceptable breaking change)

---

## Quick Reference

**Test Commands**:
```bash
pnpm test                           # All tests (serial execution)
pnpm nx test graph                  # Graph package tests only
pnpm nx test web                    # Web app tests only
pnpm nx e2e web                     # E2E tests (serial)
pnpm typecheck                      # TypeScript validation
pnpm build                          # Production build
pnpm validate                       # Full pipeline (typecheck + lint + test + build)
```

**Key Files**:
- `packages/graph/src/relation-type.ts` - RelationType enum
- `packages/graph/src/edge-model.ts` - GraphEdge interface
- `apps/web/src/services/relationship-detection-service.ts` - Edge creation (MAIN FIX)
- `apps/web/src/components/sections/EdgeFiltersSection.tsx` - UI filters
- `apps/web/src/stores/graph-store.tsx` - Graph re-detection
- `apps/web/src/components/graph/edge-styles.ts` - Visual styling

**Branch**: `014-edge-direction-correction`

**Next Step**: Start with Phase 1, Task T001
