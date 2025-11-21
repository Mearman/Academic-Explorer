# Quickstart: PostHog Source Map Upload

**Feature**: 018-posthog-sourcemaps
**Phase**: 1 - Design & Contracts
**Date**: 2025-11-21

## What This Feature Does

Enables readable stack traces in PostHog for production errors by automatically uploading source maps during CI/CD deployment. Without this feature, production errors show minified code references like `main-abc123.js:1:2345`. With this feature, errors show original source locations like `apps/web/src/components/Graph.tsx:42`.

---

## Prerequisites

### Required Accounts & Access

- [x] PostHog account with project created
- [x] PostHog project using EU instance (`https://eu.posthog.com`)
- [x] GitHub repository with Actions enabled
- [x] Existing deployment workflow (GitHub Pages or similar)

### Required Information

You'll need to obtain these values from PostHog:

1. **Project ID** (starts with `phc_`)
   - Location: PostHog → Project Settings → General → Project ID

2. **API Token** (starts with `phx_`)
   - Location: PostHog → Settings → Personal API Keys
   - Required scopes: `error tracking write` + `organization read`

---

## Implementation Steps (5 Steps)

### Step 1: Enable Vite Source Maps

**File**: `apps/web/vite.config.ts`

**Change**: Add `sourcemap: true` to build configuration

```typescript
export default defineConfig({
  build: {
    sourcemap: true, // ADD THIS LINE
    // ... existing config
  },
})
```

**Verify**:
```bash
pnpm build --filter=web
ls -lh apps/web/dist/assets/*.map
# Should see multiple .map files
```

**Time**: 2 minutes

---

### Step 2: Create PostHog API Token

**Steps**:
1. Open PostHog dashboard → Settings → Personal API Keys
2. Click "Create API Key"
3. Name: `GitHub Actions Source Maps`
4. Scopes: Select `error tracking write` + `organization read`
5. Click "Create Key"
6. **Copy the token** (starts with `phx_`, shown only once)

**Time**: 3 minutes

---

### Step 3: Add GitHub Secrets

**Navigate**: GitHub repository → Settings → Secrets and variables → Actions

**Add two secrets**:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `POSTHOG_CLI_ENV_ID` | Your PostHog project ID | `phc_abc123xyz...` |
| `POSTHOG_CLI_TOKEN` | API token from Step 2 | `phx_def456uvw...` |

**Steps for each**:
1. Click "New repository secret"
2. Enter name exactly as shown above
3. Paste value
4. Click "Add secret"

**Time**: 2 minutes

---

### Step 4: Update GitHub Actions Workflow

**File**: `.github/workflows/deploy.yml` (or your deployment workflow file)

**Location**: Add these steps AFTER build, BEFORE deployment

```yaml
# Existing build step
- name: Build web app
  run: pnpm build --filter=web

# NEW STEPS (add these)
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

# Existing deployment step
- name: Deploy to GitHub Pages
  # ... existing deployment config
```

**Time**: 5 minutes

---

### Step 5: Test the Workflow

**Trigger**: Push a commit to trigger deployment workflow

**Monitor**:
1. Go to GitHub repository → Actions tab
2. Watch workflow run
3. Verify all source map steps succeed (green checkmarks)

**Expected Output in Logs**:
```
Install PostHog CLI
✓ added 1 package

Inject source map metadata
✓ Injected release metadata into 12 bundles

Upload source maps to PostHog
(silent on success)
```

**Verify in PostHog**:
1. Open PostHog dashboard
2. Navigate to Project Settings → Symbol Sets
3. Verify latest release appears with correct git commit SHA
4. Verify file count matches expected number of source maps

**Time**: 10 minutes (including deployment time)

---

## Total Implementation Time: ~25 minutes

---

## Testing the Feature

### Trigger a Test Error

**Option 1: Temporary Error Component**

Add this to any route in your app:

```typescript
// apps/web/src/routes/TestError.tsx
export function TestError() {
  throw new Error('Test error for source map verification')
  return null
}
```

Deploy and visit the route. Check PostHog for the error.

**Option 2: Browser Console**

In production site, open dev tools console:

```javascript
throw new Error('Manual test error for source maps')
```

**Verify Stack Trace**:
1. Go to PostHog dashboard → Errors
2. Find your test error
3. Expand stack trace
4. **Expected**: See `apps/web/src/routes/TestError.tsx:2` (original source)
5. **Before fix**: Would see `main-abc123.js:1:2345` (minified)

---

## Troubleshooting

### Source Maps Not Uploading

**Symptom**: Workflow succeeds but no Symbol Set in PostHog

**Possible Causes**:
1. Wrong project ID → Check `POSTHOG_CLI_ENV_ID` matches PostHog dashboard
2. Invalid API token → Regenerate token with correct scopes
3. Wrong PostHog instance → Verify using `https://eu.posthog.com`, not `https://app.posthog.com`

**Debug Steps**:
```bash
# Check if .map files exist after build
ls -lh apps/web/dist/assets/*.map

# Check if injection succeeded
grep "postHogRelease" apps/web/dist/assets/*.js
```

---

### Workflow Fails at Upload Step

**Symptom**: GitHub Actions shows red X on "Upload source maps" step

**Common Errors**:

