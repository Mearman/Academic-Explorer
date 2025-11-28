# Research: E2E Test Coverage Enhancement

**Feature**: E2E Test Coverage Enhancement
**Date**: 2025-11-23
**Phase**: 0 (Research & Unknowns)

## Overview

This document consolidates research findings from 5 research tasks investigating best practices for organizing, implementing, and measuring E2E test coverage in the BibGraph web application.

## Research Task 1: Playwright Test Organization

### Decision

**Unified feature-based organization under `apps/web/e2e/`** with tag-based filtering for smoke/regression/accessibility test categorization.

### Rationale

Feature-based organization (vs. route-based or test-type-based) aligns with BibGraph's architecture where features cross-cut multiple routes:
- Walden v2 xpac features affect all 7 entity types (works, authors, sources, etc.)
- Relationship visualization spans multiple entity detail pages
- Edge filtering applies across graph components regardless of entity type

Route-based organization would require duplicating tests for cross-cutting features, while feature-based organization allows grouping related tests by functionality.

### Alternatives Considered

1. **Route-Based Organization** (`e2e/works/`, `e2e/authors/`, etc.)
   - **Pros**: Mirrors route structure, intuitive for developers
   - **Cons**: Features crossing multiple routes require duplication or awkward cross-references
   - **Rejected**: Walden xpac tests would need to exist in 7+ directories

2. **Test-Type-Based Organization** (`e2e/smoke/`, `e2e/regression/`, `e2e/integration/`)
   - **Pros**: Clear separation by test purpose
   - **Cons**: Ambiguous categorization (is xpac-toggle smoke or regression?)
   - **Rejected**: Features naturally fit multiple categories

3. **Keep Current Split Structure** (`e2e/` + `src/test/e2e/`)
   - **Pros**: Zero migration effort
   - **Cons**: Inconsistent standards, difficult to scale beyond 1000 tests
   - **Rejected**: Doesn't scale for target coverage increase

### Implementation Notes

**Target Directory Structure**:
```
apps/web/e2e/
├── features/
│   ├── relationships/ (10 tests)
│   ├── graph-rendering/ (5 files)
│   ├── data-versions/ (8+ files - Walden v2)
│   ├── catalogue/ (8+ files - lists, sharing)
│   ├── navigation/ (6+ files - routing, URLs)
│   ├── caching/ (1 file - filesystem cache)
│   └── accessibility/ (3+ files - axe scans)
├── smoke/ (32 critical tests - high priority)
├── manual/ (10 debug tests - excluded from automation)
└── helpers/ (wait-helpers.ts, page-objects.ts)
```

**Tag-Based Filtering**:
```typescript
// Use Playwright's built-in tag system for flexible filtering
test("should load entity data", { tag: "@smoke" }, async ({ page }) => {
  // Test implementation
});

test("should filter relationships", { tag: ["@regression", "@relationships"] }, async ({ page }) => {
  // Test implementation
});
```

**CI Commands**:
```bash
# Run smoke tests only (default)
pnpm nx e2e web

# Run full suite
E2E_FULL_SUITE=true pnpm nx e2e web

# Run specific feature
pnpm exec playwright test --grep "@relationships"

# Run accessibility tests
pnpm exec playwright test --grep "@a11y"
```

**Migration Timeline**: 4-6 hours to consolidate existing tests, 2-3 hours to update configuration.

---

## Research Task 2: Page Object Model Patterns

### Decision

**Hierarchical Page Object Pattern** with 4-layer inheritance: BasePageObject → BaseSPAPageObject → BaseEntityPageObject → Specific Entity Page Objects (7 types).

### Rationale

BibGraph has strong shared behavior across entity types:
- All 12 entity types share similar detail page structure (title, info, relationships)
- All use TanStack Router v7 with hash routing (`/#/works/W123`)
- Common UI patterns (Mantine components, relationship sections, filters)

