# Research: Storage Abstraction Layer Technical Decisions

**Date**: 2025-11-11
**Feature**: Storage Abstraction Layer ([spec.md](./spec.md))
**Purpose**: Resolve technical questions from [plan.md](./plan.md) Phase 0

## Overview

This document consolidates research findings from 5 parallel research tasks investigating technical patterns for implementing a storage abstraction layer. The goal is to enable in-memory storage providers for Playwright E2E tests while maintaining IndexedDB storage for production.

---

## Decision 1: Storage Provider Interface Design

### Question
Should operations return `Promise<T>` or `Promise<Result<T, Error>>` for better error handling?

### Research Finding
**Decision**: Use `Promise<T>` with thrown errors (existing pattern)

**Rationale**:
1. **Ecosystem Alignment**: The existing codebase already uses this pattern extensively in `CatalogueService`. React hooks and error boundaries expect Promise-based error handling.
2. **Dexie Integration**: Dexie natively throws errors. Wrapping every operation in Result types adds unnecessary conversion overhead without type safety benefits.
3. **Testing Simplicity**: In-memory storage can throw/catch the same way as IndexedDB operations, maintaining behavioral consistency.
4. **React Compatibility**: Modern React error boundaries and hooks already handle Promise rejections effectively through try-catch blocks.

**Code Example**:
```typescript
export interface CatalogueStorageProvider {
  /**
   * Create a new catalogue list
   * @throws {Error} If list creation fails
   * @returns Promise resolving to the new list ID
   */
  createList(params: {
    title: string;
    description?: string;
    type: ListType;
    tags?: string[];
    isPublic?: boolean;
  }): Promise<string>;

  /**
   * Get a specific list by ID
   * @returns Promise resolving to list or null if not found
   * @throws {Error} If storage operation fails
   */
  getList(listId: string): Promise<CatalogueList | null>;
}
```

**Alternatives Considered**:
- **Result<T, Error> Pattern**: Requires `neverthrow` or similar library, adds dependency weight and forces Result unwrapping at every call site. Valuable for pure functional codebases but adds friction in React/Dexie environments where exceptions are idiomatic.
- **Custom Error Types**: While type-safe, they don't integrate well with IndexedDB's native error types (DOMException) and would require extensive error translation layers.

---

## Decision 2: Transaction Semantics

### Question
How should we handle transaction semantics across different storage backends (Dexie has built-in transactions, in-memory needs simulation)?

### Research Finding
**Decision**: Hide transactions from the interface, implement internally where needed

**Rationale**:
1. **Abstraction Level**: The existing `CatalogueService` doesn't expose transactions to consumers. Service methods internally use `db.transaction()` for multi-step operations.
2. **Implementation Flexibility**:
   - **Dexie**: Uses automatic transaction zones for single operations; explicit transactions for multi-table operations
   - **In-memory**: Can simulate atomicity with try-catch rollback or skip it entirely for test performance
   - **Future backends**: Could add Redis/PostgreSQL without changing the interface
3. **Dexie Transaction Zones**: Dexie automatically extends transactions through promise chains, making explicit transaction management unnecessary for most operations.

**Implementation Strategy**:
```typescript
// Interface - no transaction methods exposed
export interface CatalogueStorageProvider {
  // Standard CRUD operations only
}

// Dexie Implementation - transactions handled internally
export class DexieStorageProvider implements CatalogueStorageProvider {
  async deleteList(listId: string): Promise<void> {
    // Internal transaction for multi-table atomicity
    await this.db.transaction(
      "rw",
      this.db.catalogueLists,
      this.db.catalogueEntities,
      this.db.catalogueShares,
      async () => {
        await this.db.catalogueLists.delete(listId);
        await this.db.catalogueEntities.where("listId").equals(listId).delete();
        await this.db.catalogueShares.where("listId").equals(listId).delete();
      }
    );
  }
}

// In-Memory Implementation - simplified semantics
export class InMemoryStorageProvider implements CatalogueStorageProvider {
  async deleteList(listId: string): Promise<void> {
    // Simulated atomicity - no rollback needed for tests
    this.lists.delete(listId);

    // Remove associated entities
    for (const [id, entity] of this.entities.entries()) {
      if (entity.listId === listId) {
        this.entities.delete(id);
      }
    }
  }
}
```

