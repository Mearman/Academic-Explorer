# Graph Package Test Coverage

This document describes the comprehensive test coverage setup for the `@academic-explorer/graph` package.

## Overview

The graph package implements a robust test coverage system with:
- **90%+ coverage thresholds** for all metrics (statements, branches, functions, lines)
- **95% thresholds for critical Phase 2 components** (providers, services)
- **Multiple report formats** (HTML, JSON, LCOV, Cobertura, JUnit)
- **CI/CD integration** with automated notifications
- **Coverage badges** and visual reporting
- **Performance optimization** with caching

## Quick Start

```bash
# Run tests with coverage
pnpm test:coverage

# Generate full coverage report with badges
pnpm coverage:full

# Open HTML coverage report
pnpm coverage:open

# Run complete test pipeline
pnpm test:full
```

## Coverage Commands

### Core Testing
- `pnpm test` - Run tests without coverage
- `pnpm test:watch` - Run tests in watch mode
- `pnpm test:coverage` - Run tests with coverage
- `pnpm test:coverage:watch` - Watch mode with coverage

### Report Generation
- `pnpm test:coverage:html` - Generate HTML report
- `pnpm test:coverage:json` - Generate JSON report
- `pnpm test:coverage:lcov` - Generate LCOV report
- `pnpm test:coverage:ci` - Generate all CI formats

### Coverage Analysis
- `pnpm coverage:badges` - Generate coverage badges
- `pnpm coverage:verify` - Verify Phase 2 component coverage
- `pnpm coverage:full` - Complete coverage pipeline
- `pnpm test:full` - Full test pipeline with notifications

### Utilities
- `pnpm coverage:open` - Open HTML report in browser
- `pnpm coverage:serve` - Serve coverage reports on port 8080
- `pnpm coverage:clean` - Clean coverage directory
- `pnpm cache:clear` - Clear all caches
- `pnpm cache:stats` - Show cache statistics

## Coverage Thresholds

### Global Thresholds
- **Statements**: 90%
- **Branches**: 90%
- **Functions**: 90%
- **Lines**: 90%

### Component-Specific Thresholds

#### Critical Components (95% required)
- `src/providers/**` - Data provider implementations
- `src/services/**` - Core service layer

#### Standard Components (90% required)
- `src/hooks/**` - React hooks
- Other components

#### Relaxed Components (85% required)
- `src/forces/**` - Force simulation utilities

## Phase 2 Components

The following Phase 2 components are monitored for coverage:

1. **`src/providers/base-provider.ts`** - Abstract base provider class
2. **`src/providers/openalex-provider.ts`** - OpenAlex data provider
3. **`src/services/entity-resolver-interface.ts`** - Entity resolution service

These components must meet **95% coverage** on all metrics.

## Coverage Reports

### HTML Report
- **Location**: `./coverage/index.html`
- **Features**: Interactive file-by-file coverage, syntax highlighting, branch visualization
- **Access**: `pnpm coverage:open`

### JSON Reports
- `./coverage/coverage-summary.json` - Summary statistics
- `./coverage/coverage.json` - Detailed per-file data
- `./coverage/test-results.json` - Test execution results

### LCOV Report
- **Location**: `./coverage/lcov.info`
- **Purpose**: CI/CD integration, external tools
- **Compatible**: Codecov, Coveralls, SonarQube

### Badge Generation
Coverage badges are automatically generated in:
- `./coverage/badges.md` - Markdown format
- `./coverage/badges.json` - Programmatic format

## CI/CD Integration

### GitHub Actions
The package includes a comprehensive GitHub Actions workflow (`.github/workflows/graph-package-coverage.yml`) that:

1. **Tests multiple Node.js versions** (18.x, 20.x)
2. **Uploads to multiple services**:
   - Codecov with package-specific flags
   - Coveralls with parallel job support
   - GitHub test reporting
3. **Generates PR comments** with coverage diffs
4. **Archives artifacts** for 7 days
5. **Fails on threshold violations**

