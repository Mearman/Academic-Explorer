# Quickstart Guide: Fix Vite/TypeScript In-Place Compilation

**Feature**: 003-fix-vite-compilation
**Date**: 2025-11-11
**Time to Complete**: 30-45 minutes

## Overview

This guide walks through fixing the TypeScript/Vite in-place compilation issue that causes E2E tests to see stale code. You'll configure TypeScript to emit files only to dist/, not in-place in src/.

## Prerequisites

- Git repository at branch `003-fix-vite-compilation`
- Node.js 18+ and pnpm 8+ installed
- Terminal access
- Text editor (VSCode recommended)

## Quick Start (TL;DR)

```bash
# 1. Update .gitignore
cat >> .gitignore << 'EOF'

# TypeScript in-place artifacts (should never exist)
apps/web/src/**/*.js
apps/web/src/**/*.js.map
apps/web/src/**/*.d.ts
!apps/web/src/**/*.test.js
!apps/web/src/**/*.config.js
EOF

# 2. Clean existing artifacts
git clean -fdX apps/web/src/

# 3. Create build config
cp apps/web/tsconfig.json apps/web/tsconfig.build.json
# Edit tsconfig.build.json - see Step 3 below

# 4. Update dev config
# Edit apps/web/tsconfig.json - ensure noEmit: true

# 5. Update package.json build script
# Change "build": "vite build"
# To: "build": "tsc -p tsconfig.build.json && vite build"

# 6. Test
pnpm typecheck  # Should complete with no .js files created
pnpm build      # Should emit to dist/ only
pnpm test:e2e   # Should see latest code changes
```

---

## Step-by-Step Instructions

### Step 1: Verify Current State (Problem Identification)

First, confirm the problem exists:

```bash
cd /Users/joe/Documents/Research/PhD/Academic\ Explorer

# Check for in-place artifacts
find apps/web/src -name "*.js" -o -name "*.d.ts" | head -10
```

**Expected Output**: List of .js and .d.ts files in src/ (PROBLEM)

```bash
# Check git untracked files
git status --porcelain | grep "??" | grep "src/" | head -10
```

**Expected Output**: Untracked .js files in src/ (PROBLEM)

**If no files found**: Great! The issue may already be fixed. Skip to Step 6 (Verification).

---

### Step 2: Update .gitignore

Prevent future commits of in-place artifacts:

```bash
# Backup current .gitignore
cp .gitignore .gitignore.backup

# Add patterns for in-place artifacts
cat >> .gitignore << 'EOF'

# TypeScript in-place compilation artifacts (PROBLEM - should never exist)
# These files should only exist in dist/, never in src/
apps/web/src/**/*.js
apps/web/src/**/*.js.map
apps/web/src/**/*.d.ts
apps/web/src/**/*.d.ts.map

# Exception: Allow legitimate .js files
!apps/web/src/**/*.test.js
!apps/web/src/**/*.config.js
!apps/web/src/build-plugins/**/*.js
EOF

# Verify patterns work
git check-ignore apps/web/src/components/Button.js
# Expected: apps/web/src/components/Button.js (pattern matched)

git check-ignore apps/web/src/components/Button.test.js
# Expected: (no output - exception pattern working)
```

**Commit**:
```bash
git add .gitignore
git commit -m "chore(config): ignore TypeScript in-place compilation artifacts

Add .gitignore patterns to prevent committing .js, .js.map, and .d.ts
files in src/ directories. These artifacts should only exist in dist/.

Exceptions added for legitimate .js files (*.test.js, *.config.js)."
```

---

### Step 3: Create Build Configuration

Create separate tsconfig for building (with emit enabled):

```bash
cd apps/web

# Create tsconfig.build.json from template
cat > tsconfig.build.json << 'EOF'
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,
    "composite": true,
    "declaration": true,
    "declarationMap": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "sourceMap": true,
    "incremental": true,
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  },
  "exclude": [
    "src/**/*.test.ts",
    "src/**/*.test.tsx",
    "src/**/*.spec.ts",
    "src/**/*.spec.tsx",
    "src/test/**/*"
  ]
}
EOF
```