| Error Message | Cause | Fix |
|---------------|-------|-----|
| `Authentication failed` | Invalid token or missing scopes | Regenerate token with `error tracking write` + `organization read` |
| `Project not found` | Wrong project ID | Copy project ID from PostHog dashboard |
| `No source maps found` | Build didn't generate `.map` files | Verify `sourcemap: true` in vite.config.ts |
| `Network error` | PostHog service unavailable | Retry workflow (usually transient) |

---

### Stack Traces Still Show Minified Code

**Symptom**: Errors in PostHog show `main-abc123.js:1:2345` instead of original source

**Possible Causes**:
1. Source maps uploaded for wrong release version → Check release version in PostHog matches deployed commit SHA
2. Metadata injection failed → Check workflow logs for "Injected release metadata" success message
3. Source maps deleted before upload → Verify `--delete-after` flag ONLY in upload step, not inject step
4. PostHog not matching release → Verify PostHog JavaScript SDK is configured with same release version

**Verification**:
```bash
# Check if injected metadata exists in built JS
head -n 1 apps/web/dist/assets/*.js | grep postHogRelease
# Should see: //# postHogRelease=<commit-sha>
```

---

### Build Time Significantly Increased

**Symptom**: Build takes 2x longer after enabling source maps

**Expected**: Source map generation adds ~30-60 seconds to build time

**Acceptable**: Up to 2 minutes for full monorepo build

**If Excessive**: Check Vite configuration for unnecessary plugins or large bundle sizes

**Mitigation**: Source maps only needed for production builds, not development (Vite provides dev source maps automatically)

---

## Understanding the Workflow

### What Happens During Deployment

```
1. Build
   ↓
   pnpm build --filter=web
   ↓
   Generates: apps/web/dist/assets/*.js and *.js.map

2. Inject
   ↓
   posthog-cli sourcemap inject --version $GITHUB_SHA ./apps/web/dist
   ↓
   Modifies: *.js files (adds //# postHogRelease and //# postHogChunkId comments)

3. Upload
   ↓
   posthog-cli sourcemap upload ... ./apps/web/dist
   ↓
   Uploads: *.map files to PostHog cloud
   Creates: Symbol Set in PostHog with release version
   Deletes: *.map files from dist/ (--delete-after flag)

4. Deploy
   ↓
   Deploy apps/web/dist to GitHub Pages
   ↓
   Result: Deployed bundle includes .js files (with metadata comments) but NOT .map files
```

### Why Source Maps Are Deleted

**Security**: Source maps contain original source code. Deleting them prevents exposing source code publicly while still allowing PostHog to use them for error debugging.

**How It Works**: PostHog stores uploaded source maps privately in their cloud. When errors occur, PostHog matches the release version and deobfuscates stack traces server-side.

---

## Maintenance

### When to Update

**Rarely**: Once configured, no ongoing maintenance needed

**Update API Token** if:
- Token expires (PostHog tokens don't expire by default)
- Token compromised (regenerate and update GitHub secret)
- Permission scopes change (unlikely)

**Update Configuration** if:
- Migrating to different PostHog instance (change `--host` parameter)
- Changing release version strategy (currently using git commit SHA)

---

## Next Steps After Implementation

### 1. Remove Test Error Code

Delete the temporary error component created for testing.

### 2. Monitor Errors in Production

- Set up PostHog error alerts (optional)
- Review error dashboard regularly
- Verify all production errors have readable stack traces

### 3. Document for Team

If working with other developers:
- Add note to README about source map upload
- Document where API tokens are stored (GitHub Secrets)
- Explain how to verify source maps in PostHog dashboard

---

## FAQ

### Q: Do source maps affect production bundle size?

**A**: No. Source maps are deleted before deployment (using `--delete-after`). Deployed bundles are the same size as without source maps.

### Q: Can source maps be used in browser dev tools?

**A**: No. Source maps are not deployed (deleted before deployment). Browser dev tools will only show minified code. Source maps are only available to PostHog for error debugging.

### Q: What if multiple deployments happen quickly?

**A**: Each deployment creates a unique Symbol Set using the git commit SHA. PostHog stores all versions. No conflicts occur.

### Q: How long are source maps retained?

**A**: PostHog stores source maps indefinitely by default. Check PostHog retention settings if storage limits are a concern.

### Q: Can I test locally before deploying?

**A**: Partially. You can test source map generation locally (`pnpm build`), but upload requires GitHub Actions secrets and PostHog API access. Full end-to-end testing requires pushing to GitHub.

### Q: What happens if upload fails?

**A**: Workflow fails, deployment is blocked. This is intentional—prevents deploying code without debugging capability. Fix the issue and retry.

---

## Reference Links

- [Feature Spec](./spec.md) - Full requirements and acceptance criteria
- [Research](./research.md) - Technology decisions and alternatives considered
- [Data Model](./data-model.md) - Build artifact and entity descriptions
- [CLI Commands Contract](./contracts/posthog-cli-commands.md) - Detailed command documentation
- [Vite Configuration Contract](./contracts/vite-configuration.md) - Build configuration details

---

## Success Criteria Checklist

After completing all steps, verify:

- [ ] Production builds generate `.map` files
- [ ] GitHub Actions workflow succeeds on deployment
- [ ] PostHog Symbol Sets page shows latest release version
- [ ] File count in Symbol Set matches expected source map count
- [ ] Test error in production shows original source file path in PostHog
- [ ] Deployed bundle does NOT include `.map` files (security check)
- [ ] Build time increased by less than 2 minutes
- [ ] No deployment failures due to source map steps

**If all checked**: Feature is fully operational! 🎉
