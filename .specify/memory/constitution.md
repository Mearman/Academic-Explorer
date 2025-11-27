<!--
Sync Impact Report:
Version: 2.8.0 → 2.9.0 (MINOR: Strengthened Principle IX to eliminate "pre-existing" excuse)
Modified Principles:
  - Principle IX: Renamed "Deployment Readiness" → "Repository Integrity" with absolute
    accountability. Removed "Temporary Exception Handling" loophole. Added explicit prohibition
    against using "pre-existing" as an excuse. Expanded scope to include audit, warnings.
  - Quality Gates section: Updated to reference "Repository Integrity" and expanded coverage
  - Development Workflow section: Added repository integrity verification
Added Sections:
  - "Pre-existing is not an excuse" subsection in Principle IX
Removed Sections:
  - "Temporary Exception Handling" subsection (was providing loophole to defer fixes)
Templates Requiring Updates:
  - ✅ plan-template.md: Constitution Check section uses numbered list that accommodates changes
  - ✅ spec-template.md: Constitution Alignment section uses bullet list that accommodates changes
  - ✅ tasks-template.md: Constitution compliance verification checklist updated language
Follow-up TODOs: None
Previous Amendments:
  - v2.8.0: Added Principle XIV - Working Files Hygiene
  - v2.7.0: Added Principle XIII - Build Output Isolation
  - v2.6.0: Added Principle XII - Spec Index Maintenance
  - v2.5.0: Added Principle XI - Complete Implementation
  - v2.4.4: Fix Principle X to require SlashCommand tool usage
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
- **When spec status changes (draft → complete, etc.), update specs/README.md in the same commit** (see Principle XII)

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
development, it does NOT exempt work from Principle IX (Repository Integrity). All code
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

### IX. Repository Integrity (NON-NEGOTIABLE)

**NEVER leave the repository in a bad state**. When you touch the repository, you own its
state. ALL issues—tests, linting, build, audit, errors, warnings—MUST be resolved before
your work is complete. There are NO exceptions and NO excuses.

**"Pre-existing" is NOT an excuse**:
- If you encounter failing tests, fix them—regardless of who wrote them or when
- If you encounter lint errors, fix them—regardless of which files they're in
- If you encounter build errors, fix them—regardless of which package is affected
- If you encounter TypeScript errors, fix them—regardless of their origin
- If you encounter audit vulnerabilities, fix them—regardless of when they were introduced
- If you encounter warnings, fix them—regardless of whether they block the build
- **The phrase "pre-existing issue" is BANNED**—it implies someone else's problem, but when
  you're working in the repo, ALL problems are YOUR problems
- **Deferring issues is PROHIBITED**—do not create GitHub issues to "track" problems you
  should fix now
- **"Out of scope" is NOT valid**—if you broke it or found it broken, fixing it IS in scope

Repository integrity requirements:
- **ALL packages** MUST pass `pnpm typecheck` with zero errors
- **ALL packages** MUST pass `pnpm test` with zero failures
- **ALL packages** MUST pass `pnpm lint` with zero violations (errors AND warnings)
- **ALL packages** MUST pass `pnpm build` successfully
- **ALL packages** MUST pass `pnpm audit` with zero high/critical vulnerabilities
- Pre-commit hooks MUST pass without `--no-verify` bypass
- CI pipeline MUST be green before considering work complete

Zero-tolerance blocking issues:
- TypeScript compilation errors in ANY package
- Test failures in ANY test suite (unit, component, integration, E2E)
- ESLint errors OR warnings in ANY package
- Build failures in ANY package
- High or critical npm audit vulnerabilities
- Pre-commit hook failures

**Accountability model**:
- When you start working, run `pnpm validate` first
- If it fails, fix ALL failures before doing anything else
- When you finish working, run `pnpm validate` again
- If it fails, you are NOT done—keep working until it passes
- Your work session is complete ONLY when the repo is in a better state than you found it

