<!--
Sync Impact Report:
Version: 2.11.0 → 2.11.1 (PATCH: README conciseness improvements and template alignment)
Modified Sections: README.md (conciseness improvements)
Added Sections: Constitution version history entry for v2.11.1
Removed Sections: None
Templates Requiring Updates: None (all templates already aligned with Principle XVI)
Follow-up TODOs: None
Previous Amendments:
  - v2.11.0: Added Principle XVI - Presentation/Functionality Decoupling
  - v2.10.0: Added Principle XV - DRY Code & Configuration
  - v2.9.0: Strengthened Principle IX "Pre-existing is not an excuse"
  - v2.8.0: Added Principle XIV - Working Files Hygiene
  - v2.7.0: Added Principle XIII - Build Output Isolation
  - v2.6.0: Added Principle XII - Spec Index Maintenance
  - v2.5.0: Added Principle XI - Complete Implementation
  - v2.4.4: Fixed Principle X to require SlashCommand tool usage
  - v2.4.3: Added slash command invocation guidance
  - v2.4.2: Strengthened prohibition against relative imports between packages
  - v2.4.1: Strengthened backward compatibility prohibition in Principle VII
  - v2.4.0: Added no re-export requirement to Principle III
-->

# BibGraph Constitution (v2.11.1)

## Version History

- **v2.11.1** (2025-11-30): README conciseness improvements and template alignment validation
- **v2.11.0** (2025-11-29): Added Principle XVI - Presentation/Functionality Decoupling
- **v2.10.0**: Added Principle XV - DRY Code & Configuration
- **v2.9.0**: Strengthened Principle IX "Pre-existing is not an excuse"
- **v2.8.0**: Added Principle XIV - Working Files Hygiene
- **v2.7.0**: Added Principle XIII - Build Output Isolation
- **v2.6.0**: Added Principle XII - Spec Index Maintenance
- **v2.5.0**: Added Principle XI - Complete Implementation
- **v2.4.4**: Fixed Principle X to require SlashCommand tool usage
- **v2.4.3**: Added slash command invocation guidance
- **v2.4.2**: Strengthened prohibition against relative imports between packages
- **v2.4.1**: Strengthened backward compatibility prohibition in Principle VII
- **v2.4.0**: Added no re-export requirement to Principle III

## Shared Rationale

This PhD research project requires maintainable, reliable code for academic reproducibility and demonstrations. Key constraints include: serial test execution due to memory limits, CI/CD deployment requirements, research productivity needs, and academic demonstration reliability. All principles serve these research context requirements while maintaining production-quality standards.

## Core Principles

### I. Type Safety (NON-NEGOTIABLE)

**NEVER use `any` types**. Use `unknown` with type guards instead. TypeScript assertions are discouraged; prefer type narrowing through runtime checks. All code must pass strict TypeScript validation without errors or suppressions.

**Rationale**: Ensures research reproducibility by catching type errors at compile time (see Shared Rationale).

### II. Test-First Development (NON-NEGOTIABLE)

**Tests must be written and verified to FAIL before implementation begins**. Follow Red-Green-Refactor cycle strictly.

**Test naming requirements**:
- Pattern: `foo.[type].test.ts[x]` where type ∈ {`unit`, `integration`, `component`, `e2e`}
- NEVER use generic names like `foo.test.ts` or `foo.spec.ts`

**E2E test requirements**:
- MUST run serially (prevent OOM errors)
- MUST have isolated storage state
- MUST complete within 2 seconds

**Rationale**: Expensive test failures require failing tests first to detect actual functionality gaps.

### III. Monorepo Architecture

**Nx workspace structure is mandatory**. All packages MUST use shared configuration and build orchestration.

**Structure**: `apps/` (deployable), `packages/` (shared libraries), `config/` (shared)

**Import requirements**:
- MUST use package aliases for cross-package imports (e.g., `@bibgraph/client`)
- NEVER use relative imports between packages
- Relative imports ONLY allowed within same package

**Package aliases**: `@bibgraph/{client,utils,types,ui,graph,simulation}` → `packages/*/src/index.ts`, `@/*` → `apps/web/src/*`

**No re-export requirement**: Internal packages MUST NOT re-export from other internal packages. Consumers MUST import directly from canonical source.

**Rationale**: Enables refactoring safety, build optimization, and clear package boundaries.

### IV. Storage Abstraction

**Storage implementations MUST be injectable and swappable**. All persistence operations MUST go through defined storage provider interface.

**Requirements**: Interface defines CRUD operations, IndexedDB provider for production, in-memory provider for E2E tests, mock provider for unit tests.

**Rationale**: Enables fast, isolated test execution while maintaining production data persistence.

### V. Performance & Memory

