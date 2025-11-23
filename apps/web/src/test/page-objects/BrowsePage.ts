/**
 * Page Object for Browse Page
 */

import { BaseSPAPageObject } from './BaseSPAPageObject';
import { type Page } from '@playwright/test';
import { type EntityType } from './BaseEntityPageObject';

export class BrowsePage extends BaseSPAPageObject {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the browse page
   */
  async goto(): Promise<void> {
    await super.goto('/browse');
    await this.waitForPageReady();
  }

  /**
   * Check if the browse page shows entity type grid/list
   */
  async hasEntityTypeGrid(): Promise<boolean> {
    return this.elementExists('[data-entity-types], .entity-types, [data-browse-grid]');
  }

  /**
   * Get list of available entity types
   */
  async getEntityTypes(): Promise<string[]> {
    const entityTypeItems = this.page.locator('[data-entity-type], .entity-type-card, .entity-type-item');
    const count = await entityTypeItems.count();

    const types: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await entityTypeItems.nth(i).textContent();
      if (text) {
        types.push(text.trim());
      }
    }

    return types;
  }

  /**
   * Click on a specific entity type
   * @param entityType - The entity type to click (e.g., 'works', 'authors')
   */
  async clickEntityType(entityType: EntityType): Promise<void> {
    const card = this.page.locator(`[data-entity-type="${entityType}"], .entity-type-card:has-text("${entityType}")`).first();
    await card.click();
    await this.waitForNavigation();
  }

  /**
   * Search for an entity type
   * @param query - Search query
   */
  async searchEntityTypes(query: string): Promise<void> {
    const searchInput = this.page.locator('input[type="search"], input[placeholder*="Search"]').first();
    await searchInput.fill(query);
    await this.page.waitForTimeout(300); // Debounce
  }

  /**
   * Get count of visible entity type cards
   */
  async getEntityTypeCount(): Promise<number> {
    const entityTypeItems = this.page.locator('[data-entity-type], .entity-type-card, .entity-type-item');
    return entityTypeItems.count();
  }

  /**
   * Check if a specific entity type is displayed
   * @param entityType - The entity type to check
   */
  async hasEntityType(entityType: EntityType): Promise<boolean> {
    return this.elementExists(`[data-entity-type="${entityType}"], .entity-type-card:has-text("${entityType}")`);
  }
}