**Why this matters**:
- A broken repo blocks ALL future work, not just yours
- "I'll fix it later" becomes "nobody fixes it ever"
- Accumulating issues creates compounding debt that becomes unfixable
- Research credibility requires a working, professional codebase
- Every session should leave the repo healthier, never sicker

**Rationale**: The project uses GitHub Pages for deployment with automated CI/CD. If ANY
package in the monorepo has errors, the entire deployment fails. More importantly, a
culture of "not my problem" for pre-existing issues leads to rapid codebase decay.

Taking absolute ownership of repository state ensures:
- Every session leaves the codebase deployable
- Issues are fixed when discovered, not deferred indefinitely
- No "broken window" accumulation of quality problems
- Research demonstrations work reliably
- The main branch always represents production-quality code

**Relationship to Development-Stage Pragmatism (Principle VII)**: While breaking changes
are acceptable during development, they must still result in a fully working repository.
Breaking changes are acceptable; broken repositories are not.

**Relationship to Complete Implementation (Principle XI)**: Repository integrity requires
implementing the FULL version of features. Incomplete implementations that "technically
pass" quality gates but leave the repo in a degraded state violate this principle.

**Relationship to Continuous Execution (Principle X)**: Continuous execution continues
until repository integrity is achieved. You cannot stop with a broken repo.

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
- Repository integrity gates fail and require manual intervention

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

**Relationship to Repository Integrity (Principle IX)**: Continuous execution continues
until repository integrity is achieved. If issues are discovered, they MUST be resolved
as part of the continuous execution flow, not deferred to a separate session.

**Relationship to Complete Implementation (Principle XI)**: Continuous execution continues
until the FULL implementation is complete. If a "simple" version is initially attempted,
execution MUST continue to implement the complete version without pausing or requiring
user permission to proceed.

### XI. Complete Implementation (NON-NEGOTIABLE)

**NEVER fall back to a "simple" or "basic" implementation when the full version encounters
difficulties**. When a feature or fix is specified, the FULL version MUST be implemented
as designed. Simplified alternatives are NOT acceptable fallbacks when the complete
implementation proves challenging.

Complete implementation requirements:
- If the specification describes a feature, implement it completely as specified
- If a bug requires a complex fix, implement the complete fix (not a workaround)
- If initial implementation attempts fail, debug and resolve the issues (do not simplify)
- If a "full version" exists alongside a proposed "simple version", ALWAYS implement the full version
- Simplified fallbacks are ONLY acceptable if explicitly approved by the user AFTER explaining why the full version is impossible

**Prohibited fallback patterns**:
- "Let me try a simpler approach instead" - NO, fix the complex approach
- "The full version is too difficult, here's a basic version" - NO, implement the full version
- "This workaround is easier than the proper fix" - NO, implement the proper fix
- "We can start with basic functionality and add the rest later" - NO, implement complete functionality now
- "The edge cases are hard, let's skip them" - NO, handle all edge cases
- "Let's use a library instead of implementing the algorithm" - Only if the library provides the FULL required functionality

**When encountering implementation difficulties**:
1. **Diagnose**: Understand what is blocking the full implementation
2. **Research**: Investigate solutions, techniques, or documentation needed
3. **Debug**: Fix errors, resolve conflicts, or address technical obstacles
4. **Persist**: Continue attempts to implement the full version until successful
5. **Escalate**: If genuinely impossible, explain to user why full version cannot be achieved and get explicit approval for alternative

**Acceptable exceptions** (require user approval):
- Genuine impossibility due to platform/language limitations (explain why)
- External dependency unavailability (explain why full version requires it)
- Specification ambiguity requiring user clarification (ask for clarification)
- Security or safety concerns with the full implementation (explain risks)

**Rationale**: This PhD research project requires fully functional, production-quality
implementations to support academic demonstrations and reproducible research. Simplified
fallbacks create technical debt, incomplete functionality, and unreliable results. Research
productivity depends on complete, working implementations that don't require revisiting.

