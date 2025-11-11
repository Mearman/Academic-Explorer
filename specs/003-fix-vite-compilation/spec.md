# Feature Specification: Fix Vite/TypeScript In-Place Compilation Issue

**Feature Branch**: `003-fix-vite-compilation`
**Created**: 2025-11-11
**Status**: Draft
**Input**: User description: "we have a tsconfig/vite issue that is causing files to be compiled in place rather than to a dist folder"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Developer Running E2E Tests Sees Latest Code Changes (Priority: P1)

A developer makes code changes to React components and runs Playwright E2E tests. The tests execute against a Vite dev server that serves the latest code changes, not stale/cached versions. Test results accurately reflect the current codebase state.

**Why this priority**: This is the core issue blocking all development work. Without tests running against current code, developers cannot verify their changes work correctly, leading to false test failures and wasted debugging time.

**Independent Test**: Can be fully tested by making a visible code change (e.g., changing button text), running E2E tests, and verifying the tests see the new text. Delivers immediate value by unblocking test-driven development workflow.

**Acceptance Scenarios**:

1. **Given** a developer has modified a React component source file, **When** they run Playwright E2E tests, **Then** the browser loads and tests against the modified code, not cached/outdated code
2. **Given** E2E tests are running with Vite dev server, **When** the dev server starts, **Then** it serves compiled code from memory/dist folder, not from in-place .js files in src/ directory
3. **Given** a developer kills and restarts the Vite dev server, **When** tests run again, **Then** all code changes since last run are picked up immediately

---

### User Story 2 - Developer Can Build Project Successfully (Priority: P2)

A developer runs the production build command and the build completes without TypeScript compilation errors related to file emit settings. The build process respects project reference requirements while preventing in-place compilation.

**Why this priority**: Production builds must work for deployment. This is secondary to dev/test workflow but critical for releasing features.

**Independent Test**: Can be tested by running `pnpm build` or `nx run-many -t build` and verifying all packages build successfully without tsconfig emit errors.

**Acceptance Scenarios**:

1. **Given** the project has TypeScript project references configured, **When** developer runs the build command, **Then** all packages build successfully without "may not disable emit" errors
2. **Given** the tools package references apps/web, **When** the build runs, **Then** required declaration files are generated for cross-package type checking
3. **Given** developer has made changes across multiple packages, **When** they run the build, **Then** incremental compilation works correctly using the build cache

---

### User Story 3 - Developer Works with Clean File Structure (Priority: P3)

A developer navigates the codebase and sees only TypeScript source files in src/ directories, with no .js or .d.ts files littering the source tree. Compiled artifacts live only in dist/ or node_modules/.vite/ directories.

**Why this priority**: Clean file structure improves developer experience and prevents confusion, but doesn't block core functionality.

**Independent Test**: Can be tested by searching for .js files in src/ directories (excluding node_modules) and verifying none exist after compilation.

**Acceptance Scenarios**:

1. **Given** developer has run typecheck or build commands, **When** they inspect the src/ directory, **Then** no .js, .js.map, or .d.ts files exist alongside .ts/.tsx source files
2. **Given** Vite dev server is running, **When** developer checks the file system, **Then** compiled artifacts exist only in node_modules/.vite/ cache or memory, not in src/
3. **Given** developer runs git status after building, **When** they check for untracked files, **Then** no compiled artifacts appear as untracked files in src/

---

### Edge Cases

- What happens when a package has both noEmit:true and project references pointing to it? (Tools package typecheck should fail gracefully with clear error message)
- How does the system handle stale .vite cache when source files change? (Cache invalidation must detect changes and rebuild)
- What happens when developer manually creates .js files in src/ for debugging? (Build system should ignore or warn, not break)
- How does HMR (Hot Module Replacement) behave when tsconfig changes? (Vite should detect config changes and restart)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: TypeScript compilation MUST NOT emit .js, .js.map, or .d.ts files into src/ directories where .ts/.tsx source files exist **OR** into the repository root where .ts config files exist
- **FR-001a**: Root-level TypeScript files (vite.config.base.ts, vitest.config.base.ts, etc.) MUST NOT generate .js/.d.ts siblings in the root directory
- **FR-001b**: App/package-level TypeScript files in src/ MUST NOT generate .js/.d.ts siblings in src/ directories
- **FR-002**: Vite dev server MUST serve compiled code from memory or node_modules/.vite/ cache, never from in-place .js files in src/ or root
- **FR-003**: Project build command MUST succeed for all packages without TypeScript emit-related errors
- **FR-004**: TypeScript project references MUST continue to work correctly for cross-package type checking
- **FR-005**: Playwright E2E tests MUST execute against the latest compiled version of source code after any changes
- **FR-006**: Vite dev server restart MUST clear any cached compilation artifacts and rebuild from current source
- **FR-007**: Build system MUST generate required declaration files (.d.ts) for packages that are referenced by other packages
- **FR-008**: Development workflow MUST support incremental compilation for fast rebuild times
- **FR-009**: Git status MUST NOT show untracked compiled artifacts (.js, .d.ts files) in src/ directories **or root directory** after build/typecheck
- **FR-010**: Configuration files (tsconfig.*.json, vite.config.ts) MUST be consistent across **all levels** (root, apps/, packages/) to prevent conflicting compilation behavior
- **FR-011**: Root-level tsconfig files (tsconfig.base.json, tsconfig.app.json) MUST use noEmit: true to prevent config file compilation unless explicitly building for distribution

### Key Entities

