<!--
Sync Impact Report:
Version: 2.4.3 → 2.4.4 (PATCH: Fix Principle X to require SlashCommand tool usage)
Modified Principles:
  - Principle X (Continuous Execution): Updated automatic workflow progression section to
    require using SlashCommand tool instead of vague "automatically invoke" language
Removed Sections: None
Templates Requiring Updates:
  - ✅ No template updates required - SlashCommand tool invocation already documented in
    Development Workflow section
Follow-up TODOs: None
Previous Amendments:
  - v2.4.3: Add slash command invocation guidance to Development Workflow
  - v2.4.2: Strengthened prohibition against relative imports between packages
  - v2.4.1: Strengthened backward compatibility prohibition in Principle VII
  - v2.4.0: Added no re-export requirement to Principle III
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

Package import requirements:
- **MUST use package aliases** for cross-package imports (e.g., `@academic-explorer/client`)
- **NEVER use relative imports** to reference other packages (e.g., `../../packages/client`)
- Relative imports are ONLY allowed within the same package
- Package aliases defined in `tsconfig.base.json` paths:
  - `@academic-explorer/client` → `packages/client/src/index.ts`
  - `@academic-explorer/utils` → `packages/utils/src/index.ts`
  - `@academic-explorer/graph` → `packages/graph/src/index.ts`
  - `@academic-explorer/simulation` → `packages/simulation/src/index.ts`
  - `@academic-explorer/types` → `packages/types/src/index.ts`
  - `@academic-explorer/ui` → `packages/ui/src/index.ts`
  - `@/*` → `apps/web/src/*` (web app internal imports only)

**Relative import prohibition** (STRENGTHENED):
- **Relative imports between packages are ABSOLUTELY FORBIDDEN**
- This applies to imports from:
  - `apps/` → `packages/` (e.g., web app importing from packages)
  - `packages/` → `packages/` (e.g., graph package importing from utils)
  - `packages/` → `apps/` (should never happen - apps depend on packages, not vice versa)
- **Relative imports WITHIN a package** are allowed and encouraged (e.g., `./utils/helper.ts`)
- **Example violations**:
  ```typescript
  // ❌ WRONG: apps/web/src/components/Graph.tsx
  import { GraphNode } from "../../../packages/graph/src/types/core"

  // ❌ WRONG: packages/graph/src/services/analyzer.ts
  import { logger } from "../../utils/src/logger"

  // ❌ WRONG: packages/utils/src/storage/dexie-provider.ts
  import type { EntityType } from "../../types/src/entities"
  ```
- **Correct patterns**:
  ```typescript
  // ✅ CORRECT: apps/web/src/components/Graph.tsx
  import type { GraphNode } from "@academic-explorer/graph"

  // ✅ CORRECT: packages/graph/src/services/analyzer.ts
  import { logger } from "@academic-explorer/utils"

  // ✅ CORRECT: packages/utils/src/storage/dexie-provider.ts
  import type { EntityType } from "@academic-explorer/types"

  // ✅ CORRECT: Within same package - packages/graph/src/services/analyzer.ts
  import { GraphNode } from "../types/core"
  ```

**Enforcement**:
- Code reviewers MUST check for relative imports between packages
- Use search patterns to detect violations:
  ```bash
  # Check apps/ for relative imports to packages/
  grep -r "from ['\"]\.\.\/\.\.\/packages" apps/

  # Check packages/ for relative imports to other packages/
  grep -r "from ['\"]\.\.\/\.\.\/[^.]" packages/
  ```
- ESLint rules should be configured to detect and reject these patterns (if possible)
- All imports between packages MUST use the `@academic-explorer/*` aliases

**No re-export requirement**:
- **Internal packages MUST NOT re-export exports from other internal packages**
- Each package MUST define its own types, interfaces, and functions
- If a type/function is needed by multiple packages, it MUST be defined in the most
  foundational package (typically `@academic-explorer/types` or `@academic-explorer/utils`)
- Consumers MUST import directly from the canonical source, not through intermediary packages
- Re-exports create hidden dependencies and make refactoring difficult
- **Example violation**:
  ```typescript
  // ❌ WRONG: packages/graph/src/index.ts
  export type { EntityType } from "@academic-explorer/types"

  // ❌ WRONG: consumers importing from graph
  import type { EntityType } from "@academic-explorer/graph"
  ```
- **Correct pattern**:
  ```typescript
  // ✅ CORRECT: consumers import directly from canonical source
  import type { EntityType } from "@academic-explorer/types"
  ```
