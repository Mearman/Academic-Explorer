# Data Model: OpenAlex Entity Definition Consolidation

**Feature**: 018-entity-consolidation
**Date**: 2025-11-21
**Phase**: 1 (Design)

## Overview

This document defines the data structures and type relationships for consolidating duplicate `EntityType` definitions into a single canonical source in the types package.

## Entity Type Hierarchy

### Canonical Entity Type Union

**Location**: `packages/types/src/entities/entities.ts:223-235`

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

**Properties**:
- **Total members**: 12 string literal types
- **Immutability**: Union type is frozen (no runtime modification)
- **Validation**: Type guards provided via `isEntityType()` function
- **Export path**: `@academic-explorer/types`

### Entity Metadata Structure

**Location**: `packages/types/src/entities/entity-metadata.ts`

```typescript
interface EntityMetadataEntry {
  displayName: string          // Singular form: "Work", "Author"
  plural: string                // Plural form: "Works", "Authors"
  description: string           // Human-readable description
  color: string                 // Hex color code for UI
  icon: string                  // Icon identifier (Tabler icon name)
  idPrefix: string              // OpenAlex ID prefix: "W", "A", "S", etc.
  routePath: string             // URL route segment: "/works", "/authors"
  singularForm: string          // Lowercase singular: "work", "author"
}

const ENTITY_METADATA: Record<EntityType, EntityMetadataEntry>
```

**Relationships**:
- **1:1 mapping**: Each EntityType → exactly one EntityMetadataEntry
- **Completeness**: All 12 entity types have metadata
- **Usage**: UI components, routing, entity detection, color coding

## Package Dependencies

### Type Import Graph

```
@academic-explorer/types (source of truth)
  ↓ type imports
  ├── @academic-explorer/graph
  │   └── GraphNode.entityType: EntityType
  │   └── GraphEdge relationships
  │
  ├── @academic-explorer/utils
  │   ├── CatalogueEntity.entityType: EntityType
  │   └── CachedEntityMetadata.type: CacheStorageType (EntityType | "autocomplete")
  │
  ├── apps/web
  │   ├── Components (entity cards, lists, filters)
  │   ├── Routes (entity detail pages)
  │   └── Services (graph data, relationship detection)
  │
  └── apps/cli
      └── Commands (cache stats, entity operations)
```

### Import Patterns

**Type-Only Import** (zero runtime cost):
```typescript
import type { EntityType } from "@academic-explorer/types"
```

**Value Import** (for ENTITY_METADATA):
```typescript
import { ENTITY_METADATA, isEntityType } from "@academic-explorer/types"
```

## Migration Contracts

### Contract 1: Graph Package

**Before**:
```typescript
// packages/graph/src/types/core.ts
export type EntityType = "works" | "authors" | ...

// packages/graph/src/index.ts
export type { EntityType } from "./types/core"
```

**After**:
```typescript
// packages/graph/src/types/core.ts
import type { EntityType } from "@academic-explorer/types"
// Remove local definition

// packages/graph/src/index.ts
// REMOVED: Re-export prohibited per Constitution Principle III
// export type { EntityType } from "@academic-explorer/types"
```

**Validation**:
- GraphNode interface type-checks with imported EntityType
- Breaking change: EntityType re-export removed (Constitution Principle III)
- Consumers must update imports to @academic-explorer/types
- Zero test changes required (internal usage only)

### Contract 2: Utils Package - Catalogue DB

**Before**:
```typescript
// packages/utils/src/storage/catalogue-db.ts
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

**After**:
```typescript
// packages/utils/src/storage/catalogue-db.ts
import type { EntityType } from "@academic-explorer/types"
// Remove local definition
```

**Breaking Change**: None
- Catalogue DB previously used subset (missing "concepts", "keywords")
- New import includes all 12 types
- Dexie schema still accepts any string at runtime
- TypeScript enforces stricter type checking (IMPROVEMENT)

**Validation**:
- CatalogueEntity interface type-checks
- Dexie schema remains unchanged
- All existing catalogue tests pass

### Contract 3: Utils Package - Cache Browser

**Before**:
```typescript
// packages/utils/src/cache-browser/types.ts
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

**After**:
```typescript
// packages/utils/src/cache-browser/types.ts
import type { EntityType } from "@academic-explorer/types"

// New type for cache-specific storage types
export type CacheStorageType = EntityType | "autocomplete"

// Update interface to use CacheStorageType
export interface CachedEntityMetadata {
  id: string
  type: CacheStorageType  // Changed from EntityType
  label: string
  // ... rest of interface
}
```

**Breaking Change**: API surface change
- `CachedEntityMetadata.type` changes from `EntityType` to `CacheStorageType`
- Internal change only (cache-browser is internal utility)
- Maintains "autocomplete" support while using canonical EntityType

**Validation**:
- CachedEntityMetadata interface type-checks
- Cache browser filters support "autocomplete" storage type
- All cache browser operations remain functional

## Type Safety Contracts

### Contract 4: Type Guards

**Location**: `packages/types/src/entities/index.ts`

