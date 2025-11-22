# Vite Configuration Contract

**Feature**: 018-posthog-sourcemaps
**Phase**: 1 - Design & Contracts
**Date**: 2025-11-21

## Overview

This document defines the Vite configuration changes required to enable source map generation for PostHog error tracking. Vite is the build tool for Bibliom's web application.

---

## Configuration File

**File**: `apps/web/vite.config.ts`

**Type**: TypeScript configuration module using Vite's `defineConfig` helper

**Current State**: Unknown (need to read existing config)

**Required Change**: Add `sourcemap: true` to `build` section

---

## Configuration Contract

### Required Configuration

```typescript
import { defineConfig } from 'vite'
// ... other imports

export default defineConfig({
  // ... existing config
  build: {
    sourcemap: true, // ADD THIS LINE
    // ... other build options
  },
  // ... rest of config
})
```

### Configuration Options

#### `build.sourcemap`

**Type**: `boolean | 'inline' | 'hidden'`

**Required Value**: `true`

**Default Value**: `false` (source maps disabled)

**Behavior**:
- `true` - Generates separate `.map` files and adds `//# sourceMappingURL=` comments to JS bundles
- `'inline'` - Embeds source maps as base64 in JS bundles (NOT compatible with PostHog)
- `'hidden'` - Generates `.map` files but omits `sourceMappingURL` comments (NOT compatible with PostHog CLI inject)
- `false` - No source maps generated

**Rationale**: PostHog requires:
1. Separate `.map` files (not inline)
2. `sourceMappingURL` comments (not hidden)
3. These comments allow PostHog CLI to inject release metadata

