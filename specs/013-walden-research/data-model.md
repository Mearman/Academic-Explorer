# Data Model: OpenAlex Walden Support

**Feature**: 013-walden-research
**Date**: 2025-11-14

## Entity Extensions

### 1. SettingsState (Extended)

```typescript
interface SettingsState extends Record<string, unknown> {
  politePoolEmail: string;
  includeXpac: boolean;  // Default: true
  dataVersion: '1' | '2' | undefined;  // Default: undefined (auto v2)
}
```

**Storage**: Key-value pairs in Dexie `settings` table
**Migration**: Auto (defaults applied for new fields)

### 2. Work Schema (Enhanced for v2)

```typescript
interface Work {
  id: string;
  // NEW in v2
  is_xpac: boolean;

  // Enhanced fields (better quality in v2)
  referenced_works: string[];  // 14% more
  locations: Location[];  // 14% more
  language: string;  // Improved detection
  open_access: OpenAccess;  // Better classification
  topics: Topic[];  // 5% more
  keywords: Keyword[];  // Higher quality
  license?: License;  // 5% more

  // Computed metadata for UI
  metadata?: {
    hasUnverifiedAuthor?: boolean;  // For xpac works
    isXpac?: boolean;  // Cached flag
  };
}
```

### 3. GraphNode (Extended Metadata)

```typescript
interface GraphNode {
  metadata?: {
    isXpac?: boolean;
    hasUnverifiedAuthor?: boolean;  // For graph styling
  };
}
```

## Type Definitions

```typescript
type DataVersion = '1' | '2' | undefined;

interface OpenAlexQueryParams {
  'data-version'?: '1';  // Only for v1 (temp)
  include_xpac?: boolean;  // Only send true
}
```
