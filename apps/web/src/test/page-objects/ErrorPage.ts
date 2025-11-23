/**
 * Page Object for Error Pages (404, 500, etc.)
 */

import { BaseSPAPageObject } from './BaseSPAPageObject';
import { type Page } from '@playwright/test';

export type ErrorType = '404' | '500' | 'network' | 'timeout' | 'unknown';

export class ErrorPage extends BaseSPAPageObject {
  constructor(page: Page) {
    super(page);
  }

  /**
   * Check if currently on an error page
   */
  async isErrorPage(): Promise<boolean> {
    const errorIndicators = [
      '[data-error-page]',
      '.error-page',
      'text=/404/i',
      'text=/not found/i',
      'text=/500/i',
      'text=/server error/i',
      'text=/something went wrong/i',
    ];

    for (const selector of errorIndicators) {
      if (await this.elementExists(selector)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Get the error type from the page
   */
  async getErrorType(): Promise<ErrorType> {
    // Check for 404
    if (await this.elementExists('text=/404/i, text=/not found/i, [data-error="404"]')) {
      return '404';
    }

    // Check for 500
    if (await this.elementExists('text=/500/i, text=/server error/i, [data-error="500"]')) {
      return '500';
    }

    // Check for network error
    if (await this.elementExists('text=/network/i, text=/offline/i, text=/connection/i, [data-error="network"]')) {
      return 'network';
    }

    // Check for timeout
    if (await this.elementExists('text=/timeout/i, text=/timed out/i, [data-error="timeout"]')) {
      return 'timeout';
    }

    return 'unknown';
  }

  /**
   * Get the error message displayed
   */
  async getErrorMessage(): Promise<string> {
    const messageLocators = [
      '[data-error-message]',
      '.error-message',
      '[role="alert"]',
      'p, h2, h3',
    ];

    for (const selector of messageLocators) {
      if (await this.elementExists(selector)) {
        const text = await this.page.locator(selector).first().textContent();
        if (text) {
          return text.trim();
        }
      }
    }

    return '';
  }

  /**
   * Check if there's a retry button
   */
  async hasRetryButton(): Promise<boolean> {
    return this.elementExists('button:has-text("Retry"), button:has-text("Try Again"), [data-retry]');
  }

  /**
   * Click the retry button
   */
  async clickRetry(): Promise<void> {
    const retryButton = this.page.locator('button:has-text("Retry"), button:has-text("Try Again"), [data-retry]').first();
    await retryButton.click();
    await this.waitForPageReady();
  }

  /**
   * Check if there's a "back to home" link
   */
  async hasBackToHomeLink(): Promise<boolean> {
    return this.elementExists('a:has-text("Home"), a:has-text("Back"), [data-home-link]');
  }

  /**
   * Click the "back to home" link
   */
  async clickBackToHome(): Promise<void> {
    const homeLink = this.page.locator('a:has-text("Home"), a:has-text("Back"), [data-home-link]').first();
    await homeLink.click();
    await this.waitForNavigation();
  }

  /**
   * Get the error code if displayed
   */
  async getErrorCode(): Promise<string | null> {
    const codePatterns = [
      /\b(404|500|503|502)\b/,
      /error\s+code:\s*(\d+)/i,
    ];

    const pageText = await this.page.textContent('body');

    if (!pageText) {
      return null;
    }

    for (const pattern of codePatterns) {
      const match = pageText.match(pattern);
      if (match) {
        return match[1];
      }
    }

    return null;
  }
}
