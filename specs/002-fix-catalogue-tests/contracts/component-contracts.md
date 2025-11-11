# Component Contracts: Catalogue UI Components

**Date**: 2025-11-11
**Feature**: Fix Catalogue E2E Test Failures
**Branch**: `002-fix-catalogue-tests`

## Overview

This document defines the contracts (interfaces, behaviors, test selectors) for all catalogue UI components that need to be fixed or implemented to pass E2E tests.

## CatalogueManager Component

**File**: `apps/web/src/components/catalogue/CatalogueManager.tsx`

### Props

```typescript
interface CatalogueManagerProps {
  onNavigate?: (url: string) => void;
  sharedToken?: string; // For displaying shared lists
}
```

### Responsibilities

1. Display tabs for Lists and Bibliographies
2. Render list cards with selection
3. Show selected list details
4. Provide action buttons: Create, Share, Import, Export
5. Handle modal state for all operations

### Test Selectors

| Element | Selector | Expected Behavior |
|---------|----------|-------------------|
| Main container | `[data-testid="catalogue-manager"]` | Container for all catalogue UI |
| Create button | `button:has-text("Create New List")` | Opens CreateListModal |
| Import button | `button:has-text("Import")` | Opens ImportModal |
| Export button | `button:has-text("Export")` | Opens ExportModal (when list selected) |
| Share button | `button:has-text("Share")` | Opens ShareModal (when list selected) |
| List card | `[data-testid^="list-card-"]` | Clickable card, selects list |
| Selected list title | `[data-testid="selected-list-title"]` | Displays selected list title |
| Selected list details | `[data-testid="selected-list-details"]` | Shows stats, entities |

### State Management

```typescript
const [activeTab, setActiveTab] = useState<string | null>("lists");
const [showCreateModal, setShowCreateModal] = useState(false);
const [showShareModal, setShowShareModal] = useState(false);
const [showImportModal, setShowImportModal] = useState(false);
const [showExportModal, setShowExportModal] = useState(false);
const [shareUrl, setShareUrl] = useState<string>("");
```

### Actions

```typescript
// Create new list
const handleCreate = () => {
  setShowCreateModal(true);
};

// Share list (generate URL)
const handleShare = async () => {
  if (!selectedList) return;
  const token = await generateShareUrl(selectedList.id);
  setShareUrl(`${window.location.origin}/#/catalogue/shared/${token}`);
  setShowShareModal(true);
};

// Export list
const handleExport = () => {
  if (!selectedList) return;
  setShowExportModal(true);
};

// Import list
const handleImport = () => {
  setShowImportModal(true);
};
```

---

## CatalogueEntities Component

**File**: `apps/web/src/components/catalogue/CatalogueEntities.tsx`

### Props

```typescript
interface CatalogueEntitiesProps {
  listId: string;
  entities: CatalogueEntity[];
  onNavigate?: (url: string) => void;
  onEntityUpdate?: () => void; // Callback after entity changes
}
```

### Responsibilities

1. Display list of entities in current list
2. Show empty state when no entities
3. Provide search/filter input
4. Enable bulk selection
5. Show bulk action buttons when entities selected
6. Render individual EntityItem components
7. Handle drag-and-drop reordering

### Test Selectors

| Element | Selector | Expected Behavior |
|---------|----------|-------------------|
| Entity list container | `[data-testid="entities-list"]` | Container for entity cards |
| Search input | `input[placeholder*="Search entities"]` | Filters entities by text |
| Select all button/checkbox | `button:has-text("Select All"), input[type="checkbox"]` | Toggles all entity checkboxes |
| Bulk remove button | `button:has-text("Remove Selected")` | Removes all selected entities |
| Empty state | `text="No entities yet"` | Shown when list is empty |
| Entity count total | `text="Total"` | Shows total entity count |
| Entity count by type | `text="Authors"`, `text="Works"`, `text="Sources"` | Shows counts by entity type |

### State Management

```typescript
const [searchQuery, setSearchQuery] = useState("");
const [selectedEntityIds, setSelectedEntityIds] = useState<Set<string>>(new Set());
const [bulkActionInProgress, setBulkActionInProgress] = useState(false);
```

### Actions

```typescript
// Search/filter entities
const filteredEntities = useMemo(() => {
  if (!searchQuery) return entities;
  const queryLower = searchQuery.toLowerCase();
  return entities.filter(e =>
    e.metadata?.title?.toLowerCase().includes(queryLower) ||
    e.entityType.toLowerCase().includes(queryLower) ||
    e.notes?.toLowerCase().includes(queryLower)
  );
}, [entities, searchQuery]);

