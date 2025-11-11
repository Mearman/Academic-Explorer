# File System Patterns Contract

**Feature**: Fix Vite/TypeScript In-Place Compilation Issue
**Date**: 2025-11-11
**Purpose**: Define expected file system state before and after fix

## Current State (PROBLEM)

### Directory Structure

```
apps/web/
├── src/
│   ├── components/
│   │   ├── catalogue/
│   │   │   ├── AddToListModal.tsx        [SOURCE]
│   │   │   ├── AddToListModal.js         [❌ IN-PLACE ARTIFACT]
│   │   │   ├── AddToListModal.js.map     [❌ IN-PLACE ARTIFACT]
│   │   │   ├── AddToListModal.d.ts       [❌ IN-PLACE ARTIFACT]
│   │   │   └── AddToListModal.d.ts.map   [❌ IN-PLACE ARTIFACT]
│   └── lib/
│       └── utils/
│           ├── static-data-index-generator.ts     [SOURCE]
│           ├── static-data-index-generator.js     [❌ IN-PLACE ARTIFACT]
│           ├── static-data-index-generator.js.map [❌ IN-PLACE ARTIFACT]
│           ├── static-data-index-generator.d.ts   [❌ IN-PLACE ARTIFACT]
│           └── static-data-index-generator.d.ts.map [❌ IN-PLACE ARTIFACT]
├── dist/
│   └── [empty or outdated]
└── node_modules/
    └── .vite/
        └── [cached artifacts]
```

### Problem Indicators

1. **In-Place Artifacts**: .js files exist alongside .tsx source files in src/
2. **Git Untracked Files**: `git status` shows dozens of .js files in src/
3. **Stale Code in Tests**: Vite serves cached .js files instead of compiling fresh .tsx
4. **Module Resolution Confusion**: Node/Vite may resolve .js instead of .ts files

---

## Target State (FIXED)

### Directory Structure

```
apps/web/
├── src/
│   ├── components/
│   │   ├── catalogue/
│   │   │   └── AddToListModal.tsx        [✅ SOURCE ONLY]
│   └── lib/
│       └── utils/
│           └── static-data-index-generator.ts  [✅ SOURCE ONLY]
├── dist/
│   ├── components/
│   │   └── catalogue/
│   │       ├── AddToListModal.js         [✅ BUILD ARTIFACT]
│   │       ├── AddToListModal.js.map
│   │       ├── AddToListModal.d.ts
│   │       └── AddToListModal.d.ts.map
│   ├── lib/
│   │   └── utils/
│   │       ├── static-data-index-generator.js
│   │       ├── static-data-index-generator.d.ts
│   │       └── static-data-index-generator.d.ts.map
│   └── .tsbuildinfo
├── node_modules/
│   └── .vite/
│       └── deps/
│           └── [optimized dependencies]
├── tsconfig.json                          [✅ noEmit: true]
└── tsconfig.build.json                    [✅ outDir: dist]
```

### Success Indicators

1. **Clean Source Tree**: Only .ts/.tsx files in src/, no .js files
2. **Organized Build Output**: All artifacts in dist/, mirrors src/ structure
3. **Git Clean Status**: No untracked .js files when running `git status`
4. **Fresh Code in Tests**: Vite compiles .tsx on-the-fly, tests see latest changes

---

## File Pattern Rules

### Allowed Patterns

| Pattern | Location | Example | Purpose |
|---------|----------|---------|---------|
| `**/*.ts` | `apps/web/src/` | `logger.ts` | TypeScript source |
| `**/*.tsx` | `apps/web/src/` | `Button.tsx` | React component source |
| `**/*.js` | `apps/web/dist/` | `logger.js` | Compiled JavaScript |
| `**/*.d.ts` | `apps/web/dist/` | `logger.d.ts` | Type declarations |
| `**/*.js.map` | `apps/web/dist/` | `logger.js.map` | Source maps |
| `**/*.d.ts.map` | `apps/web/dist/` | `logger.d.ts.map` | Declaration maps |
| `.tsbuildinfo` | `apps/web/dist/` | `.tsbuildinfo` | Incremental build cache |
| `**/*` | `node_modules/.vite/` | (any) | Vite dev cache |

