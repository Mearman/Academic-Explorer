# Test Coverage Configuration

This document describes the comprehensive test coverage configuration for Academic Explorer, covering all test types including unit, component, integration, and e2e tests.

## Coverage Architecture

### Multi-Layer Coverage Strategy
The application implements a 4-tier test coverage system:

1. **Unit Tests** - Pure logic, utilities, data transformations (`*.unit.test.ts`)
2. **Component Tests** - React component rendering and interactions (`*.component.test.ts`)  
3. **Integration Tests** - API integration, cache behaviour, workflows (`*.integration.test.ts`)
4. **E2E Tests** - Full user journeys and critical paths (`*.e2e.test.ts`, `*.playwright.test.ts`)

### Coverage Tools
- **Vitest** - For unit, component, and integration test coverage with V8 provider
- **Playwright** - For e2e test coverage with built-in code coverage
- **C8** - For coverage report generation and merging
- **Custom merger** - Combines coverage from all test types

## Configuration Files

### Vitest Configuration (`vitest.config.ts`)
- Global coverage settings with V8 provider
- Per-project coverage directories (`coverage/unit`, `coverage/component`, etc.)
- Coverage thresholds: 70% for branches, functions, lines, statements
- Includes/excludes properly configured to avoid test files and generated code

### Playwright Configuration (`playwright.config.ts`)
- E2E test coverage via `PLAYWRIGHT_COVERAGE=1` environment variable
- Serial execution (single worker) for memory management
- Multiple browser targets (Chrome, Firefox, Safari, Mobile)
- Coverage output to `coverage/playwright`

### Coverage Merger (`scripts/merge-coverage.ts`)
- Combines coverage reports from all test types
- Statement, function, and branch counter merging
- Summary statistics generation
- Output to `coverage/merged`

## Available Commands

### Individual Coverage Commands
```bash
# Run specific test type with coverage
pnpm test:coverage:unit          # Unit test coverage only
pnpm test:coverage:component     # Component test coverage only  
pnpm test:coverage:integration   # Integration test coverage only
pnpm test:coverage:e2e:vitest    # E2E tests via Vitest with coverage
pnpm test:e2e:playwright:coverage # E2E tests via Playwright with coverage
```

### Combined Coverage Commands
```bash
# Full coverage suite - all test types
pnpm coverage:full

# All Vitest-based coverage (unit + component + integration + e2e)
pnpm test:coverage:all

# Clean coverage artifacts
pnpm coverage:clean
```

### Coverage Reporting Commands
```bash
# Merge all coverage reports
pnpm coverage:merge

# Generate HTML and LCOV reports
pnpm coverage:report

# Text summary of merged coverage
pnpm coverage:report:text

# Individual test type reports
pnpm coverage:unit-only
pnpm coverage:component-only  
pnpm coverage:integration-only
```

## Coverage Thresholds

The following minimum coverage thresholds are enforced:
- **Branches**: 70%
- **Functions**: 70%
- **Lines**: 70%
- **Statements**: 70%

## Coverage Includes/Excludes

### Included Files
- `src/**/*.{ts,tsx}` - All TypeScript source files
- Excludes test files, generated files, and configuration

### Excluded Files
- `**/*.test.{ts,tsx}` - Test files
- `**/*.spec.{ts,tsx}` - Spec files
- `src/test/**` - Test utilities and mocks
- `src/vite-env.d.ts` - Environment declarations
- `src/routeTree.gen.ts` - Generated route tree
- `src/debug-mantine-vars.js` - Debug utilities
- `node_modules/**` - Dependencies
- `dist/**` - Build output
- `coverage/**` - Coverage artifacts

## Output Directories

```
coverage/
├── unit/                 # Unit test coverage
├── component/            # Component test coverage
├── integration/          # Integration test coverage  
├── e2e/                  # E2E Vitest coverage
├── playwright/           # Playwright coverage
├── merged/               # Combined coverage from all sources
│   ├── lcov.info        # LCOV format
│   ├── coverage-final.json # JSON format
│   └── html/            # HTML report
└── ...
```

