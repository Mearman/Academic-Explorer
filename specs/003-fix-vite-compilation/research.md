# Research: TypeScript/Vite Compilation Configuration

**Feature**: Fix Vite/TypeScript In-Place Compilation Issue
**Date**: 2025-11-11
**Branch**: `003-fix-vite-compilation`

## Problem Statement

TypeScript is emitting compiled .js, .js.map, and .d.ts files directly into src/ directories alongside source .ts/.tsx files. This causes Vite dev server to serve stale cached code during E2E tests instead of the latest source changes. The issue blocks test-driven development as code modifications aren't reflected in test execution.

**Root Cause Discovered**: During the fix for feature 002-fix-catalogue-tests, we attempted to add `noEmit: true` to tsconfig.app.json (commit 3898deb). This prevented in-place compilation but broke TypeScript project references with error: `tsconfig.json(38,5): error TS6310: Referenced project '/Users/joe/Documents/Research/PhD/Academic Explorer/apps/web' may not disable emit.`

The tools package references apps/web and requires declaration files (.d.ts) for type checking, so we cannot globally disable emit.

## Research Questions

1. How to configure TypeScript to emit files ONLY to dist/ or a specific output directory, never in-place in src/?
2. How to maintain project references while controlling emit locations?
3. How does Vite dev server determine which files to serve - source or compiled?
4. What causes Vite HMR (Hot Module Replacement) to cache stale code?
5. Best practices for tsconfig in Nx/Vite monorepos with project references?

---

## Decision 1: TypeScript Output Directory Configuration

**Research Finding**: TypeScript's `outDir` compiler option controls where .js files are emitted, but it doesn't prevent in-place compilation if not set correctly. The key is using `outDir` with `rootDir` to establish proper directory mapping.

**Options Considered**:

### Option A: Use `outDir` in apps/web/tsconfig.json
```json
{
  "extends": "../../tsconfig.app.json",
  "compilerOptions": {
    "outDir": "./dist",
    "rootDir": "./src"
  }
}
```

**Pros**:
- Simple and explicit
- Standard TypeScript pattern
- Declaration files (.d.ts) go to dist/ alongside .js files

**Cons**:
- May conflict with Vite's own compilation (Vite uses esbuild, not tsc for dev server)
- Requires ensuring Vite doesn't look for .js files in dist/ during dev

### Option B: Use `declarationDir` to separate declarations from JS
```json
{
  "compilerOptions": {
    "declaration": true,
    "declarationDir": "./dist/types",
    "emitDeclarationOnly": false,
    "outDir": "./dist"
  }
}
```

**Pros**:
- Clean separation of .d.ts files for project references
- Tools package can reference dist/types/
- Still allows project reference type checking

**Cons**:
- More complex configuration
- Two output directories to manage

### Option C: Different configs for dev vs build
```json
// tsconfig.json (dev - type checking only)
{
  "compilerOptions": {
    "noEmit": true
  }
}

// tsconfig.build.json (build - emit to dist)
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "outDir": "./dist",
    "declaration": true
  }
}
```

**Pros**:
- Clear separation of concerns
- Dev mode never emits (fast)
- Build mode emits properly for project references

**Cons**:
- Requires updating package.json scripts
- More configuration files to maintain
- Need to ensure tools package references correct config

**Decision**: **Option C - Separate configs for dev vs build**

**Rationale**:
- Aligns with Vite's architecture - Vite handles all compilation during dev (esbuild), TypeScript only does type checking
- Prevents in-place compilation during development (noEmit: true for dev)
- Build process explicitly emits to dist/ for production and project references
- Common pattern in Vite projects (see Vite docs on "Building for Production")
- Resolves the conflict: dev doesn't emit (no in-place files), build emits to dist/ (project references work)

**Implementation Details**:
- apps/web/tsconfig.json: Use for type checking (noEmit: true)
- apps/web/tsconfig.build.json: Use for building (extends tsconfig.json, sets noEmit: false, outDir: dist)
- Update package.json: `"typecheck": "tsc --noEmit"` and `"build": "tsc -p tsconfig.build.json && vite build"`
- tools/tsconfig.json: Reference apps/web's declaration output directory

**Alternatives Rejected**:
- Option A: Would cause tsc to emit .js files during type checking, defeating the purpose
- Option B: Complexity without solving the dev/build separation issue

---

## Decision 2: Vite Dev Server Configuration

**Research Finding**: Vite dev server compiles TypeScript on-the-fly using esbuild and serves from memory. It should never read pre-compiled .js files from src/. If it does, it indicates incorrect module resolution or cached artifacts.

**Options Considered**:

### Option A: Clear Vite cache on startup
```javascript
// vite.config.ts
export default defineConfig({
  cacheDir: 'node_modules/.vite',
  server: {
    force: true, // Force re-optimization on every start
  }
})
```

**Pros**:
- Ensures fresh compilation every time
- Simple one-line change

**Cons**:
- Slower dev server startup
- Defeats purpose of caching for fast HMR
- Doesn't address root cause

