# Feature Specification: PostHog Source Map Upload

**Feature Branch**: `022-posthog-sourcemaps`
**Created**: 2025-11-21
**Status**: Draft
**Input**: User description: "Implement PostHog source map upload for error tracking with proper stack traces in production"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Production Error Debugging with Readable Stack Traces (Priority: P1)

When a production error occurs in BibGraph, developers need to see the original source code context (file names, line numbers, function names) rather than minified/bundled code references. This enables rapid identification and resolution of production issues.

**Why this priority**: Without readable stack traces, debugging production errors is extremely difficult and time-consuming. This is the core value proposition of source map upload and blocks all other error tracking improvements.

**Independent Test**: Can be fully tested by triggering an error in production, viewing it in PostHog dashboard, and verifying stack traces show original source file paths and line numbers instead of minified bundle references.

**Acceptance Scenarios**:

1. **Given** a React component throws an error in production, **When** the error is captured by PostHog, **Then** the stack trace displays original TypeScript file paths (e.g., `apps/web/src/components/Graph.tsx:42`) instead of bundle references (e.g., `main-abc123.js:1:2345`)
2. **Given** an error occurs in a package (e.g., `@bibgraph/graph`), **When** the error appears in PostHog, **Then** the stack trace shows the original package source file and line number
3. **Given** multiple errors occur across different components, **When** viewing errors in PostHog, **Then** all stack traces are unminified with accurate source locations

---

### User Story 2 - Automated Source Map Upload in CI/CD (Priority: P2)

The CI/CD pipeline automatically uploads source maps to PostHog after each successful production build, ensuring that newly deployed code has corresponding source maps available for error debugging.

**Why this priority**: Manual source map uploads are error-prone and often forgotten. Automation ensures 100% coverage and eliminates human error. This is P2 because P1 (readable traces) provides immediate debugging value even with manual uploads.

**Independent Test**: Can be tested by merging code to main branch, observing GitHub Actions workflow, and verifying source maps appear in PostHog dashboard's symbol sets without manual intervention.

**Acceptance Scenarios**:

1. **Given** code is merged to main branch, **When** the deployment workflow runs, **Then** source maps are automatically injected with release metadata and uploaded to PostHog before deployment completes
2. **Given** a build includes multiple JavaScript bundles, **When** the upload step runs, **Then** all bundle source maps are uploaded with correct chunk IDs
3. **Given** the PostHog CLI encounters an authentication error, **When** the workflow runs, **Then** the build fails with a clear error message indicating missing or invalid credentials

---

### User Story 3 - Source Map Upload Verification (Priority: P3)

Developers can verify that source maps were successfully uploaded for a specific release by checking PostHog's symbol sets page and confirming the presence of the correct release version and uploaded files.

**Why this priority**: While automated uploads (P2) handle the process, verification provides confidence that the system is working correctly. This is P3 because uploads can be debugged reactively when errors show minified traces.

**Independent Test**: Can be tested by navigating to PostHog's project settings, viewing symbol sets, and confirming the presence of recently deployed release with expected file count.

**Acceptance Scenarios**:

1. **Given** source maps were uploaded for release `abc123` (git commit hash), **When** viewing PostHog symbol sets, **Then** the release appears with the correct version identifier and upload timestamp
2. **Given** source maps include files from both apps/web and packages/*, **When** viewing the symbol set details, **Then** all expected source files are listed
3. **Given** a deployment failed to upload source maps, **When** checking PostHog dashboard, **Then** the absence of the release version is immediately obvious

---

### Edge Cases

- What happens when source map upload fails but deployment succeeds? (Errors appear with minified traces; workflow should fail to prevent this)
- How does the system handle large monorepo builds with 50+ source files? (Upload all files; PostHog CLI handles batching)
- What happens when multiple deployments occur rapidly in succession? (Each gets unique release ID via git commit hash)
- How are source maps handled for different build configurations (production vs staging)? (Each environment has separate release tracking)
- What if PostHog service is temporarily unavailable during upload? (Workflow should retry with exponential backoff, fail deployment if retries exhausted)

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST generate source maps during production builds (Vite `build.sourcemap: true`)
- **FR-002**: CI/CD workflow MUST install PostHog CLI (@posthog/cli) in deployment pipeline
- **FR-003**: CI/CD workflow MUST authenticate PostHog CLI using environment variables (`POSTHOG_CLI_ENV_ID`, `POSTHOG_CLI_TOKEN`)
- **FR-004**: System MUST inject source map metadata (release version, chunk IDs) into built assets using `posthog-cli sourcemap inject`
- **FR-005**: CI/CD workflow MUST upload injected source maps to PostHog using `posthog-cli sourcemap upload`
- **FR-006**: Deployment MUST serve the injected assets (with source map comments) to production
- **FR-007**: CI/CD workflow MUST fail deployment if source map upload fails (prevent deploying code without debug capability)
- **FR-008**: Source map upload MUST use EU PostHog instance (`--host https://eu.posthog.com`) to match existing analytics configuration
- **FR-009**: Source map upload MUST use git commit hash as release version identifier for traceability
- **FR-010**: System MUST delete source map files after upload (using `--delete-after`) to avoid exposing source code in production bundles
- **FR-011**: GitHub Actions workflow MUST have `error tracking write` and `organization read` scopes for the PostHog API token
- **FR-012**: Source map generation MUST support TypeScript source files from monorepo packages (apps/web and packages/*)

### Key Entities

- **Release**: Represents a deployed version of the application, identified by git commit hash, associated with a set of uploaded source maps
  - Attributes: version (commit hash), upload timestamp, file count, project name
- **Symbol Set**: Collection of source map files for a specific release
  - Attributes: release version, list of source files, chunk IDs, upload status
- **Source Map File**: Individual `.map` file containing mapping between minified and original code
  - Attributes: chunk ID, original file path, bundle file name, size

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Production errors in PostHog display original source file paths and line numbers with 100% accuracy (verified by manual error triggering)
- **SC-002**: Source map upload completes within 2 minutes for full monorepo build (measured in GitHub Actions logs)
- **SC-003**: 100% of production deployments successfully upload source maps before going live (zero missed uploads in 30-day period)
- **SC-004**: Developer time to identify error location reduces from 15+ minutes (searching minified code) to under 2 minutes (direct source location)
- **SC-005**: PostHog symbol sets page shows uploaded source maps within 5 minutes of deployment completion
- **SC-006**: Zero production deployments succeed with failed source map uploads (deployment failures prevent this)

## Constitution Alignment *(recommended)*

- **Type Safety**: Feature uses TypeScript strict mode; no `any` types in configuration or scripts
- **Test-First**: Verification scenarios include manual error triggering tests; GitHub Actions workflow includes source map upload validation step
- **Monorepo Architecture**: Feature integrates into existing apps/web build process; uses Vite configuration; no cross-package re-exports
- **Storage Abstraction**: N/A - feature involves build artifacts and external API, not application storage
- **Performance & Memory**: Success criteria include 2-minute upload time limit; source maps deleted after upload to conserve storage
- **Atomic Conventional Commits**: Implementation will commit Vite config, GitHub Actions workflow, and documentation separately with conventional prefixes (feat:, ci:, docs:)
- **Development-Stage Pragmatism**: Breaking change to Vite build config acceptable; no backwards compatibility needed for build process
- **Test-First Bug Fixes**: Any upload failures discovered will have workflow retry logic added before production deployment
- **Deployment Readiness**: Implementation must resolve pre-existing missing source maps issue; entire monorepo deployable with error tracking
- **Continuous Execution**: Implementation will proceed through all phases: Vite config → CLI installation → workflow update → verification → deployment
