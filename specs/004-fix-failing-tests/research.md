# Technical Research: Fix Failing Catalogue E2E Tests

**Feature**: 004-fix-failing-tests
**Created**: 2025-11-11
**Status**: Complete

## Overview

This research document outlines the technical approach for fixing 27 failing catalogue E2E tests. Unlike typical features that add new functionality, this is test-driven repair: tests exist and define expected behavior, implementation must conform to test expectations.

## Research Questions

### 1. What is the root cause analysis methodology?

**Decision**: Systematic per-test analysis with failure pattern categorization

**Rationale**:
- 27 failing tests across 3 feature areas suggest multiple distinct root causes
- Tests are independent and can be analyzed in isolation
- Playwright provides detailed failure traces with screenshots and DOM snapshots
- Grouping by failure pattern (missing implementation, timing issues, logic errors) enables batch fixes

**Approach**:
1. Run each failing test file individually to isolate failures
2. Examine Playwright trace viewer for each failure
3. Categorize failures:
   - **Missing Implementation**: Feature not implemented at all (e.g., drag-and-drop handler missing)
   - **Logic Errors**: Implementation exists but has bugs (e.g., wrong entity type displayed)
   - **Timing Issues**: Race conditions or async operations not awaited properly
   - **Data Integrity**: Export/import data loss or corruption
   - **UI State**: Component rendering issues or state not updating
4. Fix one category at a time, starting with missing implementations
5. Re-run full test suite after each fix to detect regressions

**Alternatives Considered**:
- Modify tests to match current implementation → Rejected (violates spec requirement)
- Fix tests in order 64-97 → Rejected (inefficient, misses patterns)
- Rewrite catalogue from scratch → Rejected (violates YAGNI, excessive scope)

### 2. How should drag-and-drop reordering be implemented?

**Decision**: @dnd-kit library with proper accessibility and keyboard support

**Rationale**:
- Already in project dependencies (confirmed in package.json)
- React-first design with hooks API
- Built-in accessibility (ARIA attributes, keyboard navigation)
- Supports touch devices and pointer events
- Modular sensors allow keyboard-only reordering
- Works with virtual scrolling for large lists

**Implementation Pattern**:
```typescript
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// In CatalogueEntities component:
const sensors = useSensors(
  useSensor(PointerSensor),
  useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
);

function handleDragEnd(event) {
  const { active, over } = event;
  if (active.id !== over.id) {
    // Reorder entities array
    // Persist new order to storage
  }
}
```

**Alternatives Considered**:
- react-beautiful-dnd → Rejected (no longer maintained, accessibility issues)
- react-dnd → Rejected (lower-level API, more complex)
- Custom HTML5 drag-and-drop → Rejected (accessibility gaps, touch support issues)

### 3. What is the export/import data format and compression strategy?

**Decision**: JSON with pako (zlib) compression, Base64 encoding for sharing

**Rationale**:
- pako already in dependencies (confirmed)
- JSON preserves entity metadata, notes, order
- zlib compression reduces share URL size (100+ entities → ~few KB compressed)
- Base64 encoding makes share URLs URL-safe
- Versioning support via format version field for future migrations

**Data Format**:
```typescript
interface ExportFormat {
  version: '1.0';
  listMetadata: {
    title: string;
    description: string;
    created: string;
    entityCount: number;
  };
  entities: Array<{
    id: string;
    type: EntityType;
    position: number;
    note?: string;
    addedAt: string;
    metadata: Record<string, unknown>; // Entity-specific data
  }>;
}
```

**Compression Pipeline**:
1. Serialize to JSON
2. Compress with pako.deflate()
3. Encode as Base64 for share URLs
4. Reverse for import: Base64 decode → pako.inflate() → JSON parse
5. Validate schema before import

**Alternatives Considered**:
- Uncompressed JSON → Rejected (share URLs too long for 100+ entities)
- MessagePack → Rejected (not in dependencies, adds complexity)
- Custom binary format → Rejected (maintenance burden, no versioning)

### 4. How should share URLs be generated and validated?

