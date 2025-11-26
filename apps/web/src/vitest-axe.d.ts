/// <reference types="vitest" />
import type { AxeResults } from "axe-core";

declare module "vitest" {
  interface Assertion<T = unknown> {
    toHaveNoViolations(): void;
  }
  
  interface AsymmetricMatchersContaining {
    toHaveNoViolations(): void;
  }
}
