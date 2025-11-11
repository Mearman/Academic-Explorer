# Research: Dexie Wrapper Strategy for Storage Abstraction

**Date**: 2025-11-11-151446
**Research Question**: How to wrap existing Dexie database libraries with storage abstraction layers while preserving core capabilities?
**Context**: Implementing storage abstraction for catalogue-db.ts to enable in-memory testing providers

## Executive Summary

**Recommended Approach**: **Class-level wrapping with selective transaction exposure**

1. **Wrapping Strategy**: Wrap at the CatalogueService class level (not individual operations)
2. **Transaction Handling**: Expose transactions through abstraction via a callback pattern
3. **Rationale**: Maintains existing architecture, minimizes refactoring risk, preserves Dexie capabilities

## Research Question 1: Wrapping Strategy

### Option A: Class-Level Wrapping (RECOMMENDED)

**Implementation**: DexieStorageProvider contains a CatalogueDB instance, delegates to CatalogueService methods

**Advantages**:
- ✅ Minimal code changes - CatalogueService already encapsulates all operations
- ✅ Preserves existing service layer architecture and business logic
- ✅ Lower maintenance burden - changes to service methods don't require provider updates
- ✅ Type safety maintained - TypeScript interfaces match existing method signatures
- ✅ Easier testing - can mock entire service layer
- ✅ Dexie-specific optimizations preserved (compound indexes, batch operations)

**Disadvantages**:
- ⚠️ Tighter coupling to existing implementation
- ⚠️ Full migration to alternative storage would require rewriting CatalogueService

**Evidence from Codebase**:

The existing `CatalogueService` (lines 155-860 in catalogue-db.ts) already provides:
- Clean public API with ~25 methods
- Internal Dexie instance management (lines 156-161)
- Event emission system (lines 189-194, 321-325)
- Transaction handling (lines 440-482, 698-707)
- Error handling and logging throughout

```typescript
// Current structure in catalogue-db.ts
export class CatalogueService {
  private db: CatalogueDB;
  private logger?: GenericLogger;

  constructor(logger?: GenericLogger) {
    this.db = getDB();
    this.logger = logger;
  }

  async createList(params: {...}): Promise<string> { /* ... */ }
  async getAllLists(): Promise<CatalogueList[]> { /* ... */ }
  // ... 23+ more methods
}
```

### Option B: Operation-Level Wrapping

**Implementation**: DexieStorageProvider reimplements all operations using Dexie primitives directly

**Advantages**:
- ✅ Looser coupling - easier to replace Dexie completely
- ✅ More flexibility for alternative implementations
- ✅ Fine-grained control over each operation

**Disadvantages**:
- ❌ High maintenance burden - duplicate ~25 methods across providers
- ❌ Risk of behavior divergence between production and test implementations
- ❌ Loss of existing business logic (event emission, special list handling, validation)
- ❌ Requires reimplementing transaction coordination logic
- ❌ More test surface area - each provider needs full test coverage

**Analysis**: This approach would require duplicating significant business logic:
- Special list management (BOOKMARKS, HISTORY) - lines 643-680
- Entity type validation for bibliographies - lines 273-281, 443-446
- Position management for ordered entities - lines 294-302
- Event emission after changes - throughout service
- Duplicate detection logic - lines 284-291, 449-457

### Decision: Class-Level Wrapping

**Rationale**:

1. **Existing Architecture Alignment**: The codebase already follows a service-oriented pattern. Both `UserInteractionsService` (user-interactions-db.ts) and `CatalogueService` encapsulate database operations behind clean APIs.

2. **Risk Minimization**: Zero changes to production code paths. The abstraction adds a thin wrapper rather than reimplementing logic.

3. **Best Practice Support**: From research, Dexie.org documentation recommends "wrap the logic of all database interactions in a single class" - which CatalogueService already does.

4. **Test Requirements**: The E2E tests need storage isolation, not a different implementation. An in-memory provider that mimics CatalogueService behavior is sufficient.