// Select all entities
const handleSelectAll = () => {
  if (selectedEntityIds.size === entities.length) {
    setSelectedEntityIds(new Set());
  } else {
    setSelectedEntityIds(new Set(entities.map(e => e.id)));
  }
};

// Bulk remove
const handleBulkRemove = async () => {
  if (!confirm(`Remove ${selectedEntityIds.size} entities?`)) return;
  setBulkActionInProgress(true);
  try {
    for (const entityId of selectedEntityIds) {
      await storage.removeEntityFromList(listId, entityId);
    }
    setSelectedEntityIds(new Set());
    onEntityUpdate?.();
  } finally {
    setBulkActionInProgress(false);
  }
};

// Drag-and-drop reorder
const handleDragEnd = async (event: DragEndEvent) => {
  const { active, over } = event;
  if (!over || active.id === over.id) return;

  const oldIndex = entities.findIndex(e => e.id === active.id);
  const newIndex = entities.findIndex(e => e.id === over.id);

  const reordered = arrayMove(entities, oldIndex, newIndex);
  // Update positions in storage
  for (let i = 0; i < reordered.length; i++) {
    if (reordered[i].position !== i) {
      await storage.updateEntity(reordered[i].id, { position: i });
    }
  }
  onEntityUpdate?.();
};
```

### Drag-and-Drop Implementation

```typescript
import { DndContext, closestCenter, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';

<DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={entities.map(e => e.id)} strategy={verticalListSortingStrategy}>
    {entities.map(entity => (
      <EntityItem
        key={entity.id}
        entity={entity}
        isSelected={selectedEntityIds.has(entity.id)}
        onSelect={handleSelectEntity}
        onRemove={handleRemoveEntity}
        onEditNotes={handleEditNotes}
        showCheckbox={selectedEntityIds.size > 0 || showBulkMode}
      />
    ))}
  </SortableContext>
</DndContext>
```

---

## EntityItem Component

**File**: `apps/web/src/components/catalogue/EntityItem.tsx`

### Props

```typescript
interface EntityItemProps {
  entity: CatalogueEntity;
  isSelected: boolean;
  onSelect: (entityId: string) => void;
  onRemove: (entityId: string) => void;
  onEditNotes: (entityId: string) => void;
  onNavigate?: (url: string) => void;
  showCheckbox: boolean;
}
```

### Responsibilities

1. Display entity card with metadata
2. Show entity type badge (Author/Work/Source)
3. Display entity title and ID
4. Show notes if present
5. Provide action buttons: Edit notes, Remove
6. Support drag-and-drop (via @dnd-kit/sortable)
7. Show checkbox for bulk selection

### Test Selectors

| Element | Selector | Expected Behavior |
|---------|----------|-------------------|
| Entity card | `[data-testid="entity-item"]`, `.entity-card` | Individual entity container |
| Entity type badge | `text="Author"`, `text="Work"`, `text="Source"` | Shows entity type |
| Entity ID | `text="A5017898742"` (example) | Shows OpenAlex ID |
| Edit button | `button:has-text("Edit")`, `[aria-label*="edit"]` | Opens edit notes modal |
| Remove button | `button:has-text("Remove")`, `[aria-label*="remove"]` | Opens remove confirmation |
| Checkbox | `input[type="checkbox"]` | For bulk selection |
| Notes display | `text="This is a test note"` (example) | Shows entity notes |

### Implementation

```typescript
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

export function EntityItem({ entity, isSelected, onSelect, onRemove, onEditNotes, showCheckbox }: EntityItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: entity.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card
      ref={setNodeRef}
      style={style}
      data-testid="entity-item"
      className="entity-card"
    >
      {showCheckbox && (
        <Checkbox
          checked={isSelected}
          onChange={() => onSelect(entity.id)}
        />
      )}
      <Badge>{entity.entityType}</Badge>
      <Text fw={500}>{entity.metadata?.title || 'Untitled'}</Text>
      <Text size="sm" c="dimmed">{entity.entityId}</Text>
      {entity.notes && (
        <Text size="sm" mt="xs">{entity.notes}</Text>
      )}
      <Group>
        <Button
          size="xs"
          variant="light"
          onClick={() => onEditNotes(entity.id)}
          aria-label="Edit notes"
        >
          Edit
        </Button>
        <Button
          size="xs"
          variant="light"
          color="red"
          onClick={() => onRemove(entity.id)}
          aria-label="Remove entity"
        >
          Remove
        </Button>
        <ActionIcon {...attributes} {...listeners} style={{ cursor: 'grab' }}>
          <IconGripVertical size={16} />
        </ActionIcon>
      </Group>
    </Card>
  );
}
```

---

## ShareModal Component

**File**: `apps/web/src/components/catalogue/ShareModal.tsx`

### Props

```typescript
interface ShareModalProps {
  shareUrl: string;
  listTitle: string;
  onClose: () => void;
}
```

### Responsibilities

1. Display share URL input (read-only)
2. Provide copy to clipboard button
3. Show QR code for mobile scanning
4. Provide "Open in new tab" button

### Test Selectors

| Element | Selector | Expected Behavior |
|---------|----------|-------------------|
| Modal | `[role="dialog"]` | Modal container |
| Modal title | `h2:has-text("Share List")` | Modal title |
| Share URL input | `input[value*="catalogue/shared/"]`, `[data-testid="share-url-input"]` | Read-only URL input |
| Copy button | `[data-testid="copy-share-url-button"]` | Copies URL to clipboard |
| QR code button | `[data-testid="toggle-qr-code-button"]`, `button:has-text("Show QR Code")` | Toggles QR code display |
| QR code image | `img[alt*="QR"]`, `img[src*="data:image"]`, `[data-testid="share-qr-code"]` | QR code image element |
| Done button | `button:has-text("Done")` | Closes modal |

### Current Implementation

Already implemented correctly in `ShareModal.tsx`. No changes needed except fixing test selector for QR button.

**Change Required**:
```typescript
// Line 105 - Add data-testid
<Button
  variant={showQR ? "filled" : "outline"}
  leftSection={<IconQrcode size={16} />}
  onClick={() => setShowQR(!showQR)}
  size="sm"
  data-testid="qr-code-button" // Add this line
