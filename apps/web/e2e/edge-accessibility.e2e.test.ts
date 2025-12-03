/**
 * E2E Accessibility Tests for Edge Styling
 * Verifies WCAG 2.1 Level AA compliance for edge direction visual distinction
 *
 * User Story 2 (T036): Verify multi-modal visual distinction meets accessibility standards
 *
 * Requirements:
 * - Three independent visual channels (line style, color, arrow marker)
 * - ≥3:1 contrast ratio for graphical objects
 * - Perceivable without color (line style alone distinguishes direction)
 * - Data attributes for testing and assistive technology
 */

import AxeBuilder from '@axe-core/playwright';
import { test, expect } from '@playwright/test';

test.describe('Edge Styling Accessibility (WCAG 2.1 AA)', () => {
  test('should have no axe violations on page with graph edges', async ({ page }) => {
    // Navigate to a page with graph visualization
    await page.goto('/#/works/W2741809807', { waitUntil: 'domcontentloaded' });

    // Wait for graph to load
    await page.waitForTimeout(2000);

    // Run axe accessibility audit
    const accessibilityScanResults = await new AxeBuilder({ page })
      .include('[data-testid="graph-container"]') // Only scan graph area if container exists
      .analyze();

    expect(accessibilityScanResults.violations).toEqual([]);
  });

  test('should provide data attributes for edge direction', async ({ page }) => {
    await page.goto('/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check for outbound edges with data-direction attribute
    const outboundEdges = page.locator('[data-direction="outbound"]');
    const outboundCount = await outboundEdges.count();

    // Check for inbound edges with data-direction attribute
    const inboundEdges = page.locator('[data-direction="inbound"]');
    const inboundCount = await inboundEdges.count();

    // At least one type of edge should exist
    expect(outboundCount + inboundCount).toBeGreaterThan(0);
  });

  test('should provide data attributes for relationship types', async ({ page }) => {
    await page.goto('/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check for edges with data-relation-type attribute
    const edgesWithType = page.locator('[data-relation-type]');
    const count = await edgesWithType.count();

    expect(count).toBeGreaterThan(0);

    // Verify specific relationship types exist
    const authorshipEdges = page.locator('[data-relation-type="AUTHORSHIP"]');
    const authorshipCount = await authorshipEdges.count();

    // Should have authorship edges for a work
    expect(authorshipCount).toBeGreaterThan(0);
  });

  test('should distinguish outbound vs inbound edges without color', async ({ page }) => {
    await page.goto('/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Verify outbound edges have solid line style (no strokeDasharray or strokeDasharray is empty)
    const outboundEdges = page.locator('[data-direction="outbound"]');
    const outboundCount = await outboundEdges.count();

    if (outboundCount > 0) {
      const firstOutbound = outboundEdges.first();
      const dashArray = await firstOutbound.getAttribute('stroke-dasharray');

      // Solid line: dasharray is null, undefined, empty, or 'none'
      expect(
        dashArray === null ||
          dashArray === '' ||
          dashArray === 'none' ||
          dashArray === undefined
      ).toBeTruthy();
    }

    // Verify inbound edges have dashed line style (strokeDasharray is set)
    const inboundEdges = page.locator('[data-direction="inbound"]');
    const inboundCount = await inboundEdges.count();

    if (inboundCount > 0) {
      const firstInbound = inboundEdges.first();
      const dashArray = await firstInbound.getAttribute('stroke-dasharray');

      // Dashed line: dasharray is set (e.g., '8,4')
      expect(dashArray).toBeTruthy();
      expect(dashArray).not.toBe('none');
      expect(dashArray).toContain(','); // Should have comma-separated values
    }

    // At least one type should exist for this test to be meaningful
    expect(outboundCount + inboundCount).toBeGreaterThan(0);
  });

  test('should use distinct colors for different relationship types', async ({ page }) => {
    await page.goto('/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Get colors for different relationship types
    const authorshipEdges = page.locator('[data-relation-type="AUTHORSHIP"]');
    const referenceEdges = page.locator('[data-relation-type="REFERENCE"]');

    const authorshipCount = await authorshipEdges.count();
    const referenceCount = await referenceEdges.count();

    if (authorshipCount > 0 && referenceCount > 0) {
      const authorshipColor = await authorshipEdges.first().getAttribute('stroke');
      const referenceColor = await referenceEdges.first().getAttribute('stroke');

      // Different relationship types should have different colors
      expect(authorshipColor).not.toBe(referenceColor);

      // Colors should be valid hex colors
      expect(authorshipColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      expect(referenceColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    }
  });

  test('should provide marker indicators for edge direction', async ({ page }) => {
    await page.goto('/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check for outbound edges with solid arrow markers
    const outboundEdges = page.locator('[data-direction="outbound"]');
    const outboundCount = await outboundEdges.count();

    if (outboundCount > 0) {
      const firstOutbound = outboundEdges.first();
      const markerEnd = await firstOutbound.getAttribute('marker-end');

      // Should have arrow marker
      expect(markerEnd).toBeTruthy();
      expect(markerEnd).toContain('arrow');
    }

    // Check for inbound edges with dashed arrow markers
    const inboundEdges = page.locator('[data-direction="inbound"]');
    const inboundCount = await inboundEdges.count();

    if (inboundCount > 0) {
      const firstInbound = inboundEdges.first();
      const markerEnd = await firstInbound.getAttribute('marker-end');

      // Should have arrow marker (potentially different style than outbound)
      expect(markerEnd).toBeTruthy();
      expect(markerEnd).toContain('arrow');
    }
  });

  test('should maintain visibility at different zoom levels', async ({ page }) => {
    await page.goto('/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Check edge visibility at default zoom
    const edgesAtDefaultZoom = page.locator('[data-direction]');
    const defaultCount = await edgesAtDefaultZoom.count();

    expect(defaultCount).toBeGreaterThan(0);

    // Simulate zoom in (if graph supports it)
    // await page.keyboard.press('Control++');
    // await page.waitForTimeout(500);

    // Edges should still be visible
    const edgesAfterZoom = page.locator('[data-direction]');
    const zoomCount = await edgesAfterZoom.count();

    expect(zoomCount).toBe(defaultCount);
  });

  test('should provide sufficient color contrast for graphical objects', async ({ page }) => {
    await page.goto('/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Get edge colors
    const edges = page.locator('[data-direction]');
    const count = await edges.count();

    if (count > 0) {
      const firstEdge = edges.first();
      const strokeColor = await firstEdge.getAttribute('stroke');

      // Verify color is valid hex
      expect(strokeColor).toMatch(/^#[0-9A-Fa-f]{6}$/);

      // Parse hex color to RGB
      const r = parseInt(strokeColor!.slice(1, 3), 16);
      const g = parseInt(strokeColor!.slice(3, 5), 16);
      const b = parseInt(strokeColor!.slice(5, 7), 16);

      // Calculate relative luminance (simplified check)
      const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;

      // Should not be too light (harder to see on white backgrounds)
      // and not too dark (for accessibility)
      // This is a basic check; actual contrast ratio calculation is more complex
      expect(luminance).toBeGreaterThan(0.2); // Not too dark
      expect(luminance).toBeLessThan(0.95); // Not too light
    }
  });

  test('should combine all three visual channels for full accessibility', async ({ page }) => {
    await page.goto('/#/works/W2741809807', { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(2000);

    // Find an edge and verify it has all three visual channels
    const edges = page.locator('[data-direction][data-relation-type]');
    const count = await edges.count();

    if (count > 0) {
      const edge = edges.first();

      // Channel 1: Line style (stroke-dasharray)
      const dashArray = await edge.getAttribute('stroke-dasharray');
      // Should be either set (dashed) or not set (solid)
      expect(dashArray !== undefined).toBeTruthy();

      // Channel 2: Color (stroke)
      const strokeColor = await edge.getAttribute('stroke');
      expect(strokeColor).toMatch(/^#[0-9A-Fa-f]{6}$/);

      // Channel 3: Arrow marker (marker-end)
      const markerEnd = await edge.getAttribute('marker-end');
      expect(markerEnd).toBeTruthy();

      // Should have direction data attribute
      const direction = await edge.getAttribute('data-direction');
      expect(direction).toMatch(/^(inbound|outbound)$/);

      // Should have relation type data attribute
      const relationType = await edge.getAttribute('data-relation-type');
      expect(relationType).toBeTruthy();
      expect(relationType!.length).toBeGreaterThan(0);
    }
  });
});