- **Backward compatibility exception**: Re-exports are NOT acceptable even for backward
  compatibility. If types move between packages, consumers MUST update their imports.
  This aligns with Principle VII (Development-Stage Pragmatism) which allows breaking
  changes during active development.

**Rationale**: The project needs to share OpenAlex client code, graph structures, and UI
components across web app and CLI. Nx caching speeds up CI/CD for iterative research
development. The monorepo prevents drift between the interactive visualization tool and
the command-line data management tool. Package alias imports enable:
1. **Refactoring safety** - Moving packages doesn't break imports across the monorepo
2. **Build optimization** - Nx can correctly track package dependencies for caching
3. **Code clarity** - Explicit package boundaries prevent circular dependencies
4. **IDE support** - Better autocomplete and go-to-definition functionality
5. **Module resolution** - Consistent import paths regardless of file location

The relative import prohibition ensures:
1. **Dependency transparency** - All cross-package dependencies are explicit in tsconfig.base.json
2. **Build correctness** - Nx can accurately compute dependency graph for caching and incremental builds
3. **Refactoring safety** - Moving files within packages doesn't break external consumers
4. **Path consistency** - Same import pattern works from any file location in monorepo
5. **Type resolution** - TypeScript module resolution works correctly with aliases, not brittle relative paths

The no re-export requirement ensures:
1. **Dependency transparency** - Import statements reveal true source of types/functions
2. **Refactoring clarity** - Moving code between packages doesn't break hidden re-export chains
3. **Build performance** - Eliminates unnecessary re-export compilation overhead
4. **Import traceability** - IDE "find all references" shows actual usage, not re-export layers
5. **Architectural honesty** - Package dependencies are explicit in imports, not hidden in re-exports

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

**Spec file commit requirements**:
- **ALWAYS commit changes to `./specs/` directory after each phase completion**
- Spec files include: `spec.md`, `plan.md`, `tasks.md`, `research.md`, `data-model.md`, contracts, checklists
- Commit spec changes separately from implementation changes
- Spec commits MUST use `docs(spec-###):` prefix (e.g., `docs(spec-018): complete Phase 1 setup tasks`)
- Phase completion = all tasks in that phase marked complete + any generated artifacts
- Do NOT wait until feature completion to commit spec changes
- Enables tracking of progress even if implementation is interrupted

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

Committing spec changes after each phase ensures:
1. **Progress persistence** - Work is never lost even if execution is interrupted
2. **Audit trail** - Clear history of which phases completed and when
3. **Collaboration readiness** - Other developers can see implementation progress
4. **Recovery capability** - Can resume implementation from last completed phase
5. **Documentation accuracy** - Spec files reflect actual implementation state

### VII. Development-Stage Pragmatism (NON-NEGOTIABLE)

**NEVER include backward compatibility or legacy support**. The application is unreleased
and still in active development for PhD research purposes. Backward compatibility adds
complexity and hinders progress without providing any value.

Development-stage requirements:
- Breaking changes to APIs, data models, and interfaces are ENCOURAGED when they improve design
- Database schema changes can be destructive (no data migration required)
- Configuration formats can change without backward compatibility
- Dependencies can be upgraded to latest versions without considering legacy support
- Experimental features can be removed if they don't work out
- Storage formats can change without preserving old data
- **Re-exports for backward compatibility are PROHIBITED** (violates Principle III)
- **Migration paths are NOT required** - consumers update their imports directly
- **Deprecation warnings are NOT required** - just make the breaking change
- **Version constraints do NOT apply** - MAJOR version bumps are not required for breaking changes

**Explicit backward compatibility prohibition**:
- NEVER maintain old APIs alongside new ones "for compatibility"
- NEVER create wrapper functions to preserve old behavior
- NEVER add conditional logic to support both old and new patterns
- NEVER document migration paths or upgrade guides during development
- NEVER preserve deprecated features "just in case"
- If a refactoring requires breaking changes, make them immediately without hesitation

**IMPORTANT**: This principle applies ONLY during development. Before any public release or
when the project transitions to production use, this principle MUST be revisited and likely
removed or replaced with stricter compatibility requirements.

**Deployment Readiness Exception**: While this principle allows breaking changes during
development, it does NOT exempt work from Principle IX (Deployment Readiness). All code
MUST be deployment-ready even during development—pre-existing issues MUST be resolved
before work is considered complete.

