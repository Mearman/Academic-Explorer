# Feature Specifications Index

This directory contains all feature specifications for Academic Explorer, organized using the SpecKit workflow. Each spec follows a structured process: specification → planning → task breakdown → implementation.

## Quick Navigation

| Status | Count |
|--------|-------|
| ✅ Complete | 7 |
| 🚧 In Progress | 11 |
| 📝 Draft | 8 |
| ⚠️ Archived | 2 |

## Specifications

### spec-001: Storage Abstraction
**Status**: 🚧 In Progress (Functionally Complete) | **Progress**: 35/74 tasks (47%)

Storage provider interface abstraction enabling swappable implementations. IndexedDB (Dexie) for production, in-memory provider for E2E/Playwright tests, mock provider for unit tests. Resolved 28+ E2E test failures by eliminating IndexedDB incompatibilities. Core implementation complete; tests and polish phase incomplete.

[View Spec](./001-storage-abstraction/)

---

### spec-002: Fix Catalogue Tests
**Status**: ⚠️ Archived (Obsolete) | **Obsoleted**: 2025-11-17

Catalogue E2E test failures resolved by spec-001 (storage abstraction). All tests now passing. Issue resolved through InMemoryStorageProvider implementation.

[View Spec](./002-fix-catalogue-tests/)

---

### spec-003: Fix Vite Compilation
**Status**: ✅ Complete | **Completed**: 2025-11-17

Resolved tsconfig/Vite issue causing files to compile in-place rather than to dist folder. Fixed build configuration for proper output directory structure.

[View Spec](./003-fix-vite-compilation/)

---

### spec-004: Fix Failing Tests
**Status**: ⚠️ Archived (Obsolete) | **Obsoleted**: 2025-11-17

All test failures resolved. Current status: 1,422 tests passing (605 web + 817 graph), zero failures. Resolved through multiple implementations including storage abstraction, layout fixes, and history tracking.

[View Spec](./004-fix-failing-tests/)

---

### spec-005: Test Environment MSW
**Status**: 📝 Draft

Mock Service Worker (MSW) integration for test environment API mocking. E2E tests to run reliably without external API dependencies.

[View Spec](./005-test-environment-msw/)

---

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

### spec-008: Bookmark Query Views
**Status**: 🚧 In Progress | **Progress**: 24/57 tasks (42%)

Advanced query and filtering capabilities for bookmark management. Ability to bookmark entity/query pages and create views with select parameter variations. Phase 1-2 foundational work complete, User Story 1 in progress.

[View Spec](./008-bookmark-query-views/)

---

### spec-009: Graph Rendering Abstraction
**Status**: ✅ Complete (tasks untracked) | **Completed**: 2025-11-17

Decoupled graph rendering from specific graph packages. Force simulation in `packages/simulation/`, graph data structures in `packages/graph/`. Supports multiple node/edge types, directional edges, and custom forces. 817 tests passing. Implementation completed outside tasks.md workflow.

[View Spec](./009-graph-rendering-abstraction/)

---

### spec-010: Landing Page Layout
**Status**: 🚧 In Progress (Near Complete) | **Progress**: 48/55 tasks (87%)

Landing page responsive layout improvements (320px-3840px), WCAG 2.1 Level AA compliant touch targets (44px minimum), enhanced visual hierarchy with zoom support (150%-200%). All E2E tests passing. 7 polish phase tasks remain.

[View Spec](./010-landing-page-layout/)

---

### spec-011: Fix Vertical Scrolling
**Status**: ✅ Complete (tasks untracked) | **Completed**: 2025-11-17

Eliminated nested scrollbar issues in central section and sidebars. Fixed via layout component refactoring with proper overflow and padding settings. Implementation completed outside tasks.md workflow.

[View Spec](./011-fix-vertical-scrolling/)

---

### spec-012: History Catalogue Tracking
**Status**: ✅ Complete | **Completed**: 2025-11-17

Enhanced history tracking and catalogue management using catalogue storage provider's special "history" list. Implemented via commit `feat(web): migrate to catalogue-based history tracking system`.

[View Spec](./012-history-catalogue-tracking/)

---

### spec-013: Walden Research (OpenAlex Data Version 2)
**Status**: ✅ Complete | **Completed**: 2025-11-16

OpenAlex Walden (Data Version 2) support with xpac works (datasets, software, specimens). Includes visual distinction, work type badges, and Settings toggle for 190M additional research outputs.

[View Spec](./013-walden-research/)

---

### spec-014: Edge Direction Correction
**Status**: 🚧 In Progress | **Progress**: 34/53 tasks (64%)

Correcting graph edge directions to match OpenAlex data ownership model. Phases 1-2 complete, User Story 1 partial (16/19 tasks), User Story 2 partial (5/14 tasks). Outbound edges represent data stored on source entity; inbound edges discovered via reverse lookup.

[View Spec](./014-edge-direction-correction/)

---

### spec-015: OpenAlex Relationships
**Status**: ✅ Complete | **Completed**: 2025-11-18

Complete relationship implementation across all OpenAlex entity types. 90 tasks across 10 phases covering bidirectional relationships, type safety, and performance optimization.

[View Spec](./015-openalex-relationships/)

---

