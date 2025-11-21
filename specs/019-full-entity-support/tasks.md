# Implementation Tasks: Full OpenAlex Entity Type Support

**Branch**: `019-full-entity-support`
**Spec**: [spec.md](./spec.md) | **Plan**: [plan.md](./plan.md)
**Created**: 2025-11-21

## Overview

Complete support for all 12 OpenAlex entity types (licenses excluded per research findings) by migrating keywords route to EntityDetailLayout and validating type system/API client completeness.

**Total Tasks**: 11
**User Stories**: 2 (US2 marked N/A - licenses not OpenAlex entities)
- US1 (P1): Keywords route migration - 5 tasks
- US3 (P1): Type system validation - 2 tasks
- Testing & Documentation - 4 tasks

## Task List

### Phase 1: Foundational Tasks

**Goal**: Validate existing type system and API client coverage before implementing user-facing changes.

**Independent Test**: TypeScript compilation succeeds, all 12 entity types verified in union/client/configs.

#### Tasks

- [x] T001 [P] [US3] Audit EntityType union in packages/types/src/entities/entities.ts for all 12 types
- [x] T002 [P] [US3] Audit API client methods in packages/client/src/client.ts and packages/client/src/entities/ for all 12 entity types

**Acceptance**:
- T001: TypeScript compiles, EntityType union includes: works, authors, sources, institutions, topics, concepts, publishers, funders, keywords, domains, fields, subfields (12 total, licenses excluded)
- T002: All 12 entity types have getById and query methods with select parameter support

---

### Phase 2: Keywords Route Migration (User Story 1 - P1)

**Goal**: Migrate keywords route from legacy EntityDataDisplay to modern EntityDetailLayout with relationship visualization.

**Independent Test**: Navigate to `/keywords/{id}` and verify EntityDetailLayout renders with LoadingState, ErrorState, RelationshipCounts, and relationship components.

#### Tasks

- [x] T003 [US1] Write failing component tests in apps/web/src/routes/keywords/$keywordId.component.test.tsx
- [x] T004 [US1] Add useEntityRelationships hook to apps/web/src/routes/keywords/$keywordId.lazy.tsx
- [x] T005 [US1] Replace manual loading/error states with LoadingState/ErrorState in apps/web/src/routes/keywords/$keywordId.lazy.tsx
- [x] T006 [US1] Replace EntityDataDisplay with EntityDetailLayout wrapper in apps/web/src/routes/keywords/$keywordId.lazy.tsx
- [x] T007 [US1] Add RelationshipCounts, IncomingRelationships, OutgoingRelationships to apps/web/src/routes/keywords/$keywordId.lazy.tsx

**Acceptance**:
- T003: Component tests exist and FAIL showing EntityDetailLayout not used
- T004: useEntityRelationships hook provides incomingCount and outgoingCount
- T005: LoadingState appears during fetch, ErrorState appears on errors
- T006: Keywords page uses EntityDetailLayout (matches pattern in apps/web/src/routes/domains/$domainId.lazy.tsx)
- T007: Relationship visualization displays with counts, incoming/outgoing sections, and type filtering

**Dependencies**: T003 must complete before T004-T007 (TDD: fail first, then implement)

---

### Phase 3: Testing & Validation

**Goal**: Verify keywords route migration and entity type coverage with E2E and integration tests.

**Independent Test**: All tests pass, documentation updated, full validation pipeline succeeds.

#### Tasks

- [x] T008 [P] [US1] Write E2E tests in apps/web/src/test/e2e/keywords-navigation.e2e.test.ts for navigation and relationship display
- [x] T009 [P] [US3] Write integration tests in apps/web/src/test/integration/entity-type-coverage.integration.test.ts for type/client/config validation
- [ ] T010 [P] Update apps/web/CLAUDE.md to document 12/12 entity type completion
- [ ] T011 [P] Update specs/019-full-entity-support/spec.md to mark User Story 2 as "Not Applicable - licenses not OpenAlex entities"

**Acceptance**:
- T008: E2E tests pass - keywords pages navigable, relationships display, view mode toggle works
- T009: Integration tests pass - all 12 entity types validated in EntityType union, API client methods, ENTITY_TYPE_CONFIGS
- T010: CLAUDE.md reflects completion of entity type support (keywords migration complete)
- T011: Spec.md updated with research finding that licenses are not OpenAlex entities

**Dependencies**:
- T008 depends on T003-T007 completing (tests keywords route migration)
- T009 depends on T001-T002 completing (validates foundational audits)
- T010-T011 depend on all other tasks completing

---

## Dependencies

### User Story Completion Order

1. **Foundational (US3)**: T001-T002 - Type system and client validation (can run in parallel)
2. **Keywords Migration (US1)**: T003 (fail tests) → T004-T007 (implementation in sequence)
3. **Testing**: T008-T009 (can run in parallel after their dependencies)
4. **Documentation**: T010-T011 (can run in parallel after all implementation complete)

### Task Dependency Graph

```
T001 [P] ──────────────────────┐
                                ├─→ T009 [P]
T002 [P] ──────────────────────┘

T003 ─→ T004 ─→ T005 ─→ T006 ─→ T007 ─→ T008 [P]

T001-T009 ────────────────────────────────────→ T010 [P]
                                                 T011 [P]
```

