/**
 * Test isolation and cleanup utilities
 * Provides comprehensive test isolation, cleanup, and state management
 */

import { vi } from 'vitest';
import { EventEmitter } from 'events';
import {
  resetProviderHelper
} from './provider-helpers';
import {
  resetEventHelper
} from './event-helpers';
import {
  resetPerformanceHelper
} from './performance-helpers';

/**
 * Test isolation configuration
 */
export interface TestIsolationConfig {
  resetProviders?: boolean;
  resetEvents?: boolean;
  resetPerformance?: boolean;
  resetTimers?: boolean;
  resetMocks?: boolean;
  resetGlobalState?: boolean;
  customCleanup?: Array<() => void | Promise<void>>;
}

/**
 * Global test state that needs isolation
 */
interface GlobalTestState {
  originalConsole: {
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  };
  originalTimers: {
    setTimeout: typeof setTimeout;
    clearTimeout: typeof clearTimeout;
    setInterval: typeof setInterval;
    clearInterval: typeof clearInterval;
    Date: typeof Date;
  };
  originalFetch?: typeof fetch;
  mockRegistry: Set<ReturnType<typeof vi.fn>>;
  timerRegistry: Set<NodeJS.Timeout>;
  listenerRegistry: Map<EventTarget | EventEmitter, Array<{
    event: string;
    listener: EventListenerOrEventListenerObject | ((...args: unknown[]) => void);
    options?: AddEventListenerOptions | boolean;
  }>>;
  globalVariables: Map<string, unknown>;
  processListeners: Map<string, Array<(...args: unknown[]) => void>>;
}

/**
 * Test isolation utility class
 */
export class TestIsolationHelper {
  private static instance: TestIsolationHelper | null = null;
  private state: GlobalTestState;
  private isolationStack: Array<{
    config: TestIsolationConfig;
    snapshot: Partial<GlobalTestState>;
    timestamp: number;
  }> = [];

  constructor() {
    this.state = this.captureInitialState();
  }

  static getInstance(): TestIsolationHelper {
    if (!TestIsolationHelper.instance) {
      TestIsolationHelper.instance = new TestIsolationHelper();
    }
    return TestIsolationHelper.instance;
  }

  /**
   * Enter test isolation with specified configuration
   */
  enterIsolation(config: TestIsolationConfig = {}): void {
    const snapshot = this.captureCurrentState();
    this.isolationStack.push({
      config,
      snapshot,
      timestamp: Date.now(),
    });

    this.applyIsolation(config);
  }

  /**
   * Exit current test isolation level
   */
  async exitIsolation(): Promise<void> {
    const current = this.isolationStack.pop();
    if (!current) {
      throw new Error('No isolation level to exit');
    }

    await this.restoreState(current.config, current.snapshot);
  }

  /**
   * Run a test with isolation
   */
  async withIsolation<T>(
    testFn: () => T | Promise<T>,
    config: TestIsolationConfig = {}
  ): Promise<T> {
    this.enterIsolation(config);

    try {
      const result = await testFn();
      return result;
    } finally {
      await this.exitIsolation();
    }
  }

  /**
   * Create isolated test environment for a specific test suite
   */
  createSuiteIsolation(config: TestIsolationConfig = {}) {
    return {
      beforeEach: () => { this.enterIsolation(config); },
      afterEach: async () => { await this.exitIsolation(); },
      beforeAll: () => { this.enterIsolation({ ...config, resetGlobalState: true }); },
      afterAll: async () => { await this.exitIsolation(); },
    };
  }

  /**
   * Register a mock for automatic cleanup
   */
  registerMock(mock: ReturnType<typeof vi.fn>): ReturnType<typeof vi.fn> {
    this.state.mockRegistry.add(mock);
    return mock;
  }

  /**
   * Register a timer for automatic cleanup
   */
  registerTimer(timerId: NodeJS.Timeout): NodeJS.Timeout {
    this.state.timerRegistry.add(timerId);
    return timerId;
  }

