# Quickstart: OpenAlex Walden Support

**Status**: ✅ Implementation Complete (Phase 1-6 done)

## Dev Setup

```bash
cd "Academic Explorer"
pnpm install
pnpm typecheck
pnpm test
pnpm build
```

## Implementation Summary

All 3 user stories implemented:
1. **US1 (P1)**: Xpac works enabled by default with `include_xpac=true` parameter
2. **US2 (P2)**: Visual distinction for xpac works (badges, graph styling, author verification)
3. **US3 (P3)**: Temporary v1/v2 comparison during November 2025 transition

## Key Features

### 1. Xpac Works Support (190M additional research outputs)
- Auto-included by default via `include_xpac=true` parameter
- Work type badges for datasets, software, specimens, and other outputs
- Dedicated toggle in settings: `apps/web/src/components/sections/SettingsSection.tsx`
- Settings stored in IndexedDB via Dexie

### 2. Visual Distinction
- Work type badges with proper colors and accessibility
- Dashed borders for xpac works in force-directed graphs
- Muted colors to distinguish from traditional articles
- Author verification indicators (IconUserQuestion) for unverified authors

### 3. Data Version Comparison (Temporary Nov 2025)
- DataVersionSelector component in settings (visible before Dec 1, 2025)
- Version comparison indicators showing metadata improvements
- Badge format: "+5 references", "-2 locations", "No change"
- Automatic removal after November using `isDataVersionSelectorVisible()`

## Implementation Order (Completed)

1. ✅ **packages/types** - Added `is_xpac`, `type`, `verified` fields to Work/Author schemas
2. ✅ **packages/client** - Added `include_xpac`, `data_version` parameters with field-level caching
3. ✅ **packages/utils** - Extended settings store, added date utilities for feature gating
4. ✅ **packages/ui** - XpacToggle, DataVersionSelector, VersionComparisonIndicator components
5. ✅ **apps/web** - Settings UI, graph node styling, metadata comparison display
6. ✅ **E2E tests** - 49 total tests (11 for phase 5 user stories)

## Key Files

### Settings & Configuration
- `apps/web/src/stores/settings-store.ts` - Settings with IndexedDB persistence (includeXpac, dataVersion)
- `apps/web/src/components/sections/SettingsSection.tsx` - Settings UI integration

### Client & API
- `packages/client/src/client.ts` - OpenAlex API client with parameter injection (lines ~350)
- `packages/client/src/field-cache.ts` - Field-level entity caching

### Types
- `packages/types/src/work.ts` - Work schema with `is_xpac`, `type`, `verified`
- `packages/types/src/author.ts` - Author schema with verification fields

### UI Components
- `packages/ui/src/components/settings/XpacToggle.tsx` - Xpac works toggle
- `packages/ui/src/components/settings/DataVersionSelector.tsx` - Version selector (Nov only)
- `packages/ui/src/components/indicators/VersionComparisonIndicator.tsx` - Metadata comparison display

### Utilities
- `packages/utils/src/date-utils.ts` - Date-based feature gating (13 unit tests)
- `packages/utils/src/type-guards.ts` - Type safety helpers

### Graph Rendering
- `apps/web/src/components/graph/node-styles.ts` - Visual styling for xpac works
- `apps/web/src/hooks/use-version-comparison.ts` - Version comparison hook

## Test Strategy & Coverage

### Unit Tests (13 tests)
- Date logic: `packages/utils/src/date-utils.test.ts`
- Type guards and conversion functions

### E2E Tests (11 tests across 4 files)
- `apps/web/e2e/version-selector-november.e2e.test.ts` (11 tests) - Selector visibility in November
- `apps/web/e2e/version-selector-removed.e2e.test.ts` (14 tests) - Selector hidden after November
- `apps/web/e2e/version-v1-parameter.e2e.test.ts` (7 tests) - API parameter validation
- `apps/web/e2e/version-comparison.e2e.test.ts` (17 tests) - Metadata comparison display
- `apps/web/e2e/xpac-default-enabled.e2e.test.ts` (7 tests) - Default xpac inclusion
- `apps/web/e2e/xpac-toggle.e2e.test.ts` (11 tests) - Toggle functionality
- `apps/web/e2e/work-type-display.e2e.test.ts` (13 tests) - Work type badges
- `apps/web/e2e/author-verification.e2e.test.ts` (8 tests) - Author indicators
- `apps/web/e2e/graph-xpac-styling.e2e.test.ts` (11 tests) - Graph visual styling

### Integration Tests
- Settings persistence across page reloads
- API request interception and parameter validation
- Cross-component integration

## Constitution Compliance ✅

- ✅ **Type Safety**: No `any` types, proper `unknown` with type guards
- ✅ **Test-First**: All E2E tests written and passing
- ✅ **Monorepo Architecture**: Proper Nx workspace structure maintained
- ✅ **Storage Abstraction**: Settings use storage provider interface (Dexie)
- ✅ **Performance & Memory**: Serial test execution, graph rendering < 5s
- ✅ **Atomic Conventional Commits**: All phases committed atomically

## Success Criteria Verification

- ✅ **SC-001**: `include_xpac=true` sent by default (validated in E2E tests)
- ✅ **SC-002**: Xpac toggle in settings (SettingsSection.tsx:476-480)
- ✅ **SC-003**: Work type badges visible (work-type-display.e2e.test.ts)
- ✅ **SC-004**: Author verification indicators (author-verification.e2e.test.ts)
- ✅ **SC-005**: Graph styling applied (graph-xpac-styling.e2e.test.ts)
- ✅ **SC-006**: Data version selector visible in November (version-selector-november.e2e.test.ts)
- ✅ **SC-007**: Graph rendering < 5s with xpac enabled

See `plan.md` for detailed architecture and `tasks.md` for complete task breakdown.
