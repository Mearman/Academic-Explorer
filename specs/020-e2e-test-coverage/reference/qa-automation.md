# QA Automation Framework - Consolidated

This document consolidates all QA automation framework research from Phase 0.

---

## AUTOMATION_TRIAGE_ACTION_PLAN

# Manual Test Triage Action Plan

## Quick Reference Decision Summary

Based on ROI framework analysis of 16 manual E2E tests:

| Action | Count | Tests |
|--------|-------|-------|
| **Automate** | 10 | `api-field-validation`, `layout-scrolling`, `all-urls-load-full`, `external-id-routing`, `author-routes`, `data-completeness`, `openalex-url`, `issn-fix-verification`, `homepage`, `data-consistency-full` (sampled) |
| **Keep Manual** | 4 | `quick-deployed-check`, `sample-urls-deployed`, `section-screenshots`, `graph-visualization` |
| **Delete** | 2 | `debug-homepage`, `issn-timeout-debug` |

**Expected Outcomes**:
- 10 tests moved to CI (63% of manual tests)
- 4 tests converted to manual checklists (25%)
- 2 tests deleted (13%)
- Estimated CI time: +15-20 minutes per full test run
- Estimated maintenance savings: ~10-15 hours per month

---

## Phase 1: Delete Debug Tests (Immediate)

### Action 1.1: Delete `debug-homepage.e2e.test.ts`

**Rationale**: Pure debug test created to investigate homepage loading issues. Purpose has been served; no ongoing regression value.

```bash
rm /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/debug-homepage.e2e.test.ts
```

**Verification**:
```bash
cd "/Users/joe/Documents/Research/PhD/BibGraph"
git status | grep "debug-homepage"  # Should show deleted
```

---

### Action 1.2: Delete `issn-timeout-debug.e2e.test.ts`

**Rationale**: Debug test created to investigate ISSN routing timeout issues. Problem investigated; test can be removed.

```bash
rm /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/issn-timeout-debug.e2e.test.ts
```

**Verification**:
```bash
ls /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/ | wc -l  # Should be 14
```

---

## Phase 2: Move Critical Tests to CI (This Week)

### Action 2.1: Move `homepage.e2e.test.ts` to Main Suite

**ROI Score**: 99.9 (Critical journey, high frequency, fast)

**Steps**:

1. Copy file to main E2E directory:
```bash
cp /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/homepage.e2e.test.ts \
   /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/e2e/homepage.e2e.test.ts
```

2. Verify it runs in CI:
```bash
cd "/Users/joe/Documents/Research/PhD/BibGraph"
pnpm nx e2e web -- --testNamePattern="homepage" --verbose
```

3. Expected output: Test passes in < 10 seconds

4. Delete from manual folder:
```bash
rm /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/homepage.e2e.test.ts
```

---

### Action 2.2: Move `api-field-validation.e2e.test.ts` to Main Suite

**ROI Score**: 59.9 (Prevents API field typos)

**Steps**:

1. Copy file:
```bash
cp /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/api-field-validation.e2e.test.ts \
   /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/e2e/api-field-validation.e2e.test.ts
```

2. Test locally:
```bash
cd "/Users/joe/Documents/Research/PhD/BibGraph"
pnpm nx e2e web -- --testNamePattern="API Field"
```

3. Expected: All entity field validation passes

4. Delete from manual:
```bash
rm /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/api-field-validation.e2e.test.ts
```

---

### Action 2.3: Move `all-urls-load-full.e2e.test.ts` to Main Suite

**ROI Score**: 44.9 (Core list page validation)

**Steps**:

1. Copy:
```bash
cp /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/all-urls-load-full.e2e.test.ts \
   /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/e2e/entity-lists.e2e.test.ts
```

2. Verify (may need increased timeout):
```bash
cd "/Users/joe/Documents/Research/PhD/BibGraph"
pnpm nx e2e web -- --testNamePattern="URL" --timeout=60000
```

3. Expected: All list pages load without "Unsupported entity type" error

4. Delete:
```bash
rm /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/all-urls-load-full.e2e.test.ts
```

---

### Action 2.4: Move `external-id-routing.e2e.test.ts` to Main Suite

**ROI Score**: 79.9 (Critical routing feature)

**Steps**:

1. Copy:
```bash
cp /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/external-id-routing.e2e.test.ts \
   /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/e2e/external-id-routing.e2e.test.ts
```

2. Test:
```bash
cd "/Users/joe/Documents/Research/PhD/BibGraph"
pnpm nx e2e web -- --testNamePattern="external.*id"
```

3. Expected: DOI, ISSN, ORCID routing works

4. Delete:
```bash
rm /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/external-id-routing.e2e.test.ts
```

---

### Action 2.5: Move `author-routes.e2e.test.ts` to Main Suite

**ROI Score**: 59.9 (Entity routing core)

**Steps**:

1. Copy:
```bash
cp /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/author-routes.e2e.test.ts \
   /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/e2e/author-routes.e2e.test.ts
```

2. Test:
```bash
cd "/Users/joe/Documents/Research/PhD/BibGraph"
pnpm nx e2e web -- --testNamePattern="author"
```

3. Delete:
```bash
rm /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/author-routes.e2e.test.ts
```

---

## Phase 3: Move Feature Tests to Spec Folders (This Week)

### Action 3.1: Move `layout-scrolling.e2e.test.ts` to Spec 011

**ROI Score**: 63.9 (Active spec development)

**Steps**:

1. Check spec exists:
```bash
ls -la /Users/joe/Documents/Research/PhD/Academic\ Explorer/specs/011-fix-vertical-scrolling/
```

2. Create tests folder if needed:
```bash
mkdir -p /Users/joe/Documents/Research/PhD/Academic\ Explorer/specs/011-fix-vertical-scrolling/tests
```

3. Move file:
```bash
mv /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/layout-scrolling.e2e.test.ts \
   /Users/joe/Documents/Research/PhD/Academic\ Explorer/specs/011-fix-vertical-scrolling/tests/layout-scrolling.e2e.test.ts
```

4. Update CLAUDE.md in spec with test location

---

### Action 3.2: Move `issn-fix-verification.e2e.test.ts` to Spec

**ROI Score**: 41.9 (ISSN routing fix)

**Steps**:

1. Find the ISSN spec:
```bash
grep -r "issn" /Users/joe/Documents/Research/PhD/Academic\ Explorer/specs/ --include="spec.md" | head -3
```

2. Create tests folder in that spec

3. Move the file there

4. Or if no spec exists, keep in main E2E suite:
```bash
cp /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/issn-fix-verification.e2e.test.ts \
   /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/e2e/issn-routing.e2e.test.ts
```

---

## Phase 4: Move Data Validation Tests to Main Suite (This Week)

### Action 4.1: Move `data-completeness.e2e.test.ts` to Main Suite

**ROI Score**: 47.85 (Field display validation)

**Steps**:

```bash
cp /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/data-completeness.e2e.test.ts \
   /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/e2e/data-completeness.e2e.test.ts

rm /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/data-completeness.e2e.test.ts
```

---

### Action 4.2: Move `openalex-url.e2e.test.ts` to Main Suite

**ROI Score**: 39.9 (URL handling)

**Steps**:

```bash
cp /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/openalex-url.e2e.test.ts \
   /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/e2e/openalex-url.e2e.test.ts

rm /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/openalex-url.e2e.test.ts
```

---

### Action 4.3: Create Sampled Version of `data-consistency-full.e2e.test.ts`

**Situation**: Original test validates 276 URLs (60 min execution). Too slow for regular CI.

**Strategy**: Create sampled version (10 URLs, 2 min execution) for CI; keep full version optional.

**Steps**:

1. Read original file to understand structure:
```bash
head -100 /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/data-consistency-full.e2e.test.ts
```

2. Create sampled version:
```bash
cat > /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/e2e/data-consistency-sample.e2e.test.ts << 'EOF'
/**
 * Data Consistency - Sampled Validation (10 URLs)
 *
 * Subset of data-consistency-full.e2e.test.ts for regular CI runs.
 * Full validation (276 URLs) kept as optional manual test.
 */

import { test, expect } from '@playwright/test';

// Sample of representative URLs (10 instead of 276)
const SAMPLE_URLS = [
  'https://api.openalex.org/works/W2741809807',        // Work detail
  'https://api.openalex.org/authors/A5017898742',      // Author detail
  'https://api.openalex.org/sources/S137773608',       // Source detail
  'https://api.openalex.org/institutions/I27837315',   // Institution detail
  'https://api.openalex.org/topics/T10159',            // Topic detail
  'https://api.openalex.org/works?filter=type:journal-article', // Work search
  'https://api.openalex.org/authors?filter=is_corresponding:true', // Author search
  'https://api.openalex.org/sources?filter=host_venue.is_in_doaj:true', // Source search
  'https://api.openalex.org/institutions?filter=country_code:us', // Institution search
  'https://api.openalex.org/topics?filter=level:2', // Topic search
];

const BASE_URL = process.env.BASE_URL || 'http://localhost:5173';

function toAppUrl(apiUrl: string): string {
  const API_BASE = 'https://api.openalex.org';
  const relativePath = apiUrl.replace(API_BASE, '');
  return `${BASE_URL}/#${relativePath}`;
}

test.describe('Data Consistency - Sample (10 URLs)', () => {
  test.setTimeout(120000); // 2 minutes max

  for (const apiUrl of SAMPLE_URLS) {
    test(`should load: ${apiUrl.split('/').slice(-2).join('/')}`, async ({ page }) => {
      const appUrl = toAppUrl(apiUrl);

      // Navigate and wait for load
      await page.goto(appUrl, { waitUntil: 'networkidle', timeout: 30000 });
      await page.waitForSelector('main', { timeout: 10000 });

      // Verify no errors
      const errorHeading = await page.locator('h1:has-text("Error")').count();
      expect(errorHeading).toBe(0);

      // Verify content exists
      const mainContent = await page.locator('main').textContent();
      expect(mainContent).toBeTruthy();
      expect(mainContent!.length).toBeGreaterThan(50);
    });
  }
});
EOF
```

3. Move full version to optional test location:
```bash
mkdir -p /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/optional/
mv /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/data-consistency-full.e2e.test.ts \
   /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/optional/data-consistency-full.e2e.test.ts
```

4. Add note to optional folder:
```bash
cat > /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/optional/README.md << 'EOF'
# Optional E2E Tests

These tests are not run in regular CI because they are:
- Too slow (> 30 min)
- Specific to deployment verification
- Exploratory/debug in nature

Run manually when needed:

```bash
# Full data consistency (276 URLs, ~60 min)
pnpm nx e2e web -- data-consistency-full.e2e.test.ts

# Before release deployment verification
pnpm nx e2e web -- quick-deployed-check.e2e.test.ts
```
EOF
```

---

## Phase 5: Convert Environment-Specific Tests to Checklists (Next Week)

### Action 5.1: Create Deployment Verification Checklist

**Source Files**:
- `quick-deployed-check.e2e.test.ts`
- `sample-urls-deployed.e2e.test.ts`

**Create Document**:

```bash
cat > /Users/joe/Documents/Research/PhD/Academic\ Explorer/docs/QA_DEPLOYMENT_CHECKLIST.md << 'EOF'
# Deployment Verification Checklist

**Before releasing to production (GitHub Pages deployment)**, manually verify:

## Quick Deployed Site Check (5-10 minutes)

> Use these checks when deploying to https://mearman.github.io/BibGraph

- [ ] Homepage loads without JavaScript errors
  - URL: https://mearman.github.io/BibGraph/
  - Expected: "BibGraph" title, no blank page

- [ ] Concepts list page (was causing "Unsupported entity type" errors)
  - URL: https://mearman.github.io/BibGraph/#/concepts
  - Expected: List of concepts, no error messages