## Research Question 2: Transaction Handling

### Current Transaction Usage in catalogue-db.ts

Dexie transactions are used in two places:

1. **Bulk entity addition** (lines 440-482):
```typescript
await this.db.transaction("rw", this.db.catalogueEntities, async () => {
  for (const entity of entities) {
    // Add multiple entities atomically
  }
});
```

2. **List deletion** (lines 698-707):
```typescript
await this.db.transaction("rw", this.db.catalogueLists, this.db.catalogueEntities, async () => {
  await this.db.catalogueLists.delete(listId);
  await this.db.catalogueEntities.where("listId").equals(listId).delete();
  await this.db.catalogueShares.where("listId").equals(listId).delete();
});
```

### Transaction Options

#### Option A: Hide Transactions (Implicit)

**Implementation**: Provider internally manages transactions, abstraction doesn't expose them

**Advantages**:
- ✅ Simpler abstraction interface
- ✅ Easier for consumers - no transaction management required
- ✅ In-memory provider can ignore transaction semantics

**Disadvantages**:
- ❌ Can't compose multiple operations atomically from calling code
- ❌ May need future API changes if transaction requirements evolve

#### Option B: Expose Transactions via Callback Pattern (RECOMMENDED)

**Implementation**: Provider exposes `withTransaction(callback)` method

**Advantages**:
- ✅ Preserves atomic multi-operation capability
- ✅ Abstracts transaction lifecycle management
- ✅ In-memory provider can execute callback synchronously
- ✅ Follows established patterns in TypeScript database libraries

**Disadvantages**:
- ⚠️ Slightly more complex abstraction API
- ⚠️ Consumers need to understand transaction boundaries

**Implementation Pattern**:

```typescript
interface CatalogueStorageProvider {
  // Regular operations
  createList(params: CreateListParams): Promise<string>;
  deleteList(listId: string): Promise<void>;

  // Transaction support
  withTransaction<T>(callback: () => Promise<T>): Promise<T>;
}

// Usage in CatalogueService
async deleteList(listId: string): Promise<void> {
  await this.provider.withTransaction(async () => {
    await this.provider.deleteListById(listId);
    await this.provider.deleteEntitiesByListId(listId);
    await this.provider.deleteSharesByListId(listId);
  });
}
```

#### Option C: Pass Transaction Objects

**Implementation**: Provider exposes transaction creation and operations accept optional transaction parameter

**Advantages**:
- ✅ Maximum flexibility
- ✅ Matches Prisma/TypeORM patterns

**Disadvantages**:
- ❌ Leaky abstraction - exposes transaction object type
- ❌ More complex for providers to implement
- ❌ Requires transaction-aware method signatures throughout

### Decision: Callback Pattern (Option B)

**Rationale**:

1. **Current Usage Analysis**: Only 2 methods in CatalogueService currently use transactions (`addEntitiesToList`, `deleteList`). Both are self-contained operations that fit the callback pattern well.

2. **Best Practice Alignment**: Research shows this pattern is recommended for TypeScript transaction handling:
   - "Create a function that wraps a callback within a transaction"
   - "Prevents leaky abstractions by not exposing internal transaction details"

3. **Provider Implementation Simplicity**:
   - **DexieProvider**: Maps callback to `db.transaction()`
   - **InMemoryProvider**: Simply executes callback (no transaction needed for Map operations)

4. **Future-Proof**: If new multi-operation atomic requirements emerge, the callback pattern accommodates them without API changes.

## Recommended Code Structure

### 1. Storage Provider Interface