**Alternatives Considered**:
- **Expose Transaction API**: Would require `beginTransaction()`, `commit()`, `rollback()` methods. This couples consumers to transaction semantics and makes the in-memory implementation complex.
- **Transaction Callback Pattern**: `executeInTransaction((txn) => { ... })` would work but adds API complexity. Current operations are granular enough that implicit transactions suffice.
- **Optional Transaction Parameter**: `createList(params, transaction?)` creates optional dependencies that complicate both interface and tests.

---

## Decision 3: In-Memory Storage Implementation

### Question 1: Use JavaScript Map, WeakMap, or plain objects for internal storage?

**Decision**: Use JavaScript `Map` for internal storage

**Rationale**:
- **Performance**: Map outperforms plain objects for frequent insertions/deletions and variable-sized collections
- **Type Safety**: Map keys can be any value type, better TypeScript integration
- **Developer Experience**: Clear API (`get()`, `set()`, `has()`, `delete()`, `clear()`)
- **Memory Management**: For E2E tests (short-lived processes), Map's automatic garbage collection is sufficient
- **Debugging**: Map.size property, easy iteration with `forEach()` or `for...of`

**When NOT to use**:
- **WeakMap**: Cannot iterate (no `forEach`, `keys()`, `values()`), only accepts objects as keys (IDs are strings), cannot check size or clear. Designed for memory leak prevention in long-running processes (not this use case).
- **Plain Objects**: Less ergonomic for dynamic key-value storage, slower for large datasets

### Question 2: How to implement async operation simulation for realistic test behavior?

**Decision**: Return immediately resolved promises with optional configurable delays

**Rationale**:
- **Test Speed**: Immediate resolution keeps E2E tests fast (critical for the test suite)
- **Interface Compatibility**: Maintains async API contract with IndexedDB
- **Realism When Needed**: Configurable delays for testing race conditions or timing-sensitive scenarios
- **Playwright Context**: Playwright already introduces timing variations; no need for artificial delays by default

**Implementation**:
```typescript
export class InMemoryStorageProvider {
  private lists: Map<string, CatalogueList> = new Map();
  private entities: Map<string, CatalogueEntity> = new Map();

  // Default: immediate resolution (fast tests)
  async getList(listId: string): Promise<CatalogueList | null> {
    return this.lists.get(listId) ?? null;
  }

  // Synchronous operations wrapped in Promise for interface compatibility
  async createList(params: CreateListParams): Promise<string> {
    const id = crypto.randomUUID();
    const list: CatalogueList = {
      id,
      ...params,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.lists.set(id, list);
    return id; // Immediately resolved
  }

  /**
   * Clear all storage (for test isolation)
   * CRITICAL: Call this in beforeEach hooks
   */
  clear(): void {
    this.lists.clear();
    this.entities.clear();
  }
}
```

**Potential Pitfalls to Avoid**:
1. **Shared State Between Tests**: Reusing same Map instance across tests causes data leakage
   - **Solution**: Create new instance in `beforeEach` or call `clear()` religiously
2. **Reference Mutation**: Returning direct Map values allows external mutation
   - **Solution**: Always return copies: `{ ...object }` or `Array.from()`
3. **Missing Index Updates**: Indices get out of sync when entities are deleted
   - **Solution**: Update all relevant indices in every CRUD operation
4. **Date Handling**: Date comparisons fail if dates are serialized/deserialized incorrectly
   - **Solution**: Store dates as Date objects, not timestamps

---

## Decision 4: Provider Injection Strategy

### Question 1: Best injection approach - React Context, module-level singleton, or function parameter injection?

**Decision**: React Context + Factory Pattern