>
  {showQR ? "Hide" : "Show"} QR Code
</Button>
```

---

## ExportModal Component

**File**: `apps/web/src/components/catalogue/ExportModal.tsx`

### Props

```typescript
interface ExportModalProps {
  listId: string;
  listTitle: string;
  onClose: () => void;
}
```

### Responsibilities

1. Display export format options (Compressed, JSON, CSV, BibTeX)
2. Execute export and download file
3. Show export success message
4. Provide "Copy to Clipboard" option for exported data

### Test Selectors

| Element | Selector | Expected Behavior |
|---------|----------|-------------------|
| Modal | `[role="dialog"]` | Modal container |
| Modal title | `h2:has-text("Export List")` | Modal title |
| Format radio: Compressed | `input[value="compressed"]`, `label:has-text("Compressed Data")` | Select compressed format |
| Format radio: JSON | `input[value="json"]`, `label:has-text("JSON")` | Select JSON format |
| Format radio: CSV | `input[value="csv"]`, `label:has-text("CSV")` | Select CSV format |
| Format radio: BibTeX | `input[value="bibtex"]`, `label:has-text("BibTeX")` | Select BibTeX format |
| Export button | `button:has-text("Export")`, `button:has-text("Download")`, `[data-testid="export-list-button"]` | Executes export |
| Success message | `text="Export successful"`, `text="Downloaded"` | Shows after successful export |

### Required Changes

1. Implement JSON export (currently shows "Not Implemented" notification)
2. Ensure export button has correct text/selector for tests

**JSON Export Implementation**:
```typescript
case "json":
  const listData = await storage.getList(listId);
  const listEntities = await storage.getListEntities(listId);
  data = JSON.stringify({
    list: {
      title: listData.title,
      description: listData.description,
      type: listData.type,
    },
    entities: listEntities.map(e => ({
      entityType: e.entityType,
      entityId: e.entityId,
      notes: e.notes,
      metadata: e.metadata,
    })),
    version: "1.0",
    exportedAt: new Date().toISOString(),
  }, null, 2);
  break;
