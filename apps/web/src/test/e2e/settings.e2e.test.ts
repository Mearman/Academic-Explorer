/**
 * E2E Tests for Settings Page
 * Tests settings page functionality including toggles and persistence
 *
 * @tags @utility @settings @critical
 */

import { test, expect } from '@playwright/test';
import { SettingsPage } from '../page-objects/SettingsPage';
import { waitForAppReady } from '../helpers/app-ready';
import { AssertionHelper } from '../helpers/AssertionHelper';

test.describe('Settings Page', () => {
  let settingsPage: SettingsPage;
  let assertions: AssertionHelper;

  test.beforeEach(async ({ page }) => {
    settingsPage = new SettingsPage(page);
    assertions = new AssertionHelper(page);
  });

  test('should load settings page successfully', async ({ page }) => {
    await settingsPage.goto();
    await waitForAppReady(page);

    expect(page.url()).toContain('/settings');
    await assertions.waitForNoError();
  });

  test('should display settings toggles if available', async ({ page }) => {
    await settingsPage.goto();
    await waitForAppReady(page);

    const hasToggles = await settingsPage.hasToggles();

    if (hasToggles) {
      const settingNames = await settingsPage.getSettingNames();
      expect(settingNames.length).toBeGreaterThan(0);
    }

    // Page should load without errors regardless
    await assertions.waitForNoError();
  });

  test('should persist settings across page reloads', async ({ page }) => {
    await settingsPage.goto();
    await waitForAppReady(page);

    const hasToggles = await settingsPage.hasToggles();

    if (hasToggles) {
      const settingNames = await settingsPage.getSettingNames();

      if (settingNames.length > 0) {
        const firstSetting = settingNames[0];

        // Get initial state
        const initialState = await settingsPage.isSettingEnabled(firstSetting);

        // Toggle the setting
        await settingsPage.toggleSetting(firstSetting);
        await page.waitForTimeout(500);

        // Verify state changed
        const newState = await settingsPage.isSettingEnabled(firstSetting);
        expect(newState).not.toBe(initialState);

        // Reload page
        await page.reload();
        await waitForAppReady(page);

        // Verify setting persisted
        const persistedState = await settingsPage.isSettingEnabled(firstSetting);
        expect(persistedState).toBe(newState);
      }
    }
  });

  test('should be accessible', async ({ page }) => {
    await settingsPage.goto();
    await waitForAppReady(page);

    await assertions.verifyAccessibility({
      includedImpacts: ['critical', 'serious'],
    });
  });
});
