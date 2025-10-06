/**
 * Shared test setup utilities for consistent test environment configuration
 * across all projects in the Academic Explorer workspace.
 *
 * @vitest-environment jsdom
 */

import { vi, beforeEach, afterEach } from "vitest";
import type { Mock } from "vitest";

/**
 * Environment detection utilities
 */
export const TestEnvironment = {
  isNode: (): boolean => typeof window === "undefined",
  isJsdom: (): boolean => typeof window !== "undefined" && window.name === "jsdom",
  isBrowser: (): boolean => typeof window !== "undefined" && window.name !== "jsdom",
} as const;

/**
 * Browser API mocks for consistent testing across environments
 */
export const BrowserMocks = {
  /**
   * Mock IntersectionObserver API
   */
  mockIntersectionObserver: (): Mock => {
    const mockIntersectionObserver = vi.fn();
    mockIntersectionObserver.mockReturnValue({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    });

    Object.defineProperty(window, "IntersectionObserver", {
      writable: true,
      configurable: true,
      value: mockIntersectionObserver,
    });

    return mockIntersectionObserver;
  },

  /**
   * Mock ResizeObserver API
   */
  mockResizeObserver: (): Mock => {
    const mockResizeObserver = vi.fn();
    mockResizeObserver.mockReturnValue({
      observe: vi.fn(),
      unobserve: vi.fn(),
      disconnect: vi.fn(),
    });

    Object.defineProperty(window, "ResizeObserver", {
      writable: true,
      configurable: true,
      value: mockResizeObserver,
    });

    return mockResizeObserver;
  },

  /**
   * Mock matchMedia API
   */
  mockMatchMedia: (): Mock => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      configurable: true,
      value: vi.fn().mockImplementation((query: string) => ({
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

    return window.matchMedia as Mock;
  },

  /**
   * Mock clipboard API
   */
  mockClipboard: (): Mock => {
    Object.defineProperty(navigator, "clipboard", {
      writable: true,
      configurable: true,
      value: {
        writeText: vi.fn().mockResolvedValue(undefined),
        readText: vi.fn().mockResolvedValue(""),
      },
    });

    return navigator.clipboard as any;
  },

  /**
   * Mock window dimensions and viewport APIs
   */
  mockWindowDimensions: (width = 1920, height = 1080): void => {
    Object.defineProperty(window, "innerWidth", {
      writable: true,
      configurable: true,
      value: width,
    });

    Object.defineProperty(window, "innerHeight", {
      writable: true,
      configurable: true,
      value: height,
    });

    Object.defineProperty(window, "outerWidth", {
      writable: true,
      configurable: true,
      value: width + 16, // Add some padding for typical window chrome
    });

    Object.defineProperty(window, "outerHeight", {
      writable: true,
      configurable: true,
      value: height + 60, // Add some padding for typical window chrome
    });

    // Mock getBoundingClientRect for consistency
    Element.prototype.getBoundingClientRect = vi.fn().mockReturnValue({
      width: 100,
      height: 50,
      top: 0,
      left: 0,
      bottom: 50,
      right: 100,
      x: 0,
      y: 0,
      toJSON: vi.fn(),
    });
  },

  /**
   * Mock requestAnimationFrame and cancelAnimationFrame
   */
  mockAnimationFrame: (): { raf: Mock; caf: Mock } => {
    const raf = vi.fn().mockImplementation((cb: FrameRequestCallback) => {
      return setTimeout(cb, 16); // ~60fps
    });

    const caf = vi.fn().mockImplementation((id: number) => {
      clearTimeout(id);
    });

    Object.defineProperty(window, "requestAnimationFrame", {
      writable: true,
      configurable: true,
      value: raf,
    });

    Object.defineProperty(window, "cancelAnimationFrame", {
      writable: true,
      configurable: true,
      value: caf,
    });

    return { raf, caf };
  },
} as const;

/**
 * Logger mocking utilities
 */
export const LoggerMocks = {
  /**
   * Mock the project's custom logger
   */
  mockLogger: (): {
    info: Mock;
    warn: Mock;
    error: Mock;
    debug: Mock;
    logError: Mock;
  } => {
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
      debug: vi.fn(),
    };

    const logError = vi.fn();

    vi.doMock("@/lib/logger", () => ({
      logger,
      logError,
    }));

    return { ...logger, logError };
  },

  /**
   * Mock console methods
   */
  mockConsole: (): {
    log: Mock;
    warn: Mock;
    error: Mock;
    info: Mock;
    debug: Mock;
  } => {
    const consoleMethods = {
      log: vi.spyOn(console, "log").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
    };

    return consoleMethods;
  },
} as const;

/**
 * Common test setup patterns
 */
export const TestSetup = {
  /**
   * Standard beforeEach setup for all tests
   */
  standardBeforeEach: (): void => {
    vi.clearAllMocks();

    // Setup browser mocks if in jsdom environment
    if (TestEnvironment.isJsdom()) {
      BrowserMocks.mockWindowDimensions();
      BrowserMocks.mockIntersectionObserver();
      BrowserMocks.mockResizeObserver();
      BrowserMocks.mockMatchMedia();
      BrowserMocks.mockClipboard();
      BrowserMocks.mockAnimationFrame();
    }
  },

  /**
   * Standard afterEach cleanup
   */
  standardAfterEach: (): void => {
    vi.clearAllMocks();
  },

  /**
   * Setup for React component tests
   */
  reactBeforeEach: (): void => {
    TestSetup.standardBeforeEach();
    LoggerMocks.mockLogger();
  },

  /**
   * Setup for hook tests
   */
  hookBeforeEach: (): void => {
    TestSetup.reactBeforeEach();
  },

  /**
   * Setup for API/service tests
   */
  apiBeforeEach: (): void => {
    TestSetup.standardBeforeEach();
    LoggerMocks.mockLogger();

    // Mock fetch globally for API tests
    if (TestEnvironment.isNode() || TestEnvironment.isJsdom()) {
      global.fetch = vi.fn();
    }
  },
} as const;

/**
 * Utility for creating mock responses
 */
export const createMockResponse = (
  data: any,
  options: {
    status?: number;
    statusText?: string;
    headers?: Record<string, string>;
  } = {}
): Response => {
  const { status = 200, statusText = "OK", headers = {} } = options;

  return new Response(JSON.stringify(data), {
    status,
    statusText,
    headers: new Headers({
      "content-type": "application/json",
      ...headers,
    }),
  });
};

/**
 * Utility for creating mock errors
 */
export const createMockError = (message: string, status = 500): Response => {
  return createMockResponse(
    { error: message },
    { status, statusText: "Error" }
  );
};

/**
 * Environment-aware test configuration
 */
export const TestConfig = {
  /**
   * Get timeout based on environment
   */
  getTimeout: (baseTimeout = 5000): number => {
    if (TestEnvironment.isNode()) {
      return baseTimeout;
    }
    // Increase timeout for jsdom environment
    return baseTimeout * 2;
  },

  /**
   * Get retry count based on environment
   */
  getRetryCount: (baseRetries = 3): number => {
    if (TestEnvironment.isNode()) {
      return baseRetries;
    }
    // Reduce retries for jsdom to speed up tests
    return Math.max(1, Math.floor(baseRetries / 2));
  },
} as const;

/**
 * Performance testing utilities
 */
export const PerformanceMocks = {
  /**
   * Mock performance.now for consistent timing
   */
  mockPerformanceNow: (): Mock => {
    let mockTime = 0;
    const performanceNow = vi.fn().mockImplementation(() => {
      mockTime += 16; // ~60fps
      return mockTime;
    });

    Object.defineProperty(performance, "now", {
      writable: true,
      configurable: true,
      value: performanceNow,
    });

    return performanceNow;
  },

  /**
   * Mock Date for consistent time-based testing
   */
  mockDate: (fixedDate?: Date): Mock => {
    const mockDate = vi.fn().mockImplementation((...args: any[]) => {
      if (args.length === 0) {
        return fixedDate || new Date("2024-01-01T00:00:00.000Z");
      }
      return new (Date as any)(...args);
    });

    mockDate.prototype = Date.prototype;

    Object.setPrototypeOf(mockDate, Date);

    global.Date = mockDate as any;

    return mockDate;
  },
} as const;

/**
 * Memory leak detection utilities
 */
export const MemoryMocks = {
  /**
   * Track object creation for memory leak detection
   */
  trackObjectCreation: (): {
    created: Set<any>;
    clear: () => void;
    getCount: () => number;
  } => {
    const created = new Set();

    const originalDefineProperty = Object.defineProperty;
    Object.defineProperty = vi.fn().mockImplementation((obj, prop, descriptor) => {
      created.add(obj);
      return originalDefineProperty(obj, prop, descriptor);
    });

    return {
      created,
      clear: () => created.clear(),
      getCount: () => created.size,
    };
  },
} as const;