Hierarchical page objects eliminate code duplication (40-60% reduction) while maintaining type safety and semantic test methods. Tests become self-documenting (e.g., `workPage.assertTitleVisible()` vs. raw `expect(page.locator('h1')).toBeVisible()`).

### Alternatives Considered

1. **Raw Playwright (No Page Objects)**
   - **Pros**: Zero abstraction overhead, maximum Playwright API flexibility
   - **Cons**: 20 tests × 15 selectors each = 300 duplicate selectors to maintain
   - **Rejected**: Maintenance burden grows linearly with test count

2. **Flat Page Objects (No Inheritance)**
   - **Pros**: Simpler mental model, no inheritance complexity
   - **Cons**: Duplicated methods across 12 entity page objects (navigate, waitFor, etc.)
   - **Rejected**: Violates DRY principle for shared behaviors

3. **Screenplay Pattern** (Interactions + Tasks + Abilities)
   - **Pros**: User-centric language, highly composable
   - **Cons**: 3x more files than page objects, steeper learning curve
   - **Rejected**: Overkill for current test suite size (50+ tests)

### Implementation Notes

**Class Hierarchy**:
```typescript
// BasePageObject.ts - Core Playwright abstractions
abstract class BasePageObject {
  constructor(protected page: Page) {}

  async navigate(url: string): Promise<void> { /* ... */ }
  async waitForVisible(selector: string): Promise<void> { /* ... */ }
  async click(selector: string): Promise<void> { /* ... */ }
  async getText(selector: string): Promise<string> { /* ... */ }
}

// BaseSPAPageObject.ts - Hash routing for TanStack Router
abstract class BaseSPAPageObject extends BasePageObject {
  protected readonly baseURL: string;

  async navigateToRoute(route: string): Promise<void> {
    await this.navigate(`${this.baseURL}/#${route}`);
  }

  async getCurrentRoute(): Promise<string> {
    return new URL(this.page.url()).hash.slice(1);
  }
}

// BaseEntityPageObject.ts - Shared entity behaviors
abstract class BaseEntityPageObject extends BaseSPAPageObject {
  protected abstract entityType: EntityType;

  async navigateToDetail(entityId: string): Promise<void> {
    await this.navigateToRoute(`/${this.entityType}/${entityId}`);
  }

  async getTitle(): Promise<string> {
    return this.getText('h1');
  }

  async hasRelationships(): Promise<boolean> {
    return this.page.locator('[data-testid="relationships"]').count() > 0;
  }

  async getIncomingRelationshipCount(): Promise<number> {
    const text = await this.page.locator('[data-testid="incoming-count"]').textContent();
    return parseInt(text || '0', 10);
  }
}

// WorksPageObject.ts - Specific entity implementation
class WorksPageObject extends BaseEntityPageObject {
  protected entityType: EntityType = 'works';

  async assertTitleVisible(): Promise<void> {
    await expect(this.page.locator('h1')).toBeVisible();
  }

  async getDOI(): Promise<string | null> {
    return this.page.locator('[data-testid="doi"]').textContent();
  }

  async getCitationCount(): Promise<number> {
    const text = await this.page.locator('[data-testid="citation-count"]').textContent();
    return parseInt(text || '0', 10);
  }
}
```

**Usage in Tests**:
```typescript
import { test } from '@playwright/test';
import { WorksPageObject } from '../helpers/page-objects/WorksPageObject';

