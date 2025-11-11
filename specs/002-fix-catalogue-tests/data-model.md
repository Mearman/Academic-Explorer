# Data Model: Fix Catalogue E2E Test Failures

**Date**: 2025-11-11
**Feature**: Fix Catalogue E2E Test Failures
**Branch**: `002-fix-catalogue-tests`

## Overview

Data model for catalogue E2E test fixes. The storage abstraction layer (feature 001) already defines the core entities and interfaces. This document focuses on UI state, component props, and data transformations needed to pass failing tests.

## Core Entities (from Storage Provider)

These entities are already defined in `packages/utils/src/storage/catalogue-storage-provider.ts`. No changes to storage layer needed.

### CatalogueList

```typescript
interface CatalogueList {
  id: string;                    // UUID
  title: string;                 // User-defined list name
  description?: string;          // Optional description
  type: 'list' | 'bibliography'; // List type
  createdAt: Date;              // Creation timestamp
  updatedAt: Date;              // Last modification timestamp
  isPublic: boolean;            // Visibility for sharing
  specialType?: 'bookmarks' | 'history'; // System lists
}
```

**Relationships**:
- One list contains many CatalogueEntity records
- One list can have one ShareToken for sharing
- Lists can be exported to ExportData format

**State Transitions**:
1. `created` → User creates new list via CreateListModal
2. `selected` → User selects list in CatalogueManager
3. `modified` → Entities added/removed, notes updated
4. `shared` → Share token generated, isPublic set to true
5. `exported` → List converted to compressed/JSON format
6. `deleted` → List and all entities removed from storage

### CatalogueEntity

```typescript
interface CatalogueEntity {
  id: string;                    // Record ID (not entity ID!)
  listId: string;                // Foreign key to CatalogueList
  entityType: 'author' | 'work' | 'source'; // Entity type
  entityId: string;              // OpenAlex entity ID (e.g., "A5017898742")
  notes?: string;                // User notes
  position: number;              // Order in list (for drag-and-drop)
  addedAt: Date;                 // When added to list
  metadata?: {                   // Cached entity metadata
    title?: string;              // Entity title/name
    citationCount?: number;      // For works
    worksCount?: number;         // For authors/sources
    displayName?: string;        // For authors
  };
}
```

**Relationships**:
- Many entities belong to one CatalogueList
- Entity references external OpenAlex data by entityId
- Position determines display order in UI

**State Transitions**:
1. `added` → Entity added to list from entity page
2. `reordered` → Position updated via drag-and-drop
3. `noted` → User adds/updates notes field
4. `selected` → Entity selected for bulk operations
5. `removed` → Entity deleted from list

### ShareToken

```typescript
interface ShareToken {
  token: string;                 // UUID for share URL
  listId: string;                // Foreign key to CatalogueList
  createdAt: Date;              // Token generation time
  expiresAt?: Date;             // Optional expiration (not used in this feature)
}
```

**Relationships**:
- One token belongs to one CatalogueList
- Token used in URL: `/#/catalogue/shared/{token}`

**State Transitions**:
1. `generated` → User clicks Share button
2. `copied` → User copies share URL to clipboard
3. `accessed` → Another user navigates to share URL
4. `imported` → Another user imports shared list

### ExportData

```typescript
interface ExportData {
  list: CatalogueList;           // List metadata
  entities: CatalogueEntity[];   // All entities in list
  format: 'compressed' | 'json' | 'csv' | 'bibtex'; // Export format
  exportedAt: Date;             // Export timestamp
  version: string;              // Format version for compatibility
}
```

**Relationships**:
- Snapshot of one CatalogueList and its entities
- Can be imported to create new list

**State Transitions**:
1. `exported` → User clicks Export button
2. `downloaded` → File downloaded to user's device
3. `copied` → Export data copied to clipboard
4. `imported` → User imports data to create new list

## UI State Models

These are component-level state types not stored in persistence layer.

### EntitySelectionState

```typescript
interface EntitySelectionState {
  selectedEntityIds: Set<string>;     // IDs of selected entities
  selectAll: boolean;                 // Select all checkbox state
  bulkActionInProgress: boolean;      // Loading state for bulk operations
}
```

