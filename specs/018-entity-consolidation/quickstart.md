# Quickstart: Entity Type Consolidation Migration

**Feature**: 018-entity-consolidation
**Estimated Time**: 75 minutes
**Prerequisites**: Familiarity with TypeScript, Nx workspace, Academic Explorer codebase

## Overview

This guide provides step-by-step instructions to consolidate all duplicate `EntityType` definitions into the canonical source in `@academic-explorer/types`.

## Pre-Migration Checklist

- [ ] Read `research.md` to understand duplicate locations
- [ ] Read `data-model.md` to understand type contracts
- [ ] Read `contracts/package-contracts.md` for package-specific migration rules
- [ ] Verify clean working tree: `git status`
- [ ] Verify all tests pass: `pnpm test`
- [ ] Verify all builds succeed: `pnpm build`
- [ ] Create feature branch: `git checkout -b 018-entity-consolidation`

## Migration Order

**IMPORTANT**: Migrate packages in reverse dependency order to prevent breaking downstream consumers.

1. ✅ **packages/types** (already contains canonical definition - no changes)
2. **packages/graph** (depends only on types)
3. **packages/utils** (depends on types)
4. **apps/web** (depends on graph, utils, types)
5. **apps/cli** (depends on types)

## Phase 1: Migrate packages/graph

### Step 1.1: Remove Duplicate EntityType Definition

**File**: `packages/graph/src/types/core.ts`

**Current** (lines 9-21):
```typescript
export type EntityType =
  | "works"
  | "authors"
  | "sources"
  | "institutions"
  | "publishers"
  | "funders"
  | "topics"
  | "concepts"
  | "keywords"
  | "domains"
  | "fields"
  | "subfields"
```

**Action**: Delete lines 9-21 (entire EntityType definition)

### Step 1.2: Add Import Statement

**File**: `packages/graph/src/types/core.ts`

**Location**: After existing imports (around line 6)

**Add**:
```typescript
import type { EntityType } from "@academic-explorer/types"
```

### Step 1.3: Update Package Index

**File**: `packages/graph/src/index.ts`

**Find**:
```typescript
export type { EntityType } from "./types/core"
```

**Replace with**:
```typescript
export type { EntityType } from "@academic-explorer/types"
```

### Step 1.4: Verify Graph Package

```bash
# Type check
pnpm nx typecheck graph

# Run tests
pnpm nx test graph

# Build
pnpm nx build graph
```

**Expected**: Zero errors, all tests pass

### Step 1.5: Commit Graph Changes

```bash
git add packages/graph/src/types/core.ts packages/graph/src/index.ts
git commit -m "refactor(graph): import EntityType from types package

Remove duplicate EntityType definition in packages/graph/src/types/core.ts.
Import from canonical source @academic-explorer/types instead.

Maintains backward compatibility via re-export in index.ts.

BREAKING CHANGE: None (re-export preserves public API)"
```

---

## Phase 2: Migrate packages/utils

### Step 2.1: Migrate Catalogue DB

**File**: `packages/utils/src/storage/catalogue-db.ts`

**Current** (lines 62-72):
```typescript
export type EntityType =
  | "works"
  | "authors"
  | "sources"
  | "institutions"
  | "topics"
  | "publishers"
  | "funders"
  | "domains"
  | "fields"
  | "subfields"
```

**Action**: Delete lines 62-72

**Add** (after imports, around line 8):
```typescript
import type { EntityType } from "@academic-explorer/types"
```

### Step 2.2: Migrate Cache Browser Types

**File**: `packages/utils/src/cache-browser/types.ts`

**Current** (lines 6-16):
```typescript
export type EntityType =
  | "works"
  | "authors"
  | "sources"
  | "institutions"
  | "topics"
  | "publishers"
  | "funders"
  | "keywords"
  | "concepts"
  | "autocomplete"
```

**Replace with**:
```typescript
import type { EntityType } from "@academic-explorer/types"

/**
 * Cache storage types include entity types + special "autocomplete" cache
 */
export type CacheStorageType = EntityType | "autocomplete"
```

**Update Interface** (line 18):
```typescript
export interface CachedEntityMetadata {
  id: string
  type: CacheStorageType  // Changed from EntityType
  // ... rest of interface unchanged
}
```

**Update Stats Interface** (line 37):
```typescript
export interface CacheBrowserStats {
  totalEntities: number
  entitiesByType: Record<CacheStorageType, number>  // Changed from EntityType
  // ... rest of interface unchanged
}
```

**Update Filters Interface** (line 46):
```typescript
export interface CacheBrowserFilters {
  searchQuery: string
  entityTypes: Set<CacheStorageType>  // Changed from EntityType
  // ... rest of interface unchanged
}
```

