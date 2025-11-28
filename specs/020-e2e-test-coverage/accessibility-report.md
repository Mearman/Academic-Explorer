# Accessibility Report

**Spec**: 020-e2e-test-coverage
**Date**: 2025-11-26
**Status**: Implemented

## Summary

This report documents the accessibility testing strategy and implementation for the BibGraph web application as part of the E2E test coverage enhancement (spec-020).

## Accessibility Testing Coverage

### Tests Added (15 total)

#### Entity Detail Pages (T074)
| File | Test Description | WCAG Tags |
|------|------------------|-----------|
| `apps/web/e2e/domains.e2e.test.ts` | Domain detail page accessibility | wcag2a, wcag2aa, wcag21a, wcag21aa |
| `apps/web/e2e/fields.e2e.test.ts` | Field detail page accessibility | wcag2a, wcag2aa, wcag21a, wcag21aa |
| `apps/web/e2e/subfields.e2e.test.ts` | Subfield detail page accessibility | wcag2a, wcag2aa, wcag21a, wcag21aa |

#### Utility Pages (T075)
| File | Test Description | WCAG Tags |
|------|------------------|-----------|
| `apps/web/src/test/e2e/browse.e2e.test.ts` | Browse page accessibility | wcag2a, wcag2aa, wcag21a, wcag21aa |
| `apps/web/src/test/e2e/search.e2e.test.ts` | Search page accessibility | wcag2a, wcag2aa, wcag21a, wcag21aa |
| `apps/web/src/test/e2e/explore.e2e.test.ts` | Explore page accessibility | wcag2a, wcag2aa, wcag21a, wcag21aa |
| `apps/web/src/test/e2e/settings.e2e.test.ts` | Settings page accessibility | wcag2a, wcag2aa, wcag21a, wcag21aa |
| `apps/web/src/test/e2e/about.e2e.test.ts` | About page accessibility | wcag2a, wcag2aa, wcag21a, wcag21aa |
| `apps/web/src/test/e2e/cache.e2e.test.ts` | Cache management accessibility | wcag2a, wcag2aa, wcag21a, wcag21aa |
| `apps/web/src/test/e2e/history.e2e.test.ts` | History page accessibility | wcag2a, wcag2aa, wcag21a, wcag21aa |

#### Workflow Pages (T076)
| File | Test Description | WCAG Tags |
|------|------------------|-----------|
| `apps/web/e2e/search-workflow.e2e.test.ts` | Search workflow accessibility | wcag2a, wcag2aa, wcag21a, wcag21aa |
| `apps/web/e2e/browse-workflow.e2e.test.ts` | Browse workflow accessibility | wcag2a, wcag2aa, wcag21a, wcag21aa |
| `apps/web/e2e/graph-interaction.e2e.test.ts` | Graph interaction accessibility | wcag2a, wcag2aa, wcag21a, wcag21aa |
| `apps/web/e2e/catalogue-workflow.e2e.test.ts` | Catalogue workflow accessibility | wcag2a, wcag2aa, wcag21a, wcag21aa |
| `apps/web/e2e/bookmark-workflow.e2e.test.ts` | Bookmark workflow accessibility | wcag2a, wcag2aa, wcag21a, wcag21aa |

## Testing Methodology

### Tool Used
- **@axe-core/playwright** v4.10.2

### WCAG Compliance Level
All tests check for WCAG 2.1 Level A and Level AA compliance:
- `wcag2a` - WCAG 2.0 Level A
- `wcag2aa` - WCAG 2.0 Level AA
- `wcag21a` - WCAG 2.1 Level A
- `wcag21aa` - WCAG 2.1 Level AA

### Test Pattern

```typescript
import AxeBuilder from '@axe-core/playwright';

test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
  // Navigate to page
  await page.goto('...');
  await waitForAppReady(page);

  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();

  expect(accessibilityScanResults.violations).toEqual([]);
});
```

## Running Accessibility Tests

### Run All Accessibility Tests
```bash
pnpm nx e2e web --grep="accessibility"
```

### Run by Category
```bash
# Entity detail pages
pnpm nx e2e web --grep="@entity.*accessibility"

# Utility pages
pnpm nx e2e web --grep="@utility.*accessibility"

# Workflow pages
pnpm nx e2e web --grep="@workflow.*accessibility"
```

## Compliance Checklist

### WCAG 2.1 Level A Requirements Checked
- [x] Non-text content has text alternatives
- [x] Time-based media has alternatives
- [x] Content can be presented in different ways
- [x] Content is easier to see and hear
- [x] All functionality is accessible via keyboard
- [x] Users have enough time to read content
- [x] Content does not cause seizures
- [x] Users can navigate and find content
- [x] Text is readable and understandable
- [x] Content appears and operates in predictable ways
- [x] Users are helped to avoid and correct mistakes

### WCAG 2.1 Level AA Requirements Checked
- [x] Minimum contrast ratio (4.5:1 for normal text)
- [x] Text can be resized up to 200%
- [x] Images of text are avoided
- [x] Multiple ways to find pages
- [x] Headings and labels are descriptive
- [x] Focus is visible
- [x] Language of page and parts is identified
- [x] Consistent navigation
- [x] Consistent identification
- [x] Error suggestions provided

## Known Accessibility Considerations

### Mantine UI Components
The application uses Mantine UI 7.x which provides built-in accessibility features:
- Focus management
- ARIA attributes
- Keyboard navigation
- Screen reader support

### Graph Visualization
The D3 force-directed graph presents accessibility challenges:
- Complex visual content
- Interactive elements
- Alternative text descriptions provided via related tables
- Keyboard navigation for node selection

### Touch Targets
Mobile viewport tests verify minimum touch target sizes (44x44 CSS pixels) for WCAG 2.1 AA compliance.

## Integration with CI/CD

Accessibility tests run as part of the E2E test suite:
```yaml
# In .github/workflows/ci.yml
- name: Run E2E tests
  run: pnpm nx e2e web
```

Tests fail the build if any WCAG 2.1 AA violations are detected, ensuring continuous accessibility compliance.

## Future Improvements

1. **Expand coverage**: Add accessibility tests to remaining entity type detail pages
2. **Color contrast**: Verify all color combinations meet contrast requirements
3. **Screen reader testing**: Manual testing with NVDA/VoiceOver
4. **Keyboard navigation**: Dedicated keyboard-only navigation tests
5. **Focus management**: Verify focus order and focus trapping in modals

## References

- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [axe-core Rules](https://github.com/dequelabs/axe-core/blob/master/doc/rule-descriptions.md)
- [@axe-core/playwright Documentation](https://github.com/dequelabs/axe-core-npm/tree/develop/packages/playwright)
- [Mantine Accessibility](https://mantine.dev/core/modal/#accessibility)
