/**
 * Vitest setup file
 * This file runs before each test file
 */

import { vi } from 'vitest';

// Only import jest-dom for component tests where DOM assertions are needed
// Skip for E2E tests running in Node environment where expect may not be available yet
if (typeof window !== 'undefined') {
  // We're in a DOM environment (jsdom), load jest-dom after vitest globals are available
  import('@testing-library/jest-dom/vitest');
}

import { enableMapSet } from 'immer';
import 'vitest-axe/extend-expect';
import { startMockServer, stopMockServer, resetMockServer } from './msw/server';

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

// Setup MSW server for API mocking
// Only in test environments with proper globals
if (typeof beforeAll === 'function' && typeof afterAll === 'function' && typeof afterEach === 'function') {
  beforeAll(() => {
    startMockServer();
  });

  afterAll(() => {
    stopMockServer();
  });

  afterEach(() => {
    // Reset MSW handlers between tests
    resetMockServer();

    // Force garbage collection if available (helps with memory management)
    if (global.gc) {
      global.gc();
    }
  });
}