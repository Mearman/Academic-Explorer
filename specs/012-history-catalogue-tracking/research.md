# Research & Technical Decisions: History Catalogue Tracking

**Feature**: 012-history-catalogue-tracking
**Date**: 2025-11-13
**Status**: Completed

## Purpose

This document consolidates all technical research and decisions made during Phase 0 planning. Each decision includes rationale, alternatives considered, and implementation details.

## Research Topics

### 1. Storage Provider Special List Support

**Context**: Need to store history entries persistently using the existing catalogue storage system.

**Decision**: Use existing CatalogueStorageProvider interface with special list ID `history`

**Rationale**:
- CLAUDE.md documentation confirms special system lists already supported
- Pattern already established with bookmarks system list (ID: `bookmarks`)
- Storage provider interface already defines all needed operations for lists and entities
- No interface modifications required - history entries stored as list items with metadata
- initializeSpecialLists() method should already handle history list creation automatically

**Alternatives Considered**:

1. **Create separate HistoryStorageProvider**
   - Rejected: Violates storage abstraction principle
   - Rejected: Adds unnecessary complexity and duplication
   - Rejected: Would require parallel maintenance of two storage implementations

2. **Store history in localStorage instead of IndexedDB**
   - Rejected: Catalogue system provides better query capabilities
   - Rejected: Would create data inconsistency between storage systems
   - Rejected: Limited storage capacity compared to IndexedDB

3. **Add history as entity type rather than list**
   - Rejected: Lists provide better organizational structure
   - Rejected: Deviates from established special list pattern
   - Rejected: Would require storage interface modifications

**Implementation Details**:
- History entries stored as catalogue list items in `history` system list
- Each entry contains metadata: `{ itemType, itemId, itemTitle, timestamp, navigationTarget }`
- Deduplication handled at application layer (useHistory hook)
- System list protected from rename/delete operations through normal list UI
- Special list initialized on first access if not present

**References**:
- `packages/utils/src/storage/catalogue-storage-provider.ts` - Storage interface definition
- Academic Explorer CLAUDE.md - Documentation of special system lists

---

### 2. Navigation Interception Strategy

**Context**: Need to automatically track visited entities, lists, and views without manual tracking in every component.

**Decision**: Use TanStack Router navigation hooks to track route changes automatically

**Rationale**:
- TanStack Router v7 provides lifecycle hooks (onBeforeNavigate, afterLoad, etc.)
- Can intercept navigation at route level without modifying individual components
- Central tracking point ensures consistency across all navigation methods
- Works for direct URL access, programmatic navigation, and link clicks
- Router context provides route metadata needed for type discrimination

**Alternatives Considered**:

1. **Browser History API interception**
   - Rejected: TanStack Router already abstracts browser history
   - Rejected: Would bypass router's internal state management
   - Rejected: Lower-level than needed for this use case

2. **Manual tracking in each component**
   - Rejected: Error-prone and violates DRY principle
   - Rejected: High maintenance burden across codebase
   - Rejected: Easy to miss tracking in new components

3. **React Router useLocation hook**
   - N/A: Project uses TanStack Router, not React Router

4. **Middleware pattern at route level**
   - Considered: Valid approach but more complex
   - Rejected: Navigation hooks provide simpler API for this use case

**Implementation Details**:
- Create useHistoryTracking hook that uses router navigation events
- Hook installed at root layout level to track all navigation
- Extract route parameters and metadata from router context
- Map route patterns to entity types (e.g., `/works/:id` → entity:work)
- Call useHistory hook to add entry on successful navigation

**References**:
- TanStack Router Navigation: https://tanstack.com/router/v7/docs/framework/react/guide/navigation
- TanStack Router Hooks API: https://tanstack.com/router/v7/docs/framework/react/api/hooks

---

### 3. Entity Type Detection

**Context**: Need to distinguish between entity types (work, author, etc.), lists, and views in history entries.

**Decision**: Use discriminated unions with type guards for history entry types

**Rationale**:
- Project already uses type guards extensively (`packages/utils/src/type-guards.ts`)
- OpenAlex entity types already defined in existing codebase
- Discriminated unions enable exhaustive type checking at compile time
- Type guards enable runtime validation with type narrowing
- Pattern consistent with existing codebase architecture

**Alternatives Considered**:

1. **Runtime type checking with Zod**
   - Rejected: Project already has established type guard pattern
   - Rejected: Adds dependency when pattern already exists
   - Rejected: Zod validation overhead not needed for internal types

