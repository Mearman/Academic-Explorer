# Implementation Plan: History Catalogue Tracking

**Branch**: `012-history-catalogue-tracking` | **Date**: 2025-11-13 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/012-history-catalogue-tracking/spec.md`

## Summary

Implement a history tracking feature that records visited entities (works, authors, sources, etc.), lists, and views using the existing catalogue storage system. The history will be stored as a special system list with ID `history` (similar to the existing `bookmarks` system list). Users will access their research journey timeline at `/history` route, with automatic deduplication and persistent storage across browser sessions.

## Technical Context

**Language/Version**: TypeScript 5.x (strict mode enabled)
**Primary Dependencies**: React 19, TanStack Router v7, Mantine UI, Zustand + Immer (state management), Dexie (IndexedDB wrapper)
**Storage**: IndexedDB via storage provider interface (DexieStorageProvider for production, InMemoryStorageProvider for tests)
**Testing**: Vitest (unit/integration/component tests), Playwright (E2E tests), MSW (API mocking), fake-indexeddb (storage mocking)
**Target Platform**: Web (Chrome, Firefox, Safari - all modern browsers)
**Project Type**: Monorepo - apps/web (route + UI), packages/utils (storage interface extensions if needed)
**Performance Goals**: History load <2s with 500+ entries, navigation click <100ms response, deduplication logic <50ms per item
**Constraints**: Serial test execution (memory limits), must use storage abstraction layer, no direct IndexedDB/Dexie coupling
**Scale/Scope**: New route component, navigation interceptor, history UI organisms, storage provider integration, ~5-7 new components/hooks

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with Academic Explorer Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ No `any` types planned; history entry types will use discriminated unions for entity/list/view types with proper type guards
2. **Test-First Development**: ✅ Tests written and failing before implementation (unit tests for storage operations, component tests for UI, E2E tests for navigation flow)
3. **Monorepo Architecture**: ✅ Changes use proper Nx workspace structure (apps/web for route/UI, packages/utils if storage interface needs extension)
4. **Storage Abstraction**: ✅ All storage operations use CatalogueStorageProvider interface (no direct Dexie/IndexedDB coupling)
5. **Performance & Memory**: ✅ Tests run serially; virtualization considered for large history lists; deduplication optimized for performance
6. **Atomic Conventional Commits**: ✅ Incremental atomic commits after each task (storage types, history hook, UI components, route, tests)

**Complexity Justification Required?** No - Feature uses existing architecture patterns:
- Special system list pattern already established (bookmarks)
- Storage provider interface already defined
- Route/component structure follows existing patterns
- No new packages, no new abstractions, no architectural changes

**All gates passed** ✅

## Project Structure

### Documentation (this feature)

```text
specs/012-history-catalogue-tracking/
├── spec.md              # Feature specification (completed)
├── plan.md              # This file (in progress)
├── research.md          # Phase 0 output (to be generated)
├── data-model.md        # Phase 1 output (to be generated)
├── quickstart.md        # Phase 1 output (to be generated)
├── contracts/           # Phase 1 output (to be generated, if API contracts needed)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
apps/web/src/
├── routes/
│   └── history.tsx                    # New history route component
├── components/
│   ├── history/                       # New directory for history-specific components
│   │   ├── HistoryList.tsx           # Organism: Main history list component
│   │   ├── HistoryEntry.tsx          # Molecule: Individual history entry
│   │   ├── HistoryItemIcon.tsx       # Atom: Type-specific icons (work/author/list/view)
│   │   └── HistoryEmptyState.tsx     # Molecule: Empty state when no history
│   └── layout/
│       └── MainLayout.tsx            # Modified: Add history link to navigation (if needed)
├── hooks/
│   ├── useHistory.ts                  # New hook: History operations (add, remove, clear, list)
│   └── useHistoryTracking.ts         # New hook: Automatic tracking on navigation
├── stores/
│   └── history-store.ts              # New Zustand store for history state management
└── test/
    ├── unit/
    │   └── history.unit.test.ts      # Unit tests for history logic
    ├── integration/
    │   └── history-storage.integration.test.ts  # Integration tests with storage provider
    ├── component/
    │   └── HistoryList.component.test.tsx       # Component tests for UI
    └── e2e/
        └── history-tracking.e2e.test.ts          # E2E tests for full workflow

