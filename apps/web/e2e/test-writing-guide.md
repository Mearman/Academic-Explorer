# E2E Test Writing Guide

This guide covers best practices for writing E2E tests in the Academic Explorer application.

## Page Object Pattern

### Hierarchy

```
BasePageObject          - Core navigation & assertions
  └─ BaseSPAPageObject  - SPA-specific (hash routing, loading states)
      └─ BaseEntityPageObject - Entity pages (title, metadata, graph)
          └─ DomainsDetailPage - Domain-specific selectors & actions
```

### Example Page Object

```typescript
// apps/web/src/test/page-objects/DomainsDetailPage.ts
import { BaseEntityPageObject } from './BaseEntityPageObject';

export class DomainsDetailPage extends BaseEntityPageObject {
  async gotoDomain(id: string) {
    await this.page.goto(`/#/domains/${id}`);
  }

  async getDomainName(): Promise<string> {
    return this.getEntityTitle();
  }

  async getFieldCount(): Promise<number> {
    const text = await this.page.locator('[data-testid="field-count"]').textContent();
    return parseInt(text || '0', 10);
  }
}
```

## Test Structure

### Basic Test Pattern

```typescript
import { test, expect } from '@playwright/test';
import { waitForAppReady, waitForEntityData } from '@/test/helpers/app-ready';
import { DomainsDetailPage } from '@/test/page-objects/DomainsDetailPage';

test.describe('@entity Domains Detail Page', () => {
  const TEST_DOMAIN_ID = 'D1';

  test('should display domain title', async ({ page }) => {
    const domainsPage = new DomainsDetailPage(page);
    await domainsPage.gotoDomain(TEST_DOMAIN_ID);
    await waitForAppReady(page);
    await waitForEntityData(page);

    const title = await domainsPage.getDomainName();
    expect(title).toBeTruthy();
  });
});
```

## Wait Helpers

### Available Helpers

| Helper | Purpose |
|--------|---------|
| `waitForAppReady()` | Full app initialization |
| `waitForEntityData()` | Entity data loaded |
| `waitForSearchResults()` | Search results rendered |
| `waitForGraphReady()` | Graph simulation complete |
| `waitForNoLoading()` | All loading states cleared |

### Usage

```typescript
// ❌ Bad - flaky
await page.waitForTimeout(1000);
await page.goto('/#/domains/D1');

// ✅ Good - deterministic
await page.goto('/#/domains/D1');
await waitForAppReady(page);
await waitForEntityData(page);
```

## Test Tags

Use tags to categorize tests:

```typescript
test.describe('@entity @domains Domain Tests', () => { ... });
test.describe('@workflow Search Workflow', () => { ... });
test.describe('@error Error Handling', () => { ... });
```

Run filtered tests:
```bash
pnpm nx e2e web --grep="@entity"
```

## Accessibility Testing

Add accessibility scans to all major pages:

```typescript
import AxeBuilder from '@axe-core/playwright';

test('should pass accessibility checks', async ({ page }) => {
  await page.goto('/#/domains/D1');
  await waitForAppReady(page);

  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(results.violations).toEqual([]);
});
```

## Performance Testing

Add timing measurements for critical paths:

```typescript
test('should load within target time', async ({ page }) => {
  const startTime = Date.now();
  await page.goto('/#/domains/D1');
  await waitForAppReady(page);
  const loadTime = Date.now() - startTime;

  expect(loadTime).toBeLessThan(2000); // 2 second target
});
```