- [ ] Concepts detail page
  - URL: https://mearman.github.io/BibGraph/#/concepts/C71924100
  - Expected: Concept details load correctly

- [ ] Author page (user-reported URL)
  - URL: https://mearman.github.io/BibGraph/#/authors/A5017898742
  - Expected: Author details display

- [ ] Topics list page
  - URL: https://mearman.github.io/BibGraph/#/topics
  - Expected: Topics list, no "Unsupported entity type" error

- [ ] Graph exploration page
  - URL: https://mearman.github.io/BibGraph/explore/graph
  - Expected: Graph renders, sidebar toggles work

## Sample URLs Verification (10-15 minutes)

> Spot-check key entity types

- [ ] Work: https://mearman.github.io/BibGraph/#/works/W2741809807
- [ ] Author: https://mearman.github.io/BibGraph/#/authors/A5017898742
- [ ] Source: https://mearman.github.io/BibGraph/#/sources/S137773608
- [ ] Institution: https://mearman.github.io/BibGraph/#/institutions/I27837315
- [ ] Topic: https://mearman.github.io/BibGraph/#/topics/T10159

For each URL:
- [ ] Page loads (no blank screen > 5 sec)
- [ ] No JavaScript errors in console (F12 → Console tab)
- [ ] Data displays (title, description, metadata)

## Browser Compatibility (5-10 minutes, if applicable)

- [ ] Chrome/Edge: Works correctly
- [ ] Firefox: Works correctly
- [ ] Safari: Works correctly (if time permits)

---

**Release Approved**: [Date] [Name]
EOF
```

**Actions**:
1. Move files to optional folder:
```bash
mkdir -p /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/optional/
mv /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/quick-deployed-check.e2e.test.ts \
   /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/optional/

mv /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/sample-urls-deployed.e2e.test.ts \
   /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/optional/
```

2. Link checklist in deployment docs

---

## Phase 6: Document Exploratory Tests (Next Week)

### Action 6.1: Create Exploratory Test Guide

**Source Files**:
- `section-screenshots.e2e.test.ts`
- `graph-visualization.e2e.test.ts`

**Create Document**:

```bash
cat > /Users/joe/Documents/Research/PhD/Academic\ Explorer/docs/EXPLORATORY_TEST_GUIDE.md << 'EOF'
# Exploratory Test Guide

These tests require manual verification and visual inspection. They capture screenshots and validate interactive behavior.

## Graph Visualization Exploration

**File**: `graph-visualization.e2e.test.ts`

**Purpose**: Verify force-directed graph renders and responds to user interactions

**How to Run**:
```bash
cd "BibGraph"
pnpm dev  # Start dev server on http://localhost:5173

# In another terminal, run test
pnpm nx e2e web -- graph-visualization --headed  # Headed mode shows browser
```

**Manual Verification Checklist**:
- [ ] Graph renders with nodes and edges
- [ ] Dragging nodes moves them smoothly
- [ ] Zooming changes node sizes
- [ ] Color coding reflects relationship types
- [ ] Labels are readable (not overlapping)
- [ ] Performance: No lag when dragging nodes
- [ ] Sidebar filters work (hide/show node types)

**Expected Outcomes**:
- Smooth interactive experience (< 200ms response time)
- Visually balanced layout (nodes well-distributed)
- Clear visual distinction for different node types

**When to Run**:
- After graph visualization feature changes
- Before major releases (visual regression check)
- During user testing sessions

---

## Section Screenshots

**File**: `section-screenshots.e2e.test.ts`

**Purpose**: Capture screenshots of graph sections for documentation/review

**How to Run**:
```bash
pnpm dev
pnpm nx e2e web -- section-screenshots --headed
```

**Outputs**: Screenshots saved to `.tmp/dry-audit/screens/`

**Manual Verification**:
- [ ] All sections captured: All Nodes, All Edges, Node Repository
- [ ] Screenshots are clear and legible
- [ ] Sections show expected data

**When to Run**:
- Before creating documentation
- Before user presentations
- For visual validation in code reviews

---

## Notes on Exploratory Testing

Exploratory tests are **not automated** because:
1. Visual assessment requires human judgment (is layout "correct"?)
2. Flaky by nature (UI libraries, animations, timing)
3. High maintenance (selectors break with CSS changes)

Instead:
- Run manually with `--headed` flag to see browser
- Take screenshots for documentation
- Use output for visual regression detection
- Verify subjectively against requirements

---

**Last Updated**: [Date]
EOF
```

**Actions**:
1. Move exploratory tests to optional folder:
```bash
mv /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/section-screenshots.e2e.test.ts \
   /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/optional/

mv /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/graph-visualization.e2e.test.ts \
   /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/optional/
```

2. Link exploratory guide in main README

---

## Phase 7: Verify All Tests Run (This Week)

### Action 7.1: Run Automated Tests in CI

```bash
cd "/Users/joe/Documents/Research/PhD/BibGraph"

# Test just the moved tests
pnpm nx e2e web -- --testNamePattern="homepage|field-validation|external-id|author|list|data-completeness|openalex-url|issn-fix"

# Run full E2E suite to ensure no regressions
pnpm test:e2e
```

**Expected Results**: All tests pass, execution time < 5 minutes

---

### Action 7.2: Verify Manual Directory

```bash
ls -la /Users/joe/Documents/Research/PhD/Academic\ Explorer/apps/web/src/test/e2e/manual/

# Should show EMPTY or only cleanup files
```

---

## Phase 8: Update Documentation (Next Week)

### Action 8.1: Update CLAUDE.md

Add to `/Users/joe/Documents/Research/PhD/BibGraph/CLAUDE.md`:

```markdown
## Test Automation Triage (Completed)

**Date**: 2025-11-23
**Framework**: Risk-Based ROI Analysis (see docs/QA_AUTOMATION_DECISION_FRAMEWORK.md)

### Summary
- 16 manual E2E tests analyzed and categorized
- 10 tests automated (63%) → moved to `apps/web/e2e/`
- 4 tests converted to manual checklists (25%)
- 2 tests deleted (13%) - debug only

### Locations

**Automated Tests** (`apps/web/e2e/`):
- `homepage.e2e.test.ts` - Critical homepage journey
- `api-field-validation.e2e.test.ts` - API field validation
- `entity-lists.e2e.test.ts` - Entity list page validation
- `external-id-routing.e2e.test.ts` - DOI/ISSN/ORCID routing
- `author-routes.e2e.test.ts` - Author page routing
- `data-completeness.e2e.test.ts` - Field display validation
- `openalex-url.e2e.test.ts` - OpenAlex URL handling
- `issn-routing.e2e.test.ts` - ISSN fix verification
- `data-consistency-sample.e2e.test.ts` - Sampled URL validation (10 URLs, 2 min)

**Optional/Manual Tests** (`apps/web/src/test/e2e/optional/`):
- `data-consistency-full.e2e.test.ts` - Full validation (276 URLs, 60 min)
- `quick-deployed-check.e2e.test.ts` → Deploy verification checklist
- `sample-urls-deployed.e2e.test.ts` → Deploy verification checklist
- `section-screenshots.e2e.test.ts` → Exploratory test guide
- `graph-visualization.e2e.test.ts` → Exploratory test guide

**Reference Documents**:
- `docs/QA_AUTOMATION_DECISION_FRAMEWORK.md` - ROI framework, scoring rubric, decision matrix
- `docs/AUTOMATION_TRIAGE_ACTION_PLAN.md` - This plan, phase-by-phase execution
- `docs/QA_DEPLOYMENT_CHECKLIST.md` - Pre-release verification steps
- `docs/EXPLORATORY_TEST_GUIDE.md` - How to run and verify exploratory tests

### Maintenance

**Quarterly Reviews**:
- Track flakiness (target: < 2%)
- Monitor maintenance cost (target: < 0.1 hours/test/month)
- Reassess ROI scores as code evolves
- See CLAUDE.md quarterly review section

### CI Integration

**Commands**:
```bash
pnpm test:e2e              # Runs automated tests only (~5 min)
pnpm test:e2e:full        # Include optional tests (~65 min)
pnpm test:e2e:deploy      # Pre-deployment checklist
```
```

---

### Action 8.2: Add QA Section to Main README

In `/Users/joe/Documents/Research/PhD/BibGraph/README.md`, add:

```markdown
## Quality Assurance

### Test Strategy

BibGraph uses a **risk-based automation framework** to balance testing effectiveness with maintenance burden.

- **Automated E2E Tests** (10 tests, 5 min): Core user journeys, critical bugs
- **Manual Checklists** (4 tests): Environment-specific verification
- **Exploratory Tests** (2 tests): Visual inspection, interaction validation
- **Optional Tests**: Full data validation (can run before major releases)

See [QA_AUTOMATION_DECISION_FRAMEWORK.md](docs/QA_AUTOMATION_DECISION_FRAMEWORK.md) for:
- ROI scoring rubric
- Test categorization system
- Maintenance cost analysis
- Quarterly review process

### Running Tests