packages/utils/src/
├── storage/
│   ├── catalogue-storage-provider.ts  # Modified: Ensure special list support (if needed)
│   └── types.ts                       # Modified: Add history entry types (if needed)
└── type-guards/
    └── history.ts                     # New: Type guards for history entry discrimination
```

**Structure Decision**: Monorepo web application structure. Primary changes in `apps/web` for route, components, hooks, and stores. Minor potential changes to `packages/utils` only if storage provider interface needs extension for history-specific operations. No new packages required - leverages existing storage abstraction pattern.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

N/A - No constitution violations. Feature follows established patterns for special system lists (bookmarks) and storage abstraction.

## Phase 0: Research & Technical Decisions

### Storage Provider Special List Support Research

**Decision**: Use existing CatalogueStorageProvider interface with special list ID `history` (following bookmarks pattern)

**Rationale**:
- CLAUDE.md confirms special system lists already supported: "Special system lists: Bookmarks (ID: `bookmarks`), History (ID: `history`)"
- Storage provider interface already defines operations for lists and entities
- No interface modifications needed - history entries stored as list items with metadata
- initializeSpecialLists() method should already handle history list creation

**Alternatives Considered**:
1. **Create separate HistoryStorageProvider** - Rejected because it violates storage abstraction principle and adds unnecessary complexity
2. **Store history in localStorage instead of IndexedDB** - Rejected because catalogue system provides better query capabilities and consistency
3. **Add history as entity type rather than list** - Rejected because lists provide better organizational structure and existing patterns

**Implementation Details**:
- History entries stored as catalogue list items in the `history` system list
- Each entry contains metadata: { itemType, itemId, itemTitle, timestamp, navigationTarget }
- Deduplication handled by checking existing entries before adding new ones
- System list cannot be renamed or deleted through normal list operations

### Navigation Interception Strategy Research

**Decision**: Use TanStack Router navigation hooks to track route changes automatically

**Rationale**:
- TanStack Router v7 provides navigation lifecycle hooks (onBeforeNavigate, afterLoad)
- Can intercept navigation at route level without modifying every component
- Central point of tracking ensures consistency across all navigation methods
- Works with direct URL access, programmatic navigation, and link clicks

**Alternatives Considered**:
1. **Browser History API interception** - Rejected because TanStack Router already abstracts this
2. **Manual tracking in each component** - Rejected because error-prone and violates DRY
3. **React Router useLocation hook** - N/A, project uses TanStack Router
4. **Middleware pattern at route level** - Considered, but navigation hooks are simpler

**Reference Documentation**:
- TanStack Router navigation: https://tanstack.com/router/v7/docs/framework/react/guide/navigation
- TanStack Router hooks: https://tanstack.com/router/v7/docs/framework/react/api/hooks

### Entity Type Detection Research

**Decision**: Use existing type guard system with discriminated unions for history entry types

**Rationale**:
- Project already uses type guards extensively (`packages/utils/src/type-guards.ts`)
- OpenAlex entity types already defined (Work, Author, Source, Institution, etc.)
- Discriminated unions enable exhaustive type checking at compile time
- Type guards enable runtime validation of history entry types

**Alternatives Considered**:
1. **Runtime type checking with Zod** - Rejected because project already has type guard pattern
2. **Class-based polymorphism** - Rejected because project uses functional TypeScript patterns
3. **String literal union types only** - Rejected because discriminated unions provide better type safety

**Type Structure**:
```typescript
type HistoryEntryType = 'entity' | 'list' | 'view';
type EntityType = 'work' | 'author' | 'source' | 'institution' | 'publisher' | 'funder' | 'topic';

type HistoryEntry =
  | { type: 'entity'; entityType: EntityType; id: string; title: string; timestamp: number; url: string }
  | { type: 'list'; id: string; title: string; timestamp: number; url: string }
  | { type: 'view'; id: string; title: string; timestamp: number; url: string };
