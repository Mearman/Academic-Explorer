/**
 * Async operation testing utilities
 * Provides utilities for testing async operations with timeouts, retries, and waiting
 */

import { vi } from 'vitest';

/**
 * Wait for a condition to be true with timeout and polling
 */
export async function waitFor<T>(
  condition: () => T | Promise<T>,
  options: {
    timeout?: number;
    interval?: number;
    message?: string;
    throwOnTimeout?: boolean;
  } = {}
): Promise<T> {
  const {
    timeout = 5000,
    interval = 50,
    message = 'Condition not met within timeout',
    throwOnTimeout = true,
  } = options;

  const startTime = Date.now();
  let lastResult: T | undefined;

  while (Date.now() - startTime < timeout) {
    try {
      const result = await condition();

      // For boolean conditions, wait for true
      if (typeof result === 'boolean' && !result) {
        lastResult = result;
        await sleep(interval);
        continue;
      }

      // For other types, wait for truthy value
      if (result) {
        return result;
      }

      lastResult = result;
    } catch (error) {
      lastResult = error as T;
    }

    await sleep(interval);
  }

  if (throwOnTimeout) {
    throw new Error(`${message}. Last result: ${JSON.stringify(lastResult)}`);
  }

  return lastResult as T;
}

/**
 * Wait for multiple conditions to be true
 */
export async function waitForAll<T extends Record<string, () => unknown | Promise<unknown>>>(
  conditions: T,
  options: {
    timeout?: number;
    interval?: number;
    throwOnTimeout?: boolean;
  } = {}
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const results: Partial<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> = {};
  const pending = new Set(Object.keys(conditions));

  const { timeout = 5000, interval = 50, throwOnTimeout = true } = options;
  const startTime = Date.now();

  while (pending.size > 0 && Date.now() - startTime < timeout) {
    for (const key of Array.from(pending)) {
      try {
        const result = await conditions[key as keyof T]();

        if (typeof result === 'boolean' ? result : !!result) {
          results[key as keyof T] = result as any;
          pending.delete(key);
        }
      } catch (error) {
        // Continue trying
      }
    }

    if (pending.size > 0) {
      await sleep(interval);
    }
  }

  if (pending.size > 0 && throwOnTimeout) {
    throw new Error(`Timeout waiting for conditions: ${Array.from(pending).join(', ')}`);
  }

  return results as { [K in keyof T]: Awaited<ReturnType<T[K]>> };
}

/**
 * Wait for an event to be emitted
 */
export function waitForEvent<T = unknown>(
  emitter: { on: (event: string, listener: (data: T) => void) => void; off?: (event: string, listener: (data: T) => void) => void },
  event: string,
  options: {
    timeout?: number;
    filter?: (data: T) => boolean;
    multiple?: boolean;
    count?: number;
  } = {}
): Promise<T> {
  const { timeout = 5000, filter, multiple = false, count = 1 } = options;

  return new Promise<T>((resolve, reject) => {
    const results: T[] = [];
    let timeoutHandle: NodeJS.Timeout;

    const listener = (data: T) => {
      if (filter && !filter(data)) {
        return;
      }

      if (multiple) {
        results.push(data);
        if (results.length >= count) {
          cleanup();
          resolve(results as any);
        }
      } else {
        cleanup();
        resolve(data);
      }
    };

    const cleanup = () => {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }
      if (emitter.off) {
        emitter.off(event, listener);
      }
    };

    emitter.on(event, listener);

    timeoutHandle = setTimeout(() => {
      cleanup();
      reject(new Error(`Timeout waiting for event "${event}"`));
    }, timeout);
  });
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retry<T>(
  operation: () => Promise<T>,
  options: {
    attempts?: number;
    baseDelay?: number;
    maxDelay?: number;
    backoffFactor?: number;
    shouldRetry?: (error: unknown, attempt: number) => boolean;
  } = {}
): Promise<T> {
  const {
    attempts = 3,
    baseDelay = 100,
    maxDelay = 5000,
    backoffFactor = 2,
    shouldRetry = () => true,
  } = options;

  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      if (attempt === attempts || !shouldRetry(error, attempt)) {
        throw error;
      }

      const delay = Math.min(maxDelay, baseDelay * Math.pow(backoffFactor, attempt - 1));
      await sleep(delay);
    }
  }

  throw lastError;
}

