# Research: PostHog Source Map Upload

**Feature**: 022-posthog-sourcemaps
**Phase**: 0 - Outline & Research
**Date**: 2025-11-21

## Overview

This document captures research findings and technology decisions for implementing PostHog source map upload in BibGraph. Since the Technical Context had no "NEEDS CLARIFICATION" markers, this research focuses on documenting known approaches and verifying best practices.

## Technology Decisions

### Decision 1: Vite Source Map Generation

**Decision**: Use Vite's built-in `build.sourcemap` option set to `true` (not `'hidden'` or `'inline'`)

**Rationale**:
- Vite has native source map generation capability via Rollup
- PostHog requires external source map files (`.map`) to upload, not inline source maps
- `sourcemap: true` generates `.map` files alongside bundled `.js` files
- Vite automatically adds `//# sourceMappingURL=` comments to JS bundles

**Alternatives Considered**:
- `sourcemap: 'hidden'` - Generates maps but omits `sourceMappingURL` comment. Rejected because PostHog CLI's `inject` command requires the comment to inject release metadata.
- `sourcemap: 'inline'` - Embeds maps in JS files. Rejected because PostHog requires separate `.map` files for upload, and inline maps bloat bundle size.
- External source map plugin - Rejected because Vite's native support is sufficient and adding plugins increases complexity.

**References**:
- Vite docs: https://vitejs.dev/config/build-options.html#build-sourcemap
- PostHog docs: https://posthog.com/docs/product-analytics/source-maps

---

### Decision 2: PostHog CLI for Source Map Upload

**Decision**: Use `@posthog/cli` package with `sourcemap inject` and `sourcemap upload` commands

**Rationale**:
- Official PostHog tooling designed specifically for source map workflow
- `inject` command adds release version metadata and chunk IDs to source map comments in built JS files
- `upload` command handles batching, retries, and authentication automatically
- Supports `--delete-after` flag to remove source maps after upload (security best practice)
- Works with monorepo builds (recursively finds all `.map` files)

**Alternatives Considered**:
- PostHog JavaScript SDK upload - Rejected because SDK is runtime-focused, not build-time. No documented source map upload API in SDK.
- Manual HTTP API calls - Rejected because would require implementing batching, error handling, and multipart uploads. PostHog CLI handles this complexity.
- Third-party source map upload tools - Rejected because PostHog CLI is the official recommended approach and has best integration with PostHog API.

**Command Sequence**:
```bash
# 1. Install PostHog CLI in CI/CD
npm install -g @posthog/cli

# 2. Inject release metadata into built JS files
posthog-cli sourcemap inject --version $GITHUB_SHA ./apps/web/dist

# 3. Upload injected source maps to PostHog
posthog-cli sourcemap upload \
  --project-id $POSTHOG_CLI_ENV_ID \
  --api-token $POSTHOG_CLI_TOKEN \
  --host https://eu.posthog.com \
  --delete-after \
  ./apps/web/dist
```

**References**:
- PostHog CLI docs: https://posthog.com/docs/libraries/posthog-cli
- PostHog source map guide: https://posthog.com/docs/product-analytics/source-maps#uploading-source-maps

---

### Decision 3: GitHub Actions Integration

**Decision**: Add source map upload steps to existing `.github/workflows/deploy.yml` after build step, before deployment step

**Rationale**:
- BibGraph already uses GitHub Actions for deployment
- Source maps must be uploaded BEFORE deployment to ensure errors are immediately debuggable
- Workflow should fail if upload fails (prevents deploying code without debug capability)
- Git commit hash (`$GITHUB_SHA`) is ideal release version identifier for traceability

**Workflow Structure**:
```yaml
- name: Build web app
  run: pnpm build --filter=web

- name: Install PostHog CLI
  run: npm install -g @posthog/cli

- name: Inject source map metadata
  run: posthog-cli sourcemap inject --version ${{ github.sha }} ./apps/web/dist

- name: Upload source maps to PostHog
  run: |
    posthog-cli sourcemap upload \
      --project-id ${{ secrets.POSTHOG_CLI_ENV_ID }} \
      --api-token ${{ secrets.POSTHOG_CLI_TOKEN }} \
      --host https://eu.posthog.com \
      --delete-after \
      ./apps/web/dist

- name: Deploy to GitHub Pages
  # existing deployment step
```

**Alternatives Considered**:
- Upload after deployment - Rejected because creates a window where errors appear with minified traces
- Separate workflow for source map upload - Rejected because increases complexity and risk of forgetting to run
- Upload from local machine - Rejected because error-prone, manual, and inconsistent with CI/CD principles

