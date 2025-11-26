# Spec 017: Entity Taxonomy Centralization

**Status**: In Progress
**Created**: 2025-11-21-012431
**Priority**: P1 (Critical - Technical Debt Reduction)

---

**Package Migration Note (Added 2025-11-26)**: This specification references `packages/graph/` which was removed on 2025-11-24. The spec was created before the refactoring but remains in progress. Package structure references below are outdated - current packages are: algorithms, client, types, ui, utils.

---

## Problem Statement

OpenAlex entity type definitions, metadata, and classifications are duplicated across multiple files throughout the codebase:

- **5 conflicting EntityType definitions** (3 plural form, 2 singular form)
- **3 conflicting color mappings** (different colors for same entities)
- **2 icon definition sources** (Tabler icon names vs SVG paths)
- **Multiple duplicate label/display name mappings**

This duplication causes:
- Inconsistent entity type names (plural vs singular forms)
- Conflicting color assignments
- Maintenance overhead (updating metadata in multiple places)
- Type safety issues (assertions needed for conversions)
- Risk of drift and bugs

## Goals

1. Create a single source of truth for all entity metadata
2. Eliminate duplicate EntityType definitions
3. Remove type coercion assertions
4. Centralize in the types package (not graph package)
5. Provide backward-compatible migration path
6. Improve type safety and developer experience

## Non-Goals

- Changing the entity type values themselves (works, authors, etc.)
- Modifying the OpenAlex API integration
- Refactoring the graph visualization system

## Solution Design

### Architecture Decision

**Entity metadata lives in `packages/types/src/entities/entity-metadata.ts`**

Rationale:
- Entity types are foundational type information, not graph-specific
- Types package has no dependencies, preventing circular imports
- All packages can import from types without circular references
- Graph package should not re-export types (violates separation of concerns)

### Data Structure

```typescript
export interface EntityMetadataEntry {
  displayName: string      // "Work"
  plural: string           // "Works"
  description: string      // Full description
  color: string            // Mantine color name
  icon: string             // Tabler icon name
  idPrefix: string         // OpenAlex ID prefix ("W", "A", etc.)
  routePath: string        // Base route ("/works")
  singularForm: string     // Catalogue compatibility ("work")
}

export const ENTITY_METADATA: Record<EntityType, EntityMetadataEntry>
```

### Helper Functions

All helper functions moved to types package:
- `getEntityMetadata(entityType)` - Get complete metadata
- `getEntityColor(entityType)` - Get color
- `getEntityDisplayName(entityType)` - Get display name
- `getEntityPlural(entityType)` - Get plural form
- `getEntityIcon(entityType)` - Get icon name
- `getEntityIdPrefix(entityType)` - Get ID prefix
- `getEntityRoutePath(entityType)` - Get route path
- `toEntityType(singularForm)` - Convert singular → plural
- `toSingularForm(entityType)` - Convert plural → singular
- `isEntityType(value)` - Type guard for EntityType
- `detectEntityType(openAlexId)` - Detect type from ID

### Migration Strategy

1. **Phase 1**: Create centralized structure in types package ✅
2. **Phase 2**: Update all imports to use types package (in progress)
3. **Phase 3**: Remove duplicate definitions
4. **Phase 4**: Verify and test
5. **Phase 5**: Create atomic commits

No type coercion (`as Record<EntityType, T>`) - use explicit mappings instead.

## Implementation Status

### Completed

- ✅ Created `packages/types/src/entities/entity-metadata.ts`
- ✅ Defined EntityMetadataEntry interface
- ✅ Created ENTITY_METADATA constant with all 12 entity types
- ✅ Implemented 14 helper functions
- ✅ Exported from types package index
- ✅ Updated graph/entity-taxa.ts to use types (no re-exports)
- ✅ Removed type coercion from ENTITY_TAXONOMY
- ✅ Removed type coercion from ENTITY_ICON_MAP
- ✅ Removed duplicate helper functions from graph package
- ✅ Updated test-fixtures.ts import
- ✅ Updated catalogue constants (removed type coercion)
- ✅ Updated search.lazy.tsx import

### In Progress

- 🔄 Fix module resolution errors (need to rebuild types package)
- 🔄 Update remaining imports across codebase

### Pending

- ⏳ Remove duplicate EntityType definitions
- ⏳ Verify all tests pass
- ⏳ Run full typecheck
- ⏳ Create atomic commits

## Files Changed

### Created
- `packages/types/src/entities/entity-metadata.ts` - Single source of truth

### Modified
- `packages/types/src/entities/index.ts` - Export entity-metadata
- `packages/graph/src/taxonomy/entity-taxa.ts` - Use types, no re-exports
- `packages/graph/src/__tests__/utils/test-fixtures.ts` - Import from types
- `apps/web/src/constants/catalogue.ts` - Import from types, no coercion
- `apps/web/src/routes/search.lazy.tsx` - Import from types

### To Remove (After Migration)
- Duplicate EntityType definitions in:
  - `apps/web/src/types/catalogue.ts` (singular form)
  - `apps/web/src/components/entity-detail/EntityTypeConfig.tsx` (singular form)
  - `packages/utils/src/storage/catalogue-db.ts` (10 types only)
  - `packages/graph/src/types/core.ts` (can reference types package)

## Success Criteria

- [ ] All imports use `@academic-explorer/types/entities`
- [ ] Zero type coercion assertions (`as Record<EntityType, T>`)
- [ ] Single EntityType definition (in types package)
- [ ] `pnpm typecheck` passes
- [ ] `pnpm test` passes
- [ ] `pnpm build` succeeds
- [ ] No circular dependencies

## Testing Strategy

- Type-level testing via typecheck
- Unit tests for helper functions
- Integration tests for entity metadata access
- Manual verification of UI components

## Risks and Mitigations

**Risk**: Breaking changes for code that imports from graph package
**Mitigation**: Graph package temporarily kept for backward compatibility

**Risk**: Circular dependency between packages
**Mitigation**: Types package has no dependencies, only exports types

**Risk**: Build cache issues
**Mitigation**: Clear caches and rebuild packages in dependency order

## Related Work

- Spec 001: Storage abstraction
- Spec 013: OpenAlex Walden support (added domains, fields, subfields)
- Spec 014: Edge direction correction
- Spec 015: OpenAlex relationships
- Spec 016: Entity relationship visualization

## Notes

- Taxonomy entities (domains, fields, subfields) were added in previous spec but definitions were scattered
- This centralization enables easier addition of new entity types in the future
- The singular/plural conversion functions enable compatibility with catalogue system
