# PostHog CLI Command Contracts

**Feature**: 022-posthog-sourcemaps
**Phase**: 1 - Design & Contracts
**Date**: 2025-11-21

## Overview

This document defines the command-line interface contracts for PostHog CLI operations used in the source map upload workflow. These are external tool invocations, not application APIs.

---

## Installation Command

### `npm install -g @posthog/cli`

**Purpose**: Install PostHog CLI globally in CI/CD environment

**Execution Context**: GitHub Actions workflow, before source map operations

**Input**: None (uses npm registry)

**Output**: PostHog CLI binary installed in `$PATH`

**Exit Codes**:
- `0`: Success
- `1`: Installation failed (network error, permission denied, etc.)

**Example**:
```bash
npm install -g @posthog/cli
# Output: added 1 package, and audited 2 packages in 3s
```

**Error Handling**: GitHub Actions will fail workflow if exit code is non-zero

**References**: [npm-install documentation](https://docs.npmjs.com/cli/v10/commands/npm-install)

---

## Command: `posthog-cli sourcemap inject`

### Signature

```bash
posthog-cli sourcemap inject \
  --version <RELEASE_VERSION> \
  <BUILD_OUTPUT_DIR>
```

### Description

Injects release version metadata and chunk IDs into JavaScript bundle files by appending special comments that reference the corresponding source map files.

### Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `--version` | string | Yes | Release version identifier (git commit SHA) | `a1b2c3d4e5f6...` |
| `<BUILD_OUTPUT_DIR>` | path | Yes | Directory containing built JS bundles and source maps | `./apps/web/dist` |

### Environment Variables

None required for this command.

### Input Files

Expects the following structure in `<BUILD_OUTPUT_DIR>`:

```
dist/
├── assets/
│   ├── main-a1b2c3.js           # Will be modified
│   ├── main-a1b2c3.js.map       # Read for chunk ID
│   ├── vendor-d4e5f6.js         # Will be modified
│   └── vendor-d4e5f6.js.map     # Read for chunk ID
└── index.html                    # Unchanged
```

### Output

**Modifies** JavaScript bundle files in-place by appending:

```javascript
//# sourceMappingURL=main-a1b2c3.js.map
//# postHogRelease=a1b2c3d4e5f6...
//# postHogChunkId=main
```

### Exit Codes

- `0`: Success (all bundles injected)
- `1`: Error (missing source maps, invalid directory, write permission error)

### Error Messages

| Error | Cause | Resolution |
|-------|-------|-----------|
| `No source maps found in <dir>` | Build output missing `.map` files | Verify Vite `sourcemap: true` is set |
| `Unable to read <file>` | File permission error | Check CI/CD user permissions |
| `--version is required` | Missing version parameter | Add `--version $GITHUB_SHA` |

### Example Usage

```bash
posthog-cli sourcemap inject \
  --version a1b2c3d4e5f6789012345678901234567890abcd \
  ./apps/web/dist

# Output:
# ✓ Injected release metadata into 12 bundles
# ✓ main-a1b2c3.js
# ✓ vendor-d4e5f6.js
# ✓ Graph-g7h8i9.js
# ...
```

### Idempotency

**Non-idempotent**: Running twice will append duplicate comments. Should only run once per build.

### Side Effects

- Modifies JavaScript bundle files on disk
- Increases bundle file size by ~100 bytes per file (metadata comments)

### References

- [PostHog CLI Source Map Injection](https://posthog.com/docs/libraries/posthog-cli#sourcemap-inject)

---

## Command: `posthog-cli sourcemap upload`

### Signature

```bash
posthog-cli sourcemap upload \
  --project-id <PROJECT_ID> \
  --api-token <API_TOKEN> \
  --host <POSTHOG_HOST> \
  [--delete-after] \
  <BUILD_OUTPUT_DIR>
```

### Description

Uploads source map files to PostHog cloud, creating a Symbol Set for the release. Optionally deletes source maps from local filesystem after successful upload.

### Parameters

| Parameter | Type | Required | Description | Example |
|-----------|------|----------|-------------|---------|
| `--project-id` | string | Yes | PostHog project identifier (starts with `phc_`) | `phc_abc123xyz...` |
| `--api-token` | string | Yes | PostHog API token (starts with `phx_`) | `phx_def456uvw...` |
| `--host` | string | Yes | PostHog instance URL | `https://eu.posthog.com` |
| `--delete-after` | flag | No | Delete source maps after upload (recommended) | N/A (flag) |
| `<BUILD_OUTPUT_DIR>` | path | Yes | Directory containing source maps | `./apps/web/dist` |

### Environment Variables

| Variable | Required | Description | Example |
|----------|----------|-------------|---------|
| `POSTHOG_CLI_ENV_ID` | No* | Alternative to `--project-id` | `phc_abc123...` |
| `POSTHOG_CLI_TOKEN` | No* | Alternative to `--api-token` | `phx_def456...` |

*If not provided via flags, CLI will read from environment variables.

### Input Files

Reads all `.map` files recursively from `<BUILD_OUTPUT_DIR>`:

```
dist/
├── assets/
│   ├── main-a1b2c3.js.map       # Uploaded
│   ├── vendor-d4e5f6.js.map     # Uploaded
│   └── Graph-g7h8i9.js.map      # Uploaded
└── ...
```

### Output

**Side Effects**:
1. Uploads source maps to PostHog cloud
2. Creates Symbol Set in PostHog with release version from injected metadata
3. If `--delete-after` flag used, deletes `.map` files from disk

**No stdout on success** (unless verbose mode, not used in this feature)

### Exit Codes

- `0`: Success (all source maps uploaded)
- `1`: Error (authentication failed, network error, invalid files)

### Error Messages

| Error | Cause | Resolution |
|-------|-------|-----------|
| `Authentication failed` | Invalid `--api-token` or insufficient scopes | Verify token has `error tracking write` + `organization read` scopes |
| `Project not found` | Invalid `--project-id` | Verify project ID matches PostHog dashboard |
| `Network error: <details>` | PostHog service unavailable or network issue | Retry; GitHub Actions will fail workflow |
| `No source maps found` | Missing `.map` files or wrong directory | Verify `sourcemap inject` ran successfully |
| `Invalid source map: <file>` | Corrupted or malformed `.map` file | Check Vite build output |

### Example Usage

```bash
posthog-cli sourcemap upload \
  --project-id ${{ secrets.POSTHOG_CLI_ENV_ID }} \
  --api-token ${{ secrets.POSTHOG_CLI_TOKEN }} \
  --host https://eu.posthog.com \
  --delete-after \
  ./apps/web/dist

# Output (on success):
# (silent)
# Exit code: 0

# Output (on error):
# Error: Authentication failed: Invalid API token
# Exit code: 1
```

### Idempotency

**Idempotent**: Uploading same release version multiple times overwrites previous Symbol Set. Safe to retry on transient failures.

### Side Effects

- Creates/updates Symbol Set in PostHog cloud storage
- If `--delete-after` used, deletes local `.map` files (irreversible)
- Network traffic: ~500KB - 5MB per file (depends on source map size)

### Performance

- **Expected Duration**: 30 seconds - 2 minutes for 10-50 source maps
- **Parallelism**: CLI uploads files in parallel (exact concurrency not documented)
- **Retries**: CLI automatically retries transient network errors (exact strategy not documented)

### Security

- API token is sensitive; must be stored in GitHub Secrets
- Source maps contain original source code; deleted after upload to prevent exposure
- Communication over HTTPS (TLS 1.2+)

### References

- [PostHog CLI Source Map Upload](https://posthog.com/docs/libraries/posthog-cli#sourcemap-upload)
- [PostHog API Token Scopes](https://posthog.com/docs/api/overview#authentication)

---

## Workflow Integration Contract

### GitHub Actions Workflow Sequence

```yaml
# Step 1: Build with source maps
- name: Build web app
  run: pnpm build --filter=web
  # Produces: apps/web/dist with .js and .map files

# Step 2: Install PostHog CLI
- name: Install PostHog CLI
  run: npm install -g @posthog/cli
  # Provides: posthog-cli command in $PATH

# Step 3: Inject metadata
- name: Inject source map metadata
  run: posthog-cli sourcemap inject --version ${{ github.sha }} ./apps/web/dist
  # Modifies: apps/web/dist/assets/*.js (adds metadata comments)

# Step 4: Upload to PostHog
- name: Upload source maps to PostHog
  run: |
    posthog-cli sourcemap upload \
      --project-id ${{ secrets.POSTHOG_CLI_ENV_ID }} \
      --api-token ${{ secrets.POSTHOG_CLI_TOKEN }} \
      --host https://eu.posthog.com \
      --delete-after \
      ./apps/web/dist
  # Creates: Symbol Set in PostHog cloud
  # Deletes: apps/web/dist/assets/*.map

# Step 5: Deploy (existing step)
- name: Deploy to GitHub Pages
  # Uses: apps/web/dist (now without .map files)
```

### Contract Guarantees

1. **Build Artifact Integrity**: Metadata injection does not corrupt JavaScript bundles
2. **Upload Atomicity**: Either all source maps upload successfully, or workflow fails (no partial uploads)
3. **Deployment Safety**: Source maps not present in deployed bundle (deleted by `--delete-after`)
4. **Error Propagation**: Any CLI command failure fails entire workflow (prevents deploying without source maps)
5. **Release Traceability**: Git commit SHA used as release version enables exact code version lookup

### Failure Modes

| Failure Point | Behavior | Recovery |
|---------------|----------|----------|
| CLI installation fails | Workflow fails, deployment blocked | Check npm registry availability; retry workflow |
| Metadata injection fails | Workflow fails, deployment blocked | Check build output exists; verify Vite sourcemap enabled |
| Upload authentication fails | Workflow fails, deployment blocked | Verify GitHub Secrets are set correctly |
| Upload network error | Workflow fails, deployment blocked | Retry workflow (idempotent operation) |
| PostHog service unavailable | Workflow fails, deployment blocked | Wait for PostHog recovery; retry workflow |

---

## Verification Contracts

### PostHog Dashboard Verification

**Location**: PostHog → Project Settings → Symbol Sets

**Expected State After Upload**:

```
Symbol Sets
├── Release: a1b2c3d4e5f6... (git commit SHA)
│   ├── Uploaded: 2025-11-21 14:32:11 UTC
│   ├── Files: 12
│   ├── Status: Active
│   └── Files:
│       ├── packages/graph/src/types.ts
│       ├── apps/web/src/components/Graph.tsx
│       └── ...
```

**Verification Steps**:
1. Navigate to PostHog dashboard
2. Open Project Settings
3. Click "Symbol Sets" tab
4. Verify release version matches deployed git commit SHA
5. Verify file count matches expected source map count
6. Spot-check file paths to ensure monorepo packages included

**If Missing**: Upload failed silently; check GitHub Actions logs

---

## API Token Requirements

### Required Scopes

PostHog API token MUST have the following scopes:

- `error tracking write` - Allows uploading source maps
- `organization read` - Allows CLI to verify project exists

### Creating Token

**Steps**:
1. PostHog Dashboard → Settings → Personal API Keys
2. Click "Create API Key"
3. Name: "GitHub Actions Source Maps"
4. Scopes: Select `error tracking write` + `organization read`
5. Click "Create Key"
6. Copy token (starts with `phx_`)

**Token Storage**:
- Add to GitHub repository secrets as `POSTHOG_CLI_TOKEN`
- Never commit token to code repository

**Token Rotation**:
- If token compromised, revoke in PostHog dashboard
- Generate new token with same scopes
- Update GitHub secret

---

## References

- [PostHog CLI Documentation](https://posthog.com/docs/libraries/posthog-cli)
- [PostHog Source Maps Guide](https://posthog.com/docs/product-analytics/source-maps)
- [PostHog API Authentication](https://posthog.com/docs/api/overview#authentication)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