Simplified fallbacks harm the project by:
1. **Creating technical debt** - "Simple" versions must eventually be replaced with full versions
2. **Wasting time** - Implementing twice (simple then full) costs more than implementing once
3. **Breaking trust** - Users expect specified functionality, not reduced alternatives
4. **Reducing quality** - Simplified versions often lack proper error handling, edge cases, or performance
5. **Blocking research** - Incomplete implementations prevent running full experiments
6. **Hiding problems** - Fallbacks mask underlying issues that should be fixed

This principle ensures:
- Features work completely as specified on the first implementation
- Bugs receive proper fixes, not temporary workarounds
- Technical challenges are solved, not avoided
- Research demonstrations showcase full functionality
- No revisiting "temporary" simplified implementations later

**Relationship to Development-Stage Pragmatism (Principle VII)**: While breaking changes
are acceptable during development, they must still implement the FULL new version, not a
simplified alternative.

**Relationship to Repository Integrity (Principle IX)**: Repository integrity requires
COMPLETE implementations. Simplified fallbacks that "technically work" but lack full
functionality do not satisfy repository integrity.

**Relationship to Continuous Execution (Principle X)**: If a simplified fallback is attempted
and recognized, continuous execution MUST continue to implement the full version without
pausing for user approval.

### XII. Spec Index Maintenance (NON-NEGOTIABLE)

**The `specs/README.md` file MUST be maintained as a current, accurate index of all feature
specifications in the repository**. This index serves as the single source of truth for
spec status, completion dates, and navigation.

Spec index requirements:
- **MUST exist** at `specs/README.md` in the repository root
- **MUST list ALL specs** in the `specs/` directory (no omissions)
- **MUST include for each spec**:
  - Spec number and name (e.g., "024 - Algorithms Package")
  - Current status (Draft, In Progress, Complete, Archived, Blocked)
  - Completion date (if status is Complete)
  - Brief description or link to spec.md
- **MUST be updated** whenever:
  - A new spec is created (`/speckit.specify`)
  - A spec's status changes (Draft → In Progress → Complete)
  - A spec is archived or deprecated
  - Major phase completions occur
- **Format MUST be consistent** (markdown table or structured list)
- **MUST be committed** alongside spec status changes (see Principle VI)

**Update workflow**:
- When creating new spec: Add entry to specs/README.md with status "Draft"
- When starting implementation: Update status to "In Progress"
- When completing spec: Update status to "Complete" and add completion date
- When archiving spec: Update status to "Archived" with reason
- Commit specs/README.md changes in same commit as spec status changes

**Rationale**: The project contains 27+ feature specifications spanning 2+ years of PhD
research development. Without a maintained index:
1. **Discovery failure** - Developers can't find existing specs or related work
2. **Duplicate work** - Similar features get re-specified because past specs are invisible
3. **Status confusion** - No clear understanding of which specs are complete vs abandoned
4. **Navigation burden** - Must manually explore directory structure to understand project scope
5. **Onboarding friction** - New contributors or future researchers can't quickly assess project state
6. **Historical context lost** - Completed specs are forgotten rather than serving as reference

A maintained index ensures:
- **Quick discovery** - Find relevant specs in seconds, not minutes
- **Status transparency** - Immediately see which specs are active, complete, or blocked
- **Project overview** - Single-page view of all feature development history
- **Duplicate prevention** - Check for similar specs before creating new ones
- **Research continuity** - PhD research remains navigable across time gaps
- **Knowledge preservation** - Completed specs remain accessible for reference

**Relationship to Atomic Commits (Principle VI)**: specs/README.md updates MUST be
committed atomically alongside the spec status changes they document, using the same
`docs(spec-###):` commit message format.

**Relationship to Continuous Execution (Principle X)**: After completing a spec
implementation, continuous execution includes updating specs/README.md status before
moving to the next spec.

