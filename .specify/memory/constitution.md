<!--
Sync Impact Report:
Version: 1.1.1 → 1.2.0 (test naming convention added to Principle II)
Modified Principles:
  - II. Test-First Development: Added mandatory test file naming convention
Added Sections: None
Removed Sections: None
Templates Requiring Updates:
  - ✅ .specify/templates/plan-template.md (No changes needed - principle number unchanged)
  - ✅ .specify/templates/spec-template.md (No changes needed - principle number unchanged)
  - ✅ .specify/templates/tasks-template.md (Updated test task examples to follow naming convention)
Follow-up TODOs:
  - Existing test files should be gradually migrated to follow the naming convention
  - CI/CD linting should validate test file naming patterns (optional enhancement)
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

Test file naming requirements:
- **MUST follow pattern**: `foo.[type].test.ts[x]` where type is one of:
  - `unit` - Isolated unit tests for individual functions/classes
  - `integration` - Tests across multiple components/modules
  - `component` - React component tests
  - `e2e` - End-to-end tests (Playwright)
- Examples: `auth.unit.test.ts`, `storage.integration.test.tsx`, `bookmark-search.e2e.test.ts`
- **NEVER use** generic names like `foo.test.ts` or `foo.spec.ts` without type classifier

For E2E tests with Playwright:
- Tests MUST run serially (NOT parallel) to prevent OOM errors
- Each E2E test MUST have isolated storage state
- Storage operations MUST complete within 2 seconds or fail

**Rationale**: The project's serial test execution requirement (due to memory constraints)
makes test failures expensive. Writing failing tests first ensures we detect actual
functionality gaps rather than accidentally passing tests. The E2E test isolation prevents
cascading failures that waste research time. The strict naming convention enables:
1. **Test type identification** - Instantly recognize test category without reading content
2. **Selective test execution** - Run only unit tests, or only E2E tests via glob patterns
3. **Organization clarity** - Prevent test classification ambiguity in monorepo structure
4. **Fail-fast efficiency** - Nx can intelligently order tests by type (unit → component → integration → e2e)

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

Staging requirements:
- **NEVER use `git add .` or `git add -A`** - these stage unrelated files and break atomicity
- ALWAYS use explicit file paths: `git add path/to/file1.ts path/to/file2.ts`
- Use `git add -p` (patch mode) for selective staging within files if needed
- Verify staged files with `git status` before committing
- Only stage files directly related to the atomic task being committed

**Rationale**: The PhD research workflow involves iterative experimentation where the ability
to bisect, revert, and understand historical changes is critical. Atomic commits enable:
1. **Bisect debugging** - Quickly identify which specific change introduced a regression
2. **Selective reversion** - Roll back problematic changes without losing other work
3. **Code review clarity** - Reviewers can understand changes incrementally
4. **Research reproducibility** - Each experiment milestone is clearly documented
5. **CI/CD efficiency** - Failed commits can be identified and fixed in isolation

Conventional commit format provides automated changelog generation and semantic versioning,
essential for maintaining the monorepo's multiple packages with independent version numbers.

Prohibiting `git add .` prevents accidentally committing unrelated changes (debug logs,
experiments, temporary files) that pollute the commit history and make bisecting impossible.

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
2. Stage ONLY the files related to the completed task using explicit paths
3. Review staged changes with `git status` and `git diff --staged`
4. Create a conventional commit with clear type and scope
5. Push commits regularly to avoid losing work

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
- NO commits may use `git add .` or `git add -A` for staging

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

**Version**: 1.2.0 | **Ratified**: 2025-11-11 | **Last Amended**: 2025-11-12
