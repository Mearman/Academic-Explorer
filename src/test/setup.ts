/**
 * Vitest setup file
 * This file runs before each test file
 */

import '@testing-library/jest-dom';
import { enableMapSet } from 'immer';

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
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
    clear: vi.fn(),
    length: 0,
    key: vi.fn(() => null),
  };

  global.localStorage = mockStorage;
  global.sessionStorage = mockStorage;
}

// Mock ResizeObserver for components that measure elements
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Mock IntersectionObserver for components that use visibility detection
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Clean up between tests to prevent memory leaks
afterEach(() => {
  // Force garbage collection if available (helps with memory management)
  if (global.gc) {
    global.gc();
  }
});