**Key Points**:
- `extends: "./tsconfig.json"` - Inherits from dev config
- `noEmit: false` - Overrides dev config, allows emit
- `composite: true` - Enables project references
- `declaration: true` - Generates .d.ts for tools package
- `outDir: "./dist"` - **CRITICAL**: All artifacts go here
- `rootDir: "./src"` - Source root for path mapping

---

### Step 4: Update Dev Configuration

Ensure dev config prevents emission:

```bash
# Check current noEmit setting
jq '.compilerOptions.noEmit' tsconfig.json

# If not true, update it
```

Edit `apps/web/tsconfig.json` to ensure:

```json
{
  "extends": "../../tsconfig.app.json",
  "compilerOptions": {
    "baseUrl": ".",
    "noEmit": true,  // ← ENSURE THIS IS true
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [
    { "path": "../../packages/client" },
    { "path": "../../packages/utils" },
    // ... other references
  ]
}
```

**Verification**:
```bash
jq '.compilerOptions.noEmit' tsconfig.json
# Expected: true
```

---

### Step 5: Update Package.json Build Script

Update the build script to use the new build config:

```bash
cd apps/web

# Backup package.json
cp package.json package.json.backup

# View current build script
jq '.scripts.build' package.json
# Current: "vite build" or similar
```

Edit `apps/web/package.json`:

```json
{
  "scripts": {
    "build": "tsc -p tsconfig.build.json && vite build",
    "typecheck": "tsc --noEmit",
    // ... other scripts
  }
}
```

**Key Changes**:
- `build`: Now runs TypeScript compilation THEN Vite build
- `typecheck`: Uses default tsconfig.json (with noEmit: true)

---

### Step 6: Clean Existing Artifacts

Remove all in-place .js files from src/:

```bash
cd /Users/joe/Documents/Research/PhD/Academic\ Explorer

# Preview what will be deleted (DRY RUN)
git clean -fdxn apps/web/src/ | grep -E "\.(js|d\.ts|js\.map)"

# Review the list - should only show compiled artifacts, no source files

# Actually delete (REMOVES FILES)
git clean -fdX apps/web/src/

# Verify removal
find apps/web/src -name "*.js" -o -name "*.d.ts" | wc -l
# Expected: 0
```

**⚠️ WARNING**: `git clean -fdX` deletes files. Review dry run output first.

---

### Step 7: Test Type Checking (No Emit)

Verify dev config doesn't create files:

```bash
cd apps/web

# Remove dist/ to start fresh
rm -rf dist/

# Run type checking
pnpm typecheck

# Verify no .js files created in src/
find src -name "*.js" | wc -l
# Expected: 0

# Verify dist/ is still empty (or doesn't exist)
ls dist/ 2>/dev/null
# Expected: "No such file or directory" or empty

# Verify typecheck passed
echo $?
# Expected: 0 (success)
```

**If typecheck fails**: Fix any TypeScript errors before proceeding.

---

### Step 8: Test Build (With Emit to dist/)

Verify build config emits to dist/ only:

```bash
cd apps/web

# Clean dist/
rm -rf dist/

# Run build
pnpm build

# Verify dist/ contains artifacts
ls dist/*.js | head -5
# Expected: List of .js files

ls dist/*.d.ts | head -5
# Expected: List of .d.ts files

ls dist/.tsbuildinfo
# Expected: dist/.tsbuildinfo

# Verify src/ is still clean
find src -name "*.js" | wc -l
# Expected: 0

# Check file counts match
SRC_COUNT=$(find src -name "*.ts" -o -name "*.tsx" | wc -l)
DIST_COUNT=$(find dist -name "*.js" | wc -l)
echo "Source files: $SRC_COUNT"
echo "Built files: $DIST_COUNT"
# Should be roughly equal (some files may not compile to .js)
```

---

### Step 9: Verify Project References Work

Check that tools package can still reference apps/web:

```bash
cd ../../tools

# Run typecheck
pnpm typecheck

# Should complete without errors
echo $?
# Expected: 0
```

**If fails with "declaration file not found"**:
```bash
# Rebuild apps/web
cd ../apps/web
pnpm build

# Try tools again
cd ../../tools
pnpm typecheck
```

