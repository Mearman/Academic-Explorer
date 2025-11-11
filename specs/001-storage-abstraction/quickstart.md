# Quickstart: Storage Abstraction Layer

**Feature**: Storage Abstraction Layer ([spec.md](./spec.md))
**Date**: 2025-11-11
**Purpose**: Developer guide for using catalogue storage providers

## Overview

The storage abstraction layer allows you to swap between different storage backends (IndexedDB for production, in-memory for testing) without changing your application code. This guide will help you get started with using storage providers in your application.

---

## Table of Contents

1. [Installation](#installation)
2. [Basic Usage](#basic-usage)
3. [Production Setup](#production-setup)
4. [Testing Setup](#testing-setup)
5. [Common Operations](#common-operations)
6. [Error Handling](#error-handling)
7. [Best Practices](#best-practices)
8. [Troubleshooting](#troubleshooting)

---

## Installation

The storage abstraction layer is part of the `@academic-explorer/utils` package. No additional dependencies are required.

```typescript
// Import types and providers
import type { CatalogueStorageProvider } from '@academic-explorer/utils';
import { IndexedDBStorageProvider, InMemoryStorageProvider } from '@academic-explorer/utils';
```

---

## Basic Usage

### 1. Create a Storage Provider

**Production (IndexedDB)**:
```typescript
import { IndexedDBStorageProvider } from '@academic-explorer/utils';
import { logger } from '@academic-explorer/utils/logger';

const storageProvider = new IndexedDBStorageProvider(logger);
```

**Testing (In-Memory)**:
```typescript
import { InMemoryStorageProvider } from '@academic-explorer/utils';

const storageProvider = new InMemoryStorageProvider();
```

### 2. Initialize Special Lists

Always initialize special system lists (Bookmarks, History) on app startup:

```typescript
await storageProvider.initializeSpecialLists();
```

### 3. Use in React Components

**With Context (Recommended)**:
```typescript
import { useStorageProvider } from '@/contexts/storage-provider-context';

export function CatalogueManager() {
  const storage = useStorageProvider();

  const createNewList = async () => {
    try {
      const listId = await storage.createList({
        title: "My Research Papers",
        description: "Papers for thesis Chapter 3",
        type: "bibliography",
        tags: ["thesis", "chapter-3"],
      });
      console.log(`Created list: ${listId}`);
    } catch (error) {
      console.error("Failed to create list", error);
    }
  };

  return (
    <button onClick={createNewList}>Create List</button>
  );
}
```

---

## Production Setup

### Step 1: Create Provider in main.tsx

```typescript
// apps/web/src/main.tsx
import { IndexedDBStorageProvider } from '@academic-explorer/utils';
import { StorageProviderWrapper } from '@/contexts/storage-provider-context';
import { logger } from '@academic-explorer/utils/logger';

// Create production storage provider
const storageProvider = new IndexedDBStorageProvider(logger);

// Initialize on app start
await storageProvider.initializeSpecialLists();

// Wrap app with provider
createRoot(rootElement).render(
  <StorageProviderWrapper provider={storageProvider}>
    <App />
  </StorageProviderWrapper>
);
```

### Step 2: Use in Components

```typescript
// apps/web/src/hooks/useCatalogue.ts
import { useStorageProvider } from '@/contexts/storage-provider-context';

export function useCatalogue() {
  const storage = useStorageProvider();

  const refreshLists = useCallback(async () => {
    setIsLoadingLists(true);
    try {
      const allLists = await storage.getAllLists();
      setLists(allLists);
    } catch (error) {
      logger.error("Failed to refresh lists", error);
    } finally {
      setIsLoadingLists(false);
    }
  }, [storage]);

  return { lists, refreshLists, /* ... other methods */ };
}
```

---

## Testing Setup

### Unit Tests (Vitest)

```typescript
// Component.test.tsx
import { render, screen } from '@testing-library/react';
import { StorageProviderWrapper } from '@/contexts/storage-provider-context';
import { InMemoryStorageProvider } from '@academic-explorer/utils';
import { CatalogueManager } from './CatalogueManager';

describe('CatalogueManager', () => {
  let testStorage: InMemoryStorageProvider;

  beforeEach(() => {
    // Create fresh storage for each test
    testStorage = new InMemoryStorageProvider();
  });

  afterEach(() => {
    // Clean up storage
    testStorage.clear();
  });

  it('should create a new list', async () => {
    render(
      <StorageProviderWrapper provider={testStorage}>
        <CatalogueManager />
      </StorageProviderWrapper>
    );

    // Test list creation...
    await userEvent.click(screen.getByRole('button', { name: /create/i }));

    // Verify directly in storage
    const lists = await testStorage.getAllLists();
    expect(lists).toHaveLength(1);
    expect(lists[0].title).toBe("My Research Papers");
  });

  it('should have isolated storage between tests', async () => {
    // This test starts with clean storage
    const lists = await testStorage.getAllLists();
    expect(lists).toHaveLength(0); // Passes because beforeEach creates new instance
  });
});
```

### E2E Tests (Playwright)

```typescript
// Playwright global setup (playwright.global-setup.ts)
import { InMemoryStorageProvider } from '@academic-explorer/utils';

async function globalSetup(config: FullConfig) {
  // Playwright tests use real IndexedDB in the browser
  // No special configuration needed - the app will use IndexedDBStorageProvider
  // IndexedDB state persists via storageState({ indexedDB: true })
}
```

**Test File**:
```typescript
// catalogue-entity-management.e2e.test.ts
import { test, expect } from '@playwright/test';

test.beforeEach(async ({ page }) => {
  // Navigate to catalogue page
  await page.goto('http://localhost:5173/#/catalogue');
  await page.waitForLoadState('networkidle');
});

test('should add entities to catalogue', async ({ page }) => {
  // Create a test list
  await page.getByRole('button', { name: /create new list/i }).click();
  await page.getByLabel('Title').fill('Entity Test List');
  await page.getByRole('button', { name: /save/i }).click();

  // Wait for list to appear
  await expect(page.getByText('Entity Test List')).toBeVisible();

  // Navigate to entity page
  await page.goto('http://localhost:5173/#/authors/A5017898742');

  // Add to catalogue
  await page.getByTestId('add-to-catalogue-button').click();
  await page.getByTestId('add-to-list-select').click();
  await page.getByRole('option', { name: 'Entity Test List' }).click();
  await page.getByTestId('add-to-list-submit').click();

  // Verify success
  await expect(page.getByText('Added to List')).toBeVisible({ timeout: 2000 });
});
```

---

## Common Operations

### Create a List

```typescript
const listId = await storage.createList({
  title: "Cultural Heritage ML Papers",
  description: "Research papers for thesis methodology",
  type: "bibliography", // or "list"
  tags: ["machine-learning", "cultural-heritage", "thesis"],
  isPublic: false,
});
```

### Add Entity to List

```typescript
const entityRecordId = await storage.addEntityToList({
  listId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
  entityType: "works",
  entityId: "W2741809807",
  notes: "Key paper for methodology section - cite in Chapter 3",
});
```

### Get All Lists

```typescript
const lists = await storage.getAllLists();
// Returns lists sorted by updatedAt (most recent first)

lists.forEach(list => {
  console.log(`${list.title} (${list.type})`);
  if (list.isPublic && list.shareToken) {
    console.log(`  Share: /shared/${list.shareToken}`);
  }
});
```

### Get Entities in a List

```typescript
const entities = await storage.getListEntities(listId);
// Returns entities sorted by position

entities.forEach((entity, index) => {
  console.log(`${index + 1}. ${entity.entityType}: ${entity.entityId}`);
  if (entity.notes) {
    console.log(`   Notes: ${entity.notes}`);
  }
});
```

### Search Lists

```typescript
const results = await storage.searchLists("machine learning");
// Searches title, description, and tags (case-insensitive)

console.log(`Found ${results.length} matching lists`);
```

### Share a List

```typescript
const shareToken = await storage.generateShareToken(listId);
const shareUrl = `${window.location.origin}/shared/${shareToken}`;

console.log(`Share this list: ${shareUrl}`);
// Token is valid for 1 year by default
```

### Access Shared List

```typescript
const result = await storage.getListByShareToken(shareToken);

if (result.valid && result.list) {
  console.log(`Viewing: ${result.list.title}`);
  console.log(`Created by: ${result.list.createdAt}`);

  // Get entities
  const entities = await storage.getListEntities(result.list.id);
  console.log(`Contains ${entities.length} entities`);
} else {
  console.error("Invalid or expired share link");
}
```

### Bookmarks

```typescript
// Add bookmark
await storage.addBookmark({
  entityType: "works",
  entityId: "W2741809807",
  url: "https://openalex.org/W2741809807",
  title: "ML for Cultural Heritage",
  notes: "Important reference for Chapter 3",
});

// Check if bookmarked
const isBookmarked = await storage.isBookmarked("works", "W2741809807");
if (isBookmarked) {
  console.log("Already bookmarked");
}

// Get all bookmarks
const bookmarks = await storage.getBookmarks();
console.log(`You have ${bookmarks.length} bookmarks`);
```

### History

```typescript
// Add to history
await storage.addToHistory({
  entityType: "works",
  entityId: "W2741809807",
  url: "/works/W2741809807",
  title: "ML for Cultural Heritage",
});

// Get history
const history = await storage.getHistory();
history.forEach(entry => {
  console.log(`${entry.entityType}: ${entry.entityId} at ${entry.addedAt}`);
});

// Clear history
await storage.clearHistory();
```

---

## Error Handling

### Try-Catch Pattern

All storage operations return Promises and throw errors for failure cases:

```typescript
try {
  const listId = await storage.createList({ title: "New List", type: "list" });
  console.log(`Success: ${listId}`);
} catch (error) {
  if (error instanceof Error) {
    console.error(`Failed: ${error.message}`);
  }
}
```

### Common Errors

| Error | Cause | Solution |
|-------|-------|----------|
| `"List not found"` | Trying to operate on non-existent list | Check list exists with `getList()` first |
| `"Entity already exists in list"` | Duplicate entity in list | Check with `getListEntities()` before adding |
| `"Cannot delete special system list"` | Trying to delete Bookmarks/History | Use `isSpecialList()` to check first |
| `"Bibliographies can only contain works"` | Wrong entity type for bibliography | Validate entity type matches list type |
| `"Storage provider not configured"` | Using `useStorageProvider()` outside context | Wrap app with `StorageProviderWrapper` |

### Null vs Errors

Some operations return `null` instead of throwing:

```typescript
// Returns null if list doesn't exist (NOT an error)
const list = await storage.getList("non-existent-id");
if (list === null) {
  console.log("List not found");
}

// Returns empty array if no lists exist (NOT an error)
const lists = await storage.getAllLists();
if (lists.length === 0) {
  console.log("No lists yet");
}

// THROWS error if list doesn't exist (IS an error)
try {
  await storage.updateList("non-existent-id", { title: "New Title" });
} catch (error) {
  console.error("Cannot update non-existent list");
}
```

---

## Best Practices

### 1. Always Initialize Special Lists

```typescript
// ✅ Good: Initialize on app startup
const storageProvider = new IndexedDBStorageProvider(logger);
await storageProvider.initializeSpecialLists();

// ❌ Bad: Forgetting to initialize
const storageProvider = new IndexedDBStorageProvider(logger);
// Later: await storage.addBookmark(...) might fail
```

### 2. Use Context for React Components

```typescript
// ✅ Good: Inject via Context
export function MyComponent() {
  const storage = useStorageProvider();
  // ...
}

// ❌ Bad: Import singleton directly
import { catalogueService } from '@academic-explorer/utils';
export function MyComponent() {
  // Can't swap for testing
}
```

### 3. Clean Up in Tests

```typescript
// ✅ Good: Isolated tests
let testStorage: InMemoryStorageProvider;

beforeEach(() => {
  testStorage = new InMemoryStorageProvider();
});

afterEach(() => {
  testStorage.clear(); // Prevent test pollution
});

// ❌ Bad: Shared storage
const testStorage = new InMemoryStorageProvider(); // Shared across tests
```

### 4. Validate Before Operating

```typescript
// ✅ Good: Check before operating
const list = await storage.getList(listId);
if (!list) {
  throw new Error("List not found");
}

if (storage.isSpecialList(listId)) {
  throw new Error("Cannot delete system list");
}

await storage.deleteList(listId);

// ❌ Bad: Assume list exists
await storage.deleteList(listId); // Throws if not found
```

### 5. Handle Async Properly

```typescript
// ✅ Good: Await promises
const listId = await storage.createList({ title: "New List", type: "list" });
const entities = await storage.getListEntities(listId);

// ❌ Bad: Forget await
const listId = storage.createList({ title: "New List", type: "list" }); // Returns Promise!
const entities = storage.getListEntities(listId); // listId is a Promise, not a string!
```

### 6. Batch Operations When Possible

```typescript
// ✅ Good: Batch add
const result = await storage.addEntitiesToList(listId, [
  { entityType: "works", entityId: "W123" },
  { entityType: "works", entityId: "W456" },
  { entityType: "works", entityId: "W789" },
]);
console.log(`Added ${result.success} of 3 entities`);

// ❌ Bad: Multiple single adds
for (const entity of entities) {
  await storage.addEntityToList({ listId, ...entity });
}
```

---

## Troubleshooting

### Problem: "Storage provider not configured" error

**Cause**: Using `useStorageProvider()` hook outside of `StorageProviderWrapper` context.

**Solution**:
```typescript
// Wrap your app in main.tsx
<StorageProviderWrapper provider={storageProvider}>
  <App />
</StorageProviderWrapper>
```

### Problem: E2E tests hang on storage operations

**Cause**: IndexedDB operations hanging in Playwright browser context (the reason for this feature!).

**Solution**: Ensure you're using the in-memory provider in E2E test setup:
```typescript
// Playwright should use real IndexedDB (with persistence enabled)
// Or inject in-memory provider via global setup if needed
```

### Problem: Tests fail with stale data

**Cause**: Not cleaning up storage between tests.

**Solution**:
```typescript
afterEach(() => {
  testStorage.clear(); // Clean up after each test
});
```

### Problem: "Entity already exists in list" error

**Cause**: Trying to add duplicate entity to list.

**Solution**:
```typescript
// Check before adding
const entities = await storage.getListEntities(listId);
const exists = entities.some(
  e => e.entityType === newEntity.entityType && e.entityId === newEntity.entityId
);

if (!exists) {
  await storage.addEntityToList({ listId, ...newEntity });
}
```

### Problem: Type errors with imports

**Cause**: Incorrect import path.

**Solution**:
```typescript
// ✅ Good: Import from package
import type { CatalogueStorageProvider } from '@academic-explorer/utils';
import { IndexedDBStorageProvider } from '@academic-explorer/utils';

// ❌ Bad: Import from internal path
import type { CatalogueStorageProvider } from '@academic-explorer/utils/storage/storage-provider';
```

---

## Next Steps

1. **Implement Your Feature**: Use the storage provider in your components
2. **Write Tests**: Create unit tests with in-memory provider
3. **Verify E2E**: Run Playwright tests to ensure no IndexedDB hanging
4. **Monitor Performance**: Check that storage operations complete in <2s

**Need Help?**
- See [spec.md](./spec.md) for functional requirements
- See [data-model.md](./data-model.md) for entity relationships
- See [contracts/storage-provider.ts](./contracts/storage-provider.ts) for complete API reference
- Check [research.md](./research.md) for technical decisions and rationale

---

**Happy coding!** 🚀