### XIII. Build Output Isolation (NON-NEGOTIABLE)

**TypeScript builds MUST output to `dist/` directories, NEVER alongside source files**.
All `tsconfig.json` files in the monorepo MUST specify `outDir` and `rootDir` to ensure
compiled JavaScript, declaration files, and source maps are isolated from source code.

Build configuration requirements:
- **ALL `tsconfig.json` files** MUST include:
  ```json
  {
    "compilerOptions": {
      "rootDir": "./src",
      "outDir": "./dist"
    }
  }
  ```
- **NEVER omit `outDir`** - this causes TypeScript to emit files in-place
- **Compiled outputs** (`.js`, `.d.ts`, `.js.map`, `.d.ts.map`) MUST NEVER appear in `src/` directories
- **Build artifacts in `dist/`** are gitignored and MUST NOT be committed
- **Source files in `src/`** remain clean TypeScript only

Prohibited patterns:
- `tsconfig.json` without `outDir` specified
- Compiled `.js` files alongside `.ts` source files
- Declaration files (`.d.ts`) in source directories (except `vite-env.d.ts`)
- Source maps in source directories

**Detection and enforcement**:
```bash
# Check for compiled files in source directories (should return nothing)
find apps/*/src packages/*/src -name "*.js" -o -name "*.d.ts" -o -name "*.js.map" | grep -v vite-env

# Verify all tsconfig.json files have outDir
grep -L '"outDir"' apps/*/tsconfig.json packages/*/tsconfig.json
```

**Rationale**: In-place compilation pollutes source directories, breaks gitignore patterns,
confuses IDE tooling, and creates ambiguity about which files are source vs artifacts. The
monorepo requires clear separation between:
1. **Source code** (`src/`) - version controlled, human-edited TypeScript
2. **Build artifacts** (`dist/`) - generated, gitignored, disposable

Build output isolation ensures:
1. **Clean source directories** - Only `.ts`/`.tsx` files in `src/`
2. **Reliable gitignore** - `dist/` patterns work consistently
3. **Clear artifact boundaries** - No confusion about what to commit
4. **IDE performance** - Tooling doesn't index compiled duplicates
5. **Build reproducibility** - `dist/` can be deleted and regenerated
6. **Monorepo consistency** - All packages follow same output structure

**Relationship to Monorepo Architecture (Principle III)**: Build output isolation
complements the monorepo structure by ensuring each package's `dist/` directory contains
only that package's compiled output, enabling proper Nx caching and dependency tracking.

### XIV. Working Files Hygiene (NON-NEGOTIABLE)

**Temporary working files MUST be cleaned up and NEVER committed to the repository**.
Debug screenshots, fix chain documents, verification logs, and other transient artifacts
created during development MUST be removed before committing.

Working file requirements:
- **Debug screenshots** (e.g., `debug-*.png`, `screenshot-*.png`) MUST NOT be committed
- **Fix chain documents** (e.g., `*-FIX-*.md`, `*-FIX-CHAIN-*.md`) MUST NOT be committed
- **Verification documents** (e.g., `*-VERIFICATION-*.md`, `COMPLETE-*.md`) MUST NOT be committed
- **Temporary analysis files** (e.g., `CRITICAL-*.md`, `analysis-*.md`) MUST NOT be committed
- **Working notes** outside of `specs/` directory MUST NOT be committed
- **Test artifacts** not in designated test output directories MUST NOT be committed

**Gitignore enforcement**:
- ALL markdown (`.md`) and image files (`.png`, `.jpg`, `.jpeg`) are gitignored by default
- Intentional documentation MUST be force-added: `git add -f <file>`
- This prevents accidental commits of working files
- Force-add requires explicit intent to commit documentation/images

**Primary mechanism is still active cleanup**:
- Delete working files immediately after they serve their purpose
- Do NOT leave working files in the repository even if gitignored
- Clean working directory = professional development practice

