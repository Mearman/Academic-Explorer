/**
 * Page Object for Explore Page
 */

import { BaseSPAPageObject } from './BaseSPAPageObject';
import { type Page } from '@playwright/test';

export class ExplorePage extends BaseSPAPageObject {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the explore page
   */
  async goto(): Promise<void> {
    await super.goto('/explore');
    await this.waitForPageReady();
  }

  /**
   * Check if the explore page has a graph/visualization
   */
  async hasVisualization(): Promise<boolean> {
    return this.elementExists('canvas, [data-visualization], [data-graph]');
  }

  /**
   * Check if the explore page has controls/options
   */
  async hasControls(): Promise<boolean> {
    return this.elementExists('[data-controls], .controls, .explore-controls');
  }

  /**
   * Check if the explore page has a search/filter input
   */
  async hasSearchInput(): Promise<boolean> {
    return this.elementExists('input[type="search"], input[placeholder*="Search"], input[placeholder*="Filter"]');
  }

  /**
   * Wait for visualization to load
   */
  async waitForVisualizationReady(timeout = 30000): Promise<void> {
    await this.waitForSelector('canvas, [data-visualization], [data-graph]', timeout);

    // Wait for canvas to have content
    await this.page.waitForFunction(
      () => {
        const canvas = document.querySelector('canvas');
        return canvas !== null && canvas.width > 0 && canvas.height > 0;
      },
      { timeout }
    );
  }
}
