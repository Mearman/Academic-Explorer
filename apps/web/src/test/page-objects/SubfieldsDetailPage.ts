/**
 * Page Object for Subfield Detail Pages
 */

import { BaseEntityPageObject } from './BaseEntityPageObject';
import { type Page } from '@playwright/test';

export class SubfieldsDetailPage extends BaseEntityPageObject {
  constructor(page: Page) {
    super(page, 'subfields');
  }

  /**
   * Get the subfield display name
   */
  async getSubfieldName(): Promise<string> {
    return this.getEntityTitle();
  }

  /**
   * Get subfield description if available
   */
  async getSubfieldDescription(): Promise<string | null> {
    const descriptionLocator = this.page.locator('[data-description], .description, p').first();

    if ((await descriptionLocator.count()) === 0) {
      return null;
    }

    return descriptionLocator.textContent();
  }

  /**
   * Get the parent field name if displayed
   */
  async getParentField(): Promise<string | null> {
    const fieldLocator = this.page.locator('[data-parent-field], .parent-field, [data-field]');

    if ((await fieldLocator.count()) === 0) {
      return null;
    }

    return fieldLocator.textContent();
  }

  /**
   * Get the parent domain name if displayed
   */
  async getParentDomain(): Promise<string | null> {
    const domainLocator = this.page.locator('[data-parent-domain], .parent-domain, [data-domain]');

    if ((await domainLocator.count()) === 0) {
      return null;
    }

    return domainLocator.textContent();
  }

  /**
   * Check if subfield has topics listed
   */
  async hasTopics(): Promise<boolean> {
    return this.hasSection('Topics') || this.elementExists('[data-topics], .topics');
  }

  /**
   * Get count of topics in this subfield
   */
  async getTopicCount(): Promise<number> {
    const topicsSection = this.page.locator('[data-topics], .topics, [data-section="topics"]');

    if ((await topicsSection.count()) === 0) {
      return 0;
    }

    const topicItems = topicsSection.locator('[data-topic-item], .topic-item, li');
    return topicItems.count();
  }

  /**
   * Check if subfield has works/publications listed
   */
  async hasWorks(): Promise<boolean> {
    return this.hasSection('Works') || this.hasSection('Publications') || this.elementExists('[data-works], .works');
  }
}
