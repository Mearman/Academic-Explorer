<!--
Sync Impact Report:
Version: 1.0.0 → 1.1.0 (new principle added)
Modified Principles: None (existing principles unchanged)
Added Sections:
  - VI. Atomic Conventional Commits (new principle)
  - Updated Development Workflow to reference commit discipline
Removed Sections: None
Templates Requiring Updates:
  - ✅ .specify/templates/plan-template.md (Constitution Check section already flexible for new principles)
  - ✅ .specify/templates/spec-template.md (Constitution Alignment section already flexible)
  - ✅ .specify/templates/tasks-template.md (Phase N includes constitution verification checklist)
  - ⚠ Task execution workflows should enforce commits between tasks
Follow-up TODOs:
  - Agents/workflows should check for uncommitted changes before moving to next task
  - CI/CD pipeline could enforce conventional commit format via commitlint (optional)
-->

# Academic Explorer Constitution

## Core Principles

### I. Type Safety (NON-NEGOTIABLE)

**NEVER use `any` types**. Use `unknown` with type guards instead. TypeScript assertions
(e.g., `as SomeType`) are discouraged; prefer type narrowing through runtime checks. All
code must pass strict TypeScript validation without errors or suppressions.

**Rationale**: This PhD research project requires maintainable, reliable code for academic
reproducibility. Runtime type errors would invalidate research results and E2E tests. The
strict typing discipline catches integration issues at compile time rather than during
experiments or user demonstrations.

### II. Test-First Development (NON-NEGOTIABLE)

**Tests must be written and verified to FAIL before implementation begins**. Follow the
Red-Green-Refactor cycle strictly: write test → verify it fails → implement → verify it
passes → refactor.

For E2E tests with Playwright:
- Tests MUST run serially (NOT parallel) to prevent OOM errors
- Each E2E test MUST have isolated storage state
- Storage operations MUST complete within 2 seconds or fail

**Rationale**: The project's serial test execution requirement (due to memory constraints)
makes test failures expensive. Writing failing tests first ensures we detect actual
functionality gaps rather than accidentally passing tests. The E2E test isolation prevents
cascading failures that waste research time.

### III. Monorepo Architecture

**Nx workspace structure is mandatory**. All packages MUST use the monorepo's shared
configuration, shared utilities, and build orchestration. Dependencies between packages
MUST be declared explicitly in Nx project configuration.

Structure requirements:
- `apps/` for deployable applications (web, cli)
- `packages/` for shared libraries (client, graph, simulation, ui, utils)
- Shared config in `config/` directory
- Each package MUST have clear, single responsibility

**Rationale**: The project needs to share OpenAlex client code, graph structures, and UI
components across web app and CLI. Nx caching speeds up CI/CD for iterative research
development. The monorepo prevents drift between the interactive visualization tool and
the command-line data management tool.

### IV. Storage Abstraction

**Storage implementations MUST be injectable and swappable**. All persistence operations
MUST go through a defined storage provider interface. No direct coupling to IndexedDB,
Dexie, localStorage, or any specific storage mechanism.

Storage provider requirements:
- Interface defines all CRUD operations with consistent promise-based API
- IndexedDB provider for production persistence
- In-memory provider for E2E/Playwright tests
- Mock provider for unit tests
- Providers MUST handle initialization errors gracefully

**Rationale**: Playwright's IndexedDB incompatibilities blocked 28+ E2E tests from passing,
preventing regression detection in the PhD research workflow. The abstraction enables fast,
isolated test execution while maintaining production data persistence. This principle
emerged directly from the 001-storage-abstraction feature specification.

### V. Performance & Memory

**Memory constraints are real**. Tests MUST run serially to avoid out-of-memory errors.
Large graph datasets require optimization. Force simulation calculations MUST run in Web
Workers to avoid blocking the main thread.

Performance requirements:
- Bundle size warnings at 800kB, failures at 1MB
- Storage operations complete within 2 seconds
- Unit tests execute in under 100ms each
- Graph simulations handle 1000+ nodes without freezing
- Deterministic layouts use fixed seeds for reproducibility

**Rationale**: The research context requires reproducible visualizations and reliable
automated testing. OOM failures during test runs waste hours of research time. Academic
users need responsive graph interactions even with large citation networks. Deterministic
layouts ensure figures in papers can be regenerated consistently.