**References**:
- GitHub Actions docs: https://docs.github.com/en/actions/using-workflows/workflow-syntax-for-github-actions
- PostHog CI/CD guide: https://posthog.com/docs/product-analytics/source-maps#ci-cd-integration

---

### Decision 4: Release Version Strategy

**Decision**: Use git commit SHA (`$GITHUB_SHA` in GitHub Actions) as release version identifier

**Rationale**:
- Provides exact traceability from PostHog error to source code version
- Automatically unique for every deployment
- Available in GitHub Actions without additional setup
- Enables developers to check out exact commit for debugging
- Matches common industry practice for release tracking

**Alternatives Considered**:
- Semantic version (e.g., 1.2.3) - Rejected because requires maintaining version numbers and doesn't provide commit-level precision
- Build timestamp - Rejected because doesn't provide code version traceability
- Branch name - Rejected because multiple deployments from same branch would conflict
- Custom UUID - Rejected because doesn't correspond to anything meaningful for developers

**Format**: `posthog-cli sourcemap inject --version $GITHUB_SHA ./dist`

**References**:
- GitHub Actions default environment variables: https://docs.github.com/en/actions/learn-github-actions/variables#default-environment-variables
- PostHog release tracking: https://posthog.com/docs/product-analytics/source-maps#release-versions

---

### Decision 5: EU PostHog Instance

**Decision**: Use `--host https://eu.posthog.com` for source map uploads

**Rationale**:
- BibGraph already uses EU PostHog instance for analytics (confirmed in spec)
- Source maps must be uploaded to the same instance where errors are tracked
- Using US instance would result in source maps not being found for EU-tracked errors
- GDPR compliance consideration (PhD research at Bangor University, Wales)

**Verification**: Check existing PostHog configuration in codebase to confirm EU instance usage

**Alternatives Considered**:
- US PostHog instance (https://app.posthog.com) - Rejected because existing analytics already on EU instance
- Self-hosted PostHog - Rejected because BibGraph uses PostHog cloud, not self-hosted

**References**:
- PostHog EU cloud: https://posthog.com/eu
- PostHog instance configuration: https://posthog.com/docs/libraries/react#config

---

## Best Practices Research

### Source Map Security

**Finding**: Source maps should be uploaded to PostHog but NOT served in production bundles

**Implementation**:
- Use `--delete-after` flag in `posthog-cli sourcemap upload` to delete `.map` files after upload
- Vite build will still generate `.map` files, but they'll be removed before deployment
- PostHog will have the maps for error debugging without exposing source code publicly

**References**:
- PostHog security practices: https://posthog.com/docs/product-analytics/source-maps#security
- Source map security discussion: https://blog.sentry.io/2018/07/17/source-maps-security

---

### Error Handling and Retries

**Finding**: Source map upload failures should fail the deployment

**Implementation**:
- GitHub Actions will automatically fail workflow if any step exits with non-zero status
- PostHog CLI exits with error code on upload failure
- No explicit retry logic needed in workflow (GitHub Actions can be configured to retry failed workflows)
- Clear error messages in logs will indicate authentication issues or network failures

**Monitoring**: Check GitHub Actions logs and PostHog symbol sets page to verify uploads

**References**:
- GitHub Actions error handling: https://docs.github.com/en/actions/learn-github-actions/essential-features-of-github-actions#handling-errors

---

### Monorepo Source Map Coverage

**Finding**: Vite automatically generates source maps for all imported packages in monorepo

**Verification**:
- Vite's build process resolves imports from `packages/*` and includes them in bundle
- Source maps will reference original package source files (e.g., `packages/graph/src/types.ts`)
- No special configuration needed for monorepo support

**Implementation**: Single upload command covers entire build output:
```bash
posthog-cli sourcemap upload ./apps/web/dist
```

**References**:
- Vite monorepo handling: https://vitejs.dev/guide/build.html#multi-page-app
- PostHog CLI recursive file discovery: https://posthog.com/docs/libraries/posthog-cli#sourcemap-upload

---

## Open Questions

None. All technical decisions are clear and documented above. Ready to proceed to Phase 1 (Design & Contracts).

---

## Summary

Key technologies and approaches confirmed:
1. **Vite `build.sourcemap: true`** for source map generation
2. **PostHog CLI** (`inject` + `upload` commands) for source map workflow
3. **GitHub Actions** integration in existing deployment workflow
4. **Git commit SHA** as release version identifier
5. **EU PostHog instance** (`https://eu.posthog.com`) for uploads
6. **Security**: Delete source maps after upload using `--delete-after` flag

No additional research or clarification needed. Implementation approach is well-documented in PostHog official documentation and aligns with industry best practices.
