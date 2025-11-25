# Feature Specifications Index

This directory contains all feature specifications for Academic Explorer, organized using the SpecKit workflow. Each spec follows a structured process: specification → planning → task breakdown → implementation.

## Quick Navigation

| Status | Count |
|--------|-------|
| ✅ Complete | 10 |
| 🚧 In Progress | 17 |
| 📝 Draft | 3 |
| ⚠️ Archived | 0 |

## Completed Specifications

### spec-013: Walden Research (OpenAlex Data Version 2)
**Status**: ✅ Complete | **Completed**: 2025-11-23

OpenAlex Walden (Data Version 2) support with xpac works (datasets, software, specimens). Includes visual distinction, work type badges, and Settings toggle for 190M additional research outputs.

[View Spec](./013-walden-research/)

---

### spec-014: Edge Direction Correction
**Status**: ✅ Complete | **Completed**: 2025-11-18

Corrected graph edge directions to match OpenAlex data ownership model. Outbound edges represent data stored on source entity; inbound edges discovered via reverse lookup. Multi-modal visual distinction with direction filter UI.

[View Spec](./014-edge-direction-correction/)

---

### spec-015: OpenAlex Relationships
**Status**: ✅ Complete | **Completed**: 2025-11-23

Complete relationship implementation across all OpenAlex entity types. 90 tasks across 10 phases covering bidirectional relationships, type safety, and performance optimization.

[View Spec](./015-openalex-relationships/)

---

### spec-016: Entity Relationship Visualization
**Status**: ✅ Complete | **Completed**: 2025-11-20

Enhanced entity detail pages with relationship visualization capabilities. Type filtering, count summaries, localStorage persistence, loading/error states. 80 tasks with <1s rendering for 50-100 items.

[View Spec](./016-entity-relationship-viz/)

---

### spec-018: Entity Consolidation
**Status**: ✅ Complete | **Completed**: 2025-11-21

EntityType consolidation to `@academic-explorer/types` as single source of truth. Eliminated duplicate definitions across packages, updated 50+ import statements.

[View Spec](./018-entity-consolidation/)

---

### spec-019: Full Entity Support
**Status**: ✅ Complete | **Completed**: 2025-11-21

Implementation of all 12 OpenAlex entity types: Works, Authors, Sources, Institutions, Publishers, Funders, Topics, Concepts, Keywords, Domains, Fields, Subfields.

[View Spec](./019-full-entity-support/)

---

### spec-020: E2E Test Coverage
**Status**: ✅ Complete | **Completed**: 2025-11-23

E2E test coverage enhancement across 6 phases. Playwright tests with deterministic wait helpers, page object hierarchy, accessibility checks, and test categorization system.

[View Spec](./020-e2e-test-coverage/)

---

### spec-024: Algorithms Package
**Status**: ✅ Complete | **Completed**: 2025-11-25

Core graph algorithms with Result/Option error handling. Traversal (DFS, BFS), pathfinding (Dijkstra), and analysis (connected components, SCC, cycle detection, topological sort). 112/112 tests passing.

[View Spec](./024-algorithms-package/)

---

### spec-025: Graph Clustering
**Status**: ✅ Complete | **Completed**: 2025-11-25

9 clustering algorithms implemented: Louvain, Spectral, Hierarchical, K-Core, Leiden, Label Propagation, Infomap, Core-Periphery, Biconnected Components. 134 tasks, 51/65 tests passing (79%).

[View Spec](./025-graph-clustering/)

---

### spec-027: Louvain Scaling Optimization
**Status**: ✅ Complete | **Completed**: 2025-11-25

Louvain algorithm scaling optimization with 97% performance improvement. 5 optimization phases: adaptive thresholds, optimized density calculation, early termination, CSR representation. 443ms for 1000 nodes (baseline: 15.4s).

[View Spec](./027-louvain-scaling-optimization/)

---

## In Progress Specifications

### spec-001: Storage Abstraction
**Status**: 🚧 In Progress

Storage provider interface abstraction to enable swappable implementations. IndexedDB (Dexie), in-memory (E2E tests), and mock providers.

[View Spec](./001-storage-abstraction/)

---

### spec-002: Fix Catalogue Tests
**Status**: 🚧 In Progress

Test fixes for catalogue functionality.

[View Spec](./002-fix-catalogue-tests/)

---

