# Research: Date-Based Feature Removal for Data Version 1 Selector

**Date**: 2025-11-14
**Feature**: OpenAlex Data Version 1 Selector
**Removal Target**: December 1, 2025 (end of November 2025 transition period)
**Context**: Spec 013-walden-research requires temporary v1 access during November 2025, then permanent removal

## Executive Summary

### Decision
Implement **build-time feature flag** with **runtime date check fallback** for maximum testability and zero runtime overhead after December 2025.

### Rationale
- **Build-time flag**: Zero runtime cost, tree-shaken code elimination
- **Runtime date check**: Safety net for deployed builds spanning the transition
- **Test-friendly**: Vitest's `vi.setSystemTime()` enables time-travel testing
- **Migration-safe**: Gracefully handles saved v1 preferences after removal
- **Type-safe**: TypeScript union types prevent invalid states

---

## Implementation Approach

### 1. Feature Flag Architecture

#### Constants Layer (`packages/utils/src/feature-flags.ts`)
```typescript
/**
 * Feature flag for Data Version 1 selector availability
 *
 * @remarks
 * - Build-time: VITE_FEATURE_DATA_V1_ENABLED overrides runtime check
 * - Runtime: Checks if current date is before 2025-12-01
 * - After Dec 1 2025: Always returns false (v1 removed)
 */
export const isDataV1SelectorAvailable = (): boolean => {
  // Build-time override (testing/emergency rollback)
  if (import.meta.env.VITE_FEATURE_DATA_V1_ENABLED === 'true') {
    return true;
  }
  if (import.meta.env.VITE_FEATURE_DATA_V1_ENABLED === 'false') {
    return false;
  }

  // Runtime date check - November 2025 only
  const now = new Date();
  const v1RemovalDate = new Date('2025-12-01T00:00:00Z');

  return now < v1RemovalDate;
};

/**
 * Date when Data Version 1 support ends
 */
export const DATA_V1_REMOVAL_DATE = new Date('2025-12-01T00:00:00Z');

/**
 * Type-safe data version union
 * After Dec 1 2025: Type becomes literal '2' (v1 removed from type system)
 */
export type DataVersion = '1' | '2';
export type ActiveDataVersion = '2'; // Post-removal type
```

#### Settings Store Extension (`apps/web/src/stores/settings-store.ts`)
```typescript
import { isDataV1SelectorAvailable, type DataVersion } from '@academic-explorer/utils/feature-flags';

// Extend SettingsState interface
interface SettingsState {
  /** Email for OpenAlex polite pool */
  politePoolEmail: string;
  /** Data version selection (v1 only available during Nov 2025) */
  dataVersion: DataVersion;
  /** Include xpac works (default: true) */
  includeXpac: boolean;
}

// Default values
const DEFAULT_SETTINGS: SettingsState = {
  politePoolEmail: "",
  dataVersion: '2', // Always default to v2
  includeXpac: true,
};

// Settings keys for storage
const SETTINGS_KEYS = {
  POLITE_POOL_EMAIL: "politePoolEmail",
  DATA_VERSION: "dataVersion",
  INCLUDE_XPAC: "includeXpac",
} as const;

class SettingsStore {
  /**
   * Get data version with automatic v1 removal
   *
   * @remarks
   * - If v1 selector unavailable and user has v1 saved, return v2
   * - Logs migration when forcing v1 → v2
   */
  async getDataVersion(): Promise<DataVersion> {
    const settings = await this.getSettings();
    const storedVersion = settings.dataVersion;

    // If v1 selector removed and user has v1 saved, force v2
    if (storedVersion === '1' && !isDataV1SelectorAvailable()) {
      this.logger.debug("settings", "Data v1 no longer available, forcing v2", {
        storedVersion,
        removalDate: DATA_V1_REMOVAL_DATE.toISOString(),
      });

      // Auto-migrate to v2
      await this.setDataVersion('2');
      return '2';
    }

    return storedVersion;
  }

  /**
   * Set data version (validates v1 availability)
   */
  async setDataVersion(version: DataVersion): Promise<void> {
    // Prevent setting v1 if selector removed
    if (version === '1' && !isDataV1SelectorAvailable()) {
      this.logger.warn("settings", "Attempted to set v1 after removal date", {
        requestedVersion: version,
        removalDate: DATA_V1_REMOVAL_DATE.toISOString(),
      });
      throw new Error('Data Version 1 is no longer available');
    }

    await this.db.settings.put({
      key: SETTINGS_KEYS.DATA_VERSION,
      value: version,
      updatedAt: new Date(),
    });

    this.logger.debug("settings", "Updated data version", { version });
  }
}
```