2. **Class-based polymorphism**
   - Rejected: Project uses functional TypeScript patterns throughout
   - Rejected: Adds OOP complexity to functional codebase
   - Rejected: Less compatible with React hooks architecture

3. **String literal union types only**
   - Rejected: Discriminated unions provide better type safety
   - Rejected: Loses compile-time exhaustiveness checking
   - Rejected: More error-prone than discriminated unions

**Type Structure**:
```typescript
// History entry type discriminator
type HistoryEntryType = 'entity' | 'list' | 'view';

// Entity type for OpenAlex entities
type EntityType = 'work' | 'author' | 'source' | 'institution' | 'publisher' | 'funder' | 'topic';

// Discriminated union for history entries
type HistoryEntry =
  | {
      type: 'entity';
      entityType: EntityType;
      id: string;
      title: string;
      timestamp: number;
      url: string;
    }
  | {
      type: 'list';
      id: string;
      title: string;
      timestamp: number;
      url: string;
    }
  | {
      type: 'view';
      id: string;
      title: string;
      timestamp: number;
      url: string;
    };

// Type guards
function isEntityHistoryEntry(entry: HistoryEntry): entry is HistoryEntry & { type: 'entity' } {
  return entry.type === 'entity';
}

function isListHistoryEntry(entry: HistoryEntry): entry is HistoryEntry & { type: 'list' } {
  return entry.type === 'list';
}

function isViewHistoryEntry(entry: HistoryEntry): entry is HistoryEntry & { type: 'view' } {
  return entry.type === 'view';
}
```

**Implementation Details**:
- Define types in `packages/utils/src/storage/types.ts` or new history types file
- Create type guards in `packages/utils/src/type-guards/history.ts`
- Use URL patterns to infer type during navigation tracking
- Store type discriminator in history entry metadata

**References**:
- TypeScript Discriminated Unions: https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions
- Existing type guards: `packages/utils/src/type-guards.ts`

---

### 4. Deduplication Strategy

**Context**: Users visiting the same item multiple times should see one entry with the most recent timestamp, not duplicates.

**Decision**: Update timestamp on existing entry rather than create duplicate (upsert pattern)

**Rationale**:
- Users expect to see each item once with most recent access time
- Reduces storage growth (bounded by unique items visited, not total visits)
- Maintains chronological order without clutter
- Standard UX pattern for history/recents lists
- Aligns with user story US-1 acceptance scenario: "only the most recent visit is shown (no duplicates)"

**Alternatives Considered**:

1. **Allow duplicates with full visit history**
   - Rejected: Clutters UI with repeated entries
   - Rejected: Provides limited value for research workflow
   - Rejected: Contradicts spec requirement for deduplication

2. **Store visit count metadata**
   - Considered: Interesting for analytics
   - Rejected: Not MVP requirement, can be future enhancement
   - Deferred: Add visit count in v2 if user feedback requests it

3. **Separate "frequent" and "recent" lists**
   - Rejected: Out of scope for initial feature
   - Rejected: Adds UI complexity without clear user benefit
   - Deferred: Consider for future enhancement based on usage patterns

**Implementation Details**:
```typescript
async function addToHistory(entry: Omit<HistoryEntry, 'timestamp'>): Promise<void> {
  // 1. Query for existing entry with same ID
  const existing = await storageProvider.findHistoryEntry(entry.id);

  // 2. If exists: Update timestamp
  if (existing) {
    await storageProvider.updateHistoryEntry(entry.id, {
      ...existing,
      timestamp: Date.now()
    });
  }

  // 3. If not exists: Create new entry
  else {
    await storageProvider.createHistoryEntry({
      ...entry,
      timestamp: Date.now()
    });
  }
}
```

**Performance Considerations**:
- Lookup by ID must be fast (index on history entry ID)
- Target: <50ms per deduplication operation
- Use Map data structure in memory for fast lookups during session

**References**:
- Feature spec FR-006: "System MUST deduplicate history entries..."
- User story US-1 acceptance scenario 2

---

### 5. Performance Optimization

**Context**: Success criteria requires <2s load time with 500+ history entries.

**Decision**: Implement virtualized list rendering for history entries beyond 100 items

**Rationale**:
- React virtualization libraries handle large lists efficiently
- Only renders visible entries + small buffer (typically 10-20 items)
- Dramatically reduces DOM node count (from 500+ to ~20)
- Mantine UI components compatible with virtualization patterns
- Standard solution for large list performance