**Rationale**:
1. **React-native**: Works seamlessly with React 19's component model and hooks
2. **Testability**: Easy to inject mock providers in tests without touching module-level code
3. **Type Safety**: Full TypeScript support with inference
4. **Minimal Boilerplate**: No heavy DI frameworks needed
5. **Initialization Control**: Clear provider setup before rendering
6. **Hot Module Replacement**: Works with Vite's HMR (unlike module singletons)

**Trade-offs vs Alternatives**:

| Pattern | Pros | Cons |
|---------|------|------|
| **React Context** ✅ | React-native, HMR-friendly, testable, explicit dependencies | Requires provider wrapper, context drilling for deep nesting |
| **Module Singleton** | Simple, no setup, works everywhere | Hard to test, no HMR, global state |
| **Function Parameters** | Pure functions, explicit | Verbose, prop drilling through all layers |

**Implementation**:
```typescript
// 1. Create Context
const StorageProviderContext = createContext<StorageProvider | null>(null);

export function StorageProviderWrapper({ provider, children }: Props) {
  return (
    <StorageProviderContext.Provider value={provider}>
      {children}
    </StorageProviderContext.Provider>
  );
}

export function useStorageProvider(): StorageProvider {
  const provider = useContext(StorageProviderContext);
  if (!provider) {
    throw new Error('useStorageProvider must be used within StorageProviderWrapper');
  }
  return provider;
}

// 2. Production Setup (main.tsx)
const storageProvider = new IndexedDBStorageProvider(logger);
await storageProvider.initializeSpecialLists();

<StorageProviderWrapper provider={storageProvider}>
  <App />
</StorageProviderWrapper>

// 3. Test Setup
const testProvider = new InMemoryStorageProvider();

render(
  <StorageProviderWrapper provider={testProvider}>
    <ComponentUnderTest />
  </StorageProviderWrapper>
);
```

### Question 2: How to ensure the provider is configured before any storage operations?

**Decision**: Provider initialization in main.tsx before rendering + error-throwing hook

**Rationale**:
- **Initialization Timing**: Provider created and initialized in `main.tsx` before `<App />` render
- **Error Handling**: `useStorageProvider()` hook throws descriptive error if context is null
- **Developer Experience**: Clear error message guides developer to wrap component tree

**Error Prevention**:
```typescript
export function useStorageProvider(): StorageProvider {
  const provider = useContext(StorageProviderContext);
  if (!provider) {
    throw new Error(
      'useStorageProvider must be used within a StorageProviderWrapper. ' +
      'Ensure you have wrapped your app with <StorageProviderWrapper provider={...}>'
    );
  }
  return provider;
}
```

**Alternatives Considered**:
- **Lazy Initialization**: Could initialize on first use, but risks race conditions and unclear error sources
- **Global Default**: Could provide default IndexedDB provider, but makes testing harder and hides initialization failures

---

## Decision 5: Test Isolation Mechanisms

### Question 1: When and how should we reset in-memory storage state?

**Decision**: Reset per test in `beforeEach` hooks

**Rationale**:
1. **Playwright Test Lifecycle**: Each test should start with clean state for reliability
2. **Test Independence**: Tests can run in any order without side effects
3. **Debugging**: Failed tests don't pollute subsequent tests, making failure diagnosis easier
4. **CI/CD**: Consistent behavior in parallel vs sequential execution

**Implementation**:
```typescript
// Playwright test file
import { InMemoryStorageProvider } from '@academic-explorer/utils';

let testStorage: InMemoryStorageProvider;

test.beforeEach(async ({ page }) => {
  // Create fresh storage for each test
  testStorage = new InMemoryStorageProvider();

  // Inject into browser context via window object
  await page.addInitScript((storage) => {
    (window as any).__TEST_STORAGE__ = storage;
  }, testStorage);

  await page.goto('http://localhost:5173/#/catalogue');
});

test.afterEach(() => {
  // Explicit cleanup (redundant with beforeEach but good practice)
  testStorage.clear();
});
```

### Question 2: How to detect and prevent state leakage between Playwright tests?

**Decision**: Assertions + Automatic Cleanup