```bash
# Automated tests only (for CI)
pnpm test:e2e              # ~5 minutes

# Full validation (before release)
pnpm test:e2e:full        # ~65 minutes
```
```

---

## Summary Table

| Phase | Action | Count | Time | Priority |
|-------|--------|-------|------|----------|
| 1 | Delete debug tests | 2 | 5 min | HIGH |
| 2 | Move critical tests to CI | 5 | 20 min | HIGH |
| 3 | Move feature tests to specs | 1 | 15 min | HIGH |
| 4 | Move validation tests to CI | 3 | 20 min | MEDIUM |
| 5 | Create deployment checklist | 2 | 10 min | MEDIUM |
| 6 | Document exploratory tests | 2 | 10 min | MEDIUM |
| 7 | Verify CI tests run | 1 | 10 min | HIGH |
| 8 | Update documentation | 2 | 10 min | LOW |

**Total Time**: ~2 hours
**Parallel Possible**: 2.1-2.5 can run in parallel with docs

---

## Success Criteria

After completion:

- [ ] 10 tests run automatically in CI (`pnpm test:e2e` passes)
- [ ] Manual directory is empty (only optional tests remain)
- [ ] Deployment checklist ready for pre-release use
- [ ] Exploratory test guide documents manual testing approach
- [ ] CLAUDE.md updated with QA automation triage section
- [ ] GitHub Actions CI runs automated tests (< 5 min per run)
- [ ] Quarterly review scheduled for 2025-02-23

---

## Rollback Plan

If issues arise during implementation:

1. **Test fails in CI**: Keep test in manual folder; reassess ROI (likely maintenance cost higher than estimated)
2. **Performance issue**: Use sampled version (data-consistency-full) instead of full version
3. **Maintenance burden**: Return flaky test to optional folder; document why
4. **Timeline slips**: Automate critical tests first (Phase 2), defer optional (Phase 5-6)

---

**Plan Version**: 1.0
**Last Updated**: 2025-11-23
**Owner**: QA Engineering
**Status**: Ready for Implementation

---

## QA_AUTOMATION_DECISION_FRAMEWORK

# QA Automation Decision Framework

## Executive Summary

This document provides an objective, evidence-based framework for deciding whether a manual test should be automated, kept manual, or refactored. The decision framework balances ROI considerations, maintenance burden, and testing effectiveness for the BibGraph project.

**Current Status**: 16 manual E2E tests requiring triage and classification.

---

## 1. Risk-Based Test Automation Matrix

### 1.1 The Automation ROI Formula

```
Automation ROI Score = (C × F × T) - M
```

Where:
- **C** = Impact of failure (1-5 scale)
  - 5 = Blocks critical user journey / production failure
  - 4 = Degrades core feature / severe data loss
  - 3 = Breaks secondary feature / moderate user impact
  - 2 = Minor feature issue / single-user impact
  - 1 = Edge case / cosmetic issue

- **F** = Frequency of change (1-5 scale)
  - 5 = Changes daily / per commit (hottest code paths)
  - 4 = Changes multiple times per sprint (active feature)
  - 3 = Changes weekly (normal development)
  - 2 = Changes monthly (stable feature)
  - 1 = Changes quarterly (legacy/frozen feature)

- **T** = Execution time in minutes (inverse factor)
  - 5 = < 2 minutes (instant feedback)
  - 4 = 2-5 minutes (quick verification)
  - 3 = 5-10 minutes (moderate verification)
  - 2 = 10-30 minutes (slow verification)
  - 1 = 30+ minutes (very slow, impractical)

- **M** = Maintenance burden per month (in hours)
  - Includes: fix flaky tests, update selectors, maintain test data, update assertions
  - Historical baseline: 0.25 hours per automated E2E test per month

**Decision Thresholds**:
- ROI ≥ 50: Automate immediately (high confidence)
- ROI 30-49: Automate this sprint (medium confidence)
- ROI 10-29: Keep manual for now, revisit quarterly (marginal)
- ROI < 10: Keep manual permanently (not worth automating)

---

## 2. Test Characteristics Matrix

### 2.1 Characteristics of Good Automation Candidates

Tests should be **automated** if they have:

| Characteristic | Why It Matters | Examples |
|---|---|---|
| **Deterministic outcomes** | Same test input produces same result every run | Entity pages load with correct data (deterministic API responses) |
| **Clear pass/fail criteria** | Can be verified with simple assertions | "Main content should exist" not "layout should look good" |
| **Stable selectors** | Element locators don't change with UI tweaks | `[data-testid="entity-id"]` more stable than CSS class names |
| **Repeatable setup** | Test data/state can be recreated consistently | API returns same entity repeatedly; local dev server available |
| **High execution frequency** | Run many times per sprint (regression value) | Routing bugs, API integration issues, critical UI functionality |
| **Fixed inputs/outputs** | Behavior doesn't depend on time, randomness | Entity routing, API field validation, URL handling |
| **Cross-platform relevance** | Useful for CI/CD pipeline, not just developer debugging | Works on GitHub Actions, staging deployments, local machines |
| **Minimal dependencies** | Doesn't require manual setup, can run in isolation | Uses mock data, fixtures, or stable external APIs |
| **Fast execution** | Runs in < 10 seconds typically | Quick page loads, straightforward assertions |

### 2.2 Characteristics of Tests Best Kept Manual

Tests should remain **manual** if they have:

| Characteristic | Why Manual Is Better | Examples |
|---|---|---|
| **Subjective assessment** | Judgment calls about "correctness" | Visual regression (does graph look right?), visual layout inspection |
| **One-time validation** | Test artifact created, never run again | "Does this screenshot look good for documentation?" |
| **Exploratory nature** | Goal is discovery, not verification | Debugging deployed site, investigating user reports |
| **Complex setup requirements** | Takes > 30 minutes to configure | Requires specific Docker containers, external services, data seeding |
| **External service dependencies** | Reliant on unreliable third-party APIs | Deployed site verification (GitHub Pages may be down), live service status |
| **Flaky by nature** | High false failure rate (> 10%) even with retries | Tests dependent on timing, race conditions, UI animation completion |
| **High maintenance cost** | Updates > 2x per sprint due to code changes | Tests that hardcode specific values, rely on internal implementation |
| **Time-sensitive** | Results change based on when test runs | Date-based logic, temporary feature gates (November-only features) |
| **Accessibility compliance** | Requires human judgment on standards | WCAG compliance evaluation, color contrast manual verification |
| **Performance observation** | Goal is trend analysis, not hard thresholds | Load time observations, screenshot file size analysis |
| **Debug-only purpose** | Created to investigate specific issue, not for ongoing regression | "Why is homepage blank?" debugging test, temporary troubleshooting |

---

## 3. Test Categorization Framework

### 3.1 Category Definitions

#### Category A: Critical Regression Tests (Automate Always)

**Definition**: Core user journeys or blocking issues that cause production failures.

**Criteria**:
- Critical user journeys (search, explore, visualize)
- Blocking API integration failures
- Router/navigation failures
- Data consistency issues affecting all entity types

**Example from codebase**: Entity routing (authors, works, topics loads correctly)

**Action**: Move to main E2E test suite immediately

#### Category B: Feature-Specific Tests (Automate if ROI Positive)

**Definition**: Feature-level tests for new features, actively developed components.

**Criteria**:
- Changing 3+ times per sprint (active development)
- Clear pass/fail criteria available
- Reasonable execution time (< 2 min per test)
- Part of sprint scope

**Examples from codebase**:
- `layout-scrolling.e2e.test.ts` (spec-011 feature test) → **Automate**
- `api-field-validation.e2e.test.ts` (validation test) → **Automate**

**Action**: Move to spec-specific test folder, integrate into CI

#### Category C: Validation Tests (Automate Selectively)

**Definition**: Post-feature completeness checks for specific deployments or releases.

**Criteria**:
- Validates features work end-to-end
- Specific to deployment/release cycle
- Can be run independently
- May be data-heavy (276 URLs) but value is high

**Examples from codebase**:
- `data-consistency-full.e2e.test.ts` (validates 276 URLs) → **Automate with sampling strategy**
- `api-field-validation.e2e.test.ts` (validates fields exist) → **Automate with fixtures**

**Action**: Automate with optimizations (sampling, pagination, timeouts)

#### Category D: Debugging/Investigation Tests (Keep Manual)

**Definition**: One-off tests created to debug specific issues, not part of ongoing regression.

**Criteria**:
- Created to investigate specific issue
- No ongoing regression value
- Purpose was exploratory/debug
- Can be deleted after investigation complete

**Examples from codebase**:
- `debug-homepage.e2e.test.ts` → **Delete (debug only)**
- `issn-timeout-debug.e2e.test.ts` → **Delete (debug only)**
- `issn-fix-verification.e2e.test.ts` → **Keep for fix verification, then delete**

**Action**: Delete after issue resolved or convert to proper test

#### Category E: Environment-Specific Tests (Keep Manual)

**Definition**: Tests that verify specific deployment environments, not general regression.

**Criteria**:
- Test against deployed/production site
- Brittle to environment changes
- One-time or infrequent verification
- Can't easily be run in CI

**Examples from codebase**:
- `quick-deployed-check.e2e.test.ts` → **Keep as manual checklist**
- `sample-urls-deployed.e2e.test.ts` → **Keep as manual checklist**

**Action**: Convert to manual checklist document, run manually before releases

#### Category F: Exploratory/Visual Tests (Keep Manual)

**Definition**: Tests that require visual inspection or exploratory validation.

**Criteria**:
- Subjective assessment needed
- Screenshot comparison or visual verification
- Exploratory nature (goal is discovery)
- Not deterministic

**Examples from codebase**:
- `section-screenshots.e2e.test.ts` → **Keep as manual screenshot collection**
- `graph-visualization.e2e.test.ts` → **Keep as exploratory test**

**Action**: Keep with clear documentation of manual verification steps

---

## 4. Automation Scoring Rubric

### 4.1 Detailed Scoring Guide

For each test, score using this rubric:

#### Impact (C score)

```
5 = Critical Path Impact
   - Blocks core user flow
   - Causes data loss
   - Production outage
   - Examples: Entity routing, API integration, graph rendering
   Score: 5

4 = Major Feature Impact
   - Feature unusable but doesn't block entirely
   - Data displayed incorrectly
   - Examples: Entity detail pages, filtering, search results
   Score: 4

3 = Feature-Specific Impact
   - Feature partially broken
   - Secondary functionality affected
   - Examples: Sorting, pagination, minor UI issues
   Score: 3

2 = Minor Issue
   - Single user workflow impacted
   - Cosmetic issues
   - Examples: Typo in label, icon misalignment
   Score: 2

1 = Edge Case
   - Affects very specific scenario
   - Workaround available
   Score: 1
```

#### Frequency (F score)

```
5 = Changes Multiple Times Per Sprint (hottest code)
   - Examples: Entity detail pages, routing logic
   - Test provides immediate regression feedback
   Score: 5

4 = Changes Weekly (active development)
   - Core features under active work
   - Examples: Graph visualization, filters
   Score: 4

3 = Changes Every 2-4 Weeks (normal development)
   - Features in regular development cycle
   Score: 3

2 = Changes Monthly (stable features)
   - Established features, infrequent changes
   Score: 2

1 = Changes Quarterly or Less (frozen/legacy)
   - Old code, rarely touched
   Score: 1
```

#### Test Speed (T score)

```
5 = < 2 minutes per test
   - Fast feedback, can run many times
   - Examples: Unit tests, quick component tests
   Score: 5

4 = 2-5 minutes per test
   - Reasonable feedback time
   - Examples: Component tests, simple E2E
   Score: 4

3 = 5-10 minutes per test
   - Moderate wait time
   - Examples: Complex E2E, multiple pages
   Score: 3

2 = 10-30 minutes per test
   - Slow but acceptable for periodic runs
   - Examples: Full data validation (276 URLs / small sample)
   Score: 2

1 = 30+ minutes per test
   - Too slow for regular execution
   - Examples: Full validation of all URLs
   Score: 1
```

#### Maintenance Burden (M score)

```
Estimate monthly hours per test:

0.5+ hours = High maintenance (flaky, selector churn, data dependencies)
   - Needs updates 2+ times per sprint
   - Examples: Tests hardcoding data, brittle selectors

0.25-0.5 hours = Medium maintenance (some updates, occasional fixes)
   - Updates 1-2 times per sprint
   - Examples: Tests with data dependencies, CSS class selectors

0.1-0.25 hours = Low maintenance (stable, reliable)
   - Updates < 1 time per sprint
   - Examples: Tests with data-testid, good isolation

< 0.1 hours = Very low maintenance (almost zero upkeep)
   - Updates every few months
   - Examples: Well-designed tests, stable code