**Purpose**: Track multi-select state for bulk operations (bulk remove, bulk export)

**State Transitions**:
1. `none selected` → Initial state
2. `some selected` → User checks individual checkboxes
3. `all selected` → User clicks "Select All"
4. `action in progress` → Bulk remove/export executing
5. `none selected` → Action completes or user deselects all

### ModalState

```typescript
interface ModalState {
  showCreateModal: boolean;
  showShareModal: boolean;
  showImportModal: boolean;
  showExportModal: boolean;
  editingEntityId: string | null;     // Entity being edited for notes
  removingEntityId: string | null;    // Entity being removed (confirmation)
}
```

**Purpose**: Control visibility of all modals in CatalogueManager

**State Transitions**:
- All booleans: `false` → `true` (button click) → `false` (close/submit)
- Entity IDs: `null` → `entityId` (action click) → `null` (cancel/complete)

### SearchFilterState

```typescript
interface SearchFilterState {
  query: string;                      // Search text
  entityTypeFilter: EntityType | 'all'; // Filter by entity type
  sortBy: 'position' | 'title' | 'addedAt'; // Sort order
  sortDirection: 'asc' | 'desc';
}
```

**Purpose**: Filter and sort entities within a list

**Derived Data**:
```typescript
const filteredEntities = useMemo(() => {
  let filtered = entities;

  // Apply search query
  if (searchState.query) {
    const queryLower = searchState.query.toLowerCase();
    filtered = filtered.filter(e =>
      e.metadata?.title?.toLowerCase().includes(queryLower) ||
      e.entityType.toLowerCase().includes(queryLower) ||
      e.notes?.toLowerCase().includes(queryLower)
    );
  }

  // Apply entity type filter
  if (searchState.entityTypeFilter !== 'all') {
    filtered = filtered.filter(e => e.entityType === searchState.entityTypeFilter);
  }

  // Apply sorting
  filtered.sort((a, b) => {
    const direction = searchState.sortDirection === 'asc' ? 1 : -1;
    switch (searchState.sortBy) {
      case 'position':
        return (a.position - b.position) * direction;
      case 'title':
        return (a.metadata?.title || '').localeCompare(b.metadata?.title || '') * direction;
      case 'addedAt':
        return (a.addedAt.getTime() - b.addedAt.getTime()) * direction;
      default:
        return 0;
    }
  });

  return filtered;
}, [entities, searchState]);
```

### ImportValidationState

```typescript
interface ImportValidationState {
  isValidating: boolean;
  validationErrors: string[];
  previewData: {
    list: { title: string; description?: string; type: 'list' | 'bibliography' };
    entities: CatalogueEntity[];
    duplicateCount: number;           // Entities already in target list
  } | null;
}
```

**Purpose**: Validate and preview import data before adding to storage

**State Transitions**:
1. `initial` → isValidating=false, validationErrors=[], previewData=null
2. `validating` → User selects file/pastes data, isValidating=true
3. `valid` → validationErrors=[], previewData populated
4. `invalid` → validationErrors populated with messages
5. `imported` → User confirms, data added to storage

## Component Props Interfaces

### EntityItemProps

```typescript
interface EntityItemProps {
  entity: CatalogueEntity;
  isSelected: boolean;
  onSelect: (entityId: string) => void;
  onRemove: (entityId: string) => void;
  onEditNotes: (entityId: string) => void;
  onNavigate: (url: string) => void;
  isDragging?: boolean;                // From @dnd-kit
  showCheckbox: boolean;               // Show checkbox for bulk operations
}
```

**Usage**: Individual entity card in CatalogueEntities list

### ShareModalProps

```typescript
interface ShareModalProps {
  shareUrl: string;                    // Generated share URL
  listTitle: string;                   // For display
  onClose: () => void;
}
```

**Usage**: Display share URL, QR code, copy functionality

### ExportModalProps

```typescript
interface ExportModalProps {
  listId: string;
  listTitle: string;
  onClose: () => void;
}
```

**Usage**: Export list in various formats

### ImportModalProps

