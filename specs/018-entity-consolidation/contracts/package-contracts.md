# Package-Level Contracts: Entity Type Consolidation

This document defines the migration contracts for each package affected by the entity type consolidation.

## Contract Overview

| Package | Contract Type | Breaking Changes | Migration Effort |
|---------|--------------|------------------|------------------|
| packages/graph | Type import replacement | Yes (re-export removed) | Low |
| packages/utils (catalogue) | Type import replacement | Yes (re-export removed) | Low |
| packages/utils (cache-browser) | Type split + import | Internal only | Medium |
| apps/web | Import path updates | Yes (import paths change) | Low |
| apps/cli | Import path updates | Yes (import paths change) | Low |

## Package Contracts

### Contract 1: @academic-explorer/graph

**Status**: Type-only refactoring (zero runtime impact)

**Current State**:
```typescript
// packages/graph/src/types/core.ts (BEFORE)
export type EntityType =
  | "works"
  | "authors"
  | "sources"
  | "institutions"
  | "publishers"
  | "funders"
  | "topics"
  | "concepts"
  | "keywords"
  | "domains"
  | "fields"
  | "subfields"
```

**Target State**:
```typescript
// packages/graph/src/types/core.ts (AFTER)
import type { EntityType } from "@academic-explorer/types"

// Remove local definition

// packages/graph/src/index.ts (AFTER)
// REMOVED: Re-export prohibited per Constitution Principle III
// export type { EntityType } from "@academic-explorer/types"
```

**Affected Interfaces**:
- `GraphNode.entityType: EntityType`
- `RelationType` enum (no changes required)

**Migration Steps**:
1. Add import statement to core.ts
2. Remove local EntityType definition
3. Remove EntityType re-export from index.ts (Constitution Principle III)
4. Verify TypeScript compilation: `pnpm nx typecheck graph`
5. Verify tests pass: `pnpm nx test graph`

**Success Criteria**:
- Zero type errors in graph package
- All graph tests pass (zero failures)
- No EntityType re-export remains in graph package

**Breaking Change**:
- Consumers importing EntityType from @academic-explorer/graph must update to @academic-explorer/types

---

### Contract 2: @academic-explorer/utils (Catalogue DB)

**Status**: Type import replacement + subset → superset migration

**Current State**:
```typescript
// packages/utils/src/storage/catalogue-db.ts (BEFORE)
export type EntityType =
  | "works"
  | "authors"
  | "sources"
  | "institutions"
  | "topics"
  | "publishers"
  | "funders"
  | "domains"
  | "fields"
  | "subfields"
```

**Target State**:
```typescript
// packages/utils/src/storage/catalogue-db.ts (AFTER)
import type { EntityType } from "@academic-explorer/types"

// Remove local definition
```

**Affected Interfaces**:
- `CatalogueEntity.entityType: EntityType`
- `CatalogueList` (no EntityType field, no changes)

**Breaking Changes**:
- **Before**: EntityType excluded "concepts" and "keywords"
- **After**: EntityType includes all 12 types
- **Impact**: Stricter type checking (subset → superset is safe)
- **Runtime**: Dexie schema still accepts any string (no runtime breakage)

**Migration Steps**:
1. Add import statement to catalogue-db.ts
2. Remove local EntityType definition
3. Verify Dexie schema unchanged (runtime compatibility)
4. Verify TypeScript compilation: `pnpm nx typecheck utils`
5. Verify tests pass: `pnpm nx test utils`

**Success Criteria**:
- Zero type errors in utils package
- All catalogue tests pass
- Existing catalogue entries remain valid

---

### Contract 3: @academic-explorer/utils (Cache Browser)

**Status**: Type split (EntityType + CacheStorageType) + import

**Current State**:
```typescript
// packages/utils/src/cache-browser/types.ts (BEFORE)
export type EntityType =
  | "works"
  | "authors"
  | "sources"
  | "institutions"
  | "topics"
  | "publishers"
  | "funders"
  | "keywords"
  | "concepts"
  | "autocomplete"  // Not a real entity type!
```

**Target State**:
```typescript
// packages/utils/src/cache-browser/types.ts (AFTER)
import type { EntityType } from "@academic-explorer/types"

/**
 * Cache storage types include entity types + special "autocomplete" cache
 */
export type CacheStorageType = EntityType | "autocomplete"

export interface CachedEntityMetadata {
  id: string
  type: CacheStorageType  // Changed from EntityType
  label: string
  cacheTimestamp: number
  storageLocation: "indexeddb" | "localstorage" | "memory" | "repository"
  dataSize: number
  lastAccessed?: number
  externalIds?: Record<string, string>
  basicInfo?: {
    displayName?: string
    description?: string
    url?: string
    citationCount?: number
    worksCount?: number
  }
}
```