**Rationale**: The project is currently in active PhD research development (June 2023+).
The application is unreleased with a single developer/user. Backward compatibility measures
during this phase are pure overhead that:
1. Slow down experimentation and hypothesis testing
2. Lock in suboptimal design decisions made early in research
3. Create technical debt for features that may be discarded
4. Waste research time on migration code that benefits literally no users
5. Prevent adoption of better approaches discovered during research
6. Add complexity to the codebase without delivering any value
7. Require maintaining multiple code paths for the same functionality

Once the research stabilizes and the tool is ready for wider academic use, a proper
versioning and compatibility strategy will be essential. At that point, this principle
should be replaced with appropriate stability guarantees for external users.

### VIII. Test-First Bug Fixes (NON-NEGOTIABLE)

**When a bug is identified, test(s) MUST be written to confirm and diagnose it BEFORE
fixing the bug**. The test(s) must demonstrate the bug's symptoms and fail reliably.
Only after test verification should the fix be implemented.

Test-first bug fix workflow:
1. **Reproduce**: Write test(s) that reproduce the bug behavior
2. **Verify Failure**: Confirm test(s) fail in the expected way
3. **Diagnose**: Use failing test(s) to understand root cause
4. **Fix**: Implement the minimal fix that makes test(s) pass
5. **Verify Success**: Confirm test(s) now pass
6. **Regression Prevention**: Tests remain in suite permanently

Bug test requirements:
- Test MUST fail before the fix is applied
- Test MUST pass after the fix is applied
- Test MUST use appropriate naming: `bug-[id]-[description].[type].test.ts[x]`
- Test MUST include comments explaining the bug and expected behavior
- Test MUST be committed separately from the fix (two atomic commits: test + fix)

**Rationale**: Bug fixes without tests create regression risks and waste research time when
bugs reappear. Writing tests first ensures:
1. **Bug Confirmation** - Validates the bug exists and is reproducible
2. **Regression Prevention** - Ensures the bug never returns undetected
3. **Root Cause Understanding** - Forces clear diagnosis before attempting fixes
4. **Fix Validation** - Provides objective proof the fix works
5. **Documentation** - Tests serve as living documentation of historical issues
6. **Research Reliability** - Prevents regressions from invalidating experiments

This principle is especially critical for this PhD research project where:
- Serial test execution makes debugging expensive
- Experimental features may be temporarily removed and later re-added
- Research reproducibility requires stable, regression-free code
- Academic demonstrations must work reliably without surprises

### IX. Deployment Readiness (NON-NEGOTIABLE)

**Work is NOT complete if there are ANY outstanding issues in the repository, including
pre-existing issues**. Deployment cannot run if ANY package has typecheck errors, test
failures, lint violations, or build failures. Before marking work as complete, ALL blocking
issues across the entire monorepo MUST be resolved.

Deployment readiness requirements:
- **ALL packages** MUST pass `pnpm typecheck` with zero errors
- **ALL packages** MUST pass `pnpm test` with zero failures
- **ALL packages** MUST pass `pnpm lint` with zero violations
- **ALL packages** MUST pass `pnpm build` successfully
- Pre-existing issues MUST be fixed or explicitly deferred with documented reason
- Commits using `--no-verify` to bypass pre-commit hooks are ONLY acceptable as temporary
  measures and MUST be followed by immediate fix commits

Zero-tolerance blocking issues:
- TypeScript compilation errors in ANY package
- Test failures in ANY test suite (unit, component, integration, E2E)
- ESLint errors (warnings are acceptable if documented)
- Build failures in ANY package
- Pre-commit hook failures (unless explicitly bypassed with documented justification)

Completion criteria for features/specs:
- Feature implementation complete AND tests passing
- ALL pre-existing issues blocking deployment are resolved
- Full quality pipeline passes: `pnpm validate` succeeds across entire monorepo
- CI/CD pipeline can deploy without errors or manual intervention
- Branch is merge-ready with no known deployment blockers

**Rationale**: The project uses GitHub Pages for deployment with automated CI/CD. If ANY
package in the monorepo has errors, the entire deployment fails. This creates a critical
dependency: new features cannot be deployed if pre-existing issues block the build pipeline.

Research productivity is destroyed when:
1. **Completed features can't be deployed** due to unrelated pre-existing errors
2. **Demos fail** because deployment was blocked by issues in other packages
3. **Time is wasted** tracking down "which issue broke deployment" across packages
4. **False completion** occurs when features "work" but can't reach production
5. **Technical debt accumulates** because "someone else's errors" are tolerated