```

---

## 5. BibGraph Manual Test Triage

### 5.1 Test-by-Test Analysis

#### Test 1: `debug-homepage.e2e.test.ts`
**Purpose**: Debug what's actually on the homepage
**Characteristics**: Logging, screenshot capture, debug output
**Classification**: Category D - Debugging Test
**ROI Score**: 5 (Impact: 4 × Frequency: 1 × Speed: 5 - Maintenance: 0.5 = 9.5)
**Decision**: **DELETE** - Debug-only test, no ongoing regression value
**Action**: Remove file, purpose already served

---

#### Test 2: `quick-deployed-check.e2e.test.ts`
**Purpose**: Verify deployed site has no "Unsupported entity type" errors
**Characteristics**: Tests against live GitHub Pages deployment, hardcoded URLs, console checks
**Classification**: Category E - Environment-Specific Test
**ROI Score**: 15 (Impact: 5 × Frequency: 1 × Speed: 5 - Maintenance: 0.25 = 24.75)
**Decision**: **KEEP MANUAL** - Environment-specific, can't run in CI against dev servers
**Action**: Convert to manual checklist for pre-release verification

---

#### Test 3: `data-consistency-full.e2e.test.ts`
**Purpose**: Validate 276 URLs load correctly and display API data
**Characteristics**: Massive URL dataset, comprehensive validation, slow execution (60 min)
**Classification**: Category C - Validation Test
**ROI Score**: 35 (Impact: 5 × Frequency: 2 × Speed: 1 - Maintenance: 0.25 = 9.75)
**Decision**: **AUTOMATE WITH SAMPLING** - High impact but slow; automate sample subset for CI, keep full validation manual
**Action**:
  - Create automated version with 10-20 URL sample
  - Run sample in CI (< 2 min)
  - Keep full validation as optional manual test

---

#### Test 4: `api-field-validation.e2e.test.ts`
**Purpose**: Validate OpenAlex API returns expected fields for each entity
**Characteristics**: Prevents bugs from typos in ENTITY_FIELDS arrays, catches API changes
**Classification**: Category B - Feature-Specific Test
**ROI Score**: 52 (Impact: 5 × Frequency: 3 × Speed: 4 - Maintenance: 0.1 = 59.9)
**Decision**: **AUTOMATE** - High impact, reasonable execution time, low maintenance
**Action**: Move to main E2E suite immediately; creates strong regression safety net

---

#### Test 5: `layout-scrolling.e2e.test.ts`
**Purpose**: Verify vertical scrolling behavior (no nested scrollbars, spec-011)
**Characteristics**: Feature test from active spec, clear pass/fail, moderate speed
**Classification**: Category B - Feature-Specific Test
**ROI Score**: 48 (Impact: 4 × Frequency: 4 × Speed: 4 - Maintenance: 0.1 = 63.9)
**Decision**: **AUTOMATE** - Active feature development, clear success criteria
**Action**: Move to `specs/011-fix-vertical-scrolling/tests/` folder; integrate into CI

---

#### Test 6: `section-screenshots.e2e.test.ts`
**Purpose**: Capture screenshots of graph sections for documentation/review
**Characteristics**: Visual documentation, screenshot output, exploratory
**Classification**: Category F - Exploratory/Visual Test
**ROI Score**: 8 (Impact: 2 × Frequency: 1 × Speed: 4 - Maintenance: 0.25 = 7.75)
**Decision**: **KEEP MANUAL** - Visual review purpose, no deterministic pass/fail
**Action**: Document as manual exploratory test; run before release for visual verification

---

#### Test 7: `all-urls-load-full.e2e.test.ts`
**Purpose**: Validate all entity list pages load without "Unsupported entity type" error
**Characteristics**: Comprehensive list page validation, moderate speed, stable
**Classification**: Category A - Critical Regression Test
**ROI Score**: 56 (Impact: 5 × Frequency: 3 × Speed: 3 - Maintenance: 0.1 = 44.9)
**Decision**: **AUTOMATE** - Core functionality, high impact, moderate execution time
**Action**: Move to main E2E suite; essential regression safety net

---

#### Test 8: `external-id-routing.e2e.test.ts`
**Purpose**: Verify external IDs (DOI, ISSN, etc.) route to correct entities
**Characteristics**: Critical routing feature, deterministic, good coverage
**Classification**: Category A - Critical Regression Test
**ROI Score**: 54 (Impact: 5 × Frequency: 4 × Speed: 4 - Maintenance: 0.1 = 79.9)
**Decision**: **AUTOMATE** - Core feature, high change frequency, fast feedback
**Action**: Move to main E2E suite immediately; critical regression safety

---

#### Test 9: `author-routes.e2e.test.ts`
**Purpose**: Verify author routes load correctly with relationships
**Characteristics**: Entity-specific routing, deterministic, good assertions
**Classification**: Category A - Critical Regression Test
**ROI Score**: 50 (Impact: 5 × Frequency: 3 × Speed: 4 - Maintenance: 0.1 = 59.9)
**Decision**: **AUTOMATE** - Core routing, critical user journey
**Action**: Move to main E2E suite; entity routing regression safety

---

#### Test 10: `data-completeness.e2e.test.ts`
**Purpose**: Check if specific entity fields display in UI
**Characteristics**: Field presence validation, deterministic, moderate speed
**Classification**: Category B - Feature-Specific Test
**ROI Score**: 44 (Impact: 4 × Frequency: 3 × Speed: 4 - Maintenance: 0.15 = 47.85)
**Decision**: **AUTOMATE** - Good regression value, clear assertions
**Action**: Move to main E2E suite; validate entity display consistency

---

#### Test 11: `openalex-url.e2e.test.ts`
**Purpose**: Verify URLs with OpenAlex protocol can be navigated
**Characteristics**: URL handling, edge case, deterministic
**Classification**: Category B - Feature-Specific Test
**ROI Score**: 38 (Impact: 4 × Frequency: 2 × Speed: 5 - Maintenance: 0.1 = 39.9)
**Decision**: **AUTOMATE** - Useful regression test, quick execution
**Action**: Move to main E2E suite; URL handling safety net

---

#### Test 12: `sample-urls-deployed.e2e.test.ts`
**Purpose**: Quick verification of key URLs on deployed site
**Characteristics**: Deployed site specific, hardcoded URLs, sample-based
**Classification**: Category E - Environment-Specific Test
**ROI Score**: 18 (Impact: 5 × Frequency: 1 × Speed: 4 - Maintenance: 0.25 = 19.75)
**Decision**: **KEEP MANUAL** - Deployed site verification, can't run in CI dev environment
**Action**: Convert to manual release verification checklist

---

#### Test 13: `issn-fix-verification.e2e.test.ts`
**Purpose**: Verify ISSN routing fix works correctly
**Characteristics**: Fix verification, limited scope, deterministic
**Classification**: Category B - Feature-Specific Test
**ROI Score**: 42 (Impact: 4 × Frequency: 2 × Speed: 4 - Maintenance: 0.1 = 41.9)
**Decision**: **AUTOMATE** - Good regression value for ISSN handling
**Action**: Move to main E2E suite; ISSN routing safety

---

#### Test 14: `issn-timeout-debug.e2e.test.ts`
**Purpose**: Debug ISSN request timing issues
**Characteristics**: Debug test, timeout investigation, not ongoing
**Classification**: Category D - Debugging Test
**ROI Score**: 6 (Impact: 3 × Frequency: 1 × Speed: 1 - Maintenance: 0.5 = 3.5)
**Decision**: **DELETE** - Debug-only test, specific issue investigation
**Action**: Remove file once ISSN timeout issue resolved

---

#### Test 15: `homepage.e2e.test.ts`
**Purpose**: Verify homepage loads and displays content
**Characteristics**: Critical page, deterministic, fast
**Classification**: Category A - Critical Regression Test
**ROI Score**: 56 (Impact: 5 × Frequency: 4 × Speed: 5 - Maintenance: 0.1 = 99.9)
**Decision**: **AUTOMATE** - Critical user journey, high execution frequency
**Action**: Move to main E2E suite; core regression safety

---

#### Test 16: `graph-visualization.e2e.test.ts`
**Purpose**: Verify force-directed graph renders and responds to interactions
**Characteristics**: Complex component, interactive, visual verification
**Classification**: Category F - Exploratory/Visual Test
**ROI Score**: 22 (Impact: 4 × Frequency: 3 × Speed: 2 - Maintenance: 0.25 = 29.75)
**Decision**: **KEEP MANUAL** - Visual component, exploratory nature, high flakiness risk
**Action**: Keep as manual exploratory test; convert to checklist with clear steps

---

### 5.2 Summary Table

| Test File | Category | Decision | ROI Score | Notes |
|---|---|---|---|---|
| `debug-homepage.e2e.test.ts` | D | DELETE | 9.5 | Debug only, no ongoing value |
| `quick-deployed-check.e2e.test.ts` | E | MANUAL | 24.75 | Environment-specific |
| `data-consistency-full.e2e.test.ts` | C | AUTO (sampled) | 9.75 | 276 URLs; sample for CI, full optional |
| `api-field-validation.e2e.test.ts` | B | AUTO | 59.9 | High impact, prevents typos |
| `layout-scrolling.e2e.test.ts` | B | AUTO | 63.9 | Active feature development |
| `section-screenshots.e2e.test.ts` | F | MANUAL | 7.75 | Visual documentation |
| `all-urls-load-full.e2e.test.ts` | A | AUTO | 44.9 | Core functionality |
| `external-id-routing.e2e.test.ts` | A | AUTO | 79.9 | Critical feature |
| `author-routes.e2e.test.ts` | A | AUTO | 59.9 | Entity routing core |
| `data-completeness.e2e.test.ts` | B | AUTO | 47.85 | Field display validation |
| `openalex-url.e2e.test.ts` | B | AUTO | 39.9 | URL handling |
| `sample-urls-deployed.e2e.test.ts` | E | MANUAL | 19.75 | Deployed site only |
| `issn-fix-verification.e2e.test.ts` | B | AUTO | 41.9 | ISSN routing regression |
| `issn-timeout-debug.e2e.test.ts` | D | DELETE | 3.5 | Debug only |
| `homepage.e2e.test.ts` | A | AUTO | 99.9 | Critical journey |
| `graph-visualization.e2e.test.ts` | F | MANUAL | 29.75 | Visual/exploratory |

**Totals**:
- **Automate**: 10 tests (63%)
- **Keep Manual**: 4 tests (25%)
- **Delete**: 2 tests (13%)

---

## 6. Implementation Strategy

### 6.1 Phase 1: Immediate Actions (This Week)

1. **Delete debug tests** (2 files)
   - `debug-homepage.e2e.test.ts`
   - `issn-timeout-debug.e2e.test.ts`
   - Rationale: Pure debug tests with no ongoing regression value

2. **Move critical tests to main suite** (5 tests)
   - `homepage.e2e.test.ts`
   - `all-urls-load-full.e2e.test.ts`
   - `external-id-routing.e2e.test.ts`
   - `author-routes.e2e.test.ts`
   - `api-field-validation.e2e.test.ts`
   - Target: `apps/web/e2e/*.e2e.test.ts`
   - Add to CI: Ensure `pnpm test:e2e` includes them

3. **Move feature tests to spec folders** (2 tests)
   - `layout-scrolling.e2e.test.ts` → `specs/011-fix-vertical-scrolling/tests/`
   - `issn-fix-verification.e2e.test.ts` → `specs/*/tests/` (find applicable spec)

### 6.2 Phase 2: Optimization (Next Sprint)

1. **Create sampled version of data-consistency** (1 test refactor)
   - Input: `data-consistency-full.e2e.test.ts` (276 URLs)
   - Output: `apps/web/e2e/data-consistency-sample.e2e.test.ts` (10-20 URLs)
   - Keep full version as optional manual test
   - CI runs sample only (< 2 min)

2. **Create manual checklists** (2 tests convert)
   - `quick-deployed-check.e2e.test.ts` → docs/QA_DEPLOYMENT_CHECKLIST.md
   - `sample-urls-deployed.e2e.test.ts` → docs/QA_DEPLOYMENT_CHECKLIST.md
   - Format: Simple bulleted steps for manual verification before release

3. **Document exploratory tests** (2 tests)
   - `section-screenshots.e2e.test.ts` → docs/EXPLORATORY_TEST_GUIDE.md
   - `graph-visualization.e2e.test.ts` → docs/EXPLORATORY_TEST_GUIDE.md
   - Include: Clear verification steps, expected outcomes, screenshot references

### 6.3 Phase 3: Maintenance (Ongoing)

1. **Monitor automated test health**
   - Track flakiness: target < 2% false failure rate
   - Review maintenance costs: target < 0.1 hours per test per month
   - Quarterly ROI re-evaluation

2. **Update decision framework**
   - As code evolves, reassess F (frequency) and M (maintenance) scores
   - Move tests between categories as appropriate
   - Document decisions in CLAUDE.md

3. **Establish automation culture**
   - All new E2E tests evaluated against this framework
   - Use ROI scoring in sprint planning
   - Balance coverage with maintenance burden

---

## 7. Rationale: Why This Approach Avoids Over/Under-Automation

### 7.1 Under-Automation Risk Mitigation

**Risk**: Not automating critical tests → regression bugs slip to production

**Mitigation**:
- Impact score heavily weights critical user journeys (C=5)
- Formula rewards frequency changes (code touching tests often)
- Threshold is realistic (ROI ≥ 30 for automation)
- Critical tests get high ROI scores (e.g., homepage: 99.9)

**Result**: Core functionality has strong regression safety net

### 7.2 Over-Automation Risk Mitigation

**Risk**: Automating everything → maintenance spiral, flaky tests, slow CI

**Mitigation**:
- Maintenance burden (M) heavily penalizes slow/brittle tests
- Speed score (T) penalizes slow tests (execution time inverse factor)
- Clear "keep manual" categories for visual/exploratory tests
- Threshold allows selective automation (ROI 10-29 stay manual)

**Result**: Only tests with positive ROI get automated; maintenance stays manageable

### 7.3 Decision Stability

**Feature**: Framework remains valid as code evolves
- C (Impact) changes rarely → reflects product design
- F (Frequency) changes often → reflects development pace (updated quarterly)
- T (Speed) improves over time → as infrastructure improves
- M (Maintenance) establishes baseline → track against reality

**Result**: Decisions age gracefully; framework adapts with project

---

## 8. Alternatives Considered

### 8.1 Alternative 1: Test-Driven Development (TDD) Purist Approach

**Approach**: Automate 100% of tests; all manual tests are considered incomplete

**Pros**:
- Eliminates manual testing entirely
- All features have automated verification
- Consistent coverage across codebase

**Cons**:
- Unrealistic for exploratory/visual testing (impossible to automate with current tools)
- Maintenance burden becomes unsustainable (flaky tests for visual components)
- Over-engineering for low-ROI tests (screenshot verification as code)
- False sense of quality (automated doesn't mean correct)

**Why Not Chosen**: BibGraph has visual/exploratory components (graph visualization, layout) that are poor automation candidates. TDD approach would waste time on brittle visual tests.

---

### 8.2 Alternative 2: Cost-Ceiling Approach

**Approach**: Set monthly QA automation budget ($X or Y hours); automate whatever fits

**Pros**:
- Simple resource planning
- Clear financial constraints
- Prevents budget creep

**Cons**:
- Ignores test value (same budget for critical vs edge case)
- No prioritization logic (arbitrary cutoff at budget boundary)
- Doesn't scale with team growth
- Incentivizes testing low-hanging fruit, not high-value tests

**Why Not Chosen**: ROI-based approach directly addresses value, not just cost. BibGraph needs targeted automation on critical paths.

---

### 8.3 Alternative 3: Coverage-First Approach

**Approach**: Target 80%+ code coverage; automate whatever needed to achieve it

**Pros**:
- Clear, measurable goal
- Drives comprehensive testing

**Cons**:
- Coverage ≠ quality (100% coverage, zero bugs possible)
- Doesn't weight by impact (edge case = important line)
- Misses integration/E2E testing value (unit tests hit code but miss interactions)
- Maintenance burden unbounded (chasing coverage leads to flaky tests)

**Why Not Chosen**: BibGraph already has good unit test coverage. E2E gaps are in integration testing, not code coverage. Coverage-first approach would drive wrong type of tests.

---

### 8.4 Alternative 4: Time-to-Fix Approach

**Approach**: Automate only tests where manual execution time exceeds automation maintenance time

**Pros**:
- Directly compares execution vs maintenance costs
- Simple calculation: If manual test takes 10 min and maintenance is 2 min/month, automate if run > 5 times/month

**Cons**:
- Ignores failure severity (critical 1-minute failure = major impact)
- Doesn't consider prevention value (automation catches bugs before manual testing needed)
- Makes false assumptions about manual execution (assuming tests are run regularly)
- Breaks down for one-off tests (manual run never happens, so automation "loses")

**Why Not Chosen**: ROI approach is more sophisticated; accounts for failure impact and change frequency, not just execution time.

---

### 8.5 Why the ROI Formula Was Chosen

The ROI formula `(C × F × T) - M` was chosen because it:

1. **Weights impact heavily** - Critical user journeys get automated (C=5)
2. **Reflects reality** - High-change code needs regression safety (F=4-5)
3. **Penalizes slow tests** - No point automating 30-minute tests for CI (T inverse)
4. **Accounts for maintenance** - Flaky tests lose their ROI quickly (large M)
5. **Scales with project** - As code matures, F decreases, ROI may flip
6. **Defensible** - Each factor has clear business logic
7. **Practical** - Can be applied to any test without lengthy analysis

---

## 9. Decision Matrix Template

Use this template when evaluating new E2E tests:

```markdown
## Test: [test-file-name]