### Parallel Execution Opportunities

**Phase 1 (Foundational)**:
- T001 and T002 can run in parallel (different files, no dependencies)

**Phase 3 (Testing)**:
- T008 and T009 can run in parallel (after their respective dependencies complete)
- T010 and T011 can run in parallel (after all implementation complete)

**Total Parallel Groups**: 3 opportunities (Phase 1, Phase 3 Testing, Phase 3 Docs)

---

## Implementation Strategy

### MVP Scope (User Story 1 Only)

For rapid delivery, implement **only User Story 1 (Keywords Route Migration)** as MVP:
- Tasks: T003-T008 (6 tasks)
- Deliverable: Keywords pages use modern EntityDetailLayout with relationship visualization
- Test: Navigate to `/keywords/artificial-intelligence` and verify modern UI

**Post-MVP**: Add foundational validation (T001-T002, T009) and documentation (T010-T011)

### Incremental Delivery

Each user story delivers independently testable value:

1. **US1 Complete** (T003-T008): Keywords route modernized
   - Test: Keywords pages match domains/fields/subfields pattern
   - Value: Consistent UX across all entity types

2. **US3 Complete** (T001-T002, T009): Type system validated
   - Test: TypeScript compiles, all 12 types verified
   - Value: Confidence in type coverage, no missing entities

3. **Documentation Complete** (T010-T011): Changes documented
   - Test: CLAUDE.md and spec.md reflect current state
   - Value: Future developers understand entity type coverage

### Test-First Approach

Following Constitution Principle II (Test-First Development):

- **T003**: Write failing tests FIRST before implementation
- **Verify failure**: Confirm tests fail showing EntityDetailLayout not used
- **T004-T007**: Implement changes to make tests pass
- **T008**: E2E tests verify complete integration
- **T009**: Integration tests validate cross-cutting concerns

---

## Commit Strategy

### Atomic Conventional Commits

Each task gets a separate commit following conventional commit format:

- `test(web): add failing component tests for keywords EntityDetailLayout migration` (T003)
- `feat(web): add relationship hooks to keywords route` (T004)
- `refactor(web): replace keywords loading/error states with modern components` (T005)
- `feat(web): migrate keywords route to EntityDetailLayout` (T006)
- `feat(web): add relationship visualization to keywords pages` (T007)
- `test(web): add E2E tests for keywords navigation and relationships` (T008)
- `test(web): add integration tests for entity type coverage` (T009)
- `docs(web): update CLAUDE.md with full entity type support completion` (T010)
- `docs(docs): update spec with licenses research findings` (T011)

### Spec File Commits

After task completion:
- `docs(docs): mark full entity support implementation complete in tasks.md`

---

## Quality Gates

Before marking feature complete, verify all gates pass:

1. **TypeScript Compilation**: `pnpm typecheck` - zero errors
2. **Linting**: `pnpm lint` - zero errors
3. **Unit/Component Tests**: `pnpm test:web` - zero failures
4. **E2E Tests**: `pnpm test:e2e` - zero failures
5. **Build**: `pnpm build` - completes successfully
6. **Full Pipeline**: `pnpm validate` - all gates pass

### Success Criteria Validation

- ✅ **SC-001**: All 12 entity types compile without TypeScript errors (T001)
- ✅ **SC-002**: Keywords pages navigable and display data with relationships (T003-T008)
- ⚠️ **SC-003**: License pages - N/A (licenses not OpenAlex entities per research)
- ✅ **SC-004**: Entity pages load within 3 seconds (T008 E2E validation)
- ✅ **SC-005**: Loading indicators appear within 200ms (T003 component tests)
- ✅ **SC-006**: Error states include retry buttons (T005 implementation)
- ✅ **SC-007**: Select parameter support verified (T002 client audit)
- ✅ **SC-008**: Full validation pipeline passes (quality gates)
- ✅ **SC-009**: Zero test regressions (all tests serial, maxConcurrency: 1)
- ✅ **SC-010**: WCAG 2.1 AA compliance (T003 component tests with jest-axe)

---

## Notes

### Research Findings Impact

**Licenses Excluded**: User Story 2 (P2: Licenses Entity Pages) marked as "Not Applicable" based on Phase 0 research finding that licenses are NOT first-class OpenAlex entities. They appear only as string fields within Work/Source entities.

**Scope Change**: Originally planned for 13 entity types, reduced to 12 after research. This simplifies implementation and removes unnecessary work.

### Taxonomy Entities

Domains, fields, and subfields correctly exclude relationship components (per apps/web/src/routes/domains/$domainId.lazy.tsx:13-18) because they use hierarchical parent/child structure, not edge-based relationships. Keywords are NOT taxonomy entities and should have full relationship visualization.

### File Patterns

**Component Tests**: `*.component.test.tsx` (Vitest + @testing-library/react)
**E2E Tests**: `*.e2e.test.ts` (Playwright)
**Integration Tests**: `*.integration.test.ts` (cross-package validation)

All tests run serially (maxConcurrency: 1) to prevent OOM errors per Constitution Principle V.
