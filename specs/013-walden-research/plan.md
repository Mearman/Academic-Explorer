# Implementation Plan: OpenAlex Walden Support (Data Version 2)

**Branch**: `013-walden-research` | **Date**: 2025-11-14-222750 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/013-walden-research/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Enable support for OpenAlex's Walden rewrite (Data Version 2) which provides improved metadata quality (14% more references/locations, better language detection, enhanced OA status) and 190M additional xpac works (datasets, software, specimens). Implement user preferences for xpac inclusion (default: enabled) and temporary Data Version 1 access during November 2025 migration period. Add visual indicators for improved metadata and visual distinction for xpac works with unverified authors in graph visualizations.

## Technical Context

**Language/Version**: TypeScript 5.x with strict mode enabled
**Primary Dependencies**: @academic-explorer/client (OpenAlex API), @academic-explorer/ui (Mantine), React 19, TanStack Router v7
**Storage**: IndexedDB via Dexie (storage provider interface abstraction) for settings persistence
**Testing**: Vitest (unit/integration/component), Playwright (E2E), MSW (API mocking), serial execution required
**Target Platform**: Modern browsers (Chrome 90+, Firefox 88+, Safari 14+), hosted on GitHub Pages
**Project Type**: Monorepo (Nx workspace) with web app (apps/web) and shared packages
**Performance Goals**: Graph rendering under 5 seconds for typical queries; xpac works included by default without performance degradation
**Constraints**: Serial test execution (memory), 8GB heap limit in CI, performance metrics for 190M additional works
**Scale/Scope**: API client parameter changes, settings UI updates, graph visualization styling, E2E test updates, 12 functional requirements

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with Academic Explorer Constitution (`.specify/memory/constitution.md`):

### ✅ 1. Type Safety
**Status**: PASS
**Justification**: Feature will use proper TypeScript types for:
- `data-version`: `'1' | '2'` union type
- `include_xpac`: `boolean` type
- Settings state interface extensions with typed fields
- No `any` types planned; all API parameters will be strictly typed

### ✅ 2. Test-First Development
**Status**: PASS
**Justification**: Implementation will follow Red-Green-Refactor cycle:
- Write failing tests for API parameter injection (client package)
- Write failing tests for settings persistence (utils package)
- Write failing tests for UI toggle components (ui package)
- Write failing E2E tests for user workflows
- All tests named with `.unit.test.ts`, `.component.test.tsx`, `.integration.test.ts`, `.e2e.test.ts` suffixes

### ✅ 3. Monorepo Architecture
**Status**: PASS
**Justification**: Changes span multiple packages using proper structure:
- `packages/client/` - API parameter support for `data-version`, `include_xpac`
- `packages/types/` - Extended work schemas for enhanced metadata
- `packages/utils/` - Settings storage extensions for xpac preference
- `packages/ui/` - Toggle components and badge components
- `apps/web/` - Settings UI integration, graph visualization styling
- All cross-package imports use package aliases (e.g., `@academic-explorer/client`)

### ✅ 4. Storage Abstraction
**Status**: PASS
**Justification**: Feature uses existing storage provider interface:
- Settings persisted via `DexieStorageProvider` (production)
- E2E tests use `InMemoryStorageProvider`
- No direct Dexie/IndexedDB coupling in business logic
- Existing `settings-store.ts` pattern extended

### ✅ 5. Performance & Memory
**Status**: PASS
**Justification**: Performance considerations documented:
- Success Criteria SC-007: Graph rendering under 5 seconds with xpac enabled
- Tests continue running serially (no changes to test execution strategy)
- No Web Workers required (metadata display and graph styling are lightweight)
- Nx caching applies to all affected packages

### ✅ 6. Atomic Conventional Commits
**Status**: PASS
**Justification**: Implementation will create atomic commits per package:
- `feat(types): add Data Version 2 work schema extensions`
- `feat(client): add data-version and include_xpac parameters`
- `feat(utils): extend settings storage for xpac preference`
- `feat(ui): add xpac toggle and metadata badge components`
- `feat(web): integrate Walden support in settings and graph UI`
- Each commit passes quality gates before moving to next task

**Complexity Justification Required?** NO
- Feature uses existing monorepo structure (no new packages)
- Uses existing storage provider interface (no new implementations)
- No new workers required (UI updates only)
- Aligns with YAGNI principles

## Project Structure

### Documentation (this feature)

```text
specs/013-walden-research/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
Academic Explorer/ (monorepo root)
├── apps/
│   └── web/
│       ├── src/
│       │   ├── components/sections/SettingsSection.tsx (MODIFY: add xpac toggle, data version selector)
│       │   ├── components/graph/ (MODIFY: add visual distinction for xpac works)
│       │   └── stores/settings-store.ts (MODIFY: extend for xpac and dataVersion)
│       └── e2e/ (ADD: Walden feature E2E tests)
│
├── packages/
│   ├── client/
│   │   ├── src/
│   │   │   ├── client.ts (MODIFY: add parameter support)
│   │   │   └── types/ (MODIFY: add DataVersion type)
│   │   └── __tests__/ (ADD: parameter injection tests)
│   │
│   ├── types/
│   │   └── src/
│   │       └── work.ts (MODIFY: extend schema for v2 metadata)
│   │
│   ├── ui/
│   │   ├── src/
│   │   │   ├── atoms/Badge.tsx (ADD: metadata improvement badge)
│   │   │   └── molecules/XpacToggle.tsx (ADD: xpac toggle component)
│   │   └── __tests__/ (ADD: component tests)
│   │
│   └── utils/
│       ├── src/storage/
│       │   └── settings-types.ts (MODIFY: extend SettingsState)
│       └── __tests__/ (ADD: settings persistence tests)
│
└── specs/
    └── 013-walden-research/ (this feature documentation)
```