/**
 * Run multiple async operations concurrently with optional limiting
 */
export async function concurrent<T>(
  operations: Array<() => Promise<T>>,
  options: {
    concurrency?: number;
    failFast?: boolean;
  } = {}
): Promise<T[]> {
  const { concurrency = operations.length, failFast = true } = options;

  if (concurrency <= 0) {
    throw new Error('Concurrency must be greater than 0');
  }

  if (concurrency >= operations.length) {
    return failFast
      ? Promise.all(operations.map(op => op()))
      : Promise.allSettled(operations.map(op => op())).then(results =>
          results.map((result, i) => {
            if (result.status === 'rejected') {
              throw new Error(`Operation ${i} failed: ${result.reason}`);
            }
            return result.value;
          })
        );
  }

  const results: T[] = [];
  const executing: Promise<void>[] = [];
  let operationIndex = 0;

  const executeNext = async (): Promise<void> => {
    const currentIndex = operationIndex++;
    if (currentIndex >= operations.length) return;

    const operation = operations[currentIndex];

    try {
      const result = await operation();
      results[currentIndex] = result;
    } catch (error) {
      if (failFast) throw error;
      results[currentIndex] = error as T;
    }

    await executeNext();
  };

  // Start initial concurrent operations
  for (let i = 0; i < Math.min(concurrency, operations.length); i++) {
    executing.push(executeNext());
  }

  await Promise.all(executing);
  return results;
}

/**
 * Create a timeout wrapper for promises
 */
export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  message = 'Operation timed out'
): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => { reject(new Error(message)); }, timeoutMs)
    ),
  ]);
}

/**
 * Debounce an async function
 */
export function debounceAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number
): T {
  let timeoutHandle: NodeJS.Timeout;
  let pendingResolve: ((value: Awaited<ReturnType<T>>) => void) | null = null;
  let pendingReject: ((error: any) => void) | null = null;

  return ((...args: Parameters<T>) => {
    return new Promise<Awaited<ReturnType<T>>>((resolve, reject) => {
      // Cancel previous timeout
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      // Reject previous pending promise if exists
      if (pendingReject) {
        pendingReject(new Error('Debounced'));
      }

      pendingResolve = resolve;
      pendingReject = reject;

      timeoutHandle = setTimeout(async () => {
        try {
          const result = await fn(...args);
          if (pendingResolve === resolve) { // Ensure this is still the current promise
            resolve(result);
          }
        } catch (error) {
          if (pendingReject === reject) { // Ensure this is still the current promise
            reject(error);
          }
        } finally {
          pendingResolve = null;
          pendingReject = null;
        }
      }, delay);
    });
  }) as T;
}

/**
 * Throttle an async function
 */
export function throttleAsync<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  delay: number
): T {
  let isThrottled = false;
  let lastResult: Awaited<ReturnType<T>>;

  return (async (...args: Parameters<T>) => {
    if (isThrottled) {
      return lastResult;
    }

    isThrottled = true;

    try {
      lastResult = await fn(...args);
      return lastResult;
    } finally {
      setTimeout(() => {
        isThrottled = false;
      }, delay);
    }
  }) as T;
}

/**
 * Create a cancelable promise
 */
export interface CancelablePromise<T> extends Promise<T> {
  cancel: () => void;
  isCanceled: () => boolean;
}

export function makeCancelable<T>(promise: Promise<T>): CancelablePromise<T> {
  let isCanceled = false;

  const cancelablePromise = new Promise<T>((resolve, reject) => {
    promise
      .then(result => {
        if (!isCanceled) {
          resolve(result);
        }
      })
      .catch(error => {
        if (!isCanceled) {
          reject(error);
        }
      });
  }) as CancelablePromise<T>;

  cancelablePromise.cancel = () => {
    isCanceled = true;
  };

  cancelablePromise.isCanceled = () => isCanceled;

  return cancelablePromise;
}

