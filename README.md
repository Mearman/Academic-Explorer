# Academic Explorer

Nx-managed pnpm monorepo for exploring academic literature via the [OpenAlex API](https://docs.openalex.org/). TypeScript React SPA + CLI tool with multi-tier caching, force-directed graphs, and storage abstraction.

**[Live Application](https://mearman.github.io/Academic-Explorer/)** | **[Repository](https://github.com/Mearman/Academic-Explorer)**

[![CI Pipeline](https://github.com/Mearman/Academic-Explorer/actions/workflows/ci.yml/badge.svg)](https://github.com/Mearman/Academic-Explorer/actions/workflows/ci.yml)

## Quick Start

```bash
pnpm install              # Install dependencies
pnpm dev                  # Start web app (apps/web)
pnpm cli                  # Run CLI tool (apps/cli)
pnpm validate             # Full pipeline: typecheck + lint + test + build
```

## Commands Reference

### Development

```bash
pnpm dev                          # Start web development server
pnpm cli                          # OpenAlex CLI tool
pnpm cli stats                    # Cache statistics
pnpm cli search authors "ML"      # Search entities
pnpm cli get A5017898742          # Fetch specific entity
```

### Testing & Quality

```bash
pnpm test                         # Run all tests (serial, 5-min timeout)
pnpm test:web                     # Web app tests only
pnpm test:packages                # Package tests only
pnpm typecheck                    # TypeScript validation
pnpm lint                         # ESLint checking
pnpm validate                     # Full pipeline: typecheck + lint + test + build
```

### Build & Nx Operations

```bash
pnpm build                        # Build all projects (Nx orchestration)
nx graph                          # View dependency graph
nx affected:test                  # Test only changed projects
nx affected:build                 # Build only changed projects
nx reset                          # Reset Nx cache (use when cache issues occur)
```

### Cleanup & Maintenance

```bash
pnpm clean                        # Remove dist, coverage, .nx/cache
pnpm kill-nx                      # Kill stuck Nx daemon processes
```

### E2E Tests

```bash
pnpm nx e2e web                     # Smoke suite (default)
E2E_FULL_SUITE=true pnpm nx e2e web # Full suite
pnpm nx e2e web --grep="@entity"    # Filter by tag
pnpm nx e2e web --list              # List tests
```

## Monorepo Structure

```
apps/
  web/          # React SPA (TanStack Router + Mantine UI + Vanilla Extract)
  cli/          # Command-line tool for OpenAlex data management
packages/
  client/       # OpenAlex API client (rate limiting + caching + interceptors)
  graph/        # Graph data structures + entity management
  simulation/   # D3 force simulation engine (Web Worker execution)
  ui/           # Mantine-based UI components (atoms/molecules/organisms)
  utils/        # Storage providers + logger + type guards
  types/        # Shared TypeScript types + Zod schemas (canonical source)
  algorithms/   # Graph algorithms (clustering, community detection)
specs/          # Implementation plans (SpecKit workflow)
config/         # Shared configuration
scripts/        # Build and utility scripts
tools/          # Development tools
```

## Architecture

### Storage Abstraction Layer

Location: `packages/utils/src/storage/`

- **Interface**: `CatalogueStorageProvider` defines contract
- **Implementations**: `DexieStorageProvider` (IndexedDB), `InMemoryStorageProvider` (testing)
- **Special Lists**: Bookmarks (`bookmarks` ID), History (`history` ID)
- **Always initialize**: Call `await provider.initializeSpecialLists()` before operations

```typescript
import { DexieStorageProvider } from '@academic-explorer/utils/storage/dexie-storage-provider';

const provider = new DexieStorageProvider(logger);
await provider.initializeSpecialLists();
const listId = await provider.createList({ title: "My List", type: "list" });
```

### Multi-Tier Caching Strategy

```
Memory cache → localStorage → IndexedDB → Static JSON → OpenAlex API
```

- Field-level entity caching (80-99% bandwidth savings)
- Surgical API requests (fetch only missing fields)
- Cache analytics: `pnpm cli cache:stats`

### Force Simulation System

Location: `packages/simulation/`

- Web Worker execution (non-blocking calculations)
- Deterministic layouts (fixed seeds for reproducibility)
- Custom forces for academic entity relationships
- Animated streaming position updates

### Entity-Centric Routing

Location: `apps/web/src/routes/`

- Direct access: `/authors/A123`, `/works/W123`, `/doi/10.1038/...`
- Auto-detection: `/$bareId` resolves entity type
- URL normalization in root route (`__root.tsx`)

### State Management

- Direct Dexie (IndexedDB) stores (no Zustand/Immer)
- TanStack React Query for server state
- Store patterns: `settings-store`, `repository-store`

## TypeScript Configuration

**Strict Mode Settings**:
- `strict: true`, `strictNullChecks: true`
- `noImplicitAny: false` (relaxed for rapid development)
- `moduleResolution: "bundler"`, target: ES2022

**Path Aliases** (tsconfig.base.json):

```typescript
"@academic-explorer/types": ["packages/types/src/index.ts"]     // Canonical source for EntityType
"@academic-explorer/client": ["packages/client/src/index.ts"]
"@academic-explorer/utils": ["packages/utils/src/index.ts"]
"@academic-explorer/graph": ["packages/graph/src/index.ts"]
"@academic-explorer/simulation": ["packages/simulation/src/index.ts"]
"@academic-explorer/algorithms": ["packages/algorithms/src/index.ts"]
"@academic-explorer/ui": ["packages/ui/src/index.ts"]
"@/*": ["apps/web/src/*"]
```

## OpenAlex API Integration

**Client Configuration** (`packages/client/src/client.ts`):
- Base URL: `/api/openalex` (dev), `https://api.openalex.org` (prod)
- Rate limiting: 10 req/s, 100k req/day
- Retries: Separate configs for server/network/rate-limit errors
- Request interception: Automatic disk caching in Node.js

**Entity Types**:

| Prefix | Type | Description |
|--------|------|-------------|
| W | Works | Papers, articles, books |
| A | Authors | Researchers, scientists |
| S | Sources | Journals, repositories |
| I | Institutions | Universities, organizations |
| P | Publishers | Publishing companies |
| F | Funders | Grants, funding agencies |
| T | Topics | Research areas, subjects |
| C | Concepts | Legacy concepts |
| K | Keywords | Author keywords |
| D | Domains | High-level domains |
| F | Fields | Research fields |
| SF | Subfields | Research subfields |

**API Parameters**:
- `include_xpac=true` - Include xpac works (datasets, software, specimens) - default enabled
- `select` parameter commas NOT URL-encoded (OpenAlex requirement)

**URL Patterns**:

```
/authors/A123456789                    # Direct author access
/works/W2741809807                     # Direct work access
/entity/institutions/I27837315         # Generic entity route
/doi/10.1038/nature.2023.12345         # DOI resolution
/$bareId                               # Auto-detection
```

## Development Guidelines

For the complete set of non-negotiable development principles, see the [Project Constitution](.specify/memory/constitution.md). Key principles include type safety, test-first development, atomic commits, repository integrity, and complete implementation requirements.

### Code Quality Rules

1. **Never use `any` types** - Use `unknown` with type guards
2. **Storage operations** - Always call `initializeSpecialLists()` before operations
3. **Deterministic graphs** - Use fixed seeds for force simulation reproducibility
4. **Test memory** - Run tests serially (parallel causes OOM)
5. **URL handling** - Root route handles protocol fixing, don't duplicate logic
6. **EntityType imports** - Always import from `@academic-explorer/types` (canonical source)

### Common Patterns

**Type Guards** (`packages/utils/src/type-guards.ts`):

```typescript
import { isEntityType, isOpenAlexId } from '@academic-explorer/utils';
if (isEntityType(value)) { /* safely use value as EntityType */ }
```

**Logger Usage** (`packages/utils/src/logger.ts`):

```typescript
import { logger } from '@academic-explorer/utils';
logger.debug('category', 'message', { metadata }, 'context');
```

**EntityType Usage**:

```typescript
import type { EntityType } from "@academic-explorer/types" // Canonical source

// Type Hierarchy:
// - EntityType: 12 OpenAlex entity types
// - CacheStorageType: EntityType | "autocomplete"
// - CacheKeyType: EntityType + "search" + "related"
```

### Nx Best Practices

- **Cache issues**: Run `nx reset` to clear corrupted cache
- **Daemon hangs**: Use `pnpm kill-nx` or `pnpm kill-nx:emergency`
- **Affected builds**: Use `nx affected:build` for incremental builds
- **Task dependencies**: Nx automatically handles build order (via `^build`)

## Testing Strategy

### Memory Constraints

Tests run **SERIALLY** to prevent OOM errors (8GB heap limit). Parallel execution causes crashes.

### Test Execution Order (Fail-Fast)

1. **Type Check** - TypeScript validation (automatic Nx dependency)
2. **Unit Tests** - Fast, isolated component tests
3. **Component Tests** - React component integration tests
4. **Integration Tests** - Cross-component integration tests
5. **E2E Tests** - Full application end-to-end tests (Playwright)

### Test Configuration

**Vitest** (primary test runner):
- Serial execution: `maxConcurrency: 1`, `poolOptions.threads.singleThread: true`
- Fake IndexedDB: `fake-indexeddb` package for storage provider tests
- MSW for API mocking
- Coverage: v8 provider with workspace aggregation

**Playwright** (E2E tests):
- Config: `apps/web/playwright.config.ts`
- Accessibility: `@axe-core/playwright` integration
- Serial execution: `workers: 1` (prevents OOM)

### E2E Testing Patterns

**Test Organization**:
- Smoke tests: `apps/web/e2e/`
- Full suite: `apps/web/src/test/e2e/`
- Page objects: `apps/web/src/test/page-objects/` (4-layer hierarchy)
- Test helpers: `apps/web/src/test/helpers/app-ready.ts`

**Page Object Hierarchy**:

```
BasePageObject → BaseSPAPageObject → BaseEntityPageObject → DomainsDetailPage
```

**Test Categories** (use for filtering):
- `@entity` - Entity detail pages
- `@utility` - Utility pages (browse, search, settings)
- `@workflow` - End-to-end workflows
- `@error` - Error scenarios (404, 500, network)
- `@automated-manual` - Automated versions of manual tests

**Deterministic Wait Helpers**:

```typescript
import {
  waitForAppReady,       // Full app initialization
  waitForEntityData,     // Entity detail page data loaded
  waitForSearchResults,  // Search results rendered
  waitForGraphReady,     // D3 force simulation complete
  waitForRouterReady     // TanStack Router stable
} from '@/test/helpers/app-ready';
```

**Storage Provider Testing Pattern**:

```typescript
import { InMemoryStorageProvider } from '@academic-explorer/utils/storage/in-memory-storage-provider';

const provider = new InMemoryStorageProvider();
await provider.initializeSpecialLists(); // Always initialize first
```

## CI/CD Pipeline

**GitHub Actions Workflow** (`.github/workflows/ci.yml`):

| Job | Duration | Description |
|-----|----------|-------------|
| build-and-test | 30min | Build + typecheck + lint + test |
| quality-gates | 40min | Full test suite + security audit (daily/main) |
| e2e | 30min | Playwright tests against built app |
| coverage | 15min | Aggregate coverage + Codecov upload |
| performance | 20min | Lighthouse CI + pa11y accessibility |
| deploy | 15min | GitHub Pages (after quality-gates + e2e pass) |
| post-deploy-e2e | 25min | Live site verification |
| rollback | 10min | Automatic rollback if post-deploy fails |
| release | 20min | semantic-release (after post-deploy-e2e) |

**Environment Variables**:
- `NODE_OPTIONS: --max-old-space-size=8192` (8GB heap)
- `NX_DAEMON: false` (disable daemon in CI)
- `HUSKY: 0` (skip git hooks in CI)

## Key Features

### OpenAlex Walden Support

1. **Xpac Works** (190M additional research outputs)
   - Auto-enabled by default (`include_xpac=true`)
   - Includes datasets, software, specimens
   - Toggle in Settings
   - Persisted in IndexedDB

2. **Visual Distinction**
   - Work type badges (Dataset, Software, Specimen, Other)
   - Graph styling (dashed borders, muted colors)
   - Author verification indicators
   - WCAG 2.1 AA compliance

### Entity Relationship Visualization

Enhanced entity detail pages with relationship capabilities:
- Type filtering (multi-select checkboxes)
- Count summaries (incoming/outgoing badges)
- localStorage persistence
- Loading/error states
- Performance: <1s rendering for 50-100 items
- Accessibility: WCAG 2.1 AA compliant

### Graph Algorithms Package

Location: `packages/algorithms/`

**Traversal**: DFS, BFS (<2ms for 1000 nodes)
**Pathfinding**: Dijkstra with priority queue (8ms for 500 nodes/2000 edges)
**Analysis**: Connected components, SCC, cycle detection, topological sort

**Clustering Algorithms** (9 implemented):
1. Louvain - Modularity optimization (97% optimized)
2. Spectral - Normalized Laplacian + k-means
3. Hierarchical - Agglomerative clustering
4. K-Core - Batagelj-Zaversnik algorithm
5. Leiden - Louvain with connectivity guarantee
6. Label Propagation - Fast linear-time
7. Infomap - Information-theoretic
8. Core-Periphery - Borgatti-Everett model
9. Biconnected Components - Tarjan's articulation points

See [packages/algorithms/README.md](packages/algorithms/README.md) for full documentation.

### Edge Direction Correction

- Outbound edges: Data stored directly on source entity
- Inbound edges: Data discovered via reverse lookup
- Multi-modal visual distinction (line style + color + arrows)
- Direction filter UI (Outbound / Inbound / Both)

## Special Considerations

### OpenAlex API Quirks

- **Comma encoding**: `select` parameter must NOT URL-encode commas
- **Rate limiting**: Honor `Retry-After` headers (exponential backoff)
- **Dev proxy**: `/api/openalex` routes to OpenAlex API in dev mode

### Nx Daemon Issues

Daemon can hang or consume excessive memory. Use `NX_DAEMON=false` in CI and `pnpm kill-nx` scripts locally.

### React 19 Hook Violations

MainLayout and related stores refactored for stable method references (avoid creating new functions in render).

### Test Environment Detection

Client uses multiple checks (NODE_ENV, __DEV__, hostname) to determine dev vs prod mode. Always mock carefully in tests.

### Known Issues

- Graph package has pre-existing test failures (outside recent spec scopes)
- Nx cache issues may cause pre-commit hook failures (workaround: `nx reset` + manual verification)

## Technology Stack

**Core**:
- TypeScript 5.x (strict mode)
- React 19
- TanStack Router v7
- Mantine UI 7.x
- Vanilla Extract CSS
- Nx 20.x workspace orchestration
- pnpm 10.x package management

**Storage**:
- IndexedDB via Dexie
- localStorage (settings, filter state)

**Testing**:
- Vitest (unit/component/integration)
- Playwright (E2E)
- @axe-core/playwright (accessibility)
- fake-indexeddb (storage isolation)
- MSW (API mocking)

**Graph & Visualization**:
- D3 force simulation (Web Worker)
- Custom graph data structures
- Pure TypeScript algorithms (zero dependencies)

**API & Data**:
- OpenAlex API integration
- Zod schema validation
- Multi-tier caching strategy

## Specs Directory

`specs/` contains implementation plans using SpecKit workflow:
- `spec.md` - Feature specification
- `plan.md` - Implementation plan
- `tasks.md` - Actionable task breakdown
- `research.md` - Research findings
- `data-model.md` - Data models and schemas
- `contracts/` - API contracts and interfaces

## Research Context

Part of PhD research on **cultural heritage data preservation and citizen science engagement** at Bangor University, Wales.

**Research Focus**: Bridging computational methods with cultural heritage accessibility through crowdsourced data repositories and ML/CV techniques.