This principle ensures:
- Every feature can be deployed immediately upon completion
- No feature creates or leaves deployment blockers for future work
- The main branch always remains in a deployable state
- Pre-existing issues are surfaced and resolved, not ignored
- Research demonstrations can be confidently scheduled knowing deployment works

**Relationship to Development-Stage Pragmatism (Principle VII)**: While Principle VII allows
breaking changes during development, it does NOT allow leaving the codebase in an
undeployable state. Breaking changes are acceptable; broken builds are not.

**Temporary Exception Handling**: If pre-existing issues are discovered that are genuinely
outside the scope of current work AND would require significant effort to fix:
1. Create a GitHub issue documenting the problem
2. Add the issue to a deployment blockers tracking document
3. Explicitly defer the fix with timeline and ownership
4. Ensure current work does NOT make the issue worse
5. Return to fix deployment blockers before starting new features

This exception should be used sparingly—the default expectation is to fix all blockers
before marking work complete.

### X. Continuous Execution

**Implementation work MUST NOT stop or pause between phases, tasks, or due to context window
or token limits**. When executing multi-phase implementations (e.g., specs with 80+ tasks
across 7 phases), work MUST continue seamlessly from one phase to the next without waiting
for user approval or pausing for resource constraints.

Continuous execution requirements:
- Complete all planned phases in a single execution flow
- Do NOT stop between Phase 1 and Phase 2, Phase 2 and Phase 3, etc.
- Do NOT pause due to context window size or token usage
- Do NOT ask for user confirmation to continue between phases
- Commit work atomically after each task or small group of related tasks
- Commit spec file changes after each phase completion (Principle VI requirement)
- Maintain progress tracking (TodoWrite) throughout continuous execution
- Only stop when ALL phases are complete or a blocking error occurs

**Automatic workflow progression**:
- After completing `/speckit.plan`, if there are NO outstanding questions or
  clarifications needed, MUST use SlashCommand tool to invoke `/speckit.tasks`
  then `/speckit.implement`
- Correct invocation pattern:
  ```
  <invoke name="SlashCommand">
  <parameter name="command">/speckit.tasks</parameter>
  </invoke>
  ```
- Do NOT wait for user approval to proceed from planning to task generation
- Do NOT wait for user approval to proceed from task generation to implementation
- Do NOT use vague language like "will automatically invoke" - use SlashCommand
  tool explicitly
- Check for blockers: unresolved NEEDS CLARIFICATION markers, failed validations,
  missing dependencies
- If NO blockers exist, immediately use SlashCommand tool to proceed to next phase
- User intervention is ONLY required when blockers are discovered or errors occur
- Example flow: `/speckit.specify` → `/speckit.plan` → (SlashCommand tool)
  `/speckit.tasks` → (SlashCommand tool) `/speckit.implement`

Resource management during continuous execution:
- Use efficient tool calls (parallel when possible, minimal reads)
- Commit frequently to persist work and free memory
- Prioritize essential information over verbose logging
- Trust that work can continue even at high token usage
- Focus on completing the implementation rather than reporting status

Stopping conditions (ONLY stop if):
- ALL planned phases/tasks are complete
- A blocking error prevents further progress (build failure, test failure)
- User explicitly requests to stop or pause
- Deployment readiness gates fail and require manual intervention

**Rationale**: The project involves large-scale feature implementations with 80+ atomic tasks
spanning multiple phases (Setup → User Stories → Integration → Deployment). Pausing between
phases breaks flow, wastes time, and creates coordination overhead. Research productivity
requires uninterrupted execution of planned work.

Continuous execution ensures:
1. **Flow state preservation** - Maintain context and momentum across related tasks
2. **Time efficiency** - Complete features in single sessions rather than fragmented work
3. **Reduced overhead** - Eliminate coordination delays between phases
4. **Better testing** - Full feature testing happens in one session with consistent state
5. **Faster iteration** - Research experiments complete faster with uninterrupted execution
6. **Context retention** - Implementation decisions remain fresh across all phases

**Relationship to Atomic Commits (Principle VI)**: Continuous execution does NOT mean
making one giant commit at the end. Commits MUST still be atomic and incremental throughout
the continuous execution. The difference is that execution continues without pausing,
while commits happen frequently to persist progress.

**Relationship to Deployment Readiness (Principle IX)**: Continuous execution continues
until deployment readiness is achieved. If pre-existing issues block deployment, they
MUST be resolved as part of the continuous execution flow, not deferred to a separate session.