### spec-003: Fix Vite Compilation
**Status**: 🚧 In Progress

Resolve Vite compilation issues affecting build pipeline.

[View Spec](./003-fix-vite-compilation/)

---

### spec-004: Fix Failing Tests
**Status**: 🚧 In Progress

Systematic resolution of failing test suite.

[View Spec](./004-fix-failing-tests/)

---

### spec-005: Test Environment MSW
**Status**: 🚧 In Progress

Mock Service Worker (MSW) integration for test environment API mocking.

[View Spec](./005-test-environment-msw/)

---

### spec-008: Bookmark Query Views
**Status**: 🚧 In Progress

Advanced query and filtering capabilities for bookmark management.

[View Spec](./008-bookmark-query-views/)

---

### spec-009: Graph Rendering Abstraction
**Status**: 🚧 In Progress

Abstraction layer for graph rendering implementations.

[View Spec](./009-graph-rendering-abstraction/)

---

### spec-010: Landing Page Layout
**Status**: 🚧 In Progress

Landing page redesign and layout improvements.

[View Spec](./010-landing-page-layout/)

---

### spec-011: Fix Vertical Scrolling
**Status**: 🚧 In Progress

Resolve vertical scrolling issues in UI components.

[View Spec](./011-fix-vertical-scrolling/)

---

### spec-020: Complete OpenAlex Relationships
**Status**: 🚧 In Progress

Extension of spec-015 for complete relationship coverage.

[View Spec](./020-complete-openalex-relationships/)

---

### spec-021: Mantine Responsive Layout
**Status**: 🚧 In Progress

Responsive layout improvements using Mantine UI framework.

[View Spec](./021-mantine-responsive-layout/)

---

### spec-022: PostHog Sourcemaps
**Status**: 🚧 In Progress

PostHog sourcemap integration for production error tracking.

[View Spec](./022-posthog-sourcemaps/)

---

### spec-023: CI Optimization
**Status**: 🚧 In Progress

CI/CD pipeline optimization for faster build and deployment times.

[View Spec](./023-ci-optimization/)

---

### spec-026: Graph Extraction
**Status**: 🚧 In Progress

Graph extraction and export functionality.

[View Spec](./026-graph-extraction/)

---

## Draft Specifications

### spec-006: Application Rename
**Status**: 📝 Draft

Rename application to reflect updated scope and branding.

[View Spec](./006-application-rename/)

---

### spec-007: Multi-Provider Support
**Status**: 📝 Draft

Support for multiple storage provider implementations simultaneously.

[View Spec](./007-multi-provider-support/)

---

### spec-012: History Catalogue Tracking
**Status**: 📝 Draft

Enhanced history tracking and catalogue management.

[View Spec](./012-history-catalogue-tracking/)

---

## Archived Specifications

None currently.

---

## SpecKit Workflow

Each specification follows a structured workflow:

1. **`/speckit.specify`** - Create initial specification from user requirements
2. **`/speckit.plan`** - Generate implementation plan with technical context
3. **`/speckit.tasks`** - Break down plan into atomic, executable tasks
4. **`/speckit.implement`** - Execute tasks with continuous execution

### Spec Directory Structure

```
specs/###-feature-name/
├── spec.md              # Feature specification with user stories
├── plan.md              # Implementation plan with technical context
├── tasks.md             # Actionable task breakdown
├── research.md          # Research findings and analysis
├── data-model.md        # Data models and schemas
└── contracts/           # API contracts and interfaces
```

## Constitution Compliance

All specifications must align with the [Academic Explorer Constitution](../.specify/memory/constitution.md), including:

- Type Safety (no `any` types)
- Test-First Development (Red-Green-Refactor)
- Monorepo Architecture (Nx workspace)
- Storage Abstraction (provider interface)
- Performance & Memory (serial tests, optimization)
- Atomic Conventional Commits (incremental commits)
- Development-Stage Pragmatism (breaking changes OK)
- Test-First Bug Fixes (reproduce before fixing)
- Deployment Readiness (all packages passing)
- Continuous Execution (no pausing between phases)
- Complete Implementation (no simplified fallbacks)
- Spec Index Maintenance (this file kept current)

---

**Last Updated**: 2025-11-25 | **Total Specs**: 30 | **Maintained by**: [Constitution Principle XII](../.specify/memory/constitution.md#xii-spec-index-maintenance-non-negotiable)