/**
 * Wait for DOM or other changes to settle
 */
export async function waitForStable<T>(
  getValue: () => T,
  options: {
    timeout?: number;
    stableFor?: number;
    equality?: (a: T, b: T) => boolean;
  } = {}
): Promise<T> {
  const {
    timeout = 5000,
    stableFor = 100,
    equality = (a, b) => a === b,
  } = options;

  let lastValue: T = getValue();
  let stableStartTime = Date.now();
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    const currentValue = getValue();

    if (equality(currentValue, lastValue)) {
      // Value is stable, check if it's been stable long enough
      if (Date.now() - stableStartTime >= stableFor) {
        return currentValue;
      }
    } else {
      // Value changed, reset stability timer
      lastValue = currentValue;
      stableStartTime = Date.now();
    }

    await sleep(10); // Small delay between checks
  }

  throw new Error('Value did not stabilize within timeout');
}

/**
 * Mock async delays in tests
 */
export class AsyncTestHelper {
  private realSetTimeout = globalThis.setTimeout;
  private realClearTimeout = globalThis.clearTimeout;

  useFakeTimers(): void {
    vi.useFakeTimers();
  }

  useRealTimers(): void {
    vi.useRealTimers();
  }

  async advanceTimersByTime(ms: number): Promise<void> {
    vi.advanceTimersByTime(ms);
    await vi.runAllTimersAsync();
  }

  async runAllTimers(): Promise<void> {
    await vi.runAllTimersAsync();
  }

  async runOnlyPendingTimers(): Promise<void> {
    await vi.runOnlyPendingTimersAsync();
  }

  // Create real delays even when using fake timers
  realSleep(ms: number): Promise<void> {
    return new Promise(resolve => this.realSetTimeout(resolve, ms));
  }

  cleanup(): void {
    this.useRealTimers();
  }
}

/**
 * Common async patterns for testing
 */
export const asyncPatterns = {
  /**
   * Wait for a provider to become healthy
   */
  waitForProviderHealth: (provider: { isHealthy: () => Promise<boolean> }, timeout = 5000) =>
    waitFor(() => provider.isHealthy(), { timeout, message: 'Provider did not become healthy' }),

  /**
   * Wait for graph data to load
   */
  waitForGraphData: (getData: () => { nodes: unknown[]; edges: unknown[] }, minNodes = 1, timeout = 5000) =>
    waitFor(
      () => {
        const data = getData();
        return data.nodes.length >= minNodes ? data : false;
      },
      { timeout, message: `Graph did not load ${minNodes} nodes` }
    ),

  /**
   * Wait for async operations to complete
   */
  waitForQuiescence: (checkFn: () => boolean, timeout = 2000) =>
    waitForStable(checkFn, { timeout, stableFor: 100 }),

  /**
   * Wait for event sequence
   */
  waitForEventSequence: <T>(
    emitter: { on: (event: string, listener: (data: T) => void) => void },
    events: string[],
    timeout = 5000
  ) => {
    let currentIndex = 0;
    return waitFor(
      () =>
        new Promise<boolean>(resolve => {
          if (currentIndex >= events.length) {
            resolve(true);
            return;
          }

          const listener = () => {
            currentIndex++;
            resolve(currentIndex >= events.length);
          };

          emitter.on(events[currentIndex], listener);
        }),
      { timeout, message: `Event sequence did not complete: ${events.join(' → ')}` }
    );
  },
};

export const asyncUtils = {
  waitFor,
  waitForAll,
  waitForEvent,
  sleep,
  retry,
  concurrent,
  withTimeout,
  debounceAsync,
  throttleAsync,
  makeCancelable,
  waitForStable,
  AsyncTestHelper,
  patterns: asyncPatterns,
};