### spec-016: Entity Relationship Visualization
**Status**: 🚧 In Progress | **Progress**: 6/80 tasks (8%)

Enhanced entity detail pages with relationship visualization capabilities. Type filtering, count summaries, localStorage persistence, loading/error states. Only Phase 1 setup complete; core user stories pending.

[View Spec](./016-entity-relationship-viz/)

---

### spec-017: Entity Taxonomy Centralization
**Status**: 🚧 In Progress | **Progress**: 13/34 tasks (38%)

Centralize entity taxonomy definitions and metadata to `@academic-explorer/types`. Phase 1 complete, Phase 2 in progress. Predecessor work for spec-018 (Entity Consolidation).

[View Spec](./017-entity-taxonomy-centralization/)

---

### spec-018: Entity Consolidation
**Status**: 🚧 In Progress (Near Complete) | **Progress**: 39/40 tasks

EntityType consolidation to `@academic-explorer/types` as single source of truth. 39 of 40 tasks complete. Remaining: T040 (Commit documentation updates).

[View Spec](./018-entity-consolidation/)

---

### spec-019: Full Entity Support
**Status**: 🚧 In Progress (Near Complete) | **Progress**: 9/11 tasks (82%)

Implementation of all 12 OpenAlex entity types: Works, Authors, Sources, Institutions, Publishers, Funders, Topics, Concepts, Keywords, Domains, Fields, Subfields. Licenses excluded per research findings (not OpenAlex entities). Core implementation complete; documentation tasks remain.

[View Spec](./019-full-entity-support/)

---

### spec-020: E2E Test Coverage
**Status**: 🚧 In Progress | **Progress**: 0/107 tasks

E2E test coverage enhancement. Plan to add missing tests for untested routes, implement workflow tests, add error scenario coverage, and automate high-value manual tests.

[View Spec](./020-e2e-test-coverage/)

---

### spec-021: Mantine Responsive Layout
**Status**: ✅ Complete (tasks untracked) | **Completed**: 2025-11-21

Mantine UI responsive layout configuration corrections. Fixed layout issues with proper breakpoint configuration and auto-layout settings. Mobile search Enter-key trigger implemented. Implementation completed outside tasks.md workflow.

[View Spec](./021-mantine-responsive-layout/)

---

### spec-022: PostHog Sourcemaps
**Status**: 🚧 In Progress | **Progress**: 14/117 tasks (12%)

PostHog sourcemap integration for production error tracking with readable stack traces. Phases 1-2 and partial Phase 4 complete.

[View Spec](./022-posthog-sourcemaps/)

---

### spec-023: CI Optimization
**Status**: 🚧 In Progress (Near Complete) | **Progress**: 30/41 tasks (73%)

CI/CD pipeline optimization for faster build and deployment times. Build artifact caching, parallel test execution, conditional job skipping. Core implementation complete; testing and validation remain.

[View Spec](./023-ci-optimization/)

---

### spec-024: Algorithms Package
**Status**: 🚧 In Progress | **Progress**: 27/75 tasks (36%)

Core graph algorithms with Result/Option error handling. Foundational infrastructure complete (Graph class, types, Result/Option). Core algorithms (DFS, BFS, Dijkstra, pathfinding, graph analysis) pending implementation.

[View Spec](./024-algorithms-package/)

---

### spec-025: Graph Clustering
**Status**: ✅ Complete | **Completed**: 2025-11-25

9 clustering algorithms implemented: Louvain, Spectral, Hierarchical, K-Core, Leiden, Label Propagation, Infomap, Core-Periphery, Biconnected Components. 134 tasks, 51/65 tests passing (79%).

[View Spec](./025-graph-clustering/)

---

### spec-026: Graph Extraction
**Status**: 📝 Draft

Academic graph pattern extraction including ego networks, path analysis, motif detection, and research-specific subgraph operations.

[View Spec](./026-graph-extraction/)

---

### spec-027: Louvain Scaling Optimization
**Status**: 🚧 In Progress (Core Complete) | **Progress**: 53/72 tasks (74%)

Louvain algorithm scaling optimization with 97% performance improvement. 5 optimization phases: adaptive thresholds, optimized density calculation, early termination, CSR representation. 5.6-10.3s for 1000 nodes (70.6% speedup from 15.4s baseline). Core objectives achieved; verification and polish tasks remain.

[View Spec](./027-louvain-scaling-optimization/)

---

### spec-028: Complete OpenAlex Relationships
**Status**: 📝 Draft

Extension of spec-015 for complete relationship coverage including funding sources, publishers, and additional relationship types. Renumbered from 020 to resolve duplicate spec numbering.

[View Spec](./028-complete-openalex-relationships/)

---

## Known Issues

### Spec Numbering Cleanup (2025-11-25)

**Resolved Issues**:
- **Duplicate 020**: Renumbered `020-complete-openalex-relationships` → `028-complete-openalex-relationships`
- **Duplicate 022**: Removed empty `022-graph-extraction` directory (actual spec correctly located at `026-graph-extraction`)

All duplicate spec numbers have been resolved. Current spec numbering is consistent with one spec per number.

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

**Last Updated**: 2025-11-25 | **Total Specs**: 28 | **Maintained by**: [Constitution Principle XII](../.specify/memory/constitution.md#xii-spec-index-maintenance-non-negotiable)