**References**: [Vite build.sourcemap documentation](https://vitejs.dev/config/build-options.html#build-sourcemap)

---

## Build Output Contract

### Expected Output Structure

After running `pnpm build --filter=web` with `sourcemap: true`:

```
apps/web/dist/
├── assets/
│   ├── index-a1b2c3.js
│   ├── index-a1b2c3.js.map         # NEW: Source map for main bundle
│   ├── vendor-d4e5f6.js
│   ├── vendor-d4e5f6.js.map        # NEW: Source map for vendor bundle
│   ├── Graph-g7h8i9.js             # Async chunk
│   ├── Graph-g7h8i9.js.map         # NEW: Source map for async chunk
│   └── ...
├── index.html
└── favicon.ico
```

### Source Map File Characteristics

**File Extension**: `.map`

**File Naming**: Matches corresponding `.js` file with `.map` appended

**File Format**: JSON (Source Map v3 specification)

**File Size**: Typically 2-10x larger than corresponding JS file (contains original source)

**File Count**: One `.map` file per `.js` bundle/chunk (expected 10-50 for Bibliom)

### JavaScript Bundle Changes

Each `.js` file will include source map reference comment at the end:

```javascript
// ... minified code ...
//# sourceMappingURL=index-a1b2c3.js.map
```

**Comment Format**: `//# sourceMappingURL=<filename>`

**Location**: Last line of JS file

**Purpose**: Tells browser dev tools and PostHog CLI where to find source map

---

## Source Map Content Contract

### Source Map Structure

Generated `.map` files follow Source Map v3 specification:

```json
{
  "version": 3,
  "file": "index-a1b2c3.js",
  "sourceRoot": "",
  "sources": [
    "../../packages/graph/src/types.ts",
    "../../packages/graph/src/services/layout.ts",
    "../../packages/ui/src/components/Button.tsx",
    "../../apps/web/src/App.tsx",
    "../../apps/web/src/main.tsx"
  ],
  "sourcesContent": [
    "export interface GraphNode { ... }",
    "export function computeLayout() { ... }",
    "export const Button = () => { ... }",
    "function App() { ... }",
    "ReactDOM.render(<App />)"
  ],
  "names": [
    "GraphNode",
    "computeLayout",
    "Button",
    "App",
    "ReactDOM"
  ],
  "mappings": "AAAA,OAAO,CAAC,GAAG,CAAC,cAAc,CAAC;;AAE3B,OAAO,EAAE..."
}
```

### Key Fields

| Field | Description | Example |
|-------|-------------|---------|
| `version` | Source Map spec version | `3` |
| `file` | Output bundle filename | `index-a1b2c3.js` |
| `sources` | Array of original source file paths (relative to monorepo root) | `../../packages/graph/src/types.ts` |
| `sourcesContent` | Array of original source file contents | `["export interface...", ...]` |
| `names` | Array of original identifier names | `["GraphNode", "computeLayout", ...]` |
| `mappings` | Base64 VLQ-encoded mappings | `"AAAA,OAAO..."` |

### Monorepo Path Handling

**Critical**: Source paths MUST be relative to build output location and reference original package locations.

**Example Path Resolution**:
- Build output: `apps/web/dist/assets/index-a1b2c3.js`
- Original source: `packages/graph/src/types.ts`
- Source map path: `../../packages/graph/src/types.ts` (relative from dist/assets/)

**Vite Behavior**: Automatically resolves and includes source files from all imported packages.

**Verification**: Source maps should include files from both `apps/web/src` AND `packages/*/src`.

---

## Build Performance Impact

### Build Time

**Without source maps**: ~30-60 seconds (baseline)

**With source maps**: ~45-90 seconds (1.5x longer)

**Reason**: Additional processing to generate mappings and write `.map` files

**Mitigation**: Only enable in production builds, not development (HMR already provides source maps in dev)

### Bundle Size

**JavaScript bundles**: No size change (source maps are separate files)

**Total build output size**: 2-3x larger (includes `.map` files)

**Example**:
- JS bundles: 500 KB
- Source maps: 1.2 MB
- Total: 1.7 MB (compared to 500 KB without source maps)

**Deployment Impact**: Source maps are deleted before deployment (using `--delete-after`), so deployed bundle size is unchanged.

---

## Configuration Validation

### Type Safety

Vite configuration is fully typed. TypeScript compiler will catch:
- Invalid option names (e.g., `sourceMaps` instead of `sourcemap`)
- Invalid option values (e.g., `sourcemap: 'invalid'`)
- Missing required imports

**Verification**: Run `pnpm typecheck` after changing config

### Build Verification

After enabling source maps, verify generation:

```bash
pnpm build --filter=web
ls -lh apps/web/dist/assets/*.map
```

**Expected**: Multiple `.map` files in output directory

**If Missing**: Check console for build errors; verify `sourcemap: true` is set

### Runtime Verification

In browser dev tools (before deploying):
1. Open built `index.html` locally
2. Trigger an error
3. Check dev tools console
4. Verify stack trace shows original source file paths, not minified references

---

## Configuration Scope

### Environment-Specific Behavior

**Development** (`pnpm dev`):
- Vite provides inline source maps automatically via HMR
- No `.map` files generated
- `build.sourcemap` setting does NOT affect dev mode

**Production** (`pnpm build`):
- `build.sourcemap: true` generates separate `.map` files
- Applies to all production builds

**Recommendation**: Always enable source maps for production builds to support error debugging.

---

## Breaking Changes

### Deployment Impact

**Change Type**: Breaking change to build process

**Impact**:
- Build output now includes `.map` files
- CI/CD workflow must handle source map upload before deployment
- Deployment will fail if source map upload step fails (by design)

**Backward Compatibility**: Not applicable (Principle VII: Development-Stage Pragmatism allows breaking changes)

**Migration**: None required (feature addition, not data migration)

---

## Security Considerations

### Source Code Exposure Risk

**Risk**: Source maps contain original source code and file paths

**Mitigation**:
1. Source maps uploaded to PostHog (private, authenticated access)
2. Source maps deleted from build output before deployment (using `--delete-after` flag)
3. Deployed bundles do NOT include `.map` files or `sourceMappingURL` comments (comments remain, but files deleted)

**Verification**: After deployment, check GitHub Pages for `.map` files (should return 404)

### Build Secrets

**Risk**: Source maps might expose environment variables or API keys

**Mitigation**:
- Never hardcode secrets in source code (use environment variables at runtime)
- Review generated source maps for sensitive data before deploying (spot check)

---

## Configuration Template

### Minimal Required Change

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite'

export default defineConfig({
  build: {
    sourcemap: true, // Enable source map generation
  },
})
```

### Full Configuration Context

```typescript
// apps/web/vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { vanillaExtractPlugin } from '@vanilla-extract/vite-plugin'

export default defineConfig({
  plugins: [
    react(),
    vanillaExtractPlugin(),
  ],
  build: {
    sourcemap: true,        // NEW: Enable for PostHog
    outDir: 'dist',         // Existing
    rollupOptions: {        // Existing
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
        },
      },
    },
  },
  // ... other config
})
```

---

## Testing Contract

### Manual Testing Steps

1. Enable `sourcemap: true` in `apps/web/vite.config.ts`
2. Run `pnpm build --filter=web`
3. Verify `.map` files exist in `apps/web/dist/assets/`
4. Verify each `.js` file ends with `//# sourceMappingURL=<filename>.map`
5. Open `apps/web/dist/index.html` in browser
6. Open browser dev tools
7. Navigate to Sources tab
8. Verify original source files appear (not minified bundles)

### Automated Testing

No automated tests required for this configuration change. Verification is done through:
- TypeScript type checking (catches config errors)
- Build output inspection (verifies `.map` files generated)
- GitHub Actions workflow (verifies end-to-end upload process)

---

## Rollback Plan

### If Source Maps Cause Issues

**Revert**: Change `sourcemap: true` back to `sourcemap: false`

**Impact**:
- Production errors will show minified stack traces (degraded debugging experience)
- CI/CD workflow source map upload step will fail (no `.map` files to upload)
- Need to update GitHub Actions workflow to skip source map steps

**Recommendation**: Do not rollback unless critical issue discovered. Lack of source maps severely impacts debugging capability.

---

## References

- [Vite Configuration Documentation](https://vitejs.dev/config/)
- [Vite build.sourcemap Option](https://vitejs.dev/config/build-options.html#build-sourcemap)
- [Source Map v3 Specification](https://sourcemaps.info/spec.html)
- [Rollup sourcemap Option](https://rollupjs.org/configuration-options/#output-sourcemap) (Vite uses Rollup internally)
