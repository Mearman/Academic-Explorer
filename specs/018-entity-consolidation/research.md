# Research: OpenAlex Entity Definition Consolidation

**Feature**: 018-entity-consolidation
**Date**: 2025-11-21
**Phase**: 0 (Research & Investigation)

## Investigation Summary

This research phase identified all duplicate `EntityType` definitions across the Bibliom monorepo, analyzed differences, and determined the consolidation strategy.

## Duplicate EntityType Definitions Found

### 1. packages/graph/src/types/core.ts (Lines 9-21)

**Definition**:
```typescript
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

**Status**: Exact match with canonical definition
**Usage**: Used in GraphNode interface, graph services, relationship detection
**Import pattern**: Locally defined, no external import

### 2. packages/utils/src/storage/catalogue-db.ts (Lines 62-72)

**Definition**:
```typescript
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

**Status**: SUBSET - missing "concepts" and "keywords"
**Usage**: Used in CatalogueEntity interface, Dexie database schema
**Import pattern**: Locally defined, no external import
**Notes**: Intentionally excludes concepts (deprecated) and keywords (less common in catalogues)

### 3. packages/utils/src/cache-browser/types.ts (Lines 6-16)

**Definition**:
```typescript
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
  | "autocomplete"
```

**Status**: DIFFERENT - missing taxonomy entities (domains, fields, subfields), includes "autocomplete"
**Usage**: Used in CachedEntityMetadata interface, cache browser filters
**Import pattern**: Locally defined, no external import
**Notes**: Includes "autocomplete" (not a true entity type), reflects cache storage patterns

### 4. packages/types/src/entities/entities.ts (Lines 223-235) - CANONICAL

**Definition**:
```typescript
export type EntityType =
  | "works"
  | "authors"
  | "sources"
  | "institutions"
  | "topics"
  | "concepts"
  | "publishers"
  | "funders"
  | "keywords"
  | "domains"
  | "fields"
  | "subfields"
```

**Status**: CANONICAL - Complete set of all 12 OpenAlex entity types
**Created**: spec-017 (Entity Taxonomy Centralization)
**Usage**: Exported from `@academic-explorer/types`, used in EntityTypeMap
**Import pattern**: Primary export point for monorepo

## Key Findings

### Discrepancies Analysis

1. **catalogue-db.ts subset**: Missing "concepts" and "keywords" is intentional - catalogues primarily store works/authors/sources/institutions/topics/publishers/funders. Taxonomy entities (domains/fields/subfields) were added in spec-017.

2. **cache-browser/types.ts differences**:
   - Missing taxonomy entities (domains, fields, subfields) - cache browser predates spec-017
   - Includes "autocomplete" - this is a cache storage type, NOT an entity type
   - Represents cache storage locations, not entity types

3. **graph/types/core.ts exact match**: This package correctly matches the canonical definition but duplicates it locally instead of importing.

### Consolidation Strategy

**Decision**: Eliminate all duplicate definitions and import from `@academic-explorer/types`

**Rationale**:
1. Single source of truth prevents drift
2. TypeScript ensures compile-time enforcement
3. New entity types automatically propagate
4. Reduces maintenance burden (1 location to update vs 4)

**Alternatives Considered**:

- **Alternative 1**: Keep subset definitions in catalogue/cache-browser
  - Rejected: Creates potential for type mismatches, requires manual sync

- **Alternative 2**: Create domain-specific entity type unions (e.g., `CatalogueEntityType`, `CacheableEntityType`)
  - Rejected: Violates YAGNI - no current need for type-safe subsets, adds complexity

- **Alternative 3**: Use TypeScript mapped types to derive subsets
  - Rejected: Overengineering for a refactoring task, complicates type resolution

### TypeScript tsconfig Requirements

**Project References**: Verified all packages already have proper tsconfig references to `@academic-explorer/types`:

```json
{
  "references": [
    { "path": "../types" }
  ]
}
```

**Path Aliases**: Verified `tsconfig.base.json` includes:
```json
{
  "paths": {
    "@academic-explorer/types": ["packages/types/src/index.ts"]
  }
}
```

**No changes required** - existing Nx workspace configuration already supports cross-package imports.

## Best Practices Review

### TypeScript Monorepo Refactoring Patterns

1. **Incremental Migration**: Refactor one package at a time, verify tests pass
2. **Backward Compatibility**: Maintain re-exports during transition period
3. **Atomic Commits**: One commit per package refactored
4. **Type-Only Imports**: Use `import type { EntityType }` for zero runtime cost

