# Developer Quickstart: Entity Relationship Visualization

**Feature**: Entity Relationship Visualization
**Branch**: `016-entity-relationship-viz`
**Date**: 2025-11-18

---

## Quick Start

Get the feature up and running in under 5 minutes.

### Prerequisites

- Node.js 18+ installed
- pnpm package manager
- Academic Explorer repository cloned
- Branch `016-entity-relationship-viz` checked out

### Setup

```bash
# Navigate to repository
cd "Academic Explorer"

# Checkout feature branch
git checkout 016-entity-relationship-viz

# Install dependencies
pnpm install

# Run development server
pnpm dev
```

The app will be available at `http://localhost:5173`

---

## Feature Overview

Add incoming/outgoing relationship visualization to entity detail pages:

- **Incoming relationships**: Other entities that link TO this entity (e.g., citations, affiliations)
- **Outgoing relationships**: Entities this entity links TO (e.g., references, authors)
- **Filtering**: Filter by relationship direction and type
- **Pagination**: "Load more" for entities with 50+ relationships

---

## Development Workflow

### 1. Run Tests First (Test-First Development)

```bash
# Run all tests (serial execution)
pnpm test

# Run only component tests
pnpm test -- relationship

# Run E2E tests
pnpm test:e2e

# Run tests in watch mode
pnpm test -- --watch
```

### 2. Implementation Order

Follow user story priority (P1 → P2 → P3 → P4):

**P1: View Incoming Relationships**
- Create `RelationshipSection.tsx` component
- Create `use-entity-relationships.ts` hook
- Add incoming section to entity detail pages
- Write failing tests, then implement

**P2: View Outgoing Relationships**
- Add outgoing section rendering
- Distinguish incoming vs outgoing visually
- Write failing tests, then implement

**P3: Relationship Type Filtering**
- Add filter UI (adapt from `EdgeFiltersSection.tsx`)
- Implement `filterByDirection()` logic
- Write failing tests, then implement

**P4: Relationship Counts and Summaries**
- Add count badges to section headers
- Implement summary statistics
- Write failing tests, then implement

### 3. Commit After Each Task

```bash
# Stage only relevant files (NEVER use git add .)
git add apps/web/src/components/relationship/RelationshipSection.tsx

# Atomic conventional commit
git commit -m "feat(web): add RelationshipSection component for P1"

# Run quality pipeline before pushing
pnpm validate
```

---

## Key Files

### Components

```
apps/web/src/components/relationship/
├── RelationshipSection.tsx       # Section container with filtering
├── RelationshipItem.tsx          # Individual relationship row
├── RelationshipList.tsx          # Paginated list
└── RelationshipCounts.tsx        # Summary badges
```

### Hooks

```
apps/web/src/hooks/
└── use-entity-relationships.ts   # Fetch & filter relationships
```

### Entity Pages

```
apps/web/src/routes/_entityType/
├── _authorId.lazy.tsx            # Add relationship sections
├── _workId.lazy.tsx              # Add relationship sections
├── _institutionId.lazy.tsx       # Add relationship sections
└── ...                           # Other entity types
```

### Tests

```
apps/web/test/
├── component/
│   ├── relationship-section.component.test.tsx
│   ├── relationship-item.component.test.tsx
│   └── relationship-list.component.test.tsx
├── integration/
│   └── entity-relationships.integration.test.tsx
└── e2e/
    ├── incoming-relationships.e2e.test.ts
    ├── outgoing-relationships.e2e.test.ts
    └── relationship-filtering.e2e.test.ts
```

---

## Common Commands

```bash
# Development
pnpm dev                          # Start dev server
pnpm build                        # Build for production

# Testing
pnpm test                         # Run all tests (serial)
pnpm test:web                     # Web app tests only
pnpm test:e2e                     # E2E tests (Playwright)

# Quality
pnpm typecheck                    # TypeScript validation
pnpm lint                         # ESLint checking
pnpm validate                     # Full pipeline (typecheck + lint + test + build)

# Nx
nx graph                          # View dependency graph
nx affected:test                  # Test changed projects
nx reset                          # Clear Nx cache

# Cleanup
pnpm clean                        # Remove build artifacts
pnpm kill-nx                      # Kill stuck Nx daemon
```