## Memory Management

### Serial Execution Requirements
- **CRITICAL**: All tests must run in serial mode due to memory constraints
- Vitest: `maxConcurrency: 1`, `singleThread: true`
- Playwright: `workers: 1`, `fullyParallel: false`
- Node.js memory limit: `--max-old-space-size=8192`

### Coverage-Specific Memory Settings
- Coverage collection increases memory usage significantly
- Use `--max-old-space-size=8192` for coverage runs
- Enable garbage collection with `--expose-gc`
- Limited semi-space size with `--max-semi-space-size=128`

## CI/CD Integration

### Environment Variables
- `PLAYWRIGHT_COVERAGE=1` - Enable Playwright coverage collection
- `CI=true` - Adjust timeouts and reporting for CI environment
- `VITEST_PERFORMANCE_MONITOR=true` - Enable performance monitoring

### Recommended CI Workflow
```bash
# 1. Clean previous coverage
pnpm coverage:clean

# 2. Run all tests with coverage
pnpm coverage:full

# 3. Upload merged coverage to coverage service
# (Coverage service integration would go here)
```

## Troubleshooting

### Common Issues

**Memory Issues**
- Increase Node.js memory with `--max-old-space-size=8192`
- Run coverage collection serially only
- Clean coverage between runs

**Missing Coverage Files**
- Ensure all test types have run successfully
- Check that coverage is enabled for the specific test project
- Verify include/exclude patterns are correct

**Coverage Merge Failures** 
- Check that all expected coverage directories exist
- Verify coverage-final.json files are valid JSON
- Review merge script logs for specific errors

### Debug Commands
```bash
# Check coverage file existence
ls -la coverage/*/coverage-final.json

# Validate JSON files
jq . coverage/unit/coverage-final.json

# Manual merge with verbose logging
tsx scripts/merge-coverage.ts
```

## Advanced Usage

### Custom Coverage Thresholds
Modify `vitest.config.ts` to adjust thresholds per test type:
```typescript
coverage: {
  thresholds: {
    global: {
      branches: 80,  // Increase from 70%
      functions: 80,
      lines: 80,
      statements: 80
    }
  }
}
```

### Selective Coverage
Run coverage on specific files or directories:
```bash
# Unit tests for specific component
NODE_OPTIONS='--max-old-space-size=8192' vitest run --coverage src/components/atoms/**/*.unit.test.ts

# Integration tests for specific feature
NODE_OPTIONS='--max-old-space-size=8192' vitest run --project integration --coverage src/lib/openalex/**/*.integration.test.ts
```

### Coverage Reports
- **HTML Report**: Interactive coverage visualization at `coverage/merged/html/index.html`
- **LCOV Report**: Standard format for CI integration at `coverage/merged/lcov.info`
- **JSON Report**: Programmatic access at `coverage/merged/coverage-final.json`
- **Text Summary**: Console output via `pnpm coverage:report:text`

## Integration with IDE

### VS Code Extensions
- **Coverage Gutters**: Shows coverage inline in editor
  - Install extension and point to `coverage/merged/lcov.info`
  - Watch mode: Enable auto-refresh when coverage changes

### Coverage Badges
Use shields.io or similar service to display coverage badges:
```markdown
![Coverage](https://img.shields.io/badge/coverage-85%25-brightgreen)
```

## Performance Considerations

### Coverage Collection Impact
- ~20-30% slower test execution with coverage enabled
- ~2-3x memory usage during coverage collection
- Increased disk I/O for coverage data writing

### Optimization Strategies
- Use coverage only when needed (not for watch mode)
- Collect coverage serially to prevent memory crashes
- Clean coverage artifacts regularly to save disk space
- Use specific coverage commands for development (unit-only, etc.)

## Related Files
- `vitest.config.ts` - Main Vitest configuration with coverage settings
- `playwright.config.ts` - Playwright configuration with coverage support
- `scripts/merge-coverage.ts` - Coverage merger utility
- `package.json` - Coverage-related npm scripts
- `.gitignore` - Excludes coverage artifacts from version control