**Affected Interfaces**:
- `CachedEntityMetadata.type: EntityType` → `type: CacheStorageType`
- `CacheBrowserFilters.entityTypes: Set<EntityType>` → `Set<CacheStorageType>`

**Breaking Changes**:
- **Before**: EntityType included "autocomplete"
- **After**: CacheStorageType = EntityType | "autocomplete" (semantically correct)
- **Impact**: Internal change only (cache-browser is not exported from utils package)
- **Runtime**: No breaking changes (same string values accepted)

**Migration Steps**:
1. Add import statement for EntityType
2. Create new CacheStorageType union
3. Update CachedEntityMetadata.type to use CacheStorageType
4. Update CacheBrowserFilters.entityTypes to use Set<CacheStorageType>
5. Verify TypeScript compilation: `pnpm nx typecheck utils`
6. Verify cache browser tests pass

**Success Criteria**:
- Zero type errors in utils package
- Cache browser correctly handles "autocomplete" storage type
- All cache browser tests pass

---

### Contract 4: apps/web

**Status**: Import path updates (no local definitions)

**Current State**:
```typescript
// Various components import from graph or utils
import type { EntityType } from "@academic-explorer/graph"
import type { EntityType } from "@academic-explorer/utils"
```

**Target State**:
```typescript
// All components import from types package
import type { EntityType } from "@academic-explorer/types"
```

**Affected Files** (estimated ~10 files):
- `src/components/entity/*` (entity cards, lists)
- `src/routes/*` (entity detail pages)
- `src/services/graph-data-service.ts`
- `src/services/relationship-detection-service.ts`

**Migration Steps**:
1. Search for all EntityType imports: `grep -r "import.*EntityType" apps/web/src`
2. Replace import paths with `@academic-explorer/types`
3. Verify TypeScript compilation: `pnpm nx typecheck web`
4. Verify tests pass: `pnpm nx test web`

**Success Criteria**:
- Zero type errors in web package
- All web tests pass (zero failures)
- No runtime behavior changes

---

### Contract 5: apps/cli

**Status**: Import path updates (no local definitions)

**Current State**:
```typescript
// CLI commands may import EntityType
import type { EntityType } from "@academic-explorer/graph"
```

**Target State**:
```typescript
import type { EntityType } from "@academic-explorer/types"
```

**Affected Files** (estimated ~3 files):
- `src/commands/cache/*` (cache stats commands)

**Migration Steps**:
1. Search for all EntityType imports: `grep -r "import.*EntityType" apps/cli/src`
2. Replace import paths with `@academic-explorer/types`
3. Verify TypeScript compilation: `pnpm nx typecheck cli`
4. Verify CLI builds: `pnpm nx build cli`

**Success Criteria**:
- Zero type errors in CLI package
- CLI builds successfully
- All CLI commands execute correctly

---

## Global Validation Contract

After all packages are migrated, the following validations MUST pass:

### Validation 1: Zero Duplicate Definitions

**Command**:
```bash
grep -r "export type EntityType" packages/ apps/ --include="*.ts" --include="*.tsx"
```

**Expected Result**: Zero matches (only types package should define EntityType, but it's in entities.ts not duplicated elsewhere)

**Actual Check**:
```bash
grep -r "export type EntityType =" packages/ apps/ --include="*.ts" --include="*.tsx" | grep -v "packages/types/src/entities/entities.ts"
```

**Expected Result**: Zero matches

### Validation 2: All Imports Resolve to Types Package

**Command**:
```bash
grep -r "import.*EntityType.*from" packages/ apps/ --include="*.ts" --include="*.tsx" | grep -v "@academic-explorer/types"
```

**Expected Result**: Zero matches (all EntityType imports should be from types package)

### Validation 3: TypeScript Compilation

**Command**:
```bash
pnpm typecheck
```

**Expected Result**: Zero type errors across all 8 packages

### Validation 4: Test Suite

**Command**:
```bash
pnpm test
```

**Expected Result**: All 738 tests pass (zero failures)

### Validation 5: Build

**Command**:
```bash
pnpm build
```

**Expected Result**: All 8 projects build successfully

---

## Rollback Contract

If any validation fails, rollback to previous state:

1. Revert package changes in reverse dependency order (cli → web → utils → graph)
2. Run `pnpm typecheck` after each revert
3. Verify tests pass after full rollback
4. Investigate failure and retry with fix

---

## Timeline Estimate

| Package | Estimated Time | Dependencies |
|---------|---------------|--------------|
| packages/graph | 15 minutes | None |
| packages/utils | 30 minutes | types |
| apps/web | 20 minutes | graph, utils, types |
| apps/cli | 10 minutes | types |
| **Total** | **75 minutes** | - |

**Note**: Time estimates assume familiarity with codebase and tooling.