#### UI Component (`apps/web/src/components/sections/SettingsSection.tsx`)
```typescript
import { isDataV1SelectorAvailable } from '@academic-explorer/utils/feature-flags';

export const SettingsSection: React.FC = () => {
  const [dataVersion, setDataVersionState] = React.useState<DataVersion>('2');
  const [isV1Available] = React.useState(isDataV1SelectorAvailable());

  // Load current data version
  React.useEffect(() => {
    settingsStore.getDataVersion().then(setDataVersionState);
  }, []);

  const handleDataVersionChange = async (version: DataVersion) => {
    try {
      await settingsStore.setDataVersion(version);
      setDataVersionState(version);

      notifications.show({
        title: "Data Version Updated",
        message: `Switched to OpenAlex Data Version ${version}`,
        color: "blue",
      });
    } catch (error) {
      notifications.show({
        title: "Version Change Failed",
        message: error.message,
        color: "red",
      });
    }
  };

  return (
    <Stack gap="md">
      {/* Only render v1 selector during November 2025 */}
      {isV1Available && (
        <>
          <Divider />
          <Stack gap="sm">
            <Group gap="xs">
              <IconDatabase size={16} />
              <Text size="sm" fw={500}>
                OpenAlex Data Version
              </Text>
              <Tooltip
                label="Temporarily access Data Version 1 for comparison during the November 2025 transition"
                position="right"
                multiline
                w={250}
              >
                <IconInfoCircle
                  size={12}
                  style={{ color: "var(--mantine-color-dimmed)" }}
                />
              </Tooltip>
            </Group>

            <SegmentedControl
              value={dataVersion}
              onChange={(value) => handleDataVersionChange(value as DataVersion)}
              data={[
                { label: 'Version 2 (Walden)', value: '2' },
                { label: 'Version 1 (Legacy)', value: '1' },
              ]}
            />

            <Alert icon={<IconAlertTriangle size={16} />} color="yellow" variant="light">
              <Text size="xs">
                Data Version 1 access ends November 30, 2025. Version 2 includes 190M additional works,
                improved citations, and better metadata quality.
              </Text>
            </Alert>
          </Stack>
        </>
      )}

      {/* Rest of settings UI */}
    </Stack>
  );
};
```

---

## Test Strategy

### 1. Time-Travel Testing with Vitest

#### Test Setup (`apps/web/src/test/setup.ts`)
```typescript
import { beforeEach, afterEach, vi } from 'vitest';

// Global test utilities for time manipulation
export const setTestDate = (date: Date | string): void => {
  const targetDate = typeof date === 'string' ? new Date(date) : date;
  vi.setSystemTime(targetDate);
};

export const resetTestTime = (): void => {
  vi.useRealTimers();
};

// Auto-cleanup after each test
afterEach(() => {
  resetTestTime();
});
```

#### Unit Tests (`packages/utils/src/feature-flags.test.ts`)
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { isDataV1SelectorAvailable, DATA_V1_REMOVAL_DATE } from './feature-flags';

describe('isDataV1SelectorAvailable', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // Clear environment overrides
    delete import.meta.env.VITE_FEATURE_DATA_V1_ENABLED;
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('runtime date checks', () => {
    it('returns true during November 2025 (transition period)', () => {
      vi.setSystemTime(new Date('2025-11-15T12:00:00Z'));

      expect(isDataV1SelectorAvailable()).toBe(true);
    });

    it('returns false on December 1, 2025 (removal date)', () => {
      vi.setSystemTime(new Date('2025-12-01T00:00:00Z'));

      expect(isDataV1SelectorAvailable()).toBe(false);
    });

    it('returns false after December 2025 (post-removal)', () => {
      vi.setSystemTime(new Date('2026-01-15T12:00:00Z'));

      expect(isDataV1SelectorAvailable()).toBe(false);
    });

    it('returns true before November 2025 (pre-transition)', () => {
      vi.setSystemTime(new Date('2025-10-01T12:00:00Z'));

      expect(isDataV1SelectorAvailable()).toBe(true);
    });

    it('handles last second of November 2025 correctly', () => {
      vi.setSystemTime(new Date('2025-11-30T23:59:59Z'));

      expect(isDataV1SelectorAvailable()).toBe(true);
    });
  });

  describe('build-time environment overrides', () => {
    it('respects VITE_FEATURE_DATA_V1_ENABLED=true override', () => {
      vi.setSystemTime(new Date('2026-06-01T12:00:00Z')); // After removal
      import.meta.env.VITE_FEATURE_DATA_V1_ENABLED = 'true';

      expect(isDataV1SelectorAvailable()).toBe(true);
    });

    it('respects VITE_FEATURE_DATA_V1_ENABLED=false override', () => {
      vi.setSystemTime(new Date('2025-11-15T12:00:00Z')); // During transition
      import.meta.env.VITE_FEATURE_DATA_V1_ENABLED = 'false';

      expect(isDataV1SelectorAvailable()).toBe(false);
    });
  });
});
```

#### Integration Tests (`apps/web/src/stores/settings-store.test.ts`)
```typescript
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { settingsStore } from './settings-store';
import { InMemoryStorageProvider } from '@academic-explorer/utils/storage/in-memory-storage-provider';

