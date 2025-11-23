/**
 * Base Entity Page Object for entity detail pages
 * Provides common functionality for all entity types (works, authors, institutions, etc.)
 */

import { BaseSPAPageObject } from './BaseSPAPageObject';
import { type Page } from '@playwright/test';

export type EntityType =
  | 'works'
  | 'authors'
  | 'institutions'
  | 'sources'
  | 'publishers'
  | 'funders'
  | 'concepts'
  | 'topics'
  | 'domains'
  | 'fields'
  | 'subfields'
  | 'keywords';

export abstract class BaseEntityPageObject extends BaseSPAPageObject {
  protected readonly entityType: EntityType;

  constructor(page: Page, entityType: EntityType) {
    super(page);
    this.entityType = entityType;
  }

  /**
   * Navigate to an entity detail page
   * @param entityId - The OpenAlex ID (e.g., 'W2741809807', 'A2208157607')
   */
  async gotoEntity(entityId: string): Promise<void> {
    await this.goto(`/${this.entityType}/${entityId}`);
    await this.waitForEntityLoaded();
  }

  /**
   * Navigate to entity index page (list of all entities of this type)
   */
  async gotoIndex(): Promise<void> {
    await this.goto(`/${this.entityType}`);
    await this.waitForPageReady();
  }

  /**
   * Wait for entity data to be loaded
   */
  async waitForEntityLoaded(timeout = 30000): Promise<void> {
    await this.waitForPageReady(timeout);
    await this.waitForDataLoaded(timeout);

    // Wait for entity-specific content (title or heading)
    await this.page.waitForSelector('h1, [data-entity-title]', {
      state: 'visible',
      timeout,
    });
  }

  /**
   * Get the entity title/name
   */
  async getEntityTitle(): Promise<string> {
    const titleLocator = this.page.locator('h1').first();
    return (await titleLocator.textContent()) ?? '';
  }

  /**
   * Get entity metadata (key-value pairs displayed on the page)
   */
  async getEntityMetadata(): Promise<Record<string, string>> {
    const metadata: Record<string, string> = {};

    // Try to find metadata sections (common patterns)
    const metadataItems = this.page.locator('[data-metadata], .metadata, dl');

    const count = await metadataItems.count();
    for (let i = 0; i < count; i++) {
      const item = metadataItems.nth(i);
      const key = await item.locator('dt, .metadata-key, [data-metadata-key]').first().textContent();
      const value = await item.locator('dd, .metadata-value, [data-metadata-value]').first().textContent();

      if (key && value) {
        metadata[key.trim()] = value.trim();
      }
    }

    return metadata;
  }

  /**
   * Check if the entity has a graph visualization
   */
  async hasGraph(): Promise<boolean> {
    return this.elementExists('[data-graph], #graph, .graph-container, canvas');
  }

  /**
   * Check if the entity has relationships displayed
   */
  async hasRelationships(): Promise<boolean> {
    return this.elementExists('[data-relationships], .relationships, [data-incoming], [data-outgoing]');
  }

  /**
   * Get count of incoming relationships
   */
  async getIncomingRelationshipCount(): Promise<number> {
    const incomingSection = this.page.locator('[data-incoming], .incoming-relationships, [data-relationship-type="incoming"]');

    if ((await incomingSection.count()) === 0) {
      return 0;
    }

    // Try to find relationship items
    const items = incomingSection.locator('[data-relationship-item], .relationship-item, li, .edge');
    return items.count();
  }

  /**
   * Get count of outgoing relationships
   */
  async getOutgoingRelationshipCount(): Promise<number> {
    const outgoingSection = this.page.locator('[data-outgoing], .outgoing-relationships, [data-relationship-type="outgoing"]');

    if ((await outgoingSection.count()) === 0) {
      return 0;
    }

    // Try to find relationship items
    const items = outgoingSection.locator('[data-relationship-item], .relationship-item, li, .edge');
    return items.count();
  }

  /**
   * Check if the entity detail page has a specific section
   * @param sectionName - The name of the section to check for
   */
  async hasSection(sectionName: string): Promise<boolean> {
    const sectionSelectors = [
      `[data-section="${sectionName}"]`,
      `.section-${sectionName}`,
      `h2:has-text("${sectionName}")`,
      `h3:has-text("${sectionName}")`,
    ];

    for (const selector of sectionSelectors) {
      if (await this.elementExists(selector)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if entity has a bookmark button
   */
  async hasBookmarkButton(): Promise<boolean> {
    return this.elementExists('button:has-text("Bookmark"), [data-bookmark-button], .bookmark-button');
  }

  /**
   * Click the bookmark button
   */
  async clickBookmark(): Promise<void> {
    const bookmarkButton = this.page.locator('button:has-text("Bookmark"), [data-bookmark-button], .bookmark-button').first();
    await bookmarkButton.click();
  }

  /**
   * Check if entity is currently bookmarked
   */
  async isBookmarked(): Promise<boolean> {
    const bookmarkButton = this.page.locator('button:has-text("Bookmark"), [data-bookmark-button], .bookmark-button').first();

    if ((await bookmarkButton.count()) === 0) {
      return false;
    }

    // Check for active/bookmarked state indicators
    const ariaPressed = await bookmarkButton.getAttribute('aria-pressed');
    const dataBookmarked = await bookmarkButton.getAttribute('data-bookmarked');
    const classList = await bookmarkButton.getAttribute('class');

    return (
      ariaPressed === 'true' ||
      dataBookmarked === 'true' ||
      (classList?.includes('bookmarked') ?? false) ||
      (classList?.includes('active') ?? false)
    );
  }

  /**
   * Check if the entity page shows a 404 error
   */
  async is404(): Promise<boolean> {
    const error404Indicators = [
      'text=/404/i',
      'text=/not found/i',
      '[data-error="404"]',
    ];

    for (const selector of error404Indicators) {
      if (await this.elementExists(selector)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Check if the entity page shows a server error
   */
  async isServerError(): Promise<boolean> {
    const errorIndicators = [
      'text=/500/i',
      'text=/server error/i',
      'text=/something went wrong/i',
      '[data-error="500"]',
    ];

    for (const selector of errorIndicators) {
      if (await this.elementExists(selector)) {
        return true;
      }
    }

    return await this.hasErrorBoundary();
  }

  /**
   * Get the OpenAlex ID from the current page URL
   */
  getEntityIdFromURL(): string | null {
    const url = this.getCurrentURL();
    const match = url.match(/\/[A-Z]\d+/);
    return match ? match[0].substring(1) : null;
  }

  /**
   * Wait for graph to be rendered
   */
  async waitForGraphRendered(timeout = 30000): Promise<void> {
    await this.waitForSelector('[data-graph], #graph, .graph-container, canvas', timeout);

    // Wait for graph to have content (nodes/edges rendered)
    await this.page.waitForFunction(
      () => {
        const canvas = document.querySelector('canvas');
        return canvas !== null;
      },
      { timeout }
    );
  }
}