### Option B: Configure Vite to ignore .js files in src/
```javascript
// vite.config.ts
export default defineConfig({
  resolve: {
    extensions: ['.ts', '.tsx', '.jsx'], // Exclude '.js'
  },
  server: {
    watch: {
      ignored: ['**/src/**/*.js'], // Don't watch .js files in src
    }
  }
})
```

**Pros**:
- Explicitly tells Vite to ignore problematic files
- Prevents HMR from watching in-place .js files

**Cons**:
- Workaround, doesn't prevent .js files from being created
- May break if legitimate .js files needed in src/ (e.g., workers)

### Option C: Fix source of .js file creation (TypeScript config)
```javascript
// No Vite config changes needed - fix TypeScript instead
```

**Pros**:
- Addresses root cause
- No Vite workarounds needed
- Cleaner solution

**Cons**:
- None - this is the correct approach

**Decision**: **Option C - Fix TypeScript config, no Vite changes needed**

**Rationale**:
- Vite is working correctly - it's designed to compile .ts files on-the-fly
- The problem is TypeScript creating .js files that shouldn't exist
- Fixing tsconfig (Decision 1) prevents .js file creation
- Vite will naturally serve fresh compilation from memory
- No Vite config changes required - existing configuration is correct

**Implementation Details**:
- Verify existing vite.config.ts has correct output directory: `build: { outDir: 'dist' }`
- Verify Vite server config doesn't specify unusual module resolution
- After fixing tsconfig, test that Vite dev server picks up changes immediately

**Alternatives Rejected**:
- Option A: Performance impact without solving root cause
- Option B: Workaround that masks real issue

---

## Decision 3: Clearing Stale Compiled Artifacts

**Research Finding**: Existing .js, .js.map, and .d.ts files in src/ directories need to be removed before the fix takes effect. These files were created by previous TypeScript compilations.

**Options Considered**:

### Option A: Manual deletion with git clean
```bash
find apps/web/src -name "*.js" -o -name "*.js.map" -o -name "*.d.ts" | xargs rm -f
```

**Pros**:
- One-time operation
- Can verify files manually before deleting

**Cons**:
- Manual process prone to errors
- Doesn't update .gitignore
- Files could be recreated if config not fixed first

### Option B: Add to .gitignore and git clean
```bash
# .gitignore
apps/web/src/**/*.js
apps/web/src/**/*.js.map
apps/web/src/**/*.d.ts
!apps/web/src/**/*.test.js
!apps/web/src/**/*.config.js

# Then clean
git clean -fdX apps/web/src/
```

**Pros**:
- Prevents future commits of compiled artifacts
- git clean respects .gitignore patterns
- Systematic approach

**Cons**:
- Need to be careful with ! exclusion patterns
- May accidentally ignore legitimate .js files (e.g., Vite config plugins)

### Option C: Add pre-build cleanup script
```json
// package.json
{
  "scripts": {
    "clean:artifacts": "find apps/web/src -type f \\( -name '*.js' -o -name '*.js.map' -o -name '*.d.ts' \\) ! -name '*.test.js' ! -name '*.config.js' -delete",
    "prebuild": "pnpm clean:artifacts"
  }
}
```

**Pros**:
- Automatic cleanup before builds
- Documented in package.json
- Can be run manually if needed

**Cons**:
- Adds overhead to build process
- Shouldn't be necessary after config fix

**Decision**: **Option B - Add to .gitignore then one-time cleanup**

**Rationale**:
- Prevents compiled artifacts from being committed to git
- One-time cleanup removes existing files
- After tsconfig fix (Decision 1), files won't be recreated
- .gitignore patterns are standard practice for build artifacts
- No ongoing overhead (unlike Option C)

**Implementation Details**:
1. Add gitignore patterns:
   ```
   # TypeScript compiled artifacts in src/ directories
   apps/web/src/**/*.js
   apps/web/src/**/*.js.map
   apps/web/src/**/*.d.ts

   # But allow Vite config plugins if any
   !apps/web/src/build-plugins/**/*.js
   ```

2. Run one-time cleanup:
   ```bash
   cd /Users/joe/Documents/Research/PhD/Academic\ Explorer
   git clean -fdxn apps/web/src/ # Preview what will be deleted
   git clean -fdX apps/web/src/  # Actually delete (respects .gitignore)
   ```

3. Verify no .js files remain:
   ```bash
   find apps/web/src -name "*.js" -o -name "*.js.map" -o -name "*.d.ts"
   # Should return empty
   ```

**Alternatives Rejected**:
- Option A: No .gitignore update, files could be committed
- Option C: Unnecessary overhead after config fix

---

## Decision 4: Project Reference Configuration

**Research Finding**: The tools package needs declaration files from apps/web to import types. This requires apps/web to emit .d.ts files, but they should go to dist/, not src/.

**Options Considered**:

