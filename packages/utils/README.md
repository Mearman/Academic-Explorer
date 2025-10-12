# @academic-explorer/utils

Shared utilities and helpers for Academic Explorer monorepo packages. Provides generic, reusable utilities without domain-specific dependencies.

## Main Exports

- **Logger**: Generic logging system with categories and levels
- **Type Guards**: Validation utilities and type guards for API responses
- **Data Helpers**: Array manipulation, searching, sorting, and formatting utilities
- **Date Helpers**: Date parsing, formatting, and manipulation functions
- **Storage**: IndexedDB and localStorage utilities with caching
- **Cache**: Multi-tier caching with memory, localStorage, and IndexedDB
- **Build Info**: Build metadata and versioning utilities
- **Services**: Graph data services and OpenAlex entity hooks
- **State Management**: DRY Zustand store abstractions:
  - `createTrackedStore` - Standardized store factory with Immer, DevTools, and persistence
  - `createFilterManager` - Reusable filter state management
  - `createLoadingState` - Common loading/error state patterns
  - `generateSequentialId` - ID generation utilities

## Usage

```typescript
import {
  logger,
  isRecord,
  formatDateToHuman,
  debouncedSearch,
} from "@academic-explorer/utils";
import { createMemoryCache } from "@academic-explorer/utils/cache";
import { createStorageManager } from "@academic-explorer/utils/storage";
import { createTrackedStore } from "@academic-explorer/utils/state";

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