## Development Workflow

**Fail-fast test execution order**: TypeScript validation → Unit tests → Component tests
→ Integration tests → E2E tests. If unit tests fail, expensive E2E tests don't run.

**Quality pipeline**: All code MUST pass `pnpm validate` before commit:
1. `pnpm typecheck` - TypeScript validation (strict mode) across ALL packages
2. `pnpm test` - Full test suite (serially managed by Nx) across ALL packages
3. `pnpm build` - Production build verification across ALL packages
4. `pnpm lint` - ESLint checking across ALL packages

**Nx-managed dependencies**: Use `nx affected:test` and `nx affected:build` to test/build
only changed projects. The dependency graph prevents building downstream projects when
upstream projects have type errors.

**Deployment readiness verification**: Before considering ANY work complete:
1. Run `pnpm validate` and ensure it passes completely
2. Check for any pre-existing issues in other packages
3. If issues found, either fix them or explicitly defer with documentation
4. Verify CI/CD would succeed if triggered right now
5. Only then mark work as complete

**Spec file discipline**: After completing each phase of implementation:
1. Update task statuses in `tasks.md` (mark completed tasks)
2. Update any relevant artifacts (plan.md, data-model.md, contracts/)
3. Stage ONLY the spec directory files: `git add specs/###-feature-name/`
4. Create spec commit: `git commit -m "docs(spec-###): complete Phase X - <description>"`
5. Continue to next phase without pausing

**Slash command invocation**: When invoking SpecKit workflow commands or other custom
slash commands from the available commands list:
- **MUST use the SlashCommand tool** - DO NOT attempt to invoke slash commands by simply
  typing them in responses
- Correct invocation pattern:
  ```
  <invoke name="SlashCommand">
  <parameter name="command">/speckit.plan</parameter>
  </invoke>
  ```
- Incorrect patterns (DO NOT USE):
  - Typing `/speckit.plan` directly in response text (will not trigger command)
  - Using echo or bash commands to "invoke" slash commands
  - Attempting to manually expand command prompts
- Available commands are listed in the SlashCommand tool description
- This applies to ALL custom slash commands: /speckit.*, and any user-defined commands

**No DRY violations**: Create abstractions over duplication. If the same logic appears in
two places, extract it to `packages/utils` or create a shared package.

**Commit discipline**: After completing each atomic task:
1. Verify all quality gates pass for the changes
2. Stage ONLY the files related to the completed task using explicit paths
3. Review staged changes with `git status` and `git diff --staged`
4. Create a conventional commit with clear type and scope
5. Push commits regularly to avoid losing work

## Quality Gates

**Constitution compliance**: Every PR MUST verify alignment with all ten core principles.
Feature specs MUST document how they respect type safety, test-first development, monorepo
architecture, storage abstraction, performance constraints, atomic commit discipline,
development-stage pragmatism, test-first bug fixes, deployment readiness, and continuous
execution.

**Complexity justification**: Any feature that adds architectural complexity (new package,
new storage provider, new worker) MUST document why a simpler alternative is insufficient.
Follow YAGNI principles unless research requirements demand the complexity.

**Breaking changes**: MAJOR.MINOR.PATCH versioning applies to all packages. During development
stage (Principle VII), breaking changes are acceptable without MAJOR version bumps, but they
MUST be documented in commit messages and changelogs.

**Test coverage gates**:
- All new storage operations MUST have unit tests with mock provider
- All new storage operations MUST have E2E tests with in-memory provider
- All new components MUST have component tests
- All new graph features MUST have deterministic layout tests
- All bug fixes MUST have regression tests written before the fix

**Commit quality gates**:
- All commits MUST follow Conventional Commits format
- Each commit MUST represent a single logical change
- Commit messages MUST clearly describe the "why" not just the "what"
- All commits MUST pass quality pipeline before pushing to shared branches
- NO commits may use `git add .` or `git add -A` for staging
- Spec file changes MUST be committed after each phase completion

**Deployment readiness gates**:
- All commits MUST leave the repository in a deployable state
- Pre-existing deployment blockers MUST be resolved or explicitly deferred
- `pnpm validate` MUST pass completely before marking work as complete
- CI/CD pipeline MUST be able to deploy without manual intervention
- Any use of `--no-verify` MUST be followed by immediate fix commits

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

**Version**: 2.4.3 | **Ratified**: 2025-11-11 | **Last Amended**: 2025-11-21
