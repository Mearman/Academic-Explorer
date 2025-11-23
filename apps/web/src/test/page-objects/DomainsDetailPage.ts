/**
 * Page Object for Domain Detail Pages
 */

import { BaseEntityPageObject } from './BaseEntityPageObject';
import { type Page } from '@playwright/test';

export class DomainsDetailPage extends BaseEntityPageObject {
  constructor(page: Page) {
    super(page, 'domains');
  }

  /**
   * Get the domain display name
   */
  async getDomainName(): Promise<string> {
    return this.getEntityTitle();
  }

  /**
   * Get domain description if available
   */
  async getDomainDescription(): Promise<string | null> {
    const descriptionLocator = this.page.locator('[data-description], .description, p').first();

    if ((await descriptionLocator.count()) === 0) {
      return null;
    }

    return descriptionLocator.textContent();
  }

  /**
   * Check if domain has fields listed
   */
  async hasFields(): Promise<boolean> {
    return this.hasSection('Fields') || this.elementExists('[data-fields], .fields');
  }

  /**
   * Get count of fields in this domain
   */
  async getFieldCount(): Promise<number> {
    const fieldsSection = this.page.locator('[data-fields], .fields, [data-section="fields"]');

    if ((await fieldsSection.count()) === 0) {
      return 0;
    }

    const fieldItems = fieldsSection.locator('[data-field-item], .field-item, li');
    return fieldItems.count();
  }

  /**
   * Check if domain has subfields listed
   */
  async hasSubfields(): Promise<boolean> {
    return this.hasSection('Subfields') || this.elementExists('[data-subfields], .subfields');
  }

  /**
   * Get count of subfields in this domain
   */
  async getSubfieldCount(): Promise<number> {
    const subfieldsSection = this.page.locator('[data-subfields], .subfields, [data-section="subfields"]');

    if ((await subfieldsSection.count()) === 0) {
      return 0;
    }

    const subfieldItems = subfieldsSection.locator('[data-subfield-item], .subfield-item, li');
    return subfieldItems.count();
  }

  /**
   * Check if domain has works/publications listed
   */
  async hasWorks(): Promise<boolean> {
    return this.hasSection('Works') || this.hasSection('Publications') || this.elementExists('[data-works], .works');
  }
}
