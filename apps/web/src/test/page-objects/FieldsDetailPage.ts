/**
 * Page Object for Field Detail Pages
 */

import { BaseEntityPageObject } from './BaseEntityPageObject';
import { type Page } from '@playwright/test';

export class FieldsDetailPage extends BaseEntityPageObject {
  constructor(page: Page) {
    super(page, 'fields');
  }

  /**
   * Get the field display name
   */
  async getFieldName(): Promise<string> {
    return this.getEntityTitle();
  }

  /**
   * Get field description if available
   */
  async getFieldDescription(): Promise<string | null> {
    const descriptionLocator = this.page.locator('[data-description], .description, p').first();

    if ((await descriptionLocator.count()) === 0) {
      return null;
    }

    return descriptionLocator.textContent();
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
   * Check if field has subfields listed
   */
  async hasSubfields(): Promise<boolean> {
    return this.hasSection('Subfields') || this.elementExists('[data-subfields], .subfields');
  }

  /**
   * Get count of subfields in this field
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
   * Check if field has works/publications listed
   */
  async hasWorks(): Promise<boolean> {
    return this.hasSection('Works') || this.hasSection('Publications') || this.elementExists('[data-works], .works');
  }
}