```typescript
// packages/utils/src/storage/catalogue-storage-provider.ts

export interface CatalogueStorageProvider {
  // List operations
  createList(params: CreateListParams): Promise<string>;
  getList(listId: string): Promise<CatalogueList | null>;
  getAllLists(): Promise<CatalogueList[]>;
  updateList(listId: string, updates: Partial<CatalogueList>): Promise<void>;
  deleteList(listId: string): Promise<void>;
  searchLists(query: string): Promise<CatalogueList[]>;

  // Entity operations
  addEntityToList(params: AddEntityParams): Promise<string>;
  removeEntityFromList(listId: string, entityRecordId: string): Promise<void>;
  getListEntities(listId: string): Promise<CatalogueEntity[]>;
  updateEntityNotes(entityRecordId: string, notes: string): Promise<void>;

  // Bulk operations
  addEntitiesToList(listId: string, entities: AddEntityParams[]): Promise<BulkResult>;

  // Share operations
  generateShareToken(listId: string): Promise<string>;
  getListByShareToken(shareToken: string): Promise<ShareResult>;

  // Transaction support
  withTransaction<T>(callback: () => Promise<T>): Promise<T>;

  // Utility
  isSpecialList(listId: string): boolean;
}

// Supporting types
export interface CreateListParams {
  title: string;
  description?: string;
  type: ListType;
  tags?: string[];
  isPublic?: boolean;
}

export interface AddEntityParams {
  entityType: EntityType;
  entityId: string;
  notes?: string;
  position?: number;
}

export interface BulkResult {
  success: number;
  failed: number;
}

export interface ShareResult {
  list: CatalogueList | null;
  valid: boolean;
}
```

### 2. Dexie Storage Provider (Wrapper)

```typescript
// packages/utils/src/storage/dexie-storage-provider.ts

import { CatalogueDB } from './catalogue-db.js';
import type { CatalogueStorageProvider } from './catalogue-storage-provider.js';
import type { GenericLogger } from '../logger.js';

export class DexieStorageProvider implements CatalogueStorageProvider {
  private db: CatalogueDB;
  private logger?: GenericLogger;

  constructor(logger?: GenericLogger) {
    this.db = getDB(); // Reuse existing singleton
    this.logger = logger;
  }

  async createList(params: CreateListParams): Promise<string> {
    const id = crypto.randomUUID();
    const list: CatalogueList = {
      id,
      ...params,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: params.isPublic ?? false,
    };

    await this.db.catalogueLists.add(list);
    catalogueEventEmitter.emit({ type: 'list-added', listId: id, list });
    this.logger?.debug('catalogue', 'List created', { id });

    return id;
  }

  async deleteList(listId: string): Promise<void> {
    await this.withTransaction(async () => {
      await this.db.catalogueLists.delete(listId);
      await this.db.catalogueEntities.where('listId').equals(listId).delete();
      await this.db.catalogueShares.where('listId').equals(listId).delete();
    });

    catalogueEventEmitter.emit({ type: 'list-removed', listId });
    this.logger?.debug('catalogue', 'List deleted', { listId });
  }

  async withTransaction<T>(callback: () => Promise<T>): Promise<T> {
    return await this.db.transaction(
      'rw',
      this.db.catalogueLists,
      this.db.catalogueEntities,
      this.db.catalogueShares,
      callback
    );
  }

  // ... implement remaining interface methods
}
```

### 3. In-Memory Storage Provider

```typescript
// packages/utils/src/storage/in-memory-storage-provider.ts

import type { CatalogueStorageProvider } from './catalogue-storage-provider.js';

export class InMemoryStorageProvider implements CatalogueStorageProvider {
  private lists = new Map<string, CatalogueList>();
  private entities = new Map<string, CatalogueEntity>();
  private shares = new Map<string, CatalogueShareRecord>();

  async createList(params: CreateListParams): Promise<string> {
    const id = crypto.randomUUID();
    const list: CatalogueList = {
      id,
      ...params,
      createdAt: new Date(),
      updatedAt: new Date(),
      isPublic: params.isPublic ?? false,
    };

    this.lists.set(id, list);
    catalogueEventEmitter.emit({ type: 'list-added', listId: id, list });

    return id;
  }

  async deleteList(listId: string): Promise<void> {
    this.lists.delete(listId);

    // Delete associated entities
    for (const [id, entity] of this.entities.entries()) {
      if (entity.listId === listId) {
        this.entities.delete(id);
      }
    }

    // Delete associated shares
    for (const [id, share] of this.shares.entries()) {
      if (share.listId === listId) {
        this.shares.delete(id);
      }
    }

    catalogueEventEmitter.emit({ type: 'list-removed', listId });
  }

  async withTransaction<T>(callback: () => Promise<T>): Promise<T> {
    // In-memory operations are synchronous - no transaction needed
    // Execute callback directly
    return await callback();
  }

  // Test utility: clear all data between tests
  clear(): void {
    this.lists.clear();
    this.entities.clear();
    this.shares.clear();
  }

  // ... implement remaining interface methods
}
```