---

## Code Examples

### Basic Component Usage

```tsx
import { RelationshipSection } from '@/components/relationship/RelationshipSection';
import { useEntityRelationships } from '@/hooks/use-entity-relationships';

function WorkDetailPage({ workId }: { workId: string }) {
  const { incoming, outgoing, loading, error } = useEntityRelationships(workId);

  return (
    <>
      <h2>Incoming Relationships</h2>
      {incoming.map(section => (
        <RelationshipSection
          key={section.id}
          section={section}
          direction="inbound"
        />
      ))}

      <h2>Outgoing Relationships</h2>
      {outgoing.map(section => (
        <RelationshipSection
          key={section.id}
          section={section}
          direction="outbound"
        />
      ))}
    </>
  );
}
```

### Test Example

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RelationshipSection } from './RelationshipSection';

describe('RelationshipSection', () => {
  it('should display relationship count', () => {
    const section = {
      id: 'test-section',
      type: 'AUTHORSHIP',
      direction: 'outbound',
      label: 'Authors',
      items: [/* ... */],
      totalCount: 5,
      visibleCount: 5,
      hasMore: false,
      pagination: { /* ... */ }
    };

    render(<RelationshipSection section={section} direction="outbound" />);

    expect(screen.getByText('Authors (5)')).toBeInTheDocument();
  });
});
```

---

## Debugging Tips

### Common Issues

**Issue**: Tests failing with OOM error
**Solution**: Tests run serially by default. Check `maxConcurrency: 1` in vitest config.

**Issue**: Type errors in graph package
**Solution**: Pre-existing from incomplete Phase 1-3 work. Use `--no-verify` if needed (document in commit message).

**Issue**: Relationships not appearing
**Solution**: Check if graph data is loaded. Use `useGraphData()` hook to inspect edges.

**Issue**: Filtering not working
**Solution**: Ensure `filterByDirection()` function uses memoization. Check `useMemo` dependencies.

### Debug Commands

```bash
# Check Nx cache status
nx reset

# Inspect graph data in browser console
localStorage.getItem('academic-explorer-graph')

# Run single test file
pnpm test relationship-section.component.test.tsx

# E2E tests with UI
pnpm test:e2e --ui
```

---

## Performance Targets

From Success Criteria (spec.md):

- **SC-001**: Load relationships in <2 seconds
- **SC-005**: Filter in <1 second
- **SC-006**: Handle 1000 relationships without degradation

Test with large datasets:

```typescript
// Generate 1000 mock relationships for testing
const mockEdges = Array.from({ length: 1000 }, (_, i) => ({
  id: `edge-${i}`,
  source: 'W123',
  target: `A${i}`,
  type: 'AUTHORSHIP',
  direction: 'outbound',
}));
```

---

## Architecture Decisions

Key decisions from `research.md`:

1. **Reuse EdgeFiltersSection filtering patterns** - Don't reinvent the wheel
2. **Component architecture** - Separate concerns (section, item, list, counts)
3. **Data fetching** - Use existing graph data provider; no new API calls
4. **Pagination** - Client-side "Load more" at 50 items
5. **Empty states** - Mantine UI components with retry functionality

---

## Next Steps

1. Read `spec.md` for full requirements (FR-001 to FR-013)
2. Read `data-model.md` for type definitions
3. Read `tasks.md` (generated by `/speckit.tasks`) for task breakdown
4. Start with P1 (View Incoming Relationships)
5. Write failing tests first (Red-Green-Refactor)

---

## Getting Help

- **Constitution**: See `.specify/memory/constitution.md` for project principles
- **Architecture**: See `CLAUDE.md` in project root for architecture details
- **Spec**: See `specs/016-entity-relationship-viz/spec.md` for requirements
- **Data Model**: See `specs/016-entity-relationship-viz/data-model.md` for types

---

**Quickstart Complete**: You're ready to implement!
**Last Updated**: 2025-11-18