**Memory constraints are real**. Tests MUST run serially. Force simulation calculations MUST run in Web Workers.

**Requirements**: Bundle warnings at 800kB, failures at 1MB; storage operations ≤2s; unit tests ≤100ms; graph simulations handle 1000+ nodes; deterministic layouts use fixed seeds.

**Rationale**: Prevents OOM failures during research experiments and ensures responsive interactions.

### VI. Atomic Conventional Commits (NON-NEGOTIABLE)

**ALWAYS create incremental atomic conventional commits before moving to next task**. Each commit MUST represent single, complete unit of work.

**Requirements**:
- Format: `<type>(<scope>): <description>` (e.g., `feat(msw): add logging`)
- Types: `feat`, `fix`, `docs`, `style`, `refactor`, `test`, `chore`, `perf`, `ci`, `build`, `revert`
- MUST pass all quality gates
- MUST commit after each atomic task
- NEVER use `git add .` or `git add -A` - use explicit file paths

**Spec file requirements**: Commit `./specs/` changes after each phase completion using `docs(spec-###):` prefix.

**Rationale**: Enables bisect debugging, selective reversion, and clear research documentation.

### VII. Development-Stage Pragmatism (NON-NEGOTIABLE)

**NEVER include backward compatibility or legacy support**. Breaking changes are ENCOURAGED when they improve design.

**Requirements**:
- Breaking changes to APIs, data models, interfaces are acceptable
- Database schema changes can be destructive
- No migration paths, deprecation warnings, or version constraints required
- Re-exports for backward compatibility are PROHIBITED

**IMPORTANT**: Applies ONLY during development. Pre-public release will require stability guarantees.

**Rationale**: Eliminates overhead that slows research experimentation and hypothesis testing.

### VIII. Test-First Bug Fixes (NON-NEGOTIABLE)

**When bug is identified, test(s) MUST be written to confirm and diagnose it BEFORE fixing**.

**Workflow**: Reproduce → Verify Failure → Diagnose → Fix → Verify Success → Regression Prevention

**Requirements**: Test MUST fail before fix, pass after fix, use naming `bug-[id]-[description].[type].test.ts[x]`, be committed separately from fix.

**Rationale**: Prevents regression risks and ensures root cause understanding.

### IX. Repository Integrity (NON-NEGOTIABLE)

**NEVER leave repository in bad state**. When you touch repository, you own its state. ALL issues MUST be resolved before work is complete.

**"Pre-existing" is NOT an excuse**: Fix ALL issues regardless of origin. The phrase "pre-existing issue" is BANNED.

**Requirements**: ALL packages MUST pass `pnpm typecheck`, `pnpm test`, `pnpm lint`, `pnpm build`, `pnpm audit` with zero failures/vulnerabilities.

**Accountability**: Run `pnpm validate` at start AND end of session. Session complete ONLY when repo is in better state than found.

**Rationale**: Broken repo blocks ALL future work and creates compounding technical debt.

### X. Continuous Execution

**Implementation work MUST NOT stop or pause between phases, tasks, or due to context limits**.

**Requirements**:
- Complete all planned phases in single execution flow
- Commit atomically after each task
- Commit spec changes after each phase
- Maintain progress tracking throughout
- Only stop when ALL phases complete or blocking error occurs

**Automatic workflow**: After `/speckit.plan`, if no blockers, MUST use SlashCommand tool to invoke `/speckit.tasks` then `/speckit.implement`.

**Stopping conditions**: ALL tasks complete, blocking error, user request, or repository integrity failure.

**Rationale**: Maintains flow state and eliminates coordination overhead for research productivity.

### XI. Complete Implementation (NON-NEGOTIABLE)

**NEVER fall back to "simple" implementation when full version encounters difficulties**.

