# TODO/FIXME Analysis

**Date**: 2025-11-17
**Total Count**: 43 occurrences across 19 files

## Summary

The codebase contains 43 TODO/FIXME markers. These fall into three categories:

1. **Generator Templates** (22 items) - Intentional placeholders for code generation
2. **Future Enhancements** (15 items) - Documented future work, not bugs
3. **Known Test Issues** (6 items) - Documented test limitations or technical debt

## Category 1: Generator Templates ✅ **KEEP AS-IS**

**Location**: `tools/generators/**/*.ts`

These are intentional placeholders in Nx generator templates that guide developers when creating new components, libraries, or entity views. They should NOT be removed.

**Files**:
- `tools/generators/component/generator.ts` (2 TODOs)
- `tools/generators/entity-view/generator.ts` (2 TODOs)
- `tools/generators/library/generator.ts` (9 TODOs)
- `tools/generators/base/EntityViewBase.ts` (5 TODOs)
- `tools/generators/base/ComponentBase.ts` (7 TODOs)
- `tools/generators/base/LibraryBase.ts` (3 TODOs)

**Action**: None required - these are template markers

## Category 2: Future Enhancements ⏳ **DOCUMENT**

These represent legitimate future work that is documented but not currently blocking development.

### 2.1 CLI Features (apps/cli/)

**File**: `apps/cli/src/openalex-cli-class.ts`
- Lines 1654, 1677: Re-enable synthetic cache analysis
- **Status**: Feature intentionally disabled, waiting for cache analytics implementation
- **Action**: None - future enhancement

### 2.2 Build/Static Data (config/, apps/web/src/)

**File**: `config/vite-plugins/static-data-index.ts`
- Line 358: Implement build-time validation for static data integrity
- **Status**: Future enhancement for data validation
- **Action**: None - future enhancement

**File**: `apps/web/src/lib/utils/static-data-index-generator.ts`
- Line 155: Implement auto-download logic
- **Status**: Future enhancement for automated data fetching
- **Action**: None - future enhancement

### 2.3 Scripts/Tools

**File**: `tools/scripts/fetch-query-cache.ts`
- Line 7: Fix imports once files exist
- **Status**: ⚠️ **POTENTIALLY STALE** - Code has stubs in place, may no longer be needed
- **Action**: Review if this comment is still relevant

**File**: `scripts/parse-openalex-urls.ts`
- Line 248: Import actual route components
- **Status**: Future enhancement for URL parsing script
- **Action**: None - future enhancement

**File**: `apps/web/src/build-plugins/openalex-data-plugin.ts`
- Line 1713: Comment about data format (not a TODO, just informational)
- **Status**: Informational comment
- **Action**: Consider removing "TODO" prefix if not actionable

### 2.4 Utilities/Hooks

**File**: `packages/utils/src/hooks/use-entity-route.ts`
- Line 52: Implement with proper app-specific hooks
- **Status**: Future refactoring needed
- **Action**: None - documented technical debt

## Category 3: Known Test Issues 🧪 **DOCUMENT**

These represent known test limitations or issues that don't block development but should be addressed eventually.

### 3.1 E2E Test Issues

**File**: `apps/web/src/test/e2e/pretty-urls.e2e.test.ts`
- Line 121: Fix query parameter duplication
- **Status**: Known bug in URL handling
- **Action**: Create GitHub issue or accept as known limitation

**File**: `apps/web/src/test/e2e/bookmark-tagging.e2e.test.ts`
- Line 49: Add tags via tag input (once implemented)
- **Status**: Feature not yet implemented
- **Action**: None - future feature

**File**: `apps/web/src/test/e2e/catalogue-entity-management.e2e.test.ts`
- Line 72: Investigate why Works/Sources pages don't show Add to Catalogue button
- **Status**: Known UI inconsistency
- **Action**: Create GitHub issue or accept as known limitation

### 3.2 Unit/Integration Test Issues

**File**: `apps/web/src/test/integration/incremental-hydration.integration.test.ts`
- Line 460: Test environment issue with Zustand store persistence
- **Status**: Test infrastructure limitation
- **Action**: None - documented test limitation

**File**: `apps/web/src/hooks/use-entity-interaction.component.test.ts`
- Line 461: Fix mock reactivity for proper Zustand simulation
- **Status**: Test infrastructure limitation
- **Action**: None - documented test limitation

**File**: `apps/web/src/stores/graph-store.unit.test.ts`
- Lines 202, 217: Refactoring needed after store architecture change
- **Status**: Technical debt from architecture migration
- **Action**: None - documented technical debt

## Recommended Actions

### Immediate (Today)

1. ✅ **Review fetch-query-cache.ts** - Verify if TODO on line 7 is still relevant
2. ✅ **Remove "TODO" prefix** from informational comment in openalex-data-plugin.ts:1713

### Short-term (Next Sprint)

3. **Create GitHub issues** for legitimate bugs:
   - Query parameter duplication (pretty-urls.e2e.test.ts:121)
   - Missing Add to Catalogue button (catalogue-entity-management.e2e.test.ts:72)

### Long-term (Backlog)

4. **Feature enhancements** (when prioritized):
   - Synthetic cache analysis (openalex-cli-class.ts)
   - Build-time validation (static-data-index.ts)
   - Auto-download logic (static-data-index-generator.ts)
   - Tag input implementation (bookmark-tagging.e2e.test.ts)

5. **Technical debt** (when time permits):
   - Store refactoring (graph-store.unit.test.ts)
   - Test infrastructure improvements (various test files)
   - Hook implementation (use-entity-route.ts)

## Constitution Compliance

All TODOs comply with **Principle VII: Development-Stage Pragmatism**:
- Breaking changes and incomplete features are acceptable during development
- No backwards compatibility obligations
- Technical debt is documented but not blocking

## Conclusion

**Status**: ✅ No blocking issues found

The 43 TODO markers represent:
- 22 intentional template placeholders (keep as-is)
- 15 documented future enhancements (not urgent)
- 6 known test limitations (documented, not blocking)

**Action Items**: 2 immediate cleanups recommended (see above)