  /**
   * Register an event listener for automatic cleanup
   */
  registerEventListener(
    target: EventTarget | EventEmitter,
    event: string,
    listener: EventListenerOrEventListenerObject | ((...args: unknown[]) => void),
    options?: AddEventListenerOptions | boolean
  ): void {
    if (!this.state.listenerRegistry.has(target)) {
      this.state.listenerRegistry.set(target, []);
    }

    const listenerRegistry = this.state.listenerRegistry.get(target);
    if (listenerRegistry) {
      listenerRegistry.push({
        event,
        listener,
        options,
      });
    }

  /**
   * Set a global variable with automatic cleanup
   */
  setGlobalVariable(key: string, value: unknown): void {
    // Store original value if not already stored
    if (!this.state.globalVariables.has(key)) {
      this.state.globalVariables.set(key, (globalThis as Record<string, unknown>)[key]);
    }

    (globalThis as Record<string, unknown>)[key] = value;
  }

  /**
   * Mock console methods with custom implementations
   */
  mockConsole(overrides: Partial<{
    log: typeof console.log;
    warn: typeof console.warn;
    error: typeof console.error;
    debug: typeof console.debug;
  }>): void {
    if (overrides.log) console.log = overrides.log;
    if (overrides.warn) console.warn = overrides.warn;
    if (overrides.error) console.error = overrides.error;
    if (overrides.debug) console.debug = overrides.debug;
  }

  /**
   * Mock timers with Vitest fake timers
   */
  mockTimers(): void {
    vi.useFakeTimers();
  }

  /**
   * Mock fetch globally
   */
  mockFetch(implementation?: typeof fetch): void {
    const mockFetch = implementation || vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue({}),
      text: vi.fn().mockResolvedValue(''),
      blob: vi.fn().mockResolvedValue(new Blob()),
      arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(0)),
    } as ReturnType<typeof vi.fn>);

    globalThis.fetch = mockFetch;
  }

  /**
   * Mock Date for deterministic testing
   */
  mockDate(fixedDate: Date | number): void {
    const mockDate = new Date(fixedDate);
    vi.setSystemTime(mockDate);
  }

  /**
   * Create a scoped cleanup function
   */
  createCleanupScope(): {
    addCleanup: (fn: () => void | Promise<void>) => void;
    cleanup: () => Promise<void>;
  } {
    const cleanupFns: Array<() => void | Promise<void>> = [];

    return {
      addCleanup: (fn: () => void | Promise<void>) => {
        cleanupFns.push(fn);
      },
      cleanup: async () => {
        for (const fn of cleanupFns.reverse()) {
          try {
            await fn();
          } catch (error) {
            console.error('Error during scoped cleanup:', error);
          }
        }
        cleanupFns.length = 0;
      },
    };
  }

  /**
   * Full system cleanup (use sparingly)
   */
  async fullCleanup(): Promise<void> {
    // Exit all isolation levels
    while (this.isolationStack.length > 0) {
      await this.exitIsolation();
    }

    // Reset all helpers
    resetProviderHelper();
    resetEventHelper();
    resetPerformanceHelper();

    // Clear all registries
    this.clearMocks();
    this.clearTimers();
    this.clearEventListeners();
    this.clearGlobalVariables();
    this.clearProcessListeners();

    // Restore original state
    this.restoreConsole();
    this.restoreTimers();
    this.restoreFetch();

    // Reset Vitest state
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.restoreAllMocks();
  }

  // Private methods

  private captureInitialState(): GlobalTestState {
    return {
      originalConsole: {
        log: console.log,
        warn: console.warn,
        error: console.error,
        debug: console.debug,
      },
      originalTimers: {
        setTimeout,
        clearTimeout,
        setInterval,
        clearInterval,
        Date,
      },
      originalFetch: globalThis.fetch,
      mockRegistry: new Set(),
      timerRegistry: new Set(),
      listenerRegistry: new Map(),
      globalVariables: new Map(),
      processListeners: new Map(),
    };
  }

  private captureCurrentState(): Partial<GlobalTestState> {
    return {
      mockRegistry: new Set(this.state.mockRegistry),
      timerRegistry: new Set(this.state.timerRegistry),
      listenerRegistry: new Map(this.state.listenerRegistry),
      globalVariables: new Map(this.state.globalVariables),
    };
  }

  private applyIsolation(config: TestIsolationConfig): void {
    if (config.resetProviders !== false) {
      resetProviderHelper();
    }

    if (config.resetEvents !== false) {
      resetEventHelper();
    }

    if (config.resetPerformance !== false) {
      resetPerformanceHelper();
    }

    if (config.resetTimers) {
      this.mockTimers();
    }

    if (config.resetMocks) {
      vi.clearAllMocks();
    }

    if (config.resetGlobalState) {
      this.clearGlobalVariables();
    }
  }

  private async restoreState(
    config: TestIsolationConfig,
    snapshot: Partial<GlobalTestState>
  ): Promise<void> {
    // Run custom cleanup functions
    if (config.customCleanup) {
      for (const cleanup of config.customCleanup) {
        try {
          await cleanup();
        } catch (error) {
          console.error('Error during custom cleanup:', error);
        }
      }
    }

    // Clear current state
    this.clearMocks();
    this.clearTimers();
    this.clearEventListeners();

    // Restore snapshots
    if (snapshot.mockRegistry) {
      this.state.mockRegistry = snapshot.mockRegistry;
    }
    if (snapshot.timerRegistry) {
      this.state.timerRegistry = snapshot.timerRegistry;
    }
    if (snapshot.listenerRegistry) {
      this.state.listenerRegistry = snapshot.listenerRegistry;
    }
    if (snapshot.globalVariables) {
      this.state.globalVariables = snapshot.globalVariables;
    }

    // Restore system state
    if (config.resetTimers) {
      vi.useRealTimers();
    }

    if (config.resetMocks) {
      vi.restoreAllMocks();
    }
  }

  private clearMocks(): void {
    for (const mock of this.state.mockRegistry) {
      try {
        mock.mockRestore();
      } catch {
        // Ignore errors during mock restoration
      }
    }
    this.state.mockRegistry.clear();
  }

  private clearTimers(): void {
    for (const timerId of this.state.timerRegistry) {
      try {
        clearTimeout(timerId);
      } catch {
        // Ignore errors during timer cleanup
      }
    }
    this.state.timerRegistry.clear();
  }

  private clearEventListeners(): void {
    for (const [target, listeners] of this.state.listenerRegistry) {
      for (const { event, listener, options } of listeners) {
        try {
          if ('removeEventListener' in target) {
            (target).removeEventListener(event, listener as EventListener, options);
          } else if ('removeListener' in target || 'off' in target) {
            const emitter = target;
            if (emitter.removeListener) {
              emitter.removeListener(event, listener as (...args: unknown[]) => void);
            } else if ('off' in emitter) {
              (emitter as { off: (event: string, listener: unknown) => void }).off(event, listener);
            }
          }
        } catch {
          // Ignore errors during listener cleanup
        }
      }
    }
    this.state.listenerRegistry.clear();
  }

  private clearGlobalVariables(): void {
    for (const [key, originalValue] of this.state.globalVariables) {
      if (originalValue === undefined) {
        delete (globalThis as Record<string, unknown>)[key];
      } else {
        (globalThis as Record<string, unknown>)[key] = originalValue;
      }
    }
    this.state.globalVariables.clear();
  }

  private clearProcessListeners(): void {
    if (typeof process !== 'undefined') {
      for (const [event, listeners] of this.state.processListeners) {
        for (const listener of listeners) {
          try {
            (process.removeListener as (event: string, listener: (...args: unknown[]) => void) => void)(event, listener);
          } catch {
            // Ignore errors during process listener cleanup
          }
        }
      }
    }
    this.state.processListeners.clear();
  }

  private restoreConsole(): void {
    console.log = this.state.originalConsole.log;
    console.warn = this.state.originalConsole.warn;
    console.error = this.state.originalConsole.error;
    console.debug = this.state.originalConsole.debug;
  }

  private restoreTimers(): void {
    globalThis.setTimeout = this.state.originalTimers.setTimeout;
    globalThis.clearTimeout = this.state.originalTimers.clearTimeout;
    globalThis.setInterval = this.state.originalTimers.setInterval;
    globalThis.clearInterval = this.state.originalTimers.clearInterval;
  }

  private restoreFetch(): void {
    if (this.state.originalFetch) {
      globalThis.fetch = this.state.originalFetch;
    }
  }
}

