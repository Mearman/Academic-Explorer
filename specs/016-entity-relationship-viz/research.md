# Research: Entity Relationship Visualization

**Feature**: Entity Relationship Visualization
**Branch**: `016-entity-relationship-viz`
**Date**: 2025-11-18
**Phase**: Phase 0 - Research & Technical Decisions

---

## Summary

All technical decisions for this feature are determined based on existing codebase patterns. No additional research required.

---

## Technical Decisions

### Decision 1: Reuse EdgeFiltersSection Filtering Patterns

**Decision**: Adapt existing `EdgeFiltersSection.tsx` filtering logic for entity detail pages

**Rationale**:
- `EdgeFiltersSection.tsx` already implements `filterByDirection()` function with memoization
- Proven performance (<1ms for filtering operations)
- Consistent UX across graph explorer and entity detail pages
- Direction filter types already defined: `EdgeDirectionFilter = "outbound" | "inbound" | "both"`

**Alternatives Considered**:
- **Build new filtering from scratch**: Rejected because it would duplicate existing, tested logic
- **Use different UI pattern**: Rejected to maintain consistency with graph explorer interface

**Implementation**:
- Extract `filterByDirection()` to shared utility if needed
- Reuse `EdgeDirectionFilter` type from existing component
- Follow same memoization patterns for performance

---

### Decision 2: Component Architecture

**Decision**: Create dedicated relationship components in `apps/web/src/components/relationship/`

**Rationale**:
- Separation of concerns: relationship visualization is distinct from graph rendering
- Reusability across all 7 entity types (works, authors, institutions, sources, publishers, funders, topics)
- Testability: isolated components easier to unit test
- Follows existing component organization patterns in `apps/web/src/components/`

**Alternatives Considered**:
- **Inline relationship display in entity pages**: Rejected due to code duplication across 7 entity types
- **Create package in `packages/ui`**: Deferred until shared across multiple apps; start in `apps/web` first

**Components**:
1. `RelationshipSection.tsx` - Grouped display of single relationship type with count and filter state
2. `RelationshipItem.tsx` - Individual relationship connection (clickable entity link)
3. `RelationshipList.tsx` - Container with pagination ("Load more" at 50 items)
4. `RelationshipCounts.tsx` - Summary count badges (e.g., "Citations (150)")

---

### Decision 3: Data Fetching Strategy

**Decision**: Use existing graph data provider hooks; no new storage operations required

**Rationale**:
- Relationship data already available through `use-graph-data.ts` hook
- Graph package (`@academic-explorer/graph`) provides `GraphEdge` type with `direction` metadata
- No additional API calls needed; relationships loaded when graph is populated
- Adheres to Storage Abstraction principle (Principle IV)

**Alternatives Considered**:
- **Create new API endpoints**: Rejected because relationships already in graph data
- **Direct IndexedDB access**: Rejected due to Storage Abstraction principle violation

**Implementation**:
- Create `use-entity-relationships.ts` hook that wraps `use-graph-data`
- Filter edges by source/target entity ID
- Group by relationship type and direction
- Return paginated, filtered results

---

### Decision 4: Relationship Type Support

**Decision**: Support all relationship types defined in `packages/graph/src/types/core.ts`

**Rationale**:
- Requirement FR-010: System MUST support all relationship types
- Consistent with graph explorer which already uses all types
- Future-proof: new relationship types automatically supported

**Supported Types** (from existing `RelationType` enum):
- `AUTHORSHIP` (Work → Author)
- `REFERENCE` (Work → Cited Work)
- `AFFILIATION` (Author → Institution)
- `FUNDED_BY` (Work → Funder)
- `LINEAGE` (Institution → Parent Institution)
- `HOST_ORGANIZATION` (Source → Publisher)
- `PUBLISHER_CHILD_OF` (Publisher → Parent Publisher)
- `WORK_HAS_KEYWORD` (Work → Keyword/Topic)
- `AUTHOR_RESEARCHES` (Author → Topic)
- `TOPIC_PART_OF_FIELD` (Topic → Field)
- `FIELD_PART_OF_DOMAIN` (Field → Domain)

**Alternatives Considered**:
- **Support subset of types initially**: Rejected because existing graph data includes all types; no additional cost to support all

---

### Decision 5: Pagination Strategy

**Decision**: Client-side pagination with "Load more" button at 50 items per section

