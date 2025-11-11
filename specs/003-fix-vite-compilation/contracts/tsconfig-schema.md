# TypeScript Configuration Contract

**Feature**: Fix Vite/TypeScript In-Place Compilation Issue
**Date**: 2025-11-11
**Purpose**: Define expected tsconfig.json structure and validation rules

## Dev Configuration Contract (apps/web/tsconfig.json)

### Purpose
Type checking only during development. No file emission. Fast IDE feedback.

### Required Structure

```json
{
  "extends": "../../tsconfig.app.json",
  "compilerOptions": {
    "baseUrl": ".",
    "noEmit": true,  // REQUIRED: Must be true
    "moduleResolution": "bundler",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src"],
  "references": [
    { "path": "../../packages/client" },
    { "path": "../../packages/utils" },
    // ... other package references
  ]
}
```

### Validation Rules

| Rule | Requirement | Violation Impact |
|------|-------------|------------------|
| noEmit MUST be true | `compilerOptions.noEmit === true` | In-place .js files created in src/ |
| extends MUST reference base | `extends` field present and valid path | Missing shared configuration |
| include MUST contain src | `include` array contains "src" | Source files not type-checked |
| baseUrl MUST be "." | `compilerOptions.baseUrl === "."` | Path resolution broken |

### Usage Context

**Commands**:
- `tsc --noEmit` - Type check without emit
- `pnpm typecheck` - Runs tsc with this config
- IDE (VSCode) - Uses this config for intellisense

**Expected Behavior**:
- Fast type checking (no codegen overhead)
- Zero .js files created
- Errors shown in IDE immediately
- All source files in src/ type-checked

---

## Build Configuration Contract (apps/web/tsconfig.build.json)

### Purpose
Production compilation with declaration files for project references. Emits to dist/.