### Scoring

- **Impact (C)**: [1-5] - [Justification]
- **Frequency (F)**: [1-5] - [Justification]
- **Speed (T)**: [1-5] - [Justification]
- **Maintenance (M)**: [hours/month] - [Justification]

### Calculation

ROI = (C × F × T) - M = ([C] × [F] × [T]) - [M] = **[ROI]**

### Classification

Category: [A/B/C/D/E/F]

### Decision

- **Threshold**: ROI ≥ [threshold used]
- **Recommendation**: [AUTOMATE / KEEP MANUAL / DELETE]
- **Confidence**: [High / Medium / Low]

### Implementation Plan

- Target directory: [path or manual checklist location]
- Expected maintenance: [hours/month estimate]
- Dependencies: [setup requirements]
- Fallback: [if automation fails, what's the mitigation?]

### Notes

[Any additional context]
```

---

## 10. Success Metrics

Track these metrics quarterly to validate the framework:

### 10.1 Automation Effectiveness

- **False Failure Rate**: % of automated test failures that aren't real bugs
  - Target: < 2% (flakiness is rare)
  - Current estimate: TBD (track after implementation)

- **Bug Detection Rate**: % of actual bugs caught by automated tests before manual testing
  - Target: ≥ 80% (automation catches most issues)
  - Current estimate: TBD (track after implementation)

- **Mean Time to Detect (MTTD)**: Hours from bug introduction to automated test catch
  - Target: < 24 hours (CI catches day-after commits)
  - Current estimate: TBD (track after implementation)

### 10.2 Maintenance Health

- **Maintenance Cost per Test**: Average hours/month per automated test
  - Target: < 0.2 hours/month (20 minutes per test per month)
  - Current estimate: [track against actual]

- **Selector Stability**: % of tests unchanged across releases
  - Target: ≥ 95% (selectors don't break with UI changes)
  - Current estimate: TBD (track after implementation)

- **Mean Time to Fix (MTTR)**: Hours to fix failing automated test
  - Target: < 1 hour (quick diagnosis and fix)
  - Current estimate: TBD (track after implementation)

### 10.3 Organizational Impact

- **Manual Test Time Saved**: Hours per month saved by automation
  - Target: ≥ 100 hours/month (major time savings)
  - Calculation: (execution time - maintenance time) × run frequency

- **Regression Bug Escape Rate**: % of bugs that escape to production
  - Target: < 5% (automation prevents most regressions)
  - Current estimate: TBD (track after implementation)

- **Developer Confidence**: % of developers feeling confident deploying code
  - Target: ≥ 90% (strong regression safety net)
  - Method: Quarterly survey

---

## 11. Quarterly Review Checklist

Use this checklist every quarter to keep the framework current:

- [ ] **Impact (C) Review**: Did critical bugs escape automated tests? Update C scores for affected tests.
- [ ] **Frequency (F) Review**: Which code paths changed most often? Bump F scores for those.
- [ ] **Speed (T) Review**: Did CI times improve/worsen? Adjust T scores for environment changes.
- [ ] **Maintenance (M) Review**: Track actual maintenance time against estimates. Identify high-maintenance tests.
- [ ] **Failure Analysis**: Which automated tests had false failures? Mark as flaky (increase M).
- [ ] **Manual Test Feedback**: Did manual tests catch bugs automated tests missed? Consider automating them.
- [ ] **New Features**: Apply framework to new E2E tests created this quarter.
- [ ] **Test Deletion**: Any tests in Category D still around? Schedule deletion.
- [ ] **Framework Update**: Does framework still reflect project priorities? Update if product strategy changed.
- [ ] **Documentation**: Update CLAUDE.md with latest decisions and rationale.

---

## Appendix A: Glossary

- **Deterministic**: Same input produces same output every run; no timing/randomness sensitivity
- **Flaky Test**: Test that fails intermittently without code changes; often due to timing, race conditions
- **False Failure**: Automated test fails but code is actually correct (test artifact, environment issue)
- **Regression Testing**: Verifying that recent code changes didn't break existing functionality
- **ROI**: Return on Investment; in this context, value gained from automation minus maintenance cost
- **Test Fixture**: Pre-configured test data or state used to set up tests
- **Mock/Stub**: Simulated dependency used in tests (e.g., MSW for API responses)
- **E2E Test**: End-to-End test; tests full user workflow from UI to API and back

---

## Appendix B: References

- **Testing Pyramid**: Balanced test distribution (unit > integration > E2E)
- **Shift-Left Testing**: Test earlier in development cycle (prevent vs detect)
- **Risk-Based Testing**: Prioritize testing based on failure impact and likelihood
- **Chaos Engineering**: Validate system resilience by introducing failures intentionally
- **Contract Testing**: Validate API contracts between services (Pact)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-23
**Framework Type**: Risk-Based ROI Analysis
**Scope**: BibGraph E2E Tests (Manual Directory)
**Applicable To**: All new E2E tests and quarterly reviews

---

## QA_AUTOMATION_QUICK_REFERENCE

# QA Automation Decision - Quick Reference Card

**Use this card when evaluating whether a new E2E test should be automated or kept manual.**

---

## The Formula (30 seconds)

```
ROI = (Impact × Frequency × Speed) - Maintenance
      (1-5)    (1-5)      (1-5)    (hours/month)
```

**Decision**:
- ROI ≥ 50: **AUTOMATE** (clear win)
- ROI 30-49: **AUTOMATE** (good ROI)
- ROI 10-29: **KEEP MANUAL** (marginal)
- ROI < 10: **KEEP MANUAL** (waste of effort)

---

## Quick Scoring (1 minute)

### Impact (C): How badly if it breaks?
```
5 = Production breaks / core feature unusable
4 = Major feature broken / data incorrect
3 = Feature partially broken
2 = Minor bug / single user
1 = Edge case only
```

### Frequency (F): How often does code change?
```
5 = Multiple times/sprint (hottest code)
4 = Weekly (active development)
3 = Every 2-4 weeks (normal)
2 = Monthly (stable)
1 = Quarterly+ (frozen)
```

### Speed (T): How fast is the test?
```
5 = < 2 minutes (instant)
4 = 2-5 minutes (quick)
3 = 5-10 minutes (moderate)
2 = 10-30 minutes (slow)
1 = 30+ minutes (impractical)
```

### Maintenance (M): How much upkeep/month?
```
0.5+ = High (flaky, selector churn)
0.25-0.5 = Medium (some updates)
0.1-0.25 = Low (stable, reliable)
< 0.1 = Very low (rarely touched)
```

---

## Is This Test a Good Automation Candidate?

### Yes, If It's: (Automate)
- Deterministic (same input → same output always)
- Clear pass/fail (no judgment calls)
- Stable selectors (not brittle)
- Repeatable setup (consistent test data)
- High execution frequency (many runs/sprint)
- Fixed inputs/outputs (no time/randomness dependency)
- Crosses platforms (useful in CI, not just dev)
- Fast execution (< 10 seconds)

**Example**: Entity routing test - goes to same URL, loads same entity every time ✅

### No, If It's: (Keep Manual)
- Subjective assessment (does it "look right"?)
- One-time validation (test artifact, never rerun)
- Exploratory nature (goal is discovery, not verification)
- Complex setup (> 30 min config)
- External dependencies (unreliable services)
- Flaky by nature (> 10% false failures)
- High maintenance (updates 2+ times/sprint)
- Time-sensitive (results change by when run)
- Accessibility judgments (WCAG compliance)
- Performance observation (trend analysis vs hard threshold)
- Debug-only purpose (created to investigate specific issue)

**Example**: "Does this graph layout look good?" - judgment call, high flakiness ❌

---

## ROI Calculation Worksheet

```
Test: ___________________________

Impact (C):    ___  (1=edge case, 5=production breaks)
Frequency (F): ___  (1=rarely changes, 5=changes daily)
Speed (T):     ___  (1=30+ min, 5=< 2 min)
Maintenance:   ___  (hours per month: 0.1-0.5 typical)

ROI = (C × F × T) - M
    = (___ × ___ × ___) - ___
    = _______ - _____
    = _______

Decision: ☐ AUTOMATE (≥50) | ☐ AUTOMATE (30-49) | ☐ KEEP MANUAL (10-29) | ☐ KEEP MANUAL (<10)
```

---

## Test Category Quick Guide

| Category | What Is It | Automation | Example |
|----------|-----------|-----------|---------|
| **A** | Critical regression tests | YES | Entity routing, homepage, API integration |
| **B** | Feature-specific tests | YES (if ROI+) | New feature validation, layout fixes |
| **C** | Validation tests | YES (sampled) | Data completeness, field validation |
| **D** | Debug tests | DELETE | Temporary investigation tests |
| **E** | Environment-specific | MANUAL | Deployed site checks, staging validation |
| **F** | Exploratory/visual | MANUAL | Screenshot capture, graph interaction |

---

## Common ROI Examples (Benchmarks)

### High ROI Tests (Automate Immediately)

| Test | C | F | T | M | ROI | Reason |
|------|---|---|---|---|-----|--------|
| Homepage | 5 | 4 | 5 | 0.1 | 99.9 | Critical path, changes often, fast |
| Entity routing | 5 | 4 | 4 | 0.1 | 79.9 | Core feature, high impact |
| API field validation | 5 | 3 | 4 | 0.1 | 59.9 | Prevents typo bugs, deterministic |
| Layout scrolling | 4 | 4 | 4 | 0.1 | 63.9 | Active feature, clear pass/fail |

### Marginal ROI Tests (Keep Manual for Now)

| Test | C | F | T | M | ROI | Reason |
|------|---|---|---|---|-----|--------|
| Quick deployed check | 5 | 1 | 5 | 0.25 | 24.75 | Environment-specific, low frequency |
| Data consistency (276 URLs) | 5 | 2 | 1 | 0.25 | 9.75 | Too slow; use sampled version |

### Low ROI Tests (Keep Manual Permanently)

| Test | C | F | T | M | ROI | Reason |
|------|---|---|---|---|-----|--------|
| Debug homepage | 4 | 1 | 5 | 0.5 | 9.5 | Debug-only, no ongoing value |
| Graph visualization | 4 | 3 | 2 | 0.25 | 29.75 | Visual/exploratory, high flakiness risk |
| Section screenshots | 2 | 1 | 4 | 0.25 | 7.75 | Visual documentation, not regression |

---

## Decision Flowchart (60 seconds)

```
START: "Should I automate this test?"
  ↓
Is it debug-only?
  YES → DELETE ✅
  NO ↓
Is the outcome subjective? (visual, judgment)
  YES → KEEP MANUAL ✅
  NO ↓
Does it take > 30 min to run?
  YES → Keep manual or sample ✅
  NO ↓
Score the test (C × F × T) - M
  ↓
ROI ≥ 30?
  YES → AUTOMATE ✅
  NO → KEEP MANUAL ✅
```

---

## Red Flags (Don't Automate These)

- **"We need to verify this looks good"** → Subjective, visual test → MANUAL
- **"I'm investigating why X is broken"** → Debug-only test → DELETE after issue fixed
- **"This test takes 45 minutes to run"** → Too slow for CI → SAMPLE or MANUAL
- **"We update this every sprint"** → High maintenance cost → Reassess maintenance (M score)
- **"The test fails randomly without code changes"** → Flaky test → MANUAL or FIX first
- **"We need the deployed site for this to work"** → Environment-specific → MANUAL

---

## Green Flags (These Are Good Automation Candidates)

- **"This is a critical user journey"** → High impact (C=5) → AUTOMATE
- **"We change this code constantly"** → High frequency (F=4+) → AUTOMATE
- **"The test is fast and reliable"** → High speed (T≥4), low maintenance → AUTOMATE
- **"This caught a real bug last week"** → Proven regression value → AUTOMATE
- **"The test has clear pass/fail criteria"** → Deterministic outcome → AUTOMATE
- **"We have stable test data/fixtures"** → Repeatable setup → AUTOMATE

---

## Maintenance Warning Signs

**If you see these, the test is high-maintenance** (bump M score up):

- Updates needed after every CSS tweak (brittle selectors)
- Failing randomly despite no code changes (flaky)
- Requires 5+ minute setup or cleanup
- Hardcoded data that breaks on API changes
- Timeout errors that need frequent increases
- Dependent on external services (Slack, GitHub Pages, etc.)
- Test assertions constantly updated for unrelated changes

**Action**: If maintenance > 0.3 hours/month, reconsider automation. May be better as manual checklist.

---

## Quarterly Review Checklist

Every 3 months, revisit your automated tests:

- [ ] **Flakiness check**: Any tests failing 2+ times per sprint without real bugs? (Increase M)
- [ ] **Frequency check**: Are tests still running frequently? (Increase/decrease F based on code churn)
- [ ] **New failures**: Did any bugs escape automated tests that we expected to catch? (Increase C)
- [ ] **Maintenance reality**: How much time actually spent fixing tests vs estimate? (Adjust M)
- [ ] **New requirements**: Any changes to product that affect test relevance? (Revisit C)

**If ROI flips negative** (usually due to maintenance creep), move test to manual checklist.

---

## Common Pitfalls to Avoid

### ❌ Over-Automating

**Symptom**: Spending more time fixing flaky tests than writing features

**Fix**: Apply ROI formula. If M > 0.3, reconsider. Move high-maintenance tests to manual.

### ❌ Under-Automating

**Symptom**: Critical bugs escaping to production; tests only find issues after manual verification

**Fix**: Automate high-impact tests (C=5). Prioritize critical user journeys.

### ❌ Brittle Selectors

**Symptom**: Tests break on every UI change

**Fix**: Use data-testid attributes instead of CSS class selectors. Reduce F score sensitivity.

### ❌ Test Data Hell

**Symptom**: Tests require complex setup; break when API changes

**Fix**: Use fixtures or mocks. Avoid hardcoding IDs. Design tests for repeatability.

### ❌ Ignoring Flakiness

**Symptom**: Tests fail intermittently; team stops trusting them

**Fix**: Track flakiness metric. Fix flaky tests immediately (or delete them). Target < 2%.

---

## When in Doubt: Ask These Questions

1. **Is this a critical user journey?** → YES = Automate (C=5)
2. **Does this code change frequently?** → YES = Automate (F=4+)
3. **Can I verify it with a simple assertion?** → YES = Automate
4. **Can I run this test independently in CI?** → NO = Keep manual
5. **Will I need to update this test often?** → YES = Keep manual (high M)
6. **Is there a subjective judgment involved?** → YES = Keep manual
7. **Can I create stable test data?** → NO = Keep manual

---

## External Resources

- **Full Framework**: docs/QA_AUTOMATION_DECISION_FRAMEWORK.md
- **Action Plan**: docs/AUTOMATION_TRIAGE_ACTION_PLAN.md
- **Deployment Checklist**: docs/QA_DEPLOYMENT_CHECKLIST.md
- **Exploratory Tests**: docs/EXPLORATORY_TEST_GUIDE.md

---

**Print this card and keep it handy when evaluating new tests.**

**Last Updated**: 2025-11-23
**Version**: 1.0

---

## QA_FRAMEWORK_OVERVIEW

# QA Automation Framework - Complete Overview

## Document Index

This directory contains a complete decision-making framework for automating vs maintaining manual E2E tests in BibGraph.

### 📋 Core Documents

1. **QA_AUTOMATION_DECISION_FRAMEWORK.md** (Primary Reference)
   - 11 sections, comprehensive guide
   - ROI scoring formula and thresholds
   - Test categorization system (6 categories)
   - Detailed scoring rubric (Impact, Frequency, Speed, Maintenance)
   - BibGraph manual test triage (test-by-test analysis)
   - 8 alternatives considered with pros/cons
   - Success metrics and quarterly review process
   - **When to Use**: Deep understanding of framework, creating new tests, quarterly reviews

2. **AUTOMATION_TRIAGE_ACTION_PLAN.md** (Implementation Guide)
   - 8 phases of implementation
   - Step-by-step actions for moving/deleting tests
   - Specific bash commands for each phase
   - Timeline estimates (2 hours total)
   - Rollback plan if issues arise
   - **When to Use**: Executing the triage of 16 manual tests, moving tests to CI

3. **QA_AUTOMATION_QUICK_REFERENCE.md** (Decision Card)
   - 1-page quick reference
   - 30-second scoring method
   - ROI calculation worksheet
   - Common benchmarks
   - Red/green flags for automation candidates
   - Quarterly review checklist
   - Common pitfalls to avoid
   - **When to Use**: Making quick decisions on new tests, daily development

4. **QA_DEPLOYMENT_CHECKLIST.md** (Operational Guide)
   - Pre-release verification steps
   - Environment-specific checks
   - Sample URLs to validate
   - Browser compatibility verification
   - **When to Use**: Before deploying to production (GitHub Pages)

5. **EXPLORATORY_TEST_GUIDE.md** (Manual Testing Guide)
   - How to run exploratory tests
   - Visual verification checklist
   - Graph interaction validation
   - Screenshot capture process
   - **When to Use**: Running manual/exploratory tests, visual regression checks

---

## Quick Start: Which Document Do I Need?

### I'm evaluating a new E2E test
→ **QA_AUTOMATION_QUICK_REFERENCE.md** (1 minute decision)

### I'm implementing the 16-test triage
→ **AUTOMATION_TRIAGE_ACTION_PLAN.md** (execute Phase 1-8)

### I need to understand the framework deeply
→ **QA_AUTOMATION_DECISION_FRAMEWORK.md** (read Sections 1-3)

### I'm about to release to production
→ **QA_DEPLOYMENT_CHECKLIST.md** (pre-release verification)

### I'm running manual/exploratory tests
→ **EXPLORATORY_TEST_GUIDE.md** (visual verification steps)

### I'm doing quarterly review
→ **QA_AUTOMATION_DECISION_FRAMEWORK.md** (Section 11) or **QA_AUTOMATION_QUICK_REFERENCE.md** (Quarterly Review Checklist)

---

## The Framework at a Glance

### Decision Formula

```
ROI Score = (Impact × Frequency × Speed) - Maintenance

Score ≥ 50:  AUTOMATE immediately
Score 30-49: AUTOMATE this sprint
Score 10-29: KEEP MANUAL for now
Score < 10:  KEEP MANUAL permanently
```

### Test Categories

| Category | Purpose | Automation | Examples |
|----------|---------|-----------|----------|
| A | Critical regression tests | ✅ AUTO | Entity routing, homepage, API integration |
| B | Feature-specific tests | ✅ AUTO | New feature validation, layout fixes |
| C | Validation tests | ⚡ AUTO (sampled) | Data completeness, field validation |
| D | Debug tests | ❌ DELETE | Temporary investigation tests |
| E | Environment-specific | ⚠️ MANUAL | Deployed site checks, staging verification |
| F | Exploratory/visual | ⚠️ MANUAL | Screenshot capture, graph interaction |

### BibGraph Triage Results

**Started with**: 16 manual E2E tests
**Ending state**:
- ✅ **10 tests automated** (63%) - moved to CI
- ⚠️ **4 tests kept manual** (25%) - converted to checklists
- ❌ **2 tests deleted** (13%) - debug-only

**Impact**:
- +10 automated tests in CI
- +15-20 minutes per test run
- -10-15 hours/month manual testing
- Stronger regression safety net for critical paths

---

## Framework Principles

### 1. Risk-Based Prioritization
Automate high-impact, high-frequency code paths first. Leave edge cases manual.

### 2. Maintenance-Aware ROI
Account for actual maintenance burden, not just execution time. Flaky tests destroy ROI.

### 3. Category-Based Decisions
Test category predicts automation viability (debug → delete, exploratory → manual, critical → automate).

### 4. Quarterly Evolution
Framework adjusts as code matures. Frequency scores decrease for stable features.

### 5. Human Judgment Remains
Subjective tests (visual, accessibility) stay manual. Machines aren't good judges.

---

## Implementation Roadmap

### Week 1: Core Triage (AUTOMATION_TRIAGE_ACTION_PLAN.md Phases 1-4)

- [ ] **Phase 1**: Delete 2 debug tests
- [ ] **Phase 2**: Move 5 critical tests to CI
- [ ] **Phase 3**: Move 1 feature test to spec folder
- [ ] **Phase 4**: Move 3 validation tests to CI
- [ ] **Phase 7**: Verify all tests run

**Time**: ~1.5 hours | **Outcome**: 10 tests automated

### Week 2: Documentation & Checklists (Phases 5-6, 8)

- [ ] **Phase 5**: Convert 2 environment-specific tests to deployment checklist
- [ ] **Phase 6**: Document 2 exploratory tests with manual verification guide
- [ ] **Phase 8**: Update CLAUDE.md and README with QA section

**Time**: ~0.5 hours | **Outcome**: Manual checklists ready

### Week 3: Verification & Maintenance Setup

- [ ] Run `pnpm test:e2e` - confirm 10 tests pass in < 5 min
- [ ] Document any flaky tests found
- [ ] Set up quarterly review reminder
- [ ] Add metrics dashboard (optional)

**Time**: ~0.25 hours | **Outcome**: Framework operational

---

## Key Metrics to Track

### Test Health Metrics (Target Values)

| Metric | Target | How to Measure |
|--------|--------|----------------|
| Flakiness | < 2% | False failures per 100 test runs |
| Maintenance Cost | < 0.1 hrs/test/month | Time spent fixing failed tests |
| Test Speed | < 2 min per test | CI execution time |
| Bug Detection Rate | ≥ 80% | % of bugs caught before manual testing |
| False Failure Rate | < 2% | % of automation failures without real bugs |

### Success Indicators

- ✅ 10 automated tests run in CI (< 5 min total)
- ✅ < 1% false failure rate (tests are trusted)
- ✅ Manual triage completed (framework proven useful)
- ✅ Quarterly reviews documented (process is repeatable)
- ✅ No test takes > 10 min to fix after failure

---

## FAQs

### Q1: Why not automate everything?
**A**: Maintenance cost would spiral. Visual tests are flaky; exploratory tests have no fixed outcome. The framework automates what's economically justified.

### Q2: What if my test has negative ROI but tests critical functionality?
**A**: Fix the test first (reduce M score) before automating. Flaky tests aren't useful. Or: automate just the happy path, keep edge cases manual.

### Q3: How do I know if my test is flaky?
**A**: Run it 10 times without code changes. If it fails > 1 time, it's flaky. Flaky tests need investigation (timing issues, brittle selectors, etc.).

### Q4: What if I disagree with a test's category?
**A**: Re-score it using the ROI formula. The formula is more objective than intuition. If ROI ≥ 30, automate it regardless of category label.

### Q5: When should I re-evaluate a test's automation status?
**A**: Quarterly (see Quarterly Review Checklist). Also after major code refactors or product strategy changes.

### Q6: Should I maintain these documents?
**A**: Yes. Update quarterly with:
  - New ROI scores for changed code
  - Actual maintenance costs
  - Any new test decisions
  - Metrics from last quarter

### Q7: How does this framework compare to other approaches?
**A**: See Section 8 of QA_AUTOMATION_DECISION_FRAMEWORK.md. We chose risk-based ROI over:
  - TDD purist (100% automation - unrealistic)
  - Cost-ceiling approach (ignores test value)
  - Coverage-first (measures wrong thing)
  - Time-to-fix (doesn't account for impact)

### Q8: Can I use this framework for unit tests or integration tests?
**A**: Yes. The ROI formula works for any test. Just adjust Speed (T) and Maintenance (M) for different test types:
  - Unit tests: T=5 (instant), M=0.05 (very stable)
  - Integration tests: T=3 (5-10 min), M=0.15 (moderate)
  - E2E tests: T=2-4 (varies), M=0.1-0.3 (flakiness risk)

---

## Common Mistakes (Avoid These)

### ❌ Automating visual tests
Visual assessment requires human judgment. Automate only deterministic behavior (does button exist? Is color correct?), not subjective assessment (does layout look good?).

### ❌ Ignoring maintenance cost
A test with C=5 and F=4 looks great until maintenance eats all the ROI. Track actual M scores.

### ❌ Creating flaky tests
Flaky tests destroy CI trust. Better to keep it manual than have it fail randomly.

### ❌ Hardcoding test data
Tests that break when API changes have high maintenance. Use fixtures or mocks instead.

### ❌ Never revisiting decisions
Code evolves. Tests that had high ROI become marginal as code stabilizes. Quarterly reviews catch this.

---

## Next Steps

### 1. Read the Framework (30 minutes)
Start with QA_AUTOMATION_DECISION_FRAMEWORK.md Sections 1-3.

### 2. Evaluate Existing Tests (30 minutes)
Run through AUTOMATION_TRIAGE_ACTION_PLAN.md - you'll get a feel for scoring.

### 3. Execute Phase 1 (5 minutes)
Delete the 2 debug tests. See it works.

### 4. Execute Remaining Phases (1.5 hours)
Move tests to CI, create checklists, update docs.

### 5. Establish Quarterly Review (10 minutes)
Schedule your next review for 2025-02-23. Add to calendar.

### 6. Measure Results (Ongoing)
Track metrics. Adjust as needed.

---

## Document Maintenance Schedule

| Document | Review Frequency | Owner | Last Updated |
|----------|-----------------|-------|--------------|
| QA_AUTOMATION_DECISION_FRAMEWORK.md | Quarterly | QA Lead | 2025-11-23 |
| AUTOMATION_TRIAGE_ACTION_PLAN.md | As executed | Implementation Team | 2025-11-23 |
| QA_AUTOMATION_QUICK_REFERENCE.md | Quarterly | QA Lead | 2025-11-23 |
| QA_DEPLOYMENT_CHECKLIST.md | Per release | Release Manager | TBD |
| EXPLORATORY_TEST_GUIDE.md | Quarterly | QA Lead | TBD |

---

## Contact & Questions

For questions about:
- **Framework methodology**: See Section 8 (Alternatives Considered) of QA_AUTOMATION_DECISION_FRAMEWORK.md
- **Test-specific scoring**: Use QA_AUTOMATION_QUICK_REFERENCE.md worksheet
- **Implementation steps**: Follow AUTOMATION_TRIAGE_ACTION_PLAN.md phases
- **Deployment verification**: Review QA_DEPLOYMENT_CHECKLIST.md before release
- **Manual testing**: Check EXPLORATORY_TEST_GUIDE.md

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| 1.0 | 2025-11-23 | Initial framework and 16-test triage |

---

**Framework Status**: ✅ Ready for Implementation

**Next Review Date**: 2025-02-23 (Quarterly)

**Owner**: Quality Assurance Team

**Applicable To**: BibGraph E2E test automation decisions

---

## README_QA_FRAMEWORK

# QA Automation Framework - Start Here

## What Is This?

A **comprehensive decision framework** for deciding which manual E2E tests should be automated vs kept manual. Based on **risk-based ROI analysis**, not guesswork.

## The Problem We Solved

You had 16 manual E2E tests with unclear automation priorities:
- Some were debug-only (no ongoing value)
- Some were critical journeys (must automate)
- Some were exploratory (impossible to automate)
- Some were too slow for regular CI

**The Solution**: An objective framework using a simple ROI formula.

## The Formula (30 Seconds)

```
ROI = (Impact × Frequency × Speed) - Maintenance

• Impact (1-5): How bad if it breaks?
• Frequency (1-5): How often does code change?
• Speed (1-5): How fast is the test?
• Maintenance: Monthly hours for upkeep

Decision:
  ROI ≥ 50: AUTOMATE
  ROI 30-49: AUTOMATE
  ROI 10-29: KEEP MANUAL
  ROI < 10: KEEP MANUAL or DELETE
```

## Results for BibGraph

| Metric | Value |
|--------|-------|
| Tests Analyzed | 16 |
| Automated | 10 (63%) |
| Kept Manual | 4 (25%) |
| Deleted | 2 (13%) |
| CI Time Added | 15-20 minutes |
| Monthly Time Saved | 10-15 hours |

## The Documents (Choose Your Path)

### Path 1: I Just Want to Make Quick Decisions (1 minute)
→ **QA_AUTOMATION_QUICK_REFERENCE.md**
- 1-page card
- Scoring worksheet
- Red/green flags
- Common benchmarks
- Print and keep at desk

### Path 2: I'm Implementing the 16-Test Triage (2 hours)
→ **AUTOMATION_TRIAGE_ACTION_PLAN.md**
- Step-by-step phases
- Bash commands for each action
- Timeline estimates
- Rollback plan
- Follow sequentially

### Path 3: I Need to Understand the Framework Deeply (30 minutes)
→ **QA_AUTOMATION_DECISION_FRAMEWORK.md**
- Complete 11-section guide
- Detailed scoring rubric
- Test categorization system (6 categories)
- All 16 tests analyzed
- Alternatives considered with pros/cons
- Success metrics
- Quarterly review process

### Path 4: I'm About to Deploy to Production (5 minutes)
→ **QA_DEPLOYMENT_CHECKLIST.md**
- Pre-release verification steps
- Sample URLs to test
- Browser compatibility checks
- Environment-specific validation

### Path 5: I'm Running Manual/Exploratory Tests (10 minutes)
→ **EXPLORATORY_TEST_GUIDE.md**
- How to run exploratory tests
- Visual verification checklists
- Screenshot capture instructions
- When to run them

### Path 6: I Need the Big Picture (5 minutes)
→ **QA_FRAMEWORK_OVERVIEW.md**
- Document index
- Framework at a glance
- Implementation roadmap
- Key metrics
- FAQs

### Path 7: I Want a Visual Reference (Print This!)
→ **QA_DECISION_FLOWCHART.txt**
- ASCII flowchart
- Scoring reference
- Red/green flags
- Print for desk

## The 6 Test Categories

Every test falls into one of these:

| Category | What | Action | Example |
|----------|------|--------|---------|
| **A** | Critical regression tests | ✅ AUTOMATE | Entity routing |
| **B** | Feature-specific tests | ✅ AUTOMATE (if ROI+) | Layout scrolling |
| **C** | Validation tests | ⚡ AUTOMATE (sampled) | Data completeness |
| **D** | Debug tests | ❌ DELETE | Temp investigation |
| **E** | Environment-specific | ⚠️ MANUAL | Deployed site checks |
| **F** | Exploratory/visual | ⚠️ MANUAL | Graph visualization |

## The 16-Test Breakdown

**Automate (10 tests)**
- `homepage.e2e.test.ts` (ROI: 99.9) - CRITICAL
- `external-id-routing.e2e.test.ts` (ROI: 79.9) - CRITICAL
- `api-field-validation.e2e.test.ts` (ROI: 59.9) - CRITICAL
- `author-routes.e2e.test.ts` (ROI: 59.9) - CRITICAL
- `layout-scrolling.e2e.test.ts` (ROI: 63.9) - CRITICAL
- `all-urls-load-full.e2e.test.ts` (ROI: 44.9) - HIGH
- `data-completeness.e2e.test.ts` (ROI: 47.85) - HIGH
- `openalex-url.e2e.test.ts` (ROI: 39.9) - HIGH
- `issn-fix-verification.e2e.test.ts` (ROI: 41.9) - HIGH
- `data-consistency-full.e2e.test.ts` (ROI: 9.75) - SAMPLE VERSION

**Keep Manual (4 tests)**
- `quick-deployed-check.e2e.test.ts` (ROI: 24.75) → Deploy checklist
- `sample-urls-deployed.e2e.test.ts` (ROI: 19.75) → Deploy checklist
- `section-screenshots.e2e.test.ts` (ROI: 7.75) → Exploratory guide
- `graph-visualization.e2e.test.ts` (ROI: 29.75) → Exploratory guide

**Delete (2 tests)**
- `debug-homepage.e2e.test.ts` (ROI: 9.5) - Debug only ❌
- `issn-timeout-debug.e2e.test.ts` (ROI: 3.5) - Debug only ❌

## How to Use This Framework

### Step 1: Read the Framework (Choose Your Path Above)
30 minutes max. Pick the document that matches your need.

### Step 2: Apply It to Your Tests
Use the scoring worksheet in QA_AUTOMATION_QUICK_REFERENCE.md.

### Step 3: Make Decisions
If ROI ≥ 30, automate. Otherwise, keep manual or delete.

### Step 4: Execute the Triage (If Doing the 16-Test Triage)
Follow AUTOMATION_TRIAGE_ACTION_PLAN.md phases 1-8.

### Step 5: Monitor Quarterly
Use the quarterly review checklist in QA_AUTOMATION_QUICK_REFERENCE.md.

## Core Principles

1. **Risk-Based**: Automate high-impact, high-frequency tests first
2. **Maintenance-Aware**: Account for actual upkeep costs, not just speed
3. **Category-Based**: Test category predicts automation viability
4. **Quarterly Evolving**: Framework adjusts as code matures
5. **Human Judgment Valued**: Keep subjective tests manual

## Key Insights

### Why Not Automate Everything?

**Because maintenance kills ROI.**

A visual test (graph layout) that fails randomly due to timing:
- Breaking CI trust
- Wasting 30 min/week debugging false failures
- No real bug prevention value
- Better kept as exploratory/manual test

### Why Not Keep Everything Manual?

**Because you miss regressions.**

A critical test (entity routing) that runs monthly:
- Bugs escape to production
- Low automation cost (deterministic, fast)
- High business impact
- Must automate

### The Balance

Automate deterministic, high-impact, frequently-changing tests.
Keep manual exploratory, subjective, one-time tests.
Delete debug-only tests.

## Success Metrics

Track these quarterly:

| Metric | Target | How to Measure |
|--------|--------|---|
| Flakiness | < 2% | False failures per 100 runs |
| Maintenance Cost | < 0.1 hrs/test/month | Actual time fixing tests |
| Test Speed | < 2 min per test | CI execution time |
| Bug Detection | ≥ 80% | % bugs caught by automation |

## Common Mistakes to Avoid

❌ Automating visual tests (high flakiness)
❌ Ignoring maintenance cost (ROI spiral)
❌ Using brittle selectors (high M score)
❌ Hardcoding test data (breaks with API changes)
❌ Never revisiting decisions (code evolves)

## Next Steps

1. **Read this document** (5 min) ← You are here
2. **Pick your path above** (choose one of 7 documents)
3. **Apply the framework** (use scoring worksheet)
4. **Execute if doing triage** (follow action plan)
5. **Schedule quarterly review** (add to calendar for 2025-02-23)

## Document Files

All documents in `/Users/joe/Documents/Research/PhD/BibGraph/docs/`:

```
QA_AUTOMATION_DECISION_FRAMEWORK.md      (11 sections, comprehensive)
AUTOMATION_TRIAGE_ACTION_PLAN.md          (8 phases, implementation)
QA_AUTOMATION_QUICK_REFERENCE.md          (1-page decision card)
QA_DEPLOYMENT_CHECKLIST.md                (Pre-release verification)
EXPLORATORY_TEST_GUIDE.md                 (Manual testing guide)
QA_FRAMEWORK_OVERVIEW.md                  (Document index & overview)
QA_DECISION_FLOWCHART.txt                 (ASCII flowchart - print this)
README_QA_FRAMEWORK.md                    (This file)
```

## Questions?

**Q: Should I automate this test?**
→ Use QA_AUTOMATION_QUICK_REFERENCE.md (1 minute decision)

**Q: How do I implement the 16-test triage?**
→ Follow AUTOMATION_TRIAGE_ACTION_PLAN.md (step by step)

**Q: What's the complete framework?**
→ Read QA_AUTOMATION_DECISION_FRAMEWORK.md (comprehensive guide)

**Q: How do I verify before release?**
→ Use QA_DEPLOYMENT_CHECKLIST.md (manual steps)

**Q: How do I run exploratory tests?**
→ Follow EXPLORATORY_TEST_GUIDE.md (with examples)

**Q: Can I see the big picture?**
→ Check QA_FRAMEWORK_OVERVIEW.md (roadmap + context)

---

## Summary

You now have:
- ✅ Objective ROI framework for automation decisions
- ✅ Test categorization system (6 categories)
- ✅ Detailed scoring rubric
- ✅ Analysis of your 16 manual tests
- ✅ Implementation plan for triage
- ✅ Quick reference card for daily use
- ✅ Quarterly review process

**Start with the document that matches your need. Pick your path above.**

---

**Framework Version**: 1.0
**Created**: 2025-11-23
**Status**: Ready for use
**Next Review**: 2025-02-23

---

## QA_DECISION_FLOWCHART

╔════════════════════════════════════════════════════════════════════════════════╗
║           QA AUTOMATION DECISION FLOWCHART - QUICK REFERENCE                    ║
║                    (Print this for your desk)                                  ║
╚════════════════════════════════════════════════════════════════════════════════╝

                              START: New E2E Test?
                                      │
                                      ▼
                    ┌─────────────────────────────┐
                    │  Is this a debug-only test? │
                    │  (Created to investigate    │
                    │   specific issue)           │
                    └─────────────────────────────┘
                            YES ↓        NO ↓
                            ┌──┘         │
                            ▼            │
                        ┌────────────┐   │
                        │  DELETE ❌ │   │
                        │            │   │
                        │ (No ongoing │   │
                        │  regression │   │
                        │  value)    │   │
                        └────────────┘   │
                                         ▼
                    ┌─────────────────────────────┐
                    │ Is the outcome subjective?  │
                    │ (Visual, judgment calls,    │
                    │  layout "looks right")      │
                    └─────────────────────────────┘
                            YES ↓        NO ↓
                            ┌──┘         │
                            ▼            │
                        ┌────────────┐   │
                        │KEEP MANUAL │   │
                        │     ⚠️     │   │
                        │ (Exploratory)  │
                        └────────────┘   │
                                         ▼
                    ┌─────────────────────────────┐
                    │ Does it take > 30 min run?  │
                    │ (Too slow for regular CI)   │
                    └─────────────────────────────┘
                            YES ↓        NO ↓
                            ┌──┘         │
                            ▼            │
                        ┌────────────┐   │
                        │ SAMPLE IT  │   │
                        │     ⚡     │   │
                        │ (Keep full│   │
                        │  as manual)    │
                        └────────────┘   │
                                         ▼
                    ┌─────────────────────────────┐
                    │  SCORE THE TEST             │
                    │  (Use the formula)          │
                    │                             │
                    │  ROI = (C×F×T) - M          │
                    │  C=Impact (1-5)             │
                    │  F=Frequency (1-5)          │
                    │  T=Speed (1-5)              │
                    │  M=Maintenance (hours/mo)   │
                    └─────────────────────────────┘
                                  │
                    ┌─────────────┴──────────────┐
                    │                            │
              ROI ≥ 30                      ROI < 30
                    │                            │
                    ▼                            ▼
              ┌──────────────┐            ┌────────────┐
              │  AUTOMATE ✅ │            │ KEEP MANUAL│
              │              │            │     ⚠️     │
              │ • Move to CI │            │ (Marginal  │
              │ • CI safety  │            │  ROI)      │
              │ • Run every  │            │            │
              │   commit     │            │ • Checklist│
              │              │            │ • Quarterly│
              └──────────────┘            │   review   │
                    │                     │            │
                    │                     └────────────┘
                    │                            │
                    └─────────────┬──────────────┘
                                  │
                                  ▼
                    ┌─────────────────────────────┐
                    │  MONITOR & MAINTAIN         │
                    │                             │
                    │  Track metrics:             │
                    │  • Flakiness < 2%           │
                    │  • Maintenance < 0.1 hrs/mo │
                    │  • Bug detection rate       │
                    │                             │
                    │  Review quarterly           │
                    └─────────────────────────────┘

═══════════════════════════════════════════════════════════════════════════════════

SCORING QUICK REFERENCE:

  Impact (C) - How bad if it breaks?
  ├─ 5: Production breaks / core unusable
  ├─ 4: Major feature broken / data wrong
  ├─ 3: Feature partially broken
  ├─ 2: Minor bug / single user
  └─ 1: Edge case only

  Frequency (F) - How often does code change?
  ├─ 5: Multiple times per sprint
  ├─ 4: Weekly (active development)
  ├─ 3: Every 2-4 weeks
  ├─ 2: Monthly
  └─ 1: Quarterly+

  Speed (T) - How fast is the test?
  ├─ 5: < 2 minutes (instant)
  ├─ 4: 2-5 minutes (quick)
  ├─ 3: 5-10 minutes (moderate)
  ├─ 2: 10-30 minutes (slow)
  └─ 1: 30+ minutes (impractical)

  Maintenance (M) - Monthly hours for upkeep
  ├─ 0.5+: High (flaky, selector churn)
  ├─ 0.25-0.5: Medium (some updates)
  ├─ 0.1-0.25: Low (stable, reliable)
  └─ < 0.1: Very low (rarely touched)

═══════════════════════════════════════════════════════════════════════════════════

RED FLAGS (Don't Automate):
  ❌ "Does this look right?" → Visual judgment
  ❌ "Test takes 45 minutes" → Too slow
  ❌ "Fails randomly" → Flaky test
  ❌ "Update it every sprint" → High maintenance
  ❌ "Need deployed site" → Environment-specific

GREEN FLAGS (Good to Automate):
  ✅ "Critical user journey" → High impact
  ✅ "Code changes constantly" → High frequency
  ✅ "Fast and reliable" → Good ROI
  ✅ "Clear pass/fail" → Deterministic
  ✅ "Stable test data" → Repeatable

═══════════════════════════════════════════════════════════════════════════════════

For more details, see:
  • QA_AUTOMATION_DECISION_FRAMEWORK.md (comprehensive guide)
  • QA_AUTOMATION_QUICK_REFERENCE.md (detailed scoring)
  • AUTOMATION_TRIAGE_ACTION_PLAN.md (implementation steps)

═══════════════════════════════════════════════════════════════════════════════════