### Coverage Services
- **Codecov**: Token required in `CODECOV_TOKEN`
- **Coveralls**: Uses `GITHUB_TOKEN`
- **GitHub Status**: Updates PR status checks

## Notifications

### Webhook Support
Configure environment variables for notifications:

```bash
# Slack notifications
export SLACK_WEBHOOK_URL="https://hooks.slack.com/..."

# Discord notifications
export DISCORD_WEBHOOK_URL="https://discord.com/api/webhooks/..."

# Email notifications
export EMAIL_NOTIFICATIONS="true"
export EMAIL_FROM="noreply@example.com"
export EMAIL_TO="team@example.com"
export SMTP_HOST="smtp.gmail.com"
export SMTP_USER="user@gmail.com"
export SMTP_PASS="password"
```

### Notification Script
Run `pnpm test:notify` to send notifications based on test results.

## Performance Optimization

### Caching
- **NYC cache**: `./coverage/.nyc_cache`
- **Vitest cache**: `node_modules/.cache/vitest`
- **TypeScript cache**: `./coverage/.tsbuildinfo`

### Configuration
- **Serial execution**: Prevents OOM issues (`singleFork: true`)
- **Memory management**: 4GB limit for large test suites
- **Timeouts**: 15 seconds for coverage collection
- **Retry logic**: 2 attempts for flaky tests

### Cache Management
```bash
# View cache statistics
pnpm cache:stats

# Clear all caches
pnpm cache:clear

# Optimize for CI
export NODE_OPTIONS="--max-old-space-size=4096 --expose-gc"
```

## File Exclusions

The following files are excluded from coverage:
- Test files (`*.test.ts`, `*.spec.ts`)
- Type definitions (`*.d.ts`)
- Configuration files (`*.config.*`)
- Story files (`*.stories.*`)
- Test utilities (`src/__tests__/**`, `src/test/**`)
- Re-export files (`src/**/index.ts`)

## Quality Gates

### Pre-commit
Coverage verification runs during:
- `pnpm verify` - Local verification
- `pnpm verify:ci` - CI verification
- `pnpm verify:full` - Complete verification

### Failure Conditions
Tests fail if:
- Any test fails
- Coverage below thresholds
- Phase 2 components below 95%
- Critical provider/service files untested

## Troubleshooting

### Common Issues

**Coverage file not found**
```bash
# Generate coverage first
pnpm test:coverage
```

**Memory issues during coverage**
```bash
# Increase Node.js memory
export NODE_OPTIONS="--max-old-space-size=8192"
pnpm test:coverage
```

**Badge generation fails**
```bash
# Check coverage summary exists
ls -la ./coverage/coverage-summary.json
```

**CI timeout issues**
- Use `test:coverage:ci` for faster CI execution
- Enable cache restoration in CI
- Consider splitting test suites

### Debug Commands
```bash
# Verbose test output
pnpm test:coverage --reporter=verbose

# Coverage with source maps
pnpm test:coverage --coverage.reporter=html --coverage.skipFull=false

# Individual file coverage
pnpm test:coverage --coverage.include="src/providers/**"
```

## Contributing

When adding new code:

1. **Write tests first** - Aim for 90%+ coverage
2. **Critical components need 95%** - Providers and services
3. **Run verification** - `pnpm coverage:verify`
4. **Check CI integration** - Ensure all checks pass
5. **Update thresholds** - If patterns change significantly

### Adding New Phase 2 Components
Update `scripts/verify-coverage.js`:
```javascript
const PHASE_2_COMPONENTS = [
  'src/providers/base-provider.ts',
  'src/providers/openalex-provider.ts',
  'src/services/entity-resolver-interface.ts',
  'src/new-component.ts', // Add here
];
```

## References

- [Vitest Coverage](https://vitest.dev/guide/coverage.html)
- [NYC Configuration](https://github.com/istanbuljs/nyc#configuration)
- [LCOV Format](http://ltp.sourceforge.net/coverage/lcov/genhtml.1.php)
- [Codecov Documentation](https://docs.codecov.com/)
- [GitHub Actions](https://docs.github.com/en/actions)