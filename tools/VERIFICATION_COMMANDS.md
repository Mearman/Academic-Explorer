# Lint Verification Commands - Quick Reference

## Overview
This document provides quick reference for all lint verification commands available in the Academic Explorer monorepo.

## Available Commands

### 1. Quick Verification
**Purpose**: Fast feedback during development

```bash
# Verify entire workspace (stops on first failure)
pnpm verify:quick

# Verify specific package
pnpm verify:quick web
pnpm verify:quick client
pnpm verify:quick ui
```

**What it does**:
- Runs essential checks only (lint, typecheck, tests)
- Stops on first failure for immediate feedback
- Optimized for speed (~1-2 minutes)

### 2. Package-Specific Verification
**Purpose**: Detailed analysis of individual packages

```bash
# Basic package verification
pnpm verify:package web

# With verbose output
pnpm verify:package web --verbose

# Skip build step
pnpm verify:package web --skip-build

# Allow some warnings
pnpm verify:package web --max-warnings 10

# Combined options
pnpm verify:package web --verbose --skip-build --max-warnings 5
```

**What it does**:
- Runs lint, typecheck, and build for specific package
- Shows detailed error categorization
- Groups issues by rule type
- Provides specific file and line references

### 3. Complete Verification
**Purpose**: Full monorepo verification and reporting

```bash
# Run complete verification strategy
pnpm verify:lint-fixes
```

**What it does**:
- Discovers all packages automatically
- Runs verification on every package
- Generates detailed summary report
- Provides package-by-package breakdown
- Includes smoke testing

## Command Options

### verify:package Options
| Option | Description | Example |
|--------|-------------|---------|
| `--verbose` | Show detailed error output | `--verbose` |
| `--skip-build` | Skip build verification step | `--skip-build` |
| `--max-warnings <n>` | Set warning threshold | `--max-warnings 10` |

### Package Names
Available packages to verify:
- `web` - Main React application
- `cli` - Command-line interface
- `client` - OpenAlex client package
- `graph` - Graph utilities
- `simulation` - Force simulation package
- `ui` - UI components library
- `utils` - Shared utilities
- `tools` - Development tools

## Typical Workflows

### Development Workflow
```bash
# 1. Quick check before starting work
pnpm verify:quick

# 2. Work on specific package
pnpm verify:package web --max-warnings 10

# 3. Final check before commit
pnpm verify:quick
```

### Debugging Workflow
```bash
# 1. Get detailed output for failing package
pnpm verify:package web --verbose

# 2. Focus on lint issues only
pnpm verify:package web --skip-build --verbose

# 3. Allow warnings while fixing errors
pnpm verify:package web --max-warnings 50
```

### CI/CD Workflow
```bash
# 1. Quick validation
pnpm verify:quick

# 2. Complete verification
pnpm verify:lint-fixes
```

## Understanding Output

### Exit Codes
- `0` - All verification passed
- `1` - Verification failed (has errors)

### Status Indicators
- Check passed
- Check failed
- Warnings present
- Step skipped
- Stopped early

### Error Categories

#### Critical Errors (Must Fix)
- Parser errors
- TypeScript compilation errors
- ESLint errors (red text)

#### Warnings (Should Fix)
- ESLint warnings (yellow text)
- Deprecated usage
- Code quality issues

### Sample Output Interpretation
```bash
VERIFYING PACKAGE: web
==================================================
Found package: web at /path/to/apps/web

Running ESLint...
ESLint found issues:
Summary: 25 errors, 150 warnings

Running TypeScript compilation...
TypeScript compilation failed: 5 errors

Skipping build due to previous failures

VERIFICATION SUMMARY
--------------------------------
Package: web
Lint:    FAILED
Types:   FAILED
Build:   FAILED
Overall: FAILED
```

## Troubleshooting

### Common Issues

#### "Package not found"
- Check package name spelling
- Verify package exists in `apps/` or `packages/`
- Run `nx show projects` to see available packages

#### "Command not found"
- Run `pnpm install` to ensure all dependencies are installed
- Verify you're in the project root directory

#### "Permission denied"
- Scripts should be executable: `chmod +x tools/scripts/*.ts`
- Use `pnpm` commands instead of direct script execution

#### "Out of memory"
- Use `--skip-build` flag for large packages
- Run verification on individual packages instead of all at once
- Increase Node.js memory: `NODE_OPTIONS="--max-old-space-size=8192"`

## Integration Examples

### Pre-commit Hook
```bash
#!/bin/sh
pnpm verify:quick || exit 1
```

### GitHub Actions
```yaml
- name: Verify lint fixes
  run: |
    pnpm install
    pnpm verify:lint-fixes
```

### VS Code Tasks
```json
{
  "label": "Verify Package",
  "type": "shell",
  "command": "pnpm verify:package ${input:packageName}",
  "group": "test"
}
```

## Performance Notes

### Speed Comparison
- `verify:quick`: ~30-90 seconds (stops on first failure)
- `verify:package`: ~60-180 seconds (single package)
- `verify:lint-fixes`: ~10-30 minutes (all packages)

### Optimization Tips
- Use `--skip-build` during active development
- Use `--max-warnings` to focus on errors first
- Run `verify:quick` for immediate feedback
- Use package-specific verification for targeted fixes

---

*Last updated: 2025-09-24*
*For detailed technical information, see: `LINT_VERIFICATION_REPORT.md`*