### Forbidden Patterns

| Pattern | Location | Example | Why Forbidden |
|---------|----------|---------|---------------|
| `**/*.js` | `apps/web/src/` | `src/components/Button.js` | In-place compilation artifact |
| `**/*.d.ts` | `apps/web/src/` | `src/lib/utils.d.ts` | In-place declaration artifact |
| `**/*.js.map` | `apps/web/src/` | `src/hooks/useState.js.map` | In-place source map |
| `**/*.d.ts.map` | `apps/web/src/` | `src/types/index.d.ts.map` | In-place declaration map |

**Exceptions**:
- `**/*.test.js` - Test files (if using .js for tests)
- `**/*.config.js` - Configuration files (e.g., Vite plugins)
- `**/build-plugins/**/*.js` - Build tool scripts

---

## Verification Commands

### Check for Forbidden Patterns

```bash
# Find in-place JavaScript artifacts
find apps/web/src -type f -name "*.js" ! -name "*.test.js" ! -name "*.config.js"
# Expected: No output

# Find in-place TypeScript declarations
find apps/web/src -type f -name "*.d.ts"
# Expected: No output

# Find in-place source maps
find apps/web/src -type f \( -name "*.js.map" -o -name "*.d.ts.map" \)
# Expected: No output
```

### Check for Required Patterns

```bash
# Verify dist/ contains compiled artifacts (after build)
ls apps/web/dist/*.js apps/web/dist/*.d.ts 2>/dev/null
# Expected: List of files

# Verify dist/ contains build info
ls apps/web/dist/.tsbuildinfo 2>/dev/null
# Expected: dist/.tsbuildinfo

# Count source files
find apps/web/src -type f \( -name "*.ts" -o -name "*.tsx" \) | wc -l
# Expected: > 0
```

### Check Git Status

```bash
# Check for untracked compiled artifacts
git status --porcelain | grep "??" | grep -E "src/.*\.(js|d\.ts|js\.map)"
# Expected: No output

# Check for modified config files
git status --porcelain | grep -E "tsconfig"
# Expected: Modified tsconfig files (during fix implementation)
```

---

## .gitignore Patterns

### Required Entries

```gitignore
# TypeScript compiled artifacts in src/ directories
apps/web/src/**/*.js
apps/web/src/**/*.js.map
apps/web/src/**/*.d.ts
apps/web/src/**/*.d.ts.map

# Exception: Allow test and config files
!apps/web/src/**/*.test.js
!apps/web/src/**/*.config.js
!apps/web/src/build-plugins/**/*.js

# Build outputs (already ignored, but ensure present)
apps/web/dist/
apps/web/node_modules/

# Vite cache
apps/web/node_modules/.vite/

# TypeScript build info
**/.tsbuildinfo
```

### Validation

```bash
# Test gitignore patterns
git check-ignore apps/web/src/components/Button.js
# Expected: apps/web/src/components/Button.js (matched)

git check-ignore apps/web/src/components/Button.test.js
# Expected: (no output - not ignored, allowed)

git check-ignore apps/web/dist/index.js
# Expected: apps/web/dist/index.js (matched)
```

---

## State Transition Verification

### Before Fix

```bash
# Count in-place artifacts
find apps/web/src -name "*.js" -o -name "*.d.ts" | wc -l
# Current: 50+ files

# Check git untracked
git status --porcelain | grep "??" | wc -l
# Current: 50+ untracked files in src/

# Check dist/ is empty or outdated
ls apps/web/dist/ 2>/dev/null
# Current: Empty or old files
```

### During Fix (Cleanup Phase)

```bash
# Remove in-place artifacts
git clean -fdX apps/web/src/

# Verify removal
find apps/web/src -name "*.js" | wc -l
# Expected: 0

# Git status should be cleaner
git status --porcelain | grep "src/.*\.js"
# Expected: No output
```

### After Fix (Build Phase)