### Step 2.3: Verify Utils Package

```bash
# Type check
pnpm nx typecheck utils

# Run tests
pnpm nx test utils

# Build
pnpm nx build utils
```

**Expected**: Zero errors, all tests pass

### Step 2.4: Commit Utils Changes

```bash
git add packages/utils/src/storage/catalogue-db.ts packages/utils/src/cache-browser/types.ts
git commit -m "refactor(utils): import EntityType from types package

Remove duplicate EntityType definitions in:
- packages/utils/src/storage/catalogue-db.ts
- packages/utils/src/cache-browser/types.ts

Create CacheStorageType union for cache browser (EntityType | 'autocomplete').

BREAKING CHANGE: None (internal changes only, no public API impact)"
```

---

## Phase 3: Migrate apps/web

### Step 3.1: Find All EntityType Imports

```bash
grep -r "import.*EntityType.*from" apps/web/src --include="*.ts" --include="*.tsx"
```

**Expected output examples**:
```
apps/web/src/components/entity/EntityCard.tsx:import type { EntityType } from "@academic-explorer/graph"
apps/web/src/routes/works/$_.lazy.tsx:import type { EntityType } from "@academic-explorer/utils"
```

### Step 3.2: Replace Import Paths

**Find**:
```typescript
import type { EntityType } from "@academic-explorer/graph"
```

**Replace with**:
```typescript
import type { EntityType } from "@academic-explorer/types"
```

**Find**:
```typescript
import type { EntityType } from "@academic-explorer/utils"
```

**Replace with**:
```typescript
import type { EntityType } from "@academic-explorer/types"
```

**Automation Option** (use with caution):
```bash
# Backup first!
git stash

# Replace imports
find apps/web/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's|from "@academic-explorer/graph"|from "@academic-explorer/types"|g' {} +
find apps/web/src -type f \( -name "*.ts" -o -name "*.tsx" \) -exec sed -i '' 's|from "@academic-explorer/utils"|from "@academic-explorer/types"|g' {} +

# Only keep changes to EntityType imports (manual review required)
git diff apps/web/src
```

### Step 3.3: Verify Web App

```bash
# Type check
pnpm nx typecheck web

# Run tests
pnpm nx test web

# Build
pnpm nx build web
```

**Expected**: Zero errors, all tests pass

### Step 3.4: Commit Web Changes

```bash
git add apps/web/src
git commit -m "refactor(web): import EntityType from types package

Update all EntityType imports to use canonical source @academic-explorer/types.

Replaced imports from:
- @academic-explorer/graph
- @academic-explorer/utils

BREAKING CHANGE: None (type-only imports, no runtime impact)"
```

---

## Phase 4: Migrate apps/cli

### Step 4.1: Find All EntityType Imports

```bash
grep -r "import.*EntityType.*from" apps/cli/src --include="*.ts"
```

**Expected output**: Minimal (CLI uses EntityType sparingly)

### Step 4.2: Replace Import Paths

**Find**:
```typescript
import type { EntityType } from "@academic-explorer/graph"
```

**Replace with**:
```typescript
import type { EntityType } from "@academic-explorer/types"
```

### Step 4.3: Verify CLI

```bash
# Type check
pnpm nx typecheck cli

# Build
pnpm nx build cli

# Test (if applicable)
pnpm nx test cli
```

**Expected**: Zero errors, CLI builds successfully

### Step 4.4: Commit CLI Changes

```bash
git add apps/cli/src
git commit -m "refactor(cli): import EntityType from types package

Update EntityType imports to use canonical source @academic-explorer/types.

BREAKING CHANGE: None (type-only imports)"
```

---

## Phase 5: Global Validation

### Step 5.1: Verify Zero Duplicate Definitions

```bash
grep -r "export type EntityType =" packages/ apps/ --include="*.ts" --include="*.tsx" | grep -v "packages/types/src/entities/entities.ts"
```

**Expected**: Zero matches (no output)

### Step 5.2: Verify All Imports Use Types Package

```bash
grep -r "import.*EntityType.*from" packages/ apps/ --include="*.ts" --include="*.tsx" | grep -v "@academic-explorer/types" | grep -v "node_modules"
```

**Expected**: Zero matches (all EntityType imports from @academic-explorer/types)

### Step 5.3: Full Monorepo Type Check

```bash
pnpm typecheck
```

**Expected**: Zero type errors across all 8 packages

### Step 5.4: Full Test Suite

```bash
pnpm test
```

**Expected**: All 738 tests pass (zero failures)

### Step 5.5: Full Build

```bash
pnpm build
```