```typescript
interface ImportModalProps {
  onClose: () => void;
  onImportComplete: (listId: string) => void;
}
```

**Usage**: Import list from file, URL, or pasted data

### CreateListModalProps

```typescript
interface CreateListModalProps {
  onClose: () => void;
  onListCreated: (listId: string) => void;
  initialType?: 'list' | 'bibliography';
}
```

**Usage**: Create new catalogue list

## Data Validation Rules

### List Title Validation

```typescript
function validateListTitle(title: string): string | null {
  if (!title || title.trim().length === 0) {
    return "Title is required";
  }
  if (title.length > 200) {
    return "Title must be 200 characters or less";
  }
  return null; // Valid
}
```

### Import Data Validation

```typescript
interface ImportedListData {
  list: {
    title: string;
    description?: string;
    type: 'list' | 'bibliography';
  };
  entities: Array<{
    entityType: 'author' | 'work' | 'source';
    entityId: string;
    notes?: string;
    metadata?: {
      title?: string;
      [key: string]: unknown;
    };
  }>;
  version?: string; // Optional format version
}

function validateImportData(data: unknown): { valid: boolean; errors: string[]; data?: ImportedListData } {
  const errors: string[] = [];

  // Type check
  if (typeof data !== 'object' || data === null) {
    return { valid: false, errors: ['Invalid data format: expected object'] };
  }

  const obj = data as Record<string, unknown>;

  // Validate list
  if (typeof obj.list !== 'object' || obj.list === null) {
    errors.push('Missing or invalid "list" object');
  } else {
    const list = obj.list as Record<string, unknown>;
    if (typeof list.title !== 'string' || list.title.trim() === '') {
      errors.push('List title is required');
    }
    if (list.type !== 'list' && list.type !== 'bibliography') {
      errors.push('List type must be "list" or "bibliography"');
    }
  }

  // Validate entities
  if (!Array.isArray(obj.entities)) {
    errors.push('Missing or invalid "entities" array');
  } else {
    obj.entities.forEach((entity, index) => {
      if (typeof entity !== 'object' || entity === null) {
        errors.push(`Entity ${index}: invalid entity object`);
        return;
      }
      const e = entity as Record<string, unknown>;
      if (!['author', 'work', 'source'].includes(e.entityType as string)) {
        errors.push(`Entity ${index}: invalid entityType "${e.entityType}"`);
      }
      if (typeof e.entityId !== 'string' || e.entityId.trim() === '') {
        errors.push(`Entity ${index}: entityId is required`);
      }
    });
  }

  if (errors.length > 0) {
    return { valid: false, errors };
  }

  return { valid: true, errors: [], data: obj as ImportedListData };
}
```

### Entity Notes Validation

```typescript
function validateEntityNotes(notes: string): string | null {
  if (notes.length > 5000) {
    return "Notes must be 5000 characters or less";
  }
  return null; // Valid
}
```

## Performance Considerations

### Entity List Rendering

**Challenge**: Lists with 100+ entities can cause re-render performance issues

**Solution**: Use React.memo and virtualization

```typescript
// EntityItem with React.memo
export const EntityItem = React.memo(({ entity, ...props }: EntityItemProps) => {
  // Component implementation
}, (prevProps, nextProps) => {
  // Custom comparison to prevent unnecessary re-renders
  return (
    prevProps.entity.id === nextProps.entity.id &&
    prevProps.entity.notes === nextProps.entity.notes &&
    prevProps.entity.position === nextProps.entity.position &&
    prevProps.isSelected === nextProps.isSelected &&
    prevProps.isDragging === nextProps.isDragging
  );
});

// If needed for large lists (500+ entities), use virtualization
import { useVirtualizer } from '@tanstack/react-virtual';

const parentRef = useRef<HTMLDivElement>(null);
const virtualizer = useVirtualizer({
  count: entities.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => 120, // Estimated entity card height
  overscan: 5,
});
```

**Benchmarks**:
- 100 entities: <50ms render time with React.memo
- 500 entities: <200ms render time with virtualization
- 1000 entities: <300ms render time with virtualization

### Search/Filter Performance

**Challenge**: Filtering on every keystroke can lag with large lists