**Structure Decision**: Monorepo modifications span 5 packages (client, types, ui, utils, web) with no new packages required. All changes leverage existing Nx workspace structure and storage provider abstractions. Cross-package dependencies properly declared in Nx project configuration.

## Complexity Tracking

> **Not Required**: Feature passes all Constitution gates without violations

## Phase 0: Research & Technical Decisions

See [research.md](./research.md) for detailed research findings.

### Research Tasks

1. **OpenAlex API Parameter Behavior**
   - Verify `data-version=1` parameter support timeline (November 2025 only)
   - Test `include_xpac=true` default behavior and opt-out mechanism
   - Document API response differences between v1 and v2
   - Validate parameter interaction (can both be used simultaneously?)

2. **Settings Storage Extension Pattern**
   - Review existing `settings-store.ts` implementation
   - Identify extension points for new preference fields
   - Determine migration strategy for existing users
   - Document Dexie schema update requirements (if any)

3. **Graph Visualization Styling for xpac Works**
   - Research CSS-in-JS patterns for conditional node styling
   - Investigate D3 force simulation styling without re-initialization
   - Determine badge placement for "unverified author" indicators
   - Document accessibility considerations for visual distinction

4. **Metadata Improvement Detection**
   - Determine how to detect v2 improvements (compare cached v1 vs fresh v2?)
   - Research badge component patterns in Mantine UI library
   - Identify trigger points for showing "New: X more references" badges
   - Document when to show vs hide improvement indicators

5. **Temporary Feature Removal Strategy**
   - Research date-based feature flagging patterns in React
   - Determine test strategy for time-dependent features (v1 access removal Dec 2025)
   - Document deployment strategy for feature flag removal

### Technical Decisions

**Decision 1: API Parameter Injection Point**
- **Context**: Need to add `data-version` and `include_xpac` to all OpenAlex API requests
- **Options**:
  1. Add to base client configuration (all requests inherit)
  2. Add at request-building level (per-endpoint control)
  3. Add as interceptor middleware (transparent injection)
- **Research Required**: Review existing client architecture and parameter handling patterns

**Decision 2: Data Version 1 Removal Implementation**
- **Context**: v1 access must be removed after November 2025
- **Options**:
  1. Hard-coded date check in settings UI (remove selector on Dec 1, 2025)
  2. Feature flag with configuration file
  3. Server-side API detection (check if v1 still works)
- **Research Required**: Determine best practice for time-dependent feature removal

**Decision 3: xpac Visual Distinction in Graphs**
- **Context**: Need visual indication for works with unverified authors
- **Options**:
  1. CSS classes applied to nodes (dashed borders, muted colors)
  2. SVG filter effects on nodes
  3. Additional overlay badge elements
- **Research Required**: Performance impact of each approach on 1000+ node graphs

**Decision 4: Metadata Improvement Badge Placement**
- **Context**: Where to show "New: 5 more references" badges
- **Options**:
  1. Work detail view only (less intrusive)
  2. Work cards in lists and detail view (more visible)
  3. Tooltip on hover (discoverable but not prominent)
- **Research Required**: User experience best practices for informational badges

## Phase 1: Design Artifacts

### Data Model

See [data-model.md](./data-model.md) for schema definitions.

**Key Entities**:
1. `SettingsState` (extended)
   - `includeXpac: boolean` (default: true)
   - `dataVersion: '1' | '2' | undefined` (undefined after Nov 2025)

2. `Work` (schema extensions for v2 metadata)
   - Enhanced fields tracking (references count delta, locations count delta)
   - Metadata improvement flags

3. `ApiRequestConfig` (extended)
   - `dataVersion?: '1' | '2'`
   - `includeXpac?: boolean`

### API Contracts

See `contracts/` directory for OpenAPI specifications.

**New/Modified Endpoints**: N/A (external API only - no new Academic Explorer endpoints)

**OpenAlex API Integration**:
- **Parameter**: `data-version` (query param)
  - Values: `1` | `2`
  - Default: `2` (Academic Explorer sends v2 by default)
  - Availability: `1` supported through November 2025 only

- **Parameter**: `include_xpac` (query param)
  - Values: `true` | not included
  - Default: `true` (Academic Explorer sends by default)
  - Behavior: When `true`, includes 190M non-traditional works

### Quickstart

See [quickstart.md](./quickstart.md) for developer onboarding.

## Phase 2: Implementation Tasks

**NOT GENERATED BY THIS COMMAND** - Run `/speckit.tasks` to generate dependency-ordered task breakdown.

## Post-Design Constitution Re-Check

*Execute after Phase 1 artifacts are generated*

### ✅ 1. Type Safety
**Status**: PASS
**Design Impact**: Data model uses strict TypeScript unions (`'1' | '2'`), boolean flags, and typed interfaces. No `any` types introduced.

### ✅ 2. Test-First Development
**Status**: PASS
**Design Impact**: Test plan documented in quickstart.md. Each component/service has corresponding test files with proper naming convention.

### ✅ 3. Monorepo Architecture
**Status**: PASS
**Design Impact**: No new packages added. All changes use existing package structure with proper package alias imports.

### ✅ 4. Storage Abstraction
**Status**: PASS
**Design Impact**: Settings extensions use existing `DexieStorageProvider` interface. No direct storage coupling.

### ✅ 5. Performance & Memory
**Status**: PASS
**Design Impact**: Visual styling changes have minimal performance impact. No algorithmic complexity changes.

### ✅ 6. Atomic Conventional Commits
**Status**: PASS
**Design Impact**: Task breakdown (in tasks.md) will define atomic commit boundaries per package.

**Final Gate**: ✅ PASSED - Ready for `/speckit.tasks` command