**Requirements**:
- Implement FULL version as specified
- If implementation fails, debug and resolve (don't simplify)
- Simplified fallbacks ONLY acceptable with explicit user approval after explaining impossibility

**When encountering difficulties**: Diagnose → Research → Debug → Persist → Escalate (if genuinely impossible)

**Rationale**: Prevents technical debt and ensures research demonstrations showcase full functionality.

### XII. Spec Index Maintenance (NON-NEGOTIABLE)

**`specs/README.md` MUST be maintained as current, accurate index of all feature specifications**.

**Requirements**:
- MUST list ALL specs in `specs/` directory
- MUST include: spec number/name, current status, completion date (if complete), description/link
- MUST be updated when specs created, status changes, or major completions occur
- MUST be committed alongside spec status changes

**Rationale**: Prevents duplicate work, enables quick discovery, and maintains project navigability across research timeline.

### XIII. Build Output Isolation (NON-NEGOTIABLE)

**TypeScript builds MUST output to `dist/` directories, NEVER alongside source files**.

**Requirements**: ALL `tsconfig.json` files MUST specify `"rootDir": "./src"` and `"outDir": "./dist"`. Compiled outputs MUST NEVER appear in `src/` directories.

**Rationale**: Ensures clean source directories, reliable gitignore patterns, and clear artifact boundaries.

### XIV. Working Files Hygiene (NON-NEGOTIABLE)

**Temporary working files MUST be cleaned up and NEVER committed**.

**Prohibited files**: Debug screenshots, fix chain documents, verification logs, temporary analysis files, working notes outside `specs/`.

**Gitignore enforcement**: All markdown and image files gitignored by default. Intentional docs MUST be force-added with `git add -f`.

**Primary mechanism**: Delete working files immediately after use. Clean working directory = professional development practice.

**Acceptable locations**: `specs/###-feature/`, `docs/`, `.specify/memory/`, `.specify/templates/`, `README.md` files.

**Rationale**: Prevents repository pollution and maintains professional codebase standards.

### XV. DRY Code & Configuration (NON-NEGOTIABLE)

**Duplication is a bug**. All code, configuration, and tooling MUST follow DRY principle.

**Code requirements**: Same logic in 2+ files → extract to shared utility. Type definitions MUST have single canonical location.

**Configuration requirements**: Shared TypeScript/ESLint configuration, no duplicated patterns, single package manager.

**Proactive cruft cleanup**: Remove unused dependencies, dead code, orphaned files immediately when discovered.

**Rationale**: Reduces maintenance burden and bug surface area in time-constrained research environment.

### XVI. Presentation/Functionality Decoupling (NON-NEGOTIABLE)

**Presentation and functionality MUST always be decoupled in web app**. UI components MUST NOT contain business logic.

**Architectural separation**:
- Presentational components: rendering, styling, user interaction
- Container components/hooks: state management, data fetching, business logic
- Services/utilities: complex business rules and calculations

**Prohibited patterns**: Components calling storage providers/APIs directly, complex calculations in components, global state mutations in components.

**Acceptable patterns**: Components receive data/callbacks via props, custom hooks encapsulate logic, service modules contain pure functions.

**Testing implications**: Business logic testable without React, presentational components testable with simple props.

**Rationale**: Ensures testability, reusability, maintainability of both presentation and functionality layers.

## Consolidated Patterns

### Import Patterns
```typescript
// ✅ CORRECT: Cross-package imports use aliases
import type { EntityType } from "@bibgraph/types"
import { logger } from "@bibgraph/utils"

// ✅ CORRECT: Within same package use relative imports
import { GraphNode } from "../types/core"

// ❌ WRONG: Relative imports between packages
import { GraphNode } from "../../../packages/graph/src/types"
```

### Component Architecture
```typescript
// ✅ CORRECT: Separated concerns
function WorkCard({ work, bookmarked, onBookmark, normalizedScore }: Props) {
  return <Card onClick={onBookmark}>...</Card>;
}

// ❌ WRONG: Mixed concerns
function WorkCard({ work }: Props) {
  const [bookmarked, setBookmarked] = useState(false);
  const handleBookmark = async () => {
    await storageProvider.addToList('bookmarks', work.id);
    setBookmarked(true);
  };
  return <Card onClick={handleBookmark}>...</Card>;
}
```

### Package Structure
- `@bibgraph/types`: Canonical source for all type definitions
- `@bibgraph/utils`: Shared utilities and storage providers
- `@bibgraph/ui`: Reusable UI components
- Package aliases defined in `tsconfig.base.json`

## Verification Commands

### Repository Integrity
```bash
# Complete validation pipeline
pnpm validate  # typecheck → test → build → lint

# Individual checks
pnpm typecheck  # TypeScript validation across ALL packages
pnpm test       # Full test suite (serially managed)
pnpm build      # Production build verification
pnpm lint       # ESLint checking across ALL packages
pnpm audit      # Security vulnerability scan
```

### Build Output Verification
```bash
# Should return nothing - any output indicates pollution
find apps/*/src packages/*/src -name "*.js" -o -name "*.d.ts" | grep -v vite-env
```

### Working Files Cleanup
```bash
# Check for temporary working files (should return nothing)
find . -name "debug-*.png" -o -name "*-FIX-*.md" -o -name "COMPLETE-*.md" | grep -v node_modules
```

### DRY Violation Detection
```bash
# Check for similar function definitions
grep -rh "export function" packages/ | sort | uniq -c | sort -rn | head -10
```

## Principle Relationships

### Foundational Principles
- **Type Safety (I)**: Enables all other principles through reliable code
- **Monorepo Architecture (III)**: Provides structural foundation for DRY (XV) and Build Output Isolation (XIII)
- **Repository Integrity (IX)**: Enforced by Continuous Execution (X) and Complete Implementation (XI)

### Enforcement Chains
- **Atomic Commits (VI)** → Repository Integrity (IX) → Continuous Execution (X)
- **Test-First Development (II)** → Test-First Bug Fixes (VIII) → Complete Implementation (XI)
- **Storage Abstraction (IV)** → Test-First Development (II) → Repository Integrity (IX)

### Workflow Enablers
- **Working Files Hygiene (XIV)** → Atomic Commits (VI) → Repository Integrity (IX)
- **DRY Code (XV)** → Monorepo Architecture (III) → Build Output Isolation (XIII)
- **Presentation/Functionality Decoupling (XVI)** → Test-First Development (II) → DRY Code (XV)

## Development Workflow

### Quality Pipeline (MUST pass before commit)
1. `pnpm typecheck` - TypeScript validation across ALL packages
2. `pnpm test` - Full test suite (serial execution)
3. `pnpm build` - Production build verification
4. `pnpm lint` - ESLint checking across ALL packages

### Repository Integrity Checkpoint
- Run `pnpm validate` at START and END of every session
- If ANY check fails, you are NOT done - keep working
- Session complete ONLY when repo is in better state than found

### Spec File Discipline
After completing each phase:
1. Update task statuses in `tasks.md`
2. Update relevant artifacts (plan.md, data-model.md, contracts/)
3. Stage spec directory files: `git add specs/###-feature-name/`
4. Commit: `git commit -m "docs(spec-###): complete Phase X - <description>"`
5. Continue to next phase without pausing

### Spec Index Maintenance
After completing spec or status change:
1. Update `specs/README.md` with new status/completion date
2. Stage both spec directory and README: `git add specs/###-feature-name/ specs/README.md`
3. Commit: `git commit -m "docs(spec-###): mark spec as complete"`

### Commit Discipline
After each atomic task:
1. Verify quality gates pass
2. Clean up temporary working files
3. Stage ONLY related files using explicit paths
4. Review staged changes: `git status` && `git diff --staged`
5. Create conventional commit
6. Push regularly to avoid losing work

### Slash Command Invocation
- MUST use SlashCommand tool - NEVER type commands directly
- Correct pattern: `<invoke name="SlashCommand"><parameter name="command">/speckit.plan</parameter></invoke>`
- Applies to ALL custom slash commands

## Quality Gates

### Constitution Compliance
Every PR MUST verify alignment with all 16 core principles. Feature specs MUST document compliance.

### Test Coverage Requirements
- All new storage operations: unit tests with mock provider + E2E tests with in-memory provider
- All new components: component tests
- All new graph features: deterministic layout tests
- All bug fixes: regression tests written before fix

### Commit Quality Gates
- MUST follow Conventional Commits format
- MUST represent single logical change
- MUST pass quality pipeline before pushing
- NEVER use `git add .` or `git add -A`
- Spec file changes committed after each phase

### Repository Integrity Gates
- MUST leave repository in fully working state
- `pnpm validate` MUST pass completely (zero errors/warnings)
- `pnpm audit` MUST show no high/critical vulnerabilities
- NEVER use `--no-verify` - fix hook failures
- NEVER defer issues - fix everything found

### Complete Implementation Verification
- Feature implementations MUST match specifications completely
- No simplified fallbacks without documented user approval
- Bug fixes MUST address root causes
- Edge cases and error handling MUST be complete

### Specialized Verification Gates
- **Spec Index Maintenance**: specs/README.md MUST list all specs and be updated with status changes
- **Build Output Isolation**: All tsconfig.json files MUST specify outDir/rootDir, no compiled files in src/
- **Working Files Hygiene**: No debug screenshots, fix documents, or temporary analysis files in commits
- **DRY Code & Configuration**: No duplicate logic, shared base configurations, proactive cruft cleanup
- **Presentation/Functionality Decoupling**: No business logic in components, clear container/presentational separation

### Breaking Changes
MAJOR.MINOR.PATCH versioning applies. During development, breaking changes acceptable without MAJOR bumps but MUST be documented.

## Governance

This constitution supersedes all other development practices. Amendments require:
1. Documentation of principle change with rationale
2. Update to affected templates (plan-template.md, spec-template.md, tasks-template.md)
3. Version bump according to semantic versioning rules
4. Validation that existing features still comply

All PRs and code reviews MUST verify compliance. Features violating principles without documented justification MUST be rejected.

For operational guidance specific to BibGraph workflows, see `CLAUDE.md` in project root. This constitution defines non-negotiable principles; CLAUDE.md provides runtime instructions.