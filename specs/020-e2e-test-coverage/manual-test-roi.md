# Manual Test ROI Analysis

**Date**: 2025-11-23
**Purpose**: Evaluate manual tests for automation based on ROI (Return on Investment)

## ROI Scoring Formula

```
ROI Score = (Impact × Frequency × Speed) - Maintenance

Where:
- Impact (1-5): How critical is this test? (1=low, 5=critical)
- Frequency (1-5): How often is this functionality used/changed? (1=rarely, 5=daily)
- Speed (1-5): How much time does manual testing take? (1=<1min, 5=>30min)
- Maintenance (1-5): Expected maintenance cost of automated test (1=low, 5=high)

Automation Threshold: ROI Score > 15
```

## Manual Tests Reviewed

### Test Files in `apps/web/src/test/e2e/manual/`

1. **all-urls-load-full.e2e.test.ts**
   - **Description**: Tests that all URLs load without errors (comprehensive URL check)
   - **Impact**: 5 (Critical - ensures all routes work)
   - **Frequency**: 3 (Moderate - run before releases)
   - **Speed**: 5 (Very slow - many URLs to check)
   - **Maintenance**: 4 (High - URL list needs updates)
   - **ROI Score**: (5 × 3 × 5) - 4 = **71**
   - **Recommendation**: ✅ **AUTOMATE** - High ROI, critical functionality
   - **Notes**: Can be optimized with parallel execution and sampling

2. **api-field-validation.e2e.test.ts**
   - **Description**: Validates API field responses and data structure
   - **Impact**: 4 (Important - data integrity)
   - **Frequency**: 2 (Low - API changes infrequent)
   - **Speed**: 4 (Slow - many fields to validate)
   - **Maintenance**: 3 (Moderate - API contracts may change)
   - **ROI Score**: (4 × 2 × 4) - 3 = **29**
   - **Recommendation**: ✅ **AUTOMATE** - Good ROI, ensures data quality
   - **Notes**: Can reuse API mock helpers

3. **author-routes.e2e.test.ts**
   - **Description**: Comprehensive author entity routing tests
   - **Impact**: 4 (Important - core entity type)
   - **Frequency**: 3 (Moderate - author features change)
   - **Speed**: 3 (Moderate - several routes to test)
   - **Maintenance**: 2 (Low - stable routes)
   - **ROI Score**: (4 × 3 × 3) - 2 = **34**
   - **Recommendation**: ✅ **AUTOMATE** - Already have AuthorsDetailPage object
   - **Notes**: Similar to existing entity tests

4. **data-completeness.e2e.test.ts**
   - **Description**: Checks that all expected data fields are populated
   - **Impact**: 3 (Moderate - data quality)
   - **Frequency**: 2 (Low - run occasionally)
   - **Speed**: 3 (Moderate)
   - **Maintenance**: 3 (Moderate - field expectations change)
   - **ROI Score**: (3 × 2 × 3) - 3 = **15**
   - **Recommendation**: ⚠️ **BORDERLINE** - At threshold, automate if time permits
   - **Notes**: Depends on data availability

5. **data-consistency-full.e2e.test.ts**
   - **Description**: Validates data consistency across related entities
   - **Impact**: 4 (Important - prevents data inconsistencies)
   - **Frequency**: 2 (Low - data model stable)
   - **Speed**: 5 (Very slow - complex checks)
   - **Maintenance**: 4 (High - depends on data model)
   - **ROI Score**: (4 × 2 × 5) - 4 = **36**
   - **Recommendation**: ✅ **AUTOMATE** - Time-consuming manual test
   - **Notes**: Can sample subset of entities for faster execution

6. **debug-homepage.e2e.test.ts**
   - **Description**: Debug test for homepage issues
   - **Impact**: 2 (Low - debugging tool)
   - **Frequency**: 1 (Rare - only when debugging)
   - **Speed**: 2 (Quick)
   - **Maintenance**: 2 (Low)
   - **ROI Score**: (2 × 1 × 2) - 2 = **2**
   - **Recommendation**: ❌ **DO NOT AUTOMATE** - Keep as manual debugging tool
   - **Notes**: Temporary/ad-hoc test

7. **external-id-routing.e2e.test.ts**
   - **Description**: Tests routing with external IDs (DOI, ISSN, etc.)
   - **Impact**: 4 (Important - key feature)
   - **Frequency**: 3 (Moderate)
   - **Speed**: 3 (Moderate)
   - **Maintenance**: 2 (Low - stable feature)
   - **ROI Score**: (4 × 3 × 3) - 2 = **34**
   - **Recommendation**: ✅ **AUTOMATE** - Important routing feature
   - **Notes**: Can reuse existing test infrastructure

