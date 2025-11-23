/**
 * Page Object for Settings Page
 */

import { BaseSPAPageObject } from './BaseSPAPageObject';
import { type Page } from '@playwright/test';

export class SettingsPage extends BaseSPAPageObject {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Navigate to the settings page
   */
  async goto(): Promise<void> {
    await super.goto('/settings');
    await this.waitForPageReady();
  }

  /**
   * Check if settings page has any toggles/switches
   */
  async hasToggles(): Promise<boolean> {
    return this.elementExists('[role="switch"], input[type="checkbox"], .toggle');
  }

  /**
   * Get all toggle/setting names
   */
  async getSettingNames(): Promise<string[]> {
    const settings = this.page.locator('[data-setting], .setting, label');
    const count = await settings.count();

    const names: string[] = [];
    for (let i = 0; i < count; i++) {
      const text = await settings.nth(i).textContent();
      if (text) {
        names.push(text.trim());
      }
    }

    return names;
  }

  /**
   * Toggle a specific setting
   * @param settingName - The name of the setting
   */
  async toggleSetting(settingName: string): Promise<void> {
    const toggle = this.page.locator(`label:has-text("${settingName}") input, [data-setting="${settingName}"] input`).first();
    await toggle.click();
  }

  /**
   * Check if a setting is enabled
   * @param settingName - The name of the setting
   */
  async isSettingEnabled(settingName: string): Promise<boolean> {
    const toggle = this.page.locator(`label:has-text("${settingName}") input, [data-setting="${settingName}"] input`).first();

    if ((await toggle.count()) === 0) {
      return false;
    }

    return toggle.isChecked();
  }

  /**
   * Save settings (if there's a save button)
   */
  async saveSettings(): Promise<void> {
    const saveButton = this.page.locator('button:has-text("Save"), [data-save-settings]');

    if ((await saveButton.count()) > 0) {
      await saveButton.click();
      await this.waitForLoadingComplete();
    }
  }

  /**
   * Reset settings to defaults (if there's a reset button)
   */
  async resetSettings(): Promise<void> {
    const resetButton = this.page.locator('button:has-text("Reset"), button:has-text("Default"), [data-reset-settings]');

    if ((await resetButton.count()) > 0) {
      await resetButton.click();
      await this.waitForLoadingComplete();
    }
  }
}