### Import Pattern Standards

**Canonical Pattern** (to be applied):
```typescript
import type { EntityType } from "@academic-explorer/types"
```

**Deprecated Pattern** (to be removed):
```typescript
export type EntityType = "works" | "authors" | ...
```

### Dexie Schema Considerations

**Challenge**: Dexie IndexedDB schemas reference TypeScript types at schema definition time.

**Solution**:
- Import EntityType as type-only
- Use string literals in Dexie schema definition
- Maintain runtime compatibility

**Example**:
```typescript
import type { EntityType } from "@academic-explorer/types"

// Dexie schema still uses string literals (no runtime import)
this.entities.schema = "id, listId, entityId, entityType"

// TypeScript type checking uses imported EntityType
interface CatalogueEntity {
  entityType: EntityType  // Type-checked against canonical definition
}
```

## Special Case: cache-browser "autocomplete"

**Issue**: `cache-browser/types.ts` includes "autocomplete" in EntityType, but autocomplete is a cache storage type, not an OpenAlex entity type.

**Resolution**:
1. Create separate `CacheStorageType` union for cache-specific types
2. Import canonical `EntityType` from types package
3. Maintain distinction between entity types and cache storage types

**New Type**:
```typescript
import type { EntityType } from "@academic-explorer/types"

export type CacheStorageType = EntityType | "autocomplete"
```

## Migration Impact Assessment

### Package-by-Package Impact

| Package | Files Modified | Test Impact | Breaking Changes |
|---------|---------------|-------------|------------------|
| types | 0 (canonical source) | None | None |
| graph | 1 (core.ts) | Zero (type-only) | None (re-export maintained) |
| utils | 2 (catalogue-db.ts, cache-browser/types.ts) | Zero (type-only) | None (re-export maintained) |
| web | ~10 (component imports) | Zero (type-only) | None |
| cli | ~3 (command imports) | Zero (type-only) | None |
| client | 0 (doesn't use EntityType) | None | None |
| ui | 0 (doesn't use EntityType) | None | None |
| simulation | 0 (doesn't use EntityType) | None | None |

**Total Estimated Changes**: 15-20 files across 4 packages

### Dependency Graph

```
@academic-explorer/types (canonical source)
  ↑
  ├── @academic-explorer/graph (uses EntityType in nodes/edges)
  ├── @academic-explorer/utils (uses EntityType in storage/cache)
  │    ↑
  │    └── apps/web (uses utils for catalogue/cache)
  └── apps/cli (uses EntityType in commands)
```

**Refactoring Order** (reverse dependency order):
1. packages/graph
2. packages/utils
3. apps/web
4. apps/cli

## Testing Strategy

### Verification Approach

1. **Type Check**: `pnpm typecheck` must pass after each package refactored
2. **Unit Tests**: All 738 existing tests must pass (no new tests required)
3. **Build**: `pnpm build` must succeed for all 8 projects
4. **Import Validation**: Grep for duplicate EntityType definitions = zero results

### Success Criteria Mapping

- **SC-001**: Zero duplicate EntityType definitions → grep validation
- **SC-002**: All metadata references resolve to ENTITY_METADATA → code audit
- **SC-003**: TypeScript compilation passes → `pnpm typecheck`
- **SC-004**: All 738 tests pass → `pnpm test`
- **SC-005**: Build succeeds → `pnpm build`
- **SC-006**: No hardcoded entity type strings outside types package → grep with regex

## Risk Assessment

### Low Risk Factors

- ✅ Pure type refactoring (no runtime changes)
- ✅ TypeScript compiler catches all type mismatches
- ✅ Existing tests validate behavior unchanged
- ✅ Nx project references already configured
- ✅ No new dependencies introduced

### Mitigation Strategies

1. **Type Drift**: Re-export deprecated imports for transition period
2. **Test Failures**: Incremental refactoring allows rollback per package
3. **Build Errors**: Nx cache can be cleared if stale

**Overall Risk Level**: LOW (standard TypeScript refactoring with strong compiler guarantees)

## Next Steps (Phase 1: Design)

1. Generate data-model.md with entity type contracts
2. Generate contracts/ directory with TypeScript type definitions
3. Generate quickstart.md with step-by-step migration guide
4. Update CLAUDE.md with new import patterns
