// Ensure TextEncoder/TextDecoder are available synchronously before any other code
// This is critical for esbuild to work properly in test environments
import { Buffer } from "buffer";
import { TextEncoder as NodeTextEncoder, TextDecoder as NodeTextDecoder } from "util";

try {
  global.TextEncoder = NodeTextEncoder as typeof TextEncoder;
  global.TextDecoder = NodeTextDecoder as typeof TextDecoder;
  globalThis.TextEncoder = NodeTextEncoder as typeof TextEncoder;
  globalThis.TextDecoder = NodeTextDecoder as typeof TextDecoder;
} catch (_err) {
  // If util import fails, create minimal implementations
  global.TextEncoder = class {
    encoding = "utf-8";
    encode(input = "") {
      const buf = Buffer.from(String(input), "utf-8");
      return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
    }
    encodeInto(input, dest) {
      const encoded = this.encode(input);
      const copied = Math.min(encoded.length, dest.length);
      dest.set(encoded.subarray(0, copied));
      return { read: input.length, written: copied };
    }
  };

  global.TextDecoder = class {
    encoding = "utf-8";
    fatal = false;
    ignoreBOM = false;
    decode(input) {
      return Buffer.from(input).toString("utf-8");
    }
  };

  globalThis.TextEncoder = global.TextEncoder;
  globalThis.TextDecoder = global.TextDecoder;
}

/**
 * Vitest setup file
 * This file runs before each test file
 */

// Make this a module to allow top-level await
export {};

// Only load Vitest in actual test environments, not during dev server startup
if (typeof process !== "undefined" && process.env.VITEST) {
  const { vi } = await import("vitest");

  if (typeof (global as unknown as { TextDecoder?: unknown }).TextDecoder === "undefined") {
    (global as unknown as { TextDecoder: typeof TextDecoder }).TextDecoder = class TextDecoder {
      encoding = "utf-8" as const;
      fatal = false;
      ignoreBOM = false;
      decode(input?: Uint8Array | Buffer): string {
        if (!input) return "";
        return Buffer.from(input as Uint8Array | Buffer).toString("utf-8");
      }
    } as typeof TextDecoder;
  }

  // Import jest-dom for Vitest - extends expect with DOM matchers
  // The vitest environment should be set to jsdom for component tests
  await import("@testing-library/jest-dom/vitest");

  const { enableMapSet } = await import("immer");
  await import("vitest-axe/extend-expect");
  const { resetMockServer, startMockServer, stopMockServer } = await import(
    "./msw/server"
  );

  // Configure test environment globals
  (globalThis as Record<string, unknown>).__DEV__ = true;

  // Increase process event listener limits to prevent MaxListenersExceededWarning
  // This is common in test environments with multiple parallel operations
  if (typeof process !== "undefined" && process.setMaxListeners) {
    process.setMaxListeners(50);
  }

  // Enable Immer plugins for test environment
  enableMapSet();

  // Environment-aware DOM mocking (only for jsdom environment)
  if (typeof window !== "undefined") {
    // Mock matchMedia for component tests that use responsive hooks
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query) => ({
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

  // TextEncoder/TextDecoder setup is handled above synchronously

  // Mock ResizeObserver for components that measure elements
  global.ResizeObserver = class ResizeObserver {
    observe() {}
    unobserve() {}
    disconnect() {}
  };

  // Mock IntersectionObserver for components that use visibility detection
  (global as unknown as { IntersectionObserver: typeof IntersectionObserver }).IntersectionObserver = class IntersectionObserver {
    root = null;
    rootMargin = "";
    thresholds: ReadonlyArray<number> = [];
    observe(): void {}
    unobserve(): void {}
    disconnect(): void {}
    takeRecords(): IntersectionObserverEntry[] { return []; }
  } as typeof IntersectionObserver;

  // Setup MSW server for API mocking
  // Only in test environments with proper globals
  if (
    typeof beforeAll === "function" &&
    typeof afterAll === "function" &&
    typeof afterEach === "function"
  ) {
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
  if (typeof window !== "undefined") {
    // Only set up React Query in DOM environment (component tests)
    const { QueryClient } = await import("@tanstack/react-query");

    // Create a new QueryClient for each test
    const createTestQueryClient = () =>
      new QueryClient({
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
    (global as Record<string, unknown>).testQueryClient = createTestQueryClient();
  }

  // Partial module mocks to protect integration tests that expect
  // certain exports from framework libraries. These mocks are safe
  // fallbacks that preserve original behavior when available.
  if (typeof vi !== "undefined") {
    // Partially mock @tanstack/react-router to ensure createFileRoute exists
    // Tests often import createFileRoute and expect it to return a route
    // factory. If the real module is present, we preserve it via importOriginal.
    try {
      vi.mock("@tanstack/react-router", async (importOriginal) => {
        const actual = await importOriginal();
        // Provide a minimal createFileRoute if it's not exported by the real module
        const createFileRoute =
          actual.createFileRoute ??
          ((path: string) => (opts?: Record<string, unknown>) => ({
            path,
            options: opts || {},
            ...opts
          }));
        return {
          ...actual,
          createFileRoute,
        };
      });
    } catch (_e) {
      // If mocking fails (for e.g. running in an environment without vi), ignore
    }

    // Simple stub for 'history' package if imports fail in test transforms
    try {
      vi.mock("history", () => ({
        createBrowserHistory: () => ({ listen: () => {}, push: () => {} }),
        createMemoryHistory: () => ({ listen: () => {}, push: () => {} }),
      }));
    } catch (_e) {
      // ignore
    }
  }
}