### Option A: Point tools/tsconfig.json to apps/web/dist/
```json
// tools/tsconfig.json
{
  "references": [
    { "path": "../apps/web" }
  ],
  "compilerOptions": {
    "paths": {
      "@academic-explorer/web": ["../apps/web/dist/index.d.ts"]
    }
  }
}
```

**Pros**:
- Explicit path to declaration files
- Clear dependency

**Cons**:
- Hardcoded path may break if output structure changes
- Requires apps/web to be built before tools typecheck

### Option B: Use TypeScript project references properly
```json
// tools/tsconfig.json
{
  "references": [
    { "path": "../apps/web" }
  ]
}

// apps/web/tsconfig.build.json
{
  "compilerOptions": {
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist"
  }
}
```

**Pros**:
- Standard TypeScript project reference pattern
- TypeScript resolves paths automatically
- Supports incremental compilation

**Cons**:
- Requires composite: true (may slow down compilation slightly)
- Requires declaration and declarationMap for incremental builds

### Option C: Remove tools dependency on apps/web
```json
// tools/tsconfig.json
{
  "references": [] // Remove apps/web reference
}
```

**Pros**:
- Simplest solution
- No project reference complexity

**Cons**:
- May break if tools actually uses types from apps/web
- Need to audit code to confirm dependency exists

**Decision**: **Option B - Use TypeScript project references properly with composite mode**

**Rationale**:
- TypeScript project references are designed for this exact use case
- `composite: true` enables proper incremental compilation
- `declaration: true` emits .d.ts to outDir (dist/), not src/
- TypeScript automatically finds declaration files through project references
- Aligns with Nx monorepo best practices
- The slight compilation overhead is worth the type safety

**Implementation Details**:

1. Update apps/web/tsconfig.build.json:
   ```json
   {
     "extends": "./tsconfig.json",
     "compilerOptions": {
       "composite": true,
       "declaration": true,
       "declarationMap": true,
       "outDir": "./dist",
       "noEmit": false
     }
   }
   ```

2. Keep apps/web/tsconfig.json for dev (no changes needed):
   ```json
   {
     "extends": "../../tsconfig.app.json",
     "compilerOptions": {
       "noEmit": true  // Type checking only, no emit
     }
   }
   ```

3. Tools package references apps/web (no changes needed):
   ```json
   {
     "references": [
       { "path": "../apps/web" }
     ]
   }
   ```

4. Update apps/web/package.json scripts:
   ```json
   {
     "scripts": {
       "typecheck": "tsc --noEmit",
       "build": "tsc -p tsconfig.build.json && vite build"
     }
   }
   ```

**Alternatives Rejected**:
- Option A: Fragile hardcoded paths
- Option C: Would require auditing and potentially breaking existing functionality

---

## Summary of Decisions

1. **TypeScript Configuration**: Use separate tsconfig.json (dev, noEmit) and tsconfig.build.json (build, emit to dist)
2. **Vite Configuration**: No changes needed - Vite already works correctly
3. **Stale Artifacts**: Add .gitignore patterns, one-time cleanup with git clean
4. **Project References**: Use composite mode with proper declaration output to dist/

## Implementation Checklist

- [ ] Add gitignore patterns for src/**/*.js artifacts
- [ ] Run git clean to remove existing .js files in src/
- [ ] Create apps/web/tsconfig.build.json with composite, declaration, outDir
- [ ] Update apps/web/tsconfig.json to keep noEmit for dev
- [ ] Update apps/web/package.json build script to use tsconfig.build.json
- [ ] Verify tools package typecheck works with new configuration
- [ ] Test Vite dev server picks up code changes immediately
- [ ] Verify E2E tests see latest code changes
- [ ] Verify production build works without errors
- [ ] Document configuration pattern for future packages

## Performance Impact

**Baseline Measurements**:
- Vite dev server cold start: ~350ms (from test output)
- E2E test suite: ~2 minutes for 26 tests
- TypeScript typecheck: ~3-5 seconds

**Expected Changes**:
- Dev server startup: No change (Vite doesn't use tsc output)
- Typecheck: Slight improvement (noEmit skips codegen)
- Build: Slight increase due to composite mode (~5-10% slower)
- E2E tests: Should pass immediately after code changes (fixes main issue)

**Acceptable Thresholds** (from Success Criteria):
- E2E test time: Within 10% of baseline (SC-001)
- Dev server start: Under 2 seconds (SC-007) - currently ~350ms, well within limit
- Code change reflection: Within 5 seconds (SC-004)

## References

- TypeScript Handbook: Project References - https://www.typescriptlang.org/docs/handbook/project-references.html
- TypeScript Compiler Options: outDir, declaration, composite - https://www.typescriptlang.org/tsconfig
- Vite Documentation: Building for Production - https://vitejs.dev/guide/build.html
- Vite Documentation: Module Resolution - https://vitejs.dev/guide/features.html#module-resolution
- Nx Documentation: TypeScript Configuration - https://nx.dev/recipes/tips-n-tricks/typescript
- Previous fix attempt: commit 3898deb ("fix(config): restore noEmit flag") - failed due to project reference conflict