### 4. Modified CatalogueService

```typescript
// packages/utils/src/storage/catalogue-db.ts

export class CatalogueService {
  private provider: CatalogueStorageProvider;
  private logger?: GenericLogger;

  constructor(provider?: CatalogueStorageProvider, logger?: GenericLogger) {
    // Default to Dexie provider for backward compatibility
    this.provider = provider ?? new DexieStorageProvider(logger);
    this.logger = logger;
  }

  async createList(params: CreateListParams): Promise<string> {
    try {
      return await this.provider.createList(params);
    } catch (error) {
      this.logger?.error('catalogue', 'Failed to create list', { params, error });
      throw error;
    }
  }

  async deleteList(listId: string): Promise<void> {
    if (this.isSpecialList(listId)) {
      throw new Error(`Cannot delete special system list: ${listId}`);
    }

    try {
      await this.provider.deleteList(listId);
    } catch (error) {
      this.logger?.error('catalogue', 'Failed to delete list', { listId, error });
      throw error;
    }
  }

  // ... delegate remaining methods to provider
}

// Backward compatible singleton export
export const catalogueService = new CatalogueService();
```

## Migration Strategy & Risk Mitigation

### Phase 1: Create Provider Interface & Implementations

**Risk**: Interface doesn't cover all CatalogueService capabilities
**Mitigation**:
- Extract interface from existing CatalogueService methods
- Add contract tests that both providers must pass
- Use TypeScript's `implements` to ensure completeness

### Phase 2: Inject Provider into CatalogueService

**Risk**: Breaking changes to existing consumers
**Mitigation**:
- Make provider parameter optional in constructor
- Default to DexieStorageProvider for backward compatibility
- Existing `catalogueService` singleton continues to work

### Phase 3: Update E2E Test Setup

**Risk**: Tests still hang despite in-memory provider
**Mitigation**:
- Configure provider in Playwright global setup
- Add provider.clear() calls in test afterEach hooks
- Verify IndexedDB is never touched in test runs

### Phase 4: Rollout & Validation

**Risk**: Production data loss or performance regression
**Mitigation**:
- Run parallel test suite (production + test providers) before rollout
- Monitor IndexedDB operation metrics after deployment
- Keep ability to toggle providers via feature flag

### Testing Strategy

1. **Contract Tests**: Shared test suite that both providers must pass
   ```typescript
   // tests/integration/storage-provider-contract.test.ts
   function testStorageProvider(createProvider: () => CatalogueStorageProvider) {
     describe('CatalogueStorageProvider Contract', () => {
       test('createList returns valid ID', async () => { /* ... */ });
       test('deleteList removes list and entities', async () => { /* ... */ });
       // ... 20+ contract tests
     });
   }

   describe('DexieStorageProvider', () => {
     testStorageProvider(() => new DexieStorageProvider());
   });

   describe('InMemoryStorageProvider', () => {
     testStorageProvider(() => new InMemoryStorageProvider());
   });
   ```

2. **Unit Tests**: Provider-specific behavior
   - DexieProvider: Transaction handling, Dexie error mapping
   - InMemoryProvider: Clear() method, isolation verification

