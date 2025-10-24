/**
 * Vitest configuration setup for graph package testing
 * Provides comprehensive test environment initialization and global utilities
 */

import { beforeAll, afterAll, beforeEach, afterEach, expect } from 'vitest';
import type { MockInstance } from 'vitest';

// Global test state
export interface TestGlobalState {
  mockInstances: Set<MockInstance>;
  eventListeners: Map<string, EventListenerOrEventListenerObject[]>;
  timers: Set<number>;
  providers: Set<string>;
  memorySnapshots: Array<{ name: string; usage: number; timestamp: number }>;
}

declare global {
  var __TEST_GLOBAL_STATE__: TestGlobalState;
}

/**
 * Initialize global test state
 */
export function initializeTestGlobals(): void {
  if (!globalThis.__TEST_GLOBAL_STATE__) {
    globalThis.__TEST_GLOBAL_STATE__ = {
      mockInstances: new Set(),
      eventListeners: new Map(),
      timers: new Set(),
      providers: new Set(),
      memorySnapshots: [],
    };
  }
}

/**
 * Clean up global test state
 */
export function cleanupTestGlobals(): void {
  const state = globalThis.__TEST_GLOBAL_STATE__;
  if (!state) return;

  // Clear all mocks
  state.mockInstances.forEach(mock => { mock.mockRestore(); });
  state.mockInstances.clear();

  // Remove event listeners
  state.eventListeners.forEach((listeners, event) => {
    listeners.forEach(listener => {
      if (typeof window !== 'undefined') {
        window.removeEventListener(event, listener);
      }
    });
  });
  state.eventListeners.clear();

  // Clear timers
  state.timers.forEach(id => { clearTimeout(id); });
  state.timers.clear();

  // Clear providers
  state.providers.clear();

  // Clear memory snapshots
  state.memorySnapshots.length = 0;
}

/**
 * Track a mock instance for cleanup
 */
export function trackMock(mock: MockInstance): MockInstance {
  initializeTestGlobals();
  globalThis.__TEST_GLOBAL_STATE__.mockInstances.add(mock);
  return mock;
}

/**
 * Track an event listener for cleanup
 */
export function trackEventListener(
  event: string,
  listener: EventListenerOrEventListenerObject
): void {
  initializeTestGlobals();
  const state = globalThis.__TEST_GLOBAL_STATE__;

  let eventListeners = state.eventListeners.get(event);
  if (!eventListeners) {
    eventListeners = [];
    state.eventListeners.set(event, eventListeners);
  }

  eventListeners.push(listener);
}

/**
 * Track a timer for cleanup
 */
export function trackTimer(id: number): number {
  initializeTestGlobals();
  globalThis.__TEST_GLOBAL_STATE__.timers.add(id);
  return id;
}

/**
 * Take a memory snapshot for performance testing
 */
export function takeMemorySnapshot(name: string): void {
  initializeTestGlobals();
  const state = globalThis.__TEST_GLOBAL_STATE__;

  // Basic memory usage estimation (in environments where available)
  let usage = 0;
  if (typeof performance !== 'undefined' && (performance as Record<string, unknown>).memory) {
    const memory = (performance as Record<string, unknown>).memory;
    usage = (memory as Record<string, unknown>).usedJSHeapSize as number;
  }

  state.memorySnapshots.push({
    name,
    usage,
    timestamp: Date.now(),
  });
}

/**
 * Get memory usage difference between snapshots
 */
export function getMemoryDiff(startSnapshot: string, endSnapshot: string): number {
  const state = globalThis.__TEST_GLOBAL_STATE__;
  if (!state) return 0;

  const start = state.memorySnapshots.find(s => s.name === startSnapshot);
  const end = state.memorySnapshots.find(s => s.name === endSnapshot);

  if (!start || !end) return 0;
  return end.usage - start.usage;
}

/**
 * Global test setup - run once before all tests
 */