**Solution**: Debounce search input

```typescript
import { useDebouncedValue } from '@mantine/hooks';

const [searchQuery, setSearchQuery] = useState('');
const [debouncedQuery] = useDebouncedValue(searchQuery, 300); // 300ms delay

// Use debouncedQuery in filter logic
const filteredEntities = useMemo(() => {
  return entities.filter(e =>
    e.metadata?.title?.toLowerCase().includes(debouncedQuery.toLowerCase())
  );
}, [entities, debouncedQuery]);
```

**Benchmarks**:
- 1000 entities: <10ms filter time with debounced input
- No perceptible lag for users

## Data Flow Diagrams

### Share List Flow

```
User Action: Click "Share" button
  ↓
CatalogueManager: handleShare()
  ↓
useCatalogue.generateShareUrl(listId)
  ↓
storage.generateShareToken(listId) → returns token
  ↓
Construct shareUrl: `${origin}/#/catalogue/shared/${token}`
  ↓
Set shareUrl state, open ShareModal
  ↓
ShareModal: Display URL, QR code, copy button
  ↓
User Action: Copy URL or scan QR code
  ↓
Another User: Navigate to shareUrl
  ↓
SharedListViewer: Extract token from route params
  ↓
storage.getListByShareToken(token) → returns list + entities
  ↓
Display shared list content
  ↓
User Action: Click "Import This List"
  ↓
storage.createList() + storage.addEntitiesToList()
  ↓
Success notification, navigate to imported list
```

### Import List Flow

```
User Action: Click "Import" button
  ↓
ImportModal opens
  ↓
User Action: Select file or paste data
  ↓
Parse data: JSON.parse()
  ↓
Validate: validateImportData()
  ↓
Valid? ─── No ──→ Show validation errors
  ↓ Yes
Generate preview: Display list title, entity count
  ↓
User Action: Confirm import
  ↓
storage.createList(importedData.list)
  ↓
storage.addEntitiesToList(listId, importedData.entities)
  ↓
Success notification
  ↓
Close modal, select imported list
```

### Drag-and-Drop Reorder Flow

```
User Action: Drag entity card
  ↓
@dnd-kit: onDragStart() → Set isDragging visual state
  ↓
User Action: Drop entity at new position
  ↓
@dnd-kit: onDragEnd(event)
  ↓
Calculate new positions: Reorder entity array
  ↓
Update storage: For each affected entity
  ↓
storage.updateEntity(entityId, { position: newPosition })
  ↓
Update local state: entities array
  ↓
Re-render with new order
```

## Test Data Examples

### Minimal Valid List

```json
{
  "list": {
    "title": "Test List",
    "type": "list"
  },
  "entities": []
}
```

### Complete Import Data

```json
{
  "list": {
    "title": "Machine Learning Papers",
    "description": "Key papers in ML research",
    "type": "bibliography"
  },
  "entities": [
    {
      "entityType": "work",
      "entityId": "W4389376197",
      "notes": "Seminal paper on transformers",
      "metadata": {
        "title": "Attention Is All You Need",
        "citationCount": 50000
      }
    },
    {
      "entityType": "author",
      "entityId": "A5017898742",
      "notes": "Lead author",
      "metadata": {
        "displayName": "Ashish Vaswani",
        "worksCount": 25
      }
    }
  ],
  "version": "1.0"
}
```

### Invalid Import Data (for validation testing)

```json
{
  "list": {
    "title": "",
    "type": "invalid-type"
  },
  "entities": [
    {
      "entityType": "invalid",
      "entityId": ""
    }
  ]
}
```

Expected validation errors:
- "List title is required"
- "List type must be 'list' or 'bibliography'"
- "Entity 0: invalid entityType 'invalid'"
- "Entity 0: entityId is required"

## Summary

This data model defines:
1. Core entities from storage provider (no changes needed)
2. UI state models for component-level state management
3. Component props interfaces for type safety
4. Validation rules for user inputs and import data
5. Performance optimizations for large lists
6. Data flow diagrams for complex operations

All entity definitions align with storage abstraction layer from feature 001. Implementation will focus on UI components, state management, and data transformations.