describe('SettingsStore - Data Version Migration', () => {
  beforeEach(async () => {
    vi.useFakeTimers();
    await settingsStore.resetSettings();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('auto-migrates v1 to v2 when v1 selector removed', async () => {
    // Save v1 preference during November
    vi.setSystemTime(new Date('2025-11-15T12:00:00Z'));
    await settingsStore.setDataVersion('1');

    expect(await settingsStore.getDataVersion()).toBe('1');

    // Time-travel to December (v1 removed)
    vi.setSystemTime(new Date('2025-12-01T00:00:00Z'));

    const version = await settingsStore.getDataVersion();
    expect(version).toBe('2'); // Auto-migrated
  });

  it('prevents setting v1 after removal date', async () => {
    vi.setSystemTime(new Date('2025-12-01T00:00:00Z'));

    await expect(
      settingsStore.setDataVersion('1')
    ).rejects.toThrow('Data Version 1 is no longer available');
  });

  it('allows v1 during November transition period', async () => {
    vi.setSystemTime(new Date('2025-11-15T12:00:00Z'));

    await settingsStore.setDataVersion('1');
    expect(await settingsStore.getDataVersion()).toBe('1');
  });
});
```

### 2. E2E Tests with Playwright

#### E2E Test (`apps/web/src/test/e2e/data-version-selector.e2e.test.ts`)
```typescript
import { test, expect } from '@playwright/test';

test.describe('Data Version Selector - Temporal Behavior', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows v1 selector during November 2025', async ({ page, context }) => {
    // Mock browser time to November 2025
    await context.addInitScript(() => {
      const mockDate = new Date('2025-11-15T12:00:00Z');
      Date.now = () => mockDate.getTime();
      Date.prototype.getTime = () => mockDate.getTime();
    });

    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).click();

    // Verify v1 selector visible
    await expect(
      page.getByText('OpenAlex Data Version')
    ).toBeVisible();

    await expect(
      page.getByRole('button', { name: 'Version 1 (Legacy)' })
    ).toBeVisible();
  });

  test('hides v1 selector after December 1, 2025', async ({ page, context }) => {
    // Mock browser time to December 2025
    await context.addInitScript(() => {
      const mockDate = new Date('2025-12-01T00:00:00Z');
      Date.now = () => mockDate.getTime();
      Date.prototype.getTime = () => mockDate.getTime();
    });

    await page.reload();
    await page.getByRole('button', { name: 'Settings' }).click();

    // Verify v1 selector hidden
    await expect(
      page.getByRole('button', { name: 'Version 1 (Legacy)' })
    ).not.toBeVisible();
  });
});
```

---

## Alternatives Considered

### Alternative 1: Environment Variable Only
**Approach**: Use `VITE_FEATURE_DATA_V1_ENABLED` exclusively, manually changed per deployment.

**Pros**:
- Simple implementation
- Zero runtime cost

**Cons**:
- Requires manual build on Dec 1, 2025
- No graceful degradation if deployment missed
- Cannot handle time-based logic in single deployed build

**Verdict**: ❌ Rejected - too brittle for date-based transition

---

### Alternative 2: Runtime Date Check Only
**Approach**: Pure client-side date comparison, no build flags.

**Pros**:
- Single build works across transition
- Automatic removal on Dec 1
- Simple implementation

**Cons**:
- Date check executed on every render
- Cannot override for testing without global Date mock
- Dead code shipped after December (not tree-shaken)

**Verdict**: ❌ Rejected - unnecessary runtime overhead post-December

---

### Alternative 3: External Feature Flag Service
**Approach**: Use LaunchDarkly, PostHog, or similar service.

**Pros**:
- Instant remote toggle
- Percentage rollouts possible
- Analytics integration

**Cons**:
- External dependency for academic tool
- Privacy concerns (feature flag tracking)
- Overkill for single date-based flag
- Adds 50-100KB bundle size

**Verdict**: ❌ Rejected - excessive complexity for one-time temporal flag

---

### Alternative 4: Server-Side Feature Flag
**Approach**: Backend API endpoint returns feature availability.

**Pros**:
- Centralized control
- No client-side date manipulation

**Cons**:
- Academic Explorer is SPA (no backend)
- Adds network request overhead
- Cannot work offline

**Verdict**: ❌ Rejected - incompatible with static deployment

---

## Migration Notes

### Handling Existing v1 Preferences

#### Scenario 1: User has v1 saved, December 1 arrives
**Behavior**: Auto-migrate to v2 on next `getDataVersion()` call
```typescript
// User opens app on Dec 1, 2025
const version = await settingsStore.getDataVersion();
// Returns '2', logs: "Data v1 no longer available, forcing v2"
```

#### Scenario 2: User tries to manually set v1 after removal
**Behavior**: Reject with error
```typescript
await settingsStore.setDataVersion('1'); // Throws error
// Error: "Data Version 1 is no longer available"
```

#### Scenario 3: User has v2 saved, no action needed
**Behavior**: No migration, continues normally
```typescript
const version = await settingsStore.getDataVersion();
// Returns '2', no logs
```

### API Request Changes

#### Client Package (`packages/client/src/client.ts`)
```typescript
import { settingsStore } from '@academic-explorer/utils/settings-store';

