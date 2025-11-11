# Catalogue Feature Contracts

**Feature**: 004-fix-failing-tests
**Created**: 2025-11-11

## Overview

This directory contains TypeScript interface definitions that serve as contracts between different parts of the catalogue feature. These contracts define the API surface that components and hooks must implement to pass the E2E tests.

## Files

### `types.ts`

Core type definitions used throughout the catalogue feature:

- **Entity Types**: `EntityType` enum and discriminated union types for all 8 OpenAlex entity types
- **Data Models**: `CatalogueList`, `CatalogueEntity`, `EntityMetadata` interfaces
- **Import/Export**: `ExportFormat` interface for data serialization
- **Component Props**: Props interfaces for all catalogue React components
- **Type Guards**: Runtime type narrowing functions (`isWorkMetadata`, etc.)
- **Validation**: `validateExportFormat` function for import data validation
- **Constants**: Labels, colors, limits for entity types and lists

### `useCatalogue.interface.ts`

Interface definition for the primary catalogue hook (`useCatalogue`):

- **State Management**: Lists, entities, loading states, errors
- **List Operations**: Create, update, delete, select lists
- **Entity Operations**: Add, remove, reorder, bulk operations
- **Search/Filter**: Query entities by text or type
- **Import/Export**: Export to files/compressed format, import from files/URLs
- **Sharing**: Generate share URLs, QR codes, import from shares
- **Utility Functions**: Clipboard, validation, preview

## Usage in Implementation

### For Component Developers

Components should import types and use them for props validation:

```typescript
import type { CatalogueListProps } from './contracts/types';

export function CatalogueList({ listId, onEntitySelect, onEntityRemove }: CatalogueListProps) {
  // Implementation
}
```

### For Hook Developers

The `useCatalogue` hook must implement the full `UseCatalogueReturn` interface:

```typescript
import type { UseCatalogueReturn } from './contracts/useCatalogue.interface';

export function useCatalogue(): UseCatalogueReturn {
  // Implementation must satisfy all methods and properties
  return {
    lists,
    currentList,
    currentEntities,
    isLoading,
    error,
    createList,
    updateList,
    // ... all other methods
  };
}
```

### For Type Safety

Use type guards for runtime type discrimination:

```typescript
import { isWorkMetadata, isAuthorMetadata } from './contracts/types';

function renderEntityMetadata(metadata: EntityMetadata) {
  if (isWorkMetadata(metadata)) {
    return `${metadata.citedByCount} citations`; // TypeScript knows this is WorkMetadata
  }
  if (isAuthorMetadata(metadata)) {
    return `${metadata.worksCount} works`; // TypeScript knows this is AuthorMetadata
  }
  // ... handle other types
}
```

### For Data Validation

Use validation functions for import/export:

```typescript
import { validateExportFormat } from './contracts/types';

async function importFromURL(dataParam: string) {
  const decompressed = decompressData(dataParam);
  const parsed = JSON.parse(decompressed);

  validateExportFormat(parsed); // Throws if invalid
  // TypeScript now knows parsed is ExportFormat

  await importList(parsed);
}
```

## Contract Compliance

All implementations must:

1. **Type Safety**: Use discriminated unions, never `any` types
2. **Error Handling**: Throw descriptive errors as documented in JSDoc
3. **Async Operations**: Return Promises for all async operations
4. **Immutability**: Don't mutate state objects, return new objects
5. **Validation**: Validate inputs before processing
6. **Storage Abstraction**: Use the hook, not direct Dexie calls

## Testing Against Contracts

E2E tests validate these contracts:

- Tests 64-72: Entity management operations (add, remove, reorder, notes, bulk ops)
- Tests 73-81: Import/export functionality (compressed, file upload, validation)
- Tests 89-97: Sharing functionality (URLs, QR codes, import from share)
- Test 87: UI component rendering with proper ARIA attributes

## Version Compatibility

Current contract version: 1.0

Breaking changes to these interfaces require:
1. Version bump in `ExportFormat.version`
2. Migration logic for existing data
3. Updated E2E tests
4. Documentation of breaking changes

## References

- [Feature Specification](../spec.md)
- [Data Model](../data-model.md)
- [Implementation Plan](../plan.md)
- [Academic Explorer Constitution](../../../.specify/memory/constitution.md)