```bash
# Build with new config
cd apps/web
tsc -p tsconfig.build.json

# Verify dist/ populated
find dist -name "*.js" | wc -l
# Expected: > 0 (same count as .ts files)

find dist -name "*.d.ts" | wc -l
# Expected: > 0 (same count as .ts files)

# Verify src/ still clean
find src -name "*.js" | wc -l
# Expected: 0
```

### After Fix (Test Phase)

```bash
# Start Vite dev server
pnpm dev &
VITE_PID=$!

# Wait for startup
sleep 3

# Make visible change to component
echo "// test change" >> apps/web/src/components/test.tsx

# Run E2E test
pnpm test:e2e test-file.ts

# Verify test sees change (in test output)
# Expected: Test reflects new code

# Cleanup
kill $VITE_PID
```

---

## Directory Size Expectations

### Before Fix

```
apps/web/src/: ~100MB (bloated with .js artifacts)
apps/web/dist/: ~0-50MB (empty or outdated)
```

### After Fix

```
apps/web/src/: ~20MB (only source .ts/.tsx files)
apps/web/dist/: ~50MB (all .js artifacts here)
```

**Size Reduction**: ~80MB reduction in src/ directory size

---

## Module Resolution Priority

### Before Fix (PROBLEM)

When importing `./components/Button`:

1. Node/Vite checks `./components/Button.js` ← **FOUND (in-place artifact, STALE)**
2. Serves stale .js file
3. Newer changes in Button.tsx IGNORED

### After Fix (CORRECT)

When importing `./components/Button`:

1. Node/Vite checks `./components/Button.js` ← NOT FOUND (no in-place artifacts)
2. Falls back to `./components/Button.tsx` ← **FOUND (source file)**
3. Vite compiles .tsx on-the-fly with esbuild
4. Serves fresh compilation

---

## Success Criteria Mapping

| Success Criterion | File Pattern Check | Command |
|-------------------|-------------------|---------|
| SC-005: Zero .js in src/ | No `apps/web/src/**/*.js` | `find apps/web/src -name "*.js" \| wc -l` |
| SC-006: Git clean status | No untracked src/*.js | `git status --porcelain \| grep "src/.*\.js"` |
| SC-002: Tests see latest code | No stale .js blocking resolution | Implicit - verified by test execution |

---

## Monitoring & Maintenance

### Pre-Commit Hook Check

```bash
#!/bin/bash
# .husky/pre-commit

# Check for in-place artifacts
FORBIDDEN=$(find apps/web/src -name "*.js" -o -name "*.d.ts" | grep -v test | grep -v config)

if [ -n "$FORBIDDEN" ]; then
  echo "❌ ERROR: Compiled artifacts found in src/:"
  echo "$FORBIDDEN"
  echo ""
  echo "Run: git clean -fdX apps/web/src/"
  exit 1
fi
```

### CI/CD Validation

```yaml
# .github/workflows/validate.yml
- name: Check for in-place artifacts
  run: |
    COUNT=$(find apps/web/src -name "*.js" -o -name "*.d.ts" | grep -v test | grep -v config | wc -l)
    if [ "$COUNT" -gt 0 ]; then
      echo "Found $COUNT in-place artifacts"
      exit 1
    fi
```

---

## Troubleshooting Guide

### Issue: .js files reappear in src/

**Diagnosis**:
```bash
# Check tsconfig noEmit setting
jq '.compilerOptions.noEmit' apps/web/tsconfig.json
# Should be: true
```

**Fix**: Ensure tsconfig.json has `noEmit: true`

### Issue: Build fails with "declaration file not found"

**Diagnosis**:
```bash
# Check if dist/ has .d.ts files
ls apps/web/dist/*.d.ts 2>/dev/null
```

**Fix**:
```bash
cd apps/web
tsc -p tsconfig.build.json
```

### Issue: Vite serves stale code

**Diagnosis**:
```bash
# Check for in-place .js files
find apps/web/src -name "*.js"
```

**Fix**:
```bash
# Clear artifacts and restart
git clean -fdX apps/web/src/
pnpm dev
```
