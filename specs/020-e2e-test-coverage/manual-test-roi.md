# Manual Test ROI Analysis

**Analysis Date**: 2025-11-26
**Specification**: spec-020 Phase 6 (T060-T062)
**Formula**: ROI = Impact × Frequency × Speed - Maintenance

## Scoring Criteria

| Factor | Score | Description |
|--------|-------|-------------|
| **Impact** | 1-5 | How critical is catching this bug? (5 = critical user workflow) |
| **Frequency** | 1-5 | How often is this code changed? (5 = very frequently) |
| **Speed** | 1-5 | How much faster is automation vs manual? (5 = much faster) |
| **Maintenance** | 1-5 | How much maintenance will the automated test need? (5 = high maintenance, subtracted) |

**Threshold**: ROI > 15 = worth automating

---

## ROI Scores Summary

| # | Test File | Impact | Freq | Speed | Maint | ROI | Decision |
|---|-----------|--------|------|-------|-------|-----|----------|
| 1 | quick-deployed-check.e2e.test.ts | 5 | 5 | 5 | 1 | **124** | PROMOTE |
| 2 | sample-urls-deployed.e2e.test.ts | 5 | 5 | 5 | 1 | **124** | PROMOTE |
| 3 | author-routes.e2e.test.ts | 5 | 4 | 5 | 2 | **98** | PROMOTE |
| 4 | all-urls-load-full.e2e.test.ts | 5 | 4 | 5 | 3 | **97** | KEEP MANUAL (slow) |
| 5 | openalex-url.e2e.test.ts | 5 | 3 | 5 | 2 | **73** | PROMOTE |
| 6 | homepage.e2e.test.ts | 5 | 3 | 5 | 2 | **73** | PROMOTE |
| 7 | api-field-validation.e2e.test.ts | 5 | 3 | 5 | 2 | **73** | PROMOTE |
| 8 | data-consistency-full.e2e.test.ts | 5 | 3 | 5 | 3 | **72** | KEEP MANUAL (slow) |
| 9 | graph-visualization.e2e.test.ts | 5 | 3 | 4 | 3 | **57** | PROMOTE |
| 10 | data-completeness.e2e.test.ts | 4 | 3 | 4 | 3 | **45** | PROMOTE |
| 11 | issn-fix-verification.e2e.test.ts | 4 | 2 | 4 | 1 | **31** | PROMOTE |
| 12 | layout-scrolling.e2e.test.ts | 4 | 2 | 4 | 2 | **30** | PROMOTE |
| 13 | external-id-routing.e2e.test.ts | 4 | 2 | 4 | 2 | **30** | PROMOTE |
| 14 | issn-timeout-debug.e2e.test.ts | 3 | 2 | 3 | 2 | **16** | KEEP MANUAL (debug) |
| 15 | section-screenshots.e2e.test.ts | 2 | 1 | 3 | 2 | **4** | DELETE (obsolete) |
| 16 | debug-homepage.e2e.test.ts | 2 | 1 | 2 | 1 | **3** | DELETE (obsolete) |

---

## Detailed Analysis

### PROMOTE TO MAIN SUITE (10 tests)

These tests have high ROI and should be moved to `apps/web/e2e/`:

#### 1. quick-deployed-check.e2e.test.ts (ROI: 124)
- **Purpose**: Quick verification that critical pages load on deployed site
- **Tests**: Concepts list, concepts detail, author page, topics list
- **Action**: Merge into existing smoke tests or create `deployed-smoke.e2e.test.ts`
- **Note**: Already similar to existing entity tests

#### 2. sample-urls-deployed.e2e.test.ts (ROI: 124)
- **Purpose**: Sample URLs from each entity type verification
- **Tests**: Works, authors, concepts, institutions, sources, funders, publishers, topics
- **Action**: Merge into existing entity tests or create `entity-samples.e2e.test.ts`
- **Note**: Complements existing entity coverage

#### 3. author-routes.e2e.test.ts (ROI: 98)
- **Purpose**: Author route functionality including infinite loop prevention
- **Tests**: Page loading, navigation, graph visualization, memory leak detection
- **Action**: Already covered by `authors.e2e.test.ts` - **MERGE & DELETE**
- **Note**: Good test patterns to incorporate

#### 4. openalex-url.e2e.test.ts (ROI: 73)
- **Purpose**: OpenAlex URL routing and conversion
- **Tests**: Single entity redirect, list queries, autocomplete, sort params, paging
- **Action**: Create `openalex-url-routing.e2e.test.ts`
- **Note**: Critical routing functionality

#### 5. homepage.e2e.test.ts (ROI: 73)
- **Purpose**: Homepage functionality, responsive layout, search interaction
- **Tests**: Content display, search input, example links, accessibility, zoom levels
- **Action**: Already extensive - move to main suite as `homepage.e2e.test.ts`
- **Note**: Very thorough coverage