**Decision**: Client-side encoding with Base64URL, QR codes via qrcode library

**Rationale**:
- qrcode already in dependencies
- No server storage required (data embedded in URL)
- URL format: `https://domain/catalogue/import?data=<compressed-base64>`
- QR codes enable mobile sharing without copy/paste
- Client-side validation prevents malformed data crashes

**Implementation**:
```typescript
// Generate share URL
function generateShareURL(listData: ExportFormat): string {
  const json = JSON.stringify(listData);
  const compressed = pako.deflate(json, { level: 9 });
  const base64 = btoa(String.fromCharCode(...compressed));
  const base64url = base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  return `${window.location.origin}/catalogue/import?data=${base64url}`;
}

// Validate and import
function importFromShareURL(dataParam: string): ExportFormat {
  try {
    const base64 = dataParam.replace(/-/g, '+').replace(/_/g, '/');
    const compressed = Uint8Array.from(atob(base64), c => c.charCodeAt(0));
    const json = pako.inflate(compressed, { to: 'string' });
    const data = JSON.parse(json);
    validateExportFormat(data); // Schema validation
    return data;
  } catch (error) {
    throw new Error('Invalid share URL: malformed or corrupted data');
  }
}
```

**Alternatives Considered**:
- Server-side storage with short codes → Rejected (adds backend complexity, no requirement)
- Uncompressed data in URL → Rejected (URL length limits)
- JWT encoding → Rejected (unnecessary signing overhead)

### 5. How should entity type discrimination work with TypeScript?

**Decision**: Discriminated unions with type guards, no `any` types

**Rationale**:
- Constitution requires strict type safety
- OpenAlex entities have `type` field as discriminator
- Type guards enable compile-time type narrowing
- Runtime validation prevents bad data from storage

**Type Structure**:
```typescript
type EntityType = 'work' | 'author' | 'institution' | 'source' | 'topic' | 'funder' | 'publisher' | 'concept';

interface BaseEntity {
  id: string;
  type: EntityType;
  displayName: string;
}

interface WorkEntity extends BaseEntity {
  type: 'work';
  publicationDate: string;
  citedByCount: number;
  // ... work-specific fields
}

interface AuthorEntity extends BaseEntity {
  type: 'author';
  worksCount: number;
  hIndex: number;
  // ... author-specific fields
}

// Union type
type Entity = WorkEntity | AuthorEntity | InstitutionEntity | SourceEntity | TopicEntity | FunderEntity | PublisherEntity | ConceptEntity;

// Type guard
function isWorkEntity(entity: Entity): entity is WorkEntity {
  return entity.type === 'work';
}

// Usage with narrowing
function getEntityMetadata(entity: Entity): string {
  if (isWorkEntity(entity)) {
    return `${entity.citedByCount} citations`; // TypeScript knows this is WorkEntity
  }
  // ... other type checks
}
```

**Alternatives Considered**:
- Type assertions (`entity as WorkEntity`) → Rejected (constitution discourages assertions)
- `any` type → Rejected (constitution forbids `any`)
- Separate storage tables per type → Rejected (complicates queries, over-engineering)

### 6. How should Mantine UI components be integrated for accessibility?

**Decision**: Use Mantine 8.3.x components with proper ARIA labels and roles

**Rationale**:
- Mantine already in dependencies at v8.3.x
- Built-in accessibility with ARIA attributes
- Modal component handles focus management automatically
- Form components have proper label associations
- Table component supports sorting and selection

**Key Components for Catalogue**:
- `Modal` for AddToList, CreateList, Export, Import, Share modals
- `Button` for actions with proper loading states
- `TextInput`, `Textarea` for forms with validation
- `Table` for entity lists with sorting
- `ActionIcon` for entity actions (remove, edit)
- `Badge` for entity type indicators
- `CopyButton` for share URL clipboard functionality
- `Notifications` for user feedback