```typescript
export function isEntityType(value: unknown): value is EntityType {
  return typeof value === "string" && (
    value === "works" ||
    value === "authors" ||
    value === "sources" ||
    value === "institutions" ||
    value === "topics" ||
    value === "concepts" ||
    value === "publishers" ||
    value === "funders" ||
    value === "keywords" ||
    value === "domains" ||
    value === "fields" ||
    value === "subfields"
  )
}
```

**Usage**: Runtime validation of unknown string values

**Validation**:
- Type guard ensures type safety for dynamic values
- Used in URL parsing, API responses, user input

### Contract 5: Entity Type to Entity Interface Mapping

**Location**: `packages/types/src/entities/entities.ts:238-251`

```typescript
export type EntityTypeMap = {
  works: Work
  authors: Author
  sources: Source
  institutions: InstitutionEntity
  topics: Topic
  concepts: Concept
  publishers: Publisher
  funders: Funder
  keywords: Keyword
  domains: Domain
  fields: Field
  subfields: Subfield
}
```

**Purpose**: Type-safe lookup from entity type string to entity interface

**Usage**:
```typescript
function getEntity<T extends EntityType>(type: T): EntityTypeMap[T] {
  // TypeScript infers correct return type based on input type
}
```

## State Transitions

### Refactoring Workflow States

1. **Initial State**: 4 duplicate EntityType definitions
   - packages/graph/src/types/core.ts
   - packages/utils/src/storage/catalogue-db.ts
   - packages/utils/src/cache-browser/types.ts
   - packages/types/src/entities/entities.ts (canonical)

2. **Transition State**: Incremental refactoring
   - Package N: Remove local definition, import from types, remove re-export
   - Package N+1: Still has local definition (unchanged)
   - Breaking changes acceptable per Constitution Principle VII

3. **Final State**: Single source of truth
   - Only packages/types defines EntityType
   - All other packages import from `@academic-explorer/types`
   - Zero duplicate definitions (verified by grep)

## Validation Rules

### Compile-Time Validation

1. **TypeScript Strictness**:
   - `strict: true` enforces type safety
   - No `any` types allowed
   - Exhaustiveness checking in switch statements

2. **Import Resolution**:
   - All `@academic-explorer/types` imports resolve via tsconfig paths
   - Nx project references enable cross-package type checking

3. **Type Compatibility**:
   - Imported EntityType must satisfy all existing usage sites
   - No type assertions (`as EntityType`) required

### Runtime Validation

1. **Type Guards**:
   - `isEntityType(value)` for unknown string validation
   - Used in API response parsing, URL routing

2. **Dexie Schema**:
   - EntityType used as TypeScript type (compile-time)
   - String literals used in schema definition (runtime)
   - No runtime import of EntityType required

## Edge Cases

### Edge Case 1: Autocomplete Cache Type

**Scenario**: Cache browser needs to distinguish "autocomplete" as a cache storage type, not an entity type.

**Resolution**: Create `CacheStorageType = EntityType | "autocomplete"` union

**Impact**: Internal change only, no public API breakage

### Edge Case 2: Catalogue DB Missing Entity Types

**Scenario**: Catalogue DB previously omitted "concepts" and "keywords" from EntityType

**Resolution**: Import full EntityType from types package

**Impact**: Stricter type checking (entities can now be catalogued for all 12 types)

**Validation**: Existing catalogue entries still type-check (subset → superset is safe)

### Edge Case 3: Test Fixtures with Hardcoded Strings

**Scenario**: Test files use string literals like "works", "authors" without importing EntityType

**Resolution**: No change required (string literals are assignable to EntityType union)

**Validation**: TypeScript type checking ensures string literals match EntityType members

## Breaking Changes (Constitution Compliance)

### No Re-Exports (Principle III)

**Prohibited Pattern**:
```typescript
// ❌ WRONG: packages/graph/src/index.ts
export type { EntityType } from "@academic-explorer/types"
```

**Required Pattern**:
```typescript
// ✅ CORRECT: Consumers import directly
import type { EntityType } from "@academic-explorer/types"
```

**Rationale**: Constitution Principle III prohibits re-exports between internal packages

### No Backward Compatibility (Principle VII)

**Impact**: Consumers importing EntityType from @academic-explorer/graph or @academic-explorer/utils must update imports to @academic-explorer/types

**Justification**: Application is unreleased in development. Backward compatibility adds complexity without value per Constitution Principle VII.

### No Deprecation Notices

Not required per Constitution Principle VII (breaking changes acceptable during development)

## Summary

**Total Data Models**: 2
1. EntityType union (12 string literal types)
2. EntityMetadataEntry interface (8 properties)

**Total Contracts**: 5
1. Graph package migration
2. Utils catalogue-db migration
3. Utils cache-browser migration (with CacheStorageType)
4. Type guard function
5. EntityTypeMap lookup

**Breaking Changes**: Yes (re-exports removed, import paths must be updated per Constitution Principles III and VII)

**Type Safety Improvements**: Stricter type checking, single source of truth, eliminates drift risk
