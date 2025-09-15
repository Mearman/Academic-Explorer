/**
 * Vitest setup file
 * This file runs before each test file
 */

import '@testing-library/jest-dom';

// Configure test environment globals
globalThis.__DEV__ = true;

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