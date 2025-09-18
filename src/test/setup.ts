/**
 * Vitest setup file
 * This file runs before each test file
 */

// Only import jest-dom for component tests where DOM assertions are needed
// Skip for E2E tests running in Node environment where expect may not be available yet
if (typeof window !== 'undefined') {
  // We're in a DOM environment (jsdom), safe to import jest-dom
  import('@testing-library/jest-dom');
}

import { enableMapSet } from 'immer';
import 'vitest-axe/extend-expect';

// Configure test environment globals
globalThis.__DEV__ = true;

// Enable Immer plugins for test environment
enableMapSet();

// Environment-aware DOM mocking (only for jsdom environment)
if (typeof window !== 'undefined') {
  // Mock matchMedia for component tests that use responsive hooks
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation(query => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(), // deprecated
      removeListener: vi.fn(), // deprecated
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
} else {
  // Mock localStorage for node environment (integration/e2e tests)
  // This prevents Zustand persist middleware warnings
  const mockStorage = {
    getItem: () => null,
    setItem: () => {},
    removeItem: () => {},
    clear: () => {},
    length: 0,
    key: () => null,
  };

  global.localStorage = mockStorage;
  global.sessionStorage = mockStorage;
}

// Mock ResizeObserver for components that measure elements
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Mock IntersectionObserver for components that use visibility detection
global.IntersectionObserver = class IntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};

// Clean up between tests to prevent memory leaks
// Only register afterEach if we're in a proper test environment
if (typeof afterEach === 'function') {
  afterEach(() => {
    // Force garbage collection if available (helps with memory management)
    if (global.gc) {
      global.gc();
    }
  });
}