---

### Step 10: Test E2E With Fresh Code

Verify E2E tests see latest code changes:

```bash
cd /Users/joe/Documents/Research/PhD/Academic\ Explorer

# Make a visible change to a component
echo "// Test change $(date)" >> apps/web/src/components/catalogue/AddToListModal.tsx

# Run E2E tests
cd apps/web
pnpm test:e2e catalogue-entity-management.e2e.test.ts -g "should add entities"

# Check test output for evidence of fresh compilation
# Vite should show "optimized dependencies changed"
# Test should reflect the code change (or at least not use stale code)
```

**Success Indicators**:
- Vite dev server starts without errors
- Tests execute without timing out
- No error about "cannot find module"
- Tests that were failing due to stale code now pass

**Revert test change**:
```bash
git checkout apps/web/src/components/catalogue/AddToListModal.tsx
```

---

### Step 11: Commit Configuration Changes

```bash
cd /Users/joe/Documents/Research/PhD/Academic\ Explorer

# Stage all configuration changes
git add apps/web/tsconfig.json
git add apps/web/tsconfig.build.json
git add apps/web/package.json

# Commit
git commit -m "$(cat <<'EOF'
fix(config): separate TypeScript dev and build configurations

Create tsconfig.build.json for production builds with declaration emit
to dist/. Keep tsconfig.json for dev with noEmit to prevent in-place
compilation.

Changes:
- tsconfig.json: Ensure noEmit: true for dev type checking
- tsconfig.build.json: New file with outDir: dist, composite: true
- package.json: Update build script to use tsconfig.build.json

This fixes E2E tests seeing stale code by preventing TypeScript from
emitting .js files in src/. Vite dev server now compiles .tsx files
on-the-fly, always serving fresh code.

Fixes: 27 failing E2E tests blocked by stale code issue
Related: Feature 003-fix-vite-compilation
EOF
)"
```

---

## Verification Checklist

After completing all steps, verify the fix works:

- [ ] `find apps/web/src -name "*.js" | wc -l` returns 0
- [ ] `git status` shows no untracked .js files in src/
- [ ] `pnpm typecheck` completes without creating files
- [ ] `pnpm build` creates files in dist/ only
- [ ] `ls apps/web/dist/*.js` shows compiled JavaScript
- [ ] `ls apps/web/dist/*.d.ts` shows type declarations
- [ ] `cd tools && pnpm typecheck` succeeds (project references work)
- [ ] `pnpm test:e2e` sees fresh code changes
- [ ] `jq '.compilerOptions.noEmit' apps/web/tsconfig.json` returns true
- [ ] `jq '.compilerOptions.outDir' apps/web/tsconfig.build.json` returns "./dist"

---

## Troubleshooting

### Issue 1: TypeScript Emit Errors During Build

**Symptom**:
```
error TS6310: Referenced project '/path/to/apps/web' may not disable emit.
```

**Cause**: tsconfig.build.json has `noEmit: true`

**Fix**:
```bash
jq '.compilerOptions.noEmit = false' apps/web/tsconfig.build.json > tmp.json
mv tmp.json apps/web/tsconfig.build.json
```

---

### Issue 2: .js Files Still Appearing in src/

**Symptom**: After running `pnpm typecheck`, .js files appear in src/

**Diagnosis**:
```bash
jq '.compilerOptions.noEmit' apps/web/tsconfig.json
# If not true, that's the problem
```

**Fix**:
```bash
# Edit tsconfig.json to add noEmit: true
jq '.compilerOptions.noEmit = true' apps/web/tsconfig.json > tmp.json
mv tmp.json apps/web/tsconfig.json

# Clean artifacts
git clean -fdX apps/web/src/
```

---

### Issue 3: Tools Package Typecheck Fails

**Symptom**:
```
error TS2688: Cannot find type definition file for '@academic-explorer/web'.
```

**Cause**: apps/web/dist/ doesn't have .d.ts files

**Fix**:
```bash
cd apps/web
rm -rf dist/
pnpm build  # This runs tsc -p tsconfig.build.json

# Verify declarations exist
ls dist/*.d.ts | head -5

# Try tools again
cd ../../tools
pnpm typecheck
```