```

### Deduplication Strategy Research

**Decision**: Update timestamp on existing entry rather than create duplicate (upsert pattern)

**Rationale**:
- Users expect to see each item once with the most recent access time
- Reduces storage growth (bounded by unique items visited, not total visits)
- Maintains chronological order while eliminating confusion
- Standard pattern for history/recents lists in UX design

**Alternatives Considered**:
1. **Allow duplicates with full visit history** - Rejected because clutters UI and provides limited value
2. **Store visit count metadata** - Considered for future enhancement, not MVP requirement
3. **Separate "frequent" and "recent" lists** - Rejected as out of scope for initial feature

**Implementation Details**:
- Before adding history entry, query for existing entry with same ID
- If exists: Update timestamp and move to top of list
- If not exists: Create new entry
- Deduplication logic in useHistory hook, not at storage provider level

### Performance Optimization Research

**Decision**: Implement virtualized list rendering for history entries beyond 100 items

**Rationale**:
- Success criteria requires <2s load time with 500+ entries
- React virtualization libraries (react-window, @tanstack/react-virtual) handle large lists efficiently
- Mantine UI components compatible with virtualization patterns
- Only renders visible entries + small buffer

**Alternatives Considered**:
1. **Pagination** - Considered but less intuitive for timeline browsing
2. **Infinite scroll** - Considered but virtualization provides better performance
3. **No optimization** - Rejected because 500+ entries would cause performance issues

**Reference Documentation**:
- TanStack Virtual: https://tanstack.com/virtual/v3/docs/framework/react/react-virtual
- React Window: https://react-window.vercel.app/

### History Entry Grouping Research

**Decision**: Group entries by relative time periods (Today, Yesterday, Last 7 Days, Last 30 Days, Older)

**Rationale**:
- User story US-4 specifies date grouping for easy scanning
- Relative time periods more intuitive than absolute dates
- Standard pattern in email clients, file browsers, and activity logs
- Reduces visual clutter while maintaining chronological context

**Alternatives Considered**:
1. **Absolute date headers (2025-11-13)** - Rejected because less human-readable
2. **No grouping** - Rejected because hard to scan long lists
3. **Custom time periods (sessions, weeks)** - Rejected as over-engineered for MVP

**Implementation Details**:
- Grouping logic in HistoryList component
- Use date-fns or similar for relative time calculations
- Headers styled as Mantine Divider with labels

## Phase 1: Design Artifacts

### Data Model

See [data-model.md](./data-model.md) for entity definitions, relationships, and validation rules.

### API Contracts

N/A - Feature uses existing storage provider interface. No new external APIs or endpoints required.

### Implementation Checklist

1. **Type Definitions** (Setup):
   - [ ] Define HistoryEntry discriminated union type
   - [ ] Create type guards for history entry discrimination
   - [ ] Add history entry types to storage provider types (if needed)

2. **Storage Operations** (Test-First):
   - [ ] Unit tests: Add history entry to special list
   - [ ] Unit tests: Get all history entries sorted by timestamp
   - [ ] Unit tests: Remove individual history entry
   - [ ] Unit tests: Clear all history entries
   - [ ] Unit tests: Deduplication (update timestamp on existing entry)
   - [ ] Integration tests: Storage provider operations with fake-indexeddb

3. **History Hook** (Test-First):
   - [ ] Unit tests: useHistory hook operations
   - [ ] Implement useHistory hook with storage provider integration
   - [ ] Component tests: History state management

4. **Navigation Tracking** (Test-First):
   - [ ] Unit tests: useHistoryTracking hook
   - [ ] Implement useHistoryTracking with TanStack Router hooks
   - [ ] Integration tests: Tracking on navigation events

5. **History UI Components** (Test-First):
   - [ ] Component tests: HistoryList renders entries grouped by time
   - [ ] Component tests: HistoryEntry navigation on click
   - [ ] Component tests: HistoryItemIcon displays correct icon per type
   - [ ] Component tests: HistoryEmptyState when no history
   - [ ] Implement all history UI components

6. **History Route** (Test-First):
   - [ ] E2E tests: Navigate to /history route
   - [ ] E2E tests: History displays visited entities
   - [ ] E2E tests: Click history entry navigates to resource
   - [ ] E2E tests: Clear history functionality
   - [ ] E2E tests: Remove individual entry
   - [ ] Implement history route component

7. **Integration** (Validation):
   - [ ] E2E tests: Full workflow (visit entities → view history → navigate from history)
   - [ ] E2E tests: Deduplication (visit same entity multiple times)
   - [ ] E2E tests: Persistence across sessions
   - [ ] E2E tests: History with 500+ entries (performance test)
   - [ ] Manual testing: All user scenarios from spec

8. **Commit Strategy**:
   - Commit 1: `feat(types): add history entry types and type guards`
   - Commit 2: `test(history): add unit tests for history storage operations`
   - Commit 3: `feat(history): implement useHistory hook with storage integration`
   - Commit 4: `test(history): add navigation tracking tests`
   - Commit 5: `feat(history): implement useHistoryTracking hook`
   - Commit 6: `test(history): add component tests for history UI`
   - Commit 7: `feat(history): implement history UI components`
   - Commit 8: `test(history): add E2E tests for history route`
   - Commit 9: `feat(history): implement history route component`
   - Commit 10: `test(history): add E2E tests for full workflow`

### Quickstart Guide

See [quickstart.md](./quickstart.md) for manual testing procedures.

## Phase 2: Task Breakdown

**Note**: Task breakdown will be generated by `/speckit.tasks` command (not part of this planning phase).

The task breakdown will follow this structure:
- Phase 3: Setup (type definitions, test infrastructure)
- Phase 4: Test-First Development (Red phase - storage, hooks, components)
- Phase 5: Implementation (Green phase - make tests pass)
- Phase 6: Validation & Polish (E2E tests, manual testing, documentation)

## Dependencies & Risks

### External Dependencies
- TanStack Router v7 - Navigation hooks for automatic tracking
- Mantine UI - Components for history list UI
- date-fns (or similar) - Relative time formatting for grouping
- @tanstack/react-virtual (optional) - Virtualization for large history lists

### Internal Dependencies
- Storage provider interface (CatalogueStorageProvider)
- Existing special system list pattern (bookmarks)
- Type guard utilities
- Existing route structure and navigation patterns

### Risks

1. **Risk**: TanStack Router navigation hooks might not fire for all navigation types (direct URL, back/forward)
   - **Mitigation**: Test all navigation methods in E2E tests; fallback to browser History API if needed
   - **Severity**: Medium (could result in incomplete history tracking)

2. **Risk**: Deduplication logic might be slow with 500+ entries
   - **Mitigation**: Benchmark deduplication performance; use indexed lookup if needed
   - **Severity**: Low (50ms target should be achievable with proper data structures)

3. **Risk**: History list might grow unbounded and cause storage issues
   - **Mitigation**: Document in edge cases; consider future enhancement for automatic pruning after 90 days
   - **Severity**: Low (unlikely to cause issues in practice; users can manually clear)

4. **Risk**: Storage provider interface might not support all needed operations for history
   - **Mitigation**: Review interface early; extend if needed (minimal changes expected)
   - **Severity**: Low (interface already supports list operations)

5. **Risk**: Type discrimination might be complex for entities vs lists vs views
   - **Mitigation**: Use URL patterns to infer type (e.g., /works/ → entity:work, /lists/ → list)
   - **Severity**: Low (URL patterns are predictable)

## Success Criteria Mapping

| Success Criterion | Verification Method |
|-------------------|---------------------|
| SC-001: History load <2s with 500+ entries | E2E test: Create 500 entries, measure load time |
| SC-002: 100% persistence across sessions | E2E test: Add entries, close browser, reopen, verify entries present |
| SC-003: Single-click navigation <100ms | E2E test: Click entry, measure time to navigation |
| SC-004: Clear visual type indicators | Component test: Verify icon renders per type; Manual testing |
| SC-005: Deduplication works (1 entry per item) | Unit test: Add same item 10 times, verify 1 entry exists |
| SC-006: Clear history <1s | E2E test: Clear 100+ entries, measure time |

## Constitution Re-Check (Post-Design)

All constitution principles remain satisfied after design phase:

1. **Type Safety**: ✅ Discriminated unions for history entry types, type guards for runtime checking, no `any` types
2. **Test-First Development**: ✅ Detailed test checklist in Phase 1, tests written before implementation
3. **Monorepo Architecture**: ✅ Changes in apps/web and packages/utils (if needed), no new packages
4. **Storage Abstraction**: ✅ All operations via CatalogueStorageProvider interface, no direct Dexie/IndexedDB
5. **Performance & Memory**: ✅ Virtualization for large lists, deduplication optimized, <2s load time target
6. **Atomic Conventional Commits**: ✅ 10-commit strategy defined with clear scope per commit

**Final Gate**: ✅ PASSED - Ready for Phase 1 artifacts generation