**Cleanup workflow**:
1. Delete working files immediately after use (don't leave them around)
2. Before staging, verify no working files exist in the directory
3. Use explicit file paths when staging (`git add file1.ts file2.ts`)
4. For intentional docs/images, use `git add -f path/to/file.md`
5. Verify staged files with `git status` before committing

**Acceptable locations for documentation**:
- `specs/###-feature/` - Feature specifications and implementation plans
- `docs/` - Project documentation (if exists)
- `.specify/memory/` - Constitution and system memory
- `.specify/templates/` - Template files
- `README.md` files - Standard documentation

**Prohibited patterns**:
- Debug screenshots in `apps/` directories (e.g., `apps/web/debug-sidebar.png`)
- Fix chain documents in `apps/` directories (e.g., `apps/web/COMPLETE-FIX-CHAIN-*.md`)
- Temporary markdown files at project root or in `apps/` (outside `specs/`)
- Analysis artifacts scattered through the codebase

**Rationale**: The repository shows evidence of working files that were accidentally
committed or left behind during development:
- `apps/web/COMPLETE-FIX-CHAIN-2025-10-29.md`
- `apps/web/COMPLETE-VERIFICATION-2025-10-29.md`
- `apps/web/CRITICAL-FIX-ENTITY-LIST.md`
- `apps/web/debug-sidebar-content.png`

These files pollute the repository, confuse version control, and create noise in diffs.
They serve no purpose after the immediate development session ends.

Working files hygiene ensures:
1. **Clean repository** - Only source code and intentional documentation in version control
2. **Meaningful diffs** - PRs show actual code changes, not debug artifacts
3. **Professional codebase** - Repository represents production-quality work
4. **Disk space efficiency** - No accumulation of stale debug images
5. **Clear intent** - Every committed file has a purpose
6. **Research credibility** - Academic repository maintains standards

**Relationship to Atomic Commits (Principle VI)**: Proper cleanup before staging ensures
atomic commits contain only relevant changes, not accidentally included working files.

**Relationship to Repository Integrity (Principle IX)**: Working files can block deployment
if they trigger lint warnings or contain sensitive debug information. Cleanup is part of
repository integrity.

**Detection and enforcement**:
```bash
# Check for common working file patterns (should return nothing)
find . -name "debug-*.png" -o -name "*-FIX-*.md" -o -name "*-VERIFICATION-*.md" \
       -o -name "COMPLETE-*.md" -o -name "CRITICAL-*.md" | grep -v node_modules

# Review unstaged files before committing
git status --porcelain | grep -E '\.(png|jpg|md)$'
```

## Development Workflow

**Fail-fast test execution order**: TypeScript validation → Unit tests → Component tests
→ Integration tests → E2E tests. If unit tests fail, expensive E2E tests don't run.

**Quality pipeline**: All code MUST pass `pnpm validate` before commit:
1. `pnpm typecheck` - TypeScript validation (strict mode) across ALL packages
2. `pnpm test` - Full test suite (serially managed by Nx) across ALL packages
3. `pnpm build` - Production build verification across ALL packages
4. `pnpm lint` - ESLint checking across ALL packages

**Repository integrity verification**: Before AND after every work session:
```bash
# Run at START of session - fix any failures before doing new work
pnpm validate

# Run at END of session - do not stop until this passes
pnpm validate
```

**Build output verification**: Before committing, verify no compiled files in source directories:
```bash
# Should return nothing - any output indicates build output pollution
find apps/*/src packages/*/src -name "*.js" -o -name "*.d.ts" | grep -v vite-env
```

**Working files cleanup**: Before staging any files:
```bash
# Check for temporary working files (should return nothing)
find . -name "debug-*.png" -o -name "*-FIX-*.md" -o -name "COMPLETE-*.md" | grep -v node_modules

# Delete any found working files
rm -f apps/web/debug-*.png apps/web/*-FIX-*.md apps/web/COMPLETE-*.md apps/web/CRITICAL-*.md
```

**Nx-managed dependencies**: Use `nx affected:test` and `nx affected:build` to test/build
only changed projects. The dependency graph prevents building downstream projects when
upstream projects have type errors.

**Repository integrity checkpoint**: Before considering ANY work complete:
1. Run `pnpm validate` and ensure it passes completely (zero errors, zero warnings)
2. Run `pnpm audit` and ensure no high/critical vulnerabilities
3. Verify CI/CD would succeed if triggered right now
4. Only then mark work as complete
5. **If ANY check fails, you are NOT done—keep working**

**Spec file discipline**: After completing each phase of implementation:
1. Update task statuses in `tasks.md` (mark completed tasks)
2. Update any relevant artifacts (plan.md, data-model.md, contracts/)
3. Stage ONLY the spec directory files: `git add specs/###-feature-name/`
4. Create spec commit: `git commit -m "docs(spec-###): complete Phase X - <description>"`
5. Continue to next phase without pausing

**Spec index maintenance**: After completing a spec or changing its status:
1. Update `specs/README.md` with new status and completion date (if applicable)
2. Stage both the spec directory and specs/README.md: `git add specs/###-feature-name/ specs/README.md`
3. Create commit: `git commit -m "docs(spec-###): mark spec as complete"`
4. Keep specs/README.md current to maintain project navigability

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
2. Clean up any temporary working files (debug screenshots, fix documents)
3. Stage ONLY the files related to the completed task using explicit paths
4. Review staged changes with `git status` and `git diff --staged`
5. Create a conventional commit with clear type and scope
6. Push commits regularly to avoid losing work

**Complete implementation discipline**: When encountering implementation challenges:
1. Do NOT immediately propose a simplified alternative
2. Debug and resolve issues with the full implementation
3. Research solutions and techniques needed for the full version
4. Only escalate to user if the full version is genuinely impossible
5. Never assume a "simpler approach" is acceptable without user approval

## Quality Gates

**Constitution compliance**: Every PR MUST verify alignment with all fourteen core principles.
Feature specs MUST document how they respect type safety, test-first development, monorepo
architecture, storage abstraction, performance constraints, atomic commit discipline,
development-stage pragmatism, test-first bug fixes, repository integrity, continuous
execution, complete implementation, spec index maintenance, build output isolation, and
working files hygiene.

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

**Repository integrity gates**:
- All commits MUST leave the repository in a fully working state
- `pnpm validate` MUST pass completely (zero errors, zero warnings)
- `pnpm audit` MUST show no high/critical vulnerabilities
- CI/CD pipeline MUST be able to deploy without manual intervention
- **NO use of `--no-verify`**—if hooks fail, fix the issues, don't bypass them
- **NO deferring issues**—fix everything you find, regardless of origin

**Complete implementation verification**:
- Feature implementations MUST match specifications completely
- No simplified fallbacks accepted without documented user approval
- Bug fixes MUST address root causes, not symptoms
- Edge cases and error handling MUST be complete
- Performance requirements MUST be fully met, not approximated

**Spec index maintenance verification**:
- specs/README.md MUST list all specs in specs/ directory
- specs/README.md MUST be updated when spec status changes
- specs/README.md updates MUST be committed with spec changes
- No specs should be "hidden" or missing from the index

**Build output isolation verification**:
- All `tsconfig.json` files MUST specify `outDir` and `rootDir`
- No compiled files (`.js`, `.d.ts`, `.js.map`) in `src/` directories
- Build artifacts exist only in `dist/` directories
- Source directories contain only TypeScript source files

**Working files hygiene verification**:
- No debug screenshots in committed files
- No fix chain or verification documents in committed files
- No temporary analysis files outside `specs/` directory
- Working directory clean of transient artifacts before commit
- `.gitignore` includes patterns for common working file types

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

**Version**: 2.9.0 | **Ratified**: 2025-11-11 | **Last Amended**: 2025-11-27