beforeAll(() => {
  initializeTestGlobals();

  // Suppress console methods that create noise during testing
  const originalError = console.error;
  const originalWarn = console.warn;

  console.error = (...args: unknown[]) => {
    // Allow test-specific error logging but suppress known noise
    const message = args[0]?.toString() || '';
    if (message.includes('Warning:') || message.includes('React Warning')) {
      return;
    }
    originalError.apply(console, args);
  };

  console.warn = (...args: unknown[]) => {
    const message = args[0]?.toString() || '';
    if (message.includes('Warning:')) {
      return;
    }
    originalWarn.apply(console, args);
  };

  // Restore on cleanup
  trackMock({
    mockRestore: () => {
      console.error = originalError;
      console.warn = originalWarn;
    }
  } as MockInstance);
});

/**
 * Global test cleanup - run once after all tests
 */
afterAll(() => {
  cleanupTestGlobals();
});

/**
 * Test-level setup - run before each test
 */
beforeEach(() => {
  takeMemorySnapshot('test-start');
});

/**
 * Test-level cleanup - run after each test
 */
afterEach(() => {
  takeMemorySnapshot('test-end');

  // Clean up any test-specific state but keep global mocks
  const state = globalThis.__TEST_GLOBAL_STATE__;
  if (state) {
    // Clear test-specific timers
    state.timers.forEach(id => { clearTimeout(id); });
    state.timers.clear();
  }
});

/**
 * Custom matchers for graph testing
 */
declare module 'vitest' {
  interface Assertion<T = unknown> {
    toBeValidGraphNode(): T;
    toBeValidGraphEdge(): T;
    toHavePosition(): T;
    toBeWithinBounds(bounds: { minX: number; maxX: number; minY: number; maxY: number }): T;
  }
}

expect.extend({
  toBeValidGraphNode(received) {
    const { isNot } = this;

    const pass =
      received &&
      typeof received === 'object' &&
      typeof received.id === 'string' &&
      typeof received.entityType === 'string' &&
      typeof received.label === 'string' &&
      typeof received.entityId === 'string' &&
      typeof received.x === 'number' &&
      typeof received.y === 'number' &&
      Array.isArray(received.externalIds);

    return {
      pass,
      message: () =>
        `expected ${received} to ${isNot ? 'not ' : ''}be a valid GraphNode`
    };
  },

  toBeValidGraphEdge(received) {
    const { isNot } = this;

    const pass =
      received &&
      typeof received === 'object' &&
      typeof received.id === 'string' &&
      typeof received.source === 'string' &&
      typeof received.target === 'string' &&
      typeof received.type === 'string';

    return {
      pass,
      message: () =>
        `expected ${received} to ${isNot ? 'not ' : ''}be a valid GraphEdge`
    };
  },

  toHavePosition(received) {
    const { isNot } = this;

    const pass =
      received &&
      typeof received === 'object' &&
      typeof received.x === 'number' &&
      typeof received.y === 'number' &&
      !isNaN(received.x) &&
      !isNaN(received.y) &&
      isFinite(received.x) &&
      isFinite(received.y);

    return {
      pass,
      message: () =>
        `expected ${received} to ${isNot ? 'not ' : ''}have valid position coordinates`
    };
  },

  toBeWithinBounds(received, bounds) {
    const { isNot } = this;

    const pass =
      received &&
      typeof received === 'object' &&
      typeof received.x === 'number' &&
      typeof received.y === 'number' &&
      received.x >= bounds.minX &&
      received.x <= bounds.maxX &&
      received.y >= bounds.minY &&
      received.y <= bounds.maxY;

    return {
      pass,
      message: () =>
        `expected ${received} to ${isNot ? 'not ' : ''}be within bounds ${JSON.stringify(bounds)}`
    };
  },
});

/**
 * Export test utilities for external use
 */
export const testUtils = {
  initializeTestGlobals,
  cleanupTestGlobals,
  trackMock,
  trackEventListener,
  trackTimer,
  takeMemorySnapshot,
  getMemoryDiff,
};

/**
 * Test environment information
 */
export const testEnvironment = {
  isNode: typeof window === 'undefined',
  isBrowser: typeof window !== 'undefined',
  hasPerformanceAPI: typeof performance !== 'undefined',
  hasMemoryAPI: typeof performance !== 'undefined' && !!(performance as Record<string, unknown>).memory,
};