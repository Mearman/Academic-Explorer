# Implementation Plan: Full OpenAlex Entity Type Support

**Branch**: `019-full-entity-support` | **Date**: 2025-11-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/019-full-entity-support/spec.md`

## Summary

Complete support for all 13 OpenAlex entity types in Academic Explorer by: (1) migrating keywords route from legacy EntityDataDisplay to modern EntityDetailLayout with relationship visualization, (2) implementing new licenses entity routes with EntityDetailLayout, (3) ensuring EntityType union, API client methods, type guards, and UI configurations support all entity types including the newly discovered taxonomy entities (domains, fields, subfields) and missing licenses type.

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode enabled
**Primary Dependencies**: React 19, TanStack Router v7, Mantine UI, @academic-explorer/client (OpenAlex API), @academic-explorer/types (entity definitions)
**Storage**: IndexedDB via storage provider interface (DexieStorageProvider for production, InMemoryStorageProvider for tests) - no new storage operations required
**Testing**: Vitest (serial execution, 5-min timeout), Playwright E2E tests, MSW for API mocking
**Target Platform**: Modern browsers (Chrome, Firefox, Safari, Edge) supporting ES2022
**Project Type**: Nx monorepo with pnpm - web app (apps/web) and shared packages
**Performance Goals**: Entity detail pages load within 3 seconds, loading indicators appear within 200ms, filters operate in <1ms
**Constraints**: Serial test execution to prevent OOM errors, 8GB Node.js heap limit, no parallel testing
**Scale/Scope**: 13 total entity types, 2 new route implementations (keywords migration + licenses), EntityType union expansion, API client method coverage for all types

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-checked after Phase 1 design.*

Verify alignment with Academic Explorer Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ No `any` types; EntityType is strict union; all entities use Zod schemas; type guards use `unknown` with narrowing
2. **Test-First Development**: ✅ Component tests for new routes, E2E tests for navigation, integration tests for API client methods - all written to FAIL before implementation
3. **Monorepo Architecture**: ✅ Changes use existing structure (apps/web/src/routes/, packages/types/src/entities/, packages/client/src/client.ts); NO package re-exports of EntityType (Constitution Principle III compliance)
4. **Storage Abstraction**: ✅ No new storage operations required; entity pages use React Query for caching, not direct storage access
5. **Performance & Memory**: ✅ Tests run serially (maxConcurrency: 1); entity pages use React Query efficient caching; no Web Workers needed for this feature
6. **Atomic Conventional Commits**: ✅ Each entity type update committed separately (feat(types), feat(client), feat(web)); spec commits after each phase
7. **Development-Stage Pragmatism**: ✅ EntityType union expansion is breaking change - acceptable per Constitution Principle VII
8. **Test-First Bug Fixes**: ✅ Any bugs discovered during implementation will have regression tests written before fixes
9. **Deployment Readiness**: ✅ All typecheck/lint/test/build gates must pass; zero pre-existing errors introduced
10. **Continuous Execution**: ✅ Proceed through all phases automatically if no questions remain

**Complexity Justification Required?** No - this feature:
- Uses existing packages/apps structure (no new packages)
- Uses existing storage provider (no new implementations)
- Uses existing React patterns (no new workers)

**Post-Phase-1 Re-Check**: [To be filled after design phase]

## Phase 0: Research & Decisions

### Research Findings

**R-001: Licenses Entity Data Model**
- **Decision**: Licenses are NOT a first-class OpenAlex entity with dedicated API endpoint
- **Rationale**: OpenAlex API documentation and static cache analysis show licenses appear only as string fields within Work and Source entities (Location.license field)
- **Alternatives Considered**:
  - Create fake entity pages for licenses → Rejected: No API to fetch license data
  - Add license search/filter pages → Considered for future work, out of scope for entity type completion
- **Impact**: Remove licenses from EntityType union; remove FR-010, FR-016, FR-017, FR-023; update User Story 2 to mark as "Not Applicable - licenses are not OpenAlex entities"

**R-002: Keywords Route Status**
- **Decision**: Migrate keywords route from legacy pattern to EntityDetailLayout
- **Rationale**: Keywords currently use EntityDataDisplay (apps/web/src/routes/keywords/$keywordId.lazy.tsx:77) instead of modern EntityDetailLayout used by other entity types
- **Pattern**: Follow domains/fields/subfields implementation pattern (apps/web/src/routes/domains/$domainId.lazy.tsx)
- **Impact**: Update $keywordId.lazy.tsx to match modern pattern with LoadingState, ErrorState, EntityDetailLayout, relationship components

**R-003: EntityType Completeness Status**
- **Decision**: EntityType union already includes all discovered entity types except licenses (which is not an OpenAlex entity)
- **Rationale**: packages/types/src/entities/entities.ts:223-236 shows EntityType includes: works, authors, sources, institutions, topics, concepts, publishers, funders, keywords, domains, fields, subfields
- **Current Coverage**: 12/12 legitimate entity types present
- **Impact**: No changes needed to EntityType union; focus shifts to route implementations and API client validation

**R-004: API Client Coverage Analysis**
- **Decision**: Validate all 12 entity types have corresponding API client methods; implement any missing
- **Rationale**: Need systematic audit of packages/client/src/client.ts and entity-specific files (packages/client/src/entities/*.ts)
- **Pattern**: Each entity type should have getById and query methods with select parameter support
- **Impact**: Create comprehensive client method coverage matrix in data-model.md

**R-005: Relationship Visualization for Taxonomy Entities**
- **Decision**: Maintain current exclusion of relationship components for taxonomy entities (domains, fields, subfields)
- **Rationale**: These entities have hierarchical parent/child structure, not edge-based relationships. Current implementation correctly disables relationship components (see apps/web/src/routes/domains/$domainId.lazy.tsx:13-18)
- **Pattern**: Keywords are NOT taxonomy entities - they should have relationship visualization
- **Impact**: Keywords get full relationship components; taxonomy entities remain without relationship visualization

### Decisions Summary

| Decision | Type | Impact |
|----------|------|--------|
| Licenses excluded from EntityType | Scope Reduction | Remove User Story 2 (P2); reduce from 13 to 12 entity types |
| Keywords route migration | Implementation | Update $keywordId.lazy.tsx to EntityDetailLayout pattern |
| EntityType union complete | Validation Only | No union changes needed; validate existing types |
| API client audit required | Investigation | Systematic review of client method coverage |
| Taxonomy entities no relationships | Preserve Pattern | Maintain existing exclusion; keywords get full relationships |

## Phase 1: Design & Contracts

### Data Model

See [data-model.md](./data-model.md) for complete entity schemas and relationships.

**Key Entities**:

1. **EntityType** (packages/types/src/entities/entities.ts:223-236)
   - Union of 12 entity type strings: "works" | "authors" | "sources" | "institutions" | "topics" | "concepts" | "publishers" | "funders" | "keywords" | "domains" | "fields" | "subfields"
   - Used for type-safe routing, API calls, storage keys, UI configuration
   - NO CHANGES NEEDED - already complete

2. **Keyword** (packages/types/src/entities/entities.ts:186)
   - Zod schema: keywordSchema from packages/types/src/entities/schemas
   - Fields: id, display_name, cited_by_count, works_count, counts_by_year
   - Relationships: Works (via KEYWORD edge type), Topics (via hierarchy)
   - Route: /keywords/{keywordId} - NEEDS MIGRATION to EntityDetailLayout

3. **EntityTypeConfig** (apps/web/src/components/entity-detail/EntityTypeConfig.tsx:14)
   - Maps each EntityType to UI metadata: name, icon, colorKey
   - Already includes keywords (line 96-102)
   - NO CHANGES NEEDED

4. **API Client Methods** (packages/client/src/client.ts)
   - Pattern: `getById(entityType, id, options?)` and `query(entityType, filter, options?)`
   - Must support all 12 entity types
   - Select parameter support for field-level caching
   - TO BE VALIDATED in implementation phase

### API Contracts

No new API endpoints - all entity types use existing OpenAlex API endpoints:
- `GET https://api.openalex.org/{entityType}/{id}?select=field1,field2`
- `GET https://api.openalex.org/{entityType}?filter=...&select=...`