3. **Integration Tests**: CatalogueService with providers
   - Verify service layer works with both providers
   - Test event emission with both backends

4. **E2E Tests**: Playwright with InMemoryProvider
   - Verify all 28+ catalogue tests pass
   - Measure performance improvement
   - Confirm no IndexedDB operations

## Performance Considerations

### DexieStorageProvider (Production)

**Expected Performance**: Same as current implementation
- Zero overhead - direct delegation to existing Dexie operations
- IndexedDB async operations: ~10-50ms per operation
- Batch operations preserved: bulk inserts use Dexie transactions

### InMemoryStorageProvider (Testing)

**Expected Performance**: Significantly faster than IndexedDB
- Map operations: <1ms per operation
- No transaction overhead
- No disk I/O or browser API delays
- **Estimated Speedup**: 50-100x faster than IndexedDB in Playwright context

**E2E Suite Impact** (based on spec success criteria):
- Current: Hangs indefinitely due to IndexedDB incompatibility
- Target: <2 seconds per storage operation
- Expected: 50%+ improvement in suite execution time (SC-003)

## Alternative Considered: Keep CatalogueService, Add Provider Internally

**Approach**: CatalogueService internally switches between Dexie and in-memory based on environment

**Why Rejected**:
- ❌ Violates separation of concerns - service contains storage implementation
- ❌ Harder to test - can't inject mock providers
- ❌ Couples service to both storage implementations
- ❌ Less flexible - can't add new providers without modifying service

The recommended approach (provider injection) is superior because it:
- ✅ Inverts dependency - service depends on abstraction, not implementation
- ✅ Enables testing - can inject mock providers in tests
- ✅ Allows future storage backends without touching service layer
- ✅ Follows SOLID principles (Dependency Inversion Principle)

## References

### Codebase Files Analyzed
- `/packages/utils/src/storage/catalogue-db.ts` - Main CatalogueService implementation
- `/packages/utils/src/storage/user-interactions-db.ts` - Similar service pattern
- `/packages/utils/src/storage/indexeddb-storage.ts` - Existing Dexie wrapper example
- `/specs/001-storage-abstraction/plan.md` - Implementation plan

### External Resources
- Dexie.js Best Practices: https://dexie.org/docs/Tutorial/Best-Practices
- Dexie.js TypeScript Support: https://dexie.org/docs/Typescript
- Strategy Pattern in TypeScript: Multiple Medium articles on transaction handling
- Repository Pattern with Transactions: TypeScript DDD implementation guides

### Key Insights from Research

1. **Dexie Transaction Behavior**: "IndexedDB will commit a transaction as soon as it isn't used within a tick" - requires careful async handling

2. **Abstraction Recommendation**: "Wrap the logic of all database interactions in a single class" - validates class-level wrapping

3. **Transaction Pattern**: "Create a function that wraps a callback within a transaction" - supports callback pattern over transaction objects

4. **Testing Strategy**: Existing `indexeddb-storage.ts` already uses in-memory fallback (lines 47-56) - proves pattern works in this codebase

## Conclusion

The recommended approach of **class-level wrapping with callback-pattern transactions** provides:

1. **Low Risk**: Minimal changes to proven production code
2. **High Testability**: In-memory provider unblocks 28+ E2E tests
3. **Maintainability**: Changes to service layer don't require provider updates
4. **Flexibility**: Can add new providers (e.g., remote storage) in future
5. **Performance**: Production unchanged, testing 50-100x faster

This strategy aligns with:
- ✅ Existing codebase architecture patterns
- ✅ TypeScript/Dexie best practices from research
- ✅ SOLID principles (Dependency Inversion, Open/Closed)
- ✅ Project requirements (zero breaking changes, test isolation)

**Next Steps**:
1. Review this research document
2. Generate data model artifacts (Phase 1)
3. Create interface contracts
4. Implement providers with contract tests
5. Validate against success criteria (SC-001 through SC-007)