### VI. Atomic Conventional Commits (NON-NEGOTIABLE)

**ALWAYS create incremental atomic conventional commits from uncommitted changes before
moving onto the next task**. Each commit MUST represent a single, complete unit of work
that can be understood in isolation. Commit messages MUST follow the Conventional Commits
specification.

Commit requirements:
- Format: `<type>(<scope>): <description>` (e.g., `feat(msw): add logging for request lifecycle`)
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`
- Each commit MUST pass all quality gates (typecheck, test, build, lint)
- Commits MUST be made after completing each atomic task, not batched at the end
- Work-in-progress commits are allowed with `WIP:` prefix during development, but MUST be squashed before PR
- NEVER move to a new task with uncommitted changes from the previous task

**Rationale**: The PhD research workflow involves iterative experimentation where the ability
to bisect, revert, and understand historical changes is critical. Atomic commits enable:
1. **Bisect debugging** - Quickly identify which specific change introduced a regression
2. **Selective reversion** - Roll back problematic changes without losing other work
3. **Code review clarity** - Reviewers can understand changes incrementally
4. **Research reproducibility** - Each experiment milestone is clearly documented
5. **CI/CD efficiency** - Failed commits can be identified and fixed in isolation

Conventional commit format provides automated changelog generation and semantic versioning,
essential for maintaining the monorepo's multiple packages with independent version numbers.

## Development Workflow

**Fail-fast test execution order**: TypeScript validation → Unit tests → Component tests
→ Integration tests → E2E tests. If unit tests fail, expensive E2E tests don't run.

**Quality pipeline**: All code MUST pass `pnpm validate` before commit:
1. `pnpm typecheck` - TypeScript validation (strict mode)
2. `pnpm test` - Full test suite (serially managed by Nx)
3. `pnpm build` - Production build verification
4. `pnpm lint` - ESLint checking

**Nx-managed dependencies**: Use `nx affected:test` and `nx affected:build` to test/build
only changed projects. The dependency graph prevents building downstream projects when
upstream projects have type errors.

**No DRY violations**: Create abstractions over duplication. If the same logic appears in
two places, extract it to `packages/utils` or create a shared package.

**Commit discipline**: After completing each atomic task:
1. Verify all quality gates pass for the changes
2. Stage only the files related to the completed task
3. Create a conventional commit with clear type and scope
4. Push commits regularly to avoid losing work

## Quality Gates

**Constitution compliance**: Every PR MUST verify alignment with all six core principles.
Feature specs MUST document how they respect type safety, test-first development, monorepo
architecture, storage abstraction, performance constraints, and atomic commit discipline.

**Complexity justification**: Any feature that adds architectural complexity (new package,
new storage provider, new worker) MUST document why a simpler alternative is insufficient.
Follow YAGNI principles unless research requirements demand the complexity.

**Breaking changes**: MAJOR.MINOR.PATCH versioning applies to all packages. Breaking changes
to shared package APIs require documentation of migration path and approval from maintainers.

**Test coverage gates**:
- All new storage operations MUST have unit tests with mock provider
- All new storage operations MUST have E2E tests with in-memory provider
- All new components MUST have component tests
- All new graph features MUST have deterministic layout tests

**Commit quality gates**:
- All commits MUST follow Conventional Commits format
- Each commit MUST represent a single logical change
- Commit messages MUST clearly describe the "why" not just the "what"
- All commits MUST pass quality pipeline before pushing to shared branches

## Governance

This constitution supersedes all other development practices. Amendments require:
1. Documentation of the principle change with rationale
2. Update to affected templates (plan-template.md, spec-template.md, tasks-template.md)
3. Version bump according to semantic versioning rules
4. Validation that existing features still comply

All PRs and code reviews MUST verify compliance with this constitution. Features that
violate principles without documented justification MUST be rejected.

For runtime development guidance specific to Academic Explorer workflows, see `CLAUDE.md`
in the project root. That file provides operational instructions (commands, architecture
patterns, research context) while this constitution defines non-negotiable principles.

**Version**: 1.1.0 | **Ratified**: 2025-11-11 | **Last Amended**: 2025-11-12