### Required Structure

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "noEmit": false,              // REQUIRED: Override dev config
    "composite": true,            // REQUIRED: For project references
    "declaration": true,          // REQUIRED: For project references
    "declarationMap": true,       // RECOMMENDED: For debugging
    "outDir": "./dist",           // REQUIRED: Output directory
    "rootDir": "./src",           // REQUIRED: Source root
    "sourceMap": true,            // RECOMMENDED: For debugging
    "incremental": true,          // RECOMMENDED: Build performance
    "tsBuildInfoFile": "./dist/.tsbuildinfo"
  }
}
```

### Validation Rules

| Rule | Requirement | Violation Impact |
|------|-------------|------------------|
| noEmit MUST be false | `compilerOptions.noEmit === false` or omitted | No files built |
| composite MUST be true | `compilerOptions.composite === true` | Project references broken |
| declaration MUST be true | `compilerOptions.declaration === true` | .d.ts files missing, tools package fails |
| outDir MUST be "./dist" | `compilerOptions.outDir === "./dist"` | Artifacts in wrong location |
| rootDir MUST be "./src" | `compilerOptions.rootDir === "./src"` | Path mapping broken |
| extends MUST reference dev config | `extends === "./tsconfig.json"` | Configuration duplication |

### Usage Context

**Commands**:
- `tsc -p tsconfig.build.json` - Build with declarations
- `pnpm build` - Runs tsc build then vite build
- CI/CD pipeline - Uses this for production builds

**Expected Behavior**:
- All .js files go to dist/
- All .d.ts files go to dist/
- Source maps generated
- Incremental builds cached in dist/.tsbuildinfo
- No files created in src/

---

## Project Reference Contract (tools/tsconfig.json)

### Purpose
Allow tools package to import types from apps/web package.

### Required Structure

```json
{
  "compilerOptions": {
    "composite": true
  },
  "references": [
    { "path": "../apps/web" }
  ]
}
```

### Validation Rules

| Rule | Requirement | Violation Impact |
|------|-------------|------------------|
| references MUST include apps/web | `references` array contains path to apps/web | Type imports fail |
| composite MUST be true | `compilerOptions.composite === true` | References don't work |
| Referenced project MUST have composite | apps/web/tsconfig.build.json has composite: true | Reference resolution fails |

### Usage Context

**Commands**:
- `tsc --build` - Build with project references
- `pnpm typecheck` - Type check with references

**Expected Behavior**:
- Tools can import types from apps/web
- TypeScript finds declarations in apps/web/dist/
- Changes to apps/web trigger tools rebuild

---

## Base Configuration Contract (tsconfig.app.json)

### Purpose
Shared configuration inherited by all app packages.

### Required Structure

```json
{
  "extends": "./tsconfig.base.json",
  "compilerOptions": {
    "tsBuildInfoFile": "./dist/.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    // Note: noEmit NOT set here (let apps decide)
  }
}
```

### Validation Rules

| Rule | Requirement | Violation Impact |
|------|-------------|------------------|
| noEmit MUST NOT be set | `compilerOptions.noEmit` is undefined | Allows per-app override |
| strict MUST be true | `compilerOptions.strict === true` | Constitution violation (Type Safety) |
| moduleResolution MUST be bundler | `compilerOptions.moduleResolution === "bundler"` | Path resolution broken with Vite |

---

## Verification Commands

### Check Dev Config Has noEmit

```bash
jq '.compilerOptions.noEmit' apps/web/tsconfig.json
# Expected output: true
```

### Check Build Config Allows Emit

```bash
jq '.compilerOptions.noEmit' apps/web/tsconfig.build.json
# Expected output: false or null
```

### Check Build Config Has outDir

```bash
jq '.compilerOptions.outDir' apps/web/tsconfig.build.json
# Expected output: "./dist"
```

### Check Composite Mode Enabled

```bash
jq '.compilerOptions.composite' apps/web/tsconfig.build.json
# Expected output: true
```

### Verify No In-Place Artifacts

```bash
find apps/web/src -name "*.js" -o -name "*.d.ts" | wc -l
# Expected output: 0
```

### Verify Dist Artifacts Exist After Build

```bash
ls apps/web/dist/*.js apps/web/dist/*.d.ts 2>/dev/null | wc -l
# Expected output: > 0 (after build)
```

---

## Error Scenarios

### Error 1: Project May Not Disable Emit

**Symptom**:
```
tsconfig.json(38,5): error TS6310: Referenced project '/path/to/apps/web' may not disable emit.
```

**Cause**: apps/web/tsconfig.json has `noEmit: true` but tools package references it

**Fix**: Create separate tsconfig.build.json with `noEmit: false` and update project references to point to it

---

### Error 2: Declaration File Not Found

**Symptom**:
```
error TS2688: Cannot find type definition file for '@academic-explorer/web'.
```

**Cause**: apps/web/dist/ doesn't contain .d.ts files

**Fix**:
1. Ensure tsconfig.build.json has `declaration: true`
2. Run `cd apps/web && tsc -p tsconfig.build.json`
3. Verify `apps/web/dist/*.d.ts` files exist

---

### Error 3: In-Place Compilation Detected

**Symptom**: `.js` files appear in `apps/web/src/` after type checking

**Cause**: tsconfig.json missing `noEmit: true`

**Fix**:
1. Add `"noEmit": true` to apps/web/tsconfig.json
2. Delete existing .js files: `git clean -fdX apps/web/src/`
3. Verify no files created: `tsc --noEmit && find apps/web/src -name "*.js"`

---

## Success Criteria Validation

| Success Criterion | Validation Command | Expected Result |
|-------------------|-------------------|-----------------|
| SC-003: Build completes with 0 errors | `pnpm build 2>&1 \| grep -i error` | Empty output |
| SC-005: Zero .js files in src/ | `find apps/web/src -name "*.js" \| wc -l` | 0 |
| SC-006: Git shows no untracked artifacts | `git status --porcelain \| grep "src/.*\.js"` | Empty output |

---

## Contract Compliance Checklist

- [ ] apps/web/tsconfig.json exists with noEmit: true
- [ ] apps/web/tsconfig.build.json exists with noEmit: false, outDir: dist
- [ ] tsconfig.build.json has composite: true and declaration: true
- [ ] tools/tsconfig.json references apps/web
- [ ] No .js files in apps/web/src/ directory
- [ ] Build produces .js and .d.ts files in apps/web/dist/
- [ ] `pnpm typecheck` runs without emit
- [ ] `pnpm build` produces artifacts in dist/
- [ ] tools package can import types from apps/web after build