```

---

## ImportModal Component

**File**: `apps/web/src/components/catalogue/ImportModal.tsx`

### Props

```typescript
interface ImportModalProps {
  onClose: () => void;
  onImportComplete: (listId: string) => void;
}
```

### Responsibilities

1. Accept import data via file upload, URL, or paste
2. Validate imported data structure
3. Show validation errors if data is invalid
4. Display preview of import data (list title, entity count)
5. Handle duplicate detection
6. Execute import and create new list

### Test Selectors

| Element | Selector | Expected Behavior |
|---------|----------|-------------------|
| Modal | `[role="dialog"]` | Modal container |
| Modal title | `h2:has-text("Import List")` | Modal title |
| File input | `input[type="file"]`, `[data-testid="import-file-input"]` | File upload input |
| Paste textarea | `textarea[placeholder*="paste"]`, `[data-testid="import-data-textarea"]` | Manual data entry |
| URL input | `input[placeholder*="URL"]`, `[data-testid="import-url-input"]` | Import from URL |
| Validation error | `text="Invalid"`, `[data-testid="validation-error"]` | Shows validation errors |
| Preview section | `[data-testid="import-preview"]` | Shows import preview |
| Import button | `button:has-text("Import")`, `[data-testid="import-submit-button"]` | Executes import |

### Required Implementation

Complete import functionality with validation and preview.

**Import Flow**:
```typescript
const [importData, setImportData] = useState<string>("");
const [validationState, setValidationState] = useState<ImportValidationState>({
  isValidating: false,
  validationErrors: [],
  previewData: null,
});

const handleValidate = async () => {
  setValidationState(prev => ({ ...prev, isValidating: true }));
  try {
    const parsed = JSON.parse(importData);
    const validation = validateImportData(parsed);

    if (!validation.valid) {
      setValidationState({
        isValidating: false,
        validationErrors: validation.errors,
        previewData: null,
      });
      return;
    }

    // Generate preview
    setValidationState({
      isValidating: false,
      validationErrors: [],
      previewData: {
        list: validation.data.list,
        entities: validation.data.entities,
        duplicateCount: 0, // TODO: Check for duplicates
      },
    });
  } catch (error) {
    setValidationState({
      isValidating: false,
      validationErrors: ["Invalid JSON format"],
      previewData: null,
    });
  }
};

const handleImport = async () => {
  if (!validationState.previewData) return;

  try {
    const listId = await storage.createList({
      title: validationState.previewData.list.title,
      description: validationState.previewData.list.description,
      type: validationState.previewData.list.type,
    });

    await storage.addEntitiesToList(
      listId,
      validationState.previewData.entities.map(e => ({
        entityType: e.entityType,
        entityId: e.entityId,
        notes: e.notes,
        metadata: e.metadata,
      }))
    );

    notifications.show({
      title: "Import Successful",
      message: `Imported list "${validationState.previewData.list.title}"`,
      color: "green",
    });

    onImportComplete(listId);
    onClose();
  } catch (error) {
    logger.error("catalogue-ui", "Import failed", { error });
    notifications.show({
      title: "Import Failed",
      message: "Failed to import list",
      color: "red",
    });
  }
};
```

---

## CreateListModal Component

**File**: `apps/web/src/components/catalogue/CreateListModal.tsx`

### Props

```typescript
interface CreateListModalProps {
  onClose: () => void;
  onListCreated: (listId: string) => void;
  initialType?: 'list' | 'bibliography';
}
```

### Responsibilities

1. Display form with title, description, type inputs
2. Validate title (required, max 200 chars)
3. Create new list in storage
4. Call onListCreated callback with new list ID

### Test Selectors

| Element | Selector | Expected Behavior |
|---------|----------|-------------------|
| Modal | `[role="dialog"]` | Modal container |
| Title input | `input:below(:text("Title"))` | List title input |
| Description textarea | `textarea:below(:text("Description"))` | List description input |
| Type select | `[data-testid="list-type-select"]` | List/Bibliography selector |
| Create button | `button:has-text("Create List")` | Submits form |

### Current Implementation

Already implemented. Verify test selectors match.

---

## Summary

This contract document defines:

1. **Component responsibilities**: What each component should do
2. **Props interfaces**: Type-safe component contracts
3. **Test selectors**: Exact selectors expected by E2E tests
4. **State management**: How components track internal state
5. **Actions**: Key functions each component must implement
6. **Required changes**: Specific fixes needed to pass tests

All selectors align with test expectations from:
- `catalogue-entity-management.e2e.test.ts`
- `catalogue-import-export.e2e.test.ts`
- `catalogue-sharing-functionality.e2e.test.ts`

Implementation should follow this contract exactly to ensure tests pass without modification.