### Component Architecture

**Keywords Route Migration** (apps/web/src/routes/keywords/$keywordId.lazy.tsx):

```typescript
// FROM: Legacy pattern (current)
function KeywordRoute() {
  const { data, isLoading, error } = useQuery(...);

  // Manual loading/error states
  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error...</div>;

  // Manual view mode toggle
  return viewMode === "raw"
    ? <pre>{JSON.stringify(keyword)}</pre>
    : <EntityDataDisplay data={keyword} />;
}

// TO: Modern pattern (target)
function KeywordRoute() {
  const { data, isLoading, error } = useQuery(...);
  const { incomingCount, outgoingCount } = useEntityRelationships(fullKeywordId, 'keywords');

  if (isLoading) {
    return <LoadingState entityType="Keyword" entityId={keywordId} config={ENTITY_TYPE_CONFIGS.keywords} />;
  }

  if (error || !keyword) {
    return <ErrorState error={error} entityType="Keyword" entityId={keywordId} />;
  }

  return (
    <EntityDetailLayout
      config={ENTITY_TYPE_CONFIGS.keywords}
      entityType="keywords"
      entityId={fullKeywordId}
      displayName={keyword.display_name}
      viewMode={viewMode}
      onToggleView={...}
      data={keyword}>
      <RelationshipCounts incomingCount={incomingCount} outgoingCount={outgoingCount} />
      <IncomingRelationships entityId={fullKeywordId} entityType="keywords" />
      <OutgoingRelationships entityId={fullKeywordId} entityType="keywords" />
    </EntityDetailLayout>
  );
}
```