test('should display work details', async ({ page }) => {
  const worksPage = new WorksPageObject(page);

  await worksPage.navigateToDetail('W2741809807');
  await worksPage.assertTitleVisible();

  const doi = await worksPage.getDOI();
  expect(doi).toContain('10.');
});
```

**Break-Even Analysis**: ROI positive after 10 tests (3-4 hours setup vs. 20+ hours saved in maintenance over 50 tests).

---

## Research Task 3: Flaky Test Prevention

### Decision

**Multi-layered risk mitigation strategy**: Deterministic waiting (app-ready checks) + storage isolation (per-test IndexedDB cleanup) + MSW integration safeguards + minimal retries (1 retry in CI only).

### Rationale

Flakiness stems from 3 root causes in the current setup:
1. **Wait strategy misalignment**: Tests use `waitForLoadState('networkidle')` which doesn't guarantee IndexedDB/React hydration complete
2. **Storage state pollution**: Reused IndexedDB across tests creates hidden ordering dependencies
3. **MSW race conditions**: Service worker may not be registered before Playwright sends first API request

Fixing these root causes eliminates flakiness at the source rather than masking it with retries.

### Alternatives Considered

1. **Retries Only (2-3 retries in CI)**
   - **Pros**: Zero implementation cost, handles transient failures
   - **Cons**: Hides root causes, compounding failures in CI pipelines
   - **Rejected**: SC-012 requires zero flaky tests, not "tests that eventually pass"

2. **AI-Powered Test Healing** (Applitools, LLM-driven locators)
   - **Pros**: Auto-fixes broken selectors, visual regression detection
   - **Cons**: Expensive ($$$), overkill for deterministic selectors
   - **Rejected**: BibGraph selectors are stable (data-testid based)

3. **Parallel Execution with Isolated Contexts**
   - **Pros**: Faster CI (4 workers × tests)
   - **Cons**: OOM errors (8GB heap limit), race conditions increase
   - **Rejected**: Serial execution already required; parallel introduces new flakiness

### Implementation Notes

**Deterministic Wait Helpers** (`apps/web/src/test/utils/wait-helpers.ts`):
```typescript
export async function waitForAppReady(
  page: Page,
  options?: { checkIndexedDB?: boolean; checkMSW?: boolean }
): Promise<void> {
  // Step 1: Wait for DOM (main element attached)
  await page.locator('main').or(page.locator('[role="main"]')).waitFor({
    timeout: 3000,
    state: 'attached',
  });

  // Step 2: Wait for React hydration (spinners gone)
  await page.locator('.spinner, [data-testid="loading"]').waitFor({
    timeout: 1000,
    state: 'hidden',
  }).catch(() => {}); // Non-fatal

  // Step 3: Verify IndexedDB accessible (if requested)
  if (options?.checkIndexedDB) {
    await page.evaluate(async () => {
      return new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => reject(new Error('IndexedDB timeout')), 3000);
        const request = indexedDB.open('academic-explorer-settings');
        request.onsuccess = () => {
          clearTimeout(timeout);
          request.result.close();
          resolve();
        };
        request.onerror = () => {
          clearTimeout(timeout);
          reject(new Error('IndexedDB failed'));
        };
      });
    });
  }

  // Step 4: Network idle as final checkpoint (non-blocking)
  await page.waitForLoadState('networkidle', { timeout: 2000 }).catch(() => {});
}
```

**Storage Isolation Pattern** (test hooks):
```typescript
test.beforeEach(async ({ page }) => {
  // Clear IndexedDB before each test to prevent cross-test pollution
  await page.evaluate(() => {
    return new Promise<void>((resolve) => {
      const dbs = ['academic-explorer-catalogue', 'academic-explorer-settings'];
      let completed = 0;
      dbs.forEach(dbName => {
        const deleteRequest = indexedDB.deleteDatabase(dbName);
        deleteRequest.onsuccess = () => {
          completed++;
          if (completed === dbs.length) resolve();
        };
        deleteRequest.onerror = () => {
          completed++;
          if (completed === dbs.length) resolve();
        };
      });
    });
  });
});
```

**MSW Integration Safeguard**:
```typescript
export async function waitForMSWReady(page: Page, timeout = 5000): Promise<void> {
  await page.evaluate(async (swTimeout) => {
    return new Promise<void>((resolve) => {
      const checkInterval = setInterval(async () => {
        if ('serviceWorker' in navigator) {
          const registrations = await navigator.serviceWorker.getRegistrations();
          if (registrations.some(reg => reg.active)) {
            clearInterval(checkInterval);
            setTimeout(() => resolve(), 50); // Small delay for handlers
            return;
          }
        }
        // Timeout: continue anyway (non-fatal)
        if (Date.now() - startTime > swTimeout) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 50);
    });
  }, timeout);
}
```

**Retry Strategy** (minimal retries):
```typescript
// playwright.config.ts - Only 1 retry in CI to detect transient failures
export default defineConfig({
  retries: process.env.CI ? 1 : 0,
  forbidOnly: !!process.env.CI,
});
```

**Flakiness Detection** (CI job - weekly):
```yaml
# .github/workflows/flakiness-check.yml
name: Flakiness Detection
on:
  schedule:
    - cron: '0 2 * * 1' # Weekly Monday 2 AM UTC

jobs:
  flakiness-analysis:
    runs-on: ubuntu-latest
    steps:
      - name: Run tests 10 times
        run: |
          for i in {1..10}; do
            pnpm nx e2e web --reporter json > test-results/run-$i.json || true
          done

      - name: Analyze results (fail if flakiness >1%)
        run: node scripts/analyze-test-flakiness.js --threshold 0.01
```

**Success Criteria Mapping**: SC-012 (zero flaky tests over 10 runs) achieved via deterministic waits + storage isolation, validated by flakiness detection job.

---

## Research Task 4: Coverage Measurement

### Decision

**Dual-metric system**: Custom route coverage tracker (primary) + V8 code coverage via `@bgotink/playwright-coverage` (secondary validation).

### Rationale

Route coverage is more actionable for E2E testing than code coverage because:
- E2E tests validate user journeys (navigating routes), not code execution
- SC-011 requires measuring "20+ percentage point increase in route coverage" specifically
- Code coverage shows lines executed, not whether user scenarios are tested

Route coverage provides direct visibility into "Route X has 0 tests" while code coverage shows "File Y has 80% line coverage" (which may include utility functions unrelated to user journeys).

### Alternatives Considered

1. **Istanbul/Babel Instrumentation + NYC** (Code coverage only)
   - **Pros**: Industry standard, mature tooling, LCOV format for CI integration
   - **Cons**: Requires modifying `vite.config.ts`, slows tests, doesn't measure route coverage
   - **Rejected**: Adds build complexity without answering "which routes are untested?"

2. **V8 Code Coverage Only** (via `@bgotink/playwright-coverage`)
   - **Pros**: Zero build modifications, fast (no Babel overhead)
   - **Cons**: Measures code lines, not routes (can't identify untested routes)
   - **Rejected**: Doesn't satisfy SC-011 requirement for route-specific metrics

3. **Automatic Route Detection** (Hook into Playwright navigation events)
   - **Pros**: Fully automatic (no manual test mapping)
   - **Cons**: Difficult to map detected routes to TanStack Router structure, noisy data
   - **Rejected**: Manual route registry provides clearer audit trail

### Implementation Notes

**Route Coverage Tracker**:

1. **Route Manifest** (`apps/web/coverage/route-manifest.ts`):
```typescript
export interface RouteEntry {
  path: string; // src/routes path
  name: string; // Human-readable name
  testedBy: string[]; // Test file paths
  testable: boolean; // Is E2E testable?
  skipReason?: string; // Why not testable
}

export const ROUTE_MANIFEST: RouteEntry[] = [
  {
    path: "src/routes/works/$_.lazy.tsx",
    name: "Work Detail",
    testedBy: ["e2e/work-detail.e2e.test.ts"],
    testable: true,
  },
  {
    path: "src/routes/domains/$domainId.lazy.tsx",
    name: "Domain Detail",
    testedBy: [], // UNTESTED
    testable: true,
  },
  // ... 44 more routes
];
```

2. **Baseline Report Generation** (`apps/web/coverage/generate-baseline.ts`):
```typescript
export function generateBaseline(): CoverageSummary {
  const tested = ROUTE_MANIFEST.filter(r => r.testable && r.testedBy.length > 0);
  const testable = ROUTE_MANIFEST.filter(r => r.testable);
  const coverage = (tested.length / testable.length) * 100;

  const summary = {
    timestamp: new Date().toISOString(),
    totalRoutes: ROUTE_MANIFEST.length,
    testableRoutes: testable.length,
    testedRoutes: tested.length,
    coveragePercentage: coverage,
    uncoveredRoutes: ROUTE_MANIFEST.filter(r => r.testable && r.testedBy.length === 0).map(r => r.path),
  };

  fs.writeFileSync('coverage/baseline.json', JSON.stringify(summary, null, 2));

  console.log(`Route Coverage: ${coverage.toFixed(2)}%`);
  console.log(`Uncovered Routes (${summary.uncoveredRoutes.length}):`);
  summary.uncoveredRoutes.forEach(r => console.log(`  - ${r}`));

  return summary;
}
```

3. **Delta Tracking** (`apps/web/coverage/delta-tracking.ts`):
```typescript
export function trackDelta(): DeltaReport {
  const baseline = JSON.parse(fs.readFileSync('coverage/baseline.json', 'utf-8'));
  const current = JSON.parse(fs.readFileSync('coverage/current.json', 'utf-8'));

  const delta = {
    coverageIncrease: current.coveragePercentage - baseline.coveragePercentage,
    newlyTestedRoutes: current.testedRoutes - baseline.testedRoutes,
  };

  console.log(`Change: ${delta.coverageIncrease >= 0 ? "+" : ""}${delta.coverageIncrease.toFixed(2)}%`);

  // Fail if coverage regressed
  if (delta.coverageIncrease < 0) {
    console.error("Coverage regressed!");
    process.exit(1);
  }

  return { baseline, current, delta };
}
```

**V8 Code Coverage (Secondary)**:
```bash
# Install
pnpm add -D @bgotink/playwright-coverage

# Update playwright.config.ts
import { withCoverage } from "@bgotink/playwright-coverage";

export default defineConfig(
  withCoverage(
    { /* existing config */ },
    {
      sourceRoot: "./src",
      exclude: ["node_modules/**"],
      resultDir: "./coverage/v8-coverage",
      reports: ["html", "lcovonly"],
    }
  )
);

# Run
pnpm nx e2e web
# Coverage in coverage/v8-coverage/index.html
```

**Package Scripts**:
```json
{
  "scripts": {
    "e2e:coverage": "pnpm nx e2e web && pnpm tsx apps/web/coverage/generate-baseline.ts",
    "e2e:coverage:delta": "pnpm tsx apps/web/coverage/delta-tracking.ts"
  }
}
```

**Success Criteria Mapping**: SC-011 (20+ point increase) validated by delta-tracking.ts reporting exact percentage increase from baseline to current.

---

## Research Task 5: Manual Test Automation Criteria

### Decision

**ROI-based scoring framework**: Score tests using formula `ROI = (Impact × Frequency × Speed) - Maintenance`, with thresholds:
- **Score ≥ 50**: Automate immediately (P1)
- **Score 30-49**: Automate this sprint (P2)
- **Score 10-29**: Keep manual for now (P3)
- **Score < 10**: Keep manual or delete

### Rationale

Automation decisions should be objective and data-driven to avoid two pitfalls:
1. **Over-automation**: Automating low-ROI tests creates maintenance burden that outweighs value
2. **Under-automation**: Missing high-impact tests creates regression risk

The ROI framework quantifies 4 factors:
- **Impact** (1-10): How critical is test failure? (Security = 10, UX polish = 3)
- **Frequency** (1-10): How often is test executed? (Every PR = 10, quarterly = 2)
- **Speed** (1-10): How much faster is automation? (Manual 30min vs auto 2min = 9)
- **Maintenance** (1-10): How brittle is automation? (Stable selectors = 2, dynamic selectors = 8)

### Alternatives Considered

1. **Category-Based Rules** ("Automate all regression, keep all exploratory manual")
   - **Pros**: Simple classification, no calculation overhead
   - **Cons**: Misses nuance (high-impact exploratory vs low-impact regression)
   - **Rejected**: Too coarse-grained; regression tests vary widely in importance

2. **Gut-Feel Prioritization** ("This feels important, automate it")
   - **Pros**: Zero framework overhead, fast decision-making
   - **Cons**: Inconsistent, bias-prone, no audit trail
   - **Rejected**: Doesn't scale; team members make conflicting decisions

3. **Cost-Benefit Spreadsheet** (Hours to automate vs. hours saved)
   - **Pros**: Precise financial ROI, business-friendly
   - **Cons**: Difficult to estimate accurately, ignores intangibles (regression confidence)
   - **Rejected**: Overhead too high for 13 tests; framework provides 90% of benefit

### Implementation Notes

**Scoring Rubric**:

| Factor | Score 1-3 | Score 4-7 | Score 8-10 |
|--------|-----------|-----------|------------|
| **Impact** | UX polish, minor bugs | Core features, data integrity | Security, payment, compliance |
| **Frequency** | Quarterly, ad-hoc | Weekly, per-release | Per-PR, daily |
| **Speed** | Manual 5min, auto 4min | Manual 15min, auto 3min | Manual 30min+, auto <5min |
| **Maintenance** | Complex selectors, API changes | Moderate coupling | Stable test-IDs, clear failures |

**Example Scoring** (from manual test directory):

1. **`homepage.e2e.test.ts`** (25 tests):
   - **Impact**: 8 (homepage breakage = high visibility)
   - **Frequency**: 10 (every PR modifies homepage)
   - **Speed**: 9 (manual 30min, auto 2min)
   - **Maintenance**: 3 (stable Mantine components)
   - **ROI**: (8 × 10 × 9) - 3 = **717** → **AUTOMATE IMMEDIATELY**

2. **`section-screenshots.e2e.test.ts`**:
   - **Impact**: 3 (visual comparison, not critical)
   - **Frequency**: 2 (quarterly visual regression checks)
   - **Speed**: 4 (manual 10min, auto 5min)
   - **Maintenance**: 7 (pixel-perfect matching brittle)
   - **ROI**: (3 × 2 × 4) - 7 = **17** → **KEEP MANUAL**

3. **`debug-homepage.e2e.test.ts`**:
   - **Impact**: 1 (debugging artifact, no production value)
   - **Frequency**: 1 (one-time use during bug investigation)
   - **Speed**: 2 (manual 5min, auto 4min)
   - **Maintenance**: 5 (depends on debugging scenario)
   - **ROI**: (1 × 1 × 2) - 5 = **-3** → **DELETE**

**Decision Matrix Output** (13 manual tests analyzed):

| Test File | Impact | Freq | Speed | Maint | ROI | Decision |
|-----------|--------|------|-------|-------|-----|----------|
| homepage.e2e.test.ts | 8 | 10 | 9 | 3 | 717 | Automate (P1) |
| external-id-routing.e2e.test.ts | 9 | 8 | 8 | 2 | 574 | Automate (P1) |
| api-field-validation.e2e.test.ts | 9 | 8 | 7 | 3 | 501 | Automate (P1) |
| layout-scrolling.e2e.test.ts | 7 | 9 | 8 | 2 | 502 | Automate (P1) |
| author-routes.e2e.test.ts | 7 | 9 | 7 | 2 | 441 | Automate (P2) |
| all-urls-load-full.e2e.test.ts | 8 | 6 | 6 | 4 | 284 | Automate (P2) |
| data-completeness.e2e.test.ts | 8 | 7 | 6 | 3 | 333 | Automate (P2) |
| openalex-url.e2e.test.ts | 6 | 8 | 6 | 2 | 286 | Automate (P2) |
| issn-fix-verification.e2e.test.ts | 7 | 6 | 5 | 3 | 207 | Automate (P3) |
| data-consistency-full.e2e.test.ts | 6 | 5 | 5 | 4 | 146 | Automate (P3) |
| quick-deployed-check.e2e.test.ts | 5 | 3 | 4 | 6 | 54 | Keep Manual |
| sample-urls-deployed.e2e.test.ts | 4 | 2 | 3 | 7 | 17 | Keep Manual |
| section-screenshots.e2e.test.ts | 3 | 2 | 4 | 7 | 17 | Keep Manual |
| graph-visualization.e2e.test.ts | 4 | 3 | 5 | 8 | 52 | Keep Manual |
| debug-homepage.e2e.test.ts | 1 | 1 | 2 | 5 | -3 | Delete |
| issn-timeout-debug.e2e.test.ts | 1 | 1 | 2 | 6 | -4 | Delete |

**Quick Reference Worksheet** (1-minute decision tool):
```markdown
# Test Automation Decision Worksheet

**Test Name**: _____________________

| Factor | Your Score (1-10) | Notes |
|--------|------------------|-------|
| Impact | ___ | How critical is failure? (1=polish, 10=security) |
| Frequency | ___ | How often run? (1=quarterly, 10=every PR) |
| Speed | ___ | Time saved? (1=<2min, 10=30min+) |
| Maintenance | ___ | Brittleness? (1=stable, 10=flaky) |

**ROI**: (Impact × Frequency × Speed) - Maintenance = ___

**Decision**:
- ROI ≥ 50 → AUTOMATE immediately
- ROI 30-49 → AUTOMATE this sprint
- ROI 10-29 → KEEP MANUAL for now
- ROI < 10 → KEEP MANUAL or DELETE
```

**Review Cadence**: Quarterly re-scoring (as codebase evolves, maintenance burden changes, frequency shifts).

---

## Summary & Next Steps

All 5 research tasks completed successfully:

1. **Test Organization**: Feature-based structure under `apps/web/e2e/` with tag-based filtering
2. **Page Objects**: Hierarchical 4-layer pattern (Base → SPA → Entity → Specific)
3. **Flaky Test Prevention**: Deterministic waits + storage isolation + MSW safeguards + minimal retries
4. **Coverage Measurement**: Route coverage tracker (primary) + V8 code coverage (secondary)
5. **Automation Criteria**: ROI-based scoring with objective thresholds

### Implementation Priorities (Phase 1)

**Critical (Week 1)**:
- Create wait helpers (`wait-helpers.ts`) for deterministic waiting
- Establish route coverage baseline (`route-manifest.ts`, `generate-baseline.ts`)
- Create page object base classes (`BasePageObject`, `BaseSPAPageObject`, `BaseEntityPageObject`)

**Important (Week 2)**:
- Migrate existing tests to feature-based structure
- Apply storage isolation pattern (beforeEach hooks)
- Implement 10 high-ROI manual test automations (homepage, external-id-routing, api-field-validation, etc.)

**Nice-to-Have (Week 3+)**:
- Set up flakiness detection job (weekly CI)
- Add V8 code coverage as secondary metric
- Delete low-value manual tests (debug-homepage, issn-timeout-debug)

### Validation Criteria

- ✅ Research findings documented with decision/rationale/alternatives for each task
- ✅ Implementation notes provide concrete code examples and timelines
- ✅ All decisions align with Constitution principles (type safety, test-first, monorepo architecture)
- ✅ Ready to proceed to Phase 1 (Design & Contracts)

**Status**: Phase 0 complete. Proceed to Phase 1.