**Accessibility Requirements**:
```typescript
<Modal
  opened={opened}
  onClose={onClose}
  title="Add to Catalogue"
  aria-labelledby="add-to-catalogue-title"
  aria-describedby="add-to-catalogue-description"
>
  <TextInput
    label="Search lists"
    aria-label="Search catalogue lists"
    // Mantine handles ARIA associations automatically
  />
</Modal>
```

**Alternatives Considered**:
- Custom modal implementation → Rejected (accessibility burden, reinventing wheel)
- Different UI library → Rejected (already using Mantine, consistency important)
- Headless UI → Rejected (more work to style, Mantine already chosen)

## Technology Decisions Summary

| Decision Point | Choice | Key Reason |
|----------------|--------|------------|
| Drag-and-drop | @dnd-kit | Accessibility + already in deps |
| Compression | pako (zlib) | Already in deps, good compression |
| Share URLs | Base64URL + client-side | No backend needed |
| Type Safety | Discriminated unions | Constitution requirement |
| UI Components | Mantine 8.3.x | Already in use, built-in a11y |
| QR Codes | qrcode library | Already in deps |
| Storage | Dexie (IndexedDB) | Existing pattern, abstracted |

## Implementation Order

Based on failure analysis and dependencies:

1. **Phase 1: Entity Management Fundamentals** (P1 - Tests 64-72)
   - Fix add entity to list (FR-001)
   - Fix entity type display with badges (FR-002)
   - Fix remove entity (FR-003)
   - Fix search/filter (FR-005)
   - Fix entity metadata display (FR-009)
   - Fix empty state (FR-007)

2. **Phase 2: Entity Management Advanced** (P1 - Tests 64-72 continued)
   - Implement drag-and-drop reordering (FR-004)
   - Implement notes functionality (FR-006)
   - Implement bulk operations (FR-008)

3. **Phase 3: Import/Export** (P2 - Tests 73-81)
   - Implement compressed export (FR-010, FR-011)
   - Implement compressed import (FR-012)
   - Implement file upload import (FR-014)
   - Implement validation and error handling (FR-013, FR-015)
   - Implement preview (FR-017)
   - Implement duplicate detection (FR-018)
   - Handle large datasets (FR-016)

4. **Phase 4: Sharing** (P3 - Tests 89-97)
   - Implement share URL generation (FR-019)
   - Implement clipboard copy (FR-020)
   - Implement QR codes (FR-021)
   - Implement import from URL (FR-022, FR-023)
   - Implement URL validation (FR-024)
   - Implement public list marking (FR-025)
   - Support bibliographies (FR-026)

5. **Phase 5: UI Polish** (P3 - Test 87)
   - Ensure all Mantine components have proper ARIA (FR-027)
   - Verify accessibility with screen reader testing

## Risk Mitigation Strategies

### Risk 1: Multiple Root Causes
- **Mitigation**: Run each test file individually first
- **Tool**: `pnpm test:e2e catalogue-entity-management.e2e.test.ts --headed` for debugging
- **Approach**: Create failure category map before coding

### Risk 2: Test Flakiness
- **Mitigation**: Run each test 3 times after fix to verify stability
- **Tool**: `pnpm test:e2e --repeat-each=3`
- **Approach**: Add explicit waits for async operations

### Risk 3: Breaking Other Tests
- **Mitigation**: Run full test suite after each fix batch
- **Tool**: `pnpm test:e2e` (all tests)
- **Approach**: Use TypeScript to catch API changes at compile time

### Risk 4: Storage Abstraction Violations
- **Mitigation**: Review storage calls against constitution
- **Pattern**: Always use useCatalogue hook, never direct Dexie calls in components
- **Approach**: Ensure E2E tests use in-memory provider

## Open Questions

None - all technical decisions resolved.

## References

- [@dnd-kit documentation](https://docs.dndkit.com/)
- [pako compression library](https://github.com/nodeca/pako)
- [Mantine 8.3.x docs](https://mantine.dev/)
- [TypeScript discriminated unions](https://www.typescriptlang.org/docs/handbook/2/narrowing.html#discriminated-unions)
- [Academic Explorer Constitution](../../.specify/memory/constitution.md)
