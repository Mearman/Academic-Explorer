# @bibgraph/utils

Shared utilities and helpers for BibGraph monorepo packages. Provides generic, reusable utilities without domain-specific dependencies.

## Main Exports

- **Logger**: Generic logging system with categories and levels
- **Type Guards**: Validation utilities and type guards for API responses
- **Data Helpers**: Array manipulation, searching, sorting, and formatting utilities
- **Date Helpers**: Date parsing, formatting, and manipulation functions
- **Storage**: IndexedDB and localStorage utilities with caching
- **Cache**: Multi-tier caching with memory, localStorage, and IndexedDB
- **Build Info**: Build metadata and versioning utilities
- **Services**: Graph data services and OpenAlex entity hooks
- **State Management**: React Context-based state management:
  - `createContextStore` - Standardized Context store with actions and selectors
  - `createCombinedContext` - Multiple contexts in one provider
  - `createSimpleContext` - Simple context provider for basic state
  - `createFilterManager` - Reusable filter state management
  - `generateSequentialId` - ID generation utilities

## Usage

```typescript
import {
  logger,
  isRecord,
  formatDateToHuman,
  debouncedSearch,
} from "@bibgraph/utils";
import { createMemoryCache } from "@bibgraph/utils/cache";
import { createStorageManager } from "@bibgraph/utils/storage";
import { createTrackedStore } from "@bibgraph/utils/state";

logger.debug("api", "Processing request", { data });
const cache = createMemoryCache<string>(1000);

// DRY store creation with shared abstractions
const { useStore } = createTrackedStore<State, Actions>(
  {
    name: "my-store",
    initialState: {
      /* ... */
    },
    persist: { enabled: true, storage: "hybrid" },
  },
  (set, get) => ({
    /* actions */
  }),
);
```
