/**
 * Vitest setup file
 * This file runs before each test file
 */

// Make this a module to allow top-level await
export { };

// Only load Vitest in actual test environments, not during dev server startup
if (typeof process !== 'undefined' && process.env.VITEST) {
  const { vi } = await import('vitest');

  // Ensure minimal TextEncoder/TextDecoder implementations synchronously
  // so they're available before any other modules (like esbuild) are loaded.
  // Some test environments may import modules before async setup runs, which
  // can trigger esbuild's invariant check. A quick sync fallback prevents that.
  if (typeof (global as any).TextEncoder === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(global as any).TextEncoder = class {
      encode(input = '') {
        // Buffer is available in Node-based test environments; this returns a Uint8Array
        // which satisfies esbuild's invariant check.
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Buffer = require('buffer').Buffer;
        return new Uint8Array(Buffer.from(String(input), 'utf-8'));
      }
    } as any;
  }

  if (typeof (global as any).TextDecoder === 'undefined') {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ;(global as any).TextDecoder = class {
      decode(input: Uint8Array | Buffer) {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        const Buffer = require('buffer').Buffer;
        return Buffer.from(input as any).toString('utf-8');
      }
    } as any;
  }

  // Only import jest-dom for component tests where DOM assertions are needed
  // Skip for E2E tests running in Node environment where expect may not be available yet
  if (typeof window !== 'undefined') {
    // We're in a DOM environment (jsdom), load jest-dom after vitest globals are available
    import('@testing-library/jest-dom/vitest').catch(() => {
      // Fallback to the old import if the new one fails
      return import('@testing-library/jest-dom');
    });
  }

  const { enableMapSet } = await import('immer');
  await import('vitest-axe/extend-expect');
  const { resetMockServer, startMockServer, stopMockServer } = await import('./msw/server');

  // Configure test environment globals
  (globalThis as any).__DEV__ = true;

  // Increase process event listener limits to prevent MaxListenersExceededWarning
  // This is common in test environments with multiple parallel operations
  if (typeof process !== 'undefined' && process.setMaxListeners) {
    process.setMaxListeners(50);
  }

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

  // Ensure TextEncoder/TextDecoder are available and behave correctly for
  // environments that run esbuild (some Node test environments lack the
  // browser implementations). Use Node's util.TextEncoder/TextDecoder when
  // available, otherwise provide a simple Buffer-based fallback.
  try {
    // Top-level await is allowed in this module; attempt to import util
    const util = await import('util');
    if (typeof global.TextEncoder === 'undefined' || typeof global.TextDecoder === 'undefined') {
      // @ts-ignore - assign polyfills to global
      global.TextEncoder = util.TextEncoder;
      // @ts-ignore
      global.TextDecoder = util.TextDecoder;
    }
  } catch (err) {
    // Fallback: minimal Buffer-based implementations
    // These satisfy esbuild's invariant checks (encode returns a Uint8Array)
    // and are adequate for tests that simply need TextEncoder/TextDecoder.
    // @ts-ignore
    if (typeof global.TextEncoder === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // @ts-ignore
      global.TextEncoder = class {
        encode(input = '') {
          return new Uint8Array(Buffer.from(String(input), 'utf-8'));
        }
      } as any;
    }

    // @ts-ignore
    if (typeof global.TextDecoder === 'undefined') {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // @ts-ignore
      global.TextDecoder = class {
        decode(input: Uint8Array | Buffer) {
          return Buffer.from(input).toString('utf-8');
        }
      } as any;
    }
  }

  // Mock ResizeObserver for components that measure elements
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Mock IntersectionObserver for components that use visibility detection
  (global as any).IntersectionObserver = class IntersectionObserver {
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

  // React Query setup for component tests
  if (typeof window !== 'undefined') {
    // Only set up React Query in DOM environment (component tests)
    const { QueryClient } = await import('@tanstack/react-query');

    // Create a new QueryClient for each test
    const createTestQueryClient = () => new QueryClient({
      defaultOptions: {
        queries: {
          // Turn off retries for tests
          retry: false,
          // Turn off refetch on window focus for tests
          refetchOnWindowFocus: false,
        },
        mutations: {
          // Turn off retries for tests
          retry: false,
        },
      },
    });

    // Make QueryClient available globally for tests
    (global as any).testQueryClient = createTestQueryClient();
  }

  // Partial module mocks to protect integration tests that expect
  // certain exports from framework libraries. These mocks are safe
  // fallbacks that preserve original behavior when available.
  if (typeof vi !== 'undefined') {
    // Partially mock @tanstack/react-router to ensure createFileRoute exists
    // Tests often import createFileRoute and expect it to return a route
    // factory. If the real module is present, we preserve it via importOriginal.
    try {
      vi.mock(import('@tanstack/react-router'), async (importOriginal) => {
        const actual = await importOriginal();
        // Provide a minimal createFileRoute if it's not exported by the real module
        const createFileRoute = actual.createFileRoute ?? ((path: string) => (opts: any) => ({ path, ...opts }));
        return {
          ...actual,
          createFileRoute,
        };
      });
    } catch (e) {
      // If mocking fails (for e.g. running in an environment without vi), ignore
    }

    // Simple stub for 'history' package if imports fail in test transforms
    try {
      vi.mock('history', () => ({ createBrowserHistory: () => ({ listen: () => {}, push: () => {} }) }));
    } catch (e) {
      // ignore
    }
  }
}