---

### Issue 4: Vite Serves Stale Code

**Symptom**: Code changes don't appear in running dev server

**Diagnosis**:
```bash
# Check for stale .js files
find apps/web/src -name "*.js"
```

**Fix**:
```bash
# Clear Vite cache
rm -rf apps/web/node_modules/.vite

# Clear in-place artifacts
git clean -fdX apps/web/src/

# Restart dev server
cd apps/web
pnpm dev
```

---

### Issue 5: Build Takes Too Long

**Symptom**: `pnpm build` takes >30 seconds

**Diagnosis**: TypeScript compilation running in full mode

**Fix**: Enable incremental builds (should already be in tsconfig.build.json)

```bash
jq '.compilerOptions.incremental' apps/web/tsconfig.build.json
# Should be: true

jq '.compilerOptions.tsBuildInfoFile' apps/web/tsconfig.build.json
# Should be: "./dist/.tsbuildinfo"
```

Subsequent builds should be faster (~5-10 seconds).

---

## Performance Benchmarks

### Before Fix

- Typecheck: ~3 seconds
- Build: ~8 seconds
- E2E test startup: ~5 seconds
- **Problem**: Tests see stale code, 27 tests failing

### After Fix (Expected)

- Typecheck: ~2-3 seconds (slightly faster, no emit)
- Build: ~9-10 seconds (slightly slower, explicit tsc step)
- E2E test startup: ~5 seconds (no change)
- **Fixed**: Tests see fresh code, 0 tests failing due to stale code

**Within Acceptable Limits**:
- Build time increase: ~1-2 seconds (~12% slower) ✅ Within SC-001 (10% threshold)
- Vite dev server: Still <2 seconds ✅ Meets SC-007
- Code change reflection: <5 seconds ✅ Meets SC-004

---

## Next Steps

1. **Run Full Test Suite**: `pnpm test:e2e` to verify all 232 tests
2. **Document Configuration**: Add comments to tsconfig files explaining the setup
3. **Update Team Docs**: Inform team about two-config pattern (dev vs build)
4. **CI/CD Validation**: Add check to CI pipeline to prevent in-place artifacts
5. **Monitor Performance**: Track build times to ensure no regression

---

## Success Criteria Validation

| ID | Criterion | Validation Command | Expected Result |
|----|-----------|-------------------|-----------------|
| SC-001 | E2E time within 10% | `time pnpm test:e2e` | ~2 minutes (baseline) |
| SC-002 | 100% tests see fresh code | Make change, run test, verify | Test reflects change |
| SC-003 | Build completes with 0 errors | `pnpm build 2>&1 \| grep -i error` | Empty output |
| SC-004 | Changes reflected in <5s | Time from code edit to test start | <5 seconds |
| SC-005 | Zero .js files in src/ | `find apps/web/src -name "*.js" \| wc -l` | 0 |
| SC-006 | Git clean status | `git status --porcelain \| grep "src/.*\.js"` | Empty |
| SC-007 | Vite starts in <2s | `time pnpm dev` (until "ready") | <2 seconds |

---

## Resources

- **Spec**: [spec.md](./spec.md)
- **Research**: [research.md](./research.md)
- **Data Model**: [data-model.md](./data-model.md)
- **Contracts**: [contracts/tsconfig-schema.md](./contracts/tsconfig-schema.md)
- **File Patterns**: [contracts/file-patterns.md](./contracts/file-patterns.md)
- **TypeScript Docs**: https://www.typescriptlang.org/docs/handbook/project-references.html
- **Vite Docs**: https://vitejs.dev/guide/build.html

---

## Questions?

If you encounter issues not covered in this guide:

1. Check the troubleshooting section above
2. Review the contracts/ directory for detailed validation rules
3. Check the data-model.md for configuration structure reference
4. Review research.md for the rationale behind decisions

**Common Pitfalls**:
- Forgetting to clean stale artifacts (Step 6)
- Not updating package.json build script (Step 5)
- Using wrong tsconfig for typecheck vs build
- Not committing configuration changes (Step 11)