**Alternatives Considered**:

1. **Pagination**
   - Considered: Traditional approach for large lists
   - Rejected: Less intuitive for timeline browsing
   - Rejected: Requires multiple clicks to scan history

2. **Infinite scroll**
   - Considered: Good for continuous scrolling
   - Rejected: Virtualization provides better performance
   - Rejected: Harder to implement "jump to date" features

3. **No optimization**
   - Rejected: 500+ DOM nodes would cause performance issues
   - Rejected: Would fail SC-001 requirement (<2s load)
   - Rejected: Poor user experience with long lists

**Implementation Details**:
- Use @tanstack/react-virtual for virtualization
- Virtual window height: viewport height minus header
- Item height: Fixed height per entry for best performance (e.g., 60px)
- Buffer: 5 items above/below visible window
- Smooth scrolling with scroll-to-date functionality

**Performance Targets**:
- Initial render: <500ms for any list size
- Scroll performance: 60fps (16ms per frame)
- Memory usage: O(visible items) not O(total items)

**References**:
- TanStack Virtual: https://tanstack.com/virtual/v3/docs/framework/react/react-virtual
- React Window: https://react-window.vercel.app/
- Success Criterion SC-001: "History load <2s with 500+ entries"

---

### 6. History Entry Grouping

**Context**: User story US-4 specifies date grouping for easy scanning of history across multiple days.

**Decision**: Group entries by relative time periods (Today, Yesterday, Last 7 Days, Last 30 Days, Older)

**Rationale**:
- Relative time periods more intuitive than absolute dates
- Standard pattern in email clients, file browsers, and activity logs
- Reduces visual clutter while maintaining chronological context
- "Today" and "Yesterday" provide immediate context
- Matches user expectations from other applications

**Alternatives Considered**:

1. **Absolute date headers (2025-11-13)**
   - Rejected: Less human-readable
   - Rejected: Requires mental calculation of relative time
   - Rejected: Not standard pattern for history/recents lists

2. **No grouping**
   - Rejected: Hard to scan long lists
   - Rejected: Contradicts spec US-4 acceptance scenario 2
   - Rejected: Poor UX for lists spanning multiple days

3. **Custom time periods (sessions, weeks)**
   - Rejected: Over-engineered for MVP
   - Rejected: "Sessions" is ambiguous (browser session vs research session)
   - Rejected: Weekly grouping less intuitive than "Last 7 Days"

**Implementation Details**:
```typescript
enum HistoryTimeGroup {
  Today = 'Today',
  Yesterday = 'Yesterday',
  Last7Days = 'Last 7 Days',
  Last30Days = 'Last 30 Days',
  Older = 'Older'
}

function getTimeGroup(timestamp: number): HistoryTimeGroup {
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;
  const age = now - timestamp;

  if (age < dayMs) return HistoryTimeGroup.Today;
  if (age < 2 * dayMs) return HistoryTimeGroup.Yesterday;
  if (age < 7 * dayMs) return HistoryTimeGroup.Last7Days;
  if (age < 30 * dayMs) return HistoryTimeGroup.Last30Days;
  return HistoryTimeGroup.Older;
}
```

**UI Rendering**:
- Group headers styled as Mantine Divider components with labels
- Each group renders as collapsible section (optional enhancement)
- Headers sticky during scroll for context

**References**:
- User story US-4 acceptance scenario 2: "entries are grouped by date (Today, Yesterday, Last 7 days, etc.)"
- date-fns library: https://date-fns.org/

---

## Summary of Decisions

| Topic | Decision | Key Rationale |
|-------|----------|--------------|
| Storage | Use CatalogueStorageProvider with `history` special list | Established pattern, no interface changes needed |
| Navigation Tracking | TanStack Router navigation hooks | Central tracking point, works for all navigation types |
| Type System | Discriminated unions with type guards | Compile-time safety, runtime validation, existing pattern |
| Deduplication | Upsert pattern (update timestamp on existing entry) | Reduces clutter, standard UX pattern, meets spec requirement |
| Performance | Virtualized list rendering (@tanstack/react-virtual) | Handles 500+ entries efficiently, meets <2s target |
| Grouping | Relative time periods (Today, Yesterday, etc.) | Human-readable, standard pattern, matches spec |

## Open Questions (Resolved)

All technical questions from Technical Context have been resolved through research.

## Next Steps

Proceed to Phase 1: Generate data-model.md and quickstart.md based on these research decisions.
