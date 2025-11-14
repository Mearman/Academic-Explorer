# Quick Reference: Date-Based Feature Removal

## TL;DR

**Problem**: Remove Data Version 1 selector after November 2025  
**Solution**: Build-time flag + runtime date check  
**Testing**: Vitest `vi.setSystemTime()` for time-travel tests  
**Migration**: Auto-upgrade v1 → v2 on Dec 1, 2025

---

## Implementation Pattern

```typescript
// packages/utils/src/feature-flags.ts
export const isDataV1SelectorAvailable = (): boolean => {
  // Build-time override
  if (import.meta.env.VITE_FEATURE_DATA_V1_ENABLED === 'true') return true;
  if (import.meta.env.VITE_FEATURE_DATA_V1_ENABLED === 'false') return false;
  
  // Runtime date check
  return new Date() < new Date('2025-12-01T00:00:00Z');
};
```

```typescript
// UI Component
{isDataV1SelectorAvailable() && (
  <VersionSelector /> // Only shown during November 2025
)}
```

---

## Test Examples

### Unit Test
```typescript
it('hides v1 selector after Dec 1, 2025', () => {
  vi.setSystemTime(new Date('2025-12-01T00:00:00Z'));
  expect(isDataV1SelectorAvailable()).toBe(false);
});
```

### E2E Test
```typescript
test('auto-migrates v1 preference', async ({ page, context }) => {
  await context.addInitScript(() => {
    Date.now = () => new Date('2025-12-01').getTime();
  });
  // Test v1 → v2 migration
});
```

---

## Emergency Override

```bash
# Force enable v1 in production (emergency only)
VITE_FEATURE_DATA_V1_ENABLED=true pnpm build

# Preview December behavior early
VITE_FEATURE_DATA_V1_ENABLED=false pnpm dev
```

---

## Migration Behavior

| User State | December 1+ Behavior |
|-----------|---------------------|
| Has v1 saved | Auto-migrated to v2, logged |
| Has v2 saved | No change |
| Tries to set v1 | Error thrown |

---

## Full Documentation

See: `2025-11-14-223149-date-based-feature-removal-research.md`