- **TypeScript Configuration**: Multiple tsconfig files (tsconfig.base.json, tsconfig.app.json, apps/web/tsconfig.json, tools/tsconfig.json) that control compilation behavior including emit settings, project references, and incremental build
- **Vite Configuration**: vite.config.ts files that define build output directories, dev server behavior, and module resolution
- **Build Artifacts**: Compiled JavaScript files (.js), source maps (.js.map), and TypeScript declarations (.d.ts) that should only exist in dist/ or cache directories
- **Package Dependencies**: Project reference relationships where tools package depends on apps/web declarations, requiring specific emit configuration

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: E2E test execution time remains within 10% of baseline (no significant performance degradation from compilation changes)
- **SC-002**: 100% of Playwright E2E tests that previously failed due to stale code now pass when code changes are made
- **SC-003**: Production build command (`pnpm build`) completes successfully with 0 TypeScript emit errors across all packages
- **SC-004**: Developer can make a visible UI change, run tests, and see the change reflected in test execution within 5 seconds of test start
- **SC-005**: File system search for `.js` files in `src/**/*.js` **and root `*.js`** (excluding node_modules, .lintstagedrc.js, and other legitimate config files) returns 0 compilation artifacts after build/typecheck
- **SC-006**: Git status shows 0 untracked compiled artifacts in **both** src/ directories **and** root directory after full build
- **SC-007**: Vite dev server cold start time remains under 2 seconds (compilation configuration doesn't slow down startup)

## Constitution Alignment *(recommended)*

- **Type Safety**: Fix maintains strict TypeScript checking; no `any` types added; declaration files continue to be generated for type checking
- **Test-First**: User Story 1 directly supports Red-Green-Refactor workflow by ensuring tests run against current code
- **Monorepo Architecture**: Fix applies to existing monorepo structure (apps/web, packages/*, tools); respects Nx workspace configuration
- **Storage Abstraction**: Not applicable - this is a build tooling fix, doesn't involve data persistence
- **Performance & Memory**: SC-001 and SC-007 ensure compilation changes don't degrade dev/build performance

## Scope & Boundaries *(recommended)*

### In Scope

- Modify tsconfig.*.json files **at all levels** (root, apps/, packages/) to prevent in-place compilation while maintaining project references
- **Root-level configuration files**: Fix tsconfig.base.json to prevent vite.config.base.ts, vitest.config.base.ts from compiling in-place
- **App-level source files**: Fix apps/web/tsconfig.json to prevent src/**/*.ts files from compiling in-place
- Update vite.config.ts if needed to ensure correct build output locations
- Clear existing stale compiled artifacts from **both** root directory and src/ directories
- Update .gitignore patterns to cover **both** root-level and src-level in-place artifacts
- Verify Vite dev server cache invalidation works correctly
- Document correct compilation configuration for future package additions

### Out of Scope

- Migrating to different build tools (staying with Vite + TypeScript)
- Changing project reference structure (maintaining existing package dependencies)
- Optimizing build performance beyond preventing regression
- Refactoring source code structure or module organization
- Adding new packages or changing monorepo workspace configuration

## Assumptions *(recommended)*

- The existing Vite + TypeScript + Nx monorepo architecture will be maintained
- Project references are necessary for cross-package type checking and should be preserved
- The issue affects **two levels**: (1) root-level config files (vite.config.base.ts → vite.config.base.js) and (2) app src/ files, both caused by missing noEmit/outDir settings
- Root-level tsconfig files (tsconfig.base.json, tsconfig.app.json) should use noEmit: true since they are never built for distribution - they only provide shared compiler options
- Vite dev server is the correct tool for E2E test execution (not switching to production builds for testing)
- The tools package legitimately needs declaration files from apps/web for its build process, but only in dist/, never in src/
- Legitimate .js config files (.lintstagedrc.js, jest.config.js, etc.) should remain unaffected - they are intentionally JavaScript

## Dependencies *(recommended)*

### Technical Dependencies

- TypeScript compiler (tsc) version compatibility with tsconfig settings
- Vite version 7.2.2 - must support desired compilation/caching behavior
- Playwright test framework - must work correctly with Vite dev server
- Nx workspace tooling - build cache and task orchestration must remain functional

### External Dependencies

- None - this is an internal build configuration fix

## Risks & Mitigations *(optional)*

### Risk 1: Breaking Project References

**Impact**: High - breaks cross-package type checking
**Probability**: Medium - previous attempt with noEmit:true caused this
**Mitigation**: Test build command for all packages after any tsconfig changes; verify tools package can import types from apps/web

### Risk 2: Vite Cache Invalidation Issues

**Impact**: Medium - could cause intermittent stale code issues
**Probability**: Low - Vite has mature caching with file watching
**Mitigation**: Document cache clearing command (rm -rf node_modules/.vite); add to troubleshooting guide

### Risk 3: Performance Regression

**Impact**: Low - slower dev/build times frustrate developers
**Probability**: Low - modern tooling handles emit configuration efficiently
**Mitigation**: Measure baseline times before changes (SC-001, SC-007); revert if >10% regression

## Open Questions *(optional)*

**RESOLVED - 2025-11-11**: Initial implementation only addressed apps/web/src/ in-place compilation. User observation identified that root-level TypeScript files (vite.config.base.ts, vitest.config.base.ts) are also being compiled in-place due to tsconfig.base.json having `composite: true` without `noEmit` or `outDir`.

**Clarification**: The scope must expand to fix **both**:
1. Root-level tsconfig files (tsconfig.base.json, tsconfig.app.json) → add noEmit: true
2. App/package-level source directories (already addressed via tsconfig.build.json pattern)

The root-level configs are never built for distribution - they only provide shared compiler options to extending configs. Therefore noEmit: true is the correct setting.