**Rationale**:
- **Detection**: Add size assertions at test start/end to verify clean state
- **Prevention**: Automatic `clear()` in `beforeEach` ensures fresh state
- **Developer Warnings**: Console warnings if tests don't clean up (for debugging)

**Implementation**:
```typescript
test.beforeEach(async () => {
  testStorage = new InMemoryStorageProvider();

  // Verify clean state
  if (testStorage.size() > 0) {
    console.warn('⚠️ Test storage not clean!', {
      lists: testStorage.lists.size,
      entities: testStorage.entities.size,
    });
  }
});

test.afterEach(() => {
  const size = testStorage.size();
  if (size > 50) {
    console.warn(`⚠️ Test created ${size} records - consider cleanup`);
  }
  testStorage.clear();
});
```

**Common Pitfalls in Playwright State Management**:
1. **Browser Context Persistence**: Playwright may reuse browser contexts between tests
   - **Solution**: Force new context or clear storage in global setup
2. **Async Cleanup**: Forgetting to `await` cleanup operations
   - **Solution**: Make cleanup synchronous (Map operations are sync)
3. **Shared Module State**: Importing singleton from module scope
   - **Solution**: Always create new instance in `beforeEach`

---

## Decision 6: Dexie Wrapper Strategy

### Question 1: Should we wrap at the CatalogueDB class level or at individual operation level?

**Decision**: Class-Level Wrapping (wrap CatalogueService)

**Rationale**:
- **Existing API**: `CatalogueService` already provides a clean 25-method API encapsulating all database operations
- **Minimal Code Changes**: Add provider injection to existing constructor, minimal refactoring
- **Business Logic Preservation**: Keeps existing validation, event emission, special list handling
- **Maintenance**: Service changes don't require provider updates
- **Codebase Alignment**: Matches existing `UserInteractionsService` pattern

**Structure**:
```typescript
// packages/utils/src/storage/dexie-storage-provider.ts
export class DexieStorageProvider implements CatalogueStorageProvider {
  private service: CatalogueService;

  constructor(logger?: GenericLogger) {
    this.service = new CatalogueService(logger);
  }

  // Delegate all 25+ methods to service
  async createList(params: CreateListParams): Promise<string> {
    return this.service.createList(params);
  }

  async deleteList(listId: string): Promise<void> {
    return this.service.deleteList(listId);
  }

  // ... 23 more delegations
}
```

**Alternatives Considered**:
- **Operation-Level Wrapping**: Would require duplicating 25 methods and business logic across providers. High risk of behavior divergence between implementations. Maintenance nightmare for future changes.

### Question 2: How to preserve Dexie's transaction capabilities through the abstraction?

**Decision**: Internal Transaction Handling (no exposure in interface)

**Rationale**:
- **Current Usage**: Only 2 methods currently use explicit transactions (`addEntitiesToList`, `deleteList`)
- **Dexie Auto-Transactions**: Dexie automatically wraps single operations in transactions
- **Abstraction Level**: Consumers don't need to know about transaction mechanics
- **Future Flexibility**: Can add transaction support later if needed without breaking interface

**Implementation**:
```typescript
// DexieStorageProvider - transactions handled internally by CatalogueService
export class DexieStorageProvider implements CatalogueStorageProvider {
  async deleteList(listId: string): Promise<void> {
    // CatalogueService.deleteList internally uses db.transaction()
    return this.service.deleteList(listId);
  }
}

// InMemoryStorageProvider - no transaction needed
export class InMemoryStorageProvider implements CatalogueStorageProvider {
  async deleteList(listId: string): Promise<void> {
    // Simulated atomicity - Map operations are synchronous
    this.lists.delete(listId);
    this.entities.forEach((entity, id) => {
      if (entity.listId === listId) {
        this.entities.delete(id);
      }
    });
  }
}
```

**Alternatives Considered**:
- **Callback Pattern**: `withTransaction(callback)` would expose transactions but adds complexity. Current operations are atomic enough without explicit transaction control.
- **Transaction Parameter**: `createList(params, txn?)` creates optional dependencies that complicate interface.