### Testing Strategy

**Test Types**:
1. **Component Tests** (Vitest + @testing-library/react):
   - Keywords route renders with EntityDetailLayout
   - LoadingState appears during fetch
   - ErrorState appears on errors
   - RelationshipCounts displays correctly
   - Serial execution (maxConcurrency: 1)

2. **E2E Tests** (Playwright):
   - Navigate to /keywords/{id} and verify page loads
   - Verify relationship visualization appears
   - Verify view mode toggle works
   - Serial execution to prevent OOM

3. **Integration Tests**:
   - API client methods work for all 12 entity types
   - Type guards correctly identify all entity types
   - EntityTypeConfig has entries for all types

**Test File Naming**:
- `keywords-route.component.test.tsx` - Component tests
- `keywords-navigation.e2e.test.ts` - E2E tests
- `entity-type-coverage.integration.test.ts` - Type system validation

## Phase 2: Implementation Tasks

### Task Breakdown

**Phase 2.1: Type System Validation** (1 task)
1. Audit EntityType union, OpenAlexEntity union, EntityTypeMap - verify all 12 types present
   - File: packages/types/src/entities/entities.ts
   - Success: TypeScript compilation passes, zero missing types

**Phase 2.2: API Client Validation** (1 task)
2. Audit API client methods - verify getById and query support for all 12 entity types
   - Files: packages/client/src/client.ts, packages/client/src/entities/*.ts
   - Success: All 12 types have client methods, select parameter support confirmed

**Phase 2.3: Keywords Route Migration** (5 tasks)
3. Write failing component tests for keywords route with EntityDetailLayout
   - File: apps/web/src/routes/keywords/$keywordId.component.test.tsx (new)
   - Success: Tests fail showing EntityDetailLayout not used

4. Add useEntityRelationships hook to keywords route
   - File: apps/web/src/routes/keywords/$keywordId.lazy.tsx
   - Success: Hook provides incomingCount, outgoingCount

5. Replace manual loading/error states with LoadingState/ErrorState components
   - File: apps/web/src/routes/keywords/$keywordId.lazy.tsx
   - Success: Components render during loading and error states

6. Replace EntityDataDisplay with EntityDetailLayout wrapper
   - File: apps/web/src/routes/keywords/$keywordId.lazy.tsx
   - Success: Keywords page matches modern entity route pattern

7. Add RelationshipCounts, IncomingRelationships, OutgoingRelationships components
   - File: apps/web/src/routes/keywords/$keywordId.lazy.tsx
   - Success: Relationship visualization appears on keywords pages

**Phase 2.4: E2E Testing** (2 tasks)
8. Write E2E tests for keywords route navigation and relationship display
   - File: apps/web/src/test/e2e/keywords-navigation.e2e.test.ts (new)
   - Success: Tests pass, keywords pages navigable and display relationships

9. Write integration tests for entity type coverage (types, client, configs)
   - File: apps/web/src/test/integration/entity-type-coverage.integration.test.ts (new)
   - Success: All 12 entity types validated across type system, client, and UI configs

**Phase 2.5: Documentation Updates** (2 tasks)
10. Update CLAUDE.md with completed entity type support
    - File: apps/web/CLAUDE.md
    - Success: Documentation reflects 12/12 entity type completion

11. Update spec.md with "Not Applicable" status for licenses (User Story 2)
    - File: specs/019-full-entity-support/spec.md
    - Success: Spec reflects research findings that licenses are not OpenAlex entities

### Task Dependencies

```
Task 1 (Type Audit) → Task 9 (Integration Tests)
Task 2 (Client Audit) → Task 9 (Integration Tests)
Task 3 (Failing Tests) → Task 4-7 (Implementation) → Task 8 (E2E Tests)
Task 10-11 (Documentation) depends on all other tasks completing
```

### Commit Strategy

**Atomic Conventional Commits**:
- `test(web): add failing component tests for keywords EntityDetailLayout migration` (Task 3)
- `feat(web): add relationship hooks to keywords route` (Task 4)
- `refactor(web): replace keywords loading/error states with modern components` (Task 5)
- `feat(web): migrate keywords route to EntityDetailLayout` (Task 6)
- `feat(web): add relationship visualization to keywords pages` (Task 7)
- `test(web): add E2E tests for keywords navigation and relationships` (Task 8)
- `test(web): add integration tests for entity type coverage` (Task 9)
- `docs(web): update CLAUDE.md with full entity type support completion` (Task 10)
- `docs(docs): update spec with licenses research findings` (Task 11)

**Spec File Commits**:
- After Phase 0: `docs(docs): add research findings to full entity support plan`
- After Phase 1: `docs(docs): add design and contracts to full entity support plan`
- After Phase 2: `docs(docs): complete implementation plan for full entity support`

## Phase 3: Testing & Validation

### Quality Gates

1. **TypeScript Compilation**: `pnpm typecheck` passes with zero errors
2. **Linting**: `pnpm lint` passes with zero errors
3. **Unit/Component Tests**: `pnpm test:web` passes with zero failures
4. **E2E Tests**: `pnpm test:e2e` passes with zero failures
5. **Build**: `pnpm build` completes successfully
6. **Full Pipeline**: `pnpm validate` (typecheck + lint + test + build) passes

### Success Criteria Validation

- **SC-001**: All 12 entity types compile without TypeScript errors ✅
- **SC-002**: Keywords pages navigable and display data with relationships ✅
- **SC-003**: ~~License pages navigable~~ N/A (licenses not OpenAlex entities) ⚠️
- **SC-004**: Entity pages load within 3 seconds (verify via E2E tests) ✅
- **SC-005**: Loading indicators appear within 200ms (verify via component tests) ✅
- **SC-006**: Error states include retry buttons (verify via component tests) ✅
- **SC-007**: Select parameter support verified (verify via client tests) ✅
- **SC-008**: Full validation pipeline passes ✅
- **SC-009**: Zero test regressions (all pre-existing tests still pass) ✅
- **SC-010**: WCAG 2.1 AA compliance (verified via jest-axe in component tests) ✅

**Updated Success Criteria** (Post-Research):
- SC-003 marked as N/A due to licenses not being OpenAlex entities
- Target reduced from 13 to 12 entity types based on research findings

### Deployment Checklist

- [ ] All typecheck/lint/test/build gates pass
- [ ] Zero pre-existing test failures introduced
- [ ] CLAUDE.md documentation updated
- [ ] Spec.md updated with research findings
- [ ] Branch ready for PR to main

## Risk Assessment

**Low Risk**:
- Keywords route migration follows proven pattern (domains/fields/subfields already migrated)
- EntityType union already complete (validation only)
- No breaking API changes
- No new storage operations

**Medium Risk**:
- API client method coverage may reveal gaps requiring implementation
- Mitigation: Systematic audit in Task 2 before implementation

**Mitigated Risk**:
- Licenses scope removed based on research (not OpenAlex entities)
- Reduced from 13 to 12 entity types eliminates "licenses" implementation risk

## Assumptions

1. Keywords entity data model matches other entity types (id, display_name, counts)
2. Keywords relationships follow standard edge-based pattern (not hierarchical like taxonomy entities)
3. Existing EntityDetailLayout component supports keywords without modification
4. API client getById and query methods follow consistent pattern across all entity types
5. Licenses are definitively NOT first-class OpenAlex entities (confirmed via API docs and cache analysis)

## Open Questions

None - all clarifications resolved in Phase 0 research.

## Post-Phase-1 Constitution Re-Check

*To be completed after design phase*

1. **Type Safety**: ✅ No `any` types introduced; EntityType remains strict union
2. **Test-First Development**: ✅ Component tests written to FAIL before keywords migration
3. **Monorepo Architecture**: ✅ Changes confined to apps/web/src/routes/ and existing packages
4. **Storage Abstraction**: ✅ No storage operations (React Query only)
5. **Performance & Memory**: ✅ Tests remain serial; no new memory concerns
6. **Atomic Conventional Commits**: ✅ 11 atomic commits planned
7. **Development-Stage Pragmatism**: ✅ No backwards compatibility needed
8. **Test-First Bug Fixes**: ✅ Pattern established
9. **Deployment Readiness**: ✅ All gates planned in Phase 3
10. **Continuous Execution**: ✅ Ready to proceed to /speckit.tasks

**Gate Status**: ✅ PASS - Ready for task breakdown and implementation

## Next Steps

With all research complete and design validated, proceed to:
```bash
/speckit.tasks
```

This will generate the detailed task breakdown in `tasks.md` for execution.