8. **graph-visualization.e2e.test.ts**
   - **Description**: Manual visual inspection of graph rendering
   - **Impact**: 3 (Moderate - visual check)
   - **Frequency**: 3 (Moderate)
   - **Speed**: 4 (Slow - manual inspection)
   - **Maintenance**: 4 (High - visual testing is complex)
   - **ROI Score**: (3 × 3 × 4) - 4 = **32**
   - **Recommendation**: ⚠️ **PARTIAL AUTOMATION** - Automate basic checks, keep visual inspection manual
   - **Notes**: Automated tests created in graph-interaction.e2e.test.ts

9. **homepage.e2e.test.ts**
   - **Description**: Comprehensive homepage functionality tests
   - **Impact**: 5 (Critical - first impression)
   - **Frequency**: 4 (Frequent - homepage often updated)
   - **Speed**: 3 (Moderate)
   - **Maintenance**: 3 (Moderate)
   - **ROI Score**: (5 × 4 × 3) - 3 = **57**
   - **Recommendation**: ✅ **AUTOMATE** - High impact, frequently tested
   - **Notes**: Critical user entry point

10. **issn-fix-verification.e2e.test.ts**
    - **Description**: Verifies ISSN-related bug fix
    - **Impact**: 3 (Moderate - specific bug)
    - **Frequency**: 1 (Rare - one-time fix)
    - **Speed**: 2 (Quick)
    - **Maintenance**: 1 (Low - stable fix)
    - **ROI Score**: (3 × 1 × 2) - 1 = **5**
    - **Recommendation**: ❌ **DO NOT AUTOMATE** - Low ROI, one-time verification
    - **Notes**: Keep as regression test reference

11. **issn-timeout-debug.e2e.test.ts**
    - **Description**: Debug test for ISSN timeout issues
    - **Impact**: 2 (Low - debugging)
    - **Frequency**: 1 (Rare - debug only)
    - **Speed**: 3 (Moderate)
    - **Maintenance**: 2 (Low)
    - **ROI Score**: (2 × 1 × 3) - 2 = **4**
    - **Recommendation**: ❌ **DO NOT AUTOMATE** - Debugging tool
    - **Notes**: Keep for troubleshooting

12. **layout-scrolling.e2e.test.ts**
    - **Description**: Tests layout and scrolling behavior
    - **Impact**: 3 (Moderate - UX issue)
    - **Frequency**: 3 (Moderate)
    - **Speed**: 3 (Moderate)
    - **Maintenance**: 3 (Moderate - layout changes)
    - **ROI Score**: (3 × 3 × 3) - 3 = **24**
    - **Recommendation**: ✅ **AUTOMATE** - Good ROI for UX testing
    - **Notes**: Important for responsive design

13. **openalex-url.e2e.test.ts**
    - **Description**: Tests OpenAlex URL handling and redirects
    - **Impact**: 4 (Important - core functionality)
    - **Frequency**: 2 (Low - URL handling stable)
    - **Speed**: 2 (Quick)
    - **Maintenance**: 2 (Low)
    - **ROI Score**: (4 × 2 × 2) - 2 = **14**
    - **Recommendation**: ⚠️ **BORDERLINE** - Just below threshold
    - **Notes**: Consider automating with external-id-routing

14. **quick-deployed-check.e2e.test.ts**
    - **Description**: Quick smoke test for deployed environment
    - **Impact**: 4 (Important - deployment verification)
    - **Frequency**: 5 (Very frequent - every deployment)
    - **Speed**: 1 (Very quick)
    - **Maintenance**: 1 (Very low)
    - **ROI Score**: (4 × 5 × 1) - 1 = **19**
    - **Recommendation**: ✅ **AUTOMATE** - High frequency justifies automation
    - **Notes**: Already have sample-urls-ci.e2e.test.ts for this

15. **sample-urls-deployed.e2e.test.ts**
    - **Description**: Sample URL tests for deployed environment
    - **Impact**: 4 (Important - deployment smoke test)
    - **Frequency**: 5 (Very frequent)
    - **Speed**: 2 (Quick)
    - **Maintenance**: 1 (Low)
    - **ROI Score**: (4 × 5 × 2) - 1 = **39**
    - **Recommendation**: ✅ **AUTOMATE** - Already automated as sample-urls-ci.e2e.test.ts
    - **Notes**: Part of smoke suite

16. **section-screenshots.e2e.test.ts**
    - **Description**: Takes screenshots of different page sections
    - **Impact**: 2 (Low - documentation/visual regression)
    - **Frequency**: 1 (Rare - documentation updates)
    - **Speed**: 4 (Slow - screenshot generation)
    - **Maintenance**: 3 (Moderate)
    - **ROI Score**: (2 × 1 × 4) - 3 = **5**
    - **Recommendation**: ❌ **DO NOT AUTOMATE** - Low ROI, manual inspection better
    - **Notes**: Keep for documentation generation

## Summary

### High Priority Automation (ROI > 30)

1. **all-urls-load-full.e2e.test.ts** (ROI: 71) - Comprehensive URL testing
2. **sample-urls-deployed.e2e.test.ts** (ROI: 39) - Already automated ✅
3. **data-consistency-full.e2e.test.ts** (ROI: 36) - Data validation
4. **author-routes.e2e.test.ts** (ROI: 34) - Author routing
5. **external-id-routing.e2e.test.ts** (ROI: 34) - External ID support
6. **graph-visualization.e2e.test.ts** (ROI: 32) - Partially automated ✅

### Medium Priority Automation (15 < ROI ≤ 30)

7. **api-field-validation.e2e.test.ts** (ROI: 29) - API validation
8. **layout-scrolling.e2e.test.ts** (ROI: 24) - Layout tests
9. **quick-deployed-check.e2e.test.ts** (ROI: 19) - Already automated ✅

### Borderline Cases (ROI = 15)

10. **data-completeness.e2e.test.ts** (ROI: 15) - Data completeness
11. **openalex-url.e2e.test.ts** (ROI: 14) - OpenAlex URL handling

### Do Not Automate (ROI < 15)

12. **debug-homepage.e2e.test.ts** (ROI: 2) - Debugging tool
13. **issn-fix-verification.e2e.test.ts** (ROI: 5) - One-time fix
14. **issn-timeout-debug.e2e.test.ts** (ROI: 4) - Debugging tool
15. **section-screenshots.e2e.test.ts** (ROI: 5) - Documentation tool

## Automation Plan

### Phase 1: Quick Wins (Already Completed)
- ✅ sample-urls-deployed.e2e.test.ts (automated as sample-urls-ci.e2e.test.ts)
- ✅ quick-deployed-check.e2e.test.ts (smoke suite)
- ✅ graph-visualization.e2e.test.ts (automated as graph-interaction.e2e.test.ts)

### Phase 2: High ROI Tests (Recommended)
1. all-urls-load-full.e2e.test.ts → Create automated-manual-01.e2e.test.ts
2. data-consistency-full.e2e.test.ts → Create automated-manual-02.e2e.test.ts
3. author-routes.e2e.test.ts → Create automated-manual-03.e2e.test.ts
4. external-id-routing.e2e.test.ts → Create automated-manual-04.e2e.test.ts

### Phase 3: Medium ROI Tests (Optional)
5. api-field-validation.e2e.test.ts → Create automated-manual-05.e2e.test.ts
6. layout-scrolling.e2e.test.ts → Create automated-manual-06.e2e.test.ts

### Phase 4: Borderline Tests (If Time Permits)
7. data-completeness.e2e.test.ts → Evaluate after Phase 2
8. openalex-url.e2e.test.ts → Consider with external-id-routing

## Cost-Benefit Analysis

**Total Manual Tests**: 16
**Recommended for Automation**: 4-8 tests
**Automation Coverage**: 25-50% of manual tests
**Time Saved**: ~2-4 hours per test cycle (estimated)
**Implementation Cost**: ~1-2 hours per test
**Break-Even Point**: After 1-2 test cycles

## Notes

- Debug and documentation tests should remain manual
- One-time verification tests have low ROI
- High-frequency tests have highest ROI regardless of complexity
- Visual inspection tests difficult to fully automate
- Consider partial automation for complex visual tests

## Recommendations

1. **Immediate**: Automate tests with ROI > 30 (4 tests)
2. **Short-term**: Automate tests with 15 < ROI ≤ 30 (3 tests)
3. **Long-term**: Evaluate borderline tests based on team capacity
4. **Never**: Keep debugging and documentation tests manual

**Total Estimated Effort**: 8-16 hours for full automation
**Expected Time Savings**: 2-4 hours per test cycle
**Recommended Priority**: Start with Phase 2 tests
