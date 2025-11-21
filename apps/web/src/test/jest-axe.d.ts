/**
 * Type definitions for vitest-axe matchers
 * Extends Vitest's Assertion interface with accessibility testing matchers
 */

import type { AxeResults } from 'axe-core';

declare module 'vitest' {
  interface Assertion<T = any> {
    toHaveNoViolations(): Promise<void>;
  }
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): any;
  }
}