/**
 * Convenience functions for common isolation patterns
 */
export const isolationPatterns = {
  /**
   * Standard test isolation (providers, events, performance)
   */
  standard: (): TestIsolationConfig => ({
    resetProviders: true,
    resetEvents: true,
    resetPerformance: true,
    resetMocks: true,
  }),

  /**
   * Full isolation (everything)
   */
  full: (): TestIsolationConfig => ({
    resetProviders: true,
    resetEvents: true,
    resetPerformance: true,
    resetTimers: true,
    resetMocks: true,
    resetGlobalState: true,
  }),

  /**
   * Minimal isolation (only mocks)
   */
  minimal: (): TestIsolationConfig => ({
    resetMocks: true,
  }),

  /**
   * Performance testing isolation
   */
  performance: (): TestIsolationConfig => ({
    resetProviders: true,
    resetPerformance: false, // Keep performance metrics
    resetMocks: true,
    resetGlobalState: true,
  }),

  /**
   * Integration test isolation (minimal interference)
   */
  integration: (): TestIsolationConfig => ({
    resetProviders: false,
    resetEvents: false,
    resetPerformance: false,
    resetMocks: false,
  }),
};

/**
 * Global isolation helper instance
 */
export const testIsolation = TestIsolationHelper.getInstance();

/**
 * Convenient isolation hooks for test suites
 */
export function useTestIsolation(config: TestIsolationConfig = isolationPatterns.standard()) {
  return testIsolation.createSuiteIsolation(config);
}

/**
 * Decorator for isolated test functions
 */
export function isolated(config: TestIsolationConfig = isolationPatterns.standard()) {
  return function<T extends (...args: unknown[]) => unknown>(
    target: T
  ): T {
    return (async (...args: Parameters<T>) => {
      return await testIsolation.withIsolation(() => target(...args), config);
    }) as T;
  };
}

/**
 * Create a cleanup scope for manual resource management
 */
export function createCleanupScope() {
  return testIsolation.createCleanupScope();
}

// Auto cleanup on process exit
if (typeof process !== 'undefined') {
  process.on('exit', () => {
    testIsolation.fullCleanup().catch(() => {
      // Ignore cleanup errors during exit
    });
  });
}