#### 6. api-field-validation.e2e.test.ts (ROI: 73)
- **Purpose**: Validates API returns expected fields for each entity type
- **Tests**: Field presence for works, authors, institutions, sources, publishers, funders, topics
- **Action**: Create `api-field-validation.e2e.test.ts` in main suite
- **Note**: Would have caught authorships_count bug

#### 7. graph-visualization.e2e.test.ts (ROI: 57)
- **Purpose**: Graph rendering without infinite loops
- **Tests**: Author page rendering, XYFlow container, data loading
- **Action**: Already covered by `graph-interaction.e2e.test.ts` - **MERGE & DELETE**
- **Note**: Good infinite loop detection patterns

#### 8. data-completeness.e2e.test.ts (ROI: 45)
- **Purpose**: Styled view displays all API data
- **Tests**: Works search, author detail, concepts list, select parameter
- **Action**: Create `data-completeness.e2e.test.ts` in main suite
- **Note**: Important for data rendering validation

#### 9. issn-fix-verification.e2e.test.ts (ROI: 31)
- **Purpose**: ISSN normalization fix verification
- **Tests**: ISSN loading, API request format, prefix handling
- **Action**: Merge into `sources.e2e.test.ts` - **MERGE & DELETE**
- **Note**: Regression test for specific bug fix

#### 10. layout-scrolling.e2e.test.ts (ROI: 30)
- **Purpose**: Layout scrolling behavior (no nested scrollbars)
- **Tests**: Main content overflow, sidebar scrolling, keyboard navigation
- **Action**: Create `layout-scrolling.e2e.test.ts` in main suite
- **Note**: Important UX regression prevention

#### 11. external-id-routing.e2e.test.ts (ROI: 30)
- **Purpose**: External ID routing with colons (ROR, ISSN)
- **Tests**: ROR ID routing, ISSN routing, full API URL handling
- **Action**: Merge into `openalex-url-routing.e2e.test.ts` or entity tests
- **Note**: Critical for external ID support

### KEEP AS MANUAL (3 tests)

These tests should remain in the manual folder:

#### 1. all-urls-load-full.e2e.test.ts (ROI: 97)
- **Reason**: 276 URLs × ~6.5s = ~30 minutes runtime
- **Use Case**: Periodic regression testing, not CI
- **Action**: Keep in manual/, run weekly or before releases

#### 2. data-consistency-full.e2e.test.ts (ROI: 72)
- **Reason**: Full 276 URL data comparison is too slow for CI
- **Use Case**: API change validation, not CI
- **Action**: Keep in manual/, run when API changes

#### 3. issn-timeout-debug.e2e.test.ts (ROI: 16)
- **Reason**: Debugging utility, not regression test
- **Use Case**: One-time investigation
- **Action**: Keep in manual/ for future debugging

### DELETE AS OBSOLETE (2 tests)

These tests should be removed:

#### 1. section-screenshots.e2e.test.ts (ROI: 4)
- **Reason**: Screenshot capture utility, no assertions
- **Use Case**: Documentation only, rarely used
- **Action**: DELETE

#### 2. debug-homepage.e2e.test.ts (ROI: 3)
- **Reason**: Replaced by more thorough homepage.e2e.test.ts
- **Use Case**: Initial debugging, now obsolete
- **Action**: DELETE

---

## Implementation Plan

### Phase 1: Promote High-ROI Tests (T063-T070)

Create new automated tests in `apps/web/e2e/`:

1. **T063**: `homepage-full.e2e.test.ts` - Promote homepage.e2e.test.ts
2. **T064**: `openalex-url-routing.e2e.test.ts` - Promote openalex-url.e2e.test.ts + external-id-routing.e2e.test.ts
3. **T065**: `api-field-validation.e2e.test.ts` - Promote api-field-validation.e2e.test.ts
4. **T066**: `data-completeness.e2e.test.ts` - Promote data-completeness.e2e.test.ts
5. **T067**: `layout-scrolling.e2e.test.ts` - Promote layout-scrolling.e2e.test.ts
6. **T068**: Merge author-routes patterns into existing authors.e2e.test.ts
7. **T069**: Merge graph-visualization patterns into existing graph-interaction.e2e.test.ts
8. **T070**: Merge issn-fix-verification into existing sources.e2e.test.ts

### Phase 2: Cleanup

1. Mark promoted tests with "AUTOMATED" comment
2. Delete obsolete debug tests
3. Update file references

---

## Summary

| Category | Count | Action |
|----------|-------|--------|
| **PROMOTE** | 10 | Move to main e2e suite with @automated-manual tag |
| **KEEP MANUAL** | 3 | Leave in manual folder, too slow for CI |
| **DELETE** | 2 | Remove obsolete debugging utilities |
| **MERGE** | 4 | Merge patterns into existing tests |
| **TOTAL** | 16 | - |

**Net new test files**: 5 (homepage-full, openalex-url-routing, api-field-validation, data-completeness, layout-scrolling)
**Tests enhanced**: 3 (authors, graph-interaction, sources)