**Rationale**:
- Requirement FR-005: Pagination when counts exceed 50 items
- Success Criteria SC-006: Handle 1000 relationships without degradation
- Client-side: All relationship data already loaded with graph; no additional API calls
- "Load more" pattern: Consistent with existing Bibliom UX

**Alternatives Considered**:
- **Virtual scrolling**: Rejected as over-engineering for most entities (< 100 relationships)
- **Server-side pagination**: Rejected because data already client-side
- **Infinite scroll**: Rejected due to accessibility concerns; explicit "Load more" is clearer

**Implementation**:
- Start with 50 items visible
- Show "Load more" button if total count exceeds visible count
- Button adds 50 more items on each click
- Display current count / total count (e.g., "Showing 50 of 150 citations")

---

### Decision 6: Empty States and Error Handling

**Decision**: Use Mantine UI empty state components with retry functionality

**Rationale**:
- Requirement FR-007: Handle entities with zero relationships gracefully
- Requirement FR-013: Display error states with retry options
- Consistent with existing Bibliom error handling patterns
- Mantine UI provides built-in empty state and error components

**Alternatives Considered**:
- **Custom empty state components**: Rejected for consistency with existing app
- **Silent failures**: Rejected due to FR-013 requirement

**Implementation**:
- Empty state: "No incoming relationships found" with helpful icon
- Error state: "Failed to load relationships" with "Retry" button
- Loading state: Mantine `Skeleton` components (don't block main entity info - FR-011)

---

## Best Practices

### React 19 + TanStack Router Patterns

- **Route components**: Use lazy loading for entity detail pages (already done)
- **Hooks**: Custom hooks for data fetching (`use-entity-relationships.ts`)
- **Memoization**: Use `useMemo` for filtered relationship lists (performance SC-005)
- **Error boundaries**: Wrap relationship sections in error boundaries (isolated failures)

### Mantine UI Components

- **Stack/Group**: Layout containers for relationship sections
- **Badge**: Count badges for relationship types
- **Skeleton**: Loading states while fetching data
- **Text**: Entity names and metadata
- **Button**: "Load more" and "Retry" actions
- **SegmentedControl**: Direction filter UI (if adding filter toggle)

### Testing Strategy

Per Constitution Principle II (Test-First Development):
1. Write failing unit tests for `filterByDirection()` logic
2. Write failing component tests for `RelationshipSection` rendering
3. Write failing integration tests for entity page relationship display
4. Write failing E2E tests for user workflows (US1-US4)
5. Implement features to make tests pass

---

## Risks and Mitigations

### Risk 1: Performance with Large Relationship Counts

**Risk**: Entities with 1000+ relationships may cause UI lag

**Mitigation**:
- Memoize filtered relationship lists with `useMemo`
- Implement pagination to limit DOM nodes
- Test with synthetic datasets of 1000+ relationships
- Success Criteria SC-006 defines performance threshold

### Risk 2: Duplicate Edge Detection Logic

**Risk**: Re-implementing direction detection duplicates graph logic

**Mitigation**:
- Use existing `GraphEdge.direction` metadata from graph package
- No need to infer direction; it's already in the data
- Follow spec 014 (edge-direction-correction) implementation

### Risk 3: Entity Type Variations

**Risk**: Different entity types have different relationship patterns

**Mitigation**:
- Design generic `RelationshipSection` component
- Use relationship type metadata for labels and icons
- Test across all 7 entity types during implementation
- Configuration-driven approach (relationship type → label mapping)

---

## Dependencies Verified

✅ `packages/graph/src/types/core.ts` - `GraphEdge` type with `direction: 'outbound' | 'inbound'`
✅ `apps/web/src/components/sections/EdgeFiltersSection.tsx` - `filterByDirection()` function
✅ `apps/web/src/hooks/use-graph-data.ts` - Graph data provider hook
✅ `packages/ui` - Mantine UI component library
✅ Existing entity detail pages in `apps/web/src/routes/`

---

## Next Steps

Proceed to Phase 1: Design & Contracts
- Generate `data-model.md` with entity definitions
- Create API contracts (if any additional endpoints needed - likely N/A)
- Generate `quickstart.md` for developer onboarding
- Update agent context files

---

**Research Complete**: 2025-11-18
**Status**: All technical decisions finalized; no blockers identified
