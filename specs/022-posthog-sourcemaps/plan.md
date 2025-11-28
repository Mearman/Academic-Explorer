# Implementation Plan: PostHog Source Map Upload

**Branch**: `022-posthog-sourcemaps` | **Date**: 2025-11-21 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/022-posthog-sourcemaps/spec.md`

**Note**: This template is filled in by the `/speckit.plan` command. See `.specify/templates/commands/plan.md` for the execution workflow.

## Summary

Implement automated PostHog source map upload for production error tracking in BibGraph. The primary requirement is to enable readable stack traces in production by generating source maps during Vite builds, injecting release metadata using PostHog CLI, and uploading them automatically via GitHub Actions CI/CD workflow. This ensures developers can debug production errors with original TypeScript file paths and line numbers instead of minified bundle references.

## Technical Context

**Language/Version**: TypeScript 5.x (ES modules), Node.js 20+ (for PostHog CLI in CI/CD)
**Primary Dependencies**:
- Vite 5.x (build tool with source map generation)
- @posthog/cli (source map injection and upload)
- @posthog/react (existing PostHog integration)
- GitHub Actions (CI/CD automation)
**Storage**: N/A (source maps are build artifacts, uploaded to PostHog cloud)
**Testing**:
- Manual error triggering in production environment for stack trace verification
- GitHub Actions workflow validation (dry-run testing)
- PostHog dashboard verification (symbol sets page)
**Target Platform**: Web (React SPA deployed to GitHub Pages)
**Project Type**: Web application (apps/web in Nx monorepo)
**Performance Goals**: Source map upload completes within 2 minutes for full monorepo build
**Constraints**:
- Must use EU PostHog instance (https://eu.posthog.com) to match existing analytics
- Must not expose source maps in production bundles (delete after upload)
- Deployment must fail if source map upload fails (prevent deploying without debug capability)
**Scale/Scope**:
- Single web application (apps/web)
- Source maps from apps/web and packages/* (entire monorepo)
- Expected 50+ source files per release

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

Verify alignment with BibGraph Constitution (`.specify/memory/constitution.md`):

1. **Type Safety**: ✅ PASS - No TypeScript code changes to app logic; only Vite config (typed) and GitHub Actions YAML. PostHog CLI types used where applicable.
2. **Test-First Development**: ✅ PASS - Feature uses verification testing (manual error triggering, workflow validation, dashboard checks). No new application logic requiring unit tests. Verification tests outlined in spec acceptance scenarios.
3. **Monorepo Architecture**: ✅ PASS - Changes confined to apps/web Vite config and root-level .github/workflows. No new packages. Uses existing @posthog/react integration. No cross-package imports added.
4. **Storage Abstraction**: ✅ N/A - No storage operations. Source maps are build artifacts uploaded to external service.
5. **Performance & Memory**: ✅ PASS - Upload time constraint (2 minutes) specified. Source maps deleted after upload to conserve storage. No runtime memory impact (build-time only).
6. **Atomic Conventional Commits**: ✅ PASS - Implementation will use atomic commits: (1) feat(web): enable Vite source maps, (2) ci: install PostHog CLI, (3) ci: add source map upload step, (4) docs: update deployment docs.
7. **Development-Stage Pragmatism**: ✅ PASS - Breaking change to Vite build config is acceptable (as stated in spec). No backwards compatibility needed.
8. **Test-First Bug Fixes**: ✅ N/A - Feature implementation, not bug fix. If upload failures discovered during implementation, will add retry logic with failing test first.
9. **Deployment Readiness**: ✅ PASS - Implementation will resolve pre-existing missing source maps issue. Feature must be fully deployable before completion. Will verify pnpm validate passes.
10. **Continuous Execution**: ✅ PASS - No outstanding questions or NEEDS CLARIFICATION markers remain after Technical Context filled. Will proceed through all phases: research → design → task generation → implementation.

**Complexity Justification Required?** ✅ NO - This feature:
- Does NOT add new packages/apps (uses existing apps/web)
- Does NOT introduce new storage providers (no storage operations)
- Does NOT require new worker threads (build-time only)
- Does NOT violate YAGNI (addresses real production debugging need documented in spec)
- Minimal architectural impact: adds PostHog CLI to CI/CD, enables Vite source map generation

## Project Structure

### Documentation (this feature)

```text
specs/[###-feature]/
├── plan.md              # This file (/speckit.plan command output)
├── research.md          # Phase 0 output (/speckit.plan command)
├── data-model.md        # Phase 1 output (/speckit.plan command)
├── quickstart.md        # Phase 1 output (/speckit.plan command)
├── contracts/           # Phase 1 output (/speckit.plan command)
└── tasks.md             # Phase 2 output (/speckit.tasks command - NOT created by /speckit.plan)
```

### Source Code (repository root)

```text
# Monorepo structure (Nx workspace)
apps/web/
├── vite.config.ts              # Modified: enable source map generation
├── dist/                        # Build output with .map files (generated)
└── package.json                 # No changes needed

.github/
└── workflows/
    └── deploy.yml               # Modified: add source map upload steps

# Source maps touch files across monorepo packages
packages/*/
└── (source maps generated for all packages imported by apps/web)

# PostHog CLI (installed in CI/CD, not in repo)
# Commands used:
# - posthog-cli sourcemap inject (injects release metadata)
# - posthog-cli sourcemap upload (uploads to PostHog)
```

**Structure Decision**: This is a build tooling and CI/CD configuration feature. No new source code directories required. Changes are confined to:
1. **apps/web/vite.config.ts** - Enable `build.sourcemap: true` for production builds
2. **.github/workflows/deploy.yml** - Add PostHog CLI installation and source map upload steps after build, before deployment
3. **Environment variables** - Add `POSTHOG_CLI_ENV_ID` and `POSTHOG_CLI_TOKEN` to GitHub Actions secrets

Source maps are generated for all monorepo packages transitively imported by apps/web during the Vite build process.

## Complexity Tracking

> **Fill ONLY if Constitution Check has violations that must be justified**

✅ **No complexity justification required** - Constitution Check passed without violations.

---

## Phase Completion Summary

### Phase 0: Outline & Research ✅ COMPLETE

**Artifacts Generated**:
- `research.md` - Technology decisions, best practices, alternatives considered

**Key Decisions**:
1. Vite `build.sourcemap: true` for source map generation
2. PostHog CLI (`inject` + `upload` commands) for workflow
3. GitHub Actions integration in deployment pipeline
4. Git commit SHA as release version identifier
5. EU PostHog instance for uploads
6. Security: delete source maps after upload

**Outcome**: No NEEDS CLARIFICATION markers remaining. All technical approaches documented and validated.

---

### Phase 1: Design & Contracts ✅ COMPLETE

**Artifacts Generated**:
- `data-model.md` - Conceptual entities (Release, SourceMapFile, SymbolSet), build artifacts, state transitions
- `contracts/posthog-cli-commands.md` - CLI command contracts (install, inject, upload), workflow integration
- `contracts/vite-configuration.md` - Vite config changes, build output contract, security considerations
- `quickstart.md` - Implementation steps, testing guide, troubleshooting, FAQ

**Key Designs**:
1. **Build Artifact Structure**: `.js` and `.map` files in `apps/web/dist/assets/`
2. **Metadata Injection**: `//# postHogRelease` and `//# postHogChunkId` comments in bundles
3. **Upload Workflow**: Install → Inject → Upload → Delete → Deploy
4. **Configuration Changes**: Single line in `vite.config.ts` + GitHub Actions workflow steps
5. **Security Model**: Source maps uploaded to PostHog, deleted before deployment

**Agent Context Updated**: Technology stack added to CLAUDE.md (TypeScript 5.x, Node.js 20+, Vite, PostHog CLI)

**Constitution Re-Check**: ✅ All principles still satisfied post-design. No violations introduced.

---

## Next Steps

**Ready for**: Phase 2 - Task Generation (`/speckit.tasks`)

The plan is complete with all technical context, constitution compliance verified, research documented, design artifacts generated, and contracts defined. Implementation can begin after task generation.
