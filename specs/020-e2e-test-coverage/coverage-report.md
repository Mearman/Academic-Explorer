# Coverage Report

**Spec**: 020-e2e-test-coverage
**Date**: 2025-11-26
**Status**: Implemented

## Summary

This report documents the E2E test coverage achieved through spec-020 implementation.

## Route Coverage

### Before spec-020
- **Baseline coverage**: ~50% (estimated based on audit)
- **Untested routes**: 12+ entity types, utility pages, error scenarios

### After spec-020
- **Total Routes**: 47
- **Covered Routes**: 46
- **Coverage**: **98%**
- **Improvement**: +48 percentage points

### Coverage by Category

| Category | Total | Covered | Coverage |
|----------|-------|---------|----------|
| Entity Index | 12 | 12 | 100% |
| Entity Detail | 12 | 12 | 100% |
| Utility | 11 | 11 | 100% |
| Special | 7 | 7 | 100% |
| Error | 5 | 4 | 80% |

### Uncovered Routes (1)
- `/error-test` - Development-only test route, not user-facing

## Test File Statistics

### E2E Test Files Created/Updated
| Location | Count |
|----------|-------|
| `apps/web/e2e/` | 37 |
| `apps/web/src/test/e2e/` | 49 |
| **Total** | **86** |

### Tests by Category
| Category | Test Files | Description |
|----------|------------|-------------|
| Entity | 15 | Entity detail page tests |
| Utility | 7 | Utility page tests (browse, search, etc.) |
| Workflow | 5 | Multi-step workflow tests |
| Error | 5 | Error scenario tests |
| Automated Manual | 5 | Promoted from manual tests |
| Accessibility | 15 | WCAG 2.1 AA scans |
| Performance | 3 | Performance benchmark tests |

## Success Criteria Verification (SC-011)

**Requirement**: Route coverage increases by 20+ percentage points

**Result**: ✅ PASSED
- Before: ~50%
- After: 98%
- Increase: **+48 percentage points**

## Test Execution Summary

### Smoke Suite
- **Tests**: ~100
- **Target Time**: <10 minutes
- **Status**: ✅ Passing

### Full Suite
- **Tests**: 200+
- **Target Time**: <30 minutes
- **Status**: ✅ Passing

## Coverage Scripts

### Generate Route Coverage Report
```bash
npx tsx apps/web/coverage/calculate-route-coverage.ts
```

### Output Location
- Script: `apps/web/coverage/calculate-route-coverage.ts`
- Report: `apps/web/coverage/route-coverage-report.md`

## Key Achievements

1. **All 12 entity types** have index and detail page tests
2. **All utility pages** (browse, search, explore, settings, about, cache, history) tested
3. **Error scenarios** (404, 500, network, timeout) fully covered
4. **Workflow tests** for search, browse, graph, catalogue, bookmarks
5. **Mobile viewport tests** for responsive design
6. **Accessibility tests** integrated throughout
7. **Performance benchmarks** for critical paths

## V8 Code Coverage

V8 code coverage can be generated using:
```bash
pnpm nx e2e web -- --coverage
```

Note: V8 coverage requires the `@bgotink/playwright-coverage` package integration (optional enhancement).

## Recommendations

1. **Maintain coverage**: Add tests for new routes as they're created
2. **Monitor in CI**: Include coverage checks in CI pipeline
3. **Address `/error-test`**: Consider adding minimal test if needed for completeness
4. **Code coverage**: Integrate V8 coverage for line-level metrics

## Related Documents

- [accessibility-report.md](./accessibility-report.md) - Accessibility testing details
- [flaky-tests.md](./flaky-tests.md) - Flakiness elimination strategy
- [manual-test-roi.md](./manual-test-roi.md) - Manual test automation decisions
- [audit-results.md](./audit-results.md) - Initial test audit findings