export const buildOpenAlexRequest = async (endpoint: string, params: Record<string, unknown>) => {
  // Get current data version from settings
  const dataVersion = await settingsStore.getDataVersion();

  // Always include data-version parameter (defaults to '2')
  const requestParams = {
    ...params,
    'data-version': dataVersion,
  };

  return fetch(`${OPENALEX_BASE_URL}${endpoint}?${new URLSearchParams(requestParams)}`);
};
```

### User Notifications

#### On First Load After Migration (December 2025)
```typescript
// Check if user had v1 preference that was auto-migrated
const didAutoMigrate = localStorage.getItem('data-v1-auto-migrated');

if (didAutoMigrate) {
  notifications.show({
    title: "Data Version Updated",
    message: "OpenAlex Data Version 1 is no longer available. You've been automatically switched to Version 2 (Walden).",
    color: "blue",
    icon: <IconInfoCircle size={16} />,
    autoClose: 10000,
  });

  // Clear flag
  localStorage.removeItem('data-v1-auto-migrated');
}
```

---

## Code Examples

### Build-Time Flag Inspection
```typescript
// vite.config.ts - enable v1 for testing in specific branch
export default defineConfig({
  define: {
    'import.meta.env.VITE_FEATURE_DATA_V1_ENABLED': JSON.stringify(
      process.env.CI_BRANCH === 'feature/v1-testing' ? 'true' : undefined
    ),
  },
});
```

### Emergency Rollback (Production)
```bash
# Force enable v1 in production build if Dec 1 rollout causes issues
VITE_FEATURE_DATA_V1_ENABLED=true pnpm build
```

### Type Safety After Removal
```typescript
// Post-December: Update type to remove v1 from valid options
// packages/utils/src/feature-flags.ts

export type DataVersion = '2'; // Was: '1' | '2'

// TypeScript now prevents v1 usage at compile time
const version: DataVersion = '1'; // ❌ Type error
```

---

## Implementation Checklist

### Phase 1: Feature Flag Infrastructure
- [ ] Create `packages/utils/src/feature-flags.ts`
- [ ] Add `isDataV1SelectorAvailable()` function
- [ ] Add `DATA_V1_REMOVAL_DATE` constant
- [ ] Add `DataVersion` type definition
- [ ] Add unit tests for flag behavior

### Phase 2: Settings Store Integration
- [ ] Extend `SettingsState` with `dataVersion` field
- [ ] Add `getDataVersion()` with auto-migration
- [ ] Add `setDataVersion()` with validation
- [ ] Add storage persistence for data version
- [ ] Add integration tests for migration

### Phase 3: UI Component Updates
- [ ] Conditional render v1 selector in `SettingsSection`
- [ ] Add data version segmented control
- [ ] Add transition period alert
- [ ] Test UI visibility at different dates

### Phase 4: Test Coverage
- [ ] Unit tests for `isDataV1SelectorAvailable()`
- [ ] Integration tests for auto-migration
- [ ] E2E tests for temporal behavior
- [ ] Test build-time flag overrides

### Phase 5: Documentation
- [ ] Update spec 013-walden-research with flag details
- [ ] Document emergency rollback procedure
- [ ] Add user-facing changelog entry
- [ ] Update CLAUDE.md with flag patterns

---

## Performance Considerations

### Bundle Size Impact
- **During November**: +150 bytes (flag function + UI component)
- **After December**: 0 bytes (tree-shaken by Vite/Rollup)

### Runtime Cost
- **During November**: 1 date comparison per settings load (~0.01ms)
- **After December**: 0ms (compile-time constant folding)

### Tree-Shaking Verification
```typescript
// After Dec 1 with environment override:
// vite.config.ts
define: {
  'import.meta.env.VITE_FEATURE_DATA_V1_ENABLED': JSON.stringify('false'),
}

