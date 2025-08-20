import { expect, vi } from 'vitest';
import * as matchers from '@testing-library/jest-dom/matchers';

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers);

// CRITICAL: Global timeout guard to prevent hanging tests
const originalSetTimeout = global.setTimeout;
const originalSetInterval = global.setInterval;

// Override setTimeout with a maximum timeout limit
global.setTimeout = ((callback: any, delay?: number, ...args: any[]) => {
  const maxDelay = 5000; // 5 second maximum
  const safeDelay = delay && delay > maxDelay ? maxDelay : delay;
  return originalSetTimeout(callback, safeDelay, ...args);
}) as typeof setTimeout;

// Override setInterval with a maximum interval limit
global.setInterval = ((callback: any, delay?: number, ...args: any[]) => {
  const maxDelay = 5000; // 5 second maximum
  const safeDelay = delay && delay > maxDelay ? maxDelay : delay;
  return originalSetInterval(callback, safeDelay, ...args);
}) as typeof setInterval;