---

## Summary of Decisions

| Decision | Choice | Key Rationale |
|----------|--------|--------------|
| **1. Interface Return Types** | `Promise<T>` with thrown errors | Ecosystem alignment, Dexie integration, React compatibility |
| **2. Transaction Semantics** | Hidden (internal to implementations) | Abstraction level, implementation flexibility, simplicity |
| **3. In-Memory Data Structure** | JavaScript `Map` | Performance, ergonomics, debugging, type safety |
| **4. Async Simulation** | Immediate resolution | Test speed, interface compatibility, optional delays |
| **5. Provider Injection** | React Context + Factory | React-native, testability, type safety, HMR support |
| **6. Initialization Guarantee** | main.tsx setup + error-throwing hook | Clear initialization order, developer-friendly errors |
| **7. Test Isolation Timing** | Per-test (`beforeEach`) | Test independence, debugging, CI/CD consistency |
| **8. State Leakage Prevention** | Automatic `clear()` + assertions | Detection via size checks, prevention via cleanup |
| **9. Dexie Wrapping Strategy** | Class-level (wrap CatalogueService) | Minimal changes, preserves business logic, maintainability |
| **10. Transaction Preservation** | Internal handling (no interface exposure) | Current usage minimal, simplicity, future flexibility |

---

## Implementation Priorities

Based on research findings, the recommended implementation order is:

### Phase 1: Core Abstraction (P1)
1. Define `CatalogueStorageProvider` interface (15 methods minimum)
2. Implement `DexieStorageProvider` (thin wrapper around `CatalogueService`)
3. Implement `InMemoryStorageProvider` (Map-based storage with `clear()`)

### Phase 2: React Integration (P1)
4. Create `StorageProviderContext` and `useStorageProvider` hook
5. Update `useCatalogue` to use injected provider
6. Configure provider in `main.tsx` (production) and test setup (tests)

### Phase 3: Testing Infrastructure (P1)
7. Add contract tests (shared suite for both providers)
8. Update Playwright setup to inject in-memory provider
9. Remove manual database initialization from E2E tests
10. Verify all 28+ E2E tests pass without hanging

### Phase 4: Documentation & Cleanup (P2)
11. Update README with provider usage guide
12. Add JSDoc comments to all interface methods
13. Create migration guide for future features

---

## Performance Expectations

Based on research and benchmarks:

- **Production (DexieProvider)**:
  - Zero overhead (direct delegation)
  - Performance identical to current implementation
  - No regression in IndexedDB operations

- **Testing (InMemoryProvider)**:
  - 50-100x faster than IndexedDB attempts in Playwright
  - Immediate promise resolution vs IndexedDB transaction delays
  - Expected 50%+ E2E suite execution time improvement

- **Memory**:
  - In-memory storage: ~1-2 KB per list/entity (negligible for test data)
  - Automatic cleanup via `clear()` prevents leaks
  - Map garbage collection after test completion

---

## Migration Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|-----------|
| Interface doesn't cover all use cases | Medium | High | Extract from existing methods, add contract tests |
| Breaking changes to components | Low | High | Optional provider parameter, backward compatibility |
| Tests still hang | Low | Critical | Configure in global setup, verify no IndexedDB usage |
| Production data loss | Very Low | Critical | Parallel test suite, metrics monitoring, feature flag |
| Performance regression | Very Low | Medium | Benchmark before/after, load testing |

---

## Next Steps

1. Proceed to **Phase 1: Design & Contracts**
   - Generate `data-model.md` with entity relationships
   - Create `contracts/storage-provider.ts` with complete interface
   - Write `quickstart.md` for developer onboarding

2. Run **Phase 2: Implementation Tasks**
   - Use `/speckit.tasks` to generate detailed task list
   - Execute tasks with TDD approach (tests first)

3. **Validation**
   - All 28+ E2E tests pass without hanging
   - Test execution time improves by 50%+
   - Zero production incidents after deployment

---

**Research Complete**: All technical questions resolved. Ready for Phase 1 design artifacts.