**Expected**: All 8 projects build successfully

---

## Phase 6: Finalize

### Step 6.1: Review Git History

```bash
git log --oneline -10
```

**Expected commits** (4 total):
1. `refactor(graph): import EntityType from types package`
2. `refactor(utils): import EntityType from types package`
3. `refactor(web): import EntityType from types package`
4. `refactor(cli): import EntityType from types package`

### Step 6.2: Generate Verification Report

```bash
echo "=== Entity Type Consolidation Verification Report ===" > verification-report.txt
echo "" >> verification-report.txt
echo "## Duplicate Definitions Check" >> verification-report.txt
grep -r "export type EntityType =" packages/ apps/ --include="*.ts" --include="*.tsx" | grep -v "packages/types/src/entities/entities.ts" | wc -l >> verification-report.txt
echo "" >> verification-report.txt
echo "## Import Path Check" >> verification-report.txt
grep -r "import.*EntityType.*from.*@academic-explorer/types" packages/ apps/ --include="*.ts" --include="*.tsx" | wc -l >> verification-report.txt
echo "" >> verification-report.txt
echo "## Type Check Results" >> verification-report.txt
pnpm typecheck 2>&1 | tail -5 >> verification-report.txt
echo "" >> verification-report.txt
echo "## Test Results" >> verification-report.txt
pnpm test 2>&1 | grep -E "Tests.*passed|PASS|FAIL" >> verification-report.txt
echo "" >> verification-report.txt
echo "## Build Results" >> verification-report.txt
pnpm build 2>&1 | grep -E "Successfully ran target build" >> verification-report.txt

cat verification-report.txt
```

### Step 6.3: Update CLAUDE.md

Add migration notes to `CLAUDE.md`:

```markdown
## Entity Type Consolidation (spec-018)

**Status**: ✅ Complete (2025-11-21)

All duplicate `EntityType` definitions have been consolidated into `@academic-explorer/types`.

**Import Pattern**:
```typescript
import type { EntityType } from "@academic-explorer/types"
```

**Deprecated Imports** (removed):
- ~~`import type { EntityType } from "@academic-explorer/graph"`~~
- ~~`import type { EntityType } from "@academic-explorer/utils"`~~

**Special Types**:
- `CacheStorageType = EntityType | "autocomplete"` (cache browser only)
```

### Step 6.4: Commit Documentation Updates

```bash
git add CLAUDE.md verification-report.txt
git commit -m "docs(docs): update CLAUDE.md with entity type consolidation notes

Add import pattern documentation and deprecation notices.
Include verification report showing zero duplicate definitions.

Refs: spec-018"
```

---

## Troubleshooting

### Issue: TypeScript Error "Cannot find module '@academic-explorer/types'"

**Cause**: Nx project references not configured or stale cache

**Solution**:
```bash
# Clear Nx cache
nx reset

# Rebuild types package
pnpm nx build types

# Retry type check
pnpm typecheck
```

### Issue: Tests Fail with "EntityType is not exported from '@academic-explorer/graph'"

**Cause**: Re-export in graph/index.ts not updated

**Solution**: Verify `packages/graph/src/index.ts` exports from types package:
```typescript
export type { EntityType } from "@academic-explorer/types"
```

### Issue: Cache Browser Tests Fail with Type Errors

**Cause**: `CacheStorageType` not defined or interfaces not updated

**Solution**: Verify `packages/utils/src/cache-browser/types.ts` has:
```typescript
export type CacheStorageType = EntityType | "autocomplete"
```

And all interfaces use `CacheStorageType` instead of `EntityType`.

---

## Rollback Instructions

If migration fails and rollback is required:

```bash
# Reset to pre-migration state
git reset --hard HEAD~4  # Undo last 4 commits

# Clear Nx cache
nx reset

# Verify rollback
pnpm typecheck
pnpm test
```

---

## Post-Migration Tasks

- [ ] Update CLAUDE.md with new import patterns
- [ ] Run `pnpm validate` to ensure full quality pipeline passes
- [ ] Merge feature branch to main
- [ ] Deploy to production (GitHub Pages)

---

## Success Criteria Verification

- [x] **SC-001**: Zero duplicate EntityType definitions
- [x] **SC-002**: All entity metadata resolves to ENTITY_METADATA
- [x] **SC-003**: TypeScript compilation passes
- [x] **SC-004**: All 738 tests pass
- [x] **SC-005**: Build succeeds for all 8 projects
- [x] **SC-006**: No hardcoded entity type strings outside types package
- [x] **SC-007**: Adding new entity type requires changes in only one file
- [x] **SC-008**: IDE autocomplete suggests valid entity types

**Migration Complete** ✅