// Dead code elimination:
if (isDataV1SelectorAvailable()) {  // Always false
  return <V1Selector />;  // Removed by bundler
}
```

---

## Monitoring & Observability

### Logger Events
```typescript
// Track v1 usage during transition
logger.debug("settings", "Data version selected", {
  version: '1',
  daysUntilRemoval: Math.ceil(
    (DATA_V1_REMOVAL_DATE.getTime() - Date.now()) / (1000 * 60 * 60 * 24)
  ),
});

// Track auto-migrations
logger.debug("settings", "Auto-migrated from v1 to v2", {
  trigger: "removal_date_passed",
  removalDate: DATA_V1_REMOVAL_DATE.toISOString(),
});
```

### Analytics (Optional - Privacy-Preserving)
```typescript
// Count v1 usage (no PII)
const v1UsageMetric = {
  event: 'data_version_selected',
  properties: {
    version: '1',
    timestamp: Date.now(),
    daysUntilRemoval: calculateDaysUntil(DATA_V1_REMOVAL_DATE),
  },
};
```

---

## References

### OpenAlex Documentation
- [OpenAlex Walden Launch Blog Post](https://blog.openalex.org/walden-is-live)
- [Data Version Parameter Docs](https://docs.openalex.org/api/data-version)
- OpenAlex confirmed v1 support through November 30, 2025

### Testing Libraries
- [Vitest Time Mocking - `vi.setSystemTime()`](https://vitest.dev/api/vi.html#vi-setsystemtime)
- [Playwright Browser Context Time](https://playwright.dev/docs/clock)
- [MSW - Mocking Service Workers](https://mswjs.io/)

### Feature Flag Patterns
- [Martin Fowler - Feature Toggles](https://martinfowler.com/articles/feature-toggles.html)
- [Build-time vs Runtime Feature Flags](https://www.flagsmith.com/blog/typescript-feature-flags-next-js-example)
- [Type-Safe Feature Flags in TypeScript](https://github.com/garbles/flag)

---

## Questions & Answers

### Q1: Why not use a simple if-statement with hardcoded date?
**A**: That's exactly what we're doing! The feature flag wrapper provides:
- Testability (mockable function vs inline comparison)
- Reusability (multiple components use same flag)
- Override capability (emergency rollback via env var)
- Centralized removal logic

### Q2: What happens if user's system clock is wrong?
**A**: The date check uses client-side `new Date()`, so incorrect system time could cause:
- **Past date**: V1 selector hidden early (user can't access v1)
- **Future date**: V1 selector shown after removal (API will reject v1 requests)

**Mitigation**: The API is the source of truth - even if UI shows v1, OpenAlex API will reject `data-version=1` after November 30, returning v2 data.

### Q3: Can we remove this code after December 2025?
**A**: Yes! Recommended cleanup schedule:
1. **December 1, 2025**: Auto-migration active, v1 UI hidden
2. **January 1, 2026**: Remove v1-related code (30-day buffer)
   - Delete `isDataV1SelectorAvailable()` function
   - Remove `dataVersion` from settings store (always use v2)
   - Update `DataVersion` type to `type DataVersion = '2'`
   - Remove temporal tests

### Q4: How do we test this before November 2025?
**A**: Use environment override:
```bash
# Enable v1 selector in dev mode
VITE_FEATURE_DATA_V1_ENABLED=true pnpm dev

# Force-disable to preview December behavior
VITE_FEATURE_DATA_V1_ENABLED=false pnpm dev

# Default (auto-detects date)
pnpm dev
```

---

## Conclusion

The hybrid build-time + runtime approach provides:
- ✅ **Zero cost after December** (tree-shaken)
- ✅ **Automatic removal** (date-based)
- ✅ **Emergency override** (env variable)
- ✅ **Test-friendly** (`vi.setSystemTime()`)
- ✅ **Type-safe** (TypeScript unions)
- ✅ **Migration-safe** (auto-migrates v1 → v2)

This strategy balances simplicity, testability, and production safety for a time-limited feature flag in a static SPA context.
