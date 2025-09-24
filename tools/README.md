# Tools Directory

Development and verification scripts for the Academic Explorer monorepo.

## Verification Scripts

### full-verify.ts
**Runs the complete quality pipeline: typecheck → build → test → lint**

```bash
# Standard verification (stops on first failure)
pnpm verify:full
./tools/scripts/full-verify.ts

# Verbose output (see all command output)
./tools/scripts/full-verify.ts --verbose

# Continue through all checks (don't stop on failure)
./tools/scripts/full-verify.ts --no-stop-on-failure

# Get help
./tools/scripts/full-verify.ts --help
```

**Exit Codes:**
- `0` - All checks passed
- `1` - One or more checks failed
- `2` - Script error

**Use Cases:**
- Pre-commit verification
- CI/CD quality gate
- Release readiness check
- After major refactoring

### quick-verify.ts
Fast lint/typecheck/test verification that stops on first failure.

```bash
pnpm verify:quick
./tools/scripts/quick-verify.ts
```

### verify-lint-fixes.ts
Detailed verification after automated lint fixes.

```bash
pnpm verify:lint-fixes
```

### verify-package.ts
Individual package verification with detailed reporting.

```bash
pnpm verify:package <package-name>
```

## Other Scripts

### check-licenses.ts
License compliance checking across all packages.

### create-coverage-summary.ts / generate-coverage-report.ts
Test coverage analysis and reporting.

### knip-nx.ts
Dead code detection with Nx integration.

### manage-coverage-comments.ts
Automated coverage reporting for pull requests.

## Usage Patterns

**Development Workflow:**
```bash
# Quick check during development
pnpm verify:quick

# Full verification before commit
pnpm verify:full

# Detailed analysis after fixes
pnpm verify:lint-fixes
```

**CI Pipeline:**
```bash
# Use full-verify as quality gate
./tools/scripts/full-verify.ts --verbose --no-stop-on-failure
```

**Package Development:**
```bash
# Focus on specific package
pnpm verify:package web
pnpm verify:package client
```