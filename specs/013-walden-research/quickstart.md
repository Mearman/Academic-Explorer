# Quickstart: OpenAlex Walden Support

## Dev Setup

```bash
cd "Academic Explorer"
pnpm install
pnpm typecheck
pnpm test
```

## Implementation Order

1. **packages/types** - Add `is_xpac` to Work schema
2. **packages/client** - Add parameter support
3. **packages/utils** - Extend SettingsState, add feature flag
4. **apps/web** - Settings UI + graph styling
5. **E2E tests** - User workflows

## Key Files

- `packages/types/src/work.ts` - Work schema
- `packages/client/src/client.ts` - API params
- `apps/web/src/stores/settings-store.ts` - Settings
- `apps/web/src/components/sections/SettingsSection.tsx` - UI

## Test Strategy

- Unit: Type conversion, date logic
- Component: Settings UI, badges
- Integration: Settings persistence
- E2E: Full user workflows

See `plan.md` for